(async function () {
  // The Post to community sound is "Sent, two notes" (12 Oct 2026). Nestor: "id like a different sound for when i post
  // things to community, the swoosh i dont like" - picked by ear from ten (Chime up first, then this one): two soft
  // notes going up.
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
    ok('two notes, going up: E5 then A5', oscs.length === 2 && f.join(',') === '659,880', f);
    ok('plain soft notes (sine)', oscs.every(function (o) { return o.type === 'sine'; }), oscs.map(function (o) { return o.type; }));
    ok('the second a tenth of a second after the first', Math.abs((oscs[1].at - t0) - 0.1) < 0.002, oscs.map(function (o) { return +(o.at - t0).toFixed(3); }));
    ok('over in about a third of a second', (oscs[1].stop - t0) > 0.3 && (oscs[1].stop - t0) < 0.45, +(oscs[1].stop - t0).toFixed(3));
    ok('the app says which notes it plays', (window.__stSentSound.notes || []).join(',') === '659,880', window.__stSentSound.notes);
    ok('at the level he picked by ear (0.42, up from 0.28)', window.__stSentSound.level === 0.42 && /exponentialRampToValueAtTime\(0\.42, t \+ 0\.006\)/.test(html) && !/exponentialRampToValueAtTime\(0\.28, t \+ 0\.006\)/.test(html), window.__stSentSound.level);
    ok('no swoosh left: nothing made of noise', noises === 0 && !/function swoosh\(c\)/.test(html), noises);
    ok('it still plays when a post has gone, from the one place every Post button uses', (html.match(/_sentSnd\.play\(\);/g) || []).length === 2 && /function postToChannel\(slug, body, bodyEs, replaceId\)\{/.test(html), (html.match(/_sentSnd\.play\(\);/g) || []).length);
    // asleep again later (a phone in the background, a long idle): every press wakes it, not only the first after the app loads
    // (Nestor, 23 Oct 2026: "when i posted the morning bias i didnt hear the chime"), and the press on Post itself does
    var woke = 0, r0 = c0.resume;
    c0.resume = function () { woke++; return Promise.resolve(); };
    try { Object.defineProperty(c0, 'state', { get: function () { return 'suspended'; }, configurable: true }); } catch (e) {}
    var press = function (t) { window.dispatchEvent(new Event(t)); };
    press('pointerdown'); press('pointerdown'); press('keydown');
    var w1 = woke; window.__stSentSound.prime(); var w2 = woke;
    try { Object.defineProperty(c0, 'state', { get: function () { return 'running'; }, configurable: true }); } catch (e) {}
    press('pointerdown'); window.__stSentSound.prime(); var w3 = woke;
    try { delete c0.state; } catch (e) {} c0.resume = r0;
    ok('asleep later: every press wakes the audio again (three presses, three wakes), and Post\'s own press does too', w1 === 3 && w2 === 4, [w1, w2]);
    ok('...awake: a press leaves it alone', w3 === 4, w3);
  } catch (err) { ok('test ran without throwing', false, String(err && err.stack || err)); }
  return out;
})()
