(async function () {
  // Settings > Accounts > Options > Link MT5 account (11 Oct 2026): tie an MT5 account number to an app account up front.
  // Run: python tests/browser_test.py tests/linkmt5_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  try { stDemoSeed(data); } catch (e) {}
  var mk = function (nm, bal) { var a = newAccountBlank(nm, bal, 'personal'); a.kind = 'personal'; return a; };
  var a1 = mk('FTMO 70K - Challenge', 70000), a3 = mk('FTMO 70K - Demo', 70000);
  a1.riskRules = { maxTrades: 1 }; a3.separate = true;
  data.accounts = [a1, a3]; data.activeAccountId = a1.id; data.viewScope = 'lifetime'; data.linkedGroups = [];
  data.mt5LoginMap = { '541419576': a1.id, '999000': 'acc_deleted_long_ago' };
  var rows0 = window.__stEA.rows(); Object.keys(rows0).forEach(function (k) { delete rows0[k]; });
  window.__stEA.apply({ login: '777888', symbol: 'XAUUSD', updated_at: new Date().toISOString(), settings: { unit: 'points' } });
  window.__stEA.apply({ login: '541419576', symbol: 'EURUSD', updated_at: new Date().toISOString(), settings: { unit: 'pips' } });
  var modal = document.getElementById('settings-modal-bg'); modal.classList.add('show');
  var nav = modal.querySelector('.settings-nav-item[data-section="accounts"]'); if (nav) nav.click();
  await W(500); try { renderSettingsAccountsList(); } catch (e) {} await W(400);
  var rowOf = function (nm) { return Array.from(modal.querySelectorAll('.settings-account-row')).filter(function (r) { return r.querySelector('.san-txt') && r.querySelector('.san-txt').textContent === nm; })[0]; };
  var r1 = rowOf('FTMO 70K - Challenge'), r3 = rowOf('FTMO 70K - Demo');
  if (!r1 || !r3) { ok('the account rows are on screen', false, modal.innerText.slice(0, 200)); return out; }
  ok('a linked account shows its MT5 number; an unlinked one shows none', /MT5 541419576/.test((r1.querySelector('.settings-account-mt5') || {}).textContent || '') && !r3.querySelector('.settings-account-mt5'), [(r1.querySelector('.settings-account-mt5') || {}).textContent]);
  ok('every active account offers Link MT5 account', !!r1.querySelector('[data-action="linkmt5"]') && !!r3.querySelector('[data-action="linkmt5"]'));
  r3.querySelector('[data-action="linkmt5"]').click(); await W(300);
  var dlg = function () { return document.getElementById('st-linkmt5-bg'); }, tx = function () { return dlg().innerText.replace(/\s+/g, ' '); };
  ok('the dialog opens for that account', !!dlg() && /Link MT5 account/.test(tx()) && /FTMO 70K - Demo/.test(tx()), dlg() && tx().slice(0, 200));
  ok('it lists the MT5 account the EA was heard from that nobody holds, and not the one already linked', /777888/.test(tx()) && /XAUUSD/.test(tx()) && !!dlg().querySelector('[data-lk="link"][data-login="777888"]') && !dlg().querySelector('[data-lk="link"][data-login="541419576"]'), tx().slice(0, 300));
  ok('it says which numbers your other accounts hold', /541419576 → FTMO 70K - Challenge/.test(tx()) && !/999000/.test(tx()), tx().slice(-260));
  // a wrong number is refused
  var inp = dlg().querySelector('.lk-input'); inp.value = '15149abc'; dlg().querySelector('[data-lk="type"]').click(); await W(200);
  ok('letters are refused, with a reason', !Object.keys(data.mt5LoginMap).some(function (k) { return data.mt5LoginMap[k] === a3.id; }) && /digits only/.test(dlg().querySelector('.lk-msg').textContent), dlg().querySelector('.lk-msg').textContent);
  // typing the number links it
  inp = dlg().querySelector('.lk-input'); inp.value = ' 1514906945 '; dlg().querySelector('[data-lk="type"]').click(); await W(300);
  ok('typing the number links it', data.mt5LoginMap['1514906945'] === a3.id && !!dlg().querySelector('[data-lk="unlink"][data-login="1514906945"]') && /linked now/i.test(tx()), [data.mt5LoginMap['1514906945'], tx().slice(0, 200)]);
  r3 = rowOf('FTMO 70K - Demo');
  ok('the row now shows it', /MT5 1514906945/.test((r3.querySelector('.settings-account-mt5') || {}).textContent || ''), (r3.querySelector('.settings-account-mt5') || {}).textContent);
  // one click links an account the EA was heard from
  dlg().querySelector('[data-lk="link"][data-login="777888"]').click(); await W(300);
  ok('one click links an MT5 account the EA was heard from', data.mt5LoginMap['777888'] === a3.id && !dlg().querySelector('[data-lk="link"][data-login="777888"]'), data.mt5LoginMap['777888']);
  dlg().querySelector('[data-lk="unlink"][data-login="777888"]').click(); await W(300);
  ok('Unlink takes it off again', !('777888' in data.mt5LoginMap) && !!dlg().querySelector('[data-lk="link"][data-login="777888"]'), Object.keys(data.mt5LoginMap));
  // layout: nothing wider than the dialog, buttons the same width
  var box = dlg().querySelector('.modal').getBoundingClientRect();
  var over = Array.from(dlg().querySelectorAll('.modal *')).filter(function (n) { var q = n.getBoundingClientRect(); return q.width > 0 && (q.right > box.right + 1 || q.left < box.left - 1); }).length;
  var bw = Array.from(dlg().querySelectorAll('.lk-row .settings-btn')).map(function (b) { return Math.round(b.getBoundingClientRect().width); });
  ok('nothing spills out of the dialog and its row buttons are one width', over === 0 && bw.every(function (w) { return w === bw[0]; }), [over, bw]);
  // Done closes; Esc closes
  dlg().querySelector('[data-lk="done"]').click(); await W(200);
  ok('Done closes it', !dlg());
  window.__stLinkMt5(a1.id); await W(200);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(200);
  ok('Esc closes it', !dlg());
  // moving a number: linking the main account's number to the demo moves it
  window.__stLinkMt5(a3.id); await W(200);
  inp = dlg().querySelector('.lk-input'); inp.value = '541419576'; dlg().querySelector('[data-lk="type"]').click(); await W(300);
  ok('linking a number another account holds moves it', data.mt5LoginMap['541419576'] === a3.id, data.mt5LoginMap['541419576']);
  data.mt5LoginMap['541419576'] = a1.id; dlg().querySelector('[data-lk="done"]').click(); await W(200);
  // and the point of it: with the demo linked and kept separate, its live trades are not counted
  try {
    _voiceSignedIn = function () { return true; };
    data.settings.nudges = Object.assign({}, data.settings.nudges || {}, { on: true });
    try { window.__stEA.loaded(); } catch (e) {}
    var Nn = window.__stNudge, iso = function () { return new Date(Date.now() - 1000).toISOString(); };
    var feed = function (tk, login, sym) { Nn.observe(null, { ticket: tk, symbol: sym, direction: 'long', closed: false, pnl: null }, { ticket: tk, login: login, symbol: sym, direction: 'long', opened_at: iso(), closed_at: null, risk: 100 }); };
    feed(920001, '541419576', 'EURUSD'); await W(250);
    feed(920002, '1514906945', 'XAUUSD'); feed(920003, '1514906945', 'XAUUSD'); await W(350);
    var b = Nn.budget() || {};
    ok('one EUR trade on the main account and two gold trades on the linked demo: 1 of 1, not 3', b.n === 1 && b.lim === 1, [b.n, b.lim]);
  } catch (e) { ok('live trades from the linked demo', false, String(e).slice(0, 200)); }
  modal.classList.remove('show');
  return out;
})()
