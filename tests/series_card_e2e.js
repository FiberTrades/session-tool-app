(async function () {
  // The Series of 10 share card (Nestor, 27 Oct 2026: "we need to update these, the logo is still the old one"): the picture that
  // "Download card" saves carries the app's mark - the pink monitor with its black screen - beside the wordmark, not the old ST cube.
  // A made-up completed series; the download is caught, not saved.
  // Run: python tests/browser_test.py tests/series_card_e2e.js
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = [], ok = function (name, cond, got) { out.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); };
  var hist0 = null, realClick = HTMLAnchorElement.prototype.click;
  try {
    for (var i = 0; i < 100 && typeof _seriesHist !== 'function'; i++) await W(100);
    await W(800);
    hist0 = data.history;
    var res = ['Win', 'Win', 'Lose', 'Win', 'BE', 'Win', 'Lose', 'Win', 'Win', 'BE'], rr = [2, 2.4, 0, 1.8, 0, 3, 0, 2, 2.2, 0];
    data.history = [{ date: '2026-10-21', trades: res.map(function (r, k) { return { id: 'sc' + k, date: '2026-10-' + String(12 + k).padStart(2, '0'), symbol: 'EURUSD', result: r, r: rr[k], risk: 500, setup: 'Range Mitigation', entryTime: '08:15', exitTime: '09:05' }; }) }];
    var got = null, name = '';
    HTMLAnchorElement.prototype.click = function () { if (/series/.test(this.download || '')) { got = this.href; name = this.download; } else realClick.call(this); };
    document.getElementById('series-share-card').click();
    for (var k = 0; k < 60 && !got; k++) await W(150);
    HTMLAnchorElement.prototype.click = realClick;
    ok('Download card saves the picture', !!got && /^session-terminal-series-1\.png$/.test(name), name);
    var img = new Image(); img.src = got; await new Promise(function (r) { img.onload = r; img.onerror = r; });
    ok('a 1080 square card at twice the size', img.naturalWidth === 2160 && img.naturalHeight === 2160, [img.naturalWidth, img.naturalHeight]);
    var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; var g = c.getContext('2d'); g.drawImage(img, 0, 0);
    var count = function (x, y, w, h, f) { var d = g.getImageData(x, y, w, h).data, n = 0; for (var q = 0; q < d.length; q += 4) if (f(d[q], d[q + 1], d[q + 2])) n++; return n; };
    // the mark's box: left of the wordmark, at the card's top left (the card's own pixels are twice its layout's)
    var X = 2 * 98, Y = 2 * 80, Wd = 2 * 72, Hd = 2 * 66;
    var pink = count(X, Y, Wd, Hd, function (r, g2, b) { return r > 235 && g2 > 60 && g2 < 110 && b > 150 && b < 195; });
    var black = count(X, Y, Wd, Hd, function (r, g2, b) { return r < 4 && g2 < 4 && b < 4; });
    ok('the mark: the monitor\'s pink (#fc52ab) frame and stand', pink > 3000, pink);
    ok('...with its black screen inside (the old cube had none)', black > 1500, black);
    var cube = count(X, Y, Wd, Hd, function (r, g2, b) { return r > 230 && g2 > 110 && g2 < 140 && b > 170 && b < 200; });
    ok('...and none of the old cube\'s lighter pink', cube < 40, cube);
    // the mark's right edge (its last pink column) and the wordmark's first letter (the first light column after it)
    var col = function (x, f) { return count(x, Y, 1, Hd, f) > 0; }, isPink = function (r, g2, b) { return r > 200 && g2 < 120 && b > 140; }, isText = function (r, g2, b) { return r > 200 && g2 > 200 && b > 200; };
    var mr = -1, tl = -1; for (var cx = X; cx < X + 2 * 200; cx++) { if (col(cx, isPink)) mr = cx; else if (mr > 0 && col(cx, isText)) { tl = cx; break; } }
    ok('the wordmark sits beside the mark, a clear gap between (about 16 px)', mr > X && tl > mr && (tl - mr) >= 2 * 12 && (tl - mr) <= 2 * 26, [mr, tl, (tl - mr) / 2]);
  } catch (e) { ok('test ran', false, String(e && e.stack || e)); }
  finally { HTMLAnchorElement.prototype.click = realClick; if (hist0 !== null) data.history = hist0; }
  return JSON.stringify(out);
})()
