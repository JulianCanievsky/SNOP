/**
 * socioTurnoService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * ÚNICO módulo autorizado para crear y mutar filas de la tabla `socio_turno`.
 *
 * Regla de negocio de estados:
 *   pendiente          → estado = false  (solicitud esperando aprobación)
 *   activo             → estado = true   (inscripto / confirmado)
 *   cancelado_a_tiempo → estado = false  (canceló con ≥ N horas → genera crédito)
 *   cancelado_tarde    → estado = false  (canceló con < N horas → sin crédito)
 *   baja_entrenador    → estado = false  (entrenador dio la baja → genera crédito)
 *
 * PROHIBIDO hacer .insert() o .update() en socio_turno fuera de este módulo.
 */
import supabase from '../config/db.js'

// ── Mapa de estados a boolean ────────────────────────────────────────────────
const ESTADO_BOOL = {
  activo:             true,
  pendiente:          false,
  cancelado_a_tiempo: false,
  cancelado_tarde:    false,
  baja_entrenador:    false,
}

const ESTADOS_VALIDOS = Object.keys(ESTADO_BOOL)

function validarEstado(estadoTexto) {
  if (!ESTADOS_VALIDOS.includes(estadoTexto)) {
    throw new Error(`Estado inválido: '${estadoTexto}'. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Crea una fila en socio_turno escribiendo SIEMPRE estado_texto + estado boolean.
 *
 * @param {object} opts
 * @param {number} opts.turno_id
 * @param {number} opts.user_id
 * @param {string} opts.estado_texto  - uno de los ESTADOS_VALIDOS
 * @param {string} [opts.fecha_inscripcion]  - ISO string; default: ahora
 * @returns {Promise<object>} fila insertada
 */
export async function crearInscripcion({ turno_id, user_id, estado_texto, fecha_inscripcion }) {
  validarEstado(estado_texto)

  const { data, error } = await supabase
    .from('socio_turno')
    .insert({
      turno_id,
      user_id,
      estado:            ESTADO_BOOL[estado_texto],
      estado_texto,
      fecha_inscripcion: fecha_inscripcion ?? new Date().toISOString(),
    })
    .select('id, turno_id, user_id, estado, estado_texto, fecha_inscripcion')
    .single()

  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Actualiza el estado de una fila existente (por turno_id + user_id).
 * Mantiene estado_texto y estado boolean en sincronía.
 *
 * @param {object} opts
 * @param {number} opts.turno_id
 * @param {number} opts.user_id
 * @param {string} opts.estado_texto
 * @returns {Promise<object>} fila actualizada
 */
export async function actualizarEstado({ turno_id, user_id, estado_texto }) {
  validarEstado(estado_texto)

  const { data, error } = await supabase
    .from('socio_turno')
    .update({
      estado:       ESTADO_BOOL[estado_texto],
      estado_texto,
    })
    .eq('turno_id', turno_id)
    .eq('user_id', user_id)
    .select('id, turno_id, user_id, estado, estado_texto')
    .single()

  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Actualiza el estado por id de fila (útil cuando el admin actúa por socioTurnoId).
 *
 * @param {object} opts
 * @param {number} opts.socioTurnoId  - id de la fila en socio_turno
 * @param {string} opts.estado_texto
 * @returns {Promise<object>} fila actualizada
 */
export async function actualizarEstadoPorId({ socioTurnoId, estado_texto }) {
  validarEstado(estado_texto)

  const { data, error } = await supabase
    .from('socio_turno')
    .update({
      estado:       ESTADO_BOOL[estado_texto],
      estado_texto,
    })
    .eq('id', socioTurnoId)
    .select('id, turno_id, user_id, estado, estado_texto')
    .single()

  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Aprueba una solicitud pendiente (pendiente → activo).
 */
export async function aprobarInscripcion({ turno_id, user_id }) {
  return actualizarEstado({ turno_id, user_id, estado_texto: 'activo' })
}

/**
 * Aprueba por id de fila.
 */
export async function aprobarInscripcionPorId({ socioTurnoId }) {
  return actualizarEstadoPorId({ socioTurnoId, estado_texto: 'activo' })
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Rechaza una solicitud pendiente (pendiente → cancelado_a_tiempo).
 * Cuando el entrenador rechaza, se trata como cancelación con crédito.
 */
export async function rechazarInscripcion({ turno_id, user_id }) {
  return actualizarEstado({ turno_id, user_id, estado_texto: 'cancelado_a_tiempo' })
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Da de baja al socio por decisión del entrenador (activo → baja_entrenador).
 */
export async function bajaEntrenador({ turno_id, user_id }) {
  return actualizarEstado({ turno_id, user_id, estado_texto: 'baja_entrenador' })
}

/**
 * Da de baja por id de fila.
 */
export async function bajaEntrenadorPorId({ socioTurnoId }) {
  return actualizarEstadoPorId({ socioTurnoId, estado_texto: 'baja_entrenador' })
}
