(async function () {
  // Practice Replay on days older than the 1m candles, Random day, and only the X closes it (15 Oct 2026). Nestor: "why do
  // the 1m and 5m look broken?", "only exit the box when clicking on the X". Split from practice_window_e2e.js: one run
  // has a 4-minute limit.
  // Run: python tests/browser_test.py tests/practice_days_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice, C = P._cfg(); C.layout = 1; C.tfs = [5, 60, 15, 240];
    // an old day, Random day, and only the X closes it (moved here from practice_tools_e2e.js: one run has 4 minutes)
    var S = function () { return P._s(); }, pane = function (i) { return P._panes()[i || 0]; }, k;
    C = P._cfg(); C.max = false; await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (k = 0; k < 100 && !(S() && pane(0) && pane(0).n); k++) await W(100);
    // opened with no day, it lands on the latest whole trading day stored, not a random one
    P.close(); await W(150); await P.open({ symbol: 'EURUSD' }); for (k = 0; k < 100 && !(S() && pane(0) && pane(0).n); k++) await W(100);
    var ld = new Date(); ld.setHours(12, 0, 0, 0); var want = null;
    for (var q = 0; q < 12 && !want; q++, ld.setDate(ld.getDate() - 1)) { if (ld.getDay() === 0 || ld.getDay() === 6) continue; var iso = ld.getFullYear() + '-' + String(ld.getMonth() + 1).padStart(2, '0') + '-' + String(ld.getDate()).padStart(2, '0'); var cl = new Date(iso + 'T21:00:00Z').getTime() / 1000; if (cl <= Date.now() / 1000) want = iso; }
    ok('opening Practice Replay lands on the latest whole trading day (' + want + '), at the Asia open', S() && S().day === want && S().now === S().f.open, S() && S().day);
    // the progress bar scrubs: press half way along it and let go - the day plays to its middle
    var trk = document.querySelector('#stpr-win .stpr-track'), tr2 = trk.getBoundingClientRect(), mid = S().f.open + (S().f.close - S().f.open) / 2;
    var pev = function (ty, f) { trk.dispatchEvent(new PointerEvent(ty, { clientX: tr2.left + tr2.width * f, clientY: tr2.top + 1, bubbles: true, cancelable: true, pointerId: 11, pointerType: 'mouse' })); };
    pev('pointerdown', 0.3); pev('pointermove', 0.5); pev('pointerup', 0.5); await W(300);
    ok('the progress bar scrubs: pressed, dragged to half way and let go, the day plays to its middle', Math.abs(S().now - mid) <= 2 * 60, [S().now, mid]);
    pev('pointerdown', 0.1); pev('pointerup', 0.1); await W(200);
    ok('and back again (no trade yet), to a tenth of the day', Math.abs(S().now - (S().f.open + (S().f.close - S().f.open) * 0.1)) <= S().baseTf * 60);
    // all the history: at its left edge a chart fetches older candles, and the view stays on the same candles
    var p0 = pane(0), n0 = p0.static.length, t0 = p0.times[10];
    p0.chart.timeScale().setVisibleLogicalRange({ from: 2, to: 152 }); for (k = 0; k < 30 && p0.chart.timeScale().getVisibleLogicalRange().from > 3; k++) await W(100);
    await P._more(0); var added = p0.static.length - n0; for (k = 0; k < 30 && p0.chart.timeScale().getVisibleLogicalRange().from < 1 + added; k++) await W(100);
    var r1 = p0.chart.timeScale().getVisibleLogicalRange();
    ok('at its left edge a chart loads older candles (' + added + ' more) and stays on the same candles', added > 0 && p0.times[10 + added] === t0 && Math.abs(r1.from - (2 + added)) < 1.5, { added: added, from: r1 && r1.from });
    p0.hand = false; p0.handAt = 0; var noHand = P._byHand(0);
    p0.el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 21, pointerType: 'mouse' })); var withHand = P._byHand(0); document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 21, pointerType: 'mouse' }));
    ok('only a hand on the chart fetches: not a view the app set itself', noHand === false && withHand === true && P._byHand(0) === true);
    // the phone's scroll strip only comes with two charts or more
    await P._layout(2); var cw2 = !document.getElementById('stpr-cw').classList.contains('one'); await P._layout(1);
    ok('one chart: the charts area is marked for no scroll strip; two charts: it is not', document.getElementById('stpr-cw').classList.contains('one') && cw2);
    // only the X closes it
    var bgx = document.getElementById('stpr-bg'); bgx.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(50);
    ok('a click outside the box and Escape do not close it', bgx.classList.contains('show') && !!S());

    // a day older than the 1m candles (the store keeps growing - EA 8.95 fills a year - so the day is worked out from it)
    var sy = (P._syms() || []).filter(function (x) { return x.key === 'EURUSD'; })[0], f1 = sy && sy.tf[1] && sy.tf[1][0], fc = sy && (sy.tf[15] || sy.tf[5]) && (sy.tf[15] || sy.tf[5])[0];
    var od = new Date(((f1 || 0) - 5 * 86400) * 1000); while (od.getDay() === 0 || od.getDay() === 6) od.setDate(od.getDate() - 1);
    var oday = od.getFullYear() + '-' + String(od.getMonth() + 1).padStart(2, '0') + '-' + String(od.getDate()).padStart(2, '0');
    if (f1 && fc && od.getTime() / 1000 > fc + 2 * 86400) {
      // a few tries: the day picked can be a market holiday (Christmas Day was, on 15 Oct 2026)
      await P._layout(1); C.tfs[0] = 1;
      for (var tries = 0; tries < 6; tries++) { await P.open({ symbol: 'EURUSD', day: oday }); for (k = 0; k < 60 && !(S() && S().day === oday && pane(0) && pane(0).n); k++) await W(100); await W(200);
        if (S() && S().day === oday && S().baseTf > 1) break;
        do { od.setDate(od.getDate() - 1); } while (od.getDay() === 0 || od.getDay() === 6); oday = od.getFullYear() + '-' + String(od.getMonth() + 1).padStart(2, '0') + '-' + String(od.getDate()).padStart(2, '0'); }
      var note = pane(0).el.querySelector('.stpr-tfnote');
      ok('a day before the first 1m candle (' + oday + '): the 1m chart shows the finest candles there are and says why', S().baseTf > 1 && pane(0).tf === S().baseTf && pane(0).want === 1 && pane(0).n > 50 && note && /1m candles start/.test(note.textContent) && new RegExp('showing ' + (S().baseTf === 5 ? '5m' : '15m')).test(note.textContent), note && note.textContent);
      var off = -new Date(S().now * 1000).getTimezoneOffset(), tz = off ? 'UTC' + (off > 0 ? '+' : '-') + Math.floor(Math.abs(off) / 60) : 'UTC';
      ok('and the clock names the offset of that day (' + tz + ')', new RegExp(' ' + tz.replace('+', '\\+') + '$').test(document.getElementById('stpr-when').textContent), document.getElementById('stpr-when').textContent);
    } else { ok('a day before the first 1m candle: none left to try (1m reaches as far back as the coarser candles)', true); ok('and the clock names the offset of that day', true); }
    await P._random('EURUSD'); for (k = 0; k < 100 && !(S() && S().day !== oday && pane(0) && pane(0).n); k++) await W(100);
    ok('Random day with a 1m chart picks a day that has 1m candles', S().baseTf === 1 && pane(0).tf === 1 && !pane(0).el.querySelector('.stpr-tfnote'), S().day);
    // Spanish (Nestor, 15 Oct 2026: "the tooltips are all in english!!! also play needs to say reproducir, sell buy buttons need to be translated")
    if (typeof setLanguage === 'function') { setLanguage('es'); await W(250); P._render();
      var ttl = function (id) { return document.getElementById(id).getAttribute('title'); };
      var tools = Array.prototype.map.call(document.querySelectorAll('#stpr-tools [data-tool]'), function (b) { return b.title; });
      ok('in Spanish every tooltip is Spanish: the toolbar, the tools, the window buttons', ttl('stpr-undo') === 'Deshacer' && ttl('stpr-redo') === 'Rehacer' && ttl('stpr-drawbtn') === 'Herramientas de dibujo' && ttl('stpr-layersbtn') === 'Mostrar en el gráfico' && ttl('stpr-newsbtn') === 'Noticias en el gráfico' && ttl('stpr-close') === 'Cerrar' && ttl('stpr-back') === 'Un paso atrás' && tools.join(',') === 'Línea horizontal,Línea de tendencia,Rectángulo,Fib,Dibujar,Medir,Texto,Posición larga,Posición corta', [ttl('stpr-undo'), ttl('stpr-close'), tools.join(',')]);
      var xb = function () { var b = document.querySelector('#stpr-mm .stpr-mm-n'); return b ? b.textContent : ''; };   // the panel's title (no Execute button on a computer)
      ok('and it says Reproducir and Cuenta de práctica', /Reproducir/.test(document.getElementById('stpr-play').textContent) && /Cuenta de práctica/.test(xb()), [document.getElementById('stpr-play').textContent, xb()]);
      setLanguage('en'); await W(250);
      ok('back in English: Undo, Play, Practice account', ttl('stpr-undo') === 'Undo' && /Play/.test(document.getElementById('stpr-play').textContent) && /Practice account/.test(xb())); }
    document.getElementById('stpr-close').click(); await W(150);
    ok('the X closes it', !document.getElementById('stpr-bg').classList.contains('show'));
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
