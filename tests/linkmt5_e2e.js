(async function () {
  // Which journal account an MT5 account's trades go into (data.mt5LoginMap). Since 19 Oct 2026 (Nestor: "replace the Link MT5
  // window with a line" and "when a new MT5 account connects and you have 2 or more accounts, the app asks once which account it
  // goes into"): each account in Settings > Accounts shows its MT5 number with "change in Settings → MT5"; Settings → MT5's
  // "Trades go into" sets the link (also for one linked but not seen from an EA yet); a new MT5 account asks once. The point of
  // the link: a demo kept separate is not judged by the main account's rules. (The Link MT5 window of 11 Oct 2026 is gone.)
  // Run: python tests/browser_test.py tests/linkmt5_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  try { Array.prototype.forEach.call(document.querySelectorAll('.st-tour-ov, [class^="st-tour"]'), function (e) { e.remove(); }); } catch (e) {}
  try { stDemoSeed(data); } catch (e) {}
  var mk = function (nm, bal) { var a = newAccountBlank(nm, bal, 'personal'); a.kind = 'personal'; return a; };
  var a1 = mk('FTMO 70K - Challenge', 70000), a3 = mk('FTMO 70K - Demo', 70000);
  a1.riskRules = { maxTrades: 1 }; a3.separate = true;
  data.accounts = [a1, a3]; data.activeAccountId = a1.id; data.viewScope = 'lifetime'; data.linkedGroups = [];
  data.mt5LoginMap = { '541419576': a1.id, '1514906945': a3.id, '999000': 'acc_deleted_long_ago' };
  data._mt5AskSeeded = true; data.mt5Asked = { '541419576': 1, '777888': 1, '1514906945': 1 };   // the question is tested below
  var rows0 = window.__stEA.rows(); Object.keys(rows0).forEach(function (k) { delete rows0[k]; });
  window.__stEA.apply({ login: '777888', symbol: 'XAUUSD', ea_version: '9.06', updated_at: new Date().toISOString(), settings: { unit: 'points' } });
  window.__stEA.apply({ login: '541419576', symbol: 'EURUSD', ea_version: '9.06', updated_at: new Date().toISOString(), settings: { unit: 'pips' } });
  try { window.__stEA.loaded(); } catch (e) {}
  window.currentUser = { id: '00000000-0000-0000-0000-0000000c0de6', email: 'member@example.com' }; window.__stJournalPulled = true;   // the MT5 tab is for a member signed in
  var modal = document.getElementById('settings-modal-bg'); modal.classList.add('show');
  var nav = modal.querySelector('.settings-nav-item[data-section="accounts"]'); if (nav) nav.click();
  await W(500); try { renderSettingsAccountsList(); } catch (e) {} await W(400);
  var rowOf = function (nm) { return Array.from(modal.querySelectorAll('.settings-account-row')).filter(function (r) { return r.querySelector('.san-txt') && r.querySelector('.san-txt').textContent === nm; })[0]; };
  // Since 23 Oct 2026 (the Accounts tab rebuilt): an account's MT5 numbers are chips in its line, and its MT5 part is in it opened
  var line = function (r) { return ((r && r.querySelector('.sacc-chips')) || {}).textContent || ''; };
  var openRow = async function (nm) { var a = data.accounts.filter(function (x) { return x.name === nm; })[0]; window.__stAccOpenId = a && a.id; renderSettingsAccountsList(); await W(200); return rowOf(nm); };
  var r1 = rowOf('FTMO 70K - Challenge'), r3 = rowOf('FTMO 70K - Demo');
  if (!r1 || !r3) { ok('the account rows are on screen', false, modal.innerText.slice(0, 200)); return out; }
  ok('each account shows its MT5 number in its line', /MT5 541419576/.test(line(r1)) && /MT5 1514906945/.test(line(r3)), [line(r1), line(r3)]);
  ok('the Link MT5 window is gone: no Link MT5 account in any Options menu', !modal.querySelector('[data-action="linkmt5"]') && typeof window.__stLinkMt5 === 'undefined');
  data.mt5LoginMap = { '541419576': a1.id, '999000': 'acc_deleted_long_ago' }; renderSettingsAccountsList(); await W(200);
  r3 = await openRow('FTMO 70K - Demo');
  var m3 = r3 && r3.querySelector('[data-slot="mt5"]');
  ok('opened, an account with no MT5 account says so, with Connect MT5', m3 && /No MT5 account linked/.test(m3.textContent) && m3.querySelector('[data-sacc-conn]'), m3 && m3.textContent);
  data.mt5LoginMap['1514906945'] = a3.id;
  m3.querySelector('[data-sacc-conn]').click(); await W(500);
  var sec = document.getElementById('mt5c-body'), cn = document.getElementById('sacc-conn');
  ok('Connect MT5 opens MT5 connections in Accounts', cn && cn.open && cn.contains(sec));
  window.__stMt5c.render(); await W(100);
  var eaLine = function (lg) { return sec.querySelector('[data-mt5c-login="' + lg + '"]'); }, pick = function (lg) { var e = eaLine(lg); return e && e.querySelector('select[data-mt5c-acc]'); };
  ok('Settings → MT5 lists the EA\'s MT5 accounts with where their trades go: 541419576 → the Challenge, 777888 not linked', pick('541419576') && pick('541419576').value === a1.id && pick('777888') && pick('777888').value === '', [pick('541419576') && pick('541419576').value, pick('777888') && pick('777888').value]);
  ok('...and a linked MT5 account no EA has reported yet, so it can be changed there too ("Not seen from your EA yet"); not one linked to a deleted account', pick('1514906945') && pick('1514906945').value === a3.id && /Not seen from your EA yet/.test(eaLine('1514906945').textContent) && !eaLine('999000'), eaLine('1514906945') && eaLine('1514906945').textContent);
  var sel = pick('777888'); sel.value = a3.id; sel.dispatchEvent(new Event('change', { bubbles: true })); await W(200);
  ok('Trades go into links it, and the Accounts line shows it', data.mt5LoginMap['777888'] === a3.id && /777888/.test(line(rowOf('FTMO 70K - Demo'))), [data.mt5LoginMap['777888'], line(rowOf('FTMO 70K - Demo'))]);
  sel = pick('777888'); sel.value = ''; sel.dispatchEvent(new Event('change', { bubbles: true })); await W(200);
  ok('...and Not linked takes it off', !('777888' in data.mt5LoginMap));
  modal.querySelector('.modal-close').click(); await W(300);

  // ---- a new MT5 account asks once ----
  delete data._mt5AskSeeded; delete data.mt5Asked; await W(2000);
  var ask = function () { return document.getElementById('mt5c-ask-bg'); };
  ok('the MT5 accounts known already when this shipped do not ask (marked asked once)', !ask() && data._mt5AskSeeded === true && data.mt5Asked['777888'] && data.mt5Asked['541419576'], data.mt5Asked);
  window.__stEA.apply({ login: '555111', symbol: 'GBPUSD', ea_version: '9.06', updated_at: new Date().toISOString(), settings: { unit: 'pips' } });
  for (var k = 0; k < 20 && !ask(); k++) await W(200);
  var at = ask() ? ask().innerText.replace(/\s+/g, ' ') : '';
  ok('a new MT5 account connects with 2 accounts: it asks which one its trades go into', ask() && /New MT5 account connected/.test(at) && /555111/.test(at) && /GBPUSD/.test(at) && /FTMO 70K - Challenge/.test(at) && /FTMO 70K - Demo/.test(at) && /Decide later/i.test(at) && /Settings → Accounts/.test(at), at.slice(0, 220));
  ask().querySelector('[data-mt5c-ask="' + a3.id + '"]').click(); await W(300);
  ok('picking one links it and closes the question', !ask() && data.mt5LoginMap['555111'] === a3.id && !!data.mt5Asked['555111'], data.mt5LoginMap['555111']);
  await W(2000);
  ok('...once: it does not ask again', !ask());
  window.__stEA.apply({ login: '555222', symbol: 'XAUUSD', ea_version: '9.06', updated_at: new Date().toISOString(), settings: { unit: 'points' } });
  for (k = 0; k < 20 && !ask(); k++) await W(200);
  ask().querySelector('[data-mt5c-ask=""]').click(); await W(300);
  await W(2000);
  ok('Decide later leaves it unlinked and does not ask again', !ask() && !('555222' in data.mt5LoginMap) && !!data.mt5Asked['555222']);
  window.__stEA.apply({ login: '555333', symbol: 'XAUUSD', ea_version: '9.06', updated_at: new Date().toISOString(), settings: { unit: 'points' } });
  data.accounts = [a1]; await W(2200);
  ok('with one account it does not ask (its trades go to that account)', !ask());
  data.accounts = [a1, a3];
  for (k = 0; k < 20 && !ask(); k++) await W(200);
  ok('...and asks once a second account exists', !!ask());
  if (ask()) ask().querySelector('[data-mt5c-ask=""]').click();
  ['555111', '555222', '555333'].forEach(function (lg) { delete data.mt5LoginMap[lg]; Object.keys(rows0).forEach(function (k2) { if (k2.indexOf(lg + '|') === 0) delete rows0[k2]; }); });
  window.currentUser = null;

  // ---- and the point of it: with the demo linked and kept separate, its live trades are not counted ----
  data.mt5LoginMap['1514906945'] = a3.id;
  try {
    _voiceSignedIn = function () { return true; };
    data.settings.nudges = Object.assign({}, data.settings.nudges || {}, { on: true });
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
