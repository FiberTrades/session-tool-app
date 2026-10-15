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
  } catch (e) {
    check('the test ran to the end', false, (e && e.message) + ' @ ' + String((e && e.stack) || '').split('\n')[1]);
  }
  return JSON.stringify(results);
})()
