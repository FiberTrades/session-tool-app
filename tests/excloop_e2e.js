// End-to-end test (3 Nov 2026): a copied trade in All accounts is measured once, not for ever. It was measured about 5 times a second, every surface redrawn each time.
//   python tests/browser_test.py tests/excloop_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 100 && !(typeof newAccountBlank === 'function' && window.__stReplay); i++) await W(100);
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
    var A = newAccountBlank('FTMO 70K', 70000, 'challenge'), B = newAccountBlank('TTT 10K', 10000, 'challenge'); A.kind = B.kind = 'challenge';
    data.accounts = [A, B]; data.activeAccountId = A.id; data.viewScope = 'lifetime'; data.linkedGroups = []; data.mt5LoginMap = {}; data.history = []; data.review = { trades: [] };
    var d = new Date(); d.setDate(d.getDate() - 2); d.setHours(12, 0, 0, 0); var iso = d.toISOString();
    data.currentSeries = [
      { id: 'a', accountId: A.id, symbol: 'EUR/USD', date: iso, openTs: iso, dayOfWeek: d.getDay(), result: 'Win', r: 5, risk: 500, actualGross: 900, costs: 0, ideaId: 'i1', mt5Ticket: '111', mt5Login: '1' },
      { id: 'b', accountId: B.id, symbol: 'EUR/USD', date: iso, openTs: iso, dayOfWeek: d.getDay(), result: 'Win', r: 5, risk: 50, actualGross: 90, costs: 0, ideaId: 'i1', mt5Ticket: '222', mt5Login: '2' },
      { id: 'c', accountId: A.id, symbol: 'EUR/USD', date: iso, openTs: iso, dayOfWeek: d.getDay(), result: 'Win', r: 5, risk: 500, actualGross: 900, costs: 0, mt5Ticket: '333', mt5Login: '1' }];
    rebuildSeriesByDate();
    var calls = [], redraws = 0, boom = false, rf = window.refreshAllSurfaces;
    window.__stReplay.excursions = async function (tr) { calls.push(tr.id); await W(5); if (boom) throw new Error('network'); return { mfePips: 6, maePips: 2, bars: 21, slPips: 4, mfeR: 1.5, maeR: 0.5 }; };
    if (typeof rf === 'function') window.refreshAllSurfaces = function () { redraws++; return rf.apply(this, arguments); };
    window.__stExcRunning = false;
    document.querySelector('.tab[data-page="stats"]').click(); await W(500); renderTradesStats();
    await W(4000);
    var n = calls.length;
    ok('each real trade measured once, in All accounts', n === 3 && calls.slice().sort().join() === 'a,b,c', calls.slice(0, 12));
    ok('the stamp is on the real rows', data.currentSeries.every(function (x) { return x._excAt > 0; }), data.currentSeries.map(function (x) { return !!x._excAt; }));
    renderTradesStats(); await W(1500);
    ok('drawn again: nothing measured again', calls.length === n, calls.length);
    // a read that throws: left unmarked for another visit, and no loop
    calls.length = 0; boom = true;
    data.currentSeries.push({ id: 'e', accountId: A.id, symbol: 'EUR/USD', date: iso, openTs: iso, dayOfWeek: d.getDay(), result: 'Win', r: 5, risk: 500, actualGross: 900, costs: 0, mt5Ticket: '444', mt5Login: '1' });
    rebuildSeriesByDate(); renderTradesStats(); await W(2500);
    ok('a failing read: tried once on this page, not in a loop', calls.length === 1, calls.length);
    ok('...and not retired for good', !data.currentSeries[3]._excNone && !data.currentSeries[3]._excAt);
  } catch (e) { ok('no exception', false, String(e && e.stack || e)); }
  return out;
})();
