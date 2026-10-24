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
  ok('heading: "Your week · 19 – 25 Oct"', /Your week · 19 – 25 Oct/i.test(txt(el.querySelector('.st-week-t'))), txt(el.querySelector('.st-week-t')));
  ok('four tiles: Net R, Trades, Win rate, Days traded', tiles.length === 4 && /Net R/i.test(tiles[0]) && /Trades/i.test(tiles[1]) && /Win rate/i.test(tiles[2]) && /Days traded/i.test(tiles[3]), tiles);
  ok('Net R +3.44R in green, +1.72R a trade under it', /\+3\.44R/.test(tiles[0]) && el.querySelector('.st-wk-tile .st-wk-v').classList.contains('g') && /avg \+1\.72R a trade/.test(tiles[0]), tiles[0]);
  ok('Trades 2, with 1 W · 1 L under it', /2/.test(tiles[1]) && /1 W · 1 L/.test(tiles[1]), tiles[1]);
  ok('Win rate 50%', /50%/.test(tiles[2]), tiles[2]);
  ok('Days traded 2, of 5 planned', /\b2\b/.test(tiles[3]) && /of 5 planned/.test(tiles[3]), tiles[3]);
  var tb = [].map.call(el.querySelectorAll('.st-wk-tile'), function (x) { var b = x.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; });
  ok('the tiles are the same size', tb.length === 4 && tb.every(function (b) { return Math.abs(b[0] - tb[0][0]) <= 1 && Math.abs(b[1] - tb[0][1]) <= 1; }), tb);
  var svg = el.querySelector('.st-wk-chart svg'), bars = svg ? svg.querySelectorAll('rect') : [];
  ok('R per day: Mon to Fri, a red bar Monday and a green one Thursday', svg && bars.length === 2 && bars[0].getAttribute('fill') === '#E56767' && bars[1].getAttribute('fill') === '#4ECD8B' && /Mon.*Tue.*Wed.*Thu.*Fri/.test(svg.textContent), svg ? svg.textContent : 'no chart');
  ok('the best trade is starred: "★ +4.72R Thu"', svg && /★ \+4\.72R Thu/.test(svg.textContent), svg && svg.textContent);
  var chips = el ? [].map.call(el.querySelectorAll('.st-wk-chip'), function (x) { return [x.className.replace('st-wk-chip ', ''), txt(x).replace(/^([!✓]) /, '$1')]; }) : [];
  ok('rule checks: in session, trades per day and risk per trade amber (1 day each); daily loss, stop, red news, bias green', chips.length === 7
    && chips.filter(function (c) { return c[0] === 'flag'; }).map(function (c) { return c[1]; }).join('|') === '!In session · 1 day|!Trades per day · 1 day|!Risk per trade · 1 day'
    && chips.filter(function (c) { return c[0] === 'ok'; }).length === 4, chips);
  ok('never a red chip', !el.querySelector('.st-wk-chip.bad, .st-wk-chip.red'));
  ok('then two short lines: the highlight and the focus', /\+4\.72R helped close the week/.test(txt(el.querySelector('.st-week-b'))) && /Next week, keep an eye on your session times\./.test(txt(el.querySelector('.st-week-b'))), txt(el.querySelector('.st-week-b')));
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
  ok('no stored numbers: worked out from the journal (+1.00R, 3 trades 1 W · 1 L · 1 BE, 50%, 3 of 5 planned)', /\+1\.00R/.test(tiles[0]) && /3/.test(tiles[1]) && /1 W · 1 L · 1 BE/.test(tiles[1]) && /50%/.test(tiles[2]) && /of 5 planned/.test(tiles[3]) && /\b3\b/.test(tiles[3]), tiles);
  ok('its rule checks: trades per day amber on 1 day; daily loss and risk per trade not shown (not set)', chips.some(function (c) { return c[0] === 'flag' && /Trades per day · 1 day/.test(c[1]); }) && !chips.some(function (c) { return /Daily loss|Risk per trade/.test(c[1]); }), chips);
  ok('and the text it was stored with', /Old text\./.test(txt(el.querySelector('.st-week-b'))), txt(el.querySelector('.st-week-b')));
  // nothing unread: no card; a mentor view never shows it
  rows = []; await window.__stWeekly.load(); await W(80);
  ok('nothing unread: no card', el.hidden);
  rows = [{ id: 'w2', week_key: '2026-10-19', card: CARD, created_at: new Date().toISOString() }];
  document.body.classList.add('mentor-viewing'); var n0 = calls.length;
  await window.__stWeekly.load(); await W(80);
  ok('a mentor view never asks or shows', el.hidden && calls.length === n0);
  document.body.classList.remove('mentor-viewing');
  window.__stSB = realSB; window.currentUser = realUser; window.__stJournalPulled = realPulled;
  return out;
})()
