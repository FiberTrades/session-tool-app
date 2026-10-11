(async function () {
  // Test progress (11 Oct 2026): a test account with a profit target or a max drawdown gets the Prop Firm Progress card
  // under its own name - "Test progress" - when it is the account picked. A test, not a challenge.
  // Run: python tests/browser_test.py tests/testprogress_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);

  var prop = newAccountBlank('FTMO 70K - Challenge', 70000, 'prop'); prop.kind = 'challenge';
  prop.riskRules = { maxDrawdownMode: 'amount', maxDrawdownAmount: 7000, profitTargetMode: 'amount', profitTargetAmount: 7000 };
  var test = newAccountBlank('Gold sandbox', 10000, 'personal'); test.kind = 'personal'; test.separate = true;
  test.riskRules = { maxDrawdownMode: 'amount', maxDrawdownAmount: 1000, profitTargetMode: 'amount', profitTargetAmount: 1000 };
  data.accounts = [prop, test]; data.activeAccountId = prop.id; data.viewScope = 'lifetime'; data.linkedGroups = []; data.mt5LoginMap = {};
  data.history = []; data.reviewSlots = null; data.review = { trades: [] };
  var today = new Date(), iso = function (dOff, h) { var d = new Date(today); d.setDate(d.getDate() - dOff); d.setHours(h, 5, 0, 0); return d.toISOString(); };
  var tr = function (id, acc, dOff, gross) { return { id: id, accountId: acc.id, symbol: 'XAU/USD', date: iso(dOff, 9), dayOfWeek: new Date(iso(dOff, 9)).getDay(), result: gross < 0 ? 'Lose' : 'Win', r: gross < 0 ? -1 : 2, pips: 100, sl: 50, risk: 200, side: 'Long', type: 'Continuation', entryTime: '09:05', exitTime: '09:25', actualGross: gross }; };
  var load = function (list) { data.history = []; data.currentSeries = list; rebuildSeriesByDate(); };
  var sec = function () { return document.getElementById('challenge-section'); };
  var shown = function () { var s = sec(); return !!s && s.style.display !== 'none'; };
  var txt = function () { return shown() ? sec().innerText.replace(/\s+/g, ' ') : ''; };
  var draw = async function (scope) { data.viewScope = scope; try { document.querySelector('.tab[data-page="trades"]').click(); } catch (e) {} await W(250); try { renderTradesStats(); } catch (e) { ok('renderTradesStats', false, e.message); } await W(250); };

  load([tr('p1', prop, 3, 700), tr('t1', test, 2, 400), tr('t2', test, 1, -100)]);
  // picked: the card is Test progress, about the test account alone
  await draw(test.id);
  var title = (document.getElementById('challenge-title') || {}).textContent || '';
  ok('the test account picked: a Test progress card', shown() && /^Test progress$/i.test(title.trim()) && /Gold sandbox/i.test(txt()) && !/FTMO 70K/i.test(txt()), [shown(), title, txt().slice(0, 200)]);
  ok('it says it is a test, measured on its own target and drawdown', /test account.s own target and drawdown/i.test(txt()) && /A test, not a challenge/i.test(txt()), txt().slice(0, 260));
  ok('with its target bar (300 of 1,000 = 30%) and its room to the floor (1,300)', /30%/.test(txt()) && /1,300/.test(txt()) && /In progress\./i.test(txt()), txt());
  ok('and no challenge review button', !sec().querySelector('.chal-see'));
  // All accounts: the prop firm account's card, without the test account
  await draw('lifetime');
  title = (document.getElementById('challenge-title') || {}).textContent || '';
  ok('All accounts: Prop Firm Progress, and the test account is not on it', shown() && /^Prop Firm Progress$/i.test(title.trim()) && /FTMO 70K/i.test(txt()) && !/Gold sandbox/i.test(txt()), [title, txt().slice(0, 160)]);
  // the target reached, then the floor: worded as a test
  load([tr('p1', prop, 3, 700), tr('t1', test, 2, 400), tr('t3', test, 1, 700)]);
  await draw(test.id);
  ok('target reached: "as a challenge, this test would have passed"', /Target reached . as a challenge, this test would have passed\./i.test(txt()), txt().slice(-260));
  load([tr('p1', prop, 3, 700), tr('t1', test, 2, -600), tr('t4', test, 1, -500)]);
  await draw(test.id);
  ok('floor reached: "this test would have failed on its drawdown rule"', /Floor reached . as a challenge, this test would have failed on its drawdown rule\./i.test(txt()), txt().slice(-260));
  ok('a pass or a fail on a test account is never celebrated or carded', html.indexOf("!funded(a) && !a.demo && !a.separate; });") > 0 && html.indexOf("seen[a.id] || a.demo || a.separate) return false;") > 0);
  // no target and no drawdown: no card
  test.riskRules = { maxTrades: 3 };
  await draw(test.id);
  ok('a test account with neither a target nor a drawdown has no card', !shown(), txt().slice(0, 120));
  // and the "set to Personal" hint never names a test account
  test.riskRules = { maxDrawdownMode: 'amount', maxDrawdownAmount: 1000 }; prop.kind = 'personal'; prop.riskRules = {};
  await draw('lifetime');
  ok('All accounts with no prop firm account: the test account is not offered as "set to Personal"', !shown() || !/Gold sandbox/i.test(txt()), txt().slice(0, 200));
  data.viewScope = 'lifetime';
  return out;
})()
