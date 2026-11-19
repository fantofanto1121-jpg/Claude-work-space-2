// 生き物：豚・牛・羊・鶏（食べられる）と、ゾンビ・スケルトン・ハゼゴケ（敵）。
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
    SPIDER: (function () {
      var c = '#2f2823', d = '#3b322b', out = [box(-5, 4, -12, 10, 8, 11, c), box(-3, 5, -1, 6, 6, 6, d), box(-4, 4, 5, 8, 8, 7, c),
        box(-3, 9, 11.9, 2, 1, 0.3, '#d23224'), box(1, 9, 11.9, 2, 1, 0.3, '#d23224'), box(-2, 7, 11.9, 1, 1, 0.3, '#b02a20'), box(1, 7, 11.9, 1, 1, 0.3, '#b02a20')];
      [-1, 1].forEach(function (s) { [-0.5, 1.2, 2.9, 4.6].forEach(function (z, i) { out.push(box(s > 0 ? 3 : -15, 7, z, 12, 1, 1, c, (i + (s > 0 ? 1 : 0)) % 2 ? 'L1' : 'L2')); }); });
      return out;
    })(),
    // ハゼゴケ：苔むした丸い体に、短い脚と琥珀色の目
    BOMBER: [
      box(-6, 0, 2, 3, 4, 3, '#3d4836', 'L1'), box(3, 0, 2, 3, 4, 3, '#3d4836', 'L2'),
      box(-6, 0, -5, 3, 4, 3, '#3d4836', 'L2'), box(3, 0, -5, 3, 4, 3, '#3d4836', 'L1'),
      box(-6, 3, -6, 12, 11, 12, '#5d7a48'), box(-5, 14, -5, 10, 2, 10, '#6c8a52'),
      box(-6.2, 6, -3, 0.3, 3, 3, '#3e5631'), box(5.9, 9, 0, 0.3, 3, 3, '#3e5631'), box(-2, 15.9, -3, 3, 0.3, 3, '#a3a35a'),
      box(1, 5, -6.2, 3, 2, 0.3, '#a3a35a'), box(-4, 9, 6, 2, 2, 0.3, '#e0b04a'), box(2, 9, 6, 2, 2, 0.3, '#e0b04a')
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
    SPIDER: { name: 'クモ', w: 1.4, h: 0.9, hp: 16, speed: 0.11, hostile: true, range: 16, climbs: true, drops: [['STRING', 0, 2], ['SPIDER_EYE', 0, 1]] }
  };
  var PASSIVE = ['PIG', 'COW', 'SHEEP', 'CHICKEN'], PASSIVE_W = [10, 8, 12, 10];
  var HOSTILE = ['ZOMBIE', 'SKELETON', 'BOMBER', 'SPIDER'], HOSTILE_W = [40, 40, 20, 30];
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

  Mobs.prototype.spawn = function (type, x, y, z) {
    var T = TYPES[type];
    var m = { type: type, x: x, y: y, z: z, px: x, py: y, pz: z, vx: 0, vy: 0, vz: 0, yaw: Math.random() * Math.PI * 2, pyaw: 0,
      hp: T.hp, maxHp: T.hp, hurt: 0, invul: 0, dead: 0, ground: false, walk: 0, pwalk: 0, ai: { timer: 0, tx: null, tz: null, panic: 0, cd: 0, fuse: 0, pfuse: 0 }, fire: 0, age: 0 };
    m.pyaw = m.yaw;
    this.list.push(m);
    return m;
  };

  function box3(m) { var T = TYPES[m.type]; return [m.x - T.w / 2, m.y, m.z - T.w / 2, m.x + T.w / 2, m.y + T.h, m.z + T.w / 2]; }

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
      var dx = p[0] - m.x, dz = p[2] - m.z, dist = Math.hypot(dx, dz), dy = p[1] - m.y;
      // 遠くの敵は消える（Minecraft と同じく 128 ブロックより遠いとすぐ、32 より遠いと少しずつ）
      if (T.hostile && (dist > 128 || (dist > 32 && Math.random() < 1 / 800))) continue;
      this.think(m, T, dist, dx, dy, dz);
      this.physics(m, T);
      // 日光で燃える（ゾンビ・スケルトン）
      if (T.burns && wd.dimKey === 'overworld' && g.sky()) {
        var lv = w.lightLevels(m.x, m.y + T.h - 0.2, m.z), daySky = lv[0] - (g.sky().dark || 0);
        if (daySky >= 13 && !WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y + 0.5), Math.floor(m.z)))) m.fire = 40;
      }
      // 燃えている間は 1 秒ごとに 1 減る（燃える時間とは別に数える）
      if (m.fire > 0) { m.fire--; m.burnT = (m.burnT || 0) + 1; if (m.burnT % 20 === 0) this.hurt(m, 1, null); if (WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y + 0.5), Math.floor(m.z)))) m.fire = 0; }
      if (WG.isLava(wd.block(Math.floor(m.x), Math.floor(m.y + 0.3), Math.floor(m.z)))) { this.hurt(m, 4, null); m.fire = 100; }
      if (m.poison > 0) { if (--m.poison % 25 === 0 && m.hp > 1) this.hurt(m, 1, null); }
      if (m.y < wd.minY - 64) continue;
      if (m.removed) continue;
      keep.push(m);
    }
    // 重なった生き物は少し押し合う
    for (i = 0; i < keep.length; i++) for (var j = i + 1; j < keep.length; j++) {
      var a = keep[i], b = keep[j], ox = a.x - b.x, oz = a.z - b.z, d2 = ox * ox + oz * oz, r = (TYPES[a.type].w + TYPES[b.type].w) / 2;
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
    if (!T.hostile) {
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
      if (m.type === 'ZOMBIE' || m.type === 'SPIDER') {
        want = [w.pos[0], w.pos[2]];
        if (ai.cd > 0) ai.cd--;
        if (dist < 0.3 + T.w / 2 + 0.7 && Math.abs(dy) < 1.5 && ai.cd === 0) { g.hurtPlayer(m.type === 'SPIDER' ? 2 : 3, m.x, m.z); ai.cd = 20; }
        // クモは近づくと跳びかかる
        if (m.type === 'SPIDER' && m.ground && dist > 2 && dist < 4 && Math.random() < 0.1) { m.vy = 0.4; m.vx += dx / dist * 0.25; m.vz += dz / dist * 0.25; }
      } else if (m.type === 'SKELETON') {
        // 間合いを取って射る
        if (dist > 12) want = [w.pos[0], w.pos[2]];
        else if (dist < 5) want = [m.x - dx, m.z - dz];
        if (ai.cd > 0) ai.cd--;
        else { this.shoot(m, T); ai.cd = 30 + Math.floor(Math.random() * 30); }
        m.yaw = Math.atan2(dx, dz);
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
          if (m.type !== 'SKELETON' || !targetPlayer) m.yaw = Math.atan2(tx, tz);
          if (m.collided && m.ground) m.vy = 0.42;   // 段差はジャンプ
        }
      }
    }
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
    var inWater = WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y + T.h * 0.4), Math.floor(m.z)));
    if (inWater) { m.vy += 0.04; m.vy *= 0.8; } else { m.vy -= 0.08; }
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
    var f = m.ground ? 0.546 : inWater ? 0.8 : 0.91;
    m.vx *= f; m.vz *= f;
    if (!inWater) m.vy *= 0.98;
    m.walk += Math.hypot(dx, dz) * 0.9;
    // 落下のダメージ（3 ブロックより高い所から）
    if (dy < 0 && !inWater) m.fall = (m.fall || 0) - dy;
    if (m.ground || inWater) {
      if (m.fall > 3 && m.type !== 'CHICKEN') this.hurt(m, Math.ceil(m.fall - 3), null);
      // 大きな生き物（幅²×高さ > 0.512）は耕地を踏み荒らす
      if (m.ground && m.fall > 0.5 && T.w * T.w * T.h > 0.512) this.game.trample(Math.floor(m.x), Math.floor(m.y - 0.05), Math.floor(m.z), m.fall);
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
    var g = this.game, T = TYPES[m.type];
    T.drops.forEach(function (d) {
      if (m.sheared && d[0] === 'WHITE_WOOL') return;   // 毛を刈った羊は羊毛を落とさない
      var n = d[1] + Math.floor(Math.random() * (d[2] - d[1] + 1 + (m.looting || 0)));   // ドロップ増加で最大が増える
      var key = m.fire > 0 && WG.Craft.SMELT[d[0]] ? WG.Craft.SMELT[d[0]] : d[0];   // 燃えながら倒れた動物は焼けた肉を落とす
      if (n > 0) g.spawnItem(key, n, m.x, m.y + 0.3, m.z, 0.1, 10);
    });
    // 経験値（敵は 5、動物は 1〜3）
    if (g.spawnOrbs) g.spawnOrbs(m.x, m.y + 0.5, m.z, T.hostile ? 5 : 1 + Math.floor(Math.random() * 3));
    if (T.rare && Math.random() < 0.025) g.spawnItem(T.rare[Math.floor(Math.random() * T.rare.length)], 1, m.x, m.y + 0.3, m.z, 0.1, 10);
    g.puff(m.x, m.y + T.h / 2, m.z, [220, 220, 220], 12);
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
    if (wd.dimKey !== 'overworld') return;
    var sky = g.sky(), dark = sky ? sky.dark : 0, self = this;
    var hostiles = this.list.filter(function (m) { return TYPES[m.type].hostile; }).length;
    if (hostiles < 15 && g.tickCount % 10 === 0) {
      var a = Math.random() * Math.PI * 2, r = 24 + Math.random() * 24;
      var x = Math.floor(w.pos[0] + Math.cos(a) * r), z = Math.floor(w.pos[2] + Math.sin(a) * r), y = Math.floor(w.pos[1] + (Math.random() - 0.5) * 32);
      for (var k = 0; k < 24; k++, y--) {
        if (WG.COLLIDE[wd.block(x, y - 1, z)] >= 1 && !WG.COLLIDE[wd.block(x, y, z)] && !WG.COLLIDE[wd.block(x, y + 1, z)] && !FLUID[wd.block(x, y, z)] && !FLUID[wd.block(x, y + 1, z)]) {
          var lv = w.lightLevels(x + 0.5, y, z + 0.5);
          if (lv[1] === 0 && Math.max(0, lv[0] - dark) <= Math.floor(Math.random() * 8)) this.spawn(pick(HOSTILE, HOSTILE_W), x + 0.5, y, z + 0.5);
          break;
        }
      }
    }
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
      var scale = (T.w > 0.7 ? 1 : 1) * (1 + fuse * 0.25), flash = fuse > 0 && Math.floor(fuse * 12) % 2 === 0 ? 0.6 : 0;
      var tip = m.dead ? Math.min(1, (m.dead + a) / 20) * Math.PI / 2 : 0;
      var red = m.hurt > 0 || m.dead ? 0.55 : 0, burn = m.fire > 0 ? 0.35 : 0;
      bt.L = w.lightLevels(x, y + T.h / 2, z);
      var cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tip), st = Math.sin(tip);
      parts.forEach(function (pt, pi) {
        var c = pt.c;
        // 毛を刈った羊：毛の部分は細く、肌の色
        if (m.sheared && m.type === 'SHEEP') {
          if (pi === 6) return;
          if (pi === 4) { c = [214, 200, 180]; pt = { o: [-4.5, 12, -7], s: [9, 8, 14], c: c, sw: null }; }
        }
        if (red) c = [c[0] + (220 - c[0]) * red, c[1] * (1 - red), c[2] * (1 - red)];
        if (burn) c = [c[0] + (255 - c[0]) * burn, c[1] + (140 - c[1]) * burn, c[2] * (1 - burn)];
        if (flash) c = [c[0] + (255 - c[0]) * flash, c[1] + (255 - c[1]) * flash, c[2] + (255 - c[2]) * flash];
        var ang = pt.sw === 'L1' ? swing : pt.sw === 'L2' ? -swing : pt.sw === 'A' ? -Math.PI / 2 + swing * 0.15 : 0;
        var piv = pt.sw === 'A' ? [0, pt.o[1] + pt.s[1] - 2, 0] : [0, pt.o[1] + pt.s[1], pt.o[2] + pt.s[2] / 2];
        cube(bt, pt.o, pt.s, function (lx, ly, lz) {
          // 脚・腕を振る（左右の軸のまわり）
          if (ang) { var yy = ly - piv[1], zz = lz - piv[2]; ly = piv[1] + yy * Math.cos(ang) - zz * Math.sin(ang); lz = piv[2] + yy * Math.sin(ang) + zz * Math.cos(ang); }
          lx *= scale / 16; ly *= scale / 16; lz *= scale / 16;
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
})(typeof window !== 'undefined' ? window : globalThis);
