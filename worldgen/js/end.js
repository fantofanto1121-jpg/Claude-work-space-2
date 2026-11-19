// エンド（高さ 0〜255）
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, rnd = WG.rnd, hash = WG.hash;
  var H = 256, TOP = 62, R_MAIN = 90, PILLAR_R = 42;
  var S = { EDGE: 61, SURF: 62, THICK: 63, ISLAND: 64, ISLAND2: 65, ISHAPE: 66, PILLAR: 67, CHORUS: 68, CHORUS2: 69 };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function End(seed) {
    this.seed = seed;
    this.nEdge = new WG.Perlin(seed, S.EDGE);
    this.nSurf = new WG.Perlin(seed, S.SURF);
    this.nThick = new WG.Perlin(seed, S.THICK);
    this.nShape = new WG.Perlin(seed, S.ISHAPE);
    // 黒曜石の柱 10 本（中心から半径約 42 の円上）
    this.pillars = [];
    for (var i = 0; i < 10; i++) {
      var a = Math.PI * 2 * i / 10;
      this.pillars.push({
        x: Math.round(Math.cos(a) * PILLAR_R), z: Math.round(Math.sin(a) * PILLAR_R),
        top: 76 + hash(seed, i, 0, 0, S.PILLAR) % 28
      });
    }
  }
  End.prototype.minY = 0;
  End.prototype.height = H;

  // 外側の島：128×128 の区画ごとに約 35%。原点付近は作らない。
  End.prototype.islandAt = function (rx, rz) {
    var seed = this.seed;
    if (rnd(seed, rx, 0, rz, S.ISLAND) >= 0.35) return null;
    var h = hash(seed, rx, 1, rz, S.ISLAND2);
    var cx = rx * 128 + 26 + (h % 76), cz = rz * 128 + 26 + ((h >>> 8) % 76);
    if (cx * cx + cz * cz < 260 * 260) return null;
    return { x: cx, z: cz, r: 6 + ((h >>> 16) % 14), top: 50 + ((h >>> 21) % 35) };
  };

  // 列に島の上面と下面を入れる（なければ null）
  End.prototype.columnSpan = function (x, z, isl) {
    var d = Math.sqrt(x * x + z * z);
    var R = R_MAIN * (1 + this.nEdge.fbm2(x / 40, z / 40, 2) * 0.22);
    if (d < R) {
      var t = d / R;
      var top = d < 8 ? TOP : Math.round(TOP + this.nSurf.fbm2(x / 22, z / 22, 2) * 3 - Math.pow(t, 6) * 5);
      var thick = 3 + 52 * Math.pow(1 - t, 1.4) * (0.75 + 0.5 * (this.nThick.fbm2(x / 18, z / 18, 2) + 0.5));
      return [Math.round(top - thick), top];
    }
    if (isl) {
      var dx = x - isl.x, dz = z - isl.z, di = Math.sqrt(dx * dx + dz * dz);
      var Ri = isl.r * (1 + this.nShape.fbm2(x / 9, z / 9, 2) * 0.25);
      if (di < Ri) {
        var ti = di / Ri;
        var tp = isl.top + Math.round((1 - ti * ti) * 2);
        var th = 2 + Math.pow(1 - ti, 1.3) * isl.r * 1.2;
        return [Math.round(tp - th), tp];
      }
    }
    return null;
  };

  End.prototype.generate = function (cx, cz) {
    var seed = this.seed, x0 = cx << 4, z0 = cz << 4;
    var blocks = new Uint16Array(H << 8);
    var isl = this.islandAt(Math.floor(x0 / 128), Math.floor(z0 / 128));
    var i, y;
    for (i = 0; i < 256; i++) {
      var wx = x0 + (i & 15), wz = z0 + (i >> 4);
      var sp = this.columnSpan(wx, wz, isl);
      if (!sp) continue;
      var y0 = clamp(sp[0], 1, H - 1), y1 = clamp(sp[1], 1, H - 1);
      for (y = y0; y <= y1; y++) blocks[(y << 8) | i] = B.END_STONE;
    }
    // 黒曜石の柱（3×3）
    for (var p = 0; p < this.pillars.length; p++) {
      var pl = this.pillars[p];
      for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) {
        var lx = pl.x + dx - x0, lz = pl.z + dz - z0;
        if (lx < 0 || lx > 15 || lz < 0 || lz > 15) continue;
        for (y = 50; y <= pl.top; y++) blocks[(y << 8) | (lz << 4) | lx] = B.OBSIDIAN;
      }
    }
    // エンドポータルの枠（5×5 の外周 16 ブロック）
    for (var fz = -2; fz <= 2; fz++) for (var fx = -2; fx <= 2; fx++) {
      if (Math.abs(fx) !== 2 && Math.abs(fz) !== 2) continue;
      var ux = fx - x0, uz = fz - z0;
      if (ux < 0 || ux > 15 || uz < 0 || uz > 15) continue;
      blocks[((TOP + 1) << 8) | (uz << 4) | ux] = B.END_PORTAL_FRAME;
    }
    // コーラス（ポータルの近くには置かない）
    for (i = 0; i < 256; i++) {
      var wx2 = x0 + (i & 15), wz2 = z0 + (i >> 4);
      if (wx2 * wx2 + wz2 * wz2 < 24 * 24) continue;
      if (rnd(seed, wx2, 0, wz2, S.CHORUS) >= 0.0015) continue;
      for (y = H - 12; y > 1; y--) {
        var id = blocks[(y << 8) | i];
        if (id === B.AIR) continue;
        if (id === B.END_STONE) {
          var n = 4 + hash(seed, wx2, y, wz2, S.CHORUS2) % 4;
          for (var j = 1; j <= n + 1; j++) {
            var k = ((y + j) << 8) | i;
            if (blocks[k] !== B.AIR) break;
            blocks[k] = j === n + 1 ? B.CHORUS_FLOWER : B.CHORUS_PLANT;
          }
        }
        break;
      }
    }
    return { blocks: blocks, biome: null, hmap: null };
  };

  WG.End = End;
})(typeof window !== 'undefined' ? window : globalThis);
