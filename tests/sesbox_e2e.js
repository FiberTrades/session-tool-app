(async function () {
  // The Minimalist's session box while the session runs (Nestor, 20 Oct 2026: "can this edge of the box be 1 candles width apart from
  // the live candle so it doent disrupt the vision of live price?"): with Pre-fill off, a running session's box ends a candle's width
  // past the live candle; a finished one still ends half a candle past its last candle. Measured from the overlay's strokeRect calls.
  // Real stored EUR/USD candles, Replay of Thu 1 Oct 2026. Run: python tests/browser_test.py tests/sesbox_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [5, 15, 60, 240]; C.look = {}; C.mini = true; C.miniS = { prefill: false }; C.miniLink = true; C.max = true; C.news = false; C.cmp = []; C.ctf = [];
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 120 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    async function boxAt(at) {
      P._goto(at); await W(1500);
      var p = P._panes()[0]; p.chart.timeScale().setVisibleLogicalRange({ from: p.n - 40, to: p.n + 8 }); await W(900);
      var rec = [], orig = CanvasRenderingContext2D.prototype.strokeRect;
      CanvasRenderingContext2D.prototype.strokeRect = function (x, y, w, h) { rec.push([x, y, w, h]); return orig.apply(this, arguments); };
      p.chart.timeScale().scrollToPosition(p.chart.timeScale().scrollPosition() + 0.001, false); await W(700);
      CanvasRenderingContext2D.prototype.strokeRect = orig;
      var ts = p.chart.timeScale(), xl = ts.logicalToCoordinate(p.n - 1), sp = xl - ts.logicalToCoordinate(p.n - 2);
      var vis = rec.filter(function (r) { return r[2] > 20 && r[2] < 30 * sp && r[3] > 5 && r[0] + r[2] > 0 && r[0] < xl; }).map(function (r) { return { x0: r[0], x1: r[0] + r[2] }; });   // a session box (not the wider range zone)
      return { xl: xl, sp: sp, box: vis[vis.length - 1] || null };
    }
    var a = await boxAt('08:45');
    ok('London still running (08:45, Pre-fill off): its box ends a candle\'s width past the live candle (about 1.5 candles from its middle)', a.box && a.box.x1 - a.xl > a.sp * 1.3 && a.box.x1 - a.xl < a.sp * 1.8, a.box && [Math.round(a.box.x1 - a.xl), +a.sp.toFixed(1)]);
    var b = await boxAt('11:30');
    ok('London over (11:30): its box still ends just past its last candle, far from the live one', b.box && b.box.x1 < b.xl - b.sp * 5, b.box && [Math.round(b.box.x1), Math.round(b.xl)]);
    try { P.close(); } catch (e) {}
  } catch (e2) { ok('test ran', false, String(e2 && e2.stack || e2)); }
  return JSON.stringify(out);
})()
