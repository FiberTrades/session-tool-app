(async function () {
  // Finding a market without its MT5 name (Nestor, 23 Oct 2026: "can this asset picker be improved too so its easier to find an
  // asset that i might not know the exact name of it in MT5?"): gold also searches XAU, nasdaq US100 / NAS100 / USTEC...; the
  // broker's descriptions (EA 9.12) show under the results.
  // Run: python tests/browser_test.py tests/wlsearch_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stPractice._wlTerms); i++) await W(100);
    var P = window.__stPractice, tm = P._wlTerms;
    ok('gold also searches XAU', tm('gold').indexOf('XAU') >= 0, tm('gold'));
    ok('nasdaq (and just "nas") also search US100, NAS100 and USTEC', ['US100', 'NAS100', 'USTEC'].every(function (x) { return tm('nas').indexOf(x) >= 0 && tm('nasdaq').indexOf(x) >= 0; }), tm('nas'));
    ok('dax, oil, bitcoin, dow, cable', tm('dax').indexOf('GER40') >= 0 && tm('oil').indexOf('USOIL') >= 0 && tm('bitcoin').indexOf('BTC') >= 0 && tm('dow').indexOf('US30') >= 0 && tm('cable').indexOf('GBPUSD') >= 0);
    ok('two letters search only what was typed', tm('sp').length === 1 && tm('eu').length === 1, [tm('sp'), tm('eu')]);
    ok('at most five searches', tm('nasdaq').length <= 5, tm('nasdaq').length);
    // open Live Charts so its symbols are loaded
    var C = P._cfg(); C.layout = 1; C.tfs = [1, 60, 15, 240]; C.max = false; window.__stLcForce = true;
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (i = 0; i < 250 && !(P._s() && P._s().live && P._panes().length && P._panes()[0].n); i++) await W(100);
    await W(500);
    var key = P._wl().hub;
    P._wlSearch('gold'); await W(400);
    if (!key) {
      var st2 = P._wlSug();
      ok('no hub EA: the stored symbols are searched by every name (gold finds XAUUSD)', (st2.sug || []).some(function (s) { return /^XAU/.test(s); }), st2.sug);
    }
    // the hub's answers, one per search, merged in order: what was typed first, then the market's other names
    P._wlSearch('gold'); await W(50);
    P._wlSymlist({ by: key, q: 'XAU', r: 'XAUUSD,XAUEUR', d: 'Gold vs US Dollar|Gold vs Euro' });
    P._wlSymlist({ by: key, q: 'gold', r: 'GOLD', d: 'Gold Spot' });
    var st = P._wlSug();
    ok('answers for gold and XAU merge, typed word first', JSON.stringify(st.sug) === JSON.stringify(['GOLD', 'XAUUSD', 'XAUEUR']), st.sug);
    ok('...with the broker’s descriptions kept for the list', st.d && st.d.XAUUSD === 'Gold vs US Dollar', st.d);
    P._wlSymlist({ by: key, q: 'silver', r: 'XAGUSD' });
    ok('an answer to a search not asked is ignored', JSON.stringify(P._wlSug().sug) === JSON.stringify(['GOLD', 'XAUUSD', 'XAUEUR']), P._wlSug().sug);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  window.__stLcForce = false;
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
