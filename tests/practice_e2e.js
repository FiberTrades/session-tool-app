(async function () {
  // Practice Replay (14 Oct 2026), everything Nestor asked for that evening: the third Academy box; the whole
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
    ok('no sign over the future (the old practice EA panel is gone; the Minimalist Manager panel is checked below)', !document.getElementById('stpr-ea') && !/hidden/i.test(document.getElementById('stpr-cw').textContent));
    ok('the crosshair says the date: "Thu 1 Oct \'26  08:15"', pane().chart.options().localization.timeFormatter(Date.parse('2026-10-01T07:15:00Z') / 1000) === "Thu 1 Oct '26  08:15", pane().chart.options().localization.timeFormatter(Date.parse('2026-10-01T07:15:00Z') / 1000));
    document.querySelector('#stpr-ses [data-ses="london"]').click(); await W(150);
    ok('London jumps to 08:00: the last 5m candle is 07:55, London lit', hhmm(lastBar().time) === '07:55' && document.querySelector('#stpr-ses [data-ses="london"]').classList.contains('on'), hhmm(lastBar().time));

    // the timeframe pill and its row
    var pill = document.querySelector('#stpr-maintf .stpr-tfpill'), wrap = pill && pill.parentNode;
    ok('one chart: its timeframe button sits in the top bar, before the pencil (Nestor: "are you moving this up here?")', pill && !pane().el.querySelector('.stpr-tfpill') && pill.getBoundingClientRect().right <= document.getElementById('stpr-drawbtn').getBoundingClientRect().left && pill.textContent.indexOf('5m') === 0, pill && pill.textContent);
    var tbH = document.getElementById('stpr-tb2').getBoundingClientRect().height;
    ok('the timeframe button reads just the timeframe (no arrow)', pill && !pill.querySelector('svg') && pill.textContent === '5m', pill && pill.innerHTML);
    pill.click(); await W(50);
    ok('its list open: the top bar keeps its height (Nestor: "why when clicking on these the row gets taller")', Math.abs(document.getElementById('stpr-tb2').getBoundingClientRect().height - tbH) < 0.5, [tbH, document.getElementById('stpr-tb2').getBoundingClientRect().height]);
    var dwb = document.getElementById('stpr-drawbtn'), wasD = document.getElementById('stpr-tb2').classList.contains('drawing'); if (!wasD) { dwb.click(); await W(40); }
    ok('the drawing tools open: the same height', Math.abs(document.getElementById('stpr-tb2').getBoundingClientRect().height - tbH) < 0.5, document.getElementById('stpr-tb2').getBoundingClientRect().height);
    if (!wasD) { dwb.click(); await W(40); }
    if (!wrap.classList.contains('open')) { pill.click(); await W(40); }   // (a click elsewhere closes the list: open it again)
    ok("the timeframe pill opens Trade Replay's row: 1m 5m 15m 1h 4h 12h 1D 1W 1Y", wrap.classList.contains('open') && Array.prototype.map.call(wrap.querySelectorAll('[data-tf]'), function (b) { return b.textContent; }).join(' ') === '1m 5m 15m 1h 4h 12h 1D 1W 1Y');
    wrap.querySelector('[data-tf="60"]').click(); for (var z = 0; z < 50 && pane().tf !== 60; z++) await W(100); await W(300);
    ok('1h picked: the chart is 1h and its last candle is the 07:00 hour', pane().tf === 60 && hhmm(lastBar().time) === '07:00', hhmm(lastBar().time));
    document.querySelector('#stpr-maintf .stpr-tfpill').click(); await W(30); document.querySelector('#stpr-maintf [data-tf="5"]').click(); for (z = 0; z < 50 && pane().tf !== 5; z++) await W(100); await W(300);

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
    // the Minimalist Manager panel (17 Oct 2026): the EA's rows beside the chart, execution mode, the confirm box, and the
    // EA's break-even, partial closes, pending orders, daily limit, ON / OFF and folding
    stepTo('08:20');
    ok('price after the 08:15 candle (the clock at 08:20) is 1.13147', near(lastBar().close, 1.13147), lastBar());
    var mmEl = document.getElementById('stpr-mm'), cw = document.getElementById('stpr-cw');
    var mmIn = function (k) { return mmEl.querySelector('[data-mmi="' + k + '"]'); }, mmBtn = function (k) { return mmEl.querySelector('[data-mm="' + k + '"]'); };
    var setIn = function (k, v) { var el = mmIn(k); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    var gridL = document.getElementById('stpr-grid').getBoundingClientRect().left - cw.getBoundingClientRect().left;
    var tfR = P._panes()[0].el.getBoundingClientRect(), pmR = mmEl && mmEl.getBoundingClientRect();   // (one chart: its timeframe button is in the top bar; the panel keeps its place under the O H L C line)
    ok('open, the panel hangs from the top left of the first chart under its timeframe button, 300 px wide, over the chart: the charts keep the whole width (17 Oct 2026: "it just extends down")', mmEl && mmEl.parentNode === document.getElementById('stpr-tl') && mmEl.classList.contains('drop') && Math.abs(pmR.width - 300) < 2 && gridL < 2 && Math.abs(pmR.top - tfR.top - 8) < 2 && Math.abs(pmR.left - tfR.left - 8) < 2 && pmR.bottom <= P._panes()[0].el.getBoundingClientRect().bottom + 1, { w: pmR && pmR.width, gridL: gridL, top: pmR && pmR.top, tf: tfR.top });
    ok('its title says Practice account, not a real account (17 Oct 2026)', mmEl.querySelector('.stpr-mm-n').textContent === 'Practice account', mmEl.querySelector('.stpr-mm-n').textContent);
    ok("it has the EA's sections", ['Order', 'Risk', 'Take profit', 'Break-even', 'Trailing stops', 'Partial closes', 'Daily limit'].every(function (t) { return new RegExp(t, 'i').test(mmEl.textContent); }) && !mmBtn('exec') && /Press O, then click the chart where your stop goes/.test(mmEl.textContent), mmEl.textContent.slice(0, 200));
    setIn('min', '2'); setIn('max', '12'); await W(30);
    ok('Min SL 2.0 and Max SL 12.0 pips held (the stop box is gone: the panel holds it)', mmIn('min').value === '2.0' && mmIn('max').value === '12.0' && !document.getElementById('stpr-stop'), [mmIn('min').value, mmIn('max').value]);
    ok('Target by R, Take profit 2', mmBtn('tpu').textContent === 'R' && mmIn('tp').value === '2.00', [mmBtn('tpu').textContent, mmIn('tp').value]);
    mmBtn('tpu').click(); await W(30);
    ok('Target by Pips: 24.0', mmBtn('tpu').textContent === 'Pips' && mmIn('tp').value === '24.0', mmIn('tp').value);
    mmBtn('tpu').click(); await W(30);
    ok('Target by Points: 240', mmBtn('tpu').textContent === 'Points' && mmIn('tp').value === '240', mmIn('tp').value);
    mmBtn('tpu').click(); await W(30);
    ok('back to R: 2', mmBtn('tpu').textContent === 'R' && mmIn('tp').value === '2.00', mmIn('tp').value);
    // execution mode: Execute, the stop follows the mouse (held at Max SL), a click asks, Enter places
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true })); await W(50);   // the key arms it, as in MT5: no Execute button on a computer (17 Oct 2026)
    var find = function (k) { return P._lines(0).filter(function (l) { return l.k === k; })[0]; };
    ok('Execute: execution mode on, the preview a buy with a 12-pip stop to start', S().exec && S().pv && S().pv.dir === 1 && find('pvsl') && near(find('pvsl').p, 1.13027, 1e-9) && find('pvtp') && near(find('pvtp').p, 1.13387, 1e-9) && /Execution mode on: click the chart where your stop goes\. Press O again to leave\./.test(mmEl.querySelector('.stpr-mm-fn').textContent) && /Press O again to leave/.test(document.getElementById('stpr-tr').textContent) && mmEl.querySelector('.stpr-mm-fn').classList.contains('on'), P._lines(0));
    ch = pane().el.querySelector('.stpr-pc'); r = ch.getBoundingClientRect(); var x = r.left + r.width * 0.5;
    var pev = function (t, price, btn) { ch.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: r.top + P._yOf(0, price), bubbles: true, cancelable: true, pointerId: 7, pointerType: 'mouse', button: btn || 0 })); };
    pev('pointermove', 1.13227); await W(60);
    ok('the mouse 8 pips above price: a sell with an 8-pip stop', S().pv.dir === -1 && near(S().pv.rd, 0.0008, 0.00002), S().pv);
    pev('pointermove', 1.13447); await W(60);
    ok('30 pips above: held at Max SL, 12 pips', S().pv.dir === -1 && near(S().pv.rd, 0.0012, 1e-9), S().pv);
    pev('pointerdown', 1.13267); await W(60);
    var p = S().pos;
    ok('the click places it at once, as the EA does (no box to answer): SELL at 1.13147, stop 1.13267, target 1.12907; execution mode ends', p && p.dir === -1 && near(p.entry, 1.13147) && near(p.sl, 1.13267, 1e-9) && near(p.tp, 1.12907, 1e-9) && !S().exec && !document.getElementById('stpr-cf'), p && { e: p.entry, sl: p.sl, tp: p.tp });
    ok('the BE line is parked just inside the target, as the EA parks it (5 pips)', p && near(p.be, 1.12957, 1e-9) && find('be'), p && p.be);
    // the BE line dragged to 1R, and a partial: P1 closes 50% at 1R
    P._setLine('be', 1.13027);
    mmBtn('pcadd').click(); await W(30);
    ok('Add P1: a P1 50% line on the open trade', S().pos.pc.length === 1 && S().pos.pc[0].pct === 50 && find('pc0') && mmIn('pc:0').value === '50', S().pos.pc);
    P._setLine('pc0', 1.13027);
    playOut();
    var d1 = S().done;
    ok('break-even at 1R and P1 at 1R, then the target at 09:39: +1.50R in 2 parts, the stop at the entry', d1 && d1.why === 'tp' && near(d1.r, 1.5, 0.001) && d1.parts === 2 && near(d1.sl, 1.13147, 1e-9) && hhmm(d1.exitTs) === '09:39', d1);
    ok('the result card says it', /TARGET HIT IN 2 PARTS/.test(document.getElementById('stpr-tr').textContent) && /\+1\.50R/.test(document.getElementById('stpr-tr').textContent), document.getElementById('stpr-tr').textContent.slice(0, 120));
    // the slim arrows (16 Oct 2026, as on the live chart): the sell's entry arrow is drawn by __stArrows, the exit circle stays a library marker
    var arw = (P._panes()[0] && P._panes()[0].series.__stArw) ? P._panes()[0].series.__stArw.items : [];
    ok('the sell\'s entry is a slim pink down-arrow over its candle', arw.some(function (m) { return m.shape === 'arrowDown' && m.position === 'aboveBar' && m.color === '#f472b6'; }), arw);
    mmBtn('pcdel').click(); await W(30);
    // pending orders: a Buy Limit above price is refused; a Sell Stop below fills when price gets there
    S().done = null; P._render(); await openDay(); stepTo('08:20');
    mmBtn('ord').click(); await W(30);
    ok('Order type Limit', /Limit/.test(mmBtn('ord').textContent) && P._mm().ord === 'limit');
    P._exec(true); P._setLine('pvent', 1.13200); P._aim(1.13150); P._fire(); await W(30);
    ok('a Buy Limit above price is refused, as the broker refuses it', !S().pend && !S().pos, S().pend);
    mmBtn('ord').click(); await W(30);
    P._exec(true); P._setLine('pvent', 1.13100); P._aim(1.13200);
    ok('the preview names it: SELL STOP on the entry line', P._lines(0).some(function (l) { return l.k === 'pvent' && /SELL STOP/.test(l.title); }), P._lines(0));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await W(30);   // Enter places it, as a click does
    ok('it waits: SELL STOP 1.13100 with a Cancel order button', S().pend && S().pend.kind === 'stop' && near(S().pend.entry, 1.13100) && /SELL STOP/.test(document.getElementById('stpr-tr').textContent) && document.querySelector('#stpr-tr [data-a="cancel"]'), S().pend);
    var g2 = 0; while (S().pend && g2++ < 200) P._step();
    ok('it fills when price comes down to 1.13100: a sell from there', S().pos && S().pos.dir === -1 && near(S().pos.entry, 1.13100) && !S().pend, S().pos && S().pos.entry);
    P._close(); S().done = null; mmBtn('ord').click(); await W(30);
    ok('back to Market', P._mm().ord === 'market');
    // the execution key, the daily limit, ON / OFF and folding
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true })); await W(30);
    ok('the O key turns execution mode on (and off again)', S().exec && (document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true })), !S().exec));
    setIn('maxd', '1'); await W(30);
    ok('Max trades 1 with a trade taken today: OFF, the O key does nothing, the row says so', /OFF/.test(mmBtn('on').textContent) && (document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true })), !S().exec) && /Daily limit reached/.test(document.getElementById('stpr-tr').textContent) && /Daily limit reached/.test(mmEl.textContent), mmEl.querySelector('.stpr-mm-f').textContent);
    setIn('maxd', '0'); await W(30);
    mmBtn('on').click(); await W(30);
    ok('ON / OFF: off, the O key does nothing; on again and it works', /OFF/.test(mmBtn('on').textContent) && (document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true })), !S().exec) && (mmBtn('on').click(), /ON/.test(mmBtn('on').textContent) && (document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true })), S().exec)));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true })); await W(20);
    mmBtn('col').click(); await W(300);
    var gl2 = document.getElementById('stpr-grid').getBoundingClientRect().left - cw.getBoundingClientRect().left;
    var mr = mmEl.getBoundingClientRect(), cr = cw.getBoundingClientRect();
    ok('− folds the panel to a strip at the top left of the first chart, under its timeframe button (title, ON, +), the charts take the whole width, no idle question beside it', mmEl.parentNode === document.getElementById('stpr-tl') && mmEl.parentNode.parentNode === P._panes()[0].el && mmEl.classList.contains('strip') && !mmEl.querySelector('.stpr-mm-b') && !mmBtn('exec') && gl2 < 2 && mr.height <= 32 && Math.abs(mr.top - P._panes()[0].el.getBoundingClientRect().top - 8) < 2 && !/What would you do/.test(P._panes()[0].el.textContent) && getComputedStyle(document.getElementById('stpr-pill')).display === 'none', { gl2: gl2, bottom: mr.bottom, cwTop: cr.top, h: mr.height });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true })); await W(30);
    ok('the O key works with the panel folded, and the strip lights up while it is on', S().exec && mmEl.classList.contains('armed') && (document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true })), !S().exec && !mmEl.classList.contains('armed')));
    // execution mode ends when the mouse leaves the window or the app, or the app loses the focus (as the EA disarms off the chart)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true })); await W(20); var a1 = S().exec; document.getElementById('stpr-win').dispatchEvent(new MouseEvent('mouseleave')); await W(20);
    ok('the mouse leaving the window turns execution mode off', a1 && !S().exec);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true })); await W(20); var a2 = S().exec; window.dispatchEvent(new Event('blur')); await W(20);
    ok('switching to another program (the app loses the focus) turns it off too', a2 && !S().exec);
    mmBtn('col').click(); await W(200);
    // a touch screen (Nestor, 17 Oct 2026): Execute shows the lines, a touch on the chart never places, the SL line is dragged,
    // one button that says SELL or BUY places it
    P._touch(true); await W(50);
    ok('on a touch screen the panel has Execute and no key row', mmBtn('exec') && /Execute/.test(mmBtn('exec').textContent) && !mmBtn('key'), mmEl.querySelector('.stpr-mm-f').textContent);
    mmBtn('exec').click(); await W(50);
    var place = function () { return mmBtn('place'); };
    ok('Execute: the lines appear, with Cancel and a green BUY button', S().exec && find('pvsl') && place() && /BUY/.test(place().textContent) && place().classList.contains('buy') && /Cancel/.test(mmBtn('exec').textContent), place() && place().textContent);
    ch = pane().el.querySelector('.stpr-pc'); r = ch.getBoundingClientRect(); x = r.left + r.width * 0.3;
    var tev = function (t, price) { ch.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: r.top + P._yOf(0, price), bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch' })); };
    var c0 = lastBar().close;
    tev('pointerdown', c0 + 0.0030); tev('pointerup', c0 + 0.0030); await W(40);
    ok('a touch on the chart (away from the lines) never opens a trade', !S().pos && S().exec, S().pos);
    var slp = find('pvsl').p; tev('pointerdown', slp); tev('pointermove', c0 + 0.0003); tev('pointerup', c0 + 0.0003); await W(60);
    ok('dragging the SL line above price makes it a sell: the button turns red and says SELL', S().pv.dir === -1 && place() && /SELL/.test(place().textContent) && place().classList.contains('sell') && !S().pos, place() && place().textContent);
    place().click(); await W(50);
    ok('the button places it: a sell with that stop', S().pos && S().pos.dir === -1 && near(S().pos.sl - S().pos.entry, 0.0003, 0.00002) && !S().exec, S().pos && { e: S().pos.entry, sl: S().pos.sl });
    P._close(); S().done = null; P._render(); await W(30);
    mmBtn('exec').click(); await W(30); mmBtn('exec').click(); await W(30);
    ok('Cancel leaves execution mode', !S().exec && !mmBtn('place'));
    P._touch(null); C.stopPx.EURUSD = 0.0012; await W(30);   // the drag set a 3-pip stop; the checks below start from 12
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
    // the open panel hangs over the top left of the chart: folded, these clicks reach the chart
    if (!P._mm().col) { document.querySelector('#stpr-mm [data-mm="col"]').click(); await W(150); }
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
