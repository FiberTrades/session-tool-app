// Phone tabs (25 Oct 2026, Nestor): back under the page title as a row of icon boxes - all the same size, the open one outlined pink,
// finer than before - and hidden on Charts, where window.__stNav (the logo in the chart's corner) brings them down from the top.
// Run: E2E_MOBILE=375x812 python tests/browser_test.py tests/navbar_e2e.js   (also 320x640, 390x844; without E2E_MOBILE = a computer)
(async function () {
  var out = [], W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  try {
    for (var i = 0; i < 80 && !(window.__stNav && document.querySelector('.container > .tabs')); i++) await W(100);
    await W(900);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"], .st-greet-pop').forEach(function (e) { e.remove(); });
    window.__stLcForce = true;   // tests open Charts signed out (the app's own test switch)
    await W(1500);
    var row = document.querySelector('.container > .tabs');
    var all8 = function () { document.body.classList.add('st-charts-on', 'st-lc-on'); row.querySelectorAll('.tab').forEach(function (t) { t.style.removeProperty('display'); }); };
    var set7 = function () { var c = row.querySelector('.tab[data-page="livecharts"]'); if (c) c.style.setProperty('display', 'none', 'important'); window.dispatchEvent(new Event('resize')); };
    var vis = function () { return [].filter.call(row.querySelectorAll('.tab'), function (t) { return t.offsetWidth > 0; }); };
    all8(); window.dispatchEvent(new Event('resize')); await W(500); all8(); await W(200);
    var phone = innerWidth <= 820;
    if (!phone) {
      ok('computer: the tab row in the page with its labels', getComputedStyle(row).position !== 'fixed' && vis().every(function (t) { var l = t.querySelector('span[data-i18n]'); return l && l.offsetWidth > 0; }), getComputedStyle(row).position);
      return out;
    }
    var h1 = document.querySelector('.header h1').getBoundingClientRect(), rr = row.getBoundingClientRect();
    ok('phone: the row sits under the page title, in the page (not a bottom bar)', getComputedStyle(row).position !== 'fixed' && rr.top >= h1.bottom && rr.bottom < innerHeight, [h1.bottom, rr.top, rr.bottom, getComputedStyle(row).position]);
    var shape = function () { var v = vis(); return { n: v.length, ws: v.map(function (t) { return Math.round(t.getBoundingClientRect().width); }), hs: v.map(function (t) { return Math.round(t.getBoundingClientRect().height); }),
      labels: v.filter(function (t) { return [].some.call(t.querySelectorAll('span[data-i18n]'), function (l) { return l.offsetWidth > 0; }); }).length,
      icons: v.filter(function (t) { var s = t.querySelector('svg'); return s && s.getBoundingClientRect().width >= 16 && s.getBoundingClientRect().width <= 22; }).length }; };
    for (var li = 0; li < 2; li++) {
      var lang = li ? 'es' : 'en';
      try { setLanguage(lang); } catch (e) {}
      await W(400); all8(); await W(300);
      var s8 = shape();
      ok(lang.toUpperCase() + ', 8 tabs: equal icon boxes, 40px tall, no words, 18-21px icons', s8.n === 8 && Math.max.apply(null, s8.ws) - Math.min.apply(null, s8.ws) <= 1 && s8.hs.every(function (h) { return h === 40; }) && s8.labels === 0 && s8.icons === 8, s8);
      set7(); await W(350);
      var s7 = shape();
      ok(lang.toUpperCase() + ', 7 tabs: the same, the boxes share the row', s7.n === 7 && Math.max.apply(null, s7.ws) - Math.min.apply(null, s7.ws) <= 1 && s7.hs.every(function (h) { return h === 40; }) && s7.labels === 0, s7);
      all8(); await W(300);
    }
    try { setLanguage('en'); } catch (e) {}
    await W(300); all8(); await W(200);
    var act = row.querySelector('.tab.active'), acs = getComputedStyle(act);
    ok('the open tab: pink outline and pink icon, no glow', acs.borderTopColor.replace(/\s/g, '') === 'rgb(244,114,182)' && acs.color.replace(/\s/g, '') === 'rgb(244,114,182)' && acs.boxShadow === 'none', [acs.borderTopColor, acs.color, acs.boxShadow]);
    var other = row.querySelector('.tab:not(.active)'), ocs = getComputedStyle(other);
    ok('the others: a hairline border, no glow', ocs.borderTopWidth === '1px' && ocs.boxShadow === 'none', [ocs.borderTopWidth, ocs.borderTopColor, ocs.boxShadow]);
    var pb = parseFloat(getComputedStyle(document.querySelector('.container')).paddingBottom);
    ok('no extra page padding for a bottom bar', pb <= 90, pb);
    document.querySelector('.container > .tabs .tab[data-page="trades"]').click(); await W(600);
    ok('tapping the Statistics box opens Statistics', document.querySelector('.tab[data-page="trades"]').classList.contains('active') && document.getElementById('page-trades').classList.contains('active'), (document.querySelector('.page.active') || {}).id);
    all8(); document.querySelector('.tab[data-page="livecharts"]').click(); await W(800);
    ok('on Charts the row is hidden', getComputedStyle(row).display === 'none', getComputedStyle(row).display);
    ok('window.__stNav keeps its API', typeof __stNav.open === 'function' && typeof __stNav.close === 'function' && typeof __stNav.isOpen === 'function', Object.keys(__stNav));
    __stNav.open(); await W(400);
    ok('__stNav.open() opens it', __stNav.isOpen(), __stNav.isOpen());
    __stNav.close(); await W(400);
    ok('__stNav.close() closes it', !__stNav.isOpen(), __stNav.isOpen());
    document.querySelector('.tab[data-page="bias"]').click(); await W(400);
    ok('back on Session Bias the row is there again', getComputedStyle(row).display !== 'none', getComputedStyle(row).display);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
