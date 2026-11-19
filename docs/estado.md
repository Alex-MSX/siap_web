# Estado del proyecto

Página corta para retomar el proyecto en cualquier chat nuevo. Se actualiza al cerrar cada chat.

**Última actualización:** 18/11/2026

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

**Clientes de MySQL local a la web: terminado (18/11/2026).** Flujo completo funcionando: Access → MySQL local → MySQL web.

- **API** `public_html/api_web/clientes.php` (código en `api_web/` del repositorio): clave por `Authorization`, secretos en `/home/commxprolomer/siap_config/api_web.php` (fuera de `public_html`), usuario de MySQL `commxprolomer_siap_api` con solo SELECT, INSERT y UPDATE. Probada: 405 sin POST, 403 sin clave, rechazo con motivo, guardado.
- **Programa de envío** `C:\SIAP_Sync\sync_clientes.ps1` en el servidor de la oficina (código en `sincronizador/`). Su marca vive en la tabla `siap.sincronizacion` de MySQL local; usuario local `siap_sync` (solo lectura de `clientes`).
- **Tarea programada** "SIAP Sync Clientes": cada 5 minutos y al prender el servidor, como SYSTEM.
- **Carga inicial:** 4,829 clientes en 25 paquetes, 0 rechazados. La web tiene los mismos 4,829.
- **Cómo revisar que sigue vivo:** en Workbench, `SELECT * FROM siap.sincronizacion;` (`ultima_revision` debe tener menos de 5 minutos y `ultimo_resultado` decir OK). Detalle en `C:\SIAP_Sync\logs\clientes_AAAA-MM.log` (solo anota envíos, rechazados y errores).

## Lo que sigue

**Siguiente chat: "SIAP web · Pólizas".** Diseñar la tabla `polizas` limpia y llevarla a la web por el mismo camino que los clientes (Access → MySQL local → web).

- **Objetivo de Alex:** limpiar de fondo. La tabla de pólizas de Sicas (que Alex no diseñó) tiene malas prácticas, por ejemplo datos redundantes: guarda `id_ejecutivo` aunque ya tiene `id_cliente`, y `id_aseguradora` aunque ya tiene la clave de agente.
- **Cómo se trabaja:** revisar columna por columna la tabla de Sicas. De cada una, decidir si se queda, se calcula, se mueve a otra tabla o desaparece. Sicas no se toca: la limpieza vive en el modelo nuevo, y la copia traduce de Sicas al modelo limpio (igual que con clientes).
- **Primer paso del chat:** Alex comparte la estructura de la tabla de pólizas de Sicas (columnas y tipos) y la pantalla de SIAP donde se capturan.
- **Preguntas para empezar** (antes de quitar columnas "redundantes"):
  - `id_ejecutivo`: **Alex confirmó (18/11/2026) que hoy falta el histórico de quién atendió cada póliza en su momento**, así que el ejecutivo por póliza **no es redundante**: se queda como historia. Por revisar: si al reasignar un cliente Sicas o SIAP sobrescriben el ejecutivo de sus pólizas (en ese caso, lo migrado de Sicas no es confiable como histórico y el registro confiable empieza con el modelo nuevo), y si una póliza puede tener un ejecutivo distinto al del cliente (por ejemplo, un especialista en GMM).
  - **Bitácora:** modelo nuevo acordado en principio (polimórfico, con vínculos y nivel); ver `docs/base-de-datos.md`, "Bitácora nueva". Complementa, no sustituye, los datos que deben ser columna (por ejemplo, el ejecutivo de cada póliza).
  - `id_aseguradora`: si cada clave de agente pertenece a una sola aseguradora y nunca cambia, la aseguradora se obtiene de la clave y sobra. Revisar fusiones o cambios de nombre de aseguradoras.

Después de pólizas: **"SIAP web · Primera pantalla con datos reales"** (login con usuarios y permisos, y la pantalla de Clientes leyendo la MySQL de la web).

**Pendientes de seguridad:**

- Cambiar la clave de la API de pólizas (`public_html/api`) y la contraseña del usuario de MySQL que quedaron expuestas en un chat anterior.
- Los compañeros que entran por escritorio remoto al servidor son administradores de Windows, así que pueden leer `C:\SIAP_Sync\config.json` (y la configuración de SIAP). Quitarles el permiso de administrador en ese servidor; para usar SIAP no lo necesitan. Se aceptó el riesgo por ahora: la contraseña de `siap_sync` solo lee clientes y la clave de la API no puede borrar nada.
- Confirmar si la base `commxprolomer_siap` la comparten la API de pólizas y n8n (probablemente sí). Si es así, el usuario de la API de clientes también podría escribir en esas tablas.

**Pendientes chicos de SIAP:** que `db.Ejecutar` no muestre `MsgBox` en la sincronización. Guardar `Sexo` como 1 (no 255).

**Ejecutivos:** se dan de alta a mano **en las dos bases** (local y web) con el mismo ID cuando entra alguien nuevo. Si un cliente llega a la web con un ejecutivo que no existe allá, la API lo rechaza ("el ejecutivo N no existe en la web") y queda en el log. Más adelante, sincronizarlos como a los clientes.

**Pendientes de la tabla `clientes`:** calidad del RFC (886 sin RFC, 1,242 con largo raro) y después volverlo obligatorio; `CHECK` de persona física/moral; homologar nombres de índices entre local y web; tabla `usuarios` y llave foránea de `id_usuario`; crear `perfiles_fiscales` y `cliente_documentos`.

**Preguntas abiertas de diseño:** ver la sección "Por confirmar" de `docs/decisiones.md` y de `docs/base-de-datos.md`.

**Módulos por diseñar después:** pólizas (tabla), recibos y cobranza, endosos, órdenes, conciliación, siniestros, CATs y el portal de clientes.

## Reglas que no cambian

- Nunca subir al repositorio contraseñas, accesos a bases de datos ni datos reales de clientes.
- Nombres de personas: nombre, paterno, materno.
- El vendedor es de cada póliza, no del cliente.
- No guardar lo que se puede calcular.
- Mientras exista Sicas, Access manda. MySQL local y la web reciben copias con el mismo ID.
- Ninguna puerta de la oficina se abre hacia internet: los envíos salen del servidor hacia la web.
