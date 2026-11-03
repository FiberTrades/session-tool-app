// End-to-end test (Nestor, 3 Nov 2026: "when dragging the TP up the tool attaches to the candles bottoms i hover over"; "make this work like tradingviews"): TradingView's Weak and Strong magnet.
// Weak (the default): a point goes where the mouse is, and catches only close to a candle's open, high, low or close. Strong: always on one. Ctrl: free. Replay (the engine of Live Charts too) and Trade Replay.
// Run: python tests/browser_test.py tests/posmagnet_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    window.__stPlatOff = false; window.__stLcForce = true;
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stReplay); i++) await W(100);
    await W(1000);
    var P = window.__stPractice, MAG = window.__stDrawBar.magnet;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice|^st_magnet/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    MAG.set(false);
    ok('Weak is the mode a magnet starts in, as TradingView\'s', MAG.mode() === 'weak', MAG.mode());
    var C = P._cfg(); C.layout = 1; C.tfs = [15, 60, 240, 5]; C.look = {}; C.mini = false; C.max = true; C.resume = null;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('12:00'); await W(500);
    var pn = P._panes()[0], DW = P._dr(), b = pn.bars, ch = pn.el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect(), n = b.length;
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mouseup' ? 0 : 1, view: window }, o || {}))); };
    var y = function (pr) { return pn.series.priceToCoordinate(pr); }, pAt = function (yy) { return pn.series.coordinateToPrice(yy); };
    var hb = b[n - 20], cx = P._xOfT(0, hb.time), vals = [hb.open, hb.high, hb.low, hb.close], isO = function (pr) { return vals.indexOf(pr) >= 0; };
    var e = b[n - 30].close, d = { type: 'long', a: { t: b[n - 30].time, price: e }, b: { t: b[n - 10].time, price: e }, sl: Math.round((e - 0.0006) * 1e5) / 1e5, tp: Math.round((Math.max(hb.high, e) + 0.0040) * 1e5) / 1e5 };
    DW.list.push(d); DW.sel = DW.list.indexOf(d); P._render(); await W(400);
    var ax = P._xOfT(0, d.a.t);
    var dragTo = async function (fromY, toY, o) { mev('mousedown', ax, fromY); await W(40); mev('mousemove', cx, (fromY + toY) / 2, o); await W(40); mev('mousemove', cx, toY, o); await W(40); var w = pAt(toY); mev('mouseup', cx, toY, o); await W(60); P._render(); await W(60); return w; };
    var topO = y(hb.high), far = topO - 40;   // well above the candle under the mouse
    MAG.setMode('weak'); await W(30);
    ok('picking a mode turns the magnet on', MAG.on());
    var w1 = await dragTo(y(d.tp), far);
    ok('Weak, far from the candle: the target stays where the mouse is', Math.abs(d.tp - w1) < 0.0001 && !isO(d.tp), [d.tp, w1]);
    var w2 = await dragTo(y(d.tp), topO - 5);
    ok('Weak, close to the candle: it catches the candle\'s price', isO(d.tp), [d.tp, vals]);
    await dragTo(y(d.tp), far);
    MAG.setMode('strong'); await W(30);
    await dragTo(y(d.tp), far);
    ok('Strong, however far: on the candle\'s price', isO(d.tp), [d.tp, vals]);
    MAG.setMode('weak'); await W(30);
    await dragTo(y(d.tp), far);
    var w3 = await dragTo(y(d.tp), topO - 5, { ctrlKey: true });
    ok('Ctrl: free, even close to the candle', !isO(d.tp) && Math.abs(d.tp - w3) < 0.0001, [d.tp, w3]);
    MAG.set(false); await W(30);
    await dragTo(y(d.tp), far);
    var w4 = await dragTo(y(d.tp), topO - 5);
    ok('the magnet off: where the mouse is', !isO(d.tp) && Math.abs(d.tp - w4) < 0.0001, [d.tp, w4]);
    await dragTo(y(d.tp), far);
    var w5 = await dragTo(y(d.tp), far - 30, { ctrlKey: true });
    ok('the magnet off, Ctrl: snaps to the candle, as TradingView\'s', isO(d.tp), [d.tp, vals]);
    DW.list.splice(DW.list.indexOf(d), 1); P._render();

    // the arrow and its menu, on Replay's rail
    try { P.close(); } catch (x) {} await W(300);
    P._lv().mode = 'replay'; C = P._cfg(); C.layout = 1; C.resume = { sym: 'EURUSD', day: '2026-10-01', now: 0, at: Date.now() }; C.max = false; try { localStorage.removeItem('st_plat'); } catch (x) {}
    document.querySelector('.tab[data-page="livecharts"]').click(); for (k = 0; k < 150 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100); await W(1200);
    var mg = document.getElementById('stpr-magnet');
    ok('on the platform: the magnet is on the rail', !!mg.closest('.plat-left'), mg.parentNode && mg.parentNode.className);
    if (mg.closest('.plat-left')) {
      var mr = mg.getBoundingClientRect(), ca = getComputedStyle(mg, '::after');
      ok('the magnet has its arrow, as the tools beside it', ca.content !== 'none' && ca.width === '11px', [ca.content, ca.width]);
      mg.dispatchEvent(new MouseEvent('click', { clientX: mr.right + 3, clientY: mr.top + mr.height / 2, bubbles: true, cancelable: true })); await W(60);
      var menu = document.querySelector('.st-magmenu'), rows = menu ? Array.prototype.map.call(menu.querySelectorAll('button'), function (x) { return x.textContent; }) : [];
      ok('its arrow opens Weak magnet and Strong magnet', rows.join() === 'Weak magnet,Strong magnet' && !MAG.on(), rows);
      var mb = menu && menu.getBoundingClientRect(); ok('...beside it, on the screen', mb && mb.left >= mr.right && mb.right <= innerWidth && mb.bottom <= innerHeight, mb && [mb.left, mr.right]);
      menu.querySelector('[data-magm="strong"]').click(); await W(60);
      ok('...Strong picked: on, Strong, the menu shut, the button says so', MAG.on() && MAG.mode() === 'strong' && !document.querySelector('.st-magmenu') && mg.classList.contains('on') && /Strong magnet on/.test(mg.title), mg.title);
      mg.click(); await W(40); ok('a click on the magnet itself still switches it off', !MAG.on() && !mg.classList.contains('on'));
      mg.click(); await W(40); ok('...and on again, in the mode picked', MAG.on() && MAG.mode() === 'strong'); MAG.setMode('weak'); await W(30);
      mg.dispatchEvent(new MouseEvent('click', { clientX: mr.right + 3, clientY: mr.top + 5, bubbles: true })); await W(40);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(40); ok('...Esc shuts the menu', !document.querySelector('.st-magmenu'));
    }
    try { P.close(); } catch (x) {} await W(400);

    // ---- Trade Replay ----
    var R = window.__stReplay;
    R.open({ mt5Ticket: 999999932, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13095, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 });
    for (k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(800);
    var S = R._s(), chart = document.getElementById('strp-chart'), r2 = chart.getBoundingClientRect(), bi = Math.max(0, S.cursor - 20), bp = S.bars[bi].close, ts = S.chart.timeScale();
    var mv2 = function (t, xx, yy, o) { var el = document.elementFromPoint(r2.left + xx, r2.top + yy) || chart; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r2.left + xx, clientY: r2.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mouseup' ? 0 : 1, detail: 1 }, o || {}))); };
    var rd = { type: 'short', a: { idx: bi, price: bp }, b: { idx: bi + 12, price: bp }, sl: Math.round((bp + 0.0005) * 1e5) / 1e5, tp: Math.round((bp - 0.0015) * 1e5) / 1e5 };
    S.drawings.push(rd); S.sel = S.drawings.indexOf(rd); document.getElementById('strp-scrub').dispatchEvent(new Event('input', { bubbles: true })); await W(400);
    var hi2 = Math.max(0, S.cursor - 12), hb2 = S.bars[hi2], rx = ts.logicalToCoordinate(bi), cx2 = ts.logicalToCoordinate(hi2), v2 = [hb2.open, hb2.high, hb2.low, hb2.close], yy = function (pr) { return S.series.priceToCoordinate(pr); };
    var low2 = yy(hb2.low), far2 = low2 + 40;
    var dr2 = async function (toY, o) { var y0 = yy(rd.tp); mv2('mousedown', rx, y0, o); await W(40); mv2('mousemove', cx2, (y0 + toY) / 2, o); await W(40); mv2('mousemove', cx2, toY, o); await W(40); var w = S.series.coordinateToPrice(toY); mv2('mouseup', cx2, toY, o); await W(60); return w; };
    MAG.setMode('weak'); await W(30);
    var w6 = await dr2(far2);
    ok('Trade Replay, Weak, far from the candle: where the mouse is', Math.abs(rd.tp - w6) < 0.0001 && v2.indexOf(rd.tp) < 0, [rd.tp, w6]);
    await dr2(low2 + 5);
    ok('...close to it: it catches', v2.indexOf(rd.tp) >= 0, [rd.tp, v2]);
    MAG.setMode('strong'); await W(30); await dr2(far2);
    ok('...Strong, however far: on the candle\'s price', v2.indexOf(rd.tp) >= 0, [rd.tp, v2]);
    var sm = document.getElementById('strp-magnet');
    if (sm.closest('.strp-plleft')) { var sr = sm.getBoundingClientRect(); sm.dispatchEvent(new MouseEvent('click', { clientX: sr.right + 3, clientY: sr.top + 8, bubbles: true, cancelable: true })); await W(60); var mn = document.querySelector('.st-magmenu'); ok('Trade Replay: the same arrow and menu', !!mn && mn.querySelectorAll('button').length === 2 && mn.querySelector('[aria-checked="true"]').getAttribute('data-magm') === 'strong'); if (mn) mn.querySelector('[data-magm="weak"]').click(); await W(40); ok('...Weak picked', MAG.mode() === 'weak' && MAG.on()); }
    MAG.set(false);
    try { document.getElementById('strp-close').click(); } catch (x) {}
  } catch (e2) { ok('test ran', false, String(e2 && e2.stack || e2)); }
  try { window.__stDrawBar.magnet.set(false); } catch (x) {}
  return out;
})()
