import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'

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
      return res.status(400).json({ error: 'entrenador_id, turno_id y estrellas son requeridos' })
    }

    if (estrellas < 1 || estrellas > 5 || !Number.isInteger(Number(estrellas))) {
      return res.status(400).json({ error: 'Las estrellas deben ser un número entero entre 1 y 5' })
    }

    // Verificar que el turno pertenece al socio y ya terminó
    const { data: inscripcion, error: errInsc } = await supabase
      .from('socio_turno')
      .select('id, turnos(id, fecha_fin, users(id, nombre))')
      .eq('turno_id', turno_id)
      .eq('user_id', socioId)
      .eq('estado', true)
      .single()

    if (errInsc || !inscripcion) {
      return res.status(404).json({ error: 'Turno no encontrado para este socio' })
    }

    const fechaFin = inscripcion.turnos?.fecha_fin
    if (fechaFin && new Date(fechaFin) > new Date()) {
      return res.status(400).json({ error: 'El turno todavía no terminó' })
    }

    // Verificar que el entrenador del turno coincide
    const entrenadorDelTurno = inscripcion.turnos?.users?.id
    if (entrenadorDelTurno && String(entrenadorDelTurno) !== String(entrenador_id)) {
      return res.status(400).json({ error: 'El entrenador no corresponde a este turno' })
    }

    // Verificar que no calificó este turno antes (unique constraint: socio + turno)
    const { data: yaCalificado } = await supabase
      .from('ratings_entrenador')
      .select('id')
      .eq('socio_id', socioId)
      .eq('turno_id', turno_id)
      .maybeSingle()

    if (yaCalificado) {
      return res.status(409).json({ error: 'Ya calificaste este turno' })
    }

    // Insertar calificación
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
      // unique_violation — doble submit simultáneo
      if (errInsert.code === '23505') {
        return res.status(409).json({ error: 'Ya calificaste este turno' })
      }
      throw errInsert
    }

    // Recalcular y actualizar el rating promedio en users
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

    res.status(201).json({ data, mensaje: 'Calificación enviada' })
  } catch (err) {
    console.error('POST /api/ratings:', err)
    res.status(500).json({ error: 'Error al guardar la calificación' })
  }
})

// ─────────────────────────────────────────────────────────────
// GET /api/ratings/entrenador/:id
// Rating promedio + historial de un entrenador
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

    // Distribución por estrella
    const distribucion = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of ratings ?? []) {
      distribucion[r.estrellas] = (distribucion[r.estrellas] || 0) + 1
    }

    res.json({
      data: {
        promedio,
        total,
        distribucion,
        recientes: (ratings ?? []).slice(0, 5).map(r => ({
          estrellas:  r.estrellas,
          comentario: r.comentario,
          fecha:      r.created_at,
          socio:      r.users?.nombre ?? 'Socio',
        })),
      }
    })
  } catch (err) {
    console.error('GET /api/ratings/entrenador:', err)
    res.status(500).json({ error: 'Error al obtener ratings' })
  }
})

// ─────────────────────────────────────────────────────────────
// GET /api/ratings/pendientes
// Turnos terminados en las últimas 48hs que el socio no calificó aún
// ─────────────────────────────────────────────────────────────
router.get('/pendientes', autenticar, async (req, res) => {
  try {
    const socioId = req.userId
    const ahora   = new Date()
    const hace48h = new Date(ahora.getTime() - 48 * 60 * 60 * 1000)

    // Turnos que terminaron en las últimas 48hs
    const { data: inscripciones, error: errInsc } = await supabase
      .from('socio_turno')
      .select(`
        id,
        turno_id,
        turnos!inner (
          id,
          fecha_inicio,
          fecha_fin,
          duracion_min,
          sedes ( nombre ),
          users ( id, nombre, foto_url )
        )
      `)
      .eq('user_id', socioId)
      .eq('estado', true)
      .gte('turnos.fecha_fin', hace48h.toISOString())
      .lt('turnos.fecha_fin', ahora.toISOString())

    if (errInsc) throw errInsc

    if (!inscripciones?.length) return res.json({ data: [] })

    // IDs de turnos ya calificados por este socio
    const turnoIds = inscripciones.map(i => i.turno_id)
    const { data: yaCalificados } = await supabase
      .from('ratings_entrenador')
      .select('turno_id')
      .eq('socio_id', socioId)
      .in('turno_id', turnoIds)

    const calificadosSet = new Set((yaCalificados ?? []).map(r => String(r.turno_id)))

    // Filtrar solo los no calificados que tienen entrenador asignado
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

    res.json({ data: pendientes })
  } catch (err) {
    console.error('GET /api/ratings/pendientes:', err)
    res.status(500).json({ error: 'Error al obtener pendientes' })
  }
})

export default router
