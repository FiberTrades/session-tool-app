# A stand-in for EA 8.98's live line, byte for byte the same protocol as LwOpen / LwFrame / LwPump / LwOnText /
# LwService / LwStream in ea/MinimalistManager.mq5: TLS socket to port 443, a hand-written WebSocket upgrade, masked
# client frames, Phoenix vsn 1.0.0 (phx_join, heartbeat, broadcast). Only a throwaway test channel; nothing is written
# to the database.
#   python fake_ea_line.py <token> <seconds> <out.json> [ticket]
import base64, hashlib, json, os, random, socket, ssl, sys, time
HOST = 'figozyxoyobixadhqewr.supabase.co'
KEY = 'sb_publishable_h-TrkkVzrGOkwX6LxMDsaQ_hE8540Nv'
tok, secs, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
ticket = int(sys.argv[4]) if len(sys.argv) > 4 else 990011
topic = 'realtime:stl-' + hashlib.sha256(('st-live:' + tok).encode()).digest()[:16].hex()
log = {'topic': topic, 'events': [], 'sent_ticks': 0, 'watch': 0, 'unwatch': 0, 'joined': False, 'errors': []}
t0 = time.time()
def ev(x): log['events'].append([round(time.time() - t0, 3), x])
raw = socket.create_connection((HOST, 443), timeout=5)
s = ssl.create_default_context().wrap_socket(raw, server_hostname=HOST)
s.setblocking(False)
key = base64.b64encode(bytes(random.getrandbits(8) for _ in range(16))).decode()
req = ('GET /realtime/v1/websocket?apikey=' + KEY + '&vsn=1.0.0 HTTP/1.1\r\nHost: ' + HOST + '\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
       'Sec-WebSocket-Key: ' + key + '\r\nSec-WebSocket-Version: 13\r\n\r\n')
s.sendall(req.encode())
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
watch_at = 0; hb = time.time(); last_send = 0; px = 1.12433; n_tick = 0
bar_t = int(time.time()) - int(time.time()) % 60
while time.time() - t0 < secs:
    try:
        d = s.recv(65536)
        if not d: log['errors'].append('closed'); break
        buf += d
    except (ssl.SSLWantReadError, BlockingIOError): pass
    if state == 1:
        k = buf.find(b'\r\n\r\n')
        if k >= 0:
            head = buf[:k].decode(errors='replace'); buf = buf[k + 4:]
            ev('upgrade ' + head.split('\r\n')[0])
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
                state = 3; log['joined'] = True; ev('joined')
                text(bcast('hi', {'v': '8.98'}))
            elif '"event":"watch"' in m: watch_at = time.time(); log['watch'] += 1; ev('watch')
            elif '"event":"unwatch"' in m: watch_at = 0; log['unwatch'] += 1; ev('unwatch')
            elif '"phx_error"' in m or '"phx_close"' in m: log['errors'].append('channel closed'); state = 0
        elif op == 8: log['errors'].append('server close'); state = 0
        elif op == 9: frame(0xA, pl)
    if state == 0: break
    now = time.time()
    if state >= 2 and now - hb >= 25: hb = now; text(json.dumps({'topic': 'phoenix', 'event': 'heartbeat', 'payload': {}, 'ref': nref()}, separators=(',', ':')))
    if state == 3 and watch_at and now - watch_at < 45 and now - last_send >= 0.25:
        # a sell drifting down: the forming candle's high/low/close move with it
        n_tick += 1; px = round(px - 0.00001 * (1 if n_tick % 3 else -1), 5)
        o, h, l = 1.12440, max(1.12440, px, 1.12452), min(1.12440, px)
        tk = {'k': ticket, 'r': round((1.12433 - px) / 0.00045, 3), 'pnl': round((1.12433 - px) * 1664000, 2), 'sl': -0.889, 'tp': 4.444, 'lad': 'B:1.82:0.11:0',
              'px': px, 'op': 1.12433, 'rpx': 0.00045, 'dg': 5, 'bar': '%d,%.5f,%.5f,%.5f,%.5f,60' % (bar_t, o, h, l, px), 'sp': 0.00001, 'n': log['sent_ticks'] + 1, 'ts': int(time.time() * 1000)}
        text(bcast('tick', tk)); last_send = now; log['sent_ticks'] += 1; log['last'] = tk
    if int(now) != int(now - 0.03): json.dump(log, open(out, 'w'), indent=1)   # kept current: the runner stops this process
    time.sleep(0.025)
try: s.close()
except Exception: pass
json.dump(log, open(out, 'w'), indent=1)
print(json.dumps({k: v for k, v in log.items() if k not in ('events', 'last')}))
