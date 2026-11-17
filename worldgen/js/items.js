// アイテムとインベントリ。
// ブロックの硬度・最大スタック数・ドロップは、提供された PDF「全ブロック図鑑」の表の値。
// ドロップの個数（レッドストーン 4〜5 個など）は PDF にないので、Minecraft の値に合わせた。
// ブロック以外のアイテム（石炭など）は PDF に図がないため、8×8 の簡単な絵を作っている。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B;

  // [キー, 硬度（-1 は壊せない）, ドロップ（キー、null はなし）, 個数の下限, 上限, 確率]
  var BLOCK_DATA = [
    ['BEDROCK', -1, null], ['STONE', 1.5, 'COBBLESTONE'], ['DEEPSLATE', 3, 'COBBLED_DEEPSLATE'],
    ['DIRT', 0.5, 'DIRT'], ['GRASS', 0.6, 'DIRT'], ['SAND', 0.5, 'SAND'], ['SANDSTONE', 0.8, 'SANDSTONE'],
    ['GRAVEL', 0.6, 'GRAVEL'], ['CLAY', 0.6, 'CLAY_BALL', 4, 4], ['SNOW', 0.2, 'SNOWBALL', 4, 4], ['ICE', 0.5, null],
    ['OAK_LOG', 2, 'OAK_LOG'], ['OAK_LEAVES', 0.2, null], ['BIRCH_LOG', 2, 'BIRCH_LOG'], ['BIRCH_LEAVES', 0.2, null],
    ['SPRUCE_LOG', 2, 'SPRUCE_LOG'], ['SPRUCE_LEAVES', 0.2, null], ['JUNGLE_LOG', 2, 'JUNGLE_LOG'], ['JUNGLE_LEAVES', 0.2, null],
    ['ACACIA_LOG', 2, 'ACACIA_LOG'], ['ACACIA_LEAVES', 0.2, null],
    ['SHORT_GRASS', 0, 'WHEAT_SEEDS', 1, 1, 0.125], ['DANDELION', 0, 'DANDELION'], ['POPPY', 0, 'POPPY'],
    ['CACTUS', 0.4, 'CACTUS'], ['COBBLESTONE', 2, 'COBBLESTONE'], ['MOSSY_COBBLESTONE', 2, 'MOSSY_COBBLESTONE'],
    ['SPAWNER', 5, null], ['CHEST', 2.5, 'CHEST'],
    ['COAL_ORE', 3, 'COAL'], ['IRON_ORE', 3, 'RAW_IRON'], ['COPPER_ORE', 3, 'RAW_COPPER', 2, 5], ['GOLD_ORE', 3, 'RAW_GOLD'],
    ['REDSTONE_ORE', 3, 'REDSTONE', 4, 5], ['LAPIS_ORE', 3, 'LAPIS', 4, 9], ['DIAMOND_ORE', 3, 'DIAMOND'],
    ['DEEPSLATE_COAL_ORE', 4.5, 'COAL'], ['DEEPSLATE_IRON_ORE', 4.5, 'RAW_IRON'], ['DEEPSLATE_COPPER_ORE', 4.5, 'RAW_COPPER', 2, 5],
    ['DEEPSLATE_GOLD_ORE', 4.5, 'RAW_GOLD'], ['DEEPSLATE_REDSTONE_ORE', 4.5, 'REDSTONE', 4, 5], ['DEEPSLATE_LAPIS_ORE', 4.5, 'LAPIS', 4, 9],
    ['DEEPSLATE_DIAMOND_ORE', 4.5, 'DIAMOND'],
    ['NETHERRACK', 0.4, 'NETHERRACK'], ['SOUL_SAND', 0.5, 'SOUL_SAND'], ['SOUL_SOIL', 0.5, 'SOUL_SOIL'], ['MAGMA', 0.5, 'MAGMA'],
    ['GLOWSTONE', 0.3, 'GLOWSTONE_DUST', 2, 4], ['BASALT', 1.25, 'BASALT'], ['QUARTZ_ORE', 3, 'QUARTZ'],
    ['NETHER_GOLD_ORE', 3, 'GOLD_NUGGET', 2, 6], ['END_STONE', 3, 'END_STONE'], ['OBSIDIAN', 50, 'OBSIDIAN'],
    ['END_PORTAL_FRAME', -1, null], ['CHORUS_PLANT', 0.4, 'CHORUS_FRUIT'], ['CHORUS_FLOWER', 0.4, null],
    ['COBBLED_DEEPSLATE', 3.5, 'COBBLED_DEEPSLATE'],
    ['OAK_PLANKS', 2, 'OAK_PLANKS'], ['BIRCH_PLANKS', 2, 'BIRCH_PLANKS'], ['SPRUCE_PLANKS', 2, 'SPRUCE_PLANKS'],
    ['JUNGLE_PLANKS', 2, 'JUNGLE_PLANKS'], ['ACACIA_PLANKS', 2, 'ACACIA_PLANKS'],
    ['CRAFTING_TABLE', 2.5, 'CRAFTING_TABLE'], ['FURNACE', 3.5, 'FURNACE'], ['FURNACE_LIT', 3.5, 'FURNACE'],
    ['TORCH', 0, 'TORCH'], ['WALL_TORCH_N', 0, 'TORCH'], ['WALL_TORCH_S', 0, 'TORCH'], ['WALL_TORCH_E', 0, 'TORCH'], ['WALL_TORCH_W', 0, 'TORCH'],
    ['COAL_BLOCK', 5, 'COAL_BLOCK'], ['IRON_BLOCK', 5, 'IRON_BLOCK'], ['GOLD_BLOCK', 3, 'GOLD_BLOCK'], ['COPPER_BLOCK', 3, 'COPPER_BLOCK'],
    ['DIAMOND_BLOCK', 5, 'DIAMOND_BLOCK'], ['LAPIS_BLOCK', 3, 'LAPIS_BLOCK'], ['REDSTONE_BLOCK', 5, 'REDSTONE_BLOCK'],
    ['QUARTZ_BLOCK', 0.8, 'QUARTZ_BLOCK'], ['STONE_BRICKS', 1.5, 'STONE_BRICKS'], ['BRICKS', 2, 'BRICKS'], ['NETHER_BRICKS', 2, 'NETHER_BRICKS']
  ];

  // ブロックではないアイテム [キー, 名前, 形, 色, 最大スタック数]
  var ITEM_DATA = [
    ['COAL', '石炭', 'lump', '#2e2e31'], ['RAW_IRON', '粗い鉄', 'lump', '#c9a68a'], ['RAW_COPPER', '粗い銅', 'lump', '#b8714f'],
    ['RAW_GOLD', '粗い金', 'lump', '#dcbc4f'], ['DIAMOND', 'ダイヤモンド', 'gem', '#62c9c0'], ['LAPIS', 'ラピスラズリ', 'gem', '#3456a8'],
    ['REDSTONE', 'レッドストーン', 'dust', '#b02b22'], ['QUARTZ', '水晶', 'gem', '#e2dad2'], ['GOLD_NUGGET', '金のナゲット', 'nugget', '#e2c24c'],
    ['GLOWSTONE_DUST', 'グロウストーンダスト', 'dust', '#e0c06a'], ['CLAY_BALL', '粘土玉', 'ball', '#a3a9b4'],
    ['SNOWBALL', '雪玉', 'ball', '#eef1f3', 16], ['CHORUS_FRUIT', 'コーラスフルーツ', 'ball', '#957aa0'],
    ['WHEAT_SEEDS', '小麦の種', 'seeds', '#5c8a3b'],
    ['STICK', '棒', 'stick', '#8a6a3e'], ['CHARCOAL', '木炭', 'lump', '#3b3029'],
    ['IRON_INGOT', '鉄インゴット', 'ingot', '#d6d6d4'], ['GOLD_INGOT', '金インゴット', 'ingot', '#e6c443'],
    ['COPPER_INGOT', '銅インゴット', 'ingot', '#c4714f'], ['BRICK', 'レンガ（アイテム）', 'ingot', '#a8584a'],
    ['NETHER_BRICK', 'ネザーレンガ（アイテム）', 'ingot', '#46222a']
  ];

  // 8×8 の絵。# が基本色、l が明るい色、d が暗い色。
  var SHAPES = {
    lump: ['........', '...##...', '..#l##..', '.#l###d.', '.####dd.', '..##dd..', '...dd...', '........'],
    gem: ['........', '..####..', '.#ll##d.', '##l###dd', '.######.', '..####..', '...##...', '........'],
    dust: ['........', '..#..#..', '.#.##.#.', '..#l##..', '.######.', '#.####.#', '..#..#..', '........'],
    ball: ['........', '..###...', '.#ll##d.', '.#l###d.', '.####dd.', '..#ddd..', '........', '........'],
    nugget: ['........', '........', '...##...', '..#l#d..', '..##dd..', '...dd...', '........', '........'],
    seeds: ['........', '.#...#..', '..#.....', '....#..#', '.#..#...', '...#..#.', '#.......', '........'],
    stick: ['........', '......l.', '.....#d.', '....#d..', '...#d...', '..#d....', '.#d.....', '........'],
    ingot: ['........', '........', '...llll.', '..#lll#d', '.######d', '.#####dd', '........', '........']
  };

  var ITEMS = {};
  BLOCK_DATA.forEach(function (d) {
    var id = B[d[0]];
    ITEMS[d[0]] = {
      key: d[0], name: WG.blockName(id), block: id, max: 64, hardness: d[1],
      drop: d[2], dropMin: d[3] || 1, dropMax: d[4] || d[3] || 1, dropChance: d[5] == null ? 1 : d[5]
    };
  });
  ITEM_DATA.forEach(function (d) { ITEMS[d[0]] = { key: d[0], name: d[1], block: -1, max: d[4] || 64, shape: d[2], color: d[3] }; });

  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }

  // アイテムの絵（RGBA 8×8）。ブロックのアイテムは null（ブロックの見た目を使う）。
  var pixCache = {};
  function itemPixels(key) {
    var it = ITEMS[key];
    if (!it || !it.shape) return null;
    if (pixCache[key]) return pixCache[key];
    var rows = SHAPES[it.shape], c = hex(it.color), out = new Uint8Array(256);
    for (var j = 0; j < 8; j++) for (var i = 0; i < 8; i++) {
      var ch = rows[j][i], o = (j * 8 + i) * 4, k = ch === 'l' ? 1.3 : ch === 'd' ? 0.7 : 1;
      if (ch === '.') continue;
      out[o] = Math.min(255, c[0] * k); out[o + 1] = Math.min(255, c[1] * k); out[o + 2] = Math.min(255, c[2] * k); out[o + 3] = 255;
    }
    return (pixCache[key] = out);
  }

  // 置けるブロック（クリエイティブの一覧に出すもの）
  var PLACEABLE = WG.BLOCKS.filter(function (b) {
    return b.id !== B.AIR && !WG.FLUID[b.id] && b.key !== 'FURNACE_LIT' && !/^WALL_TORCH_/.test(b.key);
  }).map(function (b) { return b.key; });

  // ---- インベントリ：0〜8 がホットバー、9〜35 が中身 ----
  function Inventory() {
    this.slots = new Array(36).fill(null);
    this.sel = 0;
    this.version = 0;
  }
  Inventory.prototype.changed = function () { this.version++; };
  // 入れられた個数を返す（ホットバーから先に、同じアイテムの束を優先）
  Inventory.prototype.add = function (key, n) {
    var max = ITEMS[key].max, s = this.slots, left = n, i;
    for (i = 0; i < 36 && left > 0; i++) {
      if (s[i] && s[i].key === key && s[i].n < max) { var a = Math.min(left, max - s[i].n); s[i].n += a; left -= a; }
    }
    for (i = 0; i < 36 && left > 0; i++) {
      if (!s[i]) { var b = Math.min(left, max); s[i] = { key: key, n: b }; left -= b; }
    }
    if (left !== n) this.changed();
    return n - left;
  };
  Inventory.prototype.held = function () { return this.slots[this.sel]; };
  Inventory.prototype.take = function (i, n) {
    var s = this.slots[i];
    if (!s) return null;
    n = Math.min(n, s.n);
    s.n -= n;
    if (s.n <= 0) this.slots[i] = null;
    this.changed();
    return { key: s.key, n: n };
  };
  Inventory.prototype.clear = function () { this.slots.fill(null); this.changed(); };

  // ---- 画面に出すアイコン（ブラウザのみ） ----
  // ブロックは上・左・右の 3 面を斜めから見た形、それ以外は 8×8 の絵を拡大する。
  var iconCache = {};
  function faceCanvas(id, face, tint) {
    var c = document.createElement('canvas'); c.width = c.height = 8;
    var x = c.getContext('2d'), img = x.createImageData(8, 8), px = WG.skinTexture(id, face), col = WG.skinColor(id, face);
    for (var i = 0; i < 64; i++) {
      var r = px ? px[i * 3] : col[0], g = px ? px[i * 3 + 1] : col[1], b = px ? px[i * 3 + 2] : col[2];
      img.data[i * 4] = r * tint[0]; img.data[i * 4 + 1] = g * tint[1]; img.data[i * 4 + 2] = b * tint[2]; img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  function spriteCanvas(rgba) {
    var c = document.createElement('canvas'); c.width = c.height = 8;
    var x = c.getContext('2d'), img = x.createImageData(8, 8);
    img.data.set(rgba);
    x.putImageData(img, 0, 0);
    return c;
  }
  function iconURL(key) {
    if (iconCache[key]) return iconCache[key];
    var it = ITEMS[key], S = 48, c = document.createElement('canvas');
    c.width = c.height = S;
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    var sprite = it.shape ? itemPixels(key) : WG.skinCutout(it.block) || (WG.blockKind(it.block) === 'plant' && WG.plantPixels ? WG.plantPixels(it.block) : null);
    if (sprite) {
      x.drawImage(spriteCanvas(sprite), 4, 4, 40, 40);
    } else {
      var id = it.block, plains = WG.BI ? WG.BI.PLAINS : -1;
      var tTop = WG.tintOf(id, 'top', plains), tSide = WG.tintOf(id, 'side', plains);
      var top = faceCanvas(id, 'top', tTop), side = faceCanvas(id, 'side', tSide);
      x.setTransform(20 / 8, 10 / 8, -20 / 8, 10 / 8, 24, 3); x.drawImage(top, 0, 0);
      x.setTransform(20 / 8, 10 / 8, 0, 23 / 8, 4, 13); x.drawImage(side, 0, 0);
      x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(0, 0, 8, 8);
      x.setTransform(20 / 8, -10 / 8, 0, 23 / 8, 24, 23); x.drawImage(side, 0, 0);
      x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(0, 0, 8, 8);
      x.setTransform(1, 0, 0, 1, 0, 0);
    }
    return (iconCache[key] = c.toDataURL());
  }

  WG.ITEMS = ITEMS;
  WG.PLACEABLE = PLACEABLE;
  WG.itemPixels = itemPixels;
  WG.Inventory = Inventory;
  WG.iconURL = iconURL;
  WG.itemName = function (key) { return ITEMS[key] ? ITEMS[key].name : key; };
})(typeof window !== 'undefined' ? window : globalThis);
