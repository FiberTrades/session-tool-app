// Deleted trades: a trade deleted from the Trade Log goes to Deleted trades, whole, and Put back returns it as it was.
//   python tests/browser_test.py tests/logdelete_e2e.js
// Headless Edge, throwaway profile, signed out: nothing live is read or written. The broker row comes from a stand-in
// for the cloud inbox that, like the real one, marks a row consumed once it has been imported.
// Nestor, 15 Oct 2026: "if i delete a trade of the trade log, now i cant resync it or find it in deleted trades?" - the
// Session Review kept its copy of the trade (with the broker ticket), so the app thought it was still logged: it was
// neither offered again nor listed anywhere.
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  var TK = '9002001';
  function ours(t) { return t && String(t.mt5Ticket) === TK; }
  function logN() { return getAllLifetimeTrades().filter(ours).length; }
  function reviewN() { return allReviewTrades(false).filter(ours).length; }
  function binN() { return (data.deletedTrades || []).length; }
  async function delFromLog(id) {
    openEditTradeModal(id); await W(300);
    document.getElementById('edit-trade-delete').click(); await W(300);
    document.getElementById('settings-confirm-ok').click(); await W(600);
  }
  async function openLog() {
    var tab = document.querySelector('.tab[data-page="tradeview"]'); if (tab) tab.click(); await W(600);
    if (document.getElementById('alltrades-panel').classList.contains('atl-collapsed')) document.getElementById('alltrades-toggle').click();
    renderAllTrades(); await W(100);
    var tg = document.querySelector('#atl-bin .atl-bin-tg');
    if (tg && tg.getAttribute('aria-expanded') !== 'true') { tg.click(); await W(100); }
  }
  var purged = [];
  window.__stDeleteChart = function (u) { purged.push(u); return Promise.resolve(); };
  try {
    var mk = function (id, name, sb) { return { id: id, name: name, status: 'active', kind: 'personal', accountType: 'personal', startingBalance: sb, current: sb, createdAt: '2026-01-01T00:00:00Z', riskRules: {} }; };
    data.accounts = [mk('acc_a', 'Main', 10000)]; data.activeAccountId = 'acc_a'; data.viewScope = 'lifetime';
    data.mt5LoginMap = { '541419576': 'acc_a' };
    data.currentSeries = []; data.history = []; data.mt5ImportedTickets = []; data.mt5UserDismissed = []; data.mt5ForceOffer = [];
    data.mt5Ignored = []; data.mt5IgnoreLifted = []; data.nudgeLog = {}; data.deletedTrades = [];
    (data.reviewSlots || []).forEach(function (r) { if (r) r.trades = []; });
    data.review.trades = []; data.review.traded = 'Yes';
    var old = new Date(); old.setDate(old.getDate() - 20);
    var CH = 'https://x.supabase.co/storage/v1/object/public/chart-shots/u/hand.png';
    data.currentSeries.push({ id: 'hand1', date: old.toISOString(), symbol: 'GBP/USD', result: 'Win', r: 2, risk: 100, sl: 5, accountId: 'acc_a',
      notes: 'my hand-logged notes', tvLinks: [{ url: CH, notes: '' }] });

    var d0 = new Date(); d0.setDate(d0.getDate() - 1); d0.setHours(9, 5, 0, 0);
    var t0 = d0.getTime(), iso = function (ms) { return new Date(ms).toISOString(); };
    var row = { ticket: +TK, login: 541419576, symbol: 'EURUSD', direction: 'buy', lots: 2.5, entry_price: 1.1, exit_price: 1.0996,
      pnl: -100, risk_gbp: 100, sl_pips: 4, tp_pips: 20, dist_unit: 'pips', unit_size: 0.0001, open_time: iso(t0), close_time: iso(t0 + 1500e3), consumed_at: null };
    window.STCloud.pullInbox = function () { return Promise.resolve({ data: [Object.assign({}, row)] }); };
    window.STCloud.pullPostMortem = function () { return Promise.resolve({ data: [] }); };
    window.STCloud.deleteInbox = function () { row.consumed_at = new Date().toISOString(); return Promise.resolve({}); };

    // 1. import it through the real buttons, then save the review (that is how it reaches the Trade Log)
    document.getElementById('mt5-import-btn').click(); await W(300);
    document.getElementById('mt5-autosync-btn').click(); await W(1000);
    var df = document.getElementById('mt5-date-filter');
    if (df && Array.prototype.some.call(df.options, function (o) { return o.value === '__all__'; })) { df.value = '__all__'; df.dispatchEvent(new Event('change')); await W(200); }
    _mt5SelectedIds = new Set([TK]);
    document.getElementById('mt5-import-confirm').click(); await W(800);
    try { document.getElementById('mt5-modal-bg').classList.remove('show'); } catch (e) {}
    allReviewTrades(false).filter(ours).forEach(function (x) { x.setup = 'My setup'; });
    await performReviewSave({ skipBackupModal: true }); await W(500);
    var tr = getAllLifetimeTrades().filter(ours)[0];
    check('set-up: the synced trade is in the Trade Log and its review', !!tr && logN() === 1 && reviewN() === 1, [logN(), reviewN()]);
    var id = tr && tr.id;

    // 2. delete it from the Trade Log
    await delFromLog(id);
    check('deleted: gone from the Trade Log and from the review', logN() === 0 && reviewN() === 0, [logN(), reviewN()]);
    var e = (data.deletedTrades || [])[0];
    check('...and kept whole in Deleted trades (its setup and ticket)', binN() === 1 && e && e.id === id && e.trade.setup === 'My setup' && String(e.trade.mt5Ticket) === TK && e.review.length === 1, e && { id: e.id, setup: e.trade.setup, rv: e.review.length });

    // 3. it can be found: under All Trades History, and in the import window's deleted list - and it is not "missing"
    await openLog();
    var put = document.querySelector('#atl-bin [data-bin-put="' + id + '"]');
    check('All Trades History lists it under "1 deleted trade" with Put back', !!put && /1 deleted trade/.test(document.querySelector('#atl-bin .atl-bin-tg').textContent), document.getElementById('atl-bin').textContent.slice(0, 120));
    document.getElementById('mt5-import-btn').click(); await W(300);
    window.__stMt5ScanExcluded(); await W(800);
    var dl = document.getElementById('mt5-deleted-list');
    check('the import window\'s Deleted trades lists it too', !!(dl && dl.querySelector('[data-bin-put="' + id + '"]')) && /1 deleted trade/.test(document.getElementById('mt5-deleted-label').textContent), document.getElementById('mt5-deleted-label').textContent);
    check('...and it is not reported as a broker trade missing from the journal', window.__stMt5ExcDiag().listed === 0, window.__stMt5ExcDiag().listed);
    try { document.getElementById('mt5-modal-bg').classList.remove('show'); } catch (e2) {}

    // 4. Put back (from All Trades History): back exactly as it was, review copy too, no duplicate
    await openLog();
    document.querySelector('#atl-bin [data-bin-put="' + id + '"]').click(); await W(400);
    var back = getAllLifetimeTrades().filter(ours)[0];
    check('Put back: the same trade is back in the Trade Log, setup and all', logN() === 1 && back && back.id === id && back.setup === 'My setup', back && { id: back.id, setup: back.setup });
    check('...its review copy is back in the review', reviewN() === 1, reviewN());
    check('...Deleted trades is empty and hidden', binN() === 0 && document.getElementById('atl-bin').hidden, binN());
    await performReviewSave({ skipBackupModal: true }); await W(400);
    check('saving the review afterwards makes no duplicate', logN() === 1, logN());

    // 5. Put back from the import window's list
    await delFromLog(id);
    document.getElementById('mt5-import-btn').click(); await W(300);
    window.__stMt5ScanExcluded(); await W(800);
    document.getElementById('mt5-deleted-list').querySelector('[data-bin-put="' + id + '"]').click(); await W(400);
    check('Put back from the import window works the same', logN() === 1 && reviewN() === 1 && binN() === 0, [logN(), reviewN(), binN()]);
    try { document.getElementById('mt5-modal-bg').classList.remove('show'); } catch (e3) {}

    // 6. Undo on the bar still undoes the delete
    await delFromLog(id);
    var ub = document.querySelector('#toast button, #toast .toast-undo, #toast [data-undo]');
    if (ub) { ub.click(); await W(400); }
    check('Undo on the "Trade deleted" bar brings it back and empties Deleted trades', !!ub && logN() === 1 && binN() === 0, [!!ub, logN(), binN()]);

    // 7. a hand-logged trade: charts kept while it is in Deleted trades, removed only with Delete for good
    await delFromLog('hand1'); await W(12600);
    check('a hand-logged trade goes to Deleted trades too, and its chart is NOT wiped after 12 s', binN() === 1 && purged.length === 0, { bin: binN(), purged: purged });
    await openLog();
    document.querySelector('#atl-bin [data-bin-drop="hand1"]').click(); await W(300);
    document.getElementById('settings-confirm-cancel').click(); await W(200);
    check('Delete for good asks first (cancel keeps it)', binN() === 1, binN());
    document.querySelector('#atl-bin [data-bin-drop="hand1"]').click(); await W(300);
    document.getElementById('settings-confirm-ok').click(); await W(400);
    check('Delete for good removes it and its chart', binN() === 0 && purged.length === 1 && purged[0] === CH, { bin: binN(), purged: purged });
    check('nothing else changed: the synced trade is still logged', logN() === 1, logN());

    // 9. the × in the Session Review's Trade Log: off the review only, into Deleted trades, Put back returns it there
    renderTrades(); await W(200);
    var rmBtn = document.querySelector('.trade-remove');
    rmBtn.click(); await W(400);
    var re = (data.deletedTrades || []).filter(function (x) { return x.from === 'review'; })[0];
    check('×: off the review, still in All Trades History, waiting in Deleted trades', reviewN() === 0 && logN() === 1 && !!re, [reviewN(), logN(), !!re]);
    await openLog();
    check('...listed as "removed from the review" with Put back', /removed from the review/.test(document.getElementById('atl-bin').textContent) && !!document.querySelector('#atl-bin [data-bin-put="' + (re && re.id) + '"]'), document.getElementById('atl-bin').textContent.slice(0, 160));
    document.querySelector('#atl-bin [data-bin-put="' + re.id + '"]').click(); await W(400);
    check('...Put back returns it to the review (still logged once)', reviewN() === 1 && logN() === 1 && binN() === 0, [reviewN(), logN(), binN()]);
    renderTrades(); await W(200);
    document.querySelector('.trade-remove').click(); await W(300);
    var ub2 = document.querySelector('#toast button'); if (ub2) { ub2.click(); await W(300); }
    check('...the ×\'s Undo puts it back and leaves nothing in Deleted trades', reviewN() === 1 && binN() === 0, [reviewN(), binN()]);

    // 10. a trade taken off the review BEFORE Deleted trades existed (no entry): Auto-sync brings it back, linked, details kept
    var lg = getAllLifetimeTrades().filter(ours)[0]; lg.setup = 'Kept setup'; lg.reviewSnap = Object.assign({}, lg.reviewSnap || {}, { reflection: 'kept reflection' });
    data.review.trades = data.review.trades.filter(function (x) { return !ours(x); }); saveData();
    check('set-up: logged, not in the review, not in Deleted trades', logN() === 1 && reviewN() === 0 && binN() === 0, [logN(), reviewN(), binN()]);
    document.getElementById('mt5-import-btn').click(); await W(300);
    document.getElementById('mt5-autosync-btn').click(); await W(1200);
    var offered = (_mt5ParsedTrades || []).some(function (p) { return String(p.position) === TK; });
    check('Auto-sync offers it again for the review', offered, (_mt5ParsedTrades || []).map(function (p) { return p.position; }));
    if (offered) {
      var df2 = document.getElementById('mt5-date-filter');
      if (df2 && Array.prototype.some.call(df2.options, function (o) { return o.value === '__all__'; })) { df2.value = '__all__'; df2.dispatchEvent(new Event('change')); await W(200); }
      _mt5SelectedIds = new Set([TK]);
      document.getElementById('mt5-import-confirm').click(); await W(800);
    }
    try { document.getElementById('mt5-modal-bg').classList.remove('show'); } catch (e4) {}
    var rt = allReviewTrades(false).filter(ours)[0];
    check('...back in the review, linked to the logged trade, with its setup and review answers', !!rt && rt.seriesId === lg.id && rt.setup === 'Kept setup' && rt.reflection === 'kept reflection', rt && { seriesId: rt.seriesId, lg: lg.id, setup: rt.setup, refl: rt.reflection });
    await performReviewSave({ skipBackupModal: true }); await W(400);
    var lg2 = getAllLifetimeTrades().filter(ours);
    check('...saving the review keeps ONE logged trade, details intact', lg2.length === 1 && lg2[0].setup === 'Kept setup' && lg2[0].reviewSnap && lg2[0].reviewSnap.reflection === 'kept reflection', lg2.map(function (x) { return { id: x.id, setup: x.setup, refl: x.reviewSnap && x.reviewSnap.reflection }; }));
    document.getElementById('mt5-import-btn').click(); await W(300);
    document.getElementById('mt5-autosync-btn').click(); await W(1200);
    var st2 = (document.getElementById('mt5-autosync-status') || {}).textContent || '';
    check('...and it is not offered a second time', /already in your log/i.test(st2), st2);
    try { document.getElementById('mt5-modal-bg').classList.remove('show'); } catch (e5) {}

    // 8. Spanish
    setLanguage('es'); await W(100);
    await delFromLog(id); await openLog();
    check('in Spanish: "1 operación eliminada" and Recuperar', /1 operación eliminada/.test(document.getElementById('atl-bin').textContent) && /Recuperar/.test(document.getElementById('atl-bin').textContent), document.getElementById('atl-bin').textContent.slice(0, 160));
    setLanguage('en'); await W(100);
  } catch (err) {
    check('the test ran to the end', false, (err && err.message) + ' @ ' + String((err && err.stack) || '').split('\n')[1]);
  }
  return JSON.stringify(results);
})()
