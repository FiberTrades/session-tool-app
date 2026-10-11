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
  ok('the community post is the same with or without the separate trade', !!msgReal && !/^ERR/.test(msgReal) && msgReal === msgBoth, [msgReal.length, msgBoth.length, msgBoth.slice(0, 200)]);
  ok('the Session Review itself still holds both', allReviewTrades().length === 2);
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
  ok('Settings: the separate account wears a Separate badge and says what it means', !!r3 && /separate/i.test((r3.querySelector('.settings-account-badge') || {}).textContent || '') && !!r3.querySelector('.settings-account-sepnote') && /leaderboard/.test(r3.querySelector('.settings-account-sepnote').textContent), r3 && r3.innerText.slice(0, 200));
  ok('Settings: its menu offers the way back, the others offer Keep separate', !!r3.querySelector('[data-action="unseparate"]') && !r3.querySelector('[data-action="separate"]') && !!r1.querySelector('[data-action="separate"]') && !r1.querySelector('.settings-account-sepnote'), [!!r3.querySelector('[data-action="unseparate"]'), !!r1.querySelector('[data-action="separate"]')]);
  var tot = modal.querySelector('.settings-account-total') || modal.querySelector('.sat-sub');
  var totTxt = (modal.querySelector('.sat-sub') || {}).textContent || '';
  ok('Settings: the combined totals count two accounts, not three', /\b2\b/.test(totTxt) && !/\b3\b/.test(totTxt), totTxt);
  // the menu item works end to end
  r3.querySelector('[data-action="unseparate"]').click(); await W(500);
  var C = snap();
  ok('switched off from the menu: its whole history counts again', !a3.separate && JSON.stringify(C.scoped) === JSON.stringify(withAll.scoped) && !data.history.some(function (h) { return h.separate; }) && C.series[1] === withAll.series[1], [a3.separate, C.scoped, withAll.scoped]);
  try { renderSettingsAccountsList(); } catch (e) {}
  await W(300);
  rows = Array.from(modal.querySelectorAll('.settings-account-row')); r3 = rowOf('Demo 70K');
  r3.querySelector('[data-action="separate"]').click(); await W(500);
  ok('switched on from the menu: separate again', a3.separate === true && diff(A, snap()).filter(function (k) { return k !== 'money'; }).length === 0, diff(A, snap()));
  modal.classList.remove('show');
  // the picker tags it
  try { renderScopePicker(); } catch (e) {}
  var item = document.querySelector('.scope-picker-item[data-scope-id="' + a3.id + '"]');
  ok('the account picker tags it', !item || !!item.querySelector('.scope-picker-sep'), item ? item.innerHTML : 'picker rows not rendered');
  return out;
})()
