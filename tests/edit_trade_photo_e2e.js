(async function () {
  // Edit Trade: add the missing photo, or replace / remove it (26 Oct 2026). The upload itself is stood in for - nothing goes to
  // Storage: __stUploadChart answers with a made-up chart-shots address and __stDeleteChart only writes down what it was given.
  // Run: python tests/browser_test.py tests/edit_trade_photo_e2e.js        (phone: E2E_MOBILE=375x812 in front)
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  await W(2500);
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  var acc = newAccountBlank('Personal 10K', 10000, 'personal'); acc.kind = 'personal';
  data.accounts = [acc]; data.activeAccountId = acc.id; data.viewScope = acc.id; data.history = []; data.reviewSlots = null; data.review = { trades: [] };
  var BASE = 'https://figozyxoyobixadhqewr.supabase.co/storage/v1/object/public/chart-shots/test/';
  var tr = function (id, extra) { return Object.assign({ id: id, accountId: acc.id, symbol: 'EUR/USD', date: new Date(Date.now() - 86400000).toISOString(), result: 'Win', r: 2, risk: 100, actualGross: 200, costs: 0, side: 'Long', type: 'Continuation' }, extra || {}); };
  data.currentSeries = [tr('p1'), tr('p2', { biasSnap: { tvLinks: [{ url: 'https://www.tradingview.com/x/AbCdEf12/', notes: 'morning' }] } })];
  rebuildSeriesByDate();
  var n = 0, deleted = [], saves = 0, fail = null;
  var realUp = window.__stUploadChart, realDel = window.__stDeleteChart, realSave = window.saveData;
  window.__stUploadChart = function (f) { return fail ? Promise.reject(new Error(fail)) : new Promise(function (r) { setTimeout(function () { r(BASE + 'shot' + (++n) + '.webp'); }, 60); }); };
  window.__stDeleteChart = function (u) { deleted.push(u); return Promise.resolve(); };
  var box = function () { return document.getElementById('edit-trade-chart'); };
  var file = function () { return new File([new Uint8Array([137, 80, 78, 71])], 'shot.png', { type: 'image/png' }); };
  var paste = function () { var dt = new DataTransfer(); dt.items.add(file()); document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); };
  var find = function (id) { return findTradeById(id); };

  // 1. no photo: the Add photo slot
  openEditTradeModal('p1'); await W(200);
  var add = box().querySelector('.et-photo-add');
  ok('a trade with no photo shows an Add photo slot (on a phone: "Tap to choose a picture")', box().style.display !== 'none' && !!add && /Add photo/.test(add.innerText) && (window.innerWidth <= 420 ? /Tap to choose a picture/.test(add.innerText) : /paste it \(Ctrl\+V\)/.test(add.innerText)), box().innerText);
  ok('the slot is a compact band across the window (about 150px tall)', add && add.getBoundingClientRect().height >= 148 && add.getBoundingClientRect().height <= 175 && add.getBoundingClientRect().width > 250, add && [add.getBoundingClientRect().width, add.getBoundingClientRect().height]);
  // 2. paste a picture: uploaded, first in the trade's review chart links, saved, shown
  paste(); await W(30);
  ok('pasting shows Uploading… on the slot', /Uploading/i.test(box().innerText), box().innerText);
  await W(200);
  var t1 = find('p1');
  ok('the photo is stored as the trade\'s first review chart link', t1.reviewSnap && Array.isArray(t1.reviewSnap.tvLinks) && t1.reviewSnap.tvLinks[0].url === BASE + 'shot1.webp', t1.reviewSnap);
  var img = box().querySelector('img.et-chart-img');
  ok('and shown in Edit Trade at once, with Replace and Remove on it', img && img.getAttribute('src') === BASE + 'shot1.webp' && /Replace/.test(box().innerText) && /Remove/.test(box().innerText) && /Photo saved/.test(box().innerText), box().innerText);
  var thumb = pickTradeChartThumb(t1);
  ok('the trade\'s thumbnail elsewhere shows it too', thumb.indexOf(BASE + 'shot1.webp') > 0, thumb.slice(0, 160));
  // 3. replace (a picture dropped on it): the old picture of ours is deleted, the new one takes its place
  var dt = new DataTransfer(); dt.items.add(file());
  box().dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  await W(250);
  ok('dropping a picture on it replaces it, in the same place', find('p1').reviewSnap.tvLinks.length === 1 && find('p1').reviewSnap.tvLinks[0].url === BASE + 'shot2.webp' && deleted.indexOf(BASE + 'shot1.webp') >= 0, [find('p1').reviewSnap.tvLinks, deleted]);
  // 4. remove: asked once on the button, then gone, and the slot is back
  var rm = box().querySelector('[data-et-photo="remove"]'); rm.click(); await W(30);
  ok('Remove asks once on the button: "Sure? Remove"', /Sure\? Remove/.test(rm.textContent) && find('p1').reviewSnap.tvLinks.length === 1, rm.textContent);
  rm.click(); await W(60);
  ok('then the photo is gone and the Add photo slot is back', find('p1').reviewSnap.tvLinks.length === 0 && !!box().querySelector('.et-photo-add') && deleted.indexOf(BASE + 'shot2.webp') >= 0, [find('p1').reviewSnap.tvLinks, deleted]);
  try { closeEditTradeModal(); } catch (e) {}
  // 5. a trade whose photo is its morning bias chart: shown; Replace adds a review photo in front, the bias chart stays
  openEditTradeModal('p2'); await W(200);
  ok('a trade with a TradingView bias chart shows it, with Replace and Remove', !!box().querySelector('img.et-chart-img') && /Replace/.test(box().innerText), box().innerText);
  box().querySelector('[data-et-photo="replace"]');   // (the file picker itself cannot be driven headless: replace goes through the same path as drop)
  var dt2 = new DataTransfer(); dt2.items.add(file());
  box().dispatchEvent(new DragEvent('drop', { dataTransfer: dt2, bubbles: true, cancelable: true }));
  await W(250);
  var t2 = find('p2');
  ok('replacing a bias chart puts the new photo first in the review links and leaves the bias chart as it was', t2.reviewSnap.tvLinks[0].url === BASE + 'shot3.webp' && t2.biasSnap.tvLinks.length === 1 && t2.biasSnap.tvLinks[0].notes === 'morning' && deleted.indexOf('https://www.tradingview.com/x/AbCdEf12/') < 0, [t2.reviewSnap, t2.biasSnap]);
  try { closeEditTradeModal(); } catch (e) {}
  // 6. not on a paid plan: said plainly under the slot, nothing stored
  data.currentSeries.push(tr('p3')); rebuildSeriesByDate();
  fail = 'Chart upload is a Premium feature';
  openEditTradeModal('p3'); await W(200);
  paste(); await W(150);
  ok('without Journal Pro: "Adding photos is part of Journal Pro." and nothing stored', /Adding photos is part of Journal Pro\./.test(box().innerText) && !(find('p3').reviewSnap && find('p3').reviewSnap.tvLinks && find('p3').reviewSnap.tvLinks.length), box().innerText);
  fail = null;
  try { closeEditTradeModal(); } catch (e) {}
  // 7. a mentor view: no slot, no Replace / Remove, pasting does nothing
  document.body.classList.add('mentor-viewing');
  openEditTradeModal('p3'); await W(200);
  var n0 = n; paste(); await W(150);
  ok('a mentor view: no Add photo slot, and a paste uploads nothing', !box().querySelector('.et-photo-add') && n === n0, [box().style.display, n, n0]);
  try { closeEditTradeModal(); } catch (e) {}
  openEditTradeModal('p2'); await W(200);
  ok('a mentor view: a photo shows without Replace / Remove', !!box().querySelector('img.et-chart-img') && !box().querySelector('.et-photo-tools'));
  try { closeEditTradeModal(); } catch (e) {}
  document.body.classList.remove('mentor-viewing');
  if (window.innerWidth <= 420) {
    openEditTradeModal('p3'); await W(250);
    var a2 = box().querySelector('.et-photo-add'), mb = document.querySelector('#edit-trade-modal-bg .modal') || document.getElementById('edit-trade-modal-bg');
    ok('phone: the slot fits the window, nothing wider than the screen', a2 && a2.getBoundingClientRect().right <= window.innerWidth && document.documentElement.scrollWidth <= window.innerWidth + 1, a2 && [a2.getBoundingClientRect().left, a2.getBoundingClientRect().right]);
    try { closeEditTradeModal(); } catch (e) {}
  }
  window.__stUploadChart = realUp; window.__stDeleteChart = realDel;
  return out;
})()
