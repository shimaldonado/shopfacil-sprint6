(function () {
  const TOAST_DURATION = 3400;

  function crearContenedor() {
    if (document.getElementById('sf-toast-container')) return;
    const c = document.createElement('div');
    c.id = 'sf-toast-container';
    c.style.cssText = [
      'position:fixed',
      'bottom:28px',
      'right:28px',
      'z-index:9999',
      'display:flex',
      'flex-direction:column',
      'gap:10px',
      'pointer-events:none'
    ].join(';');
    document.body.appendChild(c);
  }

  const TIPOS = {
    exito: {
      bg: '#EAF3DE',
      border: '#27500A',
      text: '#27500A',
      icon: '&#10003;',
      iconBg: '#27500A'
    },
    error: {
      bg: '#FAECE7',
      border: '#712B13',
      text: '#712B13',
      icon: '&#x2715;',
      iconBg: '#712B13'
    },
    info: {
      bg: '#E6F1FB',
      border: '#0C447C',
      text: '#0C447C',
      icon: '&#x2139;',
      iconBg: '#0C447C'
    },
    carrito: {
      bg: '#EEEDFE',
      border: '#3C3489',
      text: '#3C3489',
      icon: '&#128722;',
      iconBg: '#3C3489'
    }
  };

  window.sfToast = function (mensaje, tipo, subtexto) {
    tipo = tipo || 'info';
    crearContenedor();
    const c = document.getElementById('sf-toast-container');
    const t = TIPOS[tipo] || TIPOS.info;

    const toast = document.createElement('div');
    toast.style.cssText = [
      'pointer-events:all',
      'display:flex',
      'align-items:flex-start',
      'gap:12px',
      'background:' + t.bg,
      'border:1.5px solid ' + t.border,
      'border-radius:12px',
      'padding:14px 18px',
      'min-width:280px',
      'max-width:360px',
      'box-shadow:0 4px 18px rgba(0,0,0,0.13)',
      'opacity:0',
      'transform:translateX(40px)',
      'transition:opacity 0.28s ease,transform 0.28s ease'
    ].join(';');

    const iconCircle = document.createElement('div');
    iconCircle.style.cssText = [
      'width:32px',
      'height:32px',
      'min-width:32px',
      'border-radius:50%',
      'background:' + t.iconBg,
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'font-size:15px',
      'color:white',
      'font-weight:700',
      'margin-top:1px'
    ].join(';');
    iconCircle.innerHTML = t.icon;

    const textWrap = document.createElement('div');
    textWrap.style.cssText = 'flex:1;';

    const titulo = document.createElement('div');
    titulo.style.cssText = 'font-weight:600;font-size:14px;color:' + t.text + ';font-family:Segoe UI,Arial,sans-serif;line-height:1.35;';
    titulo.textContent = mensaje;

    textWrap.appendChild(titulo);

    if (subtexto) {
      const sub = document.createElement('div');
      sub.style.cssText = 'font-size:12px;color:' + t.text + ';opacity:0.78;margin-top:3px;font-family:Segoe UI,Arial,sans-serif;';
      sub.textContent = subtexto;
      textWrap.appendChild(sub);
    }

    const barra = document.createElement('div');
    barra.style.cssText = [
      'position:absolute',
      'bottom:0',
      'left:0',
      'height:3px',
      'border-radius:0 0 12px 12px',
      'background:' + t.border,
      'width:100%',
      'transform-origin:left',
      'transition:transform ' + TOAST_DURATION + 'ms linear'
    ].join(';');

    toast.style.position = 'relative';
    toast.appendChild(iconCircle);
    toast.appendChild(textWrap);
    toast.appendChild(barra);
    c.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
        barra.style.transform = 'scaleX(0)';
      });
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      setTimeout(() => toast.remove(), 320);
    }, TOAST_DURATION);
  };

  window.sfToastCarrito = function (nombreProducto) {
    sfToast(
      'Producto agregado al carrito',
      'carrito',
      nombreProducto ? '\u201c' + nombreProducto + '\u201d listo para comprar'  : 'Revisa tu carrito cuando quieras'
    );
  };

  window.sfToastExito = function (msg, sub) { sfToast(msg, 'exito', sub); };
  window.sfToastError = function (msg, sub) { sfToast(msg, 'error', sub); };
  window.sfToastInfo = function (msg, sub) { sfToast(msg, 'info', sub); };

  function obtenerUsuarioActual() {
    try { return JSON.parse(localStorage.getItem('usuario')); } catch (_) { return null; }
  }

  window.sfPrompt = function (opciones) {
    opciones = opciones || {};
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'sf-modal-overlay';
      overlay.innerHTML = `
        <div class="sf-modal-card" role="dialog" aria-modal="true" aria-labelledby="sf-modal-title">
          <button type="button" class="sf-modal-close" aria-label="Cerrar">Ã—</button>
          <div class="sf-modal-icon">${opciones.icono || 'ðŸ“'}</div>
          <h3 id="sf-modal-title">${opciones.titulo || 'Confirmar acciÃ³n'}</h3>
          <p>${opciones.descripcion || ''}</p>
          <textarea id="sf-modal-input" rows="4" maxlength="180" placeholder="${opciones.placeholder || 'Escribe aquÃ­...'}"></textarea>
          <div class="sf-modal-error" id="sf-modal-error" style="display:none;"></div>
          <div class="sf-modal-actions">
            <button type="button" class="sf-btn-secundario" id="sf-modal-cancelar">Cancelar</button>
            <button type="button" class="sf-btn-principal" id="sf-modal-aceptar">${opciones.textoAceptar || 'Aceptar'}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const input = overlay.querySelector('#sf-modal-input');
      const error = overlay.querySelector('#sf-modal-error');
      const cerrar = (valor) => {
        overlay.classList.add('sf-modal-saliendo');
        setTimeout(() => overlay.remove(), 180);
        resolve(valor);
      };

      overlay.querySelector('.sf-modal-close').addEventListener('click', () => cerrar(null));
      overlay.querySelector('#sf-modal-cancelar').addEventListener('click', () => cerrar(null));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(null); });
      overlay.querySelector('#sf-modal-aceptar').addEventListener('click', () => {
        const valor = input.value.trim();
        if (opciones.requerido && valor.length < (opciones.minimo || 4)) {
          error.textContent = opciones.mensajeError || 'Completa este campo antes de continuar.';
          error.style.display = 'block';
          input.focus();
          return;
        }
        cerrar(valor);
      });

      setTimeout(() => input.focus(), 80);
    });
  };

  function actualizarBadgeVisual(total) {
    const links = Array.from(document.querySelectorAll('a[href="notificaciones.html"], #btn-notificaciones'));
    links.forEach((link) => {
      link.classList.add('notificacion-link');
      let badge = link.querySelector('.notificacion-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notificacion-badge';
        link.appendChild(badge);
      }
      if (total > 0) {
        badge.textContent = total > 9 ? '9+' : String(total);
        badge.style.display = 'inline-flex';
        link.setAttribute('aria-label', `Notificaciones, ${total} nuevas`);
      } else {
        badge.style.display = 'none';
        link.setAttribute('aria-label', 'Notificaciones');
      }
    });
  }

  window.sfActualizarNotificaciones = async function (mostrarAvisoNuevo) {
    const token = localStorage.getItem('token');
    const usuario = obtenerUsuarioActual();
    if (!token || !usuario || !['comprador', 'vendedor'].includes(usuario.rol)) {
      actualizarBadgeVisual(0);
      return 0;
    }

    try {
      const res = await fetch((window.SHOPFACIL_API_URL || 'https://shopfacil-api.onrender.com/api') + '/notificaciones/contador', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const total = Number(data.total || 0);
      actualizarBadgeVisual(total);

      const ruta = (location.pathname || '').toLowerCase();
      const key = `sf_notif_aviso_${usuario.id}_${total}_${ruta}`;
      if (mostrarAvisoNuevo !== false && total > 0 && !ruta.includes('notificaciones.html') && !sessionStorage.getItem(key)) {
        sfToast('Tienes notificaciones nuevas', 'info', total === 1 ? 'Revisa tu bandeja de notificaciones.' : `Tienes ${total} avisos pendientes por revisar.`);
        sessionStorage.setItem(key, '1');
      }
      return total;
    } catch (error) {
      actualizarBadgeVisual(0);
      return 0;
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (typeof window.sfActualizarNotificaciones === 'function') {
        window.sfActualizarNotificaciones(true);
      }
    }, 250);
  });

})();
