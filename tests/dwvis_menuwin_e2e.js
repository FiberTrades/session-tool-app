(async function () {
  // Two fixes, 22 Oct 2026. (1) A drawing's own visibility counts again (Nestor: "ive just made the position tool only visible up to
  // below 1h so why is it still showing in 1h chart?" - a comment had cut the visibility and hidden checks off for every drawing).
  // (2) A toolbar button's open menu lights that button only in the window it opened in (Nestor: "when i click this button why is
  // it getting highlighted on the top charts too?"), and each window's Show on chart dot is its own charts'. Back Testing, real
  // EUR/USD, Thu 1 Oct 2026, a real second window (chart.html).
  // Run: python tests/browser_test.py tests/dwvis_menuwin_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var win = null;
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 2; C.lv = {}; C.tfs = [60, 15, 240, 5]; C.look = {}; C.mini = false; C.max = true; C.resume = null; C.showPer = {}; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    P._goto('12:00'); await W(500);
    // ---- (1) visibility: chart 1 is 1h, chart 2 is 15m ----
    var DW = P._dr(), p0 = P._panes()[0], b = p0.bars, e = b[b.length - 12].close;
    var d = { type: 'short', a: { t: b[b.length - 12].time, price: e }, b: { t: b[b.length - 3].time, price: e }, sl: Math.round((e + 0.0010) * 1e5) / 1e5, tp: Math.round((e - 0.0020) * 1e5) / 1e5 };
    DW.list.push(d); DW.sel = null; P._render(); await W(300);
    var hitOn = function (i) { var bb = P._bbox(i, d); if (!bb) return null; var h = P._hit(i, (bb.x0 + bb.x1) / 2, Math.min((bb.y0 + bb.y1) / 2, bb.y0 + 10)); return h && DW.list[h.i] === d ? h : null; };
    ok('a Short with no visibility set: on the 1h chart', !!hitOn(0), P._bbox(0, d));
    d.vis = { m: { on: true, a: 1, b: 59 }, h: { on: false, a: 1, b: 24 }, d: { on: false, a: 1, b: 366 }, w: { on: false, a: 1, b: 52 }, mo: { on: false, a: 1, b: 12 } };
    P._render(); await W(300);
    ok('set to minutes only: gone from the 1h chart (and not clickable there)', !hitOn(0), P._bbox(0, d));
    ok('...still on the 15m chart', !!hitOn(1), P._bbox(1, d));
    delete d.vis; d.hidden = true; P._render(); await W(300);
    ok('hidden (the eye): on no chart', !hitOn(0) && !hitOn(1));
    delete d.hidden; DW.list.splice(DW.list.indexOf(d), 1); P._render(); await W(200);
    // ---- (2) chart 2 in its own window ----
    P._panes()[1].el.querySelector('[data-popc]').click();
    for (k = 0; k < 120 && !(P._pops()[1] && P._pops()[1].ready && P._panes()[1] && P._panes()[1].el.ownerDocument !== document && P._panes()[1].n); k++) await W(100);
    win = P._pops()[1] && P._pops()[1].w; await W(800);
    var mainB = function () { return document.getElementById('stpr-layersbtn'); }, winB = function () { return win && win.document.getElementById('stpr-layersbtn'); };
    var lit = function (bt) { return !!bt && bt.getAttribute('aria-expanded') === 'true'; };
    mainB().click(); await W(300);
    ok('Show on chart opened in the main window: its button lit there, not in the chart window', lit(mainB()) && winB() && !lit(winB()), [lit(mainB()), lit(winB())]);
    mainB().click(); await W(300);
    ok('...closed: lit nowhere', !lit(mainB()) && !lit(winB()));
    if (winB()) winB().click(); await W(300);
    ok('opened from the chart window: lit there, not in the main window', lit(winB()) && !lit(mainB()), [lit(winB()), lit(mainB())]);
    if (winB()) winB().click(); await W(300);
    // the dot: something off on a chart of that window only
    mainB().click(); await W(300); var hb = document.getElementById('stpr-hist');   // Trade history off from the main window's menu
    if (hb) { hb.checked = false; hb.dispatchEvent(new Event('change', { bubbles: true })); } await W(300); if (document.getElementById('stpr-menu').classList.contains('show')) mainB().click(); await W(200);
    var offI = Object.keys(C.showPer || {}).filter(function (k) { return C.showPer[k] && C.showPer[k].hist === false; }).map(Number)[0], offDoc = (offI != null && P._panes()[offI]) ? P._panes()[offI].el.ownerDocument : null;
    var dotMain = mainB().classList.contains('dot'), dotWin = !!winB() && winB().classList.contains('dot');
    ok('Trade history off on one chart: the dot only on the button of the window that chart is in', offDoc && (offDoc === document ? (dotMain && !dotWin) : (dotWin && !dotMain)), [offI, offDoc === document ? 'main' : 'window', dotMain, dotWin]);
    C.showPer = {};
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { if (win) win.close(); } catch (e) {}
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
