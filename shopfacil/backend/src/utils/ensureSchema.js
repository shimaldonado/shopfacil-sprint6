const db = require('../db');

async function tableExists(tableName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );

  return Number(rows[0].total) > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  return Number(rows[0].total) > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  const exists = await columnExists(tableName, columnName);

  if (!exists) {
    await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    console.log(`Migración aplicada: ${tableName}.${columnName}`);
  }
}

async function ensureSprint3Schema() {
  // HU-21: galería de imágenes por producto.
  await db.query(`
    CREATE TABLE IF NOT EXISTS producto_imagenes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      producto_id INT NOT NULL,
      url VARCHAR(500) NOT NULL,
      principal BOOLEAN DEFAULT FALSE,
      orden INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
    )
  `);

  // HU-18 / HU-19: variantes por talla, color, stock y estado.
  await db.query(`
    CREATE TABLE IF NOT EXISTS producto_variantes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      producto_id INT NOT NULL,
      talla VARCHAR(30),
      color VARCHAR(60),
      stock INT NOT NULL DEFAULT 0,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
    )
  `);

  // HU-20: comentarios y calificación por estrellas.
  await db.query(`
    CREATE TABLE IF NOT EXISTS producto_comentarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      producto_id INT NOT NULL,
      usuario_id INT NOT NULL,
      calificacion INT NOT NULL,
      comentario TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);

  // Si la BD ya existía de Sprint 2, estas columnas pueden faltar.
  // Sin esto, al agregar una variante al carrito aparece: "Error al agregar producto al carrito".
  if (await tableExists('carrito')) {
    await addColumnIfMissing('carrito', 'variante_id', 'INT NULL AFTER producto_id');
  }

  if (await tableExists('pedido_detalle')) {
    await addColumnIfMissing('pedido_detalle', 'variante_id', 'INT NULL AFTER producto_id');
    await addColumnIfMissing('pedido_detalle', 'precio_unit', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER cantidad');
  }


  if (await tableExists('pedidos')) {
    await addColumnIfMissing('pedidos', 'codigo', 'VARCHAR(30) UNIQUE AFTER id');
    await addColumnIfMissing('pedidos', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await addColumnIfMissing('pedidos', 'provincia_entrega', 'VARCHAR(100) NULL AFTER estado');
    await addColumnIfMissing('pedidos', 'ciudad_entrega', 'VARCHAR(100) NULL AFTER provincia_entrega');
    await addColumnIfMissing('pedidos', 'direccion_entrega', 'VARCHAR(255) NULL AFTER ciudad_entrega');
    await addColumnIfMissing('pedidos', 'referencia_entrega', 'VARCHAR(255) NULL AFTER direccion_entrega');
    await addColumnIfMissing('pedidos', 'latitud_entrega', 'DECIMAL(10,8) NULL AFTER referencia_entrega');
    await addColumnIfMissing('pedidos', 'longitud_entrega', 'DECIMAL(11,8) NULL AFTER latitud_entrega');
    await addColumnIfMissing('pedidos', 'metodo_pago', 'VARCHAR(40) NULL AFTER longitud_entrega');
    await addColumnIfMissing('pedidos', 'banco_transferencia', 'VARCHAR(120) NULL AFTER metodo_pago');
    await addColumnIfMissing('pedidos', 'comprobante_transferencia', 'VARCHAR(120) NULL AFTER banco_transferencia');
    await addColumnIfMissing('pedidos', 'estado_pago', "VARCHAR(40) DEFAULT 'simulado_aprobado' AFTER comprobante_transferencia");
  }

  if (await tableExists('usuarios')) {
    await addColumnIfMissing('usuarios', 'activo', 'BOOLEAN DEFAULT TRUE AFTER rol');
  }

  if (await tableExists('productos')) {
    await addColumnIfMissing('productos', 'categoria', "VARCHAR(50) DEFAULT 'otros' AFTER imagen");
    await addColumnIfMissing('productos', 'activo', 'BOOLEAN DEFAULT TRUE AFTER categoria');
    await addColumnIfMissing('productos', 'vendedor_id', 'INT NULL AFTER activo');
  }




  // ================================
  // SPRINT 5: Seguimiento, notificaciones, cancelaciones y preguntas
  // ================================
  if (await tableExists('pedidos')) {
    try {
      await db.query(`
        ALTER TABLE pedidos
        MODIFY COLUMN estado ENUM('pendiente','en_proceso','enviado','entregado','cancelacion_solicitada','cancelado') DEFAULT 'pendiente'
      `);
    } catch (error) {
      console.warn('No se pudo ampliar el ENUM de estados de pedidos:', error.message);
    }
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS pedido_estado_historial (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pedido_id INT NOT NULL,
      estado VARCHAR(40) NOT NULL,
      descripcion VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS notificaciones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      pedido_id INT NULL,
      titulo VARCHAR(150) NOT NULL,
      mensaje TEXT NOT NULL,
      tipo VARCHAR(40) DEFAULT 'pedido',
      leida BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS producto_preguntas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      producto_id INT NOT NULL,
      comprador_id INT NOT NULL,
      vendedor_id INT NOT NULL,
      pregunta TEXT NOT NULL,
      respuesta TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      respondida_at TIMESTAMP NULL,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
      FOREIGN KEY (comprador_id) REFERENCES usuarios(id),
      FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Si existen pedidos antiguos sin historial, se registra el estado actual como primer evento.
  if (await tableExists('pedidos') && await tableExists('pedido_estado_historial')) {
    await db.query(`
      INSERT INTO pedido_estado_historial (pedido_id, estado, descripcion, created_at)
      SELECT p.id, p.estado, CONCAT('Estado actual: ', p.estado), COALESCE(p.created_at, CURRENT_TIMESTAMP)
      FROM pedidos p
      WHERE NOT EXISTS (
        SELECT 1 FROM pedido_estado_historial h WHERE h.pedido_id = p.id
      )
    `);
  }



  // ================================
  // SPRINT 6: Favoritos y reportes
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS favoritos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      producto_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_favorito_usuario_producto (usuario_id, producto_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Asegura codificación UTF-8 para tildes, ñ y caracteres especiales.
  try {
    await db.query("ALTER DATABASE shopfacil CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    for (const tabla of ['usuarios', 'productos', 'producto_imagenes', 'producto_variantes', 'carrito', 'pedidos', 'pedido_detalle', 'producto_comentarios', 'pedido_estado_historial', 'notificaciones', 'producto_preguntas', 'favoritos']) {
      if (await tableExists(tabla)) {
        await db.query(`ALTER TABLE ${tabla} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      }
    }
  } catch (error) {
    console.warn('No se pudo convertir completamente la codificación a utf8mb4:', error.message);
  }

  // Corrige textos demo que pudieron guardarse con codificación incorrecta en versiones anteriores.
  if (await tableExists('productos')) {
    await db.query(`
      UPDATE productos
      SET
        nombre = REPLACE(REPLACE(REPLACE(REPLACE(nombre, 'PantalÃ³n', 'Pantalón'), 'CafÃ©', 'Café'), 'CafÃ©', 'Café'), 'ShopFÃ¡cil', 'ShopFácil'),
        descripcion = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(descripcion, 'algodÃ³n', 'algodón'), 'PantalÃ³n', 'Pantalón'), 'descripciÃ³n', 'descripción'), 'aÃ±os', 'años'), 'niÃ±os', 'niños')
    `);
  }

  if (await tableExists('producto_variantes')) {
    await db.query(`
      UPDATE producto_variantes
      SET
        talla = REPLACE(talla, 'Ãšnica', 'Única'),
        color = REPLACE(REPLACE(color, 'CafÃ©', 'Café'), 'Ã¡', 'á')
    `);
  }

  if (await tableExists('usuarios')) {
    await db.query(`
      UPDATE usuarios
      SET nombre = REPLACE(nombre, 'ShopFÃ¡cil', 'ShopFácil')
    `);
  }

  console.log('Esquema Sprint 6 verificado correctamente');
}

module.exports = ensureSprint3Schema;
