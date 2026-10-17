(async function () {
  // Practice Replay: the alerts list (Nestor, 17 Oct 2026: "can i also get an icon that when pressed you open a list of the
  // alerts set to manage them? keep or delete them"). Real EUR/USD, Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/practice_alertlist_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [5]; C.look = {}; C.mini = false; C.max = true; C.resume = null; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('08:00'); await W(400); var DW = P._dr(); DW.list = []; DW.sel = null; P._render(); await W(50);
    var bell = document.getElementById('stpr-alertsbtn'), mn = document.getElementById('stpr-menu');
    ok('a bell in the toolbar, before the camera: Alerts', bell && bell.title === 'Alerts' && bell.nextElementSibling && bell.nextElementSibling.id === 'stpr-snapbtn');
    bell.click(); await W(40);
    ok('no alerts: it says how to set one', mn.classList.contains('show') && /No alerts on this symbol/.test(mn.textContent), mn.textContent);
    bell.click(); await W(30);
    ok('pressed again it closes', !mn.classList.contains('show'));
    // two alerts: one above the price, one far below (it will not be reached)
    var px = P._s().base.filter(function (b) { return b.time < P._s().now; }).pop().close, fut = P._s().base.filter(function (b) { return b.time >= P._s().now; }), hp = Math.max(fut[5].high, px + 0.00005);
    for (k = 0; k < 6; k++) hp = Math.max(hp, fut[k].high); hp = +hp.toFixed(5);   // the highest of the next six candles: reached in a few steps
    P._alertAt(hp); P._alertAt(px - 0.0300); DW.sel = null; P._render(); await W(60);
    ok('an alert waiting: a dot on the bell', bell.classList.contains('dot'));
    bell.click(); await W(40);
    var rows = mn.querySelectorAll('.stpr-alr');
    ok('the list: both, highest first, each Waiting, with x and Delete all (2)', rows.length === 2 && rows[0].querySelector('b').textContent === hp.toFixed(5) && /Waiting/.test(rows[0].textContent) && rows[0].querySelector('[data-alx]') && /Delete all alerts \(2\)/.test(mn.textContent), mn.textContent);
    rows[0].querySelector('[data-algo]').click(); await W(40);
    var hi = DW.list.filter(function (d) { return d.price === hp; })[0];
    ok('a click on one selects its line (and closes the list)', DW.sel === DW.list.indexOf(hi) && !mn.classList.contains('show'), DW.sel);
    // the replay reaches the higher one: the list says so
    DW.sel = null; for (k = 0; k < 400 && !hi.hitAt && P._s().now < P._s().f.close; k++) P._step();
    await W(300); bell.click(); await W(40); rows = mn.querySelectorAll('.stpr-alr');
    var hitRow = Array.prototype.filter.call(rows, function (r) { return r.querySelector('b').textContent === hi.price.toFixed(5); })[0];
    ok('reached: its row says Reached and the time', hi.hitAt && hitRow && hitRow.classList.contains('hit') && /Reached \d\d:\d\d/.test(hitRow.textContent), hitRow && hitRow.textContent);
    // x deletes the alert, the line stays
    var n0 = DW.list.length; hitRow.querySelector('[data-alx]').click(); await W(40);
    ok('x: that alert is gone, its line stays, the list shows the other one', DW.list.length === n0 && hi.alert === false && mn.classList.contains('show') && mn.querySelectorAll('.stpr-alr').length === 1, mn.textContent);
    mn.querySelector('[data-alxall]').click(); await W(40);
    ok('Delete all: none left, the lines stay, it says so; the dot goes', DW.list.length === n0 && !DW.list.some(function (d) { return d.alert; }) && /deleted/.test(document.getElementById('stpr-flash').textContent) && !bell.classList.contains('dot'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })); await W(40);
    ok('Undo brings them back', DW.list.filter(function (d) { return d.alert; }).length === 1, DW.list.map(function (d) { return !!d.alert; }));
    // the + beside the crosshair's price (Nestor: "can i get one of these + signs to make it more obvious for users how to add alerts?")
    var p0 = P._panes()[0], pc0 = p0.el.querySelector('.stpr-pc'), rr = pc0.getBoundingClientRect(), pw0 = p0.el.clientWidth - p0.chart.priceScale('right').width(), yy = Math.round(rr.height * 0.35);
    var mm = function (t, x, y) { var el = document.elementFromPoint(rr.left + x, rr.top + y) || pc0; el.dispatchEvent(new MouseEvent(t, { clientX: rr.left + x, clientY: rr.top + y, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' ? 1 : 0 })); };
    mm('mousemove', pw0 - 11, yy); await W(80);
    ok('the mouse on the chart by the price scale: a + beside the crosshair price, lit under the mouse', P._dr().plusHov === p0);
    var n1 = DW.list.length, pr1 = p0.series.coordinateToPrice(yy);
    mm('mousedown', pw0 - 11, yy); mm('mouseup', pw0 - 11, yy); await W(80);
    ok('a click on the +: an alert at that price', DW.list.length === n1 + 1 && DW.list[n1].alert && Math.abs(DW.list[n1].price - pr1) < 0.0002 && /Alert set at/.test(document.getElementById('stpr-flash').textContent), DW.list[n1]);
    P.close(); await W(150);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
