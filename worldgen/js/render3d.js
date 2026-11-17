// 3D（立体）表示。WebGL で、見える面だけを描く。
// 面ごとの明るさ、頂点ごとの環境遮蔽、ブロックごとの明るさのずれ、遠くの霞をつける。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, OPQ = WG.OPAQUE, EMIT = WG.EMIT;

  // ---- 立体の範囲（体積データ） ----
  // 周囲 1 ブロックは空気で囲む。上端より上・下端より下・横の外側は空気として扱うので、切り口の面も描かれる。
  function Volume(world, x0, z0, size, yMin, yMax) {
    this.x0 = x0; this.z0 = z0; this.size = size; this.yMin = yMin; this.yMax = yMax;
    this.ny = yMax - yMin + 1;
    this.sx = size + 2; this.sz = size + 2; this.sy = this.ny + 2;
    this.v = new Uint8Array(this.sx * this.sz * this.sy);
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
  // 8×8 の見た目を 16×16 枚並べた 128×128 の画像。0 番は白（見た目のないブロック用）。
  var FACE_IX = { top: 0, side: 1, bottom: 2 }, ATLAS = 128, tileTable = null, atlasPixels = null;
  function atlas() {
    if (tileTable) return tileTable;
    tileTable = new Uint16Array(WG.BLOCKS.length * 3);
    atlasPixels = new Uint8Array(ATLAS * ATLAS * 4);
    var n = 0, k;
    function tile(src) {
      var tx = (n % 16) * 8, ty = ((n / 16) | 0) * 8;
      for (var j = 0; j < 8; j++) for (var i = 0; i < 8; i++) {
        var o = ((ty + j) * ATLAS + tx + i) * 4;
        if (src) { k = (j * 8 + i) * 3; atlasPixels[o] = src[k]; atlasPixels[o + 1] = src[k + 1]; atlasPixels[o + 2] = src[k + 2]; }
        else { atlasPixels[o] = atlasPixels[o + 1] = atlasPixels[o + 2] = 255; }
        atlasPixels[o + 3] = 255;
      }
      return n++;
    }
    tile(null);
    WG.BLOCKS.forEach(function (b) {
      ['top', 'side', 'bottom'].forEach(function (f) {
        var px = WG.skinTexture(b.id, f);
        tileTable[b.id * 3 + FACE_IX[f]] = px ? tile(px) : 0;
      });
    });
    // 草花は見た目がないので、形だけの切り抜きを作る（色は blocks.js の色）。透明な所は描かない。
    Object.keys(PLANT_SHAPE).forEach(function (key) {
      var id = WG.B[key], rows = PLANT_SHAPE[key], head = WG.skinColor(id), stem = [79, 122, 46];
      var tx = (n % 16) * 8, ty = ((n / 16) | 0) * 8;
      for (var j = 0; j < 8; j++) for (var i = 0; i < 8; i++) {
        var ch = rows[j][i], o = ((ty + j) * ATLAS + tx + i) * 4;
        var c = ch === 'G' ? stem : key === 'SHORT_GRASS' ? [255, 255, 255] : head;
        atlasPixels[o] = c[0]; atlasPixels[o + 1] = c[1]; atlasPixels[o + 2] = c[2];
        atlasPixels[o + 3] = ch === '.' ? 0 : 255;
      }
      tileTable[id * 3 + FACE_IX.side] = n++;
    });
    return tileTable;
  }
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
    var pos = new Int16Array(cap * 4), col = new Uint8Array(cap * 4), uv = new Uint8Array(cap * 4), idx = new Uint32Array(cap * 3 / 2);
    if (this.pos) { pos.set(this.pos); col.set(this.col); uv.set(this.uv); idx.set(this.idx); }
    this.pos = pos; this.col = col; this.uv = uv; this.idx = idx; this.cap = cap;
  };
  // 色は 2 倍して使う（明るさ 1 = 127.5）。tu, tv は面の中の位置（0〜16）、tile はアトラスの番号。
  Buf.prototype.vert = function (x, y, z, r, g, b, a, tu, tv, tile) {
    if (this.nv >= this.cap) this.grow(this.cap * 2);
    var o = this.nv * 4;
    this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = z;
    this.col[o] = r; this.col[o + 1] = g; this.col[o + 2] = b; this.col[o + 3] = a;
    this.uv[o] = tu; this.uv[o + 1] = tv; this.uv[o + 2] = tile & 255; this.uv[o + 3] = tile >> 8;
    return this.nv++;
  };
  Buf.prototype.quad = function (v0, flip) {
    var o = this.ni, d = this.idx;
    if (flip) { d[o] = v0 + 1; d[o + 1] = v0 + 2; d[o + 2] = v0 + 3; d[o + 3] = v0 + 1; d[o + 4] = v0 + 3; d[o + 5] = v0; }
    else { d[o] = v0; d[o + 1] = v0 + 1; d[o + 2] = v0 + 2; d[o + 3] = v0; d[o + 4] = v0 + 2; d[o + 5] = v0 + 3; }
    this.ni += 6;
  };
  Buf.prototype.trim = function () {
    return { pos: this.pos.subarray(0, this.nv * 4), col: this.col.subarray(0, this.nv * 4), uv: this.uv.subarray(0, this.nv * 4), idx: this.idx.subarray(0, this.ni) };
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
    var ao = [0, 0, 0, 0];
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
          var kind = WG.blockKind(id);
          if (OPQ[id]) {
            var em = EMIT[id];
            for (var d = 0; d < 6; d++) {
              var ni = i + dOff[d];
              if (OPQ[v[ni]]) continue;
              var D = DIRS[d], c = faceBase(id, D.face, bio), tile = TT[id * 3 + FACE_IX[D.face]], side = D.n[1] === 0;
              var uo = uOff[d], vo = vOff[d];
              for (var k = 0; k < 4; k++) {
                var su = CORNERS[k][0] ? uo : -uo, sv = CORNERS[k][1] ? vo : -vo;
                var s1 = OPQ[v[ni + su]], s2 = OPQ[v[ni + sv]], s3 = OPQ[v[ni + su + sv]];
                ao[k] = (s1 && s2) ? 0 : 3 - s1 - s2 - s3;
              }
              var v0 = op.nv;
              for (k = 0; k < 4; k++) {
                var cu = CORNERS[k][0], cv = CORNERS[k][1];
                var px = lx + ((D.n[0] > 0 ? 1 : 0) + cu * D.u[0] + cv * D.v[0]) * P;
                var py = ly + ((D.n[1] > 0 ? 1 : 0) + cu * D.u[1] + cv * D.v[1]) * P;
                var pz = lz + ((D.n[2] > 0 ? 1 : 0) + cu * D.u[2] + cv * D.v[2]) * P;
                var f = em > 0 ? (0.82 + 0.18 * D.shade) * (0.85 + 0.15 * AO[ao[k]]) * jit : D.shade * AO[ao[k]] * jit;
                f *= 0.5;
                op.vert(px, py, pz, c8(c[0] * f), c8(c[1] * f), c8(c[2] * f), (em * 255) | 0, cu * 16, side ? 16 - cv * 16 : cv * 16, tile);
              }
              op.quad(v0, ao[0] + ao[2] < ao[1] + ao[3]);
            }
          } else if (id === B.WATER) {
            var topLow = v[i + sxz] !== B.WATER;
            var wc = faceBase(id, 'top', bio);
            for (d = 0; d < 6; d++) {
              var nid = v[i + dOff[d]];
              if (nid === B.WATER || OPQ[nid]) continue;
              D = DIRS[d];
              var wf = (d === 2 ? 0.92 : D.shade * 0.85) * (0.98 + (jit - 0.95) * 0.4) * 0.5;
              var wt = TT[id * 3 + FACE_IX[D.face]], ws = D.n[1] === 0;
              v0 = wa.nv;
              for (k = 0; k < 4; k++) {
                cu = CORNERS[k][0]; cv = CORNERS[k][1];
                px = lx + ((D.n[0] > 0 ? 1 : 0) + cu * D.u[0] + cv * D.v[0]) * P;
                py = ly + ((D.n[1] > 0 ? 1 : 0) + cu * D.u[1] + cv * D.v[1]) * P;
                pz = lz + ((D.n[2] > 0 ? 1 : 0) + cu * D.u[2] + cv * D.v[2]) * P;
                if (topLow && py === ly + P) py = ly + 14;
                wa.vert(px, py, pz, c8(wc[0] * wf), c8(wc[1] * wf), c8(wc[2] * wf), 0, cu * 16, ws ? 16 - cv * 16 : cv * 16, wt);
              }
              wa.quad(v0, false);
            }
          } else if (kind === 'plant') {
            // 対角に交差する 2 枚。草は色味を頂点の色で、花は切り抜きの色そのままで描く。
            var pt = TT[id * 3 + FACE_IX.side], pc = id === B.SHORT_GRASS ? WG.blockColor(id, 'side', bio) : [255, 255, 255];
            for (var q = 0; q < 2; q++) {
              var za = q ? 16 : 0, zb = q ? 0 : 16;
              var f1 = 0.36 * jit, f2 = 0.48 * jit;
              v0 = op.nv;
              op.vert(lx, ly, lz + za, c8(pc[0] * f1), c8(pc[1] * f1), c8(pc[2] * f1), 0, 0, 16, pt);
              op.vert(lx + 16, ly, lz + zb, c8(pc[0] * f1), c8(pc[1] * f1), c8(pc[2] * f1), 0, 16, 16, pt);
              op.vert(lx + 16, ly + 16, lz + zb, c8(pc[0] * f2), c8(pc[1] * f2), c8(pc[2] * f2), 0, 16, 0, pt);
              op.vert(lx, ly + 16, lz + za, c8(pc[0] * f2), c8(pc[1] * f2), c8(pc[2] * f2), 0, 0, 0, pt);
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
    'attribute vec4 aPos; attribute vec4 aCol; attribute vec4 aUV;',
    'uniform mat4 uVP; uniform vec3 uOrigin; uniform vec3 uEye; uniform float uScale;',
    'varying vec4 vCol; varying vec2 vUV; varying float vTile; varying float vDist;',
    'void main(){ vec3 p = aPos.xyz / 16.0 * uScale + uOrigin; vCol = aCol; vUV = aUV.xy / 16.0; vTile = aUV.z + aUV.w * 256.0;',
    '  vDist = length(p - uEye); gl_Position = uVP * vec4(p, 1.0); }'
  ].join('\n');
  // 見た目は 8×8 の中だけを読む（隣の見た目がにじまないよう、端の画素の中心で止める）
  var FS = [
    'precision mediump float;',
    'varying vec4 vCol; varying vec2 vUV; varying float vTile; varying float vDist;',
    'uniform sampler2D uAtlas; uniform vec3 uFog; uniform vec2 uFogR; uniform float uAlpha;',
    'void main(){',
    '  float t = floor(vTile + 0.5); vec2 org = vec2(mod(t, 16.0), floor(t / 16.0)) * 8.0;',
    '  vec2 uv = (org + clamp(vUV, 0.0625, 0.9375) * 8.0) / 128.0;',
    '  vec4 tx = texture2D(uAtlas, uv); if (tx.a < 0.5) discard;',
    '  vec3 c = tx.rgb * vCol.rgb * 2.0;',
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ATLAS, ATLAS, 0, gl.RGBA, gl.UNSIGNED_BYTE, atlasPixels);
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
    [p.op, p.wa].forEach(function (m) { if (m) { gl.deleteBuffer(m.pos); gl.deleteBuffer(m.col); gl.deleteBuffer(m.uv); gl.deleteBuffer(m.idx); } });
  };

  // origin を渡すと、その部分だけ別の原点で描く（歩くときのチャンクごとの面）
  View3D.prototype.upload = function (mesh, origin) {
    var gl = this.gl;
    function up(m) {
      if (!m.idx.length) return null;
      var o = { pos: gl.createBuffer(), col: gl.createBuffer(), uv: gl.createBuffer(), idx: gl.createBuffer(), n: m.idx.length };
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
    gl.uniform3fv(L.uFog, low);
    if (fp) gl.uniform2f(L.uFogR, fp.fogNear, fp.fogFar);
    else gl.uniform2f(L.uFogR, this.dist * 0.95, this.dist * 2.6 + vol.size);
    gl.uniform1f(L.uScale, 1);
    function origin(p) {
      if (p.origin) gl.uniform3f(L.uOrigin, p.origin[0], p.origin[1], p.origin[2]);
      else gl.uniform3f(L.uOrigin, vol.x0, vol.yMin, vol.z0);
    }
    var parts = this.cull ? this.parts.filter(function (p) { return self.cull(p, m.eye); }) : this.parts;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.atlasTex); gl.uniform1i(L.uAtlas, 0);
    gl.enableVertexAttribArray(L.aPos); gl.enableVertexAttribArray(L.aCol); gl.enableVertexAttribArray(L.aUV);
    function draw(o) {
      gl.bindBuffer(gl.ARRAY_BUFFER, o.pos); gl.vertexAttribPointer(L.aPos, 4, gl.SHORT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, o.col); gl.vertexAttribPointer(L.aCol, 4, gl.UNSIGNED_BYTE, true, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, o.uv); gl.vertexAttribPointer(L.aUV, 4, gl.UNSIGNED_BYTE, false, 0, 0);
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
      gl.drawArrays(gl.LINES, 0, 24);
      gl.uniform1f(L.uScale, 1);
    }
    gl.depthMask(false);
    gl.uniform1f(L.uAlpha, 0.8);
    parts.forEach(function (p) { if (p.wa) { origin(p); draw(p.wa); } });
    gl.depthMask(true); gl.disable(gl.BLEND);
    gl.disableVertexAttribArray(L.aPos); gl.disableVertexAttribArray(L.aCol); gl.disableVertexAttribArray(L.aUV);
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
