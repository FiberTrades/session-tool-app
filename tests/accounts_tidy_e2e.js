(async function () {
  // Settings > Accounts at 5 accounts (27 Oct 2026, Nestor): "keep this area tidy" - All accounts one row per currency (its code, how
  // many accounts, now and the % change, Started under it), every account's line the same height with its chips on one line, archived
  // accounts under "Archived (n)"; "why are these buttons font different than the rest?" - the segmented buttons and drop-downs in
  // Inter; "why in accounts it doesnt ask if the accounts are 1step, 2step, straight funding, etc?" - Program for every prop firm
  // account, its stages following it, prefilled (FTMO: 2-Step), FTMO's rules for a picked program, the path in Prop Firm Progress.
  // Stand-in MT5 rows; nothing is sent anywhere.
  // Run: python tests/browser_test.py tests/accounts_tidy_e2e.js        (phone: E2E_MOBILE=375x812 in front)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stAccChips && window.__stAccProgram && document.getElementById('settings-gear')); i++) await W(100);
    await W(1500);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"], .st-greet-pop { display: none !important; }'; document.head.appendChild(css);
    var mk = function (name, sb, kind, cur) { var a = newAccountBlank(name, sb, kind); a.kind = kind; a.currency = cur; a.status = 'active'; return a; };
    var A = mk('FTMO 70K - Challenge', 70000, 'challenge', 'GBP'), B = mk('FTMO 100K - Funded', 100000, 'challenge', 'GBP'), C = mk('Personal 20K', 20000, 'personal', 'GBP');
    var Dd = mk('OneFunded 10K - Challenge', 10000, 'challenge', 'USD'), E = mk('FundedNext 25K - Challenge', 25000, 'challenge', 'USD');
    var X = mk('FTMO 10K - Challenge', 10000, 'challenge', 'GBP'); X.status = 'archived';
    data.accounts = [A, B, C, Dd, E, X]; data.activeAccountId = A.id; data.viewScope = 'lifetime'; data.linkedGroups = [];
    data.mt5LoginMap = { '541419576': A.id, '27007659': Dd.id, '1520011111': B.id };
    data.settings = data.settings || {}; data.settings.currency = 'GBP';
    var n = 0, day0 = new Date(); day0.setDate(day0.getDate() - 12); day0.setHours(9, 0, 0, 0);
    var tr = function (acc, g) { n++; var d = new Date(day0); d.setDate(d.getDate() + n); return { id: 'tt' + n, accountId: acc.id, symbol: 'EUR/USD', date: d.toISOString(), dayOfWeek: d.getDay(), result: g > 0 ? 'Win' : 'Lose', r: g > 0 ? 2 : -1, risk: 500, actualGross: g, costs: 0, side: 'Long', type: 'Continuation' }; };
    data.history = []; data.currentSeries = [tr(A, -612), tr(B, 1840), tr(C, -210), tr(Dd, 140), tr(E, -385)]; rebuildSeriesByDate();
    var now = new Date().toISOString();
    window.__stMt5c.cloud = function () { return [{ id: 'c1', login: '541419576', status: 'running', status_at: now, server: 'FTMO-Server4' }, { id: 'c2', login: '27007659', status: 'running', status_at: now, server: 'OneFunded-Trade' }, { id: 'c3', login: '1520011111', status: 'starting', status_at: now, server: 'FTMO-Server3' }]; };
    var R = { '27007659': 'follow', '541419576': 'lead' }; window.__stCopyWish.role = function (lg) { return R[String(lg)] || 'off'; };
    window.__stAccOpenId = null;
    document.getElementById('settings-gear').click(); await W(700);
    document.querySelector('#settings-modal-bg .settings-nav-item[data-section="accounts"]').click(); await W(600);
    window.renderSettingsAccountsList(); await W(500);
    var wrap = document.getElementById('settings-accounts-list');
    var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };

    // (a) All accounts: a row per currency
    var curRows = wrap.querySelectorAll('.sacc-sum .sacc-cur');
    var gbp = txt(wrap.querySelector('.sacc-cur[data-cur="GBP"]')), usd = txt(wrap.querySelector('.sacc-cur[data-cur="USD"]'));
    ok('All accounts: one row per currency (GBP, USD), the member\'s own first', curRows.length === 2 && curRows[0].getAttribute('data-cur') === 'GBP', [].map.call(curRows, function (r) { return r.getAttribute('data-cur'); }));
    ok('GBP: 3 accounts, now £191,018.00 +0.54%, Started £190,000.00', /GBP\s*3 accounts\s*£191,018\.00\s*\+0\.54%\s*Started £190,000\.00/.test(gbp), gbp);
    ok('USD: 2 accounts, now $34,755.00 -0.70%, Started $35,000.00', /USD\s*2 accounts\s*\$34,755\.00\s*-0\.70%\s*Started \$35,000\.00/.test(usd), usd);
    ok('never one sum of £ and $', !/225,773|225,000/.test(txt(wrap.querySelector('.sacc-sum'))), txt(wrap.querySelector('.sacc-sum')));
    var smallFont = getComputedStyle(wrap.querySelector('.sacc-cur-v small')).fontFamily;
    ok('"Started" in Inter, smaller than now', /Inter/.test(smallFont) && parseFloat(getComputedStyle(wrap.querySelector('.sacc-cur-v small')).fontSize) < parseFloat(getComputedStyle(wrap.querySelector('.sacc-cur-v b')).fontSize), smallFont);

    // (a) every account's line the same height, its chips on one line
    var heads = [].slice.call(wrap.querySelectorAll(':scope > .sacc-item > .sacc-head'));
    var hs = heads.map(function (h) { return Math.round(h.getBoundingClientRect().height); });
    ok('5 account lines, all the same height', heads.length === 5 && Math.max.apply(null, hs) - Math.min.apply(null, hs) <= 1, hs);
    var oneLine = heads.every(function (h) { var cs = [].slice.call(h.querySelectorAll('.sacc-chips > *')); if (!cs.length) return true; var t0 = cs[0].getBoundingClientRect().top; return cs.every(function (c) { return Math.abs(c.getBoundingClientRect().top - t0) < 2; }); });
    var fits = heads.every(function (h) { var c = h.querySelector('.sacc-chips'); return !c || c.scrollWidth <= c.clientWidth + 1; });
    ok('each line\'s chips on one line, nothing cut off', oneLine && fits, heads.map(function (h) { var c = h.querySelector('.sacc-chips'); return c ? [c.scrollWidth, c.clientWidth] : null; }));
    var a70 = wrap.querySelector('.sacc-item[data-account-id="' + A.id + '"] .sacc-head .sacc-chips');
    ok('the 70K\'s chips: Prop firm, ONE MT5 chip (dot, login, where it runs - in its tooltip too), Lead', a70.querySelectorAll('.mt5c-chip').length === 3 && /Prop firm/i.test(txt(a70)) && /MT5 541419576 · Cloud · signed in/.test(txt(a70)) && /Lead/i.test(txt(a70)) && /Cloud · signed in/.test((a70.querySelector('[title*="Cloud"]') || {}).title || ''), txt(a70));
    var nm = wrap.querySelector('.sacc-item[data-account-id="' + Dd.id + '"] .sacc-nm');
    ok('the name on one line (cut with … if it ever must, the whole name in its tooltip)', getComputedStyle(nm).whiteSpace === 'nowrap' && getComputedStyle(nm).textOverflow === 'ellipsis' && nm.title === 'OneFunded 10K - Challenge', [getComputedStyle(nm).whiteSpace, nm.title]);
    var arch = wrap.querySelector('.settings-archived-group');
    ok('archived accounts folded under "Archived (1)"', arch && !arch.open && /^Archived \(1\)$/.test(txt(arch.querySelector('summary'))), arch && txt(arch.querySelector('summary')));
    ok('...its line wears an Archived badge', /Archived/i.test(txt(arch && arch.querySelector('.sacc-chips'))), arch && txt(arch.querySelector('.sacc-chips')));
    // a refresh of the chips keeps them compact and the badge on
    try { window.__stAccFill && window.__stAccFill(true); } catch (e) {}
    await W(300);
    ok('a refresh of the chips keeps the line compact (3 chips)', wrap.querySelectorAll('.sacc-item[data-account-id="' + A.id + '"] .sacc-head .sacc-chips .mt5c-chip').length === 3, txt(wrap.querySelector('.sacc-item[data-account-id="' + A.id + '"] .sacc-head .sacc-chips')));

    // (c) Program: prefilled, its stages, FTMO's rules
    window.__stAccOpenId = A.id; window.renderSettingsAccountsList(); await W(700);
    var it = function () { return wrap.querySelector('.sacc-item.open'); };
    var progBtns = function () { return [].slice.call(it().querySelectorAll('[data-sacc-prog]')); };
    var stageBtns = function () { return [].slice.call(it().querySelectorAll('[data-sacc-stage]')).map(function (b) { return b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : ''); }); };
    var pressed = function () { var b = progBtns().filter(function (x) { return x.getAttribute('aria-pressed') === 'true'; })[0]; return b ? b.getAttribute('data-sacc-prog') : null; };
    var progRow = function () { var b = it().querySelector('[data-sacc-prog]'); return b ? b.closest('.set-row') : null; };
    ok('Program: 1-Step, 2-Step, 3-Step, Instant - in the Account section, before Stage', progBtns().map(function (b) { return b.textContent; }).join('|') === '1-Step|2-Step|3-Step|Instant' && progRow().closest('[data-sx="account"]') && progRow().compareDocumentPosition(it().querySelector('[data-sacc-stage]')) & 4, progBtns().map(function (b) { return b.textContent; }));
    ok('the 70K (FTMO, none picked): 2-Step prefilled, said so', pressed() === '2step' && /Filled in from FTMO/.test(txt(progRow())) && !A.program, [pressed(), txt(progRow()).slice(0, 120), A.program]);
    ok('...its stages: Challenge* | Verification | Funded', stageBtns().join('|') === 'Challenge*|Verification|Funded', stageBtns());
    var rr0 = JSON.stringify(A.riskRules || {});
    progBtns().filter(function (b) { return b.getAttribute('data-sacc-prog') === '1step'; })[0].click(); await W(600);
    ok('1-Step pressed: kept, its stages Challenge* | Funded', A.program === '1step' && stageBtns().join('|') === 'Challenge*|Funded', [A.program, stageBtns()]);
    var rr = A.riskRules || {};
    ok('...FTMO\'s 1-Step rules filled in: 10% trailing, 3% a day, 10% target, 50% consistency', rr.maxDrawdownPct === 10 && rr.ddType === 'trailing' && rr.firmDailyPct === 3 && rr.profitTargetPct === 10 && rr.consistencyPct === 50, [rr0, JSON.stringify(rr)]);
    // another firm: 3-Step and Instant funding
    window.__stAccOpenId = Dd.id; window.renderSettingsAccountsList(); await W(700);
    ok('OneFunded (no firm program known): Program asks, nothing pressed', pressed() === null && progRow().classList.contains('sacc-ask'), [pressed(), progRow().className]);
    progBtns().filter(function (b) { return b.getAttribute('data-sacc-prog') === '3step'; })[0].click(); await W(600);
    ok('3-Step pressed: its stages Phase 1* | Phase 2 | Phase 3 | Funded, the name follows', Dd.program === '3step' && stageBtns().join('|') === 'Phase 1*|Phase 2|Phase 3|Funded' && Dd.name === 'OneFunded 10K - Phase 1', [Dd.program, stageBtns(), Dd.name]);
    [].slice.call(it().querySelectorAll('[data-sacc-stage]')).filter(function (b) { return b.getAttribute('data-sacc-stage') === 'Phase 2'; })[0].click(); await W(500);
    ok('Phase 2 pressed: "OneFunded 10K - Phase 2", read back as Phase 2', Dd.name === 'OneFunded 10K - Phase 2' && window.__stStageOf(Dd.name) === 'Phase 2' && stageBtns().indexOf('Phase 2*') >= 0, [Dd.name, stageBtns()]);
    window.__stAccOpenId = E.id; window.renderSettingsAccountsList(); await W(700);
    progBtns().filter(function (b) { return b.getAttribute('data-sacc-prog') === 'instant'; })[0].click(); await W(600);
    ok('Instant funding pressed: Funded only, the account is funded (no target)', E.program === 'instant' && stageBtns().join('|') === 'Funded*' && E.name === 'FundedNext 25K - Funded' && window.__stIsFunded(E), [E.program, stageBtns(), E.name]);
    ok('the Overview heading says it: "FundedNext · Instant funding · Funded" or the program and stage', /Instant funding · Funded/.test(txt(it().querySelector('[data-slot="ovk"]'))), txt(it().querySelector('[data-slot="ovk"]')));

    // (b) fonts: segmented buttons and drop-downs in Inter, like the values beside them
    window.__stAccOpenId = A.id; window.renderSettingsAccountsList(); await W(700);
    var ff = function (el) { return el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '') : 'none'; };
    var segs = [it().querySelector('.settings-acct-kind .sak-opt'), it().querySelector('[data-sacc-stage]'), it().querySelector('[data-sacc-prog]'), it().querySelector('.settings-risk-mode-btn'), it().querySelector('select')];
    ok('Type, Stage, Program, % / £ and the drop-downs: Inter, as the values beside them', segs.every(function (e) { return ff(e) === 'Inter'; }) && ff(it().querySelector('.sx-v')) === 'Inter', segs.map(ff));
    document.querySelector('#settings-modal-bg .settings-nav-item[data-section="profile"]').click(); await W(400);
    ok('Profile: the currency drop-down and EN / ES too', ff(document.getElementById('currency-select')) === 'Inter' && ff(document.getElementById('lang-flag-en')) === 'Inter', [ff(document.getElementById('currency-select')), ff(document.getElementById('lang-flag-en'))]);
    document.querySelector('#settings-modal-bg .settings-nav-item[data-section="accounts"]').click(); await W(400);

    // Prop Firm Progress: the program and its stages under the name
    try { if (typeof refreshAllSurfaces === 'function') refreshAllSurfaces(); } catch (e) {}
    var body = document.createElement('div'), sec = document.createElement('div'); sec.appendChild(body); document.body.appendChild(sec);
    try { data.viewScope = A.id; window.__stChallenge({ sec: sec, body: body }); } catch (e) { ok('Prop Firm Progress drew', false, String(e)); }
    ok('Prop Firm Progress: "1-Step · Challenge › Funded" under the 70K, where it is now in bold', /1-Step · Challenge › Funded/.test(txt(body.querySelector('.chal-acct-path'))) && txt(body.querySelector('.chal-acct-path b')) === 'Challenge', txt(body.querySelector('.chal-acct-path')));
    sec.remove(); data.viewScope = 'lifetime';

    // phone
    if (window.innerWidth <= 420) {
      window.__stAccOpenId = null; window.renderSettingsAccountsList(); await W(500);
      var mb = document.querySelector('#settings-modal-bg .modal') || document.querySelector('#settings-modal-bg > div');
      ok('phone: nothing wider than the screen', document.documentElement.scrollWidth <= window.innerWidth + 1 && (!mb || mb.scrollWidth <= mb.clientWidth + 1), [document.documentElement.scrollWidth, window.innerWidth, mb && mb.scrollWidth, mb && mb.clientWidth]);
      var h0 = wrap.querySelector('.sacc-item .sacc-head'), nmR = h0.querySelector('.sacc-nm').getBoundingClientRect(), balR = h0.querySelector('.sacc-bal').getBoundingClientRect(), chR = h0.querySelector('.sacc-chips').getBoundingClientRect();
      ok('phone: a line is the name, then the balance and %, then the chips', nmR.bottom <= balR.top + 1 && balR.bottom <= chR.top + 1, [nmR.top, balR.top, chR.top]);
      var mc = wrap.querySelector('.sacc-item[data-account-id="' + A.id + '"] .sacc-head .sacc-chips .mt5c-chip:nth-child(2)');
      ok('phone: the MT5 chip shows the dot and the login only', mc && mc.innerText.trim() === '541419576', mc && mc.innerText);
      var cr = wrap.querySelector('.sacc-cur'), crR = cr.getBoundingClientRect(), vR = cr.querySelector('.sacc-cur-v').getBoundingClientRect();
      ok('phone: a currency row fits its card (now and % right, the count under the code)', vR.right <= crR.right + 1 && cr.querySelector('.sacc-cur-n').getBoundingClientRect().top > cr.querySelector('.sacc-cur-c').getBoundingClientRect().top, [vR.right, crR.right]);
    }
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
