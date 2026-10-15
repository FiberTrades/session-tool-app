// Deleting an account answers its broker trades: nothing it closed is offered again or listed as missing.
//   python tests/browser_test.py tests/accdelete_e2e.js
// Headless Edge, throwaway profile, signed out: nothing live is read or written; the cloud inbox is a stand-in.
// Nestor, 15 Oct 2026: "when i deleted my 2 archived accounts the app said i had 4 trades to sync? and them i said import and
// only 2 appeared? and then i checked them as synced already and now they are gone".
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    var mk = function (id, name) { return { id: id, name: name, status: 'active', kind: 'challenge', accountType: 'prop', startingBalance: 10000, current: 10000, createdAt: '2026-01-01T00:00:00Z', riskRules: {} }; };
    data.accounts = [mk('acc_keep', 'Keep 70K'), mk('acc_gone', 'Old 10K')]; data.activeAccountId = 'acc_keep'; data.viewScope = 'lifetime';
    data.mt5LoginMap = { '111': 'acc_keep', '222': 'acc_gone' };
    data.mt5ImportedTickets = []; data.mt5UserDismissed = []; data.mt5ForceOffer = []; data.mt5Ignored = []; data.mt5IgnoreLifted = []; data.mt5GoneLogins = {};
    (data.reviewSlots || []).forEach(function (r) { if (r) r.trades = []; }); data.review.trades = [];
    var day = function (n) { var d = new Date(); d.setDate(d.getDate() - n); d.setHours(9, 0, 0, 0); return d; };
    data.history = [];
    data.currentSeries = [
      { id: 'tk', date: day(5).toISOString(), symbol: 'EURUSD', result: 'Win', r: 2, risk: 100, sl: 5, accountId: 'acc_keep', mt5Ticket: '9300002' },
      { id: 'tg', date: day(4).toISOString(), symbol: 'EURUSD', result: 'Lose', r: 2, risk: 100, sl: 5, accountId: 'acc_gone', mt5Ticket: '9300001' }];
    var row = function (tk, login, d, consumed) { return { ticket: tk, login: login, symbol: 'EURUSD', direction: 'buy', lots: 1, entry_price: 1.1, exit_price: 1.1005, pnl: 50, risk_gbp: 100, sl_pips: 5, tp_pips: 10,
      dist_unit: 'pips', unit_size: 0.0001, open_time: new Date(d.getTime() - 600e3).toISOString(), close_time: d.toISOString(), consumed_at: consumed ? d.toISOString() : null }; };
    var inbox = [row(9300002, 111, day(5), true), row(9300001, 222, day(4), true), row(9300003, 222, day(3), false)];
    window.STCloud.pullInbox = function () { return Promise.resolve({ data: inbox.map(function (x) { return Object.assign({}, x); }) }); };
    window.STCloud.pullPostMortem = function () { return Promise.resolve({ data: [] }); };
    var offered = async function () {
      _mt5ParsedTrades = [];
      document.getElementById('mt5-import-btn').click(); await W(300);
      document.getElementById('mt5-autosync-btn').click(); await W(1200);
      var o = (_mt5ParsedTrades || []).map(function (p) { return String(p.position); });
      try { document.getElementById('mt5-modal-bg').classList.remove('show'); } catch (e) {}
      return o;
    };
    var before = await offered();
    check('set-up: the old account has a broker trade never imported (9300003), and it is offered', before.indexOf('9300003') >= 0, before);

    deleteAccount('acc_gone'); await W(200);
    check('deleting the account removes it and its trade', !data.accounts.some(function (a) { return a.id === 'acc_gone'; }) && !getAllLifetimeTrades().some(function (t) { return t.accountId === 'acc_gone'; }));
    check('...remembers its MT5 login as gone and drops it from the login map', !!(data.mt5GoneLogins || {})['222'] && !('222' in (data.mt5LoginMap || {})) && data.mt5LoginMap['111'] === 'acc_keep', { gone: data.mt5GoneLogins, map: data.mt5LoginMap });
    check('...and puts its trade\'s ticket on the handled lists', (data.mt5UserDismissed || []).map(String).indexOf('9300001') >= 0, data.mt5UserDismissed);

    var after = await offered();
    check('after deleting: nothing from that account is offered to sync', after.indexOf('9300003') < 0 && after.indexOf('9300001') < 0, after);
    window.__stMt5ScanExcluded(); await W(800);
    check('...and nothing from it is listed as a broker trade missing from your journal', window.__stMt5ExcDiag().listed === 0, window.__stMt5ExcDiag().listed);
    check('the other account is untouched', getAllLifetimeTrades().some(function (t) { return t.mt5Ticket === '9300002'; }));

    // a trade that login closes AFTER the deletion is still offered
    var later = new Date(Date.now() + 60e3);
    inbox.push(row(9300004, 222, later, false));
    var after2 = await offered();
    check('a trade that login closes after the deletion is still offered', after2.indexOf('9300004') >= 0 && after2.indexOf('9300003') < 0, after2);
  } catch (err) {
    check('the test ran to the end', false, (err && err.message) + ' @ ' + String((err && err.stack) || '').split('\n')[1]);
  }
  return JSON.stringify(results);
})()
