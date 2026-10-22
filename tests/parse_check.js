// Every inline script in app.html parses (22 Oct 2026: a // comment patched into the middle of a one-line statement commented out
// the rest of it, and the whole chart script failed to load - Live Charts and Back Testing gone). Seconds, no app start needed.
// Run: python tests/browser_test.py tests/parse_check.js
(async () => {
  const txt = await (await fetch('/app.html', { cache: 'no-store' })).text();
  const doc = new DOMParser().parseFromString(txt, 'text/html');
  const out = []; let n = 0;
  doc.querySelectorAll('script').forEach((s, i) => {
    if (s.src) return;
    const ty = (s.type || '').toLowerCase();
    if (ty && ty !== 'text/javascript' && ty !== 'application/javascript') return;
    n++;
    try { new Function(s.textContent); } catch (e) {
      // find the line: compile growing prefixes is slow; report the message and the script's first line number in the file
      const start = txt.indexOf(s.textContent.slice(0, 200));
      const line = start >= 0 ? txt.slice(0, start).split('\n').length : -1;
      out.push({ name: 'script ' + i + ' (file line ' + line + ') parses', ok: false, got: e.message });
    }
  });
  out.push({ name: 'inline scripts checked: ' + n, ok: true, got: null });
  return out;
})()
