(async function () {
  // The landing page overhaul (Nestor, 20 Oct 2026: "here add charts. live. replay so this way you can get rid of card 05. also get
  // rid of 07 ... in also inside remove the on your phone and have in there something about the academy and community instead ...
  // everything else is good and i want you to build it"; the price card: "combine the 3 circled ones and definately mention that you
  // can place trades on MT5 from session terminal"). Checks the landing inside the app (#lp-front, LP_HTML) in English and Spanish,
  // and that index.html's scripts parse. Run: python tests/browser_test.py tests/landing_overhaul_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    // index.html (generated from LP_HTML): every inline script parses
    var html = await fetch('/index.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
    doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
    ok('index.html: every inline script parses', !bad.length, bad);
    // the landing inside the app
    var fr; for (var i = 0; i < 100 && !(fr = document.getElementById('lp-front')); i++) await W(100);
    var w = fr && fr.contentWindow; for (i = 0; i < 100 && !(w && w.document && w.document.querySelector('.pricing')); i++) await W(100);
    var D = w.document; await W(800);
    var bad2 = []; D.querySelectorAll('script:not([src])').forEach(function (s, k) { try { new w.Function(s.textContent); } catch (e) { bad2.push(k + ': ' + e.message); } });
    ok('the app\'s landing (#lp-front): its scripts parse and the reveal observer ran (lp-io)', !bad2.length && D.documentElement.classList.contains('lp-io'), [bad2, D.documentElement.className]);
    var tx = function (el) { return (el && el.textContent || '').replace(/\s+/g, ' ').trim(); };
    ok('the hero line: "A trading journal with your MT5 built in…"', /^A trading journal with your MT5 built in: plan the session, trade it from live charts, and review every trade, in one place\.$/.test(tx(D.querySelector('[data-i18n="hero.lede"]'))), tx(D.querySelector('[data-i18n="hero.lede"]')));
    var secs = Array.prototype.slice.call(D.querySelectorAll('section.feat'));
    var nums = secs.map(function (x) { return tx(x.querySelector('.feat-num')); }), eyes = secs.map(function (x) { return tx(x.querySelector('.feat-eyebrow')); }), revs = secs.map(function (x) { return x.classList.contains('rev'); });
    ok('four sections in the order of a trading day: Bias & Review, Charts · Live · Replay (Session Live folded in, 20 Oct 2026), MT5 Sync, Series & Stats', nums.join() === '01,02,03,04' && eyes[0] === 'Bias & Review' && eyes[1] === 'Charts · Live · Replay' && /MT5 Sync/.test(eyes[2]) && /Series of 10/.test(eyes[3]), [nums, eyes]);
    ok('...picture and words alternate sides', revs.join() === 'false,true,false,true', revs);
    ok('...no separate Replay or Academy & Community section ("get rid of card 05 ... also get rid of 07")', !/Practise on any day|Learn the method/.test(D.body.textContent) && !D.querySelector('[data-i18n="n1.p2"]'));
    var s2 = secs[1];
    // 20 Oct 2026: "can these be combined somehow? ... combine the 02 and 03 texts? but dont add extra text", the title "Trade with MT5
    // from Session Terminal", and "as the animation ... a chart where you can see a live trade being taken and the phone ... displaying the notifications"
    ok('02 is Charts and Session Live in one: their words merged (one paragraph, 7 points), no separate Session Live section', tx(s2.querySelector('h2')) === 'Trade with MT5 from Session Terminal.' && /Session Live shows your open trades, today’s risk and the next red news/.test(tx(s2)) && /Replay any day of the past year with a Replay account/.test(tx(s2)) && /Press your execution key and click where your stop goes/.test(tx(s2)) && s2.querySelectorAll('.feat-copy li').length === 7 && s2.querySelectorAll('.feat-copy p').length === 1 && !/Your session, live|Session Review turns into Session Live/.test(tx(D.body)) && !/Press O\b/.test(tx(D.body)), tx(s2).slice(0, 200));
    var X = s2.querySelector('#slX');
    ok('...its picture: the chart with a live sell (entry, SL, TP, then BE and +2.10R) and the phone with the notifications; the 8-chart grid and the monitor are gone', X && X.querySelector('svg .slX-tr') && X.querySelector('svg .slX-sl .be') && /\+2\.10R/.test(X.querySelector('svg .slX-ex').textContent) && X.querySelector('.slX-ph .slA-phone .slA-stack') && !D.querySelector('.mc-grid, #slM, .slA-solo'));
    w.__lpTrade(2);
    ok('...one timeline: a notification sets the chart to the same moment (window.__lpTrade)', X.getAttribute('data-s') === '2');
    var more = D.querySelector('.more-grid'), mh = Array.prototype.map.call(more.querySelectorAll('.mcard h3'), tx);
    ok('Also inside: a plain list (no boxes), 8 things - Academy where Weekly review was, Community below it; no On your phone', more.classList.contains('ml') && mh.length === 8 && mh[5] === 'Academy' && mh[7] === 'Community' && mh.indexOf('Weekly review') < 0 && !/On your phone/.test(tx(more)) && getComputedStyle(more.querySelector('.mcard')).borderTopWidth === '0px', mh);
    var plist = D.querySelector('.plan.popular .plist'), li = plist.querySelectorAll('li');
    ok('Journal Pro: first line, in bold, "Place trades on MT5 from Session Terminal", the three chart lines combined; 10 lines', li.length === 10 && li[0].querySelector('strong') && tx(li[0].querySelector('strong')) === 'Place trades on MT5 from Session Terminal' && /replay any day of the past year/.test(tx(li[0])) && !/Many more features/.test(tx(plist)), [li.length, tx(li[0])]);
    ok('the trial strip says what the trial includes', /Live and Replay charts/.test(tx(D.querySelector('[data-i18n="pr.trial_desc"]'))));
    var qs = Array.prototype.map.call(D.querySelectorAll('.faq-q summary'), tx);
    ok('FAQ: 11 questions, without the four Nestor struck out (20 Oct 2026: "delete these 4")', qs.length === 11 && /Can I place trades/.test(qs[2]) && qs[3] === 'How do I connect MT5?' && /Do I need MetaTrader 5/.test(qs[6]) && !qs.some(function (q) { return /What is Replay|Do alerts reach my phone|free trial\?|Who can see my journal/.test(q); }), qs);
    // 20 Oct 2026: "move this question into questions" + "can you combine these together? they talk about the same thing"
    var mq = D.querySelector('.faq-q summary[data-i18n="hm.toggle"]');
    ok('What markets can I trade? is the second question (no longer under Pricing), the market names in white', qs[1] === 'What markets can I trade?' && !D.querySelector('.pr-markets') && !D.querySelector('#pricing [data-i18n="hm.toggle"]') && mq && /^Forex, Indices, Gold, Oil, Crypto and Stocks\. All data/.test(tx(mq.parentNode.querySelector('p'))) && mq.parentNode.querySelector('p .hm-hi'), qs[1]);
    var pq = D.querySelector('.faq-q summary[data-i18n="faq.q11"]');
    ok('chart prices and MT5 staying open are one question now, with both answers', qs[4] === 'Where do the prices come from, and does MT5 need to stay open?' && !qs.some(function (q) { return q === 'Does MT5 need to stay open?' || q === 'Where do the chart prices come from?'; }) && /up to 8 charts/.test(tx(pq.parentNode.querySelector('p'))) && /MT5 stays open on your computer or a VPS/.test(tx(pq.parentNode.querySelector('p'))) && !D.querySelector('[data-i18n="faq.q14"]'), qs[4]);
    ok('no savings comparison on the landing page (Nestor, 20 Oct 2026: "dont like it, delete that" - it runs as weekly reels instead)', !D.getElementById('save') && !D.querySelector('.save, .svb, .hsv') && !/300\.66|Ten tools\. One subscription/.test(D.body.textContent));
    ok('no SMC / liquidity wording on the page', !/\bSMC\b|liquidity/i.test(D.body.textContent));
    var md = D.querySelector('meta[property="og:description"]');
    ok('the link preview says what it is now', md && /trading journal with your MT5 built in/.test(md.getAttribute('content')), md && md.getAttribute('content'));
    // Spanish
    D.querySelector('.lang-sq[data-lang="es"]').click(); await W(400);
    var es = function (k) { return tx(D.querySelector('[data-i18n="' + k + '"]')); };
    ok('in Spanish: the hero line, Gráficos · En vivo · Replay, the price card, the new FAQ and Academia y Comunidad', /^Un diario de trading con tu MT5 integrado/.test(es('hero.lede')) && es('n5.eyebrow') === 'Gráficos · En vivo · Replay' && /^Abre operaciones en MT5 desde Session Terminal/.test(es('pr.jp1')) && es('faq.q10') === '¿Cómo conecto MT5?' && es('g4.h3') === 'Academia' && es('g3.h3') === 'Comunidad' && /Sesión en Vivo muestra tus operaciones abiertas/.test(es('n5.p2')) && /mueve a BE y cierra desde la tarjeta/.test(es('n5.li4b')), [es('hero.lede'), es('n5.eyebrow'), es('pr.jp1').slice(0, 50), es('faq.q10'), es('g4.h3')]);
    var leftEn = Array.prototype.filter.call(D.querySelectorAll('section.feat [data-i18n], .more-grid [data-i18n], .plan.popular [data-i18n], .faq [data-i18n], [data-i18n="pr.trial_desc"]'), function (n) { return /^(Place trades|Connect in five|Up to 8 charts|How do I connect|Academy|Community|Your morning bias|Win rate, net R|Open trades live)/.test(tx(n)); }).map(tx);
    ok('...nothing changed is left in English', !leftEn.length, leftEn);
    ok('...the moved and the joined questions in Spanish', es('hm.toggle') === '¿Qué mercados puedo operar?' && /^Forex, Índices, Oro/.test(es('hero.markets')) && es('faq.q11') === '¿De dónde salen los precios y tiene que estar abierto MT5?' && /en hasta 8 gráficos/.test(es('faq.a11')) && /MT5 tiene que estar abierto en tu ordenador o en un VPS/.test(es('faq.a11')), [es('faq.q11'), es('hm.toggle')]);
    ok('...no "liquidez" or "SMC" in Spanish either', !/liquidez|\bSMC\b/i.test(D.body.textContent));
    D.querySelector('.lang-sq[data-lang="en"]').click(); await W(300);
    ok('back to English', /^A trading journal with your MT5 built in/.test(es('hero.lede')));
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
