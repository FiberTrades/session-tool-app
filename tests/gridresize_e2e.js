(async function () {
  // The borders between charts drag to resize them (Nestor, 23 Oct 2026: "when the charts are like this i need to be able to drag the
  // charts borders to resize the charts however i want them to be"). Back Testing (the engine of Live Charts), three charts - a big one
  // on the left, two on the right - real EUR/USD of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/gridresize_e2e.js     and on a phone: E2E_MOBILE=375x812 python tests/browser_test.py tests/gridresize_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    Array.prototype.forEach.call(document.querySelectorAll('[class^="st-tour"]'), function (e) { e.remove(); });
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 3; C.lv = { 3: 'L' }; C.lsz = {}; C.tfs = [5, 60, 15, 240]; C.look = {}; C.mini = false; C.news = false; C.max = true; C.resume = null; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 3 && P._panes()[2].n); k++) await W(100);
    await W(500);
    var g = document.getElementById('stpr-grid'), grips = function (d) { return Array.prototype.slice.call(g.querySelectorAll('.stpr-gh.' + d)); };
    var rect = function (i) { return P._panes()[i].el.getBoundingClientRect(); };
    var phone = window.matchMedia('(hover: none) and (pointer: coarse)').matches || window.innerWidth <= 760;
    if (phone) {
      ok('a phone (the charts one under another): no borders to drag', grips('c').length === 0 && grips('r').length === 0, [grips('c').length, grips('r').length]);
    } else {
      ok('three charts, big one left: one grip on the long border, one between the two on the right', grips('c').length === 1 && grips('r').length === 1, [grips('c').length, grips('r').length]);
      var gc = grips('c')[0].getBoundingClientRect(), gr = grips('r')[0].getBoundingClientRect(), r0 = rect(0), r1 = rect(1), r2 = rect(2);
      ok('...each where its border is: the long one full height between chart 1 and the right, the other only across the right charts', Math.abs((gc.left + gc.right) / 2 - (r0.right + 1)) < 2 && Math.abs(gc.top - r0.top) < 2 && Math.abs(gc.bottom - r0.bottom) < 2
        && Math.abs((gr.top + gr.bottom) / 2 - (r1.bottom + 1)) < 2 && Math.abs(gr.left - r1.left) < 2 && Math.abs(gr.right - r1.right) < 2, [gc, r0, gr, r1]);
      var drag = async function (el, dx, dy) { var b = el.getBoundingClientRect(), x0 = (b.left + b.right) / 2, y0 = (b.top + b.bottom) / 2, o = { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'mouse', button: 0, buttons: 1 };
        el.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ clientX: x0, clientY: y0 }, o))); for (var s = 1; s <= 5; s++) { el.dispatchEvent(new PointerEvent('pointermove', Object.assign({ clientX: x0 + dx * s / 5, clientY: y0 + dy * s / 5 }, o))); await W(30); }
        el.dispatchEvent(new PointerEvent('pointerup', Object.assign({ clientX: x0 + dx, clientY: y0 + dy }, o, { buttons: 0 }))); await W(250); };
      var w0 = r0.width;
      await drag(grips('c')[0], 120, 0);
      var w1 = rect(0).width;
      ok('the long border dragged 120 px right: chart 1 is 120 px wider, the right ones narrower', Math.abs(w1 - w0 - 120) < 3 && Math.abs(rect(1).width - (r1.width - 120)) < 3, [w0, w1, r1.width, rect(1).width]);
      ok('...kept for this arrangement on this device', C.lsz && C.lsz['3|L'] && C.lsz['3|L'].c && C.lsz['3|L'].c.length === 2, C.lsz);
      var h1 = rect(1).height; await drag(grips('r')[0], 0, -80);
      ok('the border between the right charts dragged 80 px up: the top one 80 px shorter, the bottom one taller, chart 1 the same', Math.abs(rect(1).height - (h1 - 80)) < 3 && Math.abs(rect(2).height - (r2.height + 80)) < 3 && Math.abs(rect(0).height - r0.height) < 2, [h1, rect(1).height, rect(2).height]);
      // rebuilt (as a reload or a new chart window would): the sizes stay
      await P._layout(4); for (k = 0; k < 60 && P._panes().length !== 4; k++) await W(100); await W(300);
      await P._layout(3); for (k = 0; k < 60 && !(P._panes().length === 3 && P._panes()[2].n); k++) await W(100); await W(400);
      ok('four charts and back to three: the sizes as left', Math.abs(rect(0).width - w1) < 3 && Math.abs(rect(1).height - (h1 - 80)) < 3, [rect(0).width, w1, rect(1).height]);
      await drag(grips('c')[0], -2000, 0);
      ok('it cannot squeeze a chart away: at least 140 px wide', rect(0).width >= 139 && rect(1).width >= 139, [rect(0).width, rect(1).width]);
      grips('c')[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })); await W(300);
      ok('a double-click on a border puts the arrangement back as it was (3 : 2)', Math.abs(rect(0).width - w0) < 3 && !(C.lsz && C.lsz['3|L']), [rect(0).width, w0, C.lsz]);
      var mdOk = true; try { grips('c')[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 })); } catch (e) { mdOk = false; }
      ok('a press on a grip draws nothing and selects nothing', mdOk && P._dr().list.length === 0 && P._dr().tool === 'none', [P._dr().list.length]);
    }
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
