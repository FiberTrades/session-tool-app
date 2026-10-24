// Instant chart open (24 Oct 2026, Nestor: "can you make this faster?"). Through the real app, a local relay and a stand-in EA 9.15
// (tests/fake_ea_livecharts.py, now with 9.14's "chart" and 9.15's "unchart") on account 90001234, a cloud account here.
//   python tests/instant_run.py                       (this build)
//   set E2E_APP=app_before.html & python tests/instant_run.py   (the timing part against an older copy: "before")
// Measures, from the moment a symbol is picked: its first live price on screen, and when its own EA (orders) is there.
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB && window.__stMt5c); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    window.addEventListener('unhandledrejection', function (e) { errs.push('rejected: ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 300)); });
    var P = window.__stPractice, LC = window.__stLC, LN = window.__stLiveLine, AFTER = !!P._hold;
    var T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000, LG = '90001234';
    P._lvClock(T0 * 1000 - Date.now());
    window.isSessionLive = function () { return true; };
    window.__stKeepOff = true;   // phase 1: no charts kept open, so a symbol opens through the hub
    // a cloud account (the database is a stand-in: its row fed in, the list saves caught)
    var saves = [], realFrom = window.__stSB.from.bind(window.__stSB), realRpc = window.__stSB.rpc;
    var chain = function (val) { var p = Promise.resolve(val); ['select', 'eq', 'order', 'limit', 'in'].forEach(function (m) { p[m] = function () { return p; }; }); return p; };
    var rows = [{ id: 'c1', login: +LG, server: 'FTMO-Demo', status: 'running', status_at: new Date().toISOString(), app_trading: true, created_at: new Date().toISOString(), symbols: ['EURUSD'] }];
    window.__stSB.from = function (t) { if (t === 'cloud_mt5') return { select: function () { return chain({ data: rows.slice(), error: null }); } }; return realFrom(t); };
    window.__stSB.rpc = function (fn, a) { if (fn === 'st_cloud_set_symbols') { saves.push(a); return Promise.resolve({ data: true, error: null }); } return realRpc.apply(window.__stSB, arguments); };
    window.currentUser = { id: '00000000-0000-0000-0000-0000000000a7', email: 'member@example.com' };
    window.__stMt5c.clLoad(); for (var i1 = 0; i1 < 40 && !window.__stMt5c.cloud().length; i1++) await W(100);
    window.__stLcForce = true; await W(1200);
    window.STCloud.syncToken = 'st-test-instant-e2e';
    if ('__RELAY__'.indexOf('ws') === 0) window.__stRelayURL = '__RELAY__';
    var C = P._cfg(); C.layout = 1; C.tfs = [15, 60, 240, 5]; C.syms = []; C.mini = false; C.resume = null; C.sym = 'EURUSD';
    C.wl = ['EURUSD', 'GBPUSD', 'XAUUSD', 'USDCHF', 'US100.cash', 'FAKEX', 'BTCUSD', 'USDJPY', 'USDJPY.r'];
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 160 && !(P._s() && P._s().live && LC.state().fresh); k++) await W(150);
    ok('Live Charts on EURUSD, its hub EA streaming', P._s() && P._s().live && LC.state().fresh, LC.state().status);
    await W(3500);   // the watchlist's prices come in (the hub, every tick)
    var ov = document.getElementById('stpr-state');
    async function openTimed(raw, max) { var t0 = performance.now(), r = { px: null, own: null, overlayAfter: false, hubFirst: null, pxs: [] };
      P._goLive(raw);
      for (var i = 0; i < 3000; i++) { var s = P._s(), now = Math.round(performance.now() - t0);
        if (s && s.sym && (s.sym.raw === raw || s.sym.name === raw)) {
          var shown = ov && getComputedStyle(ov).display === 'none' && P._panes().length && P._panes()[0].n > 0;
          if (r.px == null && shown && s.px && s.px.b > 0) { r.px = now; r.hubFirst = !!(s.ea && s.ea.hub); }
          if (r.px != null && !shown) r.overlayAfter = true;
          if (r.px != null && s.px && (!r.pxs.length || r.pxs[r.pxs.length - 1][1] !== s.px.b)) r.pxs.push([now, s.px.b, !!(s.ea && s.ea.hub)]);
          if (r.own == null && s.ea && !s.ea.hub) r.own = now;
          if (r.px != null && r.own != null && now - r.own > 1500) break; }
        if (now > (max || 15000)) break;
        await W(10); }
      return r; }
    function dups(F) { var seen = {}, d = 0; (F.base || []).forEach(function (b) { if (seen[b.time]) d++; seen[b.time] = 1; }); return d; }
    function jump(r) { var mx = 0; for (var i = 1; i < r.pxs.length; i++) mx = Math.max(mx, Math.abs(r.pxs[i][1] - r.pxs[i - 1][1]) / r.pxs[i - 1][1]); return mx; }

    // ---- GBPUSD: in the watchlist, no chart of its own on the cloud MT5 ----
    var g = await openTimed('GBPUSD');
    window.__stTiming = { gbp: g };
    ok('GBPUSD: first live price on screen (ms) ' + g.px, g.px != null, g);
    ok('GBPUSD: its own EA (orders) there after (ms) ' + g.own, AFTER ? g.own != null : true, { own: g.own, before: !AFTER });
    if (AFTER) {
      ok('...the hub\'s prices first, then the symbol\'s own EA: no loading screen again, no candle twice, no jump in the price', (g.hubFirst === true || g.own != null) && !g.overlayAfter && dups(P._s()) === 0 && jump(g) < 0.002, { hubFirst: g.hubFirst, overlay: g.overlayAfter, dups: dups(P._s()), jump: jump(g), pxs: g.pxs.slice(0, 3).concat(g.pxs.slice(-3)) });
      var fl = document.getElementById('stpr-flash');
      ok('...nothing on screen about it (no "Opening GBPUSD…", no restart message)', !fl || !fl.classList.contains('show') || !/GBPUSD/.test(fl.textContent), fl && fl.textContent);
      ok('...the chart saved on the server\'s list once open (GBPUSD)', saves.some(function (a) { return (a.p_symbols || []).indexOf('GBPUSD') >= 0; }), saves);
      // ---- XAUUSD: an order placed while the hub's prices show - held, sent the moment its own EA is there ----
      P._goLive('XAUUSD'); var s1 = null;
      for (var k1 = 0; k1 < 400; k1++) { s1 = P._s(); if (s1 && s1.sym.raw === 'XAUUSD' && s1.px && s1.px.b > 0 && getComputedStyle(ov).display === 'none') break; await W(10); }
      var hubNow = !!(s1 && s1.ea && s1.ea.hub), px0 = s1 && s1.px ? s1.px.b : 0, fired = P._lvFire({ dir: 1, sl: px0 - 3, rd: 3, kind: null });
      var held = P._hold(), o1 = LC._ord();
      ok('XAUUSD on the hub\'s prices: an order is held, not refused ("sending…")', hubNow && fired === true && held && o1 && o1.st === 'hold', { hubNow: hubNow, fired: fired, held: !!held, ord: o1 });
      for (var k2 = 0; k2 < 120 && !(LC._ord() && LC._ord().st === 'ok'); k2++) await W(100);
      ok('...and sent the moment its own EA said hi: filled', LC._ord() && LC._ord().st === 'ok' && !P._hold(), LC._ord());
      // ---- keeping the watchlist open on the cloud MT5 ----
      window.__stKeepOff = false;
      for (var k3 = 0; k3 < 140; k3++) { await W(100); }
      var asked = P._keep().asked, ks = Object.keys(asked);
      window.__stKeepAsked = asked;
      ok('the first 8 watchlist symbols with no chart get one (not EURUSD, the hub\'s; not the 9th, USDJPY.r)',
        ks.indexOf(LG + '|chart|' + 'USDJPY') >= 0 && ks.some(function (x) { return /\|chart\|USDCHF$/.test(x); }) && !ks.some(function (x) { return /\|chart\|(EURUSD|USDJPYR|USDJPY\.R)$/i.test(x) && !/USDJPY$/.test(x); }), ks);
      ok('...FAKEX (no such symbol at the broker): asked once, never again', asked[LG + '|chart|FAKEX'] && asked[LG + '|chart|FAKEX'].st === 'perm', asked[LG + '|chart|FAKEX']);
      // ---- a kept-open symbol opens with its own EA from the first moment ----
      var u = await openTimed('US100.cash');
      window.__stTiming.us100 = u;
      ok('US100.cash (kept open): first live price (ms) ' + u.px + ', its own EA at once (ms) ' + u.own, u.px != null && u.own != null && u.hubFirst === false, u);
      // ---- out of the list: its chart closed again (EA 9.15) - never the hub's, never one on screen ----
      C.wl = ['EURUSD', 'GBPUSD', 'XAUUSD', 'US100.cash', 'FAKEX', 'BTCUSD', 'USDJPY'];   // USDCHF out; US100.cash on screen stays
      P._keepTick(); for (var k4 = 0; k4 < 40 && !(P._keep().asked[LG + '|unchart|USDCHF'] && P._keep().asked[LG + '|unchart|USDCHF'].st === 'ok'); k4++) await W(150);
      var ua = P._keep().asked[LG + '|unchart|USDCHF'];
      ok('USDCHF left the list: its chart closed ("unchart", 9.15)', ua && ua.st === 'ok', ua);
      C.wl = ['GBPUSD', 'XAUUSD', 'FAKEX', 'BTCUSD', 'USDJPY'];   // EURUSD (the hub's), US100.cash (on screen) out of the list too
      P._keepTick(); await W(2500); P._keepTick(); await W(1500);
      ks = Object.keys(P._keep().asked);
      ok('...the hub\'s chart and the one on screen are never closed', !ks.some(function (x) { return /\|unchart\|(EURUSD|US100CASH|US100\.CASH)$/i.test(x); }), ks.filter(function (x) { return /unchart/.test(x); }));
      // an account whose EAs are 9.14: nothing closed from here
      var eL = LN.easL(); Object.keys(eL).forEach(function (x) { if (x.slice(x.lastIndexOf('|') + 1) === LG) eL[x]._v = eL[x].v, eL[x].v = '9.14'; });
      C.wl = ['GBPUSD'];   // XAUUSD... and the rest out
      P._keepTick(); await W(2500);
      ks = Object.keys(P._keep().asked);
      ok('EAs before 9.15: no "unchart" sent', !ks.some(function (x) { return /\|unchart\|(BTCUSD|USDJPY)$/i.test(x); }), ks.filter(function (x) { return /unchart/.test(x); }));
      Object.keys(eL).forEach(function (x) { if (eL[x]._v) { eL[x].v = eL[x]._v; delete eL[x]._v; } });
    }
    ok('no script errors', errs.length === 0, errs);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
