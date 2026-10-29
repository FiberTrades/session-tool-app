(async function () {
  // A line's words, TradingView's way (Nestor, 29 Oct 2026: "i want to be able to place text in the middle of the lines and below and also be
  // able to move text right left and center"): Above / Middle / Below and Left / Centre / Right, in the line's Text button; Middle sits ON the
  // line, which breaks under the words with nothing painted behind them; never under the price scale; remembered per tool, reset with the rest.
  // Run: python tests/browser_test.py tests/practice_linetext_e2e.js   (LT_LIGHT=1 in the source: a white chart)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stDrawBar); i++) await W(100); await W(800);
    var P = window.__stPractice, LIGHT = !!window.__LT_LIGHT; try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.mini = false; C.news = false; C.dtpl = {}; C.ddef = {}; C.look = LIGHT ? { bg: '#ffffff' } : {};
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(600);
    var DW = P._dr(), pane = P._panes()[0], ch = pane.el.querySelector('.stpr-pc'), tools = document.getElementById('stpr-tools');
    var mev = function (t, xx, yy, o) { var r = ch.getBoundingClientRect(); ch.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mouseup' || t === 'mousemove' ? 0 : 1, view: window }, o || {}))); };
    var click = function (x, y) { mev('mousedown', x, y); mev('mouseup', x, y); };
    var pick = async function (t) { if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); if (DW.tool !== t) tools.querySelector('[data-tool="' + t + '"]').click(); await W(40); };
    var drawN = async function (t, pts) { await pick(t); for (var j = 0; j < pts.length; j++) { if (j) { mev('mousemove', pts[j][0], pts[j][1], { buttons: 1 }); await W(25); } click(pts[j][0], pts[j][1]); await W(40); } await W(80); return DW.list[DW.list.length - 1]; };
    var bar = function () { return P._dbar().el(); }, pop = function () { return P._dbar().pop(); };
    var selOf = async function (d) { DW.sel = DW.list.indexOf(d); P._props(); await W(80); };
    var textPop = async function () { var b = bar().querySelector('[data-db="text"]'); if (!b) return null; b.click(); await W(40); return pop(); };
    var setPos = async function (d, tv, ta) { await selOf(d); var pp = await textPop(); if (tv) pp.querySelector('[data-tv="' + tv + '"]').click(); await W(30); pp = P._dbar().popK() === 'text' ? pop() : await textPop(); if (ta) pp.querySelector('[data-ta="' + ta + '"]').click(); await W(30); P._dbar().closePop(); DW.sel = null; P._props(); await W(160); };
    var words = async function (d, s) { await selOf(d); var pp = await textPop(); var tw = pp.querySelector('[data-tw]'); tw.value = s; tw.dispatchEvent(new Event('input', { bubbles: true })); tw.dispatchEvent(new Event('change', { bubbles: true })); await W(30); P._dbar().closePop(); DW.sel = null; P._props(); await W(160); };
    // what one repaint wrote: each word's top-left on the chart (its rotation too)
    var cap = function () { var got = [], F = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, x, y) { var m = this.getTransform(), dp = window.devicePixelRatio || 1; got.push({ s: String(t), x: (m.a * x + m.c * y + m.e) / dp, y: (m.b * x + m.d * y + m.f) / dp, rot: Math.atan2(m.b, m.a), al: this.textAlign, bl: this.textBaseline, w: this.measureText(String(t)).width }); return F.apply(this, arguments); };
      try { DW.ver = (DW.ver || 0) + 1; P._drawOv(0); } finally { CanvasRenderingContext2D.prototype.fillText = F; } return got; };
    var find = function (s) { return cap().filter(function (q) { return q.s === s; })[0] || null; };
    var px = function (x, y) { var c = pane.ov, dp = window.devicePixelRatio || 1; return Array.prototype.slice.call(c.getContext('2d').getImageData(Math.round(x * dp), Math.round(y * dp), 1, 1).data); };
    var R = ch.getBoundingClientRect(), X = function (f) { return Math.round(R.width * f); }, Y = function (f) { return Math.round(R.height * f); }, dm = P._paneDims ? P._paneDims(0) : null, PW = pane.series.priceScale().width ? R.width - pane.series.priceScale().width() : R.width - 60;

    // a horizontal line with words: as before - above it, at its right, in the line's colour
    DW.list = []; DW.sel = null; P._props();
    var hl = await drawN('hline', [[X(0.5), Y(0.4)]]); await words(hl, 'LOW 16th May 2025');
    var ly = pane.series.priceToCoordinate(hl.price), t0 = find('LOW 16th May 2025');
    ok('a horizontal line\'s words, as before: above it, at its right, short of the price scale', t0 && t0.y + 14 <= ly + 1 && t0.y + 14 >= ly - 8 && t0.x + t0.w <= PW && t0.x + t0.w > PW - 80, [t0, ly, PW]);
    await selOf(hl); var tp = await textPop();
    ok('its toolbar has Text: colour, size, Above / Middle / Below, Left / Centre / Right, its words', tp && ['above', 'middle', 'below'].every(function (v) { return tp.querySelector('[data-tv="' + v + '"]'); }) && ['l', 'c', 'r'].every(function (v) { return tp.querySelector('[data-ta="' + v + '"]'); }) && tp.querySelector('[data-ts]') && tp.querySelector('[data-tw]') && tp.querySelector('[data-ta="r"].on') && tp.querySelector('[data-tv="above"].on'), tp && tp.textContent.slice(0, 120));
    P._dbar().closePop(); DW.sel = null; P._props();
    // Middle: on the line, the line broken under them, nothing behind them
    await setPos(hl, 'middle', 'c'); var t1 = find('LOW 16th May 2025'), nat = (pane.hl || []).map(function (l) { try { return l.options(); } catch (e) { return {}; } }).filter(function (o) { return Math.abs(o.price - hl.price) < 1e-9; })[0];
    var cy = t1 ? t1.y + 7 : 0, cx = t1 ? t1.x + t1.w / 2 : 0;
    ok('Middle, Centre: the words on the line, centred along it', t1 && Math.abs(cy - ly) < 4 && Math.abs(cx - PW / 2) < 30, [t1, ly]);
    var lyR = Math.round(ly), gapL = px(t1.x - 2, lyR), lineL = px(t1.x - 14, lyR), lineR = px(t1.x + t1.w + 14, lyR);
    ok('the line breaks under them (its own line here, the chart\'s hidden), and nothing is painted behind them', nat && nat.lineVisible === false && gapL[3] === 0 && lineL[3] > 100 && lineR[3] > 100, [nat && nat.lineVisible, gapL, lineL, lineR]);
    await setPos(hl, 'below', 'l'); var t2 = find('LOW 16th May 2025');
    ok('Below, Left: just under the line, at its left', t2 && t2.y >= ly && t2.y <= ly + 8 && t2.x < 20, t2);
    await setPos(hl, null, 'r'); var t3 = find('LOW 16th May 2025'); nat = (pane.hl || []).map(function (l) { try { return l.options(); } catch (e) { return {}; } }).filter(function (o) { return Math.abs(o.price - hl.price) < 1e-9; })[0];
    ok('Below, Right: under it at its right - never under the price scale; the chart draws the line again', t3 && t3.y >= ly && t3.x + t3.w <= PW && t3.x + t3.w > PW - 40 && nat && nat.lineVisible !== false, [t3, PW]);
    // remembered for the next horizontal line; Reset to default style puts them back
    var hl2 = await drawN('hline', [[X(0.5), Y(0.7)]]);
    ok('remembered: the next horizontal line\'s words go Below, Right', hl2.tv === 'below' && hl2.ta === 'r' && C.ddef.hline && C.ddef.hline.tv === 'below', [hl2.tv, hl2.ta, C.ddef.hline]);
    await selOf(hl2); bar().querySelector('[data-db="more"]').click(); await W(40); pop().querySelector('[data-tp="reset"]').click(); await W(60); DW.sel = null; P._props();
    ok('Reset to default style: back to Above, Right', !hl2.tv && !hl2.ta && !(C.ddef.hline && C.ddef.hline.tv));

    // a trend line: along it, at its angle; Middle breaks it
    DW.list = []; var tr = await drawN('trend', [[X(0.25), Y(0.7)], [X(0.55), Y(0.45)]]); await words(tr, 'BOS');
    var at = function (q) { return { x: P._xOfT(0, q.t), y: pane.series.priceToCoordinate(q.price) }; }, A = at(tr.a), B = at(tr.b), ang = Math.atan2(B.y - A.y, B.x - A.x);   // where its points went (snapped to candles)
    var u0 = find('BOS');
    ok('a trend line\'s words: along it, at its angle, above it, at its middle (as before)', u0 && Math.abs(u0.rot - ang) < 0.05 && Math.hypot((u0.x + Math.cos(ang) * u0.w / 2) - (A.x + B.x) / 2, (u0.y) - (A.y + B.y) / 2) < 30, [u0, ang]);
    await setPos(tr, 'middle', 'l'); var u1 = find('BOS'), mid = { x: u1.x + Math.cos(ang) * u1.w / 2 - Math.sin(ang) * 7, y: u1.y + Math.sin(ang) * u1.w / 2 + Math.cos(ang) * 7 };
    var onLine = Math.abs((B.y - A.y) * mid.x - (B.x - A.x) * mid.y + B.x * A.y - B.y * A.x) / Math.hypot(B.y - A.y, B.x - A.x);
    ok('Middle, Left: on the line near its start, the line broken there', onLine < 4 && Math.hypot(mid.x - A.x, mid.y - A.y) < u1.w / 2 + 25, [onLine, mid, A]);
    var g0 = { x: u1.x - Math.cos(ang) * 1.5 + Math.sin(ang) * 0, y: u1.y }, gp = px(A.x + Math.cos(ang) * 4, A.y + Math.sin(ang) * 4);
    ok('...nothing painted behind them', gp[3] === 0, gp);
    await setPos(tr, 'below', 'r'); var u2 = find('BOS'), end = { x: u2.x + Math.cos(ang) * u2.w, y: u2.y + Math.sin(ang) * u2.w };
    ok('Below, Right: under it, ending near its second point', Math.hypot(end.x - B.x, end.y - B.y) < 30 && ((u2.x - A.x) * (B.y - A.y) - (u2.y - A.y) * (B.x - A.x)) < 0, [end, B]);
    // a vertical line: its words level - Top / Middle / Bottom along it, Left / on it / Right of it
    var vl = await drawN('vline', [[X(0.4), Y(0.5)]]); await words(vl, 'NFP'); var vx = P._xOfT(0, vl.a.t), v0 = find('NFP');
    ok('a vertical line\'s words: level, at its top, right of it (as before)', v0 && Math.abs(v0.rot) < 0.01 && v0.y < 30 && v0.x > vx && v0.x < vx + 12, [v0, vx]);
    // the line's pixels a column either side (it sits on a whole pixel, the time on a fraction)
    var colA = function (y) { var m = 0; for (var sx = Math.floor(vx) - 1; sx <= Math.ceil(vx) + 1; sx++) m = Math.max(m, px(sx, y)[3]); return [m]; };
    await setPos(vl, 'middle', 'c'); var v1 = find('NFP'), vgap = [0, 0, 0, colA(v1.y - 1)[0]], vline = [0, 0, 0, colA(v1.y - 20)[0]];
    ok('Middle, On the line: in the middle of it, the line broken behind the words', Math.abs(v1.x + v1.w / 2 - vx) < 2 && Math.abs(v1.y - R.height / 2) < 40 && vgap[3] === 0 && vline[3] > 100, [v1, vgap, vline]);
    await setPos(vl, 'below', 'l'); var v2 = find('NFP');
    ok('Bottom, Left: at its foot, left of it', v2.x + v2.w < vx && v2.y > R.height * 0.7, v2);
    // a ray and a horizontal ray keep their places and take the same options
    var hr = await drawN('hray', [[X(0.3), Y(0.3)]]); await words(hr, 'PDH'); var r0 = find('PDH'), rx = P._xOfT(0, hr.a.t);
    ok('a horizontal ray\'s words, as before: above it at its start', r0 && r0.x >= rx && r0.x < rx + 12 && r0.y < pane.series.priceToCoordinate(hr.a.price), [r0, rx]);
    await setPos(hr, 'middle', 'r'); var r1 = find('PDH');
    ok('Middle, Right: on it, short of the price scale', r1 && Math.abs(r1.y + 7 - pane.series.priceToCoordinate(hr.a.price)) < 4 && r1.x + r1.w <= PW, [r1, PW]);
    var raw = JSON.stringify(DW.list.filter(function (d) { return d.text; }).map(function (d) { return [d.type, d.tv || '', d.ta || '']; }));
    ok('kept with the drawings', /"hray","middle","r"/.test(raw) && /"vline","below","l"/.test(raw), raw);

    // off the chart (Nestor, 29 Oct 2026: "why is this label here?" - a line under the prices on show kept its words at the chart's foot,
    // over the spread): the price scale zoomed with the mouse wheel until one line with words leaves the top and another the bottom -
    // their words go with them, never pulled into view; back in view, back again
    DW.list = []; DW.sel = null; P._props();
    var hT = await drawN('hline', [[X(0.5), Y(0.12)]]); await words(hT, 'LOW TOP'); var hB = await drawN('hline', [[X(0.5), Y(0.8)]]); await words(hB, 'LOW FOOT');
    var ph = R.height - pane.chart.timeScale().height(), yT = function () { return pane.series.priceToCoordinate(hT.price); }, yB = function () { return pane.series.priceToCoordinate(hB.price); };
    ok('both lines on the chart: both their words', find('LOW TOP') && find('LOW FOOT') && yT() > 0 && yB() < ph, [yT(), yB(), ph]);
    var wheel = function (dy) { var r = ch.getBoundingClientRect(); ch.dispatchEvent(new WheelEvent('wheel', { clientX: r.left + PW + 20, clientY: r.top + ph / 2, deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true, view: window })); };
    for (var z = 0; z < 30 && yT() > -20; z++) { wheel(-120); await W(40); }   // taller candles: the range shrinks round its middle, the top line goes off the top
    var lt1 = find('LOW TOP'), lf1 = find('LOW FOOT');
    ok('zoomed until the top line is above the chart: no words for it at the top edge (or anywhere)', yT() < 0 && !lt1, [yT(), lt1]);
    for (z = 0; z < 30 && yB() < ph + 20; z++) { wheel(-120); await W(40); }
    lf1 = find('LOW FOOT'); var any = cap().filter(function (q) { return /^LOW /.test(q.s); });
    ok('...and on until the foot line is under it: no words for either, nothing at the foot', yB() > ph && !lf1 && !any.length, [yB(), ph, any]);
    ch.dispatchEvent(new MouseEvent('dblclick', { clientX: ch.getBoundingClientRect().left + PW + 20, clientY: ch.getBoundingClientRect().top + ph / 2, bubbles: true, cancelable: true, view: window })); await W(120);
    ok('the scale back to its fit (a double-click on it): both lines\' words back', yT() > 0 && yB() < ph && find('LOW TOP') && find('LOW FOOT'), [yT(), yB()]);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
