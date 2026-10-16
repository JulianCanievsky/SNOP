import jwt from 'jsonwebtoken'

/**
 * Middleware de autenticación JWT.
 * Puebla req.user = { id, rol, club_id } y mantiene
 * los campos legacy (req.userId, req.userTipo, etc.) para compatibilidad.
 */
export default function autenticar(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, mensaje: 'Token requerido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    // Forma canónica — usar en código nuevo
    req.user = {
      id:      payload.id,
      rol:     payload.tipo_usuario_id,
      club_id: payload.club_id ?? null,
    }

    // Legacy — mantener para no romper routers existentes
    req.userId        = payload.id
    req.userEmail     = payload.email
    req.userTipo      = payload.tipo_usuario_id
    req.tipoUsuarioId = payload.tipo_usuario_id

    next()
  } catch (err) {
    return res.status(401).json({ ok: false, mensaje: 'Token inválido o expirado' })
  }
}

/**
 * Middleware factory de control de roles.
 * Uso: router.post('/ruta', autenticar, requireRole(2, 3), handler)
 * @param {...number} roles - IDs de tipo_usuario permitidos
 */
export function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ ok: false, mensaje: 'No autenticado' })
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ ok: false, mensaje: 'Acceso no autorizado' })
    }
    next()
  }
}
