// Live Charts, batches C and D (Nestor, 19 Oct 2026: "build all the tradingview suggestions!"), through the real app, the real
// Supabase Realtime and two stand-in EAs on a throwaway channel (EUR/USD on EA 9.03, gold on EA 9.05):
// - Compare: gold over the EUR/USD chart, from the symbols the member's EAs stream; its EA is asked for its prices (the watch
//   names it) and the line moves with them; its legend; x takes it off.
// - Alerts on drawings: a zone and a trend line ring here on the live price (never on the price already there), and the
//   toolbar says honestly where each reaches the phone (a zone needs EA 9.05 on that symbol's chart; this one is 9.03).
//   python tests/livecmp_run.py      (starts the stand-in EAs, then this test)
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var P = window.__stPractice, LC = window.__stLC, LN = window.__stLiveLine;
    var T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000;
    P._lvClock(T0 * 1000 - Date.now());
    window.isSessionLive = function () { return true; };
    window.__stLcForce = true; await W(1200);
    window.STCloud.syncToken = 'st-test-livecmp-e2e';
    try { var C = P._cfg(); C.layout = 1; C.tfs = [1, 5, 15, 60]; C.syms = []; C.mini = false; C.resume = null; C.cmpL = []; C.cmp = []; C.mm = Object.assign({}, C.mm, { col: true }); C.news = false; } catch (e) {}
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice_draw/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    document.querySelector('.tab[data-page="livecharts"]').click(); await W(400);
    var st = null;
    for (var k = 0; k < 160; k++) { await W(250); st = LC.state(); if (st.live && st.ea && st.gotHist && st.fresh) break; }
    check('Live Charts on EUR/USD, its EA (9.03) streaming', st && st.live && st.ea && st.ea.raw === 'EURUSD' && st.fresh, st && { live: st.live, ea: st.ea, fresh: st.fresh });
    var S = P._s(); if (S.px && S.px.t) P._lvClock(S.px.t * 1000 - Date.now() + 500);
    var pane = function () { return P._panes()[0]; };

    // ---- Compare ----
    var cb = document.getElementById('stpr-cmpbtn');
    check('the Compare button sits by the symbol button in Live Charts too', cb && cb.offsetWidth > 0 && cb.previousElementSibling && cb.previousElementSibling.id === 'stpr-sym', cb && cb.outerHTML.slice(0, 80));
    cb.click(); await W(200);
    var mn = document.getElementById('stpr-menu'), adds = Array.prototype.map.call(mn.querySelectorAll('[data-cmpadd]'), function (b) { return b.getAttribute('data-cmpadd') + '|' + b.textContent; });
    check('its list: the symbols your EAs stream - gold (your EA), not EUR/USD itself', mn.classList.contains('show') && adds.some(function (a) { return /^XAUUSD\|XAUUSD.*your EA/.test(a); }) && !adds.some(function (a) { return /^EURUSD/.test(a); }), adds);
    var q = mn.querySelector('#stpr-cmpq'); q.value = 'xau'; q.dispatchEvent(new Event('input', { bubbles: true })); await W(60);
    var adds2 = Array.prototype.map.call(mn.querySelectorAll('[data-cmpadd]'), function (b) { return b.getAttribute('data-cmpadd'); });
    check('its search: "xau" leaves gold', adds2.length === 1 && adds2[0] === 'XAUUSD', adds2);
    mn.querySelector('[data-cmpadd="XAUUSD"]').click();
    var F = null, c = null;
    for (k = 0; k < 120; k++) { await W(250); F = P._cmpFeed('XAUUSD'); c = pane().cmp && pane().cmp.XAUUSD; if (F && F.ea && F.px && F.base.length > 5 && c && !c.none) break; }
    check('gold compared: kept for chart 1 (Live Charts\' own list), its feed apart from the charts\' own', JSON.stringify(P._cfg().cmpL[0]) === JSON.stringify([{ s: 'XAUUSD', c: '#f5a623' }]) && F && F.cmpOnly && P._feeds().indexOf(F) < 0 && P._allFeeds().indexOf(F) >= 0, [P._cfg().cmpL, !!F]);
    check('its EA is asked for its prices: the watch names it beside EUR/USD', /EURUSD,XAUUSD|XAUUSD,EURUSD/.test(LC.sym()) && /XAUUSD/.test(LN.state().key || ''), [LC.sym(), LN.state().key]);
    check('its minutes and prices come from its EA (9.05)', F && F.ea && F.ea.raw === 'XAUUSD' && F.ea.v === '9.05' && F.base.length > 5 && F.px && F.px.b > 1000, F && { ea: F.ea, base: F.base.length, px: F.px });
    P._render(); await W(300);
    var lastCl = function () { var cc = pane().cmp.XAUUSD; for (var j = cc.cl.length - 1; j >= 0; j--) if (cc.cl[j] != null) return cc.cl[j]; return null; };
    check('a line of its closes on the 1-minute chart, its last at gold\'s live price', c && !c.none && Math.abs(lastCl() - F.px.b) < 0.6, [lastCl(), F.px && F.px.b]);
    var seen = [lastCl()]; for (k = 0; k < 24; k++) { await W(500); var lv = lastCl(); if (seen.indexOf(lv) < 0) seen.push(lv); if (seen.length >= 3) break; }
    check('it moves with gold\'s prices', seen.length >= 2, seen);
    var lg = pane().el.querySelector('.stpr-cmpl'), lgT = lg ? lg.textContent : '';
    check('the legend: EURUSD and its change, XAUUSD and its change, x', /^EURUSD[+−]\d+\.\d\d%XAUUSD[+−]\d+\.\d\d%×$/.test(lgT), lgT);
    // its x takes it off
    lg.querySelector('[data-cmpx="XAUUSD"]').click(); await W(400);
    check('x takes it off: no line, no legend, not kept', !(pane().cmp && pane().cmp.XAUUSD) && !pane().el.querySelector('.stpr-cmpl') && JSON.stringify(P._cfg().cmpL[0]) === '[]', [pane().cmp && Object.keys(pane().cmp), P._cfg().cmpL]);
    for (k = 0; k < 20 && /XAUUSD/.test(LC.sym()); k++) await W(250);
    check('...and gold\'s EA is no longer asked for its prices', !/XAUUSD/.test(LC.sym()), LC.sym());
    document.getElementById('stpr-menu').classList.remove('show');

    // ---- alerts on drawings, live ----
    var DW = P._dr(), px0 = P._s().px.b, now = Math.floor(Date.now() / 1000) + Math.round((P._lv().toff || 0) / 1000);
    var zone = { type: 'rect', a: { t: now - 3600, price: +(px0 + 0.0003).toFixed(5) }, b: { t: now + 3600, price: +(px0 - 0.0003).toFixed(5) }, alert: true, alMode: 'out', live: true };
    var tl = { type: 'trend', a: { t: now - 3600, price: +(px0 + 0.0010).toFixed(5) }, b: { t: now, price: +(px0 + 0.0005).toFixed(5) }, alert: true, live: true };
    DW.list.push(zone, tl); P._render(); await W(100);
    P._lvAlertScan('EURUSD', px0, px0 + 0.0001);
    check('a price move inside the zone, below the line: nothing rings', !zone.hitAt && !tl.hitAt);
    P._lvAlertScan('EURUSD', px0 + 0.0001, px0 + 0.00035);
    check('price leaves the zone (Exit): it rings, marked left, the price it rang at kept', zone.hitAt > 0 && zone.hitHow === 'out' && Math.abs(zone.hitPx - (px0 + 0.00035)) < 1e-9, [zone.hitAt, zone.hitHow, zone.hitPx]);
    var lvT = P._altLv(tl, now, false).lo;
    P._lvAlertScan('EURUSD', lvT - 0.0001, lvT + 0.00005);
    check('price crosses the trend line at its level now: it rings', tl.hitAt > 0, [tl.hitAt, lvT]);
    P._render(); await W(200);
    var fl = document.getElementById('stpr-flash').textContent;
    check('and says so (Alert: price ...)', /^Alert: price /.test(fl), fl);
    // where each reaches the phone (this EA is 9.03)
    var z2 = { type: 'rect', a: zone.a, b: zone.b, alert: true, alMode: 'in', live: true }; DW.list.push(z2); DW.sel = DW.list.indexOf(z2); DW.noProps = false; DW.at = pane(); P._props(); await W(60);
    var ab = document.querySelector('.stdb-bar [data-db="alert"]');
    check('a live zone\'s bell says it rings while Session Terminal is open, and reaches the phone with EA 9.05 (yours is 9.03)', ab && /Rings while Session Terminal is open\. Zone alerts reach your phone with EA 9\.05 on EURUSD \(yours is 9\.03\)/.test(ab.title), ab && ab.title);
    ab.click(); await W(40); var pp = P._dbar().pop();
    check('...its menu says so too', pp && /Zone alerts reach your phone with EA 9\.05/.test(pp.textContent), pp && pp.textContent);
    P._dbar().closePop();
    var t2 = { type: 'trend', a: tl.a, b: tl.b, alert: true, live: true }; DW.list.push(t2); DW.sel = DW.list.indexOf(t2); P._props(); await W(60);
    ab = document.querySelector('.stdb-bar [data-db="alert"]');
    check('a live trend line\'s bell: also sent to your phone by your EA on EURUSD, minute by minute (EA 9.03)', ab && /Also sent to your phone by your EA on EURUSD, with Session Terminal closed \(it follows the line minute by minute\)/.test(ab.title), ab && ab.title);
    check('the EA watches lines but not zones before 9.05', P._paEaOk(t2, P._s()) === true && P._paEaOk(z2, P._s()) === false);

    // ---- the rows the EA watches (price_alerts), against a stand-in database: nothing is written anywhere ----
    var real = window.__stSB, calls = [], idn = 0, pullRows = [];
    var chain = function (tbl) { var o = { _t: tbl };
      o.insert = function (row) { calls.push(['insert', tbl, row]); return { select: function () { return { single: async function () { return { data: { id: 'pa-' + (++idn) } }; } }; } }; };
      o.update = function (v) { return { eq: async function (k, id) { calls.push(['update', tbl, id, v]); return {}; } }; };
      o.upsert = async function () { return {}; };
      o.select = function () { return { in: async function () { return { data: pullRows }; }, eq: function () { return { maybeSingle: async function () { return { data: null }; } }; } }; };
      return o; };
    var stub = Object.create(real); stub.from = function (t) { return chain(t); };
    var sync = async function () { calls = []; window.__stSB = stub; window.currentUser = { id: 'u-livecmp-test' }; try { await P._alertSync(); } finally { window.__stSB = real; window.currentUser = null; } return calls; };
    DW.list.length = 0; DW.sel = null;
    var Z = { type: 'rect', a: { t: now - 3600, price: +(px0 + 0.0008).toFixed(5) }, b: { t: now + 3600, price: +(px0 + 0.0004).toFixed(5) }, alert: true, alMode: 'in', live: true };
    DW.list.push(Z); var c1 = await sync(), ins = c1.filter(function (x) { return x[0] === 'insert'; })[0];
    check('a zone\'s row: src rect, its bottom and top, Enter, its edges, trading time, on EUR/USD', ins && ins[1] === 'price_alerts' && ins[2].src === 'rect' && ins[2].sym === 'EURUSD' && ins[2].price === Z.b.price && ins[2].hi === Z.a.price && ins[2].mode === 1 && ins[2].mk === true
      && ins[2].starts_at === new Date(Z.a.t * 1000).toISOString() && ins[2].expires_at === new Date(Z.b.t * 1000).toISOString() && Z.paId === 'pa-1' && Z.paOn === true, [c1, Z.paId]);
    var c2 = await sync();
    check('nothing changed: nothing sent', c2.length === 0, c2);
    Z.b.price = +(px0 + 0.0003).toFixed(5); var c3 = await sync();
    check('the zone moved: its old row off, a new row (the EA judges it afresh)', c3.length === 2 && c3[0][0] === 'update' && c3[0][2] === 'pa-1' && c3[0][3].active === false && c3[1][0] === 'insert' && c3[1][2].price === Z.b.price && Z.paId === 'pa-2', c3);
    Z.hitAt = now; Z.hitHow = 'in'; Z.hitPx = px0 + 0.0003; var c4 = await sync();
    check('reached here, and no EA watches zones yet (9.03): its row marked rung, so nothing rings it later', c4.length === 1 && c4[0][0] === 'update' && c4[0][2] === 'pa-2' && c4[0][3].active === false && c4[0][3].fired_at && Z.paFired === true, c4);
    delete Z.hitAt; delete Z.hitHow; var c5 = await sync();
    check('armed again: a new row', c5.length === 1 && c5[0][0] === 'insert' && Z.paId === 'pa-3' && Z.paFired === false, c5);
    var TL = { type: 'trend', a: { t: now - 3600, price: +(px0 + 0.0010).toFixed(5) }, b: { t: now, price: +(px0 + 0.0005).toFixed(5) }, alert: true, live: true };
    DW.list.push(TL); var c6 = await sync(), ti = c6.filter(function (x) { return x[0] === 'insert'; })[0];
    check('a trend line\'s row: src trend, its price at its first point, its time and slope per trading second', ti && ti[2].src === 'trend' && ti[2].price === TL.a.price && ti[2].t0 === TL.a.t && Math.abs(ti[2].slope - (TL.b.price - TL.a.price) / 3600) < 1e-15 && ti[2].hi === null, ti);
    TL.hitAt = now; var c7 = await sync();
    check('a line reached here: its row left for the EA (it rings the phone)', c7.length === 0, c7);
    delete TL.hitAt; DW.list.splice(DW.list.indexOf(TL), 1); var c8 = await sync();
    check('a drawing deleted: its row off', c8.some(function (x) { return x[0] === 'update' && x[2] === TL.paId && x[3].active === false; }), c8);
    DW.list.push(TL); var c9 = await sync();
    check('the delete undone: a new row (the old one was turned off)', c9.length === 1 && c9[0][0] === 'insert' && c9[0][2].src === 'trend', c9);
    var HL = { type: 'hline', price: +(px0 - 0.001).toFixed(5), alert: true, live: true, paId: 'old-1', paPx: +(px0 - 0.001).toFixed(5), paOn: true };
    DW.list.push(HL); var c10 = await sync();
    check('a horizontal line\'s row from before today: kept as it is (nothing sent)', c10.length === 0 && HL.paId === 'old-1', c10);
    var cp = P._s(); DW.sel = DW.list.indexOf(Z); P._copy(); P._paste(); var pasted = DW.list[DW.list.length - 1];
    check('a pasted copy shares nothing of its original\'s row', pasted !== Z && !pasted.paId && !pasted.alert, pasted);
    pullRows = [{ id: Z.paId, active: false, fired_at: new Date((now + 60) * 1000).toISOString(), fired_px: px0 + 0.0005, fired_how: 'in' }];
    window.__stSB = stub; window.currentUser = { id: 'u-livecmp-test' }; try { await P._alertsPull(); } finally { window.__stSB = real; window.currentUser = null; }
    check('rung by the EA while away (read by its id): marked reached here, entered, at the EA\'s price', Z.hitAt === now + 60 && Z.hitHow === 'in' && Math.abs(Z.hitPx - (px0 + 0.0005)) < 1e-9 && Z.paFired === true, [Z.hitAt, Z.hitHow, Z.hitPx]);
    check('no page errors', errs.length === 0, errs);
  } catch (e) { check('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(results);
})()
