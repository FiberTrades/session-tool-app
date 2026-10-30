// End-to-end test (Nestor, 30 Oct 2026): the Watchlist's rows kept in place while prices tick (a click between two prices was lost:
// "i have to click an assets a few times"), its prices named by where they come from (the account on the chart's server and name),
// any press on a chart selects it and the platform's timeframes act on the selected chart only ("when i change the TF on the main
// chart the TF from another chart i was using just before doesnt get changed"), and Candles in front of drawings from the chart's
// right-click menu ("bring candles forward and objects behind and vice versa"). Run through python tests/chartsel_run.py.
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var P = window.__stPractice, LC = window.__stLC, T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000;
    P._lvClock(T0 * 1000 - Date.now());
    window.__stPlatOff = false; window.__stLcForce = true; await W(1200);
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
    var css0 = document.createElement('style'); css0.textContent = '#st-nudge, .st-nudge, .st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"], .dcx-notif-prompt { display: none !important; }'; document.head.appendChild(css0);
    var LIST = ['EURUSD', 'XAUUSD', 'GBPUSD', 'USDJPY'];
    try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15, 5, 60, 240]; C.syms = []; C.mini = false; C.resume = null; delete C.lookDk; C.look = {}; C.wl = LIST.slice(); C.wlSort = ''; C.cfront = {}; C.act = 0; } catch (e) {}
    try { localStorage.setItem('st_plat', JSON.stringify({ pn: 'wl', pw: {}, bh: 150, fold: false, tab: 'pos' })); } catch (e) {}
    var acc0 = (data.accounts || [])[0] || {};
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-plat', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-plat' });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
    var $ = function (s) { return document.querySelector(s); }, $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
    for (k = 0; k < 40 && $$('.plat-right .pl-wlr').length < 3; k++) await W(250);
    await W(1500);

    // the Watchlist
    var src = $('.plat-right .pl-wls');
    check('the Watchlist says where its prices come from: the account on the chart', src && /FTMO 70K/.test(src.textContent) && /90001234/.test(src.title || ''), src && [src.textContent, src.title]);
    var row = $('.plat-right .pl-wlr[data-wlr="EURUSD"]'), px0 = row && row.children[1] && row.children[1].textContent;
    for (k = 0; k < 40 && row && row.children[1].textContent === px0; k++) await W(250);
    var row2 = $('.plat-right .pl-wlr[data-wlr="EURUSD"]');
    check('a new price changes the row in place (the same row, so a click across it is never lost)', row && row === row2 && row.isConnected && row.children[1].textContent !== px0, [px0, row2 && row2.children[1].textContent, row === row2]);

    // two charts: any press selects one; the top timeframes act on it alone
    P._layout(2); for (k = 0; k < 80 && !(P._panes().length === 2 && P._panes()[1].bars && P._panes()[1].bars.length); k++) await W(250); await W(800);
    var ps = P._panes(), press = function (el) { var r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 }; el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); };
    check('two charts', ps.length === 2, ps.length);
    press(ps[1].el.querySelector('.stpr-pc')); await W(300);
    check('a press on chart 2\'s candles selects it', P._cfg().act === 1 && ps[1].el.classList.contains('act'), P._cfg().act);
    var lg0 = ps[0].el.querySelector('.stpr-tl') || ps[0].el.querySelector('.pl-lg') || ps[0].el.firstElementChild;
    press(lg0); await W(300);
    check('a press on chart 1\'s own labels selects chart 1', P._cfg().act === 0, [P._cfg().act, lg0 && lg0.className]);
    press(ps[1].el.querySelector('.stpr-pc')); await W(300);
    var tf0 = ps[0].tf, b60 = $('[data-pltf="60"]');
    if (b60) b60.click(); await W(1500);
    ps = P._panes();
    check('the top bar\'s 1h goes to the selected chart (2) only', b60 && ps[1].tf === 60 && ps[0].tf === tf0, [!!b60, ps[0].tf, ps[1].tf, tf0]);
    var on = $('.plat-top [data-pltf].on') || $('[data-pltf].on');
    check('...and the top bar shows the selected chart\'s timeframe', on && on.getAttribute('data-pltf') === '60', on && on.getAttribute('data-pltf'));
    press(ps[0].el.querySelector('.stpr-pc')); await W(800);
    on = $('[data-pltf].on');
    check('selecting chart 1 shows its own timeframe up top', on && +on.getAttribute('data-pltf') === ps[0].tf, [on && on.getAttribute('data-pltf'), ps[0].tf]);

    // candles in front of the drawings, chart 1's choice
    var menu = function (p) { var pc = p.el.querySelector('.stpr-pc'), r = pc.getBoundingClientRect(); pc.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + r.width * 0.3, clientY: r.top + r.height * 0.5, button: 2 })); };
    var item = function (p) { var b = p.el.querySelector('.stpr-ctx [data-act="cfront"]'); return b; };
    menu(ps[0]); await W(400);
    var it = item(ps[0]);
    check('the chart\'s right-click menu has Candles in front of drawings', it && /Candles in front of drawings/.test(it.textContent), it && it.textContent);
    if (it) it.click(); await W(800);
    var ov = ps[0].el.querySelector('.stpr-ov');
    check('...picked: kept for chart 1 only, its drawings layer under the candles (the chart area of the top layer hidden)', P._cfg().cfront && P._cfg().cfront[0] === true && !P._cfg().cfront[1] && /polygon/.test(ov.style.clipPath) && !ps[1].el.querySelector('.stpr-ov').style.clipPath, [JSON.stringify(P._cfg().cfront), ov.style.clipPath]);
    window.__selShot = 'front';
    await W(1200);
    menu(ps[0]); await W(400); it = item(ps[0]);
    check('...the menu then offers Drawings in front of candles', it && /Drawings in front of candles/.test(it.textContent), it && it.textContent);
    if (it) it.click(); await W(600);
    check('...picked: back as before', !(P._cfg().cfront || {})[0] && !ov.style.clipPath, [JSON.stringify(P._cfg().cfront), ov.style.clipPath]);
    // for the screenshots: a box over chart 1's last candles, candles in front
    var B = ps[0].bars, n0 = Math.max(0, B.length - 40), lo = Infinity, hi = -Infinity; for (k = n0; k < B.length; k++) { lo = Math.min(lo, B[k].low); hi = Math.max(hi, B[k].high); }
    var DW = P._dr(); DW.list.push({ type: 'rect', a: { t: B[n0].time, price: hi }, b: { t: B[B.length - 1].time, price: lo + (hi - lo) * 0.3 }, live: true }); P._render(); await W(400);
    menu(ps[0]); await W(400); it = item(ps[0]); if (it) it.click(); await W(1500);
    // Copy trading (Nestor, 30 Oct 2026: "the copy trading panel... looks messy! can you improve its look?"): the Trade with list's tags
    // open each group; stand-ins only, as platform_e2e.js
    var CWs = {}, rawc = P._s().sym.raw, LVc = P._lv(), Lc = window.__stLiveLine;
    window.__stCopyWish = { set: function (lg, role) { CWs[String(lg)] = { role: role, at: Date.now(), err: '', ok: true }; return Promise.resolve(true); }, state: function (lg) { return CWs[String(lg)] || null; }, role: function () { return 'off'; }, _clear: function () { CWs = {}; } };
    ['acc-demo|FTMO Demo', 'acc-one|OneFunded 10K - Challenge', 'acc-ttt|TTT 10K - Challenge'].forEach(function (s0) { var v = s0.split('|'); data.accounts.push(Object.assign(JSON.parse(JSON.stringify(data.accounts[0])), { id: v[0], name: v[1], kind: 'challenge', status: 'active' })); });
    data.accounts.forEach(function (a) { if (a.id === 'acc-plat') a.name = 'FTMO 70K - Challenge'; });
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap, { '1515070952': 'acc-demo', '27007659': 'acc-one', '1009000': 'acc-ttt' });
    var e0c = Lc.easL()[rawc + '|90001234'] || {}; Lc.easL()[rawc + '|1515070952'] = Object.assign({}, e0c, { at: Date.now(), lg: 1515070952, v: '9.16' });
    LVc.set = LVc.set || {}; LVc.set[rawc + '|1515070952'] = Object.assign({}, LVc.set[rawc + '|90001234'] || {}, { copy_role: 'off', copy_followers: 0 });
    ['27007659', '1009000'].forEach(function (lg) { window.__stEA.apply({ login: lg, symbol: rawc, ea_version: '9.18', updated_at: new Date().toISOString(), settings: { copy_role: 'follow', copy_lead: '90001234', copy_followers: 0, risk_mode: 'amount', risk_amount: 70, sl_min: 2, sl_max: 4, tp_on: true, tp_mode: 'rr', tp_value: 3, be_on: true, be_trigger_r: 1, max_trades_day: 3, partials: '50', unit: 'pips' } }); });
    window.__keepc = setInterval(function () { var x = Lc.easL()[rawc + '|1515070952']; if (x) x.at = Date.now(); var s1 = LVc.set[rawc + '|90001234']; if (s1 && s1.copy_role !== 'lead') s1.copy_role = 'lead'; }, 100);
    P._cfg().lvLg = '90001234'; await W(600);
    $('#stpr-mm [data-mm="acct"]').click(); for (k = 0; k < 30 && !$('#stpr-menu.show .stpr-accm'); k++) await W(100); await W(1700);
    var cps = $('#stpr-menu [data-cpsheet]'); if (cps) cps.click(); await W(400);
    var tags = $$('#stpr-menu .stpr-cps .stpr-cpsec .stpr-twc').map(function (e) { return e.textContent; }).join('|');
    check('Copy trading: each group opens with its tag - LEAD, COPYING 70K, NOT COPYING', tags === 'LEAD|COPYING 70K|NOT COPYING', tags);
    check('no script errors', !errs.length, errs.slice(0, 4));
  } catch (e) { results.push({ name: 'the test ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(results);
})()
