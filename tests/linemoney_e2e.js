(async function () {
  // An open trade's SL / TP money (26 Oct 2026, Nestor: his 5R target at £500 risk, 16.68 lots, 20 pips read £2,800 - it is about
  // £2,500): lots x distance x the value of a price move of 1.0 on one lot (EA 9.16's "vpu"), from one function for the platform's tags,
  // their hover and a drag's question. Stand-in trades; nothing is sent anywhere.
  // Run: python tests/browser_test.py tests/linemoney_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stPlMoneyAt); i++) await W(100);
    var M = window.__stPlMoneyAt, LV = window.__stPractice._lv(), r5 = function (v) { return Math.round(v * 100) / 100; };
    // his 26 Oct trade: SELL 16.68 EURUSD at 1.12153, stop 4 pips, target 20; the largest risk seen £560 (before the fill's anchor)
    var x = { long: false, r: { symbol: 'EURUSD', login: '541419576', lots: 16.68, risk: 500, risk0: 560 }, tk: { op: 1.12153, rpx: 0.0004, px: 1.12150, pnl: 37.4 } };
    LV.set = LV.set || {}; LV.set['EURUSD|541419576'] = { vpu: 74850 };
    var tp = M(x, 1.11953), sl = M(x, 1.12193);
    ok('the TP 20 pips away: 16.68 x 0.0020 x 74,850 = +£2,497 (not £2,800)', r5(tp) === 2497.0, tp);
    ok('the stop 4 pips away: −£499', r5(sl) === -499.4, sl);
    ok('a buy the other way round', r5(M({ long: true, r: x.r, tk: { op: 1.12153 } }, 1.12353)) === 2497.0);
    // an EA before 9.16 (no vpu): MT5's own profit over the move, once it has moved 3 pips
    delete LV.set['EURUSD|541419576'];
    var x2 = { long: false, r: { symbol: 'EURUSD', login: '541419576', lots: 16.68, risk: 500, risk0: 560 }, tk: { op: 1.12153, rpx: 0.0004, px: 1.12103, pnl: 624.3 } };
    ok('no vpu, moved 5 pips: from MT5\'s profit (624.30 / 5 pips) - the TP +£2,497', Math.abs(M(x2, 1.11953) - 2497.2) < 1, M(x2, 1.11953));
    ok('no vpu, barely moved: R x the risk at its stop now (5R x £500 = £2,500), never the £560 seen before the anchor', r5(M(x, 1.11953)) === 2500, M(x, 1.11953));
    var src = await fetch('/app.html', { cache: 'no-store' }).then(function (r) { return r.text(); });
    ok('the tags and their hover use it (mon(l.price)), and a drag\'s question too', /mon = function\(pr\)\{ var m = plMoneyAt\(x, pr\)/.test(src) && /esc\(mon\(l\.price\) \+ plR\(rr, 1\)\)/.test(src) && /plMoneyAt\(x, pr\) : NaN;   \/\/ the same money as its tag/.test(src));
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
