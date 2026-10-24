(async function () {
  // Drawdown recovery (24 Oct 2026, Statistics): the underwater chart and the worst drawdowns. Known trades in, known figures out.
  // Run: python tests/browser_test.py tests/stats_drawdown_e2e.js        (phone: E2E_MOBILE=375x812 in front)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  var acc = newAccountBlank('Personal 10K', 10000, 'personal'); acc.kind = 'personal';
  data.accounts = [acc]; data.activeAccountId = acc.id; data.viewScope = acc.id; data.linkedGroups = []; data.mt5LoginMap = {};
  data.history = []; data.reviewSlots = null; data.review = { trades: [] };
  if (!data.settings) data.settings = {};
  data.settings.statsPeriod = 'all';
  var day0 = new Date(); day0.setDate(day0.getDate() - 40); day0.setHours(9, 5, 0, 0);
  var n = 0;
  var tr = function (gross, extra) {
    n++; var d = new Date(day0); d.setDate(d.getDate() + n);
    var res = gross > 0 ? 'Win' : gross < 0 ? 'Lose' : 'BE';
    return Object.assign({ id: 'dd' + n, accountId: acc.id, symbol: 'EUR/USD', date: d.toISOString(), dayOfWeek: d.getDay(), result: res,
      r: gross / 100, risk: 100, actualGross: gross, costs: 0, side: 'Long', type: 'Continuation' }, extra || {});
  };
  var load = function (list) { data.history = []; data.currentSeries = list; rebuildSeriesByDate(); };
  var stx = async function (k) { var b = document.querySelector('.stx-tab[data-stx="' + k + '"]'); if (b) b.click(); await W(350); };
  var draw = async function () { try { document.querySelector('.tab[data-page="trades"]').click(); } catch (e) {} await W(300); try { renderTradesStats(); } catch (e) { ok('renderTradesStats ran', false, String(e && e.stack || e)); } await W(250); };
  var txt = function (id) { var el = document.getElementById(id); return el ? el.innerText.replace(/\s+/g, ' ').trim() : ''; };

  // 10,000 -> 10,500 (high) -> 10,200 -> 10,000 (low, -500) -> 10,600 (back, a new high) -> 10,700 (high) -> 10,300 -> 10,100 (now, -600)
  load([tr(500), tr(-300), tr(-200), tr(600), tr(100), tr(-400), tr(-200)]);
  await draw(); await stx('overview');
  var sub = txt('dd-sub');
  ok('the card says where you are now: 600 (5.6%) below your high, 2 trades since it began', /600/.test(sub) && /5\.6%/.test(sub) && /2 trades since it began/.test(sub), sub);
  var svg = document.querySelector('#dd-chart svg');
  ok('the underwater chart is drawn, one point per trade (8 with the start)', !!svg && document.querySelectorAll('#dd-chart .zb-hit').length === 8, svg ? document.querySelectorAll('#dd-chart .zb-hit').length : 'no svg');
  var rows = document.querySelectorAll('#dd-worst .history-row:not(.headers)');
  ok('two drawdowns in the table, deepest first', rows.length === 2, rows.length);
  var r0 = rows[0] ? rows[0].innerText.replace(/\s+/g, ' ') : '', r1 = rows[1] ? rows[1].innerText.replace(/\s+/g, ' ') : '';
  ok('the open one: 600 deep, not yet recovered, -6.00R, 2 trades', /Not yet/.test(r0) && /600/.test(r0) && /−6\.00R/.test(r0) && /5\.6%/.test(r0), r0);
  ok('the earlier one: 500 deep (4.8% of 10,500), recovered, 3 trades to get back', !/Not yet/.test(r1) && /500/.test(r1) && /4\.8%/.test(r1) && /−5\.00R/.test(r1) && / 3 /.test(' ' + r1 + ' '), r1);
  // at a high: the good news
  load([tr(500), tr(-300), tr(400)]);
  await draw(); await stx('overview');
  ok('back at a high: "At your high: nothing to win back right now"', /At your high/.test(txt('dd-sub')), txt('dd-sub'));
  ok('and the recovered dip is listed', document.querySelectorAll('#dd-worst .history-row:not(.headers)').length === 1, txt('dd-worst'));
  load([tr(200), tr(300)]);
  await draw(); await stx('overview');
  ok('never below a high: the table says so in plain words', /No drawdowns in this period/.test(txt('dd-worst')), txt('dd-worst'));

  // phone: nothing wider than the screen; the table scrolls inside its card
  if (window.innerWidth <= 420) {
    await stx('overview');
    load([tr(500), tr(-300), tr(-200), tr(600), tr(100), tr(-400), tr(-200)]);
    await draw(); await stx('overview');
    var tw = document.getElementById('dd-worst');
    ok('phone: the page is not wider than the screen', document.documentElement.scrollWidth <= window.innerWidth + 1, [document.documentElement.scrollWidth, window.innerWidth]);
    ok('phone: the drawdowns table scrolls sideways inside its card', tw && tw.scrollWidth > tw.clientWidth && getComputedStyle(tw).overflowX === 'auto', tw ? [tw.scrollWidth, tw.clientWidth, getComputedStyle(tw).overflowX] : null);
  }
  return out;
})()
