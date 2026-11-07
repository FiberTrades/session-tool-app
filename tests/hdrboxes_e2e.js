// End-to-end test (Nestor, 7 Nov 2026: "can the shape and size of these boxes be the same?" - the top row's account picker and
// Bloomberg TV button; then "make the full access box smaller like before" - the plan badge keeps its own small pill).
// Run: python tests/browser_test.py tests/hdrboxes_e2e.js
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 100 && !window.__stHdrBoxes; i++) await W(100);
    await W(800);
    var pb = document.getElementById('plan-badge'), sp = document.getElementById('scope-picker'), btn = document.getElementById('scope-picker-btn'),
        lbl = document.getElementById('scope-picker-label'), bb = document.getElementById('econ-bloomberg-btn');
    /* what a signed-in member with two accounts sees */
    pb.className = 'plan-badge pb-premium'; pb.innerHTML = '<span class="pb-dot"></span>Full access'; pb.style.display = '';
    sp.style.display = ''; lbl.textContent = 'All accounts'; bb.hidden = false;
    await W(300);
    var r = function (e) { var b = e.getBoundingClientRect(); return { w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10, rad: getComputedStyle(e).borderTopLeftRadius }; };
    var a = r(btn), p = r(pb), t = r(bb);
    ok('the picker and the TV button are the same height (32px)', a.h === 32 && t.h === 32, [a.h, t.h]);
    ok('...the same corners', a.rad === t.rad && t.rad === '12px', [a.rad, t.rad]);
    ok('...the same width', Math.abs(a.w - t.w) < 0.6, [a.w, t.w]);
    ok('Full access is its small pill again (24px tall, round ends, narrower)', p.h === 24 && p.rad === '999px' && p.w < a.w - 10, p);
    /* the same letters (same evening: "are these fonts the same size and boldness?" "why is bloomberg tv appear lighter than all accounts letters?") */
    var fo = function (e) { var c = getComputedStyle(e); return [c.fontFamily, c.fontSize, c.fontWeight, c.letterSpacing].join(' / '); };
    var fl = fo(lbl), fpb = fo(pb), ftv = fo(bb.querySelector('.bb-fold-t'));
    ok('the three labels: the same font, size, weight and spacing', fl === fpb && fpb === ftv, [fl, fpb, ftv]);
    ok('...Bloomberg TV the same grey as All accounts', getComputedStyle(bb).color === getComputedStyle(btn).color, [getComputedStyle(bb).color, getComputedStyle(btn).color]);
    var mid = function (e) { var b = e.getBoundingClientRect(); return b.top + b.height / 2; };
    ok('all three sit on one line', Math.abs(mid(btn) - mid(pb)) < 1 && Math.abs(mid(pb) - mid(bb)) < 1, [mid(btn), mid(pb), mid(bb)]);
    /* a longer account name: the picker and the TV button widen together, the badge stays */
    lbl.textContent = 'FTMO 70K Challenge'; await W(200);
    var a2 = r(btn), t2 = r(bb), p2 = r(pb);
    ok('a longer account name widens the picker and the TV button together, not the badge', a2.w > 150 && Math.abs(a2.w - t2.w) < 0.6 && Math.abs(p2.w - p.w) < 0.6, [a2.w, t2.w, p2.w]);
    /* a longer plan name never widens the others */
    lbl.textContent = 'All accounts'; await W(200);
    var w0 = r(btn).w;
    pb.innerHTML = '<span class="pb-dot"></span>Mentorship with a long name'; await W(200);
    ok('a longer plan name leaves the picker and the TV button alone', Math.abs(r(btn).w - w0) < 0.6 && Math.abs(r(bb).w - w0) < 0.6, [w0, r(btn).w, r(bb).w, r(pb).w]);
    pb.innerHTML = '<span class="pb-dot"></span>Full access'; await W(200);
    /* the TV opened: its button hides, the picker keeps its width */
    bb.hidden = true; await W(200);
    ok('the TV open (its button hidden): the picker keeps its width', Math.abs(r(btn).w - w0) < 0.6, [w0, r(btn).w]);
    bb.hidden = false; await W(200);
    ok('the TV button comes back the same width', Math.abs(r(bb).w - w0) < 0.6, [w0, r(bb).w]);
    ok('the measuring never stays on', !pb.parentElement.classList.contains('hdr-measure'));
  } catch (e) { ok('no error', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
