# Session Terminal live relay (Nestor, 18 Oct 2026: "relay first"). Passes the live line's messages between a member's EAs
# (MT5) and the app, so prices can go out at full speed all day: a flat-cost server instead of a service that charges per
# message. It speaks the same Phoenix wire format (vsn 1.0.0, JSON objects) as Supabase Realtime's broadcast, which both the
# EA and the app already use, so only the address changes:
#   phx_join   a topic "realtime:stl-<32 hex>" (the room is named from the member's sync token: unguessable)
#   heartbeat  on "phoenix", answered
#   broadcast  sent on to everyone else in the room (as Supabase does with self: false)
#   phx_leave  leaves the room
# It stores nothing and reads no message's contents beyond the envelope. Trade commands are signed by the app (HMAC with the
# sync token) and checked by the EA, so the relay cannot act on a trade and neither can anyone who only knows a room's name.
# Python standard library only (asyncio): run with `python server.py` (PORT from the environment, 8080 by default; HOST too,
# every address by default - on Session Terminal's own server it listens on 127.0.0.1 behind Caddy, which holds the certificate).
import asyncio, base64, hashlib, json, os, re, struct, time

PORT = int(os.environ.get('PORT', '8080'))
HOST = os.environ.get('HOST', '0.0.0.0')
GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
TOPIC = re.compile(r'^realtime:stl-[0-9a-f]{32}$')
MAX_MSG = 256 * 1024           # the largest message (a "bars" reply of 300 candles is ~20 KB)
MAX_RATE = 80                  # messages a second one connection may send (a tick stream is at most 10)
MAX_ROOM = 24                  # connections in one room (a member's EAs and app windows)
MAX_BUF = 2 * 1024 * 1024      # a receiver this far behind is dropped rather than slowing the room
IDLE_S = 120                   # nothing heard for this long: closed (the EA and the app send a heartbeat every 25 s)

rooms = {}                     # topic -> set of Conn
stats = {'conns': 0, 'msgs': 0, 'bytes': 0, 'since': time.time()}


class Conn:
    def __init__(self, reader, writer):
        self.r, self.w = reader, writer
        self.topics = set()
        self.closed = False
        self.win_at, self.win_n = time.time(), 0
        self.last = time.time()

    async def send_text(self, text):
        if self.closed: return
        data = text.encode('utf-8'); n = len(data)
        head = bytes([0x81])
        if n < 126: head += bytes([n])
        elif n < 65536: head += bytes([126]) + struct.pack('!H', n)
        else: head += bytes([127]) + struct.pack('!Q', n)
        try:
            if self.w.transport.get_write_buffer_size() > MAX_BUF: self.close(); return
            self.w.write(head + data)
        except Exception:
            self.close()

    def send_raw(self, op, payload=b''):
        if self.closed: return
        try: self.w.write(bytes([0x80 | op, len(payload)]) + payload)
        except Exception: self.close()

    def close(self):
        if self.closed: return
        self.closed = True
        for t in list(self.topics):
            room = rooms.get(t)
            if room is not None:
                room.discard(self)
                if not room: rooms.pop(t, None)
        self.topics.clear()
        try: self.w.close()
        except Exception: pass


def reply(topic, ref, join_ref=None, status='ok', response=None):
    return json.dumps({'topic': topic, 'event': 'phx_reply', 'payload': {'status': status, 'response': response or {}}, 'ref': ref, 'join_ref': join_ref}, separators=(',', ':'))


async def on_message(c, text):
    try: m = json.loads(text)
    except Exception: return
    if not isinstance(m, dict): return
    topic, event, ref, jref = m.get('topic'), m.get('event'), m.get('ref'), m.get('join_ref')
    if event == 'heartbeat':
        await c.send_text(reply('phoenix', ref)); return
    if not isinstance(topic, str): return
    if event == 'phx_join':
        if not TOPIC.match(topic):
            await c.send_text(reply(topic, ref, jref, 'error', {'reason': 'unknown topic'})); return
        room = rooms.setdefault(topic, set())
        if c not in room and len(room) >= MAX_ROOM:
            await c.send_text(reply(topic, ref, jref, 'error', {'reason': 'room full'})); return
        room.add(c); c.topics.add(topic)
        await c.send_text(reply(topic, ref, jref)); return
    if event == 'phx_leave':
        room = rooms.get(topic)
        if room is not None: room.discard(c)
        c.topics.discard(topic)
        await c.send_text(reply(topic, ref, jref)); return
    if event == 'broadcast' and topic in c.topics:
        p = m.get('payload') if isinstance(m.get('payload'), dict) else {}
        out = json.dumps({'topic': topic, 'event': 'broadcast', 'payload': {'type': 'broadcast', 'event': p.get('event'), 'payload': p.get('payload')}, 'ref': None}, separators=(',', ':'))
        for o in list(rooms.get(topic, ())):
            if o is not c: await o.send_text(out)
        stats['msgs'] += 1; stats['bytes'] += len(out)
        return
    # anything else (access_token, presence ...): accepted and ignored
    if ref is not None and event not in ('broadcast',):
        await c.send_text(reply(topic, ref, jref))


def unmask(data, mk):
    n = len(data)
    if not n: return data
    m = (mk * (n // 4 + 1))[:n]
    return (int.from_bytes(data, 'big') ^ int.from_bytes(m, 'big')).to_bytes(n, 'big')


async def ws_loop(c, buf=b''):
    frag_op, frag = None, b''
    while not c.closed:
        try:
            chunk = await asyncio.wait_for(c.r.read(65536), timeout=IDLE_S)
        except asyncio.TimeoutError:
            break
        except Exception:
            break
        if not chunk: break
        c.last = time.time()
        buf += chunk
        while len(buf) >= 2:
            b0, b1 = buf[0], buf[1]
            fin, op, masked, ln = b0 & 0x80, b0 & 0x0F, b1 & 0x80, b1 & 0x7F
            pos = 2
            if ln == 126:
                if len(buf) < 4: break
                ln = struct.unpack('!H', buf[2:4])[0]; pos = 4
            elif ln == 127:
                if len(buf) < 10: break
                ln = struct.unpack('!Q', buf[2:10])[0]; pos = 10
            if ln > MAX_MSG: c.close(); return
            mk = buf[pos:pos + 4] if masked else b''
            if masked: pos += 4
            if len(buf) < pos + ln: break
            data = buf[pos:pos + ln]; buf = buf[pos + ln:]
            if masked: data = unmask(data, mk)
            if op == 0x8: c.send_raw(0x8); c.close(); return             # close
            if op == 0x9: c.send_raw(0xA, data[:125]); continue           # ping -> pong
            if op == 0xA: continue                                        # pong
            if op in (0x1, 0x2): frag_op, frag = op, data
            elif op == 0x0: frag += data
            else: continue
            if len(frag) > MAX_MSG: c.close(); return
            if not fin: continue
            now = time.time()
            if now - c.win_at >= 1: c.win_at, c.win_n = now, 0
            c.win_n += 1
            if c.win_n > MAX_RATE: continue                               # over its rate: dropped
            if frag_op == 0x1:
                try: await on_message(c, frag.decode('utf-8'))
                except Exception: pass
            frag_op, frag = None, b''


async def handle(reader, writer):
    c = None
    try:
        head = b''
        while b'\r\n\r\n' not in head:
            part = await asyncio.wait_for(reader.read(4096), timeout=10)
            if not part: writer.close(); return
            head += part
            if len(head) > 16384: writer.close(); return
        req, _, rest = head.partition(b'\r\n\r\n')
        lines = req.decode('latin-1').split('\r\n')
        path = lines[0].split(' ')[1] if len(lines[0].split(' ')) > 1 else '/'
        hdr = {}
        for ln in lines[1:]:
            k, _, v = ln.partition(':'); hdr[k.strip().lower()] = v.strip()
        if hdr.get('upgrade', '').lower() != 'websocket':
            body = json.dumps({'ok': True, 'rooms': len(rooms), 'conns': stats['conns'], 'msgs': stats['msgs'], 'up_s': int(time.time() - stats['since'])}).encode()
            writer.write(b'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: ' + str(len(body)).encode() + b'\r\nConnection: close\r\n\r\n' + body)
            await writer.drain(); writer.close(); return
        key = hdr.get('sec-websocket-key', '')
        if not key or not path.startswith('/realtime/v1/websocket'):
            writer.write(b'HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n'); await writer.drain(); writer.close(); return
        acc = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
        writer.write(('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n').encode())
        await writer.drain()
        c = Conn(reader, writer); stats['conns'] += 1
        await ws_loop(c, rest)   # anything sent right after the upgrade
    except Exception:
        pass
    finally:
        if c is not None: c.close(); stats['conns'] -= 1
        else:
            try: writer.close()
            except Exception: pass


async def main():
    srv = await asyncio.start_server(handle, HOST, PORT, limit=MAX_MSG * 2)
    print('relay listening on', PORT, flush=True)
    async with srv:
        await srv.serve_forever()

if __name__ == '__main__':
    asyncio.run(main())
