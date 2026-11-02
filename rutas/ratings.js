import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import responder from '../src/lib/responder.js'

const router = express.Router()

// ─────────────────────────────────────────────────────────────
// POST /api/ratings
// Socio califica a un entrenador después de un turno
// Body: { entrenador_id, turno_id, estrellas (1-5), comentario? }
// ─────────────────────────────────────────────────────────────
router.post('/', autenticar, async (req, res) => {
  try {
    const socioId = req.userId
    const { entrenador_id, turno_id, estrellas, comentario } = req.body

    if (!entrenador_id || !turno_id || !estrellas) {
      return responder.error(res, 'entrenador_id, turno_id y estrellas son requeridos')
    }
    if (estrellas < 1 || estrellas > 5 || !Number.isInteger(Number(estrellas))) {
      return responder.error(res, 'Las estrellas deben ser un número entero entre 1 y 5')
    }

    const { data: inscripcion, error: errInsc } = await supabase
      .from('socio_turno')
      .select('id, turnos(id, fecha_fin, users(id, nombre))')
      .eq('turno_id', turno_id)
      .eq('user_id', socioId)
      .eq('estado', true)
      .single()

    if (errInsc || !inscripcion) {
      return responder.noEncontrado(res, 'Turno no encontrado para este socio')
    }

    const fechaFin = inscripcion.turnos?.fecha_fin
    if (fechaFin && new Date(fechaFin) > new Date()) {
      return responder.error(res, 'El turno todavía no terminó')
    }

    const entrenadorDelTurno = inscripcion.turnos?.users?.id
    if (entrenadorDelTurno && String(entrenadorDelTurno) !== String(entrenador_id)) {
      return responder.error(res, 'El entrenador no corresponde a este turno')
    }

    const { data: yaCalificado } = await supabase
      .from('ratings_entrenador')
      .select('id')
      .eq('socio_id', socioId)
      .eq('turno_id', turno_id)
      .maybeSingle()

    if (yaCalificado) {
      return responder.conflicto(res, 'Ya calificaste este turno')
    }

    const { data, error: errInsert } = await supabase
      .from('ratings_entrenador')
      .insert({
        socio_id:      socioId,
        entrenador_id: entrenador_id,
        turno_id:      turno_id,
        estrellas:     Number(estrellas),
        comentario:    comentario?.trim() || null,
      })
      .select()
      .single()

    if (errInsert) {
      if (errInsert.code === '23505') return responder.conflicto(res, 'Ya calificaste este turno')
      throw errInsert
    }

    // Recalcular promedio en users
    const { data: ratings } = await supabase
      .from('ratings_entrenador')
      .select('estrellas')
      .eq('entrenador_id', entrenador_id)

    if (ratings?.length) {
      const promedio = ratings.reduce((acc, r) => acc + r.estrellas, 0) / ratings.length
      await supabase
        .from('users')
        .update({ rating: Math.round(promedio * 10) / 10 })
        .eq('id', entrenador_id)
    }

    responder.creado(res, data)
  } catch (err) {
    console.error('POST /api/ratings:', err)
    responder.interno(res, 'Error al guardar la calificación')
  }
})

// ─────────────────────────────────────────────────────────────
// GET /api/ratings/entrenador/:id
// ─────────────────────────────────────────────────────────────
router.get('/entrenador/:id', autenticar, async (req, res) => {
  try {
    const entrenadorId = req.params.id

    const { data: ratings, error } = await supabase
      .from('ratings_entrenador')
      .select('estrellas, comentario, created_at, users!ratings_entrenador_socio_id_fkey(nombre)')
      .eq('entrenador_id', entrenadorId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const total    = ratings?.length ?? 0
    const promedio = total > 0
      ? Math.round((ratings.reduce((acc, r) => acc + r.estrellas, 0) / total) * 10) / 10
      : 0

    const distribucion = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of ratings ?? []) {
      distribucion[r.estrellas] = (distribucion[r.estrellas] || 0) + 1
    }

    responder.ok(res, {
      promedio,
      total,
      distribucion,
      recientes: (ratings ?? []).slice(0, 5).map(r => ({
        estrellas:  r.estrellas,
        comentario: r.comentario,
        fecha:      r.created_at,
        socio:      r.users?.nombre ?? 'Socio',
      })),
    })
  } catch (err) {
    console.error('GET /api/ratings/entrenador:', err)
    responder.interno(res, 'Error al obtener ratings')
  }
})

// ─────────────────────────────────────────────────────────────
// GET /api/ratings/pendientes
// ─────────────────────────────────────────────────────────────
router.get('/pendientes', autenticar, async (req, res) => {
  try {
    const socioId = req.userId
    const ahora   = new Date()
    const hace48h = new Date(ahora.getTime() - 48 * 60 * 60 * 1000)

    const { data: inscripciones, error: errInsc } = await supabase
      .from('socio_turno')
      .select(`
        id, turno_id,
        turnos!inner (
          id, fecha_inicio, fecha_fin, duracion_min,
          sedes ( nombre ),
          users ( id, nombre, foto_url )
        )
      `)
      .eq('user_id', socioId)
      .eq('estado', true)
      .gte('turnos.fecha_fin', hace48h.toISOString())
      .lt('turnos.fecha_fin', ahora.toISOString())

    if (errInsc) throw errInsc
    if (!inscripciones?.length) return responder.ok(res, [])

    const turnoIds = inscripciones.map(i => i.turno_id)
    const { data: yaCalificados } = await supabase
      .from('ratings_entrenador')
      .select('turno_id')
      .eq('socio_id', socioId)
      .in('turno_id', turnoIds)

    const calificadosSet = new Set((yaCalificados ?? []).map(r => String(r.turno_id)))

    const pendientes = inscripciones
      .filter(i => !calificadosSet.has(String(i.turno_id)) && i.turnos?.users?.id)
      .map(i => ({
        turno_id:      i.turnos.id,
        fecha_inicio:  i.turnos.fecha_inicio,
        fecha_fin:     i.turnos.fecha_fin,
        duracion_min:  i.turnos.duracion_min,
        sede:          i.turnos.sedes?.nombre ?? null,
        entrenador_id: i.turnos.users.id,
        entrenador:    i.turnos.users.nombre,
        foto_url:      i.turnos.users.foto_url ?? null,
      }))

    responder.ok(res, pendientes)
  } catch (err) {
    console.error('GET /api/ratings/pendientes:', err)
    responder.interno(res, 'Error al obtener pendientes')
  }
})

export default router
