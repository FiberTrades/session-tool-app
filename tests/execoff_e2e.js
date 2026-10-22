(async function () {
  // The EA panel on a phone: with the EA OFF there is no execution button at all (Nestor, 22 Oct 2026: "when the EA is off hide the
  // execution button"); the line under it still says why. Back Testing's Replay account (the same panel as Live Charts'), real EUR/USD
  // of Thu 1 Oct 2026.
  // Run: E2E_MOBILE=375x812 python tests/browser_test.py tests/execoff_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stPractice && window.__stSB); i++) await W(100);
    await W(1000);
    Array.prototype.forEach.call(document.querySelectorAll('[class^="st-tour"]'), function (e) { e.remove(); });
    var P = window.__stPractice;
    try { Object.keys(localStorage).filter(function (k) { return /^st_practice/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    var C = P._cfg(); C.layout = 1; C.tfs = [15]; C.mini = false; C.news = false; C.resume = null; C.mm = Object.assign({}, C.mm, { on: true, col: false, maxDay: 0 });
    await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
    P._jump('london'); await W(800);
    var mm = function () { return document.getElementById('stpr-mm'); }, xb = function () { var m = mm(); return m && m.querySelector('.stpr-mm-x, [data-mm="exec"]'); };
    ok('EA ON: the Execute button is there', !!xb() && /Execute/.test(xb().textContent), xb() && xb().textContent);
    mm().querySelector('[data-mm="on"]').click(); await W(400);
    var fn = mm().querySelector('.stpr-mm-fn');
    ok('EA OFF: no execution button at all', !xb(), xb() && xb().outerHTML.slice(0, 120));
    ok('...the line under it still says the panel is off', fn && /OFF/.test(fn.textContent), fn && fn.textContent);
    mm().querySelector('[data-mm="on"]').click(); await W(400);
    ok('EA ON again: the Execute button back', !!xb() && /Execute/.test(xb().textContent), xb() && xb().textContent);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  try { window.__stPractice.close(); } catch (e) {}
  return out;
})()
