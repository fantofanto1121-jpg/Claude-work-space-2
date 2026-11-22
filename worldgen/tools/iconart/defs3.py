# ポーション、立体（階段・ハーフブロック・感圧板・金床・ホッパー・リピーター・コンパレーター・ボタン）、扉・柵・はしごなど
from defs1 import R
from defs2 import R2, F, D as D2, bottle, BUCKET
RR = dict(R); RR.update(R2)
RR.update({
    'oak': ['#3a2a14', '#7a5c30', '#9c7a44', '#b8945a', '#d0ae74'],
    'spruce': ['#22170c', '#4e3820', '#6a4c2e', '#84623c', '#9e7a50'],
    'acacia': ['#3a1a0a', '#8a4422', '#aa5a32', '#c47446', '#da9060'],
    'birch': ['#5a5038', '#b4a674', '#cdbf8c', '#e0d4a4', '#f0e6c0'],
    'jungle': ['#3a2414', '#86603e', '#a27a52', '#bc9468', '#d4ae84'],
    'cobble': ['#262626', '#4e4e4e', '#6a6a6a', '#848484', '#a4a4a4'],
    'stonebrick': ['#2a2a2a', '#5c5c5c', '#787878', '#929292', '#b0b0b0'],
    'sandstone': ['#5a4c2c', '#b4a070', '#cbb888', '#ddcc9e', '#efe2bc'],
    'bricks': ['#33140c', '#82382a', '#a04c3a', '#b8644e', '#d08068'],
    'stone2': ['#2c2c2c', '#686868', '#848484', '#9c9c9c', '#bcbcbc'],
    'anvil': ['#121214', '#2e2e32', '#404046', '#56565e', '#74747e'],
    'hopper': ['#141416', '#363638', '#4a4a4e', '#606066', '#7e7e86'],
    'iron2': ['#3a3a3e', '#a4a4aa', '#c6c6cc', '#dedee2', '#ffffff'],
    'cane': ['#24461a', '#5a9a40', '#7cbc58', '#9ad674', '#c4ee9e'],
    'web': ['#8a8a8e', '#dcdce0', '#ececf0', '#f6f6f8', '#ffffff'],
    'rtorch': ['#3a0806', '#a01c14', '#d02a1e', '#ff4a32', '#ffa08a'],
})

def potion(color_ramp, splash):
    rows = bottle(True, splash)
    return (rows, {'G': RR['glass'], 'N': RR['wood'], 'L': color_ramp}, {'w': '#ffffff'}, [(5, 7, 'w')] if not splash else [(5, 6, 'w')])

def ramp_from(hexcol):
    c = tuple(int(hexcol[i:i + 2], 16) for i in (1, 3, 5))
    def f(k):  # noqa
        if k < 1: return '#%02x%02x%02x' % tuple(int(v * k) for v in c)
        return '#%02x%02x%02x' % tuple(int(v + (255 - v) * (k - 1)) for v in c)
    return [f(0.3), f(0.7), f(1.0), f(1.3), f(1.65)]

# ---- 等角の箱を 16×16 に描く ----
def iso(boxes, pad=1):
    """boxes: [(x0,y0,z0,x1,y1,z1, letterTop, letterLeft, letterRight)] in unit cube coords. returns rows."""
    S = 6.5
    def proj(X, Y, Z):
        return (7.5 + (X - Z) * S, 1.0 + (X + Z) * S * 0.5 + (1 - Y) * S)
    grid = [['.'] * 16 for _ in range(16)]
    order = sorted(boxes, key=lambda b: (b[0] + b[3]) / 2 + (b[2] + b[5]) / 2 + (b[1] + b[4]) / 2)
    def inside(px, py, poly):
        n = len(poly); c = False
        for i in range(n):
            x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
            if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
                c = not c
        return c
    for b in order:
        x0, y0, z0, x1, y1, z1, lt, ll, lr = b
        faces = [
            ([proj(x0, y1, z0), proj(x1, y1, z0), proj(x1, y1, z1), proj(x0, y1, z1)], lt),
            ([proj(x0, y0, z1), proj(x1, y0, z1), proj(x1, y1, z1), proj(x0, y1, z1)], ll),
            ([proj(x1, y0, z0), proj(x1, y0, z1), proj(x1, y1, z1), proj(x1, y1, z0)], lr),
        ]
        for poly, letter in faces:
            for py in range(16):
                for px in range(16):
                    if inside(px + 0.5, py + 0.5, poly):
                        grid[py][px] = letter
    return ["".join(r) for r in grid]

def face_ramps(r):
    # 平らな面の色：上は明るく、左は中くらい、右は暗く（mid の位置の色を使う）
    base = RR[r]
    top = [base[0], base[4], base[4], base[4], base[4]]
    left = [base[0], base[2], base[2], base[2], base[2]]
    right = [base[0], base[1], base[1], base[1], base[1]]
    return {'T': top, 'L': left, 'R': right}

def block_marks(rows, mat):
    """少しだけ素材の模様（板目・石の粒・レンガの目地）"""
    marks = []
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            h = (x * 73856093 ^ y * 19349663) & 15
            if mat in ('oak', 'spruce', 'acacia', 'birch', 'jungle', 'darkoak') and ch in 'LR' and y % 3 == 0:
                marks.append((x, y, 'p'))
            elif mat in ('cobble', 'stonebrick', 'stone2', 'blackstone') and h < 3:
                marks.append((x, y, 's'))
            elif mat in ('bricks', 'endbrick') and ch in 'LR' and (y % 3 == 0):
                marks.append((x, y, 'm'))
            elif mat == 'sandstone' and ch in 'LR' and y % 4 == 0:
                marks.append((x, y, 'q'))
    return marks

def block_item(boxes, mat):
    rows = iso(boxes)
    fr = face_ramps(mat)
    base = RR[mat]
    fixed = {'p': base[1], 's': base[1], 'm': '#c8b8a8', 'q': base[1]}
    return (rows, fr, fixed, block_marks(rows, mat))

# 第 6 回の建材の色
RR.update({'darkoak': ['#1c120a', '#3a2614', '#4a3018', '#5e3e20', '#74502c'], 'netherbrick': ['#140808', '#2a1214', '#381a1c', '#4a2426', '#5c3032'],
           'purpur': ['#4a2e4a', '#8a5e8a', '#a87ca8', '#bc92bc', '#d0aad0'], 'prismarine': ['#1e4a40', '#4a8a7a', '#64aa98', '#7cc0ac', '#98d4c0'],
           'blackstone': ['#121014', '#28242a', '#363038', '#46404a', '#58525c'], 'endbrick': ['#6a6a40', '#b8ba84', '#dee0a8', '#eaecbc', '#f4f6d0']})
D = {}
CUBE = lambda: [(0, 0, 0, 1, 1, 1, 'T', 'L', 'R')]
STAIRS = [(0, 0, 0, 1, 0.5, 1, 'T', 'L', 'R'), (0, 0.5, 0, 1, 1, 0.5, 'T', 'L', 'R')]
SLAB = [(0, 0, 0, 1, 0.5, 1, 'T', 'L', 'R')]
for k, m in [('OAK', 'oak'), ('SPRUCE', 'spruce'), ('ACACIA', 'acacia'), ('BIRCH', 'birch'), ('JUNGLE', 'jungle'), ('COBBLESTONE', 'cobble'),
             ('STONE_BRICK', 'stonebrick'), ('SANDSTONE', 'sandstone'), ('BRICK', 'bricks'),
             ('DARK_OAK', 'darkoak'), ('NETHER_BRICK', 'netherbrick'), ('PURPUR', 'purpur'), ('PRISMARINE_BRICK', 'prismarine'),
             ('BLACKSTONE_BRICK', 'blackstone'), ('END_STONE_BRICK', 'endbrick')]:
    D[k + '_STAIRS'] = block_item(STAIRS, m)
    D[k + '_SLAB'] = block_item(SLAB, m)
D['STONE_PRESSURE_PLATE'] = block_item([(0.06, 0, 0.06, 0.94, 0.14, 0.94, 'T', 'L', 'R')], 'stone2')
D['OAK_PRESSURE_PLATE'] = block_item([(0.06, 0, 0.06, 0.94, 0.14, 0.94, 'T', 'L', 'R')], 'oak')
RR.update({'goldp': ['#6a4a10', '#c89a28', '#e8c040', '#f4d860', '#fff0a0'], 'ironp': ['#4a4a50', '#9a9aa2', '#c8c8cc', '#dcdce0', '#f0f0f4']})
D['LIGHT_WEIGHTED_PRESSURE_PLATE'] = block_item([(0.06, 0, 0.06, 0.94, 0.14, 0.94, 'T', 'L', 'R')], 'goldp')
D['HEAVY_WEIGHTED_PRESSURE_PLATE'] = block_item([(0.06, 0, 0.06, 0.94, 0.14, 0.94, 'T', 'L', 'R')], 'ironp')
D['STONE_BUTTON'] = block_item([(0.25, 0, 0.3, 0.75, 0.25, 0.7, 'T', 'L', 'R')], 'stone2')
D['OAK_BUTTON'] = block_item([(0.25, 0, 0.3, 0.75, 0.25, 0.7, 'T', 'L', 'R')], 'oak')
D['ANVIL'] = block_item([(0.15, 0, 0.15, 0.85, 0.25, 0.85, 'T', 'L', 'R'), (0.3, 0.25, 0.3, 0.7, 0.6, 0.7, 'T', 'L', 'R'), (0, 0.6, 0.2, 1, 1, 0.8, 'T', 'L', 'R')], 'anvil')
D['HOPPER'] = block_item([(0.38, 0, 0.38, 0.62, 0.25, 0.62, 'T', 'L', 'R'), (0.25, 0.25, 0.25, 0.75, 0.6, 0.75, 'T', 'L', 'R'), (0, 0.6, 0, 1, 1, 1, 'T', 'L', 'R')], 'hopper')
# ホッパーの口（上の面の中を暗く）
hr = D['HOPPER'][0]
def rep_iso(boxes, base_mat, extra):
    rows = iso(boxes)
    fr = face_ramps(base_mat)
    for k, v in extra.items():
        fr[k] = RR[v] if isinstance(v, str) else v
    return rows, fr
# リピーター・コンパレーター：薄い石の板に、赤い先のトーチ
rows, fr = rep_iso([(0, 0, 0, 1, 0.14, 1, 'T', 'L', 'R'), (0.42, 0.14, 0.15, 0.58, 0.42, 0.31, 'A', 'A', 'A'), (0.42, 0.42, 0.15, 0.58, 0.55, 0.31, 'B', 'B', 'B'),
                    (0.42, 0.14, 0.6, 0.58, 0.42, 0.76, 'A', 'A', 'A'), (0.42, 0.42, 0.6, 0.58, 0.55, 0.76, 'B', 'B', 'B')], 'stone2', {'A': 'handle', 'B': 'rtorch'})
D['REPEATER'] = (rows, fr, {}, [])
rows, fr = rep_iso([(0, 0, 0, 1, 0.14, 1, 'T', 'L', 'R'), (0.15, 0.14, 0.62, 0.31, 0.42, 0.78, 'A', 'A', 'A'), (0.15, 0.42, 0.62, 0.31, 0.55, 0.78, 'B', 'B', 'B'),
                    (0.69, 0.14, 0.62, 0.85, 0.42, 0.78, 'A', 'A', 'A'), (0.69, 0.42, 0.62, 0.85, 0.55, 0.78, 'B', 'B', 'B'), (0.42, 0.14, 0.12, 0.58, 0.3, 0.28, 'B', 'B', 'B')], 'stone2', {'A': 'handle', 'B': 'rtorch'})
D['COMPARATOR'] = (rows, fr, {}, [])

# ---- 平らな絵 ----
def door(mat, iron=False):
    rows = ['....AAAAAAA.....', '....AAAAAAA.....', '....AwwAwwA.....', '....AwwAwwA.....', '....AAAAAAA.....', '....AwwAwwA.....', '....AAAAAAA.....', '....AAAAAAA.....',
            '....AAAAAAA.....', '....AAAAAAh.....', '....AAAAAAA.....', '....AAAAAAA.....', '....AAAAAAA.....', '....AAAAAAA.....', '....AAAAAAA.....', '................']
    if iron:
        return (rows, {'A': RR['iron2']}, {'w': ('#5a5a60', None), 'h': '#2e2e32'}, [])
    base = RR[mat]
    return (rows, {'A': base}, {'w': ('#a8c8d4', None), 'h': '#2a1c0e'}, [(5, 7, 'p'), (6, 7, 'p'), (7, 7, 'p'), (8, 7, 'p'), (9, 7, 'p'), (5, 11, 'p'), (6, 11, 'p'), (7, 11, 'p'), (8, 11, 'p'), (9, 11, 'p')])
for k, m in [('OAK', 'oak'), ('SPRUCE', 'spruce'), ('ACACIA', 'acacia'), ('BIRCH', 'birch'), ('JUNGLE', 'jungle')]:
    r, fr, fx, mk = door(m)
    fx = dict(fx); fx['p'] = RR[m][1]
    D[k + '_DOOR'] = (r, fr, fx, mk)
D['IRON_DOOR'] = door(None, True)
FENCE = ['................', '................', '...A......A.....', '..AAA....AAA....', '..AAA....AAA....', '..AAAAAAAAAA....', '..AAAAAAAAAA....', '..AAA....AAA....',
         '..AAA....AAA....', '..AAAAAAAAAA....', '..AAAAAAAAAA....', '..AAA....AAA....', '..AAA....AAA....', '..AAA....AAA....', '................']
for k, m in [('OAK', 'oak'), ('SPRUCE', 'spruce'), ('ACACIA', 'acacia'), ('BIRCH', 'birch'), ('JUNGLE', 'jungle')]:
    D[k + '_FENCE'] = (FENCE, {'A': RR[m]}, {}, [])
D['LADDER'] = (['................', '...A......A.....', '...AAAAAAAA.....', '...A......A.....', '...A......A.....', '...AAAAAAAA.....', '...A......A.....', '...A......A.....',
                '...AAAAAAAA.....', '...A......A.....', '...A......A.....', '...AAAAAAAA.....', '...A......A.....', '...A......A.....', '................'], {'A': RR['oak']}, {}, [])
D['REDSTONE_TORCH'] = (['................', '................', '................', '.......BB.......', '......BBBB......', '......BBBB......', '.......AA.......', '.......AA.......',
                        '.......AA.......', '.......AA.......', '.......AA.......', '.......AA.......', '.......AA.......', '................'], {'A': RR['handle'], 'B': RR['rtorch']}, {'w': '#ffd0c4'}, [(7, 3, 'w')])
D['LEVER'] = (['................', '................', '.........S......', '........SS......', '.......SS.......', '......SS........', '.....SS.........', '....AAAAAA......',
               '...AAAAAAAA.....', '...AAAAAAAA.....', '................'], {'A': RR['cobble'], 'S': RR['handle']}, {}, [])
D['SUGAR_CANE'] = (['................', '....A.....A.....', '....A.....A.....', '....AA....A..L..', '....A....AA.L...', '..L.A.....A.L...', '...LA.....AL....', '....A.....A.....',
                    '....AA...AA.....', '....A.....A.....', '....A.....A.....', '...LA.....A.....', '....A.....AL....', '....A.....A.....', '................'], {'A': RR['cane'], 'L': RR['leaf']}, {}, [])
MUSH = ['................', '................', '................', '................', '.....AAAAAA.....', '...AAAAAAAAAA...', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..',
        '......SSSS......', '......SSSS......', '......SSSS......', '......SSSS......', '.....SSSSSS.....', '................']
D['BROWN_MUSHROOM'] = (MUSH, {'A': RR['bmush'], 'S': RR['stem']}, {}, [])
D['RED_MUSHROOM'] = (MUSH, {'A': RR['rmush'], 'S': RR['stem']}, {'w': ('#ffffff', None)}, [(5, 5, 'w'), (9, 4, 'w'), (11, 6, 'w'), (7, 6, 'w')])
D['COBWEB'] = (['................', '.A......A.....A.', '..A.....A....A..', '...A....A...A...', '....AAAAAAAAA...', '....A...A..A....', '.....A..A.A.....', 'AAAAAAAAAAAAAAAA',
                '.....A..A.A.....', '....A...A..A....', '....AAAAAAAAA...', '...A....A...A...', '..A.....A....A..', '.A......A.....A.', '................'], {'A': RR['web']}, {}, [])

ISO = set(k for k in D if k.endswith(('_STAIRS', '_SLAB', '_PLATE', '_BUTTON')) or k in ('ANVIL', 'HOPPER', 'REPEATER', 'COMPARATOR'))
