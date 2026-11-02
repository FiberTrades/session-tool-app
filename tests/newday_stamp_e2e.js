(async function () {
  // The morning question (Nestor, 30 Oct 2026: "this morning i was not asked if i wanted to clear my bias and review from yesterday, why?"). The day was moved on with
  // yesterday's bias still in the form when two copies of the journal differed: the difference read as "today's work". Run: python tests/browser_test.py tests/newday_stamp_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 100 && typeof newAccountBlank !== 'function'; i++) await W(100);
    document.querySelectorAll('.stc-gate.open').forEach(function (g) { g.classList.remove('open'); });
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
    var yd = new Date(); yd.setDate(yd.getDate() - 1); yd.setHours(8, 0, 0, 0);
    var yKey = yd.getFullYear() + '-' + String(yd.getMonth() + 1).padStart(2, '0') + '-' + String(yd.getDate()).padStart(2, '0');
    var slot = function (dir, when) { return { symbol: 'EUR/USD', sessionName: 'London', sessionIdx: 0, mode: 'Execution', structure: 'Ranging', location: 'Discount Edge', direction: dir, notes: '', tvLinks: [], date: when, copiedAt: when, sessionDate: yKey }; };
    var journal = function (dir, when) { var d = JSON.parse(JSON.stringify(STCloud.getData())); d.biasSlots = [slot(dir, when)]; d.bias = d.biasSlots[0]; d.activeBiasSlot = 0; d.lastSessionDate = yd.toDateString(); return d; };
    var asked = function () { var m = document.getElementById('new-session-modal-bg'); return !!(m && m.classList.contains('show')); };
    window.__stJournalPulled = false;
    STCloud.setData(journal('Bearish', yd.toISOString()));
    window.dispatchEvent(new Event('focus')); await W(50);
    ok('the new day is noticed and the question waits for the journal', window.__stNewDayPending && window.__stNewDayPending() && !asked());
    STCloud.setData(journal('Bearish', yd.toISOString()));              // a first copy
    STCloud.setData(journal('Bullish', yd.toISOString()));              // a second copy that differs: not today's work, nobody touched it today
    window.__stJournalPulled = true; window.__stNewDayAfterPull(); await W(100);
    ok('two copies that differ: yesterday\'s bias still gets the question', asked(), { day: STCloud.getData().lastSessionDate, pending: window.__stNewDayPending() });
    ok('...and the day has not moved on without an answer', STCloud.getData().lastSessionDate === yd.toDateString(), STCloud.getData().lastSessionDate);
    try { document.getElementById('new-session-modal-bg').classList.remove('show'); } catch (e) {}
    // a bias really posted today: no question, and it is left alone
    window.__stJournalPulled = false;
    STCloud.setData(journal('Bearish', new Date().toISOString()));
    window.__stJournalPulled = true; window.__stNewDayAfterPull(); await W(100);
    ok('a bias posted today: no question', !asked(), STCloud.getData().lastSessionDate);
    ok('...and it stays as it is', STCloud.getData().biasSlots[0].direction === 'Bearish', STCloud.getData().biasSlots[0]);
  } catch (e) { out.push({ name: 'test ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
