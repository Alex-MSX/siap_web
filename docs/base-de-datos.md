# Base de datos

Notas de diseño de las tablas de SIAP Web. Cada tabla se revisa contra la estructura que ya existe en MySQL antes de cambiar nada.

## Reglas generales

- **Nombres de personas físicas:** siempre en el orden nombre, apellido paterno, apellido materno (por ejemplo, "RICARDO VALLE TORRES"). Para ordenar alfabéticamente por apellido se usa `ORDER BY paterno, materno, nombre`; el orden de despliegue no cambia.
- **Nombres de columnas** en snake_case.
- **No guardar lo que se puede calcular** y cambia con el tiempo (por ejemplo, "tiene pólizas vigentes" o "cliente desde").
- **Datos sensibles:** tarjetas solo con últimos 4 dígitos; contraseñas de portales cifradas, nunca en texto plano.

## Modelo de clientes, direcciones y datos fiscales

### Tabla `clientes`

Estructura actual (diseñada por Alex): `id_cliente`, `persona` (FISICA/MORAL), `nombre`, `paterno`, `materno`, `razon_social`, `contratante` (columna generada), `fecha_nacimiento`, `genero`, `rfc`, `id_grupo`, `id_ejecutivo`, `id_usuario`, `fecha_actualizacion`, `documentos` (JSON), `fecha_creacion`.

**Decidido**

- `contratante` se mantiene como columna generada, en orden nombre, paterno, materno (o razón social).
- `rfc` se queda en `clientes`: identifica a la persona o empresa y es por lo que se busca. Puede ser distinto al RFC de facturación (ver perfiles fiscales).
- **El vendedor no va en `clientes`:** es de cada póliza. Un cliente puede tener pólizas de distintos vendedores.
- **Sin columna `cliente_desde`:** se calcula como la fecha de inicio de su póliza más antigua. Al migrar desde Sicas, si existe una fecha de alta, se carga en `fecha_creacion`.
- **"Activo" no significa "tiene pólizas vigentes":** eso se calcula. Un cliente sin pólizas vigentes sigue siendo cliente. Si se agrega un campo de baja, es solo para registros que ya no deben usarse (duplicados fusionados, capturas por error, bajas solicitadas); nombre sugerido `estatus` (ACTIVO / DUPLICADO / BAJA).
- **El régimen fiscal no va en `clientes`:** va en su perfil fiscal.

**Cambios recomendados (pendientes de aplicar)**

1. Agregar `id_sicas` (único) para enlazar con el ID del cliente en SIAP/Sicas y poder sincronizar.
2. Permitir NULL en `genero` (las personas morales no tienen género; hoy quedan como MASCULINO).
3. Permitir NULL en `nombre`, `paterno` y `materno` (no aplican a personas morales).
4. Pasar todo el texto de la tabla a `utf8mb4` (hoy hay mezcla de `latin1_spanish_ci` y `utf8mb4_bin`), para evitar errores de collation en los JOIN.
5. Mover `documentos` (JSON) a una tabla `cliente_documentos` (identificación oficial, acta constitutiva, etc.). La constancia fiscal se guarda en el perfil fiscal.
6. `rfc`: reducir a `varchar(13)` y agregar índice.
7. `fecha_actualizacion`: si representa la fecha de la constancia fiscal, se migra a `perfiles_fiscales.fecha_emision_csf` y se elimina de `clientes`.

### Tabla `direcciones`

Todas las direcciones son del cliente (`id_cliente`). Pólizas y perfiles fiscales solo apuntan a ellas, para que una corrección (por ejemplo, el código postal) se refleje en todos lados.

### Tabla `perfiles_fiscales` (nueva)

Los datos a los que sale la factura. **Relación 1 a 1 con `clientes`**: cada cliente tiene exactamente un perfil fiscal, garantizado por un índice UNIQUE en `id_cliente`.

| Columna | Para qué |
|---|---|
| `id_perfil_fiscal` | Llave |
| `id_cliente` | Cliente al que pertenece (UNIQUE: 1 a 1) |
| `rfc` | RFC al que sale la factura |
| `nombre_fiscal` | Nombre o razón social tal como viene en la constancia |
| `regimen_fiscal` | Régimen de la constancia |
| `id_direccion` | Dirección fiscal (una de las direcciones del cliente; de ahí sale el código postal) |
| `fecha_emision_csf` | Fecha impresa en la constancia de situación fiscal |
| `archivo_csf` | PDF de la constancia |
| `fecha_carga_csf` | Cuándo se subió a SIAP |

- **Caso normal:** el perfil tiene el mismo RFC que el cliente y se crea al darlo de alta.
- **Caso excepcional** (escuela de natación que factura a nombre de la dueña): el único perfil fiscal del cliente tiene el RFC y los datos de la dueña; `clientes.rfc` conserva el RFC de la escuela.
- **La constancia no tiene vigencia legal** (el SAT lo ha aclarado: solo deja de servir si cambian los datos del RFC). Por eso se guarda su fecha de emisión y la regla de cuándo pedir una nueva (por ejemplo, más de un año o cambio de régimen) es una regla interna de Prolomer que se calcula, no un dato.

### Pólizas: direcciones y facturación

| Columna / tabla | Para qué |
|---|---|
| `polizas.id_direccion_riesgo` | Dirección principal de la póliza (la de la carátula). Siempre existe |
| `polizas.requiere_factura` | Sí/no. Si es sí, la factura sale al perfil fiscal del cliente |
| `poliza_ubicaciones` | Ubicaciones adicionales aseguradas: póliza, dirección, descripción y suma asegurada |

Ejemplos:

| Caso | Dirección de riesgo | Factura | Ubicaciones adicionales |
|---|---|---|---|
| Auto | La del asegurado | Sí, al perfil fiscal del cliente (su dirección fiscal puede ser otra) | — |
| Empresarial | La principal | Sí | Una por cada ubicación (por ejemplo, 8) |
| Vida | La de la carátula | No | — |
| Vida deducible | La de la carátula | Sí | — |

Se usa `requiere_factura` explícito en lugar de dejar un campo vacío, para distinguir "no quiere factura" de "no se capturó" y poder reportar errores.

## Por confirmar

- Significado de `fecha_actualizacion` en `clientes` (¿es la fecha de la constancia fiscal?).
- Si `id_grupo` e `id_ejecutivo` tienen llave foránea real o solo índice.
- `fecha_nacimiento` en personas morales: ¿se usa como fecha de constitución?
