// Phone tabs (25 Oct 2026, Nestor): back under the page title as a row of icon boxes - all the same size, the open one outlined pink,
// finer than before - and hidden on Charts, where window.__stNav (the logo in the chart's corner) brings them down from the top.
// Run: E2E_MOBILE=375x812 python tests/browser_test.py tests/navbar_e2e.js   (also 320x640, 390x844; without E2E_MOBILE = a computer)
(async function () {
  var out = [], W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  try {
    for (var i = 0; i < 80 && !(window.__stNav && document.querySelector('.container > .tabs')); i++) await W(100);
    await W(900);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"], .st-greet-pop').forEach(function (e) { e.remove(); });
    window.__stLcForce = true;   // tests open Charts signed out (the app's own test switch)
    await W(1500);
    var row = document.querySelector('.container > .tabs');
    var all8 = function () { document.body.classList.add('st-charts-on', 'st-lc-on'); row.querySelectorAll('.tab').forEach(function (t) { t.style.removeProperty('display'); }); };
    var set7 = function () { var c = row.querySelector('.tab[data-page="livecharts"]'); if (c) c.style.setProperty('display', 'none', 'important'); window.dispatchEvent(new Event('resize')); };
    var vis = function () { return [].filter.call(row.querySelectorAll('.tab'), function (t) { return t.offsetWidth > 0; }); };
    all8(); window.dispatchEvent(new Event('resize')); await W(500); all8(); await W(200);
    var phone = innerWidth <= 820;
    var sess = document.getElementById('meta-session'), full = sess.querySelector('.ms-full'), shortS = sess.querySelector('.ms-short');
    if (!phone) {
      ok('computer: the tab row in the page with its labels', getComputedStyle(row).position !== 'fixed' && vis().every(function (t) { var l = t.querySelector('span[data-i18n]'); return l && l.offsetWidth > 0; }), getComputedStyle(row).position);
      ok('computer: the session in full ("London 8AM-10AM"), not the phone\'s short form', full && full.offsetWidth > 0 && (!shortS || shortS.offsetWidth === 0), sess.innerText);
      return out;
    }
    // symbol / session / date / time: ONE row under the tab icons, small, tight, nothing cut (25 Oct 2026)
    var meta = document.querySelector('.container > .meta');
    var metaState = function () {
      var cells = [].slice.call(meta.querySelectorAll('.meta-cell')), v0 = meta.querySelector('.meta-value'), l0 = meta.querySelector('.meta-label');
      return { two: meta.classList.contains('meta-two'), tops: cells.map(function (c) { return Math.round(c.getBoundingClientRect().top); }),
               cut: cells.filter(function (c) { var v = c.querySelector('.meta-value'); return v.scrollWidth > v.clientWidth + 1 || c.getBoundingClientRect().right > meta.getBoundingClientRect().right + 1; }).length,
               vfs: parseFloat(getComputedStyle(v0).fontSize), lfs: parseFloat(getComputedStyle(l0).fontSize), words: cells.map(function (c) { return c.querySelector('.meta-value').innerText; }) };
    };
    for (var ml = 0; ml < 2; ml++) {
      try { setLanguage(ml ? 'es' : 'en'); } catch (e) {}
      await W(500);
      var ms = metaState(), rb = row.getBoundingClientRect(), mb = meta.getBoundingClientRect();
      ok((ml ? 'ES' : 'EN') + ': the four in one row right under the tab icons, small and whole', !ms.two && ms.tops.every(function (t) { return t === ms.tops[0]; }) && ms.cut === 0
         && mb.top - rb.bottom >= 0 && mb.top - rb.bottom <= 30 && ms.vfs >= 11 && ms.vfs <= 12.5 && ms.lfs <= 9, { meta: ms, gap: Math.round(mb.top - rb.bottom) });
    }
    try { setLanguage('en'); } catch (e) {}
    await W(400);
    full = sess.querySelector('.ms-full'); shortS = sess.querySelector('.ms-short');   // the language switch drew the cell again
    ok('the session in its short form on a phone ("London 8–10AM")', shortS && shortS.offsetWidth > 0 && full.offsetWidth === 0 && /–/.test(shortS.textContent), sess.innerText);
    var pair = document.getElementById('meta-pair'), pairWas = pair.textContent;
    pair.textContent = 'EUR/USD · XAU/USD · GBP/JPY'; await W(700);
    var mt = metaState();
    ok('too wide for one row (three symbols): an even 2 x 2, nothing cut', mt.two && mt.cut === 0 && mt.tops[0] === mt.tops[1] && mt.tops[2] === mt.tops[3] && mt.tops[2] > mt.tops[0], mt);
    pair.textContent = pairWas; await W(400);
    ok('...and back to one row when it fits again', !meta.classList.contains('meta-two'), metaState());
    var h1 = document.querySelector('.header h1').getBoundingClientRect(), rr = row.getBoundingClientRect();
    ok('phone: the row sits under the page title, in the page (not a bottom bar)', getComputedStyle(row).position !== 'fixed' && rr.top >= h1.bottom && rr.bottom < innerHeight, [h1.bottom, rr.top, rr.bottom, getComputedStyle(row).position]);
    var shape = function () { var v = vis(); return { n: v.length, ws: v.map(function (t) { return Math.round(t.getBoundingClientRect().width); }), hs: v.map(function (t) { return Math.round(t.getBoundingClientRect().height); }),
      labels: v.filter(function (t) { return [].some.call(t.querySelectorAll('span[data-i18n]'), function (l) { return l.offsetWidth > 0; }); }).length,
      icons: v.filter(function (t) { var s = t.querySelector('svg'); return s && s.getBoundingClientRect().width >= 16 && s.getBoundingClientRect().width <= 22; }).length }; };
    for (var li = 0; li < 2; li++) {
      var lang = li ? 'es' : 'en';
      try { setLanguage(lang); } catch (e) {}
      await W(400); all8(); await W(300);
      var s8 = shape();
      ok(lang.toUpperCase() + ', 8 tabs: equal icon boxes, 40px tall, no words, 18-21px icons', s8.n === 8 && Math.max.apply(null, s8.ws) - Math.min.apply(null, s8.ws) <= 1 && s8.hs.every(function (h) { return h === 40; }) && s8.labels === 0 && s8.icons === 8, s8);
      set7(); await W(350);
      var s7 = shape();
      ok(lang.toUpperCase() + ', 7 tabs: the same, the boxes share the row', s7.n === 7 && Math.max.apply(null, s7.ws) - Math.min.apply(null, s7.ws) <= 1 && s7.hs.every(function (h) { return h === 40; }) && s7.labels === 0, s7);
      all8(); await W(300);
    }
    try { setLanguage('en'); } catch (e) {}
    await W(300); all8(); await W(200);
    var act = row.querySelector('.tab.active'), acs = getComputedStyle(act);
    ok('the open tab: pink outline and pink icon, no glow', acs.borderTopColor.replace(/\s/g, '') === 'rgb(244,114,182)' && acs.color.replace(/\s/g, '') === 'rgb(244,114,182)' && acs.boxShadow === 'none', [acs.borderTopColor, acs.color, acs.boxShadow]);
    var other = row.querySelector('.tab:not(.active)'), ocs = getComputedStyle(other);
    ok('the others: a hairline border, no glow', ocs.borderTopWidth === '1px' && ocs.boxShadow === 'none', [ocs.borderTopWidth, ocs.borderTopColor, ocs.boxShadow]);
    var pb = parseFloat(getComputedStyle(document.querySelector('.container')).paddingBottom);
    ok('no extra page padding for a bottom bar', pb <= 90, pb);
    document.querySelector('.container > .tabs .tab[data-page="trades"]').click(); await W(600);
    ok('tapping the Statistics box opens Statistics', document.querySelector('.tab[data-page="trades"]').classList.contains('active') && document.getElementById('page-trades').classList.contains('active'), (document.querySelector('.page.active') || {}).id);
    all8(); document.querySelector('.tab[data-page="livecharts"]').click(); await W(800);
    // Charts opens as a page like the others since 26 Oct 2026 (Nestor: "like community chat"): the row stays; only the chart's full screen covers it
    ok('on Charts the row stays (a page first; the chart\'s full screen covers it)', getComputedStyle(row).display !== 'none', getComputedStyle(row).display);
    ok('...on the platform blue-grey, not black (27 Oct 2026)', getComputedStyle(row).backgroundColor === 'rgb(19, 23, 34)' && getComputedStyle(row, '::before').backgroundColor === 'rgb(19, 23, 34)', [getComputedStyle(row).backgroundColor, getComputedStyle(row, '::before').backgroundColor]);
    ok('window.__stNav keeps its API', typeof __stNav.open === 'function' && typeof __stNav.close === 'function' && typeof __stNav.isOpen === 'function', Object.keys(__stNav));
    __stNav.open(); await W(400);
    ok('__stNav.open() opens it', __stNav.isOpen(), __stNav.isOpen());
    __stNav.close(); await W(400);
    ok('__stNav.close() closes it', !__stNav.isOpen(), __stNav.isOpen());
    document.querySelector('.tab[data-page="bias"]').click(); await W(400);
    ok('back on Session Bias the row is there again, black again', getComputedStyle(row).display !== 'none' && getComputedStyle(row).backgroundColor !== 'rgb(19, 23, 34)', [getComputedStyle(row).display, getComputedStyle(row).backgroundColor]);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
