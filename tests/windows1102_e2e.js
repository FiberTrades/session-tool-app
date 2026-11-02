// End-to-end test of the chart windows (2 Nov 2026), in real windows; the parts are called one by one by tests/windows1102_run.py, which also
// minimises real windows between them (the browser's own throttling on).
//   Nestor: "i just switched from replay to live and all external screen came together into the main one in the app, stop this from happening!!"
//   Nestor: "now it says switch to live when i am already in LIVE! whats going on?"
//   Nestor: "the normal menu needs to appear on all windows when right button is clicked"
//   Nestor: "ive noticed when the main chart is minimized, the other external chats candle timers lag, they dont seem live, why?"
//   Nestor: "why is this copy trading panel getting cut off?"
//   Nestor: "if i dont want to see the execution lines on the other charts i can turn it off but when i turn it off the lines dont dissapear"
(function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var P, LC, T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000, cw = null, satW = null;
  function part(fn) { return async function () { var res = [], check = function (name, cond, got) { res.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
    try { await fn(check); } catch (e) { res.push({ name: 'the part ran to the end', ok: false, got: String(e && e.stack || e) }); } return JSON.stringify(res); }; }
  var shown = function (el) { if (!el) return false; var r = el.getBoundingClientRect(), v = el.ownerDocument.defaultView; return r.width > 0 && r.height > 0 && v.getComputedStyle(el).display !== 'none'; };
  var inChartWin = function () { var o = P._pops()[1], p = P._panes()[1]; return !!(o && o.w === cw && !cw.closed && o.ready && p && p.el.ownerDocument === cw.document && p.n > 10); };
  async function waitLive() { for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].n); k++) await W(250); }
  var ctxOn = function (d) { return Array.prototype.filter.call(d.querySelectorAll('.stpr-ctx'), function (e) { return e.style.display !== 'none' && e.offsetWidth > 0; })[0] || null; };
  function press(el, v, x, y) { var e = new v.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2 }); el.dispatchEvent(e); return e.defaultPrevented; }

  window.__W1102 = {
    setup: part(async function (check) {
      for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB); i0++) await W(100);
      await W(800);
      P = window.__stPractice; LC = window.__stLC;
      P._lvClock(T0 * 1000 - Date.now());
      window.isSessionLive = function () { return true; };
      window.__stPlatOff = false; window.__stLcForce = true; await W(1200);
      document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
      window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
      try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15, 60, 240, 5]; C.syms = []; C.mini = false; C.showPer = {}; C.resume = null; delete C.lookDk; C.look = {}; } catch (e) {}
      try { localStorage.removeItem('st_plat'); localStorage.removeItem('st_chartwins_v1'); } catch (e) {}
      var acc0 = (data.accounts || [])[0] || {};
      data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-w', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
      data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-w' });
      document.querySelector('.tab[data-page="livecharts"]').click();
      await waitLive(); await W(1500);
      check('Live in the Charts tab, on the platform', P._plat().on && P._s().live, document.getElementById('stpr-win').className);
      await P._layout(3); for (var k = 0; k < 60 && !(P._panes().length === 3 && P._panes()[1].n && P._panes()[2].n); k++) await W(150);
      cw = P._pop(1); for (k = 0; k < 120 && !inChartWin(); k++) await W(150);
      await W(1000);
      check('chart 2 in a window of its own', inChartWin());
    }),

    // Replay, then Live: the chart window stays where it is, the same window, drawn there
    replayToLive: part(async function (check) {
      var win = document.getElementById('stpr-win'), k;
      document.querySelector('[data-plrp]').click(); await W(200);
      document.getElementById('lc-ask-bg').querySelector('[data-lca="1"]').click();
      for (k = 0; k < 120 && !(P._s() && !P._s().live && P._panes()[1] && P._panes()[1].n); k++) await W(150); await W(1200);
      check('Live to Replay: the chart window stays, showing Replay', inChartWin() && !P._s().live, [inChartWin(), P._s() && P._s().day]);
      var lvb = document.getElementById('stpr-lvback');
      check('in Replay: the Live button in the top bar', shown(lvb) && lvb.closest('.plat-top'), lvb && lvb.parentNode.className);
      lvb.click(); await W(200);
      var ask = document.getElementById('lc-ask-bg');
      check('...it asks Switch to Live?', ask && /Switch to Live\?/.test(ask.textContent));
      var seen = 0, closedAt = null; var watch = setInterval(function () { seen++; if (cw.closed && !closedAt) closedAt = seen; }, 50);
      ask.querySelector('[data-lca="1"]').click();
      await waitLive(); for (k = 0; k < 60 && !inChartWin(); k++) await W(150); await W(1500); clearInterval(watch);
      check('Replay to Live: the chart window was never closed, the same window keeps its chart, drawn there', !closedAt && !cw.closed && inChartWin() && P._panes()[1].el.ownerDocument === cw.document, [closedAt, cw.closed, inChartWin(), Object.keys(P._pops())]);
      check('...the main window holds only its own charts', document.querySelectorAll('#stpr-grid .stpr-pc').length === P._panes().filter(function (p) { return p.el.ownerDocument === document; }).length, document.querySelectorAll('#stpr-grid .stpr-pc').length);
      check('...Live for real', P._s().live && win.classList.contains('lc') && !win.classList.contains('lcp') && !win.classList.contains('pl-replay'), win.className);
      check('...no Live button in Live: nothing offers Switch to Live', !shown(document.getElementById('stpr-lvback')) && shown(document.querySelector('[data-plrp]')), [document.getElementById('stpr-lvback') && getComputedStyle(document.getElementById('stpr-lvback')).display, document.getElementById('stpr-lvback') && document.getElementById('stpr-lvback').parentNode.className]);
      await W(1600);
      check('...and still none a moment later', !shown(document.getElementById('stpr-lvback')), win.className);
      // the same in the main window's full screen, where he saw it
      var mx = document.getElementById('stpr-max'); mx.click(); await W(900);
      document.querySelector('[data-plrp]').click(); await W(200); document.getElementById('lc-ask-bg').querySelector('[data-lca="1"]').click();
      for (k = 0; k < 120 && !(P._s() && !P._s().live && P._panes()[1] && P._panes()[1].n); k++) await W(150); await W(1000);
      check('full screen, Replay: the chart window stays', inChartWin());
      document.getElementById('stpr-lvback').click(); await W(200); document.getElementById('lc-ask-bg').querySelector('[data-lca="1"]').click();
      await waitLive(); for (k = 0; k < 60 && !inChartWin(); k++) await W(150); await W(1200);
      check('full screen, back to Live: the chart window stays, no Live button', inChartWin() && !cw.closed && !shown(document.getElementById('stpr-lvback')), [inChartWin(), cw.closed, win.className, getComputedStyle(document.getElementById('stpr-lvback')).display, document.getElementById('stpr-lvback').parentNode.className]);
      mx.click(); await W(900);
    }),

    // the app's menu in a chart window: on the candles, on the axes, with a drawing under the mouse
    rightClick: part(async function (check) {
      var d = cw.document, p = P._panes()[1], pc = d.querySelector('.stpr-pc'), r = pc.getBoundingClientRect();
      var cvs = d.elementFromPoint(r.left + r.width * .4, r.top + r.height * .5);
      check('a right press on the candles: the browser\'s menu kept away', press(cvs, cw, r.left + r.width * .4, r.top + r.height * .5) === true, cvs && cvs.tagName);
      var m = ctxOn(d);
      check('...the app\'s chart menu there, with Reset chart view', !!m && /Reset chart view/.test(m.textContent) && /Settings/.test(m.textContent), m && m.textContent.slice(0, 80));
      if (m) { var mr = m.getBoundingClientRect(); check('...inside the window', mr.right <= cw.innerWidth && mr.bottom <= cw.innerHeight && mr.left >= 0 && mr.top >= 0, [mr.left, mr.right, mr.top, mr.bottom, cw.innerWidth, cw.innerHeight]); }
      var nm = d.querySelector('.pl-nm');
      check('on the chart\'s name: the browser\'s menu kept away, the chart\'s menu there', !!nm && press(nm, cw, nm.getBoundingClientRect().left + 5, nm.getBoundingClientRect().top + 5) === true && !!ctxOn(d) && /Reset chart view/.test(ctxOn(d).textContent), !!nm);
      var ax = d.elementFromPoint(r.right - 12, r.top + r.height * .4);
      check('on the price scale: the browser\'s menu kept away', press(ax, cw, r.right - 12, r.top + r.height * .4) === true, ax && ax.tagName);
      var ax2 = d.elementFromPoint(r.left + r.width * .5, r.bottom - 8);
      check('on the time scale: the browser\'s menu kept away', press(ax2, cw, r.left + r.width * .5, r.bottom - 8) === true, ax2 && ax2.tagName);
      // a right press near the window's far corner: the menu stays in
      press(cvs, cw, r.right - 90, r.bottom - 50); m = ctxOn(d);
      if (m) { mr = m.getBoundingClientRect(); check('near the corner: the menu stays inside the window', mr.right <= cw.innerWidth + 1 && mr.bottom <= cw.innerHeight + 1, [mr.right, mr.bottom, cw.innerWidth, cw.innerHeight]); }
      else check('near the corner: a menu shows', false);
      // a drawing under the mouse: its own menu
      var bs = p.bars, nb = bs.length, e0 = bs[nb - 12].close;
      var DW = P._dr(), d0 = { type: 'short', a: { t: bs[nb - 12].time, price: e0 }, b: { t: bs[nb - 3].time, price: e0 }, sl: e0 + 0.001, tp: e0 - 0.002, live: true };
      DW.list.push(d0); P._render(); await W(400);
      var bb = P._bbox(1, d0), hx = bb ? (bb.x0 + bb.x1) / 2 : 0, hy = bb ? Math.min((bb.y0 + bb.y1) / 2, bb.y0 + 10) : 0, xy = { x: r.left + hx, y: r.top + hy }, h = P._hit(1, hx, hy);
      press(cvs, cw, xy.x, xy.y); m = ctxOn(d);
      check('with a drawing under the mouse: the drawing\'s menu', !!h && !!m && !/Reset chart view/.test(m.textContent) && /Delete/.test(m.textContent), [bb, !!h, m && m.textContent.slice(0, 80)]);
      var ix = DW.list.indexOf(d0); if (ix >= 0) DW.list.splice(ix, 1); DW.sel = null; P._render();
      d.body.dispatchEvent(new cw.PointerEvent('pointerdown', { bubbles: true })); await W(100);
    }),

    // Execute's lines and the chart's own Trade lines switch
    execLines: part(async function (check) {
      var d = cw.document, b0 = P._panes()[0].bars, pr0 = b0[b0.length - 1].close;
      P._exec(true); P._preview(1); P._aim(pr0 - 0.002); await W(300);
      var L1 = P._lines(1), L0 = P._lines(0), aimed = function (L) { return L.filter(function (l) { return /^SL/.test(l.title || '') || l.k === 'pvsl' || l.k === 'pvtp' || /Buy|Sell|Compra|Venta|TP/.test(l.title || ''); }); };
      check('aiming an order: its lines on chart 1 and on the chart window\'s', aimed(L0).length >= 2 && aimed(L1).length >= 2 && aimed(L1).every(function (l) { return l.vis; }), [L0, L1]);
      // the switch, through the menu in that window
      var lb = d.getElementById('stpr-layersbtn') || d.querySelector('[id="stpr-layersbtn"]');
      check('Show on chart in the chart window\'s top bar', !!lb); lb.click(); await W(300);
      var sw = d.getElementById('stpr-marks');
      check('...its menu there, Trade lines on', !!sw && sw.checked, !!sw);
      sw.checked = false; sw.dispatchEvent(new cw.Event('change', { bubbles: true }));
      L1 = P._lines(1); L0 = P._lines(0);
      check('Trade lines off on that chart: Execute\'s lines gone there at once, tags too', L1.length > 0 && L1.every(function (l) { return !l.vis; }), L1);
      check('...the other chart keeps them', aimed(L0).length >= 2 && aimed(L0).every(function (l) { return l.vis; }), L0);
      P._aim(pr0 - 0.0035); await W(200); L1 = P._lines(1);
      check('...still gone as the mouse moves', L1.every(function (l) { return !l.vis; }), L1);
      check('...and no line of it can be dragged there', L1.every(function (l) { return !l.k; }), L1);
      window.__W1102shot = 1;
      sw = d.getElementById('stpr-marks'); if (sw) { sw.checked = true; sw.dispatchEvent(new cw.Event('change', { bubbles: true })); } await W(150);
      L1 = P._lines(1);
      check('Trade lines on: they are back', aimed(L1).length >= 2 && aimed(L1).every(function (l) { return l.vis; }), L1);
      P._exec(false); await W(200);
      try { d.body.click(); d.dispatchEvent(new cw.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); } catch (e) {}
      await W(150);
    }),

    stageOpen: part(async function (check) {
      var wo = window.open, k; window.open = function (u, n, f) { satW = wo.call(window, u, n, f); return satW; };
      P._lcPop(); window.open = wo;
      for (k = 0; k < 140 && !(P._stage().on && satW && P._panes()[0].el.ownerDocument === satW.document && P._panes()[0].n > 30); k++) await W(150);
      for (k = 0; k < 80 && satW.innerWidth < 1024; k++) await W(150);
      await W(1800);
      check('Live Charts in its own window, the chart window with it', P._stage().on && inChartWin(), [P._stage(), inChartWin()]);
      // the right press there
      var d = satW.document, p = P._panes()[0], pc = p.el.querySelector('.stpr-pc'), r = pc.getBoundingClientRect(), el = d.elementFromPoint(r.left + r.width * .4, r.top + r.height * .5);
      check('in Live Charts\' window: a right press on the candles keeps the browser\'s menu away', press(el, satW, r.left + r.width * .4, r.top + r.height * .5) === true, el && el.tagName);
      var m = ctxOn(d);
      check('...the app\'s chart menu there', !!m && /Reset chart view/.test(m.textContent), m && m.textContent.slice(0, 60));
      d.body.dispatchEvent(new satW.PointerEvent('pointerdown', { bubbles: true })); await W(150);
    }),

    // the Copy trading sheet is wider than Trade with: it stays in its window
    narrowMenu: part(async function (check) {
      var d = satW.document, a = d.querySelector('#stpr-mm [data-mm="acct"]');
      check('the Trade Manager\'s account button', !!a, !!a); if (!a) return;
      a.click(); await W(350);
      var m = d.getElementById('stpr-menu');
      check('Trade with opens', m && m.classList.contains('show') && /Trade with/.test(m.textContent), m && m.textContent.slice(0, 60));
      var inW = function () { var r = m.getBoundingClientRect(); return r.left >= 0 && r.right <= satW.innerWidth + .5 && r.top >= 0 && r.bottom <= satW.innerHeight + .5; }, rr = function () { var r = m.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom), satW.innerWidth, satW.innerHeight]; };
      check('...inside the window', inW(), rr());
      var more = m.querySelector('[data-cpsheet]');
      if (!more) { more = d.createElement('button'); more.type = 'button'; more.setAttribute('data-cpsheet', '1'); m.firstElementChild.appendChild(more); }   // one account in this test: the same click
      more.click(); await W(350);
      check('Copy trading opens', /Copy trading/.test(m.textContent) && m.classList.contains('show'), m.textContent.slice(0, 60));
      check('...and stays inside the window (it is wider than Trade with)', inW(), rr());
      window.__W1102sheet = rr();
    }),

    stageBack: part(async function (check) {
      var d = satW.document, m = d.getElementById('stpr-menu'), k; m.classList.remove('show');
      d.querySelector('[data-plrp]').click(); await W(300);
      var ask = d.getElementById('lc-ask-bg');
      check('Replay pressed in Live Charts\' window: it asks there, where he is looking', !!ask && shown(ask.querySelector('.lc-ask')) && /Switch to Replay\?/.test(ask.textContent) && !document.getElementById('lc-ask-bg'), [!!ask, !!document.getElementById('lc-ask-bg')]);
      (ask || document.getElementById('lc-ask-bg')).querySelector('[data-lca="1"]').click();
      for (k = 0; k < 120 && !(P._s() && !P._s().live && P._panes()[1] && P._panes()[1].n && !P._stage().on); k++) await W(150); await W(1500);
      check('...Replay in the app, the chart window still where it was', !P._stage().on && P._s() && !P._s().live && inChartWin(), [P._stage().on, inChartWin()]);
      document.getElementById('stpr-lvback').click(); await W(200); document.getElementById('lc-ask-bg').querySelector('[data-lca="1"]').click();
      await waitLive(); for (k = 0; k < 60 && !inChartWin(); k++) await W(150); await W(1200);
      check('...back to Live: still there, and no Live button', P._s().live && inChartWin() && !shown(document.getElementById('stpr-lvback')), [inChartWin(), getComputedStyle(document.getElementById('stpr-lvback')).display]);
    }),

    // every menu of a small chart window stays inside it (the runner has made that window small)
    smallWin: part(async function (check) {
      var d = cw.document, tb = d.getElementById('stpr-tb2');
      for (var i = 0; i < 20 && cw.innerWidth > 800; i++) await W(100);
      await W(500);
      ['stpr-layersbtn', 'stpr-alertsbtn', 'stpr-snapbtn', 'stpr-lookbtn'].forEach(function () {});
      for (var id of ['stpr-layersbtn', 'stpr-alertsbtn', 'stpr-snapbtn', 'stpr-keysbtn']) { var b = d.getElementById(id); if (!b || !shown(b)) { check('small window: ' + id + ' shown or folded away', true); continue; }
        b.click(); await W(350); var m = d.getElementById('stpr-menu'), r = m.getBoundingClientRect();
        check('small window (' + cw.innerWidth + ' x ' + cw.innerHeight + '): ' + id + '\'s menu inside it', m.classList.contains('show') && r.left >= 0 && r.right <= cw.innerWidth + .5 && r.bottom <= cw.innerHeight + .5, [m.classList.contains('show'), Math.round(r.left), Math.round(r.right), Math.round(r.bottom), m.scrollHeight]);
        b.click(); await W(150); }
      var pc = d.querySelector('.stpr-pc'), pr = pc.getBoundingClientRect(), cvs = d.elementFromPoint(pr.left + 40, pr.top + 40);
      press(cvs, cw, pr.right - 30, pr.bottom - 30); var c = ctxOn(d); if (c) { var q = c.getBoundingClientRect(); check('...the chart menu at the far corner inside it', q.right <= cw.innerWidth + .5 && q.bottom <= cw.innerHeight + .5 && q.left >= 0 && q.top >= 0, [q.left, q.right, q.top, q.bottom]); } else check('...the chart menu shows', false);
      d.body.dispatchEvent(new cw.PointerEvent('pointerdown', { bubbles: true })); await W(100);
    }),

    hidePrep: part(async function (check) { await W(300); if (!P) await window.__W1102.setup(); if (window.__W1102Long == null) window.__W1102Long = +'__LONG__' || 0; check('the app window on screen before it is minimised', document.visibilityState === 'visible', document.visibilityState); }),

    // measured from the chart window, which stays on screen
    hideMain: part(async function (check) { await measure(check, 'the app window minimised', document); }),
    showMain: part(async function (check) { await W(800); check('the app window on screen again', document.visibilityState === 'visible', document.visibilityState); }),
    stageOpen2: part(async function (check) {
      var wo = window.open, k; window.open = function (u, n, f) { satW = wo.call(window, u, n, f); return satW; };
      P._lcPop(); window.open = wo;
      for (k = 0; k < 140 && !(P._stage().on && satW && P._panes()[0].el.ownerDocument === satW.document && P._panes()[0].n > 30); k++) await W(150);
      await W(1500);
      check('Live Charts in its own window again', P._stage().on && inChartWin(), P._stage());
    }),
    hideStage: part(async function (check) { await measure(check, 'Live Charts\' window minimised', satW.document); }),

    // the session voice: the app window minimised, Live Charts' window and a chart window open: one sound, from one window
    voice: part(async function (check) {
      check('the app window is minimised', document.visibilityState === 'hidden', document.visibilityState);
      check('Live Charts\' window and a chart window open', P._stage().on && inChartWin());
      var plays = { app: 0, stage: 0, chart: 0 }, stub = function (w, k) { w.AudioBufferSourceNode.prototype.start = function () { plays[k]++; }; w.HTMLMediaElement.prototype.play = function () { plays[k]++; return Promise.resolve(); }; };
      stub(window, 'app'); stub(satW, 'stage'); stub(cw, 'chart');
      window.currentUser = { id: 'test-voice' }; window.__stIsTradingDay = function () { return true; };
      check('this window can make a sound', navigator.userActivation.hasBeenActive && (window.__stHoldsVoice() === true), [navigator.userActivation.hasBeenActive, window.__stHoldsVoice()]);
      var d0 = new Date(); d0.setHours(23, 0, 0, 0); var at = function (m) { return new Date(d0.getTime() + m * 60000); }, hm = function (t) { return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); };
      data.settings.sessions = [{ name: 'Test', start: hm(at(2)), end: hm(at(4)) }]; delete data._sessionAlertFired;
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf('st_sessfire_') === 0) localStorage.removeItem(k); });
      for (var m = 0; m <= 3; m++) { checkSessionBoundaryAlerts(at(m), hm(at(m))); await W(250); }
      for (var k = 0; k < 40 && plays.app < 1; k++) await W(100); await W(600);
      check('Session live: heard once, from the app window, none from the chart windows', plays.app === 1 && plays.stage === 0 && plays.chart === 0, plays);
      plays.app = 0;
      for (m = 4; m <= 6; m++) { checkSessionBoundaryAlerts(at(m), hm(at(m))); await W(250); }
      for (k = 0; k < 40 && plays.app < 1; k++) await W(100); await W(600);
      check('Session over: heard once, from the app window, none from the chart windows', plays.app === 1 && plays.stage === 0 && plays.chart === 0, plays);
      plays.app = 0; for (m = 4; m <= 6; m++) { checkSessionBoundaryAlerts(at(m), hm(at(m))); await W(100); } await W(500);
      check('...and not again', plays.app === 0, plays);
      check('the chart windows have no voice of their own: nothing of the app runs in them', !cw.checkSessionBoundaryAlerts && !cw.__stHoldsVoice && !satW.checkSessionBoundaryAlerts && !satW.__stHoldsVoice, [typeof cw.checkSessionBoundaryAlerts, typeof satW.checkSessionBoundaryAlerts]);
    })
  };

  async function measure(check, what, hiddenDoc) {
    var o = P._pops()[1]; if (!o) { check(what + ': the chart window is there', false); return; }
    var LONG = +(window.__W1102Long || 0);
    if (LONG) await new Promise(function (r) { cw.setTimeout(r, LONG); });
    check(what + ': that window is really hidden (the browser\'s throttling on)', hiddenDoc.visibilityState === 'hidden', hiddenDoc.visibilityState);
    check('...the chart window still on screen', cw.document.visibilityState === 'visible', cw.document.visibilityState);
    check('...the app still counts Live Charts as on screen', LC.visible() === true, LC.visible());
    // sampled on the chart window's own clock
    var cdT = [], cdLast = null, atT = [], atLast = null, frames = 0, closes = [], lastC = null, t0 = Date.now(), wset = [];
    var ln = window.__stLiveLine;
    var sampler = cw.setInterval(function () { var ax = P._axl(1, 'cd'), t = ax && ax.t, p = P._panes()[1], b = p && p.bars && p.bars[p.bars.length - 1], c = b && b.close, at = LC.state().at;
      if (t && t !== cdLast) { cdLast = t; cdT.push(Date.now()); }
      if (at && at !== atLast) { atLast = at; atT.push(Date.now()); }
      if (c != null && c !== lastC) { lastC = c; closes.push(Date.now()); } wset.push(!!ln.state().watching); }, 40);
    var rid = 0, raf = function () { frames++; rid = cw.requestAnimationFrame(raf); }; rid = cw.requestAnimationFrame(raf);
    await new Promise(function (r) { cw.setTimeout(r, 9000); });
    cw.clearInterval(sampler); cw.cancelAnimationFrame(rid);
    var gaps = function (L) { var o = []; for (var i = 1; i < L.length; i++) o.push(L[i] - L[i - 1]); return o; }, cg = gaps(cdT), mx = cg.length ? Math.max.apply(null, cg) : null;
    var rep = { cdChanges: cdT.length, cdMaxGapMs: mx, cdGaps: cg, prices: atT.length, closes: closes.length, frames: frames, watching: wset.filter(Boolean).length + '/' + wset.length, mainHidden: document.visibilityState, long: LONG };
    console.log('[W1102] ' + what + ' ' + JSON.stringify(rep)); window.__W1102rep = window.__W1102rep || {}; window.__W1102rep[what] = rep;
    check('...its candle timer ticks every second (9 s: 7 or more changes, none over 1.6 s apart)', cdT.length >= 7 && mx != null && mx <= 1600, rep);
    check('...the EA is still asked to stream (never stopped)', wset.length > 0 && wset.every(Boolean), rep.watching);
    check('...prices keep arriving at the speed asked (9 s at 2 a second: 8 or more)', atT.length >= 8, rep);
  }
})();
1
