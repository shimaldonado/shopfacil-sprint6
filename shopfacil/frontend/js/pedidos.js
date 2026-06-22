const API_PEDIDOS = window.SHOPFACIL_API_URL || 'https://shopfacil-api.onrender.com/api';

window.onload = function () {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const token = localStorage.getItem('token');

  if (!usuario || !token) {
    alert('Debes iniciar sesiÃ³n para ver tus pedidos');
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
    pendiente: 'â³ Pendiente',
    en_proceso: 'ðŸ”„ En proceso',
    enviado: 'ðŸšš Enviado',
    entregado: 'âœ… Entregado',
    cancelacion_solicitada: 'ðŸŸ  CancelaciÃ³n solicitada',
    cancelado: 'âŒ Cancelado'
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
          <strong>${estadoTexto(estado).replace(/[â³ðŸ”„ðŸššâœ…]/g, '').trim()}</strong>
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
          <strong>${estadoTexto(pedido.estado).replace(/[ðŸŸ âŒ]/g, '').trim()}</strong>
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
          Solicitar cancelaciÃ³n
        </button>
      </div>
    `;
  }

  if (pedido.estado === 'cancelacion_solicitada') {
    return `<p class="nota-cancelacion">Solicitud de cancelaciÃ³n enviada al vendedor.</p>`;
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
          <p style="font-size:48px;">ðŸ“‹</p>
          <h3>No tienes pedidos registrados</h3>
          <p>Cuando confirmes una compra, aparecerÃ¡ aquÃ­.</p>
          <a href="index.html" class="btn" style="display:inline-block;width:auto;padding:10px 24px;text-decoration:none;">
            Ir al catÃ¡logo
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
              <p>ðŸ“¦ Productos: ${escaparHTML(pedido.productos)}</p>
              <p>ðŸ“… Fecha: ${formatearFecha(pedido.created_at)}</p>
              <p>ðŸ’° Total: <b>$${parseFloat(pedido.total).toFixed(2)}</b></p>
              ${pedido.metodo_pago ? `<p>ðŸ’³ Pago: ${escaparHTML(pedido.metodo_pago_texto || metodoPagoTexto(pedido.metodo_pago))}</p>` : ''}
              ${pedido.metodo_pago === 'transferencia' && pedido.comprobante_transferencia ? `<p>ðŸ¦ Comprobante: ${escaparHTML(pedido.comprobante_transferencia)}${pedido.banco_transferencia ? ` Â· ${escaparHTML(pedido.banco_transferencia)}` : ''}</p>` : ''}
              ${entregaCompleta ? `<p>ðŸ“ Entrega: ${escaparHTML(entregaCompleta)}</p>` : ''}
              ${pedido.referencia_entrega ? `<p>ðŸ“ Referencia: ${escaparHTML(pedido.referencia_entrega)}</p>` : ''}
              ${enlaceMapaEntrega(pedido) ? `<p>ðŸ—ºï¸ UbicaciÃ³n aproximada: <a class="link-mapa-entrega" href="${enlaceMapaEntrega(pedido)}" target="_blank" rel="noopener">Ver en Google Maps</a></p>` : ''}
            </div>

            <span class="estado ${escaparHTML(pedido.estado)}">${estadoTexto(pedido.estado)}</span>
          </div>

          <div class="seguimiento-pedido">
            <h4>Seguimiento del envÃ­o</h4>
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
// HU-27: Solicitar cancelaciÃ³n de pedido
// ================================
async function solicitarCancelacion(pedidoId) {
  const token = localStorage.getItem('token');
  let motivo = '';

  if (typeof sfPrompt === 'function') {
    motivo = await sfPrompt({
      icono: 'ðŸ“¦',
      titulo: 'Solicitar cancelaciÃ³n',
      descripcion: 'Indica brevemente por quÃ© deseas cancelar este pedido. El vendedor recibirÃ¡ la solicitud y podrÃ¡ aprobarla o rechazarla.',
      placeholder: 'Ejemplo: Me equivoquÃ© de producto o ya no necesito el pedido...',
      textoAceptar: 'Enviar solicitud',
      requerido: true,
      minimo: 4,
      mensajeError: 'Escribe un motivo breve para enviar la solicitud.'
    });

    if (!motivo) {
      mostrarAviso('Solicitud cancelada', 'info', 'No se enviÃ³ ninguna solicitud al vendedor.');
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
      mostrarAviso('Solicitud enviada', 'exito', 'El vendedor recibirÃ¡ una notificaciÃ³n para revisar la cancelaciÃ³n.');
      if (typeof sfActualizarNotificaciones === 'function') sfActualizarNotificaciones(false);
      cargarPedidos();
    } else {
      mostrarAviso(data.error || 'No se pudo solicitar la cancelaciÃ³n', 'error');
    }
  } catch (error) {
    console.error(error);
    mostrarAviso('Error al conectar con el servidor', 'error');
  }
}

