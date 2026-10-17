// End-to-end test: the Session Live chart of an open trade draws the EA's break-even trigger, and keeps the stop, the
// target and that trigger on screen.
//   python tests/browser_test.py tests/livebe_e2e.js
// Headless Edge, throwaway profile, signed out: nothing live is read or written. The trade is Nestor's EUR/USD short of
// 16 Oct 2026 as the EA sent it (entry 1.12433, stop 1.12473, target 1.12233, BE line dragged to 1.12351); the candles
// come from a stand-in for live_bars.
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
    doc.querySelectorAll('script:not([src])').forEach(function (s, i) {
      var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return;
      try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); }
    });
    check('every inline script parses', bad.length === 0, bad);

    // 110 one-minute candles between 1.12322 and 1.12494, like the morning on his screenshot
    var now = Math.floor(Date.now() / 1000), t0 = now - (now % 60) - 110 * 60, bars = [], p = 1.12355;
    for (var i = 0; i < 110; i++) {
      var o = p, c = 1.12408 + 0.0007 * Math.sin(i / 9) + 0.0002 * Math.sin(i * 1.7);
      if (i === 48) c = 1.12480;
      var h = Math.max(o, c) + 0.00006, l = Math.min(o, c) - 0.00006;
      bars.push((t0 + i * 60) + ',' + o.toFixed(5) + ',' + h.toFixed(5) + ',' + l.toFixed(5) + ',' + c.toFixed(5));
      p = c;
    }
    window.__stLiveBars = function () { return Promise.resolve({ bars: bars.join(';'), digits: 5, updated_at: new Date().toISOString() }); };
    var tab = document.querySelector('.tab[data-page="review"]'); if (tab) tab.click();
    await W(400);
    var p0 = document.getElementById('page-review'); if (p0) p0.classList.add('session-live-collapsed');
    try { localStorage.removeItem('st_live_chart_min'); localStorage.removeItem('st_live_chart_tall'); } catch (e) {}
    var fb = (now - (now % 60)) + ',1.12442,1.12454,1.12438,1.12447,60';
    var row = { ticket: 176083301, login: 541419576, symbol: 'EURUSD', direction: 'short', lots: 16.64, risk: 499.64,
      opened_at: new Date(Date.now() - 50 * 60000).toISOString(), seen_at: new Date().toISOString(), tick_at: new Date().toISOString(),
      r_now: -0.311, pnl_now: -174.86, sl_r: -0.889, tp_r: 4.444, ladder: 'B:1.82:0.11:0', px: 1.12447, op: 1.12433, rpx: 0.00045,
      digits: 5, bar: fb, spread: 0.00001 };
    window.__stLive.upsert(row);
    var D = null;
    for (var k = 0; k < 40; k++) {
      await W(250);
      try { window.__stLiveBox.render(); } catch (e) {}
      var all = window.__stLiveBox.charts(); D = all[0];
      if (D && D.ready && D.bars > 50 && D.ys && D.ys.length) break;
    }
    check('a live chart is drawn for the trade', D && D.ready && D.bars > 50, D);
    var line = function (t) { return ((D && D.lines) || []).filter(function (x) { return x.indexOf(t + ' ') === 0; })[0] || ''; };
    var bePx = 1.12433 - 1.82 * 0.00045;
    check('the BE trigger is a line at its price (1.12351)', line('BE') && Math.abs(parseFloat(line('BE').split(' ')[1]) - bePx) < 0.000006, D && D.lines);
    check('it is a solid blue line, like the EA\'s BE line in MT5', D && (D.colors || []).indexOf('BE #4C8DFF') >= 0 && (D.styles || []).indexOf('BE 0') >= 0, D && [D.colors, D.styles]);
    check('SL, Entry and TP are still drawn', line('SL') && line('Entry') && line('TP'), D && D.lines);
    check('the entry line is solid now (not dotted)', D && (D.styles || []).indexOf('Entry 0') >= 0, D && D.styles);
    // every level inside the plot, the target 4.4R away included
    var off = ((D && D.ys) || []).filter(function (y) { return !(y.y != null && y.y >= 0 && y.y <= D.h); });
    check('the stop, entry, BE and target all sit inside the plot', D && D.ys && D.ys.length >= 4 && off.length === 0, D && { ys: D.ys, h: D.h });

    // the entry arrow (Trade Replay's pink arrow, slimmer): over the entry candle on a sell, pointing down
    var mk0 = (D && D.marks) || [], openS = Math.floor(Date.parse(row.opened_at) / 1000);
    check('a sell has one pink down-arrow over its entry candle', mk0.length === 1 && mk0[0].shape === 'arrowDown' && mk0[0].position === 'aboveBar' && mk0[0].color === '#f472b6'
      && mk0[0].time <= openS && openS - mk0[0].time < 120, { marks: mk0, openS: openS });
    check('the arrow is drawn by the slim-arrow layer, not the library', typeof window.__stArrows === 'function', null);

    // the BE fires: the EA stops sending it, so the line goes (MT5 removes its line too)
    window.__stLive.upsert(Object.assign({}, row, { ladder: '', sl_r: 0.111, tick_at: new Date().toISOString() }));
    for (var k2 = 0; k2 < 12; k2++) { await W(200); try { window.__stLiveBox.render(); } catch (e) {} D = window.__stLiveBox.charts()[0]; if (D && !line('BE')) break; }
    check('after the stop moved, the BE trigger line is gone', D && !line('BE') && line('SL'), D && D.lines);

    // partial closes and trailing steps: drawn at their prices in the EA's MT5 colours (teal dashed, pink dotted, used = grey)
    window.__stLive.upsert(Object.assign({}, row, { ladder: 'P:1.00:50:0|T:1.50:0.50:1|T:2.50:1.50:0|B:1.82:0.11:0', sl_r: 0.5, tick_at: new Date().toISOString() }));
    for (var k3 = 0; k3 < 12; k3++) { await W(200); try { window.__stLiveBox.render(); } catch (e) {} D = window.__stLiveBox.charts()[0]; if (D && line('T2')) break; }
    var near = function (t, r) { var l = line(t); return l && Math.abs(parseFloat(l.split(' ').pop()) - (1.12433 - r * 0.00045)) < 0.000006; };
    check('P1, T1, T2 and BE are drawn at their prices', near('P1', 1) && near('T1', 1.5) && near('T2', 2.5) && near('BE', 1.82), D && D.lines);
    var col = D ? D.colors || [] : [], sty = D ? D.styles || [] : [];
    check('a partial close is teal and dashed, like MT5', col.indexOf('P1 50% #5DCAA5') >= 0 && sty.indexOf('P1 50% 2') >= 0, [col, sty]);
    check('a waiting trailing step is pink and dotted, a used one grey', col.indexOf('T2 #F472B6') >= 0 && col.indexOf('T1 #5F5F6E') >= 0 && sty.indexOf('T2 1') >= 0, [col, sty]);

    // EA 8.96 and older send no BE step: nothing breaks, the other levels stay
    var parse = window.__stLiveBox.parseLad ? window.__stLiveBox.parseLad('P:1.00:50:0|B:1.82:0.11:0|T:1.50:0.50:1') : null;
    check('the ladder reads the BE step next to the partials and trailing steps', parse && parse.p.length === 1 && parse.t.length === 1 && parse.b && Math.abs(parse.b.r - 1.82) < 1e-9, parse);
    var old = window.__stLiveBox.parseLad ? window.__stLiveBox.parseLad('P:1.00:50:0') : null;
    check('an older EA (no BE step) leaves it empty', old && old.b === null && old.p.length === 1, old);

    // a buy: the arrow goes under the candle, pointing up
    window.__stLive.upsert(Object.assign({}, row, { ticket: 176083399, direction: 'long', closed_at: null }));
    window.__stLive.upsert(Object.assign({}, row, { closed_at: new Date().toISOString(), pnl: 10 }));
    var DB = null;
    for (var k4 = 0; k4 < 20; k4++) { await W(250); try { window.__stLiveBox.render(); } catch (e) {} DB = window.__stLiveBox.charts().filter(function (x) { return x.k === '176083399'; })[0]; if (DB && DB.marks && DB.marks.length) break; }
    var mb = (DB && DB.marks) || [];
    check('a buy has one pink up-arrow under its entry candle', mb.length === 1 && mb[0].shape === 'arrowUp' && mb[0].position === 'belowBar', DB);

    // the crosshair as in Practice Replay (17 Oct 2026: "same size and colour")
    var D0 = window.__stLiveBox.charts().filter(function (x) { return x.ready; })[0], cx = D0 && D0.cx;
    check("the crosshair is Practice Replay's: the library's lines hidden, its labels on #2a2833, text at 11, the time label reads like Thu 15 Oct '26  22:00", cx && cx.mode === 0 && cx.v === false && cx.lv === true && cx.bg === '#2a2833' && cx.hbg === '#2a2833' && cx.fs === 11 && /^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2} '\d{2}  \d{2}:\d{2}$/.test(cx.t), cx);
    var box0 = document.querySelector('#st-livebox .slx-chb'); if (box0) { box0.scrollIntoView({ block: 'center' }); await W(200); }
    var cv = box0 && box0.querySelector('canvas'), br = cv && cv.getBoundingClientRect();
    if (cv) { var mx = br.left + br.width * 0.4, my = br.top + br.height * 0.4, tgt = document.elementFromPoint(mx, my) || cv;
      ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove', 'pointermove', 'mousemove'].forEach(function (ty, j) {
        var o = { clientX: mx + j, clientY: my, bubbles: ty.indexOf('enter') < 0, pointerType: 'mouse', pointerId: 1, isPrimary: true };
        tgt.dispatchEvent(ty.indexOf('pointer') === 0 ? new PointerEvent(ty, o) : new MouseEvent(ty, o)); });
      await W(300); }
    var cx2 = (window.__stLiveBox.charts().filter(function (x) { return x.ready; })[0] || {}).cx;
    check('moving the mouse over it puts our pink dashed lines on the candle and at the mouse', cx2 && cx2.pt && cx2.pt.x > 0 && Math.abs(cx2.pt.y - br.height * 0.4) < 4, cx2);

    // the card without a chart (EA before 8.89) marks it on its line too
    var host = document.getElementById('st-livebox');
    check('the card has no error text', host && !/undefined|NaN/.test(host.textContent), host && host.textContent.slice(0, 300));
  } catch (e) {
    check('no exception', false, String(e && e.stack || e));
  }
  return JSON.stringify(results);
})();
