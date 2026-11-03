// End-to-end test (Nestor, 3 Nov 2026: a member's 5K and 25K cloud accounts showed $10,000, +100% and -60%).
// Run: python tests/browser_test.py tests/accbase_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 100 && typeof newAccountBlank !== 'function'; i++) await W(100);
    var mk = function (nm, sb, bas) { var a = newAccountBlank(nm, sb, 'prop'); a.kind = 'challenge'; if (bas != null) a.balanceAtSetup = bas; return a; };
    var stat = function (a) { var st = window.__stAccountStats(a); return [Math.round(st.current * 100) / 100, Math.round(st.pct * 100) / 100]; };
    data.currentSeries = []; data.history = []; data.review = { trades: [] }; rebuildSeriesByDate();

    // what a journal holds today: the two caught, one with a real "Balance now", a real 10K
    var J = { settings: {}, accounts: [mk('OneFunded 5K', 5000, 10000), mk('TTT 25K', 25000, 10000), mk('FTMO Demo', 10000, 9980.19), mk('Real 10K', 10000, 10000)], activeAccountId: null };
    J.activeAccountId = J.accounts[0].id;
    migrate(J);
    var by = function (n) { return J.accounts.filter(function (a) { return a.name === n; })[0]; };
    ok('caught 5K: $5,000 and 0%', stat(by('OneFunded 5K')).join() === '5000,0', stat(by('OneFunded 5K')));
    ok('caught 25K: $25,000 and 0%', stat(by('TTT 25K')).join() === '25000,0', stat(by('TTT 25K')));
    ok('a real "Balance now" is left alone', by('FTMO Demo').balanceAtSetup === 9980.19, by('FTMO Demo').balanceAtSetup);
    ok('a real 10K is left alone', stat(by('Real 10K')).join() === '10000,0', stat(by('Real 10K')));

    // new: MT5 reports the size of an account made with the stand-in
    var N = window.__stCreateAccount('MT5 123', 0); N.balanceAtSetup = N.startingBalance;
    window.__stSetAccountStart(N, 5000);
    ok('new cloud account: the size MT5 reports is its balance too', stat(N).join() === '5000,0', stat(N));
    // the size typed over: moves with it, a real "Balance now" stays
    var H = mk('Typed', 10000, 10000); window.__stSetAccountStart(H, 25000);
    ok('size typed over: the balance follows', stat(H).join() === '25000,0', stat(H));
    var K = mk('Kept', 10000, 9980.19); window.__stSetAccountStart(K, 25000);
    ok('size typed over with a real "Balance now": that stays', K.balanceAtSetup === 9980.19 && K.startingBalance === 25000, [K.balanceAtSetup, K.startingBalance]);
  } catch (e) { ok('no exception', false, String(e && e.stack || e)); }
  return out;
})();
