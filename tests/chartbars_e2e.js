// End-to-end test (2 Nov 2026, his screenshots 596-608): Trade Replay's logo, spread, flags and close button as the other charts'; the news button's two options on all
// three charts; Replay's playback on the bottom row too, its menus opening upward; the slower speeds; level labels that would land on each other.
// Signed out over the stand-in candles; nothing live.
//   python tests/chartbars_run.py     (a computer, dark chart and light, then a phone)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    window.__stPlatOff = false; window.__stLcForce = true;
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stReplay && window.__stSB); i++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var P = window.__stPractice, R = window.__stReplay, LT = !!window.__RP_LT, phoneNow = innerWidth < 760, $ = function (s) { return document.querySelector(s); };
    var C = P._cfg(); C.layout = 1; C.syms = []; C.mini = false; C.look = LT ? { bg: '#ffffff' } : {}; delete C.lookDk; delete C.lookTh; C.plLt = false; C.resume = { sym: 'EURUSD', day: '2026-10-01', now: 0, at: Date.now() }; C.speed = 0; C.mm.on = true; C.mm.maxDay = 0; C.news = true; delete C.showPer;
    try { localStorage.removeItem('st_plat'); localStorage.removeItem('st_replay_news'); } catch (e) {}
    window.__stNewsCcyOk = function () { return true; };
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    var iso = function (t) { return new Date(t * 1000).toISOString(); };
    var rows = function (tA, tB) { return [
      { at: iso(tA), currency: 'USD', title: 'CPI m/m', impact: 'High', forecast: '0.3%', previous: '0.4%', actual: '0.2%' }, { at: iso(tA), currency: 'USD', title: 'Core CPI m/m', impact: 'High', forecast: '0.3%', previous: '0.3%', actual: '0.4%' },
      { at: iso(tA), currency: 'USD', title: 'CPI y/y', impact: 'High', forecast: '3.0%', previous: '3.1%', actual: '3.0%' }, { at: iso(tA), currency: 'USD', title: 'Unemployment Claims', impact: 'Medium', forecast: '230K', previous: '228K', actual: '225K' },
      { at: iso(tA), currency: 'EUR', title: 'German Prelim GDP q/q', impact: 'Medium', forecast: '0.1%', previous: '0.2%', actual: '0.2%' }, { at: iso(tB), currency: 'GBP', title: 'GDP m/m', impact: 'High', forecast: '0.1%', previous: '0.0%', actual: '0.3%' }]; };
    var WEEK = { from: '2026-09-28', to: '2026-10-04', rows: [{ at: '2026-10-01T07:00:00Z', timed: true, currency: 'EUR', title: 'German Prelim CPI m/m', impact: 'Medium', forecast: '0.1%', previous: '0.6%', actual: '-0.2%' }, { at: '2026-10-01T23:30:00Z', timed: true, currency: 'USD', title: 'Federal Funds Rate', impact: 'High', forecast: '4.00%', previous: '4.00%', actual: '3.75%' }] };
    R._newsWeek.load = async function () { return WEEK; };
    var fillOf = function (host) { var a = host.querySelector('#tv-attr-logo'); return a ? getComputedStyle(a).getPropertyValue('--fill').trim() : null; };

    // ======== Replay ========
    P._lv().mode = 'replay';
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 200 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    await W(1800); P._goto('11:30'); await W(800);
    var win = $('#stpr-win'), p0 = function () { return P._panes()[0]; }, S = P._s();
    ok('Replay is open', S && !S.live && S.day === '2026-10-01', S && S.day);
    if (phoneNow) { window.scrollTo(0, Math.round(window.scrollY + win.getBoundingClientRect().top)); for (k = 0; k < 30 && !win.classList.contains('ph-full'); k++) await W(100); await W(900); }
    var ts0 = p0().chart.timeScale(), vis0 = p0().bars.filter(function (b) { var x = ts0.timeToCoordinate(b.time); return x != null && x > 60 && x < p0().el.clientWidth - 120; }), B = vis0;
    P._news(rows(B[Math.floor(B.length * 0.3)].time, B[Math.floor(B.length * 0.8)].time)); for (k = 0; k < 20 && !(p0()._news && p0()._news.length >= 2); k++) { P._drawOv(0); await W(100); } await W(300);
    var H = (p0()._news || []).filter(function (h) { return h.n === 5; })[0];
    ok('five releases at one time: one flag per currency (USD, EUR), not five', H && H.spots.length === 2 && H.spots[0].ccy === 'USD' && H.spots[1].ccy === 'EUR', p0()._news);
    ok('the logo: ' + (LT ? 'dark on a light chart' : 'pale on a dark one'), fillOf(p0().el) === (LT ? '#131722' : '#D1D4DC'), fillOf(p0().el));
    // the slower speeds, the list opening upward when there is no room
    var menu = function () { return $('#stpr-menu'); }, inView = function (el) { var r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 0.5 && r.left >= 0 && r.right <= innerWidth + 0.5; };
    var noScroll = function () { var de = document.documentElement; return de.scrollHeight <= de.clientHeight + 1 && win.scrollHeight <= win.clientHeight + 1; };
    var until = async function (fn, ms) { var e = Date.now() + (ms || 3000); while (Date.now() < e) { if (fn()) return true; await W(80); } return !!fn(); };
    var wsh0 = win.scrollHeight;
    var spdBtn = phoneNow ? $('#stpr-speed') : $('[data-rpc="stpr-speed"]');
    spdBtn.click(); await W(200);
    var sp = Array.prototype.map.call(document.querySelectorAll('#stpr-menu [data-spd]'), function (b) { return b.querySelector('b').textContent; });
    ok('eight speeds, from 16x down to 0.1x', sp.join(' ') === '16× 8× 4× 2× 1× 0.5× 0.25× 0.1×', sp);
    ok('its list above its button, on the screen, the row\'s own', menu().getBoundingClientRect().bottom <= spdBtn.getBoundingClientRect().top && inView(menu()), [menu().getBoundingClientRect(), spdBtn.getBoundingClientRect()]);
    $('#stpr-menu [data-spd="7"]').click(); await W(150);
    ok('0.1x picked: saved, a candle every 10 seconds, shown on the button', P._cfg().speed === 7 && $('#stpr-speed').textContent === '0.1×', [P._cfg().speed, $('#stpr-speed').textContent]);
    $('#stpr-speed').click(); await W(150); $('#stpr-menu [data-spd="0"]').click(); await W(100);
    $('#stpr-goto').click(); await W(250);
    ok('Go to: above its button, on the screen, the page not grown', menu().classList.contains('show') && menu().getBoundingClientRect().bottom <= $('#stpr-goto').getBoundingClientRect().top && inView(menu()) && win.scrollHeight <= wsh0 + 1, [menu().getBoundingClientRect(), $('#stpr-goto').getBoundingClientRect(), win.scrollHeight, wsh0]);
    $('#stpr-goto').click(); await W(120);

    if (!phoneNow) {
      // the bottom row
      var foot = $('.plat-foot'), footH = foot.getBoundingClientRect().height, play2 = $('[data-rpc="stpr-play"]');
      ok('on the bottom row too: the day, back, play, forward, the speed', $('.pl-rpt .pl-rtd') && foot.contains(play2) && foot.contains($('[data-rpc="stpr-back"]')) && foot.contains($('[data-rpc="stpr-fwd"]')) && foot.contains($('[data-rpc="stpr-speed"]')) && $('.pl-rtdt').textContent === $('#stpr-dayt').textContent, $('.pl-rpt') && $('.pl-rpt').textContent);
      ok('...and still on top, this wide', $('.plat-top #stpr-play').getBoundingClientRect().width > 0, $('.plat-top #stpr-play').getBoundingClientRect());
      var hs = ['#stpr-today', '#stpr-restart', '#stpr-goto'].map(function (s) { return $('.pl-rpf ' + s).getBoundingClientRect().height; });
      ok('the bottom row\'s buttons a little bigger: 30 px in a 40 px row (they were 22 in 30)', footH === 40 && hs.every(function (h) { return h === 30; }), [footH, hs]);
      var fr = foot.getBoundingClientRect(), overflow = Array.prototype.filter.call(foot.querySelectorAll('.pl-rpt > *, #stpr-today, #stpr-ses, #stpr-goto'), function (e) { var r = e.getBoundingClientRect(); return r.width && (r.left < fr.left - 0.5 || r.right > fr.right + 0.5); });
      ok('all of it inside the row', !overflow.length, overflow.map(function (e) { return e.id || e.className; }));
      var n0 = P._s().now; $('[data-rpc="stpr-back"]').click(); await W(200);
      ok('its back button steps the replay', P._s().now < n0, [n0, P._s().now]);
      play2.click(); await W(200);
      ok('its play button plays, both buttons say Pause', P._s().playing && /Pause|Pausa/.test(play2.textContent) && /Pause|Pausa/.test($('#stpr-play').textContent), [P._s().playing, play2.textContent, $('#stpr-play').textContent]);
      play2.click(); await W(200);
      ok('...and pauses', !P._s().playing);

      // full screen: the whole screen, no page scroll, the menu upward
      $('#stpr-max').click(); await W(700);
      ok('full screen: the window fills the screen (the tab\'s height does not stay on it)', Math.abs(win.getBoundingClientRect().height - innerHeight) <= 1 && Math.abs(win.getBoundingClientRect().top) <= 1, [win.getBoundingClientRect(), innerHeight, win.style.cssText]);
      $('#stpr-goto').click(); await W(250);
      ok('full screen, Go to: upward, on the screen, no page scroll', menu().getBoundingClientRect().bottom <= $('#stpr-goto').getBoundingClientRect().top && inView(menu()) && noScroll(), [menu().getBoundingClientRect(), win.scrollHeight, win.clientHeight, document.documentElement.scrollHeight]);
      $('#stpr-goto').click(); await W(100); $('#stpr-sesed').click(); await W(200);
      ok('full screen, the session times: on the screen too', inView(menu()) && noScroll(), menu().getBoundingClientRect());
      $('#stpr-sesed').click(); await W(100);
      $('#stpr-max').click(); await W(500);
      // the top bar with no room: the playback goes from there first, the bottom row keeps it (a narrow window)
      win.classList.add('pt5'); await W(60);
      ok('no room on top: the playback is off the top bar, kept on the bottom row', $('.plat-top .pl-rpp').getBoundingClientRect().width === 0 && play2.getBoundingClientRect().width > 0, [$('.plat-top .pl-rpp').getBoundingClientRect().width, play2.getBoundingClientRect().width]);
      win.classList.remove('pt5'); await W(30);
    }

    // the news button: two options
    var nb = $('#stpr-newsbtn'); if (phoneNow) try { nb.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {}
    ok('a news button in reach', nb && nb.getBoundingClientRect().width > 0, nb && nb.getBoundingClientRect());
    nb.click(); await W(200);
    var sw = $('#stpr-newsshow'), wk = $('#stpr-menu [data-nwopen]');
    ok('the news button opens two options: Show news on chart, Open news this week', menu().classList.contains('show') && sw && sw.checked && wk && /Show news on chart/.test(menu().textContent) && /Open news this week/.test(menu().textContent), menu().textContent);
    sw.click(); await W(100); P._drawOv(0); await W(100);
    ok('flags off: none on the chart, the menu still open, saved for this chart', !(p0()._news || []).length && menu().classList.contains('show') && P._cfg().showPer && P._cfg().showPer[0].news === false && !nb.classList.contains('on'), [(p0()._news || []).length, P._cfg().showPer]);
    sw = $('#stpr-newsshow'); sw.click(); await W(100); P._drawOv(0); await W(100);
    ok('flags on again', (p0()._news || []).length >= 1 && nb.classList.contains('on'), (p0()._news || []).length);
    $('#stpr-menu [data-nwopen]').click(); await W(500);
    var nx = $('.stpr-news'), nr = nx && nx.getBoundingClientRect(), cw = (nx && nx.parentNode).getBoundingClientRect();
    ok('News this week opens over the charts', nx && !menu().classList.contains('show') && Math.abs(nr.width - cw.width) <= 1 && Math.abs(nr.height - cw.height) <= 1 && nx.contains(document.elementFromPoint(nr.left + nr.width / 2, nr.top + nr.height / 2)), nr);
    ok('its rows, the week\'s range; on Replay a figure not out by the replay\'s moment stays hidden', /German Prelim CPI/.test(nx.textContent) && /-0\.2%/.test(nx.textContent) && !/3\.75%/.test(nx.textContent) && /2026-09-28/.test(nx.querySelector('.strp-newsweek').textContent), nx.textContent);
    nx.querySelector('[data-nwx]').click(); await W(100);
    ok('the X closes it', !$('.stpr-news'));
    // Spanish
    window.__setAppLang('es'); await W(300);
    nb.click(); await W(200);
    ok('in Spanish: both options', /Mostrar noticias en el gráfico/.test(menu().textContent) && /Abrir noticias de la semana/.test(menu().textContent), menu().textContent);
    nb.click(); await W(100);
    var es0 = typeof getEventTitle === 'function' ? getEventTitle('Federal Funds Rate') : null, dv = document.createElement('div'); R._newsWeek.render(dv, WEEK, {});
    ok('event names through the calendar\'s names, in Spanish too', es0 && es0 !== 'Federal Funds Rate' && dv.textContent.indexOf(es0) >= 0, [es0, dv.textContent.slice(0, 200)]);
    window.__setAppLang('en'); await W(300);
    // two labels that would land on each other: stacked, whichever levels they are
    var st = P._dwmStack([{ x: 9, y: 100, ls: ['PWL 222.2'] }, { x: 9, y: 100.4, ls: ['PML 222.2'] }, { x: 9, y: 300, ls: ['PDH 56.4'] }, { x: 9, y: 306, ls: ['PDL 56.4', 'PWL 80'] }], 12);
    ok('level labels on one spot: one above the other, not on each other; a label alone stays on its line', st[0].top + 12 <= st[1].top + 0.01 && Math.abs((st[0].top + st[1].top + 12) / 2 - 100.2) < 0.5 && st[2].top + 12 <= st[3].top + 0.01, st.map(function (l) { return l.top; }));
    var st1 = P._dwmStack([{ x: 9, y: 100, ls: ['PWL 222.2'] }], 12);
    ok('...one label alone: centred on its line', Math.abs(st1[0].top + 6 - 100) < 0.01, st1[0].top);
    // the chart: two levels forced onto one price, what is written where
    if (!phoneNow) {
      C.showPer = Object.assign({}, C.showPer); C.showPer[0] = Object.assign({}, C.showPer[0], { mini: true }); var seen = [], CP = CanvasRenderingContext2D.prototype, ft = CP.fillText;
      await until(function () { P._drawOv(0); var q0 = P._mini(0); return q0 && q0.dwm && q0.dwm.w && q0.dwm.m && q0.dwm.d; }, 8000); await W(800);
      var q = P._mini(0), s0 = p0().series, pAt = function (y) { return s0.coordinateToPrice(y); }, lv = pAt(300); if (q && q.dwm && q.dwm.w && q.dwm.m) { q.dwm.w.lo = lv; q.dwm.m.lo = lv; q.dwm.w.hi = pAt(100); q.dwm.m.hi = pAt(60); if (q.dwm.d) { q.dwm.d.lo = pAt(380); q.dwm.d.hi = pAt(140); } }   // last week's and last month's low on one price, the day's elsewhere: his 608
      CP.fillText = function (t, x, y) { if (/^P[DWM][HL]/.test(String(t))) seen.push([String(t), Math.round(x), y]); return ft.apply(this, arguments); };
      for (k = 0; k < 15 && seen.length < 2; k++) { P._drawOv(0); await W(120); } seen = seen.slice(-8); CP.fillText = ft; C.showPer[0].mini = false; P._drawOv(0);
      var seen2 = seen.filter(function (a, ix) { return seen.findIndex(function (b) { return b[0] === a[0]; }) === ix; }), clash = seen2.filter(function (a, ia) { return seen2.some(function (b, ib) { return ib !== ia && Math.abs(a[1] - b[1]) < 80 && Math.abs(a[2] - b[2]) < 9; }); });
      ok('on the chart: no two level labels on each other', seen2.length >= 2 && !clash.length, seen2);
    }

    // ======== Trade Replay ========
    P._close && 0;
    var trade = { mt5Ticket: 999999904, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 };
    R.open(trade); for (k = 0; k < 150 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(1500);
    var T = R._s(), tc = $('#strp-chart'), bar = function (n) { return T.bars[Math.max(0, T.cursor - n)].time; };
    T.spread = T.spread || {}; T.bars.forEach(function (b) { T.spread[b.time] = 0.1; }); $('#strp-spread').style.display = '';
    R._newsSet(rows(bar(30), bar(10))); for (k = 0; k < 30 && !(T._newsHit && T._newsHit.length); k++) await W(100); await W(300);
    var TH = (T._newsHit || []).filter(function (h) { return h.n === 5; })[0];
    ok('Trade Replay: the same flags - one per currency, the rest in the card', TH && TH.spots.length === 2 && TH.spots[0].ccy === 'USD', (T._newsHit || []).map(function (h) { return [h.n, h.spots]; }));
    ok('Trade Replay: the logo ' + (LT ? 'dark on a light chart' : 'pale on a dark one'), fillOf(tc) === (LT ? '#131722' : '#D1D4DC'), fillOf(tc));
    ok('Trade Replay: the spread crisp on a light chart (no glow), as on the others', !LT || getComputedStyle($('#strp-spread')).textShadow === 'none', getComputedStyle($('#strp-spread')).textShadow);
    if (!phoneNow) {
      var cx = $('#strp-close svg'), fs = $('#strp-fs svg');
      ok('Trade Replay: the close X drawn at its neighbours\' size', cx && fs && cx.getBoundingClientRect().width === fs.getBoundingClientRect().width && cx.getBoundingClientRect().width >= 16, cx && [cx.getBoundingClientRect().width, fs.getBoundingClientRect().width]);
      var tr = tc.getBoundingClientRect(), sx = TH.spots[0].x, tgt = document.elementFromPoint(tr.left + sx, tr.top + TH.y);
      tgt.dispatchEvent(new MouseEvent('mousemove', { clientX: tr.left + sx, clientY: tr.top + TH.y, bubbles: true })); await W(250);
      var card = $('#strp-newscard');
      ok('Trade Replay: over a flag, the card, that flag\'s currency first', card.style.display === 'block' && card.querySelectorAll('.strp-nc-item').length === 5 && /USD/.test(card.querySelector('.strp-nc-item').textContent), card.textContent.slice(0, 120));
      R._newsCard(null);
    }
    if (!phoneNow) {   // the playback on its bottom row too
      var rp = $('.strp-plrpt'), rr = $('#strp-ct').getBoundingClientRect(), rpp = $('[data-rrc="strp-play"]');
      ok('Trade Replay: back, play, forward and the speed on the bottom row too, the row as Replay\'s', rp && $('#strp-ct').contains(rp) && rr.height === 40 && rpp.getBoundingClientRect().height === 30 && $('[data-rrc="strp-spdcur"]').textContent === $('#strp-spdcur').textContent, rp && [rp.textContent, rr.height]);
      rpp.click(); await W(200); ok('...its play button plays', R._s().playing && /Pause|Pausa/.test(rpp.textContent), rpp.textContent); rpp.click(); await W(150);
      $('[data-rrc="strp-spdcur"]').click(); await W(200); var tm0 = $('#strp-menu');
      ok('...its speed list upward, on the screen', tm0.classList.contains('show') && tm0.getBoundingClientRect().bottom <= $('[data-rrc="strp-spdcur"]').getBoundingClientRect().top && inView(tm0), tm0.getBoundingClientRect());
      $('#strp-menu [data-rrms="4000"]').click(); await W(150);
      ok('...0.25x picked: both buttons say it, the replay runs at it', R._s().ms === 4000 && $('[data-rrc="strp-spdcur"]').textContent === '0.25×' && $('#strp-spdcur').textContent === '0.25×', [R._s().ms, $('#strp-spdcur').textContent]);
    }
    var sl = Array.prototype.map.call(document.querySelectorAll('#strp-spdmenu button b'), function (b) { return b.textContent; }).join(' ');
    ok('Trade Replay: the same eight speeds', sl === '16× 8× 4× 2× 1× 0.5× 0.25× 0.1×', sl);
    var tn = $('#strp-newsbtn'), tm = $('#strp-menu'); tn.click(); await W(200);
    ok('Trade Replay: the news button opens the same two options', tm.classList.contains('show') && $('#strp-newsshow') && /Open news this week/.test(tm.textContent), tm.textContent);
    $('#strp-newsshow').click(); await until(function () { return !(T._newsHit || []).length; });
    ok('Trade Replay: flags off: none on the chart', !(T._newsHit || []).length, (T._newsHit || []).length);
    $('#strp-newsshow').click(); await until(function () { return (T._newsHit || []).length >= 1; });
    ok('Trade Replay: flags on again', (T._newsHit || []).length >= 1, (T._newsHit || []).length);
    $('#strp-menu [data-nwopen]').click(); await W(600);
    ok('Trade Replay: News this week opens', $('#strp-news').classList.contains('on') && !tm.classList.contains('show'));
    $('#strp-newsx').click(); await W(100);
    R.close(); await W(200);
    ok('no errors', !errs.length, errs.slice(0, 5));
  } catch (e) { ok('the test ran to the end', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
