// End-to-end test (Nestor, 3 Nov 2026: "this isnt right!!", "is this meant to be red? as it has the minus symbol?", "these numbers are getting cut off").
// Prop Firm Progress names only its own accounts' missing trades, in their own money; a table's money cell over two currencies: a line each, each in its colour, nothing cut off.
// Run: E2E_SIZE=1600x1200 python tests/browser_test.py tests/propnote_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
  try {
    for (var i = 0; i < 100 && typeof newAccountBlank !== 'function'; i++) await W(100);
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
    var A = newAccountBlank('FTMO 70K', 70000, 'challenge'); A.kind = 'challenge'; A.currency = 'GBP'; A.riskRules = { profitTargetMode: 'amount', profitTargetAmount: 7000, maxDrawdownMode: 'amount', maxDrawdownAmount: 7000 };
    var B = newAccountBlank('TTT 10K', 10000, 'challenge'); B.kind = 'challenge'; B.currency = 'USD'; B.riskRules = { profitTargetMode: 'amount', profitTargetAmount: 500, maxDrawdownMode: 'amount', maxDrawdownAmount: 500 };
    var D = newAccountBlank('FTMO Demo', 10000, 'personal'); D.kind = 'personal'; D.currency = 'GBP';
    data.accounts = [A, B, D]; data.activeAccountId = A.id; data.viewScope = 'lifetime'; data.linkedGroups = []; data.mt5LoginMap = { '111': A.id, '222': B.id, '333': D.id }; data.history = []; data.review = { trades: [] }; data.settings.statsPeriod = 'all';
    var d = new Date(); d.setDate(d.getDate() - 2); d.setHours(9, 30, 0, 0); var iso = d.toISOString();
    data.currentSeries = [
      { id: 'l1', accountId: A.id, symbol: 'EUR/USD', side: 'Long', type: 'Reaction', entryTime: '09:30', date: iso, openTs: iso, dayOfWeek: d.getDay(), result: 'Win', r: 5, risk: 500, actualGross: 1213.89, costs: 0 },
      { id: 'l2', accountId: B.id, symbol: 'EUR/USD', side: 'Long', type: 'Reaction', entryTime: '09:30', date: iso, openTs: iso, dayOfWeek: d.getDay(), result: 'Lose', r: 5, risk: 50, actualGross: -73.26, costs: 0 }];
    rebuildSeriesByDate();
    // what the journal holds tonight: the demo's test trades
    data._mt5Excluded = { n: 28, sum: -45.76, by: { '333': { n: 28, sum: -45.76 } } };
    document.querySelector('.tab[data-page="trades"]').click(); await W(600); renderTradesStats(); await W(300);
    var pg = document.getElementById('page-trades'), body = pg.textContent;
    ok('the demo\'s test trades: no line on the prop accounts\' cards', !/not counted here/.test(body), (body.match(/.{40}not counted here.{30}/) || [''])[0]);
    ok('the TTT card in dollars, the FTMO card in pounds', /TTT 10K[\s\S]{0,120}\$10,000/.test(body) && !/TTT 10K[\s\S]{0,120}£10,000/.test(body) && /FTMO 70K[\s\S]{0,120}£70,000|£71,213/.test(body), (body.match(/TTT 10K.{0,120}/) || [''])[0]);
    data._mt5Excluded = { n: 3, sum: -30, by: { '222': { n: 2, sum: -20 }, '333': { n: 1, sum: -10 } } };
    renderTradesStats(); await W(300);
    var nt = (pg.textContent.match(/\d+ broker trades? not counted here \([^)]*\)/) || [''])[0];
    ok('its own trades: said, counted for its accounts only, in its money', nt === '2 broker trades not counted here ($20.00)', nt);
    data._mt5Excluded = null;
    renderTradesStats(); await W(300);
    // the table's cell
    var cells = Array.prototype.filter.call(document.querySelectorAll('#session-breakdown .history-row:not(.headers) .history-cell'), function (c) { return /\$73\.26/.test(c.textContent); });
    var c0 = cells[0], g = c0 && c0.querySelector('.good'), b = c0 && c0.querySelector('.bad');
    ok('two currencies in a cell: each its own line', !!c0 && !!c0.querySelector('.st-cur-2 br') && /£1,213\.89/.test(txt(g)) && /\$73\.26/.test(txt(b)), c0 && c0.innerHTML.slice(0, 200));
    var col = function (e) { return e ? getComputedStyle(e).color : ''; };
    ok('...the minus red, the plus green', g && b && col(g) !== col(b) && /^rgb\((2[0-9]{2}|1[5-9][0-9]),/.test(col(b)), [col(g), col(b)]);
    var sideC = Array.prototype.filter.call(document.querySelectorAll('#side-breakdown .history-row:not(.headers) .history-cell'), function (c) { return /\$73\.26/.test(c.textContent); })[0];
    var sp = sideC && sideC.querySelector('.st-cur-2');
    if (sp) { var sr = sp.getBoundingClientRect(), cr = sideC.getBoundingClientRect(); ok('Long vs Short, a narrow table: nothing cut off', sr.left >= cr.left - 0.5 && sr.right <= cr.right + 0.5 && sr.top >= cr.top - 0.5 && sr.bottom <= cr.bottom + 0.5, [Math.round(sr.width), Math.round(cr.width), Math.round(sr.height), Math.round(cr.height)]); }
    else ok('Long vs Short has the cell', false, !!sideC);
    var hb = document.getElementById('exc-heat');
    data.currentSeries[0].mt5Ticket = '1'; data.currentSeries[0]._excAt = 1; data.currentSeries[0]._maeR = 0.4; data.currentSeries[0]._mfeR = 1; data.currentSeries[0]._maePips = 2; data.currentSeries[0]._mfePips = 5; renderTradesStats(); await W(300); hb = document.getElementById('exc-heat');
    if (hb) { var hs = getComputedStyle(hb); ok('the excursions chart: a box of its own', parseFloat(hs.borderTopWidth) >= 1 && parseFloat(hs.borderRadius) >= 8 && parseFloat(hs.paddingLeft) >= 12, [hs.borderTopWidth, hs.borderRadius, hs.paddingLeft]); }
    var ofTab = function (el) { var pn = el && el.closest('[data-zpanel], [data-zk], .zc-panel, .zpane'); return pn; }, tgt = window.__SHOT_SIDE ? document.getElementById('side-breakdown') : hb;
    Array.prototype.forEach.call(document.querySelectorAll('#page-trades button, #page-trades [role=tab]'), function (x) { if (tgt && !tgt.offsetParent && /^(timing|trades|setups|strategy)$/i.test((x.textContent || '').trim())) { x.click(); } });
    await W(500); var order = ['Overview','Timing','Trades','Setups','Strategy']; for (var oi = 0; tgt && !tgt.offsetParent && oi < order.length; oi++) { var bb = Array.prototype.filter.call(document.querySelectorAll('#page-trades button, #page-trades [role=tab]'), function (x) { return (x.textContent || '').trim().toLowerCase() === order[oi].toLowerCase(); })[0]; if (bb) { bb.click(); await W(300); } }
    if (tgt) tgt.scrollIntoView({ block: 'center' }); await W(400);
    ok('(on screen for the picture)', !!(tgt && tgt.offsetParent));
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
