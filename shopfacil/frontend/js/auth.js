const API = window.SHOPFACIL_API_URL || 'http://localhost:3000/api';

// Mostrar mensaje de error o éxito
function mostrarMensaje(texto, tipo) {
  const div = document.getElementById('mensaje');
  div.textContent = texto;
  div.className = `mensaje ${tipo}`;
}

// ================================
// HU-01: Registro de cuenta
// ================================
async function registrar() {
  const nombre = document.getElementById('nombre').value.trim();
  const correo = document.getElementById('correo').value.trim();
  const password = document.getElementById('password').value;

  // Validar campos vacíos
  if (!nombre || !correo || !password) {
    mostrarMensaje('Todos los campos son obligatorios', 'error');
    return;
  }

  // Validar largo de contraseña
  if (password.length < 6) {
    mostrarMensaje('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }

  try {
    const res = await fetch(`${API}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, correo, password })
    });

    const data = await res.json();

    if (res.ok) {
      mostrarMensaje('¡Cuenta creada! Redirigiendo...', 'exito');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } else {
      mostrarMensaje(data.error || 'Error al registrarse', 'error');
    }

  } catch (err) {
    mostrarMensaje('No se pudo conectar con el servidor', 'error');
  }
}

// ================================
// HU-03: Inicio de sesión
// ================================
async function login() {
  const correo = document.getElementById('correo').value.trim();
  const password = document.getElementById('password').value;

  // Validar campos vacíos
  if (!correo || !password) {
    mostrarMensaje('Correo y contraseña son obligatorios', 'error');
    return;
  }

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password })
    });

    const data = await res.json();

    if (res.ok) {
      // Guardar token y datos del usuario
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));

      mostrarMensaje('¡Bienvenido! Redirigiendo...', 'exito');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    } else {
      mostrarMensaje(data.error || 'Credenciales incorrectas', 'error');
    }

  } catch (err) {
    mostrarMensaje('No se pudo conectar con el servidor', 'error');
  }
}

// Cerrar sesión
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
}