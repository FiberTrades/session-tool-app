(async function () {
  // Judge me on (26 Nov 2026, Nestor: "it should use the lead account but maybe in here we could select what account we want to be
  // judged on"): Settings -> Profile -> Privacy, under "Show me on the leaderboard". The server is stood in for: lb_prefs answers from
  // a variable and st_set_leaderboard_judge only writes down what it was asked.
  // Run: python tests/browser_test.py tests/lbjudge_e2e.js        (phone: E2E_MOBILE=375x812 in front)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  for (var i = 0; i < 100 && typeof newAccountBlank !== 'function'; i++) await W(100);
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  ok('the words are in both languages', (html.match(/'settings\.lbj_label'/g) || []).length === 2 && (html.match(/'settings\.lbj_hint'/g) || []).length === 2);
  // his accounts: the 70K leads the copier, two 10Ks follow, an old one archived
  var realAcc = data.accounts, realMap = data.mt5LoginMap, realEA = window.__stEA, realSB = window.__stSB, realUser = window.currentUser;
  var mk = function (nm, sz) { var a = newAccountBlank(nm, sz, 'prop'); a.kind = 'challenge'; return a; };
  var A70 = mk('FTMO 70K', 70000), T10 = mk('TTT 10K', 10000), O10 = mk('OneFunded 10K', 10000), OLD = mk('Old 5K', 5000); OLD.archived = true;
  data.accounts = [A70, T10, O10, OLD]; data.mt5LoginMap = { '541': A70.id, '100': T10.id, '270': O10.id };
  window.__stEA = Object.assign({}, realEA || {}, { roleOf: function (lg) { return lg === '541' ? 'lead' : (lg === '100' || lg === '270') ? 'follow' : ''; } });
  var judge = null, calls = [], fail = false;
  var chain = function (val) { var p = Promise.resolve(val); ['select', 'eq', 'is', 'order', 'limit', 'in', 'maybeSingle'].forEach(function (m) { p[m] = function () { return p; }; }); return p; };
  window.__stSB = {
    from: function (t) { return { select: function () { return chain(t === 'lb_prefs' ? { data: judge ? { hidden: false, judge_acc: judge } : null, error: null } : { data: [], error: null }); } }; },
    rpc: function (fn, args) { calls.push([fn, args]); return new Promise(function (r) { setTimeout(function () { if (fail) r({ data: null, error: { message: 'offline' } }); else { if (fn === 'st_set_leaderboard_judge') judge = args.p_acc; r({ data: args.p_acc, error: null }); } }, 60); }); }
  };
  window.currentUser = { id: '00000000-0000-0000-0000-0000000000bb', email: 'member@example.com' };
  window.__stLbHidden = undefined; window.__stLbJudge = undefined;
  var txt = function (n) { return n ? n.innerText.replace(/\s+/g, ' ').trim() : ''; };
  var close = function () { try { document.querySelector('#settings-modal-bg .modal-close, #settings-close').click(); } catch (e) {} };
  try {
    document.getElementById('settings-gear').click(); await W(700);
    var sel = document.getElementById('settings-lbj'), row = sel && sel.closest('.set-row'), cap = function () { return txt(document.getElementById('settings-lbj-cap')); };
    ok('Privacy has a "Judge me on" row under the switch, the picker on the right', !!row && /Judge me on/.test(txt(row.querySelector('.set-l'))) && !!row.querySelector('.set-r #settings-lbj') && row.style.display !== 'none'
      && !!(document.getElementById('settings-lb-show').closest('.set-row').compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING), row && txt(row));
    ok('its hint says a copied trade counts once and risk rules still check every account', /counts once on the leaderboard/.test(txt(row)) && /still check every account/.test(txt(row)), txt(row));
    var opts = function () { return [].slice.call(sel.options).map(function (o) { return o.textContent; }); };
    ok('the choices: the copier Lead (named) first, then each account that takes part, not the archived one', opts().join(' | ') === 'Copier Lead · FTMO 70K | FTMO 70K | TTT 10K | OneFunded 10K', opts());
    ok('the copier Lead by default', sel.value === '' && window.__stLbJudge === '', [sel.value, window.__stLbJudge]);
    // pick the TTT 10K
    sel.value = T10.id; sel.dispatchEvent(new Event('change', { bubbles: true })); await W(20);
    ok('picking an account shows "Saving…" while it saves', /Saving/.test(cap()) && sel.disabled, cap());
    await W(150);
    ok('...asks the server to judge copied trades on it, and says so', calls.length === 1 && calls[0][0] === 'st_set_leaderboard_judge' && calls[0][1].p_acc === T10.id && /Saved: copied trades count on TTT 10K/.test(cap()) && window.__stLbJudge === T10.id, [calls, cap()]);
    // back to the Lead
    sel.value = ''; sel.dispatchEvent(new Event('change', { bubbles: true })); await W(200);
    ok('back to the copier Lead: saved as none picked', calls.length === 2 && calls[1][1].p_acc === null && /copier Lead/.test(cap()) && window.__stLbJudge === '', [calls[1], cap()]);
    // offline
    fail = true; sel.value = O10.id; sel.dispatchEvent(new Event('change', { bubbles: true })); await W(200); fail = false;
    ok('if it cannot be saved, the picker goes back and says so', sel.value === '' && /Not saved/.test(cap()) && window.__stLbJudge === '', [sel.value, cap()]);
    // reopened with an account picked that has since been archived
    close(); await W(200); judge = OLD.id; window.__stLbHidden = undefined; window.__stLbJudge = undefined;
    document.getElementById('settings-gear').click(); await W(700);
    ok('reopened: the saved pick shows, even an account archived since', sel.value === OLD.id && opts().indexOf('Old 5K (archived)') > 0, [sel.value, opts()]);
    if (window.innerWidth <= 420) {
      var rr = sel.getBoundingClientRect();
      ok('phone: the picker sits inside the screen', rr.right <= window.innerWidth && document.documentElement.scrollWidth <= window.innerWidth + 1, rr.right);
    }
    // one account: nothing is ever copied, so no picker
    close(); await W(200); data.accounts = [A70]; judge = null; window.__stLbJudge = undefined;
    document.getElementById('settings-gear').click(); await W(700);
    ok('one account: the row is hidden', (sel.closest('.set-row') || sel).style.display === 'none');
    // a mentor view
    close(); await W(200); data.accounts = [A70, T10, O10];
    document.body.classList.add('mentor-viewing'); try { window.__stLbOpt.paint(); } catch (e) {} await W(50);
    ok('a mentor view hides it', (sel.closest('.set-row') || sel).style.display === 'none');
    document.body.classList.remove('mentor-viewing');
  } catch (e) { ok('ran without throwing', false, String(e && e.stack || e)); }
  close();
  data.accounts = realAcc; data.mt5LoginMap = realMap; window.__stEA = realEA; window.__stSB = realSB; window.currentUser = realUser; window.__stLbHidden = undefined; window.__stLbJudge = undefined;
  return out;
})()
