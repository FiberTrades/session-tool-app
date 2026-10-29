// End-to-end test: the Watchlist as TradingView's (Nestor, 29 Oct 2026: "these 2 buttons do the same thing. also there isnt a way to
// delete symbols from watchlist"). On a computer, the Charts platform's Watchlist panel: + adds, the menu (...) has Edit list (handles
// to drag, a remove button a row), Sort by (symbol, change %, manual) and Clear list (asked first); a row's x removes it (the chart's
// own symbol too, the chart staying on it); a right-click has Remove / Move up / Move down. On a phone (375 px), the symbol menu: the
// same menu, a long press on a row for its menu, Edit list by tap. Run through python tests/wledit_run.py (a stand-in EA through a local
// relay, as platform_run.py).
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var P = window.__stPractice, LC = window.__stLC, T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000, phoneNow = innerWidth < 760;
    P._lvClock(T0 * 1000 - Date.now());
    window.__stPlatOff = false; window.__stLcForce = true; await W(1200);
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
    var css0 = document.createElement('style'); css0.textContent = '#st-nudge, .st-nudge, .st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"], .dcx-notif-prompt { display: none !important; }'; document.head.appendChild(css0);
    var LIST = ['EURUSD', 'XAUUSD', 'GBPUSD', 'USDJPY', 'BTCUSD'];
    try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15, 1, 60, 240]; C.syms = []; C.mini = false; C.resume = null; delete C.lookDk; C.look = {}; C.wl = LIST.slice(); C.wlSort = ''; } catch (e) {}
    try { localStorage.setItem('st_plat', JSON.stringify({ pn: 'wl', pw: {}, bh: 150, fold: false, tab: 'pos' })); } catch (e) {}
    var acc0 = (data.accounts || [])[0] || {};
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-plat', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-plat' });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
    var $ = function (s) { return document.querySelector(s); }, $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
    var cfgWl = function () { return (P._cfg().wl || []).join(','); };
    var cm = function () { var e = $('#stpr-win > .wl-cm'); return e && getComputedStyle(e).display !== 'none' ? e : null; };
    var cmItems = function () { var e = cm(); return e ? Array.prototype.map.call(e.querySelectorAll('button'), function (b) { return b.textContent + (b.disabled ? '(off)' : '') + (b.querySelector('path') ? '*' : ''); }) : []; };
    var cmClick = function (k) { var b = cm() && cm().querySelector('[data-wlact="' + k + '"]'); if (b) b.click(); return !!b; };
    var rowAt = function (sel, raw) { return $(sel + '[data-wlr="' + raw + '"]'); };
    var mid = function (el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

    if (!phoneNow) {
      var order = function () { return $$('.plat-right .pl-wlr').map(function (r) { return r.getAttribute('data-wlr'); }).join(','); };
      for (k = 0; k < 40 && $$('.plat-right .pl-wlr').length < 4; k++) await W(250);
      await W(1500);
      check('the Watchlist panel: the list in its order, each row with its own remove button (the chart\'s symbol too)', order() === LIST.join(',') && $$('.plat-right .pl-wlr').every(function (r) { return r.querySelector('[data-wlx]'); }) && !!$('.plat-right .pl-wlr.on [data-wlx]'), order());
      // + adds, as before; ... is its own menu now
      $('.plat-right [data-plwladd]').click(); await W(400);
      var mn = $('#stpr-menu'), wi = $('#stpr-wlin');
      check('+ opens the add box', mn.classList.contains('show') && wi && !wi.hidden, [mn.className, wi && wi.hidden]);
      $('.plat-foot').click(); await W(300);
      $('.plat-right [data-plwlmenu]').click(); await W(400);
      var it = cmItems();
      check('... opens the list\'s own menu: Edit list, Sort by symbol / change % / manual (manual ticked), Clear list', /Edit list/.test(it[0]) && it.some(function (x) { return /^Sort by/.test(x); }) && it.some(function (x) { return /^Symbol/.test(x); }) && it.some(function (x) { return /^Change %/.test(x); }) && it.some(function (x) { return x === 'Manual*'; }) && it.some(function (x) { return /^Clear list/.test(x); }) && !$('#stpr-menu').classList.contains('show'), it);
      window.__wlShot = 'menu';
      $('.plat-foot').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await W(200);
      check('...a click elsewhere closes it', !cm());
      // a row's x, and the chart's own symbol
      rowAt('.plat-right .pl-wlr', 'XAUUSD').querySelector('[data-wlx]').click(); await W(500);
      check('a row\'s x removes it at once', order() === 'EURUSD,GBPUSD,USDJPY,BTCUSD' && cfgWl() === 'EURUSD,GBPUSD,USDJPY,BTCUSD', [order(), cfgWl()]);
      var key0 = P._s().sym.key;
      rowAt('.plat-right .pl-wlr', 'EURUSD').querySelector('[data-wlx]').click(); await W(500);
      check('...the chart\'s own symbol too: off the list, the chart still on it', order() === 'GBPUSD,USDJPY,BTCUSD' && P._s().sym.key === key0, [order(), P._s().sym.key, key0]);
      // right-click: Remove / Move up / Move down
      var rg = rowAt('.plat-right .pl-wlr', 'GBPUSD'), pt = mid(rg);
      rg.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: pt.x, clientY: pt.y, button: 2 })); await W(300);
      it = cmItems();
      check('a right-click on a row: Remove from watchlist, Move up (off on the first), Move down', it.join('|') === 'Remove from watchlist*|Move up(off)*|Move down*', it);
      window.__wlShot = 'rowmenu';
      cmClick('down'); await W(500);
      check('...Move down: one place down, kept as the list\'s order', order() === 'USDJPY,GBPUSD,BTCUSD' && cfgWl() === 'USDJPY,GBPUSD,BTCUSD' && !cm(), [order(), cfgWl()]);
      // Sort by
      $('.plat-right [data-plwlmenu]').click(); await W(300); cmClick('sym'); await W(500);
      check('Sort by symbol: A to Z, the list\'s own order kept underneath', order() === 'BTCUSD,GBPUSD,USDJPY' && P._cfg().wlSort === 'sym' && cfgWl() === 'USDJPY,GBPUSD,BTCUSD', [order(), P._cfg().wlSort]);
      $('.plat-right [data-plwlmenu]').click(); await W(300); cmClick('chg'); await W(600);
      var chgs = $$('.plat-right .pl-wlr').map(function (r) { var t = r.querySelectorAll('span')[2]; return t ? parseFloat(t.textContent.replace('−', '-')) : NaN; });
      check('Sort by change %: highest first', P._cfg().wlSort === 'chg' && chgs.every(function (v, i) { return i === 0 || isNaN(v) || isNaN(chgs[i - 1]) || chgs[i - 1] >= v; }), [order(), chgs]);
      $('.plat-right [data-plwlmenu]').click(); await W(300); cmClick('man'); await W(500);
      check('Manual: the list\'s own order again', order() === 'USDJPY,GBPUSD,BTCUSD' && P._cfg().wlSort === '', order());
      // Edit list: handles, drag, Done
      $('.plat-right [data-plwlmenu]').click(); await W(300); cmClick('edit'); await W(500);
      check('Edit list: a handle and a remove button on every row, Done in the header', $$('.plat-right .pl-wlr').every(function (r) { return r.querySelector('[data-wlg]') && getComputedStyle(r.querySelector('[data-wlx]')).display !== 'none'; }) && !$('.plat-right [data-wldone]').hidden, [$$('.plat-right .pl-wlg').length, $('.plat-right [data-wldone]').hidden]);
      window.__wlShot = 'edit';
      var last = rowAt('.plat-right .pl-wlr', 'BTCUSD'), hd = last.querySelector('[data-wlg]'), h0 = mid(hd), top = $$('.plat-right .pl-wlr')[0].getBoundingClientRect();
      hd.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: h0.x, clientY: h0.y, pointerId: 7, pointerType: 'mouse', button: 0 }));
      for (var yy = h0.y; yy > top.top + 2; yy -= 8) { document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: h0.x, clientY: yy, pointerId: 7, pointerType: 'mouse' })); await W(16); }
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: h0.x, clientY: top.top + 2, pointerId: 7, pointerType: 'mouse' })); await W(500);
      check('...a row dragged by its handle to the top: the new order kept', order() === 'BTCUSD,USDJPY,GBPUSD' && cfgWl() === 'BTCUSD,USDJPY,GBPUSD', [order(), cfgWl()]);
      var symBefore = P._s().sym.key; rowAt('.plat-right .pl-wlr', 'GBPUSD').querySelector('b').click(); await W(600);
      check('...while editing, a row does not open its symbol', P._s().sym.key === symBefore, P._s().sym.key);
      $('.plat-right [data-wldone]').click(); await W(400);
      check('Done: the handles go', !$('.plat-right [data-wlg]') && $('.plat-right [data-wldone]').hidden);
      // Clear list asks first
      $('.plat-right [data-plwlmenu]').click(); await W(300); cmClick('clear'); await W(300);
      it = cmItems();
      check('Clear list asks first: Clear all 3 symbols / Keep them', it.length === 2 && /Clear all 3 symbols/.test(it[0]) && /Keep them/.test(it[1]), it);
      cmClick('clearno'); await W(400);
      check('...Keep them: nothing gone', order() === 'BTCUSD,USDJPY,GBPUSD', order());
      $('.plat-right [data-plwlmenu]').click(); await W(300); cmClick('clear'); await W(300); cmClick('clearyes'); await W(600);
      check('...Clear: the list empty, the way to add one said', $$('.plat-right .pl-wlr').length === 0 && cfgWl() === '' && /\+/.test(($('.plat-right .pl-wle') || {}).textContent || ''), [order(), cfgWl()]);
      P._cfg().wl = LIST.slice(); P._cfg().wlSort = ''; try { P._platPaint && P._platPaint(); } catch (e) {} await W(1500);   // back, for the pictures
    } else {
      // a phone: the list is the symbol menu
      var order2 = function () { return $$('#stpr-wlrows .stpr-wlr').map(function (r) { return r.getAttribute('data-wlr'); }).join(','); };
      var sb = $('#stpr-sym'); if (sb) sb.click(); await W(800);
      for (k = 0; k < 30 && $$('#stpr-wlrows .stpr-wlr').length < 4; k++) await W(250);
      check('a phone: the symbol menu lists the watchlist, + and the list\'s menu in its header, an x on every row', order2() === LIST.join(',') && !!$('#stpr-menu [data-wladd]') && !!$('#stpr-menu [data-wlmenu]') && $$('#stpr-wlrows .stpr-wlr').every(function (r) { return r.querySelector('[data-wlx]'); }), order2());
      var r2 = rowAt('#stpr-wlrows .stpr-wlr', 'GBPUSD'), p2 = mid(r2.querySelector('b'));
      r2.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: p2.x, clientY: p2.y, pointerId: 3, pointerType: 'touch', isPrimary: true }));
      await W(750);
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: p2.x, clientY: p2.y, pointerId: 3, pointerType: 'touch', isPrimary: true }));
      r2.click(); await W(300);   // the tap that ends a long press
      it = cmItems();
      check('a long press on a row: its menu (Remove, Move up, Move down); the list stays open, the symbol not opened', it.join('|') === 'Remove from watchlist*|Move up*|Move down*' && $('#stpr-menu').classList.contains('show'), [it, $('#stpr-menu').className]);
      window.__wlShot = 'phonerow';
      cmClick('up'); await W(500);
      check('...Move up by tap, the list still open', order2() === 'EURUSD,GBPUSD,XAUUSD,USDJPY,BTCUSD' && $('#stpr-menu').classList.contains('show'), order2());
      $('#stpr-menu [data-wlmenu]').click(); await W(300); cmClick('edit'); await W(400);
      check('Edit list by tap: a handle and an x on every row, Done', $$('#stpr-wlrows .stpr-wlr').every(function (r) { return r.querySelector('[data-wlg]'); }) && !$('#stpr-menu [data-wldone]').hidden && $('#stpr-menu').classList.contains('show'), $$('#stpr-wlrows .stpr-wlg').length);
      window.__wlShot = 'phoneedit';
      rowAt('#stpr-wlrows .stpr-wlr', 'USDJPY').querySelector('[data-wlx]').click(); await W(500);
      check('...a tap on an x removes that row', order2() === 'EURUSD,GBPUSD,XAUUSD,BTCUSD' && cfgWl() === 'EURUSD,GBPUSD,XAUUSD,BTCUSD', [order2(), cfgWl()]);
    }
    check('no script errors', !errs.length, errs.slice(0, 4));
  } catch (e) { results.push({ name: 'the test ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(results);
})()
