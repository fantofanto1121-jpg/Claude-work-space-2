# 食べ物・材料・道具・ポーションなど
from defs1 import R
R2 = {
    'pork': ['#5e2424', '#d07474', '#e6999a', '#f4bcbc', '#ffe2e0'],
    'porkc': ['#3e1e0c', '#94562a', '#b47240', '#cc8e58', '#e6b082'],
    'beef': ['#420c0c', '#9c2822', '#c23830', '#dc584c', '#f08a7c'],
    'beefc': ['#2a1208', '#5a2c14', '#76401e', '#94582e', '#b47a48'],
    'mutton': ['#4e1616', '#b0443a', '#cc6054', '#e08074', '#f2a69a'],
    'muttonc': ['#36180c', '#743e20', '#94522e', '#b06c42', '#c8885a'],
    'chicken': ['#6e5242', '#e2bca4', '#f0d0bc', '#fae2d2', '#fff4ec'],
    'chickenc': ['#4e2a0e', '#b0702a', '#cc8a3e', '#e2a65a', '#f4c682'],
    'rotten': ['#26260e', '#565420', '#746c2e', '#908842', '#ada45a'],
    'bread': ['#42250c', '#9a601c', '#bc7e30', '#d69e4c', '#ecc272'],
    'apple': ['#360808', '#9a1c18', '#cc2e28', '#e65646', '#ffaa9a'],
    'carrot': ['#4e1e06', '#c85e16', '#ec8426', '#ffa44a', '#ffd08a'],
    'leaf': ['#10280a', '#2e6a1c', '#46902c', '#66b040', '#9ad46c'],
    'potato': ['#423016', '#9a743c', '#ba9454', '#d4b070', '#eacc96'],
    'baked': ['#36200e', '#845422', '#aa7434', '#c8924c', '#e2b470'],
    'cod': ['#36301e', '#857658', '#a49476', '#c0b294', '#dcd0b8'],
    'salmon': ['#46180f', '#a23a2a', '#c4543a', '#de7a56', '#f2a684'],
    'fishc': ['#46280e', '#9c622a', '#bc8040', '#d49e5c', '#eac084'],
    'puffer': ['#52440a', '#c2a226', '#e4c23c', '#f6dc6a', '#fff2ac'],
    'tropic': ['#52260a', '#d86c1e', '#f48c1c', '#ffae4c', '#ffdcac'],
    'string': ['#5e5e62', '#c4c4c8', '#e0e0e4', '#f0f0f2', '#ffffff'],
    'feather': ['#6e6e74', '#cfcfd4', '#e6e6ea', '#f4f4f6', '#ffffff'],
    'wheat': ['#4e3c0e', '#a88428', '#cca23a', '#e4c058', '#f6dc8a'],
    'seed': ['#1a320c', '#3a721e', '#54922e', '#74b044', '#a4d672'],
    'paper': ['#76746a', '#d4d2c4', '#e8e6da', '#f4f2ea', '#ffffff'],
    'bookcover': ['#2e140a', '#6c3018', '#8c4224', '#a85634', '#c2724a'],
    'enchcover': ['#24103a', '#55287e', '#7036a2', '#8e50c2', '#b480e0'],
    'wart': ['#2e060a', '#7a1620', '#a2222e', '#c63a46', '#e4707a'],
    'eye': ['#36080e', '#861a28', '#b02838', '#d04a58', '#ee8894'],
    'feye': ['#2e140e', '#6e3226', '#8e4434', '#a85e4a', '#c88470'],
    'tear': ['#4a5e66', '#b6d6e0', '#d2e8f0', '#e6f4f8', '#ffffff'],
    'melon': ['#4a0c0c', '#b8262a', '#dc3a3a', '#f05e58', '#ffa29a'],
    'rabbit': ['#4a3622', '#a8865e', '#c4a47a', '#dcc29a', '#f0dcc0'],
    'glass': ['#3a5e6c', '#9cc6d6', '#bcdcea', '#d6eef6', '#ffffff'],
    'slime': ['#1a4214', '#46943a', '#64b84c', '#88d46a', '#c4f4a4'],
    'magma': ['#360c04', '#86280a', '#c45018', '#ee8428', '#ffd25e'],
    'snow': ['#74848e', '#c4d2dc', '#dee8ee', '#eff5f8', '#ffffff'],
    'clay': ['#465062', '#8892a4', '#a0aabc', '#b8c2d2', '#d2dae6'],
    'chorus': ['#2a1834', '#664678', '#866696', '#a486b4', '#ccb4da'],
    'bucket': ['#2e2e32', '#8a8a90', '#b6b6bc', '#d6d6da', '#ffffff'],
    'water': ['#122a5e', '#2c4ea6', '#3e66c8', '#5e86e0', '#9cbcf4'],
    'lava': ['#5a1a04', '#d0560e', '#f27e16', '#ffaa2c', '#ffe27a'],
    'milk': ['#7a7a76', '#e2e2dc', '#f2f2ee', '#fafaf8', '#ffffff'],
    'red': ['#3a0808', '#9c1a1a', '#c42a24', '#de4a40', '#f4887a'],
    'white': ['#6e6e6e', '#d6d6d2', '#ececea', '#f6f6f4', '#ffffff'],
    'shield': ['#33220f', '#6e4a24', '#8e6432', '#aa7e46', '#c49a60'],
    'stem': ['#6e6450', '#d8ceb4', '#e8e0ca', '#f2ecdc', '#ffffff'],
    'bmush': ['#3a2414', '#86603e', '#a27a54', '#bc966c', '#d6b48c'],
    'rmush': ['#3e0808', '#a41e1c', '#cc2c28', '#e65046', '#ff9a8a'],
}
RR = dict(R); RR.update(R2)

def F(rows, regions, fixed=None, marks=None):
    return (rows, {k: RR[v] for k, v in regions.items()}, fixed or {}, marks or [])

D = {}
MEAT = ['................', '................', '................', '......AAAAA.....', '....AAAAAAAAA...', '...AAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..',
        '..BAAAAAAAAAAA..', '..BBAAAAAAAAA...', '...BBBAAAAAA....', '.....BBBBB......']
for k, a, b in [('RAW_PORKCHOP', 'pork', 'white'), ('COOKED_PORKCHOP', 'porkc', 'bread'), ('RAW_MUTTON', 'mutton', 'white'), ('COOKED_MUTTON', 'muttonc', 'bread')]:
    D[k] = F(MEAT, {'A': a, 'B': b}, {'f': '#f6dcd8' if 'RAW' in k else '#e0b07a'}, [(6, 6, 'f'), (7, 7, 'f'), (9, 5, 'f')])
STEAK = ['................', '................', '................', '.....AAAAAA.....', '...AAAAAAAAAA...', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAAA.',
         '...AAAAAAAAAAAA.', '....AAAAAAAAAA..', '.....AAAAAAA....', '................']
D['RAW_BEEF'] = F(STEAK, {'A': 'beef'}, {'f': '#f2c4be', 'g': '#f6d8d2'}, [(5, 5, 'f'), (6, 6, 'f'), (7, 7, 'f'), (9, 6, 'g'), (10, 7, 'g'), (11, 8, 'g')])
D['COOKED_BEEF'] = F(STEAK, {'A': 'beefc'}, {'f': '#a06a3a', 'g': '#3a1c0c'}, [(5, 5, 'f'), (6, 6, 'f'), (9, 6, 'g'), (10, 7, 'g'), (7, 8, 'g'), (8, 9, 'g')])
LEG = ['................', '................', '.......AAAAA....', '......AAAAAAA...', '.....AAAAAAAAA..', '.....AAAAAAAAA..', '.....AAAAAAAAA..', '......AAAAAAAA..',
       '.....BAAAAAAA...', '....BB.AAAAA....', '...BB...........', '.BBB............', '.BB.............']
D['RAW_CHICKEN'] = F(LEG, {'A': 'chicken', 'B': 'bone'}, {'d': '#d8a894'}, [(8, 5, 'd'), (10, 7, 'd'), (11, 4, 'd')])
D['COOKED_CHICKEN'] = F(LEG, {'A': 'chickenc', 'B': 'bone'}, {'d': '#9a5a1e', 'w': '#fbe0a8'}, [(8, 5, 'd'), (10, 7, 'd'), (7, 3, 'w')])
D['ROTTEN_FLESH'] = F(STEAK, {'A': 'rotten'}, {'g': '#3a3a12', 'r': '#8a4a3a', 'l': '#c0b870'}, [(5, 5, 'g'), (8, 6, 'r'), (9, 7, 'r'), (11, 8, 'g'), (6, 8, 'l'), (4, 6, 'r')])
D['BREAD'] = F(['................', '................', '................', '................', '.....AAAAAAAA...', '...AAAAAAAAAAAA.', '..AAAAAAAAAAAAA.',
                '..AAAAAAAAAAAAA.', '..AAAAAAAAAAAAA.', '...AAAAAAAAAAA..', '................'], {'A': 'bread'}, {'c': '#8a5418'}, [(5, 5, 'c'), (6, 6, 'c'), (8, 5, 'c'), (9, 6, 'c'), (11, 5, 'c'), (12, 6, 'c')])
APPLE = ['........S.......', '.......SLL......', '....AAASAAA.....', '...AAAAAAAAA....', '..AAAAAAAAAAA...', '..AAAAAAAAAAA...', '..AAAAAAAAAAA...', '..AAAAAAAAAAA...',
         '..AAAAAAAAAAA...', '...AAAAAAAAA....', '....AAA.AAA.....']
D['APPLE'] = F(APPLE, {'A': 'apple', 'S': 'handle', 'L': 'leaf'}, {'w': '#ffd6cc'}, [(4, 4, 'w'), (4, 5, 'w')])
D['GOLDEN_APPLE'] = F(APPLE, {'A': 'gold', 'S': 'handle', 'L': 'leaf'}, {'w': '#ffffff'}, [(4, 4, 'w'), (4, 5, 'w')])
CARROT = ['................', '..........LL.L..', '...........LLL..', '.........LLLL...', '........AAAL....', '.......AAAAA....', '......AAAAA.....', '.....AAAAA......',
          '....AAAAA.......', '...AAAA.........', '..AAA...........', '..A.............']
D['CARROT'] = F(CARROT, {'A': 'carrot', 'L': 'leaf'}, {'c': '#b84c10'}, [(6, 7, 'c'), (8, 6, 'c'), (4, 9, 'c')])
D['GOLDEN_CARROT'] = F(CARROT, {'A': 'gold', 'L': 'leaf'}, {'c': '#b4801a', 'w': '#ffffff'}, [(6, 7, 'c'), (8, 6, 'c'), (7, 5, 'w')])
POT = ['................', '................', '................', '.....AAAAA......', '...AAAAAAAAA....', '..AAAAAAAAAAA...', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..',
       '...AAAAAAAAAAA..', '....AAAAAAAAA...', '......AAAAA.....']
D['POTATO'] = F(POT, {'A': 'potato'}, {'e': '#7a5a2a'}, [(5, 6, 'e'), (9, 5, 'e'), (8, 8, 'e'), (11, 7, 'e')])
D['BAKED_POTATO'] = F(POT, {'A': 'baked'}, {'e': '#5a3612', 'y': '#f4d68a'}, [(5, 6, 'e'), (9, 8, 'e'), (6, 4, 'y'), (7, 4, 'y'), (8, 5, 'y')])
FISH = ['................', '................', '................', '................', '....AAAAAA......', '..AAAAAAAAAA...B', '.AAAAAAAAAAAA.BB', '.AAAAAAAAAAAAABB',
        '..AAAAAAAAAA..BB', '....AAAAAA.....B']
D['COD'] = F(FISH, {'A': 'cod', 'B': 'cod'}, {'e': '#141414', 's': '#d8ccb0'}, [(3, 6, 'e'), (6, 8, 's'), (8, 8, 's')])
D['COOKED_COD'] = F(FISH, {'A': 'fishc', 'B': 'fishc'}, {'e': '#2a1606', 's': '#e6be82'}, [(3, 6, 'e'), (6, 5, 's'), (8, 5, 's')])
D['SALMON'] = F(FISH, {'A': 'salmon', 'B': 'salmon'}, {'e': '#141414', 's': '#5a6a6a'}, [(3, 6, 'e'), (5, 5, 's'), (7, 5, 's'), (9, 5, 's')])
D['COOKED_SALMON'] = F(FISH, {'A': 'fishc', 'B': 'salmon'}, {'e': '#2a1606', 's': '#f0a87a'}, [(3, 6, 'e'), (6, 7, 's'), (8, 7, 's')])
D['PUFFERFISH'] = F(['................', '................', '...A..A..A......', '....AAAAAA......', '..AAAAAAAAAA....', '.AAAAAAAAAAAA..B', 'AAAAAAAAAAAAAABB',
                     '.AAAAAAAAAAAA..B', '..AAAAAAAAAA....', '....AAAAAA......', '...A..A..A......'], {'A': 'puffer', 'B': 'puffer'}, {'e': '#141414', 's': '#a08018'}, [(3, 5, 'e'), (6, 7, 's'), (9, 6, 's')])
D['TROPICAL_FISH'] = F(FISH, {'A': 'tropic', 'B': 'tropic'}, {'e': '#141414', 'w': '#ffffff'}, [(3, 6, 'e'), (6, 5, 'w'), (6, 6, 'w'), (6, 7, 'w'), (9, 6, 'w'), (9, 7, 'w')])
BOWL = ['................', '................', '................', '................', '................', '................', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..',
        '...AAAAAAAAAA...', '....AAAAAAAA....', '.....AAAAAA.....']
D['BOWL'] = F(BOWL, {'A': 'wood'})
D['MUSHROOM_STEW'] = F(['................', '................', '................', '................', '................', '...CCCCCCCCCC...', '..ACCCCCCCCCCA..', '..AAAAAAAAAAAA..',
                        '...AAAAAAAAAA...', '....AAAAAAAA....', '.....AAAAAA.....'], {'A': 'wood', 'C': 'baked'}, {'r': '#c42a24', 'b': '#a27a54'}, [(5, 5, 'r'), (9, 5, 'b'), (11, 6, 'r'), (7, 6, 'b')])
# 材料
D['STRING'] = F(['................', '..........AA....', '.........A..A...', '........A....A..', '.......A......A.', '......A.......A.', '.....A.......A..', '....A.......A...',
                 '...A.......A....', '..A.......A.....', '.A.....AAA......', '.A....A.........', '..AAAA..........'], {'A': 'string'})
D['FEATHER'] = F(['................', '............AA..', '..........AAAA..', '.........AAAAA..', '........AAAAA...', '.......AAAAA....', '......AAAAA.....', '.....AAAAA......',
                  '....AAAAA.......', '....AAAA........', '...S............', '..S.............', '.S..............'], {'A': 'feather', 'S': 'string'}, {'q': '#9a9aa2'}, [(11, 3, 'q'), (10, 4, 'q'), (9, 5, 'q'), (8, 6, 'q'), (7, 7, 'q'), (6, 8, 'q'), (5, 9, 'q')])
D['LEATHER'] = F(['................', '................', '...AAA....AAA...', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...',
                  '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '...AAA....AAA...'], {'A': 'leather'}, {'s': '#6a3a1c'}, [(5, 5, 's'), (9, 7, 's'), (7, 8, 's')])
D['WHEAT'] = F(['................', '........A.......', '.....A.AAA.A....', '....AAA.A.AAA...', '.....A.AAA.A....', '......AAAAA.....', '.......AAA......', '.......SSS......',
                '......S.S.S.....', '......S.S.S.....', '.....S..S..S....', '.....S..S..S....', '....S...S...S...'], {'A': 'wheat', 'S': 'seed'})
D['WHEAT_SEEDS'] = F(['................', '................', '................', '................', '......A.........', '...A.......A....', '.......A........', '....A...........',
                      '..........A.....', '......A.....A...', '...A............', '........A.......'], {'A': 'seed'})
D['PAPER'] = F(['................', '................', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...',
                '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '................'], {'A': 'paper'}, {'l': '#b8b6aa'}, [(5, 4, 'l'), (6, 4, 'l'), (7, 4, 'l'), (8, 4, 'l'), (5, 6, 'l'), (6, 6, 'l'), (7, 6, 'l'), (8, 6, 'l'), (9, 6, 'l'), (5, 8, 'l'), (6, 8, 'l'), (7, 8, 'l')])
BOOK = ['................', '................', '...AAAAAAAAAA...', '..AAAAAAAAAAAP..', '..AAAAAAAAAAAP..', '..AAAAAAAAAAAP..', '..AAAAAAAAAAAP..', '..AAAAAAAAAAAP..',
        '..AAAAAAAAAAAP..', '..AAAAAAAAAAAP..', '..AAAAAAAAAAAP..', '...AAAAAAAAAA...']
D['BOOK'] = F(BOOK, {'A': 'bookcover', 'P': 'paper'}, {'g': '#d8b04a'}, [(5, 5, 'g'), (6, 5, 'g'), (7, 5, 'g'), (8, 5, 'g'), (9, 5, 'g')])
D['ENCHANTED_BOOK'] = F(BOOK, {'A': 'enchcover', 'P': 'paper'}, {'g': '#f4d35a', 'w': '#ffffff'}, [(5, 5, 'g'), (6, 5, 'g'), (7, 5, 'g'), (8, 5, 'g'), (9, 5, 'g'), (7, 7, 'w'), (4, 3, 'w')])
D['NETHER_WART'] = F(['................', '................', '.....A....A.....', '....AAA..AAA....', '.....AA.AAA.....', '......AAAA......', '...A...AA...A...', '..AAA..AA..AAA..',
                      '...AAA.AA.AAA...', '.....AAAAAA.....', '.......AA.......'], {'A': 'wart'})
EYE = ['................', '................', '................', '.....AAAAAA.....', '....AAAAAAAA....', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AAAAAAAAAA...',
       '...AAAAAAAAAA...', '....AAAAAAAA....', '.....AAAAAA.....']
D['SPIDER_EYE'] = F(EYE, {'A': 'eye'}, {'k': '#140406', 'w': '#ffd0d6'}, [(6, 6, 'k'), (7, 6, 'k'), (6, 7, 'k'), (7, 7, 'k'), (10, 7, 'k'), (5, 5, 'w')])
D['FERMENTED_SPIDER_EYE'] = F(EYE, {'A': 'feye'}, {'k': '#1e0c08', 'm': '#a27a54', 'w': '#e4c0a8'}, [(6, 6, 'k'), (7, 7, 'k'), (9, 5, 'm'), (10, 6, 'm'), (5, 8, 'm'), (5, 5, 'w')])
D['GHAST_TEAR'] = F(['................', '................', '.......A........', '.......A........', '......AAA.......', '......AAA.......', '.....AAAAA......', '.....AAAAA......',
                     '....AAAAAAA.....', '....AAAAAAA.....', '.....AAAAA......', '......AAA.......'], {'A': 'tear'})
D['GLISTERING_MELON_SLICE'] = F(['................', '................', '..R.............', '..RAA...........', '..RAAAA.........', '..RAAAAAA.......', '..RAAAAAAAA.....', '..RAAAAAAAAAA...',
                                 '..RRAAAAAAAAAA..', '...RRRRRRRRRRR..', '................'], {'A': 'melon', 'R': 'gold'}, {'s': '#2a0a0a', 'w': '#fff4b0'}, [(4, 5, 's'), (6, 6, 's'), (8, 7, 's'), (5, 7, 's'), (10, 8, 's'), (3, 4, 'w')])
D['RABBIT_FOOT'] = F(['................', '..........AAA...', '.........AAAAA..', '.........AAAAA..', '........AAAAA...', '.......AAAAA....', '......AAAAA.....', '.....AAAAA......',
                      '....AAAAA.......', '...BBBBB........', '..BBBBB.........', '..BBB...........'], {'A': 'rabbit', 'B': 'white'})
BOTTLE = ['................', '.......NN.......', '.......NN.......', '......GGGG......', '......G..G......', '.....G....G.....', '....G......G....', '...G........G...',
          '...G........G...', '...G........G...', '....G......G....', '.....GGGGGG.....']
def bottle(liquid, splash=False):
    rows = [list(r) for r in BOTTLE]
    if liquid:
        for y in range(5, 11):
            for x in range(16):
                if rows[y][x] == '.' and any(rows[y][xx] == 'G' for xx in range(x)) and any(rows[y][xx] == 'G' for xx in range(x + 1, 16)):
                    if y >= (5 if splash else 6):
                        rows[y][x] = 'L'
    if splash:
        rows[1] = list('......NNNN......'); rows[2] = list('.......NN.......')
    return ["".join(r) for r in rows]
D['GLASS_BOTTLE'] = F(bottle(True), {'G': 'glass', 'N': 'wood', 'L': 'tear'}, {'w': '#ffffff'}, [(5, 7, 'w')])
SLIMEBALL = ['................', '................', '................', '.....AAAAA......', '....AAAAAAA.....', '...AAAAAAAAA....', '...AAAAAAAAA....', '...AAAAAAAAA....',
             '...AAAAAAAAA....', '....AAAAAAA.....', '.....AAAAA......']
D['SLIME_BALL'] = F(SLIMEBALL, {'A': 'slime'}, {'w': '#e8ffd8', 'k': '#2e6a24'}, [(5, 5, 'w'), (6, 4, 'w'), (8, 7, 'k'), (9, 8, 'k')])
D['MAGMA_CREAM'] = F(SLIMEBALL, {'A': 'magma'}, {'w': '#fff0a0', 'k': '#2a0a02'}, [(5, 5, 'w'), (8, 6, 'k'), (6, 8, 'k'), (10, 7, 'w')])
D['SNOWBALL'] = F(SLIMEBALL, {'A': 'snow'}, {'k': '#b0c0cc'}, [(8, 7, 'k'), (6, 8, 'k')])
D['CLAY_BALL'] = F(SLIMEBALL, {'A': 'clay'}, {'k': '#7a8496'}, [(8, 7, 'k'), (6, 8, 'k')])
D['CHORUS_FRUIT'] = F(['................', '................', '.....AAAAA......', '....AAAAAAA.....', '...AAAAAAAAA....', '...AAAAAAAAA....', '...AAAAAAAAA....', '...AAAAAAAAA....',
                       '....AAAAAAA.....', '.....AAAAA......', '......AAA.......'], {'A': 'chorus'}, {'k': '#3e2a4a', 'w': '#ead8f4'}, [(5, 5, 'k'), (8, 4, 'k'), (10, 6, 'k'), (6, 8, 'k'), (9, 8, 'k'), (4, 4, 'w')])
D['ARROW'] = F(['................', '............HH..', '...........HHHH.', '............HHH.', '..........S.H...', '.........S......', '........S.......', '.......S........',
                '......S.........', '.....S..........', '.FF.S...........', '.FFS............', '..FF............', '.F.F............'], {'H': 'flint', 'S': 'handle', 'F': 'feather'})
# 道具
BUCKET = ['................', '................', '...AAAAAAAAAA...', '..A..........A..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '...AAAAAAAAAA...', '...AAAAAAAAAA...',
          '...AAAAAAAAAA...', '....AAAAAAAA....', '....AAAAAAAA....', '.....AAAAAA.....']
for k, liq in [('BUCKET', None), ('WATER_BUCKET', 'water'), ('LAVA_BUCKET', 'lava'), ('MILK_BUCKET', 'milk')]:
    rows = [list(r) for r in BUCKET]
    for x in range(3, 13): rows[3][x] = 'L' if liq else 'I'
    D[k] = F(["".join(r) for r in rows], dict({'A': 'bucket', 'I': 'gunpowder'}, **({'L': liq} if liq else {})))
D['FLINT_AND_STEEL'] = F(['................', '..AAAAAAA.......', '.AA.....AA......', '.A.......A......', '.A.......A......', '.AA.....AA......', '..AA...AA.......', '...AAAAA........',
                          '.........FFF....', '........FFFFF...', '.......FFFFFFF..', '........FFFFFF..', '.........FFFF...', '..........FF....'], {'A': 'iron', 'F': 'flint'}, {'w': '#b0b0bc'}, [(9, 9, 'w'), (8, 10, 'w')])
D['SHEARS'] = F(['................', '..........AA....', '.........AAA....', '........AAA.....', '.......AAA..AA..', '......AAA..AAA..', '.....AAA..AAA...', '....AA...AAA....',
                 '...HHH.AAA......', '..HH.HH.........', '..H...H.........', '..HH.HH.........', '...HHH..........'], {'A': 'iron', 'H': 'red'}, {}, [], )
D['FISHING_ROD'] = F(['................', '.............SS.', '............SS.T', '...........SS..T', '..........SS...T', '.........SS....T', '........SS.....T', '.......SS......T',
                      '......SS.......T', '.....SS........T', '....SS........HH', '...SS.........H.', '..SS............', '.SS.............'], {'S': 'handle', 'T': 'string', 'H': 'iron'})
D['BOW'] = F(['................', '..........SSSS..', '........SS...T..', '.......S....T...', '......S....T....', '.....S....T.....', '....S....T......', '....S...T.......',
              '...S...T........', '...S..T.........', '...S.T..........', '..SST...........', '..S.............', '.SS.............'], {'S': 'handle', 'T': 'string'})
D['SHIELD'] = F(['................', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '..AAAAAMMAAAAA..', '..AAAAAMMAAAAA..', '..AAAAMMMMAAAA..', '..AAAAAMMAAAAA..', '..AAAAAMMAAAAA..',
                 '...AAAAMMAAAA...', '...AAAAAAAAAA...', '....AAAAAAAA....', '.....AAAAAA.....', '.......AA.......'], {'A': 'shield', 'M': 'iron'}, {'r': '#8a8a90'}, [(2, 1, 'r'), (13, 1, 'r')])
D['BED'] = F(['................', '................', '................', '................', '.WWWRRRRRRRRRRR.', '.WWWRRRRRRRRRRR.', '.WWWRRRRRRRRRRR.', '.PPPPPPPPPPPPPP.',
              '.PPPPPPPPPPPPPP.', '.P............P.', '.P............P.'], {'W': 'white', 'R': 'red', 'P': 'wood'})
