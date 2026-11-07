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
7. `fecha_actualizacion` (confirmado: es la fecha de la constancia fiscal): se migra a `perfiles_fiscales.fecha_emision_csf` y se elimina de `clientes`.
8. Convertir `id_grupo` e `id_ejecutivo` (hoy solo índices) en llaves foráneas reales.

### Llaves foráneas de `clientes`

- **`id_ejecutivo` → `ejecutivos`:** quién atiende al cliente. Llave RESTRICT: no se puede borrar un ejecutivo con clientes asignados; primero se reasignan y luego se marca inactivo.
- **`id_grupo` → `grupos`:** agrupa clientes para el portal de clientes (como SIAP_ATP). El acceso se da con `usuarios_portal.id_grupo` → `grupos`: el usuario apunta al grupo, para que un grupo pueda tener varios usuarios (por ejemplo, director y administración de la misma empresa), todos viendo las pólizas del grupo.
- Los usuarios del portal (clientes) van separados de los usuarios internos de Prolomer, o al menos distinguidos por rol, para que un cliente nunca vea pantallas internas.

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

## Proceso de renovación

**Principio:** el estatus de la póliza (vigente, cancelada, renovada, no renovada) y el proceso de renovación son cosas distintas. Una póliza puede estar RENOVADA y su proceso seguir abierto. El panel de renovaciones muestra los procesos abiertos, no las pólizas sin renovar.

### Cómo está hoy en SIAP

- 5 columnas booleanas en `polizas` (una por paso) que nacen apagadas al capturar la póliza, más un campo maestro que el código pone en verdadero cuando los 5 pasos se cumplen.
- Como cada renovación es una póliza nueva (un renglón nuevo), cada vigencia tiene sus propios campos: la historia año con año se conserva.
- El cierre es automático (nadie lo marca a mano). Se conserva.

### Cambios recomendados

| Paso | Hoy | Propuesta |
|---|---|---|
| 1. Artículo 492 | Booleano | Calculado desde los documentos del cliente (si se vence un documento, el paso deja de cumplirse) |
| 2. Contactos | Booleano | `contactos_confirmado_por` + `contactos_confirmado_en` (vacío = pendiente) |
| 3. Direcciones | Booleano | `direcciones_confirmado_por` + `direcciones_confirmado_en` |
| 4. Renovación | Booleano | Calculado: existe una póliza nueva no cancelada con `id_poliza_anterior` = esta |
| 5. Forma de pago | Booleano | `forma_pago_renovacion` + `metodo_pago_renovacion` + quién y cuándo (se guarda la decisión, no solo que se tomó, y se usa al generar la orden) |
| Cierre | Booleano que pone el código | Columna generada a partir de los 5 pasos, para que no se pueda desincronizar |

- **Regla del panel:** proceso incompleto **y** estatus distinto de NO RENOVADA y CANCELADA.
- Una tabla aparte `procesos_renovacion` (1 a 1 con la póliza) solo valdría la pena si se quiere guardar el historial de cada confirmación y su deshacer. Con un renglón por vigencia no es indispensable.

### "No renovar"

Una sola operación, en **transacción** (se aplica todo o nada):

1. La póliza vigente pasa a NO RENOVADA.
2. Si hay orden de renovación en trámite, se cancela.
3. Si ya hay póliza renovada, se cancela.
4. El proceso se cierra con resultado "no renovada" y la póliza sale del panel.

- **Quién:** cualquier ejecutivo sobre su cartera, sin aprobación.
- **Se guarda:** motivo (obligatorio), comentario, evidencia (recomendada: correo o captura de WhatsApp), quién, cuándo y qué orden o póliza se canceló.
- **Antes de confirmar** se muestra exactamente qué se va a cancelar.
- **Póliza renovada ya pagada:** en la práctica no ocurre (si el cliente no renueva, no paga). Como salvaguarda, si tuviera recibos cobrados el aviso lo marca en rojo.
- **Sin deshacer:** si el cliente cambia de opinión, se tramita una rehabilitación de póliza desde Solicitudes.

## Por confirmar

- `fecha_nacimiento` en personas morales: ¿se usa como fecha de constitución?
