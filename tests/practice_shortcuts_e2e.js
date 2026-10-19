(async function () {
  // TradingView's keyboard shortcuts, Back Testing (batch B, Nestor 19 Oct 2026: "build all the tradingview suggestions!"):
  // Alt+H / Alt+V / Alt+J put a horizontal line, a vertical line, a horizontal ray at the mouse (the last candle and price
  // when the mouse is not on a chart); Alt+T / Alt+R / Alt+F pick the trend line, the rectangle, the fib; Shift + drag
  // measures until the next click; Ctrl+C / Ctrl+V copy and paste the selected drawings (three candles on, same symbol);
  // Delete, Esc, Ctrl+Z / Y, O, Alt+A and the arrow keep their jobs; nothing fires while typing; a press and a drag draws a
  // two-point drawing at once; the list of keys from the keyboard button and from the toolbar's More.
  // Real EUR/USD candles of Thu 1 Oct 2026.  Run: python tests/browser_test.py tests/practice_shortcuts_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stDrawBar); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.mm = Object.assign({}, C.mm, { col: true, on: true }); C.layout = 1; C.tfs = [5, 60, 15, 240]; C.mini = false; C.dtpl = {}; C.ddef = {}; C.dwHide = false; C.dwLock = false; C.news = false;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(600);
    var pane = function () { return P._panes()[0]; }, S = function () { return P._s(); }, DW = P._dr(), DB = P._dbar(), ch = pane().el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0 }, o || {}))); };
    var key = function (k, code, o) { var e = new KeyboardEvent('keydown', Object.assign({ key: k, code: code, bubbles: true, cancelable: true }, o || {})); document.dispatchEvent(e); return e; };
    var last = function () { return DW.list[DW.list.length - 1]; }, flash = function () { return document.getElementById('stpr-flash').textContent; };
    var priceAt = function (y) { return pane().series.coordinateToPrice(y); }, tAt = function (x) { return P._tOfL(0, Math.round(pane().chart.timeScale().coordinateToLogical(x))); };
    DW.list = []; DW.hist = ['[]']; DW.hpos = 0; DW.sel = null; P._props();
    var X = Math.round(r.width * 0.4), Y = 220;

    // 1. Alt+H / Alt+V / Alt+J at the mouse
    mev('mousemove', X, Y); await W(30);
    var e1 = key('˙', 'KeyH', { altKey: true }); await W(40);
    var h = last();
    ok('Alt+H: a horizontal line at the price under the mouse (by the key, so Option+H on a Mac too), selected', h && h.type === 'hline' && Math.abs(h.price - priceAt(Y)) < 0.00002 && DW.sel === DW.list.length - 1 && e1.defaultPrevented, h);
    var e2 = key('√', 'KeyV', { altKey: true }); await W(40);
    var v = last();
    ok('Alt+V: a vertical line at the time under the mouse', v.type === 'vline' && v.a.t === tAt(X) && e2.defaultPrevented, [v.a.t, tAt(X)]);
    mev('mousemove', X + 80, Y + 60); await W(30); key('∆', 'KeyJ', { altKey: true }); await W(40);
    var j = last();
    ok('Alt+J: a horizontal ray from the point under the mouse', j.type === 'hray' && j.a.t === tAt(X + 80) && Math.abs(j.a.price - priceAt(Y + 60)) < 0.00002, j);
    document.querySelector('#stpr-win .stpr-hd, #stpr-win').dispatchEvent(new MouseEvent('mousemove', { clientX: 5, clientY: 5, bubbles: true })); await W(30);
    var lb = pane().bars[pane().bars.length - 1]; key('h', 'KeyH', { altKey: true }); await W(40);
    ok('the mouse off the charts: Alt+H puts it at the last price', DW.cx === null && last().type === 'hline' && Math.abs(last().price - lb.close) < 0.000001, [last().price, lb.close]);

    // 2. Alt+T / Alt+R / Alt+F pick the tool (the drawing tools open)
    if (document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); await W(30);
    key('t', 'KeyT', { altKey: true }); await W(40);
    ok('Alt+T: the trend line tool, the drawing tools open, its group\'s button shows it, lit', DW.tool === 'trend' && document.getElementById('stpr-tb2').classList.contains('drawing') && /^Trend line/.test(document.querySelector('#stpr-tools [data-gtool="lines"]').title) && document.querySelector('#stpr-tools [data-gtool="lines"]').classList.contains('on'), [DW.tool, document.getElementById('stpr-tb2').classList.contains('drawing'), document.querySelector('#stpr-tools [data-gtool="lines"]').title, document.querySelector('#stpr-tools [data-gtool="lines"]').className]);
    key('r', 'KeyR', { altKey: true }); await W(30); var rr = DW.tool; key('f', 'KeyF', { altKey: true }); await W(30); var ff = DW.tool;
    key('f', 'KeyF', { altKey: true }); await W(30);
    ok('Alt+R: the rectangle; Alt+F: the fib (pressed again it stays picked)', rr === 'rect' && ff === 'fib' && DW.tool === 'fib', [rr, ff, DW.tool]);
    key('Escape', 'Escape'); await W(30);
    ok('Esc puts the tool down', DW.tool === 'none');

    // 3. nothing while typing
    var inp = document.createElement('input'); document.getElementById('stpr-win').appendChild(inp); inp.focus(); var n0 = DW.list.length;
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', code: 'KeyH', altKey: true, bubbles: true })); inp.dispatchEvent(new KeyboardEvent('keydown', { key: 't', code: 'KeyT', altKey: true, bubbles: true })); await W(30);
    ok('typing in a box: Alt+H and Alt+T do nothing', DW.list.length === n0 && DW.tool === 'none'); inp.remove();
    key('h', 'KeyH', { altKey: true, ctrlKey: true }); await W(30);
    ok('AltGr (Ctrl+Alt) never draws', DW.list.length === n0);

    // 4. a press and a drag draws a two-point drawing at once; a press, a move and a press as before
    document.querySelector('#stpr-tools [data-tool="rect"]').click(); await W(30);
    mev('mousedown', X - 100, 300); mev('mousemove', X - 70, 320, { held: true }); mev('mousemove', X - 40, 340, { held: true }); mev('mouseup', X - 40, 340); await W(60);
    var rc = last();
    ok('Rectangle by a drag: drawn when let go, selected, the tool put down', rc.type === 'rect' && DW.tool === 'none' && rc.b.price !== rc.a.price && Math.abs(P._yOf(0, rc.b.price) - 340) < 2, rc);
    document.querySelector('#stpr-tools [data-tool="trend"]').click(); await W(20); mev('mousedown', X, 380); mev('mouseup', X, 380); mev('mousemove', X + 50, 360); await W(20);
    ok('a plain click still starts one that waits for the second click', DW.pending && DW.pending.type === 'trend'); mev('mousedown', X + 50, 360); mev('mouseup', X + 50, 360); await W(40);

    // 5. Ctrl+C / Ctrl+V
    DW.sel = DW.list.indexOf(rc); P._props(); var n1 = DW.list.length;
    var ec = key('c', 'KeyC', { ctrlKey: true }); await W(30);
    ok('Ctrl+C with a drawing selected: copied, it says so', ec.defaultPrevented && /Drawing copied/.test(flash()), flash());
    key('v', 'KeyV', { ctrlKey: true }); await W(40);
    var pc = last(), L0 = P._lOfT(0, rc.a.t), L1 = P._lOfT(0, pc.a.t);
    ok('Ctrl+V: a copy where it was, three candles on, at the same prices, selected', DW.list.length === n1 + 1 && pc.type === 'rect' && pc !== rc && Math.round(L1 - L0) === 3 && pc.a.price === rc.a.price && pc.b.price === rc.b.price && DW.sel === n1, [L0, L1]);
    key('v', 'KeyV', { ctrlKey: true }); await W(40);
    ok('Ctrl+V again: another, three more candles on', DW.list.length === n1 + 2 && Math.round(P._lOfT(0, last().a.t) - L0) === 6);
    key('z', 'KeyZ', { ctrlKey: true }); await W(30); key('z', 'KeyZ', { ctrlKey: true }); await W(30);
    ok('Ctrl+Z takes the pastes back one by one', DW.list.length === n1);
    var byT = function (t) { return DW.list.filter(function (d) { return d.type === t; })[0]; }; rc = byT('rect'); v = byT('vline');   // undo gives the list back as copies
    var al = DW.list.filter(function (d) { return d.type === 'hline'; })[0]; al.alert = true; DW.sel = DW.list.indexOf(al); P._props();
    key('c', 'KeyC', { ctrlKey: true }); key('v', 'KeyV', { ctrlKey: true }); await W(40);
    ok('a line with an alert pastes as a plain line (no second alert), 5 pips up', last().type === 'hline' && !last().alert && Math.abs(last().price - al.price - 0.0005) < 1e-9, last());
    DW.sel = null; DW.multi = [DW.list.indexOf(rc), DW.list.indexOf(v)]; key('c', 'KeyC', { ctrlKey: true }); await W(20);
    ok('Ctrl+C with two selected (Ctrl + drag): both copied', /2 drawings copied/.test(flash()), flash());
    var n2 = DW.list.length; key('v', 'KeyV', { ctrlKey: true }); await W(40);
    ok('Ctrl+V pastes both, both selected', DW.list.length === n2 + 2 && DW.multi && DW.multi.length === 2);
    DW.clip.raw = 'GBPUSD'; var n3 = DW.list.length; key('v', 'KeyV', { ctrlKey: true }); await W(30);
    ok('copied on another symbol: they paste there only, and it says so', DW.list.length === n3 && /paste on GBPUSD only/.test(flash()), flash());
    DW.sel = null; DW.multi = null; DW.clip = null; var ec2 = key('c', 'KeyC', { ctrlKey: true });
    ok('Ctrl+C with nothing selected is left to the browser', !ec2.defaultPrevented);

    // 6. Delete / Backspace (a locked one stays)
    DW.sel = DW.list.indexOf(rc); var n4 = DW.list.length; key('Backspace', 'Backspace'); await W(30);
    ok('Backspace deletes the selected drawing', DW.list.length === n4 - 1 && DW.list.indexOf(rc) < 0);
    DW.list[0].lock = true; DW.sel = 0; key('Delete', 'Delete'); await W(30);
    ok('a locked one stays', DW.list.length === n4 - 1 && /Locked/.test(flash()), flash()); delete DW.list[0].lock; DW.sel = null; P._props();

    // 7. Shift + drag: a measure, gone at the next click
    var vr0 = JSON.stringify(pane().chart.timeScale().getVisibleLogicalRange()), nL = DW.list.length;
    mev('mousedown', X - 60, 150, { shiftKey: true }); mev('mousemove', X, 200, { held: true, shiftKey: true }); mev('mousemove', X + 40, 260, { held: true, shiftKey: true }); mev('mouseup', X + 40, 260, { shiftKey: true }); await W(60);
    var ms = DW.meas;
    ok('Shift + drag: a measure from the press to the release, in the Measure tool\'s look, not kept as a drawing', ms && !ms.live && ms.d.type === 'range' && Math.abs(P._yOf(0, ms.d.b.price) - 260) < 2 && Math.abs(P._yOf(0, ms.d.a.price) - 150) < 2 && DW.list.length === nL, ms && ms.d);
    ok('the chart did not move under it', JSON.stringify(pane().chart.timeScale().getVisibleLogicalRange()) === vr0);
    P._drawOv(0); var c = pane().ov, dpr = window.devicePixelRatio || 1, ink = 0, mx = Math.round((P._xOfT(0, ms.d.a.t) + P._xOfT(0, ms.d.b.t)) / 2);
    for (var yy = 160; yy < 250; yy += 3) { var px = c.getContext('2d').getImageData(Math.round(mx * dpr), Math.round(yy * dpr), 1, 1).data; if (px[0] > 200 && px[1] > 200 && px[2] > 200 && px[3] > 150) ink++; }
    ok('drawn: its white upright line between the two prices', ink > 20, ink);
    mev('mousedown', X + 200, 400); mev('mouseup', X + 200, 400); await W(40);
    ok('the next click takes it away', DW.meas === null);
    mev('mousedown', X - 60, 150, { shiftKey: true }); mev('mousemove', X, 220, { held: true, shiftKey: true }); mev('mouseup', X, 220, { shiftKey: true }); await W(30); key('Escape', 'Escape'); await W(20);
    ok('so does Esc', DW.meas === null);
    mev('mousedown', X - 60, 150, { shiftKey: true }); mev('mouseup', X - 60, 150, { shiftKey: true }); await W(20);
    ok('a Shift-click with no drag leaves nothing', DW.meas === null);

    // 8. the old keys keep their jobs
    var ex0 = !!S().exec; key('o', 'KeyO'); await W(30);
    ok('O: execution mode, as before', !!S().exec !== ex0); key('o', 'KeyO'); await W(20);
    mev('mousemove', X, 300); await W(20); var na = DW.list.length; key('a', 'KeyA', { altKey: true }); await W(40);
    ok('Alt+A: an alert at the mouse, as before', DW.list.length === na + 1 && last().alert === true);
    var now0 = S().now; key('ArrowRight', 'ArrowRight'); await W(80);
    ok('the right arrow: the next step, as before', S().now > now0, [now0, S().now]);

    // 9. the list of keys
    var kb = document.getElementById('stpr-keysbtn'); kb.click(); await W(60);
    var m = document.getElementById('stpr-menu'), txt = m.textContent;
    ok('the keyboard button beside the padlock opens the list of keys', m.classList.contains('show') && /Keyboard shortcuts/.test(txt) && m.querySelectorAll('.stk-r').length >= 16 && /Horizontal line at the mouse/.test(txt) && /Measure, until the next click/.test(txt) && m.querySelector('.stk-k kbd') && /Copy the selected drawing/.test(txt) && /Paste it, three candles on/.test(txt), txt.slice(0, 300));
    var mr = m.getBoundingClientRect();
    ok('it fits in the window', mr.right <= window.innerWidth && mr.left >= 0, [mr.left, mr.right]);
    kb.click(); await W(30);
    DW.sel = DW.list.indexOf(v); DW.noProps = false; P._props(); await W(30);
    document.querySelector('.stdb-bar [data-db="more"]').click(); await W(30);
    DB.pop().querySelector('[data-keys]').click(); await W(30);
    ok('and the toolbar\'s More > Keyboard shortcuts', DB.popK() === 'keys' && DB.pop().querySelectorAll('.stk-r').length >= 16 && DB.pop().offsetWidth > 250, DB.pop().textContent.slice(0, 200));
    DB.closePop();
    if (typeof setLanguage === 'function') { setLanguage('es'); await W(200);
      kb.click(); await W(60); txt = document.getElementById('stpr-menu').textContent;
      ok('in Spanish: Atajos de teclado, Línea horizontal en el ratón, Medir, hasta el siguiente clic, arrastrar', /Atajos de teclado/.test(txt) && /Línea horizontal en el ratón/.test(txt) && /Medir, hasta el siguiente clic/.test(txt) && /arrastrar/.test(txt) && kb.title === 'Atajos de teclado', txt.slice(0, 200));
      kb.click(); setLanguage('en'); await W(200); }
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
