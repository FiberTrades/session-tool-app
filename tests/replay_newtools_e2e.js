(async function () {
  // Batch B in Trade Replay (Nestor's rule: what Back Testing / Live Charts get, Trade Replay gets): the eight new tools (vertical
  // line, ray, horizontal ray, arrow, parallel channel, highlighter, price note, circle) on the drawing bar, the tools row in
  // TradingView's groups, the keys (Alt+H / V / J / T / R / F, Shift + drag to measure, Ctrl+C / V, Ctrl+Z / Y) and their list.
  // A made-up EUR/USD short on Thu 1 Oct 2026 over the real shared candles (signed out: nothing read from or written to a journal).
  // Run: python tests/browser_test.py tests/replay_newtools_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stReplay && window.__stSB && window.__stPractice && window.__stDrawBar); i++) await W(100);
    await W(1000);
    var R = window.__stReplay, PC = window.__stPractice._cfg();
    try { localStorage.removeItem('st_replay_draw2_999999905'); localStorage.removeItem('st_replay_dwhide'); localStorage.removeItem('st_replay_dwlock'); localStorage.removeItem('st_replay_tgrp'); } catch (e) {}
    PC.dtpl = {}; PC.ddef = {};
    var trade = { mt5Ticket: 999999905, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 };
    R.open(trade); for (var k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(900);
    var S = R._s(); S.drawings = []; S.history = [[]]; S.hpos = 0; S.sel = null;
    var chart = document.getElementById('strp-chart'), r = chart.getBoundingClientRect(), DB = R._dbar(), K = window.__stDrawBar.kit;
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || chart; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0, detail: 1 }, o || {}))); };
    var click = function (xx, yy) { mev('mousedown', xx, yy); mev('mouseup', xx, yy); };
    var key = function (k, code, o) { var e = new KeyboardEvent('keydown', Object.assign({ key: k, code: code, bubbles: true, cancelable: true }, o || {})); document.dispatchEvent(e); return e; };
    var bar = function () { var b = document.querySelector('.strp-card .stdb-bar'); return b && b.style.display !== 'none' ? b : null; }, pop = function () { return DB.pop(); };
    var acts = function () { var b = bar(); return b ? Array.prototype.map.call(b.querySelectorAll('[data-db]'), function (x) { return x.getAttribute('data-db'); }).join(',') : ''; };
    var px = async function (x, y) { S.cx = null; await W(40); var c = document.getElementById('strp-ov'), d = window.devicePixelRatio || 1; return Array.prototype.slice.call(c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data); };
    var near = function (c, rgb, tol) { return Math.abs(c[0] - rgb[0]) <= (tol || 10) && Math.abs(c[1] - rgb[1]) <= (tol || 10) && Math.abs(c[2] - rgb[2]) <= (tol || 10); };
    var last = function () { return S.drawings[S.drawings.length - 1]; }, flashT = function () { return document.getElementById('strp-flash').textContent; };
    var pick = async function (t) { if (S.activeTool !== t) document.querySelector('#strp-tools [data-tool="' + t + '"]').click(); await W(30); };
    var db = document.getElementById('strp-drawbtn'); if (db && !document.getElementById('strp-tb').classList.contains('strp-drawopen')) db.click(); await W(60);
    var X = Math.round(r.width * 0.35), XK = R._kx();

    // 1. the row in groups
    var tools = document.getElementById('strp-tools'), cells = Array.prototype.filter.call(tools.children, function (e) { return e.offsetWidth > 0; });
    ok('the tools row: 8 cells, three of them groups; all 18 tools there once', cells.length === 8 && tools.querySelectorAll('.stpr-tg').length === 3 && tools.querySelectorAll('[data-tool]').length === 18, cells.length);
    tools.querySelector('[data-tgrp="lines"]').click(); await W(40);
    var fl = tools.querySelector('.stpr-tg[data-grp="lines"] .stpr-tfl');
    ok('the lines group opens its list, with the keys', fl.offsetWidth > 150 && /Horizontal rayAlt\+J/.test(fl.textContent) && /Vertical lineAlt\+V/.test(fl.textContent), fl.textContent);
    key('Escape', 'Escape'); await W(30);
    ok('Esc closes the list first, not the replay', !tools.querySelector('.stpr-tg.open') && document.getElementById('strp-modal-bg').classList.contains('show'));

    // 2. vertical line, horizontal ray
    await pick('vline'); click(X, 120); await W(80);
    var v = last(); S.sel = null; var vx = R._P(v.a).x, vt = await px(Math.round(vx), 20), va = await px(Math.round(vx), XK.ph + 9);
    ok('Vertical line: one click, the full height, blue, its time on the axis', v.type === 'vline' && Math.abs(vx - X) < 10 && near(vt, [96, 165, 250]) && near(va, [96, 165, 250]), [vt, va]);
    await pick('hray'); click(X, 150); await W(80);
    var hr = last(), pl = (S._plines || []).map(function (l) { return l.options(); }).filter(function (o) { return Math.abs(o.price - hr.a.price) < 1e-9; })[0];
    ok('Horizontal ray: one click; its price on the scale, no full-width line', hr.type === 'hray' && pl && pl.lineVisible === false && pl.axisLabelVisible === true, pl);

    // 3. ray, arrow (two clicks), channel (three), circle (a drag), highlighter, note
    await pick('ray'); click(X, 300); mev('mousemove', X + 60, 270); click(X + 60, 270); await W(80);
    var ry = last(), ra = R._P(ry.a), rb = R._P(ry.b), k2 = (rb.y - ra.y) / (rb.x - ra.x), rbe = await px(Math.round(rb.x + 70), Math.round(rb.y + 70 * k2));
    ok('Ray: on past its second point', ry.type === 'ray' && near(rbe, [96, 165, 250], 16), rbe);
    await pick('arrow'); click(X - 150, 330); mev('mousemove', X - 80, 300); click(X - 80, 300); await W(80);
    ok('Arrow: two clicks', last().type === 'arrow');
    await pick('channel'); click(X + 120, 380); mev('mousemove', X + 240, 360); click(X + 240, 360); mev('mousemove', X + 180, 320); await W(30); click(X + 180, 320); await W(80);
    var cn = last(), cy0 = R._P(cn.a).y, cy1 = R._P({ idx: cn.a.idx, price: cn.a.price + cn.off }).y;
    ok('Parallel channel: three clicks, the other line through the third', cn.type === 'channel' && !('st' in cn) && Math.abs((cy0 - cy1) - 50) < 6 && S.activeTool === 'none', [cy0 - cy1]);
    ok('its toolbar: Templates, line, fill, width, style, Visibility, lock, delete, More', acts() === 'tpl,line,fill,width,dash,vis,lock,del,more', acts());
    await pick('circle'); mev('mousedown', X - 120, 420); mev('mousemove', X - 100, 430, { held: true }); mev('mousemove', X - 80, 440, { held: true }); mev('mouseup', X - 80, 440); await W(80);
    var ci = last(), ce = K.box(ci, R._kx());
    ok('Circle: a press and a drag', ci.type === 'circle' && S.activeTool === 'none' && Math.abs((ce.y1 - ce.y0) - 40) < 3, ce);
    await pick('brush'); mev('mousedown', X + 260, 200); for (var s = 1; s <= 10; s++) { var bx = r.left + X + 260 + s * 8, by = r.top + 200 + (s % 3) * 3, tg = document.elementFromPoint(bx, by) || chart; tg.dispatchEvent(new PointerEvent('pointerrawupdate', { clientX: bx, clientY: by, bubbles: true })); tg.dispatchEvent(new MouseEvent('mousemove', { clientX: bx, clientY: by, bubbles: true, buttons: 1 })); }
    mev('mouseup', X + 340, 200); await W(80);
    var br = last();
    ok('Highlighter: a wide see-through stroke, the tool still armed', br.type === 'brush' && br.pts.length > 3 && S.activeTool === 'brush' && K.box(br, R._kx()), br.pts.length);
    await pick('brush'); await pick('note'); click(X + 60, 460); await W(80);
    var nt = last(), ta = document.querySelector('.strp-txed');
    ok('Price note: one click, its box opens to type in', nt.type === 'note' && ta && ta.placeholder === Number(nt.a.price).toFixed(5), ta && ta.placeholder);
    ta.value = 'Retest'; ta.dispatchEvent(new Event('input', { bubbles: true })); ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await W(60);
    S.sel = S.drawings.indexOf(nt); S.noProps = false; R._dbar().render(); await W(30);
    ok('kept with its words; its toolbar: Templates, line, box, text, width, Visibility, lock, delete, More', nt.text === 'Retest' && acts() === 'tpl,line,fill,text,width,vis,lock,del,more', acts());
    S.sel = null;

    // 4. the keys
    S.cx = { x: X + 30, y: 240 }; var n0 = S.drawings.length; key('h', 'KeyH', { altKey: true }); await W(40);
    var h1 = last();
    ok('Alt+H: a horizontal line at the mouse', S.drawings.length === n0 + 1 && h1.type === 'hline' && Math.abs(R._P({ idx: 0, price: h1.price }).y - 240) < 2);
    S.cx = { x: X + 30, y: 240 }; key('v', 'KeyV', { altKey: true }); await W(40);
    ok('Alt+V: a vertical line at the mouse', last().type === 'vline' && Math.abs(R._P(last().a).x - (X + 30)) < 8);
    S.cx = null; key('j', 'KeyJ', { altKey: true }); await W(40);
    var lb = S.bars[Math.min(S.cursor || S.bars.length, S.bars.length) - 1];
    ok('Alt+J with the mouse off the chart: a horizontal ray at the last candle and price', last().type === 'hray' && Math.abs(last().a.price - lb.close) < 1e-6);
    key('t', 'KeyT', { altKey: true }); await W(30); var t1 = S.activeTool; key('r', 'KeyR', { altKey: true }); await W(30); var t2 = S.activeTool; key('f', 'KeyF', { altKey: true }); await W(30);
    ok('Alt+T / Alt+R / Alt+F: the trend line, the rectangle, the fib', t1 === 'trend' && t2 === 'rect' && S.activeTool === 'fib', [t1, t2, S.activeTool]);
    key('Escape', 'Escape'); await W(30);
    S.sel = S.drawings.indexOf(cn); var n1 = S.drawings.length; key('c', 'KeyC', { ctrlKey: true }); key('v', 'KeyV', { ctrlKey: true }); await W(40);
    ok('Ctrl+C / Ctrl+V: the channel pasted three candles on, selected', S.drawings.length === n1 + 1 && last().type === 'channel' && last().a.idx === cn.a.idx + 3 && last().off === cn.off && S.sel === n1, [S.drawings.length, n1]);
    key('z', 'KeyZ', { ctrlKey: true }); await W(30);
    ok('Ctrl+Z takes it back (new in Trade Replay); Ctrl+Y does it again', S.drawings.length === n1 && (key('y', 'KeyY', { ctrlKey: true }), S.drawings.length === n1 + 1));
    var nm = S.drawings.length;
    mev('mousedown', X - 60, 150, { shiftKey: true }); mev('mousemove', X, 220, { held: true, shiftKey: true }); mev('mouseup', X, 220, { shiftKey: true }); await W(40);
    ok('Shift + drag: a measure, not kept as a drawing', S.meas && !S.meas.live && S.meas.d.type === 'range' && S.drawings.length === nm);
    click(X + 300, 470); await W(30);
    ok('gone at the next click', !S.meas);

    // 5. the list of keys
    var kb = document.getElementById('strp-keysbtn'); kb.click(); await W(60);
    var m = document.getElementById('strp-menu');
    ok('the keyboard button by the padlock opens the list (Ctrl+Z / Ctrl+Y, Esc closes the replay)', m.classList.contains('show') && /Keyboard shortcuts/.test(m.textContent) && /Horizontal ray at the mouse/.test(m.textContent) && /close the replay/.test(m.textContent) && !/Execution mode/.test(m.textContent) && m.querySelectorAll('.stk-r').length >= 15, m.textContent.slice(0, 160));
    kb.click(); await W(20);
    S.sel = S.drawings.map(function (d) { return d.type; }).indexOf('vline'); S.noProps = false; DB.render(); await W(30); bar().querySelector('[data-db="more"]').click(); await W(30); pop().querySelector('[data-keys]').click(); await W(30);
    ok('and the toolbar\'s More > Keyboard shortcuts', DB.popK() === 'keys' && pop().querySelectorAll('.stk-r').length >= 15);
    DB.closePop(); S.sel = null;
    var tree = document.getElementById('strp-treebtn'); tree.click(); await W(60);
    var rows = Array.prototype.map.call(document.querySelectorAll('#strp-menu .stpr-otn span'), function (e) { return e.textContent; });
    ok('the object tree names them', ['Vertical line', 'Horizontal ray', 'Ray', 'Arrow', 'Parallel channel', 'Circle', 'Highlighter', 'Price note'].every(function (n) { return rows.indexOf(n) >= 0; }), rows);
    tree.click();
    try { localStorage.removeItem('st_replay_draw2_999999905'); localStorage.removeItem('st_replay_tgrp'); } catch (e) {}
    R.close();
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
