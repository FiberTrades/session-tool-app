(async function () {
  // Practice Replay: a chart in a window of its own (Nestor, 17 Oct 2026: "on computer when more that 1 chart is open so
  // if i have 2 3 or 4 open, can these extra charts be individually open in new windows like i am able to do with
  // tradingview?"). A real second window (chart.html), driven by this one. Real EUR/USD, Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_popchart_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var win = null;
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 3; C.lv = { 3: 'L' }; C.tfs = [15, 60, 240, 5]; C.look = {}; C.mini = false; C.max = true; C.resume = null; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 3 && P._panes()[2].n); k++) await W(100);
    P._goto('12:00'); await W(400);
    var btn = function (j) { return P._panes()[j].el.querySelector('[data-popc]'); };
    P._render(); await W(100);
    var br = btn(1).getBoundingClientRect(), pr1 = P._panes()[1].el.getBoundingClientRect(), psw1 = P._panes()[1].chart.priceScale('right').width();
    ok('charts 2 and 3 have a new-window button at their top right, beside the price scale (Nestor: "can this be on this side?"); chart 1 (with the panel) does not', !btn(0) && btn(1) && btn(2) && btn(1).title === 'Open this chart in a new window' && br.top - pr1.top < 14 && Math.abs((pr1.right - br.right) - (psw1 + 8)) < 3, [!!btn(0), btn(1) && btn(1).title, br.top - pr1.top, pr1.right - br.right, psw1]);

    btn(2).click();
    for (k = 0; k < 120 && !(P._pops()[2] && P._pops()[2].ready && P._panes()[2] && P._panes()[2].el.ownerDocument !== document && P._panes()[2].n); k++) await W(100);
    var o = P._pops()[2]; win = o && o.w;
    var p2 = P._panes()[2];
    ok('pressed: chart 3 opens in a new window (chart.html, the standard layout) and moves there', win && /chart\.html\?slot=2$/.test(win.location.href) && win.document.compatMode === 'CSS1Compat' && p2.el.ownerDocument === win.document && win.document.getElementById('stpr-grid').contains(p2.el), win && win.location.href);
    var g = document.getElementById('stpr-grid');
    ok('this window lays out the two it still has, side by side, bigger', g.className.indexOf('l2') >= 0 && g.querySelectorAll('.stpr-pane').length === 2 && P._panes().length === 3, g.className);
    await W(300);
    var cv = win.document.querySelectorAll('.stpr-pc canvas'), r2 = p2.el.getBoundingClientRect(), tb2 = win.document.getElementById('stpr-tb2');
    ok('it is drawn by that window\'s own chart library, filling the window under its toolbar', cv.length > 2 && win.LightweightCharts && win.LightweightCharts !== window.LightweightCharts && Math.abs(r2.width - win.innerWidth) < 4 && Math.abs(r2.height + tb2.offsetHeight - win.innerHeight) < 4, [cv.length, r2.width, win.innerWidth, r2.height, tb2.offsetHeight, win.innerHeight]);
    // its toolbar (Nestor, 17 Oct 2026: "when i open a new window of a chart i want to have all of these options too")
    var ids = function (d, sel) { return Array.prototype.map.call(d.querySelectorAll(sel), function (b) { return b.id || b.getAttribute('data-tool'); }).join(','); };
    ok('that window has the same toolbar: drawing tools, undo / redo / delete, snapshot, Show on chart, chart settings, news', ids(win.document, '#stpr-tb2 .stpr-tbm button') === ids(document, '#stpr-tb2 button') && /stpr-snapbtn/.test(ids(win.document, '#stpr-tb2 .stpr-tbm button')) && /long,short/.test(ids(win.document, '#stpr-tb2 .stpr-tbm button')), ids(win.document, '#stpr-tb2 .stpr-tbm button'));
    // its timeframe button in the top bar, before the drawing tools (Nestor: "can the TF go on the bar above before the objects list?")
    var wtb = win.document.getElementById('stpr-tb2'), wpill = wtb.querySelector('.stpr-tfpill');
    ok('its timeframe button sits in the top bar, first, before the pencil; not on the chart', wpill && wtb.firstElementChild.contains(wpill) && wpill.textContent.indexOf('4h') === 0 && !p2.el.querySelector('.stpr-tfpill') && wpill.getBoundingClientRect().right <= wtb.querySelector('#stpr-drawbtn').getBoundingClientRect().left, wpill && wpill.textContent);
    wpill.click(); await W(40); var wtw = wpill.parentNode;
    ok('pressed: its timeframes open', wtw.classList.contains('open'));
    wpill.click(); await W(40);
    ok('pressed again: they close (Nestor: "clicking on the TF on the external window doesnt make the list go away")', !wtw.classList.contains('open'));
    win.document.querySelector('#stpr-tb2 #stpr-drawbtn').click(); await W(60);
    ok('its pencil opens the drawing tools (there and here)', document.getElementById('stpr-tb2').classList.contains('drawing') && win.document.getElementById('stpr-tb2').classList.contains('drawing'));
    // a tools group's list opens only in the window it is opened in (21 Oct 2026: "i want them to work individually")
    var g0 = win.document.querySelector('#stpr-tb2 .stpr-tg [data-tgrp]'), gk = g0 && g0.closest('.stpr-tg').getAttribute('data-grp');
    if (g0) { g0.click(); await W(120); }
    var sgw = gk && win.document.querySelector('#stpr-tb2 .stpr-tg[data-grp="' + gk + '"]'), sgm = gk && document.querySelector('#stpr-tb2 .stpr-tg[data-grp="' + gk + '"]');
    ok('a tools group opened in that window opens there only, not in this window', !!sgw && getComputedStyle(sgw.querySelector('.stpr-tfl')).display === 'flex' && !!sgm && getComputedStyle(sgm.querySelector('.stpr-tfl')).display === 'none', [gk, sgw && getComputedStyle(sgw.querySelector('.stpr-tfl')).display, sgm && getComputedStyle(sgm.querySelector('.stpr-tfl')).display]);
    var g1 = gk && document.querySelector('#stpr-tb2 .stpr-tg[data-grp="' + gk + '"] [data-tgrp]'); if (g1) { g1.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); g1.click(); await W(120); }   // pressed as a mouse does: this window is the one in use
    sgw = gk && win.document.querySelector('#stpr-tb2 .stpr-tg[data-grp="' + gk + '"]'); sgm = gk && document.querySelector('#stpr-tb2 .stpr-tg[data-grp="' + gk + '"]');
    ok('...and the same group pressed in this window opens here, and closes there', !!sgm && getComputedStyle(sgm.querySelector('.stpr-tfl')).display === 'flex' && !!sgw && getComputedStyle(sgw.querySelector('.stpr-tfl')).display === 'none', [sgm && getComputedStyle(sgm.querySelector('.stpr-tfl')).display, sgw && getComputedStyle(sgw.querySelector('.stpr-tfl')).display]);
    if (g1) { document.querySelector('#stpr-tb2 .stpr-tg[data-grp="' + gk + '"] [data-tgrp]').click(); await W(80); }
    win.document.querySelector('#stpr-tb2 [data-tool="hline"]').click(); await W(40);
    ok('a tool picked there is the tool', P._dr().tool === 'hline' && win.document.querySelector('#stpr-tb2 [data-tool="hline"]').classList.contains('on'));
    win.document.querySelector('#stpr-tb2 [data-tool="hline"]').click(); await W(40);
    win.document.querySelector('#stpr-tb2 #stpr-snapbtn').click(); await W(60);
    var wm = win.document.getElementById('stpr-menu');
    ok('its snapshot button opens the menu in that window, under the button', wm.classList.contains('show') && /Copy image/.test(wm.textContent) && !document.getElementById('stpr-menu').classList.contains('show') && Math.abs(wm.getBoundingClientRect().left - win.document.querySelector('#stpr-tb2 #stpr-snapbtn').getBoundingClientRect().left) < 260, wm.className);
    win.document.querySelector('#stpr-tb2 #stpr-snapbtn').click(); await W(40);
    ok('pressed again it closes', !wm.classList.contains('show'));
    win.document.querySelector('#stpr-tb2 #stpr-layersbtn').click(); await W(60);
    ok('Show on chart opens there too, with the Minimalist switch', wm.classList.contains('show') && /Minimalist/.test(wm.textContent));
    win.document.querySelector('#stpr-tb2 #stpr-layersbtn').click(); await W(40);
    ok('its title names the symbol (as MT5 does) and timeframe', /EURUSD · 4h · Replay/.test(win.document.title), win.document.title);
    var bk = p2.el.querySelector('[data-popc]');
    ok('there its button reads Back to the main window', bk && bk.title === 'Back to the main window');
    var lastT = function (p) { var a = p.series.data().filter(function (x) { return x.close != null; }); return a.length ? a[a.length - 1].time : null; };
    p2.tf === 240 || (await W(0)); var t0 = lastT(p2), now0 = P._s().now;
    for (k = 0; k < 20; k++) P._step(); await W(250);
    ok('the replay moves it too (one replay): its latest 4h candle goes on to the next', P._s().now > now0 && lastT(p2) > t0, [now0, P._s().now, t0, lastT(p2)]);

    // drawing on it: a horizontal line drawn there is on every chart
    var DW = P._dr(); DW.list = []; DW.sel = null; P._render();
    var pc = p2.el.querySelector('.stpr-pc'), r = pc.getBoundingClientRect();
    var mev = function (doc, t, x, y) { var el = doc.elementFromPoint(r.left + x, r.top + y) || pc; el.dispatchEvent(new win.MouseEvent(t, { clientX: r.left + x, clientY: r.top + y, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' ? 1 : 0, view: win })); };
    document.getElementById('stpr-drawbtn').click(); await W(20); document.querySelector('#stpr-tools [data-tool="hline"]').click();
    mev(win.document, 'mousedown', r.width * 0.4, r.height * 0.5); mev(win.document, 'mouseup', r.width * 0.4, r.height * 0.5); await W(120);
    ok('a line drawn in that window is one drawing, on every chart', DW.list.length === 1 && DW.list[0].type === 'hline', DW.list);
    await W(150); var y = P._yOf(2, DW.list[0].price), yel = 0;
    Array.prototype.forEach.call(pc.querySelectorAll('canvas'), function (c) { try { var g2 = c.getContext('2d'), sx = c.width / c.getBoundingClientRect().width, row = g2.getImageData(0, Math.round(y * sx), c.width, 1).data;
      for (var q = 0; q < row.length; q += 4) if (row[q] > 200 && row[q + 1] > 150 && row[q + 2] < 140 && row[q + 3] > 100) yel++; } catch (e) {} });
    ok('drawn there (on the chart in that window, yellow, as a price line) and here', (P._panes()[2].hl || []).length === 1 && (P._panes()[0].hl || []).length === 1 && yel > 50, [yel, (P._panes()[2].hl || []).length, (P._panes()[0].hl || []).length]);
    // keys pressed in that window work as here
    var n1 = P._s().now; win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await W(80);
    ok('keys pressed there work (Right arrow steps the replay)', P._s().now > n1, [n1, P._s().now]);
    win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); await W(60);
    ok('and Delete there removes the selected line', DW.list.length === 0, DW.list.length);
    // its timeframe changed there
    var pill = win.document.querySelector('#stpr-tb2 .stpr-tfpill'); pill.click(); await W(40);
    var b1h = win.document.querySelector('#stpr-tb2 .stpr-tfseg [data-tf="60"]'); b1h.click();
    for (k = 0; k < 60 && !(P._panes()[2] && P._panes()[2].tf === 60 && P._panes()[2].n && P._panes()[2].el.ownerDocument === win.document); k++) await W(100);
    ok('its timeframe changed in that window: it stays there, now 1h, and the title and its button follow', P._panes()[2].tf === 60 && P._panes()[2].el.ownerDocument === win.document && C.tfs[2] === 60 && /· 1h ·/.test(win.document.title) && win.document.querySelector('#stpr-tb2 .stpr-tfpill').textContent.indexOf('1h') === 0, [P._panes()[2].tf, win.document.title]);
    // the snapshot of this window: only its own charts
    win.document.dispatchEvent(new win.PointerEvent('pointerdown', { bubbles: true })); var snw = P._snap(), gw = win.document.getElementById('stpr-grid').getBoundingClientRect();
    ok('Copy image asked from that window pictures its chart', snw && Math.abs(snw.width - Math.round(gw.width * Math.max(1, Math.min(2, win.devicePixelRatio || 1)))) <= 1, snw && [snw.width, gw.width]);
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    var sn = P._snap(), gr = g.getBoundingClientRect(), dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    ok('Copy image here pictures the charts in this window', sn && Math.abs(sn.width - Math.round(gr.width * dpr)) <= 1);
    // this window hidden (minimised, or covered): the frames and the clock run on the chart window
    Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return true; } }); P._reLive();
    ok('this window hidden: the chart window draws the frames and runs the clock', P._liveWin() === win);
    delete document.hidden; P._reLive();
    ok('shown again: back here', P._liveWin() === window);
    // back
    p2 = P._panes()[2]; p2.el.querySelector('[data-popc]').click();
    for (k = 0; k < 60 && !(P._panes()[2] && P._panes()[2].el.ownerDocument === document && P._panes()[2].n); k++) await W(100);
    await W(200);
    ok('Back to the main window: that window closes, the chart is back here, three charts again', win.closed && P._panes()[2].el.ownerDocument === document && g.className.indexOf('l3') >= 0 && g.querySelectorAll('.stpr-pane').length === 3 && !P._pops()[2], [win.closed, g.className]);
    // closed with the window's own X
    btn(1).click(); for (k = 0; k < 120 && !(P._pops()[1] && P._pops()[1].ready && P._panes()[1].el.ownerDocument !== document); k++) await W(100);
    win = P._pops()[1] && P._pops()[1].w;
    ok('chart 2 out too', win && P._panes()[1].el.ownerDocument === win.document && g.querySelectorAll('.stpr-pane').length === 2);
    win.close(); for (k = 0; k < 60 && !(P._panes()[1] && P._panes()[1].el.ownerDocument === document && P._panes()[1].n); k++) await W(100);
    ok('its window closed with its own X: the chart comes back', P._panes()[1].el.ownerDocument === document && g.querySelectorAll('.stpr-pane').length === 3);
    // fewer charts: the window of one that went closes; closing Practice Replay closes them all
    btn(2).click(); for (k = 0; k < 120 && !(P._pops()[2] && P._pops()[2].ready); k++) await W(100); win = P._pops()[2] && P._pops()[2].w;
    await P._layout(2); await W(300);
    ok('two charts picked: the window of chart 3 closes', win && win.closed && !P._pops()[2] && P._panes().length === 2);
    btn(1).click(); for (k = 0; k < 120 && !(P._pops()[1] && P._pops()[1].ready); k++) await W(100); win = P._pops()[1] && P._pops()[1].w;
    ok('two charts, the second in its window: this window shows one', win && g.className.indexOf('l1') >= 0 && g.querySelectorAll('.stpr-pane').length === 1);
    P.close(); await W(300);
    ok('Practice Replay closed: its chart windows close too', win && win.closed);
    // chart.html opened on its own goes to the app
    var fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;left:0;top:0;width:400px;height:300px;opacity:0;pointer-events:none'; fr.src = '/chart.html?slot=1'; document.body.appendChild(fr);
    var path = ''; for (k = 0; k < 40; k++) { await W(150); try { path = fr.contentWindow.location.pathname; } catch (e) {} if (/app\.html$/.test(path)) break; }
    ok('chart.html opened on its own goes to the app', /app\.html$/.test(path), path); fr.remove();
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); try { if (win && !win.closed) win.close(); } catch (x) {} }
  return JSON.stringify(out);
})()
