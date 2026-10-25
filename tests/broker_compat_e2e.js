// Other brokers than FTMO (25 Oct 2026, Nestor: "make sure that all of these that you are building works with other MT5 accounts from
// other brokers apart from FTMO ok?"). A stand-in EA plays another broker: its EUR/USD is EURUSD.r, gold is GOLD, the Nasdaq NAS100,
// a 3-digit USDJPY.r, a USD account. Checks the order rules' allowed symbols, the account's currency, Live Charts and the watchlist.
//   python tests/broker_compat_run.py
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB && window.__stRules && window.__stEA && window.__stSymAliases); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var P = window.__stPractice, LC = window.__stLC, R = window.__stRules, A = window.__stSymAliases, LG = '90001234';
    var cur = function () { return window.__stGetCurrency(); };

    // ---- 1. one market, every broker's name for it ----
    ok('GOLD and XAUUSD are one market', A('GOLD').indexOf('XAUUSD') >= 0 && A('XAUUSD').indexOf('GOLD') >= 0 && A('GOLD.r').indexOf('XAUUSD') >= 0, A('GOLD'));
    ok('NAS100, USTEC and US100.cash are one market', A('NAS100').indexOf('US100') >= 0 && A('USTEC').indexOf('NAS100') >= 0 && A('US100.cash').indexOf('USTEC') >= 0, A('NAS100'));
    ok('a pair with a suffix is the pair: EURUSD.r, EURUSDm, #EURUSD', A('EURUSD.r')[0] === 'EURUSD' && A('EURUSDm')[0] === 'EURUSD' && A('#EURUSD')[0] === 'EURUSD', [A('EURUSD.r'), A('EURUSDm'), A('#EURUSD')]);
    ok('names under 4 letters are left out (NQ, ES, CL would match other markets by their start)', A('US100').indexOf('NQ') < 0 && A('US500').indexOf('ES') < 0 && A('USOIL').indexOf('CL') < 0, [A('US500'), A('USOIL')]);

    // ---- 2. the order rules' allowed symbols, at a broker that names things its own way ----
    var acc0 = (data.accounts || [])[0] || {};
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-bc', name: 'Broker 10K', kind: 'personal', status: 'active', separate: false, startingBalance: 10000, balanceAtSetup: 10000,
      riskRules: { allowedSymbols: 'XAUUSD, US100, EURUSD' } }));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-bc' });
    data.activeAccountId = 'acc-bc';
    var accB = data.accounts.filter(function (a) { return a.id === 'acc-bc'; })[0];
    var allowed = function (s) { var r = R.check({ acct: 'acc-bc', symbol: s, riskMoney: 10 }); return !!(r && r.ok); };
    ok('allowed XAUUSD lets the broker\'s GOLD, GOLD.pro and XAUUSD.r through', allowed('GOLD') && allowed('GOLD.pro') && allowed('XAUUSD.r'), [allowed('GOLD'), allowed('GOLD.pro'), allowed('XAUUSD.r')]);
    ok('allowed US100 lets NAS100, USTEC and US100.cash through', allowed('NAS100') && allowed('USTEC') && allowed('US100.cash'), [allowed('NAS100'), allowed('USTEC'), allowed('US100.cash')]);
    ok('allowed EURUSD lets EURUSD.r, EURUSDm, EURUSD.pro and #EURUSD through', allowed('EURUSD.r') && allowed('EURUSDm') && allowed('EURUSD.pro') && allowed('#EURUSD'));
    ok('...and still refuses GBPUSD.r, USDJPY.r and ESP35', !allowed('GBPUSD.r') && !allowed('USDJPY.r') && !allowed('ESP35'), [allowed('GBPUSD.r'), allowed('USDJPY.r'), allowed('ESP35')]);
    var str = R._rulesStr(accB);
    ok('the rules the EA gets name every broker\'s spelling (the EA matches a symbol by its start, so suffixes pass there too)', /sy=[^;]*XAUUSD/.test(str) && /GOLD/.test(str) && /NAS100/.test(str) && /USTEC/.test(str) && /EURUSD/.test(str), str);
    accB.riskRules = {};   // off again for the live part

    // ---- 3. the MT5 account's own currency ----
    data.settings.currency = 'GBP'; delete data.settings.currencyPicked; delete data.settings._curAdoptedV1;
    window.__stEA.apply({ login: '90009999', symbol: 'EURUSD', settings: { currency: 'EUR' } });
    ok('an EA of another account (not the one picked) leaves the currency alone', cur() === 'GBP', cur());
    window.__stEA.apply({ login: LG, symbol: 'EURUSD.r', settings: { currency: 'USD' } });
    ok('the picked account\'s EA reports USD: money now reads in $', cur() === 'USD' && /\$/.test(fmtMoney(1234.5)) && !/£/.test(fmtMoney(1234.5)), [cur(), fmtMoney(1234.5)]);
    var sel = document.getElementById('currency-select');
    ok('...Settings shows USD too', !sel || sel.value === 'USD', sel && sel.value);
    window.__stEA.apply({ login: LG, symbol: 'EURUSD.r', settings: { currency: 'EUR' } });
    ok('...once only: a later report doesn\'t change it again', cur() === 'USD', cur());
    if (sel) { sel.value = 'GBP'; sel.dispatchEvent(new Event('change')); }
    delete data.settings._curAdoptedV1;
    window.__stEA.apply({ login: LG, symbol: 'EURUSD.r', settings: { currency: 'USD' } });
    ok('a currency picked by hand in Settings stays the member\'s', cur() === 'GBP' && data.settings.currencyPicked === true, [cur(), data.settings.currencyPicked]);
    data.settings.currency = 'GBP'; delete data.settings.currencyPicked; delete data.settings._curAdoptedV1;   // fresh for the live part

    // ---- 4. Live Charts on the other broker ----
    var T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000;
    P._lvClock(T0 * 1000 - Date.now());
    window.isSessionLive = function () { return true; };
    window.__stKeepOff = true;
    window.__stLcForce = true; await W(1200);
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); });
    window.STCloud.syncToken = '__TOK__';
    if ('__RELAY__'.indexOf('ws') === 0) window.__stRelayURL = '__RELAY__';
    var C = P._cfg(); C.layout = 1; C.tfs = [15, 60, 240, 5]; C.syms = []; C.mini = false; C.resume = null; C.sym = 'EURUSD';
    C.wl = ['EURUSD.r', 'GOLD', 'NAS100', 'USDJPY.r'];
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 160 && !(P._s() && P._s().live && LC.state().fresh); k++) await W(150);
    var s0 = P._s();
    ok('Live Charts asked for EURUSD runs on the broker\'s EURUSD.r (its EA streams it and takes its orders)', s0 && s0.live && s0.sym && s0.sym.key === 'EURUSD' && s0.sym.cls === 'fx' && s0.ea && s0.ea.raw === 'EURUSD.r' && s0.px && s0.px.b > 0,
      s0 && s0.sym && [s0.sym.raw, s0.sym.key, s0.sym.cls, s0.ea && s0.ea.raw]);
    for (k = 0; k < 60 && cur() !== 'USD'; k++) await W(150);
    ok('its account reports USD: the app\'s money turns to $ without anyone picking it', cur() === 'USD', cur());
    await W(1500);
    var bal = document.querySelector('.pl-ab2 b');
    ok('...the platform\'s Balance reads in $', !bal || /^\$/.test(bal.textContent.replace(/^−/, '')), bal && bal.textContent);
    var mm = document.getElementById('stpr-mm'), mmT = mm ? mm.textContent : '';
    ok('...the Trade Manager\'s amount reads $, never £', !mm || (mmT.indexOf('£') < 0), mmT.slice(0, 160));
    await W(2500);   // the watchlist's prices (the hub)
    var q = P._wl().q || {};
    var gq = q.GOLD, jq = q['USDJPY.r'], nq = q.NAS100;
    ok('the watchlist prices the broker\'s own names: GOLD, NAS100, USDJPY.r', gq && gq.b > 0 && nq && nq.b > 0 && jq && jq.b > 0, Object.keys(q));
    ok('...each at its own digits (gold 2, the Nasdaq 1, the yen 3)', gq && gq.dg === 2 && nq && nq.dg === 1 && jq && jq.dg === 3, [gq && gq.dg, nq && nq.dg, jq && jq.dg]);
    P._wlSearch('XAUUSD');
    for (k = 0; k < 40 && !((P._wlSug().sug || []).some(function (x) { return String(x.raw || x.name || x).toUpperCase().indexOf('GOLD') === 0; })); k++) await W(150);
    var sug = P._wlSug();
    ok('typing XAUUSD finds the broker\'s GOLD (the search asks for its other names too)', (sug.qs || []).indexOf('GOLD') >= 0 && (sug.sug || []).some(function (x) { return String(x.raw || x.name || x).toUpperCase().indexOf('GOLD') === 0; }), { qs: sug.qs, sug: (sug.sug || []).slice(0, 6) });
    P._goLive('GOLD');
    for (k = 0; k < 120 && !(P._s() && P._s().sym && P._s().sym.raw === 'GOLD' && P._s().px && P._s().px.b > 0); k++) await W(100);
    var s1 = P._s();
    ok('GOLD opens, live, read as gold (metal, XAUUSD)', s1 && s1.sym.raw === 'GOLD' && s1.px && s1.px.b > 0 && s1.sym.key === 'XAUUSD' && s1.sym.cls === 'metal', s1 && [s1.sym.raw, s1.sym.key, s1.sym.cls, s1.px && s1.px.b]);
    P._goLive('NAS100');
    for (k = 0; k < 120 && !(P._s() && P._s().sym && P._s().sym.raw === 'NAS100' && P._s().px && P._s().px.b > 0); k++) await W(100);
    var s2 = P._s();
    ok('NAS100 opens, live, read as the Nasdaq (an index, counted in points)', s2 && s2.sym.raw === 'NAS100' && s2.px && s2.px.b > 0 && s2.sym.key === 'NQ' && s2.sym.cls === 'index', s2 && [s2.sym.raw, s2.sym.key, s2.sym.cls]);
    accB.riskRules = { allowedSymbols: 'US100' }; try { window.dispatchEvent(new CustomEvent('st-rules-change')); } catch (e) {}
    var rN = R.check({ acct: 'acc-bc', login: LG, symbol: 'NAS100', riskMoney: 10 }), rE = R.check({ acct: 'acc-bc', login: LG, symbol: 'EURUSD.r', riskMoney: 10 });
    ok('allowed "US100": an order on the broker\'s NAS100 passes, on EURUSD.r it is refused with the reason', rN && rN.ok && rE && !rE.ok && /allowed symbols/.test(rE.why || ''), [rN, rE]);
    accB.riskRules = {};
    ok('no page errors', errs.length === 0, errs.slice(0, 5));
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
