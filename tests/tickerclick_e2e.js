// End-to-end test (Nestor, 4 Nov 2026: "the ticker button can that be activated when people click on the actual ticker? instead of the ticker sending people to tradingview?").
// Run: python tests/browser_test.py tests/tickerclick_e2e.js   (E2E_SIZE=1500x940, E2E_MOBILE=375x812)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var $ = function (id) { return document.getElementById(id); };
  try {
    for (var i = 0; i < 200 && !($('ticker-bar') && typeof saveData === 'function'); i++) await W(100);
    await W(1500);
    document.querySelectorAll('.stc-gate').forEach(function (g) { g.classList.remove('open'); });
    document.querySelectorAll('[class^="st-tour"], .st-greet-pop').forEach(function (e) { e.remove(); });
    window.scrollTo(0, 0);
    data.settings.tickerEnabled = true;
    applyTickerBarState();
    for (i = 0; i < 100 && !document.querySelector('#ticker-widget-host iframe'); i++) await W(100);
    await W(500);
    var bar = $('ticker-bar'), open = $('ticker-open'), bg = $('ticker-settings-bg');
    var r = bar.getBoundingClientRect(), mid = r.top + r.height / 2;
    ok('the tape is on', !bar.hidden && !!document.querySelector('#ticker-widget-host iframe'));

    // ---- what a click lands on, across the bar
    var pts = [4, 0.25 * r.width, 0.5 * r.width, 0.75 * r.width, r.width - 40];
    var hits = pts.map(function (x) { return document.elementFromPoint(x, mid); });
    ok('a click anywhere on the tape lands on the settings button', hits.every(function (h) { return h === open; }), hits.map(function (h) { return h && (h.id || h.tagName); }));
    var logo = document.elementFromPoint(r.width - 14, mid);
    ok("TradingView's logo is still their link", logo && logo.tagName === 'IFRAME', logo && (logo.id || logo.tagName));
    var s = getComputedStyle(open);
    ok('it can be seen through', s.backgroundColor === 'rgba(0, 0, 0, 0)' && s.borderTopWidth === '0px', s.backgroundColor);
    ok('it shows as clickable', s.cursor === 'pointer', s.cursor);

    // ---- clicking the tape
    ok('settings closed to begin with', !bg.classList.contains('show'));
    open.click();
    await W(100);
    ok('clicking the tape opens the ticker settings', bg.classList.contains('show') && $('tk-onoff').checked === true);
    ok('...with the symbols listed', $('tk-cats').children.length > 0, $('tk-cats').children.length);
    bg.classList.remove('show');

    // ---- the calendar button still does the same
    $('econ-ticker-btn').click();
    await W(100);
    ok('the Ticker Tape button still opens them', bg.classList.contains('show'));
    bg.classList.remove('show');

    // ---- the page isn't pushed about
    ok('no sideways scroll', document.documentElement.scrollWidth <= innerWidth, document.documentElement.scrollWidth);

    // ---- pinned or not, it stays over the tape
    bar.classList.remove('ticker-bar--sticky');
    var o2 = open.getBoundingClientRect(), b2 = bar.getBoundingClientRect();
    ok('scrolls-away mode: still over the tape', Math.abs(o2.top - b2.top) <= 2 && Math.abs(o2.left - b2.left) <= 2 && Math.abs(o2.height - b2.height) <= 3, [o2.top, b2.top, o2.height, b2.height]);
    bar.classList.add('ticker-bar--sticky');

    // ---- off: nothing left behind
    data.settings.tickerEnabled = false;
    applyTickerBarState();
    await W(100);
    ok('ticker off: no click area left at the top', bar.hidden && open.offsetWidth === 0, open.offsetWidth);
  } catch (e) { ok('no exception', false, String(e && e.stack || e)); }
  return out;
})();
