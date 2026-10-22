(async function () {
  // The Minimalist's range-zone height (the number right of its middle line) goes with its zone (Nestor, 22 Oct 2026: "why is this
  // number travelling with the chart drag?" - it was held at the chart's right edge when the zone's end went off it). Back Testing,
  // real EUR/USD, Thu 1 Oct 2026. What the chart's overlay writes is recorded.
  // Run: python tests/browser_test.py tests/zonelbl_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var fill0 = CanvasRenderingContext2D.prototype.fillText, rec = [];
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.look = {}; C.mini = true; C.miniOff = {}; C.miniS = {}; C.max = true; C.resume = null; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('12:00'); await W(600);
    var p = P._panes()[0], pw = p.chart.timeScale().width();
    CanvasRenderingContext2D.prototype.fillText = function (t, x, y) { rec.push({ t: String(t), x: x, y: y }); return fill0.apply(this, arguments); };
    var draw = async function () { rec = []; p._sig = null; P._render(); await W(250); return p._mz; };
    var mz = await draw();
    var near = function (z) { return rec.filter(function (r) { return /^\d+(\.\d+)?$/.test(r.t) && Math.abs(r.y - (z.y0 + z.y1) / 2) < 2; }); };
    var at = mz ? near(mz) : [];
    ok('the zone on screen: its height written just right of its end, level with its middle', mz && at.length >= 1 && at.every(function (r) { return Math.abs(r.x - at[0].x) < 0.5; }) && Math.abs(at[0].x - (mz.x1 + 4)) < 1, [mz, at, pw]);
    // drag the chart back in time until the zone's end is past the right edge
    for (var s = 0; s < 12 && mz && mz.x1 <= pw + 5; s++) { p.chart.timeScale().scrollToPosition(p.chart.timeScale().scrollPosition() - 30, false); await W(200); mz = await draw(); }
    var gone = mz ? near(mz) : [];
    ok('dragged until the zone\'s end is off the right of the chart: the number goes with it (not held at the edge)', mz && mz.x1 > pw && gone.length === 0, [mz, gone, pw]);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  CanvasRenderingContext2D.prototype.fillText = fill0;
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
