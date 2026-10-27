(async function () {
  // TradingView's CONTENT > Image (Nestor, 26 Oct 2026): a click on the chart opens the file picker; the picture is made smaller
  // (about 1600 px on its long side, WebP or JPEG, 2 MB at most), saved under the member's own folder in the private chart-images
  // bucket, shown where the click was and sized by its corners. Read once per device: no repaint fetches it again. The bucket is
  // stood in for here (window.__stChartImg.api); its owner-only rules are checked on the database (supabase/chart_images.sql).
  // Run: python tests/browser_test.py tests/practice_image_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var realClick = HTMLInputElement.prototype.click;
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stDrawBar && window.__stChartImg); i++) await W(100); await W(800);
    var P = window.__stPractice, CI = window.__stChartImg; try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.mini = false; C.news = false; C.dtpl = {}; C.ddef = {};
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(600);
    var DW = P._dr(), pane = P._panes()[0], ch = pane.el.querySelector('.stpr-pc'), tools = document.getElementById('stpr-tools');
    var mev = function (t, xx, yy, o) { var r = ch.getBoundingClientRect(); ch.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mouseup' || t === 'mousemove' ? 0 : 1, view: window }, o || {}))); };
    var click = function (x, y) { mev('mousedown', x, y); mev('mouseup', x, y); };
    var pick = async function (t) { if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); if (DW.tool !== t) tools.querySelector('[data-tool="' + t + '"]').click(); await W(40); };
    var drag = async function (x0, y0, x1, y1) { mev('mousedown', x0, y0); mev('mousemove', (x0 + x1) / 2, (y0 + y1) / 2, { buttons: 1 }); await W(30); mev('mousemove', x1, y1, { buttons: 1 }); await W(30); mev('mouseup', x1, y1); await W(60); };
    var at = function (q) { return { x: P._xOfT(0, q.t), y: pane.series.priceToCoordinate(q.price) }; };
    var hit = function (x, y) { return P._hit(0, x, y) || {}; };
    var R = ch.getBoundingClientRect(), Wd = R.width, H = R.height, X = function (f) { return Math.round(Wd * f); }, Y = function (f) { return Math.round(H * f); };
    var draws = function () { var n = 0, F = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage = function () { n++; return F.apply(this, arguments); }; try { DW.ver = (DW.ver || 0) + 1; P._drawOv(0); } finally { CanvasRenderingContext2D.prototype.drawImage = F; } return n; };
    // a 2400 x 1200 screenshot-like PNG
    var cv = document.createElement('canvas'); cv.width = 2400; cv.height = 1200; var cg = cv.getContext('2d'); cg.fillStyle = '#131722'; cg.fillRect(0, 0, 2400, 1200); for (var j = 0; j < 60; j++) { cg.fillStyle = j % 2 ? '#26a69a' : '#ef5350'; cg.fillRect(40 + j * 38, 300 + Math.sin(j) * 200, 20, 300); }
    var png = await new Promise(function (r) { cv.toBlob(r, 'image/png'); }), file = new File([png], 'setup.png', { type: 'image/png' });
    // the bucket, stood in for
    var ups = [], downs = [], failUp = false, uid = 'aaaaaaaa-0000-4000-8000-000000000001';
    CI.api.uid = function () { return uid; };
    CI.api.up = function (path, blob) { ups.push({ path: path, size: blob.size, type: blob.type }); return Promise.resolve(failUp ? { error: { message: 'nope' } } : { data: { path: path } }); };
    CI.api.down = function (path) { downs.push(path); return Promise.resolve({ data: png }); };
    var picked = 0; HTMLInputElement.prototype.click = function () { if (this.type !== 'file') return realClick.apply(this, arguments); picked++; var el = this; setTimeout(function () { var dt = new DataTransfer(); dt.items.add(file); el.files = dt.files; el.dispatchEvent(new Event('change')); }, 0); };

    var grp = tools.querySelector('.stpr-tg[data-grp="notes"]'), hd = Array.prototype.map.call(grp.querySelectorAll('.stpr-tfh'), function (h) { return h.textContent; }).join('|');
    ok('the Text and notes menu ends with Content: Image', hd === 'Text & notes|Content' && !!grp.querySelector('[data-tool="image"] svg'), hd);

    DW.list = []; DW.sel = null; P._props();
    await pick('image'); click(X(0.3), Y(0.3)); for (var w = 0; w < 50 && !ups.length; w++) await W(100); await W(200);
    var im = DW.list[DW.list.length - 1];
    ok('a click opens the file picker; the picture goes where the click was, the tool put down', picked === 1 && im && im.type === 'image' && DW.tool === 'none' && Math.abs(at(im.a).x - X(0.3)) < 12, [picked, im && im.type]);
    ok('made smaller before it goes: 1600 x 800, WebP (or JPEG), under 2 MB', im.iw === 1600 && im.ih === 800 && ups.length === 1 && /^image\/(webp|jpeg)$/.test(ups[0].type) && ups[0].size <= 2097152, [im.iw, im.ih, ups[0]]);
    ok('saved under the member\'s own folder', ups[0].path.indexOf(uid + '/charts/') === 0 && im.src === ups[0].path, ups[0].path);
    var A = at(im.a), B = at(im.b);
    ok('shown at 280 px on its long side, its shape kept', Math.abs((B.x - A.x) - 280) < 14 && Math.abs((B.y - A.y) - 140) < 6, [B.x - A.x, B.y - A.y]);
    var n1 = draws();
    ok('painted from the picture in hand - nothing fetched', n1 >= 1 && downs.length === 0, [n1, downs.length]);
    for (var z = 0; z < 20; z++) draws();
    ok('twenty repaints later, still nothing fetched', downs.length === 0);
    ok('its corners are handles, its inside takes the mouse', hit(A.x, A.y).part === 'a' && hit(B.x, B.y).part === 'b' && hit(A.x, B.y).part === 'c1' && hit(B.x, A.y).part === 'c2' && hit((A.x + B.x) / 2, (A.y + B.y) / 2).part === 'body');
    DW.sel = DW.list.indexOf(im); await drag(B.x, B.y, B.x + 60, B.y + 40);
    ok('dragging a corner sizes it', at(im.b).x > B.x + 40 && at(im.b).y > B.y + 25 && Math.abs(at(im.a).x - A.x) < 1, [at(im.b), B]);
    DW.sel = DW.list.indexOf(im); P._props(); await W(60);
    var acts = Array.prototype.map.call(document.querySelectorAll('.stdb-bar [data-db]'), function (x) { return x.getAttribute('data-db'); }).join(',');
    ok('its toolbar: no line colour, width or style', !/line|width|dash/.test(acts) && /del/.test(acts), acts);

    // another device: not in memory, read from the bucket once, then from this device's cache
    var p2 = uid + '/charts/other-device.webp'; CI._forget(p2); var e1 = CI.get(p2); for (w = 0; w < 30 && !e1.ok; w++) await W(100);
    ok('a picture this device has not got: read from the bucket once', e1.ok && downs.length === 1 && downs[0] === p2, [e1, downs]);
    CI._forget(p2); var e2 = CI.get(p2); for (w = 0; w < 30 && !e2.ok; w++) await W(100);
    ok('the next time (a new session): from this device\'s cache, not the bucket', e2.ok && downs.length === 1, downs.length);
    // a failed upload takes it away again
    failUp = true; var n0 = DW.list.length; await pick('image'); click(X(0.6), Y(0.4)); for (w = 0; w < 50 && ups.length < 2; w++) await W(100); await W(300);
    ok('an upload that fails takes the picture away and says so', DW.list.length === n0 && ups.length === 2, [DW.list.length, n0]);
    // signed out: the tool says so and places nothing
    failUp = false; CI.api.uid = function () { return null; }; var pk0 = picked; await pick('image'); click(X(0.5), Y(0.5)); await W(150);
    ok('signed out: no file picker, nothing placed', picked === pk0 && DW.list.length === n0);
    CI.api.uid = function () { return uid; };
    // copies share the file
    DW.sel = DW.list.indexOf(im); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', ctrlKey: true, bubbles: true })); await W(30); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', code: 'KeyV', ctrlKey: true, bubbles: true })); await W(80);
    var cp = DW.list[DW.list.length - 1];
    ok('a copy is pasted three candles on, the same picture (no second upload)', cp !== im && cp.type === 'image' && cp.src === im.src && ups.length === 2 && P._lOfT(0, cp.a.t) - P._lOfT(0, im.a.t) === 3);
    var raw = JSON.stringify(DW.list.filter(function (d) { return d.type === 'image'; }));
    ok('kept with the symbol\'s drawings as its path and size only (no picture data)', raw.length < 600 && raw.indexOf('data:') < 0 && raw.indexOf('blob:') < 0, raw.length);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  finally { HTMLInputElement.prototype.click = realClick; }
  return JSON.stringify(out);
})()
