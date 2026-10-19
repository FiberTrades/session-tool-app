(async function () {
  // Custom timeframes (Nestor, 19 Oct 2026: "can we also have a TF picker? so if someone wants the 2m minute TF they can have it?"),
  // Back Testing (Live Charts shares the code): the + at the end of a chart's timeframes opens a box - a number, minutes or hours,
  // Add. The new timeframe is built from the largest stored one that divides it, joins the list (kept in the chart settings), and
  // can be taken off again with its x. Also: the layout button's icon at its size ("this icon is too small"). Real candles of
  // Thu 1 Oct 2026 (EUR/USD).
  // Run: python tests/browser_test.py tests/practice_ctf_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice, errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [5, 15, 60, 240]; C.look = {}; C.mini = false; C.max = true; C.news = false; C.cmp = []; C.ctf = [];
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._goto('11:00'); await W(500);
    var pane = function () { return P._panes()[0]; }, mn = document.getElementById('stpr-menu');

    // ---- the layout button's icon ----
    var li = document.querySelector('#stpr-laybtn .stpr-lyi'), lr = li && li.getBoundingClientRect(), lb = document.getElementById('stpr-laybtn').getBoundingClientRect();
    ok('the layout button\'s icon fills its box: 23 x 17 (it was squeezed to 10 x 10 by the arrow\'s rule), not dimmed', lr && Math.round(lr.width) === 23 && Math.round(lr.height) === 17 && getComputedStyle(li).opacity === '1' && lb.height >= lr.height + 6, lr && [lr.width, lr.height, getComputedStyle(li).opacity, lb.width, lb.height]);
    var chev = document.querySelector('#stpr-laybtn > svg:not(.stpr-lyi)'), cr = chev && chev.getBoundingClientRect();
    ok('...its small arrow keeps its 10 x 10', cr && Math.round(cr.width) === 10 && Math.round(cr.height) === 10, cr && [cr.width, cr.height]);

    // ---- the + and its box ----
    var pill = (pane().tfw || pane().el).querySelector('.stpr-tfpill'); pill.click(); await W(120);
    var seg = (pane().tfw || pane().el).querySelector('.stpr-tfseg'), add = seg.querySelector('.stpr-tfadd');
    ok('the chart\'s timeframes end with a +', add && add.offsetWidth > 0 && seg.lastElementChild === add && add.title === 'Custom timeframe', seg && seg.textContent);
    add.click(); await W(150);
    var inp = mn.querySelector('#stpr-tfn');
    ok('+ opens the box: Custom timeframe, a number (2), minutes or hours, Add, the hint', mn.classList.contains('show') && /Custom timeframe/.test(mn.textContent) && inp && inp.value === '2' && mn.querySelector('[data-tfu="1"].on') && mn.querySelector('[data-tfu="60"]') && mn.querySelector('[data-tfok]') && /1 minute to 24 hours/.test(mn.textContent) && document.activeElement === inp, mn.textContent);
    mn.querySelector('[data-tfok]').click();
    for (k = 0; k < 60 && !(pane() && pane().tf === 2 && pane().n > 10); k++) await W(100);
    var p2 = pane(), b2 = p2.bars, gaps = {}; for (k = 1; k < b2.length; k++) { var g = b2[k].time - b2[k - 1].time; gaps[g] = (gaps[g] || 0) + 1; }
    ok('Add: the chart is on 2m - its candles 2 minutes apart, its button says 2m', p2.tf === 2 && gaps[120] > 100 && (p2.tfw || p2.el).querySelector('.stpr-tfpill').textContent === '2m', [p2.tf, gaps, (p2.tfw || p2.el).querySelector('.stpr-tfpill').textContent]);
    var tfs = P._tfs();
    ok('...built from the 1-minute candles, with history before the day (as the 1m chart has)', tfs.SRC[2] === 1 && p2.static.length > 200 && p2.static.every(function (b) { return b.time % 120 === 0; }), [tfs.SRC[2], p2.static.length]);
    var m1 = P._paneBars(0).data.filter(function (b) { return b.open != null; }), bx = m1[m1.length - 3];
    ok('...each 2m candle is its two 1-minute candles (a candle starts on an even minute)', bx && bx.time % 120 === 0, bx);
    ok('...kept in the chart settings, and in the list between 1m and 5m', JSON.stringify(P._cfg().ctf) === '[2]' && tfs.TFS.indexOf(2) === 1 && tfs.TFL[2] === '2m' && P._cfg().tfs[0] === 2, [P._cfg().ctf, tfs.TFS.slice(0, 4)]);
    var seg2 = (pane().tfw || pane().el).querySelector('.stpr-tfseg'), names = Array.prototype.map.call(seg2.querySelectorAll('[data-tf]'), function (b) { return b.textContent; });
    ok('...the chart\'s timeframes show it: 1m 2m 5m 15m ...', names.slice(0, 4).join(' ') === '1m 2m 5m 15m', names);

    // hours
    pill = (pane().tfw || pane().el).querySelector('.stpr-tfpill'); pill.click(); await W(100);
    (pane().tfw || pane().el).querySelector('.stpr-tfadd').click(); await W(150);
    mn.querySelector('[data-tfu="60"]').click(); inp = mn.querySelector('#stpr-tfn'); inp.value = '3';
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    for (k = 0; k < 60 && !(pane() && pane().tf === 180 && pane().n > 3); k++) await W(100);
    var p3 = pane(), b3 = p3.static;
    ok('3 hours (Enter adds too): 3h, from the 1-hour candles, 3 hours apart within a day', p3.tf === 180 && P._tfs().TFL[180] === '3h' && P._tfs().SRC[180] === 60 && b3.length > 20 && b3.filter(function (b, j) { return j && b.time - b3[j - 1].time === 10800; }).length > b3.length / 2, [p3.tf, b3.length, P._tfs().SRC[180]]);
    ok('...both kept: 2m and 3h', JSON.stringify(P._cfg().ctf) === '[2,180]', P._cfg().ctf);

    // the box lists them, with an x; a wrong number is refused
    pill = (pane().tfw || pane().el).querySelector('.stpr-tfpill'); pill.click(); await W(100);
    (pane().tfw || pane().el).querySelector('.stpr-tfadd').click(); await W(150);
    var yours = Array.prototype.map.call(mn.querySelectorAll('[data-tfpick]'), function (b) { return b.textContent; });
    ok('the box lists yours: 2m and 3h, each with an x; 3h (on the chart) marked', yours.join() === '2m,3h' && mn.querySelectorAll('[data-tfx]').length === 2 && mn.querySelector('.stpr-tfci.on [data-tfpick="180"]'), yours);
    mn.querySelector('[data-tfu="60"]').click(); inp = mn.querySelector('#stpr-tfn'); inp.value = '25'; mn.querySelector('[data-tfok]').click(); await W(150);
    var fl = document.getElementById('stpr-flash');
    ok('25 hours is refused, with why (1 to 24 hours)', pane().tf === 180 && fl && /1 to 24 hours/.test(fl.textContent) && JSON.stringify(P._cfg().ctf) === '[2,180]', fl && fl.textContent);
    // 2m picked from the list
    mn.querySelector('[data-tfpick="2"]').click();
    for (k = 0; k < 60 && !(pane() && pane().tf === 2 && pane().n > 10); k++) await W(100);
    ok('picking 2m from the list puts the chart on it', pane().tf === 2);
    // x on 2m while the chart shows it: the chart goes to 1m (the standard one below), 2m leaves the list
    pill = (pane().tfw || pane().el).querySelector('.stpr-tfpill'); pill.click(); await W(100);
    (pane().tfw || pane().el).querySelector('.stpr-tfadd').click(); await W(150);
    mn.querySelector('[data-tfx="2"]').click();
    for (k = 0; k < 60 && !(pane() && pane().tf === 1 && pane().n > 10); k++) await W(100);
    var names2 = Array.prototype.map.call((pane().tfw || pane().el).querySelectorAll('.stpr-tfseg [data-tf]'), function (b) { return b.textContent; });
    ok('x takes 2m off: the chart goes to 1m, 2m is gone from its timeframes and the settings, 3h stays', pane().tf === 1 && names2.indexOf('2m') < 0 && names2.indexOf('3h') >= 0 && JSON.stringify(P._cfg().ctf) === '[180]' && !P._tfs().TFL[2], [pane().tf, names2, P._cfg().ctf]);
    // a standard one asked for again: no duplicate
    pill = (pane().tfw || pane().el).querySelector('.stpr-tfpill'); pill.click(); await W(100);
    (pane().tfw || pane().el).querySelector('.stpr-tfadd').click(); await W(150);
    mn.querySelector('[data-tfu="1"]').click(); inp = mn.querySelector('#stpr-tfn'); inp.value = '15'; mn.querySelector('[data-tfok]').click();
    for (k = 0; k < 60 && !(pane() && pane().tf === 15 && pane().n > 10); k++) await W(100);
    ok('15 minutes (a standard one) just picks 15m - nothing added', pane().tf === 15 && JSON.stringify(P._cfg().ctf) === '[180]' && P._tfs().TFS.filter(function (x) { return x === 15; }).length === 1, P._cfg().ctf);
    ok('no page errors', !errs.length, errs.slice(0, 4));
    P._cfg().ctf = []; P._cfg().tfs = [5, 15, 60, 240];
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
