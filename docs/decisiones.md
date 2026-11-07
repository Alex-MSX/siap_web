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

## Agregados al diseño (para validar)

- Franja de resumen del cliente: pólizas vigentes, prima vigente, recibos pendientes y próxima renovación.
- Estatus de la póliza con etiqueta de color ("Por renovar" usa la regla de 40 días antes del vencimiento).
- Cartera por ramo con los ramos vacíos en gris (oportunidad de venta).

## Por confirmar

- Renovaciones: límite exacto entre rojo y amarillo (¿rojo hasta 14 días?) y qué pasos forman el proceso de renovación (siguiente pantalla: ficha de la renovación).

1. Regla de vigencia de la constancia de situación fiscal (el prototipo usa "más de un año = actualizar").
2. Columnas reales de las pestañas Tarjetas y Portales (las del prototipo son supuestas).
3. Si los correos y teléfonos pertenecen a cada contacto o al cliente en general.
4. Ficha de póliza: confirmar que "No siniestro" genera la carta de no siniestralidad en Word, qué significan los dos íconos de cada recibo (en el prototipo: conciliación de comisión y comprobante de cobro), y las columnas reales de Asegurados, Beneficiarios, Condiciones y Adicionales.
