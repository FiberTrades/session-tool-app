(async function () {
  // The EA panel's ON stays locked while the EA in MT5 is off at its daily limit, until MT5 turns it back on (Nestor, 22 Oct 2026: "when
  // this turns OFF because of daily limit reached, dont allow to turn on until MT5 EA turns back ON"). A stand-in EA and its settings
  // report (made up here: nothing reaches a real EA). Live Charts in the tab.
  // Run: python tests/browser_test.py tests/daylock_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stLC); i++) await W(100);
    await W(800);
    var P = window.__stPractice, C = P._cfg(); C.layout = 1; C.tfs = [1, 60, 15, 240]; C.max = false; C.mm = Object.assign({}, C.mm, { col: false, on: false });
    window.__stLcForce = true;
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 250 && !(P._s() && P._s().live && P._panes().length && P._panes()[0].n); k++) await W(100);
    await W(500);
    var S = P._s(), LV = P._lv(), raw = S.sym.raw;
    S.ea = { raw: raw, lg: '999', v: '9.10' }; LV.set = LV.set || {}; LV.set[raw + '|999'] = { active: 0, max_trades_day: 1 };
    ok('the EA off, no limit said: not locked (press ON as before)', P._dayLocked() === false);
    P._lvEmsg({ m: raw + ' daily limit reached (1 trade). Stays off until your next day.', sym: raw, lg: '999' }); await W(50);
    ok('MT5 says its daily limit is reached: locked', P._dayLocked() === true);
    var on = document.querySelector('.stpr-mm [data-mm="on"]'); C.mm.on = false; if (on) on.click(); await W(80);
    ok('pressing ON here does nothing but say why', on && C.mm.on === false && /Daily limit reached in MT5/.test(document.getElementById('stpr-flash').textContent), [!!on, C.mm.on, document.getElementById('stpr-flash').textContent]);
    LV.set[raw + '|999'] = { active: 1, max_trades_day: 1 };
    ok('MT5 turns the EA back on: unlocked', P._dayLocked() === false);
    // after a reload nothing remembers the message: the EA off with today's trade at its maximum is the same lock
    LV.dayLock = {}; LV.set[raw + '|999'] = { active: 0, max_trades_day: 1 };
    var b = P._panes()[0].bars, t = b[b.length - 5].time;
    P._lvTr([{ ticket: 5, symbol: raw, direction: 'buy', lots: 1, entry_price: b[b.length - 5].close, exit_price: b[b.length - 2].close, open_time: new Date(t * 1000).toISOString(), close_time: new Date(b[b.length - 2].time * 1000).toISOString(), pnl: 1, risk_gbp: 1, login: '999' }]); await W(100);
    ok('no message (a reload): the EA off with today\'s 1 trade at its max of 1 is locked too', P._dayLocked() === true);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  window.__stLcForce = false;
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
