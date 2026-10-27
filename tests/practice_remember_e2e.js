(async function () {
  // Each tool remembers its last style (Nestor, 27 Oct 2026: "when i change the colour, size, options on an object can that object
  // remember for future when i chose that object again the selection i previously did ... and also have a default setting button for it
  // so it can go back to how it was originally"): the last colours of a Long / Short position, an emoji's size, a new tool's background -
  // kept with the chart settings (synced) - and in the toolbar's More: Reset to default style, Reset for new ones only.
  // Run: python tests/browser_test.py tests/practice_remember_e2e.js
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
    var mev = function (t, xx, yy, o) { var r = ch.getBoundingClientRect(); ch.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mouseup' || t === 'mousemove' ? 0 : 1, view: window }, o || {}))); };
    var click = function (x, y) { mev('mousedown', x, y); mev('mouseup', x, y); };
    var pick = async function (t) { if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); if (DW.tool !== t) tools.querySelector('[data-tool="' + t + '"]').click(); await W(40); };
    var drawN = async function (t, pts) { await pick(t); for (var j = 0; j < pts.length; j++) { if (j) { mev('mousemove', pts[j][0], pts[j][1], { buttons: 1 }); await W(25); } click(pts[j][0], pts[j][1]); await W(40); } await W(80); return DW.list[DW.list.length - 1]; };
    var bar = function () { return document.querySelector('.stdb-bar'); }, pop = function () { return document.querySelector('.stdb-pop'); };
    var selOf = async function (d) { DW.sel = DW.list.indexOf(d); P._props(); await W(60); };
    var colour = async function (btn, c) { bar().querySelector('[data-db="' + btn + '"]').click(); await W(30); pop().querySelector('[data-pc="' + c + '"]').click(); await W(30); P._dbar().closePop(); await W(20); };
    var R = ch.getBoundingClientRect(), X = function (f) { return Math.round(R.width * f); }, Y = function (f) { return Math.round(R.height * f); };
    var cfgLS = function () { try { return JSON.parse(localStorage.getItem('st_practice_cfg') || '{}'); } catch (e) { return {}; } };

    // Long position: its target and stop colours
    DW.list = []; DW.sel = null; P._props();
    var l1 = await drawN('long', [[X(0.3), Y(0.6)]]); await selOf(l1); await colour('ptgt', '#E56767'); await colour('pstop', '#4ECD8B');
    DW.sel = null; P._props(); var l2 = await drawN('long', [[X(0.6), Y(0.6)]]);
    ok('a Long position\'s colours, changed: the next Long position starts with them', l2.ptc === '#E56767' && l2.psc === '#4ECD8B' && C.ddef.long && C.ddef.long.ptc === '#E56767', [l2.ptc, l2.psc, C.ddef.long]);
    ok('...kept with the chart settings (synced)', cfgLS().ddef && cfgLS().ddef.long && cfgLS().ddef.long.ptc === '#E56767');
    // Emoji: its size
    P._dbar().open && (await pick('emoji')); P._dbar().open('emoji'); await W(30); var eb = pop() && pop().querySelector('[data-emo]'); if (eb) eb.click(); await W(30);
    click(X(0.2), Y(0.3)); await W(80); var e1 = DW.list[DW.list.length - 1]; await selOf(e1);
    bar().querySelector('[data-db="more"]').click(); await W(40); var sz = pop().querySelector('[data-esz]'); sz.value = '64'; sz.dispatchEvent(new Event('input', { bubbles: true })); sz.dispatchEvent(new Event('change', { bubbles: true })); await W(40); P._dbar().closePop();
    await pick('emoji'); P._dbar().open('emoji'); await W(30); eb = pop() && pop().querySelector('[data-emo]'); if (eb) eb.click(); await W(30); click(X(0.4), Y(0.3)); await W(80); var e2 = DW.list[DW.list.length - 1];
    ok('an emoji made bigger: the next emoji starts that size', e1.type === 'emoji' && e2.type === 'emoji' && e2 !== e1 && +e2.size === 64 && C.ddef.emoji && +C.ddef.emoji.size === 64, [e2.size, C.ddef.emoji]);
    // a new tool: a circle's background
    var c1 = await drawN('circ', [[X(0.3), Y(0.4)], [X(0.34), Y(0.4)]]); await selOf(c1); await colour('fill', '#E56767');
    DW.sel = null; P._props(); var c2 = await drawN('circ', [[X(0.6), Y(0.4)], [X(0.64), Y(0.4)]]);
    ok('a circle\'s fill, changed: the next circle starts with it', /^rgba\(229,103,103,/.test(c1.fill || '') && c2.fill === c1.fill, [c1.fill, c2.fill]);
    // More: Reset to default style / Reset for new ones only
    await selOf(c2); bar().querySelector('[data-db="more"]').click(); await W(40);
    var mt = pop().textContent;
    ok('the toolbar\'s More has Reset to default style and Reset for new ones only', /Reset to default style/.test(mt) && /Reset for new ones only/.test(mt), mt.replace(/\s+/g, ' ').slice(0, 200));
    pop().querySelector('[data-tp="resetnew"]').click(); await W(40);
    DW.sel = null; P._props(); var c3 = await drawN('circ', [[X(0.45), Y(0.7)], [X(0.49), Y(0.7)]]);
    ok('Reset for new ones only: this one keeps its fill, new circles have the app\'s look again', c2.fill === c1.fill && !c3.fill && !C.ddef.circ, [c2.fill, c3.fill]);
    await selOf(l2); bar().querySelector('[data-db="more"]').click(); await W(40); pop().querySelector('[data-tp="reset"]').click(); await W(40);
    DW.sel = null; P._props(); var l3 = await drawN('long', [[X(0.75), Y(0.45)]]);
    ok('Reset to default style: the app\'s look on it and on new Long positions', !l2.ptc && !l2.psc && !l3.ptc && !C.ddef.long, [l2.ptc, l3.ptc, C.ddef.long]);
    // nothing selected, the tool picked: More resets what it remembered
    await pick('circ'); await W(40); var c4 = await drawN('circ', [[X(0.2), Y(0.8)], [X(0.24), Y(0.8)]]); await selOf(c4); await colour('fill', '#4ECD8B');
    DW.sel = null; P._props(); await pick('circ'); await W(60); P._props(); await W(60); var bb = P._dbar().el(), mb = bb && bb.querySelector('[data-db="more"]');
    var mtx = ''; if (mb) { mb.click(); await W(40); var pp = P._dbar().pop(); mtx = pp ? pp.textContent : 'no pop'; var rs = pp && pp.querySelector('[data-tp="reset"]'); if (rs) rs.click(); await W(40); }
    ok('the tool picked, nothing selected: More > Reset to default style forgets its look', !!mb && !C.ddef.circ, [C.ddef.circ, mtx, DW.tool]);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
