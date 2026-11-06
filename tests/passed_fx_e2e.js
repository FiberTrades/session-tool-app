(async function () {
  // The challenge-passed gold stars (Nestor, 6 Nov 2026: "are they still lagging or are they running smooth now"). Like the podium's confetti since 2 Nov, every star is small elements
  // moved by CSS transforms, so they start with the pop-up and keep moving while the page's own thread is busy. Run: python tests/browser_test.py tests/passed_fx_e2e.js  (phone: E2E_MOBILE=375x812 in front)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 100 && !window.__stPassed; i++) await W(100);
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
    var P = { acc: { id: 'demo', name: 'FTMO 70K - Challenge' }, stage: 'challenge', name: 'FTMO 70K - Challenge', short: 'FTMO 70K', sb: 70000, target: 5600, targetPct: 8, reached: 5742, days: 15, tradingDays: 9, trades: 14, winRate: 57, netR: 9.2, rules: true, hasDl: true, hasDd: true };
    window.__stPassed._show(P, { preview: true, sample: true });
    await W(30);
    var box = document.querySelector('#st-passed .sps-fxd'), cv = document.querySelector('#st-passed .sps-fx');
    ok('stars as small elements, no full-screen canvas drawing', !!box && !!cv && getComputedStyle(cv).display === 'none', !!box);
    var stars = box ? [].slice.call(box.querySelectorAll('.sps-f')) : [], phone = innerWidth < 700;
    ok(phone ? 'phone: 34 stars' : 'computer: 40 to 80 stars', phone ? stars.length === 34 : (stars.length >= 40 && stars.length <= 80), stars.length);
    var k = box && box.querySelector('.sps-k'), bg = k ? getComputedStyle(k).backgroundImage : '';
    ok('each star wears the gold star picture', /^url\("?data:image\/png/.test(bg), bg.slice(0, 30));
    var sz = k ? k.getBoundingClientRect() : null;
    ok('a star is a visible size', sz && sz.width >= 8 && sz.width <= 40, sz && Math.round(sz.width));
    var all = box ? [].slice.call(box.querySelectorAll('i')) : [], anims = [];
    all.forEach(function (el) { el.getAnimations().forEach(function (a) { anims.push(a); }); });
    ok('every piece moves by transform or opacity only', anims.length >= stars.length * 4 && anims.every(function (a) { return a.effect.getKeyframes().every(function (f) { return Object.keys(f).every(function (p) { return /^(transform|opacity|offset|easing|composite|computedOffset)$/.test(p); }); }); }), anims.length);
    await W(1500);
    var H = innerHeight, inAir = stars.filter(function (s) { var r = s.getBoundingClientRect(); return r.top > 0 && r.top < H; }).length;
    ok('stars falling on screen after 1.5 s', inAir >= (phone ? 5 : 10), inAir);
    var fall = stars.map(function (s) { return s.getAnimations()[0]; }), lasts = fall.map(function (a) { var t = a.effect.getTiming(); return (t.duration + t.delay) / 1000; }), last = Math.max.apply(null, lasts);
    ok('they keep falling for about as long as before (last one 8 to 20 s)', last >= 8 && last <= 20, Math.round(last * 10) / 10);
    // the page's thread blocked for 900 ms: the stars' clock runs on regardless (a canvas would have stood still)
    var a0 = fall.filter(function (a) { return a.playState === 'running' && a.currentTime > a.effect.getTiming().delay; })[0] || fall[0], t0 = a0.currentTime, c0 = performance.now(); while (performance.now() - c0 < 900) {}
    await W(120); await new Promise(function (r) { requestAnimationFrame(r); }); var moved = a0.currentTime - t0;
    ok('a busy page does not hold them back', moved >= 850, Math.round(moved));
    ok('nothing wider than the screen', document.documentElement.scrollWidth <= innerWidth + 1);
    window.__stPassed.close();
    ok('closing takes it all away', !document.querySelector('#st-passed') && !document.querySelector('.sps-fxd'));
  } catch (e) { out.push({ name: 'test ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
