(async function () {
  // A synced trade keeps its own symbol and lands in its own Session Review (11 Oct 2026).
  // Run: python tests/browser_test.py tests/symbolroute_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var S = window.__stSymbolForMt5, keepSyms = data.settings.symbols, keepPair = data.settings.pair;
  // gold was never mentioned in the app
  data.settings.symbols = ['EUR/USD'];
  ok('gold nobody told the app about is still gold, not the default pair', S('XAUUSD') === 'XAU/USD' && S('GOLD') === 'XAU/USD' && S('XAUUSD.r') === 'XAU/USD', [S('XAUUSD'), S('GOLD'), S('XAUUSD.r')]);
  ok('the default pair keeps the member’s own spelling, broker suffix or not', S('EURUSD') === 'EUR/USD' && S('EURUSD.r') === 'EUR/USD' && S('#EURUSDm') === 'EUR/USD', [S('EURUSD'), S('EURUSD.r'), S('#EURUSDm')]);
  ok('another pair gets its slash; an index or crypto keeps its code', S('GBPJPY') === 'GBP/JPY' && S('US30.cash') === 'US30' && S('NAS100') === 'NAS100' && S('BTCUSD') === 'BTCUSD', [S('GBPJPY'), S('US30.cash'), S('NAS100'), S('BTCUSD')]);
  ok('nothing from the broker: nothing decided here', S('') === '' && S(null) === '');
  // gold is one of the member's symbols, spelled their way
  data.settings.symbols = ['EUR/USD', 'XAUUSD'];
  ok('a symbol the member has takes their spelling', S('XAUUSD') === 'XAUUSD' && S('GOLD') === 'XAUUSD', [S('XAUUSD'), S('GOLD')]);
  // routing: one review per session and symbol
  data.settings.symbols = ['EUR/USD', 'XAU/USD'];
  var keepSlots = data.reviewSlots, keepRev = data.review;
  var eur = { slotIdx: 0, slotSession: 'London', slotSymbol: 'EUR/USD', trades: [] }, xau = { slotIdx: 0, slotSession: 'London', slotSymbol: 'XAU/USD', trades: [] };
  data.reviewSlots = [eur, xau]; data.review = eur;
  ok('a EUR/USD trade lands in the EUR/USD review, a gold trade in the XAU/USD one', _reviewSlotForTrade('EURUSD', '08:30') === eur && _reviewSlotForTrade('XAUUSD', '08:40') === xau && _reviewSlotForTrade('GOLD', '09:10') === xau, [(_reviewSlotForTrade('EURUSD', '08:30') || {}).slotSymbol, (_reviewSlotForTrade('XAUUSD', '08:40') || {}).slotSymbol]);
  ok('a broker suffix still finds its review', _reviewSlotForTrade('EURUSD.r', '08:30') === eur && _reviewSlotForTrade('XAUUSDm', '08:30') === xau, [(_reviewSlotForTrade('EURUSD.r', '08:30') || {}).slotSymbol, (_reviewSlotForTrade('XAUUSDm', '08:30') || {}).slotSymbol]);
  ok('whichever review is on screen', (function () { data.review = xau; var a = _reviewSlotForTrade('EURUSD', '08:30') === eur; data.review = eur; return a && _reviewSlotForTrade('XAUUSD', '08:30') === xau; })());
  ok('the import writes the trade’s own symbol on the row', html.indexOf("const _own = _symbolForMt5(t && t.symbol);") > 0 && html.indexOf("if (_own) row.symbol = _own; else if (_multiReview() && r.slotSymbol) row.symbol = r.slotSymbol;") > 0);
  data.reviewSlots = keepSlots; data.review = keepRev; data.settings.symbols = keepSyms; data.settings.pair = keepPair;
  return out;
})()
