// End-to-end test: the Charts chat's unread count after a reload (Nestor, 27 Oct 2026: "everytime i reload the charts it says i have 80
// unread messages, fix this. i have already read them") and the add-reaction face (same day: "can you make the emoji face no so black?
// it doesnt look good on a light theme"). The Community on an in-memory database that the runner keeps across reloads (localStorage
// __crdb), with channel_reads and st_mark_channel_read in it. Phases, one page load each (python tests/chatread_run.py):
//   1  the chat open: #session-chat is marked read up to its newest message, on the server and on this device
//   2  reloaded as another device (this device's marks cleared), the chat closed: 0 on its icon; a message from someone else: 1;
//      one of his own: still 1; the chat opened: 0, the mark moved on
//   3  reloaded with no channel_reads table (this device's marks only): 0 again; someone else's message: 1
//   shot  the chat open with a reaction, the hover toolbar and the message menu, for the before / after crops
(async function () {
  var PHASE = '__PHASE__';
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB && window.STCommunity); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    try { Object.defineProperty(document, 'visibilityState', { configurable: true, get: function () { return 'visible'; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var P = window.__stPractice, LC = window.__stLC, T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000, phoneNow = innerWidth < 760;
    P._lvClock(T0 * 1000 - Date.now());
    window.isSessionLive = function () { return true; };
    window.__stPlatOff = false; window.__stLcForce = true; await W(1200);
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
    var ADMIN = 'ccaf6a5e-69ed-443c-8d92-bc7fdd464f49', TROY = '22222222-2222-4222-8222-222222222222', now = Date.now();
    if (PHASE === '2') { try { Object.keys(localStorage).forEach(function (k) { if (/^st_chread:/.test(k)) localStorage.removeItem(k); }); } catch (e) {} }   // another device
    window.currentUser ={ id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' } };
    try { Object.defineProperty(window.STCloud, 'userId', { value: ADMIN, configurable: true, writable: true }); } catch (e) {}
    var DB = null; try { DB = JSON.parse(localStorage.getItem('__crdb') || 'null'); } catch (e) {}
    if (!DB || PHASE === '1' || PHASE === 'shot') {
      DB = {
        categories: [{ id: 'cat1', name: 'Trading', position: 0 }],
        channels: [{ id: 'ch-chat', slug: 'session-chat', name: '💬 session-chat', topic: 'Live during the session', access_policy: 'mentorship,bundle,trial', post_policy: 'mentorship,bundle,trial', required_role: null, category_id: 'cat1', position: 1 },
                   { id: 'ch-gen', slug: 'general', name: '👋 general', topic: '', access_policy: 'mentorship,bundle,trial', post_policy: 'mentorship,bundle,trial', required_role: null, category_id: 'cat1', position: 2 }],
        channel_messages: Array.apply(null, Array(80)).map(function (x, i) { return { id: 'f' + i, channel_id: 'ch-chat', sender_id: i % 3 ? TROY : ADMIN, sender_name: i % 3 ? 'Troy' : 'Nestor', body: ['Asia range marked', 'Spread is fine now', 'Patience, no setup yet', 'News at 13:30, careful', 'London open, EUR/USD sweeping the Asia low'][i % 5], created_at: new Date(now - (80 - i) * 60000).toISOString() }; }),
        channel_reactions: [{ channel_id: 'ch-chat', message_id: 'f78', user_id: ADMIN, emoji: '👍' }, { channel_id: 'ch-chat', message_id: 'f78', user_id: TROY, emoji: '🔥' }],
        roles: [{ id: 'r-admin', name: 'Admin', color: '#ffffff', position: 5, is_mod: true }, { id: 'r-pro', name: 'Journal Pro', color: '#5ca413', position: 0 }],
        member_roles: [{ user_id: ADMIN, role_id: 'r-admin' }, { user_id: TROY, role_id: 'r-pro' }],
        channel_reads: []
      };
      try { Object.keys(localStorage).forEach(function (k) { if (/^st_chread:/.test(k)) localStorage.removeItem(k); }); } catch (e) {}
    }
    var NOREADS = PHASE === '3';   // no channel_reads table on the server
    var save = function () { try { localStorage.setItem('__crdb', JSON.stringify(DB)); } catch (e) {} };
    var newestFirst = function () { DB.channel_messages.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }); };   // as order() hands them
    newestFirst();
    var MEMBERS = [{ id: ADMIN, name: 'Nestor', avatar: '', plan: 'comp', paid: true, is_admin: true }, { id: TROY, name: 'Troy', avatar: '', plan: 'comp', paid: true, is_admin: false }];
    var calls = { reads: 0, mark: 0 };
    var runQ = function (st) {
      if (st.table === 'channel_reads') { calls.reads++; if (NOREADS) return { data: null, error: { code: 'PGRST205', message: 'Could not find the table public.channel_reads' }, status: 404 };
        return { data: DB.channel_reads.filter(function (r) { return r.user_id === ADMIN; }).map(function (r) { return { channel_id: r.channel_id, read_at: r.read_at }; }), error: null }; }
      var rows = DB[st.table] || [], match = function (r) { return st.filters.every(function (x) { return x[2] === 'in' ? x[1].indexOf(r[x[0]]) > -1 : String(r[x[0]]) === String(x[1]); }); };
      if (st.op === 'insert') { var p = Array.isArray(st.payload) ? st.payload : [st.payload]; p.forEach(function (x) { (DB[st.table] = DB[st.table] || []).push(Object.assign({ id: 'n' + Math.random(), created_at: new Date().toISOString() }, x)); }); save(); return { data: st.selectAfter ? p : null, error: null, status: 201 }; }
      if (st.op !== 'select') return { data: null, error: null };
      var res = rows.filter(match); return st.single ? { data: res[0] || null, error: null } : { data: res, error: null, count: res.length };
    };
    var Q = function (table) {
      var st = { table: table, filters: [], op: 'select' }, b = {};
      ['select', 'order', 'limit', 'range', 'gte', 'lte', 'lt', 'gt', 'is', 'ilike', 'like', 'or', 'not', 'neq', 'contains', 'filter', 'match', 'textSearch', 'abortSignal', 'returns', 'csv'].forEach(function (k2) { b[k2] = function () { if (k2 === 'select' && st.op !== 'select') st.selectAfter = true; return b; }; });
      b.eq = function (a, v) { st.filters.push([a, v]); return b; }; b['in'] = function (a, v) { st.filters.push([a, v, 'in']); return b; };
      b.maybeSingle = b.single = function () { st.single = true; return b; };
      b.insert = function (p) { st.op = 'insert'; st.payload = p; return b; }; b.update = function (p) { st.op = 'update'; st.payload = p; return b; }; b.upsert = function (p) { st.op = 'upsert'; st.payload = p; return b; }; b['delete'] = function () { st.op = 'delete'; return b; };
      b.then = function (res, rej) { return Promise.resolve().then(function () { return runQ(st); }).then(res, rej); }; b['catch'] = function (fn) { return b.then(null, fn); };
      return b;
    };
    var SB = window.__stSB, from0 = SB.from.bind(SB), rpc0 = SB.rpc.bind(SB), COMM = /^(categories|channels|channel_|roles|member_roles|dm_|friend|profiles_public|community|presence|notif)/;
    SB.from = function (t) { return COMM.test(t) ? Q(t) : from0(t); };
    SB.rpc = function (fn, a) {
      if (fn === 'st_admin_ids') return Promise.resolve({ data: [{ id: ADMIN }], error: null });
      if (fn === 'st_members') return Promise.resolve({ data: MEMBERS, error: null });
      if (fn === 'st_mark_channel_read') { calls.mark++; if (NOREADS) return Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
        var r = DB.channel_reads.filter(function (x) { return x.user_id === ADMIN && x.channel_id === a.p_channel; })[0];
        if (!r) { r = { user_id: ADMIN, channel_id: a.p_channel, read_at: a.p_at }; DB.channel_reads.push(r); } else if (a.p_at > r.read_at) r.read_at = a.p_at;
        save(); return Promise.resolve({ data: r.read_at, error: null }); }
      return rpc0(fn, a); };
    // realtime: the Community's subscriptions kept, so the test can hand it a new message as Supabase would
    var subs = [];
    var fakeChan = function () { var ch = { on: function (ev, f, cb) { if (f && f.table) subs.push({ ev: f.event, table: f.table, filter: f.filter || '', cb: cb }); return ch; }, subscribe: function (cb) { try { cb && cb('SUBSCRIBED'); } catch (e) {} return ch; }, unsubscribe: function () {}, send: function () { return Promise.resolve(); }, track: function () { return Promise.resolve(); }, presenceState: function () { return {}; } }; return ch; };
    var chan0 = SB.channel.bind(SB); SB.channel = function (name) { return /^realtime:stl-|^stl-/.test(String(name)) ? chan0(name) : fakeChan(); };
    var arrive = function (m) { DB.channel_messages.push(m); newestFirst(); save(); subs.forEach(function (s) { if (s.table === 'channel_messages' && s.ev === 'INSERT' && (!s.filter || s.filter === 'channel_id=eq.' + m.channel_id)) { try { s.cb({ new: m }); } catch (e) {} } }); };
    var SESSION = { access_token: 'test', token_type: 'bearer', user: { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' }, app_metadata: {} } };
    SB.auth.getSession = function () { return Promise.resolve({ data: { session: SESSION }, error: null }); };
    SB.auth.getUser = function () { return Promise.resolve({ data: { user: SESSION.user }, error: null }); };
    try { await SB.auth._notifyAllSubscribers('SIGNED_IN', SESSION); } catch (e) {}
    await W(2500);
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
    var css0 = document.createElement('style'); css0.textContent = '#st-nudge, .st-nudge, .st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"], .dcx-notif-prompt { display: none !important; }'; document.head.appendChild(css0);
    try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15, 1, 60, 240]; C.syms = []; C.mini = false; C.resume = null; delete C.lookDk; C.look = {}; } catch (e) {}
    var pn = (PHASE === '1' || PHASE === 'shot') ? 'ch' : 'td';
    try { localStorage.setItem('st_plat', JSON.stringify({ pn: pn, pw: {}, bh: 150, fold: false, tab: 'pos' })); localStorage.removeItem('st_platchat_ch'); } catch (e) {}
    var acc0 = (data.accounts || [])[0] || {};
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-plat', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-plat' });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
    var $ = function (s) { return document.querySelector(s); }, root = function () { return document.getElementById('dcx-root'); };
    for (k = 0; k < 60 && !(root() && root().classList.contains('dcx-plat') && document.querySelectorAll('#dcx-msgs .dcx-msg').length >= 20); k++) await W(250);
    await W(1500);
    var badge = function () { var b = phoneNow ? $('.ph-chb .pl-rbn') : $('.plat-rail .pl-rbch .pl-rbn'); return !b ? 'none' : (b.hidden ? '' : b.textContent); };
    var newest = function () { return DB.channel_messages.reduce(function (t, m) { return m.channel_id === 'ch-chat' && m.created_at > t ? m.created_at : t; }, ''); };
    var mark = function () { var r = DB.channel_reads.filter(function (x) { return x.user_id === ADMIN && x.channel_id === 'ch-chat'; })[0]; return r ? r.read_at : null; };
    var local = function () { try { return (JSON.parse(localStorage.getItem('st_chread:' + ADMIN) || '{}') || {})['ch-chat'] || 0; } catch (e) { return 0; } };
    var waitFor = async function (f, ms) { for (var t = 0; t < (ms || 6000) / 200 && !f(); t++) await W(200); return f(); };

    if (PHASE === '1') {
      var ok1 = await waitFor(function () { return mark() === newest(); }, 8000);
      check('the chat open: #session-chat is marked read up to its newest message, on the server', ok1, [mark(), newest(), calls]);
      check('...and on this device', local() === Date.parse(newest()), [local(), Date.parse(newest())]);
      $('.plat-rail [data-plr="td"]').click(); await W(2200);
      check('closed: nothing on its icon', badge() === '', badge());
    }
    if (PHASE === '2') {
      check('reloaded on another device (this one\'s marks gone), 80 messages there, the chat closed: nothing on its icon', local() === Date.parse(mark()) && document.querySelectorAll('#dcx-msgs .dcx-msg').length >= 60 && await waitFor(function () { return badge() === ''; }, 4000) && window.STCommunity.unread('session-chat') === 0,
        [badge(), window.STCommunity.unread && window.STCommunity.unread('session-chat'), local(), mark(), calls]);
      await W(1500); check('...and it stays at nothing', badge() === '', badge());
      arrive({ id: 'new1', channel_id: 'ch-chat', sender_id: TROY, sender_name: 'Troy', body: 'Price tapped the 50%', created_at: new Date().toISOString() });
      check('a new message from someone else: 1', await waitFor(function () { return badge() === '1'; }, 5000), badge());
      arrive({ id: 'new2', channel_id: 'ch-chat', sender_id: ADMIN, sender_name: 'Nestor', body: 'In at the 50%', created_at: new Date(Date.now() + 1000).toISOString() });
      await W(2500); check('...one of his own after it: still 1 (never his own)', badge() === '1', badge());
      $('.plat-rail [data-plr="ch"]').click();
      var ok2 = await waitFor(function () { return badge() === '' && mark() === newest(); }, 8000);
      check('opening the chat: nothing on its icon, and read up to the newest', ok2, [badge(), mark(), newest()]);
      $('.plat-rail [data-plr="td"]').click(); await W(2500);
      check('closed again after reading: nothing', badge() === '', badge());
    }
    if (PHASE === '3') {
      check('reloaded with no channel_reads table: this device\'s marks, nothing on its icon', await waitFor(function () { return badge() === ''; }, 4000) && window.STCommunity.unread('session-chat') === 0 && calls.mark === 0, [badge(), calls]);
      arrive({ id: 'new3', channel_id: 'ch-chat', sender_id: TROY, sender_name: 'Troy', body: 'TP hit', created_at: new Date().toISOString() });
      check('...someone else\'s message: 1', await waitFor(function () { return badge() === '1'; }, 5000), badge());
    }
    if (PHASE === 'shot') {
      if (phoneNow) { var chb = $('.ph-icons .ph-chb'); if (chb) chb.click(); await W(1500); }
      var ml = document.getElementById('dcx-msgs'); if (ml) ml.scrollTop = ml.scrollHeight; await W(400);
      var rows = document.querySelectorAll('#dcx-msgs .dcx-msg'), row = null;
      for (var j = rows.length - 1; j >= 0 && !row; j--) if (rows[j].querySelector('.dcx-reacts')) row = rows[j];
      row = row || rows[rows.length - 2];
      if (row) { row.classList.add('__crfocus'); var st0 = document.createElement('style'); st0.textContent = '.dcx-msg.__crfocus .dcx-actions{display:flex !important;}'; document.head.appendChild(st0); }
      await W(300);
      var R = function (el) { if (!el) return null; var r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
      window.__crRects = { msg: R(row), acts: R(row && row.querySelector('.dcx-actions')), reacts: R(row && row.querySelector('.dcx-reacts')) };
      var smile = row && row.querySelector('.dcx-qpick svg, .dcx-react-add svg');
      check('the add-reaction faces: outlines in the toolbar\'s grey, not filled', !!smile && smile.getAttribute('fill') === 'none' && !!smile.querySelector('circle'), smile && smile.outerHTML.slice(0, 120));
    }
    check('no script errors', !errs.length, errs.slice(0, 4));
  } catch (e) { results.push({ name: 'the test ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(results);
})()
