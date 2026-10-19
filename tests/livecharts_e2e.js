// End-to-end test: Live Charts (17 Oct 2026, Nestor: "the mock up is good build live charts now"), through the real app,
// the real Supabase Realtime and two stand-in EA 9.00 charts on a throwaway channel (EUR/USD on account 90001234, gold on
// 90005678). Also: chart 2 on its own symbol, one toolbar row, the window fitting the screen, and Prop Firm Progress for
// the account chart 1's EA is on (no trade log under the charts since 18 Oct 2026).
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
    check('a Charts tab after Session Review (Live Charts + Replay, 19 Oct 2026)', tab && document.querySelector('.tab[data-page="review"]').nextElementSibling === tab && /Charts/.test(tab.textContent) && !/Live Charts/.test(tab.textContent), tab && tab.textContent);
    var chipEl = document.getElementById('stpr-chip'), chipSeen = [], chipRec = function () { var v = chipEl.className + '|' + chipEl.textContent; if (chipSeen[chipSeen.length - 1] !== v) chipSeen.push(v); };
    var chipObs = new MutationObserver(chipRec); chipObs.observe(chipEl, { attributes: true, childList: true, characterData: true, subtree: true });
    tab.click(); chipRec(); await W(400);
    var win = document.getElementById('stpr-win');
    check('opened: its page shows, titled Charts; the chart window is in it, live', document.getElementById('page-livecharts').classList.contains('active') && document.getElementById('header-mode').textContent === 'Charts' && win.parentNode.id === 'lc-host' && win.classList.contains('lc'),
      [document.getElementById('header-mode').textContent, win.parentNode.id, win.className]);
    // ---- one Charts tab: Live | Replay (Nestor, 19 Oct 2026: TradingView's Replay; a confirm on every swap) ----
    for (var rk0 = 0; rk0 < 80 && !(P._s() && P._s().live); rk0++) await W(150);   // live loaded first
    var chipKeep = chipSeen.slice();   // the label's own check (below) is about loading Live; this swap to Replay and back is not
    var lcm = document.getElementById('lc-mode'), mbtn = function (m) { return lcm.querySelector('[data-lcm="' + m + '"]'); }, askEl = function () { return document.getElementById('lc-ask-bg'); };
    await W(800);
    check('the switch over the charts: Live (on, green) | Replay (TradingView\'s rewind icon), and the line under it', !lcm.hidden && mbtn('live').classList.contains('on') && !mbtn('replay').classList.contains('on') && mbtn('replay').querySelector('svg.lc-rw') && /Replay/.test(mbtn('replay').textContent) && /MT5 prices/.test(document.getElementById('lc-msub').textContent), lcm.textContent);
    mbtn('replay').click(); await W(150);
    check('Replay asks first: "Switch to Replay?" - live charts stop, practice trades only - Stay on Live / Switch to Replay', askEl() && /Switch to Replay\?/.test(askEl().textContent) && /nothing is sent to MT5/.test(askEl().textContent) && /Stay on Live/.test(askEl().textContent), askEl() && askEl().textContent);
    askEl().querySelector('[data-lca="0"]').click(); await W(300);
    check('...Stay on Live: nothing changes', !askEl() && P._s() && P._s().live && mbtn('live').classList.contains('on'));
    mbtn('replay').click(); await W(150); askEl().querySelector('[data-lca="1"]').click();
    for (var rk = 0; rk < 80 && !(P._s() && !P._s().live && P._panes().length && P._panes()[0].n); rk++) await W(150);
    await W(800);
    var rch = document.getElementById('stpr-chip');
    check('Switch to Replay: a past day in the same window (REPLAY label, its day and play bar), the switch on Replay, MT5\'s Toolbox put away', P._s() && !P._s().live && win.parentNode.id === 'lc-host' && win.classList.contains('lcp') && rch.textContent === 'Replay' && mbtn('replay').classList.contains('on') && getComputedStyle(document.getElementById('lc-tb')).display === 'none' && getComputedStyle(document.querySelector('.stpr-cb')).display !== 'none', [rch.textContent, win.className]);
    mbtn('live').click(); await W(150);
    check('Live asks too: "Switch to Live?" - Stay in Replay / Switch to Live', askEl() && /Switch to Live\?/.test(askEl().textContent) && /Stay in Replay/.test(askEl().textContent), askEl() && askEl().textContent);
    askEl().querySelector('[data-lca="1"]').click();
    for (rk = 0; rk < 80 && !(P._s() && P._s().live && LC.state().fresh); rk++) await W(250);
    check('...Switch to Live: the live charts again, the switch on Live', P._s() && P._s().live && win.classList.contains('lc') && mbtn('live').classList.contains('on'), P._s() && P._s().live);
    chipSeen.splice(0, chipSeen.length); Array.prototype.push.apply(chipSeen, chipKeep);
    var st = null;
    for (var k = 0; k < 100; k++) { await W(200); st = LC.state(); if (st.live && st.panes === 2) break; }
    check('two charts, EUR/USD, on today\'s (the clock\'s) trading day', st && st.live && st.panes === 2 && st.sym === 'EURUSD', st);
    check('no trade log under the charts ("yes remove it", 18 Oct 2026) - All Trades History stays in the Calendar', !document.querySelector('#page-livecharts .alltrades-wrap') && !!document.querySelector('#page-tradeview .alltrades-wrap'));
    for (k = 0; k < 40 && !document.getElementById('stpr-laybtn'); k++) await W(100);
    var tb1 = document.querySelector('#stpr-win > .stpr-tb:not(.stpr-tb2)'), lbt = document.getElementById('stpr-laybtn');
    check('one toolbar row: the Charts button at its right, before the object tree, no "Charts" word', getComputedStyle(tb1).display === 'none' && lbt && document.getElementById('stpr-tb2').contains(lbt) && lbt.parentNode.nextElementSibling && lbt.parentNode.nextElementSibling.id === 'stpr-treebtn' && !document.getElementById('stpr-laylbl'), [getComputedStyle(tb1).display, lbt && lbt.parentNode.parentNode.id]);
    await W(600); var wr = win.getBoundingClientRect(), tbs = document.querySelector('.tabs').getBoundingClientRect();
    check('the whole window fits the screen under the tabs (charts, the live bar, the clock), scrolled into place', wr.height <= window.innerHeight - tbs.height && wr.bottom <= window.innerHeight + 2 && wr.top >= tbs.bottom - 2, [Math.round(tbs.bottom), Math.round(wr.top), Math.round(wr.bottom), window.innerHeight]);
    check('the replay\'s own controls are not there (no Replay either); the live bar is', !document.getElementById('stpr-rand') && getComputedStyle(document.querySelector('.stpr-cb')).display === 'none'
      && getComputedStyle(document.getElementById('stpr-lvrp')).display === 'none' &&getComputedStyle(document.getElementById('stpr-lvbar')).display !== 'none');

    // ---- the line: joined, the EA says hi, the charts ask for the day's minutes, prices flow ----
    for (k = 0; k < 120; k++) { await W(250); st = LC.state(); if (st.ea && st.gotHist && st.fresh) break; }
    for (k = 0; k < 20 && LN.state().px < 2; k++) await W(250);   // the second price too
    var ls = LN.state();
    check('joined the channel; the EA said which chart it runs on (EUR/USD, 9.03, account 90001234 - the one on the relay)', ls.joined && st.ea && st.ea.raw === 'EURUSD' && st.ea.v === '9.03' && String(st.ea.lg) === '90001234', [ls.joined, st.ea]);
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
    chipObs.disconnect();
    check('LIVE from the first frame while it loads - never Practice\'s pink ("for a split second the practice pink button")', chipSeen.length > 0 && chipSeen.every(function (v) { return /\blv(off)?\b/.test(v) && !/Practice/i.test(v); }), chipSeen);
    check('the header: LIVE (green) and "Your MT5 prices"', document.getElementById('stpr-chip').classList.contains('lv') && /Live/.test(document.getElementById('stpr-chip').textContent) && document.getElementById('stpr-when').textContent === 'Your MT5 prices',
      [document.getElementById('stpr-chip').className, document.getElementById('stpr-when').textContent]);
    var cd = document.querySelectorAll('#lc-host .stpr-cdb');
    var cdl = [P._axl(0), P._axl(1)].filter(Boolean).map(function (o) { return { textContent: o.t }; });   // the chart's own label on its price scale (19 Oct 2026)
    check('each chart: the spread alone bottom right ("Spread 0.7p"), the candle\'s time left under the price on the scale (MM:SS)', cd.length === 2 && /^Spread 0\.7p$/.test(cd[0].textContent) && /^Spread 0\.7p$/.test(cd[1].textContent) && cdl.length === 2 && /^\d\d:\d\d$/.test(cdl[0].textContent) && /^0[01]:\d\d$/.test(cdl[1].textContent), [cd.length, cd[0] && cd[0].textContent, cdl.length, cdl[0] && cdl[0].textContent, cdl[1] && cdl[1].textContent]);
    check('the candle timer takes the price label\'s place on the scale (no last-price label while it counts)', P._lvv().length === 2 && P._lvv().every(function (v) { return v === false; }), P._lvv());
    // ---- the Assistant's line above the charts (19 Oct 2026): fixed sentences, the first that applies ----
    var lg = document.querySelector('#page-livecharts .bias-greeting[data-greeting-context="livecharts"]');
    for (k = 0; k < 30 && !(lg && lg.textContent.trim()); k++) await W(200);
    check('the Assistant\'s line shows above the charts, and with the EA streaming it is not the "start the EA" line', lg && lg.offsetHeight > 0 && lg.textContent.trim().length > 10 && !/come alive/.test(lg.textContent), lg && lg.textContent);
    var gi0 = window.__stLC.greetInfo, gtx = function (o) { window.__stLC.greetInfo = function () { return o; }; window.__stLiveGreet(); return lg.textContent; };
    var g0 = gtx(null), g1 = gtx({ sym: 'EURUSD', ea: false }), g2 = gtx({ sym: 'EURUSD', ea: true, closed: true, dayName: 'Friday' });
    window.__stLC.greetInfo = gi0; window.__stLiveGreet();
    check('...still loading: a neutral "Your MT5 prices, live."', g0 === 'Your MT5 prices, live.', g0);
    check('...no EA: "Your charts come alive when the EA runs ... Open it on EURUSD"; market closed: "Markets are closed: the charts show Friday\'s session"', /come alive when the EA runs/.test(g1) && /Open it on EURUSD/.test(g1) && /^Markets are closed: the charts show Friday.s session\. Replay, in the Charts tab, is open/.test(g2), [g1, g2]);
    check('...it is never rewritten (no AI): after a while it is still one of the fixed lines', (await W(1500), !/come alive/.test(lg.textContent) && lg.textContent.trim().length > 10), lg.textContent);
    // chart 1's row (19 Oct 2026: "move these 2 around ... make the asset watchlist and the EA boxes sit at same height")
    var tlp = document.querySelector('#lc-host .stpr-tlp'), tlb = tlp && Array.prototype.filter.call(tlp.children, function (x) { return x.tagName === 'BUTTON'; }),
        mmx = document.querySelector('#lc-host .stpr-tl .stpr-mm'), mmt = mmx && mmx.querySelector('.stpr-mm-t');
    var rq = function (e) { var r = e.getBoundingClientRect(); return [Math.round(r.top * 10) / 10, Math.round(r.bottom * 10) / 10]; };
    var rTf = tlb && tlb[0] && rq(tlb[0]), rSy = tlb && tlb[1] && rq(tlb[1]), rMm = mmx && rq(mmx), rMt = mmt && rq(mmt);
    check('chart 1: the timeframe first, then the symbol, then the panel', tlb && tlb.length === 2 && tlb[0].classList.contains('stpr-tfpill') && tlb[1].classList.contains('stpr-sympill') && tlp.nextElementSibling && tlp.parentNode.contains(mmx), tlb && tlb.map(function (x) { return x.className; }));
    check('...level with the panel box: the same top and the same height as its title bar', rTf && rSy && rMm && rMt && Math.abs(rTf[0] - rMm[0]) <= 0.6 && Math.abs(rSy[0] - rMm[0]) <= 0.6 && Math.abs(rSy[1] - (rMt[1] + 1)) <= 0.6, { tf: rTf, sym: rSy, panel: rMm, title: rMt });
    var tbx0 = document.getElementById('lc-tb');
    var gaps = [], prevAt = LC.state().at; for (k = 0; k < 40; k++) { await W(80); var a2 = LC.state().at; if (a2 !== prevAt) { gaps.push(a2 - prevAt); prevAt = a2; } }
    check('every tick: several a second over the relay', gaps.length >= 5 && gaps.filter(function (g) { return g < 300; }).length >= gaps.length * 0.6, gaps);

    // ---- the account chart 1's EA is on (its login in the EA's "hi") ----
    for (k = 0; k < 20 && getComputedStyle(document.getElementById('lcp-section')).display === 'none'; k++) await W(250);
    var pfp = document.getElementById('lcp-section');
    check('under the Toolbox, Prop Firm Progress for that account (Statistics\' card): its target and its room to the floor', getComputedStyle(pfp).display !== 'none' && /Prop Firm Progress/.test(pfp.textContent) && /FTMO 70K Challenge/.test(pfp.textContent) && /Profit target/.test(pfp.textContent) && /Room to the floor/.test(pfp.textContent) && document.getElementById('lc-tb').nextElementSibling.id === 'lc-pfp', pfp.textContent.slice(0, 200));

    // ---- each chart its own symbol (18 Oct 2026: "give every chart the oportunity to be a different asset ... also for live charts"):
    // ---- chart 2 on gold, whose EA runs on another account (90005678, on Supabase) ----
    var lcPills = function () { return Array.prototype.map.call(document.querySelectorAll('#lc-host .stpr-sympill'), function (x) { return x.textContent; }).join(','); };
    var lcKeys = function () { return P._panes().map(function (q) { return P._ps(q).sym.key; }).join(','); };
    check('each chart has its own symbol button in Live Charts too', lcPills() === 'EURUSD,EURUSD', lcPills());
    document.querySelectorAll('#lc-host .stpr-sympill')[1].click(); await W(300);
    var lm2 = document.querySelector('#stpr-menu.show'), lg2 = lm2 && lm2.querySelector('.stpr-wlr[data-sym="XAUUSD"][data-si="1"]');
    check('...chart 2\'s opens the watchlist for chart 2, gold in it', !!lg2 && /Chart 2 · watchlist/.test(lm2.textContent), lm2 && lm2.textContent.slice(0, 100));
    lg2.click();
    for (k = 0; k < 80; k++) { await W(250); var pb2 = P._paneBars(1); if (lcKeys() === 'EURUSD,XAUUSD' && pb2 && pb2.real > 5 && pb2.data[pb2.real - 1].close > 100) break; }
    var pb2b = P._paneBars(1);
    check('chart 2 shows gold live from its own EA, chart 1 stays EURUSD', lcKeys() === 'EURUSD,XAUUSD' && pb2b.real > 5 && pb2b.data[pb2b.real - 1].close > 100 && LC.state().px.b < 2 && lcPills() === 'EURUSD,XAUUSD', [lcKeys(), pb2b.real, pb2b.data[pb2b.real - 1], lcPills()]);
    for (k = 0; k < 40 && !/^\d+\|EURUSD,XAUUSD\|/.test(LN.state().key); k++) await W(250);
    check('...the line watches both symbols and names no account (two accounts\' EAs: each stays on, their prices say whose they are)', /^\d+\|EURUSD,XAUUSD\|/.test(LN.state().key) && /\|$/.test(LN.state().key), LN.state().key);
    document.querySelectorAll('#lc-host .stpr-sympill')[1].click(); await W(300);
    document.querySelector('#stpr-menu.show .stpr-wlr[data-sym="EURUSD"][data-si="1"]').click();
    for (k = 0; k < 60 && !(lcKeys() === 'EURUSD,EURUSD' && /\|90001234$/.test(LN.state().key)); k++) await W(250);
    check('...and back: both charts EURUSD, the line names its account again', lcKeys() === 'EURUSD,EURUSD' && /\|90001234$/.test(LN.state().key), [lcKeys(), LN.state().key]);
    var lsb = document.getElementById('stpr-sym').getBoundingClientRect(), lcb = document.getElementById('stpr-chip').getBoundingClientRect();
    check('LIVE is exactly as tall as the symbol button beside it', Math.abs(lsb.height - lcb.height) < 0.5 && Math.abs(lsb.top - lcb.top) < 1, [lsb.height, lcb.height]);

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
    check('Live Charts shows the open trade with MT5 connected, Move to BE and Close trade (no Close 50%) - no SELL / symbol / R label in front ("i have the toolbox to get this information")', bar && !/SELL/.test(bar.textContent) && bar.querySelector('.stpr-lvtr[data-side="sell"]') && /MT5 connected/.test(bar.textContent) && tb('close') && !tb('close').disabled && /Close trade/.test(tb('close').textContent) && tb('tobe') && tb('tobe').nextElementSibling === tb('close') && !tb('half'), bar && bar.textContent);
    // drag the SL line on the chart: a confirm box, then MT5
    var sl0 = P._lines(0).filter(function (l) { return l.k === 'lt|990077|sl|'; })[0], pane0 = P._panes()[0], pc0 = pane0.el.querySelector('.stpr-pc'), rc0 = pc0.getBoundingClientRect();
    check('the trade\'s SL line can be dragged (and the entry cannot)', !!sl0 && !P._lines(0).some(function (l) { return /^Entry/.test(l.title) && l.k; }), P._lines(0));
    var ySL = pane0.series.priceToCoordinate(sl0.p), pev = function (t, y) { pc0.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerType: 'mouse', pointerId: 7, button: 0, buttons: t === 'pointerup' ? 0 : 1, clientX: rc0.left + 160, clientY: rc0.top + y })); };
    pev('pointerdown', ySL); pev('pointermove', ySL - 20); pev('pointermove', ySL - 40); pev('pointerup', ySL - 40);
    var want = pane0.series.coordinateToPrice(ySL - 40); await W(120);   // the price where it was let go (the scale may move after)
    var box = pane0.el.querySelector('.stpr-tmc');
    check('let go: "Move SL to <price> in MT5?" with Move and Cancel; the line waits where it was let go', box && box.style.display === 'flex' && /Move SL to \d\.\d{5} in MT5\?/.test(box.textContent) && Math.abs(P._lines(0).filter(function (l) { return l.k === 'lt|990077|sl|'; })[0].p - want) < 0.00002, box && box.textContent);
    box.querySelector('[data-tmc="1"]').click();
    for (k = 0; k < 40 && !(TM.last(990077) && TM.last(990077).a === 'sl'); k++) await W(150);
    await W(150);
    var lsl = TM.last(990077);
    check('Move: MT5 moved it (the EA checked the signature), the app says so', lsl && lsl.ok && lsl.a === 'sl' && Math.abs(+lsl.p - want) < 0.00002 && /SL moved to/.test(document.getElementById('stpr-flash').textContent), [lsl, document.getElementById('stpr-flash').textContent]);
    pev('pointerdown', pane0.series.priceToCoordinate(P._lines(0).filter(function (l) { return l.k === 'lt|990077|sl|'; })[0].p)); pev('pointermove', ySL + 30); pev('pointerup', ySL + 30); await W(120);
    box.querySelector('[data-tmc="0"]').click(); await W(120);
    check('Cancel: nothing is sent and the line goes back', TM.last(990077).a === 'sl' && !TM.busy(990077) && box.style.display === 'none', TM.last(990077));
    // Move to BE (19 Oct 2026: "next to close trade add button move to BE"): the stop to where the EA's own BE puts it
    var r0 = ((window.__stLive.openIdeas().filter(function (i) { return String(i.main.ticket) === '990077'; })[0]) || {}).main;
    var mkR = function (o) { return Object.assign({}, r0, { tick: Object.assign({}, r0 && r0.tick, { op: 1.12433, rpx: 0.00045, dg: 5 }, o, { at: Date.now() }) }); };
    var tbOf = function (h) { var dv = document.createElement('div'); dv.innerHTML = h; return dv.querySelector('[data-tma="tobe"]'); };
    var bLoss = tbOf(TM.row(mkR({ r: -0.3, sl: -1, lad: 'B:1.82:0.11:0' }))), bWin = tbOf(TM.row(mkR({ r: 1.5, sl: -1, lad: 'B:1.82:0.11:0' }))), bAt = tbOf(TM.row(mkR({ r: 1.5, sl: 0.11, lad: '' })));
    check('Move to BE: off while the price has not passed break-even, on once it has (to the EA\'s BE: entry + 0.11R), "At BE" once the stop is there',
      bLoss && bLoss.disabled && /pass break-even/.test(bLoss.title) && bWin && !bWin.disabled && /1\.12428/.test(bWin.title) && bAt && bAt.disabled && /^At BE$/.test(bAt.textContent), [bLoss && bLoss.outerHTML, bWin && bWin.outerHTML, bAt && bAt.outerHTML]);
    var rBE = await TM.send(mkR({ r: 1.5, sl: -1, lad: 'B:1.82:0.11:0' }), 'tobe');
    var lbe = TM.last(990077);
    check('...pressed: MT5 moves the stop to 1.12428 (the EA\'s SL move, signed), the button says "Moved to BE HH:MM"', rBE && rBE.ok && lbe && lbe.a === 'tobe' && lbe.p === '1.12428' && /^Moved to BE \d\d:\d\d$/.test((tbOf(TM.row(mkR({ r: 1.5, sl: 0.11, lad: '' }))) || {}).textContent || ''), [rBE, lbe]);
    var rNo = await TM.send(mkR({ r: -0.3, sl: -1, lad: 'B:1.82:0.11:0' }), 'tobe');
    check('...and nothing is sent while the price is short of break-even', rNo && !rNo.ok && rNo.why === 'notbe', rNo);
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
    check('a trade on an EA with managing off: "Off in your EA", the buttons off, and where to switch it on', gb.querySelector('.stpr-lvtr[data-side="buy"]') && /Off in your EA/.test(gb.textContent) && gb.querySelector('[data-tma="close"]').disabled && /App trading/.test(gb.textContent) && /Session Terminal Sync/.test(gb.textContent), gb.textContent);
    for (k = 0; k < 12 && getComputedStyle(document.getElementById('lcp-section')).display !== 'none'; k++) await W(250);
    check('...and no Prop Firm Progress (no linked account)', getComputedStyle(document.getElementById('lcp-section')).display === 'none');

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
    var mbody = mmb.querySelector('.stpr-mm-b'), wev = function (dy) { var ev = new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true }); (mbody || mmb).dispatchEvent(ev); return ev.defaultPrevented; };
    if (mbody) mbody.scrollTop = 0;
    var wUpTop = wev(-120), canScroll = mbody && mbody.scrollHeight > mbody.clientHeight + 1, wDown = wev(120);
    if (mbody) mbody.scrollTop = mbody.scrollHeight; var wDownEnd = wev(120);
    check('the wheel over the panel never scrolls the page: kept at its top and its end, free in between', wUpTop && wDownEnd && (canScroll ? !wDown : wDown), [wUpTop, canScroll, wDown, wDownEnd]);
    if (mbody) mbody.scrollTop = 0;
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
    // ---- MT5's messages in the app (19 Oct 2026: "whatever messages appear in MT5 i need to also see them in the app") ----
    var emb = function () { return document.querySelector('#stpr-cw .stpr-eamsg'); };
    LC.emsg({ m: 'XAUUSD daily limit reached (3 trades). Paused until your next day.', sym: 'XAUUSD', lg: '90005678' }); await W(150);
    check('a message an EA wrote on its MT5 chart (9.06 "emsg") shows on the chart: who said it and its words, with an x', emb() && emb().classList.contains('show') && /MT5 · XAUUSD · 90005678/.test(emb().textContent) && /daily limit reached/.test(emb().textContent) && emb().querySelector('[data-emx]') && getComputedStyle(emb()).display === 'flex', emb() && emb().textContent);
    emb().querySelector('[data-emx]').click(); await W(100);
    check('...x closes it', !emb().classList.contains('show') && getComputedStyle(emb()).display === 'none');
    var aE = LN.easL()['EURUSD|90001234']; aE.al = false; await W(1300);
    check('Algo Trading off in MT5 (9.06 "al" in its hi): the chart says so at once, in red, and how to turn it on', emb().classList.contains('show') && emb().classList.contains('r') && /Algo Trading is off in MT5/.test(emb().textContent) && /turns green/.test(emb().textContent), emb().textContent);
    var ord1 = LC._ord(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true })); await W(200); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await W(300);
    check('...and an order is not sent: the reason stays on the chart (not only on the panel\'s last line)', LC._ord() === ord1 && /Algo Trading is off/.test(emb().textContent) && emb().classList.contains('show'), [LC._ord() === ord1, emb().textContent]);
    aE.al = true; await W(1300);
    check('...switched on in MT5: the warning goes by itself', !emb().classList.contains('show'));
    P._s().exec = false; P._s().pv = null; P._render();
    window.__stTM.whyTxt && check('MT5\'s own refusal reads plainly: "Trading not allowed - enable Algo Trading." -> how to turn it on', /Algo Trading button/.test(window.__stTM.whyTxt('Trading not allowed - enable Algo Trading.')), window.__stTM.whyTxt('Trading not allowed - enable Algo Trading.'));

    // ---- MT5's Toolbox under the charts (18 Oct 2026): Trade - the account and its positions, live; History - with commission ----
    var tbx = document.getElementById('lc-tb');
    for (k = 0; k < 40 && !(tbx && !tbx.hidden && tbx.querySelector('[data-lctbx="min"]')); k++) await W(250);
    tbx.querySelector('[data-lctbx="min"]').click(); await W(700);
    check('the Toolbox minimises to its tab row (-), and opens again (+)', !tbx.querySelector('.lctb-b') && tbx.querySelector('[data-lctbx="min"]').textContent === '+', tbx.textContent.slice(0, 60));
    tbx.querySelector('[data-lctbx="min"]').click(); await W(700);
    check('...back; and there is no x to hide it ("remove the option of the x in toolbox")', !tbx.hidden && !!tbx.querySelector('.lctb-b') && tbx.querySelectorAll('[data-lctbx]').length === 1 && !document.getElementById('stpr-tbshow'), tbx.querySelectorAll('[data-lctbx]').length);
    for (k = 0; k < 40 && !(tbx && !tbx.hidden && /555001/.test(tbx.textContent)); k++) await W(250);
    var tth = Array.prototype.map.call(tbx.querySelectorAll('th'), function (x) { return x.textContent; }).join('|');
    check('the Toolbox shows under the charts, MT5\'s Trade tab: Symbol | Ticket | Time | Type | Volume | Price | S / L | T / P | Price | Profit', !tbx.hidden && tth === 'Symbol|Ticket|Time|Type|Volume|Price|S / L|T / P|Price|Profit', tth);
    var sumT = (tbx.querySelector('.lctb-sum') || {}).textContent || '';
    check('...the order just placed (ticket 555001, buy), and MT5\'s line: Balance: 65 311.87 GBP  Equity  Free Margin', /555001/.test(tbx.textContent) && /buy/.test(tbx.textContent) && /Balance: 65 311\.87 GBP/.test(sumT) && /Equity: /.test(sumT) && /Free Margin: /.test(sumT), sumT);
    var tb1 = tbx.querySelector('.lctb-b');
    check('Trade: the box only as tall as its rows - no empty space, nothing to scroll ("the box can adapt to the amount of trades")', Math.abs(tb1.offsetHeight - tb1.querySelector('table').offsetHeight) <= 3 && tb1.scrollHeight <= tb1.clientHeight + 1, [tb1.offsetHeight, tb1.querySelector('table').offsetHeight]);
    var tbSt = [], tbObs = new MutationObserver(function () { tbSt.push(tbx.style.transition + '|' + tbx.style.height); }); tbObs.observe(tbx, { attributes: true, attributeFilter: ['style'] });
    var tbH0 = tbx.offsetHeight;
    tbx.querySelector('[data-lctb="hist"]').click();
    for (k = 0; k < 40 && !/870012/.test(tbx.textContent); k++) await W(150);
    await W(700); tbObs.disconnect();
    check('History opens with a slide (0.45 s, as the app\'s panels), then rests at its full height', tbSt.some(function (v) { return /height 0\.45s/.test(v) && /\d+px$/.test(v); }) && tbx.style.height === '' && tbx.offsetHeight > tbH0 + 100, [tbSt.slice(0, 6), tbx.style.height, tbH0, tbx.offsetHeight]);
    var hth = Array.prototype.map.call(tbx.querySelectorAll('th'), function (x) { return x.textContent; }).join('|'), hsum = (tbx.querySelector('.lctb-sum') || {}).textContent || '';
    var hrows = Array.prototype.filter.call(tbx.querySelectorAll('.lctb-t tr'), function (r, i) { return i > 0 && !r.classList.contains('lctb-sum'); });
    check('History: the closed trades with Commission and Swap, as MT5 shows them', /Commission\|Swap\|Profit$/.test(hth) && /880001/.test(tbx.textContent) && /-8\.75/.test(tbx.textContent) && /-0\.42/.test(tbx.textContent), hth);
    check('...ALL of the account\'s history, no periods to pick: 14 closed trades (sent in two parts), the last closed first', !tbx.querySelector('[data-lctbp]') && hrows.length === 14 && /880001/.test(hrows[0].textContent) && /870012/.test(hrows[13].textContent), [hrows.length, hrows[0] && hrows[0].textContent.slice(0, 40)]);
    check('...and MT5\'s line: Profit (after costs) · Deposit · Withdrawal · Balance', /Profit: -63\.97/.test(hsum) && /Deposit: 1 000\.00/.test(hsum) && /Balance: 65 311\.87/.test(hsum), hsum);
    var hb = tbx.querySelector('.lctb-b'), sumR = tbx.querySelector('.lctb-sum td').getBoundingClientRect(), hbR = hb.getBoundingClientRect();
    check('...the box shows the last 10 trades, the older ones a scroll down, MT5\'s line kept under them', hb.scrollHeight > hb.clientHeight + 20 && hrows[9].getBoundingClientRect().bottom <= sumR.top + 1 && hrows[10].getBoundingClientRect().top >= sumR.top - 1 && Math.abs(sumR.bottom - hbR.bottom) <= 2,
      [hb.clientHeight, hb.scrollHeight, Math.round(hrows[9].getBoundingClientRect().bottom), Math.round(sumR.top), Math.round(sumR.bottom), Math.round(hbR.bottom)]);
    hb.scrollTop = hb.scrollHeight; await W(150); sumR = tbx.querySelector('.lctb-sum td').getBoundingClientRect();
    check('...scrolled to the oldest: it shows, the line still under it', hrows[13].getBoundingClientRect().bottom <= sumR.top + 1 && hrows[13].getBoundingClientRect().top >= hbR.top && Math.abs(sumR.bottom - hbR.bottom) <= 2, [Math.round(hrows[13].getBoundingClientRect().bottom), Math.round(sumR.top)]);
    tbx.querySelector('[data-lctb="trade"]').click(); await W(200);
    var mmt = document.getElementById('stpr-mm').textContent;
    check('the panel has no Sound row now ("why did you add this in the panel? remove it")', !document.querySelector('#stpr-mm [data-mm="sndpick"]') && !/When filled/.test(mmt), mmt.slice(-200));
    // ---- the account picker (18 Oct 2026: "what would i do if i want to switch accounts to trade with?" - "yes"): a second
    // ---- account's EA on EUR/USD (90007777, 50 pips above); the panel's title lists both, the pick moves everything ----
    for (k = 0; k < 40 && LC._accs().length < 2; k++) await W(250);
    var nb = document.querySelector('#stpr-mm [data-mm="acct"]');
    check('two accounts run the EA on EUR/USD: the panel\'s account name is a picker (a small arrow)', nb && !!nb.querySelector('svg') && LC._accs().join() === '90001234,90007777', [LC._accs(), nb && nb.outerHTML.slice(0, 120)]);
    var pxA = LC.state().px.b; nb.click(); await W(1900);
    var am = document.getElementById('stpr-menu'), rowsA = am.querySelectorAll('[data-lvacc]');
    check('...it lists both - FTMO 70K Challenge · 90001234 (the one shown) and MT5 · 90007777 - after asking every EA to say hi', am.classList.contains('show') && rowsA.length === 2 && /FTMO 70K Challenge · 90001234/.test(am.textContent) && /MT5 · 90007777/.test(am.textContent) && am.querySelector('[data-lvacc="90001234"]').classList.contains('on') && /follow the account you pick/.test(am.textContent), am.textContent);
    am.querySelector('[data-lvacc="90007777"]').click();
    for (k = 0; k < 80; k++) { await W(250); st = LC.state(); if (st.live && st.ea && String(st.ea.lg) === '90007777' && st.fresh && st.px && Math.abs(st.px.b - (pxA + 0.005)) < 0.002) break; }
    var nm2 = (document.querySelector('#stpr-mm .stpr-mm-an') || {}).textContent || '';
    check('picking 90007777: the chart shows that account\'s prices (50 pips apart here), the panel its name, and it is remembered', st.ea && String(st.ea.lg) === '90007777' && st.px && Math.abs(st.px.b - (pxA + 0.005)) < 0.002 && /MT5 · 90007777/.test(nm2) && P._cfg().lvLg === '90007777', [st.ea, st.px, pxA, nm2]);
    check('...the line names that account ("lg" in watch), so the other account\'s EA stops sending', /\|90007777$/.test(LN.state().key), LN.state().key);
    var pxs = []; for (k = 0; k < 12; k++) { await W(250); var pk = LC.state().px; if (pk) pxs.push(pk.b); }
    check('...and only its prices reach the chart (none from 90001234)', pxs.length > 5 && pxs.every(function (b) { return Math.abs(b - (pxA + 0.005)) < 0.002; }), pxs.slice(0, 6));
    document.querySelector('#stpr-mm [data-mm="acct"]').click(); await W(400);
    document.querySelector('#stpr-menu [data-lvacc="90001234"]').click();
    for (k = 0; k < 80; k++) { await W(250); st = LC.state(); if (st.live && st.ea && String(st.ea.lg) === '90001234' && st.fresh && st.px && Math.abs(st.px.b - pxA) < 0.002) break; }
    for (k = 0; k < 40 && !/555001/.test(document.getElementById('lc-tb').textContent); k++) await W(250);
    check('back to FTMO 70K Challenge · 90001234: its prices, its name, its Toolbox again', String(st.ea.lg) === '90001234' && Math.abs(st.px.b - pxA) < 0.002 && /FTMO 70K Challenge · 90001234/.test(document.querySelector('#stpr-mm .stpr-mm-an').textContent) && /555001/.test(document.getElementById('lc-tb').textContent), [st.ea, st.px]);
    check('...and no sound or voice setting anywhere ("remove all these options and have the chime as default")', !document.getElementById('set-fillvoice') && !/Order filled/.test((document.querySelector('.settings-section[data-section="profile"]') || {}).textContent || ''));

    // ---- the member's closed trades: an entry and an exit arrow, and a card on hover (Nestor, 19 Oct 2026: "i should see 2 arrows the
    //      one that filled me in and the one when i got taken out, and potentially hovering over them they should give you a quick summary")
    var tq = P._panes().filter(function (q) { return q.tf === 1; })[0] || P._panes()[0], tqi = P._panes().indexOf(tq);
    var tE = Date.UTC(2026, 9, 14, 7, 41, 10) / 1000, tX = Date.UTC(2026, 9, 14, 7, 58, 40) / 1000, iso = function (t) { return new Date(t * 1000).toISOString(); };
    var bE = tq.bars.filter(function (b) { return b.time <= tE; }).pop(), pE = bE ? bE.close : pxA;
    var hmL = function (t) { var d = new Date(t * 1000); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };
    P._lvTr([
      { ticket: 770001, symbol: 'EURUSD', direction: 'sell', lots: '1.50', entry_price: String(pE), exit_price: String(+(pE + 0.0012).toFixed(5)), open_time: iso(tE), close_time: iso(tX), pnl: '-300.00', risk_gbp: '250', login: 90001234 },
      { ticket: 770002, symbol: 'EURUSD', direction: 'sell', lots: '1.50', entry_price: String(pE), exit_price: String(+(pE + 0.0012).toFixed(5)), open_time: iso(tE), close_time: iso(tX), pnl: '-300.00', risk_gbp: '250', login: 90007777 },
      { ticket: 770003, symbol: 'GBPUSD', direction: 'buy', lots: '1', entry_price: '1.33', exit_price: '1.331', open_time: iso(tE), close_time: iso(tX), pnl: '100', risk_gbp: '100', login: 90001234 }]);
    await W(600);
    var kE = P._keyOf(tq.tf, tE), kX = P._keyOf(tq.tf, tX), arw = P._arw(tqi);
    var aE = arw.filter(function (m) { return m.time === kE && m.shape === 'arrowDown' && m.position === 'aboveBar'; }), aX = arw.filter(function (m) { return m.time === kX && m.shape === 'arrowUp' && m.position === 'belowBar'; });
    var gE = (P._tmk(tqi) || []).filter(function (g) { return g.time === kE; })[0];
    check('a closed trade on the live chart: a pink sell arrow over its entry candle, a red buy arrow under its exit candle (a loss)', aE.length === 1 && aE[0].color === '#f472b6' && aX.length === 1 && aX[0].color === '#E56767', [kE, kX, arw.map(function (m) { return m.time + ' ' + m.shape + ' ' + m.color; }).slice(-6)]);
    check('...only the account the chart shows: its copy on 90007777 is not marked again, nor the GBP/USD trade', !!gE && gE.list.length === 1 && gE.list[0].ticket === '770001', gE && gE.list.map(function (x) { return x.ticket; }));
    var LE = P._lOfT(tqi, kE), tr0 = tq.chart.timeScale().getVisibleLogicalRange(); tq.chart.timeScale().setVisibleLogicalRange({ from: LE - 15, to: LE + 35 }); await W(600);
    var pc = tq.el.querySelector('.stpr-pc'), pr = pc.getBoundingClientRect(), xE = tq.chart.timeScale().timeToCoordinate(kE), hE = null, yy;
    for (yy = 0; yy < pr.height && !hE; yy += 2) hE = P._tmAt(tqi, xE, yy);
    check('...its arrow answers under the mouse, where it is drawn (over the candle)', !!hE && hE.above && hE.g.key === gE.key, hE && [hE.top, hE.bot]);
    var mv = function (x, y) { var t = document.elementFromPoint(pr.left + x, pr.top + y) || pc; t.dispatchEvent(new MouseEvent('mousemove', { clientX: pr.left + x, clientY: pr.top + y, bubbles: true })); };
    if (hE) mv(xE, (hE.top + hE.bot) / 2); await W(300);
    var cd = tq.card, ct = cd ? cd.textContent : '', cr = cd ? cd.getBoundingClientRect() : null;
    check('hovering it: a card - Sell · EURUSD · 1.50 lots, its times and how long (17 min), entry and exit',
      cd && cd.style.display === 'block' && /Sell · EURUSD · 1\.50 lots/.test(ct) && ct.indexOf(hmL(tE) + ' → ' + hmL(tX)) >= 0 && /17\smin/.test(ct) && ct.indexOf('Entry' + pE.toFixed(5)) >= 0 && ct.indexOf('Exit' + (pE + 0.0012).toFixed(5)) >= 0, ct);
    check('...the result in pips and R, and the money, in red: −12.0 pips · −1.20R, P&L −', /Result−(12\.0 pips|120 pts) · −1\.20R/.test(ct) && /P&L−/.test(ct) && /300/.test(ct) && cd.querySelector('.strp-nc-v.dn') && cd.classList.contains('tml'), ct);
    check('...over the arrow (the arrow is over the candle), and the trade\'s path dotted on the chart while it shows', cr && cr.bottom <= pr.top + hE.top + 1 && !cd.classList.contains('below') && tq._tmShow && tq._tmShow.e === gE.key, cr && [cr.bottom, pr.top + hE.top]);
    var xX = tq.chart.timeScale().timeToCoordinate(kX), hX = null;
    for (yy = Math.round(pr.height) - 30; yy > 0 && !hX; yy -= 2) hX = P._tmAt(tqi, xX, yy);
    if (hX) mv(xX, (hX.top + hX.bot) / 2); await W(300); cr = cd.getBoundingClientRect();
    check('the exit arrow (under its candle): the same trade\'s card, under the arrow (over it when the chart has no room below)', !!hX && !hX.above && cd.style.display === 'block' && /Sell · EURUSD/.test(cd.textContent) && (cd.classList.contains('below') ? cr.top >= pr.top + hX.bot - 1 : (cr.bottom <= pr.top + hX.top + 1 && pr.top + hX.bot + 12 + cr.height > pr.bottom - 30)), hX && [cr.top, cr.bottom, pr.top + hX.top, pr.top + hX.bot, cd.classList.contains('below')]);
    var away = [[pr.width * 0.5, pr.height * 0.5], [pr.width * 0.3, pr.height * 0.3], [pr.width * 0.7, pr.height * 0.6]].filter(function (q) { var e0 = document.elementFromPoint(pr.left + q[0], pr.top + q[1]); return e0 && pc.contains(e0) && !P._tmAt(tqi, q[0], q[1]); })[0] || [pr.width * 0.5, pr.height * 0.5];
    mv(away[0], away[1]); await W(300);
    check('...the mouse away: the card goes, and the path', cd.style.display === 'none' && !tq._tmShow, cd.style.display);
    P._cfg().marks = false; P._render(); await W(300);
    check('Trade marks off: the arrows are hidden and do not answer the mouse', P._arw(tqi).filter(function (m) { return m.time === kE; }).every(function (m) { return m.color === 'rgba(0,0,0,0)'; }) && !P._tmAt(tqi, xE, (hE.top + hE.bot) / 2));
    P._cfg().marks = true; P._lvTr([]); P._render(); if (tr0) tq.chart.timeScale().setVisibleLogicalRange(tr0); await W(300);

    // ---- the bigger view and back ----
    document.getElementById('stpr-max').click(); await W(300);
    check('Maximise: the charts fill the screen', document.getElementById('stpr-bg').classList.contains('show') && win.parentNode.id === 'stpr-bg' && LC.state().max);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(300);
    check('Escape: back in the tab', win.parentNode.id === 'lc-host' && !document.getElementById('stpr-bg').classList.contains('show'));

    // ---- Live Charts remembers each chart's zoom on this device (18 Oct 2026: "can the chart remember where i left it") ----
    await W(1500);   // the window settles after Maximise / Escape first
    var zp = P._panes()[0], zl = zp.n - 1, zt = null;
    P._zoom(0, { from: zl - 56, to: zl + 4 });   // as a wheel zoom leaves it (the chart's own handlers are not reachable from a script)
    // saved 700 ms after the chart reports the new view, which it does on its next drawn frame - 0.2 to 0.9 s late in this busy
    // headless window (19 Oct 2026: a fixed 1.5 s wait read too early 2 runs in 5): wait for the save itself, up to 6 s
    var zsv = {}, zk = null; for (k = 0; k < 40; k++) { await W(150); try { zsv = JSON.parse(localStorage.getItem('st_lc_view') || '{}'); } catch (e) {} zk = zsv['0|' + zp.tf]; if (zk && Math.abs(zk.span - 60) < 1.5) break; }
    var zr0 = zp.chart.timeScale().getVisibleLogicalRange(), zspan = zr0 ? zr0.to - zr0.from : 0;
    check('a chart zoomed by hand is remembered on this device (60 candles, ending 4 right of the latest)', !!zk && Math.abs(zk.span - 60) < 1.5 && Math.abs(zk.off - 4) < 1.5, [zsv, zspan]);
    // zoomed again and Live Charts left at once, its save still waiting: saved as the charts go, not lost with them (19 Oct 2026)
    zl = zp.n - 1; P._zoom(0, { from: zl - 76, to: zl + 4 });
    for (k = 0; k < 80; k++) { await W(50); zr0 = zp.chart.timeScale().getVisibleLogicalRange(); if (zp._vt && zr0 && Math.abs(zr0.to - zr0.from - 80) < 1.5) break; }
    document.querySelector('.tab[data-page="trades"]').click();
    for (k = 0; k < 60 && P._panes().length; k++) await W(50);
    var zf = null; try { zf = JSON.parse(localStorage.getItem('st_lc_view') || '{}')['0|' + zp.tf]; } catch (e) {}
    check('...and a zoom made just before leaving Live Charts is kept too (80 candles, saved as it leaves)', !!zf && Math.abs(zf.span - 80) < 1.5 && Math.abs(zf.off - 4) < 1.5, [zf, P._panes().length]);
    if (zf) zk = zf;
    await W(900);
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (k = 0; k < 80; k++) { await W(200); st = LC.state(); if (st.live && P._panes().length && P._panes()[0].n > 30 && P._panes()[0].shown) break; } await W(1200);
    var zq = P._panes()[0], zr = zq.chart.timeScale().getVisibleLogicalRange();
    check('...and Live Charts opens at that zoom again, the latest candle on screen', !!zr && !!zk && Math.abs((zr.to - zr.from) - zk.span) < 2.5 && zr.to >= zq.n - 1, zr && zk && [zr.to - zr.from, zk.span, zr.to - (zq.n - 1)]);
    // ---- Live Charts in a window of its own (18 Oct 2026: "where is the open in a new window button?") ----
    var popEl = document.getElementById('stpr-pop');
    check('Live Charts has the open-in-a-new-window button', popEl && getComputedStyle(popEl).display !== 'none' && popEl.offsetWidth > 0);
    var opened = null, fakeW = { closed: false, close: function () { this.closed = true; } }, wo = window.open;
    window.open = function (u, n, f) { opened = [u, n, f]; return fakeW; };
    popEl.click(); await W(500); window.open = wo;
    var away = document.getElementById('lc-away');
    check('...it opens the app in a window of its own on Live Charts (this symbol); this tab says so and stops its chart', !!opened && /\?livecharts=1&sym=EURUSD/.test(opened[0]) && !!away && /open in its own window/.test(away.textContent) && !P._s(), [opened, away && away.textContent]);
    fakeW.closed = true;
    for (k = 0; k < 60 && !(LC.state().live && !document.getElementById('lc-away')); k++) await W(250);
    check('...closing that window brings Live Charts back here', LC.state().live && !document.getElementById('lc-away'));
    // ---- leaving the tab ----
    document.querySelector('.tab[data-page="trades"]').click(); await W(600);
    for (k = 0; k < 20; k++) { await W(250); if (!LN.state().watching) break; }
    check('left: the window goes back, the live chart stops', win.parentNode.id === 'stpr-bg' && !P._s() && !!document.querySelector('#page-tradeview .alltrades-wrap'),
      [win.parentNode.id, !!P._s()]);
    check('nothing on screen shows a live chart or the trade card: the line stops watching (the EA stops sending)', !LN.state().watching, LN.state());

    // ---- Session Live's chart: Open in Live Charts ----
    document.querySelector('.tab[data-page="review"]').click(); await W(400);
    var pr = document.getElementById('page-review'); if (pr) pr.classList.add('session-live-collapsed');
    for (k = 0; k < 30; k++) { await W(250); try { window.__stLiveBox.render(); } catch (e) {} if (document.querySelector('#st-livebox .slx-open')) break; }
    var ob = document.querySelector('#st-livebox .slx-open');
    check('the Session Live chart has "Open in Live Charts"', ob && /Open in Live Charts/.test(ob.textContent), ob && ob.textContent);
    var card = document.querySelector('#st-livebox .slx-tc[data-k="990077"]');
    check('its card has MT5\'s state, Move to BE and the same Close trade (done at its time)', card && card.querySelector('.stm-st.on') && !!card.querySelector('[data-tma="tobe"]') && !card.querySelector('[data-tma="half"]') && /^Closed \d\d:\d\d$/.test(card.querySelector('[data-tma="close"]').textContent), card && card.querySelector('.stm') && card.querySelector('.stm').textContent);
    if (ob) ob.click();
    for (k = 0; k < 60; k++) { await W(250); st = LC.state(); if (st.live) break; }
    check('it opens Live Charts on that trade\'s symbol', document.getElementById('page-livecharts').classList.contains('active') && st.live && st.sym === 'EURUSD', st);

    // ---- Back Testing's today (18 Oct 2026): today's candles from the EA, any moment of it replayed, then the live price ----
    document.querySelector('.tab[data-page="trades"]').click(); await W(600);
    await P.open({ symbol: 'EURUSD', day: '2026-10-13' }); for (k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var chB = document.getElementById('stpr-chip');
    check('Back Testing (Replay) after Live Charts: the pink REPLAY label again (not Live Charts\' green or grey)', chB.className === 'stpr-chip' && /Replay/.test(chB.textContent) && /244, 114, 182/.test(getComputedStyle(chB).backgroundColor), [chB.className, chB.textContent, getComputedStyle(chB).backgroundColor]);
    var tb = document.getElementById('stpr-today');
    check('Back Testing has a Today button (Random day is gone)', tb && getComputedStyle(tb).display !== 'none' && !document.getElementById('stpr-rand') && /Today/.test(tb.textContent), tb && tb.outerHTML.slice(0, 60));
    tb.click();
    var nowT = function () { return Math.floor(Date.now() / 1000) + Math.round((T0 * 1000 - (window.__t0ref || 0)) / 1000); };
    for (k = 0; k < 120; k++) { await W(250); var ts = P._s(); if (ts && ts.today && ts.gotHist && ts.base.length > 100 && ts.follow) break; }
    ts = P._s(); var whenT = document.getElementById('stpr-when').textContent;
    check('Today opens today (the EA\'s minutes), at the present, following the live price - still REPLAY', ts && ts.today && ts.day === '2026-10-14' && ts.base.length > 100 && ts.follow && /TODAY · LIVE PRICE/.test(whenT) && /Replay/.test(document.getElementById('stpr-chip').textContent), [ts && ts.day, ts && ts.base.length, ts && ts.follow, whenT]);
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
