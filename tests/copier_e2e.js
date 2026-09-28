// End-to-end test: ONE trade copied to two accounts by the EA's Trade Copier, through the real app.
//   python tests/browser_test.py tests/copier_e2e.js
// Headless Edge, throwaway profile, signed out: nothing live is read or written. The two broker rows come from a
// stand-in for the cloud inbox; Community posting is a stand-in that records the text.
// The rule it checks (Nestor, 28-29 Sep 2026): a copied idea takes ONE spot and its review is written once, but
// every number counts every copy; each challenge keeps its own trades; "enough data" and streaks count decisions.
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  function plain(s) { return String(s || '').replace(/<[^>]+>/g, '').replace(/\u001b\[[0-9;]*m/g, '').replace(/[ \t]+/g, ' ').trim(); }
  function dayKey(d) { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  var TK = ['9001001', '9001002'];
  function ours(t) { return t && TK.indexOf(String(t.mt5Ticket)) >= 0; }
  try {
    // ---------------------------------------------------------------- 0. the page itself
    var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
    doc.querySelectorAll('script:not([src])').forEach(function (s, i) {
      var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return;
      try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); }
    });
    check('every inline script parses', bad.length === 0, bad);

    // ---------------------------------------------------------------- 1. two FTMO challenges, a third account open
    var mk = function (id, name, sb) { return { id: id, name: name, status: 'active', kind: 'challenge', accountType: 'prop', startingBalance: sb, current: sb, createdAt: '2026-01-01T00:00:00Z', riskRules: {} }; };
    data.accounts = [mk('acc_70', 'FTMO 70K', 70000), mk('acc_10', 'FTMO 10K', 10000), mk('acc_other', 'Other', 5000)];
    data.activeAccountId = 'acc_other';   // a DIFFERENT account is open: nothing may land on it
    data.viewScope = 'lifetime';
    data.mt5LoginMap = { '541419576': 'acc_70', '1514778904': 'acc_10' };   // remembered from earlier imports
    data.currentSeries = []; data.history = []; data.mt5ImportedTickets = []; data.nudgeLog = {};
    (data.reviewSlots || []).forEach(function (r) { if (r) r.trades = []; });
    data.review.trades = []; data.review.traded = 'Yes';

    // ---------------------------------------------------------------- 2. import: the real Auto-sync button
    var d0 = new Date(); d0.setDate(d0.getDate() - 1); d0.setHours(9, 5, 0, 0);
    var t0 = d0.getTime(), iso = function (ms) { return new Date(ms).toISOString(); };
    var rows = [   // the Lead's trade and its copy 0.9 s later, as the EA sends them
      { ticket: 9001001, login: 541419576, symbol: 'EURUSD', direction: 'buy', lots: 12.5, entry_price: 1.10000, exit_price: 1.09960,
        pnl: -500, risk_gbp: 500, sl_pips: 4, tp_pips: 20, dist_unit: 'pips', unit_size: 0.0001, open_time: iso(t0), close_time: iso(t0 + 1500e3) },
      { ticket: 9001002, login: 1514778904, symbol: 'EURUSD.r', direction: 'buy', lots: 1.75, entry_price: 1.10000, exit_price: 1.09960,
        pnl: -70, risk_gbp: 70, sl_pips: 4, tp_pips: 20, dist_unit: 'pips', unit_size: 0.0001, open_time: iso(t0 + 900), close_time: iso(t0 + 1500e3) }];
    window.STCloud.pullInbox = function () { return Promise.resolve({ data: rows }); };
    window.STCloud.pullPostMortem = function () { return Promise.resolve({ data: [] }); };
    document.getElementById('mt5-import-btn').click(); await W(300);
    document.getElementById('mt5-autosync-btn').click(); await W(1000);
    var lt = document.getElementById('mt5-login-targets');
    var sels = lt ? Array.prototype.map.call(lt.querySelectorAll('select[data-login]'), function (s) { return s.getAttribute('data-login') + '=' + s.value; }) : [];
    check('import: one account picker per MT5 login', sels.length === 2, sels);
    check('import: each login pre-set to its remembered account', sels.join(',') === '541419576=acc_70,1514778904=acc_10', sels);
    var df = document.getElementById('mt5-date-filter');
    if (df && Array.prototype.some.call(df.options, function (o) { return o.value === '__all__'; })) { df.value = '__all__'; df.dispatchEvent(new Event('change')); await W(200); }
    _mt5SelectedIds = new Set(TK);
    document.getElementById('mt5-import-confirm').click(); await W(800);
    var rv = allReviewTrades(false).filter(ours);
    var lead = rv.filter(function (t) { return String(t.mt5Ticket) === TK[0]; })[0] || {};
    var copy = rv.filter(function (t) { return String(t.mt5Ticket) === TK[1]; })[0] || {};
    check('import: both trades in the Trade Log', rv.length === 2, rv.length);
    check('import: each trade on its own account', lead.accountId === 'acc_70' && copy.accountId === 'acc_10', [lead.accountId, copy.accountId]);
    check('import: the two are marked as one idea', !!lead.ideaId && lead.ideaId === copy.ideaId, [lead.ideaId, copy.ideaId]);
    check('import: the copy keeps its broker symbol', copy.mt5Symbol === 'EURUSD.r', copy.mt5Symbol);

    // ---------------------------------------------------------------- 3. the review is filled once
    _activeReviewTradeIdx = data.review.trades.indexOf(lead);
    lead.execution = 'Flawless'; lead.setup = 'E2E setup'; lead.concepts = ['Sweep']; saveData();
    check('review: answers on the Lead fill the copy', copy.execution === 'Flawless' && copy.setup === 'E2E setup' && (copy.concepts || []).join() === 'Sweep',
      [copy.execution, copy.setup, copy.concepts]);
    copy.reflection = 'written on the copy'; saveData();
    check('review: an answer written on the copy fills the Lead', lead.reflection === 'written on the copy', lead.reflection);

    // ---------------------------------------------------------------- 4. Community review post
    var msg = plain(buildReviewMessage());
    var lines = msg.split('\n');
    var tradeLines = lines.filter(function (l) { return /^\S*\s*\d+\.\s/.test(l.trim()) || /^\d+\./.test(l.trim()); });
    check('review post: "1 execution, 2 trades - copied to 2 accounts"', /1 execution, 2 trades - copied to 2 accounts/.test(msg), lines.filter(function (l) { return /Traded/.test(l); }));
    check('review post: the trade is written once, "(2 accounts)"', (msg.match(/\(2 accounts\)/g) || []).length === 1, tradeLines);
    check('review post: Losses 2', /Losses:\s+2\b/.test(msg), lines.filter(function (l) { return /Losses/.test(l); }));
    check('review post: Net R -2.00R and both accounts’ % (-1.41%)', /-2\.00R \| -1\.41%/.test(msg), lines.filter(function (l) { return /Net R/.test(l); }));

    // ---------------------------------------------------------------- 5. save to the Series of 10
    await performReviewSave({ skipBackupModal: true }); await W(300);
    var saved = getAllLifetimeTrades().filter(ours);
    var sLead = saved.filter(function (t) { return String(t.mt5Ticket) === TK[0]; })[0] || {};
    var sCopy = saved.filter(function (t) { return String(t.mt5Ticket) === TK[1]; })[0] || {};
    check('save: both trades saved', saved.length === 2, saved.length);
    check('save: each keeps its own account, not the one open', sLead.accountId === 'acc_70' && sCopy.accountId === 'acc_10', [sLead.accountId, sCopy.accountId]);
    check('save: both keep the idea and the answers', saved.every(function (t) { return t.ideaId === lead.ideaId && t.reviewSnap && t.reviewSnap.execution === 'Flawless' && t.setup === 'E2E setup'; }),
      saved.map(function (t) { return [t.ideaId, t.reviewSnap && t.reviewSnap.execution, t.setup]; }));

    // ---------------------------------------------------------------- 6. Series of 10, All accounts
    data.viewScope = 'lifetime';
    var cs = getScopedSeries().currentSeries;
    check('series: 2 trades take 1 spot', cs.length === 2 && _ideaMerge(cs).length === 1, [cs.length, _ideaMerge(cs).length]);
    var st = calcSeriesStats(cs);
    check('series: both losses count', st.l === 2, st);
    var money = cs.reduce(function (a, t) { return a + tradeNetPL(t); }, 0);
    check('series: money of both accounts (-570)', Math.round(money) === -570, money);
    var greet = plain(_seriesGreetingHTML());
    check('series greeting: "copied to 2 accounts"', /copied to 2 accounts/.test(greet), greet.slice(0, 200));
    data.viewScope = 'acc_10';
    var s10 = getScopedSeries().currentSeries;
    data.viewScope = 'lifetime';
    check('series: the 10K’s own view shows only its own trade', s10.length === 1 && s10[0].accountId === 'acc_10', s10.map(function (t) { return t.accountId; }));

    // ---------------------------------------------------------------- 7. Prop Firm Progress: each challenge its own
    var a70 = window.__stAccountStats(data.accounts[0]) || {}, a10 = window.__stAccountStats(data.accounts[1]) || {};
    check('prop progress: 70K at 69,500', Math.round(a70.current) === 69500, a70.current);
    check('prop progress: 10K at 9,930', Math.round(a10.current) === 9930, a10.current);

    // ---------------------------------------------------------------- 8. Statistics and trade lists
    check('enough data: 2 trades are 1 decision', _ideaCount(getAllLifetimeTrades()) === 1, _ideaCount(getAllLifetimeTrades()));
    renderTradesStats();
    var mls = (document.getElementById('stat-max-losses') || {}).textContent;
    check('stats: Max Loss Streak counts the copied loss once', String(mls).trim() === '1', mls);
    _allTradesCollapsed = false; renderAllTrades();
    var tagged = Array.prototype.filter.call(document.querySelectorAll('#alltrades-table .atl-row[data-id]'), function (r) {
      var c = r.querySelector('.atl-c-date'); return c && /\bcopy\b/.test(c.textContent); }).map(function (r) { return r.getAttribute('data-id'); });
    check('All Trades History: only the copy row says "copy"', tagged.length === 1 && tagged[0] === sCopy.id, tagged);
    openDayModal(new Date(sLead.date).toDateString());
    var dayRows = Array.prototype.map.call(document.querySelectorAll('#modal-trades .modal-trade-row[data-id]'), function (r) { return [r.getAttribute('data-id'), /\bcopy\b/.test(r.textContent)]; });
    check('Calendar day window: only the copy row says "copy"', dayRows.length === 2 && dayRows.filter(function (x) { return x[1]; }).length === 1 && dayRows.some(function (x) { return x[1] && x[0] === sCopy.id; }), dayRows);
    try { document.getElementById('day-modal-bg').classList.remove('show'); document.getElementById('day-modal-bg').style.display = 'none'; } catch (e) {}

    // ---------------------------------------------------------------- 9. nudge history: once, with both accounts' money
    var dk = dayKey(sLead.date);
    data.nudgeLog = {}; data.nudgeLog[dk] = {}; data.nudgeLog[dk]['risk:' + TK[0]] = { at: '09:05' };
    var ps = __stNudge.periodStats(dk, dk);
    check('nudge history: the nudged trade counts once, with both accounts’ money', ps.into.n === 1 && Math.round(ps.into.net) === -570, ps.into);
    data.nudgeLog = {};

    // ---------------------------------------------------------------- 10. Series of 10 post
    var fill = [];
    for (var i = 0; i < 9; i++) {   // nine older ordinary trades on the 70K: with the copied idea, ten ideas
      var d = new Date(d0.getTime() - (i + 2) * 864e5), win = i % 2 === 0;
      fill.push(Object.assign(newTradeBlank(), { id: genId(), date: d.toISOString(), accountId: 'acc_70', symbol: 'EURUSD', side: 'Long',
        result: win ? 'Win' : 'Lose', r: win ? '2' : '5', risk: '500', sl: '4', costs: '0', actualGross: win ? 1000 : -500, pips: win ? 8 : 20, entryTime: '09:05', exitTime: '09:30' }));
    }
    data.currentSeries = data.currentSeries.concat(fill);
    rebuildSeriesByDate();
    var h0 = (data.history || [])[0];
    check('series of 10: 11 trades fill the ten spots', !!h0 && h0.trades.length === 11 && _ideaMerge(h0.trades).length === 10,
      h0 ? [h0.trades.length, _ideaMerge(h0.trades).length] : null);
    var posted = null;
    window.STCommunity = window.STCommunity || {};
    window.STCommunity.postToChannel = function (ch, en, es) { posted = { ch: ch, en: en, es: es }; return Promise.resolve({ id: 'e2e' }); };
    var shareBtn = document.getElementById('series-share-confirm');
    if (shareBtn) { shareBtn.classList.remove('is-posted'); shareBtn.click(); await W(300); }
    var pe = plain(posted && posted.en);
    check('series post: "Trades: 10 (11 across accounts)"', /Trades:\s+10 \(11 across accounts\)/.test(pe), pe.split('\n').filter(function (l) { return /Trades/.test(l); }));
    check('series post: Losses count every copy (6)', /Losses:\s+6\b/.test(pe), pe.split('\n').filter(function (l) { return /Losses/.test(l); }));
  } catch (e) {
    check('the test ran to the end', false, (e && e.message) + ' @ ' + String((e && e.stack) || '').split('\n')[1]);
  }
  return JSON.stringify(results);
})()
