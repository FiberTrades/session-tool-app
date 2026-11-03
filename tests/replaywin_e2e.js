// End-to-end test in real windows (3 Nov 2026, Nestor: "all the opened live charts can turn into replay charts then go back to live charts when switching
// from replay to live again and leave the windows where they were, dont change charts into the app etc."): Live Charts' own window and two chart windows
// turn into Replay where they are and back, their controls work there, and nothing can reach a live account while in Replay.
//   python tests/replaywin_run.py
(function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var P, LC, T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000, cw = null, cw2 = null, satW = null, orders = 0, tfs0, syms0, geo0, dr0 = 0;
  function part(fn) { return async function () { var res = [], check = function (name, cond, got) { res.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
    try { await fn(check); } catch (e) { res.push({ name: 'the part ran to the end', ok: false, got: String(e && e.stack || e) }); } return JSON.stringify(res); }; }
  var shown = function (el) { if (!el) return false; var r = el.getBoundingClientRect(), v = el.ownerDocument.defaultView; return r.width > 0 && r.height > 0 && v.getComputedStyle(el).display !== 'none'; };
  var inside = function (el) { var r = el.getBoundingClientRect(), v = el.ownerDocument.defaultView; return r.left >= 0 && r.top >= 0 && r.right <= v.innerWidth + .5 && r.bottom <= v.innerHeight + .5; };
  var geo = function () { return [satW, cw, cw2].map(function (w) { return [w.screenX, w.screenY, w.outerWidth, w.outerHeight]; }); };
  var inPlace = function () { var a = P._panes(); return a.length === 3 && !satW.closed && !cw.closed && !cw2.closed && P._stage().on && a[0].el.ownerDocument === satW.document && a[1].el.ownerDocument === cw.document && a[2].el.ownerDocument === cw2.document && a[0].n > 0 && a[1].n > 0 && a[2].n > 0 && P._pops()[1].w === cw && P._pops()[2].w === cw2; };
  var syms = function () { return P._panes().map(function (p) { return P._ps(p).sym.raw; }); };
  var ask = function (d) { return d.getElementById('lc-ask-bg'); };
  function key(d, v, k, code) { d.body.dispatchEvent(new v.KeyboardEvent('keydown', { key: k, code: code || k, bubbles: true, cancelable: true })); }
  async function waitLive() { for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].n); k++) await W(250); }
  async function waitReplay() { for (var k = 0; k < 160 && !(P._s() && !P._s().live && P._panes().length === 3 && P._panes().every(function (p) { return p.n > 0; })); k++) await W(150); await W(1200); }

  window.__RW = {
    setup: part(async function (check) {
      for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB); i0++) await W(100);
      await W(800);
      P = window.__stPractice; LC = window.__stLC;
      P._lvClock(T0 * 1000 - Date.now()); window.isSessionLive = function () { return true; };
      window.__stPlatOff = false; window.__stLcForce = true; await W(1200);
      document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
      window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
      var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15, 60, 240, 5]; C.syms = []; C.mini = false; C.showPer = {}; C.resume = null; delete C.lookDk; C.look = {};
      try { localStorage.removeItem('st_plat'); localStorage.removeItem('st_chartwins_v1'); } catch (e) {}
      var acc0 = (data.accounts || [])[0] || {};
      data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-w', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
      data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-w' });
      document.querySelector('.tab[data-page="livecharts"]').click();
      await waitLive(); await W(1200);
      await P._layout(3); for (var k = 0; k < 60 && !(P._panes().length === 3 && P._panes()[2].n); k++) await W(150);
      cw = P._pop(1); for (k = 0; k < 100 && !(P._pops()[1] && P._pops()[1].ready && P._panes()[1].n > 10 && P._panes()[1].el.ownerDocument !== document); k++) await W(150);
      cw2 = P._pop(2); for (k = 0; k < 100 && !(P._pops()[2] && P._pops()[2].ready && P._panes()[2].n > 10 && P._panes()[2].el.ownerDocument !== document); k++) await W(150);
      var wo = window.open; window.open = function (u, n, f) { satW = wo.call(window, u, n, f); return satW; }; P._lcPop(); window.open = wo;
      for (k = 0; k < 140 && !(P._stage().on && satW && P._panes()[0].el.ownerDocument === satW.document && P._panes()[0].n > 30); k++) await W(150);
      for (k = 0; k < 80 && satW.innerWidth < 1024; k++) await W(150);
      await W(1800);
      check('Live: Live Charts\' own window and two chart windows, each drawing its chart', inPlace(), [P._stage(), Object.keys(P._pops())]);
      // a drawing on Live, to find again on the way back
      var DW = P._dr(); P._quick('hline'); await W(500);
      dr0 = DW.list.length; tfs0 = JSON.stringify(P._cfg().tfs); syms0 = JSON.stringify(syms()); geo0 = JSON.stringify(geo());
      window.__stTM.__acct0 = window.__stTM.acct; window.__stTM.acct = function () { orders++; return Promise.resolve({ ok: false, why: 'test' }); };
      check('...a drawing on the chart', dr0 >= 1, dr0);
    }),

    toReplay: part(async function (check) {
      var d = satW.document;
      check('Live: Replay in Live Charts\' window', shown(d.querySelector('[data-plrp]')));
      d.querySelector('[data-plrp]').click(); await W(300);
      check('it asks in that window', !!ask(d) && shown(ask(d).querySelector('.lc-ask')) && /Switch to Replay\?/.test(ask(d).textContent) && !ask(document), [!!ask(d), !!ask(document)]);
      var closed = 0, wt = setInterval(function () { if (satW.closed || cw.closed || cw2.closed) closed++; }, 50);
      ask(d).querySelector('[data-lca="1"]').click();
      await waitReplay(); clearInterval(wt);
      var win = d.getElementById('stpr-win');
      check('Replay: no window closed, each chart a Replay chart where it was', !closed && inPlace() && !P._s().live, [closed, inPlace(), P._s() && P._s().live]);
      check('...every window at the same place and size', JSON.stringify(geo()) === geo0, [geo0, geo()]);
      check('...nothing in the app\'s window: no chart there', !document.querySelector('#stpr-win') || document.querySelectorAll('.stpr-pc').length === 0, document.querySelectorAll('.stpr-pc').length);
      check('...same symbols and timeframes', JSON.stringify(syms()) === syms0 && JSON.stringify(P._cfg().tfs) === tfs0, [syms(), P._cfg().tfs]);
      check('Live Charts\' window: Replay on the platform, its playback in the top bar, the practice ticket, the Live button', win.classList.contains('lcp') && win.classList.contains('plat') && win.classList.contains('pl-replay') && P._plat().on && shown(d.querySelector('.plat-top #stpr-play')) && shown(d.querySelector('.plat-top #stpr-lvback')) && !shown(d.querySelector('[data-plrp]')), [win.className, !!d.querySelector('.plat-top #stpr-play')]);
    }),

    stageControls: part(async function (check) {
      var d = satW.document, S0 = P._s(), n0 = S0.now;
      d.getElementById('stpr-fwd').click(); await W(300);
      check('Forward there: Replay moves on', P._s().now > n0, [n0, P._s().now]);
      n0 = P._s().now; d.getElementById('stpr-back').click(); await W(300);
      check('Back there: Replay steps back', P._s().now < n0 || P._s() !== S0, [n0, P._s().now]);
      var sp0 = d.getElementById('stpr-speed').textContent; d.getElementById('stpr-speed').click(); await W(200);
      var m = d.getElementById('stpr-menu'), opened = m.classList.contains('show');
      if (opened) { var o = m.querySelector('button:not(.on)'); if (o) o.click(); await W(200); }
      check('Speed there answers', d.getElementById('stpr-speed').textContent !== sp0 || opened, [sp0, d.getElementById('stpr-speed').textContent]);
      n0 = P._s().now; d.getElementById('stpr-play').click(); await W(1500);
      check('Play there: it plays', P._s().playing && P._s().now > n0, [P._s().playing, n0, P._s().now]);
      key(d, satW, ' ', 'Space'); await W(200);
      check('Space there: pause', !P._s().playing, P._s().playing);
      d.getElementById('stpr-goto').click(); await W(350); m = d.getElementById('stpr-menu');
      check('Go to there: its menu in that window, inside it', m.classList.contains('show') && inside(m), m.classList.contains('show'));
      key(d, satW, 'Escape'); await W(150);
      check('the day shows in that window', shown(d.getElementById('stpr-daybtn')));
    }),

    chartWinControls: part(async function (check) {
      var d = cw.document, q = function (s) { return d.querySelector('#stpr-tb2 ' + s); }, k;
      check('a chart window in Replay: play, back, forward, speed, Go to and Live in its top bar', shown(q('#stpr-play')) && shown(q('#stpr-back')) && shown(q('#stpr-fwd')) && shown(q('#stpr-speed')) && shown(q('#stpr-goto')) && shown(q('#stpr-lvback')), ['#stpr-play', '#stpr-back', '#stpr-fwd', '#stpr-speed', '#stpr-goto', '#stpr-lvback'].map(function (s) { return shown(q(s)); }));
      var n0 = P._s().now; q('#stpr-fwd').click(); await W(300);
      check('Forward there: Replay moves on', P._s().now > n0, [n0, P._s().now]);
      q('#stpr-play').click(); await W(600);
      check('Play there: it plays, and the button there says Pause', P._s().playing && /Pause/.test(q('#stpr-play').textContent), [P._s().playing, q('#stpr-play').textContent]);
      key(d, cw, ' ', 'Space'); await W(300);
      check('Space there: pause, the button says Play', !P._s().playing && /Play/.test(q('#stpr-play').textContent), [P._s().playing, q('#stpr-play').textContent]);
      q('#stpr-goto').click(); await W(350); var m = d.getElementById('stpr-menu');
      check('Go to there: its menu in that window, inside it', m.classList.contains('show') && inside(m), [m.classList.contains('show'), m.getBoundingClientRect().right, cw.innerWidth]);
      key(d, cw, 'Escape'); await W(150);
      q('#stpr-lvback').click(); await W(300);
      check('Live there: asks in that window', !!ask(d) && shown(ask(d).querySelector('.lc-ask')) && /Switch to Live\?/.test(ask(d).textContent), !!ask(d));
      if (ask(d)) ask(d).querySelector('[data-lca="0"]').click(); await W(150);
      check('...Stay in Replay: nothing changes', !P._s().live && !ask(d));
      var pc = d.querySelector('.stpr-pc'), r = pc.getBoundingClientRect(), el = d.elementFromPoint(r.left + r.width * .4, r.top + r.height * .5), e = new cw.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + r.width * .4, clientY: r.top + r.height * .5, button: 2 }); el.dispatchEvent(e); await W(150);
      check('a right press there in Replay: the app\'s menu', e.defaultPrevented && !!d.querySelector('.stpr-ctx') && d.querySelector('.stpr-ctx').style.display !== 'none');
      d.body.dispatchEvent(new cw.PointerEvent('pointerdown', { bubbles: true })); key(d, cw, 'Escape'); await W(100);
    }),

    narrowChartWin: part(async function (check) {
      var d = cw.document; for (var k = 0; k < 20 && cw.innerWidth > 800; k++) await W(100); await W(500);
      var pl = d.querySelector('#stpr-tb2 #stpr-play'), lv = d.querySelector('#stpr-tb2 #stpr-lvback');
      check('a chart window ' + cw.innerWidth + ' wide: Play and Live still on its top bar, inside it', shown(pl) && inside(pl) && shown(lv) && inside(lv), [shown(pl), pl && pl.getBoundingClientRect().right, shown(lv), lv && lv.getBoundingClientRect().right, cw.innerWidth]);
    }),

    noLive: part(async function (check) {
      var d = satW.document, TM = window.__stTM, c0 = TM.click, p0 = TM.pct, hit = 0; TM.click = function () { hit++; }; TM.pct = function () { hit++; };
      [satW, cw].forEach(function (w) { var b = w.document.createElement('button'); b.type = 'button'; b.setAttribute('data-tma', 'askno'); b.setAttribute('data-tmk', '1'); w.document.body.appendChild(b); b.click(); b.remove(); });
      TM.click = c0; TM.pct = p0;
      check('in Replay: a trade button pressed in a window reaches no trade action', hit === 0, hit);
      var o0 = orders; P._place(1); await W(500); var S = P._s();
      check('a practice trade placed in Replay: on the chart, nothing sent to MT5', !!(S.pos || S.pend) && orders === o0, [!!S.pos, !!S.pend, orders]);
      check('...the ticket says practice, no live account picker there', !d.querySelector('#stpr-mm [data-mm="acct"]') || !shown(d.querySelector('#stpr-mm [data-mm="acct"]')), !!d.querySelector('#stpr-mm [data-mm="acct"]'));
      if (S.pos) P._close(); await W(300);
      check('the EA is not asked for prices for the charts in Replay', LC.visible() === false, LC.visible());
    }),

    toLive: part(async function (check) {
      var d = satW.document, lb = d.querySelector('.plat-top #stpr-lvback');
      lb.click(); await W(300);
      check('Live in Live Charts\' window: asks in that window', !!ask(d) && /Switch to Live\?/.test(ask(d).textContent) && !ask(document), !!ask(d));
      var closed = 0, wt = setInterval(function () { if (satW.closed || cw.closed || cw2.closed) closed++; }, 50);
      ask(d).querySelector('[data-lca="1"]').click();
      await waitLive(); for (var k = 0; k < 60 && !inPlace(); k++) await W(150); await W(1500); clearInterval(wt);
      var win = d.getElementById('stpr-win');
      check('back to Live: no window closed, each chart Live where it was', !closed && inPlace() && P._s().live, [closed, inPlace()]);
      check('...every window at the same place and size', JSON.stringify(geo()) === geo0, [geo0, geo()]);
      check('...nothing in the app\'s window', document.querySelectorAll('.stpr-pc').length === 0, document.querySelectorAll('.stpr-pc').length);
      check('...same symbols and timeframes', JSON.stringify(syms()) === syms0 && JSON.stringify(P._cfg().tfs) === tfs0, [syms(), P._cfg().tfs]);
      check('...the Live drawing is back', P._dr().list.length === dr0, [dr0, P._dr().list.length]);
      check('...Live\'s platform, no Live button, the Trade Manager live', win.classList.contains('lc') && !win.classList.contains('lcp') && !win.classList.contains('pl-replay') && !shown(d.getElementById('stpr-lvback')) && shown(d.querySelector('[data-plrp]')) && shown(d.querySelector('#stpr-mm .pl-x')), win.className);
      check('...prices flowing, the EA asked again', LC.state().fresh && LC.visible() === true, [LC.state().fresh, LC.visible()]);
      var q = cw.document.querySelector('#stpr-tb2 [data-plrp]');
      check('a chart window in Live: no playback, Replay in its top bar', shown(q) && !cw.document.querySelector('#stpr-tb2 #stpr-play'), [!!q, !!cw.document.querySelector('#stpr-tb2 #stpr-play')]);
      if (q) { q.click(); await W(300); }
      check('...it asks in that window', !!ask(cw.document) && /Switch to Replay\?/.test(ask(cw.document).textContent), !!ask(cw.document));
      if (ask(cw.document)) ask(cw.document).querySelector('[data-lca="0"]').click(); await W(150);
      check('...Stay on Live: still Live', P._s().live && !ask(cw.document));
      window.__stTM.acct = window.__stTM.__acct0;
    })
  };
})();
1
