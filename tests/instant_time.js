// Timings for instant chart open (24 Oct 2026), the same steps on any build: E2E_JS=instant_time.js python tests/instant_run.py,
// with E2E_APP=app_before.html for the build before. Three symbols in the watchlist with no MT5 chart of their own, opened one
// after another: the first live price on screen, and when the symbol's own EA (orders) is there. Then (this build) a symbol
// the watchlist keeps open. Numbers in ms from the pick; prints them, passes if every open showed a price.
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB && window.__stMt5c); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var P = window.__stPractice, LC = window.__stLC, AFTER = !!P._hold, LG = '90001234';
    P._lvClock(Date.UTC(2026, 9, 14, 8, 30) - Date.now());
    window.isSessionLive = function () { return true; };
    window.__stKeepOff = true;
    var realFrom = window.__stSB.from.bind(window.__stSB), realRpc = window.__stSB.rpc;
    var chain = function (val) { var p = Promise.resolve(val); ['select', 'eq', 'order', 'limit', 'in'].forEach(function (m) { p[m] = function () { return p; }; }); return p; };
    var rows = [{ id: 'c1', login: +LG, server: 'FTMO-Demo', status: 'running', status_at: new Date().toISOString(), app_trading: true, created_at: new Date().toISOString(), symbols: ['EURUSD'] }];
    window.__stSB.from = function (t) { if (t === 'cloud_mt5') return { select: function () { return chain({ data: rows.slice(), error: null }); } }; return realFrom(t); };
    window.__stSB.rpc = function (fn, a) { if (fn === 'st_cloud_set_symbols') return Promise.resolve({ data: true, error: null }); return realRpc.apply(window.__stSB, arguments); };
    window.currentUser = { id: '00000000-0000-0000-0000-0000000000a8', email: 'member@example.com' };
    window.__stMt5c.clLoad(); for (var i1 = 0; i1 < 40 && !window.__stMt5c.cloud().length; i1++) await W(100);
    window.__stLcForce = true; await W(1200);
    window.STCloud.syncToken = 'st-test-instant-e2e';
    if ('__RELAY__'.indexOf('ws') === 0) window.__stRelayURL = '__RELAY__';
    var C = P._cfg(); C.layout = 1; C.tfs = [15, 60, 240, 5]; C.syms = []; C.mini = false; C.resume = null; C.sym = 'EURUSD';
    C.wl = ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'XAUUSD', 'US100.cash'];
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 200 && !(P._s() && P._s().live && LC.state().fresh); k++) await W(150);
    await W(4000);
    var ov = document.getElementById('stpr-state');
    // event-driven, so a busy machine's late timers don't count: "loaded" when the app's own open resolves, "price" when the new
    // chart has a price (seeded, or the first one in after it), "own" when its own EA feeds it (checked every 20 ms - its EA's hi
    // is what that waits for)
    async function openTimed(raw) { var t0 = performance.now(), r = { sym: raw, loaded: null, price: null, own: null }, pxAt = null, real = LC.px;
      LC.px = function (p) { try { real(p); } finally { if (pxAt == null && p && p.s === raw) pxAt = performance.now(); } };
      var done = P._goLive(raw).then(function () { r.loaded = Math.round(performance.now() - t0); var s = P._s(); if (s && s.px && s.px.b > 0) r.price = r.loaded; });
      var iv = setInterval(function () { var s = P._s(); if (r.own == null && s && s.sym.raw === raw && s.ea && !s.ea.hub) r.own = Math.round(performance.now() - t0); }, 20);
      await done; if (r.price == null) { for (var i = 0; i < 600 && pxAt == null; i++) await W(25); if (pxAt != null) r.price = Math.max(r.loaded, Math.round(pxAt - t0)); }
      for (var j = 0; j < 400 && AFTER && r.own == null; j++) await W(25);
      clearInterval(iv); LC.px = real; return r; }
    var res = [];
    for (var j = 0; j < 3; j++) { res.push(await openTimed(['GBPUSD', 'USDJPY', 'BTCUSD'][j])); await W(1500); }
    if (AFTER) { window.__stKeepOff = false; await W(9000); res.push(Object.assign(await openTimed('US100.cash'), { kept: true })); }
    window.__stTiming = res;
    ok((AFTER ? 'AFTER' : 'BEFORE') + ' timings (ms from the pick): ' + JSON.stringify(res), res.every(function (r) { return r.price != null; }), res);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
