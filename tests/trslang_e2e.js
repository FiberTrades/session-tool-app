// Community translator: English chat made plain before it goes to Spanish, the app's own names kept.
//   python tests/browser_test.py tests/trslang_e2e.js
// Headless Edge, throwaway profile, signed out. Checks what is SENT to the free translator (no network needed).
// Nestor, 15 Oct 2026: "it needs to know english slang also when it translates to spanish sometimes its not correct" -
// "I got my edge adjuster telling me to stop moving my SL to BE" came back "Recibí que mi ajustador de bordes...".
(async function () {
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    var P = window.__stTrPrep;
    check('the translator exposes its preparation step', typeof P === 'function');
    var a = P('I got my edge adjuster telling me to stop moving my SL to BE', 'es');
    check('"got my X telling me" becomes "my X is telling me"; the Edge Adjuster keeps the app\'s Spanish name; SL and BE untouched',
      /^my ZXQ\d+QXZ is telling me to stop moving my ZXQ\d+QXZ to ZXQ\d+QXZ$/.test(a.out) && a.back === 'my Ajustador de Ventaja is telling me to stop moving my SL to BE', a);
    var cases = [
      ['i would be +31R better of right now', 'I would be +31R better off right now'],
      ['that means that im alright at getting the right direction, but the trades dont have enough room to breath before they run', "that means that I'm alright at getting the right direction, but the trades don't have enough room to breathe before they run"],
      ['did u sell', 'did you sell'],
      ['wont do this right now', "won't do this right now"],
      ['i said ill pay half for extra bits', "I said I'll pay half for extra bits"],
      ['right i said id pay half', "right I said I'd pay half"],
      ['looks like u got some vids ready for the academy too ?', 'looks like you got some videos ready for the academy too ?'],
      ['whats your edge adjuster saying?', "what's your Ajustador de Ventaja saying?"],
      ['im going to rinse this', "I'm going to use this a lot"],
      ['no point in saving pennys when your losing big R', 'no point in saving pennies when your losing a lot of R'],
      ['it looks like i would have BE anyways', 'it looks like I would have closed at BE anyway'],
      ['i think u better stop moving be to in profit lol', 'I think you better stop moving the BE into the profit jaja'],
      ['nah', 'no'], ['yea i did think how u manage to fit all that in already lol', 'yes I did think how you manage to fit all that in already jaja'],
      ['I got in earlier on the buy but i got taken out and then it went up', 'I got in earlier on the buy but me saltó el stop and then it went up'],
      ['ffs', 'madre mía'], ['mate', 'tío'], ['learnt my lesson from yesterday', 'learned my lesson from yesterday']
    ];
    var bad = cases.filter(function (c) { return P(c[0], 'es').back !== c[1]; }).map(function (c) { return { in: c[0], got: P(c[0], 'es').back, want: c[1] }; });
    check('real chat from today reads as plain English before it is translated (' + cases.length + ' lines)', bad.length === 0, bad);
    // ordinary English is left alone: real words that only LOOK like shorthand
    var keep = ['I will be ill tomorrow', 'well, we were there', 'the id of the trade', 'its own level', 'hell no', 'a shell company', 'we went in'];
    var changed = keep.filter(function (k) { return P(k, 'es').back !== k.replace(/\bi\b/g, 'I'); });
    check('ordinary words are left alone (ill, well, were, id, its, hell, shell)', changed.length === 0, changed.map(function (k) { return [k, P(k, 'es').back]; }));
    // going the other way: Spanish into English is not rewritten, and the app's Spanish names come back as its English ones
    var b = P('mi Ajustador de Ventaja dice que deje de mover el SL a BE', 'en');
    check('Spanish into English: the app\'s Spanish name becomes its English one, nothing else rewritten', b.back === 'mi Edge Adjuster dice que deje de mover el SL a BE' || b.back === 'mi Trading Edge Adjuster dice que deje de mover el SL a BE', b);
    check('Spanish into English: chat rewriting does not run ("u", "im" are left)', P('u im', 'en').back === 'u im', P('u im', 'en').back);
    check('the Series of 10 and Session Bias keep their app names', P('my Series of 10 and session bias', 'es').back === 'my Serie de 10 and Sesgo de Sesión', P('my Series of 10 and session bias', 'es').back);
    // whole path with a stand-in translator that hands back what it was sent (and adds a full stop, as Google does)
    var realFetch = window.fetch;
    window.fetch = function (url) {
      var q = decodeURIComponent((String(url).match(/[?&]q=([^&]*)/) || [])[1] || '');
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve([q + '.']); } });
    };
    var t1 = await window.stTranslateText('i think u better stop moving be to in profit lol', 'auto', 'es');
    check('a chat word at the end ("lol") is put back as "jaja" AFTER the sentence, not inside it, and no stray full stop', t1 === 'I think you better stop moving the BE into the profit jaja', t1);
    var t2 = await window.stTranslateText('ffs', 'auto', 'es'), t3 = await window.stTranslateText('no too much for now lol', 'auto', 'es');
    check('"ffs" alone becomes "madre mía" without asking the translator; "...lol" keeps its sentence', t2 === 'madre mía' && t3 === 'no too much for now jaja', [t2, t3]);
    var t4 = await window.stTranslateText('Done.', 'auto', 'es');
    check('a sentence that had its own full stop keeps it', t4 === 'Done..' || t4 === 'Done.', t4);
    window.fetch = realFetch;
  } catch (err) {
    check('the test ran to the end', false, (err && err.message) + ' @ ' + String((err && err.stack) || '').split('\n')[1]);
  }
  return JSON.stringify(results);
})()
