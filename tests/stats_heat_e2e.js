(async function () {
  // Every measured trade, inside the excursions box (Statistics -> Strategy, 24 Oct 2026): one column per trade above the table,
  // the same _maeR / _mfeR the table averages, and one plain-words line. Known trades in, known figures out.
  // Run: python tests/browser_test.py tests/stats_heat_e2e.js        (phone: E2E_MOBILE=375x812 in front)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  var acc = newAccountBlank('Personal 10K', 10000, 'personal'); acc.kind = 'personal';
  data.accounts = [acc]; data.activeAccountId = acc.id; data.viewScope = acc.id; data.linkedGroups = []; data.mt5LoginMap = {};
  data.history = []; data.reviewSlots = null; data.review = { trades: [] };
  if (!data.settings) data.settings = {};
  data.settings.statsPeriod = 'all';
  var day0 = new Date(); day0.setDate(day0.getDate() - 30); day0.setHours(9, 5, 0, 0);
  var n = 0;
  var tr = function (gross, extra) {
    n++; var d = new Date(day0); d.setDate(d.getDate() + n);
    var res = gross > 0 ? 'Win' : gross < 0 ? 'Lose' : 'BE';
    return Object.assign({ id: 'h' + n, accountId: acc.id, symbol: 'EUR/USD', date: d.toISOString(), dayOfWeek: d.getDay(), result: res,
      r: gross / 100, risk: 100, actualGross: gross, costs: 0, side: 'Long', type: 'Continuation', sl: 4 }, extra || {});
  };
  var m = function (gross, mae, mfe) { return tr(gross, { mt5Ticket: String(9000 + n + 1), _maeR: mae, _mfeR: mfe, _maePips: mae * 4, _mfePips: mfe * 4, _excAt: Date.now() }); };
  var list = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.55, 0.8].map(function (h) { return m(200, h, 2.4); });
  list.push(m(-100, 1.0, 0.2), m(-100, 1.02, 0.5), m(-100, 0.98, 0.9), m(0, 0.3, 0.6));
  list.push(tr(150));   // typed, not synced: never measured
  data.history = []; data.currentSeries = list; rebuildSeriesByDate();
  try { localStorage.removeItem('st_mae_view'); } catch (e) {}
  try { document.querySelector('.tab[data-page="trades"]').click(); } catch (e) {}
  await W(300); try { renderTradesStats(); } catch (e) { ok('renderTradesStats ran', false, String(e && e.stack || e)); }
  var b = document.querySelector('.stx-tab[data-stx="habits"]'); if (b) b.click(); await W(500);
  var box = document.getElementById('combo-diag'), heat = document.getElementById('exc-heat'), table = box && box.querySelector('.history-list');
  var txt = function (id) { var el = document.getElementById(id); return el ? el.innerText.replace(/\s+/g, ' ').trim() : ''; };
  ok('the chart is inside the excursions box, above its table', !!heat && box.contains(heat) && !!table && (heat.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING), [!!heat, !!table]);
  ok('there is no separate heat card on the Strategy tab', !document.getElementById('mae-section'));
  ok('one column per measured trade: 14 (the typed trade is not measured)', document.querySelectorAll('#exc-heat-chart .zb-hit').length === 14, document.querySelectorAll('#exc-heat-chart .zb-hit').length);
  ok('the stop is marked at −1R', /−1R/.test((document.querySelector('#exc-heat-chart svg') || {}).textContent || ''));
  ok('against you: "9 of 10 winners never went past −0.6R against you."', /9 of 10 winners never went past −0\.6R against you\./.test(txt('mae-read')), txt('mae-read'));
  ok('the key names winners, break-evens and losers', /Winners/.test(txt('mae-key')) && /Break-evens/.test(txt('mae-key')) && /Losers/.test(txt('mae-key')), txt('mae-key'));
  var fav = document.querySelector('#mae-seg button[data-mae="fav"]'); if (fav) fav.click(); await W(200);
  var rowL = [].filter.call(box.querySelectorAll('.history-row:not(.headers)'), function (r) { return /Losers|Perdedoras/.test(r.innerText); })[0];
  ok('in your favour: winners +2.40R on average; losers +0.53R, the same figure as the table\'s losers row',
    /reached \+2\.40R on average/.test(txt('mae-read')) && /losers were \+0\.53R in your favour/.test(txt('mae-read')) && rowL && /\+0\.53R/.test(rowL.innerText), [txt('mae-read'), rowL && rowL.innerText.replace(/\s+/g, ' ')]);
  ok('in your favour: still one column per trade', document.querySelectorAll('#exc-heat-chart .zb-hit').length === 14);
  var seen = false; try { seen = localStorage.getItem('st_mae_view') === 'fav'; } catch (e) {}
  ok('the view picked is remembered on this device', seen);
  // a re-render keeps the picked view and redraws
  try { renderTradesStats(); } catch (e) {} await W(300);
  ok('a re-render keeps the view picked', /On your favour|In your favour/i.test((document.querySelector('#mae-seg button.on') || {}).textContent || ''), (document.querySelector('#mae-seg button.on') || {}).textContent);
  var adv = document.querySelector('#mae-seg button[data-mae="adv"]'); if (adv) adv.click(); await W(150);
  if (window.innerWidth <= 420) {
    var c = document.getElementById('exc-heat-chart'), sv = c && c.querySelector('svg'), seg = document.getElementById('mae-seg');
    ok('phone: the chart fills the box width, nothing wider than the screen', sv && Math.abs(sv.getBoundingClientRect().width - c.getBoundingClientRect().width) < 2 && document.documentElement.scrollWidth <= window.innerWidth + 1, [sv && sv.getBoundingClientRect().width, c && c.getBoundingClientRect().width, document.documentElement.scrollWidth]);
    ok('phone: the two view buttons sit side by side inside the box', seg && seg.getBoundingClientRect().right <= box.getBoundingClientRect().right + 1 && seg.querySelectorAll('button')[0].getBoundingClientRect().top === seg.querySelectorAll('button')[1].getBoundingClientRect().top);
  }
  return out;
})()
