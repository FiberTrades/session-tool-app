(async function () {
  // Settings rows (12 Oct 2026): in Profile, Session and Risk rules every setting is one row - name and explanation
  // on the left, control on the right, a line above. Trade alerts and Time off were the two blocks left out: Trade
  // alerts ran across the whole width, Time off had no line above it and its date pickers sat against the next row.
  // Run: python tests/browser_test.py tests/settingsrows_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(3000);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; } * { transition: none !important; animation: none !important; }'; document.head.appendChild(css);
  var keepOff = JSON.stringify(data.timeOff || null);
  document.getElementById('settings-gear').click(); await W(900);
  var bg = document.getElementById('settings-modal-bg');
  ok('Settings opens', bg.classList.contains('show'), bg.className);
  var nav = document.querySelector('.settings-nav-item[data-section="session"]'); nav.click(); await W(500);

  // ---- nothing is left outside a row in the three sections that use rows ----
  var loose = function (k) { var s2 = document.querySelector('#settings-modal-bg .settings-section[data-section="' + k + '"]'); if (!s2) return ['section missing'];
    // an introduction above the first setting is meant to stay as plain text; anything after the first row must be a row
    var kids = [].slice.call(s2.children), first = kids.findIndex(function (el) { return el.classList.contains('set-row'); });
    return kids.slice(first < 0 ? 0 : first).filter(function (el) { return !el.classList.contains('set-row') && !el.classList.contains('set-block') && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE' && getComputedStyle(el).display !== 'none'; })
      .map(function (el) { return (el.id || el.className || el.tagName) + ': ' + el.textContent.trim().slice(0, 40); }); };
  ok('Session: every setting is a row', loose('session').length === 0, loose('session'));
  ok('Profile and Risk rules too', loose('profile').length === 0 && loose('risk_rules').length === 0, [loose('profile'), loose('risk_rules')]);

  // ---- Trade alerts: a row like Live nudges, not a strip across the whole width ----
  var tr = document.getElementById('settings-nudges-trades').closest('.set-row'), ln = document.getElementById('settings-nudges-on').closest('.set-row');
  ok('Trade alerts is a normal row', !!tr && !tr.classList.contains('set-row-solo'), tr && tr.className);
  ok('its name on the left, with both explanations', !!tr && /^Trade alerts$/.test(tr.querySelector('.set-l .settings-label').textContent.trim()) && tr.querySelectorAll('.set-l .settings-hint').length === 2, tr && tr.querySelector('.set-l').textContent.slice(0, 60));
  ok('its switch on the right, saying what it does', !!tr && !!tr.querySelector('.set-r #settings-nudges-trades') && /alert me about my trades/i.test(tr.querySelector('.set-r .tk-switch-label').textContent), tr && tr.querySelector('.set-r').textContent.trim());
  var w = function (el) { return Math.round(el.getBoundingClientRect().width); };
  if (innerWidth > 700) ok('laid out exactly like Live nudges', w(tr.querySelector('.set-l')) === w(ln.querySelector('.set-l')) && w(tr.querySelector('.set-r')) === w(ln.querySelector('.set-r')) && w(tr.querySelector('.set-l')) < w(tr) * 0.6, [w(tr.querySelector('.set-l')), w(ln.querySelector('.set-l')), w(tr)]);
  // the switch still works
  var cb = document.getElementById('settings-nudges-trades'), was = cb.checked;
  cb.click(); await W(200);
  ok('the switch still saves', ((data.settings.nudges || {}).trades !== false) === !was, [(data.settings.nudges || {}).trades, was]);
  cb.click(); await W(200);

  // ---- Time off: a row with a line above, the dates on the right ----
  var host = document.getElementById('settings-timeoff'), row = host.closest('.set-row');
  ok('Time off is a row', !!row && !!row.querySelector('.set-r #settings-timeoff'), row && row.className);
  ok('with a line separating it from the setting above', !!row && parseFloat(getComputedStyle(row).borderTopWidth) >= 1 && parseFloat(getComputedStyle(row).paddingBottom) >= 12, row && [getComputedStyle(row).borderTopWidth, getComputedStyle(row).paddingBottom]);
  ok('its name and explanation on the left, once', !!row && /^Time off$/.test(row.querySelector('.set-l .settings-label').textContent.trim()) && /Away for a while/.test(row.querySelector('.set-l .settings-hint').textContent) && !/Away for a while|Time off/i.test(host.textContent.replace(/add time off/i, '')), host.textContent.trim().slice(0, 80));
  var from = host.querySelector('[data-to-from]'), to = host.querySelector('[data-to-to]'), add = host.querySelector('[data-to-add]');
  ok('the date pickers and the button are there', !!from && !!to && !!add, [!!from, !!to, !!add]);
  // adding a holiday still works, and the editor stays without its own title afterwards
  var d = new Date(); d.setDate(d.getDate() + 20); var k1 = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  d.setDate(d.getDate() + 3); var k2 = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  from.value = k1; from.dispatchEvent(new Event('change', { bubbles: true })); to.value = k2; to.dispatchEvent(new Event('change', { bubbles: true }));
  add.click(); await W(400);
  var host2 = document.getElementById('settings-timeoff');
  ok('adding time off still works', (data.timeOff || []).some(function (r) { return r.from === k1 && r.to === k2; }) && !!host2.querySelector('[data-to-rm]'), data.timeOff);
  ok('and the row keeps its one title', host2.closest('.set-row') === row && !/Away for a while/.test(host2.textContent), host2.textContent.trim().slice(0, 60));
  // the weekly review has no row around the editor: there it still draws its own title and hint
  var free = document.createElement('div'); free.setAttribute('data-timeoff-host', ''); document.body.appendChild(free);
  try { renderTimeOff(free); } catch (e) {}
  ok('in the weekly review the editor still shows its own title and hint', /Time off/i.test(free.textContent) && /Away for a while/.test(free.textContent), free.textContent.trim().slice(0, 60));
  free.remove();

  // ---- the other tabs in the same look (19 Oct 2026: "yes build the settings but also do the setting that are unique to admin only") ----
  var secOf = function (k) { return bg.querySelector('.settings-section[data-section="' + k + '"]'); };
  var showTab = async function (k) { var nb = bg.querySelector('.settings-nav-item[data-section="' + k + '"]'); if (nb) { nb.style.display = ''; nb.click(); } await W(500); return secOf(k); };
  var acc = await showTab('accounts');
  ok('Accounts: three cards under their headings - your accounts, add an account, payouts', acc && acc.querySelectorAll(':scope > .set-card').length === 3 && acc.querySelectorAll(':scope > .set-h').length === 3
    && !!acc.querySelector('.sacc-card #settings-accounts-list') && !!acc.querySelector('.spo-card #settings-payouts-list'), acc && acc.querySelectorAll(':scope > *').length);
  var addRows = acc.querySelectorAll('.set-card .set-row'), addIds = ['settings-account-add-name', 'settings-account-add-balance', 'settings-account-add-current', 'settings-account-add-create'];
  ok('...adding an account is a row each: name, starting balance, balance now, Add - each control on the right', addIds.every(function (id) { var e = document.getElementById(id); return e && e.closest('.set-r') && e.closest('.set-card'); }), addRows.length);
  var tallest = Array.prototype.reduce.call(bg.querySelectorAll('.set-card input, .set-card textarea'), function (m, e) { return e.offsetParent ? Math.max(m, e.getBoundingClientRect().height) : m; }, 0);
  ok('...no input is drawn taller than a line (a column flex basis once made them 230 px tall)', tallest > 0 && tallest < 60, tallest);
  var acRow = acc.querySelector('.sacc-card .settings-account-row');
  ok('...an account is a row in the card: no box of its own, a line above it', acRow && getComputedStyle(acRow).borderLeftWidth === '0px' && getComputedStyle(acRow).backgroundColor === 'rgba(0, 0, 0, 0)', acRow && [getComputedStyle(acRow).borderLeftWidth, getComputedStyle(acRow).backgroundColor]);
  var svc = await showTab('services');
  var sRows = svc.querySelectorAll('.set-card > .set-row');
  ok('Subscriptions: one card, a row each (plan, referral when there is one, community, EA, indicator), the badge on the right',
    sRows.length === 5 && !!svc.querySelector('#svc-premium-badge').closest('.set-r') && !!svc.querySelector('#svc-ref-card.set-row') && !svc.querySelector('.svc-card'), sRows.length);
  var men = secOf('mentor');
  ok('Mentor access: the member\'s share row and Stop sharing row, the mentor\'s Connect row and members card', men && !!men.querySelector('#stc-a-mentor .set-card #stc-m-stoprow') && !!men.querySelector('#stc-mv .set-card #stc-mv-code') && !!men.querySelector('#stc-mv .set-card #stc-mv-list'), !!men);
  var biz = secOf('business');
  ok('Business (admin): App takings and Give user full access are cards of rows under headings', biz && !!biz.querySelector('#svc-takings-admin > .set-card #access-takings') && !!biz.querySelector('#svc-vip-admin .set-row #vip-gen-label') && !!biz.querySelector('#svc-vip-admin .set-row #vip-gen-days') && !biz.querySelector('.svc-card'), !!biz);
  var aim = secOf('aimeter');
  ok('AI Meter (admin): credit and search as rows, the usage in a card under its heading', aim && !!aim.querySelector('.set-row #aimeter-budget') && !!aim.querySelector('.set-row #aimeter-search') && !!aim.querySelector('.set-card #aimeter-table') && !!aim.querySelector('#aimeter-usage-h'), !!aim);
  // every new word in both languages (t() gives the key back when one is missing)
  var keys = ['settings.your_accounts', 'settings.add_account_h', 'settings.add_name_label', 'settings.add_start_label', 'settings.add_start_hint', 'settings.add_now_label', 'settings.add_now_hint', 'settings.add_hint'];
  var miss = [];
  var txt = function (k) { var e = document.querySelector('[data-i18n="' + k + '"]'); return e ? e.textContent.trim() : null; }, en = {};
  try { window.setLanguage('en'); await W(200); keys.forEach(function (k) { en[k] = txt(k); if (!en[k] || en[k] === k) miss.push('en:' + k); });
    window.setLanguage('es'); await W(200); keys.forEach(function (k) { var v = txt(k); if (!v || v === k || v === en[k]) miss.push('es:' + k + '=' + v); });
    window.setLanguage('en'); await W(200); } catch (e) { miss.push(String(e)); }
  ok('the new rows\' words are in English and Spanish', !miss.length, miss);

  // put things back
  try { data.timeOff = JSON.parse(keepOff) || []; if (typeof saveData === 'function') saveData(); } catch (e) {}
  try { document.getElementById('settings-modal-close').click(); } catch (e) {}
  return out;
})()
