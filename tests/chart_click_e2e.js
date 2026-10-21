(async function () {
  // Run: python tests/browser_test.py tests/chart_click_e2e.js (Nestor, 21 Oct 2026: "when clicking on the image it opens a website link")
  // A chart picture in a Session Bias chart slot: clicking it opens the in-app chart viewer, for a short link, an uploaded chart and
  // a TradingView link alike - never a new web page.
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stSB && window.stOpenChart && window.STCommunity); i++) await W(100);
    await W(800);
    var opened = [], wo = window.open; window.open = function (u) { opened.push(u); return null; };
    var host = document.getElementById('bias-tv-list') || document.body;
    var tryOne = async function (href, img) {
      opened = []; var ov = document.getElementById('dcx-img'); if (ov) ov.classList.remove('open');
      var card = document.createElement('div'); card.className = 'tv-link-card';
      card.innerHTML = '<div class="tv-link-preview-wrap"><a href="' + href + '" target="_blank" rel="noopener"><img src="' + img + '" alt="Chart preview" class="tv-link-preview"></a></div>';
      host.appendChild(card); await W(50);
      card.querySelector('img').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })); await W(300);
      ov = document.getElementById('dcx-img'); var im = document.getElementById('dcx-img-el');
      var r = { viewer: !!(ov && ov.classList.contains('open')), src: im ? im.getAttribute('src') : null, newTab: opened.slice() };
      if (ov) ov.classList.remove('open'); card.remove(); return r; };
    var sh = 'https://x.sessionterminal.com/fgFGdXHb', shImg = window.stShortImg(sh);
    var r1 = await tryOne(sh, shImg);
    ok('a short snapshot link: the in-app viewer opens with the picture, no new page', r1.viewer && r1.src === shImg && !r1.newTab.length, r1);
    var up = 'https://figozyxoyobixadhqewr.supabase.co/storage/v1/object/public/chart-shots/x/fgFGdXHb.png';
    var r2 = await tryOne(up, up);
    ok('an uploaded chart picture: the same viewer', r2.viewer && r2.src === up && !r2.newTab.length, r2);
    var tv = 'https://www.tradingview.com/x/AbCd1234/';
    var r3 = await tryOne(tv, 'https://s3.tradingview.com/snapshots/a/AbCd1234.png');
    ok('a TradingView link: the viewer as before', r3.viewer && /s3\.tradingview\.com\/snapshots\/a\/AbCd1234\.png$/.test(r3.src || '') && !r3.newTab.length, r3);
    window.open = wo;
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
