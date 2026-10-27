(async function () {
  // TradingView's FIBONACCI + GANN group (Nestor, 26 Oct 2026): Fib retracement, Trend-based fib extension (3 clicks), Fib channel
  // (3), Fib time zone, Fib speed resistance fan, Fib circles, Fib spiral, Fib speed resistance arcs, Fib wedge (3), Gann box; their
  // levels in TradingView's colours with their figures; a three-point tool's third point a handle of its own, moved and copied with it.
  // Run: python tests/browser_test.py tests/practice_fib2_e2e.js
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
    var mev = function (t, xx, yy, o) { var r = ch.getBoundingClientRect(); ch.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mouseup' ? 0 : 1, view: window }, o || {}))); };
    var click = function (x, y) { mev('mousedown', x, y); mev('mouseup', x, y); };
    var pick = async function (t) { if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); if (DW.tool !== t) tools.querySelector('[data-tool="' + t + '"]').click(); await W(40); };
    var drawN = async function (t, pts) { await pick(t); for (var j = 0; j < pts.length; j++) { if (j) { mev('mousemove', pts[j][0], pts[j][1]); await W(25); } click(pts[j][0], pts[j][1]); await W(40); } await W(60); return DW.list[DW.list.length - 1]; };
    var texts = function () { var got = [], F = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { got.push(String(t)); return F.apply(this, arguments); }; try { DW.ver = (DW.ver || 0) + 1; P._drawOv(0); } finally { CanvasRenderingContext2D.prototype.fillText = F; } return got; };
    var at = function (q) { return { x: P._xOfT(0, q.t), y: pane.series.priceToCoordinate(q.price) }; };
    var R = ch.getBoundingClientRect(), Wd = R.width, H = R.height, X = function (f) { return Math.round(Wd * f); }, Y = function (f) { return Math.round(H * f); };

    var grp = tools.querySelector('.stpr-tg[data-grp="fibg"]'), names = Array.prototype.map.call(grp.querySelectorAll('[data-tool]'), function (b) { return b.getAttribute('data-tool'); }).join(','), hd = Array.prototype.map.call(grp.querySelectorAll('.stpr-tfh'), function (h) { return h.textContent; }).join('|');
    ok('the Fibonacci and Gann menu: Fib retracement, Trend-based fib extension, Fib channel, Fib time zone, Fib speed resistance fan, Fib circles, Fib spiral, Fib speed resistance arcs, Fib wedge; Gann box', names === 'fib,fibext,fibchan,fibtime,fibfan,fibcirc,fibspiral,fibarc,fibwedge,gannbox' && hd === 'Fibonacci|Gann', [names, hd]);

    var two = { fibtime: ['0', '1', '2', '3', '5'], fibfan: ['0.382', '0.618'], fibcirc: ['0.618', '1.618'], fibarc: ['0.382', '1'], gannbox: ['0.25', '0.75'] }, two2 = ['fibspiral'];
    var spots = [[0.15, 0.25, 0.2, 0.45], [0.3, 0.6, 0.38, 0.5], [0.5, 0.3, 0.56, 0.38], [0.62, 0.75, 0.7, 0.62], [0.72, 0.2, 0.86, 0.45], [0.4, 0.75, 0.45, 0.7]], si = 0;
    for (var t in two) { var sp = spots[si++]; DW.list = []; DW.sel = null; P._props(); var d2 = await drawN(t, [[X(sp[0]), Y(sp[1])], [X(sp[2]), Y(sp[3])]]), tx = texts();
      ok(t + ': two clicks, its levels with their figures', d2 && d2.type === t && two[t].every(function (s) { return tx.indexOf(s) >= 0; }) && !d2.c, [d2 && d2.type, tx.slice(0, 14)]); }
    DW.list = []; var sp2 = await drawN('fibspiral', [[X(0.5), Y(0.5)], [X(0.56), Y(0.44)]]);
    ok('fibspiral: two clicks, the spiral takes the mouse on its curve', sp2.type === 'fibspiral' && (P._hit(0, at(sp2.b).x, at(sp2.b).y) || {}).part === 'b');

    // three points
    DW.list = []; var fe = await drawN('fibext', [[X(0.2), Y(0.7)], [X(0.35), Y(0.4)], [X(0.45), Y(0.6)]]), tx3 = texts();
    ok('Trend-based fib extension: three clicks, its levels from the third point, each with its price', fe.type === 'fibext' && fe.c && tx3.some(function (s) { return /^1\.618 \(1\.\d{5}\)$/.test(s); }) && tx3.some(function (s) { return /^0\.5 \(/.test(s); }), tx3.slice(0, 6));
    var exp = fe.c.price + (fe.b.price - fe.a.price) * 1.618, got = tx3.filter(function (s) { return /^1\.618 /.test(s); })[0];
    ok('its 1.618 sits at the third point plus 1.618 of the first leg', got && Math.abs(parseFloat(got.split('(')[1]) - exp) < 0.00002, [got, exp]);
    var Cp = at(fe.c);
    ok('its third point is a handle of its own', (P._hit(0, Cp.x, Cp.y) || {}).part === 'c');
    var a0 = JSON.stringify(fe.a), b0 = JSON.stringify(fe.b);
    DW.sel = DW.list.indexOf(fe); mev('mousedown', Cp.x, Cp.y); mev('mousemove', Cp.x + 30, Cp.y + 20); await W(30); mev('mousemove', Cp.x + 34, Cp.y + 24); await W(30); mev('mouseup', Cp.x + 34, Cp.y + 24); await W(60);
    ok('dragging it moves the third point only', JSON.stringify(fe.a) === a0 && JSON.stringify(fe.b) === b0 && Math.abs(at(fe.c).x - (Cp.x + 34)) < 12, [at(fe.c).x, Cp.x + 34]);
    var c1 = JSON.stringify(fe.c), mid = { x: (at(fe.a).x + at(fe.b).x) / 2, y: (at(fe.a).y + at(fe.b).y) / 2 };
    mev('mousedown', mid.x, mid.y); mev('mousemove', mid.x + 40, mid.y - 30); await W(30); mev('mousemove', mid.x + 44, mid.y - 34); await W(30); mev('mouseup', mid.x + 44, mid.y - 34); await W(60);
    ok('dragging it by a line moves all three points together', JSON.stringify(fe.a) !== a0 && JSON.stringify(fe.c) !== c1 && Math.abs((fe.c.price - JSON.parse(c1).price) - (fe.a.price - JSON.parse(a0).price)) < 1e-9);
    DW.sel = DW.list.indexOf(fe); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', ctrlKey: true, bubbles: true })); await W(30); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', code: 'KeyV', ctrlKey: true, bubbles: true })); await W(80);
    var cp = DW.list[DW.list.length - 1];
    ok('a copy is pasted three candles on, all three points with it', cp !== fe && cp.type === 'fibext' && cp.c && P._lOfT(0, cp.c.t) - P._lOfT(0, fe.c.t) === 3 && P._lOfT(0, cp.a.t) - P._lOfT(0, fe.a.t) === 3, cp && cp.c);
    DW.list = []; var fc = await drawN('fibchan', [[X(0.2), Y(0.6)], [X(0.4), Y(0.45)], [X(0.3), Y(0.75)]]);
    ok('Fib channel: three clicks, its parallel levels', fc.type === 'fibchan' && fc.c && texts().indexOf('0.618') >= 0);
    DW.list = []; var fw = await drawN('fibwedge', [[X(0.4), Y(0.7)], [X(0.6), Y(0.45)], [X(0.62), Y(0.68)]]);
    ok('Fib wedge: three clicks, its arcs between the two lines', fw.type === 'fibwedge' && fw.c && texts().indexOf('0.786') >= 0);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
