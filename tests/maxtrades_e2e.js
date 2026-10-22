(async function () {
  // Max trades per day (11 Oct 2026): one plain number - every trade opened that day on the account, whatever the
  // session or the symbol. The live nudge, Session Live's meter, today's rule status, the Discipline days and the
  // challenge review all count it the same way. (The EA keeps a number on each chart: there it is per symbol.)
  // Run: python tests/browser_test.py tests/maxtrades_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);

  // ---- the name ----
  var lab = document.querySelector('[data-i18n="settings.risk_max_trades_label"]'), hint = document.querySelector('[data-i18n="settings.risk_max_trades_hint"]');
  ok('Settings calls it Max trades per day', !!lab && /^Max trades per day$/i.test(lab.textContent.trim()) && t('settings.risk_max_trades_label') === 'Max trades per day', lab && lab.textContent);
  ok('and says it is the whole day, all sessions and symbols together', !!hint && /in a day on this account, all sessions and symbols together/i.test(hint.textContent) && !/each symbol has its own count/i.test(html) && !/Max trades per session/.test(html), hint && hint.textContent);
  ok('the nudge says today, not this session, and never per symbol', t('nudge.limit') === 'This is trade {N} today. Your limit is {L}.' && html.indexOf('limit_sym') < 0 && html.indexOf('per symbol.') < 0, t('nudge.limit'));

  // ---- one account, max 1 trade a day ----
  data.settings.symbols = ['EUR/USD', 'XAU/USD']; data.settings.pair = 'EUR/USD';
  var acc = newAccountBlank('Live 70K', 70000, 'personal'); acc.kind = 'personal';
  acc.riskRules = { maxTrades: 1 };
  data.accounts = [acc]; data.activeAccountId = acc.id; data.viewScope = 'lifetime'; data.linkedGroups = []; data.mt5LoginMap = { '111': acc.id };
  data.history = []; data.currentSeries = []; data.reviewSlots = null; data.review = { trades: [] }; data.nudgeLog = {};
  var today = new Date(), iso = function (dOff, h, m) { var d = new Date(today); d.setDate(d.getDate() - dOff); d.setHours(h, m || 5, 0, 0); return d.toISOString(); };
  var mk = function (id, sym, dOff, h, res, gross) { return { id: id, accountId: acc.id, symbol: sym, date: iso(dOff, h), dayOfWeek: new Date(iso(dOff, h)).getDay(), result: res || 'Win', r: res === 'Lose' ? -1 : 2, pips: 10, sl: 5, risk: 100, side: 'Long', type: 'Continuation', entryTime: (h < 10 ? '0' + h : h) + ':05', exitTime: (h < 10 ? '0' + h : h) + ':25', actualGross: gross != null ? gross : (res === 'Lose' ? -100 : 200) }; };
  var load = function (list) { data.history = []; data.currentSeries = list; rebuildSeriesByDate(); };

  // A) today's rule status
  load([mk('a1', 'EUR/USD', 0, 8)]);
  var rs = getRuleStatus();
  ok('today: one trade keeps a max of 1', rs && rs.tradeCountBroken === false && rs.tradeCount === 1, rs && [rs.tradeCountBroken, rs.tradeCount]);
  load([mk('a1', 'EUR/USD', 0, 8), mk('a2', 'XAU/USD', 0, 14)]);
  rs = getRuleStatus();
  ok('today: one EUR/USD in the morning and one gold in the afternoon is 2 of 1', rs && rs.tradeCountBroken === true && rs.tradeCount === 2, rs && [rs.tradeCountBroken, rs.tradeCount]);

  // B) the Discipline days
  load([mk('b1', 'EUR/USD', 3, 8), mk('b2', 'EUR/USD', 2, 8), mk('b3', 'XAU/USD', 2, 14)]);
  var days = window.__stDiscipline.judge();
  ok('Discipline: a one-trade day kept the rule', days.length === 2 && days[0].kept === true && days[0].n === 1, days[0]);
  ok('Discipline: EUR/USD + gold on one day broke it, 2 of 1', days[1].kept === false && days[1].breaks.length === 1 && days[1].breaks[0].what === 'trades' && days[1].breaks[0].got === 2 && days[1].breaks[0].lim === 1, days[1]);

  // C) the live nudge and Session Live's meter: the whole day, every symbol
  try {
    load([]);
    _voiceSignedIn = function () { return true; };
    data.settings.nudges = Object.assign({}, data.settings.nudges || {}, { on: true });
    // a session that began ten minutes ago: the first trade was opened before it, earlier today
    var now = new Date(), hm = function (d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    var sinceMidnight = now.getHours() * 60 + now.getMinutes(), early = Math.max(2, Math.min(90, sinceMidnight - 1));
    data.settings.sessions = [{ name: 'New York', start: hm(new Date(now.getTime() - Math.min(10, early - 1) * 60000)), end: hm(new Date(now.getTime() + 60 * 60000)), symbols: ['EUR/USD', 'XAU/USD'] }];
    try { window.__stEA.loaded(); } catch (e) {}
    var Nn = window.__stNudge, isoAgo = function (ms) { return new Date(Date.now() - ms).toISOString(); };
    var feed = function (tk, sym, ago) { Nn.observe(null, { ticket: tk, symbol: sym, direction: 'long', closed: false, pnl: null }, { ticket: tk, login: '111', symbol: sym, direction: 'long', opened_at: isoAgo(ago), closed_at: null, risk: 100 }); };
    var log = function () { try { return JSON.stringify(data.nudgeLog || {}); } catch (e) { return 'ERR'; } };
    var diag = function () { try { return window.__stNudgeDiag(); } catch (e) { return {}; } };
    feed(920001, 'EURUSD', early * 60000); await W(300);
    var b1 = Nn.budget() || {};
    ok('nudges are running in the test', !!(diag().cfg || {}).on && diag().eligible && Object.keys((diag().day || {}).opens || {}).indexOf('920001') >= 0, [(diag().cfg || {}).on, diag().eligible]);
    ok('a trade from before this session still counts today: 1 of 1', b1.n === 1 && b1.lim === 1 && !('bySym' in b1), [b1.n, b1.lim]);
    feed(920002, 'XAUUSD', 1000); await W(1900);   // a hidden window records a nudge 1.5 s after raising it
    var b2 = Nn.budget() || {}, l2 = log();
    ok('a gold trade in the next session is trade 2 of the day', b2.n === 2 && b2.lim === 1, [b2.n, b2.lim]);
    ok('and the limit nudge fires: "This is trade 2 today. Your limit is 1."', /920002/.test(l2) && /This is trade 2 today\. Your limit is 1\./.test(l2), l2.slice(0, 500));
    try { window.__stLiveBox.render(); } catch (e) {}
    await W(300);
    var rb = document.querySelector('.slx-rb'), rbT = rb ? rb.innerText.replace(/\s+/g, ' ') : '';
    ok('Session Live: the Trades meter is the day\'s total, "2 of 1 today"', !rb || (/TRADES\s*2\s*of 1 today/i.test(rbT) && !/each/i.test(rbT) && !/EUR\/USD \d/.test(rbT)), rbT || 'board not on screen');
  } catch (e) { ok('live nudges per day', false, String(e && e.stack || e).slice(0, 300)); }

  // D) the challenge review: "beyond the max" is every trade after the first N of a day, whatever the symbol
  try {
    var pa = newAccountBlank('FTMO 10K - Challenge', 10000, 'prop'); pa.kind = 'challenge';
    pa.riskRules = { maxDrawdownMode: 'amount', maxDrawdownAmount: 1000, ddType: 'static', profitTargetMode: 'amount', profitTargetAmount: 1000, maxTrades: 1 };
    data.accounts = [acc, pa];
    var pm = function (id, sym, dOff, h, gross) { var x = mk(id, sym, dOff, h, 'Lose', gross); x.accountId = pa.id; return x; };
    load([pm('p1', 'EUR/USD', 5, 8, -200), pm('p2', 'XAU/USD', 5, 9, -200), pm('p3', 'EUR/USD', 4, 8, -350), pm('p4', 'EUR/USD', 4, 9, -350)]);
    var ps = window.__stPropStatus(pa) || {}, hb = ((ps.review || {}).habits || []).filter(function (h) { return h.code === 'overMaxTrades'; })[0];
    ok('challenge review: the second trade of each day is beyond the max, gold included', !!ps.review && !!hb && hb.trades === 2 && hb.days === 2, ps.review ? (hb || (ps.review.habits || []).map(function (h) { return h.code + ':' + h.trades; })) : Object.keys(ps));
  } catch (e) { ok('challenge review per day', false, String(e && e.stack || e).slice(0, 300)); }
  return out;
})()
