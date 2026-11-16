/**
 * Helper de respuestas HTTP unificado.
 * Contrato: { ok: true, data } | { ok: false, mensaje }
 *
 * Uso:
 *   responder.ok(res, data)
 *   responder.ok(res, data, 201)
 *   responder.error(res, 'Mensaje de error', 400)
 *   responder.noEncontrado(res, 'Turno no encontrado')
 *   responder.sinPermiso(res)
 *   responder.conflicto(res, 'Ya existe')
 */

const responder = {
  /** 2xx — éxito */
  ok(res, data, status = 200) {
    return res.status(status).json({ ok: true, data: data ?? null })
  },

  /** 2xx — creado */
  creado(res, data) {
    return res.status(201).json({ ok: true, data: data ?? null })
  },

  /** 400 — solicitud inválida */
  error(res, mensaje, status = 400) {
    return res.status(status).json({ ok: false, mensaje })
  },

  /** 401 — no autenticado */
  noAutenticado(res, mensaje = 'No autenticado') {
    return res.status(401).json({ ok: false, mensaje })
  },

  /** 403 — sin permiso */
  sinPermiso(res, mensaje = 'Acceso no autorizado') {
    return res.status(403).json({ ok: false, mensaje })
  },

  /** 404 — no encontrado */
  noEncontrado(res, mensaje = 'Recurso no encontrado') {
    return res.status(404).json({ ok: false, mensaje })
  },

  /** 409 — conflicto (ya existe, cupo lleno, etc.) */
  conflicto(res, mensaje = 'Conflicto') {
    return res.status(409).json({ ok: false, mensaje })
  },

  /** 500 — error interno (solo para errores verdaderamente inesperados) */
  interno(res, mensaje = 'Error interno del servidor') {
    return res.status(500).json({ ok: false, mensaje })
  },
}

export default responder
