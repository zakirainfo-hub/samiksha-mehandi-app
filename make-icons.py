#!/usr/bin/env python3
"""Generates every app icon and store graphic from code (no source images needed).
   Run:  python3 make-icons.py     (needs Pillow:  pip3 install pillow)"""
import math, os
from PIL import Image, ImageDraw, ImageFont

OUT   = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'icons')
STORE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'store-assets')
os.makedirs(OUT, exist_ok=True)
os.makedirs(STORE, exist_ok=True)

CREAM  = (253, 243, 231)
ORANGE = (217,  83,  30)
HENNA  = (110,  50,  22)
BROWN  = (107,  46,  27)

def mandala(d, cx, cy, R, rings=True):
    """Draw a henna mandala centred at cx,cy."""
    # outer scallops
    n = 20
    for i in range(n):
        a = 2*math.pi*i/n
        x, y = cx + R*0.94*math.sin(a), cy - R*0.94*math.cos(a)
        d.ellipse([x-R*0.075, y-R*0.075, x+R*0.075, y+R*0.075], outline=HENNA, width=max(1,int(R*0.022)))
    # dot ring
    n = 22
    for i in range(n):
        a = 2*math.pi*i/n
        x, y = cx + R*0.80*math.sin(a), cy - R*0.80*math.cos(a)
        r = R*0.028
        d.ellipse([x-r, y-r, x+r, y+r], fill=HENNA)
    # petals
    n = 12
    for i in range(n):
        a = 2*math.pi*i/n
        pts = []
        for t in range(13):
            u = t/12
            rr = R*0.44 + (R*0.74 - R*0.44)*u
            w  = math.sin(math.pi*u) * R*0.115
            pts.append((cx + rr*math.sin(a) + w*math.cos(a), cy - rr*math.cos(a) + w*math.sin(a)))
        for t in range(12, -1, -1):
            u = t/12
            rr = R*0.44 + (R*0.74 - R*0.44)*u
            w  = math.sin(math.pi*u) * R*0.115
            pts.append((cx + rr*math.sin(a) - w*math.cos(a), cy - rr*math.cos(a) - w*math.sin(a)))
        d.polygon(pts, fill=HENNA)
    # inner petals
    n = 8
    for i in range(n):
        a = 2*math.pi*i/n + math.pi/8
        pts = []
        for sgn in (1, -1):
            rng = range(11) if sgn == 1 else range(10, -1, -1)
            for t in rng:
                u = t/10
                rr = R*0.11 + (R*0.34 - R*0.11)*u
                w  = math.sin(math.pi*u) * R*0.085 * sgn
                pts.append((cx + rr*math.sin(a) + w*math.cos(a), cy - rr*math.cos(a) + w*math.sin(a)))
        d.polygon(pts, fill=(138, 67, 31))
    # centre
    d.ellipse([cx-R*0.115, cy-R*0.115, cx+R*0.115, cy+R*0.115], fill=HENNA)
    d.ellipse([cx-R*0.05,  cy-R*0.05,  cx+R*0.05,  cy+R*0.05],  fill=CREAM)

def icon(size, maskable=False, bg=CREAM):
    S = size*4                       # supersample for smooth edges
    img = Image.new('RGB', (S, S), bg)
    d = ImageDraw.Draw(img)
    if maskable:
        # keep art inside the safe circle Android crops to
        mandala(d, S/2, S/2, S*0.30)
    else:
        d.rounded_rectangle([0, 0, S-1, S-1], radius=S*0.22, fill=bg, outline=(240, 220, 197), width=max(1,int(S*0.006)))
        mandala(d, S/2, S/2, S*0.36)
    return img.resize((size, size), Image.LANCZOS)

# --- PWA / Android / iOS icons ---
made = []
for s in (48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512, 1024):
    p = os.path.join(OUT, f'icon-{s}.png'); icon(s).save(p, optimize=True); made.append(f'icon-{s}.png')
for s in (192, 512):
    p = os.path.join(OUT, f'maskable-{s}.png'); icon(s, maskable=True).save(p, optimize=True); made.append(f'maskable-{s}.png')

# favicon
icon(64).save(os.path.join(OUT, 'favicon.ico'), sizes=[(16,16),(32,32),(48,48),(64,64)])
made.append('favicon.ico')

# --- splash / feature graphic ---
def wordmark(img, d, big, small, y):
    W = img.size[0]
    def fit(text, target_px, bold=False):
        for path in ('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
                     '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
            if os.path.exists(path):
                return ImageFont.truetype(path, target_px)
        return ImageFont.load_default()
    f1 = fit(big, int(W*0.085)); f2 = fit(small, int(W*0.042))
    for txt, f, col, dy in ((big, f1, BROWN, 0), (small, f2, ORANGE, int(W*0.105))):
        bb = d.textbbox((0,0), txt, font=f)
        d.text(((W-(bb[2]-bb[0]))/2 - bb[0], y+dy), txt, font=f, fill=col)

# Play Store feature graphic 1024x500
fg = Image.new('RGB', (1024, 500), CREAM)
d = ImageDraw.Draw(fg)
mandala(d, 108, 250, 112)
mandala(d, 916, 250, 112)
wordmark(fg, d, "Samiksha's", "MEHENDI ART", 178)
fg.save(os.path.join(STORE, 'play-feature-graphic-1024x500.png'), optimize=True)
made.append('store-assets/play-feature-graphic-1024x500.png')

# splash 2048x2048 (Capacitor uses one square splash and crops it)
sp = Image.new('RGB', (2048, 2048), CREAM)
d = ImageDraw.Draw(sp)
mandala(d, 1024, 900, 430)
wordmark(sp, d, "Samiksha's", "MEHENDI ART", 1480)
sp.save(os.path.join(STORE, 'splash-2048x2048.png'), optimize=True)
made.append('store-assets/splash-2048x2048.png')

# Play Store icon must be 512x512 with no transparency
icon(512).save(os.path.join(STORE, 'play-icon-512x512.png'), optimize=True)
made.append('store-assets/play-icon-512x512.png')
# App Store icon 1024x1024, no alpha, no rounded corners applied by us
ios = Image.new('RGB', (1024, 1024), CREAM)
d = ImageDraw.Draw(ios); mandala(d, 512, 512, 370)
ios.save(os.path.join(STORE, 'appstore-icon-1024x1024.png'), optimize=True)
made.append('store-assets/appstore-icon-1024x1024.png')

print('Generated:')
for m in made: print('  ' + m)
