(async function () {
  // "Close 50%" (25 Oct 2026, in the approved Charts mockup): EA 9.15's "part" through __stTM. One confirm in the button's place
  // ("Close 50% of BUY 3.85 EURUSD?" Close 50% / Keep), then "Closing 50%…" and "Closed 1.92 lots" on the button; a refusal in words.
  // Adjustable the same day (Nestor: "close 25%, close 80%, etc"): a split button whose chevron opens 25 / 33 / 50 / 75 / 80 and a
  // box for any 1-99; the pick is the label, kept on this device.
  // Stand-ins for the live line, the EA and the open trade; nothing is sent anywhere.
  // Run: python tests/browser_test.py tests/close_half_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  try {
    for (var i = 0; i < 200 && !(window.__stTM && window.__stTM.partHtml); i++) await W(100);
    await W(800);
    var TM = window.__stTM, sent = [];
    try { localStorage.removeItem('st_partPct'); } catch (e) {}
    window.currentUser = { id: '00000000-0000-0000-0000-0000000000c5', email: 'member@example.com' };
    try { window.STCloud.syncToken = 'test-token-0001'; } catch (e) {}
    var trade = { ticket: 123, symbol: 'EURUSD', login: '9900001', direction: 'long', tick: { at: Date.now(), dg: 5 } };
    window.__stLive = Object.assign({}, window.__stLive || {}, { openIdeas: function () { return [{ main: trade, rows: [trade] }]; } });
    var realLL = window.__stLiveLine;
    window.__stLiveLine = Object.assign({}, realLL, { joined: function () { return true; }, easL: function () { return { 'EURUSD|9900001': { v: '9.15', tm: true, at: Date.now() } }; },
                                                      cmd: function (c) { sent.push(c); return true; } });
    var host = document.createElement('div'); host.id = 'ch-test'; document.body.appendChild(host);
    var paint = function () { host.innerHTML = TM.partHtml('123', { side: 'BUY', lots: '3.85', sym: 'EURUSD' }); };
    var main = function () { return host.querySelector('[data-tma="part"]'); }, chev = function () { return host.querySelector('[data-tma="partmenu"]'); };
    TM.on(function () { paint(); }); paint();   // whichever trade the test is on now
    ok('the button: Close 50%, with its chevron beside it', main() && /^Close 50%$/.test(main().textContent.trim()) && chev() && chev().getAttribute('aria-haspopup') === 'menu', host.textContent);
    main().click(); await W(100); paint();
    ok('pressed: asked once in its place - "Close 50% of BUY 3.85 EURUSD?" Close 50% / Keep', /Close 50% of BUY 3\.85 EURUSD\?/.test(host.textContent) && host.querySelector('[data-tma="part!"]') && /^Close 50%$/.test(host.querySelector('[data-tma="part!"]').textContent) && host.querySelector('[data-tma="partno"]') && !sent.length, host.textContent);
    host.querySelector('[data-tma="partno"]').click(); await W(100); paint();
    ok('Keep: back to Close 50%, nothing sent', main() && /^Close 50%$/.test(main().textContent.trim()) && !sent.length);
    main().click(); await W(100); paint();
    host.querySelector('[data-tma="part!"]').click(); await W(300); paint();
    var c = sent[0] || {};
    ok('Close 50%: one signed "part" for that ticket, 50%', sent.length === 1 && c.ca === 'part' && c.cp === '50' && c.ctk === '123' && c.csy === 'EURUSD' && c.clg === '9900001' && /^[0-9a-f]{64}$/.test(c.ch || ''), c);
    ok('...the button says Closing 50%… meanwhile', /Closing 50%…/.test(host.textContent), host.textContent);
    TM.ack({ cid: c.cid, ok: 1, ca: 'part', ctk: '123', m: '', vol: 1.92, left: 1.93, open: 1, mn: 0.01 }); await W(100); paint();
    ok('MT5 closed it: "Closed 1.92 lots" on the button, no toast', /^Closed 1\.92 lots$/.test(host.textContent.trim()) && !!host.querySelector('button.done'), [host.textContent, host.innerHTML.slice(0, 120)]);

    // ---- how much: the chevron's menu
    trade.ticket = 124; trade.symbol = 'EURUSD'; paint = function () { host.innerHTML = TM.partHtml('124', { side: 'BUY', lots: '3.57', sym: 'EURUSD' }); }; paint();
    chev().click(); await W(150); paint();
    var pm = document.querySelector('.pl-pm');
    ok('the chevron opens a small menu: 25 / 33 / 50 / 75 / 80 and a box for any 1-99, 50 picked', pm && [].map.call(pm.querySelectorAll('[data-tmpct]'), function (b) { return b.textContent; }).join(' ') === '25% 33% 50% 75% 80%' && pm.querySelector('[data-tmpct="50"]').getAttribute('aria-checked') === 'true' && pm.querySelector('input[type="number"][min="1"][max="99"]') && chev().getAttribute('aria-expanded') === 'true', pm && pm.textContent);
    pm.querySelector('[data-tmpct="25"]').click(); await W(150); paint();
    ok('25%: the menu closes and the button says Close 25%, nothing sent', !document.querySelector('.pl-pm') && /^Close 25%$/.test(main().textContent.trim()) && sent.length === 1, host.textContent);
    ok('...kept on this device', TM.partPct() === 25 && localStorage.getItem('st_partPct') === '25');
    main().click(); await W(100); paint();
    ok('pressed: "Close 25% of BUY 3.57 EURUSD?" Close 25% / Keep', /Close 25% of BUY 3\.57 EURUSD\?/.test(host.textContent) && /^Close 25%$/.test(host.querySelector('[data-tma="part!"]').textContent), host.textContent);
    host.querySelector('[data-tma="part!"]').click(); await W(300); paint();
    c = sent[1] || {};
    ok('Close 25%: the "part" goes with 25', sent.length === 2 && c.ca === 'part' && c.cp === '25' && c.ctk === '124', c);
    ok('...Closing 25%… meanwhile', /Closing 25%…/.test(host.textContent), host.textContent);
    TM.ack({ cid: c.cid, ok: 1, ca: 'part', ctk: '124', m: '', vol: 0.89, left: 2.68, open: 1, mn: 0.01 }); await W(100); paint();
    ok('...Closed 0.89 lots', /^Closed 0\.89 lots$/.test(host.textContent.trim()), host.textContent);
    // a custom share
    trade.ticket = 125; paint = function () { host.innerHTML = TM.partHtml('125', { side: 'SELL', lots: '0.40', sym: 'EURUSD' }); }; paint();
    chev().click(); await W(150);
    pm = document.querySelector('.pl-pm'); var box = pm.querySelector('input');
    box.value = '150'; pm.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true })); await W(100);
    ok('the box refuses 150 in words, the menu stays', document.querySelector('.pl-pm') && /1 to 99/.test(pm.querySelector('.pl-pme').textContent) && TM.partPct() === 25, pm.querySelector('.pl-pme').textContent);
    box.value = '60'; pm.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true })); await W(150); paint();
    ok('60 typed: the button says Close 60%, kept', !document.querySelector('.pl-pm') && /^Close 60%$/.test(main().textContent.trim()) && localStorage.getItem('st_partPct') === '60', host.textContent);
    chev().click(); await W(150);
    ok('opened again, the box shows 60 and no preset is lit', document.querySelector('.pl-pm input').value === '60' && !document.querySelector('.pl-pm [aria-checked="true"]'));
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })); await W(100);
    ok('a click elsewhere closes it', !document.querySelector('.pl-pm'));
    main().click(); await W(100); paint(); host.querySelector('[data-tma="part!"]').click(); await W(300); paint();
    c = sent[2] || {};
    ok('Close 60%: the "part" goes with 60', c.ca === 'part' && c.cp === '60' && c.ctk === '125', c);
    TM.ack({ cid: c.cid, ok: 0, ca: 'part', ctk: '125', m: 'min', vol: 0, left: 0.40, open: 1, mn: 0.01 }); await W(100); paint();
    ok('refused for the minimum lot: "Too small to split: 0.01 lots is the minimum." in its place, the button under it', /Too small to split: 0\.01 lots is the minimum\./.test(host.textContent) && main() && TM.partAsking('125'), host.textContent);
    ok('an EA before 9.15 that does not know it: "update the EA"', /update the EA/.test(TM.whyTxt('unknown')));
    var src = await fetch('/app.html', { cache: 'no-store' }).then(function (r) { return r.text(); });
    ok('Close N% sits in the platform\'s Positions rows and the phone sheet\'s open trades', (src.match(/TM\.partHtml\((tk|r\[0\]), \{ dis: !!dis/g) || []).length === 2);
    try { localStorage.removeItem('st_partPct'); } catch (e) {}
    window.__stLiveLine = realLL; host.remove();
  } catch (e) { out.push({ name: 'ran', ok: false, got: String(e && e.stack || e) }); }
  return out;
})()
