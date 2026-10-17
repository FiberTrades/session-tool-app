(async function () {
  // Practice Replay: the Minimalist's settings window, TradingView's (Inputs / Style / Visibility, Defaults / Cancel / Ok),
  // and its range zone moved by hand (Nestor, 17 Oct 2026: "it doesnt have all the settings options and i cant move the P/D
  // zone?", "distance units? will that be calculated automatically", "i need the visability option for the indicator").
  // Real EUR/USD candles of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_miniset_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.look = {}; C.mini = true; C.miniOff = {}; C.miniS = {}; C.max = true; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('14:30'); await W(500); P._render(); await W(100);
    var pane = function () { return P._panes()[0]; }, M = function () { pane()._mini = null; return P._mini(0); };
    var ch = pane().el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0 }, o || {}))); };
    var dlg = function () { return document.querySelector('.stpr-dlg'); }, inp = function (k, sel) { return dlg().querySelector((sel || '') + '[data-k="' + k + '"]'); };
    var fire = function (el, ev) { el.dispatchEvent(new Event(ev, { bubbles: true })); };

    // the window, from Show on chart
    document.getElementById('stpr-layersbtn').click(); await W(40);
    var sb = document.querySelector('#stpr-menu [data-miniset]');
    ok('Show on chart has a Settings button under Minimalist', sb && /Settings/.test(sb.textContent));
    sb.click(); await W(60);
    var tabs = dlg() && Array.prototype.map.call(dlg().querySelectorAll('[data-dt]'), function (b) { return b.textContent; });
    ok("it opens TradingView's window: Minimalist, tabs Inputs / Style / Visibility, Defaults, Cancel, Ok", dlg() && /Minimalist/.test(dlg().querySelector('.stpr-dlgh').textContent) && tabs.join(',') === 'Inputs,Style,Visibility' && dlg().querySelector('[data-ddef]') && dlg().querySelector('[data-dc]') && dlg().querySelector('[data-dok]'), tabs);
    var txt = dlg().textContent;
    ok('Inputs: his settings - Range zone (Auto, Structure length 30, Start only, Extend right 10, markers), Sessions (GMT+1, history 6, hide above 15m, London 08:00-10:00 on, New York / Tokyo / Sydney off), Previous day / week / month, days, gaps, quarters, Distance unit Auto',
      ['Range zone', 'Auto: follow structure', 'Structure length', 'Start only', 'Extend right', 'Range markers', 'Sessions', 'Timezone', 'History (sessions)', 'Hide sessions above', 'Pre-fill session box', 'Show range', 'Label position', 'Previous day / week / month', 'Show range numbers', 'Move labels right', 'Line style', 'Abbreviate', 'Day separators', 'Opening gaps', 'Quarter lines', 'Years back', 'Distance unit'].every(function (w) { return txt.indexOf(w) >= 0; })
      && inp('len').value === '30' && inp('ext').value === '10' && inp('tz').value === '1' && inp('hist').value === '6' && inp('sesMax').value === '15' && inp('s0.on').checked && inp('s0.name').value === 'London' && inp('s0.a').value === '08:00' && inp('s0.b').value === '10:00' && !inp('s1.on').checked && inp('unit').value === 'auto', txt);
    ok('no ICT words in it', !/premium|discount|kill ?zone|liquidity|order block|equilibrium/i.test(txt));
    var z0 = M().zone; inp('len').value = '15'; fire(inp('len'), 'input'); await W(60);
    var z1 = M().zone;
    ok('a change shows on the chart at once (structure length 15: a different zone)', C.miniS.len === 15 && z1 && (z1.i0 !== z0.i0 || z1.top !== z0.top || z1.bot !== z0.bot), [z0, z1]);
    dlg().querySelector('[data-dc]').click(); await W(60);
    ok('Cancel puts it back (30, the zone as it was)', !dlg() && (!C.miniS || !C.miniS.len || C.miniS.len === 30) && M().zone.i0 === z0.i0, C.miniS);

    // sessions: New York on
    P._miniDialog(); await W(60); inp('s1.on').click(); await W(60);
    var ny = M().ses.filter(function (s) { return s.k === 1; }), B = pane().bars;
    ok('New York on: its boxes start at 13:00 GMT+1 (12:00 UTC), 36 candles long on the 15m', ny.length > 0 && ny.every(function (s) { var d = new Date(B[s.i0].time * 1000); return d.getUTCHours() === 12 && d.getUTCMinutes() === 0 && s.nb === 36; }), ny.map(function (s) { return new Date(B[s.i0].time * 1000).toISOString(); }));
    // distance unit
    inp('unit').value = 'points'; fire(inp('unit'), 'change'); await W(30); var pts = P._miniDist(0.0050);
    inp('unit').value = 'ticks'; fire(inp('unit'), 'change'); await W(30); var tks = P._miniDist(0.0050);
    inp('unit').value = 'pips'; fire(inp('unit'), 'change'); inp('suffix').click(); await W(30); var pps = P._miniDist(0.0050);
    ok('Distance unit: 50 pips of EUR/USD read Points 0.01, Ticks 500, Pips with the unit 50p (Auto: pips on a currency pair)', pts === '0.01' && tks === '500' && pps === '50p', [pts, tks, pps]);
    inp('unit').value = 'auto'; fire(inp('unit'), 'change'); inp('suffix').click(); await W(30);
    // style
    dlg().querySelector('[data-dt="1"]').click(); await W(40);
    ok('Style: the zone colours, each session, the labels, the gaps, lines and labels', /Top quarter/.test(dlg().textContent) && /Bottom quarter/.test(dlg().textContent) && /New York/.test(dlg().textContent) && /Opened above/.test(dlg().textContent) && /Follow the chart/.test(dlg().textContent));
    dlg().querySelector('[data-dsw="cTop"]').click(); await W(30); dlg().querySelector('[data-dcol="#2962ff"]').click(); await W(40);
    ok('a colour from the palette keeps his opacity (10%)', C.miniS.cTop === 'rgba(41,98,255,0.1)', C.miniS.cTop);
    // visibility
    dlg().querySelector('[data-dt="2"]').click(); await W(40);
    ok('Visibility: Minutes, Hours, Days, Weeks, Months', dlg().querySelectorAll('.stpr-dvr').length === 5);
    var mo = inp('vis.m.on'); mo.click(); await W(60); P._render(); await W(60);
    ok('Minutes off: the indicator leaves the 15m chart', C.miniS.vis && !P._visOK(C.miniS.vis, 15) && pane()._mz == null, C.miniS.vis);
    inp('vis.m.on').click(); await W(40);
    dlg().querySelector('[data-dok]').click(); await W(60);
    ok('Ok keeps it all (saved): New York on, the blue top quarter, every timeframe again', C.miniS.ses[1].on === true && C.miniS.cTop === 'rgba(41,98,255,0.1)' && !C.miniS.vis, C.miniS);

    // the zone, moved by hand
    P._render(); await W(100); var mz = pane()._mz;
    ok('the zone is on the chart and knows where its edges are', mz && mz.x1 > mz.x0, mz);
    var ex = Math.max(4, Math.min(mz.x0, r.width - 10)), ey = Math.max(mz.y0 + 6, Math.min(mz.y1 - 6, r.height * 0.5));
    if (mz.x0 < 4) { pane().chart.timeScale().scrollToPosition(-40, false); await W(300); P._render(); await W(100); mz = pane()._mz; ex = mz.x0; ey = Math.max(mz.y0 + 6, Math.min(mz.y1 - 6, r.height * 0.5)); }
    var i0 = M().zone.i0;
    mev('mousedown', mz.x0, ey); mev('mousemove', mz.x0 - 50, ey, { held: true }); mev('mouseup', mz.x0 - 50, ey); await W(80);
    var z2 = M().zone;
    ok('dragging its left edge moves its start back and turns Auto off (it says so)', C.miniS.auto === false && C.miniS.zA > 0 && z2.i0 < i0 && /moved by hand/.test(document.getElementById('stpr-flash').textContent), [i0, z2.i0, C.miniS.zA]);
    P._miniDialog(); await W(60); inp('detach').click(); await W(60); dlg().querySelector('[data-dok]').click(); await W(60); P._render(); await W(100); mz = pane()._mz;
    mev('mousedown', mz.x1, ey); mev('mousemove', mz.x1 - 120, ey, { held: true }); mev('mouseup', mz.x1 - 120, ey); await W(80);
    var z3 = M().zone;
    ok('with Start only off, its right edge sets where it ends', C.miniS.detach === false && C.miniS.zB > C.miniS.zA && z3.end != null && z3.end < pane().bars.length - 1, [C.miniS.zB, z3.end]);
    // double-click inside it: its settings
    P._render(); await W(80); mz = pane()._mz; mev('dblclick', (mz.x0 + mz.x1) / 2, (mz.y0 + mz.y1) / 2); await W(80);
    ok('a double-click on the zone opens its settings', dlg() && /Minimalist/.test(dlg().textContent));
    dlg().querySelector('[data-ddef]').click(); dlg().querySelector('[data-dreset]').click(); await W(60); dlg().querySelector('[data-dok]').click(); await W(60);
    ok('Defaults > Reset settings: his settings again (Auto on, London only)', C.miniS.auto === true && C.miniS.ses[1].on === false && C.miniS.cTop === 'rgba(233,30,99,0.1)' && M().zone.i0 === i0, C.miniS);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
