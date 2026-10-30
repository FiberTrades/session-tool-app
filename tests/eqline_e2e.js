// End-to-end test (Nestor, 30 Oct 2026: "the graph line is glitching and also in series of 10 graph, it doent go over to the right and
// stops it keeps starting and stoping"): the equity line draws itself in once per shape; the page painting the same curve again shows
// it whole at once, never restarting. Run: python tests/browser_test.py tests/eqline_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 100 && typeof newAccountBlank !== 'function'; i++) await W(100);
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
    var A = newAccountBlank('FTMO 70K', 70000, 'challenge'); A.kind = 'challenge'; A.currency = 'GBP';
    data.accounts = [A]; data.activeAccountId = A.id; data.viewScope = 'lifetime'; data.linkedGroups = []; data.mt5LoginMap = {};
    data.history = []; data.reviewSlots = null; data.review = { trades: [] }; if (!data.settings) data.settings = {}; data.settings.statsPeriod = 'all';
    var day0 = new Date(); day0.setDate(day0.getDate() - 20); day0.setHours(9, 5, 0, 0), n = 0;
    var tr = function (gross) { n++; var d = new Date(day0); d.setDate(d.getDate() + n); return { id: 'eq' + n, accountId: A.id, symbol: 'EUR/USD', date: d.toISOString(), dayOfWeek: d.getDay(), result: gross > 0 ? 'Win' : 'Lose', r: gross > 0 ? 2 : -1, risk: Math.abs(gross > 0 ? gross / 2 : gross), actualGross: gross, costs: 0, side: 'Long', type: 'Continuation' }; };
    data.currentSeries = [tr(500), tr(-200), tr(300), tr(-100)]; rebuildSeriesByDate();
    var draw = async function () { try { document.querySelector('.tab[data-page="trades"]').click(); } catch (e) {} await W(300); renderTradesStats(); await W(150); };
    var line = function () { var c = document.getElementById('equity-chart'); return c ? c.querySelector('path[pathLength="1"]') : null; };
    await draw();
    var p0 = line();
    ok('first paint: the equity line draws itself in', p0 && p0.classList.contains('equity-line-anim'), p0 && p0.getAttribute('class'));
    await W(1200); await draw();
    var p1 = line();
    ok('painted again with the same trades: the line shows whole at once, no draw-in restarting', p1 && !p1.classList.contains('equity-line-anim'), p1 && p1.getAttribute('class'));
    data.currentSeries.push(tr(400)); rebuildSeriesByDate(); await draw();
    var p2 = line();
    ok('a new trade (a new shape): it draws itself in once more', p2 && p2.classList.contains('equity-line-anim'), p2 && p2.getAttribute('class'));
  } catch (e) { out.push({ name: 'test ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
