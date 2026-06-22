const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');

const {
  verificarToken,
  permitirRoles
} = require('../middlewares/authMiddleware');

// ================================
// HU-12: Ver lista de usuarios
// Solo administrador
// ================================
router.get('/usuarios', verificarToken, permitirRoles('admin'), async (req, res) => {
  try {
    const [usuarios] = await db.query(
      `SELECT id, nombre, correo, rol, activo, created_at
       FROM usuarios
       ORDER BY created_at DESC`
    );

    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// ================================
// HU-13: Activar / desactivar usuarios
// Solo administrador
// Nota: las cuentas admin quedan protegidas para evitar bloqueo del sistema.
// ================================
router.put('/usuarios/:id/estado', verificarToken, permitirRoles('admin'), async (req, res) => {
  const { activo } = req.body;
  const usuarioId = req.params.id;

  if (activo === undefined) {
    return res.status(400).json({ error: 'El estado activo es obligatorio' });
  }

  try {
    const [usuariosObjetivo] = await db.query(
      `SELECT id, rol FROM usuarios WHERE id = ?`,
      [usuarioId]
    );

    if (usuariosObjetivo.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuariosObjetivo[0].rol === 'admin') {
      return res.status(400).json({
        error: 'Las cuentas administradoras están protegidas y no se pueden desactivar desde el panel'
      });
    }

    await db.query(
      `UPDATE usuarios SET activo = ? WHERE id = ?`,
      [Boolean(activo), usuarioId]
    );

    res.json({ message: 'Estado del usuario actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar estado del usuario' });
  }
});

// ================================
// HU-16: Gestionar roles de usuario
// Solo administrador
// ================================
router.put('/usuarios/:id/rol', verificarToken, permitirRoles('admin'), async (req, res) => {
  const { rol } = req.body;
  const usuarioId = req.params.id;

  const rolesPermitidos = ['comprador', 'vendedor'];

  if (!rol || !rolesPermitidos.includes(rol)) {
    return res.status(400).json({
      error: 'Rol inválido. Desde el panel solo se permite comprador o vendedor'
    });
  }

  try {
    const [usuariosObjetivo] = await db.query(
      `SELECT id, rol FROM usuarios WHERE id = ?`,
      [usuarioId]
    );

    if (usuariosObjetivo.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuariosObjetivo[0].rol === 'admin') {
      return res.status(400).json({
        error: 'No se puede cambiar el rol de una cuenta administradora'
      });
    }

    await db.query(
      `UPDATE usuarios SET rol = ? WHERE id = ?`,
      [rol, usuarioId]
    );

    res.json({
      message: 'Rol actualizado correctamente. El cambio se verá al volver a iniciar sesión.'
    });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    res.status(500).json({ error: 'Error al actualizar rol del usuario' });
  }
});

// ================================
// HU-17: Registrar vendedores desde administración
// Solo administrador
// ================================
router.post('/vendedores', verificarToken, permitirRoles('admin'), async (req, res) => {
  const { nombre, correo, password } = req.body;

  if (!nombre || !correo || !password) {
    return res.status(400).json({
      error: 'Nombre, correo y contraseña son obligatorios'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 6 caracteres'
    });
  }

  try {
    const [existe] = await db.query(
      `SELECT id FROM usuarios WHERE correo = ?`,
      [correo]
    );

    if (existe.length > 0) {
      return res.status(400).json({
        error: 'Ese correo ya está registrado'
      });
    }

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO usuarios (nombre, correo, password, rol, activo)
       VALUES (?, ?, ?, 'vendedor', true)`,
      [nombre, correo, hash]
    );

    res.status(201).json({
      message: 'Vendedor registrado correctamente'
    });
  } catch (error) {
    console.error('Error al registrar vendedor:', error);
    res.status(500).json({ error: 'Error al registrar vendedor' });
  }
});

module.exports = router;
