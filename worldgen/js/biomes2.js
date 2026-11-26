// 地上のバイオーム その 1（ロードマップ 第 11 段階）
// 濃いオークの森・シラカバの森・花の森・巨大なタイガ・ヒマワリ平原・樹氷・竹林・まばらなジャングル
// あわせて、ポドゾル・粗い土・根の張った土・土の道・背の高い草と大きなシダ・ヒマワリ・ライラック・バラの低木・ボタン・竹ブロックと竹の板材
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, BI = WG.BI, rnd = WG.rnd, hash = WG.hash, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Overworld = WG.Overworld;
  var SEA = 63, MINY = -64;
  function keyOf(id) { return WG.BLOCKS[id] ? WG.BLOCKS[id].key : ''; }
  function blockItem(key, hardness, drop, tool) {
    var id = B[key]; ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: 1, dropMax: 1, dropChance: 1 };
    if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = 0; ITEMS[key].fast = true; }
    return ITEMS[key];
  }

  // ---------------- バイオーム ----------------
  [['DARK_FOREST', { key: 'dark_forest', name: '濃いオークの森', top: B.GRASS, under: B.DIRT, depth: 3, tint: [0.74, 0.92, 0.7] }],
   ['BIRCH_FOREST', { key: 'birch_forest', name: 'シラカバの森', top: B.GRASS, under: B.DIRT, depth: 3, tint: [0.96, 1.04, 0.84] }],
   ['FLOWER_FOREST', { key: 'flower_forest', name: '花の森', top: B.GRASS, under: B.DIRT, depth: 3, tint: [0.94, 1.04, 0.86] }],
   ['OLD_GROWTH_TAIGA', { key: 'old_growth_taiga', name: '巨大なタイガ', top: B.PODZOL, under: B.DIRT, depth: 3, tint: [0.84, 0.92, 0.86] }],
   ['SUNFLOWER_PLAINS', { key: 'sunflower_plains', name: 'ヒマワリ平原', top: B.GRASS, under: B.DIRT, depth: 3, tint: [1.04, 1.03, 0.88] }],
   ['ICE_SPIKES', { key: 'ice_spikes', name: '樹氷', top: B.SNOW, under: B.DIRT, depth: 3, tint: [0.86, 0.95, 1] }],
   ['BAMBOO_JUNGLE', { key: 'bamboo_jungle', name: '竹林', top: B.GRASS, under: B.DIRT, depth: 3, tint: [0.84, 1.08, 0.72] }],
   ['SPARSE_JUNGLE', { key: 'sparse_jungle', name: 'まばらなジャングル', top: B.GRASS, under: B.DIRT, depth: 3, tint: [0.88, 1.06, 0.76] }]
  ].forEach(function (q) { BI[q[0]] = WG.BIOMES.length; WG.BIOMES.push(q[1]); });
  // 元のバイオーム（生き物の出かたや天気などは、元のバイオームと同じに扱う）
  WG.BIOME_PARENT = { dark_forest: 'forest', birch_forest: 'forest', flower_forest: 'forest', old_growth_taiga: 'taiga', sunflower_plains: 'plains', ice_spikes: 'snowy_plains', bamboo_jungle: 'jungle', sparse_jungle: 'jungle' };

  var column = Overworld.prototype.column;
  Overworld.prototype.column = function (x, z) {
    var c = column.apply(this, arguments), b = c.b;
    if (b !== BI.FOREST && b !== BI.TAIGA && b !== BI.PLAINS && b !== BI.SNOWY_PLAINS && b !== BI.JUNGLE) return c;
    if (!this.nVar) { this.nVar = new WG.Perlin(this.seed, 43); this.nVar2 = new WG.Perlin(this.seed, 44); }
    var v = this.nVar.fbm2(x / 300, z / 300, 2) * 1.9, v2 = this.nVar2.fbm2(x / 220, z / 220, 2) * 1.9;
    if (b === BI.FOREST) b = v > 0.3 ? BI.DARK_FOREST : v < -0.3 ? BI.BIRCH_FOREST : v2 > 0.4 ? BI.FLOWER_FOREST : b;
    else if (b === BI.TAIGA) b = v > 0.22 ? BI.OLD_GROWTH_TAIGA : b;
    else if (b === BI.PLAINS) b = v2 > 0.36 ? BI.SUNFLOWER_PLAINS : b;
    else if (b === BI.SNOWY_PLAINS) b = v > 0.38 ? BI.ICE_SPIKES : b;
    else if (b === BI.JUNGLE) b = v > 0.28 ? BI.BAMBOO_JUNGLE : v < -0.28 ? BI.SPARSE_JUNGLE : b;
    return { h: c.h, b: b };
  };

  // ---------------- 木の形（太い木） ----------------
  // 巨大なトウヒ：2×2 の高い幹と、上ほど細い円すいの葉
  function megaSpruce(put, x, y, z, rnd) {
    var h = 16 + Math.floor(rnd() * 10), j;
    for (j = 0; j < h; j++) { put(x, y + j, z, B.SPRUCE_LOG); put(x + 1, y + j, z, B.SPRUCE_LOG); put(x, y + j, z + 1, B.SPRUCE_LOG); put(x + 1, y + j, z + 1, B.SPRUCE_LOG); }
    var top = y + h, cx = x + 0.5, cz = z + 0.5;
    for (var ly = top + 1; ly >= top - Math.floor(h * 0.62); ly--) {
      var r = Math.min(4.8, 1.4 + (top + 1 - ly) * 0.4) * ((top - ly) % 3 === 2 ? 0.72 : 1);
      for (var dz = -5; dz <= 6; dz++) for (var dx = -5; dx <= 6; dx++) {
        var px = x + dx, pz = z + dz, d = Math.hypot(px - cx, pz - cz);
        if (d <= r + 0.3) put(px, ly, pz, B.SPRUCE_LEAVES);
      }
    }
  }
  WG.drawMegaSpruce = megaSpruce;

  // ---------------- 生成：木・草花・竹・樹氷・土 ----------------
  var TREE_P = {}, TR = 8;
  TREE_P[BI.DARK_FOREST] = 0.9; TREE_P[BI.BIRCH_FOREST] = 0.68; TREE_P[BI.FLOWER_FOREST] = 0.22; TREE_P[BI.OLD_GROWTH_TAIGA] = 0.6;
  TREE_P[BI.SUNFLOWER_PLAINS] = 0.015; TREE_P[BI.BAMBOO_JUNGLE] = 0.2; TREE_P[BI.SPARSE_JUNGLE] = 0.16;
  var FLOWERS = ['DANDELION', 'POPPY', 'ALLIUM', 'AZURE_BLUET', 'RED_TULIP', 'ORANGE_TULIP', 'WHITE_TULIP', 'PINK_TULIP', 'OXEYE_DAISY', 'CORNFLOWER', 'LILY_OF_THE_VALLEY'].filter(function (k) { return B[k] != null; });
  var generate = Overworld.prototype.generate;
  Overworld.prototype.generate = function (cx, cz, surfaceOnly) {
    var r = generate.apply(this, arguments), bl = r.blocks, bio = r.biome, hm = r.hmap, seed = this.seed, x0 = cx << 4, z0 = cz << 4, self = this, i, y;
    var idx = function (x, y, z) { return ((y - MINY) << 8) | (z << 4) | x; };
    var get = function (x, y, z) { return x < 0 || x > 15 || z < 0 || z > 15 || y <= MINY || y >= 319 ? -1 : bl[idx(x, y, z)]; };
    var set = function (x, y, z, id) { if (x >= 0 && x <= 15 && z >= 0 && z <= 15 && y > MINY && y < 319) bl[idx(x, y, z)] = id; };
    var put = function (x, y, z, id) { var lx = x - x0, lz = z - z0, cur = get(lx, y, lz); if (cur === B.AIR || (cur >= 0 && WG.blockKind(cur) === 'plant' && !/_LEAVES$/.test(keyOf(id)))) set(lx, y, lz, id); };
    // 1. 土（巨大なタイガと竹林は、ポドゾルと粗い土のまだら）
    for (i = 0; i < 256; i++) {
      var b = bio[i], h = hm[i], top = get(i & 15, h, i >> 4), wx = x0 + (i & 15), wz = z0 + (i >> 4);
      if ((b === BI.OLD_GROWTH_TAIGA || b === BI.BAMBOO_JUNGLE || b === BI.DARK_FOREST) && (top === B.GRASS || top === B.PODZOL) && h >= SEA) {
        var p = rnd(seed, wx >> 2, 0, wz >> 2, 1201);
        if (b === BI.OLD_GROWTH_TAIGA) set(i & 15, h, i >> 4, p < 0.25 ? B.COARSE_DIRT : p < 0.4 ? B.GRASS : B.PODZOL);
        else if (b === BI.BAMBOO_JUNGLE && p < 0.45) set(i & 15, h, i >> 4, B.PODZOL);
        else if (b === BI.DARK_FOREST && p < 0.08) set(i & 15, h, i >> 4, B.PODZOL);
      }
    }
    // 2. 木（4×4 の区画に 1 本の候補。隣のチャンクの木もはみ出す分だけ描く）
    var trees = [];
    for (var gz = Math.floor((z0 - TR) / 4); gz <= Math.floor((z0 + 15 + TR) / 4); gz++) for (var gx = Math.floor((x0 - TR) / 4); gx <= Math.floor((x0 + 15 + TR) / 4); gx++) {
      var rr = rnd(seed, gx, 0, gz, 1202), hh = hash(seed, gx, 1, gz, 1203), tx = gx * 4 + (hh % 3), tz = gz * 4 + ((hh >>> 8) % 3), tb, th;
      if (tx >= x0 && tx < x0 + 16 && tz >= z0 && tz < z0 + 16) { var li = ((tz - z0) << 4) | (tx - x0); tb = bio[li]; th = hm[li]; } else { var cc = self.column(tx, tz); tb = cc.b; th = cc.h; }
      if (!(rr < (TREE_P[tb] || 0)) || th < SEA || th > 300) continue;
      trees.push({ b: tb, x: tx, y: th + 1, z: tz, k: hh, r: rnd(seed, gx, 2, gz, 1204) });
    }
    trees.forEach(function (t) {
      var s = t.k >>> 0, rf = function () { s = (s + 0x6D2B79F5) >>> 0; var q = s; q = Math.imul(q ^ q >>> 15, q | 1); q ^= q + Math.imul(q ^ q >>> 7, q | 61); return ((q ^ q >>> 14) >>> 0) / 4294967296; };
      var kind = null;
      if (t.b === BI.DARK_FOREST) { if (t.r < 0.75) { WG.drawDarkOak(put, t.x, t.y, t.z, rf); return; } kind = t.r < 0.85 ? 8 : 0; }
      else if (t.b === BI.BIRCH_FOREST) kind = t.r < 0.9 ? 1 : 0;
      else if (t.b === BI.FLOWER_FOREST) kind = t.r < 0.5 ? 1 : 0;
      else if (t.b === BI.OLD_GROWTH_TAIGA) { if (t.r < 0.45) { megaSpruce(put, t.x, t.y, t.z, rf); return; } kind = 2; }
      else if (t.b === BI.SUNFLOWER_PLAINS) kind = 0;
      else kind = 3;
      var tree = { t: kind, x: t.x, y: t.y, z: t.z, k: t.k, sea: SEA };
      WG.drawTree(tree, 0, put, seed); WG.drawTree(tree, 1, put, seed);
    });
    // 3. 草花・竹（自分の列だけ）
    var tall = function (lx, ty, lz, k) { if (get(lx, ty, lz) === B.AIR && get(lx, ty + 1, lz) === B.AIR) { set(lx, ty, lz, B[k + '_L']); set(lx, ty + 1, lz, B[k + '_U']); } };
    for (i = 0; i < 256; i++) {
      var lx = i & 15, lz = i >> 4, b2 = bio[i], gh = hm[i], ground = get(lx, gh, lz), ty = gh + 1, wx2 = x0 + lx, wz2 = z0 + lz;
      if (gh < SEA || get(lx, ty, lz) !== B.AIR) continue;
      if (ground !== B.GRASS && ground !== B.PODZOL && ground !== B.COARSE_DIRT) continue;
      var q = rnd(seed, wx2, gh, wz2, 1205), q2 = hash(seed, wx2, gh, wz2, 1206);
      if (b2 === BI.FLOWER_FOREST) { if (q < 0.03) tall(lx, ty, lz, ['LILAC', 'ROSE_BUSH', 'PEONY'][q2 % 3]); else if (q < 0.34) set(lx, ty, lz, B[FLOWERS[(Math.floor(wx2 / 5) * 7 + Math.floor(wz2 / 5) * 3 + q2 % 2) % FLOWERS.length]]); else if (q < 0.44) set(lx, ty, lz, B.SHORT_GRASS); }
      else if (b2 === BI.SUNFLOWER_PLAINS) { if (q < 0.1) tall(lx, ty, lz, 'SUNFLOWER'); else if (q < 0.18) tall(lx, ty, lz, 'TALL_GRASS'); else if (q < 0.45) set(lx, ty, lz, B.SHORT_GRASS); else if (q < 0.47) set(lx, ty, lz, B[FLOWERS[q2 % FLOWERS.length]]); }
      else if (b2 === BI.BIRCH_FOREST) { if (q < 0.15) set(lx, ty, lz, B.SHORT_GRASS); else if (q < 0.17) set(lx, ty, lz, q2 % 2 ? B.LILY_OF_THE_VALLEY || B.POPPY : B.ALLIUM || B.POPPY); else if (q < 0.18) tall(lx, ty, lz, 'LILAC'); }
      else if (b2 === BI.DARK_FOREST) { if (q < 0.1) set(lx, ty, lz, B.SHORT_GRASS); else if (q < 0.12) set(lx, ty, lz, q2 % 2 ? B.RED_MUSHROOM : B.BROWN_MUSHROOM); else if (q < 0.125) tall(lx, ty, lz, 'ROSE_BUSH'); }
      else if (b2 === BI.OLD_GROWTH_TAIGA) { if (q < 0.14) set(lx, ty, lz, B.FERN); else if (q < 0.2) tall(lx, ty, lz, 'LARGE_FERN'); else if (q < 0.21) set(lx, ty, lz, q2 % 2 ? B.BROWN_MUSHROOM : B.RED_MUSHROOM); }
      else if (b2 === BI.BAMBOO_JUNGLE) {
        if (q < 0.3 && B.BAMBOO != null) { var bh = 5 + q2 % 8; for (y = 0; y < bh && get(lx, ty + y, lz) === B.AIR; y++) set(lx, ty + y, lz, B.BAMBOO); }
        else if (q < 0.42) set(lx, ty, lz, B.FERN); else if (q < 0.47) tall(lx, ty, lz, 'LARGE_FERN');
      }
      else if (b2 === BI.SPARSE_JUNGLE) { if (q < 0.25) set(lx, ty, lz, B.SHORT_GRASS); else if (q < 0.3) tall(lx, ty, lz, 'TALL_GRASS'); else if (q < 0.33) set(lx, ty, lz, B.FERN); }
      // 元のバイオームにも、背の高い草花を少し
      else if (b2 === BI.PLAINS || b2 === BI.SAVANNA) { if (q < 0.035) tall(lx, ty, lz, 'TALL_GRASS'); }
      else if (b2 === BI.TAIGA || b2 === BI.JUNGLE) { if (q < 0.03) tall(lx, ty, lz, 'LARGE_FERN'); }
      else if (b2 === BI.FOREST) { if (q < 0.006) tall(lx, ty, lz, ['LILAC', 'ROSE_BUSH', 'PEONY'][q2 % 3]); else if (q < 0.02) tall(lx, ty, lz, 'TALL_GRASS'); }
    }
    // 4. 樹氷：氷の塔（チャンクの中に収まる大きさ）
    for (var k = 0; k < 2; k++) {
      var sx = 3 + hash(seed, cx, k, cz, 1207) % 10, sz = 3 + hash(seed, cx, k, cz, 1208) % 10, si = (sz << 4) | sx;
      if (bio[si] !== BI.ICE_SPIKES || hash(seed, cx, k, cz, 1209) % 3 === 0) continue;
      var big = hash(seed, cx, k, cz, 1210) % 6 === 0, H = big ? 24 + hash(seed, cx, k, cz, 1211) % 18 : 6 + hash(seed, cx, k, cz, 1211) % 10, R = big ? 2.6 : 1.5, base = hm[si];
      for (y = -2; y <= H; y++) {
        var rad = R * (1 - Math.max(0, y) / (H + 1)) + 0.2;
        for (var dz = -3; dz <= 3; dz++) for (var dx = -3; dx <= 3; dx++) if (dx * dx + dz * dz <= rad * rad) set(sx + dx, base + y, sz + dz, B.PACKED_ICE);
      }
      hm[si] = base + H;
    }
    return r;
  };

  // ---------------- アイテムとレシピ ----------------
  blockItem('PODZOL', 0.5, 'DIRT', 'shovel'); blockItem('COARSE_DIRT', 0.5, 'COARSE_DIRT', 'shovel'); blockItem('ROOTED_DIRT', 0.5, 'ROOTED_DIRT', 'shovel'); blockItem('DIRT_PATH', 0.65, 'DIRT', 'shovel');
  ['BAMBOO_BLOCK', 'BAMBOO_PLANKS', 'BAMBOO_MOSAIC'].forEach(function (k) { blockItem(k, 2, k, 'axe'); Craft.FUEL[k] = 300; });
  if (Craft.GROUPS && Craft.GROUPS.PLANKS) Craft.GROUPS.PLANKS.push('BAMBOO_PLANKS');
  var TALL = {}, DYE = { SUNFLOWER: 'YELLOW_DYE', LILAC: 'MAGENTA_DYE', ROSE_BUSH: 'RED_DYE', PEONY: 'PINK_DYE' };
  WG.TALL_PLANTS.forEach(function (q) {
    var k = q[0];
    TALL[B[k + '_L']] = { k: k, up: true }; TALL[B[k + '_U']] = { k: k, up: false };
    blockItem(k + '_L', 0, null); blockItem(k + '_U', 0, null);
    ITEMS[k] = { key: k, name: q[1], block: B[k + '_U'], max: 64, tall: k };
    if (DYE[k]) Craft.SHAPELESS.push([[k], DYE[k], 2]);
    if (WG.COMPOST) WG.COMPOST[k] = 0.5;
  });
  WG.TALL_INFO = TALL;
  Craft.SHAPED.push([['DG', 'GD'], { D: 'DIRT', G: 'GRAVEL' }, 'COARSE_DIRT', 4], [['BBB', 'BBB', 'BBB'], { B: 'BAMBOO' }, 'BAMBOO_BLOCK', 1]);
  Craft.SHAPELESS.push([['BAMBOO_BLOCK'], 'BAMBOO_PLANKS', 2], [['BAMBOO_PLANKS', 'BAMBOO'], 'BAMBOO_MOSAIC', 1]);

  // ---------------- 遊ぶとき ----------------
  var GROUND = {}; ['GRASS', 'DIRT', 'PODZOL', 'COARSE_DIRT', 'ROOTED_DIRT', 'FARMLAND', 'FARMLAND_MOIST', 'MOSS_BLOCK', 'MUD', 'MYCELIUM'].forEach(function (k) { if (B[k] != null) GROUND[B[k]] = 1; });
  if (WG.SAPLING_GROUND) { WG.SAPLING_GROUND[B.PODZOL] = 1; WG.SAPLING_GROUND[B.COARSE_DIRT] = 1; WG.SAPLING_GROUND[B.ROOTED_DIRT] = 1; }
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), it = held && ITEMS[held.key], wd = this.world;
    if (t && it && it.tall) {
      if (!GROUND[wd.block(t.px, t.py - 1, t.pz)] || wd.block(t.px, t.py, t.pz) !== B.AIR || wd.block(t.px, t.py + 1, t.pz) !== B.AIR) return;
      wd.setBlock(t.px, t.py, t.pz, B[it.tall + '_L']); wd.setBlock(t.px, t.py + 1, t.pz, B[it.tall + '_U']);
      if (this.mode === 'survival') this.inv.take(this.inv.sel, 1);
      w.remesh(t.px, t.pz);
      if (WG.Sound) WG.Sound.play('place', t.px + 0.5, t.py + 0.5, t.pz + 0.5, 'grass');
      return;
    }
    return place.apply(this, arguments);
  };
  var breakBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z), info = TALL[id], held = this.inv.held();
    var r = breakBlock.apply(this, arguments);
    if (!info || wd.block(x, y, z) === id) return r;
    var oy = info.up ? y + 1 : y - 1;
    if (TALL[wd.block(x, oy, z)] && TALL[wd.block(x, oy, z)].k === info.k) wd.setBlock(x, oy, z, B.AIR);
    if (this.mode === 'survival') {
      var grassy = info.k === 'TALL_GRASS' || info.k === 'LARGE_FERN';
      if (!grassy || (held && held.key === 'SHEARS')) this.spawnItem(info.k, 1, x + 0.5, Math.min(y, oy) + 0.4, z + 0.5, 0.1, 10);
      else if (Math.random() < 0.125) this.spawnItem('WHEAT_SEEDS', 1, x + 0.5, y + 0.4, z + 0.5, 0.1, 10);
    }
    if (this.walker.remesh) this.walker.remesh(x, z);
    return r;
  };
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), wd = this.world, surv = this.mode === 'survival', self = this;
    if (t && held && !this.spectator && !(this.mobs.target && this.mobs.target.mob)) {
      var done = function () { self.mouseR = self.clickR = false; w.remesh(t.x, t.z); };
      // シャベルで土の道
      if (/_SHOVEL$/.test(held.key) && (t.id === B.GRASS || t.id === B.DIRT || t.id === B.PODZOL || t.id === B.COARSE_DIRT || t.id === B.MYCELIUM || t.id === B.ROOTED_DIRT) && t.py > t.y && wd.block(t.x, t.y + 1, t.z) === B.AIR) {
        wd.setBlock(t.x, t.y, t.z, B.DIRT_PATH); if (surv && this.wearItem) this.wearItem(this.inv.sel, 1);
        if (WG.Sound) WG.Sound.play('place', t.x + 0.5, t.y + 1, t.z + 0.5, 'grass');
        done(); return;
      }
      // クワで粗い土・根の張った土を土に
      if (/_HOE$/.test(held.key) && (t.id === B.COARSE_DIRT || t.id === B.ROOTED_DIRT)) {
        wd.setBlock(t.x, t.y, t.z, B.DIRT); if (surv && this.wearItem) this.wearItem(this.inv.sel, 1);
        done(); return;
      }
      // 骨粉：草 → 背の高い草、シダ → 大きなシダ、背の高い花 → もう 1 本
      if (held.key === 'BONE_MEAL') {
        var up = wd.block(t.x, t.y + 1, t.z);
        if ((t.id === B.SHORT_GRASS || t.id === B.FERN) && up === B.AIR) {
          var kk = t.id === B.FERN ? 'LARGE_FERN' : 'TALL_GRASS';
          wd.setBlock(t.x, t.y, t.z, B[kk + '_L']); wd.setBlock(t.x, t.y + 1, t.z, B[kk + '_U']);
          if (surv) this.inv.take(this.inv.sel, 1);
          done(); return;
        }
        var ti = TALL[t.id];
        if (ti && DYE[ti.k]) { this.spawnItem(ti.k, 1, t.x + 0.5, t.y + 0.6, t.z + 0.5, 0.1, 10); if (surv) this.inv.take(this.inv.sel, 1); done(); return; }
      }
    }
    return use.apply(this, arguments);
  };
})(typeof window !== 'undefined' ? window : globalThis);
