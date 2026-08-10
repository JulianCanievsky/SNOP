/**
 * rutas/bonos.js
 * Gestión de bonos mensuales y créditos de reprogramación.
 *
 * Endpoints:
 *   GET    /api/bonos/resumen            — resumen del mes del socio
 *   POST   /api/bonos/cancelar-con-credito/:socioTurnoId
 *                                        — cancela y genera crédito si cumple anticipación
 *   GET    /api/bonos/turnos-disponibles — turnos de su nivel para reprogramar
 *   POST   /api/bonos/reprogramar        — usa un crédito para anotarse a otro turno
 *
 * Admin:
 *   GET    /api/bonos/admin/abonos       — lista de abonos activos
 *   POST   /api/bonos/admin/abonos       — crear/actualizar abono de un socio
 *   DELETE /api/bonos/admin/abonos/:id   — desactivar abono
 */

import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'

const router = express.Router()
router.use(autenticar)

// Anticipación mínima en horas para poder cancelar y generar crédito
const HORAS_MIN_CANCELACION = parseInt(process.env.CANCELACION_HORAS_MIN ?? '12', 10)

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Devuelve el string 'YYYY-MM' del mes de una fecha */
function mesPeriodo(fecha = new Date()) {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Último instante del mes de una fecha dada */
function finDeMes(fecha = new Date()) {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59, 999)
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bonos/resumen
// Devuelve:
//   abono: { plan_nombre, clases_mensuales } | null
//   tomadas: cantidad de clases confirmadas este mes
//   creditos_disponibles: créditos no usados del mes actual
//   creditos: lista de créditos con detalle
// ─────────────────────────────────────────────────────────────────────────────
router.get('/resumen', async (req, res) => {
  const socioId = req.userId
  const periodo = mesPeriodo()

  try {
    // Abono activo del socio
    const { data: abono } = await supabase
      .from('abonos')
      .select('id, plan_nombre, clases_mensuales')
      .eq('user_id', socioId)
      .eq('activo', true)
      .maybeSingle()

    // Clases tomadas este mes (socio_turno confirmado + turno en el mes)
    const inicioMes = new Date()
    inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0)
    const finMes = finDeMes()

    const { data: tomadas } = await supabase
      .from('socio_turno')
      .select(`
        id,
        turno_id,
        turnos!inner ( id, fecha_inicio, fecha_fin, sedes(nombre), users!turnos_user_id_fkey(nombre) )
      `)
      .eq('user_id', socioId)
      .eq('estado', true)
      .gte('turnos.fecha_inicio', inicioMes.toISOString())
      .lte('turnos.fecha_inicio', finMes.toISOString())

    // Créditos del mes
    const { data: creditos } = await supabase
      .from('creditos_clase')
      .select(`
        id,
        usado,
        fecha_generado,
        fecha_vencimiento,
        mes_periodo,
        turnos_origen:turnos!creditos_clase_turno_origen_id_fkey ( id, fecha_inicio, sedes(nombre) ),
        turnos_usado:turnos!creditos_clase_turno_usado_id_fkey   ( id, fecha_inicio, sedes(nombre) )
      `)
      .eq('user_id', socioId)
      .eq('mes_periodo', periodo)
      .order('fecha_generado', { ascending: false })

    const disponibles = (creditos ?? []).filter(c => !c.usado).length

    res.json({
      ok: true,
      data: {
        abono:                abono ?? null,
        clases_mensuales:     abono?.clases_mensuales ?? null,
        tomadas:              (tomadas ?? []).length,
        clases_detalle:       tomadas ?? [],
        creditos_disponibles: disponibles,
        creditos:             creditos ?? [],
        horas_min_cancelacion: HORAS_MIN_CANCELACION,
      },
    })
  } catch (err) {
    console.error('GET /bonos/resumen', err)
    res.status(500).json({ ok: false, error: 'Error al obtener resumen de bonos' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bonos/cancelar-con-credito/:socioTurnoId
// Cancela la inscripción y genera un crédito si:
//   - el turno es al menos HORAS_MIN_CANCELACION horas en el futuro
//   - el socio tiene abono activo
// ─────────────────────────────────────────────────────────────────────────────
router.post('/cancelar-con-credito/:socioTurnoId', async (req, res) => {
  const socioId      = req.userId
  const { socioTurnoId } = req.params

  try {
    // Verificar que la inscripción pertenece al socio y está confirmada
    const { data: insc, error: errInsc } = await supabase
      .from('socio_turno')
      .select('id, user_id, turno_id, estado, turnos(id, fecha_inicio)')
      .eq('id', socioTurnoId)
      .eq('user_id', socioId)
      .single()

    if (errInsc || !insc) {
      return res.status(404).json({ ok: false, error: 'Inscripción no encontrada' })
    }

    if (!insc.estado) {
      return res.status(400).json({ ok: false, error: 'El turno ya estaba cancelado' })
    }

    const fechaTurno  = new Date(insc.turnos?.fecha_inicio)
    const ahora       = new Date()
    const diffHoras   = (fechaTurno - ahora) / (1000 * 60 * 60)

    // Verificar abono activo
    const { data: abono } = await supabase
      .from('abonos')
      .select('id')
      .eq('user_id', socioId)
      .eq('activo', true)
      .maybeSingle()

    // Cancelar la inscripción (estado = false)
    const { error: errCancel } = await supabase
      .from('socio_turno')
      .update({ estado: false })
      .eq('id', socioTurnoId)

    if (errCancel) throw errCancel

    // Si cumple anticipación Y tiene abono → generar crédito
    let creditoGenerado = false
    if (abono && diffHoras >= HORAS_MIN_CANCELACION) {
      const periodo = mesPeriodo(fechaTurno)
      const vence   = finDeMes(fechaTurno)

      const { error: errCred } = await supabase
        .from('creditos_clase')
        .insert({
          user_id:          socioId,
          turno_origen_id:  insc.turno_id,
          mes_periodo:      periodo,
          usado:            false,
          fecha_vencimiento: vence.toISOString(),
        })

      if (!errCred) creditoGenerado = true
    }

    res.json({
      ok: true,
      credito_generado: creditoGenerado,
      mensaje: creditoGenerado
        ? `Clase cancelada. Se generó un crédito válido hasta fin de ${mesPeriodo(fechaTurno)}.`
        : abono
          ? `Clase cancelada. No se generó crédito porque falta menos de ${HORAS_MIN_CANCELACION}hs para el turno.`
          : 'Clase cancelada. No tenés abono activo.',
    })
  } catch (err) {
    console.error('POST /bonos/cancelar-con-credito', err)
    res.status(500).json({ ok: false, error: 'Error al cancelar clase' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bonos/turnos-disponibles
// Turnos futuros con cupo disponible y nivel compatible con el socio
// ─────────────────────────────────────────────────────────────────────────────
router.get('/turnos-disponibles', async (req, res) => {
  const socioId = req.userId

  try {
    // Nivel del socio
    const { data: socio } = await supabase
      .from('users')
      .select('nivel_id')
      .eq('id', socioId)
      .single()

    const nivelId = socio?.nivel_id ?? null

    const desde = new Date()
    desde.setHours(0, 0, 0, 0)

    // Turnos futuros de tipo 1 (entrenamiento grupal) con estado=true
    let query = supabase
      .from('turnos')
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        capacidad_maxima,
        nivel_minimo_id,
        nivel_maximo_id,
        sedes ( nombre ),
        users!turnos_user_id_fkey ( nombre ),
        socio_turno ( id, user_id, estado )
      `)
      .eq('tipo_turno_id', 1)
      .eq('estado', true)
      .gte('fecha_inicio', desde.toISOString())
      .order('fecha_inicio', { ascending: true })
      .limit(30)

    const { data: turnos, error } = await query
    if (error) throw error

    const resultado = (turnos ?? [])
      .map(t => {
        const confirmados = (t.socio_turno ?? []).filter(s => s.estado === true)
        const yaInscripto = confirmados.some(s => s.user_id === socioId)
        const cupoDisp    = (t.capacidad_maxima ?? 0) - confirmados.length
        return {
          id:             t.id,
          fecha_inicio:   t.fecha_inicio,
          fecha_fin:      t.fecha_fin,
          sede:           t.sedes?.nombre ?? '—',
          entrenador:     t.users?.nombre ?? '—',
          cupo_disponible: cupoDisp,
          ya_inscripto:   yaInscripto,
        }
      })
      // Solo turnos con cupo y en los que el socio no está ya
      .filter(t => t.cupo_disponible > 0 && !t.ya_inscripto)

    res.json({ ok: true, data: resultado })
  } catch (err) {
    console.error('GET /bonos/turnos-disponibles', err)
    res.status(500).json({ ok: false, error: 'Error al obtener turnos disponibles' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bonos/reprogramar
// Body: { credito_id, turno_id }
// Usa un crédito para anotarse a un turno
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reprogramar', async (req, res) => {
  const socioId = req.userId
  const { credito_id, turno_id } = req.body

  if (!credito_id || !turno_id) {
    return res.status(400).json({ ok: false, error: 'credito_id y turno_id son requeridos' })
  }

  try {
    // Verificar crédito disponible y del socio
    const { data: credito, error: errCred } = await supabase
      .from('creditos_clase')
      .select('id, user_id, usado, fecha_vencimiento')
      .eq('id', credito_id)
      .eq('user_id', socioId)
      .single()

    if (errCred || !credito) {
      return res.status(404).json({ ok: false, error: 'Crédito no encontrado' })
    }

    if (credito.usado) {
      return res.status(400).json({ ok: false, error: 'Este crédito ya fue utilizado' })
    }

    if (new Date(credito.fecha_vencimiento) < new Date()) {
      return res.status(400).json({ ok: false, error: 'Este crédito ya venció' })
    }

    // Verificar turno con cupo
    const { data: turno, error: errTurno } = await supabase
      .from('turnos')
      .select('id, capacidad_maxima, socio_turno(id, estado)')
      .eq('id', turno_id)
      .single()

    if (errTurno || !turno) {
      return res.status(404).json({ ok: false, error: 'Turno no encontrado' })
    }

    const confirmados = (turno.socio_turno ?? []).filter(s => s.estado === true).length
    if (confirmados >= turno.capacidad_maxima) {
      return res.status(400).json({ ok: false, error: 'El turno no tiene cupo disponible' })
    }

    // Verificar que no esté ya inscripto
    const { data: yaInsc } = await supabase
      .from('socio_turno')
      .select('id')
      .eq('user_id', socioId)
      .eq('turno_id', turno_id)
      .maybeSingle()

    if (yaInsc) {
      return res.status(409).json({ ok: false, error: 'Ya estás inscripto en este turno' })
    }

    // Insertar inscripción confirmada
    const { error: errInsc } = await supabase
      .from('socio_turno')
      .insert({
        user_id:           socioId,
        turno_id,
        estado:            true,
        fecha_inscripcion: new Date().toISOString(),
      })

    if (errInsc) {
      if (errInsc.code === '23505') {
        return res.status(409).json({ ok: false, error: 'Ya estás inscripto en este turno' })
      }
      throw errInsc
    }

    // Marcar crédito como usado
    await supabase
      .from('creditos_clase')
      .update({ usado: true, turno_usado_id: turno_id })
      .eq('id', credito_id)

    res.json({ ok: true, mensaje: 'Reprogramación confirmada. Crédito utilizado.' })
  } catch (err) {
    console.error('POST /bonos/reprogramar', err)
    res.status(500).json({ ok: false, error: 'Error al reprogramar' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════

function soloAdmin(req, res, next) {
  if (req.userTipo !== 3) {
    return res.status(403).json({ error: 'Acceso restringido a administradores' })
  }
  next()
}

// GET /api/bonos/admin/abonos
router.get('/admin/abonos', soloAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('abonos')
      .select('id, plan_nombre, clases_mensuales, activo, fecha_alta, users(id, nombre, email)')
      .eq('activo', true)
      .order('fecha_alta', { ascending: false })

    if (error) throw error
    res.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /bonos/admin/abonos', err)
    res.status(500).json({ error: 'Error al obtener abonos' })
  }
})

// POST /api/bonos/admin/abonos
// Body: { user_id, plan_nombre?, clases_mensuales }
// Si el socio ya tiene abono activo lo reemplaza (desactiva el anterior)
router.post('/admin/abonos', soloAdmin, async (req, res) => {
  const { user_id, plan_nombre = 'Estándar', clases_mensuales } = req.body

  if (!user_id || !clases_mensuales) {
    return res.status(400).json({ error: 'user_id y clases_mensuales son requeridos' })
  }

  try {
    // Desactivar abono anterior si existe
    await supabase
      .from('abonos')
      .update({ activo: false })
      .eq('user_id', user_id)
      .eq('activo', true)

    const { data, error } = await supabase
      .from('abonos')
      .insert({ user_id, plan_nombre, clases_mensuales, activo: true })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ data, mensaje: 'Abono asignado correctamente' })
  } catch (err) {
    console.error('POST /bonos/admin/abonos', err)
    res.status(500).json({ error: 'Error al asignar abono' })
  }
})

// DELETE /api/bonos/admin/abonos/:id
router.delete('/admin/abonos/:id', soloAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('abonos')
      .update({ activo: false })
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ mensaje: 'Abono desactivado' })
  } catch (err) {
    console.error('DELETE /bonos/admin/abonos', err)
    res.status(500).json({ error: 'Error al desactivar abono' })
  }
})

export default router
