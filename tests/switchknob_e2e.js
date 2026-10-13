(async function () {
  // The ball of a switch sits inside its track with the same rim on every side, on and off (13 Oct 2026). Nestor, of the
  // Live P/L switch on a Session Live trade card: "how come the toggle black ball is smaller than the white one when
  // off?" Both were 12px; switched on, the ball slid 18px (the big switch's distance) instead of 14px and hung over the
  // right end of the 32px track, where black on the dark card cannot be seen.
  // Run: python tests/browser_test.py tests/switchknob_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(document.body && window.STCommunity); i++) await W(100);
    await W(800);
    var st = document.createElement('style'); st.textContent = '.tk-switch-knob, .tk-switch-track { transition: none !important; }'; document.head.appendChild(st);
    var host = document.createElement('div'); host.style.cssText = 'position:fixed;left:20px;top:20px;z-index:99999;background:#111;padding:20px;display:flex;gap:30px';
    var sw = function (cls, on) { return '<label class="tk-switch ' + cls + '"><span class="tk-switch-label">x</span><input type="checkbox"' + (on ? ' checked' : '') + '><span class="tk-switch-track"><span class="tk-switch-knob"></span></span></label>'; };
    host.innerHTML = sw('slx-tog', false) + sw('slx-tog', true) + sw('', false) + sw('', true);
    document.body.appendChild(host); await W(120);
    var m = [].map.call(host.querySelectorAll('.tk-switch'), function (l) {
      var t = l.querySelector('.tk-switch-track').getBoundingClientRect(), k = l.querySelector('.tk-switch-knob').getBoundingClientRect(), r = function (v) { return Math.round(v * 100) / 100; };
      return { track: [r(t.width), r(t.height)], knob: [r(k.width), r(k.height)], left: r(k.left - t.left), right: r(t.right - k.right), top: r(k.top - t.top), bottom: r(t.bottom - k.bottom), color: getComputedStyle(l.querySelector('.tk-switch-knob')).backgroundColor };
    });
    var smOff = m[0], smOn = m[1], bgOff = m[2], bgOn = m[3];
    ok('small switch: the track is 32 by 18 and the ball 12 by 12, on and off', smOff.track.join() === '32,18' && smOn.track.join() === '32,18' && smOff.knob.join() === '12,12' && smOn.knob.join() === '12,12', [smOff, smOn]);
    ok('small switch off: the ball has a 3px rim on its left, top and bottom', smOff.left === 3 && smOff.top === 3 && smOff.bottom === 3, smOff);
    ok('small switch on: the ball stays inside the track with the same 3px rim on its right', smOn.right === 3 && smOn.top === 3 && smOn.bottom === 3, smOn);
    ok('small switch: on is the mirror of off', smOn.right === smOff.left && smOn.left === smOff.right, [smOff, smOn]);
    ok('small switch: the ball is white-ish when off and black when on', smOn.color === 'rgb(0, 0, 0)' && smOff.color !== smOn.color, [smOff.color, smOn.color]);
    ok('big switch: the track is 40 by 22 and the ball 16 by 16, on and off', bgOff.track.join() === '40,22' && bgOn.track.join() === '40,22' && bgOff.knob.join() === '16,16' && bgOn.knob.join() === '16,16', [bgOff, bgOn]);
    ok('big switch: 3px rim off, and on is its mirror', bgOff.left === 3 && bgOn.right === 3 && bgOn.left === bgOff.right, [bgOff, bgOn]);
    host.remove(); st.remove();
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
