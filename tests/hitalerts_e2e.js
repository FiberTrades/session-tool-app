(async function () {
  // A trade's target or stop hit, on the PC and the phone (27 Oct 2026, Nestor: "can the TP and SL lines when hit also be a nudge/alarm
  // sent to the PC and phone?"): the alert says the result plainly - "Target hit on your EURUSD sell: +£2,497.50 · +5.0R · 20.0 pips",
  // "Stop hit ...: −£500.00 · −1.0R", break-even its own words - in the account's currency; and this window does not claim it as seen,
  // so the server pushes it to the phone as well. Stand-ins for the inbox and the claims; nothing is sent anywhere.
  // Run: python tests/browser_test.py tests/hitalerts_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stNudge && window.__stEA); i++) await W(100);
    await W(2000);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"], .st-greet-pop').forEach(function (e) { e.remove(); });
    var D = STCloud.getData(), A = D.accounts[0];
    A.name = 'FTMO 70K - Challenge'; A.kind = 'challenge'; A.currency = 'GBP'; A.riskRules = Object.assign({}, A.riskRules || {}, { beThresholdMode: 'amount', beThresholdAmount: 200 });
    var B = { id: 'acc_h_onefunded', name: 'OneFunded 10K', status: 'active', kind: 'challenge', currency: 'USD', startingBalance: 10000, createdAt: new Date().toISOString(), riskRules: { beThresholdMode: 'amount', beThresholdAmount: 20 } };
    D.accounts = [A, B]; D.mt5LoginMap = { '541419576': A.id, '27007659': B.id };
    D.settings = D.settings || {}; D.settings.nudges = Object.assign({}, D.settings.nudges || {}, { on: true, trades: true, sound: 'off' });
    window.currentUser = { id: '00000000-0000-0000-0000-0000000000e1', email: 'member@example.com' };
    var rows = { 900101: { entry_price: 1.12153, exit_price: 1.11953, unit_size: 0.0001, dist_unit: 'pips', direction: 'sell' } }, claims = [];
    var realSB = window.__stSB;
    window.__stSB = { from: function () { var tk = null, q = { select: function () { return q; }, eq: function (c, v) { if (c === 'ticket') tk = v; return q; }, maybeSingle: function () { return Promise.resolve({ data: rows[tk] || null, error: null }); } }; return q; }, rpc: function (n, a) { claims.push(a); return Promise.resolve({ data: true }); } };
    var realClaim = window._claimSessionAlertCloud;
    var card = function () { var c = document.getElementById('st-nudge'); return c ? c.textContent : ''; };
    var until = async function (re) { for (var k = 0; k < 60 && !re.test(card()); k++) await W(250); return card(); };   // a trade waits for the EA's settings (8 s at most)
    var close = function (tk, pnl, why, login, risk) { var now = new Date().toISOString(), raw = { ticket: tk, login: login, symbol: 'EURUSD', direction: 'short', opened_at: new Date(Date.now() - 600000).toISOString(), closed_at: now, close_reason: why, risk: risk, pnl: pnl };
      window.__stNudge.observe(null, { ticket: tk, closed: true, pnl: pnl, symbol: 'EURUSD', direction: 'short' }, raw); };
    close(900101, 2497.5, 'tp', '541419576', 500); await until(/Target hit on your EURUSD short: \+£2,497/);
    ok('a target hit: "Target hit on your EURUSD short: +£2,497.50 · +5.0R · 20.0 pips." on the PC', /Target hit on your EURUSD short: \+£2,497\.50 · \+5\.0R · 20\.0 pips\./.test(card()), card());
    close(900102, -500, 'sl', '541419576', 500); await until(/Stop hit/);
    ok('a stop hit: "Stop hit on your EURUSD short: −£500.00 · −1.0R."', /Stop hit on your EURUSD short: −£500\.00 · −1\.0R\./.test(card()), card());
    close(900103, 4.2, 'sl', '541419576', 500); await until(/break-even/);
    ok('out at break-even: its own words, no R', /Out at break-even on your EURUSD short: \+£4\.20\./.test(card()), card());
    close(900104, 140, 'tp', '27007659', 70); await until(/\$140/);
    ok('OneFunded\'s target in $: "+$140.00 · +2.0R"', /Target hit on your EURUSD short: \+\$140\.00 · \+2\.0R\./.test(card()), card());
    // EA 9.18: a trade opened on an account that copies, closed (reason "fol"): the Lead named by its account, from the EA's report
    var realRows = window.__stEA.rows, eaRows = {};
    window.__stEA.rows = function () { return eaRows; };
    eaRows = { 'r1': { login: 27007659, settings: { copy_role: 'follow', copy_lead: '541419576' }, updated_at: new Date().toISOString() } };
    close(900105, -0.12, 'fol', '27007659', 70); await until(/this account copies/);
    ok('closed on a Follow: "Closed your EURUSD short (−$0.12): this account copies FTMO 70K - Challenge, trade on the Lead."', /Closed your EURUSD short \(−\$0\.12\): this account copies FTMO 70K - Challenge, trade on the Lead\./.test(card()), card());
    eaRows = { 'r1': { login: 27007659, settings: { copy_role: 'follow', copy_lead: '90009999' }, updated_at: new Date().toISOString() } };
    close(900106, -0.10, 'fol', '27007659', 70); await until(/copies MT5 90009999/);
    ok('a Lead not in the journal: by its MT5 login', /this account copies MT5 90009999, trade on the Lead\./.test(card()), card());
    eaRows = {};
    close(900107, -0.08, 'fol', '27007659', 70); await until(/copies its Lead/);
    ok('no report from the EA yet: "its Lead"', /this account copies its Lead, trade on the Lead\./.test(card()), card());
    window.__stEA.rows = realRows;
    var src = await fetch('/app.html', { cache: 'no-store' }).then(function (r) { return r.text(); });
    ok('this window never claims a target or stop hit as seen, so the phone gets it too', /if \(\/\^tr_\(tp\|sl\|slp\|beout\)\$\/\.test\(x\.rule\)\) return; try \{ _claimSessionAlertCloud\('seen:'/.test(src));
    window.__stSB = realSB;
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
