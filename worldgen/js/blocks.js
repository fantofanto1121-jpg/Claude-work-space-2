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
    ['COBBLED_DEEPSLATE', '丸石状の深層岩', '#4d4d52', 'solid']
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
  var RGB = [], RGB_FACE = [], PIX = [], OPAQUE = new Uint8Array(N), KIND = [], EMIT = new Float32Array(N), TINT = new Uint8Array(N);
  DEF.forEach(function (d, id) {
    B[d[0]] = id;
    LIST.push({ id: id, key: d[0], name: d[1], kind: d[3] });
    KIND[id] = d[3];
    EMIT[id] = d[4] || 0;
    OPAQUE[id] = (d[3] === 'solid' || d[0] === 'LAVA') ? 1 : 0;
    var t = TEX[d[0]], base = d[2] ? hex(d[2]) : [0, 0, 0];
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

  WG.B = B;
  WG.BLOCKS = LIST;
  WG.OPAQUE = OPAQUE;
  WG.EMIT = EMIT;
  WG.blockKind = function (id) { return KIND[id]; };
  WG.blockName = function (id) { return LIST[id] ? LIST[id].name : '不明'; };
  WG.skinColor = skinColor;
  WG.skinTexture = skinTexture;
  WG.tintOf = tintOf;
  WG.blockColor = blockColor;
})(typeof window !== 'undefined' ? window : globalThis);
