(async function () {
  // Order rules (24 Oct 2026, Nestor: "the daily loss hit you cant lift it ... block myself for the next 4 hourse and it unlocks for
  // the NY session again"): window.__stRules refuses an order while a lock is on (the day's loss, a break), stricter counts at once and
  // looser from tomorrow, a break can't be cut short, and the rules go to the account's EA (9.15) as a signed "rules". Since 27 Oct 2026
  // (Nestor: "the order rules are a bit too much ... i think is best to remove them") the session limits, the time between entries,
  // the max open risk and the allowed symbols are gone - never sent, never refusing - and the Order rules section with them; "Close
  // trades opened elsewhere while locked" is one row in Risk rules, on by default.
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
    ok('the EA gets the daily loss (the max daily drawdown, 800), London\'s offset, the opens, the day\'s zone, close-elsewhere on', /^dl=800;lo=-?\d+;so=00:00\/08:00\/13:00;dz=prg;ce=1$/.test(s1), s1);
    // the account's day: FTMO's resets at midnight in Prague, another prop firm's at its server's midnight, a personal account's in London
    var pf = { id: 'p', kind: 'challenge', name: 'The5ers 100K' }, pe = { id: 'q', kind: 'personal', name: 'IC Markets' };
    ok('the day resets: FTMO in Prague, another firm at its server\'s midnight, personal in London', R._dayZone(a1) === 'Europe/Prague' && R._dayZone(pf) === 'srv' && R._dayZone(pe) === 'Europe/London', [R._dayZone(a1), R._dayZone(pf), R._dayZone(pe)]);
    var nr = R._nextReset(a1), pr = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Prague', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).format(new Date(nr));
    ok('...FTMO\'s next reset is midnight in Prague, within a day', pr === '00:00' && nr > Date.now() && nr - Date.now() <= 86400000, [pr, new Date(nr).toISOString()]);
    ok('...and the EA is told the zone (dz=prg) and works out its midnight itself, with the EU clock change', /;dz=prg;/.test(s1), s1);
    // the night the clocks change (25 Oct 2026, 01:00 UTC): from 24 Oct 23:30 UTC, Prague's next midnight is in winter time
    var pm = R._zMidnightAfter('Europe/Prague', Date.UTC(2026, 9, 24, 23, 30));
    ok('the clock change: from 24 Oct 23:30 UTC, Prague\'s next midnight is 25 Oct 23:00 UTC (not 22:00)', pm === Date.UTC(2026, 9, 25, 23, 0), new Date(pm).toISOString());
    var sgc = R._segAt(Date.UTC(2026, 9, 24, 23, 30));
    ok('...and at 00:30 London that night Asia is open, London opens 08:00 London = 08:00 UTC (winter time by then)', sgc.seg === 0 && sgc.nextSeg === 1 && sgc.next === Date.UTC(2026, 9, 25, 8, 0), [sgc.seg, sgc.nextSeg, new Date(sgc.next).toISOString()]);
    ok('an account with no rules sends nothing', R._rulesStr(a2) === '', R._rulesStr(a2));
    a2.riskRules = { firmDailyMode: 'pct', firmDailyPct: 5 };
    ok('the firm\'s daily limit counts when there is no own one (5% of 10K = 500)', /^dl=500;/.test(R._rulesStr(a2)), R._rulesStr(a2));
    a2.riskRules = {}; delete a2.ruleDay;

    // ---- stricter at once, looser from tomorrow
    a1.riskRules.maxLossAmount = 600; R._eff(a1);
    ok('a stricter daily loss (600) counts at once', R.state(a1).rules.dl === 600 && !('dl' in R.state(a1).pending), R.state(a1).rules.dl);
    a1.riskRules.maxLossAmount = 1200; R._eff(a1);
    ok('raised to 1,200 the same day (looser): 600 holds today, 1,200 from tomorrow', R.state(a1).rules.dl === 600 && R.state(a1).pending.dl === 1200);
    a1.ruleDay.day = '2000-01-01'; R._eff(a1);
    ok('the next day the 1,200 is in force', R.state(a1).rules.dl === 1200 && !('dl' in R.state(a1).pending));
    a1.riskRules.closeElsewhere = false; R._eff(a1);
    ok('close-elsewhere switched off (looser): stays on today', R.state(a1).rules.ce === true && R.state(a1).pending.ce === false);
    a1.ruleDay.day = '2000-01-01'; a1.riskRules = { maxLossMode: 'amount', maxLossAmount: 800 }; R._eff(a1); a1.ruleDay.day = '2000-01-01'; R._eff(a1);

    // ---- the rules removed on 27 Oct 2026: set or left over from before, none is sent and none refuses an order
    a1.riskRules = { maxLossMode: 'amount', maxLossAmount: 800, sessTrades: 2, sessLossAmount: 300, entryGapMin: 15, openRiskAmount: 1000, allowedSymbols: ['EURUSD'] };
    a1.ruleDay = { day: a1.ruleDay.day, snap: { dl: 800, sn: 1, sl: 200, gp: 30, or: 500, sy: ['EURUSD'], ce: true } };   // today's snapshot from before
    R._eff(a1);
    ok('the session limits, the time between entries, the open risk and the allowed symbols: not in what the EA gets', /^dl=800;lo=-?\d+;so=[\d:\/]+;dz=prg;ce=1$/.test(R._rulesStr(a1)), R._rulesStr(a1));
    ok('...and no order refused for them (GBPUSD, a 5,000 order)', R.check({ acct: a1.id, symbol: 'GBPUSD', riskMoney: 5000 }).ok);
    a1.riskRules = { maxLossMode: 'amount', maxLossAmount: 800 }; a1.ruleDay.day = '2000-01-01'; R._eff(a1);

    // ---- what the EA says (9.15's "set"): its daily loss lock
    var now = Date.now(), until = Math.floor(now / 1000) + 3600;
    R._eaSet({ s: 'EURUSD', lg: '9900001', st: { rr: R._rulesStr(a1), ru: '1|' + until + '|' + Math.floor(now / 1000 - 60) + '|-820.00|-320.00|2|' + Math.floor(now / 1000 - 120) + '|0.00|' + until + '|1|2|' + until } });
    var c = R.check({ login: '9900001', symbol: 'EURUSD' });
    ok('the EA\'s daily loss lock: refused as a lock, "Daily loss reached. Trading opens again ..."', !c.ok && c.kind === 'lock' && c.rule === 'day' && /^Daily loss reached\. Trading opens again/.test(c.why) && c.until === until * 1000, c);
    ok('...and the state shows it', R.state(a1).locked && R.state(a1).locks[0].kind === 'day');
    R._eaSet({ s: 'EURUSD', lg: '9900001', st: { rr: R._rulesStr(a1), ru: '0|0|0|-120.00|-320.00|1|' + Math.floor(now / 1000 - 120) + '|900.00|' + (until + 7200) + '|1|2|' + until } });
    ok('lock over: allowed again', R.check({ login: '9900001', symbol: 'EURUSD' }).ok);

    // ---- the EA's codes in words
    ok('the EA\'s codes in words: the day, a break', /^Daily loss reached\. Trading opens again/.test(R.codeText('rule:day:' + until + ':2/0')) && /^On a break\. Trading opens again/.test(R.codeText('rule:brk:' + until + ':')),
      [R.codeText('rule:day:' + until + ':2/0'), R.codeText('rule:brk:' + until + ':')]);
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

    // ---- Settings -> Accounts: no Order rules section; close elsewhere is one row in Risk rules, after your rules
    window.__stAccOpenId = undefined;
    document.getElementById('settings-gear').click(); await W(700);
    document.querySelector('#settings-modal-bg .settings-nav-item[data-section="accounts"]').click(); await W(700);
    var item = function (id) { return document.querySelector('#settings-accounts-list .sacc-item[data-account-id="' + id + '"]'); };
    item(a1.id).querySelector('.sacc-head').click(); await W(500);
    var body = item(a1.id).querySelector('.sacc-body'), blk = body.querySelector('[data-slot="rules"] .ru-block');
    ok('no Order rules section, nor its rows (session, time between entries, open risk, symbols, Take a break)', !body.querySelector('[data-sx="orules"]') && !/Order rules|Loss per session|Trades per session|Time between entries|Max open risk|Allowed symbols|Take a break/.test(body.textContent), body.textContent.slice(0, 120));
    ok('Risk rules ends with one row: Close trades opened elsewhere while locked, on', blk && blk.querySelectorAll('.set-row').length === 1 && /Close trades opened elsewhere while locked/.test(blk.textContent) && blk.querySelector('[data-ru="closeElsewhere"]').checked === true && blk.compareDocumentPosition(body.querySelector('[data-rows="own"]')) & Node.DOCUMENT_POSITION_PRECEDING, blk && blk.textContent.slice(0, 80));
    var sw = blk.querySelector('[data-ru="closeElsewhere"]'); sw.checked = false; sw.dispatchEvent(new Event('change', { bubbles: true })); await W(300);
    ok('switched off: saved (from tomorrow, as any looser rule)', a1.riskRules.closeElsewhere === false && R.state(a1).pending.ce === false, a1.riskRules);
    a1.riskRules.closeElsewhere = true; a1.ruleDay.day = '2000-01-01'; R._eff(a1);
    R.breakFor(a1, '1h'); await W(300); window.__stAccFill(); await W(300);
    blk = item(a1.id).querySelector('[data-slot="rules"] .ru-block');
    ok('on a break: the row says so ("On a break. Trading opens again ...")', /On a break\. Trading opens again/.test(blk.textContent), blk.textContent);
    delete a1.ruleBreak;
    var wide = [].slice.call(blk.querySelectorAll('.set-row')).filter(function (r) { return r.scrollWidth > r.clientWidth + 2; }).length;
    ok('the row fits (' + innerWidth + 'px)', wide === 0, wide);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
