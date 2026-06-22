const express = require('express');
const router = express.Router();
const db = require('../db');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// ================================
// HU-07 / HU-08: Ver carrito del usuario autenticado
// ================================
router.get('/', verificarToken, async (req, res) => {
  const usuarioId = req.usuario.id;

  try {
    const [items] = await db.query(
      `SELECT 
        c.id,
        c.cantidad,
        c.variante_id,
        p.id AS producto_id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.stock AS stock_producto,
        p.imagen,
        v.talla,
        v.color,
        v.stock AS stock_variante,
        IFNULL(v.stock, p.stock) AS stock,
        (c.cantidad * p.precio) AS subtotal
      FROM carrito c
      INNER JOIN productos p ON c.producto_id = p.id
      LEFT JOIN producto_variantes v ON c.variante_id = v.id
      WHERE c.usuario_id = ?`,
      [usuarioId]
    );

    const total = items.reduce((sum, item) => {
      return sum + parseFloat(item.subtotal);
    }, 0);

    res.json({
      items,
      total: total.toFixed(2)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener carrito' });
  }
});

// ================================
// HU-07 + HU-18/HU-19: Agregar producto o variante al carrito
// ================================
router.post('/agregar', verificarToken, permitirRoles('comprador'), async (req, res) => {
  const usuarioId = req.usuario.id;
  const { producto_id, cantidad, variante_id, talla, color } = req.body;

  if (!producto_id || !cantidad) {
    return res.status(400).json({
      error: 'Producto y cantidad son obligatorios'
    });
  }

  const cantidadSolicitada = parseInt(cantidad);

  if (!Number.isInteger(cantidadSolicitada) || cantidadSolicitada <= 0) {
    return res.status(400).json({
      error: 'La cantidad debe ser mayor a 0'
    });
  }

  try {
    const [productos] = await db.query(
      `SELECT id, stock, activo 
       FROM productos 
       WHERE id = ?`,
      [producto_id]
    );

    if (productos.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    if (!productos[0].activo) {
      return res.status(400).json({ error: 'Producto no disponible' });
    }

    let varianteSeleccionada = null;

    // Preferimos variante_id, pero también aceptamos talla/color para no cambiar la interfaz.
    if (variante_id) {
      const [variantes] = await db.query(
        `SELECT id, stock, activo
         FROM producto_variantes
         WHERE id = ? AND producto_id = ?`,
        [variante_id, producto_id]
      );
      varianteSeleccionada = variantes[0] || null;
    } else if (talla || color) {
      const [variantes] = await db.query(
        `SELECT id, stock, activo
         FROM producto_variantes
         WHERE producto_id = ?
         AND (? IS NULL OR talla = ?)
         AND (? IS NULL OR color = ?)
         LIMIT 1`,
        [producto_id, talla || null, talla || null, color || null, color || null]
      );
      varianteSeleccionada = variantes[0] || null;
    }

    const stockDisponible = varianteSeleccionada
      ? Number(varianteSeleccionada.stock)
      : Number(productos[0].stock);

    if (varianteSeleccionada && !varianteSeleccionada.activo) {
      return res.status(400).json({ error: 'La variante seleccionada no está disponible' });
    }

    if (cantidadSolicitada > stockDisponible) {
      return res.status(400).json({ error: 'Stock insuficiente' });
    }

    const varianteIdFinal = varianteSeleccionada ? varianteSeleccionada.id : null;

    const [existe] = await db.query(
      `SELECT id, cantidad 
       FROM carrito 
       WHERE usuario_id = ? AND producto_id = ? AND variante_id <=> ?`,
      [usuarioId, producto_id, varianteIdFinal]
    );

    if (existe.length > 0) {
      const nuevaCantidad = existe[0].cantidad + cantidadSolicitada;

      if (nuevaCantidad > stockDisponible) {
        return res.status(400).json({ error: 'Stock insuficiente' });
      }

      await db.query(
        `UPDATE carrito 
         SET cantidad = ? 
         WHERE id = ?`,
        [nuevaCantidad, existe[0].id]
      );
    } else {
      await db.query(
        `INSERT INTO carrito (usuario_id, producto_id, variante_id, cantidad) 
         VALUES (?, ?, ?, ?)`,
        [usuarioId, producto_id, varianteIdFinal, cantidadSolicitada]
      );
    }

    res.json({ message: 'Producto agregado al carrito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al agregar producto al carrito' });
  }
});

// ================================
// HU-08: Actualizar cantidad
// ================================
router.put('/:id', verificarToken, async (req, res) => {
  const usuarioId = req.usuario.id;
  const { cantidad } = req.body;
  const cantidadNueva = parseInt(cantidad);

  if (!Number.isInteger(cantidadNueva) || cantidadNueva <= 0) {
    return res.status(400).json({
      error: 'La cantidad debe ser mayor a 0'
    });
  }

  try {
    const [items] = await db.query(
      `SELECT c.id, c.producto_id, c.variante_id, IFNULL(v.stock, p.stock) AS stock
       FROM carrito c
       INNER JOIN productos p ON c.producto_id = p.id
       LEFT JOIN producto_variantes v ON c.variante_id = v.id
       WHERE c.id = ? AND c.usuario_id = ?`,
      [req.params.id, usuarioId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado en carrito' });
    }

    if (cantidadNueva > items[0].stock) {
      return res.status(400).json({ error: 'Stock insuficiente' });
    }

    await db.query(
      `UPDATE carrito 
       SET cantidad = ? 
       WHERE id = ? AND usuario_id = ?`,
      [cantidadNueva, req.params.id, usuarioId]
    );

    res.json({ message: 'Cantidad actualizada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar cantidad' });
  }
});

// ================================
// HU-07: Eliminar item del carrito
// ================================
router.delete('/:id', verificarToken, async (req, res) => {
  const usuarioId = req.usuario.id;

  try {
    await db.query(
      `DELETE FROM carrito 
       WHERE id = ? AND usuario_id = ?`,
      [req.params.id, usuarioId]
    );

    res.json({ message: 'Producto eliminado del carrito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar producto del carrito' });
  }
});

module.exports = router;
