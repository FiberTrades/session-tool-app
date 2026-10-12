(async function () {
  // A re-post replaces the earlier post (12 Oct 2026). Nestor: "i unselected the LTF and resent the bias to community
  // and now is correct but the old bias stays in community and i have to delete it manually, shouldn't reposting it get
  // rid of the old bias and just show the new corrected bias?"
  // The app only says WHICH post this one corrects (p_replace); the server decides whether the earlier one can go
  // without changing the leaderboard (supabase/st_post_review.sql - tested against the database separately).
  // Part 1: the real community post call on an in-memory database. Part 2: what each Post button hands over.
  // Run: python tests/browser_test.py tests/repost_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.STCommunity && document.readyState === 'complete'); i++) await W(100);
    await W(5000);
    var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
    doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
    ok('every inline script parses', !bad.length, bad);
    var css = document.createElement('style');
    css.textContent = '#st-nudge, .st-nudge, .st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }';
    document.head.appendChild(css);
    if (document.getElementById('new-session-modal-bg').classList.contains('show')) { document.getElementById('new-session-keep').click(); await W(300); }

    var ADMIN = 'ccaf6a5e-69ed-443c-8d92-bc7fdd464f49';
    var uuid = function (n) { return '00000000-0000-4000-8000-' + ('000000000000' + n).slice(-12); };
    window.currentUser = { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' } };
    try { Object.defineProperty(window.STCloud, 'userId', { value: ADMIN, configurable: true, writable: true }); } catch (e) {}
    var now = Date.now(), OLD = uuid(1), KEPT = uuid(2);
    var CH = function (id, slug, pos) { return { id: id, slug: slug, name: '📌 ' + slug, access_policy: 'mentorship,bundle,trial', post_policy: '', required_role: null, category_id: null, position: pos }; };
    var DB = {
      channels: [CH('ch-bias', 'pre-session-bias', 1), CH('ch-rev', 'post-session-review', 2)],
      channel_messages: [{ id: OLD, channel_id: 'ch-bias', sender_id: ADMIN, sender_name: 'Nestor', body: '**EUR/USD London Bias**\nfirst version', created_at: new Date(now - 300000).toISOString() },
                         { id: KEPT, channel_id: 'ch-bias', sender_id: ADMIN, sender_name: 'Nestor', body: '**XAU/USD London Bias**\nthe record', created_at: new Date(now - 200000).toISOString() }],
      channel_reactions: [], roles: [], member_roles: []
    };
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
    // st_post_review as the server behaves: the new post always goes in; the earlier one goes only when the server allows
    var calls = [], serverRemoves = true, seq = 100;
    var C = window.__stSB;
    C.from = function (t) { return Q(t); };
    C.rpc = function (fn, args) {
      var d = null;
      if (fn === 'st_admin_ids') d = [{ id: ADMIN }];
      else if (fn === 'st_members') d = [{ id: ADMIN, name: 'Nestor', avatar: '', plan: 'comp', paid: true, is_admin: true }];
      else if (fn === 'st_post_review') {
        calls.push(JSON.parse(JSON.stringify(args)));
        var ch = DB.channels.filter(function (c) { return c.slug === args.p_slug; })[0];
        d = uuid(++seq);
        DB.channel_messages.push({ id: d, channel_id: ch.id, sender_id: ADMIN, sender_name: 'Nestor', body: args.p_body, body_es: args.p_body_es, created_at: new Date().toISOString() });
        if (args.p_replace && serverRemoves) DB.channel_messages = DB.channel_messages.filter(function (m) { return m.id !== args.p_replace; });
      }
      var p = Promise.resolve({ data: d, error: null }); p.then = p.then.bind(p); return p;
    };
    var fakeChan = function () { var ch = { on: function () { return ch; }, subscribe: function (cb) { try { cb && cb('SUBSCRIBED'); } catch (e) {} return ch; }, unsubscribe: function () {}, send: function () { return Promise.resolve(); }, track: function () { return Promise.resolve(); }, presenceState: function () { return {}; } }; return ch; };
    C.channel = fakeChan; C.removeChannel = function () { return Promise.resolve(); };
    var SESSION = { access_token: 'test', token_type: 'bearer', user: { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' }, app_metadata: {} } };
    C.auth.getSession = function () { return Promise.resolve({ data: { session: SESSION }, error: null }); };
    C.auth.getUser = function () { return Promise.resolve({ data: { user: SESSION.user }, error: null }); };
    try { await C.auth._notifyAllSubscribers('SIGNED_IN', SESSION); } catch (e) {}
    await W(2500);
    var tab = document.querySelector('.tab[data-page="community"]'); if (tab) tab.click(); await W(2500);
    var chanEl = function (id) { return document.querySelector('.dcx-chan[data-cid="' + id + '"]'); };
    for (var k = 0; k < 20 && !chanEl('ch-bias'); k++) await W(300);
    if (chanEl('ch-bias')) chanEl('ch-bias').click(); await W(1200);
    var row = function (id) { return document.querySelector('#dcx-msgs .dcx-msg[data-mid="' + id + '"]'); };
    ok('the bias channel is open with the earlier post in it', !!row(OLD) && !!row(KEPT), (document.getElementById('dcx-msgs') || {}).innerText);

    // ================= Part 1: the community's own post call =================
    var realPost = window.STCommunity.postToChannel;
    // a) a first post names nothing to replace
    var r1 = await realPost('post-session-review', 'review one', 'revisión uno'); await W(300);
    ok('a first post sends no p_replace at all (the old call shape still works)', calls.length === 1 && !('p_replace' in calls[0]) && calls[0].p_slug === 'post-session-review' && calls[0].p_body_es === 'revisión uno', calls[0]);
    // b) a correction names the earlier post; the server removes it; it comes off the open channel
    calls.length = 0;
    var r2 = await realPost('pre-session-bias', '**EUR/USD London Bias**\ncorrected', null, OLD); await W(900);
    ok('a correction names the post it corrects', calls.length === 1 && calls[0].p_replace === OLD, calls[0]);
    ok('the new post is on screen', !!(r2 && r2.id && row(r2.id)), r2 && r2.id);
    ok('and the earlier one is gone from the screen, without a reload', !row(OLD), !!row(OLD));
    ok('one EUR/USD bias left in the channel, not two', DB.channel_messages.filter(function (m) { return /EUR\/USD/.test(m.body); }).length === 1);
    // c) the server keeps the earlier one (it is the pre-session record): it stays on screen, the update is added
    calls.length = 0; serverRemoves = false;
    var r3 = await realPost('pre-session-bias', '**XAU/USD London Bias**\nchanged after the open', null, KEPT); await W(900);
    ok('the server kept the earlier post: it stays on screen', calls[0].p_replace === KEPT && !!row(KEPT) && !!row(r3.id), [!!row(KEPT), !!row(r3 && r3.id)]);
    serverRemoves = true;
    // d) anything that is not a post id is never sent (the call would be refused and the post lost)
    calls.length = 0;
    await realPost('pre-session-bias', 'x1', null, 'p3'); await realPost('pre-session-bias', 'x2', null, ''); await realPost('pre-session-bias', 'x3', null, undefined); await W(300);
    ok('a bad id is dropped, the post still goes', calls.length === 3 && calls.every(function (c) { return !('p_replace' in c); }), calls.map(function (c) { return c.p_replace; }));

    // ================= Part 2: what each Post button hands over =================
    var posts = [];
    window.STCommunity.postToChannel = async function (ch, en, es, rep) { var id = uuid(++seq); posts.push({ ch: ch, rep: rep || null, id: id, en: String(en) }); await W(30); return { id: id }; };
    window.__stLocaliseRuleLine = async function (a, b) { return [a, b]; };
    buildBiasMessageMaybeTranslated = async function () { return buildBiasMessage(); };
    buildReviewMessageMaybeTranslated = async function () { return buildReviewMessage(); };
    var keep = JSON.stringify({ a: data.accounts, act: data.activeAccountId, vs: data.viewScope, h: data.history, cs: data.currentSeries, pl: data.postedLog, bh: data.biasHistory, s: data.settings, bs: data.biasSlots, rs: data.reviewSlots, abs: data.activeBiasSlot, ars: data.activeReviewSlot });
    var go = function (p) { var t = document.querySelector('.tab[data-page="' + p + '"]'); if (t) t.click(); };
    data.accounts = [newAccountBlank('Live 70K', 70000, 'personal')]; data.activeAccountId = data.accounts[0].id; data.viewScope = 'lifetime';
    data.history = []; data.currentSeries = []; data.postedLog = {}; data.biasHistory = []; data.biasSlotsParked = {}; data.reviewSlotsParked = {};
    data.settings.symbols = ['EUR/USD', 'XAU/USD']; data.settings.pair = 'EUR/USD';
    getSessions().forEach(function (s, i) { s.symbols = (i === 0) ? ['EUR/USD', 'XAU/USD'] : ['EUR/USD']; });
    data.biasSlots = []; data.reviewSlots = []; reconcileBiasSlots();
    var fill = function (b, dir) { b.news = 'None'; b.mode = 'Execution'; b.structure = 'Ranging'; b.location = '50%'; b.direction = dir; b.notes = ''; b.tvLinks = [{ url: 'https://www.tradingview.com/x/a' + dir + '/', notes: '' }, { url: 'https://www.tradingview.com/x/b' + dir + '/', notes: '' }]; delete b.copiedAt; delete b.postedSig; delete b.postedId; delete b.postedOn; };
    var btn = document.getElementById('bias-copy');
    var todayStr = todayDateStr();

    // ---- bias ----
    fill(data.biasSlots[0], 'Bearish'); switchBiasSlot(0); go('bias'); await W(300);
    btn.click(); await W(900);
    ok('bias, first post: nothing to replace', posts.length === 1 && posts[0].ch === 'pre-session-bias' && posts[0].rep === null, posts.map(function (p) { return p.rep; }));
    ok('the bias remembers its post and the day', data.biasSlots[0].postedId === posts[0].id && data.biasSlots[0].postedOn === todayStr, [data.biasSlots[0].postedId, data.biasSlots[0].postedOn]);
    // his case: an LTF pick taken off, posted again
    data.bias.directionLtf = 'Bearish'; data.bias.postedSig = biasSig(data.bias);   // it went out with an LTF pick...
    data.bias.directionLtf = null; renderBiasPreview(); await W(100);                  // ...which is then un-ticked
    ok('changed since it was posted: the button offers the update', _biasPostState(data.bias) === 'changed', _biasPostState(data.bias));
    btn.click(); await W(900);
    ok('bias, Post update: names the earlier post', posts.length === 2 && posts[1].rep === posts[0].id, posts.map(function (p) { return p.rep; }));
    ok('and now remembers the new one', data.biasSlots[0].postedId === posts[1].id);
    // cleared and redone the same day
    var _ac = window.appConfirm; window.appConfirm = async function () { return true; };
    document.getElementById('bias-reset').click(); await W(300); window.appConfirm = _ac;
    ok('Clear bias keeps today\'s post known', data.bias.postedId === posts[1].id && data.bias.postedOn === todayStr && !data.bias.postedSig && _biasPostState(data.bias) === 'new', [data.bias.postedId, _biasPostState(data.bias)]);
    var p1 = data.bias.postedId; fill(data.bias, 'Bullish'); data.bias.postedId = p1; data.bias.postedOn = todayStr; renderBiasPreview(); await W(100);
    btn.click(); await W(900);
    ok('bias redone after a clear: still takes the place of today\'s post', posts.length === 3 && posts[2].rep === posts[1].id, posts.map(function (p) { return p.rep; }));
    // the other symbol has its own post
    fill(data.biasSlots[1], 'Bullish'); switchBiasSlot(1); go('bias'); await W(300);
    btn.click(); await W(900);
    ok('the other symbol\'s bias replaces nothing', posts.length === 4 && posts[3].rep === null && /XAU\/USD/.test(posts[3].en), posts.map(function (p) { return p.rep; }));
    // a new day: yesterday's post is never named
    var yd = new Date(Date.now() - 86400000), ymd = yd.getFullYear() + '-' + String(yd.getMonth() + 1).padStart(2, '0') + '-' + String(yd.getDate()).padStart(2, '0');
    switchBiasSlot(0); data.bias.postedOn = ymd; data.bias.copiedAt = yd.toISOString(); data.bias.direction = 'Bearish'; renderBiasPreview(); await W(100);
    btn.click(); await W(900);
    ok('a bias posted yesterday is not replaced by today\'s', posts.length === 5 && posts[4].rep === null, posts.map(function (p) { return p.rep; }));

    // ---- review ----
    posts.length = 0;
    data.reviewSlots.forEach(function (r) { r.trades = []; r.reflection = ''; });
    switchReviewSlot(0); go('review'); await W(300);
    document.getElementById('review-reflection').value = 'held too long'; document.getElementById('review-reflection').dispatchEvent(new Event('input', { bubbles: true })); await W(150);
    var rbtn = document.getElementById('review-copy');
    rbtn.click(); await W(1200);
    ok('review, first post: nothing to replace', posts.length === 1 && posts[0].ch === 'post-session-review' && posts[0].rep === null, posts.map(function (p) { return [p.ch, p.rep]; }));
    document.getElementById('review-reflection').value = 'held too long, and moved the stop'; document.getElementById('review-reflection').dispatchEvent(new Event('input', { bubbles: true })); await W(200);
    try { paintReviewPostBtn(); } catch (e) {}
    rbtn.click(); await W(1200);
    ok('review, Post update: names the earlier post', posts.length === 2 && posts[1].rep === posts[0].id, posts.map(function (p) { return [p.ch, p.rep]; }));

    // ---- series of 10 and the weekly review hand theirs over the same way ----
    ok('the series post hands over its earlier post', /postToChannel\('series-of-10-trades', _s10en, _s10es, _s10old && _s10old\.id\)/.test(html));
    ok('the weekly review hands over its earlier post', /postToChannel\('weekend-review', _wkEn, _wkEs, _wkOld && _wkOld\.id\)/.test(html));
    ok('playbooks and Challenge passed never replace', /postToChannel\('playbooks', en, es\)/.test(html) && /postToChannel\('prop-firm-passes', postBody\(P, false\), postBody\(P, true\)\)/.test(html));

    // put things back
    window.STCommunity.postToChannel = realPost;
    try { var kk = JSON.parse(keep); data.accounts = kk.a; data.activeAccountId = kk.act; data.viewScope = kk.vs; data.history = kk.h; data.currentSeries = kk.cs; data.postedLog = kk.pl; data.biasHistory = kk.bh; data.settings = kk.s; data.biasSlots = kk.bs; data.reviewSlots = kk.rs; data.activeBiasSlot = kk.abs; data.activeReviewSlot = kk.ars;
      data.bias = (data.biasSlots && data.biasSlots[data.activeBiasSlot || 0]) || data.bias; data.review = (data.reviewSlots && data.reviewSlots[data.activeReviewSlot || 0]) || data.review; if (typeof saveData === 'function') saveData(); } catch (e) {}
  } catch (err) { ok('test ran without throwing', false, String(err && err.stack || err)); }
  return out;
})()
