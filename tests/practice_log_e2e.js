(async function () {
  // Practice Replay's log (15 Oct 2026). Nestor: "should user be able to keep a log of their trades in practice? with some
  // stats, equity curve etc?" - "go, do it". Four practice trades with known results: the six figures, the R curve, the
  // three sessions, the trades newest first, a symbol filter, and a row reopening that day at the entry.
  // Run: python tests/browser_test.py tests/practice_log_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice, k;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var key = (window.currentUser && window.currentUser.id) ? 'st_practice_log:' + window.currentUser.id : 'st_practice_log';
    var T0 = Date.now() - 100000, at = function (s) { return Math.floor(Date.parse(s) / 1000); };
    localStorage.setItem(key, JSON.stringify([
      { cid: 'a1', sym: 'EURUSD', day: '2026-10-01', tf: 5, dir: -1, entry: 1.13147, exit: 1.12907, entryTs: at('2026-10-01T07:20:00Z'), exitTs: at('2026-10-01T08:39:00Z'), r: 2, dist: 24, unit: 'pips', why: 'tp', mae: 0.1, at: T0 + 1000, synced: true },
      { cid: 'a2', sym: 'EURUSD', day: '2026-10-01', tf: 5, dir: 1, entry: 1.131, entryTs: at('2026-10-01T12:40:00Z'), exitTs: at('2026-10-01T13:10:00Z'), r: -1, dist: -12, unit: 'pips', why: 'sl', mae: 1, at: T0 + 2000, synced: true },
      { cid: 'a3', sym: 'XAUUSD', day: '2026-09-15', tf: 5, dir: 1, entry: 2600, entryTs: at('2026-09-15T01:00:00Z'), exitTs: at('2026-09-15T02:00:00Z'), r: 0.5, why: 'manual', mae: 0.3, at: T0 + 3000, synced: true },
      { cid: 'a4', sym: 'EURUSD', day: '2026-09-30', tf: 5, dir: -1, entry: 1.17, entryTs: at('2026-09-30T08:00:00Z'), exitTs: at('2026-09-30T08:30:00Z'), r: 0, dist: 0, unit: 'pips', why: 'manual', mae: 0.5, at: T0 + 4000, synced: true }]));
    var C = P._cfg(); C.layout = 1; C.tfs = [5, 60, 15, 240]; C.ses = {}; C.max = false;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var win = document.getElementById('stpr-win'), lg = document.getElementById('stpr-log');
    var tiles = function () { return Array.prototype.map.call(lg.querySelectorAll('.stpr-lgt'), function (t) { return t.querySelector('b').textContent + '=' + t.querySelector('strong').textContent; }); };
    var tables = function () { return Array.prototype.map.call(lg.querySelectorAll('.stpr-lgtab tbody'), function (tb) { return Array.prototype.map.call(tb.rows, function (r) { return Array.prototype.map.call(r.cells, function (c) { return c.textContent.trim(); }).join('|'); }); }); };

    document.getElementById('stpr-logbtn').click(); await W(100);
    var tl = tiles();
    ok('Log opens over the chart: six figures', win.classList.contains('logv') && getComputedStyle(lg).display === 'block' && tl.length === 6, tl);
    ok('4 trades (2 wins, 1 loss, 1 BE), 50% won, +1.50R net, +0.38R a trade, profit factor 2.50, 50 min in a trade', tl[0] === 'Trades=4' && tl[1] === 'Win rate=50%' && tl[2] === 'Net R=+1.50R' && tl[3] === 'Average R=+0.38R' && tl[4] === 'Profit factor=2.50' && tl[5] === 'Time in trade=50 min' && /2 wins · 1 loss · 1 BE/.test(lg.querySelector('.stpr-lgt span').textContent), tl);
    var run = lg.querySelector('.st-run');
    ok('the R curve: the reviews\' running chart, in R, ending +1.50R after 4 trades', run && run.classList.contains('good') && /\+1\.50R · 4 trades/.test(run.textContent) && run.querySelector('svg path.st-run-l'), run && run.textContent);
    var tb = tables();
    ok('by session: Asia 1 trade +0.50R, London 2 trades 50% +2.00R, New York 1 trade −1.00R', tb[0] && tb[0][0] === 'Asia|1|100%|+0.50R|+0.50R' && tb[0][1] === 'London|2|50%|+2.00R|+1.00R' && tb[0][2] === 'New York|1|0%|−1.00R|−1.00R', tb[0]);
    ok('the trades, newest first: Wed 30 Sep, then Gold with no distance, then the stop-out, then the target', tb[1] && tb[1].length === 4 && /^Wed 30 Sep '26\|EUR\/USD\|↓ SELL\|London\|09:00\|09:30\|30 min\|By hand\|0.5R\|\+0.00R\|\+0.0 pips/.test(tb[1][0]) && /Gold/.test(tb[1][1]) && /\|—\|$/.test(tb[1][1]) && /Stop/.test(tb[1][2]) && /Target\|0.1R\|\+2.00R\|\+24.0 pips/.test(tb[1][3]), tb[1]);
    lg.querySelector('[data-lgsym="EURUSD"]').click(); await W(30); tl = tiles();
    ok('the EUR/USD filter: 3 trades, +1.00R', tl[0] === 'Trades=3' && tl[2] === 'Net R=+1.00R' && tables()[1].length === 3, tl);
    lg.querySelector('[data-lgsym="all"]').click(); await W(20);
    lg.querySelector('[data-lg="fresh"]').click(); await W(20);
    ok('Start fresh asks first, and says the trades are kept', /Start a fresh log\?/.test(lg.textContent) && /kept/.test(lg.textContent) && !!lg.querySelector('[data-lg="fresh-yes"]'), lg.textContent.slice(0, 160));
    lg.querySelector('[data-lg="fresh-yes"]').click(); await W(30);
    ok('after Start fresh the log, its figures and the Academy count start from nothing, with a way back', !lg.querySelector('.stpr-lgt') && /4 earlier practice trades kept out/.test(lg.textContent) && /since you started fresh/.test(lg.textContent) && !!lg.querySelector('[data-lg="restore"]') && P.stats().n === 0 && P._cfg().logFrom > 0, lg.textContent.slice(0, 220));
    lg.querySelector('[data-lg="restore"]').click(); await W(30);
    ok('Bring them back puts all four back', tiles()[0] === 'Trades=4' && P.stats().n === 4 && !P._cfg().logFrom, tiles());
    var tb0 = document.querySelector('.stpr-tb:not(.stpr-tb2)'), lb = document.getElementById('stpr-logbtn');
    ok('the Log button sits at the right end of the top toolbar', tb0.contains(lb) && Math.abs(lb.getBoundingClientRect().right - (tb0.getBoundingClientRect().right - 14)) < 3, [lb.getBoundingClientRect().right, tb0.getBoundingClientRect().right]);
    lg.querySelector('tr[data-rp="0"]').click(); for (k = 0; k < 100 && !(P._s() && P._s().day === '2026-09-30' && P._panes()[0].n); k++) await W(100);
    ok('a row reopens that day at the moment of the entry, and the log closes', !win.classList.contains('logv') && P._s().day === '2026-09-30' && P._s().now === at('2026-09-30T08:00:00Z'), [P._s().day, P._s().now]);
    document.getElementById('stpr-score').click(); await W(60);
    ok('the score opens the log too', win.classList.contains('logv'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(30);
    ok('Escape goes back to the chart (and leaves Practice Replay open)', !win.classList.contains('logv') && document.getElementById('stpr-bg').classList.contains('show'));
    localStorage.removeItem(key); document.getElementById('stpr-logbtn').click(); await W(60);
    ok('with no practice trades the log says how to start one', /No practice trades yet/.test(lg.textContent) && !lg.querySelector('.stpr-lgt'));
    lg.querySelector('[data-lg="back"]').click(); await W(30);
    ok('Back to the chart closes it', !win.classList.contains('logv'));
    P.close(); await W(100);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
