// End-to-end test: Trade Replay in the Charts platform's look (26 Oct 2026, Nestor: "i am guessing trade replay will also adopt the new
// improved look of the charts correct?"). A journal trade replayed on a computer: TradingView's chart-only layout - the symbol, the side,
// the timeframes and the playback in one top bar, the drawing tools down the left, the chart with the trade's marks, the progress along
// the bottom; no Trade Manager, no Positions. A made-up EUR/USD short on Thu 1 Oct 2026 over the real shared candles (signed out).
// On a phone's screen Trade Replay keeps its own layout, in the platform's colours.
//   python tests/trade_replay_plat_run.py      (a computer dark and light, a small laptop, then a phone dark and light)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    window.__stPlatOff = false;
    for (var i = 0; i < 200 && !(window.__stReplay && window.__stSB && window.__stPractice); i++) await W(100);
    await W(1000);
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var R = window.__stReplay, PR = window.__stPractice, LT = !!window.__RP_LT, phoneNow = innerWidth < 760, $ = function (s) { return document.querySelector(s); };
    try { var C = PR._cfg(); C.look = {}; delete C.lookDk; delete C.lookTh; C.plLt = false; } catch (e) {}
    var trade = { mt5Ticket: 999999904, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 };
    var openIt = async function () { R.open(trade); for (var k = 0; k < 150 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(1200); };
    await openIt();
    var mb = $('#strp-modal-bg'), card = $('#strp-modal-bg .strp-card'), vis = function (el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    ok('Trade Replay is open on the trade', mb.classList.contains('show') && R._s() && R._s().bars.length > 0);

    if (phoneNow) {   // ---- a phone: as it was ----
      ok('a phone: its own layout, not the computer\'s', !card.classList.contains('strp-pl'), card.className);
      ok('a phone: Play in the bar under the chart', !!$('#strp-ct #strp-play') && vis($('#strp-play')));
      ok('a phone: in the platform\'s colours', card.classList.contains('strp-plsk') && getComputedStyle(card).backgroundColor === 'rgb(19, 23, 34)', [card.className, getComputedStyle(card).backgroundColor]);
      if (LT) { PR._cfg().plLt = true; $('#strp-close').click(); await W(300); await openIt(); ok('a phone, the light theme: light', card.classList.contains('strp-pllt') && getComputedStyle(card).backgroundColor === 'rgb(255, 255, 255)', getComputedStyle(card).backgroundColor); }
      ok('no errors', !errs.length, errs);
      return JSON.stringify(out);
    }

    var cr = card.getBoundingClientRect();
    ok('a computer: the platform\'s look, nearly the whole screen', card.classList.contains('strp-pl') && cr.width >= Math.min(1500, innerWidth - 40) && cr.height >= Math.min(900, innerHeight - 40), [card.className, Math.round(cr.width), Math.round(cr.height)]);
    ok('its old header is gone', !vis($('.strp-head')));
    var top = $('#strp-tb'), tr = top.getBoundingClientRect(), inTop = function (s) { var el = $(s); return !!el && top.contains(el) && !(el.closest('.strp-plleft')) && vis(el); };
    var want = ['.strp-plmark', '#strp-sym', '#strp-side', '#strp-tfs', '#strp-back', '#strp-play', '#strp-fwd', '#strp-spd', '.strp-tjg', '.strp-res', '#strp-undo', '#strp-layersbtn', '#strp-snapbtn', '#strp-lookbtn', '.strp-plth', '#strp-fs', '#strp-close'];
    ok('the top bar: the mark, the symbol, the side, the timeframes, the playback, the result, the chart\'s tools, full screen and close', want.every(inTop), want.filter(function (s) { return !inTop(s); }));
    var xs = ['#strp-sym', '#strp-tfs', '#strp-play', '.strp-res', '#strp-close'].map(function (s) { return $(s).getBoundingClientRect().left; });
    ok('in that order, left to right', xs.every(function (x, j) { return !j || x > xs[j - 1]; }), xs.map(Math.round));
    var over = []; Array.prototype.forEach.call(top.querySelectorAll('*'), function (e) { if (e.closest('.strp-plleft, #strp-menu, #strp-tgls, .strp-spdmenu, .stpr-tfl, .strp-tfbox')) return; var r = e.getBoundingClientRect(); if (r.width && r.height && (r.right > tr.right + 1 || r.left < tr.left - 1)) over.push(e.id || e.className); });
    ok('nothing in the top bar runs past it', !over.length, over.slice(0, 6));
    ok('the timeframes as a row of buttons, the chart\'s one lit', $('#strp-tfs').querySelectorAll('button').length >= 6 && !!$('#strp-tfs button.on') && !vis($('#strp-tfbtn')));
    var left = $('.strp-plleft'), lr = left && left.getBoundingClientRect(), cw = $('#strp-cw').getBoundingClientRect();
    ok('the drawing tools down the left, beside the chart', left && vis($('#strp-tools')) && left.contains($('#strp-tools')) && lr.right <= cw.left + 1 && Math.abs(lr.top - cw.top) < 3 && Math.abs(lr.bottom - cw.bottom) < 3, lr && [Math.round(lr.top), Math.round(lr.bottom), Math.round(cw.top), Math.round(cw.bottom)]);
    ok('hide, lock, the magnet, the tree and the bin under them', ['#strp-hideall', '#strp-lockall', '#strp-magnet', '#strp-treebtn', '#strp-del'].every(function (s) { return left.contains($(s)) && vis($(s)) && $(s).getBoundingClientRect().top > $('#strp-tools').getBoundingClientRect().bottom - 1; }));
    ok('the chart fills the middle', cw.height > cr.height - 110 && $('#strp-chart').getBoundingClientRect().height >= cw.height - 2, [Math.round(cw.height), Math.round(cr.height)]);
    var ct = $('#strp-ct'), ctr = ct.getBoundingClientRect();
    ok('along the bottom: the moment, the progress, the time', ct.contains($('#strp-date')) && vis($('#strp-scrub')) && vis($('#strp-clock')) && ctr.height <= 34 && ctr.bottom <= cr.bottom, Math.round(ctr.height));
    ok('no Trade Manager, no Positions', !card.querySelector('.stpr-mm, .pl-mm, .lc-tb, #lc-tb'));

    // ---- it works from there ----
    var tf0 = R._s().tf, b5 = Array.prototype.filter.call($('#strp-tfs').querySelectorAll('button'), function (b) { return b.textContent.trim() === '5m'; })[0];
    b5.click(); for (var w = 0; w < 60 && R._s().tf !== 5; w++) await W(100); await W(300);
    ok('a timeframe button changes the chart\'s', R._s().tf === 5 && b5.classList.contains('on'), [tf0, R._s().tf]);
    var b1 = Array.prototype.filter.call($('#strp-tfs').querySelectorAll('button'), function (b) { return b.textContent.trim() === '1m'; })[0]; b1.click(); for (w = 0; w < 60 && R._s().tf !== 1; w++) await W(100); await W(300);
    $('#strp-play').click(); await W(600);
    ok('Play plays', R._s().playing === true);
    $('#strp-play').click(); await W(200);
    ok('and pauses', !R._s().playing);
    var g = left.querySelector('.stpr-tg .stpr-tgc'); g.click(); await W(250);
    var fl = left.querySelector('.stpr-tg.open .stpr-tfl'), flr = fl && fl.getBoundingClientRect();
    ok('a tool group opens to the right of the column', fl && vis(fl) && flr.left >= lr.right - 1, flr && [Math.round(flr.left), Math.round(lr.right)]);
    g.click(); await W(150); document.body.click(); await W(100);
    $('#strp-treebtn').click(); await W(300);
    var mn = $('#strp-menu'), mr = mn.getBoundingClientRect();
    ok('the object tree opens beside the column, in the replay', mn.classList.contains('show') && mr.left >= lr.right - 1 && mr.top >= tr.bottom - 1 && mr.right <= cr.right + 1, [Math.round(mr.left), Math.round(mr.top), Math.round(lr.right)]);
    $('#strp-treebtn').click(); await W(200);
    $('#strp-layersbtn').click(); await W(250);
    var tg = $('#strp-tgls'), tgr = tg.getBoundingClientRect(), lb = $('#strp-layersbtn').getBoundingClientRect();
    ok('Show on chart opens under its button', vis(tg) && tgr.top >= lb.bottom - 1 && tgr.top - lb.bottom < 20, [Math.round(tgr.top), Math.round(lb.bottom)]);
    $('#strp-layersbtn').click(); await W(200);
    $('#strp-spdcur').click(); await W(200);
    var sm = $('.strp-spdmenu'), smr = sm.getBoundingClientRect();
    ok('the speed menu opens down, on screen', vis(sm) && smr.top >= tr.bottom - 1 && smr.bottom <= innerHeight, [Math.round(smr.top), Math.round(smr.bottom)]);
    $('#strp-spdcur').click(); await W(150); if ($('#strp-spd').classList.contains('open')) { document.body.click(); await W(100); }

    // ---- the theme: the platform's own ----
    $('.strp-plth').click(); await W(500);
    ok('the sun: light, as the Charts platform\'s is', card.classList.contains('strp-pllt') && getComputedStyle(top).backgroundColor === 'rgb(255, 255, 255)' && PR._cfg().plLt === true, getComputedStyle(top).backgroundColor);
    if (!LT) { $('.strp-plth').click(); await W(500); ok('the moon: dark again', !card.classList.contains('strp-pllt') && PR._cfg().plLt === false); }

    // ---- full screen ----
    $('#strp-fs').click(); await W(600);
    var fr = card.getBoundingClientRect();
    ok('full screen: the whole window, the same layout', mb.classList.contains('strp-full') && Math.abs(fr.width - innerWidth) < 2 && Math.abs(fr.height - innerHeight) < 2 && vis($('#strp-tools')), [Math.round(fr.width), Math.round(fr.height)]);
    var lr2 = left.getBoundingClientRect(), cw2 = $('#strp-cw').getBoundingClientRect();
    ok('full screen: the tools still the chart\'s height', Math.abs(lr2.bottom - cw2.bottom) < 3, [Math.round(lr2.bottom), Math.round(cw2.bottom)]);
    $('#strp-fs').click(); await W(500);

    if (!window.__RP_KEEP) {
      // ---- the platform off: as it was ----
      $('#strp-close').click(); await W(400);
      ok('Close closes it', !mb.classList.contains('show'));
      window.__stPlatOff = true; await openIt();
      ok('off: the old look, every part back in its place', !card.classList.contains('strp-pl') && !!$('.strp-head #strp-sym') && !!$('.strp-head #strp-close') && !!$('#strp-ct #strp-play') && !!$('#strp-ct .strp-tjg') && !!$('#strp-tb #strp-tools') && !$('.strp-plleft') && vis($('.strp-head')));
      $('#strp-close').click(); await W(300); window.__stPlatOff = false; await openIt();
      ok('on again: the platform\'s look', card.classList.contains('strp-pl') && inTop('#strp-play') && left.contains($('#strp-tools')));
    }
    if (LT && !card.classList.contains('strp-pllt')) { $('.strp-plth').click(); await W(500); }
    ok('no errors', !errs.length, errs);
  } catch (e) { ok('the test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
