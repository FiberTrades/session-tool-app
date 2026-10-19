(async function () {
  // Practice Replay, Nestor's batch of 15 Oct 2026: 8x / 16x and Go to a typed time ("do option 4"); no SL / TP lines on
  // hovering BUY / SELL; charts that move up and down without dragging the scale ("the charts feel stuck"); charts that
  // line up ("they need to be all conected") but drag on their own ("stop that"); Trade Replay's drawing behaviour and options box ("the objects seem
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
    var C = P._cfg(); C.mm = Object.assign({}, C.mm, { col: true });   // folded: the open panel hangs over the first chart's top left, where these clicks go
    C.layout = 2; C.tfs = [5, 60, 15, 240]; C.stopPx = { EURUSD: 0.0012 }; C.stopUnit = 'pips'; C.tgtUnit = 'R'; C.tgtR = 2; C.tgtOn = true; C.speed = 0; C.ses = {}; C.max = true;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    var S = function () { return P._s(); }, pane = function (i) { return P._panes()[i || 0]; }, DW = P._dr();
    var hhmm = function (t) { var d = new Date(t * 1000); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    var rng = function (i) { return pane(i).chart.timeScale().getVisibleLogicalRange(); };
    var settle = async function () { for (var z = 0; z < 80; z++) { if (P._panes().every(function (p) { var r = p.chart.timeScale().getVisibleLogicalRange(); return !p._set || (r && Math.abs(r.from - p._set.from) < 0.01 && Math.abs(r.to - p._set.to) < 0.01); })) return; await W(100); } };   // until every chart shows the view it was given
    var atF = function (i) { var r = rng(i); return P._tOfL(i, r.from + (r.to - r.from) * 0.7); };
    var mev = function (i, t, xx, yy, o) { var ch = pane(i).el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect(), el = document.elementFromPoint(r.left + xx, r.top + yy) || ch;
      el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || t === 'mousemove' && o && o.held ? 1 : 0 }, o || {}))); };

    // speeds and Go to
    var sp = document.getElementById('stpr-speed'), seen = [sp.textContent];
    for (k = 0; k < 5; k++) { sp.click(); seen.push(sp.textContent); }
    ok('speed goes 1x 2x 4x 8x 16x and back to 1x', seen.join(' ') === '1× 2× 4× 8× 16× 1×', seen.join(' '));
    P._goto('14:30');
    ok('Go to 14:30 plays the market to 14:30', hhmm(S().now) === '14:30', hhmm(S().now));
    document.getElementById('stpr-goto').click(); await W(30);
    var hs = Array.prototype.map.call(document.querySelectorAll('#stpr-menu [data-tph]'), function (x) { return x.textContent; }), ms = Array.prototype.map.call(document.querySelectorAll('#stpr-menu [data-tpm]'), function (x) { return x.textContent; }), gb = document.querySelector('#stpr-menu [data-tpgo]');
    ok('Go to opens a plain time picker: hours 00-23, minutes in 5s, the time now picked', hs.length === 24 && hs[0] === '00' && hs[23] === '23' && ms.length === 12 && ms[1] === '05' && gb && gb.textContent === 'Go to 14:30', [hs.length, ms.join(' '), gb && gb.textContent]);
    document.querySelector('#stpr-menu [data-tph="9"]').click(); document.querySelector('#stpr-menu [data-tpm="5"]').click(); await W(20);
    ok('picking 09 and 05 changes the button to Go to 09:05 (nothing moves yet)', gb.textContent === 'Go to 09:05' && hhmm(S().now) === '14:30', gb.textContent);
    gb.click(); await W(50);
    ok('Go to 09:05 goes back to 09:05 (no trade yet), closes the picker and the button shows the time', hhmm(S().now) === '09:05' && document.getElementById('stpr-gotot').textContent === '09:05' && !document.getElementById('stpr-menu').classList.contains('show'), [hhmm(S().now), document.getElementById('stpr-gotot').textContent]);

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
    P._jump('london'); await W(300); await settle();
    ok('no SELL / BUY under the chart and no lines until execution mode (Nestor, 17 Oct 2026: "remove buy sell buttons")', !document.querySelector('#stpr-tr [data-a="sell"]') && !document.querySelector('#stpr-tr [data-a="buy"]') && !S().pv && !P._lines(0).length && /then click the chart where your stop goes/.test(document.getElementById('stpr-tr').textContent), P._lines(0));

    // the charts line up and move together
    var a0 = atF(0), a1 = atF(1);
    ok('after a jump both charts have now at the same place: 07:55 on the 5m, the 07:00 hour on the 1h', hhmm(a0) === '07:55' && hhmm(a1) === '07:00', [hhmm(a0), hhmm(a1), 'now ' + hhmm(S().now), JSON.stringify(C.ses), S().f.ses.map(function (x) { return x.id + ' ' + hhmm(x.at); }).join(','), rng(0), pane(0)._set]);
    var r0 = rng(0), r1 = rng(1), pe = function (t) { pane(0).el.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 9, pointerType: 'mouse' })); };
    pe('pointerdown'); pane(0).chart.timeScale().setVisibleLogicalRange({ from: r0.from - 60, to: r0.to - 60 }); pe('pointerup'); for (var zw = 0; zw < 80 && Math.abs(rng(0).from - (r0.from - 60)) > 0.01; zw++) await W(100); await W(250);
    var b0 = atF(0), r1b = rng(1);
    ok('dragging the 5m back 5 hours moves only the 5m: the 1h stays where it was', hhmm(b0) === '02:55' && Math.abs(r1b.from - r1.from) < 0.01, [hhmm(b0), r1.from, r1b.from]);
    var hold0 = rng(0); P._step(); P._step(); await W(300); var after0 = rng(0);
    ok('scrolled back into history, playing does not pull the chart back', Math.abs(after0.from - hold0.from) < 0.01, [hold0, after0]);
    P._jump('ny'); await W(350); await settle();
    ok('a jump lines them up on now again', hhmm(atF(0)) === '13:25' && hhmm(atF(1)) === '13:00', [hhmm(atF(0)), hhmm(atF(1))]);
    var fr0 = rng(0), last0 = pane(0).n - 1; P._step(); for (var zz = 0; zz < 30 && Math.abs(rng(0).from - fr0.from) < 0.01; zz++) await W(100); var fr1 = rng(0);   // a busy headless browser can be slow to apply the view
    ok('with now on screen, each new candle slides the chart by one candle (now keeps its place)', Math.abs((fr1.from - fr0.from) - (pane(0).n - 1 - last0)) < 0.01 && pane(0).n - 1 - last0 === 1, [fr0.from, fr1.from]);
    var tb = pane(0).times.filter(function (t) { return hhmm(t) === '12:35' && new Date(t * 1000).getDate() === 1; })[0];
    await settle(); mev(0, 'mousemove', P._xOfT(0, tb), 150); await W(60);
    var c0 = P._cx(0), c1 = P._cx(1);
    ok("Trade Replay's crosshair: the chart's own is hidden, ours sits on the 5m at 12:35 and on the 1h at the 12:00 candle, same price", pane(0).chart.options().crosshair.mode === 2 && c0 && hhmm(c0.t) === '12:35' && c1 && hhmm(c1.t) === '12:00' && Math.abs(c1.pr - c0.pr) < 1e-9, [c0 && hhmm(c0.t), c1 && hhmm(c1.t)]);

    // the chart moves up and down without touching the scale
    var ps0 = pane(0).chart.priceScale('right');
    ok('auto-fit is on after a jump', ps0.options().autoScale === true);
    mev(0, 'mousedown', 300, 200); mev(0, 'mousemove', 300, 240, { held: true }); mev(0, 'mouseup', 300, 240);
    ok('pressing on the chart frees it to move up and down; dragged up or down it stays where it was put', ps0.options().autoScale === false);
    P._jump('ny'); await W(200); await settle();
    mev(0, 'mousedown', 300, 200); mev(0, 'mousemove', 340, 201, { held: true }); mev(0, 'mouseup', 340, 201);
    ok('a level drag (sideways only) gives auto-fit back when it ends', ps0.options().autoScale === true);

    // Show on chart: Trade Replay's Trade marks and Position tool
    document.getElementById('stpr-layersbtn').click(); await W(30);
    var mn = document.getElementById('stpr-menu');
    ok("the layers button opens Trade Replay's Show on chart: Trade marks and Position tool, both on", mn.classList.contains('show') && /Show on chart/i.test(mn.textContent) && document.getElementById('stpr-marks').checked && document.getElementById('stpr-pos').checked, mn.textContent);
    C.stopPx.EURUSD = 0.01; P._place(1); for (k = 0; k < 4; k++) P._step(); await settle(); P._render(); await W(150);
    ok('in a trade the position tool draws its zones on both charts', pane(0)._zones === 1 && pane(1)._zones === 1, [pane(0)._zones, pane(1)._zones]);
    var mk = document.getElementById('stpr-marks'); mk.checked = false; mk.dispatchEvent(new Event('change', { bubbles: true })); await W(80);
    ok('Trade marks off hides the Entry / SL / TP lines and their labels (and lights the dot)', C.marks === false && P._lines(0).length >= 3 && ['Entry', 'SL', 'TP'].every(function (t) { return P._lines(0).some(function (l) { return l.title.indexOf(t) === 0; }); }) && P._lines(0).every(function (l) { return !l.vis; }) && document.getElementById('stpr-layersbtn').classList.contains('dot'), P._lines(0));
    var po = document.getElementById('stpr-pos'); po.checked = false; po.dispatchEvent(new Event('change', { bubbles: true })); await settle(); P._render(); await W(150);
    ok('Position tool off takes the zones away', C.pos === false && pane(0)._zones === 0);
    mk.checked = true; mk.dispatchEvent(new Event('change', { bubbles: true })); po.checked = true; po.dispatchEvent(new Event('change', { bubbles: true }));
    P._close(); S().done = null; await settle(); P._render(); await W(150);
    ok('a closed trade keeps its box, with the R it made', pane(0)._zones === 1 && C.marks === true && !document.getElementById('stpr-layersbtn').classList.contains('dot'));
    document.getElementById('stpr-layersbtn').click(); await W(20); C.stopPx.EURUSD = 0.0012;

    // drawings: one drawing on every chart, Trade Replay's options box
    DW.list = []; DW.hist = ['[]']; DW.hpos = 0; DW.sel = null;
    document.getElementById('stpr-drawbtn').click(); await W(20);
    document.querySelector('#stpr-tools [data-tool="rect"]').click();
    mev(1, 'mousedown', 120, 120); mev(1, 'mouseup', 120, 120); mev(1, 'mousemove', 260, 200); await W(40);
    ok('after the first click the rectangle follows the pointer (a live preview)', DW.pending && DW.pending.type === 'rect' && DW.pending.b.t > DW.pending.a.t);
    mev(1, 'mousedown', 260, 200); mev(1, 'mouseup', 260, 200); await W(60);
    var d0 = DW.list[0];
    ok('the second click places it and puts the tool away', DW.list.length === 1 && d0.type === 'rect' && DW.tool === 'none' && DW.sel === 0);
    // the options box is TradingView's drawing toolbar since 19 Oct 2026 (Nestor: "build all the tradingview suggestions!")
    var bar = document.querySelector('.stdb-bar'), DB = P._dbar(), pr1 = pane(1).el.querySelector('.stpr-pc').getBoundingClientRect(), br = bar && bar.getBoundingClientRect(), vbtn = function () { return document.querySelector('.stdb-bar [data-db="vis"]'); };
    ok("the drawing toolbar over it, in that chart: Templates, line colour, fill, text, width, style, Visibility (all timeframes), lock, delete, More", bar && bar.style.display === 'flex' && ['tpl', 'line', 'fill', 'text', 'width', 'dash', 'vis', 'lock', 'del', 'more'].every(function (k) { return bar.querySelector('[data-db="' + k + '"]'); }) && /Visibility: All timeframes/.test(vbtn().title) && br.left >= pr1.left - 8 && br.bottom <= pr1.top + Math.min(P._yOf(1, d0.a.price), P._yOf(1, d0.b.price)), br && [br.left, br.bottom, pr1.left, pr1.top]);
    DB.open('more'); await W(30);
    ok('its More: RECT, Visibility: All timeframes, Clone', /RECT/.test(DB.pop().textContent) && /Visibility: All timeframes/.test(DB.pop().querySelector('[data-mvis]').textContent) && DB.pop().querySelector('[data-clone]'), DB.pop().textContent);
    DB.open('line'); await W(30); DB.pop().querySelector('[data-pc="#4ECD8B"]').click(); DB.closePop();
    ok('a colour from its line colour goes on the drawing (and into undo)', d0.color === '#4ECD8B' && DW.hist.length >= 3);
    var x5 = (function () { var r = pane(0).chart.timeScale(); return P._xOfT(0, d0.a.t); })();
    ok('the same rectangle is on the 5m chart, at the same time', x5 != null && isFinite(x5), x5);
    // its Visibility window, TradingView's (17 Oct 2026: "i need the visability option ... for all the objects")
    vbtn().click(); await W(40);
    var dlg = document.querySelector('.stpr-dlg');
    ok('Visibility opens a window like TradingView\'s: Minutes, Hours, Days, Weeks, Months, each with a range', dlg && /Visibility/.test(dlg.textContent) && dlg.querySelectorAll('.stpr-dvr').length === 5 && /Shows on: All timeframes/.test(dlg.textContent), dlg && dlg.textContent);
    var mOn = dlg.querySelector('[data-k="vis.m.on"]'); mOn.checked = false; mOn.dispatchEvent(new Event('change', { bubbles: true })); await W(40);
    ok('Minutes off: gone from the 5m chart at once, still on the 1h; the window says where it shows', d0.vis && !P._visOK(d0.vis, 5) && P._visOK(d0.vis, 60) && /Shows on: 1h 4h 12h 1D 1W 1Y/.test(document.querySelector('.stpr-dlg').textContent), d0.vis);
    document.querySelector('.stpr-dlg [data-dok]').click(); await W(40);
    ok('Ok keeps it; its eye reads Visibility: 1h 4h 12h 1D 1W 1Y', !document.querySelector('.stpr-dlg') && /Visibility: 1h 4h 12h 1D 1W 1Y/.test(vbtn().title), vbtn().title);
    vbtn().click(); await W(40);
    var hb = document.querySelector('.stpr-dlg [data-k="vis.h.b"][type="number"]'); hb.value = '1'; hb.dispatchEvent(new Event('change', { bubbles: true })); await W(30);
    ok('Hours 1 to 1: on the 1h only, not the 4h', P._visOK(d0.vis, 60) && !P._visOK(d0.vis, 240), d0.vis);
    document.querySelector('.stpr-dlg [data-dc]').click(); await W(30);
    ok('Cancel puts back what it was (1h and up)', P._visOK(d0.vis, 240) && !P._visOK(d0.vis, 5), d0.vis);
    vbtn().click(); await W(40);
    document.querySelector('.stpr-dlg [data-ddef]').click(); document.querySelector('.stpr-dlg [data-dreset]').click(); await W(30); document.querySelector('.stpr-dlg [data-dok]').click(); await W(30);
    ok('Defaults > Reset settings: every timeframe again', !d0.vis && !d0.tfs);
    var mid = { x: (P._xOfT(1, d0.a.t) + P._xOfT(1, d0.b.t)) / 2, y: (P._yOf(1, d0.a.price) + P._yOf(1, d0.b.price)) / 2 };
    mev(1, 'contextmenu', mid.x, mid.y, { button: 2 }); await W(30);
    var ctx = pane(1).el.querySelector('.stpr-ctx');
    ok('right-click on it: Clone / Delete', ctx && ctx.style.display === 'flex' && /CLONE|Clone/i.test(ctx.textContent) && /Delete/i.test(ctx.textContent), ctx && ctx.textContent);
    ctx.querySelector('[data-act="clone"]').click();
    ok('Clone makes a second one, moved along a little', DW.list.length === 2 && DW.list[1].a.t > d0.a.t && DW.sel === 1);
    var before = DW.list.map(function (d) { return d.a.t; }); mev(1, 'mousedown', mid.x, mid.y); mev(1, 'mousemove', mid.x + 40, mid.y + 10, { held: true }); mev(1, 'mouseup', mid.x + 40, mid.y + 10); await W(30);
    ok('dragging the body moves it', DW.list.some(function (d, i) { return d.a.t > before[i]; }), [before, DW.list.map(function (d) { return d.a.t; })]);
    var cur = DW.list[DW.sel], m2 = { x: (P._xOfT(1, cur.a.t) + P._xOfT(1, cur.b.t)) / 2, y: (P._yOf(1, cur.a.price) + P._yOf(1, cur.b.price)) / 2 };
    var pb1 = document.querySelector('.stdb-bar'); if (pb1) pb1.style.display = 'none';   // out of the way of the presses below
    mev(1, 'mousedown', m2.x, m2.y); var si = DW.sel, w0 = P._lOfT(1, DW.list[si].b.t) - P._lOfT(1, DW.list[si].a.t), wk = [];
    for (k = 1; k <= 20; k++) { mev(1, 'mousemove', m2.x - k * 30, m2.y, { held: true }); wk.push(Math.round((P._lOfT(1, DW.list[si].b.t) - P._lOfT(1, DW.list[si].a.t)) * 100) / 100); }
    mev(1, 'mouseup', m2.x - 600, m2.y); await W(30);
    var crossed = new Date(DW.list[si].a.t * 1000).getDay() <= 5 && DW.list[si].a.t < Date.parse('2026-09-26T21:00:00Z') / 1000;
    ok('a rectangle dragged back across the weekend keeps its width in candles the whole way', crossed && wk.every(function (w) { return Math.abs(w - w0) < 0.01; }), { w0: w0, widths: wk, a: new Date(DW.list[si].a.t * 1000).toISOString() });
    document.querySelector('#stpr-tools [data-tool="pen"]').click();
    mev(0, 'mousedown', 100, 150); for (k = 1; k <= 8; k++) mev(0, 'mousemove', 100 + k * 12, 150 + (k % 3) * 6, { held: true }); mev(0, 'mouseup', 196, 162); await W(30);
    ok('the pen draws while held and stays armed for the next stroke', DW.list.length === 3 && DW.list[2].type === 'pen' && DW.list[2].pts.length > 3 && DW.tool === 'pen');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    ok('Escape puts the pen away', DW.tool === 'none');
    var hx = pane(0).el.clientWidth * 0.6; document.querySelector('#stpr-tools [data-tool="hline"]').click(); mev(0, 'mousedown', hx, 260); mev(0, 'mouseup', hx, 260); await W(120);   // clear of the pen's options box
    ok('a horizontal line is a line on the price scale of both charts', (pane(0).hl || []).length === 1 && (pane(1).hl || []).length === 1);
    var stored = JSON.parse(localStorage.getItem('st_practice_draw2:EURUSD') || '[]');
    ok('kept for EURUSD in this browser', stored.length === 4);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
