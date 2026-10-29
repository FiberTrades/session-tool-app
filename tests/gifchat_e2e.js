// End-to-end test: GIFs in the Charts chat hold still after their ten seconds, as in the Community tab (Nestor, 29 Oct 2026: "these GIFs
// just keep playing forever, add the limit same as in community") - in the app window's Chat panel and in Live Charts' own window.
// (Set up as popchat_e2e.js: the Charts chat in Live Charts' own window (Nestor, 27 Oct 2026: "this is on an external window, the chat seems
// broken" - an unstyled panel, a huge emoji, the call button over the channel name - and "it wasnt scrolled all the way down either when
// i opened it"). The chat in the app window first (its look measured), then Live Charts popped out: the same chat there, looking the
// same, at its newest message, new messages and the menu working there; it stays there whatever tab the app shows, goes to the
// Community tab when that opens, and comes home with Live Charts. The Community on an in-memory database (as chatread_e2e.js).
// Run through python tests/popchat_run.py (a stand-in EA through a local relay; it sizes the pop-up and takes the screenshots).
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB && window.STCommunity); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var P = window.__stPractice, LC = window.__stLC, T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000;
    P._lvClock(T0 * 1000 - Date.now());
    window.isSessionLive = function () { return true; };
    window.__stPlatOff = false; window.__stLcForce = true; await W(1200);
    window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
    var ADMIN = 'ccaf6a5e-69ed-443c-8d92-bc7fdd464f49', TROY = '22222222-2222-4222-8222-222222222222', now = Date.now();
    window.currentUser = { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' } };
    try { Object.defineProperty(window.STCloud, 'userId', { value: ADMIN, configurable: true, writable: true }); } catch (e) {}
    var DB = {
      categories: [{ id: 'cat1', name: 'Trading', position: 0 }],
      channels: [{ id: 'ch-chat', slug: 'session-chat', name: '💬 session-chat', topic: 'Live during the session', access_policy: 'mentorship,bundle,trial', post_policy: 'mentorship,bundle,trial', required_role: null, category_id: 'cat1', position: 1 },
                 { id: 'ch-gen', slug: 'general', name: '👋 general', topic: '', access_policy: 'mentorship,bundle,trial', post_policy: 'mentorship,bundle,trial', required_role: null, category_id: 'cat1', position: 2 }],
      channel_messages: [{ id: 'gif1', channel_id: 'ch-chat', sender_id: TROY, sender_name: 'Troy', body: '', attachment_type: 'image', attachment_url: location.origin + '/tests/fixtures/anim.gif', created_at: new Date(now - 30000).toISOString() }].concat(Array.apply(null, Array(40)).map(function (x, i) { return { id: 'f' + i, channel_id: 'ch-chat', sender_id: i % 3 ? TROY : ADMIN, sender_name: i % 3 ? 'Troy' : 'Nestor', body: ['Asia range marked', 'Spread is fine now', 'Patience, no setup yet', 'News at 13:30, careful', 'London open, EUR/USD sweeping the Asia low'][i % 5], created_at: new Date(now - (40 - i) * 60000).toISOString() }; })),
      channel_reactions: [{ channel_id: 'ch-chat', message_id: 'f38', user_id: ADMIN, emoji: '👍' }],
      roles: [{ id: 'r-admin', name: 'Admin', color: '#ffffff', position: 5, is_mod: true }, { id: 'r-pro', name: 'Journal Pro', color: '#5ca413', position: 0 }],
      member_roles: [{ user_id: ADMIN, role_id: 'r-admin' }, { user_id: TROY, role_id: 'r-pro' }], channel_reads: []
    };
    try { localStorage.removeItem('st_gif_seen'); } catch (e) {}   // every GIF has its ten seconds again
    var newestFirst = function () { DB.channel_messages.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }); }; newestFirst();
    var MEMBERS = [{ id: ADMIN, name: 'Nestor', avatar: '', plan: 'comp', paid: true, is_admin: true }, { id: TROY, name: 'Troy', avatar: '', plan: 'comp', paid: true, is_admin: false }];
    var runQ = function (st) {
      var rows = DB[st.table] || [], match = function (r) { return st.filters.every(function (x) { return x[2] === 'in' ? x[1].indexOf(r[x[0]]) > -1 : String(r[x[0]]) === String(x[1]); }); };
      if (st.op === 'insert') { var p = Array.isArray(st.payload) ? st.payload : [st.payload]; p.forEach(function (x) { (DB[st.table] = DB[st.table] || []).push(Object.assign({ id: 'n' + Math.random(), created_at: new Date().toISOString() }, x)); }); return { data: st.selectAfter ? p : null, error: null, status: 201 }; }
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
    SB.rpc = function (fn, a) { if (fn === 'st_admin_ids') return Promise.resolve({ data: [{ id: ADMIN }], error: null }); if (fn === 'st_members') return Promise.resolve({ data: MEMBERS, error: null }); if (fn === 'st_mark_channel_read') return Promise.resolve({ data: null, error: null }); return rpc0(fn, a); };
    var subs = [];
    var fakeChan = function () { var ch = { on: function (ev, f, cb) { if (f && f.table) subs.push({ ev: f.event, table: f.table, filter: f.filter || '', cb: cb }); return ch; }, subscribe: function (cb) { try { cb && cb('SUBSCRIBED'); } catch (e) {} return ch; }, unsubscribe: function () {}, send: function () { return Promise.resolve(); }, track: function () { return Promise.resolve(); }, presenceState: function () { return {}; } }; return ch; };
    var chan0 = SB.channel.bind(SB); SB.channel = function (name) { return /^realtime:stl-|^stl-/.test(String(name)) ? chan0(name) : fakeChan(); };
    var arrive = function (m) { DB.channel_messages.push(m); newestFirst(); subs.forEach(function (s) { if (s.table === 'channel_messages' && s.ev === 'INSERT' && (!s.filter || s.filter === 'channel_id=eq.' + m.channel_id)) { try { s.cb({ new: m }); } catch (e) {} } }); };
    var SESSION = { access_token: 'test', token_type: 'bearer', user: { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' }, app_metadata: {} } };
    SB.auth.getSession = function () { return Promise.resolve({ data: { session: SESSION }, error: null }); };
    SB.auth.getUser = function () { return Promise.resolve({ data: { user: SESSION.user }, error: null }); };
    try { await Promise.race([SB.auth._notifyAllSubscribers('SIGNED_IN', SESSION), W(8000)]); } catch (e) {}
    await W(2500);
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
    var css0 = document.createElement('style'); css0.textContent = '#st-nudge, .st-nudge, .st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"], .dcx-notif-prompt { display: none !important; }'; document.head.appendChild(css0);
    try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15, 1, 60, 240]; C.syms = []; C.mini = false; C.resume = null; delete C.lookDk; C.look = {}; } catch (e) {}
    try { localStorage.setItem('st_plat', JSON.stringify({ pn: 'ch', pw: {}, bh: 150, fold: false, tab: 'pos' })); } catch (e) {}
    var acc0 = (data.accounts || [])[0] || {};
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-plat', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-plat' });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
    var root = function () { return document.getElementById('dcx-root') || (window.__stChatDoc && window.__stChatDoc.getElementById('dcx-root')); };
    for (k = 0; k < 60 && !(root() && root().classList.contains('dcx-plat') && root().querySelectorAll('.dcx-msg').length >= 20); k++) await W(250);
    await W(2000);
    // its look in the app window, to hold the pop-out's to
    var look = function (r) { var d = r.ownerDocument, wv = d.defaultView, g = function (s) { return r.querySelector(s); }, cs = function (e) { return e ? wv.getComputedStyle(e) : {}; };
      var hd = g('.dcx-main-head'), tt = g('#dcx-ch-title'), em = tt && tt.querySelector('img'), cp = g('.dcx-composer'), snd = g('#dcx-send'), cb = g('#dcx-callbtn'), tx = g('.dcx-msg .dcx-text');
      return { css: !!d.getElementById('dcx-css'), head: hd ? Math.round(hd.getBoundingClientRect().height) : 0, headFlex: cs(hd).display, title: cs(tt).fontSize, emoji: em ? Math.round(em.getBoundingClientRect().height) : 0,
        call: cb ? cs(cb).display : 'none', comp: cp ? Math.round(cp.getBoundingClientRect().height) : 0, send: snd ? Math.round(snd.getBoundingClientRect().width) : 0, text: cs(tx).fontSize, bg: cs(g('.dcx-main')).backgroundColor }; };
    var atEnd = function (r) { var ml = r && r.querySelector('#dcx-msgs'); return !!ml && ml.scrollHeight > ml.clientHeight + 50 && ml.scrollTop + ml.clientHeight >= ml.scrollHeight - 6; };
    var gifIn = function (r, id) { var row = r && r.querySelector('.dcx-msg[data-mid="' + id + '"]'); return row && row.querySelector('.stgif'); };
    var g1 = gifIn(root(), 'gif1'), t0 = Date.now();
    check('the app window’s Chat panel: the GIF plays at first, its badge on', g1 && !g1.classList.contains('stgif-ready') && !!g1.querySelector('.stgif-badge'), g1 && g1.className);
    for (k = 0; k < 80 && !(g1 && g1.isConnected && g1.classList.contains('stgif-ready')); k++) { await W(250); if (!g1 || !g1.isConnected) g1 = gifIn(root(), 'gif1'); }
    var cv1 = g1 && g1.querySelector('canvas');
    check('...and holds still after its ten seconds, as in the Community tab', g1 && g1.classList.contains('stgif-ready') && cv1 && cv1.width > 0 && getComputedStyle(cv1).display !== 'none', g1 && [g1.className, cv1 && cv1.width, Math.round((Date.now() - t0) / 1000) + ' s']);
    // Live Charts in a window of its own, and a new GIF there
    var wo = window.open, satW = null;
    window.open = function (u, n, f) { satW = wo.call(window, u, n, f); return satW; };
    P._lcPop(); window.open = wo;
    for (k = 0; k < 140 && !(P._stage().on && satW && P._panes()[0].el.ownerDocument === satW.document && P._panes()[0].n > 30); k++) await W(150);
    for (k = 0; k < 80 && satW && satW.innerWidth < 1024; k++) await W(150);
    window.__pcSat = satW;
    var sd = satW && satW.document;
    for (k = 0; k < 60 && !(sd && sd.getElementById('dcx-root')); k++) await W(250);
    await W(2500);
    arrive({ id: 'gif2', channel_id: 'ch-chat', sender_id: TROY, sender_name: 'Troy', body: '', attachment_type: 'image', attachment_url: location.origin + '/tests/fixtures/anim.gif', created_at: new Date().toISOString() });
    await W(1500);
    var r2 = sd.getElementById('dcx-root'), g2 = gifIn(r2, 'gif2'), t2 = Date.now();
    check('Live Charts’ own window: a new GIF there plays at first', g2 && !g2.classList.contains('stgif-ready'), g2 && g2.className);
    for (k = 0; k < 80 && !(g2 && g2.isConnected && g2.classList.contains('stgif-ready')); k++) { await W(250); if (!g2 || !g2.isConnected) g2 = gifIn(sd.getElementById('dcx-root'), 'gif2'); }
    var cv2 = g2 && g2.querySelector('canvas');
    check('...and holds still after its ten seconds there too (its still frame painted)', g2 && g2.classList.contains('stgif-ready') && cv2 && cv2.width > 0 && satW.getComputedStyle(cv2).display !== 'none' && Date.now() - t2 >= 7000, g2 && [g2.className, cv2 && cv2.width, Math.round((Date.now() - t2) / 1000) + ' s']);
    var g1b = gifIn(sd.getElementById('dcx-root'), 'gif1');
    check('...the one held in the app window stays held there', g1b && g1b.classList.contains('stgif-ready'), g1b && g1b.className);
    window.__pcShot = 'gif';
    check('no script errors', !errs.length, errs.slice(0, 4));
  } catch (e) { results.push({ name: 'the test ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(results);
})()
