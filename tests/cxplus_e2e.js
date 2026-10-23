(async function () {
  // Nestor, 23 Oct 2026: "why does the crosshair line extend over the price scale? eliminate that. also eliminate the add alarm by
  // pressing the screen down on a phone and also by clicking the right button on the mouse, the + symbols is enough to add alarms, but
  // you need to add the + symbol on phones too". Back Testing (the engine of Live Charts), real EUR/USD of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/cxplus_e2e.js     and on a phone: E2E_MOBILE=375x812 python tests/browser_test.py tests/cxplus_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    Array.prototype.forEach.call(document.querySelectorAll('[class^="st-tour"]'), function (e) { e.remove(); });
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.look = {}; C.mini = false; C.news = false; C.max = true; C.resume = null;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._goto('12:00'); await W(500);
    var DW = P._dr(); DW.list = []; DW.sel = null; P._render(); await W(100);
    var p = P._panes()[0], pc = p.el.querySelector('.stpr-pc'), r = pc.getBoundingClientRect(), dm = P._kx(0), dpr = window.devicePixelRatio || 1;
    var px = function (x, y) { P._drawOv(0); var c = p.ov; return Array.prototype.slice.call(c.getContext('2d').getImageData(Math.round(x * dpr), Math.round(y * dpr), 1, 1).data); };
    var phone = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    var hlines = function () { return DW.list.filter(function (d) { return d.type === 'hline'; }).length; };
    var X = Math.round(dm.pw * 0.4), Y = Math.round(dm.ph * 0.45);
    if (!phone) {
      pc.dispatchEvent(new MouseEvent('mousemove', { clientX: r.left + X, clientY: r.top + Y, bubbles: true })); await W(60);
      ok('the crosshair: its line across the chart', px(dm.pw * 0.75, Y)[3] > 100 || px(dm.pw * 0.75 + 3, Y)[3] > 100, [px(dm.pw * 0.75, Y), px(dm.pw * 0.75 + 3, Y)]);
      var inScale = [6, 14, 30].map(function (dx) { return px(dm.pw + dx, Y)[3]; }), inTimes = [p.el.clientHeight - 3].map(function (yy) { return px(X, yy)[3]; });   // below the time label, which sits under the line as TradingView's
      ok('...it stops at the price scale (no dashes over it) and at the times', inScale.every(function (a) { return a < 30; }) && inTimes.every(function (a) { return a < 30; }), [inScale, inTimes]);
      pc.dispatchEvent(new MouseEvent('contextmenu', { clientX: r.left + X, clientY: r.top + Y, bubbles: true, cancelable: true, button: 2 })); await W(60);
      var ctx = p.el.querySelector('.stpr-ctx');
      ok('a right-click on the bare chart: no menu (no Add alert)', !(ctx && ctx.style.display === 'flex'), ctx && ctx.textContent);
      ok('...and no alert', hlines() === 0, hlines());
    } else {
      var t1 = new Touch({ identifier: 3, target: pc, clientX: r.left + X, clientY: r.top + Y });
      pc.dispatchEvent(new TouchEvent('touchstart', { touches: [t1], targetTouches: [t1], changedTouches: [t1], bubbles: true, cancelable: true }));
      var t2 = new Touch({ identifier: 3, target: pc, clientX: r.left + X + 4, clientY: r.top + Y + 2 });
      pc.dispatchEvent(new TouchEvent('touchmove', { touches: [t2], targetTouches: [t2], changedTouches: [t2], bubbles: true, cancelable: true }));
      pc.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [t2], bubbles: true, cancelable: true })); await W(120);
      var cy = DW.cx && DW.cx.y, plusX = dm.pw - 15;
      var cpx = cy != null ? px(plusX, cy) : null, edge = cy != null ? px(plusX + 9, cy) : null;
      ok('a phone: the crosshair where the finger was, and the + by the price - bigger, for a finger', cy != null && cpx && cpx[3] > 150 && edge && edge[3] > 100, [cy, cpx, edge]);
      var tp = new Touch({ identifier: 4, target: pc, clientX: r.left + plusX + 6, clientY: r.top + cy - 5 });   // a fingertip slightly off its centre
      pc.dispatchEvent(new TouchEvent('touchstart', { touches: [tp], targetTouches: [tp], changedTouches: [tp], bubbles: true, cancelable: true }));
      pc.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [tp], bubbles: true, cancelable: true })); await W(150);
      var L = DW.list.filter(function (d) { return d.type === 'hline'; })[0];
      ok('...a tap on the + adds an alert at that price (one line, its alert on)', hlines() === 1 && L.alert === true && Math.abs(L.price - p.series.coordinateToPrice(cy)) < 0.0002, [hlines(), L]);
      pc.dispatchEvent(new MouseEvent('contextmenu', { clientX: r.left + X, clientY: r.top + Y + 60, bubbles: true, cancelable: true, button: 2 })); await W(60);   // what a long press fires
      var ctx2 = p.el.querySelector('.stpr-ctx');
      ok('a long press on the bare chart: no menu, no second alert', !(ctx2 && ctx2.style.display === 'flex') && hlines() === 1, [ctx2 && ctx2.style.display, hlines()]);
    }
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
