(async function () {
  // TradingView's FORECASTING group (Nestor, 26 Oct 2026: "i need all these"): Long and Short position, Position forecast (Success once a
  // later candle reaches its target, Failure when its time passes first), Bars pattern (the candles between two points copied, to move),
  // Ghost feed (a path clicked point by point, drawn as candles), Sector (a slice of a circle).
  // Run: python tests/browser_test.py tests/practice_fore2_e2e.js
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
    var drag = async function (x0, y0, x1, y1) { mev('mousedown', x0, y0); mev('mousemove', (x0 + x1) / 2, (y0 + y1) / 2, { buttons: 1 }); await W(30); mev('mousemove', x1, y1, { buttons: 1 }); await W(30); mev('mouseup', x1, y1); await W(60); };
    var texts = function () { var got = [], F = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { got.push(String(t)); return F.apply(this, arguments); }; try { DW.ver = (DW.ver || 0) + 1; P._drawOv(0); } finally { CanvasRenderingContext2D.prototype.fillText = F; } return got; };
    var at = function (q) { return { x: P._xOfT(0, q.t), y: pane.series.priceToCoordinate(q.price) }; };
    var hit = function (x, y) { return P._hit(0, x, y) || {}; };
    var B = pane.bars, n = pane.n, xb = function (L) { return pane.chart.timeScale().logicalToCoordinate(L); }, yb = function (pr) { return pane.series.priceToCoordinate(pr); };

    var grp = tools.querySelector('.stpr-tg[data-grp="fore"]'), names = Array.prototype.map.call(grp.querySelectorAll('[data-tool]'), function (b) { return b.getAttribute('data-tool'); }).join(',');
    var lbl = function (t) { var b = grp.querySelector('[data-tool="' + t + '"] span'); return b ? b.textContent : ''; };
    ok('the Forecasting menu, as TradingView\'s: Long position, Short position, Position forecast, Bars pattern, Ghost feed, Sector', names.indexOf('long,short,posfc,barspat,ghost,sector') === 0 && lbl('posfc') === 'Position forecast' && lbl('ghost') === 'Ghost feed', names);

    // Position forecast: from a candle 30 back to one 6 back
    DW.list = []; DW.sel = null; P._props();
    var La = n - 30, Lb = n - 6, fc = await drawN('posfc', [[xb(La), yb(B[La].close)], [xb(Lb), yb(B[La].close) - 40]]);
    ok('Position forecast: two clicks, from a candle to its target', fc && fc.type === 'posfc' && Math.round(P._lOfT(0, fc.a.t)) === La && Math.round(P._lOfT(0, fc.b.t)) === Lb, fc && [P._lOfT(0, fc.a.t), La]);
    var hi = -Infinity, lo = Infinity; for (var L = La + 1; L <= Lb; L++) { hi = Math.max(hi, B[L].high); lo = Math.min(lo, B[L].low); }
    fc.b.price = hi - 0.00002; var tx = texts();
    ok('its tag: the move in pips and per cent, the candles and the time - and Success, as a later candle reached it in time', tx.some(function (t) { return /pips\s+\([+−]\d+\.\d\d%\)/.test(t); }) && tx.some(function (t) { return /\d+ bars,\s+\d/.test(t); }) && tx.indexOf('Success') >= 0, tx.filter(function (t) { return /pips|bars|Success|Failure/.test(t); }));
    fc.b.price = hi + 0.002; tx = texts();
    ok('a target no candle reached by its time: Failure', tx.indexOf('Failure') >= 0 && tx.indexOf('Success') < 0);
    fc.b.t = pane.times[n + 10] || fc.b.t; tx = texts();
    ok('its time still to come: neither yet', tx.indexOf('Failure') < 0 && tx.indexOf('Success') < 0 && tx.some(function (t) { return /pips/.test(t); }));
    var FA = at(fc.a), FB = at(fc.b);
    ok('its ends are handles, its line takes the mouse', hit(FA.x, FA.y).part === 'a' && hit(FB.x, FB.y).part === 'b' && hit((FA.x + FB.x) / 2, (FA.y + FB.y) / 2).part === 'body');

    // Bars pattern
    var Pa = n - 25, Pb = n - 15, bp = await drawN('barspat', [[xb(Pa), yb(B[Pa].high)], [xb(Pb), yb(B[Pb].low)]]);
    ok('Bars pattern: two clicks copy the candles between them, the copy on them to begin with', bp && bp.type === 'barspat' && bp.pat && bp.pat.length === Pb - Pa + 1 && bp.a.price === B[Pa].open && Math.abs(bp.pat[3][3] - (B[Pa + 3].close - B[Pa].open)) < 1e-7, bp && bp.pat && bp.pat.length);
    var mx = xb(Pa + 5), my = yb((B[Pa + 5].open + B[Pa + 5].close) / 2);
    ok('the copy takes the mouse', hit(mx, my).i === DW.list.indexOf(bp), hit(mx, my));
    var pat0 = JSON.stringify(bp.pat); DW.sel = DW.list.indexOf(bp); await drag(mx, my, mx + xb(Pa + 21) - xb(Pa + 1), my - 30);
    var Lm = Math.round(P._lOfT(0, bp.a.t));
    ok('dragged on: the same candles, twenty on and higher', JSON.stringify(bp.pat) === pat0 && Lm === Pa + 20 && bp.a.price > B[Pa].open, [Lm, Pa + 20]);
    var nl = DW.list.length; await drawN('barspat', [[xb(n + 4), yb(B[n - 1].close)], [xb(n + 12), yb(B[n - 1].close)]]);
    ok('drawn over no candles (still to come): nothing to copy, nothing kept', DW.list.length === nl);

    // Ghost feed: three points, ended on the last
    await pick('ghost'); var G = [[xb(n + 2), yb(B[n - 1].close)], [xb(n + 10), yb(B[n - 1].close) - 60], [xb(n + 18), yb(B[n - 1].close) + 20]];
    for (var j = 0; j < G.length; j++) { mev('mousemove', G[j][0], G[j][1], { buttons: 1 }); await W(25); click(G[j][0], G[j][1]); await W(40); } click(G[2][0], G[2][1]); await W(80);
    var gf = DW.list[DW.list.length - 1];
    ok('Ghost feed: a point at each click, a click on the last one ends it', gf && gf.type === 'ghost' && gf.pts.length === 3 && DW.tool === 'none', gf && gf.pts && gf.pts.length);
    var fills = 0, FR = CanvasRenderingContext2D.prototype.fillRect; CanvasRenderingContext2D.prototype.fillRect = function () { fills++; return FR.apply(this, arguments); }; try { DW.ver++; P._drawOv(0); } finally { CanvasRenderingContext2D.prototype.fillRect = FR; }
    ok('drawn as candles, one for each candle along its path', fills >= 16, fills);
    var gx = xb(n + 6), gy = yb(B[n - 1].close) - 30;
    ok('its candles take the mouse; its points are handles', hit(gx, gy).i === DW.list.indexOf(gf) && hit(G[1][0], G[1][1]).part === 'p1', [hit(gx, gy), hit(G[1][0], G[1][1])]);
    // Sector
    var R = ch.getBoundingClientRect(), X = function (f) { return Math.round(R.width * f); }, Y = function (f) { return Math.round(R.height * f); };
    var sc = await drawN('sector', [[X(0.3), Y(0.5)], [X(0.4), Y(0.5)], [X(0.3), Y(0.35)]]);
    ok('Sector: its centre, then its two edges; filled', sc && sc.type === 'sector' && sc.c && hit(X(0.33), Y(0.46)).i === DW.list.indexOf(sc) && !hit(X(0.25), Y(0.6)).part, [hit(X(0.33), Y(0.46))]);
    var raw = JSON.stringify(DW.list.map(function (d) { return d.type; }));
    ok('all kept with the symbol\'s drawings', ['posfc', 'barspat', 'ghost', 'sector'].every(function (t) { return raw.indexOf('"' + t + '"') >= 0; }), raw);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
