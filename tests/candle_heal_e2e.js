// A chart's history the store did not give is read again and painted in (29 Oct 2026: in the 07:45-08:30 UTC Supabase outage the candle
// reads timed out; the empty or cut-short answer was kept as the chart's history until the page was reloaded - Nestor: "the charts in
// TFs from 1h up they are messed up"). The candle stand-in (tests/candle_stub.py) is made to fail: all of 4h's reads, then only the
// second page of 1D's ten years (1W); then the store answers again.
//   python tests/browser_test.py tests/candle_heal_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stLC && window.__stCandleStub); i++) await W(100);
    await W(800);
    var P = window.__stPractice, ST = window.__stCandleStub;
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    window.__stLcForce = true; window.__stKeepOff = true;
    try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [240, 1, 60, 240]; C.syms = []; C.mini = false; C.resume = null; C.sym = 'EURUSD'; } catch (e) {}
    // 1. every 4h read fails while the chart opens
    ST.failIf = function (fn, a) { return fn === 'st_candles' && +a.p_tf === 240; };
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && P._panes()[0] && P._panes()[0].tf === 240 && P._panes()[0].hist); k++) await W(250);
    await W(1500);
    var p = P._panes()[0], n0 = p.n, h0 = p.hist;
    ok('4h opened while the store did not answer: its history marked failed, only today\'s candles (' + n0 + ')', h0 && h0.failed === true && n0 < 20, [h0 && h0.failed, n0]);
    ok('...and not taken as "nothing stored" (the EA\'s history is not asked instead)', !(P._s().nost && P._s().nost[240]), P._s().nost);
    ST.failIf = null;   // the store answers again
    for (k = 0; k < 90 && !(P._panes()[0].hist && !P._panes()[0].hist.failed); k++) await W(250);
    await W(800); p = P._panes()[0];
    var r = p.chart.timeScale().getVisibleLogicalRange();
    ok('...read again within 15 s and painted in: ' + p.n + ' candles, the latest still on screen', p.hist && !p.hist.failed && p.n > 300 && r && r.to >= p.n - 2 && r.from < p.n - 2, [p.hist && p.hist.failed, p.n, r]);
    // 2. 1W: ten years of 1D in pages of 1,000, the second page fails
    ST.failIf = function (fn, a, url) { return fn === 'st_candles' && +a.p_tf === 1440 && /offset=1000/.test(url); };
    await P._tf(0, 10080);
    for (k = 0; k < 80 && !(P._panes()[0].tf === 10080 && P._panes()[0].hist); k++) await W(250);
    await W(1500); p = P._panes()[0];
    var h1 = p.hist, nw = p.n;
    ok('1W with its second page of 1D failed: kept as failed, not as ten years cut short (' + nw + ' weeks on screen)', h1 && h1.failed === true, [h1 && h1.failed, nw]);
    ST.failIf = null;
    for (k = 0; k < 90 && !(P._panes()[0].hist && !P._panes()[0].hist.failed); k++) await W(250);
    await W(800); p = P._panes()[0];
    var B = p.bars || [], last = B.length ? B[B.length - 1].time : 0;
    ok('...read again: ' + p.n + ' weeks, up to this week', p.hist && !p.hist.failed && p.n > 300 && Date.now() / 1000 - last < 8 * 86400, [p.hist && p.hist.failed, p.n, new Date(last * 1000).toISOString()]);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { window.__stCandleStub.failIf = null; } catch (e) {}
  return out;
})()
