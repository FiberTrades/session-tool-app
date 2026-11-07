(async function () {
  // The hawk's P/D zone in Study drags by its edges (Nestor, 7 Nov 2026: "i need to be able to drag the P/D zone"), as on his own charts: its
  // window moves, its high and low follow the candles in it, kept for that trade (st_hk_pd); his own Session Indicator settings untouched; a
  // double-click leaves it as it is (7 Nov 2026 evening: "dont make session indicator resize when clicking twice on it"), "Put the hawk's
  // marks back" (pdReset) does that; the hawk's notes keep their words on a double-click; every hawk mark moves (click, then drag), kept in
  // st_hk_mv and drawn there again, its note with it; hiding the Hawk panel (its logo) keeps the Study on. Study on EUR/USD of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/hawkpd_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    window.__stPlatOff = false; window.__stLcForce = true;   // the platform (Study lives in it), as the app has it
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stDrawBar && window.__stReplay); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); localStorage.removeItem('st_hk_pd'); localStorage.removeItem('st_hk_mv'); } catch (e) {}
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
    // a double-click inside it leaves it as he set it
    var cx = (mz2.x0 + mz2.x1) / 2; mev('dblclick', cx, (mz2.y0 + mz2.y1) / 2, { detail: 2 }); await W(200); pane._mini = null; P._drawOv(0); await W(150);
    try { K = JSON.parse(localStorage.getItem('st_hk_pd') || '{}'); } catch (e) {}
    ok('a double-click leaves it as he set it (it no longer snaps back)', K['strict_20|3'] && Math.abs(pane._mz.x0 - mz2.x0) < 3 && Math.abs(pane._mz.x1 - mz2.x1) < 3, [K, pane._mz, mz2]);
    ok('...and opened no settings window', !document.querySelector('#stpr-menu.show, .stpr-mini-dlg.show'), null);
    await P._study({ pdReset: true }); await W(150); pane._mini = null; P._drawOv(0); await W(150);
    ok('"Put the hawk\'s marks back" (pdReset) puts the hawk\'s 24 hours back', Math.abs(pane._mz.x0 - x0a) < 3, [pane._mz.x0, x0a]);
    // the hawk's note keeps its words on a double-click
    var nd = DW.list.filter(function (d) { return d.sid; })[0], nx = P._xOfT(0, nd.a.t), ny = P._yOf(0, nd.a.price) + 60;
    if (nx != null && ny != null) { mev('dblclick', nx, ny, { detail: 2 }); await W(150); }
    ok('a double-click on the hawk\'s note opens no editor', nd && !DW.ted && nd.text === '#3 Buy · test', [!!DW.ted, nd && nd.text, nx, ny]);
    // the hawk's position moves (Nestor, 7 Nov 2026: "allow me to move the position tool, also any object or tool drawn by the hawk")
    var tP = r1 + 4 * 3600, bP = pane.bars.filter(function (b) { return b.time >= tP && b.time < tP + 3600; }), pm = bP.length ? bP[0].close : 1.17, rk = 0.0010;
    var SID = 'strict_20|3|2026-10-01|posbox', POS = { type: 'long', sid: SID, a: { t: tP, price: pm }, b: { t: tP + 3600, price: pm }, sl: pm - rk, tp: pm + 2 * rk };
    var PN = { type: 'note', sid: 'strict_20|3|2026-10-01|pos', lnk: SID, a: { t: tP, price: pm }, off: { x: 0, y: 90 }, color: '#9598a1', tcol: '#ffffff', width: 1, tsz: 11, text: '#3 Buy · pos' };
    var L3 = [NOTE, POS, PN]; await P._study({ clear: true, list: JSON.parse(JSON.stringify(L3)) }); P._drawOv(0); await W(200);
    var pi = function () { for (var j = 0; j < DW.list.length; j++) if (DW.list[j] && DW.list[j].sid === SID) return j; return -1; };
    var bx = P._xOfT(0, tP) + 12, by = P._yOf(0, pm - rk / 2);
    mev('mousedown', bx, by); await W(40); mev('mouseup', bx, by); await W(150);
    ok('a click picks the hawk\'s position (it was locked before)', DW.sel === pi() && pi() >= 0, [DW.sel, pi(), bx, by]);
    await drag(bx, by, bx + 80, by + 40); P._drawOv(0); await W(150);
    var MV = {}; try { MV = JSON.parse(localStorage.getItem('st_hk_mv') || '{}'); } catch (e) {}
    var mp = DW.list[pi()], pnl = DW.list.filter(function (d) { return d.lnk === SID; })[0], m0 = MV[SID] || {};
    ok('then it drags: later and lower, its stop and target with it, kept (st_hk_mv)', mp.a.t > tP && mp.a.price < pm && Math.abs((mp.sl - mp.a.price) - (-rk)) < 1e-9 && m0.a && m0.a.t === mp.a.t && m0.tp === mp.tp, [mp, m0]);
    ok('its note goes with it', pnl && pnl.a.t === mp.a.t && Math.abs(pnl.a.price - mp.a.price) < 1e-9, pnl && pnl.a);
    await P._study({ clear: true, list: JSON.parse(JSON.stringify(L3)) }); await W(100);
    var mp2 = DW.list[pi()], pn2 = DW.list.filter(function (d) { return d.lnk === SID; })[0];
    ok('drawn again by the hawk, it stays where he put it, its note too', mp2 && mp2.a.t === mp.a.t && mp2.sl === mp.sl && pn2 && pn2.a.t === mp.a.t, [mp2 && mp2.a, pn2 && pn2.a]);
    ok('it is still the hawk\'s: Delete leaves it', (function () { DW.sel = pi(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); return pi() >= 0; })(), pi());
    // hiding the Hawk panel (its logo) keeps the Study on (it ended it before)
    var rb = document.querySelector('[data-plr="hk"]');
    if (rb) { rb.click(); await W(1600); ok('his hawk logo hides the Hawk panel and the Study stays on', (await P._study({ get: 3 })) !== null && !document.querySelector('[data-plr="hk"].on'), [document.querySelector('[data-plr="hk"]').className]);
      rb.click(); await W(900); ok('...and clicked again the panel is back, still in Study', (await P._study({ get: 3 })) !== null && !!document.querySelector('[data-plr="hk"].on'), null); }
    else ok('the hawk logo on the rail', false, null);
    await P._study({ end: true });
  } catch (e) { ok('no exception', false, String(e && e.stack || e).slice(0, 600)); }
  try { localStorage.removeItem('st_hk_pd'); localStorage.removeItem('st_hk_mv'); } catch (e) {}
  return JSON.stringify(out);
})()
