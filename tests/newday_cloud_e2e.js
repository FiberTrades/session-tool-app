(async function () {
  // The morning's "clear yesterday's bias and review?" (Nestor, 22 Oct 2026: "i didnt get the message this morning to clear the bias
  // and review, why????"). The question is armed from the local copy at load; the cloud journal replaces it a moment later. A
  // difference between the two copies used to read as "changed since the new day, so today's work" and the question was skipped
  // with yesterday's bias left in place. Now the reference is taken again from the cloud copy, the question is asked, and it sits
  // on top of everything (full-screen charts included).
  // Run: python tests/browser_test.py tests/newday_cloud_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var keep = JSON.stringify({ bs: data.biasSlots, b: data.bias, rs: data.reviewSlots, abs: data.activeBiasSlot, ars: data.activeReviewSlot, lsd: data.lastSessionDate });
  var modal = function () { return document.getElementById('new-session-modal-bg'); };
  var shown = function () { var m = modal(); return !!(m && m.classList.contains('show')); };
  try {
    for (var i = 0; i < 100 && !(window.STCloud && window.__stNewDayPending); i++) await W(100);
    if (shown()) { document.getElementById('new-session-keep').click(); await W(300); }
    var y = new Date(Date.now() - 86400000), yIso = y.toISOString(), yDay = yIso.slice(0, 10);
    var slot = { symbol: 'EUR/USD', sessionName: 'London', mode: 'Undecided', structure: 'Ranging', direction: 'Unsure', notes: '', date: yIso, copiedAt: yIso, sessionDate: yDay,
      tvLinks: [{ url: 'https://www.tradingview.com/x/AbCd1234/' }, { url: 'https://www.tradingview.com/x/EfGh5678/' }] };
    // the local copy at load: yesterday's bias, the day not handled yet -> the question is armed from it
    data.biasSlots = [JSON.parse(JSON.stringify(slot))]; data.activeBiasSlot = 0; data.bias = data.biasSlots[0];
    data.lastSessionDate = y.toDateString();
    // signed out, or the journal not in from the cloud yet: armed, not asked - the copy on the device can be days old (Troy's
    // iPhone, 22 Oct 2026: asked over the sign-in screen from its 19-Oct copy, and that copy then went up over his journal)
    var gate = document.querySelector('.stc-gate');
    window.__stJournalPulled = false; recheckNewDayOnResume(); await W(300);
    ok('the journal not in from the cloud yet: the question waits (armed, not on screen)', !shown() && window.__stNewDayPending(), [shown(), window.__stNewDayPending()]);
    window.__stJournalPulled = true; if (gate) gate.classList.add('open'); recheckNewDayOnResume(); await W(300);
    ok('on the sign-in screen: not asked over it', !shown() && window.__stNewDayPending(), [shown(), window.__stNewDayPending()]);
    if (gate) gate.classList.remove('open'); window.__stNewDayAfterPull(); await W(300);
    ok('signed in with the journal in: the new day asks about yesterday\'s bias', shown() && window.__stNewDayPending(), [shown(), data.lastSessionDate]);
    ok('...on top of everything (above full-screen charts at 9000)', +getComputedStyle(modal()).zIndex >= 100000, getComputedStyle(modal()).zIndex);
    document.getElementById('new-session-modal-bg').classList.remove('show');   // as if it were covered and not seen yet
    // the cloud journal arrives: the same bias, one chart link spelled differently (the copies differ)
    var cloud = JSON.parse(JSON.stringify(data)); cloud.biasSlots[0].tvLinks[1].url = 'https://www.tradingview.com/x/EfGh5678'; cloud.bias = cloud.biasSlots[0];
    window.STCloud.setData(cloud); await W(300);
    ok('the cloud copy arrives: the question is still open', window.__stNewDayPending(), window.__stNewDayPending());
    // coming back to the app (focus): the question is asked, not skipped as "today's work"
    recheckNewDayOnResume(); await W(300);
    ok('back at the app: the question is on screen, yesterday\'s bias not marked as handled', shown() && data.lastSessionDate !== new Date().toDateString(), [shown(), data.lastSessionDate]);
    document.getElementById('new-session-confirm').click(); await W(400);
    var b0 = (data.biasSlots || [])[0] || {};
    ok('Yes clears yesterday\'s bias and marks the day handled', !b0.mode && !b0.structure && !b0.direction && data.lastSessionDate === new Date().toDateString(), [b0.mode, b0.structure, data.lastSessionDate]);
    // a real edit made today, after the cloud copy, still counts as today's work (kept)
    data.biasSlots = [JSON.parse(JSON.stringify(slot))]; data.activeBiasSlot = 0; data.bias = data.biasSlots[0]; data.lastSessionDate = y.toDateString();
    recheckNewDayOnResume(); await W(300);
    var c2 = JSON.parse(JSON.stringify(data)); window.STCloud.setData(c2); await W(200);   // the cloud copy (same)
    data.biasSlots[0].direction = 'Bullish'; data.bias = data.biasSlots[0];   // then today's own pick
    recheckNewDayOnResume(); await W(300);
    ok('an edit made today after the cloud copy still counts as today\'s work (no question, nothing cleared)', !shown() && data.biasSlots[0].direction === 'Bullish', [shown(), data.biasSlots[0].direction]);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { var k = JSON.parse(keep); data.biasSlots = k.bs; data.bias = k.b; data.reviewSlots = k.rs; data.activeBiasSlot = k.abs; data.activeReviewSlot = k.ars; data.lastSessionDate = k.lsd; if (shown()) modal().classList.remove('show'); } catch (e) {}
  return JSON.stringify(out);
})()
