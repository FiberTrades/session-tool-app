(async function () {
  // Practice Replay: his Minimalist's volume profile (Minimalist-v4.pine: the POC vote and the liquidity arrows) from the
  // candles' tick volume (Nestor, 17 Oct 2026: "Tick volume from the EA, but the EA should only send the information
  // about the P/D zone selected"). Real EUR/USD, Thu 15 Oct 2026 (a day inside the candle store's stand-in (tests/fixtures/candles: its 1-minute sample is the week of 12-16 Oct 2026), so the day and the history before it are the same real candles); the volume is put on the candles here (the EA 9.00 sends it).
  // Run: python tests/browser_test.py tests/practice_vp_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var near = function (a, b) { return Math.abs(a - b) < 1e-9; };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    // ---- the calculation, by hand (5 rows between 1.0 and 1.5) ----
    var bar = function (h, l, c) { return { time: 0, open: c, high: h, low: l, close: c }; };
    var B1 = [bar(1.5, 1.0, 1.25), bar(1.16, 1.14, 1.15), bar(1.46, 1.44, 1.45), bar(1.36, 1.34, 1.35), bar(1.06, 1.04, 1.05)];
    var r1 = P._vpCalc(B1, [10, 50, 15, 25, 20], 0, 5, { vpRows: 5, vpSig: 0 });
    ok('rows of volume: [20, 50, 10, 25, 15]; the POC the busiest row (1.15)', r1 && r1.v1.join() === '20,50,10,25,15' && near(r1.poc, 1.15), r1);
    ok('an arrow on the row busier than both neighbours and above the mean (1.35, at half the busiest)', r1 && r1.peaks.length === 1 && near(r1.peaks[0].price, 1.35) && near(r1.peaks[0].r, 0.5), r1 && r1.peaks);
    var r2 = P._vpCalc(B1, [10, 50, 15, 25, 20], 0, 5, { vpRows: 5, vpSig: 1 });
    ok('Peak Threshold 1.0 (mean + one standard deviation, 37.9): no arrow', r2 && r2.peaks.length === 0 && Math.abs(r2.thr - (24 + Math.sqrt(194))) < 1e-9, r2 && r2.thr);
    var B2 = [bar(1.5, 1.0, 1.25), bar(1.16, 1.14, 1.15), bar(1.46, 1.04, 1.45)];
    var r3 = P._vpCalc(B2, [1, 40, 60], 0, 3, { vpRows: 5, vpSig: 0 });
    ok('the POC is the four profiles\' vote, as in his script: (H+L)/2 says 1.25, the other three 1.35 / 1.45 / 1.35 -> 1.35', r3 && near(r3.poc, 1.35) && r3.peaks.length === 1 && near(r3.peaks[0].price, 1.25), r3);
    ok('a candle with no volume: nothing drawn, it says what is missing', (function () { var m = P._vpCalc(B1, [10, null, 15, 25, 20], 0, 5, { vpRows: 5 }); return m && m.miss === 1 && !m.peaks; })());

    // ---- on the chart ----
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.look = {}; C.mini = true; C.miniOff = {}; C.miniS = { vpOn: true, ext: 0, vpOff: 2 }; C.max = true; C.resume = null; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-15' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('12:00'); await W(500);
    // the window shows the group, as in his panel
    P._miniDialog(); await W(80);
    var dl = document.querySelector('.stpr-dlg'), secs = Array.prototype.map.call(dl.querySelectorAll('.stpr-dsec'), function (x) { return x.textContent; });
    var labels = dl.textContent;
    ok('the Minimalist window: Volume Profile between Premium & Discount Zones and Sessions, his rows', secs.join('|').indexOf('Premium & Discount Zones|Volume Profile|Sessions') >= 0
      && /━━ Show Liquidity Arrows/.test(labels) && /Peak Threshold \(σ multiplier\)/.test(labels) && /Rows \(match TV FRVP Row Size\)/.test(labels) && /Arrow Offset \(bars\)/.test(labels) && /Arrow Color/.test(labels) && /Dominant POC Color/.test(labels), secs);
    var tipEl = dl.querySelector('[data-k="vpSig"]').closest('.stpr-dr').querySelector('.stpr-dinfo');
    ok('his notes on the (i): Peak Threshold\'s, word for word', tipEl && /^Filters which volume rows qualify as significant peaks worth marking with liquidity arrows\./.test(tipEl.title) && /2\.0\+ = very strict/.test(tipEl.title), tipEl && tipEl.title.slice(0, 80));
    var keep = C.miniS; C.miniS = {}; var d0 = P._ms(); C.miniS = keep;
    ok('his defaults: arrows off, 0.0, 16 rows, 6 bars, silver at 70%, red POC', d0.vpOn === false && d0.vpSig === 0 && d0.vpRows === 16 && d0.vpOff === 6 && d0.vpCol === 'rgba(178,181,190,0.7)' && d0.vpPoc === 'rgba(242,54,69,1)', d0);
    dl.querySelector('[data-dc]').click(); await W(40);

    // signed out: no volume on these candles yet, nothing to ask with (the page's own copy: the real store has since got volume
    // on some of these candles from the EA answering asks like this one - 18 Oct 2026)
    var stc = P._static(); Object.keys(stc).forEach(function (key) { if (key.split('|')[0] !== 'EURUSD') return; (stc[key].rows || []).forEach(function (b) { b.vol = null; }); (stc[key].agg || []).forEach(function (b) { b.vol = null; }); });
    (P._s().base || []).forEach(function (b) { b.vol = null; });   // the day's own 1-minute candles too: the store has their volume since 28 Sep 2026
    var p0 = P._panes()[0]; P._miniFresh(); P._render(); await W(120);
    var M = P._mini(0);
    ok('candles without volume (stored before EA 9.00): no arrows; signed out it says to sign in', M && M.vp && M.vp.miss > 0 && M.vp.st === 'out', M && M.vp);
    // signed in: it asks the EA once, for exactly the candles the zone needs
    var asked = null, V = P._vol(); V.uid = 'u-test'; V.sb = { from: function (t) { return { insert: function (rows) { if (t === 'candle_requests') asked = rows; return Promise.resolve({}); } }; } };
    P._miniFresh(); P._render(); await W(150);
    M = P._mini(0); var S0 = P._s(), z = M.zone, B = p0.bars;
    ok('signed in: it asks the EA (candle_requests, note vol): the 15m candles of the zone before the day, and the day\'s own candles', asked && asked.length === 2 && asked[0].symbol === 'EURUSD' && asked[0].tf === 15 && asked[0].from_t === B[z.i0].time && asked[0].to_t < S0.f.open && asked[0].note === 'vol' && asked[0].user_id === 'u-test'
      && asked[1].tf === S0.baseTf && asked[1].from_t === S0.f.open && asked[1].to_t === S0.f.close - 1 && M.vp.st === 'asked', asked);
    var n1 = asked ? asked.length : 0; asked = null; P._miniFresh(); P._render(); await W(150);
    ok('once: drawn again, it does not ask again', asked === null && n1 === 2);
    try { clearInterval(V.t); V.t = 0; } catch (e) {}
    // EA 9.07 (20 Oct 2026): the member's MT5 has no candles that far back - its answer reads back, and the chart says why
    var ks = Object.keys(V.asked), o0 = V.asked[ks[0]], q0 = null;
    V.sb = { from: function (t) { var c = { _t: t, select: function () { return c; }, eq: function (k, v) { q0 = q0 || {}; q0[k] = v; return c; }, order: function () { return c; }, limit: function () { return Promise.resolve({ data: [{ status: 'nodata', maxbars: 100000 }] }); }, insert: function () { return Promise.resolve({}); } }; return c; } };
    var nh = await P._volNoHist(o0);
    ok('MT5 says it has none (candle_requests nodata, its Max bars): read back for that ask', nh === true && o0.nohist === 100000 && q0 && q0.symbol === 'EURUSD' && q0.tf === o0.tf && q0.from_t === o0.from && q0.to_t === o0.to, [nh, o0.nohist, q0]);
    var said = [], ft = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (s) { said.push(String(s)); return ft.apply(this, arguments); };
    window.__stEA = window.__stEA || {}; var rowsWas = window.__stEA.rows; window.__stEA.rows = function () { return { a: { ea_version: '9.07' } }; };
    P._miniFresh(); P._render(); await W(200); CanvasRenderingContext2D.prototype.fillText = ft; window.__stEA.rows = rowsWas;
    M = P._mini(0);
    ok('...the chart says why, not "is MT5 open?" (Nestor, 20 Oct 2026: "the volumen tool ... stays empty if i go back a few month")', M.vp.st === 'nohist' && said.some(function (s) { return /^Volume profile: your MT5 doesn’t go back this far$/.test(s); }) && !said.some(function (s) { return /is MT5 open/.test(s); }), [M.vp.st, said.filter(function (s) { return /Volume profile/.test(s); })]);
    ks.forEach(function (k) { delete V.asked[k].nohist; V.asked[k].fail = false; });
    // the volume arrives (as the EA sends it): it goes onto the candles here and the arrows are drawn
    var st = P._static(), vofb = function (b) { return Math.max(1, Math.round((b.high - b.low) * 1e5)) + (Math.round(b.close * 1e5) % 7); };
    Object.keys(st).forEach(function (key) { var e = st[key], ps = key.split('|'); if (ps[0] !== 'EURUSD') return; P._volMerge('EURUSD', +ps[2] === 720 ? 240 : (+ps[2] >= 1440 ? 1440 : +ps[2]), e.rows.map(function (b) { return { time: b.time, vol: vofb(b) }; })); });
    P._volMerge('EURUSD', S0.baseTf, S0.base.map(function (b) { return { time: b.time, vol: vofb(b) }; }));
    await W(200); M = P._mini(0);
    ok('the volume came in: it is on every candle of the window, the profile is worked out', M && M.vp && !M.vp.miss && M.vp.v1.length === 16 && p0.vols.slice(z.i0).every(function (v) { return v != null; }), M && M.vp && { miss: M.vp.miss, rows: M.vp.rows });
    // its own check: the same numbers by hand from the chart's candles
    var lo = Infinity, hi = -Infinity; for (i = z.i0; i < (z.iTo); i++) { if (B[i].high > hi) hi = B[i].high; if (B[i].low < lo) lo = B[i].low; }
    var bs = (hi - lo) / 16, v1 = []; for (i = 0; i < 16; i++) v1.push(0);
    for (i = z.i0; i < z.iTo; i++) { var ix = Math.max(0, Math.min(15, Math.floor(((B[i].high + B[i].low) / 2 - lo) / bs))); v1[ix] += p0.vols[i]; }
    ok('rows of the zone\'s window match a count by hand', v1.join() === M.vp.v1.join() && near(M.vp.bot, lo) && near(M.vp.top, hi), [v1.join(), M.vp.v1.join()]);
    // drawn: the POC tag in red, offset 2 candles past now (Extend Right 0)
    P._render(); await W(150); var dpr = window.devicePixelRatio || 1;
    var xs = p0.chart.timeScale().logicalToCoordinate(M.n - 1 + 2), yp = P._yOf(0, M.vp.poc), px = p0.ov.getContext('2d').getImageData(Math.round((xs + 10) * dpr), Math.round(yp * dpr), 1, 1).data;
    ok('the POC tag is drawn in his red, 2 candles right of now, at the POC', xs != null && px[0] > 180 && px[1] < 110 && px[3] > 200, [xs, yp, Array.from(px)]);
    var pk = M.vp.peaks[0], ypk = pk ? P._yOf(0, pk.price) : null, px2 = pk ? p0.ov.getContext('2d').getImageData(Math.round((xs + 10) * dpr), Math.round(ypk * dpr), 1, 1).data : null;
    ok('a peak tag in silver, its strength as its opacity', pk && px2 && px2[0] > 60 && Math.abs(px2[0] - px2[2]) < 40 && px2[3] > 40, pk && [pk, Array.from(px2)]);
    // switched off: none
    C.miniS = Object.assign({}, C.miniS, { vpOn: false }); P._miniFresh(); P._render(); await W(150);
    var px3 = p0.ov.getContext('2d').getImageData(Math.round((xs + 10) * dpr), Math.round(yp * dpr), 1, 1).data;
    ok('Show Liquidity Arrows off: no tags', !(P._mini(0).vp) && !(px3[0] > 180 && px3[1] < 110 && px3[3] > 200), Array.from(px3));
    V.uid = null; V.sb = null; Object.keys(V.asked).forEach(function (k) { delete V.asked[k]; });
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
