(async function () {
  // Practice Replay: TradingView's O H L C legend on each chart ("can i also get this in the charts?") and the chart snapshot's
  // Copy image / Copy link ("can you also give me these 2 options to take images?"). Real EUR/USD candles of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_snap_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 2; C.tfs = [15, 60]; C.look = {}; C.mini = false; C.max = true; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    P._goto('14:30'); await W(500); P._render(); await W(100);
    var pane = function (i) { return P._panes()[i || 0]; }, f5 = function (v) { return Number(v).toFixed(5); };
    var B = pane(0).bars, lb = B[B.length - 1], pb = B[B.length - 2];
    var txt = P._ohlc(0), ch = lb.close - pb.close;
    ok('each chart shows O H L C and the change of its latest candle, TradingView\'s way', txt === 'O' + f5(lb.open) + 'H' + f5(lb.high) + 'L' + f5(lb.low) + 'C' + f5(lb.close) + (ch >= 0 ? '+' : '−') + f5(Math.abs(ch)) + ' (' + (ch >= 0 ? '+' : '−') + Math.abs(ch / pb.close * 100).toFixed(2) + '%)', [txt, lb]);
    var el = pane(0).el.querySelector('.stpr-ohlc');
    ok('coloured by the candle (green up, red down), beside the timeframe button', el && el.classList.contains(lb.close >= lb.open ? 'u' : 'd') && el.parentNode.classList.contains('stpr-ptfw'));
    // the crosshair on a candle
    var tb = B[B.length - 30], ch0 = pane(0).el.querySelector('.stpr-pc'), r = ch0.getBoundingClientRect(), x = P._xOfT(0, tb.time);
    var tg = document.elementFromPoint(r.left + x, r.top + 200) || ch0; tg.dispatchEvent(new MouseEvent('mousemove', { clientX: r.left + x, clientY: r.top + 200, bubbles: true })); await W(80);
    var t2 = P._ohlc(0);
    ok('the crosshair on a candle: its figures instead', t2.indexOf('O' + f5(tb.open) + 'H' + f5(tb.high) + 'L' + f5(tb.low) + 'C' + f5(tb.close)) === 0, [t2, tb]);
    var B1 = pane(1).bars, h1 = B1.filter(function (b) { return b.time <= tb.time; }).pop(), t3 = P._ohlc(1);
    ok('and the other chart shows its own candle at that moment (the 1h)', h1 && t3.indexOf('O' + f5(h1.open) + 'H' + f5(h1.high)) === 0, [t3, h1]);
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 5, clientY: 5, bubbles: true })); document.dispatchEvent(new MouseEvent('mousemove', { clientX: 5, clientY: 5, bubbles: true }));
    // the snapshot
    var sb = document.getElementById('stpr-snapbtn');
    ok('a snapshot button (camera) in the row with Show on chart', sb && sb.title === 'Take a snapshot' && sb.nextElementSibling && sb.nextElementSibling.id === 'stpr-layersbtn');
    sb.click(); await W(40); var mn = document.getElementById('stpr-menu');
    ok("its menu: Chart snapshot - Copy image (Ctrl+Shift+S), Copy link (Alt+S)", mn.classList.contains('show') && /Chart snapshot/i.test(mn.textContent) && /Copy image\s*Ctrl\+Shift\+S/.test(mn.textContent) && /Copy link\s*Alt\+S/.test(mn.textContent), mn.textContent);
    sb.click(); await W(30);
    var cv = P._snap(), gr = document.getElementById('stpr-grid').getBoundingClientRect(), dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    ok('the picture holds both charts under a heading line (the grid plus 30 px)', cv && Math.abs(cv.width - Math.round(gr.width * dpr)) <= 1 && Math.abs(cv.height - Math.round((gr.height + 30) * dpr)) <= 1, cv && [cv.width, cv.height, gr.width, gr.height]);
    var g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data, green = 0, red = 0;
    for (var q = 0; q < d.length; q += 16) { if (d[q + 1] > 180 && d[q] < 120 && d[q + 2] > 100 && d[q + 2] < 170) green++; if (d[q] > 200 && d[q + 1] < 130 && d[q + 2] < 130) red++; }
    ok('with the candles in it (green and red)', green > 50 && red > 50, [green, red]);
    // Copy image: the browser decides; it is asked, and says so either way
    var fl = document.getElementById('stpr-flash'); fl.textContent = '';
    ok('Copy image asks the browser to copy it', P._snapCopy() === true);
    for (k = 0; k < 30 && !fl.textContent; k++) await W(100);
    ok('and says what happened (copied, or that the browser said no)', /Image copied|could not be copied/.test(fl.textContent), fl.textContent);
    var clip = null; try { var items = await navigator.clipboard.read(); clip = items.length ? items[0].types : null; if (clip && clip.indexOf('image/png') >= 0) { var bl = await items[0].getType('image/png'); clip = clip.concat([bl.size]); } } catch (e) { clip = 'read failed: ' + e; }
    ok('the clipboard now holds the picture (a PNG, read back)', /Image copied/.test(fl.textContent) && Array.isArray(clip) && clip.indexOf('image/png') >= 0 && clip[clip.length - 1] > 20000, clip);
    fl.textContent = ''; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S', code: 'KeyS', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
    for (k = 0; k < 30 && !fl.textContent; k++) await W(100);
    ok('Ctrl+Shift+S does the same', /Image copied|could not be copied/.test(fl.textContent), fl.textContent);
    // Copy link needs an account (the picture is uploaded to the member's own folder)
    var url = await P._snapLink();
    ok('Copy link signed out: it says to sign in, nothing uploaded', url === null && /Sign in to copy a link/.test(fl.textContent), fl.textContent);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
