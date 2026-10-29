(async function () {
  // TradingView's "Scroll to the most recent bar" (Nestor, 22 Oct 2026: "can i when hovering around this corner see this to scroll to
  // the current price"). Back Testing (the engine of Live Charts too), real EUR/USD, Thu 1 Oct 2026.
  // Run: python tests/browser_test.py tests/rt_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [5, 15, 60, 240]; C.look = {}; C.mini = false; C.max = true; C.resume = null; C.mm = Object.assign({}, C.mm, { col: true });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('12:00'); await W(600);
    var p = P._panes()[0], ts = p.chart.timeScale(), btn = p.el.querySelector('.stpr-rt'), shown = function () { return !!btn && btn.classList.contains('on') && getComputedStyle(btn).display !== 'none'; };
    var r = p.el.getBoundingClientRect(), mv = function (x, y) { p.el.dispatchEvent(new MouseEvent('mousemove', { clientX: r.left + x, clientY: r.top + y, bubbles: true })); };
    var dims = function () { var psw = p.chart.priceScale('right').width(), th = ts.height(); return { pw: p.el.clientWidth - psw, ph: p.el.clientHeight - th }; };
    ok('the latest candle on screen: no button, even with the mouse in the corner', !P._rtOff(0) && (mv(dims().pw - 30, dims().ph - 30), !shown()), [P._rtOff(0), shown()]);
    var r0 = ts.getVisibleLogicalRange(), span0 = r0.to - r0.from;
    ts.setVisibleLogicalRange({ from: r0.from - 300, to: r0.to - 300 }); await W(300);
    mv(dims().pw / 2, dims().ph / 2); await W(50);
    ok('scrolled back: the latest candle is off the right edge, and with the mouse in the middle there is no button', P._rtOff(0) && !shown(), [P._rtOff(0), shown()]);
    mv(dims().pw - 40, dims().ph - 40); await W(50);
    var br = btn.getBoundingClientRect(), d = dims();
    var lane = P._newsLane ? P._newsLane(0) : 0;
    ok('the mouse near the bottom right corner: the button there, where the Spread label goes (27 Oct 2026), above the times and the news flags lane (29 Oct 2026)', shown() && Math.abs(br.right - (r.left + d.pw - 8)) <= 2 && Math.abs(br.bottom - (r.top + d.ph - 3 - lane)) <= 2, [shown(), br.right, r.left + d.pw, br.bottom, r.top + d.ph, lane]);
    ok('...with its name and key: Scroll to the most recent bar (Alt+Shift+→)', /Scroll to the most recent bar/.test(btn.title) && /Alt\+Shift/.test(btn.title), btn.title);
    // Live Charts puts its Spread label in that corner (lvBadges' p.cdb, made the same way here): the button sits on its row, centred on it, just
    // left of it (Nestor, 27 Oct 2026: "make the >> arrow at bottom of the chart align with the spread label")
    var cdb = document.createElement('div'); cdb.className = 'slx-info stpr-cdb'; cdb.textContent = 'Spread 0.1p'; cdb.style.right = (p.chart.priceScale('right').width() + 8) + 'px'; cdb.style.bottom = (ts.height() + 8) + 'px'; p.el.appendChild(cdb); p.cdb = cdb;
    mv(dims().pw / 2, dims().ph / 2); await W(50); mv(dims().pw - 40, dims().ph - 40); await W(50);
    var br2 = btn.getBoundingClientRect(), cr = cdb.getBoundingClientRect();
    ok('with the Spread label in the corner: the button on its row, centred on it, just left of it', shown() && Math.abs((br2.top + br2.bottom) / 2 - (cr.top + cr.bottom) / 2) <= 1.5 && cr.left - br2.right >= 3 && cr.left - br2.right <= 9, [shown(), (br2.top + br2.bottom) / 2, (cr.top + cr.bottom) / 2, cr.left - br2.right]);
    cdb.remove(); p.cdb = null; mv(dims().pw / 2, dims().ph / 2); await W(50); mv(dims().pw - 40, dims().ph - 40); await W(50);
    btn.click(); await W(700);
    var r1 = ts.getVisibleLogicalRange();
    ok('pressed: the latest candle back on screen at the same zoom, and the button gone', !P._rtOff(0) && Math.abs((r1.to - r1.from) - span0) < 1 && r1.to >= p.n - 1 && !shown(), [P._rtOff(0), r1.to - r1.from, span0, r1.to, p.n - 1, shown()]);
    ts.setVisibleLogicalRange({ from: r1.from - 200, to: r1.to - 200 }); await W(300);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', altKey: true, shiftKey: true, bubbles: true, cancelable: true })); await W(700);
    ok('Alt+Shift+→ does the same', !P._rtOff(0), ts.getVisibleLogicalRange());
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
