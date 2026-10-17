// End-to-end test: EA 8.98's live line, through the real app and real Supabase Realtime.
//   python tests/liveline_run.py      (starts a stand-in EA on the same channel, then this test in headless Edge)
// The stand-in EA (tests/fake_ea_line.py) speaks the EA's exact protocol on a throwaway channel named from a test token;
// nothing is written to the database. The app is signed out; the trade is put into the live feed by hand.
(async function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var results = [];
  function check(name, cond, got) { results.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); }
  try {
    var html = await fetch('/app.html?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); });
    var doc = new DOMParser().parseFromString(html, 'text/html'), bad = [];
    doc.querySelectorAll('script:not([src])').forEach(function (s, i) {
      var ty = (s.type || '').toLowerCase(); if (ty && ty !== 'text/javascript') return;
      try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); }
    });
    check('every inline script parses', bad.length === 0, bad);

    // a visible tab is what is under test; the headless window starts reporting itself hidden after a while
    try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
    var TOKEN = 'st-test-liveline-e2e', TICKET = 990011;
    var nm = await window.__stLiveLine.nameOf(TOKEN);
    check('the channel name is the same sum the EA works out', nm === 'stl-bf568317227a5a60f912cfa4634a07bf', nm);
    window.STCloud.syncToken = TOKEN;
    var now = Math.floor(Date.now() / 1000), bt = now - (now % 60), bars = [], p = 1.12400;
    for (var i = 0; i < 90; i++) { var t = bt - (90 - i) * 60, o = p, c = 1.12400 + 0.0003 * Math.sin(i / 7); bars.push(t + ',' + o.toFixed(5) + ',' + (Math.max(o, c) + 0.00005).toFixed(5) + ',' + (Math.min(o, c) - 0.00005).toFixed(5) + ',' + c.toFixed(5)); p = c; }
    window.__stLiveBars = function () { return Promise.resolve({ bars: bars.join(';'), digits: 5, updated_at: new Date().toISOString() }); };
    var tab = document.querySelector('.tab[data-page="review"]'); if (tab) tab.click();
    await W(300);
    var pr = document.getElementById('page-review'); if (pr) pr.classList.add('session-live-collapsed');
    var row = { ticket: TICKET, login: 541419576, symbol: 'EURUSD', direction: 'short', lots: 16.64, risk: 499.64,
      opened_at: new Date(Date.now() - 20 * 60000).toISOString(), seen_at: new Date().toISOString(), tick_at: new Date().toISOString(),
      r_now: -0.1, pnl_now: -70, sl_r: -0.889, tp_r: 4.444, ladder: '', px: 1.12440, op: 1.12433, rpx: 0.00045, digits: 5,
      bar: bt + ',1.12440,1.12452,1.12436,1.12440,60', spread: 0.00001 };
    window.__stLive.upsert(row);
    try { window.__stLiveBox.render(); } catch (e) {}

    // the app joins, says "watch", and the EA streams
    var S = null;
    for (var k = 0; k < 60; k++) { await W(250); try { window.__stLiveBox.render(); } catch (e) {} S = window.__stLiveLine.state(); if (S.ticks >= 12) break; }
    check('the app joins the channel and says "watch"', S && S.joined && S.watching && S.watchSent >= 1, S);
    check('updates stream in, several a second', S && S.ticks >= 12, S && { ticks: S.ticks });
    var t0 = S.ticks, ms0 = Date.now(); await W(4000); var S2 = window.__stLiveLine.state();
    var rate = (S2.ticks - t0) / ((Date.now() - ms0) / 1000);
    var chans = (window.__stSB.getChannels ? window.__stSB.getChannels() : []).map(function (c) { return c.topic + ':' + c.state; });
    check('about four updates a second (the EA\'s cap; the network bunches some)', rate >= 2.5 && rate <= 5, { rate: Math.round(rate * 10) / 10, chans: chans, lat: S2.lat });

    // how long an update takes from the EA to this window, once the page has settled (the stand-in stamps its send time)
    var lat = (window.__stLiveLine.state().lat || []).slice(-10).slice().sort(function (a, b) { return a - b; }), med = lat[Math.floor(lat.length / 2)];
    check('an update reaches the window in well under a third of a second', lat.length >= 8 && med < 300, { median: med, last10: lat });

    // the chart's forming candle is the EA's candle, update for update
    window.__stLiveBox.render();   // the frame the browser would draw next, now
    var D = window.__stLiveBox.charts().filter(function (x) { return x.k === String(TICKET); })[0], last = window.__stLiveLine.state().last;
    var lb = String(last.bar).split(',');
    check('the forming candle on the chart is the one just streamed (close = the live price)', D && D.form && Math.abs(D.form[4] - Number(lb[4])) < 1e-9 && Math.abs(D.form[2] - Number(lb[2])) < 1e-9, { form: D && D.form, bar: lb });
    var card = document.querySelector('#st-livebox .slx-tc[data-k="' + TICKET + '"]');
    check('the card shows the streamed result', card && /R/.test(card.textContent), card && card.textContent.slice(0, 120));

    // a database row (now refreshed only every 30 s) never replaces a fresher streamed update
    window.__stLive.upsert(Object.assign({}, row, { tick_at: new Date().toISOString(), px: 1.13000, bar: bt + ',1.13000,1.13000,1.13000,1.13000,60' }));
    await W(150);
    var D2 = window.__stLiveBox.charts().filter(function (x) { return x.k === String(TICKET); })[0];
    check('a row arriving mid-stream does not pull the candle back to an older price', D2 && D2.form && D2.form[4] < 1.1300, D2 && D2.form);

    // off the Session Live page: "unwatch", and the stream stops
    var other = document.querySelector('.tab[data-page="stats"]') || document.querySelector('.tab:not([data-page="review"])'); if (other) other.click();
    await W(1800);
    var S3 = window.__stLiveLine.state(); var n3 = S3.ticks; await W(2000); var S4 = window.__stLiveLine.state();
    check('leaving the page says "unwatch" and the EA stops sending', !S3.watching && S4.ticks - n3 <= 1, { watching: S3.watching, after: S4.ticks - n3 });

    // back on the page: "watch" again and it streams again
    if (tab) tab.click(); await W(200); if (pr) pr.classList.add('session-live-collapsed'); try { window.__stLiveBox.render(); } catch (e) {}
    var n5 = window.__stLiveLine.state().ticks; await W(2500); var S6 = window.__stLiveLine.state();
    var hb = document.getElementById('st-livebox');
    check('back on the page it streams again within a second or two', S6.watching && S6.ticks - n5 >= 4, { watching: S6.watching, more: S6.ticks - n5, joined: S6.joined,
      host: hb && { hidden: hb.hidden, op: !!hb.offsetParent, card: !!hb.querySelector('.slx-tc') }, page: (document.querySelector('.page.active') || {}).id,
      live: pr && pr.className, open: window.__stLive.openIdeas().length, docHidden: document.hidden });
  } catch (e) {
    check('no exception', false, String(e && e.stack || e));
  }
  return JSON.stringify(results);
})();
