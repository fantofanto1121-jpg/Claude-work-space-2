// 2D 表示の色づけ（真上からの地形図・水平断面・縦断面）。DOM を使わないので Node.js でも動く。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, OPQ = WG.OPAQUE;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function jitter(x, y, z) { return 0.965 + (WG.hash(0, x, y, z, 7) & 255) / 255 * 0.07; }
  function put(out, o, r, g, b) { out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255; }

  // 真上からの地形図（16×16 ピクセル）。陰影は北西からの光、水は深さで色を沈める。
  function topTile(world, cx, cz, yMax, out) {
    var s = world.summary(cx, cz, yMax);
    var sw = world.summary(cx - 1, cz, yMax), sn = world.summary(cx, cz - 1, yMax);
    var pal = world.dim.palette, refY = world.dim.refY;
    var x0 = cx << 4, z0 = cz << 4;
    for (var i = 0; i < 256; i++) {
      var x = i & 15, z = i >> 4, o = i * 4, id = s.topId[i], y = s.topY[i];
      if (id === 0) { put(out, o, pal.void[0], pal.void[1], pal.void[2]); continue; }
      var bio = s.biome ? s.biome[i] : -1;
      var c = WG.blockColor(id, 'top', bio), r = c[0], g = c[1], b = c[2];
      var fluid = id === B.WATER || id === B.LAVA;
      var hy = fluid ? s.floorY[i] : y;
      var hw = x > 0 ? (fluid ? s.floorY[i - 1] : s.topY[i - 1]) : (fluid ? sw.floorY[i + 15] : sw.topY[i + 15]);
      var hn = z > 0 ? (fluid ? s.floorY[i - 16] : s.topY[i - 16]) : (fluid ? sn.floorY[i + 240] : sn.topY[i + 240]);
      var sh = 1 + clamp((hy - hw) * 0.07 + (hy - hn) * 0.07, -0.3, 0.3);
      if (id === B.WATER) {
        var fc = WG.blockColor(s.floorId[i], 'top', bio), depth = y - s.floorY[i];
        var k = 0.52 + 0.42 * (1 - Math.exp(-depth / 7));
        var fs = 0.78 * (1 + (sh - 1) * 0.6);
        r = fc[0] * fs * (1 - k) + r * k; g = fc[1] * fs * (1 - k) + g * k; b = fc[2] * fs * (1 - k) + b * k;
        sh = 1 - 0.18 * (1 - Math.exp(-depth / 18));
      } else if (id === B.LAVA) {
        sh = 1;
      }
      sh *= 0.95 + clamp((y - refY) / 420, -0.12, 0.2);
      sh *= jitter(x0 + x, y, z0 + z);
      put(out, o, clamp(r * sh, 0, 255), clamp(g * sh, 0, 255), clamp(b * sh, 0, 255));
    }
    return out;
  }

  // 指定した高さの水平断面（16×16 ピクセル）。空気の場所は下にあるものを暗く見せる。
  function sliceTile(world, cx, cz, y, out) {
    var c = world.chunk(cx, cz), bl = c.blocks, minY = world.minY, maxY = world.maxY;
    var pal = world.dim.palette, x0 = cx << 4, z0 = cz << 4, yi = y - minY;
    for (var i = 0; i < 256; i++) {
      var o = i * 4, id = bl[(yi << 8) | i], bio = c.biome ? c.biome[i] : -1, wx = x0 + (i & 15), wz = z0 + (i >> 4);
      if (id !== 0) {
        var col = WG.blockColor(id, 'top', bio);
        var above = y < maxY ? bl[((yi + 1) << 8) | i] : 0;
        var sh = (OPQ[above] ? 0.84 : 1.0) * jitter(wx, y, wz);
        put(out, o, clamp(col[0] * sh, 0, 255), clamp(col[1] * sh, 0, 255), clamp(col[2] * sh, 0, 255));
        continue;
      }
      var k, hit = 0;
      for (k = 1; k <= 40 && yi - k >= 0; k++) { hit = bl[((yi - k) << 8) | i]; if (hit !== 0) break; }
      if (hit === 0) { put(out, o, pal.void[0], pal.void[1], pal.void[2]); continue; }
      var hc = WG.blockColor(hit, 'top', bio), m = 0.62 * Math.exp(-(k - 1) / 14);
      var e = 1 - m;
      put(out, o, hc[0] * m + pal.void[0] * e, hc[1] * m + pal.void[1] * e, hc[2] * m + pal.void[2] * e);
    }
    return out;
  }

  // 縦断面。axis 0 は x 方向（z = line で切る）、1 は z 方向（x = line で切る）。
  // 幅 16、高さ yMax - yMin + 1 のピクセル（上が yMax）。
  function sectionTile(world, axis, line, ci, yMin, yMax, out) {
    var cx = axis === 0 ? ci : line >> 4, cz = axis === 0 ? line >> 4 : ci;
    var c = world.chunk(cx, cz), bl = c.blocks, minY = world.minY, maxY = world.maxY, pal = world.dim.palette;
    var rows = yMax - yMin + 1;
    for (var u = 0; u < 16; u++) {
      var lx = axis === 0 ? u : line & 15, lz = axis === 0 ? line & 15 : u, i = (lz << 4) | lx;
      var wx = (cx << 4) + lx, wz = (cz << 4) + lz, bio = c.biome ? c.biome[i] : -1;
      var covered = false;
      for (var y = maxY; y > yMax; y--) if (OPQ[bl[((y - minY) << 8) | i]]) { covered = true; break; }
      var prev = yMax < maxY ? bl[((yMax + 1 - minY) << 8) | i] : 0;
      for (y = yMax; y >= yMin; y--) {
        var o = ((yMax - y) * 16 + u) * 4, id = bl[((y - minY) << 8) | i];
        if (id !== 0) {
          var col = WG.blockColor(id, OPQ[prev] ? 'side' : 'top', bio);
          var sh = (OPQ[prev] || prev === B.WATER ? 0.9 : 1.06) * jitter(wx, y, wz);
          if (id === B.WATER) sh = 0.95;
          put(out, o, clamp(col[0] * sh, 0, 255), clamp(col[1] * sh, 0, 255), clamp(col[2] * sh, 0, 255));
          if (OPQ[id]) covered = true;
        } else if (covered) {
          put(out, o, pal.cave[0], pal.cave[1], pal.cave[2]);
        } else {
          var t = clamp((y - minY) / (maxY - minY), 0, 1);
          put(out, o, pal.skyLow[0] + (pal.skyTop[0] - pal.skyLow[0]) * t,
            pal.skyLow[1] + (pal.skyTop[1] - pal.skyLow[1]) * t,
            pal.skyLow[2] + (pal.skyTop[2] - pal.skyLow[2]) * t);
        }
        prev = id;
      }
    }
    return out;
  }

  WG.Paint = { topTile: topTile, sliceTile: sliceTile, sectionTile: sectionTile };
})(typeof window !== 'undefined' ? window : globalThis);
