// 生き物 その 1（ロードマップ 第 14 段階）
// イルカ・発光イカ（光るイカスミ・輝く額縁）・ヤマネコ・ラバ・ゾンビ馬・骸骨馬・行商人のラマ
// 運び精（アイテムを渡すと、同じものを集めてくる）・大鼻獣（古代の種を掘り出す：トーチフラワー・ピッチャープラント）
// ヨロイマル（丸くなって身を守る。ブラシで鎧のかけら → オオカミの鎧）
// 魚の種類分け：タラ・サケ・フグ（近づくとふくらみ、さわると毒）・熱帯魚（色と模様がいろいろ）
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Mobs = WG.Mobs, TYPES = WG.MOB_TYPES, MODELS = WG.MOB_MODELS;
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function box(x, y, z, w, h, d, c, sw, extra) { var b = { o: [x, y, z], s: [w, h, d], c: hex(c), sw: sw || null }; for (var k in extra || {}) b[k] = extra[k]; return b; }
  function legs4(x, zf, zb, w, h, c) { return [box(-x, 0, zf, w, h, w, c, 'L1'), box(x - w, 0, zf, w, h, w, c, 'L2'), box(-x, 0, zb, w, h, w, c, 'L2'), box(x - w, 0, zb, w, h, w, c, 'L1')]; }
  var EYE = '#1f1d1c';
  function lum(c) { return c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; }
  // 模型の色を、明るさを保ったまま別の色にする
  function recolor(parts, main, keepDark) {
    var base = Math.max(1, Math.max.apply(null, parts.map(function (p) { return lum(p.c); })) * 0.8), m = hex(main);
    return parts.map(function (p) {
      var q = Object.assign({}, p), l = lum(p.c);
      if (keepDark && l < 40) return q;
      var k = Math.min(1.35, l / base);
      q.c = [Math.min(255, m[0] * k), Math.min(255, m[1] * k), Math.min(255, m[2] * k)];
      return q;
    });
  }
  function T(k, o) {
    TYPES[k] = Object.assign({ food: [], drops: [] }, o);
    if (WG.MOB_ORDER && WG.MOB_ORDER.indexOf(k) < 0) WG.MOB_ORDER.push(k);
    ITEMS['SPAWN_EGG_' + k] = { key: 'SPAWN_EGG_' + k, name: o.name + 'のスポーンエッグ', block: -1, max: 64, shape: 'lump', color: '#888888', egg: k };
  }

  // ---------------- 見た目 ----------------
  MODELS.DOLPHIN = [box(-3, 2, -8, 6, 6, 16, '#7a8a9a'), box(-2.5, 1.5, -7, 5, 1, 13, '#c8d0d8'), box(-2, 3, 8, 4, 4, 5, '#7a8a9a'), box(-1, 3, 13, 2, 2, 3, '#8a9aaa'),
    box(-0.5, 8, -2, 1, 4, 4, '#6a7a8a'), box(-1.5, 3.5, -12, 3, 3, 4, '#6a7a8a', 'T1'), box(-5, 4, -14, 10, 1, 3, '#6a7a8a', 'T1'),
    box(-6, 3, 0, 3, 1, 4, '#6a7a8a', 'W1'), box(3, 3, 0, 3, 1, 4, '#6a7a8a', 'W2'), box(-2.2, 5.5, 11, 0.3, 1, 1, EYE), box(1.9, 5.5, 11, 0.3, 1, 1, EYE)];
  MODELS.GLOW_SQUID = recolor(MODELS.SQUID, '#3a9aa0').map(function (p, i) { if (i % 3 === 0) { var q = Object.assign({}, p); q.c = [120, 240, 220]; return q; } return p; });
  MODELS.OCELOT = recolor(MODELS.CAT, '#d8b050').map(function (p) { var q = Object.assign({}, p); delete q.tint; return q; })
    .concat([box(-1.5, 10.1, -3, 1, 0.3, 1, '#5a3a1a'), box(0.5, 10.1, 0, 1, 0.3, 1, '#5a3a1a'), box(-1, 10.1, 2, 1, 0.3, 1, '#5a3a1a'), box(-2.6, 8, -2, 0.3, 1, 1, '#5a3a1a'), box(2.3, 7.5, 1, 0.3, 1, 1, '#5a3a1a')]);
  MODELS.MULE = recolor(MODELS.DONKEY, '#5a3a24', true);
  MODELS.ZOMBIE_HORSE = recolor(MODELS.HORSE, '#5a7a4a', true);
  MODELS.SKELETON_HORSE = recolor(MODELS.HORSE, '#d8d6cc', true).concat([box(-5.1, 13, -9, 10.2, 1, 1, '#a8a69c'), box(-5.1, 13, -5, 10.2, 1, 1, '#a8a69c'), box(-5.1, 13, -1, 10.2, 1, 1, '#a8a69c'), box(-5.1, 13, 3, 10.2, 1, 1, '#a8a69c')]);
  MODELS.TRADER_LLAMA = MODELS.LLAMA.map(function (p) { var q = Object.assign({}, p); if (q.c[0] === 0xb8 && q.c[1] === 0x3a) q.c = [40, 70, 170]; if (q.c[0] === 0xe8 && q.c[1] === 0xc0) q.c = [240, 200, 70]; return q; })
    .concat([box(-6.4, 14, -4, 1, 5, 7, '#6a4a2a'), box(5.4, 14, -4, 1, 5, 7, '#6a4a2a')]);
  // 運び精：青く透けた小さな体と、羽
  MODELS.CARRIER_SPIRIT = [box(-1.5, 3, -1, 3, 4, 2, '#7ac8f0'), box(-2, 7, -2, 4, 4, 4, '#9ad8f8'), box(-1.2, 8.5, 2, 0.8, 1, 0.3, '#2a4a8a', 'EYE'), box(0.4, 8.5, 2, 0.8, 1, 0.3, '#2a4a8a', 'EYE'),
    box(-2.5, 3.5, -0.5, 1, 3, 1, '#7ac8f0'), box(1.5, 3.5, -0.5, 1, 3, 1, '#7ac8f0'), box(-5, 5, -1.8, 3.5, 0.3, 3, '#d8f0ff', 'W1'), box(1.5, 5, -1.8, 3.5, 0.3, 3, '#d8f0ff', 'W2')];
  // 大鼻獣：苔むした大きな体と、長い鼻
  MODELS.BIG_NOSE = legs4(8, 4, -10, 4, 6, '#7a3a2a').concat([box(-9, 6, -14, 18, 14, 26, '#a84a32'), box(-9.1, 16, -14, 18.2, 4.2, 26, '#5a8a3a'), box(-8, 19.5, -10, 16, 2, 18, '#6a9a4a'),
    box(-5, 8, 12, 10, 10, 6, '#b85a3a'), box(-3, 6, 18, 6, 6, 6, '#c86a4a'), box(-2, 5, 23.8, 4, 3, 0.3, '#3a2018'), box(-5, 15, 17.9, 1.5, 1.5, 0.3, EYE), box(3.5, 15, 17.9, 1.5, 1.5, 0.3, EYE),
    box(-9.2, 10, -2, 0.3, 4, 10, '#e8d8b0'), box(8.9, 10, -2, 0.3, 4, 10, '#e8d8b0')]);
  // ヨロイマル：丸い甲羅。丸くなると、ほぼ球
  var open = function (m) { return !(m.rolled > 0); }, shut = function (m) { return m.rolled > 0; };
  MODELS.ARMOR_ROLLER = legs4(2.5, 1, -3, 1.5, 2, '#7a5a4a').map(function (p) { p.only = open; return p; }).concat([
    box(-3, 2, -4, 6, 4, 8, '#a07868', null, { only: open }), box(-3.5, 3, -4.5, 7, 4, 9, '#c89a88', null, { only: open }), box(-3.6, 4, -3, 7.2, 0.4, 0.6, '#8a6858', null, { only: open }),
    box(-3.6, 4, -1, 7.2, 0.4, 0.6, '#8a6858', null, { only: open }), box(-3.6, 4, 1, 7.2, 0.4, 0.6, '#8a6858', null, { only: open }),
    box(-1.5, 2, 4, 3, 3, 3, '#d8a898', null, { only: open }), box(-1.2, 5, 5.5, 0.8, 2, 0.6, '#d8a898', null, { only: open }), box(0.4, 5, 5.5, 0.8, 2, 0.6, '#d8a898', null, { only: open }),
    box(-1.2, 3.5, 7, 0.6, 0.6, 0.3, EYE, null, { only: open }), box(0.6, 3.5, 7, 0.6, 0.6, 0.3, EYE, null, { only: open }), box(-0.5, 2.5, -6.5, 1, 1, 3, '#a07868', null, { only: open }),
    box(-3.5, 0, -3.5, 7, 7, 7, '#c89a88', null, { only: shut }), box(-3.6, 2, -3.6, 7.2, 0.4, 7.2, '#8a6858', null, { only: shut }), box(-3.6, 4.5, -3.6, 7.2, 0.4, 7.2, '#8a6858', null, { only: shut })]);
  // 魚
  MODELS.COD = [box(-1, 1, -5, 2, 3, 9, '#a89a7a'), box(-1.05, 2.6, -5, 2.1, 1.4, 9, '#8a7c5e'), box(-0.2, 1.5, -8, 0.4, 2, 3, '#8a7a5a', 'T1'), box(-0.2, 4, -2, 0.4, 1, 3, '#8a7a5a'),
    box(-1.1, 2.6, 2.5, 0.3, 0.6, 0.6, EYE), box(0.8, 2.6, 2.5, 0.3, 0.6, 0.6, EYE), box(-1.05, 1.2, -4, 2.1, 0.5, 6, '#d8d0b8')];
  MODELS.SALMON = [box(-1.5, 1, -6, 3, 4, 12, '#b84a3a'), box(-1.55, 3.6, -6, 3.1, 1.4, 12, '#5a6a5a'), box(-0.3, 1.5, -10, 0.6, 3, 4, '#a84030', 'T1'), box(-0.3, 5, -2, 0.6, 1.5, 4, '#5a6a5a'),
    box(-1.6, 3, 4, 0.3, 0.7, 0.7, EYE), box(1.3, 3, 4, 0.3, 0.7, 0.7, EYE)];
  var small = function (m) { return !(m.puffed > 0); }, big = function (m) { return m.puffed > 0; };
  MODELS.PUFFERFISH = [box(-1.5, 1, -1.5, 3, 3, 3, '#e0b840', null, { only: small }), box(-0.2, 2, -3, 0.4, 1.5, 1.5, '#c89a30', 'T1', { only: small }), box(-1.6, 2.6, 0.8, 0.3, 0.6, 0.6, EYE, null, { only: small }), box(1.3, 2.6, 0.8, 0.3, 0.6, 0.6, EYE, null, { only: small }),
    box(-3.5, 0, -3.5, 7, 7, 7, '#e8c048', null, { only: big }), box(-4, 3, -0.5, 0.5, 1, 1, '#f4f0e0', null, { only: big }), box(3.5, 3, -0.5, 0.5, 1, 1, '#f4f0e0', null, { only: big }), box(-0.5, 7, -0.5, 1, 0.5, 1, '#f4f0e0', null, { only: big }),
    box(-0.5, 3, 3.5, 1, 1, 0.5, '#f4f0e0', null, { only: big }), box(-0.5, 3, -4, 1, 1, 0.5, '#f4f0e0', null, { only: big }), box(-2.5, 4.5, 3.5, 1, 1, 0.3, EYE, null, { only: big }), box(1.5, 4.5, 3.5, 1, 1, 0.3, EYE, null, { only: big })];
  MODELS.TROPICAL = [box(-0.5, 1, -2.5, 1, 4, 5, '#f08a20', null, { tint: 1 }), box(-0.55, 2, -1, 1.1, 2, 1, '#f4f4f0'), box(-0.55, 1.5, 1, 1.1, 3, 0.6, '#f4f4f0'),
    box(-0.2, 2, -4.5, 0.4, 2, 2, '#f8f8f0', 'T1'), box(-0.2, 5, -1, 0.4, 1.5, 2.5, '#f8f8f0'), box(-0.6, 3.3, 1.5, 0.2, 0.6, 0.6, EYE), box(0.4, 3.3, 1.5, 0.2, 0.6, 0.6, EYE)];
  // オオカミの鎧（つけたオオカミだけ）
  if (MODELS.WOLF) MODELS.WOLF.push(box(-3.3, 6.5, -5.5, 6.6, 6.2, 9, '#9a7a6a', null, { only: function (m) { return !!m.armored; } }), box(-3.4, 12.4, -5, 6.8, 0.4, 8, '#7a5a4a', null, { only: function (m) { return !!m.armored; } }));

  // ---------------- 種類 ----------------
  T('DOLPHIN', { name: 'イルカ', w: 0.9, h: 0.6, hp: 10, speed: 0.12, swims: true, despawn: true, food: ['COD', 'SALMON'], drops: [['COD', 0, 1]] });
  T('GLOW_SQUID', Object.assign({}, TYPES.SQUID, { name: '発光イカ', drops: [['GLOW_INK_SAC', 1, 3]], glow: true }));
  T('OCELOT', { name: 'ヤマネコ', w: 0.6, h: 0.7, hp: 10, speed: 0.1, food: ['COD', 'SALMON'], breed: ['COD', 'SALMON'], breeds: true, shy: true });
  T('MULE', Object.assign({}, TYPES.DONKEY, { name: 'ラバ', breeds: false }));
  T('ZOMBIE_HORSE', Object.assign({}, TYPES.HORSE, { name: 'ゾンビ馬', breeds: false, hp: 15, drops: [['ROTTEN_FLESH', 0, 2]] }));
  T('SKELETON_HORSE', Object.assign({}, TYPES.HORSE, { name: '骸骨馬', breeds: false, hp: 15, swimOk: true, drops: [['BONE', 0, 2]] }));
  T('TRADER_LLAMA', Object.assign({}, TYPES.LLAMA, { name: '行商人のラマ', breeds: false }));
  T('CARRIER_SPIRIT', { name: '運び精', w: 0.35, h: 0.6, hp: 20, speed: 0.08, flies: true, noFall: true, carrier: true });
  T('BIG_NOSE', { name: '大鼻獣', w: 1.9, h: 1.75, hp: 14, speed: 0.04, food: ['TORCHFLOWER_SEEDS'], breed: ['TORCHFLOWER_SEEDS'], breeds: true, sniffs: true, drops: [['MOSS_BLOCK', 0, 1]] });
  T('ARMOR_ROLLER', { name: 'ヨロイマル', w: 0.7, h: 0.65, hp: 12, speed: 0.06, food: ['SPIDER_EYE'], breed: ['SPIDER_EYE'], breeds: true, rolls: true });
  T('COD', { name: 'タラ', w: 0.5, h: 0.3, hp: 3, speed: 0.05, swims: true, despawn: true, fish: true, drops: [['COD', 1, 1]] });
  T('SALMON', { name: 'サケ', w: 0.7, h: 0.4, hp: 3, speed: 0.06, swims: true, despawn: true, fish: true, drops: [['SALMON', 1, 1]] });
  T('PUFFERFISH', { name: 'フグ', w: 0.7, h: 0.7, hp: 3, speed: 0.03, swims: true, despawn: true, fish: true, drops: [['PUFFERFISH', 1, 1]] });
  T('TROPICAL', { name: '熱帯魚', w: 0.5, h: 0.4, hp: 3, speed: 0.05, swims: true, despawn: true, fish: true, drops: [['TROPICAL_FISH', 1, 1]] });
  if (TYPES.AXOLOTL) TYPES.AXOLOTL.hunts = (TYPES.AXOLOTL.hunts || []).concat(['COD', 'SALMON', 'PUFFERFISH', 'TROPICAL', 'GLOW_SQUID']);
  if (TYPES.CAT && TYPES.CAT.hunts) TYPES.CAT.hunts.push('COD');

  // ---------------- アイテム ----------------
  ITEMS.GLOW_INK_SAC = { key: 'GLOW_INK_SAC', name: '光るイカスミ', block: -1, max: 64, shape: 'lump', color: '#4ad0c0' };
  ITEMS.GLOW_ITEM_FRAME = { key: 'GLOW_ITEM_FRAME', name: '輝く額縁', block: -1, max: 64, frame: true, glow: true };
  ITEMS.TORCHFLOWER_SEEDS = { key: 'TORCHFLOWER_SEEDS', name: 'トーチフラワーの種', block: -1, max: 64, shape: 'lump', color: '#a8783a' };
  ITEMS.PITCHER_POD = { key: 'PITCHER_POD', name: 'ピッチャーのさや', block: -1, max: 64, shape: 'lump', color: '#5a9aa0' };
  ITEMS.TORCHFLOWER = { key: 'TORCHFLOWER', name: 'トーチフラワー', block: B.TORCHFLOWER, max: 64, hardness: 0, drop: 'TORCHFLOWER', dropMin: 1, dropMax: 1, dropChance: 1 };
  ['TORCHFLOWER_CROP_0', 'TORCHFLOWER_CROP_1', 'PITCHER_CROP_0', 'PITCHER_CROP_1', 'PITCHER_PLANT_L', 'PITCHER_PLANT_U'].forEach(function (k) {
    ITEMS[k] = { key: k, name: WG.blockName(B[k]), block: B[k], max: 64, hardness: 0, drop: /^TORCH/.test(k) ? 'TORCHFLOWER_SEEDS' : /CROP/.test(k) ? 'PITCHER_POD' : null, dropMin: 1, dropMax: 1, dropChance: 1 };
  });
  ITEMS.PITCHER_PLANT = { key: 'PITCHER_PLANT', name: 'ピッチャープラント', block: B.PITCHER_PLANT_U, max: 64, tall: 'PITCHER_PLANT' };
  if (WG.TALL_INFO) { WG.TALL_INFO[B.PITCHER_PLANT_L] = { k: 'PITCHER_PLANT', up: true }; WG.TALL_INFO[B.PITCHER_PLANT_U] = { k: 'PITCHER_PLANT', up: false }; }
  ITEMS.ROLL_SCUTE = { key: 'ROLL_SCUTE', name: '鎧のかけら', block: -1, max: 64, shape: 'lump', color: '#c89a88' };
  ITEMS.WOLF_ARMOR = { key: 'WOLF_ARMOR', name: 'オオカミの鎧', block: -1, max: 1, shape: 'lump', color: '#a07868' };
  Craft.SHAPELESS.push([['ITEM_FRAME', 'GLOW_INK_SAC'], 'GLOW_ITEM_FRAME', 1], [['TORCHFLOWER'], 'ORANGE_DYE', 1], [['PITCHER_PLANT'], 'CYAN_DYE', 2]);
  Craft.SHAPED.push([['S  ', 'SSS', 'S S'], { S: 'ROLL_SCUTE' }, 'WOLF_ARMOR', 1]);
  if (WG.COMPOST) { WG.COMPOST.TORCHFLOWER_SEEDS = 0.3; WG.COMPOST.PITCHER_POD = 0.3; WG.COMPOST.TORCHFLOWER = 0.85; WG.COMPOST.PITCHER_PLANT = 0.85; }

  // ---------------- 生まれるとき ----------------
  var TROP = [[240, 138, 32], [64, 120, 230], [230, 210, 60], [220, 70, 120], [120, 200, 90], [150, 90, 200], [240, 240, 236]];
  var spawn = Mobs.prototype.spawn;
  Mobs.prototype.spawn = function (type, x, y, z) {
    // 魚は、海の暖かさで種類が決まる（暖かい海：熱帯魚・フグ、川と冷たい海：サケ、ほかはタラ）
    if (type === 'FISH') {
      var wd = this.world, bk = wd.biomeAt ? WG.BIOMES[wd.biomeAt(Math.floor(x), Math.floor(z))].key : 'ocean', r = Math.random();
      type = /warm|jungle|mangrove/.test(bk) ? (r < 0.75 ? 'TROPICAL' : 'PUFFERFISH') : /river|cold|frozen|snowy|taiga/.test(bk) ? (r < 0.7 ? 'SALMON' : 'COD') : (r < 0.7 ? 'COD' : r < 0.85 ? 'SALMON' : 'PUFFERFISH');
      if (this._schoolType && this._schoolAge === (this.game && this.game.tickCount)) type = this._schoolType;   // 群れは同じ種類
      this._schoolType = type; this._schoolAge = this.game && this.game.tickCount;
    }
    var m = spawn.apply(this, [type].concat(Array.prototype.slice.call(arguments, 1)));
    if (!m) return m;
    if (type === 'TROPICAL') m.tint = TROP[Math.floor(Math.random() * TROP.length)];
    if (type === 'TRADER_LLAMA' || type === 'MULE' || type === 'ZOMBIE_HORSE' || type === 'SKELETON_HORSE') { if (TYPES.LLAMA && type === 'TRADER_LLAMA') m.tint = [224, 204, 164]; }
    return m;
  };

  // ---------------- 動き ----------------
  function itemsNear(g, key, x, y, z, r) { return g.entities.filter(function (e) { return e.key === key && e.n > 0 && !e.delay && Math.abs(e.x - x) < r && Math.abs(e.y - y) < r && Math.abs(e.z - z) < r; }); }
  var special = Mobs.prototype.special;
  Mobs.prototype.special = function (m, T2, dist, dx, dy, dz) {
    var g = this.game, w = g.walker, p = w.pos;
    // ヤマネコ：近づくと逃げる（魚を持って、しゃがんで近づけば逃げない）
    if (m.type === 'OCELOT' && dist < 7) {
      var held = g.inv.held(), calm = held && (held.key === 'COD' || held.key === 'SALMON') && w.sneak;
      if (!calm) return { want: [m.x - dx * 3, m.z - dz * 3], speed: T2.speed * 1.8, chase: false };
    }
    // 運び精：渡されたものと同じものを拾い集め、持ち主のところへ運ぶ
    if (m.type === 'CARRIER_SPIRIT' && m.want) {
      var near = itemsNear(g, m.want, m.x, m.y, m.z, 16);
      if ((m.carry || 0) < 64 && near.length) {
        var e = near[0], ed = Math.hypot(e.x - m.x, e.y - m.y, e.z - m.z);
        m.vy += (e.y + 0.6 - m.y) * 0.02;
        if (ed < 1.2) { m.carry = (m.carry || 0) + e.n; e.n = 0; if (WG.Sound) WG.Sound.play('pop', m.x, m.y, m.z); }
        return { want: [e.x, e.z], speed: T2.speed * 1.4, chase: false };
      }
      m.vy += (p[1] + 1.8 - m.y) * 0.02;
      if (m.carry > 0 && dist < 2.5) { g.spawnItem(m.want, m.carry, m.x, m.y, m.z, 0.1, 10); m.carry = 0; if (WG.Sound) WG.Sound.play('pop', m.x, m.y, m.z); }
      return { want: dist > 2 ? [p[0], p[2]] : null, speed: T2.speed * 1.2, chase: false };
    }
    if (m.type === 'ARMOR_ROLLER' && m.rolled > 0) return { want: null, speed: 0, chase: false };
    if (m.type === 'BIG_NOSE' && m.sniff > 0) return { want: null, speed: 0, chase: false };
    return special.apply(this, arguments);
  };
  var hurt = Mobs.prototype.hurt;
  Mobs.prototype.hurt = function (m, amount, from) {
    if (m.type === 'ARMOR_ROLLER') { m.rolled = 200; amount = Math.max(0, amount - 3); }   // 丸くなって守る
    if (m.type === 'WOLF' && m.armored) { m.armorHp = (m.armorHp == null ? 64 : m.armorHp) - amount; amount *= 0.2; if (m.armorHp <= 0) { m.armored = false; if (this.game.spawnItem) this.game.spawnItem('ROLL_SCUTE', 1, m.x, m.y + 0.5, m.z, 0.1, 10); } }
    return hurt.call(this, m, amount, from);
  };
  var mtick = Mobs.prototype.tick;
  Mobs.prototype.tick = function () {
    var r = mtick.apply(this, arguments), g = this.game, w = g.walker, p = w.pos, wd = this.world, self = this;
    this.list.forEach(function (m) {
      if (m.dead) return;
      var d = Math.hypot(m.x - p[0], m.y - p[1], m.z - p[2]);
      // イルカ：水面近くで、ときどき跳ねる
      if (m.type === 'DOLPHIN' && WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y + 1), Math.floor(m.z))) === false && WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y), Math.floor(m.z))) && Math.random() < 0.02) {
        m.vy = 0.55; var a = m.yaw; m.vx += Math.sin(a) * 0.2; m.vz += Math.cos(a) * 0.2;
        if (WG.Sound) WG.Sound.play('splash', m.x, m.y, m.z);
      }
      // フグ：近づくとふくらみ、さわると毒
      if (m.type === 'PUFFERFISH') {
        if (d < 2.8 && !g.spectator) m.puffed = 60; else if (m.puffed > 0) m.puffed--;
        if (m.puffed > 0 && d < 1.3 && g.mode === 'survival' && (m.age || 0) % 20 === 0) { g.hurtPlayer(1, m.x, m.z); if (g.addEffect) g.addEffect('POISON', 120, 0); }
      }
      // ヨロイマル：走って近づく人がいると丸くなる
      if (m.type === 'ARMOR_ROLLER') { if (d < 5 && w.sprint) m.rolled = 120; else if (m.rolled > 0) m.rolled--; if ((m.age || 0) % 6000 === 3000 && Math.random() < 0.5) g.spawnItem('ROLL_SCUTE', 1, m.x, m.y + 0.3, m.z, 0.1, 10); }
      // 大鼻獣：ときどき鼻を鳴らして地面を掘り、古代の種を見つける
      if (m.type === 'BIG_NOSE' && !m.baby) {
        if (m.sniff > 0) {
          m.sniff--;
          if (m.sniff % 10 === 0) g.puff(m.x + Math.sin(m.yaw) * 1.4, m.y + 0.2, m.z + Math.cos(m.yaw) * 1.4, [120, 90, 60], 4, 0.3);
          if (m.sniff === 0) {
            var under = wd.block(Math.floor(m.x + Math.sin(m.yaw) * 1.4), Math.floor(m.y - 0.5), Math.floor(m.z + Math.cos(m.yaw) * 1.4));
            if ([B.GRASS, B.DIRT, B.MOSS_BLOCK, B.PODZOL, B.COARSE_DIRT, B.ROOTED_DIRT, B.MUD].indexOf(under) >= 0) g.spawnItem(Math.random() < 0.5 ? 'TORCHFLOWER_SEEDS' : 'PITCHER_POD', 1, m.x + Math.sin(m.yaw) * 1.4, m.y + 0.5, m.z + Math.cos(m.yaw) * 1.4, 0.1, 10);
          }
        } else if (m.ground && Math.random() < 1 / 1500) { m.sniff = 120; if (WG.Sound) WG.Sound.play('mob', m.x, m.y + 1, m.z, 'COW'); }
      }
    });
    // 馬とロバが仲良しなら、ラバの子が生まれる
    this.list.forEach(function (a) {
      if (a.type !== 'HORSE' || !(a.love > 0) || a.dead) return;
      self.list.forEach(function (b) {
        if (b.type !== 'DONKEY' || !(b.love > 0) || b.dead || Math.hypot(a.x - b.x, a.z - b.z) > 1.8) return;
        var c = self.spawn('MULE', (a.x + b.x) / 2, Math.max(a.y, b.y), (a.z + b.z) / 2);
        if (c) { c.baby = 24000; g.puff(c.x, c.y + 0.5, c.z, [230, 80, 100], 8, 0.5); }
        a.love = b.love = 0; a.breedCd = b.breedCd = 6000;
      });
    });
    return r;
  };

  // ---------------- 右クリック：運び精に渡す・ブラシ・オオカミの鎧・古代の種を植える ----------------
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var mt = this.mobs.target && this.mobs.target.mob, held = this.inv.held(), surv = this.mode === 'survival', self = this, done = function () { self.mouseR = self.clickR = false; };
    if (mt && !mt.dead) {
      if (mt.type === 'CARRIER_SPIRIT') {
        if (held && !mt.want) { mt.want = held.key; if (surv) this.inv.take(this.inv.sel, 1); this.puff(mt.x, mt.y + 0.4, mt.z, [150, 220, 255], 8, 0.3); done(); return; }
        if (!held && mt.want) { this.inv.add(mt.want, 1 + (mt.carry || 0)); mt.want = null; mt.carry = 0; done(); return; }
      }
      if (mt.type === 'ARMOR_ROLLER' && held && held.key === 'BRUSH') {
        if (!(mt.brushCd > (this.tickCount || 0))) { this.spawnItem('ROLL_SCUTE', 1, mt.x, mt.y + 0.5, mt.z, 0.1, 10); mt.brushCd = (this.tickCount || 0) + 600; if (surv && this.wearItem) this.wearItem(this.inv.sel, 16); }
        done(); return;
      }
      if (mt.type === 'WOLF' && held && held.key === 'WOLF_ARMOR' && mt.tame && !mt.armored) { mt.armored = true; mt.armorHp = 64; if (surv) this.inv.take(this.inv.sel, 1); done(); return; }
      if (mt.type === 'WOLF' && mt.armored && held && held.key === 'SHEARS') { mt.armored = false; this.inv.add('WOLF_ARMOR', 1); done(); return; }
    }
    var t = this.walker.target, wd = this.world;
    if (t && held && (held.key === 'TORCHFLOWER_SEEDS' || held.key === 'PITCHER_POD') && (t.id === B.FARMLAND || t.id === B.FARMLAND_MOIST) && wd.block(t.x, t.y + 1, t.z) === B.AIR) {
      wd.setBlock(t.x, t.y + 1, t.z, held.key === 'TORCHFLOWER_SEEDS' ? B.TORCHFLOWER_CROP_0 : B.PITCHER_CROP_0);
      if (surv) this.inv.take(this.inv.sel, 1);
      this.walker.remesh(t.x, t.z); done(); return;
    }
    if (t && held && held.key === 'BONE_MEAL' && GROW[t.id]) { growAncient(this, t.x, t.y, t.z); if (surv) this.inv.take(this.inv.sel, 1); done(); return; }
    return use.apply(this, arguments);
  };
  var GROW = {};
  GROW[B.TORCHFLOWER_CROP_0] = 1; GROW[B.TORCHFLOWER_CROP_1] = 1; GROW[B.PITCHER_CROP_0] = 1; GROW[B.PITCHER_CROP_1] = 1;
  function growAncient(g, x, y, z) {
    var wd = g.world, id = wd.block(x, y, z);
    if (id === B.TORCHFLOWER_CROP_0) wd.setBlock(x, y, z, B.TORCHFLOWER_CROP_1);
    else if (id === B.TORCHFLOWER_CROP_1) wd.setBlock(x, y, z, B.TORCHFLOWER);
    else if (id === B.PITCHER_CROP_0) wd.setBlock(x, y, z, B.PITCHER_CROP_1);
    else if (id === B.PITCHER_CROP_1 && wd.block(x, y + 1, z) === B.AIR) { wd.setBlock(x, y, z, B.PITCHER_PLANT_L); wd.setBlock(x, y + 1, z, B.PITCHER_PLANT_U); }
    else return false;
    g.walker.remesh(x, z);
    return true;
  }
  WG.growAncient = growAncient;
  WG.RANDOM_TICK = WG.RANDOM_TICK || {};
  Object.keys(GROW).forEach(function (id) { WG.RANDOM_TICK[id] = function (g, x, y, z) { if (Math.random() < 0.15) growAncient(g, x, y, z); }; });

  // ---------------- 発光イカは暗くても光る ----------------
  var draw = Mobs.prototype.draw;
  Mobs.prototype.draw = function () {
    var all = this.list, glow = all.filter(function (m) { return TYPES[m.type] && TYPES[m.type].glow; });
    if (!glow.length) return draw.apply(this, arguments);
    var w = this.game && this.game.walker, args = arguments, arrows = this.arrows, ll = w && w.lightLevels;
    this.list = all.filter(function (m) { return glow.indexOf(m) < 0; });
    try { draw.apply(this, args); this.list = glow; this.arrows = []; if (w) w.lightLevels = function () { return [15, 15]; }; draw.apply(this, args); }
    finally { this.list = all; this.arrows = arrows; if (w) w.lightLevels = ll; }
  };

  // ---------------- 生まれる場所 ----------------
  function findWater(wd, x0, z0, h, deep) {
    for (var t = 0; t < 20; t++) {
      var x = x0 + Math.floor(Math.random() * 16), z = z0 + Math.floor(Math.random() * 16);
      for (var y = h + 2; y > h - (deep ? 40 : 8); y--) if (WG.isWater(wd.block(x, y, z)) && WG.isWater(wd.block(x, y - 1, z)) && (!deep || y < 40)) return [x + 0.5, y - 1, z + 0.5];
    }
    return null;
  }
  function findLand(wd, x0, z0, h) {
    for (var t = 0; t < 20; t++) {
      var x = x0 + Math.floor(Math.random() * 16), z = z0 + Math.floor(Math.random() * 16);
      for (var y = h + 6; y > h - 6; y--) if (WG.COLLIDE[wd.block(x, y - 1, z)] >= 1 && !WG.COLLIDE[wd.block(x, y, z)] && !WG.FLUID[wd.block(x, y, z)] && !WG.COLLIDE[wd.block(x, y + 1, z)]) return [x + 0.5, y, z + 0.5];
    }
    return null;
  }
  var populate = Mobs.prototype.populate;
  Mobs.prototype.populate = function (cx, cz) {
    var wd = this.world, first = wd.dimKey === 'overworld' && wd.populated && !wd.populated.has(cx + ',' + cz);
    var r = populate.apply(this, arguments);
    if (!first || !wd.biomeAt) return r;
    var c = wd.chunk(cx, cz);
    if (!c || !c.hmap) return r;
    var x0 = cx << 4, z0 = cz << 4, h = c.hmap[136], k0 = WG.BIOMES[wd.biomeAt(x0 + 8, z0 + 8)].key, bk = (WG.BIOME_PARENT && WG.BIOME_PARENT[k0]) || k0, self = this, k;
    function group(type, n, at) { for (k = 0; k < n && at; k++) self.spawn(type, at[0] + (Math.random() - 0.5) * 2, at[1], at[2] + (Math.random() - 0.5) * 2); }
    if (/ocean/.test(bk) && !/frozen|cold/.test(bk) && Math.random() < 0.06) group('DOLPHIN', 2 + Math.floor(Math.random() * 3), findWater(wd, x0, z0, h));
    if (/ocean|river/.test(bk) && Math.random() < 0.05) group('GLOW_SQUID', 1 + Math.floor(Math.random() * 2), findWater(wd, x0, z0, h, true));
    if (bk === 'jungle' && Math.random() < 0.05) group('OCELOT', 1 + Math.floor(Math.random() * 2), findLand(wd, x0, z0, h));
    if ((bk === 'plains' || bk === 'savanna') && Math.random() < 0.01) group('TRADER_LLAMA', 2, findLand(wd, x0, z0, h));
    if ((bk === 'forest' || bk === 'taiga') && Math.random() < 0.008) group('CARRIER_SPIRIT', 1, findLand(wd, x0, z0, h));
    if ((bk === 'jungle' || bk === 'savanna' || k0 === 'meadow') && Math.random() < 0.012) group('BIG_NOSE', 1, findLand(wd, x0, z0, h));
    if ((bk === 'savanna' || bk === 'badlands') && Math.random() < 0.04) group('ARMOR_ROLLER', 1 + Math.floor(Math.random() * 2), findLand(wd, x0, z0, h));
    if (bk === 'plains' && Math.random() < 0.006) group('SKELETON_HORSE', 1, findLand(wd, x0, z0, h));
    return r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
