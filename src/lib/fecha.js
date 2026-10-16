/**
 * Utilidades de fechas para la zona horaria del club.
 * TODAS las operaciones usan America/Argentina/Buenos_Aires.
 *
 * ⚠️ La columna turnos.fecha_inicio puede no tener timezone explícito.
 *    Tratarla siempre como si fuera hora Argentina (UTC-3).
 */

const TZ = 'America/Argentina/Buenos_Aires'

/**
 * Convierte un string ISO (con o sin tz) a fecha local Argentina.
 * Devuelve un objeto Date interpretado correctamente.
 *
 * Si el string NO tiene offset (ej. "2026-06-23 10:00:00"),
 * lo tratamos como si fuera hora Argentina añadiendo -03:00.
 */
export function parseFechaAR(isoString) {
  if (!isoString) return null

  const str = String(isoString).trim()

  // Si no tiene offset ni 'Z', asumimos que es hora Argentina
  const tieneOffset = str.includes('+') || str.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(str)

  if (!tieneOffset) {
    // Normalizar separador: "2026-06-23 10:00:00" → "2026-06-23T10:00:00"
    const normalizado = str.replace(' ', 'T')
    return new Date(`${normalizado}-03:00`)
  }

  return new Date(str)
}

/**
 * Devuelve la fecha en formato YYYY-MM-DD según hora Argentina.
 * Útil para agrupar turnos por día.
 */
export function toDateAR(isoString) {
  const fecha = parseFechaAR(isoString)
  if (!fecha || isNaN(fecha.getTime())) return null

  return fecha.toLocaleString('en-CA', { timeZone: TZ }).slice(0, 10) // YYYY-MM-DD
}

/**
 * Devuelve la fecha y hora formateada en español (Argentina).
 * Ej: "lunes 23 de junio, 10:00"
 */
export function formatFechaHoraAR(isoString, opciones = {}) {
  const fecha = parseFechaAR(isoString)
  if (!fecha || isNaN(fecha.getTime())) return ''

  const defaults = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }

  return fecha.toLocaleString('es-AR', { ...defaults, ...opciones })
}

/**
 * Devuelve solo la hora en formato HH:MM (Argentina).
 */
export function formatHoraAR(isoString) {
  const fecha = parseFechaAR(isoString)
  if (!fecha || isNaN(fecha.getTime())) return ''

  return fecha.toLocaleString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

/**
 * Devuelve la fecha de "ahora" en formato YYYY-MM-DD (Argentina).
 */
export function hoyAR() {
  return new Date().toLocaleString('en-CA', { timeZone: TZ }).slice(0, 10)
}

/**
 * Devuelve el timestamp actual como Date.
 */
export function ahoraAR() {
  return new Date()
}

/**
 * Calcula la diferencia en horas entre ahora y una fecha futura.
 * Útil para determinar si la cancelación es con suficiente anticipación.
 */
export function horasHasta(isoString) {
  const fecha = parseFechaAR(isoString)
  if (!fecha || isNaN(fecha.getTime())) return 0

  const diffMs = fecha.getTime() - Date.now()
  return diffMs / (1000 * 60 * 60)
}

/**
 * Determina si una fecha cae en los últimos N días del mes (Argentina).
 * Usado para decidir si el crédito se arrastra al mes siguiente.
 */
export function estaEnUltimaSemana(isoString, diasUltimaSemana = 7) {
  const fecha = parseFechaAR(isoString)
  if (!fecha || isNaN(fecha.getTime())) return false

  // Último día del mes en Argentina
  const fechaAR = new Date(fecha.toLocaleString('en-US', { timeZone: TZ }))
  const ultimoDia = new Date(fechaAR.getFullYear(), fechaAR.getMonth() + 1, 0).getDate()
  const diaDelMes = fechaAR.getDate()

  return diaDelMes > ultimoDia - diasUltimaSemana
}

/**
 * Devuelve el último instante del mes de una fecha dada (Argentina).
 * Formato ISO (UTC).
 */
export function finDeMesAR(isoString) {
  const fecha = parseFechaAR(isoString)
  if (!fecha || isNaN(fecha.getTime())) return null

  const fechaAR = new Date(fecha.toLocaleString('en-US', { timeZone: TZ }))
  // Último día del mes: ir al día 0 del mes siguiente
  const fin = new Date(fechaAR.getFullYear(), fechaAR.getMonth() + 1, 0, 23, 59, 59, 999)

  // Convertir a UTC interpretando como hora Argentina
  const finStr = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}T23:59:59-03:00`
  return new Date(finStr).toISOString()
}

/**
 * Devuelve el último instante del MES SIGUIENTE al de la fecha dada.
 * Usado para créditos arrastrados.
 */
export function finDeProximoMesAR(isoString) {
  const fecha = parseFechaAR(isoString)
  if (!fecha || isNaN(fecha.getTime())) return null

  const fechaAR = new Date(fecha.toLocaleString('en-US', { timeZone: TZ }))
  // Mes siguiente: día 0 del mes + 2
  const fin = new Date(fechaAR.getFullYear(), fechaAR.getMonth() + 2, 0, 23, 59, 59, 999)

  const finStr = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}T23:59:59-03:00`
  return new Date(finStr).toISOString()
}

/**
 * Devuelve el periodo YYYY-MM de una fecha (Argentina).
 */
export function periodoMesAR(isoString) {
  const fecha = parseFechaAR(isoString)
  if (!fecha || isNaN(fecha.getTime())) return null

  return fecha.toLocaleString('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).replace('/', '-').slice(0, 7)
}
