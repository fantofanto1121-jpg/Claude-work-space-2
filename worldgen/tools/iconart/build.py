import sys, json, base64
import os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from engine import render, sheet, to_rgba, hx
import defs1
ICONS = {}

def make(key, spec, noshade=()):
    rows, ramps = spec[0], spec[1]
    fixed = spec[2] if len(spec) > 2 and isinstance(spec[2], dict) else {}
    marks = spec[3] if len(spec) > 3 and isinstance(spec[3], list) else []
    edits = spec[4] if len(spec) > 4 and isinstance(spec[4], list) else []
    g = [list(r.ljust(16, '.')[:16]) for r in rows] + [['.'] * 16 for _ in range(16 - len(rows))]
    for x, y, c in edits:
        g[y][x] = c
    for x, y, c in marks:
        if g[y][x] != '.':
            g[y][x] = c
    ICONS[key] = render(["".join(r) for r in g], ramps, fixed, noshade=noshade)

def make_mirror(key, rows, ramps, extra):
    g = [list(r.ljust(16, '.')[:16]) for r in rows] + [['.'] * 16 for _ in range(16 - len(rows))]
    add = []
    for y in range(16):
        for x in range(16):
            if g[y][x] != '.':
                add.append((15 - y, 15 - x, g[y][x]))
    for x, y, c in add:
        g[y][x] = c
    for y in range(16):
        for x in range(16):
            if extra[y][x] != '.' and g[y][x] == '.':
                g[y][x] = extra[y][x]
    ICONS[key] = render(["".join(r) for r in g], ramps)

for mat, head in [('WOODEN', 'wood'), ('STONE', 'stone'), ('IRON', 'iron'), ('GOLDEN', 'gold'), ('DIAMOND', 'diamond'), ('NETHERITE', 'netherite')]:
    for k, v in defs1.tools(mat, head).items():
        if k.endswith('PICKAXE'):
            make_mirror(k, v[0], v[1], v[3])
        else:
            make(k, (v[0], v[1]))
for mat, r in [('LEATHER', 'leather'), ('GOLDEN', 'gold'), ('IRON', 'iron'), ('DIAMOND', 'diamond'), ('CHAINMAIL', 'chain'), ('NETHERITE', 'netherite')]:
    for k, v in defs1.armor(mat, r).items():
        make(k, v)
for k, v in defs1.materials().items():
    make(k, v)
import defs2
for k, v in defs2.D.items():
    make(k, v)
import defs3
for k, v in defs3.D.items():
    make(k, v, ('T', 'L', 'R') if k in defs3.ISO else ())
import defs4
for k, v in defs4.D.items():
    make(k, v, ('T', 'L', 'R') if k.endswith('_CARPET') else ())
# ポーション（効果の色ごと）
import subprocess
POTS = json.loads(subprocess.run(['node', os.path.join(HERE, 'potions.js')], capture_output=True, text=True, check=True).stdout)
for k, v in POTS.items():
    if v.get('arrow'):
        make(k, (defs4.ARROW_ROWS, {'H': defs3.ramp_from(v['color']), 'S': defs1.R['handle'], 'F': defs3.ramp_from('#e8e8e8')}, {'t': v['color']}, [(11, 1, 't'), (13, 3, 't')]))
    elif v.get('lingering'):
        # 残留ポーション：首の長い丸いフラスコ
        rows = ['................', '.......NN.......', '.......GG.......', '.......GG.......', '......GLLG......', '.....GLLLLG.....', '....GLLLLLLG....', '...GLLLLLLLLG...',
                '...GLLLLLLLLG...', '...GLLLLLLLLG...', '....GLLLLLLG....', '.....GGGGGG.....']
        make(k, (rows, {'G': defs3.RR['glass'], 'N': defs3.RR['wood'], 'L': defs3.ramp_from(v['color'])}, {'w': '#ffffff'}, [(5, 6, 'w'), (5, 7, 'w')]))
    else:
        make(k, defs3.potion(defs3.ramp_from(v['color']), v['splash']))

if __name__ == '__main__':
    # 使い方: python3 tools/iconart/build.py [見本の PNG]
    # js/icons.js を書き出す。見本の PNG を指定すると、全部のアイコンを並べた画像も作る。
    if len(sys.argv) > 1:
        sheet(list(ICONS.items()), sys.argv[1], scale=4, cols=12)
    lines = ['// アイテムのアイコン（16×16 のドット絵。RGBA を左上から行ごとに並べて base64 にしたもの、1024 バイト）。',
             '// このゲームのために描き起こしたもの（tools/iconart/ で作る）：形を描き、素材ごとの 5 段の色（縁取り・暗・中・明・ハイライト）で、',
             '// 左上から光が当たるように陰影と縁取りを付けている。階段・ハーフブロックなどは等角の箱を同じ色の規則で描き、',
             '// ポーションは瓶の中身を効果の色にしている。',
             '(function (G) {', "  'use strict';", '  var WG = G.WG = G.WG || {};', '  WG.ICONS = {']
    items = list(ICONS.items())
    for n, (k, px) in enumerate(items):
        lines.append("    %s: { px: '%s' }%s" % (k, base64.b64encode(to_rgba(px)).decode(), ',' if n < len(items) - 1 else ''))
    lines += ['  };', "})(typeof window !== 'undefined' ? window : globalThis);", '']
    open(os.path.join(HERE, '..', '..', 'js', 'icons.js'), 'w').write('\n'.join(lines))
    print(len(items), 'icons')
