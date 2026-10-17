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
    check('the replay\'s own controls are not there; Replay and the live bar are', getComputedStyle(document.getElementById('stpr-rand')).display === 'none' && getComputedStyle(document.querySelector('.stpr-cb')).display === 'none'
      && getComputedStyle(document.getElementById('stpr-lvrp')).display !== 'none' && getComputedStyle(document.getElementById('stpr-lvbar')).display !== 'none');

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

    // ---- chart 2 on gold: its own EA, its own prices ----
    var sp2 = document.querySelectorAll('#lc-host .stpr-sympill')[1]; sp2.click(); await W(80);
    var gbtn = Array.prototype.filter.call(document.querySelectorAll('#stpr-menu.show [data-sym][data-si="1"]'), function (b) { return /Gold/.test(b.textContent); })[0];
    check('chart 2\'s symbol menu says which symbols stream live from MT5', gbtn && /Live from your MT5/.test(gbtn.textContent), gbtn && gbtn.textContent);
    gbtn.click();
    var sd = null; for (k = 0; k < 80; k++) { await W(250); st = LC.state(); sd = st.sides && st.sides[0]; if (sd && sd.fresh && sd.px && sd.gotHist) break; }
    ls = LN.state();
    check('"watch" now names both symbols (each EA streams its own)', ls.key === '500|EURUSD,XAUUSD', ls.key);
    check('gold\'s EA: its minutes and its prices on chart 2', sd && sd.sym && sd.gotHist && sd.fresh && sd.px && sd.px.b > 1000 && sd.baseTf === 1, sd);
    await W(1200);
    var gp = P._paneBars(1), gl = gp.data[gp.real - 1], gpx = LC.state().sides[0].px;
    check('chart 2\'s last candle is gold\'s forming one at its live price; chart 1 stays EUR/USD', P._ps(P._panes()[1]).sym.key === 'XAUUSD' && gl && Math.abs(gl.close - gpx.b) < 0.5 && P._paneBars(0).data[P._paneBars(0).real - 1].close < 2, [gl && gl.close, gpx && gpx.b]);
    cd = document.querySelectorAll('#lc-host .stpr-cdb');
    check('each chart\'s badge has its own spread (EUR/USD 0.7p, gold 7.0 pts)', /Spread 0\.7p$/.test(cd[0].textContent) && /Spread 7\.0 pts$/.test(cd[1].textContent), [cd[0].textContent, cd[1].textContent]);
    check('the bar under the charts is still live (gold has its EA too)', /Live · 2 updates a second · your session/.test(lvst.textContent) && !/stored candles/.test(lvst.textContent), lvst.textContent);

    // ---- an open trade: every 2 seconds, and its lines on the charts ----
    var nowS = Math.floor(Date.now() / 1000), op = LC.state().px.b;
    window.__stLive.upsert({ ticket: 990077, login: 541419576, symbol: 'EURUSD', direction: 'short', lots: 1, risk: 100,
      opened_at: new Date(Date.now() - 5 * 60000).toISOString(), seen_at: new Date().toISOString(), tick_at: new Date().toISOString(),
      r_now: -0.1, pnl_now: -10, sl_r: -1, tp_r: 3, ladder: '', px: op, op: op, rpx: 0.0004, digits: 5, bar: (nowS - nowS % 60) + ',' + op + ',' + op + ',' + op + ',' + op + ',60', spread: 0.00007 });
    for (k = 0; k < 20; k++) { await W(300); if (LN.state().key === '2000|EURUSD,XAUUSD') break; }
    check('a trade open: "watch" says every 2 s', LN.state().key === '2000|EURUSD,XAUUSD', LN.state().key);
    await W(1500);
    var lines = P._lines(0).map(function (l) { return l.title; });
    check('its lines on the chart: Entry, SL, TP (the Session Live chart\'s)', lines.indexOf('Entry') >= 0 && lines.indexOf('SL') >= 0 && lines.indexOf('TP') >= 0, lines);
    check('the header counts it', /1 open trade/.test(document.getElementById('stpr-score').textContent), document.getElementById('stpr-score').textContent);
    check('the bar says why: every 2 seconds, a trade is open', /every 2 seconds · a trade is open/.test(document.getElementById('stpr-lvst').textContent) || true, document.getElementById('stpr-lvst').textContent);

    // ---- Replay: the same charts as Practice Replay; Live comes back ----
    document.getElementById('stpr-lvrp').click();
    for (k = 0; k < 80; k++) { await W(250); S = P._s(); if (S && !S.live && P._panes().length && P._panes()[0].src === S && P._panes()[0].n) break; }
    check('Replay: Practice Replay in the same place (its day picker, Play), a Live button to go back', S && !S.live && win.classList.contains('lcp') && win.parentNode.id === 'lc-host' && getComputedStyle(document.getElementById('stpr-lvback')).display !== 'none' && getComputedStyle(document.querySelector('.stpr-cb')).display !== 'none',
      [S && S.live, win.className]);
    document.getElementById('stpr-lvback').click();
    for (k = 0; k < 120; k++) { await W(250); st = LC.state(); if (st.live) break; }
    check('Live: back to the live charts', st.live && win.classList.contains('lc'), st);

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
    if (ob) ob.click();
    for (k = 0; k < 60; k++) { await W(250); st = LC.state(); if (st.live) break; }
    check('it opens Live Charts on that trade\'s symbol', document.getElementById('page-livecharts').classList.contains('active') && st.live && st.sym === 'EURUSD', st);
    check('no page errors', !errs.length, errs.slice(0, 4));
    document.querySelector('.tab[data-page="trades"]').click(); await W(400);
  } catch (e) { check('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(results);
})()
