// The Economic Calendar bar (24 Oct 2026): its search icon sits right after the "Economic Calendar" label, not alone mid-bar.
// Run: python tests/browser_test.py tests/econ_icon_e2e.js   (and with E2E_MOBILE=375x812 for a phone)
(async function () {
  var out = [];
  try {
    var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    for (var i = 0; i < 60 && !document.getElementById('econ-calendar-toggle'); i++) await W(100);
    await W(800);
    var hd = document.getElementById('econ-calendar-toggle'), ttl = hd.querySelector('.econ-calendar-title'), ic = hd.querySelector('.econ-calendar-hint');
    var a = ttl.getBoundingClientRect(), b = ic.getBoundingClientRect(), h = hd.getBoundingClientRect();
    var gap = Math.round(b.left - a.right);
    out.push({ name: 'the search icon right after the label', ok: gap >= 4 && gap <= 16, got: { gap: gap, label: [Math.round(a.left), Math.round(a.right)], icon: [Math.round(b.left), Math.round(b.right)], bar: [Math.round(h.left), Math.round(h.right)] } });
    out.push({ name: 'on the label\'s line, vertically centred with it', ok: Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) <= 3, got: [a.top, a.bottom, b.top, b.bottom] });
    out.push({ name: 'still a search icon (an svg) and still in the bar', ok: !!ic.querySelector('svg') && b.left >= h.left && b.right <= h.right, got: ic.innerHTML.slice(0, 40) });
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
