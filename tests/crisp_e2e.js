(async function () {
  // Crisp chart drawing (Nestor, 27 Nov 2026: "in tradingview everything looks sharper and more crisp" - "yes do it"). crisp.js puts the
  // charts' own lines and boxes on whole screen pixels, as TradingView does. Read from the canvas's own pixels (a screenshot at 125% is
  // not trustworthy in the test browser): at 100%, 125%, 150% and 200%, a 1px line is whole pixels at full strength, never smeared over
  // two or three; box edges, thin fills, a fill then a stroke on one path; curves left as drawn. Then the real charts' overlay (a flat
  // trend line on Live Charts) and the hawk's chart canvas.
  // Run: python tests/browser_test.py tests/crisp_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message) + ' @' + (e.filename || '') + ':' + e.lineno); });
  try {
    ok('crisp.js is loaded with the app', typeof window.__stCrisp === 'function' && typeof window.__stCrispFit === 'function', typeof window.__stCrisp);
    // a canvas at a given pixel ratio: what the screen would show, pixel for pixel
    var mk = function (k, crisp) { var c = document.createElement('canvas'); c.width = Math.round(200 * k); c.height = Math.round(120 * k); var g = c.getContext('2d'); if (crisp) window.__stCrisp(g); g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, 200, 120); return g; };
    var col = function (g, x, y0, y1) { var d = g.getImageData(x, y0, 1, y1 - y0).data, a = []; for (var i = 3; i < d.length; i += 4) a.push(d[i]); return a; };
    var row = function (g, y, x0, x1) { var d = g.getImageData(x0, y, x1 - x0, 1).data, a = []; for (var i = 3; i < d.length; i += 4) a.push(d[i]); return a; };
    var lit = function (a) { return a.filter(function (v) { return v > 8; }); };
    var solid = function (a, n) { var l = lit(a); return l.length === n && l.every(function (v) { return v === 255; }); };
    [1, 1.25, 1.5, 2].forEach(function (k) {
      var n = Math.max(1, Math.round(k)), y = 33.37, x = 47.61;
      var g = mk(k, true); g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); g.moveTo(10, y); g.lineTo(150, y); g.moveTo(x, 50); g.lineTo(x, 110); g.stroke();
      var a = col(g, Math.round(100 * k), Math.round((y - 4) * k), Math.round((y + 4) * k)), b = row(g, Math.round(80 * k), Math.round((x - 4) * k), Math.round((x + 4) * k));
      var g0 = mk(k, false); g0.strokeStyle = '#fff'; g0.lineWidth = 1; g0.beginPath(); g0.moveTo(10, y); g0.lineTo(150, y); g0.stroke();
      var a0 = col(g0, Math.round(100 * k), Math.round((y - 4) * k), Math.round((y + 4) * k));
      ok(k * 100 + '%: a 1px level line and an upright one are ' + n + ' screen pixel' + (n > 1 ? 's' : '') + ' at full strength (before: ' + lit(a0).length + ' pixels, ' + Math.max.apply(null, a0) + '/255 at most)',
        solid(a, n) && solid(b, n) && !solid(a0, n), [a, b, a0]);
      // a box (strokeRect, as the Rectangle tool draws it) and a rect path filled then stroked
      var g2 = mk(k, true); g2.strokeStyle = '#fff'; g2.lineWidth = 1; g2.strokeRect(20.3, 20.7, 60.4, 40.2);
      g2.beginPath(); g2.rect(110.45, 20.2, 50.3, 40.6); g2.fillStyle = 'rgba(255,255,255,0.1)'; g2.fill(); g2.stroke();
      var t1 = col(g2, Math.round(50 * k), Math.round(16 * k), Math.round(25 * k)), t2 = col(g2, Math.round(135 * k), Math.round(16 * k), Math.round(25 * k)).map(function (v) { return v > 40 ? v : 0; });
      ok(k * 100 + '%: box edges whole pixels, a filled box\'s outline too', solid(t1, n) && lit(t2).length === n && lit(t2).every(function (v) { return v === 255; }), [t1, t2]);
      // a thin fill (a wick or a time mark drawn with fillRect, 1 css px): the same width wherever it lands
      var g3 = mk(k, true); g3.fillStyle = '#fff'; var ws = [];
      for (var i = 0; i < 8; i++) { var xx = 10 + i * 13.37; g3.fillRect(xx, 10, 1, 50); ws.push(lit(row(g3, Math.round(30 * k), Math.floor(xx * k) - 2, Math.floor(xx * k) + 4)).length); }
      ok(k * 100 + '%: 1px fills (wicks, marks) all the same width', ws.every(function (v) { return v === ws[0]; }) && ws[0] === Math.max(1, Math.round(k)), ws);
    });
    // a path stroked in two parts, then filled: the fill covers both parts (never only the last)
    var gf = mk(1, true); gf.strokeStyle = '#fff'; gf.fillStyle = '#fff'; gf.beginPath(); gf.rect(10.3, 10.3, 30, 30); gf.stroke(); gf.rect(60.3, 10.3, 30, 30); gf.stroke(); gf.fill();
    ok('a path stroked in parts, then filled: both parts filled', gf.getImageData(25, 25, 1, 1).data[3] === 255 && gf.getImageData(75, 25, 1, 1).data[3] === 255, [gf.getImageData(25, 25, 1, 1).data[3], gf.getImageData(75, 25, 1, 1).data[3]]);
    // a curve stays as drawn
    var gc = mk(1.25, true), gr = mk(1.25, false);
    [gc, gr].forEach(function (g) { g.strokeStyle = '#fff'; g.lineWidth = g === gr ? 0.8 : 1; g.beginPath();   // 0.8 x 1.25 = the one screen pixel crisp.js makes of it
      g.moveTo(10, 30.3); g.lineTo(60, 30.3); g.arc(80, 30.3, 20, Math.PI, 0); g.stroke(); });
    var dc = gc.getImageData(0, 0, 250, 150).data, dr = gr.getImageData(0, 0, 250, 150).data, same = true; for (var z = 0; z < dc.length; z++) if (dc[z] !== dr[z]) { same = false; break; }
    ok('a path with a curve in it keeps its shape exactly (only its width is whole screen pixels)', same, null);
    // the real charts: Live Charts, a flat trend line on chart 1's overlay
    window.__stPlatOff = false; window.__stLcForce = true;
    for (var w8 = 0; w8 < 200 && !(window.__stPractice && window.__stSB && window.__stDrawBar && window.__stReplay); w8++) await W(100);
    await W(800);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (q) { return /^st_practice/.test(q); }).forEach(function (q) { localStorage.removeItem(q); }); localStorage.removeItem('st_plat'); } catch (e) {}
    var C = P._cfg(); C.mm = Object.assign({}, C.mm, { col: true }); C.layout = 1; C.tfs = [15, 5, 60, 240]; C.mini = false; C.news = false; C.syms = []; C.resume = { sym: 'EURUSD', day: '2026-10-01' };
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    P._lv().mode = 'replay'; document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k2 = 0; k2 < 200 && !(P._s() && P._panes().length && P._panes()[0].n); k2++) await W(100); await W(1200);
    var pane = P._panes()[0], B = pane.bars, n2 = B.length, DW = P._dr(), ov = pane.ov;
    var hi = Math.max.apply(null, B.slice(-60).map(function (b) { return b.high; })), lo = Math.min.apply(null, B.slice(-60).map(function (b) { return b.low; })), pr = hi - (hi - lo) / 12;
    DW.list.push({ type: 'trend', a: { t: B[n2 - 55].time, price: pr }, b: { t: B[n2 - 20].time, price: pr }, color: '#00ff00', width: 1 });
    var probe = function () { var cx = ov.getContext('2d'), k = ov.width / parseFloat(ov.style.width), x = Math.round(P._xOfT(0, B[n2 - 37].time) * k), y = Math.round(P._yOf(0, pr) * k), d = cx.getImageData(x, y - 4, 1, 9).data, a = []; for (var i = 1; i < d.length; i += 4) a.push(d[i]); return a; };
    P._drawOv(0); await W(300); var on = probe();
    window.__stCrispOff = true; P._drawOv(0); await W(300); var off = probe(); window.__stCrispOff = false; P._drawOv(0); await W(200);
    ok('Live Charts: a flat trend line on the chart is one solid row (before: ' + lit(off).length + ' rows, ' + Math.max.apply(null, off) + '/255 at most)', lit(on).length === 1 && Math.max.apply(null, on) === 255, [on, off]);
    ok('...the overlay is a whole number of screen pixels, its bitmap the same (never stretched)', ov.width === Math.round(parseFloat(ov.style.width) * devicePixelRatio) && ov.height === Math.round(parseFloat(ov.style.height) * devicePixelRatio), [ov.width, ov.height, ov.style.width, ov.style.height]);
    ok('...its drawing context is the crisp one', ov.getContext('2d').__stCrisp === true, null);
    ok('no page errors', !errs.length, errs);
  } catch (e) { ok('no exception', false, String(e && e.stack || e).slice(0, 800)); }
  return JSON.stringify(out);
})()
