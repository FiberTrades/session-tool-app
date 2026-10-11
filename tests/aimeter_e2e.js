(async function () {
  // AI Meter (11 Oct 2026): a row is a person. Usage left behind by an account that no longer exists is not listed
  // (it stays in the All traders total), and an account that exists shows its journal name even on a trial.
  // Run: python tests/browser_test.py tests/aimeter_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  var A = '11111111-1111-4111-8111-aaaaaaaaaaaa', B = '22222222-2222-4222-8222-bbbbbbd3e727', C = '33333333-3333-4333-8333-cccccc5feb65';
  var day = new Date().toISOString().slice(0, 10);
  var usage = [A, B, C].map(function (u, i) { return { user_id: u, day: day, model: 'claude-haiku-4-5', mode: 'chat', calls: i + 1, input_tokens: 1000, output_tokens: 200, cache_creation_tokens: 0, cache_read_tokens: 0, web_search_requests: 0 }; });
  var peopleFail = false;
  var chain = function () { var c = { select: function () { return c; }, eq: function () { return c; }, order: function () { return c; }, limit: function () { return c; }, maybeSingle: function () { return Promise.resolve({ data: null }); }, then: function (f) { return Promise.resolve({ data: [] }).then(f); } }; return c; };
  window.currentUser = { email: 'be.o2@hotmail.com', id: A };
  window.__stSB = { rpc: function (name) {
      if (name === 'st_ai_usage_summary') return Promise.resolve({ data: usage });
      if (name === 'st_members') return Promise.resolve({ data: [{ id: A, name: 'Aurora', plan: 'bundle', paid: true }] });
      if (name === 'st_ai_usage_people') return peopleFail ? Promise.reject(new Error('missing')) : Promise.resolve({ data: [{ user_id: A, name: 'Aurora', account_exists: true }, { user_id: B, name: 'JamesStrategy', account_exists: true }, { user_id: C, name: null, account_exists: false }] });
      return Promise.resolve({ data: null });
    }, auth: { getUser: function () { return Promise.resolve({ data: { user: { user_metadata: {} } } }); }, updateUser: function () { return Promise.resolve({}); }, getSession: function () { return Promise.resolve({ data: { session: null } }); } },
    from: function () { return chain(); }, functions: { invoke: function () { return Promise.resolve({ data: null }); } } };
  var rows = function () { return [].map.call(document.querySelectorAll('#aimeter-table .aimeter-row'), function (r) { return r.querySelector('td').textContent.trim(); }); };
  var allRow = function () { var r = document.querySelector('#aimeter-table .aimeter-allrow'); return r ? [].map.call(r.querySelectorAll('td'), function (t) { return t.textContent.trim(); }) : []; };
  try { window.STAIMeter.render(); } catch (e) { ok('render', false, e.message); }
  await W(900);
  ok('a member on a trial shows by name, and the deleted account is not listed', rows().length === 2 && rows().indexOf('Aurora') >= 0 && rows().indexOf('JamesStrategy') >= 0 && !rows().some(function (n) { return /^…/.test(n); }), rows());
  ok('what the deleted account used is still in All traders (1 + 2 + 3 questions)', allRow()[2] === '6', allRow());
  var note = (document.getElementById('aimeter-note') || {}).textContent || '';
  ok('and the note says one deleted account is not listed', /1 deleted account is not listed; what it used is still in All traders\./.test(note), note.slice(-140));
  // without the new function (an older database), the list is what it was
  peopleFail = true;
  try { window.STAIMeter.render(); } catch (e) {}
  await W(900);
  ok('if the people list cannot be read, the tab still works as before', rows().length === 3 && rows().indexOf('Aurora') >= 0 && allRow()[2] === '6', rows());
  return out;
})()
