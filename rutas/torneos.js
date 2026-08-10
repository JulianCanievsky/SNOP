/**
 * rutas/torneos.js — endpoints de torneos para socios
 *
 * GET  /api/torneos            — lista torneos activos con inscripción del socio
 * POST /api/torneos/:id/inscribir
 * DELETE /api/torneos/:id/cancelar
 */
import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'

const router = express.Router()
router.use(autenticar)

// ── GET /api/torneos ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const socioId = req.userId
  try {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

    const { data: torneos, error } = await supabase
      .from('torneos')
      .select(`
        id, nombre, fecha_inicio, fecha_fin, modalidad,
        capacidad_maxima, niveles_habilitados,
        sedes(nombre),
        inscripciones_torneo(id, socio_id, estado)
      `)
      .eq('activo', true)
      .gte('fecha_inicio', hoy.toISOString())
      .order('fecha_inicio', { ascending: true })

    if (error) {
      if (error.code === '42P01') return res.json([])
      throw error
    }

    // Traer usuarios inscriptos para mostrar participantes
    const allInscIds = (torneos ?? []).flatMap(t =>
      (t.inscripciones_torneo ?? [])
        .filter(i => i.estado === 'activo')
        .map(i => i.socio_id)
    )
    const uniqueIds = [...new Set(allInscIds)]
    let usuarios = []
    if (uniqueIds.length > 0) {
      const { data: u } = await supabase
        .from('users')
        .select('id, nombre, foto_url')
        .in('id', uniqueIds)
      usuarios = u ?? []
    }

    const resultado = (torneos ?? []).map(t => {
      const activos     = (t.inscripciones_torneo ?? []).filter(i => i.estado === 'activo')
      const yaInscripto = activos.some(i => i.socio_id === socioId)
      return {
        id:                  t.id,
        nombre:              t.nombre,
        fecha_inicio:        t.fecha_inicio,
        fecha_fin:           t.fecha_fin,
        modalidad:           t.modalidad,
        capacidad_maxima:    t.capacidad_maxima,
        niveles_habilitados: t.niveles_habilitados ?? [],
        nombre_sede:         t.sedes?.nombre ?? '—',
        inscriptos:          activos.length,
        ya_inscripto:        yaInscripto,
        estado:              activos.length >= t.capacidad_maxima ? 'completo' : 'abierto',
        participantes:       activos.map(i => {
          const u = usuarios.find(u => u.id === i.socio_id)
          return { nombre: u?.nombre || '?', foto_url: u?.foto_url || null }
        }),
      }
    })

    res.json(resultado)
  } catch (err) {
    console.error('GET /api/torneos', err)
    res.status(500).json({ error: 'Error al obtener torneos' })
  }
})

// ── POST /api/torneos/:id/inscribir ───────────────────────────────────────────
router.post('/:id/inscribir', async (req, res) => {
  const socioId  = req.userId
  const torneoId = parseInt(req.params.id)

  try {
    const { data: torneo, error: errT } = await supabase
      .from('torneos')
      .select('id, capacidad_maxima, activo, inscripciones_torneo(id, estado)')
      .eq('id', torneoId)
      .single()

    if (errT || !torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!torneo.activo)  return res.status(400).json({ error: 'El torneo no está disponible' })

    const activos = (torneo.inscripciones_torneo ?? []).filter(i => i.estado === 'activo')
    if (activos.length >= torneo.capacidad_maxima) {
      return res.status(400).json({ error: 'El torneo está completo' })
    }

    // Verificar no inscripto
    const { data: existe } = await supabase
      .from('inscripciones_torneo')
      .select('id')
      .eq('torneo_id', torneoId)
      .eq('socio_id', socioId)
      .maybeSingle()

    if (existe) return res.status(409).json({ error: 'Ya estás inscripto en este torneo' })

    const { error: errI } = await supabase
      .from('inscripciones_torneo')
      .insert({ torneo_id: torneoId, socio_id: socioId, estado: 'activo' })

    if (errI) {
      if (errI.code === '23505') return res.status(409).json({ error: 'Ya estás inscripto en este torneo' })
      throw errI
    }

    res.json({ mensaje: 'Inscripción confirmada' })
  } catch (err) {
    console.error('POST /api/torneos/:id/inscribir', err)
    res.status(500).json({ error: 'Error al inscribirse' })
  }
})

// ── DELETE /api/torneos/:id/cancelar ─────────────────────────────────────────
router.delete('/:id/cancelar', async (req, res) => {
  const socioId  = req.userId
  const torneoId = parseInt(req.params.id)

  try {
    const { error } = await supabase
      .from('inscripciones_torneo')
      .update({ estado: 'cancelado' })
      .eq('torneo_id', torneoId)
      .eq('socio_id', socioId)
      .eq('estado', 'activo')

    if (error) throw error
    res.json({ mensaje: 'Inscripción cancelada' })
  } catch (err) {
    console.error('DELETE /api/torneos/:id/cancelar', err)
    res.status(500).json({ error: 'Error al cancelar inscripción' })
  }
})

export default router
