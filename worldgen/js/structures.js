// 第 6 回：構造物。要塞（エンドポータル）・海底神殿・ジャングルの寺院・難破船・森の洋館（地上）、
// ネザー要塞（橋・廊下・部屋・階段）とピグリンの砦（ネザー）、エンドシティと果ての船（エンド）。
// 区画ごとに「場所（安い計算）」を決め、チャンクにかかるときだけ全体の形（ブロックの一覧）を作ってチャンクごとに書き込む。
// 場所とシードだけで決まるので、生成の順番を変えても同じ。チェストの中身・スポナー・額縁・生き物は、チャンクを初めて読み込んだときに置く。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Mobs = WG.Mobs, hash = WG.hash, rnd = WG.rnd;
  var SEA = 63, SALT = 640;
  var DV = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  function dirName(x, z) { return x > 0 ? 'E' : x < 0 ? 'W' : z > 0 ? 'S' : 'N'; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------------- アイテム ----------------
  ITEMS.ENDER_EYE = { key: 'ENDER_EYE', name: '影の目', block: -1, max: 64, shape: 'lump', color: '#3a8a6a' };
  Craft.SHAPELESS.push([['SHADOW_PEARL', 'BLAZE_POWDER'], 'ENDER_EYE', 1], [['PURPUR_BLOCK'], 'PURPUR_PILLAR', 1], [['STONE_BRICKS', 'MOSSY_COBBLESTONE'], 'MOSSY_STONE_BRICKS', 2]);
  Craft.SHAPED.push([['SS', 'SS'], { S: 'PRISMARINE_SHARD' }, 'PRISMARINE', 1], [['SSS', 'SSS', 'SSS'], { S: 'PRISMARINE_SHARD' }, 'PRISMARINE_BRICKS', 1],
    [['SSS', 'SBS', 'SSS'], { S: 'PRISMARINE_SHARD', B: 'BLACK_DYE' }, 'DARK_PRISMARINE', 1], [['SGS', 'GGG', 'SGS'], { S: 'PRISMARINE_SHARD', G: 'GLOWSTONE_DUST' }, 'SEA_LANTERN', 1],
    [['CC', 'CC'], { C: 'CHORUS_FRUIT' }, 'PURPUR_BLOCK', 4], [['EE', 'EE'], { E: 'END_STONE' }, 'END_STONE_BRICKS', 4], [['R', 'C'], { R: 'BLAZE_ROD', C: 'CHORUS_FRUIT' }, 'END_ROD', 4],
    [['S', 'S'], { S: 'STONE_BRICK_SLAB' }, 'CHISELED_STONE_BRICKS', 1], [['BB', 'BB'], { B: 'BLACKSTONE' }, 'POLISHED_BLACKSTONE_BRICKS', 4],
    [['NBN', 'NBN'], { N: 'NETHER_BRICKS', B: 'NETHER_BRICK' }, 'NETHER_BRICK_FENCE', 6]);
  Craft.SHAPELESS.push([['DARK_OAK_LOG'], 'DARK_OAK_PLANKS', 4]);
  Craft.SMELT.STONE_BRICKS = 'CRACKED_STONE_BRICKS';
  if (Craft.GROUPS) { Craft.GROUPS.PLANKS.push('DARK_OAK_PLANKS'); Craft.GROUPS.LOGS.push('DARK_OAK_LOG'); }
  Craft.FUEL.DARK_OAK_PLANKS = Craft.FUEL.DARK_OAK_LOG = 300;

  // ---------------- 形の一覧（チャンクごとに分けて持つ） ----------------
  function Plan(minY, maxY, kind) {
    this.minY = minY; this.maxY = maxY; this.kind = kind; this.vox = new Map(); this.fnd = new Map();
    this.loot = {}; this.spawners = {}; this.mobs = []; this.frames = []; this.disp = []; this.floor = [];
  }
  Plan.prototype.set = function (x, y, z, id) {
    if (typeof id === 'string') id = B[id];
    if (id == null || id < 0 || y <= this.minY || y >= this.maxY) return;
    var ck = (x >> 4) + ',' + (z >> 4), m = this.vox.get(ck);
    if (!m) this.vox.set(ck, m = new Map());
    m.set(((y - this.minY) << 8) | ((z & 15) << 4) | (x & 15), id);
  };
  Plan.prototype.fill = function (x0, y0, z0, x1, y1, z1, id) {
    var t;
    if (x0 > x1) { t = x0; x0 = x1; x1 = t; } if (y0 > y1) { t = y0; y0 = y1; y1 = t; } if (z0 > z1) { t = z0; z0 = z1; z1 = t; }
    var fn = typeof id === 'function';
    for (var y = y0; y <= y1; y++) for (var z = z0; z <= z1; z++) for (var x = x0; x <= x1; x++) this.set(x, y, z, fn ? id(x, y, z) : id);
  };
  // 箱：外側を wall、内側を inner（null なら触らない）
  Plan.prototype.box = function (x0, y0, z0, x1, y1, z1, wall, inner) {
    this.fill(x0, y0, z0, x1, y1, z1, wall);
    if (inner != null) this.fill(x0 + 1, y0 + 1, z0 + 1, x1 - 1, y1 - 1, z1 - 1, inner);
  };
  // 土台：y から下へ、固いブロックに当たるまで（チャンクに書くときに地形を見て決める）
  Plan.prototype.found = function (x, y, z, id) {
    var ck = (x >> 4) + ',' + (z >> 4), l = this.fnd.get(ck);
    if (!l) this.fnd.set(ck, l = []);
    l.push([x & 15, z & 15, y, typeof id === 'string' ? B[id] : id]);
  };
  Plan.prototype.chest = function (x, y, z, table) { this.set(x, y, z, B.CHEST); this.loot[x + ',' + y + ',' + z] = table; };
  Plan.prototype.spawner = function (x, y, z, type) { this.set(x, y, z, B.SPAWNER); this.spawners[x + ',' + y + ',' + z] = type; };
  Plan.prototype.mob = function (type, x, y, z, extra) { this.mobs.push([type, x, y, z, extra || null]); };
  // 壁 (x-dx, z-dz) に付いた、向き (dx, dz) のトーチ・はしご・つる・額縁
  Plan.prototype.torch = function (x, y, z, dx, dz) { this.set(x, y, z, B['WALL_TORCH_' + dirName(dx, dz)]); };
  Plan.prototype.ladder = function (x, y, z, dx, dz) { this.set(x, y, z, B['LADDER_' + dirName(dx, dz)]); };
  var STOP = null;
  Plan.prototype.draw = function (blocks, cx, cz) {
    if (!STOP) { STOP = new Uint8Array(WG.BLOCKS.length); WG.BLOCKS.forEach(function (b) { STOP[b.id] = WG.COLLIDE[b.id] >= 1 && WG.OPAQUE[b.id] && !/LEAVES|_LOG$/.test(b.key) ? 1 : 0; }); }
    var ck = cx + ',' + cz, m = this.vox.get(ck), f = this.fnd.get(ck), minY = this.minY;
    // 水の中の草（昆布・海草・サンゴ）を払う範囲 [x0, z0, x1, z1, y0, y1]
    var cz0 = this.clear;
    if (cz0) for (var x = Math.max(cz0[0], cx << 4); x <= Math.min(cz0[2], (cx << 4) + 15); x++) for (var z = Math.max(cz0[1], cz << 4); z <= Math.min(cz0[3], (cz << 4) + 15); z++)
      for (var y = cz0[4]; y <= cz0[5]; y++) { var ii = ((y - minY) << 8) | ((z & 15) << 4) | (x & 15); if (WG.isWaterPlant(blocks[ii])) blocks[ii] = B.WATER; }
    if (m) m.forEach(function (id, i) { if (blocks[i] !== B.BEDROCK) blocks[i] = id; });
    if (f) f.forEach(function (e) {
      for (var y = e[2], n = 0; y > minY + 1 && n < 64; y--, n++) {
        var i = ((y - minY) << 8) | (e[1] << 4) | e[0];
        if (STOP[blocks[i]]) break;
        blocks[i] = e[3];
      }
    });
  };
  Plan.prototype.inChunk = function (x, z, cx, cz) { return (x >> 4) === cx && (z >> 4) === cz; };

  // ---------------- 区画と場所 ----------------
  var SPECS = [];
  function spec(o) { SPECS.push(o); return o; }
  function cacheOf(gen) { if (!gen._st6 || gen._st6.size > 600) gen._st6 = new Map(); return gen._st6; }
  function headOf(gen, sp, rx, rz) {
    var c = cacheOf(gen), k = sp.key + rx + ',' + rz;
    if (c.has(k)) return c.get(k);
    var h = sp.head(gen, rx, rz);
    if (h) { h.spec = sp; h.rx = rx; h.rz = rz; }
    c.set(k, h);
    return h;
  }
  function planOf(gen, h) { if (!h.plan) h.plan = h.spec.build(gen, h); return h.plan; }
  function plansNear(gen, dim, x0, z0, skipUnder) {
    var out = [];
    SPECS.forEach(function (sp) {
      if (sp.dim !== dim || (skipUnder && sp.under)) return;
      for (var rz = Math.floor((z0 - sp.reach) / sp.size); rz <= Math.floor((z0 + 15 + sp.reach) / sp.size); rz++)
        for (var rx = Math.floor((x0 - sp.reach) / sp.size); rx <= Math.floor((x0 + 15 + sp.reach) / sp.size); rx++) {
          var h = headOf(gen, sp, rx, rz);
          if (h && h.x1 >= x0 && h.x0 <= x0 + 15 && h.z1 >= z0 && h.z0 <= z0 + 15) out.push(planOf(gen, h));
        }
    });
    return out;
  }
  function bbox(h, r) { h.x0 = h.x - r; h.x1 = h.x + r; h.z0 = h.z - r; h.z1 = h.z + r; return h; }
  function biomeKey(gen, x, z) { return WG.BIOMES[gen.column(x, z).b].key; }
  function flat(gen, x, z, rx, rz, tol) {
    var h = gen.column(x, z).h;
    return [[-rx, -rz], [rx, -rz], [-rx, rz], [rx, rz]].every(function (q) { return Math.abs(gen.column(x + q[0], z + q[1]).h - h) <= tol; });
  }
  WG.structuresNear = function (wd, x, z) { return wd.gen ? plansNear(wd.gen, wd.dimKey, x & ~15, z & ~15, false) : []; };

  // ---------------- 要塞（地下。5×5 の部屋の格子を木の形につなぎ、いちばん奥にエンドポータルの部屋） ----------------
  var PITCH = 15;
  var STRONGHOLD = spec({ key: 'sh', dim: 'overworld', size: 640, reach: 48, under: true,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 1) >= 0.8) return null;
      var x = rx * 640 + 160 + (hash(s, rx, 1, rz, SALT + 1) % 320), z = rz * 640 + 160 + (hash(s, rx, 2, rz, SALT + 1) % 320);
      var y = Math.max(-48, Math.min(gen.column(x, z).h - 30, -30 + (hash(s, rx, 3, rz, SALT + 1) % 34)));
      return bbox({ x: x, z: z, y: y }, 40);
    },
    build: function (gen, h) {
      var P = new Plan(-64, 320, 'stronghold'), R = rng(hash(gen.seed, h.rx, 4, h.rz, SALT + 1)), seed = gen.seed;
      var ox = h.x - 37, oz = h.z - 37, y0 = h.y;
      var SB = function (x, y, z) { var v = hash(seed, x, y, z, SALT + 2) % 20; return v < 3 ? B.MOSSY_STONE_BRICKS : v < 6 ? B.CRACKED_STONE_BRICKS : B.STONE_BRICKS; };
      // 部屋の木
      var cells = { '2,2': { i: 2, j: 2, d: 0, links: {} } }, list = [cells['2,2']];
      for (var guard = 0; list.length < 11 && guard < 400; guard++) {
        var c0 = list[Math.floor(R() * list.length)], dk = 'NESW'[Math.floor(R() * 4)], v = DV[dk], ni = c0.i + v[0], nj = c0.j + v[1];
        if (ni < 0 || nj < 0 || ni > 4 || nj > 4 || cells[ni + ',' + nj]) continue;
        var c1 = { i: ni, j: nj, d: c0.d + 1, links: {} };
        c0.links[dk] = 1; c1.links[{ N: 'S', S: 'N', E: 'W', W: 'E' }[dk]] = 1;
        cells[ni + ',' + nj] = c1; list.push(c1);
      }
      var portal = list.reduce(function (a, b) { return b.d > a.d ? b : a; });
      var kinds = ['library', 'fountain', 'prison', 'store', 'library', 'prison'];
      list.forEach(function (c) { c.type = c === portal ? 'portal' : c === list[0] ? 'hall' : kinds.length && R() < 0.7 ? kinds.shift() : 'hall'; });
      list.forEach(function (c) {
        var bx = ox + c.i * PITCH, bz = oz + c.j * PITCH, H = c.type === 'library' ? 10 : c.type === 'portal' ? 9 : c.type === 'fountain' ? 7 : 6;
        var L = function (x, y, z, id) { P.set(bx + x, y0 + y, bz + z, id); };
        var LF = function (x0, y0b, z0, x1, y1, z1, id) { P.fill(bx + x0, y0 + y0b, bz + z0, bx + x1, y0 + y1, bz + z1, id); };
        P.box(bx, y0, bz, bx + 12, y0 + H, bz + 12, SB, B.AIR);
        if (c.type === 'hall') {
          [[3, 3], [9, 3], [3, 9], [9, 9]].forEach(function (q) { LF(q[0], 1, q[1], q[0], H - 1, q[1], SB); L(q[0] + (q[0] < 6 ? 1 : -1), 3, q[1], B['WALL_TORCH_' + (q[0] < 6 ? 'E' : 'W')]); });
          if (R() < 0.4) P.chest(bx + 6, y0 + 1, bz + 6, 'stronghold');
          for (var k = 0; k < 6; k++) if (R() < 0.5) L(1 + Math.floor(R() * 11), H - 1, 1 + Math.floor(R() * 11), B.COBWEB);
        } else if (c.type === 'library') {
          for (var yy = 1; yy <= 8; yy++) for (var t = 1; t <= 11; t++) { L(1, yy, t, B.BOOKSHELF); L(11, yy, t, B.BOOKSHELF); L(t, yy, 1, B.BOOKSHELF); L(t, yy, 11, B.BOOKSHELF); }
          for (t = 3; t <= 9; t++) for (yy = 1; yy <= 3; yy++) { L(t, yy, 4, B.BOOKSHELF); L(t, yy, 8, B.BOOKSHELF); }
          // 2 階の回廊（板材の床と柵）
          for (var a = 1; a <= 11; a++) for (var b = 1; b <= 11; b++) if (a <= 2 || a >= 10 || b <= 2 || b >= 10) L(a, 5, b, B.OAK_PLANKS);
          for (t = 3; t <= 9; t++) { L(t, 6, 3, B.OAK_FENCE); L(t, 6, 9, B.OAK_FENCE); L(3, 6, t, B.OAK_FENCE); L(9, 6, t, B.OAK_FENCE); }
          for (a = 3; a <= 9; a++) for (b = 3; b <= 9; b++) if (a === 3 || a === 9 || b === 3 || b === 9) L(a, 5, b, B.OAK_PLANKS);
          for (yy = 1; yy <= 4; yy++) L(2, yy, 6, B.BOOKSHELF);
          for (yy = 1; yy <= 5; yy++) L(3, yy, 6, B.LADDER_E);
          L(3, 6, 6, B.AIR);
          LF(6, 7, 6, 6, 9, 6, B.OAK_FENCE); L(6, 6, 6, B.LANTERN);
          P.chest(bx + 10, y0 + 6, bz + 10, 'library'); P.chest(bx + 6, y0 + 1, bz + 2, 'library');
          for (k = 0; k < 10; k++) if (R() < 0.6) L(2 + Math.floor(R() * 9), 7 + Math.floor(R() * 2), 2 + Math.floor(R() * 9), B.COBWEB);
        } else if (c.type === 'fountain') {
          for (a = 3; a <= 9; a++) for (b = 3; b <= 9; b++) L(a, 1, b, a === 3 || a === 9 || b === 3 || b === 9 ? B.STONE_BRICK_SLAB : B.WATER);
          LF(6, 1, 6, 6, 4, 6, SB); L(6, 5, 6, B.WATER);
          [[1, 6, 'E'], [11, 6, 'W'], [6, 1, 'S'], [6, 11, 'N']].forEach(function (q) { L(q[0], 4, q[1], B['WALL_TORCH_' + q[2]]); });
        } else if (c.type === 'prison') {
          [1, 7].forEach(function (z0) {
            var front = z0 === 1 ? 4 : 7, back = z0 === 1 ? 1 : 11;
            for (var x = 1; x <= 11; x++) for (var y = 1; y <= 4; y++) L(x, y, front, x % 4 === 0 ? SB(bx + x, y0 + y, bz + front) : B.IRON_BARS);
            [4, 8].forEach(function (x) { LF(x, 1, Math.min(front, back), x, 4, Math.max(front, back), SB); });
            [2, 6, 10].forEach(function (x) { L(x, 1, front, B['IRON_DOOR_' + (z0 === 1 ? 'S' : 'N') + 'CL']); L(x, 2, front, B['IRON_DOOR_' + (z0 === 1 ? 'S' : 'N') + 'CU']); });
          });
          L(1, 3, 6, B.WALL_TORCH_E); L(11, 3, 6, B.WALL_TORCH_W);
          for (k = 0; k < 5; k++) L(1 + Math.floor(R() * 11), 4, R() < 0.5 ? 2 : 10, B.COBWEB);
        } else if (c.type === 'store') {
          P.chest(bx + 2, y0 + 1, bz + 2, 'stronghold'); P.chest(bx + 10, y0 + 1, bz + 10, 'stronghold');
          L(2, 1, 10, B.CRAFTING_TABLE); L(10, 1, 2, B.FURNACE); L(6, 4, 1, B.WALL_TORCH_S); L(6, 4, 11, B.WALL_TORCH_N);
        } else if (c.type === 'portal') {
          // 台と溶岩、12 個のフレーム、階段とスポナー
          LF(3, 1, 3, 9, 2, 9, SB);
          LF(5, 2, 5, 7, 2, 7, B.LAVA);
          var ringPos = [];
          for (t = 5; t <= 7; t++) ringPos.push([t, 4, 'S'], [t, 8, 'N'], [4, t, 'E'], [8, t, 'W']);
          ringPos.forEach(function (q) { L(q[0], 3, q[1], hash(seed, bx + q[0], y0, bz + q[1], SALT + 3) % 10 === 0 ? B.END_PORTAL_FRAME_EYE : B.END_PORTAL_FRAME); });
          for (t = 5; t <= 7; t++) { L(t, 2, 9, B.STONE_BRICK_STAIRS_N); L(t, 1, 10, B.STONE_BRICK_STAIRS_N); }
          P.spawner(bx + 3, y0 + 3, bz + 9, 'CAVE_SPIDER');
          [[1, 3, 'E'], [1, 9, 'E'], [11, 3, 'W'], [11, 9, 'W']].forEach(function (q) { L(q[0], 5, q[1], B['WALL_TORCH_' + q[2]]); });
          h.portal = [bx + 6, y0 + 3, bz + 6];
        }
      });
      // 部屋どうしをつなぐ廊下（幅 3・高さ 3）と、入口の上の飾り
      list.forEach(function (c) {
        var bx = ox + c.i * PITCH, bz = oz + c.j * PITCH;
        if (c.links.E) {
          P.fill(bx + 12, y0, bz + 4, bx + 15, y0 + 4, bz + 8, SB); P.fill(bx + 12, y0 + 1, bz + 5, bx + 15, y0 + 3, bz + 7, B.AIR);
          P.set(bx + 13, y0 + 3, bz + 5, B.WALL_TORCH_S); P.set(bx + 12, y0 + 4, bz + 6, B.CHISELED_STONE_BRICKS); P.set(bx + 15, y0 + 4, bz + 6, B.CHISELED_STONE_BRICKS);
        }
        if (c.links.S) {
          P.fill(bx + 4, y0, bz + 12, bx + 8, y0 + 4, bz + 15, SB); P.fill(bx + 5, y0 + 1, bz + 12, bx + 7, y0 + 3, bz + 15, B.AIR);
          P.set(bx + 5, y0 + 3, bz + 13, B.WALL_TORCH_E); P.set(bx + 6, y0 + 4, bz + 12, B.CHISELED_STONE_BRICKS); P.set(bx + 6, y0 + 4, bz + 15, B.CHISELED_STONE_BRICKS);
        }
      });
      P.portal = h.portal;
      return P;
    } });
  // いちばん近い要塞（影の目が向かう先）
  WG.nearestStronghold = function (gen, x, z) {
    var best = null, rx0 = Math.floor(x / 640), rz0 = Math.floor(z / 640);
    for (var rz = rz0 - 3; rz <= rz0 + 3; rz++) for (var rx = rx0 - 3; rx <= rx0 + 3; rx++) {
      var h = headOf(gen, STRONGHOLD, rx, rz);
      if (h && (!best || Math.hypot(h.x - x, h.z - z) < Math.hypot(best.x - x, best.z - z))) best = h;
    }
    return best;
  };

  // ---------------- 海底神殿（深い海。海晶の 3 段の神殿、両翼の塔、真ん中に金ブロック 8 個） ----------------
  spec({ key: 'om', dim: 'overworld', size: 576, reach: 46,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 10) >= 0.6) return null;
      for (var tr = 0; tr < 6; tr++) {
        var x = rx * 576 + 64 + (hash(s, rx, 1 + tr, rz, SALT + 10) % 448), z = rz * 576 + 64 + (hash(s, rx, 9 + tr, rz, SALT + 10) % 448);
        var c = gen.column(x, z);
        if (!/^(ocean|deep_ocean|warm_ocean|cold_ocean)$/.test(WG.BIOMES[c.b].key) || c.h > SEA - 14) continue;
        if ([[-22, -22], [22, -22], [-22, 22], [22, 22]].every(function (q) { var cc = gen.column(x + q[0], z + q[1]); return cc.h <= SEA - 8 && /^(ocean|deep_ocean|warm_ocean|cold_ocean)$/.test(WG.BIOMES[cc.b].key); })) return bbox({ x: x, z: z, y: SEA - 24 }, 44);
      }
      return null;
    },
    build: function (gen, h) {
      var P = new Plan(-64, 320, 'monument'), cx = h.x, cz = h.z, yb = h.y, W = B.WATER, PR = B.PRISMARINE, PB = B.PRISMARINE_BRICKS, D = B.DARK_PRISMARINE, L = B.SEA_LANTERN;
      var R = rng(hash(gen.seed, h.rx, 3, h.rz, SALT + 10));
      P.clear = [cx - 44, cz - 44, cx + 44, cz + 44, yb - 30, SEA];
      var tier = function (r, y0, y1, wall, roof) {
        P.fill(cx - r, y0, cz - r, cx + r, y1, cz + r, wall);
        P.fill(cx - r + 1, y0, cz - r + 1, cx + r - 1, y1 - 1, cz + r - 1, W);
        P.fill(cx - r, y1, cz - r, cx + r, y1, cz + r, roof);
        for (var t = -r; t <= r; t++) { P.set(cx + t, y1, cz - r, D); P.set(cx + t, y1, cz + r, D); P.set(cx - r, y1, cz + t, D); P.set(cx + r, y1, cz + t, D); }
        [[-r, -r], [r, -r], [-r, r], [r, r]].forEach(function (q) { P.set(cx + q[0], y1, cz + q[1], L); });
      };
      // まわりの海底を掘り下げる（建物の周りは土台の高さまで、外へ行くほどなだらかに）
      for (var qx = -34; qx <= 34; qx++) for (var qz = -34; qz <= 34; qz++) {
        var dd = Math.max(Math.abs(qx), Math.abs(qz)), bot = dd <= 24 ? yb + 1 : yb + 1 + Math.round((dd - 24) * 1.6);
        for (var qy = bot; qy < SEA; qy++) P.set(cx + qx, qy, cz + qz, W);
      }
      // 土台と脚
      P.fill(cx - 22, yb, cz - 22, cx + 22, yb, cz + 22, PB);
      [-20, 0, 20].forEach(function (a) { [-20, 0, 20].forEach(function (b) { for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) P.found(cx + a + dx, yb - 1, cz + b + dz, PB); }); });
      // 1 階（広い本体）
      tier(22, yb + 1, yb + 8, PR, PB);
      for (var t = -22; t <= 22; t++) if (t % 4 === 0) for (var y = yb + 1; y <= yb + 7; y++) { P.set(cx + t, y, cz - 22, D); P.set(cx + t, y, cz + 22, D); P.set(cx - 22, y, cz + t, D); P.set(cx + 22, y, cz + t, D); }
      for (t = -16; t <= 16; t += 8) { P.set(cx + t, yb + 4, cz - 22, L); P.set(cx + t, yb + 4, cz + 22, L); P.set(cx - 22, yb + 4, cz + t, L); P.set(cx + 22, yb + 4, cz + t, L); }
      // 中の壁と柱
      for (t = -12; t <= 12; t++) for (y = yb + 1; y <= yb + 7; y++) {
        var open = Math.abs(t) <= 1 && y <= yb + 3;
        if (!open) { P.set(cx + t, y, cz - 12, PB); P.set(cx + t, y, cz + 12, PB); P.set(cx - 12, y, cz + t, PB); P.set(cx + 12, y, cz + t, PB); }
      }
      [[-6, -6], [6, -6], [-6, 6], [6, 6], [-17, -17], [17, -17], [-17, 17], [17, 17], [-17, 0], [17, 0], [0, 17]].forEach(function (q) {
        P.fill(cx + q[0], yb + 1, cz + q[1], cx + q[0], yb + 7, cz + q[1], D); P.set(cx + q[0], yb + 4, cz + q[1], L);
      });
      // 入口（北）
      P.fill(cx - 3, yb + 1, cz - 22, cx + 3, yb + 5, cz - 22, W);
      P.fill(cx - 4, yb + 1, cz - 23, cx - 4, yb + 6, cz - 23, D); P.fill(cx + 4, yb + 1, cz - 23, cx + 4, yb + 6, cz - 23, D); P.fill(cx - 4, yb + 6, cz - 23, cx + 4, yb + 6, cz - 23, D);
      P.set(cx, yb + 7, cz - 23, L);
      // 両翼の塔
      [-1, 1].forEach(function (s) {
        var x0 = cx + s * 14, x1 = cx + s * 22;
        P.fill(x0, yb + 9, cz + 6, x1, yb + 15, cz + 22, PB);
        P.fill(Math.min(x0, x1) + 1, yb + 9, cz + 7, Math.max(x0, x1) - 1, yb + 14, cz + 21, W);
        P.fill(x0, yb + 15, cz + 6, x1, yb + 15, cz + 22, D);
        P.set(cx + s * 18, yb + 16, cz + 14, L); P.set(cx + s * 18, yb + 16, cz + 10, D); P.set(cx + s * 18, yb + 16, cz + 18, D);
        [[x0, cz + 6], [x1, cz + 6], [x0, cz + 22], [x1, cz + 22]].forEach(function (q) { P.set(q[0], yb + 15, q[1], L); });
        for (var yy = yb + 10; yy <= yb + 13; yy += 3) { P.set(cx + s * 22, yy, cz + 14, L); P.set(cx + s * 18, yy, cz + 22, L); }
      });
      // 真ん中の 3 段
      tier(12, yb + 9, yb + 13, PB, PR);
      tier(8, yb + 14, yb + 17, PR, PB);
      tier(4, yb + 18, yb + 21, PB, D);
      P.set(cx, yb + 22, cz, L);
      P.fill(cx - 1, yb + 8, cz - 1, cx + 1, yb + 8, cz + 1, W);
      // 金ブロックの部屋（暗い海晶で包む）
      P.fill(cx - 2, yb + 14, cz - 2, cx + 1, yb + 17, cz + 1, D);
      P.fill(cx - 1, yb + 15, cz - 1, cx, yb + 16, cz, B.GOLD_BLOCK);
      // 目玉魚（ガーディアンにあたる）
      for (var k = 0; k < 9; k++) P.mob('EYE_FISH', cx - 26 + R() * 52, yb + 2 + R() * 18, cz - 26 + R() * 52);
      for (k = 0; k < 60; k++) P.floor.push([cx - 28 + Math.floor(R() * 56), yb + 2 + Math.floor(R() * 20), cz - 28 + Math.floor(R() * 56)]);
      return P;
    } });

  // ---------------- ジャングルの寺院（苔むした丸石の 2 階建て。地下に 3 つのレバーとチェスト、矢の罠） ----------------
  spec({ key: 'jt', dim: 'overworld', size: 320, reach: 12,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 20) >= 0.7) return null;
      for (var tr = 0; tr < 8; tr++) {
        var x = rx * 320 + 24 + (hash(s, rx, 1 + tr, rz, SALT + 20) % 272), z = rz * 320 + 24 + (hash(s, rx, 11 + tr, rz, SALT + 20) % 272);
        if (biomeKey(gen, x, z) === 'jungle' && gen.column(x, z).h > SEA + 1 && flat(gen, x, z, 6, 7, 4)) return bbox({ x: x, z: z, y: gen.column(x, z).h }, 10);
      }
      return null;
    },
    build: function (gen, h) {
      var P = new Plan(-64, 320, 'jungle'), seed = gen.seed, g = h.y, ox = h.x - 6, oz = h.z - 7;
      var C = function (x, y, z) { return hash(seed, x, y, z, SALT + 21) % 5 < 2 ? B.MOSSY_COBBLESTONE : B.COBBLESTONE; };
      P.fill(ox - 1, g + 1, oz - 1, ox + 12, g + 18, oz + 15, B.AIR);
      P.fill(ox, g - 5, oz, ox + 11, g + 5, oz + 14, C);
      for (var x = ox; x <= ox + 11; x++) { P.found(x, g - 6, oz, C(x, 0, oz)); P.found(x, g - 6, oz + 14, C(x, 0, oz + 14)); }
      for (var z = oz; z <= oz + 14; z++) { P.found(ox, g - 6, z, B.COBBLESTONE); P.found(ox + 11, g - 6, z, B.COBBLESTONE); }
      P.fill(ox + 1, g - 4, oz + 1, ox + 10, g - 1, oz + 13, B.AIR);
      P.fill(ox + 1, g + 1, oz + 1, ox + 10, g + 4, oz + 13, B.AIR);
      // 入口と、前の段
      P.fill(ox + 5, g + 1, oz, ox + 6, g + 3, oz, B.AIR);
      P.set(ox + 5, g + 4, oz, B.CHISELED_STONE_BRICKS); P.set(ox + 6, g + 4, oz, B.CHISELED_STONE_BRICKS);
      P.set(ox + 5, g, oz - 1, B.COBBLESTONE_STAIRS_S); P.set(ox + 6, g, oz - 1, B.COBBLESTONE_STAIRS_S);
      // 1 階の柱と窓
      [[3, 4], [8, 4], [3, 9], [8, 9]].forEach(function (q) { P.fill(ox + q[0], g + 1, oz + q[1], ox + q[0], g + 4, oz + q[1], B.CHISELED_STONE_BRICKS); });
      [4, 7, 10].forEach(function (t) { P.set(ox, g + 2, oz + t, B.AIR); P.set(ox + 11, g + 2, oz + t, B.AIR); });
      P.set(ox + 4, g + 3, oz + 4, B.WALL_TORCH_E); P.set(ox + 7, g + 3, oz + 4, B.WALL_TORCH_W);
      // 地下への階段（南へ下る）
      for (var k = 0; k <= 4; k++) {
        for (x = ox + 9; x <= ox + 10; x++) { P.set(x, g - k, oz + 8 + k, B.COBBLESTONE_STAIRS_N); for (var yy = g - k + 1; yy <= g; yy++) P.set(x, yy, oz + 8 + k, B.AIR); }
      }
      // 2 階（はしごで上る）
      P.fill(ox + 1, g + 5, oz + 1, ox + 10, g + 10, oz + 13, C);
      P.fill(ox + 2, g + 6, oz + 2, ox + 9, g + 9, oz + 12, B.AIR);
      P.fill(ox + 1, g + 1, oz + 12, ox + 1, g + 4, oz + 12, C);
      for (yy = g + 1; yy <= g + 5; yy++) P.set(ox + 2, yy, oz + 12, B.LADDER_E);
      [3, 6, 9].forEach(function (t) { P.set(ox + 1, g + 7, oz + t + 1, B.AIR); P.set(ox + 10, g + 7, oz + t + 1, B.AIR); });
      P.chest(ox + 8, g + 6, oz + 11, 'jungle');
      P.set(ox + 5, g + 8, oz + 2, B.WALL_TORCH_S);
      // 屋根（段々）
      P.fill(ox + 3, g + 11, oz + 3, ox + 8, g + 11, oz + 11, C);
      P.fill(ox + 4, g + 12, oz + 4, ox + 7, g + 12, oz + 10, C);
      P.fill(ox + 5, g + 13, oz + 6, ox + 6, g + 13, oz + 8, B.CHISELED_STONE_BRICKS);
      for (x = ox + 2; x <= ox + 9; x++) { P.set(x, g + 11, oz + 2, B.COBBLESTONE_STAIRS_S); P.set(x, g + 11, oz + 12, B.COBBLESTONE_STAIRS_N); }
      // 地下：3 つのレバー（飾り）と隠しチェスト、矢の罠（感圧板を踏むとディスペンサーが撃つ）
      [2, 3, 4].forEach(function (t) { P.set(ox + 1, g - 3, oz + t, B.LEVER_E); });
      P.chest(ox + 2, g - 4, oz + 1, 'jungle');
      P.set(ox + 5, g - 4, oz + 13, B.DISPENSER_N); P.disp.push([ox + 5, g - 4, oz + 13, [{ key: 'ARROW', n: 9 }]]);
      P.set(ox + 5, g - 4, oz + 12, B.STONE_PRESSURE_PLATE);
      P.chest(ox + 6, g - 4, oz + 13, 'jungle');
      P.set(ox + 1, g - 2, oz + 8, B.WALL_TORCH_E);
      // 外の壁のつる
      for (var t2 = 0; t2 < 15; t2++) {
        var hv = hash(seed, h.x, t2, h.z, SALT + 22);
        if (hv % 3 === 0) continue;
        var side = hv % 4, len = 1 + (hv >>> 4) % 4, along = (hv >>> 8) % 12;
        for (var j = 0; j < len; j++) {
          var yv = g + 4 - j;
          if (side === 0) P.set(ox - 1, yv, oz + 1 + along, B.VINE_W);
          else if (side === 1) P.set(ox + 12, yv, oz + 1 + along, B.VINE_E);
          else if (side === 2) P.set(ox + Math.min(10, along), yv, oz - 1, B.VINE_N);
          else P.set(ox + Math.min(10, along), yv, oz + 15, B.VINE_S);
        }
      }
      return P;
    } });

  // ---------------- 難破船（海の底か砂浜。船体に穴が開き、マストが折れていることも。チェスト 3 つ） ----------------
  var SHIP_WOODS = ['OAK', 'SPRUCE', 'DARK_OAK', 'BIRCH', 'JUNGLE'];
  spec({ key: 'sw', dim: 'overworld', size: 224, reach: 16,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 30) >= 0.55) return null;
      for (var tr = 0; tr < 5; tr++) {
        var x = rx * 224 + 20 + (hash(s, rx, 1 + tr, rz, SALT + 30) % 184), z = rz * 224 + 20 + (hash(s, rx, 11 + tr, rz, SALT + 30) % 184), c = gen.column(x, z), bk = WG.BIOMES[c.b].key;
        if ((/ocean$/.test(bk) && bk !== 'frozen_ocean' && c.h <= SEA - 5) || (bk === 'beach' && c.h >= SEA)) {
          var hv = hash(s, rx, 30, rz, SALT + 30);
          return bbox({ x: x, z: z, y: c.h, axis: hv & 1, flip: (hv >>> 1) & 1 ? 1 : -1, wood: SHIP_WOODS[(hv >>> 2) % 5], broken: (hv >>> 6) % 3 === 0 }, 14);
        }
      }
      return null;
    },
    build: function (gen, h) {
      var P = new Plan(-64, 320, 'ship'), seed = gen.seed, y0 = h.y, wood = h.wood;
      P.clear = [h.x - 14, h.z - 14, h.x + 14, h.z + 14, y0 - 8, SEA];
      // 沈んだ船には柵を付けない（水の中の柵は泡のように見えるため）
      var PL = B[wood + '_PLANKS'], LOG = B[wood + '_LOG'], sunk = h.y < SEA, FEN = sunk ? -1 : B[(wood === 'DARK_OAK' ? 'SPRUCE' : wood) + '_FENCE'];
      var at = function (a, c, y, id) { a *= h.flip; if (h.axis) P.set(h.x + a, y, h.z + c, id); else P.set(h.x + c, y, h.z + a, id); };
      var empty = function (y) { return y <= SEA && y >= y0 - 2 && h.y < SEA ? B.WATER : B.AIR; };
      var holey = function (a, c, y, id) { at(a, c, y, hash(seed, a + h.x, y, c + h.z, SALT + 31) % 6 === 0 ? empty(y) : id); };
      for (var a = -10; a <= 10; a++) {
        var hw = a > 4 ? Math.max(1, 3 - Math.ceil((a - 4) / 2)) : a < -8 ? 2 : 3;
        if (Math.abs(a) <= 9) at(a, 0, y0, LOG);
        for (var c = -hw; c <= hw; c++) {
          holey(a, c, y0 + 1, PL);
          for (var y = y0 + 2; y <= y0 + 3; y++) { if (Math.abs(c) === hw) holey(a, c, y, PL); else at(a, c, y, empty(y)); }
          holey(a, c, y0 + 4, Math.abs(c) === hw ? LOG : PL);
        }
        if (a === 10) for (var y2 = y0 + 2; y2 <= y0 + 5; y2++) at(a, 0, y2, LOG);
        if (a > -5 && a < 9 && a % 2 === 0) { at(a, -hw, y0 + 5, FEN); at(a, hw, y0 + 5, FEN); }
      }
      // 船尾の船室
      for (a = -10; a <= -5; a++) for (c = -2; c <= 2; c++) for (y = y0 + 5; y <= y0 + 8; y++) {
        var wall = a === -10 || a === -5 || Math.abs(c) === 2 || y === y0 + 8;
        if (wall) holey(a, c, y, y === y0 + 8 ? PL : (Math.abs(c) === 2 && y === y0 + 6 && a % 2 === 0 ? (sunk ? empty(y) : FEN) : PL)); else at(a, c, y, empty(y));
      }
      at(-5, 0, y0 + 5, empty(y0 + 5)); at(-5, 0, y0 + 6, empty(y0 + 6));
      // マスト
      var top = h.broken ? y0 + 7 : y0 + 13;
      for (y = y0 + 5; y <= top; y++) at(2, 0, y, LOG);
      if (!h.broken) for (c = -3; c <= 3; c++) at(2, c, y0 + 11, FEN);
      // チェスト
      var chest = function (a2, c2, y3, table) { var aa = a2 * h.flip; if (h.axis) P.chest(h.x + aa, y3, h.z + c2, table); else P.chest(h.x + c2, y3, h.z + aa, table); };
      chest(7, 0, y0 + 2, 'ship_supply'); chest(-3, 1, y0 + 2, 'ship_treasure'); chest(-8, 0, y0 + 5, 'ship_map');
      return P;
    } });

  // ---------------- 森の洋館（濃いオークの 2 階建て。部屋がたくさん、寄棟の屋根。略奪者が住む） ----------------
  spec({ key: 'wm', dim: 'overworld', size: 1024, reach: 34,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 40) >= 0.6) return null;
      for (var tr = 0; tr < 10; tr++) {
        var x = rx * 1024 + 64 + (hash(s, rx, 1 + tr, rz, SALT + 40) % 896), z = rz * 1024 + 64 + (hash(s, rx, 21 + tr, rz, SALT + 40) % 896), c = gen.column(x, z);
        if (biomeKey(gen, x, z) === 'forest' && c.h > SEA + 1 && flat(gen, x, z, 15, 11, 5)) return bbox({ x: x, z: z, y: c.h }, 20);
      }
      return null;
    },
    build: function (gen, h) {
      var P = new Plan(-64, 320, 'mansion'), seed = gen.seed, g = h.y, ox = h.x - 15, oz = h.z - 11, R = rng(hash(seed, h.rx, 3, h.rz, SALT + 40));
      var PL = B.DARK_OAK_PLANKS, LOG = B.DARK_OAK_LOG, IN = B.BIRCH_PLANKS;
      P.fill(ox - 3, g + 1, oz - 3, ox + 33, g + 30, oz + 25, B.AIR);
      P.fill(ox, g - 1, oz, ox + 30, g, oz + 22, B.COBBLESTONE);
      for (var x = ox; x <= ox + 30; x++) { P.found(x, g - 2, oz, B.COBBLESTONE); P.found(x, g - 2, oz + 22, B.COBBLESTONE); }
      for (var z = oz; z <= oz + 22; z++) { P.found(ox, g - 2, z, B.COBBLESTONE); P.found(ox + 30, g - 2, z, B.COBBLESTONE); }
      [0, 1].forEach(function (f) {
        var base = g + 6 * f;
        for (var x2 = ox; x2 <= ox + 30; x2++) for (var z2 = oz; z2 <= oz + 22; z2++) {
          var edge = x2 === ox || x2 === ox + 30 || z2 === oz || z2 === oz + 22;
          if (f === 1) P.set(x2, base, z2, PL);
          else if (!edge) P.set(x2, base, z2, PL);
          for (var y = base + 1; y <= base + 5; y++) {
            if (!edge) { P.set(x2, y, z2, B.AIR); continue; }
            var u = x2 === ox || x2 === ox + 30 ? z2 - oz : x2 - ox, post = u % 6 === 0;
            var win = !post && u % 6 >= 2 && u % 6 <= 4 && y >= base + 2 && y <= base + 4;
            P.set(x2, y, z2, post ? LOG : win ? B.GLASS_PANE : f === 0 && y === base + 1 ? B.COBBLESTONE : PL);
          }
        }
        // 廊下（z 10〜12、赤い絨毯）と、部屋の仕切り
        for (x2 = ox + 1; x2 <= ox + 29; x2++) for (z2 = oz + 10; z2 <= oz + 12; z2++) P.set(x2, base, z2, B.RED_WOOL);
        for (x2 = ox + 1; x2 <= ox + 29; x2++) for (var y3 = base + 1; y3 <= base + 5; y3++) { P.set(x2, y3, oz + 9, IN); P.set(x2, y3, oz + 13, IN); }
        [6, 12, 18, 24].forEach(function (dx) { P.fill(ox + dx, base + 1, oz + 1, ox + dx, base + 5, oz + 8, IN); P.fill(ox + dx, base + 1, oz + 14, ox + dx, base + 5, oz + 21, IN); });
        for (x2 = ox + 3; x2 <= ox + 27; x2 += 6) { P.set(x2, base + 3, oz + 10, B.WALL_TORCH_S); P.set(x2 + 3, base + 3, oz + 12, B.WALL_TORCH_N); }
        // 部屋
        for (var r = 0; r < 5; r++) [0, 1].forEach(function (sd) {
          var x0 = ox + 1 + r * 6, z0 = sd ? oz + 14 : oz + 1, door = sd ? oz + 13 : oz + 9, mid = x0 + 2;
          P.set(mid, base + 1, door, B.AIR); P.set(mid, base + 2, door, B.AIR);
          if (f === 0 && sd === 1 && r === 4) {
            // 階段の部屋（北へ上る）
            for (var k = 0; k < 5; k++) for (var sx = x0 + 1; sx <= x0 + 3; sx++) {
              P.set(sx, base + 1 + k, oz + 20 - k, B.DARK_OAK_STAIRS_N);
              for (var yy = base + 1; yy <= base + k; yy++) P.set(sx, yy, oz + 20 - k, PL);
              P.set(sx, g + 6, oz + 20 - k, B.AIR);
            }
            return;
          }
          if (f === 1 && sd === 1 && r === 4) return;
          var kind = ['bed', 'lib', 'store', 'dine', 'plain'][Math.floor(R() * 5)];
          var wool = B[WG.WOOL_COLORS[Math.floor(R() * WG.WOOL_COLORS.length)][0] + '_WOOL'] || B.WHITE_WOOL;
          if (kind === 'bed') {
            P.fill(x0 + 1, base, z0 + 1, x0 + 3, base, z0 + 6, wool);
            var bz = sd ? z0 + 6 : z0 + 1, dz = sd ? -1 : 1, dn = sd ? 'N' : 'S';
            P.set(x0 + 1, base + 1, bz + dz, B['BED_FOOT_' + { N: 'S', S: 'N' }[dn]]); P.set(x0 + 1, base + 1, bz, B['BED_HEAD_' + { N: 'S', S: 'N' }[dn]]);
            P.set(x0 + 3, base + 1, bz, B.CHEST); P.loot[(x0 + 3) + ',' + (base + 1) + ',' + bz] = 'mansion';
            P.set(x0 + 3, base + 1, sd ? z0 + 2 : z0 + 5, B.LANTERN);
          } else if (kind === 'lib') {
            for (var t = 0; t <= 4; t++) for (var y4 = base + 1; y4 <= base + 3; y4++) P.set(x0 + t, y4, sd ? z0 + 7 : z0, B.BOOKSHELF);
            for (var t2 = 1; t2 <= 6; t2++) for (y4 = base + 1; y4 <= base + 2; y4++) { P.set(x0, y4, z0 + t2, B.BOOKSHELF); P.set(x0 + 4, y4, z0 + t2, B.BOOKSHELF); }
            P.set(mid, base + 1, z0 + 3, B.LANTERN);
          } else if (kind === 'store') {
            P.chest(x0 + 1, base + 1, sd ? z0 + 7 : z0, 'mansion'); P.chest(x0 + 3, base + 1, sd ? z0 + 7 : z0, 'mansion');
            P.set(x0 + 4, base + 1, z0 + 3, B.CRAFTING_TABLE);
          } else if (kind === 'dine') {
            for (var tz = z0 + 2; tz <= z0 + 5; tz++) { P.set(mid, base + 1, tz, B.OAK_FENCE); P.set(mid, base + 2, tz, B.OAK_PRESSURE_PLATE); P.set(mid - 1, base + 1, tz, B.DARK_OAK_STAIRS_W); P.set(mid + 1, base + 1, tz, B.DARK_OAK_STAIRS_E); }
          } else {
            P.fill(x0 + 1, base, z0 + 1, x0 + 3, base, z0 + 6, wool);
            P.set(x0, base + 1, sd ? z0 + 7 : z0, B.POTTED_POPPY || B.FLOWER_POT);
          }
        });
      });
      // 入口（南の真ん中）
      P.fill(ox + 15, g + 1, oz + 22, ox + 15, g + 3, oz + 22, B.AIR); P.fill(ox + 15, g + 1, oz + 13, ox + 15, g + 2, oz + 21, B.AIR);
      P.set(ox + 15, g, oz + 23, B.COBBLESTONE_STAIRS_N);
      // 屋根裏の床と寄棟の屋根
      P.fill(ox, g + 12, oz, ox + 30, g + 12, oz + 22, PL);
      for (var t3 = 0; t3 < 13; t3++) {
        var x0r = ox - 1 + t3, x1r = ox + 31 - t3, z0r = oz - 1 + t3, z1r = oz + 23 - t3, yr = g + 12 + t3;
        if (z0r > z1r) break;
        for (x = x0r; x <= x1r; x++) for (z = z0r; z <= z1r; z++) {
          var onE = z === z0r || z === z1r || x === x0r || x === x1r;
          if (z1r - z0r <= 1) { P.set(x, yr, z, PL); continue; }
          if (!onE) continue;
          P.set(x, yr, z, z === z0r ? B.DARK_OAK_STAIRS_S : z === z1r ? B.DARK_OAK_STAIRS_N : x === x0r ? B.DARK_OAK_STAIRS_E : B.DARK_OAK_STAIRS_W);
        }
      }
      // 煙突
      P.fill(ox + 5, g + 13, oz + 5, ox + 6, g + 22, oz + 6, B.COBBLESTONE);
      for (var m = 0; m < 6; m++) P.mob('PILLAGER', ox + 3 + Math.floor(R() * 25) + 0.5, g + 1 + (m % 2) * 6, oz + 11.5);
      return P;
    } });

  // ---------------- ネザー要塞（ネザーレンガの橋・廊下・十字路と、火の精のスポナー・ウォート畑・下り階段の部屋） ----------------
  var Nether = WG.Nether;
  Nether.prototype.fortressAt = function () { return null; };   // 第 3 回の廊下だけの要塞は、この要塞に置き換える
  spec({ key: 'nf', dim: 'nether', size: 320, reach: 70,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 50) >= 0.6) return null;
      var hv = hash(s, rx, 1, rz, SALT + 50), x = rx * 320 + 96 + (hv % 128), z = rz * 320 + 96 + ((hv >>> 8) % 128), yf = 60 + ((hv >>> 16) % 11);
      var arms = [], ends = ['blaze', 'wart', 'stairs', 'hall'], R = rng(hv);
      for (var i = ends.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = ends[i]; ends[i] = ends[j]; ends[j] = t; }
      'NESW'.split('').forEach(function (d, k) { if (k < 2 || R() < 0.8) arms.push({ d: d, L: 20 + Math.floor(R() * 26), end: ends[k], corridor: R() < 0.4 }); });
      return bbox({ x: x, z: z, y: yf, arms: arms }, 60);
    },
    build: function (gen, h) {
      var P = new Plan(0, 127, 'fortress'), N = B.NETHER_BRICKS, F = B.NETHER_BRICK_FENCE, cx = h.x, cz = h.z, yf = h.y, R = rng(hash(gen.seed, h.rx, 7, h.rz, SALT + 50));
      // 真ん中の十字路
      P.box(cx - 4, yf, cz - 4, cx + 4, yf + 6, cz + 4, N, B.AIR);
      'NESW'.split('').forEach(function (d) { var v = DV[d], px = -v[1], pz = v[0]; for (var c = -1; c <= 1; c++) for (var y = yf + 1; y <= yf + 3; y++) P.set(cx + v[0] * 4 + px * c, y, cz + v[1] * 4 + pz * c, B.AIR); });
      [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach(function (q) { P.found(cx + q[0], yf - 1, cz + q[1], N); });
      P.set(cx, yf + 5, cz, B.GLOWSTONE);
      h.arms.forEach(function (arm) {
        var v = DV[arm.d], px = -v[1], pz = v[0];
        var at = function (a, c, y, id) { P.set(cx + v[0] * a + px * c, y, cz + v[1] * a + pz * c, id); };
        var fnd = function (a, c, y) { P.found(cx + v[0] * a + px * c, y, cz + v[1] * a + pz * c, N); };
        var a, c, y, chestA = 5 + Math.floor(R() * arm.L);
        for (a = 5; a < 5 + arm.L; a++) {
          if (arm.corridor) {
            for (c = -2; c <= 2; c++) for (y = yf; y <= yf + 5; y++) at(a, c, y, Math.abs(c) <= 1 && y > yf && y < yf + 5 ? B.AIR : N);
            if (a % 4 === 2) for (y = yf + 2; y <= yf + 3; y++) { at(a, -2, y, F); at(a, 2, y, F); }
            if (a % 6 === 0) for (c = -2; c <= 2; c += 4) fnd(a, c, yf - 1);
            if (a % 8 === 4) at(a, 1, yf + 4, B.GLOWSTONE);
          } else {
            for (c = -2; c <= 2; c++) { at(a, c, yf, N); at(a, c, yf - 1, N); for (y = yf + 1; y <= yf + 5; y++) at(a, c, y, Math.abs(c) === 2 && y === yf + 1 ? F : B.AIR); }
            var m8 = a % 8;
            if (m8 === 0) for (c = -2; c <= 2; c++) fnd(a, c, yf - 2);
            if (m8 === 1 || m8 === 7) for (c = -2; c <= 2; c++) at(a, c, yf - 2, N);
          }
          if (a % 5 === 0) P.floor.push([cx + v[0] * a, yf + 1, cz + v[1] * a]);
        }
        if (arm.corridor) { var cA = chestA; P.chest(cx + v[0] * cA + px, yf + 1, cz + v[1] * cA + pz, 'fortress'); }
        // 腕の先の部屋
        var a0 = 5 + arm.L;
        if (arm.end === 'blaze') {
          for (a = a0; a <= a0 + 10; a++) for (c = -5; c <= 5; c++) {
            at(a, c, yf, N); at(a, c, yf - 1, N);
            for (y = yf + 1; y <= yf + 6; y++) at(a, c, y, B.AIR);
            var edge = a === a0 + 10 || Math.abs(c) === 5 || (a === a0 && Math.abs(c) > 2);
            if (edge) at(a, c, yf + 1, F);
            if ((a === a0 || a === a0 + 10) && Math.abs(c) === 5) fnd(a, c, yf - 2);
          }
          for (a = a0 + 4; a <= a0 + 6; a++) for (c = -1; c <= 1; c++) at(a, c, yf + 1, N);
          for (c = -1; c <= 1; c++) at(a0 + 3, c, yf + 1, B['NETHER_BRICK_STAIRS_' + dirName(v[0], v[1])]);
          P.spawner(cx + v[0] * (a0 + 5), yf + 2, cz + v[1] * (a0 + 5), 'FIRE_SPIRIT');
          [[a0 + 4, -1], [a0 + 4, 1], [a0 + 6, -1], [a0 + 6, 1]].forEach(function (q) { at(q[0], q[1], yf + 2, F); });
          P.chest(cx + v[0] * (a0 + 9) + px * 4, yf + 1, cz + v[1] * (a0 + 9) + pz * 4, 'fortress');
          for (var n = 0; n < 4; n++) P.floor.push([cx + v[0] * (a0 + 2 + n * 2) + px * 3, yf + 1, cz + v[1] * (a0 + 2 + n * 2) + pz * 3]);
        } else if (arm.end === 'wart') {
          for (a = a0; a <= a0 + 10; a++) for (c = -5; c <= 5; c++) for (y = yf; y <= yf + 7; y++) {
            var wall = a === a0 || a === a0 + 10 || Math.abs(c) === 5 || y === yf || y === yf + 7;
            at(a, c, y, wall ? N : B.AIR);
            if (wall && y >= yf + 2 && y <= yf + 4 && (a === a0 + 10 || Math.abs(c) === 5) && (a + c) % 3 === 0) at(a, c, y, F);
          }
          for (c = -2; c <= 2; c++) for (y = yf + 1; y <= yf + 3; y++) at(a0, c, y, B.AIR);
          for (a = a0 + 3; a <= a0 + 8; a++) [-3, -2, 2, 3].forEach(function (cc) { at(a, cc, yf, B.SOUL_SAND); at(a, cc, yf + 1, B.NETHER_WART_3); });
          for (a = a0 + 2; a <= a0 + 9; a++) [-4, 4].forEach(function (cc) { at(a, cc, yf + 1, B['NETHER_BRICK_SLAB']); });
          at(a0 + 9, 0, yf + 6, B.GLOWSTONE); at(a0 + 3, 0, yf + 6, B.GLOWSTONE);
          P.chest(cx + v[0] * (a0 + 9), yf + 1, cz + v[1] * (a0 + 9), 'fortress');
          for (a = a0 - 1; a <= a0 + 11; a++) for (c = -5; c <= 5; c += 10) if ((a - a0) % 5 === 0) fnd(a, c, yf - 1);
          P.floor.push([cx + v[0] * (a0 + 5), yf + 1, cz + v[1] * (a0 + 5)]);
        } else if (arm.end === 'stairs') {
          for (a = a0; a <= a0 + 10; a++) for (c = -3; c <= 3; c++) for (y = yf - 10; y <= yf + 5; y++) {
            var w2 = a === a0 || a === a0 + 10 || Math.abs(c) === 3 || y === yf - 10 || y === yf + 5;
            at(a, c, y, w2 ? N : B.AIR);
          }
          for (c = -1; c <= 1; c++) for (y = yf + 1; y <= yf + 3; y++) at(a0, c, y, B.AIR);
          for (c = -2; c <= 2; c++) at(a0 + 1, c, yf, N);
          for (var k = 0; k < 8; k++) for (c = -1; c <= 1; c++) {
            at(a0 + 2 + k, c, yf - k, B['NETHER_BRICK_STAIRS_' + dirName(-v[0], -v[1])]);
            for (y = yf - 9; y < yf - k; y++) at(a0 + 2 + k, c, y, N);
          }
          at(a0 + 9, 0, yf - 4, B.GLOWSTONE); at(a0 + 5, 2, yf - 2, B.GLOWSTONE);
          P.chest(cx + v[0] * (a0 + 9) + px * 2, yf - 9, cz + v[1] * (a0 + 9) + pz * 2, 'fortress');
          for (c = -3; c <= 3; c += 6) { fnd(a0, c, yf - 11); fnd(a0 + 10, c, yf - 11); }
        } else {
          for (a = a0; a <= a0 + 8; a++) for (c = -4; c <= 4; c++) for (y = yf; y <= yf + 6; y++) {
            var w3 = a === a0 || a === a0 + 8 || Math.abs(c) === 4 || y === yf || y === yf + 6;
            at(a, c, y, w3 ? N : B.AIR);
          }
          for (c = -1; c <= 1; c++) for (y = yf + 1; y <= yf + 3; y++) { at(a0, c, y, B.AIR); at(a0 + 4 + c, -4, y, F); at(a0 + 4 + c, 4, y, F); }
          at(a0 + 4, 0, yf + 5, B.GLOWSTONE);
          P.chest(cx + v[0] * (a0 + 7) + px * 3, yf + 1, cz + v[1] * (a0 + 7) + pz * 3, 'fortress');
          P.chest(cx + v[0] * (a0 + 7) - px * 3, yf + 1, cz + v[1] * (a0 + 7) - pz * 3, 'fortress');
          [[a0, -4], [a0, 4], [a0 + 8, -4], [a0 + 8, 4]].forEach(function (q) { fnd(q[0], q[1], yf - 1); });
          P.floor.push([cx + v[0] * (a0 + 4), yf + 1, cz + v[1] * (a0 + 4)]);
        }
      });
      return P;
    } });

  // ---------------- ピグリンの砦（ブラックストーンの城壁、溶岩の堀、真ん中の塔の上に宝の部屋） ----------------
  spec({ key: 'bs', dim: 'nether', size: 448, reach: 16,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 60) >= 0.5) return null;
      // 広い空洞の床を探す（真ん中の上 15 と、四隅の上 8 が空いている所）
      for (var tr = 0; tr < 8; tr++) {
        var hv = hash(s, rx, 1 + tr, rz, SALT + 60), x = rx * 448 + 80 + (hv % 288), z = rz * 448 + 80 + ((hv >>> 9) % 288);
        if (gen.biomeAt && gen.biomeAt(x, z) === 4) continue;
        for (var y = 90; y > 33; y--) {
          if (!(gen.density(x, y, z) > 0 && gen.density(x, y + 1, z) <= 0)) continue;
          var open = gen.density(x, y + 15, z) <= 0 && [[-11, -11], [11, -11], [-11, 11], [11, 11]].filter(function (q) { return gen.density(x + q[0], y + 8, z + q[1]) <= 0; }).length >= 3;
          if (open) return bbox({ x: x, z: z, y: y }, 14);
          break;
        }
      }
      return null;
    },
    build: function (gen, h) {
      var P = new Plan(0, 127, 'bastion'), seed = gen.seed, cx = h.x, cz = h.z, yb = h.y;
      var M = function (x, y, z) { var v = hash(seed, x, y, z, SALT + 61) % 20; return v < 1 ? B.GILDED_BLACKSTONE : v < 6 ? B.BLACKSTONE : B.POLISHED_BLACKSTONE_BRICKS; };
      P.fill(cx - 13, yb + 1, cz - 13, cx + 13, yb + 26, cz + 13, B.AIR);
      P.fill(cx - 12, yb - 1, cz - 12, cx + 12, yb, cz + 12, M);
      for (var x = cx - 12; x <= cx + 12; x++) for (var z = cz - 12; z <= cz + 12; z++) {
        var d = Math.max(Math.abs(x - cx), Math.abs(z - cz));
        if (d >= 11 || (x - cx) % 4 === 0 && (z - cz) % 4 === 0) P.found(x, yb - 2, z, B.BLACKSTONE);
        if (d >= 11) { for (var y = yb + 1; y <= yb + 16; y++) P.set(x, y, z, M(x, y, z)); if (d === 12 && (x + z) % 2 === 0) P.set(x, yb + 17, z, M(x, yb + 17, z)); }
        if (d >= 8 && d <= 10) P.set(x, yb + 10, z, B.POLISHED_BLACKSTONE_BRICKS);
        if (d === 8) P.set(x, yb + 11, z, (x + z) % 6 === 0 ? B.LANTERN : B.BLACKSTONE_BRICK_SLAB);
        if (d >= 5 && d <= 6 && Math.abs(x - cx) > 1 && Math.abs(z - cz) > 1) P.set(x, yb, z, B.LAVA);
        if (d < 5 && hash(seed, x, yb, z, SALT + 62) % 9 === 0) P.set(x, yb, z, B.MAGMA);
      }
      // 門（北）
      P.fill(cx - 1, yb + 1, cz - 12, cx + 1, yb + 4, cz - 11, B.AIR);
      P.set(cx - 2, yb + 5, cz - 12, B.GOLD_BLOCK); P.set(cx + 2, yb + 5, cz - 12, B.GOLD_BLOCK); P.set(cx - 2, yb + 5, cz - 13, B.LANTERN); P.set(cx + 2, yb + 5, cz - 13, B.LANTERN);
      P.set(cx, yb + 11, cz, B.LANTERN); P.set(cx - 2, yb + 1, cz + 2, B.LANTERN); P.set(cx + 2, yb + 23, cz - 2, B.LANTERN);
      // 回廊への階段（西の内側を北へ上る）
      for (var k = 0; k < 10; k++) for (x = cx - 10; x <= cx - 9; x++) {
        P.set(x, yb + 1 + k, cz + 7 - k, B.BLACKSTONE_BRICK_STAIRS_N);
        for (y = yb + 1; y <= yb + k; y++) P.set(x, y, cz + 7 - k, B.POLISHED_BLACKSTONE_BRICKS);
      }
      // 真ん中の塔
      for (x = cx - 4; x <= cx + 4; x++) for (z = cz - 4; z <= cz + 4; z++) for (y = yb + 1; y <= yb + 24; y++) {
        var wall = Math.abs(x - cx) === 4 || Math.abs(z - cz) === 4 || y === yb + 24;
        P.set(x, y, z, wall ? M(x, y, z) : B.AIR);
      }
      P.fill(cx - 1, yb + 1, cz - 4, cx + 1, yb + 3, cz - 4, B.AIR);
      P.fill(cx - 3, yb + 10, cz - 3, cx + 3, yb + 10, cz + 3, B.POLISHED_BLACKSTONE_BRICKS);
      'NESW'.split('').forEach(function (dk) {
        var v = DV[dk], px = -v[1], pz = v[0];
        for (var a = 4; a <= 8; a++) for (var c = -1; c <= 1; c++) {
          P.set(cx + v[0] * a + px * c, yb + 10, cz + v[1] * a + pz * c, B.POLISHED_BLACKSTONE_BRICKS);
          if (a === 4) for (var yy = yb + 11; yy <= yb + 12; yy++) P.set(cx + v[0] * a + px * c, yy, cz + v[1] * a + pz * c, B.AIR);
          else P.set(cx + v[0] * a + px * c, yb + 11, cz + v[1] * a + pz * c, B.AIR);
        }
        P.set(cx + v[0] * 4, yb + 21, cz + v[1] * 4, B.AIR); P.set(cx + v[0] * 4, yb + 22, cz + v[1] * 4, B.AIR);
      });
      // 宝の部屋：金ブロックの市松の床、チェスト 2 つ
      for (x = cx - 3; x <= cx + 3; x++) for (z = cz - 3; z <= cz + 3; z++) P.set(x, yb + 19, z, (x + z) % 2 === 0 ? B.GOLD_BLOCK : B.POLISHED_BLACKSTONE_BRICKS);
      for (y = yb + 1; y <= yb + 20; y++) P.set(cx + 3, y, cz, B.LADDER_W);
      P.set(cx + 3, yb + 10, cz, B.LADDER_W); P.set(cx + 3, yb + 19, cz, B.LADDER_W);
      P.chest(cx - 2, yb + 20, cz - 2, 'bastion'); P.chest(cx + 2, yb + 20, cz + 2, 'bastion'); P.set(cx, yb + 20, cz, B.GOLD_BLOCK);
      P.chest(cx - 9, yb + 11, cz - 9, 'bastion'); P.chest(cx + 9, yb + 11, cz + 9, 'bastion');
      [[-6, -9], [6, -9], [-9, 6], [9, -6], [0, 7], [7, 3], [-3, -7], [9, 9]].forEach(function (q, i) { P.mob('PIGLIN', cx + q[0] + 0.5, i < 4 ? yb + 11 : yb + 1, cz + q[1] + 0.5); });
      P.mob('HOGLIN', cx + 7.5, yb + 1, cz - 7.5); P.mob('HOGLIN', cx - 7.5, yb + 1, cz + 3.5);
      return P;
    } });

  // ---------------- エンドシティ（外側の島。プルプァの塔 2 本と橋、空に浮かぶ果ての船。船にエリトラ） ----------------
  var End = WG.End || (WG.DIMS.end && WG.DIMS.end.Gen);
  var CITY = spec({ key: 'ec', dim: 'end', size: 128, reach: 30,
    head: function (gen, rx, rz) {
      var isl = gen.islandAt(rx, rz);
      if (!isl || isl.r < 9 || isl.x * isl.x + isl.z * isl.z < 600 * 600 || rnd(gen.seed, rx, 0, rz, SALT + 70) >= 0.5) return null;
      var h = { x: isl.x, z: isl.z, y: isl.top + 3 };
      h.x0 = h.x - 8; h.x1 = h.x + 24; h.z0 = h.z - 8; h.z1 = h.z + 18;
      return h;
    },
    build: function (gen, h) {
      var P = new Plan(0, 255, 'city'), bx = h.x, bz = h.z, yb = h.y, PU = B.PURPUR_BLOCK, PIL = B.PURPUR_PILLAR, E = B.END_STONE_BRICKS, GL = B.MAGENTA_STAINED_GLASS;
      P.fill(bx - 6, yb - 1, bz - 6, bx + 6, yb - 1, bz + 6, E);
      for (var t = -6; t <= 6; t += 3) { P.found(bx + t, yb - 2, bz - 6, E); P.found(bx + t, yb - 2, bz + 6, E); P.found(bx - 6, yb - 2, bz + t, E); P.found(bx + 6, yb - 2, bz + t, E); }
      var tower = function (tx, top, door) {
        for (var x = tx - 3; x <= tx + 3; x++) for (var z = bz - 3; z <= bz + 3; z++) for (var y = yb; y <= top; y++) {
          var ex = Math.abs(x - tx) === 3, ez = Math.abs(z - bz) === 3;
          if (ex || ez) P.set(x, y, z, ex && ez ? PIL : ((x === tx || z === bz) && (y - yb) % 5 >= 2 && (y - yb) % 5 <= 3) ? GL : PU);
          else P.set(x, y, z, y === yb || (y - yb) % 5 === 0 ? PU : B.AIR);
        }
        for (y = yb + 1; y <= top; y++) P.set(tx + 2, y, bz, B.LADDER_W);
        if (door) { P.set(tx, yb + 1, bz - 3, B.AIR); P.set(tx, yb + 2, bz - 3, B.AIR); }
        // 上の広い部屋
        for (x = tx - 5; x <= tx + 5; x++) for (z = bz - 5; z <= bz + 5; z++) for (y = top; y <= top + 5; y++) {
          var e2 = Math.abs(x - tx) === 5 || Math.abs(z - bz) === 5;
          if (y === top || y === top + 5) P.set(x, y, z, e2 && y === top + 5 ? B.PURPUR_SLAB : PU);
          else if (e2) P.set(x, y, z, Math.abs(x - tx) === 5 && Math.abs(z - bz) === 5 ? PIL : (y === top + 2 && (x - tx + z - bz) % 2 === 0) ? GL : PU);
          else P.set(x, y, z, B.AIR);
        }
        P.set(tx + 2, top, bz, B.LADDER_W);
        [[-5, -5], [5, -5], [-5, 5], [5, 5]].forEach(function (q) { P.set(tx + q[0], top + 6, bz + q[1], B.END_ROD); });
        P.set(tx, top + 4, bz, B.END_ROD);
      };
      tower(bx, yb + 15, true);
      tower(bx + 16, yb + 24, false);
      for (var y = yb; y <= yb + 15; y++) for (var x = bx + 13; x <= bx + 19; x++) for (var z = bz - 3; z <= bz + 3; z++) if (y < yb + 1) P.set(x, y, z, PU);
      for (t = 13; t <= 19; t += 3) { P.found(bx + t, yb - 1, bz - 3, E); P.found(bx + t, yb - 1, bz + 3, E); }
      // 橋（1 本目の上の部屋から 2 本目へ）
      for (x = bx + 6; x <= bx + 10; x++) for (var c = -1; c <= 1; c++) P.set(x, yb + 15, bz + c, PU);
      for (x = bx + 6; x <= bx + 10; x++) { P.set(x, yb + 16, bz - 2, B.PURPUR_SLAB); P.set(x, yb + 16, bz + 2, B.PURPUR_SLAB); P.set(x, yb + 15, bz - 2, PU); P.set(x, yb + 15, bz + 2, PU); }
      P.set(bx + 5, yb + 16, bz, B.AIR); P.set(bx + 5, yb + 17, bz, B.AIR);
      P.set(bx + 11, yb + 15, bz, PU); P.set(bx + 13, yb + 16, bz, B.AIR); P.set(bx + 13, yb + 17, bz, B.AIR); P.set(bx + 12, yb + 15, bz, PU);
      P.chest(bx - 4, yb + 16, bz - 4, 'end_city'); P.chest(bx + 20, yb + 25, bz + 4, 'end_city'); P.chest(bx + 12, yb + 25, bz - 4, 'end_city');
      P.mob('SHELL_GUARD', bx - 3.5, yb + 16, bz + 3.5); P.mob('SHELL_GUARD', bx + 16.5, yb + 30, bz + 0.5); P.mob('SHELL_GUARD', bx + 19.5, yb + 25, bz - 3.5);
      // 帰りのゲートウェイ（土台の角）
      P.set(bx - 5, yb - 1, bz + 5, B.BEDROCK); P.set(bx - 5, yb, bz + 5, B.END_GATEWAY);
      h.gate = [bx + 0.5, yb, bz - 5.5];
      // 果ての船（空に浮かぶ。船室の奥の額縁にエリトラ）
      var sx = bx - 2, sz = bz + 13, ys = yb + 20;
      for (var a = 0; a <= 18; a++) {
        var hw = a < 2 ? 1 : a > 15 ? 2 : 3;
        if (a >= 2 && a <= 15) for (c = -1; c <= 1; c++) P.set(sx + a, ys, sz + c, B.OBSIDIAN);
        for (c = -hw; c <= hw; c++) {
          P.set(sx + a, ys + 1, sz + c, PU);
          for (y = ys + 2; y <= ys + 3; y++) P.set(sx + a, y, sz + c, Math.abs(c) === hw || a === 0 || a === 18 ? PU : B.AIR);
          P.set(sx + a, ys + 4, sz + c, Math.abs(c) === hw ? B.PURPUR_SLAB : PU);
        }
      }
      for (a = 12; a <= 17; a++) for (c = -2; c <= 2; c++) for (y = ys + 5; y <= ys + 9; y++) {
        var wl = a === 12 || a === 17 || Math.abs(c) === 2 || y === ys + 9;
        P.set(sx + a, y, sz + c, wl ? (y === ys + 7 && Math.abs(c) === 2 && a % 2 === 0 ? GL : PU) : B.AIR);
      }
      P.set(sx + 12, ys + 5, sz, B.AIR); P.set(sx + 12, ys + 6, sz, B.AIR);
      for (y = ys + 5; y <= ys + 13; y++) P.set(sx + 7, y, sz, PIL);
      P.set(sx + 7, ys + 14, sz, B.END_ROD); P.set(sx, ys + 5, sz, B.END_ROD);
      for (c = -3; c <= 3; c++) if (c) P.set(sx + 7, ys + 11, sz + c, B.PURPUR_SLAB);
      P.set(sx + 16, ys + 6, sz, B.ITEM_FRAME_W); P.frames.push([sx + 16, ys + 6, sz, { key: 'ELYTRA', n: 1 }]);
      P.chest(sx + 14, ys + 5, sz - 1, 'end_city'); P.chest(sx + 14, ys + 5, sz + 1, 'end_city');
      P.mob('SHELL_GUARD', sx + 4.5, ys + 5, sz + 0.5); P.mob('SHELL_GUARD', sx + 10.5, ys + 5, sz - 1.5);
      return P;
    } });
  // 果ての竜を倒した後のゲートウェイの行き先：原点にいちばん近いエンドシティ
  WG.nearestEndCity = function (gen) {
    var best = null;
    for (var r = 4; r <= 16 && !best; r++) for (var rz = -r; rz <= r; rz++) for (var rx = -r; rx <= r; rx++) {
      if (Math.max(Math.abs(rx), Math.abs(rz)) !== r) continue;
      var h = headOf(gen, CITY, rx, rz);
      if (h && (!best || h.x * h.x + h.z * h.z < best.x * best.x + best.z * best.z)) best = h;
    }
    return best;
  };

  // 近くの構造物の場所（確認用）。kind は Plan の種類（stronghold, monument, jungle, ship, mansion, fortress, bastion, city）
  var KIND_KEY = { stronghold: 'sh', monument: 'om', jungle: 'jt', ship: 'sw', mansion: 'wm', fortress: 'nf', bastion: 'bs', city: 'ec' };
  WG.locateStructure = function (wd, kind, x, z, rings) {
    var sp = SPECS.filter(function (s) { return s.key === KIND_KEY[kind]; })[0], best = null;
    if (!sp || !wd.gen) return null;
    var rx0 = Math.floor(x / sp.size), rz0 = Math.floor(z / sp.size), n = rings || 6;
    for (var rz = rz0 - n; rz <= rz0 + n; rz++) for (var rx = rx0 - n; rx <= rx0 + n; rx++) {
      var h = headOf(wd.gen, sp, rx, rz);
      if (h && (!best || Math.hypot(h.x - x, h.z - z) < Math.hypot(best.x - x, best.z - z))) best = h;
    }
    return best ? { x: best.x, y: best.y, z: best.z, plan: planOf(wd.gen, best), head: best } : null;
  };

  // ---------------- 世界の生成につなぐ ----------------
  var Overworld = WG.Overworld, og = Overworld.prototype.generate;
  Overworld.prototype.generate = function (cx, cz, surfaceOnly) {
    var r = og.apply(this, arguments);
    plansNear(this, 'overworld', cx << 4, cz << 4, surfaceOnly).forEach(function (p) { p.draw(r.blocks, cx, cz); });
    return r;
  };
  var ng = Nether.prototype.generate;
  Nether.prototype.generate = function (cx, cz) {
    var r = ng.apply(this, arguments);
    plansNear(this, 'nether', cx << 4, cz << 4, false).forEach(function (p) { p.draw(r.blocks, cx, cz); });
    return r;
  };
  if (End) {
    var eg = End.prototype.generate;
    End.prototype.generate = function (cx, cz) {
      var r = eg.apply(this, arguments);
      plansNear(this, 'end', cx << 4, cz << 4, false).forEach(function (p) { p.draw(r.blocks, cx, cz); });
      return r;
    };
  }

  // ---------------- チェストの中身（構造物ごと） ----------------
  var LOOT = {
    stronghold: [['IRON_INGOT', 1, 5, 10], ['GOLD_INGOT', 1, 3, 5], ['REDSTONE', 4, 9, 5], ['BREAD', 1, 3, 15], ['APPLE', 1, 3, 15], ['IRON_PICKAXE', 1, 1, 5], ['IRON_SWORD', 1, 1, 5],
      ['IRON_CHESTPLATE', 1, 1, 5], ['IRON_HELMET', 1, 1, 5], ['DIAMOND', 1, 3, 3], ['SHADOW_PEARL', 1, 1, 10], ['SADDLE', 1, 1, 3], ['GOLDEN_APPLE', 1, 1, 1]],
    library: [['BOOK', 1, 3, 20], ['PAPER', 2, 7, 20], ['COMPASS', 1, 1, 5], ['ENCHANTED_BOOK', 1, 1, 10], ['EMPTY_MAP', 1, 1, 5]],
    jungle: [['BONE', 4, 6, 20], ['ROTTEN_FLESH', 3, 7, 16], ['GOLD_INGOT', 2, 7, 15], ['IRON_INGOT', 1, 5, 15], ['EMERALD', 1, 3, 2], ['DIAMOND', 1, 3, 3], ['SADDLE', 1, 1, 3], ['BAMBOO', 1, 3, 15]],
    ship_supply: [['PAPER', 1, 12, 8], ['POTATO', 2, 6, 7], ['CARROT', 4, 8, 7], ['WHEAT', 8, 21, 7], ['COAL', 2, 8, 6], ['ROTTEN_FLESH', 5, 24, 5], ['PUMPKIN', 1, 3, 2], ['GUNPOWDER', 1, 5, 3], ['TNT', 1, 2, 1], ['LEATHER_HELMET', 1, 1, 3]],
    ship_treasure: [['IRON_INGOT', 1, 5, 90], ['GOLD_INGOT', 1, 5, 10], ['EMERALD', 1, 5, 40], ['DIAMOND', 1, 1, 5], ['LAPIS', 1, 10, 20], ['GOLD_NUGGET', 1, 10, 50]],
    ship_map: [['PAPER', 1, 10, 20], ['FEATHER', 1, 5, 10], ['BOOK', 1, 5, 5], ['CLOCK', 1, 1, 1], ['COMPASS', 1, 1, 1], ['EMPTY_MAP', 1, 1, 1]],
    mansion: [['IRON_INGOT', 1, 4, 10], ['GOLD_INGOT', 1, 4, 5], ['REDSTONE', 4, 9, 5], ['BREAD', 1, 4, 15], ['WHEAT', 1, 4, 20], ['BUCKET', 1, 1, 10], ['NAME_TAG', 1, 1, 10],
      ['GOLDEN_APPLE', 1, 1, 15], ['DIAMOND_HOE', 1, 1, 5], ['DIAMOND_CHESTPLATE', 1, 1, 2], ['ENCHANTED_BOOK', 1, 1, 10], ['LEAD', 1, 1, 10]],
    fortress: [['DIAMOND', 1, 3, 5], ['IRON_INGOT', 1, 5, 5], ['GOLD_INGOT', 1, 3, 15], ['GOLDEN_SWORD', 1, 1, 5], ['GOLDEN_CHESTPLATE', 1, 1, 5], ['FLINT_AND_STEEL', 1, 1, 5],
      ['NETHER_WART', 3, 7, 5], ['SADDLE', 1, 1, 10], ['OBSIDIAN', 2, 4, 2], ['BLAZE_ROD', 1, 3, 4]],
    bastion: [['GOLD_INGOT', 3, 9, 20], ['GOLD_BLOCK', 1, 2, 6], ['GILDED_BLACKSTONE', 1, 5, 6], ['NETHERITE_SCRAP', 1, 1, 6], ['ANCIENT_DEBRIS', 1, 2, 6], ['DIAMOND', 1, 3, 6],
      ['GOLDEN_HELMET', 1, 1, 6], ['GOLDEN_CHESTPLATE', 1, 1, 6], ['CROSSBOW', 1, 1, 6], ['SPECTRAL_ARROW', 4, 12, 6], ['OBSIDIAN', 4, 6, 6], ['MAGMA_CREAM', 2, 6, 6]],
    end_city: [['DIAMOND', 2, 7, 5], ['IRON_INGOT', 4, 8, 10], ['GOLD_INGOT', 2, 7, 15], ['EMERALD', 2, 6, 2], ['SADDLE', 1, 1, 3], ['DIAMOND_SWORD', 1, 1, 3], ['DIAMOND_PICKAXE', 1, 1, 3],
      ['DIAMOND_CHESTPLATE', 1, 1, 3], ['DIAMOND_HELMET', 1, 1, 3], ['IRON_SWORD', 1, 1, 3], ['IRON_LEGGINGS', 1, 1, 3]]
  };
  Object.keys(LOOT).forEach(function (k) { LOOT[k] = LOOT[k].filter(function (l) { return ITEMS[l[0]]; }); });
  WG.STRUCTURE_LOOT = LOOT;
  function lootTableAt(wd, x, y, z) {
    var key = x + ',' + y + ',' + z, ps = WG.structuresNear(wd, x, z);
    for (var i = 0; i < ps.length; i++) if (ps[i].loot[key]) return ps[i].loot[key];
    return null;
  }
  var chestAt = Game.prototype.chestAt;
  Game.prototype.chestAt = function (x, y, z) {
    var wd = this.world, key = x + ',' + y + ',' + z;
    if (wd.chests.has(key)) return wd.chests.get(key);
    var tn = lootTableAt(wd, x, y, z), T = tn && LOOT[tn];
    if (!T || !T.length) return chestAt.apply(this, arguments);
    var c = new Array(27).fill(null), seed = wd.seed || 0, n = 4 + hash(seed, x, y, z, 71) % 5, total = T.reduce(function (a, l) { return a + l[3]; }, 0);
    for (var i = 0; i < n; i++) {
      var r = hash(seed, x, y, z, 72 + i) % total, l = T[0];
      for (var j = 0; j < T.length; j++) { if (r < T[j][3]) { l = T[j]; break; } r -= T[j][3]; }
      var at = hash(seed, x, y, z, 92 + i) % 27;
      while (c[at]) at = (at + 1) % 27;
      c[at] = { key: l[0], n: l[1] + hash(seed, x, y, z, 82 + i) % (l[2] - l[1] + 1) };
    }
    wd.chests.set(key, c);
    return c;
  };

  // ---------------- 初めて読み込んだチャンク：スポナーの種類・額縁・ディスペンサーの矢・住んでいる生き物 ----------------
  var populate = Mobs.prototype.populate;
  Mobs.prototype.populate = function (cx, cz) {
    var wd = this.world, key = cx + ',' + cz, first = !wd.populated.has(key), self = this;
    populate.apply(this, arguments);
    if (!first) return;
    wd.populated.add(key);
    if (!wd.gen) return;
    if (!wd.spawners) wd.spawners = new Map();
    plansNear(wd.gen, wd.dimKey, cx << 4, cz << 4, false).forEach(function (p) {
      Object.keys(p.spawners).forEach(function (k) {
        var q = k.split(',').map(Number);
        if (!p.inChunk(q[0], q[2], cx, cz)) return;
        wd.spawners.set(k, { x: q[0], y: q[1], z: q[2], timer: 200 + Math.floor(Math.random() * 600), type: p.spawners[k] });
      });
      p.frames.forEach(function (f) { if (p.inChunk(f[0], f[2], cx, cz)) { if (!wd.frames) wd.frames = new Map(); wd.frames.set(f[0] + ',' + f[1] + ',' + f[2], Object.assign({}, f[3])); } });
      p.disp.forEach(function (d) {
        if (!p.inChunk(d[0], d[2], cx, cz)) return;
        var s = new Array(9).fill(null); d[3].forEach(function (it, i) { s[i] = Object.assign({}, it); });
        wd.containers.set(d[0] + ',' + d[1] + ',' + d[2], s);
      });
      p.mobs.forEach(function (m) {
        if (!p.inChunk(Math.floor(m[1]), Math.floor(m[3]), cx, cz) || !WG.MOB_TYPES[m[0]]) return;
        var mob = self.spawn(m[0], m[1], m[2], m[3]);
        if (mob && m[4]) Object.assign(mob, m[4]);
        if (mob) mob.home = p.kind;
      });
    });
  };
  // 要塞・海底神殿の近くでは、そこに住む敵が出続ける（黒い骸骨と火の精、目玉魚）
  var spawnTick = Mobs.prototype.spawnTick;
  Mobs.prototype.spawnTick = function () {
    spawnTick.apply(this, arguments);
    var g = this.game, wd = this.world, w = g.walker;
    if (!wd.gen || g.tickCount % 40 !== 7 || (wd.dimKey !== 'nether' && wd.dimKey !== 'overworld')) return;
    var p = w.pos, self = this;
    WG.structuresNear(wd, Math.floor(p[0]), Math.floor(p[2])).forEach(function (pl) {
      if (pl.kind !== 'fortress' && pl.kind !== 'monument') return;
      var types = pl.kind === 'fortress' ? ['DARK_SKELETON', 'DARK_SKELETON', 'FIRE_SPIRIT'] : ['EYE_FISH'];
      var near = self.list.filter(function (m) { return types.indexOf(m.type) >= 0 && Math.hypot(m.x - p[0], m.z - p[2]) < 48; }).length;
      if (near >= (pl.kind === 'fortress' ? 6 : 8)) return;
      var f = pl.floor[Math.floor(Math.random() * pl.floor.length)];
      if (!f) return;
      var d = Math.hypot(f[0] - p[0], f[2] - p[2]);
      if (d < 10 || d > 40) return;
      var t = types[Math.floor(Math.random() * types.length)], b0 = wd.block(f[0], f[1], f[2]), b1 = wd.block(f[0], f[1] + 1, f[2]);
      if (t === 'EYE_FISH' ? WG.isWater(b0) : (!WG.COLLIDE[b0] && !WG.COLLIDE[b1] && !WG.FLUID[b0])) self.spawn(t, f[0] + 0.5, f[1], f[2] + 0.5);
    });
  };

  // ---------------- 影の目：投げると要塞の方へ飛ぶ。エンドポータルフレームにはめ、12 個そろうとポータルが開く ----------------
  var DIR_JP = ['南', '南西', '西', '北西', '北', '北東', '東', '南東'];
  function tryPortal(g, x, y, z) {
    var wd = g.world;
    for (var cx = x - 2; cx <= x + 2; cx++) for (var cz = z - 2; cz <= z + 2; cz++) {
      var ok = true;
      for (var i = -1; i <= 1 && ok; i++) {
        [[cx + i, cz - 2], [cx + i, cz + 2], [cx - 2, cz + i], [cx + 2, cz + i]].forEach(function (q) { if (wd.block(q[0], y, q[1]) !== B.END_PORTAL_FRAME_EYE) ok = false; });
      }
      if (!ok) continue;
      for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) { wd.setBlock(cx + dx, y, cz + dz, B.END_PORTAL); g.walker.remesh(cx + dx, cz + dz); }
      if (g.puff) g.puff(cx + 0.5, y + 0.8, cz + 0.5, [40, 120, 100], 30, 0.3);
      if (g.ui && g.ui.toast) g.ui.toast('エンドポータルが開いた');
      return true;
    }
    return false;
  }
  WG.tryEndPortal = tryPortal;
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var held = this.inv.held();
    if (!held || held.key !== 'ENDER_EYE') return use.apply(this, arguments);
    var t = this.walker.target, wd = this.world, surv = this.mode === 'survival';
    if (t && t.id === B.END_PORTAL_FRAME) {
      wd.setBlock(t.x, t.y, t.z, B.END_PORTAL_FRAME_EYE); this.walker.remesh(t.x, t.z);
      if (surv) this.inv.take(this.inv.sel, 1);
      tryPortal(this, t.x, t.y, t.z);
      return;
    }
    if (t && t.id === B.END_PORTAL_FRAME_EYE) return;
    if (wd.dimKey !== 'overworld' || !wd.gen) { if (this.ui.toast) this.ui.toast('影の目は、ここでは何も示さない'); return; }
    var p = this.walker.pos, s = WG.nearestStronghold(wd.gen, p[0], p[2]);
    if (!s) { if (this.ui.toast) this.ui.toast('影の目は、どこへも飛ばなかった'); return; }
    var dx = s.x - p[0], dz = s.z - p[2], dist = Math.hypot(dx, dz), ux = dx / (dist || 1), uz = dz / (dist || 1);
    if (surv) this.inv.take(this.inv.sel, 1);
    for (var k = 1; k <= 12; k++) if (this.puff) this.puff(p[0] + ux * k * 0.8, p[1] + 1.6 + k * 0.18, p[2] + uz * k * 0.8, [60, 160, 120], 2, 0.05);
    if (!surv || Math.random() < 0.8) {
      this.spawnItem('ENDER_EYE', 1, p[0] + ux, p[1] + 1.6, p[2] + uz, 0, 10);
      var e = this.entities[this.entities.length - 1]; e.vx = ux * 0.45; e.vz = uz * 0.45; e.vy = 0.42;
    } else if (this.puff) this.puff(p[0] + ux * 6, p[1] + 3.5, p[2] + uz * 6, [40, 120, 100], 12, 0.15);
    var ang = Math.round(Math.atan2(-dx, dz) / (Math.PI / 4));
    if (this.ui.toast) this.ui.toast('影の目は' + DIR_JP[(ang + 8) % 8] + 'へ飛んだ' + (dist < 24 ? '（真下に近い）' : '（およそ ' + Math.round(dist / 10) * 10 + ' ブロック先）'));
  };

  // ---------------- エンドゲートウェイ：果ての竜を倒すとできる。入ると外側の島のエンドシティへ、シティからは中央の島へ ----------------
  var dragonDied = Mobs.prototype.dragonDied;
  Mobs.prototype.dragonDied = function () {
    dragonDied.apply(this, arguments);
    var g = this.game, wd = this.world, y = 64;
    for (var yy = 120; yy > 20; yy--) if (WG.COLLIDE[wd.block(70, yy, 0)] >= 1) { y = yy + 1; break; }
    wd.setBlock(70, y - 1, 0, B.BEDROCK); wd.setBlock(70, y, 0, B.END_GATEWAY); wd.setBlock(70, y + 2, 0, B.BEDROCK);
    g.walker.remesh(70, 0);
    if (g.ui && g.ui.toast) g.ui.toast('島の東にエンドゲートウェイが開いた');
  };
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    tickExtra.apply(this, arguments);
    var wd = this.world, w = this.walker, p = w.pos;
    if (wd.dimKey !== 'end') return;
    var fx = Math.floor(p[0]), fy = Math.floor(p[1]), fz = Math.floor(p[2]), inGate = wd.block(fx, fy, fz) === B.END_GATEWAY || wd.block(fx, fy + 1, fz) === B.END_GATEWAY;
    if (!inGate) { this.gateLock = false; return; }
    if (this.gateLock) return;
    this.gateLock = true;
    var to;
    if (Math.hypot(p[0], p[2]) < 300) {
      var c = WG.nearestEndCity(wd.gen);
      if (!c) return;
      to = [c.x + 0.5, c.y, c.z - 5.5];
    } else {
      var ty = 64;
      for (var yy = 120; yy > 20; yy--) if (WG.COLLIDE[wd.block(62, yy, 4)] >= 1) { ty = yy + 1; break; }
      to = [62.5, ty, 4.5];
    }
    w.pos = to.slice(); w.prev = to.slice(); w.vel = [0, 0, 0];
    if (this.puff) this.puff(to[0], to[1] + 1, to[2], [40, 120, 100], 20, 0.2);
    if (this.ui.toast) this.ui.toast('エンドゲートウェイを通った');
  };
  // 構造物を足すための道具（js/structures2.js が使う）
  WG.StructAPI = { spec: spec, Plan: Plan, bbox: bbox, biomeKey: biomeKey, flat: flat, SALT: SALT, SEA: SEA, KIND_KEY: KIND_KEY, LOOT: LOOT, SPECS: SPECS, plansNear: plansNear, rng: rng };
})(typeof window !== 'undefined' ? window : globalThis);
