(async function () {
  // Batch B's drawing tools, Back Testing (Nestor, 19 Oct 2026: "build all the tradingview suggestions! i love them!!"): a
  // vertical line (its time on the time axis), a ray, a horizontal ray (its price on the scale), an arrow, a parallel channel
  // (three clicks, a fill and a middle line), a highlighter (a wide see-through pen), a price note (a box of words with a
  // pointer to its price) and a circle / ellipse (two clicks or a drag). The tools row in TradingView's groups: lines, shapes
  // and brushes, text and notes, each showing the one used last, its arrow opening the rest. Each new tool works with the
  // toolbar (colour, width, style, fill, templates), Visibility, lock, clone, delete, the object tree, undo / redo; kept per
  // symbol and on every chart of it. Real EUR/USD candles of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_newtools_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stDrawBar); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.mm = Object.assign({}, C.mm, { col: true }); C.layout = 2; C.tfs = [5, 15, 60, 240]; C.mini = false; C.dtpl = {}; C.ddef = {}; C.dwHide = false; C.dwLock = false; C.news = false;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length > 1 && P._panes()[0].n && P._panes()[1].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(600);
    var pane = function (j) { return P._panes()[j || 0]; }, DW = P._dr(), DB = P._dbar(), ch = pane().el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var bar = function () { return document.querySelector('.stdb-bar'); }, pop = function () { return DB.pop(); };
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0 }, o || {}))); };
    var px = function (x, y, j) { P._dr().cx = null; P._drawOv(j || 0); var c = pane(j).ov, d = window.devicePixelRatio || 1; return Array.prototype.slice.call(c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data); };
    var nearBy = function (x, y, rgb, tol) { for (var dx = -2; dx <= 2; dx++) for (var dy = -2; dy <= 2; dy++) { var c = px(Math.round(x) + dx, Math.round(y) + dy); if (c[3] > 150 && near(c, rgb, tol)) return true; } return false; };
    var near = function (c, rgb, tol) { return Math.abs(c[0] - rgb[0]) <= (tol || 8) && Math.abs(c[1] - rgb[1]) <= (tol || 8) && Math.abs(c[2] - rgb[2]) <= (tol || 8); };
    var acts = function () { return Array.prototype.map.call(bar().querySelectorAll('[data-db]'), function (x) { return x.getAttribute('data-db'); }).join(','); };
    var pick = async function (tool) { if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); if (DW.tool !== tool) document.querySelector('#stpr-tools [data-tool="' + tool + '"]').click(); await W(30); };
    var click = function (x, y) { mev('mousedown', x, y); mev('mouseup', x, y); };
    var draw2 = async function (tool, x0, y0, x1, y1) { await pick(tool); click(x0, y0); mev('mousemove', x1, y1); await W(30); click(x1, y1); await W(80); return DW.list[DW.list.length - 1]; };
    var last = function () { return DW.list[DW.list.length - 1]; };
    DW.list = []; DW.hist = ['[]']; DW.hpos = 0; DW.sel = null; P._props();
    var Wd = r.width, PW = Wd - 60, X = Math.round(Wd * 0.35);

    // 1. the tools row in groups
    document.getElementById('stpr-drawbtn').click(); await W(40);
    var tools = document.getElementById('stpr-tools'), cells = Array.prototype.filter.call(tools.children, function (e) { return e.offsetWidth > 0; });
    var all = Array.prototype.map.call(tools.querySelectorAll('[data-tool]'), function (b) { return b.getAttribute('data-tool'); });
    ok('the tools row in TradingView\'s groups (26 Oct 2026): lines, fib and gann, forecasting and measuring, shapes, text and notes, emoji; every tool once', cells.length === 6 && tools.querySelectorAll('.stpr-tg').length === 5 && all.length >= 19 && all.length === all.filter(function (t, i) { return all.indexOf(t) === i; }).length && ['vline', 'ray', 'hray', 'arrow', 'path', 'channel', 'brush', 'note', 'circle', 'hline', 'trend', 'rect', 'fib', 'pen', 'range', 'text', 'emoji', 'long', 'short'].every(function (t) { return all.indexOf(t) >= 0; }), [cells.length, all.join(',')]);
    tools.querySelector('[data-tgrp="lines"]').click(); await W(40);
    var fl = tools.querySelector('.stpr-tg[data-grp="lines"] .stpr-tfl'), names = Array.prototype.map.call(fl.querySelectorAll('[data-tool]'), function (b) { return b.textContent; });
    ok('the lines group\'s arrow opens its tools in sections, with their keys: Lines - Trend line Alt+T, Ray, Horizontal line Alt+H, Horizontal ray Alt+J, Vertical line Alt+V; Channels - Parallel channel', fl.offsetWidth > 150 && names.filter(function (n) { return /^(Trend line|Ray|Horizontal line|Horizontal ray|Vertical line|Parallel channel)(Alt|$)/.test(n); }).join('|') === 'Trend lineAlt+T|Ray|Horizontal lineAlt+H|Horizontal rayAlt+J|Vertical lineAlt+V|Parallel channel' && Array.prototype.map.call(fl.querySelectorAll('.stpr-tfh'), function (h) { return h.textContent; }).join('|') === 'Lines|Channels' && tools.querySelector('[data-tgrp="lines"]').getAttribute('aria-expanded') === 'true', names);
    fl.querySelector('[data-tool="ray"]').click(); await W(40);
    var gm = tools.querySelector('[data-gtool="lines"]');
    ok('picking Ray: the tool is on, the list closes, the group\'s button shows the ray now (and is lit)', DW.tool === 'ray' && fl.offsetWidth === 0 && /^Ray/.test(gm.title) && gm.classList.contains('on') && gm.innerHTML === fl.querySelector('[data-tool="ray"] svg').outerHTML, [DW.tool, gm.title]);
    gm.click(); await W(30);
    ok('its button again: the tool put down; again: the ray (the one used last)', DW.tool === 'none' && (gm.click(), DW.tool === 'ray'), DW.tool);
    gm.click(); await W(20);
    tools.querySelector('[data-tgrp="notes"]').click(); await W(30);
    ok('a click elsewhere closes a group\'s list', tools.querySelector('.stpr-tg.open') && (document.getElementById('stpr-win').click(), !tools.querySelector('.stpr-tg.open')));

    // 2. vertical line: one click, full height, its time on the time axis
    await pick('vline'); click(X, 150); await W(80);
    var v = last(), dm = P._kx(0), vx = P._xOfT(0, v.a.t);
    ok('Vertical line: one click puts it at that candle\'s time, selected, the tool put down', v && v.type === 'vline' && v.a && v.a.t > 0 && DW.sel === DW.list.length - 1 && DW.tool === 'none' && Math.abs(vx - X) < 8, v);
    var vTop = px(Math.round(vx), 12), vBot = px(Math.round(vx), dm.ph - 6), vAx = px(Math.round(vx), dm.ph + 9);
    ok('it runs the full height, blue, and its time sits on the time axis in its colour', near(vTop, [96, 165, 250], 10) && near(vBot, [96, 165, 250], 10) && near(vAx, [96, 165, 250], 10), [vTop, vBot, vAx]);
    ok('its toolbar: Templates, line colour, width, style, Visibility, lock, delete, More', acts() === 'tpl,line,width,dash,vis,lock,del,more', acts());
    var v2 = px(Math.round(P._xOfT(1, v.a.t)), 40, 1);
    ok('it is on the other chart of EUR/USD too (15m), at the same time', near(v2, [96, 165, 250], 10), v2);

    // 3. horizontal ray: from its point to the right, its price on the scale
    DW.sel = null; P._props(); await pick('hray'); click(X, 120); await W(80);
    var hr = last(), hy = Math.round(P._yOf(0, hr.a.price)), hrl = (pane().hl || []).map(function (l) { return l.options(); }).filter(function (o) { return Math.abs(o.price - hr.a.price) < 1e-9; })[0];
    ok('Horizontal ray: one click, gold, from that point to the right only', hr.type === 'hray' && near(px(X + 60, hy), [244, 192, 90], 10) && px(X - 40, hy)[3] < 40, [px(X + 60, hy), px(X - 40, hy)]);
    ok('its price on the price scale, with no line of the chart\'s own across the whole chart', hrl && hrl.lineVisible === false && hrl.axisLabelVisible === true, hrl);

    // 4. ray: on past its second point
    DW.sel = null; P._props();
    var ry = await draw2('ray', X, 260, X + 60, 230), ra = { x: P._xOfT(0, ry.a.t), y: P._yOf(0, ry.a.price) }, rb = { x: P._xOfT(0, ry.b.t), y: P._yOf(0, ry.b.price) }, k2 = (rb.y - ra.y) / (rb.x - ra.x);
    var beyond = px(Math.round(rb.x + 80), Math.round(rb.y + 80 * k2)), before = px(Math.round(ra.x - 40), Math.round(ra.y - 40 * k2));
    ok('Ray: two clicks; it runs on past its second point, not back past its first', ry.type === 'ray' && near(beyond, [96, 165, 250], 14) && before[3] < 40, [beyond, before]);

    // 5. arrow: a head at its second point
    DW.sel = null; P._props();
    var ar = await draw2('arrow', X - 120, 330, X - 40, 290); DW.sel = null; P._props(); var ab = { x: P._xOfT(0, ar.b.t), y: P._yOf(0, ar.b.price) }, aa = { x: P._xOfT(0, ar.a.t), y: P._yOf(0, ar.a.price) }, ang = Math.atan2(ab.y - aa.y, ab.x - aa.x);
    var head = px(Math.round(ab.x - Math.cos(ang) * 5), Math.round(ab.y - Math.sin(ang) * 5)), side = px(Math.round(ab.x - Math.cos(ang) * 8 + Math.sin(ang) * 3.5), Math.round(ab.y - Math.sin(ang) * 8 - Math.cos(ang) * 3.5));
    ok('Arrow: two clicks; a filled head at its second point', ar.type === 'arrow' && near(head, [96, 165, 250], 14) && near(side, [96, 165, 250], 30), [head, side]);
    var mid = P._hit(0, (aa.x + ab.x) / 2, (aa.y + ab.y) / 2);
    ok('pressing on it picks it up whole', mid && DW.list[mid.i] === ar && mid.part === 'body', mid);

    // 6. parallel channel: three clicks
    DW.sel = null; P._props(); await pick('channel');
    click(X, 420); mev('mousemove', X + 120, 400); await W(30); click(X + 120, 400); await W(30);
    ok('Parallel channel: the second click sets its base line and the tool waits for a third', DW.pending && DW.pending.type === 'channel' && DW.pending.st === 2 && DW.tool === 'channel');
    mev('mousemove', X + 60, 360); await W(30); click(X + 60, 360); await W(80);
    var cn = last(), cy0 = P._yOf(0, cn.a.price), cy1 = P._yOf(0, cn.a.price + cn.off), cx0 = P._xOfT(0, cn.a.t);
    ok('the third sets the other line through that point: kept, selected, the tool put down', cn.type === 'channel' && !('st' in cn) && cn.off > 0 && Math.abs((cy0 - cy1) - 50) < 6 && DW.sel === DW.list.length - 1 && DW.tool === 'none', [cn.off, cy0 - cy1]);
    var inC = px(Math.round(cx0 + 20), Math.round((cy0 + cy1) / 2 - 3));
    ok('filled between its lines (its colour at 10%)', inC[3] > 15 && inC[3] < 50, inC);
    ok('its toolbar: Templates, line, fill, width, style, Visibility, alert (batch D), lock, delete, More (extend left / right, middle line)', acts() === 'tpl,line,fill,width,dash,vis,alert,lock,del,more' && (bar().querySelector('[data-db="more"]').click(), pop().querySelector('[data-tgl="extL"]') && pop().querySelector('[data-tgl="extR"]') && pop().querySelector('[data-tgl="mid"]')), acts());
    var tgm = pop().querySelector('[data-tgl="mid"]'); tgm.checked = true; tgm.dispatchEvent(new Event('change', { bubbles: true })); await W(30); DB.closePop();
    var cmx = P._xOfT(0, cn.a.t) + 30, cmy = (P._yOf(0, cn.a.price + (cn.b.price - cn.a.price) * 30 / (P._xOfT(0, cn.b.t) - P._xOfT(0, cn.a.t))) + P._yOf(0, cn.a.price + cn.off + (cn.b.price - cn.a.price) * 30 / (P._xOfT(0, cn.b.t) - P._xOfT(0, cn.a.t)))) / 2, midInk = 0;
    for (var yy = Math.round(cmy) - 2; yy <= Math.round(cmy) + 2; yy++) for (var xx = Math.round(cmx) - 4; xx <= Math.round(cmx) + 4; xx++) { var cc = px(xx, yy); if (cc[3] > 120) midInk++; }
    ok('Middle line: a dotted line half way between them', cn.mid === true && midInk > 1, midInk);
    var poH = { x: P._xOfT(0, cn.b.t), y: P._yOf(0, cn.b.price + cn.off) }, off0 = cn.off;
    ok('its other line\'s ends are handles for how far it is', (P._hit(0, poH.x, poH.y) || {}).part === 'po');
    mev('mousedown', poH.x, poH.y); mev('mousemove', poH.x, poH.y - 20, { held: true }); mev('mousemove', poH.x, poH.y - 30, { held: true }); mev('mouseup', poH.x, poH.y - 30); await W(60);
    ok('dragged up 30 px: wider by that much, the base line where it was', cn.off > off0 && Math.abs((P._yOf(0, cn.a.price) - P._yOf(0, cn.a.price + cn.off)) - 80) < 5 && Math.abs(P._yOf(0, cn.a.price) - cy0) < 1, [off0, cn.off]);

    // 7. highlighter: wide, see-through, stays armed
    DW.sel = null; P._props(); await pick('brush');
    mev('mousedown', X - 160, 200); for (var s = 1; s <= 12; s++) mev('mousemove', X - 160 + s * 8, 200 + Math.round(Math.sin(s / 2) * 6), { held: true }); mev('mouseup', X - 64, 200); await W(80);
    var br = last(), bp = br.pts[3], bxy = { x: P._xOfT(0, bp.t), y: P._yOf(0, bp.price) }, bc = px(Math.round(bxy.x), Math.round(bxy.y)), bc2 = px(Math.round(bxy.x), Math.round(bxy.y) + 5);
    ok('Highlighter: a stroke while held, 12 px wide, yellow at 45%, and the tool stays armed for the next', br.type === 'brush' && br.pts.length > 4 && DW.tool === 'brush' && near(bc, [255, 235, 59], 12) && bc[3] > 95 && bc[3] < 135 && bc2[3] > 60, [bc, bc2, br.pts.length]);
    await pick('brush'); DW.sel = DW.list.indexOf(br); P._props(); await W(20);
    ok('its toolbar: Templates, colour, width (8 to 20 px), Visibility, lock, delete, More; no line style', acts() === 'tpl,line,width,vis,lock,del,more' && (bar().querySelector('[data-db="width"]').click(), pop().querySelectorAll('[data-pw]').length === 4 && pop().querySelector('[data-pw="20"]') && pop().querySelector('[data-pw="12"].on')), acts());
    DB.closePop();

    // 8. price note: one click, its words typed on its box
    DW.sel = null; P._props(); await pick('note'); click(X + 200, 330); await W(80);
    var nt = last(), ta = pane().el.querySelector('.stpr-txed');
    ok('Price note: one click; its box opens to type in, the price as its placeholder', nt.type === 'note' && ta && document.activeElement === ta && ta.placeholder === Number(nt.a.price).toFixed(5), [nt, ta && ta.placeholder]);
    ta.value = 'Breakout'; ta.dispatchEvent(new Event('input', { bubbles: true })); ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await W(60);
    DW.sel = null; P._props(); var nb = window.__stDrawBar.kit.note(nt, P._kx(0)), na = { x: P._xOfT(0, nt.a.t), y: P._yOf(0, nt.a.price) };
    ok('Enter keeps it: a box of its words up and to the right, a pointer to its price', nt.text === 'Breakout' && !pane().el.querySelector('.stpr-txed') && nb.x0 > na.x && nb.y1 < na.y && Math.abs(nb.ax - na.x) < 1, [nb.x0, nb.y1, na]);
    var ink = 0; for (xx = Math.round(nb.x0 + 8); xx < nb.x1 - 8; xx += 2) for (yy = Math.round(nb.y0 + 4); yy < nb.y1 - 4; yy += 2) { var tc = px(xx, yy); if (tc[0] > 200 && tc[1] > 200 && tc[2] > 200) ink++; }
    var box = px(Math.round(nb.x0 + 3), Math.round(nb.y0 + 3)), dot = px(Math.round(na.x), Math.round(na.y));
    ok('drawn: a dark box, white words, a blue border, a dot on its price', ink > 10 && box[0] < 40 && box[3] > 200 && near(dot, [96, 165, 250], 14), [ink, box, dot]);
    DW.sel = DW.list.indexOf(nt); P._props(); await W(20);
    ok('its toolbar: Templates, line, box, text, width, Visibility, lock, delete, More', acts() === 'tpl,line,fill,text,width,vis,lock,del,more' && (bar().querySelector('[data-db="text"]').click(), pop().querySelectorAll('[data-ts]').length >= 5 && pop().querySelector('[data-tw]') && pop().querySelector('[data-tw]').value === 'Breakout'), acts());
    DB.closePop();
    var bx0 = { x: (nb.x0 + nb.x1) / 2, y: (nb.y0 + nb.y1) / 2 }, oo = Object.assign({}, nt.off), aa0 = Object.assign({}, nt.a);
    mev('mousedown', bx0.x, bx0.y); mev('mousemove', bx0.x + 20, bx0.y - 10, { held: true }); mev('mousemove', bx0.x + 40, bx0.y - 20, { held: true }); mev('mouseup', bx0.x + 40, bx0.y - 20); await W(60);
    ok('its box dragged: the box moves, its price stays', nt.off.x === oo.x + 40 && nt.off.y === oo.y - 20 && nt.a.t === aa0.t && nt.a.price === aa0.price, [oo, nt.off]);
    DW.sel = null; P._props(); await pick('note'); click(X + 200, 420); await W(60);
    var ne = last(), ta2 = pane().el.querySelector('.stpr-txed'); ta2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await W(60);
    var nb2 = window.__stDrawBar.kit.note(ne, P._kx(0));
    ok('a note left with no words stays, showing its price', DW.list.indexOf(ne) >= 0 && !ne.text && nb2.lines.join('') === Number(ne.a.price).toFixed(5), nb2.lines);
    var dbl = { x: (nb2.x0 + nb2.x1) / 2, y: (nb2.y0 + nb2.y1) / 2 }; (document.elementFromPoint(r.left + dbl.x, r.top + dbl.y) || ch).dispatchEvent(new MouseEvent('dblclick', { clientX: r.left + dbl.x, clientY: r.top + dbl.y, bubbles: true, cancelable: true })); await W(60);
    ok('a double-click on its box types in it again', !!pane().el.querySelector('.stpr-txed') && DW.ted && DW.ted.d === ne);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); pane().el.querySelector('.stpr-txed') && pane().el.querySelector('.stpr-txed').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(40);

    // 9. circle: a drag (or two clicks)
    DW.sel = null; P._props(); await pick('circle');
    var cX = X - 60, cY = 470; mev('mousedown', cX, cY); mev('mousemove', cX + 25, cY + 15, { held: true }); mev('mousemove', cX + 50, cY + 30, { held: true }); mev('mouseup', cX + 50, cY + 30); await W(80);
    var ci = last(), ciSel = DW.sel === DW.list.length - 1; DW.sel = null; P._props(); var el = { x: P._xOfT(0, ci.a.t), y: P._yOf(0, ci.a.price) }, erx = Math.abs(P._xOfT(0, ci.b.t) - el.x), ery = Math.abs(P._yOf(0, ci.b.price) - el.y);
    ok('Circle: a press and a drag draw it at once - its centre where pressed, the box it fills to where let go', ci.type === 'circle' && DW.tool === 'none' && ciSel && Math.abs(erx - 50) < 8 && Math.abs(ery - 30) < 3, [erx, ery]);
    var cin = px(Math.round(el.x), Math.round(el.y)), cedge = nearBy(el.x + erx, el.y, [192, 132, 252], 24);
    ok('violet, filled at 10% inside', cedge && cin[3] > 15 && cin[3] < 50, [cin, cedge]);
    ok('its handles: its sides (left / right change its width, top / bottom its height)', (P._hit(0, el.x + erx, el.y) || {}).part === 'rx' && (P._hit(0, el.x, el.y - ery) || {}).part === 'ry');
    mev('mousedown', el.x, el.y - ery); mev('mousemove', el.x, el.y - ery - 10, { held: true }); mev('mousemove', el.x, el.y - ery - 20, { held: true }); mev('mouseup', el.x, el.y - ery - 20); await W(60);
    ok('its top dragged up 20 px: 20 px taller each way, as wide as before', Math.abs(Math.abs(P._yOf(0, ci.b.price) - el.y) - (ery + 20)) < 2 && Math.abs(Math.abs(P._xOfT(0, ci.b.t) - el.x) - erx) < 1);
    DW.sel = DW.list.indexOf(ci); P._props(); await W(20);
    ok('its toolbar: Templates, line, fill, width, style, Visibility, lock, delete, More', acts() === 'tpl,line,fill,width,dash,vis,lock,del,more', acts());
    var PH = r.height - pane().chart.timeScale().height();   // on the chart, not its scales: a press there scales the chart (20 Oct 2026)
    var dr2 = await draw2('circle', X + 250, PH - 70, X + 280, PH - 50);   // on the chart, left of the price scale (588 px wide here)
    ok('two clicks draw one too', dr2 && dr2.type === 'circle' && dr2 !== ci, [dr2 && dr2.type, dr2 === ci, DW.list.length, Math.round(PH), Math.round(r.height), X, Math.round(r.width), DW.tool, !!DW.pending, P._s() && P._panes()[0].chart.priceScale('right').width()]);
    DW.list.pop(); DW.sel = null; P._props();

    // 10. lock, clone, delete, undo / redo on a new one
    var n0 = DW.list.length; DW.sel = DW.list.indexOf(ci); P._props(); await W(20);
    bar().querySelector('[data-db="lock"]').click(); await W(30);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); await W(30);
    ok('locked, Delete leaves it', ci.lock === true && DW.list.length === n0);
    bar().querySelector('[data-db="lock"]').click(); await W(20); bar().querySelector('[data-db="more"]').click(); await W(20); pop().querySelector('[data-clone]').click(); await W(40);
    var cl = last();
    ok('More > Clone: a copy three candles on, selected', DW.list.length === n0 + 1 && cl.type === 'circle' && cl !== ci && cl.a.t > ci.a.t && cl.a.price === ci.a.price && DW.sel === n0);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); await W(30);
    ok('Delete takes the copy away; Ctrl+Z brings it back, Ctrl+Y takes it again', DW.list.length === n0 && (document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, bubbles: true })), DW.list.length === n0 + 1 && DW.list[n0].type === 'circle') && (document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', code: 'KeyY', ctrlKey: true, bubbles: true })), DW.list.length === n0));

    // 11. templates: a channel's look kept as the default for new ones (undo / redo gave the list back as copies: found again)
    var byT = function (t) { return DW.list.filter(function (d) { return d.type === t; })[0]; }; cn = byT('channel'); v = byT('vline'); hr = byT('hray');
    DW.sel = DW.list.indexOf(cn); P._props(); await W(20);
    bar().querySelector('[data-db="fill"]').click(); await W(20); pop().querySelector('[data-pc="#f4c05a"]').click(); await W(20); DB.closePop();
    bar().querySelector('[data-db="tpl"]').click(); await W(20);
    ok('Templates on a channel: Reset to default, Save template as...', /Save template as/.test(pop().textContent) && /Reset to default/.test(pop().textContent), pop().textContent);
    DB.closePop();   // (its look is remembered for new channels as it is changed, 22 Oct 2026)
    DW.sel = null; P._props(); await pick('channel'); click(X + 200, 200); mev('mousemove', X + 280, 190); click(X + 280, 190); mev('mousemove', X + 250, 160); click(X + 250, 160);   // on the chart, left of its price scale await W(80);
    var cn2 = last();
    ok('a new channel takes that default: the fill, the middle line', cn2.type === 'channel' && /244,192,90/.test(cn2.fill) && cn2.mid === true && C.ddef.channel && C.ddef.channel.mid === true, cn2);

    // 12. the object tree names them, with their icons
    document.getElementById('stpr-treebtn').click(); await W(60);
    var m = document.getElementById('stpr-menu'), rows = Array.prototype.map.call(m.querySelectorAll('.stpr-otn span'), function (e) { return e.textContent; });
    ok('the object tree lists them by name, each with its tool\'s icon', ['Vertical line', 'Horizontal ray', 'Ray', 'Arrow', 'Parallel channel', 'Highlighter', 'Price note', 'Circle'].every(function (n) { return rows.indexOf(n) >= 0; }) && m.querySelectorAll('.stpr-otn svg').length === rows.length, rows);
    var noteRow = Array.prototype.filter.call(m.querySelectorAll('.stpr-otn'), function (b) { return /Price note/.test(b.textContent) && /Breakout/.test(b.textContent); })[0];
    ok('a note\'s row shows its words', !!noteRow);
    document.getElementById('stpr-treebtn').click(); await W(30);

    // 13. Visibility, hide all, kept per symbol
    var vis = P._visOK; DW.sel = DW.list.indexOf(v); P._props(); await W(20);
    v.vis = { m: { on: true, a: 1, b: 59 }, h: { on: false }, d: { on: false }, w: { on: false }, mo: { on: false }, s: { on: false } }; P._props(); await W(20);
    ok('Visibility on a vertical line: only on minute charts - on the 5m and the 15m, still there', P._hit(0, P._xOfT(0, v.a.t), 50) && P._hit(1, P._xOfT(1, v.a.t), 50), v.vis);
    P._hideAll(true); await W(30);
    ok('Hide all: none of them is hit, the horizontal ray\'s price leaves the scale', !P._hit(0, P._xOfT(0, v.a.t), 50) && !(pane().hl || []).some(function (l) { return Math.abs(l.options().price - hr.a.price) < 1e-9; }));
    P._hideAll(false); await W(30);
    var saved = JSON.parse(localStorage.getItem('st_practice_draw2:EURUSD') || '[]').map(function (d) { return d.type; });
    ok('kept with the symbol\'s drawings (this browser, and synced)', ['vline', 'hray', 'ray', 'arrow', 'channel', 'brush', 'note', 'circle'].every(function (t) { return saved.indexOf(t) >= 0; }), saved);

    // 14. Spanish
    if (typeof setLanguage === 'function') { setLanguage('es'); await W(200); P._render();
      tools.querySelector('[data-tgrp="shapes"]').click(); await W(30);
      var es = Array.prototype.map.call(tools.querySelectorAll('.stpr-tg[data-grp="shapes"] [data-tool] span'), function (e) { return e.textContent; });
      ok('in Spanish: Dibujar, Resaltador, Flecha, Rectángulo, Trayectoria, Círculo, and the arrow says Formas', es.filter(function (n) { return /^(Dibujar|Resaltador|Flecha|Rectángulo|Trayectoria|Círculo)$/.test(n); }).join(',') === 'Dibujar,Resaltador,Flecha,Rectángulo,Trayectoria,Círculo' && tools.querySelector('[data-tgrp="shapes"]').title === 'Formas', [es, tools.querySelector('[data-tgrp="shapes"]').title]);
      P._flyShut(); setLanguage('en'); await W(200); }
    P._flyShut();
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
