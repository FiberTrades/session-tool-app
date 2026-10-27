(async function () {
  // The chart's own right-click menu (Nestor, 26 Oct 2026, TradingView's in our premium look), in Back Testing (Live Charts has the
  // same engine): Reset chart view, Copy price, Paste, Add alert at the price, Buy / Sell limit or stop there with a confirm, Lock
  // vertical cursor line, Object tree, Remove N drawings (confirmed), Settings; a drawing's own menu in the same look; the object
  // tree for another host (window.__stObjTree); a finger's long press is the crosshair, not the menu.
  // Run: python tests/browser_test.py tests/practice_ctxmenu_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stDrawBar); i++) await W(100); await W(800);
    var P = window.__stPractice; try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.mini = false; C.news = false; C.dtpl = {}; C.ddef = {};
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    P._jump('london'); await W(600);
    var DW = P._dr(), S = P._s(), pane = P._panes()[0], ch = pane.el.querySelector('.stpr-pc'), r = ch.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var rr = ch.getBoundingClientRect(); ch.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: rr.left + xx, clientY: rr.top + yy, bubbles: true, cancelable: true, button: t === 'contextmenu' ? 2 : 0, buttons: t === 'mouseup' || t === 'contextmenu' ? 0 : 1, view: window }, o || {}))); };
    var click = function (x, y, o) { mev('mousedown', x, y, o); mev('mouseup', x, y, o); };
    var menu = function () { var m = pane.el.querySelector('.stpr-cm'); return m && m.style.display !== 'none' ? m : null; };
    var acts = function () { var m = menu(); return m ? Array.prototype.map.call(m.querySelectorAll('[data-act]'), function (b) { return b.getAttribute('data-act') + (b.disabled ? '-' : ''); }).join(',') : ''; };
    var pick = function (a) { var m = menu(), b = m && m.querySelector('[data-act="' + a + '"]'); if (b) b.click(); return !!b; };
    var flashTxt = function () { var f = document.getElementById('stpr-flash'); return f ? f.textContent : ''; };
    var dlg = function () { return document.querySelector('.stpr-dlgbg'); };
    DW.list = []; DW.sel = null; DW.multi = null; DW.clip = null; P._props();
    var Wd = r.width, H = r.height, X = Math.round(Wd * 0.55), Y = Math.round(H * 0.3), Yb = Math.round(H * 0.62);

    // the bare chart
    mev('contextmenu', X, Y); await W(60);
    var m = menu(), a0 = acts(), pr = pane.series.coordinateToPrice(Y), ps = Number(pr).toFixed(5);
    ok('a right-click on the bare chart opens the chart\'s menu', !!m && m.classList.contains('stpr-cm'), a0);
    ok('Reset chart view, Copy price, Paste (nothing copied: off), Add alert, the orders at that price, Lock vertical cursor line, Object tree, Remove drawings (none: off), Settings',
      /^reset,copy,paste-,alert,(sl,bs|bl,ss),vlock,tree,remove-,settings$/.test(a0), a0);
    ok('each with its icon; its keys where it has one (Paste Ctrl+V, Add alert Alt+A)', m.querySelectorAll('[data-act] svg').length === m.querySelectorAll('[data-act]').length && /Ctrl\+V/.test(m.querySelector('[data-act="paste"]').textContent) && /Alt\+A/.test(m.querySelector('[data-act="alert"]').textContent));
    ok('the prices are the one under the mouse', Math.abs(parseFloat(m.querySelector('[data-act="copy"]').textContent.replace(/[^0-9.]/g, '')) - pr) < 0.00003 && Math.abs(parseFloat(m.querySelector('[data-act="alert"]').textContent.replace(/[^0-9.]/g, '')) - pr) < 0.00003, ps);
    var cs = getComputedStyle(m);
    ok('premium: TradingView\'s dark panel, rounded, a dark shadow (no glow), hairlines between groups', cs.borderRadius === '8px' && /rgba\(0, 0, 0/.test(cs.boxShadow) && m.querySelectorAll('hr').length >= 4, [cs.backgroundColor, cs.boxShadow]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(30);
    ok('Esc closes it', !menu());

    // Copy price
    mev('contextmenu', X, Y); await W(40); pick('copy'); await W(150);
    var clip = ''; try { clip = await navigator.clipboard.readText(); } catch (e) { clip = 'n/a'; }
    ok('Copy price: the price on the clipboard, said', (Math.abs(parseFloat(clip) - pr) < 0.00003 || clip === 'n/a') && /copied/i.test(flashTxt()), [clip, flashTxt()]);
    // Add alert
    mev('contextmenu', X, Y); await W(40); pick('alert'); await W(80);
    var al = DW.list[DW.list.length - 1];
    ok('Add alert: a horizontal line with an alert at that price', al && al.type === 'hline' && al.alert && Math.abs(al.price - pr) < 0.00003, al && al.price);
    // Lock vertical cursor line
    mev('contextmenu', X, Yb); await W(40); pick('vlock'); await W(60);
    ok('Lock vertical cursor line: a line kept at that candle\'s time', DW.vlock && Math.abs(P._xOfT(0, DW.vlock) - X) < 10, DW.vlock);
    mev('contextmenu', X, Yb); await W(40);
    ok('the menu then offers to unlock it', /Unlock vertical cursor line/.test(menu().querySelector('[data-act="vlock"]').textContent));
    pick('vlock'); await W(40);
    ok('and unlocks it', DW.vlock == null);
    // Paste
    DW.sel = DW.list.indexOf(al); P._props(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', ctrlKey: true, bubbles: true })); await W(40);
    var n0 = DW.list.length; mev('contextmenu', X, Yb + 40); await W(40);
    ok('a drawing copied: Paste is on', acts().indexOf('paste,') >= 0, acts());
    pick('paste'); await W(80);
    ok('Paste puts a copy on the chart', DW.list.length === n0 + 1, DW.list.length);
    // Object tree, Settings
    mev('contextmenu', X, Yb); await W(40); pick('tree'); await W(80);
    var sm = document.getElementById('stpr-menu');
    ok('Object tree opens the object tree', sm && sm.classList.contains('show') && /Object tree/.test(sm.textContent) && sm.querySelectorAll('[data-otsel]').length === DW.list.length, sm && sm.textContent.slice(0, 40));
    sm.classList.remove('show');
    mev('contextmenu', X, Yb); await W(40); pick('settings'); await W(80);
    ok('Settings opens the chart\'s settings', sm.classList.contains('show') && /Chart basic styles|Estilos/.test(sm.textContent), sm.textContent.slice(0, 40));
    sm.classList.remove('show');

    // an order at the price (a practice one here), with its confirm
    mev('contextmenu', X, Yb); await W(40);
    var prB = pane.series.coordinateToPrice(Yb), ordA = acts().split(',').filter(function (a) { return /^(bl|bs|sl|ss)$/.test(a); });
    pick(ordA[0]); await W(120);
    var D = dlg(), st = D && D.querySelector('[data-cmst]');
    ok('Buy / Sell at a price opens a confirm: entry, stop to change, its price, target, lots and risk', D && st && D.querySelector('[data-cmsl]').textContent && D.querySelector('[data-cmlot]').textContent && D.querySelector('[data-cmrk]').textContent && /Place order/.test(D.textContent), D && D.textContent.replace(/\s+/g, ' ').slice(0, 160));
    var sl0 = D.querySelector('[data-cmsl]').textContent; st.value = String(+st.value + 2); st.dispatchEvent(new Event('input', { bubbles: true })); await W(30);
    ok('changing the stop moves its price and the lots', D.querySelector('[data-cmsl]').textContent !== sl0, [sl0, D.querySelector('[data-cmsl]').textContent]);
    D.querySelector('[data-dok]').click(); await W(120);
    S = P._s();
    ok('Place: the order is placed at that price, the kind the menu said', S.pend && Math.abs(S.pend.entry - prB) < 0.00003 && S.pend.kind === (/l$/.test(ordA[0]) ? 'limit' : 'stop') && S.pend.dir === (/^b/.test(ordA[0]) ? 1 : -1), S.pend);
    mev('contextmenu', X, Yb); await W(40);
    ok('with an order waiting (one at a time in practice): no order rows', !/(bl|bs|sl|ss)/.test(acts()), acts());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(20);

    // a drawing's own menu
    var hd = DW.list[0], hy = pane.series.priceToCoordinate(hd.price);
    mev('contextmenu', X, Math.round(hy)); await W(60);
    ok('a right-click on a drawing: its own menu, the same look (Clone, Delete, its alert, its lock)', menu() && /^clone,del,alt,lock$/.test(acts()), acts());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(20);

    // Remove N drawings
    var nn = DW.list.length; mev('contextmenu', X, Yb + 80); await W(40);
    ok('Remove N drawings says how many', new RegExp('Remove ' + nn + ' drawings').test(menu().querySelector('[data-act="remove"]').textContent), menu().querySelector('[data-act="remove"]').textContent);
    pick('remove'); await W(80);
    ok('it asks first', dlg() && /Undo/.test(dlg().textContent));
    dlg().querySelector('[data-dok]').click(); await W(80);
    ok('and removes them', DW.list.length === 0, DW.list.length);

    // the object tree for another host
    DW.list.push({ type: 'hline', price: pr }); DW.hist.push(JSON.stringify(DW.list)); DW.hpos = DW.hist.length - 1;
    var OT = window.__stObjTree, box = document.createElement('div'); document.body.appendChild(box); var ev = 0; window.addEventListener('st-objtree', function () { ev++; });
    box.innerHTML = OT.html(); OT.wire(box);
    ok('window.__stObjTree: the list, its html and a click in another host', OT.list().length === 1 && box.querySelectorAll('[data-otsel]').length === 1, OT.list());
    box.querySelector('[data-otdel]').click(); await W(220);
    ok('a delete there deletes it, and an st-objtree event says so', DW.list.length === 0 && ev >= 1, [DW.list.length, ev]);
    box.remove();

    // a finger
    DW.tinAt = Date.now(); mev('contextmenu', X, Yb); await W(40);
    ok('a long press by a finger: no menu (it is the crosshair)', !menu());
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
