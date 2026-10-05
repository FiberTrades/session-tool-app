import io, os
# Builds every Session Terminal logo file in this folder. Run: python _make.py  (then screenshot the PNG pages it lists -
# see the loop in the commit that added this file; headless Edge with --default-background-color=00000000).
OUT = os.path.dirname(os.path.abspath(__file__))
SP = os.path.join(os.environ.get('TEMP', OUT), 'st_logo_pages')
os.makedirs(SP, exist_ok=True)
PINK, SILVER, BG = '#f472b6', '#d9d9de', '#0b0b0e'

# The mark (Nestor, 5 Oct 2026): one monitor 184 wide in a 300 grid, no stem, the base where it was, its black circle
# carried up as a slot to the screen.
# The base is ONE outline with the slot built into it ("remove this line"): cutting the slot out along the base's own top
# edge left a hairline of pink where the two identical curves met. The slot's top corners sit on the base's edge:
# y = 208 - 13*sqrt(1 - (9/40)^2) = 195.33.
BASE = 'M141,195.33 L141,202 A9,4.5 0 0 0 159,202 L159,195.33 A40,13 0 1 1 141,195.33 Z'
SCREEN = 'M68,92 H232 A10,10 0 0 1 242,102 V162 A10,10 0 0 1 232,172 H68 A10,10 0 0 1 58,162 V102 A10,10 0 0 1 68,92 Z'

def paths(col, outline=False):
    if outline:
        # "a version of the screen in black with a pink border": same outer size, black inside, a 12-unit pink border
        scr = '<rect x="64" y="98" width="172" height="68" rx="4" fill="%s" stroke="%s" stroke-width="12"/>' % (BG, col)
    else:
        scr = '<path fill="%s" d="%s"/>' % (col, SCREEN)
    return scr + '<path fill="%s" d="%s"/>' % (col, BASE)

def svg(col, vb, w=None, h=None, bg=None, outline=False):
    size = (' width="%s" height="%s"' % (w, h)) if w else ''
    b = ('<rect x="-1000" y="-1000" width="3000" height="3000" fill="%s"/>' % bg) if bg else ''
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s"%s>%s%s</svg>' % (vb, size, b, paths(col, outline))

TIGHT = '58 92 184 129'           # the mark only
SQUARE = '40 46.5 220 220'        # centred in a square, for icons

files = {
    'session-terminal-mark-pink.svg': svg(PINK, TIGHT),
    'session-terminal-mark-silver.svg': svg(SILVER, TIGHT),
    'session-terminal-mark-white.svg': svg('#ffffff', TIGHT),
    'session-terminal-icon.svg': svg(PINK, SQUARE, bg=BG),
    'session-terminal-outline-mark-pink.svg': svg(PINK, TIGHT, outline=True),
    'session-terminal-outline-icon.svg': svg(PINK, SQUARE, bg=BG, outline=True),
}
for n, c in files.items():
    io.open(os.path.join(OUT, n), 'w', encoding='utf-8').write(c)

def page(w, h, inner, bg='transparent'):
    return ('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap">'
            '<style>html,body{margin:0;width:%dpx;height:%dpx;background:%s;overflow:hidden}</style></head><body>%s</body></html>') % (w, h, bg, inner)
def icon(px, pad, outline=False):
    s = px * (1 - 2 * pad)
    return page(px, px, '<div style="width:%dpx;height:%dpx;background:%s;display:flex;align-items:center;justify-content:center">%s</div>'
                % (px, px, BG, svg(PINK, SQUARE, s, s, outline=outline)))
def fav(px, outline=False):
    return page(px, px, svg(PINK, SQUARE, px, px, outline=outline))
def og(outline=False):
    return page(1200, 630, '<div style="width:1200px;height:630px;background:%s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px">%s'
                '<div style="font:400 74px \'Instrument Serif\',serif;color:#ece9f1;letter-spacing:-.5px">Session <span style="color:%s">Terminal</span></div></div>'
                % (BG, svg(PINK, TIGHT, 300, 210, outline=outline), PINK), BG)

pngs = []
for pre, o in (('session-terminal', False), ('session-terminal-outline', True)):
    pngs += [
        (pre + '-icon-512.png', 512, 512, icon(512, 0.12, o)),
        (pre + '-icon-192.png', 192, 192, icon(192, 0.12, o)),
        (pre + '-apple-touch-180.png', 180, 180, icon(180, 0.14, o)),
        (pre + '-maskable-512.png', 512, 512, icon(512, 0.2, o)),
        (pre + '-favicon-32.png', 32, 32, fav(32, o)),
        (pre + '-favicon-16.png', 16, 16, fav(16, o)),
        (pre + '-og-image.png', 1200, 630, og(o)),
    ]
with io.open(os.path.join(SP, 'list.txt'), 'w', encoding='utf-8') as L:
    for n, w, h, html in pngs:
        p = os.path.join(SP, n.replace('.png', '.html'))
        io.open(p, 'w', encoding='utf-8').write(html)
        L.write('%s|%d|%d|%s\n' % (n, w, h, p))
print('ok', len(files), 'svg,', len(pngs), 'png pages ->', os.path.join(SP, 'list.txt'))
