(async function () {
  // The hawk's "Net R by stop and target" grid: the row labels stay clear of the vertical "Your stop (pips)" tab (26 Nov 2026, Nestor: "why
  // are these overlaping?" - "Your stops" and "-0.5 pips" were wider than the fixed 44px label column and ran left under the tab).
  // The grid needs a year of 1-minute candles to build, so this lays out the same table with the hawk's own CSS (read from hawk.js) in the
  // app's hawk fonts (.pl-hk), the labels as wiGrid now writes them, and checks every label sits inside its column. It also lays out the
  // old labels in the old 44px column, to show it measures the overlap he saw.
  // Run: python tests/browser_test.py tests/hawkgrid_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    var src = await fetch('/hawk.js?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    var perr = ''; try { new Function(src); } catch (e) { perr = e.message; }
    ok('hawk.js parses', !perr, perr);
    ok('wiGrid writes the labels it measured (yl) in a column sized to them (yw)', /'<th class="y">' \+ yl\[i\] \+ '<\/th>'/.test(src) && (src.match(/<th class="y"' \+ yw \+ '><\/th>/g) || []).length === 2, null);
    var css = (src.match(/'\.hk-hm[^']*'/g) || []).map(function (s) { return s.slice(1, -1); }).join('\n');
    ok('the grid CSS was found in hawk.js', /table-layout:fixed/.test(css) && /th\.vc b\{writing-mode/.test(css), css.length);
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var host = document.createElement('div'); host.className = 'pl-hk'; host.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#111;padding:8px;--hk-mut:#8a93a6;--hk-ink:#e8ecf3;--hk-soft:#1b2130;--hk-buy:#1fae8a;--hk-sell:#e0525c';
    document.body.appendChild(host);
    var cols = [10, 15, 20, 25, 30, 40, 50, 60];
    // the same markup wiGrid builds; yw as it now writes it, or null for the old fixed 44px column
    var lay = function (labels, tab, yw, width) {
      host.style.width = width + 'px';
      var th = function () { return '<th class="y"' + (yw ? ' style="width:calc(' + (Math.max.apply(null, labels.map(function (t) { return t.length; })) + 1) + 'ch + 6px)"' : '') + '></th>'; };
      host.innerHTML = '<div class="hk-hm"><table><thead><tr><th class="vc"></th>' + th() + '<th class="cap" colspan="8"><b>Target (pips)</b></th></tr><tr><th class="vc"></th>' + th() +
        cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
        labels.map(function (lb, i) { return '<tr>' + (i ? '' : '<th class="vc" rowspan="8"><span><b>' + tab + '</b></span></th>') + '<th class="y">' + lb + '</th>' +
          cols.map(function (c) { return '<td><button>' + (40 + i) + '</button></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      var tabR = host.querySelector('th.vc b').getBoundingClientRect(), bad = [];
      host.querySelectorAll('tbody th.y').forEach(function (c) {
        var rg = document.createRange(); rg.selectNodeContents(c); var tr = rg.getBoundingClientRect(), cr = c.getBoundingClientRect();
        // inside its own column both ways (an over-long label spills left under the tab or right under the first square), clear of the tab
        if (tr.left < cr.left - 0.5 || tr.right > cr.right + 0.5 || tr.left < tabR.right + 2 || tabR.right > cr.left + 0.5) bad.push(c.textContent + ' ' + Math.round(tr.left) + '-' + Math.round(tr.right) + ' (column ' + Math.round(cr.left) + '-' + Math.round(cr.right) + ', tab ends ' + Math.round(tabR.right) + ')');
      });
      var cell = host.querySelector('tbody td button').getBoundingClientRect().width;
      return { bad: bad, cell: Math.round(cell), wide: host.querySelector('.hk-hm').scrollWidth > host.querySelector('.hk-hm').clientWidth + 1 };
    };
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
    await W(200);
    var EN = ['−1', '−0.5', 'Your stops', '+0.5', '+1', '+2', '+3', '+5'], ES = ['−1', '−0.5', 'Tus stops', '+0.5', '+1', '+2', '+3', '+5'];
    var OLD = ['−1 pips', '−0.5 pips', 'Your stops', '+0.5 pips', '+1 pips', '+2 pips', '+3 pips', '+5 pips'];
    var old = lay(OLD, 'Your stop (pips)', false, 610);
    ok('the old 44px column: its labels spilled out of it, as in his screenshot', old.bad.length >= 3, old.bad);
    var a = lay(EN, 'Your stop (pips)', true, 610);
    ok('now: every row label sits in its column, clear of the tab', !a.bad.length, a.bad);
    ok('...and the squares stay a good size (' + a.cell + 'px)', a.cell >= 50, a.cell);
    if (window.__E2E_SHOT_SEL === undefined) window.__E2E_SHOT_SEL = '.pl-hk';
    var b = lay(ES, 'Tu stop (pips)', true, 610);
    ok('in Spanish too', !b.bad.length, b.bad);
    var c = lay(['1.5', '2', '3', '4', '5', '6', '8', '10'], 'Stop (points)', true, 610);
    ok('a fixed stop (bare numbers) fits too', !c.bad.length, c.bad);
    var d = lay(EN, 'Your stop (pips)', true, 340);
    ok('phone width: the labels still clear the tab (the grid scrolls sideways if it must)', !d.bad.length, [d.bad, d.cell, d.wide]);
    lay(EN, 'Your stop (pips)', true, 610);   // left on screen for the screenshot
  } catch (e) { ok('ran without throwing', false, String(e && e.stack || e)); }
  return out;
})()
