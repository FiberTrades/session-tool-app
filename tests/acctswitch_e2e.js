// Switching the account to trade with (Trade with) on Charts, measured and checked (29 Oct 2026, Nestor: "why when you change between
// lead account and follow accounts or just other accounts in the charts, the charts have to reload?"). Three stand-in EAs on EUR/USD
// through a local relay: 90001234 (FTMO 70K), 90007777 (OneFunded 10K, 50 pips above) and 90003333 (Demo, another broker that calls it
// EURUSD.x, 100 pips above). Each switch is timed frame by frame: how long the chart is blank (the loading line up, or a chart missing
// or empty), when the candles are on screen, when that account's own minutes have landed, when its live price is on the chart. Then
// the same in Live Charts' window of its own. Nothing real is touched: a throwaway channel, stand-ins only.
//   python tests/acctswitch_run.py            (ACCSW_MEASURE=1: print the timings, no pass/fail on them - for the old app)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var MEASURE = '__MEASURE__' === '1', T0 = +'__T0__', TOK = '__TOK__', RELAY = '__RELAY__', P0 = +'__P0__', GAP = +'__GAP__' || 0;   // GAP: ms before each switch (46000: the day's stored minutes no longer the 45 s fetch kept, as in real use)
  var report = { desk: [], pop: [] };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB); i++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var P = window.__stPractice, LC = window.__stLC;
    P._lvClock(T0 * 1000 - Date.now());
    window.isSessionLive = function () { return true; };
    window.__stLcForce = true; window.__stKeepOff = true; await W(1200);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    window.STCloud.syncToken = TOK; window.__stRelayURL = RELAY;
    try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15, 1, 60, 240]; C.syms = []; C.mini = false; C.resume = null; C.lvLg = '90001234'; } catch (e) {}
    var acc0 = (data.accounts || [])[0] || {}, mk = function (id, name, kind, bal) { return Object.assign(JSON.parse(JSON.stringify(acc0)), { id: id, name: name, kind: kind, status: 'active', separate: false, startingBalance: bal, balanceAtSetup: bal }); };
    data.accounts.push(mk('acc-70k', 'FTMO 70K', 'challenge', 70000), mk('acc-of', 'OneFunded 10K', 'challenge', 10000), mk('acc-demo', 'Demo', 'personal', 10000));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-70k', '90007777': 'acc-of', '90003333': 'acc-demo' });
    document.querySelectorAll('[class^="st-tour"], .st-greet-pop').forEach(function (e) { e.remove(); });
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 160 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].n > 30); k++) await W(250);
    for (k = 0; k < 80 && LC._accs().length < 3; k++) await W(250);
    ok('Charts live on EUR/USD from 90001234, all three accounts\' EAs heard', LC.state().live && String((LC.state().ea || {}).lg) === '90001234' && LC._accs().join() === '90001234,90003333,90007777', [LC.state().ea, LC._accs()]);
    await W(2500);
    var band = { '90001234': P0, '90007777': P0 + 0.005, '90003333': P0 + 0.010 };
    var near = function (lg, b) { return b > 0 && Math.abs(b - band[lg]) < 0.0025; };

    // one switch, timed: every 10 ms (and every frame) until that account's price is on the chart and its own minutes are in
    async function sw(lg, label) {
      var p0 = P._panes()[0], ch0 = p0 && p0.chart, D = p0.el.ownerDocument, Wn = D.defaultView, r0 = p0.chart.timeScale().getVisibleLogicalRange();
      var mm = D.querySelector('#stpr-mm [data-mm="acct"]'); if (!mm) return { label: label, err: 'no account picker' };
      if (GAP) await W(GAP);
      mm.click(); await W(1900);
      var row = D.querySelector('#stpr-menu [data-lvacc="' + lg + '"]') || document.querySelector('#stpr-menu [data-lvacc="' + lg + '"]'); if (!row) return { label: label, err: 'no row ' + lg };
      var rec = [], t0 = Date.now(), live = true, samp = function () { if (!live) return; var p = P._panes()[0], st = LC.state(), s = p && p.el.ownerDocument.getElementById('stpr-state');
        rec.push({ t: Date.now() - t0, load: !!(s && s.style.display !== 'none'), ch: p ? p.chart : null, n: p ? p.n : 0, lg: st.ea ? String(st.ea.lg) : '', px: st.px ? st.px.b : 0, gh: !!st.gotHist, raw: st.ea ? st.ea.raw : '' }); };
      var iv = setInterval(samp, 10), fr = function () { samp(); if (live) Wn.requestAnimationFrame(fr); }; Wn.requestAnimationFrame(fr);
      row.click(); samp();
      for (var k = 0; k < 100; k++) { await W(100); var l = rec[rec.length - 1]; if (l && l.lg === lg && near(lg, l.px) && l.gh && !l.load && l.n > 30) break; }
      await W(300); live = false; clearInterval(iv);
      var p1 = P._panes()[0], blank = 0, prev = null, first = function (f) { for (var j = 0; j < rec.length; j++) if (f(rec[j])) return rec[j].t; return null; };
      rec.forEach(function (r) { var b = r.load || !r.ch || r.n < 1; if (prev && prev.b) blank += r.t - prev.t; prev = { t: r.t, b: b }; });
      var r1 = p1.chart.timeScale().getVisibleLogicalRange();
      return { label: label, to: lg, raw: (LC.state().ea || {}).raw, samples: rec.length, blankMs: blank, anyBlank: rec.some(function (r) { return r.load || !r.ch || r.n < 1; }),
        candlesMs: first(function (r) { return r.lg === lg && !r.load && r.ch && r.n > 30; }), ownMinutesMs: first(function (r) { return r.lg === lg && r.gh && !r.load && r.n > 30; }),
        priceMs: first(function (r) { return r.lg === lg && near(lg, r.px) && !r.load; }), sameChart: p1.chart === ch0, rebuilt: rec.some(function (r) { return r.ch && r.ch !== ch0; }),
        view: [r0 && +(r0.to - r0.from).toFixed(1), r1 && +(r1.to - r1.from).toFixed(1), r0 && +r0.to.toFixed(1), r1 && +r1.to.toFixed(1)] };
    }
    async function round(where) {
      var R = [];
      R.push(await sw('90007777', where + ': 70K -> OneFunded (first time)'));
      R.push(await sw('90001234', where + ': OneFunded -> 70K (back)'));
      R.push(await sw('90003333', where + ': 70K -> Demo, EURUSD.x (first time)'));
      R.push(await sw('90007777', where + ': Demo -> OneFunded (again)'));
      R.push(await sw('90001234', where + ': OneFunded -> 70K (again)'));
      return R;
    }
    // the open trades the chart shows (its lines, the Trade Manager's rows) and its trade arrows: the account it trades with only
    var LV0 = window.__stLive, tk = { op: P0, rpx: 0.001, r: 0.2, pnl: 10, px: P0 };
    window.__stLive = Object.assign({}, LV0 || {}, { openIdeas: function () { return [{ ticket: 7001, symbol: 'EURUSD', direction: 'long', login: '90001234', tick: tk, openedAt: Date.now() - 600000 },
      { ticket: 7002, symbol: 'EURUSD', direction: 'short', login: '90007777', tick: tk, openedAt: Date.now() - 600000 }]; } });
    var tr1 = P._lvMyIdeas().join(), mk1 = P._lvTrList().join();
    report.desk = await round('desk');
    await sw('90007777', 'desk: to OneFunded for its trades');
    var tr2 = P._lvMyIdeas().join(), mk2 = P._lvTrList().join();
    await sw('90001234', 'desk: back to 70K');
    window.__stLive = LV0;
    ok('the open trades and arrows follow the account: 70K shows 7001, OneFunded 7002', tr1 === '7001' && mk1 === '7001' && tr2 === '7002' && mk2 === '7002', [tr1, mk1, tr2, mk2]);
    // the same in Live Charts' window of its own
    var wo = window.open, satW = null; window.open = function (u, n, f) { satW = wo.call(window, u, n, f); return satW; };
    P._lcPop(); window.open = wo;
    for (k = 0; k < 140 && !(P._stage().on && satW && P._panes()[0].el.ownerDocument === satW.document && P._panes()[0].n > 30); k++) await W(150);
    await W(2500);
    if (satW && P._panes()[0].el.ownerDocument === satW.document) report.pop = await round('pop-out');
    else ok('Live Charts\' window opened', false, [P._stage(), !!satW]);
    ok('the timings (ms): ' + JSON.stringify(report.desk.concat(report.pop).map(function (r) { return [r.label, r.blankMs, r.candlesMs, r.ownMinutesMs, r.priceMs, r.sameChart ? 'kept' : 'REBUILT']; })), true, report);
    var all = report.desk.concat(report.pop);
    all.forEach(function (r) { if (r.err) ok(r.label + ': ran', false, r.err); });
    if (!MEASURE) {
      all.filter(function (r) { return !r.err; }).forEach(function (r) {
        ok(r.label + ': the same chart kept (not rebuilt), never blank, its view kept', r.sameChart && !r.rebuilt && !r.anyBlank && Math.abs(r.view[0] - r.view[1]) < 0.5 && Math.abs(r.view[2] - r.view[3]) < 1.5, [r.sameChart, r.rebuilt, r.blankMs, r.view]);
        ok(r.label + ': candles on screen at once (' + r.candlesMs + ' ms), that account\'s price on the chart in ' + r.priceMs + ' ms', r.candlesMs != null && r.candlesMs <= 50 && r.priceMs != null && r.priceMs <= 2500, [r.candlesMs, r.priceMs, r.ownMinutesMs]);
      });
      var demo = all.filter(function (r) { return r.to === '90003333' && !r.err; });
      ok('the Demo\'s broker calls it EURUSD.x: the chart follows that name with no reload', demo.length && demo.every(function (r) { return r.raw === 'EURUSD.x' && r.sameChart; }), demo.map(function (r) { return [r.raw, r.sameChart]; }));
      var back = all.filter(function (r) { return /again|back/.test(r.label) && !r.err; });
      ok('switching back to an account seen before: its own candles from the warm cache at once (' + back.map(function (r) { return r.ownMinutesMs; }).join(', ') + ' ms)', back.length && back.every(function (r) { return r.ownMinutesMs != null && r.ownMinutesMs <= 50; }), back.map(function (r) { return [r.label, r.ownMinutesMs]; }));
    }
    try { if (satW) satW.close(); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
