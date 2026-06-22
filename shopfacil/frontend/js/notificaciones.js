const API_ADMIN = window.SHOPFACIL_API_URL || "https://shopfacil-api.onrender.com/api";


window.onload = function () {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const token = localStorage.getItem('token');

  if (!usuario || !token) {
    alert('Debes iniciar sesión para ver tus notificaciones');
    window.location.href = 'login.html';
    return;
  }

  if (!['comprador', 'vendedor'].includes(usuario.rol)) {
    mostrarAviso('Las notificaciones están disponibles para compradores y vendedores', 'error');
    window.location.href = 'index.html';
    return;
  }

  configurarNavbarNotificaciones(usuario);
  cargarNotificaciones();
};

function escaparHTML(texto) {
  return String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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

function mostrarAviso(mensaje, tipo = 'info', subtexto = '') {
  if (typeof sfToast === 'function') sfToast(mensaje, tipo, subtexto);
  else alert(mensaje);
}

function configurarNavbarNotificaciones(usuario) {
  const nav = document.querySelector('.nav-links');
  if (!nav || !usuario) return;

  if (usuario.rol === 'vendedor') {
    nav.innerHTML = `
      <a href="index.html">Catálogo</a>
      <a href="agregar-producto.html">+ Agregar producto</a>
      <a href="panel-vendedor.html">Panel vendedor</a>
      <a href="notificaciones.html">Notificaciones</a>
      <a href="#" onclick="cerrarSesion()">Cerrar sesión</a>
    `;
  } else {
    nav.innerHTML = `
      <a href="index.html">Catálogo</a>
      <a href="pedidos.html">Mis pedidos</a>
      <a href="facturas.html">Mis facturas</a>
      <a href="carrito.html">Mi carrito</a>
      <a href="notificaciones.html">Notificaciones</a>
      <a href="#" onclick="cerrarSesion()">Cerrar sesión</a>
    `;
  }

  if (typeof sfActualizarNotificaciones === 'function') {
    setTimeout(() => sfActualizarNotificaciones(false), 100);
  }
}

async function cargarNotificaciones() {
  const token = localStorage.getItem('token');
  const contenedor = document.getElementById('lista-notificaciones');
  contenedor.innerHTML = '<p>Cargando notificaciones...</p>';

  try {
    const res = await fetch(`${API_NOTIFICACIONES}/notificaciones/mis-notificaciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const notificaciones = await res.json();

    if (!res.ok) {
      contenedor.innerHTML = `<p class="estado-vacio">${escaparHTML(notificaciones.error || 'Error al cargar notificaciones')}</p>`;
      return;
    }

    if (!Array.isArray(notificaciones) || notificaciones.length === 0) {
      contenedor.innerHTML = `
        <div class="vacio">
          <p style="font-size:48px;">🔔</p>
          <h3>Sin notificaciones nuevas</h3>
          <p>Cuando un pedido cambie de estado, aparecerá aquí.</p>
        </div>`;
      return;
    }

    contenedor.innerHTML = notificaciones.map(n => `
      <div class="notificacion-card ${Number(n.leida) === 1 ? 'leida' : 'no-leida'}">
        <div class="notificacion-icono">${Number(n.leida) === 1 ? '📭' : '📬'}</div>
        <div class="notificacion-body">
          <h3>${escaparHTML(n.titulo)}</h3>
          <p>${escaparHTML(n.mensaje)}</p>
          <small>${formatearFecha(n.created_at)}</small>
        </div>
        ${Number(n.leida) === 1 ? '<span class="badge-suave">Leída</span>' : `<button class="btn-marcar-leida" onclick="marcarLeida(${n.id})">Marcar leída</button>`}
      </div>`).join('');
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = '<p class="estado-vacio">Error al conectar con el servidor.</p>';
  }
}

async function marcarLeida(id) {
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_NOTIFICACIONES}/notificaciones/${id}/leida`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      mostrarAviso('Notificación marcada como leída', 'exito');
      if (typeof sfActualizarNotificaciones === 'function') sfActualizarNotificaciones(false);
      cargarNotificaciones();
    } else {
      const data = await res.json();
      mostrarAviso(data.error || 'No se pudo marcar la notificación', 'error');
    }
  } catch (error) {
    console.error(error);
    mostrarAviso('Error al conectar con el servidor', 'error');
  }
}

async function marcarTodasLeidas() {
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_NOTIFICACIONES}/notificaciones/marcar-todas/leidas`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      mostrarAviso('Notificaciones actualizadas', 'exito');
      if (typeof sfActualizarNotificaciones === 'function') sfActualizarNotificaciones(false);
      cargarNotificaciones();
    } else {
      const data = await res.json();
      mostrarAviso(data.error || 'No se pudieron marcar las notificaciones', 'error');
    }
  } catch (error) {
    console.error(error);
    mostrarAviso('Error al conectar con el servidor', 'error');
  }
}
