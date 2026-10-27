(async function () {
  // Each account in its own currency (27 Oct 2026: OneFunded 10K is USD, the 70K GBP - OneFunded read in £ and "All accounts" added
  // them up to "80k"): an account's currency is what its MT5 EA reports; its card, its Risk rules and every page while it is in view
  // use it; "All accounts" gives a total per currency, never one sum of £ and $. Stand-in EA rows; nothing is sent anywhere.
  // Run: python tests/browser_test.py tests/acccur_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stAccFill && window.__stAccCur && document.getElementById('settings-gear')); i++) await W(100);
    await W(1500);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"], .st-greet-pop').forEach(function (e) { e.remove(); });
    var D = STCloud.getData(), A = D.accounts[0];
    A.name = 'FTMO 70K - Challenge'; A.kind = 'challenge'; A.startingBalance = 70000; A.status = 'active'; delete A.currency;
    A.riskRules = { maxRiskMode: 'amount', maxRiskAmount: 900 };
    var B = { id: 'acc_c_onefunded', name: 'OneFunded 10K', status: 'active', kind: 'challenge', startingBalance: 10000, createdAt: new Date().toISOString(), riskRules: { maxRiskMode: 'amount', maxRiskAmount: 70 } };
    D.accounts = [A, B]; D.activeAccountId = A.id; D.viewScope = A.id; D.settings = D.settings || {}; D.settings.currency = 'GBP';
    D.mt5LoginMap = { '541419576': A.id, '1520099999': B.id };
    window.currentUser = { id: '00000000-0000-0000-0000-0000000000d3', email: 'member@example.com' };
    var now = new Date().toISOString();
    window.__stEA.apply({ login: '541419576', symbol: 'EURUSD', ea_version: '9.15', updated_at: now, settings: { currency: 'GBP', company: 'FTMO Global Markets Ltd', server: 'FTMO-Server4', start_bal: 70000 } });
    window.__stEA.apply({ login: '1520099999', symbol: 'EURUSD', ea_version: '9.15', updated_at: now, settings: { currency: 'USD', company: 'OneFunded Capital Ltd.', server: 'OneFunded-Trade', start_bal: 10000 } });
    window.__stAccOpenId = null;
    document.getElementById('settings-gear').click(); await W(700);
    document.querySelector('#settings-modal-bg .settings-nav-item[data-section="accounts"]').click(); await W(600);
    window.renderSettingsAccountsList(); await W(500); window.renderSettingsAccountsList(); await W(400);
    ok('each account takes the currency its MT5 reports: the 70K GBP, OneFunded USD', A.currency === 'GBP' && B.currency === 'USD', [A.currency, B.currency]);
    var item = function (id) { return document.querySelector('#settings-accounts-list .sacc-item[data-account-id="' + id + '"]'); };
    ok('the lines: the 70K £70,000.00, OneFunded $10,000.00', /£70,000\.00/.test(item(A.id).querySelector('.sacc-bal').textContent) && /\$10,000\.00/.test(item(B.id).querySelector('.sacc-bal').textContent), [item(A.id).querySelector('.sacc-bal').textContent, item(B.id).querySelector('.sacc-bal').textContent]);
    var tot = document.querySelector('#settings-accounts-list .sacc-sum');   // a row per currency since 27 Oct 2026
    var rowOfCur = function (c) { var r = tot && tot.querySelector('.sacc-cur[data-cur="' + c + '"]'); return r ? r.textContent.replace(/\s+/g, ' ') : ''; };
    ok('All accounts: a total per currency, each on its own row - never £80,000', /£70,000\.00/.test(rowOfCur('GBP')) && /\$10,000\.00/.test(rowOfCur('USD')) && !/80,000/.test(tot.textContent), [rowOfCur('GBP'), rowOfCur('USD')]);
    item(B.id).querySelector('.sacc-head').click(); await W(600);
    var bb = item(B.id).querySelector('.sacc-body');
    ok('OneFunded\'s card in $: the starting balance, the Overview\'s balance', /\$10,000\.00/.test(bb.querySelector('[data-sx-row="start"]').textContent) && /Balance\$10,000\.00/.test(bb.querySelector('[data-sx="overview"]').textContent) && !/£/.test(bb.querySelector('[data-sx="overview"]').textContent), bb.querySelector('[data-sx="overview"]').textContent);
    var amtBtn = bb.querySelector('.settings-risk-mode-toggle[data-rule="maxRisk"] .settings-risk-mode-btn[data-mode="amount"]');
    ok('...its Risk rules\' amount button: $', amtBtn && amtBtn.textContent.trim() === '$', amtBtn && amtBtn.textContent);
    item(A.id).querySelector('.sacc-head').click(); await W(600);
    amtBtn = item(A.id).querySelector('.settings-risk-mode-toggle[data-rule="maxRisk"] .settings-risk-mode-btn[data-mode="amount"]');
    ok('the 70K\'s: £', amtBtn && amtBtn.textContent.trim() === '£', amtBtn && amtBtn.textContent);
    D.viewScope = B.id;
    ok('every page while OneFunded is in view: $ (fmtMoney)', /^\$1,234\.00$/.test(fmtMoney(1234, { noSign: true })), fmtMoney(1234, { noSign: true }));
    D.viewScope = A.id;
    ok('...and £ while the 70K is', /^£1,234\.00$/.test(fmtMoney(1234, { noSign: true })));
    D.viewScope = 'lifetime';
    ok('All accounts in view: the chosen currency (£)', /^£/.test(fmtMoney(1, { noSign: true })));
    D.viewScope = A.id;
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
