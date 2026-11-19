# 16x16 pixel-art engine: silhouettes with region letters, auto outline and bevel shading (light from top-left)
from PIL import Image

def hx(h):
    return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))

def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))

def lighter(r):
    return [r[1], r[2], r[3], r[4], '#ffffff' if True else r[4]]

def render(rows, ramps, fixed=None, mirror=False, noshade=()):
    """rows: list of 16 strings. Uppercase -> ramp region (outline, dark, mid, light, highlight).
    Lowercase/digits -> fixed colours from `fixed` (value = '#rrggbb' or (fill, outline)).
    mirror: also add (15-y, 15-x) reflection for cells of the rows (for pickaxes)."""
    fixed = fixed or {}
    g = [list(r.ljust(16, '.')[:16]) for r in rows] + [['.'] * 16 for _ in range(16 - len(rows))]
    if mirror:
        add = []
        for y in range(16):
            for x in range(16):
                if g[y][x] != '.':
                    add.append((15 - y, 15 - x, g[y][x]))
        for x, y, c in add:
            if g[y][x] == '.':
                g[y][x] = c
    out = [[None] * 16 for _ in range(16)]
    def ch(x, y):
        return g[y][x] if 0 <= x < 16 and 0 <= y < 16 else '.'
    for y in range(16):
        for x in range(16):
            c = g[y][x]
            if c == '.':
                continue
            if c in fixed:
                v = fixed[c]
                out[y][x] = hx(v[0] if isinstance(v, tuple) else v)
                continue
            r = [hx(v) for v in ramps[c]]
            if c in noshade:
                out[y][x] = r[2]; continue
            t, l, b, rt = ch(x, y - 1) != c, ch(x - 1, y) != c, ch(x, y + 1) != c, ch(x + 1, y) != c
            if t and l: col = r[4]
            elif t or l: col = r[3]
            elif b and rt: col = r[1]
            elif b or rt: col = mix(r[1], r[2], 0.45)
            else: col = r[2]
            out[y][x] = col
    # outline: empty cells next (4-neighbour) to a filled cell
    res = [row[:] for row in out]
    for y in range(16):
        for x in range(16):
            if g[y][x] != '.':
                continue
            for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                c = ch(x + dx, y + dy)
                if c == '.':
                    continue
                if c in fixed:
                    v = fixed[c]
                    oc = v[1] if isinstance(v, tuple) else None
                    if oc is None:
                        continue
                    res[y][x] = hx(oc)
                else:
                    res[y][x] = hx(ramps[c][0])
                break
    return res

def to_rgba(px):
    b = bytearray()
    for y in range(16):
        for x in range(16):
            c = px[y][x]
            b += bytes([c[0], c[1], c[2], 255]) if c else bytes([0, 0, 0, 0])
    return bytes(b)

def sheet(items, path, scale=4, cols=12):
    n = len(items)
    rows = (n + cols - 1) // cols
    cell = 16 * scale + 8
    im = Image.new('RGB', (cols * cell, rows * cell), (198, 198, 198))
    for i, (k, px) in enumerate(items):
        x0, y0 = (i % cols) * cell + 4, (i // cols) * cell + 4
        for y in range(16):
            for x in range(16):
                c = px[y][x]
                if c:
                    for a in range(scale):
                        for b2 in range(scale):
                            im.putpixel((x0 + x * scale + a, y0 + y * scale + b2), c)
    im.save(path)
