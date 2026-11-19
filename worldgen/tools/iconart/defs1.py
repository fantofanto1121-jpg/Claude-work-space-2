# 道具・防具・素材
R = {
    'handle': ['#2a1c0e', '#4e3519', '#6b4a25', '#8a6232', '#a37a44'],
    'wood': ['#33230f', '#6b4c26', '#8f6a38', '#ae8650', '#c9a46a'],
    'stone': ['#262626', '#575757', '#767676', '#929292', '#b4b4b4'],
    'iron': ['#2e2e30', '#8e8e92', '#bdbdc0', '#dcdcde', '#ffffff'],
    'gold': ['#4e3206', '#b4801a', '#e2b12e', '#f4d35a', '#fff4b0'],
    'diamond': ['#0b3534', '#169a90', '#38d0c4', '#86eee4', '#e2fffb'],
    'leather': ['#33190b', '#74401f', '#94582c', '#b0703c', '#c98c56'],
    'copper': ['#40200f', '#9c4c28', '#c46838', '#de8a58', '#f4b48e'],
    'brick': ['#33140c', '#7a3424', '#9c4a34', '#b8624a', '#d07e64'],
    'netherbrick': ['#140608', '#381218', '#4c1c22', '#62282e', '#7c3a40'],
    'coal': ['#0b0b0d', '#1c1c20', '#2c2c32', '#44444c', '#6c6c78'],
    'charcoal': ['#100a06', '#281e16', '#3c2e22', '#544434', '#72604c'],
    'rawiron': ['#3a2a20', '#86664e', '#ad8768', '#cba584', '#e6c8a8'],
    'rawgold': ['#4e3206', '#b0801c', '#d6a630', '#ecc65a', '#fff0a4'],
    'rawcopper': ['#40200f', '#96482a', '#b6623a', '#d07e58', '#eaa684'],
    'lapis': ['#08163e', '#1a3584', '#2a50b4', '#4672d6', '#8eacf2'],
    'redstone': ['#330604', '#801410', '#b0201a', '#dc3a2a', '#ff7c64'],
    'glow': ['#523a0e', '#b4842c', '#dcac46', '#f2cc6c', '#fff2b4'],
    'gunpowder': ['#1a1a1a', '#3a3a3a', '#525252', '#6e6e6e', '#909090'],
    'sugar': ['#7c7c80', '#cacacc', '#e4e4e6', '#f4f4f6', '#ffffff'],
    'blaze': ['#552a06', '#c46c18', '#ec9c1e', '#ffc646', '#fff2a6'],
    'bonemeal': ['#64625a', '#c0beb0', '#dad8ca', '#ecead e'.replace(' ', ''), '#ffffff'],
    'quartz': ['#5a4e48', '#c8beb6', '#e2dad2', '#f2ece6', '#ffffff'],
    'bone': ['#5e5a50', '#bcb8a6', '#d8d4c2', '#eae6d8', '#ffffff'],
    'flint': ['#111114', '#2a2a30', '#42424a', '#5c5c66', '#8c8c98'],
}
R['bonemeal'][3] = '#eceade'

def tools(mat, head):
    h = {'H': R[head], 'S': R['handle']}
    pick = [
        '................',
        '....HHHHHH......',
        '..HHHHHHHHH.....',
        '.HHH....HHHH....',
        '.HH.......HHH...',
        '...........HH...',
    ]
    pick_handle = ['................'] * 16
    pick_handle = [list(r) for r in pick_handle]
    for x in range(1, 10):
        y = 14 - x
        pick_handle[y][x] = 'S'; pick_handle[y][x + 1] = 'S'
    shovel = [
        '................',
        '...........HHH..',
        '..........HHHHH.',
        '.........HHHHHH.',
        '.........HHHHH..',
        '........SSHHH...',
        '.......SS.......',
        '......SS........',
        '.....SS.........',
        '....SS..........',
        '...SS...........',
        '..SS............',
        '.SS.............',
        '................',
    ]
    sword = [
        '................',
        '.............HH.',
        '............HHH.',
        '...........HHH..',
        '..........HHH...',
        '.........HHH....',
        '........HHH.....',
        '.......HHH......',
        '...S..HHH.......',
        '....SHHH........',
        '.....SH.........',
        '....SSSS........',
        '...SS..S........',
        '..SS............',
        '.SS.............',
        '................',
    ]
    axe = [
        '................',
        '......HHH...SS..',
        '.....HHHHH.SS...',
        '....HHHHHHSS....',
        '....HHHHHSSH....',
        '.....HHHSSHH....',
        '......HSS.......',
        '.....SS.........',
        '....SS..........',
        '...SS...........',
        '..SS............',
        '.SS.............',
        '................',
    ]
    hoe = [
        '................',
        '....HHHHHH..SS..',
        '....HHHHHHHSS...',
        '....HH....SS....',
        '.........SS.....',
        '........SS......',
        '.......SS.......',
        '......SS........',
        '.....SS.........',
        '....SS..........',
        '...SS...........',
        '..SS............',
        '.SS.............',
        '................',
    ]
    p = [list(r.ljust(16, '.')) for r in pick] + [['.'] * 16 for _ in range(16 - len(pick))]
    return {
        mat + '_PICKAXE': (pick, h, True, ["".join(r) for r in pick_handle]),
        mat + '_SHOVEL': (shovel, h, False, None),
        mat + '_SWORD': (sword, h, False, None),
        mat + '_AXE': (axe, h, False, None),
        mat + '_HOE': (hoe, h, False, None),
    }

def armor(mat, ramp):
    h = {'H': R[ramp], 'T': R[ramp][:]}
    helmet = [
        '................',
        '................',
        '................',
        '....HHHHHHHH....',
        '...HHHHHHHHHH...',
        '..HHHHHHHHHHHH..',
        '..HHHHHHHHHHHH..',
        '..HHHH....HHHH..',
        '..HHH......HHH..',
        '..HHH......HHH..',
        '..HH........HH..',
    ]
    chest = [
        '................',
        '................',
        '..HHHH....HHHH..',
        '.HHHHHH..HHHHHH.',
        '.HHHHHHHHHHHHHH.',
        '.HHHHHHHHHHHHHH.',
        '.HHH.HHHHHH.HHH.',
        '.HH..HHHHHH..HH.',
        '.....HHHHHH.....',
        '.....HHHHHH.....',
        '.....HHHHHH.....',
        '.....HHHHHH.....',
        '......HHHH......',
    ]
    legs = [
        '................',
        '................',
        '...HHHHHHHHHH...',
        '...HHHHHHHHHH...',
        '...HHHHHHHHHH...',
        '...HHHHHHHHHH...',
        '...HHHH..HHHH...',
        '...HHHH..HHHH...',
        '...HHHH..HHHH...',
        '...HHHH..HHHH...',
        '...HHH....HHH...',
        '...HHH....HHH...',
        '...HHH....HHH...',
    ]
    boots = [
        '................',
        '................',
        '................',
        '................',
        '...HHH....HHH...',
        '...HHH....HHH...',
        '...HHH....HHH...',
        '...HHH....HHH...',
        '.HHHHH....HHHHH.',
        '.HHHHH....HHHHH.',
        '.HHHHH....HHHHH.',
    ]
    return {mat + '_HELMET': (helmet, h), mat + '_CHESTPLATE': (chest, h), mat + '_LEGGINGS': (legs, h), mat + '_BOOTS': (boots, h)}

INGOT = [
    '................',
    '................',
    '................',
    '................',
    '......TTTTTTTT..',
    '.....TTTTTTTTS..',
    '....TTTTTTTTSS..',
    '...FFFFFFFFSSS..',
    '...FFFFFFFFSSS..',
    '...FFFFFFFFSS...',
    '...FFFFFFFFS....',
]
LUMP = [
    '................',
    '................',
    '......HHHH......',
    '....HHHHHHH.....',
    '...HHHHHHHHHH...',
    '..HHHHHHHHHHH...',
    '..HHHHHHHHHHHH..',
    '..HHHHHHHHHHHH..',
    '...HHHHHHHHHHH..',
    '...HHHHHHHHHH...',
    '....HHHHHHHH....',
    '......HHHH......',
]
RAW = [
    '................',
    '................',
    '................',
    '.....HHHHH......',
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '...HHHHHHHHHHH..',
    '..HHHHHHHHHHHH..',
    '..HHHHHHHHHHHH..',
    '...HHHHHHHHHH...',
    '....HHHHHHHH....',
    '.....HHHHH......',
]
GEM = [
    '................',
    '................',
    '................',
    '.....HHHHHH.....',
    '....TTTTTTTT....',
    '...TTTTTTTTTT...',
    '..HHHHHHHHHHHH..',
    '...HHHHHHHHHH...',
    '....HHHHHHHH....',
    '.....HHHHHH.....',
    '......HHHH......',
    '.......HH.......',
]
NUGGET = [
    '................', '................', '................', '................', '................',
    '......HHH.......',
    '.....HHHHH......',
    '....HHHHHHH.....',
    '....HHHHHHHH....',
    '.....HHHHHH.....',
    '......HHH.......',
]
DUST = [
    '................', '................', '................', '................',
    '.......H........',
    '......HHH.......',
    '.....HHHHH......',
    '....HHHHHHH.....',
    '...HHHHHHHHH....',
    '..HHHHHHHHHHH...',
    '.HHHHHHHHHHHHH..',
    '................',
]
BALL = [
    '................', '................', '................',
    '.....HHHHH......',
    '....HHHHHHH.....',
    '...HHHHHHHHH....',
    '...HHHHHHHHH....',
    '...HHHHHHHHH....',
    '...HHHHHHHHH....',
    '....HHHHHHH.....',
    '.....HHHHH......',
]
ROD = ['................', '.............HH.', '............HHH.', '...........HHH..', '..........HHH...', '.........HHH....', '........HHH.....',
       '.......HHH......', '......HHH.......', '.....HHH........', '....HHH.........', '...HHH..........', '..HHH...........', '.HHH............', '.HH.............']
CRYSTAL = [
    '................', '................',
    '.......TT.......',
    '......TTHH...T..',
    '.....TTTHH..TTH.',
    '..T..TTTHH..TTH.',
    '.TTH.TTTHH.TTHH.',
    '.TTH.TTTHH.TTH..',
    '.TTHHTTTHHTTHH..',
    '..TTHTTTHHTTH...',
    '...HHHHHHHHH....',
]
LAPIS = [
    '................', '................', '................',
    '......HHHH......',
    '....HHTTTTHH....',
    '...HTTTTTTTTH...',
    '...HHHHHHHHHH...',
    '....HHHHHHHH....',
    '.....HHHHHH.....',
    '......HHHH......',
]

def materials():
    d = {}
    lt = lambda r: [R[r][0], R[r][2], R[r][3], R[r][4], '#ffffff']
    for k, r in [('IRON_INGOT', 'iron'), ('GOLD_INGOT', 'gold'), ('COPPER_INGOT', 'copper'), ('BRICK', 'brick'), ('NETHER_BRICK', 'netherbrick')]:
        d[k] = (INGOT, {'F': R[r], 'T': lt(r), 'S': [R[r][0], R[r][0], R[r][1], R[r][1], R[r][2]]})
    d['COAL'] = (LUMP, {'H': R['coal']}, {'s': '#5a5a66', 'k': '#121216'}, [(5, 5, 's'), (8, 4, 's'), (10, 7, 's'), (6, 8, 'k'), (9, 9, 's'), (4, 7, 'k')])
    d['CHARCOAL'] = (LUMP, {'H': R['charcoal']}, {'s': '#6e5c48', 'k': '#16100a'}, [(5, 5, 's'), (8, 4, 's'), (10, 7, 's'), (6, 8, 'k'), (9, 9, 's')])
    for k, r, sp in [('RAW_IRON', 'rawiron', '#8a6a52'), ('RAW_GOLD', 'rawgold', '#9a6a14'), ('RAW_COPPER', 'rawcopper', '#7e3a1e')]:
        d[k] = (RAW, {'H': R[r]}, {'s': sp, 'w': '#ffffff'}, [(6, 6, 's'), (9, 5, 's'), (10, 8, 's'), (5, 9, 's'), (7, 4, 'w')])
    d['DIAMOND'] = (GEM, {'H': R['diamond'], 'T': lt('diamond')}, {'w': '#ffffff'}, [(6, 4, 'w')])
    d['LAPIS'] = (LAPIS, {'H': R['lapis'], 'T': lt('lapis')}, {'w': '#d8e4ff'}, [(6, 4, 'w')])
    d['QUARTZ'] = (CRYSTAL, {'H': R['quartz'], 'T': lt('quartz')})
    d['GOLD_NUGGET'] = (NUGGET, {'H': R['gold']}, {'w': '#ffffff'}, [(6, 6, 'w')])
    for k, r in [('REDSTONE', 'redstone'), ('GLOWSTONE_DUST', 'glow'), ('GUNPOWDER', 'gunpowder'), ('SUGAR', 'sugar'), ('BLAZE_POWDER', 'blaze'), ('BONE_MEAL', 'bonemeal')]:
        d[k] = (DUST, {'H': R[r]}, {'s': R[r][4], 'k': R[r][1]}, [(7, 6, 's'), (5, 9, 's'), (10, 8, 's'), (8, 9, 'k'), (3, 10, 's'), (11, 10, 'k')])
    d['STICK'] = (ROD, {'H': R['handle']})
    d['BONE'] = (['................', '...........HH...', '..........HHH.HH.', '...........HHHHH.', '..........HHHH...', '.........HHH.....', '........HHH......', '.......HHH.......',
                  '......HHH........', '.....HHH.........', '...HHHH..........', '.HHHHH...........', '.HH.HHH..........', '....HH...........'], {'H': R['bone']})
    d['BLAZE_ROD'] = (ROD, {'H': R['blaze']})
    d['FLINT'] = (LUMP, {'H': R['flint']}, {'w': '#a8a8b4', 'k': '#08080a'}, [(5, 4, 'w'), (6, 5, 'w'), (9, 8, 'k'), (10, 9, 'k')])
    return d
