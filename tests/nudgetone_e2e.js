(async function () {
  // The Nudges block of the Weekly Review: warnings that were all respected read as good news (10 Oct 2026).
  // Run: python tests/browser_test.py tests/nudgetone_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  // a week with four prop-firm warnings (one a day, nothing traded after them) and a week before it with two
  var pad = function (n) { return String(n).padStart(2, '0'); }, key = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var mon = new Date(2026, 5, 1, 12);   // Monday 1 June 2026 - a week with no trades in any journal used here
  var day = function (off) { var d = new Date(mon); d.setDate(d.getDate() + off); return d; };
  data.nudgeLog = {};
  // a prop-firm limit nudge is keyed rule:P<account> and stamped with the time of day
  [0, 1, 2, 3].forEach(function (i) { var o = {}; o['dd_left:Pacc' + i] = { at: '09:00', text: 'Drawdown room is getting small' }; data.nudgeLog[key(day(i))] = o; });
  [-7, -6].forEach(function (i) { var o = {}; o['dd_left:Pacc' + i] = { at: '09:00', text: 'Drawdown room is getting small' }; data.nudgeLog[key(day(i))] = o; });
  var st = window.__stNudge.periodStats(key(day(0)), key(day(6)));
  ok('the test week: four warnings, all respected, nothing taken into a nudge', st.total === 4 && st.heedable === 4 && st.heeded === 4 && st.into.n === 0, [st.total, st.heedable, st.heeded, st.into.n]);
  var host = document.createElement('div'); host.id = 'nt-host'; document.body.appendChild(host);
  host.innerHTML = window.__stNudge.periodHtml(day(0), day(6), 'week');
  var lines = Array.from(host.querySelectorAll('.pn-line')).map(function (n) { return n.textContent.trim(); });
  ok('it leads with the good news', /You respected all 4 warnings$/.test(lines[0]) && host.querySelector('.pn-line').classList.contains('all'), lines);
  ok('in green, with a tick', getComputedStyle(host.querySelector('.pn-heed.all')).color === 'rgb(78, 205, 139)' && !!host.querySelector('.pn-tick'), getComputedStyle(host.querySelector('.pn-heed')).color);
  ok('the count line follows, and the rise on last week is grey, not red', /^4 this week/.test(lines[1]) && /↑ 2/.test(lines[1]) && !host.querySelector('.pn-line .bad') && !!host.querySelector('.pn-line span.pn-muted:last-child'), lines[1]);
  ok('the counts are plain, not amber', host.querySelector('.month-insights').classList.contains('pn-clean') && getComputedStyle(host.querySelector('.dn-count')).color !== 'rgb(232, 207, 99)' && getComputedStyle(host.querySelector('.pn-chip b')).color !== 'rgb(232, 207, 99)', [getComputedStyle(host.querySelector('.dn-count')).color, getComputedStyle(host.querySelector('.pn-chip b')).color]);
  ok('the old wording is not repeated at the bottom', lines.filter(function (l) { return /respected/i.test(l); }).length === 1, lines);
  ok('the days are still listed', host.querySelectorAll('.pn-day').length === 4);
  // one warning
  var only = {}; only[key(day(0))] = data.nudgeLog[key(day(0))]; var keep = data.nudgeLog; data.nudgeLog = only;
  host.innerHTML = window.__stNudge.periodHtml(day(0), day(6), 'week');
  ok('a single respected warning reads naturally', /You respected the warning$/.test(host.querySelector('.pn-line').textContent.trim()), host.querySelector('.pn-line').textContent.trim());
  data.nudgeLog = keep;
  // Spanish
  setLanguage('es'); await W(600);
  host.innerHTML = window.__stNudge.periodHtml(day(0), day(6), 'week');
  ok('Spanish', /Respetaste los 4 avisos$/.test(host.querySelector('.pn-line').textContent.trim()), host.querySelector('.pn-line').textContent.trim());
  setLanguage('en'); await W(400);
  host.remove();
  return out;
})()
