# A stand-in for EA 9.00's live line (Live Charts) (Live Charts), the same protocol as ea/MinimalistManager.mq5 - LwOpen / LwPump /
# LwOnText / LwService / LwStreamPx / LwHist / LwHi: TLS socket to port 443, a hand-written WebSocket upgrade, masked
# client frames, Phoenix vsn 1.0.0. On join and on "who" it says "hi" with its version, its chart's symbol and digits;
# a "watch" naming its symbol makes it stream "px" (bid, ask, MT5's forming 1-minute candle and the one before it) at the
# speed the watch asked for (500 / 2000 / 5000 ms, the fastest asked in the last 45 s); "hist" gets the last closed
# 1-minute candles ("bars", 300 to a message). Time runs from a given moment (a weekday, for a test on a weekend), prices
# walk from a given price. Only a throwaway test channel; nothing is written to the database.
#   python fake_ea_livecharts.py <token> <seconds> <out.json> <symbol> <start unix> <price> [digits] [login]
import base64, hashlib, hmac, json, math, os, random, socket, ssl, sys, time
HOST = 'figozyxoyobixadhqewr.supabase.co'
KEY = 'sb_publishable_h-TrkkVzrGOkwX6LxMDsaQ_hE8540Nv'
tok, secs, out, SYM, T0, P0 = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4], int(sys.argv[5]), float(sys.argv[6])
DG = int(sys.argv[7]) if len(sys.argv) > 7 else 5          # digits (gold: 2)
LG = int(sys.argv[8]) if len(sys.argv) > 8 else 90001234   # the account's login
TM = int(sys.argv[9]) if len(sys.argv) > 9 else 1          # "Manage trades from Session Terminal" on (1) or off (0)
topic = 'realtime:stl-' + hashlib.sha256(('st-live:' + tok).encode()).digest()[:16].hex()
log = {'topic': topic, 'joined': False, 'watches': [], 'unwatch': 0, 'who': 0, 'hist': [], 'hist_tf': [], 'opens': [], 'cfgs': [], 'acct': 0, 'dh': 0, 'wl': [], 'q': 0, 'syms': [], 'hub_hs': [], 'hist_by': [], 'hub_px': 0, 'bars_msgs': 0, 'px': 0, 'errors': [], 'gaps_ms': [], 'cmds': [], 'bad_sig': 0}
w0 = time.time()
def fnow(): return T0 + (time.time() - w0)          # the stand-in's clock: the given moment, running
def price_at(t):                                     # a gentle walk, the same at any moment asked twice
    return round(P0 + 0.0006 * math.sin(t / 900.0) + 0.0002 * math.sin(t / 97.0) + 0.00004 * math.sin(t * 2.3), 5)   # and a quick wobble, as a real market ticks
def bar(m):                                          # the 1-minute candle starting at m (closed, or forming up to now)
    end = min(fnow(), m + 60); pts = [price_at(m + k) for k in range(0, max(1, int(end - m)), 5)] + [price_at(end)]   # closing at the price now, as MT5's forming candle does
    return [int(m), pts[0], max(pts), min(pts), pts[-1], 10 + int(abs(pts[-1] - pts[0]) * 1e6) % 90]
def bstr(b): return '%d,%.5f,%.5f,%.5f,%.5f,%d' % tuple(b)
def bar_tf(m, step):                                 # a closed candle of another timeframe (EA 9.01's history), from the same walk
    pts = [price_at(m + k * step // 6) for k in range(6)] + [price_at(m + step - 1)]
    return [int(m), pts[0], max(pts), min(pts), pts[-1], 100]
VER = os.environ.get('ST_FAKE_V', '9.00')            # 9.01: answers history asks for other timeframes too; 9.02: the watchlist hub
# EA 9.02's hub: the broker's symbols it knows (price, digits) - its own symbol walks as above, the others alike from their price
UNI = {'EURUSD': (1.16420, 5), 'GBPUSD': (1.30112, 5), 'USDJPY': (151.204, 3), 'USDJPY.r': (151.206, 3), 'USDCHF': (0.81230, 5), 'XAUUSD': (4100.0, 2), 'BTCUSD': (67250.0, 2), 'US100.cash': (25140.6, 1)}
# another broker than FTMO (25 Oct 2026, the cross-broker test): ST_FAKE_UNI names its symbols {"EURUSD.r": [1.1642, 5], "GOLD": [4100, 2]},
# ST_FAKE_CUR its account currency
if os.environ.get('ST_FAKE_UNI'): UNI = {k: (float(v[0]), int(v[1])) for k, v in json.loads(os.environ['ST_FAKE_UNI']).items()}
if SYM not in UNI: UNI[SYM] = (P0, DG)
CUR = os.environ.get('ST_FAKE_CUR', 'GBP')
KEYME = SYM + '|' + str(LG)
def price_sym(sy, t):
    if sy == SYM: return price_at(t)
    base, dg = UNI[sy]; return round(base * (1 + 0.0005 * math.sin(t / 700.0) + 0.0002 * math.sin(t / 83.0)), dg)
def bar_sym(sy, m, step):                             # a candle of another symbol (step: seconds)
    end = min(fnow(), m + step); pts = [price_sym(sy, m + k * step // 6) for k in range(6)] + [price_sym(sy, end)]
    return [int(m), pts[0], max(pts), min(pts), pts[-1], 50]
def bstr_d(b, dg): return ('%d,%.' + str(dg) + 'f,%.' + str(dg) + 'f,%.' + str(dg) + 'f,%.' + str(dg) + 'f,%d') % tuple(b)
hub = {'wl': [], 'wl_at': 0, 'q_at': 0, 'hs': [], 'hs_at': 0, 'px_at': {}}
# EA 9.14 / 9.15 (24 Oct 2026): charts this MT5 opens on a signed "chart" (closed on "unchart"), each with the EA on it - run here, on the
# hub's prices for that symbol. ST_FAKE_CHART_MS: how long MT5 takes from the command to that chart's EA saying hi (the demo: 0.7-1.6 s)
CH = {}; CH_PEND = []; CH_PX = {}; WSYM = {'syms': [], 'lg': None}
CHART_MS = float(os.environ.get('ST_FAKE_CHART_MS', '1600')) / 1000.0
log.update({'charts': [], 'uncharts': [], 'chart_cmds': [], 'ch_px': 0, 'ch_hist': [], 'ch_first_px': {}})
def ch_dg(sy): return DG if sy == SYM else UNI[sy][1]
def hi_ch(sy):
    text(bcast('hi', {'v': VER, 'sym': sy, 'dg': ch_dg(sy), 'lg': LG, 'tm': TM, 'rl': 1 if RELAY else 0}))
    if VER >= '9.02': text(bcast('set', {'s': sy, 'lg': LG, 'st': dict(ST, pip=10 ** -(ch_dg(sy) - 1), digits=ch_dg(sy))}))
# EA 9.02: its panel's settings ("set"), deliberately unlike practice's defaults so the test can tell whose the panel shows
PIP = 10 ** -(DG - 1)
ST = {'risk_mode': 'amount', 'risk_percent': 1.0, 'risk_amount': 250.0, 'fixed_lot': 0.1, 'sl_min': 4.0, 'sl_max': 20.0, 'unit': 'pips', 'tp_on': True, 'tp_mode': 'rr', 'tp_value': 3.0,
      'tp_close_pct': 100.0, 'be_on': True, 'be_trigger_r': 1.0, 'be_offset': 0.5, 'be_offset_mode': 'pips', 'max_trades_day': 3, 'partials': '50', 'order_kind': 'market', 'exec_key': 'O',
      'active': 1, 'pip': PIP, 'ts_unit': 'rr', 'ts': '0.50', 'digits': DG}
def send_set(): text(bcast('set', {'s': SYM, 'lg': LG, 'st': ST}))
# EA 9.02's account for the app's Trade tab ("acct") and its History tab ("dh" -> "dhist")
POS = []            # [ticket, symbol, open time, type, volume, open price, sl, tp] - an order from the app adds one
acc = {'want': 0, 'at': 0}
def send_acct():
    px = price_at(fnow()); rows = []; prof = 0.0
    for tk, sy, ot, ty, vol, op, sl, tp in POS:
        p = round((px - op if ty == 'buy' else op - px) * vol * 100000, 2); prof += p
        rows.append('%s,%s,%d,%s,%.2f,%.*f,%.*f,%.*f,%.*f,%.2f,0.00,%d' % (tk, sy, ot, ty, vol, DG, op, DG, sl, DG, tp, DG, px, p, DG))
    bal = 65311.87; text(bcast('acct', {'by': KEYME, 'lg': LG, 'cur': CUR, 'bal': bal, 'eq': round(bal + prof, 2), 'mg': 0, 'fm': round(bal + prof, 2), 'ml': 0, 'pos': ';'.join(rows), 'ord': ''}))
    log['acct'] += 1
def send_dhist(p):
    t1 = int(fnow()) - 3600; t0 = t1 - 1800
    rows = ['%d,EURUSD,%d,sell,1.25,1.16210,1.16290,1.16050,%d,1.16050,-8.75,0.00,200.00,5' % (880001, t0, t1),
            '%d,XAUUSD,%d,buy,0.40,4120.50,4114.50,4138.50,%d,4114.50,-2.80,-0.42,-240.00,2' % (880002, t0 - 7200, t1 - 5400)]
    for i in range(12):   # older trades, 20 to 64 days back: only an ask for all history gets them (+100 / -100, 1.00 commission each)
        c = t1 - (20 + 4 * i) * 86400
        rows.append('%d,EURUSD,%d,buy,1.00,1.16000,1.15900,1.16100,%d,%s,-1.00,0.00,%s,5' % (870001 + i, c - 1800, c, '1.16100' if i % 2 == 0 else '1.15900', '100.00' if i % 2 == 0 else '-100.00'))
    frm = int(p.get('from') or 0)
    rows = [r for r in rows if int(r.split(',')[8]) >= frm]
    log['dh_from'] = frm
    half = (len(rows) + 1) // 2   # in two parts, as the EA sends a long history
    for i, part in enumerate([rows[:half], rows[half:]]):
        text(bcast('dhist', {'by': KEYME, 'rid': p.get('rid'), 'i': i, 'of': 2, 'dep': 1000.00, 'wd': 0.00, 'cr': 0.00, 'bal': 65311.87, 'rows': ';'.join(part)}))
    log['dh'] += 1
RELAY = os.environ.get('ST_RELAY', '')   # host:port of Session Terminal's relay on this machine (plain ws), or wss://host (the live one): the EA on the relay
if RELAY.startswith('wss://'):
    rh = RELAY[6:]; s = ssl.create_default_context().wrap_socket(socket.create_connection((rh, 443), timeout=5), server_hostname=rh); HOSTH = rh
elif RELAY:
    rh, rp = RELAY.rsplit(':', 1); s = socket.create_connection((rh, int(rp)), timeout=5); HOSTH = RELAY
else:
    raw = socket.create_connection((HOST, 443), timeout=5)
    s = ssl.create_default_context().wrap_socket(raw, server_hostname=HOST); HOSTH = HOST
s.setblocking(False)
key = base64.b64encode(bytes(random.getrandbits(8) for _ in range(16))).decode()
s.sendall(('GET /realtime/v1/websocket?apikey=' + KEY + '&vsn=1.0.0 HTTP/1.1\r\nHost: ' + HOSTH + '\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
           'Sec-WebSocket-Key: ' + key + '\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
buf = b''; state = 1; ref = [1]
def nref(): ref[0] += 1; return str(ref[0])
def frame(op, pl):
    n = len(pl); f = bytearray([0x80 | op])
    if n < 126: f.append(0x80 | n)
    elif n < 65536: f += bytes([0x80 | 126, (n >> 8) & 0xFF, n & 0xFF])
    else: f += bytes([0x80 | 127]) + n.to_bytes(8, 'big')
    m = bytes(random.getrandbits(8) for _ in range(4)); f += m
    f += bytes(pl[i] ^ m[i % 4] for i in range(n))
    while True:
        try: s.sendall(bytes(f)); return
        except (ssl.SSLWantWriteError, BlockingIOError): time.sleep(0.005)
def text(x): frame(0x1, x.encode())
def bcast(e, payload): return json.dumps({'topic': topic, 'event': 'broadcast', 'payload': {'type': 'broadcast', 'event': e, 'payload': payload}, 'ref': nref(), 'join_ref': '1'}, separators=(',', ':'))
def hi(): text(bcast('hi', {'v': VER, 'sym': SYM, 'dg': DG, 'lg': LG, 'tm': TM, 'rl': 1 if RELAY else 0}))
# trade management (EA 9.00 LwCmd): only its own account and symbol, signed with the sync token, fresh, seen once
cmd_ids = []
def on_cmd(p):
    if (p.get('csy') != SYM and p.get('csy') not in CH) or p.get('clg') != str(LG): return
    cid = p.get('cid', ''); log['cmds'].append({k: p.get(k) for k in ('ca', 'ctk', 'cp', 'ci')})
    if cid in cmd_ids: return
    cmd_ids.append(cid)
    a, tk = p.get('ca', ''), p.get('ctk', '')
    def ack(ok, why='', sl=0.0, tp=0.0):
        text(bcast('ack', {'cid': cid, 'ok': 1 if ok else 0, 'ca': a, 'ctk': tk, 'm': why, 'sl': sl, 'tp': tp, 'open': 1}))
    if a in ('chart', 'unchart') and VER >= '9.14':   # not a trade: App trading needn't be on; signed all the same
        msg = '|'.join(['v1', cid, p.get('clg', ''), p.get('csy', ''), tk, a, p.get('cp', ''), p.get('ci', ''), p.get('cts', '')])
        if hmac.new(tok.encode(), msg.encode(), hashlib.sha256).hexdigest() != p.get('ch'): log['bad_sig'] += 1; return ack(False, 'sig')
        cp = p.get('cp', '')
        if a == 'chart':
            log['chart_cmds'].append([round(time.time() - w0, 2), cp])
            if cp == SYM or cp in CH or any(x[1] == cp for x in CH_PEND): return ack(True, cp)   # there already
            if cp not in UNI: return ack(False, 'nosym')
            CH_PEND.append((time.time() + CHART_MS, cp)); return ack(True, cp)
        if VER < '9.15': return ack(False, 'unknown')
        log['uncharts'].append([round(time.time() - w0, 2), cp])
        if cp == SYM: return ack(True, cp + ':0')            # the hub's own chart is never closed
        if cp not in CH: return ack(False, 'nosym')
        if any(x[1] == cp for x in POS): return ack(False, 'open')
        del CH[cp]; return ack(True, cp + ':1')
    if not TM: return ack(False, 'off')
    msg = '|'.join(['v1', cid, p.get('clg', ''), p.get('csy', ''), tk, a, p.get('cp', ''), p.get('ci', ''), p.get('cts', '')])
    want = hmac.new(tok.encode(), msg.encode(), hashlib.sha256).hexdigest()
    if want != p.get('ch'): log['bad_sig'] += 1; return ack(False, 'sig')
    if abs(int(fnow() - (time.time() - int(p.get('cts', '0'))) - fnow())) > 120 and abs(time.time() - int(p.get('cts', '0'))) > 120: return ack(False, 'old')
    if a == 'open' and VER >= '9.02':   # a new order (EA 9.02's LwOpenCmd): placed at the price now, sized from the risk
        sy = p.get('csy'); dg = ch_dg(sy); pip = 10 ** -(dg - 1)   # its own chart's symbol (one this MT5 opened on "chart" too)
        slp = float(p.get('cp') or 0); px = price_at(fnow()) if sy == SYM else price_sym(sy, fnow()); d = 1 if slp < px else -1; pips = min(max(abs(px - slp) / pip, ST['sl_min']), ST['sl_max'])
        vol = round(ST['risk_amount'] / (pips * 10.0), 2); fill = round(px + (7 * 10 ** -dg if d > 0 else 0), dg)
        log['opens'].append({'sym': sy, 'sl': p.get('cp'), 'ci': p.get('ci'), 'dir': d, 'vol': vol, 'px': fill, 's': round(time.time() - w0, 2)})
        POS.append(['555001', sy, int(fnow()), 'buy' if d > 0 else 'sell', vol, fill, round(slp, dg), round(fill + 3 * abs(fill - slp) * d, dg)])
        return text(bcast('ack', {'cid': cid, 'ok': 1, 'ca': 'open', 'ctk': '555001', 'm': '', 'px': fill, 'vol': vol, 'dir': d, 'sym': sy}))
    if a == 'cfg' and VER >= '9.02':    # the panel's settings from Live Charts (LwCfgCmd), then the settings now in force
        log['cfgs'].append(p.get('cp')); kv = dict(x.split('=', 1) for x in str(p.get('cp') or '').split(';') if '=' in x)
        num = lambda k: float(kv[k]) if k in kv else None
        if 'on' in kv: ST['active'] = 1 if kv['on'] != '0' else 0
        if 'ord' in kv: ST['order_kind'] = {'l': 'limit', 's': 'stop'}.get(kv['ord'], 'market')
        if 'rm' in kv: ST['risk_mode'] = kv['rm']
        for k, n in (('ra', 'risk_amount'), ('rp', 'risk_percent'), ('fl', 'fixed_lot'), ('mn', 'sl_min'), ('mx', 'sl_max'), ('tpv', 'tp_value'), ('beo', 'be_offset')):
            if num(k) is not None and num(k) > 0: ST[n] = num(k)
        if 'mtd' in kv: ST['max_trades_day'] = int(float(kv['mtd']))
        if 'tpm' in kv: ST['tp_mode'] = kv['tpm']
        if 'ts' in kv: ST['ts'] = kv['ts']
        if 'pc' in kv: ST['partials'] = kv['pc']
        ack(True); return send_set()
    if a in ('sl', 'tp', 'be', 'ts', 'pc'): return ack(True, '', float(p.get('cp') or 0) if a == 'sl' else 0.0, float(p.get('cp') or 0) if a == 'tp' else 0.0)
    if a == 'close': return ack(True)
    return ack(False, 'unknown')
def inner(m):                                        # the app's own payload inside a broadcast
    try: return json.loads(m).get('payload', {}).get('payload', {}) or {}
    except Exception: return {}
watch_at = 0; fast_at = 0; mid_at = 0; sym_at = 0; hb = time.time(); last_px = 0; last_key = ''
while time.time() - w0 < secs:
    try:
        d = s.recv(65536)
        if not d: log['errors'].append('closed'); break
        buf += d
    except (ssl.SSLWantReadError, BlockingIOError): pass
    if state == 1:
        k = buf.find(b'\r\n\r\n')
        if k >= 0:
            head = buf[:k].decode(errors='replace'); buf = buf[k + 4:]
            if ' 101' not in head: log['errors'].append('upgrade refused'); break
            state = 2; hb = time.time()
            text(json.dumps({'topic': topic, 'event': 'phx_join', 'payload': {'config': {'broadcast': {'ack': False, 'self': False}, 'presence': {'enabled': False}, 'postgres_changes': [], 'private': False}}, 'ref': '1', 'join_ref': '1'}, separators=(',', ':')))
    while state >= 2 and len(buf) >= 2:
        op = buf[0] & 0x0F; masked = (buf[1] & 0x80) != 0; ln = buf[1] & 0x7F; pos = 2
        if ln == 126:
            if len(buf) < 4: break
            ln = (buf[2] << 8) | buf[3]; pos = 4
        elif ln == 127:
            if len(buf) < 10: break
            ln = int.from_bytes(buf[2:10], 'big'); pos = 10
        mk = pos
        if masked: pos += 4
        if len(buf) < pos + ln: break
        pl = buf[pos:pos + ln]
        if masked: pl = bytes(pl[i] ^ buf[mk + i % 4] for i in range(ln))
        buf = buf[pos + ln:]
        if op in (0, 1):
            m = pl.decode()
            if state == 2 and '"phx_reply"' in m and '"ref":"1"' in m:
                if '"status":"ok"' not in m: log['errors'].append('join refused: ' + m[:200]); state = 0; break
                state = 3; log['joined'] = True; hi()
                if VER >= '9.02': send_set()
            elif '"event":"watch"' in m:
                p = inner(m); now = time.time(); watch_at = now; ms = int(p.get('ms') or 2000)
                if ms <= 500: fast_at = now
                elif ms <= 2000: mid_at = now
                if SYM in str(p.get('sym') or '').split(','):   # the symbols on screen, comma-separated
                    sym_at = now if (VER < '9.03' or not p.get('lg') or int(p.get('lg')) == LG) else 0   # 9.03: only for the account the app names
                log['watches'].append([round(now - w0, 2), ms, p.get('sym', '')])
                WSYM['syms'] = str(p.get('sym') or '').split(','); WSYM['lg'] = p.get('lg')
                if VER >= '9.02' and p.get('acc') == KEYME: acc['want'] = now
                if VER >= '9.02' and p.get('hub') == KEYME:
                    hub['hs'] = [x for x in str(p.get('hs') or '').split(',') if x in UNI][:8]; hub['hs_at'] = now
                    if p.get('hs') and (not log['hub_hs'] or log['hub_hs'][-1] != p.get('hs')): log['hub_hs'].append(p.get('hs'))
            elif '"event":"wl"' in m and VER >= '9.02':
                p = inner(m)
                if p.get('by') == KEYME: hub['wl'] = [x for x in str(p.get('syms') or '').split(',') if x in UNI][:40]; hub['wl_at'] = time.time(); hub['q_at'] = 0; log['wl'].append(p.get('syms'))
            elif '"event":"dh"' in m and VER >= '9.02':
                p = inner(m)
                if p.get('by') == KEYME: send_dhist(p)
            elif '"event":"syms"' in m and VER >= '9.02':
                p = inner(m)
                if p.get('by') == KEYME:
                    q = str(p.get('q') or '').upper(); log['syms'].append(q)
                    hits = [x for x in UNI if x.upper().startswith(q)] + [x for x in UNI if q in x.upper() and not x.upper().startswith(q)]
                    text(bcast('symlist', {'by': KEYME, 'q': p.get('q'), 'r': ','.join(hits[:20])}))
            elif '"event":"unwatch"' in m: watch_at = fast_at = mid_at = sym_at = 0; log['unwatch'] += 1
            elif '"event":"who"' in m:
                log['who'] += 1; hi()
                if VER >= '9.02': send_set()
                for sy in list(CH): hi_ch(sy)
            elif '"event":"cmd"' in m: on_cmd(inner(m))
            elif '"event":"hist"' in m:
                p = inner(m)
                tf = int(p.get('tf') or 1) if VER >= '9.01' else 1
                if p.get('sym') in CH and not p.get('by'):   # a chart this MT5 opened on "chart": its own EA's history
                    sy = p.get('sym'); dg = ch_dg(sy); step = tf * 60; n = max(1, min(5000 if tf > 1 else 1500, int(p.get('n') or 600))); log['ch_hist'].append([sy, tf, n])
                    c0 = int(fnow()) - int(fnow()) % step
                    rows = [bstr_d(bar_sym(sy, c0 - step * k, step), dg) for k in range(n, 0, -1)]
                    per = 1000 if tf > 1 else 300; parts = [rows[i:i + per] for i in range(0, len(rows), per)]
                    for i, pr in enumerate(parts):
                        text(bcast('bars', {'s': sy, 'tf': tf, 'i': i, 'of': len(parts), 'rows': ';'.join(pr), 'lg': LG})); log['bars_msgs'] += 1
                elif p.get('sym') == SYM and tf > 1:
                    n = max(1, min(5000, int(p.get('n') or 600))); log['hist_tf'].append([tf, n]); step = tf * 60
                    c0 = int(fnow()) - int(fnow()) % step
                    rows = [bstr(bar_tf(c0 - step * k, step)) for k in range(n, 0, -1)]
                    parts = [rows[i:i + 1000] for i in range(0, len(rows), 1000)]
                    for i, pr in enumerate(parts):
                        text(bcast('bars', {'s': SYM, 'tf': tf, 'i': i, 'of': len(parts), 'rows': ';'.join(pr)})); log['bars_msgs'] += 1
                elif VER >= '9.02' and p.get('sym') != SYM and p.get('by') == KEYME and p.get('sym') in UNI:   # the hub: a symbol with no chart of its own
                    sy = p.get('sym'); dg = UNI[sy][1]; step = tf * 60; n = max(1, min(5000 if tf > 1 else 1500, int(p.get('n') or 600))); log['hist_by'].append([sy, tf, n])
                    c0 = int(fnow()) - int(fnow()) % step
                    rows = [bstr_d(bar_sym(sy, c0 - step * k, step), dg) for k in range(n, 0, -1)]
                    per = 1000 if tf > 1 else 300; parts = [rows[i:i + per] for i in range(0, len(rows), per)]
                    for i, pr in enumerate(parts):
                        text(bcast('bars', {'s': sy, 'tf': tf, 'i': i, 'of': len(parts), 'rows': ';'.join(pr)})); log['bars_msgs'] += 1
                elif p.get('sym') == SYM and VER >= '9.03' and p.get('lg') and int(p.get('lg')) != LG: pass   # 9.03: asked of another account's EA
                elif p.get('sym') == SYM:
                    n = max(1, min(1500, int(p.get('n') or 600))); log['hist'].append(n)
                    cur = int(fnow()) - int(fnow()) % 60
                    rows = [bstr(bar(cur - 60 * k)) for k in range(n, 0, -1)]
                    parts = [rows[i:i + 300] for i in range(0, len(rows), 300)]
                    for i, pr in enumerate(parts):
                        text(bcast('bars', dict({'s': SYM, 'tf': 1, 'i': i, 'of': len(parts), 'rows': ';'.join(pr)}, **({'lg': LG} if VER >= '9.03' else {})))); log['bars_msgs'] += 1
            elif '"phx_error"' in m or '"phx_close"' in m: log['errors'].append('channel closed'); state = 0
        elif op == 8: log['errors'].append('server close'); state = 0
        elif op == 9: frame(0xA, pl)
    if state == 0: break
    now = time.time()
    if state >= 2 and now - hb >= 25: hb = now; text(json.dumps({'topic': 'phoenix', 'event': 'heartbeat', 'payload': {}, 'ref': nref()}, separators=(',', ':')))
    if state == 3 and watch_at and now - watch_at < 45 and sym_at and now - sym_at < 45:
        iv = 0.1 if RELAY else (0.5 if (fast_at and now - fast_at < 45) else (2.0 if (mid_at and now - mid_at < 45) else 5.0))   # the relay: every tick (10 a second at most)
        if now - last_px >= iv:
            t = fnow(); m0 = int(t) - int(t) % 60; b = price_at(t); a = round(b + 7 * 10 ** -DG, 5)   # a spread of 0.7 pips (7 points on gold)
            p = {'s': SYM, 'b': b, 'a': a, 't': int(t), 'dg': DG, 'bar': bstr(bar(m0)), 'pb': bstr(bar(m0 - 60))}
            if VER >= '9.03': p['lg'] = LG   # 9.03: whose prices
            key = '%s|%s' % (b, p['bar'])
            if key != last_key:
                text(bcast('px', p)); log['px'] += 1; last_key = key
                if last_px: log['gaps_ms'].append(int((now - last_px) * 1000))
                last_px = now
    # the charts opened on "chart": their EAs say hi when MT5 has them up, then stream when the app shows them (for this account)
    while state == 3 and CH_PEND and CH_PEND[0][0] <= now:
        _, sy = CH_PEND.pop(0); CH[sy] = now; log['charts'].append([round(now - w0, 2), sy]); hi_ch(sy)
    if state == 3 and watch_at and now - watch_at < 45 and (VER < '9.03' or not WSYM['lg'] or int(WSYM['lg']) == LG):
        for sy in list(CH):
            if sy not in WSYM['syms'] or now - CH_PX.get(sy, 0) < (0.1 if RELAY else 0.5): continue
            t = fnow(); dg = ch_dg(sy); m0 = int(t) - int(t) % 60; b = price_sym(sy, t)
            text(bcast('px', {'s': sy, 'b': b, 'a': round(b + 7 * 10 ** -dg, dg), 't': int(t), 'dg': dg, 'bar': bstr_d(bar_sym(sy, m0, 60), dg), 'pb': bstr_d(bar_sym(sy, m0 - 60, 60), dg), 'lg': LG}))
            CH_PX[sy] = now; log['ch_px'] += 1
            if sy not in log['ch_first_px']: log['ch_first_px'][sy] = round(now - w0, 2)
    if state == 3 and VER >= '9.02' and acc['want'] and now - acc['want'] < 45 and now - acc['at'] >= (0.5 if RELAY else 2.0): acc['at'] = now; send_acct()
    # the hub (9.02): the list's prices once a second, and the price of each symbol on screen with no chart of its own
    if state == 3 and VER >= '9.02' and watch_at and now - watch_at < 45:
        if hub['wl'] and now - hub['wl_at'] < 45 and now - hub['q_at'] >= 1.0:
            t = fnow(); rows = []
            for sy in hub['wl']:
                dg = DG if sy == SYM else UNI[sy][1]; b = price_sym(sy, t); pc = price_sym(sy, t - 86400 * 1.3)
                rows.append(('%s,%.' + str(dg) + 'f,%.' + str(dg) + 'f,%.' + str(dg) + 'f,%d') % (sy, b, b + 7 * 10 ** -dg, pc, dg))
            text(bcast('q', {'by': KEYME, 'r': ';'.join(rows)})); log['q'] += 1; hub['q_at'] = now
        if hub['hs'] and now - hub['hs_at'] < 45:
            for sy in hub['hs']:
                if now - hub['px_at'].get(sy, 0) < (0.1 if RELAY else 0.5): continue
                t = fnow(); dg = UNI[sy][1]; m0 = int(t) - int(t) % 60; b = price_sym(sy, t)
                text(bcast('px', {'s': sy, 'b': b, 'a': round(b + 7 * 10 ** -dg, dg), 't': int(t), 'dg': dg, 'bar': bstr_d(bar_sym(sy, m0, 60), dg), 'pb': bstr_d(bar_sym(sy, m0 - 60, 60), dg)}))
                hub['px_at'][sy] = now; log['hub_px'] += 1
    if int(now) != int(now - 0.03): json.dump(log, open(out, 'w'), indent=1)
    time.sleep(0.02)
try: s.close()
except Exception: pass
log['gaps_ms'] = log['gaps_ms'][-40:]
json.dump(log, open(out, 'w'), indent=1)
print(json.dumps({k: v for k, v in log.items() if k not in ('watches',)}))
