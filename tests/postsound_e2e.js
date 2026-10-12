(async function () {
  // The Post to community sound is "Chime up" (12 Oct 2026). Nestor: "id like a different sound for when i post things
  // to community, the swoosh i dont like" - picked by ear from ten: three quick rising notes.
  // Run: python tests/browser_test.py tests/postsound_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.STCommunity && window.__stSentSound); i++) await W(100);
    await W(1500);
    var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
    doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
    ok('every inline script parses', !bad.length, bad);
    var snd = window.__stSentSound;
    ok('the post sound is there', !!snd && typeof snd.play === 'function' && typeof snd.prime === 'function');

    // listen in on what it asks the browser to play
    var AC = window.AudioContext || window.webkitAudioContext, P = AC.prototype;
    var oscs = [], noises = 0, co = P.createOscillator, cb = P.createBufferSource;
    P.createOscillator = function () {
      var o = co.apply(this, arguments), rec = { type: null, freq: null, at: null, stop: null, ctx: this }; oscs.push(rec);
      var sv = o.frequency.setValueAtTime.bind(o.frequency); o.frequency.setValueAtTime = function (v, t) { rec.freq = v; return sv(v, t); };
      var st = o.start.bind(o), sp = o.stop.bind(o);
      o.start = function (t) { rec.at = t; rec.type = o.type; return st(t); }; o.stop = function (t) { rec.stop = t; return sp(t); };
      return o;
    };
    P.createBufferSource = function () { noises++; return cb.apply(this, arguments); };
    // The test window has had no click, so the browser keeps its audio asleep and the sound waits for it (as it should).
    // Here the audio is reported as awake, so what the sound schedules can be read; nothing is actually heard.
    var c0 = (typeof getAudioCtx === 'function' && getAudioCtx()) || null;
    ok('the app has its audio to play through', !!c0);
    var asleep = c0.state !== 'running';
    if (asleep) { oscs.length = 0; snd.play(); await W(300); ok('asleep audio: nothing is scheduled until it wakes', oscs.length === 0, oscs.length); }
    try { Object.defineProperty(c0, 'state', { get: function () { return 'running'; }, configurable: true }); } catch (e) {}
    oscs.length = 0; snd.play(); await W(300);
    try { delete c0.state; } catch (e) {}
    P.createOscillator = co; P.createBufferSource = cb;
    var f = oscs.map(function (o) { return o.freq; }), t0 = oscs[0].at;
    ok('three notes, rising: C6, E6, G6', oscs.length === 3 && f.join(',') === '1047,1319,1568', f);
    ok('plain soft notes (sine)', oscs.every(function (o) { return o.type === 'sine'; }), oscs.map(function (o) { return o.type; }));
    ok('70 ms apart', Math.abs((oscs[1].at - t0) - 0.07) < 0.002 && Math.abs((oscs[2].at - t0) - 0.14) < 0.002, oscs.map(function (o) { return +(o.at - t0).toFixed(3); }));
    ok('over in about half a second', (oscs[2].stop - t0) > 0.5 && (oscs[2].stop - t0) < 0.7, +(oscs[2].stop - t0).toFixed(3));
    ok('no swoosh left: nothing made of noise', noises === 0 && !/function swoosh\(c\)/.test(html), noises);
    ok('it still plays when a post has gone, from the one place every Post button uses', (html.match(/_sentSnd\.play\(\);/g) || []).length === 2 && /function postToChannel\(slug, body, bodyEs, replaceId\)\{/.test(html), (html.match(/_sentSnd\.play\(\);/g) || []).length);
  } catch (err) { ok('test ran without throwing', false, String(err && err.stack || err)); }
  return out;
})()
