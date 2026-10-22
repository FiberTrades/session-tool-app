(async function () {
  // A new timeframe on one chart makes that chart alone again (Nestor, 22 Oct 2026: "when i change TF on one external chart the
  // indicator P/D zone, sessions, they flick on all external screens, stop this bug"). Every chart was made again for it, so all of
  // them - in this window and in the chart windows on other screens - blanked and drew their candles and the Minimalist again.
  // Three charts with the Minimalist on, charts 2 and 3 in windows of their own; chart 3's timeframe changed from its window.
  // Run: python tests/browser_test.py tests/tf_onechart_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var wins = [];
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 3; C.lv = { 3: 'L' }; C.tfs = [15, 60, 240, 5]; C.look = {}; C.mini = true; C.max = true; C.resume = null;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 3 && P._panes()[2].n); k++) await W(100);
    P._goto('12:00'); await W(400);
    for (var j = 1; j <= 2; j++) { P._pop(j); for (k = 0; k < 120 && !(P._pops()[j] && P._pops()[j].ready && P._panes()[j] && P._panes()[j].el.ownerDocument !== document && P._panes()[j].n); k++) await W(100); wins.push(P._pops()[j].w); }
    ok('charts 2 and 3 in windows of their own', P._panes()[1].el.ownerDocument === wins[0].document && P._panes()[2].el.ownerDocument === wins[1].document);
    await W(600);
    var before = P._panes().slice(0), ch = before.map(function (p) { return p.chart; }), els = before.map(function (p) { return p.el; });
    var zones = before.map(function (p) { return p.series.__stMub ? p.series.__stMub.sig : null; });
    ok('the Minimalist\'s shading is under the candles on every chart', zones.every(function (z) { return z && z.length > 2; }), zones.map(function (z) { return z && z.length; }));
    // watch the other charts' overlays while chart 3 changes: not one blank frame
    var blank = 0, frames = 0, stop = false, ovs = [before[0].ov, before[1].ov];
    var px = function (cv) { try { var g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data; for (var q = 3; q < d.length; q += 64) if (d[q]) return true; } catch (e) {} return false; };
    var watch = function () { if (stop) return; frames++; if (!ovs.every(px)) blank++; requestAnimationFrame(watch); }; requestAnimationFrame(watch);
    // chart 3's timeframe, from its own window's top bar
    var tb = wins[1].document.querySelector('#stpr-tb2 .stpr-tfseg [data-tf="60"]');
    ok('chart 3\'s window has its timeframes in its top bar', !!tb);
    tb.click();
    for (k = 0; k < 100 && !(P._panes()[2] && P._panes()[2].tf === 60 && P._panes()[2].n); k++) await W(100);
    await W(800); stop = true;
    var after = P._panes();
    ok('chart 3: 1h now, in its window, with its candles', after[2].tf === 60 && after[2].n > 0 && after[2].el.ownerDocument === wins[1].document, [after[2].tf, after[2].n]);
    ok('charts 1 and 2 were not made again (the same charts, the same elements)', after[0] === before[0] && after[1] === before[1] && after[0].chart === ch[0] && after[1].chart === ch[1] && after[0].el === els[0] && after[1].el === els[1]);
    ok('...their Minimalist untouched, and never blank while chart 3 changed', after[0].series.__stMub.sig === zones[0] && after[1].series.__stMub.sig === zones[1] && blank === 0 && frames > 5, { blank: blank, frames: frames });
    ok('chart 3\'s Minimalist drawn on its new timeframe', after[2].series.__stMub && after[2].series.__stMub.sig.length > 2 && after[2].series.__stMub.sig !== zones[2]);
    ok('chart 3\'s window shows 1h on its button; chart 2\'s still 4h... (as it was: 1h)', wins[1].document.querySelector('#stpr-tb2 .stpr-tfpill').textContent.indexOf('1h') === 0 && wins[0].document.querySelector('#stpr-tb2 .stpr-tfpill').textContent.indexOf('1h') === 0,
      [wins[1].document.querySelector('#stpr-tb2 .stpr-tfpill').textContent, wins[0].document.querySelector('#stpr-tb2 .stpr-tfpill').textContent]);
    // chart 1 (this window, with the EA panel on it): the same, and the panel stays
    var b1 = P._panes()[1], b2 = P._panes()[2];
    P._tf(0, 5); for (k = 0; k < 100 && !(P._panes()[0].tf === 5 && P._panes()[0].n); k++) await W(100); await W(300);
    ok('chart 1 to 5m: chart 1 alone made again, in its place, the panel still on it', P._panes()[0].tf === 5 && P._panes()[1] === b1 && P._panes()[2] === b2 && document.getElementById('stpr-grid').firstElementChild === P._panes()[0].el && !!P._panes()[0].el.querySelector('.stpr-mm'));
    // a new layout still makes them all again (nothing else changed)
    await P._layout(2); for (k = 0; k < 100 && !(P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    ok('a layout change: two charts', P._panes().length === 2 && P._panes()[1].n > 0);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { P.close(); } catch (e) {}
  wins.forEach(function (w) { try { if (w && !w.closed) w.close(); } catch (e) {} });
  return out;
})()
