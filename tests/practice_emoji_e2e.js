(async function () {
  // Practice Replay: emojis on the chart (Nestor, 17 Oct 2026: "can you also add an icon for emojis? that when you click on
  // them they can be resized on the chart?", "do i get all the emoji options i get in the community chat?").
  // Real EUR/USD, Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_emoji_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.look = {}; C.mini = false; C.max = true; C.resume = null; C.emoji = null; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('12:00'); await W(400);
    var pane = function () { return P._panes()[0]; }, DW = P._dr(); DW.list = []; DW.sel = null; DW.emoji = null; P._render();
    var ch = pane().el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0 }, o || {}))); };
    var px = function (x, y) { var c = pane().ov, d = window.devicePixelRatio || 1; return Array.prototype.slice.call(c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data); };
    document.getElementById('stpr-drawbtn').click(); await W(20);
    var eb = document.querySelector('#stpr-tools [data-tool="emoji"]');
    ok('an Emoji tool after Text (its text and notes group, batch B)', eb && eb.title === 'Emoji' && eb.previousElementSibling.getAttribute('data-grp') === 'notes' && eb.previousElementSibling.querySelector('[data-tool="text"]'));
    eb.click(); await W(40);
    var box = P._dbar().popK() === 'emoji' && P._dbar().pop(), emo = box && box.querySelectorAll('[data-emo]'), chat = window.__stEmojis || [];
    var extra = chat.filter(function (x) { return P._emojis.indexOf(x) < 0; }).length;
    ok('picked: its box shows the 28 trading emojis first, then every emoji the community chat has (865), and says to click the chart', DW.tool === 'emoji' && emo && emo[0].getAttribute('data-emo') === P._emojis[0]
      && chat.length > 800 && emo.length === 28 + extra && box.querySelector('[data-emo="😂"]') && /All emojis/.test(box.textContent) && /Click the chart to place it/.test(box.textContent), emo && [emo.length, chat.length]);
    var rocket = P._emojis[3]; box.querySelector('[data-emo="' + rocket + '"]').click(); await W(30);
    ok('choosing one: it is the one placed next (remembered)', C.emoji === rocket && DW.tool === 'emoji');
    var X = Math.round(r.width * 0.4), Y = Math.round(r.height * 0.4);
    mev('mousedown', X, Y); mev('mouseup', X, Y); await W(80);
    var d = DW.list[0];
    ok('a click on the chart places it there, 32 px, selected', d && d.type === 'emoji' && d.e === rocket && d.size === 32 && DW.sel === 0 && DW.tool === 'none', d);
    P._render(); await W(80); var c0 = px(X, Y);
    ok('drawn on the chart', c0[3] > 100, c0);
    // a corner handle resizes it
    var cx = X + 16, cy = Y + 16; mev('mousedown', cx, cy); mev('mousemove', cx + 20, cy + 20, { held: true }); mev('mouseup', cx + 20, cy + 20); await W(60);
    ok('dragging a corner resizes it (bigger)', d.size > 60, d.size);
    // its box: size and the emoji (one from the community chat's list too)
    mev('mousedown', X, Y); mev('mouseup', X, Y); await W(60); P._dbar().open('more'); await W(20); box = P._dbar().pop();
    var sz = box.querySelector('[data-esz]'); sz.value = '100'; sz.dispatchEvent(new Event('input', { bubbles: true })); sz.dispatchEvent(new Event('change', { bubbles: true })); await W(30);
    ok('its box: Size changes it', d.size === 100, d.size);
    P._dbar().open('emoji'); await W(20); P._dbar().pop().querySelector('[data-emo="😂"]').click(); await W(30);
    ok('and a click on another emoji (one from the chat list) changes it', d.e === '😂' && document.querySelector('.stdb-bar [data-db="emoji"]').textContent === '😂');
    box = document.querySelector('.stdb-bar'); P._dbar().closePop();
    ok('no colours or line widths for an emoji', !box.querySelector('[data-db="line"]') && !box.querySelector('[data-db="width"]') && !box.querySelector('[data-db="tpl"]'));
    // moved by its body
    var t0 = d.a.t, p0 = d.a.price; mev('mousedown', X, Y); mev('mousemove', X + 60, Y + 30, { held: true }); mev('mouseup', X + 60, Y + 30); await W(60);
    ok('dragged by its body, it moves', d.a.t !== t0 && d.a.price !== p0, [t0, d.a.t]);
    ok('kept with the drawings (synced like them)', JSON.parse(localStorage.getItem('st_practice_draw2:EURUSD') || '[]')[0].e === '😂');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); await W(40);
    ok('Delete removes it', DW.list.length === 0);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
