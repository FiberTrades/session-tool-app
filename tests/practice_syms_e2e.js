(async function () {
  // Practice Replay, each chart its own symbol (Nestor, 17 Oct 2026: "Should each chart also get its own symbol, so EUR/USD and
  // gold can sit side by side?" - "yes"), and up to 8 charts. Real candles of Thu 1 Oct 2026: chart 1 EUR/USD, chart 2 gold.
  // Run: python tests/browser_test.py tests/practice_syms_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 2; C.tfs = [15, 15, 5, 240]; C.syms = []; C.stopPx = { EURUSD: 0.0012 }; C.speed = 0; C.ses = {}; C.max = true; C.mini = false; C.miniOff = {}; C.lv = {}; C.resume = null;
    C.mm = Object.assign({}, C.mm, { col: true, on: true, ord: 'market', maxDay: 0 });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    var pane = function (i) { return P._panes()[i]; }, last = function (i) { var b = pane(i).bars; return b[b.length - 1]; };
    P._goto('14:30'); await W(400);

    // ---- each chart's symbol button ----
    var pills = document.querySelectorAll('#stpr-grid .stpr-sympill');
    ok('two charts: a symbol button on each, both EUR/USD to begin with', pills.length === 2 && /EUR\/USD/.test(pills[0].textContent) && /EUR\/USD/.test(pills[1].textContent), Array.prototype.map.call(pills, function (b) { return b.textContent; }));
    pills[1].click(); await W(80);
    var menu = document.querySelector('#stpr-menu.show'), gold = menu && Array.prototype.filter.call(menu.querySelectorAll('[data-sym][data-si="1"]'), function (b) { return /Gold/.test(b.textContent); })[0];
    ok('its menu is chart 2\'s: every symbol, gold among them', menu && /Chart 2/.test(menu.textContent) && !!gold, menu && menu.textContent.slice(0, 120));
    var goldRaw = gold && gold.getAttribute('data-sym');
    gold.click();
    for (k = 0; k < 100 && !(P._ps(pane(1)).sym.key === 'XAUUSD' && pane(1).n > 0); k++) await W(100); await W(300);
    var c0 = last(0).close, c1 = last(1).close;
    ok('chart 2 is gold, on the same day: its own candles (thousands); chart 1 is still EUR/USD', P._ps(pane(1)).sym.key === 'XAUUSD' && c1 > 1000 && c0 > 0.5 && c0 < 2 && C.syms[1] === goldRaw && /Gold/.test(document.querySelectorAll('#stpr-grid .stpr-sympill')[1].textContent), [c0, c1, C.syms]);
    var now = P._s().now;
    ok('at the same moment: both charts end at the replay\'s now', last(0).time < now && last(1).time < now && now - last(0).time <= 900 && now - last(1).time <= 900, [last(0).time, last(1).time, now]);
    ok('gold\'s prices read with its own decimals', pane(1).series.options().priceFormat.precision === P._ps(pane(1)).digits && P._ps(pane(1)).digits < 5 && pane(0).series.options().priceFormat.precision === 5, [pane(1).series.options().priceFormat.precision, P._ps(pane(1)).digits]);
    var n0 = pane(0).n, n1 = pane(1).n; document.getElementById('stpr-fwd').click(); await W(400);
    ok('a step moves both charts on', pane(0).n === n0 + 1 && pane(1).n === n1 + 1, [n0, pane(0).n, n1, pane(1).n]);

    // ---- drawings: the symbol of the chart pressed ----
    var DW = P._dr(); DW.list.length = 0; P._render();
    pane(1).el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 }));
    ok('pressing chart 2 brings gold\'s drawings into hand', P._dwRaw() === goldRaw, P._dwRaw());
    var y1 = pane(1).series.priceToCoordinate(c1); DW = P._dr();
    document.getElementById('stpr-drawbtn').click(); await W(20); document.querySelector('#stpr-tools [data-tool="hline"]').click(); await W(20);
    var ch = pane(1).el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    ch.dispatchEvent(new MouseEvent('mousedown', { clientX: r.left + 120, clientY: r.top + y1, bubbles: true, cancelable: true, button: 0, buttons: 1 }));
    ch.dispatchEvent(new MouseEvent('mouseup', { clientX: r.left + 120, clientY: r.top + y1, bubbles: true, cancelable: true, button: 0 })); await W(150); P._render(); await W(200);
    var gl = P._dwListOf(goldRaw), el = P._dwListOf('EURUSD');
    ok('a horizontal line drawn on chart 2 is gold\'s (at gold\'s price), not EUR/USD\'s', gl.length === 1 && gl[0].type === 'hline' && gl[0].price > 1000 && el.length === 0, [gl.length, gl[0] && gl[0].price, el.length]);
    ok('kept under gold in this browser', /hline/.test(localStorage.getItem('st_practice_draw2:' + goldRaw) || '') && !/hline/.test(localStorage.getItem('st_practice_draw2:EURUSD') || ''));
    ok('chart 2 shows it on its price scale; chart 1 does not', (pane(1).hl || []).length === 1 && (pane(0).hl || []).length === 0, [(pane(0).hl || []).length, (pane(1).hl || []).length]);
    pane(0).el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 }));
    ok('pressing chart 1 brings EUR/USD\'s back (the object tree and undo follow)', P._dwRaw() === 'EURUSD' && P._dr().list.length === 0, P._dwRaw());

    // ---- trades stay on chart 1's symbol ----
    P._exec(true); await W(60);
    var pc1 = pane(1).el.querySelector('.stpr-pc'), r1 = pc1.getBoundingClientRect();
    pc1.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse', button: 0, clientX: r1.left + 100, clientY: r1.top + 80 })); await W(80);
    ok('execution mode: a click on gold\'s chart places nothing and says the trade goes on chart 1', !P._s().pos && /chart 1/.test(document.getElementById('stpr-flash').textContent), document.getElementById('stpr-flash').textContent);
    P._exec(false); await W(40);

    // ---- more charts: the new ones follow chart 1 until given their own ----
    await P._layout(4); for (k = 0; k < 80 && !(P._panes().length === 4 && pane(3).n); k++) await W(100); await W(200);
    var ks = P._panes().map(function (q) { return P._ps(q).sym.key; });
    ok('4 charts: chart 2 keeps gold, charts 3 and 4 follow chart 1', ks.join(',') === 'EURUSD,XAUUSD,EURUSD,EURUSD', ks);
    await P._setPaneSym(1, 'EURUSD'); for (k = 0; k < 40 && P._ps(pane(1)).sym.key !== 'EURUSD'; k++) await W(100);
    ok('chart 1\'s symbol picked for chart 2: it follows chart 1 again', P._ps(pane(1)).sym.key === 'EURUSD' && !C.syms[1] && Object.keys(P._s().side || {}).length === 0, [C.syms, Object.keys(P._s().side || {})]);
    ok('no page errors', !errs.length, errs.slice(0, 4));
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k2) { return /^st_practice/.test(k2); }).forEach(function (k2) { localStorage.removeItem(k2); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
