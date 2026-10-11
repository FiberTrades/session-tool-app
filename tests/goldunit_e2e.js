(async function () {
  // Pips or points on gold (11 Oct 2026): a metal trade is worded the way the member's own EA words that symbol
  // (EA 8.93 says points on a 2-decimal gold quote). Words only - the maths never changes.
  // Run: python tests/browser_test.py tests/goldunit_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var DU = window.__stDU, EA = window.__stEA, rows = EA.rows();
  Object.keys(rows).forEach(function (k) { delete rows[k]; });
  var gold = { symbol: 'XAU/USD', distUnit: 'pips', pips: 3000 }, goldBare = { symbol: 'XAUUSD' }, eur = { symbol: 'EUR/USD', distUnit: 'pips' }, nq = { symbol: 'NAS100', distUnit: 'points' };
  ok('no EA heard from: gold reads pips, as before', DU.ofTrade(gold) === 'pips' && DU.ofTrade(goldBare) === 'pips' && EA.unitOf('XAUUSD') === null, [DU.ofTrade(gold), EA.unitOf('XAUUSD')]);
  EA.apply({ login: '1514906945', symbol: 'XAUUSD', updated_at: new Date().toISOString(), settings: { unit: 'points', sl_min: 300, sl_max: 600, tp_on: true, tp_mode: 'pips', tp_value: 3000, tp_close_pct: 100 } });
  EA.apply({ login: '1514906945', symbol: 'EURUSD', updated_at: new Date().toISOString(), settings: { unit: 'pips', sl_min: 2, sl_max: 4 } });
  ok('the EA says points on gold: the app says points', EA.unitOf('XAU/USD') === 'points' && DU.ofTrade(gold) === 'points' && DU.ofTrade(goldBare) === 'points', [EA.unitOf('XAU/USD'), DU.ofTrade(gold), DU.ofTrade(goldBare)]);
  ok('worded: 3000 points, short form pt', DU.lbl(DU.ofTrade(gold), 's') === 'points' && _pT(gold) === 'pt' && DU.words('Potential pips', DU.ofTrade(gold)) === 'Potential points', [DU.lbl(DU.ofTrade(gold), 's'), _pT(gold), DU.words('Potential pips', DU.ofTrade(gold))]);
  ok('EUR/USD stays pips, an index stays points', DU.ofTrade(eur) === 'pips' && _pT(eur) === 'p' && DU.ofTrade(nq) === 'points', [DU.ofTrade(eur), DU.ofTrade(nq)]);
  ok('a view with both reads pips/pts', DU.ofTrades([gold, eur]) === 'mixed' && DU.ofTrades([gold]) === 'points' && DU.ofTrades([eur]) === 'pips', [DU.ofTrades([gold, eur]), DU.ofTrades([gold])]);
  ok('the maths is untouched: gold is still sized as 0.01 of price', DU.symUnit('XAUUSD') === 'pips' && DU.mult('XAUUSD') === 100 && DU.mult('EURUSD') === 10000 && gold.distUnit === 'pips', [DU.symUnit('XAUUSD'), DU.mult('XAUUSD'), gold.distUnit]);
  var sum = EA.summary().filter(function (x) { return x.symbol === 'XAUUSD'; })[0];
  ok('the EA settings read in points too', !!sum && /300–600 points/.test(sum.settings) && /3000 points/.test(sum.settings), sum && sum.settings);
  // a broker with 3-decimal gold: the EA keeps saying pips, and so does the app
  EA.apply({ login: '1514906945', symbol: 'XAUUSD', updated_at: new Date(Date.now() + 1000).toISOString(), settings: { unit: 'pips', sl_min: 300, sl_max: 600 } });
  ok('an EA that says pips on gold (3-decimal feed): the app says pips', EA.unitOf('XAUUSD') === 'pips' && DU.ofTrade(gold) === 'pips', [EA.unitOf('XAUUSD'), DU.ofTrade(gold)]);
  ok('a suffixed broker symbol is matched', (function () { EA.apply({ login: '9', symbol: 'XAUUSD.r', updated_at: new Date(Date.now() + 5000).toISOString(), settings: { unit: 'points' } }); return EA.unitOf('XAU/USD') === 'points' && DU.shown('pips', 'XAUUSD') === 'points' && DU.shown('pips', 'EURUSD') === 'pips' && DU.shown('ticks', 'XAUUSD') === 'ticks'; })(), EA.unitOf('XAU/USD'));
  Object.keys(rows).forEach(function (k) { delete rows[k]; });
  return out;
})()
