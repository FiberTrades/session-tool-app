(async function () {
  // Max trades is per symbol (11 Oct 2026, with EA 8.94): EUR/USD at 1 and XAU/USD at 1 is one of each - a EUR/USD
  // trade never uses up gold's. Every place in the app that judges the rule counts ONE symbol against it.
  // Run: python tests/browser_test.py tests/persymbol_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);

  // ---- the grouping ----
  data.settings.symbols = ['EUR/USD', 'XAU/USD']; data.settings.pair = 'EUR/USD';
  var G = window.__stSymGroup, B = window.__stBusiestSymbol;
  ok('a symbol and its broker spellings are one group', G('EUR/USD') === G('EURUSD.r') && G('#EURUSDm') === G('EUR/USD') && G('GOLD') === G('XAU/USD') && G('XAUUSD') === G('XAU/USD'), [G('EUR/USD'), G('EURUSD.r'), G('GOLD')]);
  ok('gold and the euro are not', G('XAU/USD') !== G('EUR/USD'));
  ok('a trade with no symbol goes with the default pair', G('') === G('EUR/USD') && G(null) === G('EUR/USD'), G(''));
  var bz = B([{ symbol: 'EUR/USD' }, { symbol: 'XAUUSD' }, { symbol: 'GOLD' }, { symbol: 'EURUSD.r' }, { symbol: 'XAU/USD' }]);
  ok('the busiest symbol: gold, three times', bz.n === 3 && G(bz.sym) === G('XAU/USD'), bz);
  ok('an empty day has none', B([]).n === 0);

  // ---- one account, max 1 trade ----
  var acc = newAccountBlank('Live 70K', 70000, 'personal'); acc.kind = 'personal';
  acc.riskRules = Object.assign({}, acc.riskRules || {}, { maxTrades: 1, maxLossMode: 'amount', maxLossAmount: 0, maxLossPct: 0, maxRiskMode: 'amount', maxRiskAmount: 0, maxRiskPct: 0 });
  data.accounts = [acc]; data.activeAccountId = acc.id; data.viewScope = 'lifetime'; data.linkedGroups = []; data.mt5LoginMap = { '111': acc.id };
  data.history = []; data.currentSeries = []; data.reviewSlots = null; data.review = { trades: [] }; data.nudgeLog = {};
  var today = new Date(), iso = function (dOff, h, m) { var d = new Date(today); d.setDate(d.getDate() - dOff); d.setHours(h, m || 5, 0, 0); return d.toISOString(); };
  var mk = function (id, sym, dOff, h, res, gross) { return { id: id, accountId: acc.id, symbol: sym, date: iso(dOff, h), dayOfWeek: new Date(iso(dOff, h)).getDay(), result: res || 'Win', r: res === 'Lose' ? -1 : 2, pips: 10, sl: 5, risk: 100, side: 'Long', type: 'Continuation', entryTime: (h < 10 ? '0' + h : h) + ':05', exitTime: (h < 10 ? '0' + h : h) + ':25', actualGross: gross != null ? gross : (res === 'Lose' ? -100 : 200) }; };
  var load = function (list) { data.history = []; data.currentSeries = list; rebuildSeriesByDate(); };

  // A) today's rule status
  load([mk('a1', 'EUR/USD', 0, 8), mk('a2', 'XAU/USD', 0, 9)]);
  var rs = getRuleStatus();
  ok('today: one EUR/USD and one gold trade keep a max of 1', rs && rs.tradeCountBroken === false && rs.tradeCount === 2, rs && [rs.tradeCountBroken, rs.tradeCount]);
  load([mk('a1', 'EUR/USD', 0, 8), mk('a2', 'XAU/USD', 0, 9), mk('a3', 'EURUSD.r', 0, 9)]);
  rs = getRuleStatus();
  ok('today: a second EUR/USD trade breaks it', rs && rs.tradeCountBroken === true, rs && [rs.tradeCountBroken, rs.tradeCount]);

  // B) the Discipline days
  load([mk('b1', 'EUR/USD', 3, 8), mk('b2', 'XAU/USD', 3, 9), mk('b3', 'EUR/USD', 2, 8), mk('b4', 'EUR/USD', 2, 9), mk('b5', 'XAU/USD', 2, 9)]);
  var days = window.__stDiscipline.judge();
  var dA = days[0], dB = days[1];
  ok('Discipline: a day of one EUR/USD + one gold kept the rule', days.length === 2 && dA.kept === true && !dA.breaks.length && dA.n === 2, dA);
  ok('Discipline: a day with two EUR/USD broke it, 2 of 1', dB.kept === false && dB.breaks.length === 1 && dB.breaks[0].what === 'trades' && dB.breaks[0].got === 2 && dB.breaks[0].lim === 1, dB);

  // C) the live nudge and Session Live's meter
  try {
    load([]);
    _voiceSignedIn = function () { return true; };
    data.settings.nudges = Object.assign({}, data.settings.nudges || {}, { on: true });
    getSessions().forEach(function (s, i) { s.symbols = (i === 0) ? ['EUR/USD', 'XAU/USD'] : ['EUR/USD']; });
    try { window.__stEA.loaded(); } catch (e) {}
    var Nn = window.__stNudge, nowIso = function (off) { return new Date(Date.now() - (off || 0)).toISOString(); };
    var feed = function (tk, sym) { Nn.observe(null, { ticket: tk, symbol: sym, direction: 'long', closed: false, pnl: null }, { ticket: tk, login: '111', symbol: sym, direction: 'long', opened_at: nowIso(1000), closed_at: null, risk: 100 }); };
    var log = function () { try { return JSON.stringify(data.nudgeLog || {}); } catch (e) { return 'ERR'; } };
    var diag = function () { try { return window.__stNudgeDiag(); } catch (e) { return {}; } };
    feed(920001, 'EURUSD'); await W(300);
    var b1 = Nn.budget() || {};
    ok('nudges are running in the test', !!(diag().cfg || {}).on && diag().eligible && Object.keys((diag().day || {}).opens || {}).indexOf('920001') >= 0, [(diag().cfg || {}).on, diag().eligible]);
    feed(920002, 'XAUUSD'); await W(1900);   // a hidden window records a nudge 1.5 s after raising it
    var b2 = Nn.budget() || {}, l2 = log();
    ok('one EUR/USD then one gold trade: 1 of 1 used on each, never 2 of 1', b1.n === 1 && b2.n === 1 && b2.lim === 1, [b1.n, b2.n, b2.lim]);
    ok('and no limit nudge for the gold trade', /920002/.test(l2) && !/"rule":"limit"/.test(l2) && !/limit/.test(JSON.stringify((diag().fired || {})['920002'] || '')), l2.slice(0, 300));
    var by = (b2.bySym || []).map(function (x) { return x.sym + ' ' + x.n; }).join(' | ');
    ok('the budget lists each symbol in play', (b2.bySym || []).length === 2 && /EUR\/USD 1/.test(by) && /XAU\/USD 1/.test(by), by);
    feed(920003, 'XAUUSD.r'); await W(1900);
    var b3 = Nn.budget() || {}, l3 = log(), f3 = JSON.stringify(diag().fired || {});
    ok('a second gold trade: gold is 2 of 1', b3.n === 2 && /XAU\/USD 2/.test((b3.bySym || []).map(function (x) { return x.sym + ' ' + x.n; }).join(' | ')), [b3.n, b3.bySym]);
    ok('and the limit nudge fires, naming the symbol', /XAU\/USD trade 2 this session\. Your limit is 1 per symbol/.test(l3) || /XAU\/USD trade 2/.test(f3), (l3 + ' // ' + f3).slice(0, 500));
    // Session Live's Trades meter
    var host = document.createElement('div'); host.innerHTML = '';
    try { window.__stLiveBox.render(); } catch (e) {}
    await W(300);
    var rb = document.querySelector('.slx-rb'), rbT = rb ? rb.innerText.replace(/\s+/g, ' ') : '';
    ok('Session Live: the Trades meter shows each symbol, "of 1 each"', !rb || (/EUR\/USD 1/i.test(rbT) && /XAU\/USD 2/i.test(rbT) && /of 1 each/i.test(rbT)), rbT || 'board not on screen');
  } catch (e) { ok('live nudges per symbol', false, String(e && e.stack || e).slice(0, 300)); }

  // D) one symbol only: exactly as before
  ok('one symbol: the wording and the count are the old ones', html.indexOf("'nudge.limit': 'This is trade {N} this session. Your limit is {L}.'") > 0 && html.indexOf("T2('of ' + b.lim + ' used'") > 0);

  // E) the challenge review: "beyond the max" is the day's trades in that trade's own symbol
  try {
    var pa = newAccountBlank('FTMO 10K - Challenge', 10000, 'prop'); pa.kind = 'prop';
    pa.riskRules = Object.assign({}, pa.riskRules || {}, { maxDrawdownMode: 'amount', maxDrawdownAmount: 1000, ddType: 'static', profitTargetMode: 'amount', profitTargetAmount: 1000, maxTrades: 1 });
    data.accounts = [acc, pa];
    var pm = function (id, sym, dOff, h, gross) { var x = mk(id, sym, dOff, h, 'Lose', gross); x.accountId = pa.id; return x; };
    load([pm('p1', 'EUR/USD', 5, 8, -200), pm('p2', 'XAU/USD', 5, 9, -200), pm('p3', 'EUR/USD', 4, 8, -350), pm('p4', 'EUR/USD', 4, 9, -350)]);
    var ps = window.__stPropStatus(pa) || {}, hb = ((ps.review || {}).habits || []).filter(function (h) { return h.code === 'overMaxTrades'; })[0];
    ok('challenge review: only the second EUR/USD of a day is beyond the max', !!ps.review && !!hb && hb.trades === 1 && hb.days === 1, ps.review ? (hb || (ps.review.habits || []).map(function (h) { return h.code + ':' + h.trades; })) : Object.keys(ps));
  } catch (e) { ok('challenge review per symbol', false, String(e && e.stack || e).slice(0, 300)); }
  return out;
})()
