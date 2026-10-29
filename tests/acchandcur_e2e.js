(async function () {
  // A currency for an account added by hand (29 Oct 2026, Nestor: "yes please"): the opened account's Currency row - a drop-down with no
  // MT5 linked, "From MT5: GBP" once one is - and the add form's currency beside the starting balance, defaulting to the member's
  // most-used one. Stand-in EA rows; nothing is sent anywhere.
  // Run: python tests/browser_test.py tests/acchandcur_e2e.js        (phone: E2E_MOBILE=375x812 in front)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stAccChips && window.__stAccCur && document.getElementById('settings-gear')); i++) await W(100);
    await W(1500);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"], .st-greet-pop { display: none !important; }'; document.head.appendChild(css);
    window.__stPlan = function () { return { loaded: true, paid: true }; };   // a paid member: more than one account
    var mk = function (name, sb, cur) { var a = newAccountBlank(name, sb, 'personal'); a.kind = 'personal'; a.status = 'active'; if (cur) a.currency = cur; return a; };
    var A = mk('FTMO 70K', 70000), B = mk('Manual 10K', 10000), C = mk('Manual 5K', 5000, 'USD'), Dd = mk('Manual 2K', 2000, 'USD'), E = mk('Manual 1K', 1000, 'USD');
    data.accounts = [A, B, C, Dd, E]; data.activeAccountId = A.id; data.viewScope = 'lifetime'; data.linkedGroups = [];
    data.mt5LoginMap = { '541419576': A.id }; data.settings = data.settings || {}; data.settings.currency = 'GBP';
    window.__stEA.apply({ login: '541419576', symbol: 'EURUSD', ea_version: '9.16', updated_at: new Date().toISOString(), settings: { currency: 'GBP', company: 'FTMO Global Markets Ltd', server: 'FTMO-Server4', start_bal: 70000 } });
    window.__stAccOpenId = B.id;
    document.getElementById('settings-gear').click(); await W(700);
    document.querySelector('#settings-modal-bg .settings-nav-item[data-section="accounts"]').click(); await W(600);
    window.renderSettingsAccountsList(); await W(600);
    var wrap = document.getElementById('settings-accounts-list'), it = function () { return wrap.querySelector('.sacc-item.open'); };
    var curRow = function () { var r = [].filter.call(it().querySelectorAll('[data-sx="account"] .set-row'), function (x) { return /^(Currency|Moneda)$/.test((x.querySelector('.settings-label') || {}).textContent || ''); })[0]; return r || null; };
    var sel = it().querySelector('select[data-sacc-cur]');
    ok('an account with no MT5: a Currency row with a drop-down, set to the member\'s currency (GBP)', curRow() && sel && sel.value === 'GBP' && [].map.call(sel.options, function (o) { return o.value; }).join(',') === 'GBP,USD,EUR,AUD,CAD,CHF,JPY', sel && [sel.value, [].map.call(sel.options, function (o) { return o.textContent; })]);
    var nextRow = (curRow().closest('.sacc-slot') || curRow()).nextElementSibling;
    ok('...just above Starting balance, in the page\'s font', nextRow && /Starting balance/.test(nextRow.textContent) && /Inter/.test(getComputedStyle(sel).fontFamily), [nextRow && nextRow.textContent.slice(0, 40), getComputedStyle(sel).fontFamily]);
    sel.value = 'EUR'; sel.dispatchEvent(new Event('change', { bubbles: true })); await W(500);
    var lineB = wrap.querySelector('.sacc-item[data-account-id="' + B.id + '"] .sacc-bal');
    ok('EUR picked: kept on the account, its line in €', B.currency === 'EUR' && /€10,000\.00/.test(lineB.textContent), [B.currency, lineB.textContent]);
    ok('...All accounts gets a EUR row, never adding it to £ or $', wrap.querySelector('.sacc-cur[data-cur="EUR"]') && /€10,000\.00/.test(wrap.querySelector('.sacc-cur[data-cur="EUR"]').textContent), [].map.call(wrap.querySelectorAll('.sacc-cur'), function (r) { return r.textContent; }));
    window.__stAccOpenId = A.id; window.renderSettingsAccountsList(); await W(600);
    ok('an account with MT5: "From MT5: GBP", no drop-down', curRow() && /From MT5: GBP/.test(curRow().textContent) && !it().querySelector('select[data-sacc-cur]'), curRow() && curRow().textContent);
    // the add form
    window.__stAccOpenId = null; window.renderSettingsAccountsList(); await W(400);
    document.getElementById('sacc-add-open').click(); await W(400);
    var cs = document.getElementById('settings-account-add-cur');
    ok('add by hand: its currency beside the starting balance, defaulting to the most-used one (USD: 3 of 5)', cs && cs.value === 'USD' && cs.closest('.sacc-addbal') && cs.closest('.sacc-addbal').querySelector('#settings-account-add-balance'), cs && cs.value);
    document.getElementById('settings-account-add-name').value = 'Swiss 3K'; document.getElementById('settings-account-add-balance').value = '3000'; cs.value = 'CHF';
    document.getElementById('settings-account-add-create').click(); await W(700);
    var nw = (data.accounts || []).filter(function (a) { return a && a.name === 'Swiss 3K'; })[0];
    var lineN = nw && wrap.querySelector('.sacc-item[data-account-id="' + nw.id + '"] .sacc-bal');
    ok('...added in CHF: kept, its line "CHF 3,000.00"', nw && nw.currency === 'CHF' && lineN && /CHF\s?3,000\.00/.test(lineN.textContent), [nw && nw.currency, lineN && lineN.textContent]);
    // Spanish
    var lang0 = document.documentElement.lang; document.documentElement.lang = 'es'; window.__stAccOpenId = B.id; window.renderSettingsAccountsList(); await W(500);   // window._stT reads <html lang>
    ok('in Spanish: "Moneda"', curRow() && /Moneda/.test(curRow().textContent), curRow() && curRow().textContent.slice(0, 80));
    document.documentElement.lang = lang0; window.renderSettingsAccountsList(); await W(300);
    if (window.innerWidth <= 420) {
      var mb = document.querySelector('#settings-modal-bg .modal') || document.querySelector('#settings-modal-bg > div');
      ok('phone: nothing wider than the screen', document.documentElement.scrollWidth <= window.innerWidth + 1 && (!mb || mb.scrollWidth <= mb.clientWidth + 1), [document.documentElement.scrollWidth, mb && mb.scrollWidth, mb && mb.clientWidth]);
      var ab = document.querySelector('.sacc-addbal'), abR = ab && ab.getBoundingClientRect(), csR = document.getElementById('settings-account-add-cur').getBoundingClientRect();
      ok('phone: the starting balance and its currency side by side, inside the card', ab && csR.right <= abR.right + 1 && Math.abs(csR.top - document.getElementById('settings-account-add-balance').getBoundingClientRect().top) < 2, [abR && abR.right, csR.right]);
    }
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
