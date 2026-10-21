(async function () {
  // The Charts tab with a chart in a window of its own, then another tab and back (Nestor, 21 Oct 2026, helping Aurora: a snapshot, then
  // Session Bias to paste it, and "her charts dissapear from the other monitors, then when she returns to the charts they will all be in
  // one screen"). With a chart out, leaving the tab keeps the charts running; with none out it stops them as before.
  // Run: python tests/browser_test.py tests/charts_tabswitch_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var win = null;
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stLC && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 3; C.tfs = [15, 60, 240, 5]; C.max = false; C.resume = null;
    var tab = function (pg) { var b = document.querySelector('.tab[data-page="' + pg + '"]'); b.click(); };
    window.__stLcForce = true;   // the tests' stand-in for a member signed in: Live Charts in the tab, on the stored prices
    tab('livecharts');
    for (var k = 0; k < 250 && !(P._s() && P._panes().length === 3 && P._panes()[2].n); k++) await W(100);
    ok('the Charts tab: three charts, in the tab', P._s() && P._panes().length === 3 && P._panes()[2].n > 0 && P._lv().inl && document.getElementById('lc-host').contains(document.getElementById('stpr-win')), [P._panes().length, P._lv().inl]);
    P._panes()[2].el.querySelector('[data-popc]').click();
    for (k = 0; k < 150 && !(P._pops()[2] && P._pops()[2].ready && P._panes()[2] && P._panes()[2].el.ownerDocument !== document && P._panes()[2].n); k++) await W(100);
    win = P._pops()[2] && P._pops()[2].w;
    ok('chart 3 in a window of its own', !!win && P._panes()[2].el.ownerDocument === win.document);
    tab('bias'); await W(1500);
    var o = P._pops()[2];
    ok('Session Bias: that window is still open with its chart in it (the charts keep running)', !!P._s() && !!o && o.ready && !o.w.closed && P._panes()[2] && P._panes()[2].el.ownerDocument === o.w.document && P._panes()[2].n > 0, [!!P._s(), !!o, o && o.ready]);
    tab('livecharts'); await W(1200);
    o = P._pops()[2];
    ok('back in Charts: the same three, chart 3 still in its window', !!P._s() && P._panes().length === 3 && !!o && !o.w.closed && P._panes()[2].el.ownerDocument === o.w.document && P._panes()[0].el.ownerDocument === document, P._panes().length);
    ok('...and the charts here are on screen', P._panes()[0].el.getBoundingClientRect().width > 100);
    // none out: leaving the tab stops the charts as before
    P._unpop(2); await W(800);
    tab('bias'); await W(800);
    ok('no chart out: leaving the tab stops them as before', !P._s() || !document.getElementById('page-livecharts').classList.contains('active'), !!P._s());
    tab('livecharts'); await W(1500);
    for (k = 0; k < 100 && !(P._s() && P._panes().length === 3); k++) await W(100);
    ok('...and back in Charts they come back', !!P._s() && P._panes().length === 3);
    window.__stLcForce = false;
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { if (win && !win.closed) win.close(); } catch (e) {}
  return JSON.stringify(out);
})()
