// Academy notes (24 Oct 2026): the private box at the foot of each open lesson, the mark in the list, the My notes page,
// the merge rule (newer stamp wins, a cleared note stays cleared) and nothing of it in a mentor's view.
// Run: python tests/browser_test.py tests/academy_notes_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  try {
    data.school = { done: {}, started: new Date().toISOString(), notes: { '0.1': { t: 'older note', at: Date.now() - 86400000 } } };
    document.querySelectorAll('.tabs .tab').forEach(function (t) { t.style.display = ''; });
    document.querySelector('.tab[data-page="vault"]').click(); await W(500);
    document.getElementById('vault-hub-academy').click(); await W(1200);
    var box = document.querySelector('.stsc-notes[data-notes="1.1"]');
    ok('an open lesson ends with a notes box', !!box, (document.getElementById('stsc-mtitle') || {}).textContent);
    var ta = box && box.querySelector('textarea'), st = box && box.querySelector('[data-nst]');
    ok('an empty box says only you can see it', st && /Only you can see/.test(st.textContent), st && st.textContent);
    ok('the box sits before the next-lesson button', box && box.nextElementSibling && box.nextElementSibling.classList.contains('stsc-next'),
       box && box.nextElementSibling && box.nextElementSibling.className);
    ta.value = 'Base first, quote second.'; ta.dispatchEvent(new Event('input', { bubbles: true }));
    ok('typing shows Saving', /Saving/.test(st.textContent), st.textContent);
    ok('nothing written before the pause', !(data.school.notes['1.1']), data.school.notes['1.1']);
    await W(1200);
    var n = data.school.notes['1.1'];
    ok('saved into the journal after the pause', n && n.t === 'Base first, quote second.' && n.at > Date.now() - 5000, n);
    ok('the box says Saved with the time', /^Saved \d\d:\d\d$/.test(st.textContent) && st.classList.contains('ok'), st.textContent);
    ok('two lessons marked in the list', document.querySelectorAll('#stsc-list .stsc-nmark').length === 2, document.querySelectorAll('#stsc-list .stsc-nmark').length);
    ok('My notes counts 2', (document.querySelector('#stsc-list .stsc-mynotes b') || {}).textContent === '2', (document.querySelector('#stsc-list .stsc-mynotes b') || {}).textContent);
    // blur saves at once
    ta.value = 'Base first, quote second. EUR/USD up = euro stronger.'; ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('blur'));
    ok('leaving the box saves at once', data.school.notes['1.1'].t === 'Base first, quote second. EUR/USD up = euro stronger.', data.school.notes['1.1'].t);
    // the My notes page
    document.querySelector('#stsc-list [data-mynotes]').click(); await W(400);
    var cards = document.querySelectorAll('#stsc-body .stsc-ncard');
    ok('My notes shows both, in course order', cards.length === 2 && /0\.1/.test(cards[0].textContent) && /1\.1/.test(cards[1].textContent), cards.length);
    ok('the row reads as open', document.querySelector('#stsc-list .stsc-mynotes').classList.contains('active'), document.querySelector('#stsc-list .stsc-mynotes').className);
    ok('a card keeps the line breaks as written', getComputedStyle(cards[1].querySelector('.stsc-ncard-b')).whiteSpace === 'pre-wrap', '');
    cards[1].querySelector('[data-nl]').click(); await W(400);
    ok('a card opens its lesson with the note in the box', (document.querySelector('.stsc-notes[data-notes="1.1"] textarea') || {}).value === 'Base first, quote second. EUR/USD up = euro stronger.',
       (document.getElementById('stsc-mtitle') || {}).textContent);
    // clearing a note
    var ta2 = document.querySelector('.stsc-notes[data-notes="1.1"] textarea');
    ta2.value = '  '; ta2.dispatchEvent(new Event('input', { bubbles: true })); ta2.dispatchEvent(new Event('blur'));
    ok('a cleared note keeps its stamp', data.school.notes['1.1'] && data.school.notes['1.1'].t === '  ' && data.school.notes['1.1'].at, data.school.notes['1.1']);
    ok('a cleared note leaves the list and the count', document.querySelectorAll('#stsc-list .stsc-nmark').length === 1 && STSCHOOL.noteIds().join() === '0.1', STSCHOOL.noteIds());
    // merges: per lesson the newer stamp wins
    var base = { school: { done: {}, notes: { a: { t: 'mine new', at: 200 }, b: { t: 'mine old', at: 100 }, c: { t: '', at: 300 } } } };
    var other = { school: { done: {}, notes: { a: { t: 'theirs old', at: 150 }, b: { t: 'theirs new', at: 250 }, c: { t: 'stale text', at: 120 }, d: { t: 'only theirs', at: 50 } } } };
    window.__stMergeSchool(base, other);
    ok('merge: my newer note stays', base.school.notes.a.t === 'mine new', base.school.notes.a);
    ok('merge: their newer note wins', base.school.notes.b.t === 'theirs new', base.school.notes.b);
    ok('merge: a clear is not undone by an older copy', base.school.notes.c.t === '', base.school.notes.c);
    ok('merge: a note only they have arrives', base.school.notes.d && base.school.notes.d.t === 'only theirs', base.school.notes.d);
    var b2 = {}; window.__stMergeSchool(b2, { school: { notes: { x: { t: 'n', at: 1 } } } });
    ok('merge: notes arrive even with no progress on either side', b2.school && b2.school.notes && b2.school.notes.x && b2.school.notes.x.t === 'n', b2);
    // a mentor's view shows none of it
    document.body.classList.add('mentor-viewing');
    STSCHOOL.relang(); await W(300);
    ok('mentor view: no notes box', !document.querySelector('.stsc-notes'), !!document.querySelector('.stsc-notes'));
    ok('mentor view: no My notes row or marks', !document.querySelector('#stsc-list .stsc-mynotes') && !document.querySelector('#stsc-list .stsc-nmark'), '');
    document.body.classList.remove('mentor-viewing');
    STSCHOOL.relang(); await W(300);
    ok('back as the member, the box returns', !!document.querySelector('.stsc-notes'), '');
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
