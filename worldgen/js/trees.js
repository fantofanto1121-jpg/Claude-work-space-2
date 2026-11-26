// 苗木と木の育ち（ロードマップ 第 9 段階）
// 苗木：葉を壊したり、原木を切って葉が枯れたりすると落ちる。草や土に植えると、ときどき育って木になる（骨粉で早く）
//       濃いオークは 2×2 に植えると太い木に。マングローブの芽は泥や水の中の地面にも植えられる
// 葉：原木から離れた葉（6 マスより遠い）は、少しずつ枯れて落ちる。自分で置いた葉は枯れない
// 皮をはぐ：斧で原木・木・幹・菌糸を右クリック。原木 4 つで樹皮付きの木 3 つ
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game;
  function keyOf(id) { return WG.BLOCKS[id] ? WG.BLOCKS[id].key : ''; }
  function blockItem(key, hardness, drop, tool) {
    var id = B[key]; ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: 1, dropMax: 1, dropChance: 1 };
    if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = 0; ITEMS[key].fast = true; }
    return ITEMS[key];
  }

  // ---------------- 苗木 ----------------
  var SAP = {}, SAP_KEY = {};
  WG.SAPLINGS.forEach(function (q) {
    var k = q[0] === 'MANGROVE' ? 'MANGROVE_PROPAGULE' : q[0] + '_SAPLING';
    SAP[B[k]] = q[0]; SAP_KEY[q[0]] = k;
    blockItem(k, 0, k);
    Craft.FUEL[k] = 100;
    if (WG.COMPOST) WG.COMPOST[k] = 0.3;
  });
  WG.SAPLING_TYPE = SAP;
  blockItem('DARK_OAK_LEAVES', 0.2, null);
  var LEAF_SAP = { OAK_LEAVES: 'OAK', SPRUCE_LEAVES: 'SPRUCE', BIRCH_LEAVES: 'BIRCH', JUNGLE_LEAVES: 'JUNGLE', ACACIA_LEAVES: 'ACACIA', CHERRY_LEAVES: 'CHERRY', DARK_OAK_LEAVES: 'DARK_OAK', MANGROVE_LEAVES: 'MANGROVE', PALE_OAK_LEAVES: 'PALE_OAK' };
  function isLeaf(id) { return LEAF_SAP[keyOf(id)] != null; }
  function isLog(id) { return /(_LOG|_WOOD|_STEM|_HYPHAE)$/.test(keyOf(id)) && id !== B.MUSHROOM_STEM; }
  WG.isLogBlock = isLog;

  // ---------------- 皮をはいだ原木・樹皮付きの木 ----------------
  var STRIP = {};
  WG.BARKS.forEach(function (q) {
    var nether = q[0] === 'CRIMSON' || q[0] === 'WARPED', log = q[0] + (nether ? '_STEM' : '_LOG'), wood = q[0] + (nether ? '_HYPHAE' : '_WOOD');
    var slog = 'STRIPPED_' + log, swood = 'STRIPPED_' + wood, planks = q[0] + '_PLANKS';
    [slog, wood, swood].forEach(function (k) { blockItem(k, 2, k, 'axe'); if (!nether) Craft.FUEL[k] = 300; if (Craft.GROUPS && Craft.GROUPS.LOGS) Craft.GROUPS.LOGS.push(k); });
    if (B[log] != null) STRIP[B[log]] = B[slog];
    STRIP[B[wood]] = B[swood];
    Craft.SHAPED.push([['LL', 'LL'], { L: log }, wood, 3], [['LL', 'LL'], { L: slog }, swood, 3]);
    if (ITEMS[planks]) Craft.SHAPELESS.push([[slog], planks, 4], [[wood], planks, 4], [[swood], planks, 4]);
  });
  WG.STRIP = STRIP;

  // ---------------- 木を育てる ----------------
  var GROUND = {}; ['GRASS', 'DIRT', 'FARMLAND', 'FARMLAND_MOIST', 'MOSS_BLOCK', 'MUD', 'MYCELIUM', 'PODZOL', 'COARSE_DIRT', 'ROOTED_DIRT'].forEach(function (k) { if (B[k] != null) GROUND[B[k]] = 1; });
  WG.SAPLING_GROUND = GROUND;
  function canGrowInto(id) { return id === B.AIR || isLeaf(id) || SAP[id] != null || WG.blockKind(id) === 'plant' || id === B.SNOW_LAYER; }
  // 濃いオーク：2×2 の太い幹と、横に広く平たい葉
  function darkOak(put, x, y, z, rnd, LOG, LEAF) {
    LOG = LOG || B.DARK_OAK_LOG; LEAF = LEAF || B.DARK_OAK_LEAVES;
    var h = 6 + Math.floor(rnd() * 3), j, dx, dz;
    for (j = 0; j < h; j++) { put(x, y + j, z, LOG); put(x + 1, y + j, z, LOG); put(x, y + j, z + 1, LOG); put(x + 1, y + j, z + 1, LOG); }
    var top = y + h, cx = x + 0.5, cz = z + 0.5;
    for (var dy = -2; dy <= 1; dy++) {
      var r = dy === 1 ? 2.2 : dy === -2 ? 3.2 : 4.1;
      for (dz = -5; dz <= 5; dz++) for (dx = -5; dx <= 5; dx++) {
        var ex = x + dx, ez = z + dz, d = Math.max(Math.abs(ex - cx), Math.abs(ez - cz)) + 0.35 * Math.min(Math.abs(ex - cx), Math.abs(ez - cz));
        if (d > r + rnd() * 0.6) continue;
        put(ex, top + dy, ez, LEAF);
      }
    }
    // 枝：幹の横から斜め上へ伸び、先に葉の塊
    for (var b = 0; b < 2 + Math.floor(rnd() * 2); b++) {
      var d4 = [[-1, 0], [2, 0], [0, -1], [0, 2]][Math.floor(rnd() * 4)], by = y + h - 3 - Math.floor(rnd() * 2);
      put(x + d4[0], by, z + d4[1], LOG);
      var tx = x + d4[0] * 2 - (d4[0] > 0 ? 1 : 0), tz = z + d4[1] * 2 - (d4[1] > 0 ? 1 : 0);
      put(tx, by + 1, tz, LOG);
      for (dz = -1; dz <= 1; dz++) for (dx = -1; dx <= 1; dx++) for (var ly = 1; ly <= 2; ly++) if (Math.abs(dx) + Math.abs(dz) + ly < 4) put(tx + dx, by + 1 + ly, tz + dz, LEAF);
    }
  }
  WG.drawDarkOak = darkOak;
  // 苗木 (x, y, z) を木にする。育たなければ false
  WG.growTree = function (wd, x, y, z, rnd) {
    var id = wd.block(x, y, z), type = SAP[id];
    rnd = rnd || Math.random;
    if (!type) return false;
    var cols = {}, changed = false;
    var put = function (px, py, pz, nid) {
      var cur = wd.block(px, py, pz), isWood = isLog(nid) || nid === B.MANGROVE_ROOTS;
      if (cur === B.AIR || SAP[cur] != null || WG.blockKind(cur) === 'plant' || cur === B.SNOW_LAYER || (isWood && (isLeaf(cur) || WG.isWater(cur))) || (nid === B.MANGROVE_ROOTS && cur === B.MUD)) {
        wd.setBlock(px, py, pz, nid); cols[(px >> 4) + ',' + (pz >> 4)] = [px, pz]; changed = true;
      }
    };
    if (type === 'DARK_OAK' || type === 'PALE_OAK') {
      var pale = type === 'PALE_OAK', sapId = pale ? B.PALE_OAK_SAPLING : B.DARK_OAK_SAPLING;
      // 2×2 に並んだ濃いオークの苗木を探す
      var o = null;
      [[0, 0], [-1, 0], [0, -1], [-1, -1]].forEach(function (q) {
        if (o) return;
        var ox = x + q[0], oz = z + q[1];
        if ([[0, 0], [1, 0], [0, 1], [1, 1]].every(function (d) { return wd.block(ox + d[0], y, oz + d[1]) === sapId; })) o = [ox, oz];
      });
      if (!o) return false;
      for (var j = 1; j <= 7; j++) for (var a = 0; a < 2; a++) for (var c = 0; c < 2; c++) if (!canGrowInto(wd.block(o[0] + a, y + j, o[1] + c))) return false;
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (d) { wd.setBlock(o[0] + d[0], y, o[1] + d[1], B.AIR); });
      darkOak(put, o[0], y, o[1], rnd, pale ? B.PALE_OAK_LOG : null, pale ? B.PALE_OAK_LEAVES : null);
      if (pale) for (var hx = -4; hx <= 5; hx++) for (var hz = -4; hz <= 5; hz++) for (var hy = y + 12; hy > y + 3; hy--) { if (wd.block(o[0] + hx, hy, o[1] + hz) === B.PALE_OAK_LEAVES && wd.block(o[0] + hx, hy - 1, o[1] + hz) === B.AIR && rnd() < 0.25) { put(o[0] + hx, hy - 1, o[1] + hz, B.PALE_HANGING_MOSS); break; } }
    } else {
      var t = WG.TREE_KIND[type];
      if (t == null || !WG.drawTree) return false;
      var need = type === 'MANGROVE' ? 9 : type === 'CHERRY' ? 7 : 5;
      for (j = 1; j <= need; j++) if (!canGrowInto(wd.block(x, y + j, z)) && !WG.isWater(wd.block(x, y + j, z))) return false;
      wd.setBlock(x, y, z, B.AIR);
      var tree = { t: t, x: x, y: y, z: z, k: Math.floor(rnd() * 1e9), sea: 63 }, seed = Math.floor(rnd() * 1e9);
      WG.drawTree(tree, 0, put, seed); WG.drawTree(tree, 1, put, seed);
    }
    WG._lastTreeCols = cols;
    return changed;
  };
  function remeshAround(g, x, z) { if (!g.walker.remesh) return; for (var dx = -6; dx <= 6; dx += 6) for (var dz = -6; dz <= 6; dz += 6) g.walker.remesh(x + dx, z + dz); }
  function growAt(g, x, y, z) {
    if (!WG.growTree(g.world, x, y, z)) return false;
    remeshAround(g, x, z);
    if (WG.Sound) WG.Sound.play('place', x + 0.5, y + 0.5, z + 0.5);
    return true;
  }
  // ランダムな刻みで育つ（1 回あたり 15%）
  WG.RANDOM_TICK = WG.RANDOM_TICK || {};
  Object.keys(SAP).forEach(function (id) { WG.RANDOM_TICK[id] = function (g, x, y, z) { if (Math.random() < 0.15) growAt(g, x, y, z); }; });

  // ---------------- 植える・骨粉・皮をはぐ ----------------
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), wd = this.world;
    if (t && held && SAP[B[held.key]] != null && ITEMS[held.key] && ITEMS[held.key].block === B[held.key]) {
      var ground = wd.block(t.px, t.py - 1, t.pz), cur = wd.block(t.px, t.py, t.pz), prop = held.key === 'MANGROVE_PROPAGULE';
      var okGround = GROUND[ground] || (prop && (ground === B.CLAY || ground === B.SAND || ground === B.MANGROVE_ROOTS));
      if (!okGround || !(cur === B.AIR || (prop && WG.isWater(cur)))) return;
      wd.setBlock(t.px, t.py, t.pz, B[held.key]);
      if (this.mode === 'survival') this.inv.take(this.inv.sel, 1);
      w.remesh(t.px, t.pz);
      if (WG.Sound) WG.Sound.play('place', t.px + 0.5, t.py + 0.5, t.pz + 0.5, 'grass');
      return;
    }
    var r = place.apply(this, arguments);
    // 自分で置いた葉は枯れない
    if (t && held && isLeaf(B[held.key]) && wd.block(t.px, t.py, t.pz) === B[held.key]) (wd.placedLeaves || (wd.placedLeaves = new Set())).add(t.px + ',' + t.py + ',' + t.pz);
    return r;
  };
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), wd = this.world, surv = this.mode === 'survival';
    if (t && held && !this.spectator && !(this.mobs.target && this.mobs.target.mob)) {
      // 骨粉：45% で育つ
      if (held.key === 'BONE_MEAL' && SAP[t.id] != null) {
        this.mouseR = this.clickR = false;
        if (surv) this.inv.take(this.inv.sel, 1);
        for (var k = 0; k < 8; k++) this.particles.push({ x: t.x + Math.random(), y: t.y + Math.random() * 0.8, z: t.z + Math.random(), vx: 0, vy: 0.02, vz: 0, life: 20, c: [130, 210, 100], smoke: true, sz: 0.05 });
        if (Math.random() < 0.45 || this.mode === 'creative') growAt(this, t.x, t.y, t.z);
        return;
      }
      // 斧で皮をはぐ
      if (/_AXE$/.test(held.key) && STRIP[t.id] != null) {
        this.mouseR = this.clickR = false;
        wd.setBlock(t.x, t.y, t.z, STRIP[t.id]);
        w.remesh(t.x, t.z);
        var col = WG.skinColor ? WG.skinColor(STRIP[t.id], 'side') : [180, 140, 90];
        for (k = 0; k < 10; k++) this.particles.push({ x: t.x + Math.random(), y: t.y + Math.random(), z: t.z + Math.random(), vx: (Math.random() - 0.5) * 0.1, vy: 0.08, vz: (Math.random() - 0.5) * 0.1, life: 16, c: col, sz: 0.05 });
        if (WG.Sound) WG.Sound.play('break', t.x + 0.5, t.y + 0.5, t.z + 0.5, 'wood');
        if (surv && this.wearItem) this.wearItem(this.inv.sel, 1);
        return;
      }
    }
    return use.apply(this, arguments);
  };

  // ---------------- 葉から苗木・葉が枯れる ----------------
  function leafDrops(g, x, y, z, id) {
    var key = keyOf(id), type = LEAF_SAP[key];
    if (!type) return;
    if (Math.random() < (type === 'JUNGLE' ? 0.025 : 0.05)) g.spawnItem(SAP_KEY[type], 1, x + 0.5, y + 0.4, z + 0.5, 0.1, 10);
    if ((type === 'DARK_OAK') && Math.random() < 0.005) g.spawnItem('APPLE', 1, x + 0.5, y + 0.4, z + 0.5, 0.1, 10);
  }
  var breakBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z), held = this.inv.held();
    var r = breakBlock.apply(this, arguments);
    if (wd.block(x, y, z) === id) return r;
    if (isLeaf(id)) {
      if (wd.placedLeaves) wd.placedLeaves.delete(x + ',' + y + ',' + z);
      if (this.mode === 'survival' && !(held && held.key === 'SHEARS')) leafDrops(this, x, y, z, id);
    }
    if (isLog(id)) this.queueLeafDecay(x, y, z);
    return r;
  };
  Game.prototype.queueLeafDecay = function (x, y, z) {
    var wd = this.world, q = this.decayQ || (this.decayQ = []), now = this.tickCount || 0;
    for (var dx = -5; dx <= 5; dx++) for (var dy = -5; dy <= 5; dy++) for (var dz = -5; dz <= 5; dz++) {
      if (isLeaf(wd.block(x + dx, y + dy, z + dz))) q.push({ x: x + dx, y: y + dy, z: z + dz, t: now + 10 + Math.floor(Math.random() * 90) });
    }
  };
  // 原木までの道（葉か原木を通って 6 マス以内）があるか
  function supported(wd, x, y, z) {
    var seen = new Set([x + ',' + y + ',' + z]), cur = [[x, y, z]];
    for (var d = 0; d < 6; d++) {
      var next = [];
      for (var i = 0; i < cur.length; i++) {
        var p = cur[i];
        for (var n = 0; n < 6; n++) {
          var nx = p[0] + (n === 0 ? 1 : n === 1 ? -1 : 0), ny = p[1] + (n === 2 ? 1 : n === 3 ? -1 : 0), nz = p[2] + (n === 4 ? 1 : n === 5 ? -1 : 0), k = nx + ',' + ny + ',' + nz;
          if (seen.has(k)) continue;
          seen.add(k);
          var id = wd.block(nx, ny, nz);
          if (isLog(id)) return true;
          if (isLeaf(id)) next.push([nx, ny, nz]);
        }
      }
      cur = next;
      if (!cur.length) break;
    }
    return false;
  }
  WG.leafSupported = supported;
  var tick = Game.prototype.tick;
  Game.prototype.tick = function () {
    var r = tick.apply(this, arguments), q = this.decayQ;
    if (!q || !q.length) return r;
    var wd = this.world, now = this.tickCount || 0, keep = [], done = 0, self = this;
    for (var i = 0; i < q.length; i++) {
      var e = q[i];
      if (e.t > now || done >= 10) { keep.push(e); continue; }
      done++;
      var id = wd.block(e.x, e.y, e.z);
      if (!isLeaf(id) || (wd.placedLeaves && wd.placedLeaves.has(e.x + ',' + e.y + ',' + e.z)) || supported(wd, e.x, e.y, e.z)) continue;
      wd.setBlock(e.x, e.y, e.z, B.AIR);
      leafDrops(this, e.x, e.y, e.z, id);
      if (id === B.OAK_LEAVES && Math.random() < 0.005) this.spawnItem('APPLE', 1, e.x + 0.5, e.y + 0.4, e.z + 0.5, 0.1, 10);
      var c = WG.skinColor ? WG.skinColor(id, 'side') : [80, 120, 50];
      for (var k = 0; k < 4; k++) this.particles.push({ x: e.x + Math.random(), y: e.y + Math.random(), z: e.z + Math.random(), vx: (Math.random() - 0.5) * 0.04, vy: -0.02, vz: (Math.random() - 0.5) * 0.04, life: 24, c: c, fw: true, sz: 0.05 });
      if (this.walker.remesh) this.walker.remesh(e.x, e.z);
      void self;
    }
    this.decayQ = keep;
    return r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
