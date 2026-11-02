(async function () {
  // The month-end podium's confetti (Nestor, 1 Nov 2026: "The confetti came down with a big lag"). It starts with the pop-up, and keeps moving while the page's own thread is busy, because only
  // transforms move it; fewer pieces on a phone. Run: python tests/browser_test.py tests/podium_fx_e2e.js  (phone: E2E_MOBILE=375x812 in front)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 100 && !window.__stPodium; i++) await W(100);
    var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
    var U = '00000000-0000-0000-0000-0000000000aa', rows = [{ user_id: U, points: 735 }, { user_id: 'b', points: 475 }, { user_id: 'c', points: 465 }];
    var ppl = {}; ppl[U] = { name: 'Nestor', avatar: '' }; ppl.b = { name: 'Aurora', avatar: '' }; ppl.c = { name: 'Troy', avatar: '' };
    window.__stPodium._show(rows, ppl, U, '2026-10-01');
    await W(30);
    var box = document.querySelector('.stp-fxd');
    ok('confetti as small elements, no full-screen canvas drawing', !!box && getComputedStyle(document.querySelector('.stp-fx')).display === 'none', !!box);
    var pieces = box ? [].slice.call(box.querySelectorAll('.stp-c')) : [], phone = innerWidth < 700, H = innerHeight;
    ok(phone ? 'phone: 36 pieces' : 'computer: 80 pieces', pieces.length === (phone ? 36 : 80), pieces.length);
    var inAir = pieces.filter(function (p) { var r = p.getBoundingClientRect(); return r.top > 0 && r.bottom < H; }).length;
    ok('it starts with the pop-up: pieces in the air on the first look', inAir >= (phone ? 6 : 15), inAir);
    var anims = pieces.map(function (p) { return p.getAnimations()[0]; });
    ok('every piece moves by a CSS animation of its transform only', anims.every(function (a) { return a && a.effect.getKeyframes().every(function (k) { return k.transform && !k.top && !k.left; }); }));
    // the page's thread blocked for 900 ms: the pieces' clock runs on regardless (a canvas would have stood still and then crawled on at 3 frames' worth)
    var a0 = anims.filter(function (a) { return a.playState === 'running'; })[0], t0 = a0.currentTime, c0 = performance.now(); while (performance.now() - c0 < 900) {}
    await W(120); await new Promise(function (r) { requestAnimationFrame(r); }); var moved = a0.currentTime - t0;
    ok('a busy page does not hold it back', moved >= 850, Math.round(moved));
    var lt = 0, c1 = performance.now(), n = 0; window.__stPodium.close();
    ok('closing takes it all away', !document.querySelector('.stp-fxd'));
    ok('nothing wider than the screen', document.documentElement.scrollWidth <= innerWidth + 1);
  } catch (e) { out.push({ name: 'test ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
