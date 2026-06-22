const API_FAVORITOS = window.SHOPFACIL_API_URL || "http://localhost:3000/api";

function usuarioComprador() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    return usuario && usuario.rol === "comprador" ? usuario : null;
  } catch (_) {
    return null;
  }
}

function escaparHTML(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function imagenProducto(url) {
  return url || "https://via.placeholder.com/500x400?text=Sin+imagen";
}

window.addEventListener("DOMContentLoaded", () => {
  const usuario = usuarioComprador();
  const token = localStorage.getItem("token");

  if (!usuario || !token) {
    window.location.href = "login.html";
    return;
  }

  if (typeof sfActualizarNotificaciones === "function") {
    setTimeout(() => sfActualizarNotificaciones(true), 300);
  }

  cargarFavoritos();
});

async function cargarFavoritos() {
  const contenedor = document.getElementById("lista-favoritos");
  const token = localStorage.getItem("token");

  try {
    contenedor.innerHTML = "<p>Cargando favoritos...</p>";
    const res = await fetch(`${API_FAVORITOS}/favoritos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const favoritos = await res.json();

    if (!res.ok) {
      throw new Error(favoritos.error || "Error al cargar favoritos");
    }

    if (!Array.isArray(favoritos) || favoritos.length === 0) {
      contenedor.innerHTML = `
  <div class="favoritos-vacio">
    <h3>Aún no tienes favoritos</h3>
    <p>Explora el catálogo y guarda los productos que quieras revisar después.</p>
    <a href="index.html" class="btn-ir-catalogo">Ir al catálogo</a>
  </div>
`;
      return;
    }

    contenedor.innerHTML = favoritos
      .map(
        (p, index) => `
      <article class="producto-card">
        <div class="producto-imagen-box" onclick="verDetalle(${p.id})">
          <img src="${escaparHTML(imagenProducto(p.imagen))}" alt="${escaparHTML(p.nombre)}" loading="${index < 4 ? "eager" : "lazy"}" decoding="async" onerror="this.src='https://via.placeholder.com/500x400?text=Sin+imagen'">
        </div>
        <div class="producto-info">
          <h3>${escaparHTML(p.nombre)}</h3>
          <p class="producto-descripcion">${escaparHTML(p.descripcion || "Sin descripción")}</p>
          <div class="precio">$${Number(p.precio || 0).toFixed(2)}</div>
          <div class="stock">Stock: ${Number(p.stock || 0)} unidades</div>
          <div class="producto-acciones">
            <button class="btn-secundario" onclick="verDetalle(${p.id})">Ver detalle</button>
            <button class="btn-danger-outline" onclick="quitarFavorito(${p.id})">Quitar</button>
          </div>
        </div>
      </article>
    `,
      )
      .join("");
  } catch (error) {
    contenedor.innerHTML = `<p class="estado-vacio">${escaparHTML(error.message || "Error al cargar favoritos")}</p>`;
  }
}

async function quitarFavorito(productoId) {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_FAVORITOS}/favoritos/${productoId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "No se pudo quitar el favorito");

    if (typeof sfToastExito === "function")
      sfToastExito("Producto eliminado de favoritos");
    cargarFavoritos();
  } catch (error) {
    if (typeof sfToastError === "function") sfToastError(error.message);
  }
}

function verDetalle(id) {
  window.location.href = `detalle-producto.html?id=${id}`;
}
