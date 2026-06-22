const express = require('express');
const router = express.Router();
const db = require('../db');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// ================================
// HU-26: Notificaciones del comprador
// ================================
router.get('/mis-notificaciones', verificarToken, permitirRoles('comprador', 'vendedor'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, pedido_id, titulo, mensaje, tipo, leida, created_at
       FROM notificaciones
       WHERE usuario_id = ?
       ORDER BY created_at DESC`,
      [req.usuario.id]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

router.get('/contador', verificarToken, permitirRoles('comprador', 'vendedor'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM notificaciones
       WHERE usuario_id = ? AND leida = FALSE`,
      [req.usuario.id]
    );

    res.json({ total: Number(rows[0].total || 0) });
  } catch (error) {
    console.error('Error al obtener contador de notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener contador de notificaciones' });
  }
});

router.put('/:id/leida', verificarToken, permitirRoles('comprador', 'vendedor'), async (req, res) => {
  try {
    const [result] = await db.query(
      `UPDATE notificaciones
       SET leida = TRUE
       WHERE id = ? AND usuario_id = ?`,
      [req.params.id, req.usuario.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({ error: 'Error al marcar notificación' });
  }
});

router.put('/marcar-todas/leidas', verificarToken, permitirRoles('comprador', 'vendedor'), async (req, res) => {
  try {
    await db.query(
      `UPDATE notificaciones
       SET leida = TRUE
       WHERE usuario_id = ?`,
      [req.usuario.id]
    );

    res.json({ message: 'Todas las notificaciones fueron marcadas como leídas' });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones:', error);
    res.status(500).json({ error: 'Error al marcar notificaciones' });
  }
});

module.exports = router;
