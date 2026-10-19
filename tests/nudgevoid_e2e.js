(async function () {
  // Nudges set aside (19 Oct 2026: Nestor's gold test trades on a demo were judged by his main account's rules, and a stop re-anchor
  // read as a stop moved - "i didnt break any rules today"): a nudge log entry marked void is kept but counted nowhere (the
  // Statistics nudges block, the day's list, the reviews). And an MT5 login linked to none of the member's accounts, while others
  // are linked, counts as kept separate: no discipline nudges for its trades.
  // Run: python tests/browser_test.py tests/nudgevoid_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stNudge && typeof data !== "undefined" && data); i++) await W(100);
    await W(800);
    var d = data, day = '2026-10-19';
    d.nudgeLog = d.nudgeLog || {};
    d.nudgeLog[day] = {
      'outside:991000001': { at: '10:01', rule: 'outside', text: 'Your session is 08:00–10:00. This trade is outside it.' },
      'widen:991000001': { at: '10:01', rule: 'widen', text: 'Your risk on this trade grew.', void: true, voidWhy: 'test' },
      'limit:991000002': { at: '18:43', rule: 'limit', text: 'This is trade 2 today. Your limit is 1.', void: true },
      'reentry:991000003': { at: '11:00', rule: 'reentry', text: 'Back in 2 minutes after a loss.' }
    };
    var ps = window.__stNudge.periodStats(day, day), dl = window.__stNudge.dayList ? window.__stNudge.dayList(day) : null;
    ok('void entries count nowhere: 2 of the 4 are counted (outside, reentry), widen and limit set aside', ps.total === 2 && !ps.kinds.k_widen && !ps.kinds.k_limit && ps.kinds.k_plan === 1, ps.kinds);
    ok('...and the day\'s list shows only the two', !dl || (dl.length === 2 && dl.every(function (x) { return x.rule === 'outside' || x.rule === 'reentry'; })), dl && dl.map(function (x) { return x.rule; }));
    ok('...the void entries are still in the log (set aside, not deleted)', d.nudgeLog[day]['widen:991000001'] && d.nudgeLog[day]['limit:991000002'].void === true);
    // a login linked to no account, while others are linked: kept separate
    var sep = window.__stNudge._isSepLogin;
    if (sep) {
      var m0 = d.mt5LoginMap; d.mt5LoginMap = { '541419576': (d.accounts && d.accounts[0] && d.accounts[0].id) || 'acc-x' };
      ok('a login linked to none of the accounts (others linked) counts as kept separate; a linked one does not', sep('1514994373') === true && sep('541419576') === false, [sep('1514994373'), sep('541419576')]);
      d.mt5LoginMap = {};
      ok('...with no login linked at all, nothing is separate (the old rule: the active account\'s)', sep('1514994373') === false);
      d.mt5LoginMap = m0;
    } else ok('isSepLogin is reachable for the test', false);
    delete d.nudgeLog[day];
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
