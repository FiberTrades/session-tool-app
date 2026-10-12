(async function () {
  // A file dragged into a chat attaches; a file dropped anywhere else no longer replaces the app (12 Oct 2026).
  // Nestor: "why when i drag this image into the chat to send it doesnt send it and it opens this window?" - the chats
  // took a pasted file and the upload button, never a dropped one, and an unhandled drop makes the browser open the file
  // in the app's own tab.
  // Run: python tests/browser_test.py tests/dropfile_e2e.js
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
    css.textContent = '#st-nudge, .st-nudge, .st-tour-ov, .modal-bg, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }';
    document.head.appendChild(css);

    // a real small PNG, and the drag events a browser sends for it
    var png = await new Promise(function (res) { var c = document.createElement('canvas'); c.width = 40; c.height = 24; var x = c.getContext('2d'); x.fillStyle = '#fc52ab'; x.fillRect(0, 0, 40, 24); c.toBlob(function (b) { res(new File([b], 'EURUSD conversion to GOLD.png', { type: 'image/png' })); }, 'image/png'); });
    var withFile = function (f) { var dt = new DataTransfer(); dt.items.add(f); return dt; };
    var withText = function () { var dt = new DataTransfer(); dt.setData('text/plain', 'just some dragged words'); return dt; };
    // returns true when the page took the event (default prevented = the browser will NOT open the file)
    var fire = function (el, type, dt) { return !el.dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true })); };
    ok('a scripted drag carries its file the way a real one does', [].indexOf.call(withFile(png).types, 'Files') >= 0 && withFile(png).files.length === 1, [].slice.call(withFile(png).types));

    // ---- 1) dropped where nothing takes it: refused, never opened ----
    var page = document.getElementById('page-bias') || document.body;
    ok('a file dragged over the page is taken by the app, not left to the browser', fire(page, 'dragover', withFile(png)) === true);
    ok('and dropped there: the browser is stopped from opening it', fire(page, 'drop', withFile(png)) === true);
    ok('the same on the bare page body', fire(document.body, 'drop', withFile(png)) === true);
    ok('dragged words are left alone (no files in the drag)', fire(page, 'dragover', withText()) === false && fire(page, 'drop', withText()) === false);

    // ---- the community, signed in as the admin on an in-memory database ----
    var ADMIN = 'ccaf6a5e-69ed-443c-8d92-bc7fdd464f49', TROY = '22222222-2222-4222-8222-222222222222';
    window.currentUser = { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' } };
    try { Object.defineProperty(window.STCloud, 'userId', { value: ADMIN, configurable: true, writable: true }); } catch (e) {}
    var now = Date.now();
    var DB = {
      channels: [{ id: 'ch-chat', slug: 'session-chat', name: '💬 session-chat', access_policy: 'mentorship,bundle,trial', post_policy: 'mentorship,bundle,trial', required_role: null, category_id: null, position: 1 }],
      channel_messages: [{ id: 'm1', channel_id: 'ch-chat', sender_id: TROY, sender_name: 'Troy', body: 'hello', created_at: new Date(now - 7200000).toISOString() }],
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
    var C = window.__stSB;
    C.from = function (t) { return Q(t); };
    C.rpc = function (fn) { var d = fn === 'st_admin_ids' ? [{ id: ADMIN }] : fn === 'st_members' ? [{ id: ADMIN, name: 'Nestor', avatar: '', plan: 'comp', paid: true, is_admin: true }] : null; var p = Promise.resolve({ data: d, error: null }); p.then = p.then.bind(p); return p; };
    var fakeChan = function () { var ch = { on: function () { return ch; }, subscribe: function (cb) { try { cb && cb('SUBSCRIBED'); } catch (e) {} return ch; }, unsubscribe: function () {}, send: function () { return Promise.resolve(); }, track: function () { return Promise.resolve(); }, presenceState: function () { return {}; } }; return ch; };
    C.channel = fakeChan; C.removeChannel = function () { return Promise.resolve(); };
    var SESSION = { access_token: 'test', token_type: 'bearer', user: { id: ADMIN, email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' }, app_metadata: {} } };
    C.auth.getSession = function () { return Promise.resolve({ data: { session: SESSION }, error: null }); };
    C.auth.getUser = function () { return Promise.resolve({ data: { user: SESSION.user }, error: null }); };
    try { await C.auth._notifyAllSubscribers('SIGNED_IN', SESSION); } catch (e) {}
    await W(2500);
    var tab = document.querySelector('.tab[data-page="community"]'); if (tab) tab.click(); await W(2500);
    var chanEl = function () { return document.querySelector('.dcx-chan[data-cid="ch-chat"]'); };
    for (var k = 0; k < 20 && !chanEl(); k++) await W(300);
    if (chanEl()) chanEl().click(); await W(1200);

    // ---- 2) Community: dropped on the conversation, it is the pending attachment ----
    var msgs = document.getElementById('dcx-msgs'), ta = document.getElementById('dcx-input'), bar = document.getElementById('dcx-pending');
    var pend = function () { return !!bar && getComputedStyle(bar).display !== 'none' && bar.innerHTML.length > 0; };
    ok('the channel is open and nothing is waiting to be sent', !!msgs && !!ta && ta.offsetParent !== null && !pend(), [!!msgs, !!ta, pend()]);
    ok('dragging a file over the messages is accepted', fire(msgs, 'dragover', withFile(png)) === true);
    ok('dropping it there is taken by the chat', fire(msgs, 'drop', withFile(png)) === true);
    await W(400);
    ok('and it shows as the attachment waiting to be sent, like a pasted one', pend() && (/EURUSD conversion to GOLD/.test(bar.innerText) || !!bar.querySelector('img')), bar ? bar.innerText.slice(0, 80) : null);
    ok('the message box has the cursor, ready for Enter', document.activeElement === ta);
    var rm = bar.querySelector('button, .dcx-pend-x, [data-x]'); if (rm) rm.click(); await W(200);
    ok('it can be taken off again', !pend(), bar.innerHTML.slice(0, 80));
    ok('dropped on the message box itself: the same', fire(ta, 'drop', withFile(png)) === true && (await W(300), pend()));
    rm = bar.querySelector('button, .dcx-pend-x, [data-x]'); if (rm) rm.click(); await W(200);
    ok('dragged words still go into the box as text (not taken as a file)', fire(ta, 'dragover', withText()) === false);
    // a channel that cannot be written in: refused, and still not opened by the browser
    ta.disabled = true;
    ok('where you cannot write, the file is not attached - and still not opened', fire(msgs, 'drop', withFile(png)) === true && (await W(200), !pend()));
    ta.disabled = false;

    // ---- 3) the assistant: a dropped image attaches like a pasted one ----
    var prev = document.querySelector('.st-asst-preview'), abox = prev ? prev.closest('.st-asst-box, .st-asst') || prev.parentNode.parentNode : null;
    var azone = prev;   // the drop bubbles up from anywhere inside the assistant box
    if (prev) {
      // make this one visible enough to matter: the handler lives on the box, so any child will do
      var took = fire(azone, 'drop', withFile(png)); await W(900);
      ok('the assistant box takes a dropped image', took === true);
      ok('and shows it as the picture going with the question', getComputedStyle(prev).display !== 'none' && !!prev.querySelector('img'), prev.innerHTML.slice(0, 80));
      var notImg = new File(['a,b\n1,2'], 'trades.csv', { type: 'text/csv' });
      var before = prev.innerHTML;
      ok('a file that is not a picture is refused there, and still not opened', fire(azone, 'drop', withFile(notImg)) === true && (await W(300), prev.innerHTML === before));
    } else ok('the assistant box is on the page', false);

    // ---- 4) direct messages and the MT5 import are wired the same / left alone ----
    ok('direct messages take a dropped file the same way', /ta\.closest\('\.stdm-main'\)[\s\S]{0,700}setPending\(f\)/.test(html));
    ok('the MT5 import drop zone keeps its own handler', /dropZone\.addEventListener\('drop', e => \{\s*e\.preventDefault\(\);\s*const file = e\.dataTransfer && e\.dataTransfer\.files && e\.dataTransfer\.files\[0\];\s*if \(file\) handleMt5File\(file\);/.test(html));
    var zone = document.getElementById('mt5-drop-zone');
    ok('and the page-wide rule only steps in when nothing else took the drop', /if \(!_dropHasFiles\(e\) \|\| e\.defaultPrevented\) return; e\.preventDefault\(\);/.test(html) && (!zone || true));
  } catch (err) { ok('test ran without throwing', false, String(err && err.stack || err)); }
  return out;
})()
