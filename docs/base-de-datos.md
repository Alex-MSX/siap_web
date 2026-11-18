# Base de datos

Notas de diseño de las tablas de SIAP Web. Cada tabla se revisa contra la estructura que ya existe en MySQL antes de cambiar nada.

## Reglas generales

- **Nombres de personas físicas:** siempre en el orden nombre, apellido paterno, apellido materno (por ejemplo, "RICARDO VALLE TORRES"). Para ordenar alfabéticamente por apellido se usa `ORDER BY paterno, materno, nombre`; el orden de despliegue no cambia.
- **Nombres de columnas** en snake_case.
- **No guardar lo que se puede calcular** y cambia con el tiempo (por ejemplo, "tiene pólizas vigentes" o "cliente desde").
- **Datos sensibles:** tarjetas solo con últimos 4 dígitos; contraseñas de portales cifradas, nunca en texto plano.

## Modelo de clientes, direcciones y datos fiscales

### Tabla `clientes`

Estructura actual, **idéntica en MySQL local y en MySQL web** (homologada el 18/11/2026). Toda la tabla en `utf8mb4` / `utf8mb4_general_ci`.

| Columna | Tipo | Nota |
|---|---|---|
| `id_cliente` | int, PK | El mismo ID de Sicas (`IDCli`) |
| `persona` | enum FISICA/MORAL | Obligatorio |
| `nombre`, `paterno`, `materno` | varchar(100), NULL | Solo personas físicas |
| `razon_social` | varchar(255), NULL | Solo personas morales |
| `contratante` | varchar(500), generada | `IF(persona='MORAL', razon_social, CONCAT_WS(' ', nombre, paterno, materno))` |
| `fecha_nacimiento` | date, NULL | En morales, fecha de constitución |
| `genero` | enum MASCULINO/FEMENINO, NULL | NULL en morales |
| `rfc` | varchar(13), NULL por ahora | Índice normal (no UNIQUE). Se vuelve obligatorio tras limpiar los datos |
| `curp` | varchar(18), NULL | Solo personas físicas |
| `id_grupo` | int, NULL | Llave foránea a `grupos` |
| `id_ejecutivo` | int | Llave foránea a `ejecutivos` |
| `id_usuario` | int | Quién dio de alta al cliente (ver regla en "Sincronización") |
| `estatus` | enum ACTIVO/INACTIVO | ACTIVO por omisión |
| `fecha_creacion` | datetime | Al migrar, viene de `FechaCap` de Sicas |
| `fecha_modificacion` | datetime | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`, con índice. Es la que usa la sincronización con la web |

**Decidido**

- **`id_cliente` es el mismo ID de Sicas** (no hay `id_sicas` ni tabla de equivalencias). Regla de convivencia: mientras SIAP y la web convivan, solo SIAP da de alta clientes y la web los recibe con su ID; cuando la web tome el control, el `AUTO_INCREMENT` sigue desde el ID más alto y SIAP deja de crear clientes. Si los dos sistemas crearan clientes al mismo tiempo, podrían asignar el mismo número a clientes distintos.
- `contratante` se mantiene como columna generada, en orden nombre, paterno, materno (o razón social). Con campos que aceptan NULL debe usar `CONCAT_WS` (con `CONCAT`, un solo NULL deja el nombre vacío).
- `nombre`, `paterno`, `materno` y `genero` aceptan NULL (no aplican a personas morales). **Aplicado.**
- **`razon_social` es obligatoria** (decisión de Alex); en personas físicas queda vacía. Si la versión de MySQL lo permite (8.0.16+ o MariaDB 10.2+), se recomienda un `CHECK` que exija razón social en morales y nombre y paterno en físicas.
- **`fecha_nacimiento` en personas morales es la fecha de constitución.** En pantalla la etiqueta cambia según el tipo de persona.
- `rfc` se queda en `clientes` y es obligatorio (para extranjeros o público en general existen los RFC genéricos): identifica a la persona o empresa y es por lo que se busca. Puede ser distinto al RFC de facturación (ver perfiles fiscales).
- **`estatus` ACTIVO / INACTIVO:** INACTIVO significa registro que ya no se usa (duplicado, captura por error, baja solicitada), **no** cliente sin pólizas vigentes (eso se calcula). **Aplicado.**
- **El vendedor no va en `clientes`:** es de cada póliza. Un cliente puede tener pólizas de distintos vendedores.
- **Sin columna `cliente_desde`:** se calcula como la fecha de inicio de su póliza más antigua. Al migrar desde Sicas, si existe una fecha de alta, se carga en `fecha_creacion`.
- **El régimen fiscal no va en `clientes`:** va en su perfil fiscal.
- `fecha_actualizacion` (era la fecha de la constancia fiscal) pasa a `perfiles_fiscales.fecha_emision_csf`. **Columna ya eliminada de `clientes`.**
- `documentos` (JSON) pasa a una tabla `cliente_documentos` (identificación oficial, acta constitutiva, etc.). La constancia fiscal se guarda en el perfil fiscal. **Columna ya eliminada de `clientes`.**

**Aplicado el 18/11/2026:** `utf8mb4_general_ci` en las dos bases, `rfc` en `varchar(13)` con índice, `curp` en `varchar(18)`, `fecha_modificacion` con índice, llaves foráneas de `id_grupo` e `id_ejecutivo`, `contratante` con `CONCAT_WS`.

**Pendiente de aplicar**

1. **Calidad del RFC** (revisión del 18/11/2026 sobre 4,752 clientes): 886 sin RFC y 1,242 con un largo distinto de 12 o 13 (incluye vacíos). Revisar por tipo de persona y largo, corregir guiones y espacios y decidir qué hacer con los que no tienen RFC (por ejemplo, el genérico `XAXX010101000`). Después, volver `rfc` obligatorio.
2. Agregar el `CHECK` de persona física/moral. Los datos ya lo cumplen: 0 morales sin razón social y 0 físicas sin nombre, paterno o género.
3. Homologar los índices de las dos bases. Tienen nombres distintos y la web tiene además un FULLTEXT en `contratante`.
4. `id_usuario`: crear la tabla `usuarios` en MySQL y su llave foránea.
5. Crear `perfiles_fiscales` y `cliente_documentos`, y pasar ahí la constancia y los documentos (en Sicas: `Identificacion`, `CedulaFiscal`, `ActaConstitutiva`, `Vigencia_CSF`).
6. Confirmar si `IDGrupo` de Sicas usa los mismos IDs que `grupos` de MySQL, para copiarlo a `id_grupo` (hoy no se copia).

### Sincronización de clientes

**Flujo:** Access (Sicas) → MySQL local → MySQL web. Mientras exista Sicas, Access es la fuente de verdad.

**De Access a MySQL local (terminado el 18/11/2026).** Todo vive en la clase `Cliente` de SIAP:

- `Cliente.Copiar_A_MySQL(id)` lee el cliente ya guardado en Access y lo guarda en MySQL local con `INSERT ... ON DUPLICATE KEY UPDATE` (lo crea si no existe, lo actualiza si existe). Nunca escribe en Access y nunca interrumpe al usuario: los errores van a `logs\sync_clientes.log`.
- Se llama al dar de alta un cliente (`Actualizar()`), al reasignar ejecutivo (`Reasignar_Ejecutivo`) y **al abrir la consulta de un cliente**. Lo último atrapa las ediciones que se hacen directo en Sicas.
- `Cliente.Sincronizar_Todos()` recorre todo Access y copia cada cliente. Omite (y anota en el log) los que tienen un ejecutivo que no existe en MySQL. Se puede repetir sin duplicar nada. Se corrió en producción el 18/11/2026: 4,829 clientes copiados, 0 omitidos, 0 errores. Access y MySQL local quedaron iguales.

**Mapa de columnas**

| MySQL | Sicas (Access) | Regla |
|---|---|---|
| `id_cliente` | `IDCli` | Igual |
| `persona` | `Persona` | 0 → FISICA; cualquier otro valor → MORAL |
| `nombre`, `paterno`, `materno` | `Nombre`, `ApellidoP`, `ApellidoM` | Sin espacios sobrantes; vacío → NULL. Solo físicas |
| `razon_social` | `Contratante` | Solo morales. Se usa `Contratante` porque la edición de SIAP actualiza esa columna y no `RazonSocial` |
| `fecha_nacimiento` | `FecNac` / `FConstitucion` | Según el tipo de persona |
| `genero` | `Sexo` | 0 → MASCULINO; cualquier otro valor (1, -1 o 255) → FEMENINO. NULL en morales |
| `rfc`, `curp` | `RFC`, `CURP` | Sin espacios sobrantes; vacío → NULL |
| `id_ejecutivo` | `IDEjecut` | Igual. El ejecutivo debe existir en `ejecutivos` de MySQL |
| `id_usuario` | `UsuarioLU` | Se traduce con la lista de usuarios de SIAP; vacío o desconocido → 1 (AMORENO). Solo se llena si está en 0 o vacío. Nota: `UsuarioLU` se sobrescribe al notificar el artículo 492, así que no siempre es quien dio de alta |
| `fecha_creacion` | `FechaCap` | Solo al crear; nunca se actualiza |
| `estatus` | — | ACTIVO al crear; nunca se actualiza desde Access |
| `id_grupo` | — | No se copia por ahora |

**Usuarios de SIAP y su `id_usuario`:** 1 AMORENO, 2 CLATORRE, 3 LAURA, 4 ROSE, 5 SANDRA, 6 JAVIER, 7 EDGAR, 8 SERGIO, 9 MA.EUGENIA, 15 EMILIANO. Mientras no exista la tabla `usuarios` en MySQL, esta lista vive en el código de SIAP y hay que agregar a cada usuario nuevo.

**Pendientes del lado de SIAP**

- `db.Ejecutar` muestra un `MsgBox` por dentro cuando falla, así que un error de sincronización le aparece al usuario en pantalla. Hacer una versión que lance el error, solo para la sincronización. Mientras tanto: dar de alta en MySQL cada ejecutivo nuevo de Sicas.
- SIAP guardaba `Sexo` como 255 para femenino (mandaba un Boolean). Alex lo corrige para guardar 1; la copia ya acepta los dos.
- Los ejecutivos también tendrán que sincronizarse de Access a MySQL.

**De MySQL local a la web (siguiente paso).** Ver `docs/estado.md`.

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
| 5. Método de pago | Booleano | `metodo_pago_renovacion` + quién y cuándo (se guarda la decisión, no solo que se tomó). La forma de pago no va aquí: se pide en la orden de renovación, y un cambio posterior es una solicitud de cambio de forma de pago |
| Cierre | Booleano que pone el código | Columna generada a partir de los 5 pasos, para que no se pueda desincronizar |

- **Regla del panel:** proceso incompleto **y** estatus distinto de NO RENOVADA y CANCELADA.
- Una tabla aparte `procesos_renovacion` (1 a 1 con la póliza) solo valdría la pena si se quiere guardar el historial de cada confirmación y su deshacer. Con un renglón por vigencia no es indispensable.

### Dirección fiscal y domiciliación en el proceso

- **Dirección fiscal:** en el paso de direcciones solo se valida; no se edita. Viene del perfil fiscal del cliente y cambia al cargar una nueva constancia de situación fiscal.
- **Domiciliación:** si la póliza que se renueva está domiciliada (o en proceso de domiciliarse: tarjeta asignada sin endoso), la ficha del proceso muestra un aviso desde que se abre, y el panel de renovaciones marca la póliza. En gastos médicos y vida la domiciliación suele continuar en la renovación, así que un cambio que afecte la prima se debe detectar antes de generar la orden. Este aviso depende del estado de domiciliación de la póliza (ver el problema de fondo de domiciliación en SIAP: `catc` e `idtarjeta` pueden desincronizarse y están duplicados en pólizas y recibos; se revisará al diseñar pólizas y recibos).

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

