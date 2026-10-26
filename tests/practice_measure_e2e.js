(async function () {
  // The measure and the position tool (Nestor, 26 Oct 2026): the measure reads pips (points off forex), bars and time - no R ("if
  // the R displayed is the reward, what is the risk? this idea doesnt work") - signed, so one drawn right to left reads negative;
  // the Long / Short tool's settings have the target in pips beside the target in R, each moving the other.
  // Run: python tests/browser_test.py tests/practice_measure_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stDrawBar); i++) await W(100); await W(800);
    var P = window.__stPractice; try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.mini = false; C.news = false; C.dtpl = {}; C.ddef = {};
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(600);
    var DW = P._dr(), DB = P._dbar(), pane = P._panes()[0], ch = pane.el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { ch.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mouseup' ? 0 : 1, view: window }, o || {}))); };
    var click = function (x, y) { mev('mousedown', x, y); mev('mouseup', x, y); };
    var pick = async function (tool) { if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); if (DW.tool !== tool) document.querySelector('#stpr-tools [data-tool="' + tool + '"]').click(); await W(40); };
    var texts = function () { var got = [], F = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { got.push(String(t)); return F.apply(this, arguments); };
      try { DW.ver = (DW.ver || 0) + 1; P._drawOv(0); } finally { CanvasRenderingContext2D.prototype.fillText = F; } return got; };
    DW.list = []; DW.sel = null; P._props();
    var Wd = r.width, H = r.height;

    // the measure, left to right
    await pick('range'); click(Math.round(Wd * 0.25), Math.round(H * 0.25)); mev('mousemove', Math.round(Wd * 0.45), Math.round(H * 0.55)); await W(30); click(Math.round(Wd * 0.45), Math.round(H * 0.55)); await W(80);
    var m1 = DW.list[DW.list.length - 1], t1 = texts().filter(function (t) { return / bars/.test(t); })[0] || '';
    ok('the measure reads pips, bars and time - no R', m1 && m1.type === 'range' && /pips/.test(t1) && /\d+ bars/.test(t1) && /\d+[wdhm]/.test(t1) && !/R\b/.test(t1), t1);
    ok('drawn left to right: the bars and the time read forward', !/−\d+ bars/.test(t1) && !/·\s*−\d/.test(t1.split(' bars')[1] || ''), t1);
    // and right to left
    await pick('range'); click(Math.round(Wd * 0.60), Math.round(H * 0.30)); mev('mousemove', Math.round(Wd * 0.40), Math.round(H * 0.50)); await W(30); click(Math.round(Wd * 0.40), Math.round(H * 0.50)); await W(80);
    var t2 = texts().filter(function (t) { return / bars/.test(t) && t !== t1; })[0] || '';
    ok('drawn right to left: the bars and the time read negative', /−\d+ bars/.test(t2) && /·\s*−\d+[wdhm]/.test(t2), t2);
    ok('its Shows options: pips, bars and time (no R)', (function () { DW.sel = DW.list.indexOf(m1); P._props(); var b = document.querySelector('.stdb-bar'); if (!b) return false; var mo = b.querySelector('[data-db="more"]'); if (mo) mo.click(); var pop = DB.pop(); var sh = pop ? Array.prototype.map.call(pop.querySelectorAll('[data-show]'), function (x) { return x.getAttribute('data-show'); }).join(',') : ''; DB.closePop(); return sh === 'pips,bars,time'; })());

    // the position tool: target in R and in pips
    DW.sel = null; P._props();
    await pick('long'); click(Math.round(Wd * 0.5), Math.round(H * 0.5)); await W(80);
    var L0 = DW.list[DW.list.length - 1]; DW.sel = DW.list.indexOf(L0); P._props(); await W(60);
    var bar = document.querySelector('.stdb-bar'); bar.querySelector('[data-db="more"]').click(); await W(60);
    var pop = DB.pop(), fr2 = pop && pop.querySelector('[data-ptgt]'), fp = pop && pop.querySelector('[data-ptgp]'), fs = pop && pop.querySelector('[data-pstop]');
    var pip = 0.0001, stopP = Math.abs(L0.a.price - L0.sl) / pip, tgtP = Math.abs(L0.tp - L0.a.price) / pip;
    ok('its settings: Stop, Target (R) and Target (pips)', fr2 && fp && fs && Math.abs(+fp.value - tgtP) < 0.06 && Math.abs(+fr2.value - tgtP / stopP) < 0.006, [fs && fs.value, fr2 && fr2.value, fp && fp.value]);
    fp.value = (stopP * 3).toFixed(1); fp.dispatchEvent(new Event('input', { bubbles: true })); await W(40);
    ok('a target in pips moves the target, and the R box follows (3.00R)', Math.abs(Math.abs(L0.tp - L0.a.price) / pip - stopP * 3) < 0.06 && fr2.value === '3.00', [fr2.value, (Math.abs(L0.tp - L0.a.price) / pip).toFixed(1)]);
    fr2.value = '1.5'; fr2.dispatchEvent(new Event('input', { bubbles: true })); await W(40);
    ok('a target in R moves it, and the pips box follows', Math.abs(Math.abs(L0.tp - L0.a.price) / pip - stopP * 1.5) < 0.06 && Math.abs(+fp.value - stopP * 1.5) < 0.06, [fp.value, stopP]);
    DB.closePop();
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
