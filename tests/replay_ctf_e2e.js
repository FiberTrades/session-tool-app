(async function () {
  // Custom timeframes in Trade Replay (Nestor, 19 Oct 2026: "custom timeframes in Trade Replay ... ok yes please"): the + at the end of
  // the timeframes opens the same box as Back Testing's; the timeframe is built from the stored candles (2m from 1m, 3h from 1h) and
  // the list is shared with Back Testing and Live Charts. A made-up EUR/USD short on Thu 1 Oct 2026 over the real candles.
  // Run: python tests/browser_test.py tests/replay_ctf_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stReplay && window.__stSB && window.__stPractice); i++) await W(100);
    await W(1000);
    var R = window.__stReplay, PR = window.__stPractice, errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    try { PR._cfg().ctf = []; } catch (e) {}
    var trade = { mt5Ticket: 999999907, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 };
    R.open(trade); for (var k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(800);
    var tfb = document.getElementById('strp-tfbtn'); tfb.click(); await W(200);
    var seg = document.getElementById('strp-tfs'), add = seg.querySelector('[data-rtfadd]');
    ok('Trade Replay\'s timeframes end with a +', add && add.offsetWidth > 0 && seg.lastElementChild === add, seg.textContent);
    add.click(); await W(150);
    var box = document.getElementById('strp-tfbox');
    ok('+ opens the box: Custom timeframe, a number, minutes or hours, Add, shared with Back Testing and Live Charts', box && /Custom timeframe/.test(box.textContent) && box.querySelector('#strp-tfn') && box.querySelector('[data-rtfok]') && /Shared with Back Testing/.test(box.textContent), box && box.textContent);
    box.querySelector('#strp-tfn').value = '2'; box.querySelector('[data-rtfok]').click();
    var S; for (k = 0; k < 80; k++) { await W(150); S = R._s(); if (S && S.tf === 2 && S.bars && S.bars.length > 20) break; }
    var gaps = {}; for (k = 1; k < S.bars.length; k++) { var g = S.bars[k].time - S.bars[k - 1].time; gaps[g] = (gaps[g] || 0) + 1; }
    ok('Add: the replay is on 2m - candles 2 minutes apart, from the 1-minute ones; the button says 2m', S.tf === 2 && gaps[120] > 50 && S.bars.every(function (b) { return b.time % 120 === 0; }) && document.getElementById('strp-tfcur').textContent === '2m', [S.tf, gaps, document.getElementById('strp-tfcur').textContent]);
    ok('...kept in the shared list (Back Testing and Live Charts have it too), and in the row between 1m and 5m', JSON.stringify(PR.ctfList()) === '[2]' && Array.prototype.map.call(seg.querySelectorAll('button[data-tf]'), function (b) { return b.textContent; }).slice(0, 3).join(' ') === '1m 2m 5m', [PR.ctfList(), seg.textContent]);
    seg.querySelector('[data-rtfadd]').click(); await W(150); box = document.getElementById('strp-tfbox');
    box.querySelector('[data-rtfu="60"]').click(); box.querySelector('#strp-tfn').value = '3';
    box.querySelector('#strp-tfn').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    for (k = 0; k < 80; k++) { await W(150); S = R._s(); if (S && S.tf === 180 && S.bars && S.bars.length > 5) break; }
    ok('3 hours (Enter adds too): 3h candles, 3 hours apart, from the 1-hour ones', S.tf === 180 && S.bars.filter(function (b, j) { return j && b.time - S.bars[j - 1].time === 10800; }).length > S.bars.length / 2 && document.getElementById('strp-tfcur').textContent === '3h', [S.tf, S.bars.length]);
    seg.querySelector('[data-rtfadd]').click(); await W(150); box = document.getElementById('strp-tfbox');
    ok('the box lists yours: 2m and 3h with an x, 3h marked', box.querySelectorAll('[data-rtfpick]').length === 2 && box.querySelector('.stpr-tfci.on [data-rtfpick="180"]'), box.textContent);
    box.querySelector('[data-rtfx="180"]').click();
    for (k = 0; k < 80; k++) { await W(150); S = R._s(); if (S && S.tf === 60 && S.bars && S.bars.length > 5) break; }
    ok('x on 3h (on the replay): it goes, the replay moves to 1h; 2m stays', S.tf === 60 && JSON.stringify(PR.ctfList()) === '[2]' && !seg.querySelector('button[data-tf="180"]'), [S.tf, PR.ctfList()]);
    ok('no page errors', !errs.length, errs.slice(0, 4));
    try { PR._cfg().ctf = []; } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
