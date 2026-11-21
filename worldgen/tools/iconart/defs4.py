# スポーンエッグ・染料・追加の生き物のドロップ・ランタン
from defs1 import R, NUGGET
from defs2 import RR, MEAT
from defs3 import ramp_from

D = {}
EGG = ['................', '......AAAA......', '.....AAAAAA.....', '....AAAAAAAA....', '....AAAAAAAA....', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...',
       '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '...AAAAAAAAAA...', '....AAAAAAAA....', '......AAAA......']
SPOTS = [(6, 3), (7, 3), (6, 4), (10, 5), (11, 5), (11, 6), (4, 8), (5, 8), (4, 9), (8, 9), (9, 9), (8, 10), (9, 10), (12, 10), (12, 11), (6, 12), (7, 12)]
# 生き物ごとの殻の色と斑点の色
EGGS = {'PIG': ('#eaa29e', '#c9605c'), 'COW': ('#4a382c', '#c8c4b8'), 'SHEEP': ('#e8e6e0', '#f2b4b0'), 'CHICKEN': ('#c8c8c4', '#c4382c'),
        'ZOMBIE': ('#3a7a84', '#6d8d58'), 'SKELETON': ('#cacac4', '#4c4c4a'), 'BOMBER': ('#5d7a48', '#e0b04a'), 'SPIDER': ('#3a322c', '#b02a20'),
        'RABBIT': ('#a8865e', '#6e5038'), 'WOLF': ('#d6d2c8', '#b8a088'), 'SQUID': ('#2e3e62', '#7a8ea4'), 'BAT': ('#4e4034', '#1a1612'),
        'CAVE_SPIDER': ('#1e4450', '#b02a20'), 'SLIME': ('#5aa844', '#9ad482'), 'MAGMA_SLIME': ('#4a1a10', '#e8a020'), 'WITCH': ('#5a3a74', '#4a9a3a')}
for k, (a, b) in EGGS.items():
    D['SPAWN_EGG_' + k] = (EGG, {'A': ramp_from(a), 'B': ramp_from(b)}, {}, [], [(x, y, 'B') for x, y in SPOTS])

# 染料：粉の小さな山
DYE = ['................', '................', '................', '.......AA.......', '.....AAAAA......', '....AAAAAAAA....', '...AAAAAAAAAA...', '...AAAAAAAAAAA..',
       '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '...AAAAAAAAAA...', '....AAAAAAAA....', '......AAAA......']
DYES = {'WHITE': '#e8e8e4', 'ORANGE': '#e0761a', 'MAGENTA': '#c050c0', 'LIGHT_BLUE': '#4ab4e2', 'YELLOW': '#f0c434', 'LIME': '#78c424', 'PINK': '#ee90ac',
        'GRAY': '#54595e', 'LIGHT_GRAY': '#9a9a94', 'CYAN': '#1a9aa2', 'PURPLE': '#8a34b8', 'BLUE': '#3c46b0', 'GREEN': '#5e7a22', 'RED': '#b42a24', 'BLACK': '#2a2a30'}
for k, c in DYES.items():
    D[k + '_DYE'] = (DYE, {'A': ramp_from(c)}, {'s': ramp_from(c)[4]}, [(6, 5, 's'), (9, 7, 's'), (5, 9, 's'), (10, 10, 's')])

D['INK_SAC'] = (['................', '.......BB.......', '......BBBB......', '.......BB.......', '......AAAA......', '.....AAAAAA.....', '....AAAAAAAA....', '...AAAAAAAAAA...',
                 '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '....AAAAAAAA....', '.....AAAAAA.....'],
                {'A': ramp_from('#2e3044'), 'B': ramp_from('#5a5c70')}, {'w': '#8a8ca4'}, [(5, 6, 'w'), (6, 5, 'w')])
D['RABBIT_HIDE'] = (['................', '................', '...AAA....AAA...', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...',
                     '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '...AAA....AAA...'], {'A': RR['rabbit']}, {'s': '#7a5a3a'}, [(5, 5, 's'), (9, 7, 's'), (7, 8, 's'), (11, 4, 's')])
D['RAW_RABBIT'] = (MEAT, {'A': RR['chicken'], 'B': RR['white']}, {'f': '#f6dcd8'}, [(6, 6, 'f'), (7, 7, 'f'), (9, 5, 'f')])
D['COOKED_RABBIT'] = (MEAT, {'A': RR['chickenc'], 'B': RR['bread']}, {'f': '#e0b07a'}, [(6, 6, 'f'), (7, 7, 'f'), (9, 5, 'f')])
D['IRON_NUGGET'] = (NUGGET, {'H': R['iron']}, {'w': '#ffffff'}, [(6, 6, 'w')])
D['LANTERN'] = (['................', '.......II.......', '......I..I......', '.......II.......', '.....IIIIII.....', '....IIIIIIII....', '....IggggggI....', '....IgyyyygI....',
                 '....IgyyyygI....', '....IgyyyygI....', '....IgyyyygI....', '....IggggggI....', '....IIIIIIII....', '.....IIIIII.....'],
                {'I': ['#141418', '#34343c', '#4a4a54', '#62626e', '#868694']}, {'g': '#f09a34', 'y': '#ffd870'})

# エメラルド（取引のお金）と、村人のスポーンエッグ
from defs1 import GEM
EM = ['#0a3a1a', '#1a8a3e', '#2ab454', '#5ad67a', '#b4f4c4']
D['EMERALD'] = (GEM, {'H': EM, 'T': [EM[0], EM[2], EM[3], EM[4], '#ffffff']}, {'w': '#ffffff'}, [(6, 4, 'w')])
D['SPAWN_EGG_VILLAGER'] = (EGG, {'A': ramp_from('#7a5a3a'), 'B': ramp_from('#c8a07a')}, {}, [], [(x, y, 'B') for x, y in SPOTS])
