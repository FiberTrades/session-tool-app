(async function () {
  // Practice Replay: Maximise inside the app window, and its own window (Nestor, 14 Oct 2026: "needs the maximize screen
  // inside the app window and also the option to open it in a new window outside the app"). Split from practice_e2e.js:
  // one browser run has a 4-minute limit.
  // Run: python tests/browser_test.py tests/practice_window_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice, C = P._cfg(); C.layout = 2; C.tfs = [5, 60, 15, 240]; C.max = false;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length); k++) await W(100);
    P._jump('london'); for (k = 0; k < 4; k++) P._step();
    var bgm = document.getElementById('stpr-bg'); bgm.classList.remove('max');
    document.getElementById('stpr-max').click(); await W(150);
    var wr = bgm.querySelector('.stpr-win').getBoundingClientRect();
    ok('Maximise fills the app window', bgm.classList.contains('max') && Math.abs(wr.height - innerHeight) < 2 && Math.abs(wr.width - document.documentElement.clientWidth) < 2, { h: wr.height, ih: innerHeight });
    document.getElementById('stpr-max').click(); await W(150);
    ok('pressed again it goes back to a window', !bgm.classList.contains('max'));
    var now = P._s().now, opened2 = null, wo = window.open; window.open = function (u) { opened2 = { u: u }; return {}; };
    document.getElementById('stpr-pop').click(); await W(100); window.open = wo;
    ok('New window opens the app on the same day, symbol and time', opened2 && /[?&]practice=1/.test(opened2.u) && /sym=EURUSD/.test(opened2.u) && /day=2026-10-01/.test(opened2.u) && new RegExp('at=' + now).test(opened2.u), opened2);
    ok('and the practice in this window closes', !bgm.classList.contains('show'));
    var fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;left:0;top:0;width:1200px;height:800px;opacity:0;pointer-events:none';
    fr.src = opened2 ? opened2.u : '/app.html?practice=1&sym=EURUSD&day=2026-10-01'; document.body.appendChild(fr);
    var fw = null; for (var z = 0; z < 120; z++) { await W(250); try { fw = fr.contentWindow; if (fw.__stPractice && fw.__stPractice._s() && fw.__stPractice._panes().length && fw.__stPractice._s().now === now) break; } catch (e) {} }
    var fs = fw && fw.__stPractice && fw.__stPractice._s(), fbg = fw && fw.document.getElementById('stpr-bg');
    ok('the new window opens straight into Practice Replay, full window, at the same time and with the same two charts', fs && fs.day === '2026-10-01' && fs.now === now && fbg.classList.contains('max') && fbg.classList.contains('popped') && fw.__stPractice._panes().length === 2, fs && { day: fs.day, now: fs.now, want: now, cls: fbg.className });
    ok('the app itself never shows in that window, only Practice Replay (no tabs first - Nestor: "this seems glitchy")', fw && fw.document.documentElement.classList.contains('st-practice-only') && fw.getComputedStyle(fw.document.body).visibility === 'hidden' && fw.getComputedStyle(fbg).visibility === 'visible', fw && [fw.document.documentElement.className, fw.getComputedStyle(fw.document.body).visibility]);
    ok('there it has no Maximise or New window button', fw && fw.getComputedStyle(fw.document.getElementById('stpr-pop')).display === 'none' && fw.getComputedStyle(fw.document.getElementById('stpr-max')).display === 'none');
    fr.remove();
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
