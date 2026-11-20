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

**De MySQL local a la web (terminado el 18/11/2026).**

- **API** `public_html/api_web/clientes.php` (código en `api_web/clientes.php`). Recibe `{"clientes": [...]}` por POST con `Authorization: Bearer <clave>`. Valida cada cliente (persona, nombre y paterno en físicas, razón social en morales, género en físicas, fechas reales, largo de RFC y CURP, ejecutivo y grupo existentes en la web, estatus) y guarda con `INSERT ... ON DUPLICATE KEY UPDATE`. No recibe `contratante` (es generada) ni `fecha_modificacion` (la pone MySQL de la web). Respuestas: 200 con `guardados` y `rechazados` (con motivo), 400, 403, 405 y 500.
- **Secretos en el hosting:** `/home/commxprolomer/siap_config/api_web.php` (permisos 600; clave de la API y acceso a MySQL). Log de la API: `/home/commxprolomer/siap_config/api_web.log` (intentos sin clave, rechazados y fallas).
- **Usuario de MySQL web:** `commxprolomer_siap_api`, con SELECT, INSERT y UPDATE sobre `commxprolomer_siap` (cPanel no permite permisos por tabla). Sin DELETE ni cambios de estructura.
- **Programa de envío:** `C:\SIAP_Sync\sync_clientes.ps1` con `config.json` al lado (ejemplo sin secretos en `sincronizador/config.ejemplo.json`). Usuario de MySQL local `siap_sync`: SELECT en `clientes`, SELECT y UPDATE en `sincronizacion`.
- **Carga inicial:** 4,829 clientes, 0 rechazados.

**Tabla `sincronizacion` (MySQL local)** (SQL en `sincronizador/instalar_mysql_local.sql`)

| Columna | Para qué |
|---|---|
| `tabla` | PK. Qué se envía (`clientes`; después `ejecutivos`, `polizas`) |
| `ultima_fecha` | `fecha_modificacion` del último registro confirmado por la web |
| `ultimo_id` | ID del último registro confirmado (desempate con la misma fecha) |
| `ultima_revision` | Última vez que corrió el envío, aunque no hubiera cambios |
| `ultimo_resultado` | `OK: ...` o `ERROR: ...` de la última vuelta |

Para reenviar todo desde cero (por ejemplo, tras vaciar la tabla de la web): `UPDATE siap.sincronizacion SET ultima_fecha = '2000-01-01 00:00:00', ultimo_id = 0 WHERE tabla = 'clientes';` (con el usuario administrador). Reenviar no duplica nada.

### Tabla `ejecutivos`

Estructura igual en las dos bases (18/11/2026): `id_ejecutivo` (PK), `nombre`, `paterno`, `materno`, `puesto`, `correo`, `telefono`, `extension`. Se quitó `whatsapp`. Los IDs son los mismos en local y web (29 "SIN ASIGNAR", 41, 45, 46, 47, 49, 50, 51). Por ahora, cada ejecutivo nuevo se da de alta a mano en las dos bases.

### Llaves foráneas de `clientes`

- **`id_ejecutivo` → `ejecutivos`:** quién atiende al cliente. Llave RESTRICT: no se puede borrar un ejecutivo con clientes asignados; primero se reasignan y luego se marca inactivo.
- **`id_grupo` → `grupos`:** agrupa clientes para el portal de clientes (como SIAP_ATP). El acceso se da con `usuarios_portal.id_grupo` → `grupos`: el usuario apunta al grupo, para que un grupo pueda tener varios usuarios (por ejemplo, director y administración de la misma empresa), todos viendo las pólizas del grupo.
- Los usuarios del portal (clientes) van separados de los usuarios internos de Prolomer, o al menos distinguidos por rol, para que un cliente nunca vea pantallas internas.

### Tablas `direcciones` y `direcciones_detalle` (actualizado 19/11/2026)

**MySQL manda en direcciones.** Sicas solo recibe un renglón cuando en MySQL se liga una dirección a un cliente (mientras SIAP capture pólizas en Sicas, cada póliza necesita un `IDD`). Sicas ya no se actualiza: si el tipo, el fiscal o el texto no coinciden con MySQL, no importa. Nada en SIAP debe leer los datos de la dirección desde Sicas.

- **`direcciones`**: la dirección física, una sola vez aunque la compartan muchos clientes (en Sicas una misma dirección llegaba a repetirse 67 veces). Columnas: `id_direccion`, `calle`, `exterior`, `interior`, `colonia`, `poblacion`, `estado`, `codigo_postal`. Llave única `uq_direcciones (calle, exterior, interior, codigo_postal)`. **Antes la llave no incluía el CP** y `Registrar` hacía `ON DUPLICATE KEY UPDATE` de colonia, ciudad y CP: una misma calle y número en otra ciudad sobrescribía la dirección existente de todos sus clientes. Ahora, si ya existe, solo se toma su ID (`ON DUPLICATE KEY UPDATE id_direccion = LAST_INSERT_ID(id_direccion)`). Se quitó la columna `revision`.
- **`direcciones_detalle`**: la relación cliente-dirección. Columnas: `id`, `id_direccion`, `id_cliente`, `es_envio`, `es_fiscal`, y las generadas `envio_de` y `fiscal_de` con llave única: **un cliente no puede tener dos direcciones de envío ni dos fiscales**. Solo clientes (se quitaron `tabla_referencia` y `estatus`). Quitarle una dirección a un cliente = borrar su renglón; la dirección física sigue existiendo y las pólizas que la usaron la conservan.
- **Llaves foráneas pendientes** (decisión de Alex: después): `id_direccion → direcciones`, `id_cliente → clientes`.
- **Al editar una dirección compartida**, el formulario avisa a cuántos clientes afecta: "corregir para todos" (un CP mal capturado) o "solo este cliente" (mudanza: el cliente pasa a una dirección propia).
- Cuando exista `perfiles_fiscales`, la dirección fiscal se moverá ahí (`perfiles_fiscales.id_direccion`); por ahora es la marca `es_fiscal`.

**Clase `Direccion` de SIAP (reescrita el 19/11/2026):**

- El constructor conserva sus parámetros (`iddireccion`, `idcliente`, `id_direccion_siap`) para no romper los ~20 lugares donde se usa. Si solo llega el `IDD` de Sicas, lee de Sicas únicamente a qué `id_direccion` corresponde y carga todo de MySQL. Con el tiempo, cada formulario se cambia para usar el ID de MySQL directo.
- `Direccion.Filtrar(id_cliente)`, `Registrar(id_cliente, solo_este_cliente)`, `Esconder`, `Definir_Envio`, `Definir_Fiscal`, `Contar_Direcciones`, `Clientes_Que_Comparten`.
- `Asegurar_En_Sicas` es el único método que escribe en Sicas: crea el renglón de la pareja cliente + dirección si no existe y regresa su `IDD`.
- `Direccion.Sincronizar_Todas()`: **carga inicial, se corre una sola vez** (una segunda corrida volvería a ligar direcciones que se le quitaron a un cliente en MySQL). Por cada renglón de Sicas: crea o reutiliza la dirección física, escribe su `id_direccion` en Sicas (así se traducen los `IDD` de las pólizas) y liga al cliente solo las visibles (`Estatus = False`), con sus marcas de envío y fiscal. Log en `logs\sync_direcciones.log`. **Todavía no se corre**: probar primero contra las copias, porque escribe en Sicas.
- Errores corregidos: `Limpiar_Calle` perdía las mayúsculas (borraba letras capturadas en minúsculas); el constructor por ID de MySQL leía mal tipo y fiscal; `Registrar` usaba dos clientes distintos y fallaba en silencio si la búsqueda aproximada encontraba dos direcciones. Se quitó `Obtener_ID_Direccion`.
- Por revisar: `Form_Registrar_Emision` línea 224 (`New Direccion(id_direccion)`: si es ID de MySQL debe ser `New Direccion(0, 0, id_direccion)`); `Obtener_Direccion_Fiscal` (seguramente lee de Sicas); formularios que lean la tabla `Direcciones` de Sicas directamente.

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

## Pólizas (18/11/2026)

### Tabla `polizas` (MySQL local, base `siap`)

Ya creada en `siap` (y copiada a `siap_prueba`). Falta crearla en la web. Toda en `utf8mb4_general_ci`.

| Columna | Tipo | Nota |
|---|---|---|
| `id_poliza` | int, PK | El mismo `IDPoliza` de Sicas. Tiene `AUTO_INCREMENT`, pero mientras exista Sicas solo la sincronización inserta y siempre manda el ID |
| `numero` | varchar(45) | Número de póliza **limpio** con `Limpiar_Poliza` (sin ceros a la izquierda en las partes numéricas: `0000006546654` → `6546654`). Decisión de Alex. Quien busque por número debe limpiar lo que busca con la misma regla |
| `id_poliza_anterior` | int, NULL | La póliza que esta renueva. "Renovada" y "tiene renovación" se calculan buscando quién la tiene como anterior. **No hay columna de posterior** |
| `id_inicial` | int | Primera póliza de la cadena (la columna `IDInicial` que Alex agregó en Sicas). Si viene vacía, el propio ID |
| `id_cliente` | int | Llave foránea a `clientes` (la única llave activa por ahora) |
| `id_direccion_riesgo` | int, NULL | Sin llave hasta que exista `direcciones` en MySQL |
| `orden` | varchar(45), NULL | Folio de la OT que la generó, con prefijo `OT-`. Después se liga a `id_orden` |
| `orden_renovacion` | varchar(45), NULL | **Temporal**, hasta el módulo de órdenes: OT de renovación en trámite |
| `clave` | varchar(45) | Clave de agente. La aseguradora sale de `claves` |
| `id_aseguradora` | int | Redundancia **controlada**: cuando se pongan las llaves dobles, tiene que coincidir con la de la clave y la del plan |
| `id_plan` | int, NULL por ahora | Plan = ramo + aseguradora. El ramo sale del plan (no hay `id_ramo` en pólizas). NULL permitido solo para la carga |
| `desde`, `hasta` | date | Vigencia |
| `id_moneda`, `id_forma_pago`, `id_vendedor`, `id_ejecutivo` | int | Sin llave por ahora (ver "Llaves pendientes"). El ejecutivo se queda como historia de quién atendió cada póliza |
| `concepto` | varchar(255) | Texto vacío si Sicas no trae |
| `estatus` | enum | `VIGENTE`, `RENOVADA`, `CANCELADA`, `NO RENOVADA`, `PRORROGADA`, `SALDADA`. Las dos últimas son de vida y no existen en Sicas. Riesgo aceptado: RENOVADA se guarda y puede contradecir la liga de renovación (revisión periódica) |
| `neta`, `descuento`, `recargos`, `gastos`, `iva`, `total` | decimal(14,4) | 4 decimales por decisión de Alex (cálculos sin errores de redondeo). `total` sigue guardado; se vuelve generado solo si la revisión del descuento en Sicas cuadra |
| `porcentaje_comision` | decimal(7,4), NULL | De `PComN`. NULL = todavía no se conoce |
| `id_tarjeta` | int, NULL | NULL = sin tarjeta |
| `domiciliada` | tinyint(1) | 1 = ya salió el endoso de domiciliación |
| `cobranza` | generada | `AGENTE` (sin tarjeta), `EN PROCESO` (tarjeta sin endoso), `DOMICILIADA`. `CHECK ck_polizas_domiciliada`: no puede estar domiciliada sin tarjeta |
| `fecha_cancelacion`, `motivo_cancelacion` | date / varchar(255), NULL | |
| `renovacion_terminada` | tinyint(1) | **Temporal**, hasta el módulo de renovaciones: la póliza cumplió todos los pasos del proceso (es distinto de estar renovada) |
| `fecha_creacion` | datetime | De `FechaCaptura`; solo al crear |
| `fecha_modificacion` | datetime | `ON UPDATE CURRENT_TIMESTAMP`, con índice. Para la sincronización con la web |

Índices: `numero`, `id_poliza_anterior`, `id_inicial`, `hasta` (panel de renovaciones), `fecha_modificacion`, `id_aseguradora`, además de los de cada llave.

Lo que **no** va en `polizas` (cada uno en su módulo): datos del bien asegurado (conductor, vehículo, inmueble, avión, carga), coberturas y sumas, reglas para generar recibos, fechas de trámite y entrega, incisos de flotillas, pasos de renovación y bitácora.

Pendiente de agregar cuando se llegue a facturación: `requiere_factura` (ver "Pólizas: direcciones y facturación").

**Panel de renovaciones con este modelo:** la póliza nueva se busca con `LEFT JOIN polizas nueva ON nueva.id_poliza_anterior = p.id_poliza AND nueva.estatus <> 'CANCELADA'`. Si existe: "Póliza renovada"; si no, y hay `orden_renovacion`: OT en trámite; si no: "Sin orden". Filtro: `hasta` en los próximos 40 días o vencida, `renovacion_terminada = 0` y estatus distinto de NO RENOVADA y CANCELADA.

### Llaves pendientes (se quitaron para no detener la carga)

Decisión del 18/11/2026: **primero cargar, luego medir, limpiar y al final poner las llaves.** Con 20 años de datos de Sicas, muchas pólizas no pasarían las llaves (por ejemplo, ejecutivos que ya no están en `ejecutivos`). Este paso es **obligatorio antes de mandar pólizas a la web**:

1. Reporte de huérfanos: pólizas con ejecutivo, vendedor, clave, plan, moneda o forma de pago que no existen en su catálogo; y pólizas cuya clave y plan son de aseguradoras distintas a `id_aseguradora`.
2. Corregir (por ejemplo: dar de alta ejecutivos antiguos como inactivos, crear los planes que falten).
3. Poner las llaves: `fk_polizas_claves (clave, id_aseguradora) → claves`, `fk_polizas_planes (id_plan, id_aseguradora) → planes` (las dos dobles: impiden clave y plan de aseguradoras distintas), `id_moneda → monedas`, `id_forma_pago → formas_pago`, `id_vendedor → vendedores`, `id_ejecutivo → ejecutivos`, `CHECK (hasta >= desde)` y volver `id_plan` obligatorio. Las llaves de `id_tarjeta` e `id_direccion_riesgo` esperan a que existan esas tablas.

Los `UNIQUE (clave, id_aseguradora)` en `claves` y `UNIQUE (id_plan, id_aseguradora)` en `planes`, que necesitan las llaves dobles, ya están creados.

### Catálogos de pólizas (MySQL local, todos en `utf8mb4_general_ci`)

Todos con los mismos IDs de Sicas. Tienen que existir también en la web, con los mismos IDs, antes de mandar pólizas.

| Tabla | Columnas | Notas |
|---|---|---|
| `aseguradoras` | `id_aseguradora`, `aseguradora`, `estatus` (ACTIVA/INACTIVA) | |
| `agentes` | `id_agente`, `agente`, `estatus` | Un solo campo de nombre (hay agentes que son empresas) |
| `claves` | `clave` (PK), `id_agente`, `id_aseguradora`, `estatus` (ACTIVA/INACTIVA) | La clave es única: Alex confirma que es casi imposible que se repita entre aseguradoras, y la PK lo garantiza |
| `ramos` | `id_ramo`, `ramo`, `abreviatura` (única), `categoria`, `tipo_asegurados`, `tiene_iva`, `estatus` | 44 ramos, mismos IDs de Sicas. `categoria` (AUTOS, GMM, VIDA, ACCIDENTES, HOGAR, OTROS) = pestañas de Clientes. `tipo_asegurados` (PERSONAS, VEHICULOS, UBICACIONES, OTROS) = qué pestaña muestra la ficha. Fianzas (33 a 36) inactivas: Prolomer no maneja fianzas. No se migró `CamposConcep` de Sicas (receta del concepto con columnas que ya no existen). Todas las pólizas se renuevan, así que no hay columna "renovable" |
| `planes` | `id_plan`, `id_aseguradora`, `id_ramo`, `plan`, `estatus` | Un plan por pareja ramo + aseguradora (`UNIQUE (id_ramo, id_aseguradora)`). El plan es el producto de esa aseguradora (FLEX PLUS de AXA, LÍNEA AZUL de GNP); los genéricos como TRANSPORTE ESPECÍFICO se repiten una vez por aseguradora (opción A, decidida) |
| `monedas` | `id_moneda`, `moneda`, `codigo` (único) | 1 PESOS (MXN), 2 DOLARES (USD), 3 UDIS. Mismos IDs de Sicas. Se quitó `tipo_cambio`: el que importa es el de cada recibo |
| `formas_pago` | `id_forma_pago`, `forma`, `pagos_por_año` | 1 CONTADO, 2 SEMESTRAL, 4 TRIMESTRAL, 12 MENSUAL; BIMESTRAL sería 6. Antes se llamaba `pagos` |
| `vendedores` | `id_vendedor`, `vendedor`, `estatus` | Un solo campo de nombre (a veces son despachos) |

### Sincronización de pólizas: Access → MySQL local

En la clase `Poliza` de SIAP (mismo patrón que clientes):

- `Poliza.Copiar_A_MySQL(id)`: lee la póliza de Access, la traduce y la guarda con `INSERT ... ON DUPLICATE KEY UPDATE`. Regresa True o False. Nunca interrumpe al usuario: los errores van a `logs\sync_polizas.log`.
- `Poliza.Sincronizar_Todas()`: carga inicial. Antes revisa que `IDPoliza` no venga vacío ni repetido en Sicas (en Sicas la llave es el número de póliza, no `IDPoliza`); si hay, no copia nada y avisa.
- `db.Ejecutar` tiene un parámetro opcional `lanzar_error` (False por omisión). La sincronización lo usa en True para que el error llegue al log en lugar de mostrar un `MsgBox`. Se aplicó también a `Cliente.Copiar_A_MySQL`.
- **Probado con una póliza** (IDPoliza 12345, de 2006) el 18/11/2026, en producción (`siap`). Funcionó. Pendientes encontrados: `OT` en 0 salía como `OT-0` (corrección dada: 0 = sin orden; confirmar que se aplicó) y la moneda salió UDIS (revisar si es error de captura en Sicas).
- Todavía no se corre la carga completa ni se llama a la copia desde los puntos de captura de SIAP.

**Mapa de columnas**

| MySQL | Sicas | Regla |
|---|---|---|
| `id_poliza` | `IDPoliza` | Igual |
| `numero` | `Poliza` | `Limpiar_Poliza` |
| `id_poliza_anterior` | `Anterior` | `LEFT JOIN` en Access: el `IDPoliza` de la póliza con ese número. NULL si no hay |
| `id_inicial` | `IDInicial` | Igual; 0 o vacío → el propio `IDPoliza` |
| `id_cliente` | `IDCli` | Igual |
| `id_direccion_riesgo` | `IDD` | **Corregir antes de la carga:** `IDD` es el ID del renglón de Sicas, no el de MySQL. Traducir con `Direcciones.id_direccion` de Sicas (LEFT JOIN por `IDD`). 0 o sin traducción → NULL |
| `orden` | `OT` | `"OT-" & OT`; vacío o 0 → NULL (Sicas guarda la OT sin prefijo) |
| `orden_renovacion` | `Posterior` / `OTRenov` | `Posterior` si empieza con `OT-` (ahí guarda SIAP la OT de renovación); si no, `OTRenov` |
| `clave` | `Agente` | Sin espacios sobrantes |
| `id_aseguradora` | `Cia` | Igual |
| `id_plan` | `Cobertura` / `IDRamo` + `Cia` | `Cobertura` **es el id_plan** en Sicas (SIAP la reutilizó). Se usa si ese plan existe y es de la misma aseguradora y ramo; si no, se busca el plan de la pareja `IDRamo` + `Cia`; si tampoco existe, NULL (va al reporte de huérfanos) |
| `desde`, `hasta` | `Desde`, `Hasta` | Solo la fecha. Si falta alguna, la póliza no se copia (log) |
| `id_moneda`, `id_forma_pago` | `IdMon`, `Pago` | Igual |
| `id_vendedor`, `id_ejecutivo` | `IDVend`, `IdEjecut` | Igual |
| `concepto` | `Concepto` | Vacío → texto vacío |
| `estatus` | `Status` | 0 VIGENTE, 1 CANCELADA, 2 RENOVADA, 3 NO RENOVADA. Otro valor: no se copia (log) |
| `neta` … `total` | `Neta` … `Total` | Redondeo a 4 decimales |
| `porcentaje_comision` | `PComN` | 0 → NULL |
| `id_tarjeta` | `IDTC` | 0 → NULL |
| `domiciliada` | `CATC` + `IDTC` | 1 solo si `CATC = -1` y `IDTC ≠ 0` (misma lógica que `Poliza.Esta_Domiciliada`). La combinación inválida de Sicas llega como AGENTE |
| `motivo_cancelacion`, `fecha_cancelacion` | `Motivo`, `FechaBaja` | Vacío → NULL |
| `renovacion_terminada` | `Renovacion` | Igual |
| `fecha_creacion` | `FechaCaptura` | Solo al crear; vacío → fecha actual |

### Clases de catálogos con caché en SIAP (19/11/2026)

Módulo `Catalogos` con `Obtener(sql)` y `Refrescar()`: la primera vez lee la tabla de MySQL y la guarda en memoria (la consulta es la etiqueta); después la regresa de memoria, siempre como copia. Cada sesión de SIAP tiene su caché; un catálogo nuevo se ve al reiniciar SIAP o tras `Catalogos.Refrescar()`. Regla: **quien cambia la tabla, refresca** (`Vendedor.Guardar`, `Plan.Guardar`).

Clases que ya leen de MySQL con caché: `Moneda`, `Ramo`, `Forma_Pago` (antes `Pago`), `Aseguradora`, `Vendedor`, `Plan`, `Agente` (cada objeto es una clave con su agente) y `Ejecutivo` (propuesta). Cada una tiene `todas`/`todos` (`Shared`), su constructor que filtra en memoria y, según el caso, `activos`/`activas`, `Filtrar(...)` (`Ramo.Filtrar(id_aseguradora)`, `Plan.Filtrar(id_aseguradora, id_ramo)`, `Agente.Filtrar(id_aseguradora)`) y `Plan.Buscar(id_aseguradora, id_ramo)`. Conservan los nombres de propiedades que SIAP ya usaba.

- `Plan`: en un plan existente solo cambian nombre y estatus (cambiarle aseguradora o ramo alteraría la historia de sus pólizas). Su constructor anterior tenía la condición al revés y nunca cargaba.
- `Aseguradora`: necesita `aseguradoras.sufijo_liquidacion` (de `SufijoLiq` de Sicas), que se usa en los folios de Cobranza y Conciliación. Copiar desde Sicas antes de usar la clase.
- `Ejecutivo`: antes de pasarla a MySQL, convertir la collation de `ejecutivos`, agregar `firma` (de `Footer`) y `estatus`, y dar de alta a los ejecutivos antiguos de Sicas como inactivos (también en la web antes de mandar pólizas).
- `Vendedor` da de alta vendedores directo en MySQL: para vendedores, MySQL ya manda (confirmar que nadie los crea en Sicas).
- `Ramo.tipo` ahora puede ser `OTROS` y algunos ramos cambiaron de tipo: revisar dónde se usa `ramo.tipo`.

### Tabla `Polizas` de Sicas: lo que se encontró

- 169 columnas. La llave es `Poliza` (el número, en texto), no `IDPoliza`, que ni siquiera es autonumérico. Por eso `Anterior` y `Posterior` guardan números de póliza en texto.
- La mayoría de las columnas son otras cosas metidas en la misma tabla: datos del bien asegurado, coberturas en texto libre, reglas de cobranza, fechas de trámite, incisos, pasos de renovación y "campos comodín" (`FieldOpen1` a `4`, `FlagMU1` y `2`, `SAAdic1` a `3`...).
- `Cobertura` es en realidad el plan. `Posterior` guarda la OT de renovación o el número de la póliza nueva, y a veces se queda con la OT aunque la póliza ya esté renovada.
- Pasos de renovación en Sicas: `Actualizacion` (contactos), `Direccion`, `Envio` (renovación), `MetodoPago`; `Renovacion` = proceso terminado. Hay más casillas (`Autorizacion`, `Revision`, `Archivo`) por revisar en el módulo de renovaciones.
- `Poliza.Guardar()` de SIAP toma el vendedor **del cliente**: choca con la regla de vendedor por póliza (pendiente en SIAP).
- Herramientas temporales usadas para el análisis (en el módulo `Sicas` de SIAP): `Exportar_Columnas` y `Medir_Uso_Columnas`. Se pueden borrar.

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

## Bitácora de Sicas (análisis del 18/11/2026, para el chat de pólizas)

**Cómo funciona hoy:** una sola tabla `Bitacora` para todo. Cada registro de Sicas (cliente, póliza, recibo, orden, endoso, tarea) tiene una columna `ClaveBit` con un texto generado (prefijo + código + iniciales del usuario, por ejemplo `CLI...`, `POL...`, `REC...`, `OT...`, `TAR...`), y los renglones de `Bitacora` apuntan a ese texto. Columnas: `ID`, `ClaveBit`, `Fecha`, `Hora`, `Comentario`, `UGenero`, `Prioridad`, `Attachment`, `Procedencia`, `IsAutom`, `ClaveBitRel`, `Destino`, `IsLinkMail`. Hay registros desde 2005.

**Lo bueno:** una bitácora central, con usuario y fecha, que distingue lo automático de lo manual y admite adjuntos. 20 años de historia que vale la pena migrar.

**Problemas:**

1. **Liga por un texto inventado (`ClaveBit`)** en lugar de tipo + ID. No puede haber llave foránea; si la clave falta o se repite, el renglón queda huérfano o en el registro equivocado.
2. **Fecha y hora en dos columnas**, en lugar de un solo `datetime`.
3. **Lo automático se marca dos veces:** con `IsAutom` y con un "(A)" pegado al usuario. El usuario se guarda como texto, no como ID.
4. **`Procedencia` repite lo que ya dice el prefijo de `ClaveBit`.**
5. **Eventos automáticos guardados como prosa** ("Se cobró el recibo y se pagó con TRANSFERENCIA..."). El dato real (fecha y forma de pago) debe estar en el recibo. La bitácora solo lo narra y no se puede consultar con confianza.
6. **`ClaveBitRel`** liga, por ejemplo, el renglón de un recibo con el de su póliza. Esa relación ya existe en los datos (el recibo pertenece a la póliza).
7. **Mezcla pendientes con historia:** renglones con `Prioridad`, como "Enviar liq. a AIG" o "pasar por el cheque", son tareas por hacer. Una tarea necesita responsable, fecha compromiso y estatus (pendiente o hecha); una bitácora solo registra lo que pasó.

## Bitácora nueva (modelo acordado en principio, 18/11/2026)

Alex quiere la bitácora **ligada al ID del objeto, no a un campo inventado**, y que agregar un objeto nuevo (asegurado, siniestro, reclamación...) **no obligue a cambiar la tabla**. Modelo: **asociación polimórfica con vínculos y nivel.** Se implementa cuando se llegue a ese módulo.

**Tablas**

| Tabla | Para qué |
|---|---|
| `bitacora` | El evento: fecha y hora (una sola columna), `id_usuario` (vacío = el sistema), origen (web, SIAP, n8n, bot), categoría, tipo de evento, texto y datos estructurados (JSON) |
| `bitacora_vinculos` | A qué objetos pertenece el evento: `id_bitacora`, `tipo_objeto`, `id_objeto`, `nivel`. Un renglón por objeto |
| `tipos_objeto` | Catálogo de tipos válidos (`cliente`, `poliza`, `recibo`, `endoso`, `asegurado`, `siniestro`, `reclamacion`...). `bitacora_vinculos.tipo_objeto` tiene llave foránea aquí |
| `bitacora_adjuntos` | Archivos de cada renglón (correo, captura, PDF). Los archivos viven en el servidor, no en la base |
| `tareas` | Pendientes (responsable, fecha compromiso, prioridad, estatus). Crear o terminar una tarea genera un evento en la bitácora |

**Categorías:** *comentario* (lo escribe una persona), *evento* (pasó algo del negocio: recibo cobrado, póliza renovada, correo enviado) y *cambio* (alguien modificó un dato importante: campo, valor anterior, valor nuevo). Los eventos y cambios guardan **el dato** (tipo de evento + JSON); la frase se arma al mostrarla. El dato oficial sigue viviendo en su tabla (por ejemplo, el recibo); la bitácora cuenta la historia.

**Nivel (el "alcance" de cada vínculo):** 0 = le pasó a ese objeto; 1 = le pasó a un hijo; 2 = a un nieto. Ejemplos:

| Evento | Vínculos (tipo, id, nivel) |
|---|---|
| Se creó la póliza 4215 | (poliza, 4215, 0), (cliente, 2550, 0). Crear un hijo es nivel 0 también para el padre |
| Se cobró el recibo 25536 | (recibo, 25536, 0), (poliza, 4215, 1), (cliente, 2550, 2) |

- La ficha del cliente muestra por omisión **solo nivel 0** ("Se creó la póliza 4215", como enlace que abre la bitácora de la póliza). La ficha de póliza muestra **hasta nivel 1** (incluye el cobro del recibo). Un interruptor "Ver todo" muestra todos los niveles con una etiqueta de dónde pasó ("en póliza 4215"). Cuántos niveles muestra cada pantalla se ajusta sin tocar la base.
- **Una sola función escribe en la bitácora.** Sabe de quién es hijo cada objeto (recibo → póliza → cliente; siniestro → póliza; reclamación → siniestro), revisa que el objeto exista y crea sola los vínculos hacia arriba con su nivel. Un objeto nuevo = un tipo en el catálogo + decirle a la función quién es su padre.

**Costo aceptado:** `id_objeto` no puede tener llave foránea (apunta a tablas distintas). Se mitiga con la función única, el catálogo de tipos, que en el sistema casi nada se borra (se cancela o se inactiva) y una consulta periódica que busca vínculos a objetos inexistentes.

**Se descartó:** una columna de ID por objeto (`id_cliente`, `id_poliza`, ...) en la bitácora, porque cada objeto nuevo sería una columna más.

**Por decidir:**

1. Que nadie pueda editar ni borrar renglones (correcciones como renglón nuevo; el usuario de MySQL de la aplicación solo con INSERT en `bitacora`). Recomendado.
2. Marca de "visible para el cliente" para el futuro portal de clientes (por ejemplo, "su póliza fue renovada" sí; comentarios internos nunca). Recomendado agregarla desde el principio.

**Migración desde Sicas:** traducir cada `ClaveBit` al objeto que corresponde (buscándolo en la tabla de su prefijo), crear sus vínculos y conservar la historia desde 2005. Revisar si la bitácora de Sicas registra las reasignaciones de ejecutivo: si lo hace, podría reconstruirse parte del histórico de quién atendió cada póliza.

## Por confirmar

