

let todosLosProductos = [];
let favoritosIds = new Set();

function corregirTexto(texto) {
  if (!texto) return '';
  return String(texto)
    .replaceAll('Ã¡', 'á').replaceAll('Ã©', 'é').replaceAll('Ã­', 'í')
    .replaceAll('Ã³', 'ó').replaceAll('Ãº', 'ú').replaceAll('Ã±', 'ñ')
    .replaceAll('ÃÁ', 'Á').replaceAll('Ã‰', 'É').replaceAll('Ã"', 'Ó')
    .replaceAll('algodÃ³n', 'algodón').replaceAll('PantalÃ³n', 'Pantalón')
    .replaceAll('descripciÃ³n', 'descripción');
}

function escaparHTML(texto) {
  return corregirTexto(texto)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

// ================================
// Navbar según sesión
// ================================
function cargarNavbar() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const navLinks = document.querySelector('.nav-links');

  if (usuario) {
    const navUsuario = document.getElementById('nav-usuario');
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const btnAgregar = document.getElementById('btn-agregar');

    //if (navUsuario) navUsuario.textContent = `Hola, ${usuario.nombre}`;
    if (navUsuario) navUsuario.textContent = 'Hola, ' + corregirTexto(usuario.nombre);
    if (btnLogin) btnLogin.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'inline';

    if (
      usuario.rol === 'comprador' &&
      navLinks &&
      !document.getElementById('btn-carrito')
    ) {
      navLinks.insertAdjacentHTML('beforeend', `
        <a href="carrito.html" id="btn-carrito" class="carrito-link">
          🛒 Mi carrito
          <span id="carrito-contador" class="carrito-badge">0</span>
        </a>
        <a href="pedidos.html" id="btn-pedidos">Mis pedidos</a>
        <a href="facturas.html" id="btn-facturas">Mis facturas</a>
        <a href="favoritos.html" id="btn-favoritos">Favoritos</a>
        <a href="notificaciones.html" id="btn-notificaciones" class="notificacion-link">Notificaciones</a>
      `);
    }

    if (usuario.rol === 'vendedor') {
      if (btnAgregar) btnAgregar.style.display = 'inline';
      if (navLinks && !document.getElementById('btn-panel-vendedor')) {
        navLinks.insertAdjacentHTML('beforeend', `
          <a href="notificaciones.html" id="btn-notificaciones" class="notificacion-link">Notificaciones</a>
          <a href="panel-vendedor.html" id="btn-panel-vendedor">Panel vendedor</a>
        `);
      }
    }

    if (usuario.rol === 'admin') {
      if (btnAgregar) btnAgregar.style.display = 'none';
      if (navLinks && !document.getElementById('btn-panel-admin')) {
        navLinks.insertAdjacentHTML('beforeend', `
          <a href="admin.html" id="btn-panel-admin">Panel admin</a>
        `);
      }
    }

    actualizarContadorCarrito();
    if (typeof sfActualizarNotificaciones === 'function') {
      setTimeout(() => sfActualizarNotificaciones(true), 300);
    }
  }
}

// ================================
// Contador del carrito
// ================================
async function actualizarContadorCarrito() {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const contador = document.getElementById('carrito-contador');

  if (!token || !contador || !usuario || usuario.rol !== 'comprador') return;

  try {
    const res = await fetch(`${API}/carrito`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) { contador.style.display = 'none'; return; }

    const items = Array.isArray(data) ? data : data.items;
    if (!Array.isArray(items)) { contador.style.display = 'none'; return; }

    const totalItems = items.reduce((total, item) => total + Number(item.cantidad || 0), 0);

    if (totalItems > 0) {
      contador.textContent = totalItems > 99 ? '99+' : totalItems;
      contador.style.display = 'inline-flex';
    } else {
      contador.style.display = 'none';
    }
  } catch (error) {
    contador.style.display = 'none';
  }
}

// ================================
// Cargar catálogo completo
// ================================
async function cargarProductos() {
  const catalogo = document.getElementById('catalogo');
  try {
    catalogo.innerHTML = '<p>Cargando productos...</p>';
    const res = await fetch(`${API}/productos`);
    if (!res.ok) throw new Error('Error al obtener productos');
    const productos = await res.json();
    await cargarFavoritosIds();
    todosLosProductos = productos;
    mostrarProductos(productos);
  } catch (error) {
    catalogo.innerHTML = '<p>Error al cargar productos.</p>';
  }
}

// ================================
// Mostrar productos
// ================================
function mostrarProductos(productos) {
  const catalogo = document.getElementById('catalogo');
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const puedeComprar = usuario && usuario.rol === 'comprador';

  if (!productos || productos.length === 0) {
    catalogo.innerHTML = '<p>No se encontraron productos.</p>';
    return;
  }

  catalogo.innerHTML = productos.map((p, index) => {
    const nombre = escaparHTML(p.nombre);
    const descripcion = escaparHTML(p.descripcion || 'Sin descripción');
    const imagen = p.imagen || 'https://via.placeholder.com/500x400?text=Sin+imagen';
    const precio = Number(p.precio || 0).toFixed(2);
    const stock = Number(p.stock || 0);

    return `
      <div class="producto-card">
        <div class="producto-imagen-box" onclick="verDetalle(${p.id})">
          <img
            src="${imagen}"
            alt="${nombre}"
            loading="${index < 4 ? 'eager' : 'lazy'}"
            decoding="async"
            onerror="this.src='https://via.placeholder.com/500x400?text=Sin+imagen'"
          >
        </div>
        <div class="producto-info">
          <h3 onclick="verDetalle(${p.id})" title="${nombre}">${nombre}</h3>
          <p class="producto-descripcion" title="${descripcion}">${descripcion}</p>
          <div class="precio">$${precio}</div>
          <div class="stock">Stock: ${stock} unidades</div>
          <div class="producto-acciones">
            ${puedeComprar ? `
              <button class="btn" onclick="agregarAlCarrito(${p.id}, '${nombre.replace(/'/g, "\\'")}')">
                Agregar
              </button>
            ` : ''}
            <button class="btn-secundario" onclick="verDetalle(${p.id})">Ver detalle</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function verDetalle(id) {
  window.location.href = `detalle-producto.html?id=${id}`;
}


function mostrarAvisoCatalogo(mensaje, tipo = 'info', subtexto = '') {
  if (typeof sfToast === 'function') {
    sfToast(mensaje, tipo, subtexto);
    return;
  }
  let contenedor = document.getElementById('sf-toast-container-fallback');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = 'sf-toast-container-fallback';
    contenedor.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(contenedor);
  }
  const esError = tipo === 'error';
  const toast = document.createElement('div');
  toast.style.cssText = `background:${esError ? '#FAECE7' : '#EAF3DE'};border:1.5px solid ${esError ? '#712B13' : '#27500A'};color:${esError ? '#712B13' : '#27500A'};border-radius:12px;padding:14px 18px;min-width:280px;max-width:380px;box-shadow:0 4px 18px rgba(0,0,0,.14);font-family:Segoe UI,Arial,sans-serif;font-weight:600;`;
  toast.textContent = mensaje;
  if (subtexto) {
    const small = document.createElement('small');
    small.textContent = subtexto;
    small.style.cssText = 'display:block;margin-top:4px;font-weight:400;';
    toast.appendChild(small);
  }
  contenedor.appendChild(toast);
  setTimeout(() => toast.remove(), 3800);
}

// ================================
// Agregar al carrito — con toast bonito
// ================================
async function agregarAlCarrito(productoId, nombreProducto) {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const token = localStorage.getItem('token');

  if (!usuario || !token) {
    window.location.href = 'login.html';
    return;
  }
  if (usuario.rol !== 'comprador') {
    if (typeof sfToastError === 'function') {
      sfToastError('Solo los compradores pueden agregar productos al carrito');
    } else {
      mostrarAvisoCatalogo('Solo los compradores pueden agregar productos al carrito', 'error');
    }
    return;
  }

  try {
    const res = await fetch(`${API}/carrito/agregar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ producto_id: productoId, cantidad: 1 })
    });

    const data = await res.json();

    if (res.ok) {
      if (typeof sfToastCarrito === 'function') {
        sfToastCarrito(nombreProducto || '');
      } else {
        mostrarAvisoCatalogo('Producto agregado al carrito', 'carrito');
      }
      actualizarContadorCarrito();
    } else {
      if (typeof sfToastError === 'function') {
        sfToastError(data.error || 'Error al agregar al carrito');
      } else {
        mostrarAvisoCatalogo(data.error || 'Error al agregar al carrito', 'error');
      }
    }
  } catch (error) {
    if (typeof sfToastError === 'function') {
      sfToastError('No se pudo conectar con el servidor');
    } else {
      mostrarAvisoCatalogo('No se pudo conectar con el servidor', 'error');
    }
  }
}

// ================================
// Buscar y filtrar
// ================================
async function filtrar() {
  const nombre = document.getElementById('buscador')?.value.trim() || '';
  const precioMin = document.getElementById('precio-min')?.value || '';
  const precioMax = document.getElementById('precio-max')?.value || '';
  const categoria = document.getElementById('categoria')?.value || 'todos';

  const params = new URLSearchParams();
  if (nombre) params.append('nombre', nombre);
  if (precioMin) params.append('precio_min', precioMin);
  if (precioMax) params.append('precio_max', precioMax);
  if (categoria && categoria !== 'todos') params.append('categoria', categoria);

  try {
    const catalogo = document.getElementById('catalogo');
    catalogo.innerHTML = '<p>Cargando productos...</p>';
    const url = params.toString() ? `${API}/productos?${params.toString()}` : `${API}/productos`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al filtrar productos');
    const productos = await res.json();
    await cargarFavoritosIds();
    todosLosProductos = productos;
    mostrarProductos(productos);
  } catch (error) {
    document.getElementById('catalogo').innerHTML = '<p>Error al filtrar productos.</p>';
  }
}

function limpiarFiltros() {
  const buscador = document.getElementById('buscador');
  const precioMin = document.getElementById('precio-min');
  const precioMax = document.getElementById('precio-max');
  const categoria = document.getElementById('categoria');
  if (buscador) buscador.value = '';
  if (precioMin) precioMin.value = '';
  if (precioMax) precioMax.value = '';
  if (categoria) categoria.value = 'todos';
  cargarProductos();
}

// ================================
// HU-30: Favoritos
// ================================
async function cargarFavoritosIds() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const token = localStorage.getItem('token');

  if (!usuario || usuario.rol !== 'comprador' || !token) {
    favoritosIds = new Set();
    return;
  }

  try {
    const res = await fetch(`${API}/favoritos/ids`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      favoritosIds = new Set();
      return;
    }

    const ids = await res.json();
    favoritosIds = new Set((Array.isArray(ids) ? ids : []).map(Number));
  } catch (error) {
    favoritosIds = new Set();
  }
}

async function toggleFavorito(productoId) {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const token = localStorage.getItem('token');

  if (!usuario || usuario.rol !== 'comprador' || !token) {
    window.location.href = 'login.html';
    return;
  }

  const esFavorito = favoritosIds.has(Number(productoId));

  try {
    const res = await fetch(`${API}/favoritos/${productoId}`, {
      method: esFavorito ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar favoritos');

    if (esFavorito) {
      favoritosIds.delete(Number(productoId));
      if (typeof sfToastInfo === 'function') sfToastInfo('Producto quitado de favoritos');
    } else {
      favoritosIds.add(Number(productoId));
      if (typeof sfToastExito === 'function') sfToastExito('Producto guardado en favoritos');
    }

    mostrarProductos(todosLosProductos);
  } catch (error) {
    if (typeof sfToastError === 'function') sfToastError(error.message || 'Error al actualizar favoritos');
  }
}


cargarNavbar();
cargarProductos();