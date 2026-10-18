# A stand-in for EA 9.00's live line (Live Charts) (Live Charts), the same protocol as ea/MinimalistManager.mq5 - LwOpen / LwPump /
# LwOnText / LwService / LwStreamPx / LwHist / LwHi: TLS socket to port 443, a hand-written WebSocket upgrade, masked
# client frames, Phoenix vsn 1.0.0. On join and on "who" it says "hi" with its version, its chart's symbol and digits;
# a "watch" naming its symbol makes it stream "px" (bid, ask, MT5's forming 1-minute candle and the one before it) at the
# speed the watch asked for (500 / 2000 / 5000 ms, the fastest asked in the last 45 s); "hist" gets the last closed
# 1-minute candles ("bars", 300 to a message). Time runs from a given moment (a weekday, for a test on a weekend), prices
# walk from a given price. Only a throwaway test channel; nothing is written to the database.
#   python fake_ea_livecharts.py <token> <seconds> <out.json> <symbol> <start unix> <price> [digits] [login]
import base64, hashlib, hmac, json, math, random, socket, ssl, sys, time
HOST = 'figozyxoyobixadhqewr.supabase.co'
KEY = 'sb_publishable_h-TrkkVzrGOkwX6LxMDsaQ_hE8540Nv'
tok, secs, out, SYM, T0, P0 = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4], int(sys.argv[5]), float(sys.argv[6])
DG = int(sys.argv[7]) if len(sys.argv) > 7 else 5          # digits (gold: 2)
LG = int(sys.argv[8]) if len(sys.argv) > 8 else 90001234   # the account's login
TM = int(sys.argv[9]) if len(sys.argv) > 9 else 1          # "Manage trades from Session Terminal" on (1) or off (0)
topic = 'realtime:stl-' + hashlib.sha256(('st-live:' + tok).encode()).digest()[:16].hex()
log = {'topic': topic, 'joined': False, 'watches': [], 'unwatch': 0, 'who': 0, 'hist': [], 'bars_msgs': 0, 'px': 0, 'errors': [], 'gaps_ms': [], 'cmds': [], 'bad_sig': 0}
w0 = time.time()
def fnow(): return T0 + (time.time() - w0)          # the stand-in's clock: the given moment, running
def price_at(t):                                     # a gentle walk, the same at any moment asked twice
    return round(P0 + 0.0006 * math.sin(t / 900.0) + 0.0002 * math.sin(t / 97.0) + 0.00004 * math.sin(t * 2.3), 5)   # and a quick wobble, as a real market ticks
def bar(m):                                          # the 1-minute candle starting at m (closed, or forming up to now)
    end = min(fnow(), m + 60); pts = [price_at(m + k) for k in range(0, max(1, int(end - m)), 5)] + [price_at(end)]   # closing at the price now, as MT5's forming candle does
    return [int(m), pts[0], max(pts), min(pts), pts[-1], 10 + int(abs(pts[-1] - pts[0]) * 1e6) % 90]
def bstr(b): return '%d,%.5f,%.5f,%.5f,%.5f,%d' % tuple(b)
raw = socket.create_connection((HOST, 443), timeout=5)
s = ssl.create_default_context().wrap_socket(raw, server_hostname=HOST)
s.setblocking(False)
key = base64.b64encode(bytes(random.getrandbits(8) for _ in range(16))).decode()
s.sendall(('GET /realtime/v1/websocket?apikey=' + KEY + '&vsn=1.0.0 HTTP/1.1\r\nHost: ' + HOST + '\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
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
def hi(): text(bcast('hi', {'v': '9.00', 'sym': SYM, 'dg': DG, 'lg': LG, 'tm': TM}))
# trade management (EA 9.00 LwCmd): only its own account and symbol, signed with the sync token, fresh, seen once
cmd_ids = []
def on_cmd(p):
    if p.get('csy') != SYM or p.get('clg') != str(LG): return
    cid = p.get('cid', ''); log['cmds'].append({k: p.get(k) for k in ('ca', 'ctk', 'cp', 'ci')})
    if cid in cmd_ids: return
    cmd_ids.append(cid)
    a, tk = p.get('ca', ''), p.get('ctk', '')
    def ack(ok, why='', sl=0.0, tp=0.0):
        text(bcast('ack', {'cid': cid, 'ok': 1 if ok else 0, 'ca': a, 'ctk': tk, 'm': why, 'sl': sl, 'tp': tp, 'open': 1}))
    if not TM: return ack(False, 'off')
    msg = '|'.join(['v1', cid, p.get('clg', ''), p.get('csy', ''), tk, a, p.get('cp', ''), p.get('ci', ''), p.get('cts', '')])
    want = hmac.new(tok.encode(), msg.encode(), hashlib.sha256).hexdigest()
    if want != p.get('ch'): log['bad_sig'] += 1; return ack(False, 'sig')
    if abs(int(fnow() - (time.time() - int(p.get('cts', '0'))) - fnow())) > 120 and abs(time.time() - int(p.get('cts', '0'))) > 120: return ack(False, 'old')
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
            elif '"event":"watch"' in m:
                p = inner(m); now = time.time(); watch_at = now; ms = int(p.get('ms') or 2000)
                if ms <= 500: fast_at = now
                elif ms <= 2000: mid_at = now
                if SYM in str(p.get('sym') or '').split(','): sym_at = now   # the symbols on screen, comma-separated
                log['watches'].append([round(now - w0, 2), ms, p.get('sym', '')])
            elif '"event":"unwatch"' in m: watch_at = fast_at = mid_at = sym_at = 0; log['unwatch'] += 1
            elif '"event":"who"' in m: log['who'] += 1; hi()
            elif '"event":"cmd"' in m: on_cmd(inner(m))
            elif '"event":"hist"' in m:
                p = inner(m)
                if p.get('sym') == SYM:
                    n = max(1, min(1500, int(p.get('n') or 600))); log['hist'].append(n)
                    cur = int(fnow()) - int(fnow()) % 60
                    rows = [bstr(bar(cur - 60 * k)) for k in range(n, 0, -1)]
                    parts = [rows[i:i + 300] for i in range(0, len(rows), 300)]
                    for i, pr in enumerate(parts):
                        text(bcast('bars', {'s': SYM, 'tf': 1, 'i': i, 'of': len(parts), 'rows': ';'.join(pr)})); log['bars_msgs'] += 1
            elif '"phx_error"' in m or '"phx_close"' in m: log['errors'].append('channel closed'); state = 0
        elif op == 8: log['errors'].append('server close'); state = 0
        elif op == 9: frame(0xA, pl)
    if state == 0: break
    now = time.time()
    if state >= 2 and now - hb >= 25: hb = now; text(json.dumps({'topic': 'phoenix', 'event': 'heartbeat', 'payload': {}, 'ref': nref()}, separators=(',', ':')))
    if state == 3 and watch_at and now - watch_at < 45 and sym_at and now - sym_at < 45:
        iv = 0.5 if (fast_at and now - fast_at < 45) else (2.0 if (mid_at and now - mid_at < 45) else 5.0)
        if now - last_px >= iv:
            t = fnow(); m0 = int(t) - int(t) % 60; b = price_at(t); a = round(b + 7 * 10 ** -DG, 5)   # a spread of 0.7 pips (7 points on gold)
            p = {'s': SYM, 'b': b, 'a': a, 't': int(t), 'dg': DG, 'bar': bstr(bar(m0)), 'pb': bstr(bar(m0 - 60))}
            key = '%s|%s' % (b, p['bar'])
            if key != last_key:
                text(bcast('px', p)); log['px'] += 1; last_key = key
                if last_px: log['gaps_ms'].append(int((now - last_px) * 1000))
                last_px = now
    if int(now) != int(now - 0.03): json.dump(log, open(out, 'w'), indent=1)
    time.sleep(0.02)
try: s.close()
except Exception: pass
log['gaps_ms'] = log['gaps_ms'][-40:]
json.dump(log, open(out, 'w'), indent=1)
print(json.dumps({k: v for k, v in log.items() if k not in ('watches',)}))
