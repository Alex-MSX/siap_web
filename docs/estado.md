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

- Tabla `clientes`: diseño cerrado y cambios aplicados en parte por Alex (18/11/2026). `id_cliente` es el mismo ID de Sicas.
- Modelo definido de direcciones, perfil fiscal (1 a 1 con el cliente) y facturación por póliza.
- Proceso de renovación: auditado; recomendaciones documentadas.

## Lo que sigue

**Siguiente chat: API de clientes.** Idea de Alex: igual que hoy SIAP manda cada póliza nueva a MySQL del dominio con una API propia, hacer lo mismo con los clientes. SIAP sigue mandando; la web solo recibe, con el mismo ID. El día que se apague SIAP, la web ya está al día.

Primer paso: que Alex explique cómo funciona su API de pólizas (dónde vive, cómo la llama SIAP, qué pasa si falla) para copiar el mismo patrón. Tres temas a tener presentes:

1. Copiar también los **cambios**, no solo las altas.
2. **Carga inicial** de los clientes que ya existen (una sola vez).
3. **Qué pasa si falla** el envío (saber cuáles no llegaron para reenviarlos).

**Pendientes de la tabla `clientes`:** pasar a `utf8mb4`, `rfc` a `varchar(13)` con índice, confirmar llaves foráneas de `id_grupo` e `id_ejecutivo`, revisar que `contratante` use `CONCAT_WS`, `CHECK` de persona física/moral si la versión lo permite, crear `perfiles_fiscales` y `cliente_documentos`. Para revisarlo hacen falta `SHOW CREATE TABLE clientes;` y `SELECT VERSION();`.

**Preguntas abiertas de diseño:** ver la sección "Por confirmar" de `docs/decisiones.md` y de `docs/base-de-datos.md`.

**Módulos por diseñar después:** pólizas (tabla), recibos y cobranza, endosos, órdenes, conciliación, siniestros, CATs y el portal de clientes.

## Reglas que no cambian

- Nunca subir al repositorio contraseñas, accesos a bases de datos ni datos reales de clientes.
- Nombres de personas: nombre, paterno, materno.
- El vendedor es de cada póliza, no del cliente.
- No guardar lo que se puede calcular.
