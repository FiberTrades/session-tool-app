(async function () {
  // The assistant's weekly summary card on Session Bias (24 Oct 2026), mostly data: four equal tiles, R per day with the best trade
  // starred, the rule checks (green kept / amber nudged, never red), two short lines, Got it. A row carries its numbers (`card`); a row
  // without them is worked out from the journal. weekly_summaries is stood in for - nothing is read or written.
  // Run: python tests/browser_test.py tests/weekly_card_e2e.js        (phone: E2E_MOBILE=375x812 in front)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  ok('the card and its loader are in the app', !!document.getElementById('st-week') && !!(window.__stWeekly && window.__stWeekly.load));
  // the card the server wrote for Nestor's week of 19 Oct in a dry run
  var CARD = { week: '2026-10-19', netR: 3.44, trades: 2, wins: 1, losses: 1, bes: 0, winRate: 50, daysTraded: 2, plannedDays: 5,
    days: [{ key: '2026-10-19', dow: 1, r: -1.28, n: 1 }, { key: '2026-10-20', dow: 2, r: 0, n: 0 }, { key: '2026-10-21', dow: 3, r: 0, n: 0 }, { key: '2026-10-22', dow: 4, r: 4.72, n: 1 }, { key: '2026-10-23', dow: 5, r: 0, n: 0 }],
    best: { r: 4.72, key: '2026-10-22' },
    rules: [{ id: 'session', flagged: 1 }, { id: 'trades', flagged: 1 }, { id: 'daily', flagged: 0 }, { id: 'risk', flagged: 1 }, { id: 'stop', flagged: 0 }, { id: 'news', flagged: 0 }, { id: 'bias', flagged: 0 }],
    highlight: 'Nestor, a strong Thursday win of +4.72R helped close the week at +3.44R, with five biases posted.', focus: 'Next week, keep an eye on your session times.' };
  var calls = [], rows = [{ id: 'w1', week_key: '2026-10-19', body: 'x', card: CARD, created_at: new Date().toISOString() }];
  var chain = function (val, log) {
    var p = Promise.resolve(val);
    ['select', 'eq', 'is', 'order', 'limit', 'in', 'maybeSingle'].forEach(function (m) { p[m] = function () { log.push([m].concat([].slice.call(arguments))); return p; }; });
    return p;
  };
  var realSB = window.__stSB, realUser = window.currentUser, realPulled = window.__stJournalPulled;
  window.__stSB = { from: function (t) {
    var log = [t]; calls.push(log);
    return { select: function () { log.push(['select'].concat([].slice.call(arguments))); return chain({ data: rows.slice(), error: null }, log); },
             update: function (v) { log.push(['update', v]); return chain({ data: null, error: null }, log); } };
  } };
  window.currentUser = { id: '00000000-0000-0000-0000-0000000000aa', email: 'member@example.com' };
  window.__stJournalPulled = true;
  try { document.querySelector('.tab[data-page="bias"]').click(); } catch (e) {}
  await W(200);
  await window.__stWeekly.load(); await W(200);
  var el = document.getElementById('st-week'), txt = function (n) { return n ? n.innerText.replace(/\s+/g, ' ').trim() : ''; };
  var tiles = el ? [].map.call(el.querySelectorAll('.st-wk-tile'), function (x) { return txt(x); }) : [];
  var head = txt(el.querySelector('.st-wk-head'));
  ok('title row: "Your week", the week 19 – 25 Oct, and a soft status "Strong week" in green', /Your week/.test(head) && /19 – 25 Oct/i.test(head) && /Strong week/i.test(head) && !!el.querySelector('.st-wk-status.good'), head);
  ok('four tiles: Net R, Trades, Win rate, Days traded', tiles.length === 4 && /Net R/i.test(tiles[0]) && /Trades/i.test(tiles[1]) && /Win rate/i.test(tiles[2]) && /Days traded/i.test(tiles[3]), tiles);
  ok('Net R +3.44R in green, +1.72R a trade under it', /\+3\.44R/.test(tiles[0]) && el.querySelector('.st-wk-tile .st-wk-v').classList.contains('g') && /avg \+1\.72R a trade/.test(tiles[0]), tiles[0]);
  ok('Trades 2, with 1 W · 1 L under it', /2/.test(tiles[1]) && /1 W · 1 L/.test(tiles[1]), tiles[1]);
  ok('Win rate 50%', /50\s*%/.test(tiles[2]), tiles[2]);
  ok('Days traded 2 / 5, days planned', /2\s*\/\s*5/.test(tiles[3]) && /days planned/.test(tiles[3]), tiles[3]);
  var tb = [].map.call(el.querySelectorAll('.st-wk-tile'), function (x) { var b = x.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; });
  ok('the tiles are the same size', tb.length === 4 && tb.every(function (b) { return Math.abs(b[0] - tb[0][0]) <= 1 && Math.abs(b[1] - tb[0][1]) <= 1; }), tb);
  var svg = el.querySelector('.st-wk-chart svg'), bars = svg ? [].filter.call(svg.querySelectorAll('rect'), function (r) { return /^#(E56767|4ECD8B)$/.test(r.getAttribute('fill')); }) : [];
  ok('R by day: Mon to Fri, a red bar Monday and a green one Thursday, each with its R on it', svg && bars.length === 2 && bars[0].getAttribute('fill') === '#E56767' && bars[1].getAttribute('fill') === '#4ECD8B' && /−1\.28R/.test(svg.textContent) && /Mon.*Tue.*Wed.*Thu.*Fri/.test(svg.textContent), svg ? svg.textContent : 'no chart');
  ok('the best trade is starred on its bar and named above the chart: "Best trade ★ +4.72R Thu"', svg && /★ \+4\.72R/.test(svg.textContent) && /Best trade ★ \+4\.72R Thu/.test(txt(el.querySelector('.st-wk-lbl em'))), [svg && svg.textContent, txt(el.querySelector('.st-wk-lbl em'))]);
  var chips = el ? [].map.call(el.querySelectorAll('.st-wk-chip'), function (x) { return [x.className.replace('st-wk-chip ', ''), txt(x).replace(/^([!✓]) /, '$1')]; }) : [];
  var groups = [].map.call(el.querySelectorAll('.st-wk-group'), function (g) { return txt(g); });
  ok('rules in two groups: Kept (daily loss, stop loss, red news, with your bias) then To watch (in session, trades per day, risk per trade, 1 day each)', groups.length === 2
    && /^Kept/i.test(groups[0]) && /Daily loss/.test(groups[0]) && /Stop loss/.test(groups[0]) && /Red news/.test(groups[0]) && /With your bias/.test(groups[0])
    && /^To watch/i.test(groups[1]) && chips.filter(function (c) { return c[0] === 'flag'; }).map(function (c) { return c[1].replace(/\s+/g, ' '); }).join('|') === '!Session reminder · 1 day|!Trades a day reminder · 1 day|!Risk reminder · 1 day', [groups, chips]);
  ok('never a red chip', !el.querySelector('.st-wk-chip.bad, .st-wk-chip.red'));
  var lines = txt(el.querySelector('.st-wk-lines'));
  ok('then the two lines, labelled: Highlight, then Focus', /^Highlight .*\+4\.72R helped close the week.* Focus Next week, keep an eye on your session times\.$/i.test(lines), lines);
  var gb = el.querySelector('[data-st-week-ok]'), eb = el.getBoundingClientRect();
  ok('Got it sits on the right', gb && Math.abs(gb.getBoundingClientRect().right - (eb.right - parseFloat(getComputedStyle(el).paddingRight) - 1)) < 4, gb && [gb.getBoundingClientRect().right, eb.right]);
  var q = calls.filter(function (c) { return c[0] === 'weekly_summaries'; })[0] || [];
  ok('it asks for the newest unread one, with its numbers', JSON.stringify(q).indexOf('card') > 0 && JSON.stringify(q).indexOf('"is","read_at",null') > 0 && JSON.stringify(q).indexOf('"limit",1') > 0, JSON.stringify(q));
  if (window.innerWidth <= 420) {
    var tt = [].map.call(el.querySelectorAll('.st-wk-tile'), function (x) { return Math.round(x.getBoundingClientRect().top); });
    ok('phone: the tiles are 2 × 2', tt[0] === tt[1] && tt[2] === tt[3] && tt[2] > tt[0], tt);
    var ch = el.querySelector('.st-wk-chart');
    ok('phone: the chart spans the card, nothing wider than the screen', svg && Math.abs(svg.getBoundingClientRect().width - ch.clientWidth) < 6 && document.documentElement.scrollWidth <= window.innerWidth + 1, [svg && svg.getBoundingClientRect().width, ch.getBoundingClientRect().width, document.documentElement.scrollWidth]);
    var rb = el.getBoundingClientRect();
    ok('phone: the chips wrap inside the card', [].every.call(el.querySelectorAll('.st-wk-chip'), function (x) { return x.getBoundingClientRect().right <= rb.right + 1; }));
  }
  // Got it
  var btn = el.querySelector('[data-st-week-ok]'); if (btn) btn.click();
  await W(80);
  ok('Got it: the button says it was read', btn && /Read/.test(btn.textContent) && btn.disabled, btn && btn.textContent);
  var u = calls.filter(function (c) { return c[0] === 'weekly_summaries' && JSON.stringify(c).indexOf('"update"') > 0; }).pop() || [], us = JSON.stringify(u);
  ok('and every unread one of this member is marked read (read_at only)', u[0] === 'weekly_summaries' && /"update",\{"read_at":"/.test(us) && us.indexOf('"eq","user_id","00000000-0000-0000-0000-0000000000aa"') > 0 && us.indexOf('"is","read_at",null') > 0, us);
  await W(1400);
  ok('then the card goes', el.hidden);
  // a row stored without its numbers: worked out from the journal
  var acc = newAccountBlank('Personal 10K', 10000, 'personal'); acc.kind = 'personal'; acc.riskRules = { maxTrades: 1 };
  data.accounts = [acc]; data.activeAccountId = acc.id; data.viewScope = acc.id; data.history = []; data.reviewSlots = null; data.review = { trades: [] };
  data.settings.tradingDays = [1, 2, 3, 4, 5]; data.weeklyCommitments = {}; data.timeOff = [];
  var at = function (day, g) { return { id: 'wk' + day, accountId: acc.id, symbol: 'EUR/USD', date: '2026-10-' + day + 'T09:30:00', result: g > 0 ? 'Win' : g < 0 ? 'Lose' : 'BE', r: g / 100, risk: 100, actualGross: g, costs: 0 }; };
  data.currentSeries = [at('06', 200), at('07', -100), at('08', 0)]; rebuildSeriesByDate();
  data.nudgeLog = { '2026-10-07': { 'limit:1': { at: '09:40', rule: 'limit', text: 'x' } } };
  rows = [{ id: 'w0', week_key: '2026-10-05', body: 'Old text.', created_at: new Date().toISOString() }];
  await window.__stWeekly.load(); await W(200);
  tiles = [].map.call(el.querySelectorAll('.st-wk-tile'), function (x) { return txt(x); });
  chips = [].map.call(el.querySelectorAll('.st-wk-chip'), function (x) { return [x.className.replace('st-wk-chip ', ''), txt(x).replace(/^([!✓]) /, '$1')]; });
  ok('no stored numbers: worked out from the journal (+1.00R, 3 trades 1 W · 1 L · 1 BE, 50%, 3 / 5)', /\+1\.00R/.test(tiles[0]) && /3/.test(tiles[1]) && /1 W · 1 L · 1 BE/.test(tiles[1]) && /50\s*%/.test(tiles[2]) && /3\s*\/\s*5/.test(tiles[3]), tiles);
  ok('its rule checks: trades per day amber on 1 day; daily loss and risk per trade not shown (not set)', chips.some(function (c) { return c[0] === 'flag' && /Went over your trades a day · 1 day/.test(c[1]); }) && !chips.some(function (c) { return /Daily loss|Risk per trade/.test(c[1]); }), chips);
  ok('and the text it was stored with, as its summary', /Summary Old text\./i.test(txt(el.querySelector('.st-wk-lines'))), txt(el.querySelector('.st-wk-lines')));
  // A trade and its copies are ONE trade (Nestor, 1 Nov 2026: "I only took 2 trades, the 3rd one was a copy trade"): his real week of 26 Oct, with the app's card and the server's.
  var acc2 = newAccountBlank('TTT', 5000, 'prop'); acc2.kind = 'prop';
  data.accounts = [acc, acc2];
  var WK = [
    { id: 'a1', accountId: acc.id, symbol: 'EUR/USD', date: '2026-10-26T12:00:00.000Z', openTs: '2026-10-26T09:29:07+00:00', result: 'Win', r: 5, risk: 500, actualGross: 2420.04, costs: 62.48 },
    { id: 'a2', accountId: acc.id, symbol: 'EUR/USD', date: '2026-10-30T12:00:00.000Z', openTs: '2026-10-30T08:13:52+00:00', result: 'BE', r: 5, risk: 500, actualGross: 12.4, costs: 62.45, ideaId: '1900728' },
    { id: 'a3', accountId: acc2.id, symbol: 'EUR/USD', date: '2026-10-30T12:00:00.000Z', openTs: '2026-10-30T08:13:52+00:00', result: 'BE', r: 4.44, risk: 49.95, actualGross: 13.32, costs: 0, ideaId: '1900728' }];
  var NL = { '2026-10-30': { 'against_bias:1900728': { at: '08:13', rule: 'against_bias', text: 'This long is against your bearish HTF bias on EUR/USD.' } } };
  data.currentSeries = JSON.parse(JSON.stringify(WK)); data.history = []; rebuildSeriesByDate(); data.nudgeLog = NL; data.settings.tradingDays = [1, 2, 3, 5];
  var appC = window.__stWeekly.card('2026-10-26');
  var fri = function (c) { return c.days.filter(function (d) { return d.key === '2026-10-30'; })[0]; };
  var WKNET = Math.round((2357.56 / 500 - 50.05 / 500) * 100) / 100;   // Monday's win and the Lead's break-even
  ok('the app\'s card: 2 trades, 1 W 0 L 1 BE, not 3', appC.trades === 2 && appC.wins === 1 && appC.losses === 0 && appC.bes === 1, appC);
  ok('the app\'s card: Friday is the Lead\'s own trade, -0.10R, not a blend of both accounts (-0.07R), and it counts once', appC.netR === WKNET && fri(appC).n === 1 && fri(appC).r === -0.1 && appC.daysTraded === 2, [appC.netR, fri(appC)]);
  (function () {
    var rev = JSON.parse(JSON.stringify(WK)); rev[1].copyFollow = false; rev[2].copyFollow = true; var flip = [rev[0], rev[2], rev[1]];
    data.currentSeries = flip; rebuildSeriesByDate();
    var cc = window.__stWeekly.card('2026-10-26');
    ok('...the same when the copy is listed first (it opened a moment before the Lead)', fri(cc).r === -0.1 && fri(cc).n === 1, fri(cc));
    var mg = window.__stIdeaMerge(flip).filter(function (t) { return t._ideaN === 2; })[0];
    ok('...money still adds every account, R is still the Lead\'s', !!mg && mg.costs === 62.45 && Math.abs(mg.actualGross - 25.72) < 0.001 && Math.abs(tradeRforMath(mg) - tradeRforMath(rev[1])) < 1e-9, mg && [mg.costs, mg.actualGross]);
    data.currentSeries = JSON.parse(JSON.stringify(WK)); rebuildSeriesByDate();
  })();
  // the server's card, from the function's own source
  var src = await (await fetch('/supabase/functions/weekly-summary/index.ts')).text();
  var part = src.slice(src.indexOf('// ---------- the week, in the member'), src.indexOf('// ---------- the words'));
  part = part.replace(/export function/g, 'function').replace(/new Set<string>\(/g, 'new Set(').replace(/:\s*Promise<Set<string>>/g, '').replace(/:\s*Set<string>/g, '')
    .replace(/:\s*Record<string,\s*\w+>/g, '').replace(/:\s*\[string,\s*string\[\]\]\[\]/g, '').replace(/:\s*(Any|string|number)(\[\])?/g, '').replace('inWeek: (k) => boolean', 'inWeek');
  var srvF = null, srvErr = null;
  try { srvF = new Function('admin', 'TRIAL_DAYS', 'ALLOW_ID', 'CHAT_PLANS', part + '\nreturn weekFacts;')({}, 14, {}, new Set()); } catch (e) { srvErr = String(e); }
  ok('the server function\'s week code loads here', !!srvF, srvErr);
  if (srvF) {
    var f = srvF({ s: { tz: 'Europe/London', tradingDays: [1, 2, 3, 5] }, un: 'Nestor', acc: data.accounts, cs: JSON.parse(JSON.stringify(WK)), h: [], rs: null, bh: [], nl: NL, wc: {}, toff: [] }, Date.parse('2026-11-01T18:00:00Z'));
    ok('the server\'s card: 2 trades, 1 W 1 BE', f.card.trades === 2 && f.card.wins === 1 && f.card.bes === 1 && f.trades === 2, f.card);
    ok('the server\'s card: Friday one trade at the Lead\'s -0.10R, 2 days traded', f.card.netR === WKNET && fri(f.card).n === 1 && fri(f.card).r === -0.1 && f.card.daysTraded === 2, [f.card.netR, fri(f.card)]);
    ok('the server and the app agree', JSON.stringify([f.card.netR, f.card.trades, f.card.days]) === JSON.stringify([appC.netR, appC.trades, appC.days.map(function (d) { return { key: d.key, dow: d.dow, r: d.r, n: d.n }; })]), [f.card.days, appC.days]);
    var bc = f.card.rules.filter(function (x) { return x.id === 'bias'; })[0];
    ok('the server stores what was behind the flag', bc && bc.flagged === 1 && bc.hits && bc.hits.against_bias === 1 && !bc.hits.no_bias, bc);
    ok('the words get the exact topic, not "the morning bias"', f.nudgeTopics.length === 1 && /against the morning bias/.test(f.nudgeTopics[0].about), f.nudgeTopics);
  }
  // To watch says what happened
  rows = [{ id: 'w5', week_key: '2026-10-26', card: { week: '2026-10-26', netR: 4.65, trades: 2, wins: 1, losses: 0, bes: 1, winRate: 100, daysTraded: 2, plannedDays: 4, days: appC.days, best: appC.best,
    rules: [{ id: 'daily', flagged: 0 }, { id: 'bias', flagged: 2, hits: { against_bias: 1, no_bias: 1 } }, { id: 'news', flagged: 1 }] }, created_at: new Date().toISOString() }];
  await window.__stWeekly.load(); await W(200);
  var wg = txt(el.querySelectorAll('.st-wk-group')[1]);
  ok('a bias flag says which: "Traded against your bias · 1 day" and "Traded with no bias posted · 1 day", never "With your bias"', /Traded against your bias · 1 day/.test(wg) && /Traded with no bias posted · 1 day/.test(wg) && !/With your bias/.test(wg), wg);
  ok('an old summary with no record says it was a reminder', /Red news reminder · 1 day/.test(wg), wg);
  var wb = el.getBoundingClientRect();
  ok('every chip stays inside the card', [].every.call(el.querySelectorAll('.st-wk-chip'), function (x) { return x.getBoundingClientRect().right <= wb.right + 1; }));
  rows = [{ id: 'w6', week_key: '2026-10-26', created_at: new Date().toISOString(), card: { week: '2026-10-26', netR: 0, trades: 0, wins: 0, losses: 0, bes: 0, winRate: null, daysTraded: 0, plannedDays: 4, days: appC.days, rules: [{ id: 'bias', flagged: 1 }] } }];
  await window.__stWeekly.load(); await W(200);
  ok('a stored card without the detail reads it from the journal\'s record', /Traded against your bias · 1 day/.test(txt(el.querySelectorAll('.st-wk-group')[1])), txt(el));
  // nothing unread: no card; a mentor view never shows it
  rows = []; await window.__stWeekly.load(); await W(80);
  ok('nothing unread: no card', el.hidden);
  rows = [{ id: 'w2', week_key: '2026-10-19', card: CARD, created_at: new Date().toISOString() }];
  var wsCalls = function () { return calls.filter(function (c) { return c[0] === 'weekly_summaries'; }).length; };
  document.body.classList.add('mentor-viewing'); var n0 = wsCalls();
  await window.__stWeekly.load(); await W(80);
  ok('a mentor view never asks or shows', el.hidden && wsCalls() === n0, [el.hidden, wsCalls(), n0]);
  document.body.classList.remove('mentor-viewing');
  window.__stSB = realSB; window.currentUser = realUser; window.__stJournalPulled = realPulled;
  return out;
})()
