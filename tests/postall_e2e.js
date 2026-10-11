(async function () {
  // Post all, or just this one? (11 Oct 2026). With more than one symbol there is a bias and a review for each, each
  // with its own community post. Pressing Post to community while OTHERS are filled in and not posted asks.
  // Run: python tests/browser_test.py tests/postall_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);

  // the community, and the translation round trips, stubbed: every post is recorded
  var posts = [];
  window.STCommunity = window.STCommunity || {};
  window.STCommunity.postToChannel = async function (ch, en) { posts.push({ ch: ch, en: String(en).replace(/\u001b\[[0-9;]*m/g, '') }); await W(30); return { id: 'p' + posts.length }; };
  window.__stLocaliseRuleLine = async function (a, b) { return [a, b]; };
  buildBiasMessageMaybeTranslated = async function () { return buildBiasMessage(); };
  buildReviewMessageMaybeTranslated = async function () { return buildReviewMessage(); };
  var dlg = function () { return document.getElementById('st-postall-bg'); };
  var tx = function () { var d = dlg(); return d ? d.innerText.replace(/\s+/g, ' ') : ''; };
  var page = function () { var t = document.querySelector('.tab.active'); return t ? t.getAttribute('data-page') : ''; };
  var go = function (p) { var t = document.querySelector('.tab[data-page="' + p + '"]'); if (t) t.click(); };

  // ---- two symbols on the first session: a bias and a review for each ----
  data.accounts = [newAccountBlank('Live 70K', 70000, 'personal')]; data.activeAccountId = data.accounts[0].id; data.viewScope = 'lifetime';
  data.history = []; data.currentSeries = []; data.postedLog = {}; data.biasHistory = []; data.biasSlotsParked = {}; data.reviewSlotsParked = {};
  data.settings.symbols = ['EUR/USD', 'XAU/USD']; data.settings.pair = 'EUR/USD';
  getSessions().forEach(function (s, i) { s.symbols = (i === 0) ? ['EUR/USD', 'XAU/USD'] : ['EUR/USD']; });
  data.biasSlots = []; data.reviewSlots = []; reconcileBiasSlots();
  var nSlots = data.biasSlots.length;
  ok('one bias and one review per session and symbol', nSlots >= 2 && data.reviewSlots.length === nSlots && data.biasSlots[0].symbol === 'EUR/USD' && data.biasSlots[1].symbol === 'XAU/USD', [nSlots, data.reviewSlots.length]);
  var fill = function (b, dir) { b.mode = 'Trading'; b.structure = 'Bullish'; b.location = 'Discount'; b.direction = dir; b.notes = ''; b.tvLinks = [{ url: 'https://www.tradingview.com/x/a' + dir + '/', notes: '' }, { url: 'https://www.tradingview.com/x/b' + dir + '/', notes: '' }]; delete b.copiedAt; delete b.postedSig; delete b.postedId; };
  var btn = document.getElementById('bias-copy');

  // A) only this bias is filled in: no question, it just posts
  fill(data.biasSlots[0], 'Long'); switchBiasSlot(0); go('bias'); await W(200);
  btn.click(); await W(900);
  ok('one bias waiting: no question, it posts', !dlg() && posts.length === 1 && posts[0].ch === 'pre-session-bias', [!!dlg(), posts.length]);
  ok('and the button says Posted', btn.classList.contains('is-posted') || _biasPostState(data.biasSlots[0]) === 'posted', _biasPostState(data.biasSlots[0]));

  // B) two biases filled in, neither posted: the question, naming both
  posts.length = 0; fill(data.biasSlots[0], 'Long'); fill(data.biasSlots[1], 'Short'); switchBiasSlot(0); go('bias'); await W(200);
  btn.click(); await W(400);
  ok('two biases waiting: it asks', !!dlg() && /Post all your biases\?/i.test(tx()) && /2 biases/i.test(tx()) && /EUR\/USD/.test(tx()) && /XAU\/USD/.test(tx()) && /own post/i.test(tx()), tx());
  var bs = dlg() ? dlg().querySelectorAll('.mdl-actions .btn') : [];
  ok('with two equal buttons: Post all 2, Just EUR/USD', bs.length === 2 && /Post all 2/i.test(bs[0].textContent) && /^Just EUR\/USD$/i.test(bs[1].textContent.trim()) && Math.abs(bs[0].getBoundingClientRect().width - bs[1].getBoundingClientRect().width) < 2, [].map.call(bs, function (b) { return b.textContent + ' ' + Math.round(b.getBoundingClientRect().width); }));
  ok('nothing is posted while it asks', posts.length === 0);
  // closed without choosing: nothing goes out
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await W(500);
  ok('Esc closes it and posts nothing', !dlg() && posts.length === 0 && page() === 'bias', [!!dlg(), posts.length, page()]);
  // just this one
  btn.click(); await W(400); dlg().querySelector('[data-a="one"]').click(); await W(900);
  ok('Just this one: only the bias on screen goes out', posts.length === 1 && /EUR\/USD/.test(posts[0].en) && _biasPostState(data.biasSlots[0]) === 'posted' && _biasPostState(data.biasSlots[1]) === 'new', [posts.length, _biasPostState(data.biasSlots[0]), _biasPostState(data.biasSlots[1])]);
  // the other one is now the only one waiting: its own button posts it without asking
  switchBiasSlot(1); go('bias'); await W(200); btn.click(); await W(900);
  ok('then the other, alone: no question', !dlg() && posts.length === 2 && _biasPostState(data.biasSlots[1]) === 'posted', [!!dlg(), posts.length]);

  // C) post all
  posts.length = 0; fill(data.biasSlots[0], 'Long'); fill(data.biasSlots[1], 'Short'); switchBiasSlot(1); go('bias'); await W(200);
  btn.click(); await W(400);
  ok('asked from the second bias, it is named first', /XAU\/USD[^,]*, EUR\/USD/.test(tx()), tx());
  ok('and its button says Just XAU/USD', /^Just XAU\/USD$/i.test(dlg().querySelector('[data-a="one"]').textContent.trim()), dlg().querySelector('[data-a="one"]').textContent);
  dlg().querySelector('[data-a="all"]').click(); await W(1600);
  ok('Post all: each bias is its own post', posts.length === 2 && posts.every(function (p) { return p.ch === 'pre-session-bias'; }) && /EUR\/USD/.test(posts[0].en) && /XAU\/USD/.test(posts[1].en), posts.map(function (p) { return p.en.slice(0, 90); }));
  ok('both are marked Posted', _biasPostState(data.biasSlots[0]) === 'posted' && _biasPostState(data.biasSlots[1]) === 'posted', [_biasPostState(data.biasSlots[0]), _biasPostState(data.biasSlots[1])]);
  ok('it ends on the bias it was pressed from, then moves on to Session Review once', data.bias === data.biasSlots[1] && page() === 'review', [data.biasSlots.indexOf(data.bias), page()]);
  go('bias'); await W(200); btn.click(); await W(500);
  ok('pressed again: nothing more to post', !dlg() && posts.length === 2, [!!dlg(), posts.length]);

  // D) one of the others is not finished: backing out of its warning stops the run there
  posts.length = 0; fill(data.biasSlots[0], 'Long'); fill(data.biasSlots[1], 'Short'); data.biasSlots[0].location = ''; switchBiasSlot(1); go('bias'); await W(200);
  btn.click(); await W(400); dlg().querySelector('[data-a="all"]').click(); await W(600);
  var warn = document.getElementById('incomplete-log-modal-bg');
  ok('an unfinished bias still gets its warning', !!warn && warn.classList.contains('show') && data.bias === data.biasSlots[0], [warn && warn.className, data.biasSlots.indexOf(data.bias)]);
  document.getElementById('incomplete-log-back').click(); await W(700);
  ok('Go back: nothing is posted and that bias stays open', posts.length === 0 && data.bias === data.biasSlots[0] && page() === 'bias', [posts.length, data.biasSlots.indexOf(data.bias), page()]);

  // ---- reviews ----
  var today = new Date(), pad2 = function (n) { return String(n).padStart(2, '0'); }, tdS = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());
  var iso = function (h, m) { var d = new Date(today); d.setHours(h, m, 0, 0); return d.toISOString(); };
  var tr = function (id, sym, res, r, pips, sl, et, xt) { return { id: id, accountId: data.accounts[0].id, symbol: sym, date: iso(9, 5), result: res, r: r, pips: pips, sl: sl, risk: 500, side: 'Long', type: 'Continuation', setup: '', entryTime: et, exitTime: xt, actualGross: r * 500, traded: 'Yes', execution: 'Good', focus: 'Good', close: 'Target', aimR: 5, aimPips: Math.abs(pips), potentialR: 6, potentialPips: Math.abs(pips) + 4 }; };
  var setRev = function () {
    data.postedLog = {}; data.currentSeries = []; data.history = [];
    data.reviewSlots.forEach(function (r) { Object.keys(r).forEach(function (k) { if (k !== 'slotIdx' && k !== 'slotSession' && k !== 'slotSymbol') delete r[k]; }); Object.assign(r, newReviewBlank()); r.sessionDate = tdS; });
    data.reviewSlots[0].trades = [tr('e1', 'EUR/USD', 'Win', 5, 20, 4, '08:10', '08:40')]; data.reviewSlots[0].traded = 'Yes';
    data.reviewSlots[1].trades = [tr('g1', 'XAU/USD', 'Lose', -1, -400, 400, '08:20', '08:30')]; data.reviewSlots[1].traded = 'Yes';
  };
  var rbtn = document.getElementById('review-copy');
  var incomplete = function () { var bg = document.getElementById('incomplete-log-modal-bg'); if (bg && bg.classList.contains('show')) { var c = document.getElementById('incomplete-log-continue'); if (c) c.click(); return true; } return false; };
  var rstate = function (i) { var keep = data.review, s; data.review = data.reviewSlots[i]; s = _stPostedGet(_reviewPostKey()) ? 'posted' : 'new'; data.review = keep; return s; };

  // E) two reviews with a trade each
  posts.length = 0; setRev(); switchReviewSlot(0); go('review'); await W(400);
  rbtn.click(); await W(500);
  ok('two reviews waiting: it asks about the reviews', !!dlg() && /Post all your reviews\?/i.test(tx()) && /2 reviews/i.test(tx()) && /EUR\/USD/.test(tx()) && /XAU\/USD/.test(tx()), tx());
  ok('the review button names it too: Just EUR/USD', /^Just EUR\/USD$/i.test(dlg().querySelector('[data-a="one"]').textContent.trim()), dlg().querySelector('[data-a="one"]').textContent);
  dlg().querySelector('[data-a="one"]').click(); await W(500); incomplete(); await W(1200);
  ok('Just this one: one review post, the other still waiting', posts.length === 1 && posts[0].ch === 'post-session-review' && rstate(0) === 'posted' && rstate(1) === 'new', [posts.length, rstate(0), rstate(1)]);
  ok('and its trade is saved to the series', getAllLifetimeTrades().length === 1, getAllLifetimeTrades().length);

  posts.length = 0; setRev(); switchReviewSlot(0); go('review'); await W(400);
  rbtn.click(); await W(500); dlg().querySelector('[data-a="all"]').click();
  for (var k = 0; k < 8; k++) { await W(500); incomplete(); }
  ok('Post all: each review is its own post', posts.length === 2 && posts.every(function (p) { return p.ch === 'post-session-review'; }) && posts.some(function (p) { return /XAU\/USD/.test(p.en); }) && posts.some(function (p) { return /EUR\/USD/.test(p.en); }), posts.map(function (p) { return p.en.slice(0, 120); }));
  ok('both reviews are marked posted', rstate(0) === 'posted' && rstate(1) === 'posted', [rstate(0), rstate(1)]);
  ok('both trades are saved, once each', getAllLifetimeTrades().length === 2, getAllLifetimeTrades().length);
  ok('it ends where a single post ends: Statistics', page() === 'stats', page());
  go('review'); await W(300); rbtn.click(); await W(500);
  ok('pressed again: nothing more to post', !dlg() && posts.length === 2, [!!dlg(), posts.length]);

  // G) the other review's trade log is not finished: the usual reminder, on that review, and its buttons work
  // (a bias warning showed earlier in this tab - it used to leave this reminder's buttons dead)
  posts.length = 0; setRev(); delete data.reviewSlots[0].trades[0].potentialR; switchReviewSlot(1); go('review'); await W(400);
  rbtn.click(); await W(500); dlg().querySelector('[data-a="all"]').click(); await W(700);
  var rem = document.getElementById('incomplete-log-modal-bg');
  ok('an unfinished trade log stops the run on that review with the reminder', rem.classList.contains('show') && data.review === data.reviewSlots[0] && posts.length === 0, [rem.className, data.reviewSlots.indexOf(data.review), posts.length]);
  document.getElementById('incomplete-log-continue').click(); await W(1500);
  ok('Continue anyway posts that review; the other waits for the next press', !rem.classList.contains('show') && posts.length === 1 && /EUR\/USD/.test(posts[0].en) && rstate(0) === 'posted' && rstate(1) === 'new', [rem.className, posts.length, rstate(0), rstate(1)]);
  switchReviewSlot(1); go('review'); await W(400); rbtn.click(); await W(1500);
  ok('the next press posts the one left, without asking', !dlg() && posts.length === 2 && rstate(1) === 'posted', [!!dlg(), posts.length, rstate(1)]);
  // H) what the button calls the one on screen: its symbol, its session when the symbol is shared, both when neither tells
  var B = function (sym, ses) { return { symbol: sym, sessionName: ses }; };
  ok('same symbol in two sessions: the session names it', _slotOnly(B('EUR/USD', 'London'), [B('EUR/USD', 'New York')], false) === localizeSessionName('London'), _slotOnly(B('EUR/USD', 'London'), [B('EUR/USD', 'New York')], false));
  ok('neither alone tells it apart: symbol and session', /EUR\/USD/.test(_slotOnly(B('EUR/USD', 'London'), [B('XAU/USD', 'London'), B('EUR/USD', 'New York')], false)) && /London/i.test(_slotOnly(B('EUR/USD', 'London'), [B('XAU/USD', 'London'), B('EUR/USD', 'New York')], false)), _slotOnly(B('EUR/USD', 'London'), [B('XAU/USD', 'London'), B('EUR/USD', 'New York')], false));
  ok('a review reads its own fields', _slotOnly({ slotSymbol: 'XAU/USD', slotSession: 'London' }, [{ slotSymbol: 'EUR/USD', slotSession: 'London' }], true) === 'XAU/USD');
  // F) Spanish
  var keepLang = data.settings.language;
  try {
    posts.length = 0; fill(data.biasSlots[0], 'Long'); fill(data.biasSlots[1], 'Short'); switchBiasSlot(0);
    var es = await new Promise(function (res) { var p = null; try { data.settings.language = 'es'; p = window.__stAskPostAll('review', ['EUR/USD', 'XAU/USD']); } catch (e) {} setTimeout(function () { var t2 = tx(); var d = dlg(); if (d) d.querySelector('[data-a="one"]').click(); res(t2); }, 300); });
    ok('the question has its Spanish', /Publicar|Solo esta/i.test(es) || window._stT('a', 'b') === 'a', es);
  } catch (e) { ok('the question has its Spanish', false, e.message); }
  data.settings.language = keepLang;
  return out;
})()
