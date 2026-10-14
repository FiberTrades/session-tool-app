(async function () {
  // Practice Replay (14 Oct 2026). First built from the mockup ("add a 3rd box for Practice replay, keep all 3 boxes in a
  // row"), then reworked on Nestor's word the same evening: no EA panel ("remove the EA from practice replay, it doesnt
  // work well"); the whole day ("including ASIA. from open to day close": 17:00 New York to 17:00 New York, with Asia,
  // London and New York buttons); SL and TP drawn before BUY or SELL is pressed, the lines dragged to set them; no sign
  // over the hidden part; maximise and its own window. Real EUR/USD 5m candles of Thu 1 Oct 2026 from the shared candles
  // table, on this PC's London clock. The sell after the 08:15 candle: 1.13147, a 12-pip stop, the 2R target at 09:39.
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
    ok('three boxes, all in one row on a computer', cards.length === 3 && cards[2].getAttribute('data-hub') === 'practice' && tops[0] === tops[1] && tops[1] === tops[2], tops);
    ok('the box says the whole day and names the three sessions', /from the Asia open to the New York close/.test(cards[2].textContent) && /Asia · London · New York/.test(cards[2].textContent), cards[2].textContent.replace(/\s+/g, ' ').trim());

    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.stop.EURUSD = 12; C.tpOn = true; C.tpVal = 2;
    var openDay = async function () { var r = await P.open({ symbol: 'EURUSD', tf: 5, day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._s().bars.length); k++) await W(100); return r; };
    var lastBar = function () { var S = P._s(); return new Date(S.bars[S.cursor - 1].time * 1000); };
    var hhmm = function (d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    var stepTo = function (s) { var g = 0; while (P._s() && g++ < 400) { var d = lastBar(); if (d.getDate() === 1 && hhmm(d) >= s) break; P._step(); } };
    var playOut = function () { var g = 0; while (P._s() && P._s().pos && g++ < 400) P._step(); };

    var opened = await openDay();
    var S = P._s();
    ok('a real day loads', opened && S && S.sym === 'EURUSD' && S.tf === 5 && S.bars.length > 250, S && { bars: S.bars.length });
    var first = new Date(S.bars[0].time * 1000), last = new Date(S.bars[S.bars.length - 1].time * 1000), lb = lastBar();
    ok('the whole day: from Wed 30 Sep 19:00 to the last candle before the 22:00 close (17:00 New York) on Thu 1 Oct', first.getDate() === 30 && first.getHours() === 19 && last.getDate() === 1 && hhmm(last) >= '21:40' && hhmm(last) <= '21:55', { first: first.toString().slice(0, 21), last: last.toString().slice(0, 21) });
    ok('it starts at the day open (22:00, the Asia open): the last candle shown is the last one before 22:00 on 30 Sep', lb.getDate() === 30 && hhmm(lb) >= '21:40' && hhmm(lb) <= '21:55' && S.bars[S.cursor].time * 1000 >= new Date(2026, 8, 30, 22, 0).getTime(), lb.toString().slice(0, 21));
    var ses = Array.prototype.slice.call(document.querySelectorAll('#stpr-ses [data-ses]'));
    ok('Asia, London and New York buttons, Asia lit', ses.length === 3 && /Asia/.test(ses[0].textContent) && /London/.test(ses[1].textContent) && /New York/.test(ses[2].textContent) && ses[0].classList.contains('on'), ses.map(function (b) { return b.textContent + (b.classList.contains('on') ? '*' : ''); }));
    ok('no EA panel and no sign over the hidden part', !document.getElementById('stpr-ea') && !document.getElementById('stpr-veil') && !/hidden/i.test(document.getElementById('stpr-cw').textContent), document.getElementById('stpr-cw').textContent.slice(0, 80));

    document.querySelector('#stpr-ses [data-ses="london"]').click(); await W(200);
    lb = lastBar();
    ok('London jumps to its open: the last candle shown is 07:55 on 1 Oct, London lit', lb.getDate() === 1 && hhmm(lb) === '07:55' && document.querySelector('#stpr-ses [data-ses="london"]').classList.contains('on'), lb.toString().slice(0, 21));

    // SL and TP on the chart before the press
    stepTo('08:15');
    ok('price after the 08:15 candle is 1.13147', near(P._s().bars[P._s().cursor - 1].close, 1.13147), P._s().bars[P._s().cursor - 1].close);
    var sellBtn = document.querySelector('#stpr-tr [data-a="sell"]');
    sellBtn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await W(50);
    var L = P._lines(), find = function (k) { return L.filter(function (l) { return l.k === k; })[0]; };
    ok('pointing at SELL draws its stop and target before the press', P._s().pv && P._s().pv.dir === -1 && find('pvsl') && near(find('pvsl').p, 1.13267, 1e-9) && find('pvtp') && near(find('pvtp').p, 1.12907, 1e-9), L);
    ok('the lines say what they are', find('pvsl') && /SL 12\.0/.test(find('pvsl').title) && find('pvtp') && /TP 2\.0R/.test(find('pvtp').title), L.map(function (l) { return l.title; }));
    // drag the SL line up to 1.13300: the Stop box follows
    var ch = document.getElementById('stpr-chart'), r = ch.getBoundingClientRect();
    var y0 = r.top + P._yOf(1.13267), y1 = r.top + P._yOf(1.13300), x = r.left + r.width * 0.5;
    ch.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y0, bubbles: true, pointerId: 3, pointerType: 'mouse' }));
    ch.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y1, bubbles: true, pointerId: 3, pointerType: 'mouse' }));
    ch.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y1, bubbles: true, pointerId: 3, pointerType: 'mouse' }));
    await W(50);
    ok('dragging the SL line sets the Stop box (about 15.3 pips)', near(C.stop.EURUSD, 15.3, 0.25) && near(parseFloat(document.getElementById('stpr-stop').value), C.stop.EURUSD, 1e-9), { stop: C.stop.EURUSD, box: document.getElementById('stpr-stop').value });
    var sb = document.getElementById('stpr-stop'); sb.value = '12'; sb.dispatchEvent(new Event('input', { bubbles: true }));
    ok('typing 12 in the Stop box moves the line back', near(P._lines().filter(function (l) { return l.k === 'pvsl'; })[0].p, 1.13267, 1e-9));

    // the mockup's trade
    document.querySelector('#stpr-tr [data-a="sell"]').click(); await W(50);
    var p = P._s().pos;
    ok('SELL places it: entry 1.13147, stop 1.13267, target 1.12907', p && near(p.entry, 1.13147) && near(p.sl, 1.13267, 1e-9) && near(p.tp, 1.12907, 1e-9) && !P._s().pv, p && { e: p.entry, sl: p.sl, tp: p.tp });
    playOut();
    var d1 = P._s().done;
    ok('target hit at 09:39: +2.00R, +24.0 pips', d1 && d1.why === 'tp' && near(d1.r, 2, 0.001) && near(d1.pips, 24, 0.05) && hhmm(new Date(d1.exitTs * 1000)) === '09:39', d1);
    ok('never more than 0.1R against', d1 && d1.mae <= 0.11, d1 && d1.mae);
    var row = document.getElementById('stpr-tr').textContent;
    ok('the result reads TARGET HIT · +2.00R · +24.0p', /TARGET HIT/.test(row) && /\+2\.00R/.test(row) && /\+24\.0p/.test(row) && /Next day/.test(row), row.slice(0, 120));
    ok('the score reads +2.00R, 1 practice trade', /\+2\.00R/.test(document.getElementById('stpr-score').textContent) && /1 practice trade/.test(document.getElementById('stpr-score').textContent), document.getElementById('stpr-score').textContent);

    // back before the trade is refused; New York jumps forward
    document.querySelector('#stpr-ses [data-ses="london"]').click(); await W(100);
    ok("London again (before the trade) is refused", hhmm(lastBar()) !== '07:55' && /can't go back/.test(document.getElementById('stpr-flash').textContent), document.getElementById('stpr-flash').textContent);
    P._s().done = null; document.querySelector('#stpr-ses [data-ses="ny"]').click(); await W(150);
    ok('New York jumps to 13:30: the last candle shown is 13:25', hhmm(lastBar()) === '13:25' && document.querySelector('#stpr-ses [data-ses="ny"]').classList.contains('on'), hhmm(lastBar()));

    // a stop-out, and closing by hand
    await openDay(); C.stop.EURUSD = 12; C.tpOn = true; C.tpVal = 2; P._jump('london'); stepTo('08:15'); P._place(1); playOut();
    var d2 = P._s().done;
    ok('a buy there is stopped out: -1.00R', d2 && d2.why === 'sl' && near(d2.r, -1, 0.001), d2);
    P._s().done = null; P._place(-1); P._step(); P._close();
    ok('Close trade closes it by hand', P._s().done && P._s().done.why === 'manual', P._s().done);

    // Gold
    await P.open({ symbol: 'XAUUSD', tf: 5, day: '2026-10-01' }); for (var k = 0; k < 60 && !(P._s() && P._s().sym === 'XAUUSD'); k++) await W(100);
    ok('Gold (XAUUSD) loads with 2 decimals', P._s() && P._s().sym === 'XAUUSD' && P._s().bars.length > 250 && near(P._s().U, 0.01, 1e-12), P._s() && { bars: P._s().bars.length });

    // nothing in the journal; the log and the box
    var log = P.log();
    ok('the practice log kept the trades', log.length >= 3, log.length);
    var journalHit = false; try { journalHit = (getAllLifetimeTrades() || []).some(function (t) { return t && t.practice; }); } catch (e) {}
    ok('no practice trade in the journal', !journalHit);
    P.close(); await W(200);
    ok('closing hides it and the box counts the trades', !document.getElementById('stpr-bg').classList.contains('show') && /practice trades/.test(document.getElementById('vault-hub-practice-meta').textContent), document.getElementById('vault-hub-practice-meta').textContent);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
