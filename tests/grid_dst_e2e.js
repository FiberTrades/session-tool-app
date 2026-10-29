// 1D and 1W across New York's clock going back (29 Oct 2026). The trading day from Saturday 17:00 EDT to Sunday 17:00 EST is 25 hours
// long; a 1D stored at the old hour (Sunday 21:00 UTC, another broker's) sat 24 h after that day's open and passed the NY-close grid
// check (86f77e77), so 1D showed two candles an hour apart that Sunday (Nov 2024, Nov 2025) and 1W split that week in two. On the
// candle stand-in (tests/candle_stub.py: the real store's EUR/USD 1D, strays included).
//   python tests/browser_test.py tests/grid_dst_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var iso = function (t) { return new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' '); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stLC && window.__stCandleGrid); i++) await W(100);
    await W(800);
    var P = window.__stPractice, G = window.__stCandleGrid, U = function (y, m, d, h) { return Date.UTC(y, m - 1, d, h) / 1000; };
    var bar = function (t) { return { time: t, open: 1, high: 1, low: 1, close: 1 }; };
    // the grid check itself, around 2 Nov 2025 (New York back to EST at 02:00 that Sunday)
    var d1 = G([U(2025, 10, 30, 21), U(2025, 10, 31, 0), U(2025, 11, 2, 0), U(2025, 11, 2, 21), U(2025, 11, 2, 22), U(2025, 11, 3, 22)].map(bar), 1440).map(function (b) { return iso(b.time); });
    ok('1D: Friday\'s 21:00 (EDT open) and Sunday\'s and Monday\'s 22:00 (EST open) kept; the 00:00 strays and Sunday 21:00 left out', d1.join() === ['2025-10-30 21:00', '2025-11-02 22:00', '2025-11-03 22:00'].join(), d1);
    var h4 = G([U(2025, 11, 2, 21), U(2025, 11, 2, 22), U(2025, 11, 3, 2), U(2025, 11, 3, 18), U(2025, 11, 3, 22), U(2025, 10, 31, 17)].map(bar), 240).map(function (b) { return iso(b.time); });
    ok('4h: the EST grid (22, 02 ... 18) after the change, the EDT grid (.. 17) before it; Sunday 21:00 left out', h4.join() === ['2025-11-02 22:00', '2025-11-03 02:00', '2025-11-03 18:00', '2025-11-03 22:00', '2025-10-31 17:00'].join(), h4);
    // the charts
    window.__stLcForce = true; window.__stKeepOff = true;
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [1440, 1, 60, 240]; C.syms = []; C.mini = false; C.resume = null; C.sym = 'EURUSD'; } catch (e) {}
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && P._panes()[0] && P._panes()[0].tf === 1440 && P._panes()[0].n > 300); k++) await W(250);
    await W(1500);
    var odd = function (B, okd) { var o = []; for (var j = 1; j < B.length; j++) { var d = B[j].time - B[j - 1].time; if (okd.indexOf(d) < 0 && d < 4 * 86400) o.push([iso(B[j - 1].time), iso(B[j].time), d / 3600]); } return o; };
    var p = P._panes()[0], o1 = odd(p.bars || [], [86400, 259200, 172800, 255600, 262800]);
    ok('1D chart, two years: no two candles less than a day apart (' + p.n + ' candles)', p.n > 300 && o1.filter(function (x) { return x[2] < 24; }).length === 0, o1.slice(0, 6));
    await P._tf(0, 10080);
    for (k = 0; k < 80 && !(P._panes()[0].tf === 10080 && P._panes()[0].n > 300); k++) await W(250);
    await W(1500); p = P._panes()[0];
    var o2 = odd(p.bars || [], [604800, 601200, 608400]);
    ok('1W chart, ten years: every week one candle, none split around a clock change (' + p.n + ' weeks)', p.n > 300 && o2.length === 0, o2.slice(0, 6));
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
