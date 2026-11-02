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
    check('three groups of flags (the first candles, a USD and a GBP release on one middle candle - two flags, a candle under Spread)', N.length === 3 && N.some(function (h) { return h.n === 2 && h.spots.length === 2; }), N.map(function (h) { return [Math.round(h.x), h.n, h.spots.length]; }));
    check('no Spread label on Live (2 Nov 2026: the Trade Manager has it), the TradingView logo where it was, news on', !sp0 && !sp1 && same(lg0, lg1), [sp0, sp1, lg0, lg1]);
    var midS = ph() - 8 - 7.5;
    check('the flags\' row: the chart\'s bottom line', N.every(function (h) { return Math.abs(h.y - midS) <= 1; }), [midS, N.map(function (h) { return h.y; })]);
    var clear = function (a) { return function (h) { return !a || (h.spots || []).every(function (s) { return s.x + h.r <= a.l + 0.5 || s.x - h.r >= a.r - 0.5; }); }; };
    check('...no flag under the logo: nudged right of it', !!lg1 && N.every(clear(lg1)) && N.some(function (h) { return h.spots[0].x - h.r < lg1.r + 12; }), [lg1 && Math.round(lg1.r), N.map(function (h) { return Math.round(h.spots[0].x - h.r); })]);
    check('...all of them inside the plot', N.every(function (h) { return h.spots[h.spots.length - 1].x + h.r <= pw() + 0.5; }), [pw(), N.map(function (h) { return Math.round(h.spots[h.spots.length - 1].x + h.r); })]);
    check('...none stacked: the groups side by side', N.slice().sort(function (a, b) { return a.spots[0].x - b.spots[0].x; }).every(function (h, i, a) { return !i || a[i - 1].spots[a[i - 1].spots.length - 1].x + a[i - 1].r <= h.spots[0].x - h.r + 0.5; }));
    // every flag's card: the arrow under it, on that flag's centre, the card inside the plot
    var ch = el.querySelector('.stpr-pc') || el, cardOK = [], hov = function (x, y) { var o = er(), cx = o.left + x, cy = o.top + y; (document.elementFromPoint(cx, cy) || ch).dispatchEvent(new MouseEvent('mousemove', { clientX: cx, clientY: cy, bubbles: true })); };
    for (var gi = 0; gi < N.length; gi++) { var h = N[gi]; for (var si = 0; si < h.spots.length; si++) { var sx = h.spots[si].x; hov(sx, h.y); await W(60);
      var cd = rel(p.card), ar = p.ncArr && p.ncArr.style.display === 'block' ? rel(p.ncArr) : null, items = Array.prototype.slice.call(p.card.querySelectorAll('.strp-nc-item')), ccy = h.spots[si].ccy;
      var ofC = function (it) { return it.textContent.indexOf(ccy + ' · ') >= 0; }, many = items.some(function (it) { return !ofC(it); });   // the card: that flag's currency first, lit when others are in it
      var acx = ar ? (ar.l + ar.r) / 2 : null, good = !!(cd && p.card.style.display === 'block' && ar && Math.abs(acx - sx) <= 1 && ar.b > cd.b + 3 && ar.b <= h.y - h.r + 1 && ar.t < cd.b && cd.l >= -0.5 && cd.r <= pw() + 0.5 && acx - cd.l >= 12 && cd.r - acx >= 12
        && (h.n < 2 || (items.length === h.n && ofC(items[0]) && items.every(function (it) { return it.classList.contains('on') === (many && ofC(it)); }))));
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
    // ONE flag per currency at a time (Nestor, 29 Oct 2026: "isn't it better that have a us flag with a +3 next to it instead of so many flags?"):
    // four USD releases and a EUR one on a candle - a US flag with a "+3" badge on its corner (bold, the platform's font, its border the ring's
    // colour: red, a high one among them), a EU flag without one; and four USD alone - one flag, +3
    var bC = near(pw() * 0.45), atC = iso(bC.time), bD = near(pw() * 0.75), atD = iso(bD.time), RL = function (at, c, t, imp) { return { at: at, currency: c, title: t, impact: imp, forecast: '1', previous: '1', actual: '' }; };
    P._news([RL(atC, 'USD', 'CPI m/m', 'High'), RL(atC, 'USD', 'Core CPI m/m', 'High'), RL(atC, 'USD', 'CPI y/y', 'Medium'), RL(atC, 'USD', 'Unemployment Claims', 'Medium'), RL(atC, 'EUR', 'ECB speech', 'Medium'),
      RL(atD, 'USD', 'Retail Sales m/m', 'Medium'), RL(atD, 'USD', 'Core Retail Sales m/m', 'Medium'), RL(atD, 'USD', 'Empire State Index', 'Low'), RL(atD, 'USD', 'Import Prices m/m', 'Low')]);
    var cl = [], pth = null, fP = CanvasRenderingContext2D.prototype.fillText, sP = CanvasRenderingContext2D.prototype.stroke;
    CanvasRenderingContext2D.prototype.fillText = function (t, x, y) { cl.push({ t: String(t), x: x, y: y, f: this.font, c: String(this.fillStyle).toLowerCase() }); return fP.apply(this, arguments); };
    CanvasRenderingContext2D.prototype.stroke = function () { cl.push({ k: 'stroke', c: String(this.strokeStyle).toLowerCase(), w: this.lineWidth }); return sP.apply(this, arguments); };
    try { P._drawOv(0); } finally { CanvasRenderingContext2D.prototype.fillText = fP; CanvasRenderingContext2D.prototype.stroke = sP; }
    var NC = (p._news || []).slice().sort(function (a, b) { return a.x - b.x; }), g5 = NC.filter(function (h) { return h.n === 5; })[0], g4 = NC.filter(function (h) { return h.n === 4; })[0];
    var badge = function (h, sp, t) { var i = cl.findIndex(function (c) { return c.t === t && c.x > sp.x && c.x < sp.x + h.r + 8 && c.y < h.y; }); return i < 0 ? null : { t: cl[i], border: cl.slice(0, i).reverse().filter(function (c) { return c.k === 'stroke'; })[0] }; };
    var b5 = g5 && badge(g5, g5.spots[0], '+3'), b4 = g4 && badge(g4, g4.spots[0], '+3');
    check('four USD releases and a EUR one at a time: two flags, US first, EU second', !!g5 && g5.spots.map(function (sp) { return sp.ccy; }).join(',') === 'USD,EUR', g5 && g5.spots);
    check('...the US flag carries a "+3" badge on its top-right corner: bold, the platform\'s font, white, its border the ring\'s colour (red: a high one among them)', !!b5 && /^700 (8|9)px -apple-system/.test(b5.t.f) && b5.t.c === '#ffffff' && b5.border && b5.border.c === '#f23645' && b5.t.x > g5.spots[0].x + 3 && b5.t.y < g5.y - 3, b5);
    check('...the EU flag has none', !!g5 && !cl.some(function (c) { return /^\+\d/.test(c.t || '') && c.x > g5.spots[1].x && c.x < g5.spots[1].x + g5.r + 8; }), cl.filter(function (c) { return /^\+\d/.test(c.t || ''); }));
    check('four USD releases alone: ONE flag with +3, its badge orange (the most important of them a medium one)', !!g4 && g4.spots.length === 1 && !!b4 && b4.border && b4.border.c === '#f7931a', [g4 && g4.spots, b4]);
    hov(g5.spots[1].x, g5.y); await W(80); var it5 = Array.prototype.slice.call(p.card.querySelectorAll('.strp-nc-item')), ar5 = p.ncArr && p.ncArr.style.display === 'block' ? rel(p.ncArr) : null;
    check('...hovering the EU flag: the card lists all five, EUR first and lit, the arrow on the EU flag', it5.length === 5 && /EUR · ECB speech/.test(it5[0].textContent) && it5[0].classList.contains('on') && !it5[1].classList.contains('on') && ar5 && Math.abs((ar5.l + ar5.r) / 2 - g5.spots[1].x) <= 1, [it5.map(function (x) { return x.textContent.slice(0, 18) + (x.classList.contains('on') ? '*' : ''); }), ar5]);
    hov(g5.spots[0].x, g5.y); await W(80); it5 = Array.prototype.slice.call(p.card.querySelectorAll('.strp-nc-item'));
    check('...the US flag: the four USD releases first, lit', it5.length === 5 && it5.slice(0, 4).every(function (x) { return /USD · /.test(x.textContent) && x.classList.contains('on'); }) && !it5[4].classList.contains('on'), it5.map(function (x) { return x.textContent.slice(0, 18) + (x.classList.contains('on') ? '*' : ''); }));
    hov(pw() * 0.5, ph() * 0.3); await W(60);
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
