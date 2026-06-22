const express = require('express');
const cors = require('cors');
require('dotenv').config();


const authRoutes = require('./routes/auth');
const productosRoutes = require('./routes/productos');
const carritoRoutes = require('./routes/carrito');
const pedidosRoutes = require('./routes/pedidos');
const adminRoutes = require('./routes/admin');
const uploadsRoutes = require('./routes/uploads');
const notificacionesRoutes = require('./routes/notificaciones');
const preguntasRoutes = require('./routes/preguntas');
const favoritosRoutes = require('./routes/favoritos');
const reportesRoutes = require('./routes/reportes');
const ensureSprint3Schema = require('./utils/ensureSchema');
const app = express();

// Middlewares
const corsOptions = process.env.FRONTEND_URL
  ? { origin: process.env.FRONTEND_URL.split(',').map(url => url.trim()), credentials: true }
  : {};
app.use(cors(corsOptions));
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/carrito', carritoRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/preguntas', preguntasRoutes);
app.use('/api/favoritos', favoritosRoutes);
app.use('/api/reportes', reportesRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'ShopFácil API corriendo ✅' });
});

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  try {
    await ensureSprint3Schema();
  } catch (error) {
    console.error('No se pudo verificar el esquema de la base de datos:', error);
  }

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

iniciarServidor();