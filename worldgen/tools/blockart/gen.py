# ブロックの見た目（16×16 のドット絵）を作り、js/tex16.js に書き出す。
# 使い方: python3 tools/blockart/gen.py [見本の PNG]
# 色は今までの見た目（PDF の図）の平均色を土台にし、素材ごとの模様（石の粒・板目・年輪・レンガ・鉱石の結晶など）を
# 決まった乱数で描く。明るさは 4〜6 段に揃えて、ドット絵らしい、はっきりした色の段にしている。
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
    def col(k, face='side'):
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
    for w, birch in [('OAK', False), ('BIRCH', True), ('SPRUCE', False), ('JUNGLE', False), ('ACACIA', False)]:
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
    for w in ['OAK', 'SPRUCE', 'ACACIA', 'BIRCH', 'JUNGLE']:
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
