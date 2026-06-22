const express = require('express');
const router = express.Router();
const db = require('../db');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

const ESTADOS_VALIDOS_VENTA = "p.estado NOT IN ('cancelado')";

router.get('/vendedor', verificarToken, permitirRoles('vendedor'), async (req, res) => {
  const vendedorId = req.usuario.id;

  try {
    const [[metricas]] = await db.query(`
      SELECT
        COALESCE(SUM(pd.cantidad * pd.precio_unit), 0) AS total_vendido,
        COUNT(DISTINCT p.id) AS total_pedidos,
        COUNT(DISTINCT CASE WHEN p.estado = 'pendiente' THEN p.id END) AS pedidos_pendientes,
        COUNT(DISTINCT CASE WHEN p.estado = 'en_proceso' THEN p.id END) AS pedidos_en_proceso,
        COUNT(DISTINCT CASE WHEN p.estado = 'enviado' THEN p.id END) AS pedidos_enviados,
        COUNT(DISTINCT CASE WHEN p.estado = 'entregado' THEN p.id END) AS pedidos_entregados
      FROM pedidos p
      INNER JOIN pedido_detalle pd ON p.id = pd.pedido_id
      INNER JOIN productos pr ON pd.producto_id = pr.id
      WHERE pr.vendedor_id = ? AND ${ESTADOS_VALIDOS_VENTA}
    `, [vendedorId]);

    const [productosMasVendidos] = await db.query(`
      SELECT
        pr.id,
        pr.nombre,
        pr.imagen,
        SUM(pd.cantidad) AS cantidad_vendida,
        SUM(pd.cantidad * pd.precio_unit) AS total_vendido
      FROM pedido_detalle pd
      INNER JOIN pedidos p ON pd.pedido_id = p.id
      INNER JOIN productos pr ON pd.producto_id = pr.id
      WHERE pr.vendedor_id = ? AND ${ESTADOS_VALIDOS_VENTA}
      GROUP BY pr.id, pr.nombre, pr.imagen
      ORDER BY cantidad_vendida DESC, total_vendido DESC
      LIMIT 5
    `, [vendedorId]);

    const [stockBajoProductos] = await db.query(`
      SELECT id, nombre, stock, categoria, 'producto' AS tipo
      FROM productos
      WHERE vendedor_id = ? AND activo = TRUE AND stock <= 3
      ORDER BY stock ASC
      LIMIT 10
    `, [vendedorId]);

    const [stockBajoVariantes] = await db.query(`
      SELECT
        pr.id,
        CONCAT(pr.nombre, ' - ', COALESCE(v.color, 'Sin color'), ' / ', COALESCE(v.talla, 'Sin talla')) AS nombre,
        v.stock,
        pr.categoria,
        'variante' AS tipo
      FROM producto_variantes v
      INNER JOIN productos pr ON v.producto_id = pr.id
      WHERE pr.vendedor_id = ? AND pr.activo = TRUE AND v.activo = TRUE AND v.stock <= 2
      ORDER BY v.stock ASC
      LIMIT 10
    `, [vendedorId]);

    res.json({
      metricas,
      productos_mas_vendidos: productosMasVendidos,
      stock_bajo: [...stockBajoProductos, ...stockBajoVariantes].slice(0, 10)
    });
  } catch (error) {
    console.error('Error al obtener reporte del vendedor:', error);
    res.status(500).json({ error: 'Error al obtener reporte del vendedor' });
  }
});

router.get('/admin', verificarToken, permitirRoles('admin'), async (req, res) => {
  try {
    const [[usuarios]] = await db.query(`
      SELECT
        COUNT(*) AS total_usuarios,
        SUM(rol = 'comprador') AS compradores,
        SUM(rol = 'vendedor') AS vendedores,
        SUM(rol = 'admin') AS administradores,
        SUM(activo = TRUE) AS usuarios_activos
      FROM usuarios
    `);

    const [[catalogo]] = await db.query(`
      SELECT
        COUNT(*) AS total_productos,
        SUM(activo = TRUE) AS productos_activos,
        COALESCE(SUM(stock), 0) AS stock_total
      FROM productos
    `);

    const [[ventas]] = await db.query(`
      SELECT
        COUNT(*) AS total_pedidos,
        COALESCE(SUM(CASE WHEN estado <> 'cancelado' THEN total ELSE 0 END), 0) AS ingresos_totales,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) AS pedidos_pendientes,
        COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END) AS pedidos_en_proceso,
        COUNT(CASE WHEN estado = 'enviado' THEN 1 END) AS pedidos_enviados,
        COUNT(CASE WHEN estado = 'entregado' THEN 1 END) AS pedidos_entregados,
        COUNT(CASE WHEN estado = 'cancelado' THEN 1 END) AS pedidos_cancelados
      FROM pedidos
    `);

    const [pedidosPorEstado] = await db.query(`
      SELECT estado, COUNT(*) AS total
      FROM pedidos
      GROUP BY estado
      ORDER BY total DESC
    `);

    const [topVendedores] = await db.query(`
      SELECT
        u.id,
        u.nombre,
        u.correo,
        COUNT(DISTINCT p.id) AS pedidos,
        COALESCE(SUM(pd.cantidad * pd.precio_unit), 0) AS ventas
      FROM usuarios u
      INNER JOIN productos pr ON u.id = pr.vendedor_id
      INNER JOIN pedido_detalle pd ON pr.id = pd.producto_id
      INNER JOIN pedidos p ON pd.pedido_id = p.id
      WHERE u.rol = 'vendedor' AND p.estado <> 'cancelado'
      GROUP BY u.id, u.nombre, u.correo
      ORDER BY ventas DESC
      LIMIT 5
    `);

    res.json({ usuarios, catalogo, ventas, pedidos_por_estado: pedidosPorEstado, top_vendedores: topVendedores });
  } catch (error) {
    console.error('Error al obtener reporte admin:', error);
    res.status(500).json({ error: 'Error al obtener reporte administrativo' });
  }
});

module.exports = router;
