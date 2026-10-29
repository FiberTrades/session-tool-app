(async function () {
  // Practice Replay: the Minimalist's settings window, TradingView's (Inputs / Style / Visibility, Defaults / Cancel / Ok),
  // and its range zone moved by hand (Nestor, 17 Oct 2026: "it doesnt have all the settings options and i cant move the P/D
  // zone?", "distance units? will that be calculated automatically", "i need the visability option for the indicator").
  // Real EUR/USD candles of Thu 15 Oct 2026 - a day inside the candle store's stand-in (tests/fixtures/candles: its 1-minute sample is the week of 12-16 Oct 2026), so the day and the history before it are the same real candles.
  // Run: python tests/browser_test.py tests/practice_miniset_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.look = {}; C.mini = true; C.miniOff = {}; C.miniS = {}; C.max = true; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-15' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('14:30'); await W(500); P._render(); await W(100);
    var pane = function () { return P._panes()[0]; }, M = function () { pane()._mini = null; return P._mini(0); };
    var ch = pane().el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0 }, o || {}))); };
    var dlg = function () { return document.querySelector('.stpr-dlg'); }, inp = function (k, sel) { return dlg().querySelector((sel || '') + '[data-k="' + k + '"]'); };
    var fire = function (el, ev) { el.dispatchEvent(new Event(ev, { bubbles: true })); };

    // the window, from Show on chart
    document.getElementById('stpr-layersbtn').click(); await W(40);
    var sb = document.querySelector('#stpr-menu [data-miniset]');
    ok('Show on chart has a gear beside Minimalist (its settings)', sb && sb.classList.contains('stpr-tglgear') && !!sb.closest('.stpr-tgl') && /Session Indicator/.test(sb.closest('.stpr-tgl').textContent));
    sb.click(); await W(60);
    var tabs = dlg() && Array.prototype.map.call(dlg().querySelectorAll('[data-dt]'), function (b) { return b.textContent; });
    ok("it opens TradingView's window: Minimalist, tabs Inputs / Style / Visibility, Defaults, Cancel, Ok", dlg() && /Session Indicator/.test(dlg().querySelector('.stpr-dlgh').textContent) && tabs.join(',') === 'Inputs,Style,Visibility' && dlg().querySelector('[data-ddef]') && dlg().querySelector('[data-dc]') && dlg().querySelector('[data-dok]'), tabs);
    var txt = dlg().textContent;
    // his panel, input for input (17 Oct 2026: "why dont you just copy all the options that i have")
    var want = ['Premium & Discount Zones', '\u2501\u2501 P/D Zone', 'Detach Start Only', 'P/D Range Start', 'P/D Range End', 'Auto: Follow Structure', 'Structure Length (bars)', 'Extend to Latest High/Low', 'Extend Right (bars)', 'Show Range Markers', 'Premium', 'Equilibrium', 'Discount',
      'Sessions', 'Times', 'History (sessions)', 'Hide Sessions Above', 'Pre-fill Session Box', 'Show Range', 'Label Size', 'Label Position', 'Override Label Color', 'Box Opacity', 'Box Border Style', 'S1', 'S2', 'S3', 'S4',
      'Previous Day / Week / Month', '\u2501\u2501 Previous Day/Week/Month H/L', 'Show Range Numbers', 'Abbreviate Days of the Week', 'Day Separators', 'Move labels right (bars)', 'Line Style', '\u2501\u2501 Yearly Quarter Lines', 'Years Back', 'Label Y Offset (\u00d7 ATR)', 'Distance Units', 'Distance Unit', 'Show Unit (p / pts / t)'];
    var missing = want.filter(function (w) { return txt.indexOf(w) < 0; });
    ok('Inputs: every input of his TradingView panel, in its groups and with its wording', !missing.length, missing);
    ok('his values: Structure Length 30, Extend Right 10, times in your own time, History 6, hide above 15m, London 08:00-10:00 on and the others off, Box Opacity 100, Show Range Numbers off, Line Style dotted, Label Size small, Move labels right 20, Years Back 1, Label Y Offset 35, Distance Unit Auto',
      inp('len').value === '30' && inp('ext').value === '10' && /Your time \(/.test((dlg().querySelector('.stpr-dtz') || {}).textContent || '') && !inp('tz') && inp('hist').value === '6' && inp('sesMax').value === '15' && inp('s0.on').checked && inp('s0.name').value === 'London' && inp('s0.a').value === '08:00' && inp('s0.b').value === '10:00' && !inp('s1.on').checked
      && inp('sesOp').value === '100' && !inp('nums').checked && inp('dwmLine').value === 'dotted' && inp('dwmSize').value === 'small' && inp('sesSize').value === 'small' && inp('dwmExt').value === '20' && inp('qBack').value === '1' && inp('qLblY').value === '35' && inp('unit').value === 'auto' && inp('sesOvr').checked, txt);
    ok('with his notes: an (i) beside the inputs that have one (24, three of them in the Volume Profile, one on the session times)', dlg().querySelectorAll('.stpr-dinfo').length === 24 && /Single toggle for all three/.test(dlg().querySelector('.stpr-dinfo').parentNode.parentNode.parentNode.innerHTML + Array.prototype.map.call(dlg().querySelectorAll('.stpr-dinfo'), function (x) { return x.title; }).join('|')), dlg().querySelectorAll('.stpr-dinfo').length);
    var i0b = dlg().querySelector('.stpr-dinfo'); i0b.click(); await W(30);
    var tipEl = dlg().querySelector('.stpr-dtip');
    ok('pressing an (i) opens its note under the row (a phone has no hover); pressed again it closes', tipEl && /Master toggle/.test(tipEl.textContent) && (i0b.click(), !dlg().querySelector('.stpr-dtip')), tipEl && tipEl.textContent);
    ok('colours inline with opacity, as on his panel: Premium, Equilibrium, Discount, the label colour, each session', ['cTop', 'cMid', 'cBot', 'sesInk', 's0.col', 's1.col', 's2.col', 's3.col'].every(function (k) { return dlg().querySelector('[data-dsw="' + k + '"]'); }));
    // the zone a structure length gives, worked out here as the indicator does (swings of len bars each side, counted once len bars have
    // closed after them; a close beyond one anchors the zone at the strong point of the leg that broke it; its top and bottom since then)
    var zoneFor = function (len) { var B = P._panes()[0].bars, n = B.length, sh = null, shI = -1, shB = true, sl = null, slI = -1, slB = true, sI = -1, i, k;
      for (i = 0; i < n; i++) { var c = i - len; if (c >= len) { var isH = true, isL = true; for (k = c - len; k <= c + len && (isH || isL); k++) { if (k === c) continue; if (isH && (k < c ? B[k].high >= B[c].high : B[k].high > B[c].high)) isH = false; if (isL && (k < c ? B[k].low <= B[c].low : B[k].low < B[c].low)) isL = false; }
          if (isH) { sh = B[c].high; shI = c; shB = false; } if (isL) { sl = B[c].low; slI = c; slB = false; } }
        if (!shB && sh != null && B[i].close > sh) { shB = true; sI = shI; for (k = shI; k <= i; k++) if (B[k].low < B[sI].low) sI = k; }
        if (!slB && sl != null && B[i].close < sl) { slB = true; sI = slI; for (k = slI; k <= i; k++) if (B[k].high > B[sI].high) sI = k; } }
      if (sI < 0) return null; var hi = -1e9, lo = 1e9; for (k = sI; k < n; k++) { hi = Math.max(hi, B[k].high); lo = Math.min(lo, B[k].low); } return { i0: sI, top: hi, bot: lo }; };
    var z0 = M().zone, e30 = zoneFor(30), same = function (a, b) { return !!(a && b && a.i0 === b.i0 && a.top === b.top && a.bot === b.bot); };
    var L = [15, 10, 20, 12, 8, 25, 40, 50, 5, 6, 75, 80].filter(function (x) { var z = zoneFor(x); return z && !same(z, e30); })[0], eL = L ? zoneFor(L) : null;   // a length that moves the zone on this day
    inp('len').value = String(L || 15); fire(inp('len'), 'input'); await W(60);
    var z1 = M().zone;
    ok('a change shows on the chart at once (structure length ' + L + ': the zone that length gives, not the one 30 gives)', same(z0, e30) && !!L && C.miniS.len === L && same(z1, eL) && !same(z1, z0), [z0, e30, L, z1, eL]);
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
    ok('Style: the day-of-week labels, the opening gaps, lines and labels', /Day of week labels/i.test(dlg().textContent) && /Market Open Imbalance Gaps/i.test(dlg().textContent) && /Lines and labels/i.test(dlg().textContent) && dlg().querySelector('[data-dsw="gUp"]'));
    dlg().querySelector('[data-dt="0"]').click(); await W(40);
    dlg().querySelector('[data-dsw="cTop"]').click(); await W(30);
    ok('a colour opens the palette with its opacity (Premium: 10%)', dlg().querySelector('[data-dop]') && dlg().querySelector('[data-dop]').value === '10');
    dlg().querySelector('[data-dcol="#2962ff"]').click(); await W(40);
    ok('a colour from the palette keeps his opacity (10%)', C.miniS.cTop === 'rgba(41,98,255,0.1)', C.miniS.cTop);
    var opn = dlg().querySelector('[data-dop]'); opn.value = '25'; fire(opn, 'input'); await W(30);
    ok('and the opacity slider sets it (25%)', C.miniS.cTop === 'rgba(41,98,255,0.25)', C.miniS.cTop);
    // sessions: Box Opacity fills them, the labels' size and colour
    inp('sesOp').value = '80'; fire(inp('sesOp'), 'input'); inp('sesSize').value = 'large'; fire(inp('sesSize'), 'change'); await W(60);
    ok('Box Opacity 80 and Label Size large are kept', C.miniS.sesOp === 80 && C.miniS.sesSize === 'large', [C.miniS.sesOp, C.miniS.sesSize]);
    inp('sesOp').value = '100'; fire(inp('sesOp'), 'input'); inp('sesSize').value = 'small'; fire(inp('sesSize'), 'change'); await W(30);
    // visibility
    dlg().querySelector('[data-dt="2"]').click(); await W(40);
    ok('Visibility: Minutes, Hours, Days, Weeks, Months', dlg().querySelectorAll('.stpr-dvr').length === 5);
    var mo = inp('vis.m.on'); mo.click(); await W(60); P._render(); await W(60);
    ok('Minutes off: the indicator leaves the 15m chart', C.miniS.vis && !P._visOK(C.miniS.vis, 15) && pane()._mz == null, C.miniS.vis);
    inp('vis.m.on').click(); await W(40);
    dlg().querySelector('[data-dok]').click(); await W(60);
    ok('Ok keeps it all (saved): New York on, the blue Premium, every timeframe again', C.miniS.ses[1].on === true && C.miniS.cTop === 'rgba(41,98,255,0.25)' && !C.miniS.vis, C.miniS);
    // P/D Range Start / End as dates, as on his panel
    P._miniDialog(); await W(60); var sd0 = inp('zA');
    ok('P/D Range Start shows where the zone starts now', sd0 && sd0.type === 'datetime-local' && sd0.value.length === 16, sd0 && sd0.value);
    inp('auto').click(); await W(40); var Bz = pane().bars, tA = Bz[Bz.length - 40].time, dl = new Date(tA * 1000), p2 = function (x) { return (x < 10 ? '0' : '') + x; };
    inp('zA').value = dl.getFullYear() + '-' + p2(dl.getMonth() + 1) + '-' + p2(dl.getDate()) + 'T' + p2(dl.getHours()) + ':' + p2(dl.getMinutes()); fire(inp('zA'), 'change'); await W(60);
    ok('Auto off and a Range Start typed in: the zone starts on that candle', C.miniS.auto === false && M().zone.i0 === Bz.length - 40, [M().zone.i0, Bz.length - 40]);
    dlg().querySelector('[data-dc]').click(); await W(40);

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
    // its right edge on the chart, not on the price scale (a press there scales the chart since 20 Oct 2026): scroll it into view
    var pwR = r.width - pane().chart.priceScale('right').width();
    for (var sc = 0; sc < 6 && mz && mz.x1 > pwR - 12; sc++) { pane().chart.timeScale().scrollToPosition(pane().chart.timeScale().scrollPosition() + 25, false); await W(250); P._render(); await W(100); mz = pane()._mz; }
    mev('mousedown', mz.x1, ey); mev('mousemove', mz.x1 - 120, ey, { held: true }); mev('mouseup', mz.x1 - 120, ey); await W(80);
    var z3 = M().zone;
    ok('with Start only off, its right edge sets where it ends', C.miniS.detach === false && C.miniS.zB > C.miniS.zA && z3.end != null && z3.end < pane().bars.length - 1, [C.miniS.zB, z3.end]);
    // double-click inside it: its settings
    P._render(); await W(80); mz = pane()._mz; mev('dblclick', (mz.x0 + mz.x1) / 2, (mz.y0 + mz.y1) / 2); await W(80);
    ok('a double-click on the zone opens its settings', dlg() && /Session Indicator/.test(dlg().textContent));
    dlg().querySelector('[data-ddef]').click(); dlg().querySelector('[data-dreset]').click(); await W(60); dlg().querySelector('[data-dok]').click(); await W(60);
    ok('Defaults > Reset settings: his settings again (Auto on, London only)', C.miniS.auto === true && C.miniS.ses[1].on === false && C.miniS.cTop === 'rgba(233,30,99,0.1)' && M().zone.i0 === i0, C.miniS);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
