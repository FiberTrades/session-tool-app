(async function () {
  // Timeframes and ranges in Spanish as TradingView has them (Nestor, 29 Oct 2026: "when in spanish should these TFs be also in spanish?"):
  // W is S (semana), Y is A (año), All is Todo; D, M, YTD, h and m stay. Replay's own timeframe strip and Trade Replay's buttons, in English and
  // in Spanish. (The platform's top bar, its ranges and Spread are checked in platform_e2e.)
  // Run: python tests/browser_test.py tests/tf_es_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stReplay && window.__stTfEs && typeof setLanguage === 'function'); i++) await W(100);
    await W(800);
    var E = window.__stTfEs;
    setLanguage('es'); await W(400);
    var m = ['1m', '15m', '4h', 'D', '1D', 'W', '1W', '12M', '1M', '3M', 'YTD', '1Y', 'All'].map(E);
    ok('Spanish: m, h, D, M and YTD as they are; W -> S, 1Y -> 1A, All -> Todo', m.join(' ') === '1m 15m 4h D 1D S 1S 12M 1M 3M YTD 1A Todo', m);
    setLanguage('en'); await W(400);
    ok('English: as they were', ['W', '1Y', 'All'].map(E).join(' ') === 'W 1Y All');
    // Trade Replay: its own timeframe buttons
    var R = window.__stReplay;
    R.open({ mt5Ticket: 999999931, symbol: 'EURUSD', side: 'long', entryPrice: 1.16, closePrice: 1.161, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 });
    for (var k = 0; k < 150 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length && document.querySelector('#strp-tfs button[data-tf="10080"]')); k++) await W(100); await W(500);
    var wk = function () { var b = document.querySelector('#strp-tfs button[data-tf="10080"]'); return b && b.textContent.trim(); }, dy = function () { var b = document.querySelector('#strp-tfs button[data-tf="1440"]'); return b && b.textContent.trim(); };
    ok('Trade Replay in English: D and W', dy() === 'D' && wk() === 'W', [dy(), wk()]);
    setLanguage('es'); await W(600); try { window.dispatchEvent(new Event('resize')); } catch (e) {} await W(400);
    for (k = 0; k < 20 && wk() !== 'S'; k++) { try { R._s() && R._render && R._render(); } catch (e) {} await W(150); }
    ok('Trade Replay in Spanish: D and S', dy() === 'D' && wk() === 'S', [dy(), wk()]);
    setLanguage('en'); await W(400);
    try { R.close(); } catch (e) {} await W(300);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { setLanguage('en'); } catch (e) {}
  return out;
})()
