var IVA_ECUADOR = 0.15;

window.onload = function () {
  var usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  var token = localStorage.getItem('token');
  if (!usuario || !token) {
    alert('Debes iniciar sesión para ver tus facturas');
    window.location.href = 'login.html';
    return;
  }
  cargarFacturas(usuario, token);
};

function esc(t) {
  return String(t || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function padNum(n, len) {
  var s = String(n || '');
  while (s.length < len) s = '0' + s;
  return s;
}

function fmtFecha(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  return d.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtHora(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

function estadoLabel(e) {
  return { pendiente: 'Pendiente', en_proceso: 'En proceso', enviado: 'Enviado', entregado: 'Entregado' }[e] || 'Pendiente';
}

function metodoPagoFactura(metodo) {
  return {
    contra_entrega: 'Pago contra entrega',
    transferencia: 'Transferencia bancaria',
    tarjeta_simulada: 'Tarjeta simulada'
  }[metodo] || 'No registrado';
}

async function cargarFacturas(usuario, token) {
  var div = document.getElementById('lista-facturas');
  try {
    var res = await fetch((window.SHOPFACIL_API_URL || 'http://localhost:3000/api') + '/pedidos/mis-pedidos', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    var pedidos = await res.json();

    if (!res.ok) {
      div.innerHTML = '<p style="color:#712B13;padding:20px;">' + esc(pedidos.error || 'Error') + '</p>';
      return;
    }

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      div.innerHTML = vacioHTML();
      return;
    }

    mostrarStats(pedidos);
    var html = '';
    for (var i = 0; i < pedidos.length; i++) {
      html += tarjetaFactura(pedidos[i], usuario, i);
    }
    div.innerHTML = html;

  } catch (err) {
    div.innerHTML = '<div class="fac-vacio"><div class="fac-vacio-icon">&#128683;</div><h3>Error de conexión</h3><p>No se pudo conectar con el servidor.</p></div>';
  }
}

function mostrarStats(pedidos) {
  var statsDiv = document.getElementById('fac-stats');
  if (!statsDiv) return;
  var totalGastado = 0;
  for (var i = 0; i < pedidos.length; i++) {
    totalGastado += parseFloat(pedidos[i].total || 0);
  }
  var totalIva = totalGastado - (totalGastado / (1 + IVA_ECUADOR));
  var totalBase = totalGastado / (1 + IVA_ECUADOR);

  document.getElementById('stat-total-facturas').textContent = pedidos.length;
  document.getElementById('stat-total-gastado').textContent = '$' + totalGastado.toFixed(2);
  document.getElementById('stat-total-iva').textContent = '$' + totalIva.toFixed(2);
  document.getElementById('stat-total-base').textContent = '$' + totalBase.toFixed(2);
  statsDiv.style.display = 'grid';
}

function tarjetaFactura(pedido, usuario, idx) {
  var total = parseFloat(pedido.total || 0);
  var base = total / (1 + IVA_ECUADOR);
  var iva = total - base;
  var fechaStr = fmtFecha(pedido.created_at);
  var horaStr = fmtHora(pedido.created_at);
  var anio = pedido.created_at ? new Date(pedido.created_at).getFullYear() : new Date().getFullYear();
  var numFac = 'FAC-' + anio + '-' + padNum(pedido.id || (idx + 1), 4);
  var codigo = esc(pedido.codigo || ('#' + (pedido.id || idx + 1)));
  var nombre = esc((usuario && usuario.nombre) ? usuario.nombre : 'Comprador');
  var correo = esc((usuario && usuario.correo) ? usuario.correo : '');
  var cardId = 'fac-card-' + (pedido.id || idx);

  var prods = (pedido.productos || 'Sin detalle').split(',');
  var tagsHtml = '';
  for (var j = 0; j < prods.length; j++) {
    var p = prods[j].trim();
    if (p) tagsHtml += '<span class="fac-tag">' + esc(p) + '</span>';
  }

  return (
    '<div class="fac-card" id="' + cardId + '">' +

      '<div class="fac-cab">' +
        '<div class="fac-cab-logo">' +
          '<div class="fac-cab-logo-text">&#128722; ShopFácil</div>' +
          '<div class="fac-cab-logo-sub">Plataforma de comercio electrónico &middot; Ecuador</div>' +
        '</div>' +
        '<div class="fac-cab-right">' +
          '<div class="fac-cab-num">' + esc(numFac) + '</div>' +
          '<div class="fac-cab-tipo">Comprobante de compra</div>' +
        '</div>' +
      '</div>' +

      '<div class="fac-datos">' +
        '<div class="fac-dato">' +
          '<div class="fac-dato-label">Cliente</div>' +
          '<div class="fac-dato-val">' + nombre + '</div>' +
          (correo ? '<div class="fac-dato-sub">' + correo + '</div>' : '') +
        '</div>' +
        '<div class="fac-dato">' +
          '<div class="fac-dato-label">Fecha de emisión</div>' +
          '<div class="fac-dato-val">' + fechaStr + '</div>' +
          '<div class="fac-dato-sub">' + horaStr + '</div>' +
        '</div>' +
        '<div class="fac-dato">' +
          '<div class="fac-dato-label">Pedido</div>' +
          '<div class="fac-dato-val">' + codigo + '</div>' +
          '<div class="fac-dato-sub">' + esc(estadoLabel(pedido.estado)) + '</div>' +
        '</div>' +
        '<div class="fac-dato">' +
          '<div class="fac-dato-label">Pago</div>' +
          '<div class="fac-dato-val">' + esc(pedido.metodo_pago_texto || metodoPagoFactura(pedido.metodo_pago)) + '</div>' +
          (pedido.metodo_pago === 'transferencia' && pedido.comprobante_transferencia ? '<div class="fac-dato-sub">Comp.: ' + esc(pedido.comprobante_transferencia) + '</div>' : '') +
        '</div>' +
      '</div>' +

      '<div class="fac-productos">' +
        '<div class="fac-productos-titulo">Productos comprados</div>' +
        (tagsHtml || '<span style="color:#94a3b8;font-size:13px;">Sin detalle</span>') +
      '</div>' +

      '<div class="fac-totales">' +
        '<div class="fac-totales-inner">' +
          '<div class="fac-fila">' +
            '<span>Base imponible (sin IVA)</span>' +
            '<span>$' + base.toFixed(2) + '</span>' +
          '</div>' +
          '<div class="fac-fila">' +
            '<span>IVA Ecuador <span class="fac-badge-iva">15%</span></span>' +
            '<span>$' + iva.toFixed(2) + '</span>' +
          '</div>' +
          '<div class="fac-fila-grand">' +
            '<span>Total pagado</span>' +
            '<span>$' + total.toFixed(2) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="fac-pie">' +
        '<span class="fac-estado-pagada">&#10003; Pagada</span>' +
        '<div class="fac-pie-acciones">' +
          '<span class="fac-pie-fecha">' + horaStr + ' &middot; ' + fechaStr + '</span>' +
          '<button class="fac-btn-print" onclick="imprimirFactura(\'' + cardId + '\')">&#128438; Imprimir</button>' +
        '</div>' +
      '</div>' +

    '</div>'
  );
}

function vacioHTML() {
  return (
    '<div class="fac-vacio">' +
      '<div class="fac-vacio-icon">&#129534;</div>' +
      '<h3>Aún no tienes facturas</h3>' +
      '<p>Cuando confirmes una compra, tu factura aparecerá aquí automáticamente.</p>' +
      '<a href="index.html" class="btn" style="display:inline-block;width:auto;padding:10px 28px;text-decoration:none;">Ir al catálogo</a>' +
    '</div>'
  );
}

function imprimirFactura(cardId) {
  var el = document.getElementById(cardId);
  if (!el) return;

  var estilos = [
    'body{font-family:Segoe UI,Arial,sans-serif;margin:0;padding:28px;background:#f5f5f5;}',
    '.fac-card{border:1px solid #ccc;border-radius:14px;overflow:hidden;max-width:820px;margin:auto;background:white;}',
    '.fac-cab{background:#1F4E79;padding:22px 28px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;}',
    '.fac-cab-logo{color:white;}.fac-cab-logo-text{font-size:20px;font-weight:800;color:white;}',
    '.fac-cab-logo-sub{font-size:11px;opacity:0.75;margin-top:3px;color:white;}',
    '.fac-cab-right{text-align:right;color:white;}.fac-cab-num{font-size:18px;font-weight:700;}',
    '.fac-cab-tipo{font-size:10px;opacity:0.7;text-transform:uppercase;letter-spacing:0.08em;margin-top:3px;}',
    '.fac-datos{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #eee;}',
    '.fac-dato{padding:14px 20px;border-right:1px solid #eee;}.fac-dato:last-child{border-right:none;}',
    '.fac-dato-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;font-weight:700;}',
    '.fac-dato-val{font-size:14px;font-weight:600;color:#1b2a38;}.fac-dato-sub{font-size:11px;color:#94a3b8;margin-top:2px;}',
    '.fac-productos{padding:14px 20px;border-bottom:1px solid #eee;}',
    '.fac-productos-titulo{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;font-weight:700;}',
    '.fac-tag{display:inline-block;background:#f1f5f9;color:#334155;border-radius:6px;padding:4px 10px;font-size:12px;margin:3px 4px 3px 0;border:1px solid #e2e8f0;}',
    '.fac-totales{padding:16px 20px;background:#f8fafc;border-top:1px solid #eee;}',
    '.fac-totales-inner{max-width:320px;margin-left:auto;}',
    '.fac-fila{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#64748b;}',
    '.fac-fila-grand{display:flex;justify-content:space-between;font-size:17px;font-weight:800;color:#1F4E79;border-top:2px solid #1F4E79;margin-top:8px;padding-top:10px;}',
    '.fac-badge-iva{font-size:10px;background:#EAF3DE;color:#27500A;border-radius:20px;padding:2px 8px;margin-left:6px;}',
    '.fac-pie{padding:14px 20px;background:white;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;}',
    '.fac-estado-pagada{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;background:#EAF3DE;color:#27500A;}',
    '.fac-btn-print{display:none!important;}'
  ].join('');

  var cierre = '<' + '/body><' + '/html>';
  var win = window.open('', '_blank');
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Factura</title><style>' + estilos + '<' + '/style><' + '/head><body>');
  win.document.write(el.outerHTML);
  win.document.write(cierre);
  win.document.close();
  win.focus();
  setTimeout(function () { win.print(); }, 450);
}