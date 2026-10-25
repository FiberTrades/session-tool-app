// End-to-end test: Chat and Today in the Charts platform (Nestor, 25 Oct 2026: "can we add the community icon here so i can chat whilst
// i look at the chart? literally move the chat and all its functions from session live tab to here"). The Community's own chat moves into
// a column between the chart and the Watchlist (a sheet on a phone); Today holds the session clock, red / medium news, bank holidays and
// the risk budget. Run through python tests/platchat_run.py (a stand-in EA through a local relay, as platform_run.py).
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB && window.STCommunity); i0++) await W(100);
    await W(800);
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    var P = window.__stPractice, LC = window.__stLC, T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000, phoneNow = innerWidth < 760;
    P._lvClock(T0 * 1000 - Date.now());
    window.isSessionLive = function () { return true; };
    window.__stPlatOff = false; window.__stLcForce = true; await W(1200);
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
    // signed in as the admin, the Community on an in-memory database (as community_roles_e2e.js); the chart's own calls go to the real client
    var ADMIN = 'ccaf6a5e-69ed-443c-8d92-bc7fdd464f49', TROY = '22222222-2222-4222-8222-222222222222', now = Date.now();
    window.currentUser = { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' } };
    try { Object.defineProperty(window.STCloud, 'userId', { value: ADMIN, configurable: true, writable: true }); } catch (e) {}
    var DB = {
      categories: [{ id: 'cat1', name: 'Trading', position: 0 }],
      channels: [{ id: 'ch-chat', slug: 'session-chat', name: '💬 session-chat', topic: 'Live during the session', access_policy: 'mentorship,bundle,trial', post_policy: 'mentorship,bundle,trial', required_role: null, category_id: 'cat1', position: 1 },
                 { id: 'ch-gen', slug: 'general', name: '👋 general', topic: '', access_policy: 'mentorship,bundle,trial', post_policy: 'mentorship,bundle,trial', required_role: null, category_id: 'cat1', position: 2 }],
      channel_messages: [{ id: 'm1', channel_id: 'ch-chat', sender_id: TROY, sender_name: 'Troy', body: 'London open, EUR/USD sweeping the Asia low', created_at: new Date(now - 600000).toISOString() },
                         { id: 'm2', channel_id: 'ch-chat', sender_id: ADMIN, sender_name: 'Nestor', body: 'Waiting for the 50% before I take it', created_at: new Date(now - 300000).toISOString() }],
      channel_reactions: [], roles: [{ id: 'r-admin', name: 'Admin', color: '#ffffff', position: 5, is_mod: true }, { id: 'r-pro', name: 'Journal Pro', color: '#5ca413', position: 0 }],
      member_roles: [{ user_id: ADMIN, role_id: 'r-admin' }, { user_id: TROY, role_id: 'r-pro' }]
    };
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
    SB.rpc = function (fn, a) { if (fn === 'st_admin_ids') return Promise.resolve({ data: [{ id: ADMIN }], error: null }); if (fn === 'st_members') return Promise.resolve({ data: MEMBERS, error: null }); return rpc0(fn, a); };
    var fakeChan = function () { var ch = { on: function () { return ch; }, subscribe: function (cb) { try { cb && cb('SUBSCRIBED'); } catch (e) {} return ch; }, unsubscribe: function () {}, send: function () { return Promise.resolve(); }, track: function () { return Promise.resolve(); }, presenceState: function () { return {}; } }; return ch; };
    var chan0 = SB.channel.bind(SB); SB.channel = function (name) { return /^realtime:stl-|^stl-/.test(String(name)) ? chan0(name) : fakeChan(); };
    var SESSION = { access_token: 'test', token_type: 'bearer', user: { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' }, app_metadata: {} } };
    SB.auth.getSession = function () { return Promise.resolve({ data: { session: SESSION }, error: null }); };
    SB.auth.getUser = function () { return Promise.resolve({ data: { user: SESSION.user }, error: null }); };
    try { await SB.auth._notifyAllSubscribers('SIGNED_IN', SESSION); } catch (e) {}
    await W(2500);
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';   // again: signing in may have read the account's own
    var css0 = document.createElement('style'); css0.textContent = '#st-nudge, .st-nudge, .st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css0);
    try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15, 1, 60, 240]; C.syms = []; C.mini = false; C.resume = null; delete C.lookDk; C.look = {}; } catch (e) {}
    try { localStorage.removeItem('st_plat'); localStorage.removeItem('st_platchat_ch'); } catch (e) {}
    var acc0 = (data.accounts || [])[0] || {};
    data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-plat', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
    data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-plat' });
    document.querySelector('.tab[data-page="livecharts"]').click();
    for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
    await W(1500);
    var win = document.getElementById('stpr-win'), $ = function (s) { return document.querySelector(s); };
    var root = function () { return document.getElementById('dcx-root'); };

    if (!phoneNow) {
      var rTd = $('.plat-rail [data-plr="td"]'), rCh = $('.plat-rail [data-plr="ch"]');
      check('the rail: Today and Chat under Watchlist and Trade Manager', !!rTd && !!rCh && rTd.getBoundingClientRect().top > $('.plat-rail [data-plr="tm"]').getBoundingClientRect().top && rCh.title === 'Chat', [!!rTd, !!rCh, rCh && rCh.title]);
      check('both start closed: no session column', !win.classList.contains('pl-side') && getComputedStyle($('.plat-side')).display === 'none');
      var cw0 = $('#stpr-cw').getBoundingClientRect().width;
      rCh.click(); await W(400);
      for (k = 0; k < 40 && !(root() && root().classList.contains('dcx-plat')); k++) await W(250);
      var side = $('.plat-side'), sr = side.getBoundingClientRect(), wl = $('.plat-right').getBoundingClientRect(), cw1 = $('#stpr-cw').getBoundingClientRect();
      check('Chat opens its column between the chart and the Watchlist', win.classList.contains('pl-side') && sr.width > 300 && sr.left >= cw1.right - 1 && sr.right <= wl.left + 1, [sr.left, sr.right, cw1.right, wl.left]);
      check('...the chart gives it room, the Watchlist and Trade Manager stay', cw1.width < cw0 - 250 && $('.plat-right').offsetWidth > 250 && rCh.classList.contains('on'), [cw0, cw1.width]);
      check('the Community chat itself is in it (one chat, moved in: channels from the burger, DMs, members)', !!root() && side.contains(root()) && root().classList.contains('dcx-embed') && root().classList.contains('dcx-plat')
        && getComputedStyle(document.getElementById('dcx-burger')).display !== 'none' && getComputedStyle(document.getElementById('dcx-dm-btn')).display !== 'none', [!!root(), root() && root().className]);
      var rr = root() ? root().getBoundingClientRect() : null, slr = $('.plat-side .pl-ch').getBoundingClientRect();
      check('...filling the panel to its foot', rr && rr.height > 400 && Math.abs(rr.bottom - slr.bottom) < 3 && Math.abs(rr.top - slr.top) < 3, rr && [rr.top, rr.bottom, slr.top, slr.bottom]);
      var comp = $('#dcx-root .dcx-composer'), cq = comp && comp.getBoundingClientRect();
      check('...its message box at the bottom, inside the column', cq && cq.width > 200 && cq.bottom <= slr.bottom + 1 && cq.left >= slr.left - 1 && cq.right <= slr.right + 1, cq && [cq.left, cq.right, cq.bottom]);
      check('the channel it opens on: #session-chat', /session-chat/i.test(($('#dcx-ch-title') || {}).textContent || '') || (window.STCommunity.curSlug && window.STCommunity.curSlug() === 'session-chat'), [($('#dcx-ch-title') || {}).textContent, window.STCommunity.curSlug && window.STCommunity.curSlug()]);
      // the burger: the channels as a drawer over the chat
      document.getElementById('dcx-burger').click(); await W(400);
      var sd = $('#dcx-root .dcx-side'), sdr = sd && sd.getBoundingClientRect();
      check('the burger slides the channel list over the chat, inside the column', root().classList.contains('side-open') && sdr && sdr.left >= slr.left - 1 && sdr.width > 150 && sdr.right <= slr.right + 1, sdr && [sdr.left, sdr.width, slr.left]);
      var msgs = $('#dcx-root .dcx-msgs'); if (msgs) msgs.click(); await W(300);
      check('...a tap on the chat closes it', !root().classList.contains('side-open'));
      // Today
      rTd.click(); await W(600);
      var td = $('.plat-side .pl-td'), tdr = td.getBoundingClientRect(), chr = $('.plat-side .pl-ch').getBoundingClientRect();
      check('Today opens above the chat, the chat under it', getComputedStyle(td).display !== 'none' && tdr.bottom <= chr.top + 1 && tdr.height > 60 && chr.height > 250, [tdr.top, tdr.bottom, chr.top, chr.height]);
      var tdt = $('.plat-side .pl-tdb').textContent;
      check('Today: red news (or none this week) and the risk budget the Session Live board had', /Red news/i.test(tdt) && (/None this week|·/.test(tdt)), tdt.slice(0, 200));
      check('Today: no bias (that is in Check my plan now)', !/morning's bias/i.test(tdt));
      check('Today names the session and how long it has (or until the next)', /\d+ ?(min|h)/.test($('.plat-side .pl-tds').textContent), $('.plat-side .pl-tds').textContent);
      // the column's width, by its left edge, kept for this device
      var sw0 = $('.plat-side').getBoundingClientRect().width, hd = $('.plat-side .pl-swd'), hr = hd.getBoundingClientRect(), x0 = hr.left + 3, y0 = hr.top + hr.height / 2;
      hd.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x0, clientY: y0, pointerId: 1 }));
      document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x0 - 120, clientY: y0, pointerId: 1 }));
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x0 - 120, clientY: y0, pointerId: 1 }));
      await W(500);
      var sw1 = $('.plat-side').getBoundingClientRect().width, saved = {}; try { saved = JSON.parse(localStorage.getItem('st_plat') || '{}'); } catch (e) {}
      check('dragging its left edge widens it (kept on this device)', sw1 > sw0 + 100 && Math.abs((+saved.sw || 0) - sw1) < 6, [sw0, sw1, saved.sw]);
      window.__pcShot = 'desk';
      // closed: a new message counts on its icon
      rCh.click(); await W(700);
      check('Chat closed again: its panel goes, Today stays', win.classList.contains('pl-side') && win.classList.contains('pl-noch') && getComputedStyle($('.plat-side .pl-ch')).display === 'none');
      var ml = document.getElementById('dcx-msgs'), fake = document.createElement('div'); fake.className = 'dcx-msg'; fake.setAttribute('data-mid', 'tst-' + Date.now()); fake.innerHTML = '<div class="dcx-text">hi</div>';
      if (ml) ml.appendChild(fake); await W(600);
      var bd = $('.plat-rail .pl-rbch .pl-rbn');
      check('...a new message while it is closed shows on the Chat icon', bd && !bd.hidden && bd.textContent === '1', bd && [bd.hidden, bd.textContent]);
      rCh.click(); await W(900);
      check('...opening it clears the count', bd.hidden);
      if (fake.parentNode) fake.remove();
      // Community: the chat goes home, and comes back
      document.querySelector('.tab[data-page="community"]').click(); await W(2200);
      var pc = document.getElementById('page-community');
      check('opening Community takes the chat back there', root() && pc.contains(root()) && !root().classList.contains('dcx-plat') && !root().classList.contains('dcx-embed'), root() && root().parentNode && root().parentNode.id);
      document.querySelector('.tab[data-page="livecharts"]').click(); await W(2600);
      check('...and Charts has it again', root() && $('.plat-side').contains(root()) && root().classList.contains('dcx-plat'), root() && root().className);
      // the light theme: the panel follows it
      $('.plat-top [data-pltheme]').click(); await W(900);
      var bgc = getComputedStyle(root()).backgroundColor, inp = document.getElementById('dcx-input'), ic = inp && getComputedStyle(inp).color;
      check('the light theme: the chat goes light with the platform', /255, 255, 255/.test(bgc) && ic && /19, 23, 34/.test(ic), [bgc, ic]);
      window.__pcShot = 'light';
    } else {
      var chb = $('.ph-icons .ph-chb');
      check('a phone: Chat in the bottom toolbar, on screen', !!chb && chb.getBoundingClientRect().width > 20 && chb.getBoundingClientRect().right <= innerWidth, chb && Math.round(chb.getBoundingClientRect().right));
      chb.click(); await W(400);
      for (k = 0; k < 40 && !(root() && root().classList.contains('dcx-plat')); k++) await W(250);
      var sh = $('.ph-chs'), shr = sh && sh.getBoundingClientRect();
      check('...tapping it slides the chat up as a sheet', win.classList.contains('ph-chaton') && shr && shr.top < innerHeight * 0.15 && shr.bottom <= innerHeight + 1 && root() && sh.contains(root()), shr && [shr.top, shr.bottom]);
      var cp2 = $('#dcx-root .dcx-composer'), cq2 = cp2 && cp2.getBoundingClientRect();
      check('...the message box on screen at its foot', cq2 && cq2.bottom <= innerHeight && cq2.width > 300, cq2 && [cq2.bottom, cq2.width]);
      window.__pcShot = 'phone';
    }
    check('no script errors', !errs.length, errs.slice(0, 4));
  } catch (e) { results.push({ name: 'the test ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(results);
})()
