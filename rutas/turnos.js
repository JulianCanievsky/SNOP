import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import {
  obtenerTurnos,
  cancelarTurnoController,
  reconfirmarTurnoController,
} from '../src/controllers/turnosController.js'

const router = express.Router()

router.use(autenticar)

// ── Turnos del socio ──────────────────────────────────────────────────────────
router.get('/',                       obtenerTurnos)
router.delete('/:turnoId',            cancelarTurnoController)
router.patch('/:turnoId/reconfirmar', reconfirmarTurnoController)

// ─────────────────────────────────────────────────────────────────────────────
// LISTA DE ESPERA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/turnos/:turnoId/lista-espera
 * El socio se anota en la lista de espera de un turno lleno.
 * Si el turno tiene cupo, se lo inscribe directamente en socio_turno.
 */
router.post('/:turnoId/lista-espera', async (req, res) => {
  const socioId = req.userId
  const { turnoId } = req.params

  try {
    // Verificar que el turno existe y está activo
    const { data: turno, error: errT } = await supabase
      .from('turnos')
      .select('id, capacidad_maxima, activo, socio_turno(id, estado)')
      .eq('id', turnoId)
      .single()

    if (errT || !turno) return res.status(404).json({ error: 'Turno no encontrado' })
    if (!turno.activo)  return res.status(400).json({ error: 'El turno no está activo' })

    const inscriptos = (turno.socio_turno ?? []).filter(s => s.estado === true).length

    // Si hay cupo, inscribir directamente
    if (inscriptos < turno.capacidad_maxima) {
      const { data: dup } = await supabase
        .from('socio_turno').select('id').eq('user_id', socioId).eq('turno_id', turnoId).maybeSingle()
      if (dup) return res.status(409).json({ error: 'Ya estás inscripto en este turno' })

      const { error: errInsc } = await supabase
        .from('socio_turno')
        .insert({ user_id: socioId, turno_id: turnoId, estado: true, fecha_inscripcion: new Date().toISOString() })

      if (errInsc) {
        if (errInsc.code === '23505') return res.status(409).json({ error: 'Ya estás inscripto en este turno' })
        throw errInsc
      }
      return res.status(201).json({ ok: true, inscripto: true, mensaje: 'Te inscribiste correctamente al turno.' })
    }

    // Turno lleno → lista de espera
    const { data: yaEnEspera } = await supabase
      .from('lista_espera_turno')
      .select('id, posicion, estado')
      .eq('turno_id', turnoId)
      .eq('user_id', socioId)
      .maybeSingle()

    if (yaEnEspera?.estado === 'esperando') {
      return res.status(409).json({ error: `Ya estás en la lista de espera (posición ${yaEnEspera.posicion})` })
    }

    // Calcular siguiente posición
    const { count } = await supabase
      .from('lista_espera_turno')
      .select('id', { count: 'exact', head: true })
      .eq('turno_id', turnoId)
      .eq('estado', 'esperando')

    const posicion = (count ?? 0) + 1

    const { error: errEsp } = await supabase
      .from('lista_espera_turno')
      .upsert(
        { turno_id: Number(turnoId), user_id: socioId, posicion, estado: 'esperando', fecha_solicitud: new Date().toISOString() },
        { onConflict: 'turno_id,user_id' }
      )

    if (errEsp) throw errEsp

    res.status(201).json({
      ok: true,
      inscripto: false,
      en_espera: true,
      posicion,
      mensaje: `El turno está lleno. Quedaste en la lista de espera en la posición ${posicion}. Te avisamos si se libera un lugar.`,
    })
  } catch (err) {
    console.error('POST /turnos/:turnoId/lista-espera', err)
    res.status(500).json({ error: 'Error al procesar la solicitud' })
  }
})

/**
 * DELETE /api/turnos/:turnoId/lista-espera/yo
 * El socio mismo sale de la lista de espera.
 */
router.delete('/:turnoId/lista-espera/yo', async (req, res) => {
  const socioId = req.userId
  const { turnoId } = req.params

  try {
    const { data: entrada } = await supabase
      .from('lista_espera_turno')
      .select('id, posicion')
      .eq('turno_id', turnoId)
      .eq('user_id', socioId)
      .eq('estado', 'esperando')
      .maybeSingle()

    if (!entrada) return res.status(404).json({ error: 'No estás en la lista de espera de este turno' })

    await supabase
      .from('lista_espera_turno')
      .update({ estado: 'cancelado' })
      .eq('id', entrada.id)

    // Reordenar posiciones de los que siguen
    const { data: restantes } = await supabase
      .from('lista_espera_turno')
      .select('id')
      .eq('turno_id', turnoId)
      .eq('estado', 'esperando')
      .gt('posicion', entrada.posicion)
      .order('posicion', { ascending: true })

    for (let i = 0; i < (restantes ?? []).length; i++) {
      await supabase
        .from('lista_espera_turno')
        .update({ posicion: entrada.posicion + i })
        .eq('id', restantes[i].id)
    }

    res.json({ mensaje: 'Saliste de la lista de espera' })
  } catch (err) {
    console.error('DELETE /turnos/:turnoId/lista-espera/yo', err)
    res.status(500).json({ error: 'Error al salir de la lista de espera' })
  }
})

/**
 * GET /api/turnos/lista-espera/mis-solicitudes
 * El socio consulta todos los turnos en los que está esperando.
 */
router.get('/lista-espera/mis-solicitudes', async (req, res) => {
  const socioId = req.userId
  try {
    const { data, error } = await supabase
      .from('lista_espera_turno')
      .select(`
        id, posicion, fecha_solicitud, estado,
        turnos(
          id, dia_semana, hora_inicio, hora_fin, fecha_inicio,
          sedes(nombre),
          users!turnos_user_id_fkey(nombre)
        )
      `)
      .eq('user_id', socioId)
      .eq('estado', 'esperando')
      .order('fecha_solicitud', { ascending: true })

    if (error) throw error
    res.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /turnos/lista-espera/mis-solicitudes', err)
    res.status(500).json({ error: 'Error al obtener lista de espera' })
  }
})

export default router
