(async function () {
  // The Path on a phone (Nestor, 22 Oct 2026: "the hardest thing is to stop drawing as when i try to click on it to stop drawing i cant
  // quite hit the arrow head with my finger and it just keeps drawing lines"): a tap near the last point (a fingertip away) ends it, and
  // a Done button on the chart ends it too, while a path is drawn by touch. Back Testing on real EUR/USD of Thu 1 Oct 2026, then Trade
  // Replay with a made-up EUR/USD short (signed out). Taps are real touch events.
  // Run: E2E_MOBILE=375x812 python tests/browser_test.py tests/path_touch_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var tapAt = async function (el, r, x, y) { var t = new Touch({ identifier: Date.now() % 100000, target: el, clientX: r.left + x, clientY: r.top + y });
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [t], targetTouches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
    el.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [t], bubbles: true, cancelable: true })); await W(140); };
  var vis = function (b) { return !!b && b.style.display !== 'none' && b.offsetWidth > 0; };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stDrawBar && window.__stReplay); i++) await W(100);
    await W(1000);
    Array.prototype.forEach.call(document.querySelectorAll('[class^="st-tour"]'), function (e) { e.remove(); });
    // ================= Back Testing =================
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15, 5, 60, 240]; C.mini = false; C.news = false; C.resume = null; C.dtpl = {}; C.ddef = {};
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(600);
    var DW = P._dr(); DW.list = []; DW.hist = ['[]']; DW.hpos = 0; DW.sel = null;
    if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); await W(200);
    var pane = P._panes()[0], ch = pane.el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect(), w = r.width, h = r.height;
    document.querySelector('#stpr-tools [data-tool="path"]').click(); await W(60);
    await tapAt(ch, r, w * 0.15, h * 0.6); await tapAt(ch, r, w * 0.4, h * 0.35);
    var ok1 = pane.el.querySelector('.stpr-pathok');
    ok('Back Testing, a path by touch: a Done button on the chart while it is drawn', vis(ok1) && /Done/.test(ok1.textContent), ok1 && [ok1.style.display, ok1.textContent]);
    var br = ok1.getBoundingClientRect(), pb = pane.el.getBoundingClientRect();
    ok('...at the bottom middle of the chart, above the times', br.bottom < r.bottom - 10 && Math.abs((br.left + br.right) / 2 - (pb.left + P._kx(0).pw / 2)) < 4, [br.left, br.right, br.bottom, r.bottom]);
    await tapAt(ch, r, w * 0.6, h * 0.55);
    // the finger lands 15 px off the last point: it still ends it (a mouse needs 6)
    await tapAt(ch, r, w * 0.6 + 11, h * 0.55 + 10);
    var pa = DW.list[DW.list.length - 1];
    ok('a tap about a fingertip (15 px) from the last point ends it: 3 points, no stray leg', pa && pa.type === 'path' && pa.pts.length === 3 && !DW.pending && DW.tool === 'none', pa && pa.pts.length);
    ok('...and the Done button goes', !vis(ok1), ok1.style.display);
    document.querySelector('#stpr-tools [data-tool="path"]').click(); await W(60);
    await tapAt(ch, r, w * 0.2, h * 0.3); await tapAt(ch, r, w * 0.45, h * 0.5); await tapAt(ch, r, w * 0.7, h * 0.25);
    var ok2 = pane.el.querySelector('.stpr-pathok'), b2 = ok2.getBoundingClientRect(); await tapAt(ok2, b2, b2.width / 2, b2.height / 2);
    var pb2 = DW.list[DW.list.length - 1];
    ok('Done ends it where it is: 3 points, the tap on Done added none', DW.list.length === 2 && pb2.pts.length === 3 && !DW.pending && DW.tool === 'none' && !vis(ok2), [DW.list.map(function (d) { return d.type + ':' + (d.pts || []).length + ':' + JSON.stringify((d.pts || [])[0]); }), DW.tool, !!DW.pending]);
    try { P.close(); } catch (e) {}
    await W(400);
    // ================= Trade Replay =================
    var R = window.__stReplay, PC = window.__stPractice._cfg(); PC.dtpl = {}; PC.ddef = {};
    try { localStorage.removeItem('st_replay_draw2_999999908'); localStorage.removeItem('st_replay_tgrp'); } catch (e) {}
    R.open({ mt5Ticket: 999999908, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 });
    for (k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(900);
    var S = R._s(); S.drawings = []; S.history = [[]]; S.hpos = 0; S.sel = null;
    var db = document.getElementById('strp-drawbtn'); if (db && !document.getElementById('strp-tb').classList.contains('strp-drawopen')) db.click(); await W(150);
    var rc = document.getElementById('strp-chart'), rr = rc.getBoundingClientRect(), rw = rr.width, rh = rr.height;
    document.querySelector('#strp-tools [data-tool="path"]').click(); await W(60);
    await tapAt(rc, rr, rw * 0.2, rh * 0.6); await tapAt(rc, rr, rw * 0.45, rh * 0.35); await W(100);
    var rok = document.getElementById('strp-pathok');
    ok('Trade Replay, a path by touch: its Done button on the chart', vis(rok), rok && rok.style.display);
    var rb = rok.getBoundingClientRect();
    ok('...inside the chart, at the bottom middle', rb.top > rr.top && rb.bottom < rr.bottom && rb.left > rr.left && rb.right < rr.right, [rb.top, rb.bottom, rr.top, rr.bottom]);
    await tapAt(rok, rb, rb.width / 2, rb.height / 2);
    var rp = S.drawings[S.drawings.length - 1];
    ok('...Done ends it: 2 points', rp && rp.type === 'path' && rp.pts.length === 2 && !S.pending && S.activeTool === 'none' && !vis(rok), rp && rp.pts);
    document.querySelector('#strp-tools [data-tool="path"]').click(); await W(60);
    await tapAt(rc, rr, rw * 0.25, rh * 0.3); await tapAt(rc, rr, rw * 0.5, rh * 0.5); await tapAt(rc, rr, rw * 0.5 + 12, rh * 0.5 - 12);
    var rq = S.drawings[S.drawings.length - 1];
    ok('...a tap a fingertip from the last point ends it too', S.drawings.length === 2 && rq.pts.length === 2 && !S.pending, [S.drawings.length, rq && rq.pts.length]);
    try { R.close(); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
