(async function () {
  // Trade Replay gets Practice Replay's drawing pieces (Nestor, 17 Oct 2026, the approved list: "My suggestion is 1-4 now ...
  // these sound perfect!"): Long / Short position, Emoji, the measure as TradingView's price range, Lock, the object tree,
  // Remove all drawings from the bin, the Visibility window, the options box on a click only, position tags on hover.
  // A made-up EUR/USD short on Thu 1 Oct 2026 (10-pip stop, no target) over the real shared candles (signed out: nothing
  // is read from or written to anyone's journal).
  // Run: python tests/browser_test.py tests/replay_tools_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stReplay && window.__stSB); i++) await W(100);
    await W(1000);
    var R = window.__stReplay, errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var trade = { mt5Ticket: 999999902, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 };
    try { localStorage.removeItem('st_replay_draw2_999999902'); localStorage.removeItem('st_replay_emoji'); } catch (e) {}
    R.open(trade); for (var k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(800);
    var S = R._s();
    ok('Trade Replay opens on the made-up trade', S && S.bars && S.bars.length > 20, S && S.bars && S.bars.length);
    S.drawings = []; S.sel = null;
    var chart = document.getElementById('strp-chart'), r = chart.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || chart; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: t === 'contextmenu' ? 2 : 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0, detail: t === 'dblclick' ? 2 : 1 }, o || {}))); };
    var click = function (xx, yy) { mev('mousedown', xx, yy); mev('mouseup', xx, yy); mev('click', xx, yy); };
    var drag = function (x0, y0, x1, y1) { mev('mousedown', x0, y0); mev('mousemove', (x0 + x1) / 2, (y0 + y1) / 2, { held: true }); mev('mousemove', x1, y1, { held: true }); mev('mouseup', x1, y1); };
    var key = function (k) { document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); };
    var box = function () { var b = document.getElementById('strp-props'); return b && b.style.display !== 'none' ? b : null; };
    var flashTxt = function () { var f = document.getElementById('strp-flash'); return f && f.classList.contains('show') ? f.textContent : ''; };
    // what the overlay writes over a few frames
    var g = document.getElementById('strp-ov').getContext('2d'), texts = [], of = g.fillText;
    g.fillText = function (t) { texts.push(String(t)); return of.apply(this, arguments); };
    var painted = async function () { texts.length = 0; await W(90); return texts.slice(); };
    var db = document.getElementById('strp-drawbtn'); if (db && !document.getElementById('strp-tb').classList.contains('strp-drawopen')) db.click(); await W(40);
    var tools = Array.prototype.map.call(document.querySelectorAll('#strp-tools [data-tool]'), function (b) { return b.getAttribute('data-tool'); });
    ok('the drawing tools: Emoji, Long position and Short position after Text', tools.join(',') === 'hline,trend,rect,fib,pen,range,text,emoji,long,short', tools.join(','));
    var rIco = document.querySelector('#strp-tools [data-tool="range"] svg');
    ok('Measure has TradingView\'s price-range icon (two lines with end dots, an arrow between)', rIco && rIco.querySelectorAll('circle').length === 2 && rIco.querySelectorAll('line').length === 3, rIco && rIco.innerHTML.slice(0, 80));
    ok('an Object tree button sits beside Show on chart', document.getElementById('strp-treebtn') && document.getElementById('strp-treebtn').nextElementSibling.id === 'strp-layersbtn');

    // ---- Long position ----
    var X = Math.round(r.width * 0.35), Y = Math.round(r.height * 0.45);
    document.querySelector('#strp-tools [data-tool="long"]').click(); await W(20); click(X, Y); await W(80);
    // this trade's own stop (10 pips) and target (its exit, 11 pips: no recorded target)
    var L0 = S.drawings[0], pip = S.pip, tpp = S.tpPips > 0 ? S.tpPips : 2 * S.slPips, L0s = JSON.stringify(L0);
    ok('Long position: one click, the entry there, this trade\'s stop (10 pips) under it and its target (' + tpp.toFixed(1) + ' pips) over it, 20 candles wide', Math.abs(pip - 0.0001) < 1e-9 && L0 && L0.type === 'long' && Math.abs((L0.a.price - L0.sl) / pip - 10) < 0.01 && Math.abs((L0.tp - L0.a.price) / pip - tpp) < 0.01 && L0.b.idx - L0.a.idx === 20 && S.activeTool === 'none', L0s);
    var bx = box();
    ok('its options box: LONG POSITION, Stop (pips) 10.0, Target (R) ' + (tpp / 10).toFixed(2) + ', no colours', bx && /LONG POSITION/.test(bx.textContent) && bx.querySelector('[data-pstop]').value === '10.0' && bx.querySelector('[data-ptgt]').value === (tpp / 10).toFixed(2) && !bx.querySelector('[data-col]'), bx && [bx.querySelector('[data-pstop]').value, bx.querySelector('[data-ptgt]').value]);
    var tx = await painted();
    ok('selected: its tags show - Target (' + tpp.toFixed(1) + ' pips), Stop (10.0 pips)', tx.some(function (t) { return t.indexOf('Target: ') === 0 && t.indexOf('(' + tpp.toFixed(1) + ' pips)') > 0; }) && tx.some(function (t) { return /^Stop: .*\(10\.0 pips\)/.test(t); }), tx.filter(function (t) { return /Target|Stop|Risk/.test(t); }).slice(0, 3));
    var st = bx.querySelector('[data-pstop]'); st.value = '15'; st.dispatchEvent(new Event('input', { bubbles: true })); st.dispatchEvent(new Event('change', { bubbles: true }));
    var tg = bx.querySelector('[data-ptgt]'); tg.value = '3'; tg.dispatchEvent(new Event('input', { bubbles: true })); tg.dispatchEvent(new Event('change', { bubbles: true })); await W(40);
    ok('typing Stop 15 and Target 3R moves them: 15 pips under, 45 pips over', Math.abs((L0.a.price - L0.sl) / pip - 15) < 0.01 && Math.abs((L0.tp - L0.a.price) / pip - 45) < 0.01, [(L0.a.price - L0.sl) / pip, (L0.tp - L0.a.price) / pip]);
    // off it, nothing selected: no tags; the mouse on it: tags
    click(Math.round(r.width * 0.12), Math.round(r.height * 0.85)); await W(40); mev('mousemove', Math.round(r.width * 0.12), Math.round(r.height * 0.85)); tx = await painted();
    ok('not selected, mouse elsewhere: no tags', S.sel == null && !tx.some(function (t) { return /^Target: |^Stop: /.test(t); }), S.sel);
    var pz = R._posGeo(L0); mev('mousemove', (pz.x0 + pz.x1) / 2, pz.ye - 8); tx = await painted();
    ok('the mouse on it: its tags show (hover)', tx.some(function (t) { return /^Target: /.test(t); }) && S.hov === 0, S.hov);
    // a press and drag: no options box, no tags while it moves; a plain click opens the box
    var cy = pz.ye - 8, cx = (pz.x0 + pz.x1) / 2, a0 = L0.a.idx;
    mev('mousedown', cx, cy); mev('mousemove', cx + 30, cy, { held: true }); mev('mousemove', cx + 60, cy, { held: true }); tx = await painted();
    var midBox = box(), midTags = tx.some(function (t) { return /^Target: /.test(t); });
    mev('mouseup', cx + 60, cy); await W(40);
    ok('dragging it: the options box stays shut and the tags hide; it moved by candles, stop and target with it', !midBox && !midTags && L0.a.idx > a0 && Math.abs((L0.a.price - L0.sl) / pip - 15) < 0.01 && !box(), [!!midBox, midTags, a0, L0.a.idx]);
    pz = R._posGeo(L0); click((pz.x0 + pz.x1) / 2, pz.ye - 8); await W(40);
    ok('a click on it (no move): the options box opens', !!box() && S.sel === 0);
    // the target handle
    pz = R._posGeo(L0); var tp0 = L0.tp; drag(pz.ax, pz.yt, pz.ax, pz.yt - 30); await W(40);
    ok('dragging its target handle moves the target only', L0.tp > tp0 && Math.abs((L0.a.price - L0.sl) / pip - 15) < 0.01, [tp0, L0.tp]);

    // ---- Emoji ----
    document.querySelector('#strp-tools [data-tool="emoji"]').click(); await W(40); bx = box();
    var emos = bx ? bx.querySelectorAll('[data-emo]') : [];
    ok('Emoji: its box lists the trading ones and every community-chat emoji', bx && /EMOJI/.test(bx.textContent) && /Trading/.test(bx.textContent) && emos.length >= 28 + ((window.__stEmojis || []).length ? 100 : 0), emos.length);
    var fire = bx.querySelector('[data-emo="🔥"]'); fire.click(); await W(30);
    var EX = Math.round(r.width * 0.6), EY = Math.round(r.height * 0.3); click(EX, EY); await W(60);
    var E0 = S.drawings[1];
    ok('picked the fire, one click places it (32 px), the pick remembered', E0 && E0.type === 'emoji' && E0.e === '🔥' && E0.size === 32 && localStorage.getItem('st_replay_emoji') === '🔥', E0);
    var eg = R._emoGeo(E0); drag(eg.x + eg.s / 2, eg.y + eg.s / 2, eg.x + eg.s / 2 + 20, eg.y + eg.s / 2 + 20); await W(40);
    ok('dragging a corner makes it bigger', E0.size > 50, E0.size);
    click(eg.x, eg.y); await W(40); bx = box(); var sz = bx && bx.querySelector('[data-esz]');
    ok('its box has a Size slider', sz && Math.abs(+sz.value - E0.size) <= 2, sz && [sz.value, E0.size]);

    // ---- Measure: TradingView's price range ----
    document.querySelector('#strp-tools [data-tool="range"]').click(); await W(20);
    var MX = Math.round(r.width * 0.2), MY0 = Math.round(r.height * 0.25), MY1 = Math.round(r.height * 0.6);
    click(MX, MY0); await W(30); click(MX + 90, MY1); await W(60);
    var M0 = S.drawings[2]; tx = await painted();
    ok('Measure: two clicks, its reading (pips · R · bars) under the arrow\'s tip', M0 && M0.type === 'range' && tx.some(function (t) { return /p · [-+]\d+\.\d\dR · \d+ bars/.test(t); }), tx.filter(function (t) { return / bars/.test(t); }));

    // ---- Lock ----
    pz = R._posGeo(L0); click((pz.x0 + pz.x1) / 2, pz.ye - 8); await W(40); bx = box();
    bx.querySelector('#strp-lock').click(); await W(40);
    ok('Lock in its options box: locked, it says so', L0.lock === true && /Locked/.test(flashTxt()) && /Locked/i.test(box().querySelector('#strp-lock').textContent), flashTxt());
    key('Delete'); await W(40);
    ok('Delete on a locked drawing: it stays, and says how to unlock it', S.drawings.indexOf(L0) === 0 && /unlock it to delete it/.test(flashTxt()), flashTxt());
    var la = L0.a.idx; pz = R._posGeo(L0); drag((pz.x0 + pz.x1) / 2, pz.ye - 8, (pz.x0 + pz.x1) / 2 + 80, pz.ye - 8); await W(40);
    ok('dragging a locked one: it does not move', L0.a.idx === la && /unlock it to move it/.test(flashTxt()), [la, L0.a.idx, flashTxt()]);
    pz = R._posGeo(L0); mev('contextmenu', (pz.x0 + pz.x1) / 2, pz.ye - 8); await W(40);
    var ctx = document.getElementById('strp-ctx');
    ok('right-click: Clone, Unlock, Delete', ctx && ctx.style.display !== 'none' && /Clone\s*Unlock\s*Delete/i.test(ctx.textContent.replace(/\s+/g, ' ')), ctx && ctx.textContent);
    if (ctx) ctx.style.display = 'none';   // (Escape would close the replay itself)

    // ---- Object tree ----
    S.sel = null; R._s(); document.getElementById('strp-treebtn').click(); await W(60);
    var mn = document.getElementById('strp-menu'), rows = mn ? mn.querySelectorAll('.stpr-otr') : [];
    ok('Object tree: newest first - Measure, Emoji, Long position (locked)', mn && mn.classList.contains('show') && rows.length === 3 && /Measure/.test(rows[0].textContent) && /Emoji/.test(rows[1].textContent) && /Long position/.test(rows[2].textContent) && rows[2].querySelector('[data-otlock]').classList.contains('on'), mn && mn.textContent);
    rows[1].querySelector('[data-othide]').click(); await W(40);
    ok('its eye hides the emoji: off the chart, and a click there selects nothing', E0.hidden === true && mn.classList.contains('show'), E0.hidden);
    eg = R._emoGeo(E0); document.getElementById('strp-treebtn').click(); await W(20); click(eg.x, eg.y); await W(40);
    ok('(hidden: nothing to click)', S.sel !== 1, S.sel);
    document.getElementById('strp-treebtn').click(); await W(40); rows = document.getElementById('strp-menu').querySelectorAll('.stpr-otr');
    rows[1].querySelector('[data-othide]').click(); await W(30);
    ok('and shows it again', !E0.hidden);
    rows = document.getElementById('strp-menu').querySelectorAll('.stpr-otr'); rows[2].querySelector('[data-otdel]').click(); await W(30);
    ok('its bin on the locked one: it stays', S.drawings.length === 3 && /unlock it to delete it/.test(flashTxt()));
    rows = document.getElementById('strp-menu').querySelectorAll('.stpr-otr'); rows[1].querySelector('[data-otsel]').click(); await W(40);
    ok('a click on a row selects that drawing', S.sel === 1 && !!box());
    key('Escape'); await W(20);
    ok('Escape closes the tree', !document.getElementById('strp-menu').classList.contains('show'));

    // ---- Visibility ----
    var vb = box() && box().querySelector('#strp-visbtn'), tfl = Array.prototype.map.call(document.querySelectorAll('#strp-tfs button'), function (b) { return [+b.dataset.tf, b.textContent.trim()]; }).filter(function (x) { return x[0] === S.tf; })[0];
    ok('its options box: "Visibility: ' + (tfl && tfl[1]) + '" (where it was drawn)', vb && vb.textContent.indexOf('Visibility: ' + tfl[1]) === 0, vb && vb.textContent);
    vb.click(); await W(60); var dlg = document.getElementById('strp-visdlg');
    ok('it opens the Visibility window: Minutes, Hours, Days, Weeks', dlg && dlg.querySelectorAll('.stpr-dvr').length === 4 && /Minutes/.test(dlg.textContent) && /Weeks/.test(dlg.textContent), dlg && dlg.textContent.slice(0, 120));
    var hOn = dlg.querySelector('[data-k="vis.h.on"]'); hOn.click(); await W(40);
    ok('ticking Hours: it shows on the 1h and 4h too', /1h 4h/.test(dlg.querySelector('.stpr-dvn').textContent) && E0.vis && E0.vis.h.on === true, dlg.querySelector('.stpr-dvn').textContent);
    dlg.querySelector('[data-dc]').click(); await W(40);
    ok('Cancel puts it back as it was', !document.getElementById('strp-visdlg') && !E0.vis && E0.tfs && E0.tfs.length === 1, [E0.vis, E0.tfs]);
    box().querySelector('#strp-visbtn').click(); await W(60); dlg = document.getElementById('strp-visdlg'); dlg.querySelector('[data-k="vis.h.on"]').click(); await W(30); dlg.querySelector('[data-dok]').click(); await W(40);
    ok('Ok keeps it: Visibility names its timeframes', E0.vis && E0.vis.h.on && !E0.tfs && /1h 4h/.test(box().querySelector('#strp-visbtn').textContent), box().querySelector('#strp-visbtn').textContent);

    // ---- the bin with nothing selected: Remove all drawings (a locked one stays) ----
    click(Math.round(r.width * 0.12), Math.round(r.height * 0.85)); await W(40);
    var bin = document.getElementById('strp-del');
    ok('nothing selected: the bin is on and says Remove all drawings', !bin.disabled && /Remove all drawings/.test(bin.title), [bin.disabled, bin.title]);
    bin.click(); await W(40); mn = document.getElementById('strp-menu');
    ok('it offers "Remove all drawings (2)" and says the locked one stays', mn.classList.contains('show') && /Remove all drawings \(2\)/.test(mn.textContent) && /1 locked drawing stays/.test(mn.textContent), mn.textContent);
    mn.querySelector('[data-delall]').click(); await W(40);
    ok('removed: only the locked one is left, and it says so', S.drawings.length === 1 && S.drawings[0] === L0 && /2 drawings removed, 1 locked kept/.test(flashTxt()) && !mn.classList.contains('show'), flashTxt());
    document.getElementById('strp-undo').click(); await W(30);
    ok('Undo brings them back', S.drawings.length === 3, S.drawings.length);
    var kept = JSON.parse(localStorage.getItem('st_replay_draw2_999999902') || '[]');
    ok('kept with the trade: the lock, the emoji, the visibility', kept.length === 3 && kept[0].lock === true && kept[1].e === '🔥' && kept[1].vis && kept[1].vis.h.on, kept.map(function (d) { return d.type; }));
    ok('no page errors', !errs.length, errs.slice(0, 3));
    g.fillText = of;
    R.close(); await W(200);
    try { localStorage.removeItem('st_replay_draw2_999999902'); localStorage.removeItem('st_replay_emoji'); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
