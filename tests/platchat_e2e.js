// End-to-end test: the Charts platform's rail panels - Watchlist, Trade Manager, Chat, Today, Object tree, one at a time in the whole
// column (Nestor, 26 Oct 2026, TradingView's) - and the chat in it (25 Oct 2026: "can we add the community icon here so i can chat whilst
// i look at the chart? literally move the chat and all its functions from session live tab to here"). The Community's own chat moves into
// its panel (a sheet on a phone); Today holds the session clock, red / medium news, bank holidays and
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
                         { id: 'm2', channel_id: 'ch-chat', sender_id: ADMIN, sender_name: 'Nestor', body: 'Waiting for the 50% before I take it', created_at: new Date(now - 300000).toISOString() }]
        .concat(Array.apply(null, Array(24)).map(function (x, i) { return { id: 'f' + i, channel_id: 'ch-chat', sender_id: i % 2 ? TROY : ADMIN, sender_name: i % 2 ? 'Troy' : 'Nestor', body: ['Asia range marked', 'Spread is fine now', 'Patience, no setup yet', 'News at 13:30, careful'][i % 4], created_at: new Date(now - 3600000 - (24 - i) * 60000).toISOString() }; })),
      channel_reactions: [], roles: [{ id: 'r-admin', name: 'Admin', color: '#ffffff', position: 5, is_mod: true }, { id: 'r-pro', name: 'Journal Pro', color: '#5ca413', position: 0 }],
      member_roles: [{ user_id: ADMIN, role_id: 'r-admin' }, { user_id: TROY, role_id: 'r-pro' }]
    };
    DB.channel_messages.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });   // newest first, as the database's order() hands them
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
      var rb = function (k) { return $('.plat-rail [data-plr="' + k + '"]'); }, col = function () { return $('.plat-right').getBoundingClientRect(); };
      var shown = function (s) { var e = $(s); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 50; };
      var fills = function (s) { var r = $(s).getBoundingClientRect(), c = col(); return Math.abs(r.top - c.top) < 2 && Math.abs(r.bottom - c.bottom) < 2 && Math.abs(r.left - c.left) < 2 && Math.abs(r.right - c.right) < 2; };
      var only = function (s) { return ['.pl-wl', '.pl-tmc', '.pl-ch', '.pl-td', '.pl-ot'].filter(function (x) { return shown('.plat-right > ' + x); }).join(',') === s; };
      var order = Array.prototype.map.call(document.querySelectorAll('.plat-rail [data-plr]'), function (b) { return b.getAttribute('data-plr'); }).join(',');
      check('the rail: Watchlist, Trade Manager, Chat, Today, Object tree, in that order', order === 'wl,tm,ch,td,ot' && rb('ch').title === 'Chat' && rb('ot').title === 'Object tree', [order, rb('ot') && rb('ot').title]);
      var tbn = document.getElementById('stpr-treebtn');
      check('the Object tree has left the left toolbar', !tbn || !tbn.getClientRects().length, tbn && tbn.parentNode && tbn.parentNode.className);
      check('it starts on the Trade Manager, alone in the whole column', rb('tm').classList.contains('on') && only('.pl-tmc') && fills('.plat-right > .pl-tmc'),
        [order, Array.prototype.map.call(document.querySelectorAll('.plat-rail .on'), function (b) { return b.getAttribute('data-plr'); })]);
      var cw0 = $('#stpr-cw').getBoundingClientRect().width;
      // the Watchlist: the list, and the chart's symbol under it
      rb('wl').click(); await W(500);
      check('the Watchlist: its own panel, the whole column; the Trade Manager goes', rb('wl').classList.contains('on') && !rb('tm').classList.contains('on') && only('.pl-wl') && fills('.plat-right > .pl-wl'));
      var hs = Array.prototype.map.call(document.querySelectorAll('.pl-wlh span'), function (x) { return x.textContent; }).join('|');
      check('...its columns Symbol / Last / Chg / Chg%, a + and a menu above them', hs === 'Symbol|Last|Chg|Chg%' && !!$('.pl-wl [data-plwladd]') && !!$('.pl-wl [data-plwlmenu]') && $('.pl-wl [data-plwladd]').title === 'Add a symbol', hs);
      for (k = 0; k < 40 && !/\d\.\d{5}/.test((($('.pl-wlr.on') || {}).textContent || '') + (($('.pl-wld .pl-wdp') || {}).textContent || '')); k++) await W(300);
      var r0 = $('.pl-wlr.on'), cells = r0 ? Array.prototype.map.call(r0.children, function (x) { return x.textContent; }) : [];
      check('...the chart\'s symbol lit, with its price, change and change %', r0 && /EURUSD/.test(cells[0]) && /^\d\.\d{5}$/.test(cells[1]) && /^[+−]\d\.\d{5}$/.test(cells[2]) && /^[+−]\d+\.\d{2}%$/.test(cells[3]), cells);
      var wd = $('.pl-wld'), wdt = wd ? wd.textContent : '', wdr = wd && wd.getBoundingClientRect(), wbr = $('.pl-wlb').getBoundingClientRect();
      check('the details under the list: name, description, kind, the account', wd && wdr.top >= wbr.bottom - 1 && /EURUSD/.test(($('.pl-wdh b') || {}).textContent || '') && /Euro \/ U\.S\. Dollar/.test(wdt) && /Forex/.test(wdt) && /FTMO 70K|MT5/.test(($('.pl-wdx') || {}).textContent || ''), wdt.slice(0, 160));
      var big = $('.pl-wdp b'), fs = big ? parseFloat(getComputedStyle(big).fontSize) : 0;
      check('...the last price big, its change and change % beside it', big && /^\d\.\d{5}$/.test(big.textContent) && fs >= 24 && $('.pl-wdp').querySelectorAll('span').length === 2, [big && big.textContent, fs]);
      check('...market open (prices moving on a weekday)', /Market open/.test(wdt) && $('.pl-wdm').classList.contains('on'), ($('.pl-wdm') || {}).textContent);
      var qb = $('.pl-wdq .s b'), qa = $('.pl-wdq .b b');
      check('...bid and ask', qb && qa && +qa.textContent > +qb.textContent, [qb && qb.textContent, qa && qa.textContent]);
      var mk = $('.pl-wdbar i'), lh = Array.prototype.map.call(document.querySelectorAll('.pl-wdlh span'), function (x) { return +x.textContent; });
      check('...the day\'s range, low to high, the price marked on it', mk && lh.length === 2 && lh[1] > lh[0] && +big.textContent >= lh[0] - 0.0002 && +big.textContent <= lh[1] + 0.0002 && /Day.s range/.test(wdt), [lh, big && big.textContent, mk && mk.style.left]);
      $('.pl-wl [data-plwladd]').click(); await W(300);
      var mn = document.getElementById('stpr-menu'), wi = document.getElementById('stpr-wlin');
      check('its + opens the list\'s editor with the add box ready', mn.classList.contains('show') && wi && !wi.hidden && document.activeElement === document.getElementById('stpr-wlq'), [mn.classList.contains('show'), wi && wi.hidden]);
      document.querySelector('.plat-foot').click(); await W(200);
      check('...a click elsewhere closes it', !mn.classList.contains('show'));
      var hw = $('.plat-right > .pl-swd'), hwr = hw.getBoundingClientRect(), wx = hwr.left + 3, wy = hwr.top + hwr.height / 2, ww0 = col().width;
      hw.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: wx, clientY: wy, pointerId: 1 })); document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: wx - 60, clientY: wy, pointerId: 1 })); document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: wx - 60, clientY: wy, pointerId: 1 })); await W(400);
      var ww1 = col().width, sv0 = {}; try { sv0 = JSON.parse(localStorage.getItem('st_plat') || '{}'); } catch (e) {}
      check('the Watchlist widens by its left edge too: the width every panel takes', ww1 > ww0 + 50 && Math.abs((+sv0.rw || 0) - ww1) < 6, [ww0, ww1, sv0.rw]);
      // Chat
      rb('ch').click(); await W(400);
      for (k = 0; k < 40 && !(root() && root().classList.contains('dcx-plat')); k++) await W(250);
      var cw1 = $('#stpr-cw').getBoundingClientRect(), c1 = col();
      check('Chat: its own panel, the whole column, at the Watchlist\'s width (one width for the column, 27 Oct 2026)', rb('ch').classList.contains('on') && !rb('wl').classList.contains('on') && only('.pl-ch') && fills('.plat-right > .pl-ch') && Math.abs(c1.width - Math.max(330, ww1)) < 3 && c1.left >= cw1.right - 1, [c1.width, ww1, only('.pl-ch')]);
      var side = $('.plat-right > .pl-ch');
      check('the Community chat itself is in it (one chat, moved in), with its members', !!root() && side.contains(root()) && root().classList.contains('dcx-embed') && root().classList.contains('dcx-plat') && !!document.getElementById('dcx-mtoggle'), [!!root(), root() && root().className]);
      var hid = function (id) { var e = document.getElementById(id); return !e || getComputedStyle(e).display === 'none'; };
      check('...#session-chat only: no channel list, no burger, no DMs (Community keeps those)', hid('dcx-burger') && hid('dcx-dm-btn') && (!$('#dcx-root .dcx-side') || getComputedStyle($('#dcx-root .dcx-side')).display === 'none'), [hid('dcx-burger'), hid('dcx-dm-btn')]);
      var tabp = ($('.tab[data-page="community"] svg path') || {}).getAttribute, cpath = tabp ? $('.tab[data-page="community"] svg path').getAttribute('d') : '';
      check('the Chat icon is the Community tab\'s own bubble', cpath && ($('.plat-rail [data-plr="ch"] svg path') || { getAttribute: function () { return ''; } }).getAttribute('d') === cpath, cpath);
      var rr = root() ? root().getBoundingClientRect() : null, slr = side.getBoundingClientRect();
      check('...filling the panel to its foot', rr && rr.height > 400 && Math.abs(rr.bottom - slr.bottom) < 3 && Math.abs(rr.top - slr.top) < 3, rr && [rr.top, rr.bottom, slr.top, slr.bottom]);
      var comp = $('#dcx-root .dcx-composer'), cq = comp && comp.getBoundingClientRect();
      check('...its message box at the bottom, inside the column', cq && cq.width > 200 && cq.bottom <= slr.bottom + 1 && cq.left >= slr.left - 1 && cq.right <= slr.right + 1, cq && [cq.left, cq.right, cq.bottom]);
      check('the channel it opens on: #session-chat', /session-chat/i.test(($('#dcx-ch-title') || {}).textContent || '') || (window.STCommunity.curSlug && window.STCommunity.curSlug() === 'session-chat'), [($('#dcx-ch-title') || {}).textContent, window.STCommunity.curSlug && window.STCommunity.curSlug()]);
      var msgs = $('#dcx-root .dcx-msgs'), atEnd = function () { return msgs && msgs.scrollHeight > msgs.clientHeight + 50 && msgs.scrollTop + msgs.clientHeight >= msgs.scrollHeight - 6; };
      for (k = 0; k < 15 && !atEnd(); k++) await W(200);
      check('...opened at the latest message', atEnd(), msgs && [msgs.scrollTop, msgs.clientHeight, msgs.scrollHeight]);
      check('dark: the platform\'s blue-black, not black', /19, 23, 34/.test(getComputedStyle($('#dcx-root .dcx-main')).backgroundColor) && /30, 34, 45/.test(getComputedStyle(comp).backgroundColor), [getComputedStyle($('#dcx-root .dcx-main')).backgroundColor, getComputedStyle(comp).backgroundColor]);
      // its width, by its left edge, kept for this device
      var drag = function (dx) { var hd = $('.plat-right > .pl-swd'), hr = hd.getBoundingClientRect(), x0 = hr.left + 3, y0 = hr.top + hr.height / 2;
        hd.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x0, clientY: y0, pointerId: 1 }));
        document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x0 + dx, clientY: y0, pointerId: 1 }));
        document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x0 + dx, clientY: y0, pointerId: 1 })); };
      var sw0 = col().width; drag(-100); await W(500);
      var sw1 = col().width, saved = {}; try { saved = JSON.parse(localStorage.getItem('st_plat') || '{}'); } catch (e) {}
      check('dragging its left edge widens it (kept on this device)', sw1 > sw0 + 80 && Math.abs((+saved.rw || 0) - sw1) < 6 && saved.pn === 'ch', [sw0, sw1, saved.rw, saved.pn]);
      drag(400); await W(500);
      var sw2 = col().width, snd = document.getElementById('dcx-send'), sdr2 = snd && snd.getBoundingClientRect(), cq3 = comp.getBoundingClientRect(), pr = side.getBoundingClientRect();
      check('it never squashes: no narrower than 330 px, Send whole inside the box, the box inside the panel', sw2 >= 329 && sw2 < 340 && sdr2 && sdr2.width >= 30 && sdr2.right <= cq3.right - 2 && cq3.right <= pr.right + 1 && msgs.scrollWidth <= msgs.clientWidth + 1,
        [sw2, sdr2 && [sdr2.left, sdr2.right, sdr2.width], cq3.right, pr.right, msgs.scrollWidth, msgs.clientWidth]);
      drag(-50); await W(400); var chw = col().width;
      msgs.scrollTop = 0;   // left reading old messages
      // Today
      rb('td').click(); await W(600);
      check('Today: its own panel, at the chat\'s width (one width for the column)', only('.pl-td') && fills('.plat-right > .pl-td') && Math.abs(col().width - chw) < 3, [col().width, chw]);
      var tdt = $('.plat-right .pl-tdb').textContent;
      check('Today: red news (or none this week) and the risk budget the Session Live board had', /Red news/i.test(tdt) && (/None this week|·/.test(tdt)), tdt.slice(0, 200));
      check('Today: no bias (that is in Check my plan now)', !/morning's bias/i.test(tdt));
      check('Today names the session and how long it has (or until the next)', /\d+ ?(min|h)/.test($('.plat-right .pl-tds').textContent), $('.plat-right .pl-tds').textContent);
      // closed: a new message counts on its icon
      var ml = document.getElementById('dcx-msgs'), fake = document.createElement('div'); fake.className = 'dcx-msg'; fake.setAttribute('data-mid', 'tst-' + Date.now()); fake.innerHTML = '<div class="dcx-text">hi</div>';
      if (ml) ml.appendChild(fake); await W(600);
      var bd = $('.plat-rail .pl-rbch .pl-rbn');
      check('a new message while Chat is not open shows on its icon', bd && !bd.hidden && bd.textContent === '1', bd && [bd.hidden, bd.textContent]);
      // the Object tree: the drawings on this symbol
      var DW = P._dr(), B = P._panes()[0].bars, px = B[B.length - 1].close;
      DW.list = [{ type: 'hline', price: +(px + 0.0010).toFixed(5) }, { type: 'rect', a: { t: B[B.length - 20].time, price: px + 0.0005 }, b: { t: B[B.length - 10].time, price: px - 0.0005 } }, { type: 'trend', a: { t: B[B.length - 30].time, price: px }, b: { t: B[B.length - 5].time, price: px + 0.0008 } }];
      DW.sel = null; P._render(); await W(100);
      rb('ot').click(); await W(500);
      var otr = document.querySelectorAll('.plat-right .pl-otb .stpr-otr'), otn = Array.prototype.map.call(otr, function (r) { return (r.querySelector('.stpr-otn span') || {}).textContent; });
      check('the Object tree: its own panel, every drawing on the symbol, newest first', only('.pl-ot') && fills('.plat-right > .pl-ot') && otr.length === 3 && otn[2] === 'Horizontal line' && /EUR/.test($('.plat-right .pl-ots').textContent), [otn, $('.plat-right .pl-ots').textContent]);
      otr[2].querySelector('[data-othide]').click(); await W(300);
      check('...its eye hides that drawing, the row dimmed', DW.list[0].hidden === true && document.querySelectorAll('.plat-right .pl-otb .stpr-otr')[2].classList.contains('off'));
      document.querySelectorAll('.plat-right .pl-otb .stpr-otr')[2].querySelector('[data-othide]').click(); await W(200);
      document.querySelectorAll('.plat-right .pl-otb .stpr-otr')[1].querySelector('[data-otsel]').click(); await W(300);
      check('...a row selects its drawing, lit in the list', DW.sel === 1 && document.querySelectorAll('.plat-right .pl-otb .stpr-otr')[1].classList.contains('on'));
      // the open icon closes the column: the chart takes the room
      rb('ot').click(); await W(600);
      var cw2 = $('#stpr-cw').getBoundingClientRect().width; saved = {}; try { saved = JSON.parse(localStorage.getItem('st_plat') || '{}'); } catch (e) {}
      check('the open panel\'s icon closes the column; the chart takes the room', win.classList.contains('pl-nor') && !$('.plat-rail .pl-rb.on') && getComputedStyle($('.plat-right')).display === 'none' && cw2 > cw0 + 250 && saved.pn === '', [cw0, cw2, saved.pn]);
      rb('ch').click(); await W(900);
      check('...opening Chat clears its count', bd.hidden);
      for (k = 0; k < 15 && !atEnd(); k++) await W(200);
      check('...and it opens at the latest message again', atEnd(), [msgs.scrollTop, msgs.clientHeight, msgs.scrollHeight]);
      if (fake.parentNode) fake.remove();
      DW.list = []; DW.sel = null; P._render();
      // Community: the chat goes home, and comes back
      document.querySelector('.tab[data-page="community"]').click(); await W(2200);
      var pc = document.getElementById('page-community');
      check('opening Community takes the chat back there', root() && pc.contains(root()) && !root().classList.contains('dcx-plat') && !root().classList.contains('dcx-embed'), root() && root().parentNode && root().parentNode.id);
      document.querySelector('.tab[data-page="livecharts"]').click(); await W(2600);
      check('...and Charts has it again, the panel that was open', root() && $('.plat-right > .pl-ch').contains(root()) && root().classList.contains('dcx-plat') && rb('ch').classList.contains('on'), root() && root().className);
      // the light theme: the panel follows it
      $('.plat-top [data-pltheme]').click(); await W(900);
      var bgc = getComputedStyle(root()).backgroundColor, inp = document.getElementById('dcx-input'), ic = inp && getComputedStyle(inp).color;
      check('the light theme: the chat goes light with the platform', /255, 255, 255/.test(bgc) && ic && /19, 23, 34/.test(ic), [bgc, ic]);
      var acts = $('#dcx-root .dcx-actions'), comp2 = $('#dcx-root .dcx-composer');
      check('...its hover toolbar light too', acts && /255, 255, 255/.test(getComputedStyle(acts).backgroundColor) && /240, 243, 250/.test(getComputedStyle(comp2).backgroundColor), acts && [getComputedStyle(acts).backgroundColor, getComputedStyle(comp2).backgroundColor]);
      // for the screenshots: drawings back on the chart
      DW.list = [{ type: 'hline', price: +(px + 0.0010).toFixed(5) }, { type: 'rect', a: { t: B[B.length - 20].time, price: px + 0.0005 }, b: { t: B[B.length - 10].time, price: px - 0.0005 } }, { type: 'trend', a: { t: B[B.length - 30].time, price: px }, b: { t: B[B.length - 5].time, price: px + 0.0008 } }];
      P._render();
      window.__pcShot = 'light';
    } else {
      var chb = $('.ph-icons .ph-chb');
      check('a phone: Chat in the bottom toolbar, on screen', !!chb && chb.getBoundingClientRect().width > 20 && chb.getBoundingClientRect().right <= innerWidth, chb && [Math.round(chb.getBoundingClientRect().right), Array.prototype.map.call(document.querySelectorAll('.ph-bar > *, .ph-icons > *'), function (x) { var r = x.getBoundingClientRect(); return (x.className || x.id || x.tagName).toString().slice(0, 14) + ':' + Math.round(r.left) + '-' + Math.round(r.right); }), getComputedStyle(document.querySelector('.ph-bar')).paddingLeft]);
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
