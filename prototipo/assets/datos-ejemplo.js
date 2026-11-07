/*
  Datos de EJEMPLO para el prototipo. Todos los nombres, RFC, pólizas y teléfonos son inventados.
  En la versión real, esta información llegará de la base de datos a través del backend (API).

  Categorías de ramo (campo "cat"): autos, gmm, vida, hogar, accidentes, rc, transporte, diversos
  Vendedor: va en cada póliza (un cliente puede tener pólizas de distintos vendedores).
  Nombres de personas físicas: nombre, apellido paterno, apellido materno.
  Estatus de póliza (campo "est"): vig = vigente, ren = por renovar (dias = días para vencer), off = no vigente
*/
var SIAP_DATOS = {
  clientes: [
    {
      id: 3038, nombre: 'CONSTRUCTORA DEL VALLE SA DE CV', rfc: 'CVA0905128K3', grupo: 'GRUPO VALLE',
      persona: 'Moral', ejecutivo: 'Sofía Ramírez', desde: '2011',
      contactos: [
        { nombre: 'Jorge Valle Ortega', puesto: 'Director general', correos: ['jvalle@cvalle.mx'], tels: [{ num: '55 8765 4321', ext: '', tipo: 'Celular' }] },
        { nombre: 'Laura Méndez Ruiz', puesto: 'Administración', correos: ['lmendez@cvalle.mx', 'pagos@cvalle.mx'], tels: [{ num: '55 1234 5678', ext: 'ext. 210', tipo: 'Oficina' }, { num: '55 7788 9900', ext: '', tipo: 'Celular' }] },
        { nombre: 'Orlando García Cárdenas', puesto: 'Director de finanzas', correos: ['ogarcia@cvalle.mx'], tels: [{ num: '55 1234 5678', ext: 'ext. 101', tipo: 'Oficina' }] },
        { nombre: 'Susana Chicato Andrés', puesto: 'Caja', correos: ['schicato@cvalle.mx'], tels: [{ num: '55 1234 5678', ext: 'ext. 230', tipo: 'Oficina' }] },
        { nombre: 'Manuel Ortiz Reyes', puesto: 'Caja', correos: ['mortiz@cvalle.mx'], tels: [{ num: '55 1234 5678', ext: 'ext. 231', tipo: 'Oficina' }] },
        { nombre: 'Esmeralda Jaimes López', puesto: 'Recursos humanos', correos: ['ejaimes@cvalle.mx'], tels: [{ num: '55 4433 2211', ext: '', tipo: 'Celular' }] },
        { nombre: 'Daniel Gómez Astivia', puesto: 'Compras', correos: ['dgomez@cvalle.mx'], tels: [{ num: '55 1234 5678', ext: 'ext. 240', tipo: 'Oficina' }] },
        { nombre: 'Marina Tapia García', puesto: 'Asistente de dirección', correos: ['mtapia@cvalle.mx'], tels: [{ num: '55 1234 5678', ext: 'ext. 102', tipo: 'Oficina' }] },
        { nombre: 'Pilar Gutiérrez Soto', puesto: 'Contabilidad', correos: ['pgutierrez@cvalle.mx'], tels: [{ num: '55 1234 5678', ext: 'ext. 250', tipo: 'Oficina' }] },
        { nombre: 'Alicia Pérez Acevedo', puesto: 'Procurement and policy manager', correos: ['aperez@cvalle.mx'], tels: [{ num: '55 9988 7766', ext: '', tipo: 'Celular' }] },
        { nombre: 'Víctor Vallados Valle', puesto: 'Compras', correos: ['vvallados@cvalle.mx'], tels: [{ num: '55 1234 5678', ext: 'ext. 241', tipo: 'Oficina' }] },
        { nombre: 'Karla de la Torre Gloria', puesto: '', correos: ['kdelatorre@cvalle.mx'], tels: [{ num: '55 6655 4433', ext: '', tipo: 'Celular' }] },
        { nombre: 'Claudia Moreno Ruiz', puesto: 'Jurídico', correos: ['cmoreno@cvalle.mx'], tels: [{ num: '55 1234 5678', ext: 'ext. 260', tipo: 'Oficina' }] },
        { nombre: 'María Yolanda Gutiérrez Fernández', puesto: 'Asistente servicios generales', correos: ['mygutierrez@cvalle.mx'], tels: [{ num: '55 1234 5678', ext: 'ext. 270', tipo: 'Oficina' }] },
        { nombre: 'Ana Stephanie Macías Valadez', puesto: 'Flotilla', correos: ['amacias@cvalle.mx'], tels: [{ num: '55 3322 1100', ext: '', tipo: 'Celular' }] }
      ],
      cobranza: ['lmendez@cvalle.mx', 'pagos@cvalle.mx'], principal: 'pagos@cvalle.mx',
      documentos: [
        { nombre: 'Acta constitutiva', detalle: 'Cargada', estado: 'ok', etiqueta: 'Vigente' },
        { nombre: 'Constancia de situación fiscal', detalle: 'Emitida el 15/09/2026', estado: 'ok', etiqueta: 'Vigente' }
      ],
      tarjetas: [],
      portales: [{ aseguradora: 'AXA', portal: 'Portal empresas', usuario: 'cvalle_admin', actualizado: '02/03/2026' }],
      direcciones: [{ calle: 'Blvd. Manuel Ávila Camacho', ext: '1500', int: 'Piso 8', colonia: 'Lomas de Chapultepec', municipio: 'Miguel Hidalgo', cp: '11000' }],
      polizas: [
        { num: 'AUT-558120', aseg: 'Qualitas', cat: 'autos', ramo: 'Autos flotilla', concepto: 'Flotilla · 12 unidades', desde: '15/01/2026', hasta: '15/01/2027', prima: 184320.50, vendedor: 'Ernesto Lugo Rivas', est: 'vig', rec: 1 },
        { num: 'GMC-30417', aseg: 'AXA', cat: 'gmm', ramo: 'GMM colectivo', concepto: 'Colectivo · 38 asegurados', desde: '01/03/2026', hasta: '01/03/2027', prima: 612450.00, vendedor: 'Ernesto Lugo Rivas', est: 'vig', rec: 2 },
        { num: 'RC-00921', aseg: 'Chubb', cat: 'rc', ramo: 'Responsabilidad civil', concepto: 'RC general', desde: '01/12/2025', hasta: '01/12/2026', prima: 46880.00, vendedor: 'Patricia Gómez Silva', est: 'ren', dias: 25, rec: 0 },
        { num: 'EMP-7781', aseg: 'Mapfre', cat: 'diversos', ramo: 'Empresarial', concepto: 'Paquete empresarial · oficinas', desde: '10/06/2025', hasta: '10/06/2026', prima: 32100.00, vendedor: 'Ernesto Lugo Rivas', est: 'off', rec: 0 }
      ]
    },
    {
      id: 2550, nombre: 'RICARDO VALLE TORRES', rfc: 'VATR850214QX1', grupo: 'GRUPO VALLE',
      persona: 'Física', ejecutivo: 'Sofía Ramírez', desde: '2014',
      contactos: [
        { nombre: 'Ricardo Valle Torres', puesto: 'Titular', correos: ['rvalle@correo.mx', 'ricardo.valle@empresa.mx'], tels: [{ num: '55 2345 6789', ext: '', tipo: 'Celular' }] },
        { nombre: 'Ana Torres Lima', puesto: 'Cónyuge', correos: ['atorres@correo.mx'], tels: [{ num: '55 3456 7890', ext: '', tipo: 'Celular' }, { num: '55 5555 0101', ext: 'ext. 101', tipo: 'Oficina' }] }
      ],
      cobranza: ['rvalle@correo.mx', 'atorres@correo.mx'], principal: 'rvalle@correo.mx',
      documentos: [
        { nombre: 'Identificación oficial', detalle: 'INE · cargada', estado: 'ok', etiqueta: 'Vigente' },
        { nombre: 'Constancia de situación fiscal', detalle: 'Emitida el 28/05/2025', estado: 'warn', etiqueta: 'Actualizar' }
      ],
      tarjetas: [
        { tarjeta: 'Visa •••• 4417', banco: 'BBVA', titular: 'Ricardo Valle Torres', vence: '08/2028', polizas: ['GMI-10879'] },
        { tarjeta: 'Mastercard •••• 9032', banco: 'Banorte', titular: 'Ana Torres Lima', vence: '02/2027', polizas: [] }
      ],
      portales: [
        { aseguradora: 'GNP', portal: 'Portal de clientes', usuario: 'rvalle@correo.mx', actualizado: '12/03/2026' },
        { aseguradora: 'HDI', portal: 'App HDI Seguros', usuario: 'VATR850214QX1', actualizado: '20/11/2025' }
      ],
      direcciones: [{ calle: 'Av. Paseo de los Fresnos', ext: '245', int: 'B', colonia: 'Lomas del Valle', municipio: 'Naucalpan', cp: '53150' }],
      polizas: [
        { num: 'GMI-10879', aseg: 'GNP', cat: 'gmm', ramo: 'GMM familiar', concepto: 'Línea Azul · familia', desde: '01/08/2026', hasta: '01/08/2027', prima: 56408.87, vendedor: 'Ernesto Lugo Rivas', est: 'vig', rec: 0 },
        { num: 'AUT-77310', aseg: 'HDI', cat: 'autos', ramo: 'Autos individual', concepto: 'Mazda CX-5 2024', desde: '20/11/2025', hasta: '20/11/2026', prima: 18940.00, vendedor: 'Ernesto Lugo Rivas', est: 'ren', dias: 14, rec: 1 },
        { num: 'VID-08893', aseg: 'Metlife', cat: 'vida', ramo: 'Vida individual', concepto: 'Temporal 20 años', desde: '01/04/2026', hasta: '01/04/2027', prima: 2569.21, vendedor: 'Ernesto Lugo Rivas', est: 'vig', rec: 0 },
        { num: 'HOG-20114', aseg: 'Zurich', cat: 'hogar', ramo: 'Hogar', concepto: 'Casa habitación', desde: '05/02/2026', hasta: '05/02/2027', prima: 7850.00, vendedor: 'Ernesto Lugo Rivas', est: 'vig', rec: 0 }
      ]
    },
    {
      id: 3568, nombre: 'TRANSPORTES DEL VALLE NORTE SA DE CV', rfc: 'TVN1203067B2', grupo: 'VALLE NORTE',
      persona: 'Moral', ejecutivo: 'Marco Ibarra', desde: '2019',
      contactos: [
        { nombre: 'Daniela Soto Peña', puesto: 'Recursos humanos', correos: ['dsoto@tvnorte.mx'], tels: [{ num: '81 4567 8901', ext: 'ext. 12', tipo: 'Oficina' }] }
      ],
      cobranza: ['dsoto@tvnorte.mx'], principal: 'dsoto@tvnorte.mx',
      documentos: [
        { nombre: 'Acta constitutiva', detalle: 'Cargada', estado: 'ok', etiqueta: 'Vigente' },
        { nombre: 'Constancia de situación fiscal', detalle: 'Sin cargar', estado: 'warn', etiqueta: 'Falta' }
      ],
      tarjetas: [],
      portales: [],
      direcciones: [{ calle: 'Carretera a Laredo', ext: 'Km 8.5', int: '', colonia: 'Parque Industrial Norte', municipio: 'Escobedo', cp: '66050' }],
      polizas: [
        { num: 'AUT-90021', aseg: 'Qualitas', cat: 'autos', ramo: 'Autos flotilla', concepto: 'Tractocamiones · 9 unidades', desde: '01/07/2026', hasta: '01/07/2027', prima: 395200.00, vendedor: 'Patricia Gómez Silva', est: 'vig', rec: 3 },
        { num: 'APC-44102', aseg: 'Sura', cat: 'accidentes', ramo: 'Accidentes colectivo', concepto: '22 operadores', desde: '01/07/2026', hasta: '01/07/2027', prima: 28640.00, vendedor: 'Patricia Gómez Silva', est: 'vig', rec: 0 },
        { num: 'TRA-11873', aseg: 'Chubb', cat: 'transporte', ramo: 'Transporte de carga', concepto: 'Póliza anual de carga', desde: '15/12/2025', hasta: '15/12/2026', prima: 74300.00, vendedor: 'Patricia Gómez Silva', est: 'ren', dias: 39, rec: 1 }
      ]
    }
  ]
};
