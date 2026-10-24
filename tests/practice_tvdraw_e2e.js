(async function () {
  // TradingView's drawing look and functions, Back Testing / Live Charts (Nestor, 24 Oct 2026: "copy as much as you can the
  // tradingview aesthetic"): its colour grid, round blue anchors on a selected drawing and on the one under the mouse, a selected
  // drawing's prices and times on the scales, the magnet, several drawings selected with Ctrl / Shift + click and moved together,
  // and the phone's long press for the crosshair. Real EUR/USD candles of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_tvdraw_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stDrawBar); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice|^st_magnet/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    window.__stDrawBar.magnet.set(false);
    var C = P._cfg(); C.mm = Object.assign({}, C.mm, { col: true }); C.layout = 2; C.tfs = [5, 15, 60, 240]; C.mini = false; C.dtpl = {}; C.ddef = {}; C.dwHide = false; C.dwLock = false; C.news = false;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length > 1 && P._panes()[0].n && P._panes()[1].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(600);
    var pane = function (j) { return P._panes()[j || 0]; }, DW = P._dr(), DB = P._dbar(), ch = pane().el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mouseup' ? 0 : 1, view: window }, o || {}))); };
    var px = function (x, y, j) { P._drawOv(j || 0); var c = pane(j).ov, d = window.devicePixelRatio || 1; return Array.prototype.slice.call(c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data); };
    var near = function (c, rgb, tol) { return Math.abs(c[0] - rgb[0]) <= (tol || 10) && Math.abs(c[1] - rgb[1]) <= (tol || 10) && Math.abs(c[2] - rgb[2]) <= (tol || 10); };
    var ringAt = function (x, y) { for (var a = 0; a < 8; a++) { var ang = a * Math.PI / 4, c = px(x + 4.5 * Math.cos(ang), y + 4.5 * Math.sin(ang)); if (c[3] > 120 && near(c, [41, 98, 255], 45)) return true; } return false; };
    var pick = async function (tool) { if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); if (DW.tool !== tool) document.querySelector('#stpr-tools [data-tool="' + tool + '"]').click(); await W(30); };
    var click = function (x, y, o) { mev('mousedown', x, y, o); mev('mouseup', x, y, o); };
    var draw2 = async function (tool, x0, y0, x1, y1, o) { await pick(tool); click(x0, y0, o); mev('mousemove', x1, y1, o); await W(30); click(x1, y1, o); await W(80); return DW.list[DW.list.length - 1]; };
    DW.list = []; DW.hist = ['[]']; DW.hpos = 0; DW.sel = null; DW.multi = null; P._props();
    var Wd = r.width, X0 = Math.round(Wd * 0.25), X1 = Math.round(Wd * 0.45), dm = P._kx(0);

    // 7. the phone's gestures: pinch and the glide are the chart's own; a long press brings the crosshair
    var co = pane().chart.options();
    ok('pinch to zoom and the glide after a flick are on', co.kineticScroll && co.kineticScroll.touch === true && co.handleScale && (co.handleScale === true || co.handleScale.pinch !== false), [co.kineticScroll, co.handleScale]);
    DW.sel = null; DW.multi = null; DW.cx = null; P._props();
    var tch = function (type, x, y) { var t = new Touch({ identifier: 7, target: ch, clientX: r.left + x, clientY: r.top + y }); ch.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], targetTouches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true })); };
    var ex = Math.round(Wd * 0.6), ey = 200, cxs = function () { return DW.cx ? { x: Math.round(DW.cx.x), y: Math.round(DW.cx.y) } : null; };
    // the first touch on the page is slow in this headless browser (another part of the app wakes up on the first gesture):
    // one on the tools row first, then a press and a drag of the chart together, as a finger does
    var tb2 = document.getElementById('stpr-tb2'), wt = new Touch({ identifier: 3, target: tb2, clientX: 5, clientY: 5 }); tb2.dispatchEvent(new TouchEvent('touchstart', { touches: [wt], changedTouches: [wt], bubbles: true })); tb2.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [wt], bubbles: true })); await W(300);
    tch('touchstart', ex, ey); tch('touchmove', ex + 40, ey + 5); await W(500);
    ok('a finger dragging the chart: no crosshair follows it, no long press', !DW.cx && !DW.lpOn, [cxs(), !!DW.lpOn]);
    tch('touchend', ex + 40, ey + 5); await W(60);
    tch('touchstart', ex, ey); await W(560);
    ok('a long press: the crosshair comes up where the finger is, the chart holds still', DW.lpOn === pane() && DW.cx && Math.abs(DW.cx.x - ex) < 2 && pane().chart.options().handleScroll.pressedMouseMove === false, [!!DW.lpOn, cxs()]);
    tch('touchmove', ex + 30, ey - 20); await W(60);
    ok('moving the finger then moves the crosshair', DW.cx && Math.abs(DW.cx.x - (ex + 30)) < 2 && Math.abs(DW.cx.y - (ey - 20)) < 2, cxs());
    tch('touchend', ex + 30, ey - 20); await W(60);
    var hs = pane().chart.options().handleScroll;
    ok('lifted: the crosshair stays there and the chart moves again', DW.cx && Math.abs(DW.cx.x - (ex + 30)) < 2 && !DW.lpOn && hs.pressedMouseMove !== false && hs.horzTouchDrag !== false, [cxs(), hs]);
    tch('touchstart', ex - 50, ey + 30); await W(60); tch('touchend', ex - 50, ey + 30); await W(40);
    ok('the next tap clears it', !DW.cx, cxs());

    // 1. the colour grid
    var t1 = await draw2('trend', X0, 120, X1, 200);
    ok('a trend line drawn and selected', t1 && t1.type === 'trend' && DW.sel === DW.list.length - 1, t1 && t1.type);
    var bar = document.querySelector('.stdb-bar'); bar.querySelector('[data-db="line"]').click(); await W(30);
    var sw = Array.prototype.map.call(DB.pop().querySelectorAll('[data-pc]'), function (b) { return b.getAttribute('data-pc'); });
    ok("line colour: TradingView's grid - its greys, its ten colours and their tints and shades - and a row of ours (80)", sw.length === 80 && sw[0] === '#ffffff' && sw[9] === '#000000' && sw[16] === '#2962ff' && sw.indexOf('#f472b6') >= 0 && sw.indexOf('#880e4f') >= 0, [sw.length, sw[16]]);
    DB.closePop(); await W(20);

    // 2. round blue anchors on the selected drawing
    var A = { x: P._xOfT(0, t1.a.t), y: pane().series.priceToCoordinate(t1.a.price) }, B = { x: P._xOfT(0, t1.b.t), y: pane().series.priceToCoordinate(t1.b.price) };
    ok('selected: each point is a round anchor ringed in TradingView\'s blue', ringAt(A.x, A.y) && ringAt(B.x, B.y), [px(A.x + 4.5, A.y), px(B.x + 4.5, B.y)]);
    var mid = px(A.x, A.y), gr = window.__stDrawBar.groundOf(pane().chart);
    ok('hollow: its middle is the chart\'s own ground, not white', mid[3] > 120 && !near(mid, [255, 255, 255], 30), [mid, gr]);

    // 3. hovered: the drawing under the mouse shows its anchors too
    DW.sel = null; P._props(); await W(30);
    ok('nothing selected: no anchors', !ringAt(A.x, A.y));
    mev('mousemove', Math.round((A.x + B.x) / 2), Math.round((A.y + B.y) / 2), { buttons: 0 }); await W(60);
    ok('the mouse on the line: its anchors show', DW.hov === DW.list.indexOf(t1) && ringAt(A.x, A.y) && ringAt(B.x, B.y), DW.hov);
    mev('mousemove', X1 + 120, 40, { buttons: 0 }); await W(60);
    ok('the mouse off it: they go', DW.hov == null && !ringAt(A.x, A.y), DW.hov);

    // 4. a selected drawing's prices and times on the scales, in blue, the span shaded
    DW.sel = DW.list.indexOf(t1); P._props(); P._drawOv(0); await W(120);
    var ax = window.__stAxisLbl(pane().series), da = ax.get('da'), db = ax.get('db'), ta = ax.get('ta'), tb = ax.get('tb'), dg = 5;
    ok('its two prices on the price scale, blue', da && db && da.bg === '#2962ff' && db.bg === '#2962ff' && [da.p, db.p].sort().join() === [t1.a.price, t1.b.price].sort().join() && da.t === Number(da.p).toFixed(dg), [da, db]);
    ok('the span between them shaded on the price scale', ax.get('band') && Math.min(ax.get('band').p1, ax.get('band').p2) === Math.min(t1.a.price, t1.b.price), ax.get('band'));
    ok('its two times on the time scale, blue, the span shaded', ta && tb && ta.bg === '#2962ff' && /\d\d:\d\d/.test(ta.t) && Math.abs(ta.x - A.x) <= 1 && Math.abs(tb.x - B.x) <= 1 && ax.get('tband'), [ta, tb]);
    click(X1 + 150, 60); await W(150);
    ok('deselected (a click on the bare chart): the marks go', !ax.get('da') && !ax.get('db') && !ax.get('ta') && !ax.get('tb') && !ax.get('tband') && !ax.get('band'), [ax.get('da'), ax.get('ta')]);

    // 5. the magnet
    var mg = document.getElementById('stpr-magnet');
    ok('the magnet button beside Lock all, off', mg && mg.previousElementSibling.id === 'stpr-lockall' && mg.getAttribute('aria-pressed') === 'false');
    mg.click(); await W(30);
    ok('a click: on, lit, remembered in this browser', window.__stDrawBar.magnet.on() && mg.classList.contains('on') && mg.getAttribute('aria-pressed') === 'true' && localStorage.getItem('st_magnet') === '1');
    var onOHLC = function (q) { var L = P._lOfT(0, q.t), b = pane().bars[L]; return !!b && [b.open, b.high, b.low, b.close].indexOf(q.price) >= 0; };
    var t2 = await draw2('trend', X0 + 10, 160, X1 + 30, 230);
    ok('with it on, both points land on the open, high, low or close of their candles', onOHLC(t2.a) && onOHLC(t2.b), [t2.a, t2.b]);
    var t3 = await draw2('trend', X0 + 15, 280, X1 + 35, 340, { ctrlKey: true });
    ok('Ctrl held: they go where the mouse is', !(onOHLC(t3.a) && onOHLC(t3.b)), [t3.a, t3.b]);
    DW.sel = DW.list.indexOf(t2); P._props(); await W(30);
    var B2 = { x: P._xOfT(0, t2.b.t), y: pane().series.priceToCoordinate(t2.b.price) }, a20 = JSON.stringify(t2.a);
    mev('mousedown', B2.x, B2.y); mev('mousemove', B2.x + 30, B2.y + 17); await W(30); mev('mousemove', B2.x + 34, B2.y + 21); await W(30); mev('mouseup', B2.x + 34, B2.y + 21); await W(60);
    ok('dragging a point with it on: the point lands on a candle\'s price, the other stays', onOHLC(t2.b) && JSON.stringify(t2.a) === a20, t2.b);
    mg.click(); await W(20);
    ok('a click again: off', !window.__stDrawBar.magnet.on() && !mg.classList.contains('on'));

    // 6. several at once: Ctrl / Shift + click, moved together
    DW.sel = null; DW.multi = null; P._props();
    var mOf = function (d) { var a = { x: P._xOfT(0, d.a.t), y: pane().series.priceToCoordinate(d.a.price) }, b = { x: P._xOfT(0, d.b.t), y: pane().series.priceToCoordinate(d.b.price) }; return { x: Math.round(a.x + (b.x - a.x) * 0.3), y: Math.round(a.y + (b.y - a.y) * 0.3) }; };
    var m1 = mOf(t1), m3 = mOf(t3);
    click(m1.x, m1.y); await W(30);
    ok('a click selects one', DW.sel === DW.list.indexOf(t1) && !DW.multi, DW.sel);
    click(m3.x, m3.y, { ctrlKey: true }); await W(30);
    ok('Ctrl + click on another: both selected', DW.multi && DW.multi.length === 2 && DW.multi.indexOf(DW.list.indexOf(t1)) >= 0 && DW.multi.indexOf(DW.list.indexOf(t3)) >= 0 && DW.sel == null, DW.multi);
    click(mOf(t2).x, mOf(t2).y, { shiftKey: true }); await W(30);
    ok('Shift + click adds a third', DW.multi && DW.multi.length === 3, DW.multi);
    click(mOf(t2).x, mOf(t2).y, { shiftKey: true }); await W(30);
    ok('and again takes it out', DW.multi && DW.multi.length === 2 && DW.multi.indexOf(DW.list.indexOf(t2)) < 0, DW.multi);
    ok('each one selected shows its anchors', ringAt(P._xOfT(0, t1.a.t), pane().series.priceToCoordinate(t1.a.price)) && ringAt(P._xOfT(0, t3.b.t), pane().series.priceToCoordinate(t3.b.price)));
    var p1 = t1.a.price, p3 = t3.a.price, L1 = P._lOfT(0, t1.a.t), L3 = P._lOfT(0, t3.a.t);
    mev('mousedown', m1.x, m1.y); mev('mousemove', m1.x + 40, m1.y + 30); await W(30); mev('mousemove', m1.x + 44, m1.y + 34); await W(30); mev('mouseup', m1.x + 44, m1.y + 34); await W(60);
    var d1 = t1.a.price - p1, d3 = t3.a.price - p3, dl1 = P._lOfT(0, t1.a.t) - L1, dl3 = P._lOfT(0, t3.a.t) - L3;
    ok('dragging one of them moves both, by the same candles and the same price', Math.abs(d1) > 0 && Math.abs(d1 - d3) < 1e-9 && dl1 > 0 && dl1 === dl3 && DW.multi && DW.multi.length === 2, [d1, d3, dl1, dl3]);
    ok('one step back undoes the move of both', (P._undo ? (P._undo(), true) : (document.getElementById('stpr-undo').click(), true)) && (await W(60), true) && Math.abs(DW.list[0].a.price - p1) < 1e-9, DW.list[0] && DW.list[0].a.price);

  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
