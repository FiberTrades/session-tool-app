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
    ok('its MT5: where it runs, trading from the app, the copier, its charts', /MT5 541419576/.test(body.querySelector('[data-slot="mt5"]').textContent) && body.querySelector('select[data-mt5c-role="541419576"]') && /EURUSD/.test(body.querySelector('[data-slot="mt5"]').textContent));
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
    ok('a personal account: no stage, no payouts, every rule its own; no MT5 says so with Connect MT5', !b3.querySelector('[data-sacc-stage]') && !b3.querySelector('[data-slot="payouts"]').textContent.trim() && /^Rules/i.test(b3.querySelector('[data-slot="rules"] .sacc-sub').textContent.trim()) && b3.querySelector('[data-sacc-conn]'));
    b3.querySelector('[data-sacc-conn]').click(); await W(400);
    ok('Connect MT5 opens MT5 connections', document.getElementById('sacc-conn').open);
    document.getElementById('sacc-add-open').click(); await W(200);
    ok('+ Add account shows the Add form', !document.getElementById('sacc-add-wrap').hidden && !!document.getElementById('settings-account-add-name').offsetParent);
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
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
