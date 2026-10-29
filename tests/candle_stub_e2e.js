// The candle store's stand-in (tests/candle_stub.py, 29 Oct 2026): in a test run the app's candle RPCs are answered by this machine's
// test server from tests/fixtures/candles, and nothing reaches the real store - the charts still draw.
//   python tests/browser_test.py tests/candle_stub_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stSB && window.__stPractice); i++) await W(100);
    ok('the stand-in is in the page before the app (window.__stCandleStub)', !!window.__stCandleStub, typeof window.__stCandleStub);
    var T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000, sb = window.__stSB;
    var a = await sb.rpc('st_candles', { p_symbol: 'EURUSD', p_tf: 1, p_from: T0 - 3600, p_to: T0 }).range(0, 999);
    ok('st_candles: the sample\'s EUR/USD minutes (61 for the hour, from 07:30 UTC)', a && !a.error && a.data.length === 61 && a.data[0].t === T0 - 3600 && a.data[60].c > 1, [a && a.error, a && a.data && a.data.length, a && a.data && a.data[0]]);
    var pg = await sb.rpc('st_candles', { p_symbol: 'EURUSD', p_tf: 1, p_from: T0 - 86400 * 2, p_to: T0 }).range(1000, 1999);
    ok('...paged as the store pages it (rows 1000-1999)', pg && !pg.error && pg.data.length === 1000 && pg.data[0].t > T0 - 86400 * 2, [pg && pg.error, pg && pg.data && pg.data.length]);
    var y = await sb.rpc('st_candle_symbols');
    ok('st_candle_symbols: the store\'s list as sampled', y && !y.error && y.data.length > 20 && y.data.some(function (r) { return r.symbol === 'EURUSD' && +r.tf === 240; }), [y && y.error, y && y.data && y.data.length]);
    var n0 = window.__stCandleStub.n;
    document.querySelector('.tab[data-page="livecharts"]').click();
    var P = window.__stPractice;
    for (i = 0; i < 120 && !(P._panes()[0] && P._panes()[0].n > 30); i++) await W(250);
    ok('Charts draws its candles from the stand-in', P._panes()[0] && P._panes()[0].n > 30 && window.__stCandleStub.n > n0, [P._panes()[0] && P._panes()[0].n, window.__stCandleStub.n - n0]);
    var real = performance.getEntriesByType('resource').filter(function (e) { return /supabase\.co\/rest\/v1\/rpc\/st_candle/.test(e.name); }).map(function (e) { return e.name; });
    ok('nothing went to the real candle store', real.length === 0, real.slice(0, 4));
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
