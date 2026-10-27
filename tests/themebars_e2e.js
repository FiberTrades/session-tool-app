// End-to-end test: the floating toolbars and menus follow the PLATFORM's theme, never the chart's background (Nestor, 27 Oct 2026: "if the
// theme selected is dark why is favorite objects bar white? fix that."). The platform's theme and the chart's background are set apart
// (25 Oct 2026), so a dark platform can have a white chart and a light one a dark chart. Checked on Replay in the Charts tab (the
// platform; signed out, over the shared candles): the favourites bar, the right-click menu, a drawing's toolbar and its pop-up, a tool
// group's menu, the Table window.
//   python tests/themebars_run.py      (a dark platform with a white chart, then a light platform with a dark chart)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    window.__stPlatOff = false; window.__stLcForce = true;
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var P = window.__stPractice, LT = !!window.__TB_LT, $ = function (s) { return document.querySelector(s); };
    P._lv().mode = 'replay';
    try { var C = P._cfg(); C.layout = 1; C.syms = []; C.mini = false; C.look = { bg: LT ? '#131722' : '#ffffff' }; delete C.lookDk; delete C.lookTh; C.plLt = LT; C.resume = { sym: 'EURUSD', day: '2026-10-01', now: 0, at: Date.now() }; C.speed = 0; C.mm.on = true; C.mm.maxDay = 0; C.fav = ['trend', 'rect', 'comment']; C.favOn = true; } catch (e) {}
    try { localStorage.removeItem('st_plat'); } catch (e) {}
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 200 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    await W(1800);
    var win = $('#stpr-win'), DW = P._dr(), pane = P._panes()[0], ch = pane.el.querySelector('.stpr-pc'), tools = document.getElementById('stpr-tools');
    var lum = function (el) { if (!el) return -1; var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(getComputedStyle(el).backgroundColor); return m ? (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) / 255 : -1; };
    var right = function (l) { return LT ? l > 0.8 : (l >= 0 && l < 0.3); }, TH = LT ? 'light' : 'dark';
    var vis = function (el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none'; };
    var mev = function (t, xx, yy, o) { var r = ch.getBoundingClientRect(); ch.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mouseup' || t === 'mousemove' ? 0 : 1, view: window }, o || {}))); };
    var click = function (x, y) { mev('mousedown', x, y); mev('mouseup', x, y); };
    var R = ch.getBoundingClientRect(), X = function (f) { return Math.round(R.width * f); }, Y = function (f) { return Math.round(R.height * f); };

    ok('the platform, ' + TH + ', with a ' + (LT ? 'dark' : 'white') + ' chart', win.classList.contains('plat') && win.classList.contains('pl-lt') === LT && win.classList.contains('pl-clt') === !LT, win.className);
    var fb = $('.stpr-favbar');
    ok('the favourites bar: ' + TH, vis(fb) && right(lum(fb)), [vis(fb), lum(fb)]);
    // the right-click menu on the bare chart
    mev('contextmenu', X(0.5), Y(0.15), { button: 2, buttons: 2 }); await W(120);
    var cm = Array.prototype.filter.call(document.querySelectorAll('.stpr-cm'), vis)[0];
    ok('the right-click menu: ' + TH, cm && right(lum(cm)), [!!cm, lum(cm)]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(60); document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); await W(60);
    // a tool group's menu
    tools.querySelector('[data-tgrp="lines"]').click(); await W(150);
    var fl = Array.prototype.filter.call(tools.querySelectorAll('.stpr-tfl'), vis)[0];
    ok('a tool group\'s menu: ' + TH, fl && right(lum(fl)), [!!fl, lum(fl)]);
    tools.querySelector('[data-tool="trend"]').click(); await W(60);
    // a drawing's toolbar and its pop-up
    click(X(0.3), Y(0.6)); mev('mousemove', X(0.45), Y(0.4)); await W(30); click(X(0.45), Y(0.4)); await W(150);
    var bar = $('.stdb-bar');
    ok('a drawing\'s toolbar: ' + TH, vis(bar) && right(lum(bar)), [vis(bar), lum(bar)]);
    var lb = bar && bar.querySelector('[data-db="line"]'); if (lb) lb.click(); await W(120);
    var pop = $('.stdb-pop');
    ok('its colour pop-up: ' + TH, vis(pop) && right(lum(pop)), [vis(pop), lum(pop)]);
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); await W(60);
    // the Table window
    if (!document.getElementById('stpr-tb2').classList.contains('drawing')) { var db = document.getElementById('stpr-drawbtn'); if (db) db.click(); }
    tools.querySelector('[data-tool="table"]').click(); await W(60); click(X(0.6), Y(0.2)); await W(200);
    var dlg = $('.stpr-dlgbg .stpr-dlg');
    ok('the Table window: ' + TH, vis(dlg) && right(lum(dlg)), [vis(dlg), lum(dlg)]);
    var dx = $('.stpr-dlgbg [data-dx]'); if (dx) dx.click(); await W(60);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
