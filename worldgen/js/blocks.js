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

  // ---- 追加のブロック：スライムブロック（跳ねる）、干し草の俵（落ちても痛くない）、テラコッタ、なめらかな石、ランタン、色付きの羊毛 ----
  DEF.push(['SLIME_BLOCK', 'スライムブロック', '#6cbc50', 'solid'], ['HAY_BALE', '干し草の俵', '#c8a83a', 'solid'],
    ['TERRACOTTA', 'テラコッタ', '#9a5a40', 'solid'], ['SMOOTH_STONE', 'なめらかな石', '#a0a09c', 'solid'],
    ['LANTERN', 'ランタン', '#5a5a5e', 'lantern']);
  // [キーの頭, 名前, 色]（白は上の白色の羊毛）
  var WOOL_COLORS = [['ORANGE', 'オレンジ色', '#e0761a'], ['MAGENTA', '赤紫色', '#b44cb4'], ['LIGHT_BLUE', '空色', '#3aa8d8'],
    ['YELLOW', '黄色', '#f0c434'], ['LIME', '黄緑色', '#70ba1c'], ['PINK', '桃色', '#ec8aa8'], ['GRAY', '灰色', '#3e4448'],
    ['LIGHT_GRAY', '薄灰色', '#8e8e86'], ['CYAN', '青緑色', '#158a92'], ['PURPLE', '紫色', '#7a2aa8'], ['BLUE', '青色', '#343c9c'],
    ['GREEN', '緑色', '#546c1c'], ['RED', '赤色', '#a42620'], ['BLACK', '黒色', '#18181c']];
  WOOL_COLORS.forEach(function (c) { DEF.push([c[0] + '_WOOL', c[1] + 'の羊毛', c[2], 'solid']); });
  // ネザーポータル（黒曜石の枠に火を付けると、中にできる。X は東西に広がる面、Z は南北に広がる面）
  DEF.push(['NETHER_PORTAL_X', 'ネザーポータル', '#6a2ab8', 'portal'], ['NETHER_PORTAL_Z', 'ネザーポータル', '#6a2ab8', 'portal']);
  ALIAS.NETHER_PORTAL_X = ALIAS.NETHER_PORTAL_Z = 'NETHER_PORTAL';
  // カボチャと、くり抜いたカボチャ（鉄の番人を作るのに使う）
  DEF.push(['PUMPKIN', 'カボチャ', '#d8862a', 'solid'], ['CARVED_PUMPKIN', 'くり抜いたカボチャ', '#d07a22', 'solid']);
  // ---- 第 2 回：レール・作業ブロック ----
  // レール：NS・EW はまっすぐ、NE などは曲がり角（2 つの出口）、UN などは北（など）へ上る坂。パワードレールはまっすぐと坂だけ
  var RAIL_SHAPES = { NS: [[0, -1], [0, 1]], EW: [[1, 0], [-1, 0]], NE: [[0, -1], [1, 0]], NW: [[0, -1], [-1, 0]], SE: [[0, 1], [1, 0]], SW: [[0, 1], [-1, 0]],
    UN: [[0, -1], [0, 1]], US: [[0, 1], [0, -1]], UE: [[1, 0], [-1, 0]], UW: [[-1, 0], [1, 0]] };
  var RAIL_INFO = {};
  Object.keys(RAIL_SHAPES).forEach(function (sh) {
    DEF.push(['RAIL_' + sh, 'レール', '#8a7a62', 'rail']);
    RAIL_INFO['RAIL_' + sh] = { shape: sh, exits: RAIL_SHAPES[sh], up: sh[0] === 'U' ? sh[1] : null, powered: false };
    ALIAS['RAIL_' + sh] = sh[0] === 'U' ? (sh[1] === 'N' || sh[1] === 'S' ? 'RAIL_NS' : 'RAIL_EW') : null;
    if (!ALIAS['RAIL_' + sh]) delete ALIAS['RAIL_' + sh];
    if (/^(NS|EW|U.)$/.test(sh)) {
      DEF.push(['POWERED_RAIL_' + sh, 'パワードレール', '#b08a3a', 'rail']);
      RAIL_INFO['POWERED_RAIL_' + sh] = { shape: sh, exits: RAIL_SHAPES[sh], up: sh[0] === 'U' ? sh[1] : null, powered: true };
      if (sh[0] === 'U') ALIAS['POWERED_RAIL_' + sh] = sh[1] === 'N' || sh[1] === 'S' ? 'POWERED_RAIL_NS' : 'POWERED_RAIL_EW';
    }
  });
  WG.RAIL_SHAPES = RAIL_SHAPES;
  DEF.push(['SMITHING_TABLE', '鍛冶台', '#3a3a44', 'solid'], ['STONECUTTER', '石切台', '#7a7a76', 'cutter'], ['CARTOGRAPHY_TABLE', '製図台', '#6a5038', 'solid'],
    ['BLAST_FURNACE', '溶鉱炉', '#5a5a5e', 'solid'], ['BLAST_FURNACE_LIT', '溶鉱炉', '#6a5a4e', 'solid'], ['SMOKER', '燻製器', '#5a4a3a', 'solid'], ['SMOKER_LIT', '燻製器', '#6a5040', 'solid'],
    ['CAMPFIRE', '焚き火', '#8a5a2a', 'campfire', 1], ['ANCIENT_DEBRIS', '古代の残骸', '#5e4a46', 'solid']);
  for (var cl = 0; cl <= 8; cl++) { DEF.push(['COMPOSTER_' + cl, '堆肥箱', '#8a6a3e', 'composter']); ALIAS['COMPOSTER_' + cl] = 'COMPOSTER'; }

  // ---- 第 3 回：建材・飾り・収納 ----
  // 16 色（白・14 色・茶色）：コンクリート、コンクリートパウダー（落ちる。水に触れると固まる）、色付きガラスと板ガラス、色付きのテラコッタ
  var COLORS16 = [['WHITE', '白色', '#e9ecec']].concat(WOOL_COLORS, [['BROWN', '茶色', '#72482a']]);
  WG.COLORS16 = COLORS16;
  DEF.push(['BROWN_WOOL', '茶色の羊毛', '#72482a', 'solid']);
  COLORS16.forEach(function (c) {
    DEF.push([c[0] + '_CONCRETE', c[1] + 'のコンクリート', c[2], 'solid'], [c[0] + '_CONCRETE_POWDER', c[1] + 'のコンクリートパウダー', c[2], 'solid'],
      [c[0] + '_STAINED_GLASS', c[1] + 'の色付きガラス', c[2], 'solid'], [c[0] + '_TERRACOTTA', c[1] + 'のテラコッタ', c[2], 'solid'],
      [c[0] + '_STAINED_GLASS_PANE', c[1] + 'の色付き板ガラス', c[2], 'pane']);
    ALIAS[c[0] + '_STAINED_GLASS_PANE'] = c[0] + '_STAINED_GLASS';
  });
  DEF.push(['GLASS_PANE', '板ガラス', '#dfeef2', 'pane'], ['IRON_BARS', '鉄格子', '#8a8a90', 'pane']);
  ALIAS.GLASS_PANE = 'GLASS';
  // 塀（素材の見た目を借りる）
  [['COBBLESTONE', '丸石'], ['MOSSY_COBBLESTONE', '苔むした丸石'], ['STONE_BRICK', '石レンガ', 'STONE_BRICKS'], ['BRICK', 'レンガ', 'BRICKS'], ['SANDSTONE', '砂岩'], ['NETHER_BRICK', 'ネザーレンガ', 'NETHER_BRICKS']].forEach(function (m) {
    DEF.push([m[0] + '_WALL', m[1] + 'の塀', '#808080', 'wall']); ALIAS[m[0] + '_WALL'] = m[2] || m[0];
  });
  // トラップドア（閉じて下・閉じて上・開いて N/E/S/W の壁に立つ）と、フェンスゲート（X は東西に渡る、O は開いている）
  WOODS.concat([['IRON', '鉄', '#c8c8c8']]).forEach(function (w) {
    ['B', 'T', 'ON', 'OE', 'OS', 'OW'].forEach(function (st) { DEF.push([w[0] + '_TRAPDOOR_' + st, w[1] + 'のトラップドア', w[2], 'trapdoor']); ALIAS[w[0] + '_TRAPDOOR_' + st] = w[0] + '_TRAPDOOR'; });
  });
  WOODS.forEach(function (w) {
    ['X', 'Z', 'XO', 'ZO'].forEach(function (st) { DEF.push([w[0] + '_FENCE_GATE_' + st, w[1] + 'のフェンスゲート', w[2], 'gate']); ALIAS[w[0] + '_FENCE_GATE_' + st] = w[0] + '_PLANKS'; });
  });
  // 看板（立てる・壁）、額縁、絵画（壁に掛けるマス。絵は play の側で描く）、旗（立てる・壁。布は play の側で描く）
  DIR4.forEach(function (d) {
    DEF.push(['SIGN_' + d, '看板', '#a5824f', 'sign'], ['WALL_SIGN_' + d, '看板', '#a5824f', 'sign'], ['ITEM_FRAME_' + d, '額縁', '#8a6a3e', 'frame'],
      ['PAINTING_' + d, '絵画', '#a07850', 'painting'], ['BANNER_' + d, '旗', '#e9ecec', 'banner'], ['WALL_BANNER_' + d, '旗', '#e9ecec', 'banner']);
    ALIAS['SIGN_' + d] = ALIAS['WALL_SIGN_' + d] = 'OAK_PLANKS'; ALIAS['ITEM_FRAME_' + d] = 'ITEM_FRAME'; ALIAS['PAINTING_' + d] = 'ITEM_FRAME';
    ALIAS['BANNER_' + d] = ALIAS['WALL_BANNER_' + d] = 'OAK_PLANKS';
  });
  // 植木鉢と、植えた鉢
  DEF.push(['FLOWER_POT', '植木鉢', '#9a5a40', 'pot']);
  ['DANDELION', 'POPPY', 'RED_MUSHROOM', 'BROWN_MUSHROOM', 'CACTUS'].forEach(function (k) { DEF.push(['POTTED_' + k, '植木鉢', '#9a5a40', 'pot']); ALIAS['POTTED_' + k] = 'FLOWER_POT'; });
  // ビーコン、機織り機、樽、貝の箱（持ち運べる箱）、つながったチェスト（どれを開けても同じ中身）
  DEF.push(['BEACON', 'ビーコン', '#9ae0e0', 'beacon'], ['LOOM', '機織り機', '#a08a6a', 'solid'], ['BARREL', '樽', '#7a5a35', 'solid'],
    ['SHELL_BOX', '貝の箱', '#8a6a9a', 'solid'], ['LINKED_CHEST', 'つながったチェスト', '#2a3a3a', 'solid'],
    ['EMERALD_BLOCK', 'エメラルドブロック', '#2ab454', 'solid'], ['NETHERITE_BLOCK', 'ネザライトブロック', '#4a4246', 'solid']);
  // ---- 第 4 回：ハチの巣、黒い頭蓋骨（三つ首の骸を呼ぶ）、帰りの門（エンドポータル）----
  // ---- 第 5 回：石の種類・アメジスト・植物・水中の植物・雪の層・巨大キノコ・ネザーのバイオームのブロック ----
  DEF.push(['GRANITE', '花崗岩', '#9a6a58', 'solid'], ['DIORITE', '閃緑岩', '#c8c8c4', 'solid'], ['ANDESITE', '安山岩', '#888a88', 'solid'], ['TUFF', '凝灰岩', '#6a6a62', 'solid'],
    ['CALCITE', '方解石', '#e0e0da', 'solid'], ['SMOOTH_BASALT', 'なめらかな玄武岩', '#4a4a50', 'solid'], ['AMETHYST_BLOCK', 'アメジストブロック', '#8a62c8', 'solid'],
    ['AMETHYST_CLUSTER', 'アメジストの結晶', '#a888e8', 'plant'], ['MELON', 'スイカ', '#6a9a2a', 'solid'], ['BAMBOO', '竹', '#5a9a2a', 'bamboo'], ['LILY_PAD', 'スイレンの葉', '#3a7a2a', 'lily'],
    ['SNOW_LAYER', '雪', '#f2f4f6', 'snowlayer'], ['MUSHROOM_STEM', 'キノコの柄', '#d8d0c0', 'solid'], ['RED_MUSHROOM_BLOCK', '赤いキノコブロック', '#b8302a', 'solid'],
    ['BROWN_MUSHROOM_BLOCK', '茶色いキノコブロック', '#8a6a4a', 'solid'], ['SEAGRASS', '海草', '#3a8a3a', 'waterplant'], ['KELP', '昆布', '#4a7a2a', 'waterplant'],
    ['CRIMSON_NYLIUM', '真紅のナイリウム', '#8a1e1e', 'solid'], ['WARPED_NYLIUM', '歪んだナイリウム', '#2a7a6a', 'solid'], ['CRIMSON_STEM', '真紅の幹', '#6a2a3a', 'solid'],
    ['WARPED_STEM', '歪んだ幹', '#2a5a5a', 'solid'], ['CRIMSON_PLANKS', '真紅の板材', '#7a3a4a', 'solid'], ['WARPED_PLANKS', '歪んだ板材', '#2a6a62', 'solid'],
    ['NETHER_WART_BLOCK', 'ネザーウォートブロック', '#8a1a1a', 'solid'], ['WARPED_WART_BLOCK', '歪んだウォートブロック', '#1a7a7a', 'solid'], ['SHROOMLIGHT', 'シュルームライト', '#f0a050', 'solid'],
    ['BLACKSTONE', 'ブラックストーン', '#2a2428', 'solid'], ['CRIMSON_ROOTS', '真紅の根', '#a02a3a', 'plant'], ['WARPED_ROOTS', '歪んだ根', '#2a9a8a', 'plant']);
  // サンゴ（ブロックと、水の中の小さなサンゴ）
  var CORALS = [['TUBE', 'クダ', '#3a5ad8'], ['BRAIN', 'ノウ', '#d85aa8'], ['BUBBLE', 'アワ', '#a83ad8'], ['FIRE', 'ミレポラ', '#d83a3a'], ['HORN', 'シカツノ', '#e8c83a']];
  CORALS.forEach(function (c) { DEF.push([c[0] + '_CORAL_BLOCK', c[1] + 'サンゴブロック', c[2], 'solid'], [c[0] + '_CORAL', c[1] + 'サンゴ', c[2], 'waterplant']); });
  WG.CORALS = CORALS;
  // カボチャとスイカの茎（8 段）、カカオの実（N/E/S/W：幹のある向き、0 小 1 実り）、つる（はしごと同じ向きの決め方）
  for (var st = 0; st < 8; st++) DEF.push(['PUMPKIN_STEM_' + st, 'カボチャの茎', '#7a9a3a', 'crop'], ['MELON_STEM_' + st, 'スイカの茎', '#7a9a3a', 'crop']);
  DIR4.forEach(function (d) { DEF.push(['COCOA_' + d + '_0', 'カカオ', '#8a7a3a', 'cocoa'], ['COCOA_' + d + '_1', 'カカオ', '#a0602a', 'cocoa'], ['VINE_' + d, 'つる', '#3a7a2a', 'vine']); ALIAS['VINE_' + d] = 'VINE'; ALIAS['COCOA_' + d + '_0'] = 'COCOA_0'; ALIAS['COCOA_' + d + '_1'] = 'COCOA_1'; });
  DEF.push(['BEEHIVE', 'ハチの巣箱', '#c8a050', 'solid'], ['BEE_NEST', 'ハチの巣', '#d8b040', 'solid'], ['DARK_SKULL', '黒い頭蓋骨', '#2a2a2c', 'skull'], ['END_PORTAL', 'エンドポータル', '#0a0a14', 'endportal']);
  // 第 6 回：構造物の建材（海晶・プルプァ・エンドストーンレンガ・石レンガの仲間・ブラックストーンレンガ・濃いオーク）と、その階段とハーフブロック
  DEF.push(['PRISMARINE', '海晶', '#5c9c8c', 'solid'], ['PRISMARINE_BRICKS', '海晶レンガ', '#64aa98', 'solid'], ['DARK_PRISMARINE', '暗い海晶', '#345e50', 'solid'],
    ['SEA_LANTERN', 'シーランタン', '#d8ece6', 'solid'], ['PURPUR_BLOCK', 'プルプァブロック', '#a87ca8', 'solid'], ['PURPUR_PILLAR', 'プルプァの柱', '#aa80aa', 'solid'],
    ['END_STONE_BRICKS', 'エンドストーンレンガ', '#dee0a8', 'solid'], ['END_ROD', 'エンドロッド', '#f0eae0', 'rod'], ['MOSSY_STONE_BRICKS', '苔むした石レンガ', '#6e7a5e', 'solid'],
    ['CRACKED_STONE_BRICKS', 'ひび割れた石レンガ', '#767676', 'solid'], ['CHISELED_STONE_BRICKS', '模様入りの石レンガ', '#7c7c7c', 'solid'],
    ['POLISHED_BLACKSTONE_BRICKS', '磨かれたブラックストーンレンガ', '#363038', 'solid'], ['GILDED_BLACKSTONE', '金を含むブラックストーン', '#4a3a28', 'solid'],
    ['DARK_OAK_PLANKS', '濃いオークの板材', '#4a3018', 'solid'], ['DARK_OAK_LOG', '濃いオークの原木', '#3e3020', 'solid'], ['NETHER_BRICK_FENCE', 'ネザーレンガの柵', '#2f1719', 'fence'],
    ['END_PORTAL_FRAME_EYE', 'エンドポータルフレーム（目）', '#4f6d60', 'solid'], ['END_GATEWAY', 'エンドゲートウェイ', '#0a0a14', 'gateway']);
  ALIAS.NETHER_BRICK_FENCE = 'NETHER_BRICKS'; ALIAS.END_GATEWAY = 'END_PORTAL';
  var SHAPE_MATS6 = [['DARK_OAK', '濃いオークの', 'DARK_OAK_PLANKS', '#4a3018'], ['NETHER_BRICK', 'ネザーレンガの', 'NETHER_BRICKS', '#2f1719'], ['PURPUR', 'プルプァの', 'PURPUR_BLOCK', '#a87ca8'],
    ['PRISMARINE_BRICK', '海晶レンガの', 'PRISMARINE_BRICKS', '#64aa98'], ['BLACKSTONE_BRICK', 'ブラックストーンレンガの', 'POLISHED_BLACKSTONE_BRICKS', '#363038'], ['END_STONE_BRICK', 'エンドストーンレンガの', 'END_STONE_BRICKS', '#dee0a8']];
  SHAPE_MATS6.forEach(function (m) {
    DIR4.forEach(function (d) { ['', '_T'].forEach(function (t) { DEF.push([m[0] + '_STAIRS_' + d + t, m[1] + '階段', m[3], 'stairs']); ALIAS[m[0] + '_STAIRS_' + d + t] = m[2]; }); });
    DEF.push([m[0] + '_SLAB', m[1] + 'ハーフブロック', m[3], 'slab'], [m[0] + '_SLAB_TOP', m[1] + 'ハーフブロック', m[3], 'slab'], [m[0] + '_SLAB_DOUBLE', m[1] + 'ハーフブロック（2 段）', m[3], 'solid']);
    ALIAS[m[0] + '_SLAB'] = ALIAS[m[0] + '_SLAB_TOP'] = ALIAS[m[0] + '_SLAB_DOUBLE'] = m[2];
    SHAPE_MATS.push(m);
  });
  // レッドストーンの見直し：ターゲット・トラップチェスト・トリップワイヤー・重さを量る感圧板・ディテクター／アクティベーターレール・
  // スカルクセンサー・クラフター・銅の電球・スライムブロック・ハチミツブロック・干し草の俵
  DEF.push(['TARGET', 'ターゲット', '#e8d8c8', 'solid'], ['TRAPPED_CHEST', 'トラップチェスト', '#9a6a32', 'solid'],
    ['TRIPWIRE', 'トリップワイヤー', '#e8e8e8', 'tripwire'], ['TRIPWIRE_ON', 'トリップワイヤー', '#e8e8e8', 'tripwire'],
    ['LIGHT_WEIGHTED_PRESSURE_PLATE', '軽量用感圧板', '#e8c040', 'plate'], ['LIGHT_WEIGHTED_PRESSURE_PLATE_ON', '軽量用感圧板', '#e8c040', 'plate'],
    ['HEAVY_WEIGHTED_PRESSURE_PLATE', '重量用感圧板', '#c8c8cc', 'plate'], ['HEAVY_WEIGHTED_PRESSURE_PLATE_ON', '重量用感圧板', '#c8c8cc', 'plate'],
    ['SCULK_SENSOR', 'スカルクセンサー', '#1a4a50', 'sculk'], ['SCULK_SENSOR_ON', 'スカルクセンサー', '#2a7a80', 'sculk'],
    ['COPPER_BULB', '銅の電球', '#b06a48', 'solid'], ['COPPER_BULB_LIT', '銅の電球（点灯）', '#e8a060', 'solid'],
    ['SLIME_BLOCK', 'スライムブロック', '#78c060', 'solid'], ['MOVING_PISTON', '動いているブロック', '#000000', 'moving'], ['HONEY_BLOCK', 'ハチミツブロック', '#e8a030', 'solid'], ['HAY_BLOCK', '干し草の俵', '#c8a830', 'solid']);
  DIR4.forEach(function (d) { ['', '_ON'].forEach(function (o) { DEF.push(['TRIPWIRE_HOOK_' + d + o, 'トリップワイヤーフック', '#8a8a8a', 'hook']); ALIAS['TRIPWIRE_HOOK_' + d + o] = 'OAK_PLANKS'; }); });
  ['N', 'E', 'S', 'W', 'U', 'D'].forEach(function (f) { DEF.push(['CRAFTER_' + f, 'クラフター', '#6a6a70', 'solid']); });
  ALIAS.TRIPWIRE = ALIAS.TRIPWIRE_ON = 'WHITE_WOOL'; ALIAS.MOVING_PISTON = 'STONE';
  ALIAS.LIGHT_WEIGHTED_PRESSURE_PLATE = ALIAS.LIGHT_WEIGHTED_PRESSURE_PLATE_ON = 'GOLD_BLOCK';
  ALIAS.HEAVY_WEIGHTED_PRESSURE_PLATE = ALIAS.HEAVY_WEIGHTED_PRESSURE_PLATE_ON = 'IRON_BLOCK';
  // ディテクターレール（トロッコが乗るとオン）・アクティベーターレール（動力でトロッコの乗り手を降ろす）：まっすぐと坂だけ
  ['DETECTOR_RAIL', 'ACTIVATOR_RAIL'].forEach(function (base) {
    ['NS', 'EW', 'UN', 'US', 'UE', 'UW'].forEach(function (sh) {
      DEF.push([base + '_' + sh, base === 'DETECTOR_RAIL' ? 'ディテクターレール' : 'アクティベーターレール', base === 'DETECTOR_RAIL' ? '#8a6a5a' : '#8a3a30', 'rail']);
      RAIL_INFO[base + '_' + sh] = { shape: sh, exits: RAIL_SHAPES[sh], up: sh[0] === 'U' ? sh[1] : null, powered: false, kind: base };
      if (sh[0] === 'U') ALIAS[base + '_' + sh] = base + '_' + (sh[1] === 'N' || sh[1] === 'S' ? 'NS' : 'EW');
    });
  });
  // 第 2 回（アイテム）：ケーキ（7 切れ）・ビートルート（4 段）・スイートベリーの茂み（4 段）・ジュークボックス
  for (var cb = 0; cb < 7; cb++) { DEF.push(['CAKE_' + cb, 'ケーキ', '#f0e8e0', 'cake']); if (cb) ALIAS['CAKE_' + cb] = 'CAKE_0'; }
  for (var bt = 0; bt < 4; bt++) DEF.push(['BEETROOTS_' + bt, 'ビートルート', '#6a9a3a', 'crop'], ['SWEET_BERRY_BUSH_' + bt, 'スイートベリーの茂み', '#3a6a3a', 'plant']);
  DEF.push(['JUKEBOX', 'ジュークボックス', '#6a4a30', 'solid']);
  // 第 3 回：大釜（水の量 0〜3）・避雷針・銅の酸化（とロウ引き）・花と草・雪と氷
  for (var cl = 0; cl < 4; cl++) { DEF.push([cl ? 'CAULDRON_' + cl : 'CAULDRON', '大釜', '#3a3a40', 'cauldron']); if (cl) ALIAS['CAULDRON_' + cl] = 'CAULDRON'; }
  DEF.push(['LIGHTNING_ROD', '避雷針', '#c87a5a', 'lrod'], ['LIGHTNING_ROD_ON', '避雷針', '#f0b090', 'lrod']); ALIAS.LIGHTNING_ROD_ON = 'LIGHTNING_ROD';
  DEF.push(['EXPOSED_COPPER', '風化しかけた銅', '#a87e68', 'solid'], ['WEATHERED_COPPER', '風化した銅', '#6c9a78', 'solid'], ['OXIDIZED_COPPER', '酸化した銅', '#52a28a', 'solid']);
  [['COPPER_BLOCK', '銅ブロック'], ['EXPOSED_COPPER', '風化しかけた銅'], ['WEATHERED_COPPER', '風化した銅'], ['OXIDIZED_COPPER', '酸化した銅']].forEach(function (c) {
    var k = c[0] === 'COPPER_BLOCK' ? 'WAXED_COPPER_BLOCK' : 'WAXED_' + c[0]; DEF.push([k, 'ロウ引きした' + c[1], '#b08060', 'solid']); ALIAS[k] = c[0];
  });
  DEF.push(['CORNFLOWER', 'ヤグルマギク', '#4a6ad8', 'plant'], ['ALLIUM', 'アリウム', '#b45ad8', 'plant'], ['AZURE_BLUET', 'ヒナソウ', '#d8dce8', 'plant'], ['OXEYE_DAISY', 'フランスギク', '#ececdc', 'plant'],
    ['BLUE_ORCHID', 'ヒスイラン', '#3aa8e0', 'plant'], ['LILY_OF_THE_VALLEY', 'スズラン', '#e8ece0', 'plant'], ['RED_TULIP', '赤色のチューリップ', '#d8382c', 'plant'], ['ORANGE_TULIP', '橙色のチューリップ', '#e8862a', 'plant'],
    ['WHITE_TULIP', '白色のチューリップ', '#e8ece8', 'plant'], ['PINK_TULIP', '桃色のチューリップ', '#ec9ab8', 'plant'], ['FERN', 'シダ', '#5a8a3e', 'plant'], ['DEAD_BUSH', '枯れ木', '#8a6a3e', 'plant'],
    ['SNOW_BLOCK', '雪ブロック', '#f2f4f6', 'solid'], ['PACKED_ICE', '氷塊', '#8ab0e0', 'solid'], ['BLUE_ICE', '青氷', '#6aa0f0', 'solid']);
  // 第 4 回：古代都市・廃ポータルの建材
  DEF.push(['DEEPSLATE_BRICKS', '深層岩レンガ', '#4a4a50', 'solid'], ['CRACKED_DEEPSLATE_BRICKS', 'ひび割れた深層岩レンガ', '#46464c', 'solid'], ['DEEPSLATE_TILES', '深層岩タイル', '#36363c', 'solid'],
    ['CHISELED_DEEPSLATE', '模様入りの深層岩', '#3e3e44', 'solid'], ['SCULK', 'スカルク', '#0e2a32', 'solid'], ['SCULK_SHRIEKER', 'スカルクシュリーカー', '#1a3a40', 'solid'],
    ['SOUL_LANTERN', '魂のランタン', '#3a5a60', 'lantern'], ['CRYING_OBSIDIAN', '泣く黒曜石', '#2a1040', 'solid'], ['MAGMA_BLOCK', 'マグマブロック', '#8a3a10', 'solid']);
  // 追加：考古学（怪しい砂・砂利は掘り出し具合 0〜3）、飾り壺、試練の間、コンジット
  for (var sus = 0; sus < 4; sus++) DEF.push(['SUSPICIOUS_SAND_' + sus, '怪しい砂', '#d8c890', 'solid'], ['SUSPICIOUS_GRAVEL_' + sus, '怪しい砂利', '#8a8480', 'solid']);
  DEF.push(['DECORATED_POT', '飾り壺', '#9a5a3a', 'dpot'], ['TUFF_BRICKS', '凝灰岩レンガ', '#6a6c64', 'solid'], ['POLISHED_TUFF', '磨かれた凝灰岩', '#646660', 'solid'], ['CHISELED_TUFF', '模様入りの凝灰岩', '#5e605a', 'solid'],
    ['COPPER_GRATE', '銅の格子', '#c06f52', 'solid'], ['TRIAL_SPAWNER', '試練のスポナー', '#2a2e34', 'solid'], ['TRIAL_SPAWNER_ACTIVE', '試練のスポナー', '#3a3e44', 'solid'],
    ['VAULT', '宝庫', '#3a3e44', 'solid'], ['VAULT_OPEN', '宝庫', '#2a2e34', 'solid'], ['CONDUIT', 'コンジット', '#c8a870', 'conduit']);
  ALIAS.TRIAL_SPAWNER_ACTIVE = 'TRIAL_SPAWNER';
  // ロードマップ 第 2 段階：じゅうたん・彩釉テラコッタ・色付きのベッド（16 色）
  var C16B = [['WHITE', '白色', '#e9ecec']].concat(WOOL_COLORS).concat([['BROWN', '茶色', '#72482a']]);
  WG.C16B = C16B;
  C16B.forEach(function (c) {
    DEF.push([c[0] + '_CARPET', c[1] + 'のじゅうたん', c[2], 'carpet'], [c[0] + '_GLAZED_TERRACOTTA', c[1] + 'の彩釉テラコッタ', c[2], 'solid']);
    ALIAS[c[0] + '_CARPET'] = c[0] + '_WOOL';
    if (c[0] === 'WHITE') return;
    ['FOOT', 'HEAD'].forEach(function (p) { ['N', 'E', 'S', 'W'].forEach(function (d) { DEF.push(['BED_' + c[0] + '_' + p + '_' + d, c[1] + 'のベッド', c[2], 'bed']); ALIAS['BED_' + c[0] + '_' + p + '_' + d] = 'BED_' + c[0]; }); });
  });
  // ロードマップ 第 3 段階：桜とマングローブの木（扉・柵・階段・ハーフブロック・トラップドア・フェンスゲートも）、泥、赤い砂、菌糸、桜の花びら
  // （ブロックの番号を変えないよう、いちばん後ろに足す）
  var NEW_WOODS = [['CHERRY', '桜', '#e2b4ac', '#3e2430', '#e8a8c0'], ['MANGROVE', 'マングローブ', '#7a3632', '#4a3628', '#4e7e34']];
  NEW_WOODS.forEach(function (w) {
    DEF.push([w[0] + '_LOG', w[1] + 'の原木', w[3], 'solid'], [w[0] + '_LEAVES', w[1] + 'の葉', w[4], 'solid'], [w[0] + '_PLANKS', w[1] + 'の板材', w[2], 'solid']);
    DIR4.forEach(function (d) { ['C', 'O'].forEach(function (o) { ['L', 'U'].forEach(function (h) { DEF.push([w[0] + '_DOOR_' + d + o + h, w[1] + 'のドア', w[2], 'door']); }); }); });
    DEF.push([w[0] + '_FENCE', w[1] + 'の柵', w[2], 'fence']); ALIAS[w[0] + '_FENCE'] = w[0] + '_PLANKS';
    DIR4.forEach(function (d) { ['', '_T'].forEach(function (t) { DEF.push([w[0] + '_STAIRS_' + d + t, w[1] + 'の階段', w[2], 'stairs']); ALIAS[w[0] + '_STAIRS_' + d + t] = w[0] + '_PLANKS'; }); });
    DEF.push([w[0] + '_SLAB', w[1] + 'のハーフブロック', w[2], 'slab'], [w[0] + '_SLAB_TOP', w[1] + 'のハーフブロック', w[2], 'slab'], [w[0] + '_SLAB_DOUBLE', w[1] + 'のハーフブロック（2 段）', w[2], 'solid']);
    ALIAS[w[0] + '_SLAB'] = ALIAS[w[0] + '_SLAB_TOP'] = ALIAS[w[0] + '_SLAB_DOUBLE'] = w[0] + '_PLANKS';
    ['B', 'T', 'ON', 'OE', 'OS', 'OW'].forEach(function (st) { DEF.push([w[0] + '_TRAPDOOR_' + st, w[1] + 'のトラップドア', w[2], 'trapdoor']); ALIAS[w[0] + '_TRAPDOOR_' + st] = w[0] + '_TRAPDOOR'; });
    ['X', 'Z', 'XO', 'ZO'].forEach(function (st) { DEF.push([w[0] + '_FENCE_GATE_' + st, w[1] + 'のフェンスゲート', w[2], 'gate']); ALIAS[w[0] + '_FENCE_GATE_' + st] = w[0] + '_PLANKS'; });
  });
  DEF.push(['MANGROVE_ROOTS', 'マングローブの根', '#4a3628', 'solid'], ['MUDDY_MANGROVE_ROOTS', '泥まみれのマングローブの根', '#3e3430', 'solid'], ['MUD', '泥', '#3c3837', 'solid'],
    ['PACKED_MUD', '固めた泥', '#8e6b50', 'solid'], ['MUD_BRICKS', '泥レンガ', '#89674f', 'solid'], ['RED_SAND', '赤い砂', '#be6621', 'solid'], ['RED_SANDSTONE', '赤い砂岩', '#b5621f', 'solid'],
    ['MYCELIUM', '菌糸', '#6f6265', 'solid'], ['PINK_PETALS', '桜の花びら', '#f0b0c8', 'carpet']);
  NEW_WOODS.forEach(function (w) { WOODS.push([w[0], w[1], w[2]]); SHAPE_MATS.push([w[0], w[1] + 'の', w[0] + '_PLANKS', w[2]]); });
  // ロードマップ 第 4 段階：繁茂した洞窟（苔・ツツジ・発光するベリーのつる・ドリップリーフ・胞子の花）と鍾乳洞（鍾乳石・石筍）
  DEF.push(['MOSS_BLOCK', '苔ブロック', '#5a7a2e', 'solid'], ['MOSS_CARPET', '苔のじゅうたん', '#5a7a2e', 'carpet'], ['AZALEA', 'ツツジ', '#5e7c2a', 'azalea'], ['FLOWERING_AZALEA', '花の咲いたツツジ', '#6e7a40', 'azalea'],
    ['CAVE_VINES', '洞窟のつる', '#4e7a2a', 'plant'], ['CAVE_VINES_LIT', '洞窟のつる（実）', '#e8a030', 'plant'], ['SPORE_BLOSSOM', '胞子の花', '#d878a8', 'plant'],
    ['SMALL_DRIPLEAF', '小さなドリップリーフ', '#5a9a3a', 'plant'], ['BIG_DRIPLEAF', '大きなドリップリーフ', '#6aa83e', 'bigdrip'], ['DRIPSTONE_BLOCK', '鍾乳石ブロック', '#866b5c', 'solid'],
    ['POINTED_DRIPSTONE_UP_TIP', '鍾乳石', '#866b5c', 'drip'], ['POINTED_DRIPSTONE_UP_MID', '鍾乳石', '#866b5c', 'drip'], ['POINTED_DRIPSTONE_DOWN_TIP', '鍾乳石', '#866b5c', 'drip'], ['POINTED_DRIPSTONE_DOWN_MID', '鍾乳石', '#866b5c', 'drip']);
  ALIAS.MOSS_CARPET = 'MOSS_BLOCK'; ALIAS.POINTED_DRIPSTONE_UP_MID = ALIAS.POINTED_DRIPSTONE_DOWN_TIP = ALIAS.POINTED_DRIPSTONE_DOWN_MID = 'POINTED_DRIPSTONE_UP_TIP';

  WG.WOOL_COLORS = WOOL_COLORS;
  WG.SHAPE_MATS = SHAPE_MATS; WG.WOODS = WOODS;

  // 見た目（js/tex16.js の 16×16 ピクセル。なければ js/textures.js の 8×8）。ないブロックは上の単色を使う。
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

  var B = {}, LIST = [], N = DEF.length, TEX = {};
  // 16×16 のドット絵（js/tex16.js）があればそれを使い、ないものは以前の 8×8 の見た目のまま
  Object.keys(WG.TEXTURES || {}).forEach(function (k) { TEX[k] = WG.TEXTURES[k]; });
  if (WG.TEX16) Object.keys(WG.TEX16).forEach(function (k) {
    var t = WG.TEX16[k];
    TEX[k] = { side: decode(t.side), top: decode(t.top), bottom: decode(t.bottom), rgba: t.rgba ? decode(t.rgba) : null, allFaces: !!t.allFaces };
  });
  if (WG.EXTRA16) Object.keys(WG.EXTRA16).forEach(function (k) { (WG.EXTRA_TILES = WG.EXTRA_TILES || {})[k] = decode(WG.EXTRA16[k]); });
  // 流れる水・溶岩は、元の水・溶岩と同じ見た目
  function texOf(key) {
    if (TEX[key]) return TEX[key];
    if (ALIAS[key]) return TEX[ALIAS[key]];
    var m = /^(\w+)_DOOR_[NESW][CO]([LU])$/.exec(key);
    if (m) return TEX[m[1] + '_DOOR_' + m[2]];
    if (/^LADDER_/.test(key)) return TEX.LADDER;
    if (/^REPEATER_/.test(key)) return TEX.REPEATER_BASE;
    var om = /^(DISPENSER|DROPPER|OBSERVER|CRAFTER)_[NESWUD](_ON)?$/.exec(key);
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
  // skinTexture: 面の 16×16 ピクセル（RGB を左上から行ごとに 768 バイト。古い 8×8 なら 192 バイト）。見た目がなければ null。
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
  // 水の中の植物（海草・昆布・サンゴ）は、水源の水としても扱う（泳げて、水の面を描く）
  LIST.forEach(function (b) { if (b.kind === 'waterplant') { FLUID[b.id] = 1; FLUID_LEVEL[b.id] = 0; } });
  WG.isWaterPlant = function (id) { return KIND[id] === 'waterplant'; };

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
  LIGHT_EMIT[B.BEACON] = 15; LIGHT_EMIT[B.END_PORTAL] = 15; LIGHT_EMIT[B.SHROOMLIGHT] = 15; LIGHT_EMIT[B.AMETHYST_CLUSTER] = 5;
  LIGHT_EMIT[B.COPPER_BULB_LIT] = 15; LIGHT_EMIT[B.SCULK_SENSOR] = 1; LIGHT_EMIT[B.SCULK_SENSOR_ON] = 6; LIGHT_BLOCK[B.TRIPWIRE] = LIGHT_BLOCK[B.TRIPWIRE_ON] = LIGHT_BLOCK[B.MOVING_PISTON] = 0;
  LIGHT_EMIT[B.SEA_LANTERN] = 15; LIGHT_EMIT[B.END_ROD] = 14; LIGHT_EMIT[B.END_GATEWAY] = 15; LIGHT_EMIT[B.END_PORTAL_FRAME_EYE] = 1; LIGHT_BLOCK[B.END_ROD] = 0; LIGHT_BLOCK[B.END_GATEWAY] = 0;
  [B.SNOW_LAYER, B.LILY_PAD, B.BAMBOO].forEach(function (id) { LIGHT_BLOCK[id] = 0; }); LIGHT_EMIT[B.LINKED_CHEST] = 7;
  LIST.forEach(function (b) { if (/_STAINED_GLASS$/.test(b.key)) { OPAQUE[b.id] = 0; LIGHT_BLOCK[b.id] = 0; } });
  LIGHT_EMIT[B.CAVE_VINES_LIT] = 14; LIGHT_EMIT[B.SPORE_BLOSSOM] = 2;
  LIGHT_EMIT[B.TRIAL_SPAWNER] = 4; LIGHT_EMIT[B.TRIAL_SPAWNER_ACTIVE] = 8; LIGHT_EMIT[B.VAULT] = 6; LIGHT_EMIT[B.CONDUIT] = 15;
  LIGHT_EMIT[B.SOUL_LANTERN] = 10; LIGHT_EMIT[B.CRYING_OBSIDIAN] = 10; LIGHT_EMIT[B.MAGMA_BLOCK] = 3; LIGHT_EMIT[B.SCULK_SHRIEKER] = 1;
  LIGHT_EMIT[B.LANTERN] = 15; LIGHT_EMIT[B.CAMPFIRE] = 15; LIGHT_EMIT[B.BLAST_FURNACE_LIT] = LIGHT_EMIT[B.SMOKER_LIT] = 13;
  WG.railInfo = function (id) { return RAIL_INFO[LIST[id].key] || null; }; LIGHT_EMIT[B.NETHER_PORTAL_X] = LIGHT_EMIT[B.NETHER_PORTAL_Z] = 11;
  // ぶつかる高さのおおよそ（固いブロックは 1、ベッドは 9/16、ほかは 0）。正確な形は WG.blockBoxes。
  var COLLIDE = new Float32Array(N);
  LIST.forEach(function (b) {
    var k = b.kind, key = b.key;
    COLLIDE[b.id] = k === 'solid' ? 1 : k === 'bed' ? 9 / 16 : k === 'farm' ? 15 / 16 : k === 'stairs' ? 1 : k === 'fence' ? 1.5 :
      k === 'slab' ? (/_TOP$/.test(key) ? 1 : 0.5) : k === 'door' ? (/C[LU]$/.test(key) ? 1 : 0) :
      k === 'repeater' ? 2 / 16 : k === 'piston' || k === 'phead' || k === 'anvil' ? 1 : k === 'etable' ? 0.75 : k === 'stand' ? 0.875 : k === 'lantern' ? 9 / 16 : k === 'cutter' ? 9 / 16 : k === 'campfire' ? 7 / 16 : k === 'composter' ? 1 : k === 'wall' ? 1.5 : k === 'pane' ? 1 : k === 'gate' ? (/O$/.test(key) ? 0 : 1.5) :
      k === 'trapdoor' ? (/_B$/.test(key) ? 3 / 16 : 1) : k === 'pot' ? 6 / 16 : k === 'beacon' ? 1 : k === 'skull' ? 0.5 : k === 'snowlayer' ? 2 / 16 : k === 'lily' ? 1 / 16 : k === 'bamboo' ? 1 : k === 'cocoa' ? 0 : k === 'sculk' ? 0.5 : k === 'moving' ? 1 : k === 'cake' ? 0.5 : k === 'cauldron' ? 1 : k === 'lrod' ? 1 : k === 'dpot' ? 1 : k === 'conduit' ? 0.5 : k === 'carpet' ? 1 / 16 : k === 'azalea' ? 1 : k === 'bigdrip' ? 15 / 16 : 0;
  });
  WG.COLLIDE = COLLIDE;

  // ---- 形（1/16 ブロック単位の箱の並び）----
  // 描くときと、ぶつかるときの形。nb(dx, dz) は横の隣のブロック（柵のつながり）。forCollide なら柵は高さ 1.5。
  var SHAPED = { stairs: 1, slab: 1, fence: 1, door: 1, ladder: 1, farm: 1, lever: 1, button: 1, plate: 1, repeater: 1, piston: 1, phead: 1, etable: 1, anvil: 1, stand: 1,
    hopper: 1, comparator: 1, daylight: 1, lantern: 1, portal: 1, cutter: 1, campfire: 1, composter: 1, wall: 1, pane: 1, trapdoor: 1, gate: 1, sign: 1, frame: 1, pot: 1, beacon: 1, skull: 1, endportal: 1, bamboo: 1, lily: 1, snowlayer: 1, cocoa: 1, vine: 1, rod: 1, gateway: 1, hook: 1, tripwire: 1, sculk: 1, moving: 1, cake: 1, cauldron: 1, lrod: 1, dpot: 1, conduit: 1, carpet: 1, azalea: 1, bigdrip: 1, drip: 1 };
  // 形はあるが、ぶつからないもの
  var NOCOLLIDE = { lever: 1, button: 1, plate: 1, portal: 1, sign: 1, frame: 1, endportal: 1, cocoa: 1, vine: 1, rod: 1, gateway: 1, hook: 1, tripwire: 1 };
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
  function redstoneBoxes(id, k, key, forCollide, nb) {
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
      var pm = /^OAK/.test(key) ? B.OAK_PLANKS : /^LIGHT_W/.test(key) ? B.GOLD_BLOCK : /^HEAVY_W/.test(key) ? B.IRON_BLOCK : B.STONE;
      return [on ? [2, 0, 2, 14, 1, 14, pm] : [1, 0, 1, 15, 1, 15, pm]];
    }
    if (k === 'repeater') {
      var m = /REPEATER_([NESW])(\d)/.exec(key), dl = +m[2], tip = on ? B.REDSTONE_BLOCK : B.NETHER_BRICKS, out = [[0, 0, 0, 16, 2, 16]];
      // 横からオンのリピーター・コンパレーターに押さえられているとロック（本家と同じく、動く方のトーチの所に棒）
      var lockv = { N: [[1, 0], [-1, 0]], S: [[1, 0], [-1, 0]], E: [[0, 1], [0, -1]], W: [[0, 1], [0, -1]] }[m[1]], locked = false;
      if (nb) lockv.forEach(function (q) {
        var sid = nb(q[0], q[1]), sk = LIST[sid] && LIST[sid].key, sm = sk && /^(?:REPEATER_([NESW])\d|COMPARATOR_([NESW])[CS])_ON$/.exec(sk);
        if (sm) { var sf = sm[1] || sm[2], sv = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[sf]; if (q[0] + sv[0] === 0 && q[1] + sv[1] === 0) locked = true; }
      });
      [2, 4 + dl * 2].forEach(function (z, ti) {
        if (ti === 1 && locked) { out.push([2, 2, z, 14, 4, z + 2, B.BEDROCK]); return; }
        out.push([7, 2, z, 9, 5, z + 2, B.OAK_PLANKS], [7, 5, z, 9, 7, z + 2, tip, on ? 1 : 0]);
      });
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
    // ランタン：光る胴と、上の金具
    if (k === 'portal') return /_X$/.test(key) ? [[0, 0, 6, 16, 16, 10, B.NETHER_PORTAL_X, 1]] : [[6, 0, 0, 10, 16, 16, B.NETHER_PORTAL_Z, 1]];
    if (k === 'wall') return linkBoxes(nb, forCollide ? [4, 0, 4, 12, 24, 12] : [4, 0, 4, 12, 16, 12], forCollide ? [5, 11, 0, 24] : [5, 11, 0, 14], wallLink);
    if (k === 'pane') {
      var pb = linkBoxes(nb, [7, 0, 7, 9, 16, 9], [7, 9, 0, 16], wallLink);
      return pb;
    }
    if (k === 'trapdoor') {
      var ts = key.slice(key.lastIndexOf('_') + 1);
      if (ts === 'B') return [[0, 0, 0, 16, 3, 16]];
      if (ts === 'T') return [[0, 13, 0, 16, 16, 16]];
      return [{ ON: [0, 0, 0, 16, 16, 3], OS: [0, 0, 13, 16, 16, 16], OE: [13, 0, 0, 16, 16, 16], OW: [0, 0, 0, 3, 16, 16] }[ts]];
    }
    if (k === 'gate') {
      var gx = /_X(O)?$/.test(key), open = /O$/.test(key), gb;
      if (forCollide) return open ? [] : gx ? [[0, 0, 6, 16, 24, 10]] : [[6, 0, 0, 10, 24, 16]];
      gb = open ? [[0, 5, 7, 2, 16, 9], [14, 5, 7, 16, 16, 9], [0, 6, 9, 2, 9, 15], [0, 12, 9, 2, 15, 15], [14, 6, 9, 16, 9, 15], [14, 12, 9, 16, 15, 15]]
        : [[0, 5, 7, 2, 16, 9], [14, 5, 7, 16, 16, 9], [2, 6, 7, 14, 9, 9], [2, 12, 7, 14, 15, 9], [6, 9, 7, 10, 12, 9]];
      return gx ? gb : gb.map(function (b) { return [b[2], b[1], b[0], b[5], b[4], b[3]]; });
    }
    if (k === 'sign') {
      var sd = key.slice(-1);
      if (/^WALL_/.test(key)) return [FACE_BOX[sd]([0, 4, 16, 12], 1.5)];
      return sd === 'N' || sd === 'S' ? [[7.25, 0, 7.25, 8.75, 9, 8.75], [0, 8, 7.25, 16, 16, 8.75]] : [[7.25, 0, 7.25, 8.75, 9, 8.75], [7.25, 8, 0, 8.75, 16, 16]];
    }
    if (k === 'frame') return [FACE_BOX[key.slice(-1)]([2, 2, 14, 14], 1)];
    if (k === 'pot') {
      var pot = [[5, 0, 5, 11, 6, 11, B.FLOWER_POT], [6, 5, 6, 10, 6.2, 10, B.DIRT]], pk2 = key.replace('POTTED_', '');
      if (pk2 === 'DANDELION' || pk2 === 'POPPY') pot.push([7, 6, 7, 9, 10, 9, B.SHORT_GRASS], [6, 10, 6, 10, 13, 10, B[pk2]]);
      else if (/MUSHROOM/.test(pk2)) pot.push([7, 6, 7, 9, 9, 9, B[pk2]], [5.5, 9, 5.5, 10.5, 11, 10.5, B[pk2]]);
      else if (pk2 === 'CACTUS') pot.push([6, 6, 6, 10, 15, 10, B.CACTUS]);
      return pot;
    }
    if (k === 'skull') return [[4, 0, 4, 12, 8, 12]];
    if (k === 'bamboo') return [[6.5, 0, 6.5, 9.5, 16, 9.5]];
    if (k === 'lily') return [[0, 0, 0, 16, 0.4, 16]];
    if (k === 'snowlayer') return [[0, 0, 0, 16, 2, 16]];
    if (k === 'cocoa') {
      var cd = key.split('_')[1], big = /_1$/.test(key), hw = big ? 3 : 2, hh = big ? 7 : 5, off = big ? 6 : 4;
      var cbx = { N: [8 - hw, 12 - hh, 1, 8 + hw, 12, 1 + off], S: [8 - hw, 12 - hh, 15 - off, 8 + hw, 12, 15], W: [1, 12 - hh, 8 - hw, 1 + off, 12, 8 + hw], E: [15 - off, 12 - hh, 8 - hw, 15, 12, 8 + hw] }[cd];
      return [cbx];
    }
    if (k === 'vine') return [LADDER[FACE_OF[key.slice(-1)]]];
    if (k === 'endportal') return [[0, 0, 0, 16, 12, 16, B.END_PORTAL, 1]];
    if (k === 'gateway') return [[0, 0, 0, 16, 16, 16, B.END_PORTAL, 1]];
    if (k === 'moving') return forCollide ? [[0, 0, 0, 16, 16, 16]] : [];
    if (k === 'cauldron') {
      var lv = +(key.split('_')[1] || 0), cb = [[0, 3, 0, 16, 16, 2, B.CAULDRON], [0, 3, 14, 16, 16, 16, B.CAULDRON], [0, 3, 2, 2, 16, 14, B.CAULDRON], [14, 3, 2, 16, 16, 14, B.CAULDRON],
        [2, 3, 2, 14, 4, 14, B.CAULDRON], [0, 0, 0, 4, 3, 2, B.CAULDRON], [0, 0, 2, 2, 3, 4, B.CAULDRON], [12, 0, 0, 16, 3, 2, B.CAULDRON], [14, 0, 2, 16, 3, 4, B.CAULDRON],
        [0, 0, 14, 4, 3, 16, B.CAULDRON], [0, 0, 12, 2, 3, 14, B.CAULDRON], [12, 0, 14, 16, 3, 16, B.CAULDRON], [14, 0, 12, 16, 3, 14, B.CAULDRON]];
      if (lv && !forCollide) cb.push([2, 4, 2, 14, 6 + lv * 3, 14, B.WATER]);   // 中の水
      return cb;
    }
    if (k === 'carpet') return [[0, 0, 0, 16, 1, 16, id]];
    if (k === 'azalea') return forCollide ? [[0, 0, 0, 16, 16, 16, id]] : [[0, 7, 0, 16, 16, 16, id], [6, 0, 6, 10, 7, 10, B.OAK_LOG], [2, 4, 2, 5, 7, 5, id], [11, 5, 11, 14, 7, 14, id]];
    if (k === 'bigdrip') return forCollide ? [[0, 14, 0, 16, 15, 16, id]] : [[0, 14, 0, 16, 15, 16, id], [7, 0, 7, 9, 14, 9, B.SMALL_DRIPLEAF]];
    if (k === 'drip') {
      if (forCollide) return [];
      var up = /_UP_/.test(key), mid = /_MID$/.test(key), tx = B.POINTED_DRIPSTONE_UP_TIP;
      if (mid) return [[4, 0, 4, 12, 16, 12, tx]];
      return up ? [[5, 0, 5, 11, 7, 11, tx], [6, 7, 6, 10, 12, 10, tx], [7, 12, 7, 9, 16, 9, tx]] : [[5, 9, 5, 11, 16, 11, tx], [6, 4, 6, 10, 9, 10, tx], [7, 0, 7, 9, 4, 9, tx]];
    }
    if (k === 'dpot') return [[1, 0, 1, 15, 13, 15, B.DECORATED_POT], [4, 13, 4, 12, 14, 12, B.DECORATED_POT], [3, 14, 3, 13, 16, 13, B.DECORATED_POT]];
    if (k === 'conduit') return [[5, 5, 5, 11, 11, 11, B.CONDUIT, 1]];
    if (k === 'lrod') return [[7, 0, 7, 9, 12, 9, B.LIGHTNING_ROD], [6, 12, 6, 10, 16, 10, B.LIGHTNING_ROD, key === 'LIGHTNING_ROD_ON' ? 1 : 0]];
    if (k === 'cake') { var bites = +key.slice(5); return [[1 + bites * 2, 0, 1, 15, 8, 15, B.CAKE_0]]; }   // 食べた分だけ欠ける   // ピストンで動いている途中（絵は別に描く）
    if (k === 'hook') {
      var hf = /HOOK_([NESW])/.exec(key)[1], hon = /_ON$/.test(key);
      return [rotE([0, 1, 6, 2, 11, 10, B.OAK_PLANKS], hf), rotE(hon ? [2, 3, 7, 8, 5, 9, B.IRON_BLOCK] : [2, 5, 7, 8, 7, 9, B.IRON_BLOCK], hf), rotE([7, hon ? 3 : 5, 6, 9, hon ? 5 : 7, 10, B.IRON_BLOCK], hf)];
    }
    if (k === 'tripwire') {
      // 糸：となりの糸かフックの方へ張る（どちらもなければ十字）
      var tw = function (dx, dz) { var n = nb ? nb(dx, dz) : 0, nk = KIND[n]; return nk === 'tripwire' || nk === 'hook'; };
      var tx = tw(1, 0) || tw(-1, 0), tz = tw(0, 1) || tw(0, -1), ty = /_ON$/.test(key) ? 0.6 : 1.4, tb = [];
      if (tx || !tz) tb.push([0, ty, 7.6, 16, ty + 0.5, 8.4]);
      if (tz || !tx) tb.push([7.6, ty, 0, 8.4, ty + 0.5, 16]);
      return tb;
    }
    if (k === 'sculk') {
      var son = /_ON$/.test(key), sb = [[0, 0, 0, 16, 8, 16]];
      [[3, 3], [11, 3], [3, 11], [11, 11]].forEach(function (q) { sb.push([q[0], 8, q[1], q[0] + 2, 16, q[1] + 2, son ? B.SCULK_SENSOR_ON : B.SCULK_SENSOR, son ? 1 : 0]); });
      return sb;
    }
    if (k === 'rod') return [[6, 0, 6, 10, 1, 10, B.PURPUR_BLOCK], [7, 1, 7, 9, 16, 9, B.END_ROD, 1]];
    if (k === 'beacon') return [[0, 0, 0, 16, 16, 16, B.GLASS], [1, 0, 1, 15, 3, 15, B.OBSIDIAN], [3, 3, 3, 13, 13, 13, B.BEACON, 1]];
    if (k === 'cutter') return [[0, 0, 0, 16, 9, 16], [1, 9, 7.5, 15, 13, 8.5, B.IRON_BLOCK]];
    // 焚き火：交差した 4 本の丸太と、灰の台、上の炎
    if (k === 'campfire') return forCollide ? [[0, 0, 0, 16, 7, 16]] : [[1, 0, 0, 5, 4, 16, B.OAK_LOG], [11, 0, 0, 15, 4, 16, B.OAK_LOG], [0, 3, 1, 16, 7, 5, B.OAK_LOG], [0, 3, 11, 16, 7, 15, B.OAK_LOG],
      [5, 0, 5, 11, 1, 11, B.COAL_BLOCK], [4, 4, 4, 12, 15, 12, B.FIRE, 1]];
    // 堆肥箱：板の箱と、中の堆肥（段階ごとに高くなる）
    if (k === 'composter') {
      var lvl = +key.slice(10), cb2 = [[0, 0, 0, 16, 2, 16], [0, 2, 0, 2, 16, 16], [14, 2, 0, 16, 16, 16], [2, 2, 0, 14, 16, 2], [2, 2, 14, 14, 16, 16]];
      if (lvl > 0) cb2.push([2, 2, 2, 14, 2 + Math.min(7, lvl) * 1.75, 14, lvl >= 8 ? B.WHITE_WOOL : B.DIRT]);
      return cb2;
    }
    if (k === 'lantern') return [[5, 0, 5, 11, 7, 11, id, 1], [6, 7, 6, 10, 9, 10, id]];
    return null;
  }
  // ピストンの向き（見た目の「上」の面をどちらへ向けるか）
  var ORIENT = [];
  LIST.forEach(function (b) {
    var m = /PISTON_(?:HEAD_)?([NESWUD])(_X)?$/.exec(b.key);
    if (m && (b.kind === 'piston' || b.kind === 'phead')) ORIENT[b.id] = m[1];
    m = /^(?:DISPENSER|DROPPER|OBSERVER|CRAFTER)_([NESWUD])(_ON)?$/.exec(b.key);
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
  function fenceLink(id) { return KIND[id] === 'fence' || KIND[id] === 'gate' || (KIND[id] === 'solid' && OPAQUE[id]); }
  function wallLink(id) { return KIND[id] === 'wall' || KIND[id] === 'pane' || KIND[id] === 'gate' || (KIND[id] === 'solid' && (OPAQUE[id] || /_STAINED_GLASS$|^GLASS$/.test(LIST[id].key))); }
  // 塀と板ガラス・鉄格子：柱と、つながる向きへの腕
  function linkBoxes(nb, post, arm, link) {
    var out = [post];
    FENCE_DIRS.forEach(function (d) {
      if (!nb || !link(nb(d[0], d[1]))) return;
      var x0 = d[0] > 0 ? post[3] : d[0] < 0 ? 0 : arm[0], x1 = d[0] > 0 ? 16 : d[0] < 0 ? post[0] : arm[1];
      var z0 = d[1] > 0 ? post[5] : d[1] < 0 ? 0 : arm[0], z1 = d[1] > 0 ? 16 : d[1] < 0 ? post[2] : arm[1];
      out.push([x0, arm[2], z0, x1, arm[3], z1]);
    });
    return out;
  }
  var FACE_BOX = { N: function (a, b) { return [a[0], a[1], 16 - b, a[2], a[3], 16]; }, S: function (a, b) { return [a[0], a[1], 0, a[2], a[3], b]; },
    E: function (a, b) { return [0, a[1], a[0], b, a[3], a[2]]; }, W: function (a, b) { return [16 - b, a[1], a[0], 16, a[3], a[2]]; } };
  function blockBoxes(id, nb, forCollide) {
    var k = KIND[id], key = LIST[id].key, f;
    if (forCollide && NOCOLLIDE[k]) return [];
    var rb = redstoneBoxes(id, k, key, forCollide, nb);
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
    else if ((m = /_([NESW])(_ON|_OFF)?$/.exec(k)) && (b.kind === 'lever' || b.kind === 'button' || b.kind === 'rtorch' || b.kind === 'hook')) {
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
    WG.C16B.forEach(function (c) { var f = B['BED_' + c[0] + '_FOOT_' + d], h = B['BED_' + c[0] + '_HEAD_' + d]; if (f != null) { WG.BED_DIR[f] = v; WG.BED_DIR[h] = v; WG.BED_HEAD[h] = true; } });
  });

  WG.FLUID = FLUID;
  WG.FLUID_LEVEL = FLUID_LEVEL;
  WG.fluidId = function (type, level) { return FLUID_ID[type][level]; };
  WG.isWater = function (id) { return FLUID[id] === 1; };
  WG.isChest = function (id) { return id === B.CHEST || id === B.TRAPPED_CHEST; };
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
