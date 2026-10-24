(async function () {
  // Order rules (24 Oct 2026, Nestor: "the daily loss hit you cant lift it ... block myself for the next 4 hourse and it unlocks for
  // the NY session again"): Settings -> Accounts -> an account's rules gets "Order rules"; window.__stRules refuses an order that
  // breaks one (locks: the day, a session, a break; per order: time between entries, open risk, allowed symbols), stricter counts at
  // once and looser from tomorrow, a break can't be cut short, and the rules go to the account's EA (9.15) as a signed "rules".
  // Run: python tests/browser_test.py tests/order_rules_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stAccFill && window.__stRules && document.getElementById('settings-gear')); i++) await W(100);
    await W(1500);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"]').forEach(function (e) { e.remove(); });
    var R = window.__stRules, D = STCloud.getData(), a1 = D.accounts[0];
    ok('the API: check, state, breakFor, codeText', typeof R.check === 'function' && typeof R.state === 'function' && typeof R.breakFor === 'function' && typeof R.codeText === 'function');
    a1.name = 'FTMO 70K - Challenge'; a1.kind = 'challenge'; a1.startingBalance = 70000; a1.payouts = [];
    a1.riskRules = { maxLossMode: 'amount', maxLossAmount: 800 }; delete a1.ruleDay; delete a1.ruleBreak;
    var a2 = { id: 'acc_t_10k', name: 'FTMO 10K - Challenge', status: 'active', kind: 'challenge', startingBalance: 10000, createdAt: new Date().toISOString(), riskRules: {} };
    D.accounts = [a1, a2]; D.activeAccountId = a1.id;
    window.currentUser = { id: '00000000-0000-0000-0000-0000000000a7', email: 'member@example.com' };
    D.mt5LoginMap = { '9900001': a1.id, '9900002': a2.id };

    // ---- the sessions (London time): 18:00 UTC on a summer day is 19:00 London - New York's session, Asia next at 00:00 London
    var sg = R._segAt(Date.UTC(2026, 9, 24, 18, 0));
    ok('the session now: New York (opened 13:00 London), Asia next at 00:00 London = 23:00 UTC', sg.seg === 2 && sg.nextSeg === 0 && sg.next === Date.UTC(2026, 9, 24, 23, 0) && sg.off === 60, sg);
    var sw = R._segAt(Date.UTC(2026, 10, 2, 9, 0));
    ok('in winter (GMT): 09:00 UTC is London\'s session, New York next at 13:00 UTC', sw.seg === 1 && sw.nextSeg === 2 && sw.next === Date.UTC(2026, 10, 2, 13, 0) && sw.off === 0, sw);

    // ---- what the EA gets
    var s1 = R._rulesStr(a1);
    ok('the EA gets the daily loss (the max daily drawdown, 800), London\'s offset, the opens, the day\'s zone, close-elsewhere on', /^dl=800;lo=-?\d+;so=00:00\/08:00\/13:00;dz=\d+;ce=1$/.test(s1), s1);
    // the account's day: FTMO's resets at midnight in Prague, another prop firm's at its server's midnight, a personal account's in London
    var pf = { id: 'p', kind: 'challenge', name: 'The5ers 100K' }, pe = { id: 'q', kind: 'personal', name: 'IC Markets' };
    ok('the day resets: FTMO in Prague, another firm at its server\'s midnight, personal in London', R._dayZone(a1) === 'Europe/Prague' && R._dayZone(pf) === 'srv' && R._dayZone(pe) === 'Europe/London', [R._dayZone(a1), R._dayZone(pf), R._dayZone(pe)]);
    var nr = R._nextReset(a1), pr = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Prague', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).format(new Date(nr));
    ok('...FTMO\'s next reset is midnight in Prague, within a day', pr === '00:00' && nr > Date.now() && nr - Date.now() <= 86400000, [pr, new Date(nr).toISOString()]);
    ok('...and the EA is told Prague\'s offset (dz=60 in winter, 120 in summer)', /;dz=(60|120);/.test(s1), s1);
    ok('an account with no rules sends nothing', R._rulesStr(a2) === '', R._rulesStr(a2));
    a2.riskRules = { firmDailyMode: 'pct', firmDailyPct: 5 };
    ok('the firm\'s daily limit counts when there is no own one (5% of 10K = 500)', /^dl=500;/.test(R._rulesStr(a2)), R._rulesStr(a2));
    a2.riskRules = {}; delete a2.ruleDay;

    // ---- stricter at once, looser from tomorrow
    a1.riskRules.sessTrades = 2; R._eff(a1);
    ok('a new limit (2 trades a session) counts at once', R.state(a1).rules.sn === 2 && !('sn' in R.state(a1).pending), R.state(a1).rules.sn);
    a1.riskRules.sessTrades = 3; R._eff(a1);
    var st = R.state(a1);
    ok('raised to 3 the same day: 2 stays in force, 3 from tomorrow', st.rules.sn === 2 && st.pending.sn === 3, [st.rules.sn, st.pending]);
    a1.riskRules.sessTrades = 1; R._eff(a1);
    ok('lowered to 1: counts at once', R.state(a1).rules.sn === 1, R.state(a1).rules.sn);
    a1.riskRules.sessTrades = 4; R._eff(a1);
    ok('...and raising it again stays at 1 today (the strictest of the day holds)', R.state(a1).rules.sn === 1 && R.state(a1).pending.sn === 4);
    a1.ruleDay.day = '2000-01-01'; R._eff(a1);
    ok('the next day the 4 is in force', R.state(a1).rules.sn === 4 && !('sn' in R.state(a1).pending), R.state(a1).rules.sn);
    a1.riskRules.maxLossAmount = 1200; R._eff(a1);
    ok('the daily loss raised (looser): 800 holds today, 1,200 from tomorrow', R.state(a1).rules.dl === 800 && R.state(a1).pending.dl === 1200);
    a1.riskRules.closeElsewhere = false; R._eff(a1);
    ok('close-elsewhere switched off (looser): stays on today', R.state(a1).rules.ce === true && R.state(a1).pending.ce === false);
    a1.ruleDay.day = '2000-01-01'; a1.riskRules = { maxLossMode: 'amount', maxLossAmount: 800 }; R._eff(a1); a1.ruleDay.day = '2000-01-01'; R._eff(a1);

    // ---- allowed symbols
    a1.riskRules.allowedSymbols = ['EURUSD', 'XAUUSD']; R._eff(a1);
    var c = R.check({ acct: a1.id, symbol: 'GBPUSD' });
    ok('allowed symbols: GBPUSD refused, as an order (not a lock), in words', !c.ok && c.rule === 'sym' && c.kind === 'order' && /GBPUSD isn’t one of the allowed symbols/.test(c.why), c);
    ok('...EURUSD and a broker suffix (XAUUSD.m) allowed', R.check({ acct: a1.id, symbol: 'EURUSD' }).ok && R.check({ acct: a1.id, symbol: 'XAUUSD.m' }).ok);
    ok('...by login too', !R.check({ login: '9900001', symbol: 'US100.cash' }).ok);
    a1.riskRules.allowedSymbols = ['EURUSD']; R._eff(a1);
    ok('...XAUUSD taken out: refused at once (stricter)', !R.check({ acct: a1.id, symbol: 'XAUUSD' }).ok && R.state(a1).rules.sy.join() === 'EURUSD');
    a1.riskRules.allowedSymbols = ['EURUSD', 'GBPUSD']; R._eff(a1);
    ok('...GBPUSD added: from tomorrow', !R.check({ acct: a1.id, symbol: 'GBPUSD' }).ok && R.state(a1).pending.sy.join() === 'EURUSD,GBPUSD');
    a1.ruleDay.day = '2000-01-01'; delete a1.riskRules.allowedSymbols; R._eff(a1); a1.ruleDay.day = '2000-01-01'; R._eff(a1);

    // ---- what the EA says (9.15's "set"): a session lock, the last entry, the money at risk
    var now = Date.now(), until = Math.floor(now / 1000) + 3600;
    R._eaSet({ s: 'EURUSD', lg: '9900001', st: { rr: R._rulesStr(a1), ru: '2|' + until + '|' + Math.floor(now / 1000 - 60) + '|-120.00|-320.00|2|' + Math.floor(now / 1000 - 120) + '|0.00|' + (until + 7200) + '|1|2|' + until } });
    c = R.check({ login: '9900001', symbol: 'EURUSD' });
    ok('the EA\'s session lock: refused as a lock, "London session limit reached. New York opens at ..."', !c.ok && c.kind === 'lock' && c.rule === 'ses' && /^London session limit reached\. New York opens (at|tomorrow at) \d\d:\d\d\.$/.test(c.why) && c.until === until * 1000, c);
    ok('...and the state shows it', R.state(a1).locked && R.state(a1).locks[0].kind === 'ses');
    R._eaSet({ s: 'EURUSD', lg: '9900001', st: { rr: R._rulesStr(a1), ru: '0|0|0|-120.00|-320.00|1|' + Math.floor(now / 1000 - 120) + '|900.00|' + (until + 7200) + '|1|2|' + until } });
    ok('lock over: allowed again', R.check({ login: '9900001', symbol: 'EURUSD' }).ok);
    a1.riskRules.entryGapMin = 15; R._eff(a1);
    c = R.check({ login: '9900001', symbol: 'EURUSD' });
    ok('15 minutes between entries, the last 2 minutes ago: refused for that order, "Next entry from hh:mm"', !c.ok && c.kind === 'order' && c.rule === 'gap' && /^Next entry from \d\d:\d\d \(15 minutes between entries\)\.$/.test(c.why), c);
    a1.ruleDay.day = '2000-01-01'; delete a1.riskRules.entryGapMin; R._eff(a1); a1.ruleDay.day = '2000-01-01'; R._eff(a1);
    a1.riskRules.openRiskAmount = 1000; R._eff(a1);
    c = R.check({ login: '9900001', symbol: 'EURUSD', riskMoney: 500 });
    ok('max open risk 1,000 with 900 at risk: a 500 order refused, in words', !c.ok && c.rule === 'risk' && /would put £1,400\.00 at risk/.test(c.why) && /£1,000\.00 cap/.test(c.why), c);
    ok('...a 100 order allowed', R.check({ login: '9900001', symbol: 'EURUSD', riskMoney: 100 }).ok);
    a1.ruleDay.day = '2000-01-01'; delete a1.riskRules.openRiskAmount; R._eff(a1); a1.ruleDay.day = '2000-01-01'; R._eff(a1);

    // ---- the EA's codes in words
    ok('the EA\'s codes in words: the day, a session, symbols', /^Daily loss reached\. Trading opens again/.test(R.codeText('rule:day:' + until + ':2/0'))
      && /^New York session limit reached\. Asia opens/.test(R.codeText('rule:ses:' + until + ':2/0')) && /^BTCUSD isn’t one of the allowed symbols/.test(R.codeText('rule:sym:0:BTCUSD')),
      [R.codeText('rule:day:' + until + ':2/0'), R.codeText('rule:ses:' + until + ':2/0')]);
    ok('...and __stTM\'s words for an EA refusal use them', window.__stTM.whyTxt && /^Every order needs a stop\.$/.test(window.__stTM.whyTxt('rule:stop:0:')));

    // ---- a break: two presses in the rows, can't be undone or cut short
    var b = R.breakFor(a1, '2h');
    ok('a 2 h break: a lock until about 2 h from now', b && Math.abs(b.until - (Date.now() + 7200000)) < 5000 && !R.check({ acct: a1.id, symbol: 'EURUSD' }).ok && R.check({ acct: a1.id, symbol: 'EURUSD' }).rule === 'brk');
    var b2 = R.breakFor(a1, '1h');
    ok('...a shorter one asked after it: the 2 h stays (never cut short)', b2 && b2.until === b.until && a1.ruleBreak.until === b.until);
    ok('...the EA gets it (bk, bs)', /;bk=\d+;bs=\d+;/.test(R._rulesStr(a1)), R._rulesStr(a1));
    var o = await window.__stTM.acct({ a: 'open', login: '9900001', sym: 'EURUSD', cp: '1.1', ci: 'm' });
    ok('an order through the app path while on a break: refused before it is sent, with the rule\'s code', o && !o.ok && /^rule:brk:\d+:/.test(o.why) && /^On a break\. Trading opens again/.test(window.__stTM.whyTxt(o.why)), o);
    delete a1.ruleBreak;

    // ---- to the EA: one signed "rules" to an EA 9.15 of the login when what it says differs
    var calls = [], realLL = window.__stLiveLine, realAcct = window.__stTM.acct;
    window.__stLiveLine = Object.assign({}, realLL, { easL: function () { return { 'EURUSD|9900001': { v: '9.15', at: Date.now(), tm: false }, 'XAUUSD|9900002': { v: '9.14', at: Date.now(), tm: true } }; } });
    window.__stTM.acct = function (x) { calls.push(x); return Promise.resolve({ ok: true }); };
    R._eaSet({ s: 'EURUSD', lg: '9900001', st: { rr: '', ru: '0|0|0|0|0|0|0|0|0|-1|-1|0' } });
    R._push(); await W(100);
    ok('the rules go to the 9.15 EA (not to the 9.14 one), App trading off or not', calls.length === 1 && calls[0].a === 'rules' && calls[0].login === '9900001' && calls[0].sym === 'EURUSD' && calls[0].anyTm === true && calls[0].minV === 9.15 && calls[0].cp === R._rulesStr(a1), calls);
    R._push(); await W(100);
    ok('...once (in step now, nothing sent again)', calls.length === 1, calls.length);
    window.__stLiveLine = realLL; window.__stTM.acct = realAcct;

    // ---- the rows in Settings -> Accounts
    window.__stAccOpenId = undefined;
    document.getElementById('settings-gear').click(); await W(700);
    document.querySelector('#settings-modal-bg .settings-nav-item[data-section="accounts"]').click(); await W(700);
    var item = function (id) { return document.querySelector('#settings-accounts-list .sacc-item[data-account-id="' + id + '"]'); };
    item(a1.id).querySelector('.sacc-head').click(); await W(500);
    var blk = item(a1.id).querySelector('.ru-block');
    ok('the account\'s rules end with "Order rules": open, the daily loss lock at £800', blk && /Order rules/.test(blk.textContent) && /Trading open/.test(blk.textContent) && /Daily loss lock/.test(blk.textContent) && /£800\.00/.test(blk.textContent), blk && blk.textContent.slice(0, 200));
    ok('...the rows: session loss, trades per session, time between entries, max open risk, allowed symbols, close elsewhere, a break',
      ['Loss per session', 'Trades per session', 'Time between entries', 'Max open risk', 'Allowed symbols', 'Close trades opened elsewhere while locked', 'Take a break'].every(function (t) { return blk.textContent.indexOf(t) >= 0; }));
    var inp = blk.querySelector('[data-ru="sessTrades"]'); inp.value = '2'; inp.dispatchEvent(new Event('change', { bubbles: true })); await W(300);
    ok('typing 2 in Trades per session saves it, in force at once', a1.riskRules.sessTrades === 2 && R.state(a1).rules.sn === 2, a1.riskRules.sessTrades);
    blk = item(a1.id).querySelector('.ru-block'); inp = blk.querySelector('[data-ru="sessTrades"]'); inp.value = '5'; inp.dispatchEvent(new Event('change', { bubbles: true })); await W(300);
    blk = item(a1.id).querySelector('.ru-block');
    ok('...5 the same day: "From tomorrow: 5" under it', /From tomorrow: 5/.test(blk.textContent) && R.state(a1).rules.sn === 2, blk.querySelector('.ru-next') && blk.querySelector('.ru-next').textContent);
    blk.querySelector('[data-ru-mode="sessLossMode"][data-v="r"]').click(); await W(200);
    blk = item(a1.id).querySelector('.ru-block'); inp = blk.querySelector('[data-ru="sessLoss"]'); inp.value = '2'; inp.dispatchEvent(new Event('change', { bubbles: true })); await W(300);
    ok('session loss in R: 2R saved, the EA gets slr=2', a1.riskRules.sessLossMode === 'r' && a1.riskRules.sessLossR === 2 && /;slr=2;/.test(R._rulesStr(a1)), R._rulesStr(a1));
    blk = item(a1.id).querySelector('.ru-block'); inp = blk.querySelector('[data-ru="allowedSymbols"]'); inp.value = 'eurusd, xauusd'; inp.dispatchEvent(new Event('change', { bubbles: true })); await W(300);
    ok('allowed symbols typed "eurusd, xauusd": saved as EURUSD, XAUUSD', (a1.riskRules.allowedSymbols || []).join() === 'EURUSD,XAUUSD');
    blk = item(a1.id).querySelector('.ru-block');
    ok('close elsewhere: on unless switched off', blk.querySelector('[data-ru="closeElsewhere"]').checked === true);
    blk.querySelector('[data-ru-break="4h"]').click(); await W(200);
    blk = item(a1.id).querySelector('.ru-block');
    ok('a break: the first press asks again, nothing started', !a1.ruleBreak && /Start 4 h/.test(blk.querySelector('[data-ru-break="4h"]').textContent));
    blk.querySelector('[data-ru-break="4h"]').click(); await W(300);
    blk = item(a1.id).querySelector('.ru-block');
    ok('...the second starts it: Locked, "On a break", the buttons gone', a1.ruleBreak && Math.abs(a1.ruleBreak.until - (Date.now() + 4 * 3600000)) < 10000 && /Locked/.test(blk.textContent) && /On a break/.test(blk.textContent) && !blk.querySelector('[data-ru-break]'));
    // the phone: nothing wider than the screen (checked at 375 by the phone run of this file)
    var wide = [].slice.call(blk.querySelectorAll('.set-row')).filter(function (r) { return r.scrollWidth > r.clientWidth + 2; }).length;
    ok('no row wider than its box', wide === 0, wide);
    delete a1.ruleBreak;
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
