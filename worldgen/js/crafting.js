// クラフト（作業台・インベントリの 2×2）と、かまど（精錬と燃料）。レシピは Minecraft と同じ形。
// 形のあるレシピは、枠の中のどこに置いても、左右を反転しても作れる。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};

  // 材料のなかま（どれを使ってもよいもの）
  var GROUPS = {
    PLANKS: ['OAK_PLANKS', 'BIRCH_PLANKS', 'SPRUCE_PLANKS', 'JUNGLE_PLANKS', 'ACACIA_PLANKS'],
    COALS: ['COAL', 'CHARCOAL'],
    COBBLES: ['COBBLESTONE', 'COBBLED_DEEPSLATE'],
    LOGS: ['OAK_LOG', 'BIRCH_LOG', 'SPRUCE_LOG', 'JUNGLE_LOG', 'ACACIA_LOG']
  };
  function accepts(want, key) {
    if (!want) return !key;
    if (!key) return false;
    return GROUPS[want] ? GROUPS[want].indexOf(key) >= 0 : want === key;
  }

  // 形のあるレシピ：[形（行の配列）, 記号 → 材料, できるもの, 個数]
  var SHAPED = [
    [['#', '#'], { '#': 'PLANKS' }, 'STICK', 4],
    [['##', '##'], { '#': 'PLANKS' }, 'CRAFTING_TABLE', 1],
    [['###', '# #', '###'], { '#': 'COBBLES' }, 'FURNACE', 1],
    [['###', '# #', '###'], { '#': 'PLANKS' }, 'CHEST', 1],
    [['C', 'S'], { C: 'COALS', S: 'STICK' }, 'TORCH', 4],
    [['##', '##'], { '#': 'SAND' }, 'SANDSTONE', 1],
    [['##', '##'], { '#': 'STONE' }, 'STONE_BRICKS', 4],
    [['##', '##'], { '#': 'CLAY_BALL' }, 'CLAY', 1],
    [['##', '##'], { '#': 'SNOWBALL' }, 'SNOW', 1],
    [['##', '##'], { '#': 'QUARTZ' }, 'QUARTZ_BLOCK', 1],
    [['##', '##'], { '#': 'GLOWSTONE_DUST' }, 'GLOWSTONE', 1],
    [['##', '##'], { '#': 'BRICK' }, 'BRICKS', 1],
    [['##', '##'], { '#': 'NETHER_BRICK' }, 'NETHER_BRICKS', 1]
  ];
  // 9 個で 1 ブロック、1 ブロックから 9 個
  [['COAL', 'COAL_BLOCK'], ['IRON_INGOT', 'IRON_BLOCK'], ['GOLD_INGOT', 'GOLD_BLOCK'], ['COPPER_INGOT', 'COPPER_BLOCK'],
    ['DIAMOND', 'DIAMOND_BLOCK'], ['LAPIS', 'LAPIS_BLOCK'], ['REDSTONE', 'REDSTONE_BLOCK'], ['GOLD_NUGGET', 'GOLD_INGOT']].forEach(function (p) {
    SHAPED.push([['###', '###', '###'], { '#': p[0] }, p[1], 1]);
  });
  // 道具：ツルハシ・斧・シャベル（素材は板材・丸石・鉄インゴット・金インゴット・ダイヤモンド）
  WG.TOOL_MATS.forEach(function (m) {
    SHAPED.push([['###', ' S ', ' S '], { '#': m[6], S: 'STICK' }, m[0] + '_PICKAXE', 1]);
    SHAPED.push([['##', '#S', ' S'], { '#': m[6], S: 'STICK' }, m[0] + '_AXE', 1]);
    SHAPED.push([['#', 'S', 'S'], { '#': m[6], S: 'STICK' }, m[0] + '_SHOVEL', 1]);
  });
  // 形のないレシピ：[材料の配列, できるもの, 個数]
  var SHAPELESS = [
    [['OAK_LOG'], 'OAK_PLANKS', 4], [['BIRCH_LOG'], 'BIRCH_PLANKS', 4], [['SPRUCE_LOG'], 'SPRUCE_PLANKS', 4],
    [['JUNGLE_LOG'], 'JUNGLE_PLANKS', 4], [['ACACIA_LOG'], 'ACACIA_PLANKS', 4],
    [['COAL_BLOCK'], 'COAL', 9], [['IRON_BLOCK'], 'IRON_INGOT', 9], [['GOLD_BLOCK'], 'GOLD_INGOT', 9],
    [['COPPER_BLOCK'], 'COPPER_INGOT', 9], [['DIAMOND_BLOCK'], 'DIAMOND', 9], [['LAPIS_BLOCK'], 'LAPIS', 9],
    [['REDSTONE_BLOCK'], 'REDSTONE', 9], [['GOLD_INGOT'], 'GOLD_NUGGET', 9]
  ];

  // 枠（n×n のキーの配列、空は null）に合うレシピを探す → { key, n } か null
  function match(grid, n) {
    var cells = [], minX = n, minY = n, maxX = -1, maxY = -1, i;
    for (i = 0; i < n * n; i++) {
      if (!grid[i]) continue;
      var x = i % n, y = (i / n) | 0;
      cells.push(grid[i]);
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    if (!cells.length) return null;
    var w = maxX - minX + 1, h = maxY - minY + 1;
    for (var r = 0; r < SHAPED.length; r++) {
      var R = SHAPED[r], rows = R[0];
      if (rows.length !== h || rows[0].length !== w) continue;
      for (var mirror = 0; mirror < 2; mirror++) {
        var ok = true;
        for (var yy = 0; yy < h && ok; yy++) for (var xx = 0; xx < w && ok; xx++) {
          var ch = rows[yy][mirror ? w - 1 - xx : xx], want = ch === ' ' ? null : R[1][ch];
          ok = accepts(want, grid[(minY + yy) * n + minX + xx]);
        }
        if (ok) return { key: R[2], n: R[3] };
      }
    }
    for (r = 0; r < SHAPELESS.length; r++) {
      var S = SHAPELESS[r];
      if (S[0].length !== cells.length) continue;
      var left = S[0].slice(), good = true;
      for (i = 0; i < cells.length && good; i++) {
        var at = -1;
        for (var j = 0; j < left.length; j++) if (accepts(left[j], cells[i])) { at = j; break; }
        if (at < 0) good = false; else left.splice(at, 1);
      }
      if (good) return { key: S[1], n: S[2] };
    }
    return null;
  }

  // かまど：精錬（材料 → できるもの）と、燃料の燃える長さ（刻み）。1 個焼くのに 200 刻み（10 秒）。
  var SMELT = {
    RAW_IRON: 'IRON_INGOT', RAW_GOLD: 'GOLD_INGOT', RAW_COPPER: 'COPPER_INGOT',
    COBBLESTONE: 'STONE', COBBLED_DEEPSLATE: 'DEEPSLATE', CLAY_BALL: 'BRICK', NETHERRACK: 'NETHER_BRICK', SAND: 'GLASS',
    OAK_LOG: 'CHARCOAL', BIRCH_LOG: 'CHARCOAL', SPRUCE_LOG: 'CHARCOAL', JUNGLE_LOG: 'CHARCOAL', ACACIA_LOG: 'CHARCOAL'
  };
  var FUEL = { COAL: 1600, CHARCOAL: 1600, COAL_BLOCK: 16000, STICK: 100, CRAFTING_TABLE: 300, CHEST: 300,
    WOODEN_PICKAXE: 200, WOODEN_AXE: 200, WOODEN_SHOVEL: 200 };
  GROUPS.PLANKS.concat(GROUPS.LOGS).forEach(function (k) { FUEL[k] = 300; });
  var COOK = 200;

  // かまど 1 台の状態。中身は [材料, 燃料, できたもの]。
  function Furnace() { this.slots = [null, null, null]; this.burn = 0; this.burnMax = 0; this.cook = 0; }
  Furnace.prototype.canSmelt = function () {
    var inp = this.slots[0], out = this.slots[2];
    if (!inp || !SMELT[inp.key]) return false;
    var res = SMELT[inp.key];
    return !out || (out.key === res && out.n < WG.ITEMS[res].max);
  };
  // 1 刻み進める。燃えているかどうかが変わったら true。
  Furnace.prototype.tick = function () {
    var was = this.burn > 0;
    if (this.burn > 0) this.burn--;
    if (this.burn === 0 && this.canSmelt() && this.slots[1] && FUEL[this.slots[1].key]) {
      this.burn = this.burnMax = FUEL[this.slots[1].key];
      if (--this.slots[1].n <= 0) this.slots[1] = null;
    }
    if (this.burn > 0 && this.canSmelt()) {
      if (++this.cook >= COOK) {
        this.cook = 0;
        var res = SMELT[this.slots[0].key];
        if (--this.slots[0].n <= 0) this.slots[0] = null;
        if (this.slots[2]) this.slots[2].n++; else this.slots[2] = { key: res, n: 1 };
      }
    } else if (this.cook > 0) this.cook = Math.max(0, this.cook - 2);
    return was !== this.burn > 0;
  };

  WG.Craft = { match: match, SMELT: SMELT, FUEL: FUEL, COOK: COOK, Furnace: Furnace, SHAPED: SHAPED, SHAPELESS: SHAPELESS };
})(typeof window !== 'undefined' ? window : globalThis);
