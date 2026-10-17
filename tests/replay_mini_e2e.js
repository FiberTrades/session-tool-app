(async function () {
  // Trade Replay batch C (Nestor, 17 Oct 2026, the approved list): the Minimalist with its settings window and volume profile -
  // Practice Replay's indicator, drawn by Practice Replay's own code on Trade Replay's chart, with the same (synced) settings.
  // A made-up EUR/USD short on Thu 1 Oct 2026 over the real shared candles (signed out).
  // Run: python tests/browser_test.py tests/replay_mini_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stReplay && window.__stSB && window.__stPractice); i++) await W(100);
    await W(1000);
    var R = window.__stReplay, PR = window.__stPractice, C = PR._cfg(), errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
    C.miniS = {}; C.miniOff = {}; try { localStorage.removeItem('st_replay_mini'); } catch (e) {}
    var trade = { mt5Ticket: 999999906, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10 };
    R.open(trade); for (var k = 0; k < 120 && !(R._s() && R._s().chart && R._s().bars && R._s().bars.length); k++) await W(100); await W(800);
    var S = R._s(), chart = document.getElementById('strp-chart'), r = chart.getBoundingClientRect();
    var mev = function (t, xx, yy, o) { var el = document.elementFromPoint(r.left + xx, r.top + yy) || chart; el.dispatchEvent(new MouseEvent(t, Object.assign({ clientX: r.left + xx, clientY: r.top + yy, bubbles: true, cancelable: true, button: 0, buttons: t === 'mousedown' || (o && o.held) ? 1 : 0, detail: t === 'dblclick' ? 2 : 1 }, o || {}))); };
    var flashTxt = function () { var f = document.getElementById('strp-flash'); return f && f.classList.contains('show') ? f.textContent : ''; };
    var g = document.getElementById('strp-ov').getContext('2d'), texts = [], of = g.fillText;
    g.fillText = function (t) { texts.push(String(t)); return of.apply(this, arguments); };
    var painted = async function () { texts.length = 0; await W(120); return texts.slice(); };
    var sw = document.getElementById('strp-mini'), set = document.getElementById('strp-miniset');
    ok('Show on chart has a Minimalist switch, off at first, no Settings yet', sw && !sw.checked && set && set.style.display === 'none');
    document.getElementById('strp-layersbtn').click(); await W(40);
    sw.click(); await W(200);
    var mp = R._mp();
    ok('switched on: Settings appears, and the indicator is worked out on this chart (its range zone)', sw.checked && set.style.display !== 'none' && mp && mp._mini && mp._mini.zone && mp._mz, mp && mp._mini && mp._mini.zone);
    var tx = await painted();
    ok('drawn on the chart: its day label (THURSDAY) among the rest', tx.indexOf('THURSDAY') >= 0, tx.filter(function (t) { return /DAY/.test(t); }).slice(0, 4));
    ok('remembered in this browser', localStorage.getItem('st_replay_mini') === '1');
    // ---- its settings window ----
    set.click(); await W(150);
    var dlg = document.querySelector('#strp-modal-bg .stpr-dlg');
    ok('Settings opens Practice Replay\'s Minimalist window over the replay (no link-charts row)', dlg && dlg.querySelector('.stpr-dlgh b').textContent === 'Minimalist' && !dlg.querySelector('[data-k="mlink"]') && dlg.querySelector('[data-k="len"]'), dlg && dlg.textContent.slice(0, 80));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true })); await W(20);
    ok('keys typed with it open stay in it (the replay stays open)', document.getElementById('strp-modal-bg').classList.contains('show') && !!R._s());
    var len = dlg.querySelector('[data-k="len"]'); len.value = '50'; len.dispatchEvent(new Event('input', { bubbles: true })); await W(30);
    dlg.querySelector('[data-dok]').click(); await W(200);
    ok('Structure Length 50, Ok: kept in the shared settings and the chart works it out again', C.miniS.len === 50 && PR._ms(R._mp()).len === 50 && !document.querySelector('#strp-modal-bg .stpr-dlg'), C.miniS);
    // ---- a double-click on the zone opens it too ----
    var mz = R._mp()._mz, zx = Math.max(mz.x0 + 10, 40), zy = (mz.y0 + mz.y1) / 2;
    mev('dblclick', Math.min(zx, (mz.x1 == null ? zx : mz.x1) - 5), zy); await W(150);
    dlg = document.querySelector('#strp-modal-bg .stpr-dlg');
    ok('a double-click on the zone opens its settings', !!dlg);
    if (dlg) { dlg.querySelector('[data-dc]').click(); await W(80); }
    // ---- the zone's left edge drags (Auto goes off) ----
    var lr = S.chart.timeScale().getVisibleLogicalRange(), bi = Math.round(lr.from) + 30;
    C.miniS = Object.assign({}, C.miniS, { auto: false, zA: S.bars[bi].time, detach: true }); R._mp()._mini = null; await W(200);
    mz = R._mp()._mz; var zA0 = C.miniS.zA;
    ok('(a zone started by hand, its left edge on screen)', mz && mz.x0 > 20 && mz.x0 < r.width - 100, mz);
    mev('mousemove', mz.x0, (mz.y0 + mz.y1) / 2); await W(40);
    ok('the mouse on its edge: the drag cursor', chart.style.cursor === 'ew-resize', chart.style.cursor);
    mev('mousedown', mz.x0, (mz.y0 + mz.y1) / 2); mev('mousemove', mz.x0 - 40, (mz.y0 + mz.y1) / 2, { held: true }); mev('mousemove', mz.x0 - 80, (mz.y0 + mz.y1) / 2, { held: true }); mev('mouseup', mz.x0 - 80, (mz.y0 + mz.y1) / 2); await W(150);
    ok('dragging its left edge moves the zone\'s start earlier', C.miniS.zA < zA0 && C.miniS.auto === false && R._mp()._mz.x0 < mz.x0 - 40, [zA0, C.miniS.zA]);
    // ---- the volume profile ----
    C.miniS = Object.assign({}, C.miniS, { vpOn: true }); R._mp()._mini = null; await W(250);
    var vp = R._mp()._mini && R._mp()._mini.vp; tx = await painted();
    ok('Volume Profile on: worked out from the candles\' tick volume, or (signed out, volume missing) it says to sign in', vp && (vp.poc != null || (vp.miss && vp.st === 'out' && tx.some(function (t) { return /Volume profile: sign in/.test(t); }))), vp && { miss: vp.miss, st: vp.st, poc: vp.poc, peaks: vp.peaks && vp.peaks.length });
    ok('the candles carry their volume field', S.bars.slice(0, 50).every(function (b) { return 'vol' in b; }));
    // ---- off ----
    document.getElementById('strp-layersbtn').click(); await W(40); if (!document.getElementById('strp-tb').classList.contains('strp-layersopen')) document.getElementById('strp-layersbtn').click(); await W(30);
    sw.click(); await W(150); tx = await painted();
    ok('switched off: gone from the chart, Settings hidden', !sw.checked && set.style.display === 'none' && tx.indexOf('THURSDAY') < 0 && localStorage.getItem('st_replay_mini') === '0');
    ok('no page errors', !errs.length, errs.slice(0, 3));
    g.fillText = of;
    R.close(); await W(200);
    C.miniS = {}; C.miniOff = {}; try { localStorage.removeItem('st_replay_mini'); } catch (e) {}
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  return JSON.stringify(out);
})()
