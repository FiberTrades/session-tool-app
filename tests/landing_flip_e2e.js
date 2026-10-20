(async function () {
  // Landing 01: the Morning Bias card turns over to its Session Review and back (Nestor, 20 Oct 2026: "can this flip from the
  // morning bias to the session review card?"), and Questions in the top menu ("shouldnt we have up here a Q&A tab?", then
  // "call q&a questions in english").
  // Checks the landing inside the app (#lp-front, LP_HTML) in English and Spanish, and the generated index.html.
  // Run: python tests/browser_test.py tests/landing_flip_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    var html = await fetch('/index.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    ok('index.html has the turning card and the Q&A link', html.indexOf('id="fz-card"') > 0 && html.indexOf('window.__lpFlip') > 0 && html.indexOf('href="#faq" data-i18n="nav.faq"') > 0);
    var fr; for (var i = 0; i < 100 && !(fr = document.getElementById('lp-front')); i++) await W(100);
    var w = fr && fr.contentWindow; for (i = 0; i < 100 && !(w && w.document && w.document.getElementById('fz-card') && w.__lpFlip); i++) await W(100);
    var D = w.document; await W(600);
    var tx = function (el) { return (el && el.textContent || '').replace(/\s+/g, ' ').trim(); };
    var d = D.getElementById('fz-card'), vis = function (el) { return w.getComputedStyle(el).visibility === 'visible'; };
    var fb = d.querySelector('.sbody.fz-b'), fr2 = d.querySelector('.sbody.fz-r');
    var tabs = function () { return [].map.call(d.querySelectorAll('[data-fz]'), function (x) { return tx(x) + (x.classList.contains('on') ? '*' : ''); }).join(' '); };
    var title = function () { var t = [].filter.call(d.querySelectorAll('.sttl > span'), function (s) { return w.getComputedStyle(s).display !== 'none'; }); return t.map(tx).join('|'); };
    ok('starts on the Morning Bias: its title, Bias tab lit, the bias rows showing, the review face hidden', !d.classList.contains('rv') && title() === 'Morning Bias' && tabs() === 'Bias* Review' && vis(fb) && !vis(fr2), [title(), tabs()]);
    ok('one card, two faces in the same place (one grid cell, so the page under it never moves)', w.getComputedStyle(d.querySelector('.screen')).display === 'grid' && w.getComputedStyle(fb).gridRowStart === w.getComputedStyle(fr2).gridRowStart && w.getComputedStyle(fb).gridColumnStart === w.getComputedStyle(fr2).gridColumnStart);
    var rows = [].map.call(fr2.querySelectorAll('.bias-rows .r'), function (r) { return tx(r.querySelector('.k')) + '=' + tx(r.querySelector('.val')); });
    ok('the review face: Result +2.00R · Target, Execution Flawless, Setup, Focus, Psychology; Trade replay and Post', rows.join(';') === 'Result=+2.00R · Target;Execution=Flawless;Setup=Trend pullback;Focus=Full;Psychology=Calm · No FOMO' && /Trade replay/.test(tx(fr2.querySelector('.charts-line'))) && /^Post/.test(tx(fr2.querySelectorAll('.charts-line a')[1])) && /10:05/.test(tx(fr2.querySelector('.cb-head'))), rows);
    w.__lpFlip(true); await W(700);
    ok('turns over to the Session Review: title, Review tab lit, review rows showing, bias rows hidden', d.classList.contains('rv') && title() === 'Session Review' && tabs() === 'Bias Review*' && vis(fr2) && !vis(fb), [title(), tabs()]);
    d.querySelector('[data-fz="b"]').click(); await W(700);
    ok('the Bias tab turns it straight back', !d.classList.contains('rv') && title() === 'Morning Bias' && tabs() === 'Bias* Review', [title(), tabs()]);
    d.querySelector('[data-fz="r"]').click(); await W(700);
    ok('...and the Review tab to the review', d.classList.contains('rv') && tabs() === 'Bias Review*');
    ok('the floating Review card fades out while the review itself shows', w.getComputedStyle(d.querySelector('.fcard')).opacity === '0');
    var src = [].map.call(D.querySelectorAll('script'), function (s) { return s.textContent; }).join('\n');
    ok('turns by itself every 6 s only while on screen (IntersectionObserver) and holds while the mouse is on it', /setInterval\(tick,6000\)/.test(src) && /IntersectionObserver/.test(src) && /mouseenter',function\(\)\{ hold=true; \}/.test(src) && /prefers-reduced-motion:reduce\)\{ \.fz \.screen\.fz-out/.test(D.head.innerHTML + D.body.innerHTML));
    // the menu
    var nav = [].map.call(D.querySelectorAll('.nav-links a:not(.btn)'), function (a) { return tx(a) + '>' + a.getAttribute('href'); });
    ok('Questions in the top menu, between Pricing and Community, going to the Questions section ("call q&a questions in english")', nav.join(' ') === 'Features>#workflow More>#more Pricing>#pricing Questions>#faq Community>#community Contact>#contact' && D.getElementById('faq'), nav);
    // Spanish
    D.querySelector('.lang-sq[data-lang="es"]').click(); await W(400);
    var esRows = [].map.call(fr2.querySelectorAll('.bias-rows .r'), function (r) { return tx(r.querySelector('.k')) + '=' + tx(r.querySelector('.val')); });
    ok('in Spanish: Revisión de sesión, the rows, Publicar, Lun 22 jun, and Preguntas in the menu', title() === 'Revisión de sesión' && esRows.join(';') === 'Resultado=+2.00R · Objetivo;Ejecución=Impecable;Setup=Pullback en tendencia;Enfoque=Total;Psicología=Tranquilo · Sin FOMO' && /^Publicar/.test(tx(fr2.querySelectorAll('.charts-line a')[1])) && /Lun 22 jun/.test(tx(fr2.querySelector('.cb-head'))) && tx(D.querySelector('.nav-links a[href="#faq"]')) === 'Preguntas', [title(), esRows]);
    w.__lpFlip(false); await W(700);
    ok('...and the bias side in Spanish: Sesgo matutino', title() === 'Sesgo matutino' && tabs() === 'Sesgo* Revisión', [title(), tabs()]);
    D.querySelector('.lang-sq[data-lang="en"]').click(); await W(300);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
