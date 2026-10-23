(async function () {
  // An EA whose clock is off (23 Oct 2026): his cloud 70K, started 12 minutes after Friday's close, sent every candle 12 minutes
  // late and Live Charts drew them between the stored ones ("something is very wrong with these candles"). The chart drops such
  // an answer (lvClockOff); a sound one still goes in.
  // Run: python tests/browser_test.py tests/clockoff_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stLC && window.__stLC._clockOff && window.__stPractice); i++) await W(100);
    var off = window.__stLC._clockOff, T = Math.floor(Date.now() / 1000 / 86400) * 86400 - 86400 + 13 * 3600;
    var base = [];
    for (var k = 0; k < 30; k++) { var o = 1.119 + k * 0.00007; base.push({ time: T + k * 60, open: +o.toFixed(5), high: +(o + 0.00011).toFixed(5), low: +(o - 0.00006).toFixed(5), close: +(o + 0.00004).toFixed(5) }); }
    var shift = function (bs, s) { return bs.map(function (b) { return { time: b.time + s, open: b.open, high: b.high, low: b.low, close: b.close }; }); };
    ok('the same candles 12 minutes late: dropped', off(shift(base.slice(-10), 720), 1, base) === true);
    ok('2 minutes late (the demo): dropped', off(shift(base.slice(-10), 120), 1, base) === true);
    ok('the same candles on time: kept', off(base.slice(-10), 1, base) === false);
    ok('new candles after the stored ones: kept', off(shift(base.slice(-5), 300).map(function (b, j) { return { time: b.time, open: b.open + 0.001, high: b.high + 0.001, low: b.low + 0.001, close: b.close + 0.001 }; }), 1, base) === false);
    var chance = [shift([base[3]], 60)[0], shift([base[10]], 180)[0], shift([base[20]], 420)[0]];
    ok('three candles repeated by chance at different distances (a quiet market): kept', off(chance, 1, base) === false);
    ok('a 5-minute candle off its boundary: dropped', off([{ time: T + 120, open: 1, high: 2, low: 0.5, close: 1.5 }], 5, null) === true);
    ok('a 1-hour candle on the half hour (a half-hour broker): kept', off([{ time: T + 1800, open: 1, high: 2, low: 0.5, close: 1.5 }], 60, null) === false);
    ok('a candle from the future: dropped', off([{ time: Math.floor(Date.now() / 1000) + 3 * 3600, open: 1, high: 2, low: 0.5, close: 1.5 }], 1, base) === true);

    // ---- Live Charts: a late answer leaves the chart's candles as they were ----
    var P = window.__stPractice, C = P._cfg(); C.layout = 1; C.tfs = [1, 60, 15, 240]; C.max = false;
    window.__stLcForce = true;
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (k = 0; k < 250 && !(P._s() && P._s().live && P._panes().length && P._panes()[0].n); k++) await W(100);
    await W(500);
    var F = (P._feeds() || [])[0];
    if (F && F.base && F.base.length >= 12) {
      F.ea = { raw: F.sym.raw, lg: '999', v: '9.11' };   // a stand-in EA on this chart's symbol
      var toRows = function (bs) { return bs.map(function (b) { return [b.time, b.open, b.high, b.low, b.close, 10].join(','); }).join(';'); };
      var before = JSON.stringify(F.base.slice(-40)), n0 = F.base.length;
      window.__stLC.bars({ s: F.sym.raw, lg: '999', tf: 1, i: 0, of: 1, rows: toRows(shift(F.base.slice(-12), 720)) }); await W(300);
      ok('Live Charts: a 12-minutes-late answer changes none of its candles', JSON.stringify(F.base.slice(-40)) === before && F.base.length === n0, [n0, F.base.length]);
      ok('...and the chart remembers that EA\'s clock is off (its live candles wait too)', !!F.clockOff, F.clockOff || null);
      F.clockOff = 0;
      var fresh = F.base.slice(-3).map(function (b) { return { time: b.time, open: b.open, high: b.high + 0.0001, low: b.low, close: b.close }; });
      window.__stLC.bars({ s: F.sym.raw, lg: '999', tf: 1, i: 0, of: 1, rows: toRows(fresh) }); await W(300);
      var got = F.base.filter(function (b) { return b.time === fresh[0].time; })[0];   // not the last: the stand-in's own price moves that one
      ok('a sound answer from the same EA still updates the candles', !F.clockOff && got && Math.abs(got.high - fresh[0].high) < 1e-9, [got && got.high, fresh[0].high, !!F.clockOff]);
    } else ok('Live Charts had stand-in minutes to test with', false, F ? (F.base || []).length : 'no feed');
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  window.__stLcForce = false;
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
