/* Session Terminal - crisp chart drawing (27 Nov 2026, Nestor: "in tradingview everything looks sharper and more crisp" - "yes do it").

   window.__stCrisp(ctx) makes a 2D canvas context draw the way TradingView does: straight lines and box edges land on whole screen pixels,
   and line widths are whole screen pixels, at any Windows display scaling or browser zoom. The code that draws keeps working in CSS
   pixels, unchanged. Measured before (scratchpad hd/): a 1px line at 125% spread over 3 screen rows at 64% brightness; at 100% it was 86%
   with a halo; at 150% two rows, one dim.

   How: moveTo / lineTo / rect / closePath are held until the path is used. On stroke, every point of a horizontal or vertical segment
   moves to the middle of a screen pixel when the line is an odd number of screen pixels wide, to a pixel edge when even, and the width
   becomes whole screen pixels. On fill or clip, to a pixel edge. fillRect / strokeRect and text anchors snap too. A path with curves in
   it (arc, arcTo, curves, roundRect, ellipse) is left as drawn, as is rotated or skewed drawing.
   window.__stCrispOff = true draws as before (to compare). */
(function () {
  if (window.__stCrisp) return;
  var RAW = ['arc', 'arcTo', 'bezierCurveTo', 'quadraticCurveTo', 'ellipse', 'roundRect'];
  var MOVE = ['setTransform', 'resetTransform', 'transform', 'translate', 'scale', 'rotate', 'restore'];
  // the canvas a whole number of screen pixels across and down, its bitmap the same: else the browser stretches the bitmap to fit and every
  // line goes soft whatever is drawn on it (a 858 px wide chart at 125% is 1072.5 screen pixels). It may come out up to one screen pixel
  // smaller than w x h on the page.
  window.__stCrispFit = function (c, w, h, dpr) {
    var off = window.__stCrispOff === true, bw = Math.max(1, off ? Math.round(w * dpr) : Math.floor(w * dpr + 1e-4)), bh = Math.max(1, off ? Math.round(h * dpr) : Math.floor(h * dpr + 1e-4));
    if (c.width !== bw) c.width = bw; if (c.height !== bh) c.height = bh;
    // its size on the page, checked every time (a zoom, or anything else that changed it): the same bitmap can need a new size there
    var sw = +(off ? w : bw / dpr).toFixed(4) + 'px', sh = +(off ? h : bh / dpr).toFixed(4) + 'px';
    if (c.style.width !== sw) c.style.width = sw; if (c.style.height !== sh) c.style.height = sh;
  };
  window.__stCrisp = function (g) {
    if (!g || g.__stCrisp || typeof g.getTransform !== 'function') return g;
    var P = Object.getPrototypeOf(g), O = {}; g.__stCrisp = true;
    ['moveTo', 'lineTo', 'closePath', 'beginPath', 'rect', 'stroke', 'fill', 'clip', 'isPointInPath', 'isPointInStroke', 'strokeRect', 'fillRect', 'clearRect', 'fillText', 'strokeText', 'reset'].concat(RAW, MOVE)
      .forEach(function (k) { if (typeof P[k] === 'function') O[k] = function () { return P[k].apply(g, arguments); }; });   // looked up at each call: a hook put on the canvas's prototype later (the app's axis-font probe, a test watching fillText) still sees every call
    var H = [], mixed = false, E = [], Em = '';   // H: held [x, y, kind] (0 move, 1 line, 2 close); mixed: curves in this path; E: all of this path put in so far (null: a part went in as drawn), Em: on which grid
    var off = function () { return window.__stCrispOff === true; };
    var cm;   // the transform, read again after anything that can change it (and at each beginPath / clearRect: a resized canvas resets it)
    var tm = function () { if (cm === undefined) { var m = g.getTransform(); cm = (m.b || m.c || !(m.a > 0) || !(m.d > 0)) ? null : { a: m.a, d: m.d, e: m.e, f: m.f }; } return cm; };
    // on the grid: 's' a stroke (odd width: pixel middles), else pixel edges
    var gx = function (m, v, mid) { var d = v * m.a + m.e; return ((mid ? Math.floor(d) + 0.5 : Math.round(d)) - m.e) / m.a; };
    var gy = function (m, v, mid) { var d = v * m.d + m.f; return ((mid ? Math.floor(d) + 0.5 : Math.round(d)) - m.f) / m.d; };
    var wpx = function (w, k) { return Math.max(1, Math.round(w * k)); };
    function put(h, mode) {   // the held path into the canvas: mode 's' (stroke), 'f' (fill / clip) or 'raw'
      var m = mode === 'raw' ? null : tm(), mx = false, my = false;
      if (m && mode === 's') { mx = wpx(g.lineWidth, m.a) % 2 === 1; my = wpx(g.lineWidth, m.d) % 2 === 1; }
      var n = h.length, sx = new Array(n), sy = new Array(n), i, j, s0 = 0;
      if (m) {   // which points sit on a level or upright segment (a subpath runs from a move to the next; a close joins its ends)
        var seg = function (a, b) { if (a < 0 || b < 0 || a === b) return; var dx = Math.abs(h[a][0] - h[b][0]) * m.a, dy = Math.abs(h[a][1] - h[b][1]) * m.d;
          if (dx < 0.01 && dy >= 0.01) { sx[a] = sx[b] = true; } else if (dy < 0.01 && dx >= 0.01) { sy[a] = sy[b] = true; } };
        var last = -1;
        for (i = 0; i < n; i++) { var k = h[i][2];
          if (k === 0) { s0 = i; last = i; }
          else if (k === 1) { seg(last, i); last = i; }
          else { seg(last, s0); last = s0; } }
      }
      for (i = 0; i < n; i++) { var p = h[i];
        if (p[2] === 2) { O.closePath.call(g); continue; }
        var x = p[0], y = p[1];
        if (m) { if (sx[i]) x = gx(m, x, mx); if (sy[i]) y = gy(m, y, my); }
        (p[2] === 0 ? O.moveTo : O.lineTo).call(g, x, y); }
      if (mode === 'raw') E = null; else if (E) { E = E.length ? E.concat(h) : h; Em = mode; }
    }
    var flush = function (mode) { if (!H.length) return; var h = H; H = []; put(h, mode); };
    var again = function (mode) {   // the same path, used the other way (filled, then stroked): all of it again, on that grid
      if (H.length || !E || !E.length || Em === mode || mixed) return; O.beginPath.call(g); var h = E; E = []; put(h, mode); };
    g.beginPath = function () { H = []; mixed = false; E = []; Em = ''; cm = undefined; return O.beginPath.call(g); };
    if (O.reset) g.reset = function () { H = []; mixed = false; E = []; Em = ''; cm = undefined; return O.reset.call(g); };
    g.clearRect = function () { cm = undefined; return O.clearRect.apply(g, arguments); };
    g.moveTo = function (x, y) { if (mixed || off()) return O.moveTo.call(g, x, y); H.push([+x, +y, 0]); };
    g.lineTo = function (x, y) { if (mixed || off()) return O.lineTo.call(g, x, y); if (!H.length) { mixed = true; E = null; return O.lineTo.call(g, x, y); } H.push([+x, +y, 1]); };
    g.closePath = function () { if (!H.length) return O.closePath.call(g); H.push([0, 0, 2]); };
    g.rect = function (x, y, w, h) { if (mixed || off()) return O.rect.call(g, x, y, w, h); x = +x; y = +y; w = +w; h = +h;
      H.push([x, y, 0], [x + w, y, 1], [x + w, y + h, 1], [x, y + h, 1], [0, 0, 2], [x, y, 0]); };
    RAW.forEach(function (k) { if (O[k]) g[k] = function () { flush('raw'); mixed = true; E = null; return O[k].apply(g, arguments); }; });
    MOVE.forEach(function (k) { if (O[k]) g[k] = function () { if (H.length) flush('raw'); E = null; /* what is in the path was placed on the old grid */ try { return O[k].apply(g, arguments); } finally { cm = undefined; } }; });
    var widen = function (k, fn) {   // a stroke in whole screen pixels
      var m = tm(); if (!m || off()) return fn();
      var w = g.lineWidth, w2 = wpx(w, m.a) / m.a; if (Math.abs(w2 - w) < 1e-6) return fn();
      g.lineWidth = w2; try { return fn(); } finally { g.lineWidth = w; } };
    g.stroke = function (p) { var a = arguments; if (p && typeof p === 'object') return O.stroke.apply(g, a);
      flush('s'); again('s'); return widen('stroke', function () { return O.stroke.apply(g, a); }); };
    g.fill = function (p) { var a = arguments; if (!(p && typeof p === 'object')) { flush('f'); again('f'); } return O.fill.apply(g, a); };
    g.clip = function (p) { var a = arguments; if (!(p && typeof p === 'object')) { flush('f'); again('f'); } return O.clip.apply(g, a); };
    ['isPointInPath', 'isPointInStroke'].forEach(function (k) { if (O[k]) g[k] = function (p) { if (!(p && typeof p === 'object')) flush('f'); return O[k].apply(g, arguments); }; });
    g.strokeRect = function (x, y, w, h) { var m = tm(); if (!m || off()) return O.strokeRect.call(g, x, y, w, h);
      var mx = wpx(g.lineWidth, m.a) % 2 === 1, my = wpx(g.lineWidth, m.d) % 2 === 1, x0 = gx(m, +x, mx), x1 = gx(m, +x + +w, mx), y0 = gy(m, +y, my), y1 = gy(m, +y + +h, my);
      return widen('strokeRect', function () { return O.strokeRect.call(g, x0, y0, x1 - x0, y1 - y0); }); };
    // a fill: its edges on the grid; a thin one (a line drawn as a fill, up to 2.5 screen pixels) keeps its width, so a row of them is even
    var span = function (v, s, k, o) { var d0 = v * k + o, ds = s * k;
      if (Math.abs(ds) <= 2.5) { var a = Math.round(d0), b = a + (ds < 0 ? -1 : 1) * (Math.abs(ds) < 0.25 ? 0 : Math.max(1, Math.round(Math.abs(ds)))); return [(a - o) / k, (b - a) / k]; }
      var e0 = Math.round(d0), e1 = Math.round(d0 + ds); return [(e0 - o) / k, (e1 - e0) / k]; };
    g.fillRect = function (x, y, w, h) { var m = tm(); if (!m || off()) return O.fillRect.call(g, x, y, w, h);
      var X = span(+x, +w, m.a, m.e), Y = span(+y, +h, m.d, m.f); return O.fillRect.call(g, X[0], Y[0], X[1], Y[1]); };
    var txt = function (fn) { return function (s, x, y) { var m = tm(), a = Array.prototype.slice.call(arguments);
      if (m && !off()) { a[1] = (Math.round(+x * m.a + m.e) - m.e) / m.a; a[2] = (Math.round(+y * m.d + m.f) - m.f) / m.d; } return fn.apply(g, a); }; };
    g.fillText = txt(O.fillText); g.strokeText = txt(O.strokeText);
    return g;
  };
})();
