//const API_ADMIN = window.SHOPFACIL_API_URL || 'https://shopfacil-api.onrender.com/api';
const API_URL = window.SHOPFACIL_API_URL || "https://shopfacil-api.onrender.com/api";
let usuariosCache = [];

const rolLabels = {
  admin: 'Administrador',
  vendedor: 'Vendedor',
  comprador: 'Comprador'
};

const rolIconos = {
  admin: 'ðŸ›¡ï¸',
  vendedor: 'ðŸª',
  comprador: 'ðŸ›ï¸'
};

document.addEventListener('DOMContentLoaded', () => {
  const usuario = obtenerUsuarioActual();
  const token = localStorage.getItem('token');

  if (!usuario || !token || usuario.rol !== 'admin') {
    alert('Solo el administrador puede ingresar a esta pÃ¡gina');
    window.location.href = 'index.html';
    return;
  }

  configurarNavbarAdmin(usuario);
  configurarEventosAdmin();
  cargarUsuarios();
  cargarDashboardAdmin();
});


// ================================
// HU-32: Dashboard administrativo general
// ================================
async function cargarDashboardAdmin() {
  const token = localStorage.getItem('token');
  const contenedor = document.getElementById('dashboardAdmin');
  if (!contenedor) return;

  contenedor.innerHTML = '<p class="loading-cell">Cargando reportes...</p>';

  try {
    const res = await fetch(`${API_URL}/reportes/admin`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'No se pudo cargar el reporte');

    const u = data.usuarios || {};
    const c = data.catalogo || {};
    const v = data.ventas || {};
    const estados = Array.isArray(data.pedidos_por_estado) ? data.pedidos_por_estado : [];
    const top = Array.isArray(data.top_vendedores) ? data.top_vendedores : [];

    contenedor.innerHTML = `
      <div class="dashboard-grid dashboard-grid-admin">
        <article class="dashboard-card"><span>ðŸ‘¥</span><p>Usuarios</p><strong>${Number(u.total_usuarios || 0)}</strong></article>
        <article class="dashboard-card"><span>ðŸª</span><p>Vendedores</p><strong>${Number(u.vendedores || 0)}</strong></article>
        <article class="dashboard-card"><span>ðŸ›’</span><p>Pedidos</p><strong>${Number(v.total_pedidos || 0)}</strong></article>
        <article class="dashboard-card"><span>ðŸ’µ</span><p>Ventas</p><strong>$${Number(v.ingresos_totales || 0).toFixed(2)}</strong></article>
        <article class="dashboard-card"><span>ðŸ“¦</span><p>Productos</p><strong>${Number(c.total_productos || 0)}</strong></article>
      </div>
      <div class="dashboard-columns">
        <div class="dashboard-box">
          <h4>Pedidos por estado</h4>
          ${estados.length ? estados.map(e => `
            <div class="dashboard-list-item">
              <span>${escapeHtml(e.estado)}</span>
              <strong>${Number(e.total || 0)}</strong>
            </div>`).join('') : '<p class="estado-vacio">No hay pedidos registrados.</p>'}
        </div>
        <div class="dashboard-box">
          <h4>Vendedores con mÃ¡s ventas</h4>
          ${top.length ? top.map(vendedor => `
            <div class="dashboard-list-item">
              <span>${escapeHtml(vendedor.nombre)}</span>
              <strong>$${Number(vendedor.ventas || 0).toFixed(2)}</strong>
            </div>`).join('') : '<p class="estado-vacio">No hay ventas registradas.</p>'}
        </div>
      </div>`;
  } catch (error) {
    contenedor.innerHTML = `<p class="loading-cell error-text">${escapeHtml(error.message || 'Error al cargar reportes')}</p>`;
  }
}

function obtenerUsuarioActual() {
  try {
    return JSON.parse(localStorage.getItem('usuario'));
  } catch (error) {
    return null;
  }
}
function corregirTexto(texto) {
  if (!texto) return '';
  return String(texto)
    .replaceAll('ÃƒÂ¡', 'Ã¡')
    .replaceAll('ÃƒÂ©', 'Ã©')
    .replaceAll('ÃƒÂ­', 'Ã­')
    .replaceAll('ÃƒÂ³', 'Ã³')
    .replaceAll('ÃƒÂº', 'Ãº')
    .replaceAll('ÃƒÂ±', 'Ã±')
    .replaceAll('Ãƒ', 'Ã')
    .replaceAll('Ãƒâ€°', 'Ã‰')
    .replaceAll('Ãƒ"', 'Ã“');
}
function configurarNavbarAdmin(usuario) {
  const nav = document.getElementById('navAdmin');
  if (!nav) return;

  nav.innerHTML = `
    <span class="admin-nav-user">Hola, ${corregirTexto(usuario.nombre)}</span>
    <a href="index.html">CatÃ¡logo</a>
    <a href="#" onclick="cerrarSesion()">Cerrar sesiÃ³n</a>
  `;
}

function configurarEventosAdmin() {
  const form = document.getElementById('formRegistroVendedor');
  const busqueda = document.getElementById('busquedaUsuarios');
  const filtroRol = document.getElementById('filtroRol');
  const filtroEstado = document.getElementById('filtroEstado');

  if (form) form.addEventListener('submit', crearVendedor);
  if (busqueda) busqueda.addEventListener('input', aplicarFiltros);
  if (filtroRol) filtroRol.addEventListener('change', aplicarFiltros);
  if (filtroEstado) filtroEstado.addEventListener('change', aplicarFiltros);
}

async function cargarUsuarios() {
  const token = localStorage.getItem('token');
  const tbody = document.getElementById('tablaUsuariosAdmin');

  try {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-cell">Cargando usuarios...</td></tr>`;

    const res = await fetch(`${API_URL}/admin/usuarios`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const usuarios = await res.json();

    if (!res.ok) {
      throw new Error(usuarios.error || 'Error al cargar usuarios');
    }

    usuariosCache = Array.isArray(usuarios) ? usuarios : [];
    actualizarEstadisticas(usuariosCache);
    renderUsuarios(usuariosCache);
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="5" class="loading-cell error-text">${error.message}</td></tr>`;
  }
}

function actualizarEstadisticas(usuarios) {
  document.getElementById('statTotal').textContent = usuarios.length;
  document.getElementById('statActivos').textContent = usuarios.filter(u => Boolean(u.activo)).length;
  document.getElementById('statCompradores').textContent = usuarios.filter(u => u.rol === 'comprador').length;
  document.getElementById('statVendedores').textContent = usuarios.filter(u => u.rol === 'vendedor').length;
}

function aplicarFiltros() {
  const texto = document.getElementById('busquedaUsuarios').value.toLowerCase().trim();
  const rol = document.getElementById('filtroRol').value;
  const estado = document.getElementById('filtroEstado').value;

  const filtrados = usuariosCache.filter(usuario => {
    const coincideTexto =
      usuario.nombre.toLowerCase().includes(texto) ||
      usuario.correo.toLowerCase().includes(texto);

    const coincideRol = rol === 'todos' || usuario.rol === rol;
    const coincideEstado =
      estado === 'todos' ||
      (estado === 'activo' && Boolean(usuario.activo)) ||
      (estado === 'inactivo' && !Boolean(usuario.activo));

    return coincideTexto && coincideRol && coincideEstado;
  });

  renderUsuarios(filtrados);
}

function renderUsuarios(usuarios) {
  const tbody = document.getElementById('tablaUsuariosAdmin');
  const usuarioActual = obtenerUsuarioActual();

  if (!usuarios.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-cell">No se encontraron usuarios con esos filtros.</td></tr>`;
    return;
  }

  tbody.innerHTML = usuarios.map(usuario => {
    const esAdmin = usuario.rol === 'admin';
    const esUsuarioActual = Number(usuario.id) === Number(usuarioActual.id);
    const inicial = (usuario.nombre || '?').charAt(0).toUpperCase();
    const rolTexto = rolLabels[usuario.rol] || usuario.rol;
    const rolIcono = rolIconos[usuario.rol] || 'ðŸ‘¤';

    return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="user-avatar ${esAdmin ? 'avatar-admin' : ''}">${inicial}</div>
            <div>
              <strong>${escapeHtml(usuario.nombre)}</strong>
              <small>${esUsuarioActual ? 'Tu cuenta' : 'Cuenta del sistema'}</small>
            </div>
          </div>
        </td>
        <td class="correo-cell">${escapeHtml(usuario.correo)}</td>
        <td>${renderRol(usuario, esAdmin)}</td>
        <td>
          <span class="status-badge ${usuario.activo ? 'status-active' : 'status-inactive'}">
            ${usuario.activo ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>
          <div class="admin-row-actions">
            ${esAdmin
              ? `<span class="protected-pill">ðŸ”’ Protegido</span>`
              : renderBotonEstado(usuario)
            }
          </div>
        </td>
      </tr>
    `;

    function renderRol(usuarioFila, protegido) {
      if (protegido) {
        return `<span class="role-badge role-${usuarioFila.rol}">${rolIcono} ${rolTexto}</span>`;
      }

      return `
        <select class="role-select" onchange="cambiarRol(${usuarioFila.id}, this.value)">
          <option value="comprador" ${usuarioFila.rol === 'comprador' ? 'selected' : ''}>ðŸ›ï¸ Comprador</option>
          <option value="vendedor" ${usuarioFila.rol === 'vendedor' ? 'selected' : ''}>ðŸª Vendedor</option>
        </select>
      `;
    }
  }).join('');
}

function renderBotonEstado(usuario) {
  if (usuario.activo) {
    return `<button class="btn-admin-danger" onclick="cambiarEstado(${usuario.id}, false)">Desactivar</button>`;
  }

  return `<button class="btn-admin-success" onclick="cambiarEstado(${usuario.id}, true)">Activar</button>`;
}

async function cambiarRol(id, rol) {
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_URL}/admin/usuarios/${id}/rol`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ rol })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarMensaje(data.error || 'Error al cambiar rol', 'error');
      await cargarUsuarios();
      return;
    }

    mostrarMensaje(data.message || 'Rol actualizado correctamente', 'ok');
    await cargarUsuarios();
  } catch (error) {
    console.error(error);
    mostrarMensaje('Error de conexiÃ³n al cambiar rol', 'error');
    await cargarUsuarios();
  }
}

async function cambiarEstado(id, activo) {
  const token = localStorage.getItem('token');
  const accion = activo ? 'activar' : 'desactivar';

  const confirmar = confirm(`Â¿Seguro que deseas ${accion} este usuario?`);
  if (!confirmar) {
    return;
  }

  try {
    const res = await fetch(`${API_URL}/admin/usuarios/${id}/estado`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ activo })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarMensaje(data.error || 'Error al cambiar estado', 'error');
      return;
    }

    mostrarMensaje(data.message || 'Estado actualizado correctamente', 'ok');
    await cargarUsuarios();
  } catch (error) {
    console.error(error);
    mostrarMensaje('Error de conexiÃ³n al cambiar estado', 'error');
  }
}

async function crearVendedor(event) {
  event.preventDefault();

  const token = localStorage.getItem('token');
  const nombre = document.getElementById('nombreVendedor').value.trim();
  const correo = document.getElementById('correoVendedor').value.trim();
  const password = document.getElementById('passwordVendedor').value;

  if (!nombre || !correo || !password) {
    mostrarMensaje('Completa nombre, correo y contraseÃ±a', 'error');
    return;
  }

  if (password.length < 6) {
    mostrarMensaje('La contraseÃ±a debe tener al menos 6 caracteres', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/admin/vendedores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ nombre, correo, password })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarMensaje(data.error || 'Error al registrar vendedor', 'error');
      return;
    }

    mostrarMensaje('Vendedor creado correctamente', 'ok');
    document.getElementById('formRegistroVendedor').reset();
    await cargarUsuarios();
  } catch (error) {
    console.error(error);
    mostrarMensaje('Error de conexiÃ³n al registrar vendedor', 'error');
  }
}

function mostrarMensaje(texto, tipo = 'ok') {
  const mensaje = document.getElementById('mensajeAdmin');
  if (!mensaje) return;

  mensaje.hidden = false;
  mensaje.textContent = texto;
  mensaje.className = `admin-message ${tipo === 'error' ? 'admin-message-error' : 'admin-message-ok'}`;

  setTimeout(() => {
    mensaje.hidden = true;
  }, 3500);
}

function escapeHtml(texto) {
  return String(texto || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
}

