(async function () {
  // Practice Replay (14 Oct 2026). First built from the mockup ("add a 3rd box for Practice replay, keep all 3 boxes in a
  // row"), then reworked on Nestor's word the same evening: no EA panel ("remove the EA from practice replay, it doesnt
  // work well"); the whole day ("including ASIA. from open to day close": 17:00 New York to 17:00 New York, with Asia,
  // London and New York buttons); SL and TP drawn before BUY or SELL is pressed, the lines dragged to set them; no sign
  // over the hidden part; maximise and its own window. Real EUR/USD 5m candles of Thu 1 Oct 2026 from the shared candles
  // table, on this PC's London clock. The sell after the 08:15 candle: 1.13147, a 12-pip stop, the 2R target at 09:39.
  // Run: python tests/browser_test.py tests/practice_window_e2e.js
  // (Split from practice_e2e.js: one browser run has a 4-minute limit.)
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

    await openDay(); P._jump('london'); stepTo('08:15');
    // maximise inside the app window, and its own window
    P._render();
    var bgm = document.getElementById('stpr-bg'); C.max = false; bgm.classList.remove('max');
    document.getElementById('stpr-max').click(); await W(150);
    var wr = bgm.querySelector('.stpr-win').getBoundingClientRect();
    ok('Maximise fills the app window', bgm.classList.contains('max') && Math.abs(wr.height - innerHeight) < 2 && Math.abs(wr.width - document.documentElement.clientWidth) < 2, { h: wr.height, ih: innerHeight });
    document.getElementById('stpr-max').click(); await W(150);
    ok('pressed again it goes back to a window', !bgm.classList.contains('max'));
    var opened2 = null, wo = window.open; window.open = function (u) { opened2 = { u: u }; return {}; };
    document.getElementById('stpr-pop').click(); await W(100); window.open = wo;
    ok('New window opens the app on the same day, symbol, timeframe and time', opened2 && /[?&]practice=1/.test(opened2.u) && /sym=EURUSD/.test(opened2.u) && /tf=5/.test(opened2.u) && /day=2026-10-01/.test(opened2.u) && /at=\d+/.test(opened2.u), opened2);
    ok('and the practice in this window closes', !bgm.classList.contains('show'));
    var fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;left:0;top:0;width:1200px;height:800px;opacity:0;pointer-events:none';
    fr.src = opened2 ? opened2.u : '/app.html?practice=1&sym=EURUSD&tf=5&day=2026-10-01'; document.body.appendChild(fr);
    var fw = null; for (var z = 0; z < 120; z++) { await W(250); try { fw = fr.contentWindow; if (fw.__stPractice && fw.__stPractice._s() && fw.__stPractice._s().bars.length) break; } catch (e) {} }
    var fs = fw && fw.__stPractice && fw.__stPractice._s(), fbg = fw && fw.document.getElementById('stpr-bg');
    var at = opened2 ? +(new URLSearchParams(opened2.u.split('?')[1]).get('at')) : 0;
    ok('the new window opens straight into Practice Replay, full window, at the same candle', fs && fs.day === '2026-10-01' && fbg.classList.contains('max') && fbg.classList.contains('popped') && fs.bars[fs.cursor - 1].time + fs.tf * 60 === at, fs && { day: fs.day, cls: fbg.className, now: fs.bars[fs.cursor - 1].time + fs.tf * 60, at: at });
    fr.remove();

    P.close();
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
