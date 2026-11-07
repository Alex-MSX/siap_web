/* SIAP Web — funciones compartidas: menú lateral, formato y utilidades */

var SIAP = (function () {
  var ICONOS = {
    clientes: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.9M16 3.1a3.5 3.5 0 010 6.8',
    indicadores: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    renovaciones: 'M20 12a8 8 0 11-2.3-5.7M20 4v4h-4',
    comparativos: 'M4 4h7v16H4zM13 4h7v16h-7z',
    cotizaciones: 'M7 3h10v18H7zM10 8h4M10 12h4M10 16h2',
    solicitudes: 'M5 4h14v16H5zM9 9h6M9 13h6M9 17h3',
    cats: 'M3 6h18v12H3zM3 10h18M7 15h4',
    condiciones: 'M6 3h9l4 4v14H6zM14 3v5h5',
    ordenes: 'M9 4h6v3H9zM6 6H5v15h14V6h-1M9 12h6M9 16h4',
    captura: 'M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M9 12a3 3 0 106 0 3 3 0 00-6 0',
    mensajeria: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z',
    cobranza: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
    siniestros: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6zM12 8v4M12 16h.01',
    contratos: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h3',
    conciliacion: 'M20 6L9 17l-5-5',
    vendedores: 'M19 5L5 19M7.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
    auxiliares: 'M3 10l9-6 9 6M5 10v9M19 10v9M9 10v9M15 10v9M3 21h18'
  };

  var SECCIONES = [
    { titulo: 'COMERCIAL', items: [['clientes', 'Clientes'], ['indicadores', 'Indicadores'], ['renovaciones', 'Renovaciones'], ['comparativos', 'Comparativos'], ['cotizaciones', 'Cotizaciones'], ['solicitudes', 'Solicitudes'], ['cats', 'CATs'], ['condiciones', 'Condiciones']] },
    { titulo: 'OPERACIONES', items: [['ordenes', 'Órdenes'], ['captura', 'Captura'], ['mensajeria', 'Mensajería'], ['cobranza', 'Cobranza'], ['siniestros', 'Siniestros']] },
    { titulo: 'ADMINISTRACIÓN', items: [['contratos', 'Contratos'], ['conciliacion', 'Conciliación'], ['vendedores', 'Vendedores'], ['auxiliares', 'Auxiliares']] }
  ];

  // Módulos que ya tienen página en el prototipo
  var PAGINAS = { clientes: 'clientes.html' };

  function icono(d, tam) {
    tam = tam || 18;
    return '<svg width="' + tam + '" height="' + tam + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"></path></svg>';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function dinero(n) {
    var v = Number(n);
    return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function iniciales(nombre) {
    var p = nombre.trim().split(/\s+/);
    return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
  }

  function leerPreferencia(clave) {
    try { return localStorage.getItem(clave); } catch (e) { return null; }
  }
  function guardarPreferencia(clave, valor) {
    try { localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento: no pasa nada */ }
  }

  // Dibuja el menú lateral y conecta el botón para contraerlo
  function montarMenu(activo) {
    var nav = document.getElementById('menu');
    var html = '<div class="marca"><img src="assets/img/logo-prolomer.png" alt="Prolomer">' +
      '<div class="lbl"><b>SIAP</b><small>Prolomer</small></div></div>';
    SECCIONES.forEach(function (sec) {
      html += '<div class="menu-seccion"><div class="menu-linea" aria-hidden="true"></div>' +
        '<div class="menu-titulo">' + sec.titulo + '</div>';
      sec.items.forEach(function (it) {
        var clase = 'nav-btn' + (it[0] === activo ? ' on' : '');
        var destino = PAGINAS[it[0]] || '#';
        html += '<a class="' + clase + '" href="' + destino + '" title="' + it[1] + '" aria-label="' + it[1] + '">' +
          icono(ICONOS[it[0]]) + '<span class="lbl">' + it[1] + '</span></a>';
      });
      html += '</div>';
    });
    nav.innerHTML = html;

    var boton = document.getElementById('btn-menu');
    function aplicar(mini) {
      nav.classList.toggle('mini', mini);
      boton.setAttribute('aria-expanded', mini ? 'false' : 'true');
      boton.setAttribute('aria-label', mini ? 'Expandir menú' : 'Contraer menú');
      boton.title = mini ? 'Expandir menú' : 'Contraer menú';
    }
    aplicar(leerPreferencia('siap_menu_mini') === '1');
    boton.addEventListener('click', function () {
      var mini = !nav.classList.contains('mini');
      aplicar(mini);
      guardarPreferencia('siap_menu_mini', mini ? '1' : '0');
    });
  }

  return { icono: icono, esc: esc, dinero: dinero, iniciales: iniciales, montarMenu: montarMenu };
})();
