// End-to-end test (Nestor, 3 Nov 2026: "make sure this is fixed!!"): a trade held past midnight or over a weekend keeps its card, its open time and its marks; only a real orphan goes.
// Run: python tests/browser_test.py tests/overnight_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 100 && !(window.__stLive && typeof newAccountBlank === 'function'); i++) await W(100);
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
    var dels = [], delR = window.__stLiveDeleteRow; window.__stLiveDeleteRow = function (t) { dels.push(Number(t)); };
    var hours = function (h) { return new Date(Date.now() - h * 3600000).toISOString(); };
    var yest = new Date(); yest.setDate(yest.getDate() - 1); yest.setHours(10, 0, 0, 0);
    var row = function (t, o) { return Object.assign({ ticket: t, login: 90001234, symbol: 'EURUSD', direction: 'long', risk: 100, opened_at: yest.toISOString(), seen_at: new Date().toISOString(), tick_at: new Date().toISOString(), r_now: 0.4, pnl_now: 40, sl_r: -1, tp_r: 3 }, o || {}); };

    window.__stLive.upsert(row(7001, { be_at: yest.toISOString() }));
    ok('opened yesterday, the EA still reporting it: it stays open', window.__stLive.isOpen(7001));
    ok('...and its row is not deleted from the feed', dels.indexOf(7001) < 0, dels);
    window.__stLive.upsert(row(7001));
    ok('...the next report (every 20 s) changes nothing', window.__stLive.isOpen(7001) && dels.indexOf(7001) < 0, dels);
    var seen = {}; try { seen = JSON.parse(localStorage.getItem('st_nudge_seen') || '{}'); } catch (e) {}
    ok('...and it is known as yesterday\'s trade, so it is never mistaken for a new one', !!seen['7001'] && seen['7001'] < todayDateStr(), seen['7001']);

    var wk = new Date(); wk.setDate(wk.getDate() - 3); wk.setHours(14, 0, 0, 0);
    window.__stLive.upsert(row(7002, { opened_at: wk.toISOString(), seen_at: hours(50) }));
    ok('held over a weekend, no prices so no reports for 50 hours: it stays', window.__stLive.isOpen(7002) && dels.indexOf(7002) < 0, dels);

    var old = new Date(); old.setDate(old.getDate() - 8);
    window.__stLive.upsert(row(7003, { opened_at: old.toISOString(), seen_at: hours(5 * 24) }));
    ok('nothing from the EA for 5 days: an orphan, it goes', !window.__stLive.isOpen(7003) && dels.indexOf(7003) >= 0, dels);
    window.__stLive.upsert({ ticket: 7004, symbol: 'EURUSD', direction: 'long', opened_at: yest.toISOString() });
    ok('an old row that never says when the EA last saw it: an orphan, it goes', !window.__stLive.isOpen(7004) && dels.indexOf(7004) >= 0, dels);
    window.__stLive.upsert(row(7005, { closed_at: yest.toISOString(), pnl: 50 }));
    ok('closed yesterday: still cleared away', dels.indexOf(7005) >= 0, dels);
    window.__stLive.upsert(row(7006, { closed_at: new Date().toISOString(), pnl: 50 }));
    ok('opened yesterday, closed today: it counts today, not deleted', dels.indexOf(7006) < 0, dels);

    window.__stLive.upsert(row(7001, { closed_at: new Date().toISOString(), pnl: 80 }));
    ok('the overnight trade closing today: no longer open, row kept for today', !window.__stLive.isOpen(7001) && dels.indexOf(7001) < 0, dels);
    window.__stLiveDeleteRow = delR;
  } catch (e) { out.push({ name: 'test ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
