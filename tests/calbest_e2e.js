// End-to-end test (Nestor, 4 Nov 2026: a best day of -£641 in green). Best/Worst Day on the calendar is coloured by the money, not by the word.
// Run: python tests/browser_test.py tests/calbest_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(typeof renderCalendar === 'function' && document.getElementById('cal-month-summary')); i++) await W(100);
    await W(1200);
    var D = STCloud.getData(), now = new Date(), day = function (n) { return new Date(now.getFullYear(), now.getMonth(), n, 10).toISOString(); };
    var acc = D.activeAccountId, tr = function (id, n, pnl) { return { id: id, accountId: acc, date: day(n), pair: 'EURUSD', result: pnl < 0 ? 'Lose' : (pnl > 0 ? 'Win' : 'BE'), actualGross: pnl }; };
    var paint = async function (list) { D.currentSeries = list; D.history = []; D.review = { trades: [] }; try { rebuildSeriesByDate(); } catch (e) {} renderCalendar(); await W(300);
      var v = [].slice.call(document.querySelectorAll('#cal-month-summary .cms-tile')).filter(function (x) { return x.querySelector('.cms-sep'); })[0];
      return v ? [].slice.call(v.querySelectorAll('.cms-v > span')).filter(function (s) { return !s.classList.contains('cms-sep'); }).map(function (s) { return s.className; }) : null; };
    var c = await paint([tr('a', 1, -641), tr('b', 2, -654)]);
    ok('two losing days: both figures red', c && c[0] === 'bad' && c[1] === 'bad', c);
    c = await paint([tr('a', 1, 641), tr('b', 2, 654)]);
    ok('two winning days: both figures green', c && c[0] === 'good' && c[1] === 'good', c);
    c = await paint([tr('a', 1, 500), tr('b', 2, -300)]);
    ok('a win and a loss: green and red', c && c[0] === 'good' && c[1] === 'bad', c);
  } catch (e) { ok('no exception', false, String(e && e.stack || e)); }
  return out;
})();
