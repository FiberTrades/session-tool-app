(async function () {
  // Trade Replay batch B (Nestor, 17 Oct 2026, the approved list): O H L C on a candle click, Chart settings (shared with Practice
  // Replay), Snapshot (Copy image / Copy link), the timeframe button without its arrow, the timeframes and the drawing tools
  // closing each other, bigger icons. A made-up EUR/USD short on Thu 1 Oct 2026 over the real shared candles (signed out).
  // Run: python tests/browser_test.py tests/replay_chart_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stReplay && window.__stSB && window.__stPractice); i++) await W(100);
    await W(1000);
    var R = window.__stReplay, PR = window.__stPractice, errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    try { PR._cfg().look = {}; } catch (e) {}
    var trade = { mt5Ticket: 999999904, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 };
    R.open(trade); for (var k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(800);
    var S = R._s(), chart = document.getElementById('strp-chart'), r = chart.getBoundingClientRect();
    var tb = document.getElementById('strp-tb'), tfb = document.getElementById('strp-tfbtn'), drb = document.getElementById('strp-drawbtn');
    var flashTxt = function () { var f = document.getElementById('strp-flash'); return f && f.classList.contains('show') ? f.textContent : ''; };
    var pev = function (t, x, y, o) { var el = document.elementFromPoint(r.left + x, r.top + y) || chart; el.dispatchEvent(new PointerEvent(t, Object.assign({ clientX: r.left + x, clientY: r.top + y, bubbles: true, cancelable: true, pointerType: 'mouse', button: 0, buttons: t === 'pointerup' ? 0 : 1 }, o || {}))); };
    var tap = function (x, y) { pev('pointerdown', x, y); pev('pointerup', x, y); };

    // ---- the toolbar ----
    ok('the timeframe button: its name only, no arrow', tfb && !tfb.querySelector('svg') && /^\d+[mhDW]$/.test(tfb.textContent.trim()), tfb && tfb.innerHTML);
    if (tb.classList.contains('strp-tfopen')) tfb.click(); if (tb.classList.contains('strp-drawopen')) drb.click(); await W(30);
    tfb.click(); await W(30); drb.click(); await W(30);
    ok('opening the drawing tools closes the timeframes', tb.classList.contains('strp-drawopen') && !tb.classList.contains('strp-tfopen'));
    tfb.click(); await W(260);   // after its slide-in
    ok('opening the timeframes closes the drawing tools', tb.classList.contains('strp-tfopen') && !tb.classList.contains('strp-drawopen'));
    var tfr = document.getElementById('strp-tfs').getBoundingClientRect(), tbr = tfb.getBoundingClientRect();
    ok('the timeframes open sideways, beside the button', Math.abs((tfr.top + tfr.height / 2) - (tbr.top + tbr.height / 2)) < 4 && tfr.left > tbr.right - 2, [tfr.left, tbr.right]);
    drb.click(); await W(30);
    var svw = getComputedStyle(document.querySelector('#strp-tools [data-tool="trend"] svg')).width, icw = getComputedStyle(document.querySelector('#strp-undo svg')).width;
    ok('bigger icons: 16 px', svw === '16px' && icw === '16px', [svw, icw]);
    var order = ['strp-treebtn', 'strp-snapbtn', 'strp-layersbtn', 'strp-lookbtn', 'strp-newsbtn', 'strp-cmaxtb'].map(function (id) { return document.getElementById(id).getBoundingClientRect().left; });
    ok('on the right: Object tree, Snapshot, Show on chart, Chart settings, News, Expand', order.every(function (x, j) { return j === 0 || x > order[j - 1]; }), order);

    // ---- O H L C on a candle click ----
    var ts = S.chart.timeScale(), bi = Math.min(S.cursor, S.bars.length) - 6, bar = S.bars[bi], bx = ts.logicalToCoordinate(bi), by = (S.series.priceToCoordinate(bar.high) + S.series.priceToCoordinate(bar.low)) / 2;
    var oh = document.getElementById('strp-ohlc');
    ok('nothing clicked: no O H L C', !oh.classList.contains('on'));
    tap(bx, by); await W(40);
    var dg = String(S.entry).split('.')[1].length, f = function (v) { return Number(v).toFixed(dg); };
    ok('a click on a candle shows its O H L C', oh.classList.contains('on') && oh.textContent.indexOf('O' + f(bar.open) + 'H' + f(bar.high) + 'L' + f(bar.low) + 'C' + f(bar.close)) === 0, oh.textContent);
    var lv = document.getElementById('strp-live');
    ok('under the P&L panel', oh.getBoundingClientRect().top >= lv.getBoundingClientRect().bottom, [oh.getBoundingClientRect().top, lv.getBoundingClientRect().bottom]);
    pev('pointerdown', bx, by); pev('pointermove', bx + 40, by + 10); pev('pointerup', bx + 40, by + 10); await W(30);
    ok('a drag clears it', !oh.classList.contains('on'));
    tap(bx, by); await W(30); chart.dispatchEvent(new WheelEvent('wheel', { clientX: r.left + bx, clientY: r.top + by, deltaY: 50, bubbles: true, cancelable: true })); await W(30);
    ok('the wheel clears it', !oh.classList.contains('on'));
    tap(bx, by); await W(30); tap(bx, 6); await W(30);
    ok('a click off the candles clears it', !oh.classList.contains('on'));

    // ---- Chart settings ----
    document.getElementById('strp-lookbtn').click(); await W(60);
    var mn = document.getElementById('strp-menu');
    ok('Chart settings: Practice Replay\'s menu (styles, scales, candles)', mn.classList.contains('show') && /Chart basic styles/i.test(mn.textContent) && /Scales/i.test(mn.textContent) && /Candles/i.test(mn.textContent) && /same settings as Practice Replay/.test(mn.textContent), mn.textContent.slice(0, 120));
    ok('it fits in the replay (scrolls inside when tall)', mn.getBoundingClientRect().bottom <= document.querySelector('.strp-card').getBoundingClientRect().bottom + 1, [mn.getBoundingClientRect().bottom, document.querySelector('.strp-card').getBoundingClientRect().bottom]);
    ok('Trade Replay keeps its own look until something is changed (text #c0c0c0, size 12)', S.chart.options().layout.textColor === '#c0c0c0' && S.chart.options().layout.fontSize === 12, [S.chart.options().layout.textColor, S.chart.options().layout.fontSize]);
    mn.querySelector('[data-lksw="up"]').click(); await W(30);
    mn = document.getElementById('strp-menu'); mn.querySelector('.stpr-lkp [data-lkcol="#2962ff"]').click(); await W(40);
    ok('picking the up colour (blue): the candles change and Practice Replay has it too', S.series.options().upColor === '#2962ff' && PR._cfg().look.up === '#2962ff' && mn.classList.contains('show'), [S.series.options().upColor, PR._cfg().look]);
    var vg = document.getElementById('strp-menu').querySelector('[data-lkchk="vg"]'); vg.click(); await W(30);
    ok('Vertical grid lines off', S.chart.options().grid.vertLines.visible === false, S.chart.options().grid.vertLines);
    document.getElementById('strp-menu').querySelector('[data-lkseg="cxs"][data-v="dotted"]').click(); await W(30);
    ok('Crosshair dotted: the replay\'s crosshair follows', R._look().cxs === 'dotted');
    document.getElementById('strp-menu').querySelector('[data-lkchk="prev"]').click(); await W(80);
    ok('Colour bars on the previous close: on', R._look().prev === true && PR._cfg().look.prev === true);
    document.getElementById('strp-menu').querySelector('[data-lkreset]').click(); await W(80);
    ok('Reset settings: back to Trade Replay\'s own look, Practice\'s cleared too', S.series.options().upColor === '#4ECD8B' && S.chart.options().grid.vertLines.visible !== false && !Object.keys(PR._cfg().look || {}).length && R._look().prev === false, [S.series.options().upColor, PR._cfg().look]);
    document.body.click(); await W(30);
    ok('a click elsewhere closes it', !document.getElementById('strp-menu').classList.contains('show'));

    // ---- Snapshot ----
    document.getElementById('strp-snapbtn').click(); await W(40); mn = document.getElementById('strp-menu');
    ok('Snapshot: Copy image (Ctrl+Shift+S) and Copy link (Alt+S)', /Copy image/.test(mn.textContent) && /Ctrl\+Shift\+S/.test(mn.textContent) && /Copy link/.test(mn.textContent) && /Alt\+S/.test(mn.textContent), mn.textContent);
    var cv = R._snap(), cr = chart.getBoundingClientRect(), dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    ok('the picture: the chart under a title line', cv && cv.width === Math.round(cr.width * dpr) && cv.height === Math.round((cr.height + 30) * dpr), cv && [cv.width, cv.height]);
    mn.querySelector('[data-snap="link"]').click(); await W(80);
    ok('Copy link signed out: it asks to sign in', /Sign in to copy a link/.test(flashTxt()) && !document.getElementById('strp-menu').classList.contains('show'), flashTxt());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S', code: 'KeyS', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true })); await W(300);
    ok('Ctrl+Shift+S copies the image (or says why it could not)', /Image copied|could not be copied|cannot copy images/.test(flashTxt()), flashTxt());
    ok('no page errors', !errs.length, errs.slice(0, 3));
    R.close(); await W(200);
    try { PR._cfg().look = {}; } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
