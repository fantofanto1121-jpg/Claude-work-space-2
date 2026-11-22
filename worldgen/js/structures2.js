// 構造物と生き物（第 4 回）
// ・前哨基地（略奪者の塔）・廃ポータル・イグルー（地下室つき）・海底遺跡・沼の小屋・古代都市（深い地下の大きな空洞）
// ・邪悪な村人：ヴィンディケーター（斧で叩く）・エヴォーカー（牙の列と、飛ぶヴェックスを呼ぶ。不死のトーテムを落とす）・ヴェックス
// ・古代都市のスカルクシュリーカー：踏んだり近くで音を立てたりすると叫び、3 回目で深淵の番人が地面から現れる
// どの形も本家を参考に、このゲームのために組み立てたもの。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Mobs = WG.Mobs, TYPES = WG.MOB_TYPES, MODELS = WG.MOB_MODELS, hash = WG.hash, rnd = WG.rnd;
  var S = WG.StructAPI, Plan = S.Plan, spec = S.spec, bbox = S.bbox, biomeKey = S.biomeKey, flat = S.flat, SEA = S.SEA, SALT = S.SALT + 300;
  function rint(n) { return Math.floor(Math.random() * n); }
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }

  // ---------------- アイテム ----------------
  function blockItem(key, hardness, drop, tool, tier) {
    var id = B[key];
    ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: 1, dropMax: 1, dropChance: 1 };
    if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = tier; }
  }
  ['DEEPSLATE_BRICKS', 'CRACKED_DEEPSLATE_BRICKS', 'DEEPSLATE_TILES', 'CHISELED_DEEPSLATE'].forEach(function (k) { blockItem(k, 3.5, k, 'pickaxe', 0); });
  blockItem('SCULK', 0.2, null, 'hoe', 0); blockItem('SCULK_SHRIEKER', 3, null, 'hoe', 0);
  blockItem('SOUL_LANTERN', 3.5, 'SOUL_LANTERN', 'pickaxe', 0); blockItem('CRYING_OBSIDIAN', 50, 'CRYING_OBSIDIAN', 'pickaxe', 3); blockItem('MAGMA_BLOCK', 0.5, 'MAGMA_BLOCK', 'pickaxe', 0);
  ITEMS.ECHO_SHARD = { key: 'ECHO_SHARD', name: 'こだまの欠片', block: -1, max: 64, shape: 'gem', color: '#1a5a66' };
  Craft.SHAPED.push([['BB', 'BB'], { B: 'POLISHED_DEEPSLATE' }, 'DEEPSLATE_BRICKS', 4], [['TT', 'TT'], { T: 'DEEPSLATE_BRICKS' }, 'DEEPSLATE_TILES', 4],
    [['NNN', 'NTN', 'NNN'], { N: 'IRON_NUGGET', T: 'SOUL_TORCH' }, 'SOUL_LANTERN', 1], [['MM', 'MM'], { M: 'MAGMA_CREAM' }, 'MAGMA_BLOCK', 1],
    [['EEE', 'ECE', 'EEE'], { E: 'ECHO_SHARD', C: 'COMPASS' }, 'RECOVERY_COMPASS', 1]);
  Craft.SHAPED = Craft.SHAPED.filter(function (r) { return Object.keys(r[1]).every(function (k) { return ITEMS[r[1][k]] || (Craft.GROUPS && Craft.GROUPS[r[1][k]]); }); });
  // リカバリーコンパスは、本家と同じこだまの欠片のレシピに（アメジストのレシピは外す）
  Craft.SHAPED = Craft.SHAPED.filter(function (r) { return !(r[2] === 'RECOVERY_COMPASS' && r[1].A === 'AMETHYST_SHARD'); });
  WG.Craft.SHAPED = Craft.SHAPED;
  Craft.SMELT.DEEPSLATE_BRICKS = 'CRACKED_DEEPSLATE_BRICKS';

  // ---------------- 生き物：見た目 ----------------
  function box(x, y, z, w, h, d, c, sw, extra) { var b = { o: [x, y, z], s: [w, h, d], c: hex(c), sw: sw || null }; if (extra) for (var k in extra) b[k] = extra[k]; return b; }
  function illager(o) {
    var skin = '#a4a69c', EYE = '#1f1d1c';
    return [box(-4, 0, -2, 4, 12, 4, o.legs, 'L1'), box(0, 0, -2, 4, 12, 4, o.legs, 'L2'), box(-4, 12, -2, 8, 12, 4, o.body),
      box(-8, 12, -2, 4, 12, 4, o.arms, o.armsUp ? 'A' : 'L2'), box(4, 12, -2, 4, 12, 4, o.arms, o.armsUp ? 'A' : 'L1'),
      box(-4, 24, -4, 8, 9, 8, skin), box(-1, 25, 4, 2, 4, 2, '#8e9088'),                        // 長い頭と鼻
      box(-3, 28, 4, 2, 1, 0.3, EYE), box(1, 28, 4, 2, 1, 0.3, EYE), box(-3.5, 29.2, 4, 7, 0.8, 0.3, '#3a3a36')].concat(o.extra || []);   // 目と、つながった眉
  }
  MODELS.VINDICATOR = illager({ legs: '#262c2e', body: '#34403e', arms: '#34403e', armsUp: true,
    extra: [box(-4.2, 21, -2.2, 8.4, 1, 4.4, '#1e2422'), box(5.5, 12, 8, 1, 1, 9, '#6a4a2a', 'A'), box(5, 12, 14, 2, 4, 4, '#c6c6cc', 'A')] });   // 斧
  MODELS.EVOKER = illager({ legs: '#1c1c20', body: '#26262c', arms: '#26262c',
    extra: [box(-4.5, 0.5, -2.5, 9, 12, 5, '#2a2a30'), box(-4.6, 22, -2.6, 9.2, 1.2, 5.2, '#d8b030'), box(-0.6, 13, 2.1, 1.2, 9, 0.4, '#d8b030'), box(-4.6, 0.5, -2.6, 9.2, 1, 5.2, '#d8b030')] });   // 長い衣と金の縁
  MODELS.VEX = [box(-2, 6, -1, 4, 6, 2, '#b8c8d8'), box(-3, 12, -3, 6, 6, 6, '#c8d6e2'), box(-2, 14, 3, 1.5, 1, 0.3, '#2a3a5a'), box(0.5, 14, 3, 1.5, 1, 0.3, '#2a3a5a'),
    box(-4, 7, -1, 2, 5, 2, '#b8c8d8', 'L2'), box(2, 7, -1, 2, 5, 2, '#b8c8d8', 'A'), box(2.5, 7, 3, 1, 1, 6, '#e0e0ea', 'A'),
    box(-9, 9, -3, 7, 5, 0.5, '#e6eef6', 'W1'), box(2, 9, -3, 7, 5, 0.5, '#e6eef6', 'W2'), box(-1.5, 2, -1, 3, 4, 2, '#a8b8c8')];
  function T(k, o) { TYPES[k] = Object.assign({ food: [], drops: [] }, o); }
  T('VINDICATOR', { name: 'ヴィンディケーター', w: 0.6, h: 1.95, hp: 24, speed: 0.1, hostile: true, range: 16, ai: 'melee', dmg: 10, drops: [['EMERALD', 0, 1]], rare: ['IRON_AXE'], rareP: 0.085 });
  T('EVOKER', { name: 'エヴォーカー', w: 0.6, h: 1.95, hp: 24, speed: 0.08, hostile: true, range: 16, ai: 'evoker', drops: [['TOTEM_OF_UNDYING', 1, 1], ['EMERALD', 0, 1]] });
  T('VEX', { name: 'ヴェックス', w: 0.4, h: 0.8, hp: 14, speed: 0.12, hostile: true, range: 32, ai: 'vex', dmg: 6, flies: true, noFall: true, noclip: true, drops: [] });
  ['VINDICATOR', 'EVOKER', 'VEX'].forEach(function (k) {
    if (WG.MOB_ORDER.indexOf(k) < 0) WG.MOB_ORDER.push(k);
    ITEMS['SPAWN_EGG_' + k] = { key: 'SPAWN_EGG_' + k, name: TYPES[k].name + 'のスポーンエッグ', block: -1, max: 64, shape: 'lump', color: '#888888', egg: k };
  });

  // ---------------- 生き物：動き ----------------
  function flyTo(m, x, y, z, sp, k) {
    var dx = x - m.x, dy = y - m.y, dz = z - m.z, d = Math.hypot(dx, dy, dz) || 1;
    m.vx += (dx / d * sp - m.vx) * k; m.vy += (dy / d * sp - m.vy) * k; m.vz += (dz / d * sp - m.vz) * k;
    m.yaw = Math.atan2(m.vx, m.vz);
  }
  var special = Mobs.prototype.special;
  Mobs.prototype.special = function (m, T2, dist, dx, dy, dz) {
    if (T2.ai !== 'evoker' && T2.ai !== 'vex') return special.apply(this, arguments);
    var g = this.game, w = g.walker, p = w.pos, ai = m.ai, target = g.mode === 'survival' && !g.dead && dist < T2.range;
    if (T2.ai === 'vex') {
      // ヴェックス：壁を抜けて飛び、近づいて切りつける。しばらくすると力尽きる
      if (m.life == null) m.life = 600 + rint(400);
      if (--m.life <= 0 && !(m.lifeDmgT-- > 0)) { this.hurt(m, 1, null); m.lifeDmgT = 20; }
      if (!target) { if (ai.timer-- <= 0 || ai.tx == null) { ai.tx = m.x + (Math.random() - 0.5) * 10; ai.ty = m.y + (Math.random() - 0.5) * 4; ai.tz = m.z + (Math.random() - 0.5) * 10; ai.timer = 60; } flyTo(m, ai.tx, ai.ty, ai.tz, 0.08, 0.05); return 'done'; }
      if (ai.charge > 0) { ai.charge--; flyTo(m, p[0], p[1] + 1, p[2], 0.34, 0.25); }
      else { flyTo(m, p[0] + Math.cos(m.age * 0.05) * 3, p[1] + 2.5, p[2] + Math.sin(m.age * 0.05) * 3, 0.12, 0.08); if (Math.random() < 0.02) ai.charge = 30; }
      if (dist < 1.1 && Math.abs(p[1] + 0.9 - m.y) < 1.4 && ai.cd === 0) { g.hurtPlayer(T2.dmg, m.x, m.z); ai.cd = 20; ai.charge = 0; }
      return 'done';
    }
    // エヴォーカー：離れて立ち、牙を呼び出す（近いと自分のまわりに輪、遠いと相手まで列）。ときどきヴェックスを 3 匹呼ぶ
    if (!target) return special.apply(this, arguments);
    m.yaw = Math.atan2(dx, dz);
    ai.spell = (ai.spell || 0) + 1;
    if (ai.cast > 0) { ai.cast--; if (ai.cast % 3 === 0) g.puff(m.x, m.y + 2.1, m.z, ai.castKind === 'vex' ? [180, 190, 210] : [120, 90, 160], 3, 0.4); }
    if (ai.spell % 340 === 300 && this.list.filter(function (v) { return v.type === 'VEX' && !v.dead && Math.hypot(v.x - m.x, v.z - m.z) < 24; }).length < 6) {
      ai.cast = 40; ai.castKind = 'vex';
      for (var i = 0; i < 3; i++) { var v = this.spawn('VEX', m.x + (Math.random() - 0.5) * 2, m.y + 1.2, m.z + (Math.random() - 0.5) * 2); if (v) v.life = 600 + rint(400); }
      if (WG.Sound) WG.Sound.play('mob', m.x, m.y + 1.5, m.z, 'EVOKER');
    } else if (ai.spell % 100 === 60) {
      ai.cast = 20; ai.castKind = 'fang';
      if (dist < 3) for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4; g.addFang(m.x + Math.cos(a) * 1.5, m.y, m.z + Math.sin(a) * 1.5, 0); }
      else { var ux = dx / dist, uz = dz / dist; for (var j = 1; j <= 16; j++) g.addFang(m.x + ux * j * 1.25, m.y, m.z + uz * j * 1.25, j * 2); }
    }
    var want = dist > 10 ? [p[0], p[2]] : dist < 6 ? [m.x - dx, m.z - dz] : null;
    return { want: want, speed: T2.speed, chase: true };
  };
  // 牙：地面から出てきて噛み、引っ込む
  Game.prototype.addFang = function (x, y, z, delay) {
    var wd = this.world, fx = Math.floor(x), fz = Math.floor(z), fy = Math.floor(y + 0.5);
    for (var k = 0; k < 4 && WG.COLLIDE[wd.block(fx, fy, fz)] >= 1; k++) fy++;
    for (k = 0; k < 4 && !(WG.COLLIDE[wd.block(fx, fy - 1, fz)] >= 1); k++) fy--;
    if (WG.COLLIDE[wd.block(fx, fy, fz)] >= 1) return;
    (this.fangs || (this.fangs = [])).push({ x: x, y: fy, z: z, t: -delay, yaw: Math.random() * Math.PI });
  };
  Game.prototype.tickFangs = function () {
    var self = this, w = this.walker;
    this.fangs = (this.fangs || []).filter(function (f) {
      f.t++;
      if (f.t === 6) {
        if (!self.dead && Math.hypot(w.pos[0] - f.x, w.pos[2] - f.z) < 0.9 && Math.abs(w.pos[1] - f.y) < 1.5) self.hurtPlayer(6, f.x, f.z, 'magic');
        self.mobs.list.forEach(function (m) { if (!m.dead && !/^(EVOKER|VINDICATOR|PILLAGER|VEX)$/.test(m.type) && Math.hypot(m.x - f.x, m.z - f.z) < 0.9 && Math.abs(m.y - f.y) < 1.5) self.mobs.hurt(m, 6, null); });
        if (WG.Sound) WG.Sound.play('fangs', f.x, f.y, f.z);
      }
      return f.t < 22;
    });
  };
  var drawExtra = Game.prototype.drawExtra;
  Game.prototype.drawExtra = function (solid, a, cube) {
    var r = drawExtra.apply(this, arguments), w = this.walker;
    (this.fangs || []).forEach(function (f) {
      var t = f.t + a;
      if (t < 0) return;
      // 上がる（0〜6）→ 閉じる（6〜10）→ 沈む（14〜22）
      var up = Math.min(1, t / 6) * (t > 14 ? Math.max(0, 1 - (t - 14) / 8) : 1), close = t < 6 ? 0.45 : Math.max(0, 0.45 - (t - 6) * 0.11), lt = w.lightLevels(f.x, f.y + 0.5, f.z);
      var cy = Math.cos(f.yaw), sy = Math.sin(f.yaw), h = 0.75 * up;
      [-1, 1].forEach(function (side) {
        for (var k = 0; k < 3; k++) {
          var lx = (k - 1) * 0.22, lz = side * (0.08 + close * 0.5);
          var x = f.x + lx * cy - lz * sy, z = f.z + lx * sy + lz * cy;
          cube(solid, x, f.y - 0.75 + h - 0.12, z, 0.16, f.yaw, function () { return 0; }, function () { return [96, 94, 88]; }, lt);       // あご
          cube(solid, x, f.y - 0.75 + h + 0.04, z, 0.08, f.yaw, function () { return 0; }, function () { return [226, 222, 206]; }, lt);     // 歯
        }
      });
    });
    return r;
  };

  // ---------------- 宝箱の中身 ----------------
  function table(name, list) { S.LOOT[name] = list.filter(function (l) { return ITEMS[l[0]]; }); }
  table('outpost', [['CROSSBOW', 1, 1, 6], ['ARROW', 2, 7, 10], ['WHEAT', 3, 5, 8], ['POTATO', 2, 5, 6], ['CARROT', 3, 5, 6], ['DARK_OAK_LOG', 2, 3, 8], ['EXPERIENCE_BOTTLE', 1, 2, 4],
    ['IRON_INGOT', 1, 3, 4], ['STRING', 1, 6, 6], ['TRIPWIRE_HOOK', 1, 3, 4], ['ENCHANTED_BOOK', 1, 1, 2]]);
  table('ruined_portal', [['OBSIDIAN', 1, 2, 40], ['FLINT', 1, 4, 40], ['FLINT_AND_STEEL', 1, 1, 40], ['FIRE_CHARGE', 1, 1, 40], ['GOLDEN_APPLE', 1, 1, 15], ['GOLD_NUGGET', 4, 24, 15],
    ['GOLDEN_SWORD', 1, 1, 15], ['GOLDEN_HELMET', 1, 1, 15], ['GOLDEN_CARROT', 4, 12, 5], ['CLOCK', 1, 1, 5], ['GOLD_INGOT', 2, 8, 5], ['GLISTERING_MELON_SLICE', 4, 12, 5],
    ['GOLD_BLOCK', 1, 2, 1], ['ENCHANTED_GOLDEN_APPLE', 1, 1, 1]]);
  table('igloo', [['GOLDEN_APPLE', 1, 1, 1], ['APPLE', 1, 3, 15], ['COAL', 1, 4, 15], ['GOLD_NUGGET', 1, 3, 10], ['STONE_AXE', 1, 1, 2], ['ROTTEN_FLESH', 1, 1, 10], ['EMERALD', 1, 1, 1], ['WHEAT', 2, 3, 10]]);
  table('ocean_ruin', [['COAL', 1, 4, 10], ['STONE_AXE', 1, 1, 2], ['ROTTEN_FLESH', 1, 1, 5], ['EMERALD', 1, 1, 1], ['WHEAT', 2, 3, 10], ['GOLDEN_APPLE', 1, 1, 1],
    ['ENCHANTED_BOOK', 1, 1, 5], ['FISHING_ROD', 1, 1, 1], ['EMPTY_MAP', 1, 1, 5], ['GOLD_NUGGET', 1, 3, 5], ['LEATHER_CHESTPLATE', 1, 1, 1]]);
  table('ancient_city', [['ENCHANTED_GOLDEN_APPLE', 1, 2, 1], ['MUSIC_DISC_DRIP', 1, 1, 2], ['ECHO_SHARD', 1, 3, 4], ['AMETHYST_SHARD', 1, 15, 3], ['ENCHANTED_BOOK', 1, 1, 5],
    ['EXPERIENCE_BOTTLE', 1, 3, 3], ['DIAMOND', 1, 2, 2], ['IRON_LEGGINGS', 1, 1, 2], ['DIAMOND_HOE', 1, 1, 2], ['SADDLE', 1, 1, 3], ['LEAD', 1, 1, 2], ['NAME_TAG', 1, 1, 2],
    ['COAL', 6, 15, 7], ['BONE', 1, 15, 5], ['SOUL_LANTERN', 1, 3, 3], ['GLOW_INK_SAC', 1, 3, 1], ['SCULK', 4, 10, 3]]);
  // 森の洋館に住むのは、略奪者とヴィンディケーター・エヴォーカー
  S.SPECS.forEach(function (sp) {
    if (sp.key !== 'wm') return;
    var build = sp.build;
    sp.build = function () {
      var P = build.apply(this, arguments);
      P.mobs.forEach(function (m, i) { if (m[0] === 'PILLAGER') m[0] = i === 4 ? 'EVOKER' : i % 2 === 0 ? 'VINDICATOR' : 'PILLAGER'; });
      return P;
    };
  });
  Object.assign(S.KIND_KEY, { outpost: 'po', ruined_portal: 'rp', igloo: 'ig', ocean_ruin: 'or', swamp_hut: 'wh', ancient_city: 'ac' });

  // ---------------- 前哨基地 ----------------
  function pick(seed, x, z, n, salt) { return hash(seed, x, n, z, salt); }
  spec({ key: 'po', dim: 'overworld', size: 384, reach: 14,
    head: function (gen, rx, rz) {
      var s = gen.seed, OK = { plains: 1, desert: 1, savanna: 1, taiga: 1, snowy_plains: 1 };
      if (rnd(s, rx, 0, rz, SALT + 1) >= 0.55) return null;
      for (var tr = 0; tr < 8; tr++) {
        var x = rx * 384 + 24 + pick(s, rx, rz, 1 + tr, SALT + 1) % 336, z = rz * 384 + 24 + pick(s, rx, rz, 11 + tr, SALT + 1) % 336;
        if (OK[biomeKey(gen, x, z)] && gen.column(x, z).h > SEA + 1 && flat(gen, x, z, 5, 5, 3)) return bbox({ x: x, z: z, y: gen.column(x, z).h }, 12);
      }
      return null;
    },
    build: function (gen, h) {
      var P = new Plan(-64, 320, 'outpost'), g = h.y, ox = h.x - 3, oz = h.z - 3, R = WG.StructAPI.rng(hash(gen.seed, h.x, 7, h.z, SALT + 2));
      var LOG = B.DARK_OAK_LOG, PL = B.DARK_OAK_PLANKS, FL = B.BIRCH_PLANKS, FE = B.OAK_FENCE;
      P.fill(ox - 2, g + 1, oz - 2, ox + 8, g + 23, oz + 8, B.AIR);
      P.fill(ox - 1, g, oz - 1, ox + 7, g, oz + 7, B.COBBLESTONE);
      for (var x = ox - 1; x <= ox + 7; x++) for (var z = oz - 1; z <= oz + 7; z++) P.found(x, g - 1, z, B.COBBLESTONE);
      // 四隅の柱と、3 階分の壁
      [[0, 0], [6, 0], [0, 6], [6, 6]].forEach(function (q) { P.fill(ox + q[0], g + 1, oz + q[1], ox + q[0], g + 20, oz + q[1], LOG); });
      [[1, 5], [7, 11]].forEach(function (lv) {
        for (var y = g + lv[0]; y <= g + lv[1] - (lv[0] === 1 ? 0 : 0); y++) {
          for (var i = 1; i <= 5; i++) { P.set(ox + i, y, oz, PL); P.set(ox + i, y, oz + 6, PL); P.set(ox, y, oz + i, PL); P.set(ox + 6, y, oz + i, PL); }
        }
      });
      P.fill(ox + 3, g + 1, oz + 6, ox + 3, g + 2, oz + 6, B.AIR);                                   // 入口（南）
      [[3, 0], [0, 3], [6, 3]].forEach(function (q) { P.set(ox + q[0], g + 9, oz + q[1], FE); });   // 窓
      [6, 12].forEach(function (fy) { P.fill(ox + 1, g + fy, oz + 1, ox + 5, g + fy, oz + 5, FL); });
      // はしご（北の壁の内側）と床の穴
      for (var y = g + 1; y <= g + 17; y++) { P.ladder(ox + 3, y, oz + 1, 0, 1); }
      // 3 階：柱の間に柵（見張り台）、張り出した最上階、屋根
      for (var i = 1; i <= 5; i++) { [g + 13].forEach(function (yy) { P.set(ox + i, yy, oz, FE); P.set(ox + i, yy, oz + 6, FE); P.set(ox, yy, oz + i, FE); P.set(ox + 6, yy, oz + i, FE); }); }
      P.fill(ox - 1, g + 17, oz - 1, ox + 7, g + 17, oz + 7, FL); P.set(ox + 3, g + 17, oz + 1, B.LADDER_S);
      for (i = -1; i <= 7; i++) { P.set(ox + i, g + 18, oz - 1, FE); P.set(ox + i, g + 18, oz + 7, FE); P.set(ox - 1, g + 18, oz + i, FE); P.set(ox + 7, g + 18, oz + i, FE); }
      [[-1, -1], [7, -1], [-1, 7], [7, 7]].forEach(function (q) { P.fill(ox + q[0], g + 18, oz + q[1], ox + q[0], g + 20, oz + q[1], LOG); });
      P.fill(ox - 1, g + 21, oz - 1, ox + 7, g + 21, oz + 7, PL); P.fill(ox + 1, g + 22, oz + 1, ox + 5, g + 22, oz + 5, PL); P.fill(ox + 2, g + 23, oz + 2, ox + 4, g + 23, oz + 4, B.DARK_OAK_SLAB || PL);
      P.chest(ox + 5, g + 18, oz + 5, 'outpost');
      P.torch(ox + 3, g + 4, oz + 5, 0, -1); P.torch(ox + 5, g + 10, oz + 3, -1, 0); P.torch(ox + 1, g + 20, oz + 3, 1, 0);
      // まわり：テントと的
      var tx = ox + 12, tz = oz - 2;
      for (var k = 0; k < 4; k++) { P.set(tx, g + 1 + (k < 2 ? 0 : 1) * 0, tz + k, B.WHITE_WOOL); }
      for (k = 0; k < 4; k++) { P.set(tx - 1, g + 1, tz + k, B.WHITE_WOOL); P.set(tx + 1, g + 1, tz + k, B.WHITE_WOOL); P.set(tx, g + 2, tz + k, B.WHITE_WOOL); P.set(tx, g + 1, tz + k, B.AIR); }
      P.fill(tx - 1, g, tz, tx + 1, g, tz + 3, B.COBBLESTONE);
      [[-7, 9], [-8, 2]].forEach(function (q) { P.set(ox + q[0], g + 1, oz + q[1], B.OAK_FENCE); P.set(ox + q[0], g + 2, oz + q[1], B.HAY_BLOCK || B.OAK_PLANKS); P.set(ox + q[0], g + 3, oz + q[1], B.CARVED_PUMPKIN || B.PUMPKIN); });
      P.fill(ox - 6, g + 1, oz - 6, ox - 4, g + 1, oz - 6, LOG); P.set(ox - 5, g + 2, oz - 6, LOG);
      [[2, 2, g + 1], [4, 9, g + 1], [3, 3, g + 7], [3, 3, g + 18]].forEach(function (q) { P.mob('PILLAGER', ox + q[0] + 0.5, q[2], oz + q[1] + 0.5); });
      P.floor = [[ox + 3, g + 1, oz + 9]];
      return P;
    }
  });

  // ---------------- 廃ポータル ----------------
  spec({ key: 'rp', dim: 'overworld', size: 256, reach: 10,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 3) >= 0.6) return null;
      for (var tr = 0; tr < 6; tr++) {
        var x = rx * 256 + 16 + pick(s, rx, rz, 1 + tr, SALT + 3) % 224, z = rz * 256 + 16 + pick(s, rx, rz, 11 + tr, SALT + 3) % 224, c = gen.column(x, z);
        if (c.h > SEA + 1 && flat(gen, x, z, 4, 4, 3)) return bbox({ x: x, z: z, y: c.h }, 8);
      }
      return null;
    },
    build: function (gen, h) {
      var P = new Plan(-64, 320, 'ruined_portal'), g = h.y, cx = h.x, cz = h.z, R = WG.StructAPI.rng(hash(gen.seed, cx, 9, cz, SALT + 4)), along = R() < 0.5;
      // 地面：ネザーラックとマグマ、金ブロックが少し
      for (var dx = -6; dx <= 6; dx++) for (var dz = -6; dz <= 6; dz++) {
        var d = Math.hypot(dx, dz) + R() * 2;
        if (d > 6) continue;
        P.set(cx + dx, g, cz + dz, d < 2.5 && R() < 0.15 ? B.MAGMA_BLOCK : R() < 0.04 ? B.GOLD_BLOCK : d > 4.5 && R() < 0.5 ? B.COBBLESTONE : B.NETHERRACK);
        if (d < 5 && R() < 0.06) P.set(cx + dx, g + 1, cz + dz, B.NETHERRACK);
      }
      // 枠（4×5、内側 2×3）。ところどころ欠け、泣く黒曜石が混じる
      var miss = 0;
      for (var a = -1; a <= 2; a++) for (var y = 0; y <= 4; y++) {
        var edge = a === -1 || a === 2 || y === 0 || y === 4, X = along ? cx + a : cx, Z = along ? cz : cz + a;
        if (!edge) { P.set(X, g + 1 + y, Z, B.AIR); continue; }
        var r = R();
        if (r < 0.18 && miss < 4 && y > 0) { miss++; P.set(X, g + 1 + y, Z, B.AIR); continue; }
        P.set(X, g + 1 + y, Z, r < 0.32 ? B.CRYING_OBSIDIAN : B.OBSIDIAN);
      }
      // 落ちたかけら
      for (var k = 0; k < miss + 1; k++) P.set(cx + Math.floor(R() * 9) - 4, g + 1, cz + Math.floor(R() * 9) - 4, R() < 0.3 ? B.CRYING_OBSIDIAN : B.OBSIDIAN);
      // 崩れた石レンガの台
      for (a = -2; a <= 3; a++) { var X2 = along ? cx + a : cx - 1, Z2 = along ? cz - 1 : cz + a; if (R() < 0.7) P.set(X2, g + 1, Z2, R() < 0.5 ? B.STONE_BRICKS : B.MOSSY_STONE_BRICKS); }
      P.chest(along ? cx + 4 : cx + 2, g + 1, along ? cz + 2 : cz + 4, 'ruined_portal');
      return P;
    }
  });

  // ---------------- イグルー ----------------
  spec({ key: 'ig', dim: 'overworld', size: 256, reach: 10,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 5) >= 0.6) return null;
      for (var tr = 0; tr < 8; tr++) {
        var x = rx * 256 + 16 + pick(s, rx, rz, 1 + tr, SALT + 5) % 224, z = rz * 256 + 16 + pick(s, rx, rz, 11 + tr, SALT + 5) % 224;
        if (biomeKey(gen, x, z) === 'snowy_plains' && gen.column(x, z).h > SEA + 1 && flat(gen, x, z, 4, 5, 2)) return bbox({ x: x, z: z, y: gen.column(x, z).h }, 9);
      }
      return null;
    },
    build: function (gen, h) {
      var P = new Plan(-64, 320, 'igloo'), g = h.y, cx = h.x, cz = h.z;
      // 雪のドーム（半径 4、高さ 4）。床は雪ブロック
      for (var dx = -4; dx <= 4; dx++) for (var dz = -4; dz <= 4; dz++) for (var dy = 0; dy <= 4; dy++) {
        var e = (dx * dx + dz * dz) / 18 + (dy * dy) / 16;
        if (e > 1.05) continue;
        var inner = (dx * dx + dz * dz) / 9.5 + (dy * dy) / 10 < 1 && dy < 4;
        P.set(cx + dx, g + 1 + dy, cz + dz, inner ? B.AIR : B.SNOW_BLOCK);
      }
      P.fill(cx - 3, g, cz - 3, cx + 3, g, cz + 3, B.SNOW_BLOCK);
      P.set(cx - 4, g + 2, cz, B.ICE); P.set(cx + 4, g + 2, cz, B.ICE);                                   // 窓
      // 入口の通路（南）
      for (var z = cz + 4; z <= cz + 6; z++) { P.set(cx - 1, g + 1, z, B.SNOW_BLOCK); P.set(cx - 1, g + 2, z, B.SNOW_BLOCK); P.set(cx + 1, g + 1, z, B.SNOW_BLOCK); P.set(cx + 1, g + 2, z, B.SNOW_BLOCK); P.set(cx, g + 3, z, B.SNOW_BLOCK); P.set(cx, g + 1, z, B.AIR); P.set(cx, g + 2, z, B.AIR); P.set(cx, g, z, B.SNOW_BLOCK); }
      // 中：ベッド・作業台・かまど・赤いじゅうたんの代わりの羊毛の床、トーチ
      P.set(cx - 2, g + 1, cz - 1, B.BED_FOOT_N); P.set(cx - 2, g + 1, cz - 2, B.BED_HEAD_N);
      P.set(cx + 2, g + 1, cz - 2, B.CRAFTING_TABLE); P.set(cx + 2, g + 1, cz - 1, B.FURNACE);
      P.set(cx, g, cz, B.RED_WOOL); P.set(cx - 1, g, cz + 1, B.RED_WOOL); P.set(cx + 1, g, cz + 1, B.RED_WOOL);
      P.set(cx, g + 3, cz - 3, B.WALL_TORCH_S);
      // 地下室：はしごで 8 段下り、石レンガの部屋に醸造台とチェスト
      var by = g - 9;
      P.set(cx, g, cz + 2, B.OAK_TRAPDOOR_B || B.AIR);
      for (var y = by + 1; y <= g - 1; y++) { P.set(cx, y, cz + 2, B.AIR); P.set(cx, y, cz + 3, B.STONE_BRICKS); P.ladder(cx, y, cz + 2, 0, -1); }
      P.box(cx - 4, by - 1, cz - 3, cx + 4, by + 4, cz + 3, B.STONE_BRICKS, B.AIR);
      P.fill(cx - 4, by - 1, cz - 3, cx + 4, by - 1, cz + 3, function (x, yy, zz) { return (x + zz) % 3 ? B.STONE_BRICKS : B.MOSSY_STONE_BRICKS; });
      P.set(cx, by + 4, cz + 2, B.AIR);
      P.set(cx - 3, by, cz - 2, B.BREWING_STAND || B.CAULDRON); P.chest(cx + 3, by, cz - 2, 'igloo'); P.set(cx, by, cz - 2, B.CAULDRON);
      P.torch(cx - 3, by + 2, cz, 1, 0); P.torch(cx + 3, by + 2, cz, -1, 0);
      P.set(cx - 3, by, cz + 2, B.COBWEB); P.set(cx + 3, by + 3, cz + 2, B.COBWEB);
      return P;
    }
  });

  // ---------------- 海底遺跡 ----------------
  spec({ key: 'or', dim: 'overworld', size: 192, reach: 10,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 7) >= 0.7) return null;
      for (var tr = 0; tr < 8; tr++) {
        var x = rx * 192 + 16 + pick(s, rx, rz, 1 + tr, SALT + 7) % 160, z = rz * 192 + 16 + pick(s, rx, rz, 11 + tr, SALT + 7) % 160, bk = biomeKey(gen, x, z), c = gen.column(x, z);
        if ((bk === 'ocean' || bk === 'frozen_ocean') && c.h < SEA - 6 && flat(gen, x, z, 4, 5, 3)) return bbox({ x: x, z: z, y: c.h, sandy: hash(s, x, 3, z, SALT + 8) % 2 }, 9);
      }
      return null;
    },
    build: function (gen, h) {
      var P = new Plan(-64, 320, 'ocean_ruin'), g = h.y, cx = h.x, cz = h.z, R = WG.StructAPI.rng(hash(gen.seed, cx, 5, cz, SALT + 9));
      var A = h.sandy ? [B.SANDSTONE, B.SANDSTONE, B.CUT_SANDSTONE || B.SANDSTONE] : [B.STONE_BRICKS, B.CRACKED_STONE_BRICKS, B.MOSSY_STONE_BRICKS];
      var W = function () { var r = R(); return r < 0.5 ? A[0] : r < 0.75 ? A[1] : A[2]; };
      P.clear = [cx - 6, cz - 7, cx + 6, cz + 7, g, g + 8];
      P.fill(cx - 4, g, cz - 5, cx + 4, g, cz + 5, W);
      for (var x = cx - 4; x <= cx + 4; x++) for (var z = cz - 5; z <= cz + 5; z++) {
        var wall = x === cx - 4 || x === cx + 4 || z === cz - 5 || z === cz + 5;
        for (var y = g + 1; y <= g + 5; y++) {
          var broken = y - g > 1 + Math.floor(R() * 5 + (wall ? 1 : 0));   // 崩れて高さがまちまち
          P.set(x, y, z, wall && !broken ? W() : B.WATER);
        }
      }
      P.fill(cx, g + 1, cz + 5, cx, g + 2, cz + 5, B.WATER);                   // 入口
      for (var k = 0; k < 6; k++) P.set(cx - 6 + Math.floor(R() * 13), g + 1, cz - 7 + Math.floor(R() * 15), R() < 0.5 ? B.GRAVEL : W());
      P.chest(cx + 2, g + 1, cz - 3, 'ocean_ruin');
      P.mob('DROWNED', cx - 1.5, g + 1, cz + 0.5); P.mob('DROWNED', cx + 1.5, g + 1, cz + 2.5);
      return P;
    }
  });

  // ---------------- 沼の小屋 ----------------
  spec({ key: 'wh', dim: 'overworld', size: 256, reach: 10,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 11) >= 0.7) return null;
      for (var tr = 0; tr < 10; tr++) {
        var x = rx * 256 + 16 + pick(s, rx, rz, 1 + tr, SALT + 11) % 224, z = rz * 256 + 16 + pick(s, rx, rz, 11 + tr, SALT + 11) % 224;
        if (biomeKey(gen, x, z) === 'swamp' && gen.column(x, z).h >= SEA - 3) return bbox({ x: x, z: z, y: Math.max(SEA, gen.column(x, z).h) }, 8);
      }
      return null;
    },
    build: function (gen, h) {
      var P = new Plan(-64, 320, 'swamp_hut'), f = h.y + 3, ox = h.x - 2, oz = h.z - 3, SP = B.SPRUCE_PLANKS, LOG = B.SPRUCE_LOG || B.OAK_LOG;
      P.fill(ox - 1, f, oz - 2, ox + 5, f + 6, oz + 7, B.AIR);
      // 脚（地面まで）
      [[0, 0], [4, 0], [0, 6], [4, 6]].forEach(function (q) { P.fill(ox + q[0], f - 3, oz + q[1], ox + q[0], f + 3, oz + q[1], LOG); P.found(ox + q[0], f - 4, oz + q[1], LOG); });
      P.fill(ox, f, oz - 1, ox + 4, f, oz + 6, SP);                             // 床と玄関の床
      for (var y = f + 1; y <= f + 3; y++) for (var i = 0; i <= 4; i++) { P.set(ox + i, y, oz, SP); P.set(ox + i, y, oz + 6, SP); }
      for (y = f + 1; y <= f + 3; y++) for (i = 1; i <= 5; i++) { P.set(ox, y, oz + i, SP); P.set(ox + 4, y, oz + i, SP); }
      [[0, 0], [4, 0], [0, 6], [4, 6]].forEach(function (q) { P.fill(ox + q[0], f + 1, oz + q[1], ox + q[0], f + 3, oz + q[1], LOG); });
      P.fill(ox + 2, f + 1, oz, ox + 2, f + 2, oz, B.AIR);                      // 入口（北）
      P.set(ox, f + 2, oz + 3, B.OAK_FENCE); P.set(ox + 4, f + 2, oz + 3, B.OAK_FENCE);   // 窓
      [ox - 1, ox + 5].forEach(function (x) { for (var z = oz - 2; z <= oz + 7; z++) P.set(x, f + 4, z, B.SPRUCE_SLAB || SP); });
      P.fill(ox, f + 4, oz - 2, ox + 4, f + 4, oz + 7, SP); P.fill(ox + 1, f + 5, oz - 2, ox + 3, f + 5, oz + 7, SP);
      P.set(ox, f + 1, oz - 1, B.OAK_FENCE); P.set(ox + 4, f + 1, oz - 1, B.OAK_FENCE);
      P.set(ox + 1, f + 1, oz + 5, B.CRAFTING_TABLE); P.set(ox + 3, f + 1, oz + 5, B.CAULDRON_2); P.set(ox + 1, f + 1, oz + 1, B.POTTED_RED_MUSHROOM || B.FLOWER_POT);
      P.mob('WITCH', ox + 2.5, f + 1, oz + 3.5);
      return P;
    }
  });

  // ---------------- 古代都市（深い地下の大きな空洞。中央に大きな門、まわりに小さな建物） ----------------
  spec({ key: 'ac', dim: 'overworld', size: 768, reach: 46, under: true,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 13) >= 0.6) return null;
      var x = rx * 768 + 80 + pick(s, rx, rz, 1, SALT + 13) % 608, z = rz * 768 + 80 + pick(s, rx, rz, 2, SALT + 13) % 608;
      if (biomeKey(gen, x, z) === 'ocean' || biomeKey(gen, x, z) === 'frozen_ocean') return null;
      return bbox({ x: x, z: z, y: -50 }, 44);
    },
    build: function (gen, h) {
      var P = new Plan(-64, 320, 'ancient_city'), y0 = h.y, cx = h.x, cz = h.z, R = WG.StructAPI.rng(hash(gen.seed, cx, 11, cz, SALT + 14));
      var BR = function () { var r = R(); return r < 0.7 ? B.DEEPSLATE_BRICKS : r < 0.9 ? B.CRACKED_DEEPSLATE_BRICKS : B.DEEPSLATE_TILES; };
      P.shriekers = [];
      // 空洞：楕円の床、丸い天井
      for (var dx = -42; dx <= 42; dx++) for (var dz = -30; dz <= 30; dz++) {
        var u = (dx / 42) * (dx / 42) + (dz / 30) * (dz / 30);
        if (u > 1) continue;
        var top = y0 + 7 + Math.round(13 * Math.sqrt(1 - u)) + (hash(gen.seed, cx + dx, 1, cz + dz, SALT + 15) % 3);
        for (var y = y0; y <= top; y++) P.set(cx + dx, y, cz + dz, B.AIR);
        // 床：スカルクの広がり（粗いまだら）と深層岩タイル
        var n = (hash(gen.seed, (cx + dx) >> 2, 2, (cz + dz) >> 2, SALT + 16) % 100) / 100 * 0.7 + (hash(gen.seed, cx + dx, 3, cz + dz, SALT + 16) % 100) / 100 * 0.3;
        P.set(cx + dx, y0 - 1, cz + dz, n < 0.42 ? B.SCULK : (dx + dz) % 2 ? B.DEEPSLATE_TILES : B.DEEPSLATE_BRICKS);
        if (n < 0.08) P.set(cx + dx, top + 1, cz + dz, B.SCULK);
      }
      // 大通り（タイル）
      for (dz = -24; dz <= 8; dz++) for (dx = -2; dx <= 2; dx++) P.set(cx + dx, y0 - 1, cz + dz, Math.abs(dx) === 2 ? B.DEEPSLATE_BRICKS : B.DEEPSLATE_TILES);
      // 中央の大きな門（北）：台・2 本の柱・上の梁・内側の枠
      var gz = cz + 12;
      P.fill(cx - 15, y0, gz - 2, cx + 15, y0 + 2, gz + 4, BR);
      for (var s2 = 0; s2 < 3; s2++) P.fill(cx - 4, y0 + s2, gz - 3 - (2 - s2), cx + 4, y0 + s2, gz - 3 - (2 - s2), B.DEEPSLATE_TILES);   // 正面の段
      [-1, 1].forEach(function (sd) {
        P.fill(cx + sd * 9, y0 + 3, gz, cx + sd * 12, y0 + 17, gz + 2, BR);
        P.fill(cx + sd * 10, y0 + 6, gz - 1, cx + sd * 11, y0 + 6, gz - 1, B.CHISELED_DEEPSLATE); P.fill(cx + sd * 10, y0 + 12, gz - 1, cx + sd * 11, y0 + 12, gz - 1, B.CHISELED_DEEPSLATE);
      });
      P.fill(cx - 12, y0 + 18, gz, cx + 12, y0 + 20, gz + 2, BR); P.fill(cx - 6, y0 + 21, gz, cx + 6, y0 + 21, gz + 2, B.DEEPSLATE_TILES);
      for (var k = -8; k <= 8; k++) { P.set(cx + k, y0 + 17, gz + 1, B.CHISELED_DEEPSLATE); }
      // 内側の枠（暗い深層岩）と、門の下のスカルク
      for (k = -6; k <= 6; k++) { P.set(cx + k, y0 + 4, gz + 1, B.DEEPSLATE_TILES); P.set(cx + k, y0 + 15, gz + 1, B.DEEPSLATE_TILES); }
      for (y = y0 + 4; y <= y0 + 15; y++) { P.set(cx - 7, y, gz + 1, B.DEEPSLATE_TILES); P.set(cx + 7, y, gz + 1, B.DEEPSLATE_TILES); }
      P.fill(cx - 6, y0 + 3, gz - 1, cx + 6, y0 + 3, gz + 3, B.SCULK);
      // 小さな建物（扉は大通りのほう）。中に宝箱・魂のランタン・スカルクセンサー
      [[-28, -14], [-16, -20], [16, -20], [28, -14], [-30, 2], [30, 2]].forEach(function (q, bi) {
        var bx = cx + q[0], bz = cz + q[1];
        P.fill(bx - 3, y0 - 1, bz - 3, bx + 3, y0 - 1, bz + 3, B.DEEPSLATE_TILES);
        for (var yy = y0; yy <= y0 + 4; yy++) for (var i = -3; i <= 3; i++) [[i, -3], [i, 3], [-3, i], [3, i]].forEach(function (c) { P.set(bx + c[0], yy, bz + c[1], R() < 0.12 && yy > y0 + 1 ? B.AIR : BR()); });
        P.fill(bx - 3, y0 + 5, bz - 3, bx + 3, y0 + 5, bz + 3, B.DEEPSLATE_TILES); P.fill(bx - 2, y0 + 6, bz - 2, bx + 2, y0 + 6, bz + 2, B.DEEPSLATE_BRICKS);
        var ddx = q[0] < 0 ? 3 : -3;
        P.fill(bx + ddx, y0, bz, bx + ddx, y0 + 2, bz, B.AIR);
        P.chest(bx - ddx / 3 * 2, y0, bz - 2, 'ancient_city');
        P.set(bx, y0, bz + 2, B.SCULK_SENSOR); P.set(bx - ddx / 3 * 2, y0, bz + 2, B.SOUL_LANTERN);
        if (bi % 2 === 0) P.set(bx, y0 + 4, bz, B.SOUL_LANTERN);
      });
      // 大通りの灯り（柱の上の魂のランタン）
      for (dz = -22; dz <= 4; dz += 7) [-4, 4].forEach(function (sx) { P.fill(cx + sx, y0, cz + dz, cx + sx, y0 + 2, cz + dz, B.DEEPSLATE_BRICKS); P.set(cx + sx, y0 + 3, cz + dz, B.SOUL_LANTERN); });
      // スカルクシュリーカーとセンサー（床のスカルクの上）
      for (k = 0; k < 14; k++) {
        var sx2 = cx - 36 + Math.floor(R() * 72), sz2 = cz - 24 + Math.floor(R() * 36);
        if (Math.abs(sx2 - cx) < 4) continue;
        if (k < 8) { P.set(sx2, y0 - 1, sz2, B.SCULK_SHRIEKER); P.shriekers.push([sx2, y0 - 1, sz2]); }
        else P.set(sx2, y0, sz2, B.SCULK_SENSOR);
      }
      P.floor = [[cx, y0, cz - 10]];
      return P;
    }
  });

  // ---------------- スカルクシュリーカー：踏む・近くで音を立てると叫び、3 回目で深淵の番人 ----------------
  Game.prototype.shriek = function (x, y, z) {
    var wd = this.world, now = this.tickCount || 0;
    if (this.mode !== 'survival' || (wd.shriekAt && now - wd.shriekAt < 100)) return false;
    wd.shriekAt = now; wd.warning = (wd.warning || 0) + 1;
    for (var k = 0; k < 4; k++) this.particles.push({ x: x + 0.5, y: y + 1.2 + k * 0.4, z: z + 0.5, vx: 0, vy: 0.08, vz: 0, life: 18, c: [90, 200, 210], glow: true, fw: true });
    this.puff(x + 0.5, y + 1.2, z + 0.5, [40, 120, 130], 14, 0.5);
    if (WG.Sound) WG.Sound.play('shriek', x + 0.5, y + 1, z + 0.5);
    this.addEffect('DARKNESS', 240, 0);
    if (this.ui && this.ui.toast) this.ui.toast(wd.warning >= 3 ? '深淵の番人が目を覚ました' : 'スカルクシュリーカーが叫んだ（' + wd.warning + '/3）');
    if (wd.warning >= 3) {
      wd.warning = 0;
      var p = this.walker.pos, self = this;
      if (this.mobs.list.some(function (m) { return m.type === 'DEEP_WARDEN' && !m.dead && Math.hypot(m.x - p[0], m.z - p[2]) < 48; })) return true;
      for (var t = 0; t < 20; t++) {
        var a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 5, wx = Math.floor(p[0] + Math.cos(a) * r), wz = Math.floor(p[2] + Math.sin(a) * r), wy = Math.floor(p[1]);
        if (WG.COLLIDE[wd.block(wx, wy - 1, wz)] >= 1 && !WG.COLLIDE[wd.block(wx, wy, wz)] && !WG.COLLIDE[wd.block(wx, wy + 1, wz)] && !WG.COLLIDE[wd.block(wx, wy + 2, wz)]) {
          var m = this.mobs.spawn('DEEP_WARDEN', wx + 0.5, wy, wz + 0.5);
          if (m) { m.emerge = 60; m.ai.heard = 200; }
          for (var q = 0; q < 6; q++) this.puff(wx + 0.5, wy + 0.2, wz + 0.5, [30, 70, 80], 10, 0.8);
          if (WG.Sound) WG.Sound.play('explode', wx, wy, wz);
          break;
        }
      }
    }
    return true;
  };
  WG.EFFECTS.DARKNESS = ['暗闇', '#292721'];
  if (Game.prototype.vibrate) {
    var vibrate = Game.prototype.vibrate;
    Game.prototype.vibrate = function (x, y, z) {
      var r = vibrate.apply(this, arguments), wd = this.world;
      if (wd.dimKey !== 'overworld' || y > 0) return r;
      for (var dx = -8; dx <= 8; dx++) for (var dz = -8; dz <= 8; dz++) for (var dy = -3; dy <= 3; dy++) {
        var bx = Math.floor(x) + dx, by = Math.floor(y) + dy, bz = Math.floor(z) + dz;
        if (wd.block(bx, by, bz) === B.SCULK_SHRIEKER) { this.shriek(bx, by, bz); return r; }
      }
      return r;
    };
  }
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    var r = tickExtra.apply(this, arguments), w = this.walker, wd = this.world;
    this.tickFangs();
    if (!this.dead && this.mode === 'survival') {
      var fx = Math.floor(w.pos[0]), fy = Math.floor(w.pos[1] - 0.05), fz = Math.floor(w.pos[2]), under = wd.block(fx, fy, fz);
      if (under === B.SCULK_SHRIEKER && w.vel && Math.hypot(w.vel[0], w.vel[2]) > 0.02 && !w.sneak) this.shriek(fx, fy, fz);
      // マグマブロック：しゃがまずに乗ると熱い
      if (under === B.MAGMA_BLOCK && !w.sneak && !(this.effects && this.effects.FIRE_RESISTANCE) && !(this.invuln > 0)) this.damage(1, false, 'fire');
    }
    if ((this.tickCount || 0) % 2400 === 0 && wd.warning > 0) wd.warning--;   // 叫んだ回数は、時間がたつと減る
    // 暗闇：画面の暗さを、ゆっくり脈打たせる
    if (typeof document !== 'undefined') {
      var e = this.effects && this.effects.DARKNESS, el = this._darkEl;
      if (e && !el) { el = this._darkEl = document.createElement('div'); el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;background:radial-gradient(ellipse at center, rgba(0,0,0,.25) 0%, rgba(0,0,0,.92) 70%)'; document.body.appendChild(el); }
      if (el) { if (!e) { el.remove(); this._darkEl = null; } else el.style.opacity = String(Math.min(1, e.t / 40) * (0.55 + 0.35 * Math.sin((this.tickCount || 0) * 0.08))); }
    }
    return r;
  };
  // 番人は地面からゆっくり出てくる（その間は動かない）
  var mtick = Mobs.prototype.tick;
  Mobs.prototype.tick = function () {
    var em = this.list.filter(function (m) { return m.emerge > 0; }).map(function (m) { return [m, m.x, m.z]; });
    var r = mtick.apply(this, arguments), g = this.game;
    em.forEach(function (q) { var m = q[0]; m.emerge--; m.x = q[1]; m.z = q[2]; m.vx = m.vz = 0; if (m.emerge % 6 === 0) g.puff(m.x, m.y + 0.2, m.z, [30, 70, 80], 4, 0.6); });
    return r;
  };
  var mdraw = Mobs.prototype.draw;
  Mobs.prototype.draw = function (bt, a, cube) {
    var em = this.list.filter(function (m) { return m.emerge > 0; });
    if (!em.length) return mdraw.apply(this, arguments);
    var saved = em.map(function (m) { var s = [m.y, m.py]; var k = m.emerge / 60 * 2.9; m.y -= k; m.py -= k; return s; });
    try { return mdraw.apply(this, arguments); } finally { em.forEach(function (m, i) { m.y = saved[i][0]; m.py = saved[i][1]; }); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
