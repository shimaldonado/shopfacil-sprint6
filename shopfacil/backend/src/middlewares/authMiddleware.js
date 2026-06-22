const jwt = require('jsonwebtoken');
const db = require('../db');

// ================================
// Verificar JWT + usuario activo
// ================================
async function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no válido' });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'shopfacil_secret_2026'
    );

    const [usuarios] = await db.query(
      `SELECT id, nombre, correo, rol, activo
       FROM usuarios
       WHERE id = ?`,
      [decoded.id]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (!usuarios[0].activo) {
      return res.status(403).json({ error: 'Usuario desactivado' });
    }

    req.usuario = usuarios[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
}

// ================================
// Middleware para roles
// ================================
function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }

    next();
  };
}

module.exports = {
  verificarToken,
  permitirRoles
};
