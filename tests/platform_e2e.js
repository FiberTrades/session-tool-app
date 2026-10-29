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
    var tr0 = document.querySelector('.container > .tabs') || document.querySelector('.tabs'), ta0 = tr0.querySelector('.tab.active') || tr0.querySelector('.tab'), tk0 = document.querySelector('.ticker-bar');
    var tabsBefore = { h: tr0.offsetHeight, th: ta0.offsetHeight, fs: getComputedStyle(ta0).fontSize, tb: getComputedStyle(ta0).backgroundColor, bg: getComputedStyle(tr0).backgroundColor, tk: tk0 ? getComputedStyle(tk0).backgroundColor : '' };   // the tab row on another tab
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
    await W(1500);
    var win = document.getElementById('stpr-win'), $ = function (s) { return document.querySelector(s); };

    if (phoneNow) {   // ---- a phone: the phone layout (Nestor approved the phone mockup, 24 Oct 2026) ----
      var wr0 = win.getBoundingClientRect();
      // the sheet's slide (.32 s) waited out rather than a fixed pause: up (open) or down (closed), its class and its place both
      var sheetAt = async function (open) { for (var q = 0; q < 40; q++) { var sr = $('.ph-sheet').getBoundingClientRect(); if (win.classList.contains('ph-open') === open && (open ? sr.bottom <= innerHeight + 1 : sr.top >= innerHeight - 1)) return true; await W(100); } return false; };
      // Charts as the Community tab (Nestor, 26 Oct 2026): a page first - the title, the tab icons, the platform under them - then scrolled
      // to, full screen and locked; a button top-left leaves it, any tab a tap away; nothing remembered
      try { window.scrollTo(0, 0); } catch (e) {} await W(400); wr0 = win.getBoundingClientRect();
      var tabsP = $('.container > .tabs');
      check('a phone: Charts opens as a page - the title and the tab icons, the platform under them, the screen\'s width and height', win.classList.contains('plph') && !win.classList.contains('ph-full') && P._plat().on && tabsP && getComputedStyle(tabsP).display !== 'none' && tabsP.getBoundingClientRect().bottom < wr0.top && wr0.top > 100 && Math.abs(wr0.left) < 1 && Math.abs(wr0.width - innerWidth) < 2 && Math.abs(wr0.height - innerHeight) < 2 && $('.ph-cover') && /Scroll down/.test($('.ph-cover').textContent),
        [win.className, Math.round(wr0.top), Math.round(wr0.height), innerHeight, tabsP && getComputedStyle(tabsP).display]);
      window.scrollTo(0, Math.round((window.scrollY + wr0.top) * 0.6)); for (k = 0; k < 30 && !win.classList.contains('ph-full'); k++) await W(100); await W(700);
      wr0 = win.getBoundingClientRect();
      check('...scrolled down: full screen, locked, the way out top-left', win.classList.contains('ph-full') && document.body.classList.contains('st-phfull') && getComputedStyle(document.body).overflow === 'hidden' && Math.abs(wr0.top) < 1 && Math.abs(wr0.height - innerHeight) < 2 && $('.ph-exit') && $('.ph-exit').getBoundingClientRect().left < 20 && $('.ph-exit').getBoundingClientRect().top < 20,
        [win.className, Math.round(wr0.top), Math.round(wr0.height), getComputedStyle(document.body).overflow]);
      var nm0 = $('#stpr-grid .pl-nm'), oh0 = $('#stpr-grid .stpr-ohlc');
      check('its legend: the name beside the way out, O H L C under it, then the account pill and the Session Indicator line under it', nm0 && /^Euro \/ U\.S\. Dollar · 15 · /.test(nm0.textContent) && nm0.getBoundingClientRect().left > $('.ph-exit').getBoundingClientRect().right && oh0 && oh0.getBoundingClientRect().top > nm0.getBoundingClientRect().top + 8 && $('.ph-ov [data-phsi]') && $('.ph-ov [data-phpill]') && $('.ph-ov [data-phpill]').getBoundingClientRect().top < $('.ph-ov [data-phsi]').getBoundingClientRect().top && /ON|OFF/.test($('[data-phpill]').textContent),
        [nm0 && nm0.textContent, $('.ph-ov') && $('.ph-ov').textContent]);
      var bar = $('.ph-bar'), kids = [$('.ph-live'), $('.ph-bar #stpr-sym'), $('.ph-tf'), $('.ph-icons #stpr-drawbtn'), $('.ph-icons #stpr-undo'), $('.ph-icons #stpr-layersbtn'), $('.ph-icons #stpr-alertsbtn')];
      check('the bottom toolbar: Live first (no logo since 29 Oct 2026), the symbol, the timeframe, drawing tools, undo, Show on chart, alerts - all on screen', kids.every(function (k) { return k && k.getBoundingClientRect().width > 0 && k.getBoundingClientRect().right <= innerWidth + 1; }) && !$('.ph-logo') && bar.firstElementChild === $('.ph-live'),
        kids.map(function (k) { return k ? Math.round(k.getBoundingClientRect().right) : null; }));
      check('above it, docked: the open trade (or None) and a square pink Execute', (/No open trade/.test($('.ph-trade').textContent) || /lots/.test($('.ph-trade').textContent)) && $('.ph-go') && parseFloat(getComputedStyle($('.ph-go')).borderRadius) <= 4 && $('.ph-trade').getBoundingClientRect().bottom <= bar.getBoundingClientRect().top + 1);
      // the trade row behind its button (Nestor, 28 Oct 2026: "can't this live in a button that when pressed the position row displays and it can be hidden away?")
      var trb = $('.ph-icons > [data-phtrb]'), trH = function () { return Math.round($('.ph-trade').getBoundingClientRect().height); }, cwH = function () { return Math.round($('#stpr-cw').getBoundingClientRect().height); };
      var trh0 = trH(), cwh0 = cwH();
      check('the trade row is put away to start with, its button first of the toolbar\'s icons', trb && $('.ph-icons').firstElementChild === trb && trh0 === 0 && !trb.classList.contains('on'), [trh0, trb && trb.className]);
      trb.click(); await W(450);
      var trh1 = trH(), cwh1 = cwH(), trsv = {}; try { trsv = JSON.parse(localStorage.getItem('st_plat') || '{}'); } catch (e) {}
      check('...its button brings it up, the chart gives way, kept on this device', trh1 >= 44 && cwh1 <= cwh0 - 40 && trb.classList.contains('on') && trsv.phTr === true, [trh1, cwh0, cwh1, trsv.phTr]);
      check('no squashed + in the bar: Compare is in the symbol menu on a phone', getComputedStyle($('#stpr-cmpbtn')).display === 'none', getComputedStyle($('#stpr-cmpbtn')).display);
      $('[data-phpill]').click(); await sheetAt(true); await W(200);
      check('the pill slides up the Trade Manager, Setup and Why in it', win.classList.contains('ph-open') && $('.ph-sheet #stpr-mm.pl-mm') && $('.ph-sheet [data-plsetup]') && $('.ph-sheet [data-plwhy]') && $('.ph-sheet').getBoundingClientRect().bottom <= innerHeight + 1, [win.className, !!$('.ph-sheet #stpr-mm.pl-mm'), !!$('.ph-sheet [data-plsetup]'), Math.round($('.ph-sheet').getBoundingClientRect().bottom), innerHeight]);
      $('.ph-sheet .pl-x').click(); await sheetAt(false);
      check('Execute in it: the sheet goes down, the bar says Cancel and what it places', !win.classList.contains('ph-open') && P._s().exec && $('.ph-trade [data-phx]') && /BUY|SELL/.test($('.ph-trade [data-phplace]').textContent), $('.ph-trade').textContent);
      $('.ph-trade [data-phplace]').click();
      for (k = 0; k < 40 && !/lots/.test($('.ph-sum') ? $('.ph-sum').textContent : ''); k++) await W(250);
      check('...the side it places: the order fills, the bar shows the trade', /BUY|SELL/.test($('.ph-sum').textContent) && /lots/.test($('.ph-sum').textContent), $('.ph-trade').textContent);
      trb.click(); await W(450); var trdot = trb.querySelector('.ph-trd');
      check('...put away with a trade open: its button shows a dot, green or red by the trade\'s profit', trH() === 0 && !trdot.hidden && /ph-trd (u|d|z)/.test(trdot.className), [trH(), trdot.className, trdot.hidden]);
      trb.click(); await W(450);
      $('[data-phgo]').click(); await sheetAt(true);
      check('the sheet lists the open trade with Move to BE, Close 50% (and its chevron) and Close', $('.ph-pos .ph-p') && $('.ph-pos [data-tma="part"]') && $('.ph-pos [data-tma="partmenu"]') && $('.ph-pos [data-tma="close"]'), $('.ph-pos') && $('.ph-pos').textContent.slice(0, 120));
      // how much to close (25 Oct 2026): the chevron's menu on screen, over the sheet; 75% picked is the button's label
      try { localStorage.removeItem('st_partPct'); } catch (e) {}
      $('.ph-pos [data-tma="partmenu"]').click(); await W(300);
      var pm0 = $('.pl-pm'), pq = pm0 && pm0.getBoundingClientRect(), pat = pq && document.elementFromPoint(pq.left + pq.width / 2, pq.top + pq.height / 2);
      check('...its chevron: 25 / 33 / 50 / 75 / 80 and a box, on screen over the sheet', pm0 && pm0.querySelectorAll('[data-tmpct]').length === 5 && pm0.querySelector('input') && pat && pm0.contains(pat) && pq.left >= 0 && pq.right <= innerWidth && pq.top >= 0 && pq.bottom <= innerHeight, pq && [pq.left, pq.top, pq.right, pq.bottom]);
      pm0.querySelector('[data-tmpct="75"]').click(); await W(400);
      // Move to BE / Close ask once in their place (Nestor, 26 Oct 2026: "i need a confirmation button so no accidents can happen")
      var pc0 = $('.ph-pos [data-tma="close"]:not([disabled])') || $('.ph-pos [data-tma="close"]'), pcOff = pc0.disabled;   // the fill's trade may not be MT5-managed here (the desk checks that gate): the question is what's tested
      pc0.disabled = false; pc0.click(); for (k = 0; k < 12 && !$('.ph-pos [data-tma="close!"]'); k++) await W(100);
      var pp0 = $('.ph-pos [data-tma="close!"]') && $('.ph-pos [data-tma="close!"]').closest('.ph-p');
      check('the sheet\'s Close asks first, in its trade\'s place: Close BUY/SELL ... ? Close / Keep, nothing sent', pp0 && pp0.querySelector('[data-tma="askno"]') && /Close (BUY|SELL) [\d.]+ EURUSD\?/.test(pp0.textContent) && !pp0.querySelector('[data-tma="tobe"]'), [pcOff, $('.ph-pos').textContent.slice(0, 160)]);
      $('.ph-pos [data-tma="askno"]').click(); await W(300);
      check('...Keep: Move to BE, Close % and Close back', $('.ph-pos [data-tma="tobe"]') && $('.ph-pos [data-tma="close"]') && !$('.ph-pos [data-tma="close!"]'));
      check('...75%: the sheet\'s button says Close 75%', !$('.pl-pm') && $('.ph-pos [data-tma="part"]') && /^Close 75%$/.test($('.ph-pos [data-tma="part"]').textContent.trim()), $('.ph-pos [data-tma="part"]') && $('.ph-pos [data-tma="part"]').textContent);
      $('.ph-dim').click(); await sheetAt(false);
      check('a tap outside closes it', !win.classList.contains('ph-open'));
      // the order rules: Take a break in the sheet, the docked Execute locked, short
      var acQ = data.accounts.filter(function (a) { return a.id === 'acc-plat'; })[0];
      $('[data-phgo]').click(); await sheetAt(true);
      var mg0 = Array.prototype.map.call(document.querySelectorAll('.ph-pos [data-tma]'), function (b) { return b.getAttribute('data-tma') + (b.disabled ? ':off' : ':on'); }).join(',');
      var tb0 = $('.ph-sheet [data-plbrk]');
      check('the sheet: Take a break under Execute', !!tb0 && tb0.getBoundingClientRect().bottom <= innerHeight, [win.className, tb0 && Math.round(tb0.getBoundingClientRect().bottom), innerHeight]);
      tb0.click(); await W(300);
      var bm0 = $('#stpr-menu.show'), bq = bm0 && bm0.getBoundingClientRect(), at0 = bq && document.elementFromPoint(bq.left + bq.width / 2, bq.top + 24);
      check('...its choices over the sheet, on screen', bm0 && bm0.querySelectorAll('[data-plbrkv]').length === 5 && at0 && bm0.contains(at0) && bq.top >= 0 && bq.bottom <= innerHeight && bq.left >= 0 && bq.right <= innerWidth, bq && [bq.left, bq.top, bq.right, bq.bottom]);
      bm0.querySelector('[data-plbrkv="2h"]').click(); await W(300); $('[data-plbrkgo="2h"]').click(); await W(800);
      check('a 2-hour break: the sheet\'s Execute locked with the time left, the lock under the title', $('.ph-sheet .pl-x.lock') && /^Locked(1:59:5\d|2:00:00)$/.test($('.ph-sheet .pl-x').textContent) && /On a break/.test($('.ph-sheet .pl-lks').textContent), [$('.ph-sheet .pl-x').textContent, $('.ph-sheet .pl-lks') && $('.ph-sheet .pl-lks').textContent]);
      var mg1 = Array.prototype.map.call(document.querySelectorAll('.ph-pos [data-tma]'), function (b) { return b.getAttribute('data-tma') + (b.disabled ? ':off' : ':on'); }).join(',');
      check('...Move to BE and Close as they were', mg1 === mg0 && /close/.test(mg1), [mg0, mg1]);
      $('.ph-dim').click(); await sheetAt(false);
      var pg = $('.ph-go');
      check('...docked: Execute locked, the time left, on screen', pg && pg.classList.contains('lock') && /^(1:59:[45]\d|2:00:00)$/.test(pg.textContent) && pg.getBoundingClientRect().right <= innerWidth + 1 && /On a break/.test(pg.getAttribute('aria-label')), pg && [pg.textContent, Math.round(pg.getBoundingClientRect().right)]);
      delete acQ.ruleBreak; window.dispatchEvent(new CustomEvent('st-rules-change')); await W(600);
      check('the break over: the docked Execute back', $('.ph-go') && !$('.ph-go').classList.contains('lock') && $('.ph-go').textContent === 'Execute', $('.ph-go') && $('.ph-go').textContent);
      $('[data-phtf]').click(); await W(300);
      var mn = $('#stpr-menu.show'), mr = mn && mn.getBoundingClientRect();
      check('the timeframe opens its list above the bar', mn && mr.bottom <= bar.getBoundingClientRect().top + 1 && mn.querySelector('[data-phtfv="60"]'), mr && [mr.top, mr.bottom]);
      mn.querySelector('[data-phtfv="60"]').click(); for (k = 0; k < 40 && P._panes()[0].tf !== 60; k++) await W(150); await W(900);
      check('...1h: the chart turns to it, the button says so', P._panes()[0].tf === 60 && $('.ph-tf').textContent.indexOf('1h') === 0, [P._panes()[0].tf, $('.ph-tf').textContent]);
      // no logo in the toolbar (Nestor, 29 Oct 2026: "on a phone remove the monitor logo to make more space"), no "All pages" sheet: the exit tile is the way out
      check('no logo in the bottom toolbar and no "All pages" sheet: the exit tile is the way out', !$('.ph-logo') && !$('[data-phlogo]') && !document.querySelector('.st-navsheet-bg') && !window.__stNav && !document.querySelector('.ph-navs') && !!$('.ph-exit'), [win.className, !!window.__stNav]);
      if (!win.classList.contains('ph-full')) { window.scrollTo(0, Math.round(window.scrollY + win.getBoundingClientRect().top)); for (k = 0; k < 30 && !win.classList.contains('ph-full'); k++) await W(100); await W(600); }
      $('.ph-exit').click(); await W(800);
      check('the way out: the page as it was (at its top), the tab icons a tap away', !win.classList.contains('ph-full') && !document.body.classList.contains('st-phfull') && window.scrollY === 0 && getComputedStyle($('.container > .tabs')).display !== 'none', [win.className, window.scrollY]);
      document.querySelector('.tab[data-page="bias"]').click(); await W(800);
      check('...another tab: that page', document.getElementById('page-bias').classList.contains('active'));
      document.querySelector('.tab[data-page="livecharts"]').click(); for (k = 0; k < 30 && !P._plat().on; k++) await W(150); await W(1200);
      check('...back to Charts: a page again, not full screen (nothing remembered)', document.getElementById('page-livecharts').classList.contains('active') && !win.classList.contains('ph-full') && !document.body.classList.contains('st-phfull'), win.className);
      check('no errors', errs.length === 0, errs.slice(0, 3));
      // for the picture: the sheet open, the chevron's menu showing
      if ($('[data-phgo]')) { $('[data-phgo]').click(); await W(600); if ($('.ph-pos [data-tma="partmenu"]')) { $('.ph-pos [data-tma="partmenu"]').click(); await W(300); } }
      try { localStorage.removeItem('st_partPct'); } catch (e) {}
      return results;
    }

    // ---- the frame ----
    check('on a computer, Live is the platform', win.classList.contains('plat') && P._plat().on, win.className);
    check('the top bar: the logo, the symbol, Compare, the timeframes, Session Indicator once, the tools row (no Indicators button), full screen - no account, Balance or Equity (26 Oct 2026: they are in the panel below)',
      !!$('.plat-top .pl-mark svg') && $('.plat-top #stpr-sym') && $('.plat-top #stpr-cmpbtn') && $('.plat-top .pl-tfs button') && document.querySelectorAll('.plat-top .pl-si').length === 1 && $('.plat-top #stpr-tb2') && $('.plat-top #stpr-max') && !$('.plat-top .pl-acct') && !/Balance|Equity/.test($('.plat-top').textContent) && !/Indicators/.test($('.plat-top').textContent),
      $('.plat-top').textContent.replace(/\s+/g, ' ').slice(0, 200));
    check('the drawing tools down the left, with hide / lock / object tree / delete and the cursor', $('.plat-left #stpr-tools') && $('.plat-left #stpr-hideall') && $('.plat-left #stpr-del') && $('.plat-left #stpr-treebtn') && $('.plat-left [data-plcur]') && getComputedStyle($('#stpr-tools')).flexDirection === 'column');
    check('the Watchlist and the Trade Manager on the right, the rail at the far right, the clock along the bottom', $('.plat-right .pl-wl') && $('.plat-right .pl-tmc #stpr-mm') && $('.plat-rail [data-plr="wl"]') && $('.plat-rail [data-plr="tm"]') && $('.plat-foot #stpr-lvbar') && $('.plat-foot [data-plrg="1D"]'));
    var wr = win.getBoundingClientRect();
    check('edge to edge: the whole width of the screen', Math.abs(wr.left) < 1 && Math.abs(wr.width - document.documentElement.clientWidth) < 2, [wr.left, wr.width, document.documentElement.clientWidth]);
    var tabs = $('.container > .tabs') || $('.tabs'), ta1 = tabs.querySelector('.tab.active'), tabsNow = { h: tabs.offsetHeight, th: ta1.offsetHeight, fs: getComputedStyle(ta1).fontSize, tb: getComputedStyle(ta1).backgroundColor, bg: getComputedStyle(tabs).backgroundColor, tk: $('.ticker-bar') ? getComputedStyle($('.ticker-bar')).backgroundColor : '' };
    var butBg = function(o){ var x = Object.assign({}, o); delete x.bg; return JSON.stringify(x); };   // the row's own background: the platform's blue-grey on Charts (27 Oct 2026)
    check('the app\'s tab row over it as on every other tab: its height, the tabs\' height, font and colour, the ticker', butBg(tabsNow) === butBg(tabsBefore) && getComputedStyle(tabs).display !== 'none', [tabsBefore, tabsNow]);
    check('...the row itself black, as on every other tab (Nestor, 28 Oct 2026: no blue-grey band)', tabsNow.bg === tabsBefore.bg, [tabsBefore.bg, tabsNow.bg]);
    check('as tall as the screen under the tabs', wr.bottom <= innerHeight + 2 && wr.height > innerHeight - 200, [wr.top, wr.bottom, innerHeight]);
    var nm = $('#stpr-grid .pl-nm'), oh = $('#stpr-grid .stpr-ohlc');
    check('the chart\'s legend: Euro / U.S. Dollar · 15 · the account, and O H L C on the same line', nm && /^Euro \/ U\.S\. Dollar · 15 · FTMO 70K$/.test(nm.textContent) && oh && /O.*H.*L.*C/.test(oh.textContent) && Math.abs(nm.getBoundingClientRect().top - oh.getBoundingClientRect().top) < 6,
      [nm && nm.textContent, oh && oh.textContent]);
    // the legend's O H L C follows the crosshair over the candles, the last candle when it leaves; Chart settings can hide it (26 Oct 2026)
    var pl0 = P._panes()[0], Bl = pl0.bars, bi = Bl.length - 25, pcl = $('#stpr-grid .stpr-pc'), rl = pcl.getBoundingClientRect(), xb = pl0.chart.timeScale().timeToCoordinate(Bl[bi].time), dg5 = function (v) { return Number(v).toFixed(5); };
    var at0 = document.elementFromPoint(rl.left + xb, rl.top + 120); at0.dispatchEvent(new MouseEvent('mousemove', { clientX: rl.left + xb, clientY: rl.top + 120, bubbles: true })); for (k = 0; k < 20 && oh.textContent.indexOf('C' + dg5(Bl[bi].close)) < 0; k++) await W(100);
    check('the crosshair over a candle: the legend shows that candle\'s O H L C', oh.textContent.indexOf('O' + dg5(Bl[bi].open)) >= 0 && oh.textContent.indexOf('C' + dg5(Bl[bi].close)) >= 0, [oh.textContent, dg5(Bl[bi].open), dg5(Bl[bi].close)]);
    pl0.el.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' })); await W(250);
    var lb0 = pl0.bars[pl0.bars.length - 1];
    check('...off the chart: the last candle\'s again', oh.textContent.indexOf('C' + dg5(lb0.close)) >= 0, [oh.textContent, dg5(lb0.close)]);
    P._lookSet('ohlc', false); for (k = 0; k < 20 && oh.textContent !== ''; k++) await W(100);
    check('Chart settings, O H L C values off: none in the legend, its name stays', oh.textContent === '' && /Euro/.test(nm.textContent), oh.textContent);
    P._lookSet('ohlc', true); delete P._cfg().look.ohlc; await W(250);

    // ---- the timeframes ----
    var b1h = Array.prototype.filter.call(document.querySelectorAll('.pl-tfs button'), function (b) { return b.textContent === '1h'; })[0];
    b1h.click(); for (k = 0; k < 40 && P._panes()[0].tf !== 60; k++) await W(150); await W(400);
    check('a timeframe in the top bar: the chart turns to it, its button lit', P._panes()[0].tf === 60 && $('.pl-tfs button.on').textContent === '1h', [P._panes()[0].tf, $('.pl-tfs button.on') && $('.pl-tfs button.on').textContent]);
    Array.prototype.filter.call(document.querySelectorAll('.pl-tfs button'), function (b) { return b.textContent === '15m'; })[0].click(); for (k = 0; k < 40 && P._panes()[0].tf !== 15; k++) await W(150); await W(300);
    // a timeframe of your own (26 Oct 2026): the + after them, the old window's box - added, on the chart, remembered, taken off
    var tfb = function (txt) { return Array.prototype.filter.call(document.querySelectorAll('.pl-tfs [data-pltf]'), function (b) { return b.textContent === txt; })[0]; };
    $('.pl-tfs [data-pltfadd]').click(); await W(250);
    check('the + after the timeframes: the custom timeframe box', $('#stpr-menu.show #stpr-tfn') && $('#stpr-menu [data-tfok]'), $('#stpr-menu') && $('#stpr-menu').textContent.slice(0, 80));
    $('#stpr-tfn').value = '3'; $('#stpr-menu [data-tfu="1"]').click(); $('#stpr-menu [data-tfok]').click(); for (k = 0; k < 40 && P._panes()[0].tf !== 3; k++) await W(150); await W(800);
    check('...3 minutes: the chart on 3m, a 3m button lit in the top bar, remembered', P._panes()[0].tf === 3 && tfb('3m') && tfb('3m').classList.contains('on') && (P._cfg().ctf || []).indexOf(3) >= 0, [P._panes()[0].tf, P._cfg().ctf, $('.pl-tfs').textContent]);
    $('.pl-tfs [data-pltfadd]').click(); await W(250); $('#stpr-menu [data-tfx="3"]').click(); for (k = 0; k < 40 && P._panes()[0].tf === 3; k++) await W(150); await W(800);
    check('...its × in the box: gone from the top bar and the list, the chart on the standard timeframe under it', !tfb('3m') && (P._cfg().ctf || []).indexOf(3) < 0 && P._panes()[0].tf === 1, [P._panes()[0].tf, P._cfg().ctf]);
    tfb('15m').click(); for (k = 0; k < 40 && P._panes()[0].tf !== 15; k++) await W(150); await W(300);

    // ---- the Trade Manager ----
    var mm = $('#stpr-mm');
    check('the Trade Manager: SELL / BUY prices, Market / Limit / Stop, amount / % balance / Lots', mm.classList.contains('pl-mm') && /\d\.\d{5}/.test($('.pl-qs').textContent) && /\d\.\d{5}/.test($('.pl-qb').textContent) && document.querySelectorAll('.pl-seg').length === 2 && /Market/.test(mm.textContent) && /% balance/.test(mm.textContent),
      [$('.pl-qs').textContent, $('.pl-qb').textContent]);
    var labs = Array.prototype.map.call(mm.querySelectorAll('.pl-r > span:first-child'), function (x) { return x.textContent; });
    check('its rows: Risk, Stop, Take profit, Break-even, Partial close, Trades today', /^Risk/.test(labs[0]) && /^Stop/.test(labs[1]) && labs[2] === 'Take profit' && labs[3] === 'Break-even' && labs[4] === 'Partial close' && labs[5] === 'Trades today', labs);
    var ws = Array.prototype.map.call(mm.querySelectorAll('.pl-box'), function (x) { return Math.round(x.getBoundingClientRect().width); });
    check('every value box one width (124 px since 28 Oct 2026), the stop box too', ws.length === 5 && ws.every(function (w) { return w === 124; }), ws);
    var smm = mm.querySelector('.pl-box.two.mm'), sem = smm ? Array.prototype.map.call(smm.querySelectorAll('em'), function (e) { return e.textContent; }) : [], sin = smm ? smm.querySelectorAll('input') : [];
    var emR = smm ? Array.prototype.map.call(smm.querySelectorAll('em'), function (e) { return e.getBoundingClientRect(); }) : [], inR = Array.prototype.map.call(sin, function (e) { return e.getBoundingClientRect(); }), rkH = Math.round(mm.querySelector('.pl-box').getBoundingClientRect().height);
    var lbR = smm ? Array.prototype.map.call(smm.querySelectorAll('label'), function (e) { return e.getBoundingClientRect(); }) : [];
    check('the stop box: MIN after the first number, MAX after the second - each pair centred in an equal half, 2-8 px apart, the caption 9 px and dim on the number\'s baseline, the box as tall as the others (28 Oct 2026: "i dont like how squashed the min and max looks like")',
      smm && sem.join('|') === 'MIN|MAX' && sin.length === 2 && sin[0].getAttribute('data-mmi') === 'min' && sin[1].getAttribute('data-mmi') === 'max' && lbR.length === 2 && Math.abs(lbR[0].width - lbR[1].width) <= 1 && emR.every(function (r, k) { var gap = r.left - inR[k].right, mid = (inR[k].left + r.right) / 2, lmid = (lbR[k].left + lbR[k].right) / 2; return gap >= 2 && gap <= 8 && Math.abs(mid - lmid) <= 2 && r.right <= lbR[k].right; }) && Math.round(smm.getBoundingClientRect().height) === rkH && parseFloat(getComputedStyle(smm.querySelector('em')).fontSize) >= 9 && getComputedStyle(smm.querySelector('em')).color !== getComputedStyle(sin[0]).color,
      [sem, lbR.map(function (r) { return Math.round(r.width); }), emR.map(function (r, k) { return Math.round(r.left - inR[k].right); })]);
    mm.querySelector('[data-mm="rmset:percent"]').click(); await W(300);
    check('% balance: the risk in percent, the segment lit', P._cfg().mm.riskMode === 'percent' && $('[data-mm="rmset:percent"]').classList.contains('on') && /Risk %/.test($('#stpr-mm').textContent), P._cfg().mm.riskMode);
    $('[data-mm="rmset:amount"]').click(); await W(200);
    $('[data-mm="ordset:limit"]').click(); await W(200);
    check('Limit: the order type, the segment lit', P._cfg().mm.ord === 'limit' && $('[data-mm="ordset:limit"]').classList.contains('on'), P._cfg().mm.ord);
    $('[data-mm="ordset:market"]').click(); await W(200);
    $('[data-mm="plmore"]').click(); await W(200);
    check('More settings: the execution key, BE offset, trailing stops, partial closes, daily limit', /Execution key/.test($('.pl-moreb').textContent) && /BE offset/.test($('.pl-moreb').textContent) && /Trailing stops/.test($('.pl-moreb').textContent) && /Daily limit/.test($('.pl-moreb').textContent), $('.pl-moreb') && $('.pl-moreb').textContent.slice(0, 120));
    $('[data-mm="plmore"]').click(); await W(150);

    // ---- Setup + Why before the order (24 Oct 2026): his playbooks and No setup / other, the last pick kept ----
    data.playbooks = ['High/Low + Mitigation + Aggression', 'Range Mitigation', '50% Mitigation'].map(function (n, i) { return { id: 'pbt' + i, name: n }; }); P._cfg().lvSetup = ''; await W(1200);
    var sel = $('[data-plsetup]'), opts = sel ? Array.prototype.map.call(sel.options, function (o) { return o.textContent; }) : [];
    check('Setup: your playbooks, then No setup / other', opts.join('|') === 'High/Low + Mitigation + Aggression|Range Mitigation|50% Mitigation|No setup / other' && $('.pl-sel optgroup').label === 'Your playbooks', opts);
    sel.value = 'High/Low + Mitigation + Aggression'; sel.dispatchEvent(new Event('change', { bubbles: true })); await W(300);
    check('...a pick is kept for the next order', P._cfg().lvSetup === 'High/Low + Mitigation + Aggression' && $('[data-plsetup]').value === 'High/Low + Mitigation + Aggression', P._cfg().lvSetup);
    var wy = $('[data-plwhy]'); wy.value = 'Took the Asia high, slowed at the 50%'; wy.dispatchEvent(new Event('input', { bubbles: true }));
    check('Why this trade: optional, one line', /optional/.test($('.pl-pick').textContent) && wy.maxLength === 140);

    // ---- Execute, then a click where the stop goes: the order through the EA, a position under the charts ----
    var px = $('.pl-x'); check('Execute: square, pink, the key under it', px && px.textContent === 'Execute' && parseFloat(getComputedStyle(px).borderRadius) <= 4 && /or press/.test($('.pl-hint').textContent), px && px.textContent);
    // the app's action pink (Nestor, 25 Oct 2026: "looks cheap and you cant see the letter well when theme is white"): white bold letters, 4.5:1 or more
    var lum = function (c) { var m = /rgba?\((\d+), (\d+), (\d+)/.exec(c); return m ? [+m[1], +m[2], +m[3]].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0) : 0; };
    var cs0 = getComputedStyle(px), con = (lum(cs0.color) + 0.05) / (lum(cs0.backgroundColor) + 0.05);
    check('...the shared action pink (#cc3d8a), white bold letters at ' + con.toFixed(2) + ':1, a calm letter-spacing', cs0.backgroundColor === 'rgb(204, 61, 138)' && cs0.color === 'rgb(255, 255, 255)' && +cs0.fontWeight >= 700 && con >= 4.5 && parseFloat(cs0.letterSpacing) <= 1, [cs0.backgroundColor, cs0.color, cs0.fontWeight, cs0.letterSpacing]);
    px.click(); await W(300);
    check('...pressed: execution mode, the button says Cancel', P._s().exec && $('.pl-x').textContent === 'Cancel' && $('.pl-x').classList.contains('on'));
    var p0 = P._panes()[0], pc = $('#stpr-grid .stpr-pc'), r0 = pc.getBoundingClientRect(), last = p0.bars[p0.bars.length - 1].close, y = p0.series.priceToCoordinate(last - 0.0007);
    pc.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse', button: 0, clientX: r0.left + r0.width * 0.6, clientY: r0.top + y, pointerId: 1 }));
    for (k = 0; k < 40 && !$('.pl-t [data-tma="close"]'); k++) await W(250);
    var tk = $('.pl-t [data-tma="close"]'), tkn = tk && tk.getAttribute('data-tmk');
    check('a click where the stop goes: the order goes to MT5 and fills; Positions 1 under the charts', !!tk && /Positions 1/.test($('.pl-tabs').textContent) && /BUY/.test($('.pl-t').textContent), $('.pl-tabs') && $('.pl-tabs').textContent);
    check('...its line in the Trade Manager: Filled', /Filled/.test($('#stpr-mm').textContent), $('.pl-mf') && $('.pl-mf').textContent);
    var tg = data.entryTags && data.entryTags[tkn];
    check('at the fill the pick goes with the ticket: setup and why, before any result', tg && tg.s === 'High/Low + Mitigation + Aggression' && tg.w === 'Took the Asia high, slowed at the 50%', data.entryTags);
    check('...the Why box is empty for the next trade, the setup kept', $('[data-plwhy]').value === '' && $('[data-plsetup]').value === 'High/Low + Mitigation + Aggression');
    var jt = { id: 'plat-jt', date: '2026-10-14', pair: 'EURUSD', direction: 'Long', result: 'Win', accountId: 'acc-plat', mt5Ticket: tkn, rMultiple: 2 };
    data.currentSeries.push(jt); window.__stEntryTags.apply();
    check('the trade in the journal takes them: setup, the pick at entry and why', jt.setup === 'High/Low + Mitigation + Aggression' && jt.setupAtEntry === 'High/Low + Mitigation + Aggression' && jt.entryWhy === 'Took the Asia high, slowed at the 50%', [jt.setup, jt.setupAtEntry, jt.entryWhy]);
    jt.setup = 'Range Mitigation';
    var pl = window.__stPbLines ? window.__stPbLines(jt) : [], plt = pl.map(function (x) { return x.label + ': ' + x.text; }).join(' / ');
    check('a setup changed after the close: the stats keep the pick at entry, the trade says so', window.__stSetupOf(jt) === 'High/Low + Mitigation + Aggression' && /At entry: High\/Low \+ Mitigation \+ Aggression · changed after the close/.test(plt) && /Why: Took the Asia high/.test(plt), plt);
    data.currentSeries = data.currentSeries.filter(function (x) { return x !== jt; });
    check('the summary along the tabs: Open P&L, Today, Margin, Free margin', /Open P&L/.test($('.pl-sum').textContent) && /Free margin/.test($('.pl-sum').textContent), $('.pl-sum').textContent);
    check('Chart settings is a gear with teeth, beside the sun / moon (Nestor, 26 Oct 2026: "looks like a sun and its confusing")', /^M12\.22 2h/.test($('.plat-top #stpr-lookbtn svg path').getAttribute('d')) && $('.plat-top .pl-theme svg'), $('.plat-top #stpr-lookbtn').innerHTML.slice(0, 80));
    // the top bar never overflows (25 Oct 2026): every item inside it, the sun and full screen in the row, at this width too
    var top0 = $('.plat-top'), thr = $('.pl-theme').getBoundingClientRect(), tpr = top0.getBoundingClientRect();
    check('the top bar fits: the sun and full screen in the row', top0.scrollWidth <= top0.clientWidth + 1 && thr.right <= tpr.right && $('#stpr-pop').getBoundingClientRect().right <= tpr.right,
      [top0.scrollWidth, top0.clientWidth, Math.round(thr.right), Math.round(tpr.right), win.className.match(/\bpt\d\b/g)]);

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
    // dragging the SL (26 Oct 2026: "i need to see the R pips and money ... its very slow"): the line moves at once, its tag says R · pips · money;
    // dragged past the entry, what it locks in
    var slL = p0.lines.filter(function (l) { return /\|sl\|/.test(l._k || ''); })[0], pcd = p0.el.querySelector('.stpr-pc'), rcd = pcd.getBoundingClientRect();
    var pev = function (t, y) { pcd.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerType: 'mouse', button: 0, clientX: rcd.left + rcd.width * 0.45, clientY: rcd.top + y, pointerId: 7 })); };
    var ySl = p0.series.priceToCoordinate(slL._p), yTo = p0.series.priceToCoordinate(rr.tick.op + 0.5 * rr.tick.rpx), sl0 = slL._p;
    pev('pointerdown', ySl); var tm0 = performance.now(); pev('pointermove', yTo); var dtm = performance.now() - tm0;
    var dtag = $('.pl-tag.drag'), dtx = dtag ? dtag.textContent : '';
    check('the SL dragged into profit: its tag at once - SL +0.5R · +3.5 pips · +£125', dtag && /^SL\+0\.(4[6-9]|5[0-4])R\s+·\s+\+3\.[3-7] pips\s+·\s+\+£1(1[5-9]|2\d|3[0-4])\.\d\d$/.test(dtx), dtx);
    check('...the line itself there, in the same move (no rebuild of every line: ' + Math.round(dtm) + ' ms)', Math.abs(slL._p - (rr.tick.op + 0.5 * rr.tick.rpx)) < 0.00004 && dtm < 120, [slL._p, dtm]);   // in the same move; the time is the busy test machine's
    pev('pointerup', yTo);
    var tmc = null; for (k = 0; k < 20 && !(tmc && tmc.style.display !== 'none' && tmc.querySelector('[data-tmc="0"]')); k++) { await W(100); tmc = p0.el.querySelector('.stpr-tmc'); }
    if (tmc && tmc.style.display !== 'none') { var cx0 = tmc.querySelector('[data-tmc="0"]'); if (cx0) cx0.click(); } for (k = 0; k < 20 && $('.pl-tag.drag'); k++) await W(100); await W(300);
    var slTag = Array.prototype.filter.call(document.querySelectorAll('.pl-tag'), function (t) { return t.querySelector('.k') && t.querySelector('.k').textContent === 'SL'; })[0];
    check('...let go and Cancel: the SL back where MT5 has it, the tag as it was', !$('.pl-tag.drag') && slTag && /SL\s*−1R/.test(slTag.textContent) && Math.abs(p0.lines.filter(function (l) { return /\|sl\|/.test(l._k || ''); })[0]._p - sl0) < 1e-9, slTag && slTag.textContent);
    bt.querySelector('.xx').click(); await W(300);
    var ask = Array.prototype.filter.call(document.querySelectorAll('.pl-tag'), function (t) { return t.classList.contains('ask'); })[0];
    check('✕ asks first: Close it in MT5? Close / Keep', ask && /Close it in MT5\?/.test(ask.textContent) && ask.querySelector('[data-plyes]') && ask.querySelector('[data-plno]'), ask && ask.textContent);
    ask.querySelector('[data-plno]').click(); for (k = 0; k < 12 && document.querySelector('.pl-tag.ask'); k++) await W(150);
    check('...Keep: nothing sent, the tag as it was', !document.querySelector('.pl-tag.ask') && P._plat().ask === null);
    var ab = Array.prototype.map.call(document.querySelectorAll('.pl-t [data-tma]'), function (b) { return b.getAttribute('data-tma') + (b.disabled ? ':off' : ':on'); });
    check('the position\'s row: Move to BE, Close 50% (and its chevron) and Close, on (MT5 manages it from here)', ab.join(',') === 'tobe:on,part:on,partmenu:on,close:on', ab);
    // each asks once in its place (26 Oct 2026), Keep sends nothing
    var cmd0 = (window.__stTM && window.__stTM.last(tkn || 7001)) || null;
    $('.pl-t [data-tma="tobe"]').click(); for (k = 0; k < 12 && !$('.pl-t [data-tma="tobe!"]'); k++) await W(100);
    check('Move to BE asks first: "Move the stop to break-even at 1.1xxxx?" Move to BE / Keep', $('.pl-t [data-tma="tobe!"]') && $('.pl-t [data-tma="askno"]') && /Move the stop to break-even at \d\.\d{5}\?/.test($('.pl-t .pl-act').textContent) && !$('.pl-t [data-tma="close"]'), $('.pl-t .pl-act').textContent);
    $('.pl-t [data-tma="askno"]').click(); await W(300);
    $('.pl-t [data-tma="close"]').click(); for (k = 0; k < 12 && !$('.pl-t [data-tma="close!"]'); k++) await W(100);
    var cq1 = $('.pl-t .pl-conf'), cr1 = cq1 && cq1.getBoundingClientRect(), rr1 = $('.pl-t tr:last-child') && $('.pl-t tr:last-child').getBoundingClientRect();
    check('Close asks first: "Close BUY 13.5 EURUSD?" Close / Keep, inside its row', $('.pl-t [data-tma="close!"]') && /Close BUY [\d.]+ EURUSD\?/.test(cq1.textContent) && cr1 && rr1 && cr1.bottom <= rr1.bottom + 1 && cr1.right <= rr1.right + 1, cq1 && cq1.textContent);
    $('.pl-t [data-tma="askno"]').click(); await W(300);
    var ab1 = Array.prototype.map.call(document.querySelectorAll('.pl-t [data-tma]'), function (b) { return b.getAttribute('data-tma') + (b.disabled ? ':off' : ':on'); });
    check('...Keep twice: nothing sent, the row as it was', ab1.join(',') === 'tobe:on,part:on,partmenu:on,close:on' && ((window.__stTM && window.__stTM.last(tkn || 7001)) || null) === cmd0, ab1);

    // ---- the rail (one panel at a time, 26 Oct 2026), the fold, remembered ----
    $('[data-plr="wl"]').click(); await W(200);
    check('the rail: the Watchlist takes the column, the Trade Manager goes', win.classList.contains('pl-notm') && !win.classList.contains('pl-nowl') && getComputedStyle($('.pl-tmc')).display === 'none' && $('.pl-wl').getBoundingClientRect().height > 400);
    $('[data-plr="wl"]').click(); await W(300);
    var cw = $('#stpr-cw').getBoundingClientRect();
    check('its icon again closes the column: the chart takes the room, no second Execute in the top bar (Nestor, 26 Oct 2026)', win.classList.contains('pl-nor') && !$('.pl-exec') && !/Execute/.test($('.plat-top').textContent) && cw.right > $('.plat-rail').getBoundingClientRect().left - 10 && cw.height > 300, [cw.right, cw.height]);
    $('[data-pltab]') && $('[data-plfold]').click(); await W(300);
    check('the arrow folds Positions to its tabs', win.classList.contains('pl-folded') && $('#lc-tb').getBoundingClientRect().height < 45, $('#lc-tb').getBoundingClientRect().height);
    var saved = {}; try { saved = JSON.parse(localStorage.getItem('st_plat') || '{}'); } catch (e) {}
    check('remembered on this device', saved.pn === '' && saved.fold === true, saved);
    $('[data-plfold]').click(); await W(200); $('[data-plr="tm"]').click(); await W(300);
    check('...all back', !win.classList.contains('pl-nor') && !win.classList.contains('pl-folded') && $('#lc-tb').getBoundingClientRect().height > 100);
    // one width for every panel in the column (Nestor, 27 Oct 2026): dragging any one's left edge sets it for all; the chat never under 330
    var stW0 = JSON.stringify(P._plat().st), colW = function(){ return Math.round($('.plat-right').getBoundingClientRect().width); }, rwSaved = function(){ var o = {}; try { o = JSON.parse(localStorage.getItem('st_plat') || '{}'); } catch (e) {} return o.rw; };
    var edgeDrag = function(dx){ var hd = $('.plat-right > .pl-swd'), hr = hd.getBoundingClientRect(), x0 = hr.left + 3, y0 = hr.top + hr.height / 2;
      hd.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x0, clientY: y0, pointerId: 1 })); document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x0 + dx, clientY: y0, pointerId: 1 }));
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x0 + dx, clientY: y0, pointerId: 1 })); };
    var rail = function(k){ $('[data-plr="' + k + '"]').click(); return W(250); }, wTm0 = colW(); edgeDrag(-80); await W(300); var wTm = colW();
    check('the column: the Trade Manager\'s left edge widens it, kept on this device', wTm >= wTm0 + 70 && Math.abs(rwSaved() - wTm) <= 1, [wTm0, wTm, rwSaved()]);
    var wAll = {}; for (var rk of ['wl', 'td', 'ot', 'ch']) { await rail(rk); wAll[rk] = colW(); }
    check('...the Watchlist, Today, the Object tree and Chat open at that same width', Object.keys(wAll).every(function(k){ return Math.abs(wAll[k] - wTm) <= 1; }), [wTm, wAll]);
    edgeDrag(200); await W(300); var wCh = colW(); await rail('wl'); var wWl = colW();
    check('...Chat narrowed to its least (330, its text box and Send whole), the Watchlist follows it', Math.abs(wCh - 330) <= 1 && Math.abs(wWl - 330) <= 1 && rwSaved() === 330, [wCh, wWl, rwSaved()]);
    edgeDrag(60); await W(300); var wWl2 = colW(); await rail('ch'); var wCh2 = colW(); await rail('td'); var wTd2 = colW();
    check('...the Watchlist left at 270: Chat still opens at 330, and the others follow it back', wWl2 < 300 && Math.abs(wCh2 - 330) <= 1 && Math.abs(wTd2 - 330) <= 1 && rwSaved() === 330, [wWl2, wCh2, wTd2, rwSaved()]);
    var mig = function(o){ localStorage.setItem('st_plat', JSON.stringify(o)); var st1 = P._plStRead(); return [st1.rw, 'pw' in st1]; };
    var m1 = mig({ pn: 'wl', pw: { wl: 340, ch: 420 } }), m2 = mig({ pn: 'tm', pw: { ch: 410, wl: 280 } }), m3 = mig({ pn: 'tm', sw: 390 }), m4 = mig({ pn: 'tm', pw: { td: 290, wl: 350 } });
    check('a device with the old per-panel widths: the open panel\'s width, else the chat\'s, else the widest', m1[0] === 340 && m2[0] === 410 && m3[0] === 390 && m4[0] === 350 && !m1[1] && !m2[1], [m1, m2, m3, m4]);
    localStorage.setItem('st_plat', stW0); P._plStRead(); P._platSync(); await W(300);   // back as it was (the Trade Manager open, its width)
    check('...and back: the Trade Manager open', !win.classList.contains('pl-notm') && $('.plat-rail [data-plr="tm"]').classList.contains('on') && Math.abs(colW() - wTm0) <= 1, [win.className, colW(), wTm0]);
    // the Session Indicator's weekday names under the chart's legend, not on its line (Nestor, 27 Oct 2026)
    var dyY = P._dayY(0), pn0 = P._panes()[0].el.getBoundingClientRect(), lgB = Math.max.apply(null, Array.prototype.map.call(P._panes()[0].el.querySelectorAll('.stpr-tl > *'), function (e) { return e.offsetWidth ? e.getBoundingClientRect().bottom - pn0.top : 0; }));
    check('the weekday names (MONDAY...) under the legend, about 60 px down, not on its line', dyY >= 60 && dyY >= lgB + 8 && dyY < 120, [dyY, Math.round(lgB)]);
    // no Account tab (Nestor, 27 Oct 2026: "what the point of having the account details down here ... when i have them up here already?"):
    // the strip keeps the figures; hovering it shows the account, its currency, balance and equity
    var tabsK = Array.prototype.map.call(document.querySelectorAll('.pl-tabs [data-pltab]'), function (b) { return b.getAttribute('data-pltab'); });
    check('the bottom panel: Positions, Orders, History - no Account tab; the strip along them stays', tabsK.join('|') === 'pos|ord|hist' && /Open P&L/.test($('.pl-sum').textContent) && /Free margin/.test($('.pl-sum').textContent), [tabsK, $('.pl-sum').textContent]);
    var sumNow = function () { return $('.pl-sum'); }; sumNow().dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));   // the strip is drawn again when a figure changes: always the one on screen
    var card = null; for (var kq = 0; kq < 40; kq++) { card = $('.pl-sumc'); if (card && !card.hidden && card.querySelector('h6')) break; await W(50); }
    var cr = card && card.getBoundingClientRect(), sr = sumNow().getBoundingClientRect();
    check('hovering the strip: a card with the account (name, login, currency), Balance and Equity, just above the strip', card && !card.hidden && /FTMO 70K/.test(card.querySelector('h6').textContent) && /90001234/.test(card.textContent) && /Balance/.test(card.textContent) && /Equity/.test(card.textContent) && card.querySelector('h6 em') && cr.bottom <= sr.top && cr.bottom >= sr.top - 12 && cr.right <= sr.right + 1, card && [card.textContent, cr.top, cr.bottom, sr.top]);
    check('...in the platform\'s font, colours and a hairline border', card && getComputedStyle(card).fontFamily === getComputedStyle($('.plat-top')).fontFamily && getComputedStyle(card).borderTopWidth === '1px', card && [getComputedStyle(card).fontFamily, getComputedStyle(card).borderTopWidth]);
    sumNow().dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })); for (kq = 0; kq < 20 && card && !card.hidden; kq++) await W(50);
    check('...gone when the mouse leaves the strip', card && card.hidden);
    $('[data-pltab="hist"]').click(); for (k = 0; k < 30 && !$('.lc-tb .lctb-t td.r'); k++) await W(200);
    var hr0 = Array.prototype.filter.call(document.querySelectorAll('.lc-tb .lctb-t tr'), function (r) { return /880001/.test(r.textContent); })[0], htd = hr0 ? hr0.querySelectorAll('td') : [];
    var cCom = htd[10] && getComputedStyle(htd[10]).color, cPro = htd[12] && getComputedStyle(htd[12]).color;
    check('History: the commission (-8.75) red, the profit (200.00) green', cCom === 'rgb(242, 54, 69)' && cPro === 'rgb(8, 153, 129)', [cCom, cPro, hr0 && hr0.textContent.slice(0, 120)]);
    $('[data-pltab="pos"]').click(); await W(200);

    // ---- in Spanish (Nestor, 29 Oct 2026: "when in spanish should these TFs be also in spanish?"): TradingView's - W is S, 1Y is 1A, All is Todo;
    //      D, M, YTD, h and m stay - and Spread stays Spread (Margen is margin) ----
    if (typeof setLanguage === 'function') {
      setLanguage('es'); await W(1500); try { P._platSync && P._platSync(); } catch (e) {} await W(600);
      var tfT = Array.prototype.map.call(document.querySelectorAll('.pl-tfs [data-pltf]'), function (b) { return b.textContent; }), rgT = Array.prototype.map.call(document.querySelectorAll('.plat-foot [data-plrg]'), function (b) { return b.textContent; });
      check('Spanish: the top bar\'s timeframes with S for the week, D for the day', tfT.indexOf('S') >= 0 && tfT.indexOf('D') >= 0 && tfT.indexOf('W') < 0 && tfT.indexOf('1h') >= 0, tfT);
      check('...the ranges: 1D 5D 1M 3M 6M YTD 1A Todo', rgT.join(' ') === '1D 5D 1M 3M 6M YTD 1A Todo', rgT);
      var cdbEs = document.querySelector('#stpr-grid .stpr-cdb'), sprEs = document.querySelector('#stpr-mm') && document.querySelector('#stpr-mm').textContent;
      check('...and Spread as Spread, on the chart and under the prices (never Margen)', (!cdbEs || cdbEs.hidden || /^Spread /.test(cdbEs.textContent)) && /spread \d/.test(sprEs) && !/margen \d/i.test(sprEs), [cdbEs && cdbEs.textContent, (sprEs.match(/(spread|margen) [\d.]+/i) || [''])[0]]);
      setLanguage('en'); await W(1500); try { P._platSync && P._platSync(); } catch (e) {} await W(600);
      var tfE = Array.prototype.map.call(document.querySelectorAll('.pl-tfs [data-pltf]'), function (b) { return b.textContent; }), rgE = Array.prototype.map.call(document.querySelectorAll('.plat-foot [data-plrg]'), function (b) { return b.textContent; });
      check('...back in English: W, 1Y and All again', tfE.indexOf('W') >= 0 && rgE.join(' ') === '1D 5D 1M 3M 6M YTD 1Y All', [tfE, rgE]);
    }

    // ---- Check my bias in the top bar (window.__stPlanCheck; Check my plan until 27 Oct 2026) ----
    var pc0 = window.__stPlanCheck, pcGot = null; window.__stPlanCheck = { open: function (o) { pcGot = o || {}; } }; await W(1000);
    var plb = $('.plat-top .pl-plan');
    check('Check my bias in the top bar, beside Replay', plb && !plb.hidden && plb.getBoundingClientRect().width > 0 && /Check my bias/.test(plb.textContent) && plb.title === 'Your bias for today, with its charts and notes' && plb.previousElementSibling === $('.plat-top .pl-rp'), plb && [plb.hidden, plb.title, plb.textContent]);
    plb.click(); await W(400);
    check('...it opens Check my bias in this window, for the chart\'s symbol (no picture of the chart)', !!(pcGot && pcGot.doc === document && /EUR/.test(pcGot.sym || '') && !pcGot.canvas), pcGot && Object.keys(pcGot));
    window.__stPlanCheck = pc0;

    // ---- the order rules (window.__stRules): Take a break, Execute locked with the time left, the open trade still managed ----
    var acP = data.accounts.filter(function (a) { return a.id === 'acc-plat'; })[0];
    var tbk = $('#stpr-mm [data-plbrk]');
    check('Take a break under Execute', !!tbk && /Take a break/.test(tbk.textContent));
    tbk.click(); await W(300);
    var bm = $('#stpr-menu.show'), bmr = bm && bm.getBoundingClientRect(), tbr = $('#stpr-mm [data-plbrk]').getBoundingClientRect();
    check('...how long: 1 hour, 2 hours, 4 hours, until the next session, until tomorrow - above the button, on screen', bm && Array.prototype.map.call(bm.querySelectorAll('[data-plbrkv]'), function (b) { return b.textContent; }).join('|') === '1 hour|2 hours|4 hours|Until the next session|Until tomorrow' && bmr.bottom <= tbr.top + 1 && bmr.top >= 0 && bmr.right <= innerWidth,
      bm && [Math.round(bmr.top), Math.round(bmr.bottom), Math.round(tbr.top), bm.textContent.slice(0, 80)]);
    bm.querySelector('[data-plbrkv="1h"]').click(); await W(300);
    check('...a pick asks once more: no new entries on FTMO 70K until then, it can\'t be lifted early', /No new entries on FTMO 70K until \d\d:\d\d\. It can’t be lifted early\./.test($('#stpr-menu').textContent) && $('[data-plbrkgo="1h"]'), $('#stpr-menu').textContent);
    $('[data-plbrkgo="1h"]').click(); await W(800);
    check('the break starts: an hour on this account', acP.ruleBreak && Math.abs(acP.ruleBreak.until - Date.now() - 3600000) < 5000, acP.ruleBreak);
    var lk = $('#stpr-mm .pl-lks');
    check('...its lock under the Trade Manager\'s title, with the time left', lk && /On a break\. Trading opens again (tomorrow )?at \d\d:\d\d\./.test(lk.textContent) && /(59:5\d|1:00:00)$/.test(lk.textContent), lk && lk.textContent);
    var lx = $('#stpr-mm .pl-x');
    check('...Execute: Locked and the time left, not pressable; managing open trades said under it', lx && lx.classList.contains('lock') && lx.disabled && /^Locked(59:5\d|1:00:00)$/.test(lx.textContent) && /still be managed and closed/.test($('.pl-why2').textContent), lx && [lx.textContent, $('.pl-why2') && $('.pl-why2').textContent]);
    var c1 = $('#stpr-mm .pl-x .pl-cd').textContent; await W(2100); var c2 = $('#stpr-mm .pl-x .pl-cd').textContent;
    check('...the countdown runs', c1 !== c2 && /^59:5\d$/.test(c2), [c1, c2]);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: String(P._cfg().mm.key || 'O').toLowerCase(), bubbles: true })); await W(400);
    check('...the execution key doesn\'t arm it either, and says why on the chart', !P._s().exec && /On a break/.test($('#stpr-cw').textContent), [P._s().exec, $('#stpr-cw').textContent.slice(0, 160)]);
    var ab2 = Array.prototype.map.call(document.querySelectorAll('.pl-t [data-tma]'), function (b) { return b.getAttribute('data-tma') + (b.disabled ? ':off' : ':on'); });
    check('locked, the open trade is still managed: Move to BE, Close 50% and Close on', ab2.join(',') === 'tobe:on,part:on,partmenu:on,close:on', ab2);
    delete acP.ruleBreak; window.dispatchEvent(new CustomEvent('st-rules-change')); await W(600);
    check('the break over: Execute back, the lock gone', $('#stpr-mm .pl-x').textContent === 'Execute' && !$('#stpr-mm .pl-x').disabled && !$('#stpr-mm .pl-lks'), [$('#stpr-mm .pl-x').textContent, !!$('#stpr-mm .pl-lks')]);
    // a break of his own length (Nestor, 26 Oct 2026: "a user can type in how long for"): For h + min, or Until a time; the same confirm
    var setv = function (sel, v) { var i0 = $('#stpr-menu ' + sel); i0.value = v; i0.dispatchEvent(new Event('input', { bubbles: true })); };
    $('#stpr-mm [data-plbrk]').click(); await W(300);
    check('Take a break: the presets, then For [h] [min] and Until [time]', $('#stpr-menu [data-plbkh]') && $('#stpr-menu [data-plbkm]') && $('#stpr-menu [data-plbku]') && $('#stpr-menu [data-plbkfor]') && $('#stpr-menu [data-plbkuntil]') && document.querySelectorAll('#stpr-menu [data-plbrkv]').length === 5, $('#stpr-menu').textContent.slice(0, 160));
    $('#stpr-menu [data-plbkfor]').click(); await W(200);
    check('...nothing typed: it says what to type, no break', $('#stpr-menu .pl-bke') && !$('#stpr-menu .pl-bke').hidden && /1 minute to 24 hours/.test($('#stpr-menu .pl-bke').textContent) && !acP.ruleBreak);
    setv('[data-plbkh]', '1'); setv('[data-plbkm]', '30'); $('#stpr-menu [data-plbkfor]').click(); await W(250);
    var t90 = new Date(Date.now() + 90 * 60000), hm90 = String(t90.getHours()).padStart(2, '0') + ':' + String(t90.getMinutes()).padStart(2, '0');
    check('...1 h 30: asks once more, until that time, can\'t be lifted early', /Take a break · 1 h 30 min/.test($('#stpr-menu').textContent) && $('#stpr-menu').textContent.indexOf('until ' + hm90) >= 0 && /can’t be lifted early/.test($('#stpr-menu').textContent), $('#stpr-menu').textContent);
    $('#stpr-menu [data-plbrkgo]').click(); await W(600);
    check('...Start the break: an hour and a half on this account, Execute locked', acP.ruleBreak && Math.abs(acP.ruleBreak.until - Date.now() - 90 * 60000) < 5000 && acP.ruleBreak.kind === 'custom' && $('#stpr-mm .pl-x.lock'), acP.ruleBreak);
    delete acP.ruleBreak; window.dispatchEvent(new CustomEvent('st-rules-change')); await W(400);
    $('#stpr-mm [data-plbrk]').click(); await W(300);
    var t2 = new Date(Date.now() + 2 * 3600000 + 5 * 60000), hm2 = String(t2.getHours()).padStart(2, '0') + ':' + String(t2.getMinutes()).padStart(2, '0');
    setv('[data-plbku]', hm2); $('#stpr-menu [data-plbkuntil]').click(); await W(250);
    check('...Until a time: the confirm names it', $('#stpr-menu').textContent.indexOf('until ' + hm2) >= 0 && $('#stpr-menu [data-plbrkgo]'), $('#stpr-menu').textContent);
    $('#stpr-menu [data-plbrkno]').click(); await W(200);
    check('...Cancel: no break', !acP.ruleBreak && !$('#stpr-menu.show') && !$('#stpr-mm .pl-x.lock'));

    // ---- Session Indicator once, the theme, the range buttons ----
    var si0 = P._cfg().mini; $('[data-plsi]').click(); await W(300);
    check('the Session Indicator chip switches it on the chart', !!(P._cfg().showPer && P._cfg().showPer[0] && P._cfg().showPer[0].mini === !si0) && !$('.pl-si').classList.contains('off') === !si0, P._cfg().showPer);
    $('[data-plsi]').click(); await W(200);
    $('#stpr-layersbtn').click(); await W(250);
    var lym = $('#stpr-menu.show');
    check('Show on chart: no Session Indicator row (its chip is in the top bar), the trade lines and the rest still there', lym && !lym.querySelector('#stpr-mini') && lym.querySelector('#stpr-marks') && lym.querySelector('#stpr-pos'), lym && lym.textContent.slice(0, 120));
    document.body.click(); $('#stpr-cw').click(); await W(150);
    $('[data-pltheme]').click(); await W(600);
    check('the sun: TradingView\'s light theme, the chart and the frame', P._cfg().look.bg === '#ffffff' && win.classList.contains('pl-lt') && getComputedStyle($('.plat-top')).backgroundColor === 'rgb(255, 255, 255)', [P._cfg().look.bg, win.className]);
    var mk0 = getComputedStyle($('.plat-top .pl-mark'));
    check('...the logo on its small tile, the light grey of a picked timeframe (Nestor, 27 Oct 2026: the dark one was "too dark")', mk0.backgroundColor === 'rgb(224, 227, 235)' && mk0.backgroundColor === getComputedStyle($('.plat-top .pl-tfs button.on') || $('.plat-top .pl-tfs button')).backgroundColor && Math.round(parseFloat(mk0.width)) === 32 && parseFloat(mk0.borderRadius) === 6, [mk0.backgroundColor, mk0.width, mk0.borderRadius]);
    var ta2 = tabs.querySelector('.tab.active'), tabsLt = { h: tabs.offsetHeight, th: ta2.offsetHeight, fs: getComputedStyle(ta2).fontSize, tb: getComputedStyle(ta2).backgroundColor, bg: getComputedStyle(tabs).backgroundColor, tk: $('.ticker-bar') ? getComputedStyle($('.ticker-bar')).backgroundColor : '' };
    check('...only the chart and the platform: the app\'s tab row and the market ticker stay dark, as they are', JSON.stringify(tabsLt) === JSON.stringify(tabsNow) && !/\|lt/.test(($('#ticker-widget-host') || {})._tickerSig || ''), [tabsNow, tabsLt]);
    $('[data-pltheme]').click(); await W(600);
    check('the moon: back to the dark colours as they were', !P._cfg().look.bg && !P._cfg().lookDk && !win.classList.contains('pl-lt'), [P._cfg().look, P._cfg().lookDk]);
    // the frame's theme and the chart's colours apart (Nestor, 25 Oct 2026: "i like the dark theme but i want my charts to be able to be white")
    var dark = function (el) { var m = /rgba?\((\d+), (\d+), (\d+)/.exec(getComputedStyle(el).color); return m && (+m[1] + +m[2] + +m[3]) < 240; };
    P._lookSet('bg', '#ffffff'); await W(600);
    check('Chart settings, a white background in the dark theme: the frame stays dark, the chart white, its name dark on it', !win.classList.contains('pl-lt') && win.classList.contains('pl-clt') && getComputedStyle($('.plat-top')).backgroundColor === 'rgb(19, 23, 34)' && dark($('#stpr-grid .pl-nm')) && P._cfg().plLt === false,
      [win.className, getComputedStyle($('.plat-top')).backgroundColor, getComputedStyle($('#stpr-grid .pl-nm')).color]);
    $('[data-pltheme]').click(); await W(600);
    check('...the sun now: the frame light, the chart\'s colours the member\'s own (white, nothing else changed)', win.classList.contains('pl-lt') && P._cfg().look.bg === '#ffffff' && !('vgc' in P._cfg().look) && !P._cfg().lookTh, P._cfg().look);
    P._lookSet('bg', '#131722'); await W(600);
    check('a dark chart in the light theme: the frame stays light, the chart\'s name light on it', win.classList.contains('pl-lt') && !win.classList.contains('pl-clt') && getComputedStyle($('.plat-top')).backgroundColor === 'rgb(255, 255, 255)' && !dark($('#stpr-grid .pl-nm')),
      [win.className, getComputedStyle($('#stpr-grid .pl-nm')).color]);
    $('[data-pltheme]').click(); await W(300); P._lookReset(); await W(600);
    check('...the moon and Chart settings\' reset: dark frame, dark chart', !win.classList.contains('pl-lt') && !win.classList.contains('pl-clt') && P._cfg().plLt === false, win.className);
    $('[data-plrg="5D"]').click(); for (k = 0; k < 40 && P._panes()[0].tf !== 5; k++) await W(200); await W(800);
    check('5D: the 5-minute chart, five days on screen', P._panes()[0].tf === 5, P._panes()[0].tf);

    // ---- the chart windows' toolbars still get the whole tools row ----
    var h2 = P._plat().tb2;
    check('a chart window\'s toolbar: the tools row as it was (the tools, hide, lock, delete, object tree)', /id="stpr-tools"/.test(h2) && /id="stpr-hideall"/.test(h2) && /id="stpr-del"/.test(h2) && /id="stpr-treebtn"/.test(h2) && /id="stpr-undo"/.test(h2), h2.length);

    // ---- Trade with and the Trade copier in words (Nestor, 27 Oct 2026: "i dont know if i am asking to follow or for the account to be a
    //      follow account, also if an account is following my main account it doesnt appear here"); stand-ins only, nothing leaves the page ----
    var cw0 = window.__stCopyWish, cwCalls = [], CWs = {}, rawc = P._s().sym.raw, LVc = P._lv(), Lc = window.__stLiveLine, leadR = 'lead';
    window.__stCopyWish = { set: function (lg, role) { cwCalls.push(lg + ':' + role); CWs[String(lg)] = { role: role, at: Date.now(), err: '', ok: true }; return Promise.resolve(true); }, state: function (lg) { return CWs[String(lg)] || null; }, role: cw0 ? cw0.role : function () { return 'off'; }, _clear: function () { CWs = {}; } };
    ['acc-demo|FTMO Demo', 'acc-one|OneFunded 10K'].forEach(function (s0) { var v = s0.split('|'); data.accounts.push(Object.assign(JSON.parse(JSON.stringify(data.accounts[0])), { id: v[0], name: v[1], kind: 'challenge', status: 'active' })); });
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap, { '1515070952': 'acc-demo', '27007659': 'acc-one' });
    var e0c = Lc.easL()[rawc + '|90001234'] || {}; Lc.easL()[rawc + '|1515070952'] = Object.assign({}, e0c, { at: Date.now(), lg: 1515070952, v: '9.16' });
    LVc.set = LVc.set || {}; LVc.set[rawc + '|1515070952'] = Object.assign({}, LVc.set[rawc + '|90001234'] || {}, { copy_role: 'off', copy_followers: 0 });
    window.__stEA.apply({ login: '27007659', symbol: rawc, ea_version: '9.15', updated_at: new Date().toISOString(), settings: { copy_role: 'follow', copy_lead: '90001234', copy_followers: 0, risk_mode: 'amount', risk_amount: 70, sl_min: 2, sl_max: 4, tp_on: true, tp_mode: 'rr', tp_value: 3, be_on: true, be_trigger_r: 1, max_trades_day: 3, partials: '50', unit: 'pips' } });
    var keepc = setInterval(function () { var x = Lc.easL()[rawc + '|1515070952']; if (x) x.at = Date.now(); var s1 = LVc.set[rawc + '|90001234']; if (s1 && s1.copy_role !== leadR) s1.copy_role = leadR; }, 100);
    P._cfg().lvLg = '90001234'; await W(600);
    var accMenu = async function () { $('#stpr-mm [data-mm="acct"]').click(); for (k = 0; k < 30 && !$('#stpr-menu.show .stpr-accm'); k++) await W(100); await W(1700); return $('#stpr-menu'); };
    // ---- Trade with redone (29 Oct 2026, Nestor: "this looks a bit confusing to look at"): one line per account, a role chip, a check on
    //      the one traded, no buttons in the rows, no paragraph; the copier's actions in "Copy trading…", a sheet of its own ----
    var rowOf = function (lg) { return $('#stpr-menu [data-lvacc="' + lg + '"]'); };
    var chipOf = function (lg) { var r = rowOf(lg), c = r && r.querySelector('.stpr-twc'); return c ? c.textContent : ''; };
    var crow = function (lg) { return $('#stpr-menu [data-cprow="' + lg + '"]'); };
    var sheet = async function () { $('#stpr-menu [data-cpsheet]').click(); await W(250); return $('#stpr-menu .stpr-cps'); };
    var pm = await accMenu(), r70 = rowOf('90001234'), rOne = rowOf('27007659'), rDemo = rowOf('1515070952');
    check('Trade with: one line per account - its name bold, its login small', r70 && r70.querySelector('.stpr-tw-n b').textContent === 'FTMO 70K' && r70.querySelector('.stpr-tw-n small').textContent === '90001234' && rOne && rDemo, r70 && r70.textContent);
    check('...role chips: FTMO 70K "LEAD", OneFunded 10K "COPIES 70K", FTMO Demo none', chipOf('90001234') === 'LEAD' && rOne.querySelector('.stpr-twc.cp') && chipOf('27007659') === 'COPIES 70K' && !rDemo.querySelector('.stpr-twc'), [chipOf('90001234'), chipOf('27007659'), chipOf('1515070952')]);
    check('...the account traded marked: a check and the row lit', r70.classList.contains('on') && r70.querySelector('.stpr-tw-ck svg') && !rDemo.querySelector('.stpr-tw-ck svg'), r70.className);
    check('...no button inside a row, no paragraph under them; one "Copy trading…" at the bottom', !pm.querySelector('.stpr-tw button, [data-cpact]') && !pm.querySelector('.stpr-wlf') && /^Copy trading…$/.test(($('#stpr-menu [data-cpsheet]') || {}).textContent || ''), pm.textContent);
    check('...the account copying it is in the list (it keeps no live line)', rOne && rOne.hasAttribute('data-lvfol'));
    var sh = await sheet();
    check('Copy trading: the Lead (Stop being the Lead), copying it (OneFunded 10K, Stop copying), not copying (FTMO Demo, Copy 70K’s trades)', sh && crow('90001234') && crow('90001234').querySelector('[data-cpact="off|90001234"]') && crow('27007659').querySelector('[data-cpact="off|27007659"]') && /Copy 70K’s trades/.test(crow('1515070952').textContent) && /Lead.*Copying it.*Not copying/.test(sh.textContent), sh && sh.textContent);
    crow('90001234').querySelector('[data-cpact="off|90001234"]').click(); await W(200);
    check('Stop being the Lead asks first: "OneFunded 10K will stop copying FTMO 70K. Stop?" Keep / Stop - nothing sent yet', /OneFunded 10K will stop copying FTMO 70K\. Stop\?/.test($('#stpr-menu').textContent) && $('#stpr-menu [data-cpyes]') && !cwCalls.length, $('#stpr-menu').textContent);
    $('#stpr-menu [data-cpno]').click(); await W(200);
    check('...Keep: nothing sent, the row as it was', !cwCalls.length && !$('#stpr-menu [data-cpyes]') && /Stop being the Lead/.test(crow('90001234').textContent), cwCalls);
    crow('1515070952').querySelector('[data-cpact^="follow"]').click(); await W(300);
    check('Copy 70K’s trades: asked at once, under its row "Setting up copy… (asked HH:MM)"', cwCalls.join() === '1515070952:follow' && /Setting up copy… \(asked \d\d:\d\d\)/.test($('#stpr-menu .stpr-cps').textContent) && !crow('1515070952').querySelector('[data-cpact]'), [cwCalls, $('#stpr-menu').textContent]);
    $('#stpr-menu [data-cpback]').click(); await W(250);
    check('...back: the list again', $('#stpr-menu .stpr-twm') && !$('#stpr-menu .stpr-cps'));
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await W(200);
    check('the picker closes on a click outside it, anywhere in the app', !$('#stpr-menu.show'));
    pm = await accMenu(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(200);
    check('...and on Esc', !$('#stpr-menu.show'));
    pm = await accMenu(); rowOf('27007659').click(); await W(600);
    var mmF = $('#stpr-mm');
    check('OneFunded picked: the Trade Manager shows its own Risk, Stop, Take profit, Break-even (as its EA reported them), "Change these on its MT5 panel for now"', /OneFunded 10K · 27007659/.test(mmF.textContent) && /Risk70\.00/.test(mmF.textContent.replace(/\s+/g, '')) && /2\.0 – 4\.0/.test(mmF.textContent) && /3\.0 R/.test(mmF.textContent) && /Change these on its MT5 panel for now/.test(mmF.textContent), mmF.textContent.slice(0, 200));
    var xf = mmF.querySelector('.pl-x');
    check('...Execute locked and grey: "Copies FTMO 70K: trade on the Lead"', xf && xf.disabled && xf.classList.contains('fol') && xf.textContent === 'Copies FTMO 70K: trade on the Lead' && getComputedStyle(xf).cursor === 'not-allowed', xf && xf.textContent);
    pm = await accMenu(); rowOf('90001234').click(); await W(800);
    check('...the 70K picked again: its own Trade Manager, Execute', /FTMO 70K/.test($('#stpr-mm .pl-mh').textContent) && $('#stpr-mm .pl-x').textContent === 'Execute', $('#stpr-mm .pl-mh').textContent);
    // ---- a Follow with its own live line (EA 9.16) is never traded from here either (29 Oct 2026, Nestor: "when an account is the follow
    //      account trading on that account should not be allowed"): Execute locked, the O key arms nothing, nothing is sent ----
    var tmA = window.__stTM.acct, opens = []; window.__stTM.acct = function (o) { if (o && o.a === 'open') opens.push(o.login); return tmA.apply(this, arguments); };
    LVc.set[rawc + '|1515070952'].copy_role = 'follow'; LVc.set[rawc + '|1515070952'].copy_lead = '90001234';
    pm = await accMenu(); rowOf('1515070952').click(); await W(900);
    var xd = $('#stpr-mm .pl-x');
    check('a Follow with its own live line picked (FTMO Demo copies FTMO 70K): Execute locked and grey, "Copies FTMO 70K: trade on the Lead"', P._cfg().lvLg === '1515070952' && xd && xd.disabled && xd.classList.contains('fol') && xd.textContent === 'Copies FTMO 70K: trade on the Lead' && !$('#stpr-mm [data-plbrk]'), [P._cfg().lvLg, xd && xd.textContent]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: String(P._cfg().mm.key || 'O').toLowerCase(), bubbles: true })); await W(300);
    check('...its O key arms nothing (no execution lines, so no chart click places anything); it says why, in amber, not red', !P._s().exec && /Copies FTMO 70K: trade on the Lead\./.test(document.getElementById('stpr-win').textContent), P._s().exec);
    var xd2 = $('#stpr-mm .pl-x'); try { xd2.disabled = false; xd2.click(); } catch (e) {} await W(300);
    check('...even a forced press of Execute arms nothing; no order of any kind was sent', !P._s().exec && !opens.length, [P._s().exec, opens]);
    LVc.set[rawc + '|1515070952'].copy_role = 'off'; LVc.set[rawc + '|1515070952'].copy_lead = ''; window.__stTM.acct = tmA;
    pm = await accMenu(); rowOf('90001234').click(); await W(900);
    check('...the 70K picked again: Execute back', $('#stpr-mm .pl-x').textContent === 'Execute' && !$('#stpr-mm .pl-x').disabled);
    leadR = 'off'; LVc.set[rawc + '|90001234'].copy_role = 'off'; window.__stCopyWish._clear(); cwCalls = []; await W(300);
    pm = await accMenu();
    check('the Lead off: the copier\'s row says "LEAD OFF" (amber), the 70K no LEAD', chipOf('27007659') === 'LEAD OFF' && rowOf('27007659').querySelector('.stpr-twc.off') && chipOf('90001234') === '', [chipOf('27007659'), chipOf('90001234')]);
    sh = await sheet(); var wn = $('#stpr-menu .stpr-cpwarn');
    check('...Copy trading says it first, with the fix: "OneFunded 10K copies FTMO 70K, but FTMO 70K isn\'t the Lead, so nothing is copied." - Make FTMO 70K the Lead', wn && /OneFunded 10K copies FTMO 70K, but FTMO 70K isn’t the Lead, so nothing is copied\./.test(wn.textContent) && wn.querySelector('[data-cpact="lead|90001234"]') && /No Lead yet/.test(sh.textContent), wn && wn.textContent);
    wn.querySelector('[data-cpact="lead|90001234"]').click(); await W(200);
    check('...Make FTMO 70K the Lead asks first', /Make FTMO 70K the Lead\?/.test($('#stpr-menu').textContent) && !cwCalls.length, $('#stpr-menu').textContent);
    $('#stpr-menu [data-cpyes]').click(); await W(300);
    check('...yes: asked for FTMO 70K (Lead)', cwCalls.join() === '90001234:lead', cwCalls);
    clearInterval(keepc); window.__stCopyWish = cw0; document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); delete Lc.easL()[rawc + '|1515070952']; delete LVc.set[rawc + '|1515070952']; LVc.set[rawc + '|90001234'].copy_role = 'off'; await W(400);

    // ---- a trade's box stays after the trade has closed, until deleted by hand (Nestor, 26 Oct 2026: "today it disappears") ----
    var oi0 = window.__stLive.openIdeas, Bx = P._panes()[0].bars, lx = Bx[Bx.length - 1].close, tx0 = Bx[Bx.length - 30].time, rawx = P._s().sym.raw;
    var bxr = { symbol: 'EURUSD', ticket: 88001, login: 90001234, direction: 'long', lots: 1, openedAt: tx0 * 1000, risk0: 100, risk: 100, tick: { op: lx - 0.0005, rpx: 0.0007, sl: -1, tp: 2, r: 0.5, pnl: 50, px: lx, at: Date.now(), dg: 5, lad: '' } };
    var box = function () { return (P._dr().list || []).filter(function (d) { return d && d.trade === 'tb:88001'; })[0]; };
    P._cfg().tbSince = tx0 - 3600;   // a trade opened after this rule came in (its own day starts at the chart's clock here)
    window.__stLive.openIdeas = function () { bxr.tick.at = Date.now(); return [{ main: bxr, rows: [bxr] }]; };
    for (k = 0; k < 30 && !box(); k++) await W(250);
    check('an open trade: its box on the chart, running', box() && box().type === 'long' && box().live, box());
    window.__stLive.openIdeas = function () { return []; };
    P._lvTr([{ ticket: 88001, symbol: 'EURUSD', direction: 'buy', lots: 1, entry_price: bxr.tick.op, exit_price: lx, open_time: new Date(tx0 * 1000).toISOString(), close_time: new Date(Bx[Bx.length - 5].time * 1000).toISOString(), pnl: 50, risk_gbp: 100, login: '90001234', sl_pips: 7, tp_pips: 14 }]);
    for (k = 0; k < 30 && box() && box().live; k++) await W(250);
    check('...closed: the box stays, ending at the close', box() && !box().live && box().b.t === Bx[Bx.length - 5].time, box());
    P._dwAdopt(rawx, (P._dr().list || []).filter(function (d) { return !(d && d.trade); }));
    check('...(another window\'s older list adopted from the server, without it)', !box());
    for (k = 0; k < 30 && !box(); k++) await W(250);
    check('...it is made again: only the member deletes it', !!box() && !P._cfg().tbDel['tb:88001'], box());
    var Lx = P._dr().list; Lx.splice(Lx.indexOf(box()), 1); await W(3500);
    check('...deleted by hand: it stays deleted (remembered)', !box() && P._cfg().tbDel['tb:88001'] === 1, P._cfg().tbDel);
    // only the account the chart is on (Nestor, 28 Oct 2026: "can you eliminate all the demo account trade history arrows please?"): the demo's test
    // trades, and a row with no login, never mark the 70K's chart - with its own EA or with the prices from another account's EA (the hub)
    var mk3 = function (tk, lg) { return { ticket: tk, symbol: 'EURUSD', direction: 'buy', lots: 1, entry_price: bxr.tick.op, exit_price: lx, open_time: new Date(tx0 * 1000).toISOString(), close_time: new Date(Bx[Bx.length - 5].time * 1000).toISOString(), pnl: 50, risk_gbp: 100, login: lg }; };
    window.__stLive.openIdeas = function () { return []; }; P._lvTr([mk3(88101, '90001234'), mk3(88102, '1515070952'), mk3(88103, null)]); await W(200);
    var lst1 = P._lvTrList();
    check('closed trades marked: the chart\'s own account\'s only - not the demo\'s, not a row without a login', lst1.join('|') === '88101', lst1);
    var ea0 = P._s().ea, lvLg0 = P._cfg().lvLg, act0 = data.activeAccountId;
    P._s().ea = Object.assign({}, ea0, { hub: 'EURUSD|1515070952', lg: 1515070952 }); P._cfg().lvLg = ''; data.activeAccountId = 'acc-plat';
    var lst2 = P._lvTrList(), lgs2 = P._lvMarkLgs();
    check('...prices from another account\'s EA (the hub, here the demo): still the account on screen\'s, never the hub\'s', lst2.join('|') === '88101' && lgs2.join('|') === '90001234', [lst2, lgs2]);
    P._cfg().lvLg = '1515070952'; var lst3 = P._lvTrList();
    check('...the demo picked to trade with: then the demo\'s own', lst3.join('|') === '88102', lst3);
    P._s().ea = Object.assign({}, ea0, { hub: null, lg: 1515070952 }); P._cfg().lvLg = '90001234'; var lst4 = P._lvTrList();
    check('...the account picked (the 70K) off the line, the chart on the demo EA for its prices: still the 70K trades', lst4.join('|') === '88101', lst4);
    P._s().ea = ea0; P._cfg().lvLg = lvLg0; data.activeAccountId = act0;
    P._lvTr([]); window.__stLive.openIdeas = oi0; await W(400);

    // ---- Replay: the window as it was, and back ----
    $('[data-plrp]').click(); await W(200);
    var askEl = document.getElementById('lc-ask-bg'); check('Replay in the top bar asks first, as the switch does', askEl && /Switch to Replay\?/.test(askEl.textContent));
    askEl.querySelector('[data-lca="1"]').click();
    for (k = 0; k < 80 && !(P._s() && !P._s().live && P._panes().length && P._panes()[0].n); k++) await W(150); await W(1200);
    // Replay on the platform since 26 Oct 2026 (replay_plat_e2e.js has the rest): its own look, Live's parts gone
    check('in Replay: the platform, Replay\'s - its playback in the top bar, the tools down the left, no Watchlist', win.classList.contains('plat') && win.classList.contains('pl-replay') && !!$('.plat-top #stpr-play') && !!$('#stpr-tools').closest('.plat-left') && getComputedStyle($('.pl-wl')).display === 'none',
      [win.className, $('#stpr-tools').parentNode.className]);
    // one Replay on a computer (Nestor, 25 Oct 2026: "why have 2 relay buttons now? i like the one on the chart better"): no switch above the
    // chart, Replay's own header has Live, asking first as the top bar's Replay does
    var lvb = $('#stpr-lvback');
    check('in Replay: no Live | Replay switch above, a Live button in Replay\'s top bar', getComputedStyle($('#lc-mode')).display === 'none' && lvb && getComputedStyle(lvb).display !== 'none' && lvb.closest('.plat-top') && /Live/.test(lvb.textContent), [getComputedStyle($('#lc-mode')).display, lvb && getComputedStyle(lvb).display]);
    check('...and no prop firm progress under the chart (Statistics and Accounts have it)', getComputedStyle($('#lc-pfp')).display === 'none');
    lvb.click(); await W(200);
    check('...Live asks first: Switch to Live?', $('#lc-ask-bg') && /Switch to Live\?/.test($('#lc-ask-bg').textContent), $('#lc-ask-bg') && $('#lc-ask-bg').textContent.slice(0, 60));
    document.getElementById('lc-ask-bg').querySelector('[data-lca="1"]').click();
    for (k = 0; k < 80 && !(P._s() && P._s().live && LC.state().fresh); k++) await W(250); await W(1500);
    check('back to Live: the platform again', win.classList.contains('plat') && $('.plat-left #stpr-tools') && $('.plat-top #stpr-tb2'), win.className);
    // ---- Close 50% (EA 9.15's "part", 25 Oct 2026), any share since the same day: the chevron picks how much, the row asks once in
    //      its own place; the menu is left showing for the picture ----
    try { localStorage.removeItem('st_partPct'); } catch (e) {}
    if ($('[data-pltab="pos"]')) { $('[data-pltab="pos"]').click(); await W(400); }
    for (k = 0; k < 40 && !$('.pl-t [data-tma="part"]'); k++) await W(250);
    $('.pl-t [data-tma="partmenu"]').click(); await W(300);
    var pm = $('.pl-pm'), pr = pm && pm.getBoundingClientRect(), wr2 = $('#stpr-win').getBoundingClientRect(), pat2 = pr && document.elementFromPoint(pr.left + pr.width / 2, pr.top + pr.height / 2);
    check('the row\'s chevron opens how much to close: 25 / 33 / 50 / 75 / 80 and a box, inside the window, on top', pm && pm.querySelectorAll('[data-tmpct]').length === 5 && pat2 && pm.contains(pat2) && pr.left >= wr2.left && pr.right <= wr2.right + 1 && pr.top >= wr2.top && pr.bottom <= wr2.bottom + 1, pr && [pr.left, pr.top, pr.right, pr.bottom, wr2.right, wr2.bottom]);
    pm.querySelector('[data-tmpct="25"]').click(); await W(400);
    check('...25%: the row\'s button says Close 25%', !$('.pl-pm') && /^Close 25%$/.test($('.pl-t [data-tma="part"]').textContent.trim()), $('.pl-t [data-tma="part"]').textContent);
    var pb = $('.pl-t [data-tma="part"]'); if (pb) pb.click();
    for (k = 0; k < 20 && !$('.pl-t .pl-conf'); k++) await W(150);
    var cq = $('.pl-t .pl-conf');
    check('Close 25% in the row asks once: "Close 25% of BUY ... ?" Close 25% / Keep, nothing sent yet', cq && /Close 25% of BUY [\d.]+ EURUSD\?/.test(cq.textContent) && cq.querySelector('[data-tma="part!"]') && cq.querySelector('[data-tma="partno"]'), cq && cq.textContent);
    var tr = cq && cq.closest('tr'), tb = tr && tr.closest('.pl-t, table'), over = tr ? tr.scrollWidth - tr.clientWidth : -1;
    check('...the row still fits its panel', !!tr && tb.getBoundingClientRect().right <= $('#stpr-win').getBoundingClientRect().right + 1, [tb && tb.getBoundingClientRect().right, $('#stpr-win').getBoundingClientRect().right]);
    cq.querySelector('[data-tma="partno"]').click(); await W(300);
    if ($('.pl-t [data-tma="partmenu"]')) { $('.pl-t [data-tma="partmenu"]').click(); await W(300); }   // for the picture
    try { localStorage.removeItem('st_partPct'); } catch (e) {}
    check('no errors', errs.length === 0, errs.slice(0, 3));
  } catch (e) { results.push({ name: 'test ran', ok: false, got: String(e && e.stack || e) }); }
  return results;
})()
