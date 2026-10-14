(async function () {
  // "A newer EA is ready" (14 Oct 2026). Nestor: "yes do this one!!" - a line under the tabs when a member's EA is older
  // than the version on the MQL5 Market (read by the ea-version function). Driven here with stand-in EA reports and a
  // stand-in Market answer; one check calls the real function, which only reads a public page.
  // Run: python tests/browser_test.py tests/eaupdate_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stEA && window.__stEAUpdate && window.__stSB); i++) await W(100);
    await W(1200);
    var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
    doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
    ok('every inline script parses', !bad.length, bad);

    var U = window.__stEAUpdate, el = document.getElementById('ea-update-banner');
    ok('the banner and its helper are there', !!U && !!el);
    ok('versions compare as Nestor numbers them', U.older('8.90', '8.94') && U.older('8.5', '8.72') && U.older('8.72', '8.9') && !U.older('8.9', '8.88') && !U.older('8.94', '8.94') && !U.older('9.0', '8.99') && !U.older('8.95', '8.94'));

    // The real function, from a browser page (CORS and the answer's shape)
    var real = null; try { real = await window.__stSB.functions.invoke('ea-version', { body: {} }); } catch (e) { real = { error: String(e) }; }
    ok('the real ea-version function answers a browser with the Market version', real && real.data && /^[0-9]+(\.[0-9]+)+$/.test(real.data.version || ''), real && (real.data || real.error));

    // Stand-ins: a signed-in member, the Market answer, the EA reports
    var MV = '8.94', calls = 0, fail = false;
    var stub = { invoke: function (name) { calls++; return fail ? Promise.reject(new Error('offline')) : Promise.resolve({ data: { version: MV, url: 'https://www.mql5.com/en/market/product/180026' } }); } };
    Object.defineProperty(window.__stSB, 'functions', { configurable: true, get: function () { return stub; } });
    var hadUser = window.currentUser; window.currentUser = window.currentUser || { id: 'test-user' };
    var clearLS = function () { try { localStorage.removeItem('st_ea_market'); localStorage.removeItem('st_ea_update_hush'); } catch (e) {} };
    clearLS();
    var rows = window.__stEA.rows(); Object.keys(rows).forEach(function (k) { delete rows[k]; });
    var iso = function (msAgo) { return new Date(Date.now() - msAgo).toISOString(); };
    var shown = function () { return el.classList.contains('show') && getComputedStyle(el).display !== 'none'; };
    var txt = function () { return (document.getElementById('ea-update-text') || {}).textContent || ''; };

    U.check(); await W(300);
    ok('no EA has reported: nothing shows and the Market is not asked', !shown() && calls === 0, { calls: calls });

    window.__stEA.apply({ login: '511355685', symbol: 'EURUSD', settings: {}, ea_version: '8.90', updated_at: iso(60000) });
    await W(800);
    ok('an EA on 8.90 with 8.94 on the Market: the line shows', shown(), txt());
    ok('it names both versions', /ready: 8\.94\./.test(txt()) && /Yours is 8\.90\./.test(txt()), txt());
    ok('it says how to update and that nothing is lost', /Update it from the MQL5 Market, then restart MT5/.test(txt()) && /Your token and settings stay\./.test(txt()), txt());
    ok('the button reads Get 8.94', (document.getElementById('ea-update-go') || {}).textContent === 'Get 8.94');
    ok('the Market was asked once and remembered', calls === 1 && !!localStorage.getItem('st_ea_market'), { calls: calls });

    var r0 = el.getBoundingClientRect();
    ok('the line sits inside the page width', r0.width > 200 && r0.right <= document.documentElement.clientWidth + 1, { w: r0.width, right: r0.right, vw: document.documentElement.clientWidth });

    // The member updates: the next report from that login carries 8.94
    window.__stEA.apply({ login: '511355685', symbol: 'EURUSD', settings: {}, ea_version: '8.94', updated_at: iso(0) });
    await W(800);
    ok('the next report on 8.94 takes the line away', !shown(), txt());
    ok('no second Market request inside six hours', calls === 1, { calls: calls });

    // Two logins, one behind
    window.__stEA.apply({ login: '1514906945', symbol: 'XAUUSD', settings: {}, ea_version: '8.93', updated_at: iso(3600000) });
    await W(800);
    ok('two logins, one on 8.93: the line names that one', shown() && /Yours on 1514906945 is 8\.93\./.test(txt()), txt());

    // A login silent for 10 days does not count
    window.__stEA.apply({ login: '1514906945', symbol: 'XAUUSD', settings: {}, ea_version: '8.93', updated_at: iso(10 * 86400000) });
    window.__stEA.apply({ login: '1514778904', symbol: 'EURUSD', settings: {}, ea_version: '8.5', updated_at: iso(9 * 86400000) });
    await W(800);
    ok('EAs not heard from for over a week are left out', !shown(), txt());

    // A chart taken off the EA keeps its old row; the login's newest report decides
    window.__stEA.apply({ login: '541419576', symbol: 'GBPUSD', settings: {}, ea_version: '8.88', updated_at: iso(2 * 86400000) });
    window.__stEA.apply({ login: '541419576', symbol: 'EURUSD', settings: {}, ea_version: '8.94', updated_at: iso(60000) });
    await W(800);
    ok('one login: its newest report (8.94) counts, not an old chart (8.88)', !shown(), txt());

    // Several behind
    window.__stEA.apply({ login: '511355685', symbol: 'EURUSD', settings: {}, ea_version: '8.90', updated_at: iso(0) });
    window.__stEA.apply({ login: '541422977', symbol: 'EURUSD', settings: {}, ea_version: '8.92', updated_at: iso(0) });
    await W(800);
    ok('two logins behind: both are listed', shown() && /Yours is older on 511355685 \(8\.90\), 541422977 \(8\.92\)\./.test(txt()), txt());

    // x hides it for that version; a newer Market version brings it back
    document.getElementById('ea-update-x').click(); await W(100);
    ok('x hides it', !shown());
    U.check(); await W(300);
    ok('it stays hidden for that version', !shown());
    // Six hours on, the Market is read again and has 8.95
    MV = '8.95'; clearLS(); localStorage.setItem('st_ea_update_hush', JSON.stringify({ v: '8.94', at: Date.now() }));
    U.market().at = Date.now() - 7 * 3600000;
    U.check(); await W(600);
    ok('a newer version on the Market brings it back', shown() && /ready: 8\.95\./.test(txt()) && calls === 2, { txt: txt(), calls: calls });

    // A fresh page load while the Market cannot be read, with nothing remembered: nothing shows
    clearLS(); fail = true; U.forget(); el.classList.remove('show');
    U.check(); await W(600);
    ok('an unreadable Market with no answer remembered stays quiet', !shown() && calls === 3, { calls: calls });

    // A mentor reading a member's journal never sees it
    fail = false; MV = '8.94';
    document.body.classList.add('mentor-viewing'); el.classList.add('show');
    ok('hidden in mentor view', getComputedStyle(el).display === 'none');
    document.body.classList.remove('mentor-viewing'); el.classList.remove('show');

    delete window.__stSB.functions;
    window.currentUser = hadUser;
    Object.keys(rows).forEach(function (k) { delete rows[k]; });
    clearLS();
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
