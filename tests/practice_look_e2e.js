(async function () {
  // Practice Replay's Chart settings, TradingView's rows (Nestor, 17 Oct 2026, two screenshots of TradingView's settings:
  // background, grid lines, crosshair, watermark, scale text and lines, candles' body / borders / wick, colour bars on the
  // previous close). Real EUR/USD candles of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_look_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 2; C.tfs = [15, 60]; C.look = {}; C.mini = false; C.max = true;
    var openP = async function () { await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[1].n); k++) await W(100); };
    await openP(); P._goto('14:30'); await W(300);
    var pane = function (i) { return P._panes()[i || 0]; }, co = function (i) { return pane(i).chart.options(); }, so = function (i) { return pane(i).series.options(); };
    var menu = document.getElementById('stpr-menu'), q = function (sel) { return menu.querySelector(sel); };
    var fire = function (el, ev) { el.dispatchEvent(new Event(ev, { bubbles: true })); };

    ok("the app's look to begin with: dark background, green and red candles, no borders", co(0).layout.background.color === '#121116' && so(0).upColor === '#4ECD8B' && so(0).downColor === '#E56767' && so(0).borderVisible === false, [co(0).layout.background, so(0).upColor]);
    var gb = document.getElementById('stpr-lookbtn');
    ok('a Chart settings button sits beside Show on chart', gb && gb.title === 'Chart settings' && gb.previousElementSibling && gb.previousElementSibling.id === 'stpr-layersbtn');
    gb.click(); await W(40);
    var txt = menu.textContent;
    ok("it opens TradingView's rows: Background, grid lines, Crosshair, Watermark; Scales: Text, Lines; Candles: previous close, Body, Borders, Wick", menu.classList.contains('show') && ['Chart basic styles', 'Background', 'Solid', 'Gradient', 'Vertical grid lines', 'Horizontal grid lines', 'Crosshair', 'Watermark', 'Hidden', 'Scales', 'Text', 'Lines', 'Candles', 'Colour bars on the previous close', 'Body', 'Borders', 'Wick'].every(function (w) { return txt.indexOf(w) >= 0; }), txt);

    // background
    q('[data-lksw="bg"]').click(); await W(30);
    ok('a colour swatch opens the picker under its row: 80 colours, any colour, opacity 100%', q('.stpr-lkp[data-lkfor="bg"]') && menu.querySelectorAll('[data-lkcol]').length === 80 && q('[data-lkcus]') && q('[data-lkop]').value === '100');
    q('[data-lkcol="#ffffff"]').click(); await W(40);
    ok('white picked: both charts turn white, saved, the picker stays open on it', C.look.bg === '#ffffff' && co(0).layout.background.color === '#ffffff' && co(1).layout.background.color === '#ffffff' && q('[data-lkcol="#ffffff"]').classList.contains('on'), [C.look, co(1).layout.background]);
    var op = q('[data-lkop]'); op.value = '60'; fire(op, 'input'); await W(30);
    ok('the opacity slider makes it 60%: rgba(255,255,255,0.6), the swatch and the number follow', C.look.bg === 'rgba(255,255,255,0.6)' && co(0).layout.background.color === 'rgba(255,255,255,0.6)' && /60%/.test(q('.stpr-lkop b').textContent) && /0\.6/.test(q('[data-lksw="bg"] i').style.getPropertyValue('--c')), C.look.bg);
    op.value = '100'; fire(op, 'input'); await W(20);
    var cus = q('[data-lkcus]'); cus.value = '#f7f3ea'; fire(cus, 'input'); await W(30);
    ok('any colour from the colour box: #f7f3ea', C.look.bg === '#f7f3ea' && co(0).layout.background.color === '#f7f3ea');
    q('[data-lkseg="bgT"][data-v="grad"]').click(); await W(30);
    ok('Gradient: a second swatch, the chart goes from the first colour at the top to the second at the bottom', q('[data-lksw="bg2"]') && co(0).layout.background.type === 'gradient' && co(0).layout.background.topColor === '#f7f3ea', co(0).layout.background);
    q('[data-lkseg="bgT"][data-v="solid"]').click(); await W(30);
    // grid
    var vg = q('[data-lkchk="vg"]'); vg.click(); await W(30);
    ok('Vertical grid lines off', C.look.vg === false && co(0).grid.vertLines.visible === false && co(0).grid.horzLines.visible === true);
    q('[data-lksw="hgc"]').click(); await W(20); q('[data-lkcol="#d1d4dc"]').click(); await W(30);
    ok('a horizontal grid colour keeps its own opacity (the app\'s is faint)', /^rgba\(209,212,220,0\.045\)$/.test(C.look.hgc) && co(1).grid.horzLines.color === C.look.hgc, C.look.hgc);
    // crosshair
    q('[data-lkseg="cxs"][data-v="dotted"]').click(); await W(20);
    q('[data-lksw="cxc"]').click(); await W(20); q('[data-lkcol="#000000"]').click(); await W(20);
    ok('Crosshair: dotted and black (it keeps its opacity)', C.look.cxs === 'dotted' && /^rgba\(0,0,0,0\.55\)$/.test(C.look.cxc), [C.look.cxs, C.look.cxc]);
    // watermark
    q('[data-lkseg="wm"][data-v="true"]').click(); await W(30);
    ok('Watermark visible: the symbol and timeframe across each chart', co(0).watermark.visible === true && co(0).watermark.text === 'EURUSD, 15m' && co(1).watermark.text === 'EURUSD, 1h', co(0).watermark);
    // scales
    var fs = q('[data-lkfs]'); fs.value = '13'; fire(fs, 'change'); await W(30);
    q('[data-lksw="tx"]').click(); await W(20); q('[data-lkcol="#000000"]').click(); await W(20);
    q('[data-lksw="ln"]').click(); await W(20); q('[data-lkcol="#9598a1"]').click(); await W(20);
    ok('Scales: black text at 13, grey scale lines', co(0).layout.fontSize === 13 && co(0).layout.textColor === '#000000' && co(0).rightPriceScale.borderColor === '#9598a1' && co(1).timeScale.borderColor === '#9598a1', [co(0).layout.fontSize, co(0).layout.textColor, co(0).rightPriceScale.borderColor]);
    // candles
    q('[data-lksw="up"]').click(); await W(20); q('[data-lkcol="#ffffff"]').click(); await W(20);
    q('[data-lksw="dn"]').click(); await W(20); q('[data-lkcol="#000000"]').click(); await W(20);
    q('[data-lkchk="bord"]').click(); await W(20);
    q('[data-lksw="bup"]').click(); await W(20); q('[data-lkcol="#000000"]').click(); await W(20);
    q('[data-lksw="wup"]').click(); await W(20); q('[data-lkcol="#000000"]').click(); await W(20);
    q('[data-lksw="wdn"]').click(); await W(20); q('[data-lkcol="#000000"]').click(); await W(30);
    ok('Candles: white up and black down bodies, black borders and wicks (a TradingView classic)', so(0).upColor === '#ffffff' && so(0).downColor === '#000000' && so(0).borderVisible === true && so(0).borderUpColor === '#000000' && so(0).wickUpColor === '#000000' && so(1).wickDownColor === '#000000', so(0));
    q('[data-lkchk="body"]').click(); await W(20);
    ok('Body off: hollow candles (the bodies see-through)', so(0).upColor === 'rgba(0,0,0,0)' && so(0).downColor === 'rgba(0,0,0,0)');
    q('[data-lkchk="body"]').click(); await W(20);
    q('[data-lkchk="wick"]').click(); await W(20);
    ok('Wick off', so(0).wickVisible === false); q('[data-lkchk="wick"]').click(); await W(20);
    // previous close
    q('[data-lkchk="prev"]').click(); await W(300);
    var dat = pane(0).series.data().filter(function (b) { return b.close != null; }), hit = null;
    for (i = 1; i < dat.length; i++) if (dat[i].close < dat[i].open && dat[i].close >= dat[i - 1].close) { hit = i; break; }
    ok('Colour bars on the previous close: a candle that closed below its open but above the last close is coloured up', hit != null && dat[hit].color === '#ffffff' && dat.every(function (b, j) { return j === 0 || b.color === (b.close >= dat[j - 1].close ? '#ffffff' : '#000000'); }), hit != null && [dat[hit], dat[hit - 1].close]);
    // kept
    P.close(); await W(200); await openP(); await W(300);
    ok('kept: closed and opened again, the chart has the same look', co(0).layout.background.color === '#f7f3ea' && so(0).upColor === '#ffffff' && co(0).watermark.visible === true && pane(0).series.data().some(function (b) { return b.color; }), [co(0).layout.background.color, so(0).upColor]);
    ok('on the light background the Minimalist switches to black ink', (function () { var bgc = P._parseC(P._look().bg); return bgc.h === '#f7f3ea'; })());
    // reset
    document.getElementById('stpr-lookbtn').click(); await W(40); q('[data-lkreset]').click(); await W(300);
    ok('Reset settings puts every setting back', /^Reset settings$/.test(q('[data-lkreset]').textContent) && !Object.keys(C.look).length && co(0).layout.background.color === '#121116' && so(0).upColor === '#4ECD8B' && so(0).borderVisible === false && co(0).grid.vertLines.visible === true && co(0).watermark.visible === false && !pane(0).series.data().some(function (b) { return b.color; }), [co(0).layout.background, so(0).upColor]);
    document.getElementById('stpr-lookbtn').click(); await W(30);
    ok('the button closes it again', !menu.classList.contains('show'));
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
