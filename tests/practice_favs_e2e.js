(async function () {
  // Favourite drawing tools (Nestor, 26 Oct 2026, TradingView's; 29 Oct 2026: "favourites needs to be shared with other charts and if the
  // other charts dont need it the star icon can be turned off individually for each chart", "i need to be able to organize these however i
  // want and also i want to have the emojis in here too"): a star on every tool in the menus and on the Emoji tool (29 Oct 2026: "i meant to
  // have the actual emoji icon and when clicked on it opens all the emojis" - one smiley on the bar, the whole picker under it); one list
  // for every chart; a bar inside each chart that wants it - its own on / off (the star button) and place - its tools dragged into any order.
  // Run: python tests/browser_test.py tests/practice_favs_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var win = null;
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stDrawBar); i++) await W(100); await W(800);
    var P = window.__stPractice; try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 2; C.tfs = [15, 60]; C.act = 0; C.mini = false; C.news = false; C.fav = []; C.favOn = false; delete C.favPos; delete C.favOnP; delete C.favPosP; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(400);
    var DW = P._dr(), tools = document.getElementById('stpr-tools'), fb = document.getElementById('stpr-favbtn'), pn = P._panes();
    if (!document.getElementById('stpr-tb2').classList.contains('drawing')) document.getElementById('stpr-drawbtn').click(); await W(60);
    var bar = function (j) { return P._panes()[j].el.querySelector(':scope > .stpr-favbar'); }, shown = function (j) { var b = bar(j); return !!(b && b.classList.contains('show') && b.offsetWidth > 0); };
    var ids = function (j) { return Array.prototype.map.call(bar(j).querySelectorAll('[data-fvt]'), function (b) { return b.getAttribute('data-fvt'); }).join(','); };
    var inMenus = tools.querySelectorAll('.stpr-tfl [data-tool]').length, stars = tools.querySelectorAll('.stpr-tfl [data-tool] [data-fav]').length;
    ok('a star on every tool in the menus', inMenus > 10 && stars === inMenus, [inMenus, stars]);
    ok('the star button beside the magnet, no bar yet on either chart', fb && fb.previousElementSibling.id === 'stpr-magnet' && fb.getAttribute('aria-pressed') === 'false' && !shown(0) && !shown(1), fb && fb.title);

    tools.querySelector('[data-tgrp="lines"]').click(); await W(40);
    var st = tools.querySelector('.stpr-tfl [data-fav="trend"]'); st.click(); await W(60);
    ok('a star on Trend line: a favourite, its star filled, its menu still open, the bar shows on the active chart (the first star) - inside it', (C.fav || []).indexOf('trend') >= 0 && st.classList.contains('on') && tools.querySelector('.stpr-tg[data-grp="lines"]').classList.contains('open') && shown(0) && !shown(1) && C.favOnP && C.favOnP[0] === true, [C.fav, C.favOnP]);
    var pr0 = pn[0].el.getBoundingClientRect(), b0r = bar(0).getBoundingClientRect(), tb = document.getElementById('stpr-tb2').getBoundingClientRect();
    ok('inside the chart: under the toolbar row, never over it', b0r.top >= pr0.top && b0r.bottom <= pr0.bottom && b0r.top >= tb.bottom - 1, [b0r.top, pr0.top, tb.bottom]);
    ok('the bar has its grip and the trend line', bar(0).querySelector('.fv-grip') && bar(0).querySelectorAll('[data-fvt]').length === 1 && bar(0).querySelector('[data-fvt="trend"] svg'));
    P._flyShut(); tools.querySelector('[data-tgrp="shapes"]').click(); await W(40); tools.querySelector('.stpr-tfl [data-fav="rect"]').click(); await W(40); P._flyShut();
    ok('a second star: Rectangle joins it, in the order starred', ids(0) === 'trend,rect');
    bar(0).querySelector('[data-fvt="rect"]').click(); await W(40);
    ok('a tool on the bar picks it, lit there', DW.tool === 'rect' && bar(0).querySelector('[data-fvt="rect"]').classList.contains('on'), DW.tool);
    bar(0).querySelector('[data-fvt="rect"]').click(); await W(30);

    // dragged by its grip, inside its chart, its place kept for that chart
    var g = bar(0).querySelector('.fv-grip'), r0 = bar(0).getBoundingClientRect(), gr = g.getBoundingClientRect(), cx = gr.left + 5, cy = gr.top + 8;
    var pe = function (el, t, x, y) { el.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, pointerId: 9, bubbles: true, cancelable: true, isPrimary: true })); };
    pe(g, 'pointerdown', cx, cy); pe(g, 'pointermove', cx - 80, cy + 120); pe(g, 'pointermove', cx - 100, cy + 140); pe(g, 'pointerup', cx - 100, cy + 140); await W(60);
    var r1 = bar(0).getBoundingClientRect();
    ok('dragged by its grip: it moves with the mouse, its place saved for that chart', Math.abs((r1.left - r0.left) + 100) < 3 && Math.abs((r1.top - r0.top) - 140) < 3 && C.favPosP && C.favPosP[0] && Math.abs(C.favPosP[0].t - parseFloat(bar(0).style.top)) < 1, [r1.left - r0.left, r1.top - r0.top, C.favPosP]);
    // a tool dragged along the bar: into its new place, on every chart
    var bR = bar(0).querySelector('[data-fvt="rect"]'), bT = bar(0).querySelector('[data-fvt="trend"]'), rR = bR.getBoundingClientRect(), rT = bT.getBoundingClientRect();
    pe(bR, 'pointerdown', rR.left + 16, rR.top + 16); pe(document, 'pointermove', rR.left + 6, rR.top + 16); pe(document, 'pointermove', rT.left + 4, rT.top + 16); pe(document, 'pointerup', rT.left + 4, rT.top + 16); bR.click(); await W(80);
    ok('Rectangle dragged in front of Trend line: the order kept (the drop does not pick it)', (C.fav || []).join(',') === 'rect,trend' && ids(0) === 'rect,trend' && DW.tool !== 'rect', [C.fav, ids(0), DW.tool]);
    // the star button: this chart's bar only
    fb.click(); await W(40);
    ok('the star button hides the active chart\'s bar', !shown(0) && C.favOnP[0] === false && fb.getAttribute('aria-pressed') === 'false');
    fb.click(); await W(40);
    var r2 = bar(0).getBoundingClientRect();
    ok('and shows it again where it was left', shown(0) && Math.abs(r2.left - r1.left) < 2 && Math.abs(r2.top - r1.top) < 2 && fb.getAttribute('aria-pressed') === 'true', [r2.left - r1.left, r2.top - r1.top]);
    C.act = 1; P._render(); await W(60); fb.click(); await W(60);
    ok('the other chart active: its star shows its own bar - the same list, the first chart\'s still showing', shown(1) && shown(0) && ids(1) === 'rect,trend' && C.favOnP[1] === true, [C.favOnP, shown(1) && ids(1)]);
    fb.click(); await W(40);
    ok('...and hides only that one', !shown(1) && shown(0));
    C.act = 0; P._render(); await W(40);

    // the Emoji tool: starred like any tool (its star in its button's corner); on the bar its smiley opens the whole picker, right under it
    DW.sel = null; P._props(); var eTool = tools.querySelector('#stpr-tool-emoji'), eStar = eTool && eTool.querySelector('[data-fav="emoji"]');
    ok('the Emoji tool has its star in its corner, shown on hover', !!eStar && getComputedStyle(eStar).position === 'absolute' && getComputedStyle(eStar).opacity === '0', eStar && [getComputedStyle(eStar).position, getComputedStyle(eStar).opacity]);
    eStar.click(); await W(60);
    ok('starred: the Emoji tool on the Favourites bar as its smiley, the tool not picked by the star', (C.fav || []).join(',') === 'rect,trend,emoji' && eStar.classList.contains('on') && !!bar(0).querySelector('[data-fvt="emoji"] svg') && DW.tool !== 'emoji', [C.fav, DW.tool]);
    eTool.click(); await W(60); var ep = P._dbar().pop();
    ok('the picker (from the toolbar): every emoji, and no star on any of them', DW.tool === 'emoji' && ep && ep.style.display !== 'none' && ep.querySelectorAll('[data-emo]').length >= 20 && !ep.querySelector('[data-efav], .stdb-efav, [data-fav]'), ep && [ep.style.display, ep.querySelectorAll('[data-emo]').length]);
    eTool.click(); await W(40);
    // starred one by one before (or by a device not updated yet): the one Emoji tool, where the first of them was
    C.fav = ['rect', 'emo:🚀', 'trend', 'emo:🎯']; fb.click(); await W(40); fb.click(); await W(60);
    ok('emojis starred one by one before: the one Emoji tool where the first was, the rest gone', (C.fav || []).join(',') === 'rect,emoji,trend' && ids(0) === 'rect,emoji,trend', [C.fav, ids(0)]);
    var fe = bar(0).querySelector('[data-fvt="emoji"]'); fe.click(); await W(80);
    var fe2 = bar(0).querySelector('[data-fvt="emoji"]'), fr2 = fe2.getBoundingClientRect(), dbEl = P._dbar().el(), ep2 = P._dbar().pop(), dr = dbEl.getBoundingClientRect(), pr = ep2.getBoundingClientRect(), dbe = dbEl.querySelector('[data-db="emoji"]');
    ok('the bar\'s smiley picks the Emoji tool, lit there, the whole picker open', DW.tool === 'emoji' && fe2.classList.contains('on') && ep2.style.display !== 'none' && ep2.querySelectorAll('[data-emo]').length >= 20, [DW.tool, ep2.style.display]);
    var de = dbe && dbe.getBoundingClientRect();
    ok('...anchored to the bar: the tool\'s smiley right under the bar\'s, the picker under that', !!de && Math.abs(de.left - fr2.left) < 2 && dr.top >= fr2.bottom && dr.top - fr2.bottom < 12 && pr.top >= dr.bottom && pr.top - dr.bottom < 12, [de && de.left, fr2.left, fr2.bottom, dr.top, dr.bottom, pr.top]);
    var eb = ep2.querySelectorAll('[data-emo]')[3], ex = eb.getAttribute('data-emo'); eb.click(); await W(60);
    var ch0 = pn[0].el.querySelector('.stpr-pc'), cr = ch0.getBoundingClientRect(), n0 = DW.list.length, dr2 = P._dbar().el().getBoundingClientRect();
    ok('one picked there: armed, its toolbar still under the bar', DW.tool === 'emoji' && DW.emoArm && Math.abs(dr2.top - dr.top) < 1 && Math.abs(dr2.left - dr.left) < 1, [DW.emoArm, dr2.top - dr.top]);
    ch0.dispatchEvent(new MouseEvent('mousedown', { clientX: cr.left + cr.width * 0.4, clientY: cr.top + cr.height * 0.4, bubbles: true, cancelable: true, button: 0, buttons: 1, view: window }));
    ch0.dispatchEvent(new MouseEvent('mouseup', { clientX: cr.left + cr.width * 0.4, clientY: cr.top + cr.height * 0.4, bubbles: true, cancelable: true, button: 0, view: window })); await W(80);
    ok('...and a click on the chart places that emoji', DW.list.length === n0 + 1 && DW.list[DW.list.length - 1].type === 'emoji' && DW.list[DW.list.length - 1].e === ex, DW.list[DW.list.length - 1]);

    // a chart in a window of its own: its bar there, its own star
    C.favOnP[1] = true; P._render(); await W(60);
    var pb = pn[1].el.querySelector('[data-popc]');
    if (pb) { pb.click(); for (k = 0; k < 120 && !(P._pops()[1] && P._pops()[1].ready && P._panes()[1].el.ownerDocument !== document && P._panes()[1].n); k++) await W(100); win = P._pops()[1] && P._pops()[1].w; await W(400); P._render(); await W(200); }
    var wb = win && P._panes()[1].el.querySelector(':scope > .stpr-favbar');
    ok('chart 2 in its own window: its Favourites bar there, inside its chart, the same list', !!win && !!wb && wb.ownerDocument === win.document && wb.classList.contains('show') && Array.prototype.map.call(wb.querySelectorAll('[data-fvt]'), function (b) { return b.getAttribute('data-fvt'); }).join(',') === (C.fav || []).join(','), [!!pb, !!win, !!wb]);
    var wfb = win && win.document.querySelector('#stpr-favbtn');
    ok('that window\'s star shows its own chart\'s bar as on', !!wfb && wfb.getAttribute('aria-pressed') === 'true', wfb && wfb.getAttribute('aria-pressed'));
    // a tool's star pressed in that window: the favourite, not the tool (its menu's stars, and the Emoji tool's)
    var t0 = DW.tool, ws = win && win.document.querySelector('[data-fav="hline"]'), we = win && win.document.querySelector('[data-fav="emoji"]');
    if (ws) { ws.click(); await W(80); }
    var hIn = (C.fav || []).indexOf('hline') >= 0; if (we) { we.click(); await W(80); }
    ok('a star pressed in that window: Horizontal line in, the Emoji tool out, neither tool picked', !!ws && !!we && hIn && (C.fav || []).indexOf('emoji') < 0 && DW.tool === t0, [C.fav, DW.tool, t0]);
    if (ws) { ws.click(); await W(40); } if (we) { we.click(); await W(60); }
    if (wfb) { wfb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); wfb.click(); await W(150); }
    var p1 = P._panes()[1], bars1 = p1.el.querySelectorAll('.stpr-favbar');
    ok('pressed there: that chart\'s bar goes, this window\'s chart keeps its own', !(wb && wb.classList.contains('show')) && C.favOnP[1] === false && shown(0), [C.favOnP, bars1.length, p1._fvb === wb, wb && wb.className, wb && wb.isConnected, p1._fvb && p1._fvb.className]);
    if (pb && win) { var bk = P._panes()[1].el.querySelector('[data-popc]'); if (bk) bk.click(); await W(500); }
    // nothing starred: it says how
    if (DW.tool !== 'none') tools.querySelector('#stpr-tool-emoji').click();
    C.fav = []; fb.click(); await W(40); fb.click(); await W(60);   // a repaint of the bars
    ok('nothing starred: the bar says how to add a tool', /Star a tool \(★\) to add it here/.test(bar(0).textContent), bar(0).textContent);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  try { if (win && !win.closed) win.close(); } catch (e) {}
  return JSON.stringify(out);
})()
