import io, os, glob, re
# Builds every Session Terminal logo file in this folder: python _make.py, then screenshot the PNG pages it lists with
# headless Edge (--default-background-color=00000000 for the transparent favicons).
OUT = os.path.dirname(os.path.abspath(__file__))
SP = os.path.join(os.environ.get('TEMP', OUT), 'st_logo_pages')
os.makedirs(SP, exist_ok=True)
PINK, SILVER, BG = '#f472b6', '#d9d9de', '#0b0b0e'

# THE MARK (Nestor, 5 Oct 2026), arrived at step by step:
#  - one monitor (not two screens), 184 wide in a 300 grid, corners 16 ("rounder")
#  - the screen black with a pink border of 8 ("too thick" at 12)
#  - 16:10, at first EMPTY (5 Oct evening): the screen grew upward from 80 to 104 high (bottom and base unchanged); a ">_"
#    prompt sat on it all day and he went off it ("i just dont like the symbols"); candles and a price line were also shown
#  - no stem: the base where it was, its black circle carried up as a slot to the screen. The base is ONE outline with
#    the slot built in - cutting the slot along the base's own edge left a hairline. Slot corners: y = 208 - 13*sqrt(1 - (9/40)^2)
# 5 Oct evening: the base widened from 80 to 132 (rx 40 -> 66, ry 13 -> 15) under the taller screen; horns and a crescent were shown and declined
# the slot (the black notch at the base's top) 28 wide and deeper since the base widened (Nestor: 'more noticeable')
BASE = 'M136.00,195.34 L136.00,207.34 A14,7 0 0 0 164.00,207.34 L164.00,195.34 A66,15 0 1 1 136.00,195.34 Z'

# THE SPARKLE (5 Oct, late): a four-pointed star in the middle of the screen whose points run out to the frame
# (Nestor: "the points travel towards the edges"; "the star body has to be a lot smaller in the middle"; "make sure the
# points touch the edges"; picked the finer of the slim versions). Cubic sides with both control points at 5% of the reach from the centre give the slim
# waist; the tips go 2 units into the 8-wide border so they visibly meet it at every size.
def sparkle(cx=150, cy=116, hx=86, hy=50, p=0.05):
    ax, ay = hx * p, hy * p
    pts = [(cx, cy - hy), (cx + hx, cy), (cx, cy + hy), (cx - hx, cy)]
    ctl = [(cx + ax, cy - ay), (cx + ax, cy + ay), (cx - ax, cy + ay), (cx - ax, cy - ay)]
    d = 'M%g,%g' % pts[0]
    for i in range(4):
        c, e = ctl[i], pts[(i + 1) % 4]
        d += ' C%g,%g %g,%g %g,%g' % (c[0], c[1], c[0], c[1], e[0], e[1])
    return d + ' Z'
STAR = sparkle()

def monitor_paths(col):   # the sparkle monitor (live 5 Oct ecb6b77 - a351185), kept for reference
    screen = '<rect x="62" y="64" width="176" height="104" rx="12" fill="%s" stroke="%s" stroke-width="8"/>' % (BG, col)
    return screen + '<path fill="%s" d="%s"/>' % (col, STAR) + '<path fill="%s" d="%s"/>' % (col, BASE)

# 5 Oct 2026, late: BACK TO THE ORIGINAL ST CUBE. After the monitor, sparkle and four ST redraws (refined solid,
# rounded, line, flat monogram) Nestor chose "keep original": the cube exactly as it was drawn, with today's rules kept -
# it fills its slot (the artwork touches all four sides of its square), no tile behind the installed-app icon.
ST_PATH = re.search(r'<path[^>]*/>', io.open(os.path.join(OUT, '_st-original.svg'), encoding='utf-8').read(), re.S).group(0)
def cube_paths(col):   # the ST cube (live 5 Oct 5209b72 - ba0db8a), kept for reference
    return re.sub(r'fill="[^"]*"', 'fill="%s"' % col, ST_PATH, count=1)

# 5 Oct 2026, night: TWO SCREENS. Nestor sent a dual-monitor icon ("do this in the app's pink"), traced to its exact shapes
# (two 127 x 102 screens, corners 5, side by side with a 13 gap), and picked the wide oval base with a slot from seven
# stands. The base is one outline with the slot built in (slot corners where its sides meet the rim).
# Later that night he asked for a more rectangular foot and picked "sloped sides": a trapezoid 116 wide on top, 138 at the
# bottom, 30 tall, corners rounded 3, the same slot. (The wide oval it replaced: 'M184,246.33 L184,250 A15,10 0 0 0 214,250
# L214,246.33 A74,16 0 1 1 184,246.33 Z'.)
# Then rounder: screen corners 10 (from 5), and the foot's four corners rounded to the same 10 (true fillets on the
# trapezoid 139.075-258.925 on top, 125.325-272.675 at the bottom; the 3-round version was 'M141,246 ... A3,3 ... Z').
# Then the foot reaches 10 further down, same slope (so 10 x 13.75/30 wider each side at the bottom): 'stand a little
# longer' (6 Oct 2026, Nestor: 'number 1 screens but could the base elongate down a little', option 2, everywhere).
DUAL_BASE = ('M145.49,246.00 L184,246 L184,250 A15,10 0 0 0 214,250 L214,246 L252.51,246.00 A10,10 0 0 1 261.60,251.83 '
             'L270.77,271.83 A10,10 0 0 1 261.67,286.00 L136.33,286.00 A10,10 0 0 1 127.23,271.83 L136.40,251.83 A10,10 0 0 1 145.49,246.00 Z')
def paths(col):
    # 6 Oct: screens 142 wide (were 127; Nestor: 'slightly wider', between the 137 and 147 options), same 13 gap at 193-206
    return ('<rect x="51" y="116" width="142" height="102" rx="10" fill="%s"/><rect x="206" y="116" width="142" height="102" rx="10" fill="%s"/>'
            '<path fill="%s" d="%s"/>') % (col, col, col, DUAL_BASE)

def svg(col, vb, w=None, h=None, bg=None):
    size = (' width="%s" height="%s"' % (w, h)) if w else ''
    b = ('<rect x="-1000" y="-1000" width="3000" height="3000" fill="%s"/>' % bg) if bg else ''
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s"%s>%s%s</svg>' % (vb, size, b, paths(col))

TIGHT = '47 112 305 178'           # the two screens (x 51-348) and the base (y 116-286), 4 units of air
SQUARE = '50.5 52 298 298'       # centred in a square exactly the logo's width: as big as an icon can show it (Nestor: 'as big as possible')        # centred in a square, for icons: 4px over the mark's width (5 Oct: "too small" next to other app icons with a looser square)

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
                % (BG, svg(PINK, TIGHT, 330, 193), PINK), BG)

pngs = [
    # the installed app's icon (PC taskbar, Start menu): no tile behind it (Nestor, 5 Oct) - the screen's own black keeps it readable on light taskbars
    ('session-terminal-icon-512.png', 512, 512, icon(512, 0.0, 'transparent')),
    ('session-terminal-icon-192.png', 192, 192, icon(192, 0.0, 'transparent')),
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
