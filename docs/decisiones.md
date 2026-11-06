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

## Agregados al diseño (para validar)

- Franja de resumen del cliente: pólizas vigentes, prima vigente, recibos pendientes y próxima renovación.
- Estatus de la póliza con etiqueta de color ("Por renovar" usa la regla de 40 días antes del vencimiento).
- Cartera por ramo con los ramos vacíos en gris (oportunidad de venta).

## Por confirmar

1. Regla de vigencia de la constancia de situación fiscal (el prototipo usa "más de un año = actualizar").
2. Columnas reales de las pestañas Tarjetas y Portales (las del prototipo son supuestas).
3. Si los correos y teléfonos pertenecen a cada contacto o al cliente en general.
4. Qué se muestra al dar clic en una póliza (siguiente pantalla: ficha de póliza con recibos, endosos y documentos).
