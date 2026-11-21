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
    LOGS: ['OAK_LOG', 'BIRCH_LOG', 'SPRUCE_LOG', 'JUNGLE_LOG', 'ACACIA_LOG'],
    WOOD_SLABS: ['OAK_SLAB', 'SPRUCE_SLAB', 'ACACIA_SLAB', 'BIRCH_SLAB', 'JUNGLE_SLAB']
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
    [['##', '##'], { '#': 'NETHER_BRICK' }, 'NETHER_BRICKS', 1],
    [['WWW', 'PPP'], { W: 'WHITE_WOOL', P: 'PLANKS' }, 'BED', 1]
  ];
  // 9 個で 1 ブロック、1 ブロックから 9 個
  [['COAL', 'COAL_BLOCK'], ['IRON_INGOT', 'IRON_BLOCK'], ['GOLD_INGOT', 'GOLD_BLOCK'], ['COPPER_INGOT', 'COPPER_BLOCK'],
    ['DIAMOND', 'DIAMOND_BLOCK'], ['LAPIS', 'LAPIS_BLOCK'], ['REDSTONE', 'REDSTONE_BLOCK'], ['GOLD_NUGGET', 'GOLD_INGOT']].forEach(function (p) {
    SHAPED.push([['###', '###', '###'], { '#': p[0] }, p[1], 1]);
  });
  // 道具：ツルハシ・斧・シャベル（素材は板材・丸石・鉄インゴット・金インゴット・ダイヤモンド）
  WG.TOOL_MATS.forEach(function (m) {
    if (m[7]) return;   // ネザライトは鍛冶台で作る
    SHAPED.push([['###', ' S ', ' S '], { '#': m[6], S: 'STICK' }, m[0] + '_PICKAXE', 1]);
    SHAPED.push([['##', '#S', ' S'], { '#': m[6], S: 'STICK' }, m[0] + '_AXE', 1]);
    SHAPED.push([['#', 'S', 'S'], { '#': m[6], S: 'STICK' }, m[0] + '_SHOVEL', 1]);
    SHAPED.push([['#', '#', 'S'], { '#': m[6], S: 'STICK' }, m[0] + '_SWORD', 1]);
    SHAPED.push([['##', ' S', ' S'], { '#': m[6], S: 'STICK' }, m[0] + '_HOE', 1]);
  });
  // 防具（革・金・鉄・ダイヤモンド）
  [['LEATHER', 'LEATHER'], ['GOLDEN', 'GOLD_INGOT'], ['IRON', 'IRON_INGOT'], ['DIAMOND', 'DIAMOND']].forEach(function (m) {
    SHAPED.push([['###', '# #'], { '#': m[1] }, m[0] + '_HELMET', 1]);
    SHAPED.push([['# #', '###', '###'], { '#': m[1] }, m[0] + '_CHESTPLATE', 1]);
    SHAPED.push([['###', '# #', '# #'], { '#': m[1] }, m[0] + '_LEGGINGS', 1]);
    SHAPED.push([['# #', '# #'], { '#': m[1] }, m[0] + '_BOOTS', 1]);
  });
  SHAPED.push(
    [[' #S', '# S', ' #S'], { '#': 'STICK', S: 'STRING' }, 'BOW', 1],
    [['F', 'S', 'E'], { F: 'FLINT', S: 'STICK', E: 'FEATHER' }, 'ARROW', 4],
    [['WWW'], { W: 'WHEAT' }, 'BREAD', 1],
    [['NNN', 'NCN', 'NNN'], { N: 'GOLD_NUGGET', C: 'CARROT' }, 'GOLDEN_CARROT', 1],
    [['GGG', 'GAG', 'GGG'], { G: 'GOLD_INGOT', A: 'APPLE' }, 'GOLDEN_APPLE', 1],
    [['# #', ' # '], { '#': 'PLANKS' }, 'BOWL', 4],
    [['# #', ' # '], { '#': 'IRON_INGOT' }, 'BUCKET', 1],
    [[' #', '# '], { '#': 'IRON_INGOT' }, 'SHEARS', 1],
    [['S S', 'SSS', 'S S'], { S: 'STICK' }, 'LADDER', 3],
    [['##', '##'], { '#': 'STRING' }, 'WHITE_WOOL', 1],
    // レッドストーン
    [['R', 'S'], { R: 'REDSTONE', S: 'STICK' }, 'REDSTONE_TORCH', 1],
    [['S', 'C'], { S: 'STICK', C: 'COBBLES' }, 'LEVER', 1],
    [['##'], { '#': 'STONE' }, 'STONE_PRESSURE_PLATE', 1],
    [['##'], { '#': 'OAK_PLANKS' }, 'OAK_PRESSURE_PLATE', 1],
    [[' R ', 'RGR', ' R '], { R: 'REDSTONE', G: 'GLOWSTONE' }, 'REDSTONE_LAMP', 1],
    [['TRT', 'SSS'], { T: 'REDSTONE_TORCH', R: 'REDSTONE', S: 'STONE' }, 'REPEATER', 1],
    [['PPP', 'CIC', 'CRC'], { P: 'PLANKS', C: 'COBBLES', I: 'IRON_INGOT', R: 'REDSTONE' }, 'PISTON', 1],
    [['S', 'P'], { S: 'SLIME_BALL', P: 'PISTON' }, 'STICKY_PISTON', 1],
    [['GSG', 'SGS', 'GSG'], { G: 'GUNPOWDER', S: 'SAND' }, 'TNT', 1],
    [['##', '##', '##'], { '#': 'IRON_INGOT' }, 'IRON_DOOR', 3],
    [['I I', 'ICI', ' I '], { I: 'IRON_INGOT', C: 'CHEST' }, 'HOPPER', 1],
    [['CCC', 'CBC', 'CRC'], { C: 'COBBLES', B: 'BOW', R: 'REDSTONE' }, 'DISPENSER', 1],
    [['CCC', 'C C', 'CRC'], { C: 'COBBLES', R: 'REDSTONE' }, 'DROPPER', 1],
    [[' T ', 'TQT', 'SSS'], { T: 'REDSTONE_TORCH', Q: 'QUARTZ', S: 'STONE' }, 'COMPARATOR', 1],
    [['CCC', 'RRQ', 'CCC'], { C: 'COBBLES', R: 'REDSTONE', Q: 'QUARTZ' }, 'OBSERVER', 1],
    [['GGG', 'QQQ', 'SSS'], { G: 'GLASS', Q: 'QUARTZ', S: 'WOOD_SLABS' }, 'DAYLIGHT_DETECTOR', 1],
    [['PPP', 'PRP', 'PPP'], { P: 'PLANKS', R: 'REDSTONE' }, 'NOTE_BLOCK', 1]
  );
  // 扉・柵（木の種類ごと）、階段・ハーフブロック（素材ごと）
  WG.WOODS.forEach(function (w) {
    SHAPED.push([['##', '##', '##'], { '#': w[0] + '_PLANKS' }, w[0] + '_DOOR', 3]);
    SHAPED.push([['#S#', '#S#'], { '#': w[0] + '_PLANKS', S: 'STICK' }, w[0] + '_FENCE', 3]);
  });
  WG.SHAPE_MATS.forEach(function (m) {
    SHAPED.push([['#  ', '## ', '###'], { '#': m[2] }, m[0] + '_STAIRS', 4]);
    SHAPED.push([['###'], { '#': m[2] }, m[0] + '_SLAB', 6]);
  });
  // 形のないレシピ：[材料の配列, できるもの, 個数]
  var SHAPELESS = [
    [['OAK_LOG'], 'OAK_PLANKS', 4], [['BIRCH_LOG'], 'BIRCH_PLANKS', 4], [['SPRUCE_LOG'], 'SPRUCE_PLANKS', 4],
    [['JUNGLE_LOG'], 'JUNGLE_PLANKS', 4], [['ACACIA_LOG'], 'ACACIA_PLANKS', 4],
    [['COAL_BLOCK'], 'COAL', 9], [['IRON_BLOCK'], 'IRON_INGOT', 9], [['GOLD_BLOCK'], 'GOLD_INGOT', 9],
    [['COPPER_BLOCK'], 'COPPER_INGOT', 9], [['DIAMOND_BLOCK'], 'DIAMOND', 9], [['LAPIS_BLOCK'], 'LAPIS', 9],
    [['REDSTONE_BLOCK'], 'REDSTONE', 9], [['GOLD_INGOT'], 'GOLD_NUGGET', 9],
    [['BONE'], 'BONE_MEAL', 3], [['IRON_INGOT', 'FLINT'], 'FLINT_AND_STEEL', 1],
    [['BROWN_MUSHROOM', 'RED_MUSHROOM', 'BOWL'], 'MUSHROOM_STEW', 1],
    [['STONE'], 'STONE_BUTTON', 1], [['OAK_PLANKS'], 'OAK_BUTTON', 1]
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
    RAW_PORKCHOP: 'COOKED_PORKCHOP', RAW_BEEF: 'COOKED_BEEF', RAW_MUTTON: 'COOKED_MUTTON', RAW_CHICKEN: 'COOKED_CHICKEN', POTATO: 'BAKED_POTATO',
    OAK_LOG: 'CHARCOAL', BIRCH_LOG: 'CHARCOAL', SPRUCE_LOG: 'CHARCOAL', JUNGLE_LOG: 'CHARCOAL', ACACIA_LOG: 'CHARCOAL'
  };
  var FUEL = { COAL: 1600, CHARCOAL: 1600, COAL_BLOCK: 16000, STICK: 100, CRAFTING_TABLE: 300, CHEST: 300,
    WOODEN_PICKAXE: 200, WOODEN_AXE: 200, WOODEN_SHOVEL: 200, WOODEN_SWORD: 200, WOODEN_HOE: 200,
    BOW: 300, BOWL: 100, LADDER: 300, LAVA_BUCKET: 20000 };
  ['OAK', 'SPRUCE', 'ACACIA', 'BIRCH', 'JUNGLE'].forEach(function (w) { FUEL[w + '_FENCE'] = 300; FUEL[w + '_DOOR'] = 200; FUEL[w + '_STAIRS'] = 300; FUEL[w + '_SLAB'] = 150; });
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
      // 溶岩入りバケツは燃えたあと空のバケツが残る
      if (this.slots[1].key === 'LAVA_BUCKET') this.slots[1] = { key: 'BUCKET', n: 1 };
      else if (--this.slots[1].n <= 0) this.slots[1] = null;
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
