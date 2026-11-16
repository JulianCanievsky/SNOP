/**
 * src/lib/errores.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Helper único para obtener mensajes de error legibles en el frontend.
 *
 * Nunca muestra err.message de axios al usuario (contiene URLs, status codes, etc.)
 * Siempre devuelve texto en español (Argentina).
 *
 * Uso:
 *   import { obtenerMensajeError } from '../lib/errores.js'
 *   catch (err) { setError(obtenerMensajeError(err)) }
 */

/** Mensajes por código HTTP */
const MENSAJES_HTTP = {
  400: 'Los datos enviados no son válidos.',
  401: 'Correo o contraseña incorrectos.',
  403: 'No tenés permiso para realizar esta acción.',
  404: 'No encontramos lo que buscabas.',
  409: 'Ya existe un registro con esos datos.',
  429: 'Demasiados intentos, esperá unos minutos.',
  500: 'Hubo un error en el servidor. Intentá de nuevo más tarde.',
  503: 'El servidor no está disponible. Intentá más tarde.',
}

/**
 * Extrae el mensaje de error de una respuesta de axios o de red.
 *
 * Orden de lectura:
 *  1. data.mensaje   (contrato { ok:false, mensaje } del backend SNOP)
 *  2. data.error     (respuestas antiguas { error: '...' } — se migran gradualmente)
 *  3. Mensaje por código HTTP
 *  4. Error de red (sin response)
 *  5. Fallback genérico
 *
 * @param {unknown} err  - El error capturado en catch
 * @param {string}  [fallback] - Mensaje por defecto si ninguna fuente aplica
 * @returns {string}
 */
export function obtenerMensajeError(err, fallback = 'Algo salió mal. Intentá de nuevo.') {
  // Error de red — sin respuesta del servidor
  if (!err?.response) {
    if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
      return 'No pudimos conectar con el servidor. Revisá tu conexión.'
    }
    // Timeout
    if (err?.code === 'ECONNABORTED') {
      return 'La conexión tardó demasiado. Intentá de nuevo.'
    }
    return fallback
  }

  const { status, data } = err.response

  // Leer el mensaje del body (contrato SNOP)
  if (typeof data?.mensaje === 'string' && data.mensaje.trim()) {
    return data.mensaje.trim()
  }
  // Compatibilidad con respuestas antiguas { error: '...' }
  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error.trim()
  }

  // Mensajes por código HTTP
  if (MENSAJES_HTTP[status]) {
    return MENSAJES_HTTP[status]
  }

  return fallback
}
