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
    // a mentor's view: nothing written, nothing looked up, however the list gets drawn
    window.__MV = true; var M2 = mk('MT5 9', 'Mentor Only Capital Ltd', 'MentorOnly-Live', { _rulesAuto: true }); var seen = (window.__stFirmTest.learned || []).length; window.renderSettingsAccountsList(); await W(800);
    ok('mentor view: no search, and the account is left as it was', (window.__stFirmTest.learned || []).length === seen && M2.kind === 'personal' && !!M2._rulesAuto, [window.__stFirmTest.learned, M2.kind]); window.__MV = false;
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
