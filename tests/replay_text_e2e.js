(async function () {
  // Trade Replay: the Text tool (Nestor, 17 Oct 2026: "can you add a text option for the chart in practise replay? and also
  // in trade replay") - the same as Practice Replay's. A made-up EUR/USD short on Thu 1 Oct 2026 over the real shared candles
  // (signed out: nothing is read from or written to anyone's journal).
  // Run: python tests/browser_test.py tests/replay_text_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stReplay && window.__stSB); i++) await W(100);
    await W(1000);
    var R = window.__stReplay;
    var trade = { mt5Ticket: 999999901, symbol: 'EURUSD', side: 'short', entryPrice: 1.13200, closePrice: 1.13100, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 };
    R.open(trade); for (var k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(800);
    var S = R._s();
    ok('Trade Replay opens on the made-up trade', S && S.bars && S.bars.length > 20, S && S.bars && S.bars.length);
    S.drawings = []; S.sel = null;
    var chart = document.getElementById('strp-chart'), r = chart.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || chart; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0, detail: t === 'dblclick' ? 2 : 1 }, o || {}))); };
    var key = function (el, k, o) { el.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o || {}))); };
    var db = document.getElementById('strp-drawbtn'); if (db) db.click(); await W(40);
    var tb = document.querySelector('#strp-tools [data-tool="text"]');
    ok('a Text button sits in the drawing tools, after Measure', tb && /Text/.test(tb.title) && tb.previousElementSibling && tb.previousElementSibling.getAttribute('data-tool') === 'range', tb && tb.title);
    var X = Math.round(r.width * 0.4), Y = 110;
    tb.click(); await W(20); mev('mousedown', X, Y); mev('mouseup', X, Y); await W(100);
    var ta = document.querySelector('textarea.strp-txed'), d = S.drawings[0];
    ok('one click: a typing box on the chart at that spot, the cursor in it', ta && document.activeElement === ta && d && d.type === 'text', ta && [ta.style.left, ta.style.top]);
    ta.value = 'Entry was late'; ta.dispatchEvent(new Event('input', { bubbles: true })); key(ta, 'Enter'); await W(100);
    ok('Enter keeps it: on the chart, the box gone, selected', !document.querySelector('textarea.strp-txed') && d.text === 'Entry was late' && S.sel === 0, d);
    var DB = R._dbar(), bar = document.querySelector('.strp-card .stdb-bar'); DB.open('text'); await W(20); var box = DB.pop();
    ok('its toolbar (19 Oct 2026): the text colour with its words, the size (M); S M L XL', bar && bar.style.display === 'flex' && bar.querySelector('[data-db="tsize"]').textContent === 'M' && box.querySelector('[data-tw]') && box.querySelector('[data-tw]').value === 'Entry was late' && (DB.open('tsize'), /S\s*·\s*11px[\s\S]*XL\s*·\s*24px/.test(DB.pop().textContent)), box && box.textContent);
    var bx = R._txtBox(d); var bigBtn = DB.pop().querySelector('[data-tz="3"]'); if (bigBtn) bigBtn.click(); await W(40); var bx2 = R._txtBox(d); DB.closePop();
    ok('L makes it bigger', d.width === 3 && (bx2.y1 - bx2.y0) > (bx.y1 - bx.y0), [bx.y1 - bx.y0, bx2.y1 - bx2.y0]);
    var i0 = d.a.idx; mev('mousedown', bx2.x0 + 10, bx2.y0 + 8); mev('mousemove', bx2.x0 + 80, bx2.y0 + 40, { held: true }); mev('mouseup', bx2.x0 + 80, bx2.y0 + 40); await W(60);
    ok('it drags', d.a.idx > i0, [i0, d.a.idx]);
    var bx3 = R._txtBox(d); mev('dblclick', bx3.x0 + 10, bx3.y0 + 8); await W(100); ta = document.querySelector('textarea.strp-txed');
    ok('double-click to type again', ta && ta.value === 'Entry was late', ta && ta.value);
    ta.value = 'Entry was late - waited for the close'; ta.dispatchEvent(new Event('input', { bubbles: true })); key(ta, 'Enter'); await W(60);
    ok('the new words are kept', d.text === 'Entry was late - waited for the close');
    DB.open('text'); await W(20); var nb = DB.pop().querySelector('[data-tw]');
    ok('the options box shows the words in a box that keeps line breaks', nb && nb.tagName === 'TEXTAREA' && nb.value === 'Entry was late - waited for the close', nb && nb.tagName);
    nb.focus(); nb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })); await W(40);
    ok('Backspace while typing there edits the words: the drawing stays', S.drawings.length === 1, S.drawings.length);
    DB.closePop();
    document.querySelector('#strp-tools [data-tool="text"]').click(); mev('mousedown', X, Y + 150); mev('mouseup', X, Y + 150); await W(80);
    ta = document.querySelector('textarea.strp-txed'); key(ta, 'Escape'); await W(60);
    ok('a new one left empty is not kept', S.drawings.length === 1, S.drawings.length);
    R.close(); await W(200);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
