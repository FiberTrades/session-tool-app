(async function () {
  // Two accounts, each card edits its own (27 Oct 2026, a live bug: Nestor added OneFunded 10K and edited ITS risk rules; they went
  // into the 70K's, and the 70K's EA got the daily loss lock at 140). A redraw - a rename here - re-pointed the Risk rules picker at
  // the view scope's account while OneFunded's card was open. Now every control in an opened card edits that card's account, its
  // order rules go only to its own MT5 login, and its Overview's Today counts only its own trades. Stand-ins for the EAs; nothing is
  // sent anywhere.
  // Run: python tests/browser_test.py tests/acctwo_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stAccFill && window.__stRules && window.__stNudge && document.getElementById('settings-gear')); i++) await W(100);
    await W(1500);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"], .st-greet-pop').forEach(function (e) { e.remove(); });
    var D = STCloud.getData(), A = D.accounts[0];
    A.name = 'FTMO 70K - Challenge'; A.kind = 'challenge'; A.startingBalance = 70000; A.status = 'active'; delete A.ruleBreak;
    A.riskRules = { maxRiskMode: 'amount', maxRiskAmount: 900, maxLossMode: 'amount', maxLossAmount: 900, maxTrades: 1, beThresholdMode: 'amount', beThresholdAmount: 200, profitTargetMode: 'pct', profitTargetPct: 10 };
    var B = { id: 'acc_t_onefunded', name: 'OneFunded 10K', status: 'active', kind: 'challenge', startingBalance: 10000, createdAt: new Date().toISOString(), riskRules: { maxRiskMode: 'amount', maxLossMode: 'amount' } };
    D.accounts = [A, B]; D.activeAccountId = A.id; D.viewScope = A.id;
    D.mt5LoginMap = { '541419576': A.id, '1520099999': B.id };
    window.currentUser = { id: '00000000-0000-0000-0000-0000000000d2', email: 'member@example.com' };
    var snapA = JSON.stringify(A.riskRules);
    // stand-in EAs on both logins, and the command path
    var sent = [], realAcct = window.__stTM.acct, realLL = window.__stLiveLine;
    window.__stLiveLine = Object.assign({}, realLL, { joined: function () { return true; }, easL: function () { return { 'EURUSD|541419576': { v: '9.15', tm: true, at: Date.now() }, 'EURUSD|1520099999': { v: '9.15', tm: true, at: Date.now() } }; } });
    window.__stTM.acct = function (o) { sent.push(o); return Promise.resolve({ ok: true }); };
    // OneFunded opened in Settings -> Accounts
    window.__stAccOpenId = B.id;
    document.getElementById('settings-gear').click(); await W(700);
    document.querySelector('#settings-modal-bg .settings-nav-item[data-section="accounts"]').click(); await W(600);
    window.renderSettingsAccountsList(); await W(500);
    var item = function (id) { return document.querySelector('#settings-accounts-list .sacc-item[data-account-id="' + id + '"]'); };
    ok('OneFunded\'s card is open with the Risk rules form in it', item(B.id) && item(B.id).classList.contains('open') && item(B.id).contains(document.getElementById('settings-risk-max-trade')));
    // the path that broke it: a redraw (a rename runs every scope-aware surface, the Risk rules picker among them)
    var pen = item(B.id).querySelector('[data-sx-edit="name"]'); pen.click(); await W(150);
    var box = document.querySelector('#settings-accounts-list .sx-in'); box.value = 'OneFunded 10K - Challenge';
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await W(500);
    ok('renamed, its card still open with the form in it', B.name === 'OneFunded 10K - Challenge' && item(B.id).classList.contains('open') && item(B.id).contains(document.getElementById('settings-risk-max-trade')), B.name);
    ok('the form shows OneFunded\'s rules (empty), not the 70K\'s 900', document.getElementById('settings-risk-max-trade').value === '' && document.getElementById('settings-risk-max-loss').value === '', [document.getElementById('settings-risk-max-trade').value, document.getElementById('settings-risk-max-loss').value]);
    ok('...and the picker says so', window.__stRiskFormAcc() === B.id && document.getElementById('settings-risk-account-select').value === B.id, document.getElementById('settings-risk-account-select').value);
    var set = function (id, v) { var e = document.getElementById(id); e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); e.dispatchEvent(new Event('blur')); };
    set('settings-risk-max-trade', 70); await W(200);
    set('settings-risk-max-loss', 140); await W(200);
    set('settings-risk-max-trades', 2); await W(200);
    ok('typed into OneFunded\'s card: OneFunded\'s rules (risk 70, daily loss 140, 2 trades)', B.riskRules.maxRiskAmount === 70 && B.riskRules.maxLossAmount === 140 && B.riskRules.maxTrades === 2, B.riskRules);
    ok('the 70K\'s rules untouched', JSON.stringify(A.riskRules) === snapA, A.riskRules);
    // the order rules: each EA gets its own account's
    window.__stRules._push(); await W(400);   // (the 3-second loop may have sent it already)
    var toB = sent.filter(function (o) { return o.a === 'rules' && o.login === '1520099999'; }), toA = sent.filter(function (o) { return o.a === 'rules' && o.login === '541419576'; });
    ok('OneFunded\'s EA gets OneFunded\'s daily loss lock (dl=140)', toB.length && /(^|;)dl=140(;|$)/.test(toB[toB.length - 1].cp), toB.map(function (o) { return o.cp; }));
    ok('the 70K\'s EA never gets 140 - only its own 900', toA.every(function (o) { return /(^|;)dl=900(;|$)/.test(o.cp) && !/dl=140/.test(o.cp); }), toA.map(function (o) { return o.cp; }));
    // another redraw, the 70K opened: its own values, and typing there changes only the 70K
    item(A.id).querySelector('.sacc-head').click(); await W(500);
    ok('the 70K opened: the form shows the 70K\'s 900', document.getElementById('settings-risk-max-trade').value === '900' && item(A.id).contains(document.getElementById('settings-risk-max-trade')));
    set('settings-risk-max-trades', 1); await W(200);
    ok('...OneFunded keeps its 2 trades', B.riskRules.maxTrades === 2 && A.riskRules.maxTrades === 1);
    // Overview "Today": each account's own closes
    var d0 = new Date(), today = d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0') + '-' + String(d0.getDate()).padStart(2, '0');
    try { localStorage.setItem('st_nudge_day', JSON.stringify({ day: today, opens: {}, closes: { '178267078': { at: Date.now() - 60000, res: 'Win', pnl: 2357.56, lg: '541419576' } } })); } catch (e) {}
    var nA = window.__stNudge.netToday(A), nB = window.__stNudge.netToday(B);
    ok('today\'s +2,357.56 close on the 70K\'s login: the 70K\'s, not OneFunded\'s', Math.abs(nA - 2357.56) < 0.01 && nB === 0, [nA, nB]);
    window.__stAccOpenId = B.id; window.renderSettingsAccountsList(); await W(500);
    var ovB = item(B.id).querySelector('[data-sx="overview"]').textContent;
    ok('OneFunded\'s Overview does not show the 70K\'s +2,357.56', !/2,357\.56/.test(ovB), ovB);
    try { localStorage.removeItem('st_nudge_day'); } catch (e) {}
    window.__stTM.acct = realAcct; window.__stLiveLine = realLL;
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
