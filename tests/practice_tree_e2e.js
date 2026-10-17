(async function () {
  // Practice Replay: the object tree (Nestor, 17 Oct 2026: "can i get an icon for objects tree? so its easier to see the objects
  // on the charts and delete them that way?"). Real EUR/USD, Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_tree_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.look = {}; C.mini = false; C.max = true; C.resume = null; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('12:00'); await W(400);
    var DW = P._dr(), pane = function () { return P._panes()[0]; }; DW.list = []; DW.sel = null; P._render(); await W(60);
    var tb = document.getElementById('stpr-treebtn'), mn = document.getElementById('stpr-menu');
    ok('an Object tree button in the toolbar, before the bell', tb && tb.title === 'Object tree' && tb.nextElementSibling && tb.nextElementSibling.id === 'stpr-alertsbtn');
    tb.click(); await W(40);
    ok('no drawings: it says so', mn.classList.contains('show') && /No drawings on this symbol yet/.test(mn.textContent), mn.textContent);
    tb.click(); await W(30);
    var B = pane().bars, px = B[B.length - 1].close;
    DW.list = [{ type: 'hline', price: +(px + 0.0010).toFixed(5), alert: true }, { type: 'rect', a: { t: B[B.length - 20].time, price: px + 0.0005 }, b: { t: B[B.length - 10].time, price: px - 0.0005 } }, { type: 'emoji', a: { t: B[B.length - 15].time, price: px }, e: '🚀', size: 32 }];
    P._render(); await W(60); tb.click(); await W(40);
    var rows = mn.querySelectorAll('.stpr-otr'), names = Array.prototype.map.call(rows, function (r) { return r.querySelector('.stpr-otn span').textContent; });
    ok('every drawing, newest first, with its icon and name', rows.length === 3 && names.join(',') === 'Emoji,Rectangle,Horizontal line' && rows[0].querySelector('.stpr-otn svg'), names);
    ok('its detail: the line\'s price (and that it has an alert), the emoji', /\d\.\d{5} · alert/.test(rows[2].textContent) && rows[0].textContent.indexOf('🚀') >= 0, rows[2].textContent);
    rows[1].querySelector('[data-otsel]').click(); await W(40);
    ok('a click on a row selects that drawing (it stays open, the row lit)', DW.sel === 1 && mn.classList.contains('show') && mn.querySelectorAll('.stpr-otr')[1].classList.contains('on'));
    // hide / show
    var hl0 = (pane().hl || []).length; mn.querySelectorAll('.stpr-otr')[2].querySelector('[data-othide]').click(); await W(80);
    ok('its eye hides it: off every chart (the line gone from the price scale), its row dimmed', DW.list[0].hidden === true && (pane().hl || []).length === hl0 - 1 && mn.querySelectorAll('.stpr-otr')[2].classList.contains('off'), [(pane().hl || []).length, hl0]);
    mn.querySelectorAll('.stpr-otr')[2].querySelector('[data-othide]').click(); await W(80);
    ok('pressed again: back', !DW.list[0].hidden && (pane().hl || []).length === hl0);
    // lock, then the bin
    mn.querySelectorAll('.stpr-otr')[0].querySelector('[data-otlock]').click(); await W(40);
    ok('its padlock locks it', DW.list[2].lock === true && mn.querySelectorAll('.stpr-otr')[0].querySelector('[data-otlock]').classList.contains('on'));
    mn.querySelectorAll('.stpr-otr')[0].querySelector('[data-otdel]').click(); await W(40);
    ok('its bin on a locked one: it stays, and says how to unlock it', DW.list.length === 3 && /unlock it to delete it/.test(document.getElementById('stpr-flash').textContent));
    mn.querySelectorAll('.stpr-otr')[1].querySelector('[data-otdel]').click(); await W(40);
    ok('its bin deletes an unlocked one; the list follows', DW.list.length === 2 && mn.querySelectorAll('.stpr-otr').length === 2 && DW.list.every(function (d) { return d.type !== 'rect'; }));
    ok('Remove all drawings at its foot counts the unlocked ones', /Remove all drawings \(1\)/.test(mn.textContent), mn.textContent);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })); await W(60);
    ok('Undo brings the deleted one back (and the list shows it)', DW.list.length === 3 && (!mn.classList.contains('show') || mn.querySelectorAll('.stpr-otr').length === 3));
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
