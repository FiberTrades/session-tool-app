(async function () {
  // "+ A new account" for an MT5 login (Nestor, 23 Oct 2026: "2 FTMO 70K challenges? this is wrong" - his cloud demo's login
  // could only go into his one account, the 70K, so Live Charts named both "FTMO 70K"). It opens the Add form named after the
  // login; pressing Add makes the account and links the login to it.
  // Run: python tests/browser_test.py tests/mt5newacct_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stMt5NewFor && document.getElementById('settings-gear')); i++) await W(100);
    await W(1500);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"]').forEach(function (e) { e.remove(); });
    var D = STCloud.getData(), n0 = (D.accounts || []).length;
    window.__stMt5NewFor('7770001'); await W(500);
    var nm = document.getElementById('settings-account-add-name'), bal = document.getElementById('settings-account-add-balance');
    var sec = document.querySelector('#settings-modal-bg .settings-section[data-section="accounts"]');
    ok('Settings opens on Accounts', sec && sec.style.display !== 'none');
    ok('the Add form is named after the login', nm && nm.value === 'MT5 7770001', nm && nm.value);
    var note = document.getElementById('settings-account-add-link');
    ok('...with a line saying its trades go into the new account', note && /7770001/.test(note.textContent), note && note.textContent);
    nm.value = 'FTMO Trial'; bal.value = '10000';
    document.getElementById('settings-account-add-create').click(); await W(400);
    D = STCloud.getData();
    var acc = (D.accounts || []).filter(function (a) { return a.name === 'FTMO Trial'; })[0];
    ok('pressing Add makes the account', !!acc && D.accounts.length === n0 + 1, (D.accounts || []).map(function (a) { return a.name; }));
    ok('...and links the login to it', acc && (D.mt5LoginMap || {})['7770001'] === acc.id, D.mt5LoginMap);
    ok('the line goes and the next account added links nothing', !document.getElementById('settings-account-add-link') && !window.__stLinkOnAdd);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
