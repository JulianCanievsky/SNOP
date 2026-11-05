/**
 * Error de regla de negocio (backend): su mensaje está pensado para el usuario.
 *
 * Los servicios lanzan ErrorNegocio para casos esperables ("ya estás inscripto",
 * "no hay cupo"). Cualquier otro error (Supabase, bug) se responde como 500
 * genérico, sin exponer detalles internos.
 *
 * Uso en servicios:  throw new ErrorNegocio('Ya estás inscripto en este turno', 409)
 * Uso en rutas:      catch (err) { responderError(res, err, 'Error al cancelar turno') }
 */
import responder from './responder.js'

export class ErrorNegocio extends Error {
  /**
   * @param {string} mensaje — texto en español para mostrar al usuario
   * @param {number} [status=400] — 400 inválido · 403 sin permiso · 404 no existe · 409 conflicto
   */
  constructor(mensaje, status = 400) {
    super(mensaje)
    this.name   = 'ErrorNegocio'
    this.status = status
  }
}

/** Responde un ErrorNegocio con su status, o un 500 genérico para todo lo demás. */
export function responderError(res, err, mensajeInterno = 'Error interno del servidor') {
  if (err instanceof ErrorNegocio) return responder.error(res, err.message, err.status)
  console.error(err)
  return responder.interno(res, mensajeInterno)
}
