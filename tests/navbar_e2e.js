// Phone tabs at the bottom (24 Oct 2026): at 820px and under the tab row is a fixed bottom bar - icon over a short label, the active one
// pink, the page clear of it - hidden on Charts, where the chart's own toolbar opens window.__stNav (every page as a bottom sheet).
// Run: E2E_MOBILE=375x812 python tests/browser_test.py tests/navbar_e2e.js   (also 320x640, 390x844; without E2E_MOBILE = a computer)
(async function () {
  var out = [], W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  try {
    for (var i = 0; i < 80 && !(window.__stNav && document.querySelector('.container > .tabs')); i++) await W(100);
    await W(900);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"], .st-greet-pop').forEach(function (e) { e.remove(); });
    // eight tabs, as a signed-in member has them (signed out hides Charts)
    window.__stLcForce = true;   // tests open Charts signed out (the app's own test switch)
    await W(1500);
    var all8 = function () { document.body.classList.add('st-charts-on', 'st-lc-on'); document.querySelectorAll('.container > .tabs .tab').forEach(function (t) { t.style.removeProperty('display'); }); };
    all8();
    window.dispatchEvent(new Event('resize')); await W(500); all8(); await W(200);
    var row = document.querySelector('.container > .tabs'), phone = innerWidth <= 820;
    var tabs = [].filter.call(row.querySelectorAll('.tab'), function (t) { return t.offsetWidth > 0; });
    var r = row.getBoundingClientRect();
    if (!phone) {
      ok('computer: tabs stay a row in the page, no short labels', getComputedStyle(row).position !== 'fixed' && !tabs.some(function (t) { var l = t.querySelector('.tab-short'); return l && l.offsetWidth > 0; }), getComputedStyle(row).position);
      __stNav.open(); await W(350);
      ok('computer: __stNav.open() still shows the sheet', document.querySelectorAll('.st-navsheet-item').length === tabs.length, document.querySelectorAll('.st-navsheet-item').length);
      __stNav.close(); await W(350);
      return out;
    }
    ok('a fixed bar along the bottom edge', getComputedStyle(row).position === 'fixed' && Math.abs(r.bottom - innerHeight) <= 1 && r.left <= 0.5 && Math.abs(r.right - innerWidth) <= 0.5, [r.top, r.bottom, innerHeight, r.left, r.right]);
    ok('eight tabs, all the same width, tall enough to tap', tabs.length === 8 && tabs.every(function (t) { return Math.abs(t.offsetWidth - tabs[0].offsetWidth) <= 1 && t.offsetHeight >= 48; }), tabs.map(function (t) { return t.offsetWidth + 'x' + t.offsetHeight; }));
    var icons = row.classList.contains('tabs-icons');
    var clipped = tabs.filter(function (t) { var l = t.querySelector('.tab-short'); return l && getComputedStyle(l).visibility !== 'hidden' && l.scrollWidth > l.clientWidth + 1; });
    ok('every label whole (or icons only on the tightest screens, the open tab keeping its word)', clipped.length === 0, { icons: icons, size: getComputedStyle(row).getPropertyValue('--st-navlabel'), clipped: clipped.map(function (t) { return t.getAttribute('data-page'); }) });
    var act = row.querySelector('.tab.active');
    ok('the open tab is pink', getComputedStyle(act).color.replace(/\s/g, '') === 'rgb(244,114,182)', getComputedStyle(act).color);
    var cont = document.querySelector('.container'), pb = parseFloat(getComputedStyle(cont).paddingBottom);
    ok('the page keeps clear of the bar', pb >= r.height + 40, [pb, r.height]);
    window.scrollTo(0, document.documentElement.scrollHeight); await W(300);
    var pg = document.querySelector('.page.active'), lastEl = pg && [].filter.call(pg.querySelectorAll('section, .footer'), function (e) { return e.offsetHeight > 0; }).pop();
    var lb = lastEl ? lastEl.getBoundingClientRect().bottom : 0;
    ok('scrolled to the end, the last box ends above the bar', lb <= row.getBoundingClientRect().top + 1, [lb, row.getBoundingClientRect().top]);
    window.scrollTo(0, 0);
    // a tab from the bar
    document.querySelector('.container > .tabs .tab[data-page="trades"]').click(); await W(600);
    ok('tapping Stats opens Statistics, the bar follows', document.querySelector('.tab[data-page="trades"]').classList.contains('active') && document.getElementById('page-trades') && document.getElementById('page-trades').classList.contains('active'),
       (document.querySelector('.page.active') || {}).id);
    // Charts: the bar gives way, __stNav brings every page back
    all8(); document.querySelector('.tab[data-page="livecharts"]').click(); await W(800);
    ok('on Charts the bar is hidden (the chart toolbar takes its place)', getComputedStyle(row).display === 'none', getComputedStyle(row).display);
    all8(); __stNav.open(); await W(400);
    var items = document.querySelectorAll('.st-navsheet-item'), sh = document.querySelector('.st-navsheet'), shb = sh && sh.getBoundingClientRect();
    ok('__stNav.open(): a sheet up from the bottom with every page, Charts marked', items.length === 8 && shb && Math.abs(shb.bottom - innerHeight) <= 1 && (document.querySelector('.st-navsheet-item.on') || {}).getAttribute && document.querySelector('.st-navsheet-item.on').getAttribute('data-page') === 'livecharts',
       { n: items.length, bottom: shb && shb.bottom, on: (document.querySelector('.st-navsheet-item.on') || { getAttribute: function () { return null; } }).getAttribute('data-page') });
    ok('the sheet fits the screen', shb && shb.top >= 0 && shb.width <= innerWidth + 0.5, shb && [shb.top, shb.width]);
    document.querySelector('.st-navsheet-item[data-page="tradeview"]').click(); await W(500);
    ok('a page from the sheet: it opens, the sheet closes, the bar is back', !document.querySelector('.st-navsheet-bg') && document.querySelector('.tab[data-page="tradeview"]').classList.contains('active') && getComputedStyle(row).display !== 'none',
       { sheet: !!document.querySelector('.st-navsheet-bg'), page: (document.querySelector('.page.active') || {}).id, bar: getComputedStyle(row).display });
    __stNav.open(); await W(300);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await W(400);
    ok('Escape closes the sheet', !document.querySelector('.st-navsheet-bg') && !__stNav.isOpen(), !!document.querySelector('.st-navsheet-bg'));
    __stNav.open(); await W(300);
    document.querySelector('.st-navsheet-bg').dispatchEvent(new MouseEvent('click', { bubbles: true })); await W(400);
    ok('a tap outside closes it', !document.querySelector('.st-navsheet-bg'), !!document.querySelector('.st-navsheet-bg'));
    document.querySelector('.tab[data-page="bias"]').click(); await W(300);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
