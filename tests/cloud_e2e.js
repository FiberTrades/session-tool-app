(async function () {
  // MT5 in the cloud (23 Oct 2026): Settings > MT5's card for the admin - the form, a password sealed in the page with the
  // server's public key (RSA-OAEP SHA-256) and never sent as text, what is typed surviving the card's repaints, the status
  // chips, and Remove pressed twice. The database is a stand-in here (nothing is written); the sealed dummy password is
  // returned so the run can check the server's private key opens it.
  // Run: python tests/browser_test.py tests/cloud_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var PUB = 'MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA5Oos3xOy+PhaR6H08HbodDxPbwVYkrSWXLFTT6If+2D2EmBKPHsKTqQZNjWWPtqVX6r3xLlHIBtB95C6mZiPENaF5GfgrF1T2AyNi95xdvrj0/k84VxJh5Dim2L+al3+H81gPQQva/Q13mBqGK7F7/ca7M6OXLgEkXFd2gvwft/Q8C7MuUnxIDAo3P9EO5rxrQbboGzCoXkukMbnTh6JxDqOU6j4MHxt4LwdsyMSnVru9ZkEu141PGFACaI14oL20z3mUryVjQ5I2bxUkt3+lIkX/zAP3fw362ZfnHwKxmMu0cBvBSAdI8fufZKph8KpgjKHYqGscu70DK8O58le40g8CTSsTpos6vS4ePKGGDspZVfn6LH0Vec16PrivNjaFDNP93e1drYy+xI5hYMBknRl+TaU35MUfQg7jFoxNndMEdZ2ykKAoqG6Jtbcl+zX7ZQC1M5iUZ423Ff+0DgS6rMs2ZA+71V9cyt0CEvnM4XmMmrj1W41g7c5XrPystEzAgMBAAE=';
  var DUMMY = 'dummy-Pass-1';
  try {
    for (var i = 0; i < 200 && !(window.__stMt5c && window.__stSB); i++) await W(100);
    await W(1500);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"]').forEach(function (e) { e.remove(); });
    // a stand-in database: what the card reads and writes
    var rows = [], inserted = [], deleted = [];
    var realFrom = window.__stSB.from.bind(window.__stSB);
    var chain = function (val) { var p = Promise.resolve(val); ['select', 'eq', 'order', 'limit', 'in'].forEach(function (m) { p[m] = function () { return p; }; }); return p; };
    window.__stSB.from = function (t) {
      if (t === 'cloud_hosts') return chain({ data: [{ id: 'uk1', region: 'test', public_key: PUB }], error: null });
      if (t === 'cloud_mt5') return {
        select: function () { return chain({ data: rows.slice(), error: null }); },
        insert: function (p) { inserted.push(p); return { select: function () { return Promise.resolve({ data: [{ id: 'new1' }], error: null }); } }; },
        delete: function () { return { eq: function (k, v) { deleted.push(v); rows = rows.filter(function (r) { return r.id !== v; }); return Promise.resolve({ error: null }); } }; }
      };
      return realFrom(t);
    };
    window.currentUser = { id: '00000000-0000-0000-0000-000000000001', email: 'be.o2@hotmail.com' };
    window.__stMt5c.open(); await W(800);
    var body = document.getElementById('mt5c-body');
    var card = function () { return body.textContent || ''; };
    ok('the admin sees MT5 in the cloud in Settings > MT5', /MT5 in the cloud/.test(card()) && /Testing: only you see this/.test(card()), card().slice(-300));
    var open = body.querySelector('[data-cl-open]');
    ok('an Add an account button', !!open);
    open.click(); await W(300);
    var f = function (k) { return body.querySelector('[data-cl-f="' + k + '"]'); };
    ok('the form: login, server, password (hidden) and Allow trading from the app (ticked)', f('login') && f('server') && f('pw') && f('pw').type === 'password' && f('app') && f('app').checked);
    f('login').value = '1520001234'; f('server').value = 'FTMO-Demo'; f('pw').value = DUMMY;
    f('pw').focus();
    window.__stMt5c.render(); await W(200);   // a repaint while typing (the card repaints itself every 1.5 s)
    ok('a repaint keeps what is typed and where the cursor is', f('login').value === '1520001234' && f('server').value === 'FTMO-Demo' && f('pw').value === DUMMY && document.activeElement === f('pw'));
    // wrong login
    f('login').value = '15x'; body.querySelector('[data-cl-save]').click(); await W(300);
    ok('a login that is not a number is refused, in words', /digits only/.test(card()) && inserted.length === 0, card().slice(-200));
    f('login').value = '1520001234';
    body.querySelector('[data-cl-save]').click();
    for (i = 0; i < 50 && !inserted.length; i++) await W(100);
    await W(300);
    var p = inserted[0] || {};
    ok('Add to the cloud sends login, server, App trading and the host', p.login === 1520001234 && p.server === 'FTMO-Demo' && p.app_trading === true && p.host_id === 'uk1', p);
    var sent = JSON.stringify(p);
    ok('the password never leaves the page as text', sent.indexOf(DUMMY) < 0 && !('password' in p));
    ok('it goes sealed: 384 bytes of RSA-OAEP (3072-bit key), base64', typeof p.enc_password === 'string' && atob(p.enc_password).length === 384, p.enc_password && p.enc_password.length);
    ok('...and the form closes and is emptied', !body.querySelector('[data-cl-f="pw"]'));
    // statuses
    rows = [{ id: 'a1', login: 1520001234, server: 'FTMO-Demo', status: 'pending', app_trading: true, created_at: new Date().toISOString() },
            { id: 'a2', login: 1520009999, server: 'FTMO-Demo', status: 'running', status_msg: 'Signed in on FTMO-Demo', app_trading: false, created_at: new Date().toISOString() },
            { id: 'a3', login: 1520005555, server: 'FTMO-Server', status: 'error', status_msg: 'Invalid account: check the login, password and server, then remove and add the account again.', app_trading: true, created_at: new Date().toISOString() }];
    window.__stMt5c.render(); await W(9500);   // the card reads the list again within about 8 s
    var tx = card();
    ok('each account with its state: waiting, signed in, problem with MT5\'s reason', /MT5 1520001234/.test(tx) && /Waiting for the server/.test(tx) && /Signed in/.test(tx) && /Problem/.test(tx) && /Invalid account/.test(tx), tx.slice(-500));
    ok('trading from the app off is said on its row', /trading from the app off/.test(tx));
    var rm = body.querySelector('[data-cl-rm="a3"]'); rm.click(); await W(200);
    ok('Remove asks to be pressed again', /Press again to remove/.test(card()) && deleted.length === 0);
    body.querySelector('[data-cl-rm="a3"]').click(); await W(400);
    ok('...pressed again, the account is removed', deleted.length === 1 && deleted[0] === 'a3', deleted);
    // not the admin: nothing shows
    window.currentUser = { id: '00000000-0000-0000-0000-000000000002', email: 'someone@example.com' };
    window.__stMt5c.render(); await W(300);
    ok('anyone else does not see it while it is tested', !/MT5 in the cloud/.test(card()));
    window.__stSB.from = realFrom;
    out.push({ name: 'sealed sample for the server-side check: ' + (p.enc_password || ''), ok: !!p.enc_password });
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
