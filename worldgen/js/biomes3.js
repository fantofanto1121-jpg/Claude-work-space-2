// 地上のバイオーム その 2（ロードマップ 第 12 段階）
// 草地・林・雪の斜面・とがった峰・凍った峰・吹きさらしの丘・浸食された荒野・木の生えた荒野・石の海岸・青白い庭
// ディープダーク：古代都市のまわりの深い洞窟に、スカルクが広がる
// あわせて、垂れ根・ヒカリゴケ（洞窟）、粉雪（沈む・凍える。革の靴なら上を歩ける）
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, BI = WG.BI, rnd = WG.rnd, hash = WG.hash, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Overworld = WG.Overworld;
  var SEA = 63, MINY = -64;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function keyOf(id) { return WG.BLOCKS[id] ? WG.BLOCKS[id].key : ''; }
  function blockItem(key, hardness, drop, tool) {
    var id = B[key]; ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: 1, dropMax: 1, dropChance: 1 };
    if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = 0; ITEMS[key].fast = true; }
    return ITEMS[key];
  }

  // ---------------- バイオーム ----------------
  [['MEADOW', { key: 'meadow', name: '草地', top: B.GRASS, under: B.DIRT, depth: 3, tint: [0.9, 1.08, 0.86] }],
   ['GROVE', { key: 'grove', name: '林', top: B.GRASS, under: B.DIRT, depth: 3, tint: [0.84, 0.94, 0.96] }],
   ['SNOWY_SLOPES', { key: 'snowy_slopes', name: '雪の斜面', top: B.SNOW, under: B.STONE, depth: 1, tint: [0.86, 0.95, 1] }],
   ['JAGGED_PEAKS', { key: 'jagged_peaks', name: 'とがった峰', top: B.SNOW, under: B.STONE, depth: 0, tint: [0.86, 0.95, 1] }],
   ['FROZEN_PEAKS', { key: 'frozen_peaks', name: '凍った峰', top: B.PACKED_ICE, under: B.STONE, depth: 0, tint: [0.86, 0.95, 1] }],
   ['WINDSWEPT_HILLS', { key: 'windswept_hills', name: '吹きさらしの丘', top: B.GRASS, under: B.DIRT, depth: 2, tint: [0.84, 0.94, 0.9] }],
   ['ERODED_BADLANDS', { key: 'eroded_badlands', name: '浸食された荒野', top: B.RED_SAND, under: B.RED_SAND, depth: 1, tint: [1.2, 0.95, 0.6] }],
   ['WOODED_BADLANDS', { key: 'wooded_badlands', name: '木の生えた荒野', top: B.COARSE_DIRT, under: B.RED_SAND, depth: 1, tint: [1.12, 0.98, 0.66] }],
   ['STONY_SHORE', { key: 'stony_shore', name: '石の海岸', top: B.STONE, under: B.STONE, depth: 0, tint: [0.92, 0.96, 0.94] }],
   ['PALE_GARDEN', { key: 'pale_garden', name: '青白い庭', top: B.GRASS, under: B.DIRT, depth: 3, tint: [0.82, 0.86, 0.84] }]
  ].forEach(function (q) { BI[q[0]] = WG.BIOMES.length; WG.BIOMES.push(q[1]); });
  Object.assign(WG.BIOME_PARENT = WG.BIOME_PARENT || {}, { meadow: 'plains', grove: 'snowy_plains', snowy_slopes: 'snowy_mountain', jagged_peaks: 'snowy_mountain', frozen_peaks: 'snowy_mountain',
    windswept_hills: 'taiga', eroded_badlands: 'badlands', wooded_badlands: 'badlands', stony_shore: 'beach', pale_garden: 'forest' });
  var HILLS_FROM = {}; [BI.PLAINS, BI.FOREST, BI.TAIGA, BI.SUNFLOWER_PLAINS, BI.BIRCH_FOREST, BI.FLOWER_FOREST].forEach(function (b) { if (b != null) HILLS_FROM[b] = 1; });

  var column = Overworld.prototype.column;
  Overworld.prototype.column = function (x, z) {
    var c = column.apply(this, arguments), b = c.b, h = c.h;
    if (!this.nV3) { this.nV3 = new WG.Perlin(this.seed, 45); this.nV4 = new WG.Perlin(this.seed, 46); this.nSpike = new WG.Perlin(this.seed, 47); }
    var v = this.nV3.fbm2(x / 280, z / 280, 2) * 1.9, v2 = this.nV4.fbm2(x / 240, z / 240, 2) * 1.9;
    if (b === BI.SNOWY_MOUNTAIN) {
      if (h >= 196) {
        if (v2 > 0) { b = BI.JAGGED_PEAKS; var sp = 1 - Math.abs(this.nSpike.fbm2(x / 34, z / 34, 2) * 1.9); h += Math.floor(Math.max(0, sp) * Math.max(0, sp) * 22 * smooth(196, 220, h)); }
        else b = BI.FROZEN_PEAKS;
      } else b = h < 152 && v > 0.05 ? BI.GROVE : BI.SNOWY_SLOPES;
    } else if (b === BI.ROCKY_MOUNTAIN) {
      if (h < 142 && v > 0) b = BI.MEADOW;
    } else if (HILLS_FROM[b] && h >= 96) {
      b = BI.WINDSWEPT_HILLS;
    } else if (b === BI.BADLANDS) {
      if (v > 0.2) {
        b = BI.ERODED_BADLANDS;
        var hs = this.nSpike.fbm2(x / 9, z / 9, 2) * 1.9;
        if (hs > 0.35) h += Math.floor((hs - 0.35) * 30 * smooth(0.2, 0.35, v));   // とがった塔（フードゥー）
      } else if (v < -0.2) { b = BI.WOODED_BADLANDS; h += Math.round(smooth(0.2, 0.42, -v) * 16); }
    } else if (b === BI.BEACH) {
      var m = 0;
      [[7, 0], [-7, 0], [0, 7], [0, -7]].forEach(function (d) { m = Math.max(m, column.call(this, x + d[0], z + d[1]).h); }, this);
      if (m > SEA + 12) b = BI.STONY_SHORE;
    } else if (b === BI.DARK_FOREST && v2 > 0.42) {
      b = BI.PALE_GARDEN;
    }
    return { h: h, b: b };
  };

  // ---------------- 生成 ----------------
  var BANDS = ['TERRACOTTA', 'ORANGE_TERRACOTTA', 'TERRACOTTA', 'YELLOW_TERRACOTTA', 'WHITE_TERRACOTTA', 'TERRACOTTA', 'RED_TERRACOTTA', 'ORANGE_TERRACOTTA', 'LIGHT_GRAY_TERRACOTTA', 'TERRACOTTA', 'BROWN_TERRACOTTA', 'ORANGE_TERRACOTTA']
    .map(function (k) { return B[k] != null ? B[k] : B.TERRACOTTA; });
  var TREE_P = {}, TR = 8;
  TREE_P[BI.GROVE] = 0.55; TREE_P[BI.WINDSWEPT_HILLS] = 0.07; TREE_P[BI.MEADOW] = 0.012; TREE_P[BI.WOODED_BADLANDS] = 0.3; TREE_P[BI.PALE_GARDEN] = 0.85;
  var MEADOW_FL = ['CORNFLOWER', 'ALLIUM', 'AZURE_BLUET', 'OXEYE_DAISY', 'DANDELION', 'POPPY'].filter(function (k) { return B[k] != null; });
  var acSpec = null;
  function ancientCityNear(gen, x, z) {
    if (!acSpec && WG.StructAPI) acSpec = WG.StructAPI.SPECS.filter(function (s) { return s.key === 'ac'; })[0];
    if (!acSpec) return false;
    for (var rz = Math.floor((z - 140) / acSpec.size); rz <= Math.floor((z + 140) / acSpec.size); rz++) for (var rx = Math.floor((x - 140) / acSpec.size); rx <= Math.floor((x + 140) / acSpec.size); rx++) {
      var h = acSpec.head(gen, rx, rz);
      if (h && Math.hypot(h.x - x, h.z - z) < 120) return h;
    }
    return false;
  }
  WG.ancientCityNear = ancientCityNear;
  var generate = Overworld.prototype.generate;
  Overworld.prototype.generate = function (cx, cz, surfaceOnly) {
    var r = generate.apply(this, arguments), bl = r.blocks, bio = r.biome, hm = r.hmap, seed = this.seed, x0 = cx << 4, z0 = cz << 4, self = this, i, y;
    var idx = function (x, y, z) { return ((y - MINY) << 8) | (z << 4) | x; };
    var get = function (x, y, z) { return x < 0 || x > 15 || z < 0 || z > 15 || y <= MINY || y >= 319 ? -1 : bl[idx(x, y, z)]; };
    var set = function (x, y, z, id) { if (x >= 0 && x <= 15 && z >= 0 && z <= 15 && y > MINY && y < 319) bl[idx(x, y, z)] = id; };
    var put = function (x, y, z, id) { var lx = x - x0, lz = z - z0, cur = get(lx, y, lz); if (cur === B.AIR || (cur >= 0 && WG.blockKind(cur) === 'plant' && !/_LEAVES$/.test(keyOf(id)))) set(lx, y, lz, id); };
    // 1. 地面（荒野の地層、吹きさらしの丘の石と砂利、雪の斜面の粉雪、凍った峰の氷、石の海岸の砂利）
    for (i = 0; i < 256; i++) {
      var lx = i & 15, lz = i >> 4, b = bio[i], h = hm[i], wx = x0 + lx, wz = z0 + lz, p = rnd(seed, wx >> 1, 0, wz >> 1, 1301), top = get(lx, h, lz);
      if (b === BI.ERODED_BADLANDS || b === BI.WOODED_BADLANDS) {
        for (y = h - 1; y >= Math.max(SEA - 6, h - 60); y--) { var cur = get(lx, y, lz); if (cur === B.STONE || cur === B.RED_SAND || cur === B.DIRT) set(lx, y, lz, BANDS[((y % BANDS.length) + BANDS.length) % BANDS.length]); }
        if (b === BI.ERODED_BADLANDS && h > SEA + 6 && p < 0.5) set(lx, h, lz, BANDS[((h % BANDS.length) + BANDS.length) % BANDS.length]);
        if (b === BI.WOODED_BADLANDS && p < 0.3) set(lx, h, lz, B.GRASS);
      } else if (b === BI.WINDSWEPT_HILLS && h >= SEA) {
        if (p < 0.22) { set(lx, h, lz, B.STONE); set(lx, h - 1, lz, B.STONE); } else if (p < 0.3) set(lx, h, lz, B.GRAVEL);
      } else if (b === BI.SNOWY_SLOPES && p < 0.18) {
        for (y = h; y > h - 3; y--) set(lx, y, lz, B.POWDER_SNOW);
      } else if (b === BI.FROZEN_PEAKS) {
        set(lx, h, lz, p < 0.4 ? B.PACKED_ICE : p < 0.55 ? B.ICE : B.SNOW);
      } else if (b === BI.STONY_SHORE && h < SEA + 6) {
        if (p < 0.3) set(lx, h, lz, B.GRAVEL);
      } else if (b === BI.PALE_GARDEN && top === B.GRASS && p < 0.25) {
        set(lx, h, lz, B.PALE_MOSS_BLOCK);
      }
    }
    // 2. 木
    var trees = [];
    for (var gz = Math.floor((z0 - TR) / 4); gz <= Math.floor((z0 + 15 + TR) / 4); gz++) for (var gx = Math.floor((x0 - TR) / 4); gx <= Math.floor((x0 + 15 + TR) / 4); gx++) {
      var rr = rnd(seed, gx, 0, gz, 1302), hh = hash(seed, gx, 1, gz, 1303), tx = gx * 4 + (hh % 3), tz = gz * 4 + ((hh >>> 8) % 3), tb, th;
      if (tx >= x0 && tx < x0 + 16 && tz >= z0 && tz < z0 + 16) { var li = ((tz - z0) << 4) | (tx - x0); tb = bio[li]; th = hm[li]; } else { var cc = self.column(tx, tz); tb = cc.b; th = cc.h; }
      if (!(rr < (TREE_P[tb] || 0)) || th < SEA || th > 300) continue;
      trees.push({ b: tb, x: tx, y: th + 1, z: tz, k: hh, r: rnd(seed, gx, 2, gz, 1304) });
    }
    trees.forEach(function (t) {
      var s = t.k >>> 0, rf = function () { s = (s + 0x6D2B79F5) >>> 0; var q = s; q = Math.imul(q ^ q >>> 15, q | 1); q ^= q + Math.imul(q ^ q >>> 7, q | 61); return ((q ^ q >>> 14) >>> 0) / 4294967296; };
      if (t.b === BI.PALE_GARDEN) { WG.drawDarkOak(put, t.x, t.y, t.z, rf, B.PALE_OAK_LOG, B.PALE_OAK_LEAVES); return; }
      var kind = t.b === BI.GROVE ? 2 : t.b === BI.WINDSWEPT_HILLS ? (t.r < 0.6 ? 2 : 0) : t.b === BI.MEADOW ? (t.r < 0.5 ? 1 : 0) : 0;
      var tree = { t: kind, x: t.x, y: t.y, z: t.z, k: t.k, sea: SEA };
      WG.drawTree(tree, 0, put, seed); WG.drawTree(tree, 1, put, seed);
    });
    // 3. 草花・雪・垂れる苔
    for (i = 0; i < 256; i++) {
      var ax = i & 15, az = i >> 4, b2 = bio[i], gh = hm[i], ty = gh + 1, ground = get(ax, gh, az), q = rnd(seed, x0 + ax, gh, z0 + az, 1305), q2 = hash(seed, x0 + ax, gh, z0 + az, 1306);
      if (b2 === BI.PALE_GARDEN) {
        // 葉の下に垂れる青白い苔
        for (y = gh + 14; y > gh + 2; y--) if (get(ax, y, az) === B.PALE_OAK_LEAVES && get(ax, y - 1, az) === B.AIR) { if (q < 0.3) { set(ax, y - 1, az, B.PALE_HANGING_MOSS); if (q < 0.12 && get(ax, y - 2, az) === B.AIR) set(ax, y - 2, az, B.PALE_HANGING_MOSS); } break; }
      }
      if (gh < SEA || get(ax, ty, az) !== B.AIR) continue;
      if (b2 === BI.MEADOW && ground === B.GRASS) {
        if (q < 0.06) { if (get(ax, ty + 1, az) === B.AIR) { set(ax, ty, az, B.TALL_GRASS_L); set(ax, ty + 1, az, B.TALL_GRASS_U); } }
        else if (q < 0.5) set(ax, ty, az, B.SHORT_GRASS);
        else if (q < 0.62) set(ax, ty, az, B[MEADOW_FL[(Math.floor((x0 + ax) / 6) * 5 + Math.floor((z0 + az) / 6) * 3 + q2 % 2) % MEADOW_FL.length]]);
      } else if (b2 === BI.GROVE && ground === B.GRASS) {
        set(ax, ty, az, B.SNOW_LAYER);
      } else if (b2 === BI.WINDSWEPT_HILLS && ground === B.GRASS && q < 0.15) {
        set(ax, ty, az, B.SHORT_GRASS);
      } else if (b2 === BI.WOODED_BADLANDS && ground === B.GRASS && q < 0.2) {
        set(ax, ty, az, B.SHORT_GRASS);
      } else if (b2 === BI.ERODED_BADLANDS && ground === B.RED_SAND && q < 0.02) {
        set(ax, ty, az, B.DEAD_BUSH != null ? B.DEAD_BUSH : B.AIR);
      } else if (b2 === BI.PALE_GARDEN && (ground === B.GRASS || ground === B.PALE_MOSS_BLOCK)) {
        if (q < 0.22) set(ax, ty, az, B.PALE_MOSS_CARPET); else if (q < 0.26) set(ax, ty, az, B.SHORT_GRASS);
      }
    }
    if (surfaceOnly) return r;
    // 4. 洞窟：ヒカリゴケ（床と天井）、繁茂した洞窟の天井から垂れ根
    for (var k = 0; k < 40; k++) {
      var cxl = hash(seed, cx, k, cz, 1307) % 16, czl = hash(seed, cx, k, cz, 1308) % 16, top2 = hm[(czl << 4) | cxl] - 6;
      for (y = -50; y < Math.min(top2, 60); y++) {
        var id = get(cxl, y, czl);
        if (id !== B.AIR) continue;
        var dn = get(cxl, y - 1, czl), up = get(cxl, y + 1, czl), hv = hash(seed, x0 + cxl, y, z0 + czl, 1309) % 100;
        if (WG.COLLIDE[dn] >= 1 && WG.blockKind(dn) === 'solid' && hv < 7) set(cxl, y, czl, B.GLOW_LICHEN);
        else if (WG.COLLIDE[up] >= 1 && WG.blockKind(up) === 'solid' && get(cxl, y - 1, czl) === B.AIR) {
          if (up === B.MOSS_BLOCK && hv < 18) set(cxl, y, czl, B.HANGING_ROOTS);
          else if (hv < 6) set(cxl, y, czl, B.GLOW_LICHEN_C);
        }
      }
    }
    // 5. ディープダーク：古代都市のまわりの深い洞窟の床と天井にスカルク
    if (B.SCULK != null && ancientCityNear(this, x0 + 8, z0 + 8)) {
      var ROCK = {}; [B.STONE, B.DEEPSLATE, B.TUFF, B.GRAVEL, B.DIRT, B.GRANITE, B.DIORITE, B.ANDESITE].forEach(function (q) { if (q != null) ROCK[q] = 1; });
      for (i = 0; i < 256; i++) {
        var sx = i & 15, sz = i >> 4;
        for (y = -58; y < -6; y++) {
          if (get(sx, y, sz) !== B.AIR) continue;
          var below = get(sx, y - 1, sz), above = get(sx, y + 1, sz), hs = hash(seed, x0 + sx, y, z0 + sz, 1310) % 1000;
          if (ROCK[below] && hs < 720) {
            set(sx, y - 1, sz, B.SCULK);
            if (hs < 10 && B.SCULK_SENSOR != null) set(sx, y, sz, B.SCULK_SENSOR);
            else if (hs < 13 && B.SCULK_SHRIEKER != null) set(sx, y, sz, B.SCULK_SHRIEKER);
          }
          if (ROCK[above] && hs > 420) set(sx, y + 1, sz, B.SCULK);
        }
      }
    }
    return r;
  };

  // ---------------- アイテム ----------------
  blockItem('PALE_OAK_LOG', 2, 'PALE_OAK_LOG', 'axe'); blockItem('PALE_OAK_PLANKS', 2, 'PALE_OAK_PLANKS', 'axe'); blockItem('PALE_OAK_LEAVES', 0.2, null);
  Craft.SHAPELESS.push([['PALE_OAK_LOG'], 'PALE_OAK_PLANKS', 4]);
  if (Craft.GROUPS) { Craft.GROUPS.PLANKS.push('PALE_OAK_PLANKS'); Craft.GROUPS.LOGS.push('PALE_OAK_LOG'); }
  Craft.FUEL.PALE_OAK_LOG = Craft.FUEL.PALE_OAK_PLANKS = 300; Craft.SMELT.PALE_OAK_LOG = 'CHARCOAL';
  blockItem('PALE_MOSS_BLOCK', 0.1, 'PALE_MOSS_BLOCK', 'hoe'); blockItem('PALE_MOSS_CARPET', 0, 'PALE_MOSS_CARPET'); blockItem('PALE_HANGING_MOSS', 0, 'PALE_HANGING_MOSS');
  Craft.SHAPED.push([['MM'], { M: 'PALE_MOSS_BLOCK' }, 'PALE_MOSS_CARPET', 3]);
  blockItem('HANGING_ROOTS', 0, 'HANGING_ROOTS');
  blockItem('GLOW_LICHEN', 0.2, null); blockItem('GLOW_LICHEN_C', 0.2, null);
  blockItem('POWDER_SNOW', 0.25, null, 'shovel');
  ITEMS.POWDER_SNOW_BUCKET = { key: 'POWDER_SNOW_BUCKET', name: '粉雪入りバケツ', block: -1, max: 1, shape: 'ball', color: '#f4f8fc' };

  // ---------------- 置く・集める ----------------
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), wd = this.world, surv = this.mode === 'survival';
    if (t && held) {
      var free = wd.block(t.px, t.py, t.pz) === B.AIR, ceil = t.py < t.y, nid = null;
      if (held.key === 'GLOW_LICHEN') nid = ceil ? B.GLOW_LICHEN_C : B.GLOW_LICHEN;
      else if ((held.key === 'HANGING_ROOTS' || held.key === 'PALE_HANGING_MOSS') && ceil) nid = B[held.key];
      else if (held.key === 'HANGING_ROOTS' || held.key === 'PALE_HANGING_MOSS') return;
      else if (held.key === 'POWDER_SNOW_BUCKET') nid = B.POWDER_SNOW;
      if (nid != null) {
        if (!free) return;
        wd.setBlock(t.px, t.py, t.pz, nid); w.remesh(t.px, t.pz);
        if (surv) { if (held.key === 'POWDER_SNOW_BUCKET') this.inv.slots[this.inv.sel] = { key: 'BUCKET', n: 1 }; else this.inv.take(this.inv.sel, 1); this.inv.changed(); }
        if (WG.Sound) WG.Sound.play('place', t.px + 0.5, t.py + 0.5, t.pz + 0.5, 'grass');
        return;
      }
    }
    return place.apply(this, arguments);
  };
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), wd = this.world;
    if (t && held && held.key === 'BUCKET' && t.id === B.POWDER_SNOW && !this.spectator) {
      wd.setBlock(t.x, t.y, t.z, B.AIR); w.remesh(t.x, t.z);
      if (this.mode === 'survival') { if (held.n > 1) { held.n--; this.inv.add('POWDER_SNOW_BUCKET', 1); } else this.inv.slots[this.inv.sel] = { key: 'POWDER_SNOW_BUCKET', n: 1 }; this.inv.changed(); }
      this.mouseR = this.clickR = false;
      return;
    }
    return use.apply(this, arguments);
  };
  // ヒカリゴケはハサミで集める
  var breakBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z), held = this.inv.held(), r = breakBlock.apply(this, arguments);
    if ((id === B.GLOW_LICHEN || id === B.GLOW_LICHEN_C) && wd.block(x, y, z) !== id && this.mode === 'survival' && held && held.key === 'SHEARS') this.spawnItem('GLOW_LICHEN', 1, x + 0.5, y + 0.4, z + 0.5, 0.1, 10);
    return r;
  };

  // ---------------- 粉雪：沈む・凍える。革の靴なら上を歩ける ----------------
  WG.FOG_BLOCK = WG.FOG_BLOCK || {};
  WG.FOG_BLOCK[B.POWDER_SNOW] = { c: [0.86, 0.9, 0.96], far: 1.6 };
  var tick = Game.prototype.tick;
  Game.prototype.tick = function () {
    var r = tick.apply(this, arguments), w = this.walker, wd = this.world, p = w.pos;
    if (!p || this.spectator || w.flying) { this.frozen = 0; return r; }
    var boots = this.armor && this.armor[3], leather = boots && boots.key === 'LEATHER_BOOTS';
    var fx = Math.floor(p[0]), fz = Math.floor(p[2]), feetId = wd.block(fx, Math.floor(p[1] + 0.05), fz), headId = wd.block(fx, Math.floor(p[1] + 1.4), fz);
    var below = wd.block(fx, Math.floor(p[1] - 0.05), fz);
    // 革の靴：粉雪の上に立てる（しゃがむと沈む）
    if (leather && !w.sneak && w.vel && w.vel[1] <= 0 && (below === B.POWDER_SNOW || feetId === B.POWDER_SNOW)) {
      var topY = feetId === B.POWDER_SNOW ? Math.floor(p[1] + 0.05) + 1 : Math.floor(p[1] - 0.05) + 1;
      if (topY - p[1] < 0.4 && wd.block(fx, topY, fz) !== B.POWDER_SNOW) { p[1] = topY; w.vel[1] = 0; w.onGround = true; return r; }
    }
    var inside = feetId === B.POWDER_SNOW || headId === B.POWDER_SNOW;
    if (inside) {
      w.vel[0] *= 0.55; w.vel[2] *= 0.55; w.vel[1] = Math.max(w.vel[1] * 0.4, -0.06);
      if (w.keys && w.keys.Space) w.vel[1] = 0.12;
      var anyLeather = (this.armor || []).some(function (a) { return a && /^LEATHER_/.test(a.key); });
      if (!anyLeather) this.frozen = Math.min(160, (this.frozen || 0) + 1);
      if (this.frozen >= 140 && this.tickCount % 40 === 0 && this.mode === 'survival') this.damage(1, true, 'freeze');
      if (this.tickCount % 6 === 0 && this.particles) this.particles.push({ x: p[0] + (Math.random() - 0.5) * 0.6, y: p[1] + 1 + Math.random() * 0.5, z: p[2] + (Math.random() - 0.5) * 0.6, vx: 0, vy: 0.02, vz: 0, life: 14, c: [236, 242, 250], smoke: true, sz: 0.04 });
    } else this.frozen = Math.max(0, (this.frozen || 0) - 2);
    return r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
