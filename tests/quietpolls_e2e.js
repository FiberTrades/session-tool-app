(async function () {
  // Fewer background requests (12 Oct 2026). Every request is a line in the server's log, and the log volume was over
  // quota. The admin cards are fetched only while their Settings section is open; returning to the window re-checks a
  // paid member's plan once, not on every focus; the live-session check on coming back to the tab is throttled.
  // Signed in as the admin through the app's own auth listeners, on an in-memory database that counts what is asked.
  // Run: python tests/browser_test.py tests/quietpolls_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.STCommunity && document.readyState === 'complete'); i++) await W(100);
    await W(5000);
    var css = document.createElement('style');
    css.textContent = '#st-nudge, .st-nudge, .st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }';
    document.head.appendChild(css);
    var ADMIN = 'ccaf6a5e-69ed-443c-8d92-bc7fdd464f49';
    window.currentUser = { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' } };
    try { Object.defineProperty(window.STCloud, 'userId', { value: ADMIN, configurable: true, writable: true }); } catch (e) {}
    var DB = {
      profiles: [{ id: ADMIN, email: 'be.o2@hotmail.com', is_paid: true, plan: 'comp', status: 'active', created_at: '2026-06-19T16:23:44Z' }],
      channels: [{ id: 'ch-chat', slug: 'session-chat', name: 'session-chat', access_policy: 'mentorship,bundle,trial', post_policy: 'mentorship,bundle,trial', required_role: null, category_id: null, position: 1 }],
      roles: [], member_roles: [], channel_messages: [], channel_reactions: [], live_sessions: []
    };
    var reads = {}, rpcs = {};
    var reset = function () { reads = {}; rpcs = {}; };
    function run(st) {
      var t = st.table, f = st.filters, rows = DB[t] || [];
      var match = function (r) { return f.every(function (x) { return x[2] === 'in' ? x[1].indexOf(r[x[0]]) > -1 : String(r[x[0]]) === String(x[1]); }); };
      if (st.op !== 'select') return { data: null, error: null };
      reads[t] = (reads[t] || 0) + 1;
      var res = rows.filter(match);
      if (st.single) return { data: res[0] || null, error: null };
      return { data: res, error: null, count: res.length };
    }
    function Q(table) {
      var st = { table: table, filters: [], op: 'select' }, b = {};
      ['select', 'order', 'limit', 'range', 'gte', 'lte', 'lt', 'gt', 'is', 'ilike', 'like', 'or', 'not', 'neq', 'contains', 'filter', 'match', 'textSearch', 'abortSignal', 'returns', 'csv'].forEach(function (k) { b[k] = function () { return b; }; });
      b.eq = function (k, v) { st.filters.push([k, v]); return b; };
      b['in'] = function (k, v) { st.filters.push([k, v, 'in']); return b; };
      b.maybeSingle = b.single = function () { st.single = true; return b; };
      b.insert = function () { st.op = 'insert'; return b; }; b.update = function () { st.op = 'update'; return b; };
      b.upsert = function () { st.op = 'upsert'; return b; }; b['delete'] = function () { st.op = 'delete'; return b; };
      b.then = function (res, rej) { return Promise.resolve().then(function () { return run(st); }).then(res, rej); };
      b['catch'] = function (fn) { return b.then(null, fn); };
      return b;
    }
    var C = window.__stSB;
    C.from = function (t) { return Q(t); };
    C.rpc = function (fn) { rpcs[fn] = (rpcs[fn] || 0) + 1;
      var d = fn === 'st_admin_ids' ? [{ id: ADMIN }] : fn === 'st_members' ? [{ id: ADMIN, name: 'Nestor', plan: 'comp', paid: true, is_admin: true }]
            : fn === 'st_admin_access_list' ? [{ user_id: 'u1', email: 'a@example.test', name: 'Aurora', plan: 'comp', is_paid: true }] : fn === 'st_my_code' ? { code: 'NESTOR', signups: 0, paying: 0 } : null;
      var p = Promise.resolve({ data: d, error: null }); p.then = p.then.bind(p); return p; };
    var fakeChan = function () { var ch = { on: function () { return ch; }, subscribe: function (cb) { try { cb && cb('SUBSCRIBED'); } catch (e) {} return ch; }, unsubscribe: function () {}, send: function () { return Promise.resolve(); }, track: function () { return Promise.resolve(); }, presenceState: function () { return {}; } }; return ch; };
    C.channel = fakeChan; C.removeChannel = function () { return Promise.resolve(); };
    var SESSION = { access_token: 'test', token_type: 'bearer', user: { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' }, app_metadata: {} } };
    C.auth.getSession = function () { return Promise.resolve({ data: { session: SESSION }, error: null }); };
    C.auth.getUser = function () { return Promise.resolve({ data: { user: SESSION.user }, error: null }); };
    try { await C.auth._notifyAllSubscribers('SIGNED_IN', SESSION); } catch (e) {}
    await W(3500);
    var adminRpcs = function () { return (rpcs.st_admin_access_list || 0) + (rpcs.st_admin_takings || 0) + (rpcs.st_referral_totals || 0) + (rpcs.st_admin_payout_get || 0); };
    ok('signed in as a paid member: the plan was read', (reads.profiles || 0) >= 1, reads);

    // ---- 1) Settings closed: re-drawing the plan fetches no admin lists and no referral card ----
    reset();
    window.renderServices(); window.renderServices(); window.renderServices();
    await W(600);
    ok('with Settings closed the admin lists are not downloaded', adminRpcs() === 0, rpcs);
    ok('nor the referral card', (rpcs.st_my_code || 0) === 0, rpcs);

    // ---- 2) opening the section that shows them loads them, as before ----
    document.getElementById('settings-gear').click(); await W(900);
    reset();
    var biz = document.querySelector('.settings-nav-item[data-section="business"]'), svc = document.querySelector('.settings-nav-item[data-section="services"]');
    ok('the admin has a Business tab', !!biz && getComputedStyle(biz).display !== 'none', !!biz);
    if (biz) { biz.click(); await W(900); }
    ok('opening Business loads the admin lists', (rpcs.st_admin_access_list || 0) >= 1 && (rpcs.st_referral_totals || 0) >= 1, rpcs);
    var card = document.getElementById('svc-vip-admin');
    ok('and the admin card is shown and filled', !!card && card.style.display !== 'none' && card.textContent.trim().length > 20, card && card.textContent.trim().slice(0, 60));
    reset();
    if (svc) { svc.click(); await W(700); }
    ok('opening Subscriptions loads the referral card', (rpcs.st_my_code || 0) >= 1, rpcs);
    ok('and not the admin lists, which are on the other tab', adminRpcs() === 0, rpcs);
    document.getElementById('settings-modal-close').click(); await W(300);

    // ---- 3) coming back to the window: a paid member's plan is looked at once, not on every focus ----
    await W(300); reset();
    for (var k = 0; k < 6; k++) { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); await W(120); }
    await W(800);
    ok('six returns to the window read the plan at most once', (reads.profiles || 0) <= 1, reads);
    ok('and fetch no admin lists', adminRpcs() === 0 && (rpcs.st_my_code || 0) === 0, rpcs);
    if (document.visibilityState === 'visible') {
      ok('the live-session check on coming back is throttled to one', (reads.live_sessions || 0) <= 1, reads);
      ok('the open trades are re-read once, not twice per return', (reads.live_trades || 0) <= 1, reads);
    }
    // ---- 4) the same member "signing in" again (every return to a tab, and the hourly token refresh) re-reads nothing ----
    reset();
    try { await C.auth._notifyAllSubscribers('SIGNED_IN', SESSION); await C.auth._notifyAllSubscribers('TOKEN_REFRESHED', SESSION); await C.auth._notifyAllSubscribers('SIGNED_IN', SESSION); } catch (e) {}
    await W(1500);
    ok('repeated sign-in events for the same member read no plan, shares or backups', (reads.profiles || 0) === 0 && (reads.shares || 0) === 0 && (reads.journal_versions || 0) === 0 && adminRpcs() === 0, [reads, rpcs]);
    ok('and the member is still signed in', !!(window.currentUser && window.currentUser.id === ADMIN));

    // ---- 5) the close-watch downloads the trade inbox only while this window is waiting on a trade ----
    var keepS = JSON.stringify(data.settings || {}), hm = function (ms) { var d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    var nowMs = Date.now(), sameDay = new Date(nowMs - 40 * 60000).toDateString() === new Date(nowMs + 40 * 60000).toDateString();
    data.settings = data.settings || {}; data.settings.tradingDays = [0, 1, 2, 3, 4, 5, 6];
    data.settings.sessions = [{ name: 'Now', start: hm(nowMs - 30 * 60000), end: hm(nowMs + 30 * 60000) }];
    var keepEver = window.__stLiveEverOpen, keepHas = window.__stLive && window.__stLive.hasOpen;
    if (sameDay && typeof isSessionLive === 'function' && isSessionLive() && window.__stLive) {
      window.__stLiveEverOpen = {}; window.__stLive.hasOpen = function () { return false; };
      reset(); window.__stLiveCloseWatch(); await W(400);
      ok('session live, no trade open or awaited: the inbox is not downloaded', (reads.trades_inbox || 0) === 0, reads);
      window.__stLiveEverOpen = { '987654': true };
      reset(); window.__stLiveCloseWatch(); await W(400);
      ok('a trade this window showed open and has not seen close: it is', (reads.trades_inbox || 0) === 1, reads);
      window.__stLiveEverOpen = {}; window.__stLive.hasOpen = function () { return true; };
      reset(); window.__stLiveCloseWatch(); await W(400);
      ok('a trade open right now: it is', (reads.trades_inbox || 0) === 1, reads);
    }
    window.__stLiveEverOpen = keepEver; if (window.__stLive && keepHas) window.__stLive.hasOpen = keepHas;
    try { data.settings = JSON.parse(keepS); } catch (e) {}
    // the safety net is still there, at three minutes
    var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    ok('the live-session safety net runs every three minutes', /loadLive\(\); \}, 180000\);/.test(html) && !/loadLive\(\); \}, 30000\);/.test(html));
    ok('a price tick no longer downloads the inbox: only a row that says it closed does', /apply\(p\.new\); try\{ if\(p && p\.new && p\.new\.closed_at && window\.__stLiveCloseWatch\)/.test(html) && !/apply\(p\.new\); try\{ if\(window\.__stLiveCloseWatch\)/.test(html));
    ok('the import check skips a hidden tab', /if \(!document\.hidden\) maybePromptAutoSync\('poll'\)/.test(html) && /if \(!document\.hidden\) maybeCheckMt5Withdrawals\(\)/.test(html));
  } catch (e) { ok('ran without an error', false, String(e && e.stack || e)); }
  return out;
})()
