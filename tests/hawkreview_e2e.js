(async function () {
  // The hawk's review in his full charts (Nestor, 24 Nov 2026: "if i click on the 4h in brief the chart changes to 4h so i can give you
  // feedback for the 4h, then do the same for the 1h, then 15m"): a timeframe's review opens Study with chart 1 on that timeframe (o.tf),
  // another timeframe of the same brief stays on its day (o.stay), the hawk's read drawn as ordinary drawings (a fib with its own words and
  // bands) is handed back with his changes, and when it ends chart 1 and his own drawings come back - nothing of it in his Replay drawings.
  // The read itself: hawk.js's engine (HE, engine.py's) on the stand-in candles. Study on EUR/USD of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/hawkreview_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    window.__stPlatOff = false; window.__stLcForce = true;
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stDrawBar && window.__stReplay); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.mm = Object.assign({}, C.mm, { col: true }); C.layout = 2; C.tfs = [5, 15, 60, 240]; C.mini = false; C.dtpl = {}; C.ddef = {}; C.dwHide = false; C.dwLock = false; C.news = false; C.syms = []; C.resume = { sym: 'EURUSD', day: '2026-10-01', now: 0, at: Date.now() }; C.speed = 0;
    try { localStorage.removeItem('st_plat'); } catch (e) {}
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    P._lv().mode = 'replay'; document.querySelector('.tab[data-page="livecharts"]').click(); for (var k = 0; k < 200 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100); await W(1500);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    var DW = P._dr(), MINE = { type: 'hline', price: 1.1712, color: '#22d3ee', width: 1 };
    DW.list.push(JSON.parse(JSON.stringify(MINE))); try { localStorage.setItem('st_practice_draw2:' + DW.raw, JSON.stringify(DW.list)); } catch (e) {}   // his own, saved (the day's load reads them back)
    var r1 = Date.UTC(2026, 9, 1, 6, 0, 0) / 1000, at = r1 + 2700, got = [];
    var onMine = function (n, list, ended) { got.push({ n: n, list: list, ended: !!ended }); };
    var FIB = { type: 'fib', a: { t: r1 - 20 * 4 * 3600, price: 1.1650 }, b: { t: r1 + 8 * 4 * 3600, price: 1.1750 }, levels: [0, 0.25, 0.45, 0.5, 0.55, 0.75, 1], lbls: ['4H leg low', '', '', '50%', '', '', '4H leg high'],
      bands: ['rgba(46,189,133,0.15)', 'rgba(46,189,133,0.06)', 'rgba(149,152,161,0.12)', 'rgba(149,152,161,0.12)', 'rgba(246,70,93,0.06)', 'rgba(246,70,93,0.15)'], color: '#e0a84a', width: 1, hkr: 'zone', hktf: '4h' };
    if (!window.__stHawk) window.__stHawk = { sb: null };   // the admin's hawk on the rail: Study stays open while it is the panel
    var res = await P._study({ sym: 'EURUSD', day: '2026-10-01', at: at, draw: [], pd: null, n: 'hb|t1|4h', keep: [FIB], onMine: onMine, noAsk: true, tf: 240, stay: false });
    for (k = 0; k < 60 && !(P._panes()[0] && P._panes()[0].tf === 240); k++) await W(100); await W(400);
    var S = P._s();
    ok('the 4H review: Study on the brief\'s day, chart 1 on the 4H, chart 2 as he had it', res === true && S && !S.live && S.day === '2026-10-01' && C.tfs[0] === 240 && P._panes()[0].tf === 240 && P._panes()[1] && P._panes()[1].tf === 15, [res, S && S.day, C.tfs, P._panes().map(function (p) { return p.tf; })]);
    ok('...his own drawing put away, the hawk\'s read on as an ordinary drawing (not locked, not study-tagged)', !DW.list.some(function (d) { return d.price === MINE.price; }) && DW.list.filter(function (d) { return d.hktf === '4h' && !d.lock && !d.study; }).length === 1, DW.list.map(function (d) { return d.type + ':' + (d.hktf || '') + ':' + (d.lock || d.study || ''); }));
    var errs = []; try { P._drawOv(0); } catch (e) { errs.push(String(e)); }
    ok('the fib with its own words and bands draws', !errs.length, errs);
    // he moves the zone's top: handed back with the next timeframe
    DW.list.filter(function (d) { return d.hktf === '4h'; })[0].b.price = 1.1765;
    var now0 = S.now;
    res = await P._study({ sym: 'EURUSD', day: '2026-10-01', at: at, draw: [], pd: null, n: 'hb|t1|15m', keep: [], onMine: onMine, noAsk: true, tf: 15, stay: true });
    for (k = 0; k < 60 && !(P._panes()[0] && P._panes()[0].tf === 15); k++) await W(100); await W(300);
    var h4 = got.filter(function (g) { return g.n === 'hb|t1|4h'; }).slice(-1)[0];
    ok('the 15M of the same brief: chart 1 on the 15M, Replay stays where it was (no new day load)', res === true && P._s() === S && S.now === now0 && C.tfs[0] === 15 && P._panes()[0].tf === 15, [res, P._s() === S, S.now, now0, C.tfs[0]]);
    ok('...the 4H\'s drawings handed back with his change, not as an end', h4 && !h4.ended && h4.list.length === 1 && h4.list[0].b.price === 1.1765 && h4.list[0].lbls[6] === '4H leg high', h4);
    ok('...and the chart has none of the 4H\'s', !DW.list.some(function (d) { return d.hktf === '4h'; }), DW.list.length);
    var g15 = await P._study({ get: 'hb|t1|15m' }), gOld = await P._study({ get: 'hb|t1|4h' });
    ok('the open timeframe\'s drawings are asked for by its own key only', Array.isArray(g15) && gOld === null, [g15, gOld]);
    // leaving: chart 1 and his own drawings come back, none of the review in his saved Replay drawings
    DW.list.push({ type: 'hline', price: 1.1690, color: '#e0a84a', width: 1, hktf: '15m', hkr: 'mine' });
    await P._study({ end: true }); await W(900);
    var e15 = got.filter(function (g) { return g.n === 'hb|t1|15m'; }).slice(-1)[0];
    ok('Done: the 15M\'s drawings handed back as the end', e15 && e15.ended && e15.list.length === 1, e15);
    ok('...chart 1 back on his own timeframe', C.tfs[0] === 5 && P._panes()[0].tf === 5, [C.tfs[0], P._panes()[0].tf]);
    ok('...his own drawing back, nothing of the review left', DW.list.some(function (d) { return d.price === MINE.price; }) && !DW.list.some(function (d) { return d.hktf || d.study; }), DW.list.map(function (d) { return d.type + ':' + (d.hktf || ''); }));
    await W(1500);
    var leak = Object.keys(localStorage).filter(function (k) { return /^st_practice_draw/.test(k) && (localStorage.getItem(k) || '').indexOf('hktf') >= 0; });
    ok('...and none of it saved with his Replay drawings', !leak.length, leak);
    // he changed chart 1 himself during a review: his choice stays
    await P._study({ sym: 'EURUSD', day: '2026-10-01', at: at, draw: [], pd: null, n: 'hb|t1|1h', keep: [], onMine: onMine, noAsk: true, tf: 60 });
    for (k = 0; k < 60 && !(P._panes()[0] && P._panes()[0].tf === 60); k++) await W(100);
    C.tfs[0] = 240; await P._study({ end: true }); await W(700);
    ok('a timeframe he picks himself during a review stays when it ends', C.tfs[0] === 240, C.tfs[0]);
    C.tfs[0] = 5; try { P._save && P._save(); } catch (e) {}
    // the read: hawk.js's engine on the stand-in candles - a structure, a zone and one of his six phases / places
    if (!(window.STHawk && window.STHawk.engine)) { var s = document.createElement('script'); s.src = 'hawk.js?t=' + Date.now(); document.head.appendChild(s); for (k = 0; k < 100 && !(window.STHawk && window.STHawk.engine); k++) await W(100); }
    var HE = window.STHawk && window.STHawk.engine, t = r1 + 60, sb = window.__stSB;
    var bars = async function (tf, from) { var r = await sb.rpc('st_candles', { p_symbol: 'EURUSD', p_tf: tf, p_from: from, p_to: t }); return ((r && r.data) || []).map(function (x) { return [+x.t, +x.o, +x.h, +x.l, +x.c]; }); };
    var h1 = (await bars(60, t - 80 * 86400)).filter(function (x) { return x[0] + 3600 <= t; }).slice(-1000), m15 = (await bars(15, t - 16 * 86400)).filter(function (x) { return x[0] + 900 <= t; }).slice(-700);
    var B = { '1h': h1, '4h': HE ? HE.agg4(h1) : [], '15m': m15 }, SAID = ['trend up', 'trend down', 'range forming', 'range', 'initiation up', 'initiation down'], LOC = ['premium edge', 'premium middle', '50%', 'discount middle', 'discount edge', 'breakout'];
    var reads = ['4h', '1h', '15m'].map(function (tf) { var rd = HE && HE.read(B, tf, t); if (!rd) return { tf: tf, n: B[tf].length }; var z = HE.zone(rd.st), px = B[tf][B[tf].length - 1][4];
      return { tf: tf, n: B[tf].length, said: HE.said(rd.st), loc: HE.where(rd.st, px), lo: z[0], hi: z[1] }; });
    ok('the engine reads the 4H (from the 1H on the New York grid), the 1H and the 15M', HE && reads.every(function (x) { return x.said && SAID.indexOf(x.said) >= 0 && LOC.indexOf(x.loc) >= 0 && x.hi > x.lo; }), reads);
    ok('...4H candles start on the 17:00 New York grid', HE && B['4h'].length > 100 && B['4h'].every(function (x) { return x[0] % 14400 === 3600 || x[0] % 14400 === 7200; }), B['4h'].slice(-3));
  } catch (e) { ok('no exception', false, String(e && e.stack || e).slice(0, 600)); }
  try { await window.__stPractice._study({ end: true }); } catch (e) {}
  return JSON.stringify(out);
})()
