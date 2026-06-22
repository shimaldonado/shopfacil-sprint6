-- =========================================================
-- MIGRACIÓN SPRINT 3 / 4 - SHOPFÁCIL
-- Ejecutar si ya tenías una base de datos creada desde Sprint 1 o Sprint 2.
-- Esta migración NO borra datos.
-- =========================================================

DROP PROCEDURE IF EXISTS add_column_if_not_exists;
DELIMITER $$
CREATE PROCEDURE add_column_if_not_exists(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD COLUMN ', p_column, ' ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- Columnas que pueden faltar cuando se viene desde Sprint 2.
CALL add_column_if_not_exists('usuarios', 'activo', 'BOOLEAN DEFAULT TRUE AFTER rol');
CALL add_column_if_not_exists('productos', 'categoria', "VARCHAR(50) DEFAULT 'otros' AFTER imagen");
CALL add_column_if_not_exists('productos', 'activo', 'BOOLEAN DEFAULT TRUE AFTER categoria');
CALL add_column_if_not_exists('productos', 'vendedor_id', 'INT NULL AFTER activo');
CALL add_column_if_not_exists('carrito', 'variante_id', 'INT NULL AFTER producto_id');
CALL add_column_if_not_exists('pedido_detalle', 'variante_id', 'INT NULL AFTER producto_id');
CALL add_column_if_not_exists('pedidos', 'provincia_entrega', 'VARCHAR(100) NULL AFTER estado');
CALL add_column_if_not_exists('pedidos', 'ciudad_entrega', 'VARCHAR(100) NULL AFTER provincia_entrega');
CALL add_column_if_not_exists('pedidos', 'direccion_entrega', 'VARCHAR(255) NULL AFTER ciudad_entrega');
CALL add_column_if_not_exists('pedidos', 'referencia_entrega', 'VARCHAR(255) NULL AFTER direccion_entrega');
CALL add_column_if_not_exists('pedidos', 'latitud_entrega', 'DECIMAL(10,8) NULL AFTER referencia_entrega');
CALL add_column_if_not_exists('pedidos', 'longitud_entrega', 'DECIMAL(11,8) NULL AFTER latitud_entrega');
CALL add_column_if_not_exists('pedidos', 'metodo_pago', 'VARCHAR(40) NULL AFTER longitud_entrega');
CALL add_column_if_not_exists('pedidos', 'banco_transferencia', 'VARCHAR(120) NULL AFTER metodo_pago');
CALL add_column_if_not_exists('pedidos', 'comprobante_transferencia', 'VARCHAR(120) NULL AFTER banco_transferencia');
CALL add_column_if_not_exists('pedidos', 'estado_pago', "VARCHAR(40) DEFAULT 'simulado_aprobado' AFTER comprobante_transferencia");

DROP PROCEDURE IF EXISTS add_column_if_not_exists;

USE shopfacil;

-- ================================
-- SPRINT 3: Imágenes adicionales del producto
-- ================================
CREATE TABLE IF NOT EXISTS producto_imagenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  principal BOOLEAN DEFAULT FALSE,
  orden INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- ================================
-- SPRINT 3: Variantes de producto
-- ================================
CREATE TABLE IF NOT EXISTS producto_variantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  talla VARCHAR(30),
  color VARCHAR(60),
  stock INT NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- ================================
-- SPRINT 3: Comentarios y estrellas
-- ================================
CREATE TABLE IF NOT EXISTS producto_comentarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  usuario_id INT NOT NULL,
  calificacion INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Opcional: agregar variantes iniciales a productos existentes
INSERT INTO producto_variantes (producto_id, talla, color, stock, activo)
SELECT id, 'M', 'Azul', stock, true
FROM productos
WHERE nombre LIKE '%Camisa%'
AND id NOT IN (SELECT producto_id FROM producto_variantes);

INSERT INTO producto_variantes (producto_id, talla, color, stock, activo)
SELECT id, '32', 'Negro', stock, true
FROM productos
WHERE nombre LIKE '%Pantalon%' OR nombre LIKE '%Pantalón%'
AND id NOT IN (SELECT producto_id FROM producto_variantes);

INSERT INTO producto_variantes (producto_id, talla, color, stock, activo)
SELECT id, '40', 'Blanco', stock, true
FROM productos
WHERE nombre LIKE '%Zapatos%'
AND id NOT IN (SELECT producto_id FROM producto_variantes);

-- Imágenes adicionales iniciales usando la imagen principal
INSERT INTO producto_imagenes (producto_id, url, orden)
SELECT id, imagen, 1
FROM productos
WHERE imagen IS NOT NULL
AND id NOT IN (SELECT producto_id FROM producto_imagenes);

-- ================================
-- Opcional: variantes demo adicionales para probar selección de talla/color
-- Ejecutar solo si quieres que los productos existentes muestren más opciones.
-- ================================
INSERT INTO producto_variantes (producto_id, talla, color, stock, activo)
SELECT p.id, 'S', 'Azul', 3, true
FROM productos p
WHERE p.nombre LIKE '%Camisa%'
AND NOT EXISTS (
  SELECT 1 FROM producto_variantes v
  WHERE v.producto_id = p.id AND v.talla = 'S' AND v.color = 'Azul'
);

INSERT INTO producto_variantes (producto_id, talla, color, stock, activo)
SELECT p.id, 'M', 'Azul', 4, true
FROM productos p
WHERE p.nombre LIKE '%Camisa%'
AND NOT EXISTS (
  SELECT 1 FROM producto_variantes v
  WHERE v.producto_id = p.id AND v.talla = 'M' AND v.color = 'Azul'
);

INSERT INTO producto_variantes (producto_id, talla, color, stock, activo)
SELECT p.id, 'L', 'Azul', 2, true
FROM productos p
WHERE p.nombre LIKE '%Camisa%'
AND NOT EXISTS (
  SELECT 1 FROM producto_variantes v
  WHERE v.producto_id = p.id AND v.talla = 'L' AND v.color = 'Azul'
);

INSERT INTO producto_variantes (producto_id, talla, color, stock, activo)
SELECT p.id, 'M', 'Blanco', 2, true
FROM productos p
WHERE p.nombre LIKE '%Camisa%'
AND NOT EXISTS (
  SELECT 1 FROM producto_variantes v
  WHERE v.producto_id = p.id AND v.talla = 'M' AND v.color = 'Blanco'
);

INSERT INTO producto_variantes (producto_id, talla, color, stock, activo)
SELECT p.id, '39', 'Blanco', 2, true
FROM productos p
WHERE p.nombre LIKE '%Zapatos%'
AND NOT EXISTS (
  SELECT 1 FROM producto_variantes v
  WHERE v.producto_id = p.id AND v.talla = '39' AND v.color = 'Blanco'
);

INSERT INTO producto_variantes (producto_id, talla, color, stock, activo)
SELECT p.id, '40', 'Blanco', 2, true
FROM productos p
WHERE p.nombre LIKE '%Zapatos%'
AND NOT EXISTS (
  SELECT 1 FROM producto_variantes v
  WHERE v.producto_id = p.id AND v.talla = '40' AND v.color = 'Blanco'
);

INSERT INTO producto_variantes (producto_id, talla, color, stock, activo)
SELECT p.id, '41', 'Blanco', 1, true
FROM productos p
WHERE p.nombre LIKE '%Zapatos%'
AND NOT EXISTS (
  SELECT 1 FROM producto_variantes v
  WHERE v.producto_id = p.id AND v.talla = '41' AND v.color = 'Blanco'
);


-- =========================================================
-- MIGRACIÓN SPRINT 5 - SHOPFÁCIL
-- Seguimiento, notificaciones, cancelaciones y preguntas.
-- =========================================================

ALTER TABLE pedidos
MODIFY COLUMN estado ENUM('pendiente','en_proceso','enviado','entregado','cancelacion_solicitada','cancelado') DEFAULT 'pendiente';

CREATE TABLE IF NOT EXISTS pedido_estado_historial (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  estado VARCHAR(40) NOT NULL,
  descripcion VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO pedido_estado_historial (pedido_id, estado, descripcion, created_at)
SELECT p.id, p.estado, CONCAT('Estado actual: ', p.estado), COALESCE(p.created_at, CURRENT_TIMESTAMP)
FROM pedidos p
WHERE NOT EXISTS (
  SELECT 1 FROM pedido_estado_historial h WHERE h.pedido_id = p.id
);



-- ================================
-- SPRINT 6: Favoritos
-- ================================
CREATE TABLE IF NOT EXISTS favoritos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  producto_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_favorito_usuario_producto (usuario_id, producto_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

