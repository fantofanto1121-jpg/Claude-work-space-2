// 考古学と試練の間
// ・ブラシ：怪しい砂・怪しい砂利を右クリックで押し続けると、少しずつ掘り出して、土器片などが出てくる
//   見つかる所：古道の遺跡（森・タイガ・ジャングルの土に埋もれた建物）、砂漠の井戸、海底遺跡
//   土器片やレンガ 4 つで飾り壺
// ・試練の間：地下の凝灰岩と銅の建物。試練のスポナーは近づくと敵を何体かずつ出し、全部倒すと試練の鍵と褒美を出す
//   鍵で宝庫を開ける。中央の広間には、風の弾を撃つ「旋風の精」。旋風の棒からウィンドチャージ（投げると吹き飛ばす）
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Mobs = WG.Mobs, TYPES = WG.MOB_TYPES, MODELS = WG.MOB_MODELS, hash = WG.hash, rnd = WG.rnd;
  var S = WG.StructAPI, Plan = S.Plan, spec = S.spec, bbox = S.bbox, biomeKey = S.biomeKey, flat = S.flat, SEA = S.SEA, SALT = S.SALT + 500;
  function keyOf(id) { return WG.BLOCKS[id] ? WG.BLOCKS[id].key : ''; }
  function rint(n) { return Math.floor(Math.random() * n); }
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function box(x, y, z, w, h, d, c, sw) { return { o: [x, y, z], s: [w, h, d], c: hex(c), sw: sw || null }; }
  function item(key, name, max, extra) { var it = { key: key, name: name, block: -1, max: max || 64, shape: 'lump', color: '#888888' }; for (var k in extra || {}) it[k] = extra[k]; ITEMS[key] = it; return it; }
  function blockItem(key, hardness, drop, tool, tier) {
    var id = B[key]; ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: 1, dropMax: 1, dropChance: 1 };
    if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = tier; }
  }

  // ---------------- アイテムとブロック ----------------
  item('BRUSH', 'ブラシ', 1, { dur: 64 });
  var SHERDS = [['POTTERY_SHERD_BOW', '弓の土器片'], ['POTTERY_SHERD_HEART', 'ハートの土器片'], ['POTTERY_SHERD_SKULL', '骸骨の土器片'], ['POTTERY_SHERD_WAVE', '波の土器片']];
  SHERDS.forEach(function (s) { item(s[0], s[1], 64); });
  item('TRIAL_KEY', '試練の鍵', 64); item('WIND_ROD', '旋風の棒', 64); item('WIND_CHARGE', 'ウィンドチャージ', 64, { splash: true, windCharge: true, throwColor: '#cfe4f2' });
  for (var i = 0; i < 4; i++) { blockItem('SUSPICIOUS_SAND_' + i, 0.25, null, 'shovel', 0); blockItem('SUSPICIOUS_GRAVEL_' + i, 0.25, null, 'shovel', 0); }
  blockItem('DECORATED_POT', 0, 'DECORATED_POT');
  ['TUFF_BRICKS', 'POLISHED_TUFF', 'CHISELED_TUFF'].forEach(function (k) { blockItem(k, 1.5, k, 'pickaxe', 0); });
  blockItem('COPPER_GRATE', 3, 'COPPER_GRATE', 'pickaxe', 1);
  blockItem('TRIAL_SPAWNER', 50, null); blockItem('TRIAL_SPAWNER_ACTIVE', 50, null); blockItem('VAULT', 50, null); blockItem('VAULT_OPEN', 50, null);
  Craft.GROUPS.POT_SIDE = ['BRICK'].concat(SHERDS.map(function (s) { return s[0]; }));
  Craft.SHAPED.push([['F', 'C', 'S'], { F: 'FEATHER', C: 'COPPER_INGOT', S: 'STICK' }, 'BRUSH', 1], [[' P ', 'P P', ' P '], { P: 'POT_SIDE' }, 'DECORATED_POT', 1],
    [['TT', 'TT'], { T: 'POLISHED_TUFF' }, 'TUFF_BRICKS', 4], [['TT', 'TT'], { T: 'TUFF' }, 'POLISHED_TUFF', 4], [[' C ', 'C C', ' C '], { C: 'COPPER_BLOCK' }, 'COPPER_GRATE', 4]);
  Craft.SHAPELESS.push([['WIND_ROD'], 'WIND_CHARGE', 4]);

  // ---------------- 旋風の精（風の弾を撃つ） ----------------
  MODELS.WIND_SPIRIT = [box(-4, 22, -4, 8, 8, 8, '#cfe2ee'), box(-3, 25, 4, 2, 2, 0.3, '#3a6a8a'), box(1, 25, 4, 2, 2, 0.3, '#3a6a8a'),
    box(-1, 4, -1, 2, 16, 2, '#a8c8dc', 'T1'), box(-6, 10, -1, 2, 12, 2, '#b8d4e4', 'T2'), box(4, 10, -1, 2, 12, 2, '#b8d4e4', 'T1'),
    box(-5, 0, -5, 10, 3, 10, '#e0eef6', 'T2'), box(-3.5, 5, -3.5, 7, 2, 7, '#d4e6f0', 'T1')];
  TYPES.WIND_SPIRIT = { name: '旋風の精', w: 0.6, h: 1.8, hp: 30, speed: 0.09, hostile: true, range: 24, ai: 'ranged', shot: 'wind', cd: 40, keep: [3, 10], noFall: true, drops: [['WIND_ROD', 1, 2]], food: [] };
  if (WG.MOB_ORDER.indexOf('WIND_SPIRIT') < 0) WG.MOB_ORDER.push('WIND_SPIRIT');
  ITEMS.SPAWN_EGG_WIND_SPIRIT = { key: 'SPAWN_EGG_WIND_SPIRIT', name: '旋風の精のスポーンエッグ', block: -1, max: 64, shape: 'lump', color: '#888888', egg: 'WIND_SPIRIT' };
  // 風の弾がはじける：近くのプレイヤーと生き物を吹き飛ばす（ウィンドチャージも同じ）
  Game.prototype.windBurst = function (x, y, z, byPlayer) {
    var w = this.walker, self = this, dx = w.pos[0] - x, dy = w.pos[1] + 0.9 - y, dz = w.pos[2] - z, d = Math.hypot(dx, dy, dz);
    for (var k = 0; k < 18; k++) { var a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * Math.PI; this.particles.push({ x: x, y: y, z: z, vx: Math.cos(a) * Math.cos(b) * 0.35, vy: Math.sin(b) * 0.35, vz: Math.sin(a) * Math.cos(b) * 0.35, life: 8 + rint(6), c: [220, 236, 246] }); }
    if (d < 2.6 && !this.dead) {
      var f = (2.6 - d) / 2.6 + 0.4;
      w.vel[0] += dx / (d || 1) * f * 0.9; w.vel[2] += dz / (d || 1) * f * 0.9; w.vel[1] = Math.max(w.vel[1], 0.55 + f * 0.5);
      w.fallDist = 0;   // 吹き上げられた分の落下のけがはない
      if (!byPlayer) this.hurtPlayer(1, x, z, 'projectile');
    }
    this.mobs.list.forEach(function (m) { var mx = m.x - x, mz = m.z - z, md = Math.hypot(mx, m.y + 0.5 - y, mz); if (!m.dead && md < 2.6 && m.type !== 'WIND_SPIRIT') { m.vx += mx / (md || 1) * 0.6; m.vz += mz / (md || 1) * 0.6; m.vy = 0.5; } });
    if (WG.Sound) WG.Sound.play('wind', x, y, z);
  };
  var tickShots = Mobs.prototype.tickShots;
  Mobs.prototype.tickShots = function () {
    var winds = (this.shots || []).filter(function (s) { return s.kind === 'wind'; });
    var r = tickShots.apply(this, arguments), g = this.game, now = this.shots || [];
    winds.forEach(function (s) { if (now.indexOf(s) < 0) g.windBurst(s.x - s.vx, s.y - s.vy, s.z - s.vz, false); else g.particles.push({ x: s.x, y: s.y, z: s.z, vx: 0, vy: 0, vz: 0, life: 4, c: [210, 230, 244] }); });
    return r;
  };
  var splash = Game.prototype.splash;
  Game.prototype.splash = function (t) { if (ITEMS[t.key] && ITEMS[t.key].windCharge) { this.windBurst(t.x, t.y, t.z, true); return; } return splash.apply(this, arguments); };

  // ---------------- 考古学：ブラシで掘る ----------------
  var DIG_LOOT = {
    trail: [['POTTERY_SHERD_BOW', 1, 8], ['POTTERY_SHERD_HEART', 1, 6], ['POTTERY_SHERD_SKULL', 1, 6], ['POTTERY_SHERD_WAVE', 1, 4], ['EMERALD', 1, 6], ['WHEAT', 2, 6], ['BRICK', 1, 6],
      ['GOLD_NUGGET', 2, 4], ['BLUE_DYE', 1, 3], ['LEAD', 1, 2], ['STICK', 2, 4], ['MUSIC_DISC_MEADOW', 1, 1]],
    desert: [['POTTERY_SHERD_BOW', 1, 6], ['POTTERY_SHERD_SKULL', 1, 6], ['EMERALD', 1, 6], ['BRICK', 1, 6], ['STICK', 2, 4], ['SUSPICIOUS_STEW_POPPY', 1, 3], ['DIAMOND', 1, 1]],
    ocean: [['POTTERY_SHERD_WAVE', 1, 8], ['POTTERY_SHERD_HEART', 1, 4], ['EMERALD', 1, 6], ['COAL', 1, 6], ['GOLD_NUGGET', 2, 4], ['IRON_AXE', 1, 2], ['WHEAT', 2, 4]]
  };
  Object.keys(DIG_LOOT).forEach(function (k) { DIG_LOOT[k] = DIG_LOOT[k].filter(function (l) { return ITEMS[l[0]]; }); });
  function digLoot(wd, x, y, z, sand) {
    var t = sand ? (y < SEA - 3 ? 'ocean' : 'desert') : (y < SEA - 3 ? 'ocean' : 'trail'), T = DIG_LOOT[t], tot = T.reduce(function (s, l) { return s + l[2]; }, 0), r = hash(wd.seed || 0, x, y, z, SALT + 9) % tot;
    for (var i = 0; i < T.length; i++) { if (r < T[i][2]) return [T[i][0], T[i][1]]; r -= T[i][2]; }
    return [T[0][0], 1];
  }
  WG.digLoot = digLoot;
  function susInfo(id) { var m = /^SUSPICIOUS_(SAND|GRAVEL)_(\d)$/.exec(keyOf(id)); return m ? { sand: m[1] === 'SAND', stage: +m[2] } : null; }
  Game.prototype.tickBrush = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), wd = this.world;
    var si = t && susInfo(t.id);
    if (!(held && held.key === 'BRUSH' && this.mouseR && !this.invOpen && si)) { this.brush = null; return; }
    var key = t.x + ',' + t.y + ',' + t.z;
    if (!this.brush || this.brush.key !== key) this.brush = { key: key, t: 0 };
    w.using = true;
    var b = ++this.brush.t, fx = t.px - t.x, fy = t.py - t.y, fz = t.pz - t.z;
    if (b % 3 === 0) {
      var c = si.sand ? [220, 204, 150] : [150, 146, 140];
      this.particles.push({ x: t.x + 0.5 + fx * 0.55 + (Math.random() - 0.5) * 0.8 * (fx ? 0 : 1), y: t.y + 0.5 + fy * 0.55 + (Math.random() - 0.5) * 0.8 * (fy ? 0 : 1), z: t.z + 0.5 + fz * 0.55 + (Math.random() - 0.5) * 0.8 * (fz ? 0 : 1),
        vx: fx * 0.05 + (Math.random() - 0.5) * 0.03, vy: 0.02, vz: fz * 0.05 + (Math.random() - 0.5) * 0.03, life: 10, c: c });
      if (WG.Sound && b % 9 === 0) WG.Sound.play('step', t.x + 0.5, t.y + 0.5, t.z + 0.5, si.sand ? 'sand' : 'gravel');
    }
    if (b % 24 !== 0) return;
    if (si.stage < 3) { wd.setBlock(t.x, t.y, t.z, B[(si.sand ? 'SUSPICIOUS_SAND_' : 'SUSPICIOUS_GRAVEL_') + (si.stage + 1)]); w.remesh(t.x, t.z); return; }
    // 掘り出した：見つけた物を前に出し、ふつうの砂・砂利に戻る
    var l = digLoot(wd, t.x, t.y, t.z, si.sand), e = this.spawnItem(l[0], l[1], t.x + 0.5 + fx * 0.7, t.y + 0.5 + fy * 0.7, t.z + 0.5 + fz * 0.7, 0, 10);
    if (e) { e.vx = fx * 0.08; e.vy = 0.1 + fy * 0.08; e.vz = fz * 0.08; }
    wd.setBlock(t.x, t.y, t.z, si.sand ? B.SAND : B.GRAVEL); w.remesh(t.x, t.z);
    this.puff(t.x + 0.5, t.y + 0.5, t.z + 0.5, [240, 226, 180], 10, 0.4);
    if (this.mode === 'survival') this.wearTool(1);
    if (WG.Sound) WG.Sound.play('pop', t.x + 0.5, t.y + 0.5, t.z + 0.5);
    this.brush = null;
  };

  // ---------------- 遺跡：古道の遺跡・砂漠の井戸。海底遺跡にも怪しい砂・砂利 ----------------
  spec({ key: 'tr', dim: 'overworld', size: 256, reach: 12,
    head: function (gen, rx, rz) {
      var s = gen.seed, OK = { forest: 1, taiga: 1, jungle: 1, snowy_plains: 1 };
      if (rnd(s, rx, 0, rz, SALT + 1) >= 0.6) return null;
      for (var tr = 0; tr < 8; tr++) {
        var x = rx * 256 + 20 + hash(s, rx, 1 + tr, rz, SALT + 1) % 216, z = rz * 256 + 20 + hash(s, rx, 11 + tr, rz, SALT + 1) % 216;
        if (OK[biomeKey(gen, x, z)] && gen.column(x, z).h > SEA + 1 && flat(gen, x, z, 6, 6, 3)) return bbox({ x: x, z: z, y: gen.column(x, z).h }, 11);
      }
      return null;
    },
    build: function (gen, h) {
      var P = new Plan(-64, 320, 'trail_ruins'), g = h.y, cx = h.x, cz = h.z, R = S.rng(hash(gen.seed, cx, 3, cz, SALT + 2));
      var TC = [B.TERRACOTTA, B.BROWN_TERRACOTTA, B.LIGHT_GRAY_TERRACOTTA, B.CYAN_TERRACOTTA, B.BRICKS, B.MOSSY_COBBLESTONE, B.STONE_BRICKS];
      var W = function () { return TC[Math.floor(R() * TC.length)]; };
      // 埋もれた 3 つの部屋と、石の道（てっぺんの 1 段だけが地面から出る）
      [[-6, -5, 6], [3, -4, 5], [-2, 4, 6]].forEach(function (q) {
        var x0 = cx + q[0], z0 = cz + q[1], n = q[2];
        for (var x = x0; x <= x0 + n; x++) for (var z = z0; z <= z0 + n; z++) {
          var wall = x === x0 || x === x0 + n || z === z0 || z === z0 + n;
          for (var y = g - 5; y <= g; y++) P.set(x, y, z, wall ? W() : y === g - 5 ? W() : y >= g - 1 ? B.DIRT : B.GRAVEL);
          if (wall && R() < 0.55) P.set(x, g + 1, z, W());
        }
      });
      for (var k = -9; k <= 9; k++) { P.set(cx + k, g - 1, cz + 1, B.COBBLESTONE); P.set(cx + k, g - 1, cz + 2, R() < 0.5 ? B.GRAVEL : B.COBBLESTONE); }
      // 怪しい砂利（埋もれた部屋の中）
      for (k = 0; k < 14; k++) { var sx = cx - 5 + Math.floor(R() * 13), sz = cz - 4 + Math.floor(R() * 13), sy = g - 4 + Math.floor(R() * 3); P.set(sx, sy, sz, B.SUSPICIOUS_GRAVEL_0); }
      P.set(cx, g + 1, cz, B.DECORATED_POT);
      return P;
    }
  });
  spec({ key: 'dw', dim: 'overworld', size: 192, reach: 4,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 3) >= 0.5) return null;
      for (var tr = 0; tr < 6; tr++) {
        var x = rx * 192 + 8 + hash(s, rx, 1 + tr, rz, SALT + 3) % 176, z = rz * 192 + 8 + hash(s, rx, 11 + tr, rz, SALT + 3) % 176;
        if (biomeKey(gen, x, z) === 'desert' && gen.column(x, z).h > SEA + 1 && flat(gen, x, z, 2, 2, 1)) return bbox({ x: x, z: z, y: gen.column(x, z).h }, 3);
      }
      return null;
    },
    build: function (gen, h) {
      var P = new Plan(-64, 320, 'desert_well'), g = h.y, cx = h.x, cz = h.z;
      P.fill(cx - 2, g, cz - 2, cx + 2, g, cz + 2, B.SANDSTONE); P.fill(cx - 2, g - 3, cz - 2, cx + 2, g - 1, cz + 2, B.SANDSTONE);
      for (var x = cx - 2; x <= cx + 2; x++) for (var z = cz - 2; z <= cz + 2; z++) if (Math.abs(x - cx) === 2 || Math.abs(z - cz) === 2) P.set(x, g + 1, z, Math.abs(x - cx) + Math.abs(z - cz) === 2 ? B.AIR : B.SANDSTONE_SLAB || B.SANDSTONE);
      P.fill(cx - 1, g, cz - 1, cx + 1, g, cz + 1, B.SANDSTONE); P.set(cx, g, cz, B.WATER); P.fill(cx, g - 3, cz, cx, g - 1, cz, B.WATER);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { P.fill(cx + q[0], g + 1, cz + q[1], cx + q[0], g + 2, cz + q[1], B.SANDSTONE); });
      P.fill(cx - 1, g + 3, cz - 1, cx + 1, g + 3, cz + 1, B.SANDSTONE_SLAB || B.SANDSTONE); P.set(cx, g + 3, cz, B.SANDSTONE);
      P.set(cx + 3, g - 1, cz, B.SUSPICIOUS_SAND_0); P.set(cx - 3, g - 2, cz + 1, B.SUSPICIOUS_SAND_0);
      return P;
    }
  });
  S.SPECS.forEach(function (sp) {
    if (sp.key !== 'or') return;
    var build = sp.build;
    sp.build = function (gen, h) {
      var P = build.apply(this, arguments), id = h.sandy ? B.SUSPICIOUS_SAND_0 : B.SUSPICIOUS_GRAVEL_0;
      [[-2, 1], [1, -2], [2, 3]].forEach(function (q) { P.set(h.x + q[0], h.y, h.z + q[1], id); });
      return P;
    };
  });
  Object.assign(S.KIND_KEY, { trail_ruins: 'tr', desert_well: 'dw', trial_chambers: 'tc' });

  // ---------------- 試練の間 ----------------
  spec({ key: 'tc', dim: 'overworld', size: 512, reach: 40, under: true,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 5) >= 0.7) return null;
      var x = rx * 512 + 60 + hash(s, rx, 1, rz, SALT + 5) % 392, z = rz * 512 + 60 + hash(s, rx, 2, rz, SALT + 5) % 392;
      return bbox({ x: x, z: z, y: -30 }, 38);
    },
    build: function (gen, h) {
      var P = new Plan(-64, 320, 'trial_chambers'), y0 = h.y, cx = h.x, cz = h.z, R = S.rng(hash(gen.seed, cx, 5, cz, SALT + 6));
      var TB = function () { var r = R(); return r < 0.6 ? B.TUFF_BRICKS : r < 0.85 ? B.POLISHED_TUFF : B.CHISELED_TUFF; };
      P.trials = {}; P.vaults = [];
      // 中央の広間（内側 21×21、高さ 10）
      P.box(cx - 11, y0 - 1, cz - 11, cx + 11, y0 + 10, cz + 11, TB, B.AIR);
      for (var x = cx - 10; x <= cx + 10; x++) for (var z = cz - 10; z <= cz + 10; z++) {
        var dx = x - cx, dz = z - cz;
        P.set(x, y0 - 1, z, (Math.abs(dx) % 4 === 0 || Math.abs(dz) % 4 === 0) ? B.CHISELED_TUFF : ((dx + dz) & 1 ? B.POLISHED_TUFF : B.TUFF_BRICKS));
        if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) P.set(x, y0 - 1, z, Math.abs(dx) + Math.abs(dz) <= 1 ? B.COPPER_BLOCK : B.WAXED_EXPOSED_COPPER || B.COPPER_BLOCK);
        P.set(x, y0 + 10, z, (dx % 3 === 0 && dz % 3 === 0) ? B.COPPER_BULB_LIT : B.COPPER_GRATE);
      }
      // 柱と、上の通路（バルコニー）
      [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach(function (q) { P.fill(cx + q[0], y0, cz + q[1], cx + q[0], y0 + 9, cz + q[1], B.TUFF_BRICKS); P.set(cx + q[0], y0 + 4, cz + q[1], B.CHISELED_TUFF); });
      for (x = cx - 10; x <= cx + 10; x++) { P.set(x, y0 + 5, cz - 10, B.POLISHED_TUFF); P.set(x, y0 + 5, cz + 10, B.POLISHED_TUFF); P.set(x, y0 + 6, cz - 9, B.COPPER_GRATE); P.set(x, y0 + 6, cz + 9, B.COPPER_GRATE); }
      for (z = cz - 10; z <= cz + 10; z++) { P.set(cx - 10, y0 + 5, z, B.POLISHED_TUFF); P.set(cx + 10, y0 + 5, z, B.POLISHED_TUFF); }
      // 広間：試練のスポナー 2 つ（台の上）と宝庫 2 つ、飾り壺
      [[-5, 0, 'WIND_SPIRIT'], [5, 0, 'ZOMBIE']].forEach(function (q) {
        P.fill(cx + q[0] - 1, y0, cz + q[1] - 1, cx + q[0] + 1, y0, cz + q[1] + 1, B.CHISELED_TUFF);
        P.set(cx + q[0], y0 + 1, cz + q[1], B.TRIAL_SPAWNER); P.trials[(cx + q[0]) + ',' + (y0 + 1) + ',' + (cz + q[1])] = q[2];
      });
      [[0, -8], [0, 8]].forEach(function (q) { P.set(cx + q[0], y0, cz + q[1], B.VAULT); P.vaults.push([cx + q[0], y0, cz + q[1]]); });
      [[-9, -9], [9, -9], [-9, 9], [9, 9], [-9, 0], [9, 0]].forEach(function (q) { P.set(cx + q[0], y0, cz + q[1], B.DECORATED_POT); });
      // 4 本の廊下（幅 3、高さ 4）と、先の小さな試練の部屋
      var MOBS = ['SKELETON', 'SPIDER', 'HUSK', 'ZOMBIE'];
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d, di) {
        for (var k = 12; k <= 24; k++) {
          var x1 = cx + d[0] * k, z1 = cz + d[1] * k;
          for (var s2 = -2; s2 <= 2; s2++) for (var y = y0 - 1; y <= y0 + 4; y++) {
            var X = x1 + (d[1] ? s2 : 0), Z = z1 + (d[0] ? s2 : 0), edge = Math.abs(s2) === 2 || y === y0 - 1 || y === y0 + 4;
            P.set(X, y, Z, edge ? (y === y0 + 4 && s2 === 0 && k % 4 === 0 ? B.COPPER_BULB_LIT : TB()) : B.AIR);
          }
        }
        for (var s3 = -1; s3 <= 1; s3++) for (var y2 = y0; y2 <= y0 + 3; y2++) P.set(cx + d[0] * 11 + (d[1] ? s3 : 0), y2, cz + d[1] * 11 + (d[0] ? s3 : 0), B.AIR);   // 広間への入口
        var rx = cx + d[0] * 30, rz = cz + d[1] * 30;
        P.box(rx - 5, y0 - 1, rz - 5, rx + 5, y0 + 6, rz + 5, TB, B.AIR);
        P.fill(rx - 4, y0 - 1, rz - 4, rx + 4, y0 - 1, rz + 4, function (xx, yy, zz) { return (xx + zz) & 1 ? B.POLISHED_TUFF : B.TUFF_BRICKS; });
        for (var s4 = -1; s4 <= 1; s4++) for (var y3 = y0; y3 <= y0 + 3; y3++) P.set(rx - d[0] * 5 + (d[1] ? s4 : 0), y3, rz - d[1] * 5 + (d[0] ? s4 : 0), B.AIR);
        P.set(rx, y0 + 6, rz, B.COPPER_BULB_LIT); P.set(rx, y0, rz, B.TRIAL_SPAWNER); P.trials[rx + ',' + y0 + ',' + rz] = MOBS[di];
        P.set(rx + 3, y0, rz + 3, B.DECORATED_POT); P.set(rx - 3, y0, rz + 3, B.DECORATED_POT);
      });
      return P;
    }
  });
  // 初めて読み込んだチャンク：試練のスポナーを覚える
  var populate = Mobs.prototype.populate;
  Mobs.prototype.populate = function (cx, cz) {
    var wd = this.world, first = !(wd.populated && wd.populated.has(cx + ',' + cz));
    var r = populate.apply(this, arguments);
    if (first && wd.gen) WG.structuresNear(wd, cx << 4, cz << 4).forEach(function (p) {
      if (!p.trials) return;
      Object.keys(p.trials).forEach(function (k) {
        var q = k.split(',').map(Number);
        if ((q[0] >> 4) === cx && (q[2] >> 4) === cz) (wd.trials || (wd.trials = new Map())).set(k, { type: p.trials[k], state: 'idle', spawned: 0, total: 6, cool: 0, wait: 0 });
      });
    });
    return r;
  };
  var REWARD = [['BREAD', 2, 4], ['ARROW', 4, 8], ['EMERALD', 1, 3], ['HONEY_BOTTLE', 1, 2], ['WIND_CHARGE', 2, 4], ['GOLDEN_CARROT', 1, 2], ['COOKED_CHICKEN', 2, 3]].filter(function (l) { return ITEMS[l[0]]; });
  var VAULT = [['DIAMOND', 1, 2, 4], ['EMERALD', 2, 5, 10], ['ENCHANTED_BOOK', 1, 1, 6], ['GOLDEN_APPLE', 1, 1, 6], ['CROSSBOW', 1, 1, 4], ['IRON_AXE', 1, 1, 4], ['WIND_CHARGE', 4, 8, 8],
    ['ENCHANTED_GOLDEN_APPLE', 1, 1, 1], ['MUSIC_DISC_FORGE', 1, 1, 2], ['DIAMOND_CHESTPLATE', 1, 1, 1], ['ARROW', 8, 16, 8], ['GOLDEN_CARROT', 2, 4, 6]].filter(function (l) { return ITEMS[l[0]]; });
  Game.prototype.tickTrials = function () {
    var wd = this.world, w = this.walker, p = w.pos, self = this, now = this.tickCount || 0;
    if (!wd.trials || !wd.trials.size || now % 5) return;
    wd.trials.forEach(function (t, key) {
      var q = key.split(',').map(Number), d = Math.hypot(p[0] - q[0] - 0.5, p[1] - q[1], p[2] - q[2] - 0.5);
      if (d > 48) return;
      var id = wd.block(q[0], q[1], q[2]);
      if (id !== B.TRIAL_SPAWNER && id !== B.TRIAL_SPAWNER_ACTIVE) { wd.trials.delete(key); return; }
      var alive = self.mobs.list.filter(function (m) { return m.trialKey === key && !m.dead; });
      if (t.state === 'cool') { t.cool -= 5; if (now % 20 === 0) self.particles.push({ x: q[0] + 0.5, y: q[1] + 1.1, z: q[2] + 0.5, vx: 0, vy: 0.03, vz: 0, life: 20, c: [90, 90, 96] }); if (t.cool <= 0) t.state = 'idle'; return; }
      if (t.state === 'idle') {
        if (self.mode === 'survival' && !self.dead && d < 14 && Math.abs(p[1] - q[1]) < 6) {
          t.state = 'active'; t.spawned = 0; t.wait = 20; wd.setBlock(q[0], q[1], q[2], B.TRIAL_SPAWNER_ACTIVE); w.remesh(q[0], q[2]);
          if (self.ui && self.ui.toast) self.ui.toast('試練が始まった');
          if (WG.Sound) WG.Sound.play('ignite', q[0] + 0.5, q[1] + 0.5, q[2] + 0.5);
        }
        return;
      }
      // 動いている：炎の粒、2 体ずつ出す
      for (var f = 0; f < 2; f++) self.particles.push({ x: q[0] + 0.2 + Math.random() * 0.6, y: q[1] + 0.2 + Math.random() * 0.6, z: q[2] + 0.2 + Math.random() * 0.6, vx: 0, vy: 0.03, vz: 0, life: 10, c: [255, 150 + rint(60), 40], glow: true });
      if (d > 32) { t.state = 'idle'; wd.setBlock(q[0], q[1], q[2], B.TRIAL_SPAWNER); w.remesh(q[0], q[2]); return; }
      if (t.spawned < t.total && alive.length < 2 && (t.wait -= 5) <= 0) {
        for (var k = 0; k < 10; k++) {
          var sx = q[0] + rint(9) - 4, sz = q[2] + rint(9) - 4, sy = q[1];
          if (!WG.COLLIDE[wd.block(sx, sy, sz)] && !WG.COLLIDE[wd.block(sx, sy + 1, sz)] && WG.COLLIDE[wd.block(sx, sy - 1, sz)] >= 1) {
            var m = self.mobs.spawn(t.type, sx + 0.5, sy, sz + 0.5);
            if (m) { m.trialKey = key; m.persist = true; t.spawned++; t.wait = 40; self.puff(sx + 0.5, sy + 1, sz + 0.5, [255, 170, 60], 10, 0.5); }
            break;
          }
        }
      }
      if (t.spawned >= t.total && !alive.length) {
        // 全部倒した：試練の鍵と褒美を上に出し、しばらく休む
        var give = [['TRIAL_KEY', 1]].concat([REWARD[rint(REWARD.length)]].map(function (l) { return [l[0], l[1] + rint(l[2] - l[1] + 1)]; }));
        give.forEach(function (g2, i) { var e = self.spawnItem(g2[0], g2[1], q[0] + 0.5, q[1] + 1.1, q[2] + 0.5, 0.05, 10); if (e) { e.vy = 0.25; e.vx = (i - 0.5) * 0.08; } });
        t.state = 'cool'; t.cool = 36000; wd.setBlock(q[0], q[1], q[2], B.TRIAL_SPAWNER); w.remesh(q[0], q[2]);
        self.puff(q[0] + 0.5, q[1] + 1, q[2] + 0.5, [255, 220, 120], 20, 0.6);
        if (self.ui && self.ui.toast) self.ui.toast('試練を乗りこえた');
        if (WG.Sound) WG.Sound.play('levelup', q[0] + 0.5, q[1] + 1, q[2] + 0.5);
      }
    });
  };
  // 宝庫：試練の鍵で開ける（1 つの宝庫は 1 回だけ）
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), wd = this.world, self = this;
    if (t && t.id === B.VAULT && held && held.key === 'TRIAL_KEY' && !this.spectator) {
      var key = t.x + ',' + t.y + ',' + t.z, used = wd.vaultUsed || (wd.vaultUsed = new Set());
      if (!used.has(key)) {
        used.add(key); if (this.mode === 'survival') this.inv.take(this.inv.sel, 1);
        var tot = VAULT.reduce(function (s, l) { return s + l[3]; }, 0), n = 2 + rint(2);
        for (var i = 0; i < n; i++) {
          var r = rint(tot), l = VAULT[0];
          for (var j = 0; j < VAULT.length; j++) { if (r < VAULT[j][3]) { l = VAULT[j]; break; } r -= VAULT[j][3]; }
          var e = this.spawnItem(l[0], l[1] + rint(l[2] - l[1] + 1), t.x + 0.5, t.y + 1.05, t.z + 0.5, 0.05, 10 + i * 10);
          if (e) e.vy = 0.2;
        }
        wd.setBlock(t.x, t.y, t.z, B.VAULT_OPEN); w.remesh(t.x, t.z);
        this.puff(t.x + 0.5, t.y + 1, t.z + 0.5, [250, 220, 120], 16, 0.5);
        if (WG.Sound) WG.Sound.play('levelup', t.x + 0.5, t.y + 1, t.z + 0.5);
      }
      this.mouseR = this.clickR = false; return;
    }
    return use.apply(this, arguments);
  };
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () { var r = tickExtra.apply(this, arguments); this.tickBrush(); this.tickTrials(); return r; };
})(typeof window !== 'undefined' ? window : globalThis);
