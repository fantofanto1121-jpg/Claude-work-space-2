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
WOODC = {'OAK': '#a5824f', 'SPRUCE': '#73563a', 'ACACIA': '#aa5a32', 'BIRCH': '#c9b783', 'JUNGLE': '#a2734f', 'CHERRY': '#e2b4ac', 'MANGROVE': '#7a3632'}
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

# ---- 第 4 回：生き物の卵と、新しいアイテム ----
EGGS4 = {'HORSE': ('#8a5a32', '#e8d8b0'), 'DONKEY': ('#8a7a6a', '#4a3e34'), 'CAMEL': ('#d0ac72', '#8a6a3a'), 'CAT': ('#e8c890', '#8a6a4a'), 'FOX': ('#e07a30', '#f0e8e0'),
         'GOAT': ('#e8e4d8', '#8a8070'), 'TURTLE': ('#3a6a3a', '#a8d0a0'), 'BEE': ('#f0c030', '#2a2418'), 'FISH': ('#a49476', '#e8a050'), 'PARROT': ('#d83a2a', '#3a6ad8'),
         'PANDA': ('#f2f2ee', '#202020'), 'POLAR_BEAR': ('#f2f2ec', '#b8b8b0'), 'DROWNED': ('#5a8a8a', '#8ac0b8'), 'HUSK': ('#8a7650', '#c8b07a'), 'PILLAGER': ('#4a4a52', '#a89a8a'),
         'NIGHT_RAY': ('#3a4a7a', '#80f080'), 'EYE_FISH': ('#5a9a8a', '#e8a050'), 'DEEP_WARDEN': ('#203840', '#60f0f0'), 'PIGLIN': ('#e8a898', '#e8c040'), 'HOGLIN': ('#9a6a4a', '#f0e8d0'),
         'STRIDER': ('#b04a3a', '#5a2a24'), 'FIRE_SPIRIT': ('#f0c040', '#e8901a'), 'WAILER': ('#eceae6', '#b8d8e8'), 'DARK_SKELETON': ('#262628', '#5a5a60'), 'SHADOW': ('#181818', '#c060e8'),
         'SHELL_GUARD': ('#9a7aaa', '#e8e0a0'), 'END_DRAGON': ('#1c1c22', '#c060f0'), 'SKULL_BOSS': ('#262628', '#e0e0f0')}
for k, (a, b) in EGGS4.items():
    D['SPAWN_EGG_' + k] = (EGG, {'A': ramp_from(a), 'B': ramp_from(b)}, {}, [], [(x, y, 'B') for x, y in SPOTS])
D['HONEY_BOTTLE'] = (['................', '.......NN.......', '.......NN.......', '......GGGG......', '......GHHG......', '.....GHHHHG.....', '....GHHHHHHG....', '...GHHHHHHHHG...',
                      '...GHHHHHHHHG...', '...GHHHHHHHHG...', '....GHHHHHHG....', '.....GGGGGG.....'], {'G': RR['glass'], 'H': ramp_from('#e8a020'), 'N': W})
D['HONEYCOMB'] = (['................', '................', '.....AAAAA......', '....AABAABA.....', '...AABAAABAA....', '...ABAAABAAAA...', '...AAABAAABAA...', '...AABAAABAA....',
                   '....AAABAAA.....', '.....AAAAA......'], {'A': ramp_from('#e8a828'), 'B': ramp_from('#b07818')})
D['PHANTOM_MEMBRANE'] = (['................', '................', '..AA........AA..', '..AAAA....AAAA..', '...AAAAAAAAAA...', '....AAAAAAAA....', '....AAAAAAAA....', '...AAAAAAAAAA...',
                          '..AAAA....AAAA..', '..AA........AA..'], {'A': ramp_from('#c8c0b0')})
D['PRISMARINE_SHARD'] = (['................', '..........AA....', '.........AAAA...', '........AAAA....', '.......AAAA.....', '......AAAA......', '.....AAAA.......', '....AAAA........',
                          '...AAAA.........', '...AAA..........', '....A...........'], {'A': ramp_from('#5aa898')})
D['SHADOW_PEARL'] = (SLIMEBALL if 'SLIMEBALL' in dir() else ROUND, {'A': ramp_from('#2a6a62')}, {'w': '#a8f0e0', 'k': '#0a2a28'}, [(5, 5, 'w'), (6, 4, 'w'), (9, 8, 'k'), (8, 9, 'k')])

# ---- 第 5 回：地形と植物のアイテム ----
D['MELON_SLICE'] = (['................', '................', '................', '..A.............', '..AB............', '..ABB...........', '..ABBB..........', '..ABkBB.........',
                     '..ABBBBB........', '..ABBkBBB.......', '..ABBBBBBB......', '..ABkBBBkBB.....', '..ABBBBBBBBB....', '..GAAAAAAAAAA...', '...GGGGGGGGGGG..'],
                    {'A': ramp_from('#c8e080'), 'B': ramp_from('#e0403a'), 'G': ramp_from('#3a8a2a')}, {'k': '#201810'})
SEEDS5 = ['................', '................', '................', '.....A..........', '....AA....A.....', '....AA...AA.....', '.....A...AA.....', '.........A......',
          '...A............', '..AA.....A......', '..AA....AA......', '...A....AA......', '.........A......']
D['PUMPKIN_SEEDS'] = (SEEDS5, {'A': ramp_from('#e8dca0')})
D['MELON_SEEDS'] = (SEEDS5, {'A': ramp_from('#3a2a1e')})
D['AMETHYST_SHARD'] = (['................', '................', '.........A......', '........AAA.....', '....A...AAB.....', '...AAA..AAB.....', '...AAB.AAAB.....', '...AAB.AAB......',
                        '...AAB.AAB..A...', '....AB.AAB.AAB..', '....AABAAB.AAB..', '.....AAABBAAB...', '......AAAAAB....', '.......BBBB.....'],
                       {'A': ramp_from('#b07ad8'), 'B': ramp_from('#6a3a9a')}, {'w': '#f0d8ff'}, [(9, 3, 'w'), (4, 5, 'w'), (12, 9, 'w')])
D['DRIED_KELP'] = (['................', '................', '............AA..', '...........ABA..', '..........ABA...', '.........ABA....', '........ABA.....', '.......ABA......',
                    '......ABA.......', '.....ABA........', '....ABA.........', '...ABA..........', '..ABA...........', '..AA............'],
                   {'A': ramp_from('#4a5a2a'), 'B': ramp_from('#6a7a3a')})

# ---- 第 6 回：影の目 ----
D['ENDER_EYE'] = (['................', '................', '.....AAAAAA.....', '....AAAAAAAA....', '...AAABBBBAAA...', '..AAABBCCBBAAA..', '..AABBCkkCBBAA..', '..AABBCkkCBBAA..',
                   '..AAABBCCBBAAA..', '...AAABBBBAAA...', '....AAAAAAAA....', '.....AAAAAA.....'], {'A': ramp_from('#2a6a5a'), 'B': ramp_from('#5aa868'), 'C': ramp_from('#c8e8a0')}, {'k': '#0a1a14', 'w': '#f0fff0'}, [(5, 4, 'w')])

# ---- レッドストーンの見直し ----
D['DETECTOR_RAIL'] = (railrows(IR, True), {'R': IR, 'T': W}, {'m': '#8a8a90'})
D['ACTIVATOR_RAIL'] = (railrows(ramp_from('#a8443a'), True), {'R': ramp_from('#a8443a'), 'T': W}, {'m': '#d03a2a'})
D['TRIPWIRE_HOOK'] = (['................', '................', '.......AA.......', '......A..A......', '......A..A......', '.......AA.......', '........B.......', '........B.......',
                       '........B.......', '.......WWW......', '.......WWW......', '.......WWW......', '.......WWW......', '.......WWW......', '................'],
                      {'A': ramp_from('#b8b8c0'), 'B': ramp_from('#8a8a90'), 'W': W})

# ---- 第 A2 回：足りなかったアイテム ----
from defs2 import APPLE, BOWL, BOTTLE, bottle
D['EGG'] = (['................', '................', '................', '.......AA.......', '......AAAA......', '.....AAAAAA.....', '.....AAAAAA.....', '....AAAAAAAA....',
             '....AAAAAAAA....', '....AAAAAAAA....', '....AAAAAAAA....', '.....AAAAAA.....', '......AAAA......'], {'A': ramp_from('#e6d8bc')}, {'s': '#b89a70', 'w': '#ffffff'},
            [(9, 8, 's'), (6, 10, 's'), (8, 11, 's'), (6, 5, 'w')])
D['CAKE'] = (['................', '................', '................', '.......w..w.....', '....CCCCCCCCC...', '...CCCCCCCCCCC..', '..CCCCCCCCCCCCC.', '..CCCCCCCCCCCCC.',
              '..cSSSSSSSSSSSc.', '..SSSSSSSSSSSSS.', '..JJJJJJJJJJJJJ.', '..SSSSSSSSSSSSS.', '..SSSSSSSSSSSSS.', '...SSSSSSSSSSS..'],
             {'C': ramp_from('#f2ece2'), 'S': ramp_from('#d29456'), 'J': ramp_from('#c42c28')}, {'w': '#d83a34', 'c': '#f2ece2'},
             [(5, 5, 'w'), (8, 6, 'w'), (11, 5, 'w'), (12, 7, 'w')])
D['PUMPKIN_PIE'] = (['................', '................', '................', '................', '.....CCCCCC.....', '...CCPPPPPPCC...', '..CPPPPPPPPPPC..', '..CPPPPPPPPPPC..',
                     '..CPPPPPPPPPPC..', '...CCPPPPPPCC...', '.....CCCCCC.....'], {'C': ramp_from('#c8904a'), 'P': ramp_from('#d8782a')}, {'d': '#a85418'},
                    [(6, 6, 'd'), (9, 7, 'd'), (7, 8, 'd'), (10, 5, 'd')])
D['COOKIE'] = (['................', '................', '................', '......AAAA......', '....AAAAAAAA....', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '..AAAAAAAAAAAA..',
                '..AAAAAAAAAAAA..', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '....AAAAAAAA....', '......AAAA......'], {'A': ramp_from('#c88a46')}, {'k': '#4a2a14', 'h': '#6a3e1e'},
               [(5, 5, 'k'), (9, 4, 'k'), (7, 7, 'k'), (11, 8, 'k'), (5, 9, 'k'), (9, 10, 'k'), (6, 6, 'h'), (10, 9, 'h')])
BEET = ['........L.L.....', '.......LLLLL....', '........LLL.....', '.........S......', '.......AAAA.....', '......AAAAAA....', '.....AAAAAAAA...', '.....AAAAAAAA...',
        '.....AAAAAAAA...', '......AAAAAA....', '.......AAAA.....', '........AA......', '.........A......']
D['BEETROOT'] = (BEET, {'A': ramp_from('#a82440'), 'L': RR['leaf'], 'S': ramp_from('#a82440')}, {'w': '#e86880'}, [(7, 5, 'w'), (6, 6, 'w')])
D['BEETROOT_SEEDS'] = (['................', '................', '................', '.....AA.........', '....AAA....AA...', '....AA....AAA...', '..........AA....', '...AA...........',
                        '..AAA.....AA....', '..AA.....AAA....', '.........AA.....', '.....AA.........', '....AAA.........', '....AA..........'], {'A': ramp_from('#b8a060')})
STEW = ['................', '................', '................', '................', '................', '...CCCCCCCCCC...', '..ACCCCCCCCCCA..', '..AAAAAAAAAAAA..',
        '...AAAAAAAAAA...', '....AAAAAAAA....', '.....AAAAAA.....']
D['BEETROOT_SOUP'] = (STEW, {'A': R['wood'], 'C': ramp_from('#9a1a2a')}, {'w': '#e85a70'}, [(5, 5, 'w'), (9, 5, 'w'), (7, 6, 'w')])
D['RABBIT_STEW'] = (STEW, {'A': R['wood'], 'C': ramp_from('#b07a3e')}, {'o': '#ec8426', 'p': '#e8c890', 'm': '#7a5034', 'g': '#5a9a3a'},
                    [(4, 5, 'o'), (6, 5, 'p'), (8, 5, 'm'), (10, 5, 'o'), (11, 6, 'g'), (5, 6, 'm'), (7, 6, 'p'), (9, 6, 'g')])
for fk, fc in [('POPPY', '#c4342c'), ('DANDELION', '#f0c838')]:
    D['SUSPICIOUS_STEW_' + fk] = (STEW, {'A': R['wood'], 'C': ramp_from('#a87a52')}, {'f': fc, 'r': '#c42a24', 'b': '#7a5034', 'g': '#5a9a3a'},
                                  [(5, 5, 'r'), (7, 5, 'f'), (8, 5, 'f'), (10, 5, 'b'), (7, 6, 'g'), (4, 6, 'b'), (11, 6, 'r')])
D['SWEET_BERRIES'] = (['................', '........LL......', '.......LLLL.....', '........S.......', '.......S.S......', '......S...S.....', '....AAA...AAA...', '...AAAAA.AAAAA..',
                       '...AAAAA.AAAAA..', '...AAAAA.AAAAA..', '....AAA...AAA...', '.......AAA......', '......AAAAA.....', '......AAAAA.....', '.......AAA......'],
                      {'A': ramp_from('#c82838'), 'L': RR['leaf'], 'S': ramp_from('#4a6a2a')}, {'w': '#ff9aa0'}, [(4, 7, 'w'), (10, 7, 'w'), (7, 12, 'w')])
D['ENCHANTED_GOLDEN_APPLE'] = (APPLE, {'A': R['gold'], 'S': R['handle'], 'L': RR['leaf']}, {'w': '#ffffff', 'p': '#d8a0ff'},
                               [(4, 4, 'w'), (4, 5, 'w'), (9, 6, 'p'), (6, 9, 'p'), (11, 9, 'p'), (8, 11, 'p')])
D['TOTEM_OF_UNDYING'] = (['................', '.....AAAAAA.....', '....AAAAAAAA....', '....AeAAAAeA....', '....AAAAAAAA....', '.....AAgAAA.....', '..GGGGGGGGGGGG..', '..G.GGGGGGGG.G..',
                          '....GGGGGGGG....', '....GGGeGGGG....', '.....GGGGGG.....', '.....GG..GG.....', '.....GG..GG.....', '....GGG..GGG....'],
                         {'A': R['gold'], 'G': R['gold']}, {'e': '#1a8a3e', 'g': '#4a3208'}, [(6, 3, 'e'), (10, 3, 'e'), (7, 9, 'e'), (8, 9, 'e')])
ARROW_ROWS = ['................', '............HH..', '...........HHHH.', '............HHH.', '..........S.H...', '.........S......', '........S.......', '.......S........',
              '......S.........', '.....S..........', '.FF.S...........', '.FFS............', '..FF............', '.F.F............']
D['SPECTRAL_ARROW'] = (ARROW_ROWS, {'H': ramp_from('#f0c838'), 'S': R['handle'], 'F': ramp_from('#f6e6a0')}, {'w': '#fffbe0'}, [(12, 2, 'w')])
D['DRAGON_BREATH'] = (bottle(True), {'G': RR['glass'], 'N': R['wood'], 'L': ramp_from('#c86ae0')}, {'w': '#ffffff', 'p': '#f4c8ff'}, [(5, 7, 'w'), (8, 8, 'p'), (7, 10, 'p')])
D['SCUTE'] = (['................', '................', '................', '.....AAAAAA.....', '....AAAAAAAA....', '...AABBAABBAA...', '...AAAAAAAAAA...', '...ABBAAAABBA...',
               '...AAAAAAAAAA...', '....AABBBBAA....', '.....AAAAAA.....', '......AAAA......'], {'A': ramp_from('#4cae3c'), 'B': ramp_from('#2e7a2a')})
D['TURTLE_HELMET'] = (['................', '................', '.....AAAAAA.....', '...AAAAAAAAAA...', '..AABBAAAABBAA..', '..AAAAAAAAAAAA..', '.AABBAAAAAABBAA.', '.AAAAAAAAAAAAAA.',
                       '.AAA........AAA.', '.AA..........AA.', '.AA..........AA.', '..A..........A..'], {'A': ramp_from('#4cae3c'), 'B': ramp_from('#2e7a2a')})
D['EXPERIENCE_BOTTLE'] = (bottle(True, True), {'G': RR['glass'], 'N': R['wood'], 'L': ramp_from('#5ec83a')}, {'w': '#ffffff', 'y': '#e8ff80'},
                          [(5, 6, 'w'), (8, 7, 'y'), (6, 9, 'y'), (9, 10, 'y')])
D['FIRE_CHARGE'] = (['................', '................', '................', '......AAAA......', '....AAAAAAAA....', '....AAAAAAAA....', '...AAAAAAAAAA...', '...AAAAAAAAAA...',
                     '...AAAAAAAAAA...', '...AAAAAAAAAA...', '....AAAAAAAA....', '....AAAAAAAA....', '......AAAA......'], {'A': ramp_from('#3a2a22')}, {'o': '#f08a2a', 'y': '#ffd060', 'r': '#c8401a'},
                    [(5, 5, 'o'), (6, 5, 'y'), (9, 6, 'o'), (10, 7, 'r'), (6, 8, 'r'), (7, 9, 'o'), (8, 9, 'y'), (11, 9, 'o'), (5, 10, 'o'), (8, 11, 'r')])
D['ARMOR_STAND'] = (['.......WW.......', '.......WW.......', '...WWWWWWWWWW...', '...W..WWWW..W...', '...W...WW...W...', '...W...WW...W...', '.......WW.......', '......WWWW......',
                     '......W..W......', '......W..W......', '......W..W......', '......W..W......', '......W..W......', '..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..'], {'W': R['wood'], 'S': ramp_from('#9a9a96')})
BUNDLE = ['................', '.......SS.......', '......S..S......', '.....AAAAAA.....', '......AAAA......', '.....AAAAAA.....', '....AAAAAAAA....', '...AAAAAAAAAA...',
          '...AAAAAAAAAA...', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '...AAAAAAAAAA...', '....AAAAAAAA....']
D['BUNDLE'] = (BUNDLE, {'A': R['leather'], 'S': ramp_from('#e8e0c8')}, {'k': '#5a3418'}, [(6, 4, 'k'), (9, 4, 'k')])
D['BUNDLE_FILLED'] = (['................', '.......SS.......', '......S..S......', '.....AAAAAA.....', '....yAAAAgy.....', '....AAAAAAAA....', '...AAAAAAAAAA...', '..AAAAAAAAAAAA..',
                       '..AAAAAAAAAAAA..', '.AAAAAAAAAAAAAA.', '.AAAAAAAAAAAAAA.', '.AAAAAAAAAAAAAA.', '..AAAAAAAAAAAA..', '...AAAAAAAAAA...'],
                      {'A': R['leather'], 'S': ramp_from('#e8e0c8')}, {'k': '#5a3418', 'y': '#e8c540', 'g': '#5ad67a'}, [(6, 4, 'k'), (9, 3, 'k')])
D['GOAT_HORN'] = (['................', '................', '...........AA...', '..........AAAA..', '.........AAAAA..', '........AAAA....', '.......AAA......', '......AAA.......',
                   '.....AAA........', '....AAA.........', '...AAA..........', '..AAA...........', '..AA............', '..A.............'], {'A': ramp_from('#c8bc9e')}, {'r': '#8a7e66'},
                  [(10, 4, 'r'), (8, 6, 'r'), (6, 8, 'r'), (4, 10, 'r')])
ROUND2 = ['................', '................', '.....AAAAAA.....', '....AAAAAAAA....', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...',
          '...AAAAAAAAAA...', '...AAAAAAAAAA...', '....AAAAAAAA....', '.....AAAAAA.....']
D['RECOVERY_COMPASS'] = (ROUND2, {'A': ramp_from('#2a4a50')}, {'f': '#14282c', 'c': '#5ae0d0', 'k': '#3a4a50', 'p': '#a888e8'},
                         [(x, y, 'f') for y in range(4, 10) for x in range(5, 11)] + [(8, 4, 'c'), (8, 5, 'c'), (7, 6, 'c'), (7, 7, 'k'), (6, 8, 'k'), (6, 9, 'k'), (3, 4, 'p'), (12, 4, 'p'), (3, 9, 'p'), (12, 9, 'p')])
DISC = ['................', '.....AAAAAA.....', '...AAAAAAAAAA...', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '.AAAAALLLLAAAAA.', '.AAAALLLLLLAAAA.', '.AAAALLkkLLAAAA.',
        '.AAAALLkkLLAAAA.', '.AAAALLLLLLAAAA.', '.AAAAALLLLAAAAA.', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '...AAAAAAAAAA...', '.....AAAAAA.....']
for dk, lc in [('MEADOW', '#7ac850'), ('DRIP', '#4a8ad8'), ('FORGE', '#e0602a'), ('STARS', '#b878e8'), ('MARKET', '#e8c040')]:
    D['MUSIC_DISC_' + dk] = (DISC, {'A': ramp_from('#26262c'), 'L': ramp_from(lc)}, {'k': '#0a0a0c', 'g': '#4a4a56'}, [(4, 3, 'g'), (3, 4, 'g'), (11, 12, 'g'), (12, 11, 'g')])

# ---- 第 A3 回：大釜・避雷針 ----
D['CAULDRON'] = (['................', '................', '.AAAAAAAAAAAAAA.', '.AkkkkkkkkkkkkA.', '.AAAAAAAAAAAAAA.', '.AAAAAAAAAAAAAA.', '.AAAAAAAAAAAAAA.', '.AAAAAAAAAAAAAA.',
                  '.AAAAAAAAAAAAAA.', '.AAAAAAAAAAAAAA.', '..AAAAAAAAAAAA..', '..AAA......AAA..', '..AA........AA..', '..AA........AA..'], {'A': ramp_from('#4a4a52')}, {'k': '#141418', 'r': '#8a8a94'},
                [(3, 6, 'r'), (12, 6, 'r'), (3, 9, 'r'), (12, 9, 'r')])
D['LIGHTNING_ROD'] = (['................', '......AAAA......', '......AAAA......', '......AAAA......', '......AAAA......', '.......AA.......', '.......AA.......', '.......AA.......',
                       '.......AA.......', '.......AA.......', '.......AA.......', '.......AA.......', '.......AA.......', '.......AA.......', '.......AA.......'], {'A': ramp_from('#c8744e')}, {'w': '#ffd8b8'}, [(6, 1, 'w')])

# ---- 第 A4 回：邪悪な村人のスポーンエッグ・こだまの欠片 ----
for k, (a, b) in {'VINDICATOR': ('#959b9b', '#275e61'), 'EVOKER': ('#959b9b', '#1e1c1a'), 'VEX': ('#7a90a4', '#e8edf1')}.items():
    D['SPAWN_EGG_' + k] = (EGG, {'A': ramp_from(a), 'B': ramp_from(b)}, {}, [], [(x, y, 'B') for x, y in SPOTS])
D['ECHO_SHARD'] = (['................', '..........A.....', '.........AAA....', '........AAAA....', '.......AAAAA....', '......AAAAA.....', '.....AAAAA......', '....AAAAA.......',
                    '...AAAAA........', '...AAAA.........', '....AA..........'], {'A': ramp_from('#14505a')}, {'w': '#8af0f0', 'k': '#0a2a30'}, [(9, 3, 'w'), (6, 7, 'w'), (8, 5, 'k')])

# ---- 追加：襲撃・宝・考古学・試練の間 ----
for k, (a, b) in {'RAVAGER': ('#5c5a58', '#a8a49a'), 'WIND_SPIRIT': ('#b8d4e4', '#6a8aa8')}.items():
    D['SPAWN_EGG_' + k] = (EGG, {'A': ramp_from(a), 'B': ramp_from(b)}, {}, [], [(x, y, 'B') for x, y in SPOTS])
D['BRUSH'] = (['................', '..........FFF...', '.........FFFFF..', '.........FFFF...', '........CCFF....', '.......CC.......', '......S.........', '.....S..........',
               '....S...........', '...S............', '..S.............', '.S..............'], {'F': ramp_from('#e8e0cc'), 'C': ramp_from('#c8744e'), 'S': R['handle']})
SHERD = ['................', '................', '...AAAAAAAA.....', '..AAAAAAAAAAA...', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAA...', '..AAAAAAAAAAA...',
         '...AAAAAAAAAA...', '...AAAAAAAAA....', '....AAAAAAA.....', '......AAA.......']
for k, pts in [('BOW', [(5, 4), (6, 5), (7, 6), (8, 7), (9, 8), (5, 8), (9, 4)]), ('HEART', [(5, 5), (6, 5), (8, 5), (9, 5), (5, 6), (6, 6), (7, 6), (8, 6), (9, 6), (6, 7), (7, 7), (8, 7), (7, 8)]),
               ('SKULL', [(6, 4), (7, 4), (8, 4), (5, 5), (9, 5), (6, 6), (8, 6), (5, 7), (9, 7), (6, 8), (7, 8), (8, 8)]), ('WAVE', [(3, 6), (4, 5), (5, 5), (6, 6), (7, 7), (8, 7), (9, 6), (10, 5), (11, 5), (4, 9), (5, 8), (6, 8), (7, 9), (8, 10), (9, 10), (10, 9)])]:
    D['POTTERY_SHERD_' + k] = (SHERD, {'A': ramp_from('#a0593a')}, {'k': '#4a2414'}, [(x, y, 'k') for x, y in pts])
D['TRIAL_KEY'] = (['................', '..........AAA...', '.........A...A..', '.........A.k.A..', '.........A...A..', '........AAAAA...', '.......AA.......', '......AA........',
                   '.....AA.........', '....AAAA........', '...AA.A.........', '...A............'], {'A': ramp_from('#c89040')}, {'k': '#ff9a3a'})
D['WIND_ROD'] = (['................', '.............A..', '............AA..', '...........AA...', '..........AA....', '.........AA.....', '........AA......', '.......AA.......',
                  '......AA........', '.....AA.........', '....AA..........', '...AA...........', '..A.............'], {'A': ramp_from('#b8d4e4')}, {'w': '#ffffff'}, [(12, 2, 'w'), (8, 6, 'w'), (4, 10, 'w')])
D['WIND_CHARGE'] = (['................', '................', '.....AAAAA......', '....AAAAAAA.....', '...AAAAAAAAA....', '...AAAAAAAAA....', '...AAAAAAAAA....', '...AAAAAAAAA....',
                     '....AAAAAAA.....', '.....AAAAA......'], {'A': ramp_from('#c8dcec')}, {'s': '#7a9ab8'}, [(5, 4, 's'), (6, 4, 's'), (7, 5, 's'), (8, 6, 's'), (7, 7, 's'), (6, 7, 's')])
D['HEART_OF_THE_SEA'] = (['................', '................', '.....AAAAAA.....', '....AAAAAAAA....', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...',
                          '....AAAAAAAA....', '.....AAAAAA.....'], {'A': ramp_from('#2a7ab8')}, {'c': '#7ae8f0', 'k': '#d8c890'},
                         [(6, 5, 'c'), (7, 5, 'c'), (6, 6, 'c'), (7, 6, 'k'), (8, 6, 'k'), (8, 7, 'k'), (9, 7, 'k')])
D['NAUTILUS_SHELL'] = (['................', '................', '.....AAAAA......', '...AAAAAAAA.....', '..AAAAAAAAAA....', '..AAAkkkAAAA....', '..AAkAAAkAAA....', '..AAAkkAkAAA....',
                        '...AAAAkAAA.....', '....AAAAAA......', '.......AAAA.....'], {'A': ramp_from('#e8d8c0')}, {'k': '#b05a3a'})
D['TREASURE_MAP'] = (PAPER, {'A': ramp_from('#e0cc98')}, {'x': '#a8231c', 'l': '#8a7a5a'}, [(x, y, 'l') for y in (4, 11) for x in range(4, 12)] + [(7, 7, 'x'), (8, 8, 'x'), (8, 7, 'x'), (7, 8, 'x'), (6, 6, 'x'), (9, 9, 'x'), (9, 6, 'x'), (6, 9, 'x')])
D['CONDUIT'] = (['................', '................', '................', '.....AAAAAA.....', '....AACCCCAA....', '....ACCDDCCA....', '....ACDDDDCA....', '....ACDDDDCA....',
                 '....ACCDDCCA....', '....AACCCCAA....', '.....AAAAAA.....'], {'A': ramp_from('#c8a870'), 'C': ramp_from('#4a7a9a'), 'D': ramp_from('#7ae8f0')})
D['DECORATED_POT'] = (['................', '......AAAA......', '.....AAAAAA.....', '......AAAA......', '....AAAAAAAA....', '...AAAAAAAAAA...', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..',
                       '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '...AAAAAAAAAA...', '....AAAAAAAA....'], {'A': ramp_from('#9a5438')}, {'k': '#4a2414'},
                      [(5, 7, 'k'), (6, 8, 'k'), (7, 7, 'k'), (8, 8, 'k'), (9, 7, 'k'), (10, 8, 'k')])

# ---- ロードマップ 第 1 段階：新しい動物の卵 ----
for k, (a, b) in {'LLAMA': ('#e0cca4', '#8a6448'), 'AXOLOTL': ('#f0a8c0', '#a84870'), 'FROG': ('#c8783a', '#f0d8a8'), 'TADPOLE': ('#5a4632', '#2a2016'), 'MUSHROOM_COW': ('#a8282a', '#e8e0d4')}.items():
    D['SPAWN_EGG_' + k] = (EGG, {'A': ramp_from(a), 'B': ramp_from(b)}, {}, [], [(x, y, 'B') for x, y in SPOTS])

# ---- ロードマップ 第 2 段階：じゅうたんと色付きのベッド ----
import defs3 as _d3
from defs2 import D as _D2
_C16 = {'WHITE': '#e9ecec', 'ORANGE': '#e0761a', 'MAGENTA': '#b44cb4', 'LIGHT_BLUE': '#3aa8d8', 'YELLOW': '#f0c434', 'LIME': '#70ba1c', 'PINK': '#ec8aa8', 'GRAY': '#3e4448',
        'LIGHT_GRAY': '#8e8e86', 'CYAN': '#158a92', 'PURPLE': '#7a2aa8', 'BLUE': '#343c9c', 'GREEN': '#546c1c', 'RED': '#a42620', 'BLACK': '#18181c', 'BROWN': '#72482a'}
for _k, _c in _C16.items():
    _d3.RR['carpet_' + _k] = ramp_from(_c)
    D[_k + '_CARPET'] = _d3.block_item([(0.02, 0, 0.02, 0.98, 0.1, 0.98, 'T', 'L', 'R')], 'carpet_' + _k)
    if _k != 'WHITE':
        _b = _D2['BED']
        D[_k + '_BED'] = (_b[0], dict(_b[1], R=ramp_from(_c)), _b[2], _b[3])

# ---- ロードマップ 第 4 段階：光るベリー・鍾乳石 ----
D['GLOW_BERRIES'] = (['................', '.......SS.......', '......S..S......', '.....S....S.....', '....AA....AA....', '...AAAA..AAAA...', '...AAAA..AAAA...', '....AA....AA....',
                      '.......SS.......', '......S..S......', '.....AA..AA.....', '....AAAA.AAAA...', '....AAAA.AAAA...', '.....AA...AA....'], {'A': ramp_from('#f0a030'), 'S': ramp_from('#4e7a2a')}, {'w': '#fff0b0'}, [(4, 5, 'w'), (9, 5, 'w'), (5, 11, 'w')])
D['POINTED_DRIPSTONE'] = (['................', '......AAAA......', '......AAAA......', '.......AAA......', '.......AAA......', '.......AA.......', '.......AA.......', '.......AA.......',
                           '........A.......', '........A.......', '........A.......', '................'], {'A': ramp_from('#866b5c')})

# ---- ロードマップ 第 5 段階：砥石・傷んだ金床・花火の星 ----
D['GRINDSTONE'] = (['................', '....RRRRRRRR....', '...RSSSSSSSSR...', '..RSSSSSSSSSSR..', '..RSSSSSSSSSSR..', '.WRSSSSaaSSSSRW.', '.WRSSSSaaSSSSRW.',
                    '.WRSSSSSSSSSSRW.', '.WWRSSSSSSSSRWW.', '.WW.RSSSSSSR.WW.', '.WW..RRRRRR..WW.', '.WW..........WW.', '.WW..........WW.', '.WW..........WW.', '.WW..........WW.'],
                   {'S': ramp_from('#a6a49e'), 'R': ramp_from('#6e6c68'), 'W': ramp_from('#4a3018')}, {'a': '#3a2e22'})
import defs3 as _d3x
for _k, _cr in [('CHIPPED_ANVIL', [(5, 3), (6, 4), (6, 5), (10, 4)]), ('DAMAGED_ANVIL', [(4, 3), (5, 4), (6, 5), (7, 5), (10, 3), (11, 4), (9, 9), (8, 10), (12, 6)])]:
    _a = _d3x.D['ANVIL']
    D[_k] = (_a[0], _a[1], dict(_a[2], k='#16161a'), list(_a[3]) + [(x, y, 'k') for x, y in _cr])
D['FIREWORK_STAR'] = (['................', '................', '................', '.......AA.......', '.....AAAAAA.....', '....AAAAAAAA....', '....AAAAAAAA....', '...AAAAAAAAAA...',
                       '...AAAAAAAAAA...', '....AAAAAAAA....', '....AAAAAAAA....', '.....AAAAAA.....', '.......AA.......'],
                      {'A': ramp_from('#4a4a50')}, {'r': '#e04040', 'y': '#f0d040', 'b': '#4080e0'}, [(6, 5, 'r'), (9, 6, 'y'), (5, 8, 'b'), (8, 9, 'r'), (10, 9, 'b'), (7, 7, 'y')])

# ---- ロードマップ 第 14 段階：新しい生き物のスポーンエッグと、光るイカスミ・古代の種・鎧のかけら・オオカミの鎧・輝く額縁 ----
for _k, (_a, _b) in {'DOLPHIN': ('#7a8a9a', '#c8d0d8'), 'GLOW_SQUID': ('#2a6a70', '#78f0d8'), 'OCELOT': ('#d8b050', '#5a3a1a'), 'MULE': ('#5a3a24', '#2a1a10'),
                     'ZOMBIE_HORSE': ('#4a6a3a', '#a8c898'), 'SKELETON_HORSE': ('#d8d6cc', '#8a887e'), 'TRADER_LLAMA': ('#e0cca4', '#3a5ab0'), 'CARRIER_SPIRIT': ('#7ac8f0', '#e0f4ff'),
                     'BIG_NOSE': ('#a84a32', '#5a8a3a'), 'ARMOR_ROLLER': ('#c89a88', '#7a5a4a'), 'COD': ('#a89a7a', '#d8d0b8'), 'SALMON': ('#b84a3a', '#5a6a5a'),
                     'PUFFERFISH': ('#e0b840', '#4a9ab0'), 'TROPICAL': ('#f08a20', '#f4f4f0')}.items():
    D['SPAWN_EGG_' + _k] = (EGG, {'A': ramp_from(_a), 'B': ramp_from(_b)}, {}, [], [(x, y, 'B') for x, y in SPOTS])
D['GLOW_INK_SAC'] = (['................', '................', '......AAAA......', '.....AAAAAA.....', '....AAAAAAAA....', '....AAAAAAAA....', '....AAAAAAAA....', '.....AAAAAA.....',
                      '......AAAA......', '.......AA.......', '......A..A......', '.....A....A.....'], {'A': ramp_from('#2a8a86')}, {'g': '#a8fff0'}, [(6, 3, 'g'), (5, 5, 'g'), (8, 4, 'g'), (9, 6, 'g'), (7, 7, 'g')])
D['TORCHFLOWER_SEEDS'] = (['................', '................', '................', '................', '......A.........', '.....AAA...A....', '......A...AAA...', '...........A....',
                           '....A...........', '...AAA....A.....', '....A....AAA....', '..........A.....'], {'A': ramp_from('#b07a3a')})
D['PITCHER_POD'] = (['................', '................', '.......SS.......', '......SS........', '.....AAAA.......', '....AAAAAA......', '....AAAAAAA.....', '....AAAAAAA.....',
                     '.....AAAAAA.....', '......AAAA......', '.......AA.......'], {'A': ramp_from('#4a8a90'), 'S': ramp_from('#6a9a4a')})
D['ROLL_SCUTE'] = (['................', '................', '.....AAAAAA.....', '....AAAAAAAA....', '...AAAAAAAAAA...', '...AABAABAAAA...', '...AAAAAAAAAA...', '....AAAAAAAA....',
                    '.....AAAAAA.....', '......AAAA......'], {'A': ramp_from('#c89a88'), 'B': ramp_from('#8a6858')})
D['WOLF_ARMOR'] = (['................', '................', '....AAAAAAAA....', '...AAAAAAAAAA...', '..AAABAAAABAAA..', '..AAAAAAAAAAAA..', '..AAABAAAABAAA..', '..AAAAAAAAAAAA..',
                    '...AA......AA...', '...AA......AA...', '...BB......BB...'], {'A': ramp_from('#b08878'), 'B': ramp_from('#7a5a4a')})
_f = D['ITEM_FRAME']
D['GLOW_ITEM_FRAME'] = (_f[0], dict(_f[1], A=ramp_from('#c8a040'), B=ramp_from('#3a5a54')), *_f[2:])

# ---- ロードマップ 第 15 段階：敵のスポーンエッグ ----
for _k, (_a, _b) in {'FROST_SKELETON': ('#b8c4c8', '#5a6a72'), 'BOG_SKELETON': ('#a8ae8a', '#5a7a3a'), 'STONE_MITE': ('#7a7a80', '#4a4a50'), 'SHADOW_MITE': ('#2a1a3a', '#c85af0'),
                     'PIGLIN_BRUTE': ('#2a2620', '#c8a030'), 'ROT_HOGLIN': ('#c8a098', '#6a8a4a'), 'CREAKING_TREE': ('#5a4a40', '#ff9a30'), 'ZOMBIE_VILLAGER': ('#5a7a4a', '#6a4a30'),
                     'ELDER_EYE_FISH': ('#c8c4b0', '#8a6a9a'), 'SNOW_GOLEM': ('#f2f6f8', '#e08a1a')}.items():
    D['SPAWN_EGG_' + _k] = (EGG, {'A': ramp_from(_a), 'B': ramp_from(_b)}, {}, [], [(x, y, 'B') for x, y in SPOTS])

# ---- ロードマップ 第 16 段階：ブロック ----
import defs3 as _d3c
_dr = _d3c.door(None, True)
D['COPPER_DOOR'] = (_dr[0], {'A': ramp_from('#c06a48')}, {'w': ('#7a4430', None), 'h': '#3a2014'}, [(5, 7, 'g'), (6, 7, 'g'), (8, 11, 'g'), (9, 11, 'g'), (7, 13, 'g')])
D['COPPER_DOOR'][2]['g'] = '#e09068'
D['COPPER_TRAPDOOR'] = (TRAP, {'A': ramp_from('#c06a48')}, {'g': '#e09068'}, [(2, 1, 'g'), (8, 5, 'g'), (13, 9, 'g'), (5, 13, 'g')])
D['HANGING_SIGN'] = (['................', '...C.......C....', '...C.......C....', '...C.......C....', '..BBBBBBBBBBBB..', '..AAAAAAAAAAAA..', '..AAkkAkkkAkAA..', '..AAAAAAAAAAAA..',
                      '..AAkkkAkkAkAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..BBBBBBBBBBBB..'], {'A': ramp_from('#c09a6a'), 'B': ramp_from('#7a5a38'), 'C': ramp_from('#5a5e66')}, {'k': '#3a2a1a'})
D['WRITABLE_BOOK'] = (['................', '................', '...AAAAAAAAAA...', '..AAAAAAAAAAAP..', '..AAAAAAAAAAAP..', '..AAAAAAAAAAAP..', '..AAAAAAAAAAAP.F', '..AAAAAAAAAAAPFF',
                       '..AAAAAAAAAAAFF.', '..AAAAAAAAAAFFP.', '..AAAAAAAAAkFAP.', '..AAAAAAAAkAAAP.', '..AAAAAAAAAAAAP.', '...PPPPPPPPPPP..'], {'A': ramp_from('#8a5a3a'), 'P': ramp_from('#e8e4d4'), 'F': ramp_from('#e8ecf0')}, {'k': '#1a1a20'})
D['WRITTEN_BOOK'] = (['................', '................', '...AAAAAAAAAA...', '..AAAAAAAAAAAP..', '..AAAAAAAAAAAP..', '..AAggggggAAAP..', '..AAAAAAAAAAAP..', '..AAAgggAAAAAP..',
                      '..AAAAAAAAAAAP..', '..AAAAAAAAAAAP..', '..AAAAAAAAAAAP..', '..AAAAAAAAAAAP..', '..AAAAAAAAAAAP..', '...PPPPPPPPPPP..'], {'A': ramp_from('#5a3a22'), 'P': ramp_from('#e8e4d4')}, {'g': '#d8b04a'})
D['CANDLE'] = (['................', '.......f........', '......fyf.......', '......fy........', '.......k........', '......AAA.......', '......AAA.......', '......AAA.......',
                '......AAA.......', '......AAA.......', '......AAA.......', '......AAA.......', '......AAA.......', '......AAA.......'], {'A': ramp_from('#e8dcb8')}, {'f': '#f0a030', 'y': '#fff0a0', 'k': '#2a2420'})
D['SEA_PICKLE'] = (['................', '................', '.....g....g.....', '....AAA..AAA....', '....AAA..AAA....', '....AAA..AAA....', '....AAA..AAA....', '....AAA..AAA....',
                    '....AAA..AAA....', '....AAA..AAA....'], {'A': ramp_from('#6a8a3a')}, {'g': '#c8f0a0'})
D['BELL'] = (['................', '.......SS.......', '......SSSS......', '.....AAAAAA.....', '....AAAAAAAA....', '....AAAAAAAA....', '....AAAAAAAA....', '....AAAAAAAA....',
              '...AAAAAAAAAA...', '...AAAAAAAAAA...', '..AAAAAAAAAAAA..', '..BBBBBBBBBBBB..', '.......BB.......'], {'A': ramp_from('#e0b840'), 'B': ramp_from('#a07a20'), 'S': ramp_from('#6a6a70')})
D['CHAIN'] = (['................', '.......AA.......', '......A..A......', '......A..A......', '.......AA.......', '.......BB.......', '......B..B......', '......B..B......',
               '.......BB.......', '.......AA.......', '......A..A......', '......A..A......', '.......AA.......', '.......BB.......', '......B..B......', '.......BB.......'], {'A': ramp_from('#6a7080'), 'B': ramp_from('#4a505c')})
