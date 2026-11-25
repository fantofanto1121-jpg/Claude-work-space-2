// ネザーとエンドの残り（ロードマップ 第 7 段階）
// ネザー：真紅の森に真紅のキノコと垂れるつる、歪んだ森に歪んだキノコとねじれたつる、
//         ソウルサンドの谷に骨の化石と天井まで届く玄武岩の柱、玄武岩の三角州に溶岩の池ととがった玄武岩の柱。
//         バイオームごとの霞の色と、舞う胞子・灰
// 建材：真紅と歪んだ木のドア・柵・階段・ハーフブロック・トラップドア・フェンスゲート（js/blocks.js）。キノコに骨粉で巨大なキノコ
// エンド：枝分かれするコーラスの木（外側の島に多い）。コーラスは枝でつながる形
// 貝の箱と貝の番人：染料で 16 色に（箱は中身ごと）
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, hash = WG.hash;
  var C16 = WG.COLORS16;
  function rgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function clone(o) { return o ? JSON.parse(JSON.stringify(o)) : o; }
  function blockItem(key, hardness, drop, tool, chance) {
    var id = B[key]; ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: 1, dropMax: 1, dropChance: chance || 1 };
    if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = 0; }
    return ITEMS[key];
  }
  blockItem('CRIMSON_FUNGUS', 0); blockItem('WARPED_FUNGUS', 0);
  blockItem('WEEPING_VINES', 0, 'WEEPING_VINES', null, 0.33); blockItem('TWISTING_VINES', 0, 'TWISTING_VINES', null, 0.33);
  blockItem('BONE_BLOCK', 2, 'BONE_BLOCK', 'pickaxe');
  C16.forEach(function (c) { blockItem(c[0] + '_SHELL_BOX', 2, null, 'pickaxe'); ITEMS[c[0] + '_SHELL_BOX'].max = 1; });
  if (ITEMS.SHELL_BOX) ITEMS.SHELL_BOX.max = 1;
  Craft.SHAPED.push([['BBB', 'BBB', 'BBB'], { B: 'BONE_MEAL' }, 'BONE_BLOCK', 1]);
  Craft.SHAPELESS.push([['BONE_BLOCK'], 'BONE_MEAL', 9]);

  // ---------------- 貝の箱を染める（中身はそのまま） ----------------
  function dyeOf(key) { var m = /^(\w+)_DYE$/.exec(key || ''); return m && C16.some(function (c) { return c[0] === m[1]; }) ? m[1] : null; }
  WG.shellBoxDye = function (stacks) {
    var cells = stacks.filter(Boolean);
    if (cells.length !== 2) return null;
    var bx = cells.filter(function (s) { return /SHELL_BOX$/.test(s.key); })[0], dy = cells.filter(function (s) { return dyeOf(s.key); })[0];
    if (!bx || !dy) return null;
    var out = dyeOf(dy.key) + '_SHELL_BOX';
    if (out === bx.key) return null;
    var r = { key: out, n: 1 };
    if (bx.box) r.box = clone(bx.box);
    return r;
  };
  var updateCraft = Game.prototype.updateCraft;
  Game.prototype.updateCraft = function () {
    updateCraft.apply(this, arguments);
    var r = WG.shellBoxDye(this.craft || []);
    if (r) this.craftResult = r;
  };

  // ---------------- 巨大なキノコ（骨粉で育つ） ----------------
  function growHugeFungus(wd, x, y, z, crimson, rnd) {
    var stem = crimson ? B.CRIMSON_STEM : B.WARPED_STEM, wart = crimson ? B.NETHER_WART_BLOCK : B.WARPED_WART_BLOCK, h = 4 + Math.floor(rnd() * 5), i;
    for (i = 1; i <= h + 2; i++) if (i > 0 && wd.block(x, y + i, z) !== B.AIR) return false;
    for (i = 0; i < h; i++) wd.setBlock(x, y + i, z, stem);
    for (var dx = -2; dx <= 2; dx++) for (var dz = -2; dz <= 2; dz++) for (var dy = -2; dy <= 1; dy++) {
      var edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
      if (edge && Math.abs(dx) === Math.abs(dz)) continue;
      if (dy === 1 && edge) continue;
      if (dy < 0 && !edge) continue;
      if (wd.block(x + dx, y + h + dy, z + dz) !== B.AIR) continue;
      wd.setBlock(x + dx, y + h + dy, z + dz, rnd() < 0.07 ? B.SHROOMLIGHT : wart);
      // 真紅のキノコの縁からは、つるが垂れる
      if (crimson && edge && dy === -2 && rnd() < 0.4) for (var v = 1; v <= 1 + Math.floor(rnd() * 3) && wd.block(x + dx, y + h + dy - v, z + dz) === B.AIR; v++) wd.setBlock(x + dx, y + h + dy - v, z + dz, B.WEEPING_VINES);
    }
    wd.setBlock(x, y + h, z, wart);
    return true;
  }
  WG.growHugeFungus = growHugeFungus;
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), wd = this.world, surv = this.mode === 'survival', self = this;
    var mt = this.mobs.target && this.mobs.target.mob;
    // 貝の番人を染料で染める
    if (mt && mt.type === 'SHELL_GUARD' && held && dyeOf(held.key)) {
      mt.tint = rgb(C16.filter(function (c) { return c[0] === dyeOf(held.key); })[0][2]);
      if (surv) this.inv.take(this.inv.sel, 1);
      this.mouseR = this.clickR = false;
      return;
    }
    if (t && held && held.key === 'BONE_MEAL' && !this.spectator) {
      var below = wd.block(t.x, t.y - 1, t.z);
      if ((t.id === B.CRIMSON_FUNGUS && below === B.CRIMSON_NYLIUM) || (t.id === B.WARPED_FUNGUS && below === B.WARPED_NYLIUM)) {
        this.mouseR = this.clickR = false;
        if (surv) this.inv.take(this.inv.sel, 1);
        for (var k = 0; k < 6; k++) this.particles.push({ x: t.x + Math.random(), y: t.y + Math.random() * 0.6, z: t.z + Math.random(), vx: 0, vy: 0.02, vz: 0, life: 18, c: [140, 220, 120], smoke: true, sz: 0.05 });
        if (Math.random() < 0.4 || this.mode === 'creative') {
          wd.setBlock(t.x, t.y, t.z, B.AIR);
          if (!growHugeFungus(wd, t.x, t.y, t.z, t.id === B.CRIMSON_FUNGUS, Math.random)) wd.setBlock(t.x, t.y, t.z, t.id);
          for (var rx = t.x - 3; rx <= t.x + 3; rx++) w.remesh(rx, t.z - 3), w.remesh(rx, t.z + 3), w.remesh(rx, t.z);
        }
        return;
      }
      // ナイリウムに骨粉：まわりに根とキノコが生える
      if (t.id === B.CRIMSON_NYLIUM || t.id === B.WARPED_NYLIUM) {
        this.mouseR = this.clickR = false;
        if (surv) this.inv.take(this.inv.sel, 1);
        var cr = t.id === B.CRIMSON_NYLIUM;
        for (var dx = -2; dx <= 2; dx++) for (var dz = -2; dz <= 2; dz++) {
          if (wd.block(t.x + dx, t.y, t.z + dz) !== t.id || wd.block(t.x + dx, t.y + 1, t.z + dz) !== B.AIR || Math.random() < 0.5) continue;
          var r = Math.random();
          wd.setBlock(t.x + dx, t.y + 1, t.z + dz, r < 0.15 ? (cr ? B.CRIMSON_FUNGUS : B.WARPED_FUNGUS) : r < 0.75 ? (cr ? B.CRIMSON_ROOTS : B.WARPED_ROOTS) : (cr ? B.CRIMSON_ROOTS : B.TWISTING_VINES));
        }
        for (dx = -2; dx <= 2; dx++) w.remesh(t.x + dx, t.z);
        return;
      }
    }
    return use.apply(this, arguments);
  };

  // ---------------- ネザーの地形 ----------------
  var Nether = WG.Nether, ngen = Nether.prototype.generate, LAVA_Y = 31, NH = 128;
  function solidN(id) { return id !== B.AIR && id !== B.LAVA && !WG.FLUID[id] && WG.COLLIDE[id] >= 1; }
  Nether.prototype.generate = function (cx, cz) {
    var r = ngen.apply(this, arguments), bl = r.blocks, seed = this.seed, x0 = cx << 4, z0 = cz << 4, i, y, k;
    var at = function (x, y, z) { return x < 0 || x > 15 || z < 0 || z > 15 || y < 1 || y >= NH - 1 ? -1 : bl[(y << 8) | (z << 4) | x]; };
    var put = function (x, y, z, id) { if (x >= 0 && x <= 15 && z >= 0 && z <= 15 && y > 0 && y < NH - 1) bl[(y << 8) | (z << 4) | x] = id; };
    var bio = new Uint8Array(256);
    for (i = 0; i < 256; i++) bio[i] = this.biomeAt(x0 + (i & 15), z0 + (i >> 4));
    // 1 列ずつ：床の上と天井の下に飾りを足す
    for (i = 0; i < 256; i++) {
      var x = i & 15, z = i >> 4, wx = x0 + x, wz = z0 + z, bb = bio[i];
      if (bb === 0) continue;
      for (y = LAVA_Y + 1; y < NH - 6; y++) {
        var id = bl[(y << 8) | i], up = bl[((y + 1) << 8) | i], dn = bl[((y - 1) << 8) | i], h = hash(seed, wx, y, wz, 901);
        // 床
        if (up === B.AIR && solidN(id)) {
          if (bb === 1 && id === B.CRIMSON_NYLIUM && h % 13 === 0) put(x, y + 1, z, B.CRIMSON_FUNGUS);
          if (bb === 2 && id === B.WARPED_NYLIUM) {
            if (h % 13 === 0) put(x, y + 1, z, B.WARPED_FUNGUS);
            else if (h % 9 === 1) { var n = 1 + (h >>> 8) % 5; for (k = 1; k <= n && at(x, y + k, z) === B.AIR; k++) put(x, y + k, z, B.TWISTING_VINES); }
          }
          // 三角州：まわりが固い所は溶岩の池に（縁は玄武岩のまま）
          if (bb === 4 && (id === B.BASALT || id === B.BLACKSTONE || id === B.MAGMA) && x > 0 && x < 15 && z > 0 && z < 15) {
            var cell = hash(seed, wx >> 2, 0, wz >> 2, 902);
            if (cell % 4 === 0 && solidN(at(x + 1, y, z)) && solidN(at(x - 1, y, z)) && solidN(at(x, y, z + 1)) && solidN(at(x, y, z - 1)) && solidN(dn)) {
              put(x, y, z, B.LAVA);
              if (at(x, y - 1, z) === B.NETHERRACK) put(x, y - 1, z, B.BASALT);
            }
          }
        }
        // 天井
        if (dn === B.AIR && solidN(id)) {
          if (bb === 1 && (id === B.NETHERRACK || id === B.NETHER_WART_BLOCK || id === B.CRIMSON_NYLIUM) && h % (id === B.NETHER_WART_BLOCK ? 3 : 6) === 0) {
            var m = 1 + (h >>> 8) % 6;
            for (k = 1; k <= m && at(x, y - k, z) === B.AIR; k++) put(x, y - k, z, B.WEEPING_VINES);
          }
        }
      }
    }
    // チャンクごとの大きな飾り
    for (k = 0; k < 5; k++) {
      var tx = 2 + hash(seed, cx, k, cz, 903) % 12, tz = 2 + hash(seed, cx, k, cz, 904) % 12, b0 = bio[(tz << 4) | tx], hh = hash(seed, cx, k, cz, 905);
      // 三角州：とがった玄武岩の柱の群れ
      if (b0 === 4) {
        for (y = NH - 8; y > LAVA_Y; y--) {
          if (!(solidN(at(tx, y, tz)) && at(tx, y + 1, tz) === B.AIR)) continue;
          var top = 3 + hh % 10;
          [[0, 0, 0], [1, 0, -2], [-1, 0, -3], [0, 1, -4], [0, -1, -2]].forEach(function (o) {
            var px = tx + o[0], pz = tz + o[1], ph = Math.max(1, top + o[2]);
            for (var j = 1; j <= ph && at(px, y + j, pz) === B.AIR; j++) put(px, y + j, pz, B.BASALT);
          });
          break;
        }
      }
      // ソウルサンドの谷：天井まで届く玄武岩の柱
      if (b0 === 3 && hh % 4 === 0) {
        for (y = LAVA_Y + 1; y < NH - 8; y++) {
          if (!(solidN(at(tx, y, tz)) && at(tx, y + 1, tz) === B.AIR)) continue;
          var ceil = 0;
          for (var j2 = 1; j2 < 40; j2++) if (solidN(at(tx, y + j2, tz))) { ceil = j2; break; }
          if (ceil > 3) for (j2 = 1; j2 < ceil; j2++) { put(tx, y + j2, tz, B.BASALT); if (j2 < 3 || ceil - j2 < 3) { put(tx + 1, y + j2, tz, at(tx + 1, y + j2, tz) === B.AIR ? B.BASALT : at(tx + 1, y + j2, tz)); put(tx, y + j2, tz + 1, at(tx, y + j2, tz + 1) === B.AIR ? B.BASALT : at(tx, y + j2, tz + 1)); } }
          break;
        }
      }
    }
    // ソウルサンドの谷：骨の化石（背骨と、左右に下りるあばら）
    if (hash(seed, cx, 7, cz, 906) % 5 === 0 && bio[(8 << 4) | 8] === 3) {
      var fx = 3, fz = 8, gy = -1;
      for (y = NH - 10; y > LAVA_Y; y--) if (solidN(at(8, y, 8)) && at(8, y + 1, 8) === B.AIR) { gy = y; break; }
      if (gy > 0) {
        var sh = 4 + hash(seed, cx, 8, cz, 907) % 3, len = 8 + hash(seed, cx, 9, cz, 908) % 3;
        for (var a = 0; a < len; a++) {
          var ax = fx + a;
          put(ax, gy + sh, fz, B.BONE_BLOCK);
          if (a % 2 === 0 && a > 0 && a < len - 1) {
            for (var side = -1; side <= 1; side += 2) {
              [[1, 0], [2, -1], [3, -2], [3, -3], [3, -4]].forEach(function (o) {
                var py = gy + sh + o[1], pz = fz + side * o[0];
                if (py > gy && at(ax, py, pz) === B.AIR) put(ax, py, pz, B.BONE_BLOCK);
              });
            }
          }
        }
      }
    }
    return r;
  };

  // ---------------- エンド：枝分かれするコーラスの木 ----------------
  var End = WG.End, egen = End.prototype.generate;
  function growChorus(put, at, x, y, z, depth, rnd) {
    var h = 1 + Math.floor(rnd() * (depth === 0 ? 4 : 3)), j;
    for (j = 0; j < h; j++) { if (at(x, y + j, z) !== B.AIR) return; put(x, y + j, z, B.CHORUS_PLANT); }
    var top = y + h - 1, branched = false;
    if (depth < 4) {
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], n = depth === 0 ? 1 + Math.floor(rnd() * 3) : Math.floor(rnd() * 3);
      for (var b = 0; b < n; b++) {
        var d = dirs[Math.floor(rnd() * 4)], nx = x + d[0], nz = z + d[1];
        if (nx < 1 || nx > 14 || nz < 1 || nz > 14 || at(nx, top, nz) !== B.AIR || at(nx, top - 1, nz) !== B.AIR) continue;
        put(nx, top, nz, B.CHORUS_PLANT); branched = true;
        growChorus(put, at, nx, top + 1, nz, depth + 1, rnd);
      }
    }
    if (!branched && at(x, top + 1, z) === B.AIR) put(x, top + 1, z, B.CHORUS_FLOWER);
  }
  if (End && egen) End.prototype.generate = function (cx, cz) {
    var r = egen.apply(this, arguments), bl = r.blocks, seed = this.seed, x0 = cx << 4, z0 = cz << 4, H = 256, i, y;
    var at = function (x, y, z) { return x < 0 || x > 15 || z < 0 || z > 15 || y < 1 || y >= H - 1 ? -1 : bl[(y << 8) | (z << 4) | x]; };
    var put = function (x, y, z, id) { if (x >= 0 && x <= 15 && z >= 0 && z <= 15 && y > 0 && y < H - 1) bl[(y << 8) | (z << 4) | x] = id; };
    // 前の、まっすぐなコーラスを抜いて、その場所に木を植え直す
    var roots = [];
    for (i = 0; i < 256; i++) for (y = 2; y < H - 2; y++) {
      var id = bl[(y << 8) | i];
      if (id !== B.CHORUS_PLANT && id !== B.CHORUS_FLOWER) continue;
      if (bl[((y - 1) << 8) | i] === B.END_STONE) roots.push([i & 15, y, i >> 4]);
      bl[(y << 8) | i] = B.AIR;
    }
    // 外側の島（中心から 260 より遠い）には、もっと多く
    var far = x0 * x0 + z0 * z0 > 300 * 300;
    if (far) for (var k = 0; k < 4; k++) {
      var tx = 2 + hash(seed, cx, k, cz, 951) % 12, tz = 2 + hash(seed, cx, k, cz, 952) % 12;
      if (hash(seed, cx, k, cz, 953) % 3) continue;
      for (y = H - 20; y > 2; y--) { var b = at(tx, y, tz); if (b === B.AIR) continue; if (b === B.END_STONE && at(tx, y + 1, tz) === B.AIR) roots.push([tx, y + 1, tz]); break; }
    }
    roots.forEach(function (q, n) {
      var s = hash(seed, x0 + q[0], q[1], z0 + q[2], 954) >>> 0;
      var rnd = function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      var x = Math.max(2, Math.min(13, q[0])), z = Math.max(2, Math.min(13, q[2]));
      if (at(x, q[1] - 1, z) !== B.END_STONE) { x = q[0]; z = q[2]; }
      growChorus(put, at, x, q[1], z, 0, rnd);
      void n;
    });
    return r;
  };

  // ---------------- ネザーの霞の色と、舞う胞子・灰 ----------------
  // 0 荒地、1 真紅の森、2 歪んだ森、3 ソウルサンドの谷、4 玄武岩の三角州
  var FOG = [[0.2, 0.05, 0.04], [0.22, 0.04, 0.03], [0.07, 0.05, 0.11], [0.12, 0.2, 0.21], [0.36, 0.33, 0.38]];
  var SKY_K = [1, 0.9, 0.85, 0.75, 0.5];
  WG.NETHER_FOG = FOG;
  var sky = Game.prototype.sky;
  Game.prototype.sky = function () {
    var s = sky.apply(this, arguments), wd = this.world;
    if (s || wd.dimKey !== 'nether' || !wd.gen || !wd.gen.biomeAt) return s;
    var p = this.walker.pos, b = wd.gen.biomeAt(Math.floor(p[0]), Math.floor(p[2]));
    var cur = this._nfog || (this._nfog = FOG[b].slice().concat([SKY_K[b]])), want = FOG[b].concat([SKY_K[b]]);
    for (var i = 0; i < 4; i++) cur[i] += (want[i] - cur[i]) * 0.03;
    var c = cur.slice(0, 3);
    return { top: c.map(function (v) { return v * 0.8; }), low: c, fog: c, dark: 0, tint: [1, 1, 1], fogK: cur[3] };
  };
  var PART = [null, { c: [176, 44, 40], fall: true }, { c: [60, 190, 170], rise: true }, { c: [120, 160, 170], fall: true, drift: true }, { c: [214, 210, 206], fall: true, drift: true }];
  var tick = Game.prototype.tick;
  Game.prototype.tick = function () {
    var r = tick.apply(this, arguments), wd = this.world;
    if (wd.dimKey !== 'nether' || !wd.gen || !wd.gen.biomeAt || !this.particles || this.particles.length > 1500) return r;
    var p = this.walker.pos, b = wd.gen.biomeAt(Math.floor(p[0]), Math.floor(p[2])), P = PART[b];
    if (!P) return r;
    var n = b === 4 ? 4 : 2;
    for (var i = 0; i < n; i++) {
      var x = p[0] + (Math.random() - 0.5) * 22, y = p[1] + (Math.random() - 0.3) * 12, z = p[2] + (Math.random() - 0.5) * 22;
      if (wd.block(Math.floor(x), Math.floor(y), Math.floor(z)) !== B.AIR) continue;
      this.particles.push({ x: x, y: y, z: z, vx: P.drift ? 0.02 + Math.random() * 0.02 : (Math.random() - 0.5) * 0.01, vy: P.rise ? 0.012 : -0.01, vz: P.drift ? 0.01 : (Math.random() - 0.5) * 0.01,
        life: 70 + Math.floor(Math.random() * 40), c: P.c, smoke: !!P.rise, fw: !!P.fall, sz: 0.03 + Math.random() * 0.025 });
    }
    return r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
