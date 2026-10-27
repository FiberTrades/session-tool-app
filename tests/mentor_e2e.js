(async function () {
  // Mentor controls (27 Oct 2026, the Mentorship plan): the mentor sets a member's risk rules and can lock them; a locked rule shows
  // "Set by your mentor" and the member can make it stricter, never looser; the mentor's panel saves through st_mentor_set_rules; the
  // mentor sees Academy progress, never notes; the mentor view never trades. Stand-ins for the share row and the RPC; nothing is sent.
  // Run: python tests/browser_test.py tests/mentor_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stMentorRules && window.__stMentorPanel && window.__stAccFill && document.getElementById('settings-gear')); i++) await W(100);
    await W(1500);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"], .st-greet-pop').forEach(function (e) { e.remove(); });
    var D = STCloud.getData(), A = D.accounts[0];
    A.name = 'FTMO 70K - Challenge'; A.kind = 'challenge'; A.startingBalance = 70000; delete A.mentorAt;
    A.riskRules = { maxRiskMode: 'amount', maxRiskAmount: 900, maxTrades: 3, maxLossMode: 'amount', maxLossAmount: 1200 };
    D.accounts = [A]; D.activeAccountId = A.id; D.mt5LoginMap = { '541419576': A.id };
    window.currentUser = { id: '00000000-0000-0000-0000-0000000000f1', email: 'member@example.com' };
    window.__stJournalPulled = true;
    var MR = { v: 1, at: '2026-10-27T01:00:00.000Z', accounts: {} };
    MR.accounts[A.id] = { rules: { maxRisk: { m: 'amount', v: 500 }, maxTrades: 1, maxLoss: { m: 'amount', v: 900 }, beThreshold: { m: 'amount', v: 200 }, closeElsewhere: true }, lock: { maxRisk: true, maxTrades: true, closeElsewhere: true } };
    var rpcs = [], realSB = window.__stSB;
    window.__stSB = { from: function (t) { var q = { select: function () { return q; }, eq: function () { return q; }, not: function () { return q; }, limit: function () { return Promise.resolve({ data: [{ mentor_rules: MR, mentor_id: 'x' }], error: null }); } }; return q; },
                      rpc: function (n, a) { rpcs.push([n, a]); return Promise.resolve({ data: true, error: null }); } };
    window.__stMentorRules.load(); await W(500);
    var rr = A.riskRules;
    ok('the mentor\'s rules arrive: risk 900 → 500 and 3 trades → 1 (locked), daily drawdown 900 and BE band 200 set', rr.maxRiskAmount === 500 && rr.maxTrades === 1 && rr.maxLossAmount === 900 && rr.beThresholdAmount === 200 && rr.closeElsewhere !== false, JSON.stringify(rr));
    // Settings -> Accounts: the locked rows say so
    window.__stAccOpenId = A.id;
    document.getElementById('settings-gear').click(); await W(700);
    document.querySelector('#settings-modal-bg .settings-nav-item[data-section="accounts"]').click(); await W(600);
    window.renderSettingsAccountsList(); await W(600);
    var it = document.querySelector('#settings-accounts-list .sacc-item.open'), rowOf = function (id) { var e = document.getElementById(id); return e && e.closest('.set-row'); };
    ok('"Set by your mentor" on max risk and max trades, not on the daily drawdown', /Set by your mentor/.test(rowOf('settings-risk-max-trade').textContent) && /Set by your mentor/.test(rowOf('settings-risk-max-trades').textContent) && !/Set by your mentor/.test(rowOf('settings-risk-max-loss').textContent));
    var cb = it.querySelector('[data-ru="closeElsewhere"]');
    ok('close elsewhere: on, held (locked)', cb && cb.checked && cb.disabled && /Set by your mentor/.test(cb.closest('.set-row').textContent));
    ok('the locked unit buttons are held', [].every.call(rowOf('settings-risk-max-trade').querySelectorAll('.settings-risk-mode-btn'), function (b) { return b.disabled; }));
    var set = function (id, v) { var e = document.getElementById(id); e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
    set('settings-risk-max-trade', 1000); for (var k = 0; k < 20 && !/Your mentor set this/.test(rowOf('settings-risk-max-trade').textContent); k++) await W(150);
    ok('looser (1,000): back to the mentor\'s 500, said under it', A.riskRules.maxRiskAmount === 500 && document.getElementById('settings-risk-max-trade').value === '500' && /Your mentor set this/.test(rowOf('settings-risk-max-trade').textContent), [A.riskRules.maxRiskAmount, document.getElementById('settings-risk-max-trade').value]);
    set('settings-risk-max-trade', 300); await W(400);
    ok('stricter (300): kept', A.riskRules.maxRiskAmount === 300);
    set('settings-risk-max-loss', 1500); await W(400);
    window.__stMentorRules.load(); await W(500);
    ok('an unlocked rule is the member\'s to change: 1,500 kept, not set back on the next look', A.riskRules.maxLossAmount === 1500, A.riskRules.maxLossAmount);
    // the mentor's panel (as the mentor view opens it from its yellow bar)
    document.getElementById('settings-modal-bg').classList.remove('show');
    window.__stMentorPanel('00000000-0000-0000-0000-0000000000f1'); await W(600);
    var bg = document.getElementById('mvm-bg'), acc = bg && bg.querySelector('[data-mvm-acc="' + A.id + '"]');
    ok('the mentor\'s panel: each account with its five rules, a lock beside each, prefilled with what was set', acc && acc.querySelectorAll('.mvm-r').length === 5 && acc.querySelector('[data-mvm-v="maxRisk"]').value === '500' && acc.querySelector('[data-mvm-lk="maxRisk"]').checked && !acc.querySelector('[data-mvm-lk="maxLoss"]').checked, acc && acc.textContent.slice(0, 160));
    acc.querySelector('[data-mvm-v="maxTrades"]').value = '2'; acc.querySelector('[data-mvm-lk="maxLoss"]').checked = true;
    bg.querySelector('[data-mvm-save]').click(); await W(400);
    var call = rpcs.filter(function (c) { return c[0] === 'st_mentor_set_rules'; }).pop(), pr = call && call[1].p_rules.accounts[A.id];
    ok('Save: st_mentor_set_rules for that member - 2 trades, the daily drawdown now locked; the button says Saved', call && call[1].p_owner === '00000000-0000-0000-0000-0000000000f1' && pr.rules.maxTrades === 2 && pr.lock.maxLoss === true && pr.lock.maxRisk === true && /^Saved \d\d:\d\d$/.test(bg.querySelector('[data-mvm-save]').textContent), call && JSON.stringify(call[1]).slice(0, 300));
    bg.querySelector('[data-mvm-tab="academy"]').click(); await W(300);
    ok('Academy: lessons passed with their quiz scores, and their notes stay private (none shown)', /\d+ of \d+ lessons passed/.test(bg.textContent) && /Their lesson notes stay private/.test(bg.textContent) && !bg.querySelector('textarea'), bg.textContent.slice(0, 120));
    bg.remove();
    var src = await fetch('/app.html', { cache: 'no-store' }).then(function (r) { return r.text(); });
    ok('the mentor view never sends a command to MT5 (send and acct refuse it)', /function send\(r, a, price, idx\) \{\s*if \(mentor\(\) \|\| gated\(\)\) return/.test(src) && /function acct\(o\) \{\s*if \(mentor\(\) \|\| gated\(\)\) return/.test(src));
    window.__stSB = realSB; window.__stMentorRules._set(null);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
