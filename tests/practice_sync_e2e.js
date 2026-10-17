(async function () {
  // Practice Replay between devices (14 Oct 2026). Nestor: "yes make them sync between devices". A stand-in server holds
  // practice_trades and practice_settings the way the real tables do (own rows, unique client_id, ON CONFLICT DO
  // NOTHING); "another device" is the server already holding trades this browser has never seen.
  // Run: python tests/browser_test.py tests/practice_sync_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var near = function (a, b, tol) { return Math.abs(a - b) <= (tol || 1e-6); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice, C = P._cfg();
    var DB = { practice_trades: [], practice_settings: [], practice_drawings: [] }, calls = [];
    var keyOf = function (table, r) { return table === 'practice_trades' ? (r.user_id + '|' + r.client_id) : (table === 'practice_drawings' ? (r.user_id + '|' + r.sym) : r.user_id); };
    function q(table) {
      var st = { table: table, op: 'select', rows: null, opts: null, eq: {} };
      var b = {
        select: function () { return b; }, order: function () { return b; }, limit: function () { return b; }, eq: function (k, v) { st.eq[k] = v; return b; },
        maybeSingle: function () { st.single = true; return b; },
        upsert: function (rows, opts) { st.op = 'upsert'; st.rows = Array.isArray(rows) ? rows : [rows]; st.opts = opts || {}; return b; },
        then: function (res, rej) {
          calls.push(st.op + ':' + table);
          var T = DB[table];
          if (st.op === 'upsert') {
            st.rows.forEach(function (r) {
              var key = keyOf(table, r);
              var at = -1; T.forEach(function (x, k) { if (keyOf(table, x) === key) at = k; });
              if (at >= 0) { if (!st.opts.ignoreDuplicates) T[at] = Object.assign({}, T[at], r); }
              else T.push(Object.assign({}, r));
            });
            return Promise.resolve({ data: null, error: null }).then(res, rej);
          }
          var mine = T.filter(function (x) { return x.user_id === 'u-1' && Object.keys(st.eq).every(function (k) { return x[k] === st.eq[k]; }); });
          if (table === 'practice_trades') mine = mine.slice().sort(function (a, b) { return Date.parse(b.taken_at) - Date.parse(a.taken_at); });
          return Promise.resolve({ data: st.single ? (mine[0] || null) : mine, error: null }).then(res, rej);
        }
      };
      return b;
    }
    Object.defineProperty(window.__stSB, 'from', { configurable: true, value: function (t) { return q(t); } });
    var hadUser = window.currentUser; window.currentUser = { id: 'u-1' };
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}

    // A trade taken signed out on this browser earlier today
    localStorage.setItem('st_practice_log', JSON.stringify([{ sym: 'EURUSD', day: '2026-10-01', tf: 5, dir: -1, entry: 1.13147, entryTs: 1790839200, exitTs: 1790843940, r: 2, money: 200, why: 'tp', mae: 0.1, parts: 1, at: Date.now() - 60000 }]));
    // ...and on "another device": one trade already on the server, and newer panel settings
    var other = { user_id: 'u-1', client_id: 'phone-abc123', sym: 'XAUUSD', day: '2026-09-15', tf: 5, dir: 1, entry: 2600, entry_ts: 1789000000, exit_ts: 1789003600, r: -1, money: -100, why: 'sl', mae: 1, parts: 1, taken_at: new Date(Date.now() - 30000).toISOString() };
    DB.practice_trades.push(other);
    C.savedAt = Date.now() - 3600000;
    DB.practice_settings.push({ user_id: 'u-1', cfg: Object.assign({}, C, { stopPx: { EURUSD: 0.0007 }, tgtUnit: 'R', tgtR: 3 }), updated_at: new Date().toISOString() });

    // drawings: the phone drew a level on EUR/USD a minute ago; this browser drew a zone on Gold before syncing existed
    var phoneLine = { type: 'hline', price: 1.1324, text: 'from the phone' };
    DB.practice_drawings.push({ user_id: 'u-1', sym: 'EURUSD', items: [phoneLine], updated_at: new Date(Date.now() - 60000).toISOString() });
    DB.practice_drawings.push({ user_id: 'u-1', sym: 'XAUUSD', items: [{ type: 'hline', price: 2650 }], updated_at: new Date(Date.now() - 60000).toISOString() });
    localStorage.setItem('st_practice_draw2:XAUUSD', JSON.stringify([{ type: 'rect', a: { t: 1789000000, price: 2640 }, b: { t: 1789010000, price: 2630 } }]));

    var changed = await P.pull(true);
    var log = P.log();
    ok('a pull reports a change', changed === true);
    ok("this browser's signed-out trade moved to the member and went up once", DB.practice_trades.filter(function (x) { return x.sym === 'EURUSD' && x.r === 2; }).length === 1 && !localStorage.getItem('st_practice_log'), DB.practice_trades.map(function (x) { return x.client_id + ':' + x.r; }));
    ok("the other device's trade came down", log.some(function (t) { return t.cid === 'phone-abc123' && t.r === -1; }) && log.length === 2, log.map(function (t) { return t.cid + ':' + t.r + ':' + t.synced; }));
    ok('both are marked as saved', log.every(function (t) { return t.synced; }));
    C = P._cfg();
    ok("the newer settings from the other device were taken (stop 7 pips, target 3R)", C.stopPx.EURUSD === 0.0007 && C.tgtR === 3, { stop: C.stopPx.EURUSD, tgtR: C.tgtR });
    ok('the Academy box counts both', P.stats().n === 2 && near(P.stats().netR, 1, 1e-9), P.stats());

    // A second pull on the same page does nothing (no extra requests)
    var before = calls.length; var again = await P.pull();
    ok('a second pull on the same page asks nothing', again === false && calls.length === before, calls.slice(before));

    // A new trade here goes up when it closes, once, even if sent twice
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length); k++) await W(100);
    C = P._cfg(); C.tgtOn = true; C.tgtUnit = 'R'; C.tgtR = 2; C.stopPx.EURUSD = 0.0012; C.stopUnit = 'pips';
    P._jump('london'); var g = 0; while (g++ < 60) { var tt = new Date(P._s().now * 1000); if (tt.getHours() === 8 && tt.getMinutes() === 20) break; P._step(); }
    P._place(-1); g = 0; while (P._s().pos && g++ < 400) P._step();
    await W(300);
    var mine = DB.practice_trades.filter(function (x) { return x.sym === 'EURUSD' && x.day === '2026-10-01'; });
    ok('the new trade is on the server once', mine.length === 2 && mine.filter(function (x) { return x.r === 2; }).length === 2, mine.map(function (x) { return x.client_id + ':' + x.r; }));
    await W(300);
    var DW = P._dr();
    ok("the phone's EUR/USD drawing came down when EUR/USD opened", DW.list.length === 1 && DW.list[0].text === 'from the phone', DW.list);
    document.getElementById('stpr-drawbtn').click(); document.querySelector('#stpr-tools [data-tool="hline"]').click();
    var ch = P._panes()[0].el.querySelector('.stpr-pc'), rc = ch.getBoundingClientRect(), cxx = rc.width * 0.7, tg = document.elementFromPoint(rc.left + cxx, rc.top + 150) || ch;   // clear of the open panel at the top left
    tg.dispatchEvent(new MouseEvent('mousedown', { clientX: rc.left + cxx, clientY: rc.top + 150, bubbles: true, cancelable: true, button: 0, buttons: 1 }));
    tg.dispatchEvent(new MouseEvent('mouseup', { clientX: rc.left + cxx, clientY: rc.top + 150, bubbles: true, cancelable: true, button: 0 }));
    await W(1900);
    var srvE = DB.practice_drawings.filter(function (x) { return x.sym === 'EURUSD'; })[0];
    ok('a line drawn here goes up to the server a moment later (both lines, newer stamp)', srvE && srvE.items.length === 2 && Date.parse(srvE.updated_at) > Date.now() - 10000, srvE && srvE.items.length);
    await P._dwPull('XAUUSD'); await W(200);
    var gold = JSON.parse(localStorage.getItem('st_practice_draw2:XAUUSD') || '[]'), srvG = DB.practice_drawings.filter(function (x) { return x.sym === 'XAUUSD'; })[0];
    ok("the first sync of drawings made before syncing keeps both sets, here and on the server", gold.length === 2 && srvG.items.length === 2, [gold.length, srvG.items.length]);
    // a change in the Minimalist Manager panel (17 Oct 2026: it took over the Stop box) goes up a moment later
    P._s().done = null; window.__stPractice._render();
    var sb2 = document.querySelector('#stpr-mm [data-mmi="max"]'); sb2.value = '9.5'; sb2.dispatchEvent(new Event('input', { bubbles: true })); sb2.dispatchEvent(new Event('change', { bubbles: true }));
    await W(1900);
    var sv = DB.practice_settings[0];
    ok("a panel change is saved to the server (Max SL 9.5 pips)", sv && sv.cfg && sv.cfg.mm && sv.cfg.mm.maxSL && Math.abs(sv.cfg.mm.maxSL.EURUSD - 0.00095) < 1e-9, sv && sv.cfg && sv.cfg.mm);
    ok('three trades in the log', P.log().length === 3, P.log().length);

    P.close();
    delete window.__stSB.from; window.currentUser = hadUser;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
