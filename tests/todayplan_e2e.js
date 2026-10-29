// End-to-end test: the live session's plan at the top of the Charts platform's Today panel (Nestor, 29 Oct 2026, of the Charts greeting's
// live-session line: "a great reminder for the trader") - the greeting's own words under "Your plan for this session", gone outside a live
// session, and in Live Charts' own window too. Run through python tests/todayplan_run.py.
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
    try { localStorage.setItem('st_plat', JSON.stringify({ pn: 'td', pw: {}, bh: 150, fold: false, tab: 'pos' })); } catch (e) {}   // a width kept from a wide screen
    var acc0 = (data.accounts || [])[0] || {};
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-plat', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-plat' });
    // a live London session, this morning's plan in it
    var LIVE = true; window.getSessions = function () { return [{ name: 'London', start: '08:00', end: '10:00' }]; }; window.liveSessionIndex = function () { return LIVE ? 0 : -1; };
    data.bias = Object.assign({}, data.bias || {}, { direction: 'Bearish', mode: 'Execution', structure: 'Trending', location: '' });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
    await W(1500);
    var plan = function (d) { var sec = d.querySelector('.plat-right .pl-tdb .pl-tdplan'); return sec ? { first: sec === d.querySelector('.plat-right .pl-tdb .pl-tdsec'), head: sec.querySelector('.pl-tdk').textContent, txt: sec.querySelector('.pl-tdpt').textContent } : null; };
    for (k = 0; k < 40 && !plan(document); k++) await W(250);
    var p1 = plan(document), want = (function () { var e = document.createElement('div'); e.innerHTML = window.__stSessionPlan(); return e.textContent; })();
    check('the Today panel, the session live: "Your plan for this session" first, in the greeting’s words', p1 && p1.first && p1.head === 'Your plan for this session' && /^London is live\. /.test(p1.txt) && p1.txt === want && p1.txt.length > 40, [p1, want]);
    var gr = document.querySelector('.bias-greeting[data-greeting-context="livecharts"]');
    check('...the Charts greeting says the same (it stays on the Charts page)', !gr || gr.textContent.indexOf(p1 && p1.txt.slice(0, 30)) >= 0 || !/is live/.test(gr.textContent), gr && gr.textContent.slice(0, 120));
    window.__tpShot = 'live';
    LIVE = false; await W(16000);   // the panel's own refresh
    check('outside a live session: no plan in the panel', !plan(document), plan(document));
    LIVE = true;
    // Live Charts in a window of its own
    var wo = window.open, satW = null;
    window.open = function (u, n, f) { satW = wo.call(window, u, n, f); return satW; };
    P._lcPop(); window.open = wo;
    for (k = 0; k < 140 && !(P._stage().on && satW && P._panes()[0].el.ownerDocument === satW.document && P._panes()[0].n > 30); k++) await W(150);
    for (k = 0; k < 80 && satW && satW.innerWidth < 1024; k++) await W(150);
    window.__pcSat = satW;
    var sd = satW && satW.document;
    for (k = 0; k < 80 && !(sd && plan(sd)); k++) await W(250);
    var p2 = sd && plan(sd);
    check('Live Charts’ own window: the plan at the top of its Today panel too', p2 && p2.first && /^London is live\. /.test(p2.txt), p2);
    check('no script errors', !errs.length, errs.slice(0, 4));
  } catch (e) { results.push({ name: 'the test ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(results);
})()
