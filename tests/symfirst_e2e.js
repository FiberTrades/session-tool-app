(async function () {
  // The chart's symbol button stays left of the EA panel when the other charts are in windows of their own (Nestor, 22 Oct 2026:
  // "why did you change this around? move them back"). With several charts here: [timeframe][symbol] then the panel; with one
  // chart left here (the rest in their own windows) the timeframe goes to the top bar and the symbol came AFTER the panel. Back
  // Testing (the same engine as Live Charts), real EUR/USD, Thu 1 Oct 2026; a real second window (chart.html).
  // Run: python tests/browser_test.py tests/symfirst_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var win = null;
  var order = function () { var tl = document.getElementById('stpr-tl'); return tl ? Array.prototype.map.call(tl.children, function (c) {
    if (c.id === 'stpr-mm') return 'panel'; if (c.querySelector && c.querySelector('.stpr-sympill')) return 'symbol' + (c.querySelector('.stpr-tfpill') ? '+tf' : ''); if (c.classList.contains('stpr-ptfw')) return 'ohlc'; return c.offsetWidth ? c.className : null; }).filter(Boolean) : []; };
  var left = function (sel) { var e = document.querySelector('#stpr-tl ' + sel); return e && e.offsetWidth ? Math.round(e.getBoundingClientRect().left) : null; };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 2; C.lv = {}; C.tfs = [15, 60, 240, 5]; C.look = {}; C.mini = false; C.max = true; C.resume = null; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    await W(500);
    var o1 = order();
    ok('two charts here: the timeframe and the symbol, then the panel', o1[0] === 'symbol+tf' && o1.indexOf('panel') === 1, o1);
    P._panes()[1].el.querySelector('[data-popc]').click();
    for (k = 0; k < 120 && !(P._pops()[1] && P._pops()[1].ready && P._panes()[1] && P._panes()[1].el.ownerDocument !== document && P._panes()[1].n); k++) await W(100);
    win = P._pops()[1] && P._pops()[1].w; await W(800);
    // since 22 Oct 2026 (Nestor: "as the main chart already has an asset picker at the top shall we get rid of the one from the chart?
    // and move the EA left?"): chart 1 alone here has no symbol button of its own, the panel takes its place
    var o2 = order(), lp = left('#stpr-mm'), pl = Math.round(P._panes()[0].el.getBoundingClientRect().left);
    ok('chart 2 in its own window, one chart left here: no symbol button on chart 1 (the top one is its), the panel first, at the left', o2[0] === 'panel' && !document.querySelector('#stpr-tl .stpr-sympill') && lp != null && lp - pl < 20, [o2, lp, pl]);
    ok('...its timeframe in the top bar', !!document.querySelector('#stpr-maintf .stpr-tfpill'));
    ok('...the top symbol button is there', !!document.getElementById('stpr-sym') && document.getElementById('stpr-sym').offsetWidth > 0);
    ok('...chart 2\'s window keeps its own symbol button (no top one there)', !!(win && win.document.querySelector('.stpr-sympill[data-psym="1"]')));
    P._unpop(1); for (k = 0; k < 80 && !(P._panes()[1] && P._panes()[1].el.ownerDocument === document && P._panes()[1].n); k++) await W(100); await W(400); win = null;
    var o3 = order();
    ok('chart 2 back here: chart 1\'s timeframe and symbol again, then the panel', o3[0] === 'symbol+tf' && o3.indexOf('panel') === 1, o3);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { if (win) win.close(); } catch (e) {}
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
