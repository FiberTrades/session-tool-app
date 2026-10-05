import io, os
OUT = r'C:\Users\Nestor\OneDrive\Documents\Claude Code chats\session-tool-app\logo-exports\session-terminal'
SP = r'C:\Users\Nestor\AppData\Local\Temp\claude\C--Users-Nestor-OneDrive-Documents-Claude-Code-chats\22f65aa3-7a61-4571-a62c-384269c5f71c\scratchpad\logo_pages'
os.makedirs(OUT, exist_ok=True); os.makedirs(SP, exist_ok=True)
PINK, SILVER, BG = '#f472b6', '#d9d9de', '#0b0b0e'

# The Session Terminal mark (Nestor, 5 Oct 2026): one monitor 184 wide (the "narrower" pick), no stem, the base where it
# was, its black circle carried up as a slot to the screen. The slot is a real cut-out (evenodd), so it works on any
# background, not just black.
def paths(col):
    screen = 'M68,92 H232 A10,10 0 0 1 242,102 V162 A10,10 0 0 1 232,172 H68 A10,10 0 0 1 58,162 V102 A10,10 0 0 1 68,92 Z'
    base = 'M110,208 A40,13 0 1 0 190,208 A40,13 0 1 0 110,208 Z'
    slot = 'M141,195.2 L141,202 A9,4.5 0 0 0 159,202 L159,195.2 A40,13 0 0 1 141,195.2 Z'   # the part of the slot inside the base
    return '<path fill="%s" d="%s"/><path fill="%s" fill-rule="evenodd" d="%s%s"/>' % (col, screen, col, base, slot)

def svg(col, vb, w=None, h=None, bg=None):
    size = (' width="%s" height="%s"' % (w, h)) if w else ''
    b = ('<rect x="-1000" y="-1000" width="3000" height="3000" fill="%s"/>' % bg) if bg else ''
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s"%s>%s%s</svg>' % (vb, size, b, paths(col))

TIGHT = '58 92 184 129'           # the mark only
SQUARE = '40 46.5 220 220'        # centred in a square, for icons

files = {
    'session-terminal-mark-pink.svg': svg(PINK, TIGHT),
    'session-terminal-mark-silver.svg': svg(SILVER, TIGHT),
    'session-terminal-mark-white.svg': svg('#ffffff', TIGHT),
    'session-terminal-icon.svg': svg(PINK, SQUARE, bg=BG),
}
for n, c in files.items():
    io.open(os.path.join(OUT, n), 'w', encoding='utf-8').write(c)

# pages to screenshot into PNGs: (file, width, height, html body)
def page(w, h, inner, bg='transparent'):
    return ('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap">'
            '<style>html,body{margin:0;width:%dpx;height:%dpx;background:%s;overflow:hidden}</style></head><body>%s</body></html>') % (w, h, bg, inner)
def icon(px, pad, bg=BG, radius=0):
    # the mark centred on a dark square (app icon); pad = share of the square left empty around it
    s = px * (1 - 2 * pad)
    return page(px, px, '<div style="width:%dpx;height:%dpx;background:%s;border-radius:%dpx;display:flex;align-items:center;justify-content:center">%s</div>'
                % (px, px, bg, radius, svg(PINK, SQUARE, s, s)))
def fav(px):
    return page(px, px, svg(PINK, SQUARE, px, px))
og = page(1200, 630, '<div style="width:1200px;height:630px;background:%s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px">%s'
          '<div style="font:400 74px \'Instrument Serif\',serif;color:#ece9f1;letter-spacing:-.5px">Session <span style="color:%s">Terminal</span></div></div>'
          % (BG, svg(PINK, TIGHT, 300, 210), PINK), BG)
pngs = [
    ('session-terminal-icon-512.png', 512, 512, icon(512, 0.12)),
    ('session-terminal-icon-192.png', 192, 192, icon(192, 0.12)),
    ('session-terminal-apple-touch-180.png', 180, 180, icon(180, 0.14)),
    ('session-terminal-maskable-512.png', 512, 512, icon(512, 0.2)),
    ('session-terminal-favicon-32.png', 32, 32, fav(32)),
    ('session-terminal-favicon-16.png', 16, 16, fav(16)),
    ('session-terminal-og-image.png', 1200, 630, og),
]
with io.open(os.path.join(SP, 'list.txt'), 'w', encoding='utf-8') as L:
    for n, w, h, html in pngs:
        p = os.path.join(SP, n.replace('.png', '.html'))
        io.open(p, 'w', encoding='utf-8').write(html)
        L.write('%s|%d|%d|%s\n' % (n, w, h, p))
print('ok', len(files), 'svg,', len(pngs), 'png pages')
