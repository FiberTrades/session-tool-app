(async function () {
  // Compare, Back Testing (batch C, Nestor, 19 Oct 2026: "build all the tradingview suggestions!"): TradingView's Compare - another
  // stored symbol over a chart as a thin line of its closes, rebased to its change from the first candle on screen, up to three
  // per chart, each its colour, a legend at the top left (name, change, x), kept per chart with the chart settings. It respects
  // the replay's moment: never a candle that ends after it. Real candles of Thu 1 Oct 2026 (EUR/USD, gold, US100).
  // Run: python tests/browser_test.py tests/practice_cmp_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice, errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 2; C.lv = { 2: 'h' }; C.tfs = [5, 15, 60, 240]; C.speed = 4; C.look = {}; C.mini = false; C.max = true; C.news = false; C.cmp = []; C.cmpL = [{ s: 'BTCUSD', c: '#f5a623' }].map(function (x) { return [x]; }); C.syms = []; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[0].n && P._panes()[1].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._goto('10:00'); await W(500);
    var S = function () { return P._s(); }, pane = function (j) { return P._panes()[j || 0]; }, mn = document.getElementById('stpr-menu');
    var cb = document.getElementById('stpr-cmpbtn');
    ok('a Compare button beside the symbol button (TradingView\'s "Compare or Add Symbol")', cb && cb.offsetWidth > 0 && cb.previousElementSibling && cb.previousElementSibling.id === 'stpr-sym' && cb.title === 'Compare symbol' && !cb.classList.contains('on'), cb && cb.title);
    cb.click(); await W(150);
    var adds = function () { return Array.prototype.map.call(mn.querySelectorAll('[data-cmpadd]'), function (b) { return b.getAttribute('data-cmpadd'); }); };
    ok('its menu: Compare symbol, the charts to pick from (1, 2), the stored symbols but EUR/USD itself, a search', mn.classList.contains('show') && /Compare symbol/.test(mn.textContent) && mn.querySelectorAll('[data-cmpci]').length === 2 && adds().indexOf('XAUUSD') >= 0 && adds().indexOf('US100.cash') >= 0 && adds().indexOf('EURUSD') < 0 && mn.querySelector('#stpr-cmpq'), [adds(), mn.textContent.slice(0, 120)]);
    var q = mn.querySelector('#stpr-cmpq'); q.value = 'gold'; q.dispatchEvent(new Event('input', { bubbles: true })); await W(30);
    var noGold = mn.querySelector('#stpr-cmpls').textContent;
    q.value = 'xau'; q.dispatchEvent(new Event('input', { bubbles: true })); await W(30);
    ok('search: "xau" finds gold; nothing called "gold" stored says No symbol matches', adds().join() === 'XAUUSD' && /No symbol matches/.test(noGold), [adds(), noGold]);
    mn.querySelector('[data-cmpadd="XAUUSD"]').click();
    var c = null; for (k = 0; k < 60; k++) { await W(150); c = pane(0).cmp && pane(0).cmp.XAUUSD; if (c && c.cl && !c.none) break; }
    ok('gold compared on chart 1 (the chart last pressed - the first by default), kept in the chart settings, in its colour', c && !c.none && JSON.stringify(P._cfg().cmp[0]) === JSON.stringify([{ s: 'XAUUSD', c: '#f5a623' }]) && !(pane(1).cmp && pane(1).cmp.XAUUSD), [P._cfg().cmp, c && c.none]);
    ok('...its line in the list with an x, the menu still open; the button lit', mn.classList.contains('show') && mn.querySelector('.stpr-cmpo [data-cmpx="XAUUSD"]') && cb.classList.contains('on'));
    // no future leak: gold's candles stop where the replay is
    var X = P._cmpFeed('XAUUSD'), now = S().now, fut = X.base.filter(function (b) { return b.time >= now; }).length, xb = X.base.filter(function (b) { return b.time < now; }).pop();
    var cbars = P._cmpBars(0, 'XAUUSD'), lastC = cbars[cbars.length - 1];
    ok('the replay\'s moment: gold has ' + fut + ' candles after it stored, and none of them is used - its last close is gold\'s close just before now', fut > 50 && lastC.time < now && lastC.close === xb.close && cbars.every(function (b) { return b.time < now; }), [lastC, xb, now]);
    var dl = c.s.data(), pb = pane(0).bars;
    ok('its line runs on the chart\'s own candles only, to its last one', dl.length > 20 && dl[dl.length - 1].time === pb[pb.length - 1].time && dl.every(function (p) { return pane(0).times.indexOf(p.time) >= 0; }), [dl.length, dl[dl.length - 1], pb[pb.length - 1].time]);
    var r = pane(0).chart.timeScale().getVisibleLogicalRange(), i0 = Math.max(0, Math.ceil(r.from)), at0 = dl.filter(function (p) { return p.time === pb[i0].time; })[0];
    ok('rebased at the first candle on screen: it starts level with EUR/USD there', at0 && Math.abs(at0.value - pb[i0].close) < 1e-9, [at0, pb[i0].close]);
    var want = pb[i0].close * c.cl[pb.length - 1] / c.base;
    ok('then it moves by gold\'s own change since there', Math.abs(dl[dl.length - 1].value - want) < 1e-9 && Math.abs(c.cl[pb.length - 1] - xb.close) < 1e-9, [dl[dl.length - 1].value, want]);
    // zoomed, it starts level again at the new first candle
    P._zoom(0, { from: pb.length - 40, to: pb.length + 2 }); for (k = 0; k < 20; k++) { await W(80); P._drawOv(0); var r2 = pane(0).chart.timeScale().getVisibleLogicalRange(); if (r2 && Math.abs(r2.from - (pb.length - 40)) < 1) break; }
    await W(700); P._drawOv(0);   // let go: the lines re-anchor once the view has been still a moment (19 Oct 2026, steady compare)
    var dl3 = c.s.data(), i1 = Math.max(0, Math.ceil(pane(0).chart.timeScale().getVisibleLogicalRange().from)), at1 = dl3.filter(function (p) { return p.time === pb[i1].time; })[0];
    ok('moved to a later view, it is rebased there (level at the new first candle)', at1 && Math.abs(at1.value - pb[i1].close) < 1e-9, [at1, pb[i1].close]);
    var lg = pane(0).el.querySelector('.stpr-cmpl');
    var pct = function (a, b) { var v = a / b - 1; return (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(2) + '%'; }, jl = pb.length - 1;
    ok('the legend at the top left: EURUSD and gold, each its change since the first candle on screen, x on gold', lg && lg.textContent === 'EURUSD' + pct(pb[jl].close, pb[i1].close) + 'XAUUSD' + pct(c.cl[jl], c.base) + '×', lg && lg.textContent);
    var lr = lg.getBoundingClientRect(), pr = pane(0).el.getBoundingClientRect(), tl = pane(0).el.querySelector('.stpr-tlp') || pane(0).el.querySelector('.stpr-ptfw');
    ok('...under the chart\'s own buttons, at its left', lr.left - pr.left < 30 && lr.top >= tl.getBoundingClientRect().bottom - 1, [lr.left - pr.left, lr.top - pr.top, tl.getBoundingClientRect().bottom - pr.top]);
    // a step on: the next candle, still never past the moment
    P._step(); await W(200); var now2 = S().now, cb2 = P._cmpBars(0, 'XAUUSD');
    ok('a step on: gold follows to the new moment, still none past it', now2 > now && cb2[cb2.length - 1].time < now2 && cb2[cb2.length - 1].time >= lastC.time && c.s.data()[c.s.data().length - 1].time === pane(0).bars[pane(0).bars.length - 1].time, [now2, cb2[cb2.length - 1]]);

    // chart 2, its own; up to three
    mn.querySelector('[data-cmpci="1"]').click(); await W(60);
    ok('chart 2 picked: its own list (nothing yet)', mn.querySelector('[data-cmpci="1"]').classList.contains('on') && !mn.querySelector('.stpr-cmpo') && /Nothing compared on chart 2 yet/.test(mn.textContent));
    await P._cmpAdd(1, 'US100.cash'); await W(300);
    ok('US100 on chart 2 alone (its 15-minute candles)', pane(1).cmp && pane(1).cmp['US100.cash'] && !pane(1).cmp['US100.cash'].none && !(pane(0).cmp && pane(0).cmp['US100.cash']) && JSON.stringify(P._cfg().cmp[1]) === JSON.stringify([{ s: 'US100.cash', c: '#f5a623' }]), P._cfg().cmp);
    await P._cmpAdd(0, 'US100.cash'); await W(300);
    var c0 = pane(0).cmp;
    ok('a second on chart 1: its next colour (blue); two lines and their legend rows', c0 && c0.XAUUSD && c0['US100.cash'] && P._cfg().cmp[0][1].c === '#38bdf8' && pane(0).el.querySelectorAll('.stpr-cmpl .stpr-cmpr').length === 3, P._cfg().cmp[0]);
    P._cfg().cmp[0].push({ s: 'NOPESYM', c: '#c084fc' }); P._cmpDel(0, 'ZZZNONE'); await W(800);
    document.getElementById('stpr-win').click(); await W(40); P._cmpMenu(0); await W(80);
    ok('three on a chart: the menu says up to 3 and offers no more', /Up to 3 symbols on a chart/.test(mn.textContent) && !mn.querySelector('#stpr-cmpq'), mn.textContent.slice(0, 200));
    document.getElementById('stpr-win').click(); await W(40);
    P._render(true); await W(400);
    var nope = pane(0).el.querySelector('.stpr-cmpl [data-cmpid="NOPESYM"]');
    ok('a symbol with no candles says so in the legend (no stored candles) instead of drawing nothing', nope && /no stored candles/.test(nope.textContent), nope && nope.textContent);
    // remembered: closed and opened again
    P.close(); await W(300);
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[0].n); k++) await W(100);
    P._goto('10:00'); for (k = 0; k < 40 && !(pane(0).cmp && pane(0).cmp.XAUUSD && !pane(0).cmp.XAUUSD.none); k++) await W(150);
    ok('kept per chart: opened again, gold and US100 on chart 1, US100 on chart 2', pane(0).cmp && pane(0).cmp.XAUUSD && !pane(0).cmp.XAUUSD.none && pane(0).cmp['US100.cash'] && pane(1).cmp && pane(1).cmp['US100.cash'], [pane(0).cmp && Object.keys(pane(0).cmp), pane(1).cmp && Object.keys(pane(1).cmp)]);
    // x in the legend
    pane(0).el.querySelector('.stpr-cmpl [data-cmpx="NOPESYM"]').click(); await W(200);
    pane(0).el.querySelector('.stpr-cmpl [data-cmpx="XAUUSD"]').click(); await W(300);
    ok('x in the legend takes one off (its line and its row; the others stay)', !pane(0).cmp.XAUUSD && pane(0).cmp['US100.cash'] && JSON.stringify(P._cfg().cmp[0].map(function (x) { return x.s; })) === '["US100.cash"]' && pane(0).el.querySelectorAll('.stpr-cmpl .stpr-cmpr').length === 2, P._cfg().cmp[0]);
    ok('Live Charts keeps its own list (untouched)', JSON.stringify(P._cfg().cmpL) === JSON.stringify([[{ s: 'BTCUSD', c: '#f5a623' }]]), P._cfg().cmpL);
    ok('no page errors', errs.length === 0, errs);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
