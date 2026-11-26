// 川と海（ロードマップ 第 10 段階）
// 川：陸を曲がりくねって流れ、海へつながる（寒い所では凍った川）。山の高い所では消える
// 海：深い海（もっと深い）・暖かい海（サンゴ礁）・冷たい海（砂利の底と氷山）
// 氷山：凍った海と冷たい海に、氷の山（青氷のすじ、上に雪）
// 溶岩の湖：乾いた陸に、ときどき小さな溶岩の湖
// 化石：砂漠・沼・荒野の地下に、骨ブロックの化石（石炭の混じったものも）
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, BI = WG.BI, rnd = WG.rnd, hash = WG.hash, Overworld = WG.Overworld;
  var SEA = 63, MINY = -64;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ---------------- 新しいバイオーム ----------------
  [['RIVER', { key: 'river', name: '川', top: B.SAND, under: B.SAND, depth: 2, tint: [0.94, 1.02, 0.94] }],
   ['FROZEN_RIVER', { key: 'frozen_river', name: '凍った川', top: B.GRAVEL, under: B.GRAVEL, depth: 2, tint: [0.86, 0.95, 1] }],
   ['DEEP_OCEAN', { key: 'deep_ocean', name: '深い海', top: B.GRAVEL, under: B.GRAVEL, depth: 2, tint: [1, 1, 1] }],
   ['WARM_OCEAN', { key: 'warm_ocean', name: '暖かい海', top: B.SAND, under: B.SAND, depth: 3, tint: [1.04, 1.04, 0.9] }],
   ['COLD_OCEAN', { key: 'cold_ocean', name: '冷たい海', top: B.GRAVEL, under: B.GRAVEL, depth: 2, tint: [0.9, 0.97, 1] }]
  ].forEach(function (q) { BI[q[0]] = WG.BIOMES.length; WG.BIOMES.push(q[1]); });
  // 海のバイオームか（海底神殿・難破船・海底遺跡などの置き場所を決めるとき）
  WG.isOceanKey = function (k) { return /ocean$/.test(k || ''); };
  WG.isRiverKey = function (k) { return /river$/.test(k || ''); };

  // ---------------- 地表の高さとバイオーム ----------------
  var column = Overworld.prototype.column;
  Overworld.prototype.column = function (x, z) {
    var c = column.apply(this, arguments), h = c.h, b = c.b;
    if (!this.nRiv) { this.nRiv = new WG.Perlin(this.seed, 41); this.nRivW = new WG.Perlin(this.seed, 42); }
    var t = this.nTemp.fbm2(x / 520, z / 520, 3) * 1.9 - Math.max(0, h - 110) / 150;
    // 川：曲がりくねった細い谷を、海面より少し下まで掘る
    if (b !== BI.OCEAN && b !== BI.FROZEN_OCEAN && b !== BI.MUSHROOM_FIELDS && h >= SEA - 2) {
      var wx = x + this.nRivW.fbm2(x / 110, z / 110, 2) * 46, wz = z + this.nRivW.fbm2(z / 110 + 31.7, x / 110 - 12.3, 2) * 46;
      var r = Math.abs(this.nRiv.fbm2(wx / 560, wz / 560, 3)), mount = smooth(92, 122, h), W = 0.012;
      if (r < W * 4.5 && mount < 1) {
        var bed = r < W ? SEA - 2 - Math.round((1 - r / W) * 3) : SEA - 1;
        var k = Math.max(smooth(W * 0.9, W * 4.5, r), mount);
        var nh = Math.floor(lerp(bed, h, k));
        if (nh < h) h = nh;
        if (h < SEA) b = t < -0.38 ? BI.FROZEN_RIVER : BI.RIVER;
        else if (h <= SEA + 1 && b !== BI.DESERT && b !== BI.BADLANDS && b !== BI.SWAMP && b !== BI.MANGROVE_SWAMP && r < W * 1.8) b = BI.BEACH;
      }
    }
    // 海：深い所はさらに深く。暖かい海・冷たい海
    if ((b === BI.OCEAN || b === BI.FROZEN_OCEAN) && h < 47) h = Math.round(h - (47 - h) * 0.9);
    if (b === BI.OCEAN) b = h < 44 ? BI.DEEP_OCEAN : t > 0.32 ? BI.WARM_OCEAN : t < -0.15 ? BI.COLD_OCEAN : BI.OCEAN;
    return { h: h, b: b };
  };

  // ---------------- 生成のあと：凍った川の氷・氷山・溶岩の湖・化石 ----------------
  var generate = Overworld.prototype.generate;
  Overworld.prototype.generate = function (cx, cz, surfaceOnly) {
    var r = generate.apply(this, arguments), bl = r.blocks, bio = r.biome, hm = r.hmap, seed = this.seed, x0 = cx << 4, z0 = cz << 4, i, y;
    var idx = function (x, y, z) { return ((y - MINY) << 8) | (z << 4) | x; };
    var get = function (x, y, z) { return x < 0 || x > 15 || z < 0 || z > 15 || y < MINY || y > 319 ? -1 : bl[idx(x, y, z)]; };
    var set = function (x, y, z, id) { if (x >= 0 && x <= 15 && z >= 0 && z <= 15 && y > MINY && y < 319) bl[idx(x, y, z)] = id; };
    // 凍った川：水面が氷
    for (i = 0; i < 256; i++) if (bio[i] === BI.FROZEN_RIVER && hm[i] < SEA && bl[((SEA - MINY) << 8) | i] === B.WATER) bl[((SEA - MINY) << 8) | i] = B.ICE;
    var cb = bio[(8 << 4) | 8], ch = hm[(8 << 4) | 8];
    var ckey = WG.BIOMES[cb].key, pkey = (WG.BIOME_PARENT && WG.BIOME_PARENT[ckey]) || ckey;   // 変わり種のバイオームは、元のバイオームとして扱う
    // 氷山
    if ((cb === BI.FROZEN_OCEAN || cb === BI.COLD_OCEAN) && ch < SEA - 5 && hash(seed, cx, 1, cz, 1101) % 5 === 0) {
      var R = 4 + hash(seed, cx, 2, cz, 1101) % 3, top = 6 + hash(seed, cx, 3, cz, 1101) % 9, ox = 8, oz = 8;
      for (var dz = -R - 1; dz <= R + 1; dz++) for (var dx = -R - 1; dx <= R + 1; dx++) {
        var px = ox + dx, pz = oz + dz, d = Math.sqrt(dx * dx + dz * dz) + (rnd(seed, x0 + px, 0, z0 + pz, 1102) - 0.5) * 1.2;
        if (d > R + 0.6) continue;
        var f = d / (R + 0.6), up = Math.floor(top * (1 - f * f * (0.55 + 0.45 * f)) * (0.85 + 0.3 * rnd(seed, x0 + px, 1, z0 + pz, 1102))), down = Math.floor(R * 1.8 * (1 - d / (R + 1.2)));
        for (y = SEA - down; y <= SEA + up; y++) {
          if (y <= hm[(pz << 4) | px]) continue;
          var vein = (hash(seed, x0 + px, y, z0 + pz, 1103) % 9 === 0) || ((y + px * 2 + pz) % 7 === 0 && d < R * 0.6);
          set(px, y, pz, vein ? B.BLUE_ICE : B.PACKED_ICE);
        }
        if (up > 0) { set(px, SEA + up + 1, pz, B.SNOW_BLOCK || B.SNOW); hm[(pz << 4) | px] = Math.max(hm[(pz << 4) | px], SEA + up + 1); }
      }
    }
    // 溶岩の湖（乾いた陸、まれに）
    if (/^(desert|savanna|badlands|plains|rocky_mountain)$/.test(pkey) && ch > SEA + 3 && ch < 140 && hash(seed, cx, 4, cz, 1104) % 28 === 0) {
      var L = ch, rx = 3 + hash(seed, cx, 5, cz, 1104) % 2, rz = 3 + hash(seed, cx, 6, cz, 1104) % 2, ok = true, cells = [];
      for (dz = -rz; dz <= rz; dz++) for (dx = -rx; dx <= rx; dx++) {
        var e = (dx * dx) / (rx * rx) + (dz * dz) / (rz * rz);
        if (e > 1) continue;
        var q = ((8 + dz) << 4) | (8 + dx);
        if (hm[q] < L - 1 || hm[q] > L + 4) ok = false;
        cells.push([8 + dx, 8 + dz, e]);
      }
      // 縁（湖の外側 1 マス）も同じくらいの高さのときだけ
      for (dz = -rz - 1; dz <= rz + 1 && ok; dz++) for (dx = -rx - 1; dx <= rx + 1; dx++) { var q2 = ((8 + dz) << 4) | (8 + dx); if (hm[q2] < L) ok = false; }
      if (ok) cells.forEach(function (cl) {
        var px = cl[0], pz = cl[1], depth = cl[2] < 0.45 ? 3 : cl[2] < 0.8 ? 2 : 1, q = (pz << 4) | px;
        for (var yy = L - depth; yy <= L - 1; yy++) set(px, yy, pz, B.LAVA);
        set(px, L - depth - 1, pz, B.STONE);
        for (yy = L; yy <= hm[q] + 14; yy++) { var cur = get(px, yy, pz); if (cur !== B.AIR && cur !== -1) set(px, yy, pz, B.AIR); }
        hm[q] = L - 1;
      });
      // 縁の土を焼けた石に
      if (ok) for (dz = -rz - 1; dz <= rz + 1; dz++) for (dx = -rx - 1; dx <= rx + 1; dx++) {
        var px2 = 8 + dx, pz2 = 8 + dz, hq = hm[(pz2 << 4) | px2];
        if (get(px2, hq, pz2) !== B.LAVA && (dx * dx) / ((rx + 1) * (rx + 1)) + (dz * dz) / ((rz + 1) * (rz + 1)) <= 1.05 && hash(seed, x0 + px2, 7, z0 + pz2, 1105) % 3) { set(px2, hq, pz2, hash(seed, x0 + px2, 8, z0 + pz2, 1105) % 2 ? B.STONE : B.COBBLESTONE); if (WG.blockKind(get(px2, hq + 1, pz2)) === 'plant') set(px2, hq + 1, pz2, B.AIR); }
      }
    }
    // 化石（地下 y 15〜45）
    if (/^(desert|swamp|badlands|mangrove_swamp)$/.test(pkey) && hash(seed, cx, 9, cz, 1106) % 12 === 0) {
      var fy = 15 + hash(seed, cx, 10, cz, 1106) % 30, coal = hash(seed, cx, 11, cz, 1106) % 3 === 0, len = 7 + hash(seed, cx, 12, cz, 1106) % 4, alongX = hash(seed, cx, 13, cz, 1106) % 2;
      var bone = function (a, yy, s) { var px = alongX ? 3 + a : 8 + s, pz = alongX ? 8 + s : 3 + a, cur = get(px, yy, pz); if (cur > 0 && cur !== B.WATER && cur !== B.LAVA && cur !== B.BEDROCK) set(px, yy, pz, coal && hash(seed, x0 + px, yy, z0 + pz, 1107) % 3 === 0 ? B.COAL_ORE : B.BONE_BLOCK); };
      for (var a = 0; a < len; a++) {
        bone(a, fy + 4, 0);
        if (a % 2 === 1 && a < len - 1) [[1, 0], [2, -1], [3, -2], [3, -3], [2, -4]].forEach(function (o) { bone(a, fy + 4 + o[1], o[0]); bone(a, fy + 4 + o[1], -o[0]); });
      }
      bone(len, fy + 5, 0); bone(len + 1, fy + 5, 0); bone(len + 1, fy + 4, 1); bone(len + 1, fy + 4, -1);   // 頭
    }
    return r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
