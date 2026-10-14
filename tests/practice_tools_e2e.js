(async function () {
  // Practice Replay, Nestor's batch of 15 Oct 2026: 8x / 16x and Go to a typed time ("do option 4"); no SL / TP lines on
  // hovering BUY / SELL; charts that move up and down without dragging the scale ("the charts feel stuck"); charts that
  // move together ("they need to be all conected"); Trade Replay's drawing behaviour and options box ("the objects seem
  // very buggy ... i dont get the same options box"); session times of his own ("users should be able to edit the times").
  // Real EUR/USD candles of Thu 1 Oct 2026, on this PC's London clock.
  // Run: python tests/browser_test.py tests/practice_tools_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 2; C.tfs = [5, 60, 15, 240]; C.stopPx = { EURUSD: 0.0012 }; C.stopUnit = 'pips'; C.tgtUnit = 'R'; C.tgtR = 2; C.tgtOn = true; C.speed = 0; C.ses = {}; C.max = true;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    var S = function () { return P._s(); }, pane = function (i) { return P._panes()[i || 0]; }, DW = P._dr();
    var hhmm = function (t) { var d = new Date(t * 1000); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    var rng = function (i) { return pane(i).chart.timeScale().getVisibleLogicalRange(); };
    var atF = function (i) { var r = rng(i); return P._tOfL(i, r.from + (r.to - r.from) * 0.7); };
    var mev = function (i, t, xx, yy, o) { var ch = pane(i).el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect(), el = document.elementFromPoint(r.left + xx, r.top + yy) || ch;
      el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || t === 'mousemove' && o && o.held ? 1 : 0 }, o || {}))); };

    // speeds and Go to
    var sp = document.getElementById('stpr-speed'), seen = [sp.textContent];
    for (k = 0; k < 5; k++) { sp.click(); seen.push(sp.textContent); }
    ok('speed goes 1x 2x 4x 8x 16x and back to 1x', seen.join(' ') === '1× 2× 4× 8× 16× 1×', seen.join(' '));
    P._goto('14:30');
    ok('Go to 14:30 plays the market to 14:30', hhmm(S().now) === '14:30', hhmm(S().now));
    var gi = document.getElementById('stpr-goto'); gi.value = '9:05'; gi.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await W(50);
    ok('typing 9:05 and Enter goes back to 09:05 (no trade yet), and the box shows the time', hhmm(S().now) === '09:05' && gi.placeholder === '09:05' && gi.value === '', [hhmm(S().now), gi.placeholder]);
    gi.value = '25:00'; gi.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await W(30);
    ok('a time that is not one is refused with a message', hhmm(S().now) === '09:05' && document.getElementById('stpr-flash').classList.contains('show'));

    // session times of their own
    document.getElementById('stpr-sesed').click(); await W(30);
    var ins = Array.prototype.slice.call(document.querySelectorAll('#stpr-menu [data-sesin]'));
    ok('the session editor lists Asia 22:00, London 08:00, New York 13:30 on this clock', ins.map(function (x) { return x.getAttribute('data-sesin') + ' ' + x.value; }).join(', ') === 'asia 22:00, london 08:00, ny 13:30', ins.map(function (x) { return x.value; }));
    var lon = ins.filter(function (x) { return x.getAttribute('data-sesin') === 'london'; })[0]; lon.value = '07:00'; lon.dispatchEvent(new Event('change', { bubbles: true })); await W(30);
    ok('London set to 07:00: saved, and the London button now jumps to 07:00', C.ses.london === 420 && (P._jump('london'), hhmm(S().now) === '07:00') && document.querySelector('#stpr-ses [data-ses="london"]').title === '07:00', [C.ses, hhmm(S().now)]);
    var as = document.querySelector('#stpr-menu [data-sesin="asia"]'); if (!document.getElementById('stpr-menu').classList.contains('show')) { document.getElementById('stpr-sesed').click(); await W(30); as = document.querySelector('#stpr-menu [data-sesin="asia"]'); }
    as.value = '01:00'; as.dispatchEvent(new Event('change', { bubbles: true })); await W(30);
    ok('Asia at 01:00 lands inside the day (after midnight, not the evening before)', hhmm(S().f.ses.filter(function (x) { return x.id === 'asia'; })[0].at) === '01:00' && S().f.ses[0].id === 'asia', S().f.ses.map(function (x) { return x.id + ' ' + hhmm(x.at); }));
    var rs = document.querySelector('#stpr-menu [data-sesreset]'); if (rs) rs.click(); await W(30);
    ok('Usual times puts them back', !Object.keys(C.ses).length && hhmm(S().f.ses.filter(function (x) { return x.id === 'london'; })[0].at) === '08:00');

    // no lines on hovering BUY / SELL any more
    P._jump('london'); await W(300);
    var sell = document.querySelector('#stpr-tr [data-a="sell"]'); sell.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); await W(30);
    ok('pointing at SELL shows no lines (the SL / TP button does that)', !S().pv && !P._lines(0).length && /Press SL \/ TP/.test(document.getElementById('stpr-tr').textContent), P._lines(0));

    // the charts line up and move together
    var a0 = atF(0), a1 = atF(1);
    ok('after a jump both charts have now at the same place: 07:55 on the 5m, the 07:00 hour on the 1h', hhmm(a0) === '07:55' && hhmm(a1) === '07:00', [hhmm(a0), hhmm(a1)]);
    var r0 = rng(0); P._drive(0); pane(0).chart.timeScale().setVisibleLogicalRange({ from: r0.from - 60, to: r0.to - 60 }); await W(250);
    var b0 = atF(0), b1 = atF(1);
    ok('moving the 5m back 5 hours moves the 1h back to the same time', hhmm(b0) === '02:55' && Math.abs(b1 - b0) <= 3600, [hhmm(b0), hhmm(b1)]);
    var hold0 = rng(0); P._drive(-1); P._step(); P._step(); await W(100); var after0 = rng(0);
    ok('scrolled back into history, playing does not pull the chart back', Math.abs(after0.from - hold0.from) < 0.01, [hold0, after0]);
    P._jump('ny'); await W(350);
    ok('a jump lines them up on now again', hhmm(atF(0)) === '13:25' && hhmm(atF(1)) === '13:00', [hhmm(atF(0)), hhmm(atF(1))]);
    var fr0 = rng(0), last0 = pane(0).n - 1; P._step(); await W(60); var fr1 = rng(0);
    ok('with now on screen, each new candle slides the chart by one candle (now keeps its place)', Math.abs((fr1.from - fr0.from) - (pane(0).n - 1 - last0)) < 0.01 && pane(0).n - 1 - last0 === 1, [fr0.from, fr1.from]);
    var got = null, q1 = pane(1).chart, keep = q1.setCrosshairPosition; q1.setCrosshairPosition = function (pr, t) { got = t; };
    var tb = pane(0).times.filter(function (t) { return hhmm(t) === '12:35'; })[0];
    P._xhair(pane(0), { point: { x: 100, y: 100 }, time: tb }); q1.setCrosshairPosition = keep;
    ok('the crosshair on the 5m at 12:35 shows on the 1h at the 12:00 candle', got && hhmm(got) === '12:00', got && hhmm(got));

    // the chart moves up and down without touching the scale
    var ps0 = pane(0).chart.priceScale('right');
    ok('auto-fit is on after a jump', ps0.options().autoScale === true);
    mev(0, 'mousedown', 300, 200); mev(0, 'mousemove', 300, 240, { held: true }); mev(0, 'mouseup', 300, 240);
    ok('pressing on the chart frees it to move up and down; dragged up or down it stays where it was put', ps0.options().autoScale === false);
    P._jump('ny'); await W(200);
    mev(0, 'mousedown', 300, 200); mev(0, 'mousemove', 340, 201, { held: true }); mev(0, 'mouseup', 340, 201);
    ok('a level drag (sideways only) gives auto-fit back when it ends', ps0.options().autoScale === true);

    // drawings: one drawing on every chart, Trade Replay's options box
    DW.list = []; DW.hist = ['[]']; DW.hpos = 0; DW.sel = null;
    document.getElementById('stpr-drawbtn').click(); await W(20);
    document.querySelector('#stpr-tools [data-tool="rect"]').click();
    mev(1, 'mousedown', 120, 120); mev(1, 'mouseup', 120, 120); mev(1, 'mousemove', 260, 200); await W(40);
    ok('after the first click the rectangle follows the pointer (a live preview)', DW.pending && DW.pending.type === 'rect' && DW.pending.b.t > DW.pending.a.t);
    mev(1, 'mousedown', 260, 200); mev(1, 'mouseup', 260, 200); await W(60);
    var d0 = DW.list[0];
    ok('the second click places it and puts the tool away', DW.list.length === 1 && d0.type === 'rect' && DW.tool === 'none' && DW.sel === 0);
    var box = pane(1).el.querySelector('.stpr-props');
    ok("Trade Replay's options box, in that chart: name, eight colours, its nine timeframes, Clone (no thickness on a rectangle)", box && box.style.display === 'flex' && /RECT/.test(box.textContent) && box.querySelectorAll('[data-col]').length === 8 && box.querySelectorAll('[data-dtf]').length === 9 && !box.querySelector('[data-wid]') && box.querySelector('[data-clone]'), box && box.textContent);
    box.querySelector('[data-col="#4ECD8B"]').click();
    ok('a colour from the box goes on the drawing (and into undo)', d0.color === '#4ECD8B' && DW.hist.length >= 3);
    var x5 = (function () { var r = pane(0).chart.timeScale(); return P._xOfT(0, d0.a.t); })();
    ok('the same rectangle is on the 5m chart, at the same time', x5 != null && isFinite(x5), x5);
    box.querySelector('[data-dtf="5"]').click();
    ok('taking 5m off its timeframes hides it there and keeps it on the 1h', d0.tfs && d0.tfs.indexOf(5) < 0 && d0.tfs.indexOf(60) >= 0, d0.tfs);
    box = pane(1).el.querySelector('.stpr-props'); box.querySelector('[data-dtf="5"]').click();
    ok('and back on: every timeframe again', !d0.tfs);
    var mid = { x: (P._xOfT(1, d0.a.t) + P._xOfT(1, d0.b.t)) / 2, y: (P._yOf(1, d0.a.price) + P._yOf(1, d0.b.price)) / 2 };
    mev(1, 'contextmenu', mid.x, mid.y, { button: 2 }); await W(30);
    var ctx = pane(1).el.querySelector('.stpr-ctx');
    ok('right-click on it: Clone / Delete', ctx && ctx.style.display === 'flex' && /CLONE|Clone/i.test(ctx.textContent) && /Delete/i.test(ctx.textContent), ctx && ctx.textContent);
    ctx.querySelector('[data-act="clone"]').click();
    ok('Clone makes a second one, moved along a little', DW.list.length === 2 && DW.list[1].a.t > d0.a.t && DW.sel === 1);
    var before = DW.list.map(function (d) { return d.a.t; }); mev(1, 'mousedown', mid.x, mid.y); mev(1, 'mousemove', mid.x + 40, mid.y + 10, { held: true }); mev(1, 'mouseup', mid.x + 40, mid.y + 10); await W(30);
    ok('dragging the body moves it', DW.list.some(function (d, i) { return d.a.t > before[i]; }), [before, DW.list.map(function (d) { return d.a.t; })]);
    document.querySelector('#stpr-tools [data-tool="pen"]').click();
    mev(0, 'mousedown', 100, 150); for (k = 1; k <= 8; k++) mev(0, 'mousemove', 100 + k * 12, 150 + (k % 3) * 6, { held: true }); mev(0, 'mouseup', 196, 162); await W(30);
    ok('the pen draws while held and stays armed for the next stroke', DW.list.length === 3 && DW.list[2].type === 'pen' && DW.list[2].pts.length > 3 && DW.tool === 'pen');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    ok('Escape puts the pen away', DW.tool === 'none');
    document.querySelector('#stpr-tools [data-tool="hline"]').click(); mev(0, 'mousedown', 200, 120); mev(0, 'mouseup', 200, 120); await W(120);
    ok('a horizontal line is a line on the price scale of both charts', (pane(0).hl || []).length === 1 && (pane(1).hl || []).length === 1);
    var stored = JSON.parse(localStorage.getItem('st_practice_draw2:EURUSD') || '[]');
    ok('kept for EURUSD in this browser', stored.length === 4);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
