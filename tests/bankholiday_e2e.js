(async function () {
  // Bank holidays ahead in the Session Bias greeting (10 Oct 2026): US, UK and Eurozone dates worked out by rule, a
  // heads-up sentence from two trading days before, kept behind the line the AI rewrites.
  // Run: python tests/browser_test.py tests/bankholiday_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var B = window.__stBankHolidays;
  ok('the helper is there', !!B && typeof B.ahead === 'function' && typeof B.notice === 'function');
  // a whole year from 1 Jan, as 'MM-DD place,place' so the dates can be read against the official lists
  var year = function (y) { var m = {}; B.ahead(366, new Date(y, 0, 1)).filter(function (g) { return g.date.slice(0, 4) === String(y); }).forEach(function (g) { g.items.forEach(function (it) { it.where.forEach(function (w) { (m[w] = m[w] || []).push(g.date.slice(5) + (it.moved ? '*' : '')); }); }); }); return m; };
  var y26 = year(2026), y27 = year(2027);
  ok('US 2026', y26.US.join(' ') === '01-01 01-19 02-16 04-03 05-25 06-19 07-03* 09-07 10-12 11-11 11-26 12-25', y26.US.join(' '));
  ok('UK 2026', y26.UK.join(' ') === '01-01 04-03 04-06 05-04 05-25 08-31 12-25 12-28*', y26.UK.join(' '));
  ok('Eurozone 2026 (26 Dec is a Saturday, so it is not listed)', y26.EU.join(' ') === '01-01 04-03 04-06 05-01 12-25', y26.EU.join(' '));
  ok('US 2027 (Juneteenth, 4 July and Christmas land on a weekend)', y27.US.join(' ') === '01-01 01-18 02-15 03-26 05-31 06-18* 07-05* 09-06 10-11 11-11 11-25 12-24*', y27.US.join(' '));
  ok('UK 2027 (Christmas and Boxing Day are moved)', y27.UK.join(' ') === '01-01 03-26 03-29 05-03 05-31 08-30 12-27* 12-28*', y27.UK.join(' '));
  // the heads-up, on the days around Columbus Day 2026 (Monday 12 Oct)
  var n = function (y, m, d, es) { return B.notice(!!es, new Date(y, m - 1, d, 9)); };
  ok('Sat 10 Oct: Monday is named, with what it is, where, and the currency', /^Heads-up: Monday 12 Oct is Columbus Day, a bank holiday in the US\. Expect thinner liquidity in USD pairs that day\.$/.test(n(2026, 10, 10)), n(2026, 10, 10));
  ok('Wed 7 Oct: not yet - a week ahead was too much', n(2026, 10, 7) === '' && n(2026, 10, 5) === '', [n(2026, 10, 5), n(2026, 10, 7)]);
  ok('Thu 8 and Fri 9 Oct: the two trading days before a Monday holiday', /Monday 12 Oct is Columbus Day/.test(n(2026, 10, 8)) && /Monday 12 Oct is Columbus Day/.test(n(2026, 10, 9)), [n(2026, 10, 8), n(2026, 10, 9)]);
  ok('a Wednesday holiday (Veterans Day, 11 Nov): the Monday and the Tuesday only', n(2026, 11, 6) === '' && n(2026, 11, 8) === '' && /Wednesday 11 Nov is Veterans Day/.test(n(2026, 11, 9)) && /^Heads-up: Tomorrow, Wednesday 11 Nov, is Veterans Day/.test(n(2026, 11, 10)), [n(2026, 11, 6), n(2026, 11, 8), n(2026, 11, 9), n(2026, 11, 10)]);
  ok('Sun 4 Oct: nothing', n(2026, 10, 4) === '', n(2026, 10, 4));
  ok('Sun 11 Oct: Tomorrow', /^Heads-up: Tomorrow, Monday 12 Oct, is Columbus Day, a bank holiday in the US\./.test(n(2026, 10, 11)), n(2026, 10, 11));
  ok('Mon 12 Oct: Today', /^Heads-up: Today is Columbus Day, a bank holiday in the US\. Expect thinner liquidity in USD pairs\.$/.test(n(2026, 10, 12)), n(2026, 10, 12));
  ok('Tue 13 Oct: nothing', n(2026, 10, 13) === '', n(2026, 10, 13));
  ok('Easter 2026: three places on the Friday, then the Monday', /^Heads-up: Friday 3 Apr is Good Friday, a bank holiday in the US, the UK and the Eurozone\. Expect thinner liquidity in USD, GBP and EUR pairs that day\. Then Monday 6 Apr: Easter Monday \(the UK and the Eurozone\)\.$/.test(n(2026, 4, 1)) && n(2026, 3, 31) === '', [n(2026, 3, 31), n(2026, 4, 1)]);
  ok('25 May 2026: two holidays with their own names on one day', /^Heads-up: Monday 25 May is a bank holiday in the US \(Memorial Day\) and the UK \(the Spring bank holiday\)\. Expect thinner liquidity in USD and GBP pairs that day\.$/.test(n(2026, 5, 21)) && n(2026, 5, 20) === '', [n(2026, 5, 20), n(2026, 5, 21)]);
  ok('across the new year', /Friday 1 Jan is New Year's Day, a bank holiday in the US, the UK and the Eurozone/.test(n(2026, 12, 30)) && n(2026, 12, 29) === '', [n(2026, 12, 29), n(2026, 12, 30)]);
  ok('Spanish', /^Aviso: el lunes 12 oct es el Día de Colón, festivo bancario en EE\. UU\. Espera menos liquidez en los pares con USD ese día\.$/.test(n(2026, 10, 10, true)), n(2026, 10, 10, true));
  // in the greeting: behind the line, in its own span, and not part of what the AI is asked to rewrite
  var real = B.notice(false), g = document.getElementById('bias-greeting');
  try { renderBiasGreeting(); } catch (e) {}
  await W(600);
  var span = g && g.querySelector('.greet-hol');
  ok('the Session Bias greeting carries it exactly when there is one (' + (real ? 'there is one today' : 'none today') + ')', real ? (!!span && span.textContent === real) : !span, [real, span && span.textContent]);
  ok('the AI is never asked to rewrite it', !real || String(g.__greetSeed || '').indexOf('Heads-up') < 0, g && g.__greetSeed);
  var mirror = document.querySelector('.bias-greeting[data-greeting-context="review"]');
  ok('Session Review does not repeat it', !mirror || !mirror.querySelector('.greet-hol'));
  var pk = B.pack();
  ok('the assistant gets the next two weeks', real ? (Array.isArray(pk) && !!pk[0].date && !!pk[0].holidays[0].name) : (pk === null || Array.isArray(pk)), pk);
  // The Session Live board: a blue Bank holiday box beside Red news, on the same days.
  var bx = function (y, m, d, es) { return B.box(!!es, new Date(y, m - 1, d, 9)); }, j = function (v) { return v ? [v.name, v.when, v.inTxt].join('|') : null; };
  ok('box, Sat 10 Oct: the name, the day and how far off', j(bx(2026, 10, 10)) === 'Columbus Day (US)|Mon|in 2 d' && /^Monday 12 Oct is Columbus Day, a bank holiday in the US\./.test(bx(2026, 10, 10).title), [j(bx(2026, 10, 10)), bx(2026, 10, 10) && bx(2026, 10, 10).title]);
  ok('box: tomorrow, today, then gone', j(bx(2026, 10, 11)) === 'Columbus Day (US)|Mon|tomorrow' && j(bx(2026, 10, 12)) === 'Columbus Day (US)|today|' && bx(2026, 10, 13) === null && bx(2026, 10, 7) === null, [j(bx(2026, 10, 11)), j(bx(2026, 10, 12)), j(bx(2026, 10, 13)), j(bx(2026, 10, 7))]);
  ok('box: several places, and two holidays on one day', j(bx(2026, 4, 1)) === 'Good Friday (US/UK/Eurozone)|Fri|in 2 d' && j(bx(2026, 5, 21)) === 'Memorial Day (US), Spring bank holiday (UK)|Mon|in 4 d', [j(bx(2026, 4, 1)), j(bx(2026, 5, 21))]);
  ok('box: Spanish', j(bx(2026, 10, 10, true)) === 'Día de Colón (EE. UU.)|lun|en 2 d', j(bx(2026, 10, 10, true)));
  var rv = document.querySelector('.tab[data-page="review"]'); if (rv) rv.click(); await W(700);
  var pr = document.getElementById('page-review'); pr.classList.add('session-live-collapsed');
  try { window.__stLiveBox.render(); } catch (e) {}
  await W(500);
  var nh = document.getElementById('st-livenews'), hb = nh.querySelector('.slx-news.hol'), now = B.box(false);
  ok('Session Live shows it exactly when one is due (' + (now ? 'one is due today' : 'none today') + ')', now ? (!nh.hidden && !!hb && hb.querySelector('.slx-v').textContent === now.name + ' · ' + now.when + now.inTxt && /bank holiday/i.test(hb.querySelector('.slx-l').textContent)) : !hb, [nh.hidden, nh.innerText, j(now)]);
  ok('in the calendar blue, as wide as its words', !now || (!!hb && getComputedStyle(hb.querySelector('.slx-v')).color === 'rgb(91, 155, 255)' && getComputedStyle(hb.querySelector('.slx-l')).color === 'rgb(91, 155, 255)' && hb.getBoundingClientRect().width < nh.getBoundingClientRect().width - 40), hb && [getComputedStyle(hb.querySelector('.slx-v')).color, Math.round(hb.getBoundingClientRect().width)]);
  var boxes = Array.from(nh.querySelectorAll('.slx-news')).map(function (n) { return n.getBoundingClientRect(); });
  ok('beside the red news on a computer, never on top of it', !now || boxes.length < 2 || (innerWidth > 700 ? (Math.abs(boxes[0].top - boxes[1].top) < 1 && boxes[1].left >= boxes[0].right + 11) : boxes[1].top >= boxes[0].bottom + 11), boxes.map(function (r) { return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; }));
  pr.classList.remove('session-live-collapsed');
  return out;
})()
