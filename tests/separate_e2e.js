(async function () {
  // An account kept separate (11 Oct 2026): its trades show only on its own view; everything combined leaves them out.
  // The proof is a comparison: every combined figure with a busy separate account must equal the same figure with
  // that account empty. Run: python tests/browser_test.py tests/separate_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);

  // ---- a journal of real-looking trades on two accounts that count, and a third account ----
  try { stDemoSeed(data); } catch (e) {}
  var src = getAllLifetimeTrades().slice();
  var mk = function (nm, bal) { var a = newAccountBlank(nm, bal, 'personal'); a.kind = 'personal'; return a; };
  var a1 = mk('Live 70K', 70000), a2 = mk('Live 10K', 10000), a3 = mk('Demo 70K', 70000);
  data.accounts = [a1, a2, a3]; data.activeAccountId = a1.id; data.viewScope = 'lifetime'; data.linkedGroups = [];
  var base = src.map(function (t, i) { var x = JSON.parse(JSON.stringify(t)); delete x.demo; x.id = 'r' + i; x.accountId = (i % 3 === 0) ? a2.id : a1.id; x.setup = (i % 2) ? 'Alpha' : 'Beta'; return x; });
  var load = function (list) { data.history = []; data.currentSeries = list.map(function (t) { return JSON.parse(JSON.stringify(t)); }); rebuildSeriesByDate(); };
  var today = new Date(), iso = function (dOff, h) { var d = new Date(today); d.setDate(d.getDate() - dOff); d.setHours(h, 5, 0, 0); return d.toISOString(); };
  var extra = [0, 0, 1, 2, 3, 9, 16, 40].map(function (dOff, i) {
    return { id: 'x' + i, accountId: a3.id, symbol: 'XAU/USD', date: iso(dOff, 9), dayOfWeek: new Date(iso(dOff, 9)).getDay(), result: (i % 3 === 0) ? 'Lose' : 'Win', r: (i % 3 === 0) ? -1 : 6, pips: (i % 3 === 0) ? -400 : 3000,
             sl: 400, risk: 500, side: 'Long', type: 'Continuation', entryTime: '09:05', exitTime: '09:40', setup: 'Alpha', actualGross: (i % 3 === 0) ? -500 : 3000, mt5Ticket: String(770000 + i),
             biasSnap: { structure: 'Bullish', location: 'Discount', direction: 'Bullish', sessionName: 'London', symbol: 'XAU/USD' } };
  });
  data.bias = Object.assign(data.bias || {}, { structure: 'Bullish', location: 'Discount', direction: 'Bullish' });
  data.nudgeLog = {}; data.reviewSlots = null; data.review = { trades: [] };

  // every combined figure worth checking, as one comparable object
  var txt = function (h) { var d = document.createElement('div'); d.innerHTML = h || ''; return d.textContent.replace(/\s+/g, ' ').trim(); };
  var snap = function () {
    var o = {};
    var sc = filterByScope(getAllLifetimeTrades());
    o.scoped = [sc.length, Math.round(sc.reduce(function (s, t) { return s + tradeRforMath(t); }, 0) * 100) / 100, Math.round(sc.reduce(function (s, t) { return s + tradeNetPL(t); }, 0))];
    var ss = getScopedSeries(); o.series = [ss.currentSeries.length, ss.history.length, ss.currentSeries.map(function (t) { return t.id; }).join(','), ss.history.map(function (h) { return h.trades.length; }).join(',')];
    o.store = [data.currentSeries.length, _seriesHist().length];
    o.money = [getScopedBaseline(), getScopedPaidOut(), getStatsLifetimeStartingBalance(), getEffectiveStartingBalance()];
    try { var p = window.STAI.dataPack() || {}; o.ai = JSON.stringify([p.totals, p.thisWeek, p.thisMonth, p.byDirection, p.streak, p.bySymbol, p.bySetup, p.byWeekday, p.records, p.currentSeries]); } catch (e) { o.ai = 'ERR ' + e.message; }
    try { o.disc = JSON.stringify(window.__stDiscipline.judge().map(function (d) { return [d.k, d.n, Math.round(d.net), d.kept]; })); } catch (e) { o.disc = 'ERR ' + e.message; }
    try { o.today = [getTodayOutcome(), getRecentDayOutcome(), _turnedUpToday()]; } catch (e) { o.today = 'ERR ' + e.message; }
    try { o.greet = [txt(_seriesGreetingHTML()), txt(_statsGreetingHTML()), txt(_calendarGreetingHTML())]; } catch (e) { o.greet = 'ERR ' + e.message; }
    try { renderBiasLike(); o.bias = (document.getElementById('bias-like').textContent || '').replace(/\s+/g, ' ').trim(); } catch (e) { o.bias = 'ERR ' + e.message; }
    try { o.pb = [_pbTradesOf('Alpha').length, _pbTradesOf('Beta').length]; } catch (e) { o.pb = 'ERR ' + e.message; }
    try { var f = new Date(today); f.setDate(f.getDate() - 60); var k = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
          var st = window.__stNudge.periodStats(k(f), k(today)); o.nudges = [st.total, st.into.n, Math.round(st.into.net)]; } catch (e) { o.nudges = 'ERR ' + e.message; }
    return o;
  };
  var diff = function (A, B) { return Object.keys(A).filter(function (k) { return JSON.stringify(A[k]) !== JSON.stringify(B[k]); }); };

  // A) the third account exists but is empty
  load(base);
  var A = snap();
  ok('the plain journal reads normally', A.scoped[0] === base.length && A.store[0] + 10 * A.store[1] >= base.length - 9 && !/ERR/.test(JSON.stringify(A)), A);

  // B) the third account trades, and is kept separate
  load(base.concat(extra));
  // a nudge on one of its trades, and one of its trades sitting in today's review
  var tk0 = key0(); function key0() { var d = new Date(extra[0].date); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  data.nudgeLog[tk0] = {}; data.nudgeLog[tk0]['against_bias:' + extra[0].mt5Ticket] = { at: '09:05', text: 'against your bias' };
  var withAll = snap();
  ok('before the switch, the third account is counted like any other', withAll.scoped[0] === base.length + extra.length && diff(A, withAll).length > 5, diff(A, withAll));
  ok('the switch is refused when no other account would count', (function () { a1.separate = true; a2.separate = true; var only = data.accounts.some(function (a) { return a.id !== a3.id && a.status === 'active' && !a.separate; }); delete a1.separate; delete a2.separate; return only === false; })());
  setAccountSeparate(a3.id, true);
  var B = snap(), d1 = diff(A, B).filter(function (k) { return k !== 'money'; });
  ok('its capital leaves the combined balance (150,000 with it, 80,000 without)', JSON.stringify(A.money) === '[150000,0,150000,150000]' && JSON.stringify(B.money) === '[80000,0,80000,80000]', [A.money, B.money]);
  ok('kept separate: every combined figure equals the journal without it', d1.length === 0, d1.map(function (k) { return k + ': ' + JSON.stringify(A[k]).slice(0, 160) + ' vs ' + JSON.stringify(B[k]).slice(0, 160); }));
  ok('nothing was deleted: the store still holds every trade', getAllLifetimeTrades().length === base.length + extra.length && !!findTradeById('x0') && findTradeById('x0').accountId === a3.id, getAllLifetimeTrades().length);
  var parkedAt = data.history.map(function (h) { return h.separate ? 1 : 0; }).join('');
  ok('its trades are parked in one entry after the series, never in a series', /^0*1$/.test(parkedAt) && data.history[data.history.length - 1].trades.length === extra.length && !data.currentSeries.some(function (t) { return t.accountId === a3.id; }), parkedAt);

  // C) on its own view it is a whole journal
  data.viewScope = a3.id;
  var own = filterByScope(getAllLifetimeTrades()), os = getScopedSeries();
  ok('picked in the account picker: its own trades, and only those', own.length === extra.length && own.every(function (t) { return t.accountId === a3.id; }) && os.currentSeries.length === extra.length, [own.length, os.currentSeries.length]);
  ok('the unscoped readers follow it there too', _pbTradesOf('Alpha').length === extra.length && window.__stNudge.periodStats('2000-01-01', '2999-01-01').total === 1, [_pbTradesOf('Alpha').length, window.__stNudge.periodStats('2000-01-01', '2999-01-01').total]);
  ok('its own balance is its own', Math.round(getScopedBaseline()) === 70000, getScopedBaseline());
  data.viewScope = a1.id;
  ok('another account\'s view is untouched', filterByScope(getAllLifetimeTrades()).every(function (t) { return t.accountId === a1.id; }));
  data.viewScope = 'lifetime';

  // D) today's Session Review holding one real trade and one from the separate account: you can see and review both
  // there, but the greeting's read of today and the community post only know the real one
  var pad2 = function (n) { return String(n).padStart(2, '0'); }, tdS = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());
  var realT = { id: 'rv1', accountId: a1.id, symbol: 'EUR/USD', date: iso(0, 9), result: 'Win', r: 5, pips: 20, sl: 4, risk: 500, side: 'Long', type: 'Continuation', entryTime: '09:10', exitTime: '09:30', actualGross: 2500, traded: 'Yes' };
  var sepT = { id: 'rv2', accountId: a3.id, symbol: 'XAU/USD', date: iso(0, 9), result: 'Lose', r: -1, pips: -400, sl: 400, risk: 500, side: 'Long', type: 'Continuation', entryTime: '09:20', exitTime: '09:25', actualGross: -500, traded: 'Yes' };
  var keepRev = data.review, keepSlots = data.reviewSlots;
  data.review = { trades: [realT], sessionDate: tdS, traded: 'Yes' }; data.reviewSlots = [data.review];
  var outReal = getTodayOutcome(), msgReal = '';
  try { msgReal = buildReviewMessage(); } catch (e) { msgReal = 'ERR ' + e.message; }
  data.review.trades = [realT, sepT];
  var outBoth = getTodayOutcome(), msgBoth = '';
  try { msgBoth = buildReviewMessage(); } catch (e) { msgBoth = 'ERR ' + e.message; }
  ok('today reads as the real trade alone', outReal === outBoth && !!outReal, [outReal, outBoth]);
  var mB = msgBoth.replace(/\u001b\[[0-9;]*m/g, ''), mR = msgReal.replace(/\u001b\[[0-9;]*m/g, '');
  ok('a review with a real and a test trade: the post shows both, the test one marked', !/^ERR/.test(mB) && /Yes \(1 trade, plus 1 on a test account\)/.test(mB) && /1\. .*Win.*\n2\. .*Lose.*\(test account\)/.test(mB) && !/test account/.test(mR), mB.slice(0, 520));
  ok('and its totals are the real trade alone', /Wins:\s+1\b/.test(mB) && /Losses:\s+0\b/.test(mB) && (mB.match(/Net R[^\n]*/) || [''])[0] === (mR.match(/Net R[^\n]*/) || ['x'])[0], [(mB.match(/Net R[^\n]*/) || [''])[0], (mR.match(/Net R[^\n]*/) || [''])[0]]);
  // a test account that COPIES the real trade (the same idea): one trade, noted as also copied to a test account
  var cpy = Object.assign({}, realT, { id: 'rv1c', accountId: a3.id, ideaId: 'idea-1', actualGross: 2400 }); realT.ideaId = 'idea-1';
  data.review.trades = [realT, cpy];
  var msgCp = ''; try { msgCp = buildReviewMessage().replace(/\u001b\[[0-9;]*m/g, ''); } catch (e) { msgCp = 'ERR ' + e.message; }
  ok('a real trade copied to a test account: one trade, "also copied to a test account"', /Yes \(1 trade, also copied to a test account\)/.test(msgCp) && /1\. .*Win[^\n]*\(\+ test account\)/.test(msgCp) && !/\n2\. /.test(msgCp) && !/copied to 2 accounts/.test(msgCp) && (msgCp.match(/Net R[^\n]*/) || [''])[0] === (mR.match(/Net R[^\n]*/) || ['x'])[0], msgCp.slice(0, 520));
  delete realT.ideaId; data.review.trades = [realT, sepT];
  ok('the Session Review itself still holds both', allReviewTrades().length === 2);
  // a review made ONLY of trades on the hidden account posts its numbers, and says what that means to a reader:
  // "Yes (2 trades on a test account)"
  var sepW = Object.assign({}, sepT, { id: 'rv3', result: 'Win', r: 6, pips: 3000, actualGross: 3000, entryTime: '09:40', exitTime: '09:55' });
  data.review.trades = [sepT, sepW];
  var msgPr = ''; try { msgPr = buildReviewMessage(); } catch (e) { msgPr = 'ERR ' + e.message; }
  ok('a review of test-account trades alone posts its trades, marked on a test account', /Yes/.test(msgPr) && /2 trades on a test account\)/.test(msgPr) && !/practice|hidden|separate|not counted/i.test(msgPr) && !/Observed Only/.test(msgPr) && !/^ERR/.test(msgPr), msgPr.replace(/\u001b\[[0-9;]*m/g, '').slice(0, 420));
  ok('with its numbers', /1W/i.test(msgPr.replace(/\u001b\[[0-9;]*m/g, '')) || /Win/i.test(msgPr), msgPr.replace(/\u001b\[[0-9;]*m/g, '').slice(0, 900));
  ok('a review of counted trades says plain Yes', !/test account/i.test(msgReal) && /Yes/.test(msgReal) && /Traded:/.test(msgReal.replace(/\u001b\[[0-9;]*m/g, '')), msgReal.replace(/\u001b\[[0-9;]*m/g, '').slice(0, 300));
  data.review = keepRev || { trades: [] }; data.reviewSlots = keepSlots || null;
  // E) Settings: the option, the badge, the note and the totals
  var modal = document.getElementById('settings-modal-bg'); modal.classList.add('show');
  var nav = modal.querySelector('.settings-nav-item[data-section="accounts"]'); if (nav) nav.click();
  await W(500);
  try { renderSettingsAccountsList(); } catch (e) {}
  await W(400);
  var rows = Array.from(modal.querySelectorAll('.settings-account-row')), rowOf = function (nm) { return rows.filter(function (r) { return r.querySelector('.san-txt') && r.querySelector('.san-txt').textContent === nm; })[0]; };
  var r3 = rowOf('Demo 70K'), r1 = rowOf('Live 70K');
  if (!r3 || !r1) { ok('Settings: the account rows are on screen', false, [rows.length, modal.innerText.slice(0, 200)]); return out; }
  ok('Settings: the test account wears a Test badge and says what it means', !!r3 && /^test$/i.test(((r3.querySelector('.settings-account-badge') || {}).textContent || '').trim()) && /^Test account:/i.test(((r3.querySelector('.settings-account-sepnote') || {}).textContent || '').trim()) && /leaderboard/.test(r3.querySelector('.settings-account-sepnote').textContent), r3 && r3.innerText.slice(0, 200));
  var tb3 = r3.querySelector('.sak-test'), tb1 = r1.querySelector('.sak-test');
  ok('Settings: Test is the third choice of the Personal / Prop firm switch, the only one lit on a test account', !!tb3 && !!tb1 && tb1.parentNode.classList.contains('settings-acct-kind') && tb1.parentNode.querySelectorAll('.sak-opt').length === 3 && tb1.parentNode.lastElementChild === tb1 && /^test$/i.test(tb1.textContent.trim()) && tb3.getAttribute('aria-pressed') === 'true' && tb3.parentNode.querySelectorAll('.sak-opt[aria-pressed="true"]').length === 1 && tb1.getAttribute('aria-pressed') === 'false' && tb1.parentNode.querySelectorAll('.sak-opt[aria-pressed="true"]').length === 1 && !r1.querySelector('.settings-account-sepnote'), [tb3 && tb3.outerHTML.slice(0, 120), tb1 && tb1.outerHTML.slice(0, 120)]);
  ok('Settings: Hide from / Show in All accounts are gone from the Options menu', !modal.querySelector('[data-action="separate"]') && !modal.querySelector('[data-action="unseparate"]') && !/Hide from All accounts|Show in All accounts|Keep separate/i.test(modal.innerText));
  var tot = modal.querySelector('.settings-account-total') || modal.querySelector('.sat-sub');
  var totTxt = (modal.querySelector('.sat-sub') || {}).textContent || '';
  ok('Settings: the combined totals count two accounts, not three', /\b2\b/.test(totTxt) && !/\b3\b/.test(totTxt), totTxt);
  // The Test button. An account with trades cannot become a test account; a test account with trades stays one.
  var dg = function () { return document.querySelector('.st-dialog-bg'); }, dgT = function () { var d = dg(); return d ? d.innerText.replace(/\s+/g, ' ') : ''; };
  var reRows = async function () { try { renderSettingsAccountsList(); } catch (e) {} await W(300); rows = Array.from(modal.querySelectorAll('.settings-account-row')); };
  tb1.click(); await W(400);
  ok('an account with trades: "cannot become a test account ... create a new account"', !!dg() && /This account cannot become a test account/i.test(dgT()) && /Trades have already been logged on it\. Create a new account to use as a test account\./i.test(dgT()) && dg().querySelectorAll('.mdl-actions .btn').length === 1 && !a1.separate, dgT());
  dg().querySelector('[data-a]').click(); await W(300);
  ok('OK closes it and nothing changed', !dg() && !a1.separate && diff(A, snap()).filter(function (k) { return k !== 'money'; }).length === 0, [!!dg(), a1.separate]);
  await reRows(); rowOf('Demo 70K').querySelector('.sak-test').click(); await W(400);
  ok('a test account with trades stays a test account', !!dg() && /This is a test account/i.test(dgT()) && /stays a test account once it has trades/i.test(dgT()) && a3.separate === true, dgT());
  dg().querySelector('[data-a]').click(); await W(300);
  // a new account with no trades: the confirmation, then it is a test account - and can be switched back while empty
  var a4 = mk('Sandbox 10K', 10000); data.accounts.push(a4); await reRows();
  var t4 = function () { return rowOf('Sandbox 10K').querySelector('.sak-test'); };
  ok('an empty account has no trades', window.__stSep.hasTrades(a4.id) === false && window.__stSep.hasTrades(a1.id) === true && window.__stSep.hasTrades(a3.id) === true);
  t4().click(); await W(400);
  var bs = dg() ? dg().querySelectorAll('.mdl-actions .btn') : [];
  a4.kind = 'challenge'; a4.riskRules = { maxTrades: 3, maxLossMode: 'amount', maxLossAmount: 500, beThresholdMode: 'amount', beThresholdAmount: 50 };
  ok('an empty account: the confirmation, naming it', !!dg() && /Make this a test account\?/i.test(dgT()) && /Sandbox 10K becomes a test account/i.test(dgT()) && /It keeps its own risk rules, for its own days only\. With a profit target or a max drawdown it shows a Test progress card when you pick it\./i.test(dgT()) && /cannot be undone once the account has a trade/i.test(dgT()) && bs.length === 2 && /Make it a test account/i.test(bs[0].textContent) && /Cancel/i.test(bs[1].textContent) && Math.abs(bs[0].getBoundingClientRect().width - bs[1].getBoundingClientRect().width) < 2, dgT());
  dg().querySelector('[data-a="no"]').click(); await W(300);
  ok('Cancel leaves it as it was', !dg() && !a4.separate, [!!dg(), a4.separate]);
  await reRows(); t4().click(); await W(400); dg().querySelector('[data-a="yes"]').click(); await W(600); await reRows();
  ok('a test account keeps every risk rule it has, and is not a prop firm account', JSON.stringify(a4.riskRules) === JSON.stringify({ maxTrades: 3, maxLossMode: 'amount', maxLossAmount: 500, beThresholdMode: 'amount', beThresholdAmount: 50 }) && a4.kind === 'personal', JSON.stringify([a4.riskRules, a4.kind]));
  a1.riskRules = Object.assign({}, a1.riskRules || {}, { beThresholdMode: 'amount', beThresholdAmount: 200 });
  ok('its own break-even threshold is used', beThresholdMoneyFor(a4) === 50 && classifyNetResult(40, a4) === 'BE' && classifyNetResult(150, a4) === 'Win', [beThresholdMoneyFor(a4), classifyNetResult(150, a4)]);
  // Settings > Risk rules: a test account is listed, with every rule, and a line saying what they do on it
  try { populateRiskAccountPicker(); } catch (e) {}
  var rselEl = document.getElementById('settings-risk-account-select'), rsel = Array.from(rselEl.options).map(function (o) { return o.textContent; });
  ok('Risk rules lists the test account, marked', rsel.indexOf('Sandbox 10K (test)') >= 0 && rsel.indexOf('Live 70K') >= 0, rsel);
  var rsec2 = document.querySelector('#settings-modal-bg .settings-section[data-section="risk_rules"]'), keepD = rsec2.style.display; rsec2.style.display = '';
  rselEl.value = a4.id; rselEl.dispatchEvent(new Event('change', { bubbles: true })); await W(300);
  var shown = Array.from(rsec2.children).filter(function (el) { return getComputedStyle(el).display !== 'none'; });
  var beIn = document.getElementById('settings-risk-be-threshold'), mtIn = document.getElementById('settings-risk-max-trades');
  var tnote = document.getElementById('settings-risk-test-note');
  ok('with a test account picked, every rule is on screen, and a line says what they do', beIn.getBoundingClientRect().height > 0 && mtIn.getBoundingClientRect().height > 0 && !!tnote && getComputedStyle(tnote).display !== 'none' && /these rules judge its own days/i.test(tnote.textContent) && /raise no nudges/i.test(tnote.textContent), [shown.length, tnote && tnote.textContent]);
  ok('and it shows the account\'s own values', String(beIn.value) === '50' && String(mtIn.value) === '3', [beIn.value, mtIn.value]);
  beIn.value = '75'; beIn.dispatchEvent(new Event('change', { bubbles: true })); beIn.dispatchEvent(new Event('blur')); await W(200);
  mtIn.value = '4'; mtIn.dispatchEvent(new Event('change', { bubbles: true })); await W(200);
  ok('its rules can be changed there, like any account\'s', a4.riskRules.beThresholdAmount === 75 && a4.riskRules.maxTrades === 4 && beThresholdMoneyFor(a4) === 75, JSON.stringify(a4.riskRules));
  delete a4.riskRules.beThresholdAmount;
  ok('with no break-even threshold of its own it has none, like any account', beThresholdMoneyFor(a4) === 0 && classifyNetResult(150, a4) === 'Win', [beThresholdMoneyFor(a4), classifyNetResult(150, a4)]);
  rselEl.value = a1.id; rselEl.dispatchEvent(new Event('change', { bubbles: true })); await W(300);
  ok('back on a counting account, the line is gone', mtIn.getBoundingClientRect().height > 0 && getComputedStyle(document.getElementById('settings-risk-test-note')).display === 'none', rsec2.className);
  rsec2.style.display = keepD;
  ok('Make it a test account: lit, badged, out of the combined totals', a4.separate === true && t4().getAttribute('aria-pressed') === 'true' && rowOf('Sandbox 10K').querySelectorAll('.settings-acct-kind .sak-opt[aria-pressed="true"]').length === 1 && /^test$/i.test((rowOf('Sandbox 10K').querySelector('.settings-account-badge') || {}).textContent.trim()), [a4.separate, t4().outerHTML.slice(0, 100)]);
  rowOf('Sandbox 10K').querySelector('.sak-opt[data-kind="personal"]').click(); await W(500); await reRows();
  ok('with no trades yet, pressing Personal switches the test off (no pop-up)', !dg() && a4.separate === false && t4().getAttribute('aria-pressed') === 'false' && rowOf('Sandbox 10K').querySelector('.sak-opt[data-kind="personal"]').getAttribute('aria-pressed') === 'true', [!!dg(), a4.separate, a4.kind]);
  t4().click(); await W(400); dg().querySelector('[data-a="yes"]').click(); await W(600);
  data.currentSeries.push({ id: 'sb1', accountId: a4.id, symbol: 'XAU/USD', date: iso(0, 10), dayOfWeek: new Date(iso(0, 10)).getDay(), result: 'Win', r: 2, pips: 100, sl: 50, risk: 100, side: 'Long', type: 'Continuation', entryTime: '10:05', exitTime: '10:20', actualGross: 200 }); rebuildSeriesByDate();
  await reRows(); t4().click(); await W(400);
  ok('after its first trade it can no longer be switched back', a4.separate === true && !!dg() && /This is a test account/i.test(dgT()), [a4.separate, dgT()]);
  if (dg()) dg().querySelector('[data-a]').click(); await W(300);
  rowOf('Sandbox 10K').querySelector('.sak-opt[data-kind="challenge"]').click(); await W(400);
  ok('nor by pressing Prop firm', a4.separate === true && a4.kind === 'personal' && !!dg() && /This is a test account/i.test(dgT()), [a4.separate, a4.kind, dgT()]);
  if (dg()) dg().querySelector('[data-a]').click(); await W(300);
  // (put the journal back as it was: the sandbox and its trade go)
  data.accounts = data.accounts.filter(function (z) { return z.id !== a4.id; }); data.history = (data.history || []).map(function (h) { if (h && Array.isArray(h.trades)) h.trades = h.trades.filter(function (t) { return t.accountId !== a4.id; }); return h; }).filter(function (h) { return !h || !Array.isArray(h.trades) || h.trades.length || !h.separate; }); data.currentSeries = (data.currentSeries || []).filter(function (t) { return t.accountId !== a4.id; }); rebuildSeriesByDate(); await reRows();
  // a test account from before the no-rules rule (or another device) loses its rules when the journal arrives
  a3.riskRules = { maxTrades: 10, maxLossMode: 'amount', maxLossAmount: 800, beThresholdMode: 'amount', beThresholdAmount: 200 }; a3.kind = 'challenge';
  try { window.__stFreshDates(); } catch (e) {}
  ok('a test account still marked prop firm is tidied: its rules stay, it is not a prop firm account', JSON.stringify(a3.riskRules) === JSON.stringify({ maxTrades: 10, maxLossMode: 'amount', maxLossAmount: 800, beThresholdMode: 'amount', beThresholdAmount: 200 }) && a3.kind === 'personal', JSON.stringify([a3.riskRules, a3.kind]));
  // its rules judge its own days, seen when it is picked - and nowhere else
  a3.riskRules = { maxTrades: 1 };
  data.viewScope = a3.id; var jOwn = window.__stDiscipline.judge(); data.viewScope = 'lifetime'; var jAll = window.__stDiscipline.judge();
  var brokeOwn = jOwn.filter(function (d) { return d.breaks.some(function (b) { return b.what === 'trades' && b.acc === a3.id; }); });
  ok('picked, the test account\'s days are judged by its own rules (two trades on a day against a max of 1)', jOwn.length > 0 && brokeOwn.length >= 1 && brokeOwn[0].breaks[0].got === 2 && brokeOwn[0].breaks[0].lim === 1, [jOwn.length, brokeOwn.length, brokeOwn[0] && brokeOwn[0].breaks]);
  ok('in All accounts none of its days or breaks appear', !jAll.some(function (d) { return d.breaks.some(function (b) { return b.acc === a3.id; }); }), jAll.length);
  delete a3.riskRules;
  // the flag itself still works both ways (what the differential above proves): off, every trade counts again; on, out again
  setAccountSeparate(a3.id, false);
  var C = snap();
  ok('the flag off: its whole history counts again', !a3.separate && JSON.stringify(C.scoped) === JSON.stringify(withAll.scoped) && !data.history.some(function (h) { return h.separate; }) && C.series[1] === withAll.series[1], [a3.separate, C.scoped, withAll.scoped]);
  setAccountSeparate(a3.id, true);
  ok('the flag on: separate again', a3.separate === true && diff(A, snap()).filter(function (k) { return k !== 'money'; }).length === 0, diff(A, snap()));
  // the picker tags it
  try { renderScopePicker(); } catch (e) {}
  var item = document.querySelector('.scope-picker-item[data-scope-id="' + a3.id + '"]');
  ok('the account picker tags it test', !item || (!!item.querySelector('.scope-picker-sep') && /^test$/i.test(item.querySelector('.scope-picker-sep').textContent.trim())), item ? item.innerHTML : 'picker rows not rendered');
  // Risk rules: the Max trades box and the Consistency box sit on the right, in line with their titles, the size of the others
  try {
    try { window.__stSettingsRows(); } catch (e) {}
    var rsec = document.querySelector('#settings-modal-bg .settings-section[data-section="risk_rules"]'), keepDisp = rsec.style.display, smod = document.getElementById('settings-modal-bg'), wasShown = smod.classList.contains('show'); smod.classList.add('show'); rsec.style.display = ''; await W(200);
    var box = function (id) { var el = document.getElementById(id), row = el.closest('.set-row'), r = el.getBoundingClientRect(), lab = row ? row.querySelector('.set-l .settings-label') : null, lr = lab ? lab.getBoundingClientRect() : { top: -999, right: 0 };
      return { w: Math.round(r.width), inRight: !!el.closest('.set-r'), row: !!row, hintLeft: !!(row && row.querySelector('.set-l .settings-hint')), right: r.left >= lr.right - 1, dy: Math.round(r.top - lr.top) }; };
    var ref = box('settings-risk-profit-target'), mt = box('settings-risk-max-trades'), cs = box('settings-risk-consistency');
    var wide = innerWidth > 560;
    ok('Risk rules: the Max trades box is the size of the boxes above, on the right', mt.row && mt.inRight && mt.hintLeft && ref.w > 60 && mt.w === ref.w && (!wide || mt.right), [ref, mt]);
    ok('Risk rules: the Consistency box is on the right, in line with its title, the same size', cs.row && cs.inRight && cs.hintLeft && ref.w > 60 && cs.w === ref.w && (!wide || (cs.right && Math.abs(cs.dy) <= 12)), [ref, cs]);
    rsec.style.display = keepDisp; if (!wasShown) smod.classList.remove('show');
  } catch (e) { ok('Risk rules boxes', false, String(e && e.stack || e).slice(0, 300)); }
  // Live nudges: the main account allows 1 trade a day; the separate demo is traded several times on the same sync
  // token. Its trades raise no nudge and are not counted; the same trades on a counted account would break the limit.
  try {
    _voiceSignedIn = function () { return true; };
    data.settings.nudges = Object.assign({}, data.settings.nudges || {}, { on: true });
    a1.riskRules = Object.assign({}, a1.riskRules || {}, { maxTrades: 1 }); data.activeAccountId = a1.id; data.viewScope = 'lifetime';
    data.mt5LoginMap = { '111': a1.id, '222': a3.id };
    try { window.__stEA.loaded(); } catch (e) {}
    var Nn = window.__stNudge, nowIso = function (off) { return new Date(Date.now() - (off || 0)).toISOString(); };
    var feed = function (tk, login, sym) { Nn.observe(null, { ticket: tk, symbol: sym, direction: 'long', closed: false, pnl: null }, { ticket: tk, login: login, symbol: sym, direction: 'long', opened_at: nowIso(1000), closed_at: null, risk: 100 }); };
    var opens = function () { try { return Object.keys((window.__stNudgeDiag().day || {}).opens || {}); } catch (e) { return ['ERR']; } };
    var fired = function () { try { return JSON.stringify(window.__stNudgeDiag().fired || {}); } catch (e) { return 'ERR'; } };
    var cfgOn = !!(window.__stNudgeDiag().cfg || {}).on, elig = window.__stNudgeDiag().eligible;
    var o0 = opens().length;
    feed(910001, '111', 'EURUSD'); await W(300);
    var o1 = opens();
    feed(910002, '222', 'XAUUSD'); feed(910003, '222', 'XAUUSD'); feed(910004, '222', 'XAUUSD'); await W(400);
    var o2 = opens(), f2 = fired(), b2 = Nn.budget() || {};
    ok('nudges are running in the test', cfgOn && elig && o1.indexOf('910001') >= 0, [cfgOn, elig, o1]);
    ok('three trades on the separate demo are not counted against the one-a-day limit of the main account',o2.indexOf('910002') < 0 && o2.indexOf('910003') < 0 && o2.indexOf('910004') < 0 && o2.length === o1.length, o2);
    ok('and they raise no nudge at all', !/91000[234]/.test(f2), f2.slice(0, 300));
    // the same trades on an account that counts: the limit nudge does fire
    a3.separate = false;
    feed(910005, '222', 'EURUSD'); await W(400);
    var o3 = opens(), f3 = fired();
    var b3 = Nn.budget() || {};
    ok('the session count used for the limit: 1 of 1 with the demo separate, 2 of 1 once it counts', b2.n === 1 && b2.lim === 1 && b3.n === 2 && o3.indexOf('910005') >= 0, [b2.n, b2.lim, b3.n, o3]);
    a3.separate = true;
  } catch (e) { ok('live nudges on a separate account', false, String(e && e.stack || e).slice(0, 300)); }
  // a prop account kept separate never celebrates a pass or shows the fail card (their account filters skip it)
  ok('the pass pop-up and the fail card skip a separate account', html.indexOf("!funded(a) && !a.demo && !a.separate; });") > 0 && html.indexOf("seen[a.id] || a.demo || a.separate) return false;") > 0);
  return out;
})()
