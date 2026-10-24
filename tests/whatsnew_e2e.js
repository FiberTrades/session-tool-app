// What's new (24 Oct 2026): whats-new.json feeds the public pages and the app. In the app: a pink dot on the logo mark and
// on Settings > What's new while a day newer than data.settings.newsSeen is waiting; opening the item clears it.
// Run: python tests/browser_test.py tests/whatsnew_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var hid = function (id) { var d = document.getElementById(id); return !d || d.hidden || getComputedStyle(d).display === 'none'; };
  try {
    var j = await (await fetch('/whats-new.json', { cache: 'no-store' })).json();
    var E = j.entries || [];
    ok('the list has days, newest first', E.length > 5 && E.every(function (e, i) { return !i || E[i - 1].date > e.date; }), E.length);
    ok('every day has the same number of lines in English and Spanish', E.every(function (e) { return e.en && e.es && e.en.length && e.en.length === e.es.length; }), '');
    var words = JSON.stringify(j).toLowerCase();
    ok('no ICT, SMC or liquidity wording', !/\bict\b|\bsmc\b|liquidity/.test(words), '');
    // Simple on purpose (Nestor, 24 Oct 2026: "i dont want competitors to get any ideas from whats new"): a few short
    // benefit lines an update, no numbers, prices, timings or how anything works.
    var all = []; E.forEach(function (e) { all = all.concat(e.en, e.es); });
    ok('at most three lines an update', E.every(function (e) { return e.en.length <= 3; }), E.map(function (e) { return e.en.length; }).join());
    var long = all.filter(function (l) { return l.trim().split(/\s+/).length > 10; });
    ok('every line ten words or fewer', !long.length, long);
    var leak = all.filter(function (l) { return /\d|£|\$|€|\bcloud\b|\bnube\b|server|servidor|\bEA\b|MT5|MetaTrader|TradingView|Stripe|Wine/i.test(l); });
    ok('no numbers, prices, technology or supplier names', !leak.length, leak);
    for (var i = 0; i < 40 && !(window.__stWhatsNew && window.__stWhatsNew.list()); i++) await W(200);
    ok('the app loaded the list', !!(window.__stWhatsNew && window.__stWhatsNew.list() && window.__stWhatsNew.list().length === E.length), window.__stWhatsNew && window.__stWhatsNew.list() && window.__stWhatsNew.list().length);
    // signed out: no dot
    window.currentUser = null; data.settings = data.settings || {}; data.settings.newsSeen = '';
    window.__stWhatsNew.paint();
    ok('signed out: no dot on the mark', hid('wn-gear-dot'), '');
    // a member who has not looked yet
    window.currentUser = { id: '00000000-0000-0000-0000-0000000000aa', email: 'member@example.com' };
    window.__stWhatsNew.paint();
    ok('a member with unread news: dot on the mark', !hid('wn-gear-dot'), '');
    ok('and on the Settings item', !hid('wn-nav-dot'), '');
    var dot = document.getElementById('wn-gear-dot'), cs = getComputedStyle(dot);
    ok('the dot is crisp pink, no glow', /rgb\(244, 114, 182\)/.test(cs.backgroundColor) && !/blur|rgba\(244, 114, 182/.test(cs.boxShadow) && cs.filter === 'none', cs.backgroundColor + ' | ' + cs.boxShadow);
    // a mentor's view never shows it
    document.body.classList.add('mentor-viewing'); window.__stWhatsNew.paint();
    ok('mentor view: no dot', hid('wn-gear-dot'), '');
    document.body.classList.remove('mentor-viewing'); window.__stWhatsNew.paint();
    // open Settings > What's new
    document.getElementById('settings-gear').click(); await W(500);
    var nav = document.querySelector('#settings-modal-bg .settings-nav-item[data-section="whatsnew"]');
    ok('Settings has a What’s new item', !!nav && /What.s new/.test(nav.textContent), nav && nav.textContent);
    nav.click(); await W(700);
    var days = document.querySelectorAll('#wn-days .wn-day');
    ok('the item lists every day', days.length === E.length, days.length);
    ok('first day is the newest, in its lines', days[0] && days[0].querySelectorAll('li').length === E[0].en.length && days[0].textContent.indexOf(E[0].en[0]) >= 0, days[0] && days[0].textContent.slice(0, 80));
    ok('no New labels on a first look', !document.querySelector('#wn-days .wn-new'), '');
    ok('opening it marks the newest day seen', data.settings.newsSeen === E[0].date, data.settings.newsSeen);
    ok('and the dots go', hid('wn-gear-dot') && hid('wn-nav-dot'), '');
    ok('a link to the public page', !!document.querySelector('#wn-days .wn-intro a[href="/whats-new.html"]'), '');
    // a member who last looked a few days ago sees New on the days since
    var prev = E[Math.min(3, E.length - 1)].date;
    data.settings.newsSeen = prev; window.__stWhatsNew.paint();
    ok('older seen date: the dot is back', !hid('wn-gear-dot'), '');
    await window.__stWhatsNew.open(); await W(200);
    var news = document.querySelectorAll('#wn-days .wn-new').length;
    ok('New on each day since the last look', news === E.filter(function (e) { return e.date > prev; }).length, news);
    // Spanish
    if (typeof window.setLanguage === 'function') {
      window.setLanguage('es'); await W(300);
      await window.__stWhatsNew.open(); await W(200);
      var d0 = document.querySelector('#wn-days .wn-day');
      ok('Spanish: the lines are Spanish', d0 && d0.textContent.indexOf(E[0].es[0]) >= 0, d0 && d0.textContent.slice(0, 80));
      ok('Spanish: the item is Novedades', /Novedades/.test(nav.textContent), nav.textContent);
      ok('Spanish: the link goes to the Spanish page', !!document.querySelector('#wn-days .wn-intro a[href="/whats-new-es.html"]'), '');
      window.setLanguage('en'); await W(300);
    }
    // the public pages and the landing link
    var en = await (await fetch('/whats-new.html', { cache: 'no-store' })).text();
    var es = await (await fetch('/whats-new-es.html', { cache: 'no-store' })).text();
    ok('public pages read the same file', /whats-new\.json/.test(en) && /whats-new\.json/.test(es) && /lang="es"/.test(es), '');
    var idx = await (await fetch('/index.html', { cache: 'no-store' })).text();
    ok('the landing footer links What’s new (EN + ES)', idx.indexOf('href="/whats-new.html?from=landing"') > 0 && idx.indexOf('data-href-es="/whats-new-es.html?from=landing"') > 0, '');
    var sw = await (await fetch('/sw.js', { cache: 'no-store' })).text();
    ok('the service worker fetches the list network-first', /whats-new\\\.json\$\/\.test\(url\.pathname\)/.test(sw), '');
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
