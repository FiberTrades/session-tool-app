(async function () {
  // The hawk's session review and agreement score (Nestor, 24 Nov 2026: "after the session i get the full load down of pre session what
  // the hawk thinks can happen, in session opportunities and then after session, so i can give feed back all at once"). hawk.js mounted on
  // its own in the app's page, with stand-in hawk tables (every write recorded here, nothing sent anywhere) and stand-in candles on a known
  // path: a London window three days ago (brief 07:45 at 1.09050, up to 1.09122 at 08:29, down to the range low 1.08800 at 09:29, then
  // flat), its three alerts, its done row; a window five days ago he reviewed already; a window on now (still separate cards).
  // Run: python tests/browser_test.py tests/hawksession_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message) + ' @' + (e.filename || '') + ':' + e.lineno); });
  var hosts = [];
  try {
    try { localStorage.removeItem('st_hawk_sesd'); localStorage.removeItem('st_hawk_chh'); localStorage.setItem('st_ui_lang', 'en'); } catch (e) {}
    if (!(window.STHawk && window.STHawk.mount)) { var sc = document.createElement('script'); sc.src = 'hawk.js?t=' + Date.now(); document.head.appendChild(sc); for (var k = 0; k < 100 && !(window.STHawk && window.STHawk.mount); k++) await W(100); }
    var r5 = function (v) { return Math.round(v * 1e5) / 1e5; };
    var ldnDay = function (t) { return new Date(t * 1000).toLocaleDateString('en-CA', { timeZone: 'Europe/London' }); };
    var ldnMin = function (t) { var s = new Date(t * 1000).toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); return +s.slice(0, 2) * 60 + +s.slice(3, 5); };
    var ldnAt = function (day, m) { var t = Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) / 1000 + m * 60, off = ((ldnMin(t) - m) % 1440 + 2160) % 1440 - 720; return t - off * 60; };
    var iso = function (t) { return new Date(t * 1000).toISOString(); };
    var NOW = Math.floor(Date.now() / 1000), dA = ldnDay(NOW - 3 * 86400), dC = ldnDay(NOW - 5 * 86400);
    var w0 = ldnAt(dA, 480), w1 = ldnAt(dA, 600), t0 = w0 - 900;
    // the path, minute by minute after the brief
    var P = function (t) { var m = (t - t0) / 60;
      if (m < 0) return 1.0905 + 0.0004 * Math.sin(m / 50);
      if (m <= 45) return 1.0905 + 0.0007 * m / 45;
      if (m <= 75) return 1.0912 - 0.0022 * (m - 45) / 30;
      if (m <= 105) return 1.0890 - 0.0010 * (m - 75) / 30;
      return 1.0880 + 0.0005 * (1 - Math.cos((m - 105) / 20)) / 2; };
    var bar = function (t, sec) { var o = P(t), c = P(t + sec); return { time: t, open: r5(o), high: r5(Math.max(o, c) + 0.00002), low: r5(Math.min(o, c) - 0.00002), close: r5(c) }; };
    var BARS = []; var bars = async function (sym, tf, from, to) { BARS.push([sym, tf]); var s = tf * 60, a = []; for (var t = Math.ceil(from / s) * s; t < to && a.length < 3000; t += s) a.push(bar(t, s)); return a; };
    var c5 = function (from, to) { var a = []; for (var t = Math.ceil(from / 300) * 300; t < to; t += 300) { var b = bar(t, 300); a.push([t, b.open, b.high, b.low, b.close]); } return a; };
    var chart = function (now, px) { return { tf: 5, c: c5(t0 - 86400, now), phase: 'range', bh: 1.094, bl: 1.088, r0: t0 - 86400, r1: t0 - 3600, a2b: null, sw: [], w0: w0, w1: w1, now: now, px: px }; };
    var TFS = { '4h': { d: -1, loc: 'discount edge', said: 'trend down' }, '1h': { d: 0, loc: 'premium middle', said: 'range' }, '15m': { d: -1, loc: 'breakout', said: 'initiation down' } };
    var BRIEF = 'Watching 08:00–10:00 London. Bigger picture: 4H trend down. Sells only. Range day. Range 1.08800–1.09400: premium above 1.09250, discount below 1.08950, 50% at 1.09100. Price 1.09050, between the 50% and the edges. Sell idea: a high taken in the premium, then the move slows. Timeframes: 4H trend down, discount edge · 1H range, premium middle · 15M initiation down, breakout.';
    var base = { dp: 5, sym: 'EURUSD', login: '1515070952', win: [480, 600] };
    var A = { id: 'a-brief', created_at: iso(t0), kind: 'brief', side: null, title: 'London brief · EUR/USD', body: BRIEF, feedback: null, note: null, mine: null,
      data: Object.assign({ bh: 1.094, bl: 1.088, a2b: null, htf: -1, tfs: TFS, tfx: null, phase: 'range', price: 1.0905, chart: chart(t0, 1.0905) }, base) };
    var S1 = { id: 'a-sweep', created_at: iso(t0 + 46 * 60), kind: 'sweep', side: -1, title: 'Watch · sell idea', feedback: null, note: null, mine: null,
      body: 'High taken in the premium at 1.09122 (08:29). If it slows here: sell, stop 1.09127. If it moves away fast: wait for the pullback to the 50% of that move.',
      data: Object.assign({ A: 1.09122, side: -1, ta: t0 + 44 * 60, ti: t0 + 44 * 60, loc: 'premium', rule: 'range', kind: 'sweep', chart: chart(t0 + 46 * 60, r5(P(t0 + 46 * 60))) }, base) };
    var S2 = { id: 'a-setup', created_at: iso(t0 + 55 * 60), kind: 'setup', side: -1, title: 'Setup · reaction sell', feedback: null, note: null, mine: null,
      body: 'Sell now ~1.09047 · stop 1.09077 (3.0 pips) · target 1.08900 (14.7 pips, 4.9R). High taken in the premium, the move has slowed.',
      data: Object.assign({ entry: 1.09047, stop: 1.09077, tgt: 1.089, model: 'reaction', loc: 'premium', phase: 'range', chart: chart(t0 + 55 * 60, 1.09047) }, base) };
    var S3 = { id: 'a-init', created_at: iso(t0 + 85 * 60), kind: 'initiation', side: -1, title: 'Initiation · down', feedback: null, note: null, mine: null,
      body: 'Strong 15-minute close below the range (1.08890). Don\'t buy against it. Sell-low pocket: sell 1.08950, stop 1.08980, target 1.08700 (8.3R).',
      data: Object.assign({ edge: 1.0889, entry: 1.0895, stop: 1.0898, tgt: 1.087, side: -1, kind: 'initiation', chart: chart(t0 + 85 * 60, r5(P(t0 + 85 * 60))) }, base) };
    var DN = { id: 'a-done', created_at: iso(w1 + 300), kind: 'done', side: null, title: 'Session over · 4 alerts', body: 'Tap to rate them: good call, not my trade, too early or too late.', feedback: null, note: null, mine: null, data: Object.assign({}, base) };
    // five days ago: reviewed already - his 4H read differs, the 1H and the 15M he went through and kept
    var cw0 = ldnAt(dC, 480), cw1 = ldnAt(dC, 600), cat = iso(cw1 + 3600);
    var C = { id: 'c-brief', created_at: iso(cw0 - 900), kind: 'brief', side: null, title: 'London brief · EUR/USD', body: BRIEF, feedback: null, note: null,
      mine: { tf: { '4h': { said: 'range', hk: { said: 'trend down', loc: 'discount edge' }, seen: true, at: cat }, '1h': { hk: { said: 'range', loc: 'premium middle' }, seen: true, at: cat }, '15m': { hk: { said: 'initiation down', loc: 'breakout' }, seen: true, at: cat } }, rev: { at: cat, note: 'Late, but the side was right' } },
      data: Object.assign({ bh: 1.094, bl: 1.088, a2b: null, htf: -1, tfs: TFS, tfx: null, phase: 'range', price: 1.0905, chart: Object.assign(chart(t0, 1.0905), { w0: cw0, w1: cw1, now: cw0 - 900 }) }, base) };
    var CD = { id: 'c-done', created_at: iso(cw1 + 300), kind: 'done', side: null, title: 'Session over · 1 alert', body: 'Tap to rate them: good call, not my trade, too early or too late.', feedback: null, note: null, mine: null, data: Object.assign({}, base) };
    // a window on now: its brief and an alert stay cards of their own until it ends
    var bm = ldnMin(NOW - 300), bwin = [bm, bm + 120];
    var B = { id: 'b-brief', created_at: iso(NOW - 1200), kind: 'brief', side: null, title: 'New York brief · EUR/USD', body: BRIEF, feedback: null, note: null, mine: null,
      data: Object.assign({ bh: 1.094, bl: 1.088, a2b: null, htf: -1, tfs: TFS, tfx: null, phase: 'range', price: 1.0905, chart: Object.assign(chart(t0, 1.0905), { w0: NOW - 300, w1: NOW + 6900, now: NOW - 1200 }) }, base, { win: bwin }) };
    var BS = { id: 'b-sweep', created_at: iso(NOW - 120), kind: 'sweep', side: -1, title: 'Watch · sell idea', body: S1.body, feedback: null, note: null, mine: null, data: Object.assign({}, S1.data, { win: bwin }) };
    var ROWS = [A, S1, S2, S3, DN, C, CD, B, BS];
    var STUDY = [{"a":1.12342,"n":1,"r":9.524,"at":"08:28","be":1.12254,"bh":1.12354,"bl":1.11864,"dp":5,"lq":1.1232,"nu":"pips","r0":1792389600,"r1":1792476000,"sw":1792480920,"ta":1792481160,"ts":1792481280,"day":"2026-10-20","htf":-1,"leg":null,"loc":"premium","lqt":1792477800,"net":9.238,"out":"win","pip":0.0001,"sym":"EURUSD","tfs":{"1h":{"d":0,"loc":"premium middle","said":"range"},"4h":{"d":0,"loc":"premium edge","said":"range"},"15m":{"d":1,"loc":"premium middle","said":"trend up"}},"tfx":null,"tgt":1.12126,"xpx":1.12126,"xts":1792487040,"note":"HTF read before the session: the hour chart says range.","risk":2.1,"rule":"range","side":-1,"stop":1.12347,"entry":1.12326,"model":"reaction","nunit":0.0001,"phase":"range","rules":"phases+4h"},
      {"a":1.11985,"n":2,"r":0.0,"at":"08:03","be":1.11935,"bh":1.11882,"bl":1.11492,"dp":5,"lq":1.11963,"nu":"pips","r0":1793393640,"r1":1793602800,"sw":1793606280,"ta":1793606460,"ts":1793606580,"day":"2026-11-02","htf":-1,"leg":null,"loc":"premium","lqt":1793605140,"net":-0.3,"out":"be","pip":0.0001,"sym":"EURUSD","tfs":{"1h":{"d":0,"loc":"premium middle","said":"range"},"4h":{"d":0,"loc":"premium middle","said":"range"},"15m":{"d":1,"loc":"breakout","said":"initiation up"}},"tfx":null,"tgt":1.1177,"xpx":1.1197,"xts":1793606880,"note":"HTF read before the session: the hour chart says range.","risk":2.0,"rule":"range","side":-1,"stop":1.1199,"entry":1.1197,"model":"reaction","nunit":0.0001,"phase":"range","rules":"phases+4h"}]
      .map(function (d) { return { run: 'strict_20', n: d.n, day: d.day, data: d, verdict: null, note: null, drawings: null, drawings_at: null, be_mine: null, tf_mine: null }; });
    STUDY[0].tf_mine = { '1h': { note: 'the hour range is right', hk: { said: 'range', loc: 'premium middle' }, at: iso(NOW - 6 * 86400) } };
    STUDY[1].tf_mine = { '15m': { said: 'range', hk: { said: 'initiation up', loc: 'breakout' }, at: iso(NOW - 4 * 86400) } };
    var CFG = { id: 1, login: '1515070952', sym: 'EURUSD', wins: [[480, 600], [810, 930]], updated_at: iso(NOW - 86400), quiet: false };
    // the stand-in database: reads answer from the rows above, writes are recorded (and applied, so a reload sees them)
    var SAVES = [], STUDYQ = [];
    var fake = function (cfg) { var Q = function (t) { var q = { t: t, op: 'select', f: {}, nn: [], cols: '' }, me = function () { return q; };
        ['gt', 'lt', 'gte', 'lte', 'order', 'limit', 'range', 'in', 'ilike'].forEach(function (k) { q[k] = me; });
        q.select = function (c) { if (q.op === 'select') q.cols = c || ''; return q; }; q.eq = function (k, v) { q.f[k] = v; return q; }; q.not = function (k) { q.nn.push(k); return q; };
        q.update = function (p) { q.op = 'update'; q.p = JSON.parse(JSON.stringify(p)); return q; }; q.maybeSingle = q.single = function () { q.one = true; return q; };
        q.then = function (a, b) { return Promise.resolve().then(function () { return answer(q); }).then(a, b); }; return q; };
      var answer = function (q) {
        if (q.op === 'update') { SAVES.push({ t: q.t, p: q.p, f: q.f });
          if (q.t === 'hawk_signals') ROWS.forEach(function (r) { if (r.id === q.f.id) Object.assign(r, JSON.parse(JSON.stringify(q.p))); });
          if (q.t === 'hawk_config') Object.assign(cfg, q.p);
          return { data: null, error: null }; }
        if (q.t === 'hawk_config') return { data: JSON.parse(JSON.stringify(cfg)), error: null };
        if (q.t === 'hawk_signals') { var rs = ROWS.slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
          if (q.f.kind === 'brief' && q.nn.indexOf('mine') >= 0) return { data: rs.filter(function (r) { return r.kind === 'brief' && r.mine; }).map(function (r) { return { id: r.id, created_at: r.created_at, title: r.title, mine: JSON.parse(JSON.stringify(r.mine)), tfs: r.data.tfs, sym: r.data.sym, win: r.data.win }; }), error: null };
          return { data: JSON.parse(JSON.stringify(rs)), error: null }; }
        if (q.t === 'hawk_study') { STUDYQ.push(q.cols);
          if (q.nn.indexOf('tf_mine') >= 0) return { data: STUDY.filter(function (r) { return r.tf_mine; }).map(function (r) { return { run: r.run, n: r.n, day: r.day, tf_mine: r.tf_mine, tfs: r.data.tfs }; }), error: null };
          if (q.f.n === 1 && !q.f.run) return { data: [{ run: 'strict_20' }], error: null };
          return { data: JSON.parse(JSON.stringify(STUDY)), error: null }; }
        return { data: [], error: null }; };
      return { auth: { getSession: function () { return Promise.resolve({ data: { session: { user: { id: 'admin' } } } }); } }, rpc: function () { return Promise.resolve({ data: true, error: null }); }, from: function (t) { return Q(t); } }; };
    var STUDYC = [], study = async function (o) { STUDYC.push(JSON.parse(JSON.stringify(o, function (k, v) { return k === 'onMine' ? undefined : v; }))); return o && o.get != null ? null : true; };
    var mk = function (o, cfg) { var h = document.createElement('div'); h.className = 'pl-hk'; h.style.cssText = 'position:fixed;left:0;top:0;width:380px;height:900px;overflow-y:auto;z-index:99999;background:#111;color:#ddd;--hk-ink:#ddd;--hk-mut:#8a8f98;--hk-line:#2a2e39;--hk-soft:#1e222d;--hk-card:#171a22;--hk-plot:#0e1016;--hk-acc:#5b8def;--hk-buy:#26a69a;--hk-sell:#ef5350;--hk-warn:#e0a84a;--hk-you:#f472b6;--hk-cup:#ddd;--hk-cdn:#777';
      var b = document.createElement('div'); h.appendChild(b); document.body.appendChild(h); hosts.push(h); try { window.STHawk.mount.admin = undefined; } catch (e) {}
      return { host: h, api: window.STHawk.mount(b, fake(cfg), o) }; };
    var M = mk({ app: true, narrow: true, study: study, bars: bars }, CFG), root = M.host;
    var Q = function (s) { return root.querySelector(s); }, QA = function (s) { return [].slice.call(root.querySelectorAll(s)); }, tx = function (e) { if (!e) return null; var w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT), p = [], n; while ((n = w.nextNode())) { var v = n.nodeValue.replace(/\s+/g, ' ').trim(); if (v) p.push(v); } return p.join(' '); };
    // 7 days, so all three windows are in
    for (k = 0; k < 60 && !Q('[data-hkp]'); k++) await W(100);
    var ps = Q('[data-hkp]'); ps.value = '7'; ps.dispatchEvent(new Event('change', { bubbles: true }));
    for (k = 0; k < 80 && !(Q('.hk-ses') && Q('.hk-agree:not([hidden]) .hk-agc')); k++) await W(100);
    await W(600);
    var sk = dA + '|480-600|EURUSD', card = function () { return Q('.hk-ses[data-sk="' + sk + '"]'); }, cC = Q('.hk-ses[data-sk="' + dC + '|480-600|EURUSD"]');
    ok('an ended window is ONE session card: its brief, alerts and done row are not cards of their own', card() && !Q('article#hk-a-a-brief') && !Q('article#hk-a-a-sweep') && !Q('article#hk-a-a-done') && QA('.hk-ses').length === 2, [!!card(), QA('.hk-ses').length, QA('article.hk-card').map(function (e) { return e.id; })]);
    ok('...a window still on keeps its own cards (brief and alert), no review yet', Q('article#hk-a-b-brief') && Q('article#hk-a-b-sweep') && !Q('.hk-ses[data-sk^="' + ldnDay(NOW - 1200) + '|' + bwin[0] + '"]'), QA('article.hk-card').map(function (e) { return e.id; }));
    ok('the unreviewed session is marked "To review", the one he saved "Reviewed" with the time', card() && card().classList.contains('todo') && /To review/.test(tx(card().querySelector('.hk-top'))) && cC && cC.classList.contains('done') && /Reviewed \d\d:\d\d/.test(tx(cC.querySelector('.hk-top'))), [tx(card() && card().querySelector('.hk-top')), tx(cC && cC.querySelector('.hk-top'))]);
    ok('the card heads with the window and market, and what is in it', /London 08–10 · EUR\/USD/.test(tx(card().querySelector('h3'))) && tx(card().querySelector('.hk-sesl')) === 'Brief 07:45 · 3 alerts · 0 of 3 rated', [tx(card().querySelector('h3')), tx(card().querySelector('.hk-sesl'))]);
    var secs = [].slice.call(card().querySelectorAll('.hk-sec')).map(function (e) { return tx(e.querySelector('.hk-sech')); });
    ok('three parts: Before (the brief), During (each alert), After', secs.length === 3 && /^1 Before The brief · 07:45/.test(secs[0]) && /^2 During 3 alerts/.test(secs[1]) && /^3 After/.test(secs[2]), secs);
    ok('Before: the brief\'s words without the timeframes line, its 4H / 1H / 15M tiles open his charts', /Sell idea: a high taken in the premium/.test(tx(card().querySelector('.hk-sbody'))) && !/Timeframes:/.test(tx(card().querySelector('.hk-sbody'))) && card().querySelectorAll('button[data-rvtf]').length === 3, [tx(card().querySelector('.hk-sbody')), card().querySelectorAll('button[data-rvtf]').length]);
    var sel = function (c, k2, tf) { return c.querySelector('select[data-sesr="' + k2 + '"][data-tf="' + tf + '"]'); };
    ok('...his read per timeframe, the hawk\'s to start with (no pink), six phases and six places', sel(card(), 'said', '4h').value === 'trend down' && sel(card(), 'loc', '4h').value === 'discount edge' && sel(card(), 'said', '1h').value === 'range' && sel(card(), 'said', '15m').value === 'initiation down' && !card().querySelector('.hk-yr select.you') && sel(card(), 'said', '1h').options.length === 6 && sel(card(), 'loc', '1h').options.length === 6,
      ['4h', '1h', '15m'].map(function (tf) { return sel(card(), 'said', tf).value + '/' + sel(card(), 'loc', tf).value; }));
    ok('...the session he saved shows his own 4H read in pink', cC && sel(cC, 'said', '4h').value === 'range' && sel(cC, 'said', '4h').classList.contains('you') && !sel(cC, 'said', '1h').classList.contains('you'), cC && sel(cC, 'said', '4h').value);
    var items = QA('.hk-ses[data-sk="' + sk + '"] .hk-si');
    ok('During: the three alerts numbered in order, each with its time, kind, side, why and four ratings', items.length === 3 && items.map(function (e) { return tx(e.querySelector('.hk-sin')) + ' ' + tx(e.querySelector('.hk-st')); }).join(',') === '1 08:31,2 08:40,3 09:10' && items.every(function (e) { return e.querySelectorAll('[data-sesf]').length === 4 && e.querySelector('.hk-sib').textContent.length > 20; }),
      items.map(function (e) { return tx(e.querySelector('.hk-sih')); }));
    // after: the candles from the store (1-minute)
    for (k = 0; k < 50 && !/Target/.test(tx(card().querySelector('[data-then="a-setup"]')) || ''); k++) await W(100);
    var th = function (id) { return tx(card().querySelector('[data-then="' + id + '"]')); };
    ok('Then, the watch idea: how far it went its way, its stop never hit by the time exit', th('a-sweep') === 'Then 31.5 pips its way (09:29), stop never hit by 13:20', th('a-sweep'));
    ok('Then, the setup: target hit, in R', th('a-setup') === 'Then Target 08:59 · +4.9R', th('a-setup'));
    ok('Then, the initiation\'s pocket: never filled, how far short', th('a-init') === 'Then Never filled: 8.1 pips short of 1.08950 by 13:20.', th('a-init'));
    var kp = [].slice.call(card().querySelectorAll('.hk-mv > div')).map(tx), lv = [].slice.call(card().querySelectorAll('.hk-aft dt')).map(function (d) { return tx(d) + ' ' + tx(d.nextElementSibling) + ' ' + tx(d.nextElementSibling.nextElementSibling); });
    ok('After: the biggest move each way from the brief\'s price, and the sells-only side played out', kp.join(' | ') === '+7.2 pips Up · 08:29 | −25.2 pips Down · 09:29 | Played out Sells only', kp);
    ok('...which of the brief\'s levels were taken, highest first', lv.join(' | ') === 'Range high 1.09400 27.8 pips short | Sell zone 1.09250 12.8 pips short | 50% 1.09100 Taken 08:16 | Range low 1.08800 Taken 09:29', lv);
    ok('...measured from the brief to the 13:20 time exit, on 1-minute candles from the store', tx(card().querySelector('.hk-saftw')) === '07:45 → 13:20' && /1-minute candles/.test(tx(card().querySelector('.hk-saft .hk-hint'))) && BARS.some(function (b) { return b[1] === 1; }), [tx(card().querySelector('.hk-saftw')), BARS.slice(0, 4)]);
    ok('the session chart: drawn with the three alerts numbered on it', !!Q('.hk-ses[data-sk="' + sk + '"] .hk-sesc canvas') && Q('.hk-ses[data-sk="' + sk + '"] .hk-sesc canvas').width > 100, null);
    // his own view of the session chart (24 Nov 2026, Nestor: "could i please be able to control de time and price scales on this chart?")
    var zb = Q('.hk-ses[data-sk="' + sk + '"] .hk-sesc'), zc = zb.querySelector('canvas'), zr0 = zb.querySelector('.hk-zr'), zimg0 = zc.toDataURL(), zR = zb.getBoundingClientRect(), ZW = zb.clientWidth, ZH = zb.clientHeight;
    var PE = function (ty, x, y) { zc.dispatchEvent(new PointerEvent(ty, { clientX: zR.left + x, clientY: zR.top + y, pointerId: 7, button: 0, buttons: ty === 'pointerup' ? 0 : 1, pointerType: 'mouse', bubbles: true, cancelable: true })); };
    var drag = function (x0, y0, x1, y1) { PE('pointerdown', x0, y0); PE('pointermove', (x0 + x1) / 2, (y0 + y1) / 2); PE('pointermove', x1, y1); PE('pointerup', x1, y1); };
    var dbl = function (x, y) { zc.dispatchEvent(new MouseEvent('dblclick', { clientX: zR.left + x, clientY: zR.top + y, bubbles: true })); };
    ok('the session chart: taller than an alert chart to start (300 px in a side panel, 380 in a page), a Reset view chip hidden, how to zoom said in its legend', Math.abs(zb.offsetHeight - (zb.closest('.hk-nar') ? 300 : 380)) <= 2 && zr0 && zr0.hidden && /drag the price or time scale to stretch · Ctrl \+ scroll to zoom · double-click to reset/.test(tx(zb.parentNode.querySelector('.hk-lgh'))), [zb.offsetHeight, zr0 && zr0.hidden, tx(zb.parentNode.querySelector('.hk-lgh'))]);
    drag(ZW / 2, ZH - 8, ZW / 2 + 140, ZH - 8); var zimg1 = zc.toDataURL();
    ok('dragging the time scale to the right zooms in: redrawn, Reset view shown', zimg1 !== zimg0 && !zr0.hidden, null);
    drag(ZW - 30, ZH / 2, ZW - 30, ZH / 2 + 90); var zimg2 = zc.toDataURL();
    ok('dragging the price scale down squeezes the price: redrawn again', zimg2 !== zimg1, null);
    drag(ZW / 3, ZH / 2, ZW / 3 + 60, ZH / 2); var zimg3 = zc.toDataURL();
    ok('dragging the chart moves it', zimg3 !== zimg2, null);
    dbl(ZW - 30, ZH / 2);
    ok('double-click on the price scale: only the price back to the hawk\'s, the time zoom kept', zc.toDataURL() !== zimg3 && zc.toDataURL() !== zimg0 && !zr0.hidden, null);
    dbl(ZW / 2, ZH / 2);
    ok('double-click on the chart: the hawk\'s own view, exactly as it was, Reset view hidden', zc.toDataURL() === zimg0 && zr0.hidden, null);
    // 26 Nov 2026 (Nestor: "something is very wrong with the price scale from the hawk it waont stop scrolling")
    var wv = new WheelEvent('wheel', { clientX: zR.left + ZW - 30, clientY: zR.top + ZH / 2, deltaY: 300, bubbles: true, cancelable: true }); zc.dispatchEvent(wv);
    ok('the plain wheel over the price scale scrolls the page, the chart as it was', !wv.defaultPrevented && zc.toDataURL() === zimg0, null);
    PE('pointerdown', ZW / 2, ZH / 2); PE('pointerup', ZW / 2, ZH / 2);
    var wv1 = new WheelEvent('wheel', { clientX: zR.left + ZW - 30, clientY: zR.top + ZH / 2, deltaY: 300, bubbles: true, cancelable: true }); zc.dispatchEvent(wv1);
    ok('...after a click on the chart too (it zoomed the price while he scrolled the page)', !wv1.defaultPrevented && zc.toDataURL() === zimg0, null);
    var wv2 = new WheelEvent('wheel', { clientX: zR.left + ZW / 2, clientY: zR.top + ZH / 2, deltaY: -300, ctrlKey: true, bubbles: true, cancelable: true }); zc.dispatchEvent(wv2);
    ok('Ctrl + the wheel zooms it', wv2.defaultPrevented && zc.toDataURL() !== zimg0 && !zr0.hidden, null);
    zb.dispatchEvent(new MouseEvent('dblclick', { clientX: zR.left + ZW / 2, clientY: zR.top + ZH / 2, bubbles: true }));
    ok('a double-click whose target is the chart box (a real mouse: the press captured to the box) resets it', zc.toDataURL() === zimg0 && zr0.hidden, null);
    PE('pointerdown', ZW - 30, ZH / 2); PE('pointermove', ZW - 30, ZH / 2 + 40); var zst = zc.toDataURL();
    zc.dispatchEvent(new PointerEvent('pointermove', { clientX: zR.left + ZW - 30, clientY: zR.top + ZH / 2 + 120, pointerId: 7, buttons: 0, pointerType: 'mouse', bubbles: true }));
    zc.dispatchEvent(new PointerEvent('pointermove', { clientX: zR.left + ZW - 60, clientY: zR.top + ZH / 2 - 100, pointerId: 7, buttons: 0, pointerType: 'mouse', bubbles: true }));
    zb.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 7 }));
    ok('a price-scale drag whose let-go never came ends once the mouse moves with the button up: the price stays where it was', zc.toDataURL() === zst, null);
    zb.dispatchEvent(new MouseEvent('dblclick', { clientX: zR.left + ZW / 2, clientY: zR.top + ZH / 2, bubbles: true }));
    drag(ZW / 2, ZH - 8, ZW / 2 + 140, ZH - 8);
    zr0.click();
    ok('Reset view: the hawk\'s own view again', zc.toDataURL() === zimg0 && zr0.hidden, null);
    var rz = zb.nextElementSibling, zh0 = zb.offsetHeight, rR = rz.getBoundingClientRect(), RP = function (ty, dy) { rz.dispatchEvent(new PointerEvent(ty, { clientX: rR.left + 20, clientY: rR.top + 5 + dy, pointerId: 8, button: 0, buttons: ty === 'pointerup' ? 0 : 1, pointerType: 'mouse', bubbles: true, cancelable: true })); };
    RP('pointerdown', 0); RP('pointermove', 50); RP('pointermove', 100); RP('pointerup', 100);
    var chh = {}; try { chh = JSON.parse(localStorage.getItem('st_hawk_chh') || '{}'); } catch (e) {}
    ok('the bar under it: dragged down 100 px, the chart 100 px taller, redrawn to fit, kept for the next session charts', rz.classList.contains('hk-rsz') && Math.abs(zb.offsetHeight - zh0 - 100) <= 1 && (chh.s || chh.ns) === parseInt(zb.style.height, 10) && Math.abs(zc.height / (window.devicePixelRatio || 1) - zb.clientHeight) <= 1, [zh0, zb.offsetHeight, chh, zc.height]);
    try { localStorage.removeItem('st_hawk_chh'); } catch (e) {} zb.style.height = '';
    // the agreement score before he saves: his reviewed window (4H changed, 1H and 15M kept) and two study trades (1H kept, 15M changed)
    var ag = function () { return [].slice.call(root.querySelectorAll('.hk-agree .hk-agc')).map(function (e) { return e.querySelector('.k').textContent.trim() + ' ' + e.querySelector('.v').textContent.replace(/ +/g, '').trim(); }).join(' · '); };
    ok('Agrees with you: 4H 0/1 · 1H 2/2 · 15M 1/2, over 1 session and 2 study trades', ag() === '4H 0/1 · 1H 2/2 · 15M 1/2' && /1 session · 2 study trades/.test(tx(Q('.hk-agh'))), [ag(), tx(Q('.hk-agh'))]);
    ok('...its latest disagreements listed, each opening in his charts', QA('.hk-disr').length === 2 && QA('.hk-disr').map(function (e) { return e.dataset.dis; }).join(',') === 's|strict_20|2|15m,b|c-brief|4h' && /Hawk: Initiation up · Breakout → You: Range/.test(tx(QA('.hk-disr')[0])), QA('.hk-disr').map(tx));
    // one feedback pass: three ratings, a 1H read changed, a note - nothing written until Save
    var rate = function (id, f) { card().querySelector('[data-sesf="' + f + '"][data-id="' + id + '"]').click(); };
    rate('a-sweep', 'good'); rate('a-setup', 'good'); rate('a-init', 'early');
    var s1h = sel(card(), 'said', '1h'); s1h.value = 'trend down'; s1h.dispatchEvent(new Event('change', { bubbles: true }));
    var ta = card().querySelector('textarea[data-sesnote]'); ta.value = 'Good London: the sell side was right, the pocket was too far'; ta.dispatchEvent(new Event('input', { bubbles: true }));
    var kept = null; try { kept = JSON.parse(localStorage.getItem('st_hawk_sesd') || 'null'); } catch (e) {}
    ok('picks are drafts: pressed at once, the 1H pink, kept on this device, nothing saved yet', card().querySelector('[data-sesf="early"][data-id="a-init"]').getAttribute('aria-pressed') === 'true' && s1h.classList.contains('you') && kept && kept[sk] && kept[sk].f['a-init'] === 'early' && kept[sk].tf['1h'].said === 'trend down' && /sell side/.test(kept[sk].note) && !SAVES.length && tx(card().querySelector('.hk-sesl')) === 'Brief 07:45 · 3 alerts · 3 of 3 rated',
      [SAVES.length, kept && kept[sk], tx(card().querySelector('.hk-sesl'))]);
    card().querySelector('[data-sessave]').click();
    for (k = 0; k < 50 && !(card() && card().classList.contains('done')); k++) await W(100);
    var fb = SAVES.filter(function (x) { return x.t === 'hawk_signals' && 'feedback' in x.p; }), mn = SAVES.filter(function (x) { return x.t === 'hawk_signals' && x.p.mine; }), mine = mn.length && mn[mn.length - 1].p.mine;
    ok('Save: one rating each on the three alerts (hawk_signals.feedback + feedback_at)', fb.length === 3 && fb.map(function (x) { return x.f.id + '=' + x.p.feedback; }).join(',') === 'a-sweep=good,a-setup=good,a-init=early' && fb.every(function (x) { return x.p.feedback_at; }), fb);
    ok('...his reads in the brief\'s mine.tf: the 1H changed, the 4H and 15M kept - all three marked seen', mn.length === 1 && mn[0].f.id === 'a-brief' && mine.tf['1h'].said === 'trend down' && !('said' in mine.tf['4h']) && !('loc' in mine.tf['4h']) && mine.tf['4h'].seen && mine.tf['1h'].seen && mine.tf['15m'].seen && mine.tf['1h'].hk.said === 'range', mine);
    ok('...the note and the time in the brief\'s mine.rev', mine && mine.rev && /sell side was right/.test(mine.rev.note) && Date.parse(mine.rev.at) > Date.now() - 60000, mine && mine.rev);
    ok('...the card turns Reviewed, its button "Saved HH:MM", the draft gone from the device', card().classList.contains('done') && /Reviewed \d\d:\d\d/.test(tx(card().querySelector('.hk-top'))) && card().querySelector('[data-sessave]').disabled && /Saved \d\d:\d\d/.test(tx(card().querySelector('[data-sessave]'))) && !((JSON.parse(localStorage.getItem('st_hawk_sesd') || '{}'))[sk]),
      [card().className, tx(card().querySelector('[data-sessave]'))]);
    for (k = 0; k < 40 && ag() !== '4H 1/2 · 1H 2/3 · 15M 2/3'; k++) await W(100);
    ok('the score follows: 4H 1/2 · 1H 2/3 · 15M 2/3, his new 1H disagreement first', ag() === '4H 1/2 · 1H 2/3 · 15M 2/3' && QA('.hk-disr')[0] && QA('.hk-disr')[0].dataset.dis === 'b|a-brief|1h' && /Hawk: Range · Premium middle → You: Trend down/.test(tx(QA('.hk-disr')[0])), [ag(), QA('.hk-disr').map(tx)]);
    // changing a rating again: Save changes
    rate('a-init', 'late');
    ok('a change after saving: the button asks to save the changes', /Save changes/.test(tx(card().querySelector('[data-sessave]'))) && !card().querySelector('[data-sessave]').disabled, tx(card().querySelector('[data-sessave]')));
    rate('a-init', 'late'); rate('a-init', 'early');
    // a disagreement opens in his charts on that timeframe
    STUDYC.length = 0; QA('.hk-disr')[0].click();
    for (k = 0; k < 60 && !STUDYC.some(function (c) { return c.tf === 60; }); k++) await W(100);
    var op = STUDYC.filter(function (c) { return c.tf === 60; })[0];
    ok('a brief\'s disagreement opens Study on its 1H at the brief\'s moment', op && op.n === 'hb|a-brief|1h' && op.at === t0 && op.sym === 'EURUSD', STUDYC.slice(0, 3));
    // the toggle: alerts during the session, on by default, saved with his hawk settings
    var tg = Q('input[data-hkquiet]');
    ok('"Alerts during the session" is on, saved with his hawk settings', tg && tg.checked && !tg.disabled && /Alerts during the session/.test(tx(tg.closest('label'))), tg && tx(tg.closest('label')));
    tg.click(); await W(400);
    var cs = SAVES.filter(function (x) { return x.t === 'hawk_config'; });
    ok('...off writes hawk_config.quiet = true (account, market and hours unchanged)', cs.length === 1 && cs[0].p.quiet === true && cs[0].p.login === '1515070952' && cs[0].p.sym === 'EURUSD' && cs[0].p.wins.length === 2, cs);
    // a study disagreement: Study, its trade open, that timeframe in his charts
    STUDYC.length = 0; var sd = QA('.hk-disr').filter(function (e) { return e.dataset.dis === 's|strict_20|2|15m'; })[0]; if (sd) sd.click();
    for (k = 0; k < 60 && !STUDYC.some(function (c) { return c.tf === 15; }); k++) await W(100);
    var so = STUDYC.filter(function (c) { return c.tf === 15; })[0];
    ok('a study trade\'s disagreement: Study tab, the trade open, its 15M in his charts', so && so.n === 'hs|strict_20|2|15m' && Q('.hk-tabs button[data-p="s"]').getAttribute('aria-pressed') === 'true' && Q('.hk-agree').hidden, [so, Q('.hk-tabs button[data-p="s"]').getAttribute('aria-pressed')]);
    // hawk.html: no candle store, no Study - the review still there, after measured on the alerts' own candles
    var CFG2 = { id: 1, login: '1515070952', sym: 'EURUSD', wins: [[480, 600]], updated_at: iso(NOW) };
    var M2 = mk({}, CFG2), r2 = M2.host;
    for (k = 0; k < 80 && !r2.querySelector('.hk-ses[data-sk="' + sk + '"] .hk-aft'); k++) await W(100);
    var c2 = r2.querySelector('.hk-ses[data-sk="' + sk + '"]');
    ok('hawk.html: the same session card, its tiles not buttons, After from the alerts\' own 5-minute candles so far', c2 && !c2.querySelector('button[data-rvtf]') && /alerts' own 5-minute candles/.test(tx(c2.querySelector('.hk-saft .hk-hint'))) && / so far$/.test(tx(c2.querySelector('.hk-saftw'))), c2 && [tx(c2.querySelector('.hk-saftw')), tx(c2.querySelector('.hk-saft .hk-hint'))]);
    var tg2 = r2.querySelector('input[data-hkquiet]');
    ok('...before the database update the toggle waits, saying so', tg2 && tg2.disabled && tg2.checked && /next hawk update/.test(tx(tg2.closest('label').nextElementSibling)), tg2 && tx(tg2.closest('label').nextElementSibling));
    // moved into another window's document, as the app moves the rail into Live Charts' own window (26 Nov 2026, Nestor: "also whats all
    // these?" - the hawk unstyled there): its styles follow it within a second
    var ifr = document.createElement('iframe'); ifr.style.cssText = 'position:fixed;left:0;top:0;width:420px;height:600px;border:0;z-index:9';   /* fixed: the page under it keeps its layout */ document.body.appendChild(ifr);
    var idoc = ifr.contentDocument; idoc.open(); idoc.write('<!doctype html><html><head></head><body></body></html>'); idoc.close();
    idoc.body.appendChild(idoc.adoptNode(r2));
    for (k = 0; k < 30 && !idoc.getElementById('hk-css'); k++) await W(100);
    var ib = r2.querySelector('.hk-btn');
    ok('moved into another window (Live Charts\' own): its styles go with it within a second', !!idoc.getElementById('hk-css') && !!ib && idoc.defaultView.getComputedStyle(ib).borderRadius === '8px', [!!idoc.getElementById('hk-css'), ib && idoc.defaultView.getComputedStyle(ib).borderRadius]);
    ifr.remove();
    ok('no page errors', !errs.length, errs);
  } catch (e) { ok('no exception', false, String(e && e.stack || e).slice(0, 800)); }
  hosts.forEach(function (h) { h.remove(); });
  try { localStorage.removeItem('st_hawk_sesd'); } catch (e) {}
  return JSON.stringify(out);
})()
