(async function () {
  // Settings -> Accounts, the opened account in titled sections (25 Oct 2026, Nestor's go on the mockup): Overview, Account, MT5, Risk
  // rules, Payouts (prop firm only; the Order rules section went on 27 Oct 2026). The name, starting balance and payout share are changed in place (no Rename dialog,
  // no stage picker, no Options menu); Type is Personal | Prop firm | Test; a switch to prop firm asks for the stage in its own row.
  // Run: python tests/browser_test.py tests/accsections_e2e.js   (and E2E_MOBILE=375x812 for the phone)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stAccFill && window.__stRules && document.getElementById('settings-gear')); i++) await W(100);
    await W(1500);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"], .st-greet-pop').forEach(function (e) { e.remove(); });
    var D = STCloud.getData(), a1 = D.accounts[0];
    a1.name = 'FTMO 70K - Challenge'; a1.kind = 'challenge'; a1.program = '2step'; a1.startingBalance = 70000; a1.createdAt = '2026-08-25T09:00:00.000Z'; a1.payouts = []; a1.payoutSplit = 90;
    a1.riskRules = { maxDrawdownMode: 'pct', maxDrawdownPct: 10, ddType: 'static', firmDailyMode: 'pct', firmDailyPct: 5, profitTargetMode: 'pct', profitTargetPct: 10,
                     maxLossMode: 'amount', maxLossAmount: 900, maxTrades: 1, maxRiskMode: 'amount', maxRiskAmount: 900 };
    var a2 = { id: 'acc_s_10k', name: 'FTMO 10K - Challenge', status: 'active', kind: 'challenge', startingBalance: 10000, createdAt: '2026-09-02T09:00:00.000Z', riskRules: {} };
    var a3 = { id: 'acc_s_ic', name: 'IC Markets', status: 'active', kind: 'personal', startingBalance: 5000, createdAt: '2026-10-01T09:00:00.000Z', riskRules: {} };
    D.accounts = [a1, a2, a3]; D.activeAccountId = a1.id;
    window.currentUser = { id: '00000000-0000-0000-0000-0000000000a7', email: 'member@example.com' };
    D.mt5LoginMap = { '541419576': a1.id };
    window.__stEA.apply({ login: '541419576', symbol: 'EURUSD', ea_version: '9.15', updated_at: new Date().toISOString(), settings: { risk_money: 900, max_trades_day: 1, currency: 'GBP', company: 'FTMO Global Markets Ltd', server: 'FTMO-Server4', start_bal: 70000 } });
    window.__stAccOpenId = a1.id;
    document.getElementById('settings-gear').click(); await W(700);
    document.querySelector('#settings-modal-bg .settings-nav-item[data-section="accounts"]').click(); await W(700);
    window.renderSettingsAccountsList(); await W(500);
    var item = function (id) { return document.querySelector('#settings-accounts-list .sacc-item[data-account-id="' + id + '"]'); };
    var it = item(a1.id), body = it.querySelector('.sacc-body');
    var heads = [].map.call(body.querySelectorAll(':scope > .sx'), function (x) { return x.hidden ? '' : ((x.querySelector('.sx-h h4') || x.querySelector('.ru-block > .sacc-sub > span') || {}).textContent || '?'); }).filter(Boolean);
    ok('the opened account: Overview, Account, MT5, Risk rules, Payouts', heads.join(' / ') === 'Overview / Account / MT5 / Risk rules / Payouts', heads);
    var ov = body.querySelector('[data-sx="overview"]');
    ok('Overview: the balance, the profit, the daily loss left (your £900 stop, the firm\'s £3,500), its chips; FTMO 2-Step · Challenge', /Balance£70,000\.00/.test(ov.textContent) && /Profit£0\.00/.test(ov.textContent) && /Daily loss left£900\.00Your stop · firm limit £3,500\.00/.test(ov.textContent) && /Prop firm/i.test(ov.querySelector('.sx-chips').textContent) && /FTMO 2-Step · Challenge/.test(ov.querySelector('.sx-k').textContent), ov.textContent);
    ok('no Options menu, no Rename dialog', !it.querySelector('.sacc-more') && !document.getElementById('settings-rename-modal-bg') && typeof window.openRenameModal === 'undefined');
    var acs = body.querySelector('[data-sx="account"]'), rows = [].map.call(acs.querySelectorAll('.set-row .settings-label'), function (l) { return l.textContent; });
    ok('Account: Name, Type, Program, Stage, Firm and server, Currency, Starting balance, Opened, Archive or delete', rows.join(' / ') === 'Name / Type / Program / Stage / Firm and server / Currency / Starting balance / Opened / Archive or delete', rows);
    ok('...Type is Personal | Prop firm | Test', [].map.call(acs.querySelectorAll('.settings-acct-kind .sak-opt'), function (b) { return b.textContent.trim(); }).join(' | ') === 'Personal | Prop firm | Test');
    ok('...firm and server read from MT5: FTMO · FTMO-Server4, started with 70,000 GBP', /FTMO · FTMO-Server4/.test(acs.querySelector('[data-slot="facts"]').textContent) && /70,000 GBP/.test(acs.textContent));
    ok('...opened 25 Aug 2026', /25 Aug 2026/.test(acs.textContent));
    ok('MT5\'s heading says its login; Risk rules\' the program', /541419576/.test(body.querySelector('[data-slot="mt5k"]').textContent) && /FTMO 2-Step/.test(body.querySelector('[data-slot="rulesk"]').textContent));
    ok('Risk rules ends with "Close trades opened elsewhere while locked", on (the one order rule left)', /Close trades opened elsewhere while locked/.test(body.querySelector('[data-sx="rules"] .ru-block').textContent) && body.querySelector('[data-sx="rules"] [data-ru="closeElsewhere"]').checked);
    var po = body.querySelector('[data-sx="payouts"]');
    ok('Payouts: his own share, 90%, in its heading', !po.hidden && /Your share 90%/.test(po.querySelector('.sx-kbtn').textContent), po.textContent);

    // ---- the name, in place
    var pen = function (k) { return item(a1.id).querySelector('[data-sx-edit="' + k + '"]'); }, box = function () { return document.querySelector('#settings-accounts-list .sx-in'); };
    var key = function (el, k) { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); };
    pen('name').click(); await W(150);
    ok('the name\'s pencil: a box with the name in it, and Save', box() && box().value === 'FTMO 70K - Challenge' && item(a1.id).querySelector('[data-sx-row="name"] .sx-ok'));
    box().value = 'FTMO 10K - Challenge'; key(box(), 'Enter'); await W(200);
    ok('another account\'s name: said under it, nothing renamed, the box stays', a1.name === 'FTMO 70K - Challenge' && box() && /already/i.test(item(a1.id).querySelector('[data-sx-row="name"] .settings-hint').textContent), item(a1.id).querySelector('[data-sx-row="name"] .settings-hint').textContent);
    key(box(), 'Escape'); await W(200);
    ok('Escape: as it was', !box() && a1.name === 'FTMO 70K - Challenge' && /FTMO 70K - Challenge/.test(item(a1.id).querySelector('.sx-name').textContent));
    pen('name').click(); await W(150);
    box().value = 'FTMO Main - Challenge'; key(box(), 'Enter'); await W(300);
    ok('Enter: renamed - the line and the box say so, the stage kept', a1.name === 'FTMO Main - Challenge' && /FTMO Main - Challenge/.test(item(a1.id).querySelector('.sacc-head').textContent) && !box() && item(a1.id).querySelector('[data-sacc-stage="Challenge"]').getAttribute('aria-pressed') === 'true', a1.name);
    // ---- the starting balance
    pen('start').click(); await W(150);
    ok('the starting balance\'s pencil: a box with 70000', box() && box().value === '70000');
    box().value = '75000'; box().blur(); await W(300);
    ok('leaving the box saves it: £75,000.00', a1.startingBalance === 75000 && /£75,000\.00/.test(item(a1.id).querySelector('[data-sx-row="start"]').textContent), a1.startingBalance);
    a1.startingBalance = 70000; window.renderSettingsAccountsList(); await W(300);
    // ---- the payout share
    item(a1.id).querySelector('[data-sx-edit="split"]').click(); await W(150);
    ok('Your share\'s pencil: a box with 90', box() && box().value === '90');
    box().value = '85'; key(box(), 'Enter'); await W(300);
    ok('85: the share is 85%', a1.payoutSplit === 85 && /Your share 85%/.test(item(a1.id).querySelector('.sx-kbtn').textContent), a1.payoutSplit);
    item(a1.id).querySelector('[data-sx-edit="split"]').click(); await W(150); box().value = '90'; key(box(), 'Enter'); await W(300);
    ok('...and back to 90', a1.payoutSplit === 90);
    // ---- archive: the row's button asks first
    item(a1.id).querySelector('[data-action="archive"]').click(); await W(300);
    var cm = document.getElementById('settings-confirm-modal-bg');
    ok('Archive asks first (nothing archived yet)', cm.classList.contains('show') && a1.status === 'active');
    document.getElementById('settings-confirm-cancel').click(); await W(200);

    // ---- a personal account marked prop firm: the stage asked in its own row, no dialog
    item(a3.id).querySelector('.sacc-head').click(); await W(400);
    var b3 = item(a3.id).querySelector('.sacc-body');
    ok('a personal account: no Stage, no Payouts; Overview says Personal', !b3.querySelector('[data-sacc-stage]') && b3.querySelector('[data-sx="payouts"]').hidden && /Personal/.test(b3.querySelector('[data-slot="ovk"]').textContent));
    var shown = function () { return [].map.call(document.querySelectorAll('.modal-bg.show'), function (e) { return e.id; }).join(','); }, pre = shown();
    b3.querySelector('.sak-opt[data-kind="challenge"]').click(); await W(500);
    b3 = item(a3.id).querySelector('.sacc-body');
    var stageRow = function () { return [].filter.call(item(a3.id).querySelectorAll('[data-slot="stage"] .set-row'), function (r) { return !!r.querySelector('[data-sacc-stage]'); })[0]; };
    var ask = stageRow(); if (ask && !ask.classList.contains('sacc-ask')) ask = null;
    ok('Prop firm: its Stage row asks "Which stage is it in?", Payouts shown, no dialog', a3.kind === 'challenge' && ask && /Which stage is it in\?/.test(ask.textContent) && !b3.querySelector('[data-sx="payouts"]').hidden && shown() === pre, [a3.kind, b3.querySelector('[data-sx="payouts"]').hidden, pre, shown()]);
    ask.querySelector('[data-sacc-stage="Challenge"]').click(); await W(400);
    ok('...Challenge: it goes in its name', a3.name === 'IC Markets - Challenge' && !stageRow().classList.contains('sacc-ask'), a3.name);
    try { document.querySelectorAll('.undo-toast, .st-toast, .toast').forEach(function (t) { t.remove(); }); } catch (e) {}

    // ---- the phone: nothing wider than its section
    item(a1.id).querySelector('.sacc-head').click(); await W(500);
    var wide = [].slice.call(item(a1.id).querySelectorAll('.sx .set-row, .sx-tile, .sx-h')).filter(function (r) { return r.scrollWidth > r.clientWidth + 2 || r.getBoundingClientRect().right > r.closest('.sx').getBoundingClientRect().right + 1; });
    var segs = [].slice.call(item(a1.id).querySelectorAll('.sx .sacc-seg button, .sx .sak-opt')).filter(function (b) { return b.scrollWidth > b.clientWidth + 1; });
    ok('nothing wider than its box, no label cut in a switch (' + innerWidth + 'px)', wide.length === 0 && segs.length === 0, [wide.map(function (r) { return r.textContent.slice(0, 30); }), segs.map(function (b) { return b.textContent; })]);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
