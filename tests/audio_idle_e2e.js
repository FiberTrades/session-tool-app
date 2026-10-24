(async function () {
  // The app's sound (session chime, rule sound, Post sound): its AudioContext is made while the page is idle after it loads, not
  // inside the first tap (25 Oct 2026: opening the audio output took ~0.5 s or more on the main thread, so the first tap anywhere
  // froze the app that long). The first press then only resumes it.
  // Run: python tests/browser_test.py tests/audio_idle_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    var made = function () { try { return typeof _audioCtx !== 'undefined' && _audioCtx ? _audioCtx : null; } catch (e) { return null; } };
    for (var i = 0; i < 80 && !made(); i++) await W(100);
    var ctx = made();
    ok('made by itself once the page is idle, before any press', !!ctx && typeof getAudioCtx === 'function' && getAudioCtx() === ctx, ctx && ctx.state);
    ok('and asleep until a press, as browsers require', ctx && (ctx.state === 'suspended' || ctx.state === 'running'), ctx && ctx.state);
    var P = (window.AudioContext || window.webkitAudioContext).prototype, orig = P.resume, calls = 0;
    P.resume = function () { calls++; return orig.apply(this, arguments); };
    var t0 = performance.now(); window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); var dt = performance.now() - t0;
    P.resume = orig;
    ok('a press asks it to wake (resume), quickly: no audio output opened inside the press', (ctx.state === 'running' || calls >= 1) && dt < 150 && getAudioCtx() === ctx, [ctx.state, calls, Math.round(dt)]);
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(out);
})()
