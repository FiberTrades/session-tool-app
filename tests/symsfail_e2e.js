// End-to-end test (Nestor, 3 Nov 2026: "why is the 1m chart looking like this?"): the list of what is stored times out once, as the charts open.
//   python tests/symsfail_run.py
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB && window.__stFeed); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var P = window.__stPractice, LC = window.__stLC, k;
    var T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000;
    P._lvClock(T0 * 1000 - Date.now());
    window.__stLcForce = true; await W(1200);
    window.STCloud.syncToken = 'st-test-symsfail-e2e';
    window.__stRelayURL = '__RELAY__';
    var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [1]; C.syms = []; C.mini = false; C.resume = null; C.lvLg = '90001234';
    // the list fails, nothing saved from before
    var fail = true, asked = 0, real = window.fetch;
    window.fetch = function (u, o) { if (/st_candle_symbols/.test(String(u && u.url || u))) { asked++; if (fail) return Promise.resolve(new Response('{"message":"canceling statement due to statement timeout"}', { status: 500, headers: { 'content-type': 'application/json' } })); } return real.apply(this, arguments); };
    localStorage.removeItem('st_practice_syms'); P._symsReset();
    document.querySelector('.tab[data-page="livecharts"]').click();
    var st; for (k = 0; k < 120; k++) { await W(250); st = LC.state(); if (st.live && st.ea && st.fresh) break; }
    check('the chart opens with the list failing', st && st.live, st);
    await W(1500);
    var rows = function () { var q = P._panes()[0]; return q && q.hist && q.hist.rows ? q.hist.rows.length : 0; };
    var thin = rows();
    check('...its 1-minute history is thin: what you saw', thin < 500, thin);
    var a0 = asked;
    // the store answers again: no reload, no click
    fail = false;
    for (k = 0; k < 100 && rows() < 500; k++) await W(250);
    check('the list is asked for again', asked > a0, asked);
    check('...and the 1-minute chart gets its stored history by itself', rows() >= 500, rows());
    var pc = P._panes()[0]; check('...on the chart', pc && pc.static && pc.static.length >= 500, pc && pc.static && pc.static.length);
    var n1 = asked; await W(16500); check('...and it stops asking', asked === n1, asked - n1);
    // a list older than 6 hours, the store not answering: last time's, never the stand-in
    var c = JSON.parse(localStorage.getItem('st_practice_syms')); c.at = Date.now() - 7 * 3600000; localStorage.setItem('st_practice_syms', JSON.stringify(c));
    fail = true; P._symsReset(); var L = await P._loadSymbols(), eu = L.filter(function (x) { return x.key === 'EURUSD'; })[0];
    check('an old saved list is used when the store fails, 1-minute included', eu && eu.tf[1] && L.length > 2, eu && Object.keys(eu.tf));
    fail = false; for (k = 0; k < 80 && JSON.parse(localStorage.getItem('st_practice_syms')).at < Date.now() - 3600000; k++) await W(250);
    check('...and saved fresh once the store answers', JSON.parse(localStorage.getItem('st_practice_syms')).at > Date.now() - 3600000);
    window.fetch = real;
  } catch (e) { check('no exception', false, String(e && e.stack || e)); }
  return results;
})();
