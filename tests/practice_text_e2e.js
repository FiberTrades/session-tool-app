(async function () {
  // Practice Replay: the Text tool (Nestor, 17 Oct 2026: "can you add a text option for the chart in practise replay? and
  // also in trade replay"). One click places it and the words are typed straight onto the chart; Enter keeps them, Shift+
  // Enter starts a new line, Escape leaves them as they were; double-click to type again; four sizes, any colour; it drags
  // and deletes like any drawing. Real EUR/USD candles of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_text_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.look = {}; C.mini = false; C.max = true; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('14:30'); await W(400);
    var pane = function () { return P._panes()[0]; }, DW = P._dr(); DW.list = []; DW.sel = null; P._render();
    var ch = pane().el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0, detail: t === 'dblclick' ? 2 : 1 }, o || {}))); };
    var key = function (el, k, o) { el.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o || {}))); };
    var px = function (x, y) { var c = pane().ov, d = window.devicePixelRatio || 1; return Array.prototype.slice.call(c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data); };

    document.getElementById('stpr-drawbtn').click(); await W(20);
    var tb = document.querySelector('#stpr-tools [data-tool="text"]');
    ok('a Text button sits in the drawing tools, after Measure', tb && tb.title === 'Text' && tb.previousElementSibling && tb.previousElementSibling.getAttribute('data-tool') === 'range', tb && tb.title);
    var X = Math.round(r.width * 0.45), Y = 120;
    tb.click(); mev('mousedown', X, Y); mev('mouseup', X, Y); await W(80);
    var ta = pane().el.querySelector('textarea.stpr-txed'), d = DW.list[0];
    ok('one click: a typing box opens on the chart at that spot, with the cursor in it', ta && document.activeElement === ta && d && d.type === 'text' && DW.tool === 'none' && Math.abs(parseFloat(ta.style.left) + 4 - X) < 3, ta && [ta.style.left, ta.style.top, document.activeElement && document.activeElement.tagName]);
    ta.value = 'Wait for London'; ta.dispatchEvent(new Event('input', { bubbles: true })); await W(20);
    key(ta, 'Enter'); await W(80);
    ok('Enter keeps it: the words are on the chart, the box goes, it stays selected', !pane().el.querySelector('textarea.stpr-txed') && d.text === 'Wait for London' && DW.sel === 0, d);
    P._render(); await W(60);
    var bx = P._txtBox(0, d), hitInk = false;
    for (var xx = bx.x0 + 2; xx < bx.x0 + 60 && !hitInk; xx += 1) for (var yy = bx.y0 + 3; yy < bx.y1 - 2 && !hitInk; yy += 1) { var c = px(xx, yy); if (c[3] > 150 && c[0] > 200 && c[1] > 200 && c[2] > 200) hitInk = true; }
    ok('drawn in white from that point, top left', hitInk && Math.abs(bx.x0 - X) < 3 && Math.abs(bx.y0 - Y) < 3, bx);
    var DB = P._dbar(), bar = document.querySelector('.stdb-bar'); DB.open('text'); await W(20); var box = DB.pop();
    ok('its toolbar: the text colour (the 30 colours) with its words to edit, the size (M)', bar && bar.querySelector('[data-db="text"]') && bar.querySelector('[data-db="tsize"]').textContent === 'M' && box.querySelectorAll('[data-pc]').length === 30 && box.querySelector('[data-tw]').value === 'Wait for London' && box.querySelector('[data-tw]').placeholder === 'Text', box && box.textContent);
    DB.open('tsize'); await W(20);
    ok('its size: S M L XL', /S\s*·\s*11px/.test(DB.pop().textContent) && /XL\s*·\s*24px/.test(DB.pop().textContent) && DB.pop().querySelectorAll('[data-tz]').length === 4, DB.pop().textContent);
    DB.open('more'); await W(20);
    ok('its More: TEXT, Visibility, Clone', /TEXT/.test(DB.pop().textContent) && DB.pop().querySelector('[data-clone]'), DB.pop().textContent);
    DB.open('tsize'); await W(20);
    var h0 = bx.y1 - bx.y0; DB.pop().querySelector('[data-tz="4"]').click(); await W(40);
    var bx2 = P._txtBox(0, d);
    ok('XL makes it bigger (24 px)', d.width === 4 && bx2.y1 - bx2.y0 > h0 * 1.5, [h0, bx2.y1 - bx2.y0]);
    DB.open('text'); await W(20); DB.pop().querySelector('[data-pc="#f4c05a"]').click(); await W(30); DB.closePop();
    ok('and any colour (yellow)', d.color === '#f4c05a');
    // drag it
    var t0 = d.a.t, p0 = d.a.price; mev('mousedown', bx2.x0 + 10, bx2.y0 + 8); mev('mousemove', bx2.x0 + 70, bx2.y0 + 48, { held: true }); mev('mouseup', bx2.x0 + 70, bx2.y0 + 48); await W(40);
    ok('it drags like any drawing', d.a.t > t0 && d.a.price < p0, [t0, d.a.t, p0, d.a.price]);
    // type again
    var bx3 = P._txtBox(0, d); mev('dblclick', bx3.x0 + 10, bx3.y0 + 8); await W(80);
    ta = pane().el.querySelector('textarea.stpr-txed');
    ok('double-click: the typing box again, with its words', ta && ta.value === 'Wait for London' && document.activeElement === ta, ta && ta.value);
    ta.value = 'changed'; ta.dispatchEvent(new Event('input', { bubbles: true })); key(ta, 'Escape'); await W(60);
    ok('Escape leaves the words as they were', d.text === 'Wait for London' && !pane().el.querySelector('textarea.stpr-txed'), d.text);
    mev('dblclick', bx3.x0 + 10, bx3.y0 + 8); await W(80); ta = pane().el.querySelector('textarea.stpr-txed');
    ta.value = 'Wait for London'; key(ta, 'Enter', { shiftKey: true }); ta.value = 'Wait for London\nthen New York'; ta.dispatchEvent(new Event('input', { bubbles: true })); key(ta, 'Enter'); await W(60);
    var bx4 = P._txtBox(0, d);
    ok('Shift+Enter gives a second line', d.text === 'Wait for London\nthen New York' && bx4.lines.length === 2, d.text);
    DB.open('text'); await W(20); var nb2 = DB.pop().querySelector('[data-tw]'); DB.closePop();
    ok('the options box shows both lines in a box that keeps line breaks', nb2 && nb2.tagName === 'TEXTAREA' && nb2.value === 'Wait for London\nthen New York', nb2 && [nb2.tagName, nb2.value]);
    // nothing typed: nothing kept
    document.querySelector('#stpr-tools [data-tool="text"]').click(); mev('mousedown', X, Y + 160); mev('mouseup', X, Y + 160); await W(60);
    ta = pane().el.querySelector('textarea.stpr-txed'); key(ta, 'Enter'); await W(60);
    ok('a text with nothing typed is not kept', DW.list.length === 1, DW.list.length);
    // stored, and Delete
    var stored = JSON.parse(localStorage.getItem('st_practice_draw2:EURUSD') || '[]');
    ok('kept with the drawings (synced like them)', stored.length === 1 && stored[0].type === 'text' && stored[0].text === 'Wait for London\nthen New York', stored);
    mev('mousedown', bx4.x0 + 10, bx4.y0 + 8); mev('mouseup', bx4.x0 + 10, bx4.y0 + 8); await W(30);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); await W(40);
    ok('selected, the Delete key removes it', DW.list.length === 0);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
