(async function () {
  // A trade closed at its take profit is marked TP, with MT5's fill against it (Nestor, 22 Oct 2026: "if i want a 20pips TP i expect
  // to get a 20pips TP like i would in MT5! fix this!"). His 16.76-lot sell: TP 1.12201, MT5's deal filled at 1.12206. 23 Oct 2026:
  // "i rather you kept this figures real too" - the pips, R and money are the fill's. Made-up trades on the real shared candles
  // (signed out): Trade Replay on Thu 1 Oct 2026, Live Charts with stand-in MT5 history.
  // Run: python tests/browser_test.py tests/tpfill_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stReplay && window.__stSB && window.__stPractice); i++) await W(100);
    await W(1000);
    var R = window.__stReplay;
    // ---- Trade Replay: a sell, 4-pip stop, 20-pip TP, filled half a pip short of it ----
    var e0 = 1.13215, trade = { mt5Ticket: 999999911, symbol: 'EURUSD', side: 'short', entryPrice: e0, closePrice: Math.round((e0 - 0.00195) * 1e5) / 1e5,
      openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 4, _tpPips: 20, _riskGbp: 500, pnl: 2359.81 };
    R.open(trade); for (var k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(800);
    var hr = document.getElementById('strp-hr').textContent, hp = document.getElementById('strp-hp').textContent;
    ok('Trade Replay header: the real R as filled (+4.88R, not the TP\'s +5.00R)', /^\+4\.8[78]R$/.test(hr.trim()), hr);
    ok('...the real pips marked "TP" with MT5\'s fill against it, and the real money', /\+19\.5p TP/.test(hp) && /−0\.5p fill/.test(hp) && /2,?359\.81/.test(hp), hp);
    var sc = document.getElementById('strp-scrub'); sc.value = sc.max; sc.dispatchEvent(new Event('input', { bubbles: true })); await W(300);
    var live = document.getElementById('strp-live').textContent;
    ok('...at the close, its P&L line: the real +4.88R, money and +19.5p, closed at TP (−0.5p fill)', /\+4\.8[78]R/.test(live) && /2,?359\.81/.test(live) && /\+19\.5p/.test(live) && /closed at TP/.test(live) && /−0\.5p fill/.test(live), live);
    try { document.getElementById('strp-close').click(); } catch (e) {} await W(300);
    // a trade closed well before its TP stays as it was
    var t2 = Object.assign({}, trade, { mt5Ticket: 999999912, closePrice: Math.round((e0 - 0.0012) * 1e5) / 1e5, pnl: 1400 });
    R.open(t2); for (k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length && R._s().ticket === '999999912'); k++) await W(100); await W(800);
    hr = document.getElementById('strp-hr').textContent; hp = document.getElementById('strp-hp').textContent;
    ok('a trade closed 8 pips before its TP: its own +3.00R and +12.0p, no TP note', /^\+3\.00R$/.test(hr.trim()) && /\+12\.0p/.test(hp) && !/TP/.test(hp), [hr, hp]);
    try { document.getElementById('strp-close').click(); } catch (e) {} await W(300);
    // no target recorded: the exit never passes for one
    var t3 = Object.assign({}, trade, { mt5Ticket: 999999913 }); delete t3._tpPips;
    R.open(t3); for (k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length && R._s().ticket === '999999913'); k++) await W(100); await W(800);
    hp = document.getElementById('strp-hp').textContent;
    ok('no TP recorded: the result as filled (+19.5p), no TP note', /\+19\.5p/.test(hp) && !/TP/.test(hp), hp);
    try { document.getElementById('strp-close').click(); } catch (e) {} await W(300);

    // ---- Live Charts: the trade's card ----
    var P = window.__stPractice, C = P._cfg(); C.layout = 1; C.tfs = [1, 60, 15, 240]; C.max = false;
    window.__stLcForce = true;
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (k = 0; k < 250 && !(P._s() && P._s().live && P._panes().length && P._panes()[0].n); k++) await W(100);
    await W(500);
    var S = P._s(), p = P._panes()[0], sym = S.sym.raw, b0 = p.bars[p.bars.length - 40], b1 = p.bars[p.bars.length - 20], e = b0.close;
    var r5 = function (v) { return Math.round(v * 1e5) / 1e5; };
    P._lvTr([
      { ticket: 8801, symbol: sym, direction: 'sell', lots: 16.76, entry_price: e, exit_price: r5(e - 0.00195), open_time: new Date(b0.time * 1000).toISOString(), close_time: new Date(b1.time * 1000).toISOString(),
        pnl: 2359.81, risk_gbp: 500, login: '', sl_moves: [[b0.time, r5(e + 0.0004)], [b0.time + 600, e]], tp_moves: [[b0.time, r5(e - 0.0020)]], sl_pips: 4, tp_pips: 20 },
      { ticket: 8802, symbol: sym, direction: 'sell', lots: 1, entry_price: e, exit_price: r5(e - 0.0012), open_time: new Date((b0.time + 300) * 1000).toISOString(),   // not the same minute: that reads as a copy close_time: new Date(b1.time * 1000).toISOString(),
        pnl: 120, risk_gbp: 40, login: '', sl_moves: [[b0.time, r5(e + 0.0004)]], tp_moves: [[b0.time, r5(e - 0.0020)]], sl_pips: 4, tp_pips: 20 }]);
    await W(300);
    var c1 = P._tmCardText(0, 8801), c2 = P._tmCardText(0, 8802);
    ok('Live Charts card, closed at its TP: the real +19.5 pips · +4.72R (money over risk), the exit marked TP', c1 && /Result\+19\.5 pips · \+4\.72R/.test(c1) && /TP/.test(c1), c1);
    ok('...how its target filled, in words (27 Oct 2026): "Filled 0.5 pips short of the target" (TP price → fill price), and the real money', c1 && /TPFilled 0\.5 pips short of the target \(/.test(c1) && /2,?359\.81/.test(c1), c1);
    ok('a trade closed before its TP: its own result (+12 pips, 3.00R from the money), no line about its target', c2 && /Result\+12(\.0)? pips · \+3\.00R/.test(c2) && !/short of the target|at the target|past the target/.test(c2), c2);
    P._lvTr([]);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  window.__stLcForce = false;
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
