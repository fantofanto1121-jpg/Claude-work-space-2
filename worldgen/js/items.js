// アイテムとインベントリ。
// ブロックの硬度・最大スタック数・ドロップは、提供された PDF「全ブロック図鑑」の表の値。
// ドロップの個数（レッドストーン 4〜5 個など）は PDF にないので、Minecraft の値に合わせた。
// ブロック以外のアイテム（石炭・道具・食べ物など）と、扉・階段などの新しいブロックのアイテムの絵は、
// 提供された PDF「アイテム図鑑」の 16×16 のアイコン（js/icons.js）。アイコンがないものだけ 8×8 の簡単な絵を使う。
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
  // アイテム図鑑 PDF から加えたブロック（硬度とドロップは Minecraft の値。作物は play.js で実り具合に合わせて落とす）
  BLOCK_DATA.push(['FARMLAND', 0.6, 'DIRT'], ['FARMLAND_MOIST', 0.6, 'DIRT'], ['BROWN_MUSHROOM', 0, 'BROWN_MUSHROOM'],
    ['RED_MUSHROOM', 0, 'RED_MUSHROOM'], ['COBWEB', 4, 'STRING'], ['FIRE', 0, null]);
  for (var cs = 0; cs < 8; cs++) BLOCK_DATA.push(['WHEAT_' + cs, 0, 'WHEAT_SEEDS']);
  for (cs = 0; cs < 4; cs++) BLOCK_DATA.push(['CARROTS_' + cs, 0, 'CARROT'], ['POTATOES_' + cs, 0, 'POTATO']);
  var MAT_HARD = { CHERRY: 2, MANGROVE: 2, OAK: 2, SPRUCE: 2, ACACIA: 2, BIRCH: 2, JUNGLE: 2, COBBLESTONE: 2, STONE_BRICK: 1.5, SANDSTONE: 0.8, BRICK: 2, DARK_OAK: 2, NETHER_BRICK: 2, PURPUR: 1.5, PRISMARINE_BRICK: 1.5, BLACKSTONE_BRICK: 1.5, END_STONE_BRICK: 3 };
  WG.WOODS.forEach(function (w) {
    WG.DIR4.forEach(function (d) {
      ['C', 'O'].forEach(function (o) { BLOCK_DATA.push([w[0] + '_DOOR_' + d + o + 'L', 3, w[0] + '_DOOR'], [w[0] + '_DOOR_' + d + o + 'U', 3, null]); });
    });
    BLOCK_DATA.push([w[0] + '_FENCE', 2, w[0] + '_FENCE']);
  });
  WG.SHAPE_MATS.forEach(function (m) {
    WG.DIR4.forEach(function (d) { BLOCK_DATA.push([m[0] + '_STAIRS_' + d, MAT_HARD[m[0]], m[0] + '_STAIRS'], [m[0] + '_STAIRS_' + d + '_T', MAT_HARD[m[0]], m[0] + '_STAIRS']); });
    BLOCK_DATA.push([m[0] + '_SLAB', MAT_HARD[m[0]], m[0] + '_SLAB'], [m[0] + '_SLAB_TOP', MAT_HARD[m[0]], m[0] + '_SLAB'],
      [m[0] + '_SLAB_DOUBLE', MAT_HARD[m[0]], m[0] + '_SLAB', 2, 2]);
  });
  WG.DIR4.forEach(function (d) { BLOCK_DATA.push(['LADDER_' + d, 0.4, 'LADDER']); });
  // レッドストーン・エンチャント・醸造のブロック
  WG.BLOCKS.forEach(function (b) {
    var k = b.key, m;
    if (/^HOPPER_/.test(k)) BLOCK_DATA.push([k, 3, 'HOPPER']);
    else if ((m = /^(DISPENSER|DROPPER|OBSERVER)_/.exec(k))) BLOCK_DATA.push([k, 3.5, m[1]]);
    else if (b.kind === 'comparator') BLOCK_DATA.push([k, 0, 'COMPARATOR']);
    else if (b.kind === 'daylight') BLOCK_DATA.push([k, 0.2, 'DAYLIGHT_DETECTOR']);
    else if (b.kind === 'wire') BLOCK_DATA.push([k, 0, 'REDSTONE']);
    else if (b.kind === 'rtorch') BLOCK_DATA.push([k, 0, 'REDSTONE_TORCH']);
    else if (b.kind === 'lever') BLOCK_DATA.push([k, 0.5, 'LEVER']);
    else if (b.kind === 'button') BLOCK_DATA.push([k, 0.5, /^OAK/.test(k) ? 'OAK_BUTTON' : 'STONE_BUTTON']);
    else if (b.kind === 'plate') BLOCK_DATA.push([k, 0.5, k.replace(/_ON$/, '')]);
    else if (b.kind === 'repeater') BLOCK_DATA.push([k, 0, 'REPEATER']);
    else if (b.kind === 'piston') BLOCK_DATA.push([k, 1.5, /^STICKY/.test(k) ? 'STICKY_PISTON' : 'PISTON']);
    else if (b.kind === 'phead') BLOCK_DATA.push([k, 1.5, null]);
    else if ((m = /^IRON_DOOR_[NESW][CO]([LU])$/.exec(k))) BLOCK_DATA.push([k, 5, m[1] === 'L' ? 'IRON_DOOR' : null]);
    else if (/^NETHER_WART_/.test(k)) BLOCK_DATA.push([k, 0, 'NETHER_WART']);
  });
  BLOCK_DATA.push(['REDSTONE_LAMP', 0.3, 'REDSTONE_LAMP'], ['REDSTONE_LAMP_ON', 0.3, 'REDSTONE_LAMP'], ['TNT', 0, 'TNT'],
    ['ENCHANTING_TABLE', 5, 'ENCHANTING_TABLE'], ['BOOKSHELF', 1.5, 'BOOK', 3, 3], ['BREWING_STAND', 0.5, 'BREWING_STAND'],
    ['ANVIL', 5, 'ANVIL'], ['SUGAR_CANE', 0, 'SUGAR_CANE'], ['NOTE_BLOCK', 0.8, 'NOTE_BLOCK']);
  // 追加のブロック（硬度は Minecraft の値）
  BLOCK_DATA.push(['SLIME_BLOCK', 0, 'SLIME_BLOCK'], ['HAY_BALE', 0.5, 'HAY_BALE'], ['TERRACOTTA', 1.25, 'TERRACOTTA'],
    ['SMOOTH_STONE', 2, 'SMOOTH_STONE'], ['LANTERN', 3.5, 'LANTERN']);
  WG.WOOL_COLORS.forEach(function (c) { BLOCK_DATA.push([c[0] + '_WOOL', 0.8, c[0] + '_WOOL']); });
  BLOCK_DATA.push(['NETHER_PORTAL_X', 0, null], ['NETHER_PORTAL_Z', 0, null]);
  BLOCK_DATA.push(['PUMPKIN', 1, 'PUMPKIN'], ['CARVED_PUMPKIN', 1, 'CARVED_PUMPKIN']);
  // 第 2 回：レール（アイテムは RAIL・POWERED_RAIL）、作業ブロック、焚き火（木炭 2 個）、堆肥箱、古代の残骸
  WG.BLOCKS.forEach(function (b) {
    if (/^RAIL_/.test(b.key)) BLOCK_DATA.push([b.key, 0.7, 'RAIL']);
    else if (/^POWERED_RAIL_/.test(b.key)) BLOCK_DATA.push([b.key, 0.7, 'POWERED_RAIL']);
    else if (/^COMPOSTER_/.test(b.key)) BLOCK_DATA.push([b.key, 0.6, 'COMPOSTER_0']);
  });
  BLOCK_DATA.push(['SMITHING_TABLE', 2.5, 'SMITHING_TABLE'], ['STONECUTTER', 3.5, 'STONECUTTER'], ['CARTOGRAPHY_TABLE', 2.5, 'CARTOGRAPHY_TABLE'],
    ['BLAST_FURNACE', 3.5, 'BLAST_FURNACE'], ['BLAST_FURNACE_LIT', 3.5, 'BLAST_FURNACE'], ['SMOKER', 3.5, 'SMOKER'], ['SMOKER_LIT', 3.5, 'SMOKER'],
    ['CAMPFIRE', 2, 'CHARCOAL', 2, 2], ['ANCIENT_DEBRIS', 30, 'ANCIENT_DEBRIS']);
  // 第 3 回：建材・飾り・収納（ガラスと板ガラスは素手では何も落とさない）
  BLOCK_DATA.push(['BROWN_WOOL', 0.8, 'BROWN_WOOL'], ['GLASS_PANE', 0.3, null], ['IRON_BARS', 5, 'IRON_BARS'], ['FLOWER_POT', 0, 'FLOWER_POT'],
    ['BEACON', 3, 'BEACON'], ['LOOM', 2.5, 'LOOM'], ['BARREL', 2.5, 'BARREL'], ['SHELL_BOX', 2, null], ['LINKED_CHEST', 22.5, 'LINKED_CHEST'],
    ['EMERALD_BLOCK', 5, 'EMERALD_BLOCK'], ['NETHERITE_BLOCK', 50, 'NETHERITE_BLOCK'],
    ['GRANITE', 1.5, 'GRANITE'], ['DIORITE', 1.5, 'DIORITE'], ['ANDESITE', 1.5, 'ANDESITE'], ['TUFF', 1.5, 'TUFF'], ['CALCITE', 0.75, 'CALCITE'],
    ['SMOOTH_BASALT', 1.25, 'SMOOTH_BASALT'], ['AMETHYST_BLOCK', 1.5, 'AMETHYST_BLOCK'], ['AMETHYST_CLUSTER', 1.5, 'AMETHYST_SHARD', 4, 4], ['MELON', 1, 'MELON_SLICE', 3, 7],
    ['BAMBOO', 1, 'BAMBOO'], ['LILY_PAD', 0, 'LILY_PAD'], ['SNOW_LAYER', 0.1, 'SNOWBALL'], ['MUSHROOM_STEM', 0.2, null], ['RED_MUSHROOM_BLOCK', 0.2, 'RED_MUSHROOM', 0, 2],
    ['BROWN_MUSHROOM_BLOCK', 0.2, 'BROWN_MUSHROOM', 0, 2], ['SEAGRASS', 0, null], ['KELP', 0, 'KELP'], ['CRIMSON_NYLIUM', 0.4, 'NETHERRACK'], ['WARPED_NYLIUM', 0.4, 'NETHERRACK'],
    ['CRIMSON_STEM', 2, 'CRIMSON_STEM'], ['WARPED_STEM', 2, 'WARPED_STEM'], ['CRIMSON_PLANKS', 2, 'CRIMSON_PLANKS'], ['WARPED_PLANKS', 2, 'WARPED_PLANKS'],
    ['NETHER_WART_BLOCK', 1, 'NETHER_WART_BLOCK'], ['WARPED_WART_BLOCK', 1, 'WARPED_WART_BLOCK'], ['SHROOMLIGHT', 1, 'SHROOMLIGHT'], ['BLACKSTONE', 1.5, 'BLACKSTONE'],
    ['CRIMSON_ROOTS', 0, 'CRIMSON_ROOTS'], ['WARPED_ROOTS', 0, 'WARPED_ROOTS'],
    ['BEEHIVE', 0.6, 'BEEHIVE'], ['BEE_NEST', 0.3, 'BEE_NEST'], ['DARK_SKULL', 1, 'DARK_SKULL'], ['END_PORTAL', -1, null]);
  // 第 6 回：構造物の建材
  BLOCK_DATA.push(['PRISMARINE', 1.5, 'PRISMARINE'], ['PRISMARINE_BRICKS', 1.5, 'PRISMARINE_BRICKS'], ['DARK_PRISMARINE', 1.5, 'DARK_PRISMARINE'], ['SEA_LANTERN', 0.3, 'PRISMARINE_SHARD', 2, 3],
    ['PURPUR_BLOCK', 1.5, 'PURPUR_BLOCK'], ['PURPUR_PILLAR', 1.5, 'PURPUR_PILLAR'], ['END_STONE_BRICKS', 3, 'END_STONE_BRICKS'], ['END_ROD', 0, 'END_ROD'],
    ['MOSSY_STONE_BRICKS', 1.5, 'MOSSY_STONE_BRICKS'], ['CRACKED_STONE_BRICKS', 1.5, 'CRACKED_STONE_BRICKS'], ['CHISELED_STONE_BRICKS', 1.5, 'CHISELED_STONE_BRICKS'],
    ['POLISHED_BLACKSTONE_BRICKS', 1.5, 'POLISHED_BLACKSTONE_BRICKS'], ['GILDED_BLACKSTONE', 1.5, 'GILDED_BLACKSTONE'], ['DARK_OAK_PLANKS', 2, 'DARK_OAK_PLANKS'], ['DARK_OAK_LOG', 2, 'DARK_OAK_LOG'], ['CHERRY_PLANKS', 2, 'CHERRY_PLANKS'], ['CHERRY_LOG', 2, 'CHERRY_LOG'], ['CHERRY_LEAVES', 0.2, null], ['MANGROVE_PLANKS', 2, 'MANGROVE_PLANKS'], ['MANGROVE_LOG', 2, 'MANGROVE_LOG'], ['MANGROVE_LEAVES', 0.2, null],
    ['NETHER_BRICK_FENCE', 2, 'NETHER_BRICK_FENCE'], ['END_PORTAL_FRAME_EYE', -1, null], ['END_GATEWAY', -1, null]);
  // レッドストーンの見直しで加えた部品
  BLOCK_DATA.push(['TARGET', 0.5, 'TARGET'], ['TRAPPED_CHEST', 2.5, 'TRAPPED_CHEST'], ['TRIPWIRE', 0, 'STRING'], ['TRIPWIRE_ON', 0, 'STRING'],
    ['LIGHT_WEIGHTED_PRESSURE_PLATE', 0.5, 'LIGHT_WEIGHTED_PRESSURE_PLATE'], ['LIGHT_WEIGHTED_PRESSURE_PLATE_ON', 0.5, 'LIGHT_WEIGHTED_PRESSURE_PLATE'],
    ['HEAVY_WEIGHTED_PRESSURE_PLATE', 0.5, 'HEAVY_WEIGHTED_PRESSURE_PLATE'], ['HEAVY_WEIGHTED_PRESSURE_PLATE_ON', 0.5, 'HEAVY_WEIGHTED_PRESSURE_PLATE'],
    ['SCULK_SENSOR', 1.5, 'SCULK_SENSOR'], ['SCULK_SENSOR_ON', 1.5, 'SCULK_SENSOR'], ['COPPER_BULB', 3, 'COPPER_BULB'], ['COPPER_BULB_LIT', 3, 'COPPER_BULB'],
    ['SLIME_BLOCK', 0, 'SLIME_BLOCK'], ['HONEY_BLOCK', 0, 'HONEY_BLOCK'], ['HAY_BLOCK', 0.5, 'HAY_BLOCK'], ['MOVING_PISTON', -1, null]);
  WG.DIR4.forEach(function (d) { BLOCK_DATA.push(['TRIPWIRE_HOOK_' + d, 0, 'TRIPWIRE_HOOK'], ['TRIPWIRE_HOOK_' + d + '_ON', 0, 'TRIPWIRE_HOOK']); });
  ['N', 'E', 'S', 'W', 'U', 'D'].forEach(function (f) { BLOCK_DATA.push(['CRAFTER_' + f, 1.5, 'CRAFTER']); });
  ['DETECTOR_RAIL', 'ACTIVATOR_RAIL'].forEach(function (r) { ['NS', 'EW', 'UN', 'US', 'UE', 'UW'].forEach(function (sh) { BLOCK_DATA.push([r + '_' + sh, 0.7, r]); }); });
  WG.CORALS.forEach(function (c) { BLOCK_DATA.push([c[0] + '_CORAL_BLOCK', 1.5, c[0] + '_CORAL_BLOCK'], [c[0] + '_CORAL', 0, null]); });
  WG.BLOCKS.forEach(function (b) {
    var m = /^(PUMPKIN|MELON)_STEM_\d$/.exec(b.key);
    if (m) BLOCK_DATA.push([b.key, 0, m[1] + '_SEEDS']);
    else if (/^COCOA_\w_1$/.test(b.key)) BLOCK_DATA.push([b.key, 0.2, 'COCOA_BEANS', 2, 3]);
    else if (/^COCOA_\w_0$/.test(b.key)) BLOCK_DATA.push([b.key, 0.2, 'COCOA_BEANS']);
    else if (/^VINE_/.test(b.key)) BLOCK_DATA.push([b.key, 0.2, null]);
  });
  WG.COLORS16.forEach(function (c) {
    BLOCK_DATA.push([c[0] + '_CONCRETE', 1.8, c[0] + '_CONCRETE'], [c[0] + '_CONCRETE_POWDER', 0.5, c[0] + '_CONCRETE_POWDER'], [c[0] + '_STAINED_GLASS', 0.3, null],
      [c[0] + '_TERRACOTTA', 1.25, c[0] + '_TERRACOTTA'], [c[0] + '_STAINED_GLASS_PANE', 0.3, null]);
  });
  WG.BLOCKS.forEach(function (b) {
    var k = b.key, m;
    if (/_WALL$/.test(k) && b.kind === 'wall') BLOCK_DATA.push([k, 2, k]);
    else if ((m = /^(\w+)_TRAPDOOR_/.exec(k))) BLOCK_DATA.push([k, m[1] === 'IRON' ? 5 : 3, m[1] + '_TRAPDOOR']);
    else if ((m = /^(\w+)_FENCE_GATE_/.exec(k))) BLOCK_DATA.push([k, 2, m[1] + '_FENCE_GATE']);
    else if (/^(WALL_)?SIGN_/.test(k)) BLOCK_DATA.push([k, 1, 'SIGN']);
    else if (/^ITEM_FRAME_/.test(k)) BLOCK_DATA.push([k, 0, 'ITEM_FRAME']);
    else if (/^PAINTING_/.test(k)) BLOCK_DATA.push([k, 0, null]);
    else if (/^(WALL_)?BANNER_/.test(k)) BLOCK_DATA.push([k, 1, null]);
    else if (/^POTTED_/.test(k)) BLOCK_DATA.push([k, 0, 'FLOWER_POT']);
  });

  // 食べ物 [キー, 名前, 形, 色, 満腹度, 隠し満腹度の倍率]（Minecraft の値）
  var FOOD_DATA = [
    ['RAW_PORKCHOP', '生の豚肉', 'meat', '#e59a93', 3, 0.3], ['COOKED_PORKCHOP', '焼き豚', 'meat', '#b8794a', 8, 0.8],
    ['RAW_BEEF', '生の牛肉', 'meat', '#c4473f', 3, 0.3], ['COOKED_BEEF', 'ステーキ', 'meat', '#7a4a2c', 8, 0.8],
    ['RAW_MUTTON', '生の羊肉', 'meat', '#d4635b', 2, 0.3], ['COOKED_MUTTON', '焼き羊肉', 'meat', '#9a5a36', 6, 0.8],
    ['RAW_CHICKEN', '生の鶏肉', 'drumstick', '#efc9b8', 2, 0.3], ['COOKED_CHICKEN', '焼き鳥', 'drumstick', '#c88a4a', 6, 0.6],
    ['ROTTEN_FLESH', '腐った肉', 'meat', '#8a7a4a', 4, 0.1],
    ['BREAD', 'パン', 'ingot', '#b8823e', 5, 0.6], ['APPLE', 'リンゴ', 'ball', '#c8302a', 4, 0.3],
    ['CARROT', 'ニンジン', 'stick', '#e88a2a', 3, 0.6], ['POTATO', 'ジャガイモ', 'lump', '#c9a26a', 1, 0.3],
    ['BAKED_POTATO', 'ベイクドポテト', 'lump', '#b8823e', 5, 0.6], ['GOLDEN_CARROT', '金のニンジン', 'stick', '#e8c540', 6, 1.2],
    ['GOLDEN_APPLE', '金のリンゴ', 'ball', '#e8c540', 4, 1.2], ['MUSHROOM_STEW', 'キノコシチュー', 'ball', '#a87a52', 6, 0.6]
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
  mine('pickaxe', 0, 'TERRACOTTA SMOOTH_STONE LANTERN STONECUTTER BLAST_FURNACE BLAST_FURNACE_LIT SMOKER SMOKER_LIT');
  mine('pickaxe', 3, 'ANCIENT_DEBRIS NETHERITE_BLOCK');
  mine('pickaxe', 2, 'EMERALD_BLOCK');
  mine('pickaxe', 0, 'GRANITE DIORITE ANDESITE TUFF CALCITE SMOOTH_BASALT AMETHYST_BLOCK BLACKSTONE ' + WG.CORALS.map(function (c) { return c[0] + '_CORAL_BLOCK'; }).join(' '));
  mine('shovel', 0, 'SNOW_LAYER');
  mine('pickaxe', 0, 'COPPER_BULB COPPER_BULB_LIT CRAFTER_N CRAFTER_E CRAFTER_S CRAFTER_W CRAFTER_U CRAFTER_D LIGHT_WEIGHTED_PRESSURE_PLATE HEAVY_WEIGHTED_PRESSURE_PLATE');
  mine('pickaxe', 0, 'PRISMARINE PRISMARINE_BRICKS DARK_PRISMARINE PURPUR_BLOCK PURPUR_PILLAR END_STONE_BRICKS MOSSY_STONE_BRICKS CRACKED_STONE_BRICKS CHISELED_STONE_BRICKS POLISHED_BLACKSTONE_BRICKS GILDED_BLACKSTONE NETHER_BRICK_FENCE');
  mine('pickaxe', 0, 'IRON_BARS LINKED_CHEST ' + WG.BLOCKS.filter(function (b) { return /_CONCRETE$|_TERRACOTTA$|^IRON_TRAPDOOR_/.test(b.key) || b.kind === 'wall'; }).map(function (b) { return b.key; }).join(' '));
  mine('shovel', 0, 'SNOW');
  mine('sword', 0, 'COBWEB');
  mine('pickaxe', 0, WG.BLOCKS.filter(function (b) { return /^(HOPPER|DISPENSER|DROPPER|OBSERVER)_/.test(b.key); }).map(function (b) { return b.key; }).join(' '));
  mine('pickaxe', 0, 'ENCHANTING_TABLE BREWING_STAND ANVIL ' + WG.BLOCKS.filter(function (b) { return /^IRON_DOOR_/.test(b.key); }).map(function (b) { return b.key; }).join(' '));
  WG.SHAPE_MATS.forEach(function (m) {
    if (!/PLANKS/.test(m[2])) mine('pickaxe', 0, ['N', 'E', 'S', 'W', 'N_T', 'E_T', 'S_T', 'W_T'].map(function (d) { return m[0] + '_STAIRS_' + d; }).join(' ') + ' ' + m[0] + '_SLAB ' + m[0] + '_SLAB_TOP ' + m[0] + '_SLAB_DOUBLE');
  });
  // 速く掘れるが、素手でもドロップするもの
  var FAST = {};
  'ICE GLASS'.split(' ').forEach(function (k) { FAST[k] = 'pickaxe'; });
  'OAK_LOG BIRCH_LOG SPRUCE_LOG JUNGLE_LOG ACACIA_LOG CHERRY_LOG MANGROVE_LOG OAK_PLANKS BIRCH_PLANKS SPRUCE_PLANKS JUNGLE_PLANKS ACACIA_PLANKS CHERRY_PLANKS MANGROVE_PLANKS MANGROVE_ROOTS CRAFTING_TABLE CHEST'.split(' ').forEach(function (k) { FAST[k] = 'axe'; });
  'DIRT GRASS SAND GRAVEL CLAY SOUL_SAND SOUL_SOIL FARMLAND FARMLAND_MOIST'.split(' ').forEach(function (k) { FAST[k] = 'shovel'; });
  WG.BLOCKS.forEach(function (b) {
    var k = b.key;
    if (/^(OAK|SPRUCE|ACACIA|BIRCH|JUNGLE|CHERRY|MANGROVE)_(DOOR_|FENCE|STAIRS_|SLAB|TRAPDOOR_)/.test(k) || /^(WALL_)?SIGN_|^BARREL$|^LOOM$/.test(k) || /^LADDER_/.test(k) || k === 'NOTE_BLOCK' || /^DAYLIGHT_DETECTOR/.test(k) || /PUMPKIN$/.test(k)) FAST[k] = 'axe';
  });

  // 道具：素材ごとの速さ・段階・耐久値（Minecraft の値）
  var TOOL_MATS = [
    ['WOODEN', '木', 2, 0, 59, '#a5824f', 'PLANKS'], ['STONE', '石', 4, 1, 131, '#8c8c8a', 'COBBLES'],
    ['IRON', '鉄', 6, 2, 250, '#dcdcda', 'IRON_INGOT'], ['GOLDEN', '金', 12, 0, 32, '#e8c540', 'GOLD_INGOT'],
    ['DIAMOND', 'ダイヤモンド', 8, 3, 1561, '#62c9c0', 'DIAMOND'],
    // ネザライト：作業台では作れず、鍛冶台でダイヤモンドの道具とネザライトインゴットから作る（8 番目が「作れない」の印）
    ['NETHERITE', 'ネザライト', 9, 4, 2031, '#4a4246', 'NETHERITE_INGOT', true]
  ];
  var TOOL_TYPES = [['PICKAXE', 'pickaxe', 'ツルハシ'], ['AXE', 'axe', '斧'], ['SHOVEL', 'shovel', 'シャベル'], ['SWORD', 'sword', '剣'], ['HOE', 'hoe', 'クワ']];
  // 防具：素材 [キーの頭, 名前, 耐久の倍率, 防御 [頭, 胴, 脚, 足], 防具の強さ, 修理の材料]、部位 [キーの尻, 名前, 耐久の基準]
  var ARMOR_MATS = [['LEATHER', '革の', 5, [1, 3, 2, 1], 0, 'LEATHER'], ['GOLDEN', '金の', 7, [2, 5, 3, 1], 0, 'GOLD_INGOT'],
    ['IRON', '鉄の', 15, [2, 6, 5, 2], 0, 'IRON_INGOT'], ['DIAMOND', 'ダイヤモンドの', 33, [3, 8, 6, 3], 2, 'DIAMOND'],
    // チェーン（作れない。防具鍛冶から買う）とネザライト（鍛冶台）
    ['CHAINMAIL', 'チェーンの', 15, [2, 5, 4, 1], 0, 'IRON_INGOT'], ['NETHERITE', 'ネザライトの', 37, [3, 8, 6, 3], 3, 'NETHERITE_INGOT']];
  var ARMOR_PARTS = [['HELMET', 'ヘルメット', 11], ['CHESTPLATE', 'チェストプレート', 16], ['LEGGINGS', 'レギンス', 15], ['BOOTS', 'ブーツ', 13]];

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
    ['NETHER_BRICK', 'ネザーレンガ（アイテム）', 'ingot', '#46222a'],
    // 生き物のドロップと、その材料
    ['BONE', '骨', 'stick', '#e8e4d4'], ['BONE_MEAL', '骨粉', 'dust', '#ecebe4'], ['GUNPOWDER', '火薬', 'dust', '#5a5a5a'],
    ['FEATHER', '羽根', 'stick', '#f0f0f0'], ['LEATHER', '革', 'lump', '#8a5030'], ['STRING', '糸', 'stick', '#f0f0f0'],
    ['FLINT', '火打石', 'gem', '#3a3a3c'], ['WHEAT', '小麦', 'seeds', '#c8b04a'], ['BOWL', 'ボウル', 'ball', '#8a6a3e'],
    ['ARROW', '矢', 'stick', '#c8c8c8']
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
  var ATTACK = { pickaxe: [2, 3, 4, 2, 5, 6], axe: [7, 9, 9, 7, 9, 10], shovel: [2.5, 3.5, 4.5, 2.5, 5.5, 6.5], sword: [4, 5, 6, 4, 7, 8], hoe: [1, 1, 1, 1, 1, 1] };
  TOOL_MATS.forEach(function (m, mi) {
    TOOL_TYPES.forEach(function (t) {
      var key = m[0] + '_' + t[0];
      ITEMS[key] = { key: key, name: m[1] + 'の' + t[2], block: -1, max: 1, shape: t[1], color: m[5], tool: t[1], speed: m[2], tier: m[3], dur: m[4], mat: m[6], attack: ATTACK[t[1]][mi] };
    });
  });
  FOOD_DATA.forEach(function (d) { ITEMS[d[0]] = { key: d[0], name: d[1], block: -1, max: 64, shape: d[2], color: d[3], food: d[4], sat: d[5] }; });
  ITEMS.MUSHROOM_STEW.max = 1; ITEMS.MUSHROOM_STEW.leaves = 'BOWL';   // 食べるとボウルが残る
  ITEMS.GOLDEN_APPLE.regen = 100;                                        // 再生（5 秒、体力を 4 回復）
  // 植えられる作物（耕地の上に置く）
  ITEMS.WHEAT_SEEDS.plant = 'WHEAT_0'; ITEMS.CARROT.plant = 'CARROTS_0'; ITEMS.POTATO.plant = 'POTATOES_0';
  // 防具
  ARMOR_MATS.forEach(function (m) {
    ARMOR_PARTS.forEach(function (pt, slot) {
      var key = m[0] + '_' + pt[0];
      ITEMS[key] = { key: key, name: m[1] + pt[1], block: -1, max: 1, shape: 'lump', color: '#888888', armor: slot, def: m[3][slot], tough: m[4], dur: m[2] * pt[2], mat: m[5] };
    });
  });
  // 使う道具（耐久値は Minecraft の値）
  ITEMS.BOW = { key: 'BOW', name: '弓', block: -1, max: 1, shape: 'stick', color: '#8a6a3e', bow: true, dur: 384 };
  ITEMS.SHEARS = { key: 'SHEARS', name: 'ハサミ', block: -1, max: 1, shape: 'stick', color: '#d6d6d4', tool: 'shears', speed: 1, tier: 0, dur: 238 };
  ITEMS.FLINT_AND_STEEL = { key: 'FLINT_AND_STEEL', name: '火打石と打ち金', block: -1, max: 1, shape: 'stick', color: '#8c8c8a', igniter: true, dur: 64 };
  ITEMS.BUCKET = { key: 'BUCKET', name: 'バケツ', block: -1, max: 16, shape: 'ball', color: '#c8c8c8', bucket: 0 };
  ITEMS.WATER_BUCKET = { key: 'WATER_BUCKET', name: '水入りバケツ', block: -1, max: 1, shape: 'ball', color: '#3c66a5', bucket: 1 };
  ITEMS.LAVA_BUCKET = { key: 'LAVA_BUCKET', name: '溶岩入りバケツ', block: -1, max: 1, shape: 'ball', color: '#d4621c', bucket: 2 };
  ITEMS.MILK_BUCKET = { key: 'MILK_BUCKET', name: 'ミルク入りバケツ', block: -1, max: 1, shape: 'ball', color: '#f0f0ec', milk: true };
  // 置くと形や向きが決まるブロックのアイテム（扉・はしご・階段・ハーフブロック）。block は一覧に出す代表の形。
  WG.WOODS.forEach(function (w) {
    ITEMS[w[0] + '_DOOR'] = { key: w[0] + '_DOOR', name: w[1] + 'のドア', block: -1, max: 64, door: w[0] };
    ITEMS[w[0] + '_FENCE'].name = w[1] + 'の柵';
  });
  ITEMS.LADDER = { key: 'LADDER', name: 'はしご', block: -1, max: 64, ladder: true };
  ITEMS.IRON_DOOR = { key: 'IRON_DOOR', name: '鉄のドア', block: -1, max: 64, door: 'IRON' };
  // レッドストーンの部品（置くと向きや付く面が決まるもの）
  ITEMS.REDSTONE.wire = true;
  ITEMS.REDSTONE_TORCH = { key: 'REDSTONE_TORCH', name: 'レッドストーントーチ', block: -1, max: 64, rtorch: true };
  ITEMS.LEVER = { key: 'LEVER', name: 'レバー', block: -1, max: 64, attach: 'LEVER' };
  ITEMS.STONE_BUTTON = { key: 'STONE_BUTTON', name: '石のボタン', block: -1, max: 64, attach: 'STONE_BUTTON' };
  ITEMS.OAK_BUTTON = { key: 'OAK_BUTTON', name: 'オークのボタン', block: -1, max: 64, attach: 'OAK_BUTTON' };
  ITEMS.REPEATER = { key: 'REPEATER', name: 'リピーター', block: -1, max: 64, repeater: true };
  ITEMS.PISTON = { key: 'PISTON', name: 'ピストン', block: -1, max: 64, piston: 'PISTON' };
  ITEMS.STICKY_PISTON = { key: 'STICKY_PISTON', name: '粘着ピストン', block: -1, max: 64, piston: 'STICKY_PISTON' };
  ITEMS.SUGAR_CANE.name = 'サトウキビ';
  // 図鑑にアイコンのないもの（リピーター・ピストン）は、ブロックの形で描く
  ITEMS.REPEATER.icon = B.REPEATER_N1; ITEMS.PISTON.icon = B.PISTON_U; ITEMS.STICKY_PISTON.icon = B.STICKY_PISTON_U;
  // ホッパー・ディスペンサー・ドロッパー・オブザーバー・コンパレーター（置くと向きが決まる）
  ITEMS.HOPPER = { key: 'HOPPER', name: 'ホッパー', block: -1, max: 64, oriented: 'HOPPER' };
  ITEMS.DISPENSER = { key: 'DISPENSER', name: 'ディスペンサー', block: -1, max: 64, oriented: 'DISPENSER', icon: B.DISPENSER_S };
  ITEMS.DROPPER = { key: 'DROPPER', name: 'ドロッパー', block: -1, max: 64, oriented: 'DROPPER', icon: B.DROPPER_S };
  ITEMS.OBSERVER = { key: 'OBSERVER', name: 'オブザーバー', block: -1, max: 64, oriented: 'OBSERVER', icon: B.OBSERVER_S };
  ITEMS.COMPARATOR = { key: 'COMPARATOR', name: 'コンパレーター', block: -1, max: 64, comparator: true, icon: B.COMPARATOR_NC };
  WG.SHAPE_MATS.forEach(function (m) {
    ITEMS[m[0] + '_STAIRS'] = { key: m[0] + '_STAIRS', name: m[1] + '階段', block: -1, max: 64, stairs: m[0], hardness: MAT_HARD[m[0]] };
    ITEMS[m[0] + '_SLAB'].name = m[1] + 'ハーフブロック';
    ITEMS[m[0] + '_SLAB'].slab = m[0];
  });
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
    // 剣はクモの巣を速く切る（15）。ハサミは葉とクモの巣（15）、羊毛（5）を速く切り、葉とクモの巣をそのまま取れる。
    if (match && tool.tool === 'sword') speed = 15;
    if (tool && tool.tool === 'shears' && b) {
      if (/_LEAVES$/.test(blockKey) || blockKey === 'COBWEB') { speed = 15; match = true; }
      else if (blockKey === 'WHITE_WOOL') { speed = 5; match = true; }
    }
    var harvest = !(b && b.needTier != null) || (match && (tool.tier || 0) >= b.needTier);
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

  // PDF のアイテム図鑑のアイコン（RGBA 16×16）。なければ null。
  var icon16Cache = {};
  function itemIcon16(key) {
    var ic = WG.ICONS && WG.ICONS[key];
    if (!ic) return null;
    if (icon16Cache[key]) return icon16Cache[key];
    var bin = typeof atob === 'function' ? atob(ic.px) : Buffer.from(ic.px, 'base64').toString('binary'), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return (icon16Cache[key] = a);
  }

  // 置けるブロック（クリエイティブの一覧に出すもの）
  var PLACEABLE = WG.BLOCKS.filter(function (b) {
    var k = b.key;
    return b.id !== B.AIR && !WG.FLUID[b.id] && k !== 'FURNACE_LIT' && !/^WALL_TORCH_/.test(k) && !/^BED_/.test(k) &&
      // 向き・開け閉め・育ち具合の違うもの、置けないもの（扉・はしご・階段は別のアイテムで置く）
      !/_DOOR_|^LADDER_|_STAIRS_|_SLAB_TOP$|_SLAB_DOUBLE$|^WHEAT_|^CARROTS_|^POTATOES_|^FARMLAND|^FIRE$|^REDSTONE_WIRE_|REDSTONE_(WALL_)?TORCH|^LEVER_|_BUTTON_|_ON$|^REPEATER_|PISTON_|^NETHER_WART_|^REDSTONE_LAMP_ON$|^HOPPER_|^DISPENSER_|^DROPPER_|^OBSERVER_|^COMPARATOR_|_INV$|_PDF$|^NETHER_PORTAL|^RAIL_|^POWERED_RAIL_|^COMPOSTER_[1-8]$|_LIT$|_TRAPDOOR_|_FENCE_GATE_|^(WALL_)?SIGN_|^ITEM_FRAME_|^PAINTING_|^(WALL_)?BANNER_|^POTTED_|^END_PORTAL$|_STEM_\d$|^COCOA_|^VINE_|^TRIPWIRE|^CRAFTER_|^DETECTOR_RAIL_|^ACTIVATOR_RAIL_|^MOVING_PISTON$|^CAKE_|^BEETROOTS_|^SWEET_BERRY_BUSH_|^JUKEBOX$|^CAULDRON_\d$|^LIGHTNING_ROD_ON$|^SUSPICIOUS_(SAND|GRAVEL)_[123]$|^TRIAL_SPAWNER_ACTIVE$|^VAULT_OPEN$/.test(k);
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
  // extra：地図の場所・箱の中身・旗の模様など（あるものは重ねない）
  Inventory.prototype.add = function (key, n, dmg, ench, extra) {
    var max = ITEMS[key].max, s = this.slots, left = n, i, plain = function (q) { return !q.ench && !q.map && !q.box && !q.layers && !q.loaded; };
    for (i = 0; i < 36 && left > 0; i++) {
      if (s[i] && s[i].key === key && s[i].n < max && !ench && !extra && plain(s[i])) { var a = Math.min(left, max - s[i].n); s[i].n += a; left -= a; }
    }
    for (i = 0; i < 36 && left > 0; i++) {
      if (!s[i]) { var b = Math.min(left, max); s[i] = { key: key, n: b }; if (dmg) s[i].dmg = dmg; if (ench) s[i].ench = ench; if (extra) Object.assign(s[i], JSON.parse(JSON.stringify(extra))); left -= b; }
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
    var px = WG.skinTexture(id, face), col = WG.skinColor(id, face), n = px && px.length === 192 ? 8 : 16;
    var c = document.createElement('canvas'); c.width = c.height = n;
    var x = c.getContext('2d'), img = x.createImageData(n, n);
    for (var i = 0; i < n * n; i++) {
      var r = px ? px[i * 3] : col[0], g = px ? px[i * 3 + 1] : col[1], b = px ? px[i * 3 + 2] : col[2];
      img.data[i * 4] = r * tint[0]; img.data[i * 4 + 1] = g * tint[1]; img.data[i * 4 + 2] = b * tint[2]; img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  function spriteCanvas(rgba) {
    var n = rgba.length === 1024 ? 16 : 8, c = document.createElement('canvas'); c.width = c.height = n;
    var x = c.getContext('2d'), img = x.createImageData(n, n);
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
    var sprite = itemIcon16(key) || (it.shape ? itemPixels(key) : null) || (it.bed ? WG.skinCutout(B.BED_FOOT_N) : ((WG.blockKind(it.block) === "deco" || WG.blockKind(it.block) === "pane") && WG.skinCutout(it.block)) || (WG.blockKind(it.block) === "plant" && WG.plantPixels ? WG.plantPixels(it.block) : null));
    if (sprite) {
      x.drawImage(spriteCanvas(sprite), sprite.length === 1024 ? 0 : 4, sprite.length === 1024 ? 0 : 4, sprite.length === 1024 ? 48 : 40, sprite.length === 1024 ? 48 : 40);
    } else {
      var id = it.block >= 0 ? it.block : it.icon, plains = WG.BI ? WG.BI.PLAINS : -1;
      var tTop = WG.tintOf(id, 'top', plains), tSide = WG.tintOf(id, 'side', plains);
      var top = faceCanvas(id, 'top', tTop), side = faceCanvas(id, 'side', tSide);
      x.setTransform(20 / 8, 10 / 8, -20 / 8, 10 / 8, 24, 3); x.drawImage(top, 0, 0, 8, 8);
      x.setTransform(20 / 8, 10 / 8, 0, 23 / 8, 4, 13); x.drawImage(side, 0, 0, 8, 8);
      x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(0, 0, 8, 8);
      x.setTransform(20 / 8, -10 / 8, 0, 23 / 8, 24, 23); x.drawImage(side, 0, 0, 8, 8);
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
  WG.itemIcon16 = itemIcon16;
  WG.Inventory = Inventory;
  WG.iconURL = iconURL;
  WG.itemName = function (key) { return ITEMS[key] ? ITEMS[key].name : key; };
})(typeof window !== 'undefined' ? window : globalThis);
