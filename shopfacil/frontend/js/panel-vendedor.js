const API_ADMIN = window.SHOPFACIL_API_URL || "https://shopfacil-api.onrender.com/api";


window.onload = function () {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const token = localStorage.getItem('token');

  if (!usuario || !token) {
    alert('Debes iniciar sesión');
    window.location.href = 'login.html';
    return;
  }

  if (usuario.rol !== 'vendedor') {
    alert('No tienes permisos para acceder al panel vendedor');
    window.location.href = 'index.html';
    return;
  }

  cargarDashboardVendedor();
  cargarMisProductosVendedor();
  cargarPedidosVendedor();
  cargarPreguntasVendedor();
  if (typeof sfActualizarNotificaciones === 'function') {
    setTimeout(() => sfActualizarNotificaciones(true), 300);
  }
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

function imagenSeguraProducto(url) {
  return url || 'https://via.placeholder.com/120x90?text=Producto';
}

function metodoPagoTexto(metodo) {
  const textos = {
    contra_entrega: 'Pago contra entrega',
    transferencia: 'Transferencia bancaria',
    tarjeta_simulada: 'Tarjeta simulada'
  };
  return textos[metodo] || 'No registrado';
}

function construirDireccionEntrega(pedido) {
  return [pedido.direccion_entrega, pedido.ciudad_entrega, pedido.provincia_entrega, 'Ecuador']
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

function nombreEstado(estado) {
  const nombres = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    enviado: 'Enviado',
    entregado: 'Entregado',
    cancelacion_solicitada: 'Cancelación solicitada',
    cancelado: 'Cancelado'
  };
  return nombres[estado] || estado || 'Pendiente';
}

function siguienteEstado(estadoActual) {
  const flujo = {
    pendiente: 'en_proceso',
    en_proceso: 'enviado',
    enviado: 'entregado'
  };
  return flujo[estadoActual] || null;
}

function claseBotonEstado(estado) {
  const clases = {
    en_proceso: 'btn-proceso',
    enviado: 'btn-enviado',
    entregado: 'btn-entregado'
  };
  return clases[estado] || 'btn-proceso';
}

function formatearFecha(fecha) {
  if (!fecha) return 'No disponible';
  const fechaObj = new Date(fecha);
  if (Number.isNaN(fechaObj.getTime())) return 'No disponible';

  return fechaObj.toLocaleString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}


// ================================
// HU-31: Dashboard de ventas del vendedor
// ================================
async function cargarDashboardVendedor() {
  const token = localStorage.getItem('token');
  const contenedor = document.getElementById('dashboard-vendedor');
  if (!contenedor) return;

  contenedor.innerHTML = '<p class="estado-vacio">Cargando métricas...</p>';

  try {
    const res = await fetch(`${API_PANEL}/reportes/vendedor`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'No se pudo cargar el dashboard');
    }

    const m = data.metricas || {};
    const top = Array.isArray(data.productos_mas_vendidos) ? data.productos_mas_vendidos : [];
    const stock = Array.isArray(data.stock_bajo) ? data.stock_bajo : [];

    contenedor.innerHTML = `
      <div class="dashboard-grid">
        <article class="dashboard-card"><span>💵</span><p>Total vendido</p><strong>$${Number(m.total_vendido || 0).toFixed(2)}</strong></article>
        <article class="dashboard-card"><span>📦</span><p>Pedidos</p><strong>${Number(m.total_pedidos || 0)}</strong></article>
        <article class="dashboard-card"><span>⏳</span><p>Pendientes</p><strong>${Number(m.pedidos_pendientes || 0)}</strong></article>
        <article class="dashboard-card"><span>✅</span><p>Entregados</p><strong>${Number(m.pedidos_entregados || 0)}</strong></article>
      </div>

      <div class="dashboard-columns">
        <div class="dashboard-box">
          <h4>Productos más vendidos</h4>
          ${top.length ? top.map(p => `
            <div class="dashboard-list-item">
              <span>${escaparHTML(p.nombre)}</span>
              <strong>${Number(p.cantidad_vendida || 0)} uds. · $${Number(p.total_vendido || 0).toFixed(2)}</strong>
            </div>`).join('') : '<p class="estado-vacio">Aún no hay ventas registradas.</p>'}
        </div>
        <div class="dashboard-box">
          <h4>Alertas de stock bajo</h4>
          ${stock.length ? stock.map(p => `
            <div class="dashboard-list-item alerta-stock">
              <span>${escaparHTML(p.nombre)}</span>
              <strong>${Number(p.stock || 0)} disponibles</strong>
            </div>`).join('') : '<p class="estado-vacio">No hay alertas de stock bajo.</p>'}
        </div>
      </div>`;
  } catch (error) {
    contenedor.innerHTML = `<p class="estado-vacio">${escaparHTML(error.message || 'Error al cargar dashboard')}</p>`;
  }
}

// ================================
// HU-06/HU-18/HU-21: Mis productos como vendedor
// ================================
async function cargarMisProductosVendedor() {
  const token = localStorage.getItem('token');
  const contenedor = document.getElementById('lista-productos-vendedor');
  if (!contenedor) return;

  contenedor.innerHTML = '<p class="estado-vacio">Cargando productos...</p>';

  try {
    const res = await fetch(`${API_PANEL}/productos/vendedor/mis-productos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const productos = await res.json();

    if (!res.ok) {
      contenedor.innerHTML = `<p class="estado-vacio">${productos.error || 'No se pudieron cargar los productos'}</p>`;
      return;
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      contenedor.innerHTML = `
        <div class="estado-vacio estado-vacio-card">
          <strong>Aún no tienes productos publicados.</strong><br>
          Registra tu primer producto para que aparezca en el catálogo.
        </div>`;
      return;
    }

    contenedor.innerHTML = `
      <div class="tabla-responsiva">
        <table class="tabla-panel tabla-productos-vendedor">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Variantes</th>
              <th>Galería</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${productos.map(producto => `
              <tr>
                <td>
                  <div class="producto-tabla-info">
                    <img src="${escaparHTML(imagenSeguraProducto(producto.imagen))}" alt="${escaparHTML(producto.nombre)}" onerror="this.src='https://via.placeholder.com/120x90?text=Producto'">
                    <div>
                      <strong>${escaparHTML(producto.nombre)}</strong>
                      <span>${escaparHTML(producto.descripcion || 'Sin descripción')}</span>
                    </div>
                  </div>
                </td>
                <td><span class="badge-suave">${escaparHTML(producto.categoria || 'otros')}</span></td>
                <td><strong>$${Number(producto.precio).toFixed(2)}</strong></td>
                <td>${producto.stock} unidades</td>
                <td>${producto.total_variantes || 0}</td>
                <td>${Number(producto.total_imagenes || 0) + (producto.imagen ? 1 : 0)}</td>
                <td>
                  <span class="badge-estado ${Number(producto.activo) === 1 ? 'badge-activo' : 'badge-inactivo'}">
                    ${Number(producto.activo) === 1 ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <a class="btn-accion-tabla btn-editar-producto" href="agregar-producto.html?editar=${producto.id}">
                    Editar
                  </a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = '<p class="estado-vacio">Error al conectar con el servidor.</p>';
  }
}

function renderSeguimiento(pedido) {
  const estadosBase = ['pendiente', 'en_proceso', 'enviado', 'entregado'];
  const seguimiento = Array.isArray(pedido.seguimiento) ? pedido.seguimiento : [];
  const estadosRealizados = new Set(seguimiento.map(item => item.estado));

  if (pedido.estado === 'cancelacion_solicitada') estadosRealizados.add('cancelacion_solicitada');
  if (pedido.estado === 'cancelado') estadosRealizados.add('cancelado');

  const pasos = estadosBase.map(estado => {
    const activo = estadosRealizados.has(estado) || estadosBase.indexOf(estado) <= estadosBase.indexOf(pedido.estado);
    const evento = seguimiento.find(item => item.estado === estado);
    return `
      <div class="tracking-step ${activo ? 'activo' : ''}">
        <div class="tracking-dot"></div>
        <div>
          <strong>${nombreEstado(estado)}</strong>
          <span>${evento ? formatearFecha(evento.created_at) : 'Pendiente'}</span>
        </div>
      </div>`;
  }).join('');

  const cancelacion = ['cancelacion_solicitada', 'cancelado'].includes(pedido.estado)
    ? `<div class="tracking-step activo tracking-cancelado"><div class="tracking-dot"></div><div><strong>${nombreEstado(pedido.estado)}</strong><span>Proceso de cancelación</span></div></div>`
    : '';

  return `<div class="tracking-box">${pasos}${cancelacion}</div>`;
}

function renderAccionEstado(pedido) {
  if (pedido.estado === 'cancelacion_solicitada') {
    return `
      <div class="acciones acciones-cancelacion">
        <button class="btn-estado btn-entregado" onclick="resolverCancelacion(${pedido.id}, 'aprobar')">Aprobar cancelación</button>
        <button class="btn-estado btn-proceso" onclick="resolverCancelacion(${pedido.id}, 'rechazar')">Rechazar cancelación</button>
      </div>`;
  }

  if (pedido.estado === 'cancelado') {
    return `<div class="acciones"><span class="estado cancelado">Pedido cancelado</span></div>`;
  }

  const proximoEstado = siguienteEstado(pedido.estado);

  if (!proximoEstado) {
    return `<div class="acciones"><span class="estado entregado">Pedido finalizado</span></div>`;
  }

  return `
    <div class="acciones">
      <button class="btn-estado ${claseBotonEstado(proximoEstado)}" onclick="actualizarEstado(${pedido.id}, '${proximoEstado}')">
        Pasar a ${nombreEstado(proximoEstado)}
      </button>
    </div>`;
}

async function cargarPedidosVendedor() {
  const token = localStorage.getItem('token');
  const div = document.getElementById('lista-pedidos');

  if (!div) return;
  div.innerHTML = '<p class="estado-vacio">Cargando pedidos...</p>';

  try {
    const res = await fetch(`${API_PANEL}/pedidos/todos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const pedidos = await res.json();

    if (!res.ok) {
      div.innerHTML = `<p class="estado-vacio">${pedidos.error || 'Error al cargar pedidos'}</p>`;
      return;
    }

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      div.innerHTML = '<p class="estado-vacio">Todavía no existen pedidos para tus productos.</p>';
      return;
    }

    div.innerHTML = pedidos.map(pedido => `
      <div class="pedido-card pedido-card-columna">
        <div class="pedido-top">
          <div>
            <h3>Pedido #${pedido.id}</h3>
            <p><strong>Código:</strong> ${escaparHTML(pedido.codigo || 'Sin código')}</p>
          </div>
          <span class="estado ${escaparHTML(pedido.estado)}">${nombreEstado(pedido.estado)}</span>
        </div>

        <div class="pedido-info">
          <p><strong>Cliente:</strong> ${escaparHTML(pedido.comprador || pedido.cliente_nombre || 'Comprador')}</p>
          <p><strong>Correo:</strong> ${escaparHTML(pedido.comprador_correo || pedido.cliente_correo || 'No disponible')}</p>
          <p><strong>Productos:</strong> ${escaparHTML(pedido.productos || 'Sin detalle')}</p>
          <p><strong>Total:</strong> $${Number(pedido.total || 0).toFixed(2)}</p>
          ${pedido.metodo_pago ? `<p><strong>Método de pago:</strong> ${escaparHTML(pedido.metodo_pago_texto || metodoPagoTexto(pedido.metodo_pago))}</p>` : ''}
          ${pedido.metodo_pago === 'transferencia' && pedido.comprobante_transferencia ? `<p><strong>Comprobante de transferencia:</strong> ${escaparHTML(pedido.comprobante_transferencia)}${pedido.banco_transferencia ? ` · ${escaparHTML(pedido.banco_transferencia)}` : ''}</p>` : ''}
          ${pedido.direccion_entrega ? `<p><strong>Entrega:</strong> ${escaparHTML(pedido.direccion_entrega)}, ${escaparHTML(pedido.ciudad_entrega || '')}, ${escaparHTML(pedido.provincia_entrega || '')}</p>` : ''}
          ${pedido.referencia_entrega ? `<p><strong>Referencia:</strong> ${escaparHTML(pedido.referencia_entrega)}</p>` : ''}
          ${enlaceMapaEntrega(pedido) ? `<p><strong>Ubicación aproximada:</strong> <a class="link-mapa-entrega" href="${enlaceMapaEntrega(pedido)}" target="_blank" rel="noopener">Ver en Google Maps</a></p>` : ''}
          <p><strong>Fecha:</strong> ${formatearFecha(pedido.created_at || pedido.fecha)}</p>
        </div>

        <div class="seguimiento-pedido">
          <h4>Seguimiento del envío</h4>
          ${renderSeguimiento(pedido)}
        </div>

        ${renderAccionEstado(pedido)}
      </div>`).join('');
  } catch (err) {
    console.error(err);
    div.innerHTML = '<p class="estado-vacio">Error al conectar con el servidor</p>';
  }
}

async function actualizarEstado(id, nuevoEstado) {
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_PANEL}/pedidos/estado/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ estado: nuevoEstado })
    });

    const data = await res.json();

    if (res.ok) {
      mostrarAviso(`Pedido actualizado a ${nombreEstado(data.estado || nuevoEstado)}`, 'exito');
      if (typeof sfActualizarNotificaciones === 'function') sfActualizarNotificaciones(false);
      cargarDashboardVendedor();
      cargarPedidosVendedor();
    } else {
      mostrarAviso(data.error || 'Error al actualizar estado', 'error');
      cargarDashboardVendedor();
      cargarPedidosVendedor();
    }
  } catch (err) {
    console.error(err);
    mostrarAviso('Error al conectar con el servidor', 'error');
  }
}

async function resolverCancelacion(id, accion) {
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_PANEL}/pedidos/${id}/cancelacion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ accion })
    });

    const data = await res.json();

    if (res.ok) {
      mostrarAviso(data.message || 'Cancelación procesada', 'exito');
      if (typeof sfActualizarNotificaciones === 'function') sfActualizarNotificaciones(false);
      cargarDashboardVendedor();
      cargarPedidosVendedor();
    } else {
      mostrarAviso(data.error || 'No se pudo procesar la cancelación', 'error');
    }
  } catch (error) {
    console.error(error);
    mostrarAviso('Error al conectar con el servidor', 'error');
  }
}

// ================================
// HU-28: Preguntas recibidas por vendedor
// ================================
async function cargarPreguntasVendedor() {
  const token = localStorage.getItem('token');
  const contenedor = document.getElementById('lista-preguntas-vendedor');
  if (!contenedor) return;

  contenedor.innerHTML = '<p class="estado-vacio">Cargando preguntas...</p>';

  try {
    const res = await fetch(`${API_PANEL}/preguntas/vendedor`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const preguntas = await res.json();

    if (!res.ok) {
      contenedor.innerHTML = `<p class="estado-vacio">${escaparHTML(preguntas.error || 'Error al cargar preguntas')}</p>`;
      return;
    }

    if (!Array.isArray(preguntas) || preguntas.length === 0) {
      contenedor.innerHTML = '<p class="estado-vacio">Aún no tienes preguntas de compradores.</p>';
      return;
    }

    contenedor.innerHTML = preguntas.map(p => `
      <div class="pregunta-vendedor-card">
        <div class="pregunta-vendedor-head">
          <div>
            <h4>${escaparHTML(p.producto)}</h4>
            <p>${escaparHTML(p.comprador)} · ${escaparHTML(p.comprador_correo || '')}</p>
            <small>${formatearFecha(p.created_at)}</small>
          </div>
          <span class="badge-estado ${p.respuesta ? 'badge-activo' : 'badge-pendiente'}">${p.respuesta ? 'Respondida' : 'Pendiente'}</span>
        </div>
        <p class="pregunta-texto"><strong>Pregunta:</strong> ${escaparHTML(p.pregunta)}</p>
        ${p.respuesta ? `<p class="respuesta-texto"><strong>Respuesta:</strong> ${escaparHTML(p.respuesta)}</p>` : `
          <div class="respuesta-form">
            <textarea id="respuesta-${p.id}" rows="2" placeholder="Escribe tu respuesta para el comprador..."></textarea>
            <button class="btn-estado btn-proceso" onclick="responderPregunta(${p.id})">Responder</button>
          </div>`}
      </div>`).join('');
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = '<p class="estado-vacio">Error al conectar con el servidor</p>';
  }
}

async function responderPregunta(id) {
  const token = localStorage.getItem('token');
  const textarea = document.getElementById(`respuesta-${id}`);
  const respuesta = textarea ? textarea.value.trim() : '';

  if (!respuesta) {
    mostrarAviso('Escribe una respuesta antes de enviar', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_PANEL}/preguntas/${id}/responder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ respuesta })
    });

    const data = await res.json();

    if (res.ok) {
      mostrarAviso('Respuesta publicada', 'exito');
      cargarPreguntasVendedor();
    } else {
      mostrarAviso(data.error || 'No se pudo responder', 'error');
    }
  } catch (error) {
    console.error(error);
    mostrarAviso('Error al conectar con el servidor', 'error');
  }
}
