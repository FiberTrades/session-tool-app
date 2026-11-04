// End-to-end test (Nestor, 4 Nov 2026: "why would it ever be wrong if the data is being pulled from the cloud?"; "the account size started at 10k but now is 9.5k?").
// A connected account's size is MT5's first deposit: no pencil, MT5 wins. Run: python tests/browser_test.py tests/accstart_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stAccFill && document.getElementById('settings-gear')); i++) await W(100);
    await W(1500);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"]').forEach(function (e) { e.remove(); });
    var D = STCloud.getData(), now = function () { return new Date().toISOString(); };
    var acc = function (id, nm, sb) { return { id: id, name: nm, status: 'active', kind: 'challenge', startingBalance: sb, balanceAtSetup: sb, createdAt: now(), riskRules: {} }; };
    var A = acc('acc_down', 'Down to 9.5K', 10000), B = acc('acc_typo', 'Typed wrong', 25000), C = acc('acc_old', 'Older EA disagrees', 25000), E = acc('acc_nodep', 'No deposit shown', 8000), F = acc('acc_hand', 'No MT5', 5000), G = acc('acc_agree', 'Older EA agrees', 70000);
    D.accounts = [A, B, C, E, F, G]; D.activeAccountId = A.id;
    D.mt5LoginMap = { '7001': A.id, '7002': B.id, '7003': C.id, '7004': E.id, '7006': G.id };
    window.currentUser = { id: '00000000-0000-0000-0000-0000000000a5', email: 'member@example.com' };
    var row = function (lg, v, st) { window.__stEA.apply({ login: lg, symbol: 'EURUSD', ea_version: v, updated_at: now(), settings: { currency: 'USD', company: 'Some Firm Ltd', server: 'Firm-Live', start_bal: st } }); };
    var trade = function (id, accId, pnl) { return { id: id, accountId: accId, date: '2026-10-20T09:00:00.000Z', pair: 'EURUSD', result: pnl < 0 ? 'Lose' : 'Win', actualGross: pnl }; };
    D.review = { trades: [] }; D.history = [];
    D.currentSeries = [trade('t_a1', A.id, -300), trade('t_a2', A.id, -200), trade('t_c1', C.id, -100)];

    // not signed in to its own journal yet: nothing is touched
    window.__stJournalPulled = false;
    row('7002', '9.22', 10000); await W(700);
    ok('the journal has not landed: the size waits', B.startingBalance === 25000, B.startingBalance);
    window.__stJournalPulled = true;

    // the report reaches the account with Settings closed
    row('7001', '9.22', 10000); row('7003', '9.21', 10000); row('7004', '9.22', 0); row('7006', '9.21', 70000); await W(800);
    ok('MT5 wins over a size typed wrong, Settings closed', B.startingBalance === 10000 && B.balanceAtSetup === 10000, [B.startingBalance, B.balanceAtSetup]);
    ok('an older EA\'s figure never overwrites: it might be a current balance', C.startingBalance === 25000, C.startingBalance);
    ok('no first deposit found: the size stays as it was', E.startingBalance === 8000, E.startingBalance);

    // his question: started at 10K, now 9.5K
    var st = window.__stAccountStats(A);
    ok('started 10K, lost 500: starts at 10,000', A.startingBalance === 10000, A.startingBalance);
    ok('...its balance reads 9,500', Math.round(st.current) === 9500, st.current);
    ok('...and it is down 5%', Math.round(st.pct * 100) / 100 === -5, st.pct);

    // connected at 9.5K with an older typed 9.5K: it goes back to the real size and the balance follows
    var H = acc('acc_95', 'Typed its balance', 9500); D.accounts.push(H); D.mt5LoginMap['7007'] = H.id;
    D.currentSeries.push(trade('t_h1', H.id, -500));
    row('7007', '9.22', 10000); await W(800);
    ok('typed its current 9.5K: back to 10,000, balance 9,500', H.startingBalance === 10000 && Math.round(window.__stAccountStats(H).current) === 9500, [H.startingBalance, window.__stAccountStats(H).current]);

    // a real "Balance now" stays
    var K = acc('acc_kept', 'Balance now kept', 10000); K.startingBalance = 25000; K.balanceAtSetup = 9980.19; D.accounts.push(K); D.mt5LoginMap['7008'] = K.id;
    row('7008', '9.22', 10000); await W(800);
    ok('a separate "Balance now" is not moved', K.startingBalance === 10000 && K.balanceAtSetup === 9980.19, [K.startingBalance, K.balanceAtSetup]);

    // the row in Settings
    document.getElementById('settings-gear').click(); await W(700);
    document.querySelector('#settings-modal-bg .settings-nav-item[data-section="accounts"]').click(); await W(700);
    var open = async function (a) { document.querySelector('#settings-accounts-list .sacc-item[data-account-id="' + a.id + '"] .sacc-head').click(); await W(400); return document.querySelector('#settings-accounts-list .sacc-item[data-account-id="' + a.id + '"]'); };
    var startRow = function (it) { return it.querySelector('[data-sx-row="start"]'); };
    var it = await open(A);
    ok('connected: no pencil on the size', !it.querySelector('[data-sx-edit="start"]'));
    ok('...it says where it comes from and shows 10,000', /From MT5/.test(startRow(it).textContent) && /10,000/.test(startRow(it).textContent), startRow(it).textContent);
    ok('...and no "Wrong size?" link', !/Wrong size/i.test(it.textContent));
    ok('...the name keeps its pencil', !!it.querySelector('[data-sx-edit="name"]'));
    it = await open(F);
    ok('no MT5: the pencil stays', !!it.querySelector('[data-sx-edit="start"]') && !/From MT5/.test(startRow(it).textContent));
    it = await open(E);
    ok('no first deposit found: the pencil comes back', !!it.querySelector('[data-sx-edit="start"]') && !/From MT5/.test(startRow(it).textContent));
    it = await open(C);
    ok('older EA disagrees: the pencil stays, so it can be put right', !!it.querySelector('[data-sx-edit="start"]'));
    it = await open(G);
    ok('older EA agrees: no pencil', !it.querySelector('[data-sx-edit="start"]') && /From MT5/.test(startRow(it).textContent), startRow(it).textContent);

    // EA 9.23: the balance is MT5's, whatever the journal holds (Nestor, 4 Nov 2026)
    var bal = function (lg, v, st, b, dep) { window.__stEA.apply({ login: lg, symbol: 'EURUSD', ea_version: v, updated_at: now(), settings: { currency: 'USD', company: 'Some Firm Ltd', server: 'Firm-Live', start_bal: st, bal: b, dep_total: dep } }); };
    var P = acc('acc_noimport', 'Nothing imported', 10000); D.accounts.push(P); D.mt5LoginMap['7010'] = P.id;
    bal('7010', '9.23', 10000, 9500, 10000); await W(800);
    var sp = window.__stAccountStats(P);
    ok('10K at 9.5K, no trade imported: 10,000 start, 9,500 balance, -5%', P.startingBalance === 10000 && Math.round(sp.current) === 9500 && Math.round(sp.pct * 100) / 100 === -5, [P.startingBalance, sp.current, sp.pct]);
    ok('...kept with the account for the next start', Math.round(P.balanceAtSetup) === 9500, P.balanceAtSetup);
    D.currentSeries.push(trade('t_p1', P.id, -500));
    sp = window.__stAccountStats(P);
    ok('its old losing trades imported: still 9,500, not 9,000', Math.round(sp.current) === 9500 && Math.round(sp.baseline) === 10000, [sp.current, sp.baseline]);
    bal('7010', '9.23', 10000, 9400, 10000); D.currentSeries.push(trade('t_p2', P.id, -100));
    ok('a new trade closes: 9,400', Math.round(window.__stAccountStats(P).current) === 9400, window.__stAccountStats(P).current);
    D.activeAccountId = P.id; data.viewScope = P.id;
    await W(800);
    var Q = acc('acc_paid', 'Paid out', 10000); Q.payouts = [{ id: 'po1', amount: 1000, status: 'paid', date: '2026-10-01' }]; D.accounts.push(Q); D.mt5LoginMap['7011'] = Q.id;
    bal('7011', '9.23', 10000, 10000, 10000); await W(800);
    var sq = window.__stAccountStats(Q);
    ok('a paid payout: balance MT5\'s, the % still what the trading made', Math.round(sq.current) === 10000 && Math.round(sq.pct) === 10, [sq.current, sq.pct]);
    // top-ups
    var T1 = acc('acc_top', 'Personal topped up', 5000); T1.kind = 'personal'; D.accounts.push(T1); D.mt5LoginMap['7012'] = T1.id;
    bal('7012', '9.23', 5000, 10000, 10000); await W(800);
    var st1 = window.__stAccountStats(T1);
    ok('personal, 5K then 5K more: size 10,000, balance 10,000, 0%: added money is not profit', T1.startingBalance === 10000 && Math.round(st1.current) === 10000 && Math.round(st1.pct) === 0, [T1.startingBalance, st1.current, st1.pct]);
    var T2 = acc('acc_prop_top', 'Prop extra deposit', 5000); D.accounts.push(T2); D.mt5LoginMap['7013'] = T2.id;
    bal('7013', '9.23', 5000, 5500, 7000); await W(800);
    ok('prop firm: stays on its first deposit', T2.startingBalance === 5000, T2.startingBalance);
    var TF = window.__stMt5TopUp(T1);
    ok('the row can say it: 5,000 + 5,000 added', TF && TF.first === 5000 && TF.added === 5000, TF);
    // no 9.23 yet: as before
    ok('an older EA: no balance from MT5, the journal\'s as before', window.__stMt5Bal(A) == null && Math.round(window.__stAccountStats(A).current) === 9500, [window.__stMt5Bal(A), window.__stAccountStats(A).current]);

    // the copier before MT5 has signed in (Troy, 4 Nov 2026)
    var TR = acc('acc_wait', 'Tradeify', 5000); D.accounts.push(TR); D.mt5LoginMap['118156'] = TR.id;
    var _cl = window.__stMt5c.cloud; window.__stMt5c.cloud = function () { return [{ login: 118156, server: 'TradeifyVenturesFX-Server', status: 'starting', app_trading: true }]; };
    window.__stAccOpenId = TR.id; window.renderSettingsAccountsList(); await W(500);
    var wi = document.querySelector('#settings-accounts-list .sacc-item[data-account-id="acc_wait"]'), ws = wi && wi.querySelector('select[data-mt5c-role="118156"]');
    ok('not signed in: the copier is not offered, and says why', !!ws && ws.disabled && /once its MT5 has signed in/.test(wi.textContent), ws && ws.disabled);
    window.__stMt5c.cloud = _cl;

    // mentor view never writes
    window.__MV = true; var M = acc('acc_mv', 'Mentor view', 3000); D.accounts.push(M); D.mt5LoginMap['7009'] = M.id;
    row('7009', '9.22', 10000); await W(800);
    ok('mentor view: nothing written', M.startingBalance === 3000, M.startingBalance);
    window.__MV = false;
  } catch (e) { ok('no exception', false, String(e && e.stack || e)); }
  return out;
})();
