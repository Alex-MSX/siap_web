# SIAP Web

Plataforma web para administrar la cartera de seguros de Prolomer. Con el tiempo sustituirá a SIAP, la aplicación de escritorio en VB.NET.

## Estado actual

**Fase 0: prototipo visual.** Hay dos pantallas navegables con datos de ejemplo (todos inventados):

| Pantalla | Archivo | Qué muestra |
|---|---|---|
| Clientes | `prototipo/clientes.html` | Buscador, contratantes, contactos, resumen del cliente y pólizas por ramo |
| Ficha del cliente | `prototipo/ficha.html?id=2550` | Datos generales, cartera por ramo, documentos, contactos, tarjetas, portales y direcciones |
| Ficha de póliza | `prototipo/poliza.html?num=GMI-10879` | Datos, importes, documentos, endosos, órdenes, recibos, asegurados, beneficiarios, condiciones, adicionales y bitácora |

Para verlas, descarga el repositorio y abre `prototipo/clientes.html` en el navegador (doble clic). No necesitan servidor.

## Plan

1. **Consulta de cartera de solo lectura.** Buscar clientes y pólizas y ver recibos, estatus y documentos desde cualquier lugar. No escribe nada, así que no hay riesgo para la operación.
2. **Sincronización.** SIAP sigue siendo la fuente de verdad. Un proceso (n8n o una tarea de SIAP) copia periódicamente la información de Access y de MySQL local a la MySQL del dominio.
3. **Migración módulo por módulo.** Cada proceso que se pase a la web (por ejemplo CATs o conciliación) se empieza a escribir allá. SIAP se va vaciando poco a poco, sin un día de migración que lo arriesgue todo.

Desde la primera versión con datos reales: login con usuarios y permisos, y HTTPS.

## Arquitectura prevista

- **Frontend:** HTML, CSS y JavaScript (lo que hay en `prototipo/`).
- **Backend / API:** PHP en el hosting del dominio (cPanel), que ya corre las APIs actuales de SIAP.
- **Base de datos:** MySQL del dominio.

## Estructura

```
prototipo/
  clientes.html          Pantalla de clientes
  ficha.html             Ficha del cliente
  poliza.html            Ficha de póliza
  assets/
    siap.css             Estilos compartidos
    siap.js              Menú lateral y utilidades
    datos-ejemplo.js     Datos inventados para el prototipo
    img/                 Logo
docs/
  decisiones.md          Decisiones de diseño y supuestos por confirmar
```

## Regla de seguridad

Este repositorio **nunca** debe contener contraseñas, accesos a bases de datos ni datos reales de clientes, aunque sea privado. Esos valores viven solo en el servidor (archivos de configuración ignorados por git).
