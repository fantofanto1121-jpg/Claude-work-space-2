# ブロックの見た目（16×16 のドット絵）を作り、js/tex16.js に書き出す。
# 使い方: python3 tools/blockart/gen.py [見本の PNG]
# 色は今までの見た目（PDF の図）の平均色を土台にし、素材ごとの模様（石の粒・板目・年輪・レンガ・鉱石の結晶など）を
# 決まった乱数で描く。明るさは 4〜6 段に揃えて、ドット絵らしい、はっきりした色の段にしている。
import math
import os, sys, json, math, random, base64, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
N = 16

def hx(h):
    return [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]

def cl(v):
    return max(0, min(255, int(round(v))))

def sc(c, k):
    return [cl(c[0] * k), cl(c[1] * k), cl(c[2] * k)]

def mixc(a, b, t):
    return [cl(a[i] + (b[i] - a[i]) * t) for i in range(3)]

class Img:
    def __init__(self, fill=None, alpha=False):
        self.p = [[list(fill) if fill else None for _ in range(N)] for _ in range(N)]
        self.alpha = alpha
    def set(self, x, y, c):
        if 0 <= x < N and 0 <= y < N:
            self.p[y][x] = list(c) if c is not None else None
    def get(self, x, y):
        return self.p[y % N][x % N]
    def copy(self):
        o = Img(); o.p = [[(list(c) if c else None) for c in r] for r in self.p]; o.alpha = self.alpha; return o
    def rgb(self):
        b = bytearray()
        for r in self.p:
            for c in r:
                b += bytes(c if c else [0, 0, 0])
        return bytes(b)
    def rgba(self):
        b = bytearray()
        for r in self.p:
            for c in r:
                b += bytes(c + [255]) if c else bytes([0, 0, 0, 0])
        return bytes(b)

# ---- ノイズ（タイルとしてつながる値ノイズ） ----
def vnoise(seed, cell):
    rnd = random.Random(seed)
    g = max(1, N // cell)
    grid = [[rnd.random() for _ in range(g)] for _ in range(g)]
    out = [[0] * N for _ in range(N)]
    for y in range(N):
        for x in range(N):
            fx, fy = x / cell, y / cell
            x0, y0 = int(fx) % g, int(fy) % g
            x1, y1 = (x0 + 1) % g, (y0 + 1) % g
            tx, ty = fx - int(fx), fy - int(fy)
            tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty)
            a = grid[y0][x0] * (1 - tx) + grid[y0][x1] * tx
            b = grid[y1][x0] * (1 - tx) + grid[y1][x1] * tx
            out[y][x] = a * (1 - ty) + b * ty
    return out

def field(seed, oct=((4, 0.55), (2, 0.3), (1, 0.15))):
    acc = [[0] * N for _ in range(N)]
    for i, (cell, w) in enumerate(oct):
        if cell >= 1:
            nz = vnoise(seed * 31 + i, cell) if cell > 1 else [[random.Random(seed * 977 + y * 16 + x).random() for x in range(N)] for y in range(N)]
            for y in range(N):
                for x in range(N):
                    acc[y][x] += nz[y][x] * w
    return acc

def quant(base, f, levels=(0.74, 0.86, 1.0, 1.12), lo=0.0, hi=1.0, warm=0.0):
    img = Img()
    for y in range(N):
        for x in range(N):
            v = (f[y][x] - lo) / (hi - lo) if hi > lo else 0.5
            v = min(0.999, max(0.0, v))
            k = levels[int(v * len(levels))]
            c = sc(base, k)
            if warm:
                c = [cl(c[0] + warm * (k - 1) * 60), c[1], cl(c[2] - warm * (k - 1) * 40)]
            img.set(x, y, c)
    return img

def stats(f):
    vals = sorted(v for r in f for v in r)
    return vals[len(vals) // 20], vals[-len(vals) // 20]

def noisy(base, seed, levels=(0.74, 0.86, 1.0, 1.12), oct=((4, 0.55), (2, 0.3), (1, 0.15))):
    f = field(seed, oct)
    lo, hi = stats(f)
    return quant(base, f, levels, lo, hi)

def specks(img, seed, n, cols):
    r = random.Random(seed)
    for _ in range(n):
        img.set(r.randrange(N), r.randrange(N), cols[r.randrange(len(cols))])
    return img

def hsh(*a):
    h = 2166136261
    for v in a:
        h = ((h ^ (v & 0xffffffff)) * 16777619) & 0xffffffff
    return h

# ---- 素材ごとの模様 ----
def stone(base, seed):
    img = noisy(base, seed, (0.78, 0.9, 1.0, 1.08))
    r = random.Random(seed)
    for _ in range(5):   # 短い暗い筋
        x, y = r.randrange(N), r.randrange(N)
        for k in range(r.randrange(2, 4)):
            img.set(x + k, y, sc(base, 0.7))
    return img

def deepslate(base, seed, top=False):
    if top:
        return noisy(base, seed, (0.72, 0.86, 1.0, 1.1), ((4, 0.6), (1, 0.4)))
    f = field(seed, ((4, 0.4), (1, 0.6)))
    for y in range(N):   # 横に流れる層
        for x in range(N):
            f[y][x] = f[y][x] * 0.5 + f[y][(x + 3) % N] * 0.25 + f[y][(x + 6) % N] * 0.25
    lo, hi = stats(f)
    img = quant(base, f, (0.72, 0.84, 0.96, 1.08), lo, hi)
    for y in (3, 9, 13):
        for x in range(N):
            if hsh(seed, x, y) % 3:
                img.set(x, y, sc(base, 0.66))
    return img

def dirt(base, seed):
    img = noisy(base, seed, (0.76, 0.9, 1.0, 1.1), ((4, 0.4), (1, 0.6)))
    return specks(img, seed + 1, 14, [sc(base, 0.64), sc(base, 1.22)])

def grass_top(base, seed):
    img = noisy(base, seed, (0.78, 0.9, 1.0, 1.1), ((2, 0.3), (1, 0.7)))
    return specks(img, seed + 2, 18, [sc(base, 1.2), sc(base, 0.7)])

def grass_side(dirt_img, green, seed):
    img = dirt_img.copy()
    r = random.Random(seed)
    for x in range(N):
        h = 3 + r.randrange(0, 3) + (1 if r.random() < 0.25 else 0)
        for y in range(h):
            img.set(x, y, sc(green, (1.1 if y == 0 else 1.0 if y < h - 1 else 0.84) * (0.94 + 0.12 * r.random())))
    return img

def sand(base, seed, specs=True):
    img = noisy(base, seed, (0.88, 0.95, 1.0, 1.06), ((2, 0.3), (1, 0.7)))
    if specs:
        specks(img, seed + 3, 16, [sc(base, 0.8), sc(base, 1.12)])
    return img

def gravel(base, seed):
    img = Img(sc(base, 0.6))
    r = random.Random(seed)
    cols = [sc(base, 0.9), sc(base, 1.05), sc(base, 1.18), mixc(base, [150, 120, 100], 0.3), sc(base, 0.8)]
    for _ in range(26):
        cx, cy, w, h = r.randrange(N), r.randrange(N), r.choice([2, 3, 3, 4]), r.choice([2, 2, 3])
        c = r.choice(cols)
        for yy in range(h):
            for xx in range(w):
                if (xx in (0, w - 1) and yy in (0, h - 1)) and w > 2 and h > 2:
                    continue
                img.set((cx + xx) % N, (cy + yy) % N, sc(c, 1.12) if yy == 0 else c)
    return img

def cobble(base, seed, moss=None):
    r = random.Random(seed)
    pts = [(r.random() * N, r.random() * N) for _ in range(9)]
    owner = [[0] * N for _ in range(N)]
    for y in range(N):
        for x in range(N):
            best, bi = 1e9, 0
            for i, (px, py) in enumerate(pts):
                dx = min(abs(x - px), N - abs(x - px)); dy = min(abs(y - py), N - abs(y - py))
                d = dx * dx + dy * dy * 1.2
                if d < best: best, bi = d, i
            owner[y][x] = bi
    tones = [r.choice([0.86, 0.94, 1.0, 1.06, 1.12]) for _ in pts]
    img = Img()
    for y in range(N):
        for x in range(N):
            o = owner[y][x]
            edge = owner[(y + 1) % N][x] != o or owner[y][(x + 1) % N] != o
            top = owner[(y - 1) % N][x] != o or owner[y][(x - 1) % N] != o
            k = tones[o] * (0.6 if edge else 1.14 if top else 1.0)
            if not edge and (hsh(seed, x, y) % 9) == 0: k *= 0.9
            img.set(x, y, sc(base, k))
    if moss:
        f = field(seed + 9, ((4, 0.7), (1, 0.3)))
        lo, hi = stats(f)
        for y in range(N):
            for x in range(N):
                v = (f[y][x] - lo) / (hi - lo)
                if v > 0.55:
                    img.set(x, y, sc(moss, 0.85 + 0.35 * (hsh(seed, x, y, 1) % 3) / 2))
    return img

def bricks(base, seed, mortar, bh=4, bw=8):
    img = Img()
    r = random.Random(seed)
    for row in range(N // bh):
        off = (bw // 2) * (row % 2)
        for x0 in range(-bw, N, bw):
            tone = r.choice([0.88, 0.95, 1.0, 1.06])
            for yy in range(bh):
                for xx in range(bw):
                    x, y = (x0 + off + xx) % N, row * bh + yy
                    if yy == bh - 1 or xx == bw - 1:
                        img.set(x, y, mortar); continue
                    k = tone * (1.12 if yy == 0 else 0.86 if yy == bh - 2 else 1.0)
                    if hsh(seed, x, y) % 11 == 0: k *= 0.88
                    img.set(x, y, sc(base, k))
    return img

def stone_bricks(base, seed):
    img = Img()
    mortar = sc(base, 0.58)
    for row in range(2):
        off = 4 * (row % 2)
        for x0 in (-8, 0, 8):
            for yy in range(8):
                for xx in range(8):
                    x, y = (x0 + off + xx) % N, row * 8 + yy
                    if yy == 7 or xx == 7:
                        img.set(x, y, mortar); continue
                    k = 1.14 if (yy == 0 or xx == 0) else 0.82 if (yy == 6 or xx == 6) else 1.0
                    if hsh(seed, x, y) % 7 == 0: k *= 0.92
                    img.set(x, y, sc(base, k))
    return img

def planks(base, seed):
    img = Img()
    r = random.Random(seed)
    for b in range(4):
        tone = r.choice([0.92, 0.97, 1.0, 1.04])
        joint = r.randrange(3, 13)
        for yy in range(4):
            for x in range(N):
                y = b * 4 + yy
                if yy == 3:
                    img.set(x, y, sc(base, 0.62)); continue
                k = tone * (1.1 if yy == 0 else 1.0)
                if x == joint and yy < 3:
                    k = 0.7
                elif (hsh(seed, x, y) % 6) == 0:
                    k *= 0.88   # 木目
                img.set(x, y, sc(base, k))
    return img

def log_side(base, seed, birch=False):
    img = Img()
    r = random.Random(seed)
    if birch:
        light, dark = base, [40, 38, 34]
        for y in range(N):
            for x in range(N):
                img.set(x, y, sc(light, 0.94 + 0.12 * ((hsh(seed, x, y) % 5) / 4)))
        for _ in range(9):
            x, y, w = r.randrange(N), r.randrange(N), r.randrange(2, 5)
            for k in range(w):
                img.set((x + k) % N, y, dark if k else sc(dark, 1.6))
        return img
    cols = [r.choice([0.72, 0.84, 0.96, 1.08]) for _ in range(N)]
    for x in range(N):
        for y in range(N):
            k = cols[x]
            if (hsh(seed, x, y) % 7) == 0: k = cols[(x + 1) % N]
            if (hsh(seed, x // 2, y // 3) % 9) == 0: k *= 0.8
            img.set(x, y, sc(base, k))
    return img

def log_top(bark, wood, seed):
    img = Img()
    for y in range(N):
        for x in range(N):
            if x in (0, 15) or y in (0, 15):
                img.set(x, y, sc(bark, 0.9 + 0.15 * (hsh(seed, x, y) % 3) / 2)); continue
            d = max(abs(x - 7.5), abs(y - 7.5))
            ring = int(d) % 2
            img.set(x, y, sc(wood, (1.06 if ring else 0.88) * (0.97 + 0.06 * ((hsh(seed, x, y) % 3) / 2))))
    return img

def leaves(base, seed):
    f = field(seed, ((2, 0.5), (1, 0.5)))
    lo, hi = stats(f)
    img = Img()
    for y in range(N):
        for x in range(N):
            v = (f[y][x] - lo) / (hi - lo)
            k = 0.5 if v < 0.18 else 0.78 if v < 0.45 else 1.0 if v < 0.75 else 1.18
            img.set(x, y, sc(base, k))
    return img

def ore(stone_img, mineral, seed, deep=False):
    img = stone_img.copy()
    r = random.Random(seed)
    m = hx(mineral) if isinstance(mineral, str) else mineral
    dark, mid, light = sc(m, 0.62), m, mixc(m, [255, 255, 255], 0.45)
    spots = [(3, 3), (10, 4), (5, 10), (11, 11), (8, 7)]
    for (cx, cy) in spots[:4 + (seed % 2)]:
        cx += r.randrange(-1, 2); cy += r.randrange(-1, 2)
        shape = r.choice([[(0, 0), (1, 0), (0, 1), (1, 1)], [(0, 0), (1, 0), (2, 0), (1, 1)], [(1, 0), (0, 1), (1, 1), (2, 1)], [(0, 0), (1, 1), (1, 0)]])
        for dx, dy in shape:
            img.set(cx + dx + 1, cy + dy + 1, dark)
        for dx, dy in shape:
            img.set(cx + dx, cy + dy, mid)
        img.set(cx + shape[0][0], cy + shape[0][1], light)
    return img

def panel(base, seed, pattern=None):
    img = Img()
    for y in range(N):
        for x in range(N):
            if x in (0, 15) or y in (0, 15):
                k = 1.24 if (y == 0 or x == 0) else 0.66
            elif x in (1, 14) or y in (1, 14):
                k = 1.1 if (y == 1 or x == 1) else 0.8
            else:
                k = 1.0 + 0.05 * ((hsh(seed, x, y) % 3) - 1)
            img.set(x, y, sc(base, k))
    if pattern == 'shine':
        for i in range(3, 9):
            img.set(i, 12 - i, sc(base, 1.3)); img.set(i + 1, 12 - i, sc(base, 1.18))
    elif pattern == 'facet':
        for i in range(2, 14):
            img.set(i, i, sc(base, 1.18)); img.set(i, 15 - i, sc(base, 0.86))
    elif pattern == 'dots':
        for (x, y) in [(4, 4), (11, 4), (4, 11), (11, 11), (7, 7), (8, 8)]:
            img.set(x, y, sc(base, 1.35))
    elif pattern == 'rivet':
        for (x, y) in [(3, 3), (12, 3), (3, 12), (12, 12)]:
            img.set(x, y, sc(base, 0.7)); img.set(x - 1, y - 1, sc(base, 1.25))
    elif pattern == 'noise':
        f = noisy(base, seed, (0.84, 0.94, 1.04, 1.14))
        for y in range(2, 14):
            for x in range(2, 14):
                img.set(x, y, f.get(x, y))
    return img

def water(base, seed):
    img = Img()
    for y in range(N):
        for x in range(N):
            w = math.sin((x + seed) * 0.8 + y * 0.9) + math.sin(x * 0.35 - y * 1.3)
            k = 1.18 if w > 1.3 else 1.06 if w > 0.6 else 0.94 if w > -0.8 else 0.86
            img.set(x, y, sc(base, k))
    return img

def lava(base, seed):
    f = field(seed, ((4, 0.7), (2, 0.3)))
    lo, hi = stats(f)
    img = Img()
    for y in range(N):
        for x in range(N):
            v = (f[y][x] - lo) / (hi - lo)
            c = [255, 236, 120] if v > 0.82 else [255, 176, 44] if v > 0.55 else base if v > 0.25 else sc(base, 0.78)
            img.set(x, y, c)
    return img

def glowstone(base, seed):
    img = Img(sc(base, 0.62))
    r = random.Random(seed)
    for _ in range(14):
        x, y, s = r.randrange(N), r.randrange(N), r.choice([2, 3, 3, 4])
        for yy in range(s):
            for xx in range(s):
                img.set((x + xx) % N, (y + yy) % N, [255, 240, 170] if (xx + yy) == 0 else sc(base, 1.18 if yy == 0 else 1.0))
    return img

def magma(base, seed):
    img = noisy(base, seed, (0.7, 0.85, 1.0))
    r = random.Random(seed)
    for _ in range(4):
        x, y = r.randrange(N), r.randrange(N)
        for k in range(8):
            img.set(x % N, y % N, [255, 150, 40] if k % 3 else [255, 214, 90])
            if r.random() < 0.5: x += 1
            else: y += 1
    return img

def obsidian(base, seed):
    img = noisy(base, seed, (0.7, 0.85, 1.0, 1.25), ((4, 0.5), (1, 0.5)))
    r = random.Random(seed)
    for _ in range(5):
        x, y = r.randrange(N), r.randrange(N)
        for k in range(3):
            img.set((x + k) % N, (y + k) % N, mixc(base, [150, 110, 200], 0.6))
    return img

def soul_sand(base, seed):
    img = sand(base, seed, False)
    r = random.Random(seed)
    for (fx, fy) in [(2, 2), (9, 3), (4, 9), (11, 10)]:
        fx += r.randrange(0, 2); fy += r.randrange(0, 2)
        for (dx, dy) in [(0, 0), (2, 0), (1, 2), (0, 2), (2, 2)]:
            img.set(fx + dx, fy + dy, sc(base, 0.45))
    return img

def cactus_side(base, seed):
    img = Img()
    for y in range(N):
        for x in range(N):
            k = 0.78 if x in (0, 15) else 1.1 if x in (1, 14) else 0.92 if x % 4 == 0 else 1.0
            img.set(x, y, sc(base, k))
    for (x, y) in [(3, 2), (11, 5), (7, 9), (3, 12), (12, 13)]:
        img.set(x, y, [230, 230, 180])
    return img

def framed(base, seed, inner_fn):
    img = inner_fn
    for i in range(N):
        for (x, y) in [(i, 0), (0, i)]:
            img.set(x, y, sc(base, 1.15))
        for (x, y) in [(i, 15), (15, i)]:
            img.set(x, y, sc(base, 0.62))
    return img

def plant_cut(rows, pal):
    img = Img(alpha=True)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.' and ch in pal:
                img.set(x, y, hx(pal[ch]) if isinstance(pal[ch], str) else pal[ch])
    return img

# ---- 植物・作物などの切り抜き（16×16） ----
def wheat(stage):
    img = Img(alpha=True)
    h = 2 + stage * 2 if stage < 7 else 15
    col = mixc([84, 150, 50], [200, 172, 70], stage / 7)
    for i, x in enumerate([1, 4, 6, 9, 11, 14]):
        hh = max(1, h - (i % 3))
        for y in range(16 - hh, 16):
            img.set(x, y, sc(col, 0.85 if y > 12 else 1.0))
            if (y + x) % 4 == 0: img.set(x + (1 if i % 2 else -1), y, sc(col, 1.1))
        if stage >= 6:
            for y in range(16 - hh, 16 - hh + 4):
                img.set(x, y, [222, 190, 90] if stage == 7 else [196, 178, 84])
                img.set(x + 1, y + 1, [190, 150, 60] if stage == 7 else [170, 160, 70])
    return img

def root_crop(stage, root):
    img = Img(alpha=True)
    leaf, dark = [96, 168, 64], [52, 112, 36]
    h = [3, 6, 9, 11][stage]
    for x in (2, 5, 8, 11, 13):
        for y in range(16 - h, 15):
            img.set(x, y, dark if y > 12 else leaf)
            if y < 16 - h + 3:
                img.set(x - 1, y + 1, leaf); img.set(x + 1, y + 1, leaf)
        if stage == 3 and root:
            img.set(x, 15, root); img.set(x, 14, sc(root, 1.15)); img.set(x + 1, 15, sc(root, 0.8))
    return img

def wart(stage):
    img = Img(alpha=True)
    h = [3, 6, 9, 12][stage]
    for x in (2, 6, 10, 13):
        for y in range(16 - h, 16):
            img.set(x, y, [106, 26, 30])
        for (dx, dy) in [(-1, 0), (1, 0), (0, -1), (0, 0)]:
            img.set(x + dx, 16 - h + dy, [168, 36, 44] if dy else [210, 64, 72])
    return img

def fire():
    img = Img(alpha=True)
    r = random.Random(5)
    for x in range(N):
        h = 7 + int(6 * abs(math.sin(x * 1.3))) + r.randrange(0, 3)
        for y in range(16 - h, 16):
            t = (y - (16 - h)) / h
            c = [255, 236, 140] if t > 0.7 else [255, 196, 64] if t > 0.4 else [240, 128, 32]
            if t < 0.15 and r.random() < 0.5: continue
            img.set(x, y, c)
    return img

def torch(head, stick=(110, 80, 46), glow=True):
    img = Img(alpha=True)
    for y in range(6, 16):
        img.set(7, y, list(stick)); img.set(8, y, sc(list(stick), 0.8))
    hd = hx(head) if isinstance(head, str) else head
    for (x, y) in [(7, 4), (8, 4), (7, 5), (8, 5), (7, 3), (8, 3)]:
        img.set(x, y, hd)
    img.set(7, 3, mixc(hd, [255, 255, 255], 0.55 if glow else 0.1))
    return img

def door(wood, upper, iron=False):
    img = Img(alpha=True)
    for y in range(N):
        for x in range(N):
            edge = x in (0, 15) or (y == 0 and upper) or (y == 15 and not upper)
            if iron:
                c = sc(wood, 0.72 if edge else 1.0 if (x + y) % 5 else 0.92)
            else:
                c = sc(wood, 0.6 if edge else (1.06 if x % 5 == 1 else 0.94 if x % 5 == 4 else 1.0))
            img.set(x, y, c)
    if upper:
        for (x0, y0) in [(3, 3), (9, 3), (3, 9), (9, 9)]:
            for yy in range(4):
                for xx in range(4):
                    img.set(x0 + xx, y0 + yy, None)
    else:
        img.set(12, 6, [50, 48, 46]); img.set(12, 7, [80, 76, 72])
        for x in range(2, 14):
            img.set(x, 8, sc(wood, 0.7))
    return img

def ladder(wood):
    img = Img(alpha=True)
    for y in range(N):
        for x in (2, 3, 12, 13):
            img.set(x, y, sc(wood, 0.8 if x in (3, 13) else 1.0))
    for y in (2, 6, 10, 14):
        for x in range(4, 12):
            img.set(x, y, sc(wood, 1.05)); img.set(x, y + 1, sc(wood, 0.7))
    return img

def main():
    out_png = sys.argv[1] if len(sys.argv) > 1 else None
    info = json.loads(subprocess.run(['node', os.path.join(HERE, 'colors.js')], capture_output=True, text=True, check=True).stdout)
    T = {}
    EXTRA_COL = {'CHERRY_PLANKS': '#e2b4ac', 'CHERRY_LOG': '#4a2a34', 'CHERRY_LEAVES': '#eaa6c2', 'MANGROVE_PLANKS': '#7a3632', 'MANGROVE_LOG': '#54402e', 'MANGROVE_LEAVES': '#4e7e34', 'CRIMSON_PLANKS': '#7a3a4a', 'WARPED_PLANKS': '#2a6a62'}
    def col(k, face='side'):
        if k not in info: return hx(EXTRA_COL[k])   # 新しいブロック（古い 8×8 の見た目がないもの）
        return hx(info[k][face])
    def put(k, side, top=None, bottom=None, cut=None, all_faces=False):
        e = {'side': side, 'top': top or side, 'bottom': bottom or top or side}
        if cut is not None: e['cut'] = cut
        if all_faces: e['all'] = True
        T[k] = e
    s = lambda k: hsh(*[ord(c) for c in k]) & 0xffff
    # 土・石
    st = stone(col('STONE'), 1); put('STONE', st)
    dp = deepslate(col('DEEPSLATE'), 2); put('DEEPSLATE', dp, deepslate(col('DEEPSLATE', 'top'), 3, True))
    dr = dirt(col('DIRT'), 4); put('DIRT', dr)
    put('GRASS', grass_side(dr, col('GRASS', 'top'), 5), grass_top(col('GRASS', 'top'), 6), dr)
    sa = sand(col('SAND'), 7); put('SAND', sa)
    ss_side = sand(col('SANDSTONE'), 8, False)
    for x in range(N):
        for y in range(4): ss_side.set(x, y, sc(col('SANDSTONE'), 1.1 if y < 3 else 0.82))
        ss_side.set(x, 15, sc(col('SANDSTONE'), 0.8)); ss_side.set(x, 9, sc(col('SANDSTONE'), 0.9))
    put('SANDSTONE', ss_side, sand(col('SANDSTONE', 'top'), 9, False), sand(col('SANDSTONE', 'bottom'), 10))
    put('GRAVEL', gravel(col('GRAVEL'), 11))
    put('CLAY', noisy(col('CLAY'), 12, (0.92, 0.98, 1.04)))
    put('SNOW', specks(noisy(col('SNOW'), 13, (0.94, 0.98, 1.0, 1.02)), 14, 10, [[214, 226, 240]]))
    ice = noisy(col('ICE'), 15, (0.9, 0.98, 1.06))
    for i in range(3, 13): ice.set(i, 15 - i, [236, 246, 255]); ice.set(i + 1, 15 - i, [214, 232, 248])
    put('ICE', ice)
    put('WATER', water(col('WATER'), 0))
    put('LAVA', lava(col('LAVA'), 16))
    put('BEDROCK', noisy(col('BEDROCK'), 17, (0.55, 0.8, 1.05, 1.35), ((2, 0.5), (1, 0.5))))
    put('COBBLESTONE', cobble(col('COBBLESTONE'), 18))
    put('MOSSY_COBBLESTONE', cobble(col('COBBLESTONE'), 18, [84, 120, 58]))
    cd = cobble(col('COBBLED_DEEPSLATE'), 19); put('COBBLED_DEEPSLATE', cd)
    # 木と葉
    for w, birch in [('OAK', False), ('BIRCH', True), ('SPRUCE', False), ('JUNGLE', False), ('ACACIA', False), ('CHERRY', False), ('MANGROVE', False)]:
        pl = planks(col(w + '_PLANKS'), s(w))
        put(w + '_PLANKS', pl)
        put(w + '_LOG', log_side(col(w + '_LOG'), s(w) + 1, birch), log_top(col(w + '_LOG'), col(w + '_PLANKS'), s(w)))
        put(w + '_LEAVES', leaves(col(w + '_LEAVES'), s(w) + 2))
    put('CACTUS', cactus_side(col('CACTUS'), 20), panel(col('CACTUS', 'top'), 21, 'dots'), panel(col('CACTUS', 'top'), 21))
    # 鉱石
    MIN = {'COAL': [44, 44, 48], 'IRON': [216, 176, 140], 'COPPER': [214, 120, 80], 'GOLD': [244, 210, 70], 'REDSTONE': [220, 40, 30],
           'LAPIS': [40, 80, 200], 'DIAMOND': [90, 230, 220]}
    for m, c in MIN.items():
        put(m + '_ORE', ore(st, c, s(m)))
        put('DEEPSLATE_' + m + '_ORE', ore(dp, c, s(m) + 7), ore(T['DEEPSLATE']['top'], c, s(m) + 9))
    # ネザー・エンド
    nr = specks(noisy(col('NETHERRACK'), 22, (0.72, 0.86, 1.0, 1.1), ((2, 0.4), (1, 0.6))), 23, 12, [sc(col('NETHERRACK'), 0.55)])
    put('NETHERRACK', nr)
    put('QUARTZ_ORE', ore(nr, [236, 228, 220], 24))
    put('NETHER_GOLD_ORE', ore(nr, [244, 200, 60], 25))
    put('SOUL_SAND', soul_sand(col('SOUL_SAND'), 26))
    put('SOUL_SOIL', dirt(col('SOUL_SOIL'), 27))
    put('MAGMA', magma(col('MAGMA'), 28))
    put('GLOWSTONE', glowstone(col('GLOWSTONE'), 29))
    bs = Img()
    for y in range(N):
        for x in range(N):
            bs.set(x, y, sc(col('BASALT'), [0.78, 0.92, 1.04, 0.86][(x + (hsh(30, x) % 3)) % 4] * (0.96 + 0.08 * ((hsh(31, x, y) % 3) / 2))))
    put('BASALT', bs, log_top(sc(col('BASALT'), 0.8), col('BASALT'), 32))
    es = specks(noisy(col('END_STONE'), 33, (0.9, 0.97, 1.03, 1.08)), 34, 12, [sc(col('END_STONE'), 0.78)])
    put('END_STONE', es)
    put('OBSIDIAN', obsidian(col('OBSIDIAN'), 35))
    epf_top = es.copy()
    for y in range(4, 12):
        for x in range(4, 12):
            epf_top.set(x, y, [24, 70, 60] if 5 <= x <= 10 and 5 <= y <= 10 else [70, 120, 90])
    epf_side = es.copy()
    for x in range(N):
        for y in range(4): epf_side.set(x, y, [70, 120, 90] if y < 3 else [40, 70, 56])
    put('END_PORTAL_FRAME', epf_side, epf_top, es)
    # 作ったブロック
    put('STONE_BRICKS', stone_bricks(col('STONE_BRICKS'), 36))
    put('BRICKS', bricks(col('BRICKS'), 37, [180, 168, 156]))
    put('NETHER_BRICKS', bricks(col('NETHER_BRICKS'), 38, [24, 10, 12], 4, 6))
    for k, p in [('COAL_BLOCK', 'noise'), ('IRON_BLOCK', 'rivet'), ('GOLD_BLOCK', 'shine'), ('COPPER_BLOCK', 'noise'), ('DIAMOND_BLOCK', 'facet'),
                 ('LAPIS_BLOCK', 'noise'), ('REDSTONE_BLOCK', 'dots'), ('QUARTZ_BLOCK', None)]:
        put(k, panel(col(k), s(k), p))
    put('WHITE_WOOL', noisy(col('WHITE_WOOL'), 39, (0.86, 0.94, 1.0, 1.04), ((2, 0.5), (1, 0.5))))
    g = Img(alpha=True)
    for i in range(N):
        for (x, y) in [(i, 0), (0, i), (i, 15), (15, i)]:
            g.set(x, y, [236, 244, 248] if (x == 0 or y == 0) else [200, 216, 222])
    for (x, y) in [(4, 3), (3, 4), (5, 3), (3, 5), (11, 10), (10, 11), (12, 10)]:
        g.set(x, y, [246, 252, 255])
    put('GLASS', g, cut=g, all_faces=True)
    # 道具のブロック
    pk = T['OAK_PLANKS']['side']
    ct_top = pk.copy()
    for i in range(1, 15):
        for (x, y) in [(i, 1), (1, i), (i, 14), (14, i), (i, 7), (7, i)]:
            ct_top.set(x, y, sc(col('OAK_PLANKS'), 0.55))
    ct_side = pk.copy()
    for y in range(0, 3):
        for x in range(N): ct_side.set(x, y, sc(col('OAK_PLANKS'), 0.7 if y == 2 else 1.12))
    for (x, y) in [(3, 6), (4, 7), (5, 8), (6, 9), (10, 6), (11, 6), (12, 6), (11, 7), (11, 8), (11, 9), (11, 10)]:
        ct_side.set(x, y, [120, 120, 124])
    put('CRAFTING_TABLE', ct_side, ct_top, pk)
    fs = stone(col('FURNACE'), 40)
    fsf = fs.copy()
    for y in range(8, 14):
        for x in range(3, 13):
            fsf.set(x, y, [24, 24, 26] if y > 8 else sc(col('FURNACE'), 0.6))
    lit = fsf.copy()
    for y in range(10, 14):
        for x in range(4, 12):
            lit.set(x, y, [255, 170, 50] if (x + y) % 3 else [255, 220, 110])
    put('FURNACE', fsf, fs, fs)
    put('FURNACE_LIT', lit, fs, fs)
    ch = planks(sc(col('CHEST'), 1.0), 41)
    for x in range(N):
        ch.set(x, 0, sc(col('CHEST'), 0.6)); ch.set(x, 15, sc(col('CHEST'), 0.6)); ch.set(x, 5, sc(col('CHEST'), 0.5)); ch.set(x, 6, sc(col('CHEST'), 0.5))
    for y in range(4, 9):
        for x in range(7, 9): ch.set(x, y, [200, 200, 200] if y != 8 else [120, 120, 120])
    put('CHEST', ch, framed(col('CHEST'), 42, planks(col('CHEST'), 43)))
    sp = Img([26, 30, 36])
    for i in range(N):
        for (x, y) in [(i, 0), (0, i), (i, 15), (15, i), (i, 5), (i, 10), (5, i), (10, i)]:
            sp.set(x, y, [70, 80, 92] if (x + y) % 2 else [96, 108, 120])
    put('SPAWNER', sp)
    # 平らな切り抜き：トーチ・植物など
    for k, head in [('TORCH', [255, 210, 80]), ('REDSTONE_TORCH', [255, 60, 40]), ('REDSTONE_TORCH_OFF', [110, 30, 24])]:
        t = torch(head, glow=k != 'REDSTONE_TORCH_OFF')
        put(k, t, cut=t)
    for i in range(8):
        w = wheat(i); put('WHEAT_' + str(i), w, cut=w)
    for i in range(4):
        c = root_crop(i, [236, 132, 40]); put('CARROTS_' + str(i), c, cut=c)
        p = root_crop(i, [200, 160, 100]); put('POTATOES_' + str(i), p, cut=p)
        nw = wart(i); put('NETHER_WART_' + str(i), nw, cut=nw)
    sg = plant_cut(['................', '..g.......g.....', '..g...g...g.....', '.gg...g..gg...g.', '.g...gg..g...gg.', 'gg...g..gg...g..', '.g..gg..g...gg..', '.gg.g..gg..gg...',
                    '..g.g..g...g..g.', '..ggg.gg..gg.gg.', '...gg.g...g..g..', '..ggggg..gg.gg..', '...ggg...ggggg..', '....gg...gggg...', '....g.....gg....', '................'],
                   {'g': col('GRASS', 'top')})
    put('SHORT_GRASS', sg, cut=sg)
    for k, petal, center in [('DANDELION', [244, 214, 60], [220, 160, 30]), ('POPPY', [210, 40, 32], [40, 30, 20])]:
        pc = plant_cut(['................', '................', '................', '......pp........', '.....pppp.......', '.....pcpp.......', '......pp........', '.......s........',
                        '.......s........', '.......s..ll....', '.......s.ll.....', '...ll..sll......', '....ll.s........', '.....lls........', '.......s........', '.......s........'],
                       {'p': petal, 'c': center, 's': [70, 128, 44], 'l': [96, 156, 60]})
        put(k, pc, cut=pc)
    for k, cap, dots in [('BROWN_MUSHROOM', [160, 120, 86], None), ('RED_MUSHROOM', [208, 44, 40], [250, 246, 240])]:
        m = plant_cut(['................', '................', '................', '................', '................', '.....cccccc.....', '...cccccccccc...', '..cccccccccccc..',
                       '..cccccccccccc..', '......ssss......', '......ssss......', '......ssss......', '......ssss......', '.....ssssss.....', '................', '................'],
                      {'c': cap, 's': [226, 216, 196]})
        if dots:
            for (x, y) in [(5, 6), (9, 6), (4, 8), (11, 7), (7, 8)]: m.set(x, y, dots)
        put(k, m, cut=m)
    cw = Img(alpha=True)
    for i in range(N):
        cw.set(i, i, [236, 236, 240]); cw.set(15 - i, i, [236, 236, 240]); cw.set(i, 7, [226, 226, 232]); cw.set(7, i, [226, 226, 232])
    for r_ in (3, 6):
        for i in range(-r_, r_ + 1):
            for (x, y) in [(7 + i, 7 - r_), (7 + i, 7 + r_), (7 - r_, 7 + i), (7 + r_, 7 + i)]:
                if (i + r_) % 2 == 0: cw.set(x, y, [214, 214, 220])
    put('COBWEB', cw, cut=cw)
    fr = fire(); put('FIRE', fr, cut=fr)
    sc_ = plant_cut(['.a.......b......', '.a.......b..l...', '.ac......b.l....', '.a.......bl.....', '.a......cb......', 'la.......b......', '.al......b......', '.a.......bc.....',
                     '.a.......b......', '.ac......b..l...', '.a.......b.l....', '.a......lb......', 'la.......b......', '.a.......bc.....', '.a.......b......', '.a.......b......'],
                    {'a': [136, 194, 90], 'b': [116, 174, 72], 'c': [170, 220, 120], 'l': [96, 156, 60]})
    put('SUGAR_CANE', sc_, cut=sc_)
    for w in ['OAK', 'SPRUCE', 'ACACIA', 'BIRCH', 'JUNGLE', 'CHERRY', 'MANGROVE', 'CRIMSON', 'WARPED']:
        pc = col(w + '_PLANKS')
        for u, up in [('L', False), ('U', True)]:
            d = door(pc, up)
            put(w + '_DOOR_' + u, d, sc_img(pc, 0.75), sc_img(pc, 0.75), cut=d)
    for u, up in [('L', False), ('U', True)]:
        d = door([200, 200, 204], up, True)
        put('IRON_DOOR_' + u, d, sc_img([180, 180, 184], 1), sc_img([180, 180, 184], 1), cut=d)
    ld = ladder(col('OAK_PLANKS')); put('LADDER', ld, cut=ld)
    # 耕地・赤石・その他
    ft = dr.copy()
    for y in range(N):
        for x in range(N):
            ft.set(x, y, sc(dr.get(x, y), 0.92 if y % 4 else 0.62))
    put('FARMLAND', dr, ft, dr)
    fm = Img()
    for y in range(N):
        for x in range(N): fm.set(x, y, sc(ft.get(x, y), 0.62))
    put('FARMLAND_MOIST', dr, fm, dr)
    lamp_off = Img()
    for y in range(N):
        for x in range(N):
            frame = x in (0, 15) or y in (0, 15) or x in (7, 8) or y in (7, 8)
            lamp_off.set(x, y, [70, 44, 28] if frame else sc([150, 96, 52], 0.9 + 0.2 * ((hsh(44, x, y) % 3) / 2)))
    lamp_on = Img()
    for y in range(N):
        for x in range(N):
            frame = x in (0, 15) or y in (0, 15) or x in (7, 8) or y in (7, 8)
            lamp_on.set(x, y, [140, 96, 50] if frame else [255, 222 + (hsh(45, x, y) % 3) * 12, 140])
    put('REDSTONE_LAMP', lamp_off); put('REDSTONE_LAMP_ON', lamp_on)
    tnt_side = Img()
    for y in range(N):
        for x in range(N):
            band = 5 <= y <= 10
            tnt_side.set(x, y, [236, 232, 226] if band else sc([200, 44, 34], 0.86 if x % 4 == 3 else 1.0))
    for (x, y) in [(2, 7), (3, 7), (4, 7), (3, 8), (6, 7), (6, 8), (7, 7), (8, 8), (8, 7), (10, 7), (11, 7), (12, 7), (11, 8)]:
        tnt_side.set(x, y, [40, 30, 28])
    tnt_top = Img()
    for y in range(N):
        for x in range(N): tnt_top.set(x, y, sc([200, 44, 34], 0.9 + 0.1 * ((x // 4 + y // 4) % 2)))
    for (x, y) in [(7, 7), (8, 7), (7, 8), (8, 8)]: tnt_top.set(x, y, [40, 40, 40])
    put('TNT', tnt_side, tnt_top, tnt_top)
    for k, face in [('PISTON', col('OAK_PLANKS')), ('STICKY_PISTON', [104, 176, 80])]:
        side = cobble(col('COBBLESTONE'), 46)
        for y in range(4):
            for x in range(N): side.set(x, y, sc(col('OAK_PLANKS'), 1.08 if y == 0 else 0.96))
        top = planks(col('OAK_PLANKS'), 47) if k == 'PISTON' else noisy(face, 48, (0.86, 1.0, 1.12))
        for (x, y) in [(7, 7), (8, 7), (7, 8), (8, 8)]: top.set(x, y, sc(col('COBBLESTONE'), 0.8))
        put(k, side, top, stone(col('STONE'), 49))
    smooth = panel(col('STONE'), 50)
    put('REPEATER_BASE', smooth); put('COMPARATOR_BASE', smooth)
    et_top = Img()
    for y in range(N):
        for x in range(N):
            et_top.set(x, y, [70, 20, 30] if (x in (0, 15) or y in (0, 15)) else sc([168, 36, 46], 0.94 + 0.12 * ((hsh(51, x, y) % 3) / 2)))
    for (x, y) in [(1, 1), (14, 1), (1, 14), (14, 14)]: et_top.set(x, y, [90, 230, 220])
    ob = obsidian(col('OBSIDIAN'), 52)
    et_side = ob.copy()
    for y in range(4):
        for x in range(N): et_side.set(x, y, [168, 36, 46] if y < 3 else [90, 20, 26])
    put('ENCHANTING_TABLE', et_side, et_top, ob)
    bk = pk.copy()
    r = random.Random(53)
    for shelf in (1, 9):
        x = 1
        while x < 15:
            w = r.choice([1, 2, 2]); c = r.choice([[150, 40, 34], [40, 70, 140], [50, 110, 50], [170, 130, 60], [110, 60, 120], [200, 190, 160]])
            hgt = r.choice([5, 6, 6])
            for xx in range(w):
                for yy in range(hgt):
                    if x + xx < 15: bk.set(x + xx, shelf + 6 - hgt + yy, sc(c, 1.1 if yy == 0 else 1.0 if xx == 0 else 0.85))
            x += w
        for xx in range(N): bk.set(xx, shelf + 6, sc(col('OAK_PLANKS'), 0.6))
    put('BOOKSHELF', bk, pk, pk)
    put('BREWING_STAND', stone(col('STONE'), 54), panel([120, 120, 124], 55), panel([120, 120, 124], 55))
    am = panel([70, 70, 76], 56, 'noise')
    put('ANVIL', am); put('HOPPER', panel([84, 84, 90], 57, 'rivet'))
    frame = stone(col('STONE'), 58)
    for i in range(N):
        for (x, y) in [(i, 0), (0, i), (i, 15), (15, i)]: frame.set(x, y, sc(col('STONE'), 0.66))
    dfront = frame.copy()
    for y in range(4, 12):
        for x in range(4, 12): dfront.set(x, y, [30, 30, 32] if 5 <= x <= 10 and 5 <= y <= 10 else [70, 70, 72])
    dfr2 = frame.copy()
    for y in range(5, 11):
        for x in range(5, 11): dfr2.set(x, y, [30, 30, 32] if 6 <= x <= 9 and 6 <= y <= 9 else [70, 70, 72])
    put('DISPENSER', frame, dfront, frame); put('DROPPER', frame, dfr2, frame)
    obf = frame.copy()
    for x in range(3, 13):
        obf.set(x, 4, [40, 40, 42]); obf.set(x, 5, [80, 80, 84]); obf.set(x, 10, [40, 40, 42]); obf.set(x, 11, [80, 80, 84])
    obb = frame.copy(); obb.set(7, 7, [60, 30, 28]); obb.set(8, 8, [60, 30, 28])
    obb_on = frame.copy()
    for (x, y) in [(7, 7), (8, 7), (7, 8), (8, 8)]: obb_on.set(x, y, [255, 80, 50])
    put('OBSERVER', frame, obf, obb); put('OBSERVER_ON', frame, obf, obb_on)
    nb = framed(col('NOTE_BLOCK'), 59, planks(col('NOTE_BLOCK'), 60))
    for (x, y) in [(6, 6), (7, 6), (8, 6), (9, 6), (6, 9), (7, 9), (8, 9), (9, 9), (6, 7), (6, 8), (9, 7), (9, 8)]: nb.set(x, y, [40, 26, 16])
    put('NOTE_BLOCK', nb)
    for k, glass in [('DAYLIGHT_DETECTOR', [180, 210, 224]), ('DAYLIGHT_DETECTOR_INV', [80, 110, 168])]:
        top = planks(sc(col('OAK_PLANKS'), 0.8), 61)
        for (x0, y0) in [(2, 2), (9, 2), (2, 9), (9, 9)]:
            for yy in range(5):
                for xx in range(5): top.set(x0 + xx, y0 + yy, sc(glass, 1.15 if xx == 0 or yy == 0 else 1.0))
        put(k, planks(sc(col('OAK_PLANKS'), 0.85), 62), top, planks(sc(col('OAK_PLANKS'), 0.7), 63))
    # ベッド：横は下の 10 段（布団・枠・脚）、上は布団と枕
    bed_side = Img(alpha=True)
    for y in range(6, 16):
        for x in range(N):
            if y < 9: bed_side.set(x, y, [236, 234, 228] if y > 6 else [250, 250, 246])
            elif y < 12: bed_side.set(x, y, sc(col('OAK_PLANKS'), 1.0 if y < 11 else 0.8))
            elif x < 3 or x > 12: bed_side.set(x, y, sc(col('OAK_PLANKS'), 0.7))
    bed_top = Img()
    for y in range(N):
        for x in range(N):
            bed_top.set(x, y, [250, 250, 246] if y < 5 else [232, 230, 222] if (x + y) % 6 else [214, 212, 204])
    put('BED', bed_side, bed_top, sc_img(col('OAK_PLANKS'), 0.8), cut=bed_side)
    for i in range(16):
        dot = Img(alpha=True)
        put('REDSTONE_WIRE_' + str(i), dot)
    # 粉の線と点（白。色は強さに合わせて描くときに付ける）
    extra = {}
    dot = Img(alpha=True)
    for (x, y) in [(6, 5), (7, 5), (8, 5), (5, 6), (6, 6), (7, 6), (8, 6), (9, 6), (5, 7), (6, 7), (7, 7), (8, 7), (9, 7), (10, 7), (5, 8), (6, 8), (7, 8), (8, 8), (9, 8), (6, 9), (7, 9), (8, 9), (9, 9), (7, 10)]:
        dot.set(x, y, [255, 255, 255] if (x + y) % 3 else [214, 214, 214])
    line = Img(alpha=True)
    for y in range(N):
        for x in (6, 7, 8, 9):
            if (x in (6, 9)) and (hsh(64, x, y) % 3 == 0): continue
            line.set(x, y, [255, 255, 255] if (x + y) % 4 else [214, 214, 214])
    extra['WIRE_DOT'] = dot; extra['WIRE_LINE'] = line
    # 壊している途中のひび（4 段階）。中心から枝分かれして伸びる 1 ドットの線
    paths = [[(7, 7), (8, 6), (9, 5), (9, 4), (10, 3)], [(7, 7), (6, 8), (5, 9), (5, 10), (4, 11)], [(7, 7), (8, 8), (9, 9), (10, 9), (11, 10), (12, 11)],
             [(7, 7), (6, 6), (5, 5), (4, 5), (3, 4)], [(9, 5), (10, 6), (11, 6), (12, 7), (13, 7)], [(5, 10), (6, 11), (6, 12), (7, 13)],
             [(10, 3), (10, 2), (11, 1)], [(3, 4), (2, 3), (1, 3)], [(12, 11), (13, 12), (14, 13), (14, 14)], [(4, 11), (3, 12), (2, 13), (1, 14)],
             [(11, 6), (12, 5), (13, 4), (14, 4)], [(6, 6), (6, 5), (7, 4), (7, 3), (6, 2)], [(10, 9), (10, 10), (9, 11), (9, 12)], [(5, 9), (4, 8), (3, 8), (2, 7)]]
    upto = [2, 6, 10, 14]
    for st_ in range(4):
        cr = Img(alpha=True)
        for pth in paths[:upto[st_]]:
            for (x, y) in pth: cr.set(x, y, [0, 0, 0])
        extra['CRACK_' + str(st_)] = cr
    for i in range(16):
        T['REDSTONE_WIRE_' + str(i)] = {'side': dot, 'top': dot, 'bottom': dot, 'cut': dot}
    # コーラス
    put('CHORUS_PLANT', noisy([108, 82, 116], 65, (0.8, 0.92, 1.04, 1.14)))
    put('CHORUS_FLOWER', panel([156, 132, 164], 66, 'dots'))

    # ---- 追加のブロック ----
    # スライムブロック：明るい外側の膜と、中の濃い芯
    sl = Img()
    for y in range(N):
        for x in range(N):
            edge = x in (0, 15) or y in (0, 15)
            core = 3 <= x <= 12 and 3 <= y <= 12
            k = (1.22 if (x == 0 or y == 0) else 0.86) if edge else (0.78 if core else 1.06)
            if core and (x in (3, 12) or y in (3, 12)): k = 0.7
            sl.set(x, y, sc([108, 188, 80], k * (0.97 + 0.06 * (hsh(70, x, y) % 3) / 2)))
    for (x, y) in [(1, 1), (2, 1), (1, 2), (5, 5), (6, 5), (5, 6)]: sl.set(x, y, [214, 246, 190])
    put('SLIME_BLOCK', sl)
    # 干し草の俵：縦の藁と、赤茶の 2 本の縄。上は藁の切り口
    hay = Img(); r = random.Random(71)
    cols = [r.choice([0.84, 0.94, 1.0, 1.08, 1.14]) for _ in range(N)]
    for y in range(N):
        for x in range(N):
            k = cols[x] * (0.9 if (hsh(72, x, y // 3) % 5 == 0) else 1.0)
            hay.set(x, y, sc([200, 168, 58], k))
    for y0 in (3, 11):
        for x in range(N):
            hay.set(x, y0, [140, 52, 30]); hay.set(x, y0 + 1, [104, 36, 22])
    hayt = Img()
    for y in range(N):
        for x in range(N):
            v = (hsh(73, x, y) % 7)
            hayt.set(x, y, sc([210, 178, 66], [0.72, 0.86, 0.96, 1.04, 1.12, 0.92, 1.0][v]))
    for x in range(N):
        for y0 in (3, 11):
            hayt.set(x, y0, [140, 52, 30])
    put('HAY_BALE', hay, hayt)
    # テラコッタ：焼いた粘土のむらのある赤茶
    put('TERRACOTTA', specks(noisy([152, 92, 66], 74, (0.9, 0.96, 1.0, 1.04), ((4, 0.6), (1, 0.4))), 75, 10, [[132, 78, 56], [168, 104, 76]]))
    # なめらかな石：明るい灰色の板。横は縁取りの線
    sms = noisy([166, 166, 162], 76, (0.95, 1.0, 1.04), ((4, 0.5), (1, 0.5)))
    smside = sms.copy()
    for i in range(N):
        smside.set(i, 0, [196, 196, 192]); smside.set(i, 15, [116, 116, 112]); smside.set(0, i, [190, 190, 186]); smside.set(15, i, [120, 120, 116])
        smside.set(i, 7, [130, 130, 126]); smside.set(i, 8, [190, 190, 186])
    smtop = sms.copy()
    for i in range(N):
        smtop.set(i, 0, [196, 196, 192]); smtop.set(0, i, [196, 196, 192]); smtop.set(i, 15, [116, 116, 112]); smtop.set(15, i, [116, 116, 112])
    put('SMOOTH_STONE', smside, smtop)
    # ランタン：胴（横 5〜10、縦 9〜15）に黒い鉄の枠と灯り、上の金具（縦 7〜8）。上面は中央の 6×6
    dark, iron, glow, glow2 = [42, 42, 48], [86, 88, 96], [255, 214, 110], [246, 160, 52]
    ls = Img(dark)
    for y in range(N):
        for x in range(N):
            if y in (7, 8) and 6 <= x <= 9: ls.set(x, y, iron if y == 7 else dark)
            elif 9 <= y <= 15 and 5 <= x <= 10:
                if y in (9, 15) or x in (5, 10): ls.set(x, y, iron if y == 9 else dark)
                else: ls.set(x, y, glow if (x in (7, 8) and 11 <= y <= 13) else glow2)
    lt = Img(dark)
    for y in range(5, 11):
        for x in range(5, 11):
            lt.set(x, y, iron if x in (5, 10) or y in (5, 10) else dark)
    for (x, y) in [(7, 7), (8, 7), (7, 8), (8, 8)]: lt.set(x, y, [60, 60, 66])
    put('LANTERN', ls, lt, lt)
    # 色付きの羊毛（毛の粒）
    WOOL = {'ORANGE': '#e0761a', 'MAGENTA': '#b44cb4', 'LIGHT_BLUE': '#3aa8d8', 'YELLOW': '#f0c434', 'LIME': '#70ba1c', 'PINK': '#ec8aa8',
            'GRAY': '#3e4448', 'LIGHT_GRAY': '#8e8e86', 'CYAN': '#158a92', 'PURPLE': '#7a2aa8', 'BLUE': '#343c9c', 'GREEN': '#546c1c',
            'RED': '#a42620', 'BLACK': '#18181c'}
    for k, c in WOOL.items():
        base = hx(c)
        lv = (0.8, 0.9, 1.0, 1.1) if sum(base) > 120 else (0.8, 1.0, 1.25, 1.5)
        put(k + '_WOOL', noisy(base, 39, lv, ((2, 0.5), (1, 0.5))))

    # ネザーポータル：紫の渦
    pt = Img()
    for y in range(N):
        for x in range(N):
            dx, dy = x - 7.5, y - 7.5
            v = math.sin(math.hypot(dx, dy) * 0.9 - math.atan2(dy, dx) * 2) + 0.35 * math.sin(x * 1.3 + y * 0.7)
            pt.set(x, y, [168, 96, 255] if v > 1.0 else [122, 52, 214] if v > 0.3 else [90, 30, 170] if v > -0.6 else [62, 16, 128])
    put('NETHER_PORTAL', pt)

    # カボチャ：縦の筋のある橙色、上はへたのある面。くり抜いたものは横に顔
    org = [216, 134, 42]
    pk_side = Img()
    for y in range(N):
        for x in range(N):
            rib = x % 4
            k = [0.78, 1.0, 1.1, 0.94][rib] * (0.96 + 0.08 * ((hsh(80, x, y) % 3) / 2))
            if y in (0, 15): k *= 0.85
            pk_side.set(x, y, sc(org, k))
    pk_top = Img()
    for y in range(N):
        for x in range(N):
            d = max(abs(x - 7.5), abs(y - 7.5))
            pk_top.set(x, y, sc(org, (0.9 if int(d) % 3 == 0 else 1.04) * (0.96 + 0.08 * ((hsh(81, x, y) % 3) / 2))))
    for (x, y) in [(7, 6), (8, 6), (7, 7), (8, 7), (7, 8), (8, 8), (6, 7), (9, 8)]:
        pk_top.set(x, y, [96, 120, 48] if (x + y) % 2 else [70, 92, 36])
    put('PUMPKIN', pk_side, pk_top, pk_top)
    face = pk_side.copy()
    hole, glow = [58, 30, 10], [40, 20, 6]
    for (x, y) in [(3, 4), (4, 4), (5, 4), (4, 5), (3, 5), (5, 5), (10, 4), (11, 4), (12, 4), (10, 5), (11, 5), (12, 5), (4, 3), (11, 3)]:
        face.set(x, y, hole)
    for x in range(3, 13):
        face.set(x, 10, hole)
        if x % 3 != 0: face.set(x, 11, hole)
    for x in (4, 7, 10): face.set(x, 9, hole); face.set(x, 12, glow)
    put('CARVED_PUMPKIN', face, pk_top, pk_top)

    # ---- 第 2 回：レール（切り抜き）----
    tie, tie_d, iron_c, iron_d, gold_c, gold_d = [124, 92, 58], [88, 64, 40], [196, 196, 200], [120, 120, 126], [236, 196, 64], [160, 120, 30]
    def rail_straight(ew, powered):
        im = Img(alpha=True)
        for y in range(N):
            for x in range(N):
                u, v = (y, x) if ew else (x, y)
                c = None
                if v % 4 in (1, 2) and 1 <= u <= 14: c = tie if v % 4 == 1 else tie_d
                if u in (3, 12): c = (gold_c if powered else iron_c)
                if u in (4, 13): c = (gold_d if powered else iron_d)
                if powered and u in (7, 8) and v % 4 in (1, 2): c = [200, 40, 30] if u == 7 else [140, 24, 20]
                if c: im.set(x, y, c)
        return im
    def rail_curve(cx, cy):
        im = Img(alpha=True)
        for y in range(N):
            for x in range(N):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                d = math.hypot(dx, dy); th = math.degrees(math.atan2(abs(dy), abs(dx)))
                c = None
                if 2 < d < 15 and (th % 22.5) < 8: c = tie if (th % 22.5) < 4 else tie_d
                if abs(d - 4.2) < 0.75 or abs(d - 12.6) < 0.75: c = iron_c
                elif abs(d - 5.1) < 0.45 or abs(d - 13.5) < 0.45: c = iron_d
                if c: im.set(x, y, c)
        return im
    for k, im in [('RAIL_NS', rail_straight(False, False)), ('RAIL_EW', rail_straight(True, False)), ('POWERED_RAIL_NS', rail_straight(False, True)),
                  ('POWERED_RAIL_EW', rail_straight(True, True)), ('RAIL_NE', rail_curve(16, 0)), ('RAIL_NW', rail_curve(0, 0)),
                  ('RAIL_SE', rail_curve(16, 16)), ('RAIL_SW', rail_curve(0, 16))]:
        put(k, im, cut=im)
    # 作業ブロック
    stn = stone(col('STONE'), 90)
    smt = noisy([58, 58, 68], 91, (0.85, 0.95, 1.05, 1.15))
    for i in range(N): smt.set(i, 0, [96, 96, 110]); smt.set(0, i, [96, 96, 110]); smt.set(i, 15, [30, 30, 36]); smt.set(15, i, [30, 30, 36])
    sms = planks([110, 76, 48], 92)
    for x in range(N):
        for y in range(5): sms.set(x, y, smt.get(x, y))
    for (x, y) in [(4, 8), (5, 8), (10, 8), (11, 8), (4, 9), (11, 9)]: sms.set(x, y, [40, 40, 46])
    put('SMITHING_TABLE', sms, smt, planks([110, 76, 48], 93))
    sct = stn.copy()
    for x in range(1, 15): sct.set(x, 7, [90, 90, 94]); sct.set(x, 8, [70, 70, 74])
    scs = stn.copy()
    for x in range(N): scs.set(x, 7, sc(col('STONE'), 0.7))
    put('STONECUTTER', scs, sct, stn)
    ctp = planks([120, 86, 56], 94)
    for y in range(3, 13):
        for x in range(3, 13): ctp.set(x, y, [226, 214, 176] if (x + y) % 5 else [196, 180, 140])
    for (x, y) in [(5, 6), (6, 6), (7, 7), (9, 9), (10, 8), (6, 10)]: ctp.set(x, y, [90, 130, 80])
    cts = planks([104, 74, 48], 95)
    for x in range(2, 14): cts.set(x, 2, [226, 214, 176]); cts.set(x, 3, [210, 196, 156])
    put('CARTOGRAPHY_TABLE', cts, ctp, planks([104, 74, 48], 96))
    bfs = panel([120, 120, 124], 97, 'noise')
    bff = bfs.copy()
    for y in range(7, 14):
        for x in range(3, 13): bff.set(x, y, [30, 30, 32] if (x % 2 == 0 or y in (7, 13)) else [64, 64, 68])
    bfl = bff.copy()
    for y in range(8, 13):
        for x in range(3, 13):
            if x % 2: bfl.set(x, y, [255, 170, 60] if y > 9 else [255, 220, 120])
    put('BLAST_FURNACE', bff, bfs, bfs); put('BLAST_FURNACE_LIT', bfl, bfs, bfs)
    sml = log_side([84, 62, 40], 98)
    smf = sml.copy()
    for y in range(7, 13):
        for x in range(3, 13): smf.set(x, y, [24, 22, 20] if y > 7 else [60, 60, 64])
    for x in range(3, 13, 2): smf.set(x, 9, [90, 90, 96])
    sfl = smf.copy()
    for y in range(10, 13):
        for x in range(4, 12): sfl.set(x, y, [255, 160, 50] if (x + y) % 3 else [255, 214, 100])
    smt2 = panel([70, 70, 74], 99, 'rivet')
    put('SMOKER', smf, smt2, smt2); put('SMOKER_LIT', sfl, smt2, smt2)
    put('CAMPFIRE', log_side(col('OAK_LOG'), 100), log_top(col('OAK_LOG'), col('OAK_PLANKS'), 100))
    ad = Img()
    for y in range(N):
        for x in range(N):
            r = math.hypot(x - 7.5, y - 4.5) if y < 8 else math.hypot(x - 4.5, y - 11.5)
            k = 0.7 if int(r) % 3 == 0 else 1.0 if int(r) % 3 == 1 else 1.15
            ad.set(x, y, sc([96, 74, 68], k * (0.95 + 0.1 * ((hsh(101, x, y) % 3) / 2))))
    adt = Img()
    for y in range(N):
        for x in range(N):
            r = math.hypot(x - 7.5, y - 7.5)
            adt.set(x, y, sc([96, 74, 68], 0.7 if int(r) % 3 == 0 else 1.05))
    put('ANCIENT_DEBRIS', ad, adt)
    cpk = planks([138, 104, 62], 102)
    for i in range(N): cpk.set(i, 0, sc([138, 104, 62], 0.6)); cpk.set(i, 15, sc([138, 104, 62], 0.6)); cpk.set(0, i, sc([138, 104, 62], 0.6)); cpk.set(15, i, sc([138, 104, 62], 0.6))
    put('COMPOSTER', cpk)

    # ---- 第 3 回：建材・飾り・収納 ----
    C16 = [('WHITE', '#e9ecec')] + list(WOOL.items()) + [('BROWN', '#72482a')]
    put('BROWN_WOOL', noisy(hx('#72482a'), 39, (0.8, 1.0, 1.25, 1.5), ((2, 0.5), (1, 0.5))))
    tc_base = [152, 92, 66]
    for k, c in C16:
        base = hx(c)
        dark = sum(base) < 140
        put(k + '_CONCRETE', noisy(base, 120, (0.96, 1.0, 1.03) if not dark else (0.92, 1.0, 1.1), ((4, 0.6), (1, 0.4))))
        pw = noisy(base, 121, (0.86, 0.95, 1.04, 1.12) if not dark else (0.8, 1.0, 1.2, 1.4), ((1, 1.0),))
        put(k + '_CONCRETE_POWDER', specks(pw, 122, 14, [sc(base, 0.75 if not dark else 1.5)]))
        tb = mixc(base, tc_base, 0.45)
        put(k + '_TERRACOTTA', specks(noisy(tb, 123, (0.9, 0.96, 1.0, 1.04), ((4, 0.6), (1, 0.4))), 124, 8, [sc(tb, 0.85)]))
        g2 = Img(alpha=True)
        for y in range(N):
            for x in range(N):
                if x in (0, 15) or y in (0, 15): g2.set(x, y, sc(base, 1.15 if (x == 0 or y == 0) else 0.8))
                elif (x + y) % 2 == 0: g2.set(x, y, sc(base, 1.0 + 0.08 * ((hsh(125, x, y) % 3) - 1)))
        for (x, y) in [(3, 2), (2, 3), (4, 2), (2, 4), (12, 11), (11, 12)]: g2.set(x, y, mixc(base, [255, 255, 255], 0.6))
        put(k + '_STAINED_GLASS', g2, cut=g2, all_faces=True)
    # トラップドア（窓の穴のある板）と鉄のトラップドア、鉄格子
    for wd_, c in [('OAK', col('OAK_PLANKS')), ('SPRUCE', col('SPRUCE_PLANKS')), ('ACACIA', col('ACACIA_PLANKS')), ('BIRCH', col('BIRCH_PLANKS')), ('JUNGLE', col('JUNGLE_PLANKS')), ('CHERRY', col('CHERRY_PLANKS')), ('MANGROVE', col('MANGROVE_PLANKS')), ('CRIMSON', col('CRIMSON_PLANKS')), ('WARPED', col('WARPED_PLANKS')), ('IRON', [196, 196, 200])]:
        td = Img(alpha=True)
        for y in range(N):
            for x in range(N):
                hole = 3 <= x <= 6 and 3 <= y <= 6 or 9 <= x <= 12 and 3 <= y <= 6 or 3 <= x <= 6 and 9 <= y <= 12 or 9 <= x <= 12 and 9 <= y <= 12
                if hole and wd_ != 'IRON': continue
                edge = x in (0, 15) or y in (0, 15)
                k2 = 0.62 if edge else (1.06 if x % 5 == 1 else 0.94 if x % 5 == 4 else 1.0)
                if wd_ == 'IRON': k2 = 0.7 if edge or hole and (x + y) % 2 else 1.0
                td.set(x, y, sc(c, k2))
        put(wd_ + '_TRAPDOOR', td, cut=td, all_faces=True)
    bars = Img(alpha=True)
    for y in range(N):
        for x in range(N):
            if x % 5 in (1, 2) or y in (0, 1, 14, 15): bars.set(x, y, [150, 150, 156] if x % 5 == 1 or y in (0, 14) else [96, 96, 102])
    put('IRON_BARS', bars, cut=bars, all_faces=True)
    fr = Img()
    for y in range(N):
        for x in range(N):
            edge = x in (0, 1, 14, 15) or y in (0, 1, 14, 15)
            fr.set(x, y, sc([150, 112, 70], 1.1 if (x == 0 or y == 0) else 0.7 if (x == 15 or y == 15) else 0.95) if edge else sc([116, 78, 48], 0.95 + 0.1 * ((hsh(126, x, y) % 3) / 2)))
    put('ITEM_FRAME', fr)
    fp = Img()
    for y in range(N):
        for x in range(N): fp.set(x, y, sc([150, 84, 60], (1.1 if y < 2 else 0.85 if y > 13 else 1.0) * (0.95 + 0.1 * ((hsh(127, x, y) % 3) / 2))))
    put('FLOWER_POT', fp)
    bc = Img()
    for y in range(N):
        for x in range(N):
            d = max(abs(x - 7.5), abs(y - 7.5))
            bc.set(x, y, [250, 255, 255] if d < 3 else [170, 240, 240] if d < 5 else [96, 200, 210])
    put('BEACON', bc)
    lm_s = planks([170, 140, 100], 128)
    for x in range(2, 14):
        for y in range(2, 9): lm_s.set(x, y, [220, 210, 190] if x % 2 else [190, 180, 160])
    lm_t = planks([150, 120, 84], 129)
    for x in range(3, 13):
        for y in range(3, 13): lm_t.set(x, y, [200, 60, 50] if (x // 2 + y // 2) % 2 else [230, 220, 200])
    put('LOOM', lm_s, lm_t)
    bs = Img()
    for y in range(N):
        for x in range(N):
            k2 = [0.86, 1.0, 1.06, 0.94][x % 4] * (0.95 + 0.1 * ((hsh(130, x, y) % 3) / 2))
            bs.set(x, y, [70, 70, 74] if y in (2, 13) else sc([128, 92, 56], k2))
    bt = Img()
    for y in range(N):
        for x in range(N):
            r = max(abs(x - 7.5), abs(y - 7.5))
            bt.set(x, y, [70, 70, 74] if r > 6.6 else sc([140, 102, 62], 0.85 if int(r) % 2 else 1.0) if r > 2 else [60, 44, 28])
    put('BARREL', bs, bt, bt)
    sb = Img()
    for y in range(N):
        for x in range(N):
            seam = y in (7, 8)
            sb.set(x, y, [70, 46, 82] if seam else sc([150, 110, 170], (1.12 if (x + (y // 4)) % 4 == 0 else 1.0) * (0.92 + 0.12 * ((hsh(131, x, y) % 3) / 2))))
    put('SHELL_BOX', sb, panel([150, 110, 170], 132, 'noise'))
    lc = obsidian([34, 48, 50], 133)
    for y in range(5, 8):
        for x in range(N): lc.set(x, y, [20, 30, 32])
    for (x, y) in [(7, 6), (8, 6), (7, 7), (8, 7), (7, 8), (8, 8)]: lc.set(x, y, [90, 220, 190])
    put('LINKED_CHEST', lc, panel([34, 48, 50], 134, 'dots'))
    # ---- 第 5 回：石の種類・植物・ネザーのバイオーム ----
    def speck(base, seed, cols, n=26, lv=(0.9, 0.97, 1.03, 1.1)):
        return specks(noisy(base, seed, lv, ((2, 0.4), (1, 0.6))), seed + 1, n, cols)
    put('GRANITE', speck([154, 106, 88], 150, [[110, 70, 60], [200, 160, 140], [90, 60, 50]], 34))
    put('DIORITE', speck([200, 200, 196], 151, [[120, 120, 118], [90, 90, 88], [236, 236, 232]], 30))
    put('ANDESITE', speck([136, 138, 136], 152, [[110, 112, 110], [160, 162, 160]], 20, (0.86, 0.95, 1.03, 1.1)))
    put('TUFF', speck([106, 106, 98], 153, [[80, 84, 76], [130, 128, 116], [96, 110, 96]], 24))
    put('CALCITE', noisy([224, 224, 218], 154, (0.93, 0.98, 1.02, 1.05), ((4, 0.6), (1, 0.4))))
    put('SMOOTH_BASALT', noisy([74, 74, 80], 155, (0.9, 0.97, 1.03), ((4, 0.7), (1, 0.3))))
    am = Img()
    for y in range(N):
        for x in range(N):
            k2 = 1.25 if (x + y) % 8 == 0 else 0.8 if (x - y) % 8 == 0 else 1.0 + 0.06 * ((hsh(156, x, y) % 3) - 1)
            am.set(x, y, sc([138, 98, 200], k2))
    put('AMETHYST_BLOCK', am)
    ac = plant_cut(['................', '.......a........', '......aba.......', '...a..aba..a....', '..aba.aba.aba...', '..aba.abc.aba...', '..abaaabcaaba....', '...abcabcabc....',
                    '...abcabcabc..a.', '.a.abcabcabc.ab.', 'aba.aaaaaaa.abc.', 'abc.........abc.', 'abc..........a..', '.a..............', '................', '................'],
                   {'a': [168, 136, 232], 'b': [220, 200, 255], 'c': [120, 86, 180]})
    put('AMETHYST_CLUSTER', ac, cut=ac)
    mel = Img()
    for y in range(N):
        for x in range(N): mel.set(x, y, sc([106, 154, 42], (1.15 if x % 4 == 1 else 0.82 if x % 4 == 3 else 1.0) * (0.95 + 0.1 * ((hsh(157, x, y) % 3) / 2))))
    melt = Img()
    for y in range(N):
        for x in range(N): melt.set(x, y, sc([120, 168, 52], 0.85 if max(abs(x - 7.5), abs(y - 7.5)) % 3 < 1 else 1.0))
    for (x, y) in [(7, 7), (8, 7), (7, 8), (8, 8)]: melt.set(x, y, [70, 90, 30])
    put('MELON', mel, melt, melt)
    bam = Img()
    for y in range(N):
        for x in range(N): bam.set(x, y, [60, 120, 40] if y % 5 == 0 else sc([96, 160, 52], 1.12 if x % 4 == 1 else 0.9 if x % 4 == 3 else 1.0))
    put('BAMBOO', bam, panel([140, 190, 80], 158))
    lp = Img(alpha=True)
    for y in range(N):
        for x in range(N):
            d = math.hypot(x - 7.5, y - 7.5)
            if d < 7.4 and not (x > 7 and abs(y - 7.5) < (x - 7) * 0.4): lp.set(x, y, sc([58, 122, 42], 1.12 if d < 3 else 0.86 if (x + y) % 5 == 0 else 1.0))
    put('LILY_PAD', lp, lp, lp, cut=lp)
    put('SNOW_LAYER', T['SNOW']['side'], T['SNOW']['top'])
    st_ = Img()
    for y in range(N):
        for x in range(N): st_.set(x, y, sc([216, 208, 192], 0.88 if x % 3 == 0 else 1.0 + 0.05 * ((hsh(159, x, y) % 3) - 1)))
    put('MUSHROOM_STEM', st_)
    rm = noisy([184, 48, 42], 160, (0.9, 1.0, 1.08))
    for (x, y) in [(2, 3), (3, 3), (2, 4), (3, 4), (10, 2), (11, 2), (10, 3), (6, 9), (7, 9), (6, 10), (7, 10), (12, 11), (13, 11), (12, 12), (3, 13)]: rm.set(x, y, [236, 230, 220])
    put('RED_MUSHROOM_BLOCK', rm)
    put('BROWN_MUSHROOM_BLOCK', speck([140, 106, 74], 161, [[120, 88, 60], [160, 124, 90]], 30))
    sg2 = plant_cut(['................', '....a......a....', '....a..a...a....', '...aa..a...ab...', '...a...ab..b....', '..ab...b...b..a.', '..b...ab..ab..a.', '.ab...b...b..ab.',
                     '.b...ab..ab..ab.', '.b...b...b...b..', 'ab..ab..ab..ab..', 'b...b...b...b...', 'b..ab..ab..ab...', 'b..b...b...b....', 'b..b...b...b....', 'b..b...b...b....'],
                    {'a': [84, 168, 72], 'b': [52, 128, 56]})
    put('SEAGRASS', sg2, cut=sg2)
    kp = plant_cut(['.......aa.......', '......aab.......', '.......ab.c.....', '......abb.cc....', '..cc..ab........', '..ccc.abb.......', '......aab.......', '.......ab..cc...',
                    '.......abb.ccc..', '......aab.......', '..cc..ab........', '..ccc.abb.......', '......aab.......', '.......ab.cc....', '......abb.ccc...', '.......ab.......'],
                   {'a': [92, 140, 52], 'b': [62, 104, 36], 'c': [124, 164, 62]})
    put('KELP', kp, cut=kp)
    nr = T['NETHERRACK']['side']
    for k, c in [('CRIMSON', [150, 30, 34]), ('WARPED', [40, 128, 112])]:
        top = noisy(c, 162 + len(k), (0.82, 0.94, 1.04, 1.14), ((2, 0.4), (1, 0.6)))
        side = nr.copy()
        for x in range(N):
            hh = 3 + (hsh(163, x) % 3)
            for y in range(hh): side.set(x, y, top.get(x, y))
        put(k + '_NYLIUM', side, top, nr)
        stc = [108, 40, 58] if k == 'CRIMSON' else [44, 90, 92]
        stem_s = Img()
        for y in range(N):
            for x in range(N): stem_s.set(x, y, sc(stc, [0.8, 1.0, 1.15, 0.9][(x + hsh(164, x) % 2) % 4] * (0.95 + 0.1 * ((hsh(165, x, y // 3) % 3) / 2))))
        for y in range(0, N, 5):
            for x in range(N):
                if hsh(166 + len(k), x, y) % 3 == 0: stem_s.set(x, y, [210, 120, 60] if k == 'CRIMSON' else [60, 220, 190])
        put(k + '_STEM', stem_s, log_top(stc, sc(stc, 1.35), 167))
        put(k + '_PLANKS', planks(sc(stc, 1.2), 168 + len(k)))
        put('NETHER_WART_BLOCK' if k == 'CRIMSON' else 'WARPED_WART_BLOCK', noisy([138, 26, 26] if k == 'CRIMSON' else [26, 122, 122], 169, (0.8, 0.92, 1.04, 1.16), ((2, 0.5), (1, 0.5))))
        rc = [170, 40, 58] if k == 'CRIMSON' else [44, 160, 140]
        roots = plant_cut(['................', '................', '...a.......a....', '...a...a...a....', '..ab...a..ab....', '..b...ab..b..a..', '.ab...b...b..b..',
                           '.b...ab..ab.ab..', '.b...b...b..b...', 'ab..ab..ab.ab...', 'b...b...b..b....', 'b..ab..ab.ab....', 'b..b...b..b.....', 'b..b...b..b.....', '................', '................'],
                          {'a': mixc(rc, [255, 255, 255], 0.25), 'b': rc})
        put(k + '_ROOTS', roots, cut=roots)
    sl2 = Img()
    for y in range(N):
        for x in range(N): sl2.set(x, y, [255, 200, 110] if hsh(170, x, y) % 7 == 0 else sc([240, 150, 70], 0.9 + 0.2 * ((hsh(171, x, y) % 3) / 2)))
    put('SHROOMLIGHT', sl2)
    put('BLACKSTONE', speck([42, 36, 40], 172, [[24, 20, 24], [70, 62, 66]], 30, (0.85, 1.0, 1.15)), noisy([42, 36, 40], 173, (0.85, 1.0, 1.15)))
    for k, c in [('TUBE', '#3a5ad8'), ('BRAIN', '#d85aa8'), ('BUBBLE', '#a83ad8'), ('FIRE', '#d83a3a'), ('HORN', '#e8c83a')]:
        base = hx(c)
        cb = noisy(base, 174 + len(k), (0.84, 0.96, 1.06), ((2, 0.5), (1, 0.5)))
        for y in range(1, N, 4):
            for x in range((y // 4) % 2 * 2, N, 4): cb.set(x, y, sc(base, 0.55)); cb.set(x + 1, y, sc(base, 0.7))
        put(k + '_CORAL_BLOCK', cb)
        cp = plant_cut(['................', '..a.....a....a..', '..a..a..a...aa..', '.ab..a.ab..ab...', '..b.ab.b..ab....', '..bab..b.ab..a..', '...b...bab..ab..',
                        '...b..ab...ab...', '...bab.b..ab....', '....b..bab......', '....b...b.......', '....bb.bb.......', '.....bbb........', '......b.........', '......b.........', '......b.........'],
                       {'a': mixc(base, [255, 255, 255], 0.35), 'b': base})
        put(k + '_CORAL', cp, cut=cp)
    for k in ('PUMPKIN', 'MELON'):
        for stg in range(8):
            im = Img(alpha=True)
            h2 = 3 + stg * 1.6
            col2 = mixc([96, 160, 52], [190, 160, 70], stg / 7)
            for y in range(int(16 - h2), 16):
                im.set(7, y, col2); im.set(8, y, sc(col2, 0.8))
                if y % 3 == 0: im.set(6, y, col2); im.set(9, y - 1, sc(col2, 1.1))
            put(k + '_STEM_' + str(stg), im, cut=im)
    for stg, c in [(0, [150, 170, 70]), (1, [176, 104, 50])]:
        cc = Img()
        for y in range(N):
            for x in range(N): cc.set(x, y, sc(c, 1.15 if x % 4 == 1 else 0.82 if x % 4 == 3 else 1.0))
        put('COCOA_' + str(stg), cc)
    vn = Img(alpha=True)
    r3 = random.Random(175)
    for x0 in range(0, N, 3):
        x = x0 + r3.randrange(0, 2)
        for y in range(N):
            if r3.random() < 0.85: vn.set(x % N, y, [56, 110, 40] if y % 2 else [74, 136, 52])
            if r3.random() < 0.25: vn.set((x + 1) % N, y, [92, 156, 64])
    put('VINE', vn, cut=vn, all_faces=True)
    # 第 4 回：ハチの巣箱・ハチの巣・黒い頭蓋骨・エンドポータル
    hv_s = planks([196, 156, 84], 140); hv_f = hv_s.copy()
    for y in range(8, 12):
        for x in range(5, 11): hv_f.set(x, y, [60, 40, 20] if y > 8 else [140, 100, 50])
    hv_t = Img()
    for y in range(N):
        for x in range(N): hv_t.set(x, y, [236, 190, 70] if (x + 2 * (y % 2)) % 4 else [200, 150, 50])
    put('BEEHIVE', hv_f, hv_t, planks([196, 156, 84], 141))
    bn = Img()
    for y in range(N):
        for x in range(N):
            k2 = 1.1 if (x // 3 + y // 2) % 3 == 0 else 0.92
            bn.set(x, y, sc([216, 176, 64], k2 * (0.95 + 0.1 * ((hsh(142, x, y) % 3) / 2))))
    for (x, y) in [(4, 5), (5, 5), (10, 9), (11, 9), (6, 11), (7, 11)]: bn.set(x, y, [70, 46, 20])
    put('BEE_NEST', bn)
    sk = Img()
    for y in range(N):
        for x in range(N): sk.set(x, y, sc([46, 46, 50], 0.9 + 0.2 * ((hsh(143, x, y) % 3) / 2)))
    for (x, y) in [(4, 6), (5, 6), (4, 7), (5, 7), (10, 6), (11, 6), (10, 7), (11, 7), (7, 10), (8, 10), (5, 12), (7, 12), (9, 12), (11, 12)]: sk.set(x, y, [12, 12, 14])
    put('DARK_SKULL', sk, noisy([46, 46, 50], 144, (0.9, 1.0, 1.1)))
    ep = Img([8, 8, 18])
    for y in range(N):
        for x in range(N):
            h2 = hsh(145, x, y) % 29
            if h2 == 0: ep.set(x, y, [200, 240, 230])
            elif h2 < 3: ep.set(x, y, [40, 90, 90])
            elif h2 < 6: ep.set(x, y, [20, 30, 50])
    put('END_PORTAL', ep)
    put('EMERALD_BLOCK', panel([42, 180, 84], 135, 'facet')); put('NETHERITE_BLOCK', panel([74, 66, 70], 136, 'noise'))
    # ---- 第 6 回：構造物の建材 ----
    # 海晶（海底神殿）：色の揺れる青緑、レンガ、暗い海晶、シーランタン
    pr = Img()
    f6 = field(180, ((4, 0.5), (2, 0.3), (1, 0.2))); lo6, hi6 = stats(f6)
    for y in range(N):
        for x in range(N):
            v = (f6[y][x] - lo6) / (hi6 - lo6)
            pr.set(x, y, mixc([84, 150, 140], [120, 176, 150], v) if v < 0.7 else mixc([120, 176, 150], [150, 120, 170], (v - 0.7) * 1.6))
            if hsh(181, x, y) % 13 == 0: pr.set(x, y, [70, 120, 118])
    put('PRISMARINE', pr)
    put('PRISMARINE_BRICKS', bricks([100, 170, 152], 182, [62, 112, 102], 4, 8))
    dpr = Img()
    for y in range(N):
        for x in range(N):
            e = x % 8 == 0 or y % 8 == 0
            dpr.set(x, y, [30, 62, 52] if e else sc([52, 96, 80], (1.12 if (x % 8 == 1 or y % 8 == 1) else 0.9 if (x % 8 == 7 or y % 8 == 7) else 1.0) * (0.96 + 0.08 * ((hsh(183, x, y) % 3) / 2))))
    put('DARK_PRISMARINE', dpr)
    sl = Img()
    for y in range(N):
        for x in range(N):
            if x in (0, 15) or y in (0, 15): c6 = [130, 170, 160]
            elif x in (7, 8) or y in (7, 8): c6 = [170, 210, 200]
            else:
                qx, qy = (x - 1) % 7, (y - 1) % 7
                d6 = max(abs(qx - 2.5), abs(qy - 2.5))
                c6 = [250, 255, 250] if d6 < 1.2 else [220, 240, 232] if d6 < 2.2 else [190, 222, 212]
            sl.set(x, y, c6)
    put('SEA_LANTERN', sl)
    # プルプァ（エンドシティ）：紫の小さなタイル、柱、エンドストーンレンガ、エンドロッド
    pu = Img()
    for y in range(N):
        for x in range(N):
            tx6, ty6 = x % 4, y % 4
            k6 = 1.16 if tx6 == 0 or ty6 == 0 else 0.8 if tx6 == 3 or ty6 == 3 else 1.0
            pu.set(x, y, sc([168, 124, 168], k6 * (0.95 + 0.1 * ((hsh(184, x // 4, y // 4) % 3) / 2))))
    put('PURPUR_BLOCK', pu)
    pps = Img()
    for y in range(N):
        for x in range(N): pps.set(x, y, sc([170, 128, 170], [0.82, 1.12, 1.0, 0.92][x % 4] * (0.96 + 0.08 * ((hsh(185, x, y) % 3) / 2))))
    ppt = Img()
    for y in range(N):
        for x in range(N):
            d6 = int(max(abs(x - 7.5), abs(y - 7.5)))
            ppt.set(x, y, sc([170, 128, 170], 1.14 if d6 % 3 == 0 else 0.86 if d6 % 3 == 2 else 1.0))
    put('PURPUR_PILLAR', pps, ppt)
    put('END_STONE_BRICKS', bricks([222, 224, 168], 186, [176, 172, 122], 4, 8))
    er = Img([236, 230, 220])
    for y in range(N):
        for x in range(N): er.set(x, y, sc([240, 234, 224], 1.04 if x % 4 == 1 else 0.92 if x % 4 == 3 else 1.0))
    put('END_ROD', er)
    # 石レンガの仲間（要塞）
    msb = stone_bricks([122, 122, 122], 187)
    f7 = field(188, ((4, 0.7), (1, 0.3))); lo7, hi7 = stats(f7)
    for y in range(N):
        for x in range(N):
            if (f7[y][x] - lo7) / (hi7 - lo7) > 0.58: msb.set(x, y, sc([84, 116, 56], 0.85 + 0.3 * (hsh(189, x, y) % 3) / 2))
    put('MOSSY_STONE_BRICKS', msb)
    csb = stone_bricks([122, 122, 122], 190)
    cx6, cy6 = 3, 2
    for (dx6, dy6) in [(0, 0), (1, 1), (1, 2), (2, 3), (3, 3), (3, 4), (4, 5), (4, 6), (5, 7), (6, 8), (6, 9), (5, 10), (6, 11), (7, 12), (8, 13), (8, 5), (9, 4), (10, 4), (11, 3)]:
        csb.set(cx6 + dx6, cy6 + dy6, [62, 62, 62])
    put('CRACKED_STONE_BRICKS', csb)
    chs = Img()
    for y in range(N):
        for x in range(N):
            d6 = max(abs(x - 7.5), abs(y - 7.5))
            k6 = 1.2 if d6 > 7 and (x == 0 or y == 0) else 0.62 if d6 > 7 else 0.7 if 5 < d6 < 6 else 1.15 if 4.5 < d6 < 5.5 else 0.72 if 2 < d6 < 3 else 1.08 if d6 < 2 else 1.0
            chs.set(x, y, sc([124, 124, 124], k6 * (0.96 + 0.08 * ((hsh(191, x, y) % 3) / 2))))
    put('CHISELED_STONE_BRICKS', chs)
    # ブラックストーン（ピグリンの砦）
    put('POLISHED_BLACKSTONE_BRICKS', stone_bricks([54, 48, 56], 192))
    gb = speck([42, 36, 40], 193, [[24, 20, 24], [70, 62, 66]], 24, (0.85, 1.0, 1.15))
    r6 = random.Random(194)
    for _ in range(7):
        x6, y6 = r6.randrange(N), r6.randrange(N)
        for (dx6, dy6) in [(0, 0), (1, 0), (0, 1), (1, 1)][:r6.randrange(2, 5)]: gb.set(x6 + dx6, y6 + dy6, [236, 186, 60] if (dx6 + dy6) % 2 == 0 else [196, 140, 40])
    put('GILDED_BLACKSTONE', gb)
    # 濃いオーク（森の洋館）
    put('DARK_OAK_PLANKS', planks([74, 48, 24], 195))
    put('DARK_OAK_LOG', log_side([62, 48, 32], 196), log_top([62, 48, 32], [92, 66, 40], 197))
    # 目をはめたエンドポータルフレーム
    eyt = epf_top.copy()
    for y in range(N):
        for x in range(N):
            d6 = math.hypot(x - 7.5, y - 7.5)
            if d6 < 3.3: eyt.set(x, y, [18, 40, 30] if d6 < 1.3 else [40, 150, 110] if d6 < 2.4 else [26, 90, 66])
    eyt.set(6, 6, [200, 255, 220])
    put('END_PORTAL_FRAME_EYE', epf_side, eyt, es)
    # ---- レッドストーンの見直し：ターゲット・トラップチェスト・スカルクセンサー・銅の電球・クラフター・ハチミツ・干し草・レール ----
    hay_side = Img()
    for y in range(N):
        for x in range(N):
            band = y in (3, 4, 11, 12)
            base = [176, 140, 40] if band else [214, 180, 64]
            hay_side.set(x, y, sc(base, (1.12 if (x + hsh(200, y)) % 3 == 0 else 0.92 if (x + hsh(201, y)) % 5 == 0 else 1.0) * (0.94 if band and x % 2 else 1.0)))
    hay_top = Img()
    for y in range(N):
        for x in range(N):
            d6 = int(max(abs(x - 7.5), abs(y - 7.5)))
            hay_top.set(x, y, sc([206, 170, 56], (1.1 if (d6 + hsh(202, x, y) % 2) % 3 == 0 else 0.9) if d6 < 7 else 0.78))
    put('HAY_BLOCK', hay_side, hay_top)
    tg = Img()
    for y in range(N):
        for x in range(N):
            d6 = math.hypot(x - 7.5, y - 7.5)
            c6 = [214, 46, 40] if d6 < 1.6 or 3.2 <= d6 < 4.8 or 6.4 <= d6 < 7.6 else [236, 228, 214]
            tg.set(x, y, sc(c6, 0.94 + 0.08 * ((hsh(203, x, y) % 3) / 2)))
    put('TARGET', tg, hay_top)
    tch = planks(sc(col('CHEST'), 1.0), 204)
    for x in range(N):
        tch.set(x, 0, sc(col('CHEST'), 0.6)); tch.set(x, 15, sc(col('CHEST'), 0.6)); tch.set(x, 5, sc(col('CHEST'), 0.5)); tch.set(x, 6, sc(col('CHEST'), 0.5))
    for y in range(4, 9):
        for x in range(7, 9): tch.set(x, y, [200, 200, 200] if y != 8 else [120, 120, 120])
    for y in range(0, 16, 15):
        for x in range(2, 14, 4): tch.set(x, y, [190, 40, 30])
    for y in range(1, 15):
        tch.set(0, y, [150, 30, 24]); tch.set(15, y, [150, 30, 24])
    put('TRAPPED_CHEST', tch, framed(col('CHEST'), 205, planks(col('CHEST'), 206)))
    def sculk(on):
        im = Img()
        for y in range(N):
            for x in range(N):
                v6 = hsh(207, x, y) % 11
                im.set(x, y, [18, 44, 52] if v6 > 2 else [12, 30, 36])
        for (x, y) in [(3, 3), (11, 4), (6, 9), (12, 12), (2, 12), (8, 2)]:
            c6 = [120, 250, 250] if on else [40, 140, 150]
            im.set(x, y, c6); im.set(x + 1, y, c6)
        return im
    s_side = sculk(False)
    for x in range(N):
        for y in range(9, 16): s_side.set(x, y, sc([40, 36, 30], 0.9 + 0.2 * ((hsh(208, x, y) % 3) / 2)))
    put('SCULK_SENSOR', s_side, sculk(False))
    s_side2 = sculk(True)
    for x in range(N):
        for y in range(9, 16): s_side2.set(x, y, sc([40, 36, 30], 0.9 + 0.2 * ((hsh(208, x, y) % 3) / 2)))
    put('SCULK_SENSOR_ON', s_side2, sculk(True))
    def bulb(lit):
        im = Img()
        for y in range(N):
            for x in range(N):
                edge = x in (0, 15) or y in (0, 15) or x in (1, 14) or y in (1, 14)
                if edge: c6 = sc([186, 104, 70], 1.15 if (x in (0, 1) or y in (0, 1)) else 0.8)
                else:
                    d6 = math.hypot(x - 7.5, y - 7.5)
                    if lit: c6 = [255, 236, 170] if d6 < 2.5 else [250, 196, 110] if d6 < 4.5 else [226, 150, 80]
                    else: c6 = [120, 70, 52] if d6 < 2.5 else [96, 58, 44] if d6 < 4.5 else [80, 48, 38]
                    if x in (4, 11) or y in (4, 11): c6 = sc([186, 104, 70], 0.9)
                im.set(x, y, c6)
        return im
    put('COPPER_BULB', bulb(False)); put('COPPER_BULB_LIT', bulb(True))
    hon = Img()
    for y in range(N):
        for x in range(N):
            edge = x in (0, 15) or y in (0, 15)
            d6 = max(abs(x - 7.5), abs(y - 7.5))
            hon.set(x, y, [200, 120, 20] if edge else sc([242, 170, 44], 1.12 if d6 < 4 and (x + y) % 4 == 0 else 1.0 if d6 < 6 else 0.9))
    put('HONEY_BLOCK', hon)
    cf = frame.copy()
    for y in range(3, 13):
        for x in range(3, 13): cf.set(x, y, [44, 44, 48] if (x - 3) % 4 == 3 or (y - 3) % 4 == 3 else [86, 76, 60] if (x + y) % 2 else [100, 88, 70])
    for x in range(3, 13): cf.set(x, 2, [180, 60, 40]); cf.set(x, 13, [180, 60, 40])
    put('CRAFTER', frame, cf, frame)
    def rail_special(ew, act):
        im = Img(alpha=True)
        for y in range(N):
            for x in range(N):
                u, v = (y, x) if ew else (x, y)
                c = None
                if v % 4 in (1, 2) and 1 <= u <= 14: c = tie if v % 4 == 1 else tie_d
                if u in (3, 12): c = [150, 60, 50] if act else iron_c
                if u in (4, 13): c = [100, 36, 30] if act else iron_d
                if not act and 6 <= u <= 9 and 5 <= v <= 10: c = [120, 120, 124] if (u + v) % 2 else [96, 96, 100]
                if not act and 7 <= u <= 8 and 7 <= v <= 8: c = [210, 50, 40]
                if act and u in (7, 8) and v % 4 in (1, 2): c = [200, 40, 30] if u == 7 else [140, 24, 20]
                if c: im.set(x, y, c)
        return im
    for k, im in [('DETECTOR_RAIL_NS', rail_special(False, False)), ('DETECTOR_RAIL_EW', rail_special(True, False)),
                  ('ACTIVATOR_RAIL_NS', rail_special(False, True)), ('ACTIVATOR_RAIL_EW', rail_special(True, True))]:
        put(k, im, cut=im)
    # ---- 絵画（このゲームのために描いた絵。大きさごとに 16×16 に分ける）----
    def painting(name, w, h, fn):
        W2, H2 = w * 16, h * 16
        pix = [[fn(x, y, W2, H2) for x in range(W2)] for y in range(H2)]
        for x in range(W2):
            pix[0][x] = [96, 70, 44]; pix[H2 - 1][x] = [70, 50, 30]
        for y in range(H2):
            pix[y][0] = [96, 70, 44]; pix[y][W2 - 1] = [70, 50, 30]
        for j in range(h):
            for i in range(w):
                tile = Img()
                for y in range(16):
                    for x in range(16): tile.set(x, y, pix[j * 16 + y][i * 16 + x])
                extra['PAINT_' + name + '_' + str(j * w + i)] = tile
    def q(c, n=24): return [int(v) // n * n for v in c]
    def sunset(x, y, W2, H2):
        if y > H2 * 0.62: return q([30 + 20 * ((x + y) % 3 == 0), 60, 110 + 30 * ((x * 3 + y) % 5 == 0)])
        if math.hypot(x - W2 * 0.5, y - H2 * 0.6) < 4: return [255, 220, 120]
        t = y / (H2 * 0.62); return q(mixc([110, 70, 140], [250, 150, 70], t))
    def flower(x, y, W2, H2):
        if 5 <= x <= 10 and 9 <= y <= 14: return [70, 110, 160] if x in (5, 10) or y == 14 else [100, 150, 200]
        if x in (7, 8) and 4 <= y <= 8: return [70, 130, 50]
        if math.hypot(x - 7.5, y - 3.5) < 2.6: return [220, 70, 80] if math.hypot(x - 7.5, y - 3.5) > 1 else [250, 210, 80]
        return q([216, 204, 176], 12)
    def mountains(x, y, W2, H2):
        h1 = 9 + 4 * math.sin(x * 0.35) + 2 * math.sin(x * 0.9); h2 = 12 + 2 * math.sin(x * 0.5 + 1)
        if y > h2: return q([80, 130, 70])
        if y > h1: return [120, 120, 130] if y > h1 + 1.5 else [236, 240, 244]
        return q(mixc([150, 190, 230], [220, 230, 240], y / 16))
    def lake(x, y, W2, H2):
        if y > 10: return [60, 110, 170] if (x + y) % 4 else [90, 140, 200]
        if 18 <= x <= 25 and 4 <= y <= 9: return [180, 60, 50] if y < 6 and abs(x - 21.5) < (y - 3) * 1.2 else [200, 180, 140] if not (21 <= x <= 22 and y >= 7) else [80, 50, 30]
        if y > 8: return q([90, 150, 70])
        return q(mixc([160, 200, 240], [230, 240, 250], y / 10))
    def tower(x, y, W2, H2):
        if 5 <= x <= 10 and y >= 8:
            if (x == 7 or x == 8) and y % 6 in (2, 3): return [250, 220, 120]
            return [150, 140, 130] if (x + y // 3) % 3 else [120, 112, 104]
        if 4 <= x <= 11 and 4 <= y < 8 and abs(x - 7.5) <= (y - 3): return [140, 60, 60]
        if y > 28: return [70, 120, 60]
        return q(mixc([40, 50, 110], [190, 110, 140], y / 32))
    def forest(x, y, W2, H2):
        if 13 <= x <= 18 and y > 18: return [170, 140, 90]
        for tx in (4, 10, 22, 28):
            if abs(x - tx) <= 1 and 18 <= y <= 26: return [90, 60, 36]
            if math.hypot(x - tx, y - 14) < 5.5: return [50, 110, 50] if (x + y) % 3 else [70, 140, 60]
        if y > 24: return q([80, 140, 60])
        return q(mixc([170, 210, 240], [210, 230, 245], y / 24))
    def stars(x, y, W2, H2):
        if math.hypot(x - 22, y - 9) < 5: return [240, 236, 210] if math.hypot(x - 24, y - 8) > 3.2 else [24, 30, 60]
        if y > 24: return [30, 50, 40] if (x // 3 + y) % 2 else [24, 40, 32]
        if hsh(140, x, y) % 23 == 0: return [250, 250, 220]
        return q(mixc([10, 14, 40], [40, 50, 100], y / 24), 8)
    painting('SUNSET', 1, 1, sunset); painting('FLOWER', 1, 1, flower); painting('MOUNTAINS', 2, 1, mountains); painting('LAKE', 2, 1, lake)
    painting('TOWER', 1, 2, tower); painting('FOREST', 2, 2, forest); painting('STARS', 2, 2, stars)

    # ---- 第 2 回（アイテム）：ケーキ・ビートルート・スイートベリーの茂み・ジュークボックス ----
    cake_side, cake_top, cake_bot = Img(), Img(), Img()
    sponge, cream, jam = [214, 150, 86], [246, 240, 230], [196, 44, 40]
    for y in range(N):
        for x in range(N):
            yy = y % 8   # 箱の高さは 8。上半分・下半分どちらで読んでも同じに見えるよう、8 段ごとに繰り返す
            v = 0.92 + 0.1 * ((hsh(171, x, y) % 5) / 4)
            if yy == 0: c = sc(cream, 0.98 + 0.03 * (x % 2))
            elif yy == 1: c = sc(cream, 0.94) if (hsh(172, x) % 3) else sc(sponge, 1.08)   # 垂れたクリーム
            elif yy == 4: c = sc(jam, 0.95 + 0.08 * (x % 2))                                  # 間のジャム
            else: c = sc(sponge, v * (0.9 if yy == 7 else 1.0))
            cake_side.set(x, y, c)
            cake_bot.set(x, y, sc(sponge, 0.78 * v))
            d = min(x, y, 15 - x, 15 - y)
            cake_top.set(x, y, sc(cream, (0.9 if d == 0 else 1.0) * (0.97 + 0.03 * ((hsh(173, x, y) % 3) / 2))))
    for (x, y) in [(4, 4), (11, 5), (7, 8), (4, 11), (12, 11), (8, 3), (9, 12)]:
        cake_top.set(x, y, jam); cake_top.set(x + 1, y, sc(jam, 0.75)); cake_top.set(x, y - 1, [255, 140, 120])
    for i in range(7):
        put('CAKE_' + str(i), cake_side, cake_top, cake_bot)

    def beet(stage):
        img = Img(alpha=True)
        leaf, dark, stem = [70, 138, 52], [42, 96, 34], [168, 38, 54]
        h = [3, 6, 8, 11][stage]
        for i, x in enumerate((2, 6, 10, 13)):
            top = 16 - h + (i % 2)
            for y in range(top, 16):
                img.set(x, y, stem if y > top + 2 else dark)
            for (dx, dy) in [(-1, 0), (1, 0), (-1, 1), (1, 1), (0, -1), (-2, 1), (2, 1)]:
                if abs(dx) == 2 and stage < 2: continue
                img.set(x + dx, top + dy, leaf if (dx + dy) % 2 else sc(leaf, 1.15))
            if stage == 3:
                for (dx, dy, c) in [(0, 15, [150, 26, 44]), (-1, 15, [120, 20, 36]), (1, 15, [176, 40, 60]), (0, 14, [196, 56, 76])]:
                    img.set(x + dx, dy, c)
        return img
    for i in range(4):
        b = beet(i); put('BEETROOTS_' + str(i), b, cut=b)

    def bush(stage):
        img = Img(alpha=True)
        r = random.Random(181 + stage)
        cx, rad = 7.5, [3.5, 5.5, 7.0, 7.5][stage]
        base_y = 15
        for y in range(N):
            for x in range(N):
                dy = (base_y - y) / max(1.0, rad * 1.25)
                dx = (x - cx) / rad
                if dx * dx + (dy - 0.75) ** 2 < 0.75 and y <= base_y and r.random() < 0.9:
                    shade = 0.72 + 0.4 * (1 - y / 16) + r.random() * 0.12
                    img.set(x, y, sc([44, 98, 54] if (x + y * 3) % 5 else [60, 122, 64], shade))
        if stage >= 2:
            col = [214, 32, 44] if stage == 3 else [150, 190, 90]
            spots = [(4, 9), (10, 7), (7, 11), (12, 11), (3, 13), (9, 13), (6, 6), (11, 13)] if stage == 3 else [(5, 9), (10, 8), (7, 12), (11, 12)]
            for (x, y) in spots:
                img.set(x, y, col); img.set(x + 1, y, sc(col, 0.8)); img.set(x, y + 1, sc(col, 0.7)); img.set(x + 1, y + 1, sc(col, 0.6))
                if stage == 3: img.set(x, y, [255, 140, 140])
        img.set(7, 15, [90, 64, 40]); img.set(8, 15, [70, 50, 32])
        return img
    for i in range(4):
        b = bush(i); put('SWEET_BERRY_BUSH_' + str(i), b, cut=b)

    jb_wood = [106, 72, 46]
    jb_side = framed(sc(jb_wood, 0.9), 191, planks(jb_wood, 192))
    for y in range(5, 11):
        for x in range(3, 13):
            jb_side.set(x, y, sc(jb_wood, 0.62 if (x + y) % 2 else 0.7))   # 前の板の飾り
    for x in range(3, 13): jb_side.set(x, 5, sc(jb_wood, 1.15)); jb_side.set(x, 10, sc(jb_wood, 0.45))
    jb_top = framed(sc(jb_wood, 0.9), 193, planks(sc(jb_wood, 0.95), 194))
    for x in range(3, 13):
        for y in (7, 8):
            jb_top.set(x, y, [22, 18, 16] if y == 7 else [44, 36, 30])   # レコードを入れる口
    for (x, y) in [(2, 2), (13, 2), (2, 13), (13, 13)]: jb_top.set(x, y, [180, 170, 150])
    put('JUKEBOX', jb_side, jb_top, planks(sc(jb_wood, 0.8), 195))

    # ---- 第 3 回：大釜・避雷針・銅の酸化・花・雪と氷 ----
    iron_dark = [58, 58, 64]
    cd = noisy(iron_dark, 201, (0.82, 0.92, 1.0, 1.08))
    for i in range(N):
        cd.set(i, 0, sc(iron_dark, 1.45)); cd.set(0, i, sc(iron_dark, 1.25)); cd.set(15, i, sc(iron_dark, 0.7)); cd.set(i, 15, sc(iron_dark, 0.65))
    for x in range(4, 12):
        cd.set(x, 12, sc(iron_dark, 0.55)); cd.set(x, 13, sc(iron_dark, 0.55))   # 足の間のくぼみ
    for y in range(3, 12, 4):
        for x in (2, 13): cd.set(x, y, sc(iron_dark, 1.6))                     # 鋲
    cd_top = cd.copy()
    for y in range(2, 14):
        for x in range(2, 14): cd_top.set(x, y, sc(iron_dark, 0.45 + 0.05 * ((x + y) % 2)))
    for i in range(4):
        put('CAULDRON' if i == 0 else 'CAULDRON_' + str(i), cd, cd_top, cd)
    cop = T['COPPER_BLOCK']['side']
    rod = Img()
    for y in range(N):
        for x in range(N):
            c0 = cop.get(x, y); rod.set(x, y, sc(c0, 1.05 + 0.18 * (1 if (x + y) % 5 == 0 else 0)))
    put('LIGHTNING_ROD', rod)
    rod_on = Img()
    for y in range(N):
        for x in range(N): rod_on.set(x, y, mixc(rod.get(x, y), [255, 246, 210], 0.55))
    put('LIGHTNING_ROD_ON', rod_on)
    teal = [[176, 120, 96], [104, 160, 124], [80, 168, 140]]
    def oxid(stage, side):
        img = side.copy() if side.p[0][0] else Img()
        frac = [0.0, 0.35, 0.68, 0.96][stage]
        for y in range(N):
            for x in range(N):
                c0 = side.get(x, y); lum = (c0[0] * 0.3 + c0[1] * 0.55 + c0[2] * 0.15) / 120.0
                n = ((hsh(211, x // 2, y // 2) % 100) / 100.0) * 0.6 + ((hsh(212, x, y) % 100) / 100.0) * 0.4
                if n < frac: img.set(x, y, sc(teal[stage - 1] if stage > 1 and n < frac - 0.25 else teal[max(0, stage - 2)], max(0.7, min(1.25, lum))))
                elif stage == 1: img.set(x, y, mixc(c0, [168, 120, 104], 0.4))
        return img
    for st, k in enumerate(['EXPOSED_COPPER', 'WEATHERED_COPPER', 'OXIDIZED_COPPER'], 1):
        put(k, oxid(st, cop))
    def flower(rows, pal):
        img = plant_cut(rows, pal); return img
    STEM = {'s': [70, 128, 44], 'l': [96, 156, 60]}
    def fl(k, rows, pal):
        d = dict(STEM); d.update(pal); im = plant_cut(rows, d); put(k, im, cut=im)
    fl('CORNFLOWER', ['................', '................', '.....b.b.b......', '......bbb.......', '.....bbcbb......', '......bbb.......', '.....b.b.b......', '.......s........',
                      '.......s..ll....', '.......s.ll.....', '...ll..s........', '....llls........', '.......s........', '.......s........', '.......s........', '.......s........'], {'b': [70, 104, 222], 'c': [40, 50, 140]})
    fl('ALLIUM', ['................', '......pppp......', '.....pPpppp.....', '.....ppppPp.....', '.....pPpppp.....', '......pppp......', '.......s........', '.......s........',
                  '.......s........', '.......s.ll.....', '.......sll......', '.......s........', '....lls.........', '.......s........', '.......s........', '.......s........'], {'p': [180, 96, 220], 'P': [220, 160, 240]})
    fl('AZURE_BLUET', ['................', '................', '................', '................', '..w.w.....w.w...', '..wyw.....wyw...', '...w...w...w....', '...s..wyw..s....',
                       '...s...w...s....', '...s...s..s.....', '....s..s..s.....', '....s..s.s......', '.....s.ss.......', '......ss........', '.......s........', '.......s........'], {'w': [230, 234, 246], 'y': [236, 206, 70]})
    fl('OXEYE_DAISY', ['................', '................', '......w.w.......', '....w.www.w.....', '.....wwywww.....', '....wwyyyw......', '.....wwyww.w....', '....w.www.......',
                       '......w.w.......', '.......s........', '.......s.ll.....', '...ll..sll......', '....lls.........', '.......s........', '.......s........', '.......s........'], {'w': [240, 240, 228], 'y': [236, 196, 50]})
    fl('BLUE_ORCHID', ['................', '................', '....bb..........', '...bBbb...bb....', '....bb...bBbb...', '.....s....bb....', '......s..s......', '.......ss.......',
                       '.......s........', '.......s..ll....', '...ll..s.ll.....', '....ll.sl.......', '.....lls........', '.......s........', '.......s........', '.......s........'], {'b': [50, 160, 226], 'B': [150, 220, 250]})
    fl('LILY_OF_THE_VALLEY', ['................', '................', '.......ss.......', '......s..s......', '.....w....s.....', '.....w.....w....', '..........ww....', '.....ww.........',
                              '..l........l....', '..ll.......ll...', '...ll.....ll....', '....ll...ll.....', '.....ll.ll......', '......lll.......', '.......l........', '.......l........'], {'w': [244, 246, 236], 'l': [70, 150, 60]})
    for k, pc in [('RED_TULIP', [214, 50, 40]), ('ORANGE_TULIP', [236, 132, 40]), ('WHITE_TULIP', [236, 238, 236]), ('PINK_TULIP', [238, 150, 182])]:
        fl(k, ['................', '................', '......p.p.......', '......ppp.......', '.....pPppp......', '.....pPppp......', '......ppp.......', '.......s........',
               '.......s........', '...l...s...l....', '...ll..s..ll....', '....ll.s.ll.....', '.....llsll......', '......lsl.......', '.......s........', '.......s........'], {'p': pc, 'P': [min(255, int(v * 1.25)) for v in pc]})
    fern = plant_cut(['................', '.......g........', '......ggg.......', '.....g.g.g......', '....g.ggg.g.....', '...g..g.g..g....', '..g.gggggg.g....', '.g..g..g..g.g...',
                      '...g..ggg..g....', '..g..g.g.g..g...', '....g..g..g.....', '...g..ggg..g....', '.....g.g.g......', '.......g........', '.......g........', '.......g........'],
                     {'g': sc(col('GRASS', 'top'), 0.85)})
    put('FERN', fern, cut=fern)
    db = plant_cut(['................', '................', '..b.......b.....', '...b.....b..b...', '....b...b..b....', '.b...b.b..b.....', '..b...bb.b......', '...b...bb.......',
                    '....b..b.....b..', '.....b.b....b...', '......bb...b....', '.......b..b.....', '.......b.b......', '.......bb.......', '.......b........', '.......b........'],
                   {'b': [138, 100, 56]})
    put('DEAD_BUSH', db, cut=db)
    put('SNOW_BLOCK', T['SNOW']['side'])
    pk = noisy(sc(col('ICE'), 0.92), 221, (0.88, 0.96, 1.04))
    for i in range(0, N, 5):
        for j in range(N): pk.set((i + j) % N, j, sc(col('ICE'), 1.12))
    put('PACKED_ICE', pk)
    bi = noisy([96, 150, 236], 223, (0.86, 0.95, 1.05))
    for i in range(N):
        bi.set(i, (i * 2 + 3) % N, [170, 210, 255]); bi.set((i * 3) % N, i, [140, 190, 250])
    put('BLUE_ICE', bi)

    # ---- 第 4 回：古代都市と廃ポータルの建材 ----
    dsb = [74, 74, 80]
    put('DEEPSLATE_BRICKS', bricks(dsb, 231, [34, 34, 38], 4, 8))
    cr = bricks(sc(dsb, 0.96), 232, [34, 34, 38], 4, 8)
    for (x, y) in [(3, 1), (4, 2), (4, 3), (5, 3), (11, 6), (12, 7), (12, 8), (13, 9), (6, 11), (7, 12), (7, 13), (8, 14)]: cr.set(x, y, [26, 26, 30])
    put('CRACKED_DEEPSLATE_BRICKS', cr)
    put('DEEPSLATE_TILES', bricks([56, 56, 62], 233, [26, 26, 30], 4, 4))
    ch = noisy([62, 62, 68], 234, (0.86, 0.95, 1.05))
    for i in range(N):
        for (x, y) in [(i, 0), (0, i)]: ch.set(x, y, [92, 92, 100])
        for (x, y) in [(i, 15), (15, i)]: ch.set(x, y, [36, 36, 40])
    for y in range(3, 13):
        for x in range(3, 13):
            if x in (3, 12) or y in (3, 12) or (x in (6, 9) and 6 <= y <= 9) or (y in (6, 9) and 6 <= x <= 9): ch.set(x, y, [40, 40, 46])
    put('CHISELED_DEEPSLATE', ch)
    sk = Img()
    for y in range(N):
        for x in range(N):
            n = (hsh(241, x // 2, y // 3) % 100) / 100.0
            sk.set(x, y, [10 + int(n * 14), 34 + int(n * 20), 42 + int(n * 22)])
    for (x, y) in [(2, 3), (9, 2), (13, 7), (5, 9), (11, 12), (3, 13), (7, 6)]:
        sk.set(x, y, [60, 210, 220]); sk.set(x + 1, y, [30, 140, 150])     # ほのかに光る粒
    put('SCULK', sk)
    shs = sk.copy()
    for y in range(9, 16):
        for x in range(N): shs.set(x, y, sc([200, 196, 176], 0.85 + 0.1 * ((x + y) % 3)) if y > 10 else [30, 60, 66])
    sht = sk.copy()
    for y in range(N):
        for x in range(N):
            d = max(abs(x - 7.5), abs(y - 7.5))
            if d > 5.5: sht.set(x, y, sc([214, 210, 190], 0.9 + 0.08 * ((x * 3 + y) % 3)))
            elif d > 3.5: sht.set(x, y, [24, 70, 78])
            else: sht.set(x, y, [70, 220, 230] if (x + y) % 3 else [40, 160, 170])
    put('SCULK_SHRIEKER', shs, sht, sht)
    sl = T['LANTERN']['side'].copy(); stp = T['LANTERN']['top']
    for y in range(N):
        for x in range(N):
            c0 = sl.get(x, y)
            if c0 and c0[0] > 150 and c0[0] > c0[2] + 40: sl.set(x, y, [90, 220, 230] if c0[1] > 150 else [50, 170, 190])
    put('SOUL_LANTERN', sl, stp, stp)
    co = T['OBSIDIAN']['side'].copy()
    for (x, y) in [(3, 2), (3, 3), (3, 4), (10, 5), (10, 6), (6, 9), (6, 10), (6, 11), (12, 11), (12, 12), (1, 13), (8, 1)]:
        co.set(x, y, [150, 60, 240]); co.set(x, y + 1, [100, 30, 180])
    put('CRYING_OBSIDIAN', co)
    mg = Img()
    for y in range(N):
        for x in range(N):
            n = hsh(251, x // 3, y // 3) % 7
            mg.set(x, y, [92, 30, 10] if n else [70, 20, 8])
    for (x0, y0, l) in [(1, 2, 6), (8, 5, 6), (3, 10, 8), (11, 12, 4)]:
        for i in range(l): mg.set(x0 + i, y0 + (i // 3) % 2, [255, 150, 40] if i % 3 else [255, 210, 90])
    put('MAGMA_BLOCK', mg)

    # ---- 追加：考古学・飾り壺・試練の間・コンジット ----
    for kind, base in [('SAND', T['SAND']['side']), ('GRAVEL', T['GRAVEL']['side'])]:
        for st in range(4):
            im = base.copy()
            # 怪しい所：細かい斑と、掘るほど広がる、くぼんだ跡と中に見える物の色
            for y in range(N):
                for x in range(N):
                    if hsh(261, x, y) % 9 == 0: im.set(x, y, sc(base.get(x, y), 0.8))
            r = 1.5 + st * 1.6
            for y in range(N):
                for x in range(N):
                    d = math.hypot(x - 7.5, y - 8.5)
                    if st and d < r: im.set(x, y, sc(base.get(x, y), 0.72 + 0.1 * (d / r)))
                    if st >= 2 and d < r - 1.6 and (x + y) % 2 == 0: im.set(x, y, [176, 92, 60] if (x * 3 + y) % 5 else [210, 150, 90])
            put('SUSPICIOUS_' + kind + '_' + str(st), im)
    pot_c = [154, 84, 56]
    dp = noisy(pot_c, 271, (0.86, 0.95, 1.05))
    for x in range(N):
        dp.set(x, 2, sc(pot_c, 0.7)); dp.set(x, 13, sc(pot_c, 0.7))
    for (x, y) in [(4, 5), (5, 6), (6, 7), (7, 6), (8, 5), (9, 6), (10, 7), (11, 6), (5, 9), (7, 10), (9, 9), (11, 10)]: dp.set(x, y, [70, 36, 24])
    put('DECORATED_POT', dp, noisy(sc(pot_c, 0.9), 272, (0.9, 1.0)))
    tf = [102, 104, 96]
    put('TUFF_BRICKS', bricks(tf, 273, [70, 72, 66], 4, 8))
    pt = noisy(sc(tf, 0.96), 274, (0.92, 0.98, 1.04))
    for i in range(N): pt.set(i, 0, sc(tf, 1.2)); pt.set(0, i, sc(tf, 1.15)); pt.set(i, 15, sc(tf, 0.75)); pt.set(15, i, sc(tf, 0.75))
    put('POLISHED_TUFF', pt)
    ct = pt.copy()
    for y in range(3, 13):
        for x in range(3, 13):
            if x in (3, 12) or y in (3, 12) or (x + y) % 4 == 0 and 5 <= x <= 10 and 5 <= y <= 10: ct.set(x, y, sc(tf, 0.7))
    put('CHISELED_TUFF', ct)
    cg = Img(alpha=False)
    copc = [192, 111, 82]
    for y in range(N):
        for x in range(N):
            hole = (x % 4 in (1, 2)) and (y % 4 in (1, 2))
            cg.set(x, y, [28, 20, 18] if hole else sc(copc, 0.9 + 0.2 * ((x + y) % 3 == 0)))
    put('COPPER_GRATE', cg)
    def spawner(active):
        im = Img([30, 33, 38])
        glow = [255, 170, 60] if active else [120, 90, 70]
        for y in range(N):
            for x in range(N):
                edge = x in (0, 15) or y in (0, 15)
                bar = x % 5 == 0 or y % 5 == 0
                if edge: im.set(x, y, [70, 76, 84])
                elif bar: im.set(x, y, [52, 56, 64])
                else:
                    d = math.hypot(x - 7.5, y - 7.5)
                    im.set(x, y, mixc(glow, [20, 18, 18], min(1, d / (6 if active else 4))))
        return im
    put('TRIAL_SPAWNER', spawner(False), spawner(False))
    put('TRIAL_SPAWNER_ACTIVE', spawner(True), spawner(True))
    def vault(open_):
        im = Img([46, 50, 58])
        for y in range(N):
            for x in range(N):
                if x in (0, 15) or y in (0, 15): im.set(x, y, [90, 96, 104])
                elif x in (2, 13) or y in (2, 13): im.set(x, y, [176, 128, 60])
        for y in range(4, 12):
            for x in range(4, 12): im.set(x, y, [24, 26, 30] if open_ else ([240, 200, 110] if (x + y) % 3 else [255, 236, 170]) if 5 <= x <= 10 and 5 <= y <= 10 else [70, 74, 82])
        if not open_:
            for (x, y) in [(7, 6), (8, 6), (7, 7), (8, 7), (7, 8), (7, 9), (8, 9)]: im.set(x, y, [40, 32, 20])
        return im
    put('VAULT', vault(False), noisy([60, 64, 72], 275, (0.9, 1.0)))
    put('VAULT_OPEN', vault(True), noisy([60, 64, 72], 275, (0.9, 1.0)))
    cd2 = Img()
    for y in range(N):
        for x in range(N):
            d = max(abs(x - 7.5), abs(y - 7.5))
            cd2.set(x, y, [200, 168, 112] if d > 5 else [110, 220, 230] if d < 2.5 else [60, 110, 140] if (x + y) % 2 else [80, 140, 170])
    put('CONDUIT', cd2)

    # ---- ロードマップ 第 2 段階：彩釉テラコッタ（色ごとに違う模様）と色付きのベッド ----
    C16H = {'WHITE': '#e9ecec', 'ORANGE': '#e0761a', 'MAGENTA': '#b44cb4', 'LIGHT_BLUE': '#3aa8d8', 'YELLOW': '#f0c434', 'LIME': '#70ba1c', 'PINK': '#ec8aa8', 'GRAY': '#3e4448',
            'LIGHT_GRAY': '#8e8e86', 'CYAN': '#158a92', 'PURPLE': '#7a2aa8', 'BLUE': '#343c9c', 'GREEN': '#546c1c', 'RED': '#a42620', 'BLACK': '#18181c', 'BROWN': '#72482a'}
    C16 = list(C16H.keys())
    for ci, cn in enumerate(C16):
        base = hx(C16H[cn])
        lt = mixc(base, [255, 255, 255], 0.5); dk = sc(base, 0.5); ac = mixc(base, [250, 236, 200], 0.25)
        kind = ci % 4
        img = Img()
        for y in range(N):
            for x in range(N):
                dx, dy = x - 7.5, y - 7.5
                r = math.hypot(dx, dy); a = math.atan2(dy, dx)
                c0 = base
                if kind == 0:     # ひし形の重なりと、四隅の四分円
                    if (abs(dx) + abs(dy)) % 6 < 2: c0 = lt
                    if min(math.hypot(x, y), math.hypot(15 - x, y), math.hypot(x, 15 - y), math.hypot(15 - x, 15 - y)) < 4.5: c0 = dk
                elif kind == 1:   # うず巻き
                    if ((a / math.pi * 2 + r * 0.35) % 2) < 0.9: c0 = lt
                    if r < 2: c0 = dk
                elif kind == 2:   # 4 枚の花びらと輪
                    if r < 3.5 + 3 * abs(math.cos(2 * a)): c0 = lt
                    if 6.2 < r < 7.4: c0 = dk
                    if r < 1.6: c0 = ac
                else:             # 山形の帯
                    if (y + abs(dx)) % 6 < 2: c0 = dk
                    if x in (0, 15) or y in (0, 15): c0 = lt
                g = 0.95 + 0.06 * ((hsh(281 + ci, x, y) % 5) / 4)                 # 焼きむら
                if x + y < 6 and (x + y) % 2 == 0: g *= 1.06                       # つやの光
                img.set(x, y, sc(c0, g))
        put(cn + '_GLAZED_TERRACOTTA', img)
    bside, btop = T['BED']['side'], T['BED']['top']
    for cn in C16[1:]:
        base = hx(C16H[cn])
        def recol(src, ymin, ymax):
            im = src.copy()
            for y in range(N):
                for x in range(N):
                    c0 = src.p[y][x]
                    if c0 and ymin <= y <= ymax and min(c0) > 190:
                        im.set(x, y, sc(base, 0.75 + 0.35 * (sum(c0) / 3 - 190) / 65))
            return im
        s2 = recol(bside, 0, 8); t2 = recol(btop, 5, 15)
        put('BED_' + cn, s2, t2, T['BED']['bottom'], cut=s2)

    # ---- ロードマップ 第 3 段階：新しいバイオームの素材 ----
    cl = T['CHERRY_LEAVES']['side'].copy()
    for y in range(N):
        for x in range(N):
            hv = hsh(301, x, y) % 23
            if hv == 0: cl.set(x, y, [255, 236, 244])
            elif hv == 1: cl.set(x, y, [214, 120, 160])
    put('CHERRY_LEAVES', cl)
    roots = Img(alpha=True)
    for y in range(N):
        for x in range(N):
            a = (x + y * 2) % 7 < 2 or (x * 2 - y + 32) % 9 < 2 or (x * 3 + y) % 11 == 0
            if a: roots.set(x, y, sc([88, 64, 44], 0.85 + 0.25 * ((hsh(302, x, y) % 4) / 3)))
    put('MANGROVE_ROOTS', roots, cut=roots, all_faces=True)
    mud = noisy([62, 58, 56], 303, (0.82, 0.92, 1.0, 1.08))
    for (x, y) in [(3, 4), (10, 2), (7, 11), (13, 9), (2, 13)]: mud.set(x, y, [92, 86, 80])   # ぬれて光る所
    put('MUD', mud)
    mr = mud.copy()
    for y in range(N):
        for x in range(N):
            if roots.p[y][x]: mr.set(x, y, roots.p[y][x])
    put('MUDDY_MANGROVE_ROOTS', mr)
    put('PACKED_MUD', noisy([142, 108, 80], 304, (0.86, 0.94, 1.02, 1.08)))
    put('MUD_BRICKS', bricks([138, 104, 80], 305, [96, 72, 56], 4, 8))
    rs = sand([190, 102, 34], 306); put('RED_SAND', rs)
    rss = Img()
    for y in range(N):
        for x in range(N): rss.set(x, y, sc([182, 98, 32], (0.84 if y % 5 == 4 else 1.0) * (0.94 + 0.08 * ((hsh(307, x, y) % 3) / 2))))
    put('RED_SANDSTONE', rss, noisy([186, 100, 34], 308, (0.9, 1.0, 1.06)))
    myt = Img()
    for y in range(N):
        for x in range(N):
            v = hsh(309, x, y) % 9
            myt.set(x, y, [150, 120, 160] if v == 0 else [96, 84, 98] if v < 3 else [118, 104, 116])
    mys = T['DIRT']['side'].copy()
    for x in range(N):
        for y in range(0, 3 + hsh(310, x) % 2): mys.set(x, y, myt.get(x, y))
    put('MYCELIUM', mys, myt, T['DIRT']['side'])
    pp = T['GRASS']['top'].copy()
    for y in range(N):
        for x in range(N):
            r = hsh(311, x // 2, y // 2) % 5
            if r == 0 and (x + y) % 2 == 0: pp.set(x, y, [246, 186, 210])
            elif r == 1 and x % 2 == 0: pp.set(x, y, [232, 150, 186])
    put('PINK_PETALS', pp)

    # ---- ロードマップ 第 4 段階：繁茂した洞窟と鍾乳洞 ----
    moss = noisy([90, 122, 46], 321, (0.78, 0.9, 1.0, 1.12))
    for (x, y) in [(2, 3), (9, 1), (13, 7), (5, 10), (11, 13)]: moss.set(x, y, [130, 160, 70])
    put('MOSS_BLOCK', moss)
    az = leaves([88, 128, 44], 322)
    azs = az.copy()
    for y in range(N):
        for x in range(N):
            if y > 9: azs.set(x, y, [70, 56, 36] if 6 <= x <= 9 else None) if False else None
    put('AZALEA', az, az, az)
    faz = az.copy()
    for (x, y) in [(2, 2), (7, 4), (12, 3), (4, 9), (10, 10), (13, 13), (6, 13), (1, 7)]:
        faz.set(x, y, [220, 120, 190]); faz.set(x + 1, y, [240, 160, 210]); faz.set(x, y + 1, [200, 100, 170])
    put('FLOWERING_AZALEA', faz, faz, faz)
    def vine(lit):
        img = Img(alpha=True)
        for y in range(N):
            for x in (5, 10):
                xx = x + (1 if (y // 3) % 2 else 0)
                img.set(xx, y, [70, 112, 40]); img.set(xx - 1, y, [96, 140, 56] if y % 4 == 1 else None) if False else img.set(xx - 1 if y % 4 == 1 else xx, y, [96, 140, 56] if y % 4 == 1 else [70, 112, 40])
                if y % 5 == 2: img.set(xx + 1, y, [110, 160, 60])
        if lit:
            for (x, y) in [(4, 3), (11, 6), (6, 11), (10, 13)]:
                img.set(x, y, [255, 196, 70]); img.set(x + 1, y, [240, 150, 40]); img.set(x, y + 1, [220, 120, 30]); img.set(x + 1, y + 1, [255, 220, 120])
        return img
    v = vine(False); put('CAVE_VINES', v, cut=v)
    vl = vine(True); put('CAVE_VINES_LIT', vl, cut=vl)
    sb = plant_cut(['................', '......gggg......', '.......gg.......', '....p..gg..p....', '...ppp.gg.ppp...', '..ppppPggPpppp..', '...pppPPPPppp...', '....ppPPPPpp....',
                    '...pppPPPPppp...', '..ppppPPPPpppp..', '...ppp.pp.ppp...', '....p..pp..p....', '.......pp.......', '................', '................', '................'],
                   {'g': [80, 130, 50], 'p': [216, 120, 168], 'P': [240, 170, 200]})
    put('SPORE_BLOSSOM', sb, cut=sb)
    sd = plant_cut(['................', '................', '..lll.....lll...', '.lllll...lllll..', '..llls...slll...', '.....s...s......', '..lll.s.s.lll...', '.lllll.s.lllll..',
                    '..llll.s.llll...', '.......s........', '.......s........', '......ss........', '.......s........', '.......s........', '.......s........', '.......s........'],
                   {'l': [96, 160, 60], 's': [70, 120, 44]})
    put('SMALL_DRIPLEAF', sd, cut=sd)
    bd = Img()
    for y in range(N):
        for x in range(N):
            d = abs(x - 7.5) + abs(y - 7.5)
            bd.set(x, y, [118, 178, 70] if (x == 7 or x == 8 or (d % 5 < 1 and d < 12)) else [96, 160, 60])
    put('BIG_DRIPLEAF', bd, bd, sc_img([80, 130, 50], 0.9))
    dsb = Img()
    for y in range(N):
        for x in range(N):
            band = 0.9 + 0.12 * ((y + (hsh(331, x // 4) % 3)) % 4 == 0) - 0.06 * ((x + y * 3) % 7 == 0)
            dsb.set(x, y, sc([134, 107, 92], band * (0.95 + 0.06 * ((hsh(332, x, y) % 3) / 2))))
    put('DRIPSTONE_BLOCK', dsb)
    pdt = Img()
    for y in range(N):
        for x in range(N): pdt.set(x, y, sc([140, 112, 96], (1.08 if x % 4 == 1 else 0.86 if x % 4 == 3 else 1.0) * (0.96 + 0.06 * ((hsh(333, x, y) % 3) / 2))))
    put('POINTED_DRIPSTONE_UP_TIP', pdt)

    # ---- ロードマップ 第 5 段階：砥石・欠けた金床・壊れかけの金床 ----
    gsf = Img()   # 砥石の円盤の面：外の縁は暗く、内は明るい石、中心に軸
    for y in range(N):
        for x in range(N):
            d = ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** 0.5
            n = 0.94 + 0.08 * ((hsh(401, x, y) % 4) / 3)
            if d > 7.6: c = sc([92, 90, 88], n)
            elif d > 6.4: c = sc([112, 110, 106], n * (1.08 if x + y < 15 else 0.9))
            elif d > 2.2: c = sc([150, 148, 142], n * (1.06 if (x * 3 + y * 5) % 11 == 0 else 1.0))
            elif d > 1.3: c = [96, 80, 60]
            else: c = [58, 46, 34]
            gsf.set(x, y, c)
    gse = Img()   # 砥石の周り：研ぐ面の細い溝
    for y in range(N):
        for x in range(N):
            n = 0.93 + 0.09 * ((hsh(402, x, y) % 4) / 3)
            gse.set(x, y, sc([140, 138, 132], n * (0.84 if y % 4 == 0 else 1.06 if y % 4 == 1 else 1.0)))
    put('GRINDSTONE', gsf, gse, gse)
    for k, cracks in [('CHIPPED_ANVIL', [(3, 2), (4, 3), (4, 4), (5, 5), (11, 9), (12, 10), (12, 11)]),
                      ('DAMAGED_ANVIL', [(2, 1), (3, 2), (4, 3), (4, 4), (5, 5), (6, 5), (7, 6), (11, 8), (12, 9), (12, 10), (13, 11), (9, 12), (8, 13), (10, 3), (11, 2), (6, 10), (5, 11)])]:
        anv = panel([70, 70, 76], 56, 'noise'); ca = anv.copy()
        for (x, y) in cracks:
            ca.set(x, y, [26, 26, 30]); ca.set(x + 1, y, sc(anv.get(x + 1, y), 1.25))
        put(k, ca)

    # ---- ロードマップ 第 7 段階：菌・つる・骨ブロック・色付きの貝の箱 ----
    def fungus(cap, spot, stem):
        rows = ['................', '................', '................', '................', '.....cccccc.....', '....cccsccccc...', '...ccsccccsccc..', '...cccccccccc...',
                '.....dddddd.....', '.......ss.......', '.......ss.......', '......ss........', '......ss........', '.......ss.......', '.......ss.......', '......ssss......']
        return plant_cut(rows, {'c': cap, 's': stem, 'd': sc(hx(cap) if isinstance(cap, str) else cap, 0.7), 'p': spot})
    fc = fungus([170, 40, 40], [240, 170, 60], [216, 190, 150])
    for (x, y) in [(6, 5), (10, 6), (5, 6)]: fc.set(x, y, [246, 176, 70])
    put('CRIMSON_FUNGUS', fc, cut=fc)
    fw = fungus([36, 140, 124], [240, 140, 40], [216, 190, 150])
    for (x, y) in [(7, 4), (11, 6), (4, 6)]: fw.set(x, y, [240, 136, 40])
    put('WARPED_FUNGUS', fw, cut=fw)
    def nvine(base, hi, up):
        img = Img(alpha=True)
        for x0 in (4, 10):
            for y in range(N):
                yy = y if up else y
                xx = x0 + (1 if ((y + x0) // 3) % 2 else 0)
                img.set(xx, yy, sc(base, 0.85 + 0.25 * ((hsh(701, x0, y) % 3) / 2)))
                if (y + x0) % 4 == 0: img.set(xx + (1 if up else -1), yy, hi)
                if (y + x0) % 7 == 3: img.set(xx - 1, yy, sc(base, 0.7))
        return img
    wv = nvine([150, 30, 36], [200, 60, 50], False); put('WEEPING_VINES', wv, cut=wv)
    tv = nvine([30, 150, 132], [70, 200, 170], True); put('TWISTING_VINES', tv, cut=tv)
    bs_ = Img(); bt_ = Img()
    for y in range(N):
        for x in range(N):
            n = 0.94 + 0.08 * ((hsh(702, x, y) % 3) / 2)
            bs_.set(x, y, sc([226, 222, 206], n * (0.86 if x in (0, 15) else 1.04 if x in (1, 14) else 1.0)))
            d = ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** 0.5
            bt_.set(x, y, sc([226, 222, 206], n) if d > 5.2 else sc([196, 188, 166], n) if d > 3.4 else sc([150, 140, 120], n))
    put('BONE_BLOCK', bs_, bt_, bt_)
    for k, hx_ in C16H.items():
        base = hx(hx_)
        sbx = Img(); sbt = Img()
        for y in range(N):
            for x in range(N):
                seam = y in (7, 8)
                n = (1.1 if (x + (y // 4)) % 4 == 0 else 1.0) * (0.93 + 0.1 * ((hsh(703, x, y) % 3) / 2))
                sbx.set(x, y, sc(base, 0.55) if seam else sc(base, n))
                edge = x in (0, 15) or y in (0, 15)
                sbt.set(x, y, sc(base, 0.7) if edge else sc(base, 1.08 if (x // 4 + y // 4) % 2 == 0 else 0.96))
        put(k + '_SHELL_BOX', sbx, sbt, sbt)
    # コーラス：紫の茎（節のある）と、花びらの先
    chp = Img()
    for y in range(N):
        for x in range(N):
            n = 0.9 + 0.14 * ((hsh(704, x, y) % 3) / 2)
            chp.set(x, y, sc([120, 88, 128], n * (1.12 if (x + y * 3) % 7 == 0 else 0.86 if (x * 5 + y) % 9 == 0 else 1.0)))
    put('CHORUS_PLANT', chp)
    chf = Img(); chft = Img()
    for y in range(N):
        for x in range(N):
            d = ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** 0.5
            chf.set(x, y, sc([176, 150, 186], 1.1 if d < 3 else 0.86 if x in (0, 15) or y in (0, 15) else 1.0))
            chft.set(x, y, [230, 212, 236] if d < 2.4 else sc([186, 156, 196], 1.06 if (x + y) % 3 == 0 else 0.94))
    put('CHORUS_FLOWER', chf, chft, chf)

    # ---- ロードマップ 第 9 段階：苗木・濃いオークの葉・皮をはいだ原木・樹皮付きの木 ----
    def sapling(shape, leaf, stem, hi=None):
        rows = {
            'round': ['................', '................', '......LL........', '....LLLLL.......', '...LLLHLLLL.....', '..LLLLLLLHLL....', '...LLHLLLLL.LL..', '....LLSLLLLLLLL.',
                      '.....LSLLHLLL...', '.......SLLL.....', '.......S........', '.......S........', '......SS........', '.......S........', '.......S........', '................'],
            'cone':  ['................', '.......L........', '......LLL.......', '.......L........', '.....LLLLL......', '....LLLHLLL.....', '......LLL.......', '....LLLLLLL.....',
                      '...LLHLLLLLL....', '.....LLSLL......', '.......S........', '.......S........', '.......S........', '.......S........', '......SS........', '................'],
            'fan':   ['................', '................', '..LL......LL....', '.LLLL....LLLL...', '..LHLL..LLHL....', '....LL.LLL......', '..LL..LSL..LL...', '.LLLL.LS.LLLL...',
                      '..LL...S...LL...', '.......S........', '.......S........', '......SS........', '.......S........', '.......S........', '.......S........', '................'],
            'bush':  ['................', '................', '.....LLLL.......', '...LLLLLLLL.....', '..LLLHLLLLLL....', '..LLLLLLLHLL....', '.LLHLLLLLLLLL...', '..LLLLLSLLLL....',
                      '...LLLLSLLL.....', '......SS........', '.......S........', '......SS........', '.......S........', '.......S........', '.......S........', '................'],
            'prop':  ['................', '......LL........', '.....LLLL.......', '......LL........', '.......S........', '.......S........', '.......S........', '......SS........',
                      '.......S........', '.......S........', '.......P........', '.......P........', '.......P........', '......PPP.......', '.......P........', '................'],
        }[shape]
        return plant_cut(rows, {'L': leaf, 'S': stem, 'H': hi or sc(hx(leaf) if isinstance(leaf, str) else leaf, 1.25), 'P': [150, 190, 90]})
    for k, shp, lf, st in [('OAK_SAPLING', 'round', [74, 128, 44], [110, 84, 50]), ('SPRUCE_SAPLING', 'cone', [46, 82, 50], [74, 52, 30]), ('BIRCH_SAPLING', 'round', [112, 154, 72], [214, 210, 196]),
                           ('JUNGLE_SAPLING', 'bush', [56, 120, 36], [96, 76, 40]), ('ACACIA_SAPLING', 'fan', [112, 134, 48], [104, 96, 88]), ('CHERRY_SAPLING', 'round', [232, 162, 196], [70, 40, 52]),
                           ('DARK_OAK_SAPLING', 'bush', [44, 90, 30], [62, 48, 32]), ('MANGROVE_PROPAGULE', 'prop', [90, 140, 52], [96, 120, 60])]:
        im = sapling(shp, lf, st)
        put(k, im, cut=im)
    put('DARK_OAK_LEAVES', leaves([46, 88, 28], 711))
    BARK = {'OAK': ([107, 81, 50], [176, 138, 84]), 'SPRUCE': ([59, 42, 24], [122, 90, 52]), 'BIRCH': ([216, 212, 200], [200, 176, 122]), 'JUNGLE': ([90, 74, 34], [176, 128, 88]),
            'ACACIA': ([106, 98, 90], [176, 98, 58]), 'CHERRY': ([62, 36, 48], [226, 180, 172]), 'MANGROVE': ([74, 54, 40], [122, 54, 50]), 'DARK_OAK': ([62, 48, 32], [90, 60, 32]),
            'CRIMSON': ([106, 42, 58], [138, 58, 74]), 'WARPED': ([42, 90, 90], [58, 122, 112])}
    for w, (bark, wood) in BARK.items():
        nether = w in ('CRIMSON', 'WARPED')
        lg, wd_ = ('_STEM', '_HYPHAE') if nether else ('_LOG', '_WOOD')
        ss = Img(); st_ = Img()
        for y in range(N):
            for x in range(N):
                g = 1.0 + (0.08 if x % 5 == 1 else -0.07 if x % 5 == 3 else 0) + 0.05 * ((hsh(720, x, y // 3) % 3) / 2 - 0.5)
                ss.set(x, y, sc(wood, g))
                d = max(abs(x - 7.5), abs(y - 7.5))
                st_.set(x, y, sc(wood, 0.82) if d > 6.6 else sc(wood, 1.08 if int(d) % 2 else 0.95))
        put('STRIPPED_' + w + lg, ss, st_, st_)
        if (w + '_LOG') in T and not nether:
            bs = T[w + '_LOG']['side']
        else:
            bs = Img()
            for y in range(N):
                for x in range(N):
                    g = 0.9 + 0.12 * ((hsh(721, x, y) % 4) / 3) + (0.1 if (x + y * 2) % 7 == 0 else 0)
                    bs.set(x, y, sc(bark, g) if not (nether and (x * 3 + y) % 11 == 0) else sc(wood, 1.25))
        put(w + wd_, bs, bs, bs)
        put('STRIPPED_' + w + wd_, ss, ss, ss)

    # ---- ロードマップ 第 11 段階：土・土の道・背の高い草花・竹 ----
    dirt_ = T['DIRT']['side']
    pz_top = Img()
    for y in range(N):
        for x in range(N):
            h_ = hsh(730, x, y) % 7
            pz_top.set(x, y, [122, 82, 38] if h_ == 0 else [84, 58, 28] if h_ in (1, 2) else sc([106, 74, 36], 0.92 + 0.1 * ((hsh(731, x, y) % 3) / 2)))
    pz_side = dirt_.copy()
    for x in range(N):
        for y in range(3 + (hsh(732, x) % 2)): pz_side.set(x, y, pz_top.get(x, y))
    put('PODZOL', pz_side, pz_top, dirt_)
    cd_ = dirt_.copy()
    for y in range(N):
        for x in range(N):
            if hsh(733, x, y) % 5 == 0: cd_.set(x, y, sc([120, 112, 104], 0.85 + 0.25 * ((hsh(734, x, y) % 3) / 2)))
    put('COARSE_DIRT', cd_)
    rd_ = dirt_.copy()
    for x0 in (3, 9, 13):
        for y in range(N):
            xx = x0 + ((y // 4) % 2) - (1 if y % 7 == 5 else 0)
            if hsh(735, x0, y) % 5: rd_.set(xx % N, y, [196, 156, 116])
    put('ROOTED_DIRT', rd_)
    pt_ = Img()
    for y in range(N):
        for x in range(N): pt_.set(x, y, sc([150, 122, 66], 0.9 + 0.14 * ((hsh(736, x, y) % 4) / 3)))
    ps_ = dirt_.copy()
    for x in range(N): ps_.set(x, 0, [70, 54, 34]); ps_.set(x, 1, pt_.get(x, 1)); ps_.set(x, 2, pt_.get(x, 2))
    put('DIRT_PATH', ps_, pt_, dirt_)
    def tall(lower_rows, upper_rows, pal):
        return plant_cut(lower_rows, pal), plant_cut(upper_rows, pal)
    GR = ['................', '................', '................', '................', '................', '................', '................', '................',
          '................', '................', '................', '................', '................', '................', '................', '................']
    def grass_half(seed, top):
        img = Img(alpha=True)
        for b in range(6):
            x0 = 1 + (hsh(seed, b) % 14); hgt = 16 if not top else 6 + hsh(seed, b, 1) % 9; lean = (hsh(seed, b, 2) % 3) - 1
            for i in range(hgt):
                y = 15 - i
                x = x0 + (lean * i) // 6
                if 0 <= x < N: img.set(x, y, sc([96, 150, 60], 0.75 + 0.4 * i / 16))
        return img
    tgl, tgu = grass_half(740, False), grass_half(741, True)
    put('TALL_GRASS_L', tgl, cut=tgl); put('TALL_GRASS_U', tgu, cut=tgu)
    def fern_half(seed, top):
        img = Img(alpha=True)
        for side in (-1, 1):
            for i in range(16 if not top else 11):
                y = 15 - i; x = 7 + side * (1 + i // 3)
                if 0 <= x < N:
                    img.set(x, y, [70, 128, 52]); 
                    if i % 2 == 0 and 0 <= x + side < N: img.set(x + side, y, [92, 150, 66])
            for i in range(16 if not top else 13): img.set(7 + (side > 0), 15 - i, [60, 110, 44])
        return img
    lfl, lfu = fern_half(742, False), fern_half(743, True)
    put('LARGE_FERN_L', lfl, cut=lfl); put('LARGE_FERN_U', lfu, cut=lfu)
    def stem_lower(leaf):
        img = Img(alpha=True)
        for y in range(N):
            img.set(7, y, [76, 130, 50]); img.set(8, y, [64, 116, 42])
        for (x, y) in [(5, 4), (4, 5), (6, 5), (9, 9), (10, 8), (11, 9), (5, 12), (4, 13), (6, 13), (10, 14)]: img.set(x, y, leaf)
        return img
    sfl = stem_lower([88, 146, 56])
    sfu = Img(alpha=True)
    for y in range(N):
        for x in range(N):
            d = ((x - 7.5) ** 2 + (y - 6.5) ** 2) ** 0.5
            if d < 2.4: sfu.set(x, y, [92, 60, 28] if (x + y) % 2 else [74, 46, 22])
            elif d < 5.6: sfu.set(x, y, sc([246, 200, 46], 1.06 if (int(math.atan2(y - 6.5, x - 7.5) * 4) % 2) else 0.9))
    for y in range(12, N): sfu.set(7, y, [76, 130, 50]); sfu.set(8, y, [64, 116, 42])
    put('SUNFLOWER_L', sfl, cut=sfl); put('SUNFLOWER_U', sfu, cut=sfu)
    for k, petal, dark in [('LILAC', [200, 150, 220], [150, 100, 180]), ('ROSE_BUSH', [206, 40, 50], [140, 24, 32]), ('PEONY', [236, 170, 210], [200, 120, 170])]:
        lo = Img(alpha=True); up = Img(alpha=True)
        for y in range(N):
            for x in range(N):
                n = hsh(750 + len(k), x, y) % 9
                # 下：茂った葉に花が少し、上：花の房
                if abs(x - 7.5) < 6.5 - (0 if y > 3 else 2) and n > 2: lo.set(x, y, [70, 120, 48] if n > 4 or y > 8 else petal)
                r_ = ((x - 7.5) ** 2 * 1.4 + (y - 9) ** 2) ** 0.5
                if r_ < 6.5 and n > 1: up.set(x, y, petal if n > 4 else dark if n > 2 else [70, 120, 48])
        put(k + '_L', lo, cut=lo); put(k + '_U', up, cut=up)
    bbs = Img(); bbt = Img()
    for y in range(N):
        for x in range(N):
            stalk = x % 4
            node = y % 8 == 3
            bbs.set(x, y, sc([118, 142, 44], (1.12 if stalk == 1 else 0.84 if stalk == 3 else 1.0) * (0.82 if node else 1.0)))
            bbt.set(x, y, [200, 190, 120] if (x % 4 in (1, 2) and y % 4 in (1, 2)) else sc([118, 142, 44], 0.9))
    put('BAMBOO_BLOCK', bbs, bbt, bbt)
    bp = Img(); bm = Img()
    for y in range(N):
        for x in range(N):
            seam = x % 4 == 0
            bp.set(x, y, sc([200, 176, 74], 0.78 if seam else (1.06 if (y + x // 4 * 5) % 9 == 0 else 1.0)))
            cell = ((x // 8) + (y // 8)) % 2
            edge = x % 8 in (0,) or y % 8 in (0,)
            bm.set(x, y, sc([196, 170, 70], 0.7 if edge else (1.05 if ((x if cell else y) % 2) else 0.92)))
    put('BAMBOO_PLANKS', bp); put('BAMBOO_MOSAIC', bm)

    # 切り抜きの見た目で上下の面が横と同じものは、上下を不透明な所の平均色で塗る（地形図で真上から見たとき、透明な所が黒くならないように）
    for k, e in T.items():
        if 'cut' in e and not e.get('all'):
            ops = [c for r_ in e['cut'].p for c in r_ if c]
            if not ops: continue
            avg = [sum(c[i] for c in ops) // len(ops) for i in range(3)]
            fill = Img(avg)
            rr = random.Random(len(k) * 131 + sum(map(ord, k)))
            for y in range(N):   # 不透明な所の色を散らして、真上から見ても素材の感じが出るようにする
                for x in range(N):
                    if rr.random() < 0.6: fill.set(x, y, mixc(ops[rr.randrange(len(ops))], avg, 0.35))
            if e['top'] is e['side'] or e['top'] is e['cut']: e['top'] = fill
            if e['bottom'] is e['side'] or e['bottom'] is e['cut']: e['bottom'] = fill
            if e['side'] is e['cut']:
                sd = e['cut'].copy()
                for y in range(N):
                    for x in range(N):
                        if not sd.p[y][x]: sd.p[y][x] = list(avg)
                e['side'] = sd
    T['SHORT_GRASS']['top'] = T['SHORT_GRASS']['bottom'] = T['GRASS']['top']   # 真上からは草の生えた地面と同じに見せる
    # ---- 書き出し ----
    def b64(img, a=False):
        return base64.b64encode(img.rgba() if a else img.rgb()).decode()
    lines = ['// ブロックの見た目（16×16 のドット絵）。tools/blockart/gen.py で作る。',
             '// 面ごとの RGB を左上から行ごとに並べて base64 にしたもの（768 バイト）。rgba は透明な所のある見た目（1024 バイト）。',
             '// 色は以前の見た目（提供された全ブロック図鑑 PDF の図）の平均色を土台にし、素材ごとの模様を描いている。',
             '(function (G) {', "  'use strict';", '  var WG = G.WG = G.WG || {};', '  WG.TEX16 = {']
    keys = list(T.keys())
    for i, k in enumerate(keys):
        e = T[k]
        parts = ["side: '%s'" % b64(e['side']), "top: '%s'" % b64(e['top']), "bottom: '%s'" % b64(e['bottom'])]
        if 'cut' in e: parts.append("rgba: '%s'" % b64(e['cut'], True))
        if e.get('all'): parts.append('allFaces: true')
        lines.append('    %s: { %s }%s' % (k, ', '.join(parts), ',' if i < len(keys) - 1 else ''))
    lines.append('  };')
    lines.append('  WG.EXTRA16 = { %s };' % ', '.join("%s: '%s'" % (k, b64(v, True)) for k, v in extra.items()))
    lines += ["})(typeof window !== 'undefined' ? window : globalThis);", '']
    open(os.path.join(ROOT, 'js', 'tex16.js'), 'w').write('\n'.join(lines))
    print(len(T), 'textures')
    if out_png:
        from PIL import Image
        ks = [k for k in keys if not k.startswith('REDSTONE_WIRE_')]
        cols = 12; S = 4; cell = 16 * S + 6
        im = Image.new('RGB', (cols * cell, ((len(ks) * 2 + cols - 1) // cols) * cell), (150, 150, 150))
        i = 0
        for k in ks:
            for f in ('side', 'top'):
                img = T[k]['cut'] if 'cut' in T[k] and f == 'side' else T[k][f]
                x0, y0 = (i % cols) * cell + 3, (i // cols) * cell + 3
                for y in range(N):
                    for x in range(N):
                        c = img.p[y][x]
                        if c:
                            for a in range(S):
                                for bb in range(S): im.putpixel((x0 + x * S + a, y0 + y * S + bb), tuple(c))
                i += 1
        im.save(out_png)

def sc_img(c, k):
    return Img(sc(c, k))

if __name__ == '__main__':
    main()
