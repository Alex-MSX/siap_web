# Estado del proyecto

Página corta para retomar el proyecto en cualquier chat nuevo. Se actualiza al cerrar cada chat.

**Última actualización:** 20/11/2026 (chat de pólizas: direcciones completadas desde Sicas)

## Cómo empezar un chat nuevo

Dentro del proyecto "SIAP web" de Claude, escribir:

> Lee el repositorio Alex-MSX/siap_web (docs/estado.md, README y docs) y seguimos con [tema].

Un chat por tema, con nombre claro (por ejemplo, "SIAP web · API de clientes"). Al cerrar un chat se actualizan `docs/estado.md`, `docs/decisiones.md` y `docs/base-de-datos.md`.

## Forma de trabajo acordada

1. **Alex comparte una pantalla de SIAP** y explica cómo la usan.
2. **Claude diseña la versión web** en `prototipo/` y la sube al repositorio para revisión.
3. **Con el diseño aprobado, se revisa la base de datos detrás**, con Claude como auditor: pregunta por qué se hizo así, señala riesgos (datos duplicados, estados ambiguos, dinero, varios usuarios a la vez, lógica heredada de Sicas) y propone alternativas. Alex decide.

Ritmo: **paso por paso y sin prisa.** Es el primer desarrollo web de Alex: primero se explican los conceptos y después se hace el trabajo. En tareas técnicas (servidor, base de datos, APIs) se confirma que cada paso funciona antes de seguir con el siguiente.

## Lo que ya está hecho

**Prototipo navegable** (`prototipo/`, datos de ejemplo inventados):

| Pantalla | Estado |
|---|---|
| Clientes (`clientes.html`) | Aprobada. Un clic selecciona, doble clic abre la ficha |
| Ficha del cliente (`ficha.html`) | Aprobada, con ajustes menores por hacer |
| Ficha de póliza (`poliza.html`) | Aprobada. Encabezado en 3 columnas, prima en formato suma |
| Renovaciones (`renovaciones.html`) | Aprobada. Semáforo morado, rojo, naranja, verde; etiqueta de domiciliada |
| Proceso de renovación (`renovacion.html`) | Diseñada; falta que Alex la revise completa |

**Base de datos** (`docs/base-de-datos.md`):

- Tabla `clientes`: estructura idéntica en MySQL local y en la web (`utf8mb4_general_ci`, con `curp` y `fecha_modificacion`). `id_cliente` es el mismo ID de Sicas.
- Modelo definido de direcciones, perfil fiscal (1 a 1 con el cliente) y facturación por póliza.
- Proceso de renovación: auditado; recomendaciones documentadas.

**Clientes de Access a MySQL local: terminado (18/11/2026).** SIAP copia cada cliente a MySQL local al darlo de alta, al reasignar ejecutivo y al abrir su consulta. La rutina "Sincronizar todos" copió los 4,829 clientes en producción, sin errores. Detalle, mapa de columnas y reglas en `docs/base-de-datos.md`, sección "Sincronización de clientes".

**Pólizas: estructura terminada y copia probada (18/11/2026).** Detalle en `docs/base-de-datos.md`, sección "Pólizas".

- Tabla `polizas` en MySQL local (`siap`, copiada a `siap_prueba`): 33 columnas limpias, contra 169 de Sicas.
- Catálogos ajustados en MySQL local: `aseguradoras`, `agentes`, `claves`, `ramos` (44, con categoría y tipo de asegurados), `planes`, `monedas`, `formas_pago`, `vendedores`. Todos en `utf8mb4_general_ci` y con los IDs de Sicas.
- Llaves: por ahora solo la de `clientes`. Las demás se quitaron para no detener la carga y se ponen después de limpiar.
- `Poliza.Copiar_A_MySQL` y `Poliza.Sincronizar_Todas` en SIAP. Probada la copia con una póliza; falta la carga completa.
- `db.Ejecutar` ya tiene `lanzar_error` (la sincronización ya no muestra `MsgBox`).

**Clientes de MySQL local a la web: terminado (18/11/2026).** Flujo completo funcionando: Access → MySQL local → MySQL web.

- **API** `public_html/api_web/clientes.php` (código en `api_web/` del repositorio): clave por `Authorization`, secretos en `/home/commxprolomer/siap_config/api_web.php` (fuera de `public_html`), usuario de MySQL `commxprolomer_siap_api` con solo SELECT, INSERT y UPDATE. Probada: 405 sin POST, 403 sin clave, rechazo con motivo, guardado.
- **Programa de envío** `C:\SIAP_Sync\sync_clientes.ps1` en el servidor de la oficina (código en `sincronizador/`). Su marca vive en la tabla `siap.sincronizacion` de MySQL local; usuario local `siap_sync` (solo lectura de `clientes`).
- **Tarea programada** "SIAP Sync Clientes": cada 5 minutos y al prender el servidor, como SYSTEM.
- **Carga inicial:** 4,829 clientes en 25 paquetes, 0 rechazados. La web tiene los mismos 4,829.
- **Cómo revisar que sigue vivo:** en Workbench, `SELECT * FROM siap.sincronizacion;` (`ultima_revision` debe tener menos de 5 minutos y `ultimo_resultado` decir OK). Detalle en `C:\SIAP_Sync\logs\clientes_AAAA-MM.log` (solo anota envíos, rechazados y errores).

## Lo que sigue

**Siguiente chat: "SIAP web · Revisión de direcciones".** Alex explicará al inicio cómo quiere revisarlas. Estado al 20/11/2026:

- **Direcciones en MySQL:** las 6,339 de Sicas ya existen y cada renglón de Sicas tiene su `id_direccion` (0 sin mapear). `direcciones_detalle`: 6,119 relaciones de 4,590 clientes (Sicas tiene 6,181 visibles con cliente; la diferencia serían direcciones repetidas del mismo cliente).
- **Se corrió `Direccion.Completar_Desde_Sicas()`** (solo lee Sicas): 6,181 revisadas, 0 errores, **4,017 marcas de envío y 424 fiscales**. No se corrió la carga completa (`Sincronizar_Todas`): no hacía falta.
- **283 renglones de Sicas con CP distinto** al de la dirección de MySQL a la que apuntan (efecto de la llave vieja sin CP). **264 no los usa ninguna póliza vigente**: Alex decidió dejarlos como están en MySQL. **19 sí están en pólizas vigentes** (IDD de Sicas: 764, 5162, 7791, 8527, 8596, 8774, 9805, 10010, 10164, 10174, 10335, 10412, 10456, 10512, 10598, 10633, 10652, 10723, 10795): pendiente decidir en el chat de revisión. Unos 5 son CP casi iguales (un dígito); los otros 14 apuntan a una dirección de otra ciudad (por ejemplo, las direcciones 3311 y 1555 de MySQL juntaron clientes de varios estados).
- **Envío duplicado:** unos 150 clientes (casi todos recientes) tenían dos direcciones marcadas de envío en Sicas, porque el `Registrar` viejo marcaba la nueva sin desmarcar la anterior. La marca quedó en la **más vieja** (se recorrió por IDD ascendente); lo lógico sería la más nueva. Pendiente decidir en el chat de revisión.
- Se propuso (no aplicado) `Normalizar_CP` (CP a 5 dígitos: `3100` → `03100`) en `Parametros_Direccion`, y una rutina `Corregir_Desde_Sicas`; quedan como opciones para la revisión.
- Recordatorios: corregir en `Poliza.Copiar_A_MySQL` la traducción de `IDD` a `id_direccion`; revisar formularios que lean direcciones de Sicas (buscar `FROM Direcciones`, `Obtener_Direccion_Fiscal`, `IDD`); revisar `Form_Registrar_Emision` línea 224.

Después de direcciones, retomar pólizas:

1. **Confirmar la corrección de `OT` en 0** en `Poliza.Copiar_A_MySQL` (0 = sin orden; salía como `OT-0`).
2. **Revisar la moneda de la póliza de prueba** (IDPoliza 12345, de 2006): llegó en UDIS porque en Sicas tiene `IdMon` = 3. Contar pólizas por moneda en Sicas (`SELECT IdMon, COUNT(*) FROM Polizas GROUP BY IdMon`) para saber si es un error aislado de captura o algo general.
3. **Crear los planes que falten:** sacar de Sicas las parejas `IDRamo` + `Cia` que usan las pólizas y dar de alta en `planes` las que no existan.
4. **Carga completa** con `Poliza.Sincronizar_Todas()` (antes, probarlo en `siap_prueba`: SIAP en modo prueba hoy apunta a `siap`, revisar la conexión de `db`).
5. **Reporte de huérfanos, limpieza y llaves definitivas** (ver `docs/base-de-datos.md`, "Llaves pendientes"). Obligatorio antes de la web.
6. Llamar a `Poliza.Copiar_A_MySQL` desde los puntos de SIAP que cambian pólizas (captura, cancelar, no renovar, domiciliar...) y al abrir la consulta de una póliza, como con clientes.
7. Crear `polizas` y sus catálogos en la web (antes, revisar en phpMyAdmin si ya existe una tabla `polizas` de la API vieja `sync_poliza.php`), la API `api_web/polizas.php` y ampliar el programa de envío.

Después de pólizas: **"SIAP web · Primera pantalla con datos reales"** (login con usuarios y permisos, y la pantalla de Clientes leyendo la MySQL de la web).

**Pendientes de seguridad:**

- Cambiar la clave de la API de pólizas (`public_html/api`) y la contraseña del usuario de MySQL que quedaron expuestas en un chat anterior.
- Los compañeros que entran por escritorio remoto al servidor son administradores de Windows, así que pueden leer `C:\SIAP_Sync\config.json` (y la configuración de SIAP). Quitarles el permiso de administrador en ese servidor; para usar SIAP no lo necesitan. Se aceptó el riesgo por ahora: la contraseña de `siap_sync` solo lee clientes y la clave de la API no puede borrar nada.
- Confirmar si la base `commxprolomer_siap` la comparten la API de pólizas y n8n (probablemente sí). Si es así, el usuario de la API de clientes también podría escribir en esas tablas.
- La contraseña de Sicas (Access) está escrita en el código del módulo `Sicas` de SIAP. Ese archivo nunca debe subirse al repositorio, y cualquiera con el `.exe` puede sacarla descompilándolo. Riesgo bajo, anotado.

**Pendientes chicos de SIAP:** guardar `Sexo` como 1 (no 255). `Poliza.Guardar()` toma el vendedor del cliente (debe ser el de la póliza). `Limpiar_Poliza`: se propuso una versión corregida (su `Regex.Replace` final no guardaba el resultado e `IsNumeric`/`Val` convierten partes como `12E3` en 12000); confirmar si Alex la aplicó. El `Cliente.Copiar_A_MySQL` que Alex compartió no llena `fecha_creacion` desde `FechaCap` ni traduce `id_usuario`, aunque este documento dice que sí: revisar qué versión está en producción. La tabla `ejecutivos` de `siap` tiene `celular` y no `puesto`/`telefono`, y sigue en `utf8mb4_0900_ai_ci`, distinto de lo documentado en `docs/base-de-datos.md`: revisar.

**Ejecutivos:** se dan de alta a mano **en las dos bases** (local y web) con el mismo ID cuando entra alguien nuevo. Si un cliente llega a la web con un ejecutivo que no existe allá, la API lo rechaza ("el ejecutivo N no existe en la web") y queda en el log. Más adelante, sincronizarlos como a los clientes.

**Pendientes de la tabla `clientes`:** calidad del RFC (886 sin RFC, 1,242 con largo raro) y después volverlo obligatorio; `CHECK` de persona física/moral; homologar nombres de índices entre local y web; tabla `usuarios` y llave foránea de `id_usuario`; crear `perfiles_fiscales` y `cliente_documentos`.

**Preguntas abiertas de diseño:** ver la sección "Por confirmar" de `docs/decisiones.md` y de `docs/base-de-datos.md`.

**Módulos por diseñar después:** recibos y cobranza, endosos, órdenes, conciliación, siniestros, CATs y el portal de clientes.

## Reglas que no cambian

- Nunca subir al repositorio contraseñas, accesos a bases de datos ni datos reales de clientes.
- Nombres de personas: nombre, paterno, materno.
- El vendedor es de cada póliza, no del cliente.
- No guardar lo que se puede calcular.
- Mientras exista Sicas, Access manda. MySQL local y la web reciben copias con el mismo ID. Excepciones, donde ya manda MySQL: direcciones (Sicas solo recibe el renglón nuevo) y vendedores.
- Ninguna puerta de la oficina se abre hacia internet: los envíos salen del servidor hacia la web.
