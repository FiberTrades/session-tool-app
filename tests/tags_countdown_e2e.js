(async function () {
  // Two things on the price scale (Nestor, 22 Oct 2026): "the TP is covering the label" - a horizontal line's note on the TP's price
  // went under the trade's TP tag - and "when i am in execution mode the candle count down covers the price on the scale".
  // Replay, EUR/USD, Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/tags_countdown_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(800);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [5, 60, 15, 240]; C.max = true; C.resume = null; C.mini = false; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('10:02'); P._render(); await W(300);
    var p = P._panes()[0], last = function () { return p.bars[p.bars.length - 1]; }, priceY = function () { return p.series.priceToCoordinate(last().close); };
    // the countdown
    var cd = P._axl(0, 'cd');
    ok('not aiming: the time left sits where the price label was (as before), the price label off', cd && Math.abs(cd.y - priceY()) < 0.5 && p.series.options().lastValueVisible === false, [cd, priceY()]);
    P._exec(true); P._render(); await W(200); cd = P._axl(0, 'cd');
    ok('execution mode: the price label is back on the scale, the time left just under it', cd && p.series.options().lastValueVisible === true && cd.y - priceY() >= 15 && cd.y - priceY() <= 19, [cd, priceY(), p.series.options().lastValueVisible]);
    P._exec(false); P._render(); await W(200); cd = P._axl(0, 'cd');
    ok('out of execution mode again: back as it was', cd && Math.abs(cd.y - priceY()) < 0.5 && p.series.options().lastValueVisible === false, cd);
    // a trade, and a horizontal line with a note on its TP
    P._place(1); P._render(); await W(300);
    var tp = P._lines(0).filter(function (l) { return l.k === 'tp' && l.vis; })[0];
    ok('a buy: its TP tag on the scale', !!tp, P._lines(0));
    var DW = P._dr(), d = { type: 'hline', price: tp.p, text: 'LOW 29th May 2025', color: '#E5384F' };
    DW.list.push(d); P._render(); await W(400);
    var hl = (p.hl || []).filter(function (l) { return Math.abs(l.options().price - tp.p) < 1e-9; })[0], ov = p._hlOv || [];
    ok('the note on the TP\'s price: not under the TP tag any more - drawn just left of it, the line\'s own label on the scale kept', hl && hl.options().title === '' && hl.options().axisLabelVisible && ov.length === 1 && ov[0].t === 'LOW 29th May 2025' && ov[0].x > 10, [hl && hl.options().title, ov]);
    // drawn: the note's colour left of the tag, the tag's colour right of it
    var ovc = p.ov, dpr = window.devicePixelRatio || 1, g = ovc.getContext('2d'), y = Math.round(p.series.priceToCoordinate(tp.p) * dpr), pw = ovc.width / dpr - p.chart.priceScale('right').width();
    var at = function (x) { return Array.prototype.slice.call(g.getImageData(Math.round(x * dpr), y, 1, 1).data); };
    var inTag = pw - ov[0].x / 2;
    // the note is written the TradingView way: red letters just above the line, nothing painted behind them (28 Oct 2026, Nestor: "remove
    // all backgrounds from text") - so red somewhere along the words' band above the line, and nothing of ours on the line under them
    var redIn = function (x1) { for (var yy = -16; yy <= -2; yy++) for (var x = x1 - 150; x <= x1; x++) { var c = Array.prototype.slice.call(g.getImageData(Math.round(x * dpr), y + Math.round(yy * dpr), 1, 1).data); if (c[0] > 180 && c[1] < 120 && c[3] > 200) return true; } return false; };
    var bare = function (x1) { for (var x = x1 - 140; x <= x1 - 10; x += 3) { if (g.getImageData(Math.round(x * dpr), y, 1, 1).data[3] !== 0) return false; } return true; };
    ok('...on the overlay: red letters at the note, nothing of ours over the tag', redIn(pw - ov[0].x - 2) && at(inTag)[3] === 0, [at(inTag)]);
    ok('...and nothing painted behind the words: the line under them untouched (no box, no knock-out)', bare(pw - ov[0].x - 2));
    // moved off the TP: still the note's own words on the line, now against the scale (no box: the library's title stays empty)
    d.price = tp.p + 0.0020; P._render(); await W(400);
    hl = (p.hl || []).filter(function (l) { return Math.abs(l.options().price - d.price) < 1e-9; })[0]; var ov2 = p._hlOv || [];
    y = Math.round(p.series.priceToCoordinate(d.price) * dpr);
    ok('moved off the TP: the note against the scale, still on the line (no box)', hl && hl.options().title === '' && hl.options().axisLabelVisible && ov2.length === 1 && !ov2[0].x && redIn(pw - 2) && bare(pw - 2), [hl && hl.options().title, ov2]);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
