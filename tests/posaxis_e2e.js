(async function () {
  // A Long / Short position clicked: its stop-to-target span shaded on the price scale and its stop, entry and target prices in
  // labels there, as TradingView shows one (Nestor, 22 Oct 2026: "i need the position tools in the app to do this on the price scale
  // when they are clicked on"). Back Testing (the engine of Live Charts too) and Trade Replay, real EUR/USD, Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/posaxis_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  // the blue of the band in the scale: a pixel of the chart's own picture, in the price scale, at a price
  var blueAt = function (chart, series, price) { var cv = chart.takeScreenshot(), g = cv.getContext('2d'), y = series.priceToCoordinate(price), ps = chart.priceScale('right').width();
    var dpr = cv.width / chart.chartElement().clientWidth, x = Math.round((chart.chartElement().clientWidth - ps / 2) * dpr), d = g.getImageData(x, Math.round(y * dpr), 1, 1).data; return [d[0], d[1], d[2]]; };
  var isBlue = function (c) { return c[2] > c[0] + 25 && c[2] > c[1] + 10; };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stReplay); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15, 60, 240, 5]; C.look = {}; C.mini = false; C.max = true; C.resume = null;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('12:00'); await W(500);
    var p = P._panes()[0], DW = P._dr(), b = p.bars, e = b[b.length - 30].close, ax = window.__stAxisLbl(p.series);
    var d = { type: 'long', a: { t: b[b.length - 30].time, price: e }, b: { t: b[b.length - 10].time, price: e }, sl: Math.round((e - 0.0004) * 1e5) / 1e5, tp: Math.round((e + 0.0010) * 1e5) / 1e5 };
    DW.list.push(d); DW.sel = null; P._render(); await W(300);
    ok('not selected: nothing on the price scale', !ax.get('psl') && !ax.get('pe') && !ax.get('ptp') && !ax.get('band'));
    DW.sel = DW.list.indexOf(d); P._render(); await W(400);
    var sl = ax.get('psl'), pe = ax.get('pe'), tp = ax.get('ptp'), bd = ax.get('band');
    ok('clicked: its stop, entry and target prices on the scale, in labels', sl && pe && tp && sl.p === d.sl && pe.p === d.a.price && tp.p === d.tp && sl.t === d.sl.toFixed(5) && tp.t === d.tp.toFixed(5), [sl, pe, tp]);
    ok('...the stop red, the target green, the entry dark', sl && /e56767|229,\s*103,\s*103/i.test(sl.bg) && tp && /4ecd8b|78,\s*205,\s*139/i.test(tp.bg) && pe && pe.bg === '#2a2833', [sl && sl.bg, tp && tp.bg, pe && pe.bg]);
    ok('...and the span from stop to target shaded on the scale', bd && bd.p1 === d.sl && bd.p2 === d.tp, bd);
    await W(200);
    var inB = blueAt(p.chart, p.series, (d.sl + d.tp) / 2), outB = blueAt(p.chart, p.series, d.tp + 0.0006);
    ok('...painted: blue in the scale between them, not above the target', isBlue(inB) && !isBlue(outB), [inB, outB]);
    // its own colours follow it
    d.psc = '#ff9800'; P._render(); await W(300);
    ok('a stop colour of its own: the stop label in it', /ff9800|255,\s*152,\s*0/i.test((ax.get('psl') || {}).bg || ''), ax.get('psl'));
    DW.sel = null; P._render(); await W(300);
    ok('clicked away: the scale is clear again', !ax.get('psl') && !ax.get('pe') && !ax.get('ptp') && !ax.get('band'));
    DW.drag = { i: DW.list.indexOf(d) }; P._render(); await W(300);
    ok('while it is dragged: shown too', !!ax.get('band') && !!ax.get('pe'));
    DW.drag = null; DW.list.splice(DW.list.indexOf(d), 1); P._render(); await W(300);
    ok('deleted: nothing left on the scale', !ax.get('band'));
    try { P.close(); } catch (e) {} await W(400);

    // ---- Trade Replay ----
    var R = window.__stReplay, e0 = 1.13215;
    R.open({ mt5Ticket: 999999931, symbol: 'EURUSD', side: 'short', entryPrice: e0, closePrice: 1.13095, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 });
    for (k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(800);
    var S = R._s(), rax = window.__stAxisLbl(S.series), bi = Math.max(0, S.cursor - 20), bp = S.bars[bi].close;
    var rd = { type: 'short', a: { idx: bi, price: bp }, b: { idx: bi + 15, price: bp }, sl: Math.round((bp + 0.0005) * 1e5) / 1e5, tp: Math.round((bp - 0.0012) * 1e5) / 1e5 };
    S.drawings.push(rd); S.sel = S.drawings.indexOf(rd);
    var sc = document.getElementById('strp-scrub'); sc.dispatchEvent(new Event('input', { bubbles: true })); await W(400);
    ok('Trade Replay, a Short clicked: stop, entry and target on the scale, and its span', (rax.get('psl') || {}).p === rd.sl && (rax.get('pe') || {}).p === rd.a.price && (rax.get('ptp') || {}).p === rd.tp && !!rax.get('band'), [rax.get('psl'), rax.get('pe'), rax.get('ptp')]);
    S.sel = null; sc.dispatchEvent(new Event('input', { bubbles: true })); await W(300);
    ok('...clicked away: clear', !rax.get('band') && !rax.get('psl'));
    try { document.getElementById('strp-close').click(); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
