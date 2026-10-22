(async function () {
  // TradingView's Path (Nestor, 22 Oct 2026: "can i also get this tool /object please?"): click point by point, a click on the
  // last point again (a double-click) ends it, as do Enter, Esc and a right-click; straight legs, an arrowhead at the last point,
  // each point draggable, the whole of it moved by a leg. Back Testing (the engine of Live Charts too) on real EUR/USD of
  // Thu 1 Oct 2026, then Trade Replay with a made-up EUR/USD short (signed out: nothing read from or written to a journal).
  // Run: python tests/browser_test.py tests/path_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var near = function (c, rgb, tol) { return Math.abs(c[0] - rgb[0]) <= (tol || 12) && Math.abs(c[1] - rgb[1]) <= (tol || 12) && Math.abs(c[2] - rgb[2]) <= (tol || 12); };
  var BLUE = [96, 165, 250];
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stDrawBar && window.__stReplay); i++) await W(100);
    await W(1000);
    // ================= Back Testing =================
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.mm = Object.assign({}, C.mm, { col: true }); C.layout = 1; C.tfs = [15, 5, 60, 240]; C.mini = false; C.dtpl = {}; C.ddef = {}; C.dwHide = false; C.dwLock = false; C.news = false; C.max = true; C.resume = null;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(600);
    var DW = P._dr(), pane = P._panes()[0], ch = pane.el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0 }, o || {}))); };
    var click = function (x, y) { mev('mousedown', x, y); mev('mouseup', x, y); };
    var px = function (x, y) { DW.cx = null; P._drawOv(0); var c = pane.ov, d = window.devicePixelRatio || 1; return Array.prototype.slice.call(c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data); };
    var nearBy = function (x, y, rgb, tol) { for (var dx = -2; dx <= 2; dx++) for (var dy = -2; dy <= 2; dy++) { var c = px(Math.round(x) + dx, Math.round(y) + dy); if (c[3] > 150 && near(c, rgb, tol)) return true; } return false; };
    var key = function (k) { var e = new KeyboardEvent("keydown", { key: k, code: k, bubbles: true, cancelable: true }); document.dispatchEvent(e); return e; };
    var pick = async function (tool) { if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); if (DW.tool !== tool) document.querySelector('#stpr-tools [data-tool="' + tool + '"]').click(); await W(30); };
    var XY = function (q) { return { x: P._xOfT(0, q.t), y: P._yOf(0, q.price) }; };
    DW.list = []; DW.hist = ['[]']; DW.hpos = 0; DW.sel = null; P._props();
    var X = Math.round(r.width * 0.3);

    document.getElementById('stpr-drawbtn').click(); await W(40);
    var tools = document.getElementById('stpr-tools'); tools.querySelector('[data-tgrp="lines"]').click(); await W(40);
    var fl = tools.querySelector('.stpr-tg[data-grp="lines"] .stpr-tfl'), names = Array.prototype.map.call(fl.querySelectorAll('[data-tool]'), function (b) { return b.textContent; });
    ok('Back Testing: Path in the line tools, after Arrow', names.indexOf('Path') === names.indexOf('Arrow') + 1, names.join('|'));
    fl.querySelector('[data-tool="path"]').click(); await W(40);
    ok('...picked: the tool is on, the group button shows it', DW.tool === 'path' && /^Path/.test(tools.querySelector('[data-gtool="lines"]').title), [DW.tool, tools.querySelector('[data-gtool="lines"]').title]);

    // click, click, click, then a double-click on the fourth point
    click(X, 300); mev('mousemove', X + 60, 200); await W(30);
    ok('one click: drawing, a leg following the mouse', DW.pending && DW.pending.type === 'path' && DW.pending.pts.length === 2, DW.pending && DW.pending.pts.length);
    click(X + 60, 200); mev('mousemove', X + 120, 260); click(X + 120, 260); mev('mousemove', X + 180, 150); await W(30);
    ok('three clicks: three points and the live one; still drawing', DW.pending && DW.pending.pts.length === 4 && !DW.list.length, DW.pending && DW.pending.pts.length);
    click(X + 180, 150); click(X + 180, 150); mev('dblclick', X + 180, 150, { detail: 2 }); await W(80);
    var pa = DW.list[DW.list.length - 1];
    ok('a double-click on the fourth point ends it: 4 points, selected, the tool put down', pa && pa.type === 'path' && pa.pts.length === 4 && DW.sel === DW.list.length - 1 && !DW.pending && DW.tool === 'none', pa && pa.pts.length);
    var q = pa.pts.map(XY);
    ok('...its points where the clicks were', Math.abs(q[0].x - X) < 10 && Math.abs(q[0].y - 300) < 3 && Math.abs(q[3].x - (X + 180)) < 10 && Math.abs(q[3].y - 150) < 3, q);
    DW.sel = null; P._props(); await W(30);
    var legMid = { x: (q[1].x + q[2].x) / 2, y: (q[1].y + q[2].y) / 2 }, ang = Math.atan2(q[3].y - q[2].y, q[3].x - q[2].x);
    ok('straight legs in blue (the middle of the second leg)', nearBy(legMid.x, legMid.y, BLUE), px(legMid.x, legMid.y));
    var hd = px(Math.round(q[3].x - Math.cos(ang) * 6), Math.round(q[3].y - Math.sin(ang) * 6)), sd = px(Math.round(q[3].x - Math.cos(ang) * 9 + Math.sin(ang) * 3.5), Math.round(q[3].y - Math.sin(ang) * 9 - Math.cos(ang) * 3.5));
    ok('a filled arrowhead at the last point', near(hd, BLUE, 16) && near(sd, BLUE, 30), [hd, sd]);
    var h1 = P._hit(0, q[1].x, q[1].y), hb = P._hit(0, legMid.x, legMid.y);
    ok('pressing a point takes that point (p1); a leg takes the whole of it', h1 && h1.part === 'p1' && hb && hb.part === 'body' && DW.list[hb.i] === pa, [h1, hb]);

    // drag the second point, then the whole of it
    var t2 = pa.pts[2].t, pr2 = pa.pts[2].price;
    mev('mousedown', q[1].x, q[1].y); mev('mousemove', q[1].x + 30, q[1].y - 40, { held: true }); mev('mousemove', q[1].x + 30, q[1].y - 40, { held: true }); mev('mouseup', q[1].x + 30, q[1].y - 40); await W(60);
    var n1 = XY(pa.pts[1]);
    ok('dragging point 2 moves it alone', Math.abs(n1.y - (q[1].y - 40)) < 3 && Math.abs(n1.x - (q[1].x + 30)) < 10 && pa.pts[2].t === t2 && pa.pts[2].price === pr2, [n1, q[1]]);
    var q0 = pa.pts.map(XY), lm = { x: (q0[2].x + q0[3].x) / 2, y: (q0[2].y + q0[3].y) / 2 };
    mev('mousedown', lm.x, lm.y); mev('mousemove', lm.x - 40, lm.y + 30, { held: true }); mev('mousemove', lm.x - 40, lm.y + 30, { held: true }); mev('mouseup', lm.x - 40, lm.y + 30); await W(60);
    var q1 = pa.pts.map(XY), dys = q1.map(function (z, k) { return Math.round(z.y - q0[k].y); });
    ok('dragging a leg moves every point the same', dys.every(function (d) { return Math.abs(d - 30) < 3; }) && q1.every(function (z, k) { return Math.abs((z.x - q0[k].x) - (q1[0].x - q0[0].x)) < 1; }), dys);
    ok('its toolbar: Templates, colour, width, line style, Visibility, lock, delete, More', (function () { var b = document.querySelector('.stdb-bar'); return b && Array.prototype.map.call(b.querySelectorAll('[data-db]'), function (x) { return x.getAttribute('data-db'); }).join(',') === 'tpl,line,width,dash,vis,lock,del,more'; })(), (function () { var b = document.querySelector('.stdb-bar'); return b && Array.prototype.map.call(b.querySelectorAll('[data-db]'), function (x) { return x.getAttribute('data-db'); }).join(','); })());

    // Enter ends it, Esc ends it, a right-click ends it; one point only is no path
    var n0 = DW.list.length; await pick('path'); click(X, 120); mev('mousemove', X + 50, 90); click(X + 50, 90); mev('mousemove', X + 90, 130); key('Enter'); await W(40);
    ok('Enter ends it at the last click (2 points)', DW.list.length === n0 + 1 && DW.list[n0].pts.length === 2 && !DW.pending && DW.tool === 'none', DW.list[n0] && DW.list[n0].pts.length);
    await pick('path'); click(X, 380); mev('mousemove', X + 50, 350); click(X + 50, 350); click(X + 100, 380); mev('mousemove', X + 140, 330); key('Escape'); await W(40);
    ok('Esc ends it too, keeping its points (3)', DW.list.length === n0 + 2 && DW.list[n0 + 1].pts.length === 3 && !DW.pending, DW.list[n0 + 1] && DW.list[n0 + 1].pts.length);
    await pick('path'); click(X + 200, 380); mev('mousemove', X + 240, 350); click(X + 240, 350); mev('mousemove', X + 280, 300);
    mev('contextmenu', X + 280, 300, { button: 2 }); await W(40);
    ok('a right-click ends it too (2 points), no menu', DW.list.length === n0 + 3 && DW.list[n0 + 2].pts.length === 2 && !DW.pending && DW.tool === 'none', DW.list.length);
    await pick('path'); click(X + 300, 200); click(X + 300, 200); await W(40);
    ok('a double-click with no second point: nothing drawn, the tool put down', DW.list.length === n0 + 3 && !DW.pending && DW.tool === 'none', DW.list.length);
    DW.sel = n0; P._props(); await W(20); document.querySelector('.stdb-bar [data-db="del"]').click(); await W(40);
    ok('deleted with its toolbar\'s bin; Undo brings it back', DW.list.length === n0 + 2 && (document.getElementById('stpr-undo').click(), DW.list.length === n0 + 3), DW.list.length);
    try { window.__stPractice.close(); } catch (e) {}
    await W(400);

    // ================= Trade Replay =================
    var R = window.__stReplay, PC = window.__stPractice._cfg();
    try { localStorage.removeItem('st_replay_draw2_999999907'); localStorage.removeItem('st_replay_dwhide'); localStorage.removeItem('st_replay_dwlock'); localStorage.removeItem('st_replay_tgrp'); } catch (e) {}
    PC.dtpl = {}; PC.ddef = {};
    var trade = { mt5Ticket: 999999907, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 };
    R.open(trade); for (k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(900);
    var S = R._s(); S.drawings = []; S.history = [[]]; S.hpos = 0; S.sel = null;
    var rc = document.getElementById('strp-chart'), rr = rc.getBoundingClientRect();
    var rev = function (t, xx, yy, o) { var el = document.elementFromPoint(rr.left + xx, rr.top + yy) || rc; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: rr.left + xx, clientY: rr.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0, detail: 1 }, o || {}))); };
    var rclick = function (x, y) { rev('mousedown', x, y); rev('mouseup', x, y); };
    var rkey = function (k) { var e = new KeyboardEvent('keydown', { key: k, code: k, bubbles: true, cancelable: true }); document.dispatchEvent(e); return e; };
    var rpx = async function (x, y) { S.cx = null; await W(40); var c = document.getElementById('strp-ov'), d = window.devicePixelRatio || 1; return Array.prototype.slice.call(c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data); };
    var db = document.getElementById('strp-drawbtn'); if (db && !document.getElementById('strp-tb').classList.contains('strp-drawopen')) db.click(); await W(60);
    var rtools = document.getElementById('strp-tools'); rtools.querySelector('[data-tgrp="lines"]').click(); await W(40);
    var rfl = rtools.querySelector('.stpr-tg[data-grp="lines"] .stpr-tfl'), rnames = Array.prototype.map.call(rfl.querySelectorAll('[data-tool]'), function (b) { return b.textContent; });
    ok('Trade Replay: Path in the line tools, after Arrow', rnames.indexOf('Path') === rnames.indexOf('Arrow') + 1, rnames.join('|'));
    rfl.querySelector('[data-tool="path"]').click(); await W(40);
    var RX = Math.round(rr.width * 0.3);
    rclick(RX, 280); rev('mousemove', RX + 50, 200); rclick(RX + 50, 200); rev('mousemove', RX + 110, 240); rclick(RX + 110, 240); rclick(RX + 110, 240); await W(80);
    var rp = S.drawings[S.drawings.length - 1];
    ok('three clicks and a double-click on the third: a 3-point path, selected, the tool put down', rp && rp.type === 'path' && rp.pts.length === 3 && S.sel === S.drawings.length - 1 && !S.pending && S.activeTool === 'none', rp && rp.pts);
    S.sel = null; await W(40);
    var rq = rp.pts.map(function (z) { return R._P(z); }), rm = { x: (rq[0].x + rq[1].x) / 2, y: (rq[0].y + rq[1].y) / 2 }, rmc = await rpx(Math.round(rm.x), Math.round(rm.y)), rmc2 = rmc;
    if (!near(rmc, BLUE, 14)) for (var dx = -2; dx <= 2 && !near(rmc2, BLUE, 14); dx++) for (var dy = -2; dy <= 2 && !near(rmc2, BLUE, 14); dy++) rmc2 = await rpx(Math.round(rm.x) + dx, Math.round(rm.y) + dy);
    ok('...drawn in blue', near(rmc2, BLUE, 14), rmc2);
    var rh = R._hit(rq[2].x, rq[2].y);
    ok('its last point is a handle (p2)', rh && rh.part === 'p2', rh);
    rev('mousedown', rq[2].x, rq[2].y); rev('mousemove', rq[2].x, rq[2].y + 40, { held: true }); rev('mousemove', rq[2].x, rq[2].y + 40, { held: true }); rev('mouseup', rq[2].x, rq[2].y + 40); await W(60);
    var rn = R._P(rp.pts[2]);
    ok('dragging it moves that point alone', Math.abs(rn.y - (rq[2].y + 40)) < 3 && Math.abs(R._P(rp.pts[0]).y - rq[0].y) < 1, [rn, rq[2]]);
    var nR = S.drawings.length; await (async function () { if (S.activeTool !== 'path') document.querySelector('#strp-tools [data-tool="path"]').click(); await W(30); })();
    rclick(RX, 120); rev('mousemove', RX + 40, 90); rclick(RX + 40, 90); rev('mousemove', RX + 90, 140); rkey('Enter'); await W(40);
    ok('Enter ends it there, and the replay stays open', S.drawings.length === nR + 1 && S.drawings[nR].pts.length === 2 && !S.pending && document.getElementById('strp-modal-bg').classList.contains('show'), S.drawings.length);
    await (async function () { if (S.activeTool !== 'path') document.querySelector('#strp-tools [data-tool="path"]').click(); await W(30); })();
    rclick(RX + 150, 120); rev('mousemove', RX + 190, 90); rclick(RX + 190, 90); rev('mousemove', RX + 230, 140); rkey('Escape'); await W(40);
    ok('Esc ends it too and does not close the replay', S.drawings.length === nR + 2 && S.drawings[nR + 1].pts.length === 2 && document.getElementById('strp-modal-bg').classList.contains('show'), S.drawings.length);
    try { R.close(); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { window.__stPractice.close(); } catch (e) {}
  try { window.__stReplay.close(); } catch (e) {}
  return out;
})()
