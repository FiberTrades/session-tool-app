// End-to-end test: Replay on the Charts platform (26 Oct 2026, Nestor: "i am guessing trade replay will also adopt the new improved look
// of the charts correct?"). Replay in the Charts tab on a computer is laid out as Live's platform: its day and playback in the top bar with
// Live to go back, the sessions, the progress bar and Go to along the bottom, the Trade Manager as the PRACTICE ticket, the practice trades
// under the charts. Signed out, over the real shared candles of Thu 1 Oct 2026; nothing goes to MT5. On a phone's screen (27 Oct 2026)
// Replay takes the phone platform: REPLAY in the bottom toolbar, the playback bar over the practice trade's, the ticket in the sheet.
//   python tests/replay_plat_run.py      (a computer dark and light, then a phone dark and light)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    window.__stPlatOff = false; window.__stLcForce = true;
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var P = window.__stPractice, LT = !!window.__RP_LT, phoneNow = innerWidth < 760, $ = function (s) { return document.querySelector(s); };
    P._lv().mode = 'replay';
    try { var C = P._cfg(); C.layout = 1; C.syms = []; C.mini = false; C.look = {}; delete C.lookDk; delete C.lookTh; C.plLt = !!(phoneNow && LT); C.resume = { sym: 'EURUSD', day: '2026-10-01', now: 0, at: Date.now() }; C.speed = 0; C.mm.on = true; C.mm.maxDay = 0; } catch (e) {}
    try { localStorage.removeItem('st_plat'); } catch (e) {}
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 200 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    await W(1800);
    var win = $('#stpr-win'), S = P._s();
    ok('Replay is open in the Charts tab, on the day asked for', S && !S.live && S.day === '2026-10-01' && win.classList.contains('lcp'), S && [S.day, win.className]);

    if (phoneNow) {   // ---- a phone: the phone platform, Replay's (27 Oct 2026) ----
      var vis0 = function (el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
      var onScr = function (el) { if (!vis0(el)) return false; var r = el.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1; };
      ok('a phone: the phone platform, Replay\'s, as a page first (as Live)', P._plat().on && win.classList.contains('plph') && win.classList.contains('pl-replay') && !win.classList.contains('ph-full'), win.className);
      window.scrollTo(0, Math.round(window.scrollY + win.getBoundingClientRect().top)); for (var k2 = 0; k2 < 30 && !win.classList.contains('ph-full'); k2++) await W(100); await W(700);
      var wr = win.getBoundingClientRect();
      ok('scrolled to it: Replay fills the screen', win.classList.contains('ph-full') && Math.abs(wr.width - innerWidth) < 2 && Math.abs(wr.height - innerHeight) < 2 && Math.abs(wr.top) < 1, [win.className, Math.round(wr.top), Math.round(wr.width), Math.round(wr.height)]);
      var bar = ['.ph-live', '.ph-bar #stpr-sym', '.ph-tf', '.ph-icons #stpr-drawbtn', '.ph-icons #stpr-undo', '.ph-icons #stpr-redo'];
      ok('no Chat in the toolbar in Replay (as on a computer)', !vis0($('.ph-chb')));
      ok('the bottom toolbar: REPLAY (no logo since 29 Oct 2026), the symbol, the timeframe, draw, undo, redo - on screen (the rest a swipe away)', bar.every(function (s) { return onScr($(s)); }) && /REPLAY/.test($('.ph-live').textContent), bar.filter(function (s) { return !onScr($(s)); }));
      // swiped sideways (29 Oct 2026): Replay's as on a computer - Positions & History (the practice trades) and the Object tree, no Today or Watchlist
      var phb = $('.ph-bar'); phb.scrollLeft = phb.scrollWidth; await W(400);
      ok('...swiped to the end: Positions & History and the Object tree on screen, no Today, no Watchlist', onScr($('.ph-icons [data-phpn="tb"]')) && onScr($('.ph-icons [data-phpn="ot"]')) && !vis0($('.ph-icons [data-phpn="td"]')) && !vis0($('.ph-icons [data-phpn="wl"]')) && onScr($('.ph-icons #stpr-lookbtn')) && phb.classList.contains('ph-fl'), phb.className);
      $('.ph-icons [data-phpn="tb"]').click(); await W(500);
      ok('...Positions & History: the practice trades in a sheet (Positions, History), no Replay log button', win.classList.contains('ph-pnon') && /Practice/.test($('.ph-pnl .ph-chh').textContent) && $('.ph-tbx [data-pltab="pos"]') && $('.ph-tbx [data-pltab="hist"]') && !vis0($('.ph-tbx [data-plra="log"]')) && onScr($('.ph-pnl .ph-chh')), $('.ph-pnl').textContent.slice(0, 120));
      $('[data-phpnx]').click(); await W(300); phb.scrollLeft = 0; await W(200);
      var rr = ['.ph-rpr #stpr-daybtn', '.ph-rpr #stpr-back', '.ph-rpr #stpr-play', '.ph-rpr #stpr-fwd', '.ph-rpr #stpr-speed', '.ph-rpr #stpr-goto'];
      ok('over the trade\'s bar: the day, back, Play, step, the speed and Go to, all on screen', rr.every(function (s) { return onScr($(s)); }), rr.filter(function (s) { return !onScr($(s)); }));
      ok('under them: back to the open, the three sessions, Today; the progress bar along the top edge', vis0($('.ph-rps #stpr-ses')) && $('.ph-rps #stpr-ses').querySelectorAll('[data-ses]').length === 3 && vis0($('.ph-rps #stpr-today')) && vis0($('.ph-rpk .stpr-track')));
      var cwr = $('#stpr-cw').getBoundingClientRect();
      ok('the chart has most of the screen', cwr.height > innerHeight * 0.55, Math.round(cwr.height));
      ok('the chart\'s legend says Replay; the pill says Practice', /· Replay$/.test(($('#stpr-grid .pl-nm') || {}).textContent || '') && /Practice/.test(($('.ph-pill') || {}).textContent || ''), [($('#stpr-grid .pl-nm') || {}).textContent, ($('.ph-pill') || {}).textContent]);
      var p0 = P._s().now; $('#stpr-fwd').click(); await W(200);
      ok('step moves the replay on', P._s().now > p0);
      $('#stpr-play').click(); await W(700); ok('Play plays', P._s().playing === true); $('#stpr-play').click(); await W(200); ok('and pauses', !P._s().playing);
      $('.ph-go').click(); for (var q8 = 0; q8 < 25 && !(win.classList.contains('ph-open') && onScr($('.ph-sheet .pl-mh'))); q8++) await W(100);
      ok('Execute opens the sheet with the practice ticket', win.classList.contains('ph-open') && /PRACTICE/.test(($('.ph-sheet .pl-mh') || {}).textContent || ''), ($('.ph-sheet .pl-mh') || {}).textContent);
      $('.ph-grab').click(); await W(500);
      P._place(-1); await W(500);
      ok('a practice sell shows under the chart, Execute waits', /SELL/.test($('.ph-trade').textContent) && $('.ph-go').disabled, $('.ph-trade').textContent);
      $('.ph-sum').click(); var cb = null; for (var q9 = 0; q9 < 25; q9++) { await W(100); cb = $('.ph-sheet [data-plra="close"]'); if (win.classList.contains('ph-open') && cb && onScr(cb)) break; }   // after the sheet's slide
      ok('tap it: the sheet with the trade and Close', win.classList.contains('ph-open') && cb && onScr(cb), [win.classList.contains('ph-open'), !!cb, cb && JSON.stringify(cb.getBoundingClientRect()), ($('.ph-pos') || {}).innerHTML && $('.ph-pos').innerHTML.slice(0, 160)]);
      cb.click(); await W(500);
      ok('Close closes it', !P._s().pos && P._s().trades.length >= 1);
      $('.ph-grab').click(); await W(400);
      $('.ph-live').click(); await W(300);
      var ask = $('#lc-ask-bg');
      ok('REPLAY: tap to go back to Live, asking first', ask && /Live/.test(ask.textContent));
      if (ask) { ask.querySelector('[data-lca="0"]').click(); await W(300); }
      ok('Stay: still Replay', !!P._s() && !P._s().live && win.classList.contains('pl-replay'));
      window.__stPlatOff = true; P._platSync(); await W(400);
      ok('off: Replay as it was, every part back', !win.classList.contains('plph') && !!$('.stpr-cb #stpr-play') && !!$('.stpr-tb:not(.stpr-tb2) #stpr-daybtn') && !!$('.stpr-cb .stpr-track'));
      window.__stPlatOff = false; P._platSync(); await W(500);
      ok('on again', win.classList.contains('plph') && !!$('.ph-rpr #stpr-play'));
      ok('no errors', !errs.length, errs);
      return JSON.stringify(out);
    }

    // ---- the frame ----
    ok('a computer: the platform, in Replay', P._plat().on && win.classList.contains('plat') && win.classList.contains('pl-replay'), win.className);
    var vis = function (el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    ok('the old header, day row, trade row and playback bar are gone', ['.stpr-hd', '.stpr-tb:not(.stpr-tb2)', '#stpr-tr', '.stpr-cb'].every(function (s) { return !vis($(s)); }));
    var top = $('.plat-top'), tr = top.getBoundingClientRect(), inTop = function (s) { var el = $(s); return !!el && top.contains(el) && vis(el); };
    ok('the top bar: the symbol, the timeframes, the Session Indicator, the day, back / Play / step / speed, Live',
      ['#stpr-sym', '.pl-tfs', '.pl-si', '#stpr-daybtn', '#stpr-back', '#stpr-play', '#stpr-fwd', '#stpr-speed', '#stpr-lvback'].every(inTop),
      ['#stpr-sym', '.pl-tfs', '.pl-si', '#stpr-daybtn', '#stpr-back', '#stpr-play', '#stpr-fwd', '#stpr-speed', '#stpr-lvback'].filter(function (s) { return !inTop(s); }));
    var order = ['#stpr-sym', '.pl-tfs', '.pl-si', '#stpr-daybtn', '#stpr-play', '#stpr-lvback'].map(function (s) { return $(s).getBoundingClientRect().left; });
    ok('in that order, left to right', order.every(function (x, j) { return !j || x > order[j - 1]; }), order.map(Math.round));
    var over = []; Array.prototype.forEach.call(top.querySelectorAll('*'), function (e) { var r = e.getBoundingClientRect(); if (r.width && r.height && e.closest('.stpr-menu, .stpr-tfl, [role="menu"]') == null && (r.right > tr.right + 1 || r.left < tr.left - 1)) over.push(e.id || e.className); });
    ok('nothing in the top bar runs past it', !over.length, over.slice(0, 6));
    var liveOnly = ['.plat-top .pl-rp', '.pl-plan', '.pl-rg', '.pl-wl', '.plat-rail [data-plr="wl"]', '.plat-rail [data-plr="ch"]', '.plat-rail [data-plr="td"]'];
    ok('Live\'s own are not in Replay: Replay, Check my plan, the range buttons, the Watchlist, Chat, Today', liveOnly.every(function (s) { return !vis($(s)); }), liveOnly.filter(function (s) { return vis($(s)); }));
    var foot = $('.plat-foot'), inFoot = function (s) { var el = $(s); return !!el && foot.contains(el) && vis(el); };
    ok('along the bottom: Today, back to the open, the sessions, the progress bar, Go to', ['#stpr-today', '#stpr-restart', '#stpr-ses', '.plat-foot .stpr-track', '#stpr-goto'].every(inFoot) && $('#stpr-ses').querySelectorAll('[data-ses]').length === 3,
      ['#stpr-today', '#stpr-restart', '#stpr-ses', '.plat-foot .stpr-track', '#stpr-goto'].filter(function (s) { return !inFoot(s); }));
    ok('the drawing tools down the left', !!$('.plat-left #stpr-tools') && vis($('.plat-left #stpr-tools')));
    var nm = $('#stpr-grid .pl-nm');
    ok('the chart\'s legend: its name, timeframe and Replay', nm && /^Euro \/ U\.S\. Dollar · \d+ · Replay$/.test(nm.textContent), nm && nm.textContent);

    // ---- the practice ticket ----
    var mm = $('#stpr-mm'), mh = mm && mm.querySelector('.pl-mh');
    ok('the Trade Manager on the right, the practice ticket: PRACTICE in pink', mm && $('.plat-right').contains(mm) && vis(mm) && mh && /PRACTICE/.test(mh.textContent) && getComputedStyle(mh.querySelector('.pl-prac')).color === 'rgb(244, 114, 182)', mh && mh.textContent);
    var q1 = mm.querySelector('.pl-qs'), q2 = mm.querySelector('.pl-qb'), spr = mm.querySelector('.pl-spr'), pxNow = function () { var c = null, s = P._s(); for (var j = 0; j < s.base.length && s.base[j].time < s.now; j++) c = s.base[j].close; return c == null ? s.base[0].open : c; };
    ok('its prices are the replay\'s, its line says nothing goes to MT5', q1 && Math.abs(+q1.textContent - pxNow()) < 1e-9 && +q2.textContent === +q1.textContent && /nothing is sent to MT5/.test(spr.textContent), [q1 && q1.textContent, pxNow(), spr && spr.textContent]);
    ok('no account picker, no Setup, no order rules on it', !mm.querySelector('.stpr-mm-acc, [data-mm="acct"], .pl-pick, .pl-lks, .pl-brk'));
    var ex = mm.querySelector('[data-mm="exec"]'); ex.click(); await W(120);
    ok('Execute arms the replay\'s execution', P._s().exec === true && mm.querySelector('[data-mm="exec"]').classList.contains('on'));
    mm.querySelector('[data-mm="exec"]').click(); await W(120);
    ok('and again disarms it', !P._s().exec);

    // ---- playback from the top bar ----
    var n0 = P._s().now; $('#stpr-fwd').click(); await W(200);
    ok('step forward moves the replay on', P._s().now > n0, [n0, P._s().now]);
    $('#stpr-play').click(); await W(900);
    ok('Play plays, its button says Pause', P._s().playing === true && /Pause/.test($('#stpr-play').textContent), $('#stpr-play').textContent);
    $('#stpr-play').click(); await W(200);
    ok('and pauses', !P._s().playing);
    var sp0 = $('#stpr-speed').textContent; $('#stpr-speed').click(); await W(150);
    ok('the speed button changes the speed', $('#stpr-speed').textContent !== sp0, [sp0, $('#stpr-speed').textContent]);
    $('#stpr-speed').click(); for (var z = 0; z < 8 && P._cfg().speed; z++) { $('#stpr-speed').click(); await W(60); }
    var lon = $('#stpr-ses [data-ses="london"]'); lon.click(); await W(1500);
    var sesAt = (P._s().f.ses.filter(function (x) { return x.id === 'london'; })[0] || {}).at;
    ok('a session along the bottom jumps there', sesAt && P._s().now >= sesAt && $('#stpr-ses [data-ses="london"]').classList.contains('on'), [P._s().now, sesAt]);
    ok('Go to shows the replay\'s time', /^\d\d:\d\d$/.test($('#stpr-gotot').textContent.trim()), $('#stpr-gotot').textContent);
    var ti = parseFloat($('#stpr-ti').style.width);
    ok('the progress bar shows where the day is', ti > 5 && ti < 95, ti);

    // ---- the practice trades under the charts ----
    var tb = $('#lc-tb');
    ok('Positions under the charts', vis(tb) && win.contains(tb) && /Positions/.test(tb.textContent) && /No practice trade open/.test(tb.textContent), tb && tb.textContent.slice(0, 120));
    P._place(1); await W(500);
    var row = tb.querySelector('.pl-t tr:nth-child(2)');
    ok('a practice buy shows in Positions: the symbol, BUY, its entry, a Close button', row && /EURUSD/.test(row.textContent) && /BUY/.test(row.textContent) && row.querySelector('[data-plra="close"]') && tb.querySelector('[data-pltab="pos"] i').textContent === '1', row && row.textContent);
    $('#stpr-fwd').click(); await W(250); $('#stpr-fwd').click(); await W(400);
    tb.querySelector('[data-plra="close"]').click(); await W(500);
    ok('Close closes it', !P._s().pos && P._s().trades.length === 1);
    tb.querySelector('[data-pltab="hist"]').click(); await W(300);
    var hr = tb.querySelector('.pl-t tr:nth-child(2)'), t0 = P._s().trades[0];
    ok('History has it: its times, BUY, By hand, its R', hr && /BUY/.test(hr.textContent) && /By hand/.test(hr.textContent) && hr.textContent.indexOf(Math.abs(t0.r).toFixed(2) + 'R') >= 0, hr && hr.textContent);
    ok('the day\'s result on the right of the tabs', /This day/.test(tb.querySelector('.pl-sum').textContent) && /Trades\s*1/.test(tb.querySelector('.pl-sum').textContent), tb.querySelector('.pl-sum').textContent);
    tb.querySelector('[data-plra="log"]').click(); await W(400);
    var lg = $('#stpr-log'), lr = lg.getBoundingClientRect();
    ok('Replay log opens over the charts, under the top bar', win.classList.contains('logv') && vis(lg) && lr.top >= top.getBoundingClientRect().bottom - 1, [win.classList.contains('logv'), Math.round(lr.top)]);
    tb.querySelector('[data-plra="log"]').click(); await W(300);
    ok('and closes', !win.classList.contains('logv'));
    tb.querySelector('[data-pltab="pos"]').click(); await W(200);

    // ---- the rail ----
    var rtm = $('.plat-rail [data-plr="tm"]'); rtm.click(); await W(300);
    ok('the rail\'s Trade Manager icon folds the ticket away', !vis(mm) && win.classList.contains('pl-nor'));
    rtm.click(); await W(300);
    ok('and brings it back', vis(mm) && !win.classList.contains('pl-nor'));

    // ---- the theme, and the light screenshot's state ----
    var th = $('.plat-top [data-pltheme]'); th.click(); await W(500);
    ok('the sun: the light theme, the chart light too', win.classList.contains('pl-lt') && getComputedStyle(top).backgroundColor === 'rgb(255, 255, 255)', getComputedStyle(top).backgroundColor);
    if (!LT) { th.click(); await W(500); ok('the moon: dark again', !win.classList.contains('pl-lt')); }

    // ---- full screen ----
    $('#stpr-max').click(); await W(700);
    ok('full screen keeps the platform, Replay\'s', P._lv().max && win.classList.contains('plat') && win.classList.contains('pl-replay') && Math.abs(win.getBoundingClientRect().width - innerWidth) < 4, [P._lv().max, win.className]);
    $('#stpr-max').click(); await W(700);
    ok('and back in the tab', !P._lv().max && win.classList.contains('pl-replay') && !!win.closest('#lc-host'));

    // ---- the platform off: everything back where Replay had it ----
    window.__stPlatOff = true; P._platSync(); await W(300);
    ok('off: Play, step and the speed back in the bar under the chart', !!$('.stpr-cb #stpr-play') && !!$('.stpr-cb #stpr-fwd') && !!$('.stpr-cb #stpr-speed') && !!$('.stpr-cb .stpr-track') && vis($('#stpr-play')));
    ok('off: the day, Today, the sessions and Go to back in their row, Live in the header', !!$('.stpr-tb:not(.stpr-tb2) #stpr-daybtn') && !!$('.stpr-tb:not(.stpr-tb2) #stpr-today') && !!$('.stpr-tb:not(.stpr-tb2) #stpr-ses') && !!$('.stpr-tb:not(.stpr-tb2) #stpr-goto') && !!$('.stpr-hd #stpr-lvback'));
    ok('off: the panel back as it was, not the platform\'s ticket', !mm.classList.contains('pl-mm') && !mm.querySelector('.pl-mh'));
    window.__stPlatOff = false; P._platSync(); await W(400); P._render && P._render(); await W(300);
    ok('on again: the platform, Replay\'s', win.classList.contains('pl-replay') && inTop('#stpr-play') && inFoot('#stpr-goto') && !!mm.querySelector('.pl-prac'));
    if (LT && !win.classList.contains('pl-lt')) { $('.plat-top [data-pltheme]').click(); await W(500); }
    try { var tro = document.querySelector('.tab[data-page="livecharts"]').closest('.tabs'); window.scrollTo(0, window.scrollY + win.getBoundingClientRect().top - tro.getBoundingClientRect().bottom - 8); } catch (e) {}   // the screenshot: as the tab opens it
    await W(400);
    ok('no errors', !errs.length, errs);
  } catch (e) { ok('the test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
