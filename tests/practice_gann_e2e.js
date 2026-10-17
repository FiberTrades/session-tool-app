(async function () {
  // Practice Replay, Nestor 17 Oct 2026: "can you also buid a Gann box and the minimalist indicator from trading view to be
  // used in practice replay", and the layout buttons pressed again to change the arrangement ("the left one also give me
  // the option of having 2 charts horizontally ... the large horizontal chart below and above and also on the right side").
  // Real EUR/USD candles of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_gann_e2e.js
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

    // ---- the Gann box ----
    DW.list = []; DW.hist = ['[]']; DW.hpos = 0; DW.sel = null;
    document.getElementById('stpr-drawbtn').click(); await W(20);
    var gb = document.querySelector('#stpr-tools [data-tool="gann"]');
    ok('a Gann box button sits in the drawing tools, after the Fib', gb && gb.title === 'Gann box' && gb.previousElementSibling && gb.previousElementSibling.getAttribute('data-tool') === 'fib', gb && gb.title);
    gb.click(); mev(0, 'mousedown', 80, 70); mev(0, 'mouseup', 80, 70); mev(0, 'mousemove', 420, 330); await W(40);
    ok('after the first click it follows the pointer', DW.pending && DW.pending.type === 'gann');
    mev(0, 'mousedown', 420, 330); mev(0, 'mouseup', 420, 330); await W(80);
    var g0 = DW.list[0];
    ok('the second click places it and puts the tool away', DW.list.length === 1 && g0.type === 'gann' && DW.tool === 'none' && DW.sel === 0, g0);
    var box = pane(0).el.querySelector('.stpr-props');
    ok('its options box: GANN BOX, a colour per level picked, the seven levels to remove or add to', box && /GANN BOX/.test(box.textContent) && box.querySelector('[data-col=""]') && /#fff|rgb\(255, 255, 255\)/.test(box.querySelector('[data-col=""]').style.border) && box.querySelectorAll('[data-lvl]').length === 7 && /0\.382/.test(box.textContent) && /0\.75/.test(box.textContent), box && box.textContent);
    redraw(); await W(60);
    var xa = P._xOfT(0, g0.a.t), xb = P._xOfT(0, g0.b.t), ya = P._yOf(0, g0.a.price), yb = P._yOf(0, g0.b.price), xm = xa + (xb - xa) * 0.5, y5 = ya + (yb - ya) * 0.5;
    var onH = px(0, xa + (xb - xa) * 0.13, y5), onV = px(0, xm, ya + (yb - ya) * 0.13), between = px(0, xa + (xb - xa) * 0.13, ya + (yb - ya) * 0.44);
    ok('the 0.5 level is drawn across in price (green) and down in time; a band between levels is tinted', onH[3] > 150 && onH[1] > onH[0] && onV[3] > 80 && onV[1] > onV[0] && between[3] > 0 && between[3] < 60, { onH: onH, onV: onV, between: between });
    box.querySelector('[data-lvl="2"]').click(); await W(30);
    ok('a horizontal line can be removed (0.382): the vertical ones stay all seven', DW.list[0].levels && DW.list[0].levels.length === 6 && DW.list[0].levels.indexOf(0.382) < 0 && DW.list[0].tlevels && DW.list[0].tlevels.length === 7, [DW.list[0].levels, DW.list[0].tlevels]);
    // horizontal and vertical lines separately (Nestor, 17 Oct 2026: "remove and add vertical and horizontal lines in the gann box separately")
    box = pane(0).el.querySelector('.stpr-props');
    ok('the box lists them in two sets: Horizontal lines (price) and Vertical lines (time), each with its own Add', /Horizontal lines \(price\)/.test(box.textContent) && /Vertical lines \(time\)/.test(box.textContent) && box.querySelectorAll('[data-lvl]').length === 6 && box.querySelectorAll('[data-tlvl]').length === 7 && box.querySelector('[data-tadd]') && box.querySelector('[data-fibadd]'), box.textContent);
    box.querySelector('[data-tlvl="3"]').click(); await W(30); P._render(); await W(60);
    var onV2 = px(0, xm, ya + (yb - ya) * 0.13), onH2 = px(0, xa + (xb - xa) * 0.13, y5);
    ok('removing the vertical 0.5: gone down in time, the horizontal 0.5 still drawn', DW.list[0].tlevels.indexOf(0.5) < 0 && DW.list[0].levels.indexOf(0.5) >= 0 && onV2[3] < 60 && onH2[3] > 150, { onV2: onV2, onH2: onH2, t: DW.list[0].tlevels });
    box = pane(0).el.querySelector('.stpr-props'); box.querySelector('[data-tlv]').value = '0.66'; box.querySelector('[data-tadd]').click(); await W(30);
    ok('a vertical line added at 0.66 (only there)', DW.list[0].tlevels.indexOf(0.66) >= 0 && DW.list[0].levels.indexOf(0.66) < 0, [DW.list[0].levels, DW.list[0].tlevels]);
    box = pane(0).el.querySelector('.stpr-props'); box.querySelector('[data-fiblv]').value = '0.9'; box.querySelector('[data-fibadd]').click(); await W(30);
    ok('a horizontal line added at 0.9 (only there)', DW.list[0].levels.indexOf(0.9) >= 0 && DW.list[0].tlevels.indexOf(0.9) < 0);
    box = pane(0).el.querySelector('.stpr-props'); box.querySelector('[data-col="#60a5fa"]').click(); await W(30);
    ok('one colour can be picked for the whole box, and the many-colour swatch brings the levels back', DW.list[0].color === '#60a5fa' && (pane(0).el.querySelector('.stpr-props [data-col=""]').click(), !DW.list[0].color), DW.list[0].color);
    var a0 = { t: DW.list[0].a.t, p: DW.list[0].a.price }, bp0 = DW.list[0].b.price;
    mev(0, 'mousedown', xa, yb); mev(0, 'mousemove', xa - 40, yb + 30, { held: true }); mev(0, 'mouseup', xa - 40, yb + 30); await W(30);
    ok("its corners drag like a rectangle's (the bottom-left one moves the start time and the far price)", DW.list[0].a.t < a0.t && DW.list[0].b.price !== bp0 && DW.list[0].a.price === a0.p, [a0, DW.list[0].a, bp0, DW.list[0].b.price]);
    var x5 = P._xOfT(1, DW.list[0].a.t);
    ok('the same box is on the 1h chart', x5 != null && isFinite(x5));
    DW.list = []; DW.sel = null; P._render(); await W(30);

    // ---- the Minimalist indicator ----
    var lb = document.getElementById('stpr-layersbtn'); lb.click(); await W(30);
    var mi = document.getElementById('stpr-mini');
    ok('Show on chart lists Minimalist, off to begin with, its parts hidden', mi && !mi.checked && !document.querySelector('#stpr-menu [data-mini]'), document.getElementById('stpr-menu').textContent);
    mi.click(); await W(40);
    var parts = Array.prototype.map.call(document.querySelectorAll('#stpr-menu [data-mini]'), function (x) { return x.getAttribute('data-mini') + (x.checked ? '+' : '-'); });
    ok('switched on: saved, the menu stays open and shows its six parts, all on', C.mini === true && document.getElementById('stpr-menu').classList.contains('show') && parts.join(' ') === 'zone+ ses+ dwm+ days+ gaps+ q+', parts);
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
    var zy = onTop ? zTop : P._yOf(0, M.zone.bot + zR * 0.125), zp = px(0, zx, zy);
    ok('drawn: the ' + (onTop ? 'top quarter of the zone is tinted pink' : 'bottom quarter of the zone is tinted cyan'), zp[3] > 10 && (onTop ? zp[0] > zp[2] : zp[2] > zp[0]), [zp, zx, zy]);
    document.querySelector('#stpr-menu [data-mini="zone"]').click(); await W(40); redraw(); await W(60);
    var zp2 = px(0, zx, zy);
    ok('the Range zone part switched off: saved, the tint is gone', C.miniOff.zone === true && zp2[3] === 0, zp2);
    document.querySelector('#stpr-menu [data-mini="zone"]').click(); await W(40);
    ok('and back on', !C.miniOff.zone);
    var M1 = P._mini(1);
    ok('on the 1h: no London box (15m and below), day names still', M1 && M1.ses.length === 0 && M1.days.length > 0);
    P._step(); P._step(); await W(200); var M2 = P._mini(0);
    ok('two steps on: worked out again with the new candles', M2.n >= n && M2.key !== M.key, [M2.n, n]);
    document.getElementById('stpr-mini').click(); await W(40);
    ok('Minimalist off: its parts leave the menu', C.mini === false && !document.querySelector('#stpr-menu [data-mini]'));
    lb.click(); await W(30);

    // ---- layouts: the same button again changes the arrangement ----
    var grid = document.getElementById('stpr-grid'), R = function (i) { return pane(i).el.getBoundingClientRect(); }, lay = function (nn) { return document.querySelector('#stpr-lay [data-lay="' + nn + '"]'); };
    ok('2 charts side by side to begin with', /\bvh\b/.test(grid.className) && R(1).left > R(0).right - 3 && Math.abs(R(1).top - R(0).top) < 2 && /side by side/.test(lay(2).title), [grid.className, lay(2).title]);
    lay(2).click(); await W(150);
    ok('pressed again: one above the other, same two charts, the button shows it', /\bvv\b/.test(grid.className) && P._panes().length === 2 && R(1).top > R(0).bottom - 3 && Math.abs(R(1).left - R(0).left) < 2 && lay(2).getAttribute('data-lv') === 'v' && /one above the other/.test(lay(2).title) && C.lv[2] === 'v', [grid.className, lay(2).title]);
    lay(2).click(); await W(150);
    ok('and again: side by side', /\bvh\b/.test(grid.className) && C.lv[2] === 'h');
    lay(3).click(); for (k = 0; k < 60 && !(P._panes().length === 3 && P._panes()[2].n); k++) await W(100); await W(100);
    var big = function () { var a = R(0); return a.width * a.height; };
    ok('3 charts: the big one on the left', /\bvL\b/.test(grid.className) && R(0).right < R(1).left + 3 && R(0).height > R(1).height * 1.8, grid.className);
    lay(3).click(); await W(150);
    ok('pressed again: the big one on the right', /\bvR\b/.test(grid.className) && R(0).left > R(1).right - 3 && R(0).height > R(1).height * 1.8 && /on the right/.test(lay(3).title), [grid.className, lay(3).title]);
    lay(3).click(); await W(150);
    ok('again: the big one on top, across the whole width', /\bvT\b/.test(grid.className) && R(0).bottom < R(1).top + 3 && R(0).width > R(1).width * 1.8 && Math.abs(R(1).top - R(2).top) < 2, grid.className);
    lay(3).click(); await W(150);
    ok('again: the big one at the bottom', /\bvB\b/.test(grid.className) && R(0).top > R(1).bottom - 3 && R(0).width > R(1).width * 1.8, grid.className);
    lay(3).click(); await W(150);
    ok('and round to the left again; the charts were never rebuilt', /\bvL\b/.test(grid.className) && P._panes().length === 3 && pane(2).n > 0);
    lay(2).click(); for (k = 0; k < 60 && !(P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    ok('back to 2 charts: the arrangement picked for 2 is kept (side by side)', /\bvh\b/.test(grid.className) && P._panes().length === 2);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
