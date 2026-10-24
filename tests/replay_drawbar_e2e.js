(async function () {
  // Trade Replay gets Back Testing's drawing toolbar (Nestor, 19 Oct 2026: "build all the tradingview suggestions! i love them!!";
  // his rule: what changes for Live Charts / Back Testing goes to Trade Replay too): TradingView's floating bar over the selected
  // drawing, the same Templates (shared with Back Testing and Live Charts, synced with their settings), the richer looks, and
  // Hide all / Lock all beside undo / redo / the bin. A made-up EUR/USD short on Thu 1 Oct 2026 over the real shared candles
  // (signed out: nothing is read from or written to anyone's journal).
  // Run: python tests/browser_test.py tests/replay_drawbar_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stReplay && window.__stSB && window.__stPractice && window.__stDrawBar); i++) await W(100);
    await W(1000);
    var R = window.__stReplay, PC = window.__stPractice._cfg();
    try { localStorage.removeItem('st_replay_draw2_999999903'); localStorage.removeItem('st_replay_dwhide'); localStorage.removeItem('st_replay_dwlock'); } catch (e) {}
    PC.dtpl = { rect: [{ n: 'Range box', l: { color: '#f472b6', fill: 'rgba(244,114,182,0.2)', mid: true, midDash: 'dotted', dash: 'dashed' } }] }; PC.ddef = {};
    var trade = { mt5Ticket: 999999903, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 };
    R.open(trade); for (var k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(800);
    var S = R._s(); S.drawings = []; S.sel = null;
    var chart = document.getElementById('strp-chart'), r = chart.getBoundingClientRect(), DB = R._dbar();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || chart; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0, detail: 1 }, o || {}))); };
    var click = function (xx, yy) { mev('mousedown', xx, yy); mev('mouseup', xx, yy); mev('click', xx, yy); };
    var bar = function () { var b = document.querySelector('.strp-card .stdb-bar'); return b && b.style.display !== 'none' ? b : null; }, pop = function () { return DB.pop(); };
    var px = function (x, y) { var c = document.getElementById('strp-ov'), d = window.devicePixelRatio || 1; return Array.prototype.slice.call(c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data); };
    var db = document.getElementById('strp-drawbtn'); if (db && !document.getElementById('strp-tb').classList.contains('strp-drawopen')) db.click(); await W(40);
    ok('no options box any more', !document.getElementById('strp-props'));

    // a rectangle: the toolbar over it, in the replay's card
    var X0 = Math.round(r.width * 0.3), X1 = Math.round(r.width * 0.5), Y0 = Math.round(r.height * 0.35), Y1 = Math.round(r.height * 0.55);
    document.querySelector('#strp-tools [data-tool="rect"]').click(); await W(20); click(X0, Y0); await W(30); mev('mousemove', X1, Y1); await W(30); click(X1, Y1); await W(80);
    var d0 = S.drawings[0], b = bar(), br = b && b.getBoundingClientRect();
    var acts = b ? Array.prototype.map.call(b.querySelectorAll('[data-db]'), function (x) { return x.getAttribute('data-db'); }).join(',') : '';
    ok('a rectangle placed: the toolbar floats just above it, as in Back Testing (no alert bell: these lines carry none)', d0 && d0.type === 'rect' && S.sel === 0 && b && acts === 'tpl,line,fill,text,width,dash,vis,lock,del,more' && br.bottom <= r.top + Y0 && br.bottom > r.top + Y0 - 30, [acts, br && br.bottom, r.top + Y0]);
    // Back Testing's templates are here too
    b.querySelector('[data-db="tpl"]').click(); await W(30);
    ok('its Templates are the ones saved in Back Testing (Range box)', DB.popK() === 'tpl' && /Range box/.test(pop().textContent) && /Your rectangle templates/i.test(pop().textContent), pop().textContent);
    pop().querySelector('[data-tpa="0"]').click(); await W(80);
    var rr = { x0: Math.min(R._bbox(d0).x0, R._bbox(d0).x1), y0: R._bbox(d0).y0, y1: R._bbox(d0).y1, x1: R._bbox(d0).x1 }, fp = px(rr.x0 + 30, rr.y0 + 8), mp = 0;
    for (var xx = Math.round(rr.x0 + 4); xx < rr.x0 + 60; xx++) { var c = px(xx, Math.round((rr.y0 + rr.y1) / 2)); if (c[0] > 200 && c[2] > 150 && c[3] > 150) mp++; }
    ok('applied: its pink 20% fill, dashed border, a dotted middle line', d0.color === '#f472b6' && d0.fill === 'rgba(244,114,182,0.2)' && d0.mid === true && Math.abs(fp[0] - 244) <= 4 && Math.abs(fp[3] - 51) <= 3 && mp > 3 && mp < 56, [fp, mp]);
    ok('applied, it is remembered as the look of new rectangles: kept in Back Testing\'s settings (synced), so new rectangles there take it too', PC.ddef.rect && PC.ddef.rect.color === '#f472b6' && JSON.parse(localStorage.getItem('st_practice_cfg') || '{}').ddef.rect.fill === 'rgba(244,114,182,0.2)');
    S.sel = null; S.noProps = false; R._dbar().hide();
    document.querySelector('#strp-tools [data-tool="rect"]').click(); await W(20); click(X0, Y1 + 40); await W(30); mev('mousemove', X1, Y1 + 90); await W(30); click(X1, Y1 + 90); await W(80);
    var d1 = S.drawings[1];
    ok('a new rectangle takes the default look (and is born on this timeframe, as before)', d1 && d1.fill === 'rgba(244,114,182,0.2)' && d1.mid === true && d1.tfs && d1.tfs.length === 1, d1);
    // the line colour's palette, and a trend line's style and extension
    bar().querySelector('[data-db="line"]').click(); await W(20);
    ok('line colour: the 80 colours, an opacity, + Custom colour', pop().querySelectorAll('[data-pc]').length === 80 && pop().querySelector('[data-pop]') && pop().querySelector('[data-pcus]'));
    DB.closePop();

    // Hide all / Lock all
    var hb = document.getElementById('strp-hideall'), lb = document.getElementById('strp-lockall');
    ok('Hide all and Lock all beside undo / redo / the bin', hb && lb && hb.previousElementSibling.id === 'strp-del' && lb.previousElementSibling === hb && hb.title === 'Hide all drawings' && lb.title === 'Lock all drawings');
    var before = px(rr.x0 + 30, rr.y0 + 8); hb.click(); await W(120); var after = px(rr.x0 + 30, rr.y0 + 8);
    ok('Hide all: off the chart, nothing selected, the eye lit, remembered here', before[3] > 0 && after[3] === 0 && S.sel == null && hb.classList.contains('on') && hb.title === 'Show all drawings' && localStorage.getItem('st_replay_dwhide') === '1', [before, after]);
    hb.click(); await W(120);
    ok('pressed again: back', px(rr.x0 + 30, rr.y0 + 8)[3] > 0 && !hb.classList.contains('on'));
    lb.click(); await W(40);
    var a0 = d0.a.idx; click((rr.x0 + rr.x1) / 2, rr.y0 + 12); await W(40);
    var lkB = bar() && bar().querySelector('[data-db="lock"]');
    ok('Lock all: a drawing picked shows locked in its toolbar', S.sel === 0 && lkB && lkB.classList.contains('act') && /Every drawing is locked/.test(lkB.title), lkB && lkB.title);
    mev('mousedown', (rr.x0 + rr.x1) / 2, rr.y0 + 12); mev('mousemove', (rr.x0 + rr.x1) / 2 + 60, rr.y0 + 40, { held: true }); mev('mouseup', (rr.x0 + rr.x1) / 2 + 60, rr.y0 + 40); await W(40);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true })); await W(40);
    ok('locked: it does not move and Delete leaves it', d0.a.idx === a0 && S.drawings.length === 2, [a0, d0.a.idx, S.drawings.length]);
    lb.click(); await W(40);
    ok('pressed again: unlocked', !R._all().lock && !lb.classList.contains('on'));
    // news: ONE disc per candle (Nestor, 19 Oct 2026: "can you just have 1 news dot instead of 4 blocking the view of the candle?")
    var bi = S.cursor - 6, bt = new Date(S.bars[bi].time * 1000).toISOString();
    R._newsSet([{ at: bt, currency: 'USD', title: 'Core CPI y/y', impact: 'Medium', forecast: '3.1%', previous: '3.1%', actual: '3.0%' }, { at: bt, currency: 'USD', title: 'CPI m/m', impact: 'High', forecast: '0.3%', previous: '0.4%', actual: '0.2%' },
      { at: bt, currency: 'USD', title: 'Core CPI m/m', impact: 'High', forecast: '0.3%', previous: '0.3%', actual: '0.3%' }, { at: bt, currency: 'USD', title: 'CPI y/y', impact: 'High', forecast: '2.9%', previous: '2.9%', actual: '2.8%' }]);
    await W(200); var nh = (S._newsHit || []).filter(function (h) { return h.i === bi; });
    ok('Trade Replay, four releases on one candle: ONE disc with a 4 on it', nh.length === 1 && nh[0].n === 4 && (S._newsHit || []).length === 1, (S._newsHit || []).map(function (h) { return [h.i, h.n, h.y]; }));
    if (nh[0]) R._newsCard(nh[0]); var ncard = document.getElementById('strp-newscard'), nit = ncard ? ncard.querySelectorAll('.strp-nc-item') : [];
    ok('its card lists all four, highest impact first, each with Actual / Forecast / Previous', ncard && ncard.style.display === 'block' && ncard.classList.contains('multi') && nit.length === 4 && nit[0].querySelector('.strp-nc-dot.high') && /Core CPI y\/y/.test(nit[3].textContent) && nit[3].querySelector('.strp-nc-dot.med') && nit[0].querySelectorAll('.strp-nc-k').length === 3, ncard && ncard.textContent);
    R._newsCard(null); R._newsSet([]);
    R.close(); await W(150);
    PC.dtpl = {}; PC.ddef = {};
    try { localStorage.removeItem('st_replay_draw2_999999903'); localStorage.removeItem('st_replay_dwhide'); localStorage.removeItem('st_replay_dwlock'); Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
