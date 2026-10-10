(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var tk = todayDateStr(), dow = new Date().getDay();
  // make TODAY an unplanned day whatever weekday the test runs on: this week's commitment = every day but today
  var wk = Object.keys(data.weeklyCommitments || {})[0];
  data.settings.tradingDays = [0, 1, 2, 3, 4, 5, 6].filter(function (d) { return d !== dow; });
  data.weeklyCommitments = {}; data.activatedDays = []; data.biasHistory = [];
  ok('today starts as a day off', window.__stIsTradingDay(dow) === false, window.__stIsTradingDay(dow));
  var pick = function (g, v) { var e = document.querySelector('#page-bias [data-bias="' + g + '"] [data-value="' + v + '"]'); if (e && !e.classList.contains('selected')) e.click(); };
  pick('mode', 'Execution'); pick('structure', 'Trending'); pick('location', 'Premium Middle'); pick('direction', 'Unsure'); await W(400);
  ok('a complete bias was recorded for today', (data.biasHistory || []).some(function (e) { return e.dateKey === tk && e.structure === 'Trending'; }), (data.biasHistory || []).length);
  ok('filling the bias in does NOT switch the day on', (data.activatedDays || []).indexOf(tk) === -1 && window.__stIsTradingDay(dow) === false, [data.activatedDays, window.__stIsTradingDay(dow)]);
  // a journal already switched on by an unposted bias (how Nestor's was on 10 Oct)
  data.activatedDays = [tk];
  ok('a day switched on by an unposted bias no longer counts', window.__stIsTradingDay(dow) === false, window.__stIsTradingDay(dow));
  data.activatedDays = [];
  // the post path: copiedAt is stamped, then recordBiasIfComplete(true)
  data.bias.copiedAt = new Date().toISOString();
  recordBiasIfComplete(true);
  ok('posting the bias switches the day on', (data.activatedDays || []).indexOf(tk) !== -1 && window.__stIsTradingDay(dow) === true, [data.activatedDays, window.__stIsTradingDay(dow)]);
  // back to nothing, then a trade with a result
  data.bias.copiedAt = null; (data.biasHistory || []).forEach(function (e) { delete e.copiedAt; }); data.activatedDays = [];
  ok('reset: off again', window.__stIsTradingDay(dow) === false, window.__stIsTradingDay(dow));
  data.review.trades = [{ id: 't_test', date: new Date().toISOString().slice(0, 10) + 'T09:00:00.000Z', result: 'Win', r: 2, side: 'Long', symbol: 'EUR/USD' }];
  var utcSame = new Date().toISOString().slice(0, 10) === tk;
  try { renderTrades(); } catch (e) { ok('renderTrades ran', false, String(e)); }
  await W(300);
  ok('a trade with a result switches the day on' + (utcSame ? '' : ' (skipped: local date differs from UTC date right now)'), !utcSame || ((data.activatedDays || []).indexOf(tk) !== -1 && window.__stIsTradingDay(dow) === true), [data.activatedDays, window.__stIsTradingDay(dow)]);
  // a planned day is untouched by all this
  data.review.trades = []; data.activatedDays = []; data.settings.tradingDays = [0, 1, 2, 3, 4, 5, 6];
  ok('a planned day is still a trading day', window.__stIsTradingDay(dow) === true, window.__stIsTradingDay(dow));
  return out;
})()
