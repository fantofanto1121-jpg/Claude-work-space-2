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

  // ---- アイテム図鑑 PDF から加えたブロック ----
  // 畑と作物、キノコ、クモの巣、火、扉・階段・ハーフブロック・柵・はしご（向きや開け閉めは別のブロックとして持つ）
  var DIR4 = ['N', 'E', 'S', 'W'];
  var WOODS = [['OAK', 'オーク', '#a5824f'], ['SPRUCE', 'トウヒ', '#73563a'], ['ACACIA', 'アカシア', '#aa5a32'], ['BIRCH', 'シラカバ', '#c9b783'], ['JUNGLE', 'ジャングル', '#a2734f']];
  // 階段とハーフブロックの素材 [キーの頭, 名前, 見た目を借りるブロック, 色]
  var SHAPE_MATS = [['OAK', 'オークの', 'OAK_PLANKS', '#a5824f'], ['SPRUCE', 'トウヒの', 'SPRUCE_PLANKS', '#73563a'],
    ['ACACIA', 'アカシアの', 'ACACIA_PLANKS', '#aa5a32'], ['BIRCH', 'シラカバの', 'BIRCH_PLANKS', '#c9b783'], ['JUNGLE', 'ジャングルの', 'JUNGLE_PLANKS', '#a2734f'],
    ['COBBLESTONE', '丸石の', 'COBBLESTONE', '#6e6e6d'],
    ['STONE_BRICK', '石レンガの', 'STONE_BRICKS', '#7b7b7b'], ['SANDSTONE', '砂岩の', 'SANDSTONE', '#c8b27e'], ['BRICK', 'レンガの', 'BRICKS', '#a5604d']];
  var ALIAS = {};   // 見た目を借りるブロック（キー → キー）
  DEF.push(['FARMLAND', '耕地', '#6b4a2f', 'farm'], ['FARMLAND_MOIST', '耕地（湿っている）', '#4a3220', 'farm']);
  for (var s8 = 0; s8 < 8; s8++) DEF.push(['WHEAT_' + s8, '小麦', '#8db04a', 'crop']);
  for (var s4 = 0; s4 < 4; s4++) DEF.push(['CARROTS_' + s4, 'ニンジン', '#5f9a35', 'crop'], ['POTATOES_' + s4, 'ジャガイモ', '#4f8a35', 'crop']);
  DEF.push(['BROWN_MUSHROOM', '茶色のキノコ', '#9a7457', 'plant'], ['RED_MUSHROOM', '赤色のキノコ', '#c43c32', 'plant'],
    ['COBWEB', 'クモの巣', '#e4e6e8', 'web'], ['FIRE', '火', '#e8902a', 'fire', 1]);
  WOODS.forEach(function (w) {
    DIR4.forEach(function (d) {
      ['C', 'O'].forEach(function (o) {
        ['L', 'U'].forEach(function (h) { DEF.push([w[0] + '_DOOR_' + d + o + h, w[1] + 'のドア', w[2], 'door']); });
      });
    });
    DEF.push([w[0] + '_FENCE', w[1] + 'の柵', w[2], 'fence']);
    ALIAS[w[0] + '_FENCE'] = w[0] + '_PLANKS';
  });
  SHAPE_MATS.forEach(function (m) {
    // 階段：向き 4 つ × 上下（_T は逆さま）。角の形は隣の階段から決める（WG.blockBoxes）
    DIR4.forEach(function (d) {
      ['', '_T'].forEach(function (t) { DEF.push([m[0] + '_STAIRS_' + d + t, m[1] + '階段', m[3], 'stairs']); ALIAS[m[0] + '_STAIRS_' + d + t] = m[2]; });
    });
    DEF.push([m[0] + '_SLAB', m[1] + 'ハーフブロック', m[3], 'slab'], [m[0] + '_SLAB_TOP', m[1] + 'ハーフブロック', m[3], 'slab'],
      [m[0] + '_SLAB_DOUBLE', m[1] + 'ハーフブロック（2 段）', m[3], 'solid']);
    ALIAS[m[0] + '_SLAB'] = ALIAS[m[0] + '_SLAB_TOP'] = ALIAS[m[0] + '_SLAB_DOUBLE'] = m[2];
  });
  DIR4.forEach(function (d) { DEF.push(['LADDER_' + d, 'はしご', '#a5824f', 'ladder']); });

  // ---- レッドストーン ----
  // 粉は強さ 0〜15 を ID で持つ。トーチ・レバー・ボタン・感圧板・リピーター・ピストンは、向きと状態を ID で持つ。
  // 壁に付くものの向き（N・E・S・W）は壁掛けトーチと同じ：E は西（−x）の壁に付いて東を向く。F は床。
  for (var rp = 0; rp < 16; rp++) DEF.push(['REDSTONE_WIRE_' + rp, 'レッドストーンダスト', '#8a1a12', 'wire']);
  DEF.push(['REDSTONE_TORCH', 'レッドストーントーチ', '#d0342a', 'rtorch'], ['REDSTONE_TORCH_OFF', 'レッドストーントーチ', '#5a2a24', 'rtorch']);
  DIR4.forEach(function (d) { DEF.push(['REDSTONE_WALL_TORCH_' + d, 'レッドストーントーチ', '#d0342a', 'rtorch'], ['REDSTONE_WALL_TORCH_' + d + '_OFF', 'レッドストーントーチ', '#5a2a24', 'rtorch']); });
  ['F', 'N', 'E', 'S', 'W'].forEach(function (f) {
    DEF.push(['LEVER_' + f, 'レバー', '#8a8a86', 'lever'], ['LEVER_' + f + '_ON', 'レバー', '#8a8a86', 'lever']);
    DEF.push(['STONE_BUTTON_' + f, '石のボタン', '#8a8a86', 'button'], ['STONE_BUTTON_' + f + '_ON', '石のボタン', '#8a8a86', 'button']);
    DEF.push(['OAK_BUTTON_' + f, 'オークのボタン', '#a5824f', 'button'], ['OAK_BUTTON_' + f + '_ON', 'オークのボタン', '#a5824f', 'button']);
  });
  DEF.push(['STONE_PRESSURE_PLATE', '石の感圧板', '#8a8a86', 'plate'], ['STONE_PRESSURE_PLATE_ON', '石の感圧板', '#8a8a86', 'plate'],
    ['OAK_PRESSURE_PLATE', 'オークの感圧板', '#a5824f', 'plate'], ['OAK_PRESSURE_PLATE_ON', 'オークの感圧板', '#a5824f', 'plate'],
    ['REDSTONE_LAMP', 'レッドストーンランプ', '#8a3a24', 'solid'], ['REDSTONE_LAMP_ON', 'レッドストーンランプ', '#e8b060', 'solid'],
    ['TNT', 'TNT', '#c4291f', 'solid']);
  // レバー・ボタン・感圧板は、素材のブロックの見た目を借りる（地図の色など）
  LIST_KEYS_ALIAS();
  function LIST_KEYS_ALIAS() {
    DEF.forEach(function (d) {
      var k = d[0];
      if (/^LEVER_/.test(k)) ALIAS[k] = 'COBBLESTONE';
      else if (/^(STONE_BUTTON_|STONE_PRESSURE_PLATE)/.test(k)) ALIAS[k] = 'STONE';
      else if (/^(OAK_BUTTON_|OAK_PRESSURE_PLATE)/.test(k)) ALIAS[k] = 'OAK_PLANKS';
    });
  }
  DIR4.forEach(function (d) { for (var dl = 1; dl <= 4; dl++) DEF.push(['REPEATER_' + d + dl, 'リピーター', '#8a8a86', 'repeater'], ['REPEATER_' + d + dl + '_ON', 'リピーター', '#8a8a86', 'repeater']); });
  ['N', 'E', 'S', 'W'].forEach(function (d) { ['C', 'O'].forEach(function (o) { ['L', 'U'].forEach(function (h) { DEF.push(['IRON_DOOR_' + d + o + h, '鉄のドア', '#d0d0d0', 'door']); }); }); });
  ['N', 'E', 'S', 'W', 'U', 'D'].forEach(function (f) {
    DEF.push(['PISTON_' + f, 'ピストン', '#9a8a6a', 'piston'], ['PISTON_' + f + '_X', 'ピストン', '#9a8a6a', 'piston'],
      ['STICKY_PISTON_' + f, '粘着ピストン', '#8a9a6a', 'piston'], ['STICKY_PISTON_' + f + '_X', '粘着ピストン', '#8a9a6a', 'piston'],
      ['PISTON_HEAD_' + f, 'ピストンヘッド', '#a5824f', 'phead'], ['STICKY_PISTON_HEAD_' + f, 'ピストンヘッド', '#8a9a6a', 'phead']);
    ALIAS['PISTON_' + f] = ALIAS['PISTON_' + f + '_X'] = ALIAS['PISTON_HEAD_' + f] = 'PISTON';
    ALIAS['STICKY_PISTON_' + f] = ALIAS['STICKY_PISTON_' + f + '_X'] = ALIAS['STICKY_PISTON_HEAD_' + f] = 'STICKY_PISTON';
  });
  // ---- レッドストーンの部品（追加）----
  // ホッパー：下（D）か横へ出す。ディスペンサー・ドロッパー・オブザーバーは 6 方向（オブザーバーの向きは「顔」の向き）。
  // コンパレーター：向き × 比較（C）・減算（S）× オン。日照センサー（反転あり）、音符ブロック。
  ['D', 'N', 'E', 'S', 'W'].forEach(function (f) { DEF.push(['HOPPER_' + f, 'ホッパー', '#4a4a4c', 'hopper']); ALIAS['HOPPER_' + f] = 'HOPPER'; });
  ['N', 'E', 'S', 'W', 'U', 'D'].forEach(function (f) {
    DEF.push(['DISPENSER_' + f, 'ディスペンサー', '#7a7a7a', 'solid'], ['DROPPER_' + f, 'ドロッパー', '#7a7a7a', 'solid'],
      ['OBSERVER_' + f, 'オブザーバー', '#646464', 'solid'], ['OBSERVER_' + f + '_ON', 'オブザーバー', '#646464', 'solid']);
  });
  DIR4.forEach(function (d) { ['C', 'S'].forEach(function (m) { ['', '_ON'].forEach(function (o) { DEF.push(['COMPARATOR_' + d + m + o, 'コンパレーター', '#9a9286', 'comparator']); ALIAS['COMPARATOR_' + d + m + o] = 'COMPARATOR_BASE'; }); }); });
  DEF.push(['DAYLIGHT_DETECTOR', '日照センサー', '#c8b98a', 'daylight'], ['DAYLIGHT_DETECTOR_INV', '日照センサー（反転）', '#7a8aa8', 'daylight'],
    ['NOTE_BLOCK', '音符ブロック', '#7a4e30', 'solid']);

  // ---- エンチャント・醸造 ----
  DEF.push(['ENCHANTING_TABLE', 'エンチャントテーブル', '#5a2a6a', 'etable', 0.4], ['BOOKSHELF', '本棚', '#8a6a3e', 'solid'],
    ['BREWING_STAND', '醸造台', '#8a8a86', 'stand', 0.1], ['ANVIL', '金床', '#4a4a4c', 'anvil'],
    ['SUGAR_CANE', 'サトウキビ', '#8ac25a', 'cane']);
  for (var nw = 0; nw < 4; nw++) DEF.push(['NETHER_WART_' + nw, 'ネザーウォート', '#8a1a22', 'crop']);
  WG.SHAPE_MATS = SHAPE_MATS; WG.WOODS = WOODS;

  // 見た目（js/textures.js の 8×8 ピクセル）。ないブロックは上の単色を使う。
  var FACES = ['top', 'side', 'bottom'];
  // バイオームで色味を変えるブロック（草の上面と葉）
  var TINTED = ['GRASS', 'SHORT_GRASS', 'OAK_LEAVES', 'JUNGLE_LEAVES', 'ACACIA_LEAVES'];

  function hex(h) {
    return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
  }
  function decode(b64) {
    if (typeof b64 !== 'string') return b64;   // js/newtex.js で作った見た目はそのまま
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
  function texOf(key) {
    if (TEX[key]) return TEX[key];
    if (ALIAS[key]) return TEX[ALIAS[key]];
    var m = /^(\w+)_DOOR_[NESW][CO]([LU])$/.exec(key);
    if (m) return TEX[m[1] + '_DOOR_' + m[2]];
    if (/^LADDER_/.test(key)) return TEX.LADDER;
    if (/^REPEATER_/.test(key)) return TEX.REPEATER_BASE;
    var om = /^(DISPENSER|DROPPER|OBSERVER)_[NESWUD](_ON)?$/.exec(key);
    if (om) return TEX[om[1] + (om[2] || '')];
    if (/^REDSTONE_WALL_TORCH_/.test(key)) return /_OFF$/.test(key) ? TEX.REDSTONE_TORCH_OFF : TEX.REDSTONE_TORCH;
    return /^WATER_/.test(key) ? TEX.WATER : /^LAVA_/.test(key) ? TEX.LAVA : /^WALL_TORCH_/.test(key) ? TEX.TORCH : /^BED_/.test(key) ? TEX.BED : null;
  }
  var CUT = [];
  var RGB = [], RGB_FACE = [], PIX = [], OPAQUE = new Uint8Array(N), KIND = [], EMIT = new Float32Array(N), TINT = new Uint8Array(N);
  DEF.forEach(function (d, id) {
    B[d[0]] = id;
    LIST.push({ id: id, key: d[0], name: d[1], kind: d[3] });
    KIND[id] = d[3];
    EMIT[id] = d[4] || 0;
    OPAQUE[id] = (d[3] === 'solid' || d[0] === 'LAVA') ? 1 : 0;
    var t = texOf(d[0]), base = d[2] ? hex(d[2]) : [0, 0, 0];
    if (t && t.rgba) CUT[id] = t.rgba;   // 透明な所のある見た目（js/newtex.js）
    else if (t && t.mask) {
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
  LIGHT_EMIT[B.FIRE] = 15; EMIT[B.FIRE] = 1;
  LIGHT_EMIT[B.REDSTONE_LAMP_ON] = 15; EMIT[B.REDSTONE_LAMP_ON] = 0.6; LIGHT_EMIT[B.ENCHANTING_TABLE] = 7; LIGHT_EMIT[B.BREWING_STAND] = 1;
  LIST.forEach(function (b) { if (b.kind === 'rtorch' && !/_OFF$/.test(b.key)) LIGHT_EMIT[b.id] = 7; });
  // ぶつかる高さのおおよそ（固いブロックは 1、ベッドは 9/16、ほかは 0）。正確な形は WG.blockBoxes。
  var COLLIDE = new Float32Array(N);
  LIST.forEach(function (b) {
    var k = b.kind, key = b.key;
    COLLIDE[b.id] = k === 'solid' ? 1 : k === 'bed' ? 9 / 16 : k === 'farm' ? 15 / 16 : k === 'stairs' ? 1 : k === 'fence' ? 1.5 :
      k === 'slab' ? (/_TOP$/.test(key) ? 1 : 0.5) : k === 'door' ? (/C[LU]$/.test(key) ? 1 : 0) :
      k === 'repeater' ? 2 / 16 : k === 'piston' || k === 'phead' || k === 'anvil' ? 1 : k === 'etable' ? 0.75 : k === 'stand' ? 0.875 : 0;
  });
  WG.COLLIDE = COLLIDE;

  // ---- 形（1/16 ブロック単位の箱の並び）----
  // 描くときと、ぶつかるときの形。nb(dx, dz) は横の隣のブロック（柵のつながり）。forCollide なら柵は高さ 1.5。
  var SHAPED = { stairs: 1, slab: 1, fence: 1, door: 1, ladder: 1, farm: 1, lever: 1, button: 1, plate: 1, repeater: 1, piston: 1, phead: 1, etable: 1, anvil: 1, stand: 1,
    hopper: 1, comparator: 1, daylight: 1 };
  // 形はあるが、ぶつからないもの
  var NOCOLLIDE = { lever: 1, button: 1, plate: 1 };
  // 箱の回し方：E 向き（西の壁に付く）を基準に、横の 4 方向へ
  function rotE(b, f) {
    if (f === 'W') return [16 - b[3], b[1], b[2], 16 - b[0], b[4], b[5]].concat(b.slice(6));
    if (f === 'S') return [b[2], b[1], b[0], b[5], b[4], b[3]].concat(b.slice(6));
    if (f === 'N') return [b[2], b[1], 16 - b[3], b[5], b[4], 16 - b[0]].concat(b.slice(6));
    return b;
  }
  // N 向き（−z へ出す）を基準に、時計回りに回す
  function rotN(b, f) {
    var turns = { N: 0, E: 1, S: 2, W: 3 }[f], x0 = b[0], z0 = b[2], x1 = b[3], z1 = b[5];
    for (var t = 0; t < turns; t++) { var nx0 = 16 - z1, nx1 = 16 - z0, nz0 = x0, nz1 = x1; x0 = nx0; x1 = nx1; z0 = nz0; z1 = nz1; }
    return [x0, b[1], z0, x1, b[4], z1].concat(b.slice(6));
  }
  // U 向き（上へ出す）を基準に、6 方向へ
  function rotU(b, f) {
    var P = [[b[0], b[1], b[2]], [b[3], b[4], b[5]]].map(function (p) {
      var x = p[0], y = p[1], z = p[2];
      if (f === 'D') return [x, 16 - y, z];
      if (f === 'N') return [x, z, 16 - y];
      if (f === 'S') return [x, z, y];
      if (f === 'E') return [y, x, z];
      if (f === 'W') return [16 - y, x, z];
      return [x, y, z];
    });
    return [Math.min(P[0][0], P[1][0]), Math.min(P[0][1], P[1][1]), Math.min(P[0][2], P[1][2]), Math.max(P[0][0], P[1][0]), Math.max(P[0][1], P[1][1]), Math.max(P[0][2], P[1][2])].concat(b.slice(6));
  }
  // 7 番目は見た目を借りるブロック、8 番目は光るかどうか
  function redstoneBoxes(id, k, key) {
    var on = /_ON$/.test(key), f;
    if (k === 'lever') {
      f = /LEVER_([FNESW])/.exec(key)[1];
      var base = [5, 0, 4, 11, 3, 12, B.COBBLESTONE], stick = on ? [7, 3, 3, 9, 10, 5, B.OAK_PLANKS] : [7, 3, 11, 9, 10, 13, B.OAK_PLANKS];
      if (f === 'F') return [base, stick];
      return [rotE([0, 4, 5, 3, 12, 11, B.COBBLESTONE], f), rotE(on ? [3, 9, 7, 10, 11, 9, B.OAK_PLANKS] : [3, 5, 7, 10, 7, 9, B.OAK_PLANKS], f)];
    }
    if (k === 'button') {
      f = /BUTTON_([FNESW])/.exec(key)[1];
      var mat = /^OAK/.test(key) ? B.OAK_PLANKS : B.STONE, h = on ? 1 : 2;
      if (f === 'F') return [[5, 0, 6, 11, h, 10, mat]];
      return [rotE([0, 6, 5, h, 10, 11, mat], f)];
    }
    if (k === 'plate') {
      var pm = /^OAK/.test(key) ? B.OAK_PLANKS : B.STONE;
      return [on ? [2, 0, 2, 14, 1, 14, pm] : [1, 0, 1, 15, 1, 15, pm]];
    }
    if (k === 'repeater') {
      var m = /REPEATER_([NESW])(\d)/.exec(key), dl = +m[2], tip = on ? B.REDSTONE_BLOCK : B.NETHER_BRICKS, out = [[0, 0, 0, 16, 2, 16]];
      [2, 4 + dl * 2].forEach(function (z) { out.push([7, 2, z, 9, 5, z + 2, B.OAK_PLANKS], [7, 5, z, 9, 7, z + 2, tip, on ? 1 : 0]); });
      return out.map(function (b) { return rotN(b, m[1]); });
    }
    if (k === 'piston') {
      f = /PISTON_([NESWUD])/.exec(key)[1];
      return [rotU(/_X$/.test(key) ? [0, 0, 0, 16, 12, 16] : [0, 0, 0, 16, 16, 16], f)];
    }
    if (k === 'phead') {
      f = /HEAD_([NESWUD])$/.exec(key)[1];
      return [rotU([0, 12, 0, 16, 16, 16], f), rotU([6, 0, 6, 10, 12, 10, B.OAK_PLANKS], f)];
    }
    if (k === 'etable') return [[0, 0, 0, 16, 12, 16]];
    if (k === 'hopper') {
      f = key.slice(-1);
      var hb = [[0, 10, 0, 16, 16, 2], [0, 10, 14, 16, 16, 16], [0, 10, 2, 2, 16, 14], [14, 10, 2, 16, 16, 14], [2, 10, 2, 14, 11, 14], [4, 4, 4, 12, 10, 12]];
      hb.push(f === 'D' ? [6, 0, 6, 10, 4, 10] : rotN([6, 4, 0, 10, 8, 4], f));
      return hb;
    }
    if (k === 'comparator') {
      var cm = /COMPARATOR_([NESW])([CS])(_ON)?$/.exec(key), con = !!cm[3], sub = cm[2] === 'S';
      var tipOn = B.REDSTONE_BLOCK, tipOff = B.NETHER_BRICKS, cb = [[0, 0, 0, 16, 2, 16]];
      [[3, 11], [11, 11]].forEach(function (p) { cb.push([p[0], 2, p[1], p[0] + 2, 5, p[1] + 2, B.OAK_PLANKS], [p[0], 5, p[1], p[0] + 2, 7, p[1] + 2, con ? tipOn : tipOff, con ? 1 : 0]); });
      cb.push([7, 2, 2, 9, 4, 4, sub ? tipOn : tipOff, sub ? 1 : 0]);
      return cb.map(function (b) { return rotN(b, cm[1]); });
    }
    if (k === 'daylight') return [[0, 0, 0, 16, 6, 16]];
    if (k === 'anvil') return [[2, 0, 2, 14, 4, 14], [4, 4, 4, 12, 10, 12], [0, 10, 3, 16, 16, 13]];
    if (k === 'stand') return [[1, 0, 1, 15, 2, 15], [7, 2, 7, 9, 14, 9, B.GOLD_BLOCK]];
    return null;
  }
  // ピストンの向き（見た目の「上」の面をどちらへ向けるか）
  var ORIENT = [];
  LIST.forEach(function (b) {
    var m = /PISTON_(?:HEAD_)?([NESWUD])(_X)?$/.exec(b.key);
    if (m && (b.kind === 'piston' || b.kind === 'phead')) ORIENT[b.id] = m[1];
    m = /^(?:DISPENSER|DROPPER|OBSERVER)_([NESWUD])(_ON)?$/.exec(b.key);
    if (m) ORIENT[b.id] = m[1];   // 「上」の見た目を前（口・顔）に向ける
  });
  WG.ORIENT = ORIENT;
  var FACE_OF = { N: 0, E: 1, S: 2, W: 3 };
  // 階段の形（Minecraft と同じ決め方）：高い側の隣が直角の階段なら外角、低い側の隣が直角の階段なら内角
  var DV = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }, CCW = { N: 'W', E: 'N', S: 'E', W: 'S' }, OPP = { N: 'S', E: 'W', S: 'N', W: 'E' };
  var STAIR_F = [], STAIR_T = [];
  LIST.forEach(function (b) { var m = /_STAIRS_([NESW])(_T)?$/.exec(b.key); if (m) { STAIR_F[b.id] = m[1]; STAIR_T[b.id] = !!m[2]; } });
  function isStair(id) { return STAIR_F[id] != null; }
  function stairShape(id, nb) {
    var f = STAIR_F[id], t = STAIR_T[id], v = DV[f], ax = v[0] ? 0 : 1;
    function canTake(dir) { var n = nb(DV[dir][0], DV[dir][1]); return !(isStair(n) && STAIR_F[n] === f && STAIR_T[n] === t); }
    var front = nb(v[0], v[1]);
    if (isStair(front) && STAIR_T[front] === t) {
      var d1 = STAIR_F[front];
      if ((DV[d1][0] ? 0 : 1) !== ax && canTake(OPP[d1])) return d1 === CCW[f] ? 'OL' : 'OR';
    }
    var back = nb(-v[0], -v[1]);
    if (isStair(back) && STAIR_T[back] === t) {
      var d2 = STAIR_F[back];
      if ((DV[d2][0] ? 0 : 1) !== ax && canTake(d2)) return d2 === CCW[f] ? 'IL' : 'IR';
    }
    return 'S';
  }
  function stairBoxes(id, nb) {
    var f = STAIR_F[id], t = STAIR_T[id], v = DV[f], l = DV[CCW[f]], shape = nb ? stairShape(id, nb) : 'S';
    var out = [t ? [0, 8, 0, 16, 16, 16] : [0, 0, 0, 16, 8, 16]], y0 = t ? 0 : 8;
    for (var qz = 0; qz < 2; qz++) for (var qx = 0; qx < 2; qx++) {
      var sx = qx * 2 - 1, sz = qz * 2 - 1, front = sx * v[0] + sz * v[1] > 0, left = sx * l[0] + sz * l[1] > 0, on;
      if (shape === 'S') on = front;
      else if (shape === 'OL') on = front && left;
      else if (shape === 'OR') on = front && !left;
      else if (shape === 'IL') on = front || left;
      else on = front || !left;
      if (on) out.push([qx * 8, y0, qz * 8, qx * 8 + 8, y0 + 8, qz * 8 + 8]);
    }
    return out;
  }
  WG.stairShape = stairShape;
  var DOOR_CLOSED = [[0, 0, 13, 16, 16, 16], [0, 0, 0, 3, 16, 16], [0, 0, 0, 16, 16, 3], [13, 0, 0, 16, 16, 16]];
  var DOOR_OPEN = [[0, 0, 0, 3, 16, 16], [0, 0, 0, 16, 16, 3], [13, 0, 0, 16, 16, 16], [0, 0, 13, 16, 16, 16]];
  var LADDER = [[0, 0, 15, 16, 16, 16], [0, 0, 0, 1, 16, 16], [0, 0, 0, 16, 16, 1], [15, 0, 0, 16, 16, 16]];
  var LADDER_HIT = [[0, 0, 13, 16, 16, 16], [0, 0, 0, 3, 16, 16], [0, 0, 0, 16, 16, 3], [13, 0, 0, 16, 16, 16]];
  var FENCE_DIRS = [[0, -1, 'N'], [1, 0, 'E'], [0, 1, 'S'], [-1, 0, 'W']];
  function fenceLink(id) { return KIND[id] === 'fence' || (KIND[id] === 'solid' && OPAQUE[id]); }
  function blockBoxes(id, nb, forCollide) {
    var k = KIND[id], key = LIST[id].key, f;
    if (forCollide && NOCOLLIDE[k]) return [];
    var rb = redstoneBoxes(id, k, key);
    if (rb) return rb;
    if (k === 'farm') return [[0, 0, 0, 16, 15, 16]];
    if (k === 'slab') return /_TOP$/.test(key) ? [[0, 8, 0, 16, 16, 16]] : [[0, 0, 0, 16, 8, 16]];
    if (k === 'stairs') return stairBoxes(id, nb);
    if (k === 'door') {
      var dm = /_([NESW])([CO])[LU]$/.exec(key);
      f = FACE_OF[dm[1]];
      return [(dm[2] === 'O' ? DOOR_OPEN : DOOR_CLOSED)[f]];
    }
    if (k === 'ladder') { f = FACE_OF[key.slice(-1)]; return [(forCollide ? LADDER_HIT : LADDER)[f]]; }
    if (k === 'fence') {
      var h = forCollide ? 24 : 16, out = [forCollide ? [6, 0, 6, 10, 24, 10] : [6, 0, 6, 10, 16, 10]];
      FENCE_DIRS.forEach(function (d) {
        if (!nb || !fenceLink(nb(d[0], d[1]))) return;
        var a = d[0] ? (d[0] > 0 ? [10, 16] : [0, 6]) : [6, 10], c = d[1] ? (d[1] > 0 ? [10, 16] : [0, 6]) : [6, 10];
        if (forCollide) out.push([a[0], 0, c[0], a[1], h, c[1]]);
        else {
          var ax = d[0] ? a : [7, 9], cz = d[1] ? c : [7, 9];
          out.push([ax[0], 12, cz[0], ax[1], 15, cz[1]], [ax[0], 6, cz[0], ax[1], 9, cz[1]]);
        }
      });
      return out;
    }
    return null;
  }
  WG.SHAPED = SHAPED;
  WG.blockBoxes = blockBoxes;
  WG.isShaped = function (id) { return !!SHAPED[KIND[id]]; };
  // 支えのブロックへの向き（壊れたら一緒に取れる）
  var SUPPORT = [];
  LIST.forEach(function (b) {
    var k = b.key, m;
    if (b.kind === 'wire' || b.kind === 'plate' || b.kind === 'repeater' || k === 'REDSTONE_TORCH' || k === 'REDSTONE_TORCH_OFF' || /_F(_ON)?$/.test(k) && (b.kind === 'lever' || b.kind === 'button')) SUPPORT[b.id] = [0, -1, 0];
    else if ((m = /_([NESW])(_ON|_OFF)?$/.exec(k)) && (b.kind === 'lever' || b.kind === 'button' || b.kind === 'rtorch')) {
      var v = { N: [0, 1], E: [-1, 0], S: [0, -1], W: [1, 0] }[m[1]];
      SUPPORT[b.id] = [v[0], 0, v[1]];
    }
  });
  WG.SUPPORT = SUPPORT;
  // 壁掛けのトーチ（普通とレッドストーン）の、壁への向き [dx, dz]
  var TORCH_WALL = [];
  LIST.forEach(function (b) { var m = /WALL_TORCH_([NESW])(_OFF)?$/.exec(b.key); if (m) TORCH_WALL[b.id] = { N: [0, 1], E: [-1, 0], S: [0, -1], W: [1, 0] }[m[1]]; });
  WG.TORCH_WALL = TORCH_WALL;
  // はしご・扉の向き、ドアの開け閉め
  WG.DIR4 = DIR4;
  WG.DIR_VEC = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
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
