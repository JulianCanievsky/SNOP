import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import { parseFechaAR } from '../src/lib/fecha.js'

const router = express.Router()

// GET /api/perfil  — devuelve el perfil del usuario logueado
router.get('/', autenticar, async (req, res) => {
  try {
    const usuario_id = req.userId

    const { data: usuario, error: errorUsuario } = await supabase
      .from('users')
      .select('id, nombre, email, foto_url, cuota_al_dia, tipo_usuario_id, nivel_id, niveles(id, nombre)')
      .eq('id', usuario_id)
      .single()

    if (errorUsuario || !usuario) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' })
    }

    const { data: inscripciones, error: errorTurnos } = await supabase
      .from('socio_turno')
      .select(`
        turno_id,
        estado,
        estado_texto,
        turnos (
          id,
          fecha_inicio,
          fecha_fin,
          duracion_min,
          mesa_id,
          sede_id,
          sedes ( nombre ),
          mesas ( numero ),
          users ( nombre )
        )
      `)
      .eq('user_id', usuario_id)
      .eq('estado', true)   // solo confirmados

    if (errorTurnos) throw errorTurnos

    // Separar próximos e historial en zona horaria Argentina
    const ahora = new Date()
    const proximos  = []
    const historial = []

    for (const insc of inscripciones ?? []) {
      const fechaFin = insc.turnos?.fecha_fin
        ? parseFechaAR(insc.turnos.fecha_fin)
        : insc.turnos?.fecha_inicio
          ? parseFechaAR(insc.turnos.fecha_inicio)
          : null

      if (!fechaFin || fechaFin >= ahora) {
        proximos.push(insc)
      } else {
        historial.push(insc)
      }
    }

    proximos.sort((a, b) =>
      new Date(a.turnos?.fecha_inicio ?? 0) - new Date(b.turnos?.fecha_inicio ?? 0)
    )
    historial.sort((a, b) =>
      new Date(b.turnos?.fecha_inicio ?? 0) - new Date(a.turnos?.fecha_inicio ?? 0)
    )

    res.json({
      ok: true,
      data: {
        usuario: {
          ...usuario,
          nivel_nombre: usuario.niveles?.nombre ?? null,
        },
        turnos:   proximos,   // compatibilidad: campo "turnos" = próximos
        historial,
      }
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener perfil' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/perfil/historial?page=1&limit=20&mes=2026-10&tipo=turno&estado=activo
// Historial paginado de actividades del socio (inscripciones pasadas)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/historial', autenticar, async (req, res) => {
  try {
    const userId  = req.userId
    const page    = Math.max(1, parseInt(req.query.page ?? '1', 10))
    const limit   = Math.min(50, Math.max(1, parseInt(req.query.limit ?? '20', 10)))
    const offset  = (page - 1) * limit
    const mes     = req.query.mes   // 'YYYY-MM' o vacío
    const tipo    = req.query.tipo  // 'turno'|'juego_libre'|'torneo'|'particular' o vacío

    const ahora = new Date().toISOString()

    // ── 1. Turnos pasados ────────────────────────────────────────────────────
    const items = []

    if (!tipo || tipo === 'turno' || tipo === 'particular') {
      let q = supabase
        .from('socio_turno')
        .select(`
          id, estado, estado_texto, fecha_inscripcion,
          turnos!inner (
            id, fecha_inicio, fecha_fin, tipo_turno_id,
            tipo_turno(nombre),
            sedes(nombre),
            users(nombre)
          )
        `)
        .eq('user_id', userId)
        .lt('turnos.fecha_fin', ahora)
        .order('turnos.fecha_inicio', { ascending: false })

      if (mes) {
        const desde = new Date(`${mes}-01T00:00:00-03:00`).toISOString()
        const hasta = new Date(`${mes}-01T00:00:00-03:00`)
        hasta.setMonth(hasta.getMonth() + 1)
        q = q.gte('turnos.fecha_inicio', desde).lt('turnos.fecha_inicio', hasta.toISOString())
      }

      if (tipo === 'particular') {
        q = q.eq('turnos.tipo_turno_id', 2)
      } else if (tipo === 'turno') {
        q = q.eq('turnos.tipo_turno_id', 1)
      }

      const { data: turnos } = await q
      for (const t of turnos ?? []) {
        items.push({
          id:           `st-${t.id}`,
          tipo:         t.turnos.tipo_turno_id === 2 ? 'particular' : 'turno',
          fecha:        t.turnos.fecha_inicio,
          sede:         t.turnos.sedes?.nombre ?? null,
          contraparte:  t.turnos.users?.nombre ?? null,
          estado_texto: t.estado_texto ?? (t.estado ? 'activo' : 'cancelado_tarde'),
        })
      }
    }

    if (!tipo || tipo === 'juego_libre') {
      let q = supabase
        .from('inscripciones_juego_libre')
        .select(`
          id, estado, fecha_inscripcion,
          juego_libre!inner(id, fecha_inicio, fecha_fin, sedes(nombre))
        `)
        .eq('socio_id', userId)
        .lt('juego_libre.fecha_fin', ahora)
        .order('juego_libre.fecha_inicio', { ascending: false })

      if (mes) {
        const desde = new Date(`${mes}-01T00:00:00-03:00`).toISOString()
        const hasta = new Date(`${mes}-01T00:00:00-03:00`)
        hasta.setMonth(hasta.getMonth() + 1)
        q = q.gte('juego_libre.fecha_inicio', desde).lt('juego_libre.fecha_inicio', hasta.toISOString())
      }

      const { data: jl } = await q
      for (const i of jl ?? []) {
        items.push({
          id:           `jl-${i.id}`,
          tipo:         'juego_libre',
          fecha:        i.juego_libre.fecha_inicio,
          sede:         i.juego_libre.sedes?.nombre ?? null,
          contraparte:  null,
          estado_texto: i.estado ?? 'activo',
        })
      }
    }

    if (!tipo || tipo === 'torneo') {
      try {
        let q = supabase
          .from('inscripciones_torneo')
          .select(`
            id, estado,
            torneos!inner(id, nombre, fecha_inicio, fecha_fin, sedes(nombre))
          `)
          .eq('socio_id', userId)
          .lt('torneos.fecha_fin', ahora)
          .order('torneos.fecha_inicio', { ascending: false })

        if (mes) {
          const desde = new Date(`${mes}-01T00:00:00-03:00`).toISOString()
          const hasta = new Date(`${mes}-01T00:00:00-03:00`)
          hasta.setMonth(hasta.getMonth() + 1)
          q = q.gte('torneos.fecha_inicio', desde).lt('torneos.fecha_inicio', hasta.toISOString())
        }

        const { data: torn } = await q
        for (const i of torn ?? []) {
          items.push({
            id:          `tr-${i.id}`,
            tipo:        'torneo',
            fecha:       i.torneos.fecha_inicio,
            nombre:      i.torneos.nombre,
            sede:        i.torneos.sedes?.nombre ?? null,
            contraparte: null,
            estado_texto: i.estado ?? 'activo',
          })
        }
      } catch { /* tabla puede no existir */ }
    }

    // Ordenar todo por fecha desc, luego paginar en memoria
    items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    const total   = items.length
    const paginado = items.slice(offset, offset + limit)

    res.json({
      ok: true,
      data: paginado,
      meta: { page, limit, total, paginas: Math.ceil(total / limit) },
    })

  } catch (err) {
    console.error('GET /api/perfil/historial', err)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener historial' })
  }
})

export default router
