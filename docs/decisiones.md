# Decisiones y supuestos

## Decididas

- **Estilo visual:** limpio, inspirado en el panel de LatePoint (Cure Lashes). Fondo gris claro, tarjetas blancas, azul `#1F5F99` como color principal (confirmado: se queda el azul, no el naranja del logo).
- **Menú lateral:** el mismo orden de SIAP (Comercial, Operaciones, Administración). Se contrae a solo íconos con el botón ☰ y recuerda la preferencia del usuario.
- **Pantalla de clientes:** la misma lógica de SIAP. Buscador arriba, contratantes con sus contactos y, abajo, las pólizas por ramo con el switch "Solo vigentes". El recuadro de pólizas se estira hasta abajo de la pantalla.
- **Ancho completo:** las páginas usan todo el ancho de la pantalla (sin límite), para aprovechar monitores grandes.
- **Tabla de contratantes:** solo ID, contratante, RFC, ejecutivo y pólizas vigentes (sin grupo ni flecha). Siempre cabe: los nombres largos bajan de renglón en vez de mostrar barra horizontal. La búsqueda sigue encontrando por grupo.
- **Ficha del cliente:** página completa (no ventana flotante), con regreso a Clientes. Igual que en SIAP: un clic en la fila selecciona al cliente (cambian contactos, resumen y pólizas) y doble clic en cualquier parte de la fila abre su ficha. También se abre con "Ver ficha del cliente →" del recuadro de pólizas, útil en celular o tablet.
- **Contactos en la ficha:** lista compacta a la izquierda (nombre y puesto, separados por una línea gris fina, con buscador y altura fija con su propio scroll) y, al seleccionar uno, su tarjeta con todos sus correos y teléfonos. Funciona igual con 3 que con 50 contactos. Un icono de recibo en la lista marca a quien recibe cobranza automática.
- **Contactos en Clientes:** se muestran los primeros 4 y un enlace "N contactos más en la ficha".
- **Cobranza automática:** lista de correos con estrella para marcar el principal.

- **Ficha de póliza:** se abre con doble clic en la póliza (pantalla de Clientes). Encabezado en tres columnas como en SIAP: (1) datos de la póliza: vigencia, contratante, dirección, forma y método de pago, concepto; (2) aseguradora, ramo, agente, vendedor y ejecutivo; (3) prima en formato suma (prima neta, descuentos, recargos, gastos de expedición, IVA): un concepto debajo de otro, a la misma altura que las otras dos columnas, con importes a la derecha y la prima total resaltada al final. Debajo, documentos/endosos/órdenes a la izquierda y pestañas Recibos, Orden, Asegurados (Unidades en autos), Beneficiarios, Condiciones, Adicionales y Bitácora. En recibos, cobranza y conciliación se muestran como dos estados independientes.

- **Nombres de personas físicas:** nombre, apellido paterno, apellido materno en todo el sistema.
- **Vendedor por póliza:** la ficha del cliente muestra los vendedores de sus pólizas; la ficha de póliza muestra el vendedor de esa póliza.

- **Renovaciones:** pólizas con fin de vigencia en los próximos 40 días o vencidas sin renovar, ordenadas por días. Semáforo de SIAP con 4 colores, igual para ejecutivo y administrador: morado = vencida, rojo = 0 a 14 días, naranja = 15 a 21 (en SIAP es amarillo; en la web se usa naranja porque es más legible), verde = 22 a 40. El color va en una etiqueta ("Vence en 4 días") en lugar de pintar todo el renglón. Tarjetas de resumen por urgencia que también filtran y cuentan cuántas no tienen orden. **El panel mide el proceso de renovación, no la renovación:** una póliza sale del panel cuando su proceso de renovación termina, no cuando se captura la póliza nueva (en SIAP antiguo, capturar la renovación la hacía desaparecer aunque quedaran pendientes). Por eso no hay opción de ocultar las ya renovadas. La columna Renovación distingue "Sin orden" (con botón Crear orden), orden en trámite (folio OT) y "Póliza renovada" (número de la póliza nueva; el proceso puede seguir abierto). El ejecutivo ve solo su cartera; el administrador ve todos, con columna y filtro de ejecutivo. Doble clic abre la póliza.

- **Proceso de renovación:** se abre con doble clic en el panel de renovaciones. Lista de verificación con 5 pasos obligatorios y barra de avance: (1) Artículo 492, expediente completo y vigente, se completa solo cuando todos los documentos están vigentes; (2) Contactos actualizados; (3) Direcciones: se valida la de riesgo (se puede cambiar) y la fiscal (solo lectura; cambia al cargar una nueva constancia), una debajo de la otra; (4) Renovación, se completa sola al capturar la póliza renovada; (5) Método de pago de la próxima vigencia (la forma de pago se pide en la orden de renovación; cambios posteriores, con una solicitud de cambio de forma de pago). Si la póliza está domiciliada o en proceso de domiciliarse, se muestra un aviso desde que se abre la ficha y una etiqueta en el panel de renovaciones. Cada confirmación registra quién y cuándo, y se anota en la bitácora. Al completar los 5 pasos el proceso termina y la póliza sale del panel. Pestañas aparte: Cotizaciones (opcional, a petición del cliente), Orden (generar la orden de renovación) y Bitácora (comentarios). Botón "No renovar" en el encabezado: abre una ventana con lo que se va a cancelar (orden en trámite o póliza renovada), motivo obligatorio, comentario y evidencia recomendada; al confirmar, el proceso queda cerrado como "no renovada" y se anota en la bitácora. No hay deshacer: se usa una rehabilitación desde Solicitudes.

### Sincronización y APIs (18/11/2026)

- **Access a MySQL local, en paralelo.** Mientras exista Sicas, SIAP guarda cada cliente en Access (la fuente de verdad) y lo copia a MySQL local con el mismo ID. Cuando se confíe en MySQL, las lecturas pasan a MySQL y después se apaga Access. Por ahora no se migra nada de golpe.
- **Una sola base de datos es la meta final, no el paso actual.** Que SIAP trabaje directo contra la MySQL de la web lo dejaría sin servicio cuando falle el internet, lo haría lento y obligaría a abrir la base de datos a internet.
- **No se abre ninguna puerta de la oficina hacia internet.** n8n no se conecta al MySQL local. Los envíos salen del servidor de la oficina hacia la web por HTTPS.
- **El envío a la web lo hace un programa aparte** que corre en el servidor con el Programador de tareas de Windows, no SIAP. En el servidor hay varias sesiones de SIAP abiertas a la vez (escritorio remoto) y mandarían duplicados. Además, la tarea arranca sola cuando el servidor vuelve después de un apagón.
- **Detección de cambios:** con `fecha_modificacion` (`ON UPDATE CURRENT_TIMESTAMP`), sin bandeja de pendientes. El programa manda los clientes modificados desde el último envío y solo avanza su marca cuando la web confirma.
- **APIs nuevas en `public_html/api_web`**, separadas de `public_html/api`, que es la que usa hoy n8n (`sync_poliza.php`, certificados).
- **Seguridad obligatoria de las APIs nuevas**, aunque tome más tiempo: clave nueva por encabezado `Authorization`; contraseñas y claves en un archivo de configuración fuera de `public_html`; usuario de MySQL propio, con permiso solo sobre las tablas de la web; validación de cada campo antes de guardar; códigos HTTP correctos (400 datos inválidos, 403 sin autorización, 500 falla del servidor) para que el que envía sepa qué no llegó; consultas preparadas. Las claves de la API de pólizas y del usuario de MySQL quedaron expuestas en un chat y se cambiarán.
- **El que envía manda siempre el registro completo** y la web queda igual a lo que recibió (sin la regla de "si llega vacío, conserva el valor anterior").
- **Collation `utf8mb4_general_ci`** en todas las tablas de las dos bases (el hosting usa MariaDB, que no reconoce `utf8mb4_0900_ai_ci`).

### Envío de clientes a la web (18/11/2026)

- **Datos malos en un paquete: se guardan los buenos y se rechazan los malos con su motivo** (opción A). El programa de envío avanza su marca y anota los rechazados en su log. El cliente rechazado se vuelve a mandar solo cuando alguien lo corrige y cambia su `fecha_modificacion`. Se descartó "todo o nada" porque un solo cliente mal capturado detendría la sincronización de todos.
- **Falla del servidor o de la conexión:** la API contesta 500 sin guardar nada de ese paquete, y el programa no avanza la marca; reintenta en la siguiente vuelta.
- **Paquetes de 200 clientes** como máximo (y 2 MB).
- **El programa de envío es un script de PowerShell**, no un programa de VB.NET: no hay que compilar nada y se cambia con el Bloc de notas. Usa el mismo `MySql.Data.dll` de SIAP (`C:\Program Files (x86)\Prolomer\Setup_SIAP`).
- **La marca vive en una tabla de MySQL local** (`sincronizacion`, un renglón por tabla que se envía), no en un archivo: se consulta desde Workbench y servirá igual para ejecutivos y pólizas. Se avanza con dos valores, `fecha_modificacion` e `id_cliente`, para no perder ni repetir clientes con la misma fecha, y no se toman los cambios de los últimos 5 segundos.
- **Tarea programada cada 5 minutos, como SYSTEM**, sin dos copias a la vez y con límite de 30 minutos por vuelta.
- **Riesgo aceptado (por ahora):** los usuarios del servidor son administradores y pueden leer la configuración del programa. Pendiente quitarles ese permiso.
- **Ejecutivos:** se quitó la columna `whatsapp` de `ejecutivos` (en las dos bases) y `puesto` queda "EJECUTIVO DE CUENTA". Los 8 ejecutivos se cargaron en la web con los mismos IDs que la local.

### Pólizas (18/11/2026)

- **La tabla de pólizas de Sicas no se copia tal cual:** de 169 columnas quedan 33. Lo que no es la póliza en sí (bien asegurado, coberturas, reglas de recibos, trámite, incisos, pasos de renovación) va a su propio módulo.
- **Nombres de columnas:** `numero`, `id_poliza_anterior`, `id_inicial`, `id_direccion_riesgo`, `id_forma_pago`, `porcentaje_comision`, `motivo_cancelacion`, `fecha_cancelacion`.
- **Sin columna de póliza posterior:** "renovada" y "tiene renovación" se calculan buscando la póliza que tiene a esta como anterior. Una sola liga, que no puede contradecirse.
- **Estatus:** VIGENTE, RENOVADA, CANCELADA, NO RENOVADA, PRORROGADA y SALDADA (estas dos, de vida). Alex decidió guardar RENOVADA aunque se pueda calcular; se acepta el riesgo con una revisión periódica.
- **Dinero en `decimal(14,4)`:** 4 decimales para los cálculos (decisión de Alex); se redondea a 2 al mostrar o facturar. Nunca `double`.
- **Domiciliación en la póliza, no en los recibos:** `id_tarjeta` + `domiciliada`, con una regla que impide estar domiciliada sin tarjeta. `cobranza` se calcula: AGENTE, EN PROCESO o DOMICILIADA.
- **La aseguradora sale de la clave y del plan.** Se guarda también `id_aseguradora` en la póliza, controlada por llaves dobles (clave + aseguradora, plan + aseguradora) para que nunca se contradigan.
- **Planes por aseguradora (opción A):** un renglón por cada producto de cada aseguradora, aunque el nombre se repita (TRANSPORTE ESPECÍFICO). Un plan por pareja ramo + aseguradora. No hay `id_ramo` en la póliza: sale del plan.
- **Número de póliza limpio:** sin ceros a la izquierda (`Limpiar_Poliza`). Quien busque por número debe limpiar con la misma regla.
- **Columnas temporales** `orden_renovacion` y `renovacion_terminada` para el panel de renovaciones, hasta los módulos de órdenes y renovaciones.
- **Primero cargar, después las llaves:** las llaves (salvo la de clientes) se quitaron para que la carga desde Sicas no rechace pólizas viejas. Medir huérfanos, limpiar y poner las llaves es obligatorio antes de mandar pólizas a la web.
- **Catálogos:** todos con los IDs de Sicas y con `estatus` en lugar de borrar (las llaves RESTRICT no dejan borrar lo que tiene pólizas). Ramos con `categoria` (pestañas) y `tipo_asegurados` (pestaña de la ficha); fianzas inactivas.
- **`db.Ejecutar` con `lanzar_error`:** la sincronización anota los errores en su log en lugar de mostrar un `MsgBox`.

### Catálogos y direcciones (19/11/2026)

- **Catálogos con caché en memoria** (módulo `Catalogos`): las tablas chicas se leen una vez por sesión de SIAP. Quien cambia una tabla, refresca el caché.
- **Direcciones compartidas:** se conserva el diseño de Alex (`direcciones` + `direcciones_detalle`), porque muchos asegurados comparten dirección. Al editar una compartida se elige entre corregir para todos o solo para ese cliente.
- **MySQL manda en direcciones;** Sicas solo recibe el renglón nuevo para que las pólizas capturadas en Sicas tengan `IDD`. No se mantienen sincronizados en Sicas tipo, fiscal ni correcciones.
- **Llave única de direcciones con código postal,** y nunca sobrescribir una dirección existente al registrar otra igual.
- **Llaves foráneas de direcciones, después** (igual que las de pólizas).

## Agregados al diseño (para validar)

- Franja de resumen del cliente: pólizas vigentes, prima vigente, recibos pendientes y próxima renovación.
- Estatus de la póliza con etiqueta de color ("Por renovar" usa la regla de 40 días antes del vencimiento).
- Cartera por ramo con los ramos vacíos en gris (oportunidad de venta).

## Por confirmar

- Renovaciones: límite exacto entre rojo y amarillo (¿rojo hasta 14 días?) ; en el proceso de renovación, cuál es la regla para considerar vigente el expediente del artículo 492 y si contactos exige algo concreto (por ejemplo, al menos un contacto con correo y teléfono).

1. Regla de vigencia de la constancia de situación fiscal (el prototipo usa "más de un año = actualizar").
2. Columnas reales de las pestañas Tarjetas y Portales (las del prototipo son supuestas).
3. Si los correos y teléfonos pertenecen a cada contacto o al cliente en general.
4. Ficha de póliza: confirmar que "No siniestro" genera la carta de no siniestralidad en Word, qué significan los dos íconos de cada recibo (en el prototipo: conciliación de comisión y comprobante de cobro), y las columnas reales de Asegurados, Beneficiarios, Condiciones y Adicionales.
