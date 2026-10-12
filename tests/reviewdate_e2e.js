(async function () {
  // Session Review: every symbol's review carries today's date, not only the one on screen (12 Oct 2026). With two
  // symbols in a session, switching to the other one after midnight showed yesterday's date on an empty review.
  // Run: python tests/browser_test.py tests/reviewdate_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(3000);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  var keep = JSON.stringify({ a: data.accounts, act: data.activeAccountId, s: data.settings, bs: data.biasSlots, rs: data.reviewSlots, r: data.review, ars: data.activeReviewSlot });
  var ymd = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var today = ymd(new Date()), y = new Date(); y.setDate(y.getDate() - 1); var yesterday = ymd(y), b = new Date(); b.setDate(b.getDate() - 3); var threeAgo = ymd(b);

  // two symbols on the first session: a review for each
  data.settings.symbols = ['EUR/USD', 'XAU/USD']; data.settings.pair = 'EUR/USD';
  getSessions().forEach(function (s, i) { s.symbols = (i === 0) ? ['EUR/USD', 'XAU/USD'] : ['EUR/USD']; });
  data.biasSlots = []; data.reviewSlots = []; data.biasSlotsParked = {}; data.reviewSlotsParked = {};
  reconcileBiasSlots();
  var eur = data.reviewSlots.findIndex(function (r) { return r.slotSymbol === 'EUR/USD'; }), xau = data.reviewSlots.findIndex(function (r) { return r.slotSymbol === 'XAU/USD'; });
  ok('a review per symbol', eur >= 0 && xau >= 0 && eur !== xau, data.reviewSlots.map(function (r) { return r.slotSymbol; }));
  document.querySelector('.tab[data-page="review"]').click(); await W(400);
  var picker = document.getElementById('session-date');

  // ---- 1) the app was open over midnight: the review on screen moved on, the other one still says yesterday ----
  switchReviewSlot(xau); await W(150);
  data.reviewSlots[eur].sessionDate = yesterday; delete data.reviewSlots[eur].sessionDatePickedOn;
  data.reviewSlots[xau].sessionDate = today;
  switchReviewSlot(eur); await W(200);
  ok('switching to the other symbol shows today, not yesterday', picker.value === today && data.review.sessionDate === today && data.review.slotSymbol === 'EUR/USD', [picker.value, data.review.slotSymbol]);
  switchReviewSlot(xau); await W(150);
  ok('and switching back is still today', picker.value === today, picker.value);

  // ---- 2) the parked review is put right without being looked at ----
  data.reviewSlots[eur].sessionDate = yesterday;
  window.__stFreshDates(); await W(100);
  ok('returning to the app corrects every empty review, the one off screen too', data.reviewSlots[eur].sessionDate === today && data.reviewSlots[xau].sessionDate === today, [data.reviewSlots[eur].sessionDate, data.reviewSlots[xau].sessionDate]);

  // ---- 3) a review that holds yesterday's work keeps yesterday's date ----
  data.reviewSlots[eur].sessionDate = yesterday; data.reviewSlots[eur].trades = [{ result: 'Win', r: 2, direction: 'Long' }];
  window.__stFreshDates(); switchReviewSlot(eur); await W(200);
  ok('a review with a trade from yesterday is not re-dated', picker.value === yesterday && data.review.sessionDate === yesterday, picker.value);
  data.reviewSlots[eur].trades = []; data.reviewSlots[eur].reflection = 'held too long';
  data.reviewSlots[eur].sessionDate = yesterday;
  switchReviewSlot(xau); switchReviewSlot(eur); await W(200);
  ok('nor one that only has yesterday\'s answers', picker.value === yesterday, picker.value);
  data.reviewSlots[eur].reflection = '';

  // ---- 4) a past day picked on purpose stays, across a switch and a return to the app ----
  switchReviewSlot(xau); await W(150);
  picker.value = threeAgo; picker.dispatchEvent(new Event('change', { bubbles: true })); await W(100);
  ok('picking a past day is remembered as picked today', data.review.sessionDate === threeAgo && data.review.sessionDatePickedOn === today, [data.review.sessionDate, data.review.sessionDatePickedOn]);
  switchReviewSlot(eur); await W(100); switchReviewSlot(xau); await W(150);
  ok('it survives switching symbol and back, with the review still empty', picker.value === threeAgo, picker.value);
  window.__stFreshDates(); await W(100);
  ok('and returning to the app', data.reviewSlots[xau].sessionDate === threeAgo && picker.value === threeAgo, picker.value);
  data.reviewSlots[xau].sessionDatePickedOn = yesterday; window.__stFreshDates(); await W(100);
  ok('but not into the next day: picked yesterday, still empty, it is today again', data.reviewSlots[xau].sessionDate === today, data.reviewSlots[xau].sessionDate);

  // put things back
  try { var k = JSON.parse(keep); data.accounts = k.a; data.activeAccountId = k.act; data.settings = k.s; data.biasSlots = k.bs; data.reviewSlots = k.rs; data.review = (k.rs && k.rs[k.ars || 0]) || k.r; data.activeReviewSlot = k.ars; if (typeof saveData === 'function') saveData(); } catch (e) {}
  return out;
})()
