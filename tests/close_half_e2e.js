(async function () {
  // "Close 50%" (25 Oct 2026, in the approved Charts mockup): EA 9.15's "part" through __stTM. One confirm in the button's place
  // ("Close half of BUY 3.85 EURUSD?" Close half / Keep), then "Closing half…" and "Closed 1.92 lots" on the button; a refusal in words.
  // Stand-ins for the live line, the EA and the open trade; nothing is sent anywhere.
  // Run: python tests/browser_test.py tests/close_half_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stTM && window.__stTM.partHtml); i++) await W(100);
    await W(800);
    var TM = window.__stTM, sent = [];
    window.currentUser = { id: '00000000-0000-0000-0000-0000000000c5', email: 'member@example.com' };
    try { window.STCloud.syncToken = 'test-token-0001'; } catch (e) {}
    var trade = { ticket: 123, symbol: 'EURUSD', login: '9900001', direction: 'long', tick: { at: Date.now(), dg: 5 } };
    window.__stLive = Object.assign({}, window.__stLive || {}, { openIdeas: function () { return [{ main: trade, rows: [trade] }]; } });
    var realLL = window.__stLiveLine;
    window.__stLiveLine = Object.assign({}, realLL, { joined: function () { return true; }, easL: function () { return { 'EURUSD|9900001': { v: '9.15', tm: true, at: Date.now() } }; },
                                                      cmd: function (c) { sent.push(c); return true; } });
    var host = document.createElement('div'); host.id = 'ch-test'; document.body.appendChild(host);
    var paint = function () { host.innerHTML = TM.partHtml('123', { side: 'BUY', lots: '3.85', sym: 'EURUSD' }); };
    TM.on(paint); paint();
    ok('the button: Close 50%', /^Close 50%$/.test(host.textContent.trim()) && host.querySelector('[data-tma="part"]'), host.textContent);
    host.querySelector('[data-tma="part"]').click(); await W(100); paint();
    ok('pressed: asked once in its place - "Close half of BUY 3.85 EURUSD?" Close half / Keep', /Close half of BUY 3\.85 EURUSD\?/.test(host.textContent) && host.querySelector('[data-tma="part!"]') && host.querySelector('[data-tma="partno"]') && !sent.length, host.textContent);
    host.querySelector('[data-tma="partno"]').click(); await W(100); paint();
    ok('Keep: back to Close 50%, nothing sent', /^Close 50%$/.test(host.textContent.trim()) && !sent.length);
    host.querySelector('[data-tma="part"]').click(); await W(100); paint();
    host.querySelector('[data-tma="part!"]').click(); await W(300); paint();
    var c = sent[0] || {};
    ok('Close half: one signed "part" for that ticket, 50%', sent.length === 1 && c.ca === 'part' && c.cp === '50' && c.ctk === '123' && c.csy === 'EURUSD' && c.clg === '9900001' && /^[0-9a-f]{64}$/.test(c.ch || ''), c);
    ok('...the button says Closing half… meanwhile', /Closing half…/.test(host.textContent), host.textContent);
    TM.ack({ cid: c.cid, ok: 1, ca: 'part', ctk: '123', m: '', vol: 1.92, left: 1.93, open: 1 }); await W(100); paint();
    ok('MT5 closed it: "Closed 1.92 lots" on the button, no toast', /^Closed 1\.92 lots$/.test(host.textContent.trim()) && !!host.querySelector('button.done'), [host.textContent, host.innerHTML.slice(0, 120)]);
    ok('a refusal for the minimum lot in words', /below the broker's minimum lot/.test(TM.whyTxt('min')));
    ok('an EA before 9.15 that does not know it: "update the EA"', /update the EA/.test(TM.whyTxt('unknown')));
    var src = await fetch('/app.html', { cache: 'no-store' }).then(function (r) { return r.text(); });
    ok('Close 50% sits in the platform\'s Positions rows and the phone sheet\'s open trades', (src.match(/TM\.partHtml\((tk|r\[0\]), \{ dis: !!dis/g) || []).length === 2);
    window.__stLiveLine = realLL; host.remove();
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
