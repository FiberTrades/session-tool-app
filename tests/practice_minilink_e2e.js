(async function () {
  // Practice Replay: the Minimalist linked on every chart, or unlinked so each chart has its own settings and P/D zone (Nestor,
  // 17 Oct 2026: "the option to link all minimalist indicators in all 4 charts but also to be able to unlink them so each chart
  // can have their own settings if i want to and different P/D zones marked"). Real EUR/USD, Wed 14 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_minilink_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 2; C.lv = { 2: 'h' }; C.tfs = [15, 60, 240, 5]; C.mini = true; C.miniS = {}; C.miniOff = {}; delete C.miniLink; C.miniPer = {}; C.miniOffPer = {}; C.max = true; C.resume = null; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-14' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    P._goto('16:00'); await W(500);
    var p0 = function () { return P._panes()[0]; }, p1 = function () { return P._panes()[1]; }, dlg = function () { return document.querySelector('.stpr-dlg'); };
    P._miniDialog(null, p1()); await W(80);
    var lk = dlg().querySelector('[data-k="mlink"]');
    ok('two charts: its window offers "Same settings on every chart", ticked (linked, as before)', lk && lk.checked && /Same settings on every chart/.test(dlg().textContent) && /^Minimalist\s*×?/.test(dlg().querySelector('.stpr-dlgh b').textContent) && dlg().querySelector('.stpr-dlgh b').textContent === 'Minimalist');
    lk.click(); await W(80);
    ok('unticked: each chart gets its own copy, and this window says it is chart 2 (1h)', C.miniLink === false && C.miniPer && C.miniPer[0] && C.miniPer[1] && /chart 2 · 1h/.test(dlg().querySelector('.stpr-dlgh b').textContent) && !dlg().querySelector('[data-k="mlink"]').checked, dlg().querySelector('.stpr-dlgh b').textContent);
    var len = dlg().querySelector('[data-k="len"]'); len.value = '50'; len.dispatchEvent(new Event('input', { bubbles: true })); await W(30);
    dlg().querySelector('[data-dok]').click(); await W(60);
    ok('chart 2 changed (Structure Length 50): chart 1 keeps its own (30)', P._ms(p1()).len === 50 && P._ms(p0()).len === 30, [P._ms(p0()).len, P._ms(p1()).len]);
    // chart 1: its P/D zone off; chart 2 keeps its zone
    P._miniDialog(null, p0()); await W(80);
    ok('opened for chart 1: it says so', /chart 1 · 15m/.test(dlg().querySelector('.stpr-dlgh b').textContent), dlg().querySelector('.stpr-dlgh b').textContent);
    dlg().querySelector('[data-k="part.zone"]').click(); await W(30); dlg().querySelector('[data-dok]').click(); await W(60);
    P._miniFresh(); P._render(); await W(250);
    ok('chart 1 without its zone, chart 2 still with its own', C.miniOffPer[0].zone === true && !C.miniOffPer[1].zone && p0()._mz == null && p1()._mz != null, [p0()._mz, !!p1()._mz]);
    // linked again from chart 2: its settings become everyone's
    P._miniDialog(null, p1()); await W(80);
    dlg().querySelector('[data-k="mlink"]').click(); await W(80);
    dlg().querySelector('[data-dok]').click(); await W(60);
    P._miniFresh(); P._render(); await W(250);
    ok('ticked again (from chart 2): linked, every chart has chart 2\'s settings and its zone', C.miniLink === true && P._ms(p0()).len === 50 && P._ms(p1()).len === 50 && !C.miniOff.zone && p0()._mz != null && p1()._mz != null, [P._ms(p0()).len, P._ms(p1()).len, !!p0()._mz]);
    // one chart: no link row (nothing to link)
    await P._layout(1); await W(300); P._miniDialog(null, p0()); await W(80);
    ok('one chart: no link switch', !dlg().querySelector('[data-k="mlink"]'));
    dlg().querySelector('[data-dc]').click(); await W(40);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
