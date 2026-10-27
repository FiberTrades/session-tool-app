(async function () {
  // Favourite drawing tools (Nestor, 26 Oct 2026, TradingView's): a star on every tool in the tools' menus; starred tools sit on a
  // floating Favourites toolbar that can be dragged anywhere on the chart, its place remembered; the star button beside the magnet
  // (at the foot of the platform's left toolbar) shows and hides it.
  // Run: python tests/browser_test.py tests/practice_favs_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stDrawBar); i++) await W(100); await W(800);
    var P = window.__stPractice; try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.mini = false; C.news = false; C.fav = []; C.favOn = false; delete C.favPos;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    var DW = P._dr(), tools = document.getElementById('stpr-tools'), fb = document.getElementById('stpr-favbtn'), win = document.getElementById('stpr-win');
    if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); await W(60);
    var bar = function () { return win.querySelector('.stpr-favbar'); }, shown = function () { var b = bar(); return !!(b && b.classList.contains('show') && b.offsetWidth > 0); };
    var inMenus = tools.querySelectorAll('.stpr-tfl [data-tool]').length, stars = tools.querySelectorAll('.stpr-tfl [data-tool] [data-fav]').length;
    ok('a star on every tool in the menus', inMenus > 10 && stars === inMenus, [inMenus, stars]);
    ok('the star button beside the magnet, the toolbar not showing yet', fb && fb.previousElementSibling.id === 'stpr-magnet' && fb.getAttribute('aria-pressed') === 'false' && !shown(), fb && fb.title);

    tools.querySelector('[data-tgrp="lines"]').click(); await W(40);
    var st = tools.querySelector('.stpr-tfl [data-fav="trend"]'); st.click(); await W(60);
    ok('a star on Trend line: it is a favourite, its star filled, its menu still open, the toolbar shows (the first star)', (C.fav || []).indexOf('trend') >= 0 && st.classList.contains('on') && tools.querySelector('.stpr-tg[data-grp="lines"]').classList.contains('open') && shown() && DW.tool === 'none', [C.fav, DW.tool]);
    ok('the toolbar has its grip and the trend line', bar().querySelector('.fv-grip') && bar().querySelectorAll('[data-fvt]').length === 1 && bar().querySelector('[data-fvt="trend"] svg'));
    P._flyShut(); tools.querySelector('[data-tgrp="shapes"]').click(); await W(40); tools.querySelector('.stpr-tfl [data-fav="rect"]').click(); await W(40); P._flyShut();
    ok('a second star: Rectangle joins it, in the order starred', Array.prototype.map.call(bar().querySelectorAll('[data-fvt]'), function (b) { return b.getAttribute('data-fvt'); }).join(',') === 'trend,rect');
    bar().querySelector('[data-fvt="rect"]').click(); await W(40);
    ok('a tool on the toolbar picks it, lit there', DW.tool === 'rect' && bar().querySelector('[data-fvt="rect"]').classList.contains('on'), DW.tool);
    bar().querySelector('[data-fvt="rect"]').click(); await W(30);

    // dragged anywhere, its place kept
    var g = bar().querySelector('.fv-grip'), r0 = bar().getBoundingClientRect(), gr = g.getBoundingClientRect(), cx = gr.left + 5, cy = gr.top + 8;
    var pe = function (t, x, y) { g.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, pointerId: 9, bubbles: true, cancelable: true, isPrimary: true })); };
    pe('pointerdown', cx, cy); pe('pointermove', cx - 120, cy + 160); pe('pointermove', cx - 140, cy + 180); pe('pointerup', cx - 140, cy + 180); await W(60);
    var r1 = bar().getBoundingClientRect();
    ok('dragged by its grip: it moves with the mouse, its place saved', Math.abs((r1.left - r0.left) + 140) < 3 && Math.abs((r1.top - r0.top) - 180) < 3 && C.favPos && Math.abs(C.favPos.t - parseFloat(bar().style.top)) < 1, [r1.left - r0.left, r1.top - r0.top, C.favPos]);
    fb.click(); await W(40);
    ok('the star button hides it', !shown() && C.favOn === false && fb.getAttribute('aria-pressed') === 'false');
    fb.click(); await W(40);
    var r2 = bar().getBoundingClientRect();
    ok('and shows it again where it was left', shown() && Math.abs(r2.left - r1.left) < 2 && Math.abs(r2.top - r1.top) < 2 && fb.getAttribute('aria-pressed') === 'true', [r2.left - r1.left, r2.top - r1.top]);
    tools.querySelector('[data-tgrp="lines"]').click(); await W(30); tools.querySelector('.stpr-tfl [data-fav="trend"]').click(); tools.querySelector('.stpr-tg[data-grp="shapes"] [data-fav="rect"]').click(); await W(40); P._flyShut();
    ok('both stars off: the toolbar says how to add one', (C.fav || []).length === 0 && /Star a tool/.test(bar().textContent), bar().textContent);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
