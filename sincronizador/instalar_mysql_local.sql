-- SIAP web · Preparar MySQL LOCAL para el envío de clientes a la nube
-- Se corre una sola vez en el MySQL del servidor de la oficina.
-- Reemplazar BASE_LOCAL por el nombre de la base y CONTRASEÑA por una nueva.

-- 1. Tabla de marcas de sincronización (un renglón por cada tabla que se envía)
CREATE TABLE BASE_LOCAL.sincronizacion (
  tabla             varchar(50)  NOT NULL,
  ultima_fecha      datetime     NOT NULL DEFAULT '2000-01-01 00:00:00'
                    COMMENT 'fecha_modificacion del último registro confirmado por la web',
  ultimo_id         int          NOT NULL DEFAULT 0
                    COMMENT 'ID del último registro confirmado (desempate con la misma fecha)',
  ultima_revision   datetime     NULL COMMENT 'Última vez que corrió el envío',
  ultimo_resultado  varchar(255) NULL COMMENT 'OK / ERROR de la última vuelta',
  PRIMARY KEY (tabla)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO BASE_LOCAL.sincronizacion (tabla) VALUES ('clientes');

-- 2. Usuario propio del programa de envío: solo lee clientes y actualiza su marca
CREATE USER 'siap_sync'@'localhost' IDENTIFIED BY 'CONTRASEÑA';
GRANT SELECT         ON BASE_LOCAL.clientes       TO 'siap_sync'@'localhost';
GRANT SELECT, UPDATE ON BASE_LOCAL.sincronizacion TO 'siap_sync'@'localhost';
