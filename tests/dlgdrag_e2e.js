// End-to-end test (Nestor, 3 Nov 2026: "can i have the option to drag this panel around the chart like in tradingview?"; "why when i choose a colour i then need to click on the body colour square again for the colour options to go away?").
// Run: python tests/browser_test.py tests/dlgdrag_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var $ = function (s) { return document.querySelector(s); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stReplay); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15, 60, 240, 5]; C.look = {}; C.mini = false; C.max = true; C.resume = null;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('12:00'); await W(400);
    P._miniDialog(); await W(250);
    var bg = $('.stpr-dlgbg'), dl = $('.stpr-dlg'), h = $('.stpr-dlgh');
    ok('the Session Indicator window opens', !!dl && /Session Indicator/.test(h.textContent), h && h.textContent);
    var pe = function (t, x, y, target) { (target || h).dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1, button: 0, buttons: t === 'pointerup' ? 0 : 1, isPrimary: true })); };
    var r0 = dl.getBoundingClientRect(), hr = h.getBoundingClientRect(), hx = hr.left + 40, hy = hr.top + 12;
    ok('its title bar shows it moves', getComputedStyle(h).cursor === 'move', getComputedStyle(h).cursor);
    pe('pointerdown', hx, hy); pe('pointermove', hx + 120, hy + 40); pe('pointermove', hx + 200, hy + 60); pe('pointerup', hx + 200, hy + 60); await W(40);
    var r1 = dl.getBoundingClientRect();
    ok('dragged by its title bar: it follows', dl.style.transform === 'translate(200px, 60px)', dl.style.transform);
    ok('...the chart behind no longer dimmed', getComputedStyle(bg).backgroundColor === 'rgba(0, 0, 0, 0)', getComputedStyle(bg).backgroundColor);
    bg.dispatchEvent(new MouseEvent('click', { bubbles: true })); await W(30);
    ok('...the drag\'s own click does not close it', !!$('.stpr-dlg'));
    var r2x = dl.getBoundingClientRect();
    pe('pointerdown', r2x.left + 40, r2x.top + 12); pe('pointermove', r2x.left + 9000, r2x.top + 9000); pe('pointerup', r2x.left + 9000, r2x.top + 9000); await W(30);
    var r3 = dl.getBoundingClientRect(), br = bg.getBoundingClientRect(), hb = h.getBoundingClientRect();
    ok('dragged far off: its title bar stays reachable', r3.left < br.right - 100 && hb.top < br.bottom - 20, [r3.left, br.right, hb.top, br.bottom]);
    var xb = $('.stpr-dlgx'), xr = xb.getBoundingClientRect();
    pe('pointerdown', xr.left + 4, xr.top + 4, xb); pe('pointermove', xr.left + 60, xr.top + 60, xb); pe('pointerup', xr.left + 60, xr.top + 60, xb); await W(20);
    ok('a press on its X does not drag', Math.abs(dl.getBoundingClientRect().left - r3.left) < 1);
    var r4 = dl.getBoundingClientRect(); pe('pointerdown', r4.left + 40, r4.top + 12); pe('pointermove', r0.left + 40, r0.top + 12); pe('pointerup', r0.left + 40, r0.top + 12); await W(30);
    var left0 = dl.style.transform;
    // the palette in this window
    var sw = $('.stpr-dlg [data-dsw]'); ok('a colour square in it', !!sw);
    sw.click(); await W(40); ok('its square opens the palette', !!$('.stpr-dlg .stpr-lkp'));
    var dop = $('.stpr-dlg [data-dop]'); dop.value = '50'; dop.dispatchEvent(new Event('input', { bubbles: true })); await W(30);
    ok('the opacity slider keeps it open', !!$('.stpr-dlg .stpr-lkp'));
    $('.stpr-dlg [data-dsw]').click(); await W(40); ok('...its square shuts it', !$('.stpr-dlg .stpr-lkp'));
    $('.stpr-dlg [data-dsw]').click(); await W(40);
    $('.stpr-dlg [data-dcol="#f472b6"]').click(); await W(60);
    ok('a colour picked: the palette goes away, the square shows it', !$('.stpr-dlg .stpr-lkp'), !!$('.stpr-dlg .stpr-lkp'));
    $('.stpr-dlg [data-dsw]').click(); await W(40);
    var ck = $('.stpr-dlg input[type="checkbox"][data-k]'), was = ck.checked, ckk = ck.getAttribute('data-k'); ck.click(); await W(80);
    ok('a click on something else shuts it too, and that tick box still changes', !$('.stpr-dlg .stpr-lkp') && $('.stpr-dlg input[data-k="' + ckk + '"]').checked === !was, [!!$('.stpr-dlg .stpr-lkp'), was]);
    ck = $('.stpr-dlg input[data-k="' + ckk + '"]'); ck.click(); await W(60);
    $('.stpr-dlg [data-dc]').click(); await W(60);
    P._miniDialog(); await W(200);
    ok('opened again: where it was left', !!left0 && $('.stpr-dlg').style.transform === left0, [$('.stpr-dlg').style.transform, left0]);
    $('.stpr-dlg [data-dc]').click(); await W(40);

    // the chart settings menu: a tick box beside an open palette, Replay's
    P._look && P._look();
    var lb = document.getElementById('stpr-lookbtn'); if (lb) lb.click(); await W(120);
    var msw = $('[data-lksw="body"]') || $('[data-lksw]');
    if (msw) {
      msw.click(); await W(40); ok('chart settings: its square opens the palette', !!$('.stpr-lkp'));
      var mk = msw.getAttribute('data-lksw'); $('[data-lkcol="#f472b6"]').click(); await W(60);
      ok('...a colour picked: on the chart, the palette gone, no second click', !$('.stpr-lkp') && /f472b6/i.test(String(P._cfg().look[mk] || '')), [!!$('.stpr-lkp'), P._cfg().look[mk]]);
      $('[data-lksw="' + mk + '"]').click(); await W(40);
      var seg = $('[data-lkseg]'); if (seg) { seg.click(); await W(60); ok('...a click on another setting shuts it', !$('.stpr-lkp')); }
    } else ok('chart settings opened', false);
    try { P.close(); } catch (x) {} await W(300);

    // Trade Replay's chart settings
    var R = window.__stReplay;
    R.open({ mt5Ticket: 999999941, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13095, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 });
    for (k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(600);
    document.getElementById('strp-lookbtn').click(); await W(120);
    var rsw = $('#strp-menu [data-lksw]');
    if (rsw) { rsw.click(); await W(40); ok('Trade Replay\'s chart settings: the palette opens', !!$('#strp-menu .stpr-lkp')); $('#strp-menu [data-lkcol="#f472b6"]').click(); await W(60); ok('...a colour picked: it goes away', !$('#strp-menu .stpr-lkp')); }
    else ok('Trade Replay\'s chart settings opened', false);
    try { document.getElementById('strp-close').click(); } catch (x) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
