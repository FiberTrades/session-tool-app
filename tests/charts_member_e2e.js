(async function () {
  // One Charts tab (Nestor, 19 Oct 2026): every member signed in has it - Replay (Back Testing until then) for all, Live only for the
  // owner until he turns "Live Charts for everyone" on. A member without Live: the tab opens straight on Replay, no Live | Replay
  // switch, the Academy has no Back Testing box. (A stand-in member: window.currentUser set by hand, nothing is signed in.)
  // Run: python tests/browser_test.py tests/charts_member_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stLC && window.__stSB); i++) await W(100);
    await W(800);
    try { Array.prototype.forEach.call(document.querySelectorAll('[class^="st-tour"]'), function (e) { e.remove(); }); } catch (e) {}
    var tab = document.querySelector('.tab[data-page="livecharts"]');
    ok('signed out: no Charts tab', getComputedStyle(tab).display === 'none' && !document.body.classList.contains('st-charts-on'));
    window.currentUser = { id: '00000000-0000-0000-0000-00000000c0de', email: 'member@example.com' };
    await W(1300);
    ok('a member signed in: the Charts tab shows (called Charts), Live does not (st-lc-on off)', getComputedStyle(tab).display !== 'none' && /Charts/.test(tab.textContent) && document.body.classList.contains('st-charts-on') && !document.body.classList.contains('st-lc-on') && !window.__stLcAllowed(), tab.textContent);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    tab.click();
    var P = window.__stPractice, S = null; for (var k = 0; k < 120; k++) { await W(150); S = P._s(); if (S && !S.live && P._panes().length && P._panes()[0].n) break; }
    await W(600);
    var win = document.getElementById('stpr-win'), chip = document.getElementById('stpr-chip'), mode = document.getElementById('lc-mode');
    ok('the tab opens straight on Replay: a past day in the page (REPLAY label, the day row and the play bar), not live', S && !S.live && win.parentNode.id === 'lc-host' && win.classList.contains('lcp') && chip.textContent === 'Replay' && getComputedStyle(document.querySelector('.stpr-cb')).display !== 'none', [S && S.day, win.className, chip.textContent]);
    ok('...no Live | Replay switch for a member without Live', mode && mode.hidden && getComputedStyle(mode).display === 'none');
    ok('...the page titled Charts', document.getElementById('header-mode').textContent === 'Charts', document.getElementById('header-mode').textContent);
    ok('the Academy has no Back Testing box', !document.getElementById('vault-hub-practice'));
    window.currentUser = null;
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
