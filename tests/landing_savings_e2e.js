(async function () {
  // The landing page's savings section (Nestor, 20 Oct 2026: "mock up the savings for the landing page", then "THIS IS GOOD BUT
  // CHARTS + REPLAY AND BACKTESTING OFFER THE REPLAY OPTION, SO DO THE CHEAPER VERSION OF TRADINGVIEW ... AND KEEP THE FX REPLAY").
  // Checks the landing inside the app (#lp-front, LP_HTML) in English and Spanish, and the generated index.html.
  // Run: python tests/browser_test.py tests/landing_savings_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    var html = await fetch('/index.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    ok('index.html has it, before Pricing', html.indexOf('id="save"') > 0 && html.indexOf('id="save"') < html.indexOf('id="pricing"'));
    var fr; for (var i = 0; i < 100 && !(fr = document.getElementById('lp-front')); i++) await W(100);
    var w = fr && fr.contentWindow; for (i = 0; i < 100 && !(w && w.document && w.document.querySelector('#save')); i++) await W(100);
    var D = w.document; await W(800);
    var tx = function (el) { return (el && el.textContent || '').replace(/\s+/g, ' ').trim(); };
    var sec = D.getElementById('save');
    ok('between Also inside and Pricing', sec.previousElementSibling && sec.previousElementSibling.id === 'more' && sec.nextElementSibling && sec.nextElementSibling.id === 'pricing', [sec.previousElementSibling && sec.previousElementSibling.id, sec.nextElementSibling && sec.nextElementSibling.id]);
    ok('the words: Ten tools. One subscription. about £300 a month, £35, or £30 yearly; over £3,000 a year back', tx(sec.querySelector('h2')) === 'Ten tools. One subscription.' && /about £300 a month\. Here they are £35 a month, or £30 a month on the yearly plan\./.test(tx(sec.querySelector('.lede'))) && tx(sec.querySelector('.sv-num')) === 'Over £3,000' && tx(sec.querySelector('.sv-cap')) === 'a year back in your pocket', tx(sec.querySelector('.lede')));
    var li = Array.prototype.map.call(sec.querySelectorAll('.sv-bill li'), function (l) { return tx(l.querySelector('.sv-n > span')) + '|' + tx(l.querySelector('small')) + '|' + tx(l.querySelector('.sv-p')); });
    ok('ten lines: Charts is TradingView Plus £34.95 (not Premium: replay is FX Replay\'s line), FX Replay kept', li.length === 10 && li[0] === 'Charts|TradingView Plus|£34.95' && li[5] === 'Backtesting|FX Replay Pro · $35|£26.25' && !/Premium|Charts \+ replay/.test(tx(sec)), li);
    var sum = 0; sec.querySelectorAll('.sv-p').forEach(function (p) { sum += parseFloat(tx(p).replace('£', '')); });
    ok('the lines add up to the total, £300.66, struck through; 12 months of it is over £3,000 more than the £360 yearly plan', Math.abs(sum - 300.66) < 0.001 && tx(sec.querySelector('.sv-x')) === '£300.66' && getComputedStyle(sec.querySelector('.sv-x')).textDecorationLine === 'line-through' && sum * 12 - 360 > 3000 && sum * 12 - 420 > 3000, [sum.toFixed(2), (sum * 12 - 360).toFixed(2)]);
    ok('the sources line: dated, the rates, features differ', /20 October 2026/.test(tx(sec.querySelector('.sv-src'))) && /\$1 = £0\.75/.test(tx(sec.querySelector('.sv-src'))) && /Features and limits differ/.test(tx(sec.querySelector('.sv-src'))));
    var cta = sec.querySelector('.sv-cta');
    ok('the button starts the free trial (the sign-up, like the other buttons)', cta && /Start free for 14 days/.test(tx(cta)) && (cta.getAttribute('data-auth') === '1' || /app\.html/.test(cta.getAttribute('href') || '')), cta && [cta.getAttribute('href'), cta.getAttribute('data-auth')]);
    // the landing frame is hidden in this window (no layout to measure): the structure here, the layout on the screenshots
    ok('one bill, no card grid: the words first, then the bill, in a two-column grid that becomes one column under 860 px', getComputedStyle(sec.querySelector('.sv-wrap')).display === 'grid' && sec.querySelectorAll('.sv-bill').length === 1 && sec.querySelector('.sv-copy').nextElementSibling === sec.querySelector('.sv-bill') && !sec.querySelector('.mcard, .plan'));
    // Spanish
    D.querySelector('.lang-sq[data-lang="es"]').click(); await W(400);
    ok('in Spanish: Diez herramientas, unas £300 al mes, Más de £3.000, the lines named in Spanish, Discord de pago', tx(sec.querySelector('h2')) === 'Diez herramientas. Una suscripción.' && /unas £300 al mes/.test(tx(sec.querySelector('.lede'))) && tx(sec.querySelector('.sv-num')) === 'Más de £3.000' && tx(sec.querySelector('[data-i18n="sv.r1"]')) === 'Gráficos' && tx(sec.querySelector('[data-i18n="sv.s5"]')) === 'Discord de pago, desde $40' && /20 de octubre de 2026/.test(tx(sec.querySelector('.sv-src'))), tx(sec.querySelector('.lede')));
    var en = Array.prototype.filter.call(sec.querySelectorAll('[data-i18n]'), function (n) { return /^(Your trading bill|Ten tools|Bought|Over £|a year back|Start free|a month|Charts$|Trading journal|AI assistant|News alerts|Monthly prices)/.test(tx(n)); }).map(tx);
    ok('...nothing left in English', !en.length, en);
    D.querySelector('.lang-sq[data-lang="en"]').click(); await W(300);
    ok('back to English', tx(sec.querySelector('h2')) === 'Ten tools. One subscription.' && tx(sec.querySelector('[data-i18n="sv.r1"]')) === 'Charts');
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
