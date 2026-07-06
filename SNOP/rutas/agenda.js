import express from 'express'
import { createClient } from '@supabase/supabase-js'
import autenticar from '../src/middlewares/autenticar.js'

const router = express.Router()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * GET /api/agenda
 * Devuelve todos los eventos futuros del socio en un array normalizado:
 *   { id, tipo, fecha_inicio, fecha_fin, duracion_min, sede, entrenador, mesa, estado, source_id }
 *
 * tipo puede ser:
 *   'turno_fijo'        — inscripción en socio_turno con tipo_turno_id = 1, estado = true
 *   'clase_particular'  — inscripción en socio_turno con tipo_turno_id = 2, estado = true
 *   'juego_libre'       — inscripción en inscripciones_juego_libre con estado = 'activo'
 */
router.get('/', autenticar, async (req, res) => {
  const socioId = req.userId
  const ahora = new Date().toISOString()

  try {
    // ── 1. Turnos fijos + clases particulares confirmadas ─────────────────
    // NOTA: los filtros .gte() sobre columnas de tablas relacionadas no son
    // soportados por Supabase PostgREST — filtramos por fecha en código.
    const { data: inscripciones, error: errInsc } = await supabase
      .from('socio_turno')
      .select(`
        id,
        estado,
        turno_id,
        turnos!inner (
          id,
          fecha_inicio,
          fecha_fin,
          duracion_min,
          tipo_turno_id,
          tipo_turno ( nombre ),
          sedes ( nombre ),
          mesas ( numero ),
          users ( nombre )
        )
      `)
      .eq('user_id', socioId)
      .eq('estado', true)   // solo confirmados por el entrenador

    if (errInsc) {
      console.error('agenda — socio_turno:', errInsc)
      throw errInsc
    }

    // ── 2. Juegos libres activos ──────────────────────────────────────────
    const { data: juegosInsc, error: errJuegos } = await supabase
      .from('inscripciones_juego_libre')
      .select(`
        id,
        juego_libre!inner (
          id,
          fecha_inicio,
          fecha_fin,
          capacidad_maxima,
          sedes ( nombre )
        )
      `)
      .eq('socio_id', socioId)
      .eq('estado', 'activo')

    if (errJuegos) {
      console.error('agenda — inscripciones_juego_libre:', errJuegos)
      throw errJuegos
    }

    // ── 3. Normalizar y filtrar fechas futuras en código ──────────────────
    const eventos = []

    for (const insc of inscripciones ?? []) {
      const t = insc.turnos
      if (!t?.fecha_inicio) continue
      // filtrar eventos pasados en código (Supabase no soporta .gte en relaciones)
      if (t.fecha_inicio < ahora) continue

      const tipo = t.tipo_turno_id === 2 ? 'clase_particular' : 'turno_fijo'

      eventos.push({
        id:           `st-${insc.id}`,
        source_id:    insc.id,
        turno_id:     t.id,
        tipo,
        fecha_inicio: t.fecha_inicio,
        fecha_fin:    t.fecha_fin,
        duracion_min: t.duracion_min,
        sede:         t.sedes?.nombre ?? null,
        entrenador:   t.users?.nombre ?? null,
        mesa:         t.mesas?.numero ?? null,
        estado:       'confirmado',
      })
    }

    for (const insc of juegosInsc ?? []) {
      const jl = insc.juego_libre
      if (!jl?.fecha_inicio) continue
      if (jl.fecha_inicio < ahora) continue

      eventos.push({
        id:             `jl-${insc.id}`,
        source_id:      insc.id,
        juego_libre_id: jl.id,
        tipo:           'juego_libre',
        fecha_inicio:   jl.fecha_inicio,
        fecha_fin:      jl.fecha_fin,
        duracion_min:   null,
        sede:           jl.sedes?.nombre ?? null,
        entrenador:     null,
        mesa:           null,
        estado:         'inscripto',
      })
    }

    // Ordenar por fecha_inicio ascendente
    eventos.sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))

    res.json({ ok: true, data: eventos })

  } catch (err) {
    console.error('GET /api/agenda:', err)
    res.status(500).json({ ok: false, error: 'Error al obtener la agenda' })
  }
})

export default router
