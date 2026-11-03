// End-to-end test (Nestor, 3 Nov 2026: "when dragging the TP up the tool attaches to the candles bottoms i hover over"): with the Magnet on, a Long / Short
// position's stop and target go where the mouse takes them; its entry still lands on a candle's price. Replay (the engine of Live Charts too) and Trade Replay.
// Run: python tests/browser_test.py tests/posmagnet_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stReplay); i++) await W(100);
    await W(1000);
    var P = window.__stPractice, MAG = window.__stDrawBar.magnet;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15, 60, 240, 5]; C.look = {}; C.mini = false; C.max = true; C.resume = null;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('12:00'); await W(500);
    MAG.set(true);
    var pn = P._panes()[0], DW = P._dr(), b = pn.bars, ch = pn.el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect(), n = b.length;
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mouseup' ? 0 : 1, view: window }, o || {}))); };
    var e = b[n - 30].close, d = { type: 'long', a: { t: b[n - 30].time, price: e }, b: { t: b[n - 10].time, price: e }, sl: Math.round((e - 0.0006) * 1e5) / 1e5, tp: Math.round((e + 0.0020) * 1e5) / 1e5 };
    DW.list.push(d); DW.sel = DW.list.indexOf(d); P._render(); await W(400);
    var ax = P._xOfT(0, d.a.t), y = function (pr) { return pn.series.priceToCoordinate(pr); };
    var off = function (pr) { return !b.slice(n - 60).some(function (c) { return [c.open, c.high, c.low, c.close].indexOf(pr) >= 0; }); };
    // over the candles, in steps, as a hand does
    var tpY0 = y(d.tp), tpY1 = y(e + 0.0007), cx = P._xOfT(0, b[n - 20].time);
    mev('mousedown', ax, tpY0); await W(40); mev('mousemove', cx, tpY0 + 6); await W(40); mev('mousemove', cx, (tpY0 + tpY1) / 2); await W(40); mev('mousemove', cx, tpY1); await W(40);
    var want = pn.series.coordinateToPrice(tpY1), mid = d.tp; mev('mouseup', cx, tpY1); await W(60);
    ok('Replay, Magnet on: the target goes where the mouse is', Math.abs(d.tp - want) < 0.00002, [d.tp, want]);
    var slY0 = y(d.sl), slY1 = y(e - 0.0003);
    mev('mousedown', ax, slY0); await W(40); mev('mousemove', cx, slY0 - 4); await W(40); mev('mousemove', cx, slY1); await W(40);
    var want2 = pn.series.coordinateToPrice(slY1); mev('mouseup', cx, slY1); await W(60);
    ok('...the stop too', Math.abs(d.sl - want2) < 0.0001 && off(d.sl), [d.sl, want2]);   // the scale may have moved a pixel after the first drag
    var ay0 = y(d.a.price), ax2 = ax; mev('mousedown', ax, ay0); await W(40); mev('mousemove', ax2 + 2, ay0 + 9); await W(40); mev('mousemove', ax2 + 2, ay0 + 14); await W(40); mev('mouseup', ax2 + 2, ay0 + 14); await W(60);
    var ab = b[P._lOfT(0, d.a.t)];
    ok('...its entry still lands on a candle\'s price', ab && [ab.open, ab.high, ab.low, ab.close].indexOf(d.a.price) >= 0, [d.a, ab]);
    DW.list.splice(DW.list.indexOf(d), 1); P._render();
    try { P.close(); } catch (x) {} await W(400);

    // ---- Trade Replay ----
    var R = window.__stReplay;
    R.open({ mt5Ticket: 999999932, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13095, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 });
    for (k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(800);
    var S = R._s(), chart = document.getElementById('strp-chart'), r2 = chart.getBoundingClientRect(), bi = Math.max(0, S.cursor - 20), bp = S.bars[bi].close;
    var mv2 = function (t, xx, yy) { var el = document.elementFromPoint(r2.left + xx, r2.top + yy) || chart; el.dispatchEvent(new MouseEvent(t, { clientX: r2.left + xx, clientY: r2.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mouseup' ? 0 : 1, detail: 1 })); };
    var rd = { type: 'short', a: { idx: bi, price: bp }, b: { idx: bi + 12, price: bp }, sl: Math.round((bp + 0.0005) * 1e5) / 1e5, tp: Math.round((bp - 0.0015) * 1e5) / 1e5 };
    S.drawings.push(rd); S.sel = S.drawings.indexOf(rd); document.getElementById('strp-scrub').dispatchEvent(new Event('input', { bubbles: true })); await W(400);
    var tx = S.chart.timeScale().logicalToCoordinate(bi + (S.pre0 || 0)), ry0 = S.series.priceToCoordinate(rd.tp);
    if (tx == null || ry0 == null) ok('Trade Replay: the tool is on screen', false, [tx, ry0]);
    var hit = null; for (var dx = -600; dx <= 600 && !hit; dx += 1) { var h0 = window.__stReplay._hit ? window.__stReplay._hit(tx + dx, ry0) : null; if (h0 && h0.part === 'ptp') hit = tx + dx; }
    var hx = hit == null ? tx : hit, ry1 = S.series.priceToCoordinate(bp - 0.0006);
    mv2('mousedown', hx, ry0); await W(40); mv2('mousemove', hx + 30, ry0 + 5); await W(40); mv2('mousemove', hx + 30, ry1); await W(40);
    var want3 = S.series.coordinateToPrice(ry1); mv2('mouseup', hx + 30, ry1); await W(60);
    ok('Trade Replay, Magnet on: the target goes where the mouse is', Math.abs(rd.tp - want3) < 0.00002, [rd.tp, want3]);
    MAG.set(false);
    try { document.getElementById('strp-close').click(); } catch (x) {}
  } catch (e2) { ok('test ran', false, String(e2 && e2.stack || e2)); }
  try { window.__stDrawBar.magnet.set(false); } catch (x) {}
  return out;
})()
