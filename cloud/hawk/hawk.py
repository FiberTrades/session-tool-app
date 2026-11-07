#!/usr/bin/env python3
# The hawk (5 Nov 2026) - the admin's live ST Method alerts. Admin only: nothing here reaches members.
#
# Nestor: "build like a hawk to watch the market live and send me nudges when the perfect conditions to enter a trade present
# themselves ... even before the trade opportunity presents itself you could tell me, watch for price if it retraces to 50% you
# could look for a sell". Runs on uk1 (systemd st-hawk) in the London window, weekdays 07:20-10:10:
#   * reads the account + market picked in the hawk tab (hawk_config; 6 Nov: any of his cloud MT5 accounts, EUR/USD, GBP/USD, gold
#     or US100 - the markets the study ran) over the local relay (the demo 1515070952's EURUSD until he picks): "watch" gets "px" every second with the last closed
#     1-minute candle; "hist" gets 25 h of 1-minute and 200 hour candles. It sends nothing else: never a command, never an order.
#   * every closed minute runs engine.py - the exact rules of the rule study (chart-exports/strategy-review) - and sends:
#       brief       07:45: phase, the range, premium / discount / 50%, what to wait for
#       sweep       a high / low taken where the plan trades: what to watch for next
#       pocket      a fast leg with a small range at its 50%: the pullback level, stop and target, before price comes back
#       initiation  a strong 5-minute close outside the range: don't trade against it, the pocket to buy high / sell low
#       setup       the entry itself: a reaction now, or a pullback that reached its level
#       done        10:05: how many alerts, tap to rate them
#   * red news (7 Nov 2026, Nestor: prop firms don't allow trading into it): the app's calendar, for the market's currencies. No setup
#     from NEWS_BEFORE min before a red release until NEWS_AFTER min after (a 'news' alert says it was skipped); a pullback order that
#     could still be waiting at a release is told to come out by then; the brief lists the morning's red news.
#   * each alert goes to the st-hawk edge function (stored in hawk_signals, pushed to the admin's phone, rated on hawk.html).
# Env (/etc/st-hawk.env): HAWK_KEY, HAWK_URL. `python3 hawk.py replay <csv> <YYYY-MM-DD>` prints what a past day would have sent.
import base64, datetime as dt, glob, hashlib, json, os, socket, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import engine as E

LOGIN, SYM = '1515070952', 'EURUSD'   # what it reads now: set from hawk_config (CANON = the market, SYM = the broker's own name for it)
CANON = 'EURUSD'
# the markets the study ran: the scaled pip (his EUR/USD rules sized by how far each moves 08:00-10:00 London), price decimals, name,
# and the unit distances are said in (bt/multi.py, 6 Nov 2026)
MK = {'EURUSD': (0.0001, 5, 'EUR/USD', 'pips', 0.0001), 'GBPUSD': (0.00013360655737705096, 5, 'GBP/USD', 'pips', 0.0001),
      'XAUUSD': (1.127322404371542, 2, 'Gold', '$', 1.0), 'US100': (6.01092896174864, 2, 'US100', 'points', 1.0)}
DP = 5
CURS = {'EURUSD': ('EUR', 'USD'), 'GBPUSD': ('GBP', 'USD'), 'XAUUSD': ('USD',), 'US100': ('USD',)}   # whose red news moves the market
NEWS_BEFORE, NEWS_AFTER = 10, 5   # minutes: no setup in this window around a red release (FTMO's funded rule is 2 and 2; this is stricter)
NEWS = {'t': 0, 'ev': [], 'ok': False}   # [(utc seconds, currency, title)], refreshed every 10 minutes
def canon(sym):
    u = str(sym or '').upper()
    for k in MK:
        if u.startswith(k): return k
    return u
def set_market(c):
    global CANON, DP
    CANON = c if c in MK else 'EURUSD'; E.PIP = MK[CANON][0]; DP = MK[CANON][1]
def ldt(t): return dt.datetime.fromtimestamp(E.ldn(int(t)), dt.timezone.utc).replace(tzinfo=None)   # London wall time
OPTS = ('reaction', 'continuation', 'initiation')
URL = os.environ.get('HAWK_URL', 'https://figozyxoyobixadhqewr.supabase.co/functions/v1/st-hawk')
KEY = os.environ.get('HAWK_KEY', '')

def log(*a): print(time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime()) + 'Z', *a, flush=True)
def px(v): return '%.*f' % (DP, v)
def dist(a, b):   # a distance in the market's own unit: pips, $ on gold, points on US100
    m = MK[CANON]; v = abs(a - b) / m[4]
    return '$%.2f' % v if m[3] == '$' else '%.1f %s' % (v, m[3])
def pips(a, b): return abs(a - b) / E.PIP
def hm(t): return ldt(t).strftime('%H:%M')
def word(side, buy, sell): return buy if side > 0 else sell

# ---------- what to say
class Hawk:
    def __init__(self, send):
        self.send = send; self.seen = set(); self.day = None; self.primed = False; self.count = 0; self.brief = False; self.done = False

    def new_day(self, day):
        self.day = day; self.seen = set(); self.primed = False; self.count = 0; self.brief = False; self.done = False

    def out(self, key, kind, title, body, side=None, data=None):
        if key in self.seen: return
        self.seen.add(key)
        if not self.primed: return          # first look after a (re)start: what already happened stays quiet
        self.count += kind != 'done'
        data = dict(data or {})
        for k in ('a', 'b', 'i'):                     # candle indexes -> times, for the chart
            if isinstance(data.get(k), int) and 0 <= data[k] < E.N: data['t' + k] = E.T[data[k]]
        if kind != 'done':
            try: data['chart'] = self.chart()
            except Exception as e: log('chart failed:', repr(e))
        data.update(sym=CANON, login=LOGIN, dp=DP)
        self.send(dict(day=self.day, key=(key if CANON == 'EURUSD' else CANON + ':' + key), kind=kind, side=side, title=title, body=body, data=data, symbol=CANON))

    def news_near(self, t):
        """The red release whose no-trade window holds UTC second t, for this market's currencies, else None."""
        for at, cur, title in NEWS['ev']:
            if cur in CURS.get(CANON, ('USD',)) and at - NEWS_BEFORE * 60 <= t <= at + NEWS_AFTER * 60: return (at, cur, title)
        return None

    def news_ahead(self, t, until):
        """The first red release for this market's currencies after UTC second t and before `until`, else None."""
        for at, cur, title in NEWS['ev']:
            if cur in CURS.get(CANON, ('USD',)) and t < at <= until: return (at, cur, title)
        return None

    def chart(self):
        """What the hawk is looking at, for hawk.html: ~a day of 5-minute candles and its reading of them."""
        x = self.ctx; j, last = x['j'], x['last']
        c5 = []
        for i in range(j, last + 1):
            k = E.T[i] // 300 * 300
            if c5 and c5[-1][0] == k:
                b = c5[-1]; b[2] = max(b[2], E.H[i]); b[3] = min(b[3], E.L[i]); b[4] = E.C[i]
            else: c5.append([k, E.O[i], E.H[i], E.L[i], E.C[i]])
        now = E.T[last] + 60
        off = E.LT[last] - E.T[last]
        w0 = E.LDAY[last] * 86400 + E.WIN[0] * 60 - off
        sw = sorted([(E.HB[s[2]][0], s[1], 'H') for s in E.SWH if s[0] <= now][-4:] +
                    [(E.HB[s[2]][0], s[1], 'L') for s in E.SWL if s[0] <= now][-4:])
        r5 = lambda v: round(v, 5)
        return dict(tf=5, c=[[b[0]] + [r5(v) for v in b[1:]] for b in c5],
                    phase=x['ph'], bh=r5(x['bh']), bl=r5(x['bl']), r0=E.T[j], r1=E.T[min(x['i0'] + 60, last)],
                    a2b=x['a2b'] and [r5(v) for v in x['a2b']], sw=[[t, r5(p), k] for t, p, k in sw],
                    w0=w0, w1=w0 + (E.WIN[1] - E.WIN[0]) * 60, now=now, px=r5(E.C[last]))

    def look(self, t, o, h, l, c, h1=None):
        """Called once a minute with every candle so far (oldest first)."""
        E.load(t, o, h, l, c, h1)
        last = E.N - 1
        lt = ldt(E.T[last] + 60)          # the time the last candle closed
        day = lt.strftime('%Y-%m-%d')
        if day != self.day: self.new_day(day)
        if lt.weekday() >= 5: return
        mins = lt.hour * 60 + lt.minute
        idx = [i for i in range(E.N) if E.LDAY[i] == E.LDAY[last] and E.WIN[0] - 60 <= E.LMIN[i] < E.WIN[1]]
        if not idx: return
        i0 = idx[0]
        st = E.htf_state(i0)
        if not st: return
        ph, a2b = st
        j = i0
        while j > 0 and E.T[i0] - E.T[j] < 86400: j -= 1
        bh, bl = max(E.H[j:i0]), min(E.L[j:i0]);   # fixed at 08:00 London, as the study (6 Nov)
        q = (bh - bl) / 4; mid = (bh + bl) / 2
        now = E.C[last]
        self.ctx = dict(j=j, i0=i0, last=last, ph=ph, a2b=a2b, bh=bh, bl=bl)

        if mins >= 7 * 60 + 45 and not self.brief:
            self.brief = True
            loc = 'in the premium' if now >= bh - q else 'in the discount' if now <= bl + q else 'at the 50%' if abs(now - mid) <= q / 2 else 'between the 50% and the edges'
            lines = []
            if ph == 'range':
                lines.append('Range day. Range %s–%s: premium above %s, discount below %s, 50%% at %s.' % (px(bl), px(bh), px(bh - q), px(bl + q), px(mid)))
                lines.append('Price %s, %s.' % (px(now), loc))
                lines.append('Sell idea: a high taken in the premium, then the move slows. Buy idea: a low taken in the discount, then it slows.')
                if 'at the 50%' in loc: lines.append('Nothing to do at the 50%.')
            else:
                up = ph == 'trend up'
                lines.append('%s on the hour chart (%s ×2).' % ('Trend up' if up else 'Trend down', 'higher highs and lows' if up else 'lower highs and lows'))
                if a2b:
                    m2 = sum(a2b) / 2
                    lines.append('Last leg %s → %s: its 50%% at %s is the %s zone.' % (px(a2b[0]), px(a2b[1]), px(m2), 'buy' if up else 'sell'))
                lines.append('Price %s. Range %s–%s.' % (px(now), px(bl), px(bh)))
            reds = [(at, cur, title) for at, cur, title in NEWS['ev'] if cur in CURS.get(CANON, ('USD',)) and ldt(at).strftime('%Y-%m-%d') == day and 6 * 60 <= ldt(at).hour * 60 + ldt(at).minute <= 13 * 60 + 30]
            if reds: lines.append('Red news: ' + '; '.join('%s %s %s' % (hm(at), cur, title) for at, cur, title in reds) + '. No trades from %d min before each to %d min after.' % (NEWS_BEFORE, NEWS_AFTER))
            elif NEWS['ok']: lines.append('No red news this morning for %s.' % ' or '.join(CURS.get(CANON, ('USD',))))
            else: lines.append('Red news unknown (calendar not read): check it before you trade.')
            self.out('brief', 'brief', 'London brief · ' + MK[CANON][2], ' '.join(lines),
                     data=dict(phase=ph, bh=bh, bl=bl, price=now, a2b=a2b))

        ev = []
        setups, _ = E.scan_day(idx, dict(models=OPTS, events=ev))
        recent = lambda i: i >= last - 1

        for e in ev:
            s = e['side']
            if e['kind'] == 'initiation' and recent(e['i']):
                body = 'Strong 5-minute close %s the range (%s). Don\'t %s against it.' % (word(s, 'above', 'below'), px(e['edge']), word(s, 'sell', 'buy'))
                if e.get('tgt'):
                    body += ' %s pocket: %s %s, stop %s, target %s (%.1fR).' % (word(s, 'Buy-high', 'Sell-low'), word(s, 'buy', 'sell'), px(e['entry']), px(e['stop']), px(e['tgt']), pips(e['tgt'], e['entry']) / pips(e['entry'], e['stop']))
                self.out('init:%d' % s, 'initiation', 'Initiation · ' + word(s, 'up', 'down'), body, s, e)
            elif e['kind'] == 'sweep' and recent(e['i']) and WIN_OK(mins):
                what = word(s, 'Low', 'High'); where = {'discount': 'in the discount', 'premium': 'in the premium'}.get(e['loc'], e['rule'])
                body = ('%s taken %s at %s (%s). If it slows here: %s, stop %s. If it moves away fast: wait for the pullback to the 50%% of that move.'
                        % (what, where, px(e['A']), hm(E.T[e['a']]), word(s, 'buy', 'sell'), px(e['A'] - s * 0.5 * E.PIP)))
                self.out('sweep:%d:%d' % (s, E.T[e['i']] // 1200), 'sweep', 'Watch · %s idea' % word(s, 'buy', 'sell'), body, s, e)
            elif e['kind'] == 'pocket' and e.get('tgt') and WIN_OK(mins):
                B, A = e['B'], e['A']; leg = abs(B - A)
                back = (B - now) * s if s > 0 else (now - B) * -s       # how far price has come back from B
                back = (B - now) if s > 0 else (now - B)
                at_pocket = (now <= e['entry']) if s > 0 else (now >= e['entry'])
                if last >= e['b'] + 2 and back >= 0.2 * leg and not at_pocket:
                    body = ('Fast %s %s → %s. If price comes back to %s–%s (the small range at its 50%%): %s %s, stop %s, target %s (%.1fR).'
                            % (word(s, 'rise', 'drop'), px(A), px(B), px(min(e['entry'], e['stop'] + s * 0.5 * E.PIP)), px(max(e['entry'], e['stop'] + s * 0.5 * E.PIP)),
                               word(s, 'buy', 'sell'), px(e['entry']), px(e['stop']), px(e['tgt']), pips(e['tgt'], e['entry']) / pips(e['entry'], e['stop'])))
                    nx = self.news_ahead(E.T[last] + 60, E.LDAY[last] * 86400 + E.WIN[1] * 60 - (E.LT[last] - E.T[last]))
                    if nx: body += ' Red news %s at %s: no order waiting from %s.' % (nx[1] + ' ' + nx[2], hm(nx[0]), hm(nx[0] - NEWS_BEFORE * 60))
                    self.out('pocket:%d:%d' % (s, E.T[e['a']]), 'pocket', 'Watch · 50%% pullback %s' % word(s, 'buy', 'sell'), body, s,
                             {k: e[k] for k in ('entry', 'stop', 'tgt', 'A', 'B', 'rule', 'loc')})

        for su in setups:
            s = su['side']; k = su['i'] - (0 if su.get('stopbar') else 1)    # the candle it happened on
            if not recent(k): continue
            r = pips(su['tgt'], su['entry']) / pips(su['entry'], su['stop'])
            model = su['model'].replace('·', '·')
            nn = self.news_near(E.T[k] + 60)
            if nn:   # red news: no trade (the setup is still shown, so he knows the hawk saw it and why it said no)
                self.out('news:%s:%d:%s' % (model, s, px(su['entry'])), 'news', 'No trade · red news',
                         '%s setup at %s skipped: %s %s at %s. No trades from %d min before red news to %d min after.' % (
                             word(s, 'Buy', 'Sell'), px(su['entry']), nn[1], nn[2], hm(nn[0]), NEWS_BEFORE, NEWS_AFTER), s,
                         dict(model=model, entry=su['entry'], stop=su['stop'], tgt=su['tgt'], loc=su['loc'], phase=su['phase'], news=[nn[0], nn[1], nn[2]]))
                continue
            nx = self.news_ahead(E.T[k] + 60, E.T[k] + 60 + 150 * 60)
            ahead = (' Red news %s %s at %s: be out or at break-even by %s.' % (nx[1], nx[2], hm(nx[0]), hm(nx[0] - NEWS_BEFORE * 60))) if nx else ''
            if 'reaction' in model:
                title = 'Setup · reaction %s' % word(s, 'buy', 'sell')
                body = '%s now ~%s · stop %s (%s) · target %s (%s, %.1fR). %s taken %s, the move has slowed.' % (
                    word(s, 'Buy', 'Sell'), px(su['entry']), px(su['stop']), dist(su['entry'], su['stop']), px(su['tgt']),
                    dist(su['tgt'], su['entry']), r, word(s, 'Low', 'High'), {'discount': 'in the discount', 'premium': 'in the premium'}.get(su['loc'], 'at the zone')) + ahead
            else:
                title = 'Setup · %s %s reached' % ('pocket' if 'initiation' in model else '50% pullback', word(s, 'buy', 'sell'))
                body = '%s limit %s reached · stop %s (%s) · target %s (%.1fR).%s' % (
                    word(s, 'Buy', 'Sell'), px(su['entry']), px(su['stop']), dist(su['entry'], su['stop']), px(su['tgt']), r,
                    ' It touched the stop in the same minute.' if su.get('stopbar') else '') + ahead
            self.out('setup:%s:%d:%s' % (model, s, px(su['entry'])), 'setup', title, body, s,
                     dict(model=model, entry=su['entry'], stop=su['stop'], tgt=su['tgt'], loc=su['loc'], phase=su['phase']))

        if mins >= 10 * 60 + 5 and not self.done:
            self.done = True
            if self.count: self.out('done', 'done', 'Session over · %d alert%s' % (self.count, '' if self.count == 1 else 's'),
                                    'Tap to rate them: good call, not my trade, too early or too late.')
        self.primed = True

def WIN_OK(mins): return E.WIN[0] - 30 <= mins < E.WIN[1]

# ---------- sending
def post(msg):
    if not KEY: log('no HAWK_KEY - would send', msg['title']); return
    req = urllib.request.Request(URL, data=json.dumps(msg).encode(), method='POST',
                                 headers={'content-type': 'application/json', 'x-hawk-key': KEY})
    try:
        with urllib.request.urlopen(req, timeout=20) as r: log('sent', msg['key'], r.read()[:120])
    except Exception as e: log('send failed', msg['key'], e)

def get_news():
    """Red releases from 18 h ago to 30 h ahead, from the app's calendar through st-hawk. Keeps the last list if it can't be read."""
    if not KEY: return
    now = time.time(); f = dt.datetime.fromtimestamp(now - 18 * 3600, dt.timezone.utc).isoformat(); t = dt.datetime.fromtimestamp(now + 30 * 3600, dt.timezone.utc).isoformat()
    req = urllib.request.Request(URL, data=json.dumps({'news': True, 'from': f, 'to': t}).encode(), method='POST', headers={'content-type': 'application/json', 'x-hawk-key': KEY})
    try:
        with urllib.request.urlopen(req, timeout=15) as r: d = json.loads(r.read())
        ev = []
        for e in d.get('events') or []:
            try: ev.append((int(dt.datetime.fromisoformat(str(e['at']).replace('Z', '+00:00')).timestamp()), str(e.get('currency') or '').upper(), str(e.get('title') or '')[:60]))
            except Exception: pass
        NEWS['ev'] = sorted(ev); NEWS['ok'] = True; NEWS['t'] = now
    except Exception as e: log('news failed:', e)

def get_cfg():
    """The account + market picked in the hawk tab (hawk_config, read through st-hawk). None if it can't be read."""
    if not KEY: return None
    req = urllib.request.Request(URL, data=b'{"config":true}', method='POST', headers={'content-type': 'application/json', 'x-hawk-key': KEY})
    try:
        with urllib.request.urlopen(req, timeout=15) as r: d = json.loads(r.read())
        lg, sy = str(d.get('login') or ''), canon(d.get('sym'))
        return (lg, sy) if lg.isdigit() and sy in MK else None
    except Exception as e: log('config failed:', e); return None

# ---------- the relay line (read-only: watch + hist)
class Line:
    def __init__(self):
        self.mode = None; self.key = ''; self.raw_sym = ''; self.app_hs = []; self.t_app = 0
        tpl = glob.glob('/home/st/members/*.%s/drive_c/ST/%s/MQL5/Profiles/Templates/STCloudEA.tpl' % (LOGIN, LOGIN))[0]
        raw = open(tpl, 'rb').read()
        txt = raw.decode('utf-16-le', 'ignore') if b'\x00' in raw[:40] else raw.decode('utf-8', 'ignore')
        tok = [x.split('=', 1)[1].strip() for x in txt.splitlines() if x.strip().startswith('InpSyncToken=')][0]
        self.topic = 'realtime:stl-' + hashlib.sha256(('st-live:' + tok).encode()).hexdigest()[:32]
        self.s = None; self.buf = b''; self.ref = 1; self.hb = 0
    def open(self):
        self.close()
        s = socket.create_connection(('127.0.0.1', 8080), timeout=5)
        s.sendall(('GET /realtime/v1/websocket?vsn=1.0.0 HTTP/1.1\r\nHost: hawk\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                   'Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n' % base64.b64encode(os.urandom(16)).decode()).encode())
        b = b''
        while b'\r\n\r\n' not in b:
            c = s.recv(4096)
            if not c: raise EOFError
            b += c
        self.s, self.buf = s, b.split(b'\r\n\r\n', 1)[1]
        self.raw({'topic': self.topic, 'event': 'phx_join', 'payload': {'config': {'broadcast': {'ack': False, 'self': False}}}, 'ref': '1', 'join_ref': '1'})
        self.s.settimeout(1.0); self.hb = time.time()
    def resolve(self):
        """Which EA of the account answers, and the broker's own name for the market: its chart's symbol, or one it can stream (hub)."""
        self.bc('who', {}); his = []; t0 = time.time()
        while time.time() - t0 < 8:
            m = self.recv()
            if m and m.get('event') == 'broadcast' and m['payload'].get('event') == 'hi':
                p = m['payload'].get('payload') or {}
                if str(p.get('lg')) == LOGIN: his.append(p)
            if his and time.time() - t0 > 3: break
        if not his: raise EOFError('no EA of %s answered' % LOGIN)
        his.sort(key=lambda p: (canon(p.get('sym')) != CANON, -int(p.get('cl') or 0)))   # an EA on that market's chart first, then the cloud EA
        cs = str(his[0].get('sym') or ''); self.key = cs + '|' + LOGIN
        if canon(cs) == CANON: self.mode, self.raw_sym = 'chart', cs; return
        self.bc('syms', {'by': self.key, 'q': CANON}); t0 = time.time()
        while time.time() - t0 < 8:
            m = self.recv()
            if m and m.get('event') == 'broadcast' and m['payload'].get('event') == 'symlist':
                p = m['payload'].get('payload') or {}
                if p.get('by') == self.key:
                    hit = [x for x in str(p.get('r') or '').split(',') if x and canon(x) == CANON]
                    if not hit: raise EOFError('%s has no %s' % (LOGIN, CANON))
                    hit.sort(key=len); self.mode, self.raw_sym = 'hub', hit[0]; return
        raise EOFError('no symbol list from %s' % self.key)
    def watch(self):
        if self.mode == 'chart': self.bc('watch', {'ms': 1000, 'sym': self.raw_sym, 'lg': int(LOGIN)}); return
        hs = [x for x in self.app_hs if x != self.raw_sym] if time.time() - self.t_app < 45 else []   # his Live Charts' own hub symbols keep streaming
        self.bc('watch', {'ms': 1000, 'sym': '', 'lg': int(LOGIN), 'hub': self.key, 'hs': ','.join(hs + [self.raw_sym])})
    def hist(self, n, tf):
        p = {'sym': self.raw_sym, 'lg': int(LOGIN), 'n': n, 'tf': tf}
        if self.mode == 'hub': p['by'] = self.key
        self.bc('hist', p)
    def close(self):
        try:
            if self.s: self.s.close()
        except Exception: pass
        self.s = None; self.buf = b''
    def raw(self, o):
        d = json.dumps(o).encode(); m = os.urandom(4); n = len(d)
        h = bytes([0x81]) + (bytes([0x80 | n]) if n < 126 else bytes([0x80 | 126]) + n.to_bytes(2, 'big'))
        self.s.sendall(h + m + bytes(c ^ m[i % 4] for i, c in enumerate(d)))
    def bc(self, ev, p):
        self.ref += 1
        self.raw({'topic': self.topic, 'event': 'broadcast', 'payload': {'type': 'broadcast', 'event': ev, 'payload': p}, 'ref': str(self.ref), 'join_ref': '1'})
    def _rd(self, n):
        while len(self.buf) < n:
            c = self.s.recv(65536)
            if not c: raise EOFError
            self.buf += c
        r, self.buf = self.buf[:n], self.buf[n:]; return r
    def recv(self):
        if time.time() - self.hb > 25:
            self.hb = time.time(); self.raw({'topic': 'phoenix', 'event': 'heartbeat', 'payload': {}, 'ref': 'h%d' % self.ref})
        try:
            b0, b1 = self._rd(2)
        except socket.timeout:
            return None
        n = b1 & 0x7f
        if n == 126: n = int.from_bytes(self._rd(2), 'big')
        elif n == 127: n = int.from_bytes(self._rd(8), 'big')
        d = self._rd(n)
        if (b0 & 0x0f) == 8: raise EOFError
        return json.loads(d.decode('utf-8', 'ignore')) if (b0 & 0x0f) == 1 else None

def parse(row):
    a = row.split(',')
    return int(a[0]), (float(a[1]), float(a[2]), float(a[3]), float(a[4]))

def live():
    global LOGIN, SYM
    set_market('EURUSD'); hawk = Hawk(post); line = None; bars, h1 = {}, {}
    up = False; t_watch = t_hist = 0; last_eval = 0; t_cfg = 0
    while True:
        ln = ldt(time.time()); m = ln.hour * 60 + ln.minute
        if time.time() - t_cfg >= 60:   # his pick in the hawk tab, looked at once a minute
            t_cfg = time.time(); c = get_cfg()
            if time.time() - NEWS['t'] >= 600: get_news()   # the calendar, every 10 minutes
            if c and (c[0] != LOGIN or c[1] != CANON or line is None):
                if line: line.close()
                LOGIN = c[0]; set_market(c[1]); SYM = CANON; up = False; line = None; hawk = Hawk(post); bars.clear(); h1.clear(); last_eval = 0
                log('reading', LOGIN, CANON)
            if line is None:
                try: line = Line()
                except (IndexError, OSError) as e: log('no template for', LOGIN, e); time.sleep(30); continue
        if ln.weekday() >= 5 or not (7 * 60 + 20 <= m < 10 * 60 + 10):
            if up and line: line.close(); up = False; log('window closed')
            bars.clear(); h1.clear(); time.sleep(30); continue
        try:
            if not up: line.open(); line.resolve(); up = True; t_watch = t_hist = 0; SYM = line.raw_sym; log('joined the relay:', LOGIN, SYM, line.mode)
            now = time.time()
            if now - t_watch >= 15: line.watch(); t_watch = now
            if now - t_hist >= 1200:
                line.hist(1500, 1); line.hist(200, 60); t_hist = now
            msg = line.recv()
            if msg and msg.get('event') == 'broadcast':
                ev, p = msg['payload'].get('event'), msg['payload'].get('payload') or {}
                if ev == 'watch' and line.mode == 'hub' and p.get('hub') == line.key:   # his Live Charts set the hub's list: ours joins it again
                    hs = [x for x in str(p.get('hs') or '').split(',') if x]
                    if line.raw_sym not in hs: line.app_hs = hs; line.t_app = now; line.watch(); t_watch = now
                if str(p.get('lg')) == LOGIN and p.get('s') == SYM:
                    if ev == 'px' and p.get('pb'):
                        t, v = parse(p['pb']); bars[t] = v
                    elif ev == 'bars':
                        dst = bars if int(p.get('tf', 1)) == 1 else h1
                        for row in str(p.get('rows', '')).split(';'):
                            if row: t, v = parse(row); dst[t] = v
        except (OSError, EOFError, ValueError, IndexError) as e:
            log('line lost:', e); line.close(); up = False; time.sleep(5); continue
        if line is None: continue
        if bars and h1 and max(bars) > last_eval and len(bars) > 600:
            last_eval = max(bars)
            ts = sorted(bars)
            try:
                hawk.look(ts, [bars[t][0] for t in ts], [bars[t][1] for t in ts], [bars[t][2] for t in ts], [bars[t][3] for t in ts],
                          [(t,) + h1[t] for t in sorted(h1)])
            except Exception as e:
                log('look failed:', repr(e))

def replay(csv, day):
    """Feed a past day minute by minute (hour candles built from the minutes) and print what would have been sent."""
    rows = [line.split(',') for line in open(csv)]
    t = [int(r[0]) for r in rows]; o = [float(r[1]) for r in rows]; h = [float(r[2]) for r in rows]
    l = [float(r[3]) for r in rows]; c = [float(r[4]) for r in rows]
    d0 = int(dt.datetime.strptime(day, '%Y-%m-%d').replace(tzinfo=dt.timezone.utc).timestamp())
    off = E.ldn(d0 + 12 * 3600) - (d0 + 12 * 3600)            # London's offset that day
    start, end = d0 + 7 * 3600 + 20 * 60 - off, d0 + 10 * 3600 + 10 * 60 - off
    lo = next(i for i, x in enumerate(t) if x >= start - 6 * 86400)
    out = []
    hawk = Hawk(lambda m: out.append(m))
    for k in range(next(i for i, x in enumerate(t) if x >= start), next(i for i, x in enumerate(t) if x >= end)):
        hawk.look(t[lo:k + 1], o[lo:k + 1], h[lo:k + 1], l[lo:k + 1], c[lo:k + 1])
    for m in out: print(m['kind'].ljust(10), m['title'], '|', m['body'])
    return out

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'replay': replay(sys.argv[2], sys.argv[3])
    else: live()
