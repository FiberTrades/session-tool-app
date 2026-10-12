(async function () {
  // Community (12 Oct 2026): a member on a free trial is in the members list, tagged with the Free Trial role; and in
  // the Roles window the emoji picker opens beside its button even when the list of roles is scrolled.
  // Signed in as the admin through the app's own auth listeners, on an in-memory database behind the app's client.
  // Run: python tests/browser_test.py tests/community_roles_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.STCommunity && document.readyState === 'complete'); i++) await W(100);
    await W(5000);
    var css = document.createElement('style');
    css.textContent = '#st-nudge, .st-nudge, .st-tour-ov, .modal-bg, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }';
    document.head.appendChild(css);
    var ADMIN = 'ccaf6a5e-69ed-443c-8d92-bc7fdd464f49', TROY = '22222222-2222-4222-8222-222222222222', JAMES = '33333333-3333-4333-8333-333333333333';
    window.currentUser = { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' } };
    try { Object.defineProperty(window.STCloud, 'userId', { value: ADMIN, configurable: true, writable: true }); } catch (e) {}
    var now = Date.now();
    var R = function (id, name, color, position, mod) { return { id: id, name: name, color: color, position: position, is_mod: !!mod, created_at: new Date(now).toISOString() }; };
    var DB = {
      channels: [{ id: 'ch-chat', slug: 'session-chat', name: '💬 session-chat', access_policy: 'mentorship,bundle,trial', post_policy: 'mentorship,bundle,trial', required_role: null, category_id: null, position: 1 }],
      channel_messages: [{ id: 'm1', channel_id: 'ch-chat', sender_id: TROY, sender_name: 'Troy', body: 'hello', created_at: new Date(now - 7200000).toISOString() }],
      channel_reactions: [],
      roles: [R('r-pro', 'Journal Pro', '#5ca413', 0), R('r-trial', 'Free Trial 👽', '#8b939d', 2), R('r-grad', 'Academy Graduate 🎗', '#e1ff00', 4), R('r-ment', 'Mentorship 💎', '#474df5', 4),
              R('r-admin', 'Admin', '#ffffff', 5, true), R('r-exp', 'Experienced Member 🎓', '#ff4d97', 5), R('r-x1', 'Scalper ⚡', '#22aaff', 6), R('r-x2', 'Swing 🐂', '#ffaa22', 7)],
      member_roles: [{ user_id: ADMIN, role_id: 'r-admin' }, { user_id: TROY, role_id: 'r-pro' }, { user_id: JAMES, role_id: 'r-trial' }]
    };
    // what st_members() returns now: paid and comp members, and a member whose trial is running
    var MEMBERS = [{ id: ADMIN, name: 'Nestor', avatar: '', plan: 'comp', paid: true, is_admin: true }, { id: TROY, name: 'Troy', avatar: '', plan: 'comp', paid: true, is_admin: false },
                   { id: JAMES, name: 'JamesStrategy', avatar: '', plan: null, paid: false, is_admin: false }];
    function run(st) {
      var t = st.table, f = st.filters, rows = DB[t] || [];
      var match = function (r) { return f.every(function (x) { return x[2] === 'in' ? x[1].indexOf(r[x[0]]) > -1 : String(r[x[0]]) === String(x[1]); }); };
      if (st.op === 'insert') { var p = Array.isArray(st.payload) ? st.payload : [st.payload]; p.forEach(function (x) { (DB[t] = DB[t] || []).push(Object.assign({ id: 'n' + Math.random(), created_at: new Date().toISOString() }, x)); }); return { data: st.selectAfter ? p : null, error: null, status: 201 }; }
      if (st.op === 'delete') { DB[t] = rows.filter(function (r) { return !match(r); }); return { data: null, error: null, status: 204 }; }
      if (st.op === 'update' || st.op === 'upsert') return { data: null, error: null };
      var res = rows.filter(match);
      if (st.single) return { data: res[0] || null, error: null };
      return { data: res, error: null, count: res.length };
    }
    function Q(table) {
      var st = { table: table, filters: [], op: 'select' }, b = {};
      ['select', 'order', 'limit', 'range', 'gte', 'lte', 'lt', 'gt', 'is', 'ilike', 'like', 'or', 'not', 'neq', 'contains', 'filter', 'match', 'textSearch', 'abortSignal', 'returns', 'csv'].forEach(function (k) { b[k] = function () { if (k === 'select' && st.op !== 'select') st.selectAfter = true; return b; }; });
      b.eq = function (k, v) { st.filters.push([k, v]); return b; };
      b['in'] = function (k, v) { st.filters.push([k, v, 'in']); return b; };
      b.maybeSingle = b.single = function () { st.single = true; return b; };
      b.insert = function (p) { st.op = 'insert'; st.payload = p; return b; };
      b.update = function (p) { st.op = 'update'; st.payload = p; return b; };
      b.upsert = function (p) { st.op = 'upsert'; st.payload = p; return b; };
      b['delete'] = function () { st.op = 'delete'; return b; };
      b.then = function (res, rej) { return Promise.resolve().then(function () { return run(st); }).then(res, rej); };
      b['catch'] = function (fn) { return b.then(null, fn); };
      return b;
    }
    var C = window.__stSB;
    C.from = function (t) { return Q(t); };
    C.rpc = function (fn) { var d = fn === 'st_admin_ids' ? [{ id: ADMIN }] : fn === 'st_members' ? MEMBERS : null; var p = Promise.resolve({ data: d, error: null }); p.then = p.then.bind(p); return p; };
    var fakeChan = function () { var ch = { on: function () { return ch; }, subscribe: function (cb) { try { cb && cb('SUBSCRIBED'); } catch (e) {} return ch; }, unsubscribe: function () {}, send: function () { return Promise.resolve(); }, track: function () { return Promise.resolve(); }, presenceState: function () { return {}; } }; return ch; };
    C.channel = fakeChan; C.removeChannel = function () { return Promise.resolve(); };
    var SESSION = { access_token: 'test', token_type: 'bearer', user: { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' }, app_metadata: {} } };
    C.auth.getSession = function () { return Promise.resolve({ data: { session: SESSION }, error: null }); };
    C.auth.getUser = function () { return Promise.resolve({ data: { user: SESSION.user }, error: null }); };
    try { await C.auth._notifyAllSubscribers('SIGNED_IN', SESSION); } catch (e) {}
    await W(2500);
    var tab = document.querySelector('.tab[data-page="community"]'); if (tab) tab.click(); await W(3000);

    // ---- 1) the members list: the trial member is there, offline, in the trial role's colour with its emoji ----
    var mrow = function (uid) { return document.querySelector('#dcx-members-list .dcx-member[data-uid="' + uid + '"]'); };
    for (var k = 0; k < 20 && !mrow(TROY); k++) await W(300);
    var j = mrow(JAMES), t = mrow(TROY);
    ok('the members list is drawn', !!t, (document.getElementById('dcx-members-list') || {}).innerText);
    ok('a member on a free trial is in the list', !!j && /JamesStrategy/.test(j.textContent), j && j.textContent);
    ok('under Offline when not in Community', !!j && j.classList.contains('off'), j && j.className);
    var nm = j && j.querySelector('.nm');
    ok('tagged with the Free Trial role: its grey', !!nm && /139,\s*147,\s*157/.test(getComputedStyle(nm).color), nm && getComputedStyle(nm).color);
    var bd = j && j.querySelector('.dcx-role-badges');
    // the app may draw an emoji as a picture, so read the picture's alt text too
    var bdTxt = bd ? bd.textContent + [].map.call(bd.querySelectorAll('img'), function (im) { return im.alt || ''; }).join('') : '';
    ok('and its emoji, with the role named on hover', !!bd && bdTxt.indexOf('👽') >= 0 && /Free Trial/.test(bd.getAttribute('title') || ''), bd && [bdTxt, bd.getAttribute('title'), bd.innerHTML.slice(0, 120)]);
    ok('a paying member keeps their own role colour', !!t && /92,\s*164,\s*19/.test(getComputedStyle(t.querySelector('.nm')).color), t && getComputedStyle(t.querySelector('.nm')).color);

    // ---- 2) the Roles window: the emoji picker opens beside its button, scrolled or not ----
    var sbtn = document.getElementById('dcx-settings'); if (sbtn) sbtn.click(); await W(500);
    var rb = document.getElementById('dcx-set-roles');
    ok('the admin can open Manage roles', !!rb, !!sbtn);
    if (rb) {
      rb.click(); await W(700);
      var card = document.querySelector('#dcx-modal .dcx-modal-card'), list = card.querySelector('.dcx-role-list'), rowsEl = list.querySelectorAll('.dcx-role-row');
      // the page behind is locked while a Community pop-up is open, so the wheel moves the list and not the app
      ok('the page behind cannot scroll while the Roles window is open', getComputedStyle(document.documentElement).overflowY === 'hidden' && getComputedStyle(document.body).overflowY === 'hidden', [getComputedStyle(document.documentElement).overflowY, getComputedStyle(document.body).overflowY]);
      ok('and the list keeps its own scrolling to itself', getComputedStyle(list).overscrollBehaviorY === 'contain' && getComputedStyle(list).overflowY === 'auto', getComputedStyle(list).overscrollBehaviorY);
      ok('the role list is long enough to scroll', rowsEl.length === 8 && list.scrollHeight > list.clientHeight + 40, [rowsEl.length, list.scrollHeight, list.clientHeight]);
      var near = function (btn) { var p = card.querySelector('.dcx-remoji'), pr = p.getBoundingClientRect(), br = btn.getBoundingClientRect();
        var below = Math.abs(pr.top - br.bottom) <= 10, above = Math.abs(br.top - pr.bottom) <= 10;
        return { open: p.classList.contains('open'), beside: below || above, inView: pr.top >= 0 && pr.bottom <= innerHeight + 1, rightEdge: Math.round(pr.right - br.right), gap: below ? 'below' : above ? 'above' : Math.round(pr.top - br.bottom) }; };
      // not scrolled: the first role
      var b0 = rowsEl[0].querySelector('.dcx-role-emoji'); b0.click(); await W(250);
      var n0 = near(b0);
      ok('first role, list at the top: the picker opens beside the button', n0.open && n0.beside && n0.inView, n0);
      b0.click(); await W(150);
      // scrolled to the bottom: the last role in the list (this is where it used to open far below)
      list.scrollTop = list.scrollHeight; await W(250);
      var bl = rowsEl[rowsEl.length - 1].querySelector('.dcx-role-emoji'); bl.click(); await W(250);
      var nl = near(bl);
      ok('last role, list scrolled down: the picker still opens beside the button', nl.open && nl.beside && nl.inView, nl);
      // scrolling the list puts the picker away rather than leaving it behind
      list.scrollTop = 0; list.dispatchEvent(new Event('scroll')); await W(300);   // a hidden test window does not always deliver the scroll event by itself
      ok('scrolling the list closes the picker', !card.querySelector('.dcx-remoji').classList.contains('open'));
      // the new-role row at the bottom of the window
      var bn = document.getElementById('dcx-newemoji'); bn.click(); await W(250);
      var nn = near(bn);
      ok('the new-role row: beside its button and on screen', nn.open && nn.beside && nn.inView, nn);
      // picking an emoji still writes it into the name
      var inp = document.getElementById('dcx-newrole'); inp.value = 'Test';
      var first = card.querySelector('.dcx-remoji button'); first.click(); await W(200);
      var closeBtn = document.getElementById('dcx-mc') || card.querySelector('.dcx-mc');
      ok('picking an emoji adds it to the role name', inp.value.length > 4 && inp.value.indexOf('Test') === 0 && !card.querySelector('.dcx-remoji').classList.contains('open'), inp.value);
      if (closeBtn) closeBtn.click(); else document.getElementById('dcx-modal').classList.remove('open');
      await W(300);
      ok('closing the window gives the page its scrolling back', getComputedStyle(document.documentElement).overflowY !== 'hidden', getComputedStyle(document.documentElement).overflowY);
    }
  } catch (e) { ok('ran without an error', false, String(e && e.stack || e)); }
  return out;
})()
