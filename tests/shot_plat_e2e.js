// End-to-end test: the chart snapshot inside the Charts platform (24 Oct 2026): the camera in the top bar, the trade's tags in the
// picture, "Hide trade sizes and money" blurring the entry tag only, Blur then share and Check my plan over the frame. A stand-in
// EA 9.03 through a local relay, a made-up open trade; the assistant is never called.
//   python tests/shot_plat_run.py
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  var SH = null;
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB && window.__stShot); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var P = window.__stPractice, LC = window.__stLC, T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000; SH = window.__stShot; SH.setHide(false);
    P._lvClock(T0 * 1000 - Date.now());
    window.isSessionLive = function () { return true; };
    window.__stPlatOff = false; window.__stLcForce = true; await W(1200);
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
    try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15, 1, 60, 240]; C.syms = []; C.mini = false; C.resume = null; delete C.lookDk; C.look = {}; } catch (e) {}
    try { localStorage.removeItem('st_plat'); } catch (e) {}
    var acc0 = (data.accounts || [])[0] || {};
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-plat', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-plat' });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
    await W(1500);
    var win = document.getElementById('stpr-win'), $ = function (s) { return document.querySelector(s); };
    check('the platform is on (a computer)', win.classList.contains('plat') && P._plat().on, win.className);
    var p0 = P._panes()[0], last = p0.bars[p0.bars.length - 1].close;
    var rr = { symbol: 'EURUSD', ticket: 7001, login: 90001234, direction: 'long', lots: 13.5, openedAt: Date.now() - 50 * 60000, risk0: 250, risk: 250,
      tick: { op: last - 0.0005, rpx: 0.0007, sl: -1, tp: 2, r: 0.7, pnl: 175, px: last, at: Date.now(), dg: 5, lad: '' } };
    window.__stLive = window.__stLive || {}; window.__stLive.openIdeas = function () { rr.tick.at = Date.now(); return [{ main: rr, rows: [rr] }]; };
    for (k = 0; k < 30 && document.querySelectorAll('.pl-tag:not([hidden])').length < 3; k++) await W(250); await W(500);
    var tagEl = function (re) { return Array.prototype.filter.call(document.querySelectorAll('.pl-tag:not([hidden])'), function (t) { return re.test(t.textContent); })[0]; };
    var bt = tagEl(/BUY/), tp = tagEl(/^TP/);
    check('the open trade\'s tags on the chart', !!(bt && tp && tagEl(/^SL/)), Array.prototype.map.call(document.querySelectorAll('.pl-tag'), function (t) { return t.textContent; }));

    // ---- the camera in the top bar, its menu on screen ----
    var sb = $('.plat-top #stpr-snapbtn');
    check('the camera sits in the top bar', !!sb && sb.offsetWidth > 0);
    sb.click(); await W(120);
    var mn = $('#stpr-menu'), mr = mn.getBoundingClientRect();
    check('its menu: Copy image, Copy link, Download, Blur then share, Hide trade sizes and money, Check my bias - all on screen',
      mn.classList.contains('show') && ['img', 'link', 'dl', 'edit', 'hide', 'plan'].every(function (x) { return !!mn.querySelector('[data-snap="' + x + '"]'); }) && mr.left >= 0 && mr.right <= innerWidth + 1 && mr.bottom <= innerHeight + 1,
      [mr.left, mr.right, mr.bottom, innerWidth, innerHeight]);
    sb.click(); await W(80);

    // ---- the picture: the trade's tags in it, as they show at rest ----
    var cv = P._snap(), d = cv.__dpr || 1, gr = $('#stpr-grid').getBoundingClientRect();
    var br = bt.getBoundingClientRect(), tr = tp.getBoundingClientRect();
    var count = function (c, x, y, w, h, test) { var dd = c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), Math.max(1, Math.round(w * d)), Math.max(1, Math.round(h * d))).data, n = 0; for (var q = 0; q < dd.length; q += 4) if (test(dd[q], dd[q + 1], dd[q + 2])) n++; return n; };
    var blue = function (r, g, b) { return r < 70 && g > 70 && g < 130 && b > 220; }, green = function (r, g, b) { return r < 40 && g > 130 && g < 175 && b > 110 && b < 150; }, white = function (r, g, b) { return r > 245 && g > 245 && b > 245; };
    var bx = br.right - gr.left - 60, by = br.top - gr.top + 30 + 4;   // the picture has a 30 px heading line
    check('the picture holds the BUY tag (blue, with its white R box) where it shows on screen', count(cv, br.left - gr.left, br.top - gr.top + 30, br.width, br.height, blue) > 40 && count(cv, br.left - gr.left, br.top - gr.top + 30, br.width, br.height, white) > 40,
      [count(cv, br.left - gr.left, br.top - gr.top + 30, br.width, br.height, blue), count(cv, br.left - gr.left, br.top - gr.top + 30, br.width, br.height, white)]);
    check('and the TP tag (green)', count(cv, tr.left - gr.left, tr.top - gr.top + 30, tr.width, tr.height, green) > 30, count(cv, tr.left - gr.left, tr.top - gr.top + 30, tr.width, tr.height, green));
    var s0 = cv.__sens || [];
    check('"Hide trade sizes and money" would cover the entry tag only (the size), not TP / SL', s0.length === 1 && Math.abs((s0[0].x + s0[0].w) - (br.right - gr.left)) < 6 && Math.abs(s0[0].y - (br.top - gr.top + 30)) < 6, s0);
    // how busy a patch is: the share of side-by-side pixels that differ (text and edges); square blocks leave only their borders
    var distinct = function (c, x, y, w, h) { var W2 = Math.round(w * d), H2 = Math.round(h * d), dd = c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), W2, H2).data, n = 0, t = 0;
      for (var yy = 0; yy < H2; yy++) for (var xx = 0; xx < W2 - 1; xx++) { var q = (yy * W2 + xx) * 4; t++; if (Math.abs(dd[q] - dd[q + 4]) + Math.abs(dd[q + 1] - dd[q + 5]) + Math.abs(dd[q + 2] - dd[q + 6]) > 24) n++; }
      return Math.round(1000 * n / Math.max(1, t)) / 1000; };
    var r0 = s0[0] || { x: 0, y: 0, w: 1, h: 1 }, before = distinct(cv, r0.x + 2, r0.y + 2, r0.w - 4, r0.h - 4);
    SH.setHide(true); SH.out(cv);
    var after = distinct(cv, r0.x + 2, r0.y + 2, r0.w - 4, r0.h - 4);
    check('switched on: the entry tag turns to square blocks (its lots unreadable)', after < before / 2 && after <= 0.16, [before, after]);
    check('...the TP tag stays readable', count(cv, tr.left - gr.left, tr.top - gr.top + 30, tr.width, tr.height, green) > 30);
    SH.setHide(false);
    // ---- the picture's timeframe: TradingView's rounded pill, no O H L C beside it (Nestor, 26 Oct 2026) ----
    var pcr = p0.el.querySelector('.stpr-pc').getBoundingClientRect(), fs0 = Math.max(12, Math.min(15, Math.round(pcr.width / 100))), ph0 = Math.round(fs0 * 1.9);
    var px1 = function (c, x, y) { var dd = c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data; return [dd[0], dd[1], dd[2]]; };
    var near = function (a, b) { return Math.abs(a[0] - b[0]) <= 12 && Math.abs(a[1] - b[1]) <= 12 && Math.abs(a[2] - b[2]) <= 12; };
    var pinkIn = function (c, x, y, w, h) { return count(c, x, y, w, h, function (r, g, b) { return r > 200 && g < 150 && b > 140; }); };
    var bx0 = pcr.left - gr.left + 10, by0 = pcr.top - gr.top + 30 + 10, cvD = P._snap();
    check('the picture\'s timeframe on a dark chart: a rounded grey pill, no pink square, no O H L C box', near(px1(cvD, bx0 + 5, by0 + ph0 / 2), [42, 46, 57]) && pinkIn(cvD, bx0 - 10, by0 - 10, 360, ph0 + 20) === 0
      && count(cvD, bx0 + 70, by0 + 4, 260, ph0 - 8, function (r, g, b) { return r > 225 && g > 225 && b > 225; }) < 40, px1(cvD, bx0 + 5, by0 + ph0 / 2));
    $('[data-pltheme]').click(); await W(800);
    var cvL = P._snap();
    check('...on a light chart: a light grey pill with dark text', near(px1(cvL, bx0 + 5, by0 + ph0 / 2), [224, 227, 235]) && pinkIn(cvL, bx0 - 10, by0 - 10, 360, ph0 + 20) === 0, px1(cvL, bx0 + 5, by0 + ph0 / 2));
    $('[data-pltheme]').click(); await W(600);
    check('the money a hovered tag opens to is never in the picture', count(P._snap(), br.left - gr.left - 200, br.top - gr.top + 30, 200, br.height, white) < 30);

    // ---- Blur then share and Check my bias open over the whole frame ----
    sb.click(); await W(100); $('#stpr-menu [data-snap="edit"]').click(); await W(250);
    var ov = $('.stshot-ov'), xb = ov && ov.querySelector('[data-sh="close"]'), xr = xb && xb.getBoundingClientRect();
    check('Blur then share opens over the platform (nothing of the frame on top of it)', !!ov && document.elementFromPoint(xr.left + xr.width / 2, xr.top + xr.height / 2) === xb && ov.querySelector('.stshot-cv').width === cv.width);
    xb.click(); await W(120);
    sb.click(); await W(100); $('#stpr-menu [data-snap="plan"]').click(); await W(250);
    var po = $('.stpc-ov'), pxb = po && po.querySelector('[data-pc="close"]'), pxr = pxb && pxb.getBoundingClientRect();
    check('Check my bias opens over the platform: the bias only, no chart picture and no setup check', !!po && document.elementFromPoint(pxr.left + pxr.width / 2, pxr.top + pxr.height / 2) === pxb && /Check my bias/.test(po.textContent) && !po.querySelector('.stpc-img') && !po.querySelector('[data-pc="go"]') && !po.querySelector('.stpc-setups'));
    pxb.click(); await W(100);
    check('no errors', errs.length === 0, errs.slice(0, 3));
  } catch (e) { check('test ran', false, String(e && e.stack || e)); }
  finally { try { if (SH) SH.setHide(false); } catch (e) {} }
  return results;
})()
