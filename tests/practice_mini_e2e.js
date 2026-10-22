(async function () {
  // Practice Replay, Nestor 17 Oct 2026: "the minimalist indicator from trading view to be used in practice replay" (the
  // Gann box asked for with it was taken out again the same day), and the layout buttons pressed again to change the arrangement ("the left one also give me
  // the option of having 2 charts horizontally ... the large horizontal chart below and above and also on the right side").
  // Real EUR/USD candles of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_mini_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 2; C.tfs = [15, 60, 5, 240]; C.stopPx = { EURUSD: 0.0012 }; C.speed = 0; C.ses = {}; C.max = true; C.mini = false; C.miniOff = {}; C.lv = {};
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    var S = function () { return P._s(); }, pane = function (i) { return P._panes()[i || 0]; }, DW = P._dr();
    var mev = function (i, t, xx, yy, o) { var ch = pane(i).el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect(), el = document.elementFromPoint(r.left + xx, r.top + yy) || ch;
      el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || t === 'mousemove' && o && o.held ? 1 : 0 }, o || {}))); };
    var px = function (i, x, y) { var c = pane(i).ov, d = window.devicePixelRatio || 1; return Array.prototype.slice.call(c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data); };
    var redraw = function () { P._render(); };
    P._goto('14:30'); await W(400);

    // ---- no Gann box (taken out again on 17 Oct 2026: "the fibo looks too similar i dont think i need it") ----
    DW.list = []; DW.sel = null;
    document.getElementById('stpr-drawbtn').click(); await W(20);
    ok('no Gann box button among the drawing tools', !document.querySelector('#stpr-tools [data-tool="gann"]') && document.querySelector('#stpr-tools [data-tool="fib"]'));
    var B0 = pane(0).bars, n0 = B0.length; DW.list = [{ type: 'gann', a: { t: B0[n0 - 40].time, price: B0[n0 - 40].low }, b: { t: B0[n0 - 5].time, price: B0[n0 - 5].high } }]; P._render(); await W(60);
    var gx = (P._xOfT(0, DW.list[0].a.t) + P._xOfT(0, DW.list[0].b.t)) / 2, gy = (P._yOf(0, DW.list[0].a.price) + P._yOf(0, DW.list[0].b.price)) / 2;
    mev(0, 'mousedown', gx, gy); mev(0, 'mouseup', gx, gy); await W(40);
    ok('a Gann box drawn before is kept in the list but neither drawn nor picked', DW.list.length === 1 && DW.sel == null, DW.sel);
    DW.list = []; DW.sel = null; P._render(); await W(30);

    // ---- the Minimalist indicator ----
    var lb = document.getElementById('stpr-layersbtn'); lb.click(); await W(30);
    var mi = document.getElementById('stpr-mini');
    ok('Show on chart lists Minimalist, off to begin with, its parts hidden', mi && !mi.checked && !document.querySelector('#stpr-menu [data-mini]'), document.getElementById('stpr-menu').textContent);
    mi.click(); await W(40);
    ok('switched on: saved, the menu stays open with a Settings button (its parts are switched in its window, not here)', C.mini === true && document.getElementById('stpr-menu').classList.contains('show') && document.querySelector('#stpr-menu [data-miniset]') && !document.querySelector('#stpr-menu [data-mini]'), document.getElementById('stpr-menu').textContent);
    ok('no ICT words in the menu', !/premium|discount|kill ?zone|liquidity|order block/i.test(document.getElementById('stpr-menu').textContent));
    var M = P._mini(0), B = pane(0).bars, n = B.length;
    ok('worked out from the candles up to now only (15m)', M && M.n === n && B[n - 1].time < S().now, M && M.n);

    // the structure, worked out again here: 30-bar swings, a close beyond one anchors the zone at the strong point
    var sh = null, shI = -1, shB = true, sl = null, slI = -1, slB = true, sI = -1, bull = null;
    for (i = 60; i < n; i++) { var c = i - 30, isH = true, isL = true;
      for (k = c - 30; k <= c + 30; k++) { if (k === c) continue; if (k < c ? B[k].high >= B[c].high : B[k].high > B[c].high) isH = false; if (k < c ? B[k].low <= B[c].low : B[k].low < B[c].low) isL = false; }
      if (isH) { sh = B[c].high; shI = c; shB = false; } if (isL) { sl = B[c].low; slI = c; slB = false; }
      if (!shB && B[i].close > sh) { shB = true; sI = shI; for (k = shI; k <= i; k++) if (B[k].low < B[sI].low) sI = k; bull = true; }
      if (!slB && B[i].close < sl) { slB = true; sI = slI; for (k = slI; k <= i; k++) if (B[k].high > B[sI].high) sI = k; bull = false; } }
    var hi = -1e9, lo = 1e9; for (k = sI; k < n; k++) { hi = Math.max(hi, B[k].high); lo = Math.min(lo, B[k].low); }
    ok('the range zone starts at the strong ' + (bull ? 'low' : 'high') + ' of the latest break and spans the highest high and lowest low since', M.zone && M.zone.i0 === sI && M.zone.top === hi && M.zone.bot === lo && (bull ? B[sI].low === lo : B[sI].high === hi), { zone: M.zone, sI: sI, hi: hi, lo: lo });

    // previous day: 22:00 London to 22:00 London
    var lk = P._lonK, today = lk(B[n - 1].time).day, pd = B.filter(function (b) { return lk(b.time).day === today - 1; });
    var pdh = Math.max.apply(null, pd.map(function (b) { return b.high; })), pdl = Math.min.apply(null, pd.map(function (b) { return b.low; }));
    ok('the previous day is Wed 30 Sep (22:00 London Tue to 22:00 Wed): PDH ' + pdh + ' PDL ' + pdl, M.dwm.d && M.dwm.d.hi === pdh && M.dwm.d.lo === pdl && new Date(M.dwm.d.t0 * 1000).toISOString() === '2026-09-29T21:00:00.000Z', M.dwm.d && [M.dwm.d.hi, M.dwm.d.lo, new Date(M.dwm.d.t0 * 1000).toISOString()]);
    ok('its range reads in pips: ' + P._miniDist(pdh - pdl), P._miniDist(pdh - pdl) === String(parseFloat(((pdh - pdl) / 0.0001).toFixed(1))));
    var B1 = pane(1).bars, pw = P._mini(1).dwm.w, wkStart = pw && new Date(pw.t0 * 1000), wk1 = B1.filter(function (b) { return P._lonK(b.time).wk === P._lonK(pw.t0).wk; });
    ok('the previous week (on the 1h, a month of candles) starts on Sunday 22:00 London', pw && wkStart.getUTCDay() === 0 && wkStart.getUTCHours() === 21 && pw.hi === Math.max.apply(null, wk1.map(function (b) { return b.high; })) && pw.lo === Math.min.apply(null, wk1.map(function (b) { return b.low; })), pw && wkStart.toISOString());
    for (k = 0; k < 50 && !(P._mini(0).dwm.w && P._mini(0).dwm.m); k++) { await W(100); P._miniFresh(); }
    var M0 = P._mini(0), M1h = P._mini(1);
    ok('the 15m holds only a week of candles, yet its previous week and month are whole ones (from the 1h / 4h history): the same as the 1h shows', M0.dwm.w && M0.dwm.w.hi === pw.hi && M0.dwm.w.lo === pw.lo && M0.dwm.w.t0 === pw.t0 && M0.dwm.m && M1h.dwm.m && M0.dwm.m.hi === M1h.dwm.m.hi && M0.dwm.m.lo === M1h.dwm.m.lo, [M0.dwm, M1h.dwm]);
    var sep = new Date(M0.dwm.m.t0 * 1000);
    ok('the previous month is September, from 22:00 London on 31 Aug', sep.toISOString() === '2026-08-31T21:00:00.000Z', sep.toISOString());

    // the London box: 08:00-10:00 GMT+1 = 07:00-09:00 UTC, the last six
    var sesOk = M.ses.length > 0 && M.ses.length <= 6 && M.ses.every(function (o) { var t = B[o.i0].time, inS = B.filter(function (b) { return b.time >= t && b.time < t + 7200; });
      return new Date(t * 1000).getUTCHours() === 7 && new Date(t * 1000).getUTCMinutes() === 0 && o.hi === Math.max.apply(null, inS.map(function (b) { return b.high; })) && o.lo === Math.min.apply(null, inS.map(function (b) { return b.low; })) && o.nb === 8; });
    ok('London boxes start at 07:00 UTC (08:00 GMT+1), 8 candles wide on the 15m, high and low of their two hours', sesOk, M.ses.map(function (o) { return [new Date(B[o.i0].time * 1000).toISOString(), o.hi, o.lo]; }));
    ok('weekday names sit on the 10:00 London candle, Monday to Friday', M.days.length > 0 && M.days.every(function (o) { return lk(B[o.i].time).h === 10 && o.wd >= 1 && o.wd <= 5; }), M.days.map(function (o) { return new Date(B[o.i].time * 1000).toISOString(); }));
    ok('a day line at each 22:00 London', M.seps.length > 0 && M.seps.every(function (j) { return lk(B[j].time).day !== lk(B[j - 1].time).day; }));
    ok('opening gaps: open against the last close at a new day, still untouched since', M.gaps.every(function (o) { var tp = Math.max(B[o.i].open, B[o.i - 1].close), bt = Math.min(B[o.i].open, B[o.i - 1].close);
      return o.top === tp && o.bot === bt && lk(B[o.i].time).day !== lk(B[o.i - 1].time).day && B.slice(o.i).every(function (b) { return o.bull ? b.low >= bt : b.high <= tp; }); }), M.gaps);

    // drawn: the top quarter of the zone is tinted pink; switched off, it goes
    redraw(); await W(60);
    // the quarter of the zone that is on screen (its far end can sit beyond the price scale)
    var zR = M.zone.top - M.zone.bot, zTop = P._yOf(0, M.zone.top - zR * 0.125), zx = Math.max(10, P._xOfT(0, B[M.zone.i0].time) + 4) / 2 + P._xOfT(0, B[n - 1].time) / 2, onTop = zTop > 5;
    var zy = onTop ? zTop : P._yOf(0, M.zone.bot + zR * 0.125);
    // the zone's shading is under the candles since 22 Oct 2026 (on the chart's own canvas, not the overlay): the chart's picture,
    // tinted pixels along that row of the zone
    var tintRow = function () { var cv = pane(0).chart.takeScreenshot(), d = cv.width / pane(0).el.querySelector('.stpr-pc').clientWidth, g = cv.getContext('2d'), n0 = 0, x0 = Math.max(10, P._xOfT(0, B[M.zone.i0].time) + 4), x1 = P._xOfT(0, B[n - 1].time);
      for (var x = x0; x < x1; x += 2) { var q = g.getImageData(Math.round(x * d), Math.round(zy * d), 1, 1).data; if ((onTop ? q[0] - q[2] > 12 : q[2] - q[0] > 12) && Math.max(q[0], q[1], q[2]) < 90) n0++; } return n0; };
    var zp = tintRow();
    ok('drawn: the ' + (onTop ? 'top quarter of the zone is tinted pink' : 'bottom quarter of the zone is tinted cyan') + ', under the candles', zp > 10 && pane(0).series.__stMub && pane(0).series.__stMub.list.length >= 3, [zp, zx, zy]);
    P._miniDialog(); await W(60); document.querySelector('.stpr-dlg [data-k="part.zone"]').click(); await W(40); document.querySelector('.stpr-dlg [data-dok]').click(); await W(40); redraw(); await W(60);
    await W(80); var zp2 = tintRow();
    ok('the P/D Zone switched off in its settings: saved, the tint is gone', C.miniOff.zone === true && zp2 === 0, zp2);
    P._miniDialog(); await W(60); document.querySelector('.stpr-dlg [data-k="part.zone"]').click(); await W(40); document.querySelector('.stpr-dlg [data-dok]').click(); await W(40);
    ok('and back on', !C.miniOff.zone);
    var M1 = P._mini(1);
    ok('on the 1h: no London box (15m and below), day names still', M1 && M1.ses.length === 0 && M1.days.length > 0);
    P._step(); P._step(); await W(200); var M2 = P._mini(0);
    ok('two steps on: worked out again with the new candles', M2.n >= n && M2.key !== M.key, [M2.n, n]);
    document.getElementById('stpr-mini').click(); await W(40);
    ok('Minimalist off: its parts leave the menu', C.mini === false && !document.querySelector('#stpr-menu [data-mini]'));
    lb.click(); await W(30);

    // ---- layouts: TradingView's picker - one Charts button, a row for each count 1-8 with its arrangements ----
    var grid = document.getElementById('stpr-grid'), R = function (i) { return pane(i).el.getBoundingClientRect(); };
    var lbtn = function () { return document.getElementById('stpr-laybtn'); };
    var pick = async function (nn, v) { lbtn().click(); await W(60); var b = document.querySelector('#stpr-menu.show [data-lay="' + nn + '"][data-lv="' + v + '"]'); if (!b) return false; b.click(); return true; };
    var waitN = async function (nn) { for (var q = 0; q < 80 && !(P._panes().length === nn && P._panes()[nn - 1].n); q++) await W(100); await W(120); };
    ok('2 charts side by side to begin with; the Charts button says so', /\bvh\b/.test(grid.className) && R(1).left > R(0).right - 3 && Math.abs(R(1).top - R(0).top) < 2 && /side by side/.test(lbtn().title), [grid.className, lbtn().title]);
    lbtn().click(); await W(80);
    var rows = document.querySelectorAll('#stpr-menu.show .stpr-lyr'), per = Array.prototype.map.call(rows, function (r) { return r.querySelectorAll('[data-lay]').length; });
    ok('the picker: rows 1 to 8 with TradingView\'s counts of arrangements (1, 2, 6, 10, 11, 6, 3, 4)', rows.length === 8 && per.join(',') === '1,2,6,10,11,6,3,4', per);
    ok('the one on screen is marked', !!document.querySelector('#stpr-menu.show [data-lay="2"][data-lv="h"].on'));
    lbtn().click(); await W(60);
    await pick(2, 'v'); await W(150);
    ok('2, one above the other: the same two charts, the button shows it', /\bvv\b/.test(grid.className) && P._panes().length === 2 && R(1).top > R(0).bottom - 3 && Math.abs(R(1).left - R(0).left) < 2 && /one above the other/.test(lbtn().title) && C.lv[2] === 'v' && !document.querySelector('#stpr-menu.show'), [grid.className, lbtn().title]);
    await pick(2, 'h'); await W(150);
    ok('and side by side again', /\bvh\b/.test(grid.className) && C.lv[2] === 'h');
    await pick(3, 'L'); await waitN(3);
    ok('3 charts: the big one on the left', /\bvL\b/.test(grid.className) && R(0).right < R(1).left + 3 && R(0).height > R(1).height * 1.8, grid.className);
    await pick(3, 'R'); await W(150);
    ok('the big one on the right', /\bvR\b/.test(grid.className) && R(0).left > R(1).right - 3 && R(0).height > R(1).height * 1.8 && /on the right/.test(lbtn().title), [grid.className, lbtn().title]);
    await pick(3, 'T'); await W(150);
    ok('the big one on top, across the whole width', /\bvT\b/.test(grid.className) && R(0).bottom < R(1).top + 3 && R(0).width > R(1).width * 1.8 && Math.abs(R(1).top - R(2).top) < 2, grid.className);
    await pick(3, 'B'); await W(150);
    ok('the big one at the bottom', /\bvB\b/.test(grid.className) && R(0).top > R(1).bottom - 3 && R(0).width > R(1).width * 1.8, grid.className);
    await pick(3, 'h'); await W(150);
    ok('3 side by side; the charts were never rebuilt', /\bvh\b/.test(grid.className) && P._panes().length === 3 && pane(2).n > 0 && R(1).left > R(0).right - 3 && R(2).left > R(1).right - 3 && Math.abs(R(2).top - R(0).top) < 2, grid.className);
    await pick(5, 'L4'); await waitN(5);
    ok('5 charts: the big one on the left, four in a square beside it', P._panes().length === 5 && R(0).height > R(1).height * 1.8 && R(1).right < R(2).left + 3 && R(3).top > R(1).bottom - 3 && R(4).left > R(3).right - 3, [grid.className, P._panes().length]);
    await pick(8, 'g'); await waitN(8);
    var tops = [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return Math.round(R(i).top); });
    ok('8 charts: four across, two rows, every chart with candles', P._panes().length === 8 && tops[0] === tops[3] && tops[4] === tops[7] && tops[4] > tops[0] && P._panes().every(function (q) { return q.n > 0; }), [tops, P._panes().map(function (q) { return q.n; })]);
    await pick(7, 'P'); await W(150);
    ok('7 charts, 4 above and 3 below', P._panes().length === 7 && Math.abs(R(3).top - R(0).top) < 2 && R(4).top > R(0).bottom - 3 && R(4).width > R(0).width * 1.2, [R(0).width, R(4).width]);
    await pick(2, 'h'); for (k = 0; k < 60 && !(P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    ok('back to 2 charts: the arrangement picked for 2 is kept (side by side)', /\bvh\b/.test(grid.className) && P._panes().length === 2);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
