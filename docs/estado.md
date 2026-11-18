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

## Lo que sigue

**Siguiente chat: "SIAP web · API de clientes a la nube".** Mandar los clientes de MySQL local a la MySQL de la web. Decisiones ya tomadas en `docs/decisiones.md` ("Sincronización y APIs"). Faltan tres piezas, cada una se prueba antes de seguir:

1. **La API** `public_html/api_web/clientes.php`: recibe clientes y los guarda en la MySQL de la web, con toda la seguridad acordada (configuración fuera de `public_html`, usuario de MySQL propio, clave nueva, validación, códigos HTTP correctos).
2. **El programa de envío** en el servidor: busca en MySQL local los clientes con `fecha_modificacion` posterior al último envío y los manda a la API en paquetes. Solo avanza su marca cuando la API confirma.
3. **La tarea programada** de Windows que lo corre cada pocos minutos y arranca sola al prender el servidor.

Primer paso del chat nuevo: crear en cPanel la carpeta de configuración fuera de `public_html` y el usuario de MySQL propio para la API.

**Pendientes chicos de SIAP:** que `db.Ejecutar` no muestre `MsgBox` en la sincronización; mientras tanto, dar de alta en MySQL cada ejecutivo nuevo de Sicas. Guardar `Sexo` como 1 (no 255).

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
