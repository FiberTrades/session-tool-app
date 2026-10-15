(async function () {
  // Practice Replay: Play steps by the chart clicked last, its edge lit (Nestor, 15 Oct 2026: "when in practice replay i am
  // using 4 charts and i want to play candles forward how can i play forward the candles from the 15m chart ... can it be the
  // last chart i click on its borders highlights slightly").
  // Run: python tests/browser_test.py tests/practice_act_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice, C = P._cfg(); C.layout = 4; C.tfs = [1, 15, 60, 1440]; delete C.act;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 4); k++) await W(100);
    var panes = P._panes(), lit = function () { return panes.map(function (p) { return p.el.classList.contains('act') ? 1 : 0; }).join(''); };
    var tfs = panes.map(function (p) { return p.tf; });
    ok('set-up: four charts', panes.length === 4, tfs);
    var fin = tfs.indexOf(Math.min.apply(null, tfs));
    ok('nothing clicked yet: the finest chart is active, as before, and only its edge is lit', P._act() === fin && lit() === [0, 1, 2, 3].map(function (x) { return x === fin ? 1 : 0; }).join(''), { act: P._act(), lit: lit() });
    var press = function (p) { p.el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' })); document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); };
    P._jump('london'); await W(200);
    // click the 15m chart
    press(panes[1]); await W(50);
    ok('clicking the 15m chart makes it the active one: its edge is lit, the others are not', P._act() === 1 && lit() === '0100', { act: P._act(), lit: lit() });
    var t0 = P._s().now; P._step(); var t1 = P._s().now;
    ok('a step now moves 15 minutes (one 15m candle)', P._stepSec() === 900 && t1 - t0 > 0 && t1 - t0 <= 900 && t1 % 900 === 0, { from: t0, to: t1, step: P._stepSec() });
    t0 = P._s().now; P._step(); t1 = P._s().now;
    ok('...and the next one a whole 15 minutes', t1 - t0 === 900, t1 - t0);
    ok('it is remembered with the layout', C.act === 1, C.act);
    // the 1h chart
    press(panes[2]); await W(50); t0 = P._s().now; P._step(); t1 = P._s().now;
    ok('click the 1h chart: a step moves to the next whole hour', P._act() === 2 && lit() === '0010' && P._stepSec() === 3600 && t1 % 3600 === 0 && t1 > t0, { act: P._act(), lit: lit(), d: t1 - t0 });
    // the daily chart steps by 4 hours, not the whole day
    press(panes[3]); await W(50);
    ok('click the daily chart: steps are 4 hours, so the day does not end in one press', P._stepSec() === 4 * 3600, P._stepSec());
    // the 1m chart
    press(panes[0]); await W(50); t0 = P._s().now; P._step(); t1 = P._s().now;
    ok('back on the 1m chart: one minute a step', P._stepSec() === 60 && t1 - t0 === 60, t1 - t0);
    // one chart: no lit edge
    await P._layout(1); for (k = 0; k < 50 && P._panes().length !== 1; k++) await W(100);
    ok('with one chart there is nothing to choose: no lit edge', P._panes().length === 1 && !P._panes()[0].el.classList.contains('act'), P._panes()[0].el.className);
    try { Object.keys(localStorage).filter(function (x) { return /^st_practice/.test(x); }).forEach(function (x) { localStorage.removeItem(x); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
