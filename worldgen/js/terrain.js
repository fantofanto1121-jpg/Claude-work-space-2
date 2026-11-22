// 第 5 回：地形・植物・石・ネザーのバイオーム。生成した後のチャンクに手を加える（場所とシードだけで決まるので、何度作っても同じ）。
// 地上：花崗岩・閃緑岩・安山岩（石の中の塊）、凝灰岩（深層岩の中）、アメジストの晶洞、地下の帯水層（洞窟の水たまり）、崖の泉と溶岩の滝、
//       雪原の雪の層、カボチャ・スイカ・竹・カカオ・つる・スイレンの葉・海草・昆布・サンゴ・巨大キノコ。
// ネザー：真紅の森・歪んだ森・ソウルサンドの谷・玄武岩の三角州（地面・木にあたる巨大菌・根・玄武岩の柱）、古代の残骸。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, hash = WG.hash, rnd = WG.rnd;
  var MINY = -64, H = 384, SEA = 63;

  // ---------------- アイテムとレシピ ----------------
  function item(key, name, max, extra) { var it = { key: key, name: name, block: -1, max: max || 64, shape: 'lump', color: '#888888' }; for (var k in extra || {}) it[k] = extra[k]; ITEMS[key] = it; return it; }
  item('MELON_SLICE', 'スイカの薄切り', 64, { food: 2, sat: 0.6 }); item('PUMPKIN_SEEDS', 'カボチャの種', 64, { plant: 'PUMPKIN_STEM_0' }); item('MELON_SEEDS', 'スイカの種', 64, { plant: 'MELON_STEM_0' });
  item('AMETHYST_SHARD', 'アメジストのかけら'); item('DRIED_KELP', '乾燥した昆布', 64, { food: 1, sat: 0.6 });
  Craft.SHAPELESS.push([['PUMPKIN'], 'PUMPKIN_SEEDS', 4], [['MELON_SLICE'], 'MELON_SEEDS', 1], [['BAMBOO', 'BAMBOO'], 'STICK', 1], [['CRIMSON_STEM'], 'CRIMSON_PLANKS', 4], [['WARPED_STEM'], 'WARPED_PLANKS', 4]);
  Craft.SHAPED.push([['MMM', 'MMM', 'MMM'], { M: 'MELON_SLICE' }, 'MELON', 1], [['AA', 'AA'], { A: 'AMETHYST_SHARD' }, 'AMETHYST_BLOCK', 1]);
  Craft.SMELT.KELP = 'DRIED_KELP';
  // 真紅・歪んだ板材も「板材」として使える（燃えないので燃料にはならない）
  if (Craft.GROUPS) { Craft.GROUPS.PLANKS.push('CRIMSON_PLANKS', 'WARPED_PLANKS'); Craft.GROUPS.LOGS.push('CRIMSON_STEM', 'WARPED_STEM'); }
  Craft.FUEL.BAMBOO = 50;
  if (WG.MOB_TYPES.PANDA) WG.MOB_TYPES.PANDA.drops = [['BAMBOO', 0, 2]];
  if (WG.COMPOST) { WG.COMPOST.MELON_SLICE = 0.5; WG.COMPOST.PUMPKIN_SEEDS = 0.3; WG.COMPOST.MELON_SEEDS = 0.3; WG.COMPOST.KELP = 0.3; WG.COMPOST.BAMBOO = 0.5; WG.COMPOST.COCOA_BEANS = 0.65; }

  // ---------------- 地上 ----------------
  var Overworld = WG.Overworld || (WG.DIMS.overworld && WG.DIMS.overworld.Gen);
  var gen = Overworld.prototype.generate;
  Overworld.prototype.generate = function (cx, cz, surfaceOnly) {
    var r = gen.call(this, cx, cz, surfaceOnly);
    if (!this.nStone) {
      this.nStone = new WG.Perlin(this.seed, 501); this.nStone2 = new WG.Perlin(this.seed, 502); this.nAq = new WG.Perlin(this.seed, 503);
    }
    decorate(this, r.blocks, r.hmap, r.biome, cx, cz, surfaceOnly);
    return r;
  };
  function idx(i, y) { return ((y - MINY) << 8) | i; }
  function bkey(b) { return WG.BIOMES[b].key; }
  function decorate(g, bl, hmap, biome, cx, cz, surfaceOnly) {
    var seed = g.seed, x0 = cx << 4, z0 = cz << 4, i, y, k;
    var get = function (x, y, z) { return x < 0 || x > 15 || z < 0 || z > 15 || y < MINY || y >= MINY + H ? -1 : bl[idx((z << 4) | x, y)]; };
    var set = function (x, y, z, id) { if (x >= 0 && x <= 15 && z >= 0 && z <= 15 && y > MINY && y < MINY + H) bl[idx((z << 4) | x, y)] = id; };
    var R = function (n) { return rnd(seed, cx, n, cz, 777); };

    // 1. 石の種類：4×4×4 ごとの粗いノイズを補間して、石の中に花崗岩・閃緑岩・安山岩の塊、深層岩の中に凝灰岩
    var top = 0; for (i = 0; i < 256; i++) top = Math.max(top, hmap[i]);
    var gyN = ((top - MINY) >> 3) + 2, A = new Float32Array(9 * gyN), Bn = new Float32Array(9 * gyN), gx, gz, gy;
    for (gy = 0; gy < gyN; gy++) for (gz = 0; gz < 3; gz++) for (gx = 0; gx < 3; gx++) {
      var wx = x0 + gx * 8, wy = MINY + gy * 8, wz = z0 + gz * 8;
      A[(gy * 3 + gz) * 3 + gx] = g.nStone.noise(wx / 30, wy / 18, wz / 30);
      Bn[(gy * 3 + gz) * 3 + gx] = g.nStone2.noise(wx / 26, wy / 16, wz / 26);
    }
    for (i = 0; i < 256; i++) {
      var x = i & 15, z = i >> 4, ax = x >> 3, az = z >> 3, fx = (x & 7) / 8, fz = (z & 7) / 8, hmax = hmap[i];
      for (y = MINY + 5; y <= hmax; y++) {
        var id = bl[idx(i, y)];
        if (id !== B.STONE && id !== B.DEEPSLATE) continue;
        var yy = y - MINY, g8 = yy >> 3, fy = (yy & 7) / 8;
        var tri = function (F) {
          var k0 = (g8 * 3 + az) * 3 + ax, k1 = k0 + 9;
          var a0 = F[k0] * (1 - fx) * (1 - fz) + F[k0 + 1] * fx * (1 - fz) + F[k0 + 3] * (1 - fx) * fz + F[k0 + 4] * fx * fz;
          var a1 = F[k1] * (1 - fx) * (1 - fz) + F[k1 + 1] * fx * (1 - fz) + F[k1 + 3] * (1 - fx) * fz + F[k1 + 4] * fx * fz;
          return a0 + (a1 - a0) * fy;
        };
        var a = tri(A), b2 = tri(Bn);
        if (id === B.DEEPSLATE) { if (a > 0.42) bl[idx(i, y)] = B.TUFF; continue; }
        if (a > 0.45) bl[idx(i, y)] = B.GRANITE; else if (a < -0.45) bl[idx(i, y)] = B.DIORITE; else if (b2 > 0.46) bl[idx(i, y)] = B.ANDESITE;
      }
    }
    if (!surfaceOnly) {
      // 2. アメジストの晶洞（約 24 チャンクに 1 つ。外から なめらかな玄武岩・方解石・アメジスト、中は空洞で結晶）
      if (R(1) < 1 / 24) {
        var gcx = 6 + Math.floor(R(2) * 4), gcz = 6 + Math.floor(R(3) * 4), gcy = -50 + Math.floor(R(4) * 70), rad = 4.6;
        for (var dx = -6; dx <= 6; dx++) for (var dy = -6; dy <= 6; dy++) for (var dz = -6; dz <= 6; dz++) {
          var d = Math.hypot(dx, dy * 1.1, dz), cur = get(gcx + dx, gcy + dy, gcz + dz);
          if (d > rad + 1.6 || cur < 0 || cur === B.BEDROCK) continue;
          set(gcx + dx, gcy + dy, gcz + dz, d > rad + 0.8 ? B.SMOOTH_BASALT : d > rad ? B.CALCITE : d > rad - 0.9 ? B.AMETHYST_BLOCK : B.AIR);
        }
        for (dx = -4; dx <= 4; dx++) for (dy = -4; dy <= 4; dy++) for (dz = -4; dz <= 4; dz++) {
          if (get(gcx + dx, gcy + dy, gcz + dz) !== B.AIR || hash(seed, x0 + dx, gcy + dy, z0 + dz, 778) % 5) continue;
          if ([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(function (q) { return get(gcx + dx + q[0], gcy + dy + q[1], gcz + dz + q[2]) === B.AMETHYST_BLOCK; })) set(gcx + dx, gcy + dy, gcz + dz, B.AMETHYST_CLUSTER);
        }
      }
      // 3. 地下の帯水層：洞窟の低い所に水がたまる（場所ごとに水面の高さが違う）
      for (i = 0; i < 256; i++) {
        var wx2 = x0 + (i & 15), wz2 = z0 + (i >> 4), lvl = Math.floor(-30 + g.nAq.noise(wx2 / 90, 0.5, wz2 / 90) * 70), on = g.nAq.noise(wx2 / 50, 7.5, wz2 / 50) > 0.12;
        if (!on) continue;
        for (y = -50; y <= Math.min(lvl, hmap[i] - 10); y++) if (bl[idx(i, y)] === B.AIR) bl[idx(i, y)] = B.WATER;
      }
    }
    // 4. 崖の泉と溶岩の滝（崖や洞窟の壁から流れ落ちる）
    var ROCK = function (id) { return id === B.STONE || id === B.GRANITE || id === B.DIORITE || id === B.ANDESITE || id === B.DEEPSLATE || id === B.TUFF; };
    for (k = 0; k < 10; k++) {
      if (R(10 + k) > 0.5) continue;
      var sx = 1 + Math.floor(R(30 + k) * 14), sz = 1 + Math.floor(R(50 + k) * 14), si = (sz << 4) | sx, lava = R(70 + k) < 0.3;
      var dd = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(R(110 + k) * 4)], ox = sx + dd[0], oz = sz + dd[1];
      // 壁を探す：岩の横が空気で、その下も空気、上は岩（地表から 2 段以上下）
      var yHi = lava ? Math.min(20, hmap[si] - 4) : hmap[si] - 2, yLo = lava ? -50 : SEA + 2, sy = null;
      if (surfaceOnly) yLo = Math.max(yLo, hmap[si] - 30);
      for (var yy2 = yHi; yy2 >= yLo; yy2--) {
        if (ROCK(get(sx, yy2, sz)) && ROCK(get(sx, yy2 + 1, sz)) && get(ox, yy2, oz) === B.AIR && get(ox, yy2 - 1, oz) === B.AIR) { sy = yy2; break; }
      }
      if (sy == null) continue;
      set(sx, sy, sz, lava ? B.LAVA : B.WATER);
      set(ox, sy, oz, B[(lava ? 'LAVA' : 'WATER') + '_1'] || (lava ? B.LAVA : B.WATER));
      for (var fy2 = sy - 1; fy2 > MINY + 2 && get(ox, fy2, oz) === B.AIR; fy2--) set(ox, fy2, oz, B[(lava ? 'LAVA' : 'WATER') + '_FALL']);
    }
    // 5. 雪原の雪の層
    for (i = 0; i < 256; i++) {
      var bk = bkey(biome[i]);
      if (bk !== 'snowy_plains' && bk !== 'snowy_mountain') continue;
      for (y = hmap[i] + 24; y >= hmap[i]; y--) {
        var t2 = bl[idx(i, y)];
        if (t2 === B.AIR) continue;
        if (WG.COLLIDE[t2] >= 1 && !WG.FLUID[t2] && t2 !== B.ICE && bl[idx(i, y + 1)] === B.AIR) bl[idx(i, y + 1)] = B.SNOW_LAYER;
        break;
      }
    }
    // 6. 植物：バイオームごとに
    var mid = biome[136], mb = bkey(mid);
    var grassTop = function (x, z) { var ii = (z << 4) | x, h = hmap[ii]; return bl[idx(ii, h)] === B.GRASS && bl[idx(ii, h + 1)] === B.AIR ? h : null; };
    // カボチャの畑（平原・森・タイガ・サバンナ）とスイカ（ジャングル）
    if ((mb === 'plains' || mb === 'forest' || mb === 'taiga' || mb === 'savanna') && R(200) < 1 / 30) {
      for (k = 0; k < 12; k++) { var px = 3 + Math.floor(R(201 + k) * 10), pz = 3 + Math.floor(R(220 + k) * 10), ph = grassTop(px, pz); if (ph != null) set(px, ph + 1, pz, B.PUMPKIN); }
    }
    // スイートベリーの茂み（タイガ）
    if (mb === 'taiga' && R(204) < 1 / 5) {
      for (k = 0; k < 6; k++) { px = 2 + Math.floor(R(205 + k) * 12); pz = 2 + Math.floor(R(212 + k) * 12); ph = grassTop(px, pz); if (ph != null) set(px, ph + 1, pz, B['SWEET_BERRY_BUSH_' + (2 + Math.floor(R(230 + k) * 2))]); }
    }
    if (mb === 'jungle') {
      if (R(240) < 1 / 10) for (k = 0; k < 10; k++) { px = 3 + Math.floor(R(241 + k) * 10); pz = 3 + Math.floor(R(260 + k) * 10); ph = grassTop(px, pz); if (ph != null) set(px, ph + 1, pz, B.MELON); }
      // 竹の林
      if (R(280) < 1 / 5) for (k = 0; k < 18; k++) {
        px = 1 + Math.floor(R(281 + k) * 14); pz = 1 + Math.floor(R(300 + k) * 14); ph = grassTop(px, pz);
        if (ph == null) continue;
        var bh = 5 + Math.floor(R(320 + k) * 8);
        for (y = 1; y <= bh && get(px, ph + y, pz) === B.AIR; y++) set(px, ph + y, pz, B.BAMBOO);
      }
      // ジャングルの木の幹にカカオの実
      for (i = 0; i < 256; i++) {
        var lx = i & 15, lz = i >> 4;
        for (y = hmap[i] + 1; y < hmap[i] + 8; y++) {
          if (bl[idx(i, y)] !== B.JUNGLE_LOG || hash(seed, x0 + lx, y, z0 + lz, 779) % 9) continue;
          var cd = [[0, -1, 'S'], [0, 1, 'N'], [1, 0, 'W'], [-1, 0, 'E']][hash(seed, x0 + lx, y, z0 + lz, 780) % 4];
          if (get(lx + cd[0], y, lz + cd[1]) === B.AIR) set(lx + cd[0], y, lz + cd[1], B['COCOA_' + cd[2] + '_1']);
        }
      }
    }
    // つる（ジャングルと沼の葉から垂れる）
    if (mb === 'jungle' || mb === 'swamp') {
      for (i = 0; i < 256; i++) for (y = hmap[i] + 3; y < hmap[i] + 20; y++) {
        var lid = bl[idx(i, y)];
        if (lid !== B.JUNGLE_LEAVES && lid !== B.OAK_LEAVES) continue;
        var vx = i & 15, vz = i >> 4;
        [[1, 0, 'E'], [-1, 0, 'W'], [0, 1, 'S'], [0, -1, 'N']].forEach(function (q, n) {
          if (hash(seed, x0 + vx, y, z0 + vz, 781 + n) % 6) return;
          var tx = vx + q[0], tz = vz + q[1], key = { E: 'W', W: 'E', S: 'N', N: 'S' }[q[2]], len = 1 + hash(seed, x0 + vx, y, z0 + vz, 790 + n) % 5;
          for (var j = 0; j < len && get(tx, y - j, tz) === B.AIR; j++) set(tx, y - j, tz, B['VINE_' + key]);
        });
      }
    }
    // スイレンの葉（沼の水面）、海草・昆布・サンゴ（海の底）
    var warm = hash(seed, Math.floor(x0 / 96), 0, Math.floor(z0 / 96), 791) % 3 === 0;
    for (i = 0; i < 256; i++) {
      var hb = bkey(biome[i]), fl = hmap[i], h3 = hash(seed, x0 + (i & 15), fl, z0 + (i >> 4), 792);
      if (fl >= SEA) continue;
      if (hb === 'swamp' && bl[idx(i, SEA)] === B.WATER && bl[idx(i, SEA + 1)] === B.AIR && h3 % 10 === 0) { bl[idx(i, SEA + 1)] = B.LILY_PAD; continue; }
      if (bl[idx(i, fl + 1)] !== B.WATER) continue;
      var depth = SEA - fl;
      if (warm && depth >= 2 && depth < 14 && (hb === 'ocean' || hb === 'beach')) {
        var coral = WG.CORALS[(h3 >>> 4) % 5][0];
        if (h3 % 4 === 0) { bl[idx(i, fl)] = B[coral + '_CORAL_BLOCK']; if (bl[idx(i, fl + 1)] === B.WATER && (h3 >>> 8) % 2) bl[idx(i, fl + 1)] = B[coral + '_CORAL']; }
        else if (h3 % 4 === 1) bl[idx(i, fl + 1)] = B[coral + '_CORAL'];
        continue;
      }
      if (h3 % 11 === 0 && depth >= 4) { var kl = 2 + (h3 >>> 5) % Math.max(1, depth - 2); for (y = 1; y <= kl && bl[idx(i, fl + y)] === B.WATER && fl + y < SEA; y++) bl[idx(i, fl + y)] = B.KELP; }
      else if (h3 % 5 === 0) bl[idx(i, fl + 1)] = B.SEAGRASS;
    }
    // 7. 巨大キノコ（沼と森に、ときどき）
    if ((mb === 'swamp' && R(400) < 1 / 6) || (mb === 'forest' && R(400) < 1 / 30)) {
      var mx = 5 + Math.floor(R(401) * 6), mz = 5 + Math.floor(R(402) * 6), mh = grassTop(mx, mz), red = R(403) < 0.5;
      if (mh != null) {
        var sh2 = 5 + Math.floor(R(404) * 3), cap = red ? B.RED_MUSHROOM_BLOCK : B.BROWN_MUSHROOM_BLOCK;
        for (y = 1; y <= sh2; y++) set(mx, mh + y, mz, B.MUSHROOM_STEM);
        if (red) {
          for (var ddx = -2; ddx <= 2; ddx++) for (var ddz = -2; ddz <= 2; ddz++) for (var ddy = -3; ddy <= 1; ddy++) {
            var edge = Math.abs(ddx) === 2 || Math.abs(ddz) === 2;
            if (ddy === 1 && (Math.abs(ddx) === 2 || Math.abs(ddz) === 2)) continue;
            if (ddy < 1 && !edge) continue;
            if (Math.abs(ddx) === 2 && Math.abs(ddz) === 2) continue;
            if (get(mx + ddx, mh + sh2 + ddy, mz + ddz) === B.AIR) set(mx + ddx, mh + sh2 + ddy, mz + ddz, cap);
          }
        } else {
          for (ddx = -3; ddx <= 3; ddx++) for (ddz = -3; ddz <= 3; ddz++) if (!(Math.abs(ddx) === 3 && Math.abs(ddz) === 3) && get(mx + ddx, mh + sh2 + 1, mz + ddz) === B.AIR) set(mx + ddx, mh + sh2 + 1, mz + ddz, cap);
        }
      }
    }
  }

  // ---------------- ネザー ----------------
  var Nether = WG.Nether, ngen = Nether.prototype.generate, LAVA_Y = 31, NH = 128;
  // ネザーのバイオーム：0 荒地、1 真紅の森、2 歪んだ森、3 ソウルサンドの谷、4 玄武岩の三角州
  Nether.prototype.biomeAt = function (x, z) {
    if (!this.nBio) { this.nBio = new WG.Perlin(this.seed, 511); this.nBio2 = new WG.Perlin(this.seed, 512); }
    var a = this.nBio.fbm2(x / 170, z / 170, 2), b = this.nBio2.fbm2(x / 150, z / 150, 2);
    return a > 0.22 ? 1 : a < -0.22 ? 2 : b > 0.25 ? 3 : b < -0.25 ? 4 : 0;
  };
  WG.NETHER_BIOMES = ['ネザーの荒地', '真紅の森', '歪んだ森', 'ソウルサンドの谷', '玄武岩の三角州'];
  Nether.prototype.generate = function (cx, cz) {
    var r = ngen.call(this, cx, cz), bl = r.blocks, seed = this.seed, x0 = cx << 4, z0 = cz << 4, i, y;
    var at = function (x, y, z) { return x < 0 || x > 15 || z < 0 || z > 15 || y < 1 || y >= NH - 1 ? -1 : bl[(y << 8) | (z << 4) | x]; };
    var put = function (x, y, z, id) { if (x >= 0 && x <= 15 && z >= 0 && z <= 15 && y > 0 && y < NH - 1) bl[(y << 8) | (z << 4) | x] = id; };
    var bio = new Uint8Array(256);
    for (i = 0; i < 256; i++) bio[i] = this.biomeAt(x0 + (i & 15), z0 + (i >> 4));
    for (i = 0; i < 256; i++) {
      var x = i & 15, z = i >> 4, wx = x0 + x, wz = z0 + z, bb = bio[i];
      for (y = LAVA_Y + 1; y < NH - 6; y++) {
        var id = bl[(y << 8) | i], up = bl[((y + 1) << 8) | i];
        if (up !== B.AIR || (id !== B.NETHERRACK && id !== B.SOUL_SAND && id !== B.SOUL_SOIL && id !== B.MAGMA && id !== B.BASALT)) continue;
        var h = hash(seed, wx, y, wz, 801);
        if (bb === 1 || bb === 2) {
          bl[(y << 8) | i] = bb === 1 ? B.CRIMSON_NYLIUM : B.WARPED_NYLIUM;
          if (h % 6 === 0) bl[((y + 1) << 8) | i] = bb === 1 ? B.CRIMSON_ROOTS : B.WARPED_ROOTS;
        } else if (bb === 3) {
          bl[(y << 8) | i] = h % 3 ? B.SOUL_SAND : B.SOUL_SOIL;
          if (bl[((y - 1) << 8) | i] === B.NETHERRACK) bl[((y - 1) << 8) | i] = B.SOUL_SOIL;
        } else if (bb === 4) {
          bl[(y << 8) | i] = h % 7 === 0 ? B.MAGMA : h % 3 ? B.BASALT : B.BLACKSTONE;
          for (var d = 1; d < 4; d++) if (bl[((y - d) << 8) | i] === B.NETHERRACK) bl[((y - d) << 8) | i] = B.BLACKSTONE;
        }
      }
    }
    // 巨大な菌（真紅・歪んだ森の木にあたる）と玄武岩の柱
    for (var k = 0; k < 6; k++) {
      var tx = 2 + hash(seed, cx, k, cz, 802) % 12, tz = 2 + hash(seed, cx, k, cz, 803) % 12, b0 = bio[(tz << 4) | tx];
      if (b0 !== 1 && b0 !== 2 && b0 !== 4) continue;
      for (y = NH - 8; y > LAVA_Y; y--) {
        var ground = at(tx, y, tz);
        if (b0 === 4 && ground === B.BASALT && at(tx, y + 1, tz) === B.AIR) { var ph = 2 + hash(seed, cx, k, cz, 804) % 6; for (var j = 1; j <= ph && at(tx, y + j, tz) === B.AIR; j++) put(tx, y + j, tz, B.BASALT); break; }
        if ((ground === B.CRIMSON_NYLIUM || ground === B.WARPED_NYLIUM) && (at(tx, y + 1, tz) === B.AIR || at(tx, y + 1, tz) === B.CRIMSON_ROOTS || at(tx, y + 1, tz) === B.WARPED_ROOTS)) {
          var crim = ground === B.CRIMSON_NYLIUM, stem = crim ? B.CRIMSON_STEM : B.WARPED_STEM, wart = crim ? B.NETHER_WART_BLOCK : B.WARPED_WART_BLOCK, th = 5 + hash(seed, cx, k, cz, 805) % 5;
          var free = true; for (j = 1; j <= th + 2; j++) if (at(tx, y + j, tz) !== B.AIR && j > 1) free = false;
          if (!free) break;
          for (j = 1; j <= th; j++) put(tx, y + j, tz, stem);
          for (var dx = -2; dx <= 2; dx++) for (var dz = -2; dz <= 2; dz++) for (var dy = -2; dy <= 1; dy++) {
            if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
            if (dy === 1 && (Math.abs(dx) === 2 || Math.abs(dz) === 2)) continue;
            if (at(tx + dx, y + th + dy, tz + dz) !== B.AIR) continue;
            var hh = hash(seed, x0 + tx + dx, y + th + dy, z0 + tz + dz, 806);
            put(tx + dx, y + th + dy, tz + dz, hh % 17 === 0 ? B.SHROOMLIGHT : wart);
          }
          break;
        }
      }
    }
    // 古代の残骸（y 8〜22 のネザーラックの中に、ときどき 1〜2 個）
    for (k = 0; k < 2; k++) {
      if (hash(seed, cx, 40 + k, cz, 807) % 3) continue;
      var ax = hash(seed, cx, 50 + k, cz, 808) % 16, az = hash(seed, cx, 60 + k, cz, 809) % 16, ay = 8 + hash(seed, cx, 70 + k, cz, 810) % 15;
      if (at(ax, ay, az) === B.NETHERRACK) put(ax, ay, az, B.ANCIENT_DEBRIS);
    }
    return r;
  };

  // ---------------- 遊ぶとき：育つ・置く・壊す ----------------
  // 茎：作物と同じランダムな刻み（と骨粉）で育ち、育ちきると横の土・草・耕地にカボチャ／スイカを実らせる
  var growCrop = Game.prototype.growCrop;
  Game.prototype.growCrop = function (x, y, z, n) {
    var wd = this.world, id = wd.block(x, y, z), m = /^(PUMPKIN|MELON)_STEM_(\d)$/.exec(WG.BLOCKS[id].key);
    if (!m) return growCrop.apply(this, arguments);
    var st = +m[2];
    if (st < 7) {
      if (!n && Math.random() >= 0.3) return false;
      wd.setBlock(x, y, z, B[m[1] + '_STEM_' + Math.min(7, st + (n || 1))]); this.walker.remesh(x, z);
      return true;
    }
    if (n || Math.random() >= 0.3) return false;
    var d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)], below = wd.block(x + d[0], y - 1, z + d[1]);
    if (wd.block(x + d[0], y, z + d[1]) !== B.AIR || [B.GRASS, B.DIRT, B.FARMLAND, B.FARMLAND_MOIST].indexOf(below) < 0) return false;
    wd.setBlock(x + d[0], y, z + d[1], B[m[1]]); this.walker.remesh(x + d[0], z + d[1]);
    return true;
  };
  // 竹が伸び、カカオが実る（作物と同じくらいの速さ：近くを毎刻少しずつ調べる）
  WG.growPlant = function (game, x, y, z) {
    var wd = game.world, id = wd.block(x, y, z), key = WG.BLOCKS[id] && WG.BLOCKS[id].key, m;
    if (id === B.BAMBOO && wd.block(x, y + 1, z) === B.AIR) {
      var hgt = 1; while (wd.block(x, y - hgt, z) === B.BAMBOO && hgt < 16) hgt++;
      if (hgt < 12) { wd.setBlock(x, y + 1, z, B.BAMBOO); game.walker.remesh(x, z); return true; }
    } else if (key && (m = /^COCOA_(\w)_0$/.exec(key))) { wd.setBlock(x, y, z, B['COCOA_' + m[1] + '_1']); game.walker.remesh(x, z); return true; }
    return false;
  };
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    tickExtra.call(this);
    var p = this.walker.pos;
    for (var n = 0; n < 60; n++) {
      var x = Math.floor(p[0] + (Math.random() - 0.5) * 96), y = Math.floor(p[1] + (Math.random() - 0.5) * 32), z = Math.floor(p[2] + (Math.random() - 0.5) * 96);
      if (Math.random() < 0.3) WG.growPlant(this, x, y, z);
    }
  };
  // カカオ豆をジャングルの原木の横に植える。竹は草・土・砂・竹の上にだけ。昆布は水の中へ
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var t = this.walker.target, held = this.inv.held(), wd = this.world, surv = this.mode === 'survival';
    if (t && held && held.key === 'COCOA_BEANS' && t.id === B.JUNGLE_LOG && t.py === t.y && wd.block(t.px, t.py, t.pz) === B.AIR) {
      var dx = t.x - t.px, dz = t.z - t.pz, d = dx > 0 ? 'E' : dx < 0 ? 'W' : dz > 0 ? 'S' : 'N';
      wd.setBlock(t.px, t.py, t.pz, B['COCOA_' + d + '_0']); this.walker.remesh(t.px, t.pz);
      if (surv) this.inv.take(this.inv.sel, 1);
      return;
    }
    if (t && held && held.key === 'BAMBOO') {
      var under = wd.block(t.px, t.py - 1, t.pz);
      if ([B.GRASS, B.DIRT, B.SAND, B.BAMBOO, B.GRAVEL].indexOf(under) < 0) return;
    }
    return place.apply(this, arguments);
  };
  // 竹を折ると上の分も折れる。水の中の植物を取ると水が残る
  var breakBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function (x, y, z, harvest) {
    var wd = this.world, id = wd.block(x, y, z);
    if (WG.isWaterPlant(id)) {
      wd.setBlock(x, y, z, B.WATER); this.walker.remesh(x, z);
      if (this.mode === 'survival') this.dropFor(id, x, y, z);
      if (id === B.KELP && wd.block(x, y + 1, z) === B.KELP) this.breakBlock(x, y + 1, z, harvest);
      return;
    }
    var r = breakBlock.call(this, x, y, z, harvest);
    if (wd.block(x, y, z) === id) return r;
    if (id === B.BAMBOO && wd.block(x, y + 1, z) === B.BAMBOO) this.breakBlock(x, y + 1, z, harvest);
    return r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
