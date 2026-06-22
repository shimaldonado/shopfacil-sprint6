// const express = require('express');
// const router = express.Router();
// const db = require('../db');
// const {
//   verificarToken,
//   permitirRoles
// } = require('../middlewares/authMiddleware');


// // ================================
// // HU-05 + HU-14: Catálogo con filtros
// // ================================
// router.get('/', async (req, res) => {
//   const { nombre, precio_min, precio_max, categoria } = req.query;

//   let query = `
//     SELECT id, nombre, descripcion, precio, stock, imagen, categoria
//     FROM productos
//     WHERE activo = true
//   `;

//   const params = [];

//   if (nombre) {
//     query += ' AND nombre LIKE ?';
//     params.push(`%${nombre}%`);
//   }

//   if (categoria && categoria !== 'todos') {
//     query += ' AND categoria = ?';
//     params.push(categoria);
//   }

//   if (precio_min) {
//     query += ' AND precio >= ?';
//     params.push(parseFloat(precio_min));
//   }

//   if (precio_max) {
//     query += ' AND precio <= ?';
//     params.push(parseFloat(precio_max));
//   }

//   query += ' ORDER BY created_at DESC';

//   try {
//     const [productos] = await db.query(query, params);
//     res.json(productos);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Error al obtener productos' });
//   }
// });

// // ================================
// // HU-15: Ver detalle completo del producto
// // ================================
// router.get('/:id', async (req, res) => {
//   try {
//     const [productos] = await db.query(
//       `SELECT id, nombre, descripcion, precio, stock, imagen, categoria
//        FROM productos
//        WHERE id = ? AND activo = true`,
//       [req.params.id]
//     );

//     if (productos.length === 0) {
//       return res.status(404).json({ error: 'Producto no encontrado' });
//     }

//     res.json(productos[0]);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Error al obtener producto' });
//   }
// });
// // ================================
// // HU-06: Registrar producto solo vendedor
// // ================================
// router.post(
//   '/',
//   verificarToken,
//   permitirRoles('vendedor'),
//   async (req, res) => {
//     const { nombre, descripcion, precio, stock, imagen, categoria } = req.body;

//     if (!nombre || precio === undefined || stock === undefined) {
//       return res.status(400).json({
//         error: 'Nombre, precio y stock son obligatorios'
//       });
//     }

//     if (Number(precio) <= 0) {
//       return res.status(400).json({
//         error: 'El precio debe ser mayor a 0'
//       });
//     }

//     if (Number(stock) < 0) {
//       return res.status(400).json({
//         error: 'El stock no puede ser negativo'
//       });
//     }

//     try {
//       await db.query(
//         `INSERT INTO productos 
//          (nombre, descripcion, precio, stock, imagen, categoria, vendedor_id, activo)
//          VALUES (?, ?, ?, ?, ?, ?, ?, true)`,
//         [
//           nombre,
//           descripcion || null,
//           Number(precio),
//           Number(stock),
//           imagen || null,
//           categoria,
//           req.usuario.id
//         ]
//       );

//       res.status(201).json({
//         message: 'Producto registrado exitosamente'
//       });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: 'Error al registrar producto' });
//     }
//   }
// );

// module.exports = router;


const express = require('express');
const router = express.Router();
const db = require('../db');

const {
  verificarToken,
  permitirRoles
} = require('../middlewares/authMiddleware');

// ================================
// HU-05 + HU-14: Catálogo con filtros
// ================================
router.get('/', async (req, res) => {
  const { nombre, precio_min, precio_max, categoria } = req.query;

  let query = `
    SELECT id, nombre, descripcion, precio, stock, imagen, categoria
    FROM productos
    WHERE activo = true
  `;

  const params = [];

  if (nombre) {
    query += ' AND nombre LIKE ?';
    params.push(`%${nombre}%`);
  }

  if (categoria && categoria !== 'todos') {
    query += ' AND categoria = ?';
    params.push(categoria);
  }

  if (precio_min) {
    query += ' AND precio >= ?';
    params.push(parseFloat(precio_min));
  }

  if (precio_max) {
    query += ' AND precio <= ?';
    params.push(parseFloat(precio_max));
  }

  query += ' ORDER BY created_at DESC';

  try {
    const [productos] = await db.query(query, params);
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});


// ================================
// HU-06/HU-18/HU-21: Productos propios del vendedor para editar
// ================================
router.get('/vendedor/mis-productos', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'vendedor') {
    return res.status(403).json({ error: 'Solo los vendedores pueden ver sus productos' });
  }

  try {
    const [productos] = await db.query(
      `SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.imagen, p.categoria, p.activo,
              COUNT(DISTINCT v.id) AS total_variantes,
              COUNT(DISTINCT i.id) AS total_imagenes
       FROM productos p
       LEFT JOIN producto_variantes v ON v.producto_id = p.id
       LEFT JOIN producto_imagenes i ON i.producto_id = p.id
       WHERE p.vendedor_id = ?
       GROUP BY p.id
       ORDER BY p.id DESC`,
      [req.usuario.id]
    );

    res.json(productos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos del vendedor' });
  }
});

router.get('/vendedor/mis-productos/:id', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'vendedor') {
    return res.status(403).json({ error: 'Solo los vendedores pueden editar productos' });
  }

  try {
    const [productos] = await db.query(
      `SELECT id, nombre, descripcion, precio, stock, imagen, categoria, activo, vendedor_id
       FROM productos
       WHERE id = ? AND vendedor_id = ?`,
      [req.params.id, req.usuario.id]
    );

    if (productos.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado o no pertenece al vendedor' });
    }

    const producto = productos[0];

    const [imagenes] = await db.query(
      `SELECT id, url FROM producto_imagenes WHERE producto_id = ? ORDER BY orden ASC, id ASC`,
      [producto.id]
    );

    const [variantes] = await db.query(
      `SELECT id, talla, color, stock, activo
       FROM producto_variantes
       WHERE producto_id = ?
       ORDER BY color ASC, talla ASC, id ASC`,
      [producto.id]
    );

    producto.imagenes = imagenes;
    producto.variantes = variantes;

    res.json(producto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener producto para editar' });
  }
});

// ================================
// HU-06/HU-18/HU-21: Editar producto propio del vendedor
// ================================
router.put('/:id', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'vendedor') {
    return res.status(403).json({ error: 'Solo los vendedores pueden editar productos' });
  }

  const { nombre, descripcion, precio, stock, imagen, categoria, variantes, imagenes } = req.body;

  if (!nombre || precio === undefined || stock === undefined) {
    return res.status(400).json({ error: 'Nombre, precio y stock son obligatorios' });
  }

  if (Number(precio) <= 0) {
    return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
  }

  if (Number(stock) < 0) {
    return res.status(400).json({ error: 'El stock no puede ser negativo' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [productos] = await connection.query(
      'SELECT id FROM productos WHERE id = ? AND vendedor_id = ?',
      [req.params.id, req.usuario.id]
    );

    if (productos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Producto no encontrado o no pertenece al vendedor' });
    }

    await connection.query(
      `UPDATE productos
       SET nombre = ?, descripcion = ?, precio = ?, stock = ?, imagen = ?, categoria = ?
       WHERE id = ? AND vendedor_id = ?`,
      [
        nombre,
        descripcion || null,
        Number(precio),
        Number(stock),
        imagen || null,
        categoria || 'otros',
        req.params.id,
        req.usuario.id
      ]
    );

    await connection.query('DELETE FROM producto_imagenes WHERE producto_id = ?', [req.params.id]);

    const urlsImagenes = [];
    if (imagen) urlsImagenes.push(String(imagen).trim());
    if (Array.isArray(imagenes)) {
      for (const item of imagenes) {
        const url = typeof item === 'string' ? item.trim() : '';
        if (url) urlsImagenes.push(url);
      }
    }

    for (let i = 0; i < urlsImagenes.length; i++) {
      await connection.query(
        'INSERT INTO producto_imagenes (producto_id, url, principal, orden) VALUES (?, ?, ?, ?)',
        [req.params.id, urlsImagenes[i], i === 0, i + 1]
      );
    }

    await connection.query('DELETE FROM producto_variantes WHERE producto_id = ?', [req.params.id]);

    if (Array.isArray(variantes)) {
      for (const variante of variantes) {
        const talla = variante.talla ? String(variante.talla).trim() : null;
        const color = variante.color ? String(variante.color).trim() : null;
        const stockVariante = Number(variante.stock || 0);
        const activo = variante.activo === false || variante.activo === 0 || variante.activo === '0' ? 0 : 1;

        if (!talla && !color) continue;
        if (stockVariante < 0) continue;

        await connection.query(
          `INSERT INTO producto_variantes (producto_id, talla, color, stock, activo)
           VALUES (?, ?, ?, ?, ?)`,
          [req.params.id, talla, color, stockVariante, activo]
        );
      }
    }

    await connection.commit();

    res.json({ mensaje: 'Producto actualizado correctamente' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  } finally {
    connection.release();
  }
});

// ================================
// HU-15 + HU-18: Ver detalle completo del producto
// ================================
router.get('/:id', async (req, res) => {
  const productoId = req.params.id;

  try {
    const [productos] = await db.query(
      `SELECT id, nombre, descripcion, precio, stock, imagen, categoria
       FROM productos
       WHERE id = ? AND activo = true`,
      [productoId]
    );

    if (productos.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const producto = productos[0];

    const [imagenes] = await db.query(
      `SELECT id, url, orden
       FROM producto_imagenes
       WHERE producto_id = ?
       ORDER BY orden ASC, id ASC`,
      [productoId]
    );

    const [variantes] = await db.query(
      `SELECT id, talla, color, stock, activo
       FROM producto_variantes
       WHERE producto_id = ?
       ORDER BY color ASC, talla ASC`,
      [productoId]
    );

    // El frontend espera un arreglo simple de URLs para pintar la galería.
    producto.imagenes = imagenes.map(img => img.url);

    // Solo se muestran como disponibles las variantes activas y con stock.
    producto.variantes = variantes;
    const variantesDisponibles = variantes.filter(v => v.activo && Number(v.stock) > 0);
    producto.tallas = [...new Set(variantesDisponibles.map(v => v.talla).filter(Boolean))];
    producto.colores = [...new Set(variantesDisponibles.map(v => v.color).filter(Boolean))];

    res.json(producto);
  } catch (error) {
    console.error('Error al obtener detalle:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// ================================
// HU-06 + HU-18: Registrar producto con imágenes y variantes
// ================================
router.post(
  '/',
  verificarToken,
  permitirRoles('vendedor'),
  async (req, res) => {
    const {
      nombre,
      descripcion,
      precio,
      stock,
      imagen,
      categoria,
      imagenes,
      variantes
    } = req.body;

    if (!nombre || precio === undefined || stock === undefined) {
      return res.status(400).json({
        error: 'Nombre, precio y stock son obligatorios'
      });
    }

    if (Number(precio) <= 0) {
      return res.status(400).json({
        error: 'El precio debe ser mayor a 0'
      });
    }

    if (Number(stock) < 0) {
      return res.status(400).json({
        error: 'El stock no puede ser negativo'
      });
    }

    const conexion = await db.getConnection();

    try {
      await conexion.beginTransaction();

      const [resultado] = await conexion.query(
        `INSERT INTO productos 
         (nombre, descripcion, precio, stock, imagen, categoria, vendedor_id, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, true)`,
        [
          nombre,
          descripcion || null,
          Number(precio),
          Number(stock),
          imagen || null,
          categoria || 'otros',
          req.usuario.id
        ]
      );

      const productoId = resultado.insertId;

      if (imagen) {
        await conexion.query(
          `INSERT INTO producto_imagenes (producto_id, url, principal, orden)
           VALUES (?, ?, true, 1)`,
          [productoId, imagen]
        );
      }

      if (Array.isArray(imagenes)) {
        for (let i = 0; i < imagenes.length; i++) {
          if (imagenes[i]) {
            await conexion.query(
              `INSERT INTO producto_imagenes (producto_id, url, principal, orden)
               VALUES (?, ?, false, ?)`,
              [productoId, imagenes[i], i + 2]
            );
          }
        }
      }

      if (Array.isArray(variantes) && variantes.length > 0) {
        for (const variante of variantes) {
          await conexion.query(
            `INSERT INTO producto_variantes (producto_id, talla, color, stock, activo)
             VALUES (?, ?, ?, ?, true)`,
            [
              productoId,
              variante.talla || null,
              variante.color || null,
              Number(variante.stock || 0)
            ]
          );
        }
      }

      await conexion.commit();

      res.status(201).json({
        message: 'Producto registrado exitosamente',
        producto_id: productoId
      });
    } catch (error) {
      await conexion.rollback();
      console.error('Error al registrar producto:', error);
      res.status(500).json({ error: 'Error al registrar producto' });
    } finally {
      conexion.release();
    }
  }
);

// ================================
// HU-18: Agregar variante a producto
// ================================
router.post(
  '/:id/variantes',
  verificarToken,
  permitirRoles('vendedor'),
  async (req, res) => {
    const { talla, color, stock } = req.body;
    const productoId = req.params.id;

    if (stock === undefined || Number(stock) < 0) {
      return res.status(400).json({
        error: 'El stock de la variante es obligatorio y no puede ser negativo'
      });
    }

    try {
      const [productos] = await db.query(
        `SELECT id, vendedor_id FROM productos WHERE id = ?`,
        [productoId]
      );

      if (productos.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      if (
        req.usuario.rol === 'vendedor' &&
        Number(productos[0].vendedor_id) !== Number(req.usuario.id)
      ) {
        return res.status(403).json({
          error: 'Solo puedes gestionar variantes de tus propios productos'
        });
      }

      await db.query(
        `INSERT INTO producto_variantes (producto_id, talla, color, stock, activo)
         VALUES (?, ?, ?, ?, true)`,
        [productoId, talla || null, color || null, Number(stock)]
      );

      res.status(201).json({ message: 'Variante registrada correctamente' });
    } catch (error) {
      console.error('Error al registrar variante:', error);
      res.status(500).json({ error: 'Error al registrar variante' });
    }
  }
);

// ================================
// HU-19: Activar / desactivar variante
// ================================
router.put(
  '/variantes/:id/estado',
  verificarToken,
  permitirRoles('vendedor'),
  async (req, res) => {
    const varianteId = req.params.id;
    const { activo } = req.body;

    if (activo === undefined) {
      return res.status(400).json({
        error: 'El estado activo es obligatorio'
      });
    }

    try {
      const [variantes] = await db.query(
        `SELECT v.id, p.vendedor_id
         FROM producto_variantes v
         JOIN productos p ON p.id = v.producto_id
         WHERE v.id = ?`,
        [varianteId]
      );

      if (variantes.length === 0) {
        return res.status(404).json({ error: 'Variante no encontrada' });
      }

      if (
        req.usuario.rol === 'vendedor' &&
        Number(variantes[0].vendedor_id) !== Number(req.usuario.id)
      ) {
        return res.status(403).json({
          error: 'Solo puedes cambiar variantes de tus propios productos'
        });
      }

      await db.query(
        `UPDATE producto_variantes SET activo = ? WHERE id = ?`,
        [Boolean(activo), varianteId]
      );

      res.json({ message: 'Estado de variante actualizado correctamente' });
    } catch (error) {
      console.error('Error al actualizar variante:', error);
      res.status(500).json({ error: 'Error al actualizar variante' });
    }
  }
);

// ================================
// HU-20: Obtener comentarios de producto
// ================================
router.get('/:id/comentarios', async (req, res) => {
  try {
    const [comentarios] = await db.query(
      `SELECT 
          c.id,
          c.calificacion,
          c.comentario,
          c.created_at,
          u.nombre AS usuario
       FROM producto_comentarios c
       JOIN usuarios u ON u.id = c.usuario_id
       WHERE c.producto_id = ?
       ORDER BY c.created_at DESC`,
      [req.params.id]
    );

    res.json(comentarios);
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

// ================================
// HU-20: Registrar comentario y calificación
// Solo comprador
// ================================
router.post(
  '/:id/comentarios',
  verificarToken,
  permitirRoles('comprador'),
  async (req, res) => {
    const { calificacion, comentario } = req.body;

    if (!comentario || comentario.trim() === '') {
      return res.status(400).json({
        error: 'El comentario es obligatorio'
      });
    }

    const estrellas = Number(calificacion);

    if (estrellas < 1 || estrellas > 5) {
      return res.status(400).json({
        error: 'La calificación debe ser de 1 a 5 estrellas'
      });
    }

    try {
      await db.query(
        `INSERT INTO producto_comentarios 
         (producto_id, usuario_id, calificacion, comentario)
         VALUES (?, ?, ?, ?)`,
        [
          req.params.id,
          req.usuario.id,
          estrellas,
          comentario.trim()
        ]
      );

      res.status(201).json({
        message: 'Comentario registrado correctamente'
      });
    } catch (error) {
      console.error('Error al registrar comentario:', error);
      res.status(500).json({ error: 'Error al registrar comentario' });
    }
  }
);

module.exports = router;