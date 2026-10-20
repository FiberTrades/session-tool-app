(async function () {
  // The price and time scales belong to the chart, and a locked drawing's padlock (Nestor, 20 Oct 2026: "can the lock on the object
  // look like these lock on the bar menu? also dont be touching the object and also i i click on the price scale and drag dont around
  // where the object is the object tells me it can be moved instead of the chart scaling? fix this the chart shouldnt extend beyong
  // into the horizontal or vertical scales"). Charts (Replay engine, real EUR/USD Thu 1 Oct 2026) and Trade Replay.
  // Run: python tests/browser_test.py tests/scale_hit_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  // every roundRect the overlays draw (the padlock's body is one; nothing else in a plain chart uses it)
  var RR = [], orr = CanvasRenderingContext2D.prototype.roundRect;
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { RR.push({ c: this.canvas, x: x, y: y, w: w, h: h, s: String(this.strokeStyle) }); return orr.apply(this, arguments); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stReplay && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.look = {}; C.mini = false; C.max = true; C.resume = null; C.cmp = []; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._goto('12:00'); await W(500);
    var pane = function () { return P._panes()[0]; }, DW = P._dr(), ch = pane().el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0 }, o || {}))); };
    var psw = pane().chart.priceScale('right').width(), th = pane().chart.timeScale().height(), pw = r.width - psw, ph = r.height - th;
    var px = P._s().base.filter(function (b) { return b.time < P._s().now; }).pop().close, t0 = P._s().now - 20 * 900;
    // a box from 20 candles back to well past the right edge, and a vertical line
    var top = +(px + 0.0008).toFixed(5), bot = +(px - 0.0008).toFixed(5);
    DW.list = [{ type: 'rect', a: { t: t0, price: top }, b: { t: P._s().now + 400 * 900, price: bot } }, { type: 'vline', a: { t: P._s().now - 8 * 900, price: px } }]; DW.sel = null; P._render(); await W(150);
    var yT = P._yOf(0, top), bb = P._bbox(0, DW.list[0]), xv = P._bbox(0, DW.list[1]).x0;
    ok('(the box reaches the price scale)', bb && bb.x1 >= pw - 1 && yT > 30 && yT < ph - 30, [bb && Math.round(bb.x1), Math.round(pw), Math.round(yT)]);
    ok('on the chart, the box\'s top edge is under the mouse', !!P._hit(0, pw - 30, yT));
    ok('on the price scale, level with it, nothing is', P._hit(0, pw + 12, yT) === null && P._hit(0, pw + 2, yT) === null);
    ok('the vertical line: on the chart yes, on the time scale under it no', !!P._hit(0, xv, ph - 30) && P._hit(0, xv, ph + 8) === null);
    mev('mousemove', pw - 30, yT); await W(30); var cIn = ch.style.cursor;
    mev('mousemove', pw + 12, yT); await W(30); var cPs = ch.style.cursor;
    mev('mousemove', xv, ph + 8); await W(30); var cTs = ch.style.cursor;
    ok('the mouse: move on the box, the price scale\'s up-down cursor over the scale (not move), the time scale\'s sideways one', cIn === 'move' && cPs === 'ns-resize' && cTs === 'ew-resize', [cIn, cPs, cTs]);
    var a0 = JSON.stringify(DW.list[0]);
    mev('mousedown', pw + 12, yT); mev('mousemove', pw + 12, yT + 40, { held: true }); mev('mousemove', pw + 12, yT + 80, { held: true }); mev('mouseup', pw + 12, yT + 80); await W(80);
    ok('a drag on the price scale where the box is: the box stays, nothing is picked (the scale gets the drag)', JSON.stringify(DW.list[0]) === a0 && DW.sel == null && !DW.drag, [DW.sel, JSON.stringify(DW.list[0]) === a0]);
    mev('mousedown', xv, ph + 8); mev('mousemove', xv + 60, ph + 8, { held: true }); mev('mouseup', xv + 60, ph + 8); await W(80);
    ok('...and on the time scale under the vertical line: it stays', DW.list[1].a.t === P._s().now - 8 * 900 && DW.sel == null);
    // the padlock: the toolbar's, clear of the drawing
    DW.list[0].lock = true; DW.sel = 0; RR.length = 0; P._render(); await W(150);
    var mine = RR.filter(function (q) { return q.c === pane().ov && Math.abs(q.w - 8.8) < 0.01; }), pink = mine.filter(function (q) { return /f472b6/i.test(q.s); })[0];
    ok('locked and picked: the toolbar\'s padlock (an outlined body, a dark edge under the pink)', mine.length >= 2 && pink && Math.abs(pink.h - 6.4) < 0.01, mine.length);
    ok('...above the box\'s top right, clear of it (a gap of 6 px) and off the price scale', pink && pink.y + pink.h <= yT - 5.5 && pink.x + pink.w <= pw - 5.5 && pink.x + pink.w >= pw - 8, pink && [+(pink.y + pink.h).toFixed(1), +yT.toFixed(1), +(pink.x + pink.w).toFixed(1), Math.round(pw)]);
    // no room above: under it
    var hi = pane().series.coordinateToPrice(6), lo = pane().series.coordinateToPrice(70);
    DW.list[0].a.price = hi; DW.list[0].b.price = lo; RR.length = 0; P._render(); await W(150);
    var yB = P._yOf(0, lo); pink = RR.filter(function (q) { return q.c === pane().ov && Math.abs(q.w - 8.8) < 0.01 && /f472b6/i.test(q.s); })[0];
    ok('a box at the very top: the padlock goes under it, clear of it', pink && pink.y - 1.6 >= yB + 5.5, pink && [+(pink.y - 1.6).toFixed(1), +yB.toFixed(1)]);
    DW.list = []; DW.sel = null; P._render();
    try { P.close(); } catch (e) {} await W(200);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}

    // ---- Trade Replay ----
    var R = window.__stReplay;
    var trade = { mt5Ticket: 999999903, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 };
    try { localStorage.removeItem('st_replay_draw2_999999903'); } catch (e) {}
    R.open(trade); for (k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(800);
    var S = R._s(), chart = document.getElementById('strp-chart'), r2 = chart.getBoundingClientRect(), XK = R._kx();
    var mev2 = function (t, xx, yy, o) { var el = document.elementFromPoint(r2.left + xx, r2.top + yy) || chart; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r2.left + xx, clientY: r2.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0 }, o || {}))); };
    var ya = R._P({ idx: 0, price: trade.entryPrice }).y, yb = R._P({ idx: 0, price: trade.closePrice }).y;
    var pm = trade.entryPrice + (XK.ph / 2 - ya) / ((ya - yb) / (trade.entryPrice - trade.closePrice));   // the price halfway down the chart
    S.drawings = [{ type: 'hline', price: pm }]; S.sel = null; await W(200);
    var yh = R._P({ idx: 0, price: pm }).y;
    ok('Trade Replay: a horizontal line takes the mouse on the chart, not on the price scale', !!R._hit(XK.pw - 30, yh) && R._hit(XK.pw + 12, yh) === null, [Math.round(yh), Math.round(XK.pw), Math.round(XK.ph)]);
    mev2('mousemove', XK.pw + 12, yh); await W(40); var cR = chart.style.cursor;
    var p0 = S.drawings[0].price; mev2('mousedown', XK.pw + 12, yh); mev2('mousemove', XK.pw + 12, yh + 50, { held: true }); mev2('mouseup', XK.pw + 12, yh + 50); await W(80);
    ok('...over the scale the up-down cursor, and a drag there leaves the line where it is', cR === 'ns-resize' && S.drawings[0].price === p0 && S.sel == null, [cR, p0, S.drawings[0].price]);
    S.drawings[0].lock = true; S.sel = 0; RR.length = 0; await W(250);
    pink = RR.filter(function (q) { return q.c === document.getElementById('strp-ov') && Math.abs(q.w - 8.8) < 0.01 && /f472b6/i.test(q.s); }).pop();
    ok('...and its padlock is the toolbar\'s, above the line with a gap', pink && pink.y + pink.h <= yh - 5.5 && pink.x + pink.w <= XK.pw - 5.5, pink && [+(pink.y + pink.h).toFixed(1), +yh.toFixed(1)]);
    S.drawings = []; S.sel = null;
    try { R.close(); } catch (e) {}
    try { localStorage.removeItem('st_replay_draw2_999999903'); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  CanvasRenderingContext2D.prototype.roundRect = orr;
  return JSON.stringify(out);
})()
