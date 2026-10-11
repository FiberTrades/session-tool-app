(async function () {
  // Economic calendar: Next Week, and This Week stays this week (11 Oct 2026). The feed only ever holds one week, so
  // the coming week is read from calendar_ahead (collected ahead of the feed) and the week just ended from
  // calendar_events; both are laid over the feed's events when the calendar is drawn, never written into the journal.
  // Run: python tests/browser_test.py tests/nextweek_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(3000);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  // the real feed must not replace the events this test puts in
  var realFetch = window.fetch;
  window.fetch = function (u) { if (/deno\.(net|dev)|allorigins|codetabs|faireconomy/i.test(String(u && u.url || u))) return Promise.reject(new Error('blocked in test')); return realFetch.apply(this, arguments); };
  try { localStorage.removeItem('st_cal_extra_v1'); } catch (e) {}

  // the calendar's own weeks: Monday of this week and of next week, in local time
  var mon = function (off) { var d = new Date(); d.setHours(0, 0, 0, 0); var wd = d.getDay(); d.setDate(d.getDate() + (wd === 0 ? -6 : 1 - wd) + 7 * off); return d; };
  var at = function (off, day, h, m) { var d = mon(off); d.setDate(d.getDate() + day); d.setHours(h, m || 0, 0, 0); return d; };
  var iso = function (d) { return d.toISOString(); };
  var feedEv = function (d, cur, title, impact, f, p) { return { title: title, country: cur, impact: impact, url: 'https://www.forexfactory.com/calendar/x', forecast: f || '', previous: p || '', when: iso(d), isTimed: true }; };
  var row = function (d, cur, title, impact, extra) { var r = { at: iso(d), timed: true, currency: cur, title: title, impact: impact, forecast: null, previous: null }; for (var k in (extra || {})) r[k] = extra[k]; return r; };

  var calls = { ahead: [], past: 0 }, aheadRows = [], pastRows = [], aheadFail = false;
  var pastChain = function () { var c = { select: function () { return c; }, gte: function () { return c; }, lt: function () { return c; }, then: function (f, r) { calls.past++; return Promise.resolve({ data: pastRows }).then(f, r); } }; return c; };
  var idle = function () { var c = { select: function () { return c; }, eq: function () { return c; }, gte: function () { return c; }, lt: function () { return c; }, order: function () { return c; }, limit: function () { return c; }, maybeSingle: function () { return Promise.resolve({ data: null }); }, then: function (f) { return Promise.resolve({ data: [] }).then(f); } }; return c; };
  var keepSB = window.__stSB, keepCache = data._calendarCache, keepF = JSON.stringify((data.settings || {}).calendarFilters || null), keepSave = window.save;
  window.__stSB = { rpc: function (name, args) { if (name === 'st_calendar_ahead') { calls.ahead.push(args); return aheadFail ? Promise.reject(new Error('down')) : Promise.resolve({ data: aheadRows }); } return Promise.resolve({ data: null }); },
    from: function (tbl) { return tbl === 'calendar_events' ? pastChain() : idle(); },
    auth: { getUser: function () { return Promise.resolve({ data: { user: null } }); }, getSession: function () { return Promise.resolve({ data: { session: null } }); } },
    functions: { invoke: function () { return Promise.resolve({ data: null }); } } };

  document.querySelector('.tab[data-page="bias"]').click(); await W(400);
  var cal = document.getElementById('econ-calendar'), tg = document.getElementById('econ-calendar-toggle');
  if (cal.classList.contains('econ-collapsed') && tg) { tg.click(); await W(600); }
  if (!data.settings) data.settings = {};
  data.settings.calendarFilters = { dateRange: 'week', countries: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY'] };
  var pill = function (r) { return document.querySelector('#econ-range-pills .econ-range-pill[data-range="' + r + '"]'); };
  var press = async function (r) { pill(r).click(); await W(250); };
  var titles = function () { return [].map.call(document.querySelectorAll('#econ-calendar-body .econ-event'), function (x) { return x.querySelector('.econ-event-currency').textContent.trim() + ' ' + x.querySelector('.econ-event-title').textContent.trim(); }); };
  var days = function () { return [].map.call(document.querySelectorAll('#econ-calendar-body .econ-day-header'), function (x) { return (x.querySelector('.econ-day-label') || x).textContent.trim().replace(/\s+/g, ' '); }); };
  var bodyText = function () { return document.getElementById('econ-calendar-body').textContent.replace(/\s+/g, ' ').trim(); };
  var setFeed = async function (evs) { data._calendarCache = { v: 3, date: 'test', events: evs }; window.__stCalExtra.refresh(); await W(450); };

  // ---- 0) the button is there, in both languages, after This Week ----
  var pills = [].map.call(document.querySelectorAll('#econ-range-pills .econ-range-pill'), function (b) { return b.dataset.range; });
  ok('Today, Tomorrow, This Week, Next Week', pills.join(',') === 'today,tomorrow,week,nextweek', pills);
  ok('it is called Next Week', /next week/i.test(pill('nextweek').textContent), pill('nextweek').textContent);
  // the button beside them says what it opens: Countries (it was Filters, and countries is all it shows)
  var tgl = document.getElementById('econ-filter-toggle'), tglTxt = tgl.textContent.replace(/\s+/g, ' ').trim();
  ok('the button that opens the country chips is called Countries', /^countries$/i.test(tglTxt), tglTxt);
  tgl.click(); await W(500);
  var fp = document.getElementById('econ-calendar-filters');
  ok('it opens the country chips, without repeating the word above them', fp.classList.contains('open') && document.querySelectorAll('#econ-country-chips .econ-chip').length >= 8 && !/countries/i.test(fp.querySelector('.econ-filter-row').textContent), fp.querySelector('.econ-filter-row').textContent.replace(/\s+/g, ' ').slice(0, 80));
  tgl.click(); await W(300);

  // ---- 1) a weekday: the feed holds this week, next week comes from what was collected ahead ----
  var thisWeekFeed = [feedEv(at(0, 2, 13, 30), 'USD', 'Core CPI m/m', 'High', '0.2%', '0.3%'), feedEv(at(0, 3, 7, 0), 'GBP', 'GDP m/m', 'High', '-0.1%', '0.4%')];
  aheadRows = [row(at(1, 0, 13, 30), 'CAD', 'CPI m/m', 'High', { url: 'https://www.forexfactory.com/calendar/80-ca-cpi-mm' }), row(at(1, 2, 7, 0), 'GBP', 'CPI y/y', 'High'), row(at(1, 2, 12, 0), 'USD', 'Bank Holiday', 'Holiday'), row(at(1, 4, 14, 45), 'USD', 'Flash Services PMI', 'Medium'), row(at(2, 1, 13, 30), 'USD', 'Core CPI m/m', 'High')];
  await setFeed(thisWeekFeed);
  await press('week');
  ok('This Week shows the feed', titles().join(' | ') === 'USD Core CPI m/m | GBP GDP m/m', titles());
  ok('the week it has needs no other read: only the weeks ahead are asked for', calls.ahead.length === 1 && calls.past === 0, calls);
  var a0 = calls.ahead[0] || {};
  ok('asked from the Sunday before this week to the Sunday after next week', Math.abs(new Date(a0.p_from).getTime() - (mon(0).getTime() - 864e5)) <= 3600e3 && Math.abs(new Date(a0.p_to).getTime() - (mon(1).getTime() + 6 * 864e5)) <= 3600e3, a0);
  await press('nextweek');
  ok('Next Week shows next week, laid out by day', titles().length === 4 && titles()[0] === 'CAD CPI m/m' && titles()[1] === 'GBP CPI y/y' && /^USD Bank Holiday/.test(titles()[2]) && titles()[3] === 'USD Flash Services PMI', titles());
  ok('all five weekdays are listed, a day with nothing says so', days().length === 5 && /no medium or high impact news/i.test(bodyText()), days());
  var wantMon = String(mon(1).getDate()).padStart(2, '0'), friD = mon(1); friD.setDate(friD.getDate() + 4);
  var wantFri = String(friD.getDate()).padStart(2, '0');
  ok('the days are next week\'s Monday to Friday', /MON/i.test(days()[0] || '') && (days()[0] || '').indexOf(wantMon) >= 0 && /FRI/i.test(days()[4] || '') && (days()[4] || '').indexOf(wantFri) >= 0, days());
  ok('the week after next is not shown', titles().filter(function (x) { return /Core CPI/.test(x); }).length === 0, titles());
  ok('nothing was written into the journal: the feed keeps its own two events', data._calendarCache.events.length === 2, data._calendarCache.events.length);
  // a row opens with the app's own information, like any other
  var r0 = document.querySelector('#econ-calendar-body .econ-event'); r0.click(); await W(300);
  var det = (document.querySelector('.econ-event-detail') || {}).textContent || '';
  ok('a next-week row opens with what the event is', /what is it/i.test(det) && /Bank of Canada|Statistics Canada|Canad/i.test(det), det.slice(0, 160));
  var stored = null; try { stored = JSON.parse(localStorage.getItem('st_cal_extra_v1')); } catch (e) {}
  ok('kept on this device, so it is there at once next time', stored && stored.weeks && Object.keys(stored.weeks).length === 2, stored && Object.keys(stored.weeks || {}));
  await press('week');
  ok('back on This Week: only this week', titles().join(' | ') === 'USD Core CPI m/m | GBP GDP m/m', titles());
  await press('tomorrow'); await press('today');
  ok('Today and Tomorrow still draw', !!document.querySelector('#econ-calendar-body .econ-day-header, #econ-calendar-body .econ-calendar-empty'), bodyText().slice(0, 80));

  // ---- 2) the weekend after the feed rolled over: it now holds NEXT week; this week comes from the app's own record ----
  var nextWeekFeed = [feedEv(at(1, 0, 13, 30), 'CAD', 'CPI m/m', 'High', '0.3%', '0.1%'), feedEv(at(1, 2, 8, 0), 'GBP', 'CPI y/y', 'High', '3.1%', '3.0%'), feedEv(at(1, 4, 14, 45), 'USD', 'Flash Services PMI', 'Medium')];
  // what was collected ahead has the GBP release at its OLD time: the feed moved it. It must not show twice.
  pastRows = [row(at(0, 2, 13, 30), 'USD', 'Core CPI m/m', 'High', { forecast: '0.2%', previous: '0.3%', actual: '0.4%' }), row(at(0, 4, 13, 30), 'USD', 'Retail Sales m/m', 'High', { actual: '0.5%' })];
  calls.past = 0; calls.ahead = [];
  await setFeed(nextWeekFeed);
  await press('week');
  ok('This Week still shows the week that just ended', titles().join(' | ') === 'USD Core CPI m/m | USD Retail Sales m/m', titles());
  ok('read from the record of past weeks', calls.past === 1, calls);
  var act = [].map.call(document.querySelectorAll('#econ-calendar-body .econ-event-actual'), function (x) { return x.textContent.trim(); });
  ok('with the figures that were released', act.join(',') === '0.4%,0.5%', act);
  ok('and never next week\'s news', titles().filter(function (x) { return /CAD|GBP|Flash/.test(x); }).length === 0, titles());
  await press('nextweek');
  ok('Next Week is the feed itself once it has rolled over', titles().join(' | ') === 'CAD CPI m/m | GBP CPI y/y | USD Flash Services PMI', titles());
  var times = [].map.call(document.querySelectorAll('#econ-calendar-body .econ-event-time'), function (x) { return x.textContent.trim(); });
  ok('a release the feed moved is not shown twice at its old time', titles().filter(function (x) { return x === 'GBP CPI y/y'; }).length === 1 && titles().indexOf('USD Bank Holiday') < 0, [titles(), times]);
  var fc = [].map.call(document.querySelectorAll('#econ-calendar-body .econ-event-forecast'), function (x) { return x.textContent.trim(); });
  ok('with the feed\'s own forecasts', fc[0] === '0.3%' && fc[1] === '3.1%', fc);

  // ---- 3) nothing collected for next week: it says so, it does not blame the filters ----
  aheadRows = []; calls.ahead = [];
  await setFeed(thisWeekFeed);
  await press('nextweek');
  ok('next week not in yet: a plain sentence', /next week.s news is not in yet/i.test(bodyText()) && titles().length === 0, bodyText().slice(0, 120));
  // ---- 4) the read fails: what was read before is not thrown away ----
  aheadRows = [row(at(1, 1, 13, 30), 'USD', 'CB Consumer Confidence', 'Medium')];
  window.__stCalExtra.refresh(); await W(450);
  ok('it shows as soon as it is there', titles().join(' | ') === 'USD CB Consumer Confidence', titles());
  aheadFail = true; window.__stCalExtra.refresh(); await W(450);
  ok('a failed read keeps what was there', titles().join(' | ') === 'USD CB Consumer Confidence', titles());
  aheadFail = false;
  // ---- 5) a member's currency filter applies to next week too ----
  data.settings.calendarFilters.countries = ['EUR'];
  renderCalendarFromCache(); await W(250);
  ok('filters apply: no EUR news next week reads as no match, not as missing', /no events match/i.test(bodyText()), bodyText().slice(0, 100));

  // put things back
  window.fetch = realFetch; window.__stSB = keepSB; data._calendarCache = keepCache;
  try { data.settings.calendarFilters = JSON.parse(keepF) || undefined; } catch (e) {}
  try { localStorage.removeItem('st_cal_extra_v1'); } catch (e) {}
  return out;
})()
