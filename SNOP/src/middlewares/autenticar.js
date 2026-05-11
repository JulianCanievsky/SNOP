const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación — verifica el JWT en el header Authorization.
 * Adjunta el payload decodificado en req.usuario.
 */
const autenticar = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { userId, role, nombre, clubId }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

/**
 * Middleware de autorización por rol.
 * Uso: requireRole('socio') | requireRole('admin', 'entrenador')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!roles.includes(req.usuario.role)) {
      return res.status(403).json({ error: 'Acceso denegado. Rol insuficiente.' });
    }
    next();
  };
};

module.exports = { autenticar, requireRole };