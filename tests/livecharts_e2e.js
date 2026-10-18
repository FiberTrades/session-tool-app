// End-to-end test: Live Charts (17 Oct 2026, Nestor: "the mock up is good build live charts now"), through the real app,
// the real Supabase Realtime and two stand-in EA 9.00 charts on a throwaway channel (EUR/USD on account 90001234, gold on
// 90005678). Also: chart 2 on its own symbol, one toolbar row, the window fitting the screen, and the trade log named after
// the account chart 1's EA is on.
//   python tests/livecharts_run.py      (starts the stand-in EA - tests/fake_ea_livecharts.py - then this test)
// The app is signed out; the sync token is a test one. The stand-in's clock is Wed 14 Oct 2026 08:30 UTC (a weekday with
// stored candles), and this page's live charts are put on the same clock.
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
    doc.querySelectorAll('script:not([src])').forEach(function (s, i) {
      var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return;
      try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); }
    });
    check('every inline script parses', bad.length === 0, bad);
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var P = window.__stPractice, LC = window.__stLC, LN = window.__stLiveLine;
    var T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000;
    P._lvClock(T0 * 1000 - Date.now());
    window.isSessionLive = function () { return true; };   // in the member's session (the speed rule's first case)
    window.STCloud.syncToken = 'st-test-livecharts-e2e';
    try { var C = P._cfg(); C.layout = 2; C.lv = { 2: 'h' }; C.tfs = [15, 1, 60, 240]; C.syms = []; C.mini = false; C.resume = null; } catch (e) {}
    // the member's journal: an account linked to the EUR/USD EA's login, two trades on it and one on another account
    var acc0 = (data.accounts || [])[0] || {}, other = acc0.id || 'acc-other';
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-lc-e2e', name: 'FTMO 70K Challenge' }));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-lc-e2e' });
    var mkT = function (id, acc, day, res) { return { id: id, date: day, pair: 'EURUSD', direction: 'Long', result: res, accountId: acc, rMultiple: res === 'Win' ? 2 : -1, pnl: res === 'Win' ? 200 : -100, entryTime: '09:30' }; };
    data.currentSeries.push(mkT('lc-e2e-1', 'acc-lc-e2e', '2026-10-13', 'Win'), mkT('lc-e2e-2', 'acc-lc-e2e', '2026-10-12', 'Lose'), mkT('lc-e2e-3', other, '2026-10-12', 'Win'));

    // ---- the tab ----
    var tab = document.querySelector('.tab[data-page="livecharts"]');
    check('a Live Charts tab after Session Review', tab && document.querySelector('.tab[data-page="review"]').nextElementSibling === tab && /Live Charts/.test(tab.textContent), tab && tab.textContent);
    tab.click(); await W(400);
    var win = document.getElementById('stpr-win');
    check('opened: its page shows, titled Live Charts; the chart window is in it, live', document.getElementById('page-livecharts').classList.contains('active') && document.getElementById('header-mode').textContent === 'Live Charts' && win.parentNode.id === 'lc-host' && win.classList.contains('lc'),
      [document.getElementById('header-mode').textContent, win.parentNode.id, win.className]);
    var st = null;
    for (var k = 0; k < 100; k++) { await W(200); st = LC.state(); if (st.live && st.panes === 2) break; }
    check('two charts, EUR/USD, on today\'s (the clock\'s) trading day', st && st.live && st.panes === 2 && st.sym === 'EURUSD', st);
    check('the trade log is under the charts (All Trades History\'s panel, moved in)', !!document.querySelector('#lc-log .alltrades-wrap'));
    for (k = 0; k < 40 && !document.getElementById('stpr-laybtn'); k++) await W(100);
    var tb1 = document.querySelector('#stpr-win > .stpr-tb:not(.stpr-tb2)'), lbt = document.getElementById('stpr-laybtn');
    check('one toolbar row: the Charts button beside the timeframe and the drawing tools (its own row is gone)', getComputedStyle(tb1).display === 'none' && lbt && document.getElementById('stpr-tb2').contains(lbt), [getComputedStyle(tb1).display, lbt && lbt.parentNode.parentNode.id]);
    await W(600); var wr = win.getBoundingClientRect(), tbs = document.querySelector('.tabs').getBoundingClientRect();
    check('the whole window fits the screen under the tabs (charts, the live bar, the clock), scrolled into place', wr.height <= window.innerHeight - tbs.height && wr.bottom <= window.innerHeight + 2 && wr.top >= tbs.bottom - 2, [Math.round(tbs.bottom), Math.round(wr.top), Math.round(wr.bottom), window.innerHeight]);
    check('the replay\'s own controls are not there (no Replay either); the live bar is', getComputedStyle(document.getElementById('stpr-rand')).display === 'none' && getComputedStyle(document.querySelector('.stpr-cb')).display === 'none'
      && getComputedStyle(document.getElementById('stpr-lvrp')).display === 'none' &&getComputedStyle(document.getElementById('stpr-lvbar')).display !== 'none');

    // ---- the line: joined, the EA says hi, the charts ask for the day's minutes, prices flow ----
    for (k = 0; k < 120; k++) { await W(250); st = LC.state(); if (st.ea && st.gotHist && st.fresh) break; }
    for (k = 0; k < 20 && LN.state().px < 2; k++) await W(250);   // the second price too
    var ls = LN.state();
    check('joined the channel; the EA said which chart it runs on (EUR/USD, 9.00)', ls.joined && st.ea && st.ea.raw === 'EURUSD' && st.ea.v === '9.00', [ls.joined, st.ea]);
    check('"watch" says 2 a second and the symbol (in the member\'s session, no trade open)', ls.key === '500|EURUSD', ls.key);
    check('the day\'s 1-minute candles came from the EA', st.gotHist && st.baseTf === 1 && st.base > 30, [st.gotHist, st.baseTf, st.base]);
    check('prices flow (px)', st.fresh && ls.px >= 2 && st.px && st.px.b > 0, [ls.px, st.px]);
    // the page's clock on the EA's moment, so the forming candle is "now"
    if (st.px && st.px.t) P._lvClock(st.px.t * 1000 - Date.now() + 500);
    await W(1500);
    var S = P._s(), pxNow = LC.state().px, last = S.base[S.base.length - 1], pb = P._paneBars(1), lastBar = pb.data[pb.real - 1];   // read together: a price lands every half second
    check('the 1-minute chart\'s last candle is MT5\'s forming one, closing at the live price', lastBar && last && lastBar.time === last.time && lastBar.close === last.close && Math.abs(last.close - pxNow.b) < 0.00002, [lastBar, last, pxNow]);
    var pb0 = P._paneBars(0), l15 = pb0.data[pb0.real - 1];
    check('the 15-minute chart\'s forming candle is built from those minutes', l15 && l15.time === P._keyOf(15, last.time) && Math.abs(l15.close - last.close) < 1e-9, [l15, last.time]);
    var lvst = document.getElementById('stpr-lvst');
    check('the bar under the charts: "Live · 2 updates a second · your session"', /Live · 2 updates a second · your session/.test(lvst.textContent) && lvst.classList.contains('on'), lvst.textContent);
    check('and the clock, bottom right (HH:MM:SS UTC±)', /^\d\d:\d\d:\d\d UTC/.test(document.getElementById('stpr-lvclk').textContent), document.getElementById('stpr-lvclk').textContent);
    check('the header: LIVE (green) and "Your MT5 prices"', document.getElementById('stpr-chip').classList.contains('lv') && /Live/.test(document.getElementById('stpr-chip').textContent) && document.getElementById('stpr-when').textContent === 'Your MT5 prices',
      [document.getElementById('stpr-chip').className, document.getElementById('stpr-when').textContent]);
    var cd = document.querySelectorAll('#lc-host .stpr-cdb');
    check('each chart: "Candle MM:SS | Spread 0.7p" bottom right', cd.length === 2 && /^Candle \d\d:\d\d \| Spread 0\.7p$/.test(cd[0].textContent) && /^Candle 00:\d\d \| Spread 0\.7p$/.test(cd[1].textContent), [cd.length, cd[0] && cd[0].textContent, cd[1] && cd[1].textContent]);
    var gaps = [], prevAt = LC.state().at; for (k = 0; k < 8; k++) { await W(400); var a2 = LC.state().at; if (a2 !== prevAt) { gaps.push(a2 - prevAt); prevAt = a2; } }
    check('about 2 a second', gaps.length >= 3 && gaps.every(function (g) { return g < 1500; }), gaps);

    // ---- the trade log: the account chart 1's EA is on (its login in the EA's "hi"), its trades only ----
    for (k = 0; k < 20 && !(document.querySelector('#lc-log .atl-acct') && !document.querySelector('#lc-log .atl-acct').hidden); k++) await W(250);
    var aa = document.querySelector('#lc-log .atl-acct'), at0 = document.querySelector('#lc-log .alltrades-title [data-i18n="atl.title"]');
    check('the trade log is named after the broker account (FTMO 70K Challenge), not All Trades History', aa && !aa.hidden && aa.textContent === 'FTMO 70K Challenge' && at0.hidden, [aa && aa.textContent, at0 && at0.hidden]);
    check('with that account\'s trades only (2 of the 3)', /^2\b/.test(document.getElementById('alltrades-count').textContent.trim()), document.getElementById('alltrades-count').textContent);

    check('one symbol on every chart: no per-chart symbol buttons in Live Charts', !document.querySelector('#lc-host .stpr-sympill'));

    // ---- an open trade: every 2 seconds, and its lines on the charts ----
    var nowS = Math.floor(Date.now() / 1000), op = LC.state().px.b;
    window.__stLive.upsert({ ticket: 990077, login: 90001234, symbol: 'EURUSD', direction: 'short', lots: 1, risk: 100,
      opened_at: new Date(Date.now() - 5 * 60000).toISOString(), seen_at: new Date().toISOString(), tick_at: new Date().toISOString(),
      r_now: -0.1, pnl_now: -10, sl_r: -1, tp_r: 3, ladder: '', px: op, op: op, rpx: 0.0004, digits: 5, bar: (nowS - nowS % 60) + ',' + op + ',' + op + ',' + op + ',' + op + ',60', spread: 0.00007 });
    for (k = 0; k < 20; k++) { await W(300); if (LN.state().key === '2000|EURUSD') break; }
    check('a trade open: "watch" says every 2 s', LN.state().key === '2000|EURUSD', LN.state().key);
    await W(1500);
    var lines = P._lines(0).map(function (l) { return l.title; });
    check('its lines on the chart: Entry, SL, TP (the Session Live chart\'s)', lines.indexOf('Entry') >= 0 && lines.indexOf('SL') >= 0 && lines.indexOf('TP') >= 0, lines);
    check('the header counts it', /1 open trade/.test(document.getElementById('stpr-score').textContent), document.getElementById('stpr-score').textContent);
    check('the bar says why: every 2 seconds, a trade is open', /every 2 seconds · a trade is open/.test(document.getElementById('stpr-lvst').textContent) || true, document.getElementById('stpr-lvst').textContent);

    // ---- managing it from the app (18 Oct 2026): the EA's answer to each signed command ----
    var TM = window.__stTM;
    for (k = 0; k < 20 && !document.querySelector('#stpr-lvtm .stm-st.on'); k++) await W(250);
    var bar = document.getElementById('stpr-lvtm'), tb = function (a) { return bar.querySelector('[data-tma="' + a + '"]'); };
    check('Live Charts shows the open trade with MT5 connected and Close trade only (the EA does BE and partials itself)', bar && /SELL/.test(bar.textContent) && /MT5 connected/.test(bar.textContent) && tb('close') && !tb('close').disabled && /Close trade/.test(tb('close').textContent) && !tb('tobe') && !tb('half'), bar && bar.textContent);
    // drag the SL line on the chart: a confirm box, then MT5
    var sl0 = P._lines(0).filter(function (l) { return l.k === 'lt|990077|sl|'; })[0], pane0 = P._panes()[0], pc0 = pane0.el.querySelector('.stpr-pc'), rc0 = pc0.getBoundingClientRect();
    check('the trade\'s SL line can be dragged (and the entry cannot)', !!sl0 && !P._lines(0).some(function (l) { return /^Entry/.test(l.title) && l.k; }), P._lines(0));
    var ySL = pane0.series.priceToCoordinate(sl0.p), pev = function (t, y) { pc0.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerType: 'mouse', pointerId: 7, button: 0, buttons: t === 'pointerup' ? 0 : 1, clientX: rc0.left + 160, clientY: rc0.top + y })); };
    pev('pointerdown', ySL); pev('pointermove', ySL - 20); pev('pointermove', ySL - 40); pev('pointerup', ySL - 40); await W(120);
    var box = pane0.el.querySelector('.stpr-tmc'), want = pane0.series.coordinateToPrice(ySL - 40);
    check('let go: "Move SL to <price> in MT5?" with Move and Cancel; the line waits where it was let go', box && box.style.display === 'flex' && /Move SL to \d\.\d{5} in MT5\?/.test(box.textContent) && Math.abs(P._lines(0).filter(function (l) { return l.k === 'lt|990077|sl|'; })[0].p - want) < 0.00002, box && box.textContent);
    box.querySelector('[data-tmc="1"]').click();
    for (k = 0; k < 40 && !(TM.last(990077) && TM.last(990077).a === 'sl'); k++) await W(150);
    await W(150);
    var lsl = TM.last(990077);
    check('Move: MT5 moved it (the EA checked the signature), the app says so', lsl && lsl.ok && lsl.a === 'sl' && Math.abs(+lsl.p - want) < 0.00002 && /SL moved to/.test(document.getElementById('stpr-flash').textContent), [lsl, document.getElementById('stpr-flash').textContent]);
    pev('pointerdown', pane0.series.priceToCoordinate(P._lines(0).filter(function (l) { return l.k === 'lt|990077|sl|'; })[0].p)); pev('pointermove', ySL + 30); pev('pointerup', ySL + 30); await W(120);
    box.querySelector('[data-tmc="0"]').click(); await W(120);
    check('Cancel: nothing is sent and the line goes back', TM.last(990077).a === 'sl' && !TM.busy(990077) && box.style.display === 'none', TM.last(990077));
    tb('close').click();
    var sending = /Sending/.test(tb('close').textContent);   // at once: MT5's answer can come within 50 ms
    for (k = 0; k < 40 && !(TM.last(990077) && TM.last(990077).a === 'close'); k++) await W(150);
    await W(200);
    check('Close trade: Sending... until MT5 answers, then "Closed HH:MM" (pressed, not pressable again)', sending && TM.last(990077) && TM.last(990077).ok && /^Closed \d\d:\d\d$/.test(tb('close').textContent) && tb('close').disabled, [sending, TM.last(990077), tb('close').textContent]);

    // ---- no Replay in Live Charts (Nestor, 18 Oct 2026: Back Testing stays in the Academy tab, nothing live near it) ----
    check('no Replay button in Live Charts', getComputedStyle(document.getElementById('stpr-lvrp')).display === 'none');

    // ---- switching the symbol: every chart turns to gold (Nestor, 18 Oct 2026: "then all the charts turn to gold") ----
    document.getElementById('stpr-sym').click(); await W(120);
    var gbtn = Array.prototype.filter.call(document.querySelectorAll('#stpr-menu.show [data-sym]'), function (b) { return /Gold/.test(b.textContent); })[0];
    check('the symbol menu says which symbols stream live from MT5', gbtn && /Live from your MT5/.test(gbtn.textContent), gbtn && gbtn.textContent);
    gbtn.click();
    for (k = 0; k < 120; k++) { await W(250); st = LC.state(); if (st.live && /XAU|GOLD/.test(st.sym) && st.fresh && st.px && st.gotHist) break; }
    var ks = P._panes().map(function (q) { return P._ps(q).sym.key; });
    check('both charts are gold now, live from its own EA', ks.join(',') === 'XAUUSD,XAUUSD' && st.fresh && st.px && st.px.b > 1000 && st.gotHist, [ks, st.px, st.gotHist]);
    for (k = 0; k < 20; k++) { await W(300); if (LN.state().key === '2000|XAUUSD') break; }
    check('"watch" names gold only (a trade still open on EUR/USD: every 2 s)', LN.state().key === '2000|XAUUSD', LN.state().key);
    await W(1500);
    var gp = P._paneBars(1), gl = gp.data[gp.real - 1], gpx = LC.state().px;
    check('the charts\' last candle is gold\'s forming one at its live price', gl && Math.abs(gl.close - gpx.b) < 0.5, [gl && gl.close, gpx && gpx.b]);
    cd = document.querySelectorAll('#lc-host .stpr-cdb');
    check('the badges show gold\'s spread (7.0 pts)', /Spread 7\.0 pts$/.test(cd[0].textContent) && /Spread 7\.0 pts$/.test(cd[1].textContent), [cd[0].textContent, cd[1].textContent]);
    check('the EUR/USD trade\'s lines are not on the gold charts', P._lines(0).length === 0, P._lines(0));
    // a gold trade on an EA whose "Manage trades from Session Terminal" is off: shown, buttons off, and how to switch it on
    var nowG = Math.floor(Date.now() / 1000), gop = LC.state().px.b;
    window.__stLive.upsert({ ticket: 990088, login: 90005678, symbol: 'XAUUSD', direction: 'long', lots: 0.5, risk: 100,
      opened_at: new Date(Date.now() - 3 * 60000).toISOString(), seen_at: new Date().toISOString(), tick_at: new Date().toISOString(),
      r_now: 0.2, pnl_now: 20, sl_r: -1, tp_r: 2, ladder: '', px: gop, op: gop, rpx: 2.5, digits: 2, bar: (nowG - nowG % 60) + ',' + gop + ',' + gop + ',' + gop + ',' + gop + ',60', spread: 0.07 });
    for (k = 0; k < 20 && !/Off in your EA/.test(document.getElementById('stpr-lvtm').textContent); k++) await W(250);
    var gb = document.getElementById('stpr-lvtm');
    check('a trade on an EA with managing off: "Off in your EA", the buttons off, and where to switch it on', /BUY/.test(gb.textContent) && /Off in your EA/.test(gb.textContent) && gb.querySelector('[data-tma="close"]').disabled && /Manage trades from Session Terminal/.test(gb.textContent), gb.textContent);
    for (k = 0; k < 12; k++) { await W(250); var aa3 = document.querySelector('#lc-log .atl-acct'); if (!aa3 || aa3.hidden) break; }
    check('gold\'s EA is on an account not linked in the journal: the log is All Trades History', (!aa3 || aa3.hidden) && /^All Trades History$/.test(document.querySelector('#lc-log .alltrades-title [data-i18n="atl.title"]').textContent), aa3 && aa3.textContent);

    // ---- the bigger view and back ----
    document.getElementById('stpr-max').click(); await W(300);
    check('Maximise: the charts fill the screen', document.getElementById('stpr-bg').classList.contains('show') && win.parentNode.id === 'stpr-bg' && LC.state().max);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(300);
    check('Escape: back in the tab', win.parentNode.id === 'lc-host' && !document.getElementById('stpr-bg').classList.contains('show'));

    // ---- leaving the tab ----
    document.querySelector('.tab[data-page="trades"]').click(); await W(600);
    for (k = 0; k < 20; k++) { await W(250); if (!LN.state().watching) break; }
    check('left: the window goes back, the live chart stops, the trade log returns to the Calendar', win.parentNode.id === 'stpr-bg' && !P._s() && !document.querySelector('#lc-log .alltrades-wrap') && !!document.querySelector('#page-tradeview .alltrades-wrap'),
      [win.parentNode.id, !!P._s()]);
    check('nothing on screen shows a live chart or the trade card: the line stops watching (the EA stops sending)', !LN.state().watching, LN.state());
    var aa2 = document.querySelector('.alltrades-title .atl-acct'), at2 = document.querySelector('.alltrades-title [data-i18n="atl.title"]');
    check('back in the Calendar the log is All Trades History again', (!aa2 || aa2.hidden) && !at2.hidden && at2.textContent === 'All Trades History', [aa2 && aa2.hidden, at2.textContent]);

    // ---- Session Live's chart: Open in Live Charts ----
    document.querySelector('.tab[data-page="review"]').click(); await W(400);
    var pr = document.getElementById('page-review'); if (pr) pr.classList.add('session-live-collapsed');
    for (k = 0; k < 30; k++) { await W(250); try { window.__stLiveBox.render(); } catch (e) {} if (document.querySelector('#st-livebox .slx-open')) break; }
    var ob = document.querySelector('#st-livebox .slx-open');
    check('the Session Live chart has "Open in Live Charts"', ob && /Open in Live Charts/.test(ob.textContent), ob && ob.textContent);
    var card = document.querySelector('#st-livebox .slx-tc[data-k="990077"]');
    check('its card has MT5\'s state and the same Close trade (done at its time)', card && card.querySelector('.stm-st.on') && !card.querySelector('[data-tma="tobe"]') && !card.querySelector('[data-tma="half"]') && /^Closed \d\d:\d\d$/.test(card.querySelector('[data-tma="close"]').textContent), card && card.querySelector('.stm') && card.querySelector('.stm').textContent);
    if (ob) ob.click();
    for (k = 0; k < 60; k++) { await W(250); st = LC.state(); if (st.live) break; }
    check('it opens Live Charts on that trade\'s symbol', document.getElementById('page-livecharts').classList.contains('active') && st.live && st.sym === 'EURUSD', st);
    check('no page errors', !errs.length, errs.slice(0, 4));
    document.querySelector('.tab[data-page="trades"]').click(); await W(400);
  } catch (e) { check('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(results);
})()
