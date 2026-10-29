(async function () {
  // The drawing toolbar, Back Testing (Nestor, 19 Oct 2026: "build all the tradingview suggestions! i love them!!"): TradingView's
  // floating bar over the selected drawing in place of the vertical options box; Templates per tool (his own, none built in;
  // Save template as..., Reset to default, every change remembered as the tool's look for new drawings of it, synced with
  // the chart settings); colours from the chart settings' 30 with an opacity and a custom one; a rectangle's own fill, its
  // words inside it, extend left / right and a middle line; solid / dashed / dotted lines; Hide all / Lock all drawings beside
  // undo / redo / the bin. Drawings made before look exactly as they did. Real EUR/USD candles of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_drawbar_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stDrawBar); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.mm = Object.assign({}, C.mm, { col: true }); C.layout = 1; C.tfs = [5, 60, 15, 240]; C.mini = false; C.dtpl = {}; C.ddef = {}; C.dwHide = false; C.dwLock = false;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(500);
    var pane = function () { return P._panes()[0]; }, DW = P._dr(), DB = P._dbar(), ch = pane().el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var bar = function () { return document.querySelector('.stdb-bar'); }, pop = function () { return DB.pop(); }, shown = function (e) { return !!e && e.style.display !== 'none' && e.offsetWidth > 0; };
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0 }, o || {}))); };
    var px = function (x, y) { P._drawOv(0); var c = pane().ov, d = window.devicePixelRatio || 1; return Array.prototype.slice.call(c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data); };
    var rectOn = function (d) { var x0 = P._xOfT(0, d.a.t), x1 = P._xOfT(0, d.b.t), y0 = P._yOf(0, d.a.price), y1 = P._yOf(0, d.b.price); return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1) }; };
    var draw2 = async function (tool, x0, y0, x1, y1) { if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); if (DW.tool !== tool) document.querySelector('#stpr-tools [data-tool="' + tool + '"]').click(); await W(30);
      mev('mousedown', x0, y0); mev('mouseup', x0, y0); mev('mousemove', x1, y1); await W(30); mev('mousedown', x1, y1); mev('mouseup', x1, y1); await W(80); return DW.list[DW.list.length - 1]; };
    DW.list = []; DW.hist = ['[]']; DW.hpos = 0; DW.sel = null; P._props();

    // 1. a rectangle: the bar floats just above it
    var W0 = r.width, X0 = Math.round(W0 * 0.30), X1 = Math.round(W0 * 0.55), Y0 = 200, Y1 = 290;
    var d0 = await draw2('rect', X0, Y0, X1, Y1), b = bar(), br = b && b.getBoundingClientRect();
    ok('a rectangle placed: no options box any more, the toolbar floats just above it', d0 && d0.type === 'rect' && DW.sel === 0 && !document.querySelector('.stpr-props') && shown(b) && br.bottom <= r.top + Y0 && br.bottom >= r.top + Y0 - 30 && Math.abs(br.left - (r.left + X0 - 6)) < 4, br && [br.left, br.top, br.bottom, r.left + X0, r.top + Y0]);
    var acts = Array.prototype.map.call(b.querySelectorAll('[data-db]'), function (x) { return x.getAttribute('data-db'); });
    ok('in order: grip, Templates, line colour, fill, text, line width, line style, Visibility, alert (a zone has one, batch D), lock, delete, More', b.firstElementChild.classList.contains('stdb-gr') && acts.join(',') === 'tpl,line,fill,text,width,dash,vis,alert,lock,del,more', acts);
    var r0 = rectOn(d0), legacy = px((r0.x0 + r0.x1) / 2 + 3, (r0.y0 + r0.y1) / 2 + 9);
    ok('a rectangle with no look of its own is drawn as before: its colour at 10% inside', Math.abs(legacy[0] - 96) <= 6 && Math.abs(legacy[1] - 165) <= 6 && Math.abs(legacy[2] - 250) <= 6 && Math.abs(legacy[3] - 26) <= 1, legacy);

    // 2. line colour: the chart settings' 80 colours, an opacity, a custom one
    b.querySelector('[data-db="line"]').click(); await W(30);
    ok('Line colour opens a popover: 80 colours, the current one ringed, Opacity, + Custom colour', DB.popK() === 'line' && pop().querySelectorAll('[data-pc]').length === 80 && pop().querySelector('[data-pc="#60a5fa"].on') && pop().querySelector('[data-pop]') && /Custom colour/.test(pop().textContent));
    pop().querySelector('[data-pc="#f472b6"]').click(); await W(30);
    ok('a colour goes on the line, the popover stays open for its opacity', d0.color === '#f472b6' && DB.popK() === 'line' && pop().querySelector('[data-pc="#f472b6"].on'));
    var op = pop().querySelector('[data-pop]'); op.value = '50'; op.dispatchEvent(new Event('input', { bubbles: true })); op.dispatchEvent(new Event('change', { bubbles: true })); await W(30);
    ok('Opacity 50%: the line colour keeps its colour at half', d0.color === 'rgba(244,114,182,0.5)', d0.color);
    var cu = pop().querySelector('[data-pcus]'); cu.value = '#00ff00'; cu.dispatchEvent(new Event('input', { bubbles: true })); cu.dispatchEvent(new Event('change', { bubbles: true })); await W(30);
    ok('+ Custom colour: any colour, at the same opacity', d0.color === 'rgba(0,255,0,0.5)', d0.color);
    pop().querySelector('[data-pc="#60a5fa"]').click(); op = pop().querySelector('[data-pop]'); op.value = '100'; op.dispatchEvent(new Event('input', { bubbles: true })); op.dispatchEvent(new Event('change', { bubbles: true })); await W(20);
    // 3. the fill on its own
    bar().querySelector('[data-db="fill"]').click(); await W(30);
    ok('Fill: its own popover (the line popover closes)', DB.popK() === 'fill' && /Fill/i.test(pop().textContent) && pop().querySelector('[data-pop]').value === '10');
    pop().querySelector('[data-pc="#f4c05a"]').click(); await W(30);
    var op2 = pop().querySelector('[data-pop]'); op2.value = '30'; op2.dispatchEvent(new Event('input', { bubbles: true })); op2.dispatchEvent(new Event('change', { bubbles: true })); await W(30);
    var fin = px((r0.x0 + r0.x1) / 2 + 3, (r0.y0 + r0.y1) / 2 + 9);
    ok('a yellow fill at 30%, the border still blue', d0.fill === 'rgba(244,192,90,0.3)' && /^#60a5fa$/i.test(d0.color) && Math.abs(fin[0] - 244) <= 3 && Math.abs(fin[1] - 192) <= 3 && Math.abs(fin[3] - 77) <= 2, [d0.fill, d0.color, fin]);
    DB.closePop();
    // 4. width and style
    bar().querySelector('[data-db="width"]').click(); await W(20); pop().querySelector('[data-pw="3"]').click(); await W(20);
    bar().querySelector('[data-db="dash"]').click(); await W(20);
    ok('Line style: solid, dashed, dotted', pop().querySelectorAll('[data-pd]').length === 3);
    pop().querySelector('[data-pd="dashed"]').click(); await W(30);
    ok('3 px, dashed: on the rectangle, and the bar shows 3px', d0.width === 3 && d0.dash === 'dashed' && /3px/.test(bar().querySelector('[data-db="width"]').textContent));
    DB.closePop();
    // 5. its words inside it
    bar().querySelector('[data-db="text"]').click(); await W(30);
    ok('Text: a colour, sizes, where the words go (above as before, or inside: top, middle, bottom), left / centre / right, the words', pop().querySelectorAll('[data-pc]').length === 80 && pop().querySelectorAll('[data-ts]').length >= 5 && pop().querySelectorAll('[data-tv]').length === 5 && pop().querySelectorAll('[data-ta]').length === 3 && pop().querySelector('[data-tw]') && pop().querySelector('[data-tv="above"].on'));
    var tw = pop().querySelector('[data-tw]'); tw.value = 'RANGE'; tw.dispatchEvent(new Event('input', { bubbles: true })); tw.dispatchEvent(new Event('change', { bubbles: true }));
    pop().querySelector('[data-tv="middle"]').click(); await W(20); pop().querySelector('[data-ts="20"]').click(); await W(20); pop().querySelector('[data-pc="#ffffff"]').click(); await W(30);
    var ink = 0; for (var xx = Math.round((r0.x0 + r0.x1) / 2 - 30); xx < (r0.x0 + r0.x1) / 2 + 30; xx += 2) for (var yy = Math.round((r0.y0 + r0.y1) / 2 - 7); yy < (r0.y0 + r0.y1) / 2 + 7; yy += 2) { var c = px(xx, yy); if (c[0] > 230 && c[1] > 230 && c[2] > 230 && c[3] > 200) ink++; }
    ok('the words in the middle of the box, 20 px, white', d0.text === 'RANGE' && d0.tv === 'middle' && d0.tsz === 20 && d0.tcol === '#ffffff' && ink > 8, [d0.text, d0.tv, d0.tsz, d0.tcol, ink]);
    DB.closePop();
    // 6. More: extend, a middle line, Visibility, Clone
    bar().querySelector('[data-db="more"]').click(); await W(30);
    ok('More: RECT, Extend left, Extend right, Middle line, Visibility: All timeframes, Clone', /RECT/.test(pop().textContent) && pop().querySelector('[data-tgl="extL"]') && pop().querySelector('[data-tgl="extR"]') && pop().querySelector('[data-tgl="mid"]') && /Visibility: All timeframes/.test(pop().textContent) && pop().querySelector('[data-clone]'), pop().textContent);
    var tg = pop().querySelector('[data-tgl="extR"]'); tg.checked = true; tg.dispatchEvent(new Event('change', { bubbles: true })); await W(30);
    tg = pop().querySelector('[data-tgl="mid"]'); tg.checked = true; tg.dispatchEvent(new Event('change', { bubbles: true })); await W(30);
    var dm = P._panes()[0], pwd = r.width - 60, far = px(Math.min(pwd - 10, r0.x1 + 120), r0.y0 + 12), midP = 0;
    for (xx = Math.round(r0.x0 + 4); xx < r0.x0 + 40; xx++) { var mc = px(xx, Math.round((r0.y0 + r0.y1) / 2) + 0); if (mc[2] > 200 && mc[3] > 150) midP++; }
    ok('Extend right: the box runs on to the price scale; Middle line: dotted, the line colour (its style in More)', d0.extR === true && d0.mid === true && Math.abs(far[0] - 244) <= 3 && far[3] > 60 && midP > 3 && midP < 34 && pop().querySelectorAll('[data-md]').length === 3, [far, midP]);
    DB.closePop();

    // 7. Templates: his own, none built in
    bar().querySelector('[data-db="tpl"]').click(); await W(30);
    ok('Templates: Reset to default, Save template as...; none yet', /Save template as/.test(pop().textContent) && /Reset to default/.test(pop().textContent) && /Your rectangle templates/i.test(pop().textContent) && !pop().querySelector('[data-tpa]') && /None yet/.test(pop().textContent), pop().textContent);
    pop().querySelector('[data-tp="save"]').click(); await W(60);
    var dlg = document.querySelector('.stdb-dlg'), nmI = dlg && dlg.querySelector('[data-tpn]'), sv = dlg && dlg.querySelector('[data-tps]');
    ok('Save template as...: its window - a name, "Use it for new rectangles", Cancel / Save (Save waits for a name)', dlg && /Save template/.test(dlg.textContent) && nmI && document.activeElement === nmI && /Use it for new rectangles/.test(dlg.textContent) && sv.disabled && /Cancel/i.test(dlg.textContent), dlg && dlg.textContent);
    nmI.value = 'Yellow zone'; nmI.dispatchEvent(new Event('input', { bubbles: true })); dlg.querySelector('[data-tpd]').checked = true; sv.click(); await W(40);
    var T0 = (C.dtpl.rect || [])[0];
    ok('saved: the whole look under that name, never where it is; the default for new rectangles; it says so', !document.querySelector('.stdb-dlg') && T0 && T0.n === 'Yellow zone' && T0.l.fill === 'rgba(244,192,90,0.3)' && T0.l.dash === 'dashed' && T0.l.width === 3 && T0.l.mid === true && T0.l.extR === true && T0.l.tsz === 20 && !('a' in T0.l) && !('b' in T0.l) && !('text' in T0.l)
      && C.ddef.rect && C.ddef.rect.fill === T0.l.fill && /Template saved: Yellow zone/.test(document.getElementById('stpr-flash').textContent), T0);
    var cfgLS = JSON.parse(localStorage.getItem('st_practice_cfg') || '{}');
    ok('kept with the chart settings (they sync between devices), Back Testing and Live Charts alike', cfgLS.dtpl && cfgLS.dtpl.rect && cfgLS.dtpl.rect[0].n === 'Yellow zone' && cfgLS.ddef && cfgLS.ddef.rect);
    DB.closePop(); DW.sel = null; P._props();
    var d1 = await draw2('rect', X0, 330, X1, 380);
    ok('a new rectangle takes the default look', d1.fill === 'rgba(244,192,90,0.3)' && d1.dash === 'dashed' && d1.width === 3 && d1.mid === true && d1.extR === true && !d1.text, d1);
    bar().querySelector('[data-db="tpl"]').click(); await W(30);
    ok('its Templates list: Yellow zone ✓ default, a swatch, ×', pop().querySelector('[data-tpa="0"]') && /Yellow zone/.test(pop().textContent) && /✓ default/.test(pop().textContent) && pop().querySelector('[data-tpa="0"] .stdb-sw') && pop().querySelector('[data-tpx="0"]'), pop().textContent);
    DB.closePop();
    // a change on it is remembered for new rectangles (Nestor, 22 Oct 2026: "any changes to an object the app should remember those alterations for future")
    window.__stDrawBar.applyLook(d1, {}); P._props(); await W(20);
    bar().querySelector('[data-db="line"]').click(); await W(20); pop().querySelector('[data-pc="#E56767"]').click(); DB.closePop(); await W(20);
    ok('a change on a rectangle is remembered for new rectangles, with the chart settings (synced)', C.ddef.rect && C.ddef.rect.color === '#E56767' && !C.ddef.rect.fill && JSON.parse(localStorage.getItem('st_practice_cfg') || '{}').ddef.rect.color === '#E56767', C.ddef.rect);
    var d2 = await draw2('rect', X0, 400, X1, 440);
    ok('...a new one takes it', d2.color === '#E56767' && !d2.fill, d2);
    DW.list.splice(DW.list.indexOf(d2), 1); DW.sel = DW.list.indexOf(d1); P._props(); await W(20);
    bar().querySelector('[data-db="tpl"]').click(); await W(20); pop().querySelector('[data-tp="save"]').click(); await W(40);
    dlg = document.querySelector('.stdb-dlg'); nmI = dlg.querySelector('[data-tpn]'); nmI.value = 'Red'; nmI.dispatchEvent(new Event('input', { bubbles: true }));
    nmI.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await W(40);
    ok('Enter saves too', C.dtpl.rect.length === 2 && C.dtpl.rect[1].n === 'Red' && C.dtpl.rect[1].l.color === '#E56767');
    window.__stDrawBar.applyLook(d1, {}); P._props(); bar().querySelector('[data-db="tpl"]').click(); await W(20);
    ok('Templates: Reset to default first, then Save template as...; no default to set by hand', pop().querySelector('.stdb-it').getAttribute('data-tp') === 'reset' && /Reset to default/.test(pop().textContent) && !pop().querySelector('[data-tp="setdef"]') && !pop().querySelector('[data-tp="apply"]'), pop().textContent);
    pop().querySelector('[data-tpa="0"]').click(); await W(30);
    ok('a template from the list goes on it, and new rectangles take it (✓ default)', d1.fill === 'rgba(244,192,90,0.3)' && d1.dash === 'dashed' && C.ddef.rect.fill === 'rgba(244,192,90,0.3)' && /Template applied: Yellow zone/.test(document.getElementById('stpr-flash').textContent)
      && (bar().querySelector('[data-db="tpl"]').click(), /Yellow zone\s*✓ default/.test(pop().textContent.replace(/×/g, ''))), pop().textContent);
    pop().querySelector('[data-tpx="1"]').click(); await W(30);
    ok('× deletes a template (the menu stays open)', C.dtpl.rect.length === 1 && C.dtpl.rect[0].n === 'Yellow zone' && DB.popK() === 'tpl' && /Template deleted: Red/.test(document.getElementById('stpr-flash').textContent));
    pop().querySelector('[data-tp="reset"]').click(); await W(30);
    ok('Reset to default: the app\'s look on it and on new rectangles', !C.ddef.rect && !d1.fill && !d1.dash && !d1.color && !d1.mid && /app's look is back/.test(document.getElementById('stpr-flash').textContent), d1);
    DW.list.splice(1, 1); DW.sel = null; P._props();

    // 8. a tool picked, nothing selected: the same bar at the top of the chart sets the next one's look
    document.querySelector('#stpr-tools [data-tool="trend"]').click(); await W(40);
    b = bar(); br = b.getBoundingClientRect(); acts = Array.prototype.map.call(b.querySelectorAll('[data-db]'), function (x) { return x.getAttribute('data-db'); });
    ok('Trend line picked: the bar docks at the top of the chart: Templates, colour, text, width, style, More (no lock / bin yet)', shown(b) && br.top >= r.top && br.top < r.top + 60 && acts.join(',') === 'tpl,line,text,width,dash,more', [acts, br.top - r.top]);
    b.querySelector('[data-db="line"]').click(); await W(20); pop().querySelector('[data-pc="#4ECD8B"]').click(); DB.closePop();
    bar().querySelector('[data-db="dash"]').click(); await W(20); pop().querySelector('[data-pd="dotted"]').click(); DB.closePop();
    bar().querySelector('[data-db="more"]').click(); await W(20); tg = pop().querySelector('[data-tgl="extR"]'); tg.checked = true; tg.dispatchEvent(new Event('change', { bubbles: true })); DB.closePop(); await W(20);
    var tl = await draw2('trend', 120, 420, 220, 380);
    ok('the next trend line has that look (green, dotted, extended right)', tl.type === 'trend' && tl.color === '#4ECD8B' && tl.dash === 'dotted' && tl.extR === true, tl);
    var hT = P._xOfT(0, tl.b.t) + 140, hY = P._yOf(0, tl.b.price) + (P._yOf(0, tl.b.price) - P._yOf(0, tl.a.price)) / (P._xOfT(0, tl.b.t) - P._xOfT(0, tl.a.t)) * 140;
    DW.sel = null; P._props(); mev('mousedown', hT, hY); mev('mouseup', hT, hY); await W(40);
    ok('pressed on its extension, the line is picked', DW.sel === DW.list.indexOf(tl), [DW.sel, hT, hY]);
    var r2 = await draw2('rect', X0, 340, X1, 390);
    ok('a rectangle drawn next keeps its own look (each tool has its own)', !r2.color && !r2.dash, r2);
    // the horizontal line's style on the price scale
    document.querySelector('#stpr-tools [data-tool="hline"]').click(); await W(20); mev('mousedown', W0 * 0.5, 160); mev('mouseup', W0 * 0.5, 160); await W(60);
    var hl = DW.list[DW.list.length - 1]; bar().querySelector('[data-db="dash"]').click(); await W(20); pop().querySelector('[data-pd="dotted"]').click(); DB.closePop(); await W(80);
    ok('a horizontal line dotted: its price-scale line dotted', hl.dash === 'dotted' && (pane().hl || []).some(function (l) { return l.options().lineStyle === 1; }));

    // 9. the bar moves by its grip and stays there for the session
    b = bar(); br = b.getBoundingClientRect(); var gr = b.querySelector('.stdb-gr').getBoundingClientRect(), pd = function (t, x, y) { b.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 7, clientX: x, clientY: y, button: 0, buttons: 1, pointerType: 'mouse' })); };
    var gx = gr.left + 5, gy = gr.top + 10; b.querySelector('.stdb-gr').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 7, clientX: gx, clientY: gy, button: 0, buttons: 1, pointerType: 'mouse' }));
    pd('pointermove', gx + 80, gy + 60); pd('pointerup', gx + 80, gy + 60); await W(20);
    var br2 = bar().getBoundingClientRect();
    DW.sel = 0; P._props(); await W(30); var br3 = bar().getBoundingClientRect();
    ok('dragged by its grip it moves, and stays there for the next drawing picked', Math.abs(br2.left - br.left - 80) < 2 && Math.abs(br2.top - br.top - 60) < 2 && Math.abs(br3.left - br2.left) < 2 && Math.abs(br3.top - br2.top) < 2, [br.left, br.top, br2.left, br2.top, br3.left, br3.top]);
    DB.unpin();
    // Escape: a popover first
    bar().querySelector('[data-db="tpl"]').click(); await W(20); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(20);
    ok('Escape closes the popover first (the drawing stays selected)', DB.popK() === null && DW.sel === 0);

    // 10. Hide all drawings / Lock all drawings
    var hb = document.getElementById('stpr-hideall'), lb = document.getElementById('stpr-lockall');
    ok('Hide all and Lock all beside undo / redo / the bin', hb && lb && hb.previousElementSibling.id === 'stpr-del' && lb.previousElementSibling === hb && hb.title === 'Hide all drawings' && lb.title === 'Lock all drawings');
    var before = px((r0.x0 + r0.x1) / 2 + 3, (r0.y0 + r0.y1) / 2 + 9);
    hb.click(); await W(80);
    var after = px((r0.x0 + r0.x1) / 2 + 3, (r0.y0 + r0.y1) / 2 + 9);
    ok('Hide all: every drawing off the chart (the horizontal line too), nothing selected, the eye lit, it says so', C.dwHide === true && before[3] > 0 && after[3] === 0 && !(pane().hl || []).length && DW.sel == null && hb.classList.contains('on') && hb.title === 'Show all drawings' && /Every drawing hidden/.test(document.getElementById('stpr-flash').textContent), [before, after, (pane().hl || []).length]);
    P._treeMenu(document.getElementById('stpr-treebtn')); await W(30);
    ok('hidden, they are still in the object tree', document.querySelectorAll('#stpr-menu [data-otsel]').length === DW.list.length);
    document.getElementById('stpr-treebtn').click(); await W(20);
    ok('kept with the chart settings', JSON.parse(localStorage.getItem('st_practice_cfg') || '{}').dwHide === true);
    hb.click(); await W(60);
    ok('pressed again: back', C.dwHide === false && px((r0.x0 + r0.x1) / 2 + 3, (r0.y0 + r0.y1) / 2 + 9)[3] > 0 && (pane().hl || []).length === 1 && !hb.classList.contains('on'));
    hb.click(); await W(30); document.querySelector('#stpr-tools [data-tool="rect"]').click(); await W(30);
    ok('hidden, picking a tool shows them again', C.dwHide === false && DW.tool === 'rect');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(20);
    lb.click(); await W(40);
    ok('Lock all: locked, the padlock lit, it says so', C.dwLock === true && lb.classList.contains('on') && lb.title === 'Unlock all drawings' && /Every drawing locked/.test(document.getElementById('stpr-flash').textContent));
    var n0 = DW.list.length, a0 = d0.a.t; r0 = rectOn(d0);
    mev('mousedown', (r0.x0 + r0.x1) / 2, (r0.y0 + r0.y1) / 2 + 9); mev('mouseup', (r0.x0 + r0.x1) / 2, (r0.y0 + r0.y1) / 2 + 9); await W(40);
    var lkB = bar().querySelector('[data-db="lock"]');
    ok('a drawing picked shows locked in its toolbar', DW.sel === 0 && lkB && lkB.classList.contains('act') && /Every drawing is locked/.test(lkB.title), lkB && lkB.title);
    mev('mousedown', (r0.x0 + r0.x1) / 2, (r0.y0 + r0.y1) / 2 + 9); mev('mousemove', (r0.x0 + r0.x1) / 2 + 60, (r0.y0 + r0.y1) / 2 + 40, { held: true }); mev('mouseup', (r0.x0 + r0.x1) / 2 + 60, (r0.y0 + r0.y1) / 2 + 40); await W(40);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); await W(40);
    ok('locked: it does not move and Delete leaves it, saying how to unlock', d0.a.t === a0 && DW.list.length === n0 && /padlock beside the bin/.test(document.getElementById('stpr-flash').textContent), document.getElementById('stpr-flash').textContent);
    lb.click(); await W(40);
    ok('pressed again: unlocked', C.dwLock === false && !lb.classList.contains('on'));

    // 11. a chart in a window of its own: its drawing's toolbar opens in that window, styled
    P._layout(2); for (k = 0; k < 100 && !(P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    var win = P._pop(1); for (k = 0; k < 120 && !(P._pops()[1] && P._pops()[1].ready && P._panes()[1] && P._panes()[1].el.ownerDocument !== document && P._panes()[1].n); k++) await W(100);
    DW.at = P._panes()[1]; DW.sel = 0; DW.noProps = false; P._props(); await W(60);
    var wb = win && win.document.querySelector('.stdb-bar'), wcs = wb && win.getComputedStyle(wb);
    ok('a chart in its own window: the toolbar opens in that window, styled like here', wb && wb.style.display === 'flex' && wcs.position === 'absolute' && wcs.borderRadius === '9px' && wb.querySelector('[data-db="tpl"]') && !(document.querySelector('.stdb-bar') && document.querySelector('.stdb-bar').style.display === 'flex'), wb && [wb.style.display, wcs.position, wcs.borderRadius]);
    wb.querySelector('[data-db="line"]').click(); await W(30);
    var wp = win.document.querySelector('.stdb-pop');
    ok('and its popovers there too', wp && wp.style.display === 'flex' && wp.querySelectorAll('[data-pc]').length === 80);
    P._dbar().closePop(); P._unpop(1); await W(400); DW.at = P._panes()[0];

    // 12. Spanish
    if (typeof setLanguage === 'function') { setLanguage('es'); await W(200); DW.sel = 0; DW.noProps = false; P._props(); await W(30);
      ok('in Spanish: Plantillas, Color de la línea, Ocultar / Bloquear todos los dibujos', bar().querySelector('[data-db="tpl"]').title === 'Plantillas' && bar().querySelector('[data-db="line"]').title === 'Color de la línea' && hb.title === 'Ocultar todos los dibujos' && lb.title === 'Bloquear todos los dibujos', [bar() && bar().querySelector('[data-db="tpl"]') && bar().querySelector('[data-db="tpl"]').title, bar() && bar().style.display, hb.title, lb.title, document.documentElement.lang]);
      bar().querySelector('[data-db="tpl"]').click(); await W(20);
      ok('its menu too: Guardar plantilla como..., Tus plantillas de rectángulo', /Guardar plantilla como/.test(pop().textContent) && /Tus plantillas de rectángulo/i.test(pop().textContent), pop().textContent);
      DB.closePop(); setLanguage('en'); await W(200); }
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
