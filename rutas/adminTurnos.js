/**
 * rutas/adminTurnos.js
 * Gestión de turnos de entrenamiento por el administrador.
 *
 * Todos los endpoints requieren autenticación + rol admin (tipo_usuario_id = 3).
 * Respuestas: { ok, data } (responder.js).
 *
 * GET    /api/admin/turnos/mesas                       — mesas (selector)
 * GET    /api/admin/turnos/plantillas                  — turnos de entrenamiento activos
 * GET    /api/admin/turnos/disponibles                 — futuros con cupo (DetalleSocio)
 * GET    /api/admin/turnos/todos                       — futuros (panel de actividades)
 * POST   /api/admin/turnos/asignar/:socioId            — asignar turno a un socio (descuenta bono)
 * DELETE /api/admin/turnos/asignar/:socioId/:stId      — quitar turno a un socio (devuelve bono)
 * GET    /api/admin/turnos/:id                         — detalle
 * GET    /api/admin/turnos/:id/inscriptos              — { inscriptos, total }
 * POST   /api/admin/turnos                             — crear (recurrente o puntual)
 * PUT    /api/admin/turnos/:id                         — editar
 * DELETE /api/admin/turnos/:id                         — baja definitiva (estado/activo = false)
 * POST   /api/admin/turnos/:id/cancelar-semana         — cancelar SOLO la próxima instancia
 * POST   /api/admin/turnos/:id/socios                  — asignar socio
 * DELETE /api/admin/turnos/:id/socios/:socioId         — quitar socio
 * PATCH  /api/admin/turnos/:id/entrenador              — reasignar entrenador
 * GET    /api/admin/turnos/:id/lista-espera            — lista de espera (FIFO)
 *
 * Quitar un socio (admin) BORRA la fila y devuelve el crédito del bono: es una
 * corrección. Después se promueve al primero de la lista de espera (regla 5).
 */

import express from 'express'
import autenticar, { requireRole } from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import responder from '../src/lib/responder.js'
import {
  crearNotificacion,
  enviarEmail,
  emailTurnoAsignado,
  emailTurnoCanceladoSemana,
  emailTurnoSuspendido,
  emailTurnoQuitado,
} from '../src/lib/notificaciones.js'
import { getBonoActivo } from './bonos.js'
import {
  crearInscripcion,
  actualizarEstadoPorId,
  eliminarInscripcion,
  eliminarInscripcionPorId,
} from '../src/services/socioTurnoService.js'
import { promoverListaEspera, darDeBajaInscriptosPorClub } from '../src/services/turnosService.js'
import { hoyAR, toFechaAR, formatArES, formatHoraAR } from '../src/lib/fecha.js'

const router = express.Router()

// ── Middleware: solo admins ───────────────────────────────────────────────────
router.use(autenticar, requireRole(3))

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica que el entrenador no tenga otro turno RECURRENTE activo en el mismo
 * día y horario. Una sede puede tener varios turnos simultáneos (varias mesas
 * y entrenadores), así que solo se bloquea si el mismo entrenador se superpone.
 * Retorna el id del turno conflictivo o null si no hay solapamiento.
 */
async function verificarSolapamiento({ entrenador_id, dia_semana, hora_inicio, hora_fin, excluir_id }) {
  let query = supabase
    .from('turnos')
    .select('id, hora_inicio, hora_fin, dia_semana, user_id')
    .eq('user_id', entrenador_id)
    .eq('estado', true)
    .eq('tipo_turno_id', 1)
    .not('hora_inicio', 'is', null)

  if (excluir_id) query = query.neq('id', excluir_id)

  const { data: turnos } = await query

  for (const t of turnos ?? []) {
    if (t.dia_semana == null || t.dia_semana !== dia_semana) continue
    // Solo considerar solapamiento si hay superposición horaria real
    if (hora_inicio < t.hora_fin && hora_fin > t.hora_inicio) {
      return t.id // retornar el id del conflicto (truthy)
    }
  }
  return null
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** "HH:MM" del turno: usa hora_inicio si existe; si no, la deriva de fecha_inicio en hora AR. */
const horaDe = (hora, fechaIso) => hora?.slice(0, 5) ?? (fechaIso ? formatHoraAR(fechaIso) : null)

/**
 * Inscribe a un socio como 'activo'. Si ya tenía una fila cancelada/pendiente
 * en el turno, la reactiva en vez de duplicarla.
 * @returns {Promise<object|null>} la fila, o null si ya estaba activo
 */
async function inscribirActivo({ turno_id, user_id }) {
  const { data: filas } = await supabase
    .from('socio_turno')
    .select('id, estado')
    .eq('turno_id', turno_id)
    .eq('user_id', user_id)
    .order('fecha_inscripcion', { ascending: false })

  if ((filas ?? []).some(f => f.estado === true)) return null
  if (filas?.length) return actualizarEstadoPorId({ socioTurnoId: filas[0].id, estado_texto: 'activo' })
  return crearInscripcion({ turno_id, user_id, estado_texto: 'activo' })
}

/** Devuelve 1 crédito al bono si el socio lo había consumido en este turno. */
async function devolverCreditoBono({ turno_id, socio_id }) {
  const { data: uso } = await supabase
    .from('bono_turno')
    .select('id, bono_id')
    .eq('turno_id', turno_id)
    .eq('socio_id', socio_id)
    .maybeSingle()
  if (!uso) return

  await supabase.from('bono_turno').delete().eq('id', uso.id)
  const { data: bono } = await supabase
    .from('bonos').select('creditos_usados').eq('id', uso.bono_id).single()
  if (bono && bono.creditos_usados > 0) {
    await supabase.from('bonos').update({ creditos_usados: bono.creditos_usados - 1 }).eq('id', uso.bono_id)
  }
}

/** Descuenta 1 crédito del bono activo, si tiene. @returns {{bono_id, creditos_restantes}|null} */
async function descontarCreditoBono({ turno_id, socio_id }) {
  const bono = await getBonoActivo(socio_id)
  if (!bono || bono.creditos_usados >= bono.creditos_total) return null
  await supabase.from('bono_turno').insert({
    bono_id: bono.id, turno_id, socio_id, fecha_uso: new Date().toISOString(),
  })
  await supabase.from('bonos').update({ creditos_usados: bono.creditos_usados + 1 }).eq('id', bono.id)
  return { bono_id: bono.id, creditos_restantes: bono.creditos_total - bono.creditos_usados - 1 }
}

/** Calcula la próxima fecha concreta (ISO) para un turno recurrente dado su dia_semana y hora.
 *  La hora se interpreta en hora argentina (UTC-3) usando el offset explícito. */
function proximaFecha(dia_semana, hora_inicio) {
  // Tomamos la fecha "de hoy" en Argentina para calcular el próximo día de semana correcto.
  const ahoraAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  const diaHoy  = ahoraAR.getDay() // 0=Dom … 6=Sáb
  let diff      = (dia_semana - diaHoy + 7) % 7
  if (diff === 0) diff = 7 // nunca hoy; siempre la próxima ocurrencia

  // Fecha del próximo día correcto en calendario argentino
  const fechaBaseAR = new Date(ahoraAR)
  fechaBaseAR.setDate(ahoraAR.getDate() + diff)

  // Construir el ISO con offset -03:00 explícito para que la conversión a UTC sea correcta
  const yyyy = fechaBaseAR.getFullYear()
  const mm   = String(fechaBaseAR.getMonth() + 1).padStart(2, '0')
  const dd   = String(fechaBaseAR.getDate()).padStart(2, '0')
  return new Date(`${yyyy}-${mm}-${dd}T${hora_inicio}:00-03:00`)
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
    responder.ok(res, data ?? [])
  } catch (err) {
    console.error('GET /admin/mesas', err)
    responder.interno(res, 'Error al obtener mesas')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/turnos/plantillas — plantillas recurrentes activas
// ─────────────────────────────────────────────────────────────────────────────
router.get('/plantillas', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('turnos')
      .select(`
        id, estado, activo, recurrente, fecha_inicio, fecha_fin, duracion_min,
        dia_semana, hora_inicio, hora_fin,
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
      dia_semana:      t.dia_semana   ?? null,
      hora_inicio:     horaDe(t.hora_inicio, t.fecha_inicio),
      hora_fin:        horaDe(t.hora_fin,    t.fecha_fin),
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

    responder.ok(res, resultado)
  } catch (err) {
    console.error('GET /admin/turnos/plantillas', err)
    responder.interno(res, 'Error al obtener plantillas')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/turnos/disponibles
// Turnos de entrenamiento (tipo_turno_id=1) futuros con cupo, para el selector de DetalleSocio
// IMPORTANTE: antes de /:id para evitar captura
// ─────────────────────────────────────────────────────────────────────────────
router.get('/disponibles', async (_req, res) => {
  try {
    const desdeAR = hoyAR()
    const desde   = new Date(`${desdeAR}T00:00:00-03:00`)

    const { data: turnos, error } = await supabase
      .from('turnos')
      .select(`
        id, fecha_inicio, fecha_fin, capacidad_maxima, tipo_turno_id,
        sedes ( id, nombre ),
        users!turnos_user_id_fkey ( id, nombre ),
        socio_turno ( id, estado )
      `)
      .eq('tipo_turno_id', 1)
      .eq('estado', true)
      .gte('fecha_inicio', desde.toISOString())
      .order('fecha_inicio', { ascending: true })
      .limit(50)

    if (error) throw error

    const disponibles = (turnos ?? [])
      .map(t => {
        const inscriptos = (t.socio_turno ?? []).filter(s => s.estado === true).length
        return {
          id:               t.id,
          fecha_inicio:     t.fecha_inicio,
          fecha_fin:        t.fecha_fin,
          tipo_turno_id:    t.tipo_turno_id,
          sede:             t.sedes?.nombre ?? '—',
          entrenador:       t.users?.nombre ?? '—',
          capacidad_maxima: t.capacidad_maxima,
          inscriptos,
          cupo_disponible:  (t.capacidad_maxima ?? 0) - inscriptos,
        }
      })
      .filter(t => t.cupo_disponible > 0)

    responder.ok(res, disponibles)
  } catch (err) {
    console.error('GET /admin/turnos/disponibles', err)
    responder.interno(res, 'Error al obtener turnos disponibles')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/turnos/asignar/:socioId — asignar un turno de entrenamiento a un socio
// Body: { turno_id }
// Descuenta 1 crédito del bono activo del socio (solo para tipo_turno_id = 1)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/asignar/:socioId', async (req, res) => {
  const socioId      = req.params.socioId
  const { turno_id } = req.body

  if (!turno_id) {
    return responder.error(res, 'turno_id es requerido')
  }

  try {
    // Verificar socio
    const { data: socio, error: errSocio } = await supabase
      .from('users')
      .select('id, nombre, email')
      .eq('id', socioId)
      .eq('tipo_usuario_id', 1)
      .single()
    if (errSocio || !socio) return responder.noEncontrado(res, 'Socio no encontrado')

    // Verificar turno — solo tipo_turno_id = 1 (entrenamiento)
    const { data: turno, error: errTurno } = await supabase
      .from('turnos')
      .select('id, tipo_turno_id, capacidad_maxima, nivel_minimo_id, nivel_maximo_id, sedes(nombre), socio_turno(id, estado)')
      .eq('id', turno_id)
      .single()
    if (errTurno || !turno) return responder.noEncontrado(res, 'Turno no encontrado')

    if (turno.tipo_turno_id !== 1) {
      return responder.error(res, 'Solo se pueden asignar turnos de entrenamiento desde este panel')
    }

    const inscriptosActivos = (turno.socio_turno ?? []).filter(s => s.estado === true).length
    if (inscriptosActivos >= turno.capacidad_maxima) {
      return responder.error(res, 'El turno no tiene cupo disponible')
    }

    // Verificar nivel del socio dentro del rango permitido
    if (turno.nivel_minimo_id != null || turno.nivel_maximo_id != null) {
      const { data: socioNivel } = await supabase
        .from('users').select('nivel_id').eq('id', socioId).single()
      if (socioNivel?.nivel_id != null) {
        const { data: niveles } = await supabase
          .from('niveles').select('id, orden').order('orden', { ascending: true })
        const nivelMap   = Object.fromEntries((niveles ?? []).map(n => [n.id, n.orden]))
        const ordenSocio = nivelMap[socioNivel.nivel_id] ?? 0
        const ordenMin   = turno.nivel_minimo_id != null ? (nivelMap[turno.nivel_minimo_id] ?? 0) : null
        const ordenMax   = turno.nivel_maximo_id != null ? (nivelMap[turno.nivel_maximo_id] ?? Infinity) : null
        if (ordenMin != null && ordenSocio < ordenMin) {
          return responder.error(res, 'El nivel del socio no cumple el mínimo requerido para este turno')
        }
        if (ordenMax != null && ordenSocio > ordenMax) {
          return responder.error(res, 'El nivel del socio supera el máximo permitido para este turno')
        }
      }
    }

    // Inscribir (reactiva una fila cancelada si existe) vía socioTurnoService
    const inscripcion = await inscribirActivo({ turno_id, user_id: socioId })
    if (!inscripcion) return responder.conflicto(res, 'El socio ya está inscripto en este turno')

    // Recargar con joins para la respuesta
    const { data: inscripcionConJoins } = await supabase
      .from('socio_turno')
      .select('id, estado, estado_texto, turnos ( id, fecha_inicio, fecha_fin, sedes(nombre), mesas(numero) )')
      .eq('id', inscripcion.id)
      .single()

    // ── Descuento de bono: 1 crédito por turno de entrenamiento ──────────────
    let bonoInfo = null
    try {
      bonoInfo = await descontarCreditoBono({ turno_id, socio_id: socioId })
    } catch (bonoErr) {
      console.error('[admin/turnos/asignar] error bono:', bonoErr)
    }

    // Notificación + email al socio
    try {
      const fechaTurnoStr = inscripcionConJoins?.turnos?.fecha_inicio
        ? formatArES(inscripcionConJoins.turnos.fecha_inicio)
        : 'próximamente'
      const sedeStr = inscripcionConJoins?.turnos?.sedes?.nombre ?? turno.sedes?.nombre ?? 'la sede'
      await crearNotificacion({
        user_id: socioId,
        titulo:  'Nuevo turno asignado',
        mensaje: `Tenés un turno el ${fechaTurnoStr} en ${sedeStr}.`,
        tipo:    'turno_asignado',
        link:    '/mis-turnos',
      })
      const tmpl = emailTurnoAsignado({ nombre: socio.nombre, fechaTurno: fechaTurnoStr, sede: sedeStr })
      await enviarEmail({ to: socio.email, ...tmpl })
    } catch (notifErr) {
      console.error('[admin/turnos/asignar] notif:', notifErr)
    }

    responder.creado(res, { ...(inscripcionConJoins ?? inscripcion), bono: bonoInfo })
  } catch (err) {
    console.error('POST /admin/turnos/asignar/:socioId', err)
    responder.interno(res, 'Error al asignar turno')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/turnos/asignar/:socioId/:socioTurnoId — quitar turno a un socio
// socioTurnoId es el id de la fila en socio_turno
// Devuelve 1 crédito al bono si era turno de entrenamiento
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/asignar/:socioId/:socioTurnoId', async (req, res) => {
  const { socioId, socioTurnoId } = req.params

  try {
    const { data: insc, error: errInsc } = await supabase
      .from('socio_turno')
      .select('id, user_id, turno_id, turnos(id, tipo_turno_id, fecha_inicio, capacidad_maxima, dia_semana, hora_inicio, sedes(nombre))')
      .eq('id', socioTurnoId)
      .eq('user_id', socioId)
      .single()

    if (errInsc || !insc) return responder.noEncontrado(res, 'Inscripción no encontrada')

    await eliminarInscripcionPorId({ socioTurnoId: insc.id })

    // Devolución de crédito solo si era turno de entrenamiento
    if (insc.turnos?.tipo_turno_id === 1) {
      try {
        await devolverCreditoBono({ turno_id: insc.turno_id, socio_id: socioId })
      } catch (bonoErr) {
        console.error('[admin/turnos/asignar] error devolución bono:', bonoErr)
      }
    }

    // El cupo liberado pasa al primero de la lista de espera
    try {
      await promoverListaEspera(insc.turnos)
    } catch (listaErr) {
      console.error('[admin/turnos/asignar] lista de espera:', listaErr)
    }

    // Notificar al socio
    try {
      const { data: socioData } = await supabase
        .from('users').select('nombre, email').eq('id', socioId).single()
      if (socioData && insc.turnos) {
        const fechaStr = insc.turnos.fecha_inicio ? formatArES(insc.turnos.fecha_inicio) : 'próximamente'
        const sedeStr = insc.turnos.sedes?.nombre ?? 'la sede'
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
      console.error('[admin/turnos/asignar] notif quitar:', notifErr)
    }

    responder.ok(res, null)
  } catch (err) {
    console.error('DELETE /admin/turnos/asignar/:socioId/:socioTurnoId', err)
    responder.interno(res, 'Error al quitar turno')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/turnos/todos — todos los turnos futuros (panel de actividades)
// IMPORTANTE: debe ir ANTES de /:id para que Express no lo capture como id='todos'
// ─────────────────────────────────────────────────────────────────────────────
router.get('/todos', async (_req, res) => {
  try {
    const desdeAR = hoyAR()
    const desde   = new Date(`${desdeAR}T00:00:00-03:00`)

    const { data: turnos, error } = await supabase
      .from('turnos')
      .select(`
        id, fecha_inicio, fecha_fin, capacidad_maxima, tipo_turno_id,
        sedes ( id, nombre ),
        users!turnos_user_id_fkey ( id, nombre ),
        socio_turno ( id, estado )
      `)
      .eq('tipo_turno_id', 1)
      .eq('estado', true)
      .gte('fecha_inicio', desde.toISOString())
      .order('fecha_inicio', { ascending: true })
      .limit(30)

    if (error) throw error

    const resultado = (turnos ?? []).map(t => ({
      id:               t.id,
      fecha_inicio:     t.fecha_inicio,
      fecha_fin:        t.fecha_fin,
      tipo_turno_id:    t.tipo_turno_id,
      sede:             t.sedes?.nombre ?? '—',
      entrenador:       t.users?.nombre ?? '—',
      capacidad_maxima: t.capacidad_maxima,
      inscriptos:       (t.socio_turno ?? []).filter(s => s.estado === true).length,
      cupo_disponible:  (t.capacidad_maxima ?? 0) - (t.socio_turno ?? []).filter(s => s.estado === true).length,
    }))

    responder.ok(res, resultado)
  } catch (err) {
    console.error('GET /admin/turnos/todos', err)
    responder.interno(res, 'Error al obtener turnos')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/turnos/:id/inscriptos — inscriptos de un turno específico
// IMPORTANTE: debe ir ANTES de /:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/inscriptos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('socio_turno')
      .select(`
        id, estado, fecha_inscripcion,
        users!socio_turno_user_id_fkey ( id, nombre, email, telefono, nivel_id, niveles(nombre) )
      `)
      .eq('turno_id', req.params.id)
      .eq('estado', true)
      .order('fecha_inscripcion', { ascending: true })

    if (error) throw error

    const inscriptos = (data ?? []).map(i => ({
      id:                i.id,
      nombre:            i.users?.nombre   ?? '—',
      email:             i.users?.email    ?? '—',
      telefono:          i.users?.telefono ?? null,
      nivel:             i.users?.niveles?.nombre ?? 'Sin nivel',
      fecha_inscripcion: i.fecha_inscripcion,
    }))

    responder.ok(res, { inscriptos, total: inscriptos.length })
  } catch (err) {
    console.error('GET /admin/turnos/:id/inscriptos', err)
    responder.interno(res, 'Error al obtener inscriptos del turno')
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
        id, estado, activo, recurrente, fecha_inicio, fecha_fin, duracion_min,
        dia_semana, hora_inicio, hora_fin,
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
      return responder.noEncontrado(res, 'Turno no encontrado')
    }

    // Semanas canceladas puntualmente (si falla, el detalle sale igual)
    const { data: excepciones } = await supabase
      .from('turno_excepciones')
      .select('id, fecha_excepcion, motivo, estado')
      .eq('turno_id', req.params.id)
      .order('fecha_excepcion', { ascending: false })

    const inscriptos = (data.socio_turno ?? []).filter(s => s.estado === true)
    responder.ok(res, {
      ...data,
      dia_semana:        data.dia_semana ?? null,
      hora_inicio:       horaDe(data.hora_inicio, data.fecha_inicio),
      hora_fin:          horaDe(data.hora_fin,    data.fecha_fin),
      recurrente:        data.recurrente ?? false,
      activo:            data.activo     ?? true,
      turno_excepciones: excepciones ?? [],
      inscriptos_count:  inscriptos.length,
      cupo_disponible:   (data.capacidad_maxima ?? 0) - inscriptos.length,
    })
  } catch (err) {
    console.error('GET /admin/turnos/:id', err)
    responder.interno(res, 'Error al obtener turno')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/turnos — crear turno (recurrente o puntual)
// Body: { sede_id, mesa_id?, entrenador_id,
//         dia_semana,   hora_inicio, hora_fin,     ← recurrente (todos los X)
//         fecha_especifica?,                        ← puntual (YYYY-MM-DD, ignora dia_semana)
//         duracion_min?, capacidad_maxima, nivel_minimo_id?, nivel_maximo_id?,
//         recurrente? (default true) }
// Cuando fecha_especifica está presente → turno puntual (recurrente=false)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    sede_id, entrenador_id,
    dia_semana, hora_inicio, hora_fin,
    fecha_especifica,          // YYYY-MM-DD — si viene, es turno puntual
    duracion_min, capacidad_maxima,
    nivel_minimo_id, nivel_maximo_id,
    recurrente = true,
  } = req.body

  // fecha_especifica presente → forzar puntual
  const esPuntual   = !!fecha_especifica || recurrente === false
  const esRecurrente = !esPuntual

  // dia_semana requerido solo para recurrentes; para puntuales lo inferimos de la fecha
  const diaSemanaFinal = fecha_especifica != null
    ? new Date(`${fecha_especifica}T12:00:00-03:00`).getDay()
    : (dia_semana != null ? Number(dia_semana) : null)

  if (!sede_id || entrenador_id == null || diaSemanaFinal == null || !hora_inicio || !hora_fin || !capacidad_maxima) {
    return responder.error(res, 'Sede, entrenador, fecha (o día de la semana), horario y capacidad son requeridos')
  }

  if (hora_inicio >= hora_fin) {
    return responder.error(res, 'hora_inicio debe ser anterior a hora_fin')
  }

  try {
    // Verificar que el entrenador tiene tipo_usuario_id = 2
    const { data: entrenador, error: errEnt } = await supabase
      .from('users')
      .select('id, nombre, tipo_usuario_id')
      .eq('id', entrenador_id)
      .single()

    if (errEnt || !entrenador) {
      return responder.noEncontrado(res, 'Entrenador no encontrado')
    }
    if (entrenador.tipo_usuario_id !== 2) {
      return responder.error(res, 'El usuario seleccionado no es un entrenador')
    }

    // Verificar solapamiento solo para turnos recurrentes
    if (esRecurrente) {
      const conflictoId = await verificarSolapamiento({
        entrenador_id, dia_semana: diaSemanaFinal, hora_inicio, hora_fin,
      })
      if (conflictoId) {
        return responder.conflicto(res, `${entrenador.nombre} ya tiene un turno recurrente en ese día y horario (turno id: ${conflictoId}). Elegí otro entrenador u horario.`)
      }
    }

    // ── Calcular fecha_inicio y fecha_fin ─────────────────────────────────────
    let primeraFecha, primeraFin
    if (fecha_especifica) {
      // Turno puntual: usar la fecha exacta elegida
      primeraFecha = new Date(`${fecha_especifica}T${hora_inicio}:00-03:00`)
      primeraFin   = new Date(`${fecha_especifica}T${hora_fin}:00-03:00`)
    } else {
      // Turno recurrente: calcular el próximo día de semana
      primeraFecha = proximaFecha(diaSemanaFinal, hora_inicio)
      const fechaAR = toFechaAR(primeraFecha)
      primeraFin = new Date(`${fechaAR}T${hora_fin}:00-03:00`)
    }

    // Resolver mesa_id: usar la que viene del body o tomar la primera activa de la sede.
    // Si la sede no tiene mesas configuradas, se continúa con mesa_id = null (campo opcional).
    let mesaId = req.body.mesa_id || null
    if (!mesaId) {
      try {
        const { data: mesas } = await supabase
          .from('mesas')
          .select('id')
          .eq('sede_id', Number(sede_id))
          .eq('activa', true)
          .order('id')
          .limit(1)
        mesaId = mesas?.[0]?.id ?? null
      } catch {
        // La tabla mesas puede no existir aún — continuar sin mesa
        mesaId = null
      }
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
        ...(diaSemanaFinal != null ? { dia_semana: diaSemanaFinal } : {}),
        ...(hora_inicio            ? { hora_inicio }               : {}),
        ...(hora_fin               ? { hora_fin }                  : {}),
        // recurrente=true solo si realmente es plantilla semanal
        recurrente: esRecurrente,
        activo:     true,
      })
      .select('*, sedes(nombre), users!turnos_user_id_fkey(nombre)')
      .single()

    if (error) throw error
    responder.creado(res, data)
  } catch (err) {
    console.error('POST /admin/turnos', err)
    responder.interno(res, 'Error al crear turno')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/turnos/:id — editar turno
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const {
    entrenador_id,
    dia_semana, hora_inicio, hora_fin,
  } = req.body

  try {
    // Si cambia entrenador, verificar que sea tipo 2
    if (entrenador_id != null) {
      const { data: ent } = await supabase
        .from('users').select('tipo_usuario_id').eq('id', entrenador_id).single()
      if (!ent || ent.tipo_usuario_id !== 2) {
        return responder.error(res, 'El usuario seleccionado no es un entrenador')
      }
    }

    // Verificar que el entrenador no quede superpuesto si cambia horario/entrenador
    if (dia_semana != null && hora_inicio && hora_fin) {
      if (hora_inicio >= hora_fin) {
        return responder.error(res, 'hora_inicio debe ser anterior a hora_fin')
      }
      let entId = entrenador_id
      if (entId == null) {
        const { data: actual } = await supabase
          .from('turnos').select('user_id').eq('id', req.params.id).single()
        entId = actual?.user_id
      }
      const solapa = entId != null && await verificarSolapamiento({
        entrenador_id: entId, dia_semana: Number(dia_semana), hora_inicio, hora_fin,
        excluir_id: req.params.id,
      })
      if (solapa) {
        return responder.conflicto(res, 'El entrenador ya tiene otro turno en ese día y horario.')
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
        // fecha_fin el mismo día (hora AR, offset -03:00 explícito)
        campos.fecha_fin = new Date(`${toFechaAR(nuevaFecha)}T${campos.hora_fin}:00-03:00`).toISOString()
      }
    }

    const { data, error } = await supabase
      .from('turnos')
      .update(campos)
      .eq('id', req.params.id)
      .select('*, sedes(nombre), users!turnos_user_id_fkey(nombre)')
      .single()

    if (error) throw error
    responder.ok(res, data)
  } catch (err) {
    console.error('PUT /admin/turnos/:id', err)
    responder.interno(res, 'Error al actualizar turno')
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
      .select('id, fecha_inicio, sedes(nombre)')
      .eq('id', req.params.id)
      .single()

    if (!turno) return responder.noEncontrado(res, 'Turno no encontrado')

    const { error } = await supabase
      .from('turnos')
      .update({ estado: false, activo: false })
      .eq('id', req.params.id)
    if (error) throw error

    // Inscriptos activos → 'baja_entrenador' + crédito de recupero; después se los avisa
    const inscriptos = await darDeBajaInscriptosPorClub(turno)
    try {
      const fechaStr = turno.fecha_inicio ? formatArES(turno.fecha_inicio) : 'próximamente'
      const sedeStr  = turno.sedes?.nombre ?? 'la sede'

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

    responder.ok(res, null)
  } catch (err) {
    console.error('DELETE /admin/turnos/:id', err)
    responder.interno(res, 'Error al dar de baja el turno')
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

    if (errT || !turno) return responder.noEncontrado(res, 'Turno no encontrado')
    if (!turno.estado)  return responder.error(res, 'El turno está inactivo')

    // Calcular la fecha de la próxima instancia
    const fechaProxima = proximaFecha(turno.dia_semana, turno.hora_inicio)
    const fechaStr = toFechaAR(fechaProxima) // YYYY-MM-DD en hora AR (toISOString daría el día UTC)

    // Verificar que no exista ya una excepción para esa fecha
    const { data: existente } = await supabase
      .from('turno_excepciones')
      .select('id')
      .eq('turno_id', req.params.id)
      .eq('fecha_excepcion', fechaStr)
      .maybeSingle()

    if (existente) {
      return responder.conflicto(res, `Ya hay una excepción registrada para el ${fechaStr}`)
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

    responder.ok(res, { fecha_cancelada: fechaStr })
  } catch (err) {
    console.error('POST /admin/turnos/:id/cancelar-semana', err)
    responder.interno(res, 'Error al cancelar la instancia semanal')
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
    return responder.error(res, 'socio_id es requerido')
  }

  try {
    // Verificar socio
    const { data: socio } = await supabase
      .from('users').select('id, nombre, email, nivel_id').eq('id', socio_id).eq('tipo_usuario_id', 1).single()
    if (!socio) return responder.noEncontrado(res, 'Socio no encontrado')

    // Verificar cupo y niveles del turno
    const { data: turno } = await supabase
      .from('turnos')
      .select('id, capacidad_maxima, estado, hora_inicio, hora_fin, dia_semana, nivel_minimo_id, nivel_maximo_id, sedes(nombre), socio_turno(id, estado)')
      .eq('id', turnoId).single()

    if (!turno || !turno.estado) return responder.noEncontrado(res, 'Turno no encontrado o inactivo')

    const inscriptos = (turno.socio_turno ?? []).filter(s => s.estado === true).length
    if (inscriptos >= turno.capacidad_maxima) {
      return responder.error(res, 'El turno no tiene cupo disponible')
    }

    // Verificar nivel del socio dentro del rango permitido por el turno
    if ((turno.nivel_minimo_id != null || turno.nivel_maximo_id != null) && socio.nivel_id != null) {
      const { data: niveles } = await supabase
        .from('niveles').select('id, orden').order('orden', { ascending: true })
      const nivelMap   = Object.fromEntries((niveles ?? []).map(n => [n.id, n.orden]))
      const ordenSocio = nivelMap[socio.nivel_id] ?? 0
      const ordenMin   = turno.nivel_minimo_id != null ? (nivelMap[turno.nivel_minimo_id] ?? 0)        : null
      const ordenMax   = turno.nivel_maximo_id != null ? (nivelMap[turno.nivel_maximo_id] ?? Infinity) : null
      if (ordenMin != null && ordenSocio < ordenMin) {
        return responder.error(res, 'El nivel del socio no cumple el mínimo requerido para este turno')
      }
      if (ordenMax != null && ordenSocio > ordenMax) {
        return responder.error(res, 'El nivel del socio supera el máximo permitido para este turno')
      }
    }

    // Inscribir (reactiva una fila cancelada si existe) vía socioTurnoService
    const data = await inscribirActivo({ turno_id: turnoId, user_id: socio_id })
    if (!data) return responder.conflicto(res, 'El socio ya está inscripto en este turno')

    // Descuento de crédito del bono activo (si tiene uno)
    let bonoInfo = null
    try {
      bonoInfo = await descontarCreditoBono({ turno_id: turnoId, socio_id })
    } catch (bonoErr) {
      console.error('[admin/turnos/socios] error al descontar crédito:', bonoErr)
    }

    // Notificación al socio
    try {
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

    responder.creado(res, { ...data, bono: bonoInfo })
  } catch (err) {
    console.error('POST /admin/turnos/:id/socios', err)
    responder.interno(res, 'Error al asignar socio')
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
      .select('id, fecha_inicio, capacidad_maxima, dia_semana, hora_inicio, sedes(nombre)')
      .eq('id', turnoId)
      .single()

    const borradas = await eliminarInscripcion({ turno_id: turnoId, user_id: socioId })
    if (borradas === 0) return responder.noEncontrado(res, 'El socio no está en este turno')

    try {
      await devolverCreditoBono({ turno_id: turnoId, socio_id: socioId })
    } catch (bonoErr) {
      console.error('[admin/turnos/socios] error al devolver crédito:', bonoErr)
    }

    // El cupo liberado pasa al primero de la lista de espera
    try {
      await promoverListaEspera(turno)
    } catch (listaErr) {
      console.error('[admin/turnos/socios] lista de espera:', listaErr)
    }

    // Notificar al socio
    try {
      const { data: socioData } = await supabase
        .from('users').select('nombre, email').eq('id', socioId).single()
      if (socioData && turno) {
        const fechaStr = turno.fecha_inicio ? formatArES(turno.fecha_inicio) : 'próximamente'
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

    responder.ok(res, null)
  } catch (err) {
    console.error('DELETE /admin/turnos/:id/socios/:socioId', err)
    responder.interno(res, 'Error al quitar socio del turno')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/turnos/:id/entrenador — reasignar entrenador
// Body: { entrenador_id }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/entrenador', async (req, res) => {
  const { entrenador_id } = req.body
  if (!entrenador_id) return responder.error(res, 'entrenador_id es requerido')

  try {
    const { data: ent } = await supabase
      .from('users').select('id, nombre, tipo_usuario_id').eq('id', entrenador_id).single()

    if (!ent || ent.tipo_usuario_id !== 2) {
      return responder.error(res, 'El usuario seleccionado no es un entrenador')
    }

    const { data, error } = await supabase
      .from('turnos')
      .update({ user_id: entrenador_id })
      .eq('id', req.params.id)
      .select('id, user_id, users!turnos_user_id_fkey(nombre)')
      .single()

    if (error) throw error
    responder.ok(res, data)
  } catch (err) {
    console.error('PATCH /admin/turnos/:id/entrenador', err)
    responder.interno(res, 'Error al reasignar entrenador')
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
        id, created_at, estado,
        users!lista_espera_turno_user_id_fkey(id, nombre, email, nivel_id, niveles(nombre))
      `)
      .eq('turno_id', req.params.id)
      .eq('estado', 'esperando')
      .order('created_at', { ascending: true })   // FIFO

    if (error) throw error

    // posicion se calcula por orden de llegada (no se guarda en la BD)
    const resultado = (data ?? []).map((e, idx) => ({
      id:               e.id,
      posicion:         idx + 1,
      fecha_solicitud:  e.created_at,
      nombre:           e.users?.nombre ?? '—',
      email:            e.users?.email  ?? '—',
      nivel:            e.users?.niveles?.nombre ?? 'Sin nivel',
      user_id:          e.users?.id,
    }))

    responder.ok(res, resultado)
  } catch (err) {
    console.error('GET /admin/turnos/:id/lista-espera', err)
    responder.interno(res, 'Error al obtener lista de espera')
  }
})

export default router
