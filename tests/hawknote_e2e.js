(async function () {
  // The hawk's note boxes in Study move (Nestor, 7 Nov 2026: "i need to be able to move around the callout label messages"): click one,
  // then drag its box - the point it shows stays, where it went is kept for that trade (st_hk_noff); its point and the hawk's other marks
  // stay locked; his own drawing stays selected when the hawk's marks are drawn again. Back Testing on EUR/USD of Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/hawknote_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stDrawBar && window.__stReplay); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); localStorage.removeItem('st_hk_noff'); } catch (e) {}
    var C = P._cfg(); C.mm = Object.assign({}, C.mm, { col: true }); C.layout = 1; C.tfs = [15, 5, 60, 240]; C.mini = false; C.dtpl = {}; C.ddef = {}; C.dwHide = false; C.dwLock = false; C.news = false; C.max = true; C.resume = null;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(600);
    var DW = P._dr(), pane = P._panes()[0], ch = pane.el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0 }, o || {}))); };
    var drag = async function (x0, y0, x1, y1) { mev('mousedown', x0, y0); mev('mousemove', (x0 + x1) / 2, (y0 + y1) / 2, { held: true }); mev('mousemove', x1, y1, { held: true }); mev('mouseup', x1, y1); await W(60); };
    var click = async function (x, y) { mev('mousedown', x, y); mev('mouseup', x, y); await W(60); };
    // a point in the middle of the chart: a candle time there, the price at mid-height
    DW.list = []; DW.sel = null; DW.tool = 'hray'; await click(Math.round(r.width * 0.4), Math.round(r.height * 0.45)); DW.tool = 'none';
    var pt = DW.list.length ? DW.list[0].a : null, t = pt && pt.t, price = pt && pt.price;
    ok('a point in the middle of the chart', pt && P._xOfT(0, t) != null && P._yOf(0, price) != null, pt);
    var NOTE = { type: 'note', a: { t: t, price: price }, off: { x: 0, y: 110 }, sid: 'strict_20|3|pos', color: '#9598a1', tcol: '#ffffff', width: 1, tsz: 11, text: '#3 Buy · Reaction · discount\nStopped out 08:45 · −1.18R' };
    var LINE = { type: 'trend', a: { t: t - 3600, price: price - 0.0010 }, b: { t: t, price: price - 0.0010 }, color: '#e0a84a', width: 2 };
    DW.list = []; DW.hist = ['[]']; DW.hpos = 0; DW.sel = null; P._props();
    P._studyDraw([LINE, NOTE]); await W(80);
    var nd = DW.list.filter(function (d) { return d.sid; })[0];
    ok('the hawk\'s marks are on, locked, the note with its id', DW.list.length === 2 && nd && nd.lock && nd.study && nd.sid === 'strict_20|3|pos', DW.list.map(function (d) { return [d.type, d.lock, d.sid]; }));
    var ax = P._xOfT(0, t), ay = P._yOf(0, price), bx = ax, by = ay + 110;
    var h = P._hit(0, bx, by);
    ok('a press inside its box takes the box', h && DW.list[h.i] === nd && h.part === 'box', h);
    await drag(bx, by, bx + 80, by - 40);
    ok('pressed and dragged before it was picked: the chart\'s, the box stays', nd.off.x === 0 && nd.off.y === 110, nd.off);
    await click(bx, by);
    ok('a click picks it', DW.sel === DW.list.indexOf(nd), DW.sel);
    await drag(bx, by, bx + 80, by - 40);
    var NO = {}; try { NO = JSON.parse(localStorage.getItem('st_hk_noff') || '{}'); } catch (e) {}
    ok('then dragging moves its box; its point stays', Math.abs(nd.off.x - 80) <= 1 && Math.abs(nd.off.y - 70) <= 1 && nd.a.t === t && nd.a.price === price, [nd.off, nd.a]);
    ok('where it went is kept for that trade (st_hk_noff)', NO['strict_20|3|pos'] && Math.abs(NO['strict_20|3|pos'].x - 80) <= 1 && Math.abs(NO['strict_20|3|pos'].y - 70) <= 1, NO);
    ok('the hawk\'s marks are never saved with his drawings', !(localStorage.getItem(P._dwRaw ? ('st_replay_draw2_' + P._dwRaw()) : 'x') || '').match(/strict_20\|3/), null);
    // its point: locked
    var a0 = JSON.stringify(nd.a); await drag(ax, ay, ax + 50, ay + 30);
    ok('its point stays where the hawk put it', JSON.stringify(nd.a) === a0, nd.a);
    // the hawk's line: locked
    var ln = DW.list.filter(function (d) { return d.type === 'trend'; })[0], lx = (P._xOfT(0, ln.a.t) + P._xOfT(0, ln.b.t)) / 2, ly = P._yOf(0, ln.a.price), l0 = JSON.stringify([ln.a, ln.b]);
    await click(lx, ly); await drag(lx, ly, lx + 40, ly - 30);
    ok('the hawk\'s other marks stay locked', JSON.stringify([ln.a, ln.b]) === l0, [ln.a, ln.b]);
    // his own line stays picked while the hawk's marks are drawn again (his BE line, as the trade's note says what it made of it)
    var mine = { type: 'hray', a: { t: t, price: price + 0.0005 }, color: '#5b8def', width: 2, mbe: 1 }; DW.list.push(mine); DW.sel = DW.list.length - 1;
    P._studyDraw([LINE, Object.assign({}, NOTE, { off: { x: 80, y: 70 }, text: NOTE.text + '\nWith your BE: Break-even 08:39 · −0.18R' })]); await W(60);
    ok('his own line stays picked as the hawk\'s marks are drawn again', DW.sel != null && DW.list[DW.sel] === mine && DW.list.length === 3, [DW.sel, DW.list.length]);
    var nd2 = DW.list.filter(function (d) { return d.sid; })[0];
    ok('the note comes back where he put it, with its new words', nd2 && nd2.off.x === 80 && nd2.off.y === 70 && /With your BE/.test(nd2.text), nd2 && [nd2.off, nd2.text]);
    // the padlock for every drawing locks the box too
    C.dwLock = true; DW.sel = DW.list.indexOf(nd2); var o0 = JSON.stringify(nd2.off); var bx2 = ax + 80, by2 = ay + 70;
    await drag(bx2, by2, bx2 + 30, by2 + 30);
    ok('with every drawing locked, the box stays too', JSON.stringify(nd2.off) === o0, nd2.off);
    C.dwLock = false;
  } catch (e) { ok('no exception', false, String(e && e.stack || e).slice(0, 600)); }
  try { localStorage.removeItem('st_hk_noff'); } catch (e) {}
  return JSON.stringify(out);
})()
