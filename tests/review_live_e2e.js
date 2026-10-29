(async function () {
  // Session Review while a session is live (Nestor, 27 Oct 2026): Session Live is gone, so its leftovers go too - no Finish session (and no
  // Settings "Reopen the live session", which only undid it), no "Log trades by hand" switch, no "This morning's bias" box. "+ Add trade"
  // keeps working; the Long / Short quick buttons show only without the EA, and with the EA the quick log leaves no empty box.
  // Run: python tests/browser_test.py tests/review_live_e2e.js     (and E2E_MOBILE=375x812 for a phone)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(typeof updateSessionLiveBanner === 'function' && document.getElementById('add-trade')); i++) await W(100);
    await W(800);
    var $ = function (s) { return document.querySelector(s); }, vis = function (el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none'; };
    window.isSessionLive = function () { return true; };
    document.querySelector('.tab[data-page="review"]').click(); await W(500);
    ok('gone from the page: Finish session, its arrow, the "Log trades by hand" switch, "This morning\'s bias"', !$('#session-finish-btn') && !$('#session-finish-toggle') && !$('#ql-manual-cb') && !$('#saved-bias-card'),
      [!!$('#session-finish-btn'), !!$('#ql-manual-cb'), !!$('#saved-bias-card')]);
    ok('gone from Settings: "Reopen the live session"', !$('#settings-reopen-session'));
    // without the EA: the Long / Short buttons are how a trade gets logged live
    window.__stHasEA = function () { return false; }; updateSessionLiveBanner(); await W(300);
    ok('live, no EA: the quick log shows Long / Short', vis($('#session-quick-log')) && vis($('#quick-log-long')) && vis($('#quick-log-short')), [vis($('#session-quick-log')), vis($('#quick-log-long'))]);
    // with the EA: trades arrive by themselves; nothing of the quick log on screen, not even its empty box
    window.__stHasEA = function () { return true; }; data.settings = data.settings || {}; data.settings.liveManualLog = true; updateSessionLiveBanner(); await W(300);
    ok('live, with the EA: no quick log at all, an old "by hand" choice ignored', !vis($('#session-quick-log')) && !vis($('#quick-log-long')), [vis($('#session-quick-log')), getComputedStyle($('#session-quick-log')).display]);
    var add = $('#add-trade');
    ok('"+ Add trade" on screen while live', vis(add) && /Add Trade/i.test(add.textContent), add && [vis(add), add.textContent]);
    var n0 = ((data.review && data.review.trades) || []).length;
    add.click(); await W(500);
    var pop = $('.add-trade-popover.open'), item = pop && pop.querySelector('.add-trade-popover-item');
    if (item) { item.click(); await W(500); }
    var n1 = ((data.review && data.review.trades) || []).length;
    ok('...and it adds a trade', n1 === n0 + 1, [n0, n1, !!pop]);
    // the session countdown's small h / m / s and "left": 1 px bigger than they were (.62em), at any size of the row (27 Oct 2026)
    var ms = $('#meta-session'), un = document.createElement('span'); un.className = 'ms-u'; ms.appendChild(un);
    var fu = parseFloat(getComputedStyle(un).fontSize), fb = parseFloat(getComputedStyle(ms).fontSize); un.remove();
    ok('the countdown\'s h / m / s: 1 px bigger than .62 of the row', Math.abs(fu - (fb * 0.62 + 1)) < 0.05, [fu, fb]);
    // SESSION turns into ● SESSION LIVE during the session; the line under the tabs is gone (29 Oct 2026, Nestor: "turn session into
    // session live during the session? so the label turns green from grey, with the pulsing dot"; "make sure the dot is in the middle")
    var p2 = function (n) { return String(n).padStart(2, '0'); }, hm = function (d) { return p2(d.getHours()) + ':' + p2(d.getMinutes()); }, now = new Date();
    var s0 = (data.settings.sessions && data.settings.sessions[0]) ? JSON.parse(JSON.stringify(data.settings.sessions[0])) : { name: 'London' }, sKeep = data.settings.sessions;
    s0.start = hm(new Date(+now - 16 * 60000)); s0.end = hm(new Date(+now + 104 * 60000)); data.settings.sessions = [s0];   // a real live window: the head clock's own countdown
    for (var k = 0; k < 44 && !ms.classList.contains('is-live'); k++) await W(500);
    var cell = $('.meta-cell-ses'), offL = cell.querySelector('.msl-off'), onL = cell.querySelector('.msl-on'), dot = onL.querySelector('.msl-dot');
    ok('no separate "Session live" line under the tabs', !$('#session-live-pill'));
    // the row with the live label, and the same moment with the plain label (the class taken off and put back at once): every cell in place
    var rects = function () { return Array.prototype.map.call(document.querySelectorAll('.meta .meta-cell'), function (c) { var b = c.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.width), Math.round(b.top)]; }); };
    var rLive = rects(); ms.classList.remove('is-live'); var rPlain = rects(); ms.classList.add('is-live');
    var same = rLive.every(function (r, i) { return Math.abs(r[0] - rPlain[i][0]) <= 1 && Math.abs(r[1] - rPlain[i][1]) <= 1 && Math.abs(r[2] - rPlain[i][2]) <= 1; });
    ok('live: the Session cell\'s label reads ● SESSION LIVE in green over the countdown, and no cell in the row moves or resizes for it',
      ms.classList.contains('is-live') && vis(onL) && getComputedStyle(offL).visibility === 'hidden' && /session live|sesión en vivo/i.test(onL.textContent) && getComputedStyle(onL).color === getComputedStyle(ms).color && /left|quedan/.test(ms.textContent) && same,
      { cls: ms.className, label: onL.textContent, colour: getComputedStyle(onL).color, live: rLive, plain: rPlain });
    // the dot's middle on the middle of the capitals: the text's baseline (a 0-height mark on it) less half the font's capital height
    var tx = onL.querySelector('[data-i18n]'), mk = document.createElement('i'); mk.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'; tx.appendChild(mk);
    var base = mk.getBoundingClientRect().bottom; mk.remove();
    var cx = document.createElement('canvas').getContext('2d'), cs = getComputedStyle(tx); cx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var cap = cx.measureText('S').actualBoundingBoxAscent, db = dot.getBoundingClientRect(), off = (db.top + db.bottom) / 2 - (base - cap / 2);
    ok('the dot sits on the middle of the capitals (within 0.6 px)', Math.abs(off) <= 0.6, { off: Math.round(off * 100) / 100, dot: [db.top, db.bottom], base: base, cap: cap, font: cx.font });
    // the greeting moves up into the room the line had: as far under the tab buttons on Review as on Charts, and not cramped
    var gap = function () { var tbb = Math.max.apply(null, Array.prototype.map.call(document.querySelectorAll('.container > .tabs .tab'), function (t) { return t.getBoundingClientRect().bottom; })); var g = $('.page.active .st-asst'); return g ? Math.round(g.getBoundingClientRect().top - tbb) : -1; };
    window.scrollTo(0, 0); await W(200); var gReview = gap();
    window.__stLcForce = true; window.__stPlatOff = false;
    document.querySelector('.tab[data-page="livecharts"]').click(); for (k = 0; k < 40 && !$('#page-livecharts.active'); k++) await W(150); window.scrollTo(0, 0); await W(800); updateSessionLiveBanner(); await W(200);
    window.scrollTo(0, 0); await W(200); var gCharts = gap();
    ok('live: the greeting right under the tab buttons with room to breathe, the same on Review and Charts', gReview >= 16 && Math.abs(gReview - gCharts) <= 12, [gReview, gCharts]);
    // and out of the session: SESSION again, grey
    s0.start = hm(new Date(+now - 180 * 60000)); s0.end = hm(new Date(+now - 120 * 60000)); data.settings.sessions = [s0];
    for (k = 0; k < 44 && ms.classList.contains('is-live'); k++) await W(500);
    ok('out of the session: the label is SESSION again (grey), no live label', !ms.classList.contains('is-live') && !vis(onL) && getComputedStyle(offL).visibility !== 'hidden' && /^session$|^sesión$/i.test(offL.textContent.trim()), [ms.className, getComputedStyle(offL).visibility, vis(onL)]);
    data.settings.sessions = sKeep;
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
