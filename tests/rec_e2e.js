// End-to-end test: recording the chart (27 Oct 2026). Run by tests/rec_run.py, which drives these steps one at a time (the Start click needs a
// real click for the browser, so it comes from outside the page): the Record button in the platform's top bar, the set-up (formats, camera
// with its preview, microphone with its meter, Streamer mode on), a 5 s recording per format with Edge's stand-in camera and microphone, the
// platform as the video shows it (no positions, P&L, balance, account name or login; sizes and money blurred; R stays), the floating control
// on screen but never in the video, and the file: its size per format, its sound, its name. A stand-in EA 9.03 through a local relay and a
// made-up open trade; nothing live is touched.
//   python tests/rec_run.py
(function () {
  var W = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var $ = function (s) { return document.querySelector(s); };
  var errs = []; window.addEventListener('error', function (e) { errs.push(String(e.message)); });
  var mk = function () { var res = []; return { res: res, check: function (name, cond, got) { res.push({ name: name, ok: !!cond, got: got === undefined ? null : got }); } }; };
  var vis = function (el) { if (!el) return false; var cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length > 0; };
  // the text a viewer can read inside the platform: shown, and not blurred
  var readable = function (root) { var out = [], tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
    while ((n = tw.nextNode())) { var el = n.parentElement, ok = !!(el && el.getClientRects().length) && n.nodeValue.trim();
      for (var a = el; ok && a && a !== root.parentElement; a = a.parentElement) { var cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || /blur/.test(cs.filter)) ok = false; }
      if (ok) out.push(n.nodeValue.trim()); }
    return out.join(' | '); };
  var T0 = Date.UTC(2026, 9, 14, 8, 30) / 1000;
  window.__recT = {
    errs: function () { return errs.slice(0, 5); },
    setup: async function () { var C = mk(), check = C.check;
      try {
        for (var i0 = 0; i0 < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stRec); i0++) await W(100);
        await W(800);
        try { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); } catch (e) {}
        var P = window.__stPractice, LC = window.__stLC;
        P._lvClock(T0 * 1000 - Date.now()); window.isSessionLive = function () { return true; };
        window.__stPlatOff = false; window.__stLcForce = true; await W(1200);
        document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
        window.STCloud.syncToken = '__TOK__'; window.__stRelayURL = '__RELAY__';
        try { var C0 = P._cfg(); C0.layout = 1; C0.lv = {}; C0.tfs = [15, 1, 60, 240]; C0.syms = []; C0.mini = false; C0.resume = null; delete C0.lookDk; C0.look = {}; } catch (e) {}
        try { localStorage.removeItem('st_plat'); localStorage.removeItem('st_rec'); } catch (e) {}
        var acc0 = (data.accounts || [])[0] || {};
        data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-plat', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
        data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-plat' });
        document.querySelector('.tab[data-page="livecharts"]').click();
        for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh && P._panes()[0] && P._panes()[0].bars && P._panes()[0].bars.length); k++) await W(250);
        await W(1500);
        var win = $('#stpr-win'); check('the platform is on (a computer)', win.classList.contains('plat') && P._plat().on, win.className);
        var p0 = P._panes()[0], last = p0.bars[p0.bars.length - 1].close;
        var rr = { symbol: 'EURUSD', ticket: 7001, login: 90001234, direction: 'long', lots: 13.5, openedAt: Date.now() - 50 * 60000, risk0: 250, risk: 250,
          tick: { op: last - 0.0005, rpx: 0.0007, sl: -1, tp: 2, r: 0.7, pnl: 175, px: last, at: Date.now(), dg: 5, lad: '' } };
        window.__stLive = window.__stLive || {}; window.__stLive.openIdeas = function () { rr.tick.at = Date.now(); return [{ main: rr, rows: [rr] }]; };
        for (k = 0; k < 30 && document.querySelectorAll('.pl-tag:not([hidden])').length < 3; k++) await W(250); await W(500);
        check('the open trade\'s tags on the chart', document.querySelectorAll('.pl-tag:not([hidden])').length >= 3, Array.prototype.map.call(document.querySelectorAll('.pl-tag'), function (t) { return t.textContent; }));
        for (k = 0; k < 20 && !$('.plat-top .pl-rec'); k++) await W(150);
        var rb = $('.plat-top .pl-rec'), sn = $('.plat-top #stpr-snapbtn'), rbr = rb && rb.getBoundingClientRect(), snr = sn && sn.getBoundingClientRect();
        check('the Record button sits in the top bar, just left of the camera', !!rb && vis(rb) && rbr.right <= snr.left + 1 && snr.left - rbr.right < 12, rb ? [rbr.left, rbr.right, snr.left] : null);
        check('...a red dot in a ring, its name on hover', !!rb && !!rb.querySelector('circle.rd') && /Record a video|Grabar un vídeo/.test(rb.title), rb && rb.title);
        var top = $('.plat-top'); check('the top bar still fits', top.scrollWidth <= top.clientWidth + 1, [top.scrollWidth, top.clientWidth]);
        var legend = $('.pl-nm'); check('the legend carries the account in its own span', !!legend && /FTMO 70K/.test(legend.querySelector('.pl-nma') ? legend.querySelector('.pl-nma').textContent : ''), legend && legend.innerHTML);
        var tag = Array.prototype.filter.call(document.querySelectorAll('.pl-tag'), function (t) { return /BUY/.test(t.textContent); })[0];
        check('the BUY tag carries its size and money in spans of their own', !!tag && !!tag.querySelector('.pl-lots') && !!tag.querySelector('.pl-mny'), tag && tag.innerHTML.slice(0, 300));
        check('outside a recording nothing is blurred and the panels are there', !document.body.classList.contains('st-rec-sm') && vis($('.plat-right')) && vis($('#stpr-win > .lc-tb')) && !/blur/.test(getComputedStyle(tag.querySelector('.pl-lots')).filter));
      } catch (e) { check('setup ran', false, String(e && e.stack || e)); }
      return JSON.stringify(C.res); },
    // the set-up: this format, this framing, the camera and the microphone on
    sheet: async function (fmt, fit, first) { var C = mk(), check = C.check;
      try {
        $('.plat-top .pl-rec').click(); for (var k = 0; k < 20 && !$('#st-rec-bg'); k++) await W(100);
        var bg = $('#st-rec-bg'); check(fmt + ': the set-up opens', !!bg && vis(bg));
        if (first) {
          check('four formats: YouTube 16:9, Reels/TikTok/Shorts 9:16, Instagram 4:5, Square 1:1', Array.prototype.map.call(bg.querySelectorAll('[data-rf]'), function (b) { return b.textContent; }).join(' | ') === 'YouTube16:9 · 1920 × 1080 | Reels · TikTok · Shorts9:16 · 1080 × 1920 | Instagram feed4:5 · 1080 × 1350 | Square1:1 · 1080 × 1080',
            Array.prototype.map.call(bg.querySelectorAll('[data-rf]'), function (b) { return b.textContent; }));
          check('Streamer mode is on, and the platform behind already shows it', bg.querySelector('[data-rsw="sm"]').checked && document.body.classList.contains('st-rec-sm') && !vis($('.plat-right')) && !vis($('#stpr-win > .lc-tb')));
          check('1440p is offered only when the screen has the pixels (this one: 1920 × 1080)', bg.querySelector('[data-rhi="1"]').disabled === !(screen.width * (devicePixelRatio || 1) >= 2560));
          check('nothing is uploaded, said plainly', /Nothing is uploaded/.test(bg.textContent));
          var r1 = bg.querySelector('.rs').getBoundingClientRect(); check('the set-up fits the screen', r1.top >= 0 && r1.bottom <= innerHeight && r1.left >= 0 && r1.right <= innerWidth, [r1.top, r1.bottom, r1.left, r1.right]);
        }
        bg.querySelector('[data-rf="' + fmt + '"]').click(); await W(60);
        if (fit) { bg.querySelector('[data-rfit="' + fit + '"]').click(); await W(60); }
        check(fmt + ': chosen', bg.querySelector('[data-rf="' + fmt + '"]').classList.contains('on') && (fmt === 'yt' ? bg.querySelector('[data-row="fit"]').hidden && !bg.querySelector('[data-row="hi"]').hidden : !bg.querySelector('[data-row="fit"]').hidden && bg.querySelector('[data-rfit="' + fit + '"]').classList.contains('on')));
        ['cam', 'mic'].forEach(function (k2) { var i = bg.querySelector('[data-rsw="' + k2 + '"]'); if (!i.checked) { i.checked = true; i.dispatchEvent(new Event('change', { bubbles: true })); } });
        var v = bg.querySelector('.rs-cam video'); for (k = 0; k < 60 && !(v.videoWidth > 0 && window.__stRec._cfg().cam); k++) await W(100);
        await W(700);
        var lvl = bg.querySelector('.rs-mt i');
        check(fmt + ': the camera\'s live preview plays, mirrored', v.videoWidth > 0 && !bg.querySelector('.rs-cam').classList.contains('off') && /matrix\(-1/.test(getComputedStyle(v).transform), [v.videoWidth, getComputedStyle(v).transform]);
        check(fmt + ': the microphone\'s meter moves', parseFloat(lvl.style.width) > 0, lvl.style.width);
        check(fmt + ': both devices listed by name', bg.querySelector('[data-rdev="cam"]').options.length > 0 && bg.querySelector('[data-rdev="mic"]').options.length > 0 && !bg.querySelector('[data-rdev="cam"]').disabled,
          [bg.querySelector('[data-rdev="cam"]').textContent, bg.querySelector('[data-rdev="mic"]').textContent]);
        check(fmt + ': no error line', bg.querySelector('.rs-err').hidden, bg.querySelector('.rs-err').textContent);
      } catch (e) { check(fmt + ': set-up ran', false, String(e && e.stack || e)); }
      return JSON.stringify(C.res); },
    // while it records: Streamer mode on the platform, the control on screen and outside the platform
    during: async function (fmt) { var C = mk(), check = C.check;
      try {
        var st = window.__stRec.state(), win = $('#stpr-win');
        check(fmt + ': recording, the platform alone captured (Element Capture)', st.st === 'rec' && st.mode === 'el', st);
        check(fmt + ': the platform fills the window while it records', st.maxed && Math.abs(win.getBoundingClientRect().width - innerWidth) < 2, [st.maxed, win.getBoundingClientRect().width, innerWidth]);
        check(fmt + ': the canvas is the format\'s size', st.w === { yt: 1920, reel: 1080, ig: 1080, sq: 1080 }[fmt] && st.h === { yt: 1080, reel: 1920, ig: 1350, sq: 1080 }[fmt], [st.w, st.h]);
        check(fmt + ': MP4 (H.264 + AAC)', /^video\/mp4/.test(st.mime) && /avc1/.test(st.mime) && /mp4a/.test(st.mime), st.mime);
        check(fmt + ': Positions, the Watchlist and Trade Manager are off the platform', !vis($('#stpr-win > .lc-tb')) && !vis($('.plat-right')) && !vis($('.plat-rail')));
        check(fmt + ': the chart takes their room', $('#stpr-cw').getBoundingClientRect().width > win.getBoundingClientRect().width - 80, [$('#stpr-cw').getBoundingClientRect().width, win.getBoundingClientRect().width]);
        check(fmt + ': the account\'s name is off the legend', !vis($('.pl-nm .pl-nma')) && /Euro/.test($('.pl-nm').textContent), $('.pl-nm').textContent);
        var tag = Array.prototype.filter.call(document.querySelectorAll('.pl-tag'), function (t) { return /BUY/.test(t.textContent); })[0];
        check(fmt + ': the trade\'s size and money blurred, its R kept', /blur/.test(getComputedStyle(tag.querySelector('.pl-lots')).filter) && /blur/.test(getComputedStyle(tag.querySelector('.pl-mny')).filter) && /R/.test(tag.querySelector('.v').textContent) && !/blur/.test(getComputedStyle(tag.querySelector('.v')).filter));
        var txt = readable(win);
        check(fmt + ': no readable money, account name or login anywhere on the platform', !/[£$€]\s?\d|FTMO 70K|90001234|Balance|Equity/.test(txt), (txt.match(/.{0,40}([£$€]\s?\d|FTMO 70K|90001234|Balance|Equity).{0,40}/) || [''])[0]);
        check(fmt + ': the Record button is out of the top bar while it records', !vis($('.plat-top .pl-rec')));
        var ctl = $('#st-rec-ctl'), cr = ctl && ctl.getBoundingClientRect();
        check(fmt + ': the floating control is on screen: time, pause, microphone, stop', !!ctl && vis(ctl) && ctl.parentElement === document.body && !win.contains(ctl) && !!ctl.querySelector('[data-rc="pause"]') && !!ctl.querySelector('[data-rc="mute"]') && !!ctl.querySelector('[data-rc="stop"]') && cr.bottom <= innerHeight && cr.top >= 0, cr && [cr.left, cr.top, cr.width]);
        check(fmt + ': the countdown has gone', !$('#st-rec-cd'));
        // pause and mute, then back: the clock holds while paused
        var t1 = window.__stRec.state().t; ctl.querySelector('[data-rc="pause"]').click(); await W(700); var t2 = window.__stRec.state().t, ps = window.__stRec.state().st;
        ctl.querySelector('[data-rc="pause"]').click(); await W(50);
        check(fmt + ': Pause holds the clock, Resume goes on', ps === 'pause' && t2 - t1 < 120 && window.__stRec.state().st === 'rec', [ps, t1, t2]);
        ctl.querySelector('[data-rc="mute"]').click(); await W(50); var mm = ctl.querySelector('[data-rc="mute"]').getAttribute('aria-pressed'); ctl.querySelector('[data-rc="mute"]').click();
        check(fmt + ': the microphone mutes and comes back', mm === 'true' && ctl.querySelector('[data-rc="mute"]').getAttribute('aria-pressed') === 'false');
      } catch (e) { check(fmt + ': during ran', false, String(e && e.stack || e)); }
      return JSON.stringify(C.res); },
    // the test's mark: the control painted magenta and moved over the middle of the chart - none of it may reach the video
    mark: function () { var ctl = $('#st-rec-ctl'), cw = $('#stpr-cw').getBoundingClientRect(); if (!ctl) return false;
        ctl.style.background = '#ff00ff'; ctl.style.borderColor = '#ff00ff'; ctl.style.transform = 'none'; ctl.style.bottom = 'auto'; ctl.style.left = Math.round(cw.left + cw.width * 0.3) + 'px'; ctl.style.top = Math.round(cw.top + cw.height * 0.45) + 'px'; return true; },
    stop: function () { var b = $('#st-rec-ctl [data-rc="stop"]'); if (b) b.click(); return !!b; },
    // the file: its size, its length, one frame of it (handed back for the runner to keep), the control's magenta nowhere in it
    after: async function (fmt) { var C = mk(), check = C.check, frame = null;
      try {
        for (var k = 0; k < 80 && !$('#st-rec-pv'); k++) await W(100);
        for (k = 0; k < 30 && document.fullscreenElement; k++) await W(100);   // leaving full screen takes a moment
        var x = window.__stRec._last(), pv = $('#st-rec-pv');
        check(fmt + ': the preview opens with Save again and Discard', !!pv && !!pv.querySelector('[data-p="save"]') && /Discard/.test(pv.textContent) && /Saved to your Downloads/.test(pv.textContent));
        check(fmt + ': named for the symbol and the time it started', !!x && /^Session Terminal – EURUSD – \d{4}-\d\d-\d\d \d{4}\.mp4$/.test(x.name), x && x.name);
        check(fmt + ': Streamer mode, the control and full screen all undone', !document.body.classList.contains('st-rec-sm') && !document.body.classList.contains('st-rec-on') && !$('#st-rec-ctl') && !document.fullscreenElement && !window.__stPractice._lv().max,
          [document.body.className.match(/st-rec-\w+/g), !!$('#st-rec-ctl'), !!document.fullscreenElement, window.__stPractice._lv().max]);
        check(fmt + ': the panels and the Record button are back', vis($('.plat-right')) && vis($('#stpr-win > .lc-tb')) && vis($('.plat-top .pl-rec')), [vis($('.plat-right')), vis($('#stpr-win > .lc-tb')), vis($('.plat-top .pl-rec'))]);
        var v = document.createElement('video'); v.muted = true; v.src = x.url; v.preload = 'auto'; document.body.appendChild(v);
        await new Promise(function (res) { v.onloadedmetadata = res; v.onerror = res; setTimeout(res, 5000); });
        var ew = { yt: 1920, reel: 1080, ig: 1080, sq: 1080 }[fmt], eh = { yt: 1080, reel: 1920, ig: 1350, sq: 1080 }[fmt];
        check(fmt + ': the video is ' + ew + ' × ' + eh, v.videoWidth === ew && v.videoHeight === eh, [v.videoWidth, v.videoHeight]);
        check(fmt + ': about 5 s long', isFinite(v.duration) && v.duration > 3.5 && v.duration < 8, v.duration);
        check(fmt + ': drawn at about 30 frames a second', x.frames / (x.dur / 1000) > 20, [x.frames, x.dur]);
        v.currentTime = Math.min(2.5, (v.duration || 5) / 2); await new Promise(function (res) { v.onseeked = res; setTimeout(res, 4000); }); await W(150);
        var c = document.createElement('canvas'); c.width = ew; c.height = eh; var g = c.getContext('2d'); g.drawImage(v, 0, 0, ew, eh);
        var d = g.getImageData(0, 0, ew, eh).data, mag = 0, blue = 0, n = d.length / 4;
        for (var i = 0; i < d.length; i += 4) { var r = d[i], gg = d[i + 1], b = d[i + 2]; if (r > 200 && gg < 70 && b > 200) mag++; if (b > 180 && r < 110 && gg < 160 && b - r > 90) blue++; }
        check(fmt + ': the floating control is nowhere in the video (its magenta: 0 pixels)', mag < 20, mag);
        check(fmt + ': the platform is in it (the blue BUY tag and line)', blue > 150, blue);
        // the camera's corner: the stand-in camera's picture, not the chart
        var cw = Math.round(ew * (ew > eh ? 0.16 : 0.22)), m = Math.round(Math.min(ew, eh) * 0.025), cd = g.getImageData(ew - m - cw + 8, m + 8, cw - 16, cw - 16).data, cols = {};
        for (i = 0; i < cd.length; i += 16) cols[(cd[i] >> 5) + ',' + (cd[i + 1] >> 5) + ',' + (cd[i + 2] >> 5)] = 1;
        check(fmt + ': the camera sits in the top-right corner', Object.keys(cols).length > 6, Object.keys(cols).length);
        frame = c.toDataURL('image/png'); v.remove();
        pv.querySelector('[data-p="x"]').click(); await W(100);
        check(fmt + ': Discard closes the preview', !$('#st-rec-pv'));
        check(fmt + ': no errors', errs.length === 0, errs.slice(0, 3));
      } catch (e) { check(fmt + ': after ran', false, String(e && e.stack || e)); }
      return JSON.stringify({ res: C.res, frame: frame, name: (window.__stRec._last() || {}).name }); },
    // a refused screen: the set-up comes back with plain words
    refused: async function () { var C = mk(), check = C.check;
      try {
        var md = navigator.mediaDevices, g0 = md.getDisplayMedia; md.getDisplayMedia = function () { return Promise.reject(new DOMException('Permission denied', 'NotAllowedError')); };
        $('.plat-top .pl-rec').click(); await W(300);
        var bg = $('#st-rec-bg'), cam = bg.querySelector('[data-rsw="cam"]'); if (cam.checked) { cam.checked = false; cam.dispatchEvent(new Event('change', { bubbles: true })); }
        bg.querySelector('[data-r="go"]').click(); await W(800); md.getDisplayMedia = g0;
        var e2 = $('#st-rec-bg .rs-err');
        check('a refused screen: the set-up comes back and says what to do', !!e2 && !e2.hidden && /choose Share/.test(e2.textContent) && !window.__stRec._r(), e2 && e2.textContent);
        $('#st-rec-bg [data-r="close"]').click(); await W(100);
        check('Cancel closes it and Streamer mode goes with it', !$('#st-rec-bg') && !document.body.classList.contains('st-rec-sm'));
        // a blocked camera
        var gu = md.getUserMedia; md.getUserMedia = function (c) { return c && c.video ? Promise.reject(new DOMException('Permission denied', 'NotAllowedError')) : gu.call(md, c); };
        $('.plat-top .pl-rec').click(); await W(300); bg = $('#st-rec-bg'); cam = bg.querySelector('[data-rsw="cam"]'); cam.checked = true; cam.dispatchEvent(new Event('change', { bubbles: true })); await W(400); md.getUserMedia = gu;
        e2 = bg.querySelector('.rs-err');
        check('a blocked camera: plain words, and the switch goes back off', !e2.hidden && /camera is blocked/.test(e2.textContent) && !cam.checked, e2.textContent);
        $('#st-rec-bg [data-r="close"]').click(); await W(100);
      } catch (e) { check('refusals ran', false, String(e && e.stack || e)); }
      return JSON.stringify(C.res); },
    es: async function () { var C = mk(), check = C.check;
      try { var t0 = window._stT; window._stT = function (en, es) { return es; };
        $('.plat-top .pl-rec').click(); await W(300); var bg = $('#st-rec-bg');
        check('in Spanish: the set-up speaks Spanish', /Grabar un vídeo/.test(bg.textContent) && /Modo streamer/.test(bg.textContent) && /Empezar a grabar/.test(bg.textContent) && /No se sube nada/.test(bg.textContent), bg.textContent.slice(0, 200));
        $('#st-rec-bg [data-r="close"]').click(); window._stT = t0; await W(100);
      } catch (e) { check('Spanish ran', false, String(e && e.stack || e)); }
      return JSON.stringify(C.res); },
    light: async function (on) { var th = $('[data-pltheme]'), lt = $('#stpr-win').classList.contains('pl-lt'); if (lt !== on) { th.click(); await W(700); }
      if (on) { $('.plat-top .pl-rec').click(); await W(400); return !!($('#st-rec-bg') && $('#st-rec-bg').classList.contains('lt')); }
      var x = $('#st-rec-bg [data-r="close"]'); if (x) x.click(); await W(100); return !$('#stpr-win').classList.contains('pl-lt'); },
    phone: async function () { var C = mk(), check = C.check;
      try { for (var k = 0; k < 60 && !(window.__stPractice && window.__stRec); k++) await W(100); window.__stPlatOff = false; window.__stLcForce = true;
        document.querySelector('.tab[data-page="livecharts"]').click(); await W(3000);
        check('on a phone: no Record button', !$('.pl-rec') || !vis($('.pl-rec')), $('#stpr-win') && $('#stpr-win').className);
      } catch (e) { check('phone ran', false, String(e && e.stack || e)); }
      return JSON.stringify(C.res); }
  };
  return true;
})()
