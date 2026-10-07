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
# 6 Oct, later: both sides moved in 10 (same slope, slot, corners), 'narrower' option 3: 98 wide on top, 137 at the bottom
# (the 10-longer foot it narrowed: 'M145.49,246.00 ... L270.77,271.83 A10,10 0 0 1 261.67,286.00 L136.33,286.00 ... Z').
# Then in 10 more each side (6 Oct, 'make base narrower', option 3): 78 wide on top, 117 at the bottom
# (the 137 one: 'M155.49,246.00 ... L260.77,271.83 A10,10 0 0 1 251.67,286.00 L146.33,286.00 ... Z').
# 6 Oct, last: the slot deeper - 20 deep from the stand's top (was 14), same 30 wide, a half-ellipse bottom 15 x 12
# (Nestor: 'deeper like in here', from his white reference icon; option 2 'a tiny bit less deep').
DUAL_BASE = ('M165.49,246.00 L184.00,246 L184.00,254.00 A15.00,12.00 0 0 0 214.00,254.00 L214.00,246 '
             'L232.51,246.00 A10,10 0 0 1 241.60,251.83 L250.77,271.83 A10,10 0 0 1 241.67,286.00 L156.33,286.00 A10,10 0 0 1 147.23,271.83 L156.40,251.83 A10,10 0 0 1 165.49,246.00 Z')
# 7 Oct 2026: ONE SCREEN. Nestor felt the two screens were too close to the dual-monitor icon they were traced from, and
# picked a single wide screen whose top and bottom edges curve gently inward (3 at the middle; corners ~6), 297 x 123.
# Its foot: a low wide oval with a slot, drawn in our own proportions (rx 60, ry 13, slot 26 wide and half the oval deep),
# 26 below the screen's middle. (The sloped stand it replaced is DUAL_BASE above.)
SCREEN = ('M57,120 Q199.5,126 342,120 Q348,120.7 348,126.7 L348,236.3 Q348,242.3 342,243 Q199.5,237 57,243 '
          'Q51,242.3 51,236.3 L51,126.7 Q51,120.7 57,120 Z')
OVAL = 'M185.30,268.84 L185.30,277.50 A14.2,6.7 0 0 0 213.70,277.50 L213.70,268.84 A52,22 0 1 1 185.30,268.84 Z'   # 7 Oct: his picture's base, 104 x 44; its slot re-measured off his picture: 28.4 wide, straight 9.5, a shallow 14.2 x 6.7 bottom
# and on top, the same slot shape upside down in pink (7 Oct: 'add this black space shape up here turned upside down')
CAP = 'M176.5,123.6 L176.5,123 A9,9 0 0 1 185.5,114 L213.5,114 A9,9 0 0 1 222.5,123 L222.5,123.6 Z'    # the top: a pill 46 x 18 on the screen's top edge (7 Oct, over a circle) - upper half pink (CAP),
LENS = 'M176.5,123 A9,9 0 0 0 185.5,132 L213.5,132 A9,9 0 0 0 222.5,123 Z'          # lower half cut out of the screen (LENS)
def pill_paths(col):   # the curved screen with the pill (live e81072b - 3a99a85), kept for reference; viewBox '47 110 305 206'
    return ('<defs><mask id="st-lens" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400"><rect width="400" height="400" fill="#fff"/>'
            '<path d="%s" fill="#000"/></mask></defs><g mask="url(#st-lens)"><path fill="%s" d="%s"/><path fill="%s" d="%s"/></g>'
            '<path fill="%s" d="%s"/>') % (LENS, col, CAP, col, SCREEN, col, OVAL)

# 7 Oct 2026: THE MONITOR WITH AI STARS. After a night of redesigns (3D monitor, webcams, stands, stacked screens, >_)
# Nestor chose: a pink frame round a black screen ("add a black border"), straight edges, the shape of a normal 16:9
# monitor (256 x 144, frame 12, corners 6 outside / 4 inside), two pink AI sparkle stars on the screen - a big one just
# left of and below the middle and a small one at its top right - on the same oval foot with its slot, 25.84 below.
def spark(cx, cy, r, k=.16):
    # the AI sparkle: four points, its sides curving in towards the middle
    q = r * k
    return ('M%.2f,%.2f Q%.2f,%.2f %.2f,%.2f Q%.2f,%.2f %.2f,%.2f Q%.2f,%.2f %.2f,%.2f Q%.2f,%.2f %.2f,%.2f Z'
            % (cx, cy - r, cx + q, cy - q, cx + r, cy, cx + q, cy + q, cx, cy + r, cx - q, cy + q, cx - r, cy, cx - q, cy - q, cx, cy - r))
FOOT = OVAL.replace('268.84', '289.84').replace('277.50', '298.50')   # the oval 21 lower, under the taller screen
# the frame is a RING (the screen is a real hole in it), with the black screen drawn underneath, 1 bigger so no seam
# shows: the one-colour copy (the Settings button, in currentColor) drops the black and stays a hollow monitor
FRAME = ('M77.5,120 H321.5 A6,6 0 0 1 327.5,126 V258 A6,6 0 0 1 321.5,264 H77.5 A6,6 0 0 1 71.5,258 V126 A6,6 0 0 1 77.5,120 Z '
         'M87.5,132 H311.5 A4,4 0 0 1 315.5,136 V248 A4,4 0 0 1 311.5,252 H87.5 A4,4 0 0 1 83.5,248 V136 A4,4 0 0 1 87.5,132 Z')
# Then SPLIT like the NVIDIA mark (Nestor's picture), sides swapped from theirs: the screen is cut down the big star's
# middle; to the left of the cut it is solid pink - frame and screen one area - with the star's left half black; to the
# right it stays black inside the pink frame, with the star's right half and the small star pink. Both stars sit on the
# screen's middle line now (the big one centred at 192). The black half-star is a HOLE in the pink, so the one-colour
# copy keeps it.
BX, BY, BR = 190.82, 192.0, 41.58
BQ = BR * .16
LEFT_PINK = ('M82,131 H%.2f V253 H82 Z ' % BX                                                          # the screen left of the cut
             + 'M%.2f,%.2f L%.2f,%.2f Q%.2f,%.2f %.2f,%.2f Q%.2f,%.2f %.2f,%.2f Z'                     # minus the star's left half
             % (BX, BY - BR, BX, BY + BR, BX - BQ, BY + BQ, BX - BR, BY, BX - BQ, BY - BQ, BX, BY - BR))
STAR_RIGHT = ('M%.2f,%.2f Q%.2f,%.2f %.2f,%.2f Q%.2f,%.2f %.2f,%.2f Z'
              % (BX, BY - BR, BX + BQ, BY - BQ, BX + BR, BY, BX + BQ, BY + BQ, BX, BY + BR))
STAR_SMALL = spark(242.45, 157.27, 15.99)
# the other way round, NVIDIA's own order (built 7 Oct for Nestor to compare): black screen and pink star-half on the left,
# solid pink on the right with the star's right half and the small star cut out of it in black
STAR_LEFT = ('M%.2f,%.2f L%.2f,%.2f Q%.2f,%.2f %.2f,%.2f Q%.2f,%.2f %.2f,%.2f Z'
             % (BX, BY - BR, BX, BY + BR, BX - BQ, BY + BQ, BX - BR, BY, BX - BQ, BY - BQ, BX, BY - BR))
RIGHT_PINK = ('M%.2f,131 H317 V253 H%.2f Z ' % (BX, BX) + STAR_RIGHT + ' ' + STAR_SMALL)
PINK_SIDE = 'left'   # Nestor kept pink on the left (7 Oct)
def paths(col):
    if PINK_SIDE == 'right':
        return ('<rect x="82.5" y="131" width="234" height="122" rx="5" fill="#000"/><path fill="%s" fill-rule="evenodd" d="%s"/>'
                '<path fill="%s" fill-rule="evenodd" d="%s"/><path fill="%s" d="%s"/><path fill="%s" d="%s"/>'
                ) % (col, FRAME, col, RIGHT_PINK, col, STAR_LEFT, col, FOOT)
    return ('<rect x="82.5" y="131" width="234" height="122" rx="5" fill="#000"/><path fill="%s" fill-rule="evenodd" d="%s"/>'
            '<path fill="%s" fill-rule="evenodd" d="%s"/><path fill="%s" d="%s"/><path fill="%s" d="%s"/><path fill="%s" d="%s"/>'
            ) % (col, FRAME, col, LEFT_PINK, col, STAR_RIGHT, col, STAR_SMALL, col, FOOT)

def svg(col, vb, w=None, h=None, bg=None):
    size = (' width="%s" height="%s"' % (w, h)) if w else ''
    b = ('<rect x="-1000" y="-1000" width="3000" height="3000" fill="%s"/>' % bg) if bg else ''
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s"%s>%s%s</svg>' % (vb, size, b, paths(col))

TIGHT = '67.5 116 264 221'          # the monitor x 71.5-327.5 from y 120, the oval foot to y 333, 4 units of air
SQUARE = '71 98 257 257'       # centred in a square exactly the logo's width: as big as an icon can show it (Nestor: 'as big as possible')        # centred in a square, for icons: 4px over the mark's width (5 Oct: "too small" next to other app icons with a looser square)

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
def icon(px, pad, bg=BG, radius=0):
    s = px * (1 - 2 * pad)
    return page(px, px, '<div style="width:%dpx;height:%dpx;background:%s;border-radius:%g%%;display:flex;align-items:center;justify-content:center">%s</div>'
                % (px, px, bg, radius, svg(PINK, SQUARE, s, s)))
def fav(px):
    return page(px, px, svg(PINK, SQUARE, px, px))
def og():
    return page(1200, 630, '<div style="width:1200px;height:630px;background:%s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px">%s'
                # the name in Fraunces, the app's own heading serif
                '<div style="font:400 66px Fraunces,serif;color:#ece9f1;letter-spacing:-.8px">Session <span style="color:%s">Terminal</span></div></div>'
                % (BG, svg(PINK, TIGHT, 251, 210), PINK), BG)

pngs = [
    # the installed app's icon on a PC (taskbar, Start menu; manifest purpose 'any'): NO background, the logo edge to edge.
    # (6 Oct he tried a black rounded tile with the logo at 78% - 2bdbb39 - and went back: "I preferred the pc taskbar logo
    # without the black background". Phones keep their black: apple-touch below, and Android uses the maskable icon.)
    ('session-terminal-icon-512.png', 512, 512, icon(512, 0.0, 'transparent')),
    ('session-terminal-icon-192.png', 192, 192, icon(192, 0.0, 'transparent')),
    # iPhone home screen: full square black (iOS rounds the corners itself), same 78%
    # phones use pure black #000 (6 Oct): Android's opening screen paints the manifest background (#000) and puts this
    # icon on it in a squircle - on the app's #0b0b0e it showed as a grey blob ("very ugly"); on #000 the tile disappears
    ('session-terminal-apple-touch-180.png', 180, 180, icon(180, 0.11, '#000000')),
    # Android home screen (manifest purpose 'maskable'): full-bleed black, logo 68% wide so it stays inside the 80% safe circle
    ('session-terminal-maskable-512.png', 512, 512, icon(512, 0.16, '#000000')),
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
