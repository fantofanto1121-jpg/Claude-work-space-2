// 鉱脈と構造物（村・砂漠のピラミッド・廃坑）。
// どれも座標のハッシュだけで形が決まるので、チャンクを 1 つずつ別々に作っても境目でつながる。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, rnd = WG.rnd, hash = WG.hash;
  var SEA = 63;

  // ---------------- 鉱脈 ----------------
  // Minecraft の鉱石と同じ作り方：短い線の上に、真ん中ほど太い小さな球を「大きさ」の数だけ並べる。
  // list の各行：[石版, 深層岩版, 最低 y, 最高 y, 1 チャンクの数, 大きさ, 分布（'u' 一様 / 't' 真ん中に多い）]
  // 自分のチャンクと周り 8 チャンクの鉱脈を見て、自分の範囲だけ描く。test(今のブロック, 行, 番号) が置く ID（0 は置かない）。
  function oreVeins(seed, salt, list, blocks, cx, cz, minY, maxY, test) {
    var x0 = cx << 4, z0 = cz << 4;
    for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) {
      var ccx = cx + dx, ccz = cz + dz;
      for (var k = 0; k < list.length; k++) {
        var L = list[k], size = L[5], spread = size / 8, reach = spread + size / 16 + 1.5;
        for (var n = 0; n < L[4]; n++) {
          var key = k * 256 + n, h = hash(seed, ccx, key, ccz, salt);
          var ox = (ccx << 4) + (h & 15) + 0.5, oz = (ccz << 4) + ((h >>> 4) & 15) + 0.5;
          if (ox + reach < x0 || ox - reach > x0 + 16 || oz + reach < z0 || oz - reach > z0 + 16) continue;
          var r1 = rnd(seed, ccx, key, ccz, salt + 1), r2 = rnd(seed, ccx, key, ccz, salt + 2);
          var oy = L[2] + (L[6] === 't' ? (r1 + r2) / 2 : r1) * (L[3] - L[2]);
          if (oy < minY - 3 || oy > maxY + 3) continue;
          var ang = rnd(seed, ccx, key, ccz, salt + 3) * Math.PI;
          var sx = Math.sin(ang) * spread, sz = Math.cos(ang) * spread;
          var ay = oy + Math.floor(rnd(seed, ccx, key, ccz, salt + 4) * 3) - 1;
          var by = oy + Math.floor(rnd(seed, ccx, key, ccz, salt + 5) * 3) - 1;
          for (var i = 0; i < size; i++) {
            var f = i / size, px = ox + sx - 2 * sx * f, py = ay + (by - ay) * f, pz = oz + sz - 2 * sz * f;
            var d = rnd(seed, ccx, key * 32 + i, ccz, salt + 6) * size / 16;
            var r = ((Math.sin(Math.PI * f) + 1) * d + 1) / 2;
            var xa = Math.max(Math.floor(px - r), x0), xb = Math.min(Math.floor(px + r), x0 + 15);
            var za = Math.max(Math.floor(pz - r), z0), zb = Math.min(Math.floor(pz + r), z0 + 15);
            var ya = Math.max(Math.floor(py - r), minY), yb = Math.min(Math.floor(py + r), maxY);
            for (var y = ya; y <= yb; y++) {
              var ey = (y + 0.5 - py) / r;
              for (var z = za; z <= zb; z++) {
                var ez = (z + 0.5 - pz) / r;
                for (var x = xa; x <= xb; x++) {
                  var ex = (x + 0.5 - px) / r;
                  if (ex * ex + ey * ey + ez * ez >= 1) continue;
                  var idx = ((y - minY) << 8) | ((z - z0) << 4) | (x - x0), id = test(blocks[idx], L, idx);
                  if (id) blocks[idx] = id;
                }
              }
            }
          }
        }
      }
    }
  }
  WG.oreVeins = oreVeins;

  // ---------------- 構造物 ----------------
  var SALT = { VIL: 81, VIL2: 82, TEMPLE: 83, MINE: 84, MINE2: 85 };
  var VR = 256, TR = 176, MR = 128;         // 区画の大きさ（区画ごとに 1 つまで）
  var VMAX = 50, TMAX = 11, MMAX = 64;      // 中心からの最大の広がり

  function dirName(x, z) { return x > 0 ? 'E' : x < 0 ? 'W' : z > 0 ? 'S' : 'N'; }
  // 壁が (x+wx, z+wz) にある壁掛けトーチ
  function wallTorch(wx, wz) { return B['WALL_TORCH_' + dirName(-wx, -wz)]; }

  // 村の見た目（バイオームの番号 → 材料）。屋根が null なら平らな屋根。
  var STYLES = {
    plains: { wall: B.OAK_PLANKS, post: B.OAK_LOG, roof: B.SPRUCE_PLANKS, stairs: 'SPRUCE', base: B.COBBLESTONE, floor: B.OAK_PLANKS, path: B.GRAVEL, door: 'OAK', fence: B.OAK_FENCE },
    taiga: { wall: B.SPRUCE_PLANKS, post: B.SPRUCE_LOG, roof: B.COBBLESTONE, stairs: 'COBBLESTONE', base: B.COBBLESTONE, floor: B.SPRUCE_PLANKS, path: B.GRAVEL, door: 'SPRUCE', fence: B.SPRUCE_FENCE },
    savanna: { wall: B.ACACIA_PLANKS, post: B.ACACIA_LOG, roof: B.BRICKS, stairs: 'BRICK', base: B.COBBLESTONE, floor: B.ACACIA_PLANKS, path: B.GRAVEL, door: 'ACACIA', fence: B.ACACIA_FENCE },
    desert: { wall: B.SANDSTONE, post: B.SANDSTONE, roof: null, stairs: 'SANDSTONE', base: B.SANDSTONE, floor: B.SANDSTONE, path: B.SANDSTONE, door: 'OAK', fence: null }
  };
  var STYLE_OF = { plains: 'plains', forest: 'plains', taiga: 'taiga', snowy_plains: 'taiga', savanna: 'savanna', desert: 'desert' };

  // 家の種類：[幅, 奥行き, 種類]
  var HOUSES = [[5, 5, 'small'], [7, 5, 'house'], [7, 7, 'big'], [7, 6, 'smithy']];

  function Structures(gen) { this.gen = gen; this.seed = gen.seed; this.cache = new Map(); }

  Structures.prototype.cached = function (key, make) {
    if (this.cache.has(key)) return this.cache.get(key);
    var v = make.call(this);
    if (this.cache.size > 4000) this.cache.clear();
    this.cache.set(key, v);
    return v;
  };

  // ---- 村：中央の井戸、4 方向の道、道に面した家と街灯 ----
  Structures.prototype.village = function (rx, rz) {
    return this.cached('v' + rx + ',' + rz, function () {
      var seed = this.seed, gen = this.gen;
      if (rnd(seed, rx, 0, rz, SALT.VIL) >= 0.85) return null;
      var h0 = hash(seed, rx, 1, rz, SALT.VIL);
      var cx = rx * VR + 56 + (h0 & 127), cz = rz * VR + 56 + ((h0 >>> 7) & 127);
      var c = gen.column(cx, cz), bk = WG.BIOMES[c.b].key, st = STYLE_OF[bk];
      if (!st || c.h <= SEA) return null;
      var v = { x: cx, z: cz, y: c.h, style: STYLES[st], styleKey: st, parts: [] };
      v.parts.push({ kind: 'well', x: cx, z: cz, y: c.h, x0: cx - 2, x1: cx + 2, z0: cz - 2, z1: cz + 2 });
      var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]], roads = 0;
      for (var d = 0; d < 4; d++) {
        var hd = hash(seed, rx * 4 + d, 2, rz, SALT.VIL2);
        if (d >= 2 && roads >= 2 && (hd & 7) < 2) continue;   // 道は 2〜4 本
        var dx = dirs[d][0], dz = dirs[d][1], len = 20 + (hd >>> 3) % 14;
        roads++;
        v.parts.push({ kind: 'road', x: cx, z: cz, dx: dx, dz: dz, len: len,
          x0: Math.min(cx + dx * 3, cx + dx * len) - 1, x1: Math.max(cx + dx * 3, cx + dx * len) + 1,
          z0: Math.min(cz + dz * 3, cz + dz * len) - 1, z1: Math.max(cz + dz * 3, cz + dz * len) + 1 });
        // 街灯（道の脇、10 ブロックおき、左右交互）
        for (var t = 7, li = 0; t <= len; t += 10, li++) {
          var s = li & 1 ? 1 : -1, lx = cx + dx * t - dz * 2 * s, lz = cz + dz * t + dx * 2 * s;
          v.parts.push({ kind: 'lamp', x: lx, z: lz, x0: lx, x1: lx, z0: lz, z1: lz });
        }
        // 家（中心から 12 ブロック先から、10 ブロックおき、両側）
        for (t = 12; t + 5 <= len + 2; t += 10) {
          for (var side = -1; side <= 1; side += 2) {
            var hh = hash(seed, cx + t * dx + side * 7, d, cz + t * dz, SALT.VIL2);
            if ((hh & 15) < 3) continue;
            var ty = HOUSES[(hh >>> 4) % HOUSES.length];
            if (st === 'desert' && ty[2] === 'smithy' && ((hh >>> 8) & 1)) ty = HOUSES[1];
            if ((hh >>> 12) % 4 === 0) ty = [9, 7, 'farm'];   // 4 軒に 1 つほどは畑
            var W = ty[0], D = ty[1];
            // 家の軸：U は道の向き、V は道から離れる向き（入口は V の手前 v=0 の真ん中）
            var px = -dz * side, pz = dx * side;
            var ox = cx + dx * t + px * 3, oz = cz + dz * t + pz * 3;
            var hx = ox + dx * (W >> 1) + px * (D >> 1), hz = oz + dz * (W >> 1) + pz * (D >> 1);
            var fy = gen.column(hx, hz).h, ok = fy > SEA;
            // 四隅の地面との差が大きすぎるところには建てない
            [[0, 0], [W - 1, 0], [0, D - 1], [W - 1, D - 1]].forEach(function (q) {
              var g = gen.column(ox + dx * q[0] + px * q[1], oz + dz * q[0] + pz * q[1]).h;
              if (g <= SEA - 1 || Math.abs(g - fy) > 4) ok = false;
            });
            if (!ok) continue;
            var xs = [ox - dx - px, ox + dx * W + px * D], zs = [oz - dz - pz, oz + dz * W + pz * D];
            v.parts.push({ kind: 'house', type: ty[2], W: W, D: D, ox: ox, oz: oz, ux: dx, uz: dz, vx: px, vz: pz, y: fy, seed: hh,
              x0: Math.min(xs[0], xs[1]), x1: Math.max(xs[0], xs[1]), z0: Math.min(zs[0], zs[1]), z1: Math.max(zs[0], zs[1]) });
          }
        }
      }
      return v;
    });
  };

  // ---- 砂漠のピラミッド：段々の砂岩の山、中の広間、床下の隠し部屋と 4 つのチェスト ----
  Structures.prototype.temple = function (rx, rz) {
    return this.cached('t' + rx + ',' + rz, function () {
      var seed = this.seed;
      if (rnd(seed, rx, 0, rz, SALT.TEMPLE) >= 0.8) return null;
      // 区画の中で、砂漠の平らなところを 6 か所まで探す（四隅の高さの差が 5 以内）
      for (var tr = 0; tr < 6; tr++) {
        var h0 = hash(seed, rx, 1 + tr, rz, SALT.TEMPLE);
        var x = rx * TR + 24 + (h0 & 127), z = rz * TR + 24 + ((h0 >>> 7) & 127);
        var c = this.gen.column(x, z), ok = WG.BIOMES[c.b].key === 'desert' && c.h > SEA + 1;
        for (var q = 0; q < 4 && ok; q++) if (Math.abs(this.gen.column(x + (q & 1 ? 10 : -10), z + (q & 2 ? 10 : -10)).h - c.h) > 5) ok = false;
        if (ok) break;
      }
      if (!ok) return null;
      var face = (h0 >>> 14) & 3;
      return { kind: 'temple', x: x, z: z, y: c.h, face: [[1, 0], [0, 1], [-1, 0], [0, -1]][face],
        x0: x - TMAX, x1: x + TMAX, z0: z - TMAX, z1: z + TMAX };
    });
  };

  // ---- 廃坑：地下の部屋から延びる、木の支えのある通路（枝分かれあり） ----
  Structures.prototype.mineshaft = function (rx, rz) {
    return this.cached('m' + rx + ',' + rz, function () {
      var seed = this.seed;
      if (rnd(seed, rx, 0, rz, SALT.MINE) >= 0.4) return null;
      var h0 = hash(seed, rx, 1, rz, SALT.MINE);
      var x = rx * MR + 32 + (h0 & 63), z = rz * MR + 32 + ((h0 >>> 6) & 63);
      var y = -36 + ((h0 >>> 12) % 60);
      var m = { kind: 'mine', x: x, z: z, y: y, segs: [], x0: x - MMAX, x1: x + MMAX, z0: z - MMAX, z1: z + MMAX };
      m.room = { x0: x - 4, x1: x + 4, z0: z - 4, z1: z + 4, y: y };
      var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]], n = 0;
      for (var d = 0; d < 4; d++) {
        var hd = hash(seed, rx * 4 + d, 2, rz, SALT.MINE2);
        if ((hd & 3) === 0) continue;
        var dx = dirs[d][0], dz = dirs[d][1], len = 22 + (hd >>> 2) % 34;
        var sx = x + dx * 5, sz = z + dz * 5;
        m.segs.push({ x: sx, z: sz, dx: dx, dz: dz, len: len, y: y, id: n++ });
        // 枝分かれ（通路の途中から横へ）
        for (var b = 0; b < 2; b++) {
          var hb = hash(seed, rx * 8 + d * 2 + b, 3, rz, SALT.MINE2);
          if ((hb & 3) === 0) continue;
          var at = 8 + (hb >>> 2) % Math.max(1, len - 12), s = (hb >>> 9) & 1 ? 1 : -1, bl = 12 + (hb >>> 10) % 20;
          var bx = sx + dx * at, bz = sz + dz * at, ex = -dz * s, ez = dx * s;
          m.segs.push({ x: bx + ex * 2, z: bz + ez * 2, dx: ex, dz: ez, len: bl, y: y + ((hb >>> 16) % 3) - 1, id: n++ });
        }
      }
      m.segs.forEach(function (sg) {
        var x1 = sg.x + sg.dx * (sg.len - 1), z1 = sg.z + sg.dz * (sg.len - 1);
        sg.x0 = Math.min(sg.x, x1) - 1; sg.x1 = Math.max(sg.x, x1) + 1; sg.z0 = Math.min(sg.z, z1) - 1; sg.z1 = Math.max(sg.z, z1) + 1;
      });
      return m;
    });
  };

  // このチャンクにかかる構造物
  function regions(x0, z0, size, reach, fn) {
    for (var rz = Math.floor((z0 - reach) / size); rz <= Math.floor((z0 + 15 + reach) / size); rz++)
      for (var rx = Math.floor((x0 - reach) / size); rx <= Math.floor((x0 + 15 + reach) / size); rx++) fn(rx, rz);
  }
  function hit(p, x0, z0, pad) { return p.x1 + pad >= x0 && p.x0 - pad <= x0 + 15 && p.z1 + pad >= z0 && p.z0 - pad <= z0 + 15; }

  Structures.prototype.near = function (x0, z0, underground) {
    var self = this, out = [];
    regions(x0, z0, VR, 200, function (rx, rz) { var v = self.village(rx, rz); if (v) out.push(v); });
    regions(x0, z0, TR, 160, function (rx, rz) { var t = self.temple(rx, rz); if (t && hit(t, x0, z0, 4)) out.push(t); });
    if (underground) regions(x0, z0, MR, 120, function (rx, rz) { var m = self.mineshaft(rx, rz); if (m && hit(m, x0, z0, 0)) out.push(m); });
    return out;
  };

  // 木を生やさない場所（村と砂漠のピラミッドの上）
  Structures.prototype.treeFree = function (list, x, z) {
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (s.kind === 'mine') continue;
      if (s.kind === 'temple') { if (Math.abs(x - s.x) <= TMAX + 3 && Math.abs(z - s.z) <= TMAX + 3) return true; continue; }
      for (var j = 0; j < s.parts.length; j++) {
        var p = s.parts[j];
        if (x >= p.x0 - 4 && x <= p.x1 + 4 && z >= p.z0 - 4 && z <= p.z1 + 4) return true;
      }
    }
    return false;
  };

  // ---------------- 描く ----------------
  // ctx: { blocks, hmap, x0, z0, minY } 。put はチャンクの外を無視する。
  function Ctx(blocks, hmap, x0, z0, minY, maxY) { this.blocks = blocks; this.hmap = hmap; this.x0 = x0; this.z0 = z0; this.minY = minY; this.maxY = maxY; }
  Ctx.prototype.inside = function (x, z) { return x >= this.x0 && x < this.x0 + 16 && z >= this.z0 && z < this.z0 + 16; };
  Ctx.prototype.idx = function (x, y, z) { return ((y - this.minY) << 8) | ((z - this.z0) << 4) | (x - this.x0); };
  Ctx.prototype.put = function (x, y, z, id) {
    if (!this.inside(x, z) || y < this.minY || y > this.maxY) return;
    var i = this.idx(x, y, z);
    if (this.blocks[i] !== B.BEDROCK) this.blocks[i] = id;
  };
  Ctx.prototype.get = function (x, y, z) { return this.inside(x, z) && y >= this.minY && y <= this.maxY ? this.blocks[this.idx(x, y, z)] : -1; };
  Ctx.prototype.ground = function (x, z) { return this.hmap[((z - this.z0) << 4) | (x - this.x0)]; };
  // 地面から y まで土台で埋める
  Ctx.prototype.fillDown = function (x, y, z, id) {
    if (!this.inside(x, z)) return;
    for (var yy = y; yy > this.ground(x, z) - 1 && yy > y - 12; yy--) {
      var b = this.get(x, yy, z);
      if (yy <= this.ground(x, z) && b !== B.AIR && !WG.isWater(b) && WG.COLLIDE[b]) break;
      this.put(x, yy, z, id);
    }
  };
  function isPlant(id) { return WG.blockKind(id) === 'plant' || id === B.CACTUS; }

  Structures.prototype.draw = function (list, blocks, hmap, x0, z0, minY, maxY) {
    var c = new Ctx(blocks, hmap, x0, z0, minY, maxY), self = this;
    list.forEach(function (s) {
      if (s.kind === 'temple') self.drawTemple(c, s);
      else if (s.kind === 'mine') self.drawMine(c, s);
      else s.parts.forEach(function (p) {
        if (!hit(p, x0, z0, 1)) return;
        if (p.kind === 'road') self.drawRoad(c, s, p);
        else if (p.kind === 'well') self.drawWell(c, s, p);
        else if (p.kind === 'lamp') self.drawLamp(c, s, p);
        else if (p.type === 'farm') self.drawFarm(c, s, p);
        else self.drawHouse(c, s, p);
      });
    });
  };

  Structures.prototype.drawRoad = function (c, v, p) {
    for (var t = 3; t <= p.len; t++) for (var w = -1; w <= 1; w++) {
      var x = p.x + p.dx * t - p.dz * w, z = p.z + p.dz * t + p.dx * w;
      if (!c.inside(x, z)) continue;
      var g = c.ground(x, z), top = c.get(x, g, z);
      if (g < SEA || WG.isWater(c.get(x, g + 1, z))) { c.put(x, SEA, z, v.style.floor); continue; }   // 水の上は板の橋
      if (top === B.AIR) continue;   // 洞窟の口
      // 道の端は少し欠けさせる
      if (w !== 0 && rnd(this.seed, x, 5, z, SALT.VIL2) < 0.18) continue;
      c.put(x, g, z, v.style.path);
      if (isPlant(c.get(x, g + 1, z))) c.put(x, g + 1, z, B.AIR);
    }
  };

  Structures.prototype.drawWell = function (c, v, p) {
    var st = v.style, y = p.y;
    for (var dz = -2; dz <= 2; dz++) for (var dx = -2; dx <= 2; dx++) {
      var x = p.x + dx, z = p.z + dz, a = Math.max(Math.abs(dx), Math.abs(dz)), corner = Math.abs(dx) === 2 && Math.abs(dz) === 2;
      if (!c.inside(x, z)) continue;
      c.fillDown(x, y - 1, z, st.base);
      if (a <= 1) {
        // 水（3 段）
        c.put(x, y - 3, z, st.base);
        for (var k = -2; k <= 0; k++) c.put(x, y + k, z, B.WATER);
      } else {
        for (k = -3; k <= 1; k++) c.put(x, y + k, z, st.base);
      }
      for (k = 2; k <= 3; k++) c.put(x, y + k, z, corner ? st.post : B.AIR);
      c.put(x, y + 4, z, st.base);
      if (a <= 1) c.put(x, y + 1, z, B.AIR);
    }
    c.put(p.x, y + 5, p.z, B.TORCH);
  };

  Structures.prototype.drawLamp = function (c, v, p) {
    if (!c.inside(p.x, p.z)) return;
    var g = c.ground(p.x, p.z);
    if (g < SEA || WG.isWater(c.get(p.x, g + 1, p.z))) return;
    // 丸石の台に柵の柱を 2 本、上にトーチ（砂漠は砂岩の柱）
    var post = v.style.fence || v.style.post;
    c.put(p.x, g + 1, p.z, v.style.base);
    c.put(p.x, g + 2, p.z, post);
    c.put(p.x, g + 3, p.z, post);
    c.put(p.x, g + 4, p.z, B.TORCH);
  };

  // 畑：原木の枠、真ん中に水路、両側に湿った耕地と作物（種類は畑ごと、育ち具合はマスごと）
  Structures.prototype.drawFarm = function (c, vil, h) {
    var st = vil.style, W = h.W, D = h.D, f = h.y, mid = W >> 1;
    var kind = ['WHEAT', 'WHEAT', 'CARROTS', 'POTATOES'][(h.seed >>> 16) & 3], max = kind === 'WHEAT' ? 7 : 3;
    var frame = st.post === B.SANDSTONE ? B.SANDSTONE : st.post;
    for (var v = 0; v < D; v++) for (var u = 0; u < W; u++) {
      var X = h.ox + u * h.ux + v * h.vx, Z = h.oz + u * h.uz + v * h.vz;
      if (!c.inside(X, Z)) continue;
      c.fillDown(X, f - 1, Z, B.DIRT);
      for (var y = f + 1; y <= f + 4; y++) c.put(X, y, Z, B.AIR);
      var edge = u === 0 || v === 0 || u === W - 1 || v === D - 1;
      if (edge) { c.put(X, f, Z, frame); continue; }
      if (u === mid) { c.put(X, f, Z, B.WATER); c.put(X, f - 1, Z, B.DIRT); continue; }
      c.put(X, f, Z, B.FARMLAND_MOIST);
      var r = hash(this.seed, X, f, Z, SALT.VIL2);
      if ((r & 7) !== 0) c.put(X, f + 1, Z, B[kind + '_' + ((r >>> 3) % (max + 1))]);
    }
  };

  // 家。局所座標 (u, v) → 世界：o + u*U + v*V。入口は v=0 の真ん中、道の側。
  Structures.prototype.drawHouse = function (c, vil, h) {
    var st = vil.style, W = h.W, D = h.D, f = h.y, mid = W >> 1, type = h.type, rs = h.seed;
    var wall = type === 'smithy' ? B.COBBLESTONE : st.wall, flat = !st.roof;
    var wx = function (u, v) { return h.ox + u * h.ux + v * h.vx; }, wz = function (u, v) { return h.oz + u * h.uz + v * h.vz; };
    var P = function (u, y, v, id) { c.put(wx(u, v), y, wz(u, v), id); };
    var u, v, y, k;
    // 土台と床、中を空ける
    var roofTop = f + 4 + (flat ? 1 : (D + 1) >> 1);
    for (v = 0; v < D; v++) for (u = 0; u < W; u++) {
      var X = wx(u, v), Z = wz(u, v);
      if (!c.inside(X, Z)) continue;
      c.fillDown(X, f - 1, Z, st.base);
      var edge = u === 0 || v === 0 || u === W - 1 || v === D - 1;
      c.put(X, f, Z, edge ? st.base : (type === 'smithy' ? B.STONE_BRICKS : st.floor));
      for (y = f + 1; y <= roofTop + 1; y++) c.put(X, y, Z, B.AIR);
    }
    // 壁・柱・窓・入口
    for (v = 0; v < D; v++) for (u = 0; u < W; u++) {
      var corner = (u === 0 || u === W - 1) && (v === 0 || v === D - 1), side = u === 0 || u === W - 1, fb = v === 0 || v === D - 1;
      if (!side && !fb) continue;
      for (y = f + 1; y <= f + 3; y++) {
        var id = corner ? st.post : wall;
        if (!corner && y === f + 2) {
          // 窓：横の壁は奥行きの真ん中あたり、前後の壁は入口以外の 1 つおき
          if (side && D >= 5 && (v === 2 || (D >= 7 && v === D - 3))) id = B.GLASS;
          if (fb && u !== mid && (u === mid - 2 || u === mid + 2)) id = B.GLASS;
        }
        if (v === 0 && u === mid && y <= f + 2) id = B[st.door + '_DOOR_' + dirName(h.vx, h.vz) + 'C' + (y === f + 1 ? 'L' : 'U')];   // 入口の扉
        P(u, y, v, id);
      }
    }
    // 入口の前：段差を埋め、上にトーチ
    var dX = wx(mid, -1), dZ = wz(mid, -1);
    if (c.inside(dX, dZ)) {
      var g = c.ground(dX, dZ);
      if (g < f) for (y = g + 1; y <= f; y++) c.put(dX, y, dZ, st.base);
      else if (g === f) c.put(dX, g, dZ, st.path);
      for (y = f + 1; y <= f + 2; y++) c.put(dX, y, dZ, B.AIR);
    }
    P(mid, f + 3, -1, wallTorch(h.vx, h.vz));
    // 屋根
    if (flat) {
      for (v = -1; v <= D; v++) for (u = -1; u <= W; u++) {
        var rim = u === -1 || v === -1 || u === W || v === D;
        if (rim) { if ((u === -1 || u === W) && (v === -1 || v === D)) P(u, f + 4, v, st.post); continue; }
        P(u, f + 4, v, st.roof || st.wall);
        if ((u === 0 || u === W - 1 || v === 0 || v === D - 1) && ((u + v) & 1) === 0) P(u, f + 5, v, st.wall);
      }
    } else {
      for (k = 0; ; k++) {
        var lo = k - 1, hi = D - k;
        if (lo > hi) break;
        y = f + 4 + k;
        // 外側の列は階段（棟の方が高い向き）、内側は屋根の材料、棟が 1 列ならハーフブロック
        var sLo = B[st.stairs + '_STAIRS_' + dirName(h.vx, h.vz)], sHi = B[st.stairs + '_STAIRS_' + dirName(-h.vx, -h.vz)];
        for (u = -1; u <= W; u++) {
          if (lo === hi) { P(u, y, lo, B[st.stairs + '_SLAB']); continue; }
          P(u, y, lo, sLo); P(u, y, hi, sHi);
          if (lo + 1 < hi - 1) { P(u, y, lo + 1, st.roof); P(u, y, hi - 1, st.roof); }
          else if (lo + 1 === hi - 1) P(u, y, lo + 1, st.roof);
        }
        // 妻壁（屋根の下の三角）
        for (v = lo + 2; v <= hi - 2; v++) { P(0, y, v, wall); P(W - 1, y, v, wall); }
      }
    }
    // 中の家具（v=D-2 が奥の列）
    var bed = function (u0, v0) {
      // 足 (u0, v0) → 頭 (u0, v0+1)：奥向き
      var dn = dirName(h.vx, h.vz);
      P(u0, f + 1, v0, B['BED_FOOT_' + dn]); P(u0, f + 1, v0 + 1, B['BED_HEAD_' + dn]);
    };
    var torchIn = function (u0, v0, wu, wv) { P(u0, f + 3, v0, wallTorch(h.ux * wu + h.vx * wv, h.uz * wu + h.vz * wv)); };
    if (type === 'small') {
      bed(1, D - 3); P(W - 2, f + 1, D - 2, B.CRAFTING_TABLE); torchIn(mid, D - 2, 0, 1);
    } else if (type === 'house') {
      bed(1, D - 3); P(W - 2, f + 1, D - 2, B.CRAFTING_TABLE); P(W - 3, f + 1, D - 2, B.FURNACE);
      if (rs & 256) P(W - 2, f + 1, 1, B.CHEST);
      torchIn(mid, D - 2, 0, 1);
    } else if (type === 'big') {
      bed(1, D - 3); bed(W - 2, D - 3); P(mid, f + 1, D - 2, B.CHEST); P(1, f + 1, 1, B.CRAFTING_TABLE);
      torchIn(1, 2, -1, 0); torchIn(W - 2, 2, 1, 0);
    } else {
      // 鍛冶屋：かまど 2 台、チェスト、作業台
      P(1, f + 1, D - 2, B.FURNACE); P(2, f + 1, D - 2, B.FURNACE); P(W - 2, f + 1, D - 2, B.CHEST);
      P(W - 2, f + 1, 1, B.CRAFTING_TABLE); torchIn(mid, D - 2, 0, 1); torchIn(1, 2, -1, 0);
    }
  };

  Structures.prototype.drawTemple = function (c, t) {
    var g0 = t.y, fx = t.face[0], fz = t.face[1];
    for (var x = Math.max(t.x0, c.x0); x <= Math.min(t.x1, c.x0 + 15); x++) for (var z = Math.max(t.z0, c.z0); z <= Math.min(t.z1, c.z0 + 15); z++) {
      var dx = x - t.x, dz = z - t.z, adx = Math.abs(dx), adz = Math.abs(dz), a = Math.max(adx, adz);
      if (a > 10) continue;
      var along = dx * fx + dz * fz, across = Math.abs(dx * fz - dz * fx);   // 入口の向きに沿った距離と横のずれ
      // 土台（砂の起伏を埋める）
      c.fillDown(x, g0 - 1, z, B.SANDSTONE);
      for (var ly = -8; ly <= 11; ly++) {
        var y = g0 + ly, id = -1;
        if (ly < 0) {
          // 床下の隠し部屋（7×7、高さ 5）
          if (a <= 3 && ly >= -7) id = ly === -7 || a === 3 ? B.SANDSTONE : B.AIR;
          else if (a <= 10 && ly >= -2) id = B.SANDSTONE;
        } else if (ly === 0) {
          id = dx === 0 && dz === 0 ? B.AIR : (adx === adz && a >= 1 && a <= 4) || (a === 5 && (dx === 0 || dz === 0)) ? B.LAPIS_BLOCK : B.SANDSTONE;
        } else {
          var s = 11 - ly;   // この段の半分の幅
          if (a > s) id = ly <= 2 || isPlant(c.get(x, y, z)) ? B.AIR : -1;   // 段の外側：低いところの砂とサボテンを払う
          else {
            id = B.SANDSTONE;
            if (a <= 5 && ly <= 4) id = (adx === 3 && adz === 3) ? B.SANDSTONE : B.AIR;          // 広間と 4 本の柱
            if (along >= 5 && across <= 1 && ly <= 3) id = B.AIR;                                  // 入口の通路
            if (along >= 5 && across === 2 && ly <= 4 && a === s) id = B.SANDSTONE;              // 入口の枠
            if (a === s && ly === 4 && along >= 5 && across === 0) id = B.LAPIS_BLOCK;             // 入口の上の飾り
            if (ly === 11) id = B.GOLD_BLOCK;                                                      // てっぺん
          }
        }
        if (id >= 0) c.put(x, y, z, id);
      }
    }
    // 隠し部屋のチェスト、広間のトーチ
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (q) {
      c.put(t.x + q[0] * 2, g0 - 6, t.z + q[1] * 2, B.CHEST);
      if (q[0] !== fx || q[1] !== fz) c.put(t.x + q[0] * 5, g0 + 3, t.z + q[1] * 5, wallTorch(q[0], q[1]));
    });
  };

  Structures.prototype.drawMine = function (c, m) {
    var seed = this.seed;
    // 地表から 4 ブロック以上下だけ掘る（地上に穴をあけない）
    var dig = function (x, y, z, id) {
      if (!c.inside(x, z) || y > c.ground(x, z) - 4) return false;
      c.put(x, y, z, id); return true;
    };
    var floor = function (x, y, z) {
      if (!c.inside(x, z) || y > c.ground(x, z) - 4) return;
      var b = c.get(x, y, z);
      if (b === B.AIR || WG.FLUID[b]) c.put(x, y, z, B.OAK_PLANKS);
    };
    var r = m.room;
    if (hit(r, c.x0, c.z0, 0)) {
      for (var x = r.x0; x <= r.x1; x++) for (var z = r.z0; z <= r.z1; z++) {
        if (!c.inside(x, z)) continue;
        for (var y = r.y + 1; y <= r.y + 4; y++) dig(x, y, z, B.AIR);
        if (c.get(x, r.y, z) !== B.BEDROCK && r.y <= c.ground(x, z) - 4) c.put(x, r.y, z, B.DIRT);
      }
      dig(r.x0, r.y + 3, m.z + 3, wallTorch(-1, 0)); dig(r.x1, r.y + 3, m.z - 3, wallTorch(1, 0));
    }
    m.segs.forEach(function (sg) {
      if (!hit(sg, c.x0, c.z0, 0)) return;
      for (var t = 0; t < sg.len; t++) {
        var cxp = sg.x + sg.dx * t, czp = sg.z + sg.dz * t, support = t % 4 === 2, y0 = sg.y;
        for (var w = -1; w <= 1; w++) {
          var x = cxp - sg.dz * w, z = czp + sg.dx * w;
          if (!c.inside(x, z)) continue;
          floor(x, y0, z);
          for (var y = y0 + 1; y <= y0 + 3; y++) {
            var id = B.AIR;
            if (support && w !== 0 && y <= y0 + 2) id = B.OAK_FENCE;   // 柱（柵）
            if (support && y === y0 + 3) id = B.OAK_PLANKS;          // 梁
            else if (!support && w !== 0 && y >= y0 + 2 && (hash(seed, x, y, z, SALT.MINE) & 31) === 0) id = B.COBWEB;   // クモの巣
            dig(x, y, z, id);
          }
        }
        var hr = hash(seed, cxp, y0, czp, SALT.MINE2);
        // 柱の脇のトーチ（ときどき）とチェスト
        if (support && (hr & 3) === 0) {
          var s = (hr >>> 2) & 1 ? 1 : -1;
          dig(cxp + sg.dx - sg.dz * s, y0 + 2, czp + sg.dz + sg.dx * s, wallTorch(-sg.dx, -sg.dz));
        }
        if (!support && t > 3 && (hr >>> 4) % 37 === 0) {
          var s2 = (hr >>> 10) & 1 ? 1 : -1;
          dig(cxp - sg.dz * s2, y0 + 1, czp + sg.dx * s2, B.CHEST);
        }
      }
    });
  };

  WG.Structures = Structures;
})(typeof window !== 'undefined' ? window : globalThis);
