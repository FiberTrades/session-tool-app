(async function () {
  // Batch D, Back Testing (Nestor, 19 Oct 2026: "build all the tradingview suggestions!"): alerts on any drawing. A trend line,
  // a ray and a horizontal ray ring when price crosses them (a sloping line at its price at that candle's time); a rectangle
  // and a parallel channel when price enters the zone, leaves it, or either - picked on the toolbar's bell - from its left edge
  // to its right one unless extended. Same chime, message and Alerts list as horizontal lines, the bell on the drawing, once
  // each then Reached; evaluated in replay time, never on a candle that was on the chart when it was set.
  // Real EUR/USD candles of Thu 1 Oct 2026. Every expected hit is worked out here from the candles, independently.
  // Run: python tests/browser_test.py tests/practice_drawalerts_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stDrawBar); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [5]; C.speed = 4; C.look = {}; C.mini = false; C.max = true; C.news = false; C.cmp = []; C.mm = Object.assign({}, C.mm, { col: true }); C.dwHide = false; C.dwLock = false;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    var S = function () { return P._s(); }, pane = function () { return P._panes()[0]; }, DW = P._dr(), DB = P._dbar();
    var hhmm = function (t) { var d = new Date(t * 1000); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    var flash = function () { return document.getElementById('stpr-flash').textContent; };
    var f5 = function (v) { return Number(v).toFixed(5); };
    var reset = async function (at) { DW.list = []; DW.hist = ['[]']; DW.hpos = 0; DW.sel = null; P._render(); P._goto(at || '08:00'); await W(300); DW.list = []; DW.sel = null; P._render(); await W(30); };
    // the first candle from now that a check says yes to (its open price from the candle before; a check gets p0, lo, hi, close, time)
    var first = function (from, until, fn) { var base = S().base, pc = null; for (var i = 0; i < base.length; i++) { var b = base[i]; if (b.time < from) { pc = b.close; continue; } if (b.time >= until) break;
        var p0 = pc == null ? b.open : pc, r = fn(p0, Math.min(b.low, p0), Math.max(b.high, p0), b.close, b.time); if (r) return { b: b, how: r }; pc = b.close; } return null; };
    await reset('08:00');
    var now0 = S().now, cur = P._px(), END = now0 + 4 * 3600;
    var H = -1e9, Lo = 1e9; S().base.forEach(function (b) { if (b.time >= now0 && b.time < END) { H = Math.max(H, b.high); Lo = Math.min(Lo, b.low); } });
    ok('the next four hours move: ' + f5(Lo) + ' to ' + f5(H) + ' (now ' + f5(cur) + ')', H - cur > 0.0004 || cur - Lo > 0.0004, [cur, H, Lo]);
    var up = H - cur >= cur - Lo, side = up ? 1 : -1, far = up ? H : Lo;

    // ---- trading time: the weekend close is left out of a slope's run ----
    var fri = Date.UTC(2026, 9, 16, 16) / 1000, mon = Date.UTC(2026, 9, 19, 16) / 1000, dstF = Date.UTC(2026, 9, 30, 12) / 1000, dstM = Date.UTC(2026, 10, 2, 12) / 1000;
    ok('trading time: Friday 16:00 to Monday 16:00 UTC is 24 hours (the weekend close left out), 72 for crypto; 23 over the clock change (1 Nov)', P._mspan(fri, mon, false) === 86400 && P._mspan(mon, fri, false) === -86400 && P._mspan(fri, mon, true) === 3 * 86400 && P._mspan(dstF, dstM, false) === 23 * 3600,
      [P._mspan(fri, mon, false), P._mspan(fri, mon, true), P._mspan(dstF, dstM, false) / 3600]);

    // ---- a trend line: rings where price crosses it, at its price at that candle's time ----
    var lvl0 = cur + side * 0.55 * Math.abs(far - cur), slope = side * 0.0001 / 3600;   // a pip an hour, rising towards where price goes
    var tr = { type: 'trend', a: { t: now0 - 3600, price: +(lvl0 - slope * 3600).toFixed(5) }, b: { t: now0, price: +lvl0.toFixed(5) }, alert: true };
    var trS = (tr.b.price - tr.a.price) / 3600, trAt = function (t) { return tr.a.price + trS * (t - tr.a.t); };
    var exT = first(now0, END, function (p0, lo, hi, c, t) { var v = trAt(t); return v >= lo && v <= hi; });
    ok('a sloping line\'s level at a time is its own (the app\'s sum matches the line\'s)', Math.abs(P._altLv(tr, now0 + 1800, false).lo - trAt(now0 + 1800)) < 1e-9, [P._altLv(tr, now0 + 1800, false), trAt(now0 + 1800)]);
    DW.list.push(tr); P._render(); await W(50);
    ok('worked out from the candles: the line is crossed at ' + (exT && hhmm(exT.b.time)), !!exT);
    P._play(); for (k = 0; k < 160 && S().playing; k++) await W(100);
    ok('Play stops where price crosses the trend line, on that candle', !S().playing && tr.hitAt === exT.b.time, [tr.hitAt && hhmm(tr.hitAt), hhmm(exT.b.time)]);
    ok('and says so: Alert: price crossed the trend line at <its price there> at ' + hhmm(exT.b.time), flash().indexOf('Alert: price crossed the trend line at ' + f5(trAt(exT.b.time)) + ' at ' + hhmm(exT.b.time)) === 0, flash());
    P._render(); await W(80);
    var bl = (pane()._bells || []).filter(function (q) { return q.d === tr; })[0];
    ok('the bell on the trend line, past its end, dimmed now it is reached', bl && bl.hit && bl.x > P._xOfT(0, tr.b.t), pane()._bells);
    P._step(); P._step(); await W(40);
    ok('once: playing on does not move its reached time', tr.hitAt === exT.b.time);
    P._dr().sel = DW.list.indexOf(tr); DW.noProps = false; DW.at = pane(); P._props(); await W(30);
    var ab = document.querySelector('.stdb-bar [data-db="alert"]');
    ok('the trend line\'s toolbar has the bell: reached, press to arm it again', ab && ab.classList.contains('hit') && /Alert reached at \d\d:\d\d: press to arm it again/.test(ab.title), ab && ab.title);

    // ---- never on a candle that was there when it was set ----
    await reset('09:00');
    var t9 = S().now, past = S().base.filter(function (b) { return b.time < t9 && b.time >= t9 - 3 * 3600; }), mid = past[Math.floor(past.length / 2)], lb = past[past.length - 1];
    var through = { type: 'trend', a: { t: past[0].time, price: past[0].close }, b: { t: lb.time, price: lb.close }, alert: true };   // through the candles on the chart
    var zoneNow = { type: 'rect', a: { t: t9 - 3 * 3600, price: Math.max.apply(null, past.map(function (b) { return b.high; })) + 0.00001 }, b: { t: t9 + 7200, price: Math.min.apply(null, past.map(function (b) { return b.low; })) - 0.00001 }, alert: true, alMode: 'in' };   // round every candle so far
    var hl = { type: 'hline', price: mid.close, alert: true };
    DW.list.push(through, zoneNow, hl); P._render(); P._step(); await W(60);
    ok('set across the candles already on the chart: nothing rings for them (a line through them, a zone round them asking for Enter, a level they crossed)', [through, zoneNow, hl].every(function (d) { return !d.hitAt || d.hitAt >= t9; }), [through.hitAt, zoneNow.hitAt, hl.hitAt, t9]);

    // ---- a rectangle, Enter: rings when price comes into it ----
    await reset('08:00');
    var zLo = cur + side * 0.45 * Math.abs(far - cur), zHi = zLo + side * 0.0003, zone = { type: 'rect', a: { t: now0 - 1800, price: +Math.max(zLo, zHi).toFixed(5) }, b: { t: now0 + 4 * 3600, price: +Math.min(zLo, zHi).toFixed(5) }, alert: true, alMode: 'in' };
    var zlo = zone.b.price, zhi = zone.a.price, inZ = function (v) { return v >= zlo && v <= zhi; };
    var exIn = first(now0, END, function (p0, lo, hi) { return !inZ(p0) && hi >= zlo && lo <= zhi; });
    DW.list.push(zone); P._render(); await W(40);
    P._play(); for (k = 0; k < 160 && S().playing; k++) await W(100);
    ok('Rectangle, Enter: Play stops on the candle that comes into it (' + (exIn && hhmm(exIn.b.time)) + ')', exIn && !S().playing && zone.hitAt === exIn.b.time && zone.hitHow === 'in', [zone.hitAt && hhmm(zone.hitAt), zone.hitHow]);
    ok('Alert: price entered the zone ' + f5(zlo) + '–' + f5(zhi) + ' at ' + hhmm(exIn.b.time), flash().indexOf('Alert: price entered the zone ' + f5(zlo) + '–' + f5(zhi) + ' at ' + hhmm(exIn.b.time)) === 0, flash());
    P._render(); await W(60);
    var zb = (pane()._bells || []).filter(function (q) { return q.d === zone; })[0], zx1 = Math.max(P._xOfT(0, zone.a.t), P._xOfT(0, zone.b.t)), zy0 = P._yOf(0, zhi);
    ok('its bell inside its top right corner, dimmed (reached)', zb && zb.hit && Math.abs(zb.x - (zx1 - 11)) < 2 && Math.abs(zb.y - (zy0 + 11)) < 2, [zb, zx1, zy0]);
    var bpx = function (x, y) { P._drawOv(0); var c = pane().ov, dd = window.devicePixelRatio || 1; return Array.prototype.slice.call(c.getContext('2d').getImageData(Math.round(x * dd), Math.round(y * dd), 1, 1).data); };
    var dome = bpx(zb.x, zb.y - 2);
    ok('the bell is drawn there (its dome, in the zone\'s colour)', dome[3] > 100, dome);
    // a press on the bell picks the zone; its bell button opens Enter / Exit / Both
    DW.sel = null; P._props(); var hit = P._hit(0, zb.x, zb.y);
    ok('a press on the bell picks the zone', hit && DW.list[hit.i] === zone, hit);
    DW.sel = DW.list.indexOf(zone); DW.noProps = false; DW.at = pane(); P._props(); await W(30);
    var zab = document.querySelector('.stdb-bar [data-db="alert"]');
    ok('the zone\'s toolbar: Templates, line, fill, text, width, style, Visibility, the bell (a menu), lock, delete, More', zab && zab.getAttribute('aria-haspopup') === 'true' && Array.prototype.map.call(document.querySelectorAll('.stdb-bar [data-db]'), function (x) { return x.getAttribute('data-db'); }).join(',') === 'tpl,line,fill,text,width,dash,vis,alert,lock,del,more',
      Array.prototype.map.call(document.querySelectorAll('.stdb-bar [data-db]'), function (x) { return x.getAttribute('data-db'); }).join(','));
    zab.click(); await W(40);
    var pp = DB.pop(), rows = pp ? Array.prototype.map.call(pp.querySelectorAll('[data-alm]'), function (x) { return x.getAttribute('data-alm') + ':' + x.textContent; }) : [];
    ok('the bell opens: Ring when price - Enters the zone (reached), Exits the zone, Enters or exits; Turn the alert off', pp && pp.style.display === 'flex' && rows.length === 4 && /^in:Enters the zone/.test(rows[0]) && /reached/.test(rows[0]) && /^out:Exits the zone/.test(rows[1]) && /^both:Enters or exits/.test(rows[2]) && /^off:Turn the alert off/.test(rows[3]) && /Ring when price/.test(pp.textContent), rows);
    pp.querySelector('[data-alm="out"]').click(); await W(40);
    ok('Exits picked: armed again, for leaving the zone (the bell lit)', zone.alert === true && zone.alMode === 'out' && !zone.hitAt && document.querySelector('.stdb-bar [data-db="alert"]').classList.contains('act'), [zone.alMode, zone.hitAt]);
    document.querySelector('.stdb-bar [data-db="alert"]').click(); await W(30); DB.pop().querySelector('[data-alm="off"]').click(); await W(30);
    ok('Turn the alert off: off, the zone stays', zone.alert === false && DW.list.indexOf(zone) >= 0 && !document.querySelector('.stdb-bar [data-db="alert"]').classList.contains('act'));

    // ---- a rectangle round price, Exit; and Both ----
    await reset('08:00');
    var ex0 = { type: 'rect', a: { t: now0 - 3600, price: +(cur + 0.00025).toFixed(5) }, b: { t: now0 + 4 * 3600, price: +(cur - 0.00025).toFixed(5) }, alert: true, alMode: 'out' };
    var elo = ex0.b.price, ehi = ex0.a.price, exOut = first(now0, END, function (p0, lo, hi) { return p0 >= elo && p0 <= ehi && (lo < elo || hi > ehi); });
    DW.list.push(ex0); P._render(); P._goto('12:00'); await W(300);
    ok('Rectangle, Exit (price inside it): Go to 12:00 marks where price left it (' + (exOut && hhmm(exOut.b.time)) + ') and says so', exOut && ex0.hitAt === exOut.b.time && ex0.hitHow === 'out' && /Alert: price left the zone/.test(flash()), [ex0.hitAt && hhmm(ex0.hitAt), ex0.hitHow, flash()]);
    var lst = (function () { P._alertsMenu(document.getElementById('stpr-alertsbtn')); var m = document.getElementById('stpr-menu'), r = m.querySelector('.stpr-alr'); var t = r ? r.textContent : ''; P._alertsMenu(null); return t; })();
    ok('the Alerts list: its range, Rectangle (exits), Reached hh:mm (left)', new RegExp('^' + f5(elo).replace('.', '\\.') + '–' + f5(ehi).replace('.', '\\.') + 'Rectangle \\(exits\\) · Reached \\d\\d:\\d\\d \\(left\\)').test(lst), lst);
    document.getElementById('stpr-menu').classList.remove('show');
    // going back arms it again
    P._goto('08:00'); await W(300);
    ok('going back before it arms it again', ex0.alert && !ex0.hitAt && !ex0.hitHow);
    ex0.alMode = 'both'; P._goto('12:00'); await W(300);
    ok('Both: price inside, the first thing that happens is leaving: rings then (' + (exOut && hhmm(exOut.b.time)) + ')', ex0.hitAt === exOut.b.time && ex0.hitHow === 'out', [ex0.hitAt && hhmm(ex0.hitAt), ex0.hitHow]);

    // ---- a zone outside its time: from its left edge to its right one (unless extended) ----
    await reset('08:00');
    var gone = { type: 'rect', a: { t: now0 - 3 * 3600, price: +(cur + 0.002).toFixed(5) }, b: { t: now0 - 600, price: +(cur - 0.002).toFixed(5) }, alert: true, alMode: 'out' };
    var later = { type: 'rect', a: { t: now0 + 2 * 3600, price: +(cur + 0.00025).toFixed(5) }, b: { t: now0 + 4 * 3600, price: +(cur - 0.00025).toFixed(5) }, alert: true, alMode: 'both' };
    var exLater = first(now0 + 2 * 3600, END, function (p0, lo, hi, c) { var inn = p0 >= later.b.price && p0 <= later.a.price; return inn ? (lo < later.b.price || hi > later.a.price) : (hi >= later.b.price && lo <= later.a.price); });
    DW.list.push(gone, later); P._render(); P._goto('12:00'); await W(300);
    ok('a zone that ended before now never rings; one that starts later rings only from its left edge (' + (exLater ? hhmm(exLater.b.time) : 'none') + ')', !gone.hitAt && (exLater ? later.hitAt === exLater.b.time : !later.hitAt) && (!later.hitAt || later.hitAt >= later.a.t), [gone.hitAt, later.hitAt && hhmm(later.hitAt)]);
    gone.extR = true; delete gone.hitAt; P._goto('08:00'); await W(300); P._goto('12:00'); await W(300);
    var exGone = first(now0, P._s().now, function (p0, lo, hi) { var inn = p0 >= gone.b.price && p0 <= gone.a.price; return inn && (lo < gone.b.price || hi > gone.a.price); });
    ok('extended right, the same zone is watched again' + (exGone ? ' (left it ' + hhmm(exGone.b.time) + ')' : ' (price stayed inside)'), exGone ? gone.hitAt === exGone.b.time : !gone.hitAt, [gone.hitAt && hhmm(gone.hitAt)]);

    // ---- a parallel channel round price: its lines slope; Exit ----
    await reset('08:00');
    var cs = 0.00015 / 3600, ch = { type: 'channel', a: { t: now0 - 1800, price: +(cur - 0.0002 - cs * 1800).toFixed(5) }, b: { t: now0 + 1800, price: +(cur - 0.0002 + cs * 1800).toFixed(5) }, off: 0.0004, alert: true, alMode: 'out', extR: true };
    var chS = (ch.b.price - ch.a.price) / 3600, chAt = function (t) { var v = ch.a.price + chS * (t - ch.a.t); return [v, v + ch.off]; };
    var exCh = first(now0, END, function (p0, lo, hi, c, t) { var z = chAt(t); return p0 >= z[0] && p0 <= z[1] && (lo < z[0] || hi > z[1]); });
    DW.list.push(ch); P._render(); P._goto('12:00'); await W(300);
    ok('Parallel channel, Exit: rings where price leaves it, its lines at that candle\'s time (' + (exCh && hhmm(exCh.b.time)) + ')', exCh && ch.hitAt === exCh.b.time && ch.hitHow === 'out' && /Alert: price left the channel/.test(flash()), [ch.hitAt && hhmm(ch.hitAt), flash()]);

    // ---- a horizontal ray and a ray ----
    await reset('08:00');
    var hrL = +(cur + side * 0.5 * Math.abs(far - cur)).toFixed(5), hr = { type: 'hray', a: { t: now0 - 600, price: hrL }, alert: true };
    var exHr = first(now0, END, function (p0, lo, hi) { return hrL >= lo && hrL <= hi; });
    var rs = side * 0.00005 / 3600, ry = { type: 'ray', a: { t: now0 - 1800, price: +(hrL - side * 0.0001).toFixed(5) }, b: { t: now0, price: +(hrL - side * 0.0001 + rs * 1800).toFixed(5) }, alert: true };
    var ryS = (ry.b.price - ry.a.price) / 1800, exRy = first(now0, END, function (p0, lo, hi, c, t) { var v = ry.a.price + ryS * (t - ry.a.t); return v >= lo && v <= hi; });
    DW.list.push(hr, ry); P._render(); P._goto('12:00'); await W(300);
    ok('Horizontal ray: rings where price reaches its level (' + (exHr && hhmm(exHr.b.time)) + ')', exHr && hr.hitAt === exHr.b.time, [hr.hitAt && hhmm(hr.hitAt)]);
    ok('Ray: rings where price crosses it, its price at that time (' + (exRy && hhmm(exRy.b.time)) + ')', exRy ? ry.hitAt === exRy.b.time : !ry.hitAt, [ry.hitAt && hhmm(ry.hitAt)]);
    ok('a jump past them says so' + (exRy ? ', with the other one counted' : ''), /Alert: price/.test(flash()) && (exRy ? /\(\+1 more\)/.test(flash()) : !/more\)/.test(flash())), flash());

    // ---- a right-click on a trend line offers its alert; the object tree says so ----
    await reset('08:00');
    var t2 = { type: 'trend', a: { t: now0 - 3600, price: cur }, b: { t: now0, price: cur + 0.0003 } }; DW.list.push(t2); P._render(); await W(60);
    var ax = P._xOfT(0, now0 - 1800), ay = P._yOf(0, cur + 0.00015), pc = pane().el.querySelector('.stpr-pc'), rr = pc.getBoundingClientRect(), el2 = document.elementFromPoint(rr.left + ax, rr.top + ay) || pc;
    el2.dispatchEvent(new MouseEvent('contextmenu', { clientX: rr.left + ax, clientY: rr.top + ay, bubbles: true, cancelable: true, button: 2 })); await W(40);
    var cx = pane().el.querySelector('.stpr-ctx'), alt = cx && cx.querySelector('[data-act="alt"]');
    ok('a right-click on a trend line: Alert on', alt && /Alert on/.test(alt.textContent), cx && cx.textContent);
    alt.click(); await W(40);
    ok('...turns its alert on', t2.alert === true && !t2.hitAt);
    P._treeMenu(document.getElementById('stpr-treebtn')); await W(30); var tm = document.getElementById('stpr-menu').textContent;
    ok('the object tree says it has an alert', /Trend line[^·]*· alert/.test(tm), tm.slice(0, 200));
    document.getElementById('stpr-menu').classList.remove('show');
    var stored = JSON.parse(localStorage.getItem('st_practice_draw2:EURUSD') || '[]');
    ok('kept with the drawings (synced like them)', stored.some(function (d) { return d.type === 'trend' && d.alert; }));

    // ---- the rows a live chart would hand the EA (Live Charts) ----
    var rowT = P._paRow(tr, 'EURUSD'), rowZ = P._paRow(Object.assign({}, zone, { alMode: 'in' }), 'EURUSD'), rowC = P._paRow(ch, 'EURUSD'), rowH = P._paRow({ type: 'hline', price: 1.1, alert: true }, 'EURUSD'), rowB = P._paRow(tr, 'BTCUSD');
    ok('a live row: a trend line = its price at its first point + its slope per trading second; a zone = bottom, top, Enter, its edges; a channel = its lines\' slope, extended right; a level as before; crypto in plain time',
      rowT.src === 'trend' && Math.abs(rowT.price - tr.a.price) < 1e-9 && Math.abs(rowT.slope - trS) < 1e-15 && rowT.t0 === tr.a.t && rowT.mk === true
      && rowZ.src === 'rect' && rowZ.price === zlo && rowZ.hi === zhi && rowZ.mode === 1 && rowZ.starts_at === new Date(zone.a.t * 1000).toISOString() && rowZ.expires_at === new Date(zone.b.t * 1000).toISOString()
      && rowC.src === 'channel' && Math.abs(rowC.slope - chS) < 1e-15 && rowC.expires_at === null && rowC.mode === 2 && Math.abs(rowC.hi - rowC.price - 0.0004) < 1e-9
      && rowH.src === 'line' && rowH.price === 1.1 && rowH.slope === null && rowB.mk === false, [rowT, rowZ, rowC, rowH, rowB.mk]);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
