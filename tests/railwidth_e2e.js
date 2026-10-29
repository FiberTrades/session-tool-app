// End-to-end test: the rail panels' width (Nestor, 29 Oct 2026, in Live Charts' own window about 1100 px wide: "i cant make this panel any
// narrower" - the Trade Manager took most of the window and its left edge would not move). A width kept from a wider window (640) is
// held to the widest that leaves the chart 55% of the platform; dragging the edge narrows it to 300 and down to the panel's narrowest
// (the Trade Manager's 264) - in the app window, then in Live Charts' own window. Run through python tests/railwidth_run.py.
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
    try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15, 1, 60, 240]; C.syms = []; C.mini = false; C.resume = null; delete C.lookDk; C.look = {}; } catch (e) {}
    try { localStorage.setItem('st_plat', JSON.stringify({ pn: 'tm', rw: 640, pw: {}, bh: 150, fold: false, tab: 'pos' })); } catch (e) {}   // a width kept from a wide screen
    var acc0 = (data.accounts || [])[0] || {};
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-plat', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-plat' });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
    await W(1500);
    var saved = function () { try { return JSON.parse(localStorage.getItem('st_plat') || '{}').rw; } catch (e) { return null; } };
    // measures and drags in whichever window the platform is in
    var M = function (d) { var win = d.getElementById('stpr-win'), r = d.querySelector('.plat-right'), cw = d.getElementById('stpr-cw'); return { W: win.clientWidth, panel: Math.round(r.getBoundingClientRect().width), chart: Math.round(cw.getBoundingClientRect().width) }; };
    var drag = async function (d, dx) { var wv = d.defaultView, hd = d.querySelector('.plat-right > .pl-swd'), hr = hd.getBoundingClientRect(), x0 = hr.left + 3, y0 = hr.top + hr.height / 2, PE = wv.PointerEvent;
      hd.dispatchEvent(new PE('pointerdown', { bubbles: true, cancelable: true, clientX: x0, clientY: y0, pointerId: 5, pointerType: 'mouse', button: 0 }));
      for (var i = 1; i <= 10; i++) { d.dispatchEvent(new PE('pointermove', { bubbles: true, clientX: x0 + dx * i / 10, clientY: y0, pointerId: 5, pointerType: 'mouse' })); await W(16); }
      d.dispatchEvent(new PE('pointerup', { bubbles: true, clientX: x0 + dx, clientY: y0, pointerId: 5, pointerType: 'mouse' })); await W(500); };
    var top = function (m) { return Math.min(640, Math.round(m.W * 0.45) - 112); };

    var m0 = M(document);
    check('the app window (' + m0.W + ' px): a width of 640 kept from a wider screen is held so the chart keeps 55% of the platform', m0.panel <= top(m0) + 1 && m0.chart >= m0.W * 0.55 - 2, m0);
    await drag(document, m0.panel - 300);
    var m1 = M(document);
    check('...its left edge dragged: the panel 300 px wide, kept on this device', Math.abs(m1.panel - 300) <= 1 && saved() === 300, [m1, saved()]);
    await drag(document, 200);
    var m2 = M(document);
    check('...dragged on: no narrower than the Trade Manager\'s 264', Math.abs(m2.panel - 264) <= 1 && saved() === 264, [m2, saved()]);
    await drag(document, -900);
    var m3 = M(document);
    check('...and back the other way: no wider than the chart\'s 55% allows', m3.panel <= top(m3) + 1 && m3.panel > 300, m3);

    // Live Charts in its own window, about 1100 px wide
    var wo = window.open, satW = null;
    window.open = function (u, n, f) { satW = wo.call(window, u, n, f); return satW; };
    P._lcPop(); window.open = wo;
    for (k = 0; k < 140 && !(P._stage().on && satW && P._panes()[0].el.ownerDocument === satW.document && P._panes()[0].n > 30); k++) await W(150);
    for (k = 0; k < 80 && satW && Math.abs(satW.innerWidth - 1100) > 2; k++) await W(150);
    await W(2000);
    var sd = satW && satW.document, n0 = sd && M(sd);
    check('Live Charts\' own window (' + (n0 && n0.W) + ' px): the panel held to the chart\'s 55% there too', n0 && n0.panel <= top(n0) + 1 && n0.chart >= n0.W * 0.55 - 2, n0);
    await drag(sd, n0.panel - 300);
    var n1 = M(sd);
    check('...its left edge dragged there: 300 px, kept', Math.abs(n1.panel - 300) <= 1 && saved() === 300, [n1, saved()]);
    await drag(sd, 200);
    var n2 = M(sd);
    check('...and down to the Trade Manager\'s 264 there', Math.abs(n2.panel - 264) <= 1, n2);
    satW.resizeTo && 0;
    check('no script errors', !errs.length, errs.slice(0, 4));
  } catch (e) { results.push({ name: 'the test ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(results);
})()
