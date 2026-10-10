(async function () {
  // The Edit Trade window (wide layout, 10 Oct 2026): chart, one row of figure cards, four-to-a-row fields, the result-dependent rows, Save.
  // Run: python tests/browser_test.py tests/edittrade_e2e.js   (window 1280 wide = the computer layout)
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
  var txt = function (n) { return n ? n.innerText.replace(/\s+/g, ' ').trim() : null; };
  var bg = document.getElementById('edit-trade-modal-bg'), modal = bg.querySelector('.modal');
  var shown = function (n) { return !!n && getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().height > 0; };
  var cellOf = function (id) { return document.getElementById(id).closest('.et-cell'); };
  var all = getAllLifetimeTrades(), lose = null;
  for (var i = all.length - 1; i >= 0 && !lose; i--) if (all[i].result === 'Lose') lose = all[i];
  openEditTradeModal(lose.id); await W(700);
  ok('the window opens', bg.classList.contains('show') && shown(modal));
  var tiles = Array.from(document.querySelectorAll('#edit-trade-sum .et-k'));
  var sh = fmtShownRP(lose);
  ok('six figure cards, worded like the trade table', tiles.length === 6 && tiles.map(function (n) { return txt(n.querySelector('span')); }).join('|') === 'RESULT|REAL R · P|AIMED R · P|NET £|HOLD|SIDE', tiles.map(function (n) { return txt(n.querySelector('span')); }));
  ok('the cards show the saved trade', txt(tiles[0].querySelector('b')) === 'Lose' && txt(tiles[1].querySelector('b')).indexOf(sh.r + 'R') === 0 && txt(tiles[1].querySelector('b')).indexOf(sh.p) > 0 && txt(tiles[3].querySelector('b')) === fmtMoney(tradeNetPL(lose)) && txt(tiles[5].querySelector('b')).indexOf(lose.side) === 0, tiles.map(function (n) { return txt(n.querySelector('b')); }));
  ok('result, realized and net are coloured', tiles[0].querySelector('b').classList.contains('dn') && tiles[1].querySelector('b').classList.contains('dn') && tiles[3].querySelector('b').classList.contains('dn'));
  var vis = Array.from(document.querySelectorAll('#edit-trade-modal-bg .et-cell')).filter(shown);
  ok('twelve fields for a loss, each with its label above it', vis.length === 12 && vis.every(function (c) { var l = c.querySelector('.label').getBoundingClientRect(), f = Array.from(c.children).filter(function (n) { return !n.classList.contains('label') && shown(n); })[0]; return !!f && l.bottom <= f.getBoundingClientRect().top + 1; }), vis.map(function (c) { return txt(c.querySelector('.label')); }));
  var wide = innerWidth > 900;
  ok('four fields to a row on a computer, all the same width', !wide || (function () { for (var k = 0; k < vis.length; k += 4) { var row = vis.slice(k, k + 4).map(function (c) { return c.getBoundingClientRect(); }); for (var q = 1; q < row.length; q++) { if (Math.abs(row[q].top - row[0].top) > 1 || row[q].left <= row[q - 1].right - 1 || Math.abs(row[q].width - row[0].width) > 1) return false; } } return vis.length === 12; })(), vis.map(function (c) { var r = c.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; }));
  ok('top to bottom: Trade Replay, the six cards in one row, the chart, the fields, the setup picker', (function () { var q = function (s) { return document.querySelector(s).getBoundingClientRect(); }, rp = document.getElementById('edit-trade-replay'), ch = document.getElementById('edit-trade-chart'), sum = q('#edit-trade-sum'), form = q('#edit-trade-modal-bg .edit-trade-form'), pb = q('#pb-edit'), k = tiles.map(function (n) { return n.getBoundingClientRect(); }); return (!shown(rp) || rp.getBoundingClientRect().bottom <= sum.top + 1) && (!shown(ch) || sum.bottom <= ch.getBoundingClientRect().top + 1) && q('#edit-trade-modal-bg .et-top').bottom <= form.top + 1 && form.bottom <= pb.top + 1 && shown(document.getElementById('pb-edit-select')) && (!wide || k.every(function (r) { return Math.abs(r.top - k[0].top) < 1 && Math.abs(r.width - k[0].width) < 1 && Math.abs(r.height - k[0].height) < 1; })) && txt(document.querySelector('#edit-trade-modal-bg .et-lab')) === 'EDIT THIS TRADE'; })(), [shown(document.getElementById('edit-trade-replay')), shown(document.getElementById('edit-trade-chart'))]);
  ok('the chart runs the full width of the window', !shown(document.getElementById('edit-trade-chart')) || Math.abs(document.getElementById('edit-trade-chart').getBoundingClientRect().width - document.getElementById('edit-trade-sum').getBoundingClientRect().width) < 2);
  ok('the realized cell says what really happened on a loss', shown(document.getElementById('edit-real-rp')) && !shown(document.getElementById('edit-real-fields')) && txt(document.getElementById('edit-real-rp')).indexOf(sh.r + 'R') === 0, txt(document.getElementById('edit-real-rp')));
  ok('Trade Replay is offered when the trade has one', shown(document.getElementById('edit-trade-replay')) === !!(window.__stReplay && window.__stReplay.ticketOf && window.__stReplay.ticketOf(lose)));
  ok('Trade Details and Psychology come last', document.getElementById('pb-edit-d').closest('.et-more') && document.getElementById('pb-edit-md').closest('.et-more') && document.querySelector('.et-more').getBoundingClientRect().top >= document.querySelector('#edit-trade-modal-bg .et-low').getBoundingClientRect().bottom - 1);
  var mr = modal.getBoundingClientRect();
  ok('nothing sticks out of the window', !Array.from(modal.querySelectorAll('*')).some(function (n) { var q = n.getBoundingClientRect(); return q.width > 0 && shown(n) && (q.right > mr.right + 1 || q.left < mr.left - 1); }) && document.documentElement.scrollWidth <= innerWidth);
  // the result-dependent rows
  var btn = function (r) { return document.querySelector('.edit-result-toggle button[data-result="' + r + '"]'); };
  btn('Win').click(); await W(250);
  var pot = cellOf('edit-potr');
  ok('Win shows Potential R and Pips across the row, and the realized inputs', shown(pot) && shown(document.getElementById('edit-potpips')) && shown(document.getElementById('edit-real-fields')) && !shown(cellOf('edit-bepotr')) && (!wide || pot.getBoundingClientRect().width > vis[0].getBoundingClientRect().width * 3.8), [shown(pot), Math.round(pot.getBoundingClientRect().width)]);
  btn('BE').click(); await W(250);
  ok('BE shows BE POT R · P instead', shown(cellOf('edit-bepotr')) && shown(document.getElementById('edit-bepotpips')) && !shown(pot));
  btn('Lose').click(); await W(250);
  ok('back to a loss: neither', !shown(pot) && !shown(cellOf('edit-bepotr')) && Array.from(document.querySelectorAll('#edit-trade-modal-bg .et-cell')).filter(shown).length === 12);
  // Save still works through the new markup
  var was = lose.type, now = was === 'Reaction' ? 'Continuation' : 'Reaction';
  document.getElementById('edit-type').value = now; document.getElementById('edit-type').dispatchEvent(new Event('change', { bubbles: true }));
  document.getElementById('edit-exit').value = '09:59'; document.getElementById('edit-exit').dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('edit-trade-save').click(); await W(900);
  var saved = findTradeById(lose.id);
  ok('Save Changes writes the edit and closes the window', saved.type === now && saved.exitTime === '09:59' && saved.result === 'Lose' && !bg.classList.contains('show'), [saved.type, saved.exitTime, saved.result, bg.classList.contains('show')]);
  openEditTradeModal(lose.id); await W(600);
  ok('reopened, the cards carry the saved change', txt(document.querySelectorAll('#edit-trade-sum .et-k')[5].querySelector('b')).indexOf(now) > 0, txt(document.querySelectorAll('#edit-trade-sum .et-k')[5].querySelector('b')));
  document.getElementById('edit-trade-close').click(); await W(300);
  // a win
  var win = null; for (var j = all.length - 1; j >= 0 && !win; j--) if (all[j].result === 'Win') win = all[j];
  openEditTradeModal(win.id); await W(600);
  var wt = Array.from(document.querySelectorAll('#edit-trade-sum .et-k')).map(function (n) { return txt(n.querySelector('b')); });
  ok('a win: green cards, its banked R and its potential row', document.querySelector('#edit-trade-sum .et-k b').classList.contains('up') && wt[0] === 'Win' && wt[1].indexOf(parseFloat(win.r).toFixed(2) + 'R') === 0 && shown(cellOf('edit-potr')) && Array.from(document.querySelectorAll('#edit-trade-modal-bg .et-cell')).filter(shown).length === 13, wt);
  setLanguage('es'); await W(700);
  openEditTradeModal(win.id); await W(500);
  ok('Spanish', txt(document.querySelector('#edit-trade-sum .et-k span')) === 'RESULTADO' && txt(cellOf('edit-date').querySelector('.label')) === 'FECHA', [txt(document.querySelector('#edit-trade-sum .et-k span')), txt(cellOf('edit-date').querySelector('.label'))]);
  ok('no script errors', !errs.length, errs);
  return out;
})()
