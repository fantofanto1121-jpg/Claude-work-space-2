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
D['SPAWN_EGG_GOLEM'] = (EGG, {'A': ramp_from('#c2beb4'), 'B': ramp_from('#5d7a48')}, {}, [], [(x, y, 'B') for x, y in SPOTS])

# ---- 第 2 回：乗り物・道具・武器 ----
from defs1 import INGOT, LUMP
def grid(fn):
    return [''.join(fn(x, y) for x in range(16)) for y in range(16)]
W, H, IR, GO, LE = R['wood'], R['handle'], R['iron'], R['gold'], R['leather']
D['BOAT'] = (['................', '................', '................', '................', '................', '.A............A.', '.AA..........AA.', '.AAAAAAAAAAAAAA.',
              '..ABBBBBBBBBBA..', '..AAAAAAAAAAAA..', '...AAAAAAAAAA...', '....AAAAAAAA....'], {'A': W, 'B': H})
D['MINECART'] = (['................', '................', '................', '.AAAAAAAAAAAAAA.', '.ABBBBBBBBBBBBA.', '.ABBBBBBBBBBBBA.', '.ABBBBBBBBBBBBA.', '.AAAAAAAAAAAAAA.',
                  '..AAAAAAAAAAAA..', '...k........k...', '..kkk......kkk..', '...k........k...'], {'A': IR, 'B': ramp_from('#4a4a52')}, {'k': '#202024'})
def railrows(rail, mid):
    def f(x, y):
        if x in (3, 4, 11, 12): return 'R'
        if y % 4 in (1, 2) and 1 <= x <= 14: return 'm' if mid and x in (7, 8) else 'T'
        return '.'
    return grid(f)
D['RAIL'] = (railrows(IR, False), {'R': IR, 'T': W})
D['POWERED_RAIL'] = (railrows(GO, True), {'R': GO, 'T': W}, {'m': '#c0302a'})
D['SADDLE'] = (['................', '................', '....AAAAAA......', '...AAAAAAAA.....', '..AAAAAAAAAA....', '..AAAAAAAAAAA...', '...AAAAAAAAAAA..', '....BB....AAAA..',
                '....BB.....AA...', '....BB..........', '...CCC..........', '...C.C..........', '...CCC..........'], {'A': LE, 'B': ramp_from('#3a2416'), 'C': IR})
D['CARROT_ON_A_STICK'] = (['............CC..', '...........CCCL.', '..........CCCL..', '.........S.CL...', '........S..s....', '.......S...s....', '......S....s....', '.....S.....s....',
                           '....S...........', '...S............', '..S.............', '.S..............'], {'S': H, 'C': RR['carrot'], 'L': RR['leaf']}, {'s': '#e8e8e8'})
D['LEAD'] = (['................', '................', '.....AAAAA......', '....A.....A.....', '...A.......A....', '...A.......A....', '...A.......A....', '....A.....A.....',
              '.....AAAAA......', '.......AA.......', '.......AA.......', '........A.......', '........AA......', '.........A......'], {'A': RR['string'] if False else ramp_from('#b8a074')})
D['NAME_TAG'] = (['................', '................', '..........s.....', '.........s......', '....AAAAAAA.....', '...AAAAAAAAA....', '..AAAAAAAAAAA...', '..AAoAAAAAAAA...',
                  '..AAAAAAAAAAA...', '...AAAAAAAAA....', '....AAAAAAA.....'], {'A': ramp_from('#c8a878')}, {'o': '#3a2a1a', 's': '#e0e0e0'})
D['CROSSBOW'] = (['................', '.BBB............', '.B..BB..........', '.B....B.........', '..B....SS.......', '...B..SSs.......', '....BSS.s.......', '.....SB..s......',
                  '....S..B.s......', '...S....Bs......', '..S......B......', '.SS.......B.....', 'SS.........BB...', '...........BBB..'], {'B': IR, 'S': H}, {'s': '#e8e8e8'})
D['TRIDENT'] = (['.........P.P.P..', '.........P.P.P..', '..........PPP...', '...........P....', '..........S.....', '.........S......', '........S.......', '.......S........',
                 '......S.........', '.....S..........', '....S...........', '...S............', '..S.............', '.S..............'], {'P': ramp_from('#5ac8b8'), 'S': ramp_from('#3a8a80')})
D['ELYTRA'] = (['................', '..AA........AA..', '.AAAA......AAAA.', '.AAAAA....AAAAA.', 'AAAAAAA..AAAAAAA', 'AAAAAAA..AAAAAAA', 'AAAAAAA..AAAAAAA', '.AAAAAA..AAAAAA.',
               '.AAAAA....AAAAA.', '.AAAA......AAAA.', '..AAA......AAA..', '..AA........AA..', '...A........A...'], {'A': ramp_from('#8a8aa8')}, {'k': '#5a5a7a'},
              [(3, 5, 'k'), (4, 7, 'k'), (12, 5, 'k'), (11, 7, 'k')])
PAPER = ['................', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..',
         '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..']
D['MAP'] = (PAPER, {'A': RR['paper']}, {'l': '#c0b8a0'}, [(x, y, 'l') for y in (4, 7, 10) for x in range(4, 12)])
D['FILLED_MAP'] = (PAPER, {'A': ramp_from('#d8c8a0')}, {'g': '#6a9a48', 'w': '#4a72b8', 'b': '#8a6a3e', 'r': '#c0302a'},
                   [(x, y, 'g') for y in range(3, 13) for x in range(3, 13) if (x * 7 + y * 3) % 5 < 3] + [(x, y, 'w') for y in range(8, 13) for x in range(8, 13)] + [(5, 5, 'b'), (6, 5, 'b'), (7, 7, 'r')])
ROUND = ['................', '................', '.....AAAAAA.....', '....AAAAAAAA....', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...',
         '...AAAAAAAAAA...', '...AAAAAAAAAA...', '....AAAAAAAA....', '.....AAAAAA.....']
D['COMPASS'] = (ROUND, {'A': IR}, {'f': '#c8c0a8', 'r': '#c0302a', 'k': '#4a4a52'},
                [(x, y, 'f') for y in range(4, 10) for x in range(5, 11)] + [(8, 4, 'r'), (8, 5, 'r'), (7, 6, 'r'), (7, 7, 'k'), (6, 8, 'k'), (6, 9, 'k')])
D['CLOCK'] = (ROUND, {'A': GO}, {'d': '#6fa8dc', 'n': '#1c2448', 's': '#f4d060', 'm': '#e8e8f0'},
              [(x, y, 'd') for y in range(4, 7) for x in range(5, 11)] + [(x, y, 'n') for y in range(7, 10) for x in range(5, 11)] + [(7, 5, 's'), (8, 5, 's'), (8, 8, 'm')])
D['SPYGLASS'] = (['................', '............GG..', '...........GGGG.', '..........CCGG..', '.........CCC....', '........CCC.....', '.......CCC......', '......CCC.......',
                  '.....CCC........', '....CCC.........', '...CCC..........', '..CCC...........', '..CC............'], {'C': RR['carrot'] if False else ramp_from('#c4714f'), 'G': RR['glass']})
D['NETHERITE_SCRAP'] = (LUMP, {'H': ramp_from('#5e4a46')}, {'w': '#a08a84'}, [(6, 6, 'w')])
D['NETHERITE_INGOT'] = (INGOT, {'F': R['netherite'], 'T': [R['netherite'][0], R['netherite'][2], R['netherite'][3], R['netherite'][4], '#b0a4a4'], 'S': [R['netherite'][0], R['netherite'][0], R['netherite'][1], R['netherite'][1], R['netherite'][2]]})
D['CAMPFIRE'] = (['................', '.......f........', '......ff..f.....', '.....fyf.ff.....', '.....fyyfyf.....', '....fyyyyyff....', '....fyyyyyyf....', '...LLLfyyfLLL...',
                  '..LLLLLLLLLLLL..', '...BBBBBBBBBB...', '..LLLLLLLLLLLL..', '...LLL....LLL...'], {'L': W, 'B': ramp_from('#3a3a3e')}, {'f': '#f08a2a', 'y': '#ffd870'})

# ---- 第 3 回：建材・飾り ----
TRAP = ['................', '.AAAAAAAAAAAAAA.', '.AAAAAAAAAAAAAA.', '.AA..AAAA..AAAA.', '.AA..AAAA..AAAA.', '.AAAAAAAAAAAAAA.', '.AAAAAAAAAAAAAA.', '.AA..AAAA..AAAA.',
        '.AA..AAAA..AAAA.', '.AAAAAAAAAAAAAA.', '.AAAAAAAAAAAAAA.', '.AA..AAAA..AAAA.', '.AA..AAAA..AAAA.', '.AAAAAAAAAAAAAA.', '.AAAAAAAAAAAAAA.']
GATE = ['................', '................', '.P............P.', '.P............P.', '.PAAAAAAAAAAAAP.', '.PAAAAAAAAAAAAP.', '.P.....AA.....P.', '.P.....AA.....P.',
        '.PAAAAAAAAAAAAP.', '.PAAAAAAAAAAAAP.', '.P............P.', '.P............P.', '.P............P.']
WOODC = {'OAK': '#a5824f', 'SPRUCE': '#73563a', 'ACACIA': '#aa5a32', 'BIRCH': '#c9b783', 'JUNGLE': '#a2734f'}
for w, c in WOODC.items():
    D[w + '_TRAPDOOR'] = (TRAP, {'A': ramp_from(c)})
    D[w + '_FENCE_GATE'] = (GATE, {'A': ramp_from(c), 'P': ramp_from(c)})
D['IRON_TRAPDOOR'] = ([r.replace('.', 'A') if 0 < i < 15 and r[1] == 'A' else r for i, r in enumerate(TRAP)], {'A': IR})
D['SIGN'] = (['................', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAkkAkkkAkAA..', '..AAAAAAAAAAAA..', '..AAkkkAkkAkAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..',
              '.......SS.......', '.......SS.......', '.......SS.......', '.......SS.......', '.......SS.......', '.......SS.......'], {'A': W, 'S': H}, {'k': '#3a2a1a'})
D['ITEM_FRAME'] = (['................', '.AAAAAAAAAAAAAA.', '.AAAAAAAAAAAAAA.', '.AABBBBBBBBBBAA.', '.AABBBBBBBBBBAA.', '.AABBBBBBBBBBAA.', '.AABBBBBBBBBBAA.', '.AABBBBBBBBBBAA.',
                   '.AABBBBBBBBBBAA.', '.AABBBBBBBBBBAA.', '.AABBBBBBBBBBAA.', '.AABBBBBBBBBBAA.', '.AABBBBBBBBBBAA.', '.AAAAAAAAAAAAAA.', '.AAAAAAAAAAAAAA.'], {'A': W, 'B': LE})
D['PAINTING'] = (D['ITEM_FRAME'][0], {'A': W, 'B': ramp_from('#7ab0e0')}, {'g': '#5a9a48', 'm': '#e8eef4', 'r': '#8a8a96'},
                 [(x, y, 'g') for y in range(10, 13) for x in range(3, 13)] + [(x, y, 'r') for y in range(6, 10) for x in range(4, 12) if abs(x - 7.5) < (y - 4)] + [(7, 6, 'm'), (8, 6, 'm'), (7, 7, 'm')])
BANNER = ['....SSSSSSSS....', '...SSSSSSSSSS...', '....AAAAAAAA....', '....AAAAAAAA....', '....AAAAAAAA....', '....AAAAAAAA....', '....AAAAAAAA....', '....AAAAAAAA....',
          '....AAAAAAAA....', '....AAAAAAAA....', '....AAAAAAAA....', '....AAAAAAAA....', '.....AAAAAA.....', '......AAAA......', '.......SS.......', '.......SS.......']
BCOL = dict([('WHITE', '#e9ecec')] + [(k, v) for k, v in [('ORANGE', '#e0761a'), ('MAGENTA', '#b44cb4'), ('LIGHT_BLUE', '#3aa8d8'), ('YELLOW', '#f0c434'), ('LIME', '#70ba1c'), ('PINK', '#ec8aa8'),
        ('GRAY', '#3e4448'), ('LIGHT_GRAY', '#8e8e86'), ('CYAN', '#158a92'), ('PURPLE', '#7a2aa8'), ('BLUE', '#343c9c'), ('GREEN', '#546c1c'), ('RED', '#a42620'), ('BLACK', '#18181c'), ('BROWN', '#72482a')]])
for k, c in BCOL.items():
    D[k + '_BANNER'] = (BANNER, {'A': ramp_from(c), 'S': H})
D['BROWN_DYE'] = (DYE, {'A': ramp_from('#72482a')}, {'s': ramp_from('#72482a')[4]}, [(6, 5, 's'), (9, 7, 's'), (5, 9, 's'), (10, 10, 's')])
D['COCOA_BEANS'] = (['................', '................', '...AAA..........', '..AAAAA.........', '..AAAAA...AAA...', '..AAAAA..AAAAA..', '...AAA...AAAAA..', '.........AAAAA..',
                     '....AAA..AAAAA..', '...AAAAA..AAA...', '...AAAAA........', '...AAAAA........', '....AAA.........'], {'A': ramp_from('#7a4a26')})
D['NETHER_STAR'] = (['................', '.......A........', '.......A........', '......AAA.......', '..A..AAAAA..A...', '...AAAAAAAAA....', '....AAAAAAA.....', '....AAAAAAA.....',
                     '...AAAAAAAAA....', '..A..AAAAA..A...', '......AAA.......', '.......A........', '.......A........'], {'A': ['#5a5a70', '#c8c8e0', '#eaeaf8', '#f8f8ff', '#ffffff']}, {'y': '#f0e080'}, [(7, 7, 'y')])
D['SHELL'] = (['................', '................', '...AAAAAAAAA....', '..AAAAAAAAAAA...', '..ABABABABABA...', '..AAAAAAAAAAA...', '..ABABABABABA...', '..AAAAAAAAAAA...',
               '...AAAAAAAAA....', '................'], {'A': ramp_from('#9a72aa'), 'B': ramp_from('#6a4a7a')})
ROCKET = ['................', '................', '.........kk.....', '........RRRk....', '.......RRRRR....', '......RRRRR.....', '.....RRRRR......', '....RRRRR.......',
          '.....RRR........', '....S...........', '...S............', '..S.............', '.S..............']
D['FIREWORK_ROCKET'] = (ROCKET, {'R': ramp_from('#c8302a'), 'S': H}, {'k': '#e8e0c8'})
D['FIREWORK_ROCKET_COLOR'] = (ROCKET, {'R': ramp_from('#c8302a'), 'S': H}, {'k': '#ffd040', 'b': '#60c0ff', 'g': '#80f070'}, [(9, 2, 'b'), (10, 2, 'g')])
