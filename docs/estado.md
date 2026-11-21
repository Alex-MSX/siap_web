# Estado del proyecto

Página corta para retomar el proyecto en cualquier chat nuevo. Se actualiza al cerrar cada chat.

**Última actualización:** 21/11/2026 (chat "Sincronización de pólizas": copia al capturar, limpieza de planes y claves en Sicas, carga completa)

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

**Pólizas: Sicas limpio y copia a MySQL funcionando (20 y 21/11/2026).** Detalle en `docs/base-de-datos.md`, secciones "Pólizas" y "Limpieza de planes y claves".

- Tabla `polizas` en MySQL local (`siap` y `siap_prueba`): 33 columnas limpias, contra 169 de Sicas.
- `Poliza.Copiar_A_MySQL` corregido: traduce `IDD` al `id_direccion` de MySQL, `Normalizar_OT` (0 = sin orden) y plan solo desde `Cobertura` (sin búsqueda por pareja).
- **Copia a MySQL en todos los puntos que modifican pólizas (21/11/2026):** capturar (nueva y anterior), cancelar, no renovar, domiciliar, quitar domiciliación, renombrar, OT de renovación, terminar renovación, % de comisión y eliminar OT (`Poliza.Copiar_A_MySQL_Donde` y atajos `Copiar_Poliza(s)_A_MySQL` en `Funciones`). Se encontraron leyendo todo el código de SIAP (20 escrituras a `Polizas`; los 4 pasos de renovación no están en MySQL). Probado en prueba; **instalada a los compañeros el 21/11/2026**.
- **Reasignar ejecutivo:** solo cambia pólizas vigentes y todos sus recibos (antes cambiaba todas y se perdía la historia de quién atendió cada póliza).
- **Planes y claves de Sicas limpios:** las 30,245 pólizas tienen plan válido y clave válida (rutinas con modo reporte y CSV de cambios en `logs` de SIAP).
- Catálogos: `claves` con PK (`clave`, `id_aseguradora`); `planes` con varios planes por pareja; planes viejos e `SIN ESPECIFICAR` como INACTIVO; GNP GMM reorganizado a Línea Azul + nivel.
- Carga completa en `siap_prueba` (20/11) y **en producción (21/11): 30,245 pólizas, 0 errores** (unos 40 a 50 minutos).
- **Huérfanos en `siap`: limpio** (0 sin plan, 0 claves inválidas, 0 catálogos inexistentes); solo 13 pólizas sin dirección. Se agregó la forma de pago 3 CUATRIMESTRAL.
- **Llaves definitivas puestas en `siap.polizas` (21/11/2026):** `(clave, id_aseguradora) → claves`, `(id_plan, id_aseguradora) → planes`, moneda, forma de pago, vendedor, ejecutivo, `id_plan` obligatorio y `CHECK (hasta >= desde)`. En `planes` se agregó `uq_planes_plan_aseguradora`. **`siap_prueba.polizas` todavía no tiene estas llaves** (sus datos son de la carga del 20/11): copiar Sicas y recargar antes de ponérselas.

**Clientes de MySQL local a la web: terminado (18/11/2026).** Flujo completo funcionando: Access → MySQL local → MySQL web.

- **API** `public_html/api_web/clientes.php` (código en `api_web/` del repositorio): clave por `Authorization`, secretos en `/home/commxprolomer/siap_config/api_web.php` (fuera de `public_html`), usuario de MySQL `commxprolomer_siap_api` con solo SELECT, INSERT y UPDATE. Probada: 405 sin POST, 403 sin clave, rechazo con motivo, guardado.
- **Programa de envío** `C:\SIAP_Sync\sync_clientes.ps1` en el servidor de la oficina (código en `sincronizador/`). Su marca vive en la tabla `siap.sincronizacion` de MySQL local; usuario local `siap_sync` (solo lectura de `clientes`).
- **Tarea programada** "SIAP Sync Clientes": cada 5 minutos y al prender el servidor, como SYSTEM.
- **Carga inicial:** 4,829 clientes en 25 paquetes, 0 rechazados. La web tiene los mismos 4,829.
- **Cómo revisar que sigue vivo:** en Workbench, `SELECT * FROM siap.sincronizacion;` (`ultima_revision` debe tener menos de 5 minutos y `ultimo_resultado` decir OK). Detalle en `C:\SIAP_Sync\logs\clientes_AAAA-MM.log` (solo anota envíos, rechazados y errores).

## Lo que sigue

**Siguiente chat: "SIAP web · Pólizas: copia nocturna y lectura desde MySQL".** Pasos:

1. **Verificar en el día a día** que lo capturado y modificado llega a `siap` (`fecha_modificacion` reciente) y revisar `logs\sync_polizas.log` en la carpeta de instalación de SIAP.
2. **Copia completa cada noche** (red de seguridad para lo que se haga fuera de SIAP): `Sincronizar_Todas` sin mensajes, lanzada por el Programador de tareas del servidor.
3. **Catálogos se dan de alta en MySQL:** con las llaves puestas, una póliza con una clave o un plan que no existe en MySQL no se copia (queda en `logs\sync_polizas.log`). Revisar dónde da de alta SIAP claves y agentes (¿Sicas, MySQL o los dos?).
4. **Etapa 2:** que SIAP lea las pólizas de MySQL (`New Poliza` y pantallas). **Etapa 3:** cambiar el sentido de las escrituras (MySQL primero, `Copiar_A_Sicas` después), empezando por cancelar, no renovar y domiciliar; `Guardar` al final.
5. **SIAP:** clase `Agente` buscando clave + aseguradora; `Limpiar_Clave` en la captura; que `db` y `Sicas` no se conecten a nada antes del login (hoy van a producción).
6. **Web:** crear `polizas` y sus catálogos (antes, revisar en phpMyAdmin la tabla `polizas` de la API vieja `sync_poliza.php`), la API `api_web/polizas.php` y ampliar el programa de envío.

**Pendientes de datos de pólizas (sin prisa):** 312 de GMM, vida y otros cuyo concepto contradice el plan (`correcciones_revisar_gmm_vida_otros.csv`); 161 de GNP en LÍNEA AZUL sin nivel; IDPoliza 29830 y 29833 (HDI, vigentes, mismo número limpio: ¿doble captura?); 38 renovaciones sin anterior y 129 sin `IDInicial` (historia, se dejan).

**Estatus de catálogos:** decidido calculado (ACTIVO / NUEVO / INACTIVO). Se construye con vistas al llegar a los catálogos en la web.

**Direcciones: revisadas y en pausa (20/11/2026).** Riesgo aceptado: unas 12 a 15 pólizas vigentes y 266 renglones con dirección equivocada, se corrigen en el paso 3 del proceso de renovación. Pendientes en `docs/base-de-datos.md`, "Revisión de direcciones".

Después de pólizas: **"SIAP web · Primera pantalla con datos reales"** (login con usuarios y permisos, y la pantalla de Clientes leyendo la MySQL de la web).

**Pendientes de seguridad:**

- Cambiar la clave de la API de pólizas (`public_html/api`) y la contraseña del usuario de MySQL: siguen expuestas (la clave está en texto en la clase `Poliza` de SIAP y volvió a pasar por un chat el 20/11).
- Los compañeros que entran por escritorio remoto al servidor son administradores de Windows y pueden leer `C:\SIAP_Sync\config.json`. Riesgo aceptado por ahora.
- Confirmar si la base `commxprolomer_siap` la comparten la API de pólizas y n8n.
- La contraseña de Sicas está en el código del módulo `Sicas` de SIAP: ese archivo (y la clase `Poliza`, por la clave de la API) nunca deben subirse al repositorio.

**Pendientes chicos de SIAP:** guardar `Sexo` como 1 (no 255). `Poliza.Guardar()` toma el vendedor y el ejecutivo del cliente (deben ser los de la póliza). `fecha_creacion` de la póliza sale de la fecha de la OT (`FechaCaptura` de `Ordenes`), no del día de captura: decidir cuál se quiere. Revisar qué versión de `Cliente.Copiar_A_MySQL` está en producción. La tabla `ejecutivos` de `siap` tiene `celular` y no `puesto`/`telefono`, y sigue en `utf8mb4_0900_ai_ci`.

**Llaves que faltan en `polizas`:** `id_direccion_riesgo` (con las de direcciones), `id_tarjeta` (cuando exista la tabla) y, cuando MySQL mande, `id_poliza_anterior` e `id_inicial` hacia la misma tabla.

**Ejecutivos:** se dan de alta a mano **en las dos bases** con el mismo ID. Más adelante, sincronizarlos como a los clientes.

**Pendientes de la tabla `clientes`:** calidad del RFC (886 sin RFC, 1,242 con largo raro); `CHECK` de persona física/moral; homologar índices; tabla `usuarios`; `perfiles_fiscales` y `cliente_documentos`.

**Módulos por diseñar después:** recibos y cobranza, endosos, órdenes, conciliación, siniestros, CATs y el portal de clientes.

## Reglas que no cambian

- Nunca subir al repositorio contraseñas, accesos a bases de datos ni datos reales de clientes.
- Nombres de personas: nombre, paterno, materno.
- El vendedor es de cada póliza, no del cliente.
- No guardar lo que se puede calcular.
- Mientras exista Sicas, Access manda en pólizas y clientes: MySQL local y la web reciben copias con el mismo ID. Ya manda MySQL en direcciones (Sicas solo recibe el renglón nuevo), vendedores y asegurados. La meta es que MySQL mande también en pólizas.
- Cambios masivos en producción: respaldo del `.accdb` antes, rutina con modo reporte primero y CSV de lo que cambió.
- Una dirección compartida por varios clientes no se edita para corregir a uno solo: ese cliente se pasa a la dirección que le corresponde.
- Ninguna puerta de la oficina se abre hacia internet: los envíos salen del servidor hacia la web.
