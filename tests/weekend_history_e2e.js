(async function () {
  // Older candles across a weekend (Nestor, 19 Oct 2026: "why am i only getting 1d worth of 1m candles now? its supposed to be 1y
  // of 1m candles"). On a Monday's day the 1m chart's first window (the day before the open) is Saturday, and the first 2-day chunk
  // scrolling left is Friday's close to Sunday's open: both empty. An empty chunk used to mark the history full, so the chart stopped
  // at Sunday's open for good. Now empty chunks are skipped. Real stored EUR/USD candles, Replay of Mon 19 Oct 2026.
  // Run: python tests/browser_test.py tests/weekend_history_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [1, 5, 15, 60]; C.look = {}; C.mini = false; C.max = true; C.news = false; C.cmp = []; C.ctf = [];
    await P.open({ symbol: 'EURUSD', day: '2026-10-19' }); for (var k = 0; k < 120 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    await W(1500);
    var p = P._panes()[0], S = P._s(), e = p.hist || {}, d = function (t) { return new Date(t * 1000).toISOString().slice(0, 16); };
    var openT = S.f.open, first = (e.rows || [])[0];
    ok('a Monday on 1m: the candles before the day reach back past the weekend to Friday (not an empty Saturday)', p.tf === 1 && e.rows && e.rows.length > 300 && first && first.time < openT - 2 * 86400 && !e.full, [e.rows && e.rows.length, first && d(first.time), d(openT), e.full]);
    var n0 = e.rows.length, f0 = e.from;
    for (var r = 0; r < 3; r++) { p.handAt = Date.now(); var lr = p.chart.timeScale().getVisibleLogicalRange(); p.chart.timeScale().setVisibleLogicalRange({ from: lr.from - 3000, to: lr.to }); await W(2500); }
    e = p.hist;
    ok('scrolled left by hand, it keeps loading older days (the history is not marked full at a weekend)', e.rows.length > n0 + 1000 && e.from < f0 && !e.full, [n0, e.rows.length, d(f0), d(e.from), e.full]);
    try { P.close(); } catch (er) {}
  } catch (e2) { ok('test ran', false, String(e2 && e2.stack || e2)); }
  return JSON.stringify(out);
})()
