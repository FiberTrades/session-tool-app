(async function () {
  // Statistics' Period as dates of your own (Nestor, 31 Oct 2026: "Make period a time picker instead so users have freedom picking their timeframes."). Presets and From / To, kept in settings;
  // every figure follows it, the balance stays all-time. Run: python tests/browser_test.py tests/statsperiod_e2e.js  (phone: E2E_MOBILE=375x812 in front)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 100 && typeof newAccountBlank !== 'function'; i++) await W(100);
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
    var A = newAccountBlank('FTMO 70K', 70000, 'challenge'); A.kind = 'challenge'; A.currency = 'GBP';
    data.accounts = [A]; data.activeAccountId = A.id; data.viewScope = 'lifetime'; data.history = []; data.reviewSlots = null; data.review = { trades: [] }; data.settings.statsPeriod = 'all';
    var ago = function (n) { var d = new Date(); d.setHours(9, 0, 0, 0); d.setDate(d.getDate() - n); return d; }, key = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    var mk = function (n, g) { var d = ago(n); return { id: 'p' + n, accountId: A.id, symbol: 'EUR/USD', date: d.toISOString(), dayOfWeek: d.getDay(), session: 'London', result: g > 0 ? 'Win' : 'Lose', r: g > 0 ? 2 : -1, risk: 100, actualGross: g, costs: 0, pips: 4 }; };
    data.currentSeries = [mk(100, 200), mk(50, -100), mk(20, 200), mk(10, -100), mk(1, 200)]; rebuildSeriesByDate();
    document.querySelector('.tab[data-page="trades"]').click(); await W(500); renderTradesStats(); await W(300);
    var btn = document.getElementById('stats-period-btn'), pop = function () { return document.getElementById('stats-period-pop'); };
    var count = function () { return window.__stStatsN ? 0 : filterByStatsPeriod(getAllLifetimeTrades()).length; };
    var balance = function () { var c = [].filter.call(document.querySelectorAll('#page-trades .zc, #page-trades .zk'), function (x) { return /Account balance/i.test(x.textContent); })[0]; return c ? (c.textContent.match(/£[\d,.]+/) || [])[0] : null; };
    var bal0 = balance();
    ok('Period is one button, not a dropdown of five', !!btn && !document.getElementById('stats-period-select') && /All time/.test(btn.textContent), btn && btn.textContent);
    btn.click(); await W(100);
    var names = [].map.call(pop().querySelectorAll('[data-stp]'), function (b) { return b.textContent; });
    ok('it opens the presets and From / To', pop() && ['This week', 'This month', 'Last 30 days', 'This year', 'All time'].every(function (n) { return names.indexOf(n) >= 0; }) && !!pop().querySelector('#stp-from') && !!pop().querySelector('#stp-to'), names);
    var pr = pop().getBoundingClientRect();
    ok('the box is on screen', pr.left >= 0 && pr.right <= innerWidth && pr.top >= 0 && pr.bottom <= innerHeight, [pr.left, pr.right, pr.top, pr.bottom, innerWidth, innerHeight]);
    var bw = [].map.call(pop().querySelectorAll('[data-stp]'), function (b) { var r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), b.scrollWidth <= b.clientWidth]; });
    ok('every preset the same size, none cut', bw.every(function (x) { return x[0] === bw[0][0] && x[1] === bw[0][1] && x[2]; }), bw);
    ok('Show these dates waits for a date', pop().querySelector('#stp-apply').disabled);
    pop().querySelector('[data-stp="30d"]').click(); await W(300);
    ok('Last 30 days: the trades of the last 30 days, saved in settings, named on the button', data.settings.statsPeriod === '30d' && count() === 3 && /Last 30 days/.test(btn.textContent) && !pop(), [data.settings.statsPeriod, count(), btn.textContent]);
    btn.click(); await W(100);
    var f = pop().querySelector('#stp-from'), z = pop().querySelector('#stp-to');
    f.value = key(ago(60)); f.dispatchEvent(new Event('input', { bubbles: true })); z.value = key(ago(10)); z.dispatchEvent(new Event('input', { bubbles: true }));
    ok('with a date, the button wakes', !pop().querySelector('#stp-apply').disabled);
    pop().querySelector('#stp-apply').click(); await W(400);
    ok('From and To: only the trades between them, both days included', data.settings.statsPeriod === 'custom' && data.settings.statsFrom === key(ago(60)) && data.settings.statsTo === key(ago(10)) && count() === 3, [data.settings.statsFrom, data.settings.statsTo, count()]);
    ok('the button says the dates', /–/.test(btn.textContent) && btn.scrollWidth <= btn.clientWidth + 1, btn.textContent);
    ok('the balance stays all-time', balance() === bal0, [bal0, balance()]);
    var eq = document.getElementById('equity-chart');
    ok('the equity curve shows the period', eq && eq._eq && eq._eq.values.length <= 5, eq && eq._eq && eq._eq.values.length);
    STCloud.setData(JSON.parse(JSON.stringify(data))); renderTradesStats(); await W(200);
    ok('kept with the journal', document.getElementById('stats-period-btn').textContent.indexOf('–') > 0 && filterByStatsPeriod(getAllLifetimeTrades()).length === 3);
    btn = document.getElementById('stats-period-btn'); btn.click(); await W(100);
    f = pop().querySelector('#stp-from'); z = pop().querySelector('#stp-to');
    ok('open again: the dates are there to change', f.value === key(ago(60)) && z.value === key(ago(10)));
    var a2 = key(ago(5)), b2 = key(ago(30)); f.value = a2; z.value = b2; f.dispatchEvent(new Event('input', { bubbles: true })); pop().querySelector('#stp-apply').click(); await W(300);
    ok('From after To: read the right way round', data.settings.statsFrom === b2 && data.settings.statsTo === a2 && count() === 2, [data.settings.statsFrom, data.settings.statsTo, count()]);
    btn.click(); await W(100); document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); await W(50);
    ok('a click elsewhere closes it', !pop());
    btn.click(); await W(100); pop().querySelector('[data-stp="all"]').click(); await W(300);
    ok('All time: everything again', data.settings.statsPeriod === 'all' && count() === 5 && /All time/.test(btn.textContent), [count(), btn.textContent]);
    data.settings.statsPeriod = 'quarter'; renderTradesStats(); await W(100);
    ok('a saved This quarter still reads as before', /This quarter/.test(btn.textContent), btn.textContent);
    data.settings.statsPeriod = 'all';
  } catch (e) { out.push({ name: 'test ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
