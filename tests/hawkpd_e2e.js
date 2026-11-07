(async function () {
  // The hawk's P/D zone in Study drags by its edges (Nestor, 7 Nov 2026: "i need to be able to drag the P/D zone"), as on his own charts: its
  // window moves, its high and low follow the candles in it, kept for that trade (st_hk_pd); his own Session Indicator settings untouched; a
  // double-click puts the hawk's 24 hours back; the hawk's notes keep their words on a double-click. Study on EUR/USD of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/hawkpd_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    window.__stPlatOff = false; window.__stLcForce = true;   // the platform (Study lives in it), as the app has it
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stDrawBar && window.__stReplay); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); localStorage.removeItem('st_hk_pd'); } catch (e) {}
    var C = P._cfg(); C.mm = Object.assign({}, C.mm, { col: true }); C.layout = 1; C.tfs = [15, 5, 60, 240]; C.mini = false; C.dtpl = {}; C.ddef = {}; C.dwHide = false; C.dwLock = false; C.news = false; C.syms = []; C.resume = { sym: 'EURUSD', day: '2026-10-01', now: 0, at: Date.now() }; C.speed = 0;
    try { localStorage.removeItem('st_plat'); } catch (e) {}
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    P._lv().mode = 'replay'; document.querySelector('.tab[data-page="livecharts"]').click(); for (var k = 0; k < 200 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100); await W(1500);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    var mine0 = JSON.stringify([C.miniS || null, C.miniPer || null]);
    var r1 = Date.UTC(2026, 9, 1, 6, 0, 0) / 1000, r0 = r1 - 86400;   // 07:00 London on the day, and the 24 hours before
    var NOTE = { type: 'note', a: { t: r1 + 5400, price: 1.1700 }, off: { x: 0, y: 60 }, sid: 'strict_20|3|pos', color: '#9598a1', tcol: '#ffffff', width: 1, tsz: 11, text: '#3 Buy · test' };
    if (!window.__stHawk) window.__stHawk = { sb: null };   // the admin's hawk on the rail (its panel needs hawk.js, not loaded here): Study stays open while it is the panel
    var res = await P._study({ sym: 'EURUSD', day: '2026-10-01', at: r1 + 7200, draw: [NOTE], pd: { a: r0, b: r1 }, pd0: { a: r0, b: r1 }, pid: 'strict_20|3', n: 3, keep: [], noAsk: true });
    for (k = 0; k < 60 && !(P._panes()[0] && P._panes()[0]._mz); k++) await W(100);
    var pane = P._panes()[0], ch = pane.el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect(), DW = P._dr();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0 }, o || {}))); };
    var drag = async function (x0, y0, x1, y1) { mev('mousedown', x0, y0); mev('mousemove', (x0 + x1) / 2, y0, { held: true }); await W(30); mev('mousemove', x1, y1, { held: true }); await W(30); mev('mouseup', x1, y1); await W(120); };
    var mz = pane._mz;
    P._drawOv(0); await W(100);
    ok('Study opened with the hawk\'s P/D zone drawn', res === true && mz && mz.x1 > mz.x0, [res, mz]);
    // fit the zone in view: a wider visible range
    try { pane.chart.timeScale().setVisibleRange({ from: r0 - 6 * 3600, to: r1 + 6 * 3600 }); } catch (e) {}
    await W(300); pane._mini = null; P._drawOv(0); await W(200); mz = pane._mz;
    var ym = (mz.y0 + mz.y1) / 2, x0a = mz.x0, top0 = mz.y0;
    await drag(mz.x0, ym, mz.x0 + 90, ym);
    var mz1 = pane._mz, K = {}; try { K = JSON.parse(localStorage.getItem('st_hk_pd') || '{}'); } catch (e) {}
    ok('its left edge drags: the window starts later, the edge where it was let go', mz1 && Math.abs(mz1.x0 - (x0a + 90)) < Math.max(12, (P._xOfT(0, r0 + 3600 * 2) - P._xOfT(0, r0)) ) && mz1.x0 > x0a + 40, [x0a, mz1 && mz1.x0]);
    ok('kept for that trade (st_hk_pd)', K['strict_20|3'] && K['strict_20|3'].a > r0 && K['strict_20|3'].b === r1, K);
    ok('his own Session Indicator settings untouched (Auto stays as it was)', JSON.stringify([C.miniS || null, C.miniPer || null]) === mine0, [C.miniS, C.miniPer]);
    var x1a = mz1.x1; await drag(mz1.x1, ym, mz1.x1 - 120, ym);
    var mz2 = pane._mz; try { K = JSON.parse(localStorage.getItem('st_hk_pd') || '{}'); } catch (e) {}
    ok('its right edge drags too, the edge under the mouse', mz2 && mz2.x1 < x1a - 60 && Math.abs(mz2.x1 - (x1a - 120)) < 20 && K['strict_20|3'].b < r1, [x1a, mz2 && mz2.x1, K]);
    var Z = pane._mini && pane._mini.zone, Bz = Z ? pane.bars.slice(Z.i0, Z.end + 1) : [], hiZ = Math.max.apply(null, Bz.map(function (b) { return b.high; })), loZ = Math.min.apply(null, Bz.map(function (b) { return b.low; }));
    ok('its high and low are the candles\' in the new window', Z && Bz.length && pane.bars[Z.i0].time >= K['strict_20|3'].a - 900 && pane.bars[Z.end].time <= K['strict_20|3'].b && Z.top === hiZ && Z.bot === loZ, [Z, hiZ, loZ, K]);
    // a double-click inside it: the hawk's 24 hours back
    var cx = (mz2.x0 + mz2.x1) / 2; mev('dblclick', cx, (mz2.y0 + mz2.y1) / 2, { detail: 2 }); await W(200); pane._mini = null; P._drawOv(0); await W(150);
    try { K = JSON.parse(localStorage.getItem('st_hk_pd') || '{}'); } catch (e) {}
    ok('a double-click puts the hawk\'s window back', !K['strict_20|3'] && Math.abs(pane._mz.x0 - x0a) < 3, [K, pane._mz.x0, x0a]);
    ok('...and opened no settings window', !document.querySelector('#stpr-menu.show, .stpr-mini-dlg.show'), null);
    // the hawk's note keeps its words on a double-click
    var nd = DW.list.filter(function (d) { return d.sid; })[0], nx = P._xOfT(0, nd.a.t), ny = P._yOf(0, nd.a.price) + 60;
    if (nx != null && ny != null) { mev('dblclick', nx, ny, { detail: 2 }); await W(150); }
    ok('a double-click on the hawk\'s note opens no editor', nd && !DW.ted && nd.text === '#3 Buy · test', [!!DW.ted, nd && nd.text, nx, ny]);
    await P._study({ end: true });
  } catch (e) { ok('no exception', false, String(e && e.stack || e).slice(0, 600)); }
  try { localStorage.removeItem('st_hk_pd'); } catch (e) {}
  return JSON.stringify(out);
})()
