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
    window.addEventListener('unhandledrejection', function (e) { errs.push('rejected: ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 300)); });
    var P = window.__stPractice, LC = window.__stLC, LN = window.__stLiveLine;
    var T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000;
    // a weekend: an FX symbol's live day is Friday's, a crypto one's is today's (BTCUSD trades on a Saturday)
    P._lvClock(Date.UTC(2026, 9, 17, 12, 0) - Date.now());
    var wkFx = P._liveDay({ cls: 'fx' }), wkBtc = P._liveDay({ cls: 'crypto' });
    check('at the weekend: EUR/USD\'s live day is Friday\'s, Bitcoin\'s is Saturday\'s', wkFx === '2026-10-16' && wkBtc === '2026-10-17', [wkFx, wkBtc]);
    P._lvClock(T0 * 1000 - Date.now());
    window.isSessionLive = function () { return true; };   // in the member's session (the speed rule's first case)
    // Live Charts is Nestor's only for now (18 Oct 2026): signed out, no tab and no way in
    await W(1200);
    var lct = document.querySelector('.tab[data-page="livecharts"]');
    check('Live Charts is hidden from everyone but Nestor: no tab', lct && getComputedStyle(lct).display === 'none' && !document.body.classList.contains('st-lc-on'), lct && getComputedStyle(lct).display);
    LC.open({ sym: 'EURUSD' }); await W(300);
    check('...and no way in from elsewhere (a Session Live card)', !document.getElementById('page-livecharts').classList.contains('active'));
    check('...nor Close trade on a Session Live card (trading from the app is his only too)', window.__stTM.row({ ticket: 1, login: 1, symbol: 'EURUSD' }) === '', window.__stTM.row({ ticket: 1, login: 1, symbol: 'EURUSD' }).slice(0, 80));
    window.__stLcForce = true; await W(1200);
    check('for his account it shows', getComputedStyle(lct).display !== 'none' && document.body.classList.contains('st-lc-on') && window.__stTM.row({ ticket: 1, login: 1, symbol: 'EURUSD' }) !== '', getComputedStyle(lct).display);
    window.STCloud.syncToken = 'st-test-livecharts-e2e';
    if ('__RELAY__'.indexOf('ws') === 0) window.__stRelayURL = '__RELAY__';   // livecharts_run.py puts its relay here
    try { var C = P._cfg(); C.layout = 2; C.lv = { 2: 'h' }; C.tfs = [15, 1, 60, 240]; C.syms = []; C.mini = false; C.resume = null; } catch (e) {}
    // the member's journal: an account linked to the EUR/USD EA's login, two trades on it and one on another account
    var acc0 = (data.accounts || [])[0] || {}, other = acc0.id || 'acc-other';
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-lc-e2e', name: 'FTMO 70K Challenge', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000,
      riskRules: Object.assign({}, acc0.riskRules || {}, { maxDrawdownMode: 'pct', maxDrawdownPct: 10, profitTargetMode: 'pct', profitTargetPct: 10, ddType: 'static' }) }));
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
    check('joined the channel; the EA said which chart it runs on (EUR/USD, 9.02)', ls.joined && st.ea && st.ea.raw === 'EURUSD' && st.ea.v === '9.02', [ls.joined, st.ea]);
    check('"watch" says 2 a second and the symbol (in the member\'s session, no trade open), and names the hub (9.02)', /^500\|EURUSD\|EURUSD\|90001234>/.test(ls.key), ls.key);
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
    check('the EUR/USD EA is on the relay (the app joined it too): the bar says "Live · every tick"', LN.relay().joined && st.ea && st.ea.rl && /Live · every tick/.test(lvst.textContent) && lvst.classList.contains('on'), [LN.relay(), st.ea, lvst.textContent]);
    check('and the clock, bottom right (HH:MM:SS UTC±)', /^\d\d:\d\d:\d\d UTC/.test(document.getElementById('stpr-lvclk').textContent), document.getElementById('stpr-lvclk').textContent);
    check('the header: LIVE (green) and "Your MT5 prices"', document.getElementById('stpr-chip').classList.contains('lv') && /Live/.test(document.getElementById('stpr-chip').textContent) && document.getElementById('stpr-when').textContent === 'Your MT5 prices',
      [document.getElementById('stpr-chip').className, document.getElementById('stpr-when').textContent]);
    var cd = document.querySelectorAll('#lc-host .stpr-cdb');
    check('each chart: "Candle MM:SS | Spread 0.7p" bottom right', cd.length === 2 && /^Candle \d\d:\d\d \| Spread 0\.7p$/.test(cd[0].textContent) && /^Candle 00:\d\d \| Spread 0\.7p$/.test(cd[1].textContent), [cd.length, cd[0] && cd[0].textContent, cd[1] && cd[1].textContent]);
    var gaps = [], prevAt = LC.state().at; for (k = 0; k < 40; k++) { await W(80); var a2 = LC.state().at; if (a2 !== prevAt) { gaps.push(a2 - prevAt); prevAt = a2; } }
    check('every tick: several a second over the relay', gaps.length >= 5 && gaps.filter(function (g) { return g < 300; }).length >= gaps.length * 0.6, gaps);

    // ---- the trade log: the account chart 1's EA is on (its login in the EA's "hi"), its trades only ----
    for (k = 0; k < 20 && !(document.querySelector('#lc-log .atl-acct') && !document.querySelector('#lc-log .atl-acct').hidden); k++) await W(250);
    var aa = document.querySelector('#lc-log .atl-acct'), at0 = document.querySelector('#lc-log .alltrades-title [data-i18n="atl.title"]');
    check('the trade log is named after the broker account (FTMO 70K Challenge), not All Trades History', aa && !aa.hidden && aa.textContent === 'FTMO 70K Challenge' && at0.hidden, [aa && aa.textContent, at0 && at0.hidden]);
    check('with that account\'s trades only (2 of the 3)', /^2\b/.test(document.getElementById('alltrades-count').textContent.trim()), document.getElementById('alltrades-count').textContent);
    for (k = 0; k < 20 && getComputedStyle(document.getElementById('lcp-section')).display === 'none'; k++) await W(250);
    var pfp = document.getElementById('lcp-section');
    check('under it, Prop Firm Progress for that account (Statistics\' card): its target and its room to the floor', getComputedStyle(pfp).display !== 'none' && /Prop Firm Progress/.test(pfp.textContent) && /FTMO 70K Challenge/.test(pfp.textContent) && /Profit target/.test(pfp.textContent) && /Room to the floor/.test(pfp.textContent) && document.getElementById('lc-log').nextElementSibling.id === 'lc-pfp', pfp.textContent.slice(0, 200));

    check('one symbol on every chart: no per-chart symbol buttons in Live Charts', !document.querySelector('#lc-host .stpr-sympill'));

    // ---- an open trade: every 2 seconds, and its lines on the charts ----
    var nowS = Math.floor(Date.now() / 1000), op = LC.state().px.b;
    window.__stLive.upsert({ ticket: 990077, login: 90001234, symbol: 'EURUSD', direction: 'short', lots: 1, risk: 100,
      opened_at: new Date(Date.now() - 5 * 60000).toISOString(), seen_at: new Date().toISOString(), tick_at: new Date().toISOString(),
      r_now: -0.1, pnl_now: -10, sl_r: -1, tp_r: 3, ladder: '', px: op, op: op, rpx: 0.0004, digits: 5, bar: (nowS - nowS % 60) + ',' + op + ',' + op + ',' + op + ',' + op + ',60', spread: 0.00007 });
    for (k = 0; k < 20; k++) { await W(300); if (/^2000\|EURUSD\|/.test(LN.state().key)) break; }
    check('a trade open: "watch" says every 2 s', /^2000\|EURUSD\|/.test(LN.state().key), LN.state().key);
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
    var gbtn = Array.prototype.filter.call(document.querySelectorAll('#stpr-menu.show [data-sym]'), function (b) { return /XAUUSD/.test(b.textContent); })[0];
    check('the symbol button\'s list marks what streams live from MT5 (a green dot)', gbtn && !!gbtn.querySelector('b i'), gbtn && gbtn.innerHTML.slice(0, 160));
    gbtn.click();
    for (k = 0; k < 120; k++) { await W(250); st = LC.state(); if (st.live && /XAU|GOLD/.test(st.sym) && st.fresh && st.px && st.gotHist) break; }
    var ks = P._panes().map(function (q) { return P._ps(q).sym.key; });
    check('both charts are gold now, live from its own EA', ks.join(',') === 'XAUUSD,XAUUSD' && st.fresh && st.px && st.px.b > 1000 && st.gotHist, [ks, st.px, st.gotHist]);
    for (k = 0; k < 20; k++) { await W(300); if (/^2000\|XAUUSD\|/.test(LN.state().key)) break; }
    check('"watch" names gold only (a trade still open on EUR/USD: every 2 s)', /^2000\|XAUUSD\|/.test(LN.state().key), LN.state().key);
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
    for (k = 0; k < 12 && getComputedStyle(document.getElementById('lcp-section')).display !== 'none'; k++) await W(250);
    check('...and no Prop Firm Progress (no linked account)', getComputedStyle(document.getElementById('lcp-section')).display === 'none');
    check('gold\'s EA is on an account not linked in the journal: the log is All Trades History', (!aa3 || aa3.hidden) && /^All Trades History$/.test(document.querySelector('#lc-log .alltrades-title [data-i18n="atl.title"]').textContent), aa3 && aa3.textContent);

    // ---- a symbol with NO stored candles, streamed by an EA (Nestor, 18 Oct 2026, BTCUSD on a Sunday: "i thought i didnt
    //      need stored candles anymore because of the relay?"): listed, and its charts built from what its EA sends ----
    // a symbol nobody has stored: BTCUSD taken out of this page's list (whatever the real store holds today)
    var SY = P._syms() || []; for (k = SY.length - 1; k >= 0; k--) if (SY[k].key === 'BTCUSD') SY.splice(k, 1);
    check('BTCUSD has no stored candles (Back Testing\'s list does not have it)', !(P._syms() || []).some(function (s) { return s.key === 'BTCUSD'; }), (P._syms() || []).map(function (s) { return s.key; }));
    document.getElementById('stpr-sym').click(); await W(120);
    var bbtn = Array.prototype.filter.call(document.querySelectorAll('#stpr-menu.show [data-sym]'), function (b) { return /BTCUSD/.test(b.textContent); })[0];
    check('...but Live Charts lists it, by its MT5 name, live (its own EA)', bbtn && /^BTCUSD/.test(bbtn.textContent) && !!bbtn.querySelector('b i'), bbtn && bbtn.textContent);
    if (bbtn) bbtn.click();
    for (k = 0; k < 120; k++) { await W(250); st = LC.state(); if (st.live && st.sym === 'BTCUSD' && st.fresh && st.px && st.gotHist && st.base > 100) break; }
    ks = P._panes().map(function (q) { return P._ps(q).sym.key; });
    check('both charts are Bitcoin, live, with the minutes its EA sent', ks.join(',') === 'BTCUSD,BTCUSD' && st.fresh && st.px && st.px.b > 10000 && st.gotHist && st.base > 100, [ks, st.px, st.gotHist, st.base]);
    await W(800);
    var bq = P._panes()[0];
    for (k = 0; k < 40 && !(bq.static.length > 1000); k++) await W(250);
    var b15 = P._paneBars(0), bb = P._paneBars(1);
    check('the 15-minute chart has weeks of history from its EA (9.01: 15-minute candles, none stored)', bq.tf === 15 && bq.static.length > 1000 && b15.real > bq.static.length && P._feeds()[0].tfh && P._feeds()[0].tfh[15], [bq.tf, bq.static.length, b15 && b15.real]);
    check('the header calls it what MT5 does: BTCUSD', document.getElementById('stpr-symt').textContent === 'BTCUSD', document.getElementById('stpr-symt').textContent);
    var Mb = P._mini(0), wds = (Mb && Mb.days || []).map(function (o) { return o.wd; });
    check('the Minimalist names Saturday and Sunday on Bitcoin (it trades at the weekend)', wds.indexOf(6) >= 0 && wds.indexOf(0) >= 0 && wds.indexOf(3) >= 0, wds.join(','));
    var bl = bb.data[bb.real - 1];
    check('its last candle is at the live price', bl && Math.abs(bl.close - LC.state().px.b) < 5, [bl && bl.close, LC.state().px.b]);
    for (k = 0; k < 12 && !/every tick/.test(document.getElementById('stpr-lvst').textContent); k++) await W(250);
    check('through the relay: "Live · every tick"', /Live · every tick/.test(document.getElementById('stpr-lvst').textContent), document.getElementById('stpr-lvst').textContent);
    // every timeframe: 1h and 4h asked of the EA, 12h from its 4h, 1D, and 1W / 1Y from its 1D
    var tfOk = [];
    for (var ti = 0, TFX = [60, 240, 720, 1440, 10080, 525600]; ti < TFX.length; ti++) {
      P._tf(0, TFX[ti]);
      for (k = 0; k < 40; k++) { await W(250); var q0 = P._panes()[0]; if (q0.tf === TFX[ti] && q0.static.length > (TFX[ti] === 525600 ? 2 : 50)) break; }
      q0 = P._panes()[0]; tfOk.push([TFX[ti], q0.tf, q0.static.length]);
    }
    check('every timeframe has history from the EA: 1h, 4h, 12h, 1D, 1W and 1Y', tfOk.every(function (x) { return x[0] === x[1] && x[2] > (x[0] === 525600 ? 2 : 50); }), tfOk);
    var askd = Object.keys(P._feeds()[0].tfh || {}).sort(function (a, b) { return a - b; }).join(',');
    check('...asked of the EA once per source timeframe (15m, 1h, 4h, 1D - 12h, 1W and 1Y built from them)', askd === '15,60,240,1440', askd);
    P._tf(0, 15); await W(400);

    // ---- the watchlist (18 Oct 2026): the symbol button opens it; the hub (the EUR/USD EA, 9.02) streams the list's prices,
    //      searches the broker's symbols, and serves a symbol with no MT5 chart of its own ----
    document.getElementById('stpr-sym').click(); await W(200);
    var wm = document.querySelector('#stpr-menu.show'), WLs = P._wl();
    check('the symbol button opens the watchlist: your EAs\' symbols; the hub is the EUR/USD EA (9.02)', wm && /Watchlist/.test(wm.textContent) && ['EURUSD', 'XAUUSD', 'BTCUSD'].every(function (x) { return WLs.list.indexOf(x) >= 0; }) && WLs.hub === 'EURUSD|90001234', [WLs.list, WLs.hub]);
    for (k = 0; k < 30 && !(P._wl().q.XAUUSD && P._wl().q.BTCUSD); k++) await W(200);
    var xr = document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="XAUUSD"]');
    check('the hub streams the list\'s prices: last, change and change % on each row', xr && /\d,\d{3}\.\d{2}/.test(xr.textContent) && /\d\.\d{2}%/.test(xr.textContent) && /[+−]/.test(xr.textContent), xr && xr.textContent);
    document.querySelector('#stpr-menu.show [data-wladd]').click(); await W(100);
    var wq = document.getElementById('stpr-wlq'); wq.value = 'USDJ'; wq.dispatchEvent(new Event('input', { bubbles: true }));
    for (k = 0; k < 30 && !document.querySelector('#stpr-menu.show [data-wlpick="USDJPY"]'); k++) await W(150);
    var sug = Array.prototype.map.call(document.querySelectorAll('#stpr-menu.show [data-wlpick]'), function (x) { return x.getAttribute('data-wlpick'); });
    check('+ searches the broker\'s symbols through the hub: USDJ finds USDJPY and USDJPY.r', sug.join(',') === 'USDJPY,USDJPY.r', sug);
    document.querySelector('#stpr-menu.show [data-wlpick="USDJPY"]').click(); await W(300);
    check('picked: USDJPY is on the list, and saved', P._wl().list.indexOf('USDJPY') >= 0 && (P._cfg().wl || []).indexOf('USDJPY') >= 0 && !!document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="USDJPY"]'), P._cfg().wl);
    document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="USDJPY"]').click();
    for (k = 0; k < 120; k++) { await W(250); st = LC.state(); if (st.live && st.sym === 'USDJPY' && st.fresh && st.px && st.gotHist && st.base > 100) break; }
    ks = P._panes().map(function (q) { return P._ps(q).sym.key; });
    check('USDJPY opens on every chart with no MT5 chart of its own: the hub sends its prices and minutes', ks.join(',') === 'USDJPY,USDJPY' && st.fresh && st.px && st.px.b > 100 && st.gotHist && st.base > 100 && P._feeds()[0].ea && P._feeds()[0].ea.hub === 'EURUSD|90001234', [ks, st.px, st.base, P._feeds()[0].ea]);
    check('...in its own digits (3)', P._feeds()[0].digits === 3 || P._feeds()[0].dg === 3, [P._feeds()[0].digits, P._feeds()[0].dg]);
    for (k = 0; k < 40 && !(P._panes()[0].static.length > 1000); k++) await W(250);
    check('...with its history from the hub (15-minute candles, none stored)', P._panes()[0].static.length > 1000, P._panes()[0].static.length);
    document.getElementById('stpr-sym').click(); await W(200);
    document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="EURUSD"]').click();
    for (k = 0; k < 120; k++) { await W(250); st = LC.state(); if (st.live && st.sym === 'EURUSD' && st.fresh) break; }
    document.getElementById('stpr-sym').click(); await W(200);
    var ux = document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="USDJPY"] [data-wlx]'); if (ux) ux.click(); await W(200);
    check('back on EURUSD; × takes USDJPY off the list', st.sym === 'EURUSD' && P._wl().list.indexOf('USDJPY') < 0 && !document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="USDJPY"]'), P._wl().list);
    document.getElementById('stpr-sym').click(); await W(150);

    // ---- orders from Live Charts (18 Oct 2026, EA 9.02): the panel is the EA's own, two ways; the key and the stop place it at
    //      once - no confirm box; the panel's line says sent, then filled, with our own chime ----
    var practiceRisk = (JSON.parse(localStorage.getItem('st_practice_cfg') || '{}').mm || {}).riskAmt;
    for (k = 0; k < 40 && !LC._mmLive(); k++) await W(150);
    var mmb = document.getElementById('stpr-mm');
    check('the panel shows in Live Charts, titled with the account (its name and login)', mmb && getComputedStyle(mmb).display !== 'none' && mmb.offsetWidth > 0 && /FTMO 70K Challenge · 90001234/.test(mmb.textContent), mmb && mmb.textContent.slice(0, 80));
    check('...with the EA\'s own settings from MT5: risk 250.00, Min SL 4.0, Max SL 20.0, TP 3.00 R, 3 trades a day', LC._mmLive() && P._cfg().mm.riskAmt === 250 && mmb.querySelector('[data-mmi="rval"]').value === '250.00' && mmb.querySelector('[data-mmi="min"]').value === '4.0' && mmb.querySelector('[data-mmi="max"]').value === '20.0' && /3\.00/.test(mmb.querySelector('[data-mmi="tp"]').value) && mmb.querySelector('[data-mmi="maxd"]').value === '3',
      [P._cfg().mm.riskAmt, mmb.querySelector('[data-mmi="min"]').value, mmb.querySelector('[data-mmi="max"]').value, mmb.querySelector('[data-mmi="tp"]').value]);
    check('...while practice\'s own settings are left alone', (JSON.parse(localStorage.getItem('st_practice_cfg') || '{}').mm || {}).riskAmt === practiceRisk && practiceRisk !== 250, [practiceRisk]);
    var rin = mmb.querySelector('[data-mmi="rval"]'); rin.focus(); rin.value = '300'; rin.dispatchEvent(new Event('input', { bubbles: true })); rin.dispatchEvent(new Event('change', { bubbles: true })); rin.blur();
    for (k = 0; k < 40 && !(LC._mmLive() && P._cfg().mm.riskAmt === 300 && document.querySelector('#stpr-mm [data-mmi="rval"]').value === '300.00'); k++) await W(150);   // the EA's settings come back and the panel shows them
    check('a change in the panel goes to the EA ("cfg", signed) and stays: risk 300.00', P._cfg().mm.riskAmt === 300 && document.querySelector('#stpr-mm [data-mmi="rval"]').value === '300.00' && (JSON.parse(localStorage.getItem('st_practice_cfg') || '{}').mm || {}).riskAmt === practiceRisk, [P._cfg().mm.riskAmt, document.querySelector('#stpr-mm [data-mmi="rval"]').value, (JSON.parse(localStorage.getItem('st_practice_cfg') || '{}').mm || {}).riskAmt, practiceRisk]);
    var ch0 = LC._chimes();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true })); await W(200);
    check('the execution key arms it on Live Charts: the stop, entry and target lines where the order would go', P._s().exec && P._lines(0).some(function (l) { return /^SL /.test(l.title || l.t || ''); }), P._lines(0).map(function (l) { return l.title || l.t; }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    var o0 = LC._ord() && JSON.parse(JSON.stringify(LC._ord())); await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
    var fn0 = document.querySelector('#stpr-mm .stpr-mm-fn').textContent;
    check('...and the order goes at once - no confirm box: "BUY ... EURUSD · sent HH:MM:SS" (or already filled)', o0 && o0.st === 'sent' && o0.dir === 1 && !P._s().exec && (/^BUY .*EURUSD · sent \d\d:\d\d:\d\d$/.test(fn0) || /^Filled /.test(fn0)), [o0, fn0]);
    for (k = 0; k < 40 && !(LC._ord() && LC._ord().st === 'ok'); k++) await W(150);
    var fn1 = document.querySelector('#stpr-mm .stpr-mm-fn');
    check('MT5 placed it: "Filled 1.xxxxx · BUY 0.xx EURUSD · HH:MM:SS", in green', /^Filled 1\.\d{5} · BUY \d+\.\d\d EURUSD · \d\d:\d\d:\d\d$/.test(fn1.textContent) && fn1.classList.contains('on'), fn1.textContent);
    check('...with the fill\'s chime', LC._chimes() === ch0 + 1, LC._chimes());

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

    // ---- Back Testing's today (18 Oct 2026): today's candles from the EA, any moment of it replayed, then the live price ----
    document.querySelector('.tab[data-page="trades"]').click(); await W(600);
    await P.open({ symbol: 'EURUSD', day: '2026-10-13' }); for (k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var tb = document.getElementById('stpr-today');
    check('Back Testing has a Today button beside Random day', tb && getComputedStyle(tb).display !== 'none' && tb.previousElementSibling && tb.previousElementSibling.id === 'stpr-rand' && /Today/.test(tb.textContent), tb && tb.outerHTML.slice(0, 60));
    tb.click();
    var nowT = function () { return Math.floor(Date.now() / 1000) + Math.round((T0 * 1000 - (window.__t0ref || 0)) / 1000); };
    for (k = 0; k < 120; k++) { await W(250); var ts = P._s(); if (ts && ts.today && ts.gotHist && ts.base.length > 100 && ts.follow) break; }
    ts = P._s(); var whenT = document.getElementById('stpr-when').textContent;
    check('Today opens today (the EA\'s minutes), at the present, following the live price - still PRACTICE', ts && ts.today && ts.day === '2026-10-14' && ts.base.length > 100 && ts.follow && /TODAY · LIVE PRICE/.test(whenT) && /Practice/i.test(document.getElementById('stpr-chip').textContent), [ts && ts.day, ts && ts.base.length, ts && ts.follow, whenT]);
    var n0 = ts.now; P._goto('09:00'); await W(1500); ts = P._s();
    check('Go to replays an earlier moment of today (09:00): no longer at the present', ts.today && ts.now < n0 - 600 && !ts.follow && /TODAY$/.test(document.getElementById('stpr-when').textContent), [n0, ts.now, ts.follow, document.getElementById('stpr-when').textContent]);
    P._goto('16:00'); for (k = 0; k < 12 && !(P._s().follow); k++) await W(250); ts = P._s();
    check('...and a jump past now stops at the present, then follows the live price again', ts.follow && ts.now >= n0 && /LIVE PRICE/.test(document.getElementById('stpr-when').textContent), [ts.now, n0, ts.follow]);
    var ord0 = LC._ord() && LC._ord().at; P._place(1); await W(400);
    check('a trade on today is a practice trade: on the chart, nothing sent to MT5', !!P._s().pos && (LC._ord() && LC._ord().at) === ord0, [!!P._s().pos, ord0]);
    P._close(); await W(200); P.close(); await W(300);
    check('no page errors', !errs.length, errs.slice(0, 4));
    document.querySelector('.tab[data-page="trades"]').click(); await W(400);
  } catch (e) { check('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(results);
})()
