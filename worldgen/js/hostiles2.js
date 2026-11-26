// 生き物 その 2（敵。ロードマップ 第 15 段階）
// 凍え骸骨（雪の地方。矢で動きが遅くなる）・沼骸骨（沼。矢に毒）
// 石虫（虫食いブロックから出てくる。仲間を呼ぶ）・影虫（影の真珠で移ったとき、まれに）
// 豚人の戦士（砦に。斧で強い）・腐り牙（地上に出た牙イノシシがなる。何にでも襲いかかる）
// 軋み木（夜の青白い庭。見ているあいだは動かない。軋みの心臓を壊さないと倒れない）
// ゾンビ村人（弱化の投げポーションをかけて金のリンゴで治すと、村人に戻る）
// 大目玉魚（海底神殿の主。採掘速度低下をかける）・雪だるま（雪ブロック 2 つにくり抜いたカボチャ）
// 騎乗：クモに乗った骸骨、鶏に乗った子ゾンビ
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Mobs = WG.Mobs, TYPES = WG.MOB_TYPES, MODELS = WG.MOB_MODELS, hash = WG.hash;
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function box(x, y, z, w, h, d, c, sw, extra) { var b = { o: [x, y, z], s: [w, h, d], c: hex(c), sw: sw || null }; for (var k in extra || {}) b[k] = extra[k]; return b; }
  var EYE = '#1f1d1c';
  function lum(c) { return c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; }
  function recolor(parts, main, keepDark) {
    var base = Math.max(1, Math.max.apply(null, parts.map(function (p) { return lum(p.c); })) * 0.8), m = hex(main);
    return parts.map(function (p) {
      var q = Object.assign({}, p), l = lum(p.c);
      if (keepDark && l < 50) return q;
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
  function blockItem(key, hardness, drop, tool) {
    var id = B[key]; ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: 1, dropMax: 1, dropChance: 1 };
    if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = 0; }
    return ITEMS[key];
  }

  // ---------------- 見た目 ----------------
  MODELS.FROST_SKELETON = recolor(MODELS.SKELETON, '#b8c4c8', true).concat([box(-4.2, 12, -1.2, 8.4, 8, 2.4, '#5a6a72'), box(-4.2, 26, -4.2, 8.4, 2, 8.4, '#6a7a82'), box(-3, 9, -1.1, 6, 3, 2.2, '#5a6a72')]);
  MODELS.BOG_SKELETON = recolor(MODELS.SKELETON, '#a8ae8a', true).concat([box(-4.1, 31.5, -2, 3, 2, 3, '#a8282a'), box(-3.6, 31, -1.5, 2, 1, 2, '#e8dcc8'), box(1.5, 31.5, 0, 2.5, 1.5, 2.5, '#8a6a4a'),
    box(-4.2, 14, -1.2, 8.4, 4, 2.4, '#5a7a3a'), box(-6.2, 16, -1.2, 2.4, 3, 2.4, '#5a7a3a')]);
  MODELS.STONE_MITE = [box(-1.5, 0, -3, 3, 2, 2, '#7a7a80'), box(-2, 0, -1, 4, 2.5, 2.2, '#8a8a90'), box(-1.5, 0, 1.2, 3, 2, 2, '#7a7a80'), box(-1, 0, 3.2, 2, 1.6, 1.5, '#6a6a70'),
    box(-2.1, 2.5, -1, 4.2, 0.5, 2.2, '#9a9aa0'), box(-0.8, 0.8, 4.6, 0.5, 0.5, 0.3, EYE), box(0.3, 0.8, 4.6, 0.5, 0.5, 0.3, EYE), box(-0.5, 0.4, -4.5, 1, 1, 1.5, '#6a6a70', 'T1')];
  MODELS.SHADOW_MITE = recolor(MODELS.STONE_MITE, '#3a2a4a', true).map(function (p, i) { if (i === 5 || i === 6) { var q = Object.assign({}, p); q.c = [200, 90, 240]; q.sw = 'EYE'; return q; } return p; });
  MODELS.PIGLIN_BRUTE = (MODELS.PIGLIN || []).concat([box(-4.3, 12, -2.3, 8.6, 12.6, 4.6, '#2a2620'), box(-4.4, 23.5, -2.4, 8.8, 1, 4.8, '#c8a030'), box(5.5, 6, 3, 1, 14, 1, '#6a4a2a'), box(5, 18, 3.5, 2, 5, 4, '#8a8a90')]);
  MODELS.ROT_HOGLIN = recolor(MODELS.HOGLIN || [], '#c8a098', true).concat([box(-4, 14, -4, 3, 3, 0.4, '#6a8a4a'), box(2, 16, 2, 3, 3, 0.4, '#6a8a4a')]);
  // 軋み木：細く高い木の体と、橙に光る目
  MODELS.CREAKING_TREE = [box(-3, 0, -1.5, 2, 18, 3, '#5a4a40', 'L1'), box(1, 0, -1.5, 2, 18, 3, '#5a4a40', 'L2'), box(-4, 18, -2.5, 8, 16, 5, '#6a5a4e'), box(-3.5, 24, 2.4, 7, 6, 0.5, '#4a3e34'),
    box(-6, 16, -1, 2, 18, 2, '#5a4a40', 'A'), box(4, 16, -1, 2, 18, 2, '#5a4a40', 'A'), box(-3.5, 34, -3, 7, 9, 6, '#6a5a4e'), box(-4.5, 41, -1, 2, 5, 1, '#8a9488'), box(2.5, 40, 0, 2, 6, 1, '#8a9488'),
    box(-2.5, 38, 3, 1.5, 1.5, 0.4, '#ff9a30', 'EYE'), box(1, 38, 3, 1.5, 1.5, 0.4, '#ff9a30', 'EYE'), box(-4.3, 30, -2.6, 8.6, 1, 5.2, '#8a9488')];
  MODELS.ZOMBIE_VILLAGER = recolor(MODELS.VILLAGER || MODELS.ZOMBIE, '#5a7a4a', true);
  MODELS.ELDER_EYE_FISH = recolor(MODELS.EYE_FISH, '#c8c4b0', true);
  MODELS.SNOW_GOLEM = [box(-5, 0, -5, 10, 10, 10, '#f2f6f8'), box(-4, 10, -4, 8, 8, 8, '#f4f8fa'), box(-4, 18, -4, 8, 8, 8, '#e08a1a'), box(-2.5, 21, 4, 1.5, 1.5, 0.3, '#2a1a0a'),
    box(1, 21, 4, 1.5, 1.5, 0.3, '#2a1a0a'), box(-2, 19, 4, 4, 1, 0.3, '#2a1a0a'), box(-0.5, 26, -0.5, 1, 1.5, 1, '#5a7a2a'),
    box(-9, 13, -0.5, 5, 1, 1, '#6a4a2a', 'W1'), box(4, 13, -0.5, 5, 1, 1, '#6a4a2a', 'W2')];

  // ---------------- 種類 ----------------
  T('FROST_SKELETON', { name: '凍え骸骨', w: 0.6, h: 1.99, hp: 20, speed: 0.1, hostile: true, range: 16, burns: true, ai: 'ranged', shot: 'bolt', cd: 50, keep: [5, 12], arrowEffect: 'SLOWNESS', drops: [['BONE', 0, 2], ['ARROW', 0, 2]] });
  T('BOG_SKELETON', { name: '沼骸骨', w: 0.6, h: 1.99, hp: 16, speed: 0.09, hostile: true, range: 16, burns: true, ai: 'ranged', shot: 'bolt', cd: 60, keep: [5, 12], arrowEffect: 'POISON', drops: [['BONE', 0, 2], ['ARROW', 0, 2], ['RED_MUSHROOM', 0, 1]] });
  T('STONE_MITE', { name: '石虫', w: 0.4, h: 0.3, hp: 8, speed: 0.1, hostile: true, range: 16, ai: 'melee', dmg: 1, drops: [] });
  T('SHADOW_MITE', { name: '影虫', w: 0.4, h: 0.3, hp: 8, speed: 0.1, hostile: true, range: 16, ai: 'melee', dmg: 2, despawnAfter: 2400, drops: [] });
  T('PIGLIN_BRUTE', { name: '豚人の戦士', w: 0.6, h: 1.95, hp: 50, speed: 0.1, hostile: true, range: 16, ai: 'melee', dmg: 9, fireproof: true, drops: [['GOLD_INGOT', 0, 1]], rare: ['GOLDEN_AXE'], rareP: 0.085 });
  T('ROT_HOGLIN', { name: '腐り牙', w: 1.4, h: 1.4, hp: 40, speed: 0.07, hostile: true, range: 16, ai: 'melee', dmg: 6, toss: 0.6, fireproof: true, drops: [['ROTTEN_FLESH', 1, 3]] });
  T('CREAKING_TREE', { name: '軋み木', w: 0.9, h: 2.7, hp: 1, speed: 0.11, hostile: true, range: 32, ai: 'melee', dmg: 3, noFall: true, creaking: true, drops: [] });
  T('ZOMBIE_VILLAGER', Object.assign({}, TYPES.ZOMBIE, { name: 'ゾンビ村人', ai: 'melee', dmg: 3, drops: [['ROTTEN_FLESH', 0, 2]], rare: ['EMERALD'], rareP: 0.05 }));
  T('ELDER_EYE_FISH', Object.assign({}, TYPES.EYE_FISH, { name: '大目玉魚', hp: 80, scale: 2.35, w: 2, h: 2, boss: false, drops: [['PRISMARINE_SHARD', 1, 3], ['COD', 0, 1]] }));
  T('SNOW_GOLEM', { name: '雪だるま', w: 0.7, h: 1.9, hp: 4, speed: 0.07, snowGolem: true, drops: [['SNOWBALL', 0, 15]] });
  WG.EFFECTS.MINING_FATIGUE = WG.EFFECTS.MINING_FATIGUE || ['採掘速度低下', '#4a4217'];

  // ---------------- ブロック ----------------
  blockItem('INFESTED_STONE', 0.75, null, 'pickaxe'); blockItem('INFESTED_STONE_BRICKS', 0.75, null, 'pickaxe'); blockItem('INFESTED_DEEPSLATE', 1.5, null, 'pickaxe');
  blockItem('CREAKING_HEART', 2, 'CREAKING_HEART', 'axe');
  var INFESTED = {}; INFESTED[B.INFESTED_STONE] = 1; INFESTED[B.INFESTED_STONE_BRICKS] = 1; INFESTED[B.INFESTED_DEEPSLATE] = 1;
  WG.INFESTED = INFESTED;

  // ---------------- 生成：山の石の中に虫食い石、青白いオークの幹に軋みの心臓 ----------------
  var Overworld = WG.Overworld, generate = Overworld.prototype.generate, MINY = -64;
  Overworld.prototype.generate = function (cx, cz, surfaceOnly) {
    var r = generate.apply(this, arguments), bl = r.blocks, bio = r.biome, hm = r.hmap, seed = this.seed, x0 = cx << 4, z0 = cz << 4;
    var k0 = WG.BIOMES[bio[136]].key, mountain = /mountain|peaks|slopes|windswept|grove|meadow/.test(k0);
    if (mountain && !surfaceOnly) for (var n = 0; n < 24; n++) {
      var x = hash(seed, cx, n, cz, 1501) % 16, z = hash(seed, cx, n, cz, 1502) % 16, y = 0 + hash(seed, cx, n, cz, 1503) % Math.max(1, hm[(z << 4) | x] - 4);
      for (var d = 0; d < 6; d++) {
        var ix = ((y + (d >> 1) - MINY) << 8) | (((z + (d & 1)) & 15) << 4) | ((x + (d % 3)) & 15);
        if (bl[ix] === B.STONE) bl[ix] = B.INFESTED_STONE; else if (bl[ix] === B.DEEPSLATE) bl[ix] = B.INFESTED_DEEPSLATE;
      }
    }
    if (k0 === 'pale_garden' && hash(seed, cx, 1, cz, 1504) % 3 === 0) {
      for (var i = 0; i < 256; i++) {
        var hy = hm[i] + 3, idx = ((hy - MINY) << 8) | i;
        if (bl[idx] === B.PALE_OAK_LOG && bl[idx - 256] === B.PALE_OAK_LOG && bl[idx + 256] === B.PALE_OAK_LOG) { bl[idx] = B.CREAKING_HEART; break; }
      }
    }
    return r;
  };

  // ---------------- 生まれるとき：入れ替え・騎乗 ----------------
  var spawn = Mobs.prototype.spawn;
  Mobs.prototype.spawn = function (type, x, y, z) {
    var wd = this.world, g = this.game, self = this, args = Array.prototype.slice.call(arguments, 1);
    if (!this._swap && wd.dimKey === 'overworld' && wd.biomeAt) {
      var k0 = WG.BIOMES[wd.biomeAt(Math.floor(x), Math.floor(z))].key, bk = (WG.BIOME_PARENT && WG.BIOME_PARENT[k0]) || k0;
      if (type === 'SKELETON' && /snowy|frozen|ice/.test(bk + k0) && Math.random() < 0.8) type = 'FROST_SKELETON';
      else if (type === 'SKELETON' && /swamp/.test(bk) && Math.random() < 0.5) type = 'BOG_SKELETON';
      else if (type === 'ZOMBIE' && Math.random() < 0.05) type = 'ZOMBIE_VILLAGER';
      else if (type === 'EYE_FISH' && Math.random() < 0.12 && !this.list.some(function (q) { return q.type === 'ELDER_EYE_FISH' && Math.hypot(q.x - x, q.z - z) < 48; })) type = 'ELDER_EYE_FISH';
    }
    if (!this._swap && wd.dimKey === 'nether' && type === 'PIGLIN') {
      var under = wd.block(Math.floor(x), Math.floor(y) - 1, Math.floor(z));
      if (/BLACKSTONE|GILDED/.test(WG.BLOCKS[under] ? WG.BLOCKS[under].key : '') && Math.random() < 0.3) type = 'PIGLIN_BRUTE';
    }
    var m = spawn.apply(this, [type].concat(args));
    if (!m || this._swap) return m;
    // 騎乗：夜のクモの 1% に骸骨が乗る、ゾンビの 0.5% は鶏に乗った子ゾンビ
    this._swap = true;
    try {
      if (type === 'SPIDER' && Math.random() < 0.01) { var sk = spawn.call(this, 'SKELETON', x, y + 0.6, z); if (sk) sk.mount = m; }
      if (type === 'ZOMBIE' && Math.random() < 0.005) { var ck = spawn.call(this, 'CHICKEN', x, y, z); if (ck) { m.baby = 1e9; m.mount = ck; ck.jockey = true; } }
    } finally { this._swap = false; }
    void self; void g;
    return m;
  };
  WG.makeJockey = function (mobs, riderType, mountType, x, y, z) {
    mobs._swap = true;
    try { var mt = mobs.spawn(mountType, x, y, z), rd = mobs.spawn(riderType, x, y + 0.6, z); if (rd && mt) { rd.mount = mt; if (mountType === 'CHICKEN') { rd.baby = 1e9; mt.jockey = true; } } return rd; }
    finally { mobs._swap = false; }
  };

  // ---------------- 動き ----------------
  // 軋み木：見られているあいだは止まる
  function watched(g, m) {
    var w = g.walker, e = w.eye || [w.pos[0], w.pos[1] + 1.6, w.pos[2]], d = w.dir;
    if (!d) return false;
    var dx = m.x - e[0], dy = m.y + 1.6 - e[1], dz = m.z - e[2], l = Math.hypot(dx, dy, dz) || 1;
    return (dx * d[0] + dy * d[1] + dz * d[2]) / l > 0.55 && l < 48;
  }
  WG.creakingWatched = watched;
  var special = Mobs.prototype.special;
  Mobs.prototype.special = function (m, T2, dist, dx, dy, dz) {
    var g = this.game;
    if (m.type === 'CREAKING_TREE' && watched(g, m)) { m.vx = m.vz = 0; m.frozen = true; return { want: null, speed: 0, chase: false }; }
    if (m.type === 'CREAKING_TREE') m.frozen = false;
    if (m.mount && !m.mount.dead) return { want: null, speed: 0, chase: false };   // 乗っている者は、乗り物まかせ
    if (m.jockey && m.mount === undefined && this.list.some(function (q) { return q.mount === m && !q.dead; }) && g.mode === 'survival' && dist < 20) return { want: [g.walker.pos[0], g.walker.pos[2]], speed: TYPES[m.type].speed * 2.2, chase: true };
    if (m.type === 'SNOW_GOLEM') {
      var tgt = null, best = 10;
      this.list.forEach(function (o) { if (o !== m && !o.dead && TYPES[o.type] && TYPES[o.type].hostile) { var d = Math.hypot(o.x - m.x, o.z - m.z); if (d < best) { best = d; tgt = o; } } });
      if (tgt) {
        m.yaw = Math.atan2(tgt.x - m.x, tgt.z - m.z);
        if ((m.age || 0) % 20 === 0) throwSnow(this, m, tgt);
        return { want: best < 4 ? [m.x - (tgt.x - m.x), m.z - (tgt.z - m.z)] : null, speed: T2.speed, chase: false };
      }
    }
    return special.apply(this, arguments);
  };
  function throwSnow(mobs, m, t) {
    var g = mobs.game, n = 8;
    for (var i = 1; i <= n; i++) { var f = i / n; g.particles.push({ x: m.x + (t.x - m.x) * f, y: m.y + 1.4 + (t.y + 0.8 - m.y - 1.4) * f + Math.sin(f * Math.PI) * 0.6, z: m.z + (t.z - m.z) * f, vx: 0, vy: -0.01, vz: 0, life: 4 + i, c: [244, 248, 252], sz: 0.12 }); }
    mobs.hurt(t, t.type === 'FIRE_SPIRIT' ? 3 : 0.001, [m.x, m.z, 0.3]);
    if (WG.Sound) WG.Sound.play('pop', t.x, t.y + 1, t.z);
  }
  var hurt = Mobs.prototype.hurt;
  Mobs.prototype.hurt = function (m, amount, from) {
    var g = this.game, wd = this.world;
    // 軋み木：心臓が残っている間は倒れない
    if (m.type === 'CREAKING_TREE') {
      if (m.heart && wd.block(m.heart[0], m.heart[1], m.heart[2]) === B.CREAKING_HEART) { g.puff(m.x, m.y + 1.5, m.z, [255, 150, 50], 6, 0.4); for (var k = 0; k < 6; k++) g.particles.push({ x: m.x + (m.heart[0] + 0.5 - m.x) * k / 6, y: m.y + 1.5 + (m.heart[1] + 0.5 - m.y - 1.5) * k / 6, z: m.z + (m.heart[2] + 0.5 - m.z) * k / 6, vx: 0, vy: 0, vz: 0, life: 20, c: [255, 160, 60], glow: true, fw: true, sz: 0.08 }); return false; }
    }
    // 石虫：叩かれると、近くの虫食いブロックから仲間が出てくる
    if (m.type === 'STONE_MITE' && from) {
      var x0 = Math.floor(m.x), y0 = Math.floor(m.y), z0 = Math.floor(m.z), woke = 0;
      for (var ddx = -5; ddx <= 5 && woke < 4; ddx++) for (var ddy = -3; ddy <= 3 && woke < 4; ddy++) for (var ddz = -5; ddz <= 5 && woke < 4; ddz++) {
        var id = wd.block(x0 + ddx, y0 + ddy, z0 + ddz);
        if (INFESTED[id]) { wd.setBlock(x0 + ddx, y0 + ddy, z0 + ddz, B.AIR); this.spawn('STONE_MITE', x0 + ddx + 0.5, y0 + ddy, z0 + ddz + 0.5); woke++; if (g.walker.remesh) g.walker.remesh(x0 + ddx, z0 + ddz); }
      }
    }
    return hurt.apply(this, arguments);
  };
  var mtick = Mobs.prototype.tick;
  Mobs.prototype.tick = function () {
    var r = mtick.apply(this, arguments), g = this.game, wd = this.world, self = this, t = g.tickCount || 0, w = g.walker, conv = [];
    var night = wd.dimKey === 'overworld' && g.dayAngle ? Math.cos(g.dayAngle() * Math.PI * 2) < -0.1 : false;
    this.list.forEach(function (m) {
      if (m.dead) return;
      // 乗っている者：乗り物の上に
      if (m.mount) {
        if (m.mount.dead) m.mount = null;
        else { var mh = (TYPES[m.mount.type].h || 1) * (TYPES[m.mount.type].scale || 1) * 0.75; m.px = m.x; m.py = m.y; m.pz = m.z; m.x = m.mount.x; m.y = m.mount.y + mh; m.z = m.mount.z; m.vx = m.vy = m.vz = 0; }
      }
      // 地上の牙イノシシは、しばらくすると腐り牙に
      if (m.type === 'HOGLIN' && wd.dimKey !== 'nether') { m.zomb = (m.zomb || 0) + 1; if (m.zomb % 10 === 0) g.puff(m.x, m.y + 1, m.z, [140, 170, 110], 2, 0.3); if (m.zomb > 300) conv.push([m, 'ROT_HOGLIN']); }
      // ゾンビ村人の治療
      if (m.type === 'ZOMBIE_VILLAGER' && m.curing > 0) { m.curing--; if (m.curing % 8 === 0) g.puff(m.x, m.y + 1.4, m.z, [220, 70, 80], 2, 0.3); if (m.curing === 0) conv.push([m, 'VILLAGER']); }
      // 軋み木：朝になると崩れる、心臓が壊れても崩れる
      if (m.type === 'CREAKING_TREE' && ((!night && wd.dimKey === 'overworld') || (m.heart && wd.block(m.heart[0], m.heart[1], m.heart[2]) !== B.CREAKING_HEART))) { g.puff(m.x, m.y + 1.2, m.z, [140, 130, 120], 16, 0.8); m.dead = 1; m.silentDeath = true; }
      // 雪だるま：歩いた跡に雪、暑い所では溶ける
      if (m.type === 'SNOW_GOLEM') {
        var bk = wd.biomeAt ? WG.BIOMES[wd.biomeAt(Math.floor(m.x), Math.floor(m.z))].key : 'plains';
        if (/desert|savanna|badlands|jungle/.test(bk) || wd.dimKey === 'nether') { if (t % 20 === 0) self.hurt(m, 1, null); }
        else if (m.ground && t % 4 === 0) { var fx = Math.floor(m.x), fy = Math.floor(m.y), fz = Math.floor(m.z); if (wd.block(fx, fy, fz) === B.AIR && WG.COLLIDE[wd.block(fx, fy - 1, fz)] >= 1 && WG.blockKind(wd.block(fx, fy - 1, fz)) === 'solid') { wd.setBlock(fx, fy, fz, B.SNOW_LAYER); if (w.remesh) w.remesh(fx, fz); } }
      }
      // 大目玉魚：近くの泳ぐ人に、ときどき採掘速度低下
      if (m.type === 'ELDER_EYE_FISH' && t % 1200 === 600 && Math.hypot(m.x - w.pos[0], m.z - w.pos[2]) < 50 && g.mode === 'survival') {
        g.addEffect('MINING_FATIGUE', 6000, 2);
        if (g.ui.toast) g.ui.toast('大目玉魚ににらまれた（採掘速度低下）');
        if (WG.Sound) WG.Sound.play('shriek', w.pos[0], w.pos[1], w.pos[2]);
      }
    });
    if (conv.length) conv.forEach(function (c) {
      var m = c[0]; m.dead = 1; m.silentDeath = true;
      self._swap = true; var n2 = self.spawn(c[1], m.x, m.y, m.z); self._swap = false;
      if (n2) { n2.yaw = n2.pyaw = m.yaw; g.puff(m.x, m.y + 1, m.z, c[1] === 'VILLAGER' ? [240, 220, 120] : [120, 160, 90], 14, 0.6); }
    });
    if (conv.length || this.list.some(function (m) { return m.silentDeath; })) this.list = this.list.filter(function (m) { return !m.silentDeath; });
    // 軋み木を呼ぶ：夜、心臓の近く（32 以内）にいると、心臓から 1 体
    if (night && wd.creakingHearts && t % 40 === 0) wd.creakingHearts.forEach(function (k) {
      var q = k.split(',').map(Number);
      if (wd.block(q[0], q[1], q[2]) !== B.CREAKING_HEART) { wd.creakingHearts.delete(k); return; }
      if (Math.hypot(q[0] - w.pos[0], q[2] - w.pos[2]) > 32 || self.list.some(function (m) { return m.type === 'CREAKING_TREE' && m.heart && m.heart.join() === q.join(); })) return;
      for (var tr = 0; tr < 8; tr++) {
        var sx = q[0] + Math.floor(Math.random() * 13) - 6, sz = q[2] + Math.floor(Math.random() * 13) - 6;
        for (var sy = q[1] + 4; sy > q[1] - 10; sy--) if (WG.COLLIDE[wd.block(sx, sy - 1, sz)] >= 1 && wd.block(sx, sy, sz) === B.AIR && wd.block(sx, sy + 1, sz) === B.AIR && wd.block(sx, sy + 2, sz) === B.AIR) {
          self._swap = true; var c2 = self.spawn('CREAKING_TREE', sx + 0.5, sy, sz + 0.5); self._swap = false;
          if (c2) { c2.heart = q; if (WG.Sound) WG.Sound.play('door', sx, sy, sz); }
          return;
        }
      }
    });
    return r;
  };
  // 心臓の場所を覚える（読み込んだチャンクから）
  var populate = Mobs.prototype.populate;
  Mobs.prototype.populate = function (cx, cz) {
    var r = populate.apply(this, arguments), wd = this.world, c = wd.dimKey === 'overworld' && wd.chunk(cx, cz);
    if (c && c.blocks && c.biome && WG.BIOMES[c.biome[136]].key === 'pale_garden') {
      for (var i = 0; i < c.blocks.length; i++) if (c.blocks[i] === B.CREAKING_HEART) { var y = (i >> 8) + MINY, x = (cx << 4) + (i & 15), z = (cz << 4) + ((i >> 4) & 15); (wd.creakingHearts || (wd.creakingHearts = new Set())).add(x + ',' + y + ',' + z); }
    }
    return r;
  };

  // ---------------- 矢の効果（凍え骸骨・沼骸骨） ----------------
  var shoot = Mobs.prototype.shoot;
  Mobs.prototype.shoot = function (m) {
    var r = shoot.apply(this, arguments), T2 = TYPES[m.type], a = this.arrows[this.arrows.length - 1];
    if (a && T2 && T2.arrowEffect) a.effect = T2.arrowEffect;
    return r;
  };
  var tickArrows = Mobs.prototype.tickArrows;
  Mobs.prototype.tickArrows = function () {
    var g = this.game, w = g.walker, live = this.arrows.filter(function (a) { return a.effect && !a.stuck && !a.dead; });
    var hp = g.health, r = tickArrows.apply(this, arguments);
    if (live.length && g.health < hp) live.forEach(function (a) {
      if (Math.hypot(a.x - w.pos[0], a.y - w.pos[1] - 0.9, a.z - w.pos[2]) < 2.2) g.addEffect(a.effect, a.effect === 'POISON' ? 80 : 600, 0);
    });
    return r;
  };

  // ---------------- 遊ぶとき：虫食いブロック・影虫・治療・雪だるま・採掘速度低下 ----------------
  var breakBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z), r = breakBlock.apply(this, arguments);
    if (INFESTED[id] && wd.block(x, y, z) !== id && this.mode === 'survival') this.mobs.spawn('STONE_MITE', x + 0.5, y, z + 0.5);
    return r;
  };
  var splash = Game.prototype.splash;
  Game.prototype.splash = function (t) {
    var r = splash.apply(this, arguments), it = ITEMS[t.key], now = this.tickCount || 0;
    if (it && it.effect === 'WEAKNESS') this.mobs.list.forEach(function (m) { if (Math.hypot(m.x - t.x, m.y + 0.5 - t.y, m.z - t.z) < 4.5) m.weakUntil = now + 1800; });
    return r;
  };
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var mt = this.mobs.target && this.mobs.target.mob, held = this.inv.held();
    if (mt && !mt.dead && mt.type === 'ZOMBIE_VILLAGER' && held && held.key === 'GOLDEN_APPLE' && mt.weakUntil > (this.tickCount || 0) && !(mt.curing > 0)) {
      mt.curing = 2000; if (this.mode === 'survival') this.inv.take(this.inv.sel, 1);
      this.puff(mt.x, mt.y + 1.4, mt.z, [240, 200, 80], 12, 0.6); if (WG.Sound) WG.Sound.play('levelup');
      this.mouseR = this.clickR = false; return;
    }
    return use.apply(this, arguments);
  };
  var tick = Game.prototype.tick;
  Game.prototype.tick = function () {
    var before = (this.pearls || []).length, r = tick.apply(this, arguments), after = (this.pearls || []).length;
    if (after < before && Math.random() < 0.05 && this.mobs) { var p = this.walker.pos; this.mobs.spawn('SHADOW_MITE', p[0] + 0.5, p[1], p[2] + 0.5); }
    return r;
  };
  var tryGolem = Game.prototype.tryGolem;
  Game.prototype.tryGolem = function (x, y, z) {
    var wd = this.world, isSnow = function (id) { return id === B.SNOW || id === B.SNOW_BLOCK; };
    if (wd.block(x, y, z) === B.CARVED_PUMPKIN && isSnow(wd.block(x, y - 1, z)) && isSnow(wd.block(x, y - 2, z))) {
      [0, 1, 2].forEach(function (d) { wd.setBlock(x, y - d, z, B.AIR); });
      this.mobs.spawn('SNOW_GOLEM', x + 0.5, y - 2, z + 0.5);
      this.walker.remesh(x, z);
      this.puff(x + 0.5, y - 1, z + 0.5, [240, 246, 250], 20, 0.8);
      return true;
    }
    return tryGolem.apply(this, arguments);
  };
  var miningBonus = Game.prototype.miningBonus;
  Game.prototype.miningBonus = function () {
    var r = miningBonus.apply(this, arguments), mf = this.effects && this.effects.MINING_FATIGUE;
    if (mf && r && r.perTick) r = Object.assign({}, r, { perTick: r.perTick * Math.pow(0.3, (mf.amp || 0) + 1) });
    return r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
