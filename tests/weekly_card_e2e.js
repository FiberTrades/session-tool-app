(async function () {
  // The assistant's weekly summary card on Session Bias (24 Oct 2026): the newest unread summary shows until Got it, which marks
  // the member's unread ones read; never in a mentor view. weekly_summaries is stood in for - nothing is read or written.
  // Run: python tests/browser_test.py tests/weekly_card_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  ok('the card and its loader are in the app', !!document.getElementById('st-week') && !!(window.__stWeekly && window.__stWeekly.load));
  var calls = [], rows = [{ id: 'w1', week_key: '2026-10-19', body: 'Your best moment this week was Thursday: a clean +4.7R winner.\n\nNext week, keep to one trade a day.', created_at: new Date().toISOString() }];
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
  await window.__stWeekly.load(); await W(100);
  var el = document.getElementById('st-week'), txt = el ? el.innerText.replace(/\s+/g, ' ') : '';
  ok('an unread summary shows on Session Bias', el && !el.hidden && /Your week/i.test(txt) && /\+4\.7R winner/.test(txt), txt);
  ok('its heading names the week: 19 – 25 Oct', /19 – 25 Oct/i.test(txt), txt.slice(0, 60));
  ok('the paragraphs keep their line breaks', el && getComputedStyle(el.querySelector('.st-week-b')).whiteSpace === 'pre-line');
  var q = calls.filter(function (c) { return c[0] === 'weekly_summaries'; })[0] || [];
  ok('it asks only for the newest unread one', q[0] === 'weekly_summaries' && JSON.stringify(q).indexOf('"is","read_at",null') > 0 && JSON.stringify(q).indexOf('"limit",1') > 0, JSON.stringify(q));
  var pg = document.getElementById('page-bias'), as = pg && pg.querySelector('.st-asst');
  ok('it sits on Session Bias, under the assistant greeting', pg && pg.contains(el) && as && (as.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING), [el.parentElement && el.parentElement.id, [].map.call(el.parentElement.children, function (c) { return c.id || c.className; }).slice(0, 6)]);
  var btn = el && el.querySelector('[data-st-week-ok]');
  if (btn) btn.click();
  await W(80);
  ok('Got it: the button says it was read', btn && /Read/.test(btn.textContent) && btn.disabled, btn && btn.textContent);
  var u = calls[calls.length - 1] || [], us = JSON.stringify(u);
  ok('and every unread one of this member is marked read (read_at only)', u[0] === 'weekly_summaries' && /"update",\{"read_at":"/.test(us) && us.indexOf('"eq","user_id","00000000-0000-0000-0000-0000000000aa"') > 0 && us.indexOf('"is","read_at",null') > 0, us);
  await W(1400);
  ok('then the card goes', el.hidden);
  // nothing unread: no card
  rows = []; await window.__stWeekly.load(); await W(80);
  ok('nothing unread: no card', el.hidden);
  // a mentor view never shows it
  rows = [{ id: 'w2', week_key: '2026-10-19', body: 'Something.', created_at: new Date().toISOString() }];
  document.body.classList.add('mentor-viewing'); var n0 = calls.length;
  await window.__stWeekly.load(); await W(80);
  ok('a mentor view never asks or shows', el.hidden && calls.length === n0);
  document.body.classList.remove('mentor-viewing');
  window.__stSB = realSB; window.currentUser = realUser; window.__stJournalPulled = realPulled;
  return out;
})()
