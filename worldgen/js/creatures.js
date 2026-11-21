// 第 4 回の生き物：動物・敵・ネザーとエンドの生き物・ボス。
// 大きさ・体力・攻撃・ドロップは Minecraft の値に合わせ、見た目は箱を組み合わせた独自の形。
// 本家に固有のキャラクターにあたるものは、ハゼゴケと同じく独自の名前と姿にしている：
//   豚人（ピグリンにあたる）・牙イノシシ（ホグリン）・溶岩渡り（ストライダー）・火の精（ブレイズ）・泣き霊（ガスト）・黒い骸骨（ウィザースケルトン）・
//   影の長足（エンダーマン）・貝の番人（シュルカー）・夜空のエイ（ファントム）・目玉魚（ガーディアン）・深淵の番人（ウォーデン）・
//   果ての竜（エンダードラゴン）・三つ首の骸（ウィザー）。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Mobs = WG.Mobs, TYPES = WG.MOB_TYPES, MODELS = WG.MOB_MODELS;

  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function box(x, y, z, w, h, d, c, sw, extra) { var b = { o: [x, y, z], s: [w, h, d], c: hex(c), sw: sw || null }; if (extra) for (var k in extra) b[k] = extra[k]; return b; }
  var EYE = '#1f1d1c';
  function legs4(x, zf, zb, w, h, c) { return [box(-x, 0, zf, w, h, w, c, 'L1'), box(x - w, 0, zf, w, h, w, c, 'L2'), box(-x, 0, zb, w, h, w, c, 'L2'), box(x - w, 0, zb, w, h, w, c, 'L1')]; }
  // 人の形（脚・胴・腕・頭）。腕を前に出す（A）か下げる（L）
  function humanoid(o) {
    return [box(-4, 0, -2, 4, 12, 4, o.legs, 'L1'), box(0, 0, -2, 4, 12, 4, o.legs, 'L2'), box(-4, 12, -2, 8, 12, 4, o.body),
      box(-8, 12, -2, 4, 12, 4, o.arms || o.body, o.armsUp ? 'A' : 'L2'), box(4, 12, -2, 4, 12, 4, o.arms || o.body, o.armsUp ? 'A' : 'L1'),
      box(-4, 24, -4, 8, 8, 8, o.head), box(-3, 27, 4, 2, 1, 0.3, o.eye || EYE), box(1, 27, 4, 2, 1, 0.3, o.eye || EYE)].concat(o.extra || []);
  }

  // ================= 見た目 =================
  var horse = function (c, mane, small) {
    var k = small ? 0.8 : 1;
    return legs4(5 * k, 6 * k, -9 * k, 4 * k, 12 * k, c).concat([
      box(-5 * k, 11 * k, -11 * k, 10 * k, 10 * k, 22 * k, c), box(-3 * k, 17 * k, 9 * k, 6 * k, 12 * k, 6 * k, c),
      box(-3 * k, 25 * k, 13 * k, 6 * k, 5 * k, 9 * k, c), box(-1 * k, 21 * k, 6 * k, 2 * k, 11 * k, 3 * k, mane),
      box(-2.5 * k, 29 * k, 14 * k, 1.5 * k, (small ? 6 : 3) * k, 1.5 * k, c), box(1 * k, 29 * k, 14 * k, 1.5 * k, (small ? 6 : 3) * k, 1.5 * k, c),
      box(-3.2 * k, 27 * k, 18 * k, 0.4, 1, 1, EYE), box(2.8 * k, 27 * k, 18 * k, 0.4, 1, 1, EYE), box(-1 * k, 12 * k, -14 * k, 2 * k, 8 * k, 3 * k, mane),
      box(-5.3 * k, 20 * k, -4 * k, 10.6 * k, 1.5, 9 * k, '#6a3e22', null, { saddle: true }), box(-5.4 * k, 14 * k, 0, 10.8 * k, 6 * k, 1.2, '#3a2a1e', null, { saddle: true })]);
  };
  MODELS.HORSE = horse('#8a5a32', '#3a2416');
  MODELS.DONKEY = horse('#8a7a6a', '#4a3e34', true);
  MODELS.CAMEL = legs4(5, 7, -10, 4, 20, '#c8a46a').concat([box(-6, 20, -12, 12, 10, 24, '#d0ac72'), box(-4, 30, -6, 8, 5, 8, '#c09a62'), box(-3, 24, 11, 6, 18, 6, '#d0ac72'),
    box(-3, 38, 15, 6, 6, 10, '#d0ac72'), box(-3.2, 41, 22, 0.4, 1, 1, EYE), box(2.8, 41, 22, 0.4, 1, 1, EYE),
    box(-6.3, 34.6, -6, 12.6, 1.5, 12, '#7a3a2a', null, { saddle: true })]);
  MODELS.CAT = legs4(2.5, 3, -5, 2, 6, '#8a8a8a').concat([box(-2, 6, -6, 4, 4, 11, '#9a9a9a', null, { tint: 1 }), box(-2.5, 7, 4, 5, 5, 5, '#9a9a9a', null, { tint: 1 }),
    box(-2.5, 12, 6, 1.5, 1.5, 1, '#8a8a8a'), box(1, 12, 6, 1.5, 1.5, 1, '#8a8a8a'), box(-0.5, 7, -13, 1, 1, 8, '#8a8a8a', null, { tint: 1 }),
    box(-2, 10, 9, 1, 1, 0.3, '#7ac040'), box(1, 10, 9, 1, 1, 0.3, '#7ac040'), box(-0.5, 8.5, 9, 1, 0.8, 0.3, '#d89090')]);
  MODELS.FOX = legs4(2.5, 2, -4, 2, 6, '#c86a2a').concat([box(-3, 6, -6, 6, 5, 11, '#e07a30'), box(-3.5, 6, 4, 7, 6, 5, '#e07a30'), box(-1.5, 6, 9, 3, 2.5, 3, '#f0e8e0'),
    box(-3, 12, 5, 2, 2.5, 1, '#e07a30'), box(1, 12, 5, 2, 2.5, 1, '#e07a30'), box(-1.5, 4, -14, 3, 3, 9, '#e07a30'), box(-1.5, 4, -15, 3, 3, 2, '#f0e8e0'),
    box(-2.5, 9.5, 9, 1, 1, 0.3, EYE), box(1.5, 9.5, 9, 1, 1, 0.3, EYE), box(-0.5, 7, 12.1, 1, 1, 0.3, EYE)]);
  MODELS.GOAT = legs4(3, 4, -6, 2.5, 10, '#d8d4c8').concat([box(-4, 10, -7, 8, 8, 14, '#e8e4d8'), box(-2.5, 15, 6, 5, 6, 6, '#e8e4d8'), box(-1, 12, 10, 2, 3, 1, '#c8c4b8'),
    box(-2.5, 21, 6, 1.2, 4, 1.2, '#8a8070'), box(1.3, 21, 6, 1.2, 4, 1.2, '#8a8070'), box(-2.6, 18, 11.9, 1, 1, 0.3, '#c8a040'), box(1.6, 18, 11.9, 1, 1, 0.3, '#c8a040')]);
  MODELS.TURTLE = legs4(6, 3, -6, 3, 2, '#5a8a4a').concat([box(-7, 1.5, -8, 14, 4, 16, '#3a6a3a'), box(-6, 5.5, -7, 12, 1.5, 14, '#4a7a3a'), box(-2, 2, 8, 4, 3, 5, '#6a9a5a'),
    box(-1.8, 3.5, 12.6, 0.8, 0.8, 0.3, EYE), box(1, 3.5, 12.6, 0.8, 0.8, 0.3, EYE)]);
  MODELS.BEE = [box(-2.5, 2, -3.5, 5, 5, 7, '#f0c030'), box(-2.6, 2, -1, 5.2, 5, 1.5, '#2a2418'), box(-2.6, 2, 1.5, 5.2, 5, 1.2, '#2a2418'),
    box(-0.5, 3.5, -4.5, 1, 1, 1, '#2a2418'), box(-2, 5, 3.5, 1, 1, 0.3, EYE), box(1, 5, 3.5, 1, 1, 0.3, EYE),
    box(-6.5, 6.5, -1, 4.5, 0.4, 3, '#d8eef8', 'W1'), box(2, 6.5, -1, 4.5, 0.4, 3, '#d8eef8', 'W2')];
  MODELS.FISH = [box(-1.5, 1, -4, 3, 3, 8, '#a49476', null, { tint: 1 }), box(-0.3, 1.5, -7, 0.6, 2, 3, '#8a7a5a', 'T1'), box(-0.2, 4, -1, 0.4, 1.5, 3, '#8a7a5a'),
    box(-1.6, 2.6, 2.5, 0.3, 0.6, 0.6, EYE), box(1.3, 2.6, 2.5, 0.3, 0.6, 0.6, EYE)];
  MODELS.PARROT = [box(-0.5, 0, -0.5, 1, 2, 1, '#6a5a4a'), box(-2, 2, -2, 4, 6, 4, '#d83a2a', null, { tint: 1 }), box(-1.5, 8, -1.5, 3, 3, 3, '#d83a2a', null, { tint: 1 }),
    box(-0.5, 8, 1.5, 1, 2, 1.5, '#f0c040'), box(-1.6, 9.5, 1.4, 0.4, 0.6, 0.3, EYE), box(1.2, 9.5, 1.4, 0.4, 0.6, 0.3, EYE),
    box(-2.6, 3, -1.5, 0.6, 5, 3, '#3a6ad8', 'W1'), box(2, 3, -1.5, 0.6, 5, 3, '#3a6ad8', 'W2'), box(-1, 1, -4, 2, 1, 3, '#3a6ad8')];
  MODELS.PANDA = legs4(6, 5, -8, 5, 9, '#202020').concat([box(-7, 9, -10, 14, 12, 20, '#f2f2ee'), box(-7.1, 13, -1, 14.2, 7, 5, '#202020'),
    box(-5, 11, 9, 10, 9, 7, '#f2f2ee'), box(-5, 19, 10, 2.5, 2.5, 1.5, '#202020'), box(2.5, 19, 10, 2.5, 2.5, 1.5, '#202020'),
    box(-4, 14, 15.9, 2.5, 2.5, 0.3, '#202020'), box(1.5, 14, 15.9, 2.5, 2.5, 0.3, '#202020'), box(-1, 12, 16, 2, 1.5, 0.3, '#202020')]);
  MODELS.POLAR_BEAR = legs4(5, 5, -8, 4, 10, '#e8e8e2').concat([box(-6, 9, -11, 12, 11, 22, '#f2f2ec'), box(-4, 10, 10, 8, 8, 7, '#f2f2ec'),
    box(-4, 18, 11, 2, 2, 1, '#e0e0d8'), box(2, 18, 11, 2, 2, 1, '#e0e0d8'), box(-1.5, 11, 17, 3, 2, 2, '#2a2a2a'), box(-2.5, 15, 16.9, 1, 1, 0.3, EYE), box(1.5, 15, 16.9, 1, 1, 0.3, EYE)]);
  MODELS.DROWNED = humanoid({ legs: '#3a6a6a', body: '#5a8a8a', arms: '#6aa8a0', head: '#6aa8a0', armsUp: true, eye: '#c8f0f0' });
  MODELS.HUSK = humanoid({ legs: '#6a5a40', body: '#8a7650', arms: '#b09a6a', head: '#b09a6a', armsUp: true });
  MODELS.PILLAGER = humanoid({ legs: '#3a3a40', body: '#4a4a52', arms: '#8a7a6a', head: '#a89a8a', extra: [box(-1, 26, 4, 2, 3, 2, '#988a7a'), box(-4, 30, -4, 8, 2, 8, '#2a2a30'), box(5, 14, 5, 1, 1, 8, '#6a4a2a')] });
  MODELS.PIGLIN = humanoid({ legs: '#5a3a24', body: '#7a5a32', arms: '#e0a090', head: '#e8a898', extra: [box(-2.5, 25, 4, 5, 3, 2, '#d88878'), box(-5, 28, -1, 1, 3, 3, '#d88878'), box(4, 28, -1, 1, 3, 3, '#d88878'),
    box(-4.1, 18, -2.1, 8.2, 1, 4.2, '#e8c040'), box(5, 12, 2, 1, 1, 8, '#e8c040')] });
  MODELS.HOGLIN = legs4(6, 6, -10, 5, 12, '#7a4a3a').concat([box(-7, 11, -12, 14, 13, 24, '#9a6a4a'), box(-1, 24, -8, 2, 4, 16, '#c8a070'), box(-5, 10, 12, 10, 10, 9, '#9a6a4a'),
    box(-6, 12, 18, 2, 6, 2, '#f0e8d0'), box(4, 12, 18, 2, 6, 2, '#f0e8d0'), box(-4, 17, 20.9, 1, 1, 0.3, EYE), box(3, 17, 20.9, 1, 1, 0.3, EYE)]);
  MODELS.STRIDER = [box(-3, 0, -1.5, 3, 16, 3, '#8a3a32', 'L1'), box(0, 0, -1.5, 3, 16, 3, '#8a3a32', 'L2'), box(-8, 16, -8, 16, 14, 16, '#b04a3a'),
    box(-8.2, 26, -8.2, 16.4, 1, 16.4, '#d06a4a'), box(-5, 22, 8, 3, 2, 0.3, EYE), box(2, 22, 8, 3, 2, 0.3, EYE),
    box(-6.3, 30, -4, 12.6, 1.5, 8, '#6a3e22', null, { saddle: true })];
  MODELS.FIRE_SPIRIT = [box(-4, 10, -4, 8, 8, 8, '#f0c040'), box(-3, 13, 4, 2, 1, 0.3, '#6a2a0a'), box(1, 13, 4, 2, 1, 0.3, '#6a2a0a')].concat(
    [0, 1, 2, 3, 4, 5].map(function (i) { var a = i / 6 * Math.PI * 2; return box(Math.cos(a) * 6 - 1, i % 2 ? 2 : 6, Math.sin(a) * 6 - 1, 2, 8, 2, i % 2 ? '#e8901a' : '#ffb030', i % 2 ? 'T1' : 'T2'); }));
  MODELS.WAILER = [box(-8, 8, -8, 16, 16, 16, '#eceae6'), box(-5, 15, 8, 3, 2, 0.3, '#3a3a3a'), box(2, 15, 8, 3, 2, 0.3, '#3a3a3a'), box(-2, 11, 8, 4, 1.5, 0.3, '#3a3a3a'),
    box(-3, 12, 8.05, 1, 3, 0.3, '#b8d8e8'), box(4, 12, 8.05, 1, 3, 0.3, '#b8d8e8')].concat(
    [[-6, -6], [-1, -6], [4, -6], [-6, -1], [4, -1], [-6, 4], [-1, 4], [4, 4], [-1, -1]].map(function (p, i) { return box(p[0], 0, p[1], 2, 8, 2, '#dcdad6', i % 2 ? 'T1' : 'T2'); }));
  MODELS.DARK_SKELETON = [box(-3, 0, -1, 2, 14, 2, '#2a2a2c', 'L1'), box(1, 0, -1, 2, 14, 2, '#2a2a2c', 'L2'), box(-4, 14, -1, 8, 13, 2, '#262628'),
    box(-6, 14, -1, 2, 13, 2, '#2a2a2c', 'A'), box(4, 14, -1, 2, 13, 2, '#2a2a2c', 'A'), box(4.5, 18, 6, 1, 1, 10, '#6a6a70'),
    box(-4, 27, -4, 8, 8, 8, '#303032'), box(-3, 30, 4, 2, 2, 0.3, '#c82a2a'), box(1, 30, 4, 2, 2, 0.3, '#c82a2a')];
  MODELS.SHADOW = [box(-2, 0, -1, 2, 30, 2, '#141414', 'L1'), box(0, 0, -1, 2, 30, 2, '#141414', 'L2'), box(-4, 30, -2, 8, 12, 4, '#181818'),
    box(-6, 13, -1, 2, 29, 2, '#141414', 'L2'), box(4, 13, -1, 2, 29, 2, '#141414', 'L1'), box(-4, 42, -4, 8, 8, 8, '#1c1c1c'),
    box(-3, 45, 4, 2.5, 1, 0.3, '#c060e8', 'EYE'), box(0.5, 45, 4, 2.5, 1, 0.3, '#c060e8', 'EYE')];
  MODELS.SHELL_GUARD = [box(-8, 0, -8, 16, 8, 16, '#8a6a9a'), box(-8, 8, -8, 16, 8, 16, '#9a7aaa', 'LID'), box(-3, 6, -3, 6, 6, 6, '#e8e0a0'),
    box(-1.5, 9, 3, 1, 1, 0.3, EYE), box(0.5, 9, 3, 1, 1, 0.3, EYE)];
  MODELS.NIGHT_RAY = [box(-4, 0, -6, 8, 2, 12, '#3a4a7a'), box(-2, 1, 6, 4, 2, 4, '#3a4a7a'), box(-12, 0.5, -3, 8, 1, 6, '#4a5a8a', 'W1'), box(4, 0.5, -3, 8, 1, 6, '#4a5a8a', 'W2'),
    box(-0.5, 0.5, -12, 1, 1, 6, '#3a4a7a', 'T1'), box(-1.5, 2.5, 9.9, 1, 0.6, 0.3, '#80f080'), box(0.5, 2.5, 9.9, 1, 0.6, 0.3, '#80f080')];
  MODELS.EYE_FISH = [box(-6, 0, -6, 12, 12, 12, '#5a9a8a'), box(-3, 3, 6, 6, 6, 0.4, '#f0f0e0'), box(-1, 5, 6.3, 2, 2, 0.3, '#2a2a20', 'EYE'),
    box(-1, 12, -1, 2, 3, 2, '#e8a050'), box(-1, -3, -1, 2, 3, 2, '#e8a050'), box(6, 5, -1, 3, 2, 2, '#e8a050'), box(-9, 5, -1, 3, 2, 2, '#e8a050'),
    box(-1, 4, -10, 2, 4, 4, '#4a8a7a', 'T1'), box(-1, 4, -14, 2, 3, 4, '#e8a050', 'T2')];
  MODELS.DEEP_WARDEN = [box(-6, 0, -3, 5, 13, 6, '#1a3038', 'L1'), box(1, 0, -3, 5, 13, 6, '#1a3038', 'L2'), box(-9, 13, -5, 18, 21, 10, '#203840'),
    box(-13, 6, -3, 4, 26, 6, '#1a3038', 'L2'), box(9, 6, -3, 4, 26, 6, '#1a3038', 'L1'), box(-8, 34, -6, 16, 14, 12, '#203840'),
    box(-10, 42, -1, 2, 6, 2, '#40d0d0'), box(8, 42, -1, 2, 6, 2, '#40d0d0'), box(-6, 18, 5.1, 12, 10, 0.3, '#2a6a70'), box(-3, 21, 5.2, 6, 4, 0.3, '#60f0f0', 'EYE')];
  MODELS.END_DRAGON = [box(-6, 8, -16, 12, 10, 26, '#1c1c22'), box(-3, 12, 10, 6, 6, 14, '#1c1c22'), box(-5, 10, 24, 10, 9, 12, '#202028'),
    box(-4, 18, 26, 2, 4, 3, '#2a2a32'), box(2, 18, 26, 2, 4, 3, '#2a2a32'), box(-4, 15, 35.9, 2.5, 1.5, 0.3, '#c060f0'), box(1.5, 15, 35.9, 2.5, 1.5, 0.3, '#c060f0'),
    box(-2, 10, -36, 4, 4, 20, '#1c1c22', 'T1'), box(-1.5, 11, -50, 3, 3, 14, '#1c1c22', 'T2'), box(-1, 18, -14, 2, 3, 22, '#2a2a34'),
    box(-34, 15, -12, 28, 1.5, 22, '#26262e', 'W1'), box(6, 15, -12, 28, 1.5, 22, '#26262e', 'W2'),
    box(-5, 0, 0, 3, 8, 3, '#1c1c22', 'L1'), box(2, 0, 0, 3, 8, 3, '#1c1c22', 'L2'), box(-5, 0, -12, 3, 8, 3, '#1c1c22', 'L2'), box(2, 0, -12, 3, 8, 3, '#1c1c22', 'L1')];
  MODELS.SKULL_BOSS = [box(-10, 10, -2, 20, 3, 4, '#202022'), box(-1.5, 0, -1.5, 3, 12, 3, '#202022'), box(-5, 2, -1, 10, 2, 2, '#2a2a2c'), box(-5, 6, -1, 10, 2, 2, '#2a2a2c'),
    box(-4, 13, -4, 8, 8, 8, '#262628'), box(-12, 11, -3, 6, 6, 6, '#262628'), box(6, 11, -3, 6, 6, 6, '#262628'),
    box(-3, 16, 4, 2, 2, 0.3, '#e0e0f0', 'EYE'), box(1, 16, 4, 2, 2, 0.3, '#e0e0f0', 'EYE'), box(-11, 14, 3, 1.5, 1.5, 0.3, '#e0e0f0', 'EYE'), box(-8, 14, 3, 1.5, 1.5, 0.3, '#e0e0f0', 'EYE'),
    box(7, 14, 3, 1.5, 1.5, 0.3, '#e0e0f0', 'EYE'), box(10, 14, 3, 1.5, 1.5, 0.3, '#e0e0f0', 'EYE')];

  // ================= 種類 =================
  // ai: melee（近づいて叩く）・ranged（離れて撃つ）・flier（飛ぶ）・swimmer（泳ぐ）。dmg は叩く強さ、shot は撃つもの
  function T(k, o) { TYPES[k] = Object.assign({ food: [], drops: [] }, o); }
  T('HORSE', { name: '馬', w: 1.4, h: 1.6, hp: 22, speed: 0.07, food: ['WHEAT', 'APPLE', 'GOLDEN_CARROT'], breed: ['GOLDEN_CARROT', 'GOLDEN_APPLE'], breeds: true, rideable: true, tameRide: true, seat: 1.35, drops: [['LEATHER', 0, 2]] });
  T('DONKEY', { name: 'ロバ', w: 1.4, h: 1.5, hp: 20, speed: 0.06, food: ['WHEAT', 'APPLE', 'GOLDEN_CARROT'], breed: ['GOLDEN_CARROT', 'GOLDEN_APPLE'], breeds: true, rideable: true, tameRide: true, seat: 1.15, rideSpeed: 0.2, drops: [['LEATHER', 0, 2]] });
  T('CAMEL', { name: 'ラクダ', w: 1.7, h: 2.375, hp: 32, speed: 0.05, food: ['CACTUS'], breed: ['CACTUS'], breeds: true, rideable: true, seat: 2.3, rideSpeed: 0.18 });
  T('CAT', { name: '猫', w: 0.6, h: 0.7, hp: 10, speed: 0.09, food: ['COD', 'SALMON'], breed: ['COD', 'SALMON'], breeds: true, tameWith: ['COD', 'SALMON'], drops: [['STRING', 0, 2]] });
  T('FOX', { name: 'キツネ', w: 0.6, h: 0.7, hp: 10, speed: 0.09, food: [], hunts: ['CHICKEN', 'RABBIT'] });
  T('GOAT', { name: 'ヤギ', w: 0.9, h: 1.3, hp: 10, speed: 0.07, food: ['WHEAT'], breed: ['WHEAT'], breeds: true, rams: true, noFall: true });
  T('TURTLE', { name: 'カメ', w: 1.2, h: 0.4, hp: 30, speed: 0.025, food: [], swimOk: true });
  T('BEE', { name: 'ミツバチ', w: 0.7, h: 0.6, hp: 10, speed: 0.06, food: ['DANDELION', 'POPPY'], breed: ['DANDELION', 'POPPY'], breeds: true, flies: true, noFall: true, bee: true });
  T('FISH', { name: '魚', w: 0.5, h: 0.3, hp: 3, speed: 0.05, swims: true, despawn: true, fish: true, drops: [['COD', 1, 1]] });
  T('PARROT', { name: 'オウム', w: 0.5, h: 0.9, hp: 6, speed: 0.06, food: ['WHEAT_SEEDS'], tameWith: ['WHEAT_SEEDS'], flies: true, noFall: true, drops: [['FEATHER', 1, 2]] });
  T('PANDA', { name: 'パンダ', w: 1.3, h: 1.25, hp: 20, speed: 0.04, neutral: true, dmg: 6 });
  T('POLAR_BEAR', { name: 'シロクマ', w: 1.4, h: 1.4, hp: 30, speed: 0.06, neutral: true, dmg: 6, drops: [['COD', 0, 2], ['SALMON', 0, 2]] });
  T('DROWNED', { name: '溺れたゾンビ', w: 0.6, h: 1.95, hp: 20, speed: 0.08, hostile: true, range: 35, burns: true, ai: 'melee', dmg: 3, swimOk: true, drops: [['ROTTEN_FLESH', 0, 2]], rare: ['COPPER_INGOT', 'TRIDENT'], rareP: 0.06 });
  T('HUSK', { name: '砂漠のゾンビ', w: 0.6, h: 1.95, hp: 20, speed: 0.09, hostile: true, range: 35, ai: 'melee', dmg: 3, onHit: 'HUNGER', drops: [['ROTTEN_FLESH', 0, 2]], rare: ['IRON_INGOT', 'CARROT', 'POTATO'] });
  T('PILLAGER', { name: '略奪者', w: 0.6, h: 1.95, hp: 24, speed: 0.08, hostile: true, range: 32, ai: 'ranged', shot: 'bolt', cd: 50, keep: [6, 12], drops: [['ARROW', 0, 2]], rare: ['CROSSBOW'], rareP: 0.085 });
  T('NIGHT_RAY', { name: '夜空のエイ', w: 0.9, h: 0.5, hp: 20, speed: 0.12, hostile: true, range: 64, flies: true, noFall: true, burns: true, ai: 'swoop', dmg: 2, drops: [['PHANTOM_MEMBRANE', 0, 1]] });
  T('EYE_FISH', { name: '目玉魚', w: 0.85, h: 0.85, hp: 30, speed: 0.05, hostile: true, range: 16, swims: true, ai: 'laser', thorns: 2, drops: [['PRISMARINE_SHARD', 0, 2], ['COD', 0, 1]] });
  T('DEEP_WARDEN', { name: '深淵の番人', w: 0.9, h: 2.9, hp: 500, speed: 0.07, hostile: true, range: 16, ai: 'warden', dmg: 30, boss: true, noFall: true, drops: [] });
  T('PIGLIN', { name: '豚人', w: 0.6, h: 1.95, hp: 16, speed: 0.08, hostile: true, range: 16, ai: 'melee', dmg: 5, fireproof: true, goldFriend: true, drops: [['GOLD_NUGGET', 0, 2]], rare: ['GOLDEN_SWORD'], rareP: 0.085 });
  T('HOGLIN', { name: '牙イノシシ', w: 1.4, h: 1.4, hp: 40, speed: 0.07, hostile: true, range: 16, ai: 'melee', dmg: 6, toss: 0.6, fireproof: true, drops: [['RAW_PORKCHOP', 2, 4], ['LEATHER', 0, 1]] });
  T('STRIDER', { name: '溶岩渡り', w: 0.9, h: 1.7, hp: 20, speed: 0.05, fireproof: true, lavaWalk: true, rideable: true, seat: 1.9, rideSpeed: 0.12, drops: [['STRING', 2, 5]] });
  T('FIRE_SPIRIT', { name: '火の精', w: 0.6, h: 1.8, hp: 20, speed: 0.05, hostile: true, range: 48, flies: true, noFall: true, fireproof: true, ai: 'ranged', shot: 'smallfire', cd: 100, burst: 3, keep: [4, 10], drops: [['BLAZE_ROD', 0, 1]] });
  T('WAILER', { name: '泣き霊', w: 4, h: 4, hp: 10, speed: 0.04, hostile: true, range: 64, flies: true, noFall: true, fireproof: true, ai: 'ranged', shot: 'fireball', cd: 60, keep: [16, 40], scale: 4, drops: [['GHAST_TEAR', 0, 1], ['GUNPOWDER', 0, 2]] });
  T('DARK_SKELETON', { name: '黒い骸骨', w: 0.7, h: 2.4, hp: 20, speed: 0.09, hostile: true, range: 16, ai: 'melee', dmg: 8, onHit: 'WITHER', fireproof: true, drops: [['COAL', 0, 1], ['BONE', 0, 2]], rare: ['DARK_SKULL'], rareP: 0.05 });
  T('SHADOW', { name: '影の長足', w: 0.6, h: 2.9, hp: 40, speed: 0.1, hostile: true, range: 64, ai: 'shadow', dmg: 7, neutralLook: true, drops: [['SHADOW_PEARL', 0, 1]] });
  T('SHELL_GUARD', { name: '貝の番人', w: 1, h: 1, hp: 30, speed: 0, hostile: true, range: 16, ai: 'ranged', shot: 'bullet', cd: 60, still: true, noFall: true, drops: [['SHELL', 0, 1]] });
  T('END_DRAGON', { name: '果ての竜', w: 6, h: 3, hp: 200, speed: 0.4, hostile: true, range: 160, flies: true, noFall: true, noclip: true, fireproof: true, boss: true, ai: 'dragon', dmg: 10, scale: 3, drops: [] });
  T('SKULL_BOSS', { name: '三つ首の骸', w: 0.9, h: 3.5, hp: 300, speed: 0.06, hostile: true, range: 48, flies: true, noFall: true, fireproof: true, boss: true, ai: 'ranged', shot: 'skull', cd: 20, keep: [6, 14], scale: 1.8, drops: [['NETHER_STAR', 1, 1]] });
  var NEW = ['HORSE', 'DONKEY', 'CAMEL', 'CAT', 'FOX', 'GOAT', 'TURTLE', 'BEE', 'FISH', 'PARROT', 'PANDA', 'POLAR_BEAR', 'DROWNED', 'HUSK', 'PILLAGER', 'NIGHT_RAY', 'EYE_FISH', 'DEEP_WARDEN',
    'PIGLIN', 'HOGLIN', 'STRIDER', 'FIRE_SPIRIT', 'WAILER', 'DARK_SKELETON', 'SHADOW', 'SHELL_GUARD', 'END_DRAGON', 'SKULL_BOSS'];
  var NEWSET = {};
  NEW.forEach(function (k) { WG.MOB_ORDER.push(k); NEWSET[k] = 1; });
  WG.BOSS_TYPES = { END_DRAGON: 1, SKULL_BOSS: 1, DEEP_WARDEN: 1 };
  if (WG.ADVANCEMENTS) WG.ADVANCEMENTS.push(['dragon', '果ての勝者', '果ての竜を倒す', 'dragon'], ['ride', '乗りこなす', '馬をなつける', function (g) { return g.riding && g.riding.type === 'HORSE' && g.riding.tame; }]);

  // ================= アイテム・ブロック・効果 =================
  function item(key, name, max, extra) { var it = { key: key, name: name, block: -1, max: max || 64, shape: 'lump', color: '#888888' }; for (var k in extra || {}) it[k] = extra[k]; ITEMS[key] = it; return it; }
  NEW.forEach(function (k) { item('SPAWN_EGG_' + k, TYPES[k].name + 'のスポーンエッグ', 64, { egg: k }); });
  item('HONEY_BOTTLE', 'はちみつ入りの瓶', 16, { food: 6, sat: 0.1, leaves: 'GLASS_BOTTLE', curesPoison: true }); item('HONEYCOMB', 'ハチの巣のかけら');
  item('PHANTOM_MEMBRANE', '薄膜'); item('PRISMARINE_SHARD', '海晶のかけら'); item('SHADOW_PEARL', '影の真珠', 16, { pearl: true });
  ITEMS.DARK_SKULL.name = '黒い頭蓋骨';
  Craft.SHAPED.push([['CCC', 'CCC', 'CCC'], { C: 'HONEYCOMB' }, 'BEEHIVE', 1]);
  WG.EFFECTS.WITHER = ['衰弱（黒い毒）', '#3a2a2a']; WG.EFFECTS.LEVITATION = ['浮遊', '#cec4e8']; WG.EFFECTS.HUNGER = ['空腹', '#587653'];
  // 羊毛の色
  var WOOL = {}; WG.COLORS16.forEach(function (c) { WOOL[c[0]] = hex(c[2]); });
  WG.woolRGB = function (name) { var c = WOOL[name] || WOOL.WHITE; return [Math.min(255, c[0] * 1.05 + 8), Math.min(255, c[1] * 1.05 + 8), Math.min(255, c[2] * 1.05 + 8)]; };

  // ================= 生まれるとき =================
  var spawn = Mobs.prototype.spawn;
  Mobs.prototype.spawn = function (type, x, y, z, size) {
    var wd = this.world, bio = null;
    if (wd.dimKey === 'overworld' && wd.biomeAt) bio = WG.BIOMES[wd.biomeAt(Math.floor(x), Math.floor(z))].key;
    // 砂漠の地上のゾンビは砂漠のゾンビに
    if (type === 'ZOMBIE' && bio === 'desert' && y > 60) type = 'HUSK';
    var m = spawn.call(this, type, x, y, z, size), r = Math.random();
    if (type === 'SHEEP') m.color = r < 0.8168 ? null : r < 0.8668 ? 'LIGHT_GRAY' : r < 0.9168 ? 'GRAY' : r < 0.9668 ? 'BLACK' : r < 0.9968 ? 'BROWN' : 'PINK';
    if (type === 'HORSE') { m.hp = m.maxHp = 15 + Math.floor(Math.random() * 16); m.rideK = 0.22 + Math.random() * 0.12; m.tint = [[138, 90, 50], [90, 60, 36], [200, 190, 170], [60, 50, 44], [160, 110, 60]][Math.floor(Math.random() * 5)]; }
    if (type === 'CAT') m.tint = [[154, 154, 154], [220, 150, 70], [50, 50, 54], [240, 240, 236], [150, 110, 80]][Math.floor(Math.random() * 5)];
    if (type === 'PARROT') m.tint = [[216, 58, 42], [58, 106, 216], [90, 200, 80], [240, 220, 80], [150, 150, 160]][Math.floor(Math.random() * 5)];
    if (type === 'FISH') { var f = [['COD', [164, 148, 118]], ['SALMON', [196, 84, 58]], ['TROPICAL_FISH', [244, 140, 28]]][Math.floor(Math.random() * 3)]; m.fishKey = f[0]; m.tint = f[1]; }
    if (type === 'DROWNED' && Math.random() < 0.15) m.trident = true;
    return m;
  };
  // 魚は種類に合わせて落とす
  var die = Mobs.prototype.die;
  Mobs.prototype.die = function (m) {
    var g = this.game;
    if (m.type === 'FISH' && m.fishKey) { g.spawnItem(m.fishKey, 1, m.x, m.y + 0.2, m.z, 0.1, 10); m.type = 'FISH'; TYPES.FISH.drops = []; die.call(this, m); TYPES.FISH.drops = [['COD', 1, 1]]; return; }
    if (m.type === 'END_DRAGON') this.dragonDied(m);
    if (m.type === 'SKULL_BOSS' || m.type === 'DEEP_WARDEN') { if (g.spawnOrbs) g.spawnOrbs(m.x, m.y + 1, m.z, 50); }
    return die.call(this, m);
  };

  // ================= 動き =================
  function sees(self, m, T2) { return self.sees(m, T2); }
  function playerTarget(self, m, T2, dist, dy) {
    var g = self.game;
    if (g.mode !== 'survival' || g.dead || dist > T2.range || Math.abs(dy) > 24) return false;
    if (T2.goldFriend && !m.angry && (g.armor || []).some(function (s) { return s && /^GOLDEN_/.test(s.key); })) return false;   // 金の防具を着ていれば豚人は襲わない
    if (T2.neutralLook && !m.angry) return false;
    if (T2.ai === 'dragon') return true;
    return sees(self, m, T2);
  }
  // 撃つもの：火の玉（爆発）・小さな火の玉（火）・黒い頭蓋骨（爆発と衰弱）・貝の弾（浮遊、追いかける）・矢（クロスボウ）
  Mobs.prototype.fireShot = function (m, kind) {
    var g = this.game, w = g.walker, e = w.pos, T2 = TYPES[m.type], h = T2.h * (T2.scale || 1);
    this.fired = (this.fired || 0) + 1;
    var sx = m.x, sy = m.y + h * 0.7, sz = m.z, tx = e[0] - sx, ty = e[1] + 1 - sy, tz = e[2] - sz, d = Math.hypot(tx, ty, tz) || 1;
    if (kind === 'bolt') { var a = this.arrows; this.shoot(m, T2); if (a.length) { var ar = a[a.length - 1]; ar.vx *= 1.3; ar.vy *= 1.3; ar.vz *= 1.3; } return; }
    var sp = kind === 'fireball' ? 0.5 : kind === 'bullet' ? 0.25 : kind === 'skull' ? 0.6 : 0.6;
    var spread = kind === 'smallfire' ? 0.08 : 0.02;
    (this.shots || (this.shots = [])).push({ kind: kind, x: sx + tx / d, y: sy + ty / d, z: sz + tz / d, px: sx, py: sy, pz: sz,
      vx: tx / d * sp + (Math.random() - 0.5) * spread, vy: ty / d * sp + (Math.random() - 0.5) * spread, vz: tz / d * sp + (Math.random() - 0.5) * spread, life: 0, owner: m });
    if (WG.Sound) WG.Sound.play(kind === 'bullet' ? 'pop' : 'ignite', sx, sy, sz);
  };
  Mobs.prototype.tickShots = function () {
    var g = this.game, wd = this.world, w = g.walker, keep = [], self = this;
    (this.shots || []).forEach(function (s) {
      s.px = s.x; s.py = s.y; s.pz = s.z; s.life++;
      if (s.kind === 'bullet' && !g.dead) {   // 貝の弾はゆっくり追いかける
        var dx = w.pos[0] - s.x, dy = w.pos[1] + 1 - s.y, dz = w.pos[2] - s.z, d = Math.hypot(dx, dy, dz) || 1;
        s.vx += (dx / d * 0.25 - s.vx) * 0.08; s.vy += (dy / d * 0.25 - s.vy) * 0.08; s.vz += (dz / d * 0.25 - s.vz) * 0.08;
      }
      s.x += s.vx; s.y += s.vy; s.z += s.vz;
      if (s.kind === 'fireball' || s.kind === 'smallfire') g.particles.push({ x: s.x, y: s.y, z: s.z, vx: 0, vy: 0.02, vz: 0, life: 6, c: [90, 80, 76], smoke: true });
      var pb = w.box(), hitP = !g.dead && s.x > pb[0] - 0.3 && s.x < pb[3] + 0.3 && s.y > pb[1] - 0.3 && s.y < pb[4] + 0.3 && s.z > pb[2] - 0.3 && s.z < pb[5] + 0.3;
      var hitB = WG.COLLIDE[wd.block(Math.floor(s.x), Math.floor(s.y), Math.floor(s.z))] >= 1;
      if (!hitP && !hitB && s.life < 200) { keep.push(s); return; }
      if (s.kind === 'fireball') g.explode(s.x, s.y, s.z, 1);
      else if (s.kind === 'skull') { g.explode(s.x, s.y, s.z, 1); if (hitP) g.addEffect('WITHER', 200, 1); }
      else if (s.kind === 'smallfire') { if (hitP) { g.hurtPlayer(5, s.x - s.vx, s.z - s.vz, 'projectile'); if (!(g.effects && g.effects.FIRE_RESISTANCE)) g.burnT = Math.max(g.burnT || 0, 100); } else if (wd.block(Math.floor(s.px), Math.floor(s.py), Math.floor(s.pz)) === B.AIR && g.setFire) g.setFire(Math.floor(s.px), Math.floor(s.py), Math.floor(s.pz), true, 0); }
      else if (s.kind === 'bullet' && hitP) { g.hurtPlayer(4, s.x - s.vx, s.z - s.vz, 'projectile'); g.addEffect('LEVITATION', 200, 0); }
    });
    this.shots = keep;
  };
  var tick = Mobs.prototype.tick;
  Mobs.prototype.tick = function () { tick.call(this); this.tickShots(); };

  // 飛ぶ生き物を目標へ向ける（ふわっと）
  function flyTo(m, tx, ty, tz, sp, k) { var dx = tx - m.x, dy = ty - m.y, dz = tz - m.z, d = Math.hypot(dx, dy, dz) || 1; m.vx += (dx / d * sp - m.vx) * k; m.vy += (dy / d * sp - m.vy) * k; m.vz += (dz / d * sp - m.vz) * k; m.yaw = Math.atan2(m.vx, m.vz); }
  function ground(wd, x, z, y0, span) { span = span || 40; for (var y = Math.floor(y0); y > y0 - span; y--) if (WG.COLLIDE[wd.block(Math.floor(x), y, Math.floor(z))] >= 1) return y + 1; return y0 - span; }

  var special = Mobs.prototype.special;
  Mobs.prototype.special = function (m, T2, dist, dx, dy, dz) {
    var g = this.game, w = g.walker, ai = m.ai, wd = this.world, self = this, p = w.pos;
    if (ai.cd > 0 && NEWSET[m.type]) ai.cd--;
    // ---- 乗れる動物：飼いならす・乗って走る ----
    if (T2.rideable && m.rider && g.riding === m) {
      if (T2.tameRide && !m.tame) {
        // 乗って暴れるのを、何度か乗るとなつく（4 回に 1 回）
        ai.buck = (ai.buck || 0) + 1;
        m.vx += (Math.random() - 0.5) * 0.08; m.vz += (Math.random() - 0.5) * 0.08; m.yaw += (Math.random() - 0.5) * 0.4;
        if (ai.buck > 40) { ai.buck = 0; if (Math.random() < 0.25) { m.tame = true; g.puff(m.x, m.y + 1.5, m.z, [220, 60, 70], 10); } else { g.dismount(); m.vy = 0.3; g.puff(m.x, m.y + 1.5, m.z, [90, 90, 90], 6); } }
        return 'done';
      }
      if (!m.saddled) return 'done';
      var c = m.ctrl || {}, fx = -Math.sin(w.yaw), fz = -Math.cos(w.yaw), rx = Math.cos(w.yaw), rz = -Math.sin(w.yaw);
      var spd = m.rideK || T2.rideSpeed || 0.26, mx = fx * (c.f || 0) + rx * (c.s || 0) * 0.5, mz = fz * (c.f || 0) + rz * (c.s || 0) * 0.5, ml = Math.hypot(mx, mz);
      if (ml > 0) { m.vx += (mx / ml * spd - m.vx) * (m.ground ? 0.4 : 0.1); m.vz += (mz / ml * spd - m.vz) * (m.ground ? 0.4 : 0.1); m.yaw = Math.atan2(mx, mz); }
      if (w.keys.Space && m.ground && m.type !== 'STRIDER') m.vy = m.type === 'CAMEL' ? 0.42 : 0.65;
      if (m.collided && m.ground && ml > 0) m.vy = Math.max(m.vy, 0.42);
      return 'done';
    }
    // ---- 猫・オウム：なついたら主人について行く（右クリックで座る） ----
    if ((m.type === 'CAT' || m.type === 'PARROT') && m.tame) {
      if (m.sit) return 'done';
      if (dist > 14) { m.x = m.px = p[0] + (Math.random() - 0.5) * 2; m.y = m.py = p[1] + (T2.flies ? 1.5 : 0); m.z = m.pz = p[2] + (Math.random() - 0.5) * 2; return 'done'; }
      if (T2.flies) { if (dist > 3) flyTo(m, p[0], p[1] + 1.8, p[2], 0.15, 0.1); else { m.vx *= 0.8; m.vz *= 0.8; m.vy *= 0.8; } return 'done'; }
      if (dist > 5) return { want: [p[0], p[2]], speed: T2.speed * 1.4, chase: true };
    }
    // ---- 飛ぶ動物（ミツバチ・オウム）：ふわふわ。怒ったハチは刺しに来る ----
    if (m.type === 'BEE' || m.type === 'PARROT') {
      if (m.type === 'BEE' && m.angry && !m.stung && g.mode === 'survival' && dist < 20) {
        flyTo(m, p[0], p[1] + 1, p[2], 0.15, 0.15);
        if (dist < 1.2 && Math.abs(dy + 1) < 1.5 && ai.cd === 0) { g.hurtPlayer(2, m.x, m.z); g.addEffect('POISON', 200, 0); m.stung = true; ai.cd = 20; }
        return 'done';
      }
      if (m.stung && Math.random() < 0.004) { m.hp = 0; m.dead = 1; }
      if (ai.timer-- <= 0 || ai.tx == null) { var hv = m.home ? m.home : [m.x, m.y, m.z]; ai.tx = hv[0] + (Math.random() - 0.5) * 10; ai.tz = hv[2] + (Math.random() - 0.5) * 10; ai.ty = ground(wd, ai.tx, ai.tz, m.y + 6) + 1 + Math.random() * 3; ai.timer = 40 + Math.floor(Math.random() * 60); }
      flyTo(m, ai.tx, ai.ty, ai.tz, 0.08, 0.06);
      return 'done';
    }
    // ---- 魚：群れで泳ぐ（先頭について行く）----
    if (T2.fish) {
      if (!WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y + 0.2), Math.floor(m.z)))) { if (m.ground && Math.random() < 0.1) m.vy = 0.25; if (m.age % 20 === 0) self.hurt(m, 1, null); return 'done'; }
      var lead = m.lead && !m.lead.dead ? m.lead : null;
      if (ai.timer-- <= 0 || m.collided) { var a2 = Math.random() * Math.PI * 2; ai.sv = [Math.cos(a2) * 0.06, (Math.random() - 0.5) * 0.02, Math.sin(a2) * 0.06]; ai.timer = 30 + Math.floor(Math.random() * 50); }
      if (lead && Math.hypot(lead.x - m.x, lead.z - m.z) > 1.5) flyTo(m, lead.x, lead.y, lead.z, 0.08, 0.1);
      else if (ai.sv) { m.vx += (ai.sv[0] - m.vx) * 0.1; m.vy += (ai.sv[1] - m.vy) * 0.1; m.vz += (ai.sv[2] - m.vz) * 0.1; m.yaw = Math.atan2(m.vx, m.vz); }
      if (dist < 4 && g.mode === 'survival') { m.vx -= dx / (dist || 1) * 0.02; m.vz -= dz / (dist || 1) * 0.02; }
      return 'done';
    }
    // ---- キツネ：夜は鶏とウサギを狩る ----
    if (T2.hunts && g.sky && g.sky() && g.sky().dark > 4) {
      var prey = null, pd = 12;
      this.list.forEach(function (o) { if (!o.dead && T2.hunts.indexOf(o.type) >= 0) { var d = Math.hypot(o.x - m.x, o.z - m.z); if (d < pd) { pd = d; prey = o; } } });
      if (prey) { if (pd < 1 && ai.cd === 0) { self.hurt(prey, 2, [m.x, m.z]); ai.cd = 20; } return { want: [prey.x, prey.z], speed: T2.speed * 1.3, chase: true }; }
    }
    // ---- ヤギ：ときどき頭突き ----
    if (T2.rams && g.mode === 'survival' && dist > 3 && dist < 9 && Math.random() < 0.002 && !m.baby) ai.ram = 60;
    if (ai.ram > 0) {
      ai.ram--;
      if (dist < 1.3 && Math.abs(dy) < 1.5) { g.hurtPlayer(2, m.x, m.z); w.vel[0] += dx / (dist || 1) * 1.2; w.vel[2] += dz / (dist || 1) * 1.2; w.vel[1] = 0.4; ai.ram = 0; }
      return { want: [p[0], p[2]], speed: 0.2, chase: true };
    }
    // ---- 中立の動物（パンダ・シロクマ）：叩かれると反撃 ----
    if (T2.neutral && m.angry && g.mode === 'survival' && !g.dead && dist < 16) {
      if (dist < T2.w / 2 + 1.2 && Math.abs(dy) < 1.5 && ai.cd === 0) { g.hurtPlayer(T2.dmg, m.x, m.z); ai.cd = 20; }
      return { want: [p[0], p[2]], speed: T2.speed * 1.6, chase: true };
    }
    // ---- 溶岩渡り：溶岩の上を歩く ----
    if (T2.lavaWalk && WG.isLava(wd.block(Math.floor(m.x), Math.floor(m.y - 0.05), Math.floor(m.z)))) m.fire = 0;
    if (!T2.ai) return special.apply(this, arguments);

    // ================= 敵 =================
    var target = playerTarget(this, m, T2, dist, dy);
    // 影の長足：頭を見つめられると怒る。叩かれると瞬間移動する
    if (T2.ai === 'shadow') {
      if (!m.angry && g.mode === 'survival' && dist < 64 && w.eye && w.dir) {
        var hx = m.x - w.eye[0], hy = m.y + 2.6 - w.eye[1], hz = m.z - w.eye[2], hl = Math.hypot(hx, hy, hz);
        if (hl < 64 && (hx * w.dir[0] + hy * w.dir[1] + hz * w.dir[2]) / hl > 0.995 && sees(this, m, T2)) { m.angry = true; g.puff(m.x, m.y + 2.6, m.z, [150, 60, 200], 8); }
      }
      if (m.hurt === 9 || WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y + 1), Math.floor(m.z)))) this.teleport(m, 16);
      if (!m.angry || !playerTarget(this, Object.assign({}, m, { angry: true }), Object.assign({}, T2, { neutralLook: false }), dist, dy)) return special.apply(this, arguments);
      if (dist < 1.5 && Math.abs(dy) < 2.5 && ai.cd === 0) { g.hurtPlayer(T2.dmg, m.x, m.z); ai.cd = 20; }
      if (dist > 10 && Math.random() < 0.01) this.teleport(m, 4, p);
      return { want: [p[0], p[2]], speed: T2.speed * 1.2, chase: true };
    }
    if (T2.ai === 'dragon') return this.dragonTick(m, T2, dist);
    if (T2.ai === 'warden') {
      // 深淵の番人：目が見えず、近くで動く音（しゃがんでいない歩き）か、叩かれたことで相手を見つける
      var moving = Math.hypot(w.vel[0], w.vel[2]) > 0.02 && !w.sneak;
      if (g.mode === 'survival' && dist < 16 && (moving || m.angry)) ai.heard = 200;
      if (ai.heard > 0 && !g.dead && g.mode === 'survival') {
        ai.heard--;
        if (dist < 2 && Math.abs(dy) < 3 && ai.cd === 0) { g.hurtPlayer(T2.dmg, m.x, m.z); ai.cd = 18; }
        else if (dist >= 4 && dist < 15 && ai.cd === 0 && Math.random() < 0.04) {
          // 音の衝撃：壁を通して 10
          g.damage(10, true); ai.cd = 40; ai.boom = 12; w.vel[0] += dx / (dist || 1) * 1.5; w.vel[2] += dz / (dist || 1) * 1.5; w.vel[1] = 0.4;
          if (WG.Sound) WG.Sound.play('explode', m.x, m.y + 2, m.z);
        }
        return { want: [p[0], p[2]], speed: T2.speed * 1.4, chase: true };
      }
      return special.apply(this, arguments);
    }
    if (T2.ai === 'swoop') {
      // 夜空のエイ：上空を回り、ときどき急降下して噛む
      if (!target) { if (ai.timer-- <= 0 || ai.tx == null) { ai.tx = m.x + (Math.random() - 0.5) * 20; ai.tz = m.z + (Math.random() - 0.5) * 20; ai.ty = p[1] + 14; ai.timer = 60; } flyTo(m, ai.tx, ai.ty, ai.tz, 0.15, 0.05); return 'done'; }
      ai.ang = (ai.ang || 0) + 0.03;
      if (ai.dive > 0) { ai.dive--; flyTo(m, p[0], p[1] + 1, p[2], 0.3, 0.12); if (dist < 1.2 && Math.abs(dy + 1) < 1.5 && ai.cd === 0) { g.hurtPlayer(T2.dmg, m.x, m.z); ai.cd = 20; ai.dive = 0; } }
      else { flyTo(m, p[0] + Math.cos(ai.ang) * 10, p[1] + 10, p[2] + Math.sin(ai.ang) * 10, 0.18, 0.06); if (Math.random() < 0.01) ai.dive = 60; }
      return 'done';
    }
    if (T2.ai === 'laser') {
      // 目玉魚：見つけると 2 秒かけて光線をため、6 のダメージ
      if (target && dist < 15) {
        ai.laser = (ai.laser || 0) + 1; m.yaw = Math.atan2(dx, dz);
        if (ai.laser >= 40) { g.hurtPlayer(6, m.x, m.z, 'projectile'); ai.laser = 0; }
      } else ai.laser = 0;
      return null;
    }
    if (!target) {
      if (T2.flies) { if (ai.timer-- <= 0 || ai.tx == null) { ai.tx = m.x + (Math.random() - 0.5) * 12; ai.tz = m.z + (Math.random() - 0.5) * 12; ai.ty = ground(wd, ai.tx, ai.tz, m.y + 4) + (m.type === 'WAILER' ? 10 : 3); ai.timer = 80; } flyTo(m, ai.tx, ai.ty, ai.tz, T2.speed, 0.05); return 'done'; }
      if (T2.still) return 'done';
      return special.apply(this, arguments);
    }
    if (T2.ai === 'melee') {
      if (dist < 0.3 + T2.w / 2 + 0.7 && Math.abs(dy) < 1.5 && ai.cd === 0) {
        g.hurtPlayer(T2.dmg, m.x, m.z); ai.cd = 20;
        if (T2.onHit === 'HUNGER') g.addEffect('HUNGER', 140, 0);
        if (T2.onHit === 'WITHER') g.addEffect('WITHER', 200, 0);
        if (T2.toss) w.vel[1] = T2.toss;
      }
      if (m.type === 'DROWNED' && m.trident && dist > 4 && dist < 16 && ai.cd === 0 && Math.random() < 0.03) { this.shoot(m, T2); var tr = this.arrows[this.arrows.length - 1]; if (tr) tr.dmg = 8; ai.cd = 60; }
      if (T2.swimOk && WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y + 1), Math.floor(m.z)))) m.vy += (p[1] > m.y ? 0.03 : -0.02);
      return { want: [p[0], p[2]], speed: T2.speed, chase: true };
    }
    if (T2.ai === 'ranged') {
      m.yaw = Math.atan2(dx, dz);
      if (ai.cd === 0) {
        var n = T2.burst || 1;
        ai.burstN = n; ai.cd = T2.cd + Math.floor(Math.random() * 20);
      }
      if (ai.burstN > 0 && ai.cd % 6 === 0) { ai.burstN--; this.fireShot(m, T2.shot); }
      if (m.type === 'SHELL_GUARD') { ai.open = 20; return 'done'; }
      var keep = T2.keep || [6, 12], want = null;
      if (T2.flies) {
        var ty = p[1] + (m.type === 'WAILER' ? 6 : m.type === 'SKULL_BOSS' ? 4 : 2), r = dist > keep[1] ? -1 : dist < keep[0] ? 1 : 0;
        flyTo(m, m.x - dx / (dist || 1) * r * 4 + (r === 0 ? Math.cos(m.age * 0.02) * 3 : 0), ty, m.z - dz / (dist || 1) * r * 4 + (r === 0 ? Math.sin(m.age * 0.02) * 3 : 0), T2.speed * 2, 0.05);
        m.yaw = Math.atan2(dx, dz);
        return 'done';
      }
      if (dist > keep[1]) want = [p[0], p[2]]; else if (dist < keep[0]) want = [m.x - dx, m.z - dz];
      return { want: want, speed: T2.speed, chase: true };
    }
    return special.apply(this, arguments);
  };
  // 瞬間移動（影の長足）
  Mobs.prototype.teleport = function (m, r, near) {
    var wd = this.world, c = near || [m.x, m.y, m.z];
    for (var k = 0; k < 16; k++) {
      var x = Math.floor(c[0] + (Math.random() - 0.5) * r * 2), z = Math.floor(c[2] + (Math.random() - 0.5) * r * 2), y = Math.floor(c[1] + 8);
      for (var j = 0; j < 16; j++, y--) {
        if (WG.COLLIDE[wd.block(x, y - 1, z)] >= 1 && !WG.COLLIDE[wd.block(x, y, z)] && !WG.COLLIDE[wd.block(x, y + 1, z)] && !WG.COLLIDE[wd.block(x, y + 2, z)] && !WG.FLUID[wd.block(x, y, z)]) {
          this.game.puff(m.x, m.y + 1.5, m.z, [150, 60, 200], 10);
          m.x = m.px = x + 0.5; m.y = m.py = y; m.z = m.pz = z + 0.5; m.vx = m.vy = m.vz = 0;
          this.game.puff(m.x, m.y + 1.5, m.z, [150, 60, 200], 10);
          if (WG.Sound) WG.Sound.play('portal', m.x, m.y + 1, m.z);
          return true;
        }
      }
    }
    return false;
  };
  // 物理：溶岩の上を歩く・地形を通り抜けて飛ぶ（竜）・殻の番人は動かない
  var physics = Mobs.prototype.physics;
  Mobs.prototype.physics = function (m, T2) {
    if (T2.noclip) { m.x += m.vx; m.y += m.vy; m.z += m.vz; m.walk += Math.hypot(m.vx, m.vz) * 0.2; return; }
    if (T2.still) { m.vx = m.vz = 0; return physics.apply(this, arguments); }
    if (T2.lavaWalk) {
      var below = this.world.block(Math.floor(m.x), Math.floor(m.y - 0.02), Math.floor(m.z)), inLava = WG.isLava(this.world.block(Math.floor(m.x), Math.floor(m.y + 0.2), Math.floor(m.z)));
      if (inLava) { m.vy = 0.12; } else if (WG.isLava(below) && m.vy < 0) { m.vy = 0; m.y = Math.floor(m.y - 0.02) + 1; }
    }
    return physics.apply(this, arguments);
  };
  // 叩かれたとき：目玉魚の棘、影の長足は逃げる、ミツバチは怒る（巣の近くの仲間も）
  var hurt = Mobs.prototype.hurt;
  Mobs.prototype.hurt = function (m, amount, from) {
    var r = hurt.apply(this, arguments), T2 = TYPES[m.type], g = this.game;
    if (r && from && T2.thorns && g.mode === 'survival') g.hurtPlayer(T2.thorns, m.x, m.z);
    if (r && from && m.type === 'BEE') this.list.forEach(function (o) { if (o.type === 'BEE' && Math.hypot(o.x - m.x, o.z - m.z) < 12) o.angry = true; });
    if (r && from && T2.neutral) m.ai.panic = 0;
    if (r && from && (T2.neutral || T2.ai)) m.angry = true;
    return r;
  };

  // ================= 果ての竜 =================
  Mobs.prototype.dragonTick = function (m, T2, dist) {
    var g = this.game, w = g.walker, ai = m.ai, p = w.pos;
    ai.ang = (ai.ang || 0) + 0.008;
    if (ai.dive > 0) {
      ai.dive--;
      flyTo(m, p[0], p[1] + 1, p[2], 0.75, 0.08);
      if (dist < 4 && Math.abs(p[1] - m.y) < 4 && ai.cd === 0) { g.hurtPlayer(T2.dmg, m.x, m.z); w.vel[0] += (p[0] - m.x) * 0.3; w.vel[2] += (p[2] - m.z) * 0.3; w.vel[1] = 0.8; ai.cd = 30; ai.dive = 0; }
    } else {
      flyTo(m, Math.cos(ai.ang) * 40, 82 + Math.sin(ai.ang * 3) * 6, Math.sin(ai.ang) * 40, 0.55, 0.03);
      if (g.mode === 'survival' && !g.dead && ai.cd === 0 && Math.random() < 0.004) { ai.dive = 140; ai.cd = 20; }
      if (g.mode === 'survival' && !g.dead && Math.random() < 0.006) this.fireShot(m, 'fireball');
    }
    m.yaw = Math.atan2(m.vx, m.vz);
    return 'done';
  };
  // 倒すと、島の中心に帰りの門（エンドポータル）ができる
  Mobs.prototype.dragonDied = function (m) {
    var g = this.game, wd = this.world;
    wd.dragonDead = true;
    var y = ground(wd, 0.5, 0.5, 140, 140);
    for (var dx = -2; dx <= 2; dx++) for (var dz = -2; dz <= 2; dz++) {
      var ring = Math.abs(dx) === 2 || Math.abs(dz) === 2;
      if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
      wd.setBlock(dx, y - 1, dz, B.BEDROCK);
      if (!ring) wd.setBlock(dx, y, dz, B.END_PORTAL); else wd.setBlock(dx, y, dz, B.BEDROCK);
      g.walker.remesh(dx, dz);
    }
    if (g.spawnOrbs) for (var i = 0; i < 10; i++) g.spawnOrbs(m.x + (Math.random() - 0.5) * 6, m.y, m.z + (Math.random() - 0.5) * 6, 100);
    if (WG.advance) WG.advance(g, 'dragon');
    if (g.ui && g.ui.toast) g.ui.toast('果ての竜を倒した。島の中心に帰りの門ができた');
  };

  // ================= 三つ首の骸を呼ぶ =================
  // ソウルサンドを T の字（上の段 3 つと、その下の真ん中 1 つ）に置き、上の段に黒い頭蓋骨を 3 つ置く
  Game.prototype.trySkullBoss = function (x, y, z) {
    var wd = this.world, S = B.SOUL_SAND, K = B.DARK_SKULL;
    var axes = [[1, 0], [0, 1]];
    for (var a = 0; a < 2; a++) for (var off = -1; off <= 1; off++) {
      var ux = axes[a][0], uz = axes[a][1], cx = x - ux * off, cz = z - uz * off;
      var ok = [-1, 0, 1].every(function (i) { return wd.block(cx + ux * i, y, cz + uz * i) === K && wd.block(cx + ux * i, y - 1, cz + uz * i) === S; }) && wd.block(cx, y - 2, cz) === S;
      if (!ok) continue;
      var self = this;
      [-1, 0, 1].forEach(function (i) { wd.setBlock(cx + ux * i, y, cz + uz * i, B.AIR); wd.setBlock(cx + ux * i, y - 1, cz + uz * i, B.AIR); self.walker.remesh(cx + ux * i, cz + uz * i); });
      wd.setBlock(cx, y - 2, cz, B.AIR);
      var m = this.mobs.spawn('SKULL_BOSS', cx + 0.5, y - 2, cz + 0.5);
      m.ai.cd = 120; this.puff(m.x, m.y + 2, m.z, [40, 40, 40], 30, 1.5);
      if (WG.Sound) WG.Sound.play('explode', m.x, m.y, m.z);
      return true;
    }
    return false;
  };
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var t = this.walker.target, r = place.apply(this, arguments);
    if (t && this.world.block(t.px, t.py, t.pz) === B.DARK_SKULL) this.trySkullBoss(t.px, t.py, t.pz);
    return r;
  };

  // ================= 右クリック：鞍・なつける・染める・はちみつ・取引（豚人）・影の真珠 =================
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var mt = this.mobs.target && this.mobs.target.mob, held = this.inv.held(), it = held && ITEMS[held.key], surv = this.mode === 'survival', self = this, w = this.walker, t = w.target, wd = this.world;
    var done = function () { self.mouseR = self.clickR = false; };
    if (this.spectator) return use.apply(this, arguments);
    if (it && it.pearl && !this.riding) {
      // 影の真珠：投げた先へ瞬間移動（落ちたときに 5 のダメージ）
      if (w.eye && w.dir) (this.pearls || (this.pearls = [])).push({ x: w.eye[0], y: w.eye[1], z: w.eye[2], px: w.eye[0], py: w.eye[1], pz: w.eye[2], vx: w.dir[0] * 1.5, vy: w.dir[1] * 1.5 + 0.1, vz: w.dir[2] * 1.5, life: 0 });
      if (surv) this.inv.take(this.inv.sel, 1);
      done(); return;
    }
    if (mt && !mt.dead) {
      var T2 = TYPES[mt.type];
      if (it && it.key === 'SADDLE' && T2.rideable && !mt.saddled && !mt.baby && (mt.tame || !T2.tameRide)) { mt.saddled = true; if (surv) this.inv.take(this.inv.sel, 1); done(); return; }
      if (it && T2.tameWith && T2.tameWith.indexOf(it.key) >= 0 && !mt.tame) {
        if (surv) this.inv.take(this.inv.sel, 1);
        if (Math.random() < 1 / 3) { mt.tame = true; this.puff(mt.x, mt.y + 0.8, mt.z, [220, 60, 70], 10); } else this.puff(mt.x, mt.y + 0.8, mt.z, [90, 90, 90], 5);
        done(); return;
      }
      if ((mt.type === 'CAT' || mt.type === 'PARROT') && mt.tame && !(it && T2.breed && T2.breed.indexOf(it.key) >= 0)) { mt.sit = !mt.sit; done(); return; }
      if (mt.type === 'SHEEP' && it && it.dyeColor !== undefined && /_DYE$/.test(it.key)) { mt.color = it.key.replace(/_DYE$/, ''); if (mt.color === 'WHITE') mt.color = null; if (surv) this.inv.take(this.inv.sel, 1); done(); return; }
      if (mt.type === 'GOAT' && it && it.key === 'BUCKET') { this.fillBucket('MILK_BUCKET'); done(); return; }
      if (mt.type === 'PIGLIN' && it && it.key === 'GOLD_INGOT') {
        // 金と交換：6 秒後に何か 1 つくれる
        if (surv) this.inv.take(this.inv.sel, 1);
        mt.barter = 120; done(); return;
      }
      if (T2.rideable && T2.tameRide && !mt.tame && !mt.baby && !(it && T2.breed && T2.breed.indexOf(it.key) >= 0) && !this.riding) { this.mount(mt); done(); return; }
    }
    // ハチの巣：瓶ではちみつ、ハサミでかけら
    if (t && (t.id === B.BEEHIVE || t.id === B.BEE_NEST)) {
      var hk = t.x + ',' + t.y + ',' + t.z, hv = (wd.hives || (wd.hives = new Map())).get(hk) || { honey: 0 };
      if (hv.honey >= 5 && held && (held.key === 'GLASS_BOTTLE' || held.key === 'SHEARS')) {
        if (held.key === 'GLASS_BOTTLE') { if (surv) this.inv.take(this.inv.sel, 1); this.inv.add('HONEY_BOTTLE', 1); }
        else { this.spawnItem('HONEYCOMB', 3, t.x + 0.5, t.y + 1, t.z + 0.5, 0.1, 10); if (surv) this.wearTool(1); }
        hv.honey = 0; wd.hives.set(hk, hv);
        // 下に焚き火がなければ、近くのハチが怒る
        var calm = false; for (var dy2 = 1; dy2 <= 5; dy2++) if (wd.block(t.x, t.y - dy2, t.z) === B.CAMPFIRE) calm = true;
        if (!calm) this.mobs.list.forEach(function (o) { if (o.type === 'BEE' && Math.hypot(o.x - t.x, o.z - t.z) < 16) o.angry = true; });
        done(); return;
      }
    }
    return use.apply(this, arguments);
  };
  // はちみつは毒を消す
  var consumeExtra = Game.prototype.consumeExtra;
  Game.prototype.consumeExtra = function (it) { var r = consumeExtra.apply(this, arguments); if (it && it.curesPoison) delete this.effects.POISON; return r; };

  // ================= ゲームの刻み：効果・真珠・豚人の取引・ハチの巣・ボスの体力の棒 =================
  var BARTER = [['GRAVEL', 8, 16], ['LEATHER', 2, 4], ['NETHER_BRICK', 2, 8], ['OBSIDIAN', 1, 1], ['QUARTZ', 4, 10], ['SOUL_SAND', 2, 8], ['STRING', 3, 9], ['SHADOW_PEARL', 2, 4],
    ['POTION_FIRE_RESISTANCE', 1, 1], ['SPLASH_POTION_FIRE_RESISTANCE', 1, 1], ['IRON_NUGGET', 10, 36], ['GLOWSTONE_DUST', 5, 12], ['MAGMA_CREAM', 2, 6]];
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    tickExtra.call(this);
    var g = this, w = this.walker, wd = this.world, ef = this.effects;
    if (ef.WITHER && this.tickCount % Math.max(1, 40 >> ef.WITHER.amp) === 0) this.damage(1, true);
    if (ef.HUNGER) this.exhaust += 0.005 * (ef.HUNGER.amp + 1);
    if (ef.LEVITATION && !this.riding) { w.vel[1] = Math.max(w.vel[1], 0.05 * (ef.LEVITATION.amp + 1)); w.fallDist = 0; }
    // 影の真珠
    var keep = [];
    (this.pearls || []).forEach(function (q) {
      q.px = q.x; q.py = q.y; q.pz = q.z; q.vy -= 0.03; q.x += q.vx; q.y += q.vy; q.z += q.vz; q.life++;
      if (WG.COLLIDE[wd.block(Math.floor(q.x), Math.floor(q.y), Math.floor(q.z))] >= 1 || q.life > 200) {
        var y = Math.floor(q.y) + (q.vy < 0 ? 1 : 0);
        w.pos = [q.x - q.vx, Math.max(y, q.y - q.vy), q.z - q.vz]; w.prev = w.pos.slice(); w.vel = [0, 0, 0]; w.fallDist = 0;
        if (g.mode === 'survival') g.damage(5, true, 'fall');
        g.puff(w.pos[0], w.pos[1] + 1, w.pos[2], [150, 60, 200], 12);
        if (WG.Sound) WG.Sound.play('portal', w.pos[0], w.pos[1], w.pos[2]);
      } else keep.push(q);
    });
    this.pearls = keep;
    // 豚人の取引
    this.mobs.list.forEach(function (m) {
      if (m.barter > 0 && --m.barter === 0) { var b = BARTER[Math.floor(Math.random() * BARTER.length)]; if (ITEMS[b[0]]) g.spawnItem(b[0], b[1] + Math.floor(Math.random() * (b[2] - b[1] + 1)), m.x, m.y + 1, m.z, 0.15, 10); }
    });
    // ハチの巣：近くにハチがいると、だんだんはちみつがたまる（5 段）
    if (this.tickCount % 200 === 0 && wd.hives) wd.hives.forEach(function (hv, k) {
      var q = k.split(',').map(Number);
      if (wd.block(q[0], q[1], q[2]) !== B.BEEHIVE && wd.block(q[0], q[1], q[2]) !== B.BEE_NEST) { wd.hives.delete(k); return; }
      if (hv.honey < 5 && g.mobs.list.some(function (m) { return m.type === 'BEE' && Math.hypot(m.x - q[0], m.z - q[2]) < 22; }) && Math.random() < 0.5) hv.honey++;
    });
    // 帰りの門（エンドポータル）：入ると地上へ
    var feet = wd.block(Math.floor(w.pos[0]), Math.floor(w.pos[1] + 0.1), Math.floor(w.pos[2]));
    if (feet === B.END_PORTAL && !this.portalLock && this.ui.travel) { this.portalLock = true; this.ui.travel(wd.dimKey === 'end' ? 'overworld' : 'end', 0, 64, 0, 'end'); }
    // ボスの体力の棒
    var boss = null, bd = 96;
    this.mobs.list.forEach(function (m) { if (!m.dead && WG.BOSS_TYPES[m.type]) { var d = Math.hypot(m.x - w.pos[0], m.z - w.pos[2]); if (d < bd) { bd = d; boss = m; } } });
    var bar = this.ui.bossbar;
    if (bar) {
      bar.classList.toggle('hide', !boss);
      if (boss) { bar.querySelector('b').textContent = TYPES[boss.type].name; bar.querySelector('i').style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%'; }
    }
  };
  // 撃ったものと、目玉魚の光線、深淵の番人の衝撃、影の真珠を描く
  var drawExtra = Game.prototype.drawExtra;
  Game.prototype.drawExtra = function (solid, a, cube) {
    drawExtra.call(this, solid, a, cube);
    var w = this.walker, COL = { fireball: [240, 130, 40], smallfire: [255, 190, 60], skull: [40, 40, 44], bullet: [240, 230, 160] };
    (this.mobs.shots || []).forEach(function (s) {
      var x = s.px + (s.x - s.px) * a, y = s.py + (s.y - s.py) * a, z = s.pz + (s.z - s.pz) * a, c = COL[s.kind] || [255, 255, 255];
      cube(solid, x, y - 0.15, z, s.kind === 'fireball' ? 0.6 : s.kind === 'skull' ? 0.4 : 0.3, s.life * 0.3, function () { return 0; }, function () { return c; }, s.kind === 'skull' ? w.lightLevels(x, y, z) : [15, 15]);
    });
    (this.pearls || []).forEach(function (q) { cube(solid, q.x, q.y - 0.1, q.z, 0.2, 0, function () { return 0; }, function () { return [40, 90, 80]; }, [15, 15]); });
    var self = this;
    this.mobs.list.forEach(function (m) {
      if (m.type === 'EYE_FISH' && m.ai.laser > 0 && w.eye) {
        var f = m.ai.laser / 40, n = 20, sx = m.x, sy = m.y + 0.45, sz = m.z;
        for (var i = 1; i < n; i++) { var k = i / n; cube(solid, sx + (w.eye[0] - sx) * k, sy + (w.eye[1] - 0.3 - sy) * k, sz + (w.eye[2] - sz) * k, 0.06 + f * 0.05, 0, function () { return 0; }, function () { return [120 + 135 * f, 90 + 100 * f, 200]; }, [15, 15]); }
      }
      if (m.type === 'DEEP_WARDEN' && m.ai.boom > 0) { m.ai.boom--; self.puff(m.x, m.y + 2, m.z, [90, 230, 230], 6, 0.6); }
    });
  };

  // ================= 生まれる場所 =================
  // 初めて読み込んだチャンク：バイオームに合った動物の群れ、ハチの巣
  var BY_BIOME = { plains: [['HORSE', 5], ['DONKEY', 1]], savanna: [['HORSE', 3], ['DONKEY', 2]], desert: [['CAMEL', 2]], taiga: [['FOX', 4]],
    snowy_plains: [['POLAR_BEAR', 1], ['FOX', 2]], snowy_mountain: [['GOAT', 3], ['POLAR_BEAR', 1]], rocky_mountain: [['GOAT', 4]], beach: [['TURTLE', 4]],
    jungle: [['PARROT', 4], ['PANDA', 2]], forest: [['FOX', 1]] };
  var populate = Mobs.prototype.populate;
  Mobs.prototype.populate = function (cx, cz) {
    var wd = this.world, first = wd.dimKey === 'overworld' && !wd.populated.has(cx + ',' + cz);
    populate.call(this, cx, cz);
    if (!first) return;
    var c = wd.chunk(cx, cz);
    if (!c.hmap) return;
    var q = Math.floor(Math.random() * 256), x = (cx << 4) + (q & 15), z = (cz << 4) + (q >> 4), h = c.hmap[q], bio = WG.BIOMES[wd.biomeAt(x, z)].key;
    var list = BY_BIOME[bio];
    if (list && Math.random() < 0.08) {
      var tot = list.reduce(function (s, e) { return s + e[1]; }, 0), r = Math.random() * tot, pick = list[0][0];
      for (var i = 0; i < list.length; i++) { if (r < list[i][1]) { pick = list[i][0]; break; } r -= list[i][1]; }
      var n = pick === 'POLAR_BEAR' || pick === 'PANDA' ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3);
      for (var k = 0; k < n; k++) {
        var xx = x + Math.floor((Math.random() - 0.5) * 6), zz = z + Math.floor((Math.random() - 0.5) * 6), yy = ground(wd, xx + 0.5, zz + 0.5, h + 6);
        if (!WG.FLUID[wd.block(xx, yy, zz)]) this.spawn(pick, xx + 0.5, yy, zz + 0.5);
      }
    }
    // ハチの巣：平原と森の木（オークの原木の横）に、ときどき
    if ((bio === 'plains' || bio === 'forest') && Math.random() < 0.06) {
      for (var t = 0; t < 40; t++) {
        var qx = (cx << 4) + Math.floor(Math.random() * 16), qz = (cz << 4) + Math.floor(Math.random() * 16), qy = ground(wd, qx + 0.5, qz + 0.5, h + 12) - 1;
        if (wd.block(qx, qy, qz) !== B.OAK_LEAVES) continue;
        for (var yy2 = qy; yy2 > qy - 8; yy2--) if (wd.block(qx, yy2, qz) === B.OAK_LOG && wd.block(qx + 1, yy2 - 1, qz) === B.AIR) {
          wd.setBlock(qx + 1, yy2 - 1, qz, B.BEE_NEST); (wd.hives || (wd.hives = new Map())).set((qx + 1) + ',' + (yy2 - 1) + ',' + qz, { honey: 2 });
          for (var b2 = 0; b2 < 3; b2++) { var bee = this.spawn('BEE', qx + 1.5, yy2, qz + 1.5); bee.home = [qx + 1.5, yy2, qz + 0.5]; }
          t = 99; break;
        }
      }
    }
  };
  // 村には猫もいる
  var populateVillage = WG.populateVillage;
  WG.populateVillage = function (mobs, cx, cz) {
    var n0 = mobs.list.length;
    populateVillage(mobs, cx, cz);
    var golem = mobs.list.slice(n0).filter(function (m) { return m.type === 'GOLEM'; })[0];
    if (golem) for (var i = 0; i < 2; i++) mobs.spawn('CAT', golem.x + i, golem.y, golem.z + 1);
  };
  // 刻みごとに出るもの：魚の群れ・溺れたゾンビ・夜空のエイ・略奪者・影の長足・深淵の番人。ネザーとエンドの生き物
  var spawnTick = Mobs.prototype.spawnTick;
  Mobs.prototype.spawnTick = function () {
    spawnTick.call(this);
    var g = this.game, wd = this.world, w = g.walker, p = w.pos, self = this, sky = g.sky && g.sky(), dark = sky ? sky.dark : 0;
    if (g.tickCount % 40 !== 7) return;
    var count = function (t) { return self.list.filter(function (m) { return m.type === t; }).length; };
    var near = function (r0, r1) { var a = Math.random() * Math.PI * 2, r = r0 + Math.random() * (r1 - r0); return [Math.floor(p[0] + Math.cos(a) * r), Math.floor(p[2] + Math.sin(a) * r)]; };
    var standAt = function (x, z, y0, span) { for (var y = y0 + span; y > y0 - span; y--) if (WG.COLLIDE[wd.block(x, y - 1, z)] >= 1 && !WG.COLLIDE[wd.block(x, y, z)] && !WG.COLLIDE[wd.block(x, y + 1, z)] && !WG.FLUID[wd.block(x, y, z)]) return y; return null; };
    if (wd.dimKey === 'overworld') {
      var c = near(12, 28), y;
      // 魚の群れ（水の中、3〜5 匹）
      if (count('FISH') < 12) for (y = Math.floor(p[1]) + 8; y > p[1] - 16; y--) {
        if (WG.isWater(wd.block(c[0], y, c[1])) && WG.isWater(wd.block(c[0], y - 1, c[1]))) {
          var lead = this.spawn('FISH', c[0] + 0.5, y - 0.5, c[1] + 0.5), key = lead.fishKey, tint = lead.tint;
          for (var i = 0; i < 2 + Math.floor(Math.random() * 3); i++) { var f = this.spawn('FISH', c[0] + 0.5 + Math.random(), y - 0.5, c[1] + 0.5 + Math.random()); f.lead = lead; f.fishKey = key; f.tint = tint; }
          // 夜の深い水には溺れたゾンビ
          if (dark > 6 && count('DROWNED') < 3 && WG.isWater(wd.block(c[0], y - 3, c[1])) && Math.random() < 0.3) this.spawn('DROWNED', c[0] + 0.5, y - 3, c[1] + 0.5);
          if (WG.isWater(wd.block(c[0], y - 8, c[1])) && count('EYE_FISH') < 2 && Math.random() < 0.08) this.spawn('EYE_FISH', c[0] + 0.5, y - 6, c[1] + 0.5);
          break;
        }
      }
      // 夜空のエイ：3 晩以上眠っていないと、夜の空に出る
      var days = ((wd.time || 0) - (g.player.lastSleep || 0)) / 24000;
      if (dark > 8 && g.mode === 'survival' && days >= 3 && count('NIGHT_RAY') < 3 && Math.random() < 0.05) this.spawn('NIGHT_RAY', p[0] + (Math.random() - 0.5) * 10, p[1] + 20, p[2] + (Math.random() - 0.5) * 10);
      // 略奪者の見回り（夜、2〜4 人）と、影の長足（夜、まれ）
      if (dark > 8 && Math.random() < 0.01 && count('PILLAGER') < 4) { c = near(24, 40); y = standAt(c[0], c[1], Math.floor(p[1]), 20); if (y != null) for (i = 0; i < 2 + Math.floor(Math.random() * 3); i++) this.spawn('PILLAGER', c[0] + 0.5 + i, y, c[1] + 0.5); }
      if (dark > 8 && Math.random() < 0.02 && count('SHADOW') < 2) { c = near(20, 40); y = standAt(c[0], c[1], Math.floor(p[1]), 20); if (y != null) this.spawn('SHADOW', c[0] + 0.5, y, c[1] + 0.5); }
      // 深淵の番人：とても深い暗い所（y −40 より下）で、ごくまれに
      if (p[1] < -40 && count('DEEP_WARDEN') < 1 && Math.random() < 0.004) { c = near(10, 20); y = standAt(c[0], c[1], Math.floor(p[1]), 10); if (y != null && w.lightLevels(c[0] + 0.5, y, c[1] + 0.5)[1] < 3) this.spawn('DEEP_WARDEN', c[0] + 0.5, y, c[1] + 0.5); }
    } else if (wd.dimKey === 'nether') {
      var tot = this.list.filter(function (m) { return TYPES[m.type].hostile || m.type === 'STRIDER'; }).length;
      if (tot >= 14) return;
      c = near(16, 36);
      var list = [['PIGLIN', 8], ['HOGLIN', 4], ['DARK_SKELETON', 2], ['FIRE_SPIRIT', 2], ['WAILER', 1], ['STRIDER', 3]], r = Math.random() * 20, pick = 'PIGLIN';
      for (i = 0; i < list.length; i++) { if (r < list[i][1]) { pick = list[i][0]; break; } r -= list[i][1]; }
      if (pick === 'WAILER') { if (!WG.COLLIDE[wd.block(c[0], Math.floor(p[1]) + 10, c[1])]) this.spawn('WAILER', c[0] + 0.5, p[1] + 10, c[1] + 0.5); return; }
      if (pick === 'STRIDER') { for (y = Math.floor(p[1]) + 10; y > p[1] - 30; y--) if (WG.isLava(wd.block(c[0], y, c[1])) && wd.block(c[0], y + 1, c[1]) === B.AIR) { this.spawn('STRIDER', c[0] + 0.5, y + 1, c[1] + 0.5); break; } return; }
      y = standAt(c[0], c[1], Math.floor(p[1]), 16);
      if (y != null) this.spawn(pick, c[0] + 0.5, y + (pick === 'FIRE_SPIRIT' ? 2 : 0), c[1] + 0.5);
    } else if (wd.dimKey === 'end') {
      // 果ての竜（まだ倒していなければ、島の上に 1 頭）
      if (!wd.dragonDead && count('END_DRAGON') === 0) { var d = this.spawn('END_DRAGON', 30, 90, 0); d.ai.ang = 0; if (g.ui && g.ui.toast) g.ui.toast('果ての竜が現れた'); }
      if (count('SHADOW') < 10) { c = near(12, 32); y = standAt(c[0], c[1], Math.floor(p[1]), 20); if (y != null) this.spawn('SHADOW', c[0] + 0.5, y, c[1] + 0.5); }
      if (Math.hypot(p[0], p[2]) > 400 && count('SHELL_GUARD') < 3 && Math.random() < 0.1) { c = near(8, 20); y = standAt(c[0], c[1], Math.floor(p[1]), 12); if (y != null) this.spawn('SHELL_GUARD', c[0] + 0.5, y, c[1] + 0.5); }
    }
  };
  // ネザーの元の湧き方（マグマスライムだけ）に、上の分を足す
  // 眠ったら、夜空のエイの数え始め
  var useBed = Game.prototype.useBed;
  if (useBed) Game.prototype.useBed = function () { var r = useBed.apply(this, arguments); if (this.sleeping) this.player.lastSleep = this.world.time; return r; };
  var wake = Game.prototype.wake;
  if (wake) Game.prototype.wake = function () { this.player.lastSleep = this.world.time; return wake.apply(this, arguments); };
  void Craft;
})(typeof window !== 'undefined' ? window : globalThis);
