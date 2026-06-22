const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// ================================
// HU-01: Registro de nuevo usuario
// ================================
router.post('/registro', async (req, res) => {
  const { nombre, correo, password } = req.body;

  // Validar campos obligatorios
  if (!nombre || !correo || !password) {
    return res.status(400).json({
      error: 'Todos los campos son obligatorios'
    });
  }

  try {
    // Verificar si el correo ya existe
    const [existe] = await db.query(
      'SELECT id FROM usuarios WHERE correo = ?', [correo]
    );

    if (existe.length > 0) {
      return res.status(400).json({
        error: 'Ese correo ya está registrado'
      });
    }

    // Encriptar contraseña
    const hash = await bcrypt.hash(password, 10);

    // Guardar usuario en BD
    await db.query(
      'INSERT INTO usuarios (nombre, correo, password) VALUES (?, ?, ?)',
      [nombre, correo, hash]
    );

    res.status(201).json({
      message: 'Cuenta creada exitosamente'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// HU-03: Inicio de sesión
// ================================
router.post('/login', async (req, res) => {
  const { correo, password } = req.body;

  // Validar campos
  if (!correo || !password) {
    return res.status(400).json({
      error: 'Correo y contraseña son obligatorios'
    });
  }

  try {
    // Buscar usuario por correo
    const [usuarios] = await db.query(
      'SELECT * FROM usuarios WHERE correo = ? AND activo = true', [correo]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        error: 'Credenciales incorrectas'
      });
    }

    const usuario = usuarios[0];

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return res.status(401).json({
        error: 'Credenciales incorrectas'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
      process.env.JWT_SECRET || 'shopfacil_secret_2026',
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;