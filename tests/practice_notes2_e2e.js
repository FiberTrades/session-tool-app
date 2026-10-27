(async function () {
  // TradingView's TEXT AND NOTES group (Nestor, 26 Oct 2026: "i need all these"): Text, Note, Price note, Pin, Table, Callout, Comment,
  // Price label, Signpost, Flag mark - placed, their words typed on the chart (a table's cells in a small window), hit, moved, kept.
  // Run: python tests/browser_test.py tests/practice_notes2_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stDrawBar); i++) await W(100); await W(800);
    var P = window.__stPractice; try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.mini = false; C.news = false; C.dtpl = {}; C.ddef = {};
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(600);
    var DW = P._dr(), pane = P._panes()[0], ch = pane.el.querySelector('.stpr-pc'), tools = document.getElementById('stpr-tools');
    var mev = function (t, xx, yy, o) { var r = ch.getBoundingClientRect(); ch.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mouseup' || t === 'mousemove' ? 0 : 1, view: window }, o || {}))); };
    var click = function (x, y) { mev('mousedown', x, y); mev('mouseup', x, y); };
    var pick = async function (t) { if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); if (DW.tool !== t) tools.querySelector('[data-tool="' + t + '"]').click(); await W(40); };
    var place = async function (t, pts) { await pick(t); for (var j = 0; j < pts.length; j++) { if (j) { mev('mousemove', pts[j][0], pts[j][1], { buttons: 1 }); await W(25); } click(pts[j][0], pts[j][1]); await W(40); } await W(80); return DW.list[DW.list.length - 1]; };
    var ed = function () { return pane.el.querySelector('.stpr-txed'); };
    var type = async function (s, key) { var ta = ed(); if (!ta) return false; ta.value = s; ta.dispatchEvent(new Event('input', { bubbles: true })); ta.dispatchEvent(new KeyboardEvent('keydown', { key: key || 'Enter', bubbles: true, cancelable: true })); await W(80); return true; };
    var drag = async function (x0, y0, x1, y1) { mev('mousedown', x0, y0); mev('mousemove', (x0 + x1) / 2, (y0 + y1) / 2, { buttons: 1 }); await W(30); mev('mousemove', x1, y1, { buttons: 1 }); await W(30); mev('mouseup', x1, y1); await W(60); };
    var texts = function () { var got = [], F = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { got.push(String(t)); return F.apply(this, arguments); }; try { DW.ver = (DW.ver || 0) + 1; P._drawOv(0); } finally { CanvasRenderingContext2D.prototype.fillText = F; } return got; };
    var at = function (q) { return { x: P._xOfT(0, q.t), y: pane.series.priceToCoordinate(q.price) }; };
    var hit = function (x, y) { return P._hit(0, x, y) || {}; };
    var R = ch.getBoundingClientRect(), Wd = R.width, H = R.height, X = function (f) { return Math.round(Wd * f); }, Y = function (f) { return Math.round(H * f); };
    var bar = function () { return document.querySelector('.stdb-bar'); }, acts = function () { var b = bar(); return b ? Array.prototype.map.call(b.querySelectorAll('[data-db]'), function (x) { return x.getAttribute('data-db'); }).join(',') : ''; };

    var grp = tools.querySelector('.stpr-tg[data-grp="notes"]'), names = Array.prototype.map.call(grp.querySelectorAll('[data-tool]'), function (b) { return b.getAttribute('data-tool'); }).join(',');
    var lbl = function (t) { var b = grp.querySelector('[data-tool="' + t + '"] span'); return b ? b.textContent : ''; };
    ok('the Text and notes menu, as TradingView\'s: Text, Note, Price note, Pin, Table, Callout, Comment, Price label, Signpost, Flag mark', names.indexOf('text,anote,note,pin,table,callout,comment,plabel,signpost,flag') === 0 && lbl('anote') === 'Note' && lbl('plabel') === 'Price label' && lbl('flag') === 'Flag mark', names);

    // Comment: one click, then its words on the chart
    DW.list = []; DW.sel = null; P._props();
    var cm = await place('comment', [[X(0.3), Y(0.6)]]), ta = ed();
    ok('Comment: one click opens its words on the chart, in its bubble', cm && cm.type === 'comment' && ta && DW.tool === 'none', !!ta);
    await type('Asia high swept');
    ok('typed and kept: the bubble shows them', !ed() && DW.list.indexOf(cm) >= 0 && cm.text === 'Asia high swept' && texts().indexOf('Asia high swept') >= 0);
    var CA = at(cm.a);
    ok('its bubble and its point take the mouse', hit(CA.x + 30, CA.y - 22).i === DW.list.indexOf(cm) && hit(CA.x, CA.y).part === 'a', hit(CA.x + 30, CA.y - 22));
    DW.sel = DW.list.indexOf(cm); P._props(); await W(60);
    ok('its toolbar: line, background, text', /line/.test(acts()) && /fill/.test(acts()) && /text/.test(acts()) && !/width/.test(acts()), acts());
    var n1 = DW.list.length; await place('comment', [[X(0.5), Y(0.6)]]); await type('', 'Escape');
    ok('a comment left with no words goes', DW.list.length === n1);
    // a double-click opens its words again
    ch.dispatchEvent(new MouseEvent('dblclick', { clientX: R.left + CA.x + 30, clientY: R.top + CA.y - 22, bubbles: true, cancelable: true, view: window })); await W(60);
    ok('a double-click opens its words again', !!ed() && ed().value === 'Asia high swept'); await type('Asia high swept');

    // Note: its words only while the mouse is on it or it is selected
    var nt = await place('anote', [[X(0.45), Y(0.5)]]); await type('Watch the NY open');
    DW.sel = null; DW.hov = null; P._props();
    var hidden = texts().indexOf('Watch the NY open') < 0, NA = at(nt.a);
    mev('mousemove', NA.x, NA.y - 18); await W(60);
    ok('Note: a marker; its words show while the mouse is on it', nt.type === 'anote' && hidden && DW.list[DW.hov] === nt && texts().indexOf('Watch the NY open') >= 0, [hidden, DW.hov]);
    // Pin: its words optional
    var pn = await place('pin', [[X(0.55), Y(0.45)]]); await type('', 'Escape');
    ok('Pin: kept with no words (a pin on its own)', DW.list.indexOf(pn) >= 0 && pn.type === 'pin' && !pn.text);
    var PA = at(pn.a); mev('mousemove', X(0.9), Y(0.9)); await W(30);
    ok('its pin takes the mouse', hit(PA.x, PA.y - 18).i === DW.list.indexOf(pn));
    // Callout: a point, then its box
    var co = await place('callout', [[X(0.2), Y(0.75)], [X(0.3), Y(0.4)]]); await type('Liquidity');
    var BA = at(co.b), a0 = JSON.stringify(co.a);
    ok('Callout: two clicks - its point, then its box; then its words', co.type === 'callout' && co.text === 'Liquidity' && texts().indexOf('Liquidity') >= 0 && hit(BA.x + 20, BA.y + 10).part === 'bmv', hit(BA.x + 20, BA.y + 10));
    DW.sel = DW.list.indexOf(co); await drag(BA.x + 20, BA.y + 10, BA.x + 80, BA.y + 40);
    ok('dragging its box moves the box, its point stays', JSON.stringify(co.a) === a0 && Math.abs(at(co.b).x - (BA.x + 60)) < 14 && Math.abs(at(co.b).y - (BA.y + 30)) < 6, [at(co.b), BA]);
    // Price label: the price at its point
    var pl = await place('plabel', [[X(0.62), Y(0.55)]]);
    ok('Price label: one click, the price at its point in a tag', pl.type === 'plabel' && DW.tool === 'none' && texts().indexOf(Number(pl.a.price).toFixed(5)) >= 0, Number(pl.a.price).toFixed(5));
    // Signpost: a label on a post; its label moves up and down
    var sp = await place('signpost', [[X(0.7), Y(0.7)]]); await type('NFP');
    var SA = at(sp.a), oy = sp.off.y;
    ok('Signpost: a label on a post over the point, its words in it', sp.type === 'signpost' && oy < -30 && texts().indexOf('NFP') >= 0 && hit(SA.x, SA.y + oy).part === 'box' && hit(SA.x, SA.y + oy / 2).part === 'body');
    DW.sel = DW.list.indexOf(sp); await drag(SA.x, SA.y + oy, SA.x, SA.y + oy - 40);
    ok('dragging its label raises it, the point stays', sp.off.y < oy - 30 && Math.abs(at(sp.a).y - SA.y) < 1, [sp.off.y, oy]);
    // Flag mark
    var fl = await place('flag', [[X(0.8), Y(0.6)]]), FA = at(fl.a);
    ok('Flag mark: one click, a flag on a pole at the point', fl.type === 'flag' && DW.tool === 'none' && hit(FA.x + 8, FA.y - 20).i === DW.list.indexOf(fl) && !ed());

    // Table: its cells in a small window
    var tb = await place('table', [[X(0.15), Y(0.15)]]), dlg = document.querySelector('.stpr-dlgbg');
    ok('Table: one click opens its cells, two by two', tb.type === 'table' && dlg && dlg.querySelectorAll('[data-tc]').length === 4, dlg && dlg.querySelectorAll('[data-tc]').length);
    var setC = function (k, v) { var el = document.querySelector('.stpr-dlgbg [data-tc="' + k + '"]'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    setC('0,0', 'Session'); setC('0,1', 'Bias'); setC('1,0', 'London'); setC('1,1', 'Long');
    document.querySelector('.stpr-dlgbg [data-tbr="1"]').click(); await W(40);
    ok('+ Row adds a row', document.querySelectorAll('.stpr-dlgbg [data-tc]').length === 6);
    setC('2,0', 'New York'); setC('2,1', 'Short'); document.querySelector('.stpr-dlgbg [data-dok]').click(); await W(80);
    var tx = texts();
    ok('Ok: the table on the chart, each cell in its place', !document.querySelector('.stpr-dlgbg') && JSON.stringify(tb.cells) === JSON.stringify([['Session', 'Bias'], ['London', 'Long'], ['New York', 'Short']]) && ['Session', 'Bias', 'London', 'Long', 'New York', 'Short'].every(function (s) { return tx.indexOf(s) >= 0; }), tb.cells);
    var TA = at(tb.a);
    ok('it takes the mouse; its corner is a handle', hit(TA.x + 30, TA.y + 30).part === 'body' && hit(TA.x, TA.y).part === 'a');
    ch.dispatchEvent(new MouseEvent('dblclick', { clientX: R.left + TA.x + 30, clientY: R.top + TA.y + 30, bubbles: true, cancelable: true, view: window })); await W(60);
    setC('0,0', 'XXX'); document.querySelector('.stpr-dlgbg [data-dx]').click(); await W(60);
    ok('a double-click opens it again; closing without Ok leaves it as it was', tb.cells[0][0] === 'Session' && !document.querySelector('.stpr-dlgbg'));
    var n2 = DW.list.length; await place('table', [[X(0.6), Y(0.2)]]); document.querySelector('.stpr-dlgbg [data-dx]').click(); await W(60);
    ok('a new table closed without Ok goes', DW.list.length === n2);
    // kept
    var raw = JSON.stringify(DW.list.map(function (d) { return d.type; }));
    ok('all kept with the symbol\'s drawings', ['comment', 'anote', 'pin', 'callout', 'plabel', 'signpost', 'flag', 'table'].every(function (t) { return raw.indexOf('"' + t + '"') >= 0; }), raw);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
