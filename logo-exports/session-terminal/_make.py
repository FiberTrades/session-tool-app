import io, os, glob
# Builds every Session Terminal logo file in this folder: python _make.py, then screenshot the PNG pages it lists with
# headless Edge (--default-background-color=00000000 for the transparent favicons).
OUT = os.path.dirname(os.path.abspath(__file__))
SP = os.path.join(os.environ.get('TEMP', OUT), 'st_logo_pages')
os.makedirs(SP, exist_ok=True)
PINK, SILVER, BG = '#f472b6', '#d9d9de', '#0b0b0e'

# THE MARK (Nestor, 5 Oct 2026), arrived at step by step:
#  - one monitor (not two screens), 184 wide in a 300 grid, corners 16 ("rounder")
#  - the screen black with a pink border of 8 ("too thick" at 12)
#  - 16:10 and EMPTY (5 Oct evening): the screen grew upward from 80 to 104 high (bottom and base unchanged); a ">_"
#    prompt sat on it all day and he went off it ("i just dont like the symbols"); candles and a price line were also shown
#  - no stem: the base where it was, its black circle carried up as a slot to the screen. The base is ONE outline with
#    the slot built in - cutting the slot along the base's own edge left a hairline. Slot corners: y = 208 - 13*sqrt(1 - (9/40)^2)
# 5 Oct evening: the base widened from 80 to 132 (rx 40 -> 66, ry 13 -> 15) under the taller screen; horns and a crescent were shown and declined
BASE = 'M141.00,195.14 L141.00,202.84 A9,4.5 0 0 0 159.00,202.84 L159.00,195.14 A66,15 0 1 1 141.00,195.14 Z'

def paths(col):
    screen = '<rect x="62" y="64" width="176" height="104" rx="12" fill="%s" stroke="%s" stroke-width="8"/>' % (BG, col)
    return screen + '<path fill="%s" d="%s"/>' % (col, BASE)

def svg(col, vb, w=None, h=None, bg=None):
    size = (' width="%s" height="%s"' % (w, h)) if w else ''
    b = ('<rect x="-1000" y="-1000" width="3000" height="3000" fill="%s"/>' % bg) if bg else ''
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s"%s>%s%s</svg>' % (vb, size, b, paths(col))

TIGHT = '58 60 184 165'           # the mark only
SQUARE = '54 46.5 192 192'        # centred in a square, for icons: 4px over the mark's width (5 Oct: "too small" next to other app icons with a looser square)

# start clean: only the chosen design lives here (earlier alternatives are in git history)
for f in glob.glob(os.path.join(OUT, 'session-terminal*')):
    os.remove(f)

files = {
    'session-terminal-mark-pink.svg': svg(PINK, TIGHT),
    'session-terminal-mark-silver.svg': svg(SILVER, TIGHT),
    'session-terminal-mark-white.svg': svg('#ffffff', TIGHT),
    'session-terminal-icon.svg': svg(PINK, SQUARE, bg=BG),
}
for n, c in files.items():
    io.open(os.path.join(OUT, n), 'w', encoding='utf-8').write(c)

def page(w, h, inner, bg='transparent'):
    return ('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400&display=swap">'
            '<style>html,body{margin:0;width:%dpx;height:%dpx;background:%s;overflow:hidden}</style></head><body>%s</body></html>') % (w, h, bg, inner)
def icon(px, pad, bg=BG):
    s = px * (1 - 2 * pad)
    return page(px, px, '<div style="width:%dpx;height:%dpx;background:%s;display:flex;align-items:center;justify-content:center">%s</div>'
                % (px, px, bg, svg(PINK, SQUARE, s, s)))
def fav(px):
    return page(px, px, svg(PINK, SQUARE, px, px))
def og():
    return page(1200, 630, '<div style="width:1200px;height:630px;background:%s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px">%s'
                # the name in Fraunces, the app's own heading serif
                '<div style="font:400 66px Fraunces,serif;color:#ece9f1;letter-spacing:-.8px">Session <span style="color:%s">Terminal</span></div></div>'
                % (BG, svg(PINK, TIGHT, 250, 224), PINK), BG)

pngs = [
    # the installed app's icon (PC taskbar, Start menu): no tile behind it (Nestor, 5 Oct) - the screen's own black keeps it readable on light taskbars
    ('session-terminal-icon-512.png', 512, 512, icon(512, 0.03, 'transparent')),
    ('session-terminal-icon-192.png', 192, 192, icon(192, 0.03, 'transparent')),
    ('session-terminal-apple-touch-180.png', 180, 180, icon(180, 0.10)),   # iOS fills transparency with black anyway, so it keeps its tile
    ('session-terminal-maskable-512.png', 512, 512, icon(512, 0.2)),
    ('session-terminal-favicon-32.png', 32, 32, fav(32)),
    ('session-terminal-favicon-16.png', 16, 16, fav(16)),
    ('session-terminal-og-image.png', 1200, 630, og()),
]
with io.open(os.path.join(SP, 'list.txt'), 'w', encoding='utf-8') as L:
    for n, w, h, html in pngs:
        p = os.path.join(SP, n.replace('.png', '.html'))
        io.open(p, 'w', encoding='utf-8').write(html)
        L.write('%s|%d|%d|%s\n' % (n, w, h, p))
print('ok', len(files), 'svg,', len(pngs), 'png pages ->', os.path.join(SP, 'list.txt'))
