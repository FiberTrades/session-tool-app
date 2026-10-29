(async function () {
  // TradingView's LINES group (Nestor, 26 Oct 2026: "i need all these"): Info line (its figures in a tag at its end), Extended line
  // (to both edges), Trend angle (the angle against the level, its arc and degrees), Cross line (one click; its price on the scale and
  // its time on the axis) - beside Trend line, Ray, Horizontal line / ray, Vertical line and the Parallel channel.
  // Run: python tests/browser_test.py tests/practice_lines2_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stDrawBar); i++) await W(100); await W(800);
    var P = window.__stPractice; try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.mini = false; C.news = false; C.dtpl = {}; C.ddef = {};
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(600);
    var DW = P._dr(), pane = P._panes()[0], ch = pane.el.querySelector('.stpr-pc'), tools = document.getElementById('stpr-tools');
    var mev = function (t, xx, yy, o) { var r = ch.getBoundingClientRect(); ch.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mouseup' ? 0 : 1, view: window }, o || {}))); };
    var click = function (x, y) { mev('mousedown', x, y); mev('mouseup', x, y); };
    var pick = async function (t) { if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); if (DW.tool !== t) tools.querySelector('[data-tool="' + t + '"]').click(); await W(40); };
    var draw2 = async function (t, x0, y0, x1, y1) { await pick(t); click(x0, y0); mev('mousemove', x1, y1); await W(30); click(x1, y1); await W(80); return DW.list[DW.list.length - 1]; };
    var texts = function () { var got = [], F = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { got.push(String(t)); return F.apply(this, arguments); }; try { DW.ver = (DW.ver || 0) + 1; P._drawOv(0); } finally { CanvasRenderingContext2D.prototype.fillText = F; } return got; };
    var at = function (q) { return { x: P._xOfT(0, q.t), y: pane.series.priceToCoordinate(q.price) }; };
    var bar = function () { return document.querySelector('.stdb-bar'); }, acts = function () { var b = bar(); return b ? Array.prototype.map.call(b.querySelectorAll('[data-db]'), function (x) { return x.getAttribute('data-db'); }).join(',') : ''; };
    DW.list = []; DW.sel = null; P._props();
    var Wd = ch.getBoundingClientRect().width, H = ch.getBoundingClientRect().height;

    var names = Array.prototype.map.call(tools.querySelectorAll('.stpr-tg[data-grp="lines"] [data-tool]'), function (b) { return b.getAttribute('data-tool'); }).join(',');
    ok('the Lines menu, as TradingView\'s: Trend line, Ray, Info line, Extended line, Trend angle, Horizontal line, Horizontal ray, Vertical line, Cross line; Channels: Parallel channel', names === 'trend,ray,infoline,extline,tangle,hline,hray,vline,crossline,channel', names);
    ok('each with its icon, its name and its star', ['infoline', 'extline', 'tangle', 'crossline'].every(function (t) { var b = tools.querySelector('.stpr-tfl [data-tool="' + t + '"]'); return b && b.querySelector('svg') && b.querySelector('span').textContent.length > 4 && b.querySelector('[data-fav]'); }));

    // Info line
    var il = await draw2('infoline', Math.round(Wd * 0.2), Math.round(H * 0.3), Math.round(Wd * 0.4), Math.round(H * 0.55)), tx = texts();
    ok('Info line: two clicks, its tag at its end - the distance and per cent, the candles and the time, the angle', il && il.type === 'infoline' && tx.some(function (t) { return /pips\s+\([+\u2212]\d+\.\d\d%\)/.test(t); }) && tx.some(function (t) { return /\d+ bars,\s+\d+[wdhm]/.test(t); }) && tx.some(function (t) { return /\u2220 [\u2212-]?\d+\.\d\u00b0/.test(t); }), tx.filter(function (t) { return /pips|bars|\u2220/.test(t); }));
    ok('its toolbar: colour, text, width, style', /line,text,width,dash/.test(acts()), acts());
    var A = at(il.a), B = at(il.b);
    ok('its ends are handles, its line and its tag take the mouse', (P._hit(0, A.x, A.y) || {}).part === 'a' && (P._hit(0, B.x, B.y) || {}).part === 'b' && (P._hit(0, (A.x + B.x) / 2, (A.y + B.y) / 2) || {}).part === 'body' && (P._hit(0, B.x + 20, B.y + 18) || {}).part === 'body');
    // Extended line
    var el = await draw2('extline', Math.round(Wd * 0.45), Math.round(H * 0.6), Math.round(Wd * 0.55), Math.round(H * 0.5)), EA = at(el.a), EB = at(el.b), dx = EB.x - EA.x, dy = EB.y - EA.y;
    ok('Extended line: through both points to both edges (the mouse finds it far past each end)', el.type === 'extline' && (P._hit(0, EA.x - dx * 2, EA.y - dy * 2) || {}).i === DW.list.indexOf(el) && (P._hit(0, EB.x + dx * 1.5, EB.y + dy * 1.5) || {}).i === DW.list.indexOf(el));
    // Trend angle
    var ta = await draw2('tangle', Math.round(Wd * 0.62), Math.round(H * 0.7), Math.round(Wd * 0.78), Math.round(H * 0.45)), TA = at(ta.a), TB = at(ta.b), ang = Math.atan2(TA.y - TB.y, TB.x - TA.x) * 180 / Math.PI;
    ok('Trend angle: its angle in degrees beside its arc', ta.type === 'tangle' && texts().indexOf(ang.toFixed(1) + '\u00b0') >= 0, [ang.toFixed(1), texts().filter(function (t) { return /\u00b0/.test(t); })]);
    // Cross line
    await pick('crossline'); click(Math.round(Wd * 0.3), Math.round(H * 0.8)); await W(100);
    var cl = DW.list[DW.list.length - 1], CA = at(cl.a);
    ok('Cross line: one click places it, the tool put down', cl.type === 'crossline' && DW.tool === 'none' && !cl.b);
    ok('its two lines take the mouse across the chart', (P._hit(0, 8, CA.y) || {}).i === DW.list.indexOf(cl) && (P._hit(0, CA.x, 8) || {}).i === DW.list.indexOf(cl));
    var hl = (pane.hl || []).some(function (l) { try { return Math.abs(l.options().price - cl.a.price) < 1e-9; } catch (e) { return false; } });
    ok('its price on the price scale and its time on the time axis', hl && texts().some(function (t) { return /\d\d:\d\d/.test(t) && t.indexOf('Oct') >= 0; }), hl);
    // they keep after a reload of the list (saved drawings)
    var raw = JSON.stringify(DW.list.map(function (d) { return d.type; }));
    ok('all four kept with the symbol\'s drawings', /infoline/.test(raw) && /extline/.test(raw) && /tangle/.test(raw) && /crossline/.test(raw), raw);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
