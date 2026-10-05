import io, os, glob
# Builds every Session Terminal logo file in this folder: python _make.py, then screenshot the PNG pages it lists with
# headless Edge (--default-background-color=00000000 for the transparent favicons).
OUT = os.path.dirname(os.path.abspath(__file__))
SP = os.path.join(os.environ.get('TEMP', OUT), 'st_logo_pages')
os.makedirs(SP, exist_ok=True)
PINK, SILVER, BG = '#f472b6', '#d9d9de', '#0b0b0e'

# THE MARK (Nestor, 5 Oct 2026), arrived at step by step:
#  - one monitor (not two screens), 184 x 88 in a 300 grid, corners 16 ("rounder")
#  - the screen black with a pink border of 8 ("too thick" at 12)
#  - a ">_" command prompt on the screen, on its own (preferred to ST, "Session", and "S >_")
#  - no stem: the base where it was, its black circle carried up as a slot to the screen. The base is ONE outline with
#    the slot built in - cutting the slot along the base's own edge left a hairline. Slot corners: y = 208 - 13*sqrt(1 - (9/40)^2)
BASE = 'M141,195.33 L141,202 A9,4.5 0 0 0 159,202 L159,195.33 A40,13 0 1 1 141,195.33 Z'
SW = 11   # the prompt's line weight

def paths(col):
    screen = '<rect x="62" y="88" width="176" height="80" rx="12" fill="%s" stroke="%s" stroke-width="8"/>' % (BG, col)
    x0, y0 = 111, 108       # ">_" 40 high, centred on the screen
    prompt = ('<path d="M%d,%d L%d,%d L%d,%d" fill="none" stroke="%s" stroke-width="%d" stroke-linecap="round" stroke-linejoin="round"/>'
              '<rect x="%d" y="%.1f" width="44" height="%d" rx="4" fill="%s"/>') % (x0, y0, x0 + 24, y0 + 20, x0, y0 + 40, col, SW, x0 + 34, y0 + 40 - SW + 5.5, SW, col)
    # 20% smaller around the screen's centre (Nestor, 5 Oct 2026: "20% is nice"); its line weight scales with it
    prompt = '<g transform="translate(150 128) scale(0.8) translate(-150 -128)">%s</g>' % prompt
    return screen + prompt + '<path fill="%s" d="%s"/>' % (col, BASE)

def svg(col, vb, w=None, h=None, bg=None):
    size = (' width="%s" height="%s"' % (w, h)) if w else ''
    b = ('<rect x="-1000" y="-1000" width="3000" height="3000" fill="%s"/>' % bg) if bg else ''
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s"%s>%s%s</svg>' % (vb, size, b, paths(col))

TIGHT = '58 84 184 137'           # the mark only
SQUARE = '40 42.5 220 220'        # centred in a square, for icons

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
def icon(px, pad):
    s = px * (1 - 2 * pad)
    return page(px, px, '<div style="width:%dpx;height:%dpx;background:%s;display:flex;align-items:center;justify-content:center">%s</div>'
                % (px, px, BG, svg(PINK, SQUARE, s, s)))
def fav(px):
    return page(px, px, svg(PINK, SQUARE, px, px))
def og():
    return page(1200, 630, '<div style="width:1200px;height:630px;background:%s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px">%s'
                # the name in Fraunces, the app's own heading serif
                '<div style="font:400 66px Fraunces,serif;color:#ece9f1;letter-spacing:-.8px">Session <span style="color:%s">Terminal</span></div></div>'
                % (BG, svg(PINK, TIGHT, 300, 224), PINK), BG)

pngs = [
    ('session-terminal-icon-512.png', 512, 512, icon(512, 0.12)),
    ('session-terminal-icon-192.png', 192, 192, icon(192, 0.12)),
    ('session-terminal-apple-touch-180.png', 180, 180, icon(180, 0.14)),
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
