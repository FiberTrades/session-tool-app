(async function () {
  // Practice Replay: alerts on horizontal lines (Nestor, 17 Oct 2026: "allow to set alarms on horizontal lines too") - the
  // replay stops with a chime where price reaches the line; set from the line's options box, a right-click on the chart or
  // Alt+A; going back before the hit arms it again. Real EUR/USD candles of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_alert_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [5]; C.speed = 4; C.look = {}; C.mini = false; C.max = true;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var S = function () { return P._s(); }, pane = function () { return P._panes()[0]; }, DW = P._dr();
    var hhmm = function (t) { var d = new Date(t * 1000); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    var mev = function (t, xx, yy, o) { var ch = pane().el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect(), el = document.elementFromPoint(r.left + xx, r.top + yy) || ch;
      el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: t === 'contextmenu' ? 2 : 0 }, o || {}))); };
    var flash = function () { return document.getElementById('stpr-flash').textContent; };
    P._goto('08:00'); await W(400); DW.list = []; DW.sel = null; P._render(); await W(50);

    // the first price above now that the market reaches in the next hour
    var now0 = S().now, base = S().base, cur = P._px(), target = null, hitBar = null, hiSoFar = cur, loSoFar = cur;
    for (i = 0; i < base.length; i++) { var b = base[i]; if (b.time < now0) continue; if (b.time >= now0 + 3 * 3600) break;
      if (b.high > hiSoFar + 0.00015) { target = +(hiSoFar + 0.0001).toFixed(5); break; } if (b.low < loSoFar - 0.00015) { target = +(loSoFar - 0.0001).toFixed(5); break; }
      hiSoFar = Math.max(hiSoFar, b.high); loSoFar = Math.min(loSoFar, b.low); }
    for (i = 0; i < base.length && target; i++) { var b2 = base[i], pc = i ? base[i - 1].close : b2.open; if (b2.time < now0) continue; if (Math.min(b2.low, pc) <= target && Math.max(b2.high, pc) >= target) { hitBar = b2; break; } }
    ok('a price the next hours reach first (above or below now): ' + target + ' (the ' + (hitBar && hhmm(hitBar.time)) + ' candle)', target && hitBar, [cur, target]);

    // right-click on the chart at that price
    var y = P._yOf(0, target), x = pane().el.clientWidth * 0.5;
    mev('contextmenu', x, y); await W(40);
    var ctx = pane().el.querySelector('.stpr-ctx'), row = ctx && ctx.querySelector('[data-act="alert"]');
    ok('a right-click on the chart offers Add alert at that price', ctx && ctx.style.display === 'flex' && row && /^Add alert at 1\.\d{5}$/.test(row.textContent), ctx && ctx.textContent);
    var shown = row && +row.textContent.replace(/[^\d.]/g, ''); row.click(); await W(60);
    var L = DW.list[DW.list.length - 1];
    ok('it adds a horizontal line with its alert on, at that price', L && L.type === 'hline' && L.alert === true && !L.hitAt && Math.abs(L.price - shown) < 1e-9 && /Alert set at/.test(flash()), L);
    var hlT = function () { return (pane().hl || []).map(function (l) { return l.options().title + '|' + l.options().lineStyle; }); };
    ok('the line on the price scale reads ALERT', hlT().some(function (t) { return /^ALERT\|0$/.test(t); }), hlT());
    L.price = target; P._render(); await W(30);   // exactly on the level worked out above

    // play: it stops where price reaches the line
    P._play(); for (k = 0; k < 120 && S().playing; k++) await W(100);
    ok('Play stops by itself when price reaches it, on that candle', !S().playing && L.hitAt === hitBar.time && S().now > hitBar.time && S().now <= hitBar.time + 3 * 3600, [hhmm(S().now), L.hitAt && hhmm(L.hitAt), hhmm(hitBar.time)]);
    ok('and says so: Alert: price reached ' + target + ' at ' + hhmm(hitBar.time), flash().indexOf('Alert: price reached ' + target.toFixed(5) + ' at ' + hhmm(hitBar.time)) === 0, flash());
    ok('the line now reads ALERT HIT, dashed', hlT().some(function (t) { return /^ALERT HIT\|2$/.test(t); }), hlT());
    P._step(); P._step(); await W(60);
    ok('playing on, it does not stop there again', !L.hitAt === false && L.hitAt === hitBar.time);

    // its options box
    DW.sel = DW.list.indexOf(L); DW.at = pane(); P._render(); P._dr(); await W(30);
    var box = pane().el.querySelector('.stpr-props'); if (box) box.remove(); P._render();
    DW.sel = DW.list.indexOf(L); document.dispatchEvent(new Event('stpr-props')); await W(20);
    // select it by clicking it
    var ly = P._yOf(0, L.price); mev('mousedown', x, ly); mev('mouseup', x, ly); await W(60);
    box = pane().el.querySelector('.stpr-props'); var ab = box && box.querySelector('[data-alert]');
    ok("its options box: Alert hit · arm again, and when it was reached", ab && /Alert hit/.test(ab.textContent) && /Reached at/.test(box.textContent), box && box.textContent);
    ab.click(); await W(30);
    ok('pressing it arms it again', L.alert === true && !L.hitAt && /Alert on/.test(pane().el.querySelector('.stpr-props [data-alert]').textContent));
    pane().el.querySelector('.stpr-props [data-alert]').click(); await W(30);
    ok('pressed again: alert off (the line stays)', L.alert === false && DW.list.indexOf(L) >= 0 && hlT().some(function (t) { return /^\|0$/.test(t); }), hlT());
    pane().el.querySelector('.stpr-props [data-alert]').click(); await W(30);

    // going back before the hit arms it again
    L.hitAt = hitBar.time; P._render(); await W(20);
    for (k = 0; k < 40 && S().now > hitBar.time; k++) { P._back(); await W(10); }
    ok('stepping back to before the hit arms it again', S().now <= hitBar.time && L.alert && !L.hitAt, [hhmm(S().now), L.hitAt]);

    // Alt+A at the crosshair
    var n0 = DW.list.length, yy = P._yOf(0, target + (target > cur ? -0.0008 : 0.0008)); mev('mousemove', x, yy); await W(40);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', altKey: true, bubbles: true })); await W(40);
    var A2 = DW.list[DW.list.length - 1];
    ok('Alt+A adds an alert at the crosshair\'s price', DW.list.length === n0 + 1 && A2.alert && Math.abs(A2.price - (target + (target > cur ? -0.0008 : 0.0008))) < 0.00006, A2 && A2.price);

    // a jump past a line marks it and says so, without stopping short
    DW.list = DW.list.filter(function (d) { return d !== A2; }); L.alert = true; delete L.hitAt; P._render();
    P._goto('12:00'); await W(300);
    ok('Go to 12:00 goes all the way, marks the line it passed and says when', hhmm(S().now) === '12:00' && L.hitAt === hitBar.time && /Alert: price reached/.test(flash()), [hhmm(S().now), L.hitAt && hhmm(L.hitAt), flash()]);
    var stored = JSON.parse(localStorage.getItem('st_practice_draw2:EURUSD') || '[]');
    ok('kept with the drawings (synced like them)', stored.some(function (d) { return d.type === 'hline' && d.alert && d.hitAt === hitBar.time; }));
    // a right-click on a horizontal line offers its alert too
    var ly2 = P._yOf(0, L.price); mev('contextmenu', x, ly2); await W(40);
    var c2 = pane().el.querySelector('.stpr-ctx');
    ok('a right-click on a line: Clone, Delete and Alert on', c2 && c2.querySelector('[data-act="clone"]') && c2.querySelector('[data-act="del"]') && /Alert on/.test(c2.textContent), c2 && c2.textContent);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
