// End-to-end test (Nestor, 5 Nov 2026: a new account's firm rules filled in for the member; a firm never seen before looked up once and remembered).
// The rows are a stand-in (window.__stFirmTest): nothing reads or writes the real table.
// Run: python tests/browser_test.py tests/firm_rules_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 100 && typeof newAccountBlank !== 'function'; i++) await W(100);
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
    var rows = [
      { id: 1, firm: 'FTMO', program: '2step', plan: '', is_default: true, trust: 'firm', source_url: 'https://ftmo.com/x', checked_at: '2026-11-05', rules: { target: { Challenge: 10, Verification: 5, Funded: null }, daily: 5, dd: 10, ddType: 'static', cons: null, split: 80 } },
      { id: 2, firm: 'FTMO', program: '1step', plan: '', is_default: false, trust: 'firm', source_url: 'https://ftmo.com/y', checked_at: '2026-11-05', rules: { target: { Challenge: 10, Funded: null }, daily: 3, dd: 10, ddType: 'trailing', cons: 50, split: 80 } },
      { id: 3, firm: 'OneFunded', program: '2step', plan: 'Core', trust: 'firm', source_url: 'https://help.onefunded.com/', checked_at: '2026-11-05', rules: { target: { Challenge: 8, Verification: 5, Funded: null }, daily: 5, dd: 10, ddType: 'static', cons: { Funded: 50 }, split: 80, bySize: { 100000: { cons: { Challenge: 50, Verification: 50, Funded: 30 } } } } },
      { id: 4, firm: 'OneFunded', program: '2step', plan: 'Value', trust: 'firm', source_url: 'https://help.onefunded.com/', checked_at: '2026-11-05', rules: { target: { Challenge: 8, Verification: 6, Funded: null }, daily: 4, dd: 8, ddType: 'static', cons: { Funded: 50 }, split: 80 } },
      { id: 5, firm: 'TTT', program: '2step', plan: 'Standard', trust: 'found', source_url: 'https://x.test/ttt', checked_at: '2026-11-05', rules: { target: { Challenge: 8, Verification: 5, Funded: null }, daily: null, dd: 8, ddType: null, cons: null, split: null } },
      { id: 6, firm: 'Tradeify', program: 'instant', plan: 'Direct', trust: 'found', source_url: 'javascript:alert(1)', checked_at: '2026-11-05', rules: { target: { Funded: null }, daily: 0, dd: 6, ddType: 'trailing_lock', cons: 20, split: 80 } }];
    window.__stFirmTest = { rows: rows, looks: { FTMO: { firm: 'FTMO', is_prop: true, status: 'ok' }, OneFunded: { firm: 'OneFunded', is_prop: true, status: 'ok' }, TTT: { firm: 'TTT', is_prop: true, status: 'ok' }, Tradeify: { firm: 'Tradeify', is_prop: true, status: 'ok' }, Pepperstone: { firm: 'Pepperstone', is_prop: false, status: 'ok' } } };
    var FRA = window.__stFirmRules; ok('the firms\' rules are reachable', !!FRA); await FRA.load();
    var mk = function (name, company, server, extra) { var a = newAccountBlank(name, 10000, 'personal'); a.kind = 'personal'; var lg = String(90000 + data.accounts.length); data.mt5LoginMap[lg] = a.id; a._lg = lg; Object.assign(a, extra || {}); data.accounts.push(a); window.__stEA.apply({ login: lg, symbol: 'EURUSD', ea_version: '9.23', updated_at: new Date().toISOString(), settings: { company: company, server: server, currency: 'USD' } }); return a; };
    data.accounts = []; data.mt5LoginMap = {}; data.linkedGroups = []; data.activeAccountId = null;
    var A = mk('MT5 1', 'FTMO Global Markets Ltd', 'FTMO-Server4', { _rulesAuto: true, riskRules: { maxLossMode: 'amount', maxLossAmount: 800 } }), B = mk('MT5 2', 'OneFunded Capital Ltd.', 'OneFunded-Trade', { _rulesAuto: true, program: '2step' }), C = mk('MT5 3', 'TTT Markets Ltd.', 'TTTMarkets-Ltd', { _rulesAuto: true, program: '2step' }), D2 = mk('MT5 4', 'Tradeify Ventures Limited', 'TradeifyVenturesFX-Server', { _rulesAuto: true }),
      E = mk('MT5 5', 'Pepperstone Group Limited', 'Pepperstone-Demo', { _rulesAuto: true }), F = mk('MT5 6', 'Brand New Capital Ltd', 'BrandNew-Live', { _rulesAuto: true }), G = mk('MT5 7', 'OneFunded Capital Ltd.', 'OneFunded-Trade', { program: '2step', firmPlan: 'Core' }), H = mk('MT5 8', 'FTMO Global Markets Ltd', 'FTMO-Server4', {});
    A.startingBalance = 70000; G.riskRules = Object.assign({}, G.riskRules, { maxDrawdownPct: 7, firmDailyPct: 2 }); H.riskRules = Object.assign({}, H.riskRules, { maxDrawdownPct: 6 });
    
    FRA.auto();
    // Type and rules, by itself
    ok('a new FTMO account: Prop firm, and FTMO\'s 2-Step rules (its usual program) filled in', A.kind === 'challenge' && A.riskRules.maxDrawdownPct === 10 && A.riskRules.firmDailyPct === 5 && A.riskRules.ddType === 'static' && A.riskRules.profitTargetPct === 10 && !A._rulesAuto, [A.kind, A.riskRules]);
    ok('OneFunded has two 2-Step plans: Prop firm, nothing guessed, it asks', B.kind === 'challenge' && (B.riskRules || {}).firmDailyPct !== 4 && !FRA.of(B), [B.kind, (B.riskRules || {}).firmDailyPct]);
    B.firmPlan = 'Value'; var pv = FRA.of(B); ok('its plan picked: that plan\'s rules', pv && pv.daily === 4 && pv.dd === 8 && pv.target.Verification === 6, pv);
    B.firmPlan = 'Core'; B.startingBalance = 100000; var pb = FRA.of(B); ok('a size with its own rule: $100K Core\'s consistency', pb && pb.cons.Funded === 30, pb && pb.cons); B.startingBalance = 10000; var ps = FRA.of(B); ok('...and under that size the usual one', ps && ps.cons.Funded === 50, ps && ps.cons);
    ok('TTT, a rule it doesn\'t know: the maximum loss filled, the daily limit left as it was', C.kind === 'challenge' && C.riskRules.maxDrawdownPct === 8 && C.riskRules.firmDailyPct == null, [C.riskRules.maxDrawdownPct, C.riskRules.firmDailyPct]);
    ok('Tradeify: its only program picked, no daily limit at that firm, trailing with lock', D2.kind === 'challenge' && FRA.keyOf(D2) === 'instant' && D2.riskRules.firmDailyPct == null && D2.riskRules.maxDrawdownPct === 6 && D2.riskRules.ddType === 'trailing_lock', [FRA.keyOf(D2), D2.riskRules]);
    ok('a known broker stays Personal, its rules untouched', E.kind === 'personal' && !E._rulesAuto && (E.riskRules || {}).firmDailyPct == null, [E.kind, E._rulesAuto]);
    // a new firm
    ok('a firm never seen: looked up, once', (window.__stFirmTest.learned || []).filter(function (x) { return x === 'Brand'; }).length === 1 && !!F._rulesAuto, window.__stFirmTest.learned);
    FRA.auto(); ok('...and not searched for again on the next look', window.__stFirmTest.learned.filter(function (x) { return x === 'Brand'; }).length === 1, window.__stFirmTest.learned);
    window.__stFirmTest.rows = rows.concat([{ id: 7, firm: 'Brand', program: '1step', plan: '', trust: 'found', source_url: 'https://x.test/b', checked_at: '2026-11-05', rules: { target: { Challenge: 9, Funded: null }, daily: 4, dd: 7, ddType: 'static', cons: null, split: 75 } }]); window.__stFirmTest.looks.Brand = { firm: 'Brand', is_prop: true, status: 'ok' }; await FRA.load(); FRA.auto();
    ok('...its rules back: the account waiting for them takes them', F.kind === 'challenge' && F.riskRules.maxDrawdownPct === 7 && F.riskRules.firmDailyPct === 4 && F.riskRules.profitTargetPct === 9 && !F._rulesAuto, [F.kind, F.riskRules]);
    // nobody's own numbers
    ok('an account already there is never changed by itself', G.riskRules.maxDrawdownPct === 7 && G.riskRules.firmDailyPct === 2 && H.riskRules.maxDrawdownPct === 6 && H.kind === 'personal', [G.riskRules.maxDrawdownPct, H.kind]);
    ok('the member\'s own daily stop is not touched', A.riskRules.maxLossAmount === 800 && A.riskRules.maxLossMode === 'amount');
    // what the member reads
    var srcOf = function (a) { var f = FRA.src(a); return f; };
    var sa = srcOf(A), sc = srcOf(C), sd = srcOf(D2);
    ok('confirmed rules say so, with the date', /FTMO.*own pages.*5 Nov/.test(sa) && !/not confirmed/.test(sa), sa);
    ok('found rules say they aren\'t confirmed, and what it couldn\'t find', /not confirmed by TTT/.test(sc) && /daily limit/.test(sc) && /Risk rules/.test(sc), sc);
    ok('a source that isn\'t a web page isn\'t a link', !/javascript:/.test(sd) && !/<a /.test(sd), sd);
    // pressing a plan fills that plan's rules and says where they came from
    delete B.firmPlan; delete B.riskRules; document.getElementById('settings-gear').click(); await W(500); document.querySelector('.settings-nav-item[data-section="accounts"]').click(); await W(500); window.__stAccOpenId = B.id; window.renderSettingsAccountsList(); await W(900);
    var itemB = function () { return document.querySelector('#settings-accounts-list .sacc-item[data-account-id="' + B.id + '"]'); }, pl = itemB().querySelectorAll('[data-sacc-plan]');
    ok('a firm with two plans asks which, with a button each', pl.length === 2 && pl[0].getBoundingClientRect().height >= 28, pl.length);
    pl[1].click(); await W(500); var fromB = itemB().querySelector('.sacc-rulesfrom');
    ok('pressing a plan: its rules in, and the source line under it', B.firmPlan === 'Value' && B.riskRules.maxDrawdownPct === 8 && B.riskRules.firmDailyPct === 4 && !!fromB && /OneFunded/.test(fromB.textContent), [B.firmPlan, B.riskRules, fromB && fromB.textContent]);
    // exact: the share per withdrawal, and a daily limit measured from the day's high (Nestor, 5 Nov 2026: "can you make it exact?")
    window.__stFirmTest.rows = window.__stFirmTest.rows.concat([{ id: 20, firm: 'Exact', program: '1step', plan: 'Standard', trust: 'firm', source_url: 'https://exact.test/r', checked_at: '2026-11-05', rules: { target: { Challenge: 10, Funded: null }, daily: 4, dailyType: 'trailing', dd: 8, ddType: 'trailing', cons: null, split: 80, splits: [50, 70, 80] } }, { id: 21, firm: 'Exact', program: '1step', plan: 'Lite', trust: 'firm', source_url: 'https://exact.test/l', checked_at: '2026-11-05', rules: { target: { Challenge: 5, Funded: null }, daily: 3, dd: 5, ddType: 'trailing', cons: null, split: 90 } }]);
    await FRA.load();
    var X = mk('MT5 20', 'Exact Capital Ltd', 'Exact-Live', { _rulesAuto: true, firmPlan: 'Standard', program: '1step' }); X.kind = 'challenge'; X.startingBalance = 10000; FRA.auto();
    ok('the firm\'s rules fill in: from the day\'s high, and the share per withdrawal', X.riskRules.firmDailyType === 'trailing' && X.riskRules.firmDailyPct === 4 && (X.payoutSplits || []).join() === '50,70,80' && X.payoutSplit === 80, [X.riskRules.firmDailyType, X.payoutSplits]);
    var P5 = window.__stPayouts, payout = function (id, day) { return { id: id, amount: 1000, status: 'paid', requestedOn: day, paidOn: day }; };
    X.payouts = [payout('c', '2026-03-01'), payout('a', '2026-01-01'), payout('d', '2026-04-01'), payout('b', '2026-02-01')];
    var got = ['a', 'b', 'c', 'd'].map(function (i) { return P5.received(X, X.payouts.filter(function (q) { return q.id === i; })[0]); });
    ok('each payout gets its own share, by date, the last one holding after that', got.join() === '500,700,800,800', got);
    X.payouts[0].received = 123; ok('a figure typed for a payout still wins', P5.received(X, X.payouts[0]) === 123, P5.received(X, X.payouts[0]));
    X.payouts = [payout('a', '2026-01-01')]; ok('the next payout\'s share', window.__stPayoutShare(X, null) === 70, window.__stPayoutShare(X, null));
    X.payouts = [];
    var day = '2026-06-01', tr = function (hh, pnl) { return { id: 'x' + hh + pnl, date: day + 'T' + hh + ':00:00', actualGross: pnl, result: pnl > 0 ? 'Win' : 'Lose', costs: 0, accountId: X.id, symbol: 'EURUSD' }; };
    var up = [tr('08', 300), tr('09', -350), tr('10', -100)];
    var v1 = window.__stPropStatus(X, up);
    ok('from the day\'s high: +300 then −450 is 450 off the high, past a 400 limit, on a day only −150', v1 && v1.status === 'failed' && v1.failure && v1.failure.rule === 'firmDailyLoss' && v1.failure.fromDayHigh === 450 && v1.failure.dayResult === -150, v1 && [v1.status, v1.failure && v1.failure.fromDayHigh, v1.failure && v1.failure.dayResult]);
    delete X.riskRules.firmDailyType;
    var v2 = window.__stPropStatus(X, up);
    ok('from the day\'s start, the same day is fine', v2 && v2.status !== 'failed', v2 && v2.status);
    X.riskRules.firmDailyType = 'trailing';
    // the member's own changes
    X.riskRules.firmDailyPct = 5; X.riskRules.maxDrawdownPct = 10; X.payoutSplit = 90; delete X.payoutSplits;
    var sx = FRA.src(X); ok('what they changed is named, with the way back', /You changed/.test(sx) && /daily limit/.test(sx) && /maximum loss/.test(sx) && /your share/.test(sx) && /data-sacc-fr-reset/.test(sx), sx);
    window.__stAccOpenId = X.id; window.renderSettingsAccountsList(); await W(1200);
    var itemX = function () { return document.querySelector('#settings-accounts-list .sacc-item[data-account-id="' + X.id + '"]'); };
    var fnd = itemX().querySelector('[data-sacc-stage="Funded"]');
    ok('the stage has a button', !!fnd); if (fnd) { fnd.click(); await W(1200); }
    ok('another stage: their own figures stay', X.riskRules.firmDailyPct === 5 && X.riskRules.maxDrawdownPct === 10 && X.payoutSplit === 90 && !X.payoutSplits && X.riskRules.firmDailyType === 'trailing', [X.riskRules.firmDailyPct, X.riskRules.maxDrawdownPct, X.payoutSplit]);
    ok('...and the target is that stage\'s', X.riskRules.profitTargetPct == null, X.riskRules.profitTargetPct);
    ok('...and it still says they changed them', /You changed/.test(FRA.src(X)), FRA.src(X));
    var rb = itemX().querySelector('[data-sacc-fr-reset]');
    ok('the button is there, and in sans', !!rb && !/Fraunces/.test(getComputedStyle(rb).fontFamily), rb && getComputedStyle(rb).fontFamily);
    if (rb) { rb.click(); await W(1200); }
    ok('pressing it: the firm\'s rules, share per withdrawal too, nothing marked as theirs', X.riskRules.firmDailyPct === 4 && X.riskRules.maxDrawdownPct === 8 && (X.payoutSplits || []).join() === '50,70,80' && !/You changed/.test(FRA.src(X)), [X.riskRules.firmDailyPct, X.riskRules.maxDrawdownPct, X.payoutSplits]);
    X.riskRules.firmDailyPct = 5; var lb = itemX().querySelector('[data-sacc-plan="Lite"]'); ok('another plan has a button', !!lb); if (lb) { lb.click(); await W(1200); }
    ok('another plan is another set of rules: that plan\'s figures, and no day\'s high or steps it doesn\'t have', X.riskRules.firmDailyPct === 3 && X.riskRules.maxDrawdownPct === 5 && !X.riskRules.firmDailyType && !X.payoutSplits && X.payoutSplit === 90, [X.riskRules.firmDailyPct, X.riskRules.firmDailyType, X.payoutSplits, X.payoutSplit]);
    // the control is reachable from the account's own rules
    var sel = document.getElementById('settings-risk-firm-daily-type');
    ok('the firm daily limit has a measured-from choice, in its own row', !!sel && !!sel.closest('.set-row'), sel && !!sel.closest('.set-row'));
    // an account set before this has no record: pressing a stage behaves as it did
    var Y = mk('MT5 21', 'Exact Capital Ltd', 'Exact-Live', { firmPlan: 'Standard', program: '1step', riskRules: { firmDailyPct: 2 } }); Y.kind = 'challenge'; ok('no record, nothing named as theirs', !/You changed/.test(FRA.src(Y)), FRA.src(Y));
    // the day's high today, and what the account's tile says from it
    var Z = mk('MT5 22', 'Exact Capital Ltd', 'Exact-Live', { firmPlan: 'Standard', program: '1step', _rulesAuto: true }); Z.kind = 'challenge'; Z.startingBalance = 10000; FRA.auto();
    var nowIso = new Date().toISOString(), todayT = function (pnl) { return { id: 'z' + pnl, date: nowIso, actualGross: pnl, result: pnl > 0 ? 'Win' : 'Lose', costs: 0, accountId: Z.id, symbol: 'EURUSD' }; };
    var vz = window.__stPropStatus(Z, [todayT(300), todayT(-100)]);
    ok('the verdict reports today\'s high, and how the limit is measured', vz && vz.rules.firmDayHigh === 300 && vz.rules.firmDailyType === 'trailing' && vz.rules.firmDailyLossLimit === 400, vz && vz.rules);
    var ps0 = window.__stPropStatus, today0 = window.__stRules.today;
    window.__stPropStatus = function (a, smp) { return a === Z ? vz : ps0(a, smp); }; window.__stRules.today = function (a) { return a === Z ? 200 : today0(a); };
    window.__stAccOpenId = Z.id; window.renderSettingsAccountsList(); await W(1200);
    var tiles = document.querySelector('#settings-accounts-list .sacc-item[data-account-id="' + Z.id + '"] .sx-tiles'), tt = tiles ? tiles.textContent : '';
    ok('the tile counts down from the high: +300 then +200 leaves 300 of 400', /Daily loss left/.test(tt) && /300\.00/.test(tt) && /from the day.s high/.test(tt), tt);
    window.__stPropStatus = ps0; window.__stRules.today = today0;
    // Business: a change made by itself, with its way back
    var rowsB = window.__stFirmTest.rows; window.__stFirmTest.rows = rowsB.concat([{ id: 30, firm: 'Exact', program: '2step', plan: 'Auto', trust: 'firm', source_url: 'https://exact.test/a', checked_at: '2026-11-05', changed_at: '2026-11-05T10:00:00Z', previous: { target: { Challenge: 8 }, daily: 5, dd: 10, ddType: 'static', split: 80 }, rules: { target: { Challenge: 8 }, daily: 4, dailyType: 'trailing', dd: 8, ddType: 'static', split: 80, splits: [50, 80] } }]);
    var calls = [], cu0 = window.currentUser, sb0 = window.__stSB; window.currentUser = Object.assign({}, cu0 || {}, { email: 'be.o2@hotmail.com' });
    window.__stSB = Object.create(sb0 || null, { rpc: { value: function () { return Promise.resolve({ data: {} }); } }, functions: { value: { invoke: function (n, o) { calls.push(o.body); return Promise.resolve({ data: { ok: true } }); } } } });
    var nav = document.getElementById('settings-nav-business'); nav.style.display = ''; nav.click(); await W(1500);
    var ub = document.querySelector('#biz-firmrules [data-frr="undo"]'), bt = (document.querySelector('#biz-firmrules') || {}).textContent || '';
    ok('Business says a row changed by itself, and what it was', !!ub && /Changed by itself 5 Nov/.test(bt) && /daily 5%/.test(bt), bt.slice(0, 200));
    ok('Business shows the share per withdrawal and the day\'s high', /50 \/ 80%/.test(bt) && /from high/.test(bt), bt.slice(0, 200));
    if (ub) { ub.click(); await W(300); } ok('Undo asks the server to put it back', calls.length === 1 && calls[0].op === 'review' && calls[0].action === 'undo' && calls[0].id === 30, calls);
    window.currentUser = cu0; window.__stSB = sb0; window.__stFirmTest.rows = rowsB; document.querySelector('.settings-nav-item[data-section="accounts"]').click(); await W(500);
    // what the EA is told (9.24): only an account measured from the day's high gets dlh; moved back to the day's start, it stays until tomorrow like any loosened rule
    var Q = mk('MT5 23', 'Exact Capital Ltd', 'Exact-Live', { firmPlan: 'Standard', program: '1step', _rulesAuto: true }); Q.kind = 'challenge'; Q.startingBalance = 10000; FRA.auto();
    var qs = window.__stRules.state(Q); ok('the EA is told the limit from the day\'s high', /(^|;)dl=400(;|$)/.test(qs.sent) && /(^|;)dlh=400(;|$)/.test(qs.sent), qs.sent);
    var Q2 = mk('MT5 24', 'Exact Capital Ltd', 'Exact-Live', { firmPlan: 'Lite', program: '1step', _rulesAuto: true }); Q2.kind = 'challenge'; Q2.startingBalance = 10000; FRA.auto();
    var q2s = window.__stRules.state(Q2); ok('an account measured from the day\'s start isn\'t', /(^|;)dl=300(;|$)/.test(q2s.sent) && !/dlh=/.test(q2s.sent), q2s.sent);
    delete Q.riskRules.firmDailyType; var qs3 = window.__stRules.state(Q); ok('moved back to the day\'s start: today it stays, from tomorrow it goes', /dlh=400/.test(qs3.sent) && qs3.pending.dlh === 0, [qs3.sent, qs3.pending]);
    // a mentor's view: nothing written, nothing looked up, however the list gets drawn
    window.__MV = true; var M2 = mk('MT5 9', 'Mentor Only Capital Ltd', 'MentorOnly-Live', { _rulesAuto: true }); var seen = (window.__stFirmTest.learned || []).length; window.renderSettingsAccountsList(); await W(800);
    ok('mentor view: no search, and the account is left as it was', (window.__stFirmTest.learned || []).length === seen && M2.kind === 'personal' && !!M2._rulesAuto, [window.__stFirmTest.learned, M2.kind]); window.__MV = false;
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
