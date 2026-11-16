// 次元の一覧とチャンクの管理（キャッシュ、ブロックの読み出し、真上から見た要約）
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B;

  WG.DIMS = {
    overworld: {
      name: 'オーバーワールド', Gen: WG.Overworld, minY: -64, height: 384,
      view: { yMin: -64, yMax: 319, slice: 30, cy: 40 }, refY: 64,
      palette: { void: [22, 24, 28], skyTop: [138, 166, 192], skyLow: [203, 211, 216], cave: [28, 29, 32] }
    },
    nether: {
      name: 'ネザー', Gen: WG.Nether, minY: 0, height: 128,
      view: { yMin: 0, yMax: 90, slice: 40, cy: 64 }, refY: 40,
      palette: { void: [30, 16, 15], skyTop: [58, 30, 27], skyLow: [96, 48, 38], cave: [36, 19, 17] }
    },
    end: {
      name: 'エンド', Gen: WG.End, minY: 0, height: 256,
      view: { yMin: 0, yMax: 255, slice: 60, cy: 64 }, refY: 62,
      palette: { void: [17, 15, 23], skyTop: [20, 18, 28], skyLow: [44, 39, 56], cave: [20, 18, 26] }
    }
  };

  var LIMIT_FULL = 800, LIMIT_SURF = 400, LIMIT_SUM = 12000;

  function lruGet(map, key) {
    var v = map.get(key);
    if (v !== undefined) { map.delete(key); map.set(key, v); }
    return v;
  }
  function lruSet(map, key, v, limit) {
    map.set(key, v);
    if (map.size > limit) map.delete(map.keys().next().value);
  }

  function World(seedText, dimKey) {
    var D = WG.DIMS[dimKey];
    this.seedText = String(seedText);
    this.seed = WG.seedOf(seedText);
    this.dimKey = dimKey;
    this.dim = D;
    this.minY = D.minY;
    this.height = D.height;
    this.maxY = D.minY + D.height - 1;
    this.gen = new D.Gen(this.seed);
    this.full = new Map();
    this.surf = new Map();
    this.sums = new Map();
    this.genTime = 0;
    this.genCount = 0;
  }

  World.prototype._make = function (cx, cz, surfaceOnly) {
    var t0 = now();
    var r = this.gen.generate(cx, cz, surfaceOnly);
    var bl = r.blocks, top = bl.length - 1;
    while (top >= 0 && bl[top] === 0) top--;
    this.genTime += now() - t0;
    this.genCount++;
    return {
      cx: cx, cz: cz, minY: this.minY, height: this.height, blocks: bl,
      biome: r.biome, hmap: r.hmap, topY: top < 0 ? this.minY - 1 : this.minY + (top >> 8), surfaceOnly: !!surfaceOnly
    };
  };

  // チャンクを返す。surfaceOnly は地表だけ正しければよい場合（洞窟・部屋を省く）。
  World.prototype.chunk = function (cx, cz, surfaceOnly) {
    var key = cx + ',' + cz, c = lruGet(this.full, key);
    if (c) return c;
    if (surfaceOnly && this.gen.supportsSurfaceOnly) {
      c = lruGet(this.surf, key);
      if (!c) { c = this._make(cx, cz, true); lruSet(this.surf, key, c, LIMIT_SURF); }
      return c;
    }
    c = this._make(cx, cz, false);
    lruSet(this.full, key, c, LIMIT_FULL);
    return c;
  };

  World.prototype.hasChunk = function (cx, cz) { return this.full.has(cx + ',' + cz); };

  World.prototype.block = function (x, y, z) {
    if (y < this.minY || y > this.maxY) return B.AIR;
    var c = this.chunk(x >> 4, z >> 4);
    return c.blocks[((y - this.minY) << 8) | ((z & 15) << 4) | (x & 15)];
  };

  // 生成済みのときだけ読む（-1 は未生成）
  World.prototype.peekBlock = function (x, y, z) {
    if (y < this.minY || y > this.maxY) return B.AIR;
    var c = this.full.get((x >> 4) + ',' + (z >> 4));
    return c ? c.blocks[((y - this.minY) << 8) | ((z & 15) << 4) | (x & 15)] : -1;
  };

  // 真上から見た要約：yMax から下へ見て最初のブロック、水ならその底も。
  World.prototype.summary = function (cx, cz, yMax) {
    var key = cx + ',' + cz + ',' + yMax, s = lruGet(this.sums, key);
    if (s) return s;
    // 上端が世界の最上段なら、洞窟は地表に届かないので地表だけの生成で足りる
    var c = this.chunk(cx, cz, yMax >= this.maxY);
    var topId = new Uint8Array(256), topY = new Int16Array(256), floorId = new Uint8Array(256), floorY = new Int16Array(256);
    var bl = c.blocks, minY = this.minY, start = Math.min(yMax, c.topY);
    for (var i = 0; i < 256; i++) {
      var y = start, id = 0;
      for (; y >= minY; y--) { id = bl[((y - minY) << 8) | i]; if (id !== 0) break; }
      if (y < minY) { topId[i] = 0; topY[i] = minY; floorId[i] = 0; floorY[i] = minY; continue; }
      topId[i] = id; topY[i] = y;
      if (id === B.WATER || id === B.LAVA) {
        var fy = y - 1, fid = 0;
        for (; fy >= minY; fy--) { fid = bl[((fy - minY) << 8) | i]; if (fid !== id && fid !== 0) break; }
        floorId[i] = fy >= minY ? fid : 0; floorY[i] = Math.max(fy, minY);
      } else { floorId[i] = id; floorY[i] = y; }
    }
    s = { topId: topId, topY: topY, floorId: floorId, floorY: floorY, biome: c.biome };
    lruSet(this.sums, key, s, LIMIT_SUM);
    return s;
  };

  World.prototype.peekSummary = function (cx, cz, yMax) {
    return this.sums.get(cx + ',' + cz + ',' + yMax) || null;
  };

  World.prototype.biomeAt = function (x, z) {
    if (!this.gen.column) return -1;
    return this.gen.column(x, z).b;
  };

  function now() {
    return (typeof performance !== 'undefined' ? performance : Date).now();
  }

  WG.World = World;
  WG.now = now;
})(typeof window !== 'undefined' ? window : globalThis);
