(async function () {
  // The previous day's / week's / month's labels (PDH, PDL, PWH ...) go with their lines (Nestor, 22 Oct 2026: asked whether they should
  // also stop sticking to the right edge, as the zone's number did: "yes stop them too"). Back Testing, real EUR/USD, Thu 1 Oct 2026.
  // What the chart's overlay writes is recorded.
  // Run: python tests/browser_test.py tests/pdhlbl_e2e.js
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
    var p = P._panes()[0], ts = p.chart.timeScale(), pw = ts.width();
    CanvasRenderingContext2D.prototype.fillText = function (t, x, y) { rec.push({ t: String(t), x: x, y: y }); return fill0.apply(this, arguments); };
    var draw = async function () { rec = []; p._sig = null; p._mini = null; P._render(); await W(250); return rec.filter(function (r) { return /^PDH/.test(r.t); }); };
    // first the label's line end on the chart: zoom in a little to the left until it is
    var a = await draw();
    for (var s = 0; s < 10 && !a.length; s++) { ts.scrollToPosition(ts.scrollPosition() + 20, false); await W(200); a = await draw(); }
    ok('PDH on the chart: written right of its line\'s end, inside the chart', a.length >= 1 && a[0].x < pw, [a, pw]);
    var x0 = a.length ? a[0].x : null;
    ts.scrollToPosition(ts.scrollPosition() - 3, false); await W(200); var b = await draw();
    var bar = ts.options().barSpacing;
    ok('the chart dragged 3 candles: the label moved with it (not held at the right edge), or went off with its line', b.length === 0 || (x0 != null && b[0].x - x0 > 2 * bar), [x0, b.length ? b[0].x : null, bar]);
    for (s = 0; s < 15 && b.length; s++) { ts.scrollToPosition(ts.scrollPosition() - 15, false); await W(200); b = await draw(); }
    ok('dragged until the line\'s end is off the right of the chart: PDH and PDL go with it', b.length === 0 && !rec.some(function (r) { return /^P[DWM][HL]/.test(r.t); }), [b, rec.filter(function (r) { return /^P[DWM][HL]/.test(r.t); }).slice(0, 3)]);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  CanvasRenderingContext2D.prototype.fillText = fill0;
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
