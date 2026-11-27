(async function () {
  // A click in the hawk's panel never changes a chart (Nestor, 27 Nov 2026: "why when i am moving this chart my main chart swaps to a 5m
  // chart?? fix this bug"). The hawk's chart box carried data-tf="1M" (its candle label) and the Live Charts window's own click handler
  // took any [data-tf] for a timeframe button: setTf(chart 1, NaN), which drew as 5m. The panel's clicks are the hawk's own now, the hawk
  // writes data-hktf, and a timeframe that is not a number is never set. Live Charts in Replay, EUR/USD, chart 1 on 15m.
  // Run: python tests/browser_test.py tests/hawkclick_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message) + ' @' + (e.filename || '') + ':' + e.lineno); });
  try {
    window.__stPlatOff = false; window.__stLcForce = true;
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stDrawBar && window.__stReplay); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); localStorage.removeItem('st_plat'); } catch (e) {}
    var C = P._cfg(); C.mm = Object.assign({}, C.mm, { col: true }); C.layout = 1; C.tfs = [15, 5, 60, 240]; C.mini = false; C.news = false; C.syms = []; C.resume = { sym: 'EURUSD', day: '2026-10-01' };
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    if (!window.__stHawk) window.__stHawk = { sb: null };   // the admin's hawk on the rail (hawk.js itself is not loaded here: its panel stays empty)
    P._lv().mode = 'replay'; document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 200 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100); await W(1200);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    var tf0 = P._panes()[0].tf;
    ok('Live Charts open, chart 1 on 15m', tf0 === 15, tf0);
    var rb = document.querySelector('[data-plr="hk"]'); if (rb) rb.click();
    for (k = 0; k < 30 && !document.querySelector('.pl-hkb'); k++) await W(100);
    var box = document.querySelector('.pl-hkb'), win = document.getElementById('stpr-win');
    ok('the Hawk panel opens on the rail, inside the Live Charts window', !!box && !!win && win.contains(box), [!!rb, !!box, !!win]);
    // what the hawk drew there before the fix: its chart box with its candle label, and the session card's read pickers
    box.insertAdjacentHTML('beforeend', '<div class="hk-chart" data-tf="1M" style="height:60px"><canvas width="200" height="60"></canvas></div>' +
      '<select data-sesr="said" data-tf="4h"><option>Range</option></select><div class="hk-chart" data-hktf="1M" style="height:40px"></div>');
    var clk = function (el) { ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (t) { el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, button: 0 })); }); };
    clk(box.querySelector('canvas')); await W(600);
    ok('a click on the hawk\'s chart (its old data-tf="1M" box) leaves chart 1 on 15m', P._panes()[0].tf === 15 && C.tfs[0] === 15, [P._panes()[0].tf, C.tfs[0]]);
    clk(box.querySelector('select')); await W(400);
    ok('...a click on its 4H read picker too', P._panes()[0].tf === 15 && C.tfs[0] === 15, [P._panes()[0].tf, C.tfs[0]]);
    clk(box.querySelector('[data-hktf]')); await W(400);
    ok('...and on the chart as the hawk marks it now (data-hktf)', P._panes()[0].tf === 15 && C.tfs[0] === 15, [P._panes()[0].tf, C.tfs[0]]);
    // a stray [data-tf] that is not a timeframe, outside the hawk: never set
    var st = document.createElement('span'); st.setAttribute('data-tf', 'none'); st.textContent = 'x'; win.appendChild(st); clk(st); await W(400); st.remove();
    ok('anything else in the window marked with a timeframe that is not a number: chart 1 stays on 15m', P._panes()[0].tf === 15 && C.tfs[0] === 15, [P._panes()[0].tf, C.tfs[0]]);
    // the real timeframe buttons still work
    var t60 = win.querySelector('[data-tf="60"][data-i="0"]');
    if (t60) { clk(t60); for (k = 0; k < 40 && P._panes()[0].tf !== 60; k++) await W(100); }
    ok('chart 1\'s own timeframe buttons still switch it (1h)', !!t60 && P._panes()[0].tf === 60 && C.tfs[0] === 60, [!!t60, P._panes()[0].tf, C.tfs[0]]);
    ok('no page errors', !errs.length, errs);
  } catch (e) { ok('no exception', false, String(e && e.stack || e).slice(0, 800)); }
  return JSON.stringify(out);
})()
