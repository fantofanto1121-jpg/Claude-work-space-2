// オーバーワールド（高さ -64〜319、海面 63）
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, rnd = WG.rnd, hash = WG.hash;
  var MINY = -64, H = 384, MAXY = 319, SEA = 63;

  // 乱数・ノイズの用途番号
  var S = {
    CONT: 11, MNT: 12, DET: 13, RIDGE: 14, TEMP: 15, HUM: 16, PATCH: 17,
    CHEESE: 21, T1: 22, T2: 23,
    BEDROCK: 31, ORE: 32, TREE: 33, TREE2: 34, LEAF: 35, PLANT: 36, ROOM: 37, ROOM2: 38
  };

  var BI = {
    OCEAN: 0, FROZEN_OCEAN: 1, BEACH: 2, DESERT: 3, SNOWY_PLAINS: 4, SNOWY_MOUNTAIN: 5,
    ROCKY_MOUNTAIN: 6, JUNGLE: 7, SAVANNA: 8, TAIGA: 9, SWAMP: 10, FOREST: 11, PLAINS: 12,
    CHERRY_GROVE: 13, MANGROVE_SWAMP: 14, BADLANDS: 15, MUSHROOM_FIELDS: 16
  };
  // top: 表面 / under: その下の層 / depth: 下の層の厚さ / base: さらに下の層
  WG.BIOMES = [
    { key: 'ocean', name: '海', top: B.SAND, under: B.SAND, depth: 3, tint: [1, 1, 1] },
    { key: 'frozen_ocean', name: '凍った海', top: B.GRAVEL, under: B.GRAVEL, depth: 2, tint: [0.86, 0.95, 1] },
    { key: 'beach', name: '砂浜', top: B.SAND, under: B.SAND, depth: 3, base: B.SANDSTONE, baseDepth: 2, tint: [1, 1, 1] },
    { key: 'desert', name: '砂漠', top: B.SAND, under: B.SAND, depth: 3, base: B.SANDSTONE, baseDepth: 4, tint: [1.2, 1.0, 0.7] },
    { key: 'snowy_plains', name: '雪原', top: B.SNOW, under: B.DIRT, depth: 3, tint: [0.86, 0.95, 1] },
    { key: 'snowy_mountain', name: '雪山', top: B.SNOW, under: B.STONE, depth: 0, tint: [0.86, 0.95, 1] },
    { key: 'rocky_mountain', name: '岩山', top: B.STONE, under: B.STONE, depth: 0, tint: [0.92, 0.96, 0.94] },
    { key: 'jungle', name: 'ジャングル', top: B.GRASS, under: B.DIRT, depth: 3, tint: [0.8, 1.08, 0.74] },
    { key: 'savanna', name: 'サバンナ', top: B.GRASS, under: B.DIRT, depth: 3, tint: [1.24, 1.02, 0.66] },
    { key: 'taiga', name: 'タイガ', top: B.GRASS, under: B.DIRT, depth: 3, tint: [0.82, 0.93, 0.92] },
    { key: 'swamp', name: '沼地', top: B.GRASS, under: B.DIRT, depth: 3, tint: [0.8, 0.84, 0.64] },
    { key: 'forest', name: '森', top: B.GRASS, under: B.DIRT, depth: 3, tint: [0.9, 1.0, 0.86] },
    { key: 'plains', name: '平原', top: B.GRASS, under: B.DIRT, depth: 3, tint: [1.03, 1.02, 0.9] },
    // ロードマップ 第 3 段階
    { key: 'cherry_grove', name: '桜の林', top: B.GRASS, under: B.DIRT, depth: 3, tint: [1.0, 1.06, 0.84] },
    { key: 'mangrove_swamp', name: 'マングローブの沼', top: B.MUD, under: B.MUD, depth: 4, tint: [0.78, 0.9, 0.6] },
    { key: 'badlands', name: '荒野', top: B.RED_SAND, under: B.RED_SAND, depth: 1, tint: [1.2, 0.95, 0.6] },
    { key: 'mushroom_fields', name: 'キノコ島', top: B.MYCELIUM, under: B.DIRT, depth: 3, tint: [0.9, 1.0, 0.86] }
  ];
  WG.BI = BI;

  // 木：4×4 の区画ごとに 1 本の候補。区画ごとの確率と木の種類。
  var TREE_P = [], TREE_T = [];
  TREE_P[BI.FOREST] = 0.62; TREE_P[BI.TAIGA] = 0.5; TREE_P[BI.SNOWY_PLAINS] = 0.05;
  TREE_P[BI.JUNGLE] = 0.8; TREE_P[BI.SWAMP] = 0.2; TREE_P[BI.SAVANNA] = 0.08; TREE_P[BI.PLAINS] = 0.025;
  var T_OAK = 0, T_BIRCH = 1, T_SPRUCE = 2, T_JUNGLE = 3, T_ACACIA = 4, T_SWAMP = 5;
  TREE_T[BI.FOREST] = T_OAK; TREE_T[BI.TAIGA] = T_SPRUCE; TREE_T[BI.SNOWY_PLAINS] = T_SPRUCE;
  TREE_T[BI.JUNGLE] = T_JUNGLE; TREE_T[BI.SWAMP] = T_SWAMP; TREE_T[BI.SAVANNA] = T_ACACIA; TREE_T[BI.PLAINS] = T_OAK;
  var T_CHERRY = 6, T_MANGROVE = 7, T_HMUSH = 8;
  TREE_P[BI.CHERRY_GROVE] = 0.22; TREE_P[BI.MANGROVE_SWAMP] = 0.42; TREE_P[BI.MUSHROOM_FIELDS] = 0.05;
  TREE_T[BI.CHERRY_GROVE] = T_CHERRY; TREE_T[BI.MANGROVE_SWAMP] = T_MANGROVE; TREE_T[BI.MUSHROOM_FIELDS] = T_HMUSH;
  var TREE_R = 5; // 根から葉の端までの最大距離
  var BANDS = [B.TERRACOTTA, B.ORANGE_TERRACOTTA, B.TERRACOTTA, B.YELLOW_TERRACOTTA, B.BROWN_TERRACOTTA, B.TERRACOTTA, B.RED_TERRACOTTA, B.WHITE_TERRACOTTA,
    B.TERRACOTTA, B.LIGHT_GRAY_TERRACOTTA, B.ORANGE_TERRACOTTA, B.TERRACOTTA, B.RED_TERRACOTTA, B.YELLOW_TERRACOTTA, B.TERRACOTTA, B.BROWN_TERRACOTTA];

  // 草と花の確率
  var GRASS_P = [0, 0, 0, 0, 0, 0, 0, 0.35, 0.32, 0.1, 0.18, 0.15, 0.3];
  var FLOWER_P = [0, 0, 0, 0, 0, 0, 0, 0.004, 0.004, 0.004, 0, 0.025, 0.03];

  // 鉱脈 [石版, 深層岩版, 最低 y, 最高 y, 1 チャンクの数, 大きさ, 分布]（Minecraft 1.18 以降の数と大きさ）
  var ORES = [
    [B.COAL_ORE, B.DEEPSLATE_COAL_ORE, 136, 320, 30, 17, 'u'],
    [B.COAL_ORE, B.DEEPSLATE_COAL_ORE, 0, 192, 20, 17, 't'],
    [B.IRON_ORE, B.DEEPSLATE_IRON_ORE, 80, 384, 90, 9, 't'],
    [B.IRON_ORE, B.DEEPSLATE_IRON_ORE, -24, 56, 10, 9, 't'],
    [B.IRON_ORE, B.DEEPSLATE_IRON_ORE, -64, 72, 10, 4, 'u'],
    [B.COPPER_ORE, B.DEEPSLATE_COPPER_ORE, -16, 112, 16, 10, 't'],
    [B.GOLD_ORE, B.DEEPSLATE_GOLD_ORE, -64, 32, 4, 9, 't'],
    [B.REDSTONE_ORE, B.DEEPSLATE_REDSTONE_ORE, -64, 15, 4, 8, 'u'],
    [B.REDSTONE_ORE, B.DEEPSLATE_REDSTONE_ORE, -96, -32, 8, 8, 't'],
    [B.LAPIS_ORE, B.DEEPSLATE_LAPIS_ORE, -32, 32, 2, 7, 't'],
    [B.LAPIS_ORE, B.DEEPSLATE_LAPIS_ORE, -64, 64, 4, 7, 'u'],
    [B.DIAMOND_ORE, B.DEEPSLATE_DIAMOND_ORE, -144, 16, 4, 4, 't'],
    [B.DIAMOND_ORE, B.DEEPSLATE_DIAMOND_ORE, -64, -4, 1, 8, 'u']
  ];
  var ORE_SALT = 200;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function Overworld(seed) {
    this.seed = seed;
    this.nCont = new WG.Perlin(seed, S.CONT);
    this.nMnt = new WG.Perlin(seed, S.MNT);
    this.nDet = new WG.Perlin(seed, S.DET);
    this.nRidge = new WG.Perlin(seed, S.RIDGE);
    this.nTemp = new WG.Perlin(seed, S.TEMP);
    this.nHum = new WG.Perlin(seed, S.HUM);
    this.nPatch = new WG.Perlin(seed, S.PATCH);
    this.nCheese = new WG.Perlin(seed, S.CHEESE);
    this.nT1 = new WG.Perlin(seed, S.T1);
    this.nT2 = new WG.Perlin(seed, S.T2);
    this.roomCache = new Map();
    this.structures = new WG.Structures(this);
  }
  Overworld.prototype.minY = MINY;
  Overworld.prototype.height = H;
  Overworld.prototype.supportsSurfaceOnly = true;

  // 1 列の地表の高さとバイオーム。座標だけで決まる。
  Overworld.prototype.column = function (x, z) {
    var c = this.nCont.fbm2(x / 720, z / 720, 4) * 1.8;
    var e = this.nMnt.fbm2(x / 380, z / 380, 4) * 1.8;
    var d = this.nDet.fbm2(x / 64, z / 64, 3);
    var t = this.nTemp.fbm2(x / 520, z / 520, 3) * 1.9;
    var w = this.nHum.fbm2(x / 470, z / 470, 3) * 1.9;

    var land = smooth(-0.06, 0.1, c);
    var ocean = clamp(55 + c * 28 + d * 5, 40, 60);
    var plain = 65 + Math.max(0, c) * 18 + d * 9;
    var ms = smooth(0.06, 0.5, e) * smooth(0.02, 0.28, c);
    if (ms > 0) {
      var r = 1 - Math.abs(this.nRidge.fbm2(x / 170, z / 170, 3) * 1.9);
      if (r < 0) r = 0;
      plain += ms * (34 + 110 * r * r) + ms * d * 12;
    }
    // 沼地：湿って暖かい低地を海面近くまで平らにする
    var sw = smooth(0.22, 0.42, w) * smooth(-0.3, -0.12, t) * (1 - smooth(0.22, 0.38, t)) * (1 - smooth(0, 0.18, ms));
    if (sw > 0) plain = lerp(plain, SEA - 0.4 + d * 4, sw * 0.9);
    var h = Math.floor(lerp(ocean, plain, land));
    // キノコ島：深い海の中に、まれに丸い島（640 ブロックの区画に 1 つの候補）
    var mush = 0;
    if (c < -0.05) {
      var gx = Math.floor(x / 640), gz = Math.floor(z / 640);
      if (rnd(this.seed, gx, 3, gz, 991) < 0.35) {
        var mx = gx * 640 + 140 + hash(this.seed, gx, 4, gz, 991) % 360, mz = gz * 640 + 140 + hash(this.seed, gx, 5, gz, 991) % 360;
        mush = 1 - smooth(16, 44, Math.hypot(x - mx, z - mz) + d * 6);
        if (mush > 0) h = Math.floor(lerp(h, SEA + 2 + mush * 5 + d * 2, Math.min(1, mush * 1.6)));
      }
    }
    t -= Math.max(0, h - 110) / 150;

    var b;
    if (mush > 0.25 && h >= SEA) b = BI.MUSHROOM_FIELDS;
    else if (h < SEA && !(sw > 0.5 && land > 0.9)) b = t < -0.38 ? BI.FROZEN_OCEAN : BI.OCEAN;
    else if (h > 128 || ms > 0.55) b = (t < -0.15 || h > 168) ? BI.SNOWY_MOUNTAIN : BI.ROCKY_MOUNTAIN;
    else if (sw > 0.45) b = t > 0.05 ? BI.MANGROVE_SWAMP : BI.SWAMP;
    else if (h <= SEA + 2 && ms < 0.2) b = BI.BEACH;
    else if (ms > 0.1 && t > -0.14 && t < 0.24 && h > SEA + 8) b = BI.CHERRY_GROVE;   // 山のすそ野の桜
    else if (t < -0.38) b = BI.SNOWY_PLAINS;
    else if (t < -0.14) b = BI.TAIGA;
    else if (t > 0.3) b = w < -0.05 ? (w < -0.3 && t > 0.45 ? BI.BADLANDS : BI.DESERT) : (w > 0.24 ? BI.JUNGLE : BI.SAVANNA);
    else b = w > 0.02 ? BI.FOREST : BI.PLAINS;
    // 荒野：段々の台地（5 ブロックずつの段）
    if (b === BI.BADLANDS) { var bump = smooth(0.3, 0.55, -w) * smooth(0.45, 0.62, t); h += Math.floor(bump * (10 + 18 * (this.nDet.fbm2(x / 46, z / 46, 2) * 0.5 + 0.5)) / 5) * 5; }
    return { h: h, b: b };
  };

  Overworld.prototype.generate = function (cx, cz, surfaceOnly) {
    var seed = this.seed, x0 = cx << 4, z0 = cz << 4;
    var blocks = new Uint16Array(H << 8), biome = new Uint8Array(256), hmap = new Int16Array(256);
    var i, y, maxH = SEA;
    for (i = 0; i < 256; i++) {
      var col = this.column(x0 + (i & 15), z0 + (i >> 4));
      hmap[i] = col.h; biome[i] = col.b;
      if (col.h > maxH) maxH = col.h;
    }

    // 石・深層岩・岩盤・表層・水
    for (i = 0; i < 256; i++) {
      var wx = x0 + (i & 15), wz = z0 + (i >> 4), h = hmap[i], bi = WG.BIOMES[biome[i]], idx = i;
      for (y = MINY; y <= h; y++, idx += 256) blocks[idx] = y < 0 ? B.DEEPSLATE : B.STONE;
      blocks[i] = B.BEDROCK;
      for (y = -63; y <= -61; y++) {
        if (rnd(seed, wx, y, wz, S.BEDROCK) < (-60 - y) / 4) blocks[((y - MINY) << 8) | i] = B.BEDROCK;
      }

      var top = bi.top, under = bi.under, depth = bi.depth, base = bi.base || 0, baseDepth = bi.baseDepth || 0;
      var patch = this.nPatch.fbm2(wx / 18, wz / 18, 2) * 1.9;
      if (h < SEA) {
        // 水の底
        if (biome[i] === BI.SWAMP) { top = patch > 0 ? B.CLAY : B.DIRT; under = B.DIRT; }
        else if (biome[i] === BI.MANGROVE_SWAMP) { top = B.MUD; under = B.MUD; depth = 4; }
        else if (biome[i] === BI.FROZEN_OCEAN) { top = B.GRAVEL; under = B.GRAVEL; }
        else if (h < 50 || patch > 0.32) { top = B.GRAVEL; under = B.GRAVEL; depth = 2; }
        else if (patch < -0.42 && h > 52) { top = B.CLAY; under = B.SAND; }
        else { top = B.SAND; under = B.SAND; }
      } else if (biome[i] === BI.ROCKY_MOUNTAIN) {
        if (patch > 0.34) { top = B.GRAVEL; under = B.GRAVEL; depth = 1; }
        else if (patch < -0.3 && h < 118) { top = B.GRASS; under = B.DIRT; depth = 2; }
      } else if (biome[i] === BI.SNOWY_MOUNTAIN && patch > 0.3 && h < 150) {
        top = B.STONE;
      }
      blocks[((h - MINY) << 8) | i] = top;
      for (var k = 1; k <= depth; k++) blocks[((h - k - MINY) << 8) | i] = under;
      for (k = 1; k <= baseDepth; k++) blocks[((h - depth - k - MINY) << 8) | i] = base;
      for (y = h + 1; y <= SEA; y++) blocks[((y - MINY) << 8) | i] = B.WATER;
      if (biome[i] === BI.FROZEN_OCEAN && h < SEA) blocks[((SEA - MINY) << 8) | i] = B.ICE;
      // 荒野の地層：色の付いたテラコッタの帯（場所で少し上下する）
      if (biome[i] === BI.BADLANDS) {
        var off = Math.floor(patch * 3);
        for (y = h - 1; y >= Math.max(SEA - 6, h - 46); y--) blocks[((y - MINY) << 8) | i] = BANDS[((y + off) % BANDS.length + BANDS.length) % BANDS.length];
        if (patch > 0.45) blocks[((h - MINY) << 8) | i] = BANDS[((h + off) % BANDS.length + BANDS.length) % BANDS.length];   // ところどころ地層がむき出し
      }
    }

    if (!surfaceOnly) this.carve(blocks, hmap, x0, z0, maxH);
    this.ores(blocks, hmap, cx, cz, surfaceOnly);
    // 部屋は必ず地表より 6 ブロック以上下にあるので、地表だけの生成では省略できる
    if (!surfaceOnly) this.rooms(blocks, cx, cz);
    // 構造物（村・砂漠のピラミッド・廃坑）。村とピラミッドの上には木を生やさない
    var near = this.structures.near(x0, z0, !surfaceOnly);
    this.trees(blocks, hmap, biome, x0, z0, near);
    this.plants(blocks, hmap, biome, x0, z0);
    if (near.length) this.structures.draw(near, blocks, hmap, x0, z0, MINY, MAXY);
    return { blocks: blocks, biome: biome, hmap: hmap };
  };

  // 洞窟。ノイズは 4×8×4 ブロックおきに計算して補間する（格子は世界座標に揃えるので境界で一致する）。
  Overworld.prototype.carve = function (blocks, hmap, x0, z0, maxH) {
    var gyN = ((maxH - MINY) >> 3) + 2, n = 25 * gyN;
    var C = new Float32Array(n), T1 = new Float32Array(n), T2 = new Float32Array(n);
    var gx, gy, gz, k;
    for (gy = 0; gy < gyN; gy++) {
      var wy = MINY + gy * 8;
      for (gz = 0; gz < 5; gz++) for (gx = 0; gx < 5; gx++) {
        var wx = x0 + gx * 4, wz = z0 + gz * 4;
        k = (gy * 5 + gz) * 5 + gx;
        C[k] = this.nCheese.fbm(wx / 84, wy / 44, wz / 84, 3);
        if (wy < 64) {
          T1[k] = this.nT1.fbm(wx / 72, wy / 38, wz / 72, 2);
          T2[k] = this.nT2.fbm(wx / 72, wy / 38, wz / 72, 2);
        }
      }
    }
    var cc = new Float32Array(gyN), t1 = new Float32Array(gyN), t2 = new Float32Array(gyN);
    for (var i = 0; i < 256; i++) {
      var x = i & 15, z = i >> 4, ax = x >> 2, az = z >> 2, fx = (x & 3) / 4, fz = (z & 3) / 4;
      var ymax = hmap[i] - 4;
      var gTop = ((ymax - MINY) >> 3) + 1;
      for (gy = 0; gy <= gTop && gy < gyN; gy++) {
        var k00 = (gy * 5 + az) * 5 + ax, k10 = k00 + 1, k01 = k00 + 5, k11 = k00 + 6;
        var w00 = (1 - fx) * (1 - fz), w10 = fx * (1 - fz), w01 = (1 - fx) * fz, w11 = fx * fz;
        cc[gy] = C[k00] * w00 + C[k10] * w10 + C[k01] * w01 + C[k11] * w11;
        t1[gy] = T1[k00] * w00 + T1[k10] * w10 + T1[k01] * w01 + T1[k11] * w11;
        t2[gy] = T2[k00] * w00 + T2[k10] * w10 + T2[k01] * w01 + T2[k11] * w11;
      }
      for (var y = MINY + 1; y <= ymax; y++) {
        var yy = y - MINY, g = yy >> 3, f = (yy & 7) / 8;
        var c = cc[g] + (cc[g + 1] - cc[g]) * f;
        var cave = c > (y < 0 ? 0.22 : 0.25);
        if (!cave && y < 50) {
          var a = t1[g] + (t1[g + 1] - t1[g]) * f, b = t2[g] + (t2[g + 1] - t2[g]) * f;
          cave = a * a + b * b < 0.0032;
        }
        if (cave) {
          var idx = (yy << 8) | i, id = blocks[idx];
          if (id !== B.BEDROCK && id !== B.WATER) blocks[idx] = y <= -55 ? B.LAVA : B.AIR;
        }
      }
    }
  };

  // 鉱石。鉱脈（塊）で置く。石と深層岩だけを置き換える。地表だけの生成では地表から 2 段まで。
  Overworld.prototype.ores = function (blocks, hmap, cx, cz, surfaceOnly) {
    WG.oreVeins(this.seed, ORE_SALT, ORES, blocks, cx, cz, MINY, MAXY, function (id, L, idx) {
      if (surfaceOnly && (idx >> 8) + MINY < hmap[idx & 255] - 2) return 0;
      return id === B.STONE ? L[0] : id === B.DEEPSLATE ? L[1] : 0;
    });
  };

  // 地下の部屋。チャンクごとに約 1/8 の確率。隣のチャンクの部屋も見て、自分の範囲だけ描く。
  Overworld.prototype.roomAt = function (cx, cz) {
    var key = cx + ',' + cz;
    if (this.roomCache.has(key)) return this.roomCache.get(key);
    var seed = this.seed, room = null;
    if (rnd(seed, cx, 0, cz, S.ROOM) < 0.125) {
      var hb = hash(seed, cx, 1, cz, S.ROOM2);
      var hx = 3 + (hb & 1), hz = 3 + ((hb >> 1) & 1);
      var mx = (cx << 4) + ((hb >> 2) & 15), mz = (cz << 4) + ((hb >> 6) & 15);
      var yf = -40 + (hash(seed, cx, 2, cz, S.ROOM2) % 85);
      var ok = true;
      for (var x = mx - hx; x <= mx + hx && ok; x++) {
        for (var z = mz - hz; z <= mz + hz; z++) {
          if (this.column(x, z).h - 6 < yf + 5) { ok = false; break; }
        }
      }
      if (ok) room = { mx: mx, mz: mz, hx: hx, hz: hz, yf: yf, n: 1 + ((hb >> 10) & 1) };
    }
    if (this.roomCache.size > 20000) this.roomCache.clear();
    this.roomCache.set(key, room);
    return room;
  };

  Overworld.prototype.rooms = function (blocks, cx, cz) {
    var seed = this.seed, x0 = cx << 4, z0 = cz << 4;
    for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) {
      var r = this.roomAt(cx + dx, cz + dz);
      if (!r) continue;
      var xa = Math.max(r.mx - r.hx, x0), xb = Math.min(r.mx + r.hx, x0 + 15);
      var za = Math.max(r.mz - r.hz, z0), zb = Math.min(r.mz + r.hz, z0 + 15);
      for (var y = r.yf; y <= r.yf + 5; y++) {
        for (var z = za; z <= zb; z++) for (var x = xa; x <= xb; x++) {
          var wall = x === r.mx - r.hx || x === r.mx + r.hx || z === r.mz - r.hz || z === r.mz + r.hz || y === r.yf || y === r.yf + 5;
          var id = B.AIR;
          if (wall) id = rnd(seed, x, y, z, S.ROOM2) < (y === r.yf ? 0.5 : 0.25) ? B.MOSSY_COBBLESTONE : B.COBBLESTONE;
          var idx = ((y - MINY) << 8) | ((z - z0) << 4) | (x - x0);
          if (blocks[idx] !== B.BEDROCK) blocks[idx] = id;
        }
      }
      var put = function (x, y, z, id) {
        if (x < x0 || x > x0 + 15 || z < z0 || z > z0 + 15) return;
        blocks[((y - MINY) << 8) | ((z - z0) << 4) | (x - x0)] = id;
      };
      put(r.mx, r.yf + 1, r.mz, B.SPAWNER);
      put(r.mx - r.hx + 1, r.yf + 1, r.mz, B.CHEST);
      if (r.n > 1) put(r.mx, r.yf + 1, r.mz + r.hz - 1, B.CHEST);
    }
  };

  // 木。周囲の根を決まった順に集め、幹をすべて置いてから葉を置く。どちらも空気の場所だけ。
  Overworld.prototype.trees = function (blocks, hmap, biome, x0, z0, near) {
    var seed = this.seed, list = [];
    var g0x = Math.floor((x0 - TREE_R - 2) / 4), g1x = Math.floor((x0 + 15 + TREE_R) / 4);
    var g0z = Math.floor((z0 - TREE_R - 2) / 4), g1z = Math.floor((z0 + 15 + TREE_R) / 4);
    for (var gz = g0z; gz <= g1z; gz++) for (var gx = g0x; gx <= g1x; gx++) {
      var r = rnd(seed, gx, 0, gz, S.TREE);
      if (r >= 0.8) continue;
      var hh = hash(seed, gx, 1, gz, S.TREE2);
      var rx = gx * 4 + (hh % 3), rz = gz * 4 + ((hh >>> 8) % 3);
      if (rx < x0 - TREE_R || rx > x0 + 15 + TREE_R || rz < z0 - TREE_R || rz > z0 + 15 + TREE_R) continue;
      if (near && near.length && this.structures.treeFree(near, rx, rz)) continue;
      var h, b;
      if (rx >= x0 && rx < x0 + 16 && rz >= z0 && rz < z0 + 16) {
        var li = ((rz - z0) << 4) | (rx - x0); h = hmap[li]; b = biome[li];
      } else {
        var col = this.column(rx, rz); h = col.h; b = col.b;
      }
      if ((h < SEA && !(b === BI.MANGROVE_SWAMP && h >= SEA - 3)) || h > MAXY - 12 || !(r < (TREE_P[b] || 0))) continue;
      var t = TREE_T[b];
      if (b === BI.FOREST && ((hh >>> 16) & 255) < 64) t = T_BIRCH;
      list.push({ t: t, x: rx, y: h + 1, z: rz, k: hash(seed, rx, h, rz, S.TREE2), sea: SEA });
    }
    if (!list.length) return;
    var put = function (x, y, z, id) {
      var lx = x - x0, lz = z - z0;
      if (lx < 0 || lx > 15 || lz < 0 || lz > 15 || y < MINY || y > MAXY) return;
      var idx = ((y - MINY) << 8) | (lz << 4) | lx;
      if (blocks[idx] === B.AIR || (id === B.MANGROVE_ROOTS || id === B.MANGROVE_LOG) && blocks[idx] === B.WATER) blocks[idx] = id;   // マングローブの根と幹は水の中にも
    };
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < list.length; i++) drawTree(list[i], pass, put, seed);
    }
  };

  var LOGS = [B.OAK_LOG, B.BIRCH_LOG, B.SPRUCE_LOG, B.JUNGLE_LOG, B.ACACIA_LOG, B.OAK_LOG, B.CHERRY_LOG, B.MANGROVE_LOG, B.MUSHROOM_STEM];
  var LEAVES = [B.OAK_LEAVES, B.BIRCH_LEAVES, B.SPRUCE_LEAVES, B.JUNGLE_LEAVES, B.ACACIA_LEAVES, B.OAK_LEAVES, B.CHERRY_LEAVES, B.MANGROVE_LEAVES, B.RED_MUSHROOM_BLOCK];

  function drawTree(t, pass, put, seed) {
    var k = t.k, x = t.x, y = t.y, z = t.z, log = LOGS[t.t], leaf = LEAVES[t.t];
    var Hh, j, dx, dz, ly, r, top;
    if (t.t === T_OAK || t.t === T_BIRCH || t.t === T_SWAMP) {
      Hh = 4 + (k % 3);
      if (pass === 0) { for (j = 0; j < Hh; j++) put(x, y + j, z, log); return; }
      top = y + Hh;
      for (ly = top - 3; ly <= top; ly++) {
        r = ly >= top - 1 ? 1 : (t.t === T_SWAMP ? 3 : 2);
        for (dz = -r; dz <= r; dz++) for (dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r && (ly === top || rnd(seed, x + dx, ly, z + dz, S.LEAF) < 0.5)) continue;
          put(x + dx, ly, z + dz, leaf);
        }
      }
    } else if (t.t === T_SPRUCE) {
      Hh = 5 + (k % 2);
      if (pass === 0) { for (j = 0; j < Hh; j++) put(x, y + j, z, log); return; }
      top = y + Hh;
      put(x, top, z, leaf);
      for (ly = top - 1; ly >= y + 2; ly--) {
        r = ((top - 1 - ly) % 2 === 0) ? 1 : 2;
        for (dz = -r; dz <= r; dz++) for (dx = -r; dx <= r; dx++) {
          var s = Math.abs(dx) + Math.abs(dz);
          if (r === 1 ? s > 1 : s > 3) continue;
          put(x + dx, ly, z + dz, leaf);
        }
      }
    } else if (t.t === T_JUNGLE) {
      Hh = 5 + (k % 2);
      if (pass === 0) { for (j = 0; j < Hh; j++) put(x, y + j, z, log); return; }
      var cy = y + Hh - 1;
      for (var dy = -1; dy <= 1; dy++) for (dz = -3; dz <= 3; dz++) for (dx = -3; dx <= 3; dx++) {
        var d = dx * dx + dz * dz + dy * dy * 2.6;
        if (d <= 7.2 + rnd(seed, x + dx, cy + dy, z + dz, S.LEAF) * 2.6) put(x + dx, cy + dy, z + dz, leaf);
      }
    } else if (t.t === T_ACACIA) {
      Hh = 4 + (k % 2);
      var dir = (k >>> 4) & 3, ox = [1, -1, 0, 0][dir], oz = [0, 0, 1, -1][dir];
      if (pass === 0) {
        for (j = 0; j < Hh; j++) put(j < Hh - 2 ? x : x + ox, y + j, j < Hh - 2 ? z : z + oz, log);
        return;
      }
      var tx = x + ox, tz = z + oz;
      top = y + Hh;
      for (dz = -3; dz <= 3; dz++) for (dx = -3; dx <= 3; dx++) {
        var m = Math.abs(dx) + Math.abs(dz);
        if (m > 4 || (m === 4 && rnd(seed, tx + dx, top, tz + dz, S.LEAF) < 0.5)) continue;
        put(tx + dx, top, tz + dz, leaf);
      }
      for (dz = -1; dz <= 1; dz++) for (dx = -1; dx <= 1; dx++) put(tx + dx, top + 1, tz + dz, leaf);
    } else if (t.t === T_CHERRY) {
      // 桜：途中で少し曲がる幹と、横に広い丸い花の冠。冠の下に花が垂れる
      Hh = 5 + (k % 3);
      var cd = (k >>> 5) & 3, cx2 = [1, -1, 0, 0][cd], cz2 = [0, 0, 1, -1][cd], bend = Hh - 3;
      if (pass === 0) { for (j = 0; j < Hh; j++) put(j < bend ? x : x + cx2, y + j, j < bend ? z : z + cz2, log); return; }
      var hx = x + cx2, hz = z + cz2, hy = y + Hh;
      for (dy = -2; dy <= 1; dy++) for (dz = -4; dz <= 4; dz++) for (dx = -4; dx <= 4; dx++) {
        var e2 = (dx * dx + dz * dz) / (dy === 1 ? 6 : dy === -2 ? 9 : 17) + (dy < 0 ? 0.1 : 0);
        if (e2 > 1 || rnd(seed, hx + dx, hy + dy, hz + dz, S.LEAF) < e2 * 0.35) continue;
        put(hx + dx, hy + dy, hz + dz, leaf);
        if (dy === -2 && rnd(seed, hx + dx, hy - 3, hz + dz, S.LEAF) < 0.12) put(hx + dx, hy - 3, hz + dz, leaf);   // 垂れた花
      }
    } else if (t.t === T_MANGROVE) {
      // マングローブ：水の上の高い幹を、四方の根が支える。葉は丸く大きめ
      Hh = 6 + (k % 3);
      var base = y + 2;
      if (pass === 0) {
        for (j = 0; j < Hh; j++) put(x, base + j, z, log);
        [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].forEach(function (q, qi) {
          if (qi > 3 && ((k >>> qi) & 1)) return;
          var rxx = x + q[0] * (qi > 3 ? 1 : 2), rzz = z + q[1] * (qi > 3 ? 1 : 2);
          put(x + q[0], base, z + q[1], B.MANGROVE_ROOTS);
          for (var ry = base; ry >= y - 3; ry--) put(rxx, ry, rzz, B.MANGROVE_ROOTS);
        });
        for (var ry2 = base - 1; ry2 >= y - 3; ry2--) put(x, ry2, z, B.MANGROVE_ROOTS);
        return;
      }
      top = base + Hh;
      for (dy = -2; dy <= 1; dy++) for (dz = -3; dz <= 3; dz++) for (dx = -3; dx <= 3; dx++) {
        var e3 = dx * dx + dz * dz + dy * dy * 1.8;
        if (e3 <= 8 + rnd(seed, x + dx, top + dy, z + dz, S.LEAF) * 3) put(x + dx, top + dy, z + dz, leaf);
      }
    } else if (t.t === T_HMUSH) {
      // 大きなキノコ：赤（丸い傘）と茶（平らな傘）
      Hh = 5 + (k % 3);
      var red = ((k >>> 3) & 1) === 0, cap = red ? B.RED_MUSHROOM_BLOCK : B.BROWN_MUSHROOM_BLOCK;
      if (pass === 0) { for (j = 0; j < Hh; j++) put(x, y + j, z, log); return; }
      top = y + Hh;
      if (red) {
        for (dz = -2; dz <= 2; dz++) for (dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dz) < 4) put(x + dx, top, z + dz, cap);
        for (ly = top - 3; ly < top; ly++) for (dz = -2; dz <= 2; dz++) for (dx = -2; dx <= 2; dx++) if ((Math.abs(dx) === 2 || Math.abs(dz) === 2) && Math.abs(dx) + Math.abs(dz) < 4) put(x + dx, ly, z + dz, cap);
      } else {
        for (dz = -3; dz <= 3; dz++) for (dx = -3; dx <= 3; dx++) if (Math.abs(dx) + Math.abs(dz) < 6) put(x + dx, top, z + dz, cap);
      }
    }
  }

  // 苗木から育つ木にも、同じ形を使う（js/trees.js）
  WG.drawTree = drawTree;
  WG.TREE_KIND = { OAK: T_OAK, BIRCH: T_BIRCH, SPRUCE: T_SPRUCE, JUNGLE: T_JUNGLE, ACACIA: T_ACACIA, CHERRY: T_CHERRY, MANGROVE: T_MANGROVE };

  // 草花とサボテン（自分の列だけ）
  Overworld.prototype.plants = function (blocks, hmap, biome, x0, z0) {
    var seed = this.seed;
    for (var i = 0; i < 256; i++) {
      var h = hmap[i];
      if (h < SEA || h > MAXY - 4) continue;
      var it = ((h - MINY) << 8) | i, ia = it + 256;
      if (blocks[ia] !== B.AIR) continue;
      var wx = x0 + (i & 15), wz = z0 + (i >> 4), b = biome[i], top = blocks[it];
      var r = rnd(seed, wx, h, wz, S.PLANT);
      if (top === B.GRASS) {
        var fp = FLOWER_P[b], gp = GRASS_P[b];
        if (r < fp) blocks[ia] = (hash(seed, wx, 1, wz, S.PLANT) & 1) ? B.DANDELION : B.POPPY;
        else if (r < fp + gp) blocks[ia] = B.SHORT_GRASS;
        // キノコ（沼地・タイガ・森の草の上に、まれに）
        if (blocks[ia] === B.AIR) {
          var mr = rnd(seed, wx, h + 1, wz, S.PLANT), mp = b === BI.SWAMP ? 0.012 : (b === BI.TAIGA || b === BI.FOREST) ? 0.004 : 0;
          if (mr < mp) blocks[ia] = mr < mp * 0.6 ? B.BROWN_MUSHROOM : B.RED_MUSHROOM;
        }
      }
      // サトウキビ：水に接した草・砂・土の上に 1〜3 段（海面の高さ）
      if (h === SEA && blocks[ia] === B.AIR && (top === B.GRASS || top === B.SAND || top === B.DIRT)) {
        var lx = i & 15, lz = i >> 4, wet = false;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var nx = lx + d[0], nz = lz + d[1];
          if (nx >= 0 && nx < 16 && nz >= 0 && nz < 16) { if (blocks[((h - MINY) << 8) | (nz << 4) | nx] === B.WATER) wet = true; }
        });
        if (wet && rnd(seed, wx, h + 2, wz, S.PLANT) < 0.12) {
          var cn = 1 + (hash(seed, wx, 3, wz, S.PLANT) % 3);
          for (var cj = 0; cj < cn; cj++) blocks[ia + cj * 256] = B.SUGAR_CANE;
        }
      }
      if (top === B.SAND && b === BI.DESERT && r < 0.006) {
        var n = 1 + (hash(seed, wx, 2, wz, S.PLANT) % 3);
        for (var j = 0; j < n; j++) if (blocks[ia + j * 256] === B.AIR) blocks[ia + j * 256] = B.CACTUS;
      }
    }
  };

  WG.Overworld = Overworld;
})(typeof window !== 'undefined' ? window : globalThis);
