const express = require('express');
const router = express.Router();
const db = require('../db');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

function limpiarTexto(valor) {
  return String(valor || '').trim();
}

// ================================
// HU-28: Ver preguntas y respuestas en el detalle del producto
// ================================
router.get('/producto/:productoId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        pp.id,
        pp.producto_id,
        pp.pregunta,
        pp.respuesta,
        pp.created_at,
        pp.respondida_at,
        u.nombre AS comprador
       FROM producto_preguntas pp
       INNER JOIN usuarios u ON pp.comprador_id = u.id
       WHERE pp.producto_id = ?
       ORDER BY pp.created_at DESC`,
      [req.params.productoId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener preguntas:', error);
    res.status(500).json({ error: 'Error al obtener preguntas del producto' });
  }
});

// ================================
// HU-28: Comprador pregunta al vendedor
// ================================
router.post('/producto/:productoId', verificarToken, permitirRoles('comprador'), async (req, res) => {
  const pregunta = limpiarTexto(req.body.pregunta);

  if (!pregunta || pregunta.length < 5) {
    return res.status(400).json({ error: 'Escribe una pregunta de al menos 5 caracteres' });
  }

  if (pregunta.length > 500) {
    return res.status(400).json({ error: 'La pregunta no debe superar los 500 caracteres' });
  }

  try {
    const [productos] = await db.query(
      `SELECT id, nombre, vendedor_id
       FROM productos
       WHERE id = ? AND activo = TRUE`,
      [req.params.productoId]
    );

    if (productos.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const producto = productos[0];

    if (!producto.vendedor_id) {
      return res.status(400).json({ error: 'Este producto no tiene vendedor asignado' });
    }

    await db.query(
      `INSERT INTO producto_preguntas (producto_id, comprador_id, vendedor_id, pregunta)
       VALUES (?, ?, ?, ?)`,
      [producto.id, req.usuario.id, producto.vendedor_id, pregunta]
    );

    res.status(201).json({ message: 'Pregunta enviada al vendedor' });
  } catch (error) {
    console.error('Error al enviar pregunta:', error);
    res.status(500).json({ error: 'Error al enviar la pregunta' });
  }
});

// ================================
// HU-28: Vendedor ve preguntas de sus productos
// ================================
router.get('/vendedor', verificarToken, permitirRoles('vendedor'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        pp.id,
        pp.producto_id,
        p.nombre AS producto,
        u.nombre AS comprador,
        u.correo AS comprador_correo,
        pp.pregunta,
        pp.respuesta,
        pp.created_at,
        pp.respondida_at
       FROM producto_preguntas pp
       INNER JOIN productos p ON pp.producto_id = p.id
       INNER JOIN usuarios u ON pp.comprador_id = u.id
       WHERE pp.vendedor_id = ?
       ORDER BY pp.created_at DESC`,
      [req.usuario.id]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener preguntas del vendedor:', error);
    res.status(500).json({ error: 'Error al obtener preguntas recibidas' });
  }
});

// ================================
// HU-28: Vendedor responde una pregunta
// ================================
router.put('/:id/responder', verificarToken, permitirRoles('vendedor'), async (req, res) => {
  const respuesta = limpiarTexto(req.body.respuesta);

  if (!respuesta || respuesta.length < 3) {
    return res.status(400).json({ error: 'Escribe una respuesta válida' });
  }

  if (respuesta.length > 800) {
    return res.status(400).json({ error: 'La respuesta no debe superar los 800 caracteres' });
  }

  try {
    const [preguntas] = await db.query(
      `SELECT id
       FROM producto_preguntas
       WHERE id = ? AND vendedor_id = ?`,
      [req.params.id, req.usuario.id]
    );

    if (preguntas.length === 0) {
      return res.status(404).json({ error: 'Pregunta no encontrada para este vendedor' });
    }

    await db.query(
      `UPDATE producto_preguntas
       SET respuesta = ?, respondida_at = CURRENT_TIMESTAMP
       WHERE id = ? AND vendedor_id = ?`,
      [respuesta, req.params.id, req.usuario.id]
    );

    res.json({ message: 'Respuesta registrada correctamente' });
  } catch (error) {
    console.error('Error al responder pregunta:', error);
    res.status(500).json({ error: 'Error al responder la pregunta' });
  }
});

module.exports = router;
