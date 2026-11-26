(async function () {
  // The hawk learns from what he does anyway (Nestor, 26 Nov 2026: "would you suggest an easier way to train it that doesnt add too much
  // work for me?" - "yes do step 1"): the app hands hawk.js his Check my bias answers (opt.bias) and journal trades (opt.trades); the bias
  // buttons keep saying HTF / LTF, for him too ("dont change the HTF and LTF labels but the hawk remembers that the htf mean 4h and the ltf
  // means 15mins"). The two accessors are taken from app.html as written and run on the shapes his real journal holds (26 Nov 2026); then
  // hawk.js scores them against stand-in briefs and alerts; then the admin's sign-in leaves the labels alone. Nothing is sent anywhere: the
  // sign-in is a stand-in session on a made-up token.
  // Run: python tests/browser_test.py tests/hawkbias_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message) + ' @' + (e.filename || '') + ':' + e.lineno); });
  var host = null;
  try {
    for (var k = 0; k < 200 && !window.__stSB; k++) await W(100);
    try { localStorage.setItem('st_ui_lang', 'en'); } catch (e) {}
    // ---- the accessors, as app.html has them
    var src = await (await fetch('app.html?t=' + Date.now())).text();
    var a = src.indexOf('      bias: function(){'), b = src.indexOf('      today: function(){ return null; } });', a);
    ok('app.html hands the hawk his bias and his trades', a > 0 && b > a && src.slice(a, b).indexOf('trades: function(){') > 0, [a, b]);
    var body = src.slice(a, b).replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/,\s*$/, '');
    var canon = function (x) { var c = String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return c === 'GOLD' ? 'XAUUSD' : c; };
    var D = { biasHistory: [
      { dateKey: '2026-11-26', symbol: 'EUR/USD', sessionName: 'London', date: '2026-11-26T07:57:24.551Z', mode: 'Undecided', news: 'Bank Holiday', structure: 'Ranging', structureLtf: null, location: 'Premium Edge', locationLtf: null, direction: 'Unsure', directionLtf: null, notes: '', tvLinks: [] },
      { dateKey: '2026-11-24', symbol: 'EUR/USD', sessionName: 'London', date: '2026-11-24T07:48:26.999Z', structure: 'Initiating', location: 'Discount Edge', direction: 'Bearish', structureLtf: 'Trending', locationLtf: 'Premium Middle', directionLtf: 'Bearish' },
      { dateKey: '2026-11-20', symbol: 'Gold', sessionName: null, date: '2026-11-20T07:40:00.000Z', structure: 'Trending', location: '50%', direction: 'Bullish' },
      { dateKey: '2026-11-18', symbol: 'EUR/USD', sessionName: 'London', date: '2026-11-18T07:40:00.000Z', news: 'None', structure: null, location: null, direction: null } ] };
    var J = [
      { accountId: 'a1', date: '2026-11-24T12:00:00.000Z', entryTime: '08:02', side: 'Short', mt5Symbol: 'EURUSD', symbol: 'EUR/USD' },
      { accountId: 'a2', date: '2026-11-24T12:00:00.000Z', entryTime: '08:02', side: 'Short', mt5Symbol: 'EURUSD', symbol: 'EUR/USD' },   // the copy on his other account
      { accountId: 'a1', date: '2026-11-19T03:00:00.000Z', entryTime: '17:04', side: 'Long', mt5Symbol: 'EURUSD', symbol: 'EUR/USD' },
      { accountId: 'a1', date: '2026-11-13T12:00:00.000Z', entryTime: '14:21', type: 'sell', symbol: 'EUR/USD' },
      { accountId: 'a1', date: '2026-11-12T12:00:00.000Z', entryTime: '', side: 'Long', symbol: 'EUR/USD' },   // no time: left out
      { accountId: 'a1', date: '2026-11-11T12:00:00.000Z', entryTime: '09:00', side: '', symbol: 'EUR/USD' } ];   // no side: left out
    var acc = (new Function('data', 'getAllLifetimeTrades', 'canon', 'return {' + body + '};'))(D, function () { return J; }, canon);
    var bs = acc.bias(), ts = acc.trades();
    ok('his bias: the answered days only, London day, session, market, HTF and LTF reads', bs.length === 3 && bs[0].day === '2026-11-26' && bs[0].ses === 'London' && bs[0].sym === 'EURUSD' && bs[0].htf.s === 'Ranging' && bs[0].htf.l === 'Premium Edge' && bs[0].htf.d === 'Unsure' && bs[0].ltf.s === ''
      && bs[1].ltf.s === 'Trending' && bs[1].ltf.l === 'Premium Middle' && bs[2].ses === '' && bs[2].sym === 'XAUUSD', bs);
    ok('his trades: London day and minute, side, market - the copy on his other account once, no time or no side left out', ts.length === 3 && JSON.stringify(ts[0]) === JSON.stringify({ day: '2026-11-24', min: 482, side: -1, sym: 'EURUSD' })
      && ts[1].day === '2026-11-19' && ts[1].min === 1024 && ts[1].side === 1 && ts[2].side === -1 && ts[2].min === 861, ts);
    // ---- hawk.js scores them: today's brief (4H range at the premium middle) and 24 Nov's, an alert on the 13th
    if (!(window.STHawk && window.STHawk.mount)) { var sc = document.createElement('script'); sc.src = 'hawk.js?t=' + Date.now(); document.head.appendChild(sc); for (k = 0; k < 100 && !(window.STHawk && window.STHawk.mount); k++) await W(100); }
    var L = function (day, m) { var t = Date.parse(day + 'T00:00:00Z') + m * 60000; return new Date(t).toISOString(); };   // November: London is UTC
    var BR = [
      { id: 'b26', created_at: L('2026-11-26', 465), kind: 'brief', side: null, mine: null, data: { sym: 'EURUSD', win: [480, 600], tfs: { '4h': { d: 0, loc: 'premium middle', said: 'range' }, '1h': { d: 0, loc: 'premium middle', said: 'range' }, '15m': { d: 1, loc: 'breakout', said: 'initiation up' } } } },
      { id: 'b24', created_at: L('2026-11-24', 465), kind: 'brief', side: null, mine: null, data: { sym: 'EURUSD', win: [480, 600], tfs: { '4h': { d: -1, loc: 'discount edge', said: 'initiation down' }, '1h': { d: 0, loc: '50%', said: 'range' }, '15m': { d: -1, loc: 'discount middle', said: 'trend down' } } } },
      { id: 'b13', created_at: L('2026-11-13', 795), kind: 'brief', side: null, mine: null, data: { sym: 'EURUSD', win: [810, 930], tfs: { '4h': { d: 0, loc: '50%', said: 'range' } } } },
      { id: 's13', created_at: L('2026-11-13', 855), kind: 'setup', side: -1, mine: null, data: { sym: 'EURUSD', win: [810, 930] } } ];
    var fake = function () { var Q = function (t) { var q = { t: t, f: {}, nn: [], cols: '' }, me = function () { return q; };
        ['gt', 'lt', 'gte', 'lte', 'order', 'limit', 'range', 'ilike', 'update', 'maybeSingle', 'single'].forEach(function (x) { q[x] = me; });
        q.select = function (c) { q.cols = c || ''; return q; }; q.eq = function (x, v) { q.f[x] = v; return q; }; q.not = function (x) { q.nn.push(x); return q; }; q.in = function (x, v) { q.inn = [x, v]; return q; };
        q.then = function (y, n) { return Promise.resolve().then(function () {
          if (t !== 'hawk_signals' || !/data->/.test(q.cols)) return { data: t === 'hawk_config' ? null : [], error: null };
          var cl = q.cols.split(',').map(function (c) { return c.trim(); });
          return { data: BR.filter(function (r) { return (!q.f.kind || r.kind === q.f.kind) && (!q.inn || q.inn[1].indexOf(r[q.inn[0]]) >= 0) && q.nn.every(function (x) { return r[x] != null; }); })
            .sort(function (p, s) { return p.created_at < s.created_at ? 1 : -1; })
            .map(function (r) { var o = {}; cl.forEach(function (c) { var m = /^(\w+):data->>?(\w+)$/.exec(c); o[m ? m[1] : c] = m ? (r.data[m[2]] === undefined ? null : r.data[m[2]]) : (r[c] === undefined ? null : r[c]); }); return o; }), error: null }; }).then(y, n); }; return q; };
      return { auth: { getSession: function () { return Promise.resolve({ data: { session: { user: { id: 'admin' } } } }); } }, rpc: function () { return Promise.resolve({ data: true, error: null }); }, from: function (t) { return Q(t); } }; };
    host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:380px;height:900px;overflow-y:auto;z-index:99999;background:#111;color:#ddd'; var bx = document.createElement('div'); host.appendChild(bx); document.body.appendChild(host);
    try { window.STHawk.mount.admin = undefined; } catch (e) {}
    var api = window.STHawk.mount(bx, fake(), { app: true, narrow: true, canon: canon, bias: acc.bias, trades: acc.trades });
    var ps = null; for (k = 0; k < 60 && !(ps = host.querySelector('[data-hkp]')); k++) await W(100);
    for (k = 0; k < 60 && !host.querySelector('.hk-agree:not([hidden]) .hk-agc'); k++) await W(100);
    var tx = function (e) { return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
    var cell = function (tf) { var c = [].slice.call(host.querySelectorAll('.hk-agc')).filter(function (e) { return tx(e.querySelector('.k')) === tf; })[0]; return c ? tx(c) : null; };
    ok('today\'s London: his 4H "Ranging, Premium Edge, Unsure" against its range at the premium middle - the phase agrees, the location not (24 Nov agrees on both)', /^4H ?1\/2/.test(cell('4H')) && /Phase 2\/2/.test(cell('4H')) && /Location 1\/2/.test(cell('4H')), cell('4H'));
    ok('...24 Nov: his 4H "Initiating, Bearish" agrees on the phase with its initiation down; his LTF counts on its 15M; the bias on a day it sent nothing left out', /^15M ?0\/1/.test(cell('15M')) && /Phase 1\/1/.test(cell('15M')) && /2 bias checks/.test(tx(host.querySelector('.hk-agh'))), [cell('15M'), tx(host.querySelector('.hk-agh'))]);
    var agt = host.querySelector('.hk-agt'), mis = [].slice.call(host.querySelectorAll('.hk-mis .hk-disr'));
    ok('his trades in its hours: 24 Nov 08:02 sell and 13 Nov 14:21 sell (the 17:04 buy on a day it sent nothing is left out) - the setup at 14:15 flagged one', agt && tx(agt.querySelector('b')) === '1/2', agt && tx(agt));
    ok('...24 Nov\'s it said nothing about, its row opening that session', mis.length === 1 && mis[0].dataset.dis === 'b|b24|15m' && /It said nothing/.test(tx(mis[0])) && /08:02/.test(tx(mis[0])), mis.map(tx));
    host.remove(); host = null;
    // ---- the buttons: HTF / LTF for everyone, the admin too (the hawk keeps HTF = its 4H, LTF = its 15M to itself)
    var btn = function (w) { return [].slice.call(document.querySelectorAll('.tf-btn[data-tf="' + w + '"]')); };
    ok('a member sees HTF / LTF', btn('htf').length >= 3 && btn('htf').every(function (e) { return e.textContent === 'HTF'; }) && btn('ltf').every(function (e) { return e.textContent === 'LTF'; }), btn('htf').map(function (e) { return e.textContent; }));
    if (!window.__stHawk) {
      var SB = window.__stSB, SESSION = { access_token: 'test', token_type: 'bearer', user: { id: 'ccaf6a5e-69ed-443c-8d92-bc7fdd464f49', email: 'be.o2@hotmail.com', user_metadata: { full_name: 'Nestor' }, app_metadata: {} } };
      SB.auth.getSession = function () { return Promise.resolve({ data: { session: SESSION }, error: null }); };
      SB.auth.getUser = function () { return Promise.resolve({ data: { user: SESSION.user }, error: null }); };
      try { await SB.auth._notifyAllSubscribers('SIGNED_IN', SESSION); } catch (e) {}
      for (k = 0; k < 100 && !window.__stHawk; k++) await W(100);
    }
    ok('the admin (the hawk loaded): the buttons still say HTF / LTF', !!window.__stHawk && btn('htf').length >= 3 && btn('htf').every(function (e) { return e.textContent === 'HTF'; }) && btn('ltf').every(function (e) { return e.textContent === 'LTF'; }),
      [!!window.__stHawk, btn('htf').map(function (e) { return e.textContent; }), btn('ltf').map(function (e) { return e.textContent; })]);
    ok('no page errors from the hawk', !errs.filter(function (e) { return /hawk/i.test(e); }).length, errs.slice(0, 5));
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  if (host) host.remove();
  return out;
})()
