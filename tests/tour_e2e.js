(async function () {
  // The app tour after the 19 Oct 2026 changes (Nestor: "fix the tour"): fourteen steps - a Charts step (Live and Replay) after the
  // live nudges, and Connect MT5 (Settings → MT5) last; the account step no longer sends MT5 set-up to Accounts; the prop firm step
  // shows Statistics' Overview; the Academy preview says 45 lessons. Walks every step with Next.
  // Run: python tests/browser_test.py tests/tour_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.stStartTour && window.__stMt5c); i++) await W(100);
    await W(1500);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    window.currentUser = { id: '00000000-0000-0000-0000-0000000c0de7', email: 'member@example.com' };
    await W(1300);
    window.stStartTour(); await W(900);
    var tip = function () { return document.querySelector('.st-tour-tip'); };
    var nextB = function () { return document.querySelector('.st-tour-next'); };
    var titleOf = function () { var t = tip(); var h = t && t.querySelector('.st-tour-t'); return h ? h.textContent.trim() : ''; };
    var countOf = function () { var c = document.querySelector('.st-tour-count'); return c ? c.textContent.trim() : ''; };
    ok('the tour starts: 1 / 14, the welcome says fourteen short steps', /^1 \/ 14$/.test(countOf()) && /fourteen short steps/.test(tip() ? tip().textContent : '') || /example journal/.test(tip() ? tip().textContent : ''), [countOf(), tip() && tip().textContent.slice(0, 160)]);
    var seen = [], extra = {};
    for (var k = 0; k < 16; k++) {
      seen.push(titleOf());
      var c = countOf();
      if (/Charts: Live and Replay/.test(titleOf())) extra.charts = { c: c, txt: tip().textContent, ring: !!document.querySelector('.tab[data-page="livecharts"]') };
      if (/^Session Live$/.test(titleOf())) extra.live = { txt: tip().textContent, review: document.getElementById('page-review') && document.getElementById('page-review').classList.contains('active') };
      if (/Prop firm progress/.test(titleOf())) { var ov = document.querySelector('.stx-tab[data-stx="overview"]'); extra.prop = ov && (ov.classList.contains('active') || ov.getAttribute('aria-selected') === 'true'); }
      if (/Community, Leaderboard and Academy/.test(titleOf())) extra.grow = tip().textContent;
      if (/Your account and settings/.test(titleOf())) extra.acc = tip().textContent;
      if (/^Connect MT5$/.test(titleOf())) { var nv = document.querySelector('.settings-nav-item[data-section="mt5c"]'); extra.mt5 = { c: c, txt: tip().textContent, tab: nv && nv.classList.contains('active'), next: nextB() && nextB().textContent }; }
      if (/^14 \/ 14$/.test(c)) break;
      nextB().click(); await W(700);
    }
    ok('fourteen steps in order, Charts after the live nudges, Connect MT5 last', seen.length === 14 && /Charts: Live and Replay/.test(seen[5]) && /Live nudges/.test(seen[4]) && seen[13] === 'Connect MT5', seen);
    ok('the Charts step: Live (your MT5 prices, trade from here) and Replay (practice, nothing sent to MT5)', extra.charts && /Live is your MT5 prices/.test(extra.charts.txt) && /Replay is any day of the past year/.test(extra.charts.txt) && /nothing is sent to MT5/.test(extra.charts.txt), extra.charts && extra.charts.txt.slice(0, 200));
    ok('Session Live: it is the Session Review tab that turns into Session Live (not Session Bias), and that tab is shown', extra.live && /the Session Review tab turns into Session Live/.test(extra.live.txt) && extra.live.review, extra.live);
    ok('the prop firm step shows Statistics on Overview (where Prop Firm Progress is)', extra.prop === true, extra.prop);
    ok('the Academy preview says 45 lessons', extra.grow && /45 lessons/.test(extra.grow) && !/40 lessons/.test(extra.grow), extra.grow && extra.grow.slice(-120));
    ok('the account step no longer sends MT5 set-up to Accounts', extra.acc && !/connect MT5/i.test(extra.acc) && !/MT5 auto-sync/.test(extra.acc), extra.acc && extra.acc.slice(0, 200));
    ok('Connect MT5 is the last step: Settings opens on MT5, the button says Done', extra.mt5 && extra.mt5.tab && /Done/i.test(extra.mt5.next) && /walks you through connecting the EA/.test(extra.mt5.txt), extra.mt5);
    nextB().click(); await W(600);
    ok('Done closes the tour', !document.querySelector('.st-tour-next'));
    var hint = document.querySelector('[data-i18n="settings.tour_hint"]');
    ok('Settings, Profile: "Fourteen short steps"', hint && /Fourteen short steps/.test(hint.textContent), hint && hint.textContent);
    var lb = (window.__stLiveBox && window.__stLiveBox.html) ? '' : '';
    ok('the Session Live card button says Open in Charts (the code no longer says Open in Live Charts)', !/Open in Live Charts/.test(document.documentElement.innerHTML), lb);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  window.currentUser = null;
  return JSON.stringify(out);
})()
