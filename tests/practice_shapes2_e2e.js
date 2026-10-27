(async function () {
  // TradingView's SHAPES group (Nestor, 26 Oct 2026: "i need all these"): Brushes (Brush, Highlighter), Arrows (Arrow marker, Arrow,
  // Arrow mark up, Arrow mark down), Shapes (Rectangle, Rotated rectangle, Path, Circle, Ellipse, Polyline, Triangle, Arc, Curve,
  // Double curve) - each drawn, hit, handled, moved and kept.
  // Run: python tests/browser_test.py tests/practice_shapes2_e2e.js
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
    var drag = async function (x0, y0, x1, y1) { mev('mousedown', x0, y0); mev('mousemove', (x0 + x1) / 2, (y0 + y1) / 2); await W(30); mev('mousemove', x1, y1); await W(30); mev('mouseup', x1, y1); await W(60); };
    var at = function (q) { return { x: P._xOfT(0, q.t), y: pane.series.priceToCoordinate(q.price) }; };
    var hit = function (x, y) { return P._hit(0, x, y) || {}; };
    var bar = function () { return document.querySelector('.stdb-bar'); }, acts = function () { var b = bar(); return b ? Array.prototype.map.call(b.querySelectorAll('[data-db]'), function (x) { return x.getAttribute('data-db'); }).join(',') : ''; };
    var R = ch.getBoundingClientRect(), Wd = R.width, H = R.height, X = function (f) { return Math.round(Wd * f); }, Y = function (f) { return Math.round(H * f); };

    var grp = tools.querySelector('.stpr-tg[data-grp="shapes"]'), names = Array.prototype.map.call(grp.querySelectorAll('[data-tool]'), function (b) { return b.getAttribute('data-tool'); }).join(','), hd = Array.prototype.map.call(grp.querySelectorAll('.stpr-tfh'), function (h) { return h.textContent; }).join('|');
    var lbl = function (t) { var b = grp.querySelector('[data-tool="' + t + '"] span'); return b ? b.textContent : ''; };
    ok('the Shapes menu, as TradingView\'s: Brushes (Brush, Highlighter), Arrows (Arrow marker, Arrow, Arrow mark up / down), Shapes (Rectangle, Rotated rectangle, Path, Circle, Ellipse, Polyline, Triangle, Arc, Curve, Double curve)',
      names === 'pen,brush,arrowmk,arrow,arrowup,arrowdn,rect,rotrect,path,circ,circle,polyline,triangle,arc,curve,dcurve' && hd === 'Brushes|Arrows|Shapes' && lbl('pen') === 'Brush' && lbl('circle') === 'Ellipse' && lbl('circ') === 'Circle' && lbl('dcurve') === 'Double curve', [names, hd, lbl('pen'), lbl('circle')]);
    ok('each new one with its icon and its star', ['arrowmk', 'arrowup', 'arrowdn', 'rotrect', 'circ', 'polyline', 'triangle', 'arc', 'curve', 'dcurve'].every(function (t) { var b = grp.querySelector('[data-tool="' + t + '"]'); return b && b.querySelector('svg') && b.querySelector('[data-fav]'); }));

    // Arrow marker
    DW.list = []; DW.sel = null; P._props();
    var am = await drawN('arrowmk', [[X(0.15), Y(0.7)], [X(0.3), Y(0.45)]]), A = at(am.a), B = at(am.b);
    ok('Arrow marker: two clicks, a filled arrow - its shaft and its head take the mouse, its ends are handles', am.type === 'arrowmk' && hit((A.x + B.x) / 2, (A.y + B.y) / 2).part === 'body' && hit(A.x, A.y).part === 'a' && hit(B.x, B.y).part === 'b', [hit((A.x + B.x) / 2, (A.y + B.y) / 2)]);
    DW.sel = DW.list.indexOf(am); P._props(); await W(60);
    ok('its toolbar: its colour', /(^|,)line(,|$)/.test(acts()) && !/width/.test(acts()), acts());
    // Arrow marks
    await pick('arrowup'); click(X(0.4), Y(0.6)); await W(80); var au = DW.list[DW.list.length - 1], U = at(au.a);
    ok('Arrow mark up: one click, the tool put down, the arrow under the point pointing up', au.type === 'arrowup' && DW.tool === 'none' && !au.b && hit(U.x, U.y + 14).i === DW.list.indexOf(au) && !hit(U.x, U.y - 14).part);
    await pick('arrowdn'); click(X(0.45), Y(0.3)); await W(80); var ad = DW.list[DW.list.length - 1], Dn = at(ad.a);
    ok('Arrow mark down: over the point pointing down', ad.type === 'arrowdn' && hit(Dn.x, Dn.y - 14).i === DW.list.indexOf(ad) && !hit(Dn.x, Dn.y + 14).part);
    // Rotated rectangle
    var rr = await drawN('rotrect', [[X(0.5), Y(0.7)], [X(0.65), Y(0.55)], [X(0.6), Y(0.75)]]), ra = at(rr.a), rb = at(rr.b), rc = at(rr.c);
    var L = Math.hypot(rb.x - ra.x, rb.y - ra.y), nx = -(rb.y - ra.y) / L, ny = (rb.x - ra.x) / L, hh = (rc.x - ra.x) * nx + (rc.y - ra.y) * ny, mid = { x: (ra.x + rb.x) / 2 + nx * hh / 2, y: (ra.y + rb.y) / 2 + ny * hh / 2 };
    ok('Rotated rectangle: three clicks - a side, then how wide; filled, its inside takes the mouse', rr.type === 'rotrect' && rr.c && Math.abs(hh) > 10 && hit(mid.x, mid.y).i === DW.list.indexOf(rr) && hit(rc.x, rc.y).part === 'c', [hh, hit(mid.x, mid.y)]);
    DW.sel = DW.list.indexOf(rr); P._props(); await W(60);
    ok('its toolbar: line, fill, width, style', /line/.test(acts()) && /fill/.test(acts()) && /width/.test(acts()), acts());
    // Circle
    DW.list = []; DW.sel = null; P._props();
    var ci = await drawN('circ', [[X(0.3), Y(0.5)], [X(0.36), Y(0.5)]]), cA = at(ci.a), cB = at(ci.b), cr = Math.hypot(cB.x - cA.x, cB.y - cA.y);
    ok('Circle: its centre, then a point on it - round on the screen, its inside takes the mouse', ci.type === 'circ' && hit(cA.x - cr, cA.y).i === 0 && hit(cA.x, cA.y + cr).i === 0 && hit(cA.x + cr * 0.3, cA.y - cr * 0.3).part === 'body' && hit(cA.x, cA.y).part === 'a', [cr]);
    // Triangle
    var tr = await drawN('triangle', [[X(0.5), Y(0.7)], [X(0.62), Y(0.7)], [X(0.56), Y(0.45)]]), ta = at(tr.a), tb = at(tr.b), tc = at(tr.c);
    ok('Triangle: three clicks, filled', tr.type === 'triangle' && tr.c && hit((ta.x + tb.x + tc.x) / 3, (ta.y + tb.y + tc.y) / 3).i === DW.list.indexOf(tr) && hit(tc.x, tc.y).part === 'c');
    // Arc
    var ar = await drawN('arc', [[X(0.7), Y(0.7)], [X(0.85), Y(0.7)], [X(0.775), Y(0.5)]]), arc = at(ar.c), ara = at(ar.a), arb = at(ar.b);
    ok('Arc: its ends, then a point it passes through - the third point a handle on it', ar.type === 'arc' && ar.c && hit(arc.x, arc.y).part === 'c' && hit((ara.x + arb.x) / 2, (ara.y + arc.y) / 2).i === DW.list.indexOf(ar));
    // Curve: two clicks, its bend a handle in the middle
    DW.list = []; DW.sel = null; P._props();
    var cu = await drawN('curve', [[X(0.2), Y(0.7)], [X(0.4), Y(0.7)]]), ua = at(cu.a), ub = at(cu.b), bend = { x: (ua.x + ub.x) / 2, y: (ua.y + ub.y) / 2 - (ub.x - ua.x) * 0.22 };
    ok('Curve: two clicks, bent upward, the bend a handle of its own', cu.type === 'curve' && !cu.c && hit(bend.x, bend.y).part === 'c' && !hit((ua.x + ub.x) / 2, ua.y).part, [bend, hit(bend.x, bend.y)]);
    var ua0 = JSON.stringify(cu.a); DW.sel = 0; await drag(bend.x, bend.y, bend.x + 6, bend.y + 160);
    var nb = cu.c ? at(cu.c) : null;
    ok('dragging the bend bends it the other way, the curve passing through it', !!cu.c && nb.y > ua.y + 40 && hit(nb.x, nb.y).part === 'c' && JSON.stringify(cu.a) === ua0, [nb, ua.y]);
    // Double curve
    var dc = await drawN('dcurve', [[X(0.5), Y(0.6)], [X(0.8), Y(0.6)]]), da = at(dc.a), db = at(dc.b), q1 = (db.x - da.x) / 4, k = (db.x - da.x) * 0.5 * 0.22;
    ok('Double curve: two clicks, an S - up through its first half, down through its second', dc.type === 'dcurve' && hit(da.x + q1, da.y - k).part === 'c' && hit(db.x - q1, db.y + k).part === 'body', [hit(da.x + q1, da.y - k), hit(db.x - q1, db.y + k)]);
    // Polyline: closed by a click on its first point
    DW.list = []; DW.sel = null; P._props();
    await pick('polyline'); var PL = [[X(0.2), Y(0.7)], [X(0.3), Y(0.4)], [X(0.42), Y(0.55)], [X(0.35), Y(0.8)]];
    for (var j = 0; j < PL.length; j++) { mev('mousemove', PL[j][0], PL[j][1]); await W(25); click(PL[j][0], PL[j][1]); await W(40); }
    var f0 = at(DW.pending.pts[0]); mev('mousemove', f0.x, f0.y); await W(25); click(f0.x, f0.y); await W(80);
    var pl = DW.list[DW.list.length - 1];
    ok('Polyline: a point at each click; a click on its first point closes it - the tool put down', pl && pl.type === 'polyline' && pl.pts.length === 5 && pl.pts[0].t === pl.pts[4].t && pl.pts[0].price === pl.pts[4].price && DW.tool === 'none' && !DW.pending, pl && pl.pts.length);
    var cx = PL.reduce(function (s, q) { return s + q[0]; }, 0) / 4, cy = PL.reduce(function (s, q) { return s + q[1]; }, 0) / 4;
    ok('closed, it is filled: its inside takes the mouse; each corner is a handle', hit(cx, cy).part === 'body' && hit(at(pl.pts[1]).x, at(pl.pts[1]).y).part === 'p1', [hit(cx, cy)]);
    DW.sel = 0; var p0 = at(pl.pts[0]); await drag(p0.x, p0.y, p0.x - 30, p0.y + 20);
    ok('dragging its first corner keeps it closed', pl.pts[0].t === pl.pts[4].t && pl.pts[0].price === pl.pts[4].price && Math.abs(at(pl.pts[0]).x - (p0.x - 30)) < 12);
    // open: a double-click on its last point ends it
    await pick('polyline'); var PO = [[X(0.55), Y(0.7)], [X(0.65), Y(0.4)], [X(0.75), Y(0.7)]];
    for (j = 0; j < PO.length; j++) { mev('mousemove', PO[j][0], PO[j][1]); await W(25); click(PO[j][0], PO[j][1]); await W(40); } click(PO[2][0], PO[2][1]); await W(80);
    var po = DW.list[DW.list.length - 1];
    ok('a double-click on its last point leaves it open, not filled', po.type === 'polyline' && po.pts.length === 3 && !hit(X(0.65), Y(0.6)).part && hit(X(0.6), Y(0.55)).i === DW.list.indexOf(po), po.pts.length);
    // moved and copied whole
    DW.sel = DW.list.indexOf(po); var po0 = JSON.stringify(po.pts);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', ctrlKey: true, bubbles: true })); await W(30); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', code: 'KeyV', ctrlKey: true, bubbles: true })); await W(80);
    var cp = DW.list[DW.list.length - 1];
    ok('a copy is pasted three candles on, every point with it', cp !== po && cp.type === 'polyline' && cp.pts.length === 3 && cp.pts.every(function (z, n) { return P._lOfT(0, z.t) - P._lOfT(0, po.pts[n].t) === 3; }) && JSON.stringify(po.pts) === po0);
    // kept
    DW.list = []; await drawN('circ', [[X(0.3), Y(0.5)], [X(0.35), Y(0.5)]]); await drawN('curve', [[X(0.4), Y(0.6)], [X(0.5), Y(0.6)]]); await drawN('arrowmk', [[X(0.6), Y(0.6)], [X(0.7), Y(0.5)]]);
    var raw = JSON.stringify(DW.list.map(function (d) { return d.type; }));
    ok('they keep with the symbol\'s drawings', /circ/.test(raw) && /curve/.test(raw) && /arrowmk/.test(raw), raw);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
