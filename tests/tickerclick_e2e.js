// End-to-end test (Nestor, 4 Nov 2026: "the ticker button can that be activated when people click on the actual ticker? instead of the ticker sending people to tradingview?"
// and "taka the ticker button off the calendar and when off just keep the small tradingview logo on the top right corner to access it? and maove the economic calendar en the glass to the center of the box").
// Run: python tests/browser_test.py tests/tickerclick_e2e.js   (E2E_SIZE=1500x940, E2E_MOBILE=375x812)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var $ = function (id) { return document.getElementById(id); };
  // A tab change animates as a view transition; until it ends the page answers every hit test with <html>.
  var settle = async function () { for (var q = 0; q < 100 && document.elementFromPoint(innerWidth / 2, 60) === document.documentElement; q++) await W(100); await W(100); };
  var at = function (e) { return e ? (e.id ? '#' + e.id : e.tagName + '.' + String(e.className).slice(0, 30)) : null; };
  try {
    window.__stPlatOff = false; window.__stLcForce = true;   // the Charts tab too
    for (var i = 0; i < 200 && !($('ticker-bar') && typeof saveData === 'function'); i++) await W(100);
    await W(1500);
    document.querySelectorAll('.stc-gate').forEach(function (g) { g.classList.remove('open'); });
    document.querySelectorAll('[class^="st-tour"], .st-greet-pop').forEach(function (e) { e.remove(); });
    window.scrollTo(0, 0);
    var bar = $('ticker-bar'), open = $('ticker-open'), logoBtn = $('ticker-logo'), bg = $('ticker-settings-bg');
    ok('the calendar has no ticker button any more', !$('econ-ticker-btn') && !document.querySelector('.econ-action-group'));

    // ======== ticker OFF
    data.settings.tickerEnabled = false;
    applyTickerBarState();
    await W(200);
    var r = logoBtn.getBoundingClientRect();
    ok('off: the bar is gone', bar.hidden && open.offsetWidth === 0, open.offsetWidth);
    ok('off: the logo shows in the top right corner', r.width > 0 && Math.abs(r.right - document.documentElement.clientWidth) <= 1 && r.top >= 0 && r.top <= 8, [r.left, r.top, r.right, r.bottom]);
    ok('...small', r.width <= 30 && r.height <= 26, [r.width, r.height]);
    ok('...has the mark', !!logoBtn.querySelector('svg path'));
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    ok('...and nothing sits on it', logoBtn.contains(document.elementFromPoint(cx, cy)), at(document.elementFromPoint(cx, cy)));

    // it must not lie over anything you can press, on any tab
    var tabs = [].slice.call(document.querySelectorAll('.tab[data-page]')).filter(function (t) { return t.offsetWidth > 0; });
    var seen = [];
    for (var n = 0; n < tabs.length; n++) {
      tabs[n].click(); await W(300); await settle(); window.scrollTo(0, 0); await W(100);
      var rr = logoBtn.getBoundingClientRect(), stack = document.elementsFromPoint(rr.left + rr.width / 2, rr.top + rr.height / 2);
      var pos = stack.indexOf(logoBtn), under = pos >= 0 ? stack.slice(pos + 1) : stack;
      var hit = under.find(function (e) { return !logoBtn.contains(e) && e.closest && e.closest('button,a,input,select,textarea,[role=button],[onclick],.tab'); });
      seen.push({ p: tabs[n].getAttribute('data-page'), on: document.querySelector('.page.active') && document.querySelector('.page.active').id, top: pos === 0, over: pos > 0 ? at(stack[0]) : null, w: rr.width, hit: at(hit) });
    }
    ok('it covers no control on any tab', seen.every(function (x) { return !x.hit; }), seen);
    ok('nothing paints over it on any tab', seen.every(function (x) { return x.top || !x.w; }), seen);
    tabs[0].click(); await W(300); await settle(); window.scrollTo(0, 0);

    // ...nor the Bloomberg button or window
    var f = $('bloomberg-floater'), bb = $('econ-bloomberg-btn'), hits = function (a, b) { return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top); };
    r = logoBtn.getBoundingClientRect();
    if (!bb.hidden) ok('clear of the Bloomberg button', !hits(r, bb.getBoundingClientRect()), [r.left, bb.getBoundingClientRect().right]);
    if (!f.hidden) ok('clear of the Bloomberg window', !hits(r, f.getBoundingClientRect()), [r.left, f.getBoundingClientRect().right]);

    // clicking the logo
    ok('settings closed to begin with', !bg.classList.contains('show'));
    logoBtn.click();
    await W(100);
    ok('off: the logo opens the ticker settings', bg.classList.contains('show') && $('tk-onoff').checked === false);
    ok('...with the symbols listed', $('tk-cats').children.length > 0, $('tk-cats').children.length);

    // turning it on from there
    $('tk-onoff').click();
    for (i = 0; i < 100 && !document.querySelector('#ticker-widget-host iframe'); i++) await W(100);
    await W(500);
    ok('switching it on: the ticker shows, the corner logo goes', !bar.hidden && !!document.querySelector('#ticker-widget-host iframe') && logoBtn.offsetWidth === 0, logoBtn.offsetWidth);
    bg.classList.remove('show');

    // ======== ticker ON
    window.scrollTo(0, 0);
    var b = bar.getBoundingClientRect(), mid = b.top + b.height / 2;
    var pts = [4, 0.25 * b.width, 0.5 * b.width, 0.75 * b.width, b.width - 40];
    var pr = pts.map(function (x) { return document.elementFromPoint(x, mid); });
    ok('on: a click anywhere on the tape lands on the settings button', pr.every(function (h) { return h === open; }), pr.map(at));
    var lg = document.elementFromPoint(b.width - 14, mid);
    ok("on: TradingView's logo in the tape is still their link", lg && lg.tagName === 'IFRAME', at(lg));
    var s = getComputedStyle(open);
    ok('on: it can be seen through', s.backgroundColor === 'rgba(0, 0, 0, 0)' && s.borderTopWidth === '0px', s.backgroundColor);
    ok('on: it shows as clickable', s.cursor === 'pointer', s.cursor);
    open.click();
    await W(100);
    ok('on: clicking the tape opens the ticker settings', bg.classList.contains('show') && $('tk-onoff').checked === true);
    bg.classList.remove('show');
    ok('no sideways scroll', document.documentElement.scrollWidth <= innerWidth, document.documentElement.scrollWidth);

    // pinned or not, it stays over the tape
    bar.classList.remove('ticker-bar--sticky');
    var o2 = open.getBoundingClientRect(), b2 = bar.getBoundingClientRect();
    ok('scrolls-away mode: still over the tape', Math.abs(o2.top - b2.top) <= 2 && Math.abs(o2.left - b2.left) <= 2 && Math.abs(o2.height - b2.height) <= 3, [o2.top, b2.top, o2.height, b2.height]);
    bar.classList.add('ticker-bar--sticky');

    // ======== the calendar's title and glass, in the middle of the box
    var hd = $('econ-calendar-toggle'), ttl = hd.querySelector('.econ-calendar-title'), ic = hd.querySelector('.econ-calendar-hint');
    var cal = $('econ-calendar'), wasOpen = !cal.classList.contains('econ-collapsed');
    if (wasOpen) { hd.click(); await W(400); }
    var A = ttl.getBoundingClientRect(), B = ic.getBoundingClientRect(), H = hd.getBoundingClientRect();
    ok('closed: title and glass centred in the box', Math.abs((A.left + B.right) / 2 - (H.left + H.right) / 2) <= 2, [A.left, B.right, H.left, H.right]);
    hd.click(); await W(400);
    A = ttl.getBoundingClientRect(); H = hd.getBoundingClientRect();
    ok('open: the title centred too', Math.abs((A.left + A.right) / 2 - (H.left + H.right) / 2) <= 2, [A.left, A.right, H.left, H.right]);
    hd.click(); await W(300);

    data.settings.tickerEnabled = false;
    applyTickerBarState();
    await W(100);
    ok('switched off again: the corner logo is back', bar.hidden && logoBtn.offsetWidth > 0, logoBtn.offsetWidth);
  } catch (e) { ok('no exception', false, String(e && e.stack || e)); }
  return out;
})();
