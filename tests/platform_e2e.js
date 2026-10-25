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
      check('a phone: Live fills the screen', win.classList.contains('plph') && P._plat().on && Math.abs(wr0.top) < 1 && Math.abs(wr0.left) < 1 && Math.abs(wr0.width - innerWidth) < 2 && Math.abs(wr0.height - innerHeight) < 2, [win.className, wr0.top, wr0.height, innerHeight]);
      var nm0 = $('#stpr-grid .pl-nm'), oh0 = $('#stpr-grid .stpr-ohlc');
      check('its legend: the name, then O H L C on the line under it, then the Session Indicator line and the account pill', nm0 && /^Euro \/ U\.S\. Dollar · 15 · /.test(nm0.textContent) && oh0 && oh0.getBoundingClientRect().top > nm0.getBoundingClientRect().top + 8 && $('.ph-ov [data-phsi]') && $('.ph-ov [data-phpill]') && /ON|OFF/.test($('[data-phpill]').textContent),
        [nm0 && nm0.textContent, $('.ph-ov') && $('.ph-ov').textContent]);
      var bar = $('.ph-bar'), kids = [$('.ph-logo'), $('.ph-live'), $('.ph-bar #stpr-sym'), $('.ph-tf'), $('.ph-icons #stpr-drawbtn'), $('.ph-icons #stpr-undo'), $('.ph-icons #stpr-layersbtn'), $('.ph-icons #stpr-alertsbtn')];
      check('the bottom toolbar: the logo first, Live, the symbol, the timeframe, drawing tools, undo, Show on chart, alerts - all on screen', kids.every(function (k) { return k && k.getBoundingClientRect().width > 0 && k.getBoundingClientRect().right <= innerWidth + 1; }) && !!$('.ph-logo svg'),
        kids.map(function (k) { return k ? Math.round(k.getBoundingClientRect().right) : null; }));
      check('above it, docked: the open trade (or None) and a square pink Execute', (/No open trade/.test($('.ph-trade').textContent) || /lots/.test($('.ph-trade').textContent)) && $('.ph-go') && parseFloat(getComputedStyle($('.ph-go')).borderRadius) <= 4 && $('.ph-trade').getBoundingClientRect().bottom <= bar.getBoundingClientRect().top + 1);
      $('[data-phpill]').click(); await sheetAt(true); await W(200);
      check('the pill slides up the Trade Manager, Setup and Why in it', win.classList.contains('ph-open') && $('.ph-sheet #stpr-mm.pl-mm') && $('.ph-sheet [data-plsetup]') && $('.ph-sheet [data-plwhy]') && $('.ph-sheet').getBoundingClientRect().bottom <= innerHeight + 1, [win.className, !!$('.ph-sheet #stpr-mm.pl-mm'), !!$('.ph-sheet [data-plsetup]'), Math.round($('.ph-sheet').getBoundingClientRect().bottom), innerHeight]);
      $('.ph-sheet .pl-x').click(); await sheetAt(false);
      check('Execute in it: the sheet goes down, the bar says Cancel and what it places', !win.classList.contains('ph-open') && P._s().exec && $('.ph-trade [data-phx]') && /BUY|SELL/.test($('.ph-trade [data-phplace]').textContent), $('.ph-trade').textContent);
      $('.ph-trade [data-phplace]').click();
      for (k = 0; k < 40 && !/lots/.test($('.ph-sum') ? $('.ph-sum').textContent : ''); k++) await W(250);
      check('...the side it places: the order fills, the bar shows the trade', /BUY|SELL/.test($('.ph-sum').textContent) && /lots/.test($('.ph-sum').textContent), $('.ph-trade').textContent);
      $('[data-phgo]').click(); await sheetAt(true);
      check('the sheet lists the open trade with Move to BE, Close 50% (and its chevron) and Close', $('.ph-pos .ph-p') && $('.ph-pos [data-tma="part"]') && $('.ph-pos [data-tma="partmenu"]') && $('.ph-pos [data-tma="close"]'), $('.ph-pos') && $('.ph-pos').textContent.slice(0, 120));
      // how much to close (25 Oct 2026): the chevron's menu on screen, over the sheet; 75% picked is the button's label
      try { localStorage.removeItem('st_partPct'); } catch (e) {}
      $('.ph-pos [data-tma="partmenu"]').click(); await W(300);
      var pm0 = $('.pl-pm'), pq = pm0 && pm0.getBoundingClientRect(), pat = pq && document.elementFromPoint(pq.left + pq.width / 2, pq.top + pq.height / 2);
      check('...its chevron: 25 / 33 / 50 / 75 / 80 and a box, on screen over the sheet', pm0 && pm0.querySelectorAll('[data-tmpct]').length === 5 && pm0.querySelector('input') && pat && pm0.contains(pat) && pq.left >= 0 && pq.right <= innerWidth && pq.top >= 0 && pq.bottom <= innerHeight, pq && [pq.left, pq.top, pq.right, pq.bottom]);
      pm0.querySelector('[data-tmpct="75"]').click(); await W(400);
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
      check('...docked: Execute locked, the time left, on screen', pg && pg.classList.contains('lock') && /^1:59:5\d$/.test(pg.textContent) && pg.getBoundingClientRect().right <= innerWidth + 1 && /On a break/.test(pg.getAttribute('aria-label')), pg && [pg.textContent, Math.round(pg.getBoundingClientRect().right)]);
      delete acQ.ruleBreak; window.dispatchEvent(new CustomEvent('st-rules-change')); await W(600);
      check('the break over: the docked Execute back', $('.ph-go') && !$('.ph-go').classList.contains('lock') && $('.ph-go').textContent === 'Execute', $('.ph-go') && $('.ph-go').textContent);
      $('[data-phtf]').click(); await W(300);
      var mn = $('#stpr-menu.show'), mr = mn && mn.getBoundingClientRect();
      check('the timeframe opens its list above the bar', mn && mr.bottom <= bar.getBoundingClientRect().top + 1 && mn.querySelector('[data-phtfv="60"]'), mr && [mr.top, mr.bottom]);
      mn.querySelector('[data-phtfv="60"]').click(); for (k = 0; k < 40 && P._panes()[0].tf !== 60; k++) await W(150); await W(900);
      check('...1h: the chart turns to it, the button says so', P._panes()[0].tf === 60 && $('.ph-tf').textContent.indexOf('1h') === 0, [P._panes()[0].tf, $('.ph-tf').textContent]);
      $('.ph-logo').click(); await W(300);
      var nv = window.__stNav ? true : (win.classList.contains('ph-navon') && document.querySelectorAll('.ph-navs [data-phnavt]').length >= 4);
      check('the logo opens the app\'s tabs', nv, document.querySelectorAll('.ph-navs [data-phnavt]').length);
      if (!window.__stNav) { $('.ph-navs [data-phnavt="bias"]').click(); await W(600);
        check('...a tab from there: that page, the chart put away', document.getElementById('page-bias').classList.contains('active') && getComputedStyle(win).display === 'none' || !document.getElementById('page-livecharts').classList.contains('active'));
        document.querySelector('.tab[data-page="livecharts"]').click(); await W(1500); }
      check('no errors', errs.length === 0, errs.slice(0, 3));
      // for the picture: the sheet open, the chevron's menu showing
      try { if (window.__stNav && window.__stNav.isOpen()) window.__stNav.close(); } catch (e) {} await W(400);
      if ($('[data-phgo]')) { $('[data-phgo]').click(); await W(600); if ($('.ph-pos [data-tma="partmenu"]')) { $('.ph-pos [data-tma="partmenu"]').click(); await W(300); } }
      try { localStorage.removeItem('st_partPct'); } catch (e) {}
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
    var tabs = $('.container > .tabs') || $('.tabs'), ta1 = tabs.querySelector('.tab.active'), tabsNow = { h: tabs.offsetHeight, th: ta1.offsetHeight, fs: getComputedStyle(ta1).fontSize, tb: getComputedStyle(ta1).backgroundColor, bg: getComputedStyle(tabs).backgroundColor, tk: $('.ticker-bar') ? getComputedStyle($('.ticker-bar')).backgroundColor : '' };
    check('the app\'s tab row over it exactly as on every other tab: its height, the tabs\' height and font, its colours', JSON.stringify(tabsNow) === JSON.stringify(tabsBefore) && getComputedStyle(tabs).display !== 'none', [tabsBefore, tabsNow]);
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
    check('the top bar: the account, its balance and equity', /FTMO 70K/.test($('.pl-acct').textContent) && /Equity/.test($('.pl-acct').textContent), $('.pl-acct').textContent);
    // a long account name, in the cloud (Nestor, 25 Oct 2026, ~1500 px: the sun pushed out of the row): the bar steps down, never overflows
    var accN = data.accounts.filter(function (a) { return a.id === 'acc-plat'; })[0], nm0 = accN.name, mc0 = window.__stMt5c, top0 = $('.plat-top');
    accN.name = 'FTMO 70K - Challenge Phase 2 Swing Account'; window.__stMt5c = Object.assign({}, mc0 || {}, { cloud: function () { return [{ login: '90001234', status: 'running' }]; } }); await W(1600);
    var thr = $('.pl-theme').getBoundingClientRect(), ann = $('.pl-ann'), tpr = top0.getBoundingClientRect();
    check('a long account name: the top bar fits (the sun and full screen in the row), the name cut with … and whole on hover', top0.scrollWidth <= top0.clientWidth + 1 && thr.right <= tpr.right && $('#stpr-pop').getBoundingClientRect().right <= tpr.right && ann.scrollWidth > ann.clientWidth && ann.title === accN.name && /Cloud/.test($('.pl-acct').textContent),
      [top0.scrollWidth, top0.clientWidth, Math.round(thr.right), Math.round(tpr.right), ann.title, win.className.match(/\bpt\d\b/g)]);
    accN.name = nm0; window.__stMt5c = mc0; await W(1000);

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
    ask.querySelector('[data-plno]').click(); for (k = 0; k < 12 && document.querySelector('.pl-tag.ask'); k++) await W(150);
    check('...Keep: nothing sent, the tag as it was', !document.querySelector('.pl-tag.ask') && P._plat().ask === null);
    var ab = Array.prototype.map.call(document.querySelectorAll('.pl-t [data-tma]'), function (b) { return b.getAttribute('data-tma') + (b.disabled ? ':off' : ':on'); });
    check('the position\'s row: Move to BE, Close 50% (and its chevron) and Close, on (MT5 manages it from here)', ab.join(',') === 'tobe:on,part:on,partmenu:on,close:on', ab);

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

    // ---- Check my plan in the top bar (window.__stPlanCheck) ----
    var pc0 = window.__stPlanCheck, pcGot = null; window.__stPlanCheck = { open: function (o) { pcGot = o || {}; } }; await W(1000);
    var plb = $('.plat-top .pl-plan');
    check('Check my plan in the top bar, beside Replay', plb && !plb.hidden && plb.getBoundingClientRect().width > 0 && plb.title === 'Check this chart against your plan' && plb.previousElementSibling === $('.plat-top .pl-rp'), plb && [plb.hidden, plb.title]);
    plb.click(); await W(400);
    check('...it opens the plan check with the chart\'s picture', !!(pcGot && pcGot.canvas), pcGot && Object.keys(pcGot));
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
    check('...its lock under the Trade Manager\'s title, with the time left', lk && /On a break\. Trading opens again at \d\d:\d\d\./.test(lk.textContent) && /(59:5\d|1:00:00)$/.test(lk.textContent), lk && lk.textContent);
    var lx = $('#stpr-mm .pl-x');
    check('...Execute: Locked and the time left, not pressable; managing open trades said under it', lx && lx.classList.contains('lock') && lx.disabled && /^Locked(59:5\d|1:00:00)$/.test(lx.textContent) && /still be managed and closed/.test($('.pl-why2').textContent), lx && [lx.textContent, $('.pl-why2') && $('.pl-why2').textContent]);
    var c1 = $('#stpr-mm .pl-x .pl-cd').textContent; await W(2100); var c2 = $('#stpr-mm .pl-x .pl-cd').textContent;
    check('...the countdown runs', c1 !== c2 && /^59:5\d$/.test(c2), [c1, c2]);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: String(P._cfg().mm.key || 'O').toLowerCase(), bubbles: true })); await W(400);
    check('...the execution key doesn\'t arm it either, and says why on the chart', !P._s().exec && /On a break/.test($('#stpr-cw').textContent), [P._s().exec, $('#stpr-cw').textContent.slice(0, 160)]);
    var ab2 = Array.prototype.map.call(document.querySelectorAll('.pl-t [data-tma]'), function (b) { return b.getAttribute('data-tma') + (b.disabled ? ':off' : ':on'); });
    check('locked, the open trade is still managed: Move to BE, Close 50% and Close on', ab2.join(',') === 'tobe:on,part:on,partmenu:on,close:on', ab2);
    $('[data-plr="wl"]').click(); $('[data-plr="tm"]').click(); await W(500);
    var tx = $('.pl-exec');
    check('...the top bar\'s Execute (panels hidden): Locked with the time left, why on hover', tx.classList.contains('lock') && tx.disabled && /^Locked 59:5\d$/.test(tx.textContent) && /On a break/.test(tx.title), [tx.textContent, tx.title]);
    $('[data-plr="wl"]').click(); $('[data-plr="tm"]').click(); await W(400);
    delete acP.ruleBreak; window.dispatchEvent(new CustomEvent('st-rules-change')); await W(600);
    check('the break over: Execute back, the lock gone', $('#stpr-mm .pl-x').textContent === 'Execute' && !$('#stpr-mm .pl-x').disabled && !$('#stpr-mm .pl-lks') && $('.pl-exec').textContent === 'Execute', [$('#stpr-mm .pl-x').textContent, !!$('#stpr-mm .pl-lks')]);

    // ---- Session Indicator once, the theme, the range buttons ----
    var si0 = P._cfg().mini; $('[data-plsi]').click(); await W(300);
    check('the Session Indicator chip switches it on the chart', !!(P._cfg().showPer && P._cfg().showPer[0] && P._cfg().showPer[0].mini === !si0) && !$('.pl-si').classList.contains('off') === !si0, P._cfg().showPer);
    $('[data-plsi]').click(); await W(200);
    $('[data-pltheme]').click(); await W(600);
    check('the sun: TradingView\'s light theme, the chart and the frame', P._cfg().look.bg === '#ffffff' && win.classList.contains('pl-lt') && getComputedStyle($('.plat-top')).backgroundColor === 'rgb(255, 255, 255)', [P._cfg().look.bg, win.className]);
    var ta2 = tabs.querySelector('.tab.active'), tabsLt = { h: tabs.offsetHeight, th: ta2.offsetHeight, fs: getComputedStyle(ta2).fontSize, tb: getComputedStyle(ta2).backgroundColor, bg: getComputedStyle(tabs).backgroundColor, tk: $('.ticker-bar') ? getComputedStyle($('.ticker-bar')).backgroundColor : '' };
    check('...only the chart and the platform: the app\'s tab row and the market ticker stay dark, as they are', JSON.stringify(tabsLt) === JSON.stringify(tabsBefore) && !/\|lt/.test(($('#ticker-widget-host') || {})._tickerSig || ''), [tabsBefore, tabsLt]);
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
