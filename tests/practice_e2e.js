(async function () {
  // Practice Replay (14 Oct 2026), everything Nestor asked for that evening: the third Academy box; no EA panel; the whole
  // day (17:00 New York to 17:00 New York) with Asia / London / New York; SL and TP before the press, the SL / TP button and
  // the lines dragged; pips / points / R; 1-4 charts with 1m..1Y each and Trade Replay's timeframe pill; drawings and news
  // from Trade Replay; the date in the crosshair; no black chart after a jump; the automatic symbol list.
  // Real EUR/USD candles of Thu 1 Oct 2026 from the shared candles table, on this PC's London clock.
  // Run: python tests/browser_test.py tests/practice_e2e.js   (maximise / new window: practice_window_e2e.js)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var near = function (a, b, tol) { return Math.abs(a - b) <= (tol || 1e-6); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
    doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
    ok('every inline script parses', !bad.length, bad);

    var hub = document.getElementById('vault-hub'), page = document.getElementById('page-vault');
    page.classList.add('active'); page.style.display = 'block'; hub.style.display = '';
    try { window.__stAcademyHub(); } catch (e) {}
    await W(200);
    var cards = Array.prototype.slice.call(hub.querySelectorAll('.vault-hub-card')), rc = cards.map(function (c) { return c.getBoundingClientRect(); });
    var bt = cards.map(function (c) { return Math.round(c.querySelector('.vh-go').getBoundingClientRect().top); });
    // Media Vault before it opens (a member, as here): "Coming soon" only - no figures, no button (Nestor, 15 Oct 2026)
    ok('three boxes in one row, the same size, four figures and lined-up buttons on Academy and Practice Replay, the third Practice Replay', cards.length === 3 && cards[2].getAttribute('data-hub') === 'practice' && Math.round(rc[0].top) === Math.round(rc[2].top) && Math.abs(rc[0].height - rc[2].height) < 1 && Math.abs(rc[0].width - rc[1].width) < 1 && bt[1] === bt[2] && cards.slice(1).every(function (c) { return c.querySelectorAll('.vh-t').length === 4; }), rc.map(function (r) { return Math.round(r.top) + '/' + Math.round(r.height); }).concat(bt));
    ok('Media Vault says Coming soon to a member: no counts, no button', cards[0].querySelectorAll('.vh-t').length === 0 && /Coming soon/i.test(cards[0].textContent) && getComputedStyle(cards[0].querySelector('.vh-go')).display === 'none', cards[0].textContent.replace(/\s+/g, ' ').slice(0, 120));
    ok('no Members area strip over the boxes', getComputedStyle(document.querySelector('.vault-hero')).display === 'none');

    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [5, 60, 15, 240]; C.stopPx = { EURUSD: 0.0012 }; C.stopUnit = 'pips'; C.tgtUnit = 'R'; C.tgtR = 2; C.tgtOn = true;
    var openDay = async function () { await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100); };
    var S = function () { return P._s(); }, pane = function (i) { return P._panes()[i || 0]; };
    var hhmm = function (t) { var d = new Date(t * 1000); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    var stepTo = function (s) { var g = 0; while (S() && g++ < 400) { if (new Date(S().now * 1000).getDate() === 1 && hhmm(S().now) >= s) break; P._step(); } };
    var playOut = function () { var g = 0; while (S() && S().pos && g++ < 400) P._step(); };
    var lastBar = function (i) { var pb = P._paneBars(i || 0); return pb.data[pb.real - 1]; };

    // symbols
    await openDay();
    var syms = (P._syms() || []).map(function (s) { return s.key; });
    ok('the symbol list comes from the store: EUR/USD and Gold today', syms.indexOf('EURUSD') >= 0 && syms.indexOf('XAUUSD') >= 0, syms);
    ok('broker names merge: US100.cash, NAS100 and USTEC are NQ; EURUSD.r and EURUSDm are EURUSD; GOLD is XAUUSD', P._canon('US100.cash') === 'NQ' && P._canon('NAS100') === 'NQ' && P._canon('USTEC') === 'NQ' && P._canon('EURUSD.r') === 'EURUSD' && P._canon('EURUSDm') === 'EURUSD' && P._canon('GOLD') === 'XAUUSD', [P._canon('US100.cash'), P._canon('NAS100'), P._canon('EURUSDm')]);

    // the whole day, Asia first
    ok('the day runs 17:00 New York to 17:00 New York (22:00 to 22:00 here) and starts at the open', hhmm(S().f.open) === '22:00' && hhmm(S().f.close) === '22:00' && S().now === S().f.open, [hhmm(S().f.open), hhmm(S().now)]);
    ok('the 5m chart shows the 3 hours before, ending just before 22:00 on 30 Sep', lastBar().time + 300 <= S().f.open && hhmm(lastBar().time) >= '21:40', hhmm(lastBar().time));
    var ses = document.querySelectorAll('#stpr-ses [data-ses]');
    ok('Asia, London and New York, Asia lit', ses.length === 3 && ses[0].classList.contains('on'));
    ok('no EA panel, no sign over the future', !document.getElementById('stpr-ea') && !/hidden/i.test(document.getElementById('stpr-cw').textContent));
    ok('the crosshair says the date: "Thu 1 Oct \'26  08:15"', pane().chart.options().localization.timeFormatter(Date.parse('2026-10-01T07:15:00Z') / 1000) === "Thu 1 Oct '26  08:15", pane().chart.options().localization.timeFormatter(Date.parse('2026-10-01T07:15:00Z') / 1000));
    document.querySelector('#stpr-ses [data-ses="london"]').click(); await W(150);
    ok('London jumps to 08:00: the last 5m candle is 07:55, London lit', hhmm(lastBar().time) === '07:55' && document.querySelector('#stpr-ses [data-ses="london"]').classList.contains('on'), hhmm(lastBar().time));

    // the timeframe pill and its row
    var pill = pane().el.querySelector('.stpr-tfpill'), wrap = pane().el.querySelector('.stpr-ptfw');
    pill.click(); await W(50);
    ok("the timeframe pill opens Trade Replay's row: 1m 5m 15m 1h 4h 12h 1D 1W 1Y", wrap.classList.contains('open') && Array.prototype.map.call(wrap.querySelectorAll('[data-tf]'), function (b) { return b.textContent; }).join(' ') === '1m 5m 15m 1h 4h 12h 1D 1W 1Y');
    wrap.querySelector('[data-tf="60"]').click(); for (var z = 0; z < 50 && pane().tf !== 60; z++) await W(100); await W(300);
    ok('1h picked: the chart is 1h and its last candle is the 07:00 hour', pane().tf === 60 && hhmm(lastBar().time) === '07:00', hhmm(lastBar().time));
    pane().el.querySelector('.stpr-tfpill').click(); await W(30); pane().el.querySelector('[data-tf="5"]').click(); for (z = 0; z < 50 && pane().tf !== 5; z++) await W(100); await W(300);

    var ch, r;
    await P._tf(0, 5); await W(300); P._jump('london'); await W(300);   // the jump re-fits the chart on the next frames
    // news: a release shows once its candle has come; the card tells the numbers
    P._step();   // the 08:00 candle prints
    P._news([{ at: '2026-10-01T07:00:00Z', currency: 'EUR', title: 'Test PMI', impact: 'High', forecast: '50.1', previous: '49.8', actual: '51.0' }, { at: '2026-10-01T12:30:00Z', currency: 'USD', title: 'Later release', impact: 'High', forecast: '1', previous: '1', actual: '2' }]);
    await W(300);
    for (var zz = 0; zz < 100 && !(P._xOfT(0, 1790838000) < pane().el.clientWidth - 70); zz++) await W(100);   // a busy headless browser can be slow to apply the jump's view
    P._render();
    var hits = pane()._news || []; ch = pane().el.querySelector('.stpr-pc'); r = ch.getBoundingClientRect();
    ok('the 08:00 release has its disc, the 13:30 one not yet', hits.length === 1 && hits[0].e.title === 'Test PMI', { hits: hits.map(function (h) { return h.e.title; }), rows: P._newsRows().length, x: P._xOfT(0, 1790838000), now: S().now, w: pane().el.clientWidth, layout: P._panes().length });
    if (hits[0]) { (document.elementFromPoint(r.left + hits[0].x, r.top + hits[0].y) || ch).dispatchEvent(new MouseEvent('mousemove', { clientX: r.left + hits[0].x, clientY: r.top + hits[0].y, bubbles: true })); await W(30); }
    var card = pane().el.querySelector('.strp-newscard');
    ok('hovering it shows the card with Actual / Forecast / Previous', card && card.style.display === 'block' && /EUR · Test PMI/.test(card.textContent) && /51\.0/.test(card.textContent), card && card.textContent);

    P._news([]);
    // units and the SL / TP button
    stepTo('08:20');
    ok('price after the 08:15 candle (the clock at 08:20) is 1.13147', near(lastBar().close, 1.13147), lastBar());
    var stopBox = function () { return document.getElementById('stpr-stop').value; }, tgtBox = function () { return document.getElementById('stpr-tgt').value; };
    ok('Stop 12.0 pips, Target 2 R', stopBox() === '12.0' && tgtBox() === '2', [stopBox(), tgtBox()]);
    document.querySelector('#stpr-tr [data-a="su"]').click(); await W(30);
    ok('Stop in points: 120', stopBox() === '120' && /pts/.test(document.querySelector('#stpr-tr [data-a="su"]').textContent), stopBox());
    document.querySelector('#stpr-tr [data-a="su"]').click(); await W(30);
    document.querySelector('#stpr-tr [data-a="tu"]').click(); await W(30);
    ok('Target in pips: 24.0', tgtBox() === '24.0', tgtBox());
    document.querySelector('#stpr-tr [data-a="tu"]').click(); await W(30);
    ok('Target in points: 240', tgtBox() === '240', tgtBox());
    document.querySelector('#stpr-tr [data-a="tu"]').click(); await W(30);
    ok('Target back in R: 2', tgtBox() === '2', tgtBox());
    document.querySelector('#stpr-tr [data-a="exec"]').click(); await W(50);
    var find = function (k) { return P._lines(0).filter(function (l) { return l.k === k; })[0]; };
    ok('SL / TP shows the lines without pointing at anything (a buy to start)', S().exec && S().pv && S().pv.dir === 1 && find('pvsl') && near(find('pvsl').p, 1.13027, 1e-9) && find('pvtp') && near(find('pvtp').p, 1.13387, 1e-9), P._lines(0));
    ch = pane().el.querySelector('.stpr-pc'); r = ch.getBoundingClientRect(); var x = r.left + r.width * 0.5;
    var y0 = r.top + P._yOf(0, 1.13027), y1 = r.top + P._yOf(0, 1.13267);
    ch.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y0, bubbles: true, pointerId: 5, pointerType: 'mouse' }));
    ch.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y1, bubbles: true, pointerId: 5, pointerType: 'mouse' }));
    ch.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y1, bubbles: true, pointerId: 5, pointerType: 'mouse' }));
    await W(50);
    ok('dragging the SL above price turns it into a sell with a ~12-pip stop', S().pv.dir === -1 && near(C.stopPx.EURUSD, 0.0012, 0.00004) && document.querySelector('#stpr-tr [data-a="sell"]').classList.contains('pv'), { dir: S().pv.dir, stop: C.stopPx.EURUSD });
    C.stopPx.EURUSD = 0.0012;
    document.querySelector('#stpr-tr [data-a="sell"]').click(); await W(50);
    var p = S().pos;
    ok('SELL: entry 1.13147, stop 1.13267, target 1.12907', p && near(p.entry, 1.13147) && near(p.sl, 1.13267, 1e-9) && near(p.tp, 1.12907, 1e-9), p && { e: p.entry, sl: p.sl, tp: p.tp });
    playOut();
    var d1 = S().done;
    ok('target hit at 09:39: +2.00R, +24.0 pips', d1 && d1.why === 'tp' && near(d1.r, 2, 0.001) && near(d1.dist, 24, 0.05) && d1.unit === 'pips' && hhmm(d1.exitTs) === '09:39', d1);
    ok('the result card says it', /TARGET HIT/.test(document.getElementById('stpr-tr').textContent) && /\+24\.0 pips/.test(document.getElementById('stpr-tr').textContent), document.getElementById('stpr-tr').textContent.slice(0, 90));
    // the slim arrows (16 Oct 2026, as on the live chart): the sell's entry arrow is drawn by __stArrows, the exit circle stays a library marker
    var arw = (P._panes()[0] && P._panes()[0].series.__stArw) ? P._panes()[0].series.__stArw.items : [];
    ok('the sell\'s entry is a slim pink down-arrow over its candle', arw.some(function (m) { return m.shape === 'arrowDown' && m.position === 'aboveBar' && m.color === '#f472b6'; }), arw);
    S().done = null; S().exec = false; S().pv = null; P._render();

    // four charts, none showing the future
    await P._layout(4); await W(400);
    ok('four charts', P._panes().length === 4 && document.querySelectorAll('#stpr-grid .stpr-pane').length === 4);
    await P._tf(2, 1440); await P._tf(3, 10080); await W(300);
    var base = S().base.filter(function (b) { return b.time < S().now; }), now = S().now, leak = [];
    P._panes().forEach(function (pp, i) { var lb = lastBar(i); var from = Math.max(lb.time, S().f.open);
      var hi = Math.max.apply(null, base.filter(function (b) { return b.time >= from; }).map(function (b) { return b.high; }).concat([-1]));
      if (lb.time >= now) leak.push(i + ': starts in the future'); if (pp.tf <= 1440 && lb.time >= S().f.open && !near(lb.high, hi, 1e-9)) leak.push(i + ' high ' + lb.high + ' vs ' + hi); });
    ok('every chart ends at now: no candle and no high from the future (5m, 1h, 1D, 1W)', !leak.length, leak);
    var dlb = lastBar(2);
    ok('the 1D candle is the day so far (opened 22:00 on 30 Sep)', hhmm(dlb.time) === '22:00' && new Date(dlb.time * 1000).getDate() === 30, hhmm(dlb.time));

    // the black chart: zoom away and switch auto-fit off, then Show the rest
    P._panes().forEach(function (pp) { pp.chart.priceScale('right').applyOptions({ autoScale: false }); pp.chart.timeScale().setVisibleLogicalRange({ from: 0, to: 20 }); });
    var srErr = null; try { P._showRest(); } catch (e) { srErr = e.message + ' @ ' + String(e.stack || '').split(String.fromCharCode(10)).slice(1, 4).join(' / '); }
    await W(400);
    ok('Show the rest runs without an error', !srErr, srErr);
    var lost = [];
    P._panes().forEach(function (pp, i) { if (!pp.chart.priceScale('right').options().autoScale) lost.push(i + ' autoScale off'); if (pp.n < 2) lost.push(i + ' empty'); });
    ok('after Show the rest the day is finished and every chart has auto-fit back on (the view itself: see the screenshot check)', S().now === S().f.close && !lost.length, lost);
    await P._layout(1); await W(300);

    // drawings: Trade Replay's tools, placed click, click (all of it in practice_tools_e2e.js)
    await openDay(); P._jump('london'); await W(300);
    var DW = P._dr(); DW.list = []; DW.hist = ['[]']; DW.hpos = 0; DW.sel = null;
    document.getElementById('stpr-drawbtn').click();
    document.querySelector('#stpr-tools [data-tool="trend"]').click();
    ch = pane().el.querySelector('.stpr-pc'); r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || ch; el.dispatchEvent(new MouseEvent(t, { clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' ? 1 : 0 })); };
    mev('mousedown', 200, 150); mev('mouseup', 200, 150); mev('mousemove', 300, 220); mev('mousedown', 300, 220); mev('mouseup', 300, 220); await W(50);
    ok('a trend line is placed click, click, like Trade Replay, and stays selected', DW.list.length === 1 && DW.list[0].type === 'trend' && DW.tool === 'none' && DW.sel === 0, DW.list);
    var box = pane().el.querySelector('.stpr-props');
    ok("its options box opens: Trade Replay's eight colours", box && box.style.display === 'flex' && box.querySelectorAll('[data-col]').length === 8);
    document.querySelector('#stpr-tools [data-tool="hline"]').click(); mev('mousedown', 250, 260); mev('mouseup', 250, 260); await W(30);
    ok('a horizontal line with one click', DW.list.length === 2 && DW.list[1].type === 'hline');
    document.getElementById('stpr-undo').click();
    ok('undo takes it away, redo brings it back', DW.list.length === 1 && (document.getElementById('stpr-redo').click(), DW.list.length === 2));
    DW.sel = null; mev('mousedown', 250, 260); mev('mouseup', 250, 260);
    ok('a click on it selects it, Delete removes it', DW.sel === 1 && (document.getElementById('stpr-del').click(), DW.list.length === 1));

    // a stop-out and Gold
    S().exec = false; S().pv = null; stepTo('08:20'); P._place(1); playOut();
    ok('a buy there is stopped out: -1.00R', S().done && S().done.why === 'sl' && near(S().done.r, -1, 0.001), S().done);
    await P.open({ symbol: 'XAUUSD', day: '2026-10-01' }); for (var k = 0; k < 60 && !(S() && S().sym.key === 'XAUUSD'); k++) await W(100);
    ok('Gold loads (2 decimals)', S() && S().sym.key === 'XAUUSD' && S().digits === 2, S() && { digits: S().digits });
    ok('no practice trade in the journal', !((getAllLifetimeTrades() || []).some(function (t) { return t && t.practice; })));
    P.close(); await W(200);
    ok('closing hides it and the Practice Replay box counts the trades (and has no line under its text)', /Practice trades\s*[1-9]/.test(document.getElementById('vault-hub-practice-tiles').textContent) && !document.querySelector('#vault-hub .vault-hub-meta'), document.getElementById('vault-hub-practice-tiles').textContent);
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
