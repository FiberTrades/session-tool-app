(async function () {
  // The charts' news follows the calendar's countries (Nestor, 19 Oct 2026: "why is the live chart showing me these news from canada
  // when i dont have canada selected as one of the countries of my interest in the economic calendar in session bias?").
  // Back Testing (Live Charts draws the same discs). Real candles of Thu 1 Oct 2026, EUR/USD.
  // Run: python tests/browser_test.py tests/newsccy_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && typeof data !== 'undefined' && data); i++) await W(100);
    await W(1000);
    var P = window.__stPractice, C = P._cfg(); C.layout = 1; C.tfs = [5, 15, 60, 240]; C.mini = false; C.news = true; C.cmp = [];
    data.settings = data.settings || {}; data.settings.calendarFilters = { countries: ['USD', 'EUR', 'GBP'], impacts: ['High', 'Medium', 'Holiday'], dateRange: 'week' };
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._goto('11:00'); await W(400);
    var at = '2026-10-01T08:30:00Z';
    P._news([{ at: at, currency: 'CAD', title: 'CPI m/m', impact: 'High', forecast: '0.2%', previous: '-0.1%', actual: '0.1%' },
             { at: at, currency: 'USD', title: 'Unemployment Claims', impact: 'High', forecast: '230K', previous: '225K', actual: '228K' },
             { at: '2026-10-01T09:00:00Z', currency: 'CAD', title: 'Trimmed CPI y/y', impact: 'High', forecast: '1.9%', previous: '1.9%', actual: '1.8%' }]);
    await W(200); P._drawOv(0);
    var nw = P._panes()[0]._news || [];
    ok('with USD, EUR and GBP picked in the calendar: one disc (08:30, USD only); the CAD-only 09:00 has none', nw.length === 1 && nw[0].n === 1 && nw[0].e.currency === 'USD', nw.map(function (h) { return h.list.map(function (e) { return e.currency; }).join('+'); }));
    data.settings.calendarFilters.countries = ['USD', 'EUR', 'GBP', 'CAD']; P._drawOv(0); nw = P._panes()[0]._news || [];
    ok('...CAD picked too: both candles, 08:30 with its 2 releases', nw.length === 2 && nw.some(function (h) { return h.n === 2; }), nw.map(function (h) { return h.n; }));
    ok('the check itself: CAD out when not picked, USD in', (function () { data.settings.calendarFilters.countries = ['USD', 'EUR', 'GBP']; return window.__stNewsCcyOk('CAD') === false && window.__stNewsCcyOk('usd') === true; })());
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
