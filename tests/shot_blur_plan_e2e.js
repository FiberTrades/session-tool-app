(async function () {
  // Blur before sharing + Check my plan (Nestor, 24 Oct 2026: "do screen shot blurr and also on copy image links"; the AO list's "AI
  // check of a trade against your plan, from the chart"). The Charts tab on real EUR/USD candles of Thu 1 Oct 2026 and Trade
  // Replay on a made-up short, signed out; the assistant's answer is a stand-in (fetch), never a real call.
  // Run: python tests/browser_test.py tests/shot_blur_plan_e2e.js   (and with E2E_MOBILE=375x812 for the phone)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
  var bias0 = null, SH = null, realFetch = window.fetch, realPb = window.__stPb, realAnchorClick = HTMLAnchorElement.prototype.click;
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB && window.__stShot && window.__stPlanCheck); i++) await W(100);
    await W(1000);
    SH = window.__stShot; SH.setHide(false);
    var P = window.__stPractice, mob = innerWidth < 700;
    ok('the two modules are there (window.__stShot, window.__stPlanCheck)', !!(SH && SH.edit && SH.mask && window.__stPlanCheck.open));
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.look = {}; C.mini = false; C.max = true;
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 120 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._goto('14:30'); await W(500); P._render(); await W(150);

    // ---- the snapshot menu ----
    var sb = document.getElementById('stpr-snapbtn'); sb.click(); await W(60);
    var mn = document.getElementById('stpr-menu'), it = function (k) { return mn.querySelector('[data-snap="' + k + '"]'); };
    ok('the menu: Copy image, Copy link, Download image, Blur then share, Hide trade sizes and money, Check my bias',
      it('img') && it('link') && /Download image/.test(it('dl').textContent) && /Blur, then share/.test(it('edit').textContent) && /Hide trade sizes and money/.test(it('hide').textContent) && /Check my bias/.test(it('plan').textContent),
      mn.textContent);
    it('hide').click(); await W(40);
    ok('"Hide trade sizes and money" switches on, the menu stays open', mn.classList.contains('show') && it('hide').classList.contains('on') && SH.hideOn() && localStorage.getItem('st_shot_hide') === '1');
    it('hide').click(); await W(40);
    ok('and off again', !it('hide').classList.contains('on') && !SH.hideOn());
    sb.click(); await W(40);

    // ---- mask: square blocks over the rectangle, nothing outside it ----
    var mk = function () { var c = document.createElement('canvas'); c.width = 200; c.height = 100; var g = c.getContext('2d'); for (var x = 0; x < 200; x++) { g.fillStyle = x % 2 ? '#000' : '#fff'; g.fillRect(x, 0, 1, 100); } c.__dpr = 1; return c; };
    var px = function (c, x, y) { return Array.prototype.slice.call(c.getContext('2d').getImageData(x, y, 1, 1).data, 0, 3); };
    var same = function (a, b) { return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; };
    var c1 = mk(); SH.mask(c1, [{ x: 18, y: 18, w: 90, h: 45 }]);
    var inA = px(c1, 20, 20), inB = px(c1, 21, 20), outA = px(c1, 150, 20), outB = px(c1, 151, 20);
    ok('mask: inside the rectangle the stripes are gone (a flat grey block)', same(inA, inB) && inA[0] > 60 && inA[0] < 200, [inA, inB]);
    ok('mask: outside it, untouched', !same(outA, outB), [outA, outB]);
    var c2 = mk(); c2.__sens = [{ x: 10, y: 10, w: 60, h: 30 }]; SH.out(c2);
    ok('out() with the switch off leaves the picture alone', !same(px(c2, 12, 12), px(c2, 13, 12)));
    SH.setHide(true); SH.out(c2);
    ok('out() with the switch on blurs what the chart handed over (its trade tags)', same(px(c2, 12, 12), px(c2, 13, 12)) && !same(px(c2, 150, 12), px(c2, 151, 12)));
    SH.setHide(false);

    // ---- the Charts tab's picture carries what the blur needs ----
    var cv = P._snap();
    ok('the picture knows its pixel ratio, window and trade tags (none in Replay)', cv && cv.__dpr >= 1 && cv.__doc === document && Array.isArray(cv.__sens) && cv.__sym === 'EURUSD' && cv.__live === false, cv && [cv.__dpr, cv.__sym, cv.__live, cv.__sens]);

    // ---- the blur editor ----
    var pr = SH.edit(mk()); await W(80);
    var ov = document.querySelector('.stshot-ov'), pv = ov && ov.querySelector('.stshot-cv');
    ok('the blur editor opens over the app with the picture', !!(ov && pv && pv.width === 200), pv && [pv.width, pv.height]);
    var b = pv.getBoundingClientRect(), at = function (x, y) { return { clientX: b.left + x / 200 * b.width, clientY: b.top + y / 100 * b.height }; };
    var drag = function (x0, y0, x1, y1) { pv.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ bubbles: true, pointerId: 1 }, at(x0, y0)))); pv.dispatchEvent(new PointerEvent('pointermove', Object.assign({ bubbles: true, pointerId: 1 }, at(x1, y1)))); pv.dispatchEvent(new PointerEvent('pointerup', Object.assign({ bubbles: true, pointerId: 1 }, at(x1, y1)))); };
    drag(10, 10, 90, 60); await W(30); drag(120, 20, 121, 21); await W(30);
    ov.querySelector('[data-sh="dl"]').click();
    var res = await pr;
    ok('a drag makes a blur box (a tiny one does not); Download hands back the finished picture', res && res.action === 'dl' && same(px(res.cv, 30, 30), px(res.cv, 31, 30)) && !same(px(res.cv, 150, 30), px(res.cv, 151, 30)) && !same(px(res.cv, 120, 20), px(res.cv, 121, 20)), res && res.action);
    ok('and the editor is gone', !document.querySelector('.stshot-ov'));
    pr = SH.edit(mk()); await W(60); drag(10, 10, 90, 60); await W(20);
    document.querySelector('.stshot-ov [data-sh="undo"]').click(); await W(20);
    document.querySelector('.stshot-ov [data-sh="img"]').click(); res = await pr;
    ok('Undo takes the last box away', res && res.action === 'img' && !same(px(res.cv, 30, 30), px(res.cv, 31, 30)));
    pr = SH.edit(mk()); await W(60); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); res = await pr;
    ok('Escape closes it with nothing shared', res === null && !document.querySelector('.stshot-ov'));
    if (mob) {
      pr = SH.edit(P._snap()); await W(80); ov = document.querySelector('.stshot-ov');
      var over = Array.prototype.filter.call(ov.querySelectorAll('button, label'), function (x) { var r = x.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; });
      var cr = ov.querySelector('.stshot-cv').getBoundingClientRect();
      ok('phone: every control of the editor on screen, the picture fits the width', !over.length && cr.right <= innerWidth + 1 && ov.scrollWidth <= innerWidth + 1, [over.map(function (x) { return x.textContent; }), cr.width, innerWidth]);
      ov.querySelector('[data-sh="close"]').click(); await pr;
    }

    // ---- from the menu: Blur, then share -> Copy image (the clipboard holds the picture); Download (a PNG file) ----
    var fl = document.getElementById('stpr-flash');
    sb.click(); await W(40); it('edit').click(); await W(120);
    ov = document.querySelector('.stshot-ov');
    ok('Blur, then share opens the editor with the chart', !!ov && ov.querySelector('.stshot-cv').width === P._snap().width);
    fl.textContent = ''; ov.querySelector('[data-sh="img"]').click();
    for (k = 0; k < 40 && !/Image copied|could not be copied|cannot copy/.test(fl.textContent); k++) await W(100);
    var clip = null; try { var items = await navigator.clipboard.read(); clip = items.length ? items[0].types : null; } catch (e) { clip = String(e); }
    ok('its Copy image puts the blurred picture on the clipboard', /Image copied/.test(fl.textContent) && Array.isArray(clip) && clip.indexOf('image/png') >= 0, [fl.textContent, clip]);
    var dl = []; HTMLAnchorElement.prototype.click = function () { dl.push({ name: this.download, href: this.href }); };
    sb.click(); await W(40); it('dl').click(); for (k = 0; k < 30 && !dl.length; k++) await W(100);
    HTMLAnchorElement.prototype.click = realAnchorClick;
    ok('Download image saves a PNG named session-terminal-<date>', dl.length === 1 && /^session-terminal-\d{8}-\d{4}\.png$/.test(dl[0].name) && /^blob:/.test(dl[0].href) && /Image saved/.test(fl.textContent), dl);

    // ---- Check my bias (Check my plan until 27 Oct 2026; Nestor: only his bias - its rows, its charts and notes; the setup check and
    //      its "Check this chart" button gone, "feels like a gimmick and i hate it") ----
    var sent = [];
    window.fetch = function (u, o) { if (String(u).indexOf('/functions/v1/st-assistant') >= 0) sent.push(o && o.body); return realFetch.apply(this, arguments); };
    // today's posted Session Bias: gold in New York (the active slot) and EUR/USD in London with its two charts
    bias0 = { slots: data.biasSlots, bias: data.bias, act: data.activeBiasSlot, rules: data.weeklyRules };
    var mkSlot = function (o) { var sl = Object.assign({ news: 'None', tvLinks: [], date: todayDateStr(), sessionDate: todayDateStr() }, o); sl.copiedAt = new Date(new Date().setHours(8, 12, 0, 0)).toISOString(); sl.postedSig = biasSig(sl); return sl; };
    var slEU = mkSlot({ symbol: 'EUR/USD', sessionName: 'London', mode: 'Execution', structure: 'Trending', structureLtf: 'Initiating', location: 'Discount Edge', direction: 'Bullish', directionLtf: 'Bullish', notes: 'London took the Asia high; buying the 50%.',
      tvLinks: [{ url: 'https://www.tradingview.com/x/AbCd1234/', notes: 'The range from Friday' }, { url: 'https://www.tradingview.com/x/EfGh5678/', notes: 'The sweep at 08:00' }] });
    var slXAU = mkSlot({ symbol: 'XAU/USD', sessionName: 'New York', mode: 'Observation', structure: 'Ranging', location: 'Premium Edge', direction: 'Bearish', news: 'Impact News', notes: 'CPI at 13:30.' });
    data.biasSlots = [slXAU, slEU]; data.activeBiasSlot = 0; data.bias = slXAU;
    data.weeklyRules = Object.assign({}, data.weeklyRules || {}); data.weeklyRules[getCalendarWeekKey(new Date())] = { rule: 'No entry before the London open' };
    sb.click(); await W(40);
    ok('the snapshot menu says Check my bias', /^Check my bias$/.test(it('plan').textContent.trim()), it('plan').textContent);
    it('plan').click(); await W(150);
    var po = document.querySelector('.stpc-ov'), q = function (s) { return po && po.querySelector(s); }, qa = function (s) { return po ? Array.prototype.slice.call(po.querySelectorAll(s)) : []; };
    ok('Check my bias opens: the bias only - no chart picture, no setups, no "Check this chart"', !!po && /Check my bias/.test(q('.stpc-hd').textContent) && !q('.stpc-img') && !q('.stpc-setups') && !q('[data-pc="go"]') && !/Check this chart|Your setup/.test(po.textContent),
      po && po.textContent.slice(0, 200));
    var bb = q('.stpc-bias'), bsw = qa('.stpc-bsw button');
    ok('Your bias today: the chart\'s symbol picked (EUR/USD · London, not the active gold), a switch to the other posted one',
      !!bb && q('.stpc-bd').firstElementChild === bb && /Your bias today/.test(bb.textContent) && bsw.length === 2 && bsw[1].classList.contains('on') && /EUR\/USD · London/.test(bsw[1].textContent) && /XAU\/USD · New York/.test(bsw[0].textContent),
      bb && bb.textContent.slice(0, 160));
    var bt2 = q('.stpc-bgrid').textContent;
    ok('...its mode, HTF/LTF structure, location, direction, the week\'s rule, notes, and when it was posted',
      /Mode\s*Execution/.test(bt2) && /HTF\s*Trending\s*·\s*LTF\s*Initiating/.test(bt2) && /Discount Edge/.test(bt2) && /↑ Bullish/.test(bt2) && !!q('.stpc-bgrid .up') && /No entry before the London open/.test(bt2) && /London took the Asia high/.test(bt2) && /Posted 08:12/.test(bb.textContent), bt2);
    var chs = qa('.stpc-ch'), im = chs.map(function (c) { var g = c.querySelector('img'); return g ? g.getAttribute('src') : ''; });
    ok('...and its own charts: HTF and LTF, each its TradingView picture (opening the chart) and its note',
      chs.length === 2 && /^HTF/.test(chs[0].textContent) && /^LTF/.test(chs[1].textContent) && im[0] === 'https://s3.tradingview.com/snapshots/a/AbCd1234.png' && im[1] === 'https://s3.tradingview.com/snapshots/e/EfGh5678.png'
      && chs[0].querySelector('a').getAttribute('href') === 'https://www.tradingview.com/x/AbCd1234/' && /The range from Friday/.test(chs[0].textContent) && /The sweep at 08:00/.test(chs[1].textContent), [chs.length, im]);
    bsw[0].click(); await W(40);
    ok('the switch: gold in New York, its own read (Observation, Bearish with its down arrow, Impact News), no charts posted with it', qa('.stpc-bsw button')[0].classList.contains('on') && /Observation/.test(q('.stpc-bgrid').textContent) && /↓ Bearish/.test(q('.stpc-bgrid').textContent) && /Impact News/.test(q('.stpc-bgrid').textContent) && !!q('.stpc-bgrid .dn') && !q('.stpc-charts'),
      q('.stpc-bgrid').textContent);
    ok('nothing goes to the assistant', sent.length === 0, sent.length);
    if (mob) {
      var box = q('.stpc').getBoundingClientRect(), wide = qa('button, .stpc-ch').filter(function (x) { return x.getBoundingClientRect().right > innerWidth + 1; });
      ok('phone: a sheet from the bottom, nothing past the screen', box.left >= -1 && box.right <= innerWidth + 1 && Math.abs(box.bottom - innerHeight) < 2 && !wide.length, [box.left, box.right, box.bottom, innerHeight, wide.length]);
    }
    q('[data-pc="close"]').click(); await W(30);
    if (typeof setLanguage === 'function') {
      setLanguage('es'); await W(300);
      window.__stPlanCheck.open({ sym: 'EURUSD' }); await W(80); po = document.querySelector('.stpc-ov');
      var esT = (q('.stpc-bias') || {}).textContent || '';
      ok('in Spanish: Revisar mi sesgo, Tu sesgo de hoy, Modo, the values translated, Publicado', /Revisar mi sesgo/.test(q('.stpc-hd').textContent) && /Tu sesgo de hoy/.test(esT) && /Modo/.test(esT) && /Publicado 08:12/.test(esT) && !/Execution/.test(esT), esT.slice(0, 220));
      q('[data-pc="close"]').click(); await W(30); setLanguage('en'); await W(300);
    }
    window.__stPlanCheck.open({ sym: 'EURUSD' }); await W(60);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); await W(40);
    ok('Escape closes it', !document.querySelector('.stpc-ov'));
    window.__stPlanCheck.open({ sym: 'EURUSD' }); window.__stPlanCheck.open({ sym: 'EURUSD' }); await W(60);
    ok('opened twice: still one Check my bias on screen', document.querySelectorAll('.stpc-ov').length === 1);
    document.querySelector('.stpc-ov [data-pc="close"]').click(); await W(30);
    var e1 = SH.edit(mk()), e2 = SH.edit(mk()); await W(60);
    ok('and one blur editor (the first one closes with nothing shared)', document.querySelectorAll('.stshot-ov').length === 1 && (await e1) === null);
    document.querySelector('.stshot-ov [data-sh="close"]').click(); await e2;
    data.biasSlots.forEach(function (sl) { sl.copiedAt = null; });
    window.__stPlanCheck.open({ sym: 'EURUSD' }); await W(80); po = document.querySelector('.stpc-ov');
    ok('nothing posted today: "No bias posted today" and a link to Session Bias', /No bias posted today/.test((q('.stpc-bnone') || {}).textContent || '') && !!q('[data-pc="openbias"]') && !q('.stpc-bgrid'));
    q('[data-pc="openbias"]').click(); await W(400);
    ok('...the link closes it and opens Session Bias', !document.querySelector('.stpc-ov') && document.querySelector('.tab[data-page="bias"]').classList.contains('active'));
    window.fetch = realFetch;
    ok('the Academy hands over its written lessons with their titles', window.STSCHOOL && window.STSCHOOL.lessons().some(function (l) { return l.id === '0.1' && l.title === 'What forex trading actually is'; }));

    // ---- Trade Replay's snapshot menu too ----
    var R = window.__stReplay;
    if (R && !mob) {
      R.open({ mt5Ticket: 999999905, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 });
      for (k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(800);
      document.getElementById('strp-snapbtn').click(); await W(40); var rm = document.getElementById('strp-menu');
      ok('Trade Replay: Download image, Blur then share, Hide trade sizes and money', rm.querySelector('[data-snap="dl"]') && rm.querySelector('[data-snap="edit"]') && rm.querySelector('[data-snap="hide"]'), rm.textContent);
      var rc = R._snap();
      ok("Trade Replay's picture hands over its entry and stop tags", rc && rc.__dpr >= 1 && Array.isArray(rc.__sens) && rc.__sens.length >= 2, rc && rc.__sens);
      document.body.click(); R.close(); await W(200);
    }
    ok('no page errors', !errs.length, errs.slice(0, 3));
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  finally { try { if (bias0) { data.biasSlots = bias0.slots; data.bias = bias0.bias; data.activeBiasSlot = bias0.act; data.weeklyRules = bias0.rules; } window.fetch = realFetch; window.__stPb = realPb; HTMLAnchorElement.prototype.click = realAnchorClick; if (SH) SH.setHide(false); } catch (e) {} }
  return JSON.stringify(out);
})()
