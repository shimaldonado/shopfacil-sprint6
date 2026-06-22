const API_DETALLE = window.SHOPFACIL_API_URL || 'http://localhost:3000/api';

let productoActual = null;
let productoFavorito = false;

function construirNavbarDetalle() {
  const nav = document.getElementById('nav-links-detalle');
  if (!nav) return;

  const usuario = JSON.parse(localStorage.getItem('usuario'));
  let enlaces = '<a href="index.html">Catálogo</a>';

  if (!usuario) {
    enlaces += '<a href="login.html">Iniciar sesión</a>';
  } else if (usuario.rol === 'comprador') {
    enlaces += '<a href="carrito.html">Mi carrito</a>';
    enlaces += '<a href="pedidos.html">Mis pedidos</a>';
    enlaces += '<a href="notificaciones.html" class="notificacion-link">Notificaciones</a>';
    enlaces += '<a href="#" onclick="cerrarSesion()">Cerrar sesión</a>';
  } else if (usuario.rol === 'vendedor') {
    enlaces += '<a href="agregar-producto.html">+ Agregar producto</a>';
    enlaces += '<a href="notificaciones.html" class="notificacion-link">Notificaciones</a>';
    enlaces += '<a href="panel-vendedor.html">Panel vendedor</a>';
    enlaces += '<a href="#" onclick="cerrarSesion()">Cerrar sesión</a>';
  } else if (usuario.rol === 'admin') {
    enlaces += '<a href="admin.html">Panel admin</a>';
    enlaces += '<a href="#" onclick="cerrarSesion()">Cerrar sesión</a>';
  }

  nav.innerHTML = enlaces;
  if (typeof sfActualizarNotificaciones === 'function') {
    setTimeout(() => sfActualizarNotificaciones(true), 200);
  }
}

let colorSeleccionado = null;
let tallaSeleccionada = null;

window.onload = function () {
  construirNavbarDetalle();
  cargarDetalleProducto();
};

function corregirTexto(texto) {
  if (!texto) return '';

  return String(texto)
    .replaceAll('Ã¡', 'á')
    .replaceAll('Ã©', 'é')
    .replaceAll('Ã­', 'í')
    .replaceAll('Ã³', 'ó')
    .replaceAll('Ãº', 'ú')
    .replaceAll('Ã±', 'ñ')
    .replaceAll('ÃÁ', 'Á')
    .replaceAll('Ã‰', 'É')
    .replaceAll('Ã“', 'Ó')
    .replaceAll('algodÃ³n', 'algodón')
    .replaceAll('PantalÃ³n', 'Pantalón')
    .replaceAll('descripciÃ³n', 'descripción');
}

async function leerJSONSeguro(res) {
  const contentType = res.headers.get('content-type');

  if (!contentType || !contentType.includes('application/json')) {
    return null;
  }

  return await res.json();
}

function limpiarTextoParaJS(texto) {
  return String(texto || '')
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('"', '&quot;');
}

function escaparHTML(texto) {
  return corregirTexto(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function obtenerImagenes(producto) {
  if (producto.imagenes && Array.isArray(producto.imagenes)) {
    const urls = producto.imagenes
      .map(img => typeof img === 'string' ? img : img.url)
      .filter(Boolean);

    if (urls.length > 0) return urls;
  }

  if (producto.imagenes && typeof producto.imagenes === 'string') {
    const urls = producto.imagenes
      .split(',')
      .map(img => img.trim())
      .filter(img => img.length > 0);

    if (urls.length > 0) return urls;
  }

  if (producto.imagen) {
    return [producto.imagen];
  }

  return ['https://via.placeholder.com/650x650?text=Sin+imagen'];
}

function esVarianteActiva(variante) {
  return variante.activo === true ||
    variante.activo === 1 ||
    variante.activo === '1' ||
    variante.activo === 'true';
}

// HU-18/HU-19: solo se consideran variantes activas y con stock.
function variantesDisponibles() {
  if (!productoActual || !Array.isArray(productoActual.variantes)) return [];

  return productoActual.variantes.filter(v =>
    esVarianteActiva(v) && Number(v.stock) > 0
  );
}

function valoresUnicos(lista) {
  return [...new Set(lista.filter(Boolean))];
}

function obtenerColoresGlobales() {
  return valoresUnicos(variantesDisponibles().map(v => v.color));
}

function obtenerTallasGlobales() {
  return valoresUnicos(variantesDisponibles().map(v => v.talla));
}

function obtenerTallasPorColor(color) {
  return valoresUnicos(
    variantesDisponibles()
      .filter(v => !color || v.color === color)
      .map(v => v.talla)
  );
}

function obtenerColoresPorTalla(talla) {
  return valoresUnicos(
    variantesDisponibles()
      .filter(v => !talla || v.talla === talla)
      .map(v => v.color)
  );
}

function existeCombinacionDisponible(color, talla) {
  return variantesDisponibles().some(v => {
    const coincideColor = !color || v.color === color;
    const coincideTalla = !talla || v.talla === talla;
    return coincideColor && coincideTalla;
  });
}

function obtenerVarianteSeleccionada() {
  const variantes = variantesDisponibles();

  if (variantes.length === 0) return null;

  return variantes.find(v => {
    const coincideTalla = !tallaSeleccionada || v.talla === tallaSeleccionada;
    const coincideColor = !colorSeleccionado || v.color === colorSeleccionado;
    return coincideTalla && coincideColor;
  }) || null;
}

function calcularStockDisponible() {
  const variantes = variantesDisponibles();

  if (variantes.length === 0) {
    return Number(productoActual?.stock || 0);
  }

  const varianteExacta = obtenerVarianteSeleccionada();

  if (varianteExacta && colorSeleccionado && tallaSeleccionada) {
    return Number(varianteExacta.stock || 0);
  }

  const variantesFiltradas = variantes.filter(v => {
    const coincideColor = !colorSeleccionado || v.color === colorSeleccionado;
    const coincideTalla = !tallaSeleccionada || v.talla === tallaSeleccionada;
    return coincideColor && coincideTalla;
  });

  return variantesFiltradas.reduce((total, v) => total + Number(v.stock || 0), 0);
}

function generarBotonesColores() {
  const colores = obtenerColoresGlobales();

  return colores.map(color => {
    const habilitado = existeCombinacionDisponible(color, tallaSeleccionada);
    const seleccionado = colorSeleccionado === color;
    const colorSeguro = limpiarTextoParaJS(color);

    return `
      <button
        class="opcion-btn ${seleccionado ? 'seleccionada' : ''} ${!habilitado ? 'deshabilitada' : ''}"
        ${habilitado ? `onclick="seleccionarColor('${colorSeguro}')"` : 'disabled'}
      >
        ${color}
      </button>
    `;
  }).join('');
}

function generarBotonesTallas() {
  const tallas = obtenerTallasGlobales();

  return tallas.map(talla => {
    const habilitado = existeCombinacionDisponible(colorSeleccionado, talla);
    const seleccionado = tallaSeleccionada === talla;
    const tallaSegura = limpiarTextoParaJS(talla);

    return `
      <button
        class="opcion-btn ${seleccionado ? 'seleccionada' : ''} ${!habilitado ? 'deshabilitada' : ''}"
        ${habilitado ? `onclick="seleccionarTalla('${tallaSegura}')"` : 'disabled'}
      >
        ${talla}
      </button>
    `;
  }).join('');
}

function renderizarOpcionesVariantes() {
  const coloresContenedor = document.getElementById('lista-colores');
  const tallasContenedor = document.getElementById('lista-tallas');

  if (coloresContenedor) {
    coloresContenedor.innerHTML = generarBotonesColores();
  }

  if (tallasContenedor) {
    tallasContenedor.innerHTML = generarBotonesTallas();
  }
}

function actualizarStockYCantidad() {
  const stockDisponible = calcularStockDisponible();
  const stockDiv = document.getElementById('stock-disponible');
  const cantidadSelect = document.getElementById('cantidad');

  if (stockDiv) {
    stockDiv.textContent = `Stock disponible: ${stockDisponible} unidades`;
  }

  if (cantidadSelect) {
    cantidadSelect.innerHTML = generarOpcionesCantidad(stockDisponible);
  }
}

async function cargarDetalleProducto() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const puedeComprar = usuario && usuario.rol === 'comprador';

  if (!id) {
    document.getElementById('detalle-producto').innerHTML =
      '<p>Producto no encontrado.</p>';
    return;
  }

  try {
    const res = await fetch(`${API_DETALLE}/productos/${id}`);
    const producto = await res.json();

    if (!res.ok || !producto) {
      document.getElementById('detalle-producto').innerHTML =
        '<p>Producto no encontrado.</p>';
      return;
    }

    productoActual = producto;
    productoFavorito = puedeComprar ? await consultarFavoritoProducto(producto.id) : false;
    colorSeleccionado = null;
    tallaSeleccionada = null;

    const imagenes = obtenerImagenes(producto);
    const colores = obtenerColoresGlobales();
    const tallas = obtenerTallasGlobales();
    const stockInicial = calcularStockDisponible();

    document.getElementById('detalle-producto').innerHTML = `
      <div class="detalle-temu">
        <div class="detalle-galeria">
          <div class="miniaturas">
            ${imagenes.map((img, index) => `
              <img 
                src="${img}" 
                alt="Vista ${index + 1}" 
                onclick="cambiarImagenPrincipal('${limpiarTextoParaJS(img)}', this)"
                class="${index === 0 ? 'activa' : ''}"
                onerror="this.src='https://via.placeholder.com/120x120?text=Sin+imagen'"
              >
            `).join('')}
          </div>

          <div class="imagen-principal-box">
            <img 
              id="imagen-principal"
              src="${imagenes[0]}"
              alt="${corregirTexto(producto.nombre)}"
              onerror="this.src='https://via.placeholder.com/650x650?text=Sin+imagen'"
            >
          </div>
        </div>

        <div class="detalle-info-temu">
          <h2>${corregirTexto(producto.nombre)}</h2>

          <div class="detalle-precio-temu">
            $${parseFloat(producto.precio).toFixed(2)}
          </div>

          <div id="stock-disponible" class="detalle-stock-temu">
            Stock disponible: ${stockInicial} unidades
          </div>

          ${colores.length > 0 ? `
            <div class="opciones-box">
              <h4>Color:</h4>
              <div id="lista-colores" class="opciones-lista"></div>
            </div>
          ` : ''}

          ${tallas.length > 0 ? `
            <div class="opciones-box">
              <div class="opciones-header">
                <h4>Talla:</h4>
                <span class="guia-tallas">📏 Guía de tallas</span>
              </div>

              <div id="lista-tallas" class="opciones-lista"></div>
            </div>
          ` : ''}

          ${
            puedeComprar
              ? `
                <div class="cantidad-box-temu">
                  <label>Cant.</label>
                  <select id="cantidad">
                    ${generarOpcionesCantidad(stockInicial)}
                  </select>
                </div>

                <div class="detalle-acciones-compra">
                  <button class="btn-favorito-detalle ${productoFavorito ? 'activo' : ''}" onclick="toggleFavoritoDetalle(${producto.id})">
                    ${productoFavorito ? '❤️ Guardado en favoritos' : '🤍 Guardar en favoritos'}
                  </button>
                  <button class="btn-agregar-temu" onclick="agregarAlCarrito(${producto.id})">
                    Agregar al carrito
                  </button>
                </div>
              `
              : `
                <div class="mensaje-info">
                  ${
                    usuario
                      ? 'Este producto solo puede ser agregado al carrito por compradores.'
                      : 'Inicia sesión como comprador para agregar este producto al carrito.'
                  }
                </div>
              `
          }

          <div class="beneficios-producto">
            <p>✅ Pagos seguros</p>
            <p>🚚 Entrega gestionada por ShopFácil</p>
            <p>🛡️ Garantía de pedido</p>
          </div>

          <div class="descripcion-completa">
            <h3>Descripción del producto</h3>
            <p>${corregirTexto(producto.descripcion || 'Sin descripción disponible.')}</p>
          </div>
        </div>
      </div>

      <section class="comentarios-card">
        <div class="comentarios-header">
          <h3>Comentarios y calificación</h3>
          <div id="promedio-calificacion" class="promedio-calificacion">Sin calificaciones</div>
        </div>

        ${puedeComprar ? `
          <div class="form-comentario">
            <label>Tu calificación:</label>
            <select id="calificacion">
              <option value="5">⭐⭐⭐⭐⭐</option>
              <option value="4">⭐⭐⭐⭐</option>
              <option value="3">⭐⭐⭐</option>
              <option value="2">⭐⭐</option>
              <option value="1">⭐</option>
            </select>
            <textarea id="comentario" rows="3" placeholder="Escribe tu experiencia con el producto..."></textarea>
            <button class="btn-primary" onclick="enviarComentario(${producto.id})">Publicar comentario</button>
          </div>
        ` : `
          <p class="mensaje-info">Inicia sesión como comprador para comentar y calificar.</p>
        `}

        <div id="lista-comentarios" class="lista-comentarios">Cargando comentarios...</div>
      </section>

      <section class="comentarios-card preguntas-card">
        <div class="comentarios-header">
          <h3>Preguntas al vendedor</h3>
          <div class="promedio-calificacion">Sprint 5</div>
        </div>

        ${puedeComprar ? `
          <div class="form-comentario">
            <label>Pregunta sobre el producto:</label>
            <textarea id="pregunta-producto" rows="3" placeholder="Ej.: ¿La talla es normal o viene reducida?"></textarea>
            <button class="btn-primary" onclick="enviarPreguntaProducto(${producto.id})">Enviar pregunta</button>
          </div>
        ` : `
          <p class="mensaje-info">Inicia sesión como comprador para preguntar al vendedor.</p>
        `}

        <div id="lista-preguntas-producto" class="lista-preguntas-producto">Cargando preguntas...</div>
      </section>
    `;

    renderizarOpcionesVariantes();
    actualizarStockYCantidad();
    cargarComentariosProducto(producto.id);
    cargarPreguntasProducto(producto.id);

  } catch (error) {
    console.error(error);
    document.getElementById('detalle-producto').innerHTML =
      '<p>Error al cargar el producto.</p>';
  }
}

function generarOpcionesCantidad(stock) {
  const max = Math.min(Number(stock || 0), 10);
  let opciones = '';

  if (max <= 0) {
    return '<option value="0">0</option>';
  }

  for (let i = 1; i <= max; i++) {
    opciones += `<option value="${i}">${i}</option>`;
  }

  return opciones;
}

function cambiarImagenPrincipal(src, elemento) {
  document.getElementById('imagen-principal').src = src;

  document.querySelectorAll('.miniaturas img').forEach(img => {
    img.classList.remove('activa');
  });

  elemento.classList.add('activa');
}

function seleccionarColor(color) {
  colorSeleccionado = color;

  if (tallaSeleccionada && !existeCombinacionDisponible(colorSeleccionado, tallaSeleccionada)) {
    tallaSeleccionada = null;
  }

  renderizarOpcionesVariantes();
  actualizarStockYCantidad();
}

function seleccionarTalla(talla) {
  tallaSeleccionada = talla;

  if (colorSeleccionado && !existeCombinacionDisponible(colorSeleccionado, tallaSeleccionada)) {
    colorSeleccionado = null;
  }

  renderizarOpcionesVariantes();
  actualizarStockYCantidad();
}


// ================================
// HU-30: Favoritos desde detalle
// ================================
async function consultarFavoritoProducto(productoId) {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const res = await fetch(`${API_DETALLE}/favoritos/${productoId}/estado`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.favorito);
  } catch (_) {
    return false;
  }
}

async function toggleFavoritoDetalle(productoId) {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario'));

  if (!usuario || usuario.rol !== 'comprador' || !token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch(`${API_DETALLE}/favoritos/${productoId}`, {
      method: productoFavorito ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar favoritos');

    productoFavorito = !productoFavorito;
    mostrarAvisoDetalle(productoFavorito ? 'Producto guardado en favoritos' : 'Producto eliminado de favoritos', productoFavorito ? 'exito' : 'info');
    cargarDetalleProducto();
  } catch (error) {
    mostrarAvisoDetalle(error.message || 'Error al actualizar favoritos', 'error');
  }
}


function mostrarAvisoDetalle(mensaje, tipo = 'info', subtexto = '') {
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
  toast.innerHTML = `<div>${escaparHTML(mensaje)}</div>${subtexto ? `<small style="display:block;margin-top:4px;font-weight:400;">${escaparHTML(subtexto)}</small>` : ''}`;
  contenedor.appendChild(toast);
  setTimeout(() => toast.remove(), 3800);
}

// ================================
// Agregar al carrito
// ================================
async function agregarAlCarrito(productoId) {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const cantidadSelect = document.getElementById('cantidad');

  if (!token || !usuario) {
    mostrarAvisoDetalle('Debes iniciar sesión para agregar productos al carrito', 'info');
    window.location.href = 'login.html';
    return;
  }

  if (usuario.rol !== 'comprador') {
    mostrarAvisoDetalle('Solo los compradores pueden agregar productos al carrito', 'error');
    return;
  }

  const variantes = variantesDisponibles();
  const tallas = obtenerTallasGlobales();
  const colores = obtenerColoresGlobales();

  if (variantes.length > 0) {
    if (colores.length > 0 && !colorSeleccionado) {
      mostrarAvisoDetalle('Selecciona un color antes de agregar al carrito', 'info');
      return;
    }

    if (tallas.length > 0 && !tallaSeleccionada) {
      mostrarAvisoDetalle('Selecciona una talla antes de agregar al carrito', 'info');
      return;
    }
  }

  const varianteSeleccionada = obtenerVarianteSeleccionada();

  if (variantes.length > 0 && !varianteSeleccionada) {
    mostrarAvisoDetalle('La combinación seleccionada no está disponible', 'error');
    return;
  }

  const cantidad = cantidadSelect ? parseInt(cantidadSelect.value) : 1;
  const stockDisponible = varianteSeleccionada
    ? Number(varianteSeleccionada.stock)
    : Number(productoActual.stock);

  if (!cantidad || cantidad <= 0) {
    mostrarAvisoDetalle('Selecciona una cantidad válida', 'error');
    return;
  }

  if (cantidad > stockDisponible) {
    mostrarAvisoDetalle('Stock insuficiente', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_DETALLE}/carrito/agregar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        producto_id: productoId,
        cantidad,
        variante_id: varianteSeleccionada ? varianteSeleccionada.id : null,
        talla: tallaSeleccionada,
        color: colorSeleccionado
      })
    });

    const data = await leerJSONSeguro(res);

    if (res.ok) {
      mostrarAvisoDetalle('Producto agregado al carrito', 'carrito', productoActual?.nombre || 'Listo para comprar');
      setTimeout(() => { window.location.href = 'carrito.html'; }, 900);
    } else {
      mostrarAvisoDetalle(data?.error || 'Error al agregar al carrito', 'error');
    }

  } catch (error) {
    console.error(error);
    mostrarAvisoDetalle('No se pudo conectar con el servidor', 'error');
  }
}


// ================================
// HU-20: Comentarios y calificación por estrellas
// ================================
function pintarEstrellas(valor) {
  const numero = Number(valor || 0);
  return '⭐'.repeat(numero) + '☆'.repeat(Math.max(0, 5 - numero));
}

async function cargarComentariosProducto(productoId) {
  const contenedor = document.getElementById('lista-comentarios');
  const promedioDiv = document.getElementById('promedio-calificacion');

  if (!contenedor) return;

  try {
    const res = await fetch(`${API_DETALLE}/productos/${productoId}/comentarios`);
    const comentarios = await res.json();

    if (!res.ok || !Array.isArray(comentarios)) {
      contenedor.innerHTML = '<p>No se pudieron cargar los comentarios.</p>';
      return;
    }

    if (comentarios.length === 0) {
      if (promedioDiv) promedioDiv.textContent = 'Sin calificaciones';
      contenedor.innerHTML = '<p>Aún no hay comentarios para este producto.</p>';
      return;
    }

    const promedio = comentarios.reduce((suma, c) => suma + Number(c.calificacion || 0), 0) / comentarios.length;

    if (promedioDiv) {
      promedioDiv.textContent = `${promedio.toFixed(1)} / 5 ⭐ (${comentarios.length})`;
    }

    contenedor.innerHTML = comentarios.map(c => `
      <div class="comentario-item">
        <div class="comentario-top">
          <strong>${escaparHTML(c.usuario || 'Usuario')}</strong>
          <span>${pintarEstrellas(c.calificacion)}</span>
        </div>
        <p>${escaparHTML(c.comentario || '')}</p>
      </div>
    `).join('');
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = '<p>Error al cargar comentarios.</p>';
  }
}

async function enviarComentario(productoId) {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const calificacion = document.getElementById('calificacion')?.value;
  const comentario = document.getElementById('comentario')?.value.trim();

  if (!token || !usuario || usuario.rol !== 'comprador') {
    mostrarAvisoDetalle('Solo los compradores registrados pueden comentar', 'error');
    return;
  }

  if (!comentario) {
    mostrarAvisoDetalle('Escribe un comentario antes de publicar', 'info');
    return;
  }

  try {
    const res = await fetch(`${API_DETALLE}/productos/${productoId}/comentarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ calificacion, comentario })
    });

    const data = await leerJSONSeguro(res);

    if (!res.ok) {
      mostrarAvisoDetalle(data?.error || 'No se pudo registrar el comentario', 'error');
      return;
    }

    document.getElementById('comentario').value = '';
    mostrarAvisoDetalle('Comentario registrado correctamente', 'exito');
    cargarComentariosProducto(productoId);
  } catch (error) {
    console.error(error);
    mostrarAvisoDetalle('No se pudo conectar con el servidor', 'error');
  }
}


// ================================
// HU-28: Preguntas al vendedor sobre un producto
// ================================
async function cargarPreguntasProducto(productoId) {
  const contenedor = document.getElementById('lista-preguntas-producto');
  if (!contenedor) return;

  try {
    const res = await fetch(`${API_DETALLE}/preguntas/producto/${productoId}`);
    const preguntas = await res.json();

    if (!res.ok || !Array.isArray(preguntas)) {
      contenedor.innerHTML = '<p>No se pudieron cargar las preguntas.</p>';
      return;
    }

    if (preguntas.length === 0) {
      contenedor.innerHTML = '<p>Aún no existen preguntas sobre este producto.</p>';
      return;
    }

    contenedor.innerHTML = preguntas.map(p => `
      <div class="pregunta-producto-item">
        <div class="pregunta-producto-top">
          <strong>${escaparHTML(p.comprador || 'Comprador')}</strong>
          <span>${p.respuesta ? 'Respondida' : 'Pendiente'}</span>
        </div>
        <p><strong>Pregunta:</strong> ${escaparHTML(p.pregunta)}</p>
        ${p.respuesta ? `<p class="respuesta-texto"><strong>Respuesta del vendedor:</strong> ${escaparHTML(p.respuesta)}</p>` : '<p class="respuesta-pendiente">El vendedor aún no responde.</p>'}
      </div>
    `).join('');
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = '<p>Error al cargar preguntas.</p>';
  }
}

async function enviarPreguntaProducto(productoId) {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const textarea = document.getElementById('pregunta-producto');
  const pregunta = textarea ? textarea.value.trim() : '';

  if (!token || !usuario || usuario.rol !== 'comprador') {
    mostrarAvisoDetalle('Solo los compradores registrados pueden enviar preguntas', 'error');
    return;
  }

  if (!pregunta || pregunta.length < 5) {
    mostrarAvisoDetalle('Escribe una pregunta válida', 'info', 'La pregunta debe tener al menos 5 caracteres.');
    return;
  }

  try {
    const res = await fetch(`${API_DETALLE}/preguntas/producto/${productoId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ pregunta })
    });

    const data = await leerJSONSeguro(res);

    if (!res.ok) {
      mostrarAvisoDetalle(data?.error || 'No se pudo enviar la pregunta', 'error');
      return;
    }

    textarea.value = '';
    mostrarAvisoDetalle('Pregunta enviada al vendedor', 'exito');
    cargarPreguntasProducto(productoId);
  } catch (error) {
    console.error(error);
    mostrarAvisoDetalle('No se pudo conectar con el servidor', 'error');
  }
}
