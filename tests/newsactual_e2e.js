(async function () {
  // A release's figure reaches the charts' news discs as it lands (Nestor, 23 Oct 2026: "make sure the news dots on the charts are
  // updated instantly and dont rely on me having to manually reload the charts for the actual numbers to show up"). A made-up red
  // release five minutes ago on Live Charts (signed out, the real shared candles), its card open, then its figure handed over the
  // way the calendar hands it (newsActuals) - no reload.
  // Run: python tests/browser_test.py tests/newsactual_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stLC); i++) await W(100);
    await W(800);
    var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    ok('the calendar hands every read of the figures to the charts', /window\.__stPractice\._newsActuals\(rows\)/.test(html));
    // \r?: a Windows checkout serves app.html with CRLF line ends (29 Oct 2026: the check failed on every such copy; the clock still asks)
    ok('Live Charts\' clock asks for figures every second it runs', /\r?\n    newsTick\(\);   \/\/ a release's figure as it lands\r?\n    lvTrTick\(\);/.test(html));

    var P = window.__stPractice, C = P._cfg(); C.layout = 1; C.tfs = [15, 60, 240, 5]; C.syms = []; C.mini = false; C.max = false;
    window.__stLcForce = true;
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (i = 0; i < 250 && !(P._s() && P._s().live && P._panes().length && P._panes()[0].n > 50); i++) await W(100);
    await W(800);
    var S = P._s(), p = P._panes()[0], N = P._newsState();
    var at = new Date(Math.min(Date.now(), S.now * 1000) - 5 * 60000); at.setSeconds(0, 0);
    N.key = S.day; N.at = Date.now();
    N.rows = [{ at: at.toISOString().replace('.000Z', '+00:00'), currency: 'USD', title: 'Test CPI m/m', impact: 'High', forecast: '0.3%', previous: '0.2%', actual: null }];
    for (i = 0; i < 30 && !(p._news && p._news.length); i++) { try { P._settle(); } catch (e) {} await W(150); }
    ok('the release has its disc on the chart', p._news && p._news.length === 1, p._news && p._news.length);
    var card = P._newsCard(0, 0);
    ok('its card open: no figure yet (Actual —)', /Actual—/.test(card || ''), card);
    ok('a red release 5 minutes old without its figure: looked for every 15 seconds', P._newsEvery() === 15000, P._newsEvery());

    var n = P._newsActuals([{ at: at.toISOString(), currency: 'USD', title: 'Test CPI m/m', actual: '0.4%' }]);
    await W(200);
    ok('the figure handed over is taken (one row changed)', n === 1, n);
    var card2 = p.card ? p.card.textContent : '';
    ok('...and the open card shows it at once (Actual 0.4%), no reload', /Actual0\.4%/.test(card2) && p.card.style.display === 'block', card2);
    ok('the disc stays on its candle', p._news && p._news.length === 1);
    ok('with its figure in, only a corrected figure is looked for (every 5 minutes for 4 hours)', P._newsEvery() === 300000, P._newsEvery());
    ok('the same figure again changes nothing', P._newsActuals([{ at: at.toISOString(), currency: 'USD', title: 'Test CPI m/m', actual: '0.4%' }]) === 0);
    ok('another release\'s figure is not mixed in', P._newsActuals([{ at: at.toISOString(), currency: 'EUR', title: 'Test CPI m/m', actual: '9.9%' }]) === 0 && N.rows[0].actual === '0.4%', N.rows[0].actual);
    P._newsCard(0, null);
    N.rows = []; N.key = null;
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  window.__stLcForce = false;
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
