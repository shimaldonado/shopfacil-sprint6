const API_PEDIDOS = window.SHOPFACIL_API_URL || 'http://localhost:3000/api';

window.onload = function () {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const token = localStorage.getItem('token');

  if (!usuario || !token) {
    alert('Debes iniciar sesión para ver tus pedidos');
    window.location.href = 'login.html';
    return;
  }

  cargarPedidos();
};

function mostrarAviso(mensaje, tipo = 'info', subtexto = '') {
  if (typeof sfToast === 'function') {
    sfToast(mensaje, tipo, subtexto);
  } else {
    alert(mensaje + (subtexto ? '\n' + subtexto : ''));
  }
}

function escaparHTML(texto) {
  return String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function metodoPagoTexto(metodo) {
  const textos = {
    contra_entrega: 'Pago contra entrega',
    transferencia: 'Transferencia bancaria',
    tarjeta_simulada: 'Tarjeta simulada'
  };
  return textos[metodo] || 'No registrado';
}

function estadoTexto(estado) {
  const textos = {
    pendiente: '⏳ Pendiente',
    en_proceso: '🔄 En proceso',
    enviado: '🚚 Enviado',
    entregado: '✅ Entregado',
    cancelacion_solicitada: '🟠 Cancelación solicitada',
    cancelado: '❌ Cancelado'
  };

  return textos[estado] || estado;
}

function construirDireccionEntrega(pedido) {
  return [
    pedido.direccion_entrega,
    pedido.ciudad_entrega,
    pedido.provincia_entrega,
    'Ecuador'
  ]
    .filter(Boolean)
    .map(parte => String(parte).trim())
    .filter(Boolean)
    .join(', ');
}

function enlaceMapaEntrega(pedido) {
  if (pedido.latitud_entrega && pedido.longitud_entrega) {
    return `https://www.google.com/maps?q=${encodeURIComponent(pedido.latitud_entrega)},${encodeURIComponent(pedido.longitud_entrega)}`;
  }

  const direccion = construirDireccionEntrega(pedido);
  if (!direccion || direccion === 'Ecuador') return '';

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}

function formatearFecha(fecha) {
  if (!fecha) return 'No disponible';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return 'No disponible';
  return d.toLocaleString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderSeguimiento(pedido) {
  const estadosBase = ['pendiente', 'en_proceso', 'enviado', 'entregado'];
  const seguimiento = Array.isArray(pedido.seguimiento) ? pedido.seguimiento : [];
  const estadosRealizados = new Set(seguimiento.map(item => item.estado));

  if (pedido.estado === 'cancelacion_solicitada') estadosRealizados.add('cancelacion_solicitada');
  if (pedido.estado === 'cancelado') estadosRealizados.add('cancelado');

  const htmlBase = estadosBase.map(estado => {
    const activo = estadosRealizados.has(estado) || estadosBase.indexOf(estado) <= estadosBase.indexOf(pedido.estado);
    const evento = seguimiento.find(item => item.estado === estado);
    return `
      <div class="tracking-step ${activo ? 'activo' : ''}">
        <div class="tracking-dot"></div>
        <div>
          <strong>${estadoTexto(estado).replace(/[⏳🔄🚚✅]/g, '').trim()}</strong>
          <span>${evento ? formatearFecha(evento.created_at) : 'Pendiente'}</span>
        </div>
      </div>
    `;
  }).join('');

  const cancelacion = ['cancelacion_solicitada', 'cancelado'].includes(pedido.estado)
    ? `
      <div class="tracking-step activo tracking-cancelado">
        <div class="tracking-dot"></div>
        <div>
          <strong>${estadoTexto(pedido.estado).replace(/[🟠❌]/g, '').trim()}</strong>
          <span>${formatearFecha((seguimiento.find(item => item.estado === pedido.estado) || {}).created_at)}</span>
        </div>
      </div>
    `
    : '';

  return `<div class="tracking-box">${htmlBase}${cancelacion}</div>`;
}

function renderAccionesComprador(pedido) {
  if (pedido.estado === 'pendiente') {
    return `
      <div class="pedido-acciones-comprador">
        <button class="btn-cancelar-pedido" onclick="solicitarCancelacion(${pedido.id})">
          Solicitar cancelación
        </button>
      </div>
    `;
  }

  if (pedido.estado === 'cancelacion_solicitada') {
    return `<p class="nota-cancelacion">Solicitud de cancelación enviada al vendedor.</p>`;
  }

  return '';
}

// ================================
// HU-09/HU-22/HU-23/HU-27/HU-29: Historial de pedidos comprador
// ================================
async function cargarPedidos() {
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_PEDIDOS}/pedidos/mis-pedidos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const pedidos = await res.json();
    const div = document.getElementById('lista-pedidos');

    if (!res.ok) {
      div.innerHTML = `<p>${escaparHTML(pedidos.error || 'Error al cargar pedidos')}</p>`;
      return;
    }

    if (pedidos.length === 0) {
      div.innerHTML = `
        <div class="vacio">
          <p style="font-size:48px;">📋</p>
          <h3>No tienes pedidos registrados</h3>
          <p>Cuando confirmes una compra, aparecerá aquí.</p>
          <a href="index.html" class="btn" style="display:inline-block;width:auto;padding:10px 24px;text-decoration:none;">
            Ir al catálogo
          </a>
        </div>
      `;
      return;
    }

    div.innerHTML = pedidos.map(pedido => {
      const entregaCompleta = [pedido.direccion_entrega, pedido.ciudad_entrega, pedido.provincia_entrega]
        .filter(Boolean)
        .join(', ');

      return `
        <div class="pedido-card pedido-card-columna">
          <div class="pedido-card-main">
            <div class="pedido-info">
              <h3>${escaparHTML(pedido.codigo || `Pedido #${pedido.id}`)}</h3>
              <p>📦 Productos: ${escaparHTML(pedido.productos)}</p>
              <p>📅 Fecha: ${formatearFecha(pedido.created_at)}</p>
              <p>💰 Total: <b>$${parseFloat(pedido.total).toFixed(2)}</b></p>
              ${pedido.metodo_pago ? `<p>💳 Pago: ${escaparHTML(pedido.metodo_pago_texto || metodoPagoTexto(pedido.metodo_pago))}</p>` : ''}
              ${pedido.metodo_pago === 'transferencia' && pedido.comprobante_transferencia ? `<p>🏦 Comprobante: ${escaparHTML(pedido.comprobante_transferencia)}${pedido.banco_transferencia ? ` · ${escaparHTML(pedido.banco_transferencia)}` : ''}</p>` : ''}
              ${entregaCompleta ? `<p>📍 Entrega: ${escaparHTML(entregaCompleta)}</p>` : ''}
              ${pedido.referencia_entrega ? `<p>📝 Referencia: ${escaparHTML(pedido.referencia_entrega)}</p>` : ''}
              ${enlaceMapaEntrega(pedido) ? `<p>🗺️ Ubicación aproximada: <a class="link-mapa-entrega" href="${enlaceMapaEntrega(pedido)}" target="_blank" rel="noopener">Ver en Google Maps</a></p>` : ''}
            </div>

            <span class="estado ${escaparHTML(pedido.estado)}">${estadoTexto(pedido.estado)}</span>
          </div>

          <div class="seguimiento-pedido">
            <h4>Seguimiento del envío</h4>
            ${renderSeguimiento(pedido)}
          </div>

          ${renderAccionesComprador(pedido)}
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error(error);
    document.getElementById('lista-pedidos').innerHTML = '<p>Error al conectar con el servidor.</p>';
  }
}

// ================================
// HU-27: Solicitar cancelación de pedido
// ================================
async function solicitarCancelacion(pedidoId) {
  const token = localStorage.getItem('token');
  let motivo = '';

  if (typeof sfPrompt === 'function') {
    motivo = await sfPrompt({
      icono: '📦',
      titulo: 'Solicitar cancelación',
      descripcion: 'Indica brevemente por qué deseas cancelar este pedido. El vendedor recibirá la solicitud y podrá aprobarla o rechazarla.',
      placeholder: 'Ejemplo: Me equivoqué de producto o ya no necesito el pedido...',
      textoAceptar: 'Enviar solicitud',
      requerido: true,
      minimo: 4,
      mensajeError: 'Escribe un motivo breve para enviar la solicitud.'
    });

    if (!motivo) {
      mostrarAviso('Solicitud cancelada', 'info', 'No se envió ninguna solicitud al vendedor.');
      return;
    }
  } else {
    motivo = '';
  }

  try {
    const res = await fetch(`${API_PEDIDOS}/pedidos/${pedidoId}/solicitar-cancelacion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ motivo })
    });

    const data = await res.json();

    if (res.ok) {
      mostrarAviso('Solicitud enviada', 'exito', 'El vendedor recibirá una notificación para revisar la cancelación.');
      if (typeof sfActualizarNotificaciones === 'function') sfActualizarNotificaciones(false);
      cargarPedidos();
    } else {
      mostrarAviso(data.error || 'No se pudo solicitar la cancelación', 'error');
    }
  } catch (error) {
    console.error(error);
    mostrarAviso('Error al conectar con el servidor', 'error');
  }
}
