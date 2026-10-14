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
    ok('there it has no Maximise or New window button', fw && fw.getComputedStyle(fw.document.getElementById('stpr-pop')).display === 'none' && fw.getComputedStyle(fw.document.getElementById('stpr-max')).display === 'none');
    fr.remove();
    // an old day, Random day, and only the X closes it (moved here from practice_tools_e2e.js: one run has 4 minutes)
    var S = function () { return P._s(); }, pane = function (i) { return P._panes()[i || 0]; }, k;
    C = P._cfg(); C.max = false; await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (k = 0; k < 100 && !(S() && pane(0) && pane(0).n); k++) await W(100);
    // only the X closes it
    var bgx = document.getElementById('stpr-bg'); bgx.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(50);
    ok('a click outside the box and Escape do not close it', bgx.classList.contains('show') && !!S());

    // a day older than the 1m and 5m candles
    await P._layout(1); C.tfs[0] = 1; await P.open({ symbol: 'EURUSD', day: '2026-03-18' }); for (k = 0; k < 100 && !(S() && S().day === '2026-03-18' && pane(0) && pane(0).n); k++) await W(100); await W(200);
    var note = pane(0).el.querySelector('.stpr-tfnote');
    ok('18 Mar has only 15m: the 1m chart shows 15m candles and says why', S().baseTf === 15 && pane(0).tf === 15 && pane(0).want === 1 && pane(0).n > 50 && note && /1m candles start .*28 Jun/.test(note.textContent) && /showing 15m/.test(note.textContent), note && note.textContent);
    ok('and the clock says UTC for a March day in London, not UTC+1', / UTC$/.test(document.getElementById('stpr-when').textContent), document.getElementById('stpr-when').textContent);
    await P._random('EURUSD'); for (k = 0; k < 100 && !(S() && S().day !== '2026-03-18' && pane(0) && pane(0).n); k++) await W(100);
    ok('Random day with a 1m chart picks a day that has 1m candles', S().baseTf === 1 && S().day >= '2026-06-29' && pane(0).tf === 1 && !pane(0).el.querySelector('.stpr-tfnote'), S().day);
    document.getElementById('stpr-close').click(); await W(150);
    ok('the X closes it', !document.getElementById('stpr-bg').classList.contains('show'));
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
