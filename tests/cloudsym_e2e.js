(async function () {
  // A symbol opened in Live Charts on a cloud account gets its EA chart on the server by itself (Nestor, 24 Oct 2026: "whats the point
  // of this being here in settings when i can just do it all on the chart" -> "ok"), and the Charts row in Settings is gone.
  // The database is a stand-in: the cloud row is fed in, st_cloud_set_symbols is caught, nothing is written.
  // Run: python tests/browser_test.py tests/cloudsym_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stMt5c && window.__stSB && window.__stCloudWantSym && window.__stPractice && window.__stAccFill); i++) await W(100);
    await W(1200);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"]').forEach(function (e) { e.remove(); });
    var LG = '1520001111', rows = [{ id: 'c1', login: +LG, server: 'FTMO-Demo', status: 'running', status_at: new Date().toISOString(), app_trading: true, created_at: new Date().toISOString(), symbols: ['EURUSD', 'XAUUSD'] }];
    var calls = [], realFrom = window.__stSB.from.bind(window.__stSB), realRpc = window.__stSB.rpc;
    var chain = function (val) { var p = Promise.resolve(val); ['select', 'eq', 'order', 'limit', 'in'].forEach(function (m) { p[m] = function () { return p; }; }); return p; };
    window.__stSB.from = function (t) { if (t === 'cloud_mt5') return { select: function () { return chain({ data: rows.slice(), error: null }); } }; return realFrom(t); };
    window.__stSB.rpc = function (fn, a) { if (fn === 'st_cloud_set_symbols') { calls.push(a); return Promise.resolve({ data: true, error: null }); } return realRpc.apply(window.__stSB, arguments); };
    window.currentUser = { id: '00000000-0000-0000-0000-0000000000c5', email: 'member@example.com' };
    window.__stMt5c.clLoad(); for (i = 0; i < 40 && !window.__stMt5c.cloud().length; i++) await W(100);
    ok('the cloud account is known', window.__stMt5c.cloud().length === 1);
    // the helper
    var r1 = window.__stCloudWantSym(LG, 'GBPUSD'); await W(100);
    ok('a symbol it has no chart for: added to the server list (EURUSD, XAUUSD, GBPUSD)', r1 === 'added' && calls.length === 1 && calls[0].p_id === 'c1' && calls[0].p_symbols.join() === 'EURUSD,XAUUSD,GBPUSD', [r1, calls]);
    var r2 = window.__stCloudWantSym(LG, 'GBPUSD'); await W(50);
    ok('...asked again: already there, nothing sent', r2 === 'has' && calls.length === 1, [r2, calls.length]);
    ok('an account not in the cloud: nothing', window.__stCloudWantSym('541419576', 'GBPUSD') === 'none' && calls.length === 1);
    ok('a name that is not a symbol: nothing', window.__stCloudWantSym(LG, 'GBP USD') === 'none' && calls.length === 1);
    var full = []; for (i = 0; i < 20; i++) full.push('S' + i);
    window.__stMt5c.cloud()[0].symbols = full.slice();
    var r3 = window.__stCloudWantSym(LG, 'NZDUSD'); await W(50);
    var last = calls[calls.length - 1];
    ok('20 charts already: the oldest makes room (still 20, NZDUSD last, S0 gone)', r3 === 'added' && last.p_symbols.length === 20 && last.p_symbols[19] === 'NZDUSD' && last.p_symbols[0] === 'S1', last && last.p_symbols);
    window.__stMt5c.cloud()[0].symbols = ['EURUSD', 'XAUUSD'];
    // Live Charts: the hub feeding a cloud account's chart asks for its own EA chart, once
    var P = window.__stPractice, n0 = calls.length;
    var r4 = P._cloudSym({ raw: 'AUDUSD', lg: LG, v: '9.13', hub: 'EURUSD|' + LG });
    var r5 = P._cloudSym({ raw: 'AUDUSD', lg: LG, v: '9.13', hub: 'EURUSD|' + LG }); await W(100);
    ok('Live Charts, a symbol the hub streams for a cloud account: added once (not twice)', r4 === 'added' && r5 === 'added' && calls.length === n0 + 1 && calls[n0].p_symbols.join() === 'EURUSD,XAUUSD,AUDUSD', [r4, r5, calls.length - n0, calls[n0]]);
    var fl = document.getElementById('stpr-flash');
    ok('...and says so on the chart', !fl || /Opening AUDUSD on your cloud MT5/.test(fl.textContent), fl && fl.textContent);
    ok('Live Charts, a PC account: nothing asked', P._cloudSym({ raw: 'AUDUSD', lg: '541419576', v: '9.13', hub: 'EURUSD|541419576' }) === 'none' && calls.length === n0 + 1);
    // EA 9.14 (24 Oct 2026, "make it seamless"): one of that account's EAs opens the chart in its MT5 itself - the signed 'chart' command
    var acctCalls = [], realAcct = window.__stTM.acct, eL = window.__stLiveLine.easL();
    window.__stTM.acct = function (o) { acctCalls.push(o); return Promise.resolve({ ok: true }); };
    eL['EURUSD|' + LG] = { v: '9.14', lg: LG, rl: true, al: true, tm: 0, at: Date.now() };
    var n1 = calls.length;
    var r6 = P._cloudSym({ raw: 'CADJPY', lg: LG, v: '9.14', hub: 'EURUSD|' + LG }); await W(200);
    ok('EA 9.14 on that account: the chart command to its EURUSD EA to open CADJPY (App trading not needed), the list still saved',
      r6 === 'added' && acctCalls.length === 1 && acctCalls[0].a === 'chart' && acctCalls[0].sym === 'EURUSD' && acctCalls[0].login === LG && acctCalls[0].cp === 'CADJPY' && acctCalls[0].minV === 9.14 && acctCalls[0].anyTm === true && calls.length === n1 + 1,
      [r6, acctCalls, calls.length - n1]);
    fl = document.getElementById('stpr-flash');
    ok('...nothing on the chart about it (24 Oct 2026, instant open: the hub prices show meanwhile), no restart', !fl || !fl.classList.contains('show') || !/CADJPY/.test(fl.textContent), fl && fl.textContent);
    window.__stTM.acct = function (o) { acctCalls.push(o); return Promise.resolve({ ok: false, why: 'tpl 5019' }); };
    P._cloudSym({ raw: 'NZDJPY', lg: LG, v: '9.14', hub: 'EURUSD|' + LG }); await W(250);
    ok('...the EA could not open it: the restart message, as before 9.14 (the server restarts that MT5)', acctCalls.length === 2 && (!fl || /restarts for a moment/.test(fl.textContent)), fl && fl.textContent);
    eL['EURUSD|' + LG].v = '9.13'; window.__stTM.acct = function (o) { acctCalls.push(o); return Promise.resolve({ ok: true }); };
    P._cloudSym({ raw: 'AUDNZD', lg: LG, v: '9.13', hub: 'EURUSD|' + LG }); await W(200);
    ok('only EAs before 9.14: no chart command, the restart message straight away', acctCalls.length === 2 && (!fl || /Opening AUDNZD on your cloud MT5/.test(fl.textContent)), fl && fl.textContent);
    delete eL['EURUSD|' + LG]; window.__stTM.acct = realAcct;
    // Settings: no Charts row in the account's MT5 part
    var D = STCloud.getData(), acc = window.__stCreateAccount('FTMO Demo', 10000); D.mt5LoginMap = D.mt5LoginMap || {}; D.mt5LoginMap[LG] = acc.id;
    window.__stAccOpenId = acc.id;
    document.getElementById('settings-gear').click(); await W(700);
    document.querySelector('#settings-modal-bg .settings-nav-item[data-section="accounts"]').click(); await W(900);
    window.__stAccFill(); await W(300);
    var it = document.querySelector('.sacc-item[data-account-id="' + acc.id + '"]'), m = it && it.querySelector('[data-slot="mt5"]');
    ok('Settings, that account\'s MT5 part: no Charts row, no symbol box (the cloud line is still there)', m && /MT5 1520001111/.test(m.textContent) && !m.querySelector('[data-sacc-symin], .sacc-syms') && !/One EA chart each/.test(m.textContent), m && m.textContent.slice(0, 300));
    window.__stSB.from = realFrom; window.__stSB.rpc = realRpc;
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
