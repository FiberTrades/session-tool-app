(async function () {
  // A bias's LTF picks are part of the bias (12 Oct 2026). "Is this bias empty?" used to look at the HTF picks only, so
  // LTF picks left behind the LTF tab survived the day change without a question and went out with the next bias
  // (Nestor: "why did the LTF bias filled out by itself???? i never made those choises today" - they were Saturday's).
  // Run: python tests/browser_test.py tests/ltfcarry_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(3000);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  // as for a member: signed in, the journal in from the cloud (the new-day question waits for both since 22 Oct 2026)
  window.__stJournalPulled = true; document.querySelectorAll('.stc-gate.open').forEach(function (g) { g.classList.remove('open'); });
  var keep = JSON.stringify({ s: data.settings, bs: data.biasSlots, rs: data.reviewSlots, abs: data.activeBiasSlot, ars: data.activeReviewSlot, lsd: data.lastSessionDate, bh: data.biasHistory });
  var modal = function () { return document.getElementById('new-session-modal-bg'); };
  var shown = function () { var m = modal(); return !!(m && m.classList.contains('show')); };
  // a prompt left over from the journal the test profile starts with: answered "keep", so this test starts level
  if (shown()) { document.getElementById('new-session-keep').click(); await W(300); }
  var y = new Date(); y.setDate(y.getDate() - 2);
  var ymd = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var today = ymd(new Date());

  // two symbols on the first session
  data.settings.symbols = ['EUR/USD', 'XAU/USD']; data.settings.pair = 'EUR/USD';
  getSessions().forEach(function (s, i) { s.symbols = (i === 0) ? ['EUR/USD', 'XAU/USD'] : ['EUR/USD']; });
  data.biasSlots = []; data.reviewSlots = []; data.biasSlotsParked = {}; data.reviewSlotsParked = {}; data.biasHistory = [];
  reconcileBiasSlots();
  var eur = data.biasSlots.findIndex(function (b) { return b.symbol === 'EUR/USD'; }), xau = data.biasSlots.findIndex(function (b) { return b.symbol === 'XAU/USD'; });
  ok('a bias per symbol', eur >= 0 && xau >= 0 && eur !== xau, data.biasSlots.map(function (b) { return b.symbol; }));

  // ---- 1) what counts as a bias with something in it ----
  ok('nothing picked: empty', biasSlotHasContent({ mode: null, structure: null, tvLinks: [{ url: '', notes: '' }], notes: ' ' }) === false);
  ok('an LTF structure pick alone is content', biasSlotHasContent({ structureLtf: 'Trending' }) === true);
  ok('an LTF location pick alone is content', biasSlotHasContent({ locationLtf: 'Breakout' }) === true);
  ok('an LTF direction pick alone is content', biasSlotHasContent({ directionLtf: 'Bearish' }) === true);
  ok('a note under a chart box alone is content (it posts too)', biasSlotHasContent({ tvLinks: [{ url: '', notes: 'swept the low' }] }) === true);
  ok('HTF picks, notes and charts still are', biasSlotHasContent({ mode: 'Execution' }) && biasSlotHasContent({ notes: 'x' }) && biasSlotHasContent({ tvLinks: [{ url: 'https://www.tradingview.com/x/a/' }] }));

  // ---- 2) Saturday's case: the HTF picks were un-ticked, the LTF picks stayed, two days pass ----
  var setLeftover = function () {
    Object.assign(data.biasSlots[eur], newBiasBlank(), { structureLtf: 'Trending', locationLtf: 'Breakout', directionLtf: 'Bearish', date: y.toISOString(), sessionDate: ymd(y) });
    Object.assign(data.biasSlots[xau], newBiasBlank(), { sessionDate: ymd(y) });
    data.reviewSlots.forEach(function (r) { r.trades = []; });
    data.lastSessionDate = y.toDateString();
  };
  setLeftover(); switchBiasSlot(xau);   // the bias on screen is the OTHER symbol's, which is empty
  ok('yesterday\'s LTF picks on the other symbol count as a session to ask about', hasPriorSessionContent() === true);
  recheckNewDayOnResume(); await W(300);
  ok('the new day asks before anything is carried over', shown(), [shown(), data.lastSessionDate]);
  ok('and names the day they are from', /\d/.test((document.getElementById('new-session-body') || {}).textContent || ''), (document.getElementById('new-session-body') || {}).textContent);
  document.getElementById('new-session-confirm').click(); await W(400);
  var e = data.biasSlots[eur];
  ok('clearing takes the LTF picks with it', !e.structureLtf && !e.locationLtf && !e.directionLtf && !biasSlotHasContent(e) && e.sessionDate === today, [e.structureLtf, e.locationLtf, e.directionLtf, e.sessionDate]);
  ok('the day is rolled, so it is not asked twice', !shown() && data.lastSessionDate === new Date().toDateString());

  // ---- 3) the app stays open over the NEXT midnight too: it asks again (the first question's snapshot used to be
  //         kept, and against it the new leftover read as "changed since, so today's work": no question at all) ----
  setLeftover(); switchBiasSlot(eur);
  recheckNewDayOnResume(); await W(300);
  ok('a second day change in the same open app asks again', shown(), [shown(), data.lastSessionDate]);
  // "Keep previous" is still a choice: then they stay, on purpose
  document.getElementById('new-session-keep').click(); await W(300);
  ok('Keep previous keeps them', data.biasSlots[eur].directionLtf === 'Bearish' && !shown(), data.biasSlots[eur].directionLtf);
  // and a third day, after a Keep: asked again, with a whole HTF bias this time
  Object.assign(data.biasSlots[eur], newBiasBlank(), { mode: 'Execution', structure: 'Ranging', location: '50%', direction: 'Bullish', date: y.toISOString(), sessionDate: ymd(y) });
  data.lastSessionDate = y.toDateString();
  recheckNewDayOnResume(); await W(300);
  ok('and again the day after a Keep', shown(), shown());
  document.getElementById('new-session-confirm').click(); await W(400);
  ok('clearing then empties it', !biasSlotHasContent(data.biasSlots[eur]) && !shown(), biasSig(data.biasSlots[eur]));

  // ---- 4) on the form: un-ticking the HTF pick does not make a bias with LTF picks "empty" ----
  Object.assign(data.biasSlots[eur], newBiasBlank(), { sessionDate: today }); delete data.biasSlots[eur].clearedAt;
  switchBiasSlot(eur); document.querySelector('.tab[data-page="bias"]').click(); await W(400);
  var opt = function (g, v) { return document.querySelector('[data-bias="' + g + '"] .option[data-value="' + v + '"]'); };
  var tf = function (g, w) { document.querySelector('.tf-toggle[data-tf-for="' + g + '"] .tf-btn[data-tf="' + w + '"]').click(); };
  var prev = function () { return (document.getElementById('bias-preview') || {}).innerText || ''; };
  var emptyText = prev();
  tf('structure', 'htf'); opt('structure', 'Ranging').click(); await W(80);
  tf('structure', 'ltf'); opt('structure', 'Trending').click(); await W(80);
  ok('one pick on each timeframe', data.bias.structure === 'Ranging' && data.bias.structureLtf === 'Trending', [data.bias.structure, data.bias.structureLtf]);
  tf('structure', 'htf'); opt('structure', 'Ranging').click(); await W(120);   // un-tick the HTF pick
  ok('HTF un-ticked, the LTF pick is still there', data.bias.structure === null && data.bias.structureLtf === 'Trending', [data.bias.structure, data.bias.structureLtf]);
  ok('so the bias is not stamped as cleared', !data.bias.clearedAt, data.bias.clearedAt);
  ok('and the preview shows it instead of saying empty', prev() !== emptyText && /LTF/.test(prev()) && /Trending/i.test(prev()), prev().slice(0, 160));
  tf('structure', 'ltf');
  ok('the LTF tab shows the pick that is left', opt('structure', 'Trending').classList.contains('selected'));
  opt('structure', 'Trending').click(); await W(120);   // un-tick the last pick
  ok('nothing left: now it is empty, and stamped as cleared by hand', !biasSlotHasContent(data.bias) && !!data.bias.clearedAt && prev() === emptyText, [data.bias.clearedAt, prev().slice(0, 60)]);
  tf('structure', 'htf');

  // ---- 5) Clear bias empties both timeframes ----
  Object.assign(data.bias, { mode: 'Execution', structure: 'Ranging', structureLtf: 'Trending', location: '50%', locationLtf: 'Breakout', direction: 'Bearish', directionLtf: 'Bearish' });
  var _ac = window.appConfirm; window.appConfirm = async function () { return true; };
  document.getElementById('bias-reset').click(); await W(300);
  window.appConfirm = _ac;
  ok('Clear bias leaves no pick on either timeframe', !biasSlotHasContent(data.bias) && data.bias.structureLtf === null && data.bias.directionLtf === null, [data.bias.structureLtf, data.bias.directionLtf]);

  // put things back
  try { var k = JSON.parse(keep); data.settings = k.s; data.biasSlots = k.bs; data.reviewSlots = k.rs; data.activeBiasSlot = k.abs; data.activeReviewSlot = k.ars; data.lastSessionDate = k.lsd; data.biasHistory = k.bh;
    data.bias = (data.biasSlots && data.biasSlots[data.activeBiasSlot || 0]) || data.bias; data.review = (data.reviewSlots && data.reviewSlots[data.activeReviewSlot || 0]) || data.review; if (typeof saveData === 'function') saveData(); } catch (err) {}
  return out;
})()
