(async function () {
  // Objects on the chart are clicked first, then they move, as in TradingView (Nestor, 2 Nov 2026: "objects on the chart for them to be activated they need to be
  // clicked on then you can drag them and change settings, if i just click and drag them the chart should move, not the drawing or object like in tradingview");
  // and their cursors ("a hand with a finger pointing at the item", "the usual 2 headed arrow"). Live / Replay's engine and Trade Replay's. Candles: the stand-ins.
  // Run: python tests/browser_test.py tests/dwselect_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var until = async function (f, ms) { for (var u = 0; u < (ms || 2000); u += 40) { if (f()) return true; await W(40); } return !!f(); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.look = {}; C.mini = false; C.max = true; C.resume = null; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-14' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('16:00'); await W(500);
    var pane = function () { return P._panes()[0]; }, DW = P._dr(); DW.list = []; DW.sel = null; P._render();
    var ch = pane().el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0, view: window }, o || {}))); };
    var drag = async function (x0, y0, x1, y1) { mev('mousedown', x0, y0); for (var s = 1; s <= 6; s++) { mev('mousemove', x0 + (x1 - x0) * s / 6, y0 + (y1 - y0) * s / 6, { held: true }); await W(16); } mev('mouseup', x1, y1); await W(60); };
    var click = function (x, y) { mev('mousedown', x, y); mev('mouseup', x, y); };
    var cur = function (x, y) { mev('mousemove', x, y, { buttons: 0 }); return ch.style.cursor; };
    var view = function () { return pane().chart.timeScale().getVisibleLogicalRange(); };
    var at = function (q) { return { x: P._xOfT(0, q.t), y: P._yOf(0, q.price) }; };
    // a rectangle in the middle of the chart, not selected
    var B = pane().bars, nB = B.length, bA = B[Math.max(0, nB - 30)], bB = B[Math.max(0, nB - 12)], mid = (bA.close + bB.close) / 2, span = Math.abs(bA.high - bA.low) * 3 || 0.002;
    var rect = { type: 'rect', a: { t: bA.time, price: mid + span }, b: { t: bB.time, price: mid - span }, tfs: null }; DW.list.push(rect); DW.sel = null; P._render(); await W(150);
    var A = at(rect.a), Bp = at(rect.b), mx = (A.x + Bp.x) / 2, my = (A.y + Bp.y) / 2, a0 = JSON.stringify(rect);
    ok('(a rectangle on screen, nothing selected)', A.x > 40 && Bp.x > A.x + 40 && Bp.y > A.y + 20 && DW.sel == null, [A, Bp]);

    // ---- not selected: the hand, and a drag moves the chart ----
    ok('the mouse on it, not selected: a hand (a click selects it), not the crossed arrows', cur(mx, my) === 'pointer', ch.style.cursor);
    ok('...on its corner too: nothing to resize until it is selected', cur(A.x, A.y) === 'pointer', ch.style.cursor);
    var v0 = view(); await drag(mx, my, mx + 90, my + 40); await W(200);
    var v1 = view();
    ok('pressed and dragged, not selected: the drawing stays where it is', JSON.stringify(rect) === a0, [rect.a, rect.b]);
    ok('...the chart moved', Math.abs(v1.from - v0.from) > 2, [v0, v1]);
    ok('...and it is not selected', DW.sel == null, DW.sel);
    await W(150); A = at(rect.a); Bp = at(rect.b); mx = (A.x + Bp.x) / 2; my = (A.y + Bp.y) / 2;

    // ---- a click selects it ----
    click(mx, my); await W(80);
    ok('a click (no drag): selected, its toolbar shows', DW.sel === 0 && Array.prototype.some.call(document.querySelectorAll('.stdb-bar'), function (b) { return b.offsetWidth > 0 && b.style.display !== 'none'; }), DW.sel);
    var v2 = view(), t2 = JSON.stringify(rect);
    ok('selected, the mouse on its body: a hand', cur(mx, my) === 'pointer', ch.style.cursor);
    A = at(rect.a); Bp = at(rect.b);
    ok('...its top-left corner: the diagonal arrow', cur(A.x, A.y) === 'nwse-resize', ch.style.cursor);
    ok('...its bottom-right corner: the same diagonal', cur(Bp.x, Bp.y) === 'nwse-resize', ch.style.cursor);
    ok('...its top-right corner: the other diagonal', cur(Bp.x, A.y) === 'nesw-resize', ch.style.cursor);
    ok('...its bottom-left corner: that diagonal too', cur(A.x, Bp.y) === 'nesw-resize', ch.style.cursor);
    ok('...its right side: left and right', cur(Bp.x, my) === 'ew-resize', ch.style.cursor);
    ok('...its top: up and down', cur(mx, A.y) === 'ns-resize', ch.style.cursor);
    await drag(mx, my, mx + 30, my + 25); await W(100);
    ok('selected: a drag moves it, and the chart stays', JSON.stringify(rect) !== t2 && Math.abs(view().from - v2.from) < 0.01, [rect.a, rect.b]);
    A = at(rect.a); Bp = at(rect.b); var bw = Bp.x - A.x;
    await drag(Bp.x, (A.y + Bp.y) / 2, Bp.x + 40, (A.y + Bp.y) / 2); await W(80); var A2 = at(rect.a), B2 = at(rect.b);
    ok('selected: its side handle resizes it, the other side stays', B2.x - A2.x > bw + 10 && Math.abs(A2.x - A.x) < 2, [bw, B2.x - A2.x]);
    click(20, r.height - 80); await W(60);
    ok('a click on the bare chart: not selected any more', DW.sel == null, DW.sel);

    // ---- something else selected: a press on another object moves the chart, a click there selects that one ----
    var v3 = view(), bC = B[Math.max(0, nB - 20)];
    var cP = function (y) { return pane().series.coordinateToPrice(y); }, line = { type: 'trend', a: { t: bA.time, price: cP(r.height * 0.1) }, b: { t: bB.time, price: cP(r.height * 0.2) }, tfs: null }; DW.list.push(line); DW.sel = 1; P._render(); await W(120);
    A = at(rect.a); Bp = at(rect.b); mx = (A.x + Bp.x) / 2; my = (A.y + Bp.y) / 2; var r0 = JSON.stringify(rect), l0 = JSON.stringify(line);
    await drag(mx, my, mx - 60, my); await W(200);
    ok('another object selected: dragging this one moves the chart, neither drawing moves', JSON.stringify(rect) === r0 && JSON.stringify(line) === l0 && Math.abs(view().from - v3.from) > 1, [view(), v3]);
    await W(120); var La = at(line.a), Lb = at(line.b), lmx = (La.x + Lb.x) / 2, lmy = (La.y + Lb.y) / 2; click(lmx, lmy); await W(60);
    ok('a click on a line: selected', DW.sel === 1, DW.sel);
    var want = Math.abs(La.y - Lb.y) < 0.35 * Math.abs(La.x - Lb.x) ? 'ew-resize' : ((La.x - Lb.x) * (La.y - Lb.y) > 0 ? 'nwse-resize' : 'nesw-resize');
    ok('...its end handle: the two-headed arrow along the line (' + want + ')', cur(Lb.x, Lb.y) === want, ch.style.cursor);
    ok('...its body: a hand', cur(lmx, lmy) === 'pointer', ch.style.cursor);
    // the selected one first: under another drawing it can still be dragged
    var over = { type: 'rect', a: { t: line.a.t, price: Math.max(line.a.price, line.b.price) + span }, b: { t: line.b.t, price: Math.min(line.a.price, line.b.price) - span }, tfs: null }; DW.list.push(over); P._render(); await W(100);
    var l1 = JSON.stringify(line); La = at(line.a); Lb = at(line.b); await drag((La.x + Lb.x) / 2, (La.y + Lb.y) / 2, (La.x + Lb.x) / 2 + 10, (La.y + Lb.y) / 2 + 30); await W(60);
    ok('a selected line under a rectangle drawn later: a drag still moves the line', JSON.stringify(line) !== l1 && DW.sel === 1, DW.sel);
    DW.list.splice(2, 1); DW.sel = null; P._render(); await W(100);

    // ---- locked ----
    rect.locked = true; rect.lock = true; A = at(rect.a); Bp = at(rect.b); mx = (A.x + Bp.x) / 2; my = (A.y + Bp.y) / 2; var r1 = JSON.stringify(rect), v4 = view();
    await drag(mx, my, mx + 40, my); await W(200);
    ok('a locked one not selected: the chart moves, no message', Math.abs(view().from - v4.from) > 1 && JSON.stringify(rect) === r1);
    delete rect.locked; delete rect.lock; DW.sel = null; P._render(); await W(100);

    // ---- the position tool ----
    var bP = B[Math.max(0, nB - 25)], pos = { type: 'long', a: { t: bP.time, price: mid }, b: { t: B[Math.max(0, nB - 8)].time, price: mid }, sl: mid - span, tp: mid + 2 * span }; DW.list.push(pos); var pi = DW.list.length - 1; DW.list.splice(0, 2, { type: 'hline', price: mid + span * 20 }); pi = DW.list.indexOf(pos); DW.sel = null; P._render(); await W(150);
    var Pe = at(pos.a), Pr = at(pos.b), pmx = (Pe.x + Pr.x) / 2 + 12, pmy = P._yOf(0, mid + span), p0 = JSON.stringify(pos), v5 = view();
    await drag(pmx, pmy, pmx + 50, pmy + 10); await W(200);
    ok('the Long position not selected: a drag moves the chart, not the tool', JSON.stringify(pos) === p0 && Math.abs(view().from - v5.from) > 1, [view(), v5]);
    await W(120); Pe = at(pos.a); Pr = at(pos.b); pmx = (Pe.x + Pr.x) / 2 + 12; pmy = P._yOf(0, mid + span); click(pmx, pmy); await W(60);
    ok('...a click selects it', DW.sel === pi, DW.sel);
    var ys = P._yOf(0, pos.sl), yt = P._yOf(0, pos.tp), ye = P._yOf(0, pos.a.price);
    ok('...its stop and target handles: up and down; its width handle: left and right; its body: a hand', cur(Pe.x, ys) === 'ns-resize' && cur(Pe.x, yt) === 'ns-resize' && cur(Pr.x, ye) === 'ew-resize' && cur(pmx, pmy) === 'pointer', [cur(Pe.x, ys), cur(Pe.x, yt), cur(Pr.x, ye), cur(pmx, pmy)]);
    var sl0 = pos.sl; await drag(Pe.x, ys, Pe.x, ys + 20); await W(60);
    ok('...selected, its stop handle drags the stop', pos.sl !== sl0, [sl0, pos.sl]);
    DW.sel = null; P._render(); await W(100);

    // ---- a finger ----
    var tch = function (type, x, y) { var t = new Touch({ identifier: 7, target: ch, clientX: r.left + x, clientY: r.top + y }); ch.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], targetTouches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true, view: window })); };
    Pe = at(pos.a); Pr = at(pos.b); pmx = (Pe.x + Pr.x) / 2 + 12; pmy = P._yOf(0, mid + span); p0 = JSON.stringify(pos);
    tch('touchstart', pmx, pmy); for (var s1 = 1; s1 <= 5; s1++) { tch('touchmove', pmx + s1 * 12, pmy); await W(16); } tch('touchend', pmx + 60, pmy); await W(120);
    ok('a finger dragged over it, not selected: the tool stays, nothing selected', JSON.stringify(pos) === p0 && DW.sel == null, DW.sel);
    await W(150); Pe = at(pos.a); Pr = at(pos.b); pmx = (Pe.x + Pr.x) / 2 + 12; pmy = P._yOf(0, mid + span);
    tch('touchstart', pmx, pmy); await W(40); tch('touchend', pmx, pmy); await W(100);
    ok('a tap: selected', DW.sel === pi, DW.sel);
    p0 = JSON.stringify(pos); tch('touchstart', pmx, pmy); for (s1 = 1; s1 <= 5; s1++) { tch('touchmove', pmx + s1 * 6, pmy + s1 * 3); await W(16); } tch('touchend', pmx + 30, pmy + 15); await W(100);
    ok('...then a finger drag moves it', JSON.stringify(pos) !== p0, [pos.a, pos.b]);
    DW.sel = null; DW.list = []; P._render(); await W(80);

    // ---- the Session Indicator's zone: its edge drags on the first press (Nestor, 3 Nov 2026), unlike a drawing ----
    C.mini = true; C.miniLink = true; C.showPer = {}; var bi = pane().bars[Math.max(0, nB - 40)].time; C.miniS = { auto: false, zA: bi, detach: true }; P._miniFresh(); P._render(); await until(function () { var z = pane()._mz; return z && z.x0 > 20; }, 2500);
    var mz = pane()._mz, zA0 = C.miniS.zA, zy = (mz.y0 + mz.y1) / 2;
    ok('(a zone started by hand, its left edge on screen)', mz && mz.x0 > 20 && mz.x0 < r.width - 100, mz);
    ok('the zone\'s edge: the two-headed arrow straight away', cur(mz.x0, zy) === 'ew-resize', ch.style.cursor);
    var v6 = view(), w6 = JSON.stringify(C.miniS); click(mz.x0, zy); await W(80);
    ok('a click with no drag changes nothing, and the chart stays', JSON.stringify(C.miniS) === w6 && Math.abs(view().from - v6.from) < 0.01, [w6, JSON.stringify(C.miniS)]);
    await drag(mz.x0, zy, mz.x0 - 60, zy); await until(function () { return pane()._mz && pane()._mz.x0 < mz.x0 - 20; }, 1500);
    ok('pressed and dragged at once: the zone\'s start moves', C.miniS.zA < zA0, [zA0, C.miniS.zA]);
    ok('...and the chart does not', Math.abs(view().from - v6.from) < 0.01, [view(), v6]);
    await W(200); var v7a = view(), zA7 = C.miniS.zA; await drag(r.width * 0.6, r.height * 0.4, r.width * 0.6 - 70, r.height * 0.4); await W(200);
    ok('a drag off its edge is still the chart\'s', C.miniS.zA === zA7 && Math.abs(view().from - v7a.from) > 1, [view(), v7a]);
    C.mini = false; C.miniS = {}; P._miniFresh(); P.close(); await W(150);

    // ---- Trade Replay ----
    var R = window.__stReplay;
    var trade = { mt5Ticket: 999999903, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-14T09:00:00Z', closeTime: '2026-10-14T10:00:00Z', slPips: 10 };
    try { localStorage.removeItem('st_replay_draw2_999999903'); } catch (e) {}
    R.open(trade); for (k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(800);
    var S = R._s(); S.drawings = []; S.sel = null;
    var chart = document.getElementById('strp-chart'), q = chart.getBoundingClientRect();
    var rev = function (t, xx, yy, o) { var el = document.elementFromPoint(q.left + xx, q.top + yy) || chart; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: q.left + xx, clientY: q.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0, view: window }, o || {}))); };
    var rdrag = async function (x0, y0, x1, y1) { rev('mousedown', x0, y0); for (var s = 1; s <= 6; s++) { rev('mousemove', x0 + (x1 - x0) * s / 6, y0 + (y1 - y0) * s / 6, { held: true }); await W(16); } rev('mouseup', x1, y1); await W(60); };
    var rcur = function (x, y) { rev('mousemove', x, y, { buttons: 0 }); return chart.style.cursor; };
    // drawn by hand with the tool: it ends selected; a click away lets it go
    var db = document.getElementById('strp-drawbtn'); if (db && !document.getElementById('strp-tb').classList.contains('strp-drawopen')) db.click(); await W(40);
    document.querySelector('#strp-tools [data-tool="rect"]').click(); await W(20);
    var X0 = Math.round(q.width * 0.3), Y0 = Math.round(q.height * 0.3), X1 = X0 + 180, Y1 = Y0 + 110;
    rev('mousedown', X0, Y0); rev('mouseup', X0, Y0); await W(30); rev('mousemove', X1, Y1, { buttons: 0 }); rev('mousedown', X1, Y1); rev('mouseup', X1, Y1); await W(80);
    var rd = S.drawings[0];
    ok('Trade Replay: a rectangle drawn, selected', rd && rd.type === 'rect' && S.sel === 0, S.sel);
    var rmx = (X0 + X1) / 2, rmy = (Y0 + Y1) / 2;
    ok('...selected, on its body: a hand; a corner: the diagonal; a side: left and right', rcur(rmx, rmy) === 'pointer' && rcur(X0, Y0) === 'nwse-resize' && rcur(X1, Y0) === 'nesw-resize' && rcur(X1, rmy) === 'ew-resize', [rcur(rmx, rmy), rcur(X0, Y0), rcur(X1, Y0), rcur(X1, rmy)]);
    var r2 = JSON.stringify(rd); await rdrag(rmx, rmy, rmx + 20, rmy + 15); await W(60);
    ok('...selected: a drag moves it', JSON.stringify(rd) !== r2);
    rev('mousedown', q.width - 120, 30); rev('mouseup', q.width - 120, 30); await W(60);
    ok('...a click on the bare chart lets it go', S.sel == null, S.sel);
    var r3 = JSON.stringify(rd), sc = S.chart.timeScale(), v7 = sc.getVisibleLogicalRange(), rmx2 = rmx + 20, rmy2 = rmy + 15;
    ok('...not selected, on it: a hand', rcur(rmx2, rmy2) === 'pointer', chart.style.cursor);
    await rdrag(rmx2, rmy2, rmx2 + 80, rmy2 + 30); await W(200);
    ok('...not selected: a drag moves the chart, not the drawing', JSON.stringify(rd) === r3 && S.sel == null && Math.abs(sc.getVisibleLogicalRange().from - v7.from) > 1, [v7, sc.getVisibleLogicalRange()]);
    await W(150); var Ax = S.chart.timeScale().getVisibleLogicalRange();
    // where it is now, from the chart
    var rh = null; for (var yy = 20; yy < q.height - 40 && !rh; yy += 12) for (var xx = 20; xx < q.width - 80 && !rh; xx += 12) { rev('mousemove', xx, yy, { buttons: 0 }); if (chart.style.cursor === 'pointer') rh = [xx, yy]; }
    if (rh) { rev('mousedown', rh[0] + 6, rh[1] + 6); rev('mouseup', rh[0] + 6, rh[1] + 6); await W(80); }
    ok('...a click on it: selected', S.sel === 0, [S.sel, rh]);
    // Trade Replay's zone: the same (3 Nov 2026)
    S.drawings = []; S.sel = null; var PR = window.__stPractice, MPn = R._mp();
    if (document.getElementById('strp-mini') && !document.getElementById('strp-mini').checked) { document.getElementById('strp-mini').click(); await W(500); }
    ok('Trade Replay: its Session Indicator is on', document.getElementById('strp-mini').checked);
    var rZ = null; for (var rk = 0; rk < 30 && !rZ; rk++) { MPn = R._mp(); if (MPn && MPn._mz) rZ = MPn._mz; await W(100); }
    ok('...its zone is drawn', !!rZ, rZ);
    if (rZ) { var bT = S.bars.filter(function (b) { var bx = sc.timeToCoordinate(b.time); return bx != null && bx > q.width * 0.4 && bx < q.width * 0.6; })[0].time, W0r = Object.assign({}, PR._msRaw(MPn), { auto: false, detach: true, zA: bT }); PR._msSet(MPn, W0r); await W(200); MPn._mini = null; for (var rw2 = 0; rw2 < 50 && !(MPn._mz && Math.abs(MPn._mz.x0 - sc.timeToCoordinate(bT)) < 2); rw2++) await W(100); rZ = MPn._mz;   // (the redraw is not always in within a fixed wait: the old zone's edge was being dragged)
      var rx0 = rZ.x0, ry0 = (rZ.y0 + rZ.y1) / 2;
      ok('Trade Replay: the zone\'s edge is the two-headed arrow straight away', rcur(rx0, ry0) === 'ew-resize', [chart.style.cursor, rx0, ry0]);
      var rW = JSON.stringify(PR._msRaw(MPn)); rev('mousedown', rx0, ry0); rev('mouseup', rx0, ry0); await W(60);
      ok('...a click with no drag changes nothing', JSON.stringify(PR._msRaw(MPn)) === rW, [rW, JSON.stringify(PR._msRaw(MPn))]);
      var rv0 = sc.getVisibleLogicalRange(); await rdrag(rx0, ry0, rx0 - 60, ry0); await W(120);
      ok('...pressed and dragged at once: its start moves, the chart does not', PR._msRaw(MPn).zA < bT && Math.abs(sc.getVisibleLogicalRange().from - rv0.from) < 0.01, [bT, PR._msRaw(MPn).zA, rv0, sc.getVisibleLogicalRange()]); }
    R.close && R.close(); await W(100);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
