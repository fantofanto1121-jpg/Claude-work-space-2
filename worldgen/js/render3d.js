// 3D（立体）表示。WebGL で、見える面だけを描く。
// 面ごとの明るさ、頂点ごとの環境遮蔽、ブロックごとの明るさのずれ、遠くの霞をつける。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, OPQ = WG.OPAQUE, EMIT = WG.EMIT, LIGHT_EM = WG.LIGHT_EMIT;
  var ORV = { N: [0, 0, -1], S: [0, 0, 1], E: [1, 0, 0], W: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0] };

  // ---- 立体の範囲（体積データ） ----
  // 周囲 1 ブロックは空気で囲む。上端より上・下端より下・横の外側は空気として扱うので、切り口の面も描かれる。
  function Volume(world, x0, z0, size, yMin, yMax) {
    this.x0 = x0; this.z0 = z0; this.size = size; this.yMin = yMin; this.yMax = yMax;
    this.ny = yMax - yMin + 1;
    this.sx = size + 2; this.sz = size + 2; this.sy = this.ny + 2;
    this.v = new Uint16Array(this.sx * this.sz * this.sy);
    this.bio = new Int8Array(size * size).fill(-1);
    this.world = world;
  }
  Volume.prototype.fillChunk = function (c) {
    var minY = c.minY, lx0 = (c.cx << 4) - this.x0, lz0 = (c.cz << 4) - this.z0, sx = this.sx, sz = this.sz, v = this.v;
    for (var y = this.yMin; y <= this.yMax; y++) {
      var src = (y - minY) << 8, vy = y - this.yMin + 1;
      for (var z = 0; z < 16; z++) {
        var row = (vy * sz + (lz0 + z + 1)) * sx + lx0 + 1;
        for (var x = 0; x < 16; x++) v[row + x] = c.blocks[src | (z << 4) | x];
      }
    }
    if (c.biome) {
      for (var i = 0; i < 256; i++) this.bio[(lz0 + (i >> 4)) * this.size + lx0 + (i & 15)] = c.biome[i];
    }
  };
  Volume.prototype.at = function (vx, vy, vz) {
    if (vx < 0 || vy < 0 || vz < 0 || vx >= this.sx || vy >= this.sy || vz >= this.sz) return 0;
    return this.v[(vy * this.sz + vz) * this.sx + vx];
  };

  // ---- 見た目のアトラス ----
  // 16×16 の見た目を 32×32 枚並べた 512×512。0 番は白（見た目のないブロック用）。同じ絵は 1 枚にまとめる。
  // ブロックの見た目（js/tex16.js）もアイテムのアイコンも 16×16。古い 8×8 の絵は 2 倍に広げて入れる。
  var FACE_IX = { top: 0, side: 1, bottom: 2 }, ATLAS = 512, ATLAS_H = 512, PER_ROW = 32, TS = 16, tileTable = null, atlasPixels = null, seen = {};
  function atlas() {
    if (tileTable) return tileTable;
    tileTable = new Uint16Array(WG.BLOCKS.length * 3);
    atlasPixels = new Uint8Array(ATLAS * ATLAS_H * 4);
    var n = 0;
    // 1 枚を置く。src は RGB（3）か RGBA（4）、辺は 8 か 16。src がなければ白。
    function put(src, ch, sig) {
      if (seen[sig] != null) return seen[sig];
      seen[sig] = n;
      var side = src ? Math.round(Math.sqrt(src.length / ch)) : TS, sh = TS / side;
      var tx = (n % PER_ROW) * TS, ty = ((n / PER_ROW) | 0) * TS;
      for (var j = 0; j < TS; j++) for (var i = 0; i < TS; i++) {
        var o = ((ty + j) * ATLAS + tx + i) * 4;
        if (!src) { atlasPixels[o] = atlasPixels[o + 1] = atlasPixels[o + 2] = atlasPixels[o + 3] = 255; continue; }
        var q = (((j / sh) | 0) * side + ((i / sh) | 0)) * ch;
        atlasPixels[o] = src[q]; atlasPixels[o + 1] = src[q + 1]; atlasPixels[o + 2] = src[q + 2]; atlasPixels[o + 3] = ch === 4 ? src[q + 3] : 255;
      }
      return n++;
    }
    function tile(src) { return put(src, 3, src ? Array.prototype.join.call(src) : 'white'); }
    function rgbaTile(px) { return put(px, 4, 'a' + Array.prototype.join.call(px)); }
    tile(null);
    WG.BLOCKS.forEach(function (b) {
      ['top', 'side', 'bottom'].forEach(function (f) {
        var px = WG.skinTexture(b.id, f);
        tileTable[b.id * 3 + FACE_IX[f]] = px ? tile(px) : 0;
      });
    });
    // 草花は見た目がないので、形だけの切り抜きを作る（色は blocks.js の色）。透明な所は描かない。
    Object.keys(PLANT_SHAPE).forEach(function (key) {
      tileTable[WG.B[key] * 3 + FACE_IX.side] = rgbaTile(plantPixels(WG.B[key], false));
    });
    // 切り抜きの見た目があるブロック（トーチ）は、横の面をそれにする
    WG.BLOCKS.forEach(function (b) {
      var cut = WG.skinCutout(b.id);
      if (!cut) return;
      var t = rgbaTile(cut);
      tileTable[b.id * 3 + FACE_IX.side] = t;
      if (WG.cutoutAllFaces(b.id)) tileTable[b.id * 3 + FACE_IX.top] = tileTable[b.id * 3 + FACE_IX.bottom] = t;
    });
    // ブロックではないアイテムの絵と、壊している途中のひび（4 段階）
    if (WG.ITEMS) Object.keys(WG.ITEMS).forEach(function (k) {
      var px = (WG.itemIcon16 && WG.itemIcon16(k)) || WG.itemPixels(k);
      if (px) itemTiles[k] = rgbaTile(px);
    });
    // ブロックではない追加の見た目（レッドストーンの粉の線など）
    if (WG.EXTRA_TILES) Object.keys(WG.EXTRA_TILES).forEach(function (k) { extraTiles[k] = rgbaTile(WG.EXTRA_TILES[k]); });
    CRACKS.forEach(function (rows, st) {
      if (extraTiles['CRACK_' + st] != null) { crackTiles.push(extraTiles['CRACK_' + st]); return; }
      var px = new Uint8Array(256);
      for (var i = 0; i < 64; i++) if (rows[i >> 3][i & 7] === '#') px[i * 4 + 3] = 255;
      crackTiles.push(rgbaTile(px));
    });
    return tileTable;
  }
  var itemTiles = {}, crackTiles = [], extraTiles = {};
  var CRACKS = [
    ['........', '........', '...#....', '....#...', '...##...', '........', '........', '........'],
    ['........', '..#.....', '...#..#.', '....##..', '...##...', '..#..#..', '........', '........'],
    ['.#......', '..#...#.', '...#.##.', '....##..', '..###...', '.#...#..', '#....#..', '........'],
    ['.#....#.', '..#..#..', '#..#.##.', '.#..##.#', '..###...', '##.#.#..', '#..#..#.', '..#....#']
  ];
  // 草花の切り抜き（RGBA 8×8）。forIcon なら草も緑で塗る（地図の色味は頂点の色で付けるので、面では白）。
  function plantPixels(id, forIcon) {
    var key = WG.BLOCKS[id].key, rows = PLANT_SHAPE[key];
    if (!rows) return null;
    var head = WG.skinColor(id), stem = [79, 122, 46], grass = forIcon ? WG.blockColor(id, 'side', WG.BI ? WG.BI.PLAINS : -1) : [255, 255, 255];
    var out = new Uint8Array(256);
    for (var i = 0; i < 64; i++) {
      var ch = rows[i >> 3][i & 7];
      if (ch === '.') continue;
      var c = ch === 'G' ? stem : key === 'SHORT_GRASS' ? grass : head;
      out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255;
    }
    return out;
  }
  WG.plantPixels = function (id) { return plantPixels(id, true); };
  // アトラスの番号を引く（落ちているアイテムやひびを描くとき）
  WG.atlasTile = function (id, face) { return atlas()[id * 3 + FACE_IX[face || 'side']]; };
  WG.itemTile = function (key) { atlas(); return itemTiles[key]; };
  WG.extraTile = function (key) { atlas(); return extraTiles[key]; };
  WG.crackTile = function (stage) { atlas(); return crackTiles[Math.max(0, Math.min(3, stage))]; };
  var PLANT_SHAPE = {
    SHORT_GRASS: ['........', '..#.....', '..#..#..', '.##..#..', '.#..##.#', '##..#..#', '.#.##.#.', '##.#..##'],
    DANDELION: ['........', '........', '..HHH...', '..HHH...', '...G....', '...G.G..', '...GG...', '...G....'],
    POPPY: ['........', '..HHH...', '.HHHHH..', '..HHH...', '...G....', '..GG....', '...G.G..', '...GG...']
  };

  // ---- 面の作成 ----
  // 方向: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z
  var DIRS = [
    { n: [1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], face: 'side', shade: 0.86 },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], face: 'side', shade: 0.66 },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], face: 'top', shade: 1.0 },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], face: 'bottom', shade: 0.5 },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], face: 'side', shade: 0.74 },
    { n: [0, 0, -1], u: [1, 0, 0], v: [0, 1, 0], face: 'side', shade: 0.8 }
  ];
  var AO = [0.5, 0.67, 0.84, 1.0];
  var CORNERS = [[0, 0], [1, 0], [1, 1], [0, 1]];
  var P = 16; // 位置は 1/16 ブロック単位の整数で持つ

  function Buf() { this.cap = 0; this.nv = 0; this.ni = 0; this.grow(4096); }
  Buf.prototype.grow = function (cap) {
    var pos = new Int16Array(cap * 4), col = new Uint8Array(cap * 4), uv = new Uint8Array(cap * 4), lt = new Uint8Array(cap * 4), idx = new Uint32Array(cap * 3 / 2);
    if (this.pos) { pos.set(this.pos); col.set(this.col); uv.set(this.uv); lt.set(this.lt); idx.set(this.idx); }
    this.pos = pos; this.col = col; this.uv = uv; this.lt = lt; this.idx = idx; this.cap = cap;
    if (this.curS == null) { this.curS = 255; this.curB = 0; }
  };
  // 色は 2 倍して使う（明るさ 1 = 127.5）。tu, tv は面の中の位置（0〜16）、tile はアトラスの番号。
  Buf.prototype.vert = function (x, y, z, r, g, b, a, tu, tv, tile) {
    if (this.nv >= this.cap) this.grow(this.cap * 2);
    var o = this.nv * 4;
    this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = z;
    this.col[o] = r; this.col[o + 1] = g; this.col[o + 2] = b; this.col[o + 3] = a;
    this.uv[o] = tu; this.uv[o + 1] = tv; this.uv[o + 2] = tile & 255; this.uv[o + 3] = tile >> 8;
    // 光の段階（空の光 × 17、ブロックの光 × 17）。明るさは描くときに時刻に合わせて決める。
    this.lt[o] = this.curS; this.lt[o + 1] = this.curB;
    return this.nv++;
  };
  Buf.prototype.quad = function (v0, flip) {
    var o = this.ni, d = this.idx;
    if (flip) { d[o] = v0 + 1; d[o + 1] = v0 + 2; d[o + 2] = v0 + 3; d[o + 3] = v0 + 1; d[o + 4] = v0 + 3; d[o + 5] = v0; }
    else { d[o] = v0; d[o + 1] = v0 + 1; d[o + 2] = v0 + 2; d[o + 3] = v0; d[o + 4] = v0 + 2; d[o + 5] = v0 + 3; }
    this.ni += 6;
  };
  Buf.prototype.trim = function () {
    return { pos: this.pos.subarray(0, this.nv * 4), col: this.col.subarray(0, this.nv * 4), uv: this.uv.subarray(0, this.nv * 4), lt: this.lt.subarray(0, this.nv * 4), idx: this.idx.subarray(0, this.ni) };
  };

  function c8(v) { return v > 255 ? 255 : v < 0 ? 0 : v | 0; }

  // 範囲の一部（vx0..vx1, vz0..vz1：体積の座標）の面を作る
  // 見た目のあるブロックは「白 × 色味 × 明るさ」、ないブロックは「代表色 × 明るさ」を頂点の色にする
  function faceBase(id, face, bio) {
    return WG.skinTexture(id, face) ? WG.tintOf(id, face, bio).map(function (m) { return m * 255; }) : WG.blockColor(id, face, bio);
  }

  function meshPart(vol, vx0, vz0, vx1, vz1) {
    var TT = atlas();
    var v = vol.v, sx = vol.sx, sz = vol.sz, sxz = sx * sz;
    var op = new Buf(), wa = new Buf();
    var dOff = DIRS.map(function (d) { return d.n[0] + d.n[2] * sx + d.n[1] * sxz; });
    var uOff = DIRS.map(function (d) { return d.u[0] + d.u[2] * sx + d.u[1] * sxz; });
    var vOff = DIRS.map(function (d) { return d.v[0] + d.v[2] * sx + d.v[1] * sxz; });
    var ao = [0, 0, 0, 0], FL = WG.FLUID, FLV = WG.FLUID_LEVEL;
    // 明るさ（歩く表示のときだけ。立体の模型では切り口が暗くならないよう、明るさを付けない）
    var LT = vol.light || null, amb = vol.ambient || 0, CUR = WG.lightCurve, LB = [1, 0.9, 0.76];
    var lit = [1, 1, 1];
    // 光は色に焼き込まず、段階を頂点に持たせる（昼と夜で作り直さなくてよいように）
    function setL(sky, blk) { op.curS = wa.curS = Math.round(sky); op.curB = wa.curB = Math.round(blk); }
    function light(sky, blk) { setL(sky * 17, blk * 17); lit[0] = lit[1] = lit[2] = 1; return lit; }
    function noLight() { setL(255, 0); lit[0] = lit[1] = lit[2] = 1; return lit; }
    void amb; void CUR; void LB;
    // 角の明るさ：角を囲む空いたマスの光の平均（Minecraft のなめらかな明るさ）
    function cornerLight(cells, n) {
      var s = 0, b = 0, m = 0;
      for (var q = 0; q < n; q++) { var lv = LT[cells[q]]; s += lv >> 4; b += lv & 15; m++; }
      return light(s / m, b / m);
    }
    var cells = [0, 0, 0, 0];
    // 流体の高さ（1/16 単位）。元と落ちているものは 8/9、流れは段階に合わせて低い。
    function fh(id, type) {
      if (FL[id] !== type) return -1;
      var lv = FLV[id];
      return lv === 0 || lv === 8 ? 14.22 : (8 - lv) / 9 * 16;
    }
    // 角の高さ：角を囲む 4 マスの平均（上に同じ流体があれば満杯、元は重く数える）
    function cornerH(i, cx, cz, type) {
      var c4 = [i, i + (cx ? 1 : -1), i + (cz ? sx : -sx), i + (cx ? 1 : -1) + (cz ? sx : -sx)], sum = 0, wsum = 0;
      for (var q = 0; q < 4; q++) {
        var id2 = v[c4[q]];
        if (FL[v[c4[q] + sxz]] === type && FL[id2] === type) return 16;
        var h = fh(id2, type);
        if (h >= 0) { var wgt = FLV[id2] === 0 ? 10 : 1; sum += h * wgt; wsum += wgt; }
        else if (!OPQ[id2]) wsum += 1;
      }
      return wsum ? sum / wsum : 14.22;
    }
    for (var vy = 1; vy <= vol.ny; vy++) {
      var wy = vol.yMin + vy - 1;
      for (var vz = vz0; vz < vz1; vz++) {
        var base = (vy * sz + vz) * sx;
        for (var vx = vx0; vx < vx1; vx++) {
          var i = base + vx, id = v[i];
          if (id === 0) continue;
          var wx = vol.x0 + vx - 1, wz = vol.z0 + vz - 1;
          var bio = vol.bio[(vz - 1) * vol.size + vx - 1];
          var lx = (vx - 1) * P, ly = (vy - 1) * P, lz = (vz - 1) * P;
          var jit = 0.95 + (WG.hash(0, wx, wy, wz, 99) & 255) / 2550;
          var kind = WG.blockKind(id), ftype = FL[id], k, v0, px, py, pz, cu, cv, D, d, L;
          if (OPQ[id]) {
            var em = EMIT[id];
            for (d = 0; d < 6; d++) {
              var ni = i + dOff[d];
              if (OPQ[v[ni]]) continue;
              D = DIRS[d];
              var fo = D.face, oo = WG.ORIENT[id];
              // 向きのあるブロック（ディスペンサーなど）は、前の面に「上」、後ろに「下」の見た目
              if (oo) { var oq = ORV[oo]; fo = D.n[0] === oq[0] && D.n[1] === oq[1] && D.n[2] === oq[2] ? 'top' : D.n[0] === -oq[0] && D.n[1] === -oq[1] && D.n[2] === -oq[2] ? 'bottom' : 'side'; }
              var c = faceBase(id, fo, bio), tile = TT[id * 3 + FACE_IX[fo]], side = D.n[1] === 0;
              var uo = uOff[d], vo = vOff[d];
              for (k = 0; k < 4; k++) {
                var su = CORNERS[k][0] ? uo : -uo, sv = CORNERS[k][1] ? vo : -vo;
                var s1 = OPQ[v[ni + su]], s2 = OPQ[v[ni + sv]], s3 = OPQ[v[ni + su + sv]];
                ao[k] = (s1 && s2) ? 0 : 3 - s1 - s2 - s3;
              }
              v0 = op.nv;
              for (k = 0; k < 4; k++) {
                cu = CORNERS[k][0]; cv = CORNERS[k][1];
                px = lx + ((D.n[0] > 0 ? 1 : 0) + cu * D.u[0] + cv * D.v[0]) * P;
                py = ly + ((D.n[1] > 0 ? 1 : 0) + cu * D.u[1] + cv * D.v[1]) * P;
                pz = lz + ((D.n[2] > 0 ? 1 : 0) + cu * D.u[2] + cv * D.v[2]) * P;
                var f = em > 0 ? (0.82 + 0.18 * D.shade) * (0.85 + 0.15 * AO[ao[k]]) * jit : D.shade * AO[ao[k]] * jit;
                f *= 0.5;
                L = lit;
                if (LT && !(em > 0)) {
                  var su2 = CORNERS[k][0] ? uOff[d] : -uOff[d], sv2 = CORNERS[k][1] ? vOff[d] : -vOff[d], nc = 1;
                  cells[0] = ni;
                  if (!OPQ[v[ni + su2]]) cells[nc++] = ni + su2;
                  if (!OPQ[v[ni + sv2]]) cells[nc++] = ni + sv2;
                  if (nc === 3 && !OPQ[v[ni + su2 + sv2]]) cells[nc++] = ni + su2 + sv2;
                  L = cornerLight(cells, nc);
                } else noLight();
                op.vert(px, py, pz, c8(c[0] * f * L[0]), c8(c[1] * f * L[1]), c8(c[2] * f * L[2]), (em * 255) | 0, cu * 16, side ? 16 - cv * 16 : cv * 16, tile);
              }
              op.quad(v0, ao[0] + ao[2] < ao[1] + ao[3]);
            }
          } else if (id === B.GLASS) {
            for (d = 0; d < 6; d++) {
              var gi = i + dOff[d], gn = v[gi];
              if (gn === B.GLASS || OPQ[gn]) continue;
              D = DIRS[d];
              var gt = TT[id * 3 + FACE_IX[D.face]], gs = D.n[1] === 0, gf = D.shade * 0.5 * jit;
              if (LT) { var lv4 = LT[gi]; light(lv4 >> 4, lv4 & 15); } else noLight();
              v0 = op.nv;
              for (k = 0; k < 4; k++) {
                cu = CORNERS[k][0]; cv = CORNERS[k][1];
                px = lx + ((D.n[0] > 0 ? 1 : 0) + cu * D.u[0] + cv * D.v[0]) * P;
                py = ly + ((D.n[1] > 0 ? 1 : 0) + cu * D.u[1] + cv * D.v[1]) * P;
                pz = lz + ((D.n[2] > 0 ? 1 : 0) + cu * D.u[2] + cv * D.v[2]) * P;
                op.vert(px, py, pz, c8(255 * gf), c8(255 * gf), c8(255 * gf), 0, cu * 16, gs ? 16 - cv * 16 : cv * 16, gt);
              }
              op.quad(v0, false);
            }
          } else if (kind === 'bed') {
            // ベッド：高さ 9/16 の箱。横の面には図の下の部分（枠・敷布・脚）を貼る。頭側と足側の間の面は描かない。
            for (d = 0; d < 6; d++) {
              var bi2 = i + dOff[d], bn = v[bi2];
              if (OPQ[bn] && d !== 2) continue;
              if (WG.blockKind(bn) === 'bed' && d !== 2 && d !== 3) continue;
              D = DIRS[d];
              var bt2 = TT[id * 3 + FACE_IX[D.face]], bs = D.n[1] === 0, bf = D.shade * 0.5 * jit;
              if (LT) { var lv5 = LT[d === 2 || d === 3 ? i : bi2]; light(lv5 >> 4, lv5 & 15); } else noLight();
              v0 = op.nv;
              for (k = 0; k < 4; k++) {
                cu = CORNERS[k][0]; cv = CORNERS[k][1];
                px = lx + ((D.n[0] > 0 ? 1 : 0) + cu * D.u[0] + cv * D.v[0]) * P;
                py = ly + ((D.n[1] > 0 ? 1 : 0) + cu * D.u[1] + cv * D.v[1]) * 9;
                pz = lz + ((D.n[2] > 0 ? 1 : 0) + cu * D.u[2] + cv * D.v[2]) * P;
                op.vert(px, py, pz, c8(255 * bf), c8(255 * bf), c8(255 * bf), 0, cu * 16, bs ? 16 - cv * 10 : cv * 16, bt2);
              }
              op.quad(v0, false);
            }
          } else if (WG.SHAPED[kind]) {
            // 階段・ハーフブロック・柵・扉・はしご・耕地：箱を並べて描く（隣が不透明なブロックの境の面は描かない）
            var boxes = WG.blockBoxes(id, function (dx, dz) { return v[i + dx + dz * sx]; }, false);
            for (var bq = 0; bq < boxes.length; bq++) {
              var lo3 = [boxes[bq][0], boxes[bq][1], boxes[bq][2]], hi3 = [boxes[bq][3], boxes[bq][4], boxes[bq][5]];
              for (d = 0; d < 6; d++) {
                D = DIRS[d];
                var ax = d >> 1, plane = (d & 1) === 0 ? hi3[ax] : lo3[ax], edge = (d & 1) === 0 ? plane === 16 : plane === 0, ni3 = i + dOff[d];
                if (edge && OPQ[v[ni3]]) continue;
                if (LT) { var lv6 = LT[edge ? ni3 : i]; L = light(lv6 >> 4, lv6 & 15); } else L = noLight();
                // ピストンは向きに合わせて、押す面に上の見た目、後ろに下の見た目
                var fc3 = D.face, or3 = WG.ORIENT[id];
                if (or3) { var ov = ORV[or3]; fc3 = D.n[0] === ov[0] && D.n[1] === ov[1] && D.n[2] === ov[2] ? 'top' : D.n[0] === -ov[0] && D.n[1] === -ov[1] && D.n[2] === -ov[2] ? 'bottom' : 'side'; }
                var mid3 = boxes[bq][6] || id, em3 = boxes[bq][7] ? 255 : 0;
                var st3 = TT[mid3 * 3 + FACE_IX[fc3]], sd3 = D.n[1] === 0, sf3 = (em3 ? 0.5 : D.shade * 0.5) * jit, sc3 = faceBase(mid3, fc3, bio);
                if (em3) L = noLight();
                var uAx = D.u.indexOf(1), vAx = D.v.indexOf(1), q3 = [0, 0, 0];
                v0 = op.nv;
                for (k = 0; k < 4; k++) {
                  cu = CORNERS[k][0]; cv = CORNERS[k][1];
                  q3[ax] = plane; q3[uAx] = cu ? hi3[uAx] : lo3[uAx]; q3[vAx] = cv ? hi3[vAx] : lo3[vAx];
                  op.vert(lx + q3[0], ly + q3[1], lz + q3[2], c8(sc3[0] * sf3 * L[0]), c8(sc3[1] * sf3 * L[1]), c8(sc3[2] * sf3 * L[2]), em3,
                    q3[uAx], sd3 ? 16 - q3[vAx] : q3[vAx], st3);
                }
                op.quad(v0, false);
              }
            }
          } else if (kind === 'wire') {
            // レッドストーンの粉：つながる向きへ線、上の段へは壁を登る線。色は強さ（Minecraft と同じ色の式）
            var pw = WG.wirePower(id), pf = pw / 15;
            var wr = Math.min(255, (pf * 0.6 + (pw > 0 ? 0.4 : 0.3)) * 255), wg2 = Math.max(0, pf * pf * 0.7 - 0.5) * 255, wb = Math.max(0, pf * pf * 0.6 - 0.7) * 255;
            if (LT) { var lv8 = LT[i]; L = light(lv8 >> 4, lv8 & 15); } else L = noLight();
            var conn = WG.wireConnections(function (dx, dy, dz) { return v[i + dx + dz * sx + dy * sxz]; });
            // 強さが分かりやすいように：強いほど明るく、光り方も強く（0 は暗い赤）
            var wf = 0.62 + 0.38 * pf, wcol = [c8(wr * wf * L[0]), c8(wg2 * wf * L[1]), c8(wb * wf * L[2])], wem = pw > 0 ? Math.round(50 + 150 * pf) : 0;
            var dotT = extraTiles.WIRE_DOT, lineT = extraTiles.WIRE_LINE, yy = ly + 1;
            var quad = function (ax, az, bx, bz, tile, rot) {
              v0 = op.nv;
              var P4 = [[ax, az], [bx, az], [bx, bz], [ax, bz]], UV4 = rot ? [[0, 0], [0, 16], [16, 16], [16, 0]] : [[0, 0], [16, 0], [16, 16], [0, 16]];
              for (var q = 0; q < 4; q++) op.vert(lx + P4[q][0], yy, lz + P4[q][1], wcol[0], wcol[1], wcol[2], wem, UV4[q][0], UV4[q][1], tile);
              op.quad(v0, false);
            };
            var nconn = conn.n + conn.e + conn.s + conn.w;
            if (!nconn) quad(3, 3, 13, 13, dotT, false);
            else {
              quad(4, 4, 12, 12, dotT, false);
              var ns = conn.n || conn.s, ew = conn.e || conn.w, one = nconn === 1;
              if (conn.n || (one && conn.s)) quad(5, 0, 11, 6, lineT, false);
              if (conn.s || (one && conn.n)) quad(5, 10, 11, 16, lineT, false);
              if (conn.w || (one && conn.e)) quad(0, 5, 6, 11, lineT, true);
              if (conn.e || (one && conn.w)) quad(10, 5, 16, 11, lineT, true);
              void ns; void ew;
            }
            // 上の段へ登る線（隣のブロックの面に貼る）
            [['n', 0, -1], ['e', 1, 0], ['s', 0, 1], ['w', -1, 0]].forEach(function (c) {
              if (conn[c[0]] !== 2) return;
              var fx = c[1], fz = c[2], x0w = fx > 0 ? 15 : fx < 0 ? 1 : 5, x1w = fx > 0 ? 15 : fx < 0 ? 1 : 11, z0w = fz > 0 ? 15 : fz < 0 ? 1 : 5, z1w = fz > 0 ? 15 : fz < 0 ? 1 : 11;
              v0 = op.nv;
              op.vert(lx + x0w, ly, lz + z0w, wcol[0], wcol[1], wcol[2], wem, 0, 16, lineT);
              op.vert(lx + x1w, ly, lz + z1w, wcol[0], wcol[1], wcol[2], wem, 16, 16, lineT);
              op.vert(lx + x1w, ly + 16, lz + z1w, wcol[0], wcol[1], wcol[2], wem, 16, 0, lineT);
              op.vert(lx + x0w, ly + 16, lz + z0w, wcol[0], wcol[1], wcol[2], wem, 0, 0, lineT);
              op.quad(v0, false);
            });
          } else if (kind === 'rail') {
            // レール：床から 1/16 上に貼る 1 枚（坂は上る向きへ 1 ブロック上がる）。見た目は形ごとの切り抜き
            var ri = WG.railInfo(id), rtile = TT[id * 3 + FACE_IX.side], up = ri && ri.up;
            if (LT) { var lv9 = LT[i]; L = light(lv9 >> 4, lv9 & 15); } else L = noLight();
            var rf = 0.5 * jit, rcol = [c8(255 * rf * L[0]), c8(255 * rf * L[1]), c8(255 * rf * L[2])];
            var RP = [[0, 0], [16, 0], [16, 16], [0, 16]];
            var rh = function (x, z) { return 1 + (up === 'N' ? 16 - z : up === 'S' ? z : up === 'E' ? x : up === 'W' ? 16 - x : 0); };
            v0 = op.nv;
            for (var rq = 0; rq < 4; rq++) op.vert(lx + RP[rq][0], ly + rh(RP[rq][0], RP[rq][1]), lz + RP[rq][1], rcol[0], rcol[1], rcol[2], 0, RP[rq][0], RP[rq][1], rtile);
            op.quad(v0, false);
          } else if (kind === 'crop') {
            // 作物：縦の 4 枚を井の字に（耕地の上なので 1/16 下げる）
            var ct = TT[id * 3 + FACE_IX.side];
            if (LT) { var lv7 = LT[i]; L = light(lv7 >> 4, lv7 & 15); } else L = noLight();
            var cf1 = 0.4 * jit, cf2 = 0.5 * jit, cy0 = ly - 1, cy1 = ly + 15;
            for (var cq = 0; cq < 4; cq++) {
              var at = cq & 1 ? 12 : 4, alongX = cq < 2;
              v0 = op.nv;
              var A = alongX ? [lx, lz + at] : [lx + at, lz], Bc = alongX ? [lx + 16, lz + at] : [lx + at, lz + 16];
              op.vert(A[0], cy0, A[1], c8(255 * cf1 * L[0]), c8(255 * cf1 * L[1]), c8(255 * cf1 * L[2]), 0, 0, 16, ct);
              op.vert(Bc[0], cy0, Bc[1], c8(255 * cf1 * L[0]), c8(255 * cf1 * L[1]), c8(255 * cf1 * L[2]), 0, 16, 16, ct);
              op.vert(Bc[0], cy1, Bc[1], c8(255 * cf2 * L[0]), c8(255 * cf2 * L[1]), c8(255 * cf2 * L[2]), 0, 16, 0, ct);
              op.vert(A[0], cy1, A[1], c8(255 * cf2 * L[0]), c8(255 * cf2 * L[1]), c8(255 * cf2 * L[2]), 0, 0, 0, ct);
              op.quad(v0, false);
            }
          } else if (ftype) {
            // 水と流れる溶岩：段階に合わせて上の面を下げ、角ごとの高さでなめらかに傾ける
            var buf = ftype === 1 ? wa : op, emf = ftype === 2 ? 255 : 0, plantId = kind === 'waterplant' ? id : 0;
            if (plantId) id = B.WATER;   // 水の中の植物：水の見た目で描いてから、植物を重ねる
            var wc = faceBase(id, 'top', bio), aboveSame = FL[v[i + sxz]] === ftype;
            var hc = aboveSame ? null : [cornerH(i, 0, 0, ftype), cornerH(i, 1, 0, ftype), cornerH(i, 0, 1, ftype), cornerH(i, 1, 1, ftype)];
            for (d = 0; d < 6; d++) {
              var nid = v[i + dOff[d]];
              if (FL[nid] === ftype || (OPQ[nid] && d !== 2)) continue;
              if (d === 2 && aboveSame) continue;
              D = DIRS[d];
              var wf = (ftype === 2 ? 1 : (d === 2 ? 0.92 : D.shade * 0.85) * (0.98 + (jit - 0.95) * 0.4)) * 0.5;
              if (LT && ftype === 1) { var lv2 = LT[i + dOff[d]]; L = light(lv2 >> 4, lv2 & 15); } else L = noLight();
              var wt = TT[id * 3 + FACE_IX[D.face]], ws = D.n[1] === 0;
              v0 = buf.nv;
              for (k = 0; k < 4; k++) {
                cu = CORNERS[k][0]; cv = CORNERS[k][1];
                px = lx + ((D.n[0] > 0 ? 1 : 0) + cu * D.u[0] + cv * D.v[0]) * P;
                py = ly + ((D.n[1] > 0 ? 1 : 0) + cu * D.u[1] + cv * D.v[1]) * P;
                pz = lz + ((D.n[2] > 0 ? 1 : 0) + cu * D.u[2] + cv * D.v[2]) * P;
                if (hc && py === ly + P) py = ly + Math.round(hc[(px > lx ? 1 : 0) + (pz > lz ? 2 : 0)]);
                buf.vert(px, py, pz, c8(wc[0] * wf * L[0]), c8(wc[1] * wf * L[1]), c8(wc[2] * wf * L[2]), emf, cu * 16, ws ? 16 - cv * 16 : cv * 16, wt);
              }
              buf.quad(v0, false);
            }
            if (plantId) {
              var wpt = TT[plantId * 3 + FACE_IX.side];
              if (LT) { var lv8 = LT[i]; L = light(lv8 >> 4, lv8 & 15); } else L = noLight();
              for (var wq = 0; wq < 2; wq++) {
                var wza = wq ? 16 : 0, wzb = wq ? 0 : 16, wf1 = 0.36 * jit, wf2 = 0.48 * jit;
                v0 = op.nv;
                op.vert(lx, ly, lz + wza, c8(255 * wf1 * L[0]), c8(255 * wf1 * L[1]), c8(255 * wf1 * L[2]), 0, 0, 16, wpt);
                op.vert(lx + 16, ly, lz + wzb, c8(255 * wf1 * L[0]), c8(255 * wf1 * L[1]), c8(255 * wf1 * L[2]), 0, 16, 16, wpt);
                op.vert(lx + 16, ly + 16, lz + wzb, c8(255 * wf2 * L[0]), c8(255 * wf2 * L[1]), c8(255 * wf2 * L[2]), 0, 16, 0, wpt);
                op.vert(lx, ly + 16, lz + wza, c8(255 * wf2 * L[0]), c8(255 * wf2 * L[1]), c8(255 * wf2 * L[2]), 0, 0, 0, wpt);
                op.quad(v0, false);
              }
              id = plantId;
            }
          } else if (kind === 'plant' || kind === 'deco' || kind === 'web' || kind === 'fire' || kind === 'rtorch' || kind === 'cane') {
            // 対角に交差する 2 枚。草は色味を頂点の色で、花とトーチは切り抜きの色そのままで描く。
            var pt = TT[id * 3 + FACE_IX.side], pc = id === B.SHORT_GRASS ? faceBase(id, 'side', bio) : [255, 255, 255];
            var torch = kind === 'deco' || kind === 'rtorch', emit = kind === 'deco' || kind === 'fire' || (kind === 'rtorch' && LIGHT_EM[id]) ? 255 : 0;
            if (LT && !emit) { var lv3 = LT[i]; L = light(lv3 >> 4, lv3 & 15); } else L = noLight();
            // トーチは少し小さく、壁掛けは壁に寄せて傾ける
            var s0 = torch ? 3 : 0, s1b = torch ? 13 : 16, hgt = torch ? 12 : 16, wdx = 0, wdz = 0, lift = 0;
            var tw = WG.TORCH_WALL[id];
            if (tw) { wdx = tw[0]; wdz = tw[1]; }
            if (wdx || wdz) lift = 3;
            for (var q = 0; q < 2; q++) {
              var za = q ? s1b : s0, zb = q ? s0 : s1b;
              var f1 = (torch ? 0.5 : 0.36) * jit, f2 = (torch ? 0.5 : 0.48) * jit;
              var bx = wdx * 5, bz = wdz * 5, tx = wdx * 2, tz = wdz * 2;
              v0 = op.nv;
              op.vert(lx + s0 + bx, ly + lift, lz + za + bz, c8(pc[0] * f1 * L[0]), c8(pc[1] * f1 * L[1]), c8(pc[2] * f1 * L[2]), emit, 0, 16, pt);
              op.vert(lx + s1b + bx, ly + lift, lz + zb + bz, c8(pc[0] * f1 * L[0]), c8(pc[1] * f1 * L[1]), c8(pc[2] * f1 * L[2]), emit, 16, 16, pt);
              op.vert(lx + s1b + tx, ly + lift + hgt, lz + zb + tz, c8(pc[0] * f2 * L[0]), c8(pc[1] * f2 * L[1]), c8(pc[2] * f2 * L[2]), emit, 16, 0, pt);
              op.vert(lx + s0 + tx, ly + lift + hgt, lz + za + tz, c8(pc[0] * f2 * L[0]), c8(pc[1] * f2 * L[1]), c8(pc[2] * f2 * L[2]), emit, 0, 0, pt);
              op.quad(v0, false);
            }
          }
        }
      }
    }
    return { opaque: op.trim(), water: wa.trim() };
  }

  // ---- 行列 ----
  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function lookAt(e, c, up) {
    var zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz);
    zx /= l; zy /= l; zz /= l;
    var xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
  }
  function mul(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  function invert(a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    var b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    det = 1 / det;
    return new Float32Array([
      (a11 * b11 - a12 * b10 + a13 * b09) * det, (a02 * b10 - a01 * b11 - a03 * b09) * det,
      (a31 * b05 - a32 * b04 + a33 * b03) * det, (a22 * b04 - a21 * b05 - a23 * b03) * det,
      (a12 * b08 - a10 * b11 - a13 * b07) * det, (a00 * b11 - a02 * b08 + a03 * b07) * det,
      (a32 * b02 - a30 * b05 - a33 * b01) * det, (a20 * b05 - a22 * b02 + a23 * b01) * det,
      (a10 * b10 - a11 * b08 + a13 * b06) * det, (a01 * b08 - a00 * b10 - a03 * b06) * det,
      (a30 * b04 - a31 * b02 + a33 * b00) * det, (a21 * b02 - a20 * b04 - a23 * b00) * det,
      (a11 * b07 - a10 * b09 - a12 * b06) * det, (a00 * b09 - a01 * b07 + a02 * b06) * det,
      (a31 * b01 - a30 * b03 - a32 * b00) * det, (a20 * b03 - a21 * b01 + a22 * b00) * det]);
  }

  // ---- WebGL ----
  var VS = [
    'attribute vec4 aPos; attribute vec4 aCol; attribute vec4 aUV; attribute vec4 aLt;',
    'uniform mat4 uVP; uniform vec3 uOrigin; uniform vec3 uEye; uniform float uScale;',
    'uniform float uSkyDark; uniform float uAmb; uniform vec3 uSkyTint;',
    'varying vec4 vCol; varying vec2 vUV; varying float vTile; varying float vDist; varying vec3 vL;',
    // 明るさの曲線（Minecraft の曲線と、明るさ設定「中」の補正）
    'float curve(float l){ float f = clamp(l / 15.0, 0.0, 1.0); float b = f / (4.0 - 3.0 * f); float g = 1.0 - pow(1.0 - b, 4.0); return b + (g - b) * 0.5; }',
    'varying float vBig;',
    'void main(){ vec3 p = aPos.xyz / 16.0 * uScale + uOrigin; vCol = aCol; vUV = aUV.xy / 16.0;',
    // 128 以上の上位バイトは 16×16 のアイコン（番号は小さくしてから渡す：mediump でも正確なように）
    '  vBig = step(127.5, aUV.w); vTile = aUV.z + (aUV.w - vBig * 128.0) * 256.0;',
    // 空の光は時刻で弱まる（夜は最大 11 段暗い）。ブロックの光は少し暖かい色。光るブロックはいつも明るい。
    '  float sky = max(aLt.x / 17.0 - uSkyDark, 0.0), blk = aLt.y / 17.0;',
    '  vec3 L = max(vec3(curve(sky)) * uSkyTint, vec3(curve(blk)) * vec3(1.0, 0.9, 0.76));',
    '  vL = mix(vec3(uAmb) + (1.0 - uAmb) * L, vec3(1.0), step(0.01, aCol.a));',
    '  vDist = length(p - uEye); gl_Position = uVP * vec4(p, 1.0); }'
  ].join('\n');
  // 見た目は 8×8 の中だけを読む（隣の見た目がにじまないよう、端の画素の中心で止める）
  var FS = [
    'precision mediump float;',
    'varying vec4 vCol; varying vec2 vUV; varying float vTile; varying float vDist; varying vec3 vL; varying float vBig;',
    'uniform sampler2D uAtlas; uniform vec3 uFog; uniform vec2 uFogR; uniform float uAlpha;',
    'void main(){',
    '  float t = floor(vTile + 0.5), sz = 16.0; vec2 org = vec2(mod(t, 32.0), floor(t / 32.0)) * 16.0;',
    '  vec2 uv = (org + clamp(vUV, 0.5 / sz, 1.0 - 0.5 / sz) * sz) / vec2(512.0, 512.0);',
    '  vec4 tx = texture2D(uAtlas, uv); if (tx.a < 0.5) discard;',
    '  vec3 c = tx.rgb * vCol.rgb * 2.0 * vL;',
    '  float f = smoothstep(uFogR.x, uFogR.y, vDist) * (1.0 - 0.65 * vCol.a);',
    '  gl_FragColor = vec4(mix(c, uFog, f), uAlpha); }'
  ].join('\n');
  var SKY_VS = 'attribute vec2 aP; varying float vY; void main(){ vY = aP.y * 0.5 + 0.5; gl_Position = vec4(aP, 0.999, 1.0); }';
  var SKY_FS = [
    'precision mediump float; varying float vY; uniform vec3 uTop; uniform vec3 uLow;',
    'void main(){ float t = smoothstep(0.0, 1.0, vY); gl_FragColor = vec4(mix(uLow, uTop, t), 1.0); }'
  ].join('\n');

  function compile(gl, vs, fs) {
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  function View3D(canvas) {
    this.canvas = canvas;
    var opt = { antialias: true, preserveDrawingBuffer: true, alpha: false };
    var gl = canvas.getContext('webgl2', opt);
    if (!gl) {
      gl = canvas.getContext('webgl', opt);
      if (gl && !gl.getExtension('OES_element_index_uint')) gl = null;
    }
    this.gl = gl;
    this.ok = !!gl;
    if (!gl) return;
    this.prog = compile(gl, VS, FS);
    this.sky = compile(gl, SKY_VS, SKY_FS);
    this.skyBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.loc = {
      aPos: gl.getAttribLocation(this.prog, 'aPos'), aCol: gl.getAttribLocation(this.prog, 'aCol'), aUV: gl.getAttribLocation(this.prog, 'aUV'),
      aLt: gl.getAttribLocation(this.prog, 'aLt'), uSkyDark: gl.getUniformLocation(this.prog, 'uSkyDark'),
      uAmb: gl.getUniformLocation(this.prog, 'uAmb'), uSkyTint: gl.getUniformLocation(this.prog, 'uSkyTint'),
      uAtlas: gl.getUniformLocation(this.prog, 'uAtlas'),
      uVP: gl.getUniformLocation(this.prog, 'uVP'), uOrigin: gl.getUniformLocation(this.prog, 'uOrigin'), uScale: gl.getUniformLocation(this.prog, 'uScale'),
      uEye: gl.getUniformLocation(this.prog, 'uEye'), uFog: gl.getUniformLocation(this.prog, 'uFog'),
      uFogR: gl.getUniformLocation(this.prog, 'uFogR'), uAlpha: gl.getUniformLocation(this.prog, 'uAlpha'),
      aP: gl.getAttribLocation(this.sky, 'aP'), uTop: gl.getUniformLocation(this.sky, 'uTop'), uLow: gl.getUniformLocation(this.sky, 'uLow')
    };
    // 見た目のアトラスを読み込む（ドット絵なので補間しない）
    atlas();
    this.atlasTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ATLAS, ATLAS_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, atlasPixels);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // 照準を合わせたブロックの枠（立方体の 12 辺）
    var E = [], c = [[0, 0, 0], [16, 0, 0], [16, 0, 16], [0, 0, 16], [0, 16, 0], [16, 16, 0], [16, 16, 16], [0, 16, 16]];
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(function (e) {
      E.push(c[e[0]][0], c[e[0]][1], c[e[0]][2], 0, c[e[1]][0], c[e[1]][1], c[e[1]][2], 0);
    });
    this.edge = { pos: gl.createBuffer(), col: gl.createBuffer(), uv: gl.createBuffer() };
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edge.pos); gl.bufferData(gl.ARRAY_BUFFER, new Int16Array(E), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edge.col); gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(24 * 4), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edge.uv); gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(24 * 4), gl.STATIC_DRAW);
    this.dynBuf = { pos: gl.createBuffer(), col: gl.createBuffer(), uv: gl.createBuffer(), lt: gl.createBuffer() };
    this.dynamic = null;  // 毎回作り直す面（落ちているアイテムなど）。[{pos, col, uv, count, alpha}]
    this.parts = [];
    this.vol = null;
    this.fp = null;       // 一人称のカメラ（歩くとき）
    this.cull = null;     // 描かない部分を決める関数（歩くとき）
    this.outline = null;  // 枠を描くブロックの座標
    this.yaw = 0.75; this.pitch = 0.55; this.dist = 160;
    this.target = [0, 64, 0];
    this.res = 1;
    this.palette = WG.DIMS.overworld.palette;
  }

  View3D.prototype.clear = function () {
    var gl = this.gl;
    if (!gl) return;
    var self = this;
    this.parts.slice().forEach(function (p) { self.remove(p); });
    this.parts = [];
    this.vol = null;
  };

  View3D.prototype.remove = function (p) {
    var gl = this.gl, i = this.parts.indexOf(p);
    if (i >= 0) this.parts.splice(i, 1);
    [p.op, p.wa].forEach(function (m) { if (m) { gl.deleteBuffer(m.pos); gl.deleteBuffer(m.col); gl.deleteBuffer(m.uv); gl.deleteBuffer(m.lt); gl.deleteBuffer(m.idx); } });
  };

  // origin を渡すと、その部分だけ別の原点で描く（歩くときのチャンクごとの面）
  View3D.prototype.upload = function (mesh, origin) {
    var gl = this.gl;
    function up(m) {
      if (!m.idx.length) return null;
      var o = { pos: gl.createBuffer(), col: gl.createBuffer(), uv: gl.createBuffer(), lt: gl.createBuffer(), idx: gl.createBuffer(), n: m.idx.length };
      gl.bindBuffer(gl.ARRAY_BUFFER, o.lt); gl.bufferData(gl.ARRAY_BUFFER, m.lt, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, o.pos); gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, o.uv); gl.bufferData(gl.ARRAY_BUFFER, m.uv, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, o.col); gl.bufferData(gl.ARRAY_BUFFER, m.col, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
      return o;
    }
    var part = { op: up(mesh.opaque), wa: up(mesh.water), origin: origin || null };
    this.parts.push(part);
    return part;
  };

  View3D.prototype.setVolume = function (vol, palette, keepCamera) {
    this.vol = vol;
    this.palette = palette;
    if (!keepCamera) {
      this.dist = vol.size * 1.75 + 50;
      this.yaw = 0.75; this.pitch = 0.55;
    }
  };

  View3D.prototype.focus = function (y) {
    var vol = this.vol;
    if (vol) this.target = [vol.x0 + vol.size / 2, y, vol.z0 + vol.size / 2];
  };

  View3D.prototype.resize = function () {
    var dpr = (G.devicePixelRatio || 1) * this.res;
    var w = Math.max(1, Math.round(this.canvas.clientWidth * dpr)), h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  };

  View3D.prototype.matrices = function () {
    var aspect0 = this.canvas.width / this.canvas.height;
    if (this.fp) {
      var f = this.fp, c0 = Math.cos(f.pitch), e = f.eye;
      var at = [e[0] - Math.sin(f.yaw) * c0, e[1] + Math.sin(f.pitch), e[2] - Math.cos(f.yaw) * c0];
      return { eye: e, vp: mul(perspective(f.fov, aspect0, 0.05, f.far), lookAt(e, at, [0, 1, 0])) };
    }
    var cp = Math.cos(this.pitch), t = this.target;
    var eye = [t[0] + this.dist * cp * Math.sin(this.yaw), t[1] + this.dist * Math.sin(this.pitch), t[2] + this.dist * cp * Math.cos(this.yaw)];
    var aspect = this.canvas.width / this.canvas.height;
    var proj = perspective(0.75, aspect, Math.max(0.5, this.dist * 0.02), this.dist * 4 + 800);
    return { eye: eye, vp: mul(proj, lookAt(eye, t, [0, 1, 0])) };
  };

  View3D.prototype.render = function () {
    var gl = this.gl;
    if (!gl) return;
    this.resize();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    var pal = this.palette, top = pal.skyTop.map(function (v) { return v / 255; }), low = pal.skyLow.map(function (v) { return v / 255; });
    if (this.fp && this.fp.skyTop) { top = this.fp.skyTop; low = this.fp.skyLow; }
    if (this.fp && this.fp.fogColor) top = low = this.fp.fogColor;
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.useProgram(this.sky);
    gl.uniform3fv(this.loc.uTop, top); gl.uniform3fv(this.loc.uLow, low);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuf);
    gl.enableVertexAttribArray(this.loc.aP);
    gl.vertexAttribPointer(this.loc.aP, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(this.loc.aP);
    if (!this.vol && !this.fp) return;

    var m = this.matrices(), L = this.loc, vol = this.vol, fp = this.fp, self = this;
    this.vp = m.vp; this.eye = m.eye;
    gl.useProgram(this.prog);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    gl.uniformMatrix4fv(L.uVP, false, m.vp);
    gl.uniform3fv(L.uEye, m.eye);
    gl.uniform3fv(L.uFog, fp && fp.skyFog && !fp.fogColor ? fp.skyFog : low);
    if (fp) gl.uniform2f(L.uFogR, fp.fogNear, fp.fogFar);
    else gl.uniform2f(L.uFogR, this.dist * 0.95, this.dist * 2.6 + vol.size);
    gl.uniform1f(L.uScale, 1);
    function origin(p) {
      if (p.origin) gl.uniform3f(L.uOrigin, p.origin[0], p.origin[1], p.origin[2]);
      else gl.uniform3f(L.uOrigin, vol.x0, vol.yMin, vol.z0);
    }
    var parts = this.cull ? this.parts.filter(function (p) { return self.cull(p, m.eye); }) : this.parts;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.atlasTex); gl.uniform1i(L.uAtlas, 0);
    gl.enableVertexAttribArray(L.aPos); gl.enableVertexAttribArray(L.aCol); gl.enableVertexAttribArray(L.aUV); gl.enableVertexAttribArray(L.aLt);
    gl.uniform1f(L.uSkyDark, fp && fp.skyDark || 0); gl.uniform1f(L.uAmb, fp ? this.ambient || 0 : 0);
    gl.uniform3fv(L.uSkyTint, fp && fp.skyTint || [1, 1, 1]);
    if (fp && fp.celestial) this.drawCelestial(fp, m.eye);
    function draw(o) {
      gl.bindBuffer(gl.ARRAY_BUFFER, o.pos); gl.vertexAttribPointer(L.aPos, 4, gl.SHORT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, o.col); gl.vertexAttribPointer(L.aCol, 4, gl.UNSIGNED_BYTE, true, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, o.uv); gl.vertexAttribPointer(L.aUV, 4, gl.UNSIGNED_BYTE, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, o.lt); gl.vertexAttribPointer(L.aLt, 4, gl.UNSIGNED_BYTE, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.idx);
      gl.drawElements(gl.TRIANGLES, o.n, gl.UNSIGNED_INT, 0);
    }
    gl.uniform1f(L.uAlpha, 1);
    parts.forEach(function (p) { if (p.op) { origin(p); draw(p.op); } });
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (this.outline) {
      // 照準のブロックの枠（少しだけ大きくして、面に埋もれないようにする）
      var o = this.outline;
      gl.uniform3f(L.uOrigin, o[0] - 0.002, o[1] - 0.002, o[2] - 0.002);
      gl.uniform1f(L.uScale, 1.004); gl.uniform1f(L.uAlpha, 0.5);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.edge.pos); gl.vertexAttribPointer(L.aPos, 4, gl.SHORT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.edge.col); gl.vertexAttribPointer(L.aCol, 4, gl.UNSIGNED_BYTE, true, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.edge.uv); gl.vertexAttribPointer(L.aUV, 4, gl.UNSIGNED_BYTE, false, 0, 0);
      gl.disableVertexAttribArray(L.aLt); gl.vertexAttrib4f(L.aLt, 255, 0, 0, 0);
      gl.drawArrays(gl.LINES, 0, 24);
      gl.enableVertexAttribArray(L.aLt);
      gl.uniform1f(L.uScale, 1);
    }
    if (this.dynamic) {
      // 位置は世界の座標（1/16 単位）の小数で渡す
      var db = this.dynBuf;
      gl.uniform3f(L.uOrigin, 0, 0, 0); gl.uniform1f(L.uScale, 1);
      this.dynamic.forEach(function (d) {
        if (!d.count) return;
        gl.uniform1f(L.uAlpha, d.alpha);
        gl.bindBuffer(gl.ARRAY_BUFFER, db.pos); gl.bufferData(gl.ARRAY_BUFFER, d.pos, gl.DYNAMIC_DRAW); gl.vertexAttribPointer(L.aPos, 4, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, db.col); gl.bufferData(gl.ARRAY_BUFFER, d.col, gl.DYNAMIC_DRAW); gl.vertexAttribPointer(L.aCol, 4, gl.UNSIGNED_BYTE, true, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, db.uv); gl.bufferData(gl.ARRAY_BUFFER, d.uv, gl.DYNAMIC_DRAW); gl.vertexAttribPointer(L.aUV, 4, gl.UNSIGNED_BYTE, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, db.lt); gl.bufferData(gl.ARRAY_BUFFER, d.lt, gl.DYNAMIC_DRAW); gl.vertexAttribPointer(L.aLt, 4, gl.UNSIGNED_BYTE, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, d.count);
      });
    }
    gl.depthMask(false);
    gl.uniform1f(L.uAlpha, 0.8);
    parts.forEach(function (p) { if (p.wa) { origin(p); draw(p.wa); } });
    gl.depthMask(true); gl.disable(gl.BLEND);
    gl.disableVertexAttribArray(L.aPos); gl.disableVertexAttribArray(L.aCol); gl.disableVertexAttribArray(L.aUV); gl.disableVertexAttribArray(L.aLt);
  };

  // 太陽・月・星（空の遠くに、カメラを中心に描く。地形より先に、奥行きを使わずに描く）
  var STARS = null;
  View3D.prototype.drawCelestial = function (fp, eye) {
    var gl = this.gl, L = this.loc, c = fp.celestial, D = fp.far * 0.7, db = this.dynBuf;
    if (!STARS) {
      STARS = [];
      for (var i = 0; i < 500; i++) {
        var u = WG.rnd(1, i, 0, 0, 501) * 2 - 1, t = WG.rnd(1, i, 0, 0, 502) * Math.PI * 2, r = Math.sqrt(1 - u * u);
        STARS.push([r * Math.cos(t), u, r * Math.sin(t), 0.15 + WG.rnd(1, i, 0, 0, 503) * 0.35]);
      }
    }
    var pos = [], col = [], uv = [], lt = [];
    function quad(dir, size, rgb) {
      // dir に垂直な 2 方向
      var ax = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      var ux = dir[1] * ax[2] - dir[2] * ax[1], uy = dir[2] * ax[0] - dir[0] * ax[2], uz = dir[0] * ax[1] - dir[1] * ax[0], ul = Math.hypot(ux, uy, uz);
      ux /= ul; uy /= ul; uz /= ul;
      var vx = dir[1] * uz - dir[2] * uy, vy = dir[2] * ux - dir[0] * uz, vz = dir[0] * uy - dir[1] * ux;
      var cx = eye[0] + dir[0] * D, cy = eye[1] + dir[1] * D, cz = eye[2] + dir[2] * D;
      [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]].forEach(function (q) {
        pos.push((cx + (ux * q[0] + vx * q[1]) * size) * 16, (cy + (uy * q[0] + vy * q[1]) * size) * 16, (cz + (uz * q[0] + vz * q[1]) * size) * 16, 0);
        col.push(rgb[0] >> 1, rgb[1] >> 1, rgb[2] >> 1, 255); uv.push(8, 8, 0, 0); lt.push(255, 0, 0, 0);
      });
    }
    function rot(v, a) { var ca = Math.cos(a), sa = Math.sin(a); return [v[0] * ca - v[1] * sa, v[0] * sa + v[1] * ca, v[2]]; }
    var batches = [];
    if (c.stars > 0.01) {
      STARS.forEach(function (st) { var d = rot(st, c.angle); if (d[1] > -0.1) quad(d, st[3] * D / 300, [230, 232, 240]); });
      batches.push([pos, col, uv, lt, c.stars]);
      pos = []; col = []; uv = []; lt = [];
    }
    var sun = rot([0, 1, 0], c.angle), moon = [-sun[0], -sun[1], -sun[2]];
    quad(sun, D * 0.06, [250, 236, 186]);
    quad(moon, D * 0.045, [214, 220, 228]);
    batches.push([pos, col, uv, lt, 1]);
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform2f(L.uFogR, 1e7, 2e7);
    gl.uniform3f(L.uOrigin, 0, 0, 0); gl.uniform1f(L.uScale, 1);
    batches.forEach(function (bt) {
      gl.uniform1f(L.uAlpha, bt[4]);
      gl.bindBuffer(gl.ARRAY_BUFFER, db.pos); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bt[0]), gl.DYNAMIC_DRAW); gl.vertexAttribPointer(L.aPos, 4, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, db.col); gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(bt[1]), gl.DYNAMIC_DRAW); gl.vertexAttribPointer(L.aCol, 4, gl.UNSIGNED_BYTE, true, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, db.uv); gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(bt[2]), gl.DYNAMIC_DRAW); gl.vertexAttribPointer(L.aUV, 4, gl.UNSIGNED_BYTE, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, db.lt); gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(bt[3]), gl.DYNAMIC_DRAW); gl.vertexAttribPointer(L.aLt, 4, gl.UNSIGNED_BYTE, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, bt[0].length / 4);
    });
    gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
    gl.uniform2f(L.uFogR, fp.fogNear, fp.fogFar);
  };

  // 画面上の点（CSS ピクセル）の先にあるブロックを探す
  View3D.prototype.pick = function (mx, my) {
    var vol = this.vol;
    if (!vol || !this.vp) return null;
    var inv = invert(this.vp);
    if (!inv) return null;
    var nx = mx / this.canvas.clientWidth * 2 - 1, ny = 1 - my / this.canvas.clientHeight * 2;
    function un(z) {
      var x = inv[0] * nx + inv[4] * ny + inv[8] * z + inv[12], y = inv[1] * nx + inv[5] * ny + inv[9] * z + inv[13];
      var zz = inv[2] * nx + inv[6] * ny + inv[10] * z + inv[14], w = inv[3] * nx + inv[7] * ny + inv[11] * z + inv[15];
      return [x / w, y / w, zz / w];
    }
    var a = un(-1), b = un(1);
    // 体積の座標へ
    var o = [a[0] - vol.x0 + 1, a[1] - vol.yMin + 1, a[2] - vol.z0 + 1];
    var d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(d[0], d[1], d[2]);
    d = [d[0] / len, d[1] / len, d[2] / len];
    var lo = [1, 1, 1], hi = [vol.size + 1, vol.ny + 1, vol.size + 1], t0 = 0, t1 = len;
    for (var k = 0; k < 3; k++) {
      if (Math.abs(d[k]) < 1e-9) { if (o[k] < lo[k] || o[k] > hi[k]) return null; continue; }
      var ta = (lo[k] - o[k]) / d[k], tb = (hi[k] - o[k]) / d[k];
      if (ta > tb) { var tt = ta; ta = tb; tb = tt; }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    }
    if (t0 > t1) return null;
    var t = t0 + 1e-4, p = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
    var c = [Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2])];
    var step = [], tMax = [], tDel = [];
    for (k = 0; k < 3; k++) {
      step[k] = d[k] > 0 ? 1 : -1;
      tDel[k] = Math.abs(1 / d[k]);
      tMax[k] = t + (d[k] > 0 ? (c[k] + 1 - p[k]) : (p[k] - c[k])) * tDel[k];
    }
    for (var n = 0; n < 2000; n++) {
      if (c[0] < 1 || c[1] < 1 || c[2] < 1 || c[0] > vol.size || c[1] > vol.ny || c[2] > vol.size) break;
      var id = vol.at(c[0], c[1], c[2]);
      if (id !== 0) return { x: vol.x0 + c[0] - 1, y: vol.yMin + c[1] - 1, z: vol.z0 + c[2] - 1, id: id, biome: vol.bio[(c[2] - 1) * vol.size + c[0] - 1] };
      k = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
      c[k] += step[k]; tMax[k] += tDel[k];
    }
    return null;
  };

  WG.Volume = Volume;
  WG.meshPart = meshPart;
  WG.View3D = View3D;
})(typeof window !== 'undefined' ? window : globalThis);
