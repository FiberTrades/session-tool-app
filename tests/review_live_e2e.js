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
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
