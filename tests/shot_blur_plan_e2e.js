(async function () {
  // Blur before sharing + Check my plan (Nestor, 24 Oct 2026: "do screen shot blurr and also on copy image links"; the AO list's "AI
  // check of a trade against your plan, from the chart"). The Charts tab on real EUR/USD candles of Thu 1 Oct 2026 and Trade
  // Replay on a made-up short, signed out; the assistant's answer is a stand-in (fetch), never a real call.
  // Run: python tests/browser_test.py tests/shot_blur_plan_e2e.js   (and with E2E_MOBILE=375x812 for the phone)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
  var SH = null, realFetch = window.fetch, realPb = window.__stPb, realAnchorClick = HTMLAnchorElement.prototype.click;
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
    ok('the menu: Copy image, Copy link, Download image, Blur then share, Hide trade sizes and money, Check my plan',
      it('img') && it('link') && /Download image/.test(it('dl').textContent) && /Blur, then share/.test(it('edit').textContent) && /Hide trade sizes and money/.test(it('hide').textContent) && /Check my plan/.test(it('plan').textContent),
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

    // ---- Check my plan ----
    var sent = [], answer = { status: 200, body: { plan: { summary: 'Price location fits; look at the stop before acting.', items: [
      { rule: 'Price location', verdict: 'fits', why: 'Price sits in the lower half of the drawn range.', lesson: '3.4' },
      { rule: 'Stop loss', verdict: 'no', why: 'The stop sits about 5 pips below entry.', lesson: '5.2' }] }, model: 'x' }, ms: 3200 };
    window.fetch = function (u, o) {
      if (String(u).indexOf('/functions/v1/st-assistant') >= 0) { sent.push(JSON.parse(o.body)); var rb = new Response(JSON.stringify(answer.body), { status: answer.status, headers: { 'content-type': 'application/json' } }); return new Promise(function (r) { setTimeout(function () { r(rb); }, answer.ms || 400); }); }
      return realFetch.apply(this, arguments);
    };
    window.__stPlanCheck._token = function () { return Promise.resolve('test-token'); };
    var PB = [{ id: 'p1', name: 'Range Mitigation', desc: 'London takes a high, I buy the reaction.', rec: {} }, { id: 'p2', name: '50% Mitigation', rec: {} }];
    window.__stPb = Object.assign({}, realPb || {}, { list: function () { return PB; }, byId: function () { return null; },
      describe: function () { return [{ label: 'Price location', text: 'Discount half' }, { label: 'Stop loss', text: 'Below the swing low, 2-4 pips' }]; } });
    try { localStorage.removeItem('st_plancheck_setup'); } catch (e) {}
    var opened = []; var realOpenAt = window.STSCHOOL && window.STSCHOOL.openAt; if (window.STSCHOOL) window.STSCHOOL.openAt = function (id) { opened.push(id); };
    sb.click(); await W(40); it('plan').click(); await W(150);
    var po = document.querySelector('.stpc-ov'), q = function (s) { return po && po.querySelector(s); }, qa = function (s) { return po ? Array.prototype.slice.call(po.querySelectorAll(s)) : []; };
    ok('Check my plan opens with the chart picture', !!po && /^data:image\/jpeg;base64,/.test(q('.stpc-img').getAttribute('src')));
    ok('the member\'s setups to pick from (the first picked) and its rules', qa('.stpc-setups button').length === 2 && qa('.stpc-setups button')[0].classList.contains('on') && qa('.stpc-rules span').length === 2 && /Price location: Discount half/.test(q('.stpc-rules').textContent));
    qa('.stpc-setups button')[1].click(); await W(30);
    ok('picking another setup', qa('.stpc-setups button')[1].classList.contains('on') && !qa('.stpc-setups button')[0].classList.contains('on'));
    q('[data-pc="go"]').click(); await W(20);
    ok('while it reads: "Reading your chart…", the button held', /Reading your chart/.test(q('[data-pc="go"]').textContent) && q('[data-pc="go"]').disabled);
    ok('...a progress bar and the step it is on, and a placeholder row for each of the setup\'s rules',
      !!q('.stpc-prog .stpc-bar i') && /Reading the chart/.test(q('.stpc-step').textContent) && qa('.stpc-sk').length === 2 && /Price location/.test(qa('.stpc-sk')[0].textContent) && q('.stpc-prog').getAttribute('role') === 'status',
      [q('.stpc-step') && q('.stpc-step').textContent, qa('.stpc-sk').length]);
    await W(120);
    ok('...the bar on its way', parseFloat(getComputedStyle(q('.stpc-bar i')).width) > 0, q('.stpc-bar i').style.width);
    for (k = 0; k < 40 && !/Checking your 2 rules/.test((q('.stpc-step') || {}).textContent || ''); k++) await W(100);
    ok('...the step line moves on: Checking your 2 rules', /Checking your 2 rules/.test((q('.stpc-step') || {}).textContent || ''), (q('.stpc-step') || {}).textContent);
    for (k = 0; k < 80 && !qa('.stpc-row:not(.stpc-sk)').length; k++) await W(100);
    var rows = qa('.stpc-row:not(.stpc-sk)');
    ok('the answer in: the bar and the placeholders gone', !q('.stpc-prog') && !qa('.stpc-sk').length);
    ok('the answer: each rule with Fits / Doesn\'t fit and why', rows.length === 2 && rows[0].querySelector('.stpc-v.fits').textContent === 'Fits' && rows[1].querySelector('.stpc-v.no').textContent === "Doesn't fit" && /5 pips/.test(rows[1].textContent) && /look at the stop/.test(q('.stpc-sum').textContent), rows.map(function (r) { return r.textContent; }));
    ok('with the Academy lesson that teaches it, by its real title', /Lesson 5\.2 · Stop placement/.test(rows[1].querySelector('.stpc-les').textContent), rows[1].querySelector('.stpc-les') && rows[1].querySelector('.stpc-les').textContent);
    var s0 = sent[0] || {};
    ok('what went to the assistant: mode plancheck, the picture (JPEG), the picked setup and its rules, the lessons, the language',
      sent.length === 1 && s0.mode === 'plancheck' && s0.image && s0.image.media_type === 'image/jpeg' && s0.image.data.length > 2000 && s0.plan.name === '50% Mitigation' && s0.plan.rules.length === 2
      && Array.isArray(s0.lessons) && s0.lessons.some(function (l) { return l.id === '5.2' && l.title === 'Stop placement'; }) && s0.context.lang === 'en' && s0.chart.sym === 'EURUSD' && Array.isArray(s0.bias),
      { mode: s0.mode, plan: s0.plan, lessons: s0.lessons && s0.lessons.length, chart: s0.chart });
    ok('the setup picked is remembered for next time', localStorage.getItem('st_plancheck_setup') === '50% Mitigation');
    if (mob) {
      var box = q('.stpc').getBoundingClientRect(), wide = qa('button, .stpc-row').filter(function (x) { return x.getBoundingClientRect().right > innerWidth + 1; });
      ok('phone: a sheet from the bottom, nothing past the screen', box.left >= -1 && box.right <= innerWidth + 1 && Math.abs(box.bottom - innerHeight) < 2 && !wide.length, [box.left, box.right, box.bottom, innerHeight, wide.length]);
    }
    rows[1].querySelector('.stpc-les').click(); await W(60);
    ok('the lesson link closes it and opens that lesson in the Academy', !document.querySelector('.stpc-ov') && opened[0] === '5.2', opened);
    answer = { status: 429, body: { error: "That's 30 chart checks today. More tomorrow." } };
    window.__stPlanCheck.open({ canvas: P._snap() }); await W(80); po = document.querySelector('.stpc-ov');
    q('[data-pc="go"]').click(); for (k = 0; k < 30 && !q('.stpc-err'); k++) await W(100);
    ok('a refusal from the assistant is shown in its own words', /30 chart checks today/.test((q('.stpc-err') || {}).textContent || ''));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); await W(40);
    ok('Escape closes it', !document.querySelector('.stpc-ov'));
    window.__stPlanCheck.open({ canvas: P._snap() }); window.__stPlanCheck.open({ canvas: P._snap() }); await W(60);
    ok('opened twice: still one Check my plan on screen', document.querySelectorAll('.stpc-ov').length === 1);
    document.querySelector('.stpc-ov [data-pc="close"]').click(); await W(30);
    var e1 = SH.edit(mk()), e2 = SH.edit(mk()); await W(60);
    ok('and one blur editor (the first one closes with nothing shared)', document.querySelectorAll('.stshot-ov').length === 1 && (await e1) === null);
    document.querySelector('.stshot-ov [data-sh="close"]').click(); await e2;
    PB = []; window.__stPlanCheck.open(); await W(80); po = document.querySelector('.stpc-ov');
    ok('opened with no picture handed over it takes the chart itself; no setups yet: it says where to make one', !!q('.stpc-img') && /Save one in Session Review/.test(po.textContent) && !q('[data-pc="go"]'));
    q('[data-pc="close"]').click(); await W(30);
    if (window.STSCHOOL) window.STSCHOOL.openAt = realOpenAt;
    window.__stPb = realPb; window.fetch = realFetch; window.__stPlanCheck._token = null;
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
  finally { try { window.fetch = realFetch; window.__stPb = realPb; HTMLAnchorElement.prototype.click = realAnchorClick; if (SH) SH.setHide(false); } catch (e) {} }
  return JSON.stringify(out);
})()
