// 生き物の見た目の質感
// 生き物の体は色の付いた箱でできている。その箱の面に、素材ごとの質感（毛・肌・羊毛・羽根・骨・布・うろこ・甲殻・金属・
// ゲル・木目など）を 16×16 の濃淡の絵として貼り、箱の色を掛けて描く。1 ドットは体の 1 ピクセル分。
// ・面の上ほど明るく、地面に近い所ほど暗くして、立体の感じと足元の陰を出す
// ・目は、暗い目なら黒目に小さな光の点（4 倍の細かさで描く）、色の付いた目はふちを少し暗く
// ・パーツごとに絵の位置をずらし、同じ模様が並ばないようにする
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var Mobs = WG.Mobs, MODELS = WG.MOB_MODELS;
  if (!Mobs || !MODELS) return;
  function h2(a, b, s) { var h = (a * 374761393 + b * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  // 濃淡の絵（0〜1）を RGBA 16×16 に
  function tile(fn) {
    var px = new Uint8Array(1024);
    for (var j = 0; j < 16; j++) for (var i = 0; i < 16; i++) {
      var v = fn(i, j), o = (j * 16 + i) * 4, c = Array.isArray(v) ? v : [v, v, v];
      px[o] = Math.round(clamp(c[0]) * 255); px[o + 1] = Math.round(clamp(c[1]) * 255); px[o + 2] = Math.round(clamp(c[2]) * 255); px[o + 3] = 255;
    }
    return px;
  }
  // なめらかな値のノイズ（周期 16 で端がつながる）
  function vnoise(i, j, cell, s) {
    var x = i / cell, y = j / cell, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, n = 16 / cell;
    function at(a, b) { return h2(((a % n) + n) % n, ((b % n) + n) % n, s); }
    var u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return (at(x0, y0) * (1 - u) + at(x0 + 1, y0) * u) * (1 - v) + (at(x0, y0 + 1) * (1 - u) + at(x0 + 1, y0 + 1) * u) * v;
  }
  var T = {
    // 毛：縦に流れる毛並みと、ところどころ暗い毛
    FUR: tile(function (i, j) { var s = h2(i, Math.floor(j / 3), 11), d = h2(i, j, 12) < 0.08 ? -0.1 : 0; return 0.8 + 0.12 * s + 0.08 * vnoise(i, j, 4, 13) + d; }),
    // 肌：やわらかなまだら
    SKIN: tile(function (i, j) { return 0.87 + 0.08 * vnoise(i, j, 4, 21) + 0.05 * h2(i, j, 22); }),
    // 羊毛：小さな巻き毛のかたまり
    WOOL: tile(function (i, j) { var cx = (i & ~3) + 2 + ((j >> 2) & 1) * 2, cy = (j & ~3) + 2, d = Math.hypot(((i - cx + 24) % 4) - 2 + 0.5, j - cy + 0.5); return 0.7 + 0.3 * Math.max(0, 1 - d / 2.6) + 0.05 * h2(i, j, 31); }),
    // 羽根：重なった羽の弧
    FEATHER: tile(function (i, j) { var r = j % 4, sh = Math.abs(((i + (j >> 2) * 2) % 4) - 1.5); return 0.76 + 0.06 * r + 0.08 * (sh < 1 ? 1 : 0) + 0.05 * h2(i, j, 41); }),
    // 骨：つるりとした白に、細いひび
    BONE: tile(function (i, j) { var c = (h2(i >> 1, j, 51) < 0.07) ? -0.18 : 0; return 0.88 + 0.08 * vnoise(i, j, 8, 52) + c; }),
    // 布：織り目と、ときどき太い縫い目
    CLOTH: tile(function (i, j) { return 0.84 + 0.06 * ((i ^ j) & 1) + 0.05 * h2(i >> 2, j, 61) + (j % 8 === 7 ? -0.08 : 0); }),
    // うろこ：半円が並ぶ
    SCALE: tile(function (i, j) { var row = j >> 2, cx = ((i + row * 2) & 3) - 1.5, cy = (j & 3) - 3, d = Math.hypot(cx, cy); return 0.72 + 0.24 * clamp(1 - d / 3.4) + 0.04 * h2(i, j, 71); }),
    // 甲殻：暗い地に、斜めのつや
    CHITIN: tile(function (i, j) { var g = ((i + j) % 6 === 0) ? 0.14 : 0; return 0.74 + 0.1 * vnoise(i, j, 4, 81) + g; }),
    // まだら（苔むした体）：はっきりした 4 段の濃淡
    MOTTLE: tile(function (i, j) { var v = h2(i >> 1, j >> 1, 91) * 0.5 + h2(i, j, 92) * 0.5; return v < 0.25 ? 0.62 : v < 0.5 ? 0.78 : v < 0.8 ? 0.9 : 1.0; }),
    // 金属：板の合わせ目と鋲、細かい傷
    METAL: tile(function (i, j) { var seam = (i % 8 === 0 || j % 8 === 0) ? -0.16 : 0, rivet = (i % 8 === 2 && j % 8 === 2) ? 0.12 : 0; return 0.86 + 0.06 * vnoise(i, j, 4, 101) + seam + rivet - (h2(i, j, 102) < 0.05 ? 0.1 : 0); }),
    // ゲル：明るい粒の浮いた透けた体
    GEL: tile(function (i, j) { return 0.86 + 0.08 * vnoise(i, j, 8, 111) + (h2(i, j, 112) < 0.05 ? 0.14 : 0); }),
    // 溶岩の体：暗い殻に光るひび
    MAGMA: tile(function (i, j) { var c = Math.abs(vnoise(i, j, 4, 121) - 0.5) < 0.06; return c ? [1, 0.75, 0.35] : 0.6 + 0.15 * h2(i, j, 122); }),
    // 粗い皮：大きなしわ
    HIDE: tile(function (i, j) { return 0.74 + 0.2 * vnoise(i, j, 4, 131) + (h2(i, j, 132) < 0.1 ? -0.08 : 0); }),
    // スカルクの体：暗い地に、明るい斑
    SCULK: tile(function (i, j) { var v = vnoise(i, j, 4, 141); return v > 0.72 ? [0.55, 1, 1] : 0.62 + 0.18 * v; }),
    // 霧の体（ヴェックス・旋風の精）：下ほど薄い
    WISP: tile(function (i, j) { return 0.8 + 0.18 * (1 - j / 16) + 0.06 * vnoise(i, j, 4, 151); }),
    // 炎の体
    FLAME: tile(function (i, j) { var v = vnoise(i, j + 3, 4, 161); return [1, 0.75 + 0.25 * v, 0.55 + 0.35 * v]; }),
    // 木目
    WOOD: tile(function (i, j) { return 0.82 + 0.1 * Math.sin((i + vnoise(i, j, 8, 171) * 6) * 1.3) * 0.5 + 0.06 * h2(i, j, 172); }),
    // 革（鞍）
    LEATHER: tile(function (i, j) { return 0.8 + 0.12 * vnoise(i, j, 4, 181) + ((i === 1 || i === 14) ? -0.12 : 0); }),
    // 目：暗い目は、黒目に光の点（左上）。4 倍の細かさで描くので、2 ピクセルの目でも 8×4 の絵
    EYE: tile(function (i, j) { var glint = (i % 8 >= 1 && i % 8 <= 2 && j % 8 <= 1); return glint ? 0.94 : (i % 8 === 0 || j % 8 === 7) ? 0.06 : 0.13; }),
    // 色の付いた目：ふちを少し暗く、真ん中は明るく
    EYEC: tile(function (i, j) { var e = (i % 4 === 0 || i % 4 === 3 || j % 4 === 3) ? 0.72 : 1; return (i % 8 === 1 && j % 8 === 0) ? 1 : e; })
  };
  WG.EXTRA_TILES = WG.EXTRA_TILES || {};
  Object.keys(T).forEach(function (k) { WG.EXTRA_TILES['MOB_' + k] = T[k]; });
  // 素材ごとの平均の明るさ（色を少し上げて、絵を貼っても暗くならないようにする）
  var GAIN = {};
  Object.keys(T).forEach(function (k) { var s = 0, px = T[k]; for (var q = 0; q < 1024; q += 4) s += px[q] + px[q + 1] + px[q + 2]; GAIN[k] = Math.min(1.35, 255 * 3 * 256 / s * 0.97); });

  // ---------------- 細かい所を足す（鼻の穴・模様・尾・目など） ----------------
  function bx(x, y, z, w, h, d, c, sw) { return { o: [x, y, z], s: [w, h, d], c: [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)], sw: sw || null }; }
  function more(type, list) { if (MODELS[type]) MODELS[type] = MODELS[type].concat(list); }
  more('PIG', [bx(-1.3, 10, 16, 0.9, 1.2, 0.25, '#8a4e4a'), bx(0.4, 10, 16, 0.9, 1.2, 0.25, '#8a4e4a'), bx(-4.5, 14.5, 9, 2, 1, 2.5, '#d99a95'), bx(2.5, 14.5, 9, 2, 1, 2.5, '#d99a95'),
    bx(-0.5, 11.5, -9, 1, 1, 1.2, '#d99a95', 'T1')]);
  more('COW', [bx(-6.15, 14, -7, 0.3, 5, 6, '#e3ddd2'), bx(5.85, 12.5, -1, 0.3, 6, 7, '#e3ddd2'), bx(-2, 15, -9.15, 5, 4, 0.3, '#e3ddd2'),
    bx(-2.5, 9.6, -5, 5, 1.6, 4, '#e8aaa2'), bx(-2, 16, 14.3, 1, 1, 0.2, '#5a4038'), bx(1, 16, 14.3, 1, 1, 0.2, '#5a4038'), bx(-0.5, 12, -10, 1, 8, 1, '#4a382c', 'T1')]);
  more('CHICKEN', [bx(-2, 7, -5, 4, 3, 1.2, '#e4e2dc')]);
  more('SPIDER', [bx(-4, 10.2, 11.9, 1, 0.8, 0.3, '#b02a20'), bx(3, 10.2, 11.9, 1, 0.8, 0.3, '#b02a20'), bx(-0.5, 8.5, 11.9, 1, 0.8, 0.3, '#b02a20')]);
  more('CAVE_SPIDER', [bx(-4, 10.2, 11.9, 1, 0.8, 0.3, '#b02a20'), bx(3, 10.2, 11.9, 1, 0.8, 0.3, '#b02a20'), bx(-0.5, 8.5, 11.9, 1, 0.8, 0.3, '#b02a20')]);
  more('ZOMBIE', [bx(-4.05, 12, -2.05, 8.1, 1.2, 4.1, '#2e5a62'), bx(-1, 27.5, 4, 2, 0.6, 0.2, '#4d6a3f')]);
  more('SKELETON', [bx(-2, 25, 4, 1, 1, 0.3, '#8a8a84'), bx(0, 25, 4, 1, 1, 0.3, '#8a8a84'), bx(-0.5, 26.2, 4, 1, 0.8, 0.3, '#3a3a38')]);
  more('SHEEP', [bx(-1, 17.5, 14, 2, 0.8, 0.2, '#8a7868')]);

  // ---------------- 生き物ごとの素材 ----------------
  // def はふつうの素材、数字はモデルの何番目の箱か（その箱だけ別の素材）
  var HUMAN_CLOTH = { def: 'SKIN', 0: 'CLOTH', 1: 'CLOTH', 2: 'CLOTH' };
  var ILLAGER = { def: 'CLOTH', 5: 'SKIN', 6: 'SKIN' };
  var MAT = {
    PIG: 'SKIN', COW: 'FUR', SHEEP: 'FUR', CHICKEN: 'FEATHER', ZOMBIE: HUMAN_CLOTH, HUSK: HUMAN_CLOTH, DROWNED: HUMAN_CLOTH, SKELETON: 'BONE', DARK_SKELETON: 'BONE', SKULL_BOSS: 'BONE',
    SPIDER: 'CHITIN', CAVE_SPIDER: 'CHITIN', SHELL_GUARD: 'CHITIN', BOMBER: 'MOTTLE', RABBIT: 'FUR', WOLF: 'FUR', SQUID: 'SKIN', BAT: 'FUR', SLIME: 'GEL', MAGMA_SLIME: 'MAGMA',
    VILLAGER: { def: 'CLOTH', 4: 'SKIN', 5: 'SKIN' }, WITCH: { def: 'CLOTH', 6: 'SKIN', 7: 'SKIN', 8: 'SKIN' }, GOLEM: 'METAL',
    HORSE: 'FUR', DONKEY: 'FUR', CAMEL: 'FUR', CAT: 'FUR', FOX: 'FUR', GOAT: 'FUR', TURTLE: 'SCALE', BEE: 'FUR', FISH: 'SCALE', PARROT: 'FEATHER', PANDA: 'FUR', POLAR_BEAR: 'FUR',
    PILLAGER: ILLAGER, VINDICATOR: ILLAGER, EVOKER: ILLAGER, NIGHT_RAY: 'SKIN', EYE_FISH: 'SCALE', DEEP_WARDEN: 'SCULK', PIGLIN: 'SKIN', HOGLIN: 'HIDE', STRIDER: 'SKIN',
    FIRE_SPIRIT: 'FLAME', WAILER: 'SKIN', SHADOW: 'SKIN', END_DRAGON: 'SCALE', VEX: 'WISP', RAVAGER: 'HIDE', WIND_SPIRIT: 'WISP', ARMOR_STAND: 'WOOD'
  };
  function lum(c) { return c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15; }
  function isEye(pt) {
    var s = pt.s, thin = Math.min(s[0], s[1], s[2]), big = Math.max(s[0], s[1], s[2]);
    return pt.sw === 'EYE' || (thin <= 0.6 && big <= 2.5 && (s[0] <= 2.5 && s[1] <= 2.5 && s[2] <= 2.5) && lum(pt.c) < 70);
  }
  var PART = new WeakMap(), built = false;
  function build() {
    built = true;
    Object.keys(MODELS).forEach(function (type) {
      var m = MAT[type] || 'SKIN', parts = MODELS[type];
      if (!Array.isArray(parts)) return;
      parts.forEach(function (pt, i) {
        if (!pt || !pt.o || PART.has(pt.o)) return;
        var mat = typeof m === 'string' ? m : (m[i] || m.def);
        if (pt.wool) mat = 'WOOL';
        if (pt.saddle) mat = 'LEATHER';
        if (pt.tame) mat = 'CLOTH';
        if (type === 'ARMOR_STAND' && i >= 10) mat = 'METAL';
        var eye = isEye(pt);
        if (eye) mat = lum(pt.c) < 70 ? 'EYE' : 'EYEC';
        else if (Math.min(pt.s[0], pt.s[1], pt.s[2]) <= 0.6 && mat !== 'WOOL') mat = 'SKIN';   // 口・鼻・模様など薄い板はなめらかに
        PART.set(pt.o, { mat: mat, eye: eye, darkEye: eye && lum(pt.c) < 70, ofs: Math.floor(h2(i, type.length, 7) * 97) });
      });
      markHead(type, parts);
    });
  }
  // 頭：目のある面をもつ箱（いちばん大きいもの）と、その近くの鼻・耳・角・目。首を軸に向きを変える
  var NO_HEAD = { SLIME: 1, MAGMA_SLIME: 1, BOMBER: 1, END_DRAGON: 1, SQUID: 1, FISH: 1, EYE_FISH: 1, WAILER: 1, SHELL_GUARD: 1, ARMOR_STAND: 1, VEX: 1, TADPOLE: 1, NIGHT_RAY: 1 };
  function markHead(type, parts) {
    if (NO_HEAD[type]) return;
    // 目の候補：小さく薄い板（色は問わない。白目と黒目を重ねた目や、横向きの目も）
    var small = function (pt) { var q = pt.s; return Math.min(q[0], q[1], q[2]) <= 0.6 && Math.max(q[0], q[1], q[2]) <= 2.5; };
    var eyes = parts.filter(function (pt) { return pt && pt.o && (isEye(pt) || (small(pt) && pt.o[1] > 4)); });
    if (!eyes.length) return;
    var head = null, best = 0, total = 0;
    parts.forEach(function (pt) { if (pt && pt.o) total += pt.s[0] * pt.s[1] * pt.s[2]; });
    eyes.forEach(function (e) {
      var ex = e.o[0] + e.s[0] / 2, ey = e.o[1] + e.s[1] / 2, ez = e.o[2] + e.s[2] / 2;
      parts.forEach(function (pt) {
        if (!pt || !pt.o || pt === e || small(pt) || /^(L1|L2|A|W1|W2|T1|T2)$/.test(pt.sw || '')) return;
        var o = pt.o, s = pt.s, v = s[0] * s[1] * s[2], t = 0.8;
        if (ex >= o[0] - t && ex <= o[0] + s[0] + t && ey >= o[1] - t && ey <= o[1] + s[1] + t && ez >= o[2] - t && ez <= o[2] + s[2] + t && v > best) { best = v; head = pt; }
      });
    });
    if (!head || best > total * 0.62) return;
    var o = head.o, s = head.s, piv = [o[0] + s[0] / 2, o[1], o[2] + s[2] * 0.35];
    parts.forEach(function (pt) {
      if (!pt || !pt.o || /^(L1|L2|A|W1|W2|T1|T2)$/.test(pt.sw || '')) return;
      var c = [pt.o[0] + pt.s[0] / 2, pt.o[1] + pt.s[1] / 2, pt.o[2] + pt.s[2] / 2];
      if (c[0] < o[0] - 1.5 || c[0] > o[0] + s[0] + 1.5 || c[1] < o[1] - 0.5 || c[1] > o[1] + s[1] + 4 || c[2] < o[2] - 1 || c[2] > o[2] + s[2] + 3) return;
      var info = PART.get(pt.o);
      if (info && !info.piv) info.piv = piv;
    });
  }
  // 頭の向き：8 ブロック以内のプレイヤーを見る。いなければ、ときどきあたりを見回す
  function updateLook(g, m) {
    var w = g.walker, e = w.eye || w.pos, dx = e[0] - m.x, dz = e[2] - m.z, d = Math.hypot(dx, dz), T = WG.MOB_TYPES[m.type];
    var ty = 0, tp = 0;
    if (d < 8 && !m.dead && !g.spectator) {
      ty = Math.atan2(dx, dz) - m.yaw; ty = Math.atan2(Math.sin(ty), Math.cos(ty));
      tp = Math.atan2(e[1] - (m.y + (T ? T.h : 1) * 0.85), d);
    } else {
      if (!(m._lookT > 0)) { m._lookT = 60 + Math.floor(Math.random() * 120); m._lookY = Math.random() < 0.6 ? 0 : (Math.random() - 0.5) * 1.6; m._lookP = (Math.random() - 0.5) * 0.4; }
      m._lookT--; ty = m._lookY || 0; tp = m._lookP || 0;
    }
    ty = Math.max(-1.1, Math.min(1.1, ty)); tp = Math.max(-0.5, Math.min(0.5, tp));
    m._hy = (m._hy || 0) + (ty - (m._hy || 0)) * 0.12; m._hp = (m._hp || 0) + (tp - (m._hp || 0)) * 0.12;
  }
  WG.mobPartInfo = function (o) { if (!built) build(); return PART.get(o) || null; };

  // ---------------- 箱を描く（素材の絵と、明るさの段差つき） ----------------
  var FACES = [
    [[[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], 1.0, 0],
    [[[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]], 0.5, 0],
    [[[1, 1, 0], [0, 1, 0], [0, 0, 0], [1, 0, 0]], 0.8, 1],
    [[[0, 1, 1], [1, 1, 1], [1, 0, 1], [0, 0, 1]], 0.74, 1],
    [[[0, 1, 0], [0, 1, 1], [0, 0, 1], [0, 0, 0]], 0.66, 2],
    [[[1, 1, 1], [1, 1, 0], [1, 0, 0], [1, 0, 1]], 0.86, 2]
  ], TRI = [0, 1, 2, 0, 2, 3], WHITE = [255, 255, 255];
  function texturedBox(bt, o, s, tf, c, info) {
    var tileId = WG.extraTile('MOB_' + info.mat);
    if (tileId == null) return false;
    var k = info.eye ? 4 : 1, gain = GAIN[info.mat] || 1;
    var col = info.darkEye && lum(c) < 70 ? WHITE : [c[0] * gain, c[1] * gain, c[2] * gain];
    for (var fi = 0; fi < 6; fi++) {
      var F = FACES[fi], w = F[2] === 0 ? s[0] : s[0], hh = F[2] === 0 ? s[2] : s[1];
      if (F[2] === 2) w = s[2];
      var uw = Math.max(1, Math.min(16, w * k)), vh = Math.max(1, Math.min(16, hh * k));
      var ou = info.eye ? 0 : (info.ofs + fi * 5) % Math.max(1, Math.floor(17 - uw)), ov = info.eye ? 0 : (info.ofs * 3 + fi * 7) % Math.max(1, Math.floor(17 - vh));
      var U = [[ou, ov], [ou + uw, ov], [ou + uw, ov + vh], [ou, ov + vh]], C = F[0];
      for (var t = 0; t < 6; t++) {
        var q = TRI[t], p = C[q], lx = o[0] + p[0] * s[0], ly = o[1] + p[1] * s[1], lz = o[2] + p[2] * s[2], P = tf(lx, ly, lz);
        // 面の上ほど明るく（横の面）、体の下の方ほど少し暗く（足元の陰）
        var g = (F[2] ? 0.84 + 0.16 * p[1] : 1) * (0.88 + 0.12 * Math.min(1, ly / 6));
        bt.v(P[0], P[1], P[2], col, F[1] * g, U[q][0], U[q][1], tileId);
      }
    }
    return true;
  }
  var draw = Mobs.prototype.draw;
  Mobs.prototype.draw = function (bt, a, cube) {
    if (!built) build();
    var cur = null, self = this, all = this.list, arrows = this.arrows;
    var wrapped = function (b2, o, s, tf, c) {
      var info = PART.get(o), tf2 = tf;
      if (info && info.piv && cur && !cur.dead && (cur._hy || cur._hp)) {
        var pv = info.piv, ch = Math.cos(cur._hy), sh = Math.sin(cur._hy), cp = Math.cos(cur._hp), sp = Math.sin(cur._hp);
        tf2 = function (lx, ly, lz) {
          var y1 = ly - pv[1], z1 = lz - pv[2], x1 = lx - pv[0];
          var y2 = y1 * cp + z1 * sp, z2 = -y1 * sp + z1 * cp;   // 上を向く・下を向く
          return tf(pv[0] + x1 * ch + z2 * sh, pv[1] + y2, pv[2] - x1 * sh + z2 * ch);   // 左右を向く
        };
      }
      if (info && texturedBox(b2, o, s, tf2, c, info)) return;
      return cube.call(this, b2, o, s, tf2, c);
    };
    // 1 匹ずつ描く（いま描いている生き物の頭の向きを使うため）。矢は最後にまとめて
    try {
      this.arrows = [];
      all.forEach(function (m) { cur = m; updateLook(self.game, m); self.list = [m]; draw.call(self, bt, a, wrapped); });
      cur = null; this.list = []; this.arrows = arrows; draw.call(this, bt, a, wrapped);
    } finally { this.list = all; this.arrows = arrows; }
  };

  // ---------------- 燃えている生き物には炎、すべての生き物の足元に丸い影 ----------------
  var Game = WG.Game;
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    var r = tickExtra.apply(this, arguments), w = this.walker, self = this;
    this.mobs.list.forEach(function (m) {
      if (!(m.fire > 0) || m.dead || Math.abs(m.x - w.pos[0]) > 40 || Math.abs(m.z - w.pos[2]) > 40) return;
      var T = WG.MOB_TYPES[m.type], hgt = T.h * (T.scale || 1) * (m.baby ? 0.5 : 1), wd = T.w * (T.scale || 1) * (m.baby ? 0.5 : 1);
      for (var k = 0; k < 2; k++) self.particles.push({ x: m.x + (Math.random() - 0.5) * wd, y: m.y + Math.random() * hgt * 0.9, z: m.z + (Math.random() - 0.5) * wd,
        vx: 0, vy: 0.05 + Math.random() * 0.04, vz: 0, life: 6 + Math.floor(Math.random() * 6), c: Math.random() < 0.3 ? [255, 236, 140] : [255, 140 + Math.floor(Math.random() * 60), 30], glow: true });
    });
    return r;
  };
  function Strip(alpha) { this.pos = []; this.col = []; this.uv = []; this.lt = []; this.alpha = alpha; }
  Strip.prototype.v = function (x, y, z) { this.pos.push(x * 16, y * 16, z * 16, 0); this.col.push(0, 0, 0, 0); this.uv.push(0, 0, 0, 0); this.lt.push(255, 0, 0, 0); };
  Strip.prototype.disc = function (x, y, z, r) {
    for (var i = 0; i < 12; i++) { var a0 = i / 12 * Math.PI * 2, a1 = (i + 1) / 12 * Math.PI * 2; this.v(x, y, z); this.v(x + Math.cos(a0) * r, y, z + Math.sin(a0) * r); this.v(x + Math.cos(a1) * r, y, z + Math.sin(a1) * r); }
  };
  Strip.prototype.done = function () { return { pos: new Float32Array(this.pos), col: new Uint8Array(this.col), uv: new Uint8Array(this.uv), lt: new Uint8Array(this.lt), count: this.pos.length / 4, alpha: this.alpha }; };
  var gdraw = Game.prototype.draw;
  Game.prototype.draw = function (a) {
    var r = gdraw.apply(this, arguments), wd = this.world, w = this.walker, e = w.eye || w.pos;
    if (!this.view || !this.view.dynamic) return r;
    var core = new Strip(0.46), soft = new Strip(0.24);
    this.mobs.list.forEach(function (m) {
      var T = WG.MOB_TYPES[m.type];
      if (!T || T.swims || m.type === 'END_DRAGON') return;
      var x = m.px + (m.x - m.px) * a, y = m.py + (m.y - m.py) * a, z = m.pz + (m.z - m.pz) * a;
      if (Math.abs(x - e[0]) > 36 || Math.abs(z - e[2]) > 36) return;
      // 足元の床（4 ブロック下まで）。床の上の高さ（ハーフブロックなども）に影を置く
      var gy = null;
      for (var yy = Math.floor(y + 0.01); yy >= Math.floor(y) - 4; yy--) { var id = wd.block(Math.floor(x), yy, Math.floor(z)), c = WG.COLLIDE[id]; if (c > 0 && !WG.FLUID[id]) { gy = yy + Math.min(1, c); break; } }
      if (gy == null || gy > y + 0.05) return;
      var size = T.w * (T.scale || 1) * (m.size || 1) * (m.baby ? 0.5 : 1), k = Math.max(0, 1 - (y - gy) / 3.5);
      if (k <= 0) return;
      var rr = Math.max(0.25, size * 0.62) * (0.6 + 0.4 * k);
      core.disc(x, gy + 0.05, z, rr * 0.72); soft.disc(x, gy + 0.045, z, rr);
    });
    if (soft.pos.length) { this.view.dynamic.unshift(core.done()); this.view.dynamic.unshift(soft.done()); }
    return r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
