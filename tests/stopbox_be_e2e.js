(async function () {
  // The position box keeps the trade's ORIGINAL stop once the stop has moved to break-even (Nestor, 22 Oct 2026: "when SL moves to BE dont
  // delete the SL size drawing", "i need it as reference and also to take screenshots for my session review"). A Replay buy moved to
  // break-even, and on Live Charts a stand-in open trade at break-even (made up here: nothing reaches a real account).
  // Run: python tests/browser_test.py tests/stopbox_be_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  // red-tinted pixels of the overlay in a column of the box, between two prices
  var redRows = function (p, x, pa, pb) { var c = p.ov, d = window.devicePixelRatio || 1, g = c.getContext('2d'), ya = p.series.priceToCoordinate(pa), yb = p.series.priceToCoordinate(pb), n = 0, m = 0;
    for (var y = Math.min(ya, yb) + 3; y < Math.max(ya, yb) - 3; y += 2) { var q = g.getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data; m++; if (q[3] > 0 && q[0] > q[1] + 20) n++; } return [n, m]; };
  // the strongest red on the overlay along the box's top edge (the original stop): a solid line is opaque, the box's own edge half
  var edgeA = function (p, x, price) { var c = p.ov, d = window.devicePixelRatio || 1, g = c.getContext('2d'), y = p.series.priceToCoordinate(price), a = 0;
    for (var dy = -2; dy <= 2; dy++) { var q = g.getImageData(Math.round(x * d), Math.round((y + dy) * d), 1, 1).data; if (q[0] > q[1] + 20) a = Math.max(a, q[3]); } return a; };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stLC); i++) await W(100);
    await W(800);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [5, 60, 15, 240]; C.max = true; C.resume = null; C.mini = false; C.pos = true; C.marks = true; C.showPer = {}; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('10:02'); P._place(1); for (k = 0; k < 8; k++) P._step(); P._render(); await W(300);
    var S = P._s(), p = P._panes()[0], pos = S.pos, sl0 = pos.entry - pos.dir * pos.rd, xMid = (p.chart.timeScale().timeToCoordinate(p.bars[p.bars.length - 4].time) || 300);
    var before = redRows(p, xMid, pos.entry, sl0);
    ok('Replay: a buy, its stop box from the entry to the stop, the stop\'s solid line along it', before[0] > before[1] * 0.6 && edgeA(p, xMid, sl0) > 200, [before, edgeA(p, xMid, sl0)]);
    var y0 = p.series.priceToCoordinate(sl0); pos.sl = pos.entry; pos.beDone = true; P._render(); await W(300);   // what the EA's break-even does
    var after = redRows(p, xMid, pos.entry, sl0);
    ok('...the chart does not jump: the original stop stays in view', Math.abs(p.series.priceToCoordinate(sl0) - y0) < 2, [y0, p.series.priceToCoordinate(sl0)]);
    ok('...stop moved to break-even: the stop box is still there, its original size', after[0] > after[1] * 0.6 && pos.sl === pos.entry, after);
    ok('...with its thin edge only: no thick line along its top', edgeA(p, xMid, sl0) > 0 && edgeA(p, xMid, sl0) < 200, edgeA(p, xMid, sl0));
    P.close(); await W(300);

    // Live Charts with a stand-in trade at break-even
    window.__stLcForce = true;
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (k = 0; k < 250 && !(P._s() && P._s().live && P._panes().length && P._panes()[0].n); k++) await W(100);
    await W(500); S = P._s(); p = P._panes()[0];
    var bar = p.bars[p.bars.length - 12], op = bar.close, rp = 0.0004;
    var idea = { main: { ticket: 7001, symbol: S.sym.raw, direction: 'long', openedAt: bar.time * 1000, tick: { op: op, rpx: rp, sl: 0, tp: 2 } } };
    var L0 = window.__stLive, real = L0 && L0.openIdeas;
    if (L0) L0.openIdeas = function () { return [idea]; }; else window.__stLive = { openIdeas: function () { return [idea]; } };
    P._render(); await W(400);
    var lv = P._lines(0).map(function (l) { return l.title; }).join(',');
    // since 22 Oct 2026 the box of a live trade is a Long / Short drawing (tradebox_e2e): its stop the original one
    var tb = P._dr().list.filter(function (d) { return d && d.trade === 'tb:7001'; })[0];
    var xm = p.chart.timeScale().timeToCoordinate(p.bars[p.bars.length - 5].time) || 300, live = redRows(p, xm, op, op - rp);
    ok('Live Charts: an open buy at break-even ("SL · BE" on the entry): its box (a position drawing) still shows the original 1R stop', /SL · BE/.test(lv) && tb && Math.abs(tb.sl - (op - rp)) < 1e-9 && live[0] > live[1] * 0.6, [lv, tb, live]);
    if (L0) L0.openIdeas = real; else delete window.__stLive;
    window.__stLcForce = false;
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
