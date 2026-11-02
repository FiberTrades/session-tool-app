(async function () {
  // The Overview stat cards on a phone (Nestor, 1 Nov 2026: "The information inside the boxes looks very scattered, fix it."): the label, the value straight under it, the note under that, the small
  // chart in the same corner, the same in every card. Run: E2E_MOBILE=375x812 python tests/browser_test.py tests/statscards_e2e.js (also passes on a computer, where the phone checks are skipped)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 100 && typeof newAccountBlank !== 'function'; i++) await W(100);
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
    var A = newAccountBlank('FTMO 70K', 70000, 'challenge'); A.kind = 'challenge'; A.currency = 'GBP';
    var B = newAccountBlank('TTT', 20000, 'challenge'); B.kind = 'challenge'; B.currency = 'USD';
    data.accounts = [A, B]; data.activeAccountId = A.id; data.viewScope = 'lifetime'; data.history = []; data.reviewSlots = null; data.review = { trades: [] }; data.settings.statsPeriod = 'all';
    var n = 0, res = [500, -200, 300, -100, 0, 0, -500, 1500, -500, 0, -500, 250];
    data.currentSeries = res.map(function (g) { n++; var d = new Date(); d.setDate(d.getDate() - 30 + n); return { id: 'c' + n, accountId: A.id, symbol: 'EUR/USD', date: d.toISOString(), dayOfWeek: d.getDay(), session: 'London', type: 'Execution', result: g > 0 ? 'Win' : g < 0 ? 'Lose' : 'BE', r: g > 0 ? g / 500 : g < 0 ? -1 : 0, potentialR: 3, risk: 500, actualGross: g, costs: 60, pips: 4 }; });
    rebuildSeriesByDate();
    document.querySelector('.tab[data-page="trades"]').click(); await W(500); renderTradesStats(); await W(500);
    var cards = [].slice.call(document.querySelectorAll('#page-trades .zr-4 .zk')).filter(function (c) { return c.getBoundingClientRect().height > 0; });
    ok('eight stat cards', cards.length === 8, cards.length);
    var m = cards.map(function (c) {
      var r = c.getBoundingClientRect(), b = c.querySelector('.zk-b').getBoundingClientRect(), v = c.querySelector('.stat-value').getBoundingClientRect(), z = c.querySelector('.zk-viz').getBoundingClientRect(), s = c.querySelector('.zk-s'), sr = s && s.textContent.trim() ? s.getBoundingClientRect() : null;
      return { h: Math.round(r.height), vTop: Math.round(v.top - r.top), zRight: Math.round(r.right - z.right), zBottom: Math.round(r.bottom - z.bottom), noteGap: sr ? Math.round(sr.top - v.bottom) : null, over: sr ? sr.right > r.right : false };
    });
    var same = function (k) { return m.every(function (x) { return x[k] === m[0][k]; }); };
    var pairs = true; for (var q = 0; q < 8; q += 2) if (m[q].h !== m[q + 1].h) pairs = false;
    ok('every pair of cards the same height', pairs, m.map(function (x) { return x.h; }));
    ok('no note runs out of its card', m.every(function (x) { return !x.over; }));
    if (innerWidth <= 900) {
      ok('phone: the value starts the same distance under the label in every card', same('vTop'), m.map(function (x) { return x.vTop; }));
      ok('phone: the small chart sits in the same corner of every card', same('zRight') && same('zBottom'), m.map(function (x) { return [x.zRight, x.zBottom]; }));
      ok('phone: the note follows straight under the value', m.every(function (x) { return x.noteGap == null || (x.noteGap >= 0 && x.noteGap <= 10); }), m.map(function (x) { return x.noteGap; }));
      ok('phone: nothing wider than the screen', document.documentElement.scrollWidth <= innerWidth + 1, document.documentElement.scrollWidth);
    }
  } catch (e) { out.push({ name: 'test ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
