/**
 * rutas/adminTurnos.js
 * Gestión de turnos de entrenamiento por el administrador.
 *
 * Todos los endpoints requieren autenticación + rol admin (tipo_usuario_id = 3).
 *
 * POST   /api/admin/turnos                         — crear turno (plantilla recurrente o puntual)
 * GET    /api/admin/turnos/plantillas               — listar plantillas recurrentes activas
 * GET    /api/admin/turnos/:id                      — detalle de un turno / plantilla
 * PUT    /api/admin/turnos/:id                      — editar turno
 * DELETE /api/admin/turnos/:id                      — dar de baja DEFINITIVA (activo = false)
 * POST   /api/admin/turnos/:id/cancelar-semana      — cancelar SOLO la próxima instancia semanal
 * POST   /api/admin/turnos/:id/socios               — asignar socio
 * DELETE /api/admin/turnos/:id/socios/:socioId      — quitar socio
 * PATCH  /api/admin/turnos/:id/entrenador           — reasignar entrenador
 * GET    /api/admin/turnos/:id/lista-espera         — ver lista de espera (admin)
 * GET    /api/admin/mesas                           — listar mesas disponibles
 */

import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import {
  crearNotificacion,
  enviarEmail,
  emailTurnoAsignado,
  emailTurnoCanceladoSemana,
  emailTurnoSuspendido,
  emailTurnoQuitado,
} from '../src/lib/notificaciones.js'

const router = express.Router()

// ── Middleware: solo admins ───────────────────────────────────────────────────
function soloAdmin(req, res, next) {
  if (req.userTipo !== 3) {
    return res.status(403).json({ error: 'Acceso restringido a administradores' })
  }
  next()
}

router.use(autenticar, soloAdmin)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Verifica solapamiento de sede/horario con otros turnos activos. */
async function verificarSolapamiento({ sede_id, dia_semana, hora_inicio, hora_fin, excluir_id }) {
  // Buscamos turnos de entrenamiento (tipo_turno_id=1) en la misma sede con estado=true
  // No filtramos por recurrente/activo porque esas columnas pueden no existir aún (migración 002)
  let query = supabase
    .from('turnos')
    .select('id, hora_inicio, hora_fin, dia_semana')
    .eq('sede_id', sede_id)
    .eq('estado', true)
    .eq('tipo_turno_id', 1)
    .not('hora_inicio', 'is', null)  // solo turnos que ya tienen hora_inicio (post migración)

  if (excluir_id) query = query.neq('id', excluir_id)

  const { data: turnos } = await query

  for (const t of turnos ?? []) {
    if (t.dia_semana == null || t.dia_semana !== dia_semana) continue
    if (hora_inicio < t.hora_fin && hora_fin > t.hora_inicio) return true
  }
  return false
}

/** Calcula la próxima fecha concreta (ISO) para un turno recurrente dado su dia_semana y hora. */
function proximaFecha(dia_semana, hora_inicio) {
  const ahora = new Date()
  const hoy   = ahora.getDay() // 0=Dom … 6=Sáb
  let diff    = (dia_semana - hoy + 7) % 7
  if (diff === 0) diff = 7 // nunca hoy; siempre la próxima ocurrencia
  const fecha = new Date(ahora)
  fecha.setDate(ahora.getDate() + diff)
  const [h, m] = hora_inicio.split(':')
  fecha.setHours(Number(h), Number(m), 0, 0)
  return fecha
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/mesas — listar mesas (para poblar selector)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/mesas', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('mesas')
      .select('id, numero, sede_id, sedes(nombre)')
      .order('numero')
    if (error) throw error
    res.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /admin/mesas', err)
    res.status(500).json({ error: 'Error al obtener mesas' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/turnos/plantillas — plantillas recurrentes activas
// ─────────────────────────────────────────────────────────────────────────────
router.get('/plantillas', async (_req, res) => {
  try {
    // Query con solo columnas que existen antes de correr la migración 002.
    // Los campos recurrente/activo/dia_semana/hora_inicio/hora_fin se agregan
    // dinámicamente una vez que se corra migrations/002_turnos_recurrentes.sql.
    const { data, error } = await supabase
      .from('turnos')
      .select(`
        id, estado, fecha_inicio, fecha_fin, duracion_min,
        capacidad_maxima, tipo_turno_id,
        nivel_minimo_id, nivel_maximo_id,
        sede_id, mesa_id,
        sedes(id, nombre),
        mesas(id, numero),
        users!turnos_user_id_fkey(id, nombre),
        socio_turno(id, estado)
      `)
      .eq('estado', true)
      .eq('tipo_turno_id', 1)
      .order('fecha_inicio', { ascending: true })
      .limit(50)

    if (error) {
      console.error('GET /admin/turnos/plantillas — Supabase error:', JSON.stringify(error))
      throw error
    }

    const resultado = (data ?? []).map(t => ({
      id:              t.id,
      // Campos nuevos: existirán después de correr migration 002. Hasta entonces = null.
      dia_semana:      t.dia_semana   ?? null,
      hora_inicio:     t.hora_inicio  ?? (t.fecha_inicio ? new Date(t.fecha_inicio).toTimeString().slice(0,5) : null),
      hora_fin:        t.hora_fin     ?? (t.fecha_fin    ? new Date(t.fecha_fin).toTimeString().slice(0,5)    : null),
      duracion_min:    t.duracion_min ?? null,
      capacidad_maxima: t.capacidad_maxima,
      nivel_minimo_id: t.nivel_minimo_id,
      nivel_maximo_id: t.nivel_maximo_id,
      recurrente:      t.recurrente   ?? false,
      activo:          t.activo       ?? true,
      estado:          t.estado,
      sedes:           t.sedes,
      mesas:           t.mesas,
      users:           t.users,
      inscriptos:      (t.socio_turno ?? []).filter(s => s.estado === true).length,
      cupo_disponible: (t.capacidad_maxima ?? 0) - (t.socio_turno ?? []).filter(s => s.estado === true).length,
    }))

    res.json({ data: resultado })
  } catch (err) {
    console.error('GET /admin/turnos/plantillas', err)
    res.status(500).json({ error: 'Error al obtener plantillas', detalle: err?.message ?? String(err) })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/turnos/:id — detalle
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('turnos')
      .select(`
        id, estado, fecha_inicio, fecha_fin, duracion_min,
        capacidad_maxima, tipo_turno_id,
        nivel_minimo_id, nivel_maximo_id,
        sede_id, mesa_id,
        sedes(id, nombre),
        mesas(id, numero),
        users!turnos_user_id_fkey(id, nombre),
        niveles_min:niveles!turnos_nivel_minimo_id_fkey(id, nombre),
        niveles_max:niveles!turnos_nivel_maximo_id_fkey(id, nombre),
        socio_turno(
          id, estado, fecha_inscripcion,
          users!socio_turno_user_id_fkey(id, nombre, email, nivel_id, niveles(nombre))
        )
      `)
      .eq('id', req.params.id)
      .single()

    if (error) {
      console.error('GET /admin/turnos/:id — Supabase error:', JSON.stringify(error))
      return res.status(404).json({ error: 'Turno no encontrado' })
    }

    // Intentar cargar turno_excepciones por separado (tabla nueva, puede no existir aún)
    let excepciones = []
    try {
      const { data: exc } = await supabase
        .from('turno_excepciones')
        .select('id, fecha_excepcion, motivo, estado')
        .eq('turno_id', req.params.id)
        .order('fecha_excepcion', { ascending: false })
      excepciones = exc ?? []
    } catch {
      // tabla aún no creada — ignorar
    }

    const inscriptos = (data.socio_turno ?? []).filter(s => s.estado === true)
    res.json({
      data: {
        ...data,
        // Campos nuevos con fallback seguro
        dia_semana:      data.dia_semana  ?? null,
        hora_inicio:     data.hora_inicio ?? (data.fecha_inicio ? new Date(data.fecha_inicio).toTimeString().slice(0,5) : null),
        hora_fin:        data.hora_fin    ?? (data.fecha_fin    ? new Date(data.fecha_fin).toTimeString().slice(0,5)    : null),
        recurrente:      data.recurrente  ?? false,
        activo:          data.activo      ?? true,
        turno_excepciones: excepciones,
        inscriptos_count: inscriptos.length,
        cupo_disponible:  (data.capacidad_maxima ?? 0) - inscriptos.length,
      }
    })
  } catch (err) {
    console.error('GET /admin/turnos/:id', err)
    res.status(500).json({ error: 'Error al obtener turno', detalle: err?.message ?? String(err) })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/turnos — crear turno / plantilla recurrente
// Body: { sede_id, mesa_id?, entrenador_id, dia_semana, hora_inicio, hora_fin,
//         duracion_min?, capacidad_maxima, nivel_minimo_id?, nivel_maximo_id?,
//         recurrente? (default true) }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    sede_id, entrenador_id,
    dia_semana, hora_inicio, hora_fin,
    duracion_min, capacidad_maxima,
    nivel_minimo_id, nivel_maximo_id,
    recurrente = true,
  } = req.body

  if (!sede_id || entrenador_id == null || dia_semana == null || !hora_inicio || !hora_fin || !capacidad_maxima) {
    return res.status(400).json({
      error: 'sede_id, entrenador_id, dia_semana, hora_inicio, hora_fin y capacidad_maxima son requeridos',
    })
  }

  if (hora_inicio >= hora_fin) {
    return res.status(400).json({ error: 'hora_inicio debe ser anterior a hora_fin' })
  }

  try {
    // Verificar que el entrenador tiene tipo_usuario_id = 2
    const { data: entrenador, error: errEnt } = await supabase
      .from('users')
      .select('id, nombre, tipo_usuario_id')
      .eq('id', entrenador_id)
      .single()

    if (errEnt || !entrenador) {
      return res.status(404).json({ error: 'Entrenador no encontrado' })
    }
    if (entrenador.tipo_usuario_id !== 2) {
      return res.status(400).json({ error: 'El usuario seleccionado no es un entrenador' })
    }

    // Verificar solapamiento (solo para plantillas recurrentes)
    if (recurrente) {
      const solapa = await verificarSolapamiento({ sede_id, dia_semana, hora_inicio, hora_fin })
      if (solapa) {
        return res.status(409).json({
          error: 'Ya existe un turno recurrente en esa sede/mesa/horario. Revisá los turnos existentes.',
        })
      }
    }

    // Calcular fecha_inicio / fecha_fin para la primera instancia (on-the-fly)
    const primeraFecha = proximaFecha(dia_semana, hora_inicio)
    const [hf, mf]     = hora_fin.split(':')
    const primeraFin   = new Date(primeraFecha)
    primeraFin.setHours(Number(hf), Number(mf), 0, 0)

    // Resolver mesa_id: usar la que viene del body o tomar la primera activa de la sede
    let mesaId = req.body.mesa_id || null
    if (!mesaId) {
      const { data: mesas } = await supabase
        .from('mesas')
        .select('id')
        .eq('sede_id', Number(sede_id))
        .eq('activa', true)
        .order('id')
        .limit(1)
      mesaId = mesas?.[0]?.id ?? null
    }
    if (!mesaId) {
      return res.status(400).json({ error: 'No hay mesas disponibles en esa sede. Verificá que la sede tenga mesas cargadas.' })
    }

    const { data, error } = await supabase
      .from('turnos')
      .insert({
        tipo_turno_id:    1,
        sede_id,
        mesa_id:          mesaId,
        user_id:          entrenador_id,
        duracion_min:     duracion_min || null,
        capacidad_maxima,
        nivel_minimo_id:  nivel_minimo_id || null,
        nivel_maximo_id:  nivel_maximo_id || null,
        estado:           true,
        fecha_inicio:     primeraFecha.toISOString(),
        fecha_fin:        primeraFin.toISOString(),
        ...(dia_semana  != null ? { dia_semana }  : {}),
        ...(hora_inicio          ? { hora_inicio } : {}),
        ...(hora_fin              ? { hora_fin }   : {}),
        ...(recurrente != null   ? { recurrente, activo: true } : {}),
      })
      .select('*, sedes(nombre), users!turnos_user_id_fkey(nombre)')
      .single()

    if (error) throw error
    res.status(201).json({ data, mensaje: 'Turno creado correctamente' })
  } catch (err) {
    console.error('POST /admin/turnos', err)
    res.status(500).json({ error: err.message || 'Error al crear turno' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/turnos/:id — editar turno
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const {
    sede_id, entrenador_id,
    dia_semana, hora_inicio, hora_fin,
    duracion_min, capacidad_maxima,
    nivel_minimo_id, nivel_maximo_id,
  } = req.body

  try {
    // Si cambia entrenador, verificar que sea tipo 2
    if (entrenador_id != null) {
      const { data: ent } = await supabase
        .from('users').select('tipo_usuario_id').eq('id', entrenador_id).single()
      if (!ent || ent.tipo_usuario_id !== 2) {
        return res.status(400).json({ error: 'El usuario seleccionado no es un entrenador' })
      }
    }

    // Verificar solapamiento si cambia horario/sede/mesa
    if (sede_id && dia_semana != null && hora_inicio && hora_fin) {
      if (hora_inicio >= hora_fin) {
        return res.status(400).json({ error: 'hora_inicio debe ser anterior a hora_fin' })
      }
      const solapa = await verificarSolapamiento({
        sede_id, dia_semana, hora_inicio, hora_fin,
        excluir_id: req.params.id,
      })
      if (solapa) {
        return res.status(409).json({ error: 'Ya existe un turno en ese horario. Revisá los turnos existentes.' })
      }
    }

    const campos = {}
    const permitidos = [
      'sede_id', 'dia_semana', 'hora_inicio', 'hora_fin',
      'duracion_min', 'capacidad_maxima', 'nivel_minimo_id', 'nivel_maximo_id',
    ]
    for (const k of permitidos) {
      if (req.body[k] !== undefined) campos[k] = req.body[k] || null
    }
    if (entrenador_id != null) campos.user_id = entrenador_id

    // Recalcular fecha_inicio si cambió el horario
    if (campos.dia_semana != null && campos.hora_inicio) {
      const nuevaFecha = proximaFecha(campos.dia_semana, campos.hora_inicio)
      campos.fecha_inicio = nuevaFecha.toISOString()
      if (campos.hora_fin) {
        const [hf, mf] = campos.hora_fin.split(':')
        const nuevaFin = new Date(nuevaFecha)
        nuevaFin.setHours(Number(hf), Number(mf), 0, 0)
        campos.fecha_fin = nuevaFin.toISOString()
      }
    }

    const { data, error } = await supabase
      .from('turnos')
      .update(campos)
      .eq('id', req.params.id)
      .select('*, sedes(nombre), users!turnos_user_id_fkey(nombre)')
      .single()

    if (error) throw error
    res.json({ data, mensaje: 'Turno actualizado correctamente' })
  } catch (err) {
    console.error('PUT /admin/turnos/:id', err)
    res.status(500).json({ error: err.message || 'Error al actualizar turno' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/turnos/:id — baja DEFINITIVA (activo = false)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    // Obtener datos del turno e inscriptos antes de desactivar
    const { data: turno } = await supabase
      .from('turnos')
      .select('fecha_inicio, sedes(nombre), socio_turno(users!socio_turno_user_id_fkey(id, nombre, email))')
      .eq('id', req.params.id)
      .single()

    await supabase.from('turnos').update({ estado: false }).eq('id', req.params.id)
    try {
      await supabase.from('turnos').update({ activo: false }).eq('id', req.params.id)
    } catch { /* columna aún no existe */ }

    // Notificar a todos los inscriptos activos
    try {
      const inscriptos = (turno?.socio_turno ?? [])
        .map(s => s.users).filter(Boolean)
      const fechaStr = turno?.fecha_inicio
        ? new Date(turno.fecha_inicio).toLocaleString('es-AR', {
            weekday: 'long', day: 'numeric', month: 'long',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Argentina/Buenos_Aires',
          })
        : 'próximamente'
      const sedeStr = turno?.sedes?.nombre ?? 'la sede'

      for (const socio of inscriptos) {
        await crearNotificacion({
          user_id: socio.id,
          titulo:  'Turno suspendido',
          mensaje: `El turno del ${fechaStr} en ${sedeStr} fue suspendido.`,
          tipo:    'turno_suspendido',
          link:    '/mis-clases',
        })
        const tmpl = emailTurnoSuspendido({ nombre: socio.nombre, fechaTurno: fechaStr, sede: sedeStr })
        await enviarEmail({ to: socio.email, ...tmpl })
      }
    } catch (notifErr) {
      console.error('[admin/turnos] notif baja definitiva:', notifErr)
    }

    res.json({ mensaje: 'Turno dado de baja definitivamente' })
  } catch (err) {
    console.error('DELETE /admin/turnos/:id', err)
    res.status(500).json({ error: 'Error al dar de baja el turno' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/turnos/:id/cancelar-semana
// Cancela SOLO la próxima instancia del turno recurrente.
// Inserta una excepción en turno_excepciones para esa fecha.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/cancelar-semana', async (req, res) => {
  const { motivo } = req.body
  try {
    // Obtener el turno para conocer dia_semana y hora_inicio
    const { data: turno, error: errT } = await supabase
      .from('turnos')
      .select('id, dia_semana, hora_inicio, estado')
      .eq('id', req.params.id)
      .single()

    if (errT || !turno) return res.status(404).json({ error: 'Turno no encontrado' })
    if (!turno.estado)  return res.status(400).json({ error: 'El turno está inactivo' })

    // Calcular la fecha de la próxima instancia
    const fechaProxima = proximaFecha(turno.dia_semana, turno.hora_inicio)
    const fechaStr = fechaProxima.toISOString().split('T')[0] // YYYY-MM-DD

    // Verificar que no exista ya una excepción para esa fecha
    const { data: existente } = await supabase
      .from('turno_excepciones')
      .select('id')
      .eq('turno_id', req.params.id)
      .eq('fecha_excepcion', fechaStr)
      .maybeSingle()

    if (existente) {
      return res.status(409).json({ error: `Ya hay una excepción registrada para el ${fechaStr}` })
    }

    const { error: errExc } = await supabase
      .from('turno_excepciones')
      .insert({
        turno_id:        req.params.id,
        fecha_excepcion: fechaStr,
        motivo:          motivo || 'Cancelado por el administrador',
        estado:          'cancelado',
      })

    if (errExc) throw errExc

    // Notificar a todos los inscriptos activos de este turno
    try {
      const { data: inscriptos } = await supabase
        .from('socio_turno')
        .select('users!socio_turno_user_id_fkey(id, nombre, email)')
        .eq('turno_id', req.params.id)
        .eq('estado', true)

      const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
      const diaStr  = DIAS[turno.dia_semana] ?? `día ${turno.dia_semana}`
      const horaStr = turno.hora_inicio?.slice(0, 5) ?? ''

      // Obtener sede del turno
      const { data: turnoCompleto } = await supabase
        .from('turnos').select('sedes(nombre)').eq('id', req.params.id).single()
      const sedeStr  = turnoCompleto?.sedes?.nombre ?? 'la sede'
      const fechaDisplay = fechaProxima.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })

      for (const insc of inscriptos ?? []) {
        const socio = insc.users
        if (!socio?.id) continue
        await crearNotificacion({
          user_id: socio.id,
          titulo:  'Turno cancelado esta semana',
          mensaje: `El turno del ${diaStr} a las ${horaStr} hs en ${sedeStr} no se realizará el ${fechaDisplay}.`,
          tipo:    'turno_cancelado_semana',
          link:    '/mis-clases',
        })
        const tmpl = emailTurnoCanceladoSemana({
          nombre:     socio.nombre,
          fechaTurno: `${diaStr} ${fechaDisplay} a las ${horaStr} hs`,
          sede:       sedeStr,
        })
        await enviarEmail({ to: socio.email, ...tmpl })
      }
    } catch (notifErr) {
      console.error('[admin/turnos] notif cancelar-semana:', notifErr)
    }

    res.json({
      mensaje: `Instancia del ${fechaStr} cancelada. El turno recurrente sigue activo para las semanas siguientes.`,
      fecha_cancelada: fechaStr,
    })
  } catch (err) {
    console.error('POST /admin/turnos/:id/cancelar-semana', err)
    res.status(500).json({ error: 'Error al cancelar la instancia semanal' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/turnos/:id/socios — asignar socio al turno
// Body: { socio_id }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/socios', async (req, res) => {
  const turnoId  = req.params.id
  const { socio_id } = req.body

  if (!socio_id) {
    return res.status(400).json({ error: 'socio_id es requerido' })
  }

  try {
    // Verificar socio
    const { data: socio } = await supabase
      .from('users').select('id, nombre, email').eq('id', socio_id).eq('tipo_usuario_id', 1).single()
    if (!socio) return res.status(404).json({ error: 'Socio no encontrado' })

    // Verificar cupo
    const { data: turno } = await supabase
      .from('turnos')
      .select('id, capacidad_maxima, estado, hora_inicio, hora_fin, dia_semana, sedes(nombre), socio_turno(id, estado)')
      .eq('id', turnoId).single()

    if (!turno || !turno.estado) return res.status(404).json({ error: 'Turno no encontrado o inactivo' })

    const inscriptos = (turno.socio_turno ?? []).filter(s => s.estado === true).length
    if (inscriptos >= turno.capacidad_maxima) {
      return res.status(400).json({ error: 'El turno no tiene cupo disponible' })
    }

    // Verificar inscripción duplicada
    const { data: dup } = await supabase
      .from('socio_turno').select('id').eq('user_id', socio_id).eq('turno_id', turnoId).maybeSingle()
    if (dup) return res.status(409).json({ error: 'El socio ya está inscripto en este turno' })

    const { data, error } = await supabase
      .from('socio_turno')
      .insert({ user_id: socio_id, turno_id: turnoId, estado: true, fecha_inscripcion: new Date().toISOString() })
      .select('id, estado')
      .single()

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'El socio ya está inscripto en este turno' })
      throw error
    }

    // Notificación al socio
    try {
      const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
      const diaStr   = DIAS[turno.dia_semana] ?? `día ${turno.dia_semana}`
      const horaStr  = turno.hora_inicio?.slice(0, 5) ?? ''
      const fechaStr = `${diaStr}s a las ${horaStr} hs`
      const sedeStr  = turno.sedes?.nombre ?? 'la sede'

      await crearNotificacion({
        user_id: socio_id,
        titulo:  'Nuevo turno asignado',
        mensaje: `Te inscribieron en el turno de entrenamiento del ${fechaStr} en ${sedeStr}.`,
        tipo:    'turno_asignado',
        link:    '/mis-clases',
      })
      const tmpl = emailTurnoAsignado({ nombre: socio.nombre, fechaTurno: fechaStr, sede: sedeStr })
      await enviarEmail({ to: socio.email, ...tmpl })
    } catch (notifErr) {
      console.error('[admin/turnos] notif asignar socio:', notifErr)
    }

    res.status(201).json({ data, mensaje: 'Socio asignado al turno correctamente' })
  } catch (err) {
    console.error('POST /admin/turnos/:id/socios', err)
    res.status(500).json({ error: err.message || 'Error al asignar socio' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/turnos/:id/socios/:socioId — quitar socio del turno
// :socioId es el user_id del socio (NO el id de socio_turno)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id/socios/:socioId', async (req, res) => {
  const { id: turnoId, socioId } = req.params
  try {
    // Obtener datos del turno antes de borrar (para la notificación)
    const { data: turno } = await supabase
      .from('turnos')
      .select('fecha_inicio, sedes(nombre)')
      .eq('id', turnoId)
      .single()

    const { error } = await supabase
      .from('socio_turno')
      .delete()
      .eq('turno_id', turnoId)
      .eq('user_id', socioId)

    if (error) throw error

    // Notificar al socio
    try {
      const { data: socioData } = await supabase
        .from('users').select('nombre, email').eq('id', socioId).single()
      if (socioData && turno) {
        const fechaStr = turno.fecha_inicio
          ? new Date(turno.fecha_inicio).toLocaleString('es-AR', {
              weekday: 'long', day: 'numeric', month: 'long',
              hour: '2-digit', minute: '2-digit',
              timeZone: 'America/Argentina/Buenos_Aires',
            })
          : 'próximamente'
        const sedeStr = turno.sedes?.nombre ?? 'la sede'
        await crearNotificacion({
          user_id: socioId,
          titulo:  'Te dieron de baja de un turno',
          mensaje: `Fuiste dado/a de baja del turno del ${fechaStr} en ${sedeStr}.`,
          tipo:    'turno_baja',
          link:    '/mis-clases',
        })
        const tmpl = emailTurnoQuitado({ nombre: socioData.nombre, fechaTurno: fechaStr, sede: sedeStr })
        await enviarEmail({ to: socioData.email, ...tmpl })
      }
    } catch (notifErr) {
      console.error('[admin/turnos] notif quitar socio:', notifErr)
    }

    res.json({ mensaje: 'Socio quitado del turno correctamente' })
  } catch (err) {
    console.error('DELETE /admin/turnos/:id/socios/:socioId', err)
    res.status(500).json({ error: 'Error al quitar socio del turno' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/turnos/:id/entrenador — reasignar entrenador
// Body: { entrenador_id }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/entrenador', async (req, res) => {
  const { entrenador_id } = req.body
  if (!entrenador_id) return res.status(400).json({ error: 'entrenador_id es requerido' })

  try {
    const { data: ent } = await supabase
      .from('users').select('id, nombre, tipo_usuario_id').eq('id', entrenador_id).single()

    if (!ent || ent.tipo_usuario_id !== 2) {
      return res.status(400).json({ error: 'El usuario seleccionado no es un entrenador' })
    }

    const { data, error } = await supabase
      .from('turnos')
      .update({ user_id: entrenador_id })
      .eq('id', req.params.id)
      .select('id, user_id, users!turnos_user_id_fkey(nombre)')
      .single()

    if (error) throw error
    res.json({ data, mensaje: `Entrenador reasignado a ${ent.nombre}` })
  } catch (err) {
    console.error('PATCH /admin/turnos/:id/entrenador', err)
    res.status(500).json({ error: 'Error al reasignar entrenador' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/turnos/:id/lista-espera — ver lista de espera de un turno
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/lista-espera', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('lista_espera_turno')
      .select(`
        id, posicion, fecha_solicitud, estado,
        users!lista_espera_turno_user_id_fkey(id, nombre, email, nivel_id, niveles(nombre))
      `)
      .eq('turno_id', req.params.id)
      .eq('estado', 'esperando')
      .order('posicion', { ascending: true })

    if (error) throw error

    const resultado = (data ?? []).map(e => ({
      id:               e.id,
      posicion:         e.posicion,
      fecha_solicitud:  e.fecha_solicitud,
      nombre:           e.users?.nombre ?? '—',
      email:            e.users?.email  ?? '—',
      nivel:            e.users?.niveles?.nombre ?? 'Sin nivel',
      user_id:          e.users?.id,
    }))

    res.json({ data: resultado, total: resultado.length })
  } catch (err) {
    console.error('GET /admin/turnos/:id/lista-espera', err)
    res.status(500).json({ error: 'Error al obtener lista de espera' })
  }
})

export default router
