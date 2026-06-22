const express = require('express');
const router = express.Router();
const db = require('../db');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, permitirRoles('comprador'), async (req, res) => {
  try {
    const [favoritos] = await db.query(`
      SELECT 
        f.id AS favorito_id,
        f.created_at AS fecha_favorito,
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.stock,
        p.imagen,
        p.categoria,
        p.activo
      FROM favoritos f
      INNER JOIN productos p ON f.producto_id = p.id
      WHERE f.usuario_id = ? AND p.activo = TRUE
      ORDER BY f.created_at DESC
    `, [req.usuario.id]);

    res.json(favoritos);
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

router.get('/ids', verificarToken, permitirRoles('comprador'), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT producto_id FROM favoritos WHERE usuario_id = ?',
      [req.usuario.id]
    );
    res.json(rows.map(r => r.producto_id));
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

router.get('/:productoId/estado', verificarToken, permitirRoles('comprador'), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id FROM favoritos WHERE usuario_id = ? AND producto_id = ? LIMIT 1',
      [req.usuario.id, req.params.productoId]
    );
    res.json({ favorito: rows.length > 0 });
  } catch (error) {
    console.error('Error al consultar favorito:', error);
    res.status(500).json({ error: 'Error al consultar favorito' });
  }
});

router.post('/:productoId', verificarToken, permitirRoles('comprador'), async (req, res) => {
  const productoId = Number(req.params.productoId);

  if (!productoId) {
    return res.status(400).json({ error: 'Producto inválido' });
  }

  try {
    const [productos] = await db.query(
      'SELECT id FROM productos WHERE id = ? AND activo = TRUE LIMIT 1',
      [productoId]
    );

    if (productos.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await db.query(
      `INSERT IGNORE INTO favoritos (usuario_id, producto_id) VALUES (?, ?)`,
      [req.usuario.id, productoId]
    );

    res.status(201).json({ message: 'Producto agregado a favoritos', favorito: true });
  } catch (error) {
    console.error('Error al agregar favorito:', error);
    res.status(500).json({ error: 'Error al agregar favorito' });
  }
});

router.delete('/:productoId', verificarToken, permitirRoles('comprador'), async (req, res) => {
  try {
    await db.query(
      'DELETE FROM favoritos WHERE usuario_id = ? AND producto_id = ?',
      [req.usuario.id, req.params.productoId]
    );

    res.json({ message: 'Producto eliminado de favoritos', favorito: false });
  } catch (error) {
    console.error('Error al eliminar favorito:', error);
    res.status(500).json({ error: 'Error al eliminar favorito' });
  }
});

module.exports = router;
