// End-to-end test: deleting a direct-message conversation (Nestor, 27 Oct 2026: "ive deleted all my DM chats but the aurora one persists,
// get rid of it when i delete the chats"). The DMs on an in-memory database kept across reloads (localStorage __dmdb); the deletion
// itself lives in the synced journal (data.dmDel). Run: python tests/dmdelete_run.py (two page loads).
//   A  Aurora's conversation (an unread message from her) open, deleted: gone from the list, its messages gone, kept in data.dmDel;
//      the panel opened again does not bring it back; opened by link it shows none of the old messages
//   B  reloaded as another device (this device's seen list and the old hidden list gone): still gone; a message from her after the
//      deletion brings it back, with only that message
(async function () {
  var PHASE = '__PHASE__';
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    for (var i0 = 0; i0 < 200 && !(window.STDM && window.__stSB && window.STCommunity && window.STCloud); i0++) await W(100);
    await W(800);
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var ME = '33333333-3333-4333-8333-333333333333', AURORA = '44444444-4444-4444-8444-444444444444', TROY = '22222222-2222-4222-8222-222222222222', now = Date.now();
    if (PHASE === 'B') { try { localStorage.removeItem('st_dm_seen'); localStorage.removeItem('stdm_hidden_' + ME); } catch (e) {} }   // another device
    window.currentUser = { id: ME, email: 'dm-test@example.com', user_metadata: { full_name: 'Tester' } };
    var DB = null; try { DB = JSON.parse(localStorage.getItem('__dmdb') || 'null'); } catch (e) {}
    if (!DB || PHASE === 'A') {
      var msg = function (id, from, to, body, ago) { return { id: id, sender_id: from, recipient_id: to, body: body, created_at: new Date(now - ago * 60000).toISOString() }; };
      DB = { dm_messages: [msg('a1', AURORA, ME, 'Hi! Did you see the London open?', 300), msg('a2', ME, AURORA, 'Yes, took the 50%', 290), msg('a3', AURORA, ME, 'Nice one', 280), msg('a4', AURORA, ME, 'See you tomorrow', 200),
                             msg('t1', TROY, ME, 'Spread ok?', 100), msg('t2', ME, TROY, 'All good', 90)],
             friendships: [{ requester_id: ME, addressee_id: AURORA, status: 'accepted' }, { requester_id: TROY, addressee_id: ME, status: 'accepted' }] };
      try { var d0 = window.STCloud.getData(); delete d0.dmDel; window.STCloud.save(); } catch (e) {}
      try { localStorage.removeItem('st_dm_seen'); localStorage.removeItem('stdm_hidden_' + ME); } catch (e) {}
    }
    var save = function () { try { localStorage.setItem('__dmdb', JSON.stringify(DB)); } catch (e) {} };
    var MEMBERS = [{ id: ME, name: 'Tester', avatar: '', plan: 'comp', paid: true }, { id: AURORA, name: 'Aurora', avatar: '', plan: 'comp', paid: true }, { id: TROY, name: 'Troy', avatar: '', plan: 'comp', paid: true }];
    var runQ = function (st) {
      var rows = DB[st.table] || [];
      var res = rows.filter(function (r) { return (!st.pairs || st.pairs.some(function (pp) { return r.sender_id === pp[0] && r.recipient_id === pp[1]; })) && st.filters.every(function (x) { if (x[2] === 'gt') return r[x[0]] > x[1]; if (x[2] === 'lt') return r[x[0]] < x[1]; if (x[2] === 'in') return x[1].indexOf(r[x[0]]) > -1; return String(r[x[0]]) === String(x[1]); }); });
      if (st.op === 'insert') { var p = Array.isArray(st.payload) ? st.payload : [st.payload]; p.forEach(function (x) { (DB[st.table] = DB[st.table] || []).push(Object.assign({ id: 'n' + Math.random(), created_at: new Date().toISOString() }, x)); }); save(); return { data: st.selectAfter ? p[0] : null, error: null }; }
      if (st.op !== 'select') return { data: null, error: null };
      if (st.order) res.sort(function (a, b) { return (a[st.order[0]] < b[st.order[0]] ? -1 : 1) * (st.order[1] ? 1 : -1); });
      return st.single ? { data: res[0] || null, error: null } : { data: res, error: null, count: res.length };
    };
    var Q = function (table) {
      var st = { table: table, filters: [], op: 'select' }, b = {};
      b.or = function (q) { var pr = []; String(q).replace(/and\(sender_id\.eq\.([^,]+),recipient_id\.eq\.([^)]+)\)/g, function (m, x, y) { pr.push([x, y]); }); if (pr.length) st.pairs = pr; return b; };   // the pair of a conversation
      ['select', 'limit', 'range', 'gte', 'lte', 'is', 'ilike', 'like', 'not', 'neq', 'contains', 'filter', 'match', 'textSearch', 'abortSignal', 'returns', 'csv'].forEach(function (k2) { b[k2] = function () { if (k2 === 'select' && st.op !== 'select') st.selectAfter = true; return b; }; });
      b.order = function (c, o) { st.order = [c, !(o && o.ascending === false)]; return b; };
      b.eq = function (a, v) { st.filters.push([a, v]); return b; }; b['in'] = function (a, v) { st.filters.push([a, v, 'in']); return b; };
      b.gt = function (a, v) { st.filters.push([a, v, 'gt']); return b; }; b.lt = function (a, v) { st.filters.push([a, v, 'lt']); return b; };
      b.maybeSingle = b.single = function () { st.single = true; return b; };
      b.insert = function (p) { st.op = 'insert'; st.payload = p; return b; }; b.update = function (p) { st.op = 'update'; st.payload = p; return b; }; b.upsert = function (p) { st.op = 'upsert'; st.payload = p; return b; }; b['delete'] = function () { st.op = 'delete'; return b; };
      b.then = function (res, rej) { return Promise.resolve().then(function () { return runQ(st); }).then(res, rej); }; b['catch'] = function (fn) { return b.then(null, fn); };
      return b;
    };
    var threadsOf = function () { var by = {}; DB.dm_messages.forEach(function (m) { var p = m.sender_id === ME ? m.recipient_id : (m.recipient_id === ME ? m.sender_id : null); if (!p) return; if (!by[p] || m.created_at > by[p].last_at) by[p] = { partner_id: p, last_at: m.created_at, last_body: m.body }; });
      return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return a.last_at < b.last_at ? 1 : -1; }); };
    var SB = window.__stSB, from0 = SB.from.bind(SB), rpc0 = SB.rpc.bind(SB), MINE = /^(dm_|friend|channels|categories|channel_|roles|member_roles|profiles_public|community|presence|notif)/;
    SB.from = function (t) { return MINE.test(t) ? Q(t) : from0(t); };
    SB.rpc = function (fn, a) { if (fn === 'st_dm_threads') return Promise.resolve({ data: threadsOf(), error: null }); if (fn === 'st_members') return Promise.resolve({ data: MEMBERS, error: null }); if (fn === 'st_admin_ids') return Promise.resolve({ data: [], error: null }); return rpc0(fn, a); };
    var fakeChan = function () { var ch = { on: function () { return ch; }, subscribe: function (cb) { try { cb && cb('SUBSCRIBED'); } catch (e) {} return ch; }, unsubscribe: function () {}, send: function () { return Promise.resolve(); }, track: function () { return Promise.resolve(); }, presenceState: function () { return {}; } }; return ch; };
    SB.channel = function () { return fakeChan(); }; SB.removeChannel = function () {};
    var SESSION = { access_token: 'test', token_type: 'bearer', user: { id: ME, email: 'dm-test@example.com', user_metadata: { full_name: 'Tester' }, app_metadata: {} } };   // signed in: the app's own currentUser
    SB.auth.getSession = function () { return Promise.resolve({ data: { session: SESSION }, error: null }); };
    SB.auth.getUser = function () { return Promise.resolve({ data: { user: SESSION.user }, error: null }); };
    try { await Promise.race([SB.auth._notifyAllSubscribers('SIGNED_IN', SESSION), W(8000)]); } catch (e) {}
    await W(1500); document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    window.STChat = window.STChat || {}; window.STChat.confirmDelete = function (go) { go(); };   // the confirm, said yes to
    var $ = function (s) { return document.querySelector(s); };
    var names = function () { return Array.prototype.map.call(document.querySelectorAll('#stdm-list .stdm-conv .cn'), function (x) { return x.textContent; }); };
    var shown = function () { return Array.prototype.map.call(document.querySelectorAll('#stdm-msgs .dcx-msg .dcx-text'), function (x) { return x.textContent; }); };
    var waitFor = async function (f, ms) { for (var t = 0; t < (ms || 5000) / 150 && !f(); t++) await W(150); return f(); };
    var dmDel = function () { try { return (window.STCloud.getData().dmDel || {})[AURORA] || 0; } catch (e) { return 0; } };
    var reopen = async function () { try { window.STDM.open(); } catch (e) {} await W(900); };
    var close = function () { var x = document.querySelector('#stdm .stdm-x, #stdm [data-close], #stdm-close'); if (x) x.click(); else { var o = document.getElementById('stdm'); if (o) o.classList.remove('open', 'thread'); } };

    if (PHASE === 'A') {
      await reopen();
      check('before: both conversations listed', await waitFor(function () { var n = names(); return n.indexOf('Aurora') >= 0 && n.indexOf('Troy') >= 0; }), names());
      window.STDM.openThread(AURORA, 'Aurora', ''); await waitFor(function () { return shown().length >= 4; });
      check('...Aurora\'s open, her history there', shown().length === 4, shown());
      var x = $('#stdm-list .stdm-conv-x[data-del="' + AURORA + '"]'); if (x) x.click(); await W(600);
      check('deleted: gone from the list, Troy stays', names().indexOf('Aurora') < 0 && names().indexOf('Troy') >= 0, names());
      check('...the open conversation goes with it', !document.getElementById('stdm').classList.contains('thread') && shown().length === 0, shown());
      check('...kept in the synced journal (data.dmDel)', dmDel() >= Date.parse(DB.dm_messages.filter(function (m) { return m.id === 'a4'; })[0].created_at), dmDel());
      close(); await W(300); await reopen();
      check('the panel opened again: Aurora does not come back (not reopened, not listed)', !document.getElementById('stdm').classList.contains('thread') && names().indexOf('Aurora') < 0 && shown().length === 0, [names(), shown()]);
      window.STDM.openThread(AURORA, 'Aurora', ''); await W(1200);
      check('opened by a link: none of the old messages', shown().length === 0, shown());
      try { window.STCloud.save(); } catch (e) {}
      save();
    }
    if (PHASE === 'B') {
      await reopen();
      check('reloaded on another device (no seen list, an unread message from her): still gone', await waitFor(function () { return names().indexOf('Troy') >= 0; }) && names().indexOf('Aurora') < 0 && dmDel() > 0, [names(), dmDel()]);
      DB.dm_messages.push({ id: 'a5', sender_id: AURORA, recipient_id: ME, body: 'New idea for tomorrow', created_at: new Date().toISOString() }); save();
      close(); await W(300); await reopen();
      check('a message from her after the deletion: the conversation back', await waitFor(function () { return names().indexOf('Aurora') >= 0; }), names());
      window.STDM.openThread(AURORA, 'Aurora', ''); await waitFor(function () { return shown().length >= 1; });
      check('...with only that message, the old ones still gone', shown().length === 1 && /New idea/.test(shown()[0]), shown());
    }
    check('no script errors', !errs.length, errs.slice(0, 4));
  } catch (e) { results.push({ name: 'the test ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(results);
})()
