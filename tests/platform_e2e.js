// End-to-end test: the Charts platform (24 Oct 2026, Nestor approved the broker-platform mockup: "on pc view it looks great ... i love
// all the rest!"). Live in the Charts tab on a computer, laid out as TradingView's platform, on a stand-in EA 9.03 through a local relay.
//   python tests/platform_run.py      (starts the relay and the stand-in EA, then this test on a computer screen and on a phone's)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var P = window.__stPractice, LC = window.__stLC, T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000, phoneNow = innerWidth < 760;
    P._lvClock(T0 * 1000 - Date.now());
    window.isSessionLive = function () { return true; };
    window.__stPlatOff = false; window.__stLcForce = true; await W(1200);
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
    try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15, 1, 60, 240]; C.syms = []; C.mini = false; C.resume = null; delete C.lookDk; C.look = {}; } catch (e) {}
    try { localStorage.removeItem('st_plat'); } catch (e) {}
    var acc0 = (data.accounts || [])[0] || {};
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-plat', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-plat' });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
    await W(1500);
    var win = document.getElementById('stpr-win'), $ = function (s) { return document.querySelector(s); };

    if (phoneNow) {   // ---- a phone: the window as it was ----
      check('a phone: no platform, the window as it was (the tools row and the header in their places)', !win.classList.contains('plat') && !P._plat().on && $('#stpr-tb2').parentNode === win && $('#stpr-sym').closest('.stpr-hd') && !document.body.classList.contains('st-plat'),
        [win.className, $('#stpr-tb2').parentNode.className]);
      check('no errors', errs.length === 0, errs.slice(0, 3));
      return results;
    }

    // ---- the frame ----
    check('on a computer, Live is the platform', win.classList.contains('plat') && P._plat().on, win.className);
    check('the top bar: the logo, the symbol, Compare, the timeframes, Session Indicator once, the tools row (no Indicators button), the account, full screen',
      !!$('.plat-top .pl-mark svg') && $('.plat-top #stpr-sym') && $('.plat-top #stpr-cmpbtn') && $('.plat-top .pl-tfs button') && document.querySelectorAll('.plat-top .pl-si').length === 1 && $('.plat-top #stpr-tb2') && $('.plat-top #stpr-max') && $('.plat-top .pl-acct') && !/Indicators/.test($('.plat-top').textContent),
      $('.plat-top').textContent.replace(/\s+/g, ' ').slice(0, 200));
    check('the drawing tools down the left, with hide / lock / object tree / delete and the cursor', $('.plat-left #stpr-tools') && $('.plat-left #stpr-hideall') && $('.plat-left #stpr-del') && $('.plat-left #stpr-treebtn') && $('.plat-left [data-plcur]') && getComputedStyle($('#stpr-tools')).flexDirection === 'column');
    check('the Watchlist and the Trade Manager on the right, the rail at the far right, the clock along the bottom', $('.plat-right .pl-wl') && $('.plat-right .pl-tmc #stpr-mm') && $('.plat-rail [data-plr="wl"]') && $('.plat-rail [data-plr="tm"]') && $('.plat-foot #stpr-lvbar') && $('.plat-foot [data-plrg="1D"]'));
    var wr = win.getBoundingClientRect();
    check('edge to edge: the whole width of the screen', Math.abs(wr.left) < 1 && Math.abs(wr.width - document.documentElement.clientWidth) < 2, [wr.left, wr.width, document.documentElement.clientWidth]);
    var tabs = $('.tabs');
    check('the app\'s tabs stay as a slim strip over it (one click to any other tab)', document.body.classList.contains('st-plat') && tabs.offsetHeight <= 50 && getComputedStyle(tabs).display !== 'none', tabs.offsetHeight);
    check('as tall as the screen under the tabs', wr.bottom <= innerHeight + 2 && wr.height > innerHeight - 200, [wr.top, wr.bottom, innerHeight]);
    var nm = $('#stpr-grid .pl-nm'), oh = $('#stpr-grid .stpr-ohlc');
    check('the chart\'s legend: Euro / U.S. Dollar · 15 · the account, and O H L C on the same line', nm && /^Euro \/ U\.S\. Dollar · 15 · FTMO 70K$/.test(nm.textContent) && oh && /O.*H.*L.*C/.test(oh.textContent) && Math.abs(nm.getBoundingClientRect().top - oh.getBoundingClientRect().top) < 6,
      [nm && nm.textContent, oh && oh.textContent]);

    // ---- the timeframes ----
    var b1h = Array.prototype.filter.call(document.querySelectorAll('.pl-tfs button'), function (b) { return b.textContent === '1h'; })[0];
    b1h.click(); for (k = 0; k < 40 && P._panes()[0].tf !== 60; k++) await W(150); await W(400);
    check('a timeframe in the top bar: the chart turns to it, its button lit', P._panes()[0].tf === 60 && $('.pl-tfs button.on').textContent === '1h', [P._panes()[0].tf, $('.pl-tfs button.on') && $('.pl-tfs button.on').textContent]);
    Array.prototype.filter.call(document.querySelectorAll('.pl-tfs button'), function (b) { return b.textContent === '15m'; })[0].click(); for (k = 0; k < 40 && P._panes()[0].tf !== 15; k++) await W(150); await W(300);

    // ---- the Trade Manager ----
    var mm = $('#stpr-mm');
    check('the Trade Manager: SELL / BUY prices, Market / Limit / Stop, amount / % balance / Lots', mm.classList.contains('pl-mm') && /\d\.\d{5}/.test($('.pl-qs').textContent) && /\d\.\d{5}/.test($('.pl-qb').textContent) && document.querySelectorAll('.pl-seg').length === 2 && /Market/.test(mm.textContent) && /% balance/.test(mm.textContent),
      [$('.pl-qs').textContent, $('.pl-qb').textContent]);
    var labs = Array.prototype.map.call(mm.querySelectorAll('.pl-r > span:first-child'), function (x) { return x.textContent; });
    check('its rows: Risk, Stop, Take profit, Break-even, Partial close, Trades today', /^Risk/.test(labs[0]) && /^Stop/.test(labs[1]) && labs[2] === 'Take profit' && labs[3] === 'Break-even' && labs[4] === 'Partial close' && labs[5] === 'Trades today', labs);
    var ws = Array.prototype.map.call(mm.querySelectorAll('.pl-box'), function (x) { return Math.round(x.getBoundingClientRect().width); });
    check('every value box one width (104 px), the stop box too', ws.length === 5 && ws.every(function (w) { return w === 104; }), ws);
    mm.querySelector('[data-mm="rmset:percent"]').click(); await W(300);
    check('% balance: the risk in percent, the segment lit', P._cfg().mm.riskMode === 'percent' && $('[data-mm="rmset:percent"]').classList.contains('on') && /Risk %/.test($('#stpr-mm').textContent), P._cfg().mm.riskMode);
    $('[data-mm="rmset:amount"]').click(); await W(200);
    $('[data-mm="ordset:limit"]').click(); await W(200);
    check('Limit: the order type, the segment lit', P._cfg().mm.ord === 'limit' && $('[data-mm="ordset:limit"]').classList.contains('on'), P._cfg().mm.ord);
    $('[data-mm="ordset:market"]').click(); await W(200);
    $('[data-mm="plmore"]').click(); await W(200);
    check('More settings: the execution key, BE offset, trailing stops, partial closes, daily limit', /Execution key/.test($('.pl-moreb').textContent) && /BE offset/.test($('.pl-moreb').textContent) && /Trailing stops/.test($('.pl-moreb').textContent) && /Daily limit/.test($('.pl-moreb').textContent), $('.pl-moreb') && $('.pl-moreb').textContent.slice(0, 120));
    $('[data-mm="plmore"]').click(); await W(150);

    // ---- Execute, then a click where the stop goes: the order through the EA, a position under the charts ----
    var px = $('.pl-x'); check('Execute: square, pink, the key under it', px && px.textContent === 'Execute' && parseFloat(getComputedStyle(px).borderRadius) <= 4 && /or press/.test($('.pl-hint').textContent), px && px.textContent);
    px.click(); await W(300);
    check('...pressed: execution mode, the button says Cancel', P._s().exec && $('.pl-x').textContent === 'Cancel' && $('.pl-x').classList.contains('on'));
    var p0 = P._panes()[0], pc = $('#stpr-grid .stpr-pc'), r0 = pc.getBoundingClientRect(), last = p0.bars[p0.bars.length - 1].close, y = p0.series.priceToCoordinate(last - 0.0007);
    pc.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse', button: 0, clientX: r0.left + r0.width * 0.6, clientY: r0.top + y, pointerId: 1 }));
    for (k = 0; k < 40 && !$('.pl-t [data-tma="close"]'); k++) await W(250);
    var tk = $('.pl-t [data-tma="close"]'), tkn = tk && tk.getAttribute('data-tmk');
    check('a click where the stop goes: the order goes to MT5 and fills; Positions 1 under the charts', !!tk && /Positions 1/.test($('.pl-tabs').textContent) && /BUY/.test($('.pl-t').textContent), $('.pl-tabs') && $('.pl-tabs').textContent);
    check('...its line in the Trade Manager: Filled', /Filled/.test($('#stpr-mm').textContent), $('.pl-mf') && $('.pl-mf').textContent);
    check('the summary along the tabs: Open P&L, Today, Margin, Free margin', /Open P&L/.test($('.pl-sum').textContent) && /Free margin/.test($('.pl-sum').textContent), $('.pl-sum').textContent);
    check('the top bar: the account, its balance and equity', /FTMO 70K/.test($('.pl-acct').textContent) && /Equity/.test($('.pl-acct').textContent), $('.pl-acct').textContent);

    // ---- the open trade on the chart: its tags against the price scale ----
    var rr = { symbol: 'EURUSD', ticket: tkn || 7001, login: 90001234, direction: 'long', lots: 13.5, openedAt: Date.now() - 50 * 60000, risk0: 250, risk: 250,
      tick: { op: last - 0.0005, rpx: 0.0007, sl: -1, tp: 2, r: 0.7, pnl: 175, px: last, at: Date.now(), dg: 5, lad: '' } };
    window.__stLive = window.__stLive || {}; window.__stLive.openIdeas = function () { rr.tick.at = Date.now(); return [{ main: rr, rows: [rr] }]; };
    for (k = 0; k < 30 && document.querySelectorAll('.pl-tag').length < 3; k++) await W(250); await W(400);
    var tags = Array.prototype.map.call(document.querySelectorAll('.pl-tag:not([hidden])'), function (t) { return t.querySelector('.k').textContent + ' ' + (t.querySelector('.v') ? t.querySelector('.v').textContent : ''); });
    check('its tags: BUY 13.5 +0.70R, SL −1R, TP 2.0R', tags.indexOf('BUY 13.5 +0.70R') >= 0 && tags.indexOf('SL −1R') >= 0 && tags.indexOf('TP 2.0R') >= 0, tags);
    var bt = Array.prototype.filter.call(document.querySelectorAll('.pl-tag'), function (t) { return /BUY/.test(t.textContent); })[0], br = bt.getBoundingClientRect(), pr0 = p0.chart.priceScale('right').width(), pane = p0.el.getBoundingClientRect();
    check('...against the price scale', Math.abs(br.right - (pane.right - pr0 - 6)) <= 2, [br.right, pane.right - pr0 - 6]);
    check('...opened (the mouse over it): the lots, the money and R, and ✕', /BUY 13\.5 lots/.test(bt.querySelector('.k2').textContent) && /£175\.00/.test(bt.querySelector('.v2').textContent) && bt.querySelector('.xx'), bt.textContent);
    check('the library\'s own labels are off (the tags say it)', p0.lines.every(function (l) { return !l.options().title; }), p0.lines.map(function (l) { return l.options().title; }));
    bt.querySelector('.xx').click(); await W(300);
    var ask = Array.prototype.filter.call(document.querySelectorAll('.pl-tag'), function (t) { return t.classList.contains('ask'); })[0];
    check('✕ asks first: Close it in MT5? Close / Keep', ask && /Close it in MT5\?/.test(ask.textContent) && ask.querySelector('[data-plyes]') && ask.querySelector('[data-plno]'), ask && ask.textContent);
    ask.querySelector('[data-plno]').click(); await W(300);
    check('...Keep: nothing sent, the tag as it was', !document.querySelector('.pl-tag.ask') && P._plat().ask === null);
    var ab = Array.prototype.map.call(document.querySelectorAll('.pl-t [data-tma]'), function (b) { return b.getAttribute('data-tma') + (b.disabled ? ':off' : ':on'); });
    check('the position\'s row: Move to BE and Close, on (MT5 manages it from here)', ab.join(',') === 'tobe:on,close:on', ab);

    // ---- the rail, the fold, remembered ----
    $('[data-plr="wl"]').click(); await W(200);
    check('the rail: the Watchlist hides, the Trade Manager takes its room', win.classList.contains('pl-nowl') && getComputedStyle($('.pl-wl')).display === 'none' && $('.pl-tmc').getBoundingClientRect().height > 400);
    $('[data-plr="tm"]').click(); await W(300);
    var cw = $('#stpr-cw').getBoundingClientRect();
    check('both hidden: the chart takes their room, Execute in the top bar', win.classList.contains('pl-nor') && getComputedStyle($('.pl-exec')).display !== 'none' && cw.right > $('.plat-rail').getBoundingClientRect().left - 10 && cw.height > 300, [cw.right, cw.height]);
    $('.pl-exec').click(); await W(200);
    check('...the top bar\'s Execute arms it too', P._s().exec && $('.pl-exec').textContent === 'Cancel');
    $('.pl-exec').click(); await W(200);
    $('[data-pltab]') && $('[data-plfold]').click(); await W(300);
    check('the arrow folds Positions to its tabs', win.classList.contains('pl-folded') && $('#lc-tb').getBoundingClientRect().height < 45, $('#lc-tb').getBoundingClientRect().height);
    var saved = {}; try { saved = JSON.parse(localStorage.getItem('st_plat') || '{}'); } catch (e) {}
    check('remembered on this device', saved.wl === false && saved.tm === false && saved.fold === true, saved);
    $('[data-plfold]').click(); await W(200); $('[data-plr="wl"]').click(); $('[data-plr="tm"]').click(); await W(300);
    check('...all back', !win.classList.contains('pl-nor') && !win.classList.contains('pl-folded') && $('#lc-tb').getBoundingClientRect().height > 100);
    $('[data-pltab="acct"]').click(); await W(300);
    check('the Account tab: balance, equity, margin, free margin', /Balance/.test($('.pl-acg').textContent) && /Free margin/.test($('.pl-acg').textContent), $('.pl-acg') && $('.pl-acg').textContent.slice(0, 100));
    $('[data-pltab="pos"]').click(); await W(200);

    // ---- Session Indicator once, the theme, the range buttons ----
    var si0 = P._cfg().mini; $('[data-plsi]').click(); await W(300);
    check('the Session Indicator chip switches it on the chart', !!(P._cfg().showPer && P._cfg().showPer[0] && P._cfg().showPer[0].mini === !si0) && !$('.pl-si').classList.contains('off') === !si0, P._cfg().showPer);
    $('[data-plsi]').click(); await W(200);
    $('[data-pltheme]').click(); await W(600);
    check('the sun: TradingView\'s light theme, the chart and the frame', P._cfg().look.bg === '#ffffff' && win.classList.contains('pl-lt') && getComputedStyle($('.plat-top')).backgroundColor === 'rgb(255, 255, 255)', [P._cfg().look.bg, win.className]);
    $('[data-pltheme]').click(); await W(600);
    check('the moon: back to the dark colours as they were', !P._cfg().look.bg && !P._cfg().lookDk && !win.classList.contains('pl-lt'), [P._cfg().look, P._cfg().lookDk]);
    $('[data-plrg="5D"]').click(); for (k = 0; k < 40 && P._panes()[0].tf !== 5; k++) await W(200); await W(800);
    check('5D: the 5-minute chart, five days on screen', P._panes()[0].tf === 5, P._panes()[0].tf);

    // ---- the chart windows' toolbars still get the whole tools row ----
    var h2 = P._plat().tb2;
    check('a chart window\'s toolbar: the tools row as it was (the tools, hide, lock, delete, object tree)', /id="stpr-tools"/.test(h2) && /id="stpr-hideall"/.test(h2) && /id="stpr-del"/.test(h2) && /id="stpr-treebtn"/.test(h2) && /id="stpr-undo"/.test(h2), h2.length);

    // ---- Replay: the window as it was, and back ----
    $('[data-plrp]').click(); await W(200);
    var askEl = document.getElementById('lc-ask-bg'); check('Replay in the top bar asks first, as the switch does', askEl && /Switch to Replay\?/.test(askEl.textContent));
    askEl.querySelector('[data-lca="1"]').click();
    for (k = 0; k < 80 && !(P._s() && !P._s().live && P._panes().length && P._panes()[0].n); k++) await W(150); await W(1200);
    check('in Replay the window is as it was: the tools row and the header back in their places', !win.classList.contains('plat') && $('#stpr-tb2').parentNode === win && $('#stpr-tools').parentNode === $('#stpr-tb2') && $('#stpr-sym').closest('.stpr-hd') && !document.body.classList.contains('st-plat'),
      [win.className, $('#stpr-tools').parentNode.id]);
    document.querySelector('#lc-mode [data-lcm="live"]').click(); await W(200); document.getElementById('lc-ask-bg').querySelector('[data-lca="1"]').click();
    for (k = 0; k < 80 && !(P._s() && P._s().live && LC.state().fresh); k++) await W(250); await W(1500);
    check('back to Live: the platform again', win.classList.contains('plat') && $('.plat-left #stpr-tools') && $('.plat-top #stpr-tb2'), win.className);
    check('no errors', errs.length === 0, errs.slice(0, 3));
  } catch (e) { results.push({ name: 'test ran', ok: false, got: String(e && e.stack || e) }); }
  return results;
})()
