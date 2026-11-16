// シードから作る 3 次元パーリンノイズと、それを重ねる fbm。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function grad(h, x, y, z) {
    h &= 15;
    var u = h < 8 ? x : y;
    var v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }

  function Perlin(seed, salt) {
    var perm = new Uint8Array(256), i, j, t;
    for (i = 0; i < 256; i++) perm[i] = i;
    // 並べ替えもハッシュで決める（状態を持つ乱数は使わない）
    for (i = 255; i > 0; i--) {
      j = WG.hash(seed, i, 0, 0, salt) % (i + 1);
      t = perm[i]; perm[i] = perm[j]; perm[j] = t;
    }
    this.p = new Uint8Array(512);
    for (i = 0; i < 512; i++) this.p[i] = perm[i & 255];
    this.ox = WG.rnd(seed, 1, 0, 0, salt) * 256;
    this.oy = WG.rnd(seed, 2, 0, 0, salt) * 256;
    this.oz = WG.rnd(seed, 3, 0, 0, salt) * 256;
  }

  Perlin.prototype.noise = function (x, y, z) {
    x += this.ox; y += this.oy; z += this.oz;
    var fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
    var X = fx & 255, Y = fy & 255, Z = fz & 255;
    x -= fx; y -= fy; z -= fz;
    var u = fade(x), v = fade(y), w = fade(z), p = this.p;
    var A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
    var B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    var a1 = grad(p[AA], x, y, z), b1 = grad(p[BA], x - 1, y, z);
    var a2 = grad(p[AB], x, y - 1, z), b2 = grad(p[BB], x - 1, y - 1, z);
    var a3 = grad(p[AA + 1], x, y, z - 1), b3 = grad(p[BA + 1], x - 1, y, z - 1);
    var a4 = grad(p[AB + 1], x, y - 1, z - 1), b4 = grad(p[BB + 1], x - 1, y - 1, z - 1);
    var l1 = a1 + u * (b1 - a1), l2 = a2 + u * (b2 - a2);
    var l3 = a3 + u * (b3 - a3), l4 = a4 + u * (b4 - a4);
    var m1 = l1 + v * (l2 - l1), m2 = l3 + v * (l4 - l3);
    return m1 + w * (m2 - m1);
  };

  // フラクタル（オクターブを重ねる）。結果は振幅の合計で割って正規化する。
  Perlin.prototype.fbm = function (x, y, z, oct) {
    var sum = 0, amp = 1, norm = 0, f = 1;
    for (var i = 0; i < oct; i++) {
      sum += amp * this.noise(x * f + i * 17.17, y * f + i * 31.31, z * f + i * 47.47);
      norm += amp; amp *= 0.5; f *= 2;
    }
    return sum / norm;
  };

  // 平面用（y を固定した断面）
  Perlin.prototype.fbm2 = function (x, z, oct) {
    return this.fbm(x, 0.37, z, oct);
  };

  WG.Perlin = Perlin;
})(typeof window !== 'undefined' ? window : globalThis);
