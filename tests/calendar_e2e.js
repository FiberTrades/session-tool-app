(async function () {
  // The economic calendar knows its events (11 Oct 2026): every red and orange event has its own facts - source,
  // what it measures, usual effect, frequency, also called, event type, why it matters - in the app's own words, never
  // another currency's text; and a "Bank Holiday" row says which holiday it is, for every currency the calendar shows.
  // Run: python tests/browser_test.py tests/calendar_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  var keepLang = window.__lang;

  // ---- 1) the red and orange events the app has really received since August: none is generic, in either language ----
  var SEEN = { AUD: 'Cash Rate|CPI m/m|CPI y/y|Employment Change|GDP q/q|RBA Gov Bullock Speaks|RBA Rate Statement|Trimmed Mean CPI m/m|Unemployment Rate|RBA Press Conference|Wage Price Index q/q',
    CAD: 'BOC Press Conference|BOC Rate Statement|CPI m/m|Employment Change|GDP m/m|Median CPI y/y|Overnight Rate|Trimmed CPI y/y|Unemployment Rate|BOC Gov Macklem Speaks|Common CPI y/y|Core Retail Sales m/m|Ivey PMI|Retail Sales m/m',
    CHF: 'SNB Monetary Policy Assessment|SNB Policy Rate|SNB Press Conference|CPI m/m|SNB Chairman Schlegel Speaks',
    EUR: 'ECB Press Conference|Main Refinancing Rate|Monetary Policy Statement|Core CPI Flash Estimate y/y|CPI Flash Estimate y/y|ECB President Lagarde Speaks|French Flash Manufacturing PMI|French Flash Services PMI|German Flash Manufacturing PMI|German Flash Services PMI|German Prelim CPI m/m',
    GBP: 'BOE Gov Bailey Speaks|Claimant Count Change|CPI y/y|GDP m/m|Monetary Policy Summary|MPC Official Bank Rate Votes|Official Bank Rate|Average Earnings Index 3m/y|Flash Manufacturing PMI|Flash Services PMI|Monetary Policy Report Hearings|Retail Sales m/m',
    JPY: 'BOJ Gov Ueda Speaks|BOJ Policy Rate|BOJ Press Conference|Monetary Policy Statement|Tokyo Core CPI y/y',
    NZD: 'GDP q/q|Official Cash Rate|RBNZ Monetary Policy Statement|RBNZ Press Conference|RBNZ Rate Statement|RBNZ Gov Breman Speaks',
    USD: 'Average Hourly Earnings m/m|Core CPI m/m|Core CPI y/y|Core PCE Price Index m/m|Core PPI m/m|CPI m/m|CPI y/y|Fed Chairman Warsh Speaks|Federal Funds Rate|Final GDP q/q|FOMC Economic Projections|FOMC Meeting Minutes|FOMC Press Conference|FOMC Statement|ISM Manufacturing PMI|Non-Farm Employment Change|PPI m/m|Prelim Benchmark Payrolls Revision|Prelim GDP q/q|Unemployment Rate|ADP Non-Farm Employment Change|CB Consumer Confidence|Core Retail Sales m/m|Final GDP Price Index q/q|FOMC Member Kashkari Speaks|FOMC Member Waller Speaks|ISM Manufacturing Prices|ISM Services PMI|JOLTS Job Openings|Philly Fed Manufacturing Index|Prelim GDP Price Index q/q|Prelim UoM Consumer Sentiment|Prelim UoM Inflation Expectations|President Trump Speaks|Retail Sales m/m|Revised UoM Consumer Sentiment|Revised UoM Inflation Expectations|Treasury Sec Bessent Speaks|Unemployment Claims',
    ALL: 'Jackson Hole Symposium|OPEC-JMMC Meetings' };
  var GEN = /^(Mid-tier economic release|Major economic event|Lower-impact economic release|Publicaci[oó]n (econ[oó]mica )?de impacto|Evento econ[oó]mico importante)/;
  var GENI = /(small [A-Z]{3}-supportive bias|better-than-expected economic strength reduces rate-cut odds|ligero sesgo alcista para|la fortaleza econ[oó]mica reduce)/;
  var n = 0, miss = { en: [], es: [] }, noSpec = [];
  ['en', 'es'].forEach(function (L) {
    window.__lang = L;
    Object.keys(SEEN).forEach(function (cur) { SEEN[cur].split('|').forEach(function (title) {
      var c = cur === 'ALL' ? '' : cur, d = getEventDescription(title, 'Medium', c), i = getEventInterpretation(title, 'Medium', c), sp = eventSpecInfo(title, c);
      if (L === 'en') n++;
      if (!d || GEN.test(d) || !i || GENI.test(i)) miss[L].push(cur + ':' + title);
      if (!sp || !sp.measures || !sp.effect || !sp.freq || !sp.type || !sp.why) noSpec.push(L + ' ' + cur + ':' + title);
    }); });
  });
  window.__lang = 'en';
  ok('every red and orange event received since August has its own description and reading (' + n + ' events, English)', n > 100 && !miss.en.length, miss.en.slice(0, 12));
  ok('and in Spanish', !miss.es.length, miss.es.slice(0, 12));
  ok('each has its facts: measures, usual effect, frequency, event type, why it matters', !noSpec.length, noSpec.slice(0, 12));

  // ---- 2) Core CPI m/m (USD): the facts ----
  var s = eventSpecInfo('Core CPI m/m', 'USD') || {};
  ok('US Core CPI m/m: source, measures, effect, frequency, also called, type', s.source === 'Bureau of Labor Statistics' && /leaving out food and energy/.test(s.measures) && /above .Forecast. is usually good for the currency/.test(s.effect)
     && s.freq === 'Monthly, about 12 days after the month ends' && /CPI Ex Food and Energy/.test(s.aka) && s.type === 'Inflation', s);
  ok('and why it matters names its own central bank', /the Fed/.test(s.why) && /inflation/i.test(s.why), s.why);
  ok('frequencies read naturally', (eventSpecInfo('Non-Farm Employment Change', 'USD') || {}).freq === 'Monthly, usually on the first Friday after the month ends' && (eventSpecInfo('Advance GDP q/q', 'USD') || {}).freq === 'Quarterly, about a month after the quarter ends'
     && (eventSpecInfo('Unemployment Claims', 'USD') || {}).freq === 'Weekly, about 5 days after the week ends' && (eventSpecInfo('Official Cash Rate', 'NZD') || {}).freq === 'Seven times a year' && (eventSpecInfo('Manufacturing PMI', 'CNY') || {}).freq === 'Monthly, on the last day of the month it covers',
     [(eventSpecInfo('Advance GDP q/q', 'USD') || {}).freq, (eventSpecInfo('Unemployment Claims', 'USD') || {}).freq, (eventSpecInfo('Manufacturing PMI', 'CNY') || {}).freq]);
  ok('the usual effect follows the event: a lower jobless rate is good, a hawkish tone is good', /below .Forecast./.test((eventSpecInfo('Unemployment Rate', 'USD') || {}).effect) && /hawkish/.test((eventSpecInfo('FOMC Statement', 'USD') || {}).effect) && /higher rate/.test((eventSpecInfo('Cash Rate', 'AUD') || {}).effect));

  // ---- 3) never another currency's text ----
  var dU = getEventDescription('Core CPI m/m', 'High', 'USD'), dC = getEventDescription('Core CPI m/m', 'High', 'CAD'), iC = getEventInterpretation('CPI m/m', 'High', 'CAD'), iU = getEventInterpretation('CPI m/m', 'High', 'USD');
  ok('the dollar keeps its hand-written text', /Fed/.test(dU) && /USD bullish/.test(iU), [dU, iU]);
  ok('Canada\'s CPI no longer reads as the Fed\'s or as "USD bullish"', !/Fed\b/.test(dC) && /BoC|Canad/.test(dC) && /CAD bullish/.test(iC) && !/USD/.test(iC) && /BoC|Bank of Canada/.test(iC), [dC, iC]);
  var dCh = getEventDescription('CPI m/m', 'Medium', 'CHF'), iCh = getEventInterpretation('CPI m/m', 'Medium', 'CHF');
  ok('Switzerland\'s CPI is Switzerland\'s', /Swiss/.test(dCh) && /CHF bullish/.test(iCh) && /SNB/.test(iCh) && !/USD|Fed\b/.test(dCh + iCh), [dCh, iCh]);
  // titles with no hand-written text for that currency are built from the app's record of it
  var dN = getEventDescription('PPI y/y', 'Medium', 'CNY'), iN = getEventInterpretation('PPI y/y', 'Medium', 'CNY');
  ok('China\'s PPI is built from its own record', /Chinese producers/.test(dN) && /CNY bullish/.test(iN) && /China.s central bank/.test(iN) && !/USD|Fed\b/.test(dN + iN), [dN, iN]);
  var iA = getEventInterpretation('Unemployment Rate', 'High', 'AUD'), iJ = getEventInterpretation('Trade Balance', 'Medium', 'JPY');
  ok('nor Australia\'s jobless rate or Japan\'s trade balance', !/USD|Fed\b/.test(iA) && /AUD/.test(iA) && !/USD|Fed\b/.test(iJ) && /JPY/.test(iJ), [iA, iJ]);
  ok('a speech is matched by its pattern, whoever speaks', (eventSpecInfo('Fed Chairman Warsh Speaks', 'USD') || {}).type === 'Central bank speech' && (eventSpecInfo('BOC Gov Macklem Speaks', 'CAD') || {}).source === 'Bank of Canada' && (eventSpecInfo('RBA Assist Gov Kent Speaks', 'AUD') || {}).source === 'Reserve Bank of Australia' && !eventSpecInfo('Totally Unknown Release', 'USD'));

  // ---- 4) which bank holiday ----
  var H = function (cur, when, title) { var h = window.__stCalHoliday({ title: title || 'Bank Holiday', country: cur, when: when }); return h ? h.name : null; };
  ok('tomorrow in the US is Columbus Day, in Japan Sports Day, in Canada Thanksgiving (this week\'s real feed times)', H('USD', '2026-10-12T07:00:00-04:00') === 'Columbus Day' && H('JPY', '2026-10-11T19:00:00-04:00') === 'Sports Day' && H('CAD', '2026-10-12T08:00:00-04:00') === 'Thanksgiving',
     [H('USD', '2026-10-12T07:00:00-04:00'), H('JPY', '2026-10-11T19:00:00-04:00'), H('CAD', '2026-10-12T08:00:00-04:00')]);
  ok('the row says it', calEventTitle({ title: 'Bank Holiday', country: 'USD', when: '2026-10-12T07:00:00-04:00' }) === 'Bank Holiday · Columbus Day' && calEventTitle({ title: 'Core CPI m/m', country: 'USD', when: '2026-10-14T08:30:00-04:00' }) === 'Core CPI m/m');
  var dH = getEventDescription('Bank Holiday', 'Holiday', 'USD', { title: 'Bank Holiday', country: 'USD', when: '2026-10-12T07:00:00-04:00' });
  ok('and what it means: banks and bonds shut, US stocks open, thin USD liquidity', /^Columbus Day: a bank holiday in the United States\./.test(dH) && /bond market are closed, but US stock markets are open/.test(dH) && /USD pairs/.test(dH), dH);
  var dT = getEventDescription('Bank Holiday', 'Holiday', 'USD', { title: 'Bank Holiday', country: 'USD', when: '2026-11-26T07:00:00-05:00' });
  ok('Thanksgiving closes US stocks too', /^Thanksgiving: /.test(dT) && /stock markets and the bond market are closed/.test(dT), dT);
  var cases = [['GBP', '2026-12-28T08:00:00+00:00', 'Bank Holiday', 'Boxing Day (observed)'], ['GBP', '2026-08-31T08:00:00+01:00', 'Bank Holiday', 'Summer bank holiday'],
    ['EUR', '2027-05-06T08:00:00+02:00', 'German Bank Holiday', 'Ascension Day'], ['EUR', '2026-07-14T08:00:00+02:00', 'French Bank Holiday', 'Bastille Day'], ['EUR', '2026-06-02T08:00:00+02:00', 'Italian Bank Holiday', 'Republic Day'], ['EUR', '2026-05-01T08:00:00+02:00', 'Bank Holiday', 'Labour Day'],
    ['JPY', '2026-03-20T08:00:00+09:00', 'Bank Holiday', 'Vernal Equinox Day'], ['JPY', '2026-09-23T08:00:00+09:00', 'Bank Holiday', 'Autumnal Equinox Day'], ['JPY', '2026-09-22T08:00:00+09:00', 'Bank Holiday', 'Bridge holiday between two holidays'], ['JPY', '2026-05-06T08:00:00+09:00', 'Bank Holiday', 'Golden Week substitute holiday'],
    ['AUD', '2026-01-26T08:00:00+11:00', 'Bank Holiday', 'Australia Day'], ['AUD', '2026-06-08T08:00:00+10:00', 'Bank Holiday', 'King’s Birthday'], ['NZD', '2026-07-10T08:00:00+12:00', 'Bank Holiday', 'Matariki'], ['NZD', '2026-10-26T08:00:00+13:00', 'Bank Holiday', 'Labour Day'],
    ['CAD', '2026-05-18T08:00:00-04:00', 'Bank Holiday', 'Victoria Day'], ['CAD', '2026-07-01T08:00:00-04:00', 'Bank Holiday', 'Canada Day'], ['CHF', '2026-01-02T08:00:00+01:00', 'Bank Holiday', 'Berchtold’s Day'],
    ['CNY', '2026-02-18T08:00:00+08:00', 'Bank Holiday', 'Spring Festival (Chinese New Year)'], ['CNY', '2026-10-05T08:00:00+08:00', 'Bank Holiday', 'National Day (Golden Week)'], ['CNY', '2026-06-19T08:00:00+08:00', 'Bank Holiday', 'Dragon Boat Festival'],
    ['AUD', '2027-12-27T08:00:00+11:00', 'Bank Holiday', 'Christmas Day (observed)'], ['AUD', '2027-12-28T08:00:00+11:00', 'Bank Holiday', 'Boxing Day (observed)'],
    ['CAD', '2022-12-27T08:00:00-05:00', 'Bank Holiday', 'Christmas Day (observed)'], ['NZD', '2027-02-08T08:00:00+13:00', 'Bank Holiday', 'Waitangi Day (observed)']];
  var wrong = cases.filter(function (c) { return H(c[0], c[1], c[2]) !== c[3]; }).map(function (c) { return c[0] + ' ' + c[1].slice(0, 10) + ' -> ' + H(c[0], c[1], c[2]) + ' (wanted ' + c[3] + ')'; });
  ok('every currency\'s holidays are named: ' + cases.length + ' days across nine currencies', !wrong.length, wrong);
  ok('a day the rules do not know stays a plain Bank Holiday', H('USD', '2026-03-03T07:00:00-05:00') === null && calEventTitle({ title: 'Bank Holiday', country: 'USD', when: '2026-03-03T07:00:00-05:00' }) === 'Bank Holiday' && /Bank holiday/i.test(getEventDescription('Bank Holiday', 'Holiday', 'USD', { title: 'Bank Holiday', country: 'USD', when: '2026-03-03T07:00:00-05:00' })));
  window.__lang = 'es';
  ok('in Spanish too', H('USD', '2026-10-12T07:00:00-04:00') === 'Día de Colón' && H('JPY', '2026-10-11T19:00:00-04:00') === 'Día del Deporte' && /festivo bancario en Estados Unidos/.test(getEventDescription('Bank Holiday', 'Holiday', 'USD', { title: 'Bank Holiday', country: 'USD', when: '2026-10-12T07:00:00-04:00' })), H('USD', '2026-10-12T07:00:00-04:00'));
  window.__lang = 'en';

  // ---- 5) the panel ----
  try {
    var now = new Date(), at = function (h) { var d = new Date(now); d.setHours(h, 30, 0, 0); return d.toISOString(); };
    var evs = [{ title: 'Core CPI m/m', country: 'USD', impact: 'High', when: at(13), forecast: '0.2%', previous: '0.3%', actual: '', _idx: 0 }, { title: 'Bank Holiday', country: 'USD', impact: 'Holiday', when: '2026-10-12T07:00:00-04:00', _idx: 1 }];
    document.querySelector('.tab[data-page="bias"]').click(); await W(300);
    var cal = document.getElementById('econ-calendar'); if (cal) cal.classList.remove('econ-collapsed');
    renderEconomicCalendarUI({ kind: 'ok', events: evs }); await W(300);
    var rows = document.querySelectorAll('#econ-calendar-body .econ-event');
    ok('the calendar shows the rows, the holiday by name', rows.length === 2 && /Bank Holiday · Columbus Day/.test(document.getElementById('econ-calendar-body').textContent), rows.length);
    rows[0].click(); await W(300);
    var det = document.querySelector('.econ-event-detail'), dt = det ? det.innerText.replace(/\s+/g, ' ') : '';
    ok('opened: what it is, why it matters, how to read', /WHAT IS IT/i.test(dt) && /WHY IT MATTERS/i.test(dt) && /HOW TO READ/i.test(dt), dt.slice(0, 300));
    var ks = det ? [].map.call(det.querySelectorAll('.econ-spec-k'), function (x) { return x.textContent.trim().toUpperCase(); }) : [];
    ok('and the facts: Source, Measures, Usual effect, Frequency, Also called, Event type', ks.join('|') === 'SOURCE|MEASURES|USUAL EFFECT|FREQUENCY|ALSO CALLED|EVENT TYPE' && /Bureau of Labor Statistics/.test(dt) && /Inflation/.test(dt), ks);
    rows = document.querySelectorAll('#econ-calendar-body .econ-event'); rows[1].click(); await W(300);
    det = document.querySelector('.econ-event-detail'); dt = det ? det.innerText.replace(/\s+/g, ' ') : '';
    ok('a holiday opened: which holiday and what it means, no fact sheet', /Columbus Day: a bank holiday in the United States/.test(dt) && !det.querySelector('.econ-event-specs'), dt.slice(0, 260));
  } catch (e) { ok('the panel', false, String(e && e.stack || e).slice(0, 300)); }
  window.__lang = keepLang;
  return out;
})()
