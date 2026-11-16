// ネザー（高さ 0〜127）
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, rnd = WG.rnd, hash = WG.hash;
  var H = 128, LAVA_Y = 31;
  var S = { DENS: 41, BASALT: 42, SOUL: 43, SOUL2: 44, GLOW: 45, BEDROCK: 46, ORE: 47, MAGMA: 48, GLOWLEN: 49, FORT: 50 };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function Nether(seed) {
    this.seed = seed;
    this.nDens = new WG.Perlin(seed, S.DENS);
    this.nBasalt = new WG.Perlin(seed, S.BASALT);
    this.nSoul = new WG.Perlin(seed, S.SOUL);
    this.nSoul2 = new WG.Perlin(seed, S.SOUL2);
    this.nGlow = new WG.Perlin(seed, S.GLOW);
  }
  Nether.prototype.minY = 0;
  Nether.prototype.height = H;

  // 岩と空間を分ける密度。床と天井の近くほど岩が増える。
  Nether.prototype.density = function (x, y, z) {
    var n = this.nDens.fbm(x / 80, y / 42, z / 80, 3) * 1.7;
    var f = clamp((34 - y) / 34, 0, 1), c = clamp((y - 92) / 35, 0, 1);
    return n + f * f * 1.3 + c * c * 1.6 - 0.12;
  };

  // 要塞の廊下：128×128 の区画に約半分の確率。区画の内側に収める。
  Nether.prototype.fortressAt = function (rx, rz) {
    var seed = this.seed;
    if (rnd(seed, rx, 0, rz, S.FORT) >= 0.5) return null;
    var h = hash(seed, rx, 1, rz, S.FORT);
    return {
      axis: h & 1,
      a0: (h >>> 1) % 72 + 8,          // 長さ方向の始まり（区画内 8〜79、長さ 40）
      w: (h >>> 8) % 104 + 12,         // 幅方向の中心（区画内 12〜115）
      yf: 44 + (h >>> 16) % 26,        // 床の高さ
      rx: rx, rz: rz
    };
  };

  Nether.prototype.generate = function (cx, cz) {
    var seed = this.seed, x0 = cx << 4, z0 = cz << 4;
    var blocks = new Uint8Array(H << 8);
    var gyN = (H >> 3) + 1, D = new Float32Array(25 * gyN), gx, gy, gz;
    for (gy = 0; gy < gyN; gy++) for (gz = 0; gz < 5; gz++) for (gx = 0; gx < 5; gx++) {
      D[(gy * 5 + gz) * 5 + gx] = this.density(x0 + gx * 4, gy * 8, z0 + gz * 4);
    }
    var col = new Float32Array(gyN), i, y, idx;
    for (i = 0; i < 256; i++) {
      var x = i & 15, z = i >> 4, ax = x >> 2, az = z >> 2, fx = (x & 3) / 4, fz = (z & 3) / 4;
      var wx = x0 + x, wz = z0 + z;
      for (gy = 0; gy < gyN; gy++) {
        var k = (gy * 5 + az) * 5 + ax;
        col[gy] = D[k] * (1 - fx) * (1 - fz) + D[k + 1] * fx * (1 - fz) + D[k + 5] * (1 - fx) * fz + D[k + 6] * fx * fz;
      }
      for (y = 0; y < H; y++) {
        idx = (y << 8) | i;
        var g = y >> 3, f = (y & 7) / 8, d = col[g] + (col[g + 1] - col[g]) * f;
        var id;
        if (y === 0 || y === H - 1) id = B.BEDROCK;
        else if (y <= 4 && rnd(seed, wx, y, wz, S.BEDROCK) < (5 - y) / 5) id = B.BEDROCK;
        else if (y >= H - 5 && rnd(seed, wx, y, wz, S.BEDROCK) < (y - (H - 6)) / 5) id = B.BEDROCK;
        else if (d > 0) {
          id = B.NETHERRACK;
          if (this.nBasalt.noise(wx / 15, y / 12, wz / 15) > 0.5) id = B.BASALT;
          else if (y >= 10 && y <= 117) {
            var r = rnd(seed, wx, y, wz, S.ORE);
            if (r < 0.014) id = B.QUARTZ_ORE;
            else if (r < 0.020) id = B.NETHER_GOLD_ORE;
          }
        } else id = y <= LAVA_Y ? B.LAVA : B.AIR;
        blocks[idx] = id;
      }

      // 地表：ソウルサンド・ソウルソイルの斑点とマグマ
      var soul = this.nSoul.fbm2(wx / 26, wz / 26, 2) * 1.8;
      var soulKind = this.nSoul2.noise(wx / 7, 0.5, wz / 7) > 0 ? B.SOUL_SAND : B.SOUL_SOIL;
      for (y = LAVA_Y + 1; y < H - 6; y++) {
        idx = (y << 8) | i;
        if (blocks[idx] !== B.NETHERRACK || blocks[idx + 256] !== B.AIR) continue;
        if (soul > 0.3) {
          blocks[idx] = soulKind;
          if (blocks[idx - 256] === B.NETHERRACK) blocks[idx - 256] = soulKind;
        } else if (rnd(seed, wx, y, wz, S.MAGMA) < (y <= 40 ? 0.05 : 0.006)) {
          blocks[idx] = B.MAGMA;
        }
      }
      // 天井から下がるグロウストーン
      for (y = H - 7; y >= 60; y--) {
        idx = (y << 8) | i;
        if (blocks[idx] !== B.AIR || blocks[idx + 256] !== B.NETHERRACK) continue;
        if (this.nGlow.noise(wx / 7, y / 7, wz / 7) > 0.3) {
          var len = 1 + (hash(seed, wx, y, wz, S.GLOWLEN) % 4);
          for (var j = 0; j < len && blocks[idx - j * 256] === B.AIR; j++) blocks[idx - j * 256] = B.GLOWSTONE;
        }
      }
    }

    // 要塞の廊下（長さ 40、内側の幅 5、内側の高さ 4。床・壁・天井は玄武岩）
    var fo = this.fortressAt(Math.floor(x0 / 128), Math.floor(z0 / 128));
    if (fo) {
      var bx = fo.rx * 128, bz = fo.rz * 128;
      for (var lz = 0; lz < 16; lz++) for (var lx = 0; lx < 16; lx++) {
        var px = x0 + lx - bx, pz = z0 + lz - bz;
        var along = fo.axis ? pz : px, across = (fo.axis ? px : pz) - fo.w;
        if (along < fo.a0 || along >= fo.a0 + 40 || across < -3 || across > 3) continue;
        for (y = fo.yf; y <= fo.yf + 5; y++) {
          var inside = across >= -2 && across <= 2 && y > fo.yf && y < fo.yf + 5;
          blocks[(y << 8) | (lz << 4) | lx] = inside ? B.AIR : B.BASALT;
        }
      }
    }
    return { blocks: blocks, biome: null, hmap: null };
  };

  WG.Nether = Nether;
})(typeof window !== 'undefined' ? window : globalThis);
