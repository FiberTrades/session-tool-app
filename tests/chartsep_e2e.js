// End-to-end test: each chart's own settings, in real chart windows (2 Nov 2026). Nestor: "when multiple charts are opened these are not
// independent, i change those settings on 1 chart and they change on another chart"; "i changed the name of the sessions on the 15min chart
// and it changed the names also in the 1m chart but the button was ticked off"; "why does this got the dot when all options are selected on
// this chart?". Three charts: 1 and 3 in the main window, 2 in a window of its own (chart.html).
//   python tests/chartsep_run.py
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  var until = async function (f, ms) { for (var u = 0; u < (ms || 3000); u += 50) { if (f()) return true; await W(50); } return !!f(); };
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var P = window.__stPractice, LC = window.__stLC, T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000;
    P._lvClock(T0 * 1000 - Date.now());
    window.isSessionLive = function () { return true; };
    window.__stPlatOff = false; window.__stLcForce = true; await W(1200);
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
    var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [1, 15, 15, 5]; C.syms = []; C.mini = true; C.showPer = {}; C.resume = null; delete C.lookDk; C.look = {}; C.miniS = {}; C.miniOff = {}; C.miniPer = {}; C.miniOffPer = {}; delete C.miniLink; C.act = 0;
    try { localStorage.removeItem('st_plat'); localStorage.removeItem('st_chartwins_v1'); } catch (e) {}
    var acc0 = (data.accounts || [])[0] || {};
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-plat', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-plat' });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
    await W(1200);
    check('the platform is on in the Charts tab', P._plat().on, document.getElementById('stpr-win').className);
    await P._layout(3); for (k = 0; k < 80 && !(P._panes().length === 3 && P._panes()[2].n); k++) await W(150);
    var cw = P._pop(1); for (k = 0; k < 120 && !(P._pops()[1] && P._pops()[1].ready && P._panes()[1] && P._panes()[1].el.ownerDocument !== document && P._panes()[1].n > 10); k++) await W(150);
    await W(1000);
    var cd = cw.document, pn = function (i) { return P._panes()[i]; };
    check('three charts: 1 and 3 here, 2 in a window of its own', pn(0).el.ownerDocument === document && pn(2).el.ownerDocument === document && pn(1).el.ownerDocument === cd);

    // the way a member's mouse gets to a chart or a button in a given window
    var press = function (el) { var v = el.ownerDocument.defaultView, r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, view: v, button: 0, clientX: r.left + r.width * 0.4, clientY: r.top + r.height * 0.4 };
      el.dispatchEvent(new v.PointerEvent('pointerdown', Object.assign({ pointerType: 'mouse', pointerId: 3 }, o))); el.dispatchEvent(new v.MouseEvent('mousedown', o)); el.dispatchEvent(new v.PointerEvent('pointerup', Object.assign({ pointerType: 'mouse', pointerId: 3 }, o))); el.dispatchEvent(new v.MouseEvent('mouseup', o)); };
    var clk = function (el) { var v = el.ownerDocument.defaultView, o = { bubbles: true, cancelable: true, view: v, button: 0 }; el.dispatchEvent(new v.PointerEvent('pointerdown', Object.assign({ pointerType: 'mouse', pointerId: 3 }, o))); el.click(); };
    var chartOf = function (i) { return pn(i).el.querySelector('.stpr-pc'); };
    var menuTxt = function () { var a = document.getElementById('stpr-menu'), b = cd.getElementById('stpr-menu'), m = (b && b.classList.contains('show')) ? b : a; return m && m.classList.contains('show') ? m.querySelector('.stpr-tglh').textContent : ''; };
    var layBtn = function (d) { return d === document ? document.getElementById('stpr-layersbtn') : d.querySelector('#stpr-tb2 #stpr-layersbtn'); };
    var menuEl = function (id) { return (cd.getElementById('stpr-menu') && cd.getElementById('stpr-menu').querySelector('#' + id)) || document.getElementById('stpr-menu').querySelector('#' + id); };
    var shut = function () { try { P._closeMenu && P._closeMenu(); } catch (e) {} press(document.getElementById('stpr-win').querySelector('.plat-top') || document.body); };
    var dot = function (d) { return layBtn(d).classList.contains('dot'); };

    // ---- Show on chart: the window it was opened from, never the chart clicked last in another (his 600.png: the main window's button said chart 3) ----
    press(chartOf(1)); await W(100);
    check('(chart 2, in its window, was clicked last)', P._act() === 1, P._act());
    clk(layBtn(document)); await W(200);
    check('the main window\'s Show on chart is for a chart in the main window, not chart 2 clicked last in the other', /chart 1 · 1m/.test(menuTxt()) || /chart 3/.test(menuTxt()), menuTxt());
    var forMain = /chart 1/.test(menuTxt()) ? 0 : 2, mk = menuEl('stpr-marks');
    mk.click(); await W(300);
    check('Trade lines off there: that chart only', C.showPer[forMain] && C.showPer[forMain].marks === false && !(C.showPer[1] && C.showPer[1].marks === false) && !(C.showPer[2 - forMain] && C.showPer[2 - forMain].marks === false), C.showPer);
    await W(100); clk(layBtn(document)); await W(200); if (/show/.test(document.getElementById('stpr-menu').className)) { clk(layBtn(document)); await W(100); }
    check('the chart in the other window keeps its lines', P._showOn(pn(1), 'marks') === true, C.showPer);
    menuEl('stpr-marks') && 0;
    // back on for the next part
    C.showPer = {}; P._render(); await W(150);

    clk(layBtn(cd)); await W(300);
    check('the chart window\'s Show on chart says its own chart', /chart 2 · 15m/.test(menuTxt()), menuTxt());
    menuEl('stpr-pos').click(); await W(300);
    check('Position tool off from the chart window: its chart only', C.showPer[1] && C.showPer[1].pos === false && !C.showPer[0] && !C.showPer[2], C.showPer);
    check('...and the drawing test says so: a trade box hides there only', P._visibleOn({ type: 'long', trade: 'tb:1' }, 15, pn(1)) === false && P._visibleOn({ type: 'long', trade: 'tb:1' }, 1, pn(0)) === true, null);
    var cmen = cd.getElementById('stpr-menu'); if (cmen && cmen.classList.contains('show')) { clk(layBtn(cd)); await W(150); }
    var m0 = document.getElementById('stpr-menu'); if (m0.classList.contains('show')) { clk(layBtn(document)); await W(150); }

    // ---- the dot: only when something on THAT chart is off (his 584.png) ----
    await W(200); P._satBar();
    check('the dot: on the chart window\'s button (its chart has one off); not on the main window\'s', dot(cd) === true && dot(document) === false, [dot(cd), dot(document), C.showPer]);
    C.showPer = { 2: { hist: false } }; press(chartOf(0)); await W(200); P._layersDot();
    check('chart 3 has one off, chart 1 (the chart in hand) has none: no dot, its menu all on', dot(document) === false && dot(cd) === false, [dot(document), P._act()]);
    press(chartOf(2)); await until(function () { return dot(document); }, 1500);
    check('chart 3 picked: the dot, at once', dot(document) === true && P._act() === 2, [dot(document), P._act()]);
    press(chartOf(0)); await until(function () { return !dot(document); }, 1500);
    check('chart 1 picked again: gone', dot(document) === false && P._act() === 0, [dot(document), P._act()]);
    C.showPer = {}; P._render();

    // ---- the Session Indicator chip in each window: its own chart ----
    press(chartOf(1)); await W(150);
    var chipMain = document.querySelector('.plat-top .pl-si [data-plsi]'), chipWin = cd.querySelector('.pl-satsi [data-plsi]');
    clk(chipMain); await W(300);
    check('the main window\'s chip, with chart 2 clicked last: switches a main window chart, not chart 2', P._showOn(pn(1), 'mini') === true && (P._showOn(pn(0), 'mini') === false || P._showOn(pn(2), 'mini') === false), C.showPer);
    clk(document.querySelector('.plat-top .pl-si [data-plsi]')); await W(200); C.showPer = {}; P._render();
    clk(chipWin); await W(300);
    check('the chart window\'s chip: its chart only', P._showOn(pn(1), 'mini') === false && P._showOn(pn(0), 'mini') === true && P._showOn(pn(2), 'mini') === true, C.showPer);
    clk(cd.querySelector('.pl-satsi [data-plsi]')); await W(200); C.showPer = {}; P._render();

    // ---- Session Indicator's settings with "Same settings on every chart" unticked (his 615.png), through the real dialog in the real window ----
    var dlg = function () { return cd.querySelector('.stpr-dlg') || document.querySelector('.stpr-dlg'); }, tit = function () { return dlg().querySelector('.stpr-dlgh b').textContent; };
    clk(document.querySelector('.plat-top [data-plsiset]')); await until(dlg, 1500);
    var lk = dlg().querySelector('[data-k="mlink"]');
    check('its settings offer "Same settings on every chart", ticked', lk && lk.checked);
    lk.click(); await W(200);
    check('unticked: a copy for each chart', C.miniLink === false && C.miniPer[0] && C.miniPer[1] && C.miniPer[2], Object.keys(C.miniPer || {}));
    var nm0 = P._ms(pn(0)).ses[0].name;
    dlg().querySelector('[data-dc]').click(); await W(150);
    // he renames the sessions on the chart in the window of its own
    clk(cd.querySelector('.pl-satsi [data-plsiset]')); await until(dlg, 1500);
    check('that chart\'s settings: the title says chart 2 · 15m', /chart 2/.test(tit()) && dlg().ownerDocument === cd, [tit(), dlg().ownerDocument === cd]);
    var goTab = function (txt) { var t = Array.prototype.filter.call(dlg().querySelectorAll('[data-dtab], .stpr-dtab'), function (b) { return b.textContent.trim() === txt; })[0]; if (t) t.click(); };
    var nmIn = dlg().querySelector('[data-k="s0.name"]');
    check('(the first session\'s name box)', !!nmIn);
    nmIn.value = 'Fifteen'; nmIn.dispatchEvent(new (dlg().ownerDocument.defaultView.Event)('input', { bubbles: true })); await W(120);
    check('typed: chart 2 has the new name; charts 1 and 3 keep theirs, while it is open', P._ms(pn(1)).ses[0].name === 'Fifteen' && P._ms(pn(0)).ses[0].name === nm0 && P._ms(pn(2)).ses[0].name === nm0, [P._ms(pn(0)).ses[0].name, P._ms(pn(1)).ses[0].name, P._ms(pn(2)).ses[0].name]);
    dlg().querySelector('[data-dok]').click(); await W(300);
    check('OK: the same', P._ms(pn(1)).ses[0].name === 'Fifteen' && P._ms(pn(0)).ses[0].name === nm0 && P._ms(pn(2)).ses[0].name === nm0, [P._ms(pn(0)).ses[0].name, P._ms(pn(1)).ses[0].name]);
    // what is on the charts, read from the words they paint
    var spy = function (i) { var said = [], c = pn(i).ov.getContext('2d'), f = c.fillText; c.fillText = function (t) { said.push(String(t)); return f.apply(this, arguments); }; return { said: said, off: function () { delete c.fillText; } }; };
    C.tfs = C.tfs; var s0 = spy(0), s1 = spy(1); P._miniFresh(); P._render(); pn(0).chart.timeScale().fitContent(); pn(1).chart.timeScale().fitContent(); await W(900); s0.off(); s1.off();
    var has = function (o, w) { return o.said.some(function (t) { return t.indexOf(w) === 0; }); };
    check('painted: chart 2 says Fifteen; chart 1 does not', has(s1, 'Fifteen') && !has(s0, 'Fifteen'), [s0.said.slice(0, 12), s1.said.slice(0, 12)]);
    // and the same from the main window's own chart: chart 2 keeps Fifteen, with chart 2 clicked last
    press(chartOf(1)); await W(120);
    clk(document.querySelector('.plat-top [data-plsiset]')); await until(dlg, 1500);
    check('from the main window, with chart 2 clicked last: the title says a main window chart', !/chart 2/.test(tit()) && dlg().ownerDocument === document, tit());
    dlg().querySelector('[data-k="s0.name"]').value = 'Main'; dlg().querySelector('[data-k="s0.name"]').dispatchEvent(new Event('input', { bubbles: true })); await W(120); dlg().querySelector('[data-dok]').click(); await W(200);
    check('renamed there: chart 2 keeps Fifteen', P._ms(pn(1)).ses[0].name === 'Fifteen' && (P._ms(pn(0)).ses[0].name === 'Main' || P._ms(pn(2)).ses[0].name === 'Main'), [P._ms(pn(0)).ses[0].name, P._ms(pn(1)).ses[0].name, P._ms(pn(2)).ses[0].name]);
    // ---- objects clicked first, then dragged, in the chart window too; its cursors there ----
    var D2 = P._dr(), p2 = pn(1), c2 = chartOf(1), q2 = c2.getBoundingClientRect(), b2 = p2.bars, t0 = b2[Math.max(0, b2.length - 30)].time, t1 = b2[Math.max(0, b2.length - 10)].time, pa = p2.series.coordinateToPrice(q2.height * 0.35), pb = p2.series.coordinateToPrice(q2.height * 0.6);
    var box2 = { type: 'rect', a: { t: t0, price: pa }, b: { t: t1, price: pb }, tfs: null }; D2.list.push(box2); D2.sel = null; P._render(); await W(250);
    var at2 = function (z) { return { x: P._xOfT(1, z.t), y: P._yOf(1, z.price) }; }, mv2 = function (t, x, y, held) { var el = cd.elementFromPoint(q2.left + x, q2.top + y) || c2; el.dispatchEvent(new cw.MouseEvent(t, { clientX: q2.left + x, clientY: q2.top + y, bubbles: true, cancelable: true, view: cw, button: 0, buttons: (t === 'mousedown' || held) ? 1 : 0 })); };
    var A2 = at2(box2.a), B2 = at2(box2.b), mx2 = (A2.x + B2.x) / 2, my2 = (A2.y + B2.y) / 2, s2 = JSON.stringify(box2), v20 = p2.chart.timeScale().getVisibleLogicalRange();
    mv2('mousemove', mx2, my2); await W(40);
    check('in the chart window: on it, not selected, a hand', c2.style.cursor === 'pointer', c2.style.cursor);
    mv2('mousedown', mx2, my2); for (var j2 = 1; j2 <= 6; j2++) { mv2('mousemove', mx2 + j2 * 12, my2, true); await W(16); } mv2('mouseup', mx2 + 72, my2); await W(300);
    check('...dragged, not selected: the chart moves, the drawing stays', JSON.stringify(box2) === s2 && D2.sel == null && Math.abs(p2.chart.timeScale().getVisibleLogicalRange().from - v20.from) > 1, [D2.sel, v20, p2.chart.timeScale().getVisibleLogicalRange()]);
    A2 = at2(box2.a); B2 = at2(box2.b); mx2 = (A2.x + B2.x) / 2; my2 = (A2.y + B2.y) / 2; mv2('mousedown', mx2, my2); mv2('mouseup', mx2, my2); await W(100);
    check('...a click: selected', D2.sel === D2.list.indexOf(box2), D2.sel);
    mv2('mousemove', A2.x, A2.y); await W(40); var c20 = c2.style.cursor; mv2('mousemove', B2.x, my2); await W(40); var c21 = c2.style.cursor; mv2('mousemove', mx2, my2); await W(40);
    check('...selected: a diagonal arrow on a corner, left and right on a side, a hand on its body', c20 === 'nwse-resize' && c21 === 'ew-resize' && c2.style.cursor === 'pointer', [c20, c21, c2.style.cursor]);
    s2 = JSON.stringify(box2); mv2('mousedown', mx2, my2); for (j2 = 1; j2 <= 6; j2++) { mv2('mousemove', mx2 + j2 * 5, my2 + j2 * 3, true); await W(16); } mv2('mouseup', mx2 + 30, my2 + 18); await W(100);
    check('...then a drag moves it', JSON.stringify(box2) !== s2);
    D2.list.splice(D2.list.indexOf(box2), 1); D2.sel = null; P._render(); await W(100);
    // a chart window reopened keeps its own
    P._unpop(1); await until(function () { return pn(1).el.ownerDocument === document; }, 6000); await W(600);
    check('chart 2 back in the main window keeps its own name', P._ms(pn(1)).ses[0].name === 'Fifteen' && P._ms(pn(0)).ses[0].name !== 'Fifteen', [P._ms(pn(0)).ses[0].name, P._ms(pn(1)).ses[0].name]);
  } catch (e) { check('test ran', false, String(e && e.stack || e)); }
  try { var fin = window.__stPractice; if (fin._pops()[1]) fin._unpop(1); } catch (e) {}
  return JSON.stringify(results);
})()
