(async function () {
  // Statistics with accounts in more than one currency (27 Oct 2026: the 70K in £ and OneFunded in $ - "adding them is plainly wrong").
  // In "All accounts" every money figure shows each currency on its own ("£300.00 · $60.00"), the money charts one currency at a time
  // with a £ | $ switch beside the equity curve, and R, win rate and counts stay combined. One currency in view: nothing changes.
  // Run: python tests/browser_test.py tests/statscur_e2e.js        (phone: E2E_MOBILE=375x812 in front)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
    var A = newAccountBlank('FTMO 70K', 70000, 'challenge'); A.kind = 'challenge'; A.currency = 'GBP';
    var B = newAccountBlank('OneFunded 10K', 10000, 'challenge'); B.kind = 'challenge'; B.currency = 'USD';
    window.__scD = data; data.accounts = [A, B]; data.activeAccountId = A.id; data.viewScope = 'lifetime'; data.linkedGroups = []; data.mt5LoginMap = {};
    data.history = []; data.reviewSlots = null; data.review = { trades: [] };
    if (!data.settings) data.settings = {};
    data.settings.statsPeriod = 'all'; data.settings.currency = 'GBP'; data.settings.pnlView = 'net';
    var day0 = new Date(); day0.setDate(day0.getDate() - 20); day0.setHours(9, 5, 0, 0);
    var n = 0;
    var tr = function (acc, gross, costs) {
      n++; var d = new Date(day0); d.setDate(d.getDate() + n);
      var res = gross > 0 ? 'Win' : gross < 0 ? 'Lose' : 'BE';
      return { id: 'sc' + n, accountId: acc.id, symbol: 'EUR/USD', date: d.toISOString(), dayOfWeek: d.getDay(), result: res,
        r: gross > 0 ? 2 : -1, risk: Math.abs(gross > 0 ? gross / 2 : gross), actualGross: gross, costs: costs || 0, side: 'Long', type: 'Continuation' };
    };
    // the 70K: +£500, -£200 (costs £10 + £5); OneFunded: +$100, -$40 (costs $4 + $2)
    var list = [tr(A, 500, 10), tr(B, 100, 4), tr(A, -200, 5), tr(B, -40, 2)];
    var load = function () { data.history = []; data.currentSeries = list.slice(); rebuildSeriesByDate(); };
    var draw = async function () { try { document.querySelector('.tab[data-page="trades"]').click(); } catch (e) {} await W(300); try { renderTradesStats(); } catch (e) { ok('renderTradesStats ran', false, String(e && e.stack || e)); } await W(300); };
    var stx = async function (k) { var b = document.querySelector('.stx-tab[data-stx="' + k + '"]'); if (b) b.click(); await W(350); };
    var txt = function (id) { var el = document.getElementById(id); return el ? el.innerText.replace(/\s+/g, ' ').trim() : ''; };
    var eq = function () { var c = document.getElementById('equity-chart'); return c && c._eq; };
    load(); await draw(); await stx('overview');

    // the money figures: each currency on its own
    var rows = function (id) { return Array.prototype.map.call(document.querySelectorAll('#' + id + ' .zk-cr'), function (r) { return r.innerText.replace(/\s+/g, ' ').trim(); }); };
    var b2 = rows('kpi-balance');
    ok('balance: a row a currency - £70,285.00 +0.41% from £70,000.00 start, then $10,054.00 +0.54% from $10,000.00 start; never one sum', b2.length === 2 && /£70,285\.00 \+0\.41% from £70,000\.00 start/.test(b2[0]) && /\$10,054\.00 \+0\.54% from \$10,000\.00 start/.test(b2[1]) && !/80,3/.test(txt('kpi-balance')), b2);
    // nothing in a money card touches its chart, and everything stays inside its card (29 Oct 2026: the second figure ran under the sparkline)
    var hit = function (a, b) { return a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5; };
    var clear = function (vid, sid) { var v = document.getElementById(vid), c = v && v.closest('.zc'), cr = c && c.getBoundingClientRect(), sv = document.getElementById(sid), vr = sv && sv.getBoundingClientRect(), bad = [];
      Array.prototype.forEach.call(v ? v.querySelectorAll('.zk-cr, .zk-cr > *') : [], function (e) { var r = e.getBoundingClientRect(); if (!r.width) return; if (vr && hit(r, vr)) bad.push('over the chart: ' + e.textContent); if (r.right > cr.right + 0.5 || r.left < cr.left - 0.5) bad.push('outside the card: ' + e.textContent); if (e.scrollWidth > e.clientWidth + 1 && e.tagName !== 'SMALL') bad.push('cut: ' + e.textContent); });
      var lb = sv && sv.querySelector('.zk-vl'), lr = lb && lb.getBoundingClientRect(); if (lr && (lr.right > cr.right + 0.5 || lr.top < cr.top - 0.5)) bad.push('label outside: ' + lb.textContent);
      return bad; };
    ['balance', 'pnl', 'costs'].forEach(function (k) { var bd = clear('kpi-' + k, 'zk-v-' + k); ok(k + ' card: its rows clear of its chart and inside the card', bd.length === 0 && document.querySelectorAll('#kpi-' + k + ' .zk-cr').length === 2, bd); });
    ok('the cards\' charts say their currency (the curve\'s): in £', ['balance', 'pnl', 'costs'].every(function (k) { var l = document.querySelector('#zk-v-' + k + ' .zk-vl'); return l && l.textContent === 'in £'; }), ['balance', 'pnl', 'costs'].map(function (k) { var l = document.querySelector('#zk-v-' + k + ' .zk-vl'); return l && l.textContent; }));
    ok('net P&L: £285.00 and $54.00 side by side', /£285\.00/.test(txt('kpi-pnl')) && /\$54\.00/.test(txt('kpi-pnl')) && !/339/.test(txt('kpi-pnl')), txt('kpi-pnl'));
    var c2 = rows('kpi-costs');
    ok('costs: £15.00 (£7.50 a trade), then $6.00 ($3.00 a trade)', c2.length === 2 && /£15\.00 £7\.50 a trade/.test(c2[0]) && /\$6\.00 \$3\.00 a trade/.test(c2[1]), c2);
    var p2 = rows('kpi-pnl');
    ok('net P&L: a row a currency, each with its costs under it', p2.length === 2 && /£285\.00 after £15\.00 costs/.test(p2[0]) && /\$54\.00 after \$6\.00 costs/.test(p2[1]), p2);
    var wlb = ['wl-win-detail', 'wl-loss-detail', 'wl-be-detail'].map(function (id) { var e = document.getElementById(id), c = e && e.parentNode.getBoundingClientRect(), r = e && e.getBoundingClientRect(); return e ? (e.scrollWidth <= e.clientWidth + 1 && r.right <= c.right + 0.5) : true; });
    ok('the win / loss cards\' per-currency averages fit their boxes', wlb.every(Boolean), wlb);
    var wlc = Array.prototype.map.call(document.querySelectorAll('#wl-win-detail .wl-cur, #wl-loss-detail .wl-cur'), function (e) { return [e.textContent, e.getClientRects().length]; });
    ok('...each average whole on its line (never a sign on one line and its figure on the next)', wlc.length === 4 && wlc.every(function (x) { return x[1] === 1; }), wlc);
    var wl = (document.getElementById('wl-win-detail') || document.querySelector('[id^="wl-win"]') || {}).innerText || '';
    var wlAll = Array.prototype.map.call(document.querySelectorAll('[id^="wl-"]'), function (e) { return e.innerText; }).join(' | ').replace(/\s+/g, ' ');
    ok('average win per currency: £490.00 · $96.00', /£490\.00 · \+?\$96\.00/.test(wlAll), wlAll.slice(0, 400));
    ok('average loss per currency: £205.00 and $42.00', /£205\.00/.test(wlAll) && /\$42\.00/.test(wlAll), wlAll.slice(0, 400));
    // R, win rate, counts: combined
    ok('win rate stays combined: 50%', /50/.test(txt('kpi-winrate')), txt('kpi-winrate'));
    ok('net R stays combined across both accounts (+1.80R after costs, all four trades)', /\+1\.80R/.test(txt('kpi-totalr')), txt('kpi-totalr'));

    // the equity curve: one currency at a time, with its switch
    var sw = document.getElementById('eq-cur');
    var btns = sw ? sw.querySelectorAll('button[data-eqcur]') : [];
    ok('a £ | $ switch beside the equity curve', btns.length === 2 && btns[0].textContent === '£' && btns[1].textContent === '$', sw && sw.textContent);
    ok('£ first and picked', btns[0] && btns[0].getAttribute('aria-pressed') === 'true', btns[0] && btns[0].getAttribute('aria-pressed'));
    var g = eq();
    ok('the curve in £: from £70,000 to £70,285 (the 70K\'s trades only)', g && g.cur === 'GBP' && Math.round(g.values[0]) === 70000 && Math.round(g.values[g.values.length - 1]) === 70285 && g.values.length === 3, g && [g.cur, g.values]);
    btns[1].click(); await W(400);
    g = eq();
    ok('$ picked: the curve in $, from $10,000 to $10,054', g && g.cur === 'USD' && Math.round(g.values[0]) === 10000 && Math.round(g.values[g.values.length - 1]) === 10054 && g.values.length === 3, g && [g.cur, g.values]);
    sw = document.getElementById('eq-cur');
    ok('...and the switch shows $ picked', sw && sw.querySelector('button[data-eqcur="USD"]').getAttribute('aria-pressed') === 'true');
    // (the drawdown card it also followed went on 29 Oct 2026, 125b912e)
    ok('the cards\' charts follow it: in $', ['balance', 'pnl', 'costs'].every(function (k) { var l = document.querySelector('#zk-v-' + k + ' .zk-vl'); return l && l.textContent === 'in $'; }));
    b2 = rows('kpi-balance');
    ok('the money figures stay a row a currency while $ is picked', b2.length === 2 && /£70,285\.00/.test(b2[0]) && /\$10,054\.00/.test(b2[1]) && clear('kpi-balance', 'zk-v-balance').length === 0, b2);
    // the hover read-out in the picked currency
    var chart = document.getElementById('equity-chart'), rb = chart.getBoundingClientRect();
    chart.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: rb.right - 4, clientY: rb.top + rb.height / 2 }));
    await W(150);
    var tip = document.querySelector('.equity-tooltip.show') || document.querySelector('.equity-tooltip');
    ok('the curve\'s hover reads $', !tip || !tip.textContent || /\$/.test(tip.textContent) && !/£/.test(tip.textContent), tip && tip.textContent);
    btns = document.querySelectorAll('#eq-cur button'); btns[0].click(); await W(400);
    ok('£ again: back to the 70K\'s curve', eq() && eq().cur === 'GBP');

    // R mode: no switch (R adds up across currencies)
    var rBtn = document.querySelector('[data-eqmode="r"], #eq-mode-r, .eq-mode-btn[data-mode="r"]');
    if (rBtn) { rBtn.click(); await W(400); ok('R mode: the curve is every trade, no currency switch', !document.getElementById('eq-cur') && eq() && eq().isR && eq().values.length === 5, eq() && eq().values); var bBtn = document.querySelector('[data-eqmode="balance"], #eq-mode-bal, .eq-mode-btn[data-mode="balance"]'); if (bBtn) { bBtn.click(); await W(400); } }

    // phone
    if (window.innerWidth <= 420) {
      ok('phone: the page is not wider than the screen', document.documentElement.scrollWidth <= window.innerWidth + 1, [document.documentElement.scrollWidth, window.innerWidth]);
      var s2 = document.getElementById('eq-cur'), card = s2 && s2.closest('.zc');
      var r2 = s2 && s2.getBoundingClientRect(), rc = card && card.getBoundingClientRect();
      ok('phone: the switch sits inside its card', r2 && rc && r2.right <= rc.right + 1 && r2.left >= rc.left - 1 && r2.width > 30, r2 && rc && [r2.left, r2.right, rc.left, rc.right]);
      var kb = document.getElementById('kpi-balance'), kc = kb && kb.closest('.zc');
      ok('phone: the split balance fits its card', kb && kc && kb.getBoundingClientRect().right <= kc.getBoundingClientRect().right + 1, kb && kc && [kb.getBoundingClientRect().right, kc.getBoundingClientRect().right, kb.scrollWidth, kb.clientWidth]);
      ['balance', 'pnl', 'costs'].forEach(function (k) { var bd = clear('kpi-' + k, 'zk-v-' + k); ok('phone: ' + k + ' card clear of its chart, inside its card', bd.length === 0, bd); });
    }

    // one account in view: its own currency, no switch
    var diag = function () { return { same: window.__scD === data, scope: data.viewScope, accs: (data.accounts || []).map(function (a) { return [a.id, a.name, a.currency, a.startingBalance, !!a.demo]; }), n: (data.currentSeries || []).length, base: getScopedBaseline(), paid: getScopedPaidOut(), tr: filterByScope(getAllLifetimeTrades()).map(function (t) { return [t.id, t.accountId === B.id ? 'B' : t.accountId === A.id ? 'A' : t.accountId, tradeGross(t), tradeCosts(t), tradeCopies(t)]; }) }; };
    data.viewScope = B.id; await draw();
    ok('OneFunded alone: $10,054.00, no switch', /^\$10,054\.00$/.test(txt('kpi-balance')) && !document.getElementById('eq-cur'), [txt('kpi-balance'), !!document.getElementById('eq-cur'), diag()]);
    ok('...its curve in $', eq() && eq().cur === 'USD' && Math.round(eq().values[eq().values.length - 1]) === 10054, eq() && [eq().cur, eq().values]);
    // every account in one currency: nothing changes
    data.viewScope = 'lifetime'; B.currency = 'GBP'; await draw();
    ok('all in £: one balance £80,339.00 as before, no switch', /^£80,339\.00$/.test(txt('kpi-balance')) && !document.getElementById('eq-cur'), [txt('kpi-balance'), !!document.getElementById('eq-cur'), diag()]);
    ok('...and one curve of all four trades', eq() && !eq().isR && eq().values.length === 5 && Math.round(eq().values[4]) === 80339, eq() && eq().values);
    B.currency = 'USD';
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
