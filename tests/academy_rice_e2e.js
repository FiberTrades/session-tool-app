// Lesson 5.1 RICE (7 Nov 2026): Nestor - "A is a reaction trade and B is a continuation trade when price extends and pulls back to
// the 50% of the leg extension it just created where normally there would be a doji or a mini range". The lesson says so now: the
// correction is the reaction entry, the 50% of the extension leg the continuation entry, and the quiz agrees (English and Spanish).
// Run: python tests/browser_test.py tests/academy_rice_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  try {
    // lessons open in order: a member who has passed everything up to 4.5
    var done = {}; ['0', '1', '2', '3', '4'].forEach(function (m) { for (var i = 1; i <= 5; i++) done[m + '.' + i] = { passed: true, score: 5, at: new Date().toISOString() }; });
    data.school = { done: done, started: new Date().toISOString(), notes: {} };
    window.__stCourseFull = function () { return true; };   // a Journal Pro member: modules 3-8 open
    document.querySelectorAll('.tabs .tab').forEach(function (t) { t.style.display = ''; });
    document.querySelector('.tab[data-page="vault"]').click(); await W(500);
    document.getElementById('vault-hub-academy').click(); await W(1200);
    var SS = typeof STSCHOOL !== 'undefined' ? STSCHOOL : window.STSCHOOL;
    ok('the Academy can open a lesson by id', SS && typeof SS.openAt === 'function', typeof SS);
    SS.openAt('5.1'); await W(1500); SS.openAt('5.1'); await W(1500);   // the first can land before the course's own opening lesson
    var body = (document.getElementById('stsc-body') || {}).textContent || '';
    if (/Las cuatro partes/.test(body)) out.push({ name: '(app in Spanish: English text not checked)', ok: true });
    else {
      ok('it opens (a Journal Pro member)', /The four parts/.test(body), [body.slice(0, 200), window.__stCourseFull && window.__stCourseFull(), (document.getElementById('stsc-mtitle') || {}).textContent]);
      ok('the correction is the reaction entry', /that is the reaction entry/.test(body), body.slice(body.indexOf('C —'), body.indexOf('C —') + 260));
      ok('the extension: never chase its candle, the 50% of its leg is the continuation entry', /Never chase the extension\s+candle itself/.test(body) && /50% of that leg/.test(body) && /continuation entry/.test(body) && !/This is not an entry/.test(body), body.slice(body.indexOf('E —'), body.indexOf('E —') + 320));
      ok('the table and the fix say the same', /doji or mini range at its 50%/.test(body) && /The continuation is the same rule one step later/.test(body));
      var qs = [].map.call(document.querySelectorAll('.stsc-q'), function (q) { return q.textContent; });
      ok('quiz 1: at the correction or the 50% pullback of the extension', qs.some(function (q) { return /Where in RICE do you enter\?/.test(q) && /At the correction \(a reaction\), or at the 50% pullback/.test(q); }), qs.slice(0, 3));
      ok('quiz: selling into the running extension candle is chasing', qs.some(function (q) { return /you sell into it/.test(q) && /Chasing - wait for the pullback/.test(q); }), qs);
      ok('no quiz says waiting for the extension is late any more', !qs.some(function (q) { return /Late - the move has already gone/.test(q); }), qs);
    }
    // Spanish
    try { window.__lang = 'es'; if (typeof setLang === 'function') setLang('es'); else if (window.STi18n && STi18n.set) STi18n.set('es'); } catch (e) {}
    var sel = document.querySelector('[data-lang-pick="es"], [data-setlang="es"]'); if (sel) sel.click();
    await W(1200);
    SS.openAt('5.1'); await W(1500);
    var b2 = (document.getElementById('stsc-body') || {}).textContent || '';
    if (/Corrección/.test(b2)) {
      ok('Spanish: entrada de reacción / entrada de continuación', /esa es la entrada de reacción/.test(b2) && /entrada de continuación/.test(b2) && /Nunca persigas la propia\s+vela de extensión/.test(b2), b2.slice(b2.indexOf('C —'), b2.indexOf('C —') + 400));
      var q2 = [].map.call(document.querySelectorAll('.stsc-q'), function (q) { return q.textContent; });
      ok('Spanish quiz', q2.some(function (q) { return /Dónde entras dentro de RICE/.test(q) && /retroceso al 50% del tramo de extensión/.test(q); }), q2.slice(0, 3));
    } else out.push({ name: '(Spanish not switched here - checked by text only)', ok: true });
  } catch (e) { ok('no error', false, String(e && e.stack || e)); }
  return out;
})()
