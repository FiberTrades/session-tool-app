(async function () {
  // One Charts tab (Nestor, 19 Oct 2026): every member signed in has it, Live and Replay. Live was his alone, then behind an admin
  // switch; that evening he opened it to everyone and had the switch removed ("keep it on for everyone and delete this button").
  // Signed out there is no tab. (A stand-in member: window.currentUser set by hand, nothing is signed in.)
  // Run: python tests/browser_test.py tests/charts_member_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stLC && window.__stSB); i++) await W(100);
    await W(800);
    try { Array.prototype.forEach.call(document.querySelectorAll('[class^="st-tour"]'), function (e) { e.remove(); }); } catch (e) {}
    var tab = document.querySelector('.tab[data-page="livecharts"]');
    ok('signed out: no Charts tab, no Live', getComputedStyle(tab).display === 'none' && !document.body.classList.contains('st-charts-on') && !document.body.classList.contains('st-lc-on') && !window.__stLcAllowed());
    window.currentUser = { id: '00000000-0000-0000-0000-00000000c0de', email: 'member@example.com' };
    await W(1300);
    ok('a member signed in: the Charts tab shows (called Charts) with Live (st-lc-on)', getComputedStyle(tab).display !== 'none' && /Charts/.test(tab.textContent) && document.body.classList.contains('st-charts-on') && document.body.classList.contains('st-lc-on') && window.__stLcAllowed(), tab.textContent);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    tab.click(); await W(1500);
    var win = document.getElementById('stpr-win');
    // no switch above the chart on any device (29 Oct 2026): Live's top bar has Replay, Replay's header has Live; the member has Live (lcm-ok)
    var pgl = document.getElementById('page-livecharts');
    ok("the tab opens on Live, Live and Replay the member's (no switch above the chart: Replay is in the chart)", !document.getElementById('lc-mode') && pgl.classList.contains('lcm-ok') && !pgl.classList.contains('lcm-replay') && win.parentNode.id === 'lc-host' && win.classList.contains('lc'), [pgl.className, win.className]);
    ok('...the page titled Charts', document.getElementById('header-mode').textContent === 'Charts', document.getElementById('header-mode').textContent);
    ok('the Academy has no Back Testing box', !document.getElementById('vault-hub-practice'));
    ok('Settings has no "Live Charts for everyone" switch any more', !document.getElementById('admin-lcall') && !document.getElementById('admin-lcall-btn'));
    window.currentUser = null; await W(1300);
    ok('signed out again: the tab goes and the page moves off it', getComputedStyle(tab).display === 'none' && !tab.classList.contains('active') && !document.body.classList.contains('st-lc-on'));
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
