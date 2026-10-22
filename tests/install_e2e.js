(async function () {
  // Install on your PC (Nestor, 23 Oct 2026: "yes build the install button"): Settings > Profile and a chip beside the plan badge.
  // The browser's side is a stand-in (window.__stInstallProbe): its install offer (the beforeinstallprompt event), the browser
  // (user agent), and whether the app is already running installed.
  // Run: python tests/browser_test.py tests/install_e2e.js     and on a phone: E2E_MOBILE=375x812 python tests/browser_test.py tests/install_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(document.readyState === 'complete' && window.__stInstallPaint); i++) await W(100);
    await W(800);
    var b = document.getElementById('settings-install-btn'), cap = document.getElementById('settings-install-cap'), chip = document.getElementById('st-install-chip');
    var phone = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    var shown = function (sel) { var e = document.querySelector(sel); return !!e && getComputedStyle(e).display !== 'none'; };
    var probe = function (o) { window.__stInstallProbe = function () { return o; }; window.__stInstalled = false; window.__stInstallPaint(); };
    var chipOn = function () { return chip.style.display !== 'none'; };
    if (!phone) {
      ok('a computer: one row, Install on your PC', document.getElementById('settings-install-label').textContent === 'Install on your PC' && /its own window and icon/.test(document.getElementById('settings-install-hint').textContent));
      // Chrome / Edge offering to install
      var asked = 0, ev = { prompt: function () { asked++; }, userChoice: Promise.resolve({ outcome: 'accepted' }) };
      probe({ evt: ev, ua: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/141.0 Safari/537.36' });
      ok('the browser offers it: Install, and the Install app chip beside the plan badge', b.textContent === 'Install' && chipOn() && /Install app/.test(chip.textContent), [b.textContent, chip.style.display]);
      chip.click(); await W(200);
      ok('the chip opens the browser\'s own install box; accepted: Installed (green), the chip gone', asked === 1 && b.textContent === 'Installed ✓' && b.classList.contains('is-on') && !chipOn(), [asked, b.textContent, chip.style.display]);
      ok('...and where to find it', /Start menu, desktop or taskbar/.test(cap.textContent), cap.textContent);
      b.click(); await W(100);
      ok('...pressing Installed does nothing', asked === 1 && b.textContent === 'Installed ✓');
      // the offer turned down
      var asked2 = 0; probe({ evt: { prompt: function () { asked2++; }, userChoice: Promise.resolve({ outcome: 'dismissed' }) }, ua: 'Chrome/141.0' });
      b.click(); await W(200);
      ok('Install pressed and the box closed without installing: not marked installed', asked2 === 1 && !b.classList.contains('is-on'), [asked2, b.textContent]);
      // no offer: how, for each browser
      probe({ evt: null, ua: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/141.0 Safari/537.36' });
      ok('Chrome with no offer (installed already, or not yet allowed): How to install, no chip', b.textContent === 'How to install' && !chipOn() && cap.textContent === '', [b.textContent, cap.textContent]);
      b.click(); await W(100);
      ok('...pressed: Chrome\'s steps (the address bar\'s install icon, or the menu)', /install icon at the right end of the address bar/.test(cap.textContent) && /Open in app/.test(cap.textContent), cap.textContent);
      probe({ evt: null, ua: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/141.0 Safari/537.36 Edg/141.0' }); b.click(); await W(100);
      ok('Edge: its menu, Apps, Install this site as an app', /Install this site as an app/.test(cap.textContent), cap.textContent);
      probe({ evt: null, ua: 'Mozilla/5.0 (Windows NT 10.0; rv:131.0) Gecko/20100101 Firefox/131.0' }); b.click(); await W(100);
      ok('Firefox: it cannot, use Chrome or Edge', /Firefox cannot install/.test(cap.textContent), cap.textContent);
      probe({ evt: null, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15' }); b.click(); await W(100);
      ok('Safari on a Mac: File, Add to Dock', /Add to Dock/.test(cap.textContent), cap.textContent);
      // running as the installed app
      probe({ evt: null, standalone: true, ua: 'Chrome/141.0' });
      ok('opened as the installed app: Installed, "You are using Session Terminal as an app", no chip', b.textContent === 'Installed ✓' && /as an app/.test(cap.textContent) && !chipOn(), [b.textContent, cap.textContent]);
      // Spanish
      if (typeof setLanguage === 'function') { probe({ evt: { prompt: function () {}, userChoice: new Promise(function () {}) }, ua: 'Chrome/141.0' }); setLanguage('es'); await W(250);
        ok('in Spanish: Instalar en tu ordenador, Instalar, Instalar app', document.getElementById('settings-install-label').textContent === 'Instalar en tu ordenador' && b.textContent === 'Instalar' && /Instalar app/.test(chip.textContent), [b.textContent, chip.textContent]);
        setLanguage('en'); await W(200); }
    } else {
      ok('a phone: one row, Add to your home screen', document.getElementById('settings-install-label').textContent === 'Add to your home screen' && /home screen, opening full screen/.test(document.getElementById('settings-install-hint').textContent));
      probe({ evt: { prompt: function () {}, userChoice: new Promise(function () {}) }, ua: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36' });
      ok('...no chip in the header on a phone, even when the browser offers it', !chipOn(), chip.style.display);
      probe({ evt: null, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' }); b.click(); await W(100);
      ok('an iPhone: Share, then Add to Home Screen', /Add to Home Screen/.test(cap.textContent), cap.textContent);
      probe({ evt: null, ua: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36' }); b.click(); await W(100);
      ok('an Android phone: the browser menu, Install app', /Install app/.test(cap.textContent), cap.textContent);
    }
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  window.__stInstallProbe = null;
  return out;
})()
