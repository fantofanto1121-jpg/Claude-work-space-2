// 生き物：豚・牛・羊・鶏・ウサギ・オオカミ・イカ・コウモリ・村人と、ゾンビ・スケルトン・ハゼゴケ・クモ・洞窟グモ・スライム・魔女・マグマスライム（敵）。
// ハゼゴケ（爆ぜ苔）は、近づいてきて膨らみ、爆発する苔むした生き物。見た目と名前はこのプログラムのもの。
// 大きさ・体力・攻撃・ドロップは Minecraft の値に合わせている。見た目は箱を組み合わせた簡単な形。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, FLUID = WG.FLUID;

  // ---- 見た目（1/16 ブロック単位。足元の中心が原点、+z が前）----
  // [x0, y0, z0, 幅, 高さ, 奥行き, 色, 動き]  動き：'L1' 'L2' は脚（前後に振る）、'A' は前に伸ばした腕
  function box(x, y, z, w, h, d, c, sw) { return { o: [x, y, z], s: [w, h, d], c: hex(c), sw: sw || null }; }
  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  var EYE = '#1f1d1c';
  function spiderModel(c, d, e1, e2) {
    var out = [box(-5, 4, -12, 10, 8, 11, c), box(-3, 5, -1, 6, 6, 6, d), box(-4, 4, 5, 8, 8, 7, c),
      box(-3, 9, 11.9, 2, 1, 0.3, e1), box(1, 9, 11.9, 2, 1, 0.3, e1), box(-2, 7, 11.9, 1, 1, 0.3, e2), box(1, 7, 11.9, 1, 1, 0.3, e2)];
    [-1, 1].forEach(function (s) { [-0.5, 1.2, 2.9, 4.6].forEach(function (z, i) { out.push(box(s > 0 ? 3 : -15, 7, z, 12, 1, 1, c, (i + (s > 0 ? 1 : 0)) % 2 ? 'L1' : 'L2')); }); });
    return out;
  }
  // スライム：大きさ 1 のときの形（描くときに大きさを掛ける）。外側の体と、顔
  function slimeModel(body, top, face, stripe) {
    var out = [box(-4, 0, -4, 8, 8, 8, body), box(-3, 7.6, -3, 6, 0.6, 6, top),
      box(-3, 4.5, 4, 1.5, 1.5, 0.3, face), box(1.5, 4.5, 4, 1.5, 1.5, 0.3, face), box(-0.5, 2, 4, 1.5, 1, 0.3, face)];
    if (stripe) out.push(box(-4.05, 2, -4.05, 8.1, 1, 8.1, stripe), box(-4.05, 5.5, -4.05, 8.1, 0.8, 8.1, stripe));
    return out;
  }
  var MODELS = {
    PIG: [
      box(-5, 0, 3, 4, 6, 4, '#d99a95', 'L1'), box(1, 0, 3, 4, 6, 4, '#d99a95', 'L2'),
      box(-5, 0, -7, 4, 6, 4, '#d99a95', 'L2'), box(1, 0, -7, 4, 6, 4, '#d99a95', 'L1'),
      box(-5, 6, -8, 10, 8, 16, '#e5a7a1'), box(-4, 8, 7, 8, 8, 8, '#e8aca6'),
      box(-2, 9, 15, 4, 3, 1, '#c9827d'), box(-3, 13, 15, 1, 1, 0.3, EYE), box(2, 13, 15, 1, 1, 0.3, EYE)
    ],
    COW: [
      box(-6, 0, 4, 4, 12, 4, '#d9d1c3', 'L1'), box(2, 0, 4, 4, 12, 4, '#d9d1c3', 'L2'),
      box(-6, 0, -8, 4, 12, 4, '#d9d1c3', 'L2'), box(2, 0, -8, 4, 12, 4, '#d9d1c3', 'L1'),
      box(-6, 11, -9, 12, 10, 18, '#4a382c'), box(-6.1, 13, -3, 12.2, 6, 5, '#e3ddd2'),
      box(-4, 15, 8, 8, 8, 6, '#4a382c'), box(-3, 15, 14, 6, 4, 0.3, '#e3ddd2'),
      box(-5, 22, 10, 1, 3, 1, '#d8cfb8'), box(4, 22, 10, 1, 3, 1, '#d8cfb8'),
      box(-3, 20, 14, 1, 1, 0.3, EYE), box(2, 20, 14, 1, 1, 0.3, EYE)
    ],
    SHEEP: [
      box(-6, 0, 4, 4, 12, 4, '#c8bca9', 'L1'), box(2, 0, 4, 4, 12, 4, '#c8bca9', 'L2'),
      box(-6, 0, -8, 4, 12, 4, '#c8bca9', 'L2'), box(2, 0, -8, 4, 12, 4, '#c8bca9', 'L1'),
      box(-6, 11, -8, 12, 10, 16, '#eceae4'), box(-3, 16, 6, 6, 6, 8, '#b19f8b'), box(-3.5, 21, 6.5, 7, 2, 6, '#eceae4'),
      box(-2, 19, 14, 1, 1, 0.3, EYE), box(1, 19, 14, 1, 1, 0.3, EYE)
    ],
    CHICKEN: [
      box(-2, 0, -0.5, 1, 5, 1, '#d99a34', 'L1'), box(1, 0, -0.5, 1, 5, 1, '#d99a34', 'L2'),
      box(-3, 4, -4, 6, 6, 8, '#f1f0eb'), box(-4, 5, -3, 1, 4, 6, '#e4e2dc'), box(3, 5, -3, 1, 4, 6, '#e4e2dc'),
      box(-2, 8, 2, 4, 6, 3, '#f1f0eb'), box(-2, 11, 5, 4, 2, 2, '#e2a83a'), box(-1, 9, 5, 2, 2, 1, '#bf3a2c'),
      box(-2, 12.5, 4.9, 1, 1, 0.3, EYE), box(1, 12.5, 4.9, 1, 1, 0.3, EYE)
    ],
    ZOMBIE: [
      box(-4, 0, -2, 4, 12, 4, '#3b4470', 'L1'), box(0, 0, -2, 4, 12, 4, '#3b4470', 'L2'),
      box(-4, 12, -2, 8, 12, 4, '#3a6e78'), box(-8, 12, -2, 4, 12, 4, '#6d8d58', 'A'), box(4, 12, -2, 4, 12, 4, '#6d8d58', 'A'),
      box(-4, 24, -4, 8, 8, 8, '#6d8d58'), box(-3, 27, 4, 2, 1, 0.3, EYE), box(1, 27, 4, 2, 1, 0.3, EYE), box(-2, 25, 4, 4, 1, 0.3, '#4d6a3f')
    ],
    SKELETON: [
      box(-3, 0, -1, 2, 12, 2, '#d4d4cc', 'L1'), box(1, 0, -1, 2, 12, 2, '#d4d4cc', 'L2'),
      box(-4, 12, -1, 8, 12, 2, '#cfcfc7'), box(-3.5, 14, -1.1, 7, 1, 2.2, '#a8a8a0'), box(-3.5, 17, -1.1, 7, 1, 2.2, '#a8a8a0'),
      box(-6, 12, -1, 2, 12, 2, '#d4d4cc', 'A'), box(4, 12, -1, 2, 12, 2, '#d4d4cc', 'A'), box(5.5, 14, 6, 1, 8, 1, '#7a5a35'),
      box(-4, 24, -4, 8, 8, 8, '#dddcd5'), box(-3, 27, 4, 2, 2, 0.3, '#2c2c2c'), box(1, 27, 4, 2, 2, 0.3, '#2c2c2c')
    ],
    // クモ：低く横に広い体と 8 本の脚、赤い目
    SPIDER: spiderModel('#2f2823', '#3b322b', '#d23224', '#b02a20'),
    // 洞窟グモ：青みがかった小さなクモ（描くときに 0.7 倍）
    CAVE_SPIDER: spiderModel('#1e3038', '#2a4450', '#d23224', '#b02a20'),
    // ハゼゴケ：苔むした丸い体に、短い脚と琥珀色の目
    BOMBER: [
      box(-6, 0, 2, 3, 4, 3, '#3d4836', 'L1'), box(3, 0, 2, 3, 4, 3, '#3d4836', 'L2'),
      box(-6, 0, -5, 3, 4, 3, '#3d4836', 'L2'), box(3, 0, -5, 3, 4, 3, '#3d4836', 'L1'),
      box(-6, 3, -6, 12, 11, 12, '#5d7a48'), box(-5, 14, -5, 10, 2, 10, '#6c8a52'),
      box(-6.2, 6, -3, 0.3, 3, 3, '#3e5631'), box(5.9, 9, 0, 0.3, 3, 3, '#3e5631'), box(-2, 15.9, -3, 3, 0.3, 3, '#a3a35a'),
      box(1, 5, -6.2, 3, 2, 0.3, '#a3a35a'), box(-4, 9, 6, 2, 2, 0.3, '#e0b04a'), box(2, 9, 6, 2, 2, 0.3, '#e0b04a')
    ],
    // ウサギ：茶色の小さな体、長い耳、白い尾
    RABBIT: [
      box(-2.5, 0, -4, 2, 2, 4, '#8a6a4a', 'L1'), box(0.5, 0, -4, 2, 2, 4, '#8a6a4a', 'L2'),
      box(-2, 0, 1, 1.5, 2, 1.5, '#9a7a56', 'L2'), box(0.5, 0, 1, 1.5, 2, 1.5, '#9a7a56', 'L1'),
      box(-3, 2, -4, 6, 4, 7, '#a8865e'), box(-1.5, 3.5, -5, 3, 3, 1, '#efe8dc'),
      box(-2.5, 4, 3, 5, 4, 4, '#a8865e'), box(-2, 8, 4, 1.5, 4, 1, '#9a7a56'), box(0.5, 8, 4, 1.5, 4, 1, '#9a7a56'),
      box(-1.5, 8.5, 4.9, 0.8, 3, 0.3, '#d8a8a0'), box(0.9, 8.5, 4.9, 0.8, 3, 0.3, '#d8a8a0'),
      box(-0.5, 4.8, 7, 1, 1, 0.3, '#d8a8a0'), box(-2, 6, 7, 1, 1, 0.3, EYE), box(1, 6, 7, 1, 1, 0.3, EYE)
    ],
    // オオカミ：灰色の体と首の毛、とがった耳。飼いならすと赤い首輪（tame）
    WOLF: [
      box(-3, 0, -6, 2, 8, 2, '#c4c0b6', 'L1'), box(1, 0, -6, 2, 8, 2, '#c4c0b6', 'L2'),
      box(-3, 0, 3, 2, 8, 2, '#c4c0b6', 'L2'), box(1, 0, 3, 2, 8, 2, '#c4c0b6', 'L1'),
      box(-3, 7, -7, 6, 6, 9, '#d6d2c8'), box(-4, 6.5, 1, 8, 8, 5, '#c8c3b8'),
      box(-1, 9, -11, 2, 2, 4, '#c4c0b6'), box(-1, 8, -12, 2, 2, 1.5, '#ecebe6'),
      box(-3, 9, 5, 6, 6, 4, '#d6d2c8'), box(-1.5, 9, 9, 3, 3, 3, '#c4c0b6'), box(-0.5, 11, 12, 1, 1, 0.3, '#2a2624'),
      box(-3, 15, 6, 2, 2, 1, '#bab5aa'), box(1, 15, 6, 2, 2, 1, '#bab5aa'),
      box(-2.5, 13, 9, 1, 1, 0.3, EYE, 'EYE'), box(1.5, 13, 9, 1, 1, 0.3, EYE, 'EYE'),
      Object.assign(box(-4.1, 8.5, 1.5, 8.2, 1.2, 4.6, '#b8302a'), { tame: true })
    ],
    // イカ：紺色の胴と、下に垂れる 8 本の足
    SQUID: (function () {
      var out = [box(-4, 5, -4, 8, 11, 8, '#2e3e62'), box(-3.5, 15.5, -3.5, 7, 1, 7, '#3a4c74'),
        box(-4.2, 7, -1, 0.3, 2, 2, '#e6e2d6'), box(3.9, 7, -1, 0.3, 2, 2, '#e6e2d6'), box(-4.3, 7.5, -0.5, 0.3, 1, 1, EYE), box(4, 7.5, -0.5, 0.3, 1, 1, EYE)];
      [[-3, -3], [-1, -3.5], [1, -3.5], [3, -3], [-3, 2], [-1, 2.5], [1, 2.5], [3, 2]].forEach(function (p, i) {
        out.push(box(p[0] - 0.75, -4, p[1] - 0.75, 1.5, 9, 1.5, i % 2 ? '#26345a' : '#2e3e62', i % 2 ? 'T1' : 'T2'));
      });
      return out;
    })(),
    // コウモリ：小さな茶色の体と、羽ばたく翼
    BAT: [
      box(-1.5, 3, -1.5, 3, 5, 3, '#4e4034'), box(-1.5, 8, -1.5, 3, 3, 3, '#5c4c3e'),
      box(-1.5, 11, -0.5, 1, 2, 1, '#4e4034'), box(0.5, 11, -0.5, 1, 2, 1, '#4e4034'),
      box(-1, 9.5, 1.5, 0.8, 0.8, 0.3, '#d8c070'), box(0.2, 9.5, 1.5, 0.8, 0.8, 0.3, '#d8c070'),
      box(-9, 5, -0.5, 7.5, 4, 1, '#3a2e24', 'W1'), box(1.5, 5, -0.5, 7.5, 4, 1, '#3a2e24', 'W2')
    ],
    SLIME: slimeModel('#6cbc50', '#8ad06a', '#1e3a18'),
    MAGMA_SLIME: slimeModel('#4a1a10', '#5e2414', '#ffb040', '#e8661c'),
    // 村人：大きな頭と高い鼻、組んだ腕。服（prof）の色は職業で変わる
    VILLAGER: [
      box(-4, 0, -2, 4, 12, 4, '#4a3a2c', 'L1'), box(0, 0, -2, 4, 12, 4, '#4a3a2c', 'L2'),
      Object.assign(box(-4.3, 4, -3.3, 8.6, 20, 6.6, '#7a5a3a'), { prof: 1 }),
      Object.assign(box(-6, 16, 2.6, 12, 4, 3, '#6a4a30'), { prof: 2 }),
      box(-4, 24, -4, 8, 10, 8, '#c8a07a'), box(-1, 26, 4, 2, 4, 2, '#b88c66'),
      box(-3, 30, 4, 6, 1, 0.3, '#5a3a24'), box(-3, 29, 4, 2, 1, 0.3, '#ececec'), box(1, 29, 4, 2, 1, 0.3, '#ececec'),
      box(-2, 29, 4.05, 1, 1, 0.3, '#2c6a3a'), box(2, 29, 4.05, 1, 1, 0.3, '#2c6a3a')
    ],
    // 魔女：紫の服、とんがり帽子、緑がかった顔と高い鼻
    WITCH: [
      box(-4, 0, -2, 4, 12, 4, '#3e2a50', 'L1'), box(0, 0, -2, 4, 12, 4, '#3e2a50', 'L2'),
      box(-4.3, 6, -2.3, 8.6, 18, 4.6, '#5a3a74'), box(-4.4, 14, -2.4, 8.8, 1.5, 4.8, '#3a8a3a'),
      box(-8, 12, -2, 4, 12, 4, '#5a3a74', 'A'), box(4, 12, -2, 4, 12, 4, '#5a3a74', 'A'),
      box(-4, 24, -4, 8, 9, 8, '#b4a88c'), box(-1, 26, 4, 2, 4, 2, '#a89a7c'), box(-0.5, 25, 5.5, 1, 1, 0.6, '#6a8a40'),
      box(-3, 29, 4, 2, 1, 0.3, '#3a7a2a'), box(1, 29, 4, 2, 1, 0.3, '#3a7a2a'),
      box(-5, 32, -5, 10, 2, 10, '#2a2a22'), box(-3.5, 34, -3.5, 7, 4, 7, '#2a2a22'), box(-2, 38, -2, 4, 3, 4, '#2a2a22'), box(-1, 41, -1, 2, 2, 2, '#2a2a22'),
      box(-3.6, 34, -3.6, 7.2, 1, 7.2, '#5a8a3a')
    ]
  };

  // ---- 種類ごとの値（Minecraft の値）----
  // w, h: 大きさ（ブロック）、hp: 体力、speed: 歩く速さ（ブロック/刻み）、range: 敵が気づく距離
  var TYPES = {
    // food は持っていると寄ってくる食べ物、rare は 2.5% で落とすもの
    PIG: { name: '豚', w: 0.9, h: 0.9, hp: 10, speed: 0.05, food: ['CARROT', 'POTATO'], drops: [['RAW_PORKCHOP', 1, 3]] },
    COW: { name: '牛', w: 0.9, h: 1.4, hp: 10, speed: 0.05, food: ['WHEAT'], drops: [['LEATHER', 0, 2], ['RAW_BEEF', 1, 3]] },
    SHEEP: { name: '羊', w: 0.9, h: 1.3, hp: 8, speed: 0.05, food: ['WHEAT'], drops: [['WHITE_WOOL', 1, 1], ['RAW_MUTTON', 1, 2]] },
    CHICKEN: { name: '鶏', w: 0.4, h: 0.7, hp: 4, speed: 0.05, food: ['WHEAT_SEEDS'], drops: [['FEATHER', 0, 2], ['RAW_CHICKEN', 1, 1]] },
    ZOMBIE: { name: 'ゾンビ', w: 0.6, h: 1.95, hp: 20, speed: 0.09, hostile: true, range: 35, burns: true, drops: [['ROTTEN_FLESH', 0, 2]], rare: ['IRON_INGOT', 'CARROT', 'POTATO'] },
    SKELETON: { name: 'スケルトン', w: 0.6, h: 1.99, hp: 20, speed: 0.1, hostile: true, range: 16, burns: true, drops: [['BONE', 0, 2], ['ARROW', 0, 2]] },
    BOMBER: { name: 'ハゼゴケ', w: 0.8, h: 1.0, hp: 20, speed: 0.09, hostile: true, range: 16, drops: [['GUNPOWDER', 0, 2]] },
    SPIDER: { name: 'クモ', w: 1.4, h: 0.9, hp: 16, speed: 0.11, hostile: true, range: 16, climbs: true, drops: [['STRING', 0, 2], ['SPIDER_EYE', 0, 1]] },
    // ---- 追加の生き物 ----
    // ウサギ：跳ねて進む。rareP は rare を落とす確率
    RABBIT: { name: 'ウサギ', w: 0.4, h: 0.5, hp: 3, speed: 0.07, food: ['CARROT', 'GOLDEN_CARROT', 'DANDELION'], hops: true,
      drops: [['RABBIT_HIDE', 0, 1], ['RAW_RABBIT', 0, 1]], rare: ['RABBIT_FOOT'], rareP: 0.1 },
    // オオカミ：叩くと怒って噛みつく。骨で飼いならすと、ついてきて敵と戦う
    WOLF: { name: 'オオカミ', w: 0.6, h: 0.85, hp: 8, speed: 0.08, food: [], drops: [],
      breed: ['RAW_BEEF', 'COOKED_BEEF', 'RAW_PORKCHOP', 'COOKED_PORKCHOP', 'RAW_CHICKEN', 'COOKED_CHICKEN', 'RAW_MUTTON', 'COOKED_MUTTON', 'RAW_RABBIT', 'COOKED_RABBIT', 'ROTTEN_FLESH'] },
    // イカ：水の中を泳ぐ。陸に上がると弱る
    SQUID: { name: 'イカ', w: 0.8, h: 0.8, hp: 10, speed: 0.04, food: [], swims: true, despawn: true, drops: [['INK_SAC', 1, 3]] },
    // コウモリ：暗い洞窟を飛び回る
    BAT: { name: 'コウモリ', w: 0.5, h: 0.9, hp: 6, speed: 0.06, food: [], flies: true, despawn: true, noFall: true, drops: [] },
    // 洞窟グモ：小さく、噛まれると毒になる
    CAVE_SPIDER: { name: '洞窟グモ', w: 0.7, h: 0.5, hp: 12, speed: 0.12, hostile: true, range: 16, climbs: true, scale: 0.7, drops: [['STRING', 0, 2], ['SPIDER_EYE', 0, 1]] },
    // スライム：跳ねて近づく。大きさ 4・2・1 があり、倒すと半分の大きさに分かれる（体力は大きさの 2 乗）
    SLIME: { name: 'スライム', w: 0.52, h: 0.52, hp: 1, speed: 0.1, hostile: true, range: 16, sizes: true, noFall: true, jump: 0.42,
      dmg: [0, 0, 2, 0, 4], drops: [['SLIME_BALL', 0, 2]], dropSize: 'small' },
    // マグマスライム：ネザーのスライム。高く跳ね、溶岩と火に強い
    MAGMA_SLIME: { name: 'マグマスライム', w: 0.52, h: 0.52, hp: 1, speed: 0.12, hostile: true, range: 16, sizes: true, noFall: true, jump: 0.62, fireproof: true,
      dmg: [0, 3, 4, 0, 6], drops: [['MAGMA_CREAM', 0, 1]], dropSize: 'big' },
    // 村人：村の家に住む。右クリックで取引（js/village.js）。ゾンビが近いと逃げる
    VILLAGER: { name: '村人', w: 0.6, h: 1.95, hp: 20, speed: 0.05, food: [], drops: [] },
    // 魔女：離れた所から毒・鈍化・負傷の投げポーションを投げる
    WITCH: { name: '魔女', w: 0.6, h: 1.95, hp: 26, speed: 0.08, hostile: true, range: 16,
      drops: [['GLASS_BOTTLE', 0, 2], ['GLOWSTONE_DUST', 0, 2], ['GUNPOWDER', 0, 2], ['REDSTONE', 0, 2], ['SPIDER_EYE', 0, 2], ['SUGAR', 0, 2], ['STICK', 0, 2]] }
  };
  // 繁殖のえさ（ないものは近寄ってくるえさと同じ）。オオカミはなついたものだけ
  ['PIG', 'COW', 'SHEEP', 'CHICKEN', 'RABBIT'].forEach(function (k) { TYPES[k].breed = TYPES[k].food; TYPES[k].breeds = true; });
  TYPES.WOLF.breeds = true;
  var PASSIVE = ['PIG', 'COW', 'SHEEP', 'CHICKEN', 'RABBIT', 'WOLF'], PASSIVE_W = [10, 8, 12, 10, 6, 4];
  var HOSTILE = ['ZOMBIE', 'SKELETON', 'BOMBER', 'SPIDER', 'WITCH'], HOSTILE_W = [40, 40, 20, 30, 5];
  // 地下深く（y 40 未満）では、スライムと洞窟グモも出る
  var DEEP = HOSTILE.concat(['SLIME', 'CAVE_SPIDER']), DEEP_W = HOSTILE_W.concat([12, 8]);
  var SIZES = [1, 2, 4];
  function pick(list, weights) {
    var t = 0, r, i;
    for (i = 0; i < weights.length; i++) t += weights[i];
    r = Math.random() * t;
    for (i = 0; i < list.length; i++) { if (r < weights[i]) return list[i]; r -= weights[i]; }
    return list[0];
  }

  function Mobs(game) {
    this.game = game;
    this.world = game.world;
    this.list = this.world.mobs || (this.world.mobs = []);
    this.arrows = [];
    if (!this.world.populated) this.world.populated = new Set();
    if (!this.world.spawners) this.world.spawners = new Map();
    this.target = null;
  }

  Mobs.prototype.spawn = function (type, x, y, z, size) {
    var T = TYPES[type];
    var m = { type: type, x: x, y: y, z: z, px: x, py: y, pz: z, vx: 0, vy: 0, vz: 0, yaw: Math.random() * Math.PI * 2, pyaw: 0,
      hp: T.hp, maxHp: T.hp, hurt: 0, invul: 0, dead: 0, ground: false, walk: 0, pwalk: 0, ai: { timer: 0, tx: null, tz: null, panic: 0, cd: 0, fuse: 0, pfuse: 0 }, fire: 0, age: 0 };
    m.pyaw = m.yaw;
    // スライムの大きさ（1・2・4）。体力は大きさの 2 乗
    if (T.sizes) { m.size = size || SIZES[Math.floor(Math.random() * 3)]; m.hp = m.maxHp = m.size * m.size; }
    if (type === 'VILLAGER' && WG.setupVillager) WG.setupVillager(m);
    this.list.push(m);
    return m;
  };

  // 大きさ（スライムは大きさを掛ける）
  function mw(m) { return TYPES[m.type].w * (m.size || 1) * (m.baby ? 0.5 : 1); }
  function mh(m) { return TYPES[m.type].h * (m.size || 1) * (m.baby ? 0.5 : 1); }
  function box3(m) { var w2 = mw(m) / 2; return [m.x - w2, m.y, m.z - w2, m.x + w2, m.y + mh(m), m.z + w2]; }

  // ---- 1 刻み ----
  Mobs.prototype.tick = function () {
    var g = this.game, w = g.walker, wd = this.world, p = w.pos, i, m;
    this.spawnTick();
    var keep = [];
    for (i = 0; i < this.list.length; i++) {
      m = this.list[i];
      var T = TYPES[m.type];
      m.px = m.x; m.py = m.y; m.pz = m.z; m.pyaw = m.yaw; m.pwalk = m.walk; m.ai.pfuse = m.ai.fuse; m.age++;
      if (m.dead) { if (++m.dead > 20) { this.die(m); continue; } keep.push(m); continue; }
      if (m.hurt > 0) m.hurt--;
      if (m.invul > 0) m.invul--;
      // 子どもは 20 分（24000 刻み）で大人になる。繁殖したあとは 5 分休む
      if (m.baby > 0) m.baby--;
      if (m.breedCd > 0) m.breedCd--;
      if (m.love > 0) { m.love--; if (m.love % 10 === 0) g.puff(m.x, m.y + mh(m) + 0.2, m.z, [230, 80, 100], 1, 0.3); }
      if (m.trades && m.age % 6000 === 0) m.trades.forEach(function (t) { t.uses = 0; });   // 村人の品物は時間がたつと補充される
      var dx = p[0] - m.x, dz = p[2] - m.z, dist = Math.hypot(dx, dz), dy = p[1] - m.y;
      // 遠くの敵は消える（Minecraft と同じく 128 ブロックより遠いとすぐ、32 より遠いと少しずつ）
      if ((T.hostile || T.despawn) && (dist > 128 || (dist > 32 && Math.random() < 1 / 800))) continue;
      this.think(m, T, dist, dx, dy, dz);
      this.physics(m, T);
      // 日光で燃える（ゾンビ・スケルトン）
      if (T.burns && wd.dimKey === 'overworld' && g.sky()) {
        var lv = w.lightLevels(m.x, m.y + T.h - 0.2, m.z), daySky = lv[0] - (g.sky().dark || 0);
        if (daySky >= 13 && !WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y + 0.5), Math.floor(m.z)))) m.fire = 40;
      }
      // 燃えている間は 1 秒ごとに 1 減る（燃える時間とは別に数える）
      if (m.fire > 0) { m.fire--; m.burnT = (m.burnT || 0) + 1; if (m.burnT % 20 === 0) this.hurt(m, 1, null); if (WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y + 0.5), Math.floor(m.z)))) m.fire = 0; }
      if (T.fireproof) m.fire = 0;
      else if (WG.isLava(wd.block(Math.floor(m.x), Math.floor(m.y + 0.3), Math.floor(m.z)))) { this.hurt(m, 4, null); m.fire = 100; }
      // イカは水から出ると 1 秒ごとに 1 減る
      if (T.swims && !WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y + 0.4), Math.floor(m.z))) && m.age % 20 === 0) this.hurt(m, 1, null);
      if (m.poison > 0) { if (--m.poison % 25 === 0 && m.hp > 1) this.hurt(m, 1, null); }
      if (m.y < wd.minY - 64) continue;
      if (m.removed) continue;
      keep.push(m);
    }
    // 重なった生き物は少し押し合う
    for (i = 0; i < keep.length; i++) for (var j = i + 1; j < keep.length; j++) {
      var a = keep[i], b = keep[j], ox = a.x - b.x, oz = a.z - b.z, d2 = ox * ox + oz * oz, r = (mw(a) + mw(b)) / 2;
      if (d2 < r * r && d2 > 1e-6 && Math.abs(a.y - b.y) < 1) { var d = Math.sqrt(d2), f = (r - d) / d * 0.05; a.vx += ox * f; a.vz += oz * f; b.vx -= ox * f; b.vz -= oz * f; }
    }
    this.list.length = 0;
    Array.prototype.push.apply(this.list, keep);
    this.tickArrows();
  };

  // 考える：どこへ向かうか、攻撃するか
  Mobs.prototype.think = function (m, T, dist, dx, dy, dz) {
    var g = this.game, ai = m.ai, w = g.walker, want = null, speed = T.speed;
    // 透明化していると、敵はほとんど気づかない（Minecraft と同じく 7% の距離）
    var range = T.range * (g.effects && g.effects.INVISIBILITY ? 0.07 : 1);
    var targetPlayer = T.hostile && g.mode === 'survival' && !g.dead && dist < Math.max(2, range) && Math.abs(dy) < 12 && this.sees(m, T);
    // クモは明るい所では、叩かれない限り襲ってこない
    if (targetPlayer && m.type === 'SPIDER' && !m.angry && g.sky && g.sky() && w.lightLevels(m.x, m.y + 0.5, m.z)[0] - (g.sky().dark || 0) >= 12) targetPlayer = false;
    var sp = this.special(m, T, dist, dx, dy, dz);
    if (sp === 'done') return;
    if (sp) { want = sp.want; speed = sp.speed; targetPlayer = !!sp.chase; }
    else if (!T.hostile) {
      var held = g.inv.held();
      if (ai.panic > 0) {
        ai.panic--;
        if (ai.timer-- <= 0 || ai.tx == null) { var a = Math.random() * Math.PI * 2; ai.tx = m.x + Math.cos(a) * 8; ai.tz = m.z + Math.sin(a) * 8; ai.timer = 20; }
        want = [ai.tx, ai.tz]; speed = T.speed * 2;
      } else if (held && T.food.indexOf(held.key) >= 0 && dist < 10 && dist > 1.5) want = [w.pos[0], w.pos[2]];
      else this.wander(m, ai);
      if (!want && ai.tx != null) want = [ai.tx, ai.tz];
      if (m.type === 'CHICKEN' && !m.ground && m.vy < -0.1) m.vy = -0.1;   // 羽ばたいてゆっくり落ちる
      // 毛を刈った羊は、草を食べると毛が戻る（草ブロックは土になる）
      if (m.sheared && m.ground && Math.random() < 0.001) {
        var gx = Math.floor(m.x), gy = Math.floor(m.y) - 1, gz = Math.floor(m.z);
        if (this.world.block(gx, gy, gz) === WG.B.GRASS) { this.world.setBlock(gx, gy, gz, WG.B.DIRT); m.sheared = false; w.remesh(gx, gz); }
      }
    } else if (targetPlayer) {
      ai.tx = null;
      if (m.type === 'ZOMBIE' || m.type === 'SPIDER' || m.type === 'CAVE_SPIDER') {
        want = [w.pos[0], w.pos[2]];
        if (ai.cd > 0) ai.cd--;
        if (dist < 0.3 + T.w / 2 + 0.7 && Math.abs(dy) < 1.5 && ai.cd === 0) {
          g.hurtPlayer(m.type === 'ZOMBIE' ? 3 : 2, m.x, m.z); ai.cd = 20;
          if (m.type === 'CAVE_SPIDER' && g.addEffect) g.addEffect('POISON', 140, 0);   // 洞窟グモの毒（7 秒）
        }
        // クモは近づくと跳びかかる
        if ((m.type === 'SPIDER' || m.type === 'CAVE_SPIDER') && m.ground && dist > 2 && dist < 4 && Math.random() < 0.1) { m.vy = 0.4; m.vx += dx / dist * 0.25; m.vz += dz / dist * 0.25; }
      } else if (m.type === 'SKELETON') {
        // 間合いを取って射る
        if (dist > 12) want = [w.pos[0], w.pos[2]];
        else if (dist < 5) want = [m.x - dx, m.z - dz];
        if (ai.cd > 0) ai.cd--;
        else { this.shoot(m, T); ai.cd = 30 + Math.floor(Math.random() * 30); }
        m.yaw = Math.atan2(dx, dz);
      } else if (m.type === 'WITCH') {
        // 間合いを取って、投げポーションを投げる（3 秒ごと）
        if (dist > 10) want = [w.pos[0], w.pos[2]];
        else if (dist < 6) want = [m.x - dx, m.z - dz];
        if (ai.cd > 0) ai.cd--;
        else if (dist < 12) { this.throwPotion(m, dist); ai.cd = 60; }
        m.yaw = Math.atan2(dx, dz);
      } else if (T.sizes) {
        // スライム：跳ねて近づき、触れると傷つける（大きさ 1 のスライムは傷つけない）
        if (ai.cd > 0) ai.cd--;
        var reach = mw(m) / 2 + 0.6, dmg = T.dmg[m.size] || 0;
        if (dmg && dist < reach && Math.abs(dy) < mh(m) + 0.5 && ai.cd === 0) { g.hurtPlayer(dmg, m.x, m.z); ai.cd = 20; }
        m.yaw = Math.atan2(dx, dz);
        this.hop(m, T, dx / (dist || 1), dz / (dist || 1), 1);
      } else if (m.type === 'BOMBER') {
        // 近づいて膨らみ、1.5 秒で爆発する。7 ブロック離れるとしぼむ。
        if (dist < 3 || (ai.fuse > 0 && dist < 7)) { ai.fuse++; if (ai.fuse >= 30) { g.explode(m.x, m.y + 0.5, m.z, 3); m.removed = true; return; } }
        else { if (ai.fuse > 0) ai.fuse--; want = [w.pos[0], w.pos[2]]; }
      }
    } else {
      if (m.type === 'BOMBER' && ai.fuse > 0) ai.fuse--;
      this.wander(m, ai);
      if (ai.tx != null) want = [ai.tx, ai.tz];
      speed = T.speed * 0.6;
    }
    // 向かう
    if (want) {
      var tx = want[0] - m.x, tz = want[1] - m.z, td = Math.hypot(tx, tz);
      if (td < 0.6) { if (!targetPlayer) ai.tx = null; }
      else {
        tx /= td; tz /= td;
        // 3 ブロックより深い崖へは進まない（敵が追いかけているときは別）
        if (!targetPlayer && this.cliff(m, tx, tz)) { ai.tx = null; }
        else {
          var acc = m.ground ? 0.25 : 0.05;
          m.vx += (tx * speed - m.vx) * acc; m.vz += (tz * speed - m.vz) * acc;
          if ((m.type !== 'SKELETON' && m.type !== 'WITCH') || !targetPlayer) m.yaw = Math.atan2(tx, tz);
          if (m.collided && m.ground) m.vy = 0.42;   // 段差はジャンプ
          if (T.hops && m.ground && Math.random() < 0.3) m.vy = 0.3;   // ウサギは跳ねて進む
        }
      }
    }
  };

  // 種類ごとの特別な動き。'done' なら動きはここで済み、{ want, speed, chase } なら向かう先、null ならふつうの動き
  Mobs.prototype.special = function (m, T, dist, dx, dy, dz) {
    var g = this.game, ai = m.ai, w = g.walker, wd = this.world, self = this;
    // 恋をしている動物は、同じ種類の恋をしている相手へ向かい、近づくと子どもが生まれる
    if (m.love > 0 && !(m.type === 'WOLF' && m.sit)) {
      var mate = null, md = 8;
      this.list.forEach(function (o) {
        if (o === m || o.dead || o.type !== m.type || !(o.love > 0) || o.baby) return;
        var d = Math.hypot(o.x - m.x, o.z - m.z);
        if (d < md && Math.abs(o.y - m.y) < 3) { md = d; mate = o; }
      });
      if (mate) {
        if (md < Math.max(1.2, mw(m) + 0.3)) this.breed(m, mate);
        return { want: [mate.x, mate.z], speed: T.speed, chase: false };
      }
    }
    if (m.type === 'VILLAGER') {
      // ゾンビが近いと逃げる。ふだんは家の近く（生まれた所から 12 ブロック以内）を歩く
      var z = null, zd = 8;
      this.list.forEach(function (o) { if (!o.dead && o.type === 'ZOMBIE') { var d = Math.hypot(o.x - m.x, o.z - m.z); if (d < zd) { zd = d; z = o; } } });
      if (z) return { want: [m.x + (m.x - z.x), m.z + (m.z - z.z)], speed: T.speed * 1.8, chase: false };
      if (m.trading) { m.yaw = Math.atan2(dx, dz); return 'done'; }
      if (m.home && Math.hypot(m.x - m.home[0], m.z - m.home[1]) > 12) return { want: [m.home[0], m.home[1]], speed: T.speed, chase: false };
      return null;
    }
    if (m.type === 'BAT') {
      // 3 次元でふらふら飛ぶ。ときどき行き先を変え、天井や床に近づきすぎない
      if (ai.timer-- <= 0 || ai.tx == null) {
        ai.tx = m.x + (Math.random() - 0.5) * 8; ai.tz = m.z + (Math.random() - 0.5) * 8; ai.ty = m.y + (Math.random() - 0.4) * 4; ai.timer = 20 + Math.floor(Math.random() * 40);
      }
      var fx = ai.tx - m.x, fy = ai.ty - m.y, fz = ai.tz - m.z, fd = Math.hypot(fx, fy, fz) || 1;
      m.vx += (fx / fd * 0.12 - m.vx) * 0.15; m.vy += (fy / fd * 0.1 - m.vy) * 0.15; m.vz += (fz / fd * 0.12 - m.vz) * 0.15;
      if (m.collided) ai.timer = 0;
      m.yaw = Math.atan2(m.vx, m.vz);
      return 'done';
    }
    if (m.type === 'SQUID') {
      // 水の中をゆっくり泳ぎ回る。叩かれると逃げる
      var inW = WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y + 0.4), Math.floor(m.z)));
      if (!inW) return 'done';
      if (ai.timer-- <= 0 || m.collided || ai.panic > 0) {
        var a = Math.random() * Math.PI * 2, up = (Math.random() - 0.5) * 0.06, sp = ai.panic > 0 ? 0.12 : 0.05;
        if (!WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y + 1.4), Math.floor(m.z)))) up = -0.03;
        ai.sv = [Math.cos(a) * sp, up, Math.sin(a) * sp]; ai.timer = 40 + Math.floor(Math.random() * 60);
        if (ai.panic > 0) ai.panic = Math.max(0, ai.panic - 20);
      }
      if (ai.sv) { m.vx += (ai.sv[0] - m.vx) * 0.1; m.vy += (ai.sv[1] - m.vy) * 0.1; m.vz += (ai.sv[2] - m.vz) * 0.1; m.yaw = Math.atan2(m.vx, m.vz); }
      return 'done';
    }
    if (m.type === 'WOLF') {
      if (ai.cd > 0) ai.cd--;
      if (m.tame) {
        if (m.sit) return 'done';
        // 近くの敵を噛みに行く
        var foe = null, best = 12;
        this.list.forEach(function (o) {
          if (o.dead || o === m || !TYPES[o.type].hostile) return;
          var d = Math.hypot(o.x - m.x, o.z - m.z);
          if (d < best && Math.abs(o.y - m.y) < 4) { best = d; foe = o; }
        });
        if (foe) {
          if (best < mw(foe) / 2 + 0.9 && ai.cd === 0) { self.hurt(foe, 4, [m.x, m.z]); ai.cd = 20; }
          return { want: [foe.x, foe.z], speed: T.speed * 1.5, chase: true };
        }
        // 主人（プレイヤー）について行く。離れすぎたらそばへ跳ぶ
        if (dist > 14 && !g.dead) {
          for (var k = 0; k < 10; k++) {
            var tx = Math.floor(w.pos[0] + (Math.random() - 0.5) * 4), tz = Math.floor(w.pos[2] + (Math.random() - 0.5) * 4), ty = Math.floor(w.pos[1]);
            if (WG.COLLIDE[wd.block(tx, ty - 1, tz)] && !WG.COLLIDE[wd.block(tx, ty, tz)] && !WG.COLLIDE[wd.block(tx, ty + 1, tz)]) {
              m.x = m.px = tx + 0.5; m.y = m.py = ty; m.z = m.pz = tz + 0.5; m.vx = m.vy = m.vz = 0; break;
            }
          }
          return 'done';
        }
        if (dist > 5) return { want: [w.pos[0], w.pos[2]], speed: T.speed * 1.4, chase: true };
        return { want: null, speed: T.speed, chase: false };
      }
      // 叩かれた野生のオオカミは、怒って噛みつく（サバイバル）
      if (m.angry && g.mode === 'survival' && !g.dead && dist < 20) {
        if (dist < 0.3 + T.w / 2 + 0.7 && Math.abs(dy) < 1.5 && ai.cd === 0) { g.hurtPlayer(2, m.x, m.z); ai.cd = 20; }
        return { want: [w.pos[0], w.pos[2]], speed: T.speed * 1.5, chase: true };
      }
      return null;
    }
    if (T.sizes) {
      // 狙っていないスライムは、ときどき好きな向きに跳ねる
      var chasing = g.mode === 'survival' && !g.dead && dist < T.range && Math.abs(dy) < 12;
      if (chasing) return null;
      if (ai.cd > 0) ai.cd--;
      if (ai.timer-- <= 0) { ai.hd = Math.random() * Math.PI * 2; ai.timer = 40 + Math.floor(Math.random() * 60); }
      this.hop(m, T, Math.sin(ai.hd || 0), Math.cos(ai.hd || 0), 0.6);
      return 'done';
    }
    return null;
  };
  // えさをやる：大人は恋をし（繁殖）、子どもは育つ。使ったら true（えさが 1 つ減る）
  Mobs.prototype.feed = function (m, key) {
    var T = TYPES[m.type];
    if (!T.breeds || !T.breed || T.breed.indexOf(key) < 0 || m.dead) return false;
    if (m.type === 'WOLF') {
      if (!m.tame) return false;
      if (m.hp < m.maxHp) { m.hp = Math.min(m.maxHp, m.hp + 4); return true; }   // なついたオオカミは肉で回復
    }
    if (m.baby > 0) { m.baby = Math.floor(m.baby * 0.9); this.game.puff(m.x, m.y + mh(m), m.z, [120, 200, 90], 4, 0.3); return true; }
    if (m.love > 0 || m.breedCd > 0) return false;
    m.love = 600;   // 30 秒
    return true;
  };
  Mobs.prototype.breed = function (a, b) {
    var c = this.spawn(a.type, (a.x + b.x) / 2, Math.max(a.y, b.y), (a.z + b.z) / 2);
    c.baby = 24000;
    if (a.type === 'WOLF') { c.tame = true; c.hp = c.maxHp = 20; }
    a.love = b.love = 0; a.breedCd = b.breedCd = 6000;
    this.game.puff(c.x, c.y + 0.5, c.z, [230, 80, 100], 8, 0.5);
    if (this.game.spawnOrbs) this.game.spawnOrbs(c.x, c.y + 0.5, c.z, 1 + Math.floor(Math.random() * 7));
    return c;
  };
  // スライムの跳ね方：地面にいて間が空いたら、向きへ跳ぶ
  Mobs.prototype.hop = function (m, T, ux, uz, k) {
    var ai = m.ai;
    if (m.ground) {
      m.vx *= 0.3; m.vz *= 0.3;
      if ((ai.hop = (ai.hop || 0) - 1) <= 0) {
        m.vy = T.jump * (0.8 + 0.1 * (m.size || 1)); m.vx = ux * T.speed * 2.2 * k; m.vz = uz * T.speed * 2.2 * k; m.yaw = Math.atan2(ux, uz);
        ai.hop = 10 + Math.floor(Math.random() * 20);
      }
    } else { m.vx += (ux * T.speed * 2.2 * k - m.vx) * 0.1; m.vz += (uz * T.speed * 2.2 * k - m.vz) * 0.1; }
  };
  // 魔女が投げるポーション（プレイヤーへ向けて山なりに）
  var WITCH_POTS = ['SPLASH_POTION_HARMING', 'SPLASH_POTION_POISON', 'SPLASH_POTION_SLOWNESS'];
  Mobs.prototype.throwPotion = function (m, dist) {
    var g = this.game, w = g.walker, e = w.pos;
    if (!g.throwns) return;
    var dx = e[0] - m.x, dz = e[2] - m.z, d = Math.hypot(dx, dz) || 1, t = Math.max(8, d / 0.45);
    var key = WITCH_POTS[dist > 8 ? 2 : Math.random() < 0.5 ? 0 : 1];
    var sx = m.x + dx / d * 0.9, sz = m.z + dz / d * 0.9, sy = m.y + 1.6;
    g.throwns.push({ key: key, x: sx, y: sy, z: sz, px: sx, py: sy, pz: sz, vx: (e[0] - sx) / t, vy: (e[1] + 0.9 - sy) / t + 0.025 * t, vz: (e[2] - sz) / t, age: 0 });
  };

  Mobs.prototype.wander = function (m, ai) {
    if (ai.timer > 0) { ai.timer--; return; }
    if (Math.random() < 0.02) {
      var a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 7;
      ai.tx = m.x + Math.cos(a) * r; ai.tz = m.z + Math.sin(a) * r; ai.timer = 60 + Math.floor(Math.random() * 120);
    }
  };

  Mobs.prototype.cliff = function (m, tx, tz) {
    var wd = this.world, x = Math.floor(m.x + tx * 0.8), z = Math.floor(m.z + tz * 0.8), y = Math.floor(m.y);
    for (var k = 0; k <= 3; k++) if (WG.COLLIDE[wd.block(x, y - k, z)] || FLUID[wd.block(x, y - k, z)]) return false;
    return true;
  };

  // 目から相手の目まで、固いブロックがないか
  Mobs.prototype.sees = function (m, T) {
    var w = this.game.walker, e = w.eye || w.pos, sx = m.x, sy = m.y + T.h * 0.85, sz = m.z;
    var dx = e[0] - sx, dy = e[1] - sy, dz = e[2] - sz, d = Math.hypot(dx, dy, dz), n = Math.ceil(d * 2);
    for (var i = 1; i < n; i++) {
      var t = i / n;
      if (WG.OPAQUE[this.world.block(Math.floor(sx + dx * t), Math.floor(sy + dy * t), Math.floor(sz + dz * t))]) return false;
    }
    return true;
  };

  // 体を動かす（プレイヤーと同じぶつかり方）
  Mobs.prototype.physics = function (m, T) {
    var w = this.game.walker, wd = this.world;
    var inWater = WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y + mh(m) * 0.4), Math.floor(m.z)));
    if (T.flies) { /* 飛ぶ生き物は落ちない */ }
    else if (T.swims && inWater) { m.vy *= 0.9; }
    else if (inWater) { m.vy += 0.04; m.vy *= 0.8; } else { m.vy -= 0.08; }
    var b = box3(m), ry = m.vy, rx = m.vx, rz = m.vz;
    var dy = w.clip(b, 1, m.vy); b[1] += dy; b[4] += dy;
    var dx = w.clip(b, 0, m.vx); b[0] += dx; b[3] += dx;
    var dz = w.clip(b, 2, m.vz); b[2] += dz; b[5] += dz;
    m.ground = ry < 0 && Math.abs(dy - ry) > 1e-9;
    if (Math.abs(dy - ry) > 1e-9) m.vy = 0;
    m.collided = Math.abs(dx - rx) > 1e-9 || Math.abs(dz - rz) > 1e-9;
    if (Math.abs(dx - rx) > 1e-9) m.vx = 0;
    if (Math.abs(dz - rz) > 1e-9) m.vz = 0;
    m.x = (b[0] + b[3]) / 2; m.y = b[1]; m.z = (b[2] + b[5]) / 2;
    if (T.climbs && m.collided) m.vy = 0.2;   // クモは壁を登る
    var f = T.flies || (T.swims && inWater) ? 0.92 : m.ground ? 0.546 : inWater ? 0.8 : 0.91;
    m.vx *= f; m.vz *= f;
    if (!inWater && !T.flies) m.vy *= 0.98;
    m.walk += Math.hypot(dx, dz) * 0.9;
    // 落下のダメージ（3 ブロックより高い所から）
    if (dy < 0 && !inWater) m.fall = (m.fall || 0) - dy;
    if (m.ground || inWater) {
      if (m.fall > 3 && m.type !== 'CHICKEN' && !T.noFall) this.hurt(m, Math.ceil(m.fall - 3), null);
      // 大きな生き物（幅²×高さ > 0.512）は耕地を踏み荒らす
      if (m.ground && m.fall > 0.5 && mw(m) * mw(m) * mh(m) > 0.512) this.game.trample(Math.floor(m.x), Math.floor(m.y - 0.05), Math.floor(m.z), m.fall);
      m.fall = 0;
    }
  };

  // ---- 傷つく・倒れる ----
  Mobs.prototype.hurt = function (m, amount, from) {
    if (m.dead || m.invul > 0) return false;
    m.hp -= amount; m.invul = 10; m.hurt = 10; if (from) m.angry = true;
    if (from) {
      var dx = m.x - from[0], dz = m.z - from[1], d = Math.hypot(dx, dz) || 1, k = from[2] || 0.4;
      m.vx += dx / d * k; m.vz += dz / d * k; m.vy = 0.36;
    }
    if (!TYPES[m.type].hostile) { m.ai.panic = 60; m.ai.tx = null; }
    if (m.hp <= 0) { m.dead = 1; m.vx = m.vz = 0; }
    return true;
  };

  Mobs.prototype.die = function (m) {
    var g = this.game, T = TYPES[m.type], self = this;
    // スライムは半分の大きさの 2〜4 匹に分かれる
    if (T.sizes && m.size > 1) {
      for (var n = 2 + Math.floor(Math.random() * 3); n > 0; n--) {
        var c = self.spawn(m.type, m.x + (Math.random() - 0.5) * m.size * 0.5, m.y + 0.2, m.z + (Math.random() - 0.5) * m.size * 0.5, m.size / 2);
        c.vy = 0.2;
      }
    }
    var dropOk = !m.baby && (!T.dropSize || (T.dropSize === 'small' ? m.size === 1 : m.size > 1));
    if (dropOk) T.drops.forEach(function (d) {
      if (m.sheared && d[0] === 'WHITE_WOOL') return;   // 毛を刈った羊は羊毛を落とさない
      var n = d[1] + Math.floor(Math.random() * (d[2] - d[1] + 1 + (m.looting || 0)));   // ドロップ増加で最大が増える
      var key = m.fire > 0 && WG.Craft.SMELT[d[0]] ? WG.Craft.SMELT[d[0]] : d[0];   // 燃えながら倒れた動物は焼けた肉を落とす
      if (n > 0) g.spawnItem(key, n, m.x, m.y + 0.3, m.z, 0.1, 10);
    });
    // 経験値（敵は 5、動物は 1〜3）
    if (g.spawnOrbs && m.type !== 'BAT' && m.type !== 'SQUID' && !m.baby) g.spawnOrbs(m.x, m.y + 0.5, m.z, T.sizes ? m.size : T.hostile ? 5 : 1 + Math.floor(Math.random() * 3));
    if (T.rare && Math.random() < (T.rareP || 0.025)) g.spawnItem(T.rare[Math.floor(Math.random() * T.rare.length)], 1, m.x, m.y + 0.3, m.z, 0.1, 10);
    g.puff(m.x, m.y + mh(m) / 2, m.z, [220, 220, 220], 12);
  };

  // プレイヤーが弓で射る矢（v は速さ 0〜3、dmg は当たったときの減り方）
  Mobs.prototype.shootFromPlayer = function (eye, dir, v, dmg, pickup) {
    var a = { x: eye[0] + dir[0] * 0.3, y: eye[1] - 0.1 + dir[1] * 0.3, z: eye[2] + dir[2] * 0.3, px: eye[0], py: eye[1] - 0.1, pz: eye[2],
      vx: dir[0] * v, vy: dir[1] * v, vz: dir[2] * v, life: 0, stuck: false, player: true, dmg: dmg, pickup: pickup };
    this.arrows.push(a);
    return a;
  };

  // 視線の先の生き物（届く距離 reach 以内、ブロックより手前）
  Mobs.prototype.pick = function (eye, dir, reach) {
    var best = null, bt = reach;
    this.list.forEach(function (m) {
      if (m.dead) return;
      var b = box3(m), t0 = 0, t1 = bt;
      for (var k = 0; k < 3; k++) {
        var o = eye[k], d = dir[k], lo = b[k], hi = b[k + 3];
        if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { t0 = 1; t1 = 0; } continue; }
        var ta = (lo - o) / d, tb = (hi - o) / d;
        if (ta > tb) { var tt = ta; ta = tb; tb = tt; }
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      }
      if (t0 <= t1 && t0 < bt) { bt = t0; best = m; }
    });
    return best ? { mob: best, dist: bt } : null;
  };

  Mobs.prototype.near = function (x, y, z, rh, rv, hostileOnly) {
    return this.list.some(function (m) { return !m.dead && (!hostileOnly || TYPES[m.type].hostile) && Math.abs(m.x - x) < rh && Math.abs(m.z - z) < rh && Math.abs(m.y - y) < rv; });
  };

  // ---- 矢 ----
  Mobs.prototype.shoot = function (m, T) {
    var w = this.game.walker, e = w.eye || w.pos;
    var sx = m.x, sy = m.y + T.h * 0.8, sz = m.z, dx = e[0] - sx, dz = e[2] - sz, dh = Math.hypot(dx, dz);
    var dy = (e[1] - 0.5) - sy + dh * 0.2, len = Math.hypot(dx, dy, dz), sp = 1.6, spread = 0.03;
    this.arrows.push({ x: sx, y: sy, z: sz, px: sx, py: sy, pz: sz,
      vx: dx / len * sp + (Math.random() - 0.5) * spread, vy: dy / len * sp + (Math.random() - 0.5) * spread, vz: dz / len * sp + (Math.random() - 0.5) * spread, life: 0, stuck: false });
  };
  Mobs.prototype.tickArrows = function () {
    var g = this.game, w = g.walker, keep = [];
    for (var i = 0; i < this.arrows.length; i++) {
      var a = this.arrows[i];
      a.px = a.x; a.py = a.y; a.pz = a.z; a.life++;
      if (a.stuck) {
        // 刺さった自分の矢は、近くを通ると拾える（サバイバル）
        if (a.player && a.pickup && !g.dead && Math.hypot(a.x - w.pos[0], a.y - w.pos[1] - 0.9, a.z - w.pos[2]) < 1.4 && g.inv.add('ARROW', 1)) continue;
        if (a.life < (a.player ? 1200 : 60)) keep.push(a);
        continue;
      }
      var hit = false;
      for (var s = 0; s < 4 && !hit; s++) {
        a.x += a.vx / 4; a.y += a.vy / 4; a.z += a.vz / 4;
        if (WG.COLLIDE[this.world.block(Math.floor(a.x), Math.floor(a.y), Math.floor(a.z))]) { a.stuck = true; a.life = 0; hit = true; break; }
        if (a.player) {
          // プレイヤーの矢は生き物に当たる
          for (var mi = 0; mi < this.list.length && !hit; mi++) {
            var mm = this.list[mi], mb = box3(mm);
            if (mm.dead || a.x < mb[0] || a.x > mb[3] || a.y < mb[1] || a.y > mb[4] || a.z < mb[2] || a.z > mb[5]) continue;
            this.hurt(mm, a.dmg, [a.x - a.vx, a.z - a.vz, 0.4 + (a.punch || 0) * 0.6]);
            if (a.flame) mm.fire = Math.max(mm.fire || 0, 100);
            hit = true; a.dead = true;
          }
          // ディスペンサーの矢はプレイヤーにも当たる
          if (!hit && a.any) {
            var pb2 = w.box();
            if (!g.dead && a.x > pb2[0] && a.x < pb2[3] && a.y > pb2[1] && a.y < pb2[4] && a.z > pb2[2] && a.z < pb2[5]) { g.hurtPlayer(a.dmg, a.x - a.vx, a.z - a.vz, 'projectile'); hit = true; a.dead = true; }
          }
          continue;
        }
        var pb = w.box();
        if (!g.dead && a.x > pb[0] && a.x < pb[3] && a.y > pb[1] && a.y < pb[4] && a.z > pb[2] && a.z < pb[5]) {
          g.hurtPlayer(Math.ceil(Math.hypot(a.vx, a.vy, a.vz) * 2) + (Math.random() < 0.25 ? 1 : 0) - 1, a.x - a.vx, a.z - a.vz, 'projectile');
          hit = true; a.dead = true;
        }
      }
      if (a.dead) continue;
      if (!a.stuck) { a.vy -= 0.05; a.vx *= 0.99; a.vy *= 0.99; a.vz *= 0.99; }
      if (a.life < 200) keep.push(a);
    }
    this.arrows = keep;
  };

  // ---- 出てくる ----
  // チャンクを初めて読み込んだとき、動物の群れを置く（Minecraft の世界生成と同じく約 1 割のチャンク）
  Mobs.prototype.populate = function (cx, cz) {
    var wd = this.world, key = cx + ',' + cz;
    if (wd.dimKey !== 'overworld' || wd.populated.has(key)) return;
    wd.populated.add(key);
    // スポナーの場所を覚えておく
    var c = wd.chunk(cx, cz), bl = c.blocks, i;
    for (i = 0; i < bl.length; i++) if (bl[i] === B.SPAWNER) {
      var sx = (cx << 4) + (i & 15), sy = wd.minY + (i >> 8), sz = (cz << 4) + ((i >> 4) & 15);
      wd.spawners.set(sx + ',' + sy + ',' + sz, { x: sx, y: sy, z: sz, timer: 200 + Math.floor(Math.random() * 600), type: WG.hash(wd.seed, sx, sy, sz, 301) % 3 === 0 ? 'SKELETON' : 'ZOMBIE' });
    }
    if (WG.populateVillage) WG.populateVillage(this, cx, cz);   // 村の家に村人を置く（js/village.js）
    if (Math.random() >= 0.1 || !c.hmap) return;
    var type = pick(PASSIVE, PASSIVE_W), n = 2 + Math.floor(Math.random() * 3);
    for (var k = 0; k < n * 4 && n > 0; k++) {
      var q = Math.floor(Math.random() * 256), h = c.hmap[q], x = (cx << 4) + (q & 15), z = (cz << 4) + (q >> 4);
      if (bl[((h - wd.minY) << 8) | q] !== B.GRASS || bl[((h + 1 - wd.minY) << 8) | q] !== 0 && WG.blockKind(bl[((h + 1 - wd.minY) << 8) | q]) !== 'plant') continue;
      this.spawn(type, x + 0.5, h + 1, z + 0.5); n--;
    }
  };

  // 暗い所に敵が出る（明かりのない所、夜の地上）。スポナーの近くにも出る。
  Mobs.prototype.spawnTick = function () {
    var g = this.game, wd = this.world, w = g.walker;
    if (wd.dimKey === 'nether') { this.spawnNether(); return; }
    if (wd.dimKey !== 'overworld') return;
    var sky = g.sky(), dark = sky ? sky.dark : 0, self = this;
    var hostiles = this.list.filter(function (m) { return TYPES[m.type].hostile; }).length;
    if (hostiles < 15 && g.tickCount % 10 === 0) {
      var a = Math.random() * Math.PI * 2, r = 24 + Math.random() * 24;
      var x = Math.floor(w.pos[0] + Math.cos(a) * r), z = Math.floor(w.pos[2] + Math.sin(a) * r), y = Math.floor(w.pos[1] + (Math.random() - 0.5) * 32);
      for (var k = 0; k < 24; k++, y--) {
        if (WG.COLLIDE[wd.block(x, y - 1, z)] >= 1 && !WG.COLLIDE[wd.block(x, y, z)] && !WG.COLLIDE[wd.block(x, y + 1, z)] && !FLUID[wd.block(x, y, z)] && !FLUID[wd.block(x, y + 1, z)]) {
          var lv = w.lightLevels(x + 0.5, y, z + 0.5);
          if (lv[1] === 0 && Math.max(0, lv[0] - dark) <= Math.floor(Math.random() * 8)) this.spawn(y < 40 ? pick(DEEP, DEEP_W) : pick(HOSTILE, HOSTILE_W), x + 0.5, y, z + 0.5);
          break;
        }
      }
    }
    this.spawnAmbient();
    // スポナー：16 ブロック以内にいるとき、10〜40 秒ごとに最大 4 匹
    wd.spawners.forEach(function (sp, key) {
      if (wd.block(sp.x, sp.y, sp.z) !== B.SPAWNER) { wd.spawners.delete(key); return; }
      if (Math.hypot(sp.x - w.pos[0], sp.y - w.pos[1], sp.z - w.pos[2]) > 16) return;
      if (--sp.timer > 0) return;
      sp.timer = 200 + Math.floor(Math.random() * 600);
      var count = self.list.filter(function (m) { return m.type === sp.type && Math.abs(m.x - sp.x) < 5 && Math.abs(m.z - sp.z) < 5 && Math.abs(m.y - sp.y) < 3; }).length;
      for (var n = 0; n < 4 && count < 6; n++) {
        var x2 = sp.x + Math.floor((Math.random() - 0.5) * 8), y2 = sp.y + Math.floor(Math.random() * 3) - 1, z2 = sp.z + Math.floor((Math.random() - 0.5) * 8);
        if (WG.COLLIDE[wd.block(x2, y2 - 1, z2)] >= 1 && !WG.COLLIDE[wd.block(x2, y2, z2)] && !WG.COLLIDE[wd.block(x2, y2 + 1, z2)] && w.lightLevels(x2, y2, z2)[1] <= 11) {
          self.spawn(sp.type, x2 + 0.5, y2, z2 + 0.5); count++;
          g.puff(x2 + 0.5, y2 + 0.5, z2 + 0.5, [60, 60, 60], 6);
        }
      }
    });
  };

  // 洞窟のコウモリと、水の中のイカ（数に上限あり）
  Mobs.prototype.spawnAmbient = function () {
    var g = this.game, wd = this.world, w = g.walker;
    if (g.tickCount % 40 !== 0) return;
    var bats = 0, squids = 0;
    this.list.forEach(function (m) { if (m.type === 'BAT') bats++; else if (m.type === 'SQUID') squids++; });
    var a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 20;
    var x = Math.floor(w.pos[0] + Math.cos(a) * r), z = Math.floor(w.pos[2] + Math.sin(a) * r), y = Math.floor(w.pos[1] + (Math.random() - 0.5) * 24), k;
    if (bats < 4 && y < 60) {
      for (k = 0; k < 16; k++, y--) {
        if (wd.block(x, y, z) === B.AIR && wd.block(x, y + 1, z) === B.AIR && WG.COLLIDE[wd.block(x, y - 1, z)] >= 1) {
          var lv = w.lightLevels(x + 0.5, y, z + 0.5);
          if (lv[0] < 4 && lv[1] < 4) this.spawn('BAT', x + 0.5, y + 0.5, z + 0.5);
          break;
        }
      }
    }
    if (squids < 5) {
      // 深さ 3 以上の水の中
      for (y = Math.floor(w.pos[1]) + 10, k = 0; k < 30; k++, y--) {
        if (WG.isWater(wd.block(x, y, z)) && WG.isWater(wd.block(x, y - 2, z))) {
          var cnt = 2 + Math.floor(Math.random() * 2);
          for (var i = 0; i < cnt; i++) this.spawn('SQUID', x + 0.5 + Math.random() - 0.5, y - 1.5, z + 0.5 + Math.random() - 0.5);
          break;
        }
      }
    }
  };
  // ネザー：マグマスライムが出る
  Mobs.prototype.spawnNether = function () {
    var g = this.game, wd = this.world, w = g.walker;
    if (g.tickCount % 20 !== 0 || this.list.filter(function (m) { return TYPES[m.type].hostile; }).length >= 8) return;
    var a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 24;
    var x = Math.floor(w.pos[0] + Math.cos(a) * r), z = Math.floor(w.pos[2] + Math.sin(a) * r), y = Math.floor(w.pos[1] + (Math.random() - 0.5) * 24);
    for (var k = 0; k < 24; k++, y--) {
      if (WG.COLLIDE[wd.block(x, y - 1, z)] >= 1 && !WG.COLLIDE[wd.block(x, y, z)] && !WG.COLLIDE[wd.block(x, y + 1, z)] && !FLUID[wd.block(x, y, z)] && !WG.COLLIDE[wd.block(x + 1, y, z)] && !WG.COLLIDE[wd.block(x, y, z + 1)]) {
        if (Math.random() < 0.3) this.spawn('MAGMA_SLIME', x + 0.5, y, z + 0.5);
        break;
      }
    }
  };

  // ---- 描く ----
  // bt は play.js の描画用の束（v で頂点を足す、L に光の段階）
  Mobs.prototype.draw = function (bt, a, cube) {
    var w = this.game.walker;
    this.list.forEach(function (m) {
      var T = TYPES[m.type], parts = MODELS[m.type];
      var x = m.px + (m.x - m.px) * a, y = m.py + (m.y - m.py) * a, z = m.pz + (m.z - m.pz) * a;
      var yaw = m.pyaw + angleDiff(m.pyaw, m.yaw) * a, walk = m.pwalk + (m.walk - m.pwalk) * a;
      var swing = Math.sin(walk * 1.6) * Math.min(0.7, Math.hypot(m.vx, m.vz) * 12);
      var fuse = m.type === 'BOMBER' ? (m.ai.pfuse + (m.ai.fuse - m.ai.pfuse) * a) / 30 : 0;
      var scale = (T.scale || 1) * (m.size || 1) * (m.baby ? 0.5 : 1) * (1 + fuse * 0.25), flash = fuse > 0 && Math.floor(fuse * 12) % 2 === 0 ? 0.6 : 0;
      var age = m.age + a, flap = Math.sin(age * 1.1) * 0.9, sway = Math.sin(age * 0.25) * 0.35;
      // スライムは跳ぶときに縦に伸び、着地でつぶれる
      var sq = T.sizes ? 1 + Math.max(-0.25, Math.min(0.3, (m.py === m.y ? 0 : m.y - m.py) * 1.5)) : 1;
      var sit = m.type === 'WOLF' && m.sit ? 0.25 : 0;
      var tip = m.dead ? Math.min(1, (m.dead + a) / 20) * Math.PI / 2 : 0;
      var red = m.hurt > 0 || m.dead ? 0.55 : 0, burn = m.fire > 0 ? 0.35 : 0;
      bt.L = w.lightLevels(x, y + mh(m) / 2, z);
      var cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tip), st = Math.sin(tip);
      parts.forEach(function (pt, pi) {
        var c = pt.c;
        // 毛を刈った羊：毛の部分は細く、肌の色
        if (m.sheared && m.type === 'SHEEP') {
          if (pi === 6) return;
          if (pi === 4) { c = [214, 200, 180]; pt = { o: [-4.5, 12, -7], s: [9, 8, 14], c: c, sw: null }; }
        }
        if (pt.tame && !m.tame) return;   // 首輪は飼いならしたオオカミだけ
        if (pt.prof && WG.profColor) c = WG.profColor(m, pt.prof);   // 村人の服は職業の色
        if (pt.sw === 'EYE' && m.angry && !m.tame) c = [200, 40, 30];   // 怒ったオオカミの目
        if (red) c = [c[0] + (220 - c[0]) * red, c[1] * (1 - red), c[2] * (1 - red)];
        if (burn) c = [c[0] + (255 - c[0]) * burn, c[1] + (140 - c[1]) * burn, c[2] * (1 - burn)];
        if (flash) c = [c[0] + (255 - c[0]) * flash, c[1] + (255 - c[1]) * flash, c[2] + (255 - c[2]) * flash];
        var ang = pt.sw === 'L1' ? swing : pt.sw === 'L2' ? -swing : pt.sw === 'A' ? -Math.PI / 2 + swing * 0.15 : pt.sw === 'T1' ? sway : pt.sw === 'T2' ? -sway : 0;
        var wing = pt.sw === 'W1' ? flap : pt.sw === 'W2' ? -flap : 0, wpx = pt.sw === 'W1' ? -1.5 : 1.5;
        var piv = pt.sw === 'A' ? [0, pt.o[1] + pt.s[1] - 2, 0] : [0, pt.o[1] + pt.s[1], pt.o[2] + pt.s[2] / 2];
        cube(bt, pt.o, pt.s, function (lx, ly, lz) {
          // 脚・腕を振る（左右の軸のまわり）
          if (ang) { var yy = ly - piv[1], zz = lz - piv[2]; ly = piv[1] + yy * Math.cos(ang) - zz * Math.sin(ang); lz = piv[2] + yy * Math.sin(ang) + zz * Math.cos(ang); }
          // コウモリの翼は前後の軸のまわりに羽ばたく
          if (wing) { var wx = lx - wpx, wy = ly - 7; lx = wpx + wx * Math.cos(wing) - wy * Math.sin(wing); ly = 7 + wx * Math.sin(wing) + wy * Math.cos(wing); }
          lx *= scale / 16; ly *= scale * sq / 16; lz *= scale / 16;
          if (sit) ly = Math.max(0, ly - sit * (lz < 0 ? 1 : 0.3));
          // 倒れる（横へ）
          if (tip) { var nx = lx * ct - ly * st, ny = lx * st + ly * ct; lx = nx; ly = Math.max(ny, 0) + 0.05; }
          return [x + lx * cy + lz * sy, y + ly, z - lx * sy + lz * cy];
        }, c);
      });
    });
    // 矢
    this.arrows.forEach(function (ar) {
      var x = ar.px + (ar.x - ar.px) * a, y = ar.py + (ar.y - ar.py) * a, z = ar.pz + (ar.z - ar.pz) * a;
      var len = Math.hypot(ar.vx, ar.vy, ar.vz) || 1, dx = ar.vx / len, dy = ar.vy / len, dz = ar.vz / len;
      bt.L = w.lightLevels(x, y, z);
      for (var k = 0; k < 4; k++) {
        var px = x - dx * k * 0.12, py = y - dy * k * 0.12, pz = z - dz * k * 0.12;
        cube(bt, [-0.5, -0.5, -0.5], [1, 1, 1], (function (px, py, pz) { return function (lx, ly, lz) { return [px + lx / 16, py + ly / 16, pz + lz / 16]; }; })(px, py, pz), k === 0 ? [90, 90, 90] : [122, 92, 56]);
      }
    });
  };

  function angleDiff(a, b) { var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }

  WG.Mobs = Mobs;
  WG.MOB_TYPES = TYPES;
  WG.MOB_ORDER = Object.keys(TYPES);
})(typeof window !== 'undefined' ? window : globalThis);
