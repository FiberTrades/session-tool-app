// End-to-end test (2 Nov 2026), through the real app: per-broker candles (the account in view reads its broker's feed, and until a feed holds
// anything every read goes out exactly as it always did) and a copy a Follow account refused (EA 9.19's report, shown at once).
//   python tests/feeds_run.py      (starts the stand-in EAs, then this test)
// Signed out, a test sync token; the candle store is tests/candle_stub.py (a read with a p_feed comes back 0.1% higher, so it can be seen on the chart).
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB && window.__stFeed && window.__stCopyFail); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    window.addEventListener('unhandledrejection', function (e) { errs.push('rejected: ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 300)); });
    var P = window.__stPractice, LC = window.__stLC, F = window.__stFeed, CF = window.__stCopyFail, ST = window.__stCandleStub, k;
    var T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000;
    P._lvClock(T0 * 1000 - Date.now());
    window.__stLcForce = true; await W(1200);
    window.STCloud.syncToken = 'st-test-feeds-e2e';
    window.__stRelayURL = '__RELAY__';
    try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15]; C.syms = []; C.mini = false; C.resume = null; C.lvLg = '90001234'; } catch (e) {}
    var acc0 = (data.accounts || [])[0] || {};
    var mk = function (id, name) { return Object.assign(JSON.parse(JSON.stringify(acc0)), { id: id, name: name, kind: 'challenge', status: 'active', separate: false }); };
    data.accounts.push(mk('acc-70', 'FTMO 70K - Challenge'), mk('acc-of', 'OneFunded 10K - Challenge'), mk('acc-tt', 'TTT 10K - Challenge'));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-70', '90007777': 'acc-of', '90003333': 'acc-tt' });
    var now = function () { return new Date(Date.now()).toISOString(); };
    var eaRow = function (lg, srv, role, lead, n) { window.__stEA.apply({ login: lg, symbol: 'EURUSD', ea_version: '9.19', updated_at: now(), settings: { server: srv, company: srv, copy_role: role, copy_lead: lead, copy_followers: n, currency: 'GBP' } }); };
    eaRow('90001234', 'FTMO-Server4', 'lead', '', 2); eaRow('90007777', 'OneFunded-Trade', 'follow', '90001234', 0); eaRow('90003333', 'TTTMarkets-Ltd', 'follow', '90001234', 0);
    // the store lists no feed yet
    var calls = ST.calls = [];
    F._set([]);
    document.querySelector('.tab[data-page="livecharts"]').click();
    var st; for (k = 0; k < 120; k++) { await W(250); st = LC.state(); if (st.live && st.ea && st.fresh) break; }
    check('the chart opens on a stand-in EA', st && st.live && st.ea, st && st.ea);
    await W(2500);
    var noFeed = calls.filter(function (c) { return c.fn === 'st_candles' || c.fn === 'st_candles_before'; });
    check('NO feed listed: reads went out', noFeed.length > 0, noFeed.length);
    check('...every one exactly as before: only p_symbol, p_tf, p_from, p_to (or p_before, p_n)', noFeed.every(function (c) { return !('p_feed' in c.args) && !('p_fsym' in c.args); }), noFeed.slice(0, 2));
    var bar = function () { var p = P._panes ? P._panes()[0] : null; return p && p.hist && p.hist.rows && p.hist.rows.length ? p.hist.rows[p.hist.rows.length - 1].close : null; };
    var fk = function () { var p = P._panes ? P._panes()[0] : null; return p && p.hist ? (p.hist.fk || '') : null; };
    var close0 = bar();
    check('...the chart has its history (the stored candles before the day)', close0 > 0, close0);
    check('...its cache key has nothing added', fk() === '', fk());

    // the account's feed lands: the next look reads that broker's, in place, no reload
    calls.length = 0;
    var S0 = LC.state().win;
    F._set(['ftmo-server4']);
    for (k = 0; k < 90 && fk() !== '|ftmo-server4'; k++) await W(250);
    var withFeed = calls.filter(function (c) { return c.fn === 'st_candles'; });
    check('a feed lands for the account in view: the chart reads it, the view kept (statHeal, at most 15 s)', fk() === '|ftmo-server4' && withFeed.some(function (c) { return c.args.p_feed === 'ftmo-server4'; }), [fk(), withFeed.slice(0, 1)]);
    var close1 = bar();
    check('...and shows that broker\'s prices (the stand-in\'s feed reads 0.1% higher)', close1 > close0 * 1.0005, [close0, close1]);

    // another account picked in Trade with: its feed when it has one, else as before
    calls.length = 0;
    F._set(['ftmo-server4', 'onefunded-trade']);
    document.querySelector('#stpr-mm [data-mm="acct"]').click(); await W(1200);
    var row = document.querySelector('#stpr-menu [data-lvacc="90007777"]');
    check('Trade with lists the Follow', !!row, !!row);
    if (row) row.click();
    for (k = 0; k < 40 && fk() !== '|onefunded-trade'; k++) await W(250);
    check('picking OneFunded: its own feed is read, at once and without a reload', fk() === '|onefunded-trade' && calls.some(function (c) { return c.fn === 'st_candles' && c.args.p_feed === 'onefunded-trade'; }), [fk(), calls.length]);

    // back: from the cache, no second read of the same thing
    document.querySelector('#stpr-mm [data-mm="acct"]').click(); await W(600);
    calls.length = 0;
    document.querySelector('#stpr-menu [data-lvacc="90001234"]').click();
    for (k = 0; k < 40 && fk() !== '|ftmo-server4'; k++) await W(250);
    check('back to the 70K: its history again', fk() === '|ftmo-server4' && Math.abs(bar() - close1) < 1e-9, [fk(), bar(), close1]);

    // no feed for anybody again: identical to where it started
    F._set([]);
    for (k = 0; k < 90 && fk() !== ''; k++) await W(250);
    check('feeds gone: the same candles as before any of this', fk() === '' && Math.abs(bar() - close0) < 1e-9, [fk(), bar(), close0]);

    // a volume ask and Trade Replay's own reads: same helper; args for a login with no server stay empty
    F._set(['onefunded-trade'], { '555': 'OneFunded-Trade' });
    check('args: a login on a listed feed', JSON.stringify(F.args('555', 'EURUSD')) === '{"p_feed":"onefunded-trade"}', F.args('555', 'EURUSD'));
    check('args: a login on no listed feed sends nothing', F.args('90009999', 'EURUSD') === null, F.args('90009999', 'EURUSD'));
    check('args: no login sends nothing', F.args('', 'EURUSD') === null);
    window.__stEA.apply({ login: '556', symbol: 'EURUSD.x', ea_version: '9.19', updated_at: now(), settings: { server: 'OneFunded-Trade' } });
    check('args: a broker with another name for the symbol', JSON.stringify(F.args('556', 'EURUSD')) === '{"p_feed":"onefunded-trade","p_fsym":"EURUSD.x"}', F.args('556', 'EURUSD'));
    F._set([]);

    // ---------------- a copy refused ----------------
    window._voiceSignedIn = function () { return true; }; try { _voiceSignedIn = window._voiceSignedIn; } catch (e) {}
    var openedAt = now();
    var L = window.__stLive;
    L.upsert({ ticket: 555001, symbol: 'EURUSD', direction: 'long', opened_at: openedAt, login: '90001234', lots: 1, risk: 500 });
    L.upsert({ ticket: 555002, symbol: 'EURUSD', direction: 'long', opened_at: openedAt, login: '90003333', lots: 1, risk: 70 });
    var row1 = { user_id: 'u', login: '90007777', ticket: '555001', lead: '90001234', symbol: 'EURUSD', direction: 'long', lots: 1.11, retcode: 10026, kind: 'refused', why: 'EURUSD refused - AutoTrading disabled by server', at: now() };
    var want = 'Copied to 1 of 2: OneFunded 10K refused it, the broker blocks EA trading';
    CF.apply(row1); await W(400);
    check('the sentence, for the trade', CF.line('555001') === want, CF.line('555001'));
    check('a nudge at once (a trade alert), the reason in plain words', /OneFunded 10K didn.t copy your EURUSD long: the broker blocks EA trading\./.test((document.querySelector('#st-nudge') || {}).textContent || ''), ((document.querySelector('#st-nudge') || {}).textContent || '').slice(0, 160));
    // a second report of the same trade: no second nudge
    var n0 = document.querySelectorAll('#st-nudge .st-nudge-list li').length; CF.apply(row1); await W(200);
    check('...once', document.querySelectorAll('#st-nudge .st-nudge-list li').length === n0, [n0]);
    var KEEP = '__KEEP__' === '1';   // feeds_run.py with ST_FEEDS_SHOT: the page left as it is, for a picture
    if (!KEEP) try { window.__stNudge.ack(true); } catch (e) {}
    // Session Live's row
    window.isSessionLive = function () { return true; }; try { isSessionLive = window.isSessionLive; } catch (e) {}
    L.render(); await W(200); var live = document.querySelector('#st-live-feed .stlf-note.cf'), chipC = document.querySelector('#st-live-feed .stlf-copies');
    check('Session Live: the trade\'s row reads it, and the copies chip is amber', live && live.textContent === want && chipC && chipC.classList.contains('miss'), [live && live.textContent, chipC && chipC.className]);
    // the Toolbox's trade row
    var TB = (P._tb || LC._tb)(); TB.tab = 'hist'; TB.acct = { by: TB.acct && TB.acct.by, pos: '555001,EURUSD,' + Math.floor(T0) + ',buy,1.00,1.16400,1.16200,1.16800,1.16420,20.00,0,0;', ord: '', bal: 70000, eq: 70020, fm: 69000, cur: 'GBP', mg: 1000, ml: 7000 };
    var tbBtn = document.querySelector('#lc-tb [data-lctb="trade"]'); if (tbBtn) tbBtn.click();   /* painted at once: the stand-in's next account message has no trade on it */
    var tbn = document.querySelector('#lc-tb .lctb-cfn td');
    check('the Toolbox: the sentence under the trade\'s row', tbn && tbn.textContent === want, tbn && tbn.textContent);
    // Trade with
    document.querySelector('#stpr-mm [data-mm="acct"]').click(); await W(1200);
    var mn = document.getElementById('stpr-menu'), line = mn.querySelector('.stpr-twcf'), ofRow = mn.querySelector('[data-lvacc="90007777"]');
    check('Trade with: the sentence over the accounts', line && line.textContent === want, line && line.textContent);
    check('...OneFunded\'s chip says REFUSED', ofRow && /REFUSED/.test((ofRow.querySelector('.stpr-twc') || {}).textContent || ''), ofRow && ofRow.textContent);
    await W(300);
    if (KEEP) { var svMenu = 1; return results; }
    // all refused, other reasons, Spanish
    check('every copy refused says so', CF.lineOf([row1, Object.assign({}, row1, { login: '90003333', retcode: 10019, why: 'EURUSD refused - No money' })]) === 'Not copied: OneFunded 10K refused it, the broker blocks EA trading; TTT 10K refused it, there isn’t enough free margin', CF.lineOf([row1, Object.assign({}, row1, { login: '90003333', retcode: 10019 })]));
    check('an EA skip in its own words', CF.reason({ retcode: 0, kind: 'skip', why: 'EURUSD skipped - lot too small for this risk' }) === 'the lot would be too small for its risk', CF.reason({ retcode: 0, why: 'EURUSD skipped - lot too small for this risk' }));
    check('a retcode nobody listed: the broker\'s own words', CF.reason({ retcode: 10999, why: 'EURUSD refused - Something odd' }) === 'Something odd', CF.reason({ retcode: 10999, why: 'EURUSD refused - Something odd' }));
    // taken back
    CF.remove({ login: '90007777', ticket: '555001' }); await W(200);
    check('taken back: gone', CF.line('555001') === '', CF.line('555001'));
    check('no script errors', errs.length === 0, errs.slice(0, 4));
  } catch (e) { results.push({ name: 'threw', ok: false, got: String(e && e.stack || e) }); }
  return results;
})();
