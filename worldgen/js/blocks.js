// ブロックの一覧と見た目。見た目の元データは js/textures.js、それがないブロックはここの単色。
// 描画はすべて skinColor(id, face) と skinTexture(id, face) を通る。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};

  // [キー, 名前, 色, 種類, 発光]  種類: air / solid / fluid / plant
  var DEF = [
    ['AIR', '空気', null, 'air'],
    ['BEDROCK', '岩盤', '#4a4a4d', 'solid'],
    ['STONE', '石', '#7f7f7c', 'solid'],
    ['DEEPSLATE', '深層岩', '#55565c', 'solid'],
    ['DIRT', '土', '#7a573b', 'solid'],
    ['GRASS', '草ブロック', '#6e9a48', 'solid'],
    ['SAND', '砂', '#d9cb9c', 'solid'],
    ['SANDSTONE', '砂岩', '#c8b27e', 'solid'],
    ['GRAVEL', '砂利', '#8b8581', 'solid'],
    ['CLAY', '粘土', '#9fa5b0', 'solid'],
    ['SNOW', '雪ブロック', '#eceff1', 'solid'],
    ['ICE', '氷', '#a2c0dc', 'solid'],
    ['WATER', '水', '#3c66a5', 'fluid'],
    ['LAVA', '溶岩', '#d4621c', 'fluid', 1],
    ['OAK_LOG', 'オークの原木', '#6a5132', 'solid'],
    ['OAK_LEAVES', 'オークの葉', '#4b7a30', 'solid'],
    ['BIRCH_LOG', 'シラカバの原木', '#d3cfc1', 'solid'],
    ['BIRCH_LEAVES', 'シラカバの葉', '#6a8c46', 'solid'],
    ['SPRUCE_LOG', 'トウヒの原木', '#4b3723', 'solid'],
    ['SPRUCE_LEAVES', 'トウヒの葉', '#3a5939', 'solid'],
    ['JUNGLE_LOG', 'ジャングルの原木', '#5e4a27', 'solid'],
    ['JUNGLE_LEAVES', 'ジャングルの葉', '#3e7b27', 'solid'],
    ['ACACIA_LOG', 'アカシアの原木', '#696159', 'solid'],
    ['ACACIA_LEAVES', 'アカシアの葉', '#6b8835', 'solid'],
    ['SHORT_GRASS', '草', '#78a153', 'plant'],
    ['DANDELION', 'タンポポ', '#d8bf4a', 'plant'],
    ['POPPY', 'ポピー', '#b23a2e', 'plant'],
    ['CACTUS', 'サボテン', '#557c35', 'solid'],
    ['COBBLESTONE', '丸石', '#6e6e6d', 'solid'],
    ['MOSSY_COBBLESTONE', '苔むした丸石', '#617257', 'solid'],
    ['SPAWNER', 'スポナー', '#2f3843', 'solid'],
    ['CHEST', 'チェスト', '#9a6a32', 'solid'],
    ['COAL_ORE', '石炭鉱石', '#3c3c3c', 'solid'],
    ['IRON_ORE', '鉄鉱石', '#c4a487', 'solid'],
    ['COPPER_ORE', '銅鉱石', '#b3704f', 'solid'],
    ['GOLD_ORE', '金鉱石', '#d9bb59', 'solid'],
    ['REDSTONE_ORE', 'レッドストーン鉱石', '#a62c23', 'solid'],
    ['LAPIS_ORE', 'ラピスラズリ鉱石', '#33519c', 'solid'],
    ['DIAMOND_ORE', 'ダイヤモンド鉱石', '#63b9b2', 'solid'],
    ['DEEPSLATE_COAL_ORE', '深層岩石炭鉱石', '#2f2f33', 'solid'],
    ['DEEPSLATE_IRON_ORE', '深層岩鉄鉱石', '#a68e7b', 'solid'],
    ['DEEPSLATE_COPPER_ORE', '深層岩銅鉱石', '#97624a', 'solid'],
    ['DEEPSLATE_GOLD_ORE', '深層岩金鉱石', '#bba14f', 'solid'],
    ['DEEPSLATE_REDSTONE_ORE', '深層岩レッドストーン鉱石', '#8c2822', 'solid'],
    ['DEEPSLATE_LAPIS_ORE', '深層岩ラピスラズリ鉱石', '#2b4586', 'solid'],
    ['DEEPSLATE_DIAMOND_ORE', '深層岩ダイヤモンド鉱石', '#529c97', 'solid'],
    ['NETHERRACK', 'ネザーラック', '#6c3534', 'solid'],
    ['SOUL_SAND', 'ソウルサンド', '#544030', 'solid'],
    ['SOUL_SOIL', 'ソウルソイル', '#4a3a2d', 'solid'],
    ['MAGMA', 'マグマブロック', '#8e3e1b', 'solid', 0.6],
    ['GLOWSTONE', 'グロウストーン', '#d7b46c', 'solid', 1],
    ['BASALT', '玄武岩', '#4b4b52', 'solid'],
    ['QUARTZ_ORE', 'ネザークォーツ鉱石', '#b39b93', 'solid'],
    ['NETHER_GOLD_ORE', 'ネザー金鉱石', '#a8763b', 'solid'],
    ['END_STONE', 'エンドストーン', '#d8d5a6', 'solid'],
    ['OBSIDIAN', '黒曜石', '#221b31', 'solid'],
    ['END_PORTAL_FRAME', 'エンドポータルフレーム', '#4f6d60', 'solid'],
    ['CHORUS_PLANT', 'コーラスプラント', '#6b5173', 'solid'],
    ['CHORUS_FLOWER', 'コーラスフラワー', '#9c85a3', 'solid'],
    ['COBBLED_DEEPSLATE', '丸石状の深層岩', '#4d4d52', 'solid'],
    // クラフトで作るブロック
    ['OAK_PLANKS', 'オークの板材', '#a5824f', 'solid'],
    ['BIRCH_PLANKS', 'シラカバの板材', '#c9b783', 'solid'],
    ['SPRUCE_PLANKS', 'トウヒの板材', '#73563a', 'solid'],
    ['JUNGLE_PLANKS', 'ジャングルの板材', '#a2734f', 'solid'],
    ['ACACIA_PLANKS', 'アカシアの板材', '#aa5a32', 'solid'],
    ['CRAFTING_TABLE', '作業台', '#8d6a43', 'solid'],
    ['FURNACE', 'かまど', '#6e6e6e', 'solid'],
    ['FURNACE_LIT', 'かまど（燃焼中）', '#6e6e6e', 'solid'],
    ['TORCH', 'トーチ', '#e2a83a', 'deco'],
    ['WALL_TORCH_N', '壁掛けトーチ', '#e2a83a', 'deco'],
    ['WALL_TORCH_S', '壁掛けトーチ', '#e2a83a', 'deco'],
    ['WALL_TORCH_E', '壁掛けトーチ', '#e2a83a', 'deco'],
    ['WALL_TORCH_W', '壁掛けトーチ', '#e2a83a', 'deco'],
    ['COAL_BLOCK', '石炭ブロック', '#1e1e20', 'solid'],
    ['IRON_BLOCK', '鉄ブロック', '#d8d8d8', 'solid'],
    ['GOLD_BLOCK', '金ブロック', '#e8c540', 'solid'],
    ['COPPER_BLOCK', '銅ブロック', '#c06f52', 'solid'],
    ['DIAMOND_BLOCK', 'ダイヤモンドブロック', '#66d6cf', 'solid'],
    ['LAPIS_BLOCK', 'ラピスラズリブロック', '#244a9a', 'solid'],
    ['REDSTONE_BLOCK', 'レッドストーンブロック', '#a8180f', 'solid'],
    ['QUARTZ_BLOCK', '水晶ブロック', '#e8e3dc', 'solid'],
    ['STONE_BRICKS', '石レンガ', '#7b7b7b', 'solid'],
    ['BRICKS', 'レンガ', '#a5604d', 'solid'],
    ['NETHER_BRICKS', 'ネザーレンガ', '#2f1719', 'solid'],
    // 流れる水と溶岩（1〜7 は流れの段階、FALL は落ちているもの）
    ['WATER_1', '水（流れ）', '#3c66a5', 'fluid'], ['WATER_2', '水（流れ）', '#3c66a5', 'fluid'],
    ['WATER_3', '水（流れ）', '#3c66a5', 'fluid'], ['WATER_4', '水（流れ）', '#3c66a5', 'fluid'],
    ['WATER_5', '水（流れ）', '#3c66a5', 'fluid'], ['WATER_6', '水（流れ）', '#3c66a5', 'fluid'],
    ['WATER_7', '水（流れ）', '#3c66a5', 'fluid'], ['WATER_FALL', '水（落ちる）', '#3c66a5', 'fluid'],
    ['LAVA_1', '溶岩（流れ）', '#d4621c', 'fluid', 1], ['LAVA_2', '溶岩（流れ）', '#d4621c', 'fluid', 1],
    ['LAVA_3', '溶岩（流れ）', '#d4621c', 'fluid', 1], ['LAVA_4', '溶岩（流れ）', '#d4621c', 'fluid', 1],
    ['LAVA_5', '溶岩（流れ）', '#d4621c', 'fluid', 1], ['LAVA_6', '溶岩（流れ）', '#d4621c', 'fluid', 1],
    ['LAVA_7', '溶岩（流れ）', '#d4621c', 'fluid', 1], ['LAVA_FALL', '溶岩（落ちる）', '#d4621c', 'fluid', 1],
    ['GLASS', 'ガラス', '#d7e7e9', 'solid'],
    ['WHITE_WOOL', '白色の羊毛', '#e9e9e7', 'solid'],
    // ベッド：足側と頭側の 2 マス。N・E・S・W は足から頭への向き。
    ['BED_FOOT_N', '白色のベッド', '#e9e9e7', 'bed'], ['BED_FOOT_E', '白色のベッド', '#e9e9e7', 'bed'],
    ['BED_FOOT_S', '白色のベッド', '#e9e9e7', 'bed'], ['BED_FOOT_W', '白色のベッド', '#e9e9e7', 'bed'],
    ['BED_HEAD_N', '白色のベッド', '#e9e9e7', 'bed'], ['BED_HEAD_E', '白色のベッド', '#e9e9e7', 'bed'],
    ['BED_HEAD_S', '白色のベッド', '#e9e9e7', 'bed'], ['BED_HEAD_W', '白色のベッド', '#e9e9e7', 'bed']
  ];

  // 見た目（js/textures.js の 8×8 ピクセル）。ないブロックは上の単色を使う。
  var FACES = ['top', 'side', 'bottom'];
  // バイオームで色味を変えるブロック（草の上面と葉）
  var TINTED = ['GRASS', 'SHORT_GRASS', 'OAK_LEAVES', 'JUNGLE_LEAVES', 'ACACIA_LEAVES'];

  function hex(h) {
    return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
  }
  function decode(b64) {
    var bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    var a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function average(px) {
    var r = 0, g = 0, b = 0, n = px.length / 3;
    for (var i = 0; i < px.length; i += 3) { r += px[i]; g += px[i + 1]; b += px[i + 2]; }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  }

  var B = {}, LIST = [], N = DEF.length, TEX = WG.TEXTURES || {};
  // 流れる水・溶岩は、元の水・溶岩と同じ見た目
  function texOf(key) { return TEX[key] || (/^WATER_/.test(key) ? TEX.WATER : /^LAVA_/.test(key) ? TEX.LAVA : /^WALL_TORCH_/.test(key) ? TEX.TORCH : /^BED_/.test(key) ? TEX.BED : null); }
  var CUT = [];
  var RGB = [], RGB_FACE = [], PIX = [], OPAQUE = new Uint8Array(N), KIND = [], EMIT = new Float32Array(N), TINT = new Uint8Array(N);
  DEF.forEach(function (d, id) {
    B[d[0]] = id;
    LIST.push({ id: id, key: d[0], name: d[1], kind: d[3] });
    KIND[id] = d[3];
    EMIT[id] = d[4] || 0;
    OPAQUE[id] = (d[3] === 'solid' || d[0] === 'LAVA') ? 1 : 0;
    var t = texOf(d[0]), base = d[2] ? hex(d[2]) : [0, 0, 0];
    if (t && t.mask) {
      // 切り抜きの見た目（RGBA）
      var rgb = decode(t.side), m = decode(t.mask), cut = new Uint8Array(256);
      for (var q = 0; q < 64; q++) { cut[q * 4] = rgb[q * 3]; cut[q * 4 + 1] = rgb[q * 3 + 1]; cut[q * 4 + 2] = rgb[q * 3 + 2]; cut[q * 4 + 3] = m[q]; }
      CUT[id] = cut;
    }
    RGB_FACE[id] = {}; PIX[id] = null;
    if (t) {
      PIX[id] = {};
      FACES.forEach(function (f) { PIX[id][f] = decode(t[f]); RGB_FACE[id][f] = average(PIX[id][f]); });
      RGB[id] = RGB_FACE[id].side;
    } else {
      RGB[id] = base;
      FACES.forEach(function (f) { RGB_FACE[id][f] = base; });
    }
  });
  TINTED.forEach(function (k) { TINT[B[k]] = 1; });

  // 描画の入口。素材を差し替えるときは、この 2 つの関数（と js/textures.js）を置き換える。
  // face は 'top' | 'side' | 'bottom'（省略時は側面）。返す配列は書き換えないこと。
  // skinColor: 面の代表色（見た目の平均色）。1 ブロックを 1 点で描くときに使う。
  function skinColor(id, face) {
    return face ? RGB_FACE[id][face] : RGB[id];
  }
  // skinTexture: 面の 8×8 ピクセル（RGB を左上から行ごとに 192 バイト）。見た目がなければ null。
  function skinTexture(id, face) {
    return PIX[id] ? PIX[id][face || 'side'] : null;
  }

  // バイオームの色味（掛け算の係数）。草の側面には掛けない。
  var ONE = [1, 1, 1];
  function tintOf(id, face, biome) {
    if (biome == null || biome < 0 || !TINT[id] || (id === B.GRASS && face !== 'top') || !WG.BIOMES) return ONE;
    return WG.BIOMES[biome].tint;
  }

  // バイオームの色味を掛けた代表色
  var tintCache = {};
  function blockColor(id, face, biome) {
    var c = skinColor(id, face), m = tintOf(id, face, biome);
    if (m === ONE) return c;
    var k = id + ':' + biome + ':' + (face || '');
    var t = tintCache[k];
    if (!t) t = tintCache[k] = [Math.min(255, c[0] * m[0]), Math.min(255, c[1] * m[1]), Math.min(255, c[2] * m[2])];
    return t;
  }

  // ---- 流体 ----
  // FLUID: 0 なし、1 水、2 溶岩。FLUID_LEVEL: 0 が元（水源）、1〜7 が流れ、8 が落ちているもの。
  var FLUID = new Uint8Array(N), FLUID_LEVEL = new Uint8Array(N), FLUID_ID = [[], [], []];
  LIST.forEach(function (b) {
    var m = /^(WATER|LAVA)(?:_(\d|FALL))?$/.exec(b.key);
    if (!m) return;
    var type = m[1] === 'WATER' ? 1 : 2, lv = m[2] === 'FALL' ? 8 : m[2] ? +m[2] : 0;
    FLUID[b.id] = type; FLUID_LEVEL[b.id] = lv; FLUID_ID[type][lv] = b.id;
    if (type === 2) OPAQUE[b.id] = lv === 0 ? 1 : 0;   // 流れる溶岩は低いので、隣の面を隠さない
  });

  // ---- 光 ----
  // LIGHT_EMIT: 自分が出す光（0〜15）。PDF の「光源レベル」と同じ値。
  // LIGHT_BLOCK: 光を遮る量。不透明なブロックは 15、葉・水・氷は 1（1 マスごとに 1 余分に暗くなる）、空気・草花・トーチは 0。
  var LIGHT_EMIT = new Uint8Array(N), LIGHT_BLOCK = new Uint8Array(N);
  LIST.forEach(function (b) {
    var k = b.key;
    if (OPAQUE[b.id]) LIGHT_BLOCK[b.id] = 15;
    if (/_LEAVES$/.test(k) || FLUID[b.id] === 1 || k === 'ICE') LIGHT_BLOCK[b.id] = 1;
    if (FLUID[b.id] === 2) { LIGHT_EMIT[b.id] = 15; LIGHT_BLOCK[b.id] = 0; }
  });
  [['GLOWSTONE', 15], ['MAGMA', 3], ['TORCH', 14], ['WALL_TORCH_N', 14], ['WALL_TORCH_S', 14], ['WALL_TORCH_E', 14], ['WALL_TORCH_W', 14],
    ['FURNACE_LIT', 13], ['END_PORTAL_FRAME', 1]].forEach(function (e) { LIGHT_EMIT[B[e[0]]] = e[1]; });
  EMIT[B.FURNACE_LIT] = 0.25;
  // ガラス：固くて通れないが、向こうが見え、光も通す
  OPAQUE[B.GLASS] = 0; LIGHT_BLOCK[B.GLASS] = 0;
  // ぶつかる高さ（固いブロックは 1、ベッドは 9/16、ほかは 0）
  var COLLIDE = new Float32Array(N);
  LIST.forEach(function (b) { COLLIDE[b.id] = b.kind === 'solid' ? 1 : b.kind === 'bed' ? 9 / 16 : 0; });
  WG.COLLIDE = COLLIDE;
  // ベッド：足から頭への向き [dx, dz]、頭側か
  WG.BED_DIR = {}; WG.BED_HEAD = {};
  ['N', 'E', 'S', 'W'].forEach(function (d) {
    var v = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[d];
    WG.BED_DIR[B['BED_FOOT_' + d]] = v; WG.BED_DIR[B['BED_HEAD_' + d]] = v; WG.BED_HEAD[B['BED_HEAD_' + d]] = true;
  });

  WG.FLUID = FLUID;
  WG.FLUID_LEVEL = FLUID_LEVEL;
  WG.fluidId = function (type, level) { return FLUID_ID[type][level]; };
  WG.isWater = function (id) { return FLUID[id] === 1; };
  WG.isLava = function (id) { return FLUID[id] === 2; };
  WG.LIGHT_EMIT = LIGHT_EMIT;
  WG.LIGHT_BLOCK = LIGHT_BLOCK;

  WG.B = B;
  WG.BLOCKS = LIST;
  WG.OPAQUE = OPAQUE;
  WG.EMIT = EMIT;
  WG.blockKind = function (id) { return KIND[id]; };
  WG.blockName = function (id) { return LIST[id] ? LIST[id].name : '不明'; };
  WG.skinColor = skinColor;
  // 切り抜きの見た目（RGBA 8×8、透明な所は描かない）。なければ null。
  WG.skinCutout = function (id) { return CUT[id] || null; };
  // 6 面とも切り抜きのブロック（ガラス）
  WG.cutoutAllFaces = function (id) { var t = texOf(LIST[id].key); return !!(t && t.allFaces); };
  WG.skinTexture = skinTexture;
  WG.tintOf = tintOf;
  WG.blockColor = blockColor;
})(typeof window !== 'undefined' ? window : globalThis);
