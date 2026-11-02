// End-to-end test: the Favourites bar dragged up over the platform's top bar (Nestor, 29 Oct 2026: "i wanna be able to move the favourite bar
// up here" - the empty stretch between Check my bias and the icons on the right - "not docking it i just want to be able to drag it there if
// i want to"). The same floating bar: its grip dragged up over the top bar puts it in that empty stretch, never over a button, where it was
// let go, and it stays there (each window its own: the platform's window and a chart in a window of its own); dragged back down into a chart
// it floats there again. Where the stretch is shorter than the bar (the top bar's words fill it at that width) it stays in the chart and
// says why. Live in the Charts tab, maximised (stored candles, no EA); signed out, nothing live.
//   python tests/favdock_run.py      (1366x768, 1440x900 and 1920x1080; SHOTS=<folder> keeps a screenshot of each)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var win = null, END = window.__FD_END || 'up';
  try {
    window.__stPlatOff = false; window.__stLcForce = true;
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var P = window.__stPractice, $ = function (s) { return document.querySelector(s); };
    P._lv().mode = 'live'; P._lvClock(Date.UTC(2026, 9, 14, 8, 30) - Date.now()); window.isSessionLive = function () { return true; };
    var FAV = ['trend', 'hline', 'rect', 'emoji'];
    try { var C = P._cfg(); C.layout = 2; C.lv = {}; C.syms = []; C.mini = false; C.look = {}; delete C.lookDk; delete C.lookTh; C.plLt = false; C.resume = null;
      C.fav = FAV.slice(); C.favOn = false; C.favOnP = { 0: true, 1: true }; delete C.favPosP; delete C.favDockW; } catch (e) {}
    try { localStorage.removeItem('st_plat'); } catch (e) {}
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 200 && !(P._s() && P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
    await W(1800);
    var mx = document.getElementById('stpr-max'); if (mx && !mx.classList.contains('on')) { mx.click(); await W(1200); }   // the platform filling the page
    var C = P._cfg(), DW = P._dr(), top = $('.stpr-win.plat > .plat-top'), VW = window.innerWidth, J = function (o) { return JSON.stringify(o); };
    var bar = function (j) { var p = P._panes()[j]; return p && p.el.querySelector(':scope > .stpr-favbar:not(.fv-ghost)'); }, shown = function (e) { return !!(e && e.classList.contains('show') && e.offsetWidth > 0); };
    var upb = function (d) { return (d || document).querySelector('.stpr-favbar.up'); };
    var pe = function (el, t, x, y) { var V = el.ownerDocument.defaultView; el.dispatchEvent(new V.PointerEvent(t, { clientX: x, clientY: y, pointerId: 7, bubbles: true, cancelable: true, isPrimary: true, button: 0, buttons: t === 'pointerup' ? 0 : 1 })); };
    var mid = function (el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    // the top bar's buttons and words: each inside it, none over another (the empty stretch itself is not one); the bar up there over none
    var items = function (t) { return Array.prototype.filter.call(t.querySelectorAll(':scope > *, :scope > #stpr-tb2 > *, :scope > .stpr-tbm > *'), function (c) { return c.offsetWidth > 0 && getComputedStyle(c).display !== 'contents' && !c.classList.contains('pl-sp'); }); };
    var clash = function (t) { var L = items(t), tr = t.getBoundingClientRect(), bad = [];
      L.forEach(function (a, x) { var ra = a.getBoundingClientRect(); if (ra.left < tr.left - 0.5 || ra.right > tr.right + 0.5) bad.push('out:' + (a.id || a.className));
        L.slice(x + 1).forEach(function (b) { var rb = b.getBoundingClientRect(); if (Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left) > 0.5 && Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > 0.5) bad.push((a.id || a.className) + ' x ' + (b.id || b.className)); }); });
      return bad; };
    var fresh = function (t, base) { return clash(t).filter(function (x) { return (base || []).indexOf(x) < 0; }); };   // what was not there before
    var inSp = function (t, e) { var sr = t.querySelector(':scope > .pl-sp').getBoundingClientRect(), r = e.getBoundingClientRect(); return r.left >= sr.left - 0.5 && r.right <= sr.right + 0.5; };
    var spAt = function (t, f) { var sr = t.querySelector(':scope > .pl-sp').getBoundingClientRect(), tr = t.getBoundingClientRect(); return { x: sr.left + sr.width * f, y: tr.top + tr.height / 2, sr: sr }; };
    var upTo = async function (b, t, f) { var g = b.querySelector('.fv-grip'), gc = mid(g), tg = spAt(t, f); pe(g, 'pointerdown', gc.x, gc.y); pe(g, 'pointermove', gc.x + 10, gc.y - 30); pe(g, 'pointermove', tg.x, tg.y); await W(40); return { g: g, tg: tg }; };
    var downTo = async function (u, p) { var g = u.querySelector('.fv-grip'), gc = mid(g), c = p.el.getBoundingClientRect(), x = c.left + c.width * 0.4, y = c.top + c.height * 0.5; pe(g, 'pointerdown', gc.x, gc.y); pe(g, 'pointermove', gc.x, gc.y + 40); pe(g, 'pointermove', x, y); await W(40); return { g: g, x: x, y: y }; };

    window.dispatchEvent(new Event('resize')); await W(400);   // the top bar settled (its Record button comes later)
    var bad0 = clash(top), spw = top.querySelector(':scope > .pl-sp').getBoundingClientRect().width, bw = bar(0).getBoundingClientRect().width, room = spw >= bw + 8;
    ok('Live, maximised at ' + VW + 'px: a floating bar on each chart, nothing up in the top bar, its buttons clear of each other (empty stretch ' + Math.round(spw) + ' px, the bar ' + Math.round(bw) + ')', shown(bar(0)) && shown(bar(1)) && !shown(upb()) && !bad0.length, bad0);
    if (!room) {   // the top bar's words fill this width: let go up there, it stays in its chart, remembered for when there is room, and says why
      var d0 = await upTo(bar(0), top, 0.5); pe(d0.g, 'pointerup', d0.tg.x, d0.tg.y); await W(200); var fl0 = $('#stpr-flash');
      ok('no room up there at this width: let go over the top bar, it stays in its chart, over none of the buttons, remembered for when there is room; a note says why', shown(bar(0)) && !shown(upb()) && C.favDockW && C.favDockW.m && !fresh(top, bad0).length && fl0 && /No room over this window/.test(fl0.textContent), [J(C.favDockW), shown(bar(0)), fl0 && fl0.textContent]);
      C.favDockW.m = false; P._render(); await W(200);
    } else {
      // 1. the grip dragged up over the top bar: the bar follows it up there, in the empty stretch; let go, it stays
      var u0 = await upTo(bar(0), top, 0.6), ub = upb();
      ok('dragged up over the top bar: the bar is up there under the mouse, in the empty stretch; the one in the chart faded', shown(ub) && inSp(top, ub) && bar(0).classList.contains('fv-away') && Math.abs(mid(ub.querySelector('.fv-grip')).x - u0.tg.x) < 30, [shown(ub), ub && inSp(top, ub)]);
      pe(u0.g, 'pointerup', u0.tg.x, u0.tg.y); await W(150); ub = upb();
      var ur = ub.getBoundingClientRect(), cs = getComputedStyle(ub), tr = top.getBoundingClientRect(), x1 = ur.left;
      ok('let go: it stays there - this window\'s - both charts\' bars gone', shown(ub) && ub.parentNode === top && C.favDockW && C.favDockW.m && typeof C.favDockW.m.x === 'number' && !shown(bar(0)) && !shown(bar(1)), [J(C.favDockW), shown(bar(0)), shown(bar(1))]);
      ok('its floating look (box, border, shadow), level in the top bar, over none of its buttons', cs.boxShadow !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(cs.backgroundColor) && Math.abs((ur.top + ur.bottom) / 2 - (tr.top + tr.bottom) / 2) < 2 && inSp(top, ub) && !fresh(top, bad0).length, [cs.boxShadow, cs.backgroundColor, fresh(top, bad0)]);
      // 2. along the top bar towards its buttons: held at the stretch's end, never over them
      var g = ub.querySelector('.fv-grip'), gc = mid(g), ud = $('#stpr-undo').getBoundingClientRect();
      pe(g, 'pointerdown', gc.x, gc.y); pe(g, 'pointermove', gc.x - 20, gc.y); pe(g, 'pointermove', ud.left, gc.y); await W(30);
      var ul = upb().getBoundingClientRect(), sp0 = spAt(top, 0).sr;
      ok('pushed left over the buttons: held at the stretch\'s start, over none of them', inSp(top, upb()) && ul.left - sp0.left < 8 && !fresh(top, bad0).length, [ul.left, sp0.left, fresh(top, bad0)]);
      pe(g, 'pointermove', u0.tg.x - 40, gc.y); pe(g, 'pointerup', u0.tg.x - 40, gc.y); await W(120);
      var x2 = upb().getBoundingClientRect().left;
      document.getElementById('stpr-favbtn').click(); await W(60); document.getElementById('stpr-favbtn').click(); await W(150);   // off and on: painted afresh
      ok('let go further along: it stays where it was let go (painted afresh: the same place)', shown(upb()) && Math.abs(upb().getBoundingClientRect().left - x2) < 1.5 && Math.abs(x2 - x1) > 10, [x1, x2, upb().getBoundingClientRect().left]);
      // 3. a tool on it picks it, for the active chart
      upb().querySelector('[data-fvt="trend"]').click(); await W(60);
      ok('a tool on it picks it, lit there', DW.tool === 'trend' && upb().querySelector('[data-fvt="trend"]').classList.contains('on'), DW.tool);
      upb().querySelector('[data-fvt="trend"]').click(); await W(40);
      // 4. its grip dragged down into the second chart: it follows the mouse there; let go, it floats in that chart, where it was let go
      var dn = await downTo(upb(), P._panes()[1]), gh = P._panes()[1].el.querySelector('.stpr-favbar.fv-ghost');
      ok('dragged down into chart 2: the bar follows the mouse there, the one up top faded', !!gh && gh.offsetWidth > 0 && upb().classList.contains('fv-away'), !!gh);
      pe(dn.g, 'pointerup', dn.x, dn.y); await W(150);
      var b1 = bar(1), b1c = b1 && mid(b1.querySelector('.fv-grip'));
      ok('let go: it floats in chart 2 where it was let go, none up top, no ghost left; chart 1 its own again', C.favDockW.m === false && !shown(upb()) && shown(b1) && Math.abs(b1c.x - dn.x) < 20 && Math.abs(b1c.y - dn.y) < 20 && !P._panes()[1].el.querySelector('.fv-ghost') && shown(bar(0)), [J(C.favDockW), b1c, dn.x, dn.y]);
    }

    // 4b. the side panel widened (Nestor, 29 Oct 2026: "this gets cut off when i widen the chat column"): a bar left at its chart's right
    // edge is held wholly inside the narrower chart, and goes back to where it was left when the panel narrows again
    if (!$('.plat-right [data-plsw]') || !$('.plat-right [data-plsw]').offsetWidth) { var tmb = $('[data-plr="tm"]'); if (tmb) tmb.click(); await W(300); }
    C.favPosP = C.favPosP || {}; C.favPosP[1] = { l: 99999, t: 80 }; document.getElementById('stpr-favbtn').click(); await W(60); document.getElementById('stpr-favbtn').click(); await W(150);
    var edge = function () { var b = bar(1).getBoundingClientRect(), c = P._panes()[1].el.getBoundingClientRect(); return { gap: Math.round(c.right - b.right), left: Math.round(b.left - c.left), w: Math.round(c.width) }; }, rw = function () { return Math.round($('.plat-right').getBoundingClientRect().width); };
    var e0 = edge(), sw = $('.plat-right [data-plsw]'), swr = sw.getBoundingClientRect(), sx = swr.left + swr.width / 2, sy = swr.top + Math.min(40, swr.height / 2), rw0 = rw();
    pe(sw, 'pointerdown', sx, sy); pe(sw, 'pointermove', sx - 170, sy); pe(sw, 'pointermove', sx - (640 - rw0), sy); pe(sw, 'pointerup', sx - (640 - rw0), sy); for (var wk = 0; wk < 40 && !(edge().w < e0.w - 80 && edge().gap >= -0.5 && edge().gap < 3); wk++) await W(100);   // a size change reaches the bar on a rendered frame: late on a loaded machine
    var e1 = edge();
    ok('the side panel dragged from ' + rw0 + ' to ' + rw() + ' px: chart 2 narrower (' + e0.w + ' to ' + e1.w + ' px), its bar held wholly inside it, at its right edge', rw() > rw0 + 80 && e1.w < e0.w - 80 && e1.gap >= -0.5 && e1.gap < 3 && e1.left >= 0, [rw0, rw(), e0, e1]);
    var back = rw() - rw0; pe(sw, 'pointerdown', sx - back, sy); pe(sw, 'pointermove', sx, sy); pe(sw, 'pointerup', sx, sy); for (wk = 0; wk < 40 && !(Math.abs(edge().w - e0.w) < 3 && edge().gap >= -0.5 && edge().gap < 3); wk++) await W(100);   // (the panel stops at its widest for the screen)
    var e2 = edge();
    ok('...and narrowed again: the chart back (' + e2.w + ' px), the bar back at its right edge, where it was left (kept: ' + J(C.favPosP[1]) + ')', Math.abs(e2.w - e0.w) < 3 && e2.gap >= -0.5 && e2.gap < 3 && C.favPosP[1].l === 99999, [e0, e2, rw()]);

    // 5. a chart in a window of its own: its own top bar, its own place for the bar; this window's bars stay in their charts
    var pb = P._panes()[1].el.querySelector('[data-popc]');
    if (pb) { pb.click(); for (k = 0; k < 150 && !(P._pops()[1] && P._pops()[1].ready && P._panes()[1] && P._panes()[1].el.ownerDocument !== document && P._panes()[1].n); k++) await W(100); win = P._pops()[1] && P._pops()[1].w; await W(600); P._render(); await W(300); }
    var wd = win && win.document, wt = wd && wd.querySelector('.stpr-win.plat:not(.plph) > .plat-top'), wb = win && bar(1), wbad0 = wt ? clash(wt) : [];   // (a chart window's own top bar at 800 px may already run past its end: not the Favourites bar's doing)
    ok('chart 2 in its own window (' + (win && win.innerWidth) + 'px): the platform\'s top bar there, its bar in its chart' + (wbad0.length ? ' (its top bar already past its end: ' + wbad0.join(', ') + ')' : ''), !!wt && shown(wb) && wb.ownerDocument === wd, [!!win, !!wt, shown(wb)]);
    if (wt && wb) { var wroom = wt.querySelector(':scope > .pl-sp').getBoundingClientRect().width >= wb.getBoundingClientRect().width + 8, d1 = await upTo(wb, wt, 0.5); pe(d1.g, 'pointerup', d1.tg.x, d1.tg.y); await W(250); var wfl = wd.getElementById('stpr-flash'), wu = upb(wd);
      if (wroom) ok('up over that window\'s top bar, in its stretch, over none of its buttons - for that window only; this window\'s bars still in their charts', shown(wu) && wu.parentNode === wt && inSp(wt, wu) && !fresh(wt, wbad0).length && C.favDockW.p1 && !C.favDockW.m && shown(bar(0)) && !shown(upb()), [J(C.favDockW), shown(wu), fresh(wt, wbad0), shown(bar(0))]);
      else ok('that window\'s stretch too short for it: it stays in its chart, remembered for that window only, a note says why there; this window\'s bar untouched', shown(bar(1)) && !shown(wu) && C.favDockW.p1 && !C.favDockW.m && !fresh(wt, wbad0).length && wfl && /No room over this window/.test(wfl.textContent) && shown(bar(0)), [J(C.favDockW), shown(bar(1)), wfl && wfl.textContent]);
      if (wroom && wu) { var d2 = await downTo(upb(wd), P._panes()[1]); pe(d2.g, 'pointerup', d2.x, d2.y); await W(150);
        ok('dragged down there: in its chart again, nothing up over that window\'s top bar', C.favDockW.p1 === false && shown(bar(1)) && !shown(upb(wd)), [J(C.favDockW), shown(bar(1))]); }
      else { C.favDockW.p1 = false; P._render(); await W(150); } }
    if (pb && win) { var bk = P._panes()[1].el.querySelector('[data-popc]'); if (bk) bk.click(); await W(600); win = null; }

    // the end state for the screenshot: up over the top bar (where there is room) with the Emoji tool's picker open under it, or in the chart
    if (END === 'up' && room) { var e0 = await upTo(bar(0), top, 0.55); pe(e0.g, 'pointerup', e0.tg.x, e0.tg.y); await W(250); }
    var src = END === 'up' && room ? upb() : bar(0), es = src && src.querySelector('[data-fvt="emoji"]'); if (es) { es.click(); await W(150); }
    var an = src && src.querySelector('[data-fvt="emoji"]'), dbe = P._dbar().el(), dbs = dbe && dbe.querySelector('[data-db="emoji"]'), pop = P._dbar().pop(), er = an && an.getBoundingClientRect(), dsr = dbs && dbs.getBoundingClientRect();   // asked afresh: the bar repaints when the tool lights up
    ok('the ' + (src === bar(0) ? 'chart\'s' : 'top bar\'s') + ' bar\'s smiley: the whole emoji picker, its toolbar\'s smiley right under it', shown(src) && DW.tool === 'emoji' && pop && pop.style.display !== 'none' && pop.querySelectorAll('[data-emo]').length >= 20 && dsr && Math.abs(dsr.left - er.left) < 2 && dsr.top >= er.bottom, [DW.tool, er && [er.left, er.bottom], dsr && [dsr.left, dsr.top]]);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  try { if (win && !win.closed) win.close(); } catch (e) {}
  return JSON.stringify(out);
})()
