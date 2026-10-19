(async function () {
  // Compare in Trade Replay (batch C, Nestor, 19 Oct 2026: "build all the tradingview suggestions!"; what Back Testing gets goes to
  // Trade Replay too): a stored symbol over the trade's chart, a thin line of its closes rebased at the first candle on screen,
  // never past the replay's candle; its legend under the P&L line; x takes it off; kept in this browser.
  // A made-up EUR/USD short on Thu 1 Oct 2026 over the real shared candles (signed out).
  // Run: python tests/browser_test.py tests/replay_cmp_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stReplay && window.__stSB && window.__stPractice); i++) await W(100);
    await W(1000);
    var R = window.__stReplay, errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    try { localStorage.removeItem('st_replay_cmp'); window.__stPractice._cfg().look = {}; } catch (e) {}
    var trade = { mt5Ticket: 999999905, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 };
    R.open(trade); for (var k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(800);
    var S = R._s(), cb = document.getElementById('strp-cmpbtn'), tfb = document.getElementById('strp-tfbtn');
    ok('a Compare button after the timeframe', cb && cb.offsetWidth > 0 && cb.previousElementSibling && cb.previousElementSibling.id === 'strp-tfs' && /Compare symbol/.test(cb.title), cb && cb.title);
    cb.click(); for (k = 0; k < 60 && !document.querySelector('#strp-menu [data-rcadd]'); k++) await W(100);
    var mn = document.getElementById('strp-menu'), adds = Array.prototype.map.call(mn.querySelectorAll('[data-rcadd]'), function (b) { return b.getAttribute('data-rcadd'); });
    ok('its menu: the stored symbols, not EUR/USD itself', mn.classList.contains('show') && adds.indexOf('XAUUSD') >= 0 && adds.indexOf('EURUSD') < 0 && cb.getAttribute('aria-expanded') === 'true', adds);
    var q = mn.querySelector('#strp-cmpq'); q.value = 'xau'; q.dispatchEvent(new Event('input', { bubbles: true })); await W(40);
    ok('its search: "xau" leaves gold', Array.prototype.map.call(mn.querySelectorAll('[data-rcadd]'), function (b) { return b.getAttribute('data-rcadd'); }).join() === 'XAUUSD');
    mn.querySelector('[data-rcadd="XAUUSD"]').click();
    var c = null; for (k = 0; k < 80; k++) { await W(150); c = S.cmpS && S.cmpS.XAUUSD; if (c && !c.wait && !c.none) break; }
    ok('gold compared: kept (st_replay_cmp), its candles in, a line on the chart', c && !c.none && JSON.parse(localStorage.getItem('st_replay_cmp')).length === 1 && c.s, c && { wait: c.wait, none: c.none });
    var data = function () { return c.s.data ? c.s.data() : null; };
    var rows = S.cmpC['XAUUSD|' + S.tf], lastT = S.bars[S.cursor - 1].time, dl = data();
    ok('never past the replay\'s candle: its last point is the replay\'s candle (and ' + S.cursor + ' candles shown)', dl && dl.length && dl[dl.length - 1].time === lastT && dl.every(function (p) { return p.time <= lastT; }), dl && [dl.length, dl[dl.length - 1], lastT]);
    var r = S.chart.timeScale().getVisibleLogicalRange(), i0 = Math.max(0, Math.ceil(r.from)), b0 = S.bars[i0], g0 = rows.filter(function (x) { return x.time <= b0.time; }).pop();
    var at0 = dl.filter(function (p) { return p.time === b0.time; })[0];
    ok('rebased at the first candle on screen: level with it there', at0 && Math.abs(at0.value - b0.close) < 1e-9, [at0, b0.close]);
    var gl = rows.filter(function (x) { return x.time <= lastT; }).pop(), want = b0.close * gl.close / g0.close;
    ok('then gold\'s own change from there: (its close / its first close) x the chart\'s first close', Math.abs(dl[dl.length - 1].value - want) < 1e-9, [dl[dl.length - 1].value, want]);
    var lg = document.getElementById('strp-cmpl'), lv = document.getElementById('strp-live');
    ok('its legend under the P&L line: EURUSD and gold, each with its change, x', lg && /^EURUSD[+−]\d+\.\d\d%XAUUSD[+−]\d+\.\d\d%×$/.test(lg.textContent) && lg.getBoundingClientRect().top >= lv.getBoundingClientRect().bottom, lg && lg.textContent);
    document.getElementById('strp-fwd').click(); await W(300);
    var dl2 = data();
    ok('a step on: the line takes the next candle too, still no further', dl2[dl2.length - 1].time === S.bars[S.cursor - 1].time && dl2[dl2.length - 1].time > lastT, [dl2[dl2.length - 1].time, S.bars[S.cursor - 1].time]);
    // another timeframe: its candles of that timeframe
    tfb.click(); await W(200); document.querySelector('#strp-tfs [data-tf="5"]').click();
    for (k = 0; k < 80; k++) { await W(150); c = S.cmpS.XAUUSD; if (S.tf === 5 && c && !c.wait && !c.none) break; }
    var d5 = data();
    ok('on 5m: gold\'s 5-minute closes, to the replay\'s candle', S.tf === 5 && d5 && d5.length > 10 && d5[d5.length - 1].time === S.bars[S.cursor - 1].time && S.cmpC['XAUUSD|5'], [S.tf, d5 && d5.length]);
    lg.querySelector('[data-rcx="XAUUSD"]').click(); await W(200);
    ok('x takes it off: no line, no legend, not kept', !(S.cmpS && S.cmpS.XAUUSD) && !document.getElementById('strp-cmpl') && JSON.parse(localStorage.getItem('st_replay_cmp')).length === 0);
    ok('no page errors', errs.length === 0, errs);
    R.close(); try { localStorage.removeItem('st_replay_cmp'); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
