// スポーンエッグと、追加の生き物・ブロックのためのアイテムとレシピ（Minecraft の決まりに合わせたもの）。
// - スポーンエッグ：生き物ごとに 1 つ。ブロックに右クリックすると、その面の前に生き物が出る（サバイバルでは 1 個減る）。
//   スポナーに使うと、スポナーから出る生き物がその種類に変わる。スライムの卵は大きさ 1〜4 のどれかが出る。
// - 生き物のドロップ：ウサギの肉・皮、イカスミ。鉄のナゲット。
// - 染料：花・イカスミ・ラピスラズリ・骨粉・サボテン（かまど）から作り、混ぜて 14 色にする。羊毛と合わせて色付きの羊毛。
// - ブロックのレシピ：スライムブロック、干し草の俵、テラコッタ（粘土をかまど）、なめらかな石（石をかまど）、ランタン。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var ITEMS = WG.ITEMS, Craft = WG.Craft, B = WG.B;

  function item(key, name, max, extra) {
    var it = { key: key, name: name, block: -1, max: max || 64, shape: 'lump', color: '#888888' };
    for (var k in extra || {}) it[k] = extra[k];
    ITEMS[key] = it;
    return it;
  }

  // ---------------- スポーンエッグ ----------------
  WG.MOB_ORDER.forEach(function (type) {
    item('SPAWN_EGG_' + type, WG.MOB_TYPES[type].name + 'のスポーンエッグ', 64, { egg: type });
  });

  // 右クリックで生き物を出す。済んだら true
  WG.useSpawnEgg = function (game, t, it) {
    if (!t || !it || !it.egg) return false;
    var wd = game.world, type = it.egg;
    if (t.id === B.SPAWNER) {
      // スポナーの中身を変える
      var key = t.x + ',' + t.y + ',' + t.z, sp = wd.spawners.get(key);
      if (sp) sp.type = type;
      else wd.spawners.set(key, { x: t.x, y: t.y, z: t.z, timer: 200, type: type });
      game.puff(t.x + 0.5, t.y + 0.5, t.z + 0.5, [60, 60, 60], 10);
    } else {
      // 見ている面の前のマス。そこが固ければ、その上
      var x = t.px, y = t.py, z = t.pz;
      if (WG.COLLIDE[wd.block(x, y, z)] >= 1) return true;
      if (WG.COLLIDE[wd.block(x, y, z)] > 0) y += WG.COLLIDE[wd.block(x, y, z)];
      var T = WG.MOB_TYPES[type], m = game.mobs.spawn(type, x + 0.5, y + (T.flies ? 0.5 : 0), z + 0.5);
      m.yaw = Math.atan2(game.walker.pos[0] - m.x, game.walker.pos[2] - m.z); m.pyaw = m.yaw;
      game.puff(m.x, m.y + 0.4, m.z, [230, 230, 230], 10);
    }
    if (game.mode === 'survival') game.inv.take(game.inv.sel, 1);
    return true;
  };

  // ---------------- 材料・食べ物 ----------------
  item('RABBIT_HIDE', 'ウサギの皮'); item('INK_SAC', 'イカスミ'); item('IRON_NUGGET', '鉄のナゲット');
  item('RAW_RABBIT', '生のウサギ肉', 64, { food: 3, sat: 0.3 }); item('COOKED_RABBIT', '焼いたウサギ肉', 64, { food: 5, sat: 0.6 });
  Craft.SMELT.RAW_RABBIT = 'COOKED_RABBIT';

  // ---------------- 染料と色付きの羊毛 ----------------
  item('WHITE_DYE', '白色の染料');
  WG.WOOL_COLORS.forEach(function (c) { item(c[0] + '_DYE', c[1] + 'の染料', 64, { dyeColor: c[2] }); });
  ITEMS.WHITE_DYE.dyeColor = '#f0f0ec';
  Craft.SHAPELESS.push(
    [['BONE_MEAL'], 'WHITE_DYE', 1], [['POPPY'], 'RED_DYE', 1], [['DANDELION'], 'YELLOW_DYE', 1],
    [['INK_SAC'], 'BLACK_DYE', 1], [['LAPIS'], 'BLUE_DYE', 1],
    [['RED_DYE', 'YELLOW_DYE'], 'ORANGE_DYE', 2], [['GREEN_DYE', 'WHITE_DYE'], 'LIME_DYE', 2], [['RED_DYE', 'WHITE_DYE'], 'PINK_DYE', 2],
    [['BLACK_DYE', 'WHITE_DYE'], 'GRAY_DYE', 2], [['GRAY_DYE', 'WHITE_DYE'], 'LIGHT_GRAY_DYE', 2], [['BLUE_DYE', 'GREEN_DYE'], 'CYAN_DYE', 2],
    [['RED_DYE', 'BLUE_DYE'], 'PURPLE_DYE', 2], [['PURPLE_DYE', 'PINK_DYE'], 'MAGENTA_DYE', 2], [['BLUE_DYE', 'WHITE_DYE'], 'LIGHT_BLUE_DYE', 2]
  );
  Craft.SMELT.CACTUS = 'GREEN_DYE';
  WG.WOOL_COLORS.forEach(function (c) { Craft.SHAPELESS.push([[c[0] + '_DYE', 'WHITE_WOOL'], c[0] + '_WOOL', 1]); });

  // ---------------- 追加のブロックのレシピ ----------------
  Craft.SHAPED.push(
    [['###', '###', '###'], { '#': 'SLIME_BALL' }, 'SLIME_BLOCK', 1],
    [['###', '###', '###'], { '#': 'WHEAT' }, 'HAY_BALE', 1],
    [['###', '###', '###'], { '#': 'IRON_NUGGET' }, 'IRON_INGOT', 1],
    [['NNN', 'NTN', 'NNN'], { N: 'IRON_NUGGET', T: 'TORCH' }, 'LANTERN', 1]
  );
  Craft.SHAPELESS.push([['SLIME_BLOCK'], 'SLIME_BALL', 9], [['HAY_BALE'], 'WHEAT', 9], [['IRON_INGOT'], 'IRON_NUGGET', 9]);
  Craft.SMELT.CLAY = 'TERRACOTTA';
  Craft.SMELT.STONE = 'SMOOTH_STONE';
})(typeof window !== 'undefined' ? window : globalThis);
