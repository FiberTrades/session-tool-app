// Community's "Drag to resize" tab stays right under the chat after the chat has been in Session Live and back, twice
// (Nestor, 19 Oct 2026, in a live session: "what is this in community, has this broken???" - the tab sat above the chat).
//   python tests/browser_test.py tests/community_resizetab_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got }); };
  for (var i = 0; i < 200 && !(window.STCommunity && document.querySelector('.tab[data-page="community"]')); i++) await W(100);
  await W(1500);
  var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
  var host = document.createElement('div'); host.id = 'tst-live-host'; document.body.appendChild(host);
  var order = function () { var pc = document.getElementById('page-community'); return Array.prototype.map.call(pc.children, function (c) { return c.id || c.className.split(' ')[0]; }).join(' > '); };
  var visit = async function () { document.querySelector('.tab[data-page="community"]').click(); await W(1800); window.dispatchEvent(new Event('resize')); await W(700); };
  var away = async function () { document.querySelector('.tab[data-page="review"]').click(); await W(400); STCommunity.embedIn(host, 'session-chat', function () {}); await W(900); };
  await away(); await visit();
  var o1 = order();
  await away(); await visit();
  var o2 = order();
  var good = function (o) { return /dcx-root > dcx-resize/.test(o) && o.indexOf('dcx-resize') > o.indexOf('dcx-root'); };
  ok('after the chat came back from Session Live once, the tab is right under it', good(o1), o1);
  ok('...and after a second trip too (the trip that used to put the tab above it)', good(o2), o2);
  return JSON.stringify(out);
})()
