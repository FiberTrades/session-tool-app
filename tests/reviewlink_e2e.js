(async function () {
  // A chart link pasted into the Session Review reaches the journal and the community post even after the journal was replaced by a
  // merged copy (Nestor, 23 Oct 2026: "when i paste a chart link in review, and i post to to community this chart doesnt show up in
  // the community review channel, why?" - a save from Live Charts' own window is taken in by putting a fresh copy of the journal in
  // place, and the card still wrote into the old trade). Signed out, nothing posted: the post's text is built and read.
  // Run: python tests/browser_test.py tests/reviewlink_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(document.readyState === 'complete' && typeof renderReviewTvLinks === 'function'); i++) await W(100);
    await W(1500);
    var LINK = 'https://x.sessionterminal.com/GZczL594';
    data.review.trades = [{ id: 't_e2e_link1', symbol: 'EUR/USD', side: 'Short', result: 'Win', r: '5', pips: '20', tvLinks: [] }];
    _activeReviewTradeIdx = 0; try { syncTradedFromTrades(); } catch (e) {} renderReviewTvLinks(); await W(100);
    var before = getActiveReviewTrade();
    // a save from another window of the app taken in: the whole journal replaced by an equal fresh copy
    data = migrate(JSON.parse(JSON.stringify(data))); await W(50);
    var after = getActiveReviewTrade();
    ok('the journal replaced by a fresh copy: the trade is now another object (the card was drawn for the old one)', after && before !== after && after.id === 't_e2e_link1', [!!after, before === after]);
    var ta = document.querySelector('#review-tv-list .tv-link-url');
    ta.value = LINK; ta.dispatchEvent(new Event('input', { bubbles: true })); await W(100);
    var cur = getActiveReviewTrade();
    ok('the pasted link is in the journal\'s trade (not only on screen)', (cur.tvLinks || []).some(function (l) { return l && l.url === LINK; }), cur.tvLinks);
    var msg = buildReviewMessage();
    ok('...and in the community post: "Trade 1 Chart 1" with the link', /Trade 1 Chart 1\s+https:\/\/x\.sessionterminal\.com\/GZczL594/.test(msg), msg.slice(-200));
    // replaced again, then posted with no edit in between: the post still takes the card's link
    var L2 = 'https://x.sessionterminal.com/AbCdEf12';
    var ta2 = document.querySelector('#review-tv-list .tv-link-url'); ta2.value = L2; ta2.dispatchEvent(new Event('input', { bubbles: true })); await W(50);
    data = migrate(JSON.parse(JSON.stringify(data)));
    getActiveReviewTrade().tvLinks = [];   // as if the copy taken in never had it
    var msg2 = buildReviewMessage();
    ok('the journal replaced again and the post built straight away: the link on screen is posted', msg2.indexOf(L2) >= 0, msg2.slice(-200));
    // a link the other copy has and the screen does not: kept
    data = migrate(JSON.parse(JSON.stringify(data)));
    var L3 = 'https://www.tradingview.com/x/9ak4O01J/';
    getActiveReviewTrade().tvLinks = getActiveReviewTrade().tvLinks.concat([{ url: L3, notes: '' }]);
    var msg3 = buildReviewMessage();
    ok('...a link the fresh copy has that the screen does not show stays too', msg3.indexOf(L3) >= 0 && msg3.indexOf(L2) >= 0, msg3.slice(-260));
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
