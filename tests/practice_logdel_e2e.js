(async function () {
  // Deleting one practice trade from the Replay log (Nestor, 20 Oct 2026: "can you add something here to delete individual
  // trades?"). A bin at the end of each row: the first press asks ("Delete?", red, 3 s), the second takes the trade out of
  // the log, its figures and the day on the chart; Put back brings it back. practice_trades takes no deletes, so the trade
  // is kept out through the synced settings (logDel), like Start fresh. Signed out: nothing live is read or written.
  // Run: python tests/browser_test.py tests/practice_logdel_e2e.js
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
      { cid: 'a2', sym: 'EURUSD', day: '2026-10-01', tf: 5, dir: 1, entry: 1.131, entryTs: at('2026-10-01T09:40:00Z'), exitTs: at('2026-10-01T10:10:00Z'), r: -1, dist: -12, unit: 'pips', why: 'sl', mae: 1, at: T0 + 2000, synced: true },
      { cid: 'a3', sym: 'EURUSD', day: '2026-09-30', tf: 5, dir: -1, entry: 1.17, entryTs: at('2026-09-30T08:00:00Z'), exitTs: at('2026-09-30T08:30:00Z'), r: 0.5, dist: 5, unit: 'pips', why: 'manual', mae: 0.5, at: T0 + 3000, synced: true }]));
    var C = P._cfg(); C.layout = 1; C.tfs = [5, 60, 15, 240]; C.ses = {}; C.max = false; C.logDel = []; C.logFrom = 0;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('16:00'); await W(200); P._s().trades = JSON.parse(localStorage.getItem(key)).filter(function (t) { return t.day === '2026-10-01'; }); P._render(true); await W(60);
    var lg = document.getElementById('stpr-log');
    document.getElementById('stpr-logbtn').click(); await W(100);
    var tiles = function () { return Array.prototype.map.call(lg.querySelectorAll('.stpr-lgt'), function (t) { return t.querySelector('b').textContent + '=' + t.querySelector('strong').textContent; }); };
    var rows = function () { var tb = lg.querySelectorAll('.stpr-lgtab tbody'); tb = tb[tb.length - 1]; return tb ? Array.prototype.slice.call(tb.rows) : []; };
    var bin = function (cid) { return lg.querySelector('[data-lgdel="' + cid + '"]'); };
    var rw = rows(), b2 = bin('a2');
    ok('every practice trade has a bin at the end of its row, before the replay arrow', rw.length === 3 && rw.every(function (r) { return r.querySelector('.stpr-lgdel') && r.cells[r.cells.length - 1].querySelector('.stpr-lgp'); }) && b2 && b2.title === 'Delete this practice trade', rw.length);
    ok('(3 trades, +1.50R net)', tiles()[0] === 'Trades=3' && tiles()[2] === 'Net R=+1.50R', tiles());
    var sc0 = document.getElementById('stpr-score').textContent;
    b2.click(); await W(40); b2 = bin('a2');
    ok('a first press asks: "Delete?" in red, nothing deleted, the day not reopened', b2 && b2.classList.contains('arm') && b2.textContent === 'Delete?' && rows().length === 3 && lg.style.display !== 'none' && document.getElementById('stpr-win').classList.contains('logv'), b2 && b2.textContent);
    await W(3200); b2 = bin('a2');
    ok('...and goes quiet again after 3 seconds', b2 && !b2.classList.contains('arm') && !b2.textContent.trim());
    b2.click(); await W(40); bin('a2').click(); await W(120);
    var ids = rows().map(function (r) { return r.querySelector('.stpr-lgdel').getAttribute('data-lgdel'); });
    ok('a second press deletes it: 2 trades left, the stop-out gone, +2.50R net', ids.join() === 'a3,a1' && tiles()[0] === 'Trades=2' && tiles()[2] === 'Net R=+2.50R', [ids, tiles()]);
    var dn = lg.querySelector('.stpr-lgdn');
    ok('a line above the trades says which, with Put back (no pop-up)', dn && /Deleted: Thu 1 Oct '26 · EURUSD · −1\.00R/.test(dn.textContent) && dn.querySelector('[data-lg="undel"]') && !document.querySelector('.st-toast.show'), dn && dn.textContent);
    ok('kept out through the synced settings, the trade itself kept', JSON.stringify(P._cfg().logDel) === '["a2"]' && JSON.parse(localStorage.getItem(key)).length === 3);
    var trs = P._s().trades.map(function (t) { return t.cid; });
    ok('the day on the chart loses it too (the score)', trs.join() === 'a1' && document.getElementById('stpr-score').textContent !== sc0, [trs, sc0, document.getElementById('stpr-score').textContent]);
    dn.querySelector('[data-lg="undel"]').click(); await W(120);
    ids = rows().map(function (r) { return r.querySelector('.stpr-lgdel').getAttribute('data-lgdel'); });
    ok('Put back: all 3 again, +1.50R, the line gone, the chart has both of its trades', ids.join() === 'a3,a2,a1' && tiles()[2] === 'Net R=+1.50R' && !lg.querySelector('.stpr-lgdn') && JSON.stringify(P._cfg().logDel) === '[]' && P._s().trades.length === 2, [ids, tiles()[2], P._s().trades.length]);
    // a row's other cells still open the day
    bin('a3').click(); await W(30); bin('a3').click(); await W(80);
    ok('(deleting the one from 30 Sep leaves the chart on 1 Oct)', P._s().day === '2026-10-01' && rows().length === 2);
    rows()[0].cells[0].click(); await W(600);
    ok('a click on the row (not the bin) still replays that day', P._s().day === '2026-10-01' && !document.getElementById('stpr-win').classList.contains('logv'));
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
