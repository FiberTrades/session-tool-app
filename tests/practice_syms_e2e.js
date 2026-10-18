(async function () {
  // Back Testing: ONE symbol on every chart, as in Live Charts (Nestor, 18 Oct 2026: "make back testing the same as live charts
  // in this regard"), up to 8 charts, and the watchlist inside the symbol button ("when you click on eurusd you see the
  // watchlist inside"): each symbol's price at the replay's moment and its change from the day before. Real candles of Thu 1 Oct 2026.
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

    // ---- one symbol on every chart ----
    ok('two charts, both EURUSD - a symbol saved for chart 2 before (gold) is no longer used', keys() === 'EURUSD,EURUSD' && Object.keys(P._s().side || {}).length === 0, keys());
    ok('no symbol button on each chart any more', document.querySelectorAll('#stpr-grid .stpr-sympill').length === 0);

    // ---- the watchlist ----
    document.getElementById('stpr-sym').click(); await W(200);
    var menu = document.querySelector('#stpr-menu.show');
    ok('the symbol button opens the watchlist: Symbol, Last, Chg, Chg%', menu && /Watchlist/.test(menu.textContent) && /Symbol\s*Last\s*Chg\s*Chg%/.test(menu.querySelector('.stpr-wlc').textContent), menu && menu.textContent.slice(0, 120));
    for (k = 0; k < 40 && !/\d\.\d{5}/.test((document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="EURUSD"]') || {}).textContent || ''); k++) await W(150);
    var er = document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="EURUSD"]'), gr = document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="XAUUSD"]');
    for (k = 0; k < 40 && !(gr && /\d,\d{3}\.\d{2}/.test(gr.textContent)); k++) { await W(150); gr = document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="XAUUSD"]'); }
    ok('EURUSD at 10:30: 1.12962, down from the day before (−0.29%), marked as the one on screen', er && /1\.12962/.test(er.textContent) && /−0\.29%/.test(er.textContent) && er.classList.contains('on'), er && er.textContent);
    ok('XAUUSD at 10:30: 4,189.54, up from the day before (+0.92%)', gr && /4,189\.54/.test(gr.textContent) && /\+0\.92%/.test(gr.textContent), gr && gr.textContent);
    ok('the note says when the prices are from', /Prices at 10:30/.test(document.getElementById('stpr-wlf').textContent), document.getElementById('stpr-wlf').textContent);

    // ---- a symbol off and back on: the list is saved ----
    gr.querySelector('[data-wlx]').click(); await W(200);
    ok('× takes XAUUSD off the list (saved)', !document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="XAUUSD"]') && (C.wl || []).join(',') === 'EURUSD', C.wl);
    document.querySelector('#stpr-menu.show [data-wladd]').click(); await W(100);
    var q = document.getElementById('stpr-wlq'); q.value = 'xau'; q.dispatchEvent(new Event('input', { bubbles: true })); await W(150);
    var pick = document.querySelector('#stpr-menu.show [data-wlpick="XAUUSD"]');
    ok('+ finds it among the stored symbols ("xau")', !!pick && /stored history/.test(pick.textContent), pick && pick.textContent);
    pick.click(); await W(300);
    ok('picked: back on the list', !!document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="XAUUSD"]') && (C.wl || []).indexOf('XAUUSD') >= 0, C.wl);

    // ---- a click turns every chart to it ----
    document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="XAUUSD"]').click();
    for (k = 0; k < 80 && keys() !== 'XAUUSD,XAUUSD'; k++) await W(100); await W(300);
    ok('clicking XAUUSD turns both charts to gold, on the same day', keys() === 'XAUUSD,XAUUSD' && P._s().day === '2026-10-01' && pane(0).n > 10 && pane(1).n > 10, [keys(), P._s().day]);
    ok('gold\'s prices read with its own decimals', pane(0).series.options().priceFormat.precision === P._s().digits && P._s().digits < 5, P._s().digits);

    // ---- more charts follow ----
    await P._layout(4); for (k = 0; k < 80 && !(P._panes().length === 4 && pane(3).n); k++) await W(100); await W(200);
    ok('4 charts: all on gold', keys() === 'XAUUSD,XAUUSD,XAUUSD,XAUUSD', keys());
    ok('no page errors', !errs.length, errs.slice(0, 4));
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k2) { return /^st_practice/.test(k2); }).forEach(function (k2) { localStorage.removeItem(k2); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
