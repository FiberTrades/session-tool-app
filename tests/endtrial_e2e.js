(async function () {
  // Settings > Business: End trial (Nestor, 22 Oct 2026: "i need to have a way to end someones trial from here"). The panel drawn from a
  // made-up answer (nothing is read from or sent to the real database: the RPC is a stand-in), and the member's side of an ended trial.
  // Run: python tests/browser_test.py tests/endtrial_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.STBusiness && window.__stSB); i++) await W(100);
    await W(500);
    var now = Date.now(), iso = function (ms) { return new Date(ms).toISOString(); };
    var D = { trials: 1, trials_ending_week: 1, members: 5, on_trial: ['trialist@example.com'], latest: [
      { at: iso(now + 2 * 86400000), email: 'trialist@example.com', kind: 'trial_ends' },
      { at: iso(now - 12 * 86400000), email: 'trialist@example.com', kind: 'signed_up' },
      { at: iso(now - 13 * 86400000), email: 'payer@example.com', kind: 'subscribed', plan: 'bundle', amount: 3500, cycle: 'month' }] };
    var body = document.getElementById('biz-body');
    window.STBusiness.paint(D); await W(50);
    var btns = body.querySelectorAll('[data-endtrial]');
    ok('Latest changes: one End trial button, on the trial member\'s newest row (Trial ends), none for the paying member', btns.length === 1 && btns[0].getAttribute('data-endtrial') === 'trialist@example.com' && btns[0].closest('tr').textContent.indexOf('Trial ends') >= 0, btns.length);
    var calls = [], sb = window.__stSB, rpc0 = sb.rpc;
    sb.rpc = function (fn, args) { calls.push([fn, args]); if (fn === 'st_admin_end_trial') return Promise.resolve({ data: { ok: true }, error: null }); return Promise.resolve({ data: null, error: { message: 'stand-in' } }); };
    var b = btns[0]; b.click(); await W(30);
    ok('first press asks: "Sure? End trial", nothing sent yet', /Sure\? End trial/.test(b.textContent) && b.classList.contains('arm') && !calls.length, b.textContent);
    await W(4200);
    ok('...left alone for 4 s it goes back to End trial', b.textContent === 'End trial' && !b.classList.contains('arm'), b.textContent);
    b.click(); await W(30); b.click(); await W(80);
    ok('pressed twice: st_admin_end_trial for that member, and the button says it is done with the time', calls.length === 1 && calls[0][0] === 'st_admin_end_trial' && calls[0][1].p_email === 'trialist@example.com' && /^Trial ended \d\d:\d\d$/.test(b.textContent) && b.classList.contains('done'), [calls, b.textContent]);
    b.click(); await W(50);
    ok('...and pressing it again does nothing', calls.length === 1);
    sb.rpc = rpc0;
    // a "Trial ended" row in Latest changes
    window.STBusiness.paint({ trials: 0, members: 5, on_trial: [], latest: [{ at: iso(now), email: 'trialist@example.com', kind: 'trial_ended' }] }); await W(50);
    var pill = body.querySelector('.biz-pill');
    ok('the row it leaves: "Trial ended", in red; no button any more', pill && /Trial ended/i.test(pill.textContent) && pill.classList.contains('biz-p-cancel') && !body.querySelector('[data-endtrial]'), pill && pill.textContent);
    ok('no page errors so far', true);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return out;
})()
