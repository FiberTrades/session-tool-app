(async function () {
  // Prop Firm Progress counts a closed trade the moment it is in the Trade Log, and stops counting it if it leaves the Trade Log
  // unsaved (Nestor, 22 Oct 2026: "yes do it, but if the user decides to delete that trade of the trade log later then the prop firm
  // challenge needs to know about it and the prop firm pass or fail etc."). A stand-in prop account; nothing reaches the cloud.
  // Run: python tests/browser_test.py tests/proplog_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  for (var i = 0; i < 200 && !(window.__stAccountStats && window.__stPropStatus && window.__stAccSnap && window.__stTradesWithLog); i++) await W(100);
  await W(800);
  var keep = JSON.stringify({ a: data.accounts, cs: data.currentSeries, h: data.history, rs: data.reviewSlots, r: data.review, ars: data.activeReviewSlot });
  try {
    var acc = { id: 'pl_acc', name: 'FTMO 10K - Challenge', status: 'active', kind: 'challenge', accountType: 'personal', startingBalance: 10000, balanceAtSetup: 10000,
      createdAt: '2026-01-01T00:00:00.000Z', riskRules: { profitTargetMode: 'amount', profitTargetAmount: 1000, maxDrawdownMode: 'amount', maxDrawdownAmount: 1000, ddType: 'static' } };
    data.accounts = (data.accounts || []).filter(function (a) { return a && a.id !== 'pl_acc'; }).concat([acc]);
    var tr = function (id, gross, x) { return Object.assign({ id: id, accountId: 'pl_acc', symbol: 'EUR/USD', side: 'Short', result: gross > 0 ? 'Win' : (gross < 0 ? 'Lose' : 'BE'), actualGross: gross, costs: 0, risk: 500, r: '1', sl: '4' }, x || {}); };
    var saved = tr('pl_s1', 500, { mt5Ticket: '9101', date: new Date(Date.now() - 2 * 86400000).toISOString() });
    data.currentSeries = [saved]; data.history = [];
    var rv = { slotSession: 'London', slotSymbol: 'EUR/USD', sessionDate: todayDateStr(), trades: [
      tr('pl_r1', 300, { mt5Ticket: '9102' }),                     // closed in MT5, synced into the Trade Log, not saved yet
      tr('pl_r2', 500, { mt5Ticket: '9101', seriesId: 'pl_s1' }),   // the saved trade's review copy
      tr('pl_r3', 500, { mt5Ticket: '9101' })                       // the same broker ticket again
    ] };
    data.reviewSlots = [rv]; data.review = rv; data.activeReviewSlot = 0;
    var cur = function () { return window.__stAccountStats(acc).current; }, st = function () { var s = window.__stPropStatus(acc); return s && s.status; };
    ok('the saved trade and the Trade Log\'s unsaved one both count, each once: 10,000 + 500 + 300', Math.abs(cur() - 10800) < 0.01, cur());
    // another trade closes in MT5 and lands in the Trade Log: the target (11,000) is reached at once
    rv.trades.push(tr('pl_r4', 250, { mt5Ticket: '9103' }));
    ok('a trade closing into the Trade Log moves the balance at once (11,050)', Math.abs(cur() - 11050) < 0.01, cur());
    ok('...and the challenge reads passed', st() === 'passed', st());
    // the member deletes it from the Trade Log before saving: the challenge knows
    rv.trades = rv.trades.filter(function (t) { return t.id !== 'pl_r4'; });
    ok('deleted from the Trade Log unsaved: the balance goes back (10,800)', Math.abs(cur() - 10800) < 0.01, cur());
    ok('...and the challenge is in progress again', st() === 'inProgress', st());
    // a big loss in the Trade Log fails it; deleting it un-fails it
    rv.trades.push(tr('pl_r5', -1900, { mt5Ticket: '9104' }));
    ok('a loss in the Trade Log past the drawdown floor (8,900 under 9,000): failed', st() === 'failed', [st(), cur()]);
    rv.trades = rv.trades.filter(function (t) { return t.id !== 'pl_r5'; });
    ok('...deleted from the Trade Log: not failed any more', st() === 'inProgress', st());
    // the snapshot the server's phone nudges start from lists the Trade Log trade's ticket, so it is not added twice there
    var snap = window.__stAccSnap.build(), s0 = snap && snap.pl_acc;
    ok('the server\'s snapshot: balance 10,800 with the Trade Log ticket among those counted', s0 && Math.abs(s0.c - 10800) < 0.01 && s0.tk.indexOf('9102') >= 0 && s0.tk.indexOf('9101') >= 0, s0);
    // a Trade Log trade with no result yet (still being logged) does not count
    rv.trades.push({ id: 'pl_r6', accountId: 'pl_acc', symbol: 'EUR/USD', side: 'Short', actualGross: 999, mt5Ticket: '9105' });
    ok('a Trade Log row with no result yet: not counted', Math.abs(cur() - 10800) < 0.01, cur());
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { var k = JSON.parse(keep); data.accounts = k.a; data.currentSeries = k.cs; data.history = k.h; data.reviewSlots = k.rs; data.review = k.r; data.activeReviewSlot = k.ars; } catch (e) {}
  return out;
})()
