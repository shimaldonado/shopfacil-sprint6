const express = require('express');
const router = express.Router();
const db = require('../db');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

const METODOS_PAGO_VALIDOS = ['contra_entrega', 'transferencia', 'tarjeta_simulada'];
const ESTADOS_PEDIDO = ['pendiente', 'en_proceso', 'enviado', 'entregado', 'cancelacion_solicitada', 'cancelado'];
const FLUJO_ESTADOS = {
  pendiente: 'en_proceso',
  en_proceso: 'enviado',
  enviado: 'entregado'
};

function limpiarTexto(valor) {
  return String(valor || '').trim();
}

function metodoPagoTexto(metodo) {
  const textos = {
    contra_entrega: 'Pago contra entrega',
    transferencia: 'Transferencia bancaria',
    tarjeta_simulada: 'Tarjeta simulada'
  };
  return textos[metodo] || metodo || 'No registrado';
}

function estadoTexto(estado) {
  const textos = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    enviado: 'Enviado',
    entregado: 'Entregado',
    cancelacion_solicitada: 'Cancelación solicitada',
    cancelado: 'Cancelado'
  };
  return textos[estado] || estado || 'Pendiente';
}

function coordenadaValida(valor, min, max) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < min || numero > max) return undefined;
  return numero;
}

function validarCheckout(body) {
  const entrega = body.entrega || {};
  const metodoPago = limpiarTexto(body.metodo_pago);
  const tarjeta = body.tarjeta_simulada || {};
  const transferencia = body.transferencia_simulada || {};

  const provincia = limpiarTexto(entrega.provincia);
  const ciudad = limpiarTexto(entrega.ciudad);
  const direccion = limpiarTexto(entrega.direccion);
  const referencia = limpiarTexto(entrega.referencia);
  const latitud = coordenadaValida(entrega.latitud, -90, 90);
  const longitud = coordenadaValida(entrega.longitud, -180, 180);

  if (latitud === undefined || longitud === undefined) {
    return { error: 'La ubicación seleccionada no es válida' };
  }

  if (!provincia || !ciudad || !direccion || !referencia) {
    return { error: 'Completa provincia, ciudad, dirección y referencia de entrega' };
  }

  if (!METODOS_PAGO_VALIDOS.includes(metodoPago)) {
    return { error: 'Selecciona un método de pago válido' };
  }

  let bancoTransferencia = null;
  let comprobanteTransferencia = null;

  if (metodoPago === 'transferencia') {
    bancoTransferencia = limpiarTexto(transferencia.banco) || null;
    comprobanteTransferencia = limpiarTexto(transferencia.comprobante);

    if (!comprobanteTransferencia || comprobanteTransferencia.length < 4) {
      return { error: 'Ingresa el número de comprobante de la transferencia simulada' };
    }
  }

  if (metodoPago === 'tarjeta_simulada') {
    const titular = limpiarTexto(tarjeta.titular);
    const numero = limpiarTexto(tarjeta.numero).replace(/\s+/g, '');
    const expiracion = limpiarTexto(tarjeta.expiracion);
    const cvv = limpiarTexto(tarjeta.cvv);

    if (!titular || !/^\d{12,19}$/.test(numero) || !/^\d{2}\/\d{2}$/.test(expiracion) || !/^\d{3,4}$/.test(cvv)) {
      return { error: 'Completa correctamente los datos de la tarjeta simulada' };
    }
  }

  return {
    data: {
      provincia,
      ciudad,
      direccion,
      referencia,
      latitud,
      longitud,
      metodoPago,
      bancoTransferencia,
      comprobanteTransferencia
    }
  };
}

async function registrarSeguimiento(conexion, pedidoId, estado, descripcion) {
  await conexion.query(
    `INSERT INTO pedido_estado_historial (pedido_id, estado, descripcion)
     VALUES (?, ?, ?)`,
    [pedidoId, estado, descripcion || estadoTexto(estado)]
  );
}

async function crearNotificacion(conexion, usuarioId, pedidoId, titulo, mensaje, tipo = 'pedido') {
  await conexion.query(
    `INSERT INTO notificaciones (usuario_id, pedido_id, titulo, mensaje, tipo)
     VALUES (?, ?, ?, ?, ?)`,
    [usuarioId, pedidoId, titulo, mensaje, tipo]
  );
}

async function adjuntarSeguimiento(pedidos) {
  if (!Array.isArray(pedidos) || pedidos.length === 0) return pedidos;

  const ids = pedidos.map(p => p.id);
  const [historial] = await db.query(
    `SELECT pedido_id, estado, descripcion, created_at
     FROM pedido_estado_historial
     WHERE pedido_id IN (?)
     ORDER BY created_at ASC`,
    [ids]
  );

  const mapa = new Map();
  historial.forEach(item => {
    if (!mapa.has(item.pedido_id)) mapa.set(item.pedido_id, []);
    mapa.get(item.pedido_id).push(item);
  });

  return pedidos.map(p => ({
    ...p,
    metodo_pago_texto: metodoPagoTexto(p.metodo_pago),
    seguimiento: mapa.get(p.id) || []
  }));
}

async function obtenerVendedoresPedido(conexion, pedidoId) {
  const [rows] = await conexion.query(
    `SELECT DISTINCT pr.vendedor_id
     FROM pedido_detalle pd
     INNER JOIN productos pr ON pd.producto_id = pr.id
     WHERE pd.pedido_id = ? AND pr.vendedor_id IS NOT NULL`,
    [pedidoId]
  );
  return rows.map(r => r.vendedor_id);
}

// ================================
// HU-09 + HU-22/HU-23: Confirmar pedido con dirección y pago simulado
// HU-29: Registrar primer evento del seguimiento
// ================================
router.post('/confirmar', verificarToken, permitirRoles('comprador'), async (req, res) => {
  const usuarioId = req.usuario.id;
  const validacion = validarCheckout(req.body || {});

  if (validacion.error) {
    return res.status(400).json({ error: validacion.error });
  }

  const { provincia, ciudad, direccion, referencia, latitud, longitud, metodoPago, bancoTransferencia, comprobanteTransferencia } = validacion.data;
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    const [items] = await conexion.query(
      `SELECT 
        c.cantidad,
        c.variante_id,
        p.id AS producto_id,
        p.nombre,
        p.precio,
        p.stock AS stock_producto,
        v.stock AS stock_variante,
        v.activo AS variante_activa,
        v.talla,
        v.color,
        IFNULL(v.stock, p.stock) AS stock
      FROM carrito c
      INNER JOIN productos p ON c.producto_id = p.id
      LEFT JOIN producto_variantes v ON c.variante_id = v.id
      WHERE c.usuario_id = ?
      FOR UPDATE`,
      [usuarioId]
    );

    if (items.length === 0) {
      await conexion.rollback();
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    for (const item of items) {
      if (item.variante_id && !item.variante_activa) {
        await conexion.rollback();
        return res.status(400).json({ error: `La variante seleccionada de ${item.nombre} ya no está disponible` });
      }

      if (item.cantidad > item.stock) {
        await conexion.rollback();
        return res.status(400).json({ error: `Stock insuficiente para ${item.nombre}` });
      }
    }

    const total = items.reduce((sum, item) => sum + parseFloat(item.precio) * item.cantidad, 0);

    const [pedidoResult] = await conexion.query(
      `INSERT INTO pedidos 
       (comprador_id, total, provincia_entrega, ciudad_entrega, direccion_entrega, referencia_entrega, latitud_entrega, longitud_entrega, metodo_pago, banco_transferencia, comprobante_transferencia, estado_pago)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'simulado_aprobado')`,
      [usuarioId, total.toFixed(2), provincia, ciudad, direccion, referencia, latitud, longitud, metodoPago, bancoTransferencia, comprobanteTransferencia]
    );

    const pedidoId = pedidoResult.insertId;
    const codigo = `ORD-2026-${String(pedidoId).padStart(4, '0')}`;

    await conexion.query(`UPDATE pedidos SET codigo = ? WHERE id = ?`, [codigo, pedidoId]);

    for (const item of items) {
      await conexion.query(
        `INSERT INTO pedido_detalle (pedido_id, producto_id, variante_id, cantidad, precio_unit) 
         VALUES (?, ?, ?, ?, ?)`,
        [pedidoId, item.producto_id, item.variante_id || null, item.cantidad, item.precio]
      );

      await conexion.query(`UPDATE productos SET stock = stock - ? WHERE id = ?`, [item.cantidad, item.producto_id]);

      if (item.variante_id) {
        await conexion.query(`UPDATE producto_variantes SET stock = stock - ? WHERE id = ?`, [item.cantidad, item.variante_id]);
      }
    }

    await registrarSeguimiento(conexion, pedidoId, 'pendiente', 'Pedido confirmado por el comprador');
    await conexion.query(`DELETE FROM carrito WHERE usuario_id = ?`, [usuarioId]);

    await conexion.commit();

    res.status(201).json({
      message: 'Pedido confirmado exitosamente',
      pedido_id: pedidoId,
      codigo,
      total: total.toFixed(2),
      entrega: { provincia, ciudad, direccion, referencia, latitud, longitud },
      metodo_pago: metodoPago,
      metodo_pago_texto: metodoPagoTexto(metodoPago),
      transferencia: { banco: bancoTransferencia, comprobante: comprobanteTransferencia },
      productos: items.map(item => ({ nombre: item.nombre, cantidad: item.cantidad, precio: item.precio, talla: item.talla, color: item.color }))
    });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al confirmar pedido:', error);

    const detalleTecnico = error.sqlMessage || error.message || '';
    let mensajeUsuario = 'No se pudo confirmar el pedido';

    if (detalleTecnico.includes('Unknown column')) {
      mensajeUsuario = 'Falta actualizar la base de datos. Reinicia Docker para aplicar las migraciones del Sprint 5.';
    } else if (detalleTecnico.includes('Data too long')) {
      mensajeUsuario = 'Uno de los campos ingresados es demasiado largo';
    } else if (detalleTecnico.includes('foreign key')) {
      mensajeUsuario = 'Uno de los productos o variantes del carrito ya no está disponible';
    }

    res.status(500).json({ error: mensajeUsuario, detalle: detalleTecnico || 'Revisa conexión con la base de datos y stock disponible.' });
  } finally {
    conexion.release();
  }
});

// ================================
// HU-04 / HU-29: Mis pedidos comprador con seguimiento
// ================================
router.get('/mis-pedidos', verificarToken, async (req, res) => {
  const usuarioId = req.usuario.id;

  try {
    const [pedidos] = await db.query(
      `SELECT 
        p.id,
        p.codigo,
        p.total,
        p.estado,
        p.provincia_entrega,
        p.ciudad_entrega,
        p.direccion_entrega,
        p.referencia_entrega,
        p.latitud_entrega,
        p.longitud_entrega,
        p.metodo_pago,
        p.banco_transferencia,
        p.comprobante_transferencia,
        p.estado_pago,
        p.created_at,
        GROUP_CONCAT(
          CONCAT(
            pr.nombre,
            CASE
              WHEN v.id IS NOT NULL THEN CONCAT(' - ', COALESCE(v.color, 'Sin color'), ' / ', COALESCE(v.talla, 'Sin talla'))
              ELSE ''
            END,
            ' x', pd.cantidad
          )
          SEPARATOR ', '
        ) AS productos
      FROM pedidos p
      INNER JOIN pedido_detalle pd ON p.id = pd.pedido_id
      INNER JOIN productos pr ON pd.producto_id = pr.id
      LEFT JOIN producto_variantes v ON pd.variante_id = v.id
      WHERE p.comprador_id = ?
      GROUP BY p.id, p.codigo, p.total, p.estado, p.provincia_entrega, p.ciudad_entrega, p.direccion_entrega, p.referencia_entrega, p.latitud_entrega, p.longitud_entrega, p.metodo_pago, p.banco_transferencia, p.comprobante_transferencia, p.estado_pago, p.created_at
      ORDER BY p.created_at DESC`,
      [usuarioId]
    );

    res.json(await adjuntarSeguimiento(pedidos));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// ================================
// HU-10 / HU-29: Pedidos para vendedor con seguimiento
// ================================
router.get('/todos', verificarToken, permitirRoles('vendedor'), async (req, res) => {
  const vendedorId = req.usuario.id;

  try {
    const [pedidos] = await db.query(
      `SELECT 
        p.id,
        p.codigo,
        SUM(pd.cantidad * pd.precio_unit) AS total,
        p.estado,
        p.provincia_entrega,
        p.ciudad_entrega,
        p.direccion_entrega,
        p.referencia_entrega,
        p.latitud_entrega,
        p.longitud_entrega,
        p.metodo_pago,
        p.banco_transferencia,
        p.comprobante_transferencia,
        p.estado_pago,
        p.created_at,
        u.nombre AS comprador,
        u.correo AS comprador_correo,
        GROUP_CONCAT(
          CONCAT(
            pr.nombre,
            CASE
              WHEN v.id IS NOT NULL THEN CONCAT(' - ', COALESCE(v.color, 'Sin color'), ' / ', COALESCE(v.talla, 'Sin talla'))
              ELSE ''
            END,
            ' x', pd.cantidad
          )
          SEPARATOR ', '
        ) AS productos
      FROM pedidos p
      INNER JOIN usuarios u ON p.comprador_id = u.id
      INNER JOIN pedido_detalle pd ON p.id = pd.pedido_id
      INNER JOIN productos pr ON pd.producto_id = pr.id
      LEFT JOIN producto_variantes v ON pd.variante_id = v.id
      WHERE pr.vendedor_id = ?
      GROUP BY p.id, p.codigo, p.estado, p.provincia_entrega, p.ciudad_entrega, p.direccion_entrega, p.referencia_entrega, p.latitud_entrega, p.longitud_entrega, p.metodo_pago, p.banco_transferencia, p.comprobante_transferencia, p.estado_pago, p.created_at, u.nombre, u.correo
      ORDER BY p.created_at DESC`,
      [vendedorId]
    );

    res.json(await adjuntarSeguimiento(pedidos));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener pedidos del vendedor' });
  }
});

// ================================
// HU-29 / HU-26: Actualizar estado con flujo + notificación
// ================================
router.put('/estado/:id', verificarToken, permitirRoles('vendedor'), async (req, res) => {
  const vendedorId = req.usuario.id;
  const pedidoId = req.params.id;
  const { estado } = req.body;

  if (!ESTADOS_PEDIDO.includes(estado) || ['cancelacion_solicitada', 'cancelado'].includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido para actualización normal' });
  }

  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    const [actual] = await conexion.query(
      `SELECT DISTINCT p.id, p.estado, p.comprador_id, p.codigo, p.total
       FROM pedidos p
       INNER JOIN pedido_detalle pd ON p.id = pd.pedido_id
       INNER JOIN productos pr ON pd.producto_id = pr.id
       WHERE p.id = ? AND pr.vendedor_id = ?
       LIMIT 1
       FOR UPDATE`,
      [pedidoId, vendedorId]
    );

    if (actual.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ error: 'Pedido no encontrado para este vendedor' });
    }

    const pedido = actual[0];

    if (['cancelacion_solicitada', 'cancelado'].includes(pedido.estado)) {
      await conexion.rollback();
      return res.status(400).json({ error: 'Este pedido tiene una solicitud de cancelación o ya fue cancelado' });
    }

    const siguienteEstado = FLUJO_ESTADOS[pedido.estado];

    if (siguienteEstado !== estado) {
      await conexion.rollback();
      return res.status(400).json({ error: `El siguiente estado válido es: ${siguienteEstado ? estadoTexto(siguienteEstado) : 'ninguno, el pedido ya fue entregado'}` });
    }

    await conexion.query(`UPDATE pedidos SET estado = ? WHERE id = ?`, [estado, pedidoId]);
    await registrarSeguimiento(conexion, pedidoId, estado, `Pedido actualizado a ${estadoTexto(estado)}`);
    await crearNotificacion(
      conexion,
      pedido.comprador_id,
      pedidoId,
      'Estado de pedido actualizado',
      `Tu pedido ${pedido.codigo || '#' + pedidoId} cambió a: ${estadoTexto(estado)}.`,
      'estado_pedido'
    );

    await conexion.commit();

    res.json({ message: 'Estado actualizado correctamente', estado });
  } catch (error) {
    await conexion.rollback();
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar estado' });
  } finally {
    conexion.release();
  }
});

// ================================
// HU-27: Comprador solicita cancelación si el pedido está pendiente
// ================================
router.post('/:id/solicitar-cancelacion', verificarToken, permitirRoles('comprador'), async (req, res) => {
  const pedidoId = req.params.id;
  const compradorId = req.usuario.id;
  const motivo = limpiarTexto(req.body.motivo) || 'Solicitud realizada por el comprador';
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    const [pedidos] = await conexion.query(
      `SELECT id, codigo, estado
       FROM pedidos
       WHERE id = ? AND comprador_id = ?
       LIMIT 1
       FOR UPDATE`,
      [pedidoId, compradorId]
    );

    if (pedidos.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pedido = pedidos[0];

    if (pedido.estado !== 'pendiente') {
      await conexion.rollback();
      return res.status(400).json({ error: 'Solo puedes solicitar cancelación cuando el pedido está pendiente' });
    }

    await conexion.query(`UPDATE pedidos SET estado = 'cancelacion_solicitada' WHERE id = ?`, [pedidoId]);
    await registrarSeguimiento(conexion, pedidoId, 'cancelacion_solicitada', `Cancelación solicitada: ${motivo}`);

    const vendedores = await obtenerVendedoresPedido(conexion, pedidoId);
    for (const vendedorId of vendedores) {
      await crearNotificacion(
        conexion,
        vendedorId,
        pedidoId,
        'Solicitud de cancelación recibida',
        `El comprador solicitó cancelar el pedido ${pedido.codigo || '#' + pedidoId}.`,
        'cancelacion'
      );
    }

    await conexion.commit();
    res.json({ message: 'Solicitud de cancelación enviada', estado: 'cancelacion_solicitada' });
  } catch (error) {
    await conexion.rollback();
    console.error(error);
    res.status(500).json({ error: 'Error al solicitar cancelación' });
  } finally {
    conexion.release();
  }
});

// ================================
// HU-27: Vendedor aprueba o rechaza cancelación
// ================================
router.put('/:id/cancelacion', verificarToken, permitirRoles('vendedor'), async (req, res) => {
  const pedidoId = req.params.id;
  const vendedorId = req.usuario.id;
  const accion = limpiarTexto(req.body.accion);

  if (!['aprobar', 'rechazar'].includes(accion)) {
    return res.status(400).json({ error: 'Acción no válida' });
  }

  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    const [pedidos] = await conexion.query(
      `SELECT DISTINCT p.id, p.estado, p.comprador_id, p.codigo, p.total
       FROM pedidos p
       INNER JOIN pedido_detalle pd ON p.id = pd.pedido_id
       INNER JOIN productos pr ON pd.producto_id = pr.id
       WHERE p.id = ? AND pr.vendedor_id = ?
       LIMIT 1
       FOR UPDATE`,
      [pedidoId, vendedorId]
    );

    if (pedidos.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ error: 'Pedido no encontrado para este vendedor' });
    }

    const pedido = pedidos[0];

    if (pedido.estado !== 'cancelacion_solicitada') {
      await conexion.rollback();
      return res.status(400).json({ error: 'Este pedido no tiene una solicitud de cancelación pendiente' });
    }

    if (accion === 'aprobar') {
      const [detalles] = await conexion.query(
        `SELECT producto_id, variante_id, cantidad
         FROM pedido_detalle
         WHERE pedido_id = ?`,
        [pedidoId]
      );

      for (const item of detalles) {
        await conexion.query(`UPDATE productos SET stock = stock + ? WHERE id = ?`, [item.cantidad, item.producto_id]);
        if (item.variante_id) {
          await conexion.query(`UPDATE producto_variantes SET stock = stock + ? WHERE id = ?`, [item.cantidad, item.variante_id]);
        }
      }

      await conexion.query(`UPDATE pedidos SET estado = 'cancelado' WHERE id = ?`, [pedidoId]);
      const totalPedido = Number(pedido.total || 0);
      const valorRetenido = Number((totalPedido * 0.10).toFixed(2));
      const valorReembolso = Number((totalPedido - valorRetenido).toFixed(2));

      await registrarSeguimiento(
        conexion,
        pedidoId,
        'cancelado',
        `Cancelación aprobada por el vendedor. Reembolso simulado: $${valorReembolso.toFixed(2)}. Retención administrativa: $${valorRetenido.toFixed(2)}.`
      );
      await crearNotificacion(
        conexion,
        pedido.comprador_id,
        pedidoId,
        'Cancelación aprobada',
        `Tu solicitud de cancelación del pedido ${pedido.codigo || '#' + pedidoId} fue aprobada. Reembolso simulado: $${valorReembolso.toFixed(2)}. Retención administrativa por gestión: $${valorRetenido.toFixed(2)}.`,
        'cancelacion'
      );

      await conexion.commit();
      return res.json({ message: `Cancelación aprobada. Reembolso simulado: $${valorReembolso.toFixed(2)}.`, estado: 'cancelado', reembolso_simulado: valorReembolso, retencion_simulada: valorRetenido });
    }

    await conexion.query(`UPDATE pedidos SET estado = 'pendiente' WHERE id = ?`, [pedidoId]);
    await registrarSeguimiento(conexion, pedidoId, 'pendiente', 'Cancelación rechazada por el vendedor. El pedido continúa pendiente.');
    await crearNotificacion(
      conexion,
      pedido.comprador_id,
      pedidoId,
      'Cancelación rechazada',
      `Tu solicitud de cancelación del pedido ${pedido.codigo || '#' + pedidoId} fue rechazada. El pedido continúa pendiente.`,
      'cancelacion'
    );

    await conexion.commit();
    res.json({ message: 'Cancelación rechazada', estado: 'pendiente' });
  } catch (error) {
    await conexion.rollback();
    console.error(error);
    res.status(500).json({ error: 'Error al procesar cancelación' });
  } finally {
    conexion.release();
  }
});

module.exports = router;
