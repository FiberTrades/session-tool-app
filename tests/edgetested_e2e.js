// End-to-end test: the Trading Edge Adjuster's Overall box says how many trades its rule was really tested on.
//   python tests/browser_test.py tests/edgetested_e2e.js
// Headless Edge, throwaway profile, signed out: nothing live is read or written.
// Nestor, 15 Oct 2026: "change the label to show how many trades were actually tested against this strategy" - the box
// said "Based on 109 trades" while its break-even rule was replayed on the 59 that carry the EA's break-even replay.
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
    doc.querySelectorAll('script:not([src])').forEach(function (s, i) {
      var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return;
      try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); }
    });
    check('every inline script parses', bad.length === 0, bad);

    // 35 trades: 15 break-evens the EA replayed (never moving to BE would have won 3R each), 5 break-evens and 10 losses
    // with no replay, 5 wins with a replay that never moving to BE leaves as wins
    var trades = [], day = Date.UTC(2026, 6, 1, 9), k = 0;
    function mk(res, r, sim) { var t = { id: 'tt' + k, date: new Date(day + k * 86400e3).toISOString(), symbol: 'EURUSD', result: res, r: r, risk: 100, sl: 5, pips: r * 5, costs: 0 };
      if (sim) t.beSim = sim; if (res === 'BE') t.bePotentialR = 0.2; if (res === 'Win') t.potentialR = 3; k++; trades.push(t); }   // best prices: the box shows from 10 of them
    for (var i = 0; i < 15; i++) mk('BE', 3, [3, 0, 0, 0, 0, 0, 0]);
    for (i = 0; i < 5; i++) mk('BE', 3);
    for (i = 0; i < 10; i++) mk('Lose', 3);
    for (i = 0; i < 5; i++) mk('Win', 3, [3, 3, 3, 3, 3, 3, 3]);

    setLanguage('en'); await W(100);
    renderCombinedAnalysis(trades); await W(100);
    var box = document.querySelector('#combo-wrap .combo-verdict'), lbl = box && box.querySelector('.cr-based');
    var st = box && box.querySelector('.cr-st');
    check('the Overall box recommends the break-even rule', !!st && /recommended/i.test(st.textContent) && /break-even|BE/i.test(box.textContent), st && st.textContent);
    check('its label says the rule was tested on the 20 replayed trades of 35', lbl && lbl.textContent.trim() === 'Tested on 20 of 35 trades', lbl && lbl.textContent);
    // every card says the same kind of truth (Nestor, 15 Oct 2026: "make all card display the truth about how many trades
    // were actually tested against"); a card short of evidence still says what it needs
    var card = function (L) { var b = Array.prototype.filter.call(document.querySelectorAll('#combo-wrap .combo-direction'), function (d) { var x = d.querySelector('.combo-direction-letter'); return x && x.textContent.trim() === L; })[0];
      var e = b && b.querySelector('.cr-based'); return e ? e.textContent.trim() : null; };
    var got = { A: card('A'), B: card('B'), C: card('C'), D: card('D'), E: card('E') };
    check('card D: tested on the 20 trades with the break-even replay', got.D === 'Tested on 20 of 35 trades', got);
    check('card B: tested on the 25 trades with a recorded best price', got.B === 'Tested on 25 of 35 trades', got);
    check('cards A, C and E, short of evidence, still say what they need', /10 needed/.test(got.A) && /10 needed/.test(got.C) && /10 needed/.test(got.E), got);

    setLanguage('es'); await W(100);
    renderCombinedAnalysis(trades); await W(100);
    lbl = document.querySelector('#combo-wrap .combo-verdict .cr-based');
    check('in Spanish too', lbl && lbl.textContent.trim() === 'Probada en 20 de 35 operaciones', lbl && lbl.textContent);
    setLanguage('en'); await W(100);

    // nothing to test: no replay at all, no rule beats what was done -> it still reads "Based on N trades"
    var plain = trades.map(function (t) { var c = Object.assign({}, t); delete c.beSim; return c; });
    renderCombinedAnalysis(plain); await W(100);
    box = document.querySelector('#combo-wrap .combo-verdict'); lbl = box && box.querySelector('.cr-based');
    check('no rule to show: it reads "Based on 35 trades"', lbl && lbl.textContent.trim() === 'Based on 35 trades', lbl && lbl.textContent);

    // ---- Losing runs (Nestor, 15 Oct 2026: "if i am doing a prop firm challenge and i lose 16 times in a row i would blow
    //      my account so i need also this type of information when you tell me to change my strategy") ----
    // A 10K prop account (10% overall, 5% daily), £100 a trade: 12 break-evens the replay says would have lost, 15 that
    // would have won 5R, and 5 real wins.
    data.accounts = [{ id: 'acc_p', name: 'Prop 10K', status: 'active', kind: 'challenge', accountType: 'prop', startingBalance: 10000, current: 10000, createdAt: '2026-01-01T00:00:00Z',
      riskRules: { maxDrawdownMode: 'pct', maxDrawdownPct: 10, ddType: 'static', firmDailyMode: 'pct', firmDailyPct: 5 } }];
    data.activeAccountId = 'acc_p'; data.viewScope = 'lifetime';
    function book(lossesFirst) {
      var out = [], dd = Date.UTC(2026, 6, 1, 9), n = 0;
      function add(res, r, sim, pot) { out.push({ id: 'p' + n, date: new Date(dd + n * 86400e3).toISOString(), entryTime: '09:00', symbol: 'EURUSD', accountId: 'acc_p', result: res, r: r, risk: 100, sl: 5, pips: r * 5, costs: 0,
        beSim: sim, bePotentialR: res === 'BE' ? 0.2 : undefined, potentialR: res === 'Win' ? r : undefined }); n++; }
      var wins = function () { for (var i = 0; i < 5; i++) add('Win', 3, [3, 3, 3, 3, 3, 3, 3]); };
      var lose12 = function () { for (var i = 0; i < 12; i++) add('BE', 5, [-1, 0, 0, 0, 0, 0, 0]); };
      if (lossesFirst) { lose12(); wins(); } else { wins(); lose12(); }
      for (var i = 0; i < 15; i++) add('BE', 5, [5, 0, 0, 0, 0, 0, 0]);
      return out;
    }
    var cardRuns = function (L) { var b = Array.prototype.filter.call(document.querySelectorAll('#combo-wrap .combo-direction'), function (d) { var x = d.querySelector('.combo-direction-letter'); return x && x.textContent.trim() === L; })[0];
      var row = b && Array.prototype.filter.call(b.querySelectorAll('.cr-row'), function (r) { return /Losing runs/.test(r.querySelector('.cr-k').textContent); })[0];
      return row ? row.querySelector('.cr-v').textContent : null; };
    var bk = book(false); data.currentSeries = bk; data.history = [];
    renderCombinedAnalysis(bk); await W(100);
    var rD = cardRuns('D');
    check('card D shows Losing runs: 12 in a row with the rule (now 0), on Prop 10K, with what it costs and the 1% view', !!rD && /12 losses in a row/.test(rD) && /\(now 0\)/.test(rD) && /Prop 10K/.test(rD) && /12\.0% of the account; 12% at 1% a trade/.test(rD), rD);
    check('...and checks the prop account: wins came first, so it stays inside its limits', !!rD && /Inside the daily and overall limits on Prop 10K/.test(rD), rD);
    var ov = document.querySelector('#combo-wrap .combo-verdict');
    check('the Overall box carries the same row for its best rule', !!ov && /Losing runs/.test(ov.textContent) && /12 losses in a row/.test(ov.textContent), ov && ov.textContent.replace(/\s+/g, ' ').slice(0, 300));
    bk = book(true); data.currentSeries = bk;
    renderCombinedAnalysis(bk); await W(100);
    rD = cardRuns('D');
    var bad = document.querySelector('#combo-wrap .combo-direction .cr-bad');
    check('the same losses FIRST: it says Prop 10K would have broken its overall limit, in red', !!rD && /Prop 10K would have broken its overall limit on/.test(rD) && !!bad, rD);
    data.currentSeries = []; data.accounts = [];
  } catch (e) {
    check('the test ran to the end', false, (e && e.message) + ' @ ' + String((e && e.stack) || '').split('\n')[1]);
  }
  return JSON.stringify(results);
})()
