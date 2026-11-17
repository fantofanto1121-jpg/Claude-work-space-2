// 光。空からの光（スカイライト）とブロックが出す光（ブロックライト）を 0〜15 で求める。
// Minecraft と同じく、光は 1 マス進むごとに 1（葉・水・氷を通ると 1 余分に）弱まり、不透明なブロックで止まる。
// 空からの光は、真下へは弱まらずに届く（葉や水を通るときだけ弱まる）。
// 1 チャンクの明るさは、周り 16 マスまで含めた 48×48 の範囲で広げて求める。
// 光は 15 マスまでしか届かないので、こうすると隣のチャンクから来る光も正しく入る。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var EMIT = WG.LIGHT_EMIT, BLK = WG.LIGHT_BLOCK;
  var RS = 50;                       // 範囲の一辺（48 マス＋外側の壁 1 マスずつ）
  var cap = 0, OPA, SKY, BL, Q;

  function ensure(n) {
    if (n <= cap) return;
    OPA = new Uint8Array(n); SKY = new Uint8Array(n); BL = new Uint8Array(n); Q = new Int32Array(n);
    cap = n;
  }

  // 光を広げる（幅優先）。L は SKY か BL。
  function spread(L, head, tail, n, layer) {
    var steps = [1, -1, RS, -RS, layer, -layer];
    while (head !== tail) {
      var i = Q[head]; head = head + 1 === n ? 0 : head + 1;
      var lv = L[i];
      if (lv <= 1) continue;
      for (var k = 0; k < 6; k++) {
        var j = i + steps[k], o = OPA[j];
        if (o >= 15) continue;
        var nl = lv - (o > 1 ? o : 1);
        if (nl > L[j]) {
          L[j] = nl;
          var t2 = tail + 1 === n ? 0 : tail + 1;
          if (t2 !== head) { Q[tail] = j; tail = t2; }
        }
      }
    }
  }

  // 1 チャンク分の明るさ。チャンクの体積と同じ並び（18×18×(高さ＋2)、周り 1 マスを含む）で、
  // 1 マス 1 バイト（上位 4 ビットが空の光、下位 4 ビットがブロックの光）。
  WG.chunkLight = function (world, cx, cz) {
    var H = world.height, layer = RS * RS, n = layer * (H + 2), hasSky = world.dimKey === 'overworld';
    ensure(n);
    OPA.fill(15, 0, n); SKY.fill(0, 0, n); BL.fill(0, 0, n);
    var head = 0, tail = 0, maxTop = 0, x, y, z, ri, id;
    // 9 チャンク分の、光の遮り方と光源
    for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) {
      var bl = world.chunk(cx + dx, cz + dz).blocks;
      for (y = 0; y < H; y++) {
        var src = y << 8, rowY = (y + 1) * RS;
        for (z = 0; z < 16; z++) {
          var base = (rowY + (dz + 1) * 16 + z + 1) * RS + (dx + 1) * 16 + 1, s2 = src | (z << 4);
          for (x = 0; x < 16; x++) {
            id = bl[s2 | x];
            ri = base + x;
            OPA[ri] = BLK[id];
            if (id !== 0 && y + 1 > maxTop) maxTop = y + 1;
            if (EMIT[id]) { BL[ri] = EMIT[id]; Q[tail++] = ri; }
          }
        }
      }
    }
    spread(BL, head, tail, n, layer);

    if (hasSky) {
      // 上からまっすぐ届く光
      for (z = 1; z <= 48; z++) for (x = 1; x <= 48; x++) {
        var lv = 15;
        for (y = H; y >= 1; y--) {
          ri = (y * RS + z) * RS + x;
          var o = OPA[ri];
          if (o >= 15) break;
          if (o > 0) { lv -= o; if (lv <= 0) break; }
          SKY[ri] = lv;
        }
      }
      // 横や下の暗い所へ広がり始める場所だけを種にする（高い所はどこも 15 なので見なくてよい）
      head = 0; tail = 0;
      var top = Math.min(H, maxTop + 1);
      for (y = 1; y <= top; y++) for (z = 1; z <= 48; z++) {
        ri = (y * RS + z) * RS + 1;
        for (x = 1; x <= 48; x++, ri++) {
          var v = SKY[ri];
          if (v <= 1) continue;
          if ((SKY[ri + 1] < v - 1 && OPA[ri + 1] < 15) || (SKY[ri - 1] < v - 1 && OPA[ri - 1] < 15) ||
            (SKY[ri + RS] < v - 1 && OPA[ri + RS] < 15) || (SKY[ri - RS] < v - 1 && OPA[ri - RS] < 15) ||
            (SKY[ri - layer] < v - 1 && OPA[ri - layer] < 15)) {
            if (tail < n - 1) Q[tail++] = ri;
          }
        }
      }
      spread(SKY, head, tail, n, layer);
    }

    // 真ん中のチャンクと周り 1 マスを取り出す
    var out = new Uint8Array(18 * 18 * (H + 2));
    for (var vy = 0; vy < H + 2; vy++) for (var vz = 0; vz < 18; vz++) {
      var oi = (vy * 18 + vz) * 18, rb = (vy * RS + vz + 16) * RS + 16;
      for (var vx = 0; vx < 18; vx++) {
        var sk = vy === H + 1 ? (hasSky ? 15 : 0) : SKY[rb + vx];
        out[oi + vx] = (sk << 4) | BL[rb + vx];
      }
    }
    return out;
  };

  // 明るさ（0〜15）を画面の明るさへ。Minecraft の明るさの曲線と、明るさ設定「中」に近い補正。
  // ambient は暗闇でも残る明るさ（ネザーとエンドは空の光がないので高め）。
  var CURVE = [];
  for (var l = 0; l <= 15; l++) {
    var f = l / 15, b = f / (4 - 3 * f), g = 1 - Math.pow(1 - b, 4);
    CURVE[l] = b + (g - b) * 0.5;
  }
  WG.lightCurve = CURVE;
  WG.AMBIENT = { overworld: 0.05, nether: 0.2, end: 0.4 };
})(typeof window !== 'undefined' ? window : globalThis);
