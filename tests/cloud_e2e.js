(async function () {
  // MT5 in the cloud, inside Settings -> Accounts since 23 Oct 2026 (it was a card in Settings > MT5): + Add account for the admin -
  // a password sealed in the page with the server's public key (RSA-OAEP SHA-256) and never sent as text, the account made and
  // linked, the states in the accounts' lines, Running twice, and Remove from the cloud pressed twice. The database is a stand-in
  // (nothing is written); the sealed dummy password is returned so the run can check the server's private key opens it.
  // Run: python tests/browser_test.py tests/cloud_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var PUB = 'MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA5Oos3xOy+PhaR6H08HbodDxPbwVYkrSWXLFTT6If+2D2EmBKPHsKTqQZNjWWPtqVX6r3xLlHIBtB95C6mZiPENaF5GfgrF1T2AyNi95xdvrj0/k84VxJh5Dim2L+al3+H81gPQQva/Q13mBqGK7F7/ca7M6OXLgEkXFd2gvwft/Q8C7MuUnxIDAo3P9EO5rxrQbboGzCoXkukMbnTh6JxDqOU6j4MHxt4LwdsyMSnVru9ZkEu141PGFACaI14oL20z3mUryVjQ5I2bxUkt3+lIkX/zAP3fw362ZfnHwKxmMu0cBvBSAdI8fufZKph8KpgjKHYqGscu70DK8O58le40g8CTSsTpos6vS4ePKGGDspZVfn6LH0Vec16PrivNjaFDNP93e1drYy+xI5hYMBknRl+TaU35MUfQg7jFoxNndMEdZ2ykKAoqG6Jtbcl+zX7ZQC1M5iUZ423Ff+0DgS6rMs2ZA+71V9cyt0CEvnM4XmMmrj1W41g7c5XrPystEzAgMBAAE=';
  var DUMMY = 'dummy-Pass-1';
  try {
    for (var i = 0; i < 200 && !(window.__stMt5c && window.__stSB && window.__stAccFill); i++) await W(100);
    await W(1500);
    try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
    document.querySelectorAll('[class^="st-tour"]').forEach(function (e) { e.remove(); });
    // a stand-in database: what the Accounts tab reads and writes
    var rows = [], inserted = [], deleted = [], failHost = null;
    var realFrom = window.__stSB.from.bind(window.__stSB);
    var chain = function (val) { var p = Promise.resolve(val); ['select', 'eq', 'order', 'limit', 'in'].forEach(function (m) { p[m] = function () { return p; }; }); return p; };
    window.__stSB.from = function (t) {
      if (t === 'cloud_hosts') return chain({ data: [{ id: 'uk1', region: 'test', public_key: PUB }], error: null });
      if (t === 'cloud_mt5') return {
        select: function () { return chain({ data: rows.slice(), error: null }); },
        insert: function (p) { inserted.push(p); return { select: function () { return Promise.resolve(p.host_id === failHost ? { data: null, error: { message: 'cloud_full' } } : { data: [{ id: 'new1' }], error: null }); } }; },
        delete: function () { return { eq: function (k, v) { deleted.push(v); rows = rows.filter(function (r) { return r.id !== v; }); return Promise.resolve({ error: null }); } }; }
      };
      return realFrom(t);
    };
    window.currentUser = { id: '00000000-0000-0000-0000-000000000001', email: 'be.o2@hotmail.com' };
    var D = STCloud.getData(); D.mt5LoginMap = {}; window.__stAccOpenId = null;
    document.getElementById('settings-gear').click(); await W(700);
    document.querySelector('#settings-modal-bg .settings-nav-item[data-section="accounts"]').click(); await W(900);
    document.getElementById('sacc-add-open').click(); await W(300);
    var ac = document.getElementById('sacc-addcloud'), f = function (k) { return ac && ac.querySelector('[data-sacc-af="' + k + '"]'); };
    ok('the admin: + Add account leads with running it in the cloud', !!ac && /run it in the cloud/i.test(ac.textContent));
    ok('the form: login, server, password (hidden) and Allow trading from the app (ticked)', f('login') && f('server') && f('pw') && f('pw').type === 'password' && f('app') && f('app').checked);
    var errT = function () { var e = ac.querySelector('[data-sacc-aerr]'); return e && !e.hidden ? e.textContent : ''; };
    // the prop-firm note: ticked once before the first cloud account (24 Oct 2026)
    f('login').value = '1520001234'; f('server').value = 'FTMO-Demo'; f('pw').value = DUMMY; ac.querySelector('[data-sacc-ago]').click(); await W(300);
    ok('the first time, the prop-firm line must be ticked', /Tick the line about your prop firm/.test(errT()) && inserted.length === 0 && !!f('ack'), errT());
    f('ack').checked = true;
    f('login').value = '15x'; ac.querySelector('[data-sacc-ago]').click(); await W(300);
    ok('a login that is not a number is refused, in words', /digits only/.test(errT()) && inserted.length === 0, errT());
    f('login').value = '1520001234'; f('pw').value = DUMMY;
    ac.querySelector('[data-sacc-ago]').click();
    for (i = 0; i < 50 && !inserted.length; i++) await W(100);
    await W(400);
    var p = inserted[0] || {};
    ok('Add and start in the cloud sends login, server, App trading and the host', p.login === 1520001234 && p.server === 'FTMO-Demo' && p.app_trading === true && p.host_id === 'uk1', p);
    var sent = JSON.stringify(p);
    ok('the password never leaves the page as text', sent.indexOf(DUMMY) < 0 && !('password' in p));
    ok('it goes sealed: 384 bytes of RSA-OAEP (3072-bit key), base64', typeof p.enc_password === 'string' && atob(p.enc_password).length === 384, p.enc_password && p.enc_password.length);
    var acc = (D.accounts || []).filter(function (a) { return D.mt5LoginMap['1520001234'] === a.id; })[0];
    ok('...an account is made for it, linked to the login, the form closed and emptied', !!acc && document.getElementById('sacc-add-wrap').hidden && !f('pw').value, acc && acc.name);
    // more than one server (24 Oct 2026): the one with the most room (st_cloud_pick_host), asked when the account is added;
    // one that filled meanwhile (cloud_full) -> asked again once; none with room -> "the cloud is full", nothing sent
    var realRpc = window.__stSB.rpc, pickQ = [], picks = 0;
    window.__stSB.rpc = function (fn) { if (fn !== 'st_cloud_pick_host') return realRpc.apply(window.__stSB, arguments); picks++; return Promise.resolve({ data: pickQ.length ? pickQ.shift() : [], error: null }); };
    var addOne = async function (lg) {
      document.getElementById('sacc-add-open').click(); await W(300);
      ac = document.getElementById('sacc-addcloud');
      f('login').value = lg; f('server').value = 'FTMO-Demo'; f('pw').value = DUMMY;
      var n0 = inserted.length; ac.querySelector('[data-sacc-ago]').click();
      for (i = 0; i < 40 && inserted.length === n0 && !errT(); i++) await W(100);
      await W(500); return inserted.slice(n0);
    };
    pickQ = [[{ id: 'uk2', region: 'test', public_key: PUB }]];
    var ins = await addOne('1520002222');
    ok('two servers: the account goes to the one st_cloud_pick_host names (uk2), sealed with its key', ins.length === 1 && ins[0].host_id === 'uk2' && atob(ins[0].enc_password).length === 384 && picks === 1, ins.map(function (x) { return x.host_id; }));
    pickQ = [[{ id: 'uk2', region: 'test', public_key: PUB }], [{ id: 'uk3', region: 'test', public_key: PUB }]]; failHost = 'uk2'; picks = 0;
    ins = await addOne('1520003333');
    ok('the server filled meanwhile (cloud_full): it asks again and the account goes to the next one (uk3)', ins.length === 2 && ins[0].host_id === 'uk2' && ins[1].host_id === 'uk3' && picks === 2 && !errT(), [ins.map(function (x) { return x.host_id; }), picks, errT()]);
    failHost = null; pickQ = [[]]; picks = 0;
    ins = await addOne('1520004444');
    ok('every server full: "The cloud is full right now", nothing sent', ins.length === 0 && /The cloud is full right now/.test(errT()), [ins.length, errT()]);
    window.__stSB.rpc = realRpc;
    try { document.getElementById('sacc-add-wrap').hidden = true; } catch (e) {}
    // statuses, in the accounts' lines
    var mk = function (nm, lg) { var a = window.__stCreateAccount(nm, 10000); D.mt5LoginMap[lg] = a.id; return a; };
    var b2 = mk('Cloud B', '1520009999'), b3 = mk('Cloud C', '1520005555');
    rows = [{ id: 'a1', login: 1520001234, server: 'FTMO-Demo', status: 'pending', app_trading: true, created_at: new Date().toISOString() },
            { id: 'a2', login: 1520009999, server: 'FTMO-Demo', status: 'running', status_at: new Date().toISOString(), status_msg: 'Signed in on FTMO-Demo', app_trading: false, created_at: new Date().toISOString() },
            { id: 'a3', login: 1520005555, server: 'FTMO-Server', status: 'error', status_msg: 'Invalid account: check the login, password and server, then remove and add the account again.', app_trading: true, created_at: new Date().toISOString() }];
    await W(3200); window.__stMt5c.clLoad(); await W(500); window.renderSettingsAccountsList(); await W(300);
    var line = function (a) { var it = document.querySelector('#settings-accounts-list .sacc-item[data-account-id="' + a.id + '"]'); return it ? it.querySelector('.sacc-chips').textContent : ''; };
    ok('each account\'s line says where it runs: waiting, signed in, problem', /Cloud · waiting/i.test(line(acc)) && /Cloud · signed in/i.test(line(b2)) && /Cloud · problem/i.test(line(b3)), [line(acc), line(b2), line(b3)]);
    window.__stAccOpenId = b3.id; window.renderSettingsAccountsList(); await W(300);
    var it3 = document.querySelector('.sacc-item[data-account-id="' + b3.id + '"]');
    ok('opened, a problem says MT5\'s reason', /Invalid account/.test(it3.querySelector('[data-slot="mt5"]').textContent));
    window.__stAccOpenId = b2.id; window.renderSettingsAccountsList(); await W(300);
    ok('trading from the app off is said in its MT5 part', /Trading from the app/.test(document.querySelector('.sacc-item.open [data-slot="mt5"]').textContent) && /Off/.test(document.querySelector('.sacc-item.open [data-slot="mt5"]').textContent));
    // the server reports every minute: a running account last heard from 10 minutes ago is not answering
    rows[1].status_at = new Date(Date.now() - 10 * 60000).toISOString();
    var w2 = window.__stLiveLine && window.__stLiveLine._where2 ? window.__stLiveLine._where2() : null;
    if (w2) w2['1520009999|EURUSD'] = { cloud: Date.now(), pc: Date.now() };
    await W(3200); window.__stMt5c.clLoad(); await W(500); window.renderSettingsAccountsList(); await W(300);
    ok('a running account the server stopped reporting: Cloud · not answering', /not answering/i.test(line(b2)), line(b2));
    ok('an account whose EA answers from the cloud and a PC: Running twice', !!w2 && /Running twice/i.test(line(b2)), line(b2));
    if (w2) w2['1520009999|EURUSD'] = { cloud: Date.now() };
    window.renderSettingsAccountsList(); await W(300);
    ok('...only the cloud answering: no warning', !/Running twice/i.test(line(b2)));
    window.__stAccOpenId = b3.id; window.renderSettingsAccountsList(); await W(300);
    var rm = function () { return document.querySelector('.sacc-item.open [data-sacc-clrm="a3"]'); };
    rm().click(); await W(200);
    ok('Remove from the cloud asks to be pressed again', /Press again to remove/.test(rm().textContent) && deleted.length === 0);
    rm().click(); await W(500);
    ok('...pressed again, it is removed from the cloud', deleted.length === 1 && deleted[0] === 'a3', deleted);
    // every signed-in member has it since 24 Oct 2026; signed out, nobody
    window.currentUser = { id: '00000000-0000-0000-0000-000000000002', email: 'someone@example.com' };
    window.renderSettingsAccountsList(); await W(300);
    ok('any signed-in member has it (the cloud form)', !!document.getElementById('sacc-addcloud'));
    window.currentUser = null; window.renderSettingsAccountsList(); await W(300);
    ok('signed out: no cloud form, no Move to the cloud', !document.getElementById('sacc-addcloud') && !document.querySelector('[data-sacc-clopen], [data-sacc-clrm]'));
    window.__stSB.from = realFrom;
    out.push({ name: 'sealed sample for the server-side check: ' + (p.enc_password || ''), ok: !!p.enc_password });
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
