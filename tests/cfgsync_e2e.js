(async function () {
  // Chart settings between devices, setting by setting (Nestor, 22 Oct 2026: "why isn't the mobile version picking up the colours and
  // settings of charts from my PC?"). This page plays the phone; the "server" is a stand-in object (nothing is read from or written to
  // the real database). The PC's newer white look must reach the phone, the phone's own small save must not undo it, and how many
  // charts / full screen stay each device's own.
  // Run: python tests/browser_test.py tests/cfgsync_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var sb0 = window.__stSB, cu0 = window.currentUser;
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(800);
    var P = window.__stPractice, C = P._cfg(), now = Date.now(), LS = 'st_practice_cfg';
    // the phone: the dark look, one chart, saved ten minutes ago, from before settings carried their own times
    Object.keys(C).forEach(function (k) { if (k === '_kt' || k === '_kt0') delete C[k]; });
    C.look = { bg: '#121116' }; C.layout = 1; C.max = false; C.tfs = [5, 60, 15, 240]; C.miniS = { len: 30 }; C.savedAt = now - 600000; C.resume = null;
    localStorage.setItem(LS, JSON.stringify(C));
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    // the server: the PC's row, its white look changed a minute ago, three charts, full screen
    var SERVER = { row: { cfg: { look: { bg: '#ffffff', up: '#d1d4dc', dn: '#131722' }, layout: 3, max: true, tfs: [1, 15, 60, 240], miniS: { len: 30 }, _kt: { look: now - 60000 }, _kt0: now - 3600000 }, updated_at: new Date(now - 60000).toISOString() }, pushes: 0 };
    window.currentUser = { id: 'u-test' };
    window.__stSB = { from: function (t) { return t !== 'practice_settings' ? sb0.from(t) : {
      select: function () { return { maybeSingle: function () { return Promise.resolve({ data: SERVER.row ? JSON.parse(JSON.stringify(SERVER.row)) : null, error: null }); } }; },
      upsert: function (row) { SERVER.pushes++; SERVER.row = { cfg: JSON.parse(JSON.stringify(row.cfg)), updated_at: row.updated_at }; return Promise.resolve({ error: null }); } }; } };
    await P._pullCfg(true); await W(300);
    ok('the phone takes the PC\'s newer white look, on its chart at once', C.look && C.look.bg === '#ffffff' && document.documentElement.classList.contains('stpr-lt'), C.look);
    ok('...but not how many charts nor full screen: those are the phone\'s own', C.layout === 1 && C.max === false, [C.layout, C.max]);
    ok('...the timeframes the PC had are older than the phone\'s, so the phone keeps its own', C.tfs[0] === 5, C.tfs);
    // the phone saves something small (a timeframe): only that is stamped; its push keeps the PC's look
    C.tfs = [15, 60, 15, 240]; P._save(); await P._pushCfg(); await W(200);
    var sc = SERVER.row.cfg;
    ok('the phone\'s small save goes up without undoing the PC\'s look', sc.look.bg === '#ffffff' && sc.tfs[0] === 15 && sc._kt && sc._kt.tfs > now - 5000 && sc._kt.look === now - 60000, { look: sc.look, tfs: sc.tfs, kt: sc._kt });
    // later the PC changes the Minimalist: the phone takes it when it comes back into view
    SERVER.row.cfg.miniS = { len: 45 }; SERVER.row.cfg._kt.miniS = Date.now() + 1000; SERVER.row.updated_at = new Date().toISOString();
    window.dispatchEvent(new Event('focus')); await W(50); await P._pullCfg(true); await W(200);
    ok('a Minimalist change made later on the PC reaches the phone', C.miniS && C.miniS.len === 45, C.miniS);
    // and the phone's own newer look wins back over the server's older one
    C.look = { bg: '#000000' }; P._save(); await P._pushCfg(); await W(200);
    ok('the phone\'s own newer change goes to the server', SERVER.row.cfg.look.bg === '#000000', SERVER.row.cfg.look);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  window.__stSB = sb0; window.currentUser = cu0;
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
