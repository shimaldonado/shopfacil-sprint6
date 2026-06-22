const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

const storage = multer.memoryStorage();
const formatosPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !formatosPermitidos.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
    }
    cb(null, true);
  }
});

function cloudinaryConfigurado() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function subirBufferACloudinary(buffer, originalname) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'shopfacil/productos',
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        context: `original_filename=${originalname || 'producto'}`,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    ).end(buffer);
  });
}

// HU-25: Subida real de imágenes del producto usando Cloudinary.
router.post(
  '/productos/imagenes',
  verificarToken,
  permitirRoles('vendedor'),
  upload.array('imagenes', 6),
  async (req, res) => {
    if (!cloudinaryConfigurado()) {
      return res.status(500).json({
        error: 'Cloudinary no está configurado. Define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en el backend.'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Selecciona al menos una imagen para subir' });
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    try {
      const imagenes = [];

      for (const archivo of req.files) {
        const resultado = await subirBufferACloudinary(archivo.buffer, archivo.originalname);
        imagenes.push({
          url: resultado.secure_url,
          public_id: resultado.public_id
        });
      }

      res.status(201).json({
        message: 'Imágenes subidas correctamente',
        imagenes
      });
    } catch (error) {
      console.error('Error al subir imágenes a Cloudinary:', error);
      res.status(500).json({ error: 'No se pudieron subir las imágenes a Cloudinary' });
    }
  }
);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Cada imagen debe pesar máximo 3 MB' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Puedes subir máximo 6 imágenes por producto' });
    }
    return res.status(400).json({ error: error.message });
  }

  if (error && error.message) {
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Puedes subir máximo 6 imágenes por producto' });
    }
    return res.status(400).json({ error: error.message });
  }

  next(error);
});

module.exports = router;
