(async function () {
  // The mouse wheel over a chart's scales, as TradingView (Nestor, 19 Oct 2026: "when i scroll my mouse over the price scale i expect
  // the candles to become taller or srink and when i scroll over the time scale i expect to see the chart becoming wider or
  // narrower"). The Charts tab's engine (Replay of Thu 1 Oct 2026, real stored EUR/USD candles) and Trade Replay (a made-up trade
  // over the same candles). Run: python tests/browser_test.py tests/axiswheel_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  function geo(chart) {
    var el = chart.chartElement(), r = el.getBoundingClientRect(), psw = chart.priceScale('right').width(), th = chart.timeScale().height();
    return { r: r, price: { x: r.right - psw / 2, y: r.top + (r.height - th) * 0.45 }, time: { x: r.left + (r.width - psw) * 0.6, y: r.bottom - th / 2 }, plot: { x: r.left + (r.width - psw) * 0.5, y: r.top + (r.height - th) * 0.5 }, ph: r.height - th, left: r.left };
  }
  function span(series, ph) { var a = series.coordinateToPrice(0), b = series.coordinateToPrice(ph); return (a != null && b != null) ? Math.abs(a - b) : null; }
  function lspan(chart) { var lr = chart.timeScale().getVisibleLogicalRange(); return lr ? lr.to - lr.from : null; }
  function wheel(pt, dy, dx) {
    var t = document.elementFromPoint(pt.x, pt.y) || document.body;
    var ev = new WheelEvent('wheel', { clientX: pt.x, clientY: pt.y, deltaY: dy || 0, deltaX: dx || 0, deltaMode: 0, bubbles: true, cancelable: true, view: window });
    t.dispatchEvent(ev); return ev.defaultPrevented;
  }
  function dbl(pt) { var t = document.elementFromPoint(pt.x, pt.y) || document.body; t.dispatchEvent(new MouseEvent('dblclick', { clientX: pt.x, clientY: pt.y, bubbles: true, cancelable: true, view: window })); }
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stReplay && window.__stSB && window.__stAZ); i++) await W(100);
    await W(1000);
    var P = window.__stPractice, errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [5, 15, 60, 240]; C.look = {}; C.mini = false; C.max = true; C.news = false; C.cmp = []; C.ctf = [];
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._goto('11:00'); await W(800);
    var pane = P._panes()[0], g = geo(pane.chart), s0 = span(pane.series, g.ph), l0 = lspan(pane.chart);

    // ---- the Charts tab / Replay: over the price scale ----
    var pv = wheel(g.price, -300); await W(250);
    var s1 = span(pane.series, g.ph);
    ok('Replay: the wheel up over the price scale makes the candles taller (a smaller price range), and the page does not scroll', pv && s0 && s1 && s1 < s0 * 0.8, [s0, s1, pv]);
    ok('...the time is left alone', Math.abs(lspan(pane.chart) - l0) < 0.5, [l0, lspan(pane.chart)]);
    wheel(g.price, 600); await W(250);
    var s2 = span(pane.series, g.ph);
    ok('...the wheel down shrinks them (a bigger range than the start)', s2 > s0 * 1.2, [s0, s2]);
    dbl(g.price); await W(250);
    var s3 = span(pane.series, g.ph);
    ok('...a double-click on the price scale goes back to the normal fit', Math.abs(s3 - s0) / s0 < 0.03, [s0, s3]);
    // ---- over the time scale ----
    var lr0 = pane.chart.timeScale().getVisibleLogicalRange(), aL = pane.chart.timeScale().coordinateToLogical(g.time.x - g.left);
    var tv = wheel(g.time, -300); await W(250);
    var l1 = lspan(pane.chart), aX = pane.chart.timeScale().logicalToCoordinate(aL);
    ok('Replay: the wheel up over the time scale widens the candles (fewer on screen), around the mouse; the page does not scroll', tv && l1 < l0 * 0.8 && Math.abs(aX - (g.time.x - g.left)) < 4, [l0, l1, aX, g.time.x - g.left]);
    ok('...the price range is left alone', Math.abs(span(pane.series, g.ph) - s0) / s0 < 0.25);
    wheel(g.time, 600); await W(250);
    ok('...the wheel down narrows them (more candles than the start)', lspan(pane.chart) > l0 * 1.2, [l0, lspan(pane.chart)]);
    var f0 = pane.chart.timeScale().getVisibleLogicalRange().from, sp0 = lspan(pane.chart);
    wheel(g.time, 0, 200); await W(250);
    var lr2 = pane.chart.timeScale().getVisibleLogicalRange();
    ok('...a sideways swipe over the time scale moves along in time, the width unchanged', lr2.from > f0 + 1 && Math.abs((lr2.to - lr2.from) - sp0) < 0.5, [f0, lr2.from, sp0, lr2.to - lr2.from]);
    var pp = wheel(g.plot, -100); await W(150);
    ok('on the chart itself the wheel is the chart\'s own (this code leaves it: price range not scaled)', Math.abs(span(pane.series, g.ph) - s0) / s0 < 0.25, span(pane.series, g.ph));

    // ---- Trade Replay ----
    try { P.close(); } catch (e) {}
    await W(300);
    var R = window.__stReplay;
    var trade = { mt5Ticket: 999999911, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 };
    R.open(trade); for (k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(900);
    var S = R._s(), tg = geo(S.chart), ts0 = span(S.series, tg.ph), tl0 = lspan(S.chart);
    var tpv = wheel(tg.price, -300); await W(250);
    var ts1 = span(S.series, tg.ph);
    ok('Trade Replay: the wheel over the price scale makes the candles taller too', tpv && ts1 < ts0 * 0.8, [ts0, ts1]);
    dbl(tg.price); await W(250);
    ok('...double-click: back to the normal fit', Math.abs(span(S.series, tg.ph) - ts0) / ts0 < 0.03, [ts0, span(S.series, tg.ph)]);
    var ttv = wheel(tg.time, -300); await W(250);
    ok('Trade Replay: the wheel over the time scale widens the candles', ttv && lspan(S.chart) < tl0 * 0.8, [tl0, lspan(S.chart)]);
    ok('no errors', !errs.length, errs.slice(0, 3));
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
