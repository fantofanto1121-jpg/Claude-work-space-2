// 新しい動物（ロードマップ 第 1 段階）
// ・ラマ：サバンナと岩山に群れで。叩くと怒って、つばを吐く。毛の色は 4 種
// ・アホロートル：ジャングルと沼の水の中。色は 5 種（青はまれ）。魚を追う
// ・カエル：沼に。バイオームで色が違う（沼は橙、暑い所は白、寒い所は緑）。跳ねて進む
// ・オタマジャクシ：沼の水の中。しばらくするとカエルになる
// ・キノコ牛：赤い体に白い斑、背中にキノコ。ハサミで刈ると牛とキノコ、ボウルでキノコシチュー
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Game = WG.Game, Mobs = WG.Mobs, TYPES = WG.MOB_TYPES, MODELS = WG.MOB_MODELS;
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function box(x, y, z, w, h, d, c, sw, extra) { var b = { o: [x, y, z], s: [w, h, d], c: hex(c), sw: sw || null }; for (var k in extra || {}) b[k] = extra[k]; return b; }
  var EYE = '#1f1d1c', TINT = { tint: 1 };

  // ---------------- 見た目 ----------------
  MODELS.LLAMA = [box(-5, 0, 4, 3, 12, 3, '#c8b08a', 'L1', TINT), box(2, 0, 4, 3, 12, 3, '#c8b08a', 'L2', TINT), box(-5, 0, -8, 3, 12, 3, '#c8b08a', 'L2', TINT), box(2, 0, -8, 3, 12, 3, '#c8b08a', 'L1', TINT),
    box(-6, 11, -10, 12, 10, 18, '#e0cca4', null, TINT), box(-4, 18, 5, 8, 13, 6, '#e0cca4', null, TINT), box(-4, 28, 6, 8, 6, 9, '#e0cca4', null, TINT),
    box(-2, 28, 14.5, 4, 4, 2, '#d8c49c'), box(-1.2, 30, 16.5, 0.8, 1, 0.3, '#5a4a3a'), box(0.4, 30, 16.5, 0.8, 1, 0.3, '#5a4a3a'),
    box(-4, 34, 9, 2, 4, 1.5, '#c8b08a', null, TINT), box(2, 34, 9, 2, 4, 1.5, '#c8b08a', null, TINT),
    box(-3.5, 32, 14.9, 1.2, 1.2, 0.3, EYE), box(2.3, 32, 14.9, 1.2, 1.2, 0.3, EYE), box(-1.5, 14, -11, 3, 5, 2, '#d8c49c', 'T1', TINT),
    box(-6.2, 19.5, -6, 12.4, 1.6, 11, '#b83a2a'), box(-6.3, 18.5, -6, 0.3, 1, 11, '#e8c040'), box(5.95, 18.5, -6, 0.3, 1, 11, '#e8c040')];   // 鞍掛けの布
  MODELS.AXOLOTL = [box(-1.5, 0, 2, 1.5, 1.5, 1.5, '#e8a0b8', 'L1', TINT), box(0, 0, 2, 1.5, 1.5, 1.5, '#e8a0b8', 'L2', TINT), box(-1.5, 0, -3, 1.5, 1.5, 1.5, '#e8a0b8', 'L2', TINT), box(0, 0, -3, 1.5, 1.5, 1.5, '#e8a0b8', 'L1', TINT),
    box(-2, 1, -4, 4, 3, 9, '#f0a8c0', null, TINT), box(-2.5, 1, 4.5, 5, 3, 4, '#f0a8c0', null, TINT), box(-0.5, 1.5, -10, 1, 3, 6, '#e898b0', 'T1', TINT),
    box(-4, 3, 6, 1.5, 2, 0.5, '#d84878'), box(2.5, 3, 6, 1.5, 2, 0.5, '#d84878'), box(-3.5, 4, 5.5, 1, 1.5, 0.5, '#d84878'), box(2.5, 4, 5.5, 1, 1.5, 0.5, '#d84878'),   // えらの房
    box(-2, 3, 8.5, 0.8, 0.8, 0.3, EYE), box(1.2, 3, 8.5, 0.8, 0.8, 0.3, EYE), box(-1, 1.6, 8.5, 2, 0.4, 0.3, '#a85870')];
  MODELS.FROG = [box(-3.5, 0, 1, 2, 2, 2, '#b8683a', 'L2', TINT), box(1.5, 0, 1, 2, 2, 2, '#b8683a', 'L1', TINT), box(-4.5, 0, -4, 3, 1.5, 4, '#b8683a', 'L1', TINT), box(1.5, 0, -4, 3, 1.5, 4, '#b8683a', 'L2', TINT),
    box(-3.5, 1.5, -3.5, 7, 3.5, 8, '#c8783a', null, TINT), box(-3.5, 5, -1, 7, 1.5, 5.5, '#c8783a', null, TINT), box(-3.5, 2.5, 4.4, 7, 1, 0.3, '#f0d8a8'),
    box(-3.5, 5.5, 2, 2.5, 2, 2.5, '#d8884a', null, TINT), box(1, 5.5, 2, 2.5, 2, 2.5, '#d8884a', null, TINT),   // 飛び出た目
    box(-3, 6, 4.3, 1.5, 1.2, 0.3, EYE), box(1.5, 6, 4.3, 1.5, 1.2, 0.3, EYE), box(-3.2, 2.5, -3.6, 6.4, 2, 0.3, '#f0d8a8')];
  MODELS.TADPOLE = [box(-1, 0, -0.5, 2, 1.5, 2.5, '#5a4632'), box(-0.25, 0.3, -3.5, 0.5, 1, 3, '#6a5640', 'T1'), box(-0.8, 1, 1.9, 0.5, 0.5, 0.3, '#101010'), box(0.3, 1, 1.9, 0.5, 0.5, 0.3, '#101010')];
  MODELS.MUSHROOM_COW = [box(-6, 0, 4, 4, 12, 4, '#9a2a22', 'L1'), box(2, 0, 4, 4, 12, 4, '#9a2a22', 'L2'), box(-6, 0, -8, 4, 12, 4, '#9a2a22', 'L2'), box(2, 0, -8, 4, 12, 4, '#9a2a22', 'L1'),
    box(-6, 11, -9, 12, 10, 18, '#a8282a'), box(-6.1, 14, -5, 0.3, 4, 5, '#e8e0d4'), box(5.8, 13, 0, 0.3, 5, 4, '#e8e0d4'), box(-3, 20.9, -4, 6, 0.3, 4, '#e8e0d4'),
    box(-4, 15, 8, 8, 8, 6, '#a8282a'), box(-3, 15, 14, 6, 4, 0.3, '#e0d0c0'), box(-2, 16, 14.3, 1, 1, 0.2, '#5a3028'), box(1, 16, 14.3, 1, 1, 0.2, '#5a3028'),
    box(-5, 22, 10, 1, 3, 1, '#d8cfb8'), box(4, 22, 10, 1, 3, 1, '#d8cfb8'), box(-3, 20, 14, 1, 1, 0.3, EYE), box(2, 20, 14, 1, 1, 0.3, EYE), box(-0.5, 12, -10, 1, 8, 1, '#a8282a', 'T1')];
  // 背中と頭のキノコ（刈ると消える）
  [[-3, -6], [2, -1], [-2, 4], [0, 10.5]].forEach(function (q, i) {
    var y = i === 3 ? 23 : 21, sh = function (m) { return !m.sheared; };
    MODELS.MUSHROOM_COW.push(box(q[0] - 0.5, y, q[1] - 0.5, 1, 2, 1, '#e8dcc8', null, { only: sh }), box(q[0] - 2, y + 2, q[1] - 2, 4, 1.5, 4, '#c42a24', null, { only: sh }),
      box(q[0] - 1, y + 3.5, q[1] - 1, 2, 0.6, 2, '#c42a24', null, { only: sh }), box(q[0] - 1.2, y + 3.4, q[1] + 0.8, 0.8, 0.3, 0.8, '#f4f0e8', null, { only: sh }));
  });

  // ---------------- 種類 ----------------
  function T(k, o) { TYPES[k] = Object.assign({ food: [], drops: [] }, o); if (WG.MOB_ORDER.indexOf(k) < 0) WG.MOB_ORDER.push(k); ITEMS['SPAWN_EGG_' + k] = { key: 'SPAWN_EGG_' + k, name: o.name + 'のスポーンエッグ', block: -1, max: 64, shape: 'lump', color: '#888888', egg: k }; }
  T('LLAMA', { name: 'ラマ', w: 0.9, h: 1.87, hp: 22, speed: 0.06, food: ['WHEAT', 'HAY_BLOCK'], breed: ['HAY_BLOCK'], breeds: true, spits: true, drops: [['LEATHER', 0, 2]] });
  T('AXOLOTL', { name: 'アホロートル', w: 0.75, h: 0.42, hp: 14, speed: 0.06, swims: true, swimOk: true, hunts: ['FISH', 'SQUID'], food: ['TROPICAL_FISH'], breed: ['TROPICAL_FISH'], breeds: true });
  T('FROG', { name: 'カエル', w: 0.5, h: 0.55, hp: 10, speed: 0.07, swimOk: true, hops: true, food: ['SLIME_BALL'], breed: ['SLIME_BALL'], breeds: true, noFall: true });
  T('TADPOLE', { name: 'オタマジャクシ', w: 0.4, h: 0.3, hp: 6, speed: 0.04, swims: true });
  T('MUSHROOM_COW', { name: 'キノコ牛', w: 0.9, h: 1.4, hp: 10, speed: 0.06, food: ['WHEAT'], breed: ['WHEAT'], breeds: true, drops: [['LEATHER', 0, 2], ['RAW_BEEF', 1, 3]] });
  var LLAMA_C = [[224, 204, 164], [236, 232, 222], [138, 100, 70], [150, 146, 140]];
  var AXO_C = [[240, 168, 192], [138, 92, 62], [232, 192, 80], [168, 224, 240], [70, 100, 210]];
  var FROG_C = { warm: [226, 214, 186], cold: [96, 144, 70], temperate: [200, 120, 58] };
  var spawn = Mobs.prototype.spawn;
  Mobs.prototype.spawn = function (type, x, y, z) {
    var m = spawn.apply(this, arguments);
    if (!m) return m;
    if (type === 'LLAMA') m.tint = LLAMA_C[Math.floor(Math.random() * 4)];
    if (type === 'AXOLOTL') m.tint = AXO_C[Math.random() < 0.01 ? 4 : Math.floor(Math.random() * 4)];
    if (type === 'FROG') {
      var wd = this.world, bk = wd.biomeAt ? WG.BIOMES[wd.biomeAt(Math.floor(x), Math.floor(z))].key : 'swamp';
      m.tint = FROG_C[/desert|jungle|savanna/.test(bk) ? 'warm' : /snowy|frozen/.test(bk) ? 'cold' : 'temperate'];
    }
    if (type === 'TADPOLE') m.grow = 24000;
    return m;
  };

  // ---------------- 動き：ラマのつば、カエルの跳ね、オタマジャクシが育つ ----------------
  var hurt = Mobs.prototype.hurt;
  Mobs.prototype.hurt = function (m, amount, from) {
    if (m.type === 'LLAMA' && from) m.angry = 300;
    return hurt.apply(this, arguments);
  };
  var special = Mobs.prototype.special;
  Mobs.prototype.special = function (m, T2, dist, dx, dy, dz) {
    if (m.type === 'LLAMA' && m.angry > 0) {
      var g = this.game;
      m.angry--;
      if (g.mode === 'survival' && !g.dead && dist < 14) {
        m.yaw = Math.atan2(dx, dz);
        if ((m.age || 0) % 40 === 0) { this.fireShot(m, 'spit'); if (WG.Sound) WG.Sound.play('pop', m.x, m.y + 1.6, m.z); }
        return { want: dist < 4 ? [m.x - dx, m.z - dz] : null, speed: T2.speed, chase: true };
      }
    }
    return special.apply(this, arguments);
  };
  var tickShots = Mobs.prototype.tickShots;
  Mobs.prototype.tickShots = function () {
    var spits = (this.shots || []).filter(function (s) { return s.kind === 'spit'; });
    var r = tickShots.apply(this, arguments), g = this.game, now = this.shots || [], w = g.walker;
    spits.forEach(function (s) {
      if (now.indexOf(s) >= 0) { g.particles.push({ x: s.x, y: s.y, z: s.z, vx: 0, vy: -0.01, vz: 0, life: 6, c: [236, 236, 228] }); return; }
      g.puff(s.x, s.y, s.z, [236, 236, 228], 6, 0.2);
      if (Math.hypot(w.pos[0] - s.x, w.pos[1] + 0.9 - s.y, w.pos[2] - s.z) < 1.6) g.hurtPlayer(1, s.x - s.vx, s.z - s.vz, 'projectile');
    });
    return r;
  };
  var mtick = Mobs.prototype.tick;
  Mobs.prototype.tick = function () {
    var r = mtick.apply(this, arguments), self = this, add = [];
    this.list.forEach(function (m) {
      if (m.dead) return;
      // カエル：地面にいて動いていると、ぴょんと跳ねる
      if (m.type === 'FROG' && m.ground && Math.hypot(m.vx, m.vz) > 0.01 && (m.age % 14) === 0) { m.vy = 0.36; m.vx *= 2.2; m.vz *= 2.2; }
      // オタマジャクシは育つとカエルに
      if (m.type === 'TADPOLE' && --m.grow <= 0) { m.dead = 1; m.silentDeath = true; add.push([m.x, m.y, m.z]); }
    });
    if (add.length) { this.list = this.list.filter(function (m) { return !m.silentDeath; }); add.forEach(function (p) { var f = self.spawn('FROG', p[0], p[1] + 0.2, p[2]); if (f) self.game.puff(p[0], p[1] + 0.3, p[2], [120, 200, 90], 6, 0.3); }); }
    return r;
  };

  // ---------------- キノコ牛：ハサミで刈る・ボウルでシチュー ----------------
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var mt = this.mobs.target && this.mobs.target.mob, held = this.inv.held(), surv = this.mode === 'survival';
    if (mt && !mt.dead && mt.type === 'MUSHROOM_COW' && held && !mt.baby) {
      if (held.key === 'SHEARS' && !mt.sheared) {
        mt.sheared = true; mt.dead = 1; mt.silentDeath = true; this.mobs.list = this.mobs.list.filter(function (m) { return m !== mt; });
        var cow = this.mobs.spawn('COW', mt.x, mt.y, mt.z); if (cow) { cow.yaw = cow.pyaw = mt.yaw; }
        this.spawnItem('RED_MUSHROOM', 5, mt.x, mt.y + 1.2, mt.z, 0.15, 10);
        this.puff(mt.x, mt.y + 1, mt.z, [200, 60, 50], 16, 0.6);
        if (surv && this.wearItem) this.wearItem(this.inv.sel, 1);
        if (WG.Sound) WG.Sound.play('break', mt.x, mt.y + 1, mt.z, 'grass');
        this.mouseR = this.clickR = false; return;
      }
      if (held.key === 'BOWL') {
        if (held.n === 1) this.inv.slots[this.inv.sel] = { key: 'MUSHROOM_STEW', n: 1 }; else { this.inv.take(this.inv.sel, 1); if (!this.inv.add('MUSHROOM_STEW', 1)) this.spawnItem('MUSHROOM_STEW', 1, mt.x, mt.y + 1, mt.z, 0.1, 10); }
        this.inv.changed(); this.mouseR = this.clickR = false; return;
      }
    }
    return use.apply(this, arguments);
  };

  // ---------------- 生まれる場所（初めて読み込んだチャンク） ----------------
  function findWater(wd, x0, z0, h) {
    for (var t = 0; t < 20; t++) {
      var x = x0 + Math.floor(Math.random() * 16), z = z0 + Math.floor(Math.random() * 16);
      for (var y = h + 2; y > h - 8; y--) if (WG.isWater(wd.block(x, y, z)) && WG.isWater(wd.block(x, y - 1, z))) return [x + 0.5, y - 1, z + 0.5];
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
    var x0 = cx << 4, z0 = cz << 4, h = c.hmap[136], bk = WG.BIOMES[wd.biomeAt(x0 + 8, z0 + 8)].key, self = this, p, k;
    function group(type, n, at) { for (k = 0; k < n && at; k++) self.spawn(type, at[0] + (Math.random() - 0.5) * 2, at[1], at[2] + (Math.random() - 0.5) * 2); }
    if ((bk === 'savanna' || bk === 'rocky_mountain') && Math.random() < 0.05) group('LLAMA', 2 + Math.floor(Math.random() * 3), findLand(wd, x0, z0, h));
    if ((bk === 'swamp' || bk === 'jungle') && Math.random() < 0.06) group('AXOLOTL', 1 + Math.floor(Math.random() * 3), findWater(wd, x0, z0, h));
    if ((bk === 'swamp' || bk === 'mangrove_swamp') && Math.random() < 0.08) { group('FROG', 2 + Math.floor(Math.random() * 3), findLand(wd, x0, z0, h)); if (Math.random() < 0.5) group('TADPOLE', 3, findWater(wd, x0, z0, h)); }
    if (bk === 'mushroom_fields' && Math.random() < 0.25) group('MUSHROOM_COW', 2 + Math.floor(Math.random() * 3), findLand(wd, x0, z0, h));   // キノコ島に
    if (bk === 'mangrove_swamp' && Math.random() < 0.08) group('FROG', 2 + Math.floor(Math.random() * 2), findLand(wd, x0, z0, h));
    return r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
