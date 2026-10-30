// End-to-end test: the news flags on the Spread label's row and every flag's card pointing at its flag (Nestor, 29 Oct 2026: "move this to
// the same row as the spread"; "why is the last news the only one that gets the small arrow ... and also its not centered"), and the
// session boxes' names under the chart's legend (a phone on its side: "London" sat on the O H L C line). Live Charts on a stand-in EA.
//   python tests/newsrow_run.py      (a computer, a phone, a smaller phone, a phone on its side)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var P = window.__stPractice, LC = window.__stLC, T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000;
    P._lvClock(T0 * 1000 - Date.now());
    window.isSessionLive = function () { return true; };
    window.__stPlatOff = false; window.__stLcForce = true; await W(1200);
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
    try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15, 1, 60, 240]; C.syms = []; C.resume = null; C.news = true; } catch (e) {}
    try { localStorage.removeItem('st_plat'); } catch (e) {}
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
    await W(1500);
    var win = document.getElementById('stpr-win'), $ = function (s) { return document.querySelector(s); }, phoneNow = win.classList.contains('plph'), land = innerWidth > innerHeight;
    if (phoneNow) { window.scrollTo(0, Math.round(window.scrollY + win.getBoundingClientRect().top)); for (k = 0; k < 30 && !win.classList.contains('ph-full'); k++) await W(100); await W(900); }
    var p = P._panes()[0], el = p.el, er = function () { return el.getBoundingClientRect(); }, ts = p.chart.timeScale();
    var pw = function () { return el.clientWidth - p.chart.priceScale('right').width(); }, ph = function () { return el.clientHeight - ts.height(); };
    for (k = 0; k < 40 && !(p.cdb && !p.cdb.hidden && p.cdb.offsetWidth); k++) await W(250);
    // the Session Indicator on (its sessions and weekday names)
    if (phoneNow) { if (!$('.ph-si.on') && $('[data-phsi]')) { $('[data-phsi]').click(); await W(600); } } else { var si0 = $('.plat-top .pl-si'); if (si0 && si0.classList.contains('off')) { $('.plat-top [data-plsi]').click(); await W(600); } }
    var rel = function (node) { if (!node || !node.getClientRects().length) return null; var r = node.getBoundingClientRect(), o = er(); return { l: r.left - o.left, r: r.right - o.left, t: r.top - o.top, b: r.bottom - o.top, w: r.width, h: r.height }; };
    var logo = function () { return rel(el.querySelector('#tv-attr-logo')); }, spr = function () { return rel(p.cdb); }, chip = function () { return p._rt && p._rt.classList.contains('on') ? rel(p._rt) : null; };
    var ok0 = window.__stNewsCcyOk; window.__stNewsCcyOk = function () { return true; };
    // releases: on the first candles (under the logo), two in the middle on one candle, and on a candle under the Spread label
    var xOf = function (t) { return ts.timeToCoordinate(t); }, B = p.bars, near = function (x0) { var best = null, bd = 1e9; B.forEach(function (b) { var x = xOf(b.time); if (x == null) return; var d = Math.abs(x - x0); if (d < bd) { bd = d; best = b; } }); return best; };
    var iso = function (t) { return new Date(t * 1000).toISOString(); };
    var put = function (xr) { var s0 = spr(), bL = near(logo() ? (logo().l + logo().r) / 2 : 20), bM = near(pw() * 0.45), bR = near(xr != null ? xr : (s0 ? (s0.l + s0.r) / 2 : pw() - 40));
      P._news([{ at: iso(bL.time), currency: 'EUR', title: 'German PMI', impact: 'High', forecast: '50.1', previous: '49.8', actual: '51.0' },
        { at: iso(bM.time), currency: 'USD', title: 'CPI m/m', impact: 'High', forecast: '0.3%', previous: '0.4%', actual: '0.2%' },
        { at: iso(bM.time), currency: 'GBP', title: 'GDP q/q', impact: 'Medium', forecast: '0.2%', previous: '0.1%', actual: '0.3%' },
        { at: iso(bR.time), currency: 'USD', title: 'Jobless Claims', impact: 'Medium', forecast: '230K', previous: '228K', actual: '' }]); };
    var lg0 = logo(), sp0 = spr();
    put(); for (k = 0; k < 20 && !(p._news && p._news.length >= 3); k++) { P._drawOv(0); await W(100); } await W(200); P._drawOv(0);
    var N = p._news || [], sp1 = spr(), lg1 = logo(), same = function (a, b) { return !a && !b || (a && b && Math.abs(a.l - b.l) < 0.6 && Math.abs(a.t - b.t) < 0.6 && Math.abs(a.w - b.w) < 0.6); };
    check('three groups of flags (the first candles, two releases on one middle candle, a candle under Spread)', N.length === 3 && N.some(function (h) { return h.n === 2; }), N.map(function (h) { return [Math.round(h.x), h.n]; }));
    check('the Spread label and the TradingView logo where they were, news on', sp0 && sp1 && same(sp0, sp1) && same(lg0, lg1), [sp0, sp1, lg0, lg1]);
    var midS = sp1 ? (sp1.t + sp1.b) / 2 : null;
    check('the flags\' row on the Spread label\'s row: centred on it', midS != null && N.every(function (h) { return Math.abs(h.y - midS) <= 1; }), [midS, N.map(function (h) { return h.y; })]);
    var clear = function (a) { return function (h) { return !a || (h.spots || []).every(function (s) { return s.x + h.r <= a.l + 0.5 || s.x - h.r >= a.r - 0.5; }); }; };
    check('...no flag under the logo: nudged right of it', !!lg1 && N.every(clear(lg1)) && N.some(function (h) { return h.spots[0].x - h.r < lg1.r + 12; }), [lg1 && Math.round(lg1.r), N.map(function (h) { return Math.round(h.spots[0].x - h.r); })]);
    check('...none under Spread', !!sp1 && N.every(clear(sp1)), [sp1 && Math.round(sp1.l), N.map(function (h) { return Math.round(h.spots[h.spots.length - 1].x + h.r); })]);
    check('...none stacked: the groups side by side', N.slice().sort(function (a, b) { return a.spots[0].x - b.spots[0].x; }).every(function (h, i, a) { return !i || a[i - 1].spots[a[i - 1].spots.length - 1].x + a[i - 1].r <= h.spots[0].x - h.r + 0.5; }));
    // every flag's card: the arrow under it, on that flag's centre, the card inside the plot
    var ch = el.querySelector('.stpr-pc') || el, cardOK = [], hov = function (x, y) { var o = er(), cx = o.left + x, cy = o.top + y; (document.elementFromPoint(cx, cy) || ch).dispatchEvent(new MouseEvent('mousemove', { clientX: cx, clientY: cy, bubbles: true })); };
    for (var gi = 0; gi < N.length; gi++) { var h = N[gi]; for (var si = 0; si < h.spots.length; si++) { var sx = h.spots[si].x; hov(sx, h.y); await W(60);
      var cd = rel(p.card), ar = p.ncArr && p.ncArr.style.display === 'block' ? rel(p.ncArr) : null, lit = p.card.querySelector('.strp-nc-item.on'), items = p.card.querySelectorAll('.strp-nc-item');
      var acx = ar ? (ar.l + ar.r) / 2 : null, good = !!(cd && p.card.style.display === 'block' && ar && Math.abs(acx - sx) <= 1 && ar.b > cd.b + 3 && ar.b <= h.y - h.r + 1 && ar.t < cd.b && cd.l >= -0.5 && cd.r <= pw() + 0.5 && acx - cd.l >= 12 && cd.r - acx >= 12 && (h.n < 2 || (lit && items[h.spots[si].i] === lit)));
      cardOK.push([Math.round(sx), good, cd && [Math.round(cd.l), Math.round(cd.r), Math.round(cd.b)], ar && [Math.round(acx), Math.round(ar.b)]]); } }
    hov(pw() * 0.5, ph() * 0.3); await W(60);
    check('every flag\'s card has its arrow, centred on that flag, the card inside the plot (the group\'s card with that release lit)', cardOK.length >= 4 && cardOK.every(function (c) { return c[1]; }), cardOK);
    check('...the card and its arrow go with the mouse', p.card.style.display === 'none' && !!p.ncArr && p.ncArr.style.display === 'none', [p.card.style.display, p.ncArr && p.ncArr.style.display]);
    if (phoneNow) { var h0 = N[0], o0 = er(); (document.elementFromPoint(o0.left + h0.spots[0].x, o0.top + h0.y) || ch).dispatchEvent(new MouseEvent('mousedown', { clientX: o0.left + h0.spots[0].x, clientY: o0.top + h0.y, bubbles: true, button: 0 })); await W(100);
      var ar2 = p.ncArr && p.ncArr.style.display === 'block' ? rel(p.ncArr) : null;
      check('a phone: a tap on a flag pins its card, the arrow on it', p.card.style.display === 'block' && ar2 && Math.abs((ar2.l + ar2.r) / 2 - h0.spots[0].x) <= 1, ar2);
      (document.elementFromPoint(o0.left + h0.spots[0].x, o0.top + h0.y) || ch).dispatchEvent(new MouseEvent('mousedown', { clientX: o0.left + h0.spots[0].x, clientY: o0.top + h0.y, bubbles: true, button: 0 })); await W(100); }
    // the latest candle off the right edge: the » chip by Spread, the flags clear of it too
    for (k = 0; k < 10 && !chip(); k++) { p._rtNear = true; ts.scrollToPosition(-6, false); await W(300); }   // the mouse by the corner on a computer (the chip always shows on a touch screen)
    var cp = chip(); put(cp ? (cp.l + cp.r) / 2 : null); P._drawOv(0); await W(200); P._drawOv(0); var N2 = p._news || [], sp2 = spr(), zone = cp ? { l: cp.l, r: sp2 ? sp2.r : cp.r } : null;
    check('scrolled back, candles under the » chip and Spread: a release there is nudged left of them, the rest clear too, all on the Spread row', !!cp && N2.length === 3 && N2.every(clear(zone)) && N2.some(function (h) { return h.spots[h.spots.length - 1].x + h.r > cp.l - 12; }) && N2.every(function (h) { return Math.abs(h.y - midS) <= 1; }),
      [cp && Math.round(cp.l), sp2 && Math.round(sp2.l), N2.map(function (h) { return Math.round(h.spots[h.spots.length - 1].x + h.r); }), p.n, JSON.stringify(ts.getVisibleLogicalRange())]);
    ts.scrollToRealTime(); await W(400);
    // the session boxes' names: under the legend, as the weekday names (no higher than max(60, the legend's bottom + 10), under the names when they show)
    var ps = p.series.priceScale(), m0 = ps.options().scaleMargins; ps.applyOptions({ scaleMargins: { top: 0, bottom: 0.25 } }); await W(400);
    var calls = [], fT = CanvasRenderingContext2D.prototype.fillText, sR = CanvasRenderingContext2D.prototype.strokeRect, box = null;
    CanvasRenderingContext2D.prototype.strokeRect = function (x, y, w, h) { box = { t: y, b: y + h }; return sR.apply(this, arguments); };   // a session's box, drawn just before its name
    CanvasRenderingContext2D.prototype.fillText = function (t, x, y) { calls.push({ t: String(t), y: y, f: this.font, b: this.textBaseline, box: box }); return fT.apply(this, arguments); };
    try { P._drawOv(0); } finally { CanvasRenderingContext2D.prototype.fillText = fT; CanvasRenderingContext2D.prototype.strokeRect = sR; }
    ps.applyOptions({ scaleMargins: m0 }); await W(200);
    var o2 = er(), lb = 0; Array.prototype.forEach.call(el.querySelectorAll('.stpr-tl > *, :scope > .stpr-ptfw'), function (e) { if (!e.offsetWidth) return; var r = e.getBoundingClientRect(); if (r.height && r.bottom - o2.top > lb) lb = r.bottom - o2.top; });
    var days = calls.filter(function (c) { return /^(SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUN|MON|TUE|WED|THU|FRI|SAT)$/.test(c.t); });
    var floor = Math.max(60, Math.round(lb + 10)) + (days.length ? 15 : 0), ses = calls.filter(function (c) { return /^(Asia|London|New York)\b/.test(c.t) && c.b === 'bottom'; });
    var tops = ses.map(function (c) { return [c.t, Math.round(c.y - (parseFloat(c.f) || 10))]; }), inBox = ses.every(function (c) { return !c.box || (c.box.b >= -1.5 && (c.y - (parseFloat(c.f) || 10) < floor + 0.5 || Math.abs(c.y - (c.box.t - 3)) < 1.1)); });   // above its box, or (no room there) on the first line under the legend; none for a box off the top
    check('the session boxes\' names start under the legend (and the weekday names): none over the O H L C line', ses.length >= 1 && tops.every(function (t) { return t[1] >= floor - 0.5; }) && inBox && days.every(function (d) { return d.y >= floor - 15 - 0.5; }), { floor: floor, legend: Math.round(lb), tops: tops, inBox: inBox, boxes: ses.map(function (c) { return c.box && [Math.round(c.box.t), Math.round(c.box.b), Math.round(c.y)]; }), days: days.length });
    // Live: the rest of today's releases show before they come out (30 Oct 2026: "i need at least the days news on the chart"); tomorrow's don't
    var nowS = P._s().now; P._news([{ at: iso(nowS + 120), currency: 'EUR', title: 'German Prelim GDP q/q', impact: 'Medium', forecast: '0.1%', previous: '0.2%', actual: '' },
      { at: iso(nowS + 2 * 86400), currency: 'USD', title: 'Tomorrow NFP', impact: 'High', forecast: '', previous: '', actual: '' }]);
    try { p.chart.timeScale().scrollToPosition(8, false); } catch (e) {} await W(300);
    for (k = 0; k < 10; k++) { P._drawOv(0); await W(100); }
    var titles = (p._news || []).map(function (n) { return n.list.map(function (e) { return e.title; }).join('+'); });
    check('Live: a release still to come today is on the chart already; one days away is not', titles.indexOf('German Prelim GDP q/q') >= 0 && !titles.some(function (t) { return /Tomorrow/.test(t); }), titles.length ? titles : { tf: p.tf, now: nowS, last: B[B.length-1].time, xl: xOf(B[B.length-1].time), pw: pw(), rows: (P._s().live), lr: JSON.stringify(p.chart.timeScale().getVisibleLogicalRange()), n: B.length });
    window.__stNewsCcyOk = ok0; P._news([]);
    check('no errors', errs.length === 0, errs.slice(0, 3));
  } catch (e) { results.push({ name: 'test ran', ok: false, got: String(e && e.stack || e) }); }
  return results;
})()
