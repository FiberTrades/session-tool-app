(async function () {
  // Back Testing: a symbol per chart (Nestor, 18 Oct 2026: "give every chart the oportunity to be a different asset if the user
  // wants to have multiple assets opened") - the symbol button at the top puts a symbol on every chart, each chart's own button
  // on that chart alone; and the watchlist inside the symbol buttons ("when you click on eurusd you see the watchlist inside"):
  // each symbol's price at the replay's moment and its change from the day before. Real candles of Thu 1 Oct 2026.
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 2; C.tfs = [15, 15, 5, 240]; C.syms = [null, 'XAUUSD']; C.wl = null; C.stopPx = { EURUSD: 0.0012 }; C.speed = 0; C.ses = {}; C.max = true; C.mini = false; C.miniOff = {}; C.lv = {}; C.resume = null;
    C.mm = Object.assign({}, C.mm, { col: true, on: true, ord: 'market', maxDay: 0 });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    var pane = function (i) { return P._panes()[i]; };
    P._goto('10:30'); await W(400);
    var keys = function () { return P._panes().map(function (q) { return P._ps(q).sym.key; }).join(','); };
    var pills = function () { return Array.prototype.map.call(document.querySelectorAll('#stpr-grid .stpr-sympill'), function (b) { return b.textContent; }).join(','); };
    var waitKeys = async function (want) { for (var j = 0; j < 100 && keys() !== want; j++) await W(100); await W(300); };

    // ---- a symbol per chart ----
    ok('two charts: chart 1 EURUSD, chart 2 on the gold saved for it, at the same moment', keys() === 'EURUSD,XAUUSD' && !!(P._s().side || {}).XAUUSD && pane(1).n > 10, keys());
    ok('each chart has its own symbol button', pills() === 'EURUSD,XAUUSD', pills());
    document.querySelectorAll('#stpr-grid .stpr-sympill')[1].click(); await W(250);
    var m2 = document.querySelector('#stpr-menu.show');
    ok('chart 2\'s button opens the watchlist for chart 2', m2 && /Chart 2 · watchlist/.test(m2.textContent) && !!m2.querySelector('.stpr-wlr[data-sym="EURUSD"][data-si="1"]') && /open it on chart 2/.test(document.getElementById('stpr-wlf').textContent), m2 && m2.textContent.slice(0, 80));
    m2.querySelector('.stpr-wlr[data-sym="EURUSD"][data-si="1"]').click(); await waitKeys('EURUSD,EURUSD');
    ok('...EURUSD there puts chart 2 back on chart 1\'s symbol', keys() === 'EURUSD,EURUSD' && !(C.syms || [])[1], [keys(), C.syms]);
    document.querySelectorAll('#stpr-grid .stpr-sympill')[1].click(); await W(250);
    document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="XAUUSD"][data-si="1"]').click(); await waitKeys('EURUSD,XAUUSD');
    ok('...and gold again: chart 2 alone, same day and moment', keys() === 'EURUSD,XAUUSD' && P._s().day === '2026-10-01' && pane(1).n > 10 && (C.syms || [])[1] === 'XAUUSD', [keys(), C.syms]);

    // ---- the watchlist at the top ----
    document.getElementById('stpr-sym').click(); await W(200);
    var menu = document.querySelector('#stpr-menu.show');
    ok('the symbol button opens the watchlist: Symbol, Last, Chg, Chg%', menu && /Watchlist/.test(menu.textContent) && /Symbol\s*Last\s*Chg\s*Chg%/.test(menu.querySelector('.stpr-wlc').textContent) && /open it on every chart/.test(document.getElementById('stpr-wlf').textContent), menu && menu.textContent.slice(0, 120));
    for (k = 0; k < 40 && !/\d\.\d{5}/.test((document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="EURUSD"]') || {}).textContent || ''); k++) await W(150);
    var er = document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="EURUSD"]'), gr = document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="XAUUSD"]');
    for (k = 0; k < 40 && !(gr && /\d,\d{3}\.\d{2}/.test(gr.textContent)); k++) { await W(150); gr = document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="XAUUSD"]'); }
    ok('EURUSD at 10:30: 1.12962, down from the day before (−0.29%), marked as the one on screen', er && /1\.12962/.test(er.textContent) && /−0\.29%/.test(er.textContent) && er.classList.contains('on'), er && er.textContent);
    ok('XAUUSD at 10:30: its price (gold\'s 2 decimals) and its change from the day before', gr && /\d,\d{3}\.\d{2}/.test(gr.textContent) && /[+−]\d+\.\d\d%/.test(gr.textContent), gr && gr.textContent);   // stored candles get refreshed: no fixed figure

    // ---- a symbol off and back on: the list is saved ----
    gr.querySelector('[data-wlx]').click(); await W(200);
    ok('× takes XAUUSD off the list (saved)', !document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="XAUUSD"]') && (C.wl || []).indexOf('XAUUSD') < 0 && (C.wl || []).indexOf('EURUSD') >= 0, C.wl);
    document.querySelector('#stpr-menu.show [data-wladd]').click(); await W(100);
    var q = document.getElementById('stpr-wlq'); q.value = 'xau'; q.dispatchEvent(new Event('input', { bubbles: true })); await W(150);
    var pick = document.querySelector('#stpr-menu.show [data-wlpick="XAUUSD"]');
    ok('+ finds it among the stored symbols ("xau")', !!pick && /stored history/.test(pick.textContent), pick && pick.textContent);
    pick.click(); await W(300);
    ok('picked: back on the list', !!document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="XAUUSD"]') && (C.wl || []).indexOf('XAUUSD') >= 0, C.wl);

    // ---- the top button: every chart ----
    document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="XAUUSD"]').click(); await waitKeys('XAUUSD,XAUUSD');
    ok('the top button\'s XAUUSD turns every chart to gold, on the same day', keys() === 'XAUUSD,XAUUSD' && P._s().day === '2026-10-01' && pane(0).n > 10 && pane(1).n > 10 && !(C.syms || []).some(Boolean), [keys(), P._s().day, C.syms]);
    ok('gold\'s prices read with its own decimals', pane(0).series.options().priceFormat.precision === P._s().digits && P._s().digits < 5, P._s().digits);

    // ---- chart 1's own button: chart 1 alone ----
    document.querySelectorAll('#stpr-grid .stpr-sympill')[0].click(); await W(250);
    var m1 = document.querySelector('#stpr-menu.show');
    ok('chart 1\'s button opens the watchlist for chart 1', m1 && /Chart 1 · watchlist/.test(m1.textContent), m1 && m1.textContent.slice(0, 60));
    m1.querySelector('.stpr-wlr[data-sym="EURUSD"][data-si="0"]').click(); await waitKeys('EURUSD,XAUUSD');
    ok('...EURUSD there changes chart 1 only: chart 2 keeps gold', keys() === 'EURUSD,XAUUSD', keys());

    // ---- more charts follow chart 1 ----
    await P._layout(4); for (k = 0; k < 80 && !(P._panes().length === 4 && pane(3).n); k++) await W(100); await W(300);
    ok('4 charts: the new ones follow chart 1, chart 2 keeps gold', keys() === 'EURUSD,XAUUSD,EURUSD,EURUSD', keys());
    await P._layout(1); for (k = 0; k < 60 && P._panes().length !== 1; k++) await W(100); await W(200);
    ok('one chart: no per-chart symbol button (the top one is enough)', document.querySelectorAll('#stpr-grid .stpr-sympill').length === 0);
    ok('Random day is gone from the bar', !document.getElementById('stpr-rand') && !!document.getElementById('stpr-today'));
    var sb = document.getElementById('stpr-sym').getBoundingClientRect(), cb = document.getElementById('stpr-chip').getBoundingClientRect();
    ok('PRACTICE is exactly as tall as the symbol button beside it', Math.abs(sb.height - cb.height) < 0.5 && Math.abs(sb.top - cb.top) < 1, [sb.height, cb.height, sb.top, cb.top]);
    ok('no page errors', !errs.length, errs.slice(0, 4));
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k2) { return /^st_practice/.test(k2); }).forEach(function (k2) { localStorage.removeItem(k2); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
