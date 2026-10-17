(async function () {
  // Practice Replay: locking a drawing (Nestor, 17 Oct 2026: "can i also get the option to lock individual drawings? so they
  // cant be deleted by mistake?"). Real EUR/USD, Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_lock_e2e.js
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
    var pane = function () { return P._panes()[0]; }, DW = P._dr(), ch = pane().el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0 }, o || {}))); };
    var px = P._s().base.filter(function (b) { return b.time < P._s().now; }).pop().close;
    DW.list = [{ type: 'hline', price: +(px + 0.0010).toFixed(5) }, { type: 'hline', price: +(px - 0.0010).toFixed(5) }]; DW.sel = null; P._render(); await W(100);
    var y0 = P._yOf(0, DW.list[0].price), X = r.width * 0.3;
    mev('mousedown', X, y0); mev('mouseup', X, y0); await W(60);
    var box = pane().el.querySelector('.stpr-props'), lb = box && box.querySelector('[data-lock]');
    ok('its options box has Lock beside Clone', DW.sel === 0 && lb && /Lock/.test(lb.textContent) && lb.previousElementSibling && lb.previousElementSibling.hasAttribute('data-clone'), box && box.textContent);
    lb.click(); await W(40);
    ok('locked: kept with the drawing (synced like it), the button reads Locked, it says so', DW.list[0].lock === true && /Locked/.test(box.querySelector('[data-lock]').textContent) && /cannot be moved or deleted/.test(document.getElementById('stpr-flash').textContent)
      && JSON.parse(localStorage.getItem('st_practice_draw2:EURUSD') || '[]')[0].lock === true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); await W(40);
    ok('Delete: it stays, and it says how to unlock it', DW.list.length === 2 && /unlock it to delete it/.test(document.getElementById('stpr-flash').textContent));
    var p0 = DW.list[0].price; mev('mousedown', X, y0); mev('mousemove', X, y0 + 40, { held: true }); mev('mouseup', X, y0 + 40); await W(60);
    ok('dragged: it does not move', DW.list[0].price === p0 && /unlock it to move it/.test(document.getElementById('stpr-flash').textContent), [p0, DW.list[0].price]);
    ch.dispatchEvent(new MouseEvent('contextmenu', { clientX: r.left + X, clientY: r.top + y0, bubbles: true, cancelable: true, button: 2 })); await W(60);
    var ctx = pane().el.querySelector('.stpr-ctx');
    ok('right-click on it offers Unlock', ctx && ctx.style.display !== 'none' && /Unlock/.test(ctx.textContent), ctx && ctx.textContent);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(20);
    // Clone: the copy starts unlocked
    DW.sel = 0; P._render(); await W(40); pane().el.querySelector('.stpr-props [data-clone]').click(); await W(40);
    ok('its copy (Clone) starts unlocked', DW.list.length === 3 && !DW.list[2].lock);
    // Remove all drawings: the locked one stays
    DW.sel = null; DW.multi = null; P._render(); await W(30);
    document.getElementById('stpr-del').click(); await W(40); var mn = document.getElementById('stpr-menu');
    ok('Remove all drawings counts the unlocked ones and says the locked one stays', /Remove all drawings \(2\)/.test(mn.textContent) && /1 locked drawing stays/.test(mn.textContent), mn.textContent);
    mn.querySelector('[data-delall]').click(); await W(40);
    ok('removed: the locked one is still there, it says so', DW.list.length === 1 && DW.list[0].lock && /2 drawings removed, 1 locked kept/.test(document.getElementById('stpr-flash').textContent), document.getElementById('stpr-flash').textContent);
    // unlocked again (right-click), it can go
    y0 = P._yOf(0, DW.list[0].price); mev('mousedown', X, y0); mev('mouseup', X, y0); await W(40);
    P._lockSel(); await W(30);
    ok('unlocked', !DW.list[0].lock);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); await W(40);
    ok('then Delete removes it', DW.list.length === 0);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
