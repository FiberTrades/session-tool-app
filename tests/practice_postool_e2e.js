(async function () {
  // Practice Replay, Nestor 17 Oct 2026: "can i have the option to draw position tools on the charts as objects?" (TradingView's
  // Long / Short Position), "how do i deal with old objects drawn in the charts? how to delete them?" (Remove all drawings)
  // and "how do i save practise sessions" (it opens where it was left, with that day's trades). Real EUR/USD, Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_postool_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.look = {}; C.mini = false; C.max = true; C.stopPx = { EURUSD: 0.0010 }; C.stopUnit = 'pips'; C.tgtUnit = 'R'; C.tgtR = 2; C.tgtOn = true; C.mm = Object.assign({}, C.mm, { col: true, minSL: {}, maxSL: {} }); C.resume = null;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('12:00'); await W(500);
    var pane = function () { return P._panes()[0]; }, DW = P._dr(); DW.list = []; DW.sel = null; P._render();
    var ch = pane().el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0 }, o || {}))); };
    var px = function (x, y) { var c = pane().ov, d = window.devicePixelRatio || 1; return Array.prototype.slice.call(c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data); };
    var near = function (a, b, e) { return Math.abs(a - b) < (e || 1e-7); };
    var until = async function (f, ms) { for (var u = 0; u < (ms || 1500); u += 40) { if (f()) return true; await W(40); } return !!f(); };   // the overlay redraws on the next frame: wait for it, not a fixed time

    document.getElementById('stpr-drawbtn').click(); await W(20);
    var lb = document.querySelector('#stpr-tools [data-tool="long"]'), sb = document.querySelector('#stpr-tools [data-tool="short"]');
    ok('Long position and Short position in the drawing tools, after Text and Emoji', lb && sb && lb.title === 'Long position' && sb.title === 'Short position' && lb.previousElementSibling.getAttribute('data-tool') === 'emoji');
    var X = Math.round(r.width * 0.45), Y = Math.round(r.height * 0.45);
    lb.click(); mev('mousedown', X, Y); mev('mouseup', X, Y); await W(60);
    var d = DW.list[0], B = pane().bars, La = P._lOfT(0, d && d.a.t), Lb = P._lOfT(0, d && d.b.t);
    ok('one click places a long: the entry there, his stop below (10 pips), the target 2R above, 20 candles wide; it stays selected', d && d.type === 'long' && near(d.a.price - d.sl, 0.0010, 1e-9) && near(d.tp - d.a.price, 0.0020, 1e-9) && Math.round(Lb - La) === 20 && DW.sel === 0 && DW.tool === 'none', d);
    P._render(); await W(60);
    var xe = P._xOfT(0, d.a.t), xr = P._xOfT(0, d.b.t), ye = P._yOf(0, d.a.price), yt = P._yOf(0, d.tp), ys = P._yOf(0, d.sl), xm = (xe + xr) / 2 + 30;
    var gpx = px(xm, (ye + yt) / 2 + 22), rpx = px(xm, (ye + ys) / 2 + 3);
    ok('drawn: green above the entry, red below', gpx[1] > gpx[0] && gpx[3] > 20 && rpx[0] > rpx[1] && rpx[3] > 20, [gpx, rpx]);
    P._dbar().open('more'); await W(30); var box = P._dbar().pop();
    ok('its toolbar\'s More: LONG POSITION, the stop in pips and the target in R; no colours in its toolbar', box && /LONG POSITION/.test(box.textContent) && box.querySelector('[data-pstop]').value === '10.0' && box.querySelector('[data-ptgt]').value === '2.00' && !document.querySelector('.stdb-bar [data-db="line"]'), box && box.textContent);
    var ps = box.querySelector('[data-pstop]'); ps.value = '15'; ps.dispatchEvent(new Event('input', { bubbles: true })); var pt = box.querySelector('[data-ptgt]'); pt.value = '3'; pt.dispatchEvent(new Event('input', { bubbles: true })); await W(30);
    ok('typing a 15 pip stop and 3R: the stop and target move', near(d.a.price - d.sl, 0.0015, 1e-9) && near(d.tp - d.a.price, 0.0045, 1e-9), [d.sl, d.tp]);
    P._dbar().closePop();
    P._render(); await W(40); ys = P._yOf(0, d.sl); yt = P._yOf(0, d.tp); ye = P._yOf(0, d.a.price);
    var sl0 = d.sl; mev('mousedown', xe, ys); mev('mousemove', xe, ys + 30, { held: true }); mev('mouseup', xe, ys + 30); await W(40);
    ok('its stop handle drags the stop', d.sl < sl0, [sl0, d.sl]);
    var tp0 = d.tp; P._render(); await W(200); yt = P._yOf(0, d.tp); xe = P._xOfT(0, d.a.t); mev('mousedown', xe, yt); mev('mousemove', xe, yt - 25, { held: true }); mev('mouseup', xe, yt - 25); await W(40);
    ok('its target handle drags the target', d.tp > tp0, [tp0, d.tp]);
    var bt0 = d.b.t; P._render(); xr = P._xOfT(0, d.b.t); ye = P._yOf(0, d.a.price); mev('mousedown', xr, ye); mev('mousemove', xr + 60, ye, { held: true }); mev('mouseup', xr + 60, ye); await W(40);
    ok('its right edge drags its width', d.b.t > bt0, [bt0, d.b.t]);
    var a0 = d.a.price, s0 = d.sl, t0 = d.tp; P._render(); var yb = (P._yOf(0, d.a.price) + P._yOf(0, d.tp)) / 2, xb = (P._xOfT(0, d.a.t) + P._xOfT(0, d.b.t)) / 2;
    mev('mousedown', xb, yb); mev('mousemove', xb + 20, yb + 40, { held: true }); mev('mouseup', xb + 20, yb + 40); await W(40);
    ok('dragged by its body, the entry, stop and target move together', d.a.price < a0 && near(a0 - d.a.price, s0 - d.sl, 1e-9) && near(a0 - d.a.price, t0 - d.tp, 1e-9), [a0, d.a.price, s0, d.sl]);
    sb = document.querySelector('#stpr-tools [data-tool="short"]'); if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click();
    sb.click(); mev('mousedown', X - 200, Y - 60); mev('mouseup', X - 200, Y - 60); await W(60);
    var e2 = DW.list[1];
    ok('a short: the stop above, the target below', e2 && e2.type === 'short' && e2.sl > e2.a.price && e2.tp < e2.a.price, e2);
    var st = JSON.parse(localStorage.getItem('st_practice_draw2:EURUSD') || '[]');
    ok('both kept with the drawings (synced like them)', st.length === 2 && st[0].type === 'long' && st[1].type === 'short');

    // its tags (Nestor, 17 Oct 2026: "i want to be able to see them only on hover or when clicking on the object and not when
    // dragging it") and its options box ("when i am dragging it the settings panel opens and ruins the visibility")
    var e1 = DW.list[0]; DW.sel = null; DW.multi = null; DW.hov = null; P._render(); await W(120);
    var tagPx = function (dd) { var pz0 = { x0: P._xOfT(0, dd.a.t), x1: P._xOfT(0, dd.b.t), yt: P._yOf(0, dd.tp), ye: P._yOf(0, dd.a.price) }, yy = pz0.yt + (pz0.yt < pz0.ye ? -12 : 12) - 7;
      return px((pz0.x0 + pz0.x1) / 2, yy); };
    var isTag = function (c) { return c[1] > 130 && c[0] < 90 && c[3] > 200; };
    ok('not selected, not under the mouse: no Target / Stop / Risk/reward tags', !isTag(tagPx(e1)), tagPx(e1));
    var hx = (P._xOfT(0, e1.a.t) + P._xOfT(0, e1.b.t)) / 2, hy = (P._yOf(0, e1.a.price) + P._yOf(0, e1.tp)) / 2;
    mev('mousemove', hx, hy); await until(function () { return isTag(tagPx(e1)); });
    ok('the mouse over it: the tags show', DW.hov === 0 && isTag(tagPx(e1)), [DW.hov, tagPx(e1)]);
    mev('mousemove', 20, 20); await until(function () { return !isTag(tagPx(e1)); });
    ok('the mouse off it: gone again', !isTag(tagPx(e1)));
    mev('mousedown', hx, hy); mev('mouseup', hx, hy); await until(function () { return isTag(tagPx(e1)); });
    var box2 = document.querySelector('.stdb-bar');
    ok('clicked: selected, its tags and its options box show', DW.sel === 0 && isTag(tagPx(e1)) && box2 && box2.style.display !== 'none', [DW.sel, box2 && box2.style.display]);
    mev('mousedown', hx, hy); mev('mousemove', hx + 25, hy + 20, { held: true }); await W(120);
    ok('dragged: no tags and no options box while it moves', !!DW.drag && !isTag(tagPx(e1)) && box2.style.display === 'none', [!!DW.drag, box2.style.display]);
    mev('mouseup', hx + 25, hy + 20); await W(120);
    ok('let go after a drag: the box stays closed (a click opens it)', !DW.drag && box2.style.display === 'none' && DW.sel === 0);
    hx = (P._xOfT(0, e1.a.t) + P._xOfT(0, e1.b.t)) / 2; hy = (P._yOf(0, e1.a.price) + P._yOf(0, e1.tp)) / 2;
    mev('mousedown', hx, hy); mev('mouseup', hx, hy); await W(120);
    ok('a click on it: the box opens', box2.style.display !== 'none');
    // a zoom (the window's pixel ratio and size change together): the overlay keeps its size on screen
    var ovc = pane().ov, wcss = ovc.style.width; ovc.style.width = (parseFloat(wcss) / 2) + 'px'; DW.ver++; await until(function () { return ovc.style.width === wcss; });
    ok('the overlay always fills its chart (a zoom keeps the bitmap size but not the size on screen)', ovc.style.width === wcss, [wcss, ovc.style.width]);
    // Remove all drawings: the bin with nothing selected
    mev('mousedown', 20, r.height - 60); mev('mouseup', 20, r.height - 60); await W(30); DW.sel = null; P._render(); await W(20);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(20);
    var del = document.getElementById('stpr-del');
    ok('with nothing selected the bin reads Remove all drawings', del && !del.disabled && del.title === 'Remove all drawings', del && [del.disabled, del.title]);
    del.click(); await W(40); var mn = document.getElementById('stpr-menu');
    ok('it asks first: Remove all drawings (2), every day of this symbol, Undo brings them back', mn.classList.contains('show') && /Remove all drawings \(2\)/.test(mn.textContent) && /Undo/.test(mn.textContent), mn.textContent);
    mn.querySelector('[data-delall]').click(); await W(40);
    ok('removed, and it says so', DW.list.length === 0 && /2 drawings removed/.test(document.getElementById('stpr-flash').textContent));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })); await W(40);
    ok('Undo brings them back', DW.list.length === 2);

    // a sitting: a trade, then closed; opened again it comes back to the same moment with the trade on the chart
    P._exec(true); P._aim(P._px() - 0.0012); await W(30); P._fire(); await W(40);
    for (k = 0; k < 6; k++) P._step(); await W(100);
    var hadPos = !!P._s().pos, at0 = P._s().now;
    var lt = (P.log() || []).slice(-1)[0];
    ok('a practice trade keeps what the log table shows: its stop, target, exit, distance, how far it ran and its risk', !lt || (lt.sl != null && lt.tp != null && lt.exit != null && lt.dist != null && lt.mfe != null && ('rm' in lt)), lt);
    P.close(); await W(300);
    ok('closing keeps where it was (the symbol, the day, the moment)', C.resume && C.resume.sym === 'EURUSD' && C.resume.day === '2026-10-01' && C.resume.now === at0, C.resume);
    P.open(); for (k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100); await W(400);
    var S2 = P._s();
    ok('opened again: the same day and moment, that sitting\'s trade on the chart, and it says so', S2 && S2.day === '2026-10-01' && S2.now === at0 && S2.trades.length === 1 && /Back where you left off/.test(document.getElementById('stpr-flash').textContent), S2 && [S2.day, S2.now, at0, S2.trades.length, document.getElementById('stpr-flash').textContent]);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
