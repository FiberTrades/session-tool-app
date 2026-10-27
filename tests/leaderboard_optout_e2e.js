(async function () {
  // Leaderboard opt-out (27 Oct 2026): Settings -> Profile -> Privacy -> "Show me on the leaderboard". The server is stood in for:
  // lb_prefs answers from a variable and st_set_leaderboard_hidden only writes down what it was asked.
  // Run: python tests/browser_test.py tests/leaderboard_optout_e2e.js        (phone: E2E_MOBILE=375x812 in front)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  ok('the words are in both languages', (html.match(/'settings\.lb_toggle'/g) || []).length === 2 && (html.match(/'settings\.privacy_label'/g) || []).length === 2 && (html.match(/'settings\.lb_hint'/g) || []).length === 2);
  var hidden = false, calls = [], fail = false;
  var chain = function (val) { var p = Promise.resolve(val); ['select', 'eq', 'is', 'order', 'limit', 'in', 'maybeSingle'].forEach(function (m) { p[m] = function () { return p; }; }); return p; };
  var realSB = window.__stSB, realUser = window.currentUser;
  window.__stSB = {
    from: function (t) { return { select: function () { return chain(t === 'lb_prefs' ? { data: hidden ? { hidden: true } : null, error: null } : { data: [], error: null }); } }; },
    rpc: function (fn, args) { calls.push([fn, args]); return new Promise(function (r) { setTimeout(function () { if (fail) r({ data: null, error: { message: 'offline' } }); else { hidden = !!args.p_hidden; r({ data: hidden, error: null }); } }, 60); }); }
  };
  window.currentUser = { id: '00000000-0000-0000-0000-0000000000bb', email: 'member@example.com' };
  window.__stLbHidden = undefined;
  document.getElementById('settings-gear').click(); await W(600);
  var cb = document.getElementById('settings-lb-show');
  var row = cb && cb.closest('.set-row');
  var txt = function (n) { return n ? n.innerText.replace(/\s+/g, ' ').trim() : ''; };
  ok('Settings → Profile has a Privacy row with "Show me on the leaderboard", in the right-hand column', !!row && /Privacy/i.test(txt(row.querySelector('.set-l'))) && !!row.querySelector('.set-r #settings-lb-show') && /Show me on the leaderboard/i.test(txt(row)), txt(row));
  ok('its hint says what off does and that your own stats stay', /left out of the Discipline Leaderboard everywhere/.test(txt(row)) && /Your own stats stay exactly as they are/.test(txt(row)), txt(row));
  ok('on by default (no choice saved yet)', cb && cb.checked === true && window.__stLbHidden === false, [cb && cb.checked, window.__stLbHidden]);
  // off
  cb.click(); await W(20);
  ok('switching it off shows "Saving…" while it saves', /Saving/.test(txt(document.getElementById('settings-lb-cap'))) && cb.disabled, txt(document.getElementById('settings-lb-cap')));
  await W(150);
  ok('switching it off asks the server to hide you, and says so on the row', calls.length === 1 && calls[0][0] === 'st_set_leaderboard_hidden' && calls[0][1].p_hidden === true && /Saved: you are off the leaderboard/.test(txt(document.getElementById('settings-lb-cap'))) && window.__stLbHidden === true && !cb.disabled, [calls, txt(document.getElementById('settings-lb-cap'))]);
  // the reviews say why there is no score
  var mine = window.__stLbMine;
  if (mine && window.STCloud) {
    var uidDesc = Object.getOwnPropertyDescriptor(window.STCloud, 'userId');
    try { if (!uidDesc || uidDesc.writable || uidDesc.set) window.STCloud.userId = window.currentUser.id; } catch (e) {}
    var realSB2 = window.__stSB;
    window.__stSB = Object.assign({}, realSB2, { from: function () { return chain({ data: null, error: null }); } });
    var hm = await mine('week', '2026-10-19');
    window.__stSB = realSB2;
    ok('a review\'s Leaderboard achievements says you turned it off', /not on the leaderboard: you turned it off in Settings → Profile → Privacy/.test(hm), hm.slice(0, 200));
  }
  // back on
  cb.click(); await W(200);
  ok('switching it back on asks to show you again', calls.length === 2 && calls[1][1].p_hidden === false && /Saved: you are on the leaderboard/.test(txt(document.getElementById('settings-lb-cap'))) && window.__stLbHidden === false, [calls, txt(document.getElementById('settings-lb-cap'))]);
  // offline: the switch goes back and says it was not saved
  fail = true; cb.click(); await W(200);
  ok('if it cannot be saved, the switch goes back and says so', cb.checked === true && /Not saved/.test(txt(document.getElementById('settings-lb-cap'))) && window.__stLbHidden === false, [cb.checked, txt(document.getElementById('settings-lb-cap'))]);
  fail = false;
  // reopened later with the choice saved as off
  hidden = true; window.__stLbHidden = undefined;
  try { document.querySelector('#settings-modal-bg .modal-close, #settings-close').click(); } catch (e) {}
  await W(200);
  document.getElementById('settings-gear').click(); await W(600);
  ok('a saved "off" shows as off when Settings opens', document.getElementById('settings-lb-show').checked === false && window.__stLbHidden === true);
  if (window.innerWidth <= 420) {
    var r2 = document.getElementById('settings-lb-show').closest('.set-row'), sw = r2 && r2.querySelector('.tk-switch-track');
    ok('phone: the switch sits inside the screen', sw && sw.getBoundingClientRect().right <= window.innerWidth && document.documentElement.scrollWidth <= window.innerWidth + 1, sw && sw.getBoundingClientRect().right);
  }
  // a mentor view never shows the switch
  try { document.querySelector('#settings-modal-bg .modal-close, #settings-close').click(); } catch (e) {}
  document.body.classList.add('mentor-viewing');
  try { window.__stLbOpt.paint(); } catch (e) {}
  ok('a mentor view hides the switch', (document.getElementById('settings-lb-show').closest('.set-row') || {}).style.display === 'none');
  document.body.classList.remove('mentor-viewing');
  window.__stSB = realSB; window.currentUser = realUser; window.__stLbHidden = undefined;
  return out;
})()
