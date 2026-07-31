const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

// Autenticación por "Bearer token" (Authorization: Bearer <token>) en vez de
// cookies. Elegimos esto a propósito: cuando el backend y el frontend viven
// en subdominios distintos de una plataforma como Render (pawpals-web.onrender.com
// y pawpals-api.onrender.com), los navegadores tratan esos subdominios como
// "sitios" distintos y bloquean las cookies entre ellos aunque tengan
// SameSite=None — el login parecía funcionar pero cualquier pedido posterior
// (cargar el feed, publicar, comentar) fallaba con "No autenticado" porque la
// cookie nunca llegaba de vuelta. Un header Authorization no tiene ese
// problema: viaja siempre, sin importar de qué dominio venga el pedido.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

module.exports = { signToken, requireAuth };
