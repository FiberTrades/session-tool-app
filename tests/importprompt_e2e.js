(async function () {
  // The import prompt (Nestor, 30 Oct 2026: "i was never prompted today to import my trades, i had to press auto sync trades"): two copied trades closed in the middle of his session, with
  // Live Charts in its own window. Run: python tests/browser_test.py tests/importprompt_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var stage = null;
  try {
    for (var i = 0; i < 100 && typeof newAccountBlank !== 'function'; i++) await W(100);
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
    var A = newAccountBlank('FTMO 70K', 70000, 'challenge'); A.kind = 'challenge';
    data.accounts = [A]; data.activeAccountId = A.id; data.viewScope = 'lifetime'; data.currentSeries = []; data.history = []; rebuildSeriesByDate();
    var close = new Date(Date.now() - 300000).toISOString(), openT = new Date(Date.now() - 2400000).toISOString();
    var row = function (tk, lg) { return { ticket: tk, symbol: 'EURUSD', direction: 'buy', lots: 1, entry_price: 1.1, exit_price: 1.1012, open_time: openT, close_time: close, pnl: 12.4, risk_gbp: 500, login: lg, consumed_at: null }; };
    var ROWS = [row(179686904, 541419576), row(1900728, 1009000)], rows = [];   // nothing until the stage is set: the app's own looks at load must not answer first
    STCloud.pullInbox = function () { return Promise.resolve({ data: rows }); };
    var shown = function () { var e = document.getElementById('toast'); return !!(e && e.classList.contains('show') && /ready to import/.test(e.textContent)); };
    var ask = async function () { for (var k = 0; k < 90 && !shown(); k++) { window.__stMaybePromptAutoSync('poll'); await W(300); } };   // a look already under way at load holds the next one back
    var liveReal = window.isSessionLive; window.isSessionLive = function () { return true; };
    var openNow = [{ ticket: 1 }];
    var liveObj = window.__stLive, oReal = liveObj.openList; liveObj.openList = function () { return openNow; };
    rows = ROWS; window.__stMaybePromptAutoSync('poll'); await W(200); rows = [];
    ok('in the session with a trade still open: no prompt yet', !shown());
    // his morning: both trades closed, nothing open, still inside the session, Live Charts in its own window
    openNow = [];
    stage = window.open('about:blank', 'st_stage_test', 'width=800,height=500');
    for (var q = 0; q < 100 && !(window.__stPractice && window.__stPractice._lv); q++) await W(100);   /* the charts' code arrives a moment after the app */
    var lv = window.__stPractice._lv(), satReal = lv.sat; lv.sat = stage; rows = ROWS;
    await W(200);
    await ask();
    ok('in the session, flat: the prompt comes, for both trades', shown() && /2 synced/.test(document.getElementById('toast').textContent), document.getElementById('toast').textContent);
    var card = stage.document.getElementById('st-import-ask');
    var cr = card && card.getBoundingClientRect(), cw = stage.innerWidth, ch = stage.innerHeight;
    ok('3 Nov 2026: in the middle of Live Charts\' window, not at the bottom', !!cr && Math.abs((cr.left + cr.right) / 2 - cw / 2) <= 2 && Math.abs((cr.top + cr.bottom) / 2 - ch / 2) <= 2, cr && [cr.left, cr.right, cr.top, cr.bottom, cw, ch]);
    ok('...and in the Live Charts window too, where he is looking', !!card && /2 synced/.test(card.textContent), card && card.textContent);
    var cb = card && card.getBoundingClientRect();
    ok('...fully on screen in that window', cb && cb.left >= 0 && cb.right <= stage.innerWidth && cb.bottom <= stage.innerHeight, cb && [cb.left, cb.right, cb.bottom, stage.innerWidth, stage.innerHeight]);
    var calls = 0, btns = card ? card.querySelectorAll('button') : [];
    var mod = document.getElementById('mt5-modal-bg');
    if (btns[1]) btns[1].click(); await W(500);
    ok('Close there closes both', !shown() && !stage.document.getElementById('st-import-ask'));
    window.__stMaybePromptAutoSync('poll'); await W(300);
    ok('the same trades are not asked about again', !shown());
    await W(15600);   // the prompt's own 15 s latch
    rows = rows.concat([row(179686999, 541419576)]); await W(50);
    await ask();
    var card2 = stage.document.getElementById('st-import-ask');
    ok('a new close asks again', shown() && !!card2, { card: card2 && card2.textContent, toast: document.getElementById('toast').className + ' | ' + document.getElementById('toast').textContent });
    if (card2) card2.querySelectorAll('button')[0].click(); await W(800);
    ok('Import there opens the import window in the app and clears the prompt', !shown() && !stage.document.getElementById('st-import-ask') && !!document.querySelector('#mt5-modal-bg.show'), [].map.call(document.querySelectorAll('.modal-bg.show'), function (x) { return x.id; }));
    lv.sat = satReal; liveObj.openList = oReal; window.isSessionLive = liveReal;
  } catch (e) { out.push({ name: 'test ran', ok: false, got: String(e && e.stack || e) }); }
  try { if (stage) stage.close(); } catch (e) {}
  return out;
})()
