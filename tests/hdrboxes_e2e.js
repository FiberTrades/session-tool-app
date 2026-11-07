// End-to-end test (Nestor, 7 Nov 2026: "can the shape and size of these boxes be the same?" - the top row's account picker,
// plan badge and Bloomberg TV button).
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
    ok('the three are the same height (32px)', a.h === 32 && p.h === 32 && t.h === 32, [a.h, p.h, t.h]);
    ok('the three have the same corners', a.rad === p.rad && p.rad === t.rad && t.rad === '12px', [a.rad, p.rad, t.rad]);
    ok('the three are the same width', Math.abs(a.w - p.w) < 0.6 && Math.abs(p.w - t.w) < 0.6, [a.w, p.w, t.w]);
    var mid = function (e) { var b = e.getBoundingClientRect(); return b.top + b.height / 2; };
    ok('they sit on one line', Math.abs(mid(btn) - mid(pb)) < 1 && Math.abs(mid(pb) - mid(bb)) < 1, [mid(btn), mid(pb), mid(bb)]);
    var d = pb.querySelector('.pb-dot').getBoundingClientRect(), pr = pb.getBoundingClientRect();
    ok('the plan badge text sits in the middle', Math.abs((d.left - pr.left) - (pr.right - (pb.lastChild.nodeType === 3 ? (function () { var rg = document.createRange(); rg.selectNodeContents(pb.lastChild); return rg.getBoundingClientRect().right; })() : d.right))) < 2);
    /* a longer account name: all three widen together */
    lbl.textContent = 'FTMO 70K Challenge'; await W(200);
    a = r(btn); p = r(pb); t = r(bb);
    ok('a longer account name widens all three together', a.w > 150 && Math.abs(a.w - p.w) < 0.6 && Math.abs(p.w - t.w) < 0.6, [a.w, p.w, t.w]);
    lbl.textContent = 'All accounts'; await W(200);
    var w0 = r(btn).w;
    /* the TV opened: its button hides, the other two keep their width */
    bb.hidden = true; await W(200);
    ok('the TV open (its button hidden): the other two keep their width', Math.abs(r(btn).w - w0) < 0.6 && Math.abs(r(pb).w - w0) < 0.6, [w0, r(btn).w, r(pb).w]);
    bb.hidden = false; await W(200);
    ok('the TV button comes back the same width', Math.abs(r(bb).w - w0) < 0.6, [w0, r(bb).w]);
    /* one account only: the picker hidden, badge and TV still match */
    sp.style.display = 'none'; await W(200);
    ok('one account (no picker): badge and TV still match', Math.abs(r(pb).w - r(bb).w) < 0.6, [r(pb).w, r(bb).w]);
    ok('the measuring never stays on', !pb.parentElement.classList.contains('hdr-measure'));
  } catch (e) { ok('no error', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
