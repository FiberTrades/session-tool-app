// End-to-end test (Nestor, 4 Nov 2026: "can the bloomberg button be moved from economic calendar and ... when the bloomberg tv is turned off by pressing x the title bar folds itself into the bloomberg tv button?").
// Run: python tests/browser_test.py tests/bbfold_e2e.js   (E2E_SIZE=1500x940, E2E_MOBILE=375x812)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var $ = function (id) { return document.getElementById(id); }, R = function (e) { var b = e.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; };
  try {
    for (var i = 0; i < 200 && !($('econ-bloomberg-btn') && $('bloomberg-floater') && typeof saveData === 'function'); i++) await W(100);
    await W(1500);
    document.querySelectorAll('.stc-gate').forEach(function (g) { g.classList.remove('open'); });
    document.querySelectorAll('[class^="st-tour"], .st-greet-pop').forEach(function (e) { e.remove(); });
    window.scrollTo(0, 0);
    var btn = $('econ-bloomberg-btn'), f = $('bloomberg-floater'), x = $('bloomberg-floater-close'), phone = innerWidth <= 560;
    ok('the calendar row no longer has it', !document.querySelector('#econ-calendar #econ-bloomberg-btn'));
    ok('it is in the top row', !!btn.closest('.brand-row'));

    // start with it on
    if (f.hidden) { btn.click(); await W(600); }
    ok('TV on: the window shows, no button', !f.hidden && btn.hidden && f.offsetWidth > 0, [f.hidden, btn.hidden]);
    var rOn = R(f), bar = R($('bloomberg-floater-header')), sx0 = document.documentElement.scrollWidth, tabs0 = R(document.querySelector('.tabs')).t;

    // ---- X: it folds
    x.click();
    ok('X: the TV is off at once, its stream stopped', f.hidden && /about:blank/.test($('bloomberg-floater-iframe').src), f.hidden);
    ok('...saved as off', data.settings.bloombergOpen === false, data.settings.bloombergOpen);
    var g = document.querySelector('.bb-fold');
    ok('...the fold runs', !!g, !!g);
    ok('...the button waits for it', !btn.hidden && btn.classList.contains('bb-folding'), [btn.hidden, btn.className]);
    var g0 = g ? R(g) : null;
    ok('...it starts as the whole window', g0 && Math.abs(g0.w - rOn.w) <= 2 && Math.abs(g0.h - rOn.h) <= 3 && Math.abs(g0.l - rOn.l) <= 2, [g0, rOn]);
    await W(150);
    var g1 = g && g.isConnected ? R(g) : null;
    ok('...halfway it is smaller', g1 && g1.h < g0.h && g1.w <= g0.w, [g0, g1]);
    await W(450);
    ok('...and it ends: nothing left over', !document.querySelector('.bb-fold') && !btn.classList.contains('bb-folding'), !!document.querySelector('.bb-fold'));
    var rB = R(btn), sty = getComputedStyle(btn);
    ok('the button shows', !btn.hidden && rB.w > 0 && sty.visibility === 'visible', rB);
    if (!phone) {
      ok('...with its name', /BLOOMBERG TV/.test(btn.textContent));
      if (innerWidth >= 1100) {
        ok('...where the title bar was: same right edge, same top', Math.abs(rB.r - rOn.r) <= 2 && Math.abs(rB.t - rOn.t) <= 2, [rB, rOn]);
        ok('...about as tall as the title bar', Math.abs(rB.h - bar.h) <= 6, [rB.h, bar.h]);
      }
    } else ok('phone: an icon that fits the row', rB.w <= 34 && rB.r <= innerWidth, rB);
    ok('no sideways scroll', document.documentElement.scrollWidth <= Math.max(sx0, innerWidth), document.documentElement.scrollWidth);
    var row = R(document.querySelector('.brand-row'));
    ok('it stays in the row', rB.t >= row.t - (phone ? 5 : 1) && rB.b <= row.b + (phone ? 5 : 1), [rB, row]);
    if (!phone && innerWidth >= 1100) ok('the page below moved up', R(document.querySelector('.tabs')).t < tabs0, [R(document.querySelector('.tabs')).t, tabs0]);

    // ---- the button: it unfolds
    btn.click();
    ok('button: the TV is on at once, saved', !f.hidden && data.settings.bloombergOpen === true && /youtube|about:blank/.test($('bloomberg-floater-iframe').src), f.hidden);
    var u = document.querySelector('.bb-fold'), u0 = u ? R(u) : null;
    ok('...it opens from the button', u0 && Math.abs(u0.r - rB.r) <= 3 && u0.h <= rB.h + 3, [u0, rB]);
    ok('...the real window waits', f.classList.contains('bb-folding'), f.className);
    await W(600);
    ok('...and ends as the window, no button', !document.querySelector('.bb-fold') && !f.classList.contains('bb-folding') && btn.hidden && Math.abs(R(f).w - rOn.w) <= 2, [R(f), rOn]);

    // ---- pressing fast never leaves a stand-in
    x.click(); await W(60); btn.click(); await W(60); x.click(); await W(600);
    ok('X, button, X quickly: off, one button, nothing left over', f.hidden && !btn.hidden && !document.querySelector('.bb-fold') && !btn.classList.contains('bb-folding') && !f.classList.contains('bb-folding'), [f.hidden, btn.hidden]);
  } catch (e) { ok('no exception', false, String(e && e.stack || e)); }
  return out;
})();
