// End-to-end test: the Charts chat in Live Charts' own window (Nestor, 27 Oct 2026: "this is on an external window, the chat seems
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
      channel_messages: Array.apply(null, Array(40)).map(function (x, i) { return { id: 'f' + i, channel_id: 'ch-chat', sender_id: i % 3 ? TROY : ADMIN, sender_name: i % 3 ? 'Troy' : 'Nestor', body: ['Asia range marked', 'Spread is fine now', 'Patience, no setup yet', 'News at 13:30, careful', 'London open, EUR/USD sweeping the Asia low'][i % 5], created_at: new Date(now - (40 - i) * 60000).toISOString() }; }),
      channel_reactions: [{ channel_id: 'ch-chat', message_id: 'f38', user_id: ADMIN, emoji: '👍' }],
      roles: [{ id: 'r-admin', name: 'Admin', color: '#ffffff', position: 5, is_mod: true }, { id: 'r-pro', name: 'Journal Pro', color: '#5ca413', position: 0 }],
      member_roles: [{ user_id: ADMIN, role_id: 'r-admin' }, { user_id: TROY, role_id: 'r-pro' }], channel_reads: []
    };
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
    var L0 = look(root());
    check('the chat in the app window: styled, the emoji small, no call button, at its newest message', L0.css && L0.emoji > 0 && L0.emoji <= 24 && L0.call === 'none' && L0.headFlex === 'flex' && atEnd(root()), L0);
    // Live Charts in a window of its own
    var wo = window.open, satW = null;
    window.open = function (u, n, f) { satW = wo.call(window, u, n, f); return satW; };
    P._lcPop(); window.open = wo;
    for (k = 0; k < 140 && !(P._stage().on && satW && P._panes()[0].el.ownerDocument === satW.document && P._panes()[0].n > 30); k++) await W(150);
    for (k = 0; k < 80 && satW && satW.innerWidth < 1024; k++) await W(150);
    window.__pcSat = satW;
    var sd = satW && satW.document;
    for (k = 0; k < 60 && !(sd && sd.getElementById('dcx-root') && sd.getElementById('dcx-root').querySelectorAll('.dcx-msg').length >= 20); k++) await W(250);
    await W(2500);
    var r1 = sd && sd.getElementById('dcx-root'), slot1 = sd && sd.querySelector('.plat-right .pl-chslot');
    check('Live Charts in its own window: the chat moves there, into its Chat panel', !!r1 && !!slot1 && slot1.contains(r1) && r1.classList.contains('dcx-plat') && !document.getElementById('dcx-root'), [!!r1, !!slot1]);
    var L1 = r1 ? look(r1) : {};
    check('...looking as it does in the app window: its sheet there, the header, the emoji small, no call button over the name, the message box, the text', L1.css && L1.head === L0.head && L1.headFlex === 'flex' && L1.title === L0.title && L1.emoji === L0.emoji && L1.call === 'none' && L1.comp === L0.comp && L1.send === L0.send && L1.text === L0.text && L1.bg === L0.bg, [L0, L1]);
    check('...at its newest message', atEnd(r1), r1 && [r1.querySelector('#dcx-msgs').scrollTop, r1.querySelector('#dcx-msgs').clientHeight, r1.querySelector('#dcx-msgs').scrollHeight]);
    var pr = slot1 && slot1.getBoundingClientRect(), cq = r1 && r1.querySelector('.dcx-composer').getBoundingClientRect(), sq = r1 && r1.querySelector('#dcx-send').getBoundingClientRect();
    check('...its message box and Send whole inside the panel', cq && sq && sq.right <= cq.right && cq.right <= pr.right + 1 && cq.bottom <= pr.bottom + 1 && sq.width >= 30, cq && [cq.right, cq.bottom, sq.right, pr.right, pr.bottom]);
    arrive({ id: 'pnew1', channel_id: 'ch-chat', sender_id: TROY, sender_name: 'Troy', body: 'Price tapped the 50% - in?', created_at: new Date().toISOString() });
    await W(1500);
    var lastTx = function (r) { var t = r && r.querySelectorAll('.dcx-msg .dcx-text'); return t && t.length ? t[t.length - 1].textContent : ''; };
    check('...a new message arrives there, the chat still at its end', /tapped the 50%/.test(lastTx(r1)) && atEnd(r1), lastTx(r1));
    var rows = r1.querySelectorAll('.dcx-msg'), row = rows[rows.length - 1], more = row && row.querySelector('.dcx-more');
    var st1 = sd.createElement('style'); st1.textContent = '.dcx-msg.__pcfocus .dcx-actions{display:flex !important;}'; sd.head.appendChild(st1);   // its hover toolbar, as under the mouse
    if (row) { row.classList.add('__pcfocus'); more = row.querySelector('.dcx-more'); if (more) { more.getBoundingClientRect(); more.click(); } }   // in one go: a redraw between would drop the class
    await W(500);
    var mn = sd.getElementById('dcx-menu'), mr = mn && mn.getBoundingClientRect();
    check('...its message menu opens there, in that window', mn && mn.classList.contains('open') && mr.width > 100 && mr.left >= 0 && mr.right <= satW.innerWidth + 1, mn && [mn.className, mr && mr.left, mr && mr.right, more && JSON.stringify(more.getBoundingClientRect()), JSON.stringify(r1.getBoundingClientRect()), mn.style.cssText, mn.parentNode && mn.parentNode.className, window.__stZ && window.__stZ(), satW.getComputedStyle(mn).position]);
    if (mn) mn.classList.remove('open');
    window.__pcShot = 'pop';
    // the app window on another tab: the chat stays out there
    document.querySelector('.tab[data-page="review"]').click(); await W(3500);
    check('the app window on another tab: the chat stays in Live Charts\' window', !!sd.getElementById('dcx-root') && slot1.contains(sd.getElementById('dcx-root')), !!sd.getElementById('dcx-root'));
    // the Community tab takes it; back to another tab, Live Charts' window has it again
    document.querySelector('.tab[data-page="community"]').click(); await W(3500);
    var pc = document.getElementById('page-community');
    check('the Community tab opened in the app window: the chat goes there, whole', !!document.getElementById('dcx-root') && pc.contains(document.getElementById('dcx-root')) && !document.getElementById('dcx-root').classList.contains('dcx-embed'), !!document.getElementById('dcx-root'));
    document.querySelector('.tab[data-page="review"]').click(); await W(3500);
    var r2 = sd.getElementById('dcx-root');
    check('...another tab: back in Live Charts\' window, styled, at its newest message', !!r2 && slot1.contains(r2) && look(r2).emoji === L0.emoji && atEnd(r2), !!r2);
    // the pop-out's light theme
    satW.document.querySelector('.plat-top [data-pltheme]').click(); await W(1200);
    check('its light theme there: the chat light too', /255, 255, 255/.test(satW.getComputedStyle(r2.querySelector('.dcx-main')).backgroundColor), satW.getComputedStyle(r2.querySelector('.dcx-main')).backgroundColor);
    satW.document.querySelector('.plat-top [data-pltheme]').click(); await W(800);
    check('no script errors', !errs.length, errs.slice(0, 4));
  } catch (e) { results.push({ name: 'the test ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(results);
})()
