(async function () {
  // Session Bias picks that are un-ticked by hand stay un-ticked after a reload (10 Oct 2026), and the load-time repair
  // of a wiped slot still works. Also: Edit Trade's Trade Details rows read down the columns, in Session Review's order.
  // Run: python tests/browser_test.py tests/biasform_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var st = document.createElement('style'); st.textContent = '#st-nudge, .st-nudge, .st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #toast, .st-sound-lock, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; } *{transition:none !important; animation:none !important;}'; document.head.appendChild(st);
  var click = function (g, v) { document.querySelector('#page-bias [data-bias="' + g + '"] [data-value="' + v + '"]').click(); };
  var picks = function (b) { return [b.mode, b.structure, b.location, b.direction].map(function (x) { return x || '-'; }).join(','); };
  var stored = function () { try { return picks(JSON.parse(localStorage.getItem(STORAGE_KEY)).bias || {}); } catch (e) { return String(e); } };
  var FOUR = [['mode', 'Observation'], ['structure', 'Trending'], ['location', 'Premium Middle'], ['direction', 'Bearish']];
  var reload = function () { reconcileBiasSlots(); repaintBiasForm(); };   // what a load does to the slots
  FOUR.forEach(function (p) { click(p[0], p[1]); }); await W(300);
  ok('four picks made and recorded for today', picks(data.bias) === 'Observation,Trending,Premium Middle,Bearish' && (data.biasHistory || []).some(function (e) { return e.dateKey === todayDateStr(); }), picks(data.bias));
  click('direction', 'Bearish'); await W(200); reload();
  ok('one pick un-ticked stays un-ticked after a reload', picks(data.bias) === 'Observation,Trending,Premium Middle,-' && !document.querySelector('#page-bias [data-bias="direction"] .option.selected'), picks(data.bias));
  click('mode', 'Observation'); click('structure', 'Trending'); click('location', 'Premium Middle'); await W(300);
  ok('all un-ticked: saved empty and marked as cleared on purpose', picks(data.bias) === '-,-,-,-' && stored() === '-,-,-,-' && !!data.bias.clearedAt, [picks(data.bias), stored(), !!data.bias.clearedAt]);
  reload();
  ok('and it stays empty after a reload', picks(data.bias) === '-,-,-,-' && !document.querySelector('#page-bias [data-bias] .option.selected'), picks(data.bias));
  click('structure', 'Ranging'); await W(200);
  ok('picking something again lifts the mark', data.bias.structure === 'Ranging' && !data.bias.clearedAt, [data.bias.structure, data.bias.clearedAt || null]);
  // a slot wiped by a fault (not by the member) is still repaired from today's record
  FOUR.forEach(function (p) { if (data.bias[p[0]] !== p[1]) click(p[0], p[1]); }); await W(300);
  ['mode', 'structure', 'location', 'direction'].forEach(function (k) { data.bias[k] = null; });
  reload();
  ok('a slot wiped by a fault is still filled back from today', picks(data.bias) === 'Observation,Trending,Premium Middle,Bearish', picks(data.bias));
  // Edit Trade > Trade Details: down the left column, then down the right one
  stDemoSeed(data);
  var tr = getAllLifetimeTrades().slice().reverse().filter(function (x) { return x.result === 'Lose'; })[0];
  openEditTradeModal(tr.id); await W(700);
  var d = document.getElementById('pb-edit-d'); d.open = true; await W(300);
  var rows = Array.from(document.querySelectorAll('#pb-edit-rows > *')).filter(function (n) { return n.getBoundingClientRect().height > 0; });
  var rc = rows.map(function (n) { return n.getBoundingClientRect(); }), wide = innerWidth > 900;
  var lefts = rc.map(function (r) { return Math.round(r.left); }), L = Math.min.apply(null, lefts), firstRight = lefts.findIndex(function (x) { return x > L + 50; });
  ok('Trade Details has its rows', rows.length >= 6, rows.length);
  ok('they read down the left column, then down the right one', !wide || (firstRight > 1 && lefts.slice(0, firstRight).every(function (x) { return x === L; }) && lefts.slice(firstRight).every(function (x) { return x > L + 50; }) && rc.slice(1, firstRight).every(function (r, i) { return r.top >= rc[i].bottom - 1; }) && rc.slice(firstRight + 1).every(function (r, i) { return r.top >= rc[firstRight + i].bottom - 1; })), [firstRight, rows.length, lefts]);
  ok('with a line between the two columns', !wide || parseFloat(getComputedStyle(document.getElementById('pb-edit-rows')).columnRuleWidth) >= 1, getComputedStyle(document.getElementById('pb-edit-rows')).columnRuleWidth);
  ok('no row is split across the columns', rc.every(function (r) { return r.height < 200; }), rc.map(function (r) { return Math.round(r.height); }));
  return out;
})()
