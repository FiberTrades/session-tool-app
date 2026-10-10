(async function () {
  // Medium news on the Session Live board (10 Oct 2026): a yellow box between Red news and Bank holiday, only for a
  // medium release TODAY on the member's pairs that lands inside one of their own session times.
  // Run: python tests/browser_test.py tests/mednews_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  try { stDemoSeed(data); } catch (e) {}
  var H = window.__stHeadNews, N = window.__stNudge;
  ok('the helpers are there', !!H && typeof H.upcomingMedium === 'function' && !!N && typeof N.mediumNewsFor === 'function');
  // a fixed day: session 08:00-10:00, pairs EUR/USD
  data.settings.sessions = [{ name: 'London', start: '08:00', end: '10:00' }]; data.settings.symbols = ['EUR/USD'];
  var base = new Date(); base.setHours(0, 0, 0, 0);
  var at = function (dayOff, h, m) { var d = new Date(base); d.setDate(d.getDate() + dayOff); d.setHours(h, m, 0, 0); return d; };
  var ev = function (when, cur, impact, title) { return { when: when.toISOString(), country: cur, impact: impact, title: title, isTimed: true }; };
  var keepCache = data._calendarCache;
  data._calendarCache = { events: [
    ev(at(0, 7, 0), 'USD', 'Medium', 'Too Early Speaks'),            // before the session
    ev(at(0, 8, 30), 'JPY', 'Medium', 'Not My Pair'),                // inside, another currency
    ev(at(0, 9, 0), 'USD', 'High', 'Red Thing'),                     // inside, but red
    ev(at(0, 9, 15), 'EUR', 'Medium', 'German ZEW Economic Sentiment'),
    ev(at(0, 9, 15), 'EUR', 'Medium', 'ZEW Economic Sentiment'),     // same minute: one group
    ev(at(0, 15, 0), 'USD', 'Medium', 'ISM Services PMI'),           // today, hours after the session
    ev(at(1, 9, 0), 'USD', 'Medium', 'Tomorrow Inside')              // inside the window, but tomorrow
  ] };
  var m0 = H.upcomingMedium(at(0, 6, 0).getTime());
  ok('picks the one release today that lands inside the session', !!m0 && m0.when === '09:15' && /ZEW/.test(m0.name) && /\(EUR\)/.test(m0.name) && m0.inTxt === 'in 3 h 15 m', m0);
  ok('red news is not repeated in it', !!m0 && !/Red Thing/.test(m0.title), m0 && m0.title);
  ok('once it has passed there is nothing: the 15:00 one is outside the session', H.upcomingMedium(at(0, 9, 20).getTime()) === null, H.upcomingMedium(at(0, 9, 20).getTime()));
  ok('tomorrow, tomorrow\'s shows - never a day ahead', H.upcomingMedium(at(0, 23, 0).getTime()) === null && (H.upcomingMedium(at(1, 6, 0).getTime()) || {}).name === 'Tomorrow Inside (USD)', [H.upcomingMedium(at(0, 23, 0).getTime()), H.upcomingMedium(at(1, 6, 0).getTime())]);
  data.settings.sessions = [{ name: 'London', start: '08:00', end: '10:00' }, { name: 'New York', start: '14:30', end: '16:00' }];
  var m2 = H.upcomingMedium(at(0, 11, 0).getTime());
  ok('a second session of yours counts too', !!m2 && m2.when === '15:00' && m2.name === 'ISM Services PMI (USD)', m2);
  ok('the red news list is untouched by it', N.redNewsFor(['USD', 'EUR']).length === 1 && N.mediumNewsFor(['USD', 'EUR']).length === 4, [N.redNewsFor(['USD', 'EUR']).length, N.mediumNewsFor(['USD', 'EUR']).length]);
  // on the board, with a session window around right now so the release is still to come
  var now = new Date(), hm = function (d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  var soon = new Date(now.getTime() + 20 * 60000), sameDay = soon.toDateString() === now.toDateString() && new Date(now.getTime() + 40 * 60000).toDateString() === now.toDateString() && new Date(now.getTime() - 30 * 60000).toDateString() === now.toDateString();
  if (sameDay) {
    data.settings.sessions = [{ name: 'London', start: hm(new Date(now.getTime() - 30 * 60000)), end: hm(new Date(now.getTime() + 40 * 60000)) }];
    data._calendarCache = { events: [ev(soon, 'USD', 'Medium', 'ISM Services PMI')] };
    var rv = document.querySelector('.tab[data-page="review"]'); if (rv) rv.click(); await W(700);
    var pr = document.getElementById('page-review'); pr.classList.add('session-live-collapsed');
    try { window.__stLiveBox.render(); } catch (e) {}
    await W(400);
    var nh = document.getElementById('st-livenews'), mb = nh.querySelector('.slx-news.med'), kids = Array.from(nh.children).map(function (n) { return n.className; });
    ok('Session Live shows the yellow box', !nh.hidden && !!mb && /ISM Services PMI \(USD\) · \d\d:\d\d/.test(mb.querySelector('.slx-v').textContent) && /medium news/i.test(mb.querySelector('.slx-l').textContent), [nh.hidden, nh.innerText]);
    ok('in the calendar yellow', !!mb && getComputedStyle(mb.querySelector('.slx-v')).color === 'rgb(255, 210, 77)' && getComputedStyle(mb.querySelector('.slx-l')).color === 'rgb(255, 210, 77)', mb && getComputedStyle(mb.querySelector('.slx-v')).color);
    ok('after Red news and before Bank holiday', !!mb && kids.indexOf('slx-news med') > 0 && /^slx-news( has)?$/.test(kids[0]) && (kids.indexOf('slx-news hol') < 0 || kids.indexOf('slx-news hol') > kids.indexOf('slx-news med')), kids);
    ok('its countdown stays on one line', !!mb && getComputedStyle(mb.querySelector('small')).whiteSpace === 'nowrap');
    // a release outside the session: no box at all, not an empty one
    data.settings.sessions = [{ name: 'London', start: hm(new Date(now.getTime() - 30 * 60000)), end: hm(new Date(now.getTime() + 5 * 60000)) }];
    pr.classList.add('session-live-collapsed');
    try { window.__stLiveBox.render(); } catch (e) {}
    await W(400);
    ok('outside your session there is no medium box at all', !document.querySelector('#st-livenews .slx-news.med'), document.getElementById('st-livenews').innerText);
    pr.classList.remove('session-live-collapsed');
  }
  data._calendarCache = keepCache;
  return out;
})()
