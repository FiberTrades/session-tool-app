/* Spanish safety net (Nestor, 6 Nov 2026: "make sure that a spanish user doesnt have to see or read anything is english").
   The app translates through LANG_STRINGS / T() / _stT(), but a few hundred labels, tooltips and placeholders were written in
   English straight into the HTML or the code. With the app in Spanish, this watches what appears on the page and swaps any
   text, title, aria-label, placeholder or alt that is EXACTLY one of these English strings for its Spanish. Switching back to
   English restores what it changed. New English found by the Spanish sweep goes in D (exact text, trimmed).
   It never touches what people typed: inputs, text areas, editable areas, community messages, code blocks. */
(function () {
  'use strict';
  if (window.__stEsNet) return; window.__stEsNet = true;
  // the chart windows (livecharts.html, chart.html) are drawn by the app window's code: they take the member's language from here,
  // and follow it when it changes in the app window
  try { if (localStorage.getItem('st_ui_lang') === 'es') document.documentElement.lang = 'es'; } catch (e) {}
  window.addEventListener('storage', function (e) {
    if (e.key !== 'st_ui_lang' || typeof window.setLanguage === 'function') return;   // the app itself changes language through setLanguage
    if (e.newValue === 'es' || e.newValue === 'en') document.documentElement.lang = e.newValue;
  });
  var D = {
    // ----- top bar, banners, navigation
    'Ticker settings': 'Ajustes del ticker', 'Settings': 'Ajustes', 'Account plan': 'Plan de la cuenta', 'Dismiss': 'Descartar',
    'Previous bias': 'Sesgo anterior', 'Next bias': 'Sesgo siguiente', 'Previous review': 'Revisión anterior', 'Next review': 'Revisión siguiente',
    'Close': 'Cerrar', 'Setup': 'Setup', 'Open': 'Abrir', 'Save': 'Guardar', 'Cancel': 'Cancelar', 'Done': 'Hecho', 'Delete': 'Eliminar',
    'Remove': 'Quitar', 'Add': 'Añadir', 'Edit': 'Editar', 'Confirm': 'Confirmar', 'Not now': 'Ahora no', 'Failed': 'Error',
    'Loading…': 'Cargando…', 'Loading...': 'Cargando…', 'All': 'Todo', 'All time': 'Todo el historial', 'Today': 'Hoy', 'No data': 'Sin datos',
    'Turn on notifications': 'Activar notificaciones', 'Language': 'Idioma', 'Currency': 'Moneda', 'Period': 'Periodo', 'Sections': 'Secciones',
    'Billing period': 'Periodo de facturación', 'Email': 'Correo electrónico', 'Password': 'Contraseña', 'Show password': 'Mostrar contraseña',
    'Please rotate your device to portrait.': 'Gira tu dispositivo a vertical.', 'Your last payment did not go through.': 'Tu último pago no se ha completado.',
    'Copy email': 'Copiar correo', 'Open email app': 'Abrir la app de correo', 'Open in browser': 'Abrir en el navegador', 'Exit fullscreen': 'Salir de pantalla completa',
    'Fullscreen': 'Pantalla completa', 'Maximise': 'Maximizar', 'Open in a new window': 'Abrir en una ventana nueva', 'Settings ': 'Ajustes ',
    // ----- journal, stats, calendar
    'News vs quiet': 'Con noticias vs tranquilo', 'Replay this trade': 'Repetir esta operación en Replay', 'Trade Details': 'Detalles de la operación',
    'Broker trades not in your journal': 'Operaciones del bróker que no están en tu diario',
    'Remove the ticked trades from this list without adding them to your journal - use it for trades you already logged.': 'Quita de esta lista las operaciones marcadas sin añadirlas a tu diario: úsalo para operaciones que ya registraste.',
    'Restore it any time with Import Data, in Settings.': 'Puedes restaurarlo cuando quieras con Importar datos, en Ajustes.',
    'Marked as imported - nothing left to sync.': 'Marcadas como importadas: no queda nada por sincronizar.', 'Could not read this file.': 'No se pudo leer este archivo.',
    'Chart preview': 'Vista previa del gráfico', 'Bias chart': 'Gráfico del sesgo', 'Chart': 'Gráfico', 'Review chart': 'Gráfico de la revisión', 'Notes': 'Notas',
    'Mentor note': 'Nota del mentor', 'Mentor note (opened)': 'Nota del mentor (abierta)', 'Log trades to see your equity curve.': 'Registra operaciones para ver tu curva de capital.',
    'No trades to analyze yet.': 'Aún no hay operaciones que analizar.', 'Avg per win': 'Media por ganadora', 'Win Rate': 'Tasa de acierto', 'Trades': 'Operaciones',
    'No weekly reviews saved yet. One will be offered when you save on a Friday.': 'Aún no hay revisiones semanales guardadas. Se te ofrecerá una cuando guardes un viernes.',
    'No trades match the selected filter.': 'Ninguna operación coincide con el filtro elegido.', 'Go to Review': 'Ir a la revisión', 'Download card': 'Descargar tarjeta',
    'Previous month': 'Mes anterior', 'Next month': 'Mes siguiente', 'Previous year': 'Año anterior', 'Next year': 'Año siguiente',
    'Example chart': 'Gráfico de ejemplo',
    // ----- community, messages, calls
    'Powered by GIPHY': 'Con la tecnología de GIPHY', 'Emoji': 'Emoji', 'Category settings': 'Ajustes de la categoría', 'Try fewer words, or a filter like': 'Prueba con menos palabras, o un filtro como',
    'No GIFs found.': 'No se encontraron GIFs.', 'Any role (no restriction)': 'Cualquier rol (sin restricción)', 'Clear log': 'Borrar registro', 'New category': 'Nueva categoría',
    'Category name': 'Nombre de la categoría', 'No category': 'Sin categoría', 'New channel': 'Nuevo canal', 'Who can see this channel': 'Quién puede ver este canal',
    'Topic (optional)': 'Tema (opcional)', 'Topic': 'Tema', 'channel-name': 'nombre-del-canal', 'Scroll down to open the community': 'Desliza hacia abajo para abrir la comunidad',
    'Font size': 'Tamaño de letra', 'Text colour': 'Color del texto', 'Border': 'Borde', 'Border colour': 'Color del borde', 'Background': 'Fondo', 'Background colour': 'Color de fondo',
    'Your messages': 'Tus mensajes', 'Pick a conversation, or message someone from the member list.': 'Elige una conversación o escribe a alguien de la lista de miembros.',
    'No conversations yet. Message someone from the member list.': 'Aún no hay conversaciones. Escribe a alguien de la lista de miembros.',
    'This is the beginning of your direct messages.': 'Este es el comienzo de tus mensajes directos.', 'Replying to': 'Respondiendo a', 'No one to forward to.': 'No hay nadie a quien reenviar.',
    'Remove photo': 'Quitar foto', 'Change photo': 'Cambiar foto', 'No channels yet.': 'Aún no hay canales.', 'Online': 'En línea', 'Idle': 'Ausente', 'Do Not Disturb': 'No molestar',
    'Message': 'Mensaje', 'Name your session': 'Ponle nombre a tu sesión', 'Members will see this on the LIVE banner.': 'Los miembros lo verán en el banner de EN VIVO.',
    'London Session': 'Sesión de Londres', 'Save chat afterwards to': 'Guardar el chat después en', 'Promote to speaker': 'Hacer orador', 'Demote to listener': 'Pasar a oyente',
    'Loading member’s journal…': 'Cargando el diario del miembro…', 'Loading member\'s journal…': 'Cargando el diario del miembro…',
    // ----- plans, sign-in, MT5
    'Session Terminal · Premium': 'Session Terminal · Premium', 'Review the truth.': 'Revisa la verdad.', 'Plans for every stage.': 'Planes para cada etapa.',
    'Place trades on MT5 from Session Terminal': 'Abre operaciones en MT5 desde Session Terminal', 'Forex, Indices, Gold, Oil, Crypto and Stocks.': 'Forex, índices, oro, petróleo, cripto y acciones.',
    'Your Session Terminal sync token': 'Tu token de sincronización de Session Terminal', 'Allow WebRequest for listed URL': 'Allow WebRequest for listed URL',
    'Testing: only you see this.': 'Pruebas: solo tú ves esto.', 'Only you can see this': 'Solo tú puedes ver esto', 'Find a trader': 'Buscar un trader', 'Search a trader…': 'Buscar un trader…',
    'Their email': 'Su correo', 'Trade': 'Operación', 'Day': 'Día', 'Session': 'Sesión', 'Go to': 'Ir a',
    // ----- charts: toolbars, Replay, drawing tools
    'Timeframe': 'Temporalidad', 'Compare symbol': 'Comparar símbolo', 'Drawing tools': 'Herramientas de dibujo', 'Draw': 'Dibujar', 'Horizontal line': 'Línea horizontal',
    'Line tools': 'Herramientas de línea', 'Trend line': 'Línea de tendencia', 'Ray': 'Rayo', 'Arrow': 'Flecha', 'Path': 'Trayecto', 'Horizontal ray': 'Rayo horizontal',
    'Vertical line': 'Línea vertical', 'Parallel channel': 'Canal paralelo', 'Fib': 'Fibonacci', 'Long position': 'Posición larga', 'Short position': 'Posición corta',
    'Forecasting and measuring': 'Previsión y medición', 'Measure': 'Medir', 'Rectangle': 'Rectángulo', 'Shapes and brushes': 'Formas y pinceles', 'Circle': 'Círculo',
    'Highlighter': 'Resaltador', 'Text': 'Texto', 'Text and notes': 'Texto y notas', 'Price note': 'Nota de precio', 'Undo': 'Deshacer', 'Redo': 'Rehacer',
    'Delete selected': 'Eliminar lo seleccionado', 'Hide all drawings': 'Ocultar todos los dibujos', 'Lock all drawings': 'Bloquear todos los dibujos', 'Magnet': 'Imán',
    'Keyboard shortcuts': 'Atajos de teclado', 'News': 'Noticias', 'More chart': 'Más opciones del gráfico', 'Object tree': 'Árbol de objetos', 'Take a snapshot': 'Hacer una captura',
    'Show on chart': 'Mostrar en el gráfico', 'Trade marks': 'Marcas de operaciones', 'Position tool': 'Herramienta de posición', 'Session Indicator settings': 'Ajustes del Session Indicator',
    'Entry and exit arrows, and the Entry / SL / TP lines with their labels on the price scale': 'Flechas de entrada y salida, y las líneas de Entrada / SL / TP con sus etiquetas en la escala de precios',
    'Chart settings': 'Ajustes del gráfico', 'Restart': 'Reiniciar', 'Step back': 'Paso atrás', 'Step forward': 'Paso adelante', 'Replay speed': 'Velocidad',
    'Previous trade': 'Operación anterior', 'Next trade': 'Operación siguiente', 'Replay log': 'Registro de Replay', 'Back to live': 'Volver a en vivo',
    'Edit the session times': 'Editar el horario de la sesión', 'Go to a time': 'Ir a una hora', 'Show favourite drawing tools toolbar': 'Mostrar la barra de herramientas favoritas',
    'Alerts': 'Alertas', 'Show the toolbars': 'Mostrar las barras de herramientas', 'Back to the open': 'Volver a la apertura', 'Back one step': 'Un paso atrás', 'Next step': 'Paso siguiente',
    'Charting by TradingView': 'Gráficos de TradingView', 'ticker tape TradingView widget': 'cinta de cotizaciones de TradingView',
    // ----- dialogs (their fixed HTML; opened from code they are usually set in Spanish already)
    'Welcome': 'Bienvenido', 'What should this tool call you? I\'ll use this when offering feedback and weekly reviews.': '¿Cómo quieres que te llame la app? Lo usaré al darte feedback y en las revisiones semanales.',
    'e.g. London 8-10AM': 'p. ej. Londres 8-10', 'Share a series': 'Compartir una serie', 'Which series': 'Qué serie', 'Save card': 'Guardar tarjeta', 'Share': 'Compartir',
    'Potential R & Pips': 'R y pips potenciales', 'How far did the move actually go before reversing?': '¿Hasta dónde llegó el movimiento antes de girarse?', 'You captured': 'Capturaste',
    '. Enter what the trade could have been at peak.': '. Escribe lo que pudo dar la operación en su punto máximo.', 'Potential R': 'R potencial', 'Potential pips': 'Pips potenciales',
    'Your Period': 'Tu periodo', 'Risk £': 'Riesgo £', 'Risk $': 'Riesgo $', 'Risk €': 'Riesgo €',
    'Monthly Summary': 'Resumen mensual', 'Example · FTMO 100K - Challenge': 'Ejemplo · FTMO 100K - Challenge', 'Main': 'Principal',
    '1-Step ·': '1 fase ·', '2-Step ·': '2 fases ·', '3-Step ·': '3 fases ·'
  };
  var SKIP = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], .dcx-text, .dcx-codeblock, .dcx-code, .dcx-chan-name, .stdm-text, script, style, code, pre, [data-no-es]';
  var ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
  var origT = new WeakMap(), origA = new WeakMap(), on = false;
  function es() { return document.documentElement.lang === 'es'; }
  function tr(v) { if (!v) return null; var k = v.replace(/\s+/g, ' ').trim(); if (!k || !Object.prototype.hasOwnProperty.call(D, k)) return null; var r = D[k]; return r === k ? null : v.replace(v.trim(), r); }
  function skip(el) { try { return !!(el && el.closest && el.closest(SKIP)); } catch (e) { return false; } }
  // the dictionary look-up first (cheap), the where-is-it check only on a hit: price ticks rewrite text all the time
  function doText(n) { var v = tr(n.nodeValue); if (v == null) return; var p = n.parentElement; if (!p || skip(p)) return; if (!origT.has(n)) origT.set(n, n.nodeValue); n.nodeValue = v; }
  function doAttr(el, a) { var cur = el.getAttribute(a); var v = tr(cur); if (v == null) return; if (skip(el) && !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return; var m = origA.get(el); if (!m) { m = {}; origA.set(el, m); } if (!(a in m)) m[a] = cur; el.setAttribute(a, v); }
  function doEl(el) { for (var i = 0; i < ATTRS.length; i++) if (el.hasAttribute(ATTRS[i])) doAttr(el, ATTRS[i]); }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doEl(root);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null), n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }
  // back to English: put back what was swapped
  function restore(root) {
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null), n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) { if (origT.has(n)) { var o = origT.get(n); if (tr(o) === n.nodeValue) n.nodeValue = o; origT.delete(n); } }
      else { var m = origA.get(n); if (m) { for (var a in m) { if (tr(m[a]) === n.getAttribute(a)) n.setAttribute(a, m[a]); } origA.delete(n); } }
    }
  }
  var mo = new MutationObserver(function (ms) {
    if (!on) return;
    for (var i = 0; i < ms.length; i++) { var m = ms[i];
      if (m.type === 'childList') { for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]); }
      else if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes' && m.attributeName !== 'lang') doAttr(m.target, m.attributeName);
    }
  });
  // watching only while the app is in Spanish: in English nothing runs at all
  var ready = false;
  function sync() {
    if (!ready) return;
    var want = es();
    if (want && !on) { on = true; walk(document.body); mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS }); }
    else if (!want && on) { on = false; mo.disconnect(); restore(document.body); }
  }
  // the language lives on <html lang>; follow it
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  function start() { ready = true; sync(); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.__stEsNet = { add: function (o) { for (var k in o) D[k] = o[k]; if (on && document.body) walk(document.body); }, has: function (k) { return Object.prototype.hasOwnProperty.call(D, k); } };
})();
