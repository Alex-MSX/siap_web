# Base de datos

Notas de diseño de las tablas de SIAP Web. Cada tabla se revisa contra la estructura que ya existe en MySQL antes de cambiar nada.

## Reglas generales

- **Nombres de personas físicas:** siempre en el orden nombre, apellido paterno, apellido materno (por ejemplo, "RICARDO VALLE TORRES"). Para ordenar alfabéticamente por apellido se usa `ORDER BY paterno, materno, nombre`; el orden de despliegue no cambia.
- **Nombres de columnas** en snake_case.
- **Datos sensibles:** tarjetas solo con últimos 4 dígitos; contraseñas de portales cifradas, nunca en texto plano.

## Tabla `clientes`

Estructura actual (diseñada por Alex): `id_cliente`, `persona` (FISICA/MORAL), `nombre`, `paterno`, `materno`, `razon_social`, `contratante` (columna generada), `fecha_nacimiento`, `genero`, `rfc`, `id_grupo`, `id_ejecutivo`, `id_usuario`, `fecha_actualizacion`, `documentos` (JSON), `fecha_creacion`.

### Decidido

- `contratante` se mantiene como columna generada, en orden nombre, paterno, materno (o razón social).
- **El vendedor no va en `clientes`:** es de cada póliza. Un cliente puede tener pólizas de distintos vendedores. La ficha del cliente muestra los vendedores distintos de sus pólizas.

### Cambios recomendados (pendientes de aplicar)

1. Agregar `id_sicas` (único) para enlazar con el ID del cliente en SIAP/Sicas y poder sincronizar.
2. Permitir NULL en `genero` (las personas morales no tienen género; hoy quedan como MASCULINO).
3. Permitir NULL en `nombre`, `paterno` y `materno` (no aplican a personas morales).
4. Pasar todo el texto de la tabla a `utf8mb4` (hoy hay mezcla de `latin1_spanish_ci` y `utf8mb4_bin`), para evitar errores de collation en los JOIN.
5. Mover `documentos` (JSON) a una tabla `cliente_documentos` con tipo, estatus, fecha de emisión y archivo.
6. `rfc`: reducir a `varchar(13)` y agregar índice.
7. Agregar `activo` para dar de baja sin borrar.

### Por confirmar

- Significado de `fecha_actualizacion` (última modificación del registro o última confirmación de datos con el cliente).
- Si `id_grupo` e `id_ejecutivo` tienen llave foránea real o solo índice.
- `fecha_nacimiento` en personas morales: ¿se usa como fecha de constitución?
