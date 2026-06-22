const API_CARRITO = window.SHOPFACIL_API_URL || 'http://localhost:3000/api';
const IVA_ECUADOR = 0.15;

const CIUDADES_POR_PROVINCIA = {
  'Azuay': ['Cuenca', 'Girón', 'Gualaceo', 'Nabón', 'Paute', 'Pucará', 'San Fernando', 'Santa Isabel', 'Sigsig', 'Oña', 'Chordeleg', 'El Pan', 'Sevilla de Oro', 'Guachapala', 'Camilo Ponce Enríquez'],
  'Bolívar': ['Guaranda', 'Chillanes', 'Chimbo', 'Echeandía', 'San Miguel', 'Caluma', 'Las Naves'],
  'Cañar': ['Azogues', 'Biblián', 'Cañar', 'La Troncal', 'El Tambo', 'Déleg', 'Suscal'],
  'Carchi': ['Tulcán', 'Bolívar', 'Espejo', 'Mira', 'Montúfar', 'San Pedro de Huaca'],
  'Chimborazo': ['Riobamba', 'Alausí', 'Colta', 'Chambo', 'Chunchi', 'Guamote', 'Guano', 'Pallatanga', 'Penipe', 'Cumandá'],
  'Cotopaxi': ['Latacunga', 'La Maná', 'Pangua', 'Pujilí', 'Salcedo', 'Saquisilí', 'Sigchos'],
  'El Oro': ['Machala', 'Arenillas', 'Atahualpa', 'Balsas', 'Chilla', 'El Guabo', 'Huaquillas', 'Marcabelí', 'Pasaje', 'Piñas', 'Portovelo', 'Santa Rosa', 'Zaruma', 'Las Lajas'],
  'Esmeraldas': ['Esmeraldas', 'Eloy Alfaro', 'Muisne', 'Quinindé', 'San Lorenzo', 'Atacames', 'Rioverde'],
  'Galápagos': ['San Cristóbal', 'Isabela', 'Santa Cruz'],
  'Guayas': ['Guayaquil', 'Alfredo Baquerizo Moreno', 'Balao', 'Balzar', 'Colimes', 'Daule', 'Durán', 'El Empalme', 'El Triunfo', 'Milagro', 'Naranjal', 'Naranjito', 'Palestina', 'Pedro Carbo', 'Samborondón', 'Santa Lucía', 'Salitre', 'San Jacinto de Yaguachi', 'Playas', 'Simón Bolívar', 'Coronel Marcelino Maridueña', 'Lomas de Sargentillo', 'Nobol', 'General Antonio Elizalde', 'Isidro Ayora'],
  'Imbabura': ['Ibarra', 'Antonio Ante', 'Cotacachi', 'Otavalo', 'Pimampiro', 'San Miguel de Urcuquí'],
  'Loja': ['Loja', 'Calvas', 'Catamayo', 'Celica', 'Chaguarpamba', 'Espíndola', 'Gonzanamá', 'Macará', 'Paltas', 'Puyango', 'Saraguro', 'Sozoranga', 'Zapotillo', 'Pindal', 'Quilanga', 'Olmedo'],
  'Los Ríos': ['Babahoyo', 'Baba', 'Montalvo', 'Puebloviejo', 'Quevedo', 'Urdaneta', 'Ventanas', 'Vinces', 'Palenque', 'Buena Fe', 'Valencia', 'Mocache', 'Quinsaloma'],
  'Manabí': ['Portoviejo', 'Bolívar', 'Chone', 'El Carmen', 'Flavio Alfaro', 'Jipijapa', 'Junín', 'Manta', 'Montecristi', 'Paján', 'Pichincha', 'Rocafuerte', 'Santa Ana', 'Sucre', 'Tosagua', '24 de Mayo', 'Pedernales', 'Olmedo', 'Puerto López', 'Jama', 'Jaramijó', 'San Vicente'],
  'Morona Santiago': ['Morona', 'Gualaquiza', 'Limón Indanza', 'Palora', 'Santiago', 'Sucúa', 'Huamboya', 'San Juan Bosco', 'Taisha', 'Logroño', 'Pablo Sexto', 'Tiwintza'],
  'Napo': ['Tena', 'Archidona', 'El Chaco', 'Quijos', 'Carlos Julio Arosemena Tola'],
  'Orellana': ['Francisco de Orellana', 'Aguarico', 'La Joya de los Sachas', 'Loreto'],
  'Pastaza': ['Pastaza', 'Mera', 'Santa Clara', 'Arajuno'],
  'Pichincha': ['Quito', 'Cayambe', 'Mejía', 'Pedro Moncayo', 'Rumiñahui', 'San Miguel de los Bancos', 'Pedro Vicente Maldonado', 'Puerto Quito'],
  'Santa Elena': ['Santa Elena', 'La Libertad', 'Salinas'],
  'Santo Domingo de los Tsáchilas': ['Santo Domingo', 'La Concordia'],
  'Sucumbíos': ['Lago Agrio', 'Gonzalo Pizarro', 'Putumayo', 'Shushufindi', 'Sucumbíos', 'Cascales', 'Cuyabeno'],
  'Tungurahua': ['Ambato', 'Baños de Agua Santa', 'Cevallos', 'Mocha', 'Patate', 'Quero', 'San Pedro de Pelileo', 'Santiago de Píllaro', 'Tisaleo'],
  'Zamora Chinchipe': ['Zamora', 'Chinchipe', 'Nangaritza', 'Yacuambi', 'Yantzaza', 'El Pangui', 'Centinela del Cóndor', 'Palanda', 'Paquisha']
};


// HU-22: dirección de entrega. La ubicación por mapa se dejó opcional para no bloquear compras.
let ubicacionSeleccionada = { latitud: null, longitud: null };

window.onload = function () {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const token = localStorage.getItem('token');

  if (!usuario || !token) {
    alert('Debes iniciar sesión para ver el carrito');
    window.location.href = 'login.html';
    return;
  }

  if (usuario.rol !== 'comprador') {
    document.getElementById('contenido-carrito').innerHTML = `
      <div class="vacio">
        <p style="font-size:48px;">🛒</p>
        <h3>El carrito es solo para compradores</h3>
        <p>Inicia sesión con una cuenta de comprador para realizar compras.</p>
        <a href="index.html" class="btn" style="display:inline-block;width:auto;padding:10px 24px;text-decoration:none;">Volver al catálogo</a>
      </div>
    `;
    return;
  }

  cargarCarrito();
};

function corregirTexto(texto) {
  return String(texto ?? '')
    .replaceAll('Ã¡', 'á')
    .replaceAll('Ã©', 'é')
    .replaceAll('Ã­', 'í')
    .replaceAll('Ã³', 'ó')
    .replaceAll('Ãº', 'ú')
    .replaceAll('Ã±', 'ñ')
    .replaceAll('Ãš', 'Ú')
    .replaceAll('PantalÃ³n', 'Pantalón')
    .replaceAll('algodÃ³n', 'algodón')
    .replaceAll('niÃ±os', 'niños')
    .replaceAll('aÃ±os', 'años')
    .replaceAll('CafÃ©', 'Café')
    .replaceAll('ShopFÃ¡cil', 'ShopFácil');
}

function escaparHTML(texto) {
  return corregirTexto(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function pagoTexto(metodo) {
  const textos = {
    contra_entrega: 'Pago contra entrega',
    transferencia: 'Transferencia bancaria',
    tarjeta_simulada: 'Tarjeta simulada'
  };
  return textos[metodo] || 'No registrado';
}

// ================================
// HU-07 / HU-08: Cargar carrito
// HU-22 / HU-23: Formulario de entrega y pago simulado
// ================================
async function cargarCarrito() {
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_CARRITO}/carrito`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    const div = document.getElementById('contenido-carrito');

    if (!res.ok) {
      div.innerHTML = `<p>${escaparHTML(data.error || 'Error al cargar carrito')}</p>`;
      return;
    }

    if (data.items.length === 0) {
      div.innerHTML = `
        <div class="vacio">
          <p style="font-size:48px;">🛒</p>
          <h3>Tu carrito está vacío</h3>
          <p>Agrega productos desde el catálogo.</p>
          <a href="index.html" class="btn" style="display:inline-block;width:auto;padding:10px 24px;text-decoration:none;">
            Ver catálogo
          </a>
        </div>
      `;
      return;
    }

    const totalBruto = parseFloat(data.total);
    const baseImponible = totalBruto / (1 + IVA_ECUADOR);
    const valorIva = totalBruto - baseImponible;

    div.innerHTML = `
      <table class="carrito-tabla">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Precio unit.</th>
            <th>Cantidad</th>
            <th>Subtotal</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>
                <b>${escaparHTML(item.nombre)}</b><br>
                <small>${escaparHTML(item.descripcion || '')}</small>
                ${item.talla || item.color ? `<br><small>Variante: ${escaparHTML(item.color || '')} ${escaparHTML(item.talla || '')}</small>` : ''}
              </td>
              <td>$${parseFloat(item.precio).toFixed(2)}</td>
              <td>
                <input
                  type="number"
                  class="cantidad-input"
                  min="1"
                  max="${item.stock}"
                  value="${item.cantidad}"
                  onchange="actualizarCantidad(${item.id}, this.value)"
                >
                <br><small>Stock: ${item.stock}</small>
              </td>
              <td><b>$${parseFloat(item.subtotal).toFixed(2)}</b></td>
              <td>
                <button class="btn-eliminar" onclick="eliminarItem(${item.id})">
                  Eliminar
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="checkout-card">
        <div class="checkout-header">
          <div>
            <h3>📍 Datos de entrega</h3>
            <p>Completa la información para que el vendedor pueda preparar el envío.</p>
          </div>
          <span class="checkout-badge">Sprint 4</span>
        </div>

        <div class="checkout-grid">
          <div class="checkout-field">
            <label>Provincia</label>
            <select id="entrega-provincia" onchange="cargarCiudadesPorProvincia()">
              <option value="">Selecciona una provincia</option>
            </select>
          </div>
          <div class="checkout-field">
            <label>Ciudad / Cantón</label>
            <select id="entrega-ciudad" disabled>
              <option value="">Primero selecciona una provincia</option>
            </select>
          </div>
          <div class="checkout-field checkout-full">
            <label>Dirección exacta</label>
            <input type="text" id="entrega-direccion" placeholder="Calle principal, número, sector">
          </div>
          <div class="checkout-field checkout-full">
            <label>Referencia</label>
            <input type="text" id="entrega-referencia" placeholder="Ej: Casa azul frente a la tienda">
          </div>
        </div>


        <div class="checkout-header checkout-header-secondary">
          <div>
            <h3>💳 Método de pago simulado</h3>
            <p>Para fines académicos no se realiza un cobro real.</p>
          </div>
        </div>

        <div class="checkout-grid">
          <div class="checkout-field checkout-full">
            <label>Método de pago</label>
            <select id="metodo-pago" onchange="mostrarCamposPago()">
              <option value="">Selecciona una opción</option>
              <option value="contra_entrega">Pago contra entrega</option>
              <option value="transferencia">Transferencia bancaria</option>
              <option value="tarjeta_simulada">Tarjeta simulada</option>
            </select>
          </div>
        </div>

        <div id="campos-transferencia" class="checkout-grid transferencia-box" style="display:none;">
          <div class="checkout-field checkout-full">
            <div class="transferencia-info">
              <h4>Datos para transferencia simulada</h4>
              <p><strong>Banco:</strong> Banco Pichincha</p>
              <p><strong>Titular:</strong> ShopFácil Demo</p>
              <p><strong>Tipo de cuenta:</strong> Corriente</p>
              <p><strong>Número de cuenta:</strong> 2200456789</p>
              <p><strong>RUC:</strong> 1799999999001</p>
              <small>Este pago es simulado para fines académicos. No realices transferencias reales.</small>
            </div>
          </div>
          <div class="checkout-field">
            <label>Banco emisor</label>
            <input type="text" id="transferencia-banco" placeholder="Ej: Banco Pichincha">
          </div>
          <div class="checkout-field">
            <label>Número de comprobante</label>
            <input type="text" id="transferencia-comprobante" placeholder="Ej: TRX-2026-001">
          </div>
        </div>

        <div id="campos-tarjeta" class="checkout-grid tarjeta-box" style="display:none;">
          <div class="checkout-field checkout-full">
            <label>Nombre del titular</label>
            <input type="text" id="tarjeta-titular" placeholder="Ej: Shirley Maldonado">
          </div>
          <div class="checkout-field">
            <label>Número de tarjeta</label>
            <input type="text" id="tarjeta-numero" maxlength="19" placeholder="4111111111111111">
          </div>
          <div class="checkout-field">
            <label>Expiración</label>
            <input type="text" id="tarjeta-expiracion" maxlength="5" placeholder="MM/AA">
          </div>
          <div class="checkout-field">
            <label>CVV</label>
            <input type="text" id="tarjeta-cvv" maxlength="4" placeholder="123">
          </div>
        </div>
      </div>

      <div class="total-box" style="flex-direction:column;align-items:stretch;gap:0;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
          <div>
            <div style="font-size:13px;color:#777;margin-bottom:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Resumen de pago</div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <div style="display:flex;justify-content:space-between;gap:60px;font-size:14px;color:#555;">
                <span>Subtotal (sin IVA)</span>
                <span>$${baseImponible.toFixed(2)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:60px;font-size:14px;color:#555;">
                <span>IVA Ecuador (15%)</span>
                <span>$${valorIva.toFixed(2)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:60px;font-size:18px;font-weight:700;color:#1F4E79;border-top:1.5px solid #e0e7f0;margin-top:8px;padding-top:8px;">
                <span>Total a pagar</span>
                <span class="total-monto">$${totalBruto.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <button class="btn-confirmar" onclick="confirmarPedido()">
            Confirmar pedido ✓
          </button>
        </div>
      </div>
    `;

    inicializarSelectsEntrega();
    mostrarCamposPago();
  } catch (error) {
    document.getElementById('contenido-carrito').innerHTML =
      '<p>Error al conectar con el servidor.</p>';
  }
}


function inicializarSelectsEntrega() {
  const provinciaSelect = document.getElementById('entrega-provincia');
  const ciudadSelect = document.getElementById('entrega-ciudad');

  if (!provinciaSelect || !ciudadSelect) return;

  provinciaSelect.innerHTML = '<option value="">Selecciona una provincia</option>';

  Object.keys(CIUDADES_POR_PROVINCIA)
    .sort((a, b) => a.localeCompare(b, 'es'))
    .forEach(provincia => {
      const option = document.createElement('option');
      option.value = provincia;
      option.textContent = provincia;
      provinciaSelect.appendChild(option);
    });

  ciudadSelect.innerHTML = '<option value="">Primero selecciona una provincia</option>';
  ciudadSelect.disabled = true;
}

function cargarCiudadesPorProvincia() {
  const provinciaSelect = document.getElementById('entrega-provincia');
  const ciudadSelect = document.getElementById('entrega-ciudad');

  if (!provinciaSelect || !ciudadSelect) return;

  const provincia = provinciaSelect.value;
  const ciudades = CIUDADES_POR_PROVINCIA[provincia] || [];

  ciudadSelect.innerHTML = '';

  if (!provincia || ciudades.length === 0) {
    ciudadSelect.disabled = true;
    ciudadSelect.innerHTML = '<option value="">Primero selecciona una provincia</option>';
    return;
  }

  ciudadSelect.disabled = false;
  ciudadSelect.innerHTML = '<option value="">Selecciona una ciudad o cantón</option>';

  ciudades
    .sort((a, b) => a.localeCompare(b, 'es'))
    .forEach(ciudad => {
      const option = document.createElement('option');
      option.value = ciudad;
      option.textContent = ciudad;
      ciudadSelect.appendChild(option);
    });
}


function mostrarCamposPago() {
  const metodo = document.getElementById('metodo-pago')?.value;
  const tarjetaBox = document.getElementById('campos-tarjeta');
  const transferenciaBox = document.getElementById('campos-transferencia');

  if (tarjetaBox) {
    tarjetaBox.style.display = metodo === 'tarjeta_simulada' ? 'grid' : 'none';
  }

  if (transferenciaBox) {
    transferenciaBox.style.display = metodo === 'transferencia' ? 'grid' : 'none';
  }
}

function obtenerDatosCheckout() {
  const metodo = document.getElementById('metodo-pago')?.value || '';

  return {
    entrega: {
      provincia: document.getElementById('entrega-provincia')?.value.trim() || '',
      ciudad: document.getElementById('entrega-ciudad')?.value.trim() || '',
      direccion: document.getElementById('entrega-direccion')?.value.trim() || '',
      referencia: document.getElementById('entrega-referencia')?.value.trim() || '',
      latitud: ubicacionSeleccionada.latitud,
      longitud: ubicacionSeleccionada.longitud
    },
    metodo_pago: metodo,
    transferencia_simulada: {
      banco: document.getElementById('transferencia-banco')?.value.trim() || '',
      comprobante: document.getElementById('transferencia-comprobante')?.value.trim() || ''
    },
    tarjeta_simulada: {
      titular: document.getElementById('tarjeta-titular')?.value.trim() || '',
      numero: document.getElementById('tarjeta-numero')?.value.trim() || '',
      expiracion: document.getElementById('tarjeta-expiracion')?.value.trim() || '',
      cvv: document.getElementById('tarjeta-cvv')?.value.trim() || ''
    }
  };
}

function validarCheckoutFrontend(datos) {
  if (!datos.entrega.provincia) return 'Completa la provincia de entrega';
  if (!datos.entrega.ciudad) return 'Completa la ciudad de entrega';
  if (!datos.entrega.direccion) return 'Completa la dirección exacta de entrega';
  if (!datos.entrega.referencia) return 'Completa una referencia de entrega';

  if (!datos.metodo_pago) {
    return 'Selecciona un método de pago';
  }

  if (datos.metodo_pago === 'transferencia') {
    if (!datos.transferencia_simulada.comprobante || datos.transferencia_simulada.comprobante.length < 4) {
      return 'Ingresa el número de comprobante de la transferencia simulada';
    }
  }

  if (datos.metodo_pago === 'tarjeta_simulada') {
    const numero = datos.tarjeta_simulada.numero.replace(/\s+/g, '');
    if (!datos.tarjeta_simulada.titular || !/^\d{12,19}$/.test(numero) || !/^\d{2}\/\d{2}$/.test(datos.tarjeta_simulada.expiracion) || !/^\d{3,4}$/.test(datos.tarjeta_simulada.cvv)) {
      return 'Completa correctamente la tarjeta simulada';
    }
  }

  return null;
}


function mostrarMensajeCarrito(mensaje, tipo = 'info', subtexto = '') {
  if (typeof sfToast === 'function') {
    sfToast(mensaje, tipo, subtexto);
    return;
  }

  const contenedorId = 'sf-toast-container-fallback';
  let contenedor = document.getElementById(contenedorId);
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = contenedorId;
    contenedor.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(contenedor);
  }

  const toast = document.createElement('div');
  const esError = tipo === 'error';
  toast.style.cssText = `background:${esError ? '#FAECE7' : '#EAF3DE'};border:1.5px solid ${esError ? '#712B13' : '#27500A'};color:${esError ? '#712B13' : '#27500A'};border-radius:12px;padding:14px 18px;min-width:280px;max-width:380px;box-shadow:0 4px 18px rgba(0,0,0,.14);font-family:Segoe UI,Arial,sans-serif;font-weight:600;`;
  toast.innerHTML = `<div>${escaparHTML(mensaje)}</div>${subtexto ? `<small style="display:block;margin-top:4px;font-weight:400;">${escaparHTML(subtexto)}</small>` : ''}`;
  contenedor.appendChild(toast);
  setTimeout(() => toast.remove(), 3800);
}

// La ubicación por mapa queda opcional. Para este Sprint se guarda solo dirección escrita.

// ================================
// HU-08: Actualizar cantidad
// ================================
async function actualizarCantidad(itemId, cantidad) {
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_CARRITO}/carrito/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ cantidad: parseInt(cantidad) })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarMensajeCarrito(data.error || 'No se pudo actualizar la cantidad', 'error');
    }

    cargarCarrito();
  } catch (error) {
    mostrarMensajeCarrito('Error al actualizar cantidad', 'error');
  }
}

// ================================
// HU-07: Eliminar item
// ================================
async function eliminarItem(itemId) {
  const token = localStorage.getItem('token');

  try {
    await fetch(`${API_CARRITO}/carrito/${itemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    cargarCarrito();
  } catch (error) {
    mostrarMensajeCarrito('Error al eliminar producto', 'error');
  }
}

// ================================
// HU-09 + HU-22/HU-23: Confirmar pedido con entrega y pago simulado
// ================================
async function confirmarPedido() {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const datosCheckout = obtenerDatosCheckout();
  const errorValidacion = validarCheckoutFrontend(datosCheckout);

  if (errorValidacion) {
    mostrarMensajeCarrito(errorValidacion, 'error');
    return;
  }

  try {
    const res = await fetch(`${API_CARRITO}/pedidos/confirmar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(datosCheckout)
    });

    const data = await res.json();

    if (res.ok) {
      guardarFactura(data, usuario);

      mostrarMensajeCarrito('¡Compra confirmada en ShopFácil!', 'exito', `${data.codigo} · ${pagoTexto(data.metodo_pago)}`);

      document.getElementById('contenido-carrito').innerHTML = `
        <div class="vacio" style="padding:50px 20px;">
          <div style="font-size:60px;margin-bottom:12px;">✅</div>
          <h3 style="color:#1F4E79;font-size:24px;margin-bottom:8px;">¡Pedido confirmado!</h3>
          <p style="font-size:16px;color:#555;margin-bottom:4px;">Número de pedido:</p>
          <h2 style="color:#1F4E79;font-size:28px;margin-bottom:12px;">${escaparHTML(data.codigo)}</h2>

          <div style="background:#f7fafc;border:1px solid #e0e7f0;border-radius:12px;padding:18px 24px;display:inline-block;text-align:left;margin-bottom:22px;">
            <div style="font-size:13px;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Resumen de compra</div>
            <div style="font-size:14px;color:#555;margin-bottom:4px;"><b>Entrega:</b> ${escaparHTML(data.entrega.ciudad)}, ${escaparHTML(data.entrega.provincia)}</div>
            ${data.entrega.latitud && data.entrega.longitud ? `<div style="font-size:14px;color:#555;margin-bottom:4px;"><b>Ubicación:</b> punto guardado en mapa</div>` : ''}
            <div style="font-size:14px;color:#555;margin-bottom:4px;"><b>Pago:</b> ${escaparHTML(data.metodo_pago_texto)}</div>
            ${data.metodo_pago === 'transferencia' && data.transferencia?.comprobante ? `<div style="font-size:14px;color:#555;margin-bottom:4px;"><b>Comprobante:</b> ${escaparHTML(data.transferencia.comprobante)}</div>` : ''}
            <div style="display:flex;justify-content:space-between;gap:50px;font-size:14px;color:#555;margin-bottom:4px;margin-top:10px;">
              <span>Subtotal (sin IVA)</span>
              <span>$${(parseFloat(data.total) / (1 + IVA_ECUADOR)).toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:50px;font-size:14px;color:#555;margin-bottom:8px;">
              <span>IVA Ecuador (15%)</span>
              <span>$${(parseFloat(data.total) - parseFloat(data.total) / (1 + IVA_ECUADOR)).toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:50px;font-size:18px;font-weight:700;color:#1F4E79;border-top:1.5px solid #e0e7f0;padding-top:8px;">
              <span>Total pagado</span>
              <span>$${parseFloat(data.total).toFixed(2)}</span>
            </div>
          </div>

          <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
            <a href="facturas.html" class="btn" style="display:inline-block;width:auto;padding:11px 26px;text-decoration:none;margin-top:0;">
              Ver mi factura
            </a>
            <a href="pedidos.html" class="btn-secundario" style="display:inline-block;width:auto;padding:11px 26px;text-decoration:none;margin-top:0;">
              Ver mis pedidos
            </a>
          </div>
        </div>
      `;
    } else {
      mostrarMensajeCarrito(data.error || 'Error al confirmar pedido', 'error', data.detalle || 'Revisa los datos de entrega, pago y stock disponible.');
    }
  } catch (error) {
    mostrarMensajeCarrito('No se pudo conectar con el servidor', 'error', 'Verifica que Docker y el backend estén encendidos.');
  }
}

// ================================
// Guardar factura en localStorage como respaldo visual de HU-24 existente
// ================================
function guardarFactura(pedidoData, usuario) {
  try {
    const facturas = JSON.parse(localStorage.getItem('sf_facturas') || '[]');
    const total = parseFloat(pedidoData.total);
    const baseImponible = total / (1 + IVA_ECUADOR);
    const valorIva = total - baseImponible;

    const factura = {
      id: pedidoData.pedido_id,
      codigo: pedidoData.codigo,
      fecha: new Date().toISOString(),
      usuario: usuario ? { nombre: usuario.nombre, correo: usuario.correo } : {},
      productos: pedidoData.productos || [],
      entrega: pedidoData.entrega || {},
      metodo_pago: pedidoData.metodo_pago,
      metodo_pago_texto: pedidoData.metodo_pago_texto,
      transferencia: pedidoData.transferencia || {},
      total: total,
      baseImponible: parseFloat(baseImponible.toFixed(2)),
      iva: parseFloat(valorIva.toFixed(2)),
      estado: 'pagada'
    };

    facturas.unshift(factura);
    localStorage.setItem('sf_facturas', JSON.stringify(facturas));
  } catch (e) {
    console.warn('No se pudo guardar la factura en localStorage', e);
  }
}
