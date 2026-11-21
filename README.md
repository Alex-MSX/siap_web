# SIAP Web

> **¿Retomando el proyecto?** Empieza por [`docs/estado.md`](docs/estado.md): en qué vamos, qué sigue y cómo trabajamos.

Plataforma web para administrar la cartera de seguros de Prolomer. Con el tiempo sustituirá a SIAP, la aplicación de escritorio en VB.NET.

## Estado actual

**Fase 0: prototipo visual.** Hay dos pantallas navegables con datos de ejemplo (todos inventados):

| Pantalla | Archivo | Qué muestra |
|---|---|---|
| Clientes | `prototipo/clientes.html` | Buscador, contratantes, contactos, resumen del cliente y pólizas por ramo |
| Ficha del cliente | `prototipo/ficha.html?id=2550` | Datos generales, cartera por ramo, documentos, contactos, tarjetas, portales y direcciones |
| Renovaciones | `prototipo/renovaciones.html` | Pólizas que vencen en 40 días o vencidas sin renovar, por urgencia, con vista de ejecutivo y de administrador |
| Proceso de renovación | `prototipo/renovacion.html?num=19-211-4566-0` | Los 5 pasos del proceso (art. 492, contactos, direcciones, renovación, forma de pago) con avance, más cotizaciones, orden y bitácora |
| Ficha de póliza | `prototipo/poliza.html?num=GMI-10879` | Datos, importes, documentos, endosos, órdenes, recibos, asegurados, beneficiarios, condiciones, adicionales y bitácora |

Para verlas, descarga el repositorio y abre `prototipo/clientes.html` en el navegador (doble clic). No necesitan servidor.

## Plan

1. **Consulta de cartera de solo lectura.** Buscar clientes y pólizas y ver recibos, estatus y documentos desde cualquier lugar. No escribe nada, así que no hay riesgo para la operación.
2. **Sincronización.** Access (Sicas) sigue siendo la fuente de verdad. SIAP copia cada registro a MySQL local con el mismo ID, y un programa en el servidor manda a la MySQL del dominio lo que cambió (APIs en `public_html/api_web`). **Clientes: funcionando de punta a punta** (Access → MySQL local → web, cada 5 minutos). **Pólizas:** Sicas limpio (planes y claves) y copia a MySQL local al capturar; falta la API de la web.
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
  renovaciones.html      Renovaciones próximas y vencidas
  renovacion.html        Proceso de renovación de una póliza
  assets/
    siap.css             Estilos compartidos
    siap.js              Menú lateral y utilidades
    datos-ejemplo.js     Datos inventados para el prototipo
    img/                 Logo
api_web/
  clientes.php           API que recibe clientes (va en public_html/api_web del hosting)
sincronizador/
  sync_clientes.ps1      Programa de envío (va en C:\SIAP_Sync del servidor de la oficina)
  config.ejemplo.json    Configuración de ejemplo, sin contraseñas
  instalar_mysql_local.sql  Tabla sincronizacion y usuario siap_sync de MySQL local
consultas/
  huerfanos_polizas.sql  Reporte de huérfanos de pólizas (MySQL local)
docs/
  estado.md              En qué vamos y qué sigue (leer primero)
  decisiones.md          Decisiones de diseño y supuestos por confirmar
  base-de-datos.md       Diseño y revisión de las tablas de MySQL
```

## Regla de seguridad

Este repositorio **nunca** debe contener contraseñas, accesos a bases de datos ni datos reales de clientes, aunque sea privado. Esos valores viven solo en el servidor (archivos de configuración ignorados por git).
