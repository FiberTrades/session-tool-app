(async function () {
  // Settings -> Accounts rebuilt (Nestor, 23 Oct 2026, the v3 mockup: "build the accounts tab"): one line per account that opens
  // to what MT5 says about it, its stage, its MT5, its firm's rules (filled in from the program) and the member's own (the Risk
  // rules form, moved in), and its payouts (a prop firm account's taken from MT5 by themselves). Risk rules and MT5 are not tabs.
  // Run: python tests/browser_test.py tests/accountstab_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stAccFill && document.getElementById('settings-gear')); i++) await W(100);
    await W(1500);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"]').forEach(function (e) { e.remove(); });
    var D = STCloud.getData(), a1 = D.accounts[0];
    a1.name = 'FTMO 70K - Challenge'; a1.kind = 'challenge'; a1.startingBalance = 70000; delete a1.program; delete a1.payoutSplit; a1.payouts = [];
    a1.riskRules = { maxTrades: 1, maxRiskMode: 'amount', maxRiskAmount: 500 };
    var a2 = { id: 'acc_t_10k', name: 'FTMO 10K - Challenge', status: 'active', kind: 'challenge', startingBalance: 10000, createdAt: new Date().toISOString(), riskRules: { maxTrades: 3 } };
    var a3 = { id: 'acc_t_personal', name: 'IC Markets', status: 'active', kind: 'personal', startingBalance: 5000, createdAt: new Date().toISOString(), riskRules: {} };
    D.accounts = [a1, a2, a3]; D.activeAccountId = a1.id;
    window.currentUser = { id: '00000000-0000-0000-0000-0000000000a5', email: 'member@example.com' };   // signed in: Connect MT5 is the cloud form
    D.mt5LoginMap = { '541419576': a1.id, '1514994373': a2.id };
    var now = new Date().toISOString();
    window.__stEA.apply({ login: '541419576', symbol: 'EURUSD', ea_version: '9.12', updated_at: now, settings: { risk_money: 500, max_trades_day: 1, currency: 'GBP', company: 'FTMO Global Markets Ltd', server: 'FTMO-Server4', start_bal: 70000 } });
    window.__stAccOpenId = undefined;
    document.getElementById('settings-gear').click(); await W(700);
    var nav = document.querySelector('#settings-modal-bg .settings-nav-item[data-section="accounts"]'); nav.click(); await W(700);
    var vis = function (sel) { var e = document.querySelector(sel); return !!(e && getComputedStyle(e).display !== 'none'); };
    ok('the tabs: Profile, Session, Accounts, Subscriptions - Risk rules and MT5 are inside Accounts', !vis('#settings-modal-bg .settings-nav-item[data-section="risk_rules"]') && !vis('#settings-modal-bg .settings-nav-item[data-section="mt5c"]') && vis('#settings-modal-bg .settings-nav-item[data-section="accounts"]'));
    var items = function () { return [].slice.call(document.querySelectorAll('#settings-accounts-list .sacc-item')); };
    var item = function (id) { return document.querySelector('#settings-accounts-list .sacc-item[data-account-id="' + id + '"]'); };
    ok('one line per account, all closed with several accounts', items().length === 3 && !document.querySelector('.sacc-item.open'), items().length);
    var l1 = item(a1.id);
    ok('a line: name, Prop firm, its MT5 number and where it runs, its balance', /FTMO 70K - Challenge/.test(l1.textContent) && /Prop firm/i.test(l1.querySelector('.sacc-chips').textContent) && /MT5 541419576/.test(l1.textContent) && /70,000/.test(l1.querySelector('.sacc-bal').textContent), l1.textContent.replace(/\s+/g, ' '));
    l1.querySelector('.sacc-head').click(); await W(400);
    var it = item(a1.id), body = it && it.querySelector('.sacc-body');
    ok('a click opens it (and only it)', it.classList.contains('open') && !!body && document.querySelectorAll('.sacc-item.open').length === 1);
    ok('Read from MT5: FTMO, FTMO-Server4, started 70,000 GBP (EA 9.12)', /FTMO/.test(body.querySelector('[data-slot="facts"]').textContent) && /FTMO-Server4/.test(body.textContent) && /70,000 GBP/.test(body.textContent), body.querySelector('[data-slot="facts"]').textContent);
    ok('its MT5: where it runs, trading from the app, the copier; no Charts row (24 Oct 2026: Live Charts adds them)', /MT5 541419576/.test(body.querySelector('[data-slot="mt5"]').textContent) && body.querySelector('select[data-mt5c-role="541419576"]') && !body.querySelector('[data-slot="mt5"] .sacc-syms'));
    ok('FTMO and no program yet: the one question, its rules boxes to fill', body.querySelector('.sacc-ask [data-sacc-prog="2step"]') && body.querySelector('[data-rows="firm"] #settings-risk-max-dd'));
    ok('the Risk rules form is in it: this account\'s own rules (Max trades 1)', body.querySelector('[data-rows="own"] #settings-risk-max-trades') && document.getElementById('settings-risk-max-trades').value === '1', document.getElementById('settings-risk-max-trades').value);
    ok('...beside what the EA panel in MT5 is set to', /£500\.00 a trade · 1 trade a day/.test(body.textContent));
    body.querySelector('[data-sacc-prog="2step"]').click(); await W(400);
    var rr = a1.riskRules; it = item(a1.id); body = it.querySelector('.sacc-body');
    ok('2-Step: FTMO\'s rules fill in - 10% max loss from the start, 5% a day, 10% target; your share 80%', rr.maxDrawdownPct === 10 && rr.ddType === 'static' && rr.firmDailyPct === 5 && rr.profitTargetPct === 10 && a1.payoutSplit === 80 && a1.program === '2step', [rr, a1.payoutSplit]);
    ok('...shown as values: floor £63,000, £3,500 a day, target £77,000; the boxes behind Change', /floor £63,000/.test(body.textContent) && /£3,500\.00 a day/.test(body.textContent) && /£77,000/.test(body.textContent) && body.querySelector('[data-rows="firm"]').hidden && body.querySelector('[data-sacc-firmedit]'));
    body.querySelector('[data-sacc-stage="Verification"]').click(); await W(400);
    ok('Verification: the name says so and the target is FTMO\'s 5%', a1.name === 'FTMO 70K - Verification' && a1.riskRules.profitTargetPct === 5, [a1.name, a1.riskRules.profitTargetPct]);
    item(a1.id).querySelector('[data-sacc-stage="Funded"]').click(); await W(400);
    body = item(a1.id).querySelector('.sacc-body');
    ok('Funded: no target, and Payouts lists its own (taken from MT5 by themselves)', a1.name === 'FTMO 70K - Funded' && !(a1.riskRules.profitTargetPct > 0) && /None on a funded account/.test(body.textContent) && body.querySelector('[data-slot="payouts"] .spo-acc'), [a1.name, a1.riskRules.profitTargetPct]);
    // the form follows the opened account
    var mx = document.getElementById('settings-risk-max-trades'); mx.value = '2'; mx.dispatchEvent(new Event('input', { bubbles: true })); mx.dispatchEvent(new Event('change', { bubbles: true })); await W(300);
    ok('a rule typed in the opened account is that account\'s', a1.riskRules.maxTrades === 2 && a2.riskRules.maxTrades === 3, [a1.riskRules.maxTrades, a2.riskRules.maxTrades]);
    item(a2.id).querySelector('.sacc-head').click(); await W(400);
    ok('opening another account moves the form there with its own rules (Max trades 3)', item(a2.id).classList.contains('open') && !item(a1.id).classList.contains('open') && item(a2.id).contains(document.getElementById('settings-risk-max-trades')) && document.getElementById('settings-risk-max-trades').value === '3', document.getElementById('settings-risk-max-trades').value);
    item(a3.id).querySelector('.sacc-head').click(); await W(400);
    var b3 = item(a3.id).querySelector('.sacc-body');
    ok('a personal account: no stage, no payouts, every rule its own; no MT5 says so with Connect MT5', !b3.querySelector('[data-sacc-stage]') && !b3.querySelector('[data-slot="payouts"]').textContent.trim() && /^Rules/i.test(b3.querySelector('[data-slot="rules"] .sacc-sub').textContent.trim()) && b3.querySelector('[data-sacc-cloudfor]'));
    // 24 Oct 2026 (Nestor: "remove it" - no PC guide): Connect MT5 opens the cloud form for THIS account, nothing else
    b3.querySelector('[data-sacc-cloudfor]').click(); await W(400);
    var aw = document.getElementById('sacc-add-wrap'), ah = aw.querySelector('#sacc-addcloud .set-h');
    ok('Connect MT5 opens the cloud form for this account only: "Connect <name>", no add-by-hand fields', !aw.hidden && aw.classList.contains('sacc-forone') && ah && ah.textContent.indexOf(a3.name) >= 0 && !document.getElementById('settings-account-add-name').offsetParent, ah && ah.textContent);
    document.getElementById('sacc-add-open').click(); await W(200);   // Close
    document.getElementById('sacc-add-open').click(); await W(200);   // + Add account: the plain form again
    ok('+ Add account shows the Add form (the cloud one first, then by hand)', !aw.hidden && !aw.classList.contains('sacc-forone') && !!document.getElementById('settings-account-add-name').offsetParent && /Add an account: run it in the cloud/.test(aw.textContent), aw.className);
    document.getElementById('sacc-add-open').click(); await W(150);
    // a link to the old Risk rules tab lands on the account's rules
    window.__stAccOpenId = null; window.renderSettingsAccountsList();
    var sel = document.getElementById('settings-risk-account-select'); if (sel) sel.value = a2.id;
    document.querySelector('#settings-modal-bg .settings-nav-item[data-section="risk_rules"]').click(); await W(400);
    ok('the old Risk rules link opens Accounts on that account, open', nav.classList.contains('active') && item(a2.id) && item(a2.id).classList.contains('open'), window.__stAccOpenId);
    // a prop firm account's withdrawal is a payout, recorded by itself
    if (window.STCloud) {
      var keepPull = window.STCloud.pullBalanceOps, keepH = window.STCloud.handleBalanceOp;
      window.STCloud.pullBalanceOps = function () { return Promise.resolve({ data: [{ deal: 77770001, login: '541419576', amount: -2000, op_time: new Date().toISOString() }] }); };
      window.STCloud.handleBalanceOp = function () {};
      window.__stCheckMt5Withdrawals(); await W(500);
      var po = (a1.payouts || []).filter(function (p) { return String(p.mt5Deal) === '77770001'; })[0];
      var live = false; try { live = isSessionLive(); } catch (e) {}
      ok('a prop firm account\'s MT5 withdrawal: a paid payout, from MT5, no question asked' + (live ? ' (skipped: session live)' : ''), live || (po && po.status === 'paid' && po.source === 'mt5' && po.amount === 2000 && !document.getElementById('po-backdrop')), po);
      window.STCloud.pullBalanceOps = keepPull; window.STCloud.handleBalanceOp = keepH;
    }
    // ---- MT5 in the cloud, merged into Accounts (23 Oct 2026: "why isnt MT5 in the cloud merged with your accounts?"): only for
    //      Nestor for now (cloudOn), so stand-ins here - nothing reaches the server ----
    var M = window.__stMt5c, keep = { on: M.cloudOn, cloud: M.cloud, add: M.cloudAdd, rm: M.cloudRm }, rowsC = [], calls = [];
    M.cloudOn = function () { return true; }; M.cloud = function () { return rowsC; };
    M.cloudAdd = function (lg, sv, pw, app) { calls.push(['add', lg, sv, !!pw, app]); rowsC.push({ id: 'cl-' + lg, login: +lg, server: sv, status: 'starting', status_at: new Date().toISOString(), app_trading: app, symbols: null }); return Promise.resolve({ ok: true, id: 'cl-' + lg }); };
    M.cloudRm = function (id) { calls.push(['rm', id]); rowsC = rowsC.filter(function (r) { return r.id !== id; }); return Promise.resolve(); };
    window.__stAccOpenId = null; window.renderSettingsAccountsList(); await W(200);
    document.getElementById('sacc-add-open').click(); await W(200);
    var ac = document.getElementById('sacc-addcloud');
    ok('Cloud on: + Add account leads with "run it in the cloud" (login, server, password), the hand-made account under it', ac && ac.querySelector('[data-sacc-af="login"]') && ac.querySelector('[data-sacc-af="pw"]') && /Or add one by hand/.test(document.getElementById('sacc-add-wrap').textContent));
    ac.querySelector('[data-sacc-af="login"]').value = '7770002'; ac.querySelector('[data-sacc-af="server"]').value = 'FTMO-Demo'; ac.querySelector('[data-sacc-af="pw"]').value = 'not-a-real-password';
    var ak = ac.querySelector('[data-sacc-af="ack"]'); if (ak) ak.checked = true;   // the prop-firm line, ticked once
    ac.querySelector('[data-sacc-ago]').click(); await W(500);
    var na = (data.accounts || []).filter(function (a) { return (data.mt5LoginMap || {})['7770002'] === a.id; })[0];
    ok('Add and start in the cloud: the server is asked, an account is made and linked to the login, FTMO marks it prop firm, it opens', calls[0] && calls[0][0] === 'add' && calls[0][1] === '7770002' && calls[0][3] === true && na && na.kind === 'challenge' && window.__stAccOpenId === na.id && document.getElementById('sacc-add-wrap').hidden, [calls, na && na.name]);
    ok('...its password field is emptied', !ac.querySelector('[data-sacc-af="pw"]').value);
    window.__stEA.apply({ login: '7770002', symbol: 'EURUSD', ea_version: '9.13', updated_at: new Date().toISOString(), settings: { currency: 'GBP', company: 'FTMO Global Markets Ltd', server: 'FTMO-Demo', start_bal: 10000 } });
    window.__stAccFill(true); await W(300);
    ok('when MT5 reports, its name and starting balance fill themselves in (FTMO 10K - here "(2)", beside the FTMO 10K - Challenge already there)', /^FTMO 10K( \(2\))?$/.test(na.name) && na.startingBalance === 10000 && !na._nameAuto && !na._sbAuto, [na.name, na.startingBalance]);
    ok('...and its line says Cloud', /Cloud/i.test(item(na.id).querySelector('.sacc-chips').textContent), item(na.id).querySelector('.sacc-chips').textContent);
    // a PC account moved to the cloud, then removed
    window.__stAccOpenId = a2.id; window.renderSettingsAccountsList(); await W(250);
    var mvb = item(a2.id).querySelector('[data-sacc-clopen="1514994373"]');
    ok('an account on the PC: Move to the cloud', !!mvb);
    mvb.click(); await W(200);
    var sv = document.querySelector('[data-sacc-clf="server"]'), pw = document.querySelector('[data-sacc-clf="pw"]');
    ok('...opens its form: server, password, trading from the app, and to close MT5 on the PC', sv && pw && /Close MT5 on your PC/.test(item(a2.id).textContent));
    sv.value = 'FTMO-Demo'; pw.value = 'not-a-real-password'; document.querySelector('[data-sacc-clgo="1514994373"]').click(); await W(400);
    ok('...Start it in the cloud asks the server for that login', calls.some(function (c) { return c[0] === 'add' && c[1] === '1514994373' && c[2] === 'FTMO-Demo'; }), calls);
    var rmb = item(a2.id).querySelector('[data-sacc-clrm]');
    ok('a cloud account: Remove from the cloud', !!rmb);
    rmb.click(); await W(150);
    ok('...asks for a second press first', /Press again/.test(item(a2.id).querySelector('[data-sacc-clrm]').textContent) && !calls.some(function (c) { return c[0] === 'rm'; }));
    item(a2.id).querySelector('[data-sacc-clrm]').click(); await W(300);
    ok('...and the second press removes it', calls.some(function (c) { return c[0] === 'rm' && c[1] === 'cl-1514994373'; }), calls);
    ok('MT5 connections becomes "your own MT5 instead"', /Your own MT5 instead/.test(document.getElementById('sacc-conn-t').textContent));
    M.cloudOn = keep.on; M.cloud = keep.cloud; M.cloudAdd = keep.add; M.cloudRm = keep.rm;
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
