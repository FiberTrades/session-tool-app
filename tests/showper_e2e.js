(async function () {
  // Show on chart, per chart (Nestor, 22 Oct 2026: "if i switch off the position tool in one chart the other charts also change, how many
  // times do i need to say the charts need to be independent?", "and also trade marks they need to be independent"), and the trade's lines
  // behind the candles ("also EA lines need to sit behind candles too"). Two charts, a buy open, the Minimalist on. Replay, EUR/USD, 1 Oct 2026.
  // Run: python tests/browser_test.py tests/showper_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var win = null;
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(800);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 2; C.lv = { 2: 'H' }; C.tfs = [5, 15, 60, 240]; C.max = true; C.resume = null; C.mini = true; C.marks = true; C.pos = true; C.showPer = {}; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    P._goto('10:02'); P._place(1); for (k = 0; k < 6; k++) P._step(); P._render(); await W(500);
    var pn = function (j) { return P._panes()[j]; }, vis = function (j) { return P._lines(j).filter(function (l) { return l.vis; }).length; };
    var zone = function (j) { var s = pn(j).series.__stMub; return !!(s && s.list.length); };
    ok('both charts: the position box, the trade\'s lines, the Minimalist', pn(0)._zones > 0 && pn(1)._zones > 0 && vis(0) >= 3 && vis(1) >= 3 && zone(0) && zone(1), [pn(0)._zones, pn(1)._zones, vis(0), vis(1), zone(0), zone(1)]);
    // the trade's lines: the library's line off, the same line under the candles; tags kept
    var allOff = P._panes().every(function (p) { return p.lines.every(function (l) { return l.options().lineVisible === false; }); });
    var sl = P._lines(0).filter(function (l) { return l.k === 'sl'; })[0], cv = pn(0).chart.takeScreenshot(), d = cv.width / pn(0).el.querySelector('.stpr-pc').clientWidth;
    var y = Math.round(pn(0).series.priceToCoordinate(sl.p) * d), px = Array.prototype.slice.call(cv.getContext('2d').getImageData(Math.round(4 * d), y, 1, 1).data);
    ok('the trade\'s lines: drawn under the candles (the library\'s own line off), the SL red across the chart, its tag on the scale', allOff && px[0] > 180 && px[1] < 140 && /SL/.test(sl.title) && sl.vis, [allOff, px, sl]);
    // chart 2 clicked, Show on chart
    pn(1).el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await W(50);
    document.getElementById('stpr-layersbtn').click(); await W(80);
    var menu = document.getElementById('stpr-menu');
    ok('Show on chart says which chart: chart 2 · 15m', /Show on chart · chart 2 · 15m/.test(menu.textContent), menu.textContent.slice(0, 80));
    var flip = function (id) { var b = document.getElementById('stpr-menu').querySelector('#' + id); b.checked = !b.checked; b.dispatchEvent(new Event('change', { bubbles: true })); };
    flip('stpr-pos'); await W(300); P._render(); await W(200);
    ok('Position tool off on chart 2: its box goes; chart 1 keeps its own', pn(1)._zones === 0 && pn(0)._zones > 0, [pn(0)._zones, pn(1)._zones]);
    flip('stpr-marks'); await W(300);
    ok('Trade marks off on chart 2: its lines and tags go; chart 1 keeps them', vis(1) === 0 && vis(0) >= 3, [vis(0), vis(1)]);
    flip('stpr-mini'); await W(400); P._render(); await W(200);
    ok('Minimalist off on chart 2: its zone goes; chart 1 keeps it', !zone(1) && zone(0), [zone(0), zone(1)]);
    ok('kept with the chart settings, chart 2\'s own', C.showPer && C.showPer[1] && C.showPer[1].pos === false && C.showPer[1].marks === false && C.showPer[1].mini === false && !C.showPer[0] && C.pos !== false && C.marks !== false && C.mini, C.showPer);
    P._closeMenu && P._closeMenu();
    // chart 1's menu: its own switches, all on
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    pn(0).el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await W(50);
    document.getElementById('stpr-layersbtn').click(); await W(80); document.getElementById('stpr-layersbtn').click(); await W(80);
    menu = document.getElementById('stpr-menu');
    ok('chart 1\'s Show on chart: chart 1 · 5m, everything still on', /chart 1 · 5m/.test(menu.textContent) && menu.querySelector('#stpr-pos').checked && menu.querySelector('#stpr-marks').checked && menu.querySelector('#stpr-mini').checked, menu.textContent.slice(0, 80));
    // chart 2 in a window of its own: its toolbar's Show on chart is chart 2's, though chart 1 was clicked last
    document.getElementById('stpr-layersbtn').click(); await W(60);
    P._pop(1); for (k = 0; k < 120 && !(P._pops()[1] && P._pops()[1].ready && pn(1).el.ownerDocument !== document && pn(1).n); k++) await W(100); await W(300);
    win = P._pops()[1].w; win.document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    var wb = win.document.querySelector('#stpr-tb2 #stpr-layersbtn'); wb.click(); await W(150);
    var m2 = [win.document, document].map(function (d) { return d.getElementById('stpr-menu'); }).filter(function (m) { return m && /Show on chart/.test(m.textContent); })[0];
    ok('from chart 2\'s own window: Show on chart is chart 2\'s (its switches as it left them: off)', wb && m2 && /chart 2 · 15m/.test(m2.textContent) && !m2.querySelector('#stpr-pos').checked && !m2.querySelector('#stpr-marks').checked, m2 && m2.textContent.slice(0, 80));
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { window.__stPractice.close(); } catch (e) {}
  try { if (win && !win.closed) win.close(); } catch (e) {}
  return out;
})()
