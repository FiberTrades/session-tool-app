/* The hawk's feed (6 Nov 2026) - admin only. One component for the Charts tab (app.html mounts it for the admin's account alone) and
   for hawk.html (where the phone push opens). Nestor: "when the hawk gives me the load down before the session can it display it also
   in a chart so i have visuals of the hawks understanding plus the explanation so i can slowly train it to think like me".
   Each alert carries what the hawk looked at (data.chart, from cloud/hawk/hawk.py): ~a day of 5-minute candles, the range it measured,
   premium / discount / 50%, the hour swings behind the phase, the leg, and any entry / stop / target. The chart draws that reading;
   "Correct the read" / "Mark my trade" lets him drag the lines to where HE would draw them and pick the phase - saved in
   hawk_signals.mine, next to the hawk's own reading, which is what the rules get tuned against. Rows are readable by st_is_admin() only.
   Colours come from --hk-* tokens set by the host page. */
(function () {
  if (window.STHawk) return;
  var CSS = [
    '.hk{font-family:var(--hk-font,inherit);color:var(--hk-ink)}',
    '.hk-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}',
    '.hk-eye{font:500 9px var(--hk-mono);letter-spacing:.2em;text-transform:uppercase;color:var(--hk-mut);display:flex;align-items:center;gap:8px}',
    '.hk-eye i{font-style:normal;color:var(--hk-acc);border:1px solid var(--hk-line);border-radius:999px;padding:1px 7px;letter-spacing:.14em}',
    '.hk-title{font-size:28px;font-weight:600;letter-spacing:-.01em;margin:6px 0 2px}',
    '.hk-app .hk-title{display:none}',
    '.hk-sub{color:var(--hk-mut);font-size:13px;margin:4px 0 0}',
    '.hk-tabs{display:flex;gap:6px}',
    '.hk-tabs button{font:500 12px var(--hk-font,inherit);color:var(--hk-mut);background:transparent;border:1px solid var(--hk-line);border-radius:999px;padding:5px 12px;cursor:pointer}',
    '.hk-tabs button[aria-pressed="true"]{color:var(--hk-ink);border-color:var(--hk-ink)}',
    '.hk-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0 4px}',
    '.hk-stat{background:var(--hk-card);border:1px solid var(--hk-line);border-radius:10px;padding:10px 12px}',
    '.hk-stat b{display:block;font:500 19px var(--hk-mono);font-variant-numeric:tabular-nums}',
    '.hk-stat span{font-size:12px;color:var(--hk-mut)}',
    '@media (max-width:520px){.hk-stats{grid-template-columns:repeat(2,1fr)}}',
    '.hk-day{font:500 11px var(--hk-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--hk-mut);margin:22px 0 4px}',
    '.hk-card{background:var(--hk-card);border:1px solid var(--hk-line);border-radius:12px;padding:14px 16px;margin-top:10px;scroll-margin-top:20px}',
    '.hk-card.hk-focus{box-shadow:0 0 0 2px var(--hk-acc)}',
    '.hk-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.hk-chip{font:500 10px var(--hk-mono);letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:2px 8px;background:var(--hk-soft);color:var(--hk-mut)}',
    '.hk-chip.buy{color:var(--hk-buy);background:color-mix(in srgb,var(--hk-buy) 14%,transparent)}',
    '.hk-chip.sell{color:var(--hk-sell);background:color-mix(in srgb,var(--hk-sell) 14%,transparent)}',
    '.hk-chip.setup{color:var(--hk-acc);background:color-mix(in srgb,var(--hk-acc) 15%,transparent)}',
    '.hk-time{margin-left:auto;font:12px var(--hk-mono);color:var(--hk-mut)}',
    '.hk-card h3{font-size:16px;font-weight:600;margin:8px 0 2px;color:var(--hk-ink)}',
    '.hk-card p{margin:0;line-height:1.5;color:var(--hk-ink)}',
    '.hk-chart{position:relative;height:300px;margin:14px 0 0;border-radius:8px;background:var(--hk-plot);border:1px solid var(--hk-line);overflow:hidden;touch-action:pan-y}',
    '.hk-card.hk-brief .hk-chart{height:340px}',
    '@media (max-width:560px){.hk-chart,.hk-card.hk-brief .hk-chart{height:250px}}',
    '.hk-chart canvas{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.hk-chart.hk-editing{touch-action:none;cursor:ns-resize;box-shadow:0 0 0 1px var(--hk-you)}',
    '.hk-legend{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:8px;font-size:12px;color:var(--hk-mut)}',
    '.hk-legend span{display:inline-flex;align-items:center;gap:6px}',
    '.hk-legend s{display:inline-block;width:14px;height:8px;border-radius:2px;text-decoration:none}',
    '.hk-train{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}',
    '.hk-btn{font:500 13px var(--hk-font,inherit);background:var(--hk-soft);color:var(--hk-ink);border:1px solid transparent;border-radius:8px;padding:6px 11px;cursor:pointer}',
    '.hk-btn:hover{border-color:var(--hk-line)}',
    '.hk-btn.you{color:var(--hk-you);background:color-mix(in srgb,var(--hk-you) 13%,transparent)}',
    '.hk-btn.go{color:var(--hk-card);background:var(--hk-you)}',
    '.hk-mine{font-size:13px;color:var(--hk-you)}',
    '.hk-edit{display:flex;flex-direction:column;gap:8px;margin-top:10px;padding:10px 12px;border-radius:10px;background:color-mix(in srgb,var(--hk-you) 7%,transparent);border:1px solid color-mix(in srgb,var(--hk-you) 35%,transparent)}',
    '.hk-edit[hidden]{display:none}',
    '.hk-edit p{font-size:13px;color:var(--hk-mut)}',
    '.hk-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}',
    '.hk-ph[aria-pressed="true"]{color:var(--hk-you);border-color:var(--hk-you);background:color-mix(in srgb,var(--hk-you) 13%,transparent)}',
    '.hk-rate{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}',
    '.hk-rate .hk-btn[aria-pressed="true"].good{background:color-mix(in srgb,var(--hk-buy) 18%,transparent);border-color:var(--hk-buy);color:var(--hk-buy)}',
    '.hk-rate .hk-btn[aria-pressed="true"].bad{background:color-mix(in srgb,var(--hk-sell) 16%,transparent);border-color:var(--hk-sell);color:var(--hk-sell)}',
    '.hk-rate .hk-btn[aria-pressed="true"].early,.hk-rate .hk-btn[aria-pressed="true"].late{background:color-mix(in srgb,var(--hk-warn) 16%,transparent);border-color:var(--hk-warn);color:var(--hk-warn)}',
    '.hk textarea{width:100%;margin-top:8px;font:14px var(--hk-font,inherit);color:var(--hk-ink);background:var(--hk-plot);border:1px solid var(--hk-line);border-radius:8px;padding:8px 10px;resize:vertical;min-height:38px}',
    '.hk-saved{font-size:12px;color:var(--hk-mut);margin-top:4px;min-height:18px}',
    '.hk button:focus-visible,.hk textarea:focus-visible{outline:2px solid var(--hk-acc);outline-offset:2px}',
    '.hk-empty{color:var(--hk-mut);margin-top:22px}',
    /* narrow: the Live Charts rail panel */
    '.hk-nar{font-size:13px}.hk-nar .hk-sub{display:none}.hk-nar .hk-head{align-items:center}.hk-nar .hk-tabs button{padding:3px 9px;font-size:11px}',
    '.hk-nar .hk-stats{grid-template-columns:repeat(4,1fr);gap:4px;margin:10px 0 0}.hk-nar .hk-stat{padding:6px 8px;border-radius:6px}.hk-nar .hk-stat b{font-size:14px}.hk-nar .hk-stat span{font-size:10px}',
    '.hk-nar .hk-day{margin:14px 0 2px}.hk-nar .hk-card{padding:10px 11px;border-radius:8px;margin-top:8px}.hk-nar .hk-card h3{font-size:13.5px;margin:6px 0 2px}.hk-nar .hk-card p{font-size:12.5px}',
    '.hk-nar .hk-chart,.hk-nar .hk-card.hk-brief .hk-chart{height:220px;margin-top:10px}.hk-nar .hk-legend{font-size:11px;gap:2px 10px}.hk-nar .hk-btn{font-size:12px;padding:5px 8px}.hk-nar textarea{font-size:12.5px}'
  ].join('\n');
  var RATE = [['good', 'Good call'], ['bad', 'Not my trade'], ['early', 'Too early'], ['late', 'Too late']];
  var KIND = { brief: 'Brief', sweep: 'Watch', pocket: 'Watch', initiation: 'Initiation', setup: 'Setup', done: 'Done' };
  var PHASES = [['range', 'Range'], ['trend up', 'Trend up'], ['trend down', 'Trend down']];
  var LDN = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ldn(iso, o) { return new Date(iso).toLocaleString('en-GB', Object.assign({ timeZone: 'Europe/London' }, o)); }
  function p5(v) { return (+v).toFixed(5); }
  function r5(v) { return Math.round(v * 1e5) / 1e5; }
  function css(doc) { if (doc.getElementById('hk-css')) return; var s = doc.createElement('style'); s.id = 'hk-css'; s.textContent = CSS; doc.head.appendChild(s); }   // in the document it shows in (Live Charts' own window too)

  // ---------- the chart: what the hawk saw, and what it made of it
  function agg(src, sec) {
    var out = [];
    src.forEach(function (b) { var k = Math.floor(b[0] / sec) * sec, l = out[out.length - 1];
      if (l && l[0] === k) { l[2] = Math.max(l[2], b[2]); l[3] = Math.min(l[3], b[3]); l[4] = b[4]; } else out.push([k, b[1], b[2], b[3], b[4]]); });
    return out;
  }
  function editKeys(r) { return r.kind === 'brief' ? ['bh', 'bl'] : r.data && r.data.entry != null && r.data.stop != null && r.data.tgt != null ? ['entry', 'stop', 'tgt'] : []; }
  var NAMES = { bh: 'Your high', bl: 'Your low', entry: 'Your entry', stop: 'Your stop', tgt: 'Your target' };

  function draw(st) {
    var box = st.box, cv = st.cv, W = box.clientWidth, H = box.clientHeight;
    if (!W || !H) return;
    var dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var cs = getComputedStyle(box), K = {};
    ['ink', 'mut', 'line', 'soft', 'acc', 'buy', 'sell', 'warn', 'you', 'cup', 'cdn', 'card', 'plot'].forEach(function (n) { K[n] = cs.getPropertyValue('--hk-' + n).trim() || '#888'; });
    var MONO = cs.getPropertyValue('--hk-mono').trim() || 'monospace';
    var r = st.row, a = r.data || {}, d = a.chart;
    var RG = W < 480 ? 60 : 70, TOP = 10, BOT = 20, PW = W - RG, PH = H - TOP - BOT;
    // fewer, wider candles when the chart is narrow
    // the brief shows the whole day it measured; an alert zooms in on the session, so a 3-pip stop can be seen
    var tf = d.tf * 60, src = d.c;
    if (r.kind !== 'brief') { var t0 = Math.max(d.r0, d.w0 - 3 * 3600); src = d.c.filter(function (b) { return b[0] >= t0; }); if (src.length < 36) src = d.c.slice(-36); }
    var bars = src;
    if (PW / (src.length * 1.16) < 2.8) { if (!st.c15) st.c15 = agg(src, 900); bars = st.c15; tf = 900; }
    var n = bars.length; if (!n) return;
    var fut = Math.max(8, Math.round(n * 0.16)), bw = PW / (n + fut);
    function xt(t) {   // a time on the bar scale (gaps closed up)
      if (t <= bars[0][0]) return 0;
      var lo = 0, hi = n - 1; while (lo < hi) { var m = (lo + hi + 1) >> 1; if (bars[m][0] <= t) lo = m; else hi = m - 1; }
      return Math.min(PW, (lo + Math.min(t - bars[lo][0], lo === n - 1 ? 1e9 : tf) / tf) * bw);
    }
    var mine = st.edit || r.mine || null, keys = editKeys(r);
    var lv = [];
    bars.forEach(function (b) { lv.push(b[2], b[3]); });
    var bh0 = Math.max.apply(null, lv), bl0 = Math.min.apply(null, lv), near = (bh0 - bl0) * 0.6;
    [d.bh, d.bl].forEach(function (v) { if (r.kind === 'brief' || (v < bh0 + near && v > bl0 - near)) lv.push(v); });
    ['entry', 'stop', 'tgt', 'A'].forEach(function (k) { if (a[k] != null) lv.push(+a[k]); });
    if (mine) keys.forEach(function (k) { if (mine[k] != null) lv.push(+mine[k]); });
    var hi = Math.max.apply(null, lv), lo = Math.min.apply(null, lv), pad = (hi - lo) * 0.06 || 0.0005;
    hi += pad; lo -= pad;
    if (st.frozen) { hi = st.frozen[0]; lo = st.frozen[1]; } else st.scale = [hi, lo];
    st.y = function (p) { return TOP + (hi - p) / (hi - lo) * PH; };
    st.p = function (y) { return hi - (y - TOP) / PH * (hi - lo); };
    var Y = st.y;
    st.PW = PW;
    function line(y, col, w, dash, x0, x1) { g.save(); g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); g.moveTo(x0 || 0, Math.round(y) + .5); g.lineTo(x1 == null ? PW : x1, Math.round(y) + .5); g.stroke(); g.restore(); }
    function tint(col, al) { g.globalAlpha = al; g.fillStyle = col; }
    function txt(s, x, y, col, al, size, w) { g.font = (w || 500) + ' ' + (size || 9) + 'px ' + MONO; g.fillStyle = col; g.textAlign = al || 'left'; g.textBaseline = 'middle'; g.fillText(s, x, y); }
    var pills = [];
    function pill(p, text, bg, fg) { pills.push({ y: Y(p), t: text, bg: bg, fg: fg || K.card }); }
    function tag(p, s, col, x) { txt(s, x == null ? PW - 6 : x, Y(p) - 7, col, 'right', 9); }

    g.save(); g.beginPath(); g.rect(0, 0, PW, H); g.clip();   // nothing spills into the price column
    // London hours along the bottom, faint grid
    if (!st.hm || st.hmFor !== bars) { st.hmFor = bars; st.hm = bars.map(function (b) { return LDN.format(new Date(b[0] * 1000)); }); }
    var step = [1, 2, 3, 4, 6].find(function (s) { return 3600 * s / tf * bw >= 58; }) || 6;
    for (var i = 0; i < n; i++) { var hm = st.hm[i];
      if (hm.slice(3) === '00' && (+hm.slice(0, 2)) % step === 0) { var x = i * bw;
        g.fillStyle = K.line; g.fillRect(Math.round(x), TOP, 1, PH); txt(hm, x, H - 9, K.mut, 'center', 9); } }
    // the London window, 08:00-10:00
    var w0 = xt(d.w0), w1 = d.w1 > bars[n - 1][0] + tf ? PW : xt(d.w1);
    if (w1 > w0) { tint(K.soft, 0.9); g.fillRect(w0, TOP, w1 - w0, PH); g.globalAlpha = 1; if (w1 - w0 > 84) txt('LONDON 08–10', w0 + 6, TOP + PH - 8, K.mut, 'left', 9); }
    // the range it measured: premium (top 25%), discount (bottom 25%), the 50%
    var xr = xt(d.r0), q = (d.bh - d.bl) / 4, mid = (d.bh + d.bl) / 2, ranged = d.phase === 'range';
    tint(K.sell, ranged ? 0.13 : 0.07); g.fillRect(xr, Y(d.bh), PW - xr, Y(d.bh - q) - Y(d.bh));
    tint(K.buy, ranged ? 0.13 : 0.07); g.fillRect(xr, Y(d.bl + q), PW - xr, Y(d.bl) - Y(d.bl + q)); g.globalAlpha = 1;
    line(Y(d.bh), K.mut, 1, null, xr); line(Y(d.bl), K.mut, 1, null, xr); line(Y(mid), K.mut, 1, [4, 4], xr);
    // zone names go where the candles aren't: over the window band at the right, else at the left
    var zx = w1 > w0 && w1 - w0 > 70 ? w0 + 6 : xr + 6;
    if (Y(d.bh - q) - Y(d.bh) > 14) txt('PREMIUM', zx, Y(d.bh - q) - 8, K.sell, 'left', 9, 600);
    if (Y(d.bl) - Y(d.bl + q) > 14) txt('DISCOUNT', zx, Y(d.bl + q) + 9, K.buy, 'left', 9, 600);
    tag(d.bh, 'Range high', K.mut); tag(d.bl, 'Range low', K.mut); tag(mid, '50%', K.mut);
    pill(d.bh, p5(d.bh), K.mut); pill(d.bl, p5(d.bl), K.mut);
    if (d.a2b) { var m2 = (d.a2b[0] + d.a2b[1]) / 2; line(Y(m2), K.acc, 1.2, [6, 4]); tag(m2, 'Leg 50%', K.acc); pill(m2, p5(m2), K.acc); }
    // candles
    var cw = Math.max(1, Math.min(9, bw * 0.62));
    bars.forEach(function (b, i) { var x = (i + 0.5) * bw, up = b[4] >= b[1]; g.fillStyle = up ? K.cup : K.cdn;
      g.fillRect(Math.round(x - 0.5), Y(b[2]), 1, Math.max(1, Y(b[3]) - Y(b[2])));
      var y0 = Y(Math.max(b[1], b[4])), y1 = Y(Math.min(b[1], b[4])); g.fillRect(Math.round(x - cw / 2), y0, Math.max(1, Math.round(cw)), Math.max(1, y1 - y0)); });
    // the hour swings behind the phase: higher highs / lows
    var lastH = null, lastL = null;
    (d.sw || []).forEach(function (s) { var x = xt(s[0] + 1800), isH = s[2] === 'H', prev = isH ? lastH : lastL;
      var lab = prev == null ? s[2] : isH ? (s[1] > prev ? 'HH' : 'LH') : (s[1] > prev ? 'HL' : 'LL');
      if (isH) lastH = s[1]; else lastL = s[1];
      if (x <= 0) return;
      g.fillStyle = K.ink; g.beginPath(); g.arc(x, Y(s[1]) + (isH ? -4 : 4), 2, 0, 7); g.fill();
      txt(lab, x, Y(s[1]) + (isH ? -13 : 13), K.ink, 'center', 9, 600); });
    // what the alert is about
    if (r.kind === 'sweep' && a.A != null) { var xs = xt(a.ta || d.now);
      line(Y(a.A), K.warn, 1, [2, 3], xs); g.strokeStyle = K.warn; g.lineWidth = 1.5; g.beginPath(); g.arc(xs, Y(a.A), 5, 0, 7); g.stroke();
      tag(a.A, r.side === 1 ? 'Low taken' : 'High taken', K.warn); pill(a.A, p5(a.A), K.warn); }
    if (r.kind === 'initiation' && a.edge != null) { line(Y(a.edge), K.warn, 1, [2, 3]); tag(a.edge, 'Closed beyond', K.warn); }
    if (a.A != null && a.B != null && a.ta && a.tb && r.kind !== 'sweep') {
      g.strokeStyle = K.acc; g.lineWidth = 1.6; g.beginPath(); g.moveTo(xt(a.ta), Y(a.A)); g.lineTo(xt(a.tb), Y(a.B)); g.stroke();
      txt('A', xt(a.ta) - 8, Y(a.A), K.acc, 'center', 10, 600); txt('B', xt(a.tb) + 8, Y(a.B), K.acc, 'center', 10, 600); }
    if (a.entry != null && a.stop != null && a.tgt != null) { var x0 = Math.min(PW - 24, xt(d.now));
      tint(K.buy, 0.16); g.fillRect(x0, Math.min(Y(a.entry), Y(a.tgt)), PW - x0, Math.abs(Y(a.tgt) - Y(a.entry)));
      tint(K.sell, 0.18); g.fillRect(x0, Math.min(Y(a.entry), Y(a.stop)), PW - x0, Math.max(1, Math.abs(Y(a.stop) - Y(a.entry)))); g.globalAlpha = 1;
      line(Y(a.entry), K.ink, 1.2, null, x0); line(Y(a.tgt), K.buy, 1.2, null, x0); line(Y(a.stop), K.sell, 1.2, null, x0);
      tag(a.entry, 'Entry', K.ink); tag(a.tgt, 'Target', K.buy); tag(a.stop, 'Stop', K.sell);
      pill(a.entry, p5(a.entry), K.ink); pill(a.tgt, p5(a.tgt), K.buy); pill(a.stop, p5(a.stop), K.sell); }
    // price when it spoke
    var lb = bars[n - 1], xn = (n - 0.5) * bw;
    line(Y(d.px), K.acc, 1, [1, 3], xn); g.fillStyle = K.acc; g.beginPath(); g.arc(xn, Y(d.px), 3, 0, 7); g.fill(); pill(d.px, p5(d.px), K.acc);
    // his read
    if (mine) keys.forEach(function (k) { if (mine[k] == null) return; var v = +mine[k], same = Math.abs(v - (k === 'bh' || k === 'bl' ? d[k] : a[k])) < 2e-6;
      if (same && !st.edit) return;   // he kept the hawk's level
      line(Y(v), K.you, st.edit ? 2 : 1.5, st.edit ? null : [7, 4]); tag(v, NAMES[k], K.you, PW - 6);
      if (st.edit) { g.fillStyle = K.you; g.beginPath(); g.arc(PW - 14, Y(v), st.drag === k ? 7 : 5.5, 0, 7); g.fill(); }
      pill(v, p5(v), K.you); });
    // hover
    if (st.hover && !st.edit) { var hx = st.hover.x, hy = st.hover.y;
      if (hx < PW && hy > TOP && hy < TOP + PH) {
        g.fillStyle = K.mut; g.globalAlpha = .5; g.fillRect(Math.round(hx), TOP, 1, PH); g.fillRect(0, Math.round(hy), PW, 1); g.globalAlpha = 1;
        pill(st.p(hy), p5(st.p(hy)), K.ink);
        var bi = Math.floor(hx / bw); if (bi >= 0 && bi < n) { var tl = st.hm[bi]; g.font = '500 9px ' + MONO; var tw = g.measureText(tl).width + 10;
          g.fillStyle = K.ink; g.fillRect(hx - tw / 2, H - BOT + 3, tw, 14); txt(tl, hx, H - BOT + 10, K.card, 'center', 9); } } }
    g.restore();
    // price labels in the gutter, kept apart (only those in view)
    pills = pills.filter(function (p) { return p.y > TOP - 4 && p.y < TOP + PH + 4; });
    pills.sort(function (p, q2) { return p.y - q2.y; });
    for (var k = 1; k < pills.length; k++) if (pills[k].y - pills[k - 1].y < 15) pills[k].y = pills[k - 1].y + 15;
    var over = pills.length ? pills[pills.length - 1].y - (H - BOT - 8) : 0;
    if (over > 0) for (k = pills.length - 1; k >= 0; k--) { pills[k].y -= over; if (k && pills[k].y - pills[k - 1].y >= 15) break; }
    g.fillStyle = K.plot; g.fillRect(PW, 0, RG, H); g.fillStyle = K.line; g.fillRect(PW, 0, 1, H);
    pills.forEach(function (p) { g.fillStyle = p.bg; g.beginPath();
      if (g.roundRect) g.roundRect(PW + 4, p.y - 7, RG - 8, 14, 3); else g.rect(PW + 4, p.y - 7, RG - 8, 14); g.fill();
      txt(p.t, PW + RG / 2, p.y + .5, p.fg, 'center', 10, 500); });
  }

  // ---------- the feed
  function mount(host, sb, opt) {
    opt = opt || {}; var doc = host.ownerDocument || document; css(doc);
    var focusId = opt.focusId || null, period = focusId ? 7 : 1, rows = [], charts = {}, pollT = null;
    host.innerHTML = '<div class="hk' + (opt.app ? ' hk-app' : '') + (opt.narrow ? ' hk-nar' : '') + '"><div class="hk-head"><div>' +
      '<div class="hk-eye">Hawk <i>Admin only</i></div><div class="hk-title">Hawk</div>' +
      '<p class="hk-sub">Its read of EUR/USD before and during London 08:00–10:00. Rate each alert, or draw your own read on the chart.</p></div>' +
      '<div class="hk-tabs" role="group" aria-label="Period"><button data-p="1">Today</button><button data-p="7">7 days</button><button data-p="90">All</button></div></div>' +
      '<div class="hk-stats" hidden></div><div class="hk-list"><p class="hk-empty">Loading…</p></div></div>';
    var root = host.firstChild, list = root.querySelector('.hk-list'), statsEl = root.querySelector('.hk-stats');
    function tabs() { root.querySelectorAll('.hk-tabs button').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.p === period); }); }
    tabs();
    function redraw() { Object.keys(charts).forEach(function (id) { draw(charts[id]); }); }   // a hidden chart has no size and draws nothing
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { redraw(); }) : null;
    if (ro) ro.observe(list);
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw); } catch (e) {}
    function byEl(sel) { return root.querySelector(sel); }

    function stats() {
      var al = rows.filter(function (r) { return r.kind !== 'done' && r.kind !== 'brief'; }), rated = al.filter(function (r) { return r.feedback; });
      var good = rated.filter(function (r) { return r.feedback === 'good'; }).length, drawn = rows.filter(function (r) { return r.mine; }).length;
      statsEl.innerHTML = [[al.length, 'alerts'], [rated.length, 'rated'], [rated.length ? Math.round(100 * good / rated.length) + '%' : '–', 'good calls'], [drawn, 'your reads']]
        .map(function (s) { return '<div class="hk-stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join('');
      statsEl.hidden = !rows.length;
    }
    function mineText(r) {
      var m = r.mine; if (!m) return '';
      if (r.kind === 'brief') return 'Your read: ' + (PHASES.filter(function (p) { return p[0] === m.phase; }).map(function (p) { return p[1]; })[0] || '') +
        (m.bh != null ? ' · range ' + p5(m.bl) + '–' + p5(m.bh) : '');
      return 'Your trade: entry ' + p5(m.entry) + ' · stop ' + p5(m.stop) + ' · target ' + p5(m.tgt);
    }
    function legend(r) {
      var it = [['sell', 'Premium', .3], ['buy', 'Discount', .3], ['soft', 'London 08–10', 1]];
      if (r.data.chart.a2b) it.push(['acc', 'Leg 50%', 1]);
      if (r.data.entry != null) it.push(['ink', 'Entry · stop · target', 1]);
      it.push(['you', 'You', 1]);
      return '<div class="hk-legend">' + it.map(function (x) { return '<span><s style="background:var(--hk-' + x[0] + ');opacity:' + x[2] + '"></s>' + x[1] + '</span>'; }).join('') +
        '<span>HH · HL · LH · LL = hour swings</span></div>';
    }
    function card(r) {
      var side = r.side === 1 ? '<span class="hk-chip buy">Buy</span>' : r.side === -1 ? '<span class="hk-chip sell">Sell</span>' : '';
      var ch = r.data && r.data.chart && r.data.chart.c && r.data.chart.c.length, keys = editKeys(r), h = '';
      h += '<article class="hk-card' + (r.kind === 'brief' ? ' hk-brief' : '') + (r.id === focusId ? ' hk-focus' : '') + '" id="hk-a-' + r.id + '">' +
        '<div class="hk-top"><span class="hk-chip' + (r.kind === 'setup' ? ' setup' : '') + '">' + esc(KIND[r.kind] || r.kind) + '</span>' + side +
        '<span class="hk-time">' + esc(ldn(r.created_at, { hour: '2-digit', minute: '2-digit' })) + '</span></div>' +
        '<h3>' + esc(r.title) + '</h3><p>' + esc(r.body) + '</p>';
      if (ch) {
        h += '<div class="hk-chart" data-id="' + r.id + '"><canvas role="img" aria-label="The hawk\'s chart for this alert"></canvas></div>' + legend(r);
        if (keys.length) h += '<div class="hk-train"><button class="hk-btn you" data-act="edit" data-id="' + r.id + '">' + (r.kind === 'brief' ? 'Correct the read' : 'Mark my trade') + '</button>' +
          '<span class="hk-mine" id="hk-m-' + r.id + '">' + esc(mineText(r)) + '</span></div>' +
          '<div class="hk-edit" id="hk-e-' + r.id + '" hidden><p>' + (r.kind === 'brief' ? 'Drag the two pink lines to the range you would draw, then pick the phase.' : 'Drag the pink lines to your entry, stop and target.') + '</p>' +
          (r.kind === 'brief' ? '<div class="hk-row">' + PHASES.map(function (p) { return '<button class="hk-btn hk-ph" data-act="ph" data-id="' + r.id + '" data-ph="' + p[0] + '" aria-pressed="false">' + p[1] + '</button>'; }).join('') + '</div>' : '') +
          '<div class="hk-row"><button class="hk-btn go" data-act="save" data-id="' + r.id + '">Save my read</button><button class="hk-btn" data-act="cancel" data-id="' + r.id + '">Cancel</button>' +
          '<button class="hk-btn" data-act="clear" data-id="' + r.id + '">Remove mine</button></div></div>';
      }
      if (r.kind !== 'done') h += '<div class="hk-rate">' + RATE.map(function (x) {
        return '<button class="hk-btn ' + x[0] + '" data-act="rate" data-id="' + r.id + '" data-f="' + x[0] + '" aria-pressed="' + (r.feedback === x[0]) + '">' + x[1] + '</button>'; }).join('') +
        '</div><textarea data-id="' + r.id + '" placeholder="What did you see? (optional)" rows="1">' + esc(r.note || '') + '</textarea><div class="hk-saved" id="hk-s-' + r.id + '"></div>';
      return h + '</article>';
    }
    function render() {
      charts = {};
      if (!rows.length) { list.innerHTML = '<p class="hk-empty">No alerts in this period. The hawk watches weekdays: the brief comes at 07:45 London time, then alerts until 10:05.</p>'; statsEl.hidden = true; return; }
      stats();
      var h = '', last = '';
      rows.forEach(function (r) { var dl = ldn(r.created_at, { weekday: 'long', day: 'numeric', month: 'long' });
        if (dl !== last) { h += '<div class="hk-day">' + esc(dl) + '</div>'; last = dl; } h += card(r); });
      list.innerHTML = h;
      list.querySelectorAll('.hk-chart').forEach(function (box) { var r = byId(box.dataset.id);
        var st = charts[r.id] = { box: box, cv: box.firstChild, row: r };
        draw(st); hookChart(st); });
      if (focusId) { var f = byEl('#hk-a-' + focusId); if (f) f.scrollIntoView({ block: 'start' }); focusId = null; }
    }
    function byId(id) { return rows.find(function (x) { return x.id === id; }); }
    function hookChart(st) {
      var box = st.box;
      function pos(e) { var b = box.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
      box.addEventListener('pointermove', function (e) { var p = pos(e);
        if (st.drag) { st.edit[st.drag] = r5(st.p(p.y)); draw(st); return; }
        if (!st.edit) { st.hover = p; draw(st); } });
      box.addEventListener('pointerleave', function () { if (st.hover) { st.hover = null; draw(st); } });
      box.addEventListener('pointerdown', function (e) { if (!st.edit) return; var p = pos(e), best = null, bd = e.pointerType === 'touch' ? 26 : 14;
        editKeys(st.row).forEach(function (k) { var dd = Math.abs(st.y(st.edit[k]) - p.y); if (dd < bd) { bd = dd; best = k; } });
        if (!best) return; e.preventDefault(); st.drag = best; st.frozen = st.scale; try { box.setPointerCapture(e.pointerId); } catch (x) {} draw(st); });
      function up() { if (!st.drag) return; st.drag = null; st.frozen = null;
        if (st.edit.bh != null && st.edit.bl != null && st.edit.bl > st.edit.bh) { var t = st.edit.bh; st.edit.bh = st.edit.bl; st.edit.bl = t; }
        draw(st); }
      box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    }
    async function load(more) {
      var s = await sb.auth.getSession();
      if (!s.data || !s.data.session) { list.innerHTML = '<p class="hk-empty">Sign in to Session Terminal in this browser first, then open this page again.</p>'; return; }
      if (mount.admin === undefined) { var ad = await sb.rpc('st_is_admin'); mount.admin = !ad.error && ad.data === true; }
      if (!mount.admin) { list.innerHTML = '<p class="hk-empty">Admin only.</p>'; statsEl.hidden = true; return; }
      var since = new Date(Date.now() - period * 86400000); if (period === 1) since = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) + 'T00:00:00Z');
      if (more && rows.length) since = new Date(new Date(rows[0].created_at).getTime() + 1);
      var q = await sb.from('hawk_signals').select('id, created_at, kind, side, title, body, data, feedback, note, mine')
        .gt('created_at', since.toISOString()).order('created_at', { ascending: false }).limit(period > 7 ? 200 : 300);
      if (q.error) { if (!more) list.innerHTML = '<p class="hk-empty">Couldn\'t load the alerts: ' + esc(q.error.message) + '</p>'; return; }
      var got = q.data || [];
      if (more) { if (!got.length) return; if (Object.keys(charts).some(function (id) { return charts[id].edit; }) || (doc.activeElement && root.contains(doc.activeElement) && doc.activeElement.tagName === 'TEXTAREA')) { pending = got.concat(pending); return; }
        var have = {}; rows.forEach(function (r) { have[r.id] = 1; });
        rows = got.concat(pending).filter(function (r) { return !have[r.id] && (have[r.id] = 1); }).concat(rows); pending = []; } else rows = got;   // never the same alert twice
      render();
    }
    var pending = [];
    // new alerts appear by themselves while the London window is on and this feed is on screen
    function poll() { clearTimeout(pollT); pollT = setTimeout(poll, 30000);
      if (doc.hidden || !host.offsetParent || period !== 1) return;
      var hm = LDN.format(new Date()), m = +hm.slice(0, 2) * 60 + +hm.slice(3), wd = new Date().toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'short' });
      if (wd === 'Sat' || wd === 'Sun' || m < 7 * 60 + 20 || m > 10 * 60 + 30) return;
      load(true); }
    async function save(id, patch, label) {
      if ('feedback' in patch || 'note' in patch) patch.feedback_at = new Date().toISOString();
      var q = await sb.from('hawk_signals').update(patch).eq('id', id), el = byEl('#hk-s-' + id);
      if (el) el.textContent = q.error ? 'Not saved: ' + q.error.message : label;
      return !q.error;
    }
    function editOpen(r, on) {
      var st = charts[r.id], ed = byEl('#hk-e-' + r.id); if (!st || !ed) return;
      if (on) { var a = r.data, d = a.chart, m = r.mine || {};
        st.edit = r.kind === 'brief' ? { bh: m.bh != null ? m.bh : d.bh, bl: m.bl != null ? m.bl : d.bl } : { entry: m.entry != null ? m.entry : a.entry, stop: m.stop != null ? m.stop : a.stop, tgt: m.tgt != null ? m.tgt : a.tgt };
        st.phase = m.phase || d.phase; st.hover = null;
        ed.querySelectorAll('.hk-ph').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.ph === st.phase); });
      } else { st.edit = null; st.drag = null; }
      ed.hidden = !on; st.box.classList.toggle('hk-editing', on); draw(st);
    }
    root.addEventListener('click', async function (e) {
      var t = e.target.closest('.hk-tabs button');
      if (t) { period = +t.dataset.p; tabs(); load(); return; }
      var b = e.target.closest('[data-act]'); if (!b) return;
      var r = byId(b.dataset.id); if (!r) return;
      var act = b.dataset.act, st = charts[r.id];
      if (act === 'rate') { r.feedback = r.feedback === b.dataset.f ? null : b.dataset.f;
        b.parentNode.querySelectorAll('.hk-btn').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.f === r.feedback); });
        save(r.id, { feedback: r.feedback }, r.feedback ? 'Saved' : 'Cleared'); stats(); return; }
      if (act === 'edit') { editOpen(r, !(st && st.edit)); return; }
      if (act === 'cancel') { editOpen(r, false); return; }
      if (act === 'ph') { st.phase = b.dataset.ph; b.parentNode.querySelectorAll('.hk-ph').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); return; }
      if (act === 'save' || act === 'clear') {
        var mine = act === 'clear' ? null : Object.assign({}, st.edit, r.kind === 'brief' ? { phase: st.phase } : {}, { at: new Date().toISOString() });
        if (await save(r.id, { mine: mine }, act === 'clear' ? 'Your read removed' : 'Your read saved — the hawk will learn from it')) {
          r.mine = mine; byEl('#hk-m-' + r.id).textContent = mineText(r); editOpen(r, false); stats(); }
      }
    });
    root.addEventListener('change', function (e) {
      if (e.target.tagName !== 'TEXTAREA') return; var r = byId(e.target.dataset.id); if (!r) return;
      r.note = e.target.value.trim(); save(r.id, { note: r.note || null }, 'Note saved');
    });
    load(); poll();
    return { reload: function () { load(); }, redraw: redraw };
  }
  window.STHawk = { mount: mount, draw: draw };
})();
