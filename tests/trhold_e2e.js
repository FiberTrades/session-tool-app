// End-to-end test: a foreign message is held back until its translation is ready (Nestor, 2 Nov 2026: "if a spanish speaker writes a message in
// the chat we first see the spanish message then it gets translated to english, can you make that seamless so we dont see the spanish message
// first?"). The Community on an in-memory database, the translator a stub with a latency the test sets; every text the chat ever shows is
// recorded by a MutationObserver, so one frame of Spanish fails it.
//   python tests/browser_test.py tests/trhold_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    for (var i0 = 0; i0 < 200 && !(window.__stSB && window.STCommunity); i0++) await W(100);
    await W(800);
    var ADMIN = 'ccaf6a5e-69ed-443c-8d92-bc7fdd464f49', TROY = '22222222-2222-4222-8222-222222222222', now = Date.now();
    window.currentUser = { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' } };
    try { Object.defineProperty(window.STCloud, 'userId', { value: ADMIN, configurable: true, writable: true }); } catch (e) {}
    try { localStorage.setItem('st_tr_all', '1'); } catch (e) {}
    var EN = ['I think this is the one that we want to see today', 'Is it going to be a good day for the market', 'We have to wait for the news and then look at it'];
    var DB = {
      categories: [{ id: 'cat1', name: 'Trading', position: 0 }],
      channels: [{ id: 'ch-chat', slug: 'session-chat', name: 'session-chat', topic: '', access_policy: 'mentorship,bundle,trial', post_policy: 'mentorship,bundle,trial', required_role: null, category_id: 'cat1', position: 1 },
                 { id: 'ch-gen', slug: 'general', name: 'general', topic: '', access_policy: 'mentorship,bundle,trial', post_policy: 'mentorship,bundle,trial', required_role: null, category_id: 'cat1', position: 2 }],
      channel_messages: Array.apply(null, Array(84)).map(function (x, i) { return { id: 'f' + i, channel_id: 'ch-chat', sender_id: i % 3 ? TROY : ADMIN, sender_name: i % 3 ? 'Troy' : 'Nestor', body: i === 1 ? 'el precio va a subir porque la noticia es muy buena para el mercado' : EN[i % 3], created_at: new Date(now - (90 - i) * 60000).toISOString() }; }),
      channel_reactions: [], roles: [], member_roles: [], channel_reads: []
    };
    DB.channel_messages.push({ id: 'g1', channel_id: 'ch-gen', sender_id: TROY, sender_name: 'Troy', body: 'creo que la sesión de hoy es muy buena para el mercado', created_at: new Date(now - 3000000).toISOString() });
    var newestFirst = function () { DB.channel_messages.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }); }; newestFirst();
    var MEMBERS = [{ id: ADMIN, name: 'Nestor', avatar: '', plan: 'comp', paid: true, is_admin: true }, { id: TROY, name: 'Troy', avatar: '', plan: 'comp', paid: true, is_admin: false }];
    var runQ = function (st) {
      var rows = DB[st.table] || [], match = function (r) { return st.filters.every(function (x) { return x[2] === 'in' ? x[1].indexOf(r[x[0]]) > -1 : x[2] === 'lt' ? r[x[0]] < x[1] : String(r[x[0]]) === String(x[1]); }); };
      if (st.op !== 'select') return { data: null, error: null };
      var res = rows.filter(match); if (st.lim) res = res.slice(0, st.lim); return st.single ? { data: res[0] || null, error: null } : { data: res, error: null, count: res.length };
    };
    var Q = function (table) {
      var st = { table: table, filters: [], op: 'select' }, b = {};
      ['select', 'order', 'range', 'gte', 'lte', 'gt', 'is', 'ilike', 'like', 'or', 'not', 'neq', 'contains', 'filter', 'match', 'textSearch', 'abortSignal', 'returns', 'csv'].forEach(function (k2) { b[k2] = function () { return b; }; });
      b.limit = function (n) { st.lim = n; return b; };
      b.lt = function (a, v) { st.filters.push([a, v, 'lt']); return b; };
      b.eq = function (a, v) { st.filters.push([a, v]); return b; }; b['in'] = function (a, v) { st.filters.push([a, v, 'in']); return b; };
      b.maybeSingle = b.single = function () { st.single = true; return b; };
      b.insert = function () { st.op = 'insert'; return b; }; b.update = function () { st.op = 'update'; return b; }; b.upsert = function () { st.op = 'upsert'; return b; }; b['delete'] = function () { st.op = 'delete'; return b; };
      b.then = function (res, rej) { return Promise.resolve().then(function () { return runQ(st); }).then(res, rej); }; b['catch'] = function (fn) { return b.then(null, fn); };
      return b;
    };
    var SB = window.__stSB, from0 = SB.from.bind(SB), rpc0 = SB.rpc.bind(SB), COMM = /^(categories|channels|channel_|roles|member_roles|dm_|friend|profiles_public|community|presence|notif)/;
    SB.from = function (t) { return COMM.test(t) ? Q(t) : from0(t); };
    SB.rpc = function (fn, a) { if (fn === 'st_admin_ids') return Promise.resolve({ data: [{ id: ADMIN }], error: null }); if (fn === 'st_members') return Promise.resolve({ data: MEMBERS, error: null }); if (fn === 'st_mark_channel_read') return Promise.resolve({ data: null, error: null }); return rpc0(fn, a); };
    var subs = [];
    var fakeChan = function () { var ch = { on: function (ev, f, cb) { if (f && f.table) subs.push({ ev: f.event, table: f.table, filter: f.filter || '', cb: cb }); return ch; }, subscribe: function (cb) { try { cb && cb('SUBSCRIBED'); } catch (e) {} return ch; }, unsubscribe: function () {}, send: function () { return Promise.resolve('ok'); }, track: function () { return Promise.resolve('ok'); }, untrack: function () { return Promise.resolve('ok'); }, presenceState: function () { return {}; } }; return ch; };
    var chan0 = SB.channel.bind(SB); SB.channel = function (name) { return /^realtime:stl-|^stl-/.test(String(name)) ? chan0(name) : fakeChan(); };
    SB.removeChannel = function () { return Promise.resolve('ok'); };
    var fire = function (ev, payload) { subs.forEach(function (s) { if (s.table === 'channel_messages' && s.ev === ev && (!s.filter || s.filter === 'channel_id=eq.ch-chat')) { try { s.cb(payload); } catch (e) { errs.push(String(e)); } } }); };
    var seq = 0, stamp = function () { seq++; return new Date(now + seq * 1000).toISOString(); };
    var arrive = function (id, body, who, extra) { var m = Object.assign({ id: id, channel_id: 'ch-chat', sender_id: who || TROY, sender_name: who === ADMIN ? 'Nestor' : 'Troy', body: body, created_at: stamp() }, extra || {}); DB.channel_messages.push(m); newestFirst(); fire('INSERT', { new: m }); return m; };
    var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    // the translator: a stub with a latency the test sets, its answers from this list
    var LAT = 0, DICT = {
      'el precio va a subir porque la noticia es muy buena para el mercado': 'the price will go up because the news is very good for the market',
      'hola a todos, creo que el precio va a subir hoy': 'hello everyone, I think the price will go up today',
      'creo que esta vela es la que estamos esperando': 'I think this candle is the one we are waiting for',
      'no me gusta nada este movimiento de hoy': 'I do not like this move today at all',
      'el mercado está muy lateral y no hay nada que hacer': 'the market is very choppy and there is nothing to do',
      'pero la noticia es a las tres y media': 'but the news is at half past three',
      'creo que la sesión de hoy es muy buena para el mercado': 'I think today\'s session is very good for the market',
      'cuando salga la noticia vamos a mirar el precio': 'when the news comes out we will look at the price',
      'me salió mal la operación por culpa de la noticia': 'the trade went wrong because of the news',
      'este mensaje lo he cambiado por otro que es mejor': 'I changed this message for a better one',
      'vamos': 'let us go'
    };
    var calls = [];
    window.stTranslateText = function (text, from, to) { calls.push(text); var lat = LAT; return new Promise(function (r) { setTimeout(function () { r(DICT[text] || text); }, lat); }); };
    var SESSION = { access_token: 'test', token_type: 'bearer', user: { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' }, app_metadata: {} } };
    SB.auth.getSession = function () { return Promise.resolve({ data: { session: SESSION }, error: null }); };
    SB.auth.getUser = function () { return Promise.resolve({ data: { user: SESSION.user }, error: null }); };
    try { await Promise.race([SB.auth._notifyAllSubscribers('SIGNED_IN', SESSION), W(8000)]); } catch (e) {}
    await W(2000);
    document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
    var css0 = document.createElement('style'); css0.textContent = '#st-nudge, .st-nudge, .st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"], .dcx-notif-prompt { display: none !important; }'; document.head.appendChild(css0);
    document.querySelector('.tab[data-page="community"]').click();
    var box = null;
    for (var k = 0; k < 80 && !((box = document.getElementById('dcx-msgs')) && box.querySelectorAll('.dcx-msg').length >= 20); k++) await W(250);
    await W(2500);
    check('the chat is up on its newest messages', !!box && box.querySelectorAll('.dcx-msg').length >= 20, box && box.querySelectorAll('.dcx-msg').length);
    // everything the chat ever shows, with its time
    var T = []; var texts = function () { return Array.prototype.map.call(box.querySelectorAll('.dcx-text, .dcx-reply-ref'), function (e) { return e.textContent; }).join('\n'); };
    var snap = function () { T.push({ t: performance.now(), x: texts() }); };
    new MutationObserver(snap).observe(box, { childList: true, subtree: true, characterData: true });
    var ever = function (s) { return T.some(function (e) { return e.x.indexOf(s) >= 0; }); };
    var firstAt = function (s) { for (var i = 0; i < T.length; i++) if (T[i].x.indexOf(s) >= 0) return T[i].t; return null; };
    var shown = function (s) { return texts().indexOf(s) >= 0; };
    var atEnd = function () { return box.scrollTop + box.clientHeight >= box.scrollHeight - 6; };
    var toEnd = function () { box.scrollTop = box.scrollHeight; };
    toEnd(); await W(150);

    arrive('warm0', 'I think this is the first one that came in today'); await W(2500); toEnd(); await W(150); T.length = 0;   // the first message of a page's life does a lot once (sounds, the unread count): not the translator's wait

    // A: the translator answers in 400 ms: only the English is ever seen
    LAT = 400;
    var rows0 = box.querySelectorAll('.dcx-msg').length, S1 = 'hola a todos, creo que el precio va a subir hoy', E1 = DICT[S1];
    var t0 = performance.now(); arrive('sp1', S1); snap();
    await W(150);
    check('a Spanish message: held back while its translation comes (nothing shown yet)', !shown(S1) && !shown(E1), texts().slice(-80));
    await W(600);
    check('...then its English is there', shown(E1), texts().slice(-100));
    check('...and the Spanish was never on screen, not for one frame', !ever(S1), T.filter(function (e) { return e.x.indexOf(S1) >= 0; }).length);
    check('...it appears as soon as the translation is ready', firstAt(E1) != null && firstAt(E1) - t0 < 560, firstAt(E1) - t0);
    check('...the chat at its newest message, one more row', atEnd() && box.querySelectorAll('.dcx-msg').length >= rows0, [box.scrollTop, box.clientHeight, box.scrollHeight]);

    // B: already translated (deleted and sent again, the same id): straight away
    fire('DELETE', { old: { id: 'sp1' } }); await W(100);
    LAT = 5000; t0 = performance.now();
    DB.channel_messages = DB.channel_messages.filter(function (m) { return m.id !== 'sp1'; });
    arrive('sp1', S1); snap();
    check('a translation it already has: shown at once, in English', shown(E1) && !shown(S1), texts().slice(-100));

    // C: a slow translator never hides a message for long; the original, then the English when it comes
    var S2 = 'creo que esta vela es la que estamos esperando', E2 = DICT[S2]; LAT = 3000; T.length = 0; t0 = performance.now();
    arrive('sp2', S2); snap();
    await W(900);
    check('a slow translator: still held after 0.9 s', !shown(S2) && !shown(E2));
    await W(1000);
    check('...but never for more than about 2 s: the original is shown', shown(S2), [performance.now() - t0, texts().slice(-80)]);
    check('...at its newest message', atEnd());
    await W(1500);
    check('...and its English when it lands', shown(E2) && !shown(S2) && atEnd(), texts().slice(-80));

    // D: an unsure one ("yep": no sign of a language) waits less
    LAT = 5000; T.length = 0; t0 = performance.now();
    arrive('un1', 'yep'); snap();
    await W(1000);
    check('an unsure short message on a slow translator waits under a second', shown('yep'), firstAt('yep') - t0);

    // E: your own message: at once
    T.length = 0; var S3 = 'no me gusta nada este movimiento de hoy';
    arrive('me1', S3, ADMIN); snap();
    check('your own message is on screen at once, whatever the translator is doing', shown(S3), texts().slice(-80));

    // F: order: a clearly English message behind a held one waits for it; they never swap
    await W(1200); LAT = 350; T.length = 0;
    var S4 = 'el mercado está muy lateral y no hay nada que hacer', E4 = DICT[S4], EN1 = 'I think that we have to wait for the next one';
    arrive('sp4', S4); arrive('en1', EN1); snap();
    await W(120);
    check('an English message right behind a held one waits for it', !shown(EN1) && !shown(S4));
    await W(500);
    var tx = texts();
    check('...then both, in the order they were written, no Spanish', tx.indexOf(E4) >= 0 && tx.indexOf(EN1) > tx.indexOf(E4) && !ever(S4), tx.slice(-160));
    check('...never the other way round', !T.some(function (e) { return e.x.indexOf(EN1) >= 0 && e.x.indexOf(E4) < 0; }));

    // G: a reply: the excerpt above it comes translated with it
    LAT = 300; T.length = 0;
    var S5 = 'pero la noticia es a las tres y media', S6 = 'cuando salga la noticia vamos a mirar el precio';
    arrive('sp6', S6, TROY, { reply_to: 'zz9', reply_excerpt: S5 }); snap();
    await W(800);
    check('a reply: no Spanish in it or in the line it quotes, ever', shown(DICT[S6]) && !ever(S5) && !ever(S6), texts().slice(-160));

    // H: scrolled up: left where it is when the held message lands
    box.scrollTo({ top: 400, behavior: 'instant' }); await W(300); if (box.scrollTop > 900) { box.scrollTo({ top: 400, behavior: 'instant' }); await W(300); }
    var st0 = box.scrollTop; LAT = 300; T.length = 0;
    var S7 = 'me salió mal la operación por culpa de la noticia';
    arrive('sp7', S7); await W(700);
    check('scrolled up reading: the view stays put when it lands', Math.abs(box.scrollTop - st0) < 3 && !ever(S7), [st0, box.scrollTop]);
    toEnd(); await W(200);

    // I: an edit: the row keeps its old English until the new English is ready
    LAT = 300; T.length = 0;
    var S8 = 'este mensaje lo he cambiado por otro que es mejor';
    var m8 = DB.channel_messages.filter(function (m) { return m.id === 'sp7'; })[0];
    fire('UPDATE', { new: Object.assign({}, m8, { body: S8 }) }); snap();
    await W(120);
    check('someone edits a message: no Spanish while the new translation comes', !shown(S8) && !shown(S7));
    await W(500);
    check('...then the new English', shown(DICT[S8]) && !ever(S8), texts().slice(-80));

    // J: scrolled to the top: an older page with Spanish in it arrives translated
    await W(200); LAT = 200; T.length = 0;
    box.scrollTop = 0; box.dispatchEvent(new Event('scroll'));
    await W(1800);
    var OLDS = 'el precio va a subir porque la noticia es muy buena para el mercado';
    check('older messages loaded by scrolling up: no Spanish on the way in', shown(DICT[OLDS]) && !ever(OLDS), [texts().indexOf(DICT[OLDS]), ever(OLDS)]);
    toEnd(); await W(200);

    // K: a channel opening on a stuck translator: the loading logo gives way within about 2 s
    LAT = 20000; T.length = 0;
    var went = window.STCommunity.gotoChannel && window.STCommunity.gotoChannel('ch-gen'); t0 = performance.now();
    var S9 = 'creo que la sesión de hoy es muy buena para el mercado', seenAt = null;
    for (k = 0; k < 60 && seenAt == null; k++) { await W(100); if (document.getElementById('dcx-msgs').textContent.indexOf(S9) >= 0) seenAt = performance.now() - t0; }
    check('a channel opening on a stuck translator shows its messages within about 2 s', went && seenAt != null && seenAt < 3000, [went, seenAt]);

    check('the translator was really asked', calls.length > 5, calls.length);
    check('no script errors', !errs.length, errs.slice(0, 4));
  } catch (e) { results.push({ name: 'the test ran', ok: false, got: String(e && e.stack || e) }); }
  return JSON.stringify(results);
})()
