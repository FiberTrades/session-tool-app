(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
  stDemoSeed(data);
  var rect = function (n) { return n.getBoundingClientRect(); };
  var bg = document.getElementById('review-modal-bg'), modal = bg.querySelector('.modal'), body = document.getElementById('review-modal-body');
  var by = {}; getAllLifetimeTrades().forEach(function (x) { var k = new Date(x.date).toDateString(); by[k] = (by[k] || 0) + 1; });
  var d = new Date(Object.keys(by).sort(function (p, q) { return by[q] - by[p]; })[0]);
  var shape = function () { var s = body.querySelector('.modal-stats'), r = body.querySelector('.st-run'); return { w: Math.round(rect(modal).width), statsAbove: rect(s).bottom <= rect(r).top + 1, sameWidth: Math.abs(rect(s).width - rect(r).width) < 2, cols: getComputedStyle(s).gridTemplateColumns.split(' ').length }; };
  openMonthlyReviewModal(d.getFullYear(), d.getMonth()); await W(1500);
  var m = shape(), blocks = Array.from(body.querySelectorAll('.month-insights > .month-insight-block')).filter(function (n) { return rect(n).height > 0; });
  ok('the month window is the narrow single column again', m.w <= 801 && m.statsAbove && m.sameWidth && m.cols === 4, m);
  ok('its insight boxes are stacked, each the full width', blocks.length >= 3 && blocks.every(function (n, i) { return Math.abs(rect(n).width - rect(blocks[0]).width) < 2 && (i === 0 || rect(n).top >= rect(blocks[i - 1]).bottom - 1); }), blocks.length);
  ok('no raw placeholder in a heading', modal.innerText.indexOf('{') === -1);
  var b = getCurrentWeekBounds(d); openWeeklyReviewModal(b.weekStart, b.weekEnd); await W(1200);
  var w = shape();
  ok('and it has the same shape as the week window', w.w === m.w && w.statsAbove === m.statsAbove && w.cols === m.cols, [m, w]);
  ok('no script errors', !errs.length, errs);
  return out;
})()
