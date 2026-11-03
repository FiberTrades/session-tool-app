// End-to-end test (Nestor, 3 Nov 2026: a copied trade counts once, with the Lead's R; each account's own R and money shown beside it).
// Run: python tests/browser_test.py tests/accline_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 100 && typeof newAccountBlank !== 'function'; i++) await W(100);
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
    var A = newAccountBlank('FTMO 70K', 70000, 'challenge'); A.kind = 'challenge'; A.currency = 'GBP';
    var B = newAccountBlank('TTT 10K', 10000, 'challenge'); B.kind = 'challenge'; B.currency = 'USD';
    data.accounts = [A, B]; data.activeAccountId = A.id; data.viewScope = 'lifetime'; data.linkedGroups = []; data.mt5LoginMap = {}; data.history = []; data.review = { trades: [] }; data.settings.statsPeriod = 'all';
    var d = new Date(); d.setDate(d.getDate() - 2); d.setHours(12, 0, 0, 0); var iso = d.toISOString();
    data.currentSeries = [
      { id: 'l1', accountId: B.id, symbol: 'EUR/USD', date: iso, openTs: iso, dayOfWeek: d.getDay(), result: 'BE', r: 4.44, risk: 49.95, actualGross: 13.32, costs: 0, ideaId: 'i1', copyFollow: true },
      { id: 'l2', accountId: A.id, symbol: 'EUR/USD', date: iso, openTs: iso, dayOfWeek: d.getDay(), result: 'BE', r: 5, risk: 500, actualGross: 12.4, costs: 62.45, ideaId: 'i1' },
      { id: 'l3', accountId: A.id, symbol: 'EUR/USD', date: iso, openTs: iso, dayOfWeek: d.getDay(), result: 'Win', r: 5, risk: 500, actualGross: 2420.04, costs: 62.48 }];
    rebuildSeriesByDate();
    document.querySelector('.tab[data-page="tradeview"]').click(); await W(500); renderAllTrades(); await W(150);
    var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
    var ln = document.querySelectorAll('.st-accs'), t0 = txt(ln[0]);
    ok('Trade Log: one line, for the copied trade only', ln.length === 1, ln.length);
    ok('...each account: its name, its own R, its own money', /FTMO 70K Lead −0\.10R −£50\.05/.test(t0) && /TTT 10K \+0\.27R \+\$13\.32/.test(t0), t0);
    ok('...the Lead first', t0.indexOf('FTMO 70K') < t0.indexOf('TTT 10K'), t0);
    var rw = ln[0].previousElementSibling; ok('...right under its own row', rw && rw.classList.contains('atl-row'), rw && rw.className);
    // a total per currency, pounds and dollars never added (3 Nov 2026)
    var mg = filterByScope(getAllLifetimeTrades()).filter(function (x) { return x._ideaN === 2; })[0];
    ok('the combined row: only the Lead\'s pounds in its own figures', !!mg && Math.abs(tradeNetPL(mg) + 50.05) < 0.001 && mg.risk === 500, mg && [tradeNetPL(mg), mg.risk]);
    var nc = rw.querySelector('.atl-c-net'); ok('Trade Log: its net says each currency, on its own line', /−£50\.05/.test(txt(nc)) && /\+\$13\.32/.test(txt(nc)) && !/36\.73/.test(txt(nc)), txt(nc));
    var mb = moneyBy([mg], function (x) { return tradeNetPL(x); }); ok('money by currency: £ and $ apart', Math.abs(mb.GBP + 50.05) < 0.001 && Math.abs(mb.USD - 13.32) < 0.001, mb);
    var inU = _ideaInCur(filterByScope(getAllLifetimeTrades()), 'USD'); ok('the dollar view has the copy, at its own R', inU.length === 1 && inU[0].id === 'l1' && Math.abs(tradeRforMath(inU[0]) - 13.32 / 49.95) < 0.001, inU.map(function (x) { return x.id; }));
    var hd = document.querySelector('#alltrades-table .atl-head .atl-c-net'); ok('Trade Log: its Net heading names no currency over two', /^net$/i.test(txt(hd)), txt(hd));
    // the Trade Log in Session Review names the Lead and the Follows, whichever row comes first (3 Nov 2026)
    var rvT = [{ id: 'r1', accountId: B.id, symbol: 'EUR/USD', result: 'Lose', ideaId: 'x', openTs: iso, copyFollow: true }, { id: 'r2', accountId: A.id, symbol: 'EUR/USD', result: 'Lose', ideaId: 'x', openTs: iso }];
    var rv0 = data.review; data.review = { trades: rvT }; renderTrades(); await W(100);
    var rvTxt = txt(document.getElementById('trades-list') || document.body), iL = rvTxt.indexOf('Lead, answers shared'), iF = rvTxt.indexOf('Follow, answers shared');
    ok('Session Review: the row listed first is the Follow, the second the Lead, each said so, answers shared on both', iL > 0 && iF > 0 && iF < iL, [iF, iL, rvTxt.slice(0, 200)]);
    data.review = rv0; renderTrades();
    window.__alShot = 1;
    var day = d.toDateString(); openDayModal(day); await W(300);
    var mod = document.querySelector('#modal-trades .st-accs');
    ok('the day\'s window: the same line', /−0\.10R/.test(txt(mod)) && /\+0\.27R/.test(txt(mod)), txt(document.getElementById('modal-trades')).slice(0, 200));
    var row1 = document.querySelector('#modal-trades .modal-trade-row[data-id]');
    ok('...its row is not called a copy: the row is the Lead\'s', row1 && !/copy/.test(txt(row1)), txt(row1));
    var mstat = Array.prototype.filter.call(document.querySelectorAll('#day-modal-bg .modal-stat'), function (x) { return /net r/i.test(x.textContent); })[0];
    ok('...the day\'s Net R is after costs, as its rows (+4.72R and -0.10R)', /\+4\.62R/.test(txt(mstat)), txt(mstat));
    var hr = Array.prototype.map.call(document.querySelectorAll('#modal-trades .modal-trade-row.headers .modal-trade-cell'), txt); ok('the day\'s window: the same', hr.indexOf('Net') >= 0 || hr.some(function (x) { return /^net$/i.test(x); }), hr);
    var dn = txt(document.getElementById('modal-net')); ok('the day\'s window: its Net P&L per currency, not -£36.73', /\+£2,307\.51/.test(dn) && /\+\$13\.32/.test(dn) && !/36\.73/.test(dn), dn);
    document.getElementById('day-modal-bg').classList.remove('show');
    data.viewScope = A.id; data.activeAccountId = A.id; renderAllTrades(); await W(150);
    ok('one account in view: its own trades, no line', !document.querySelector('#alltrades-table .st-accs'), document.querySelectorAll('#alltrades-table .st-accs').length);
    var hd1 = document.querySelector('#alltrades-table .atl-head .atl-c-net'); ok('one account, one currency: the heading keeps it', /£/.test(txt(hd1)), txt(hd1));
    data.viewScope = 'lifetime'; renderAllTrades(); document.querySelector('.tab[data-page="stats"]').click(); await W(400);
    var tips = Array.prototype.map.call(document.querySelectorAll('[data-tip]'), function (e) { return e.getAttribute('data-tip'); }).filter(function (x) { return /on 2 accounts/.test(x); });
    ok('Series of 10: its dot\'s hover names both', tips.length >= 1 && /FTMO 70K −0\.10R/.test(tips[0]) && /TTT 10K \+0\.27R/.test(tips[0]), tips[0]);
    // only dollars, on a member whose main currency is pounds (3 Nov 2026: "and what happens whe the only currency is $?")
    var U = newAccountBlank('TTT 10K', 10000, 'challenge'); U.kind = 'challenge'; U.currency = 'USD'; data.accounts = [U]; data.settings.currency = 'GBP'; data.activeAccountId = U.id; data.viewScope = 'lifetime';
    data.currentSeries = [{ id: 'u1', accountId: U.id, symbol: 'EUR/USD', date: iso, openTs: iso, dayOfWeek: d.getDay(), result: 'Lose', r: 5, risk: 44.4, actualGross: -39.96, costs: 0 }]; rebuildSeriesByDate();
    document.querySelector('.tab[data-page="tradeview"]').click(); await W(400); renderAllTrades(); renderCalendar(); await W(150);
    var uh = txt(document.querySelector('#alltrades-table .atl-head .atl-c-net')), un = txt(document.querySelector('#alltrades-table .atl-row:not(.atl-head) .atl-c-net')), uc = txt(document.querySelector('#cal-grid .cal-day.has-trade .cal-day-pl'));
    ok('only dollars: the Trade Log says Net $ over dollars', /^net \$$/i.test(uh) && /−\$39\.96/.test(un), [uh, un]);
    ok('...the Calendar\'s day too', /\$40/.test(uc) && !/£/.test(uc), uc);
    ok('...the month total too', /−\$39\.96/.test(txt(document.getElementById('cal-month-summary'))), txt(document.getElementById('cal-month-summary')).slice(0, 80));
    openDayModal(d.toDateString()); await W(300);
    var ud = txt(document.getElementById('modal-net')), uh2 = Array.prototype.map.call(document.querySelectorAll('#modal-trades .modal-trade-row.headers .modal-trade-cell'), txt), ur = txt(document.querySelector('#modal-trades .modal-trade-row[data-id]'));
    ok('...the day\'s window: its total, heading and row all in dollars', /−\$39\.96/.test(ud) && uh2.some(function (x) { return /^net \$$/i.test(x); }) && /−\$39\.96/.test(ur) && !/£/.test(ud + ur), [ud, uh2, ur]);
    document.getElementById('day-modal-bg').classList.remove('show');
    document.querySelector('.tab[data-page="tradeview"]').click(); await W(400); var a = document.querySelector('.st-accs'); if (a) a.scrollIntoView({ block: 'center' });
  } catch (e) { out.push({ name: 'test ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
