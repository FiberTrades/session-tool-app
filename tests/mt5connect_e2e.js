(async function () {
  // Connect MT5 (Nestor, 19 Oct 2026: "yes build the checklist to connect MT5"): Settings -> MT5 walks a member through the EA's
  // set-up and ticks each step by itself - 1-4 when the EA first checks in (ea_settings -> __stEA), 5 when the EA says Algo
  // Trading is on (its "hi" on the live line). A card on Session Bias brings members whose EA never checked in. Stand-ins only:
  // a made-up member and made-up EA rows fed straight into __stEA / the live line's list - nothing reaches a real EA.
  // Run: python tests/browser_test.py tests/mt5connect_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var LG = '90001234', KEY = LG + '|EURUSD', saved = null;
  try {
    for (var i = 0; i < 200 && !(window.__stMt5c && window.__stEA && window.__stSB && window.__stLiveLine); i++) await W(100);
    await W(800);
    try { Array.prototype.forEach.call(document.querySelectorAll('[class^="st-tour"]'), function (e) { e.remove(); }); } catch (e) {}
    var fr = document.getElementById('lp-front'); if (fr) fr.style.display = 'none';
    var M = window.__stMt5c, rows = window.__stEA.rows(), easL = window.__stLiveLine.easL();
    saved = JSON.stringify(data.mt5LoginMap || {});
    delete data.mt5cHide; window.__stJournalPulled = true;
    window.currentUser = { id: '00000000-0000-0000-0000-0000000c0de5', email: 'member@example.com' };
    window.STCloud.syncToken = 'st_test_mt5c_0001';
    var card = document.getElementById('mt5c-home');
    for (var k = 0; k < 80 && card.hidden; k++) await W(250);   // the EA rows are read first (once, after 8 s with no live feed)
    ok('a member whose EA never checked in: the Connect MT5 card on Session Bias', !card.hidden && /Connect MT5/.test(card.textContent) && card.querySelector('[data-mt5c-go]') && card.querySelector('[data-mt5c-x]'), card.hidden);

    // ---- the tab ----
    card.querySelector('[data-mt5c-go]').click(); await W(400);
    var bg = document.getElementById('settings-modal-bg'), sec = document.getElementById('mt5c-sec'), nav = document.querySelector('.settings-nav-item[data-section="mt5c"]');
    ok('Connect MT5 opens Settings on the MT5 tab, right after Accounts', bg.classList.contains('show') && nav.classList.contains('active') && sec.style.display !== 'none' && nav.previousElementSibling.getAttribute('data-section') === 'accounts' && nav.textContent.trim() === 'MT5', [nav.className, sec.style.display]);
    ok('...and the live line may join while it is open (to hear Algo Trading), without asking for prices', M.visible() === true);
    var stepEls = sec.querySelectorAll('[data-mt5c-step]'), stepN = function (n) { return sec.querySelector('[data-mt5c-step="' + n + '"]'); };
    var link = stepN(1) && stepN(1).querySelector('a.mt5c-btn');
    ok('six steps (6: Keep a year of history, 20 Oct 2026): Get the EA (MQL5, a new tab) is next, the others to do', stepEls.length === 6 && stepN(1).querySelector('.mt5c-n.next') && !sec.querySelector('.mt5c-n.ok') && link && /mql5\.com\/en\/market\/product\/180026/.test(link.href) && link.target === '_blank', stepEls.length);
    var codes = Array.prototype.map.call(sec.querySelectorAll('.mt5c-code code'), function (c) { return c.textContent; });
    ok('step 3 shows the code, step 4 both web addresses, each with Copy', codes[0] === 'st_test_mt5c_0001' && codes[1] === 'https://figozyxoyobixadhqewr.supabase.co' && codes[2] === 'https://live.sessionterminal.com' && sec.querySelectorAll('[data-mt5c-copy]').length === 3, codes);
    ok('step 4 also says to untick the two "Disable algorithmic trading when..." boxes (20 Oct 2026: "Troy had these 2 options switched on by default")', /untick Disable algorithmic trading when the account has been changed and … when the profile has been changed/.test(stepN(4).textContent), stepN(4).textContent);
    ok('step 5 names the EA\'s own Allow Algo Trading (its Common tab) as well as MT5\'s button', /Allow Algo Trading is ticked on the EA’s Common tab/.test(stepN(5).textContent), stepN(5).textContent);
    // "Show me" (20 Oct 2026: "whould it help if we display this or a mockup of these in MT5 tab in settings?"): his own MT5, cropped and ringed
    ok('Show me on steps 3-6 (not 1-2), closed to begin with', [3, 4, 5, 6].every(function (n) { return stepN(n).querySelector('[data-mt5c-show]'); }) && !stepN(1).querySelector('[data-mt5c-show]') && !stepN(2).querySelector('[data-mt5c-show]') && !sec.querySelector('.mt5c-figs'));
    stepN(4).querySelector('[data-mt5c-show]').click(); await W(50);
    var figs = sec.querySelector('[data-mt5c-figs="4"]'), imgs = figs ? Array.prototype.slice.call(figs.querySelectorAll('img')) : [];
    for (k = 0; k < 40 && !imgs.every(function (im) { return im.complete && im.naturalWidth > 0; }); k++) await W(100);
    ok('step 4\'s Show me: the two boxes to untick, then Allow WebRequest with both addresses - loaded, captioned, Hide the picture', imgs.length === 2 && /step4-boxes\.png$/.test(imgs[0].src) && /step4-urls\.png$/.test(imgs[1].src) && imgs.every(function (im) { return im.naturalWidth > 400 && im.closest('a').target === '_blank'; }) && /these two unticked/.test(figs.textContent) && /Hide the picture/.test(stepN(4).textContent), imgs.map(function (im) { return [im.src.split('/').pop(), im.naturalWidth]; }));
    stepN(5).querySelector('[data-mt5c-show]').click(); await W(50);
    ok('step 5\'s: the Algo Trading button under MT5\'s menu, and the EA\'s Common tab', sec.querySelectorAll('[data-mt5c-figs="5"] img').length === 2 && /step5-button\.png$/.test(sec.querySelector('[data-mt5c-figs="5"] img').src) && sec.querySelectorAll('.mt5c-figs').length === 2);
    stepN(4).querySelector('[data-mt5c-show]').click(); stepN(5).querySelector('[data-mt5c-show]').click(); await W(50);
    ok('...and they close again', !sec.querySelector('.mt5c-figs') && /Show me/.test(stepN(4).textContent));
    ok('waiting: "Waiting for your EA", no help yet', /Waiting for your EA/.test(sec.textContent) && !sec.querySelector('.mt5c-help'));
    M._wait(200000); await W(50);
    ok('3 minutes with nothing: the help says what usually stops it (step 4, the Experts tab, a space in the code)', sec.querySelector('.mt5c-help') && /Still waiting after 3 minutes/.test(sec.querySelector('.mt5c-help').textContent) && /Experts/.test(sec.querySelector('.mt5c-help').textContent));
    sec.querySelector('[data-mt5c-copy="tok"]').click(); await W(300);
    var clip = ''; try { clip = await navigator.clipboard.readText(); } catch (e) { clip = 'ERR ' + e; }
    ok('Copy puts the code on the clipboard and the button says Copied', clip === 'st_test_mt5c_0001' && /Copied/.test(sec.querySelector('[data-mt5c-copy="tok"]').textContent), clip);
    sec.querySelector('[data-mt5c-copier]').click(); await W(50);
    ok('Trading several accounts? (moved here from the import window): Show how opens the Trade Copier steps', /Trading several accounts\?/.test(sec.textContent) && sec.querySelector('.mt5c-more') && /Trade Copier/.test(sec.querySelector('.mt5c-more').textContent) && /same code and both web addresses/.test(sec.querySelector('.mt5c-more').textContent));
    sec.querySelector('[data-mt5c-copier]').click(); await W(50);
    ok('...and Hide folds it', !sec.querySelector('.mt5c-more'));

    // ---- the EA checks in ----
    window.__stEA.apply({ login: +LG, symbol: 'EURUSD', ea_version: '9.05', updated_at: new Date().toISOString(), settings: { unit: 'pips' } });
    M._opened(60000); await W(50);
    var ea = sec.querySelector('[data-mt5c-login="' + LG + '"]');
    ok('the EA checks in: Connected, steps 1-4 ticked, the help gone; its line: MT5 90001234 · EURUSD · EA 9.05', /Connected/.test(sec.textContent) && sec.querySelectorAll('.mt5c-n.ok').length === 4 && !stepN(5).querySelector('.mt5c-n.ok') && !sec.querySelector('.mt5c-help') && ea && /MT5 90001234/.test(ea.textContent) && /EURUSD · EA 9\.05/.test(ea.textContent), ea && ea.textContent);
    ok('...step 5 says an EA before 9.06 cannot report Algo Trading', /Your EA is 9\.05/.test(stepN(5).textContent), stepN(5).textContent);
    easL['EURUSD|' + LG] = { v: '9.06', lg: LG, rl: true, al: true, at: Date.now() }; M.render(); await W(50);
    ea = sec.querySelector('[data-mt5c-login="' + LG + '"]');
    ok('its EA says hi with Algo Trading on and the relay: step 5 ticks, chips Algo Trading on + Live prices on, EA 9.06', sec.querySelectorAll('.mt5c-n.ok').length === 5 && /Algo Trading on/.test(ea.textContent) && /Live prices on/.test(ea.textContent) && /EA 9\.06/.test(ea.textContent), ea.textContent);
    ok('step 6 (Max bars in chart): an EA before 9.07 cannot report it', /Keep a year of history/.test(stepN(6).textContent) && /Max bars in chart/.test(stepN(6).textContent) && /Unlimited/.test(stepN(6).textContent) && /Ticks itself with EA 9\.07/.test(stepN(6).textContent) && !stepN(6).querySelector('.mt5c-n.ok'), stepN(6).textContent);
    easL['EURUSD|' + LG] = { v: '9.07', lg: LG, rl: true, al: true, mb: 100000, at: Date.now() }; M.render(); await W(50);
    ok('...EA 9.07 on MT5\'s usual 100,000 bars: step 6 says it keeps about 3 months of 1-minute candles, not ticked (Nestor, 20 Oct 2026: "THIS NEEDS TO BE ADDED TO THE MT5 SET UP IN SETTINGS")', /MT5 90001234: keeps 100,000 bars, about 3 months of 1-minute candles/.test(stepN(6).textContent) && !stepN(6).querySelector('.mt5c-n.ok') && sec.querySelectorAll('.mt5c-n.ok').length === 5, stepN(6).textContent);
    easL['EURUSD|' + LG] = { v: '9.07', lg: LG, rl: true, al: true, mb: 2147483647, at: Date.now() }; M.render(); await W(50);
    ok('...set to Unlimited: step 6 ticks itself, all six done', stepN(6).querySelector('.mt5c-n.ok') && /A year or more/.test(stepN(6).textContent) && sec.querySelectorAll('.mt5c-n.ok').length === 6, stepN(6).textContent);
    easL['EURUSD|' + LG] = { v: '9.06', lg: LG, rl: false, al: false, at: Date.now() }; M.render(); await W(50);
    ea = sec.querySelector('[data-mt5c-login="' + LG + '"]');
    ok('Algo Trading off: a red chip and step 5 says press the button; no relay: Live prices slower', /Algo Trading off/.test(ea.textContent) && ea.querySelector('.mt5c-chip.off') && /Off in MT5/.test(stepN(5).textContent) && /Untick the two boxes in step 4/.test(stepN(5).textContent) && /Live prices slower/.test(ea.textContent) && !stepN(5).querySelector('.mt5c-n.ok'));
    // ---- which journal account its trades go into ----
    var sel = ea.querySelector('select[data-mt5c-acc]'), accs = (data.accounts || []).filter(function (a) { return a && !a.archived; });
    if (accs.length) {
      sel.value = accs[0].id; sel.dispatchEvent(new Event('change', { bubbles: true })); await W(80);
      ok('Trades go into: picking an account links the MT5 login to it (mt5LoginMap)', (data.mt5LoginMap || {})[LG] === accs[0].id, (data.mt5LoginMap || {})[LG]);
      sel = sec.querySelector('select[data-mt5c-acc="' + LG + '"]'); sel.value = ''; sel.dispatchEvent(new Event('change', { bubbles: true })); await W(80);
      ok('...and "Not linked" removes the link', !(LG in (data.mt5LoginMap || {})));
    } else ok('Trades go into: no journal account to pick (skipped)', true);
    await W(1800);   // the card follows on the next tick (every 1.5 s)
    ok('connected: the Session Bias card is gone', card.hidden);
    // ---- old MT5 accounts (Nestor, 19 Oct 2026: "how do you get rid of these suggestions for old inactive accounts?") ----
    window.__stEA.apply({ login: 70000001, symbol: 'XAUUSD', ea_version: '8.97', updated_at: new Date(Date.now() - 3 * 864e5).toISOString(), settings: { unit: 'points' } });
    window.__stEA.apply({ login: 70000002, symbol: 'EURUSD', ea_version: '8.92', updated_at: new Date(Date.now() - 11 * 864e5).toISOString(), settings: { unit: 'pips' } });
    M.render(); await W(50);
    var lgShown = function (lg) { return !!sec.querySelector('[data-mt5c-login="' + lg + '"]'); };
    ok('an MT5 account last seen 3 days ago still shows, with Remove; one not linked and not seen for 11 days is folded ("1 older MT5 account ... Show")', lgShown('70000001') && sec.querySelector('[data-mt5c-rm="70000001"]') && !lgShown('70000002') && /1 older MT5 account, not seen for over a week/.test(sec.textContent), sec.querySelector('.mt5c-old') && sec.querySelector('.mt5c-old').textContent);
    ok('...the running one has no Remove', !sec.querySelector('[data-mt5c-rm="' + LG + '"]'));
    sec.querySelector('[data-mt5c-older]').click(); await W(50);
    ok('Show lists it, and the line says Hide', lgShown('70000002') && /Hide the older MT5 accounts/.test(sec.textContent));
    sec.querySelector('[data-mt5c-older]').click(); await W(50);
    data.mt5LoginMap = data.mt5LoginMap || {}; data.mt5LoginMap['70000001'] = 'acc_whatever';
    sec.querySelector('[data-mt5c-rm="70000001"]').click(); await W(50);
    ok('Remove takes it off the list (saved: mt5Hide) and unlinks it', !lgShown('70000001') && data.mt5Hide && data.mt5Hide['70000001'] && !('70000001' in data.mt5LoginMap));
    window.__stEA.apply({ login: 70000001, symbol: 'XAUUSD', ea_version: '9.06', updated_at: new Date(Date.now() + 1000).toISOString(), settings: { unit: 'points' } });
    M.render(); await W(50);
    ok('...and it comes back by itself when its EA checks in again', lgShown('70000001'));
    delete rows['70000001|XAUUSD']; delete rows['70000002|EURUSD']; delete data.mt5Hide; M.render();
    // ---- Spanish ----
    document.documentElement.lang = 'es'; M.render(); await W(50);
    ok('in Spanish: Conectar MT5, Pega tu código', /Conectar MT5/.test(sec.textContent) && /Pega tu código/.test(sec.textContent));
    document.documentElement.lang = 'en'; M.render();
    bg.querySelector('.modal-close').click(); await W(300);
    ok('closed: the tab is no longer open', M.visible() === false);

    // ---- the card's x ----
    delete rows[KEY]; delete easL['EURUSD|' + LG]; await W(1800);
    ok('no EA again: the card is back', !card.hidden);
    card.querySelector('[data-mt5c-x]').click(); await W(100);
    ok('x hides it for good (saved in the journal: mt5cHide)', card.hidden && !!data.mt5cHide);
    delete data.mt5cHide; await W(1800);

    // ---- the MT5 import window ----
    document.getElementById('mt5-import-btn').click(); await W(300);
    var go = document.getElementById('mt5-connect-open');
    ok('the import window: "Set up auto-sync: Settings → MT5" instead of the old steps; the manual export help stays', go && /Settings → MT5/.test(go.textContent) && !document.getElementById('mt5-help-auto-body') && !document.getElementById('mt5-help-copier-body') && !!document.getElementById('mt5-help-export-body'), go && go.textContent);
    go.click(); await W(400);
    ok('...pressing it closes the import window and opens Settings on MT5', !document.getElementById('mt5-modal-bg').classList.contains('show') && bg.classList.contains('show') && nav.classList.contains('active'));
    bg.querySelector('.modal-close').click(); await W(200);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { data.mt5LoginMap = JSON.parse(saved || '{}'); delete data.mt5cHide; delete window.__stEA.rows()[KEY]; delete window.__stLiveLine.easL()['EURUSD|' + LG]; window.currentUser = null; } catch (e) {}
  return JSON.stringify(out);
})()
