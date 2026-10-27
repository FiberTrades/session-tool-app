(async function () {
  // TradingView's MEASURERS (Nestor, 26 Oct 2026: "they must measure in both directions, for time and candles"): Price range (the move in
  // pips or points and per cent), Date range (the candles, the time and their volume), Date and price range (the Measure, renamed).
  // Signed both ways: drawn down or to the left they read negative.
  // Run: python tests/browser_test.py tests/practice_meas2_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stDrawBar); i++) await W(100); await W(800);
    var P = window.__stPractice; try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.mini = false; C.news = false; C.dtpl = {}; C.ddef = {};
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(600);
    var DW = P._dr(), pane = P._panes()[0], ch = pane.el.querySelector('.stpr-pc'), tools = document.getElementById('stpr-tools');
    var mev = function (t, xx, yy, o) { var r = ch.getBoundingClientRect(); ch.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mouseup' || t === 'mousemove' ? 0 : 1, view: window }, o || {}))); };
    var click = function (x, y) { mev('mousedown', x, y); mev('mouseup', x, y); };
    var pick = async function (t) { if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); if (DW.tool !== t) tools.querySelector('[data-tool="' + t + '"]').click(); await W(40); };
    var drawN = async function (t, pts) { await pick(t); for (var j = 0; j < pts.length; j++) { if (j) { mev('mousemove', pts[j][0], pts[j][1], { buttons: 1 }); await W(25); } click(pts[j][0], pts[j][1]); await W(40); } await W(80); return DW.list[DW.list.length - 1]; };
    var texts = function () { var got = [], F = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { got.push(String(t)); return F.apply(this, arguments); }; try { DW.ver = (DW.ver || 0) + 1; P._drawOv(0); } finally { CanvasRenderingContext2D.prototype.fillText = F; } return got; };
    var hit = function (x, y) { return P._hit(0, x, y) || {}; };
    var B = pane.bars, n = pane.n, xb = function (L) { return pane.chart.timeScale().logicalToCoordinate(L); }, yb = function (pr) { return pane.series.priceToCoordinate(pr); };
    var mn = '−';

    var grp = tools.querySelector('.stpr-tg[data-grp="fore"]'), names = Array.prototype.map.call(grp.querySelectorAll('[data-tool]'), function (b) { return b.getAttribute('data-tool'); }).join(',');
    var lbl = function (t) { var b = grp.querySelector('[data-tool="' + t + '"] span'); return b ? b.textContent : ''; };
    ok('Measurers, as TradingView\'s: Price range, Date range, Date and price range', /prange,drange,range$/.test(names) && lbl('prange') === 'Price range' && lbl('drange') === 'Date range' && lbl('range') === 'Date and price range', [names, lbl('range')]);

    // Price range, up then down
    DW.list = []; DW.sel = null; P._props();
    var L0 = n - 40, L1 = n - 30, p0 = B[L0].close, up = await drawN('prange', [[xb(L0), yb(p0)], [xb(L1), yb(p0) - 60]]);
    var t1 = texts().filter(function (t) { return /pips/.test(t); });
    ok('Price range drawn up: the move in pips and per cent, positive', up.type === 'prange' && t1.length === 1 && /^\+\d+\.\d pips\s+\(\+\d\.\d\d%\)$/.test(t1[0]), t1);
    var dn = await drawN('prange', [[xb(L0 + 2), yb(p0)], [xb(L1 + 2), yb(p0) + 60]]), t2 = texts().filter(function (t) { return /pips/.test(t); });
    ok('drawn down: negative', t2.some(function (t) { return new RegExp('^' + mn + '\\d+\\.\\d pips\\s+\\(' + mn + '\\d\\.\\d\\d%\\)$').test(t); }), t2);
    var ua = { x: xb(L0), y: pane.series.priceToCoordinate(up.a.price) };
    ok('its points are handles, its band takes the mouse', hit(ua.x, ua.y).part === 'a' && hit(xb(L0 + 5), (yb(up.a.price) + yb(up.b.price)) / 2).i === DW.list.indexOf(up));
    // Date range, right then left, with the candles' volume
    DW.list = []; pane.vols = B.map(function (b, j) { return 100 + j; });
    var D0 = n - 50, D1 = n - 26, dr = await drawN('drange', [[xb(D0), yb(B[D0].close)], [xb(D1), yb(B[D0].close) + 20]]);
    var vs = 0; for (var j = D0; j <= D1; j++) vs += pane.vols[j]; var vt = vs >= 1e3 ? (vs / 1e3).toFixed(1) + 'K' : String(vs);
    var t3 = texts();
    ok('Date range drawn to the right: the candles and the time, positive - and their volume', dr.type === 'drange' && t3.some(function (t) { return /^24 bars,\s+6h$/.test(t); }) && t3.indexOf('Vol ' + vt) >= 0, [t3.filter(function (t) { return /bars|Vol/.test(t); }), vt]);
    var dl = await drawN('drange', [[xb(D1), yb(B[D1].close) + 40], [xb(D0), yb(B[D1].close) + 50]]);
    ok('drawn to the left: negative candles and time', texts().some(function (t) { return new RegExp('^' + mn + '24 bars,\\s+' + mn + '6h$').test(t); }), texts().filter(function (t) { return /bars/.test(t); }));
    pane.vols[D0 + 3] = null;
    ok('a candle in it with no volume yet: no volume shown (never a wrong one)', !texts().some(function (t) { return /^Vol /.test(t); }));
    // Date and price range: the Measure, both ways
    DW.list = []; var dp = await drawN('range', [[xb(D1), yb(B[D1].close)], [xb(D0), yb(B[D1].close) + 50]]), t4 = texts();
    ok('Date and price range drawn down and to the left: negative pips, candles and time', dp.type === 'range' && t4.some(function (t) { return t.indexOf(mn) >= 0 && /pips/.test(t); }) && t4.some(function (t) { return new RegExp(mn + '24').test(t); }), t4.filter(function (t) { return /pips|bars|\d[hm]/.test(t); }));
    DW.list.push(up, dn, dr, dl); var raw = JSON.stringify(DW.list.map(function (d) { return d.type; }));
    ok('all kept with the symbol\'s drawings', ['prange', 'drange', 'range'].every(function (t) { return raw.indexOf('"' + t + '"') >= 0; }), raw);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
