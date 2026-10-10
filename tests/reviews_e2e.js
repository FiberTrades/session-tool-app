(async function () {
  // The Monthly Review's wide layout (10 Oct 2026), and that the Weekly Review is left as it was.
  // Run: python tests/browser_test.py tests/reviews_e2e.js   (window 1280 wide = the computer layout)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
  var st = document.createElement('style'); st.textContent = '#st-nudge, .st-nudge, .st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #toast, .st-sound-lock, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; } *{transition:none !important; animation:none !important;}'; document.head.appendChild(st);
  stDemoSeed(data);
  var bg = document.getElementById('review-modal-bg'), modal = bg.querySelector('.modal'), body = document.getElementById('review-modal-body');
  var rect = function (n) { return n.getBoundingClientRect(); };
  var first = getAllLifetimeTrades().map(function (t) { return new Date(t.date); }).sort(function (a, b) { return a - b; })[0];
  openMonthlyReviewModal(first.getFullYear(), first.getMonth()); await W(1500);
  var wide = innerWidth > 900;
  ok('the Monthly Review opens wide on a computer', bg.classList.contains('show') && bg.dataset.kind === 'monthly' && (!wide || rect(modal).width > 1000), Math.round(rect(modal).width));
  var stats = body.querySelector('.modal-stats'), run = body.querySelector('.st-run');
  ok('the figure cards sit two by two beside the chart, the same height', !wide || (rect(stats).right <= rect(run).left && Math.abs(rect(stats).top - rect(run).top) < 2 && Math.abs(rect(stats).height - rect(run).height) < 2 && (function () { var k = Array.from(stats.children).map(rect); return k.length === 4 && Math.abs(k[0].top - k[1].top) < 1 && k[2].top > k[0].bottom - 1; })()), [Math.round(rect(stats).height), Math.round(rect(run).height)]);
  ok('the chart line fills its box', rect(run.querySelector('svg')).height >= 96 && rect(run.querySelector('svg')).bottom <= rect(run).bottom + 1, Math.round(rect(run.querySelector('svg')).height));
  var grid = body.querySelector('.mi-grid'), blocks = Array.from(grid.querySelectorAll(':scope > .month-insight-block')).filter(function (n) { return rect(n).height > 0; });
  var full = blocks.filter(function (n) { return rect(n).width > rect(grid).width * 0.9; }), half = blocks.filter(function (n) { return rect(n).width <= rect(grid).width * 0.9; });
  ok('the best trades run across the full width', !wide || (full.length >= 1 && !!full[0].querySelector('.reflect-week-grid, .month-insight-empty')), full.length);
  ok('the other insights go two across in equal boxes, none left alone', !wide || (half.length >= 2 && half.length % 2 === 0 && (function () { for (var i = 0; i < half.length; i += 2) { var a = rect(half[i]), b = rect(half[i + 1]); if (Math.abs(a.top - b.top) > 1 || Math.abs(a.height - b.height) > 1 || Math.abs(a.width - b.width) > 1) return false; } return true; })()), half.map(function (n) { var r = rect(n); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }));
  ok('no heading shows a raw placeholder', modal.innerText.indexOf('{') === -1);
  var mr = rect(modal);
  ok('nothing sticks out of the window', !Array.from(modal.querySelectorAll('*')).some(function (n) { var q = rect(n); return q.width > 0 && (q.right > mr.right + 1 || q.left < mr.left - 1); }) && document.documentElement.scrollWidth <= innerWidth);
  var cell = body.querySelector('.trade-of-month-cell');
  ok('a best-trade card still opens its day', !cell || (function () { cell.click(); return document.getElementById('day-modal-bg').classList.contains('show') && !bg.classList.contains('show'); })());
  document.getElementById('day-modal-bg').classList.remove('show');
  // the Weekly Review is not part of this
  var by = {}; getAllLifetimeTrades().forEach(function (x) { var k = new Date(x.date).toDateString(); by[k] = (by[k] || 0) + 1; });
  var b = getCurrentWeekBounds(new Date(Object.keys(by).sort(function (p, q) { return by[q] - by[p]; })[0]));   // a week with several trades, so its chart is drawn
  openWeeklyReviewModal(b.weekStart, b.weekEnd); await W(1200);
  var ws = body.querySelector('.modal-stats'), wr = body.querySelector('.st-run');
  ok('the Weekly Review keeps its single column', bg.dataset.kind === 'weekly' && rect(modal).width <= 801 && rect(wr).top >= rect(ws).bottom - 1 && Math.abs(rect(ws).width - rect(wr).width) < 2, [Math.round(rect(modal).width), Math.round(rect(ws).width), Math.round(rect(wr).width)]);
  ok('no script errors', !errs.length, errs);
  return out;
})()
