// End-to-end test (Nestor, 30 Oct 2026: "the graph line is glitching and also in series of 10 graph, it doent go over to the right and stops it keeps starting and stoping"; 2 Nov: "the series of 10 and
// statistics graph self filling line twitches still"): the equity line draws itself in once per shape, by transforms the compositor runs, and a page painting the same curve touches nothing.
// Run: E2E_SIZE=1920x1400 python tests/browser_test.py tests/eqline_e2e.js   (a window tall enough for the chart to be on screen; the fill waits until it is)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var until = async function (fn, ms) { for (var t0 = performance.now(); performance.now() - t0 < (ms || 2500); await W(30)) { if (fn()) return true; } return !!fn(); };   // this PC is busy: wait for the state, not a fixed time
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
    var over = function (rv2, c2) { var a = rv2.getBoundingClientRect(), b = c2.getBoundingClientRect(), f = rv2.firstChild.getBoundingClientRect(); return Math.abs(a.top - b.top) < 1.5 && Math.abs(f.left - b.left) < b.width + 1 && Math.abs(a.height - b.height) < 1.5; };
    ok('3 Nov: the fill runs ON the chart, not one chart\'s height under it', !!r0 && over(r0, ch()), r0 && [Math.round(r0.getBoundingClientRect().top), Math.round(ch().getBoundingClientRect().top)]);
    var a0 = r0 && r0.getAnimations()[0], start0 = a0 && a0.startTime;
    ok('only transforms move it (the compositor runs those, whatever the page is doing)', a0 && a0.effect.getKeyframes().every(function (f) { return !!f.transform; }) && r0.firstChild.getAnimations()[0].effect.getKeyframes().every(function (f) { return !!f.transform; }));
    var kids0 = ch().firstChild, muts = 0, mo = new MutationObserver(function (m) { muts += m.length; }); mo.observe(ch(), { childList: true, subtree: true });
    renderTradesStats(); renderTradesStats();
    await Promise.resolve();
    ok('the page painted twice while it draws: the same draw carries on, never restarted', rv() === r0 && (r0.getAnimations()[0] === a0) && a0.startTime === start0, [rv() === r0]);
    ok('...and the chart was not rebuilt', ch().firstChild === kids0 && muts === 0, muts);
    await until(function () { return !rv(); }, 3500);
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
    var tabT = function () { document.querySelector('.tab[data-page="trades"]').click(); }, tabB = function () { document.querySelector('.tab[data-page="bias"]').click(); };
    // 3 Nov 2026 ("works now but not the one in statistics"): a page still being built does not use up the fill. The page's work is held here on purpose, as a big journal does
    tabB(); await W(400); var busy0 = performance.now(); tabT(); var held = rv(), heldPaused = !!held && held.getAnimations()[0].playState === 'paused', heldAt = held && held.getBoundingClientRect().right - ch().getBoundingClientRect().left;
    while (performance.now() - busy0 < 1200) {}
    ok('opened on a slow page: the fill has not started while it is being built', heldPaused || !held, [heldPaused, heldAt]);
    await W(150); var late = rv(), lateR = late && late.getBoundingClientRect(), lateC = ch().getBoundingClientRect();
    ok('...once on screen it starts from nearly nothing, so you see it fill', !!late && lateR.right - lateC.left < lateC.width * 0.6, late && [Math.round(lateR.right - lateC.left), Math.round(lateC.width)]);
    await until(function () { return !rv(); }, 3500); ok('...and then it is the real line, whole', !rv() && !ch().classList.contains('eq-rv-on'));
    tabB(); await W(400); tabT(); await until(function () { var x = rv(), a = x && x.getAnimations()[0]; return !!a && a.playState === 'running' && x.getBoundingClientRect().right > ch().getBoundingClientRect().left + 2; });
    var r1 = rv(), cR = ch().getBoundingClientRect(), rR = r1 && r1.getBoundingClientRect();
    ok('3 Nov: back on Statistics, the same trades: the line fills again', !!r1 && ch().classList.contains('eq-rv-on'), !!r1);
    ok('...and is part way across at this moment, not full', !!rR && rR.right < cR.right - 20 && rR.right > cR.left, rR && [Math.round(rR.right), Math.round(cR.right)]);
    var a1 = r1 && r1.getAnimations()[0];
    renderTradesStats(); await W(30);
    ok('...a repaint while it fills does not restart it', rv() === r1 && r1.getAnimations()[0] === a1);
    var w1 = document.getElementById('equity-chart-wrap'), W0 = r1.style.width; w1.style.width = (w1.clientWidth - 30) + 'px'; renderTradesStats(); await W(30);
    ok('...the page settling at a new width while it fills: the same draw carries on, it never jumps to full', rv() === r1 && r1.getAnimations()[0] === a1 && r1.style.width !== W0 && ch().classList.contains('eq-rv-on'), [W0, r1.style.width]);
    w1.style.width = ''; await until(function () { return !rv(); }, 3500);
    ok('...then the real line, whole', !rv() && !ch().classList.contains('eq-rv-on'));
    renderTradesStats(); await W(30);
    ok('...and later repaints leave it alone', !rv());
    tabT(); await W(60);
    ok('clicking the tab you are already on: nothing replays', !rv());
    statsPeriodSet('all'); await W(60);
    ok('picking a period fills it, even with the same trades', !!rv());
    await W(1300);
    var sb = function () { return document.querySelector('#equity-curve-svg-wrap .eq-rv'); };
    document.querySelector('.tab[data-page="stats"]').click(); await until(sb);
    ok('3 Nov: Series of 10 fills when opened', !!sb(), !!sb());
    ok('...on its chart', !!sb() && over(sb(), document.getElementById('equity-curve-chart')), sb() && [Math.round(sb().getBoundingClientRect().top), Math.round(document.getElementById('equity-curve-chart').getBoundingClientRect().top)]);
    await until(function () { return !sb(); }, 3500); tabB(); await W(400); document.querySelector('.tab[data-page="stats"]').click(); await until(sb);
    ok('...and again when opened again', !!sb(), !!sb());
    // 3 Nov 2026 ("already filled up when i see it"): a chart below the fold waits until it is scrolled to
    await until(function () { return !sb(); }, 3500); tabB(); await W(400); var sp = document.createElement('div'); sp.style.height = '1600px'; var pg = document.getElementById('page-trades'), eqw = document.getElementById('equity-chart-wrap'); eqw.parentNode.insertBefore(sp, eqw); window.scrollTo(0, 0);
    tabT(); await W(1800); var off0 = rv();
    ok('below the fold: nothing has run while it is out of sight', !!off0 && off0.getAnimations()[0].playState === 'paused', off0 && off0.getAnimations()[0].playState);
    eqw.scrollIntoView({ block: 'center' }); await until(function () { var x = rv(), a = x && x.getAnimations()[0]; return !!a && a.playState === 'running'; }); var on0 = rv();
    ok('...scrolled to: it fills there, on the chart', !!on0 && on0.getAnimations()[0].playState === 'running' && over(on0, ch()) && on0.getBoundingClientRect().right < ch().getBoundingClientRect().right - 20, on0 && [on0.getAnimations()[0].playState, Math.round(on0.getBoundingClientRect().right), Math.round(ch().getBoundingClientRect().right)]);
    await until(function () { return !rv(); }, 3500); ok('...then the real line, whole', !rv() && !ch().classList.contains('eq-rv-on')); sp.remove(); window.scrollTo(0, 0);
    ok('(how the page switched here)', true, { viewTransitions: !!document.startViewTransition, ticker: !!(document.getElementById('ticker-bar') && !document.getElementById('ticker-bar').hidden), floater: !!(document.getElementById('bloomberg-floater') && !document.getElementById('bloomberg-floater').hidden), w: innerWidth, reduce: matchMedia('(prefers-reduced-motion: reduce)').matches });
    ok('Series of 10: its curve the same way', !!document.querySelector('#equity-curve-svg-wrap .eq-rv') || !!(document.getElementById('equity-curve-chart') && document.getElementById('equity-curve-chart').querySelector('.eq-l')));
  } catch (e) { out.push({ name: 'test ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
