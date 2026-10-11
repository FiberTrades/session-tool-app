(async function () {
  // The figure minutes after a release, and the result nudge (12 Oct 2026). A server job writes a red or orange
  // release's figure to calendar_events a few minutes after it; while a release is fresh the open window reads that
  // table, fills the Actual column, and says a red release's result on screen - actual, forecast, previous - with
  // the server's own keys, so the phone push is skipped.
  // Run: python tests/browser_test.py tests/results_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(3000);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  var realFetch = window.fetch;
  window.fetch = function (u) { if (/deno\.(net|dev)|allorigins|codetabs|faireconomy/i.test(String(u && u.url || u))) return Promise.reject(new Error('blocked in test')); return realFetch.apply(this, arguments); };

  // both languages carry every new word (a missing key would print the key itself)
  var keys = ['nudge.news_out', 'nudge.news_fix', 'nudge.w_fc', 'nudge.w_pv', 'settings.nudges_news_hint'], keepLang = window.__lang || 'en', missing = [];
  ['en', 'es'].forEach(function (lg) { setLanguage(lg); keys.forEach(function (k) { if (t(k) === k || !t(k)) missing.push(lg + ':' + k); }); });
  setLanguage('es'); var esLine = t('nudge.news_out');
  setLanguage('en');
  ok('the new words exist in English and Spanish', !missing.length && /ya salió/.test(esLine), [missing, esLine]);
  var hint = document.querySelector('[data-i18n="settings.nudges_news_hint"]');
  ok('Settings says the result follows the warning', !!hint && /result/i.test(hint.textContent) && /forecast/i.test(hint.textContent), hint && hint.textContent);

  // The app's clock reads 13:35 today whatever the real time is, so "today", the session window and the release
  // times never straddle midnight. Timers still run on the real clock.
  var RealDate = Date, target = new RealDate(); target.setHours(13, 35, 20, 0);
  var off = target.getTime() - RealDate.now();
  var FD = function (a, b, c, d, e, f, g) { if (!(this instanceof FD)) return new RealDate(RealDate.now() + off).toString(); var n = arguments.length; return n === 0 ? new RealDate(RealDate.now() + off) : n === 1 ? new RealDate(a) : new RealDate(a, b, c === undefined ? 1 : c, d || 0, e || 0, f || 0, g || 0); };
  FD.prototype = RealDate.prototype; FD.now = function () { return RealDate.now() + off; }; FD.parse = RealDate.parse; FD.UTC = RealDate.UTC;
  window.Date = FD;
  // a signed-in member who trades EUR/USD, session live right now, nudges on, no sound
  var now = Date.now(), hm = function (ms) { var d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  var sameDay = true;
  var keep = { user: window.currentUser, sb: window.__stSB, cache: data._calendarCache, st: JSON.stringify(data.settings || {}), log: JSON.stringify(data.nudgeLog || null) };
  window.currentUser = { id: '11111111-1111-4111-8111-aaaaaaaaaaaa', email: 'member@example.test' };
  data.settings = data.settings || {};
  data.settings.nudges = { on: true, newsMins: 15, sound: 'off' };
  data.settings.symbols = ['EUR/USD']; data.settings.pair = 'EUR/USD';
  data.settings.tradingDays = [0, 1, 2, 3, 4, 5, 6];
  data.settings.sessions = [{ name: 'Now', start: hm(now - 30 * 60000), end: hm(now + 40 * 60000) }];
  data.settings.calendarFilters = { dateRange: 'today', countries: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY'] };
  try { localStorage.removeItem('st_nudge_fired'); } catch (e) {}

  var dbRows = [], claims = [], reads = 0;
  var chain = function (tbl) {
    var c = { select: function () { return c; }, eq: function () { return c; }, in: function () { return c; }, gte: function () { return c; }, lte: function () { return c; }, lt: function () { return c; }, not: function () { return c; }, order: function () { return c; }, limit: function () { return c; },
      maybeSingle: function () { return Promise.resolve({ data: null }); }, single: function () { return Promise.resolve({ data: null }); },
      insert: function (row) { if (tbl === 'session_voice_claims') claims.push(row && row.kind); return Promise.resolve({ data: null, error: null }); },
      upsert: function () { return Promise.resolve({ data: null, error: null }); }, update: function () { return c; }, delete: function () { return c; },
      then: function (f, r) { if (tbl === 'calendar_events') reads++; return Promise.resolve({ data: tbl === 'calendar_events' ? dbRows : [] }).then(f, r); } };
    return c;
  };
  window.__stSB = { rpc: function () { return Promise.resolve({ data: null }); }, from: function (tbl) { return chain(tbl); },
    auth: { getUser: function () { return Promise.resolve({ data: { user: window.currentUser } }); }, getSession: function () { return Promise.resolve({ data: { session: null } }); } },
    functions: { invoke: function () { return Promise.resolve({ data: null }); } }, channel: function () { var ch = { on: function () { return ch; }, subscribe: function () { return ch; }, unsubscribe: function () {} }; return ch; }, removeChannel: function () {} };

  var T = new Date(now - 5 * 60000); T.setSeconds(0, 0); var T2 = new Date(now - 10 * 60000); T2.setSeconds(0, 0); var T3 = new Date(now - 100 * 60000); T3.setSeconds(0, 0);
  var ev = function (d, cur, title, impact, f, p) { return { title: title, country: cur, impact: impact, url: '', forecast: f || '', previous: p || '', when: d.toISOString(), isTimed: true }; };
  var row = function (d, cur, title, impact, f, p, extra) { var r = { at: d.toISOString(), timed: true, currency: cur, title: title, impact: impact, forecast: f || null, previous: p || null, actual: null, actual_prev: null, actual_at: null }; for (var k in (extra || {})) r[k] = extra[k]; return r; };
  var ago = function (s) { return new Date(Date.now() - s * 1000).toISOString(); };
  var feed = [ev(T, 'USD', 'Core CPI m/m', 'High', '0.2%', '0.3%'), ev(T, 'USD', 'CPI y/y', 'High', '3.6%', '3.4%'), ev(T, 'USD', 'Unemployment Claims', 'Medium', '195K', '197K'),
              ev(T, 'JPY', 'Tokyo Core CPI y/y', 'High', '2.1%', '2.0%'), ev(T, 'USD', 'Fed Chairman Warsh Speaks', 'High'),
              ev(T2, 'EUR', 'German Prelim CPI m/m', 'High', '0.1%', '0.2%'), ev(T2, 'EUR', 'Main Refinancing Rate', 'High', '2.15%', '2.15%'),
              ev(T3, 'USD', 'ISM Services PMI', 'High', '52.0', '51.4')];
  var base = function () { return [row(T, 'USD', 'Core CPI m/m', 'High', '0.2%', '0.3%'), row(T, 'USD', 'CPI y/y', 'High', '3.6%', '3.4%'), row(T, 'USD', 'Unemployment Claims', 'Medium', '195K', '197K'),
              row(T, 'JPY', 'Tokyo Core CPI y/y', 'High', '2.1%', '2.0%'), row(T, 'USD', 'Fed Chairman Warsh Speaks', 'High'),
              row(T2, 'EUR', 'German Prelim CPI m/m', 'High', '0.1%', '0.2%'), row(T2, 'EUR', 'Main Refinancing Rate', 'High', '2.15%', '2.15%'),
              row(T3, 'USD', 'ISM Services PMI', 'High', '52.0', '51.4')]; };
  var setRow = function (rows, title, extra) { rows.forEach(function (r) { if (r.title === title) for (var k in extra) r[k] = extra[k]; }); return rows; };

  document.querySelector('.tab[data-page="bias"]').click(); await W(400);
  var cal = document.getElementById('econ-calendar'), tg = document.getElementById('econ-calendar-toggle');
  if (cal.classList.contains('econ-collapsed') && tg) { tg.click(); await W(600); }
  data._calendarCache = { v: 3, date: 'test', events: feed.map(function (e) { return Object.assign({}, e); }) };
  renderCalendarFromCache(); await W(300);
  var actualOf = function (title) { var r = [].filter.call(document.querySelectorAll('#econ-calendar-body .econ-event'), function (x) { return x.querySelector('.econ-event-title').textContent.trim() === title; })[0]; return r ? r.querySelector('.econ-event-actual').textContent.trim() : null; };
  var lines = function () { return [].map.call(document.querySelectorAll('#st-nudge.show .st-nudge-list li'), function (li) { return li.textContent.replace(/^\d\d:\d\d/, '').trim(); }); };
  var A = window.__stCalActuals;

  // ---- 1) a release five minutes old with no figure yet: the window looks every 15 seconds ----
  ok('a fresh release with no figure is watched every 15 seconds', A.need() === 15000, A.need());
  dbRows = base();
  var r1 = await A.read(); await W(250);
  ok('nothing out yet: nothing shown, nothing said', r1 && r1.changed === 0 && actualOf('Core CPI m/m') === '—' && lines().length === 0, [r1, actualOf('Core CPI m/m'), lines()]);

  // ---- 2) the first figure of the release lands: it is on screen at once, the nudge waits for the rest ----
  dbRows = setRow(base(), 'Core CPI m/m', { actual: '0.4%', actual_at: ago(20) });
  var r2 = await A.read(); await W(250);
  ok('the Actual column fills straight away', r2 && r2.changed === 1 && actualOf('Core CPI m/m') === '0.4%' && actualOf('CPI y/y') === '—', [r2, actualOf('Core CPI m/m'), actualOf('CPI y/y')]);
  if (sameDay) ok('the nudge waits for the other figure of the same release', lines().length === 0, lines());

  // ---- 3) the rest lands: one card, the red releases on your currencies, with forecast and previous ----
  dbRows = base();
  setRow(dbRows, 'Core CPI m/m', { actual: '0.4%', actual_at: ago(40) }); setRow(dbRows, 'CPI y/y', { actual: '3.7%', actual_at: ago(10) });
  setRow(dbRows, 'Unemployment Claims', { actual: '198K', actual_at: ago(10) }); setRow(dbRows, 'Tokyo Core CPI y/y', { actual: '2.2%', actual_at: ago(10) });
  var r3 = await A.read(); await W(400);
  ok('orange figures fill the column too', actualOf('Unemployment Claims') === '198K' && actualOf('CPI y/y') === '3.7%', [actualOf('Unemployment Claims'), actualOf('CPI y/y')]);
  if (sameDay) {
    var L = lines();
    ok('the result is said: actual, forecast and previous', L.indexOf('USD Core CPI m/m is out: 0.4% (forecast 0.2%, previous 0.3%).') >= 0 && L.indexOf('USD CPI y/y is out: 3.7% (forecast 3.6%, previous 3.4%).') >= 0, L);
    ok('only red news on your currencies: no orange, no yen, no speech', L.length === 2, L);
    var seen = claims.filter(function (k) { return /^seen:news_out:E\d+:USD:/.test(String(k)); });
    ok('with the server\'s keys, claimed as seen when the window is visible', document.visibilityState !== 'visible' || (seen.length === 2 && seen.indexOf('seen:news_out:E' + T.getTime() + ':USD:core_cpi_m_m') >= 0), [document.visibilityState, claims]);
    var today = (function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
    await W(300);
    ok('a result is news, not a nudge about behaviour: it is not in the day\'s nudge record', !Object.keys((data.nudgeLog && data.nudgeLog[today]) || {}).some(function (k) { return /^news_(out|fix):/.test(k); }), Object.keys((data.nudgeLog && data.nudgeLog[today]) || {}));
    await A.read(); await W(250);
    ok('reading again says nothing twice', lines().length === 2, lines());
  }

  // ---- 4) one figure of a release and the other never comes: said alone after four minutes ----
  dbRows = dbRows.map(function (r) { return Object.assign({}, r); });
  setRow(dbRows, 'German Prelim CPI m/m', { actual: '0.3%', actual_at: ago(5 * 60) });
  await A.read(); await W(400);
  if (sameDay) ok('a lone figure is said after four minutes', lines().indexOf('EUR German Prelim CPI m/m is out: 0.3% (forecast 0.1%, previous 0.2%).') >= 0 && lines().length === 3, lines());

  // ---- 5) a figure that lands much later is old news: on screen, not said ----
  setRow(dbRows, 'ISM Services PMI', { actual: '53.1', actual_at: ago(30) });
  await A.read(); await W(400);
  ok('a figure 100 minutes late fills the column', actualOf('ISM Services PMI') === '53.1', actualOf('ISM Services PMI'));
  if (sameDay) ok('but is not announced', !lines().some(function (x) { return /ISM Services/.test(x); }), lines());

  // ---- 6) a later read gives another number: the column changes and the correction is said ----
  setRow(dbRows, 'Core CPI m/m', { actual: '0.3%', actual_prev: '0.4%', actual_at: ago(15) });
  setRow(dbRows, 'Main Refinancing Rate', { actual: '2.00%', actual_prev: '2.15%', actual_at: ago(15) });   // never announced here
  await A.read(); await W(400);
  ok('the corrected figure replaces the first one', actualOf('Core CPI m/m') === '0.3%', actualOf('Core CPI m/m'));
  if (sameDay) {
    ok('and the correction is said', lines().indexOf('Correction: USD Core CPI m/m was 0.3%, not 0.4% (forecast 0.2%, previous 0.3%).') >= 0, lines());
    ok('a correction of a figure this window never announced is not', !lines().some(function (x) { return /Main Refinancing/.test(x); }), lines());
  }

  ok('once every figure is in, it looks every five minutes for four hours (a correction can come)', A.need() === 300000, A.need());

  // ---- 7) the feed is fetched again (no figures in it): what was read stays on screen ----
  data._calendarCache = { v: 3, date: 'test', events: feed.map(function (e) { return Object.assign({}, e); }) };
  renderCalendarFromCache(); await W(300);
  ok('a rebuilt feed keeps the figures', actualOf('Core CPI m/m') === '0.3%' && actualOf('Unemployment Claims') === '198K', [actualOf('Core CPI m/m'), actualOf('Unemployment Claims')]);

  // ---- 8) red-news warnings switched off: figures still show, nothing is said ----
  data.settings.nudges.newsMins = 0;
  var before = lines().length;
  var T4 = new Date(Date.now() - 4 * 60000); T4.setSeconds(0, 0);
  data._calendarCache.events.push(ev(T4, 'USD', 'Retail Sales m/m', 'High', '0.3%', '1.2%'));
  dbRows.push(row(T4, 'USD', 'Retail Sales m/m', 'High', '0.3%', '1.2%', { actual: '0.5%', actual_at: ago(5) }));
  await A.read(); await W(400);
  ok('with the red-news warning off the figure still shows and nothing is said', actualOf('Retail Sales m/m') === '0.5%' && lines().length === before, [actualOf('Retail Sales m/m'), lines()]);

  // put things back
  try { var okb = document.querySelector('#st-nudge .st-nudge-ok'); if (okb) okb.click(); } catch (e) {}
  window.fetch = realFetch; window.__stSB = keep.sb; window.currentUser = keep.user; data._calendarCache = keep.cache;
  try { data.settings = JSON.parse(keep.st); data.nudgeLog = JSON.parse(keep.log) || undefined; } catch (e) {}
  setLanguage(keepLang);
  window.Date = RealDate;
  return out;
})()
