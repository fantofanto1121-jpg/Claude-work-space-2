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
    ['QUARTZ_BLOCK', 0.8, 'QUARTZ_BLOCK'], ['STONE_BRICKS', 1.5, 'STONE_BRICKS'], ['BRICKS', 2, 'BRICKS'], ['NETHER_BRICKS', 2, 'NETHER_BRICKS'],
    ['GLASS', 0.3, null], ['WHITE_WOOL', 0.8, 'WHITE_WOOL'],
    // ベッドは PDF ではドロップ「なし」だが、Minecraft と同じくベッドが出るようにした
    ['BED_FOOT_N', 0.2, 'BED'], ['BED_FOOT_E', 0.2, 'BED'], ['BED_FOOT_S', 0.2, 'BED'], ['BED_FOOT_W', 0.2, 'BED'],
    ['BED_HEAD_N', 0.2, 'BED'], ['BED_HEAD_E', 0.2, 'BED'], ['BED_HEAD_S', 0.2, 'BED'], ['BED_HEAD_W', 0.2, 'BED']
  ];
  // 食べ物 [キー, 名前, 形, 色, 満腹度, 隠し満腹度の倍率]（Minecraft の値）
  var FOOD_DATA = [
    ['RAW_PORKCHOP', '生の豚肉', 'meat', '#e59a93', 3, 0.3], ['COOKED_PORKCHOP', '焼き豚', 'meat', '#b8794a', 8, 0.8],
    ['RAW_BEEF', '生の牛肉', 'meat', '#c4473f', 3, 0.3], ['COOKED_BEEF', 'ステーキ', 'meat', '#7a4a2c', 8, 0.8],
    ['RAW_MUTTON', '生の羊肉', 'meat', '#d4635b', 2, 0.3], ['COOKED_MUTTON', '焼き羊肉', 'meat', '#9a5a36', 6, 0.8],
    ['RAW_CHICKEN', '生の鶏肉', 'drumstick', '#efc9b8', 2, 0.3], ['COOKED_CHICKEN', '焼き鳥', 'drumstick', '#c88a4a', 6, 0.6],
    ['ROTTEN_FLESH', '腐った肉', 'meat', '#8a7a4a', 4, 0.1]
  ];

  // 掘るのに向いた道具と、ドロップに必要な道具の段階（Minecraft の値）。
  // 段階：0 木、1 石、2 鉄、3 ダイヤモンド（金は 0 と同じ）。表にないブロックは素手でもドロップする。
  // PDF の「採掘道具」の欄には Minecraft と食い違う所（鉄鉱石が「素手でも可」など）があるため、ここは Minecraft に合わせた。
  var MINE = {};
  function mine(tool, tier, keys) { keys.split(' ').forEach(function (k) { MINE[k] = { tool: tool, tier: tier }; }); }
  mine('pickaxe', 0, 'STONE COBBLESTONE MOSSY_COBBLESTONE DEEPSLATE COBBLED_DEEPSLATE SANDSTONE COAL_ORE DEEPSLATE_COAL_ORE NETHERRACK ' +
    'QUARTZ_ORE NETHER_GOLD_ORE BASALT END_STONE MAGMA SPAWNER FURNACE FURNACE_LIT COAL_BLOCK QUARTZ_BLOCK STONE_BRICKS BRICKS NETHER_BRICKS REDSTONE_BLOCK');
  mine('pickaxe', 1, 'IRON_ORE DEEPSLATE_IRON_ORE COPPER_ORE DEEPSLATE_COPPER_ORE LAPIS_ORE DEEPSLATE_LAPIS_ORE IRON_BLOCK COPPER_BLOCK LAPIS_BLOCK');
  mine('pickaxe', 2, 'GOLD_ORE DEEPSLATE_GOLD_ORE DIAMOND_ORE DEEPSLATE_DIAMOND_ORE REDSTONE_ORE DEEPSLATE_REDSTONE_ORE GOLD_BLOCK DIAMOND_BLOCK');
  mine('pickaxe', 3, 'OBSIDIAN');
  mine('shovel', 0, 'SNOW');
  // 速く掘れるが、素手でもドロップするもの
  var FAST = {};
  'ICE GLASS'.split(' ').forEach(function (k) { FAST[k] = 'pickaxe'; });
  'OAK_LOG BIRCH_LOG SPRUCE_LOG JUNGLE_LOG ACACIA_LOG OAK_PLANKS BIRCH_PLANKS SPRUCE_PLANKS JUNGLE_PLANKS ACACIA_PLANKS CRAFTING_TABLE CHEST'.split(' ').forEach(function (k) { FAST[k] = 'axe'; });
  'DIRT GRASS SAND GRAVEL CLAY SOUL_SAND SOUL_SOIL'.split(' ').forEach(function (k) { FAST[k] = 'shovel'; });

  // 道具：素材ごとの速さ・段階・耐久値（Minecraft の値）
  var TOOL_MATS = [
    ['WOODEN', '木', 2, 0, 59, '#a5824f', 'PLANKS'], ['STONE', '石', 4, 1, 131, '#8c8c8a', 'COBBLES'],
    ['IRON', '鉄', 6, 2, 250, '#dcdcda', 'IRON_INGOT'], ['GOLDEN', '金', 12, 0, 32, '#e8c540', 'GOLD_INGOT'],
    ['DIAMOND', 'ダイヤモンド', 8, 3, 1561, '#62c9c0', 'DIAMOND']
  ];
  var TOOL_TYPES = [['PICKAXE', 'pickaxe', 'ツルハシ'], ['AXE', 'axe', '斧'], ['SHOVEL', 'shovel', 'シャベル']];

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
    // 道具（S は柄の色）
    pickaxe: ['.d####d.', 'd..S...d', '...S....', '...S....', '...S....', '...S....', '...S....', '........'],
    axe: ['..l#S...', '.##dS...', '.#d.S...', '....S...', '....S...', '....S...', '....S...', '........'],
    shovel: ['...l#...', '..####..', '..#dd#..', '...dd...', '...S....', '...S....', '...S....', '...S....'],
    ingot: ['........', '........', '...llll.', '..#lll#d', '.######d', '.#####dd', '........', '........'],
    meat: ['........', '..###...', '.#l####.', '.#####d.', '.#ll##d.', '..##ddd.', '...ddd..', '........'],
    drumstick: ['........', '.....##.', '....#l##', '...###d#', '..###dd.', '.S##d...', 'SS......', '........']
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
  // 攻撃力（Minecraft の値）：素手 1、ツルハシ・斧・シャベルは素材ごと
  var ATTACK = { pickaxe: [2, 3, 4, 2, 5], axe: [7, 9, 9, 7, 9], shovel: [2.5, 3.5, 4.5, 2.5, 5.5] };
  TOOL_MATS.forEach(function (m, mi) {
    TOOL_TYPES.forEach(function (t) {
      var key = m[0] + '_' + t[0];
      ITEMS[key] = { key: key, name: m[1] + 'の' + t[2], block: -1, max: 1, shape: t[1], color: m[5], tool: t[1], speed: m[2], tier: m[3], dur: m[4], mat: m[6], attack: ATTACK[t[1]][mi] };
    });
  });
  FOOD_DATA.forEach(function (d) { ITEMS[d[0]] = { key: d[0], name: d[1], block: -1, max: 64, shape: d[2], color: d[3], food: d[4], sat: d[5] }; });
  // ベッド（置くと 2 マスになる）
  ITEMS.BED = { key: 'BED', name: '白色のベッド', block: -1, max: 1, bed: true };
  Object.keys(ITEMS).forEach(function (k) {
    var it = ITEMS[k];
    if (it.block < 0) return;
    if (MINE[k]) { it.tool = MINE[k].tool; it.needTier = MINE[k].tier; }
    else if (FAST[k]) it.tool = FAST[k];
  });

  // 掘る速さとドロップ（Minecraft と同じ式）。held は持っている束（なければ null）。
  // 1 刻みに進む割合 = 速さ ÷ 硬度 ÷（ドロップできるなら 30、できないなら 100）。
  function mining(blockKey, held) {
    var b = ITEMS[blockKey], h = b ? b.hardness : 1, tool = held ? ITEMS[held.key] : null;
    var match = !!(tool && tool.speed && tool.tool && b && b.tool === tool.tool);   // 道具だけ（ブロックのアイテムは「向いている道具」を持つが、道具ではない）
    var speed = match ? tool.speed : 1;
    var harvest = !(b && b.needTier != null) || (match && tool.tier >= b.needTier);
    if (h < 0) return { perTick: 0, harvest: false, match: match };
    return { perTick: h === 0 ? 1 : speed / h / (harvest ? 30 : 100), harvest: harvest, match: match };
  }
  // 持っているもので叩いたときの攻撃力
  function attackDamage(held) {
    var it = held ? ITEMS[held.key] : null;
    return it && it.attack ? it.attack : 1;
  }

  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }

  // アイテムの絵（RGBA 8×8）。ブロックのアイテムは null（ブロックの見た目を使う）。
  var pixCache = {}, HANDLE = [107, 79, 46];
  function itemPixels(key) {
    var it = ITEMS[key];
    if (!it || !it.shape) return null;
    if (pixCache[key]) return pixCache[key];
    var rows = SHAPES[it.shape], c = hex(it.color), out = new Uint8Array(256);
    for (var j = 0; j < 8; j++) for (var i = 0; i < 8; i++) {
      var ch = rows[j][i], o = (j * 8 + i) * 4, k = ch === 'l' ? 1.3 : ch === 'd' ? 0.7 : 1, cc = ch === 'S' ? HANDLE : c;
      if (ch === '.') continue;
      if (ch === 'S') k = 1;
      out[o] = Math.min(255, cc[0] * k); out[o + 1] = Math.min(255, cc[1] * k); out[o + 2] = Math.min(255, cc[2] * k); out[o + 3] = 255;
    }
    return (pixCache[key] = out);
  }

  // 置けるブロック（クリエイティブの一覧に出すもの）
  var PLACEABLE = WG.BLOCKS.filter(function (b) {
    return b.id !== B.AIR && !WG.FLUID[b.id] && b.key !== 'FURNACE_LIT' && !/^WALL_TORCH_/.test(b.key) && !/^BED_/.test(b.key);
  }).map(function (b) { return b.key; });

  // ---- インベントリ：0〜8 がホットバー、9〜35 が中身 ----
  function Inventory() {
    this.slots = new Array(36).fill(null);
    this.sel = 0;
    this.version = 0;
  }
  Inventory.prototype.changed = function () { this.version++; };
  // 入れられた個数を返す（ホットバーから先に、同じアイテムの束を優先）
  // dmg は道具の使った回数（道具だけ。束にならないので 1 つずつ持たせる）
  Inventory.prototype.add = function (key, n, dmg) {
    var max = ITEMS[key].max, s = this.slots, left = n, i;
    for (i = 0; i < 36 && left > 0; i++) {
      if (s[i] && s[i].key === key && s[i].n < max) { var a = Math.min(left, max - s[i].n); s[i].n += a; left -= a; }
    }
    for (i = 0; i < 36 && left > 0; i++) {
      if (!s[i]) { var b = Math.min(left, max); s[i] = { key: key, n: b }; if (dmg) s[i].dmg = dmg; left -= b; }
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
    var sprite = it.shape ? itemPixels(key) : it.bed ? WG.skinCutout(B.BED_FOOT_N) : (WG.blockKind(it.block) === 'deco' && WG.skinCutout(it.block)) || (WG.blockKind(it.block) === 'plant' && WG.plantPixels ? WG.plantPixels(it.block) : null);
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
  WG.mining = mining;
  WG.attackDamage = attackDamage;
  WG.TOOL_MATS = TOOL_MATS;
  WG.TOOL_TYPES = TOOL_TYPES;
  WG.PLACEABLE = PLACEABLE;
  WG.itemPixels = itemPixels;
  WG.Inventory = Inventory;
  WG.iconURL = iconURL;
  WG.itemName = function (key) { return ITEMS[key] ? ITEMS[key].name : key; };
})(typeof window !== 'undefined' ? window : globalThis);
