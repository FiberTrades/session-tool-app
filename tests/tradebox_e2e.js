(async function () {
  // Your trades' boxes as Long / Short drawings on Live Charts (Nestor, 22 Oct 2026: "i need them to stay in place once the trade is
  // finished and also make them like the other position tools so i can always manually change them if i want to or delete them by
  // clicking on them"). Stand-in trades only (made up here: nothing reaches a real account). Live Charts in the tab, EUR/USD.
  // Run: python tests/browser_test.py tests/tradebox_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var L0 = null, real = null;
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stLC); i++) await W(100);
    await W(800);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [1, 60, 15, 240]; C.max = false; C.resume = null; C.mini = false; C.showPer = {}; C.tbMade = {}; C.tbFrom = 0; C.mm = Object.assign({}, C.mm, { col: true });
    window.__stLcForce = true;
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 250 && !(P._s() && P._s().live && P._panes().length && P._panes()[0].n); k++) await W(100);
    await W(500);
    var S = P._s(), p = P._panes()[0], DW = P._dr(), sym = S.sym.raw, list = function () { return P._dr().list; };
    var trade = function (key) { return list().filter(function (d) { return d && d.trade === key; })[0]; };
    // an open sell, its stop moved to break-even
    var b1 = p.bars[p.bars.length - 20], op = b1.close, rp = 0.0004;
    var idea = { main: { ticket: 9001, symbol: sym, direction: 'short', openedAt: b1.time * 1000, tick: { op: op, rpx: rp, sl: 0, tp: 5 } } };
    L0 = window.__stLive; real = L0 && L0.openIdeas;
    if (L0) L0.openIdeas = function () { return idea ? [idea] : []; }; else window.__stLive = { openIdeas: function () { return idea ? [idea] : []; } };
    // a sell closed earlier today, from its MT5 history (first stop and target)
    var b0 = p.bars[p.bars.length - 60], b0x = p.bars[p.bars.length - 40], e0 = b0.close;
    var hist = [{ ticket: 9000, symbol: sym, direction: 'sell', lots: 1, entry_price: e0, exit_price: e0 - 0.0008, open_time: new Date(b0.time * 1000).toISOString(), close_time: new Date(b0x.time * 1000).toISOString(), pnl: 80, risk_gbp: 40, login: '',
      sl_moves: [[b0.time, e0 + 0.0004], [b0.time + 300, e0]], tp_moves: [[b0.time, e0 - 0.0020]], sl_pips: 4, tp_pips: 20 }];
    C.tbFrom = b0.time - 3600;   // "today" for the test
    P._lvTr(hist); P._render(); await W(400);
    var d0 = trade('tb:9000'), d1 = trade('tb:9001');
    ok('a trade closed today: a Short position drawing from its open to its close, with the stop and target it was taken with', d0 && d0.type === 'short' && d0.a.t === b0.time && d0.b.t === b0x.time && Math.abs(d0.sl - (e0 + 0.0004)) < 1e-9 && Math.abs(d0.tp - (e0 - 0.0020)) < 1e-9 && !d0.live, d0);
    ok('the open trade: a Short position drawing, its stop the original one (1R) though the stop is at break-even, running to now', d1 && d1.type === 'short' && Math.abs(d1.sl - (op + rp)) < 1e-9 && d1.live === 1, d1);
    var geo = P._bbox(0, d1), xNow = p.chart.timeScale().timeToCoordinate(p.bars[p.bars.length - 1].time);
    ok('...its box reaches the latest candle', geo && xNow != null && geo.x1 >= xNow - 2, [geo, xNow]);
    // it is a drawing like any other: a click on it selects it (its toolbar), and it can be moved
    var bb = P._bbox(0, d0), h = P._hit(0, (bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2);
    ok('a click on a trade\'s box takes it like any drawing', h && list()[h.i] === d0, h);
    // the open trade closes: its box ends at the close and stays
    var xT = p.bars[p.bars.length - 3].time; idea = null;
    P._lvTr(hist.concat([{ ticket: 9001, symbol: sym, direction: 'sell', lots: 1, entry_price: op, exit_price: op - 0.0010, open_time: new Date(b1.time * 1000).toISOString(), close_time: new Date(xT * 1000).toISOString(), pnl: 100, risk_gbp: 40, login: '' }]));
    P._render(); await W(300); d1 = trade('tb:9001');
    ok('the trade closes: its box stays, ending at the close', d1 && !d1.live && d1.b.t === xT && Math.abs(d1.sl - (op + rp)) < 1e-9, d1);
    // deleted by hand: it does not come back
    var ix = list().indexOf(d0); list().splice(ix, 1); P._render(); await W(300);
    ok('deleted by hand, it does not come back', !trade('tb:9000') && C.tbMade['tb:9000'] === 1, Object.keys(C.tbMade));
    // Position tool off on this chart: the trade boxes go from it (and cannot be clicked there)
    C.showPer = { 0: { pos: false } }; P._render(); await W(300); bb = P._bbox(0, d1);
    var h2 = bb ? P._hit(0, (bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2) : null;
    ok('Position tool off on the chart: its trade boxes are not on it, nor clickable', !h2 || list()[h2.i] !== d1, h2);
    C.showPer = {};
    // a box of its own colours, from its toolbar
    ok('a position\'s toolbar has its target and stop colours', (function () { DW.sel = list().indexOf(d1); P._props(); var b = document.querySelector('.stdb-bar'); return !!(b && b.querySelector('[data-db="ptgt"]') && b.querySelector('[data-db="pstop"]')); })());
    // and Chart settings no longer have the position tools' colours
    ok('Chart settings: no position tools\' colours there any more', !/Position tools/.test((function () { try { document.getElementById('stpr-lookbtn').click(); } catch (e) {} var m = document.getElementById('stpr-menu'); var t = m ? m.textContent : ''; try { document.getElementById('stpr-lookbtn').click(); } catch (e) {} return t; })()));
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { if (L0) L0.openIdeas = real; else delete window.__stLive; } catch (e) {}
  window.__stLcForce = false;
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
