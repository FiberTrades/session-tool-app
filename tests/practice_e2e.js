(async function () {
  // Practice Replay (14 Oct 2026). Nestor: "add a 3rd box for Practice replay, keep all 3 boxes in a row and build it how you
  // have displayed it", then "include the MT5 EA inside the practice replay so people can practice with it too and take
  // trades and use all its features in practice". Real EUR/USD 5m candles of Thu 1 Oct 2026 from the shared candles table
  // (read-only RPC), the London session at 08:00 on this PC's clock. The sell after the 08:15 candle is the one in the mockup:
  // 1.13147, a 12-pip stop, the 2R target reached at 09:35.
  // Run: python tests/browser_test.py tests/practice_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var near = function (a, b, tol) { return Math.abs(a - b) <= (tol || 1e-6); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1200);
    var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
    doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
    ok('every inline script parses', !bad.length, bad);

    // The Members area: three boxes in one row
    var hub = document.getElementById('vault-hub'), page = document.getElementById('page-vault');
    page.classList.add('active'); page.style.display = 'block'; hub.style.display = '';
    try { window.__stAcademyHub(); } catch (e) {}
    await W(200);
    var cards = Array.prototype.slice.call(hub.querySelectorAll('.vault-hub-card'));
    var tops = cards.map(function (c) { return Math.round(c.getBoundingClientRect().top); });
    ok('three boxes on the Members area', cards.length === 3 && cards[2].getAttribute('data-hub') === 'practice', cards.map(function (c) { return c.getAttribute('data-hub'); }));
    ok('all three in one row on a computer', tops.length === 3 && tops[0] === tops[1] && tops[1] === tops[2], tops);
    ok('the practice box reads Practice Replay', /Practice Replay/.test(cards[2].textContent) && /with your EA's panel|practice trade/.test(cards[2].textContent), cards[2].textContent.replace(/\s+/g, ' ').trim());

    var P = window.__stPractice;
    try { localStorage.removeItem('st_practice_cfg'); localStorage.removeItem('st_practice_log'); } catch (e) {}
    var C = P._cfg();
    var setCfg = function () { Object.assign(C, { riskMode: 'percent', riskPct: 1, bal: 10000, tpOn: true, tpMode: 'rr', tpVal: 2, tpPct: 100, beOn: true, beR: 1, beOffMode: 'pips', beOff: 0.5, ts: [], pc: [], tsUnit: 'rr', ord: 'market', ea: true });
      C.minSL.EURUSD = 3; C.maxSL.EURUSD = 15; C.stop.EURUSD = 12; C.seeded = true; };
    setCfg();
    var openDay = async function () { var r = await P.open({ symbol: 'EURUSD', tf: 5, day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._s().bars.length); k++) await W(100); return r; };
    var stepTo = function (hhmm) { var S = P._s(), g = 0; while (S && g++ < 400) { var t = new Date(S.bars[S.cursor - 1].time * 1000); var s = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); if (s >= hhmm) break; P._step(); S = P._s(); } };
    var playOut = function () { var g = 0; while (P._s() && P._s().pos && g++ < 400) P._step(); };

    var opened = await openDay();
    var S = P._s();
    ok('a real day loads: EUR/USD 5m on Thu 1 Oct 2026', opened && S && S.bars.length > 60 && S.sym === 'EURUSD' && S.tf === 5, S && { bars: S.bars.length });
    ok('the 1-minute candles play each 5-minute candle', S.simTf === 1 && S.sim.length > S.bars.length * 4, S && { simTf: S.simTf, sim: S.sim.length });
    var last = new Date(S.bars[S.cursor - 1].time * 1000);
    ok('it stops at the session open: the last candle shown is 07:55', last.getHours() === 7 && last.getMinutes() === 55, last.toString());
    var bg = document.getElementById('stpr-bg'), veil = document.getElementById('stpr-veil');
    for (var q = 0; q < 30 && !(veil.style.display === 'flex' && veil.getBoundingClientRect().width > 100); q++) await W(100);
    ok('the window is open with the rest of the day hidden', bg.classList.contains('show') && getComputedStyle(veil).display !== 'none' && veil.getBoundingClientRect().width > 100, { disp: veil.style.display, left: veil.style.left, w: veil.style.width, cw: document.getElementById('stpr-chart').clientWidth, cur: P._s().cursor, n: P._s().bars.length, ea: document.getElementById('stpr-ea').className });
    ok('the EA panel is on the chart', !document.getElementById('stpr-ea').classList.contains('hide') && /Minimalist Manager/.test(document.getElementById('stpr-ea').textContent));

    // 1) the mockup's trade: sell after the 08:15 candle, 12 pips, 2R, break-even at 1R
    stepTo('08:15');
    ok('price after the 08:15 candle is 1.13147', near(P._s().bars[P._s().cursor - 1].close, 1.13147), P._s().bars[P._s().cursor - 1].close);
    P._market(-1, 12);
    var p = P._s().pos;
    ok('sell placed: entry 1.13147, stop 1.13267, target 1.12907', p && near(p.entry, 1.13147) && near(p.sl, 1.13267, 1e-9) && near(p.tp, 1.12907, 1e-9), p && { e: p.entry, sl: p.sl, tp: p.tp });
    ok('risk is 1% of the 10,000 practice balance', p && near(p.rm, 100, 1e-6), p && p.rm);
    stepTo('08:30');
    p = P._s().pos;
    ok('break-even at 1R moved the stop 0.5 pip past entry', p && p.beDone && near(p.sl, 1.13142, 1e-9), p && { be: p.beDone, sl: p.sl });
    playOut();
    var d1 = P._s().done;
    ok('target hit at 09:35: +2.00R and +£200', d1 && d1.why === 'tp' && near(d1.r, 2, 0.001) && near(d1.money, 200, 0.01) && new Date(d1.exitTs * 1000).getHours() === 9, d1);
    ok('never more than 0.1R against', d1 && d1.mae <= 0.11, d1 && d1.mae);
    ok('the balance grows by the trade', near(C.bal, 10200, 0.01), C.bal);
    var row = document.getElementById('stpr-tr').textContent;
    ok('the result row says TARGET HIT +2.00R', /TARGET HIT/.test(row) && /\+2\.00R/.test(row) && /Keep playing/.test(row) && /Next day/.test(row), row.slice(0, 160));
    ok('the score in the corner reads +2.00R, 1 practice trade', /\+2\.00R/.test(document.getElementById('stpr-score').textContent) && /1 practice trade/.test(document.getElementById('stpr-score').textContent), document.getElementById('stpr-score').textContent);

    // 2) a partial close and a trailing step on the same trade
    await openDay(); setCfg(); C.pc = [50]; C.ts = [0.5]; stepTo('08:15'); P._market(-1, 12);
    p = P._s().pos;
    ok('P1 and T1 wait beyond the target until dragged', p && p.pc.length === 1 && p.ts.length === 1 && p.pc[0].trig < p.tp && p.ts[0].trig < p.tp, p && { pc: p.pc[0].trig, ts: p.ts[0].trig, tp: p.tp });
    p.pc[0].trig = 1.13027;   // 1R
    p.ts[0].trig = 1.12967;   // 1.5R: the stop goes to 0.5R in profit
    playOut();
    var d2 = P._s().done;
    ok('half closed at 1R, the rest at the target: +1.50R in 2 parts', d2 && d2.why === 'tp' && near(d2.r, 1.5, 0.001) && d2.parts === 2, d2);

    // 3) a stop-out
    await openDay(); setCfg(); stepTo('08:15'); P._market(1, 12); playOut();
    var d3 = P._s().done;
    ok('a buy there is stopped out: -1.00R', d3 && d3.why === 'sl' && near(d3.r, -1, 0.001), d3);

    // 4) orders: a Buy Limit above price is refused, a Sell Stop below fills
    await openDay(); setCfg(); stepTo('08:15');
    ok('a Buy Limit above price is refused', P._pending(1, 'limit', 1.1320, 10) === false && !P._s().pend);
    ok('a Sell Stop below price is accepted', P._pending(-1, 'stop', 1.1310, 10) === true && P._s().pend && P._s().pend.kind === 'stop');
    P._step();
    p = P._s().pos;
    ok('the Sell Stop fills at 1.13100 when price gets there', p && p.dir === -1 && near(p.entry, 1.131, 1e-9) && !P._s().pend, p && p.entry);
    P._riskOff();
    ok('Space (close half) leaves half the trade open', P._s().pos && near(P._s().pos.left, 0.5, 1e-9));
    P._closeAll('manual');
    ok('C (close all) closes the rest by hand', P._s().done && P._s().done.why === 'manual' && P._s().done.parts === 2, P._s().done);

    // 5) execution mode with the mouse: the stop follows the pointer, held between Min SL and Max SL, click to trade
    P._s().done = null; P._render();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true }));
    await W(50);
    ok('O turns execution mode on', P._s().exec === true && /Left-click mouse to execute a trade/.test(document.getElementById('stpr-hint').textContent), document.getElementById('stpr-hint').textContent);
    var ch = document.getElementById('stpr-chart'), r = ch.getBoundingClientRect();
    var series = null;   // read the price under a pixel through the chart itself
    var price = P._s().bars[P._s().cursor - 1].close;
    // a point below the price with Max SL at 4 pips: the stop clamps to 4 and it is a buy
    C.maxSL.EURUSD = 4;
    var yBelow = r.top + P._yOf(price - 0.0006), xMid = r.left + r.width * 0.5;
    ['pointermove', 'pointerdown', 'pointerup'].forEach(function (t) { ch.dispatchEvent(new PointerEvent(t, { clientX: xMid, clientY: yBelow, bubbles: true, pointerType: 'mouse', pointerId: 1 })); });
    await W(50);
    p = P._s().pos;
    ok('a click below price buys with the stop held at Max SL', p && p.dir === 1 && near(p.rd / 0.0001, 4, 0.01), p && { dir: p.dir, sl: p.rd / 0.0001 });
    ok('execution mode ends with the trade', P._s().exec === false);
    P._closeAll('manual');

    // 6) Gold loads too
    await P.open({ symbol: 'XAUUSD', tf: 5, day: '2026-10-01' }); for (var k = 0; k < 60 && !(P._s() && P._s().sym === 'XAUUSD'); k++) await W(100);
    ok('Gold (XAUUSD) loads with 2 decimals', P._s() && P._s().sym === 'XAUUSD' && P._s().bars.length > 60 && near(P._s().U, 0.01, 1e-12), P._s() && { bars: P._s().bars.length, U: P._s().U });

    // 7) nothing reaches the journal; the log keeps the practice trades
    var log = P.log();
    ok('the practice log kept the trades', log.length >= 5, log.length);
    var journalHit = false; try { journalHit = (getAllLifetimeTrades() || []).some(function (t) { return t && t.practice; }); } catch (e) {}
    ok('no practice trade in the journal', !journalHit);
    P.close();
    await W(200);
    ok('closing hides the window and the box counts the trades', !bg.classList.contains('show') && /practice trades/.test(document.getElementById('vault-hub-practice-meta').textContent), document.getElementById('vault-hub-practice-meta').textContent);
    try { localStorage.removeItem('st_practice_cfg'); localStorage.removeItem('st_practice_log'); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
