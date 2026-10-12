(async function () {
  // Settings > Notifications (12 Oct 2026): the button shows whether THIS device is on. It used to flash "on" for two
  // seconds and go back to "Turn on notifications", so it looked as if it did nothing.
  // Run: python tests/browser_test.py tests/notifbtn_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(3000);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; } * { transition: none !important; animation: none !important; }'; document.head.appendChild(css);
  var keepLang = window.__lang || 'en'; setLanguage('en');
  var b = document.getElementById('settings-notif-btn'), cap = document.getElementById('settings-notif-cap');
  var txt = function () { return b.textContent.trim(); };

  // the browser's answer and the registration are stood in for
  var st = 'off', calls = 0, answer = 'ok';
  window.__stNotifProbe = function () { return st; };
  var keepForce = window.STCommunity && window.STCommunity.forcePush;
  window.STCommunity = window.STCommunity || {};
  window.STCommunity.forcePush = function (cb) { calls++; setTimeout(function () { if (answer === 'ok') st = 'on'; cb(answer); }, 150); };

  document.getElementById('settings-gear').click(); await W(900);
  var nav = document.querySelector('.settings-nav-item[data-section="profile"]'); if (nav) nav.click(); await W(400);
  b.scrollIntoView({ block: 'center' }); await W(200);

  // ---- 1) the words: everything that is sent today, in both languages ----
  var hint = document.querySelector('[data-i18n="settings.notif_hint"]');
  ok('the text names what is sent today', /nudges and trade alerts/i.test(hint.textContent) && /red-news warnings and results/i.test(hint.textContent) && /DMs/.test(hint.textContent) && /Community settings/.test(hint.textContent), hint.textContent);
  setLanguage('es'); await W(300);
  var esOk = t('settings.notif_hint') !== 'settings.notif_hint' && /noticias rojas/.test(hint.textContent) && /Notificaciones/.test(document.querySelector('[data-i18n="settings.notif_label"]').textContent);
  ok('and in Spanish, button included', esOk && /Activar notificaciones/.test(txt()), [hint.textContent.slice(0, 60), txt()]);
  setLanguage('en'); await W(300);

  // ---- 2) a device that is not on yet ----
  ok('not on yet: the button offers to turn them on', txt() === 'Turn on notifications' && !b.classList.contains('is-on') && cap.textContent === '', [txt(), cap.textContent]);
  var row = b.closest('.set-row');
  ok('the button and its line sit on the right of the row', !!row && !!row.querySelector('.set-r #settings-notif-btn') && !!row.querySelector('.set-r #settings-notif-cap') && !!row.querySelector('.set-l [data-i18n="settings.notif_hint"]'), row && row.className);

  // ---- 3) pressing it: it stays on "Notifications on", green ----
  b.click(); await W(60);
  ok('while it works it says so', /Working/.test(txt()) && b.disabled, txt());
  await W(500);
  ok('then it stays on Notifications on', /^Notifications on/.test(txt()) && b.classList.contains('is-on') && !b.disabled && calls === 1, [txt(), b.className, calls]);
  ok('in the green of a done button', /78,\s*205,\s*139/.test(getComputedStyle(b).color), getComputedStyle(b).color);
  ok('with a line under it saying this device is set up', /This device is set up/.test(cap.textContent), cap.textContent);
  await W(3200);
  ok('it does not go back after a few seconds', /^Notifications on/.test(txt()) && b.classList.contains('is-on'), txt());
  b.click(); await W(300);
  ok('pressing it again does nothing', calls === 1 && /^Notifications on/.test(txt()), [calls, txt()]);

  // ---- 4) opening Settings again reads the device again ----
  document.getElementById('settings-modal-close').click(); await W(300);
  st = 'off';
  document.getElementById('settings-gear').click(); await W(900);
  ok('a device that is no longer registered shows Turn on notifications again', txt() === 'Turn on notifications' && !b.classList.contains('is-on'), txt());
  st = 'on'; await window.__stNotifBtnPaint(); await W(100);
  ok('and one that is registered shows on at once, without pressing', /^Notifications on/.test(txt()) && calls === 1, [txt(), calls]);

  // ---- 5) blocked in the browser, and a browser that cannot do it ----
  st = 'blocked'; await window.__stNotifBtnPaint(); await W(100);
  ok('blocked: the line says where to allow them', txt() === 'Turn on notifications' && /Blocked for this site/.test(cap.textContent) && /site settings/.test(cap.textContent), cap.textContent);
  st = 'unsupported'; await window.__stNotifBtnPaint(); await W(100);
  ok('not available: the line says so, and what to do on a phone', /Not available in this browser/.test(cap.textContent) && /home screen/.test(cap.textContent), cap.textContent);

  // ---- 6) a press that fails says why, then returns to the true state ----
  st = 'off'; await window.__stNotifBtnPaint(); answer = 'denied';
  b.click(); await W(400);
  ok('a refusal is said on the button', /Blocked/.test(txt()) && !b.classList.contains('is-on'), txt());
  await W(3600);
  ok('and it returns to Turn on notifications', txt() === 'Turn on notifications', txt());

  // put things back
  try { delete window.__stNotifProbe; } catch (e) { window.__stNotifProbe = undefined; }
  if (keepForce) window.STCommunity.forcePush = keepForce;
  try { document.getElementById('settings-modal-close').click(); } catch (e) {}
  setLanguage(keepLang);
  try { window.__stNotifBtnPaint(); } catch (e) {}
  return out;
})()
