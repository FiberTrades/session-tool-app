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
    function book(lossesFirst, risk) {
      risk = risk || 100;
      var out = [], dd = Date.UTC(2026, 6, 1, 9), n = 0;
      function add(res, r, sim, pot) { out.push({ id: 'p' + n, date: new Date(dd + n * 86400e3).toISOString(), entryTime: '09:00', symbol: 'EURUSD', accountId: 'acc_p', result: res, r: r, risk: risk, sl: 5, pips: r * 5, costs: 0,
        beSim: sim, bePotentialR: res === 'BE' ? 0.2 : undefined, potentialR: res === 'Win' ? r : undefined }); n++; }
      var wins = function () { for (var i = 0; i < 5; i++) add('Win', 3, [3, 3, 3, 3, 3, 3, 3]); };
      var lose12 = function () { for (var i = 0; i < 12; i++) add('BE', 5, [-1, 0, 0, 0, 0, 0, 0]); };
      if (lossesFirst) { lose12(); wins(); } else { wins(); lose12(); }
      for (var i = 0; i < 15; i++) add('BE', 5, [5, 0, 0, 0, 0, 0, 0]);
      return out;
    }
    // the Losing runs row is figures in boxes now (Nestor, 15 Oct 2026: "go with B but use losing runs idea from option A")
    var runsOf = function (box) { var row = box && Array.prototype.filter.call(box.querySelectorAll('.cr-row'), function (r) { return /Losing runs/.test(r.querySelector('.cr-k').textContent); })[0];
      if (!row) return null; var o = { tiles: {}, chips: [], why: '' };
      Array.prototype.forEach.call(row.querySelectorAll('.cr-rt'), function (x) { o.tiles[x.querySelector('b').textContent.replace('?', '').trim()] = { n: x.querySelector('strong').firstChild.textContent.trim(), sub: (x.querySelector('i') || {}).textContent || '' }; });
      o.chips = Array.prototype.map.call(row.querySelectorAll('.cr-chip'), function (x) { return { text: x.textContent, cls: x.className }; });
      var w = row.querySelector('.cr-rt-why'); o.why = w ? w.textContent : ''; o.q = !!row.querySelector('.cr-q'); o.wrap = row.querySelector('.cr-runs-wrap'); return o; };
    var cardOf2 = function (L) { return Array.prototype.filter.call(document.querySelectorAll('#combo-wrap .combo-direction'), function (d) { var x = d.querySelector('.combo-direction-letter'); return x && x.textContent.trim() === L; })[0]; };
    var cardRuns = function (L) { var b = Array.prototype.filter.call(document.querySelectorAll('#combo-wrap .combo-direction'), function (d) { var x = d.querySelector('.combo-direction-letter'); return x && x.textContent.trim() === L; })[0];
      var row = b && Array.prototype.filter.call(b.querySelectorAll('.cr-row'), function (r) { return /Losing runs/.test(r.querySelector('.cr-k').textContent); })[0];
      return row ? row.querySelector('.cr-v').textContent : null; };
    var bk = book(false); data.currentSeries = bk; data.history = [];
    renderCombinedAnalysis(bk); await W(100);
    var rD = cardRuns('D');
    var rr = runsOf(cardOf2('D'));
    check('card D shows Losing runs as figures: worst run now 0, with this rule 12 (with its dates and cost), not recommended from 5', !!rr && rr.tiles['Worst run now'].n === '0' && rr.tiles['With this rule'].n === '12' && /6–17 Jul · .*1,?200\.00/.test(rr.tiles['With this rule'].sub) && rr.tiles['Not recommended from'].n === '5', rr && rr.tiles);
    check('...its ? opens what the line means: about 5 losses in a row cost half of its £1,000.00 overall limit at £100.00 a loss', !!rr && rr.q && /About 5 losses in a row would cost half of its £1,000\.00 overall limit \(about £100\.00 a loss\)\. A rule whose worst run gets there, and is longer than yours now, is not recommended\./.test(rr.why) && getComputedStyle(rr.wrap.querySelector('.cr-rt-why')).display === 'none', rr && rr.why);
    rr.wrap.querySelector('.cr-q').click(); await W(50);
    check('...pressing the ? shows it', getComputedStyle(rr.wrap.querySelector('.cr-rt-why')).display === 'block');
    check('...and checks the prop account: wins came first, so a green tag says it stays inside its limits', !!rr && rr.chips.some(function (c) { return /Inside Prop 10K limits/.test(c.text) && /\bok\b/.test(c.cls); }), rr && rr.chips);
    // the new metric DECIDES (Nestor, 15 Oct 2026: "you must take this new metric into account to recommend changing strategies!!!")
    var cardOf = function (L) { return Array.prototype.filter.call(document.querySelectorAll('#combo-wrap .combo-direction'), function (d) { var x = d.querySelector('.combo-direction-letter'); return x && x.textContent.trim() === L; })[0]; };
    var dSt = cardOf('D').querySelector('.cr-st'), ovSt = document.querySelector('#combo-wrap .combo-verdict .cr-st');
    check('£100 a trade: that one run (£1,200) is more than the £1,000 overall limit, so D is NOT recommended, and says why', /cr-no/.test(dSt.className) && /One losing run would use 120% of its overall limit\./.test(cardOf('D').textContent) && /would use 120% of its overall limit/.test(cardOf('D').textContent), cardOf('D').textContent.replace(/\s+/g, ' ').slice(0, 400));
    check('...and the Overall box recommends no rule, giving the same reason', /cr-no/.test(ovSt.className) && /would use 120% of its overall limit/.test(document.querySelector('#combo-wrap .combo-verdict').textContent), ovSt.textContent);
    var ov = document.querySelector('#combo-wrap .combo-verdict');
    var ro = runsOf(document.querySelector('#combo-wrap .combo-verdict'));
    check('the Overall box carries the same row for its best rule', !!ro && ro.tiles['With this rule'].n === '12', ro && ro.tiles);
    bk = book(true); data.currentSeries = bk;
    renderCombinedAnalysis(bk); await W(100);
    rD = cardRuns('D');
    var rb = runsOf(cardOf2('D'));
    check('the same losses FIRST: a red tag says Prop 10K would break its overall limit', !!rb && rb.chips.some(function (c) { return /Prop 10K would break its overall limit on/.test(c.text) && /\bbad\b/.test(c.cls); }), rb && rb.chips);
    check('...not recommended, and that is the first reason', /cr-no/.test(cardOf('D').querySelector('.cr-st').className) && /Prop 10K would have broken its overall limit on .* with this rule\./.test(cardOf('D').textContent), cardOf('D').textContent.replace(/\s+/g, ' ').slice(0, 400));
    // £20 a trade: the same 12 losses are £240, 24% of the limit - the rule is recommended again
    bk = book(false, 20); data.currentSeries = bk;
    renderCombinedAnalysis(bk); await W(100);
    check('£20 a trade: the run uses 24% of the limit, so D is recommended, and so is the Overall box', /cr-yes/.test(cardOf('D').querySelector('.cr-st').className) && /cr-yes/.test(document.querySelector('#combo-wrap .combo-verdict .cr-st').className), [cardOf('D').querySelector('.cr-st').textContent, document.querySelector('#combo-wrap .combo-verdict .cr-st').textContent]);
    // ---- the break-even card picks the level that PASSES (Nestor, 15 Oct 2026: "make the be card pick the level that passes") ----
    // "Never" makes the most (+78R) but brings 12 losses in a row (£1,200, over the £1,000 limit); moving at 2R makes +75R
    // with no losing run at all.
    var book2 = function () {
      var out = [], dd = Date.UTC(2026, 6, 1, 9), n = 0;
      function add(res, r, sim) { out.push({ id: 'q' + n, date: new Date(dd + n * 86400e3).toISOString(), entryTime: '09:00', symbol: 'EURUSD', accountId: 'acc_p', result: res, r: r, risk: 100, sl: 5, pips: r * 5, costs: 0,
        beSim: sim, bePotentialR: res === 'BE' ? 0.2 : undefined, potentialR: res === 'Win' ? r : undefined }); n++; }
      for (var i = 0; i < 5; i++) add('Win', 3, [3, 3, 3, 3, 3, 3, 3]);
      for (i = 0; i < 12; i++) add('BE', 5, [-1, 0, 0, 0, 0, 0, 0]);
      for (i = 0; i < 15; i++) add('BE', 5, [6, 0, 0, 0, 5, 5, 0]);
      return out;
    };
    bk = book2(); data.currentSeries = bk;
    renderCombinedAnalysis(bk); await W(100);
    var dCard = cardOf('D'), dTxt = dCard ? dCard.textContent.replace(/\s+/g, ' ') : '';
    check('the top level (never) fails its losing runs, so the card recommends the best level that passes: move at 2R', /cr-yes/.test(dCard.querySelector('.cr-st').className) && /move at 2R/.test(dTxt) && /\+75\.00R/.test(dTxt), dTxt.slice(0, 300));
    check('...and says what it passed over and why', /Passed over/.test(dTxt) && /Stop moving to BE at all would make \+78\.00R/.test(dTxt) && /One losing run would use 120% of its overall limit\./.test(dTxt), dTxt.slice(0, 600));
    check('...the Overall box recommends the same level', /cr-yes/.test(document.querySelector('#combo-wrap .combo-verdict .cr-st').className) && /move at 2R/.test(document.querySelector('#combo-wrap .combo-verdict').textContent), document.querySelector('#combo-wrap .combo-verdict').textContent.replace(/\s+/g, ' ').slice(0, 300));
    data.currentSeries = []; data.accounts = [];
  } catch (e) {
    check('the test ran to the end', false, (e && e.message) + ' @ ' + String((e && e.stack) || '').split('\n')[1]);
  }
  return JSON.stringify(results);
})()
