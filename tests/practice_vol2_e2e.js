(async function () {
  // TradingView's VOLUME-BASED tools (Nestor, 26 Oct 2026: "i need all these"): Anchored VWAP, Fixed range volume profile, Anchored volume
  // profile - on the candles' own volume (candles.v), the profile being the Session Indicator's (its rows and POC vote).
  // Run: python tests/browser_test.py tests/practice_vol2_e2e.js
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
    var hit = function (x, y) { return P._hit(0, x, y) || {}; };
    // what one repaint wrote and drew in red (the POC)
    var paint = function () { var tx = [], red = [], F = CanvasRenderingContext2D.prototype.fillText, LT = CanvasRenderingContext2D.prototype.lineTo, fills = 0, FR = CanvasRenderingContext2D.prototype.fillRect;
      CanvasRenderingContext2D.prototype.fillText = function (t) { tx.push(String(t)); return F.apply(this, arguments); };
      CanvasRenderingContext2D.prototype.lineTo = function (x, y) { if (String(this.strokeStyle).toLowerCase() === '#f23645') red.push(y); return LT.apply(this, arguments); };
      CanvasRenderingContext2D.prototype.fillRect = function () { fills++; return FR.apply(this, arguments); };
      try { DW.ver = (DW.ver || 0) + 1; P._drawOv(0); } finally { CanvasRenderingContext2D.prototype.fillText = F; CanvasRenderingContext2D.prototype.lineTo = LT; CanvasRenderingContext2D.prototype.fillRect = FR; } return { tx: tx, red: red, fills: fills }; };
    var B = pane.bars, n = pane.n, xb = function (L) { return pane.chart.timeScale().logicalToCoordinate(L); }, yb = function (pr) { return pane.series.priceToCoordinate(pr); };
    // each candle's volume, known here
    pane.vols = B.map(function (b, i) { return 100 + ((i * 37) % 50); }); var V = pane.vols;

    var grp = tools.querySelector('.stpr-tg[data-grp="fore"]'), hd = Array.prototype.map.call(grp.querySelectorAll('.stpr-tfh'), function (h) { return h.textContent; }).join('|'), names = Array.prototype.map.call(grp.querySelectorAll('[data-tool]'), function (b) { return b.getAttribute('data-tool'); }).join(',');
    ok('Volume-based in the Forecasting menu: Anchored VWAP, Fixed range volume profile, Anchored volume profile', /Forecasting\|Volume-based/.test(hd) && names.indexOf('avwap,frvp,avp') > 0, [hd, names]);

    // Anchored VWAP from a candle 40 back
    DW.list = []; DW.sel = null; P._props();
    var La = n - 40, vw = await drawN('avwap', [[xb(La), yb(B[La].low) + 30]]);
    var pv = 0, vv = 0; for (var L = La; L < n; L++) { var tp = (B[L].high + B[L].low + B[L].close) / 3; pv += tp * V[L]; vv += V[L]; }
    var exp = (pv / vv).toFixed(5), r1 = paint();
    ok('Anchored VWAP: one click on a candle; from it on, each candle\'s (H+L+C)/3 weighted by its volume - its value now on its tag', vw && vw.type === 'avwap' && DW.tool === 'none' && r1.tx.indexOf('VWAP ' + exp) >= 0, [exp, r1.tx.filter(function (t) { return /VWAP/.test(t); })]);
    var mid = La + 20, pv2 = 0, vv2 = 0; for (L = La; L <= mid; L++) { pv2 += (B[L].high + B[L].low + B[L].close) / 3 * V[L]; vv2 += V[L]; }
    ok('its line takes the mouse where it runs', hit(xb(mid), yb(pv2 / vv2)).i === DW.list.indexOf(vw) && hit(xb(La), yb((B[La].high + B[La].low + B[La].close) / 3)).part === 'a', hit(xb(mid), yb(pv2 / vv2)));

    // Fixed range volume profile
    DW.list = []; var Fa = n - 60, Fb = n - 20, fv = await drawN('frvp', [[xb(Fa), yb(B[Fa].high)], [xb(Fb), yb(B[Fb].low)]]);
    var ref = P._vpCalc(B, V, Fa, Fb + 1, { vpRows: 24, vpSig: 1 }), r2 = paint();
    ok('Fixed range volume profile: two clicks; 24 rows over the candles between them, the POC the Session Indicator\'s, in red across', fv && fv.type === 'frvp' && r2.fills >= 24 && r2.red.some(function (y) { return Math.abs(y - (Math.round(yb(ref.poc)) + 0.5)) < 0.6; }), [r2.fills, r2.red.slice(0, 3), yb(ref.poc)]);
    ok('its range takes the mouse', hit(xb(Fa + 5), yb(ref.poc)).i === DW.list.indexOf(fv) && !hit(xb(Fb + 8), yb(ref.poc)).part, hit(xb(Fa + 5), yb(ref.poc)));
    // a candle with no volume: it says why, as the Session Indicator's profile does
    var keep = V[Fa + 3]; V[Fa + 3] = null; var r3 = paint(); V[Fa + 3] = keep;
    ok('a candle in it with no volume yet: it says why (here: sign in for the volume)', r3.tx.some(function (t) { return /^Volume profile: sign in for the volume$/.test(t); }), r3.tx.filter(function (t) { return /Volume/.test(t); }));
    // Anchored volume profile: from a candle to the last
    DW.list = []; var Aa = n - 30, av = await drawN('avp', [[xb(Aa), yb(B[Aa].low)]]);
    var ref2 = P._vpCalc(B, V, Aa, n, { vpRows: 24, vpSig: 1 }), r4 = paint();
    ok('Anchored volume profile: one click; from that candle to the last, its POC in red', av && av.type === 'avp' && DW.tool === 'none' && r4.red.some(function (y) { return Math.abs(y - (Math.round(yb(ref2.poc)) + 0.5)) < 0.6; }), [r4.red.slice(0, 3), yb(ref2.poc)]);
    ok('it reaches the last candle', hit(xb(n - 2), yb(ref2.poc)).i === DW.list.indexOf(av));
    DW.list.push(vw, fv); var raw = JSON.stringify(DW.list.map(function (d) { return d.type; }));
    ok('all kept with the symbol\'s drawings', ['avwap', 'frvp', 'avp'].every(function (t) { return raw.indexOf('"' + t + '"') >= 0; }), raw);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
