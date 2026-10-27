(async function () {
  // Session News on the Session Bias (12 Oct 2026). Nestor: "in bias before trading mode there should be another option
  // to choose if there are any news during my session and this selection should be also stored in the Your trades with
  // this bias ... 3 buttons: Impact News, bank holiday, None. And move the date picker inside this box".
  // Run: python tests/browser_test.py tests/sessionnews_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2800);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
  var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
  doc.querySelectorAll('script:not([src])').forEach(function (s, i) { var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return; try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); } });
  ok('every inline script parses', !bad.length, bad);
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, #new-session-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  var txt = function (n) { return n ? n.innerText.replace(/\s+/g, ' ').trim() : null; };
  var go = function (p) { var t = document.querySelector('.tab[data-page="' + p + '"]'); if (t) t.click(); };
  var opt = function (g, v) { return document.querySelector('#page-bias [data-bias="' + g + '"] .option[data-value="' + v + '"]'); };
  var pick = function (g, v) { var e = opt(g, v); if (e && !e.classList.contains('selected')) e.click(); };
  var today = todayDateStr();
  Object.assign(data.bias, newBiasBlank(), { sessionDate: today }); delete data.bias.clearedAt; delete data.bias.postedSig; delete data.bias.postedId; delete data.bias.postedOn;
  data.biasHistory = []; go('bias'); await W(400); repaintBiasForm(); await W(200);

  // ---- 1) the form ----
  var secs = [].slice.call(document.querySelectorAll('#page-bias > section')).filter(function (s) { return s.querySelector('.section-num'); });
  var names = secs.map(function (s) { return s.querySelector('.section-num').textContent + ' ' + s.querySelector('.section-title').textContent; });
  ok('Session News is the first section, the rest move down one', names.join(' | ') === '01 Session News | 02 Trading Mode | 03 Market Structure | 04 Price Location | 05 Direction | 06 Charts | 07 Notes', names);
  var sec = document.getElementById('bias-news-sec'), os = [].slice.call(sec.querySelectorAll('.option'));
  ok('three buttons: Impact News, Bank Holiday, None', os.map(function (o) { return o.textContent.trim(); }).join('|') === 'Impact News|Bank Holiday|None' && os.map(function (o) { return o.dataset.value; }).join('|') === 'Impact News|Bank Holiday|None', os.map(function (o) { return o.textContent.trim(); }));
  var ws = os.map(function (o) { return Math.round(o.getBoundingClientRect().width); }), hs = os.map(function (o) { return Math.round(o.getBoundingClientRect().height); });
  var modeBtn = opt('mode', 'Observation').getBoundingClientRect();
  ok('the same size as each other and as Trading Mode\'s', new Set(ws).size === 1 && new Set(hs).size === 1 && Math.abs(ws[0] - Math.round(modeBtn.width)) <= 1 && hs[0] === Math.round(modeBtn.height), [ws, hs, Math.round(modeBtn.width)]);
  var dp = document.getElementById('bias-date');
  ok('the date picker is in the Session News box, in its title line', sec.contains(dp) && !!dp.closest('.section-header') && document.querySelectorAll('#bias-date').length === 1 && !secs[1].querySelector('input[type="date"]'), [sec.contains(dp), document.querySelectorAll('#bias-date').length]);
  ok('and still shows the bias date', dp.value === today, dp.value);
  ok('the section says what to do', /Economic Calendar/.test(txt(sec.querySelector('.section-hint'))), txt(sec.querySelector('.section-hint')));
  ok('nothing spills sideways', document.documentElement.scrollWidth <= window.innerWidth + 1, [document.documentElement.scrollWidth, window.innerWidth]);

  // ---- 2) picking ----
  ok('nothing picked to start with', data.bias.news === null && !sec.querySelector('.option.selected'), data.bias.news);
  pick('news', 'Impact News'); await W(120);
  ok('a pick is stored on the bias', data.bias.news === 'Impact News' && opt('news', 'Impact News').classList.contains('selected'), data.bias.news);
  ok('on its own it already counts as a bias with something in it', biasSlotHasContent(data.bias) && !data.bias.clearedAt);
  pick('news', 'Bank Holiday'); await W(120);
  ok('one at a time', data.bias.news === 'Bank Holiday' && sec.querySelectorAll('.option.selected').length === 1, data.bias.news);
  opt('news', 'Bank Holiday').click(); await W(120);
  ok('pressing the picked one again un-ticks it', data.bias.news === null && !sec.querySelector('.option.selected') && !!data.bias.clearedAt, [data.bias.news, data.bias.clearedAt]);
  pick('news', 'None'); await W(120);
  ok('None is a real answer, not "nothing picked"', data.bias.news === 'None' && biasSlotHasContent(data.bias), data.bias.news);

  // ---- 3) the "not finished" warning names it ----
  Object.assign(data.bias, { news: null, mode: 'Execution', structure: 'Initiating', location: 'Discount Middle', direction: 'Bearish' });
  ok('left blank, the warning names Session News first', biasMissingFields().join('|') === 'Session News', biasMissingFields());
  data.bias.news = 'Impact News';
  ok('picked: nothing missing', biasMissingFields().length === 0, biasMissingFields());
  ok('the warning text says what a complete bias is', /Session News, Mode, Structure, Location and Bias/.test(t('bias.incomplete_warn')) && /last four/.test(t('bias.incomplete_warn')), t('bias.incomplete_warn'));

  // ---- 4) the Posted button is not disturbed for a bias posted before this existed ----
  var old = { mode: 'Execution', structure: 'Ranging', structureLtf: null, location: '50%', locationLtf: null, direction: 'Bearish', directionLtf: null, notes: 'x', tvLinks: [{ url: 'https://www.tradingview.com/x/a/' }, { url: 'https://www.tradingview.com/x/b/' }] };
  var oldSig = JSON.stringify([old.mode, old.structure, '', old.location, '', old.direction, '', 'x', ['https://www.tradingview.com/x/a/', 'https://www.tradingview.com/x/b/']]);
  ok('a bias with no news pick keeps the signature it was posted with', biasSig(old) === oldSig, biasSig(old));
  ok('adding a pick is a change (Post update)', biasSig(Object.assign({}, old, { news: 'None' })) !== oldSig);
  ok('and different picks are different', biasSig(Object.assign({}, old, { news: 'None' })) !== biasSig(Object.assign({}, old, { news: 'Impact News' })));

  // ---- 5) the post ----
  var en = window.__stBuildInLang('en', buildBiasMessage), es = window.__stBuildInLang('es', buildBiasMessage);
  var lines = en.split('\n');
  var iN = lines.findIndex(function (l) { return /^News\s+Impact News$/.test(l); }), iM = lines.findIndex(function (l) { return /^Mode\s+Execution$/.test(l); });
  ok('the post has a News line, above Mode, inside the box', iN > 0 && iM === iN + 1 && lines[iN - 1] === '```', lines.slice(0, 8));
  ok('label and value line up with the others', /^News {8}Impact News$/.test(lines[iN]), JSON.stringify(lines[iN]));
  ok('in Spanish too', /^Noticias\s+Noticias de impacto$/m.test(es), es.split('\n').slice(0, 6));
  ok('the leaderboard still reads the direction from the post, and only one', /bearish/i.test(en) && !/bullish|↑/i.test(en) && /bajista/i.test(es) && !/alcista/i.test(es));
  data.bias.news = null;
  ok('no pick, no line', !/^News/m.test(window.__stBuildInLang('en', buildBiasMessage)));
  data.bias.news = 'Impact News';

  // ---- 6) the journal entry, and the refill from it ----
  recordBiasIfComplete(true);
  var h = (data.biasHistory || []).filter(function (e) { return e.dateKey === today; })[0];
  ok('the day\'s bias record keeps the pick', !!h && h.news === 'Impact News', h && h.news);
  var keepSlot = JSON.stringify(data.bias);
  Object.assign(data.bias, newBiasBlank(), { sessionDate: today }); delete data.bias.clearedAt;
  _rehydrateBiasSlot(data.bias);
  ok('a bias wiped by a fault comes back with it', data.bias.news === 'Impact News' && data.bias.direction === 'Bearish', [data.bias.news, data.bias.direction]);
  Object.assign(data.bias, JSON.parse(keepSlot));

  // ---- 7) Your trades with this bias ----
  var el = document.getElementById('bias-like');
  stDemoSeed(data); data.bias.news = null;
  Object.assign(data.bias, { mode: 'Execution', structure: 'Initiating', location: 'Discount Middle', direction: 'Bearish', structureLtf: null, locationLtf: null, directionLtf: null });
  repaintBiasForm(); await W(300);
  var hero0 = txt(el.querySelector('.bl-4 .bl-t'));
  ok('the box shows the exact match as before', !el.classList.contains('hidden') && hero0 === 'TRADES 6 of 37 trades', hero0);
  ok('no news line until a pick is made', !el.querySelector('.bl-news'));
  pick('news', 'Impact News'); await W(300);
  ok('picked: one line, and none of the older trades carries a pick yet', txt(el.querySelector('.bl-news')) === 'In sessions with impact news too No trades yet', txt(el.querySelector('.bl-news')));
  ok('the exact match is NOT narrowed by it', txt(el.querySelector('.bl-4 .bl-t')) === hero0 && el.querySelectorAll('.bl-t').length === 4 && el.querySelectorAll('.bl-chip').length === 6, txt(el.querySelector('.bl-4 .bl-t')));
  // trades saved from now on carry the pick: mark three of the six the way a save would
  var six = getAllLifetimeTrades().filter(function (x) { var s = x.biasSnap || {}; return s.structure === 'Initiating' && s.location === 'Discount Middle' && s.direction === 'Bearish'; });
  six.slice(0, 3).forEach(function (x) { x.biasSnap.news = 'Impact News'; }); six.slice(3, 4).forEach(function (x) { x.biasSnap.news = 'None'; });
  pick('news', 'None'); await W(200);
  ok('None has its own wording and its own count', /^In sessions with no news too 1 trade · /.test(txt(el.querySelector('.bl-news'))), txt(el.querySelector('.bl-news')));
  pick('news', 'Impact News'); await W(300);
  ok('with trades behind it: how they went on the same kind of day', /^In sessions with impact news too 3 trades · \d W · \d L · \d BE · [+−]?\d+\.\d\dR$/.test(txt(el.querySelector('.bl-news'))), txt(el.querySelector('.bl-news')));
  pick('news', 'Bank Holiday'); await W(300);
  ok('Bank Holiday: its own wording, no trades yet', txt(el.querySelector('.bl-news')) === 'On bank holidays too No trades yet', txt(el.querySelector('.bl-news')));
  document.querySelector('#page-bias .tf-toggle[data-tf-for="direction"] .tf-btn[data-tf="ltf"]').click(); await W(150); pick('direction', 'Bullish'); await W(300);
  document.querySelector('#page-bias .tf-toggle[data-tf-for="direction"] .tf-btn[data-tf="htf"]').click(); await W(200);
  ok('with an LTF pick too: the LTF line, then the news line', el.querySelectorAll('.bl-ltf').length === 2 && !el.querySelector('.bl-ltf').classList.contains('bl-news') && el.querySelectorAll('.bl-ltf')[1].classList.contains('bl-news'), el.querySelectorAll('.bl-ltf').length);
  var r = el.getBoundingClientRect();
  ok('nothing overflows the box', ![].some.call(el.querySelectorAll('*'), function (n) { var q = n.getBoundingClientRect(); return q.width > 0 && (q.right > r.right + 1 || q.left < r.left - 1); }));
  data.bias.directionLtf = null;

  // ---- 8) a saved trade carries the pick ----
  pick('news', 'Impact News'); await W(150);
  var rb = _reviewBias();
  ok('the review reads the same bias, pick included', rb && rb.news === 'Impact News', rb && rb.news);
  ok('and a saved trade takes the whole bias with it', /const biasSnap = \{ \.\.\._rb,/.test(html));

  // ---- 9) Session Review: no "This morning's bias" box any more (Nestor, 27 Oct 2026); the bias is in Check my bias on Charts ----
  data.bias.copiedAt = new Date().toISOString(); data.bias.date = data.bias.copiedAt;
  go('review'); await W(500); var sbErr = null; try { renderSavedBias(); } catch (e) { sbErr = String(e); } await W(200);
  ok('Session Review shows no "This morning\'s bias" box, and drawing it is a quiet no-op', !document.getElementById('saved-bias-card') && !sbErr, sbErr);
  ok('the Session Review post carries it with the mode', /News:\s+Impact News[\s\S]*Mode:\s+Execution/.test(window.__stBuildInLang('en', buildReviewMessage).replace(/\u001b\[[0-9;]*m/g, '')), window.__stBuildInLang('en', buildReviewMessage).replace(/\u001b\[[0-9;]*m/g, '').slice(0, 200));

  // ---- 10) Spanish ----
  go('bias'); await W(300); setLanguage('es'); await W(700);
  ok('Spanish: the section and its buttons', txt(sec.querySelector('.section-title')) === 'Noticias de la sesión' && os.map(function (o) { return o.textContent.trim(); }).join('|') === 'Noticias de impacto|Festivo bancario|Ninguna' && /Calendario Económico/.test(txt(sec.querySelector('.section-hint'))), [txt(sec.querySelector('.section-title')), os.map(function (o) { return o.textContent.trim(); })]);
  ok('Spanish: the line in the box', /^También en sesiones con noticias de impacto /.test(txt(el.querySelector('.bl-news'))), txt(el.querySelector('.bl-news')));
  ok('Spanish: the warning names it', (function () { data.bias.news = null; var m = biasMissingFields(); data.bias.news = 'Impact News'; return m[0] === 'Noticias de la sesión'; })());
  setLanguage('en'); await W(600);

  // ---- 11) clearing ----
  var _ac = window.appConfirm; window.appConfirm = async function () { return true; };
  document.getElementById('bias-reset').click(); await W(300); window.appConfirm = _ac;
  ok('Clear bias clears the pick', data.bias.news === null && !sec.querySelector('.option.selected'), data.bias.news);
  ok('a blank bias has the field', 'news' in newBiasBlank() && newBiasBlank().news === null);
  return out;
})()
