// End-to-end test (Nestor, 30 Oct 2026: "the graph line is glitching and also in series of 10 graph, it doent go over to the right and stops it keeps starting and stoping"; 2 Nov: "the series of 10 and
// statistics graph self filling line twitches still"): the equity line draws itself in once per shape, by transforms the compositor runs, and a page painting the same curve touches nothing.
// Run: python tests/browser_test.py tests/eqline_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 100 && typeof newAccountBlank !== 'function'; i++) await W(100);
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
    var A = newAccountBlank('FTMO 70K', 70000, 'challenge'); A.kind = 'challenge'; A.currency = 'GBP';
    data.accounts = [A]; data.activeAccountId = A.id; data.viewScope = 'lifetime'; data.linkedGroups = []; data.mt5LoginMap = {};
    data.history = []; data.reviewSlots = null; data.review = { trades: [] }; if (!data.settings) data.settings = {}; data.settings.statsPeriod = 'all';
    var day0 = new Date(); day0.setDate(day0.getDate() - 20); day0.setHours(9, 5, 0, 0); var n = 0;
    var tr = function (gross) { n++; var d = new Date(day0); d.setDate(d.getDate() + n); return { id: 'eq' + n, accountId: A.id, symbol: 'EUR/USD', date: d.toISOString(), dayOfWeek: d.getDay(), result: gross > 0 ? 'Win' : 'Lose', r: gross > 0 ? 2 : -1, risk: Math.abs(gross > 0 ? gross / 2 : gross), actualGross: gross, costs: 0 }; };
    data.currentSeries = [tr(500), tr(-200), tr(300), tr(-100)]; rebuildSeriesByDate();
    var ch = function () { return document.getElementById('equity-chart'); }, rv = function () { return document.querySelector('#equity-chart-wrap .eq-rv'); };
    document.querySelector('.tab[data-page="trades"]').click();
    var r0 = rv();
    ok('first look: the line draws itself in', !!r0 && ch().classList.contains('eq-rv-on'), !!r0);
    var a0 = r0 && r0.getAnimations()[0], start0 = a0 && a0.startTime;
    ok('only transforms move it (the compositor runs those, whatever the page is doing)', a0 && a0.effect.getKeyframes().every(function (f) { return !!f.transform; }) && r0.firstChild.getAnimations()[0].effect.getKeyframes().every(function (f) { return !!f.transform; }));
    var kids0 = ch().firstChild, muts = 0, mo = new MutationObserver(function (m) { muts += m.length; }); mo.observe(ch(), { childList: true, subtree: true });
    renderTradesStats(); renderTradesStats();
    await Promise.resolve();
    ok('the page painted twice while it draws: the same draw carries on, never restarted', rv() === r0 && (r0.getAnimations()[0] === a0) && a0.startTime === start0, [rv() === r0]);
    ok('...and the chart was not rebuilt', ch().firstChild === kids0 && muts === 0, muts);
    await W(1400);
    ok('then it is the real line, whole, and the copy is gone', !rv() && !ch().classList.contains('eq-rv-on') && getComputedStyle(ch().querySelector('.eq-l')).visibility === 'visible');
    muts = 0;
    for (var j = 0; j < 20; j++) { renderTradesStats(); await W(50); }
    ok('a repaint loop with nothing changed: no draw-in, nothing touched', !rv() && muts === 0, muts);
    mo.disconnect();
    var w0 = document.getElementById('equity-chart-wrap'); w0.style.width = (w0.clientWidth - 30) + 'px'; renderTradesStats(); await W(60);
    ok('a different width alone: not a new shape, no draw-in', !rv());
    w0.style.width = '';
    data.currentSeries.push(tr(400)); rebuildSeriesByDate(); renderTradesStats(); await W(60);
    ok('a new trade (a new shape): it draws itself in once more', !!rv());
    await W(1300);
    document.querySelector('.tab[data-page="stats"]').click(); await W(120);
    ok('Series of 10: its curve the same way', !!document.querySelector('#equity-curve-svg-wrap .eq-rv') || !!(document.getElementById('equity-curve-chart') && document.getElementById('equity-curve-chart').querySelector('.eq-l')));
  } catch (e) { out.push({ name: 'test ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
