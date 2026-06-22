# 🛒 ShopFácil — Sprint 1

## 📌 Descripción del proyecto

ShopFácil es una plataforma de comercio electrónico desarrollada como proyecto académico para la materia de Ingeniería de Software de la Escuela Politécnica Nacional.

El objetivo del Sprint 1 fue implementar la infraestructura base del sistema, autenticación de usuarios y gestión inicial del catálogo de productos.

---

# 🚀 Funcionalidades implementadas — Sprint 1

## ✅ INFRA — Infraestructura base

* Configuración de Docker y Docker Compose
* Base de datos MySQL
* Backend Node.js + Express
* Estructura inicial del proyecto
* Datos iniciales cargados automáticamente

---

## ✅ HU-01 — Registro de cuenta

**Como comprador**, quiero registrarme con mi correo y contraseña, para crear una cuenta en la plataforma.

### Funcionalidades

* Registro de usuarios
* Validación de campos obligatorios
* Validación de correo duplicado
* Contraseñas encriptadas con bcrypt

---

## ✅ HU-02 — Ingreso a la tienda

**Como comprador**, quiero ingresar con mi cuenta, para poder realizar compras en la tienda.

### Funcionalidades

* Formulario de login
* Validación de credenciales
* Redirección automática al catálogo

---

## ✅ HU-03 — Inicio de sesión seguro

**Como usuario registrado**, quiero iniciar sesión con mi correo y contraseña, para acceder a mi cuenta de forma segura.

### Funcionalidades

* Generación de JWT
* Manejo de sesión
* Protección de endpoints
* Validación de roles

---

## ✅ HU-05 — Explorar catálogo

**Como comprador**, quiero explorar el catálogo de productos con imagen, nombre y precio, para conocer la oferta disponible.

### Funcionalidades

* Visualización de productos
* Catálogo dinámico
* Productos activos
* Imágenes de productos
* Búsqueda en tiempo real

---

## ✅ HU-06 — Registrar producto

**Como vendedor**, quiero agregar nuevos productos con nombre, descripción, precio, stock e imagen.

### Funcionalidades

* Registro de productos
* Validación de campos obligatorios
* Restricción por roles (vendedor/admin)
* Productos visibles automáticamente en catálogo

---

# 🛠️ Tecnologías utilizadas

## Frontend

* HTML5
* CSS3
* JavaScript Vanilla

## Backend

* Node.js
* Express.js

## Base de datos

* MySQL

## Seguridad

* JWT
* bcrypt

## Infraestructura

* Docker
* Docker Compose

---

# ⚙️ Requisitos previos

Antes de ejecutar el proyecto se debe instalar:

* Docker Desktop
* Docker Compose
* Git
* VS CODE

---

# 🐳 Instalación y ejecución con Docker

## 1️⃣ Clonar repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd shopfacil
```

---

## 2️⃣ Ejecutar Docker Compose

```bash
docker compose up --build
```

---

## 3️⃣ Acceder al sistema

### Frontend

Se ingresa por el archivo
```txt
index.html
```

### Backend API

```txt
http://localhost:3000
```

---

# 🗄️ Base de datos

La base de datos se crea automáticamente mediante:

```txt
database/init.sql
```

Incluye:

* usuarios de ejemplo
* productos iniciales
* imágenes de productos

---

# 🔐 Roles del sistema

| Rol       | Permisos            |
| --------- | ------------------- |
| Comprador | Ver catálogo        |
| Vendedor  | Registrar productos |
| Admin     | Gestión completa    |

---

# 🔒 Seguridad implementada

* JWT Authentication
* Middleware de validación
* Restricción de endpoints
* Contraseñas cifradas
* Protección de rutas por roles

---

# 🧪 Pruebas realizadas

Se realizaron pruebas manuales y pruebas registradas en TestRail para:

* Login
* Validación de credenciales
* Navegación
* Seguridad básica
* Rendimiento
* Pruebas concurrentes

---

# 📈 Estado Sprint 1

| Historia | Estado     |
| -------- | ---------- |
| INFRA    | ✅ Completo |
| HU-01    | ✅ Completo |
| HU-02    | ✅ Completo |
| HU-03    | ✅ Completo |
| HU-05    | ✅ Completo |
| HU-06    | ✅ Completo |

---

# 👥 Integrantes

* Álvaro Montalván
* Shirley Maldonado
* Helen Jarrín

---

# 🏫 Institución

Escuela Politécnica Nacional
Facultad de Ingeniería de Software
Ingeniería de Software — 2026A

## Sprint 4 agregado

Este avance incluye las HU del Sprint 4 que faltaban:

- HU-22: dirección de entrega al confirmar pedido.
- HU-23: método de pago simulado.
- HU-25: subida real de imágenes de producto con Cloudinary.

### Configurar Cloudinary

1. Crea una cuenta gratuita en Cloudinary.
2. Copia tus credenciales: Cloud name, API key y API secret.
3. Copia `.env.example` como `.env` en la carpeta `shopfacil`.
4. Completa:

```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

5. Reinicia Docker:

```bash
docker compose down
docker compose up --build
```

Si no configuras Cloudinary, la aplicación seguirá funcionando con URLs manuales de imagen, pero la subida real de archivos mostrará un mensaje indicando que faltan credenciales.

## Sprint 6 - Fidelización, reportes, accesibilidad y nube

Funcionalidades agregadas:

- HU-30: favoritos para compradores.
- HU-31: dashboard de ventas para vendedor.
- HU-32: dashboard administrativo general.
- HU-33: mejoras base de accesibilidad y rendimiento.
- HU-34: preparación para despliegue en nube.

### Configuración de API para nube

En local el frontend consume:

```js
http://localhost:3000/api
```

Para despliegue, editar:

```txt
frontend/js/config.js
```

Y cambiar:

```js
window.SHOPFACIL_API_URL = 'https://tu-backend.onrender.com/api';
```

### Despliegue sugerido

- Frontend: Vercel o Netlify usando la carpeta `frontend`.
- Backend: Render usando la carpeta `backend`.
- Base de datos: servicio MySQL en nube compatible con `DATABASE_URL`.
- Imágenes: Cloudinary.

No subir el archivo `.env` con claves reales.
