// End-to-end test: the Charts platform in windows of their own (25 Oct 2026, Nestor: "i want the main chart window with the broker feel
// when it opens on a new window to keep the same look as when in the app, and any extra new windows opened in new windows they need the
// same feel but you can remove the trade manager and the toolbox from the bottom of the screen").
//   python tests/window_plat_run.py      (the relay and a stand-in EA, then this test; it leaves both windows open for the screenshots)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  var vis = function (el) { if (!el) return false; var r = el.getBoundingClientRect(), v = el.ownerDocument.defaultView; return r.width > 0 && r.height > 0 && r.right <= v.innerWidth + 1 && r.bottom <= v.innerHeight + 1 && v.getComputedStyle(el).display !== 'none'; };
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
    try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15, 60, 240, 5]; C.syms = []; C.mini = false; C.showPer = {}; C.resume = null; delete C.lookDk; C.look = {}; } catch (e) {}
    try { localStorage.removeItem('st_plat'); localStorage.removeItem('st_chartwins_v1'); } catch (e) {}
    var acc0 = (data.accounts || [])[0] || {};
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-plat', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-plat' });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
    await W(1500);
    check('the platform is on in the Charts tab', P._plat().on && document.getElementById('stpr-win').classList.contains('plat'), document.getElementById('stpr-win').className);

    // ---- an extra chart in a window of its own: the platform's look, no Trade Manager, no Positions ----
    await P._layout(2); for (k = 0; k < 60 && !(P._panes().length === 2 && P._panes()[1].n); k++) await W(150);
    var cw = P._pop(1); for (k = 0; k < 120 && !(P._pops()[1] && P._pops()[1].ready && P._panes()[1] && P._panes()[1].el.ownerDocument !== document && P._panes()[1].n > 10); k++) await W(150);
    await W(1200);
    var cd = cw && cw.document, cwin = cd && cd.getElementById('stpr-win');
    check('chart 2 opens in a window of its own and is drawn there', !!cwin && P._panes()[1].el.ownerDocument === cd && cd.querySelectorAll('.stpr-pc canvas').length > 1, cwin && cwin.className);
    check('...in the platform\'s look: its top bar along the top, the drawing tools down the left, the chart filling the rest', cwin && cwin.classList.contains('plat') && cwin.classList.contains('plsat') && vis(cd.querySelector('#stpr-tb2.plat-top')) && vis(cd.getElementById('pl-satleft')) && vis(cd.getElementById('stpr-cw'))
      && cd.getElementById('pl-satleft').getBoundingClientRect().right <= cd.getElementById('stpr-cw').getBoundingClientRect().left + 1 && cd.getElementById('stpr-tb2').getBoundingClientRect().bottom <= cd.getElementById('stpr-cw').getBoundingClientRect().top + 1,
      cwin && [cwin.className, cd.getElementById('stpr-tb2').className]);
    var lf = cd && cd.getElementById('pl-satleft');
    check('...the drawing tools down the left: the cursor, the tools, hide / lock / magnet / object tree / delete', lf && lf.querySelector('[data-plcur]') && lf.querySelector('[data-gtool="lines"]') && lf.querySelector('[data-tool="fib"]') && lf.querySelector('#stpr-magnet') && lf.querySelector('#stpr-del') && vis(lf.querySelector('#stpr-magnet')),
      lf && lf.children.length);
    var tb = cd && cd.getElementById('stpr-tb2'), q = function (s) { return tb && tb.querySelector(s); };
    check('...the top bar: the mark, the chart\'s symbol, its timeframe, the Session Indicator, alerts, snapshot, chart settings, the theme, full screen', vis(q('.pl-satmk')) && /EURUSD/.test(q('.pl-ssym').textContent) && vis(q('.pl-sattfs [data-satf="60"].on')) && q('.pl-sattfs').querySelectorAll('[data-satf]').length >= 7 && vis(q('.pl-satsi [data-plsi]')) && vis(q('#stpr-alertsbtn')) && vis(q('#stpr-snapbtn')) && vis(q('#stpr-lookbtn')) && vis(q('[data-pltheme] svg')) && vis(q('[data-plfull] svg')),
      tb && [q('.pl-ssym') && q('.pl-ssym').textContent, q('.pl-sattfs') && q('.pl-sattfs').textContent, !!q('#stpr-alertsbtn'), !!q('[data-pltheme] svg'), !!q('[data-plfull] svg')]);
    check('...no Trade Manager, no Positions, no Watchlist, no layout button there', cd && !cd.getElementById('stpr-mm') && !cd.getElementById('lc-tb') && !cd.querySelector('.plat-right, .plat-rail, .plat-foot') && !q('#stpr-lay'));
    check('...on the chart: its name with O H L C', cd && cd.querySelector('.pl-nm') && /Euro \/ U\.S\. Dollar · 1h · /.test(cd.querySelector('.pl-nm').textContent) && vis(cd.querySelector('.pl-nm')), cd && cd.querySelector('.pl-nm') && cd.querySelector('.pl-nm').textContent);
    // a press there: the same control here, for that window's chart
    var mg = function (d) { var b = d.getElementById('pl-satleft') ? d.querySelector('#pl-satleft #stpr-magnet') : document.getElementById('stpr-magnet'); return b && b.getAttribute('aria-pressed'); };
    var m0 = document.getElementById('stpr-magnet').getAttribute('aria-pressed');
    lf.querySelector('#stpr-magnet').click(); await W(500);
    check('the magnet down its left: on here and there', document.getElementById('stpr-magnet').getAttribute('aria-pressed') !== m0 && mg(cd) === document.getElementById('stpr-magnet').getAttribute('aria-pressed'), [m0, document.getElementById('stpr-magnet').getAttribute('aria-pressed'), mg(cd)]);
    lf.querySelector('#stpr-magnet').click(); await W(400);
    var si0 = !!((P._cfg().showPer || {})[1] || {}).mini, sm0 = !!((P._cfg().showPer || {})[0] || {}).mini;
    q('.pl-satsi [data-plsi]').click(); await W(600);
    var si1 = !!((P._cfg().showPer || {})[1] || {}).mini;
    check('its Session Indicator chip: that window\'s chart only', si1 !== si0 && !!((P._cfg().showPer || {})[0] || {}).mini === sm0 && q('.pl-satsi').classList.contains('off') === !si1, [si0, si1, sm0, q('.pl-satsi').className]);
    q('.pl-satsi [data-plsi]').click(); await W(400);
    var tf0 = P._cfg().tfs[0];
    q('.pl-sattfs [data-satf="240"]').click(); for (k = 0; k < 40 && P._cfg().tfs[1] !== 240; k++) await W(150); await W(600);
    check('its timeframe buttons: that window\'s chart only', P._cfg().tfs[1] === 240 && P._cfg().tfs[0] === tf0 && q('.pl-sattfs [data-satf="240"]').classList.contains('on') && /· 4h · /.test(cd.querySelector('.pl-nm').textContent), [P._cfg().tfs, cd.querySelector('.pl-nm').textContent]);
    q('.pl-sattfs [data-satf="60"]').click(); for (k = 0; k < 40 && P._cfg().tfs[1] !== 60; k++) await W(150); await W(400);
    q('.pl-ssym').click(); await W(500);
    var sm = cd.getElementById('stpr-menu');
    check('its symbol up top opens that chart\'s symbol list, in that window', sm && sm.classList.contains('show') && vis(sm), sm && sm.className);
    try { cd.dispatchEvent(new cw.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); cd.body.click(); } catch (e) {} await W(400);

    // ---- Live Charts in a window of its own: the whole platform, as in the tab ----
    var opened = null, wo = window.open, satW = null;
    window.open = function (u, n, f) { opened = [u, n, f]; satW = wo.call(window, u, n, f); return satW; };
    P._lcPop(); window.open = wo;
    for (k = 0; k < 140 && !(P._stage().on && satW && P._panes()[0].el.ownerDocument === satW.document && P._panes()[0].n > 30); k++) await W(150);
    // headless opens a pop-up at 784 x 528 whatever it asks for (resizeTo does nothing there): the runner sizes it as a computer's window
    for (k = 0; k < 80 && satW.innerWidth < 1024; k++) await W(150);
    await W(2000);
    var sd = satW && satW.document, sw = sd && sd.getElementById('stpr-win'), sq = function (s) { return sd && sd.querySelector(s); };
    check('Live Charts moves into its own window (livecharts.html), drawn there', !!opened && /^livecharts\.html\?sym=EURUSD/.test(opened[0]) && P._stage().on && !!sw && P._panes()[0].el.ownerDocument === sd, [opened, P._stage()]);
    check('...the platform there, filling that window', sw && sw.classList.contains('plat') && !sw.classList.contains('plph') && P._plat().on && Math.abs(sw.getBoundingClientRect().width - satW.innerWidth) < 2 && Math.abs(sw.getBoundingClientRect().height - satW.innerHeight) < 2,
      sw && [sw.className, Math.round(sw.getBoundingClientRect().width), satW.innerWidth, Math.round(sw.getBoundingClientRect().height), satW.innerHeight]);
    check('...its top bar, the tools down the left, the Watchlist and the Trade Manager on the right, the rail, Positions under the chart, the footer', vis(sq('.plat-top')) && vis(sq('.plat-left')) && vis(sq('.plat-right .pl-wl')) && vis(sq('.plat-right #stpr-mm.pl-mm')) && vis(sq('.plat-rail')) && vis(sq('#lc-tb')) && vis(sq('.plat-foot')),
      [vis(sq('.plat-top')), vis(sq('.plat-left')), vis(sq('.plat-right .pl-wl')), vis(sq('.plat-right #stpr-mm')), vis(sq('.plat-rail')), vis(sq('#lc-tb')), vis(sq('.plat-foot'))]);
    check('...the Trade Manager complete there: Setup, Why, Execute', sq('#stpr-mm [data-plsetup]') && sq('#stpr-mm [data-plwhy]') && vis(sq('#stpr-mm .pl-x')), [!!sq('#stpr-mm [data-plsetup]'), !!sq('#stpr-mm [data-plwhy]'), !!sq('#stpr-mm .pl-x')]);
    check('...no tab row there (it is its own window), and nothing of the top bar pushed out', sd && !sd.querySelector('.tabs') && Array.prototype.every.call(sd.querySelectorAll('.plat-top > *'), function (e) { var r = e.getBoundingClientRect(); return r.width === 0 || r.right <= satW.innerWidth + 1; }));
    check('...the chart window opened before goes with it, still in the platform\'s look', P._pops()[1] && P._pops()[1].ready && cwin.classList.contains('plsat') && P._panes()[1].el.ownerDocument === cd, P._pops()[1] && P._pops()[1].ready);
    // the theme from that window: the platform there and the chart window light, the app's tab untouched
    sq('.plat-top [data-pltheme]').click(); await W(1200);
    check('the sun there: that window\'s platform light, and the chart window with it', sw.classList.contains('pl-lt') && cwin.classList.contains('pl-lt'), [sw.className, cwin.className]);
    sq('.plat-top [data-pltheme]').click(); await W(1000);
    check('...the moon: both dark again', !sw.classList.contains('pl-lt') && !cwin.classList.contains('pl-lt'));
    // the bottom panel's line, dragged in that window
    var dr = sq('.pl-drag'), bh0 = P._plat().st.bh;
    if (dr) { var r0 = dr.getBoundingClientRect(), ev = function (t, y) { return new satW.PointerEvent(t, { bubbles: true, clientX: r0.left + 20, clientY: y, pointerId: 1 }); };
      dr.dispatchEvent(ev('pointerdown', r0.top + 2)); satW.dispatchEvent(ev('pointermove', r0.top - 60)); satW.dispatchEvent(ev('pointerup', r0.top - 60)); await W(400); }
    check('Positions\' line dragged taller in that window', !!dr && P._plat().st.bh > bh0 + 30, [bh0, P._plat().st.bh]);
    window.__stWinTest = { stage: satW, chart: cw };
  } catch (e) { results.push({ name: 'the test ran to the end', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(results);
})()
