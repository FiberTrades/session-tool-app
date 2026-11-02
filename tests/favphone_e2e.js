// End-to-end test: the favourite drawing tools on a phone, a slim upright bar at the chart's left edge (2 Nov 2026, Nestor with TradingView's mobile toolbar: "can my favorite tools look like this on phone view?").
//   python tests/favphone_run.py     (375 and 390 wide, upright and on their side; a screenshot of each)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  var $ = function (s) { return document.querySelector(s); };
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var P = window.__stPractice, LC = window.__stLC, T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000;
    P._lvClock(T0 * 1000 - Date.now());
    window.isSessionLive = function () { return true; };
    window.__stPlatOff = false; window.__stLcForce = true; await W(1200);
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    document.querySelectorAll('[class^="st-tour"]').forEach(function (e) { e.remove(); });
    window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
    var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [1, 15, 60, 5]; C.syms = []; C.mini = false; C.showPer = {}; C.resume = null; C.look = {}; C.favPosP = {}; C.favOnP = {};
    C.fav = ['trend', 'hline', 'hray', 'rect', 'fib', 'long', 'short', 'text', 'pen', 'range'];
    var acc0 = (data.accounts || [])[0] || {};
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-plat', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-plat' });
    var ptab = $('.tab[data-page="livecharts"]'); if (ptab) ptab.click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
    await W(1200);
    var win = $('#stpr-win'), p0 = P._panes()[0], DW = P._dr(), bar = function () { return p0.el.querySelector('.stpr-favbar'); };
    check('a phone: the phone layout (' + innerWidth + 'x' + innerHeight + ')', win.classList.contains('plph'), win.className);
    check('no bar until the pencil is pressed', !bar() || !bar().classList.contains('show'));
    var pen = $('.ph-icons #stpr-drawbtn'); pen.click(); await W(300);
    var e = bar(), r = e && e.getBoundingClientRect(), pr = p0.el.getBoundingClientRect();
    check('the pencil opens it: upright, slim, at the chart\'s left edge', e && e.classList.contains('show') && e.classList.contains('vert') && r.width <= 42 && r.left - pr.left <= 52 && r.height > r.width, r && [r.left - pr.left, r.width, r.height]);
    check('...wholly inside the chart', r.top >= pr.top - 0.5 && r.bottom <= pr.bottom + 0.5 && r.left >= pr.left - 0.5, [r.top, r.bottom, pr.top, pr.bottom]);
    check('...its tools one under another, its grip on top', e.querySelectorAll('[data-fvt]').length === 10 && e.firstElementChild.classList.contains('fv-grip') && e.querySelectorAll('[data-fvt]')[1].getBoundingClientRect().top > e.querySelectorAll('[data-fvt]')[0].getBoundingClientRect().top, e.querySelectorAll('[data-fvt]').length);
    check('...the row of all tools stays put away', getComputedStyle($('.ph-tray')).display === 'none', getComputedStyle($('.ph-tray')).display);
    check('...its colours follow the platform\'s theme', getComputedStyle(e).backgroundColor === (win.classList.contains('pl-lt') ? 'rgb(255, 255, 255)' : 'rgb(30, 34, 45)'), getComputedStyle(e).backgroundColor);
    // its grip, with a finger
    var g = e.querySelector('.fv-grip'), gr = g.getBoundingClientRect(), pev = function (t, x, y) { g.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 11, button: 0, clientX: x, clientY: y })); };
    var r0 = e.getBoundingClientRect(), gx = gr.left + gr.width / 2, gy = gr.top + gr.height / 2;
    pev('pointerdown', gx, gy); pev('pointermove', gx + 60, gy + 8); pev('pointermove', gx + 90, gy + 12); pev('pointerup', gx + 90, gy + 12); await W(150);
    var r1 = e.getBoundingClientRect();
    check('dragged by its grip: it moves, and stays', Math.abs(r1.left - r0.left - 90) <= 2 && Math.abs(r1.top - r0.top - 12) <= (r0.bottom + 12 > pr.bottom ? 40 : 2), [r1.left - r0.left, r1.top - r0.top]);
    gr = g.getBoundingClientRect(); gx = gr.left + gr.width / 2; gy = gr.top + gr.height / 2;
    pev('pointerdown', gx, gy); pev('pointermove', gx - 900, gy - 900); pev('pointerup', gx - 900, gy - 900); await W(150);
    r1 = e.getBoundingClientRect();
    check('dragged past the corner: still wholly in the chart', r1.left >= pr.left - 0.5 && r1.top >= pr.top - 0.5, [r1.left - pr.left, r1.top - pr.top]);
    C.favPosP = {}; try { e.style.left = ''; } catch (x) {} pen.click(); await W(200); pen.click(); await W(300);
    // a tool
    var t0 = e.querySelector('[data-fvt="rect"]'); t0.scrollIntoView({ block: 'nearest' }); t0.click(); await W(200);
    check('a tool picked: armed, lit on the bar', DW.tool === 'rect' && bar().querySelector('[data-fvt="rect"]').classList.contains('on'), DW.tool);
    bar().querySelector('[data-fvt="rect"]').click(); await W(150);
    check('...pressed again: put down', DW.tool === 'none', DW.tool);
    // all the tools
    var mo = bar().querySelector('[data-fvmore]'); mo.scrollIntoView({ block: 'nearest' }); mo.click(); await W(300);
    check('its foot opens the row of all the tools under the chart (where the stars are)', getComputedStyle($('.ph-tray')).display !== 'none', getComputedStyle($('.ph-tray')).display);
    bar().querySelector('[data-fvmore]').click(); await W(300);
    check('...and shuts it', getComputedStyle($('.ph-tray')).display === 'none');
    // no favourites: as before
    pen.click(); await W(200);
    check('the pencil closes it', !bar().classList.contains('show') && getComputedStyle($('.ph-tray')).display === 'none');
    C.fav = []; pen.click(); await W(300);
    check('no favourites: the pencil opens the row of all tools, no bar', getComputedStyle($('.ph-tray')).display !== 'none' && !(bar() && bar().classList.contains('show')), getComputedStyle($('.ph-tray')).display);
    pen.click(); await W(200);
    // the picture
    C.fav = ['trend', 'hline', 'hray', 'rect', 'fib', 'long', 'short', 'text', 'pen', 'range']; pen.click(); await W(400);
    var ol = p0.el.getBoundingClientRect();
    check('page not wider than the screen', document.documentElement.scrollWidth <= innerWidth + 1, [document.documentElement.scrollWidth, innerWidth]);
  } catch (e) { check('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(results);
})()
