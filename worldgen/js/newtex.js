// アイテム図鑑 PDF から加えたブロックの見た目（8×8）。
// PDF のブロック図鑑ではこれらのブロック（作物・キノコ・クモの巣・扉など）は「?」や線画だけなので、
// 同じ 8×8 の大きさで、PDF の板材や土の色を使って描き起こしている。
// 透明な所のある見た目は rgba（RGBA 256 バイト）、面ごとの見た目は top / side / bottom（RGB 192 バイト）。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var TEX = WG.TEXTURES = WG.TEXTURES || {};

  function decode(b64) {
    var bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    var a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  // 文字の絵 → RGBA。pal は文字 → 色（'.' は透明）
  function art(rows, pal) {
    var out = new Uint8Array(256);
    for (var i = 0; i < 64; i++) {
      var ch = rows[i >> 3][i & 7];
      if (ch === '.' || !pal[ch]) continue;
      var c = hex(pal[ch]);
      out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255;
    }
    return out;
  }
  // RGBA → RGB（地図の色の平均に使う。透明な所は平均に入れないよう、見える色で埋める）
  function rgbOf(rgba) {
    var out = new Uint8Array(192), r = 0, g = 0, b = 0, n = 0, i;
    for (i = 0; i < 64; i++) if (rgba[i * 4 + 3]) { r += rgba[i * 4]; g += rgba[i * 4 + 1]; b += rgba[i * 4 + 2]; n++; }
    n = n || 1;
    for (i = 0; i < 64; i++) {
      var a = rgba[i * 4 + 3];
      out[i * 3] = a ? rgba[i * 4] : r / n; out[i * 3 + 1] = a ? rgba[i * 4 + 1] : g / n; out[i * 3 + 2] = a ? rgba[i * 4 + 2] : b / n;
    }
    return out;
  }
  function cutout(rgba) { var c = rgbOf(rgba); return { rgba: rgba, side: c, top: c, bottom: c }; }
  // RGB に係数を掛ける
  function shade(rgb, k, rowK) {
    var out = new Uint8Array(rgb.length);
    for (var i = 0; i < rgb.length; i++) {
      var row = ((i / 3) | 0) >> 3, m = k * (rowK ? rowK[row] : 1);
      out[i] = Math.max(0, Math.min(255, rgb[i] * m));
    }
    return out;
  }

  // ---- 作物 ----
  var GREEN = { a: '#3f7a26', b: '#5c9a34', c: '#7cb848' };
  // 小麦 8 段階：芽から伸びて、最後は黄金色の穂
  var WHEAT = [
    ['........', '........', '........', '........', '........', '........', '..b..b..', '.a.ba.b.'],
    ['........', '........', '........', '........', '........', '.b...b..', '..b.b..b', '.a.ba.a.'],
    ['........', '........', '........', '........', '.c..b...', '..b..b.c', '.b.bb.b.', '.a.ba.a.'],
    ['........', '........', '........', '.c...c..', '..b.b..c', '.b..b.b.', '.a.ba.a.', '.a.aa.a.'],
    ['........', '........', '.c..c...', '..b..b.c', '.b.b..b.', '.b.bb.b.', '.a.ab.a.', '.a.aa.a.'],
    ['........', '.d..d...', '.c..c..d', '..b..b.c', '.b.b..b.', '.b.bb.b.', '.a.ab.a.', '.a.aa.a.'],
    ['.e...e..', '.d.e.d.e', '.d..d..d', '..f..f.d', '.f.f..f.', '.f.ff.f.', '.g.gf.g.', '.g.gg.g.'],
    ['.h..h.h.', 'hh.hh.hh', '.e.he.e.', '.e..e..e', '..f..f.f', '.f.f..f.', '.g.gf.g.', '.g.gg.g.']
  ];
  var WPAL = { a: '#3f7a26', b: '#5c9a34', c: '#7cb848', d: '#94b84a', e: '#c8b04a', f: '#a8a040', g: '#8a8a36', h: '#e0c45a' };
  WHEAT.forEach(function (rows, s) { TEX['WHEAT_' + s] = cutout(art(rows, WPAL)); });
  // ニンジン 4 段階：葉が茂り、最後は橙色の根の頭が見える
  var CARROT = [
    ['........', '........', '........', '........', '........', '........', '..c..c..', '.b.bb.b.'],
    ['........', '........', '........', '........', '..c..c..', '.c.cc.c.', '..b..b..', '.b.bb.b.'],
    ['........', '........', '.c...c..', 'c.c.c.c.', '.cbc.cb.', '..b..b..', '.b.bb.b.', '.a.ab.a.'],
    ['........', '.c..c..c', 'c.cc.cc.', '.cbccbc.', 'c.b..b.c', '.b.bb.b.', '.o.ob.o.', '.p.op.p.']
  ];
  var CPAL = { a: '#3f7a26', b: '#4f8f2e', c: '#6fb040', o: '#e88a2a', p: '#c46a1e' };
  CARROT.forEach(function (rows, s) { TEX['CARROTS_' + s] = cutout(art(rows, CPAL)); });
  // ジャガイモ 4 段階：丸い葉、最後は根元に茶色の芋
  var POTATO = [
    ['........', '........', '........', '........', '........', '........', '..c..c..', '.b.bb.b.'],
    ['........', '........', '........', '........', '.cc..cc.', 'c.bccb.c', '..b..b..', '.b.bb.b.'],
    ['........', '........', '.cc..cc.', 'ccbccbcc', '.cbccbc.', '..b..b..', '.b.bb.b.', '.a.ab.a.'],
    ['........', '.cc..cc.', 'ccbccbcc', 'cdbcdbdc', '.cb..bc.', '.b.bb.b.', 'pp.bpp.b', 'qp.aqp.a']
  ];
  var PPAL = { a: '#3f7a26', b: '#4a8530', c: '#5e9e3a', d: '#7ab84c', p: '#c9a26a', q: '#9c7a4a' };
  POTATO.forEach(function (rows, s) { TEX['POTATOES_' + s] = cutout(art(rows, PPAL)); });

  // ---- キノコ・クモの巣・火 ----
  TEX.BROWN_MUSHROOM = cutout(art(['........', '........', '..aaaa..', '.abbbba.', '.bbcbbb.', '...dd...', '...de...', '...de...'],
    { a: '#b48a66', b: '#9a7457', c: '#c49c78', d: '#e2d8c4', e: '#c8bca6' }));
  TEX.RED_MUSHROOM = cutout(art(['........', '..aaaa..', '.abwaab.', '.awaaba.', '.bbbbbb.', '...dd...', '...de...', '...de...'],
    { a: '#d0443a', b: '#a8322a', w: '#f2ece4', d: '#e2d8c4', e: '#c8bca6' }));
  TEX.COBWEB = cutout(art(['w..w...w', '.w.w..w.', '..www.w.', 'wwwwwwww', '..w.ww..', '.w..w.w.', 'w...w..w', '....w...'],
    { w: '#eceef0' }));
  TEX.FIRE = cutout(art(['..a...a.', '..b..ab.', '.ab.abb.', '.bbabcb.', 'abccbcba', 'bccdccdb', 'cddddddc', 'dddddddd'],
    { a: '#e8902a', b: '#f0a830', c: '#f8cc48', d: '#fde88a' }));

  // ---- 耕地（土の見た目に畝の筋を入れる。湿ると暗い）----
  var dirt = TEX.DIRT;
  if (dirt) {
    var dTop = decode(dirt.top || dirt.side), dSide = decode(dirt.side), dBot = decode(dirt.bottom || dirt.side);
    var furrow = [1, 0.72, 1, 0.72, 1, 0.72, 1, 0.72];
    TEX.FARMLAND = { top: shade(dTop, 0.9, furrow), side: dSide, bottom: dBot };
    TEX.FARMLAND_MOIST = { top: shade(dTop, 0.58, furrow), side: dSide, bottom: dBot };
  }

  // ---- 扉とはしご（板材の見た目から作る）----
  function planks(key) { var t = TEX[key]; return t ? decode(t.side) : null; }
  [['OAK', 'OAK_PLANKS'], ['SPRUCE', 'SPRUCE_PLANKS'], ['ACACIA', 'ACACIA_PLANKS'], ['BIRCH', 'BIRCH_PLANKS'], ['JUNGLE', 'JUNGLE_PLANKS']].forEach(function (w) {
    var p = planks(w[1]);
    if (!p) return;
    function door(upper) {
      var out = new Uint8Array(256);
      for (var j = 0; j < 8; j++) for (var i = 0; i < 8; i++) {
        var q = (j * 8 + i) * 3, o = (j * 8 + i) * 4;
        // 縦の板目：元の板材を 90° 回して使い、縁は暗く
        var src = ((i * 8 + j) * 3), k = 1;
        if (i === 0 || i === 7 || (!upper && j === 7) || (upper && j === 0)) k = 0.62;
        else if (j === 3 || j === 4) k = upper ? 1 : 0.82;
        var a = 255;
        // 上の半分には小さな窓が 2 つ
        if (upper && (j === 2 || j === 3 || j === 5) && (i === 2 || i === 5)) a = 0;
        out[o] = Math.min(255, p[src] * k); out[o + 1] = Math.min(255, p[src + 1] * k); out[o + 2] = Math.min(255, p[src + 2] * k); out[o + 3] = a;
        void q;
      }
      // 下の半分の取っ手
      if (!upper) { var h = (2 * 8 + 6) * 4; out[h] = 60; out[h + 1] = 58; out[h + 2] = 56; }
      var rgb = rgbOf(out), edge = shade(p, 0.75);
      return { rgba: out, side: rgb, top: edge, bottom: edge };
    }
    TEX[w[0] + '_DOOR_L'] = door(false);
    TEX[w[0] + '_DOOR_U'] = door(true);
  });
  var oak = planks('OAK_PLANKS');
  if (oak) {
    var lad = new Uint8Array(256);
    for (var j = 0; j < 8; j++) for (var i = 0; i < 8; i++) {
      var rail = i === 1 || i === 6, rung = (j === 1 || j === 4 || j === 7) && i > 1 && i < 6;
      if (!rail && !rung) continue;
      var o = (j * 8 + i) * 4, src = (j * 8 + i) * 3, k = rail ? 0.78 : 1;
      lad[o] = oak[src] * k; lad[o + 1] = oak[src + 1] * k; lad[o + 2] = oak[src + 2] * k; lad[o + 3] = 255;
    }
    TEX.LADDER = cutout(lad);
  }
  // ---- レッドストーン ----
  // レッドストーントーチ（点いている・消えている）
  var RT = ['........', '...ab...', '...bb...', '...cc...', '...dd...', '...dd...', '...dd...', '...dd...'];
  TEX.REDSTONE_TORCH = cutout(art(RT, { a: '#ff6a50', b: '#e0281c', c: '#8a3a24', d: '#7a5a35' }));
  TEX.REDSTONE_TORCH_OFF = cutout(art(RT, { a: '#6a2a24', b: '#4a1c18', c: '#4a2a1a', d: '#6a4e2e' }));
  // 粉の見た目（白い粒。色は強さに合わせて頂点の色で付ける）：真ん中の点と、まっすぐの線
  WG.EXTRA_TILES = WG.EXTRA_TILES || {};
  WG.EXTRA_TILES.WIRE_DOT = art(['........', '........', '..w.ww..', '..wwww..', '..wwwv..', '..wvww..', '........', '........'], { w: '#ffffff', v: '#d8d8d8' });
  WG.EXTRA_TILES.WIRE_LINE = art(['...ww...', '..wvw...', '...www..', '..wwv...', '...ww...', '..www...', '...wvw..', '...ww...'], { w: '#ffffff', v: '#d8d8d8' });
  var dustTex = rgbOf(WG.EXTRA_TILES.WIRE_DOT);
  for (var rp = 0; rp < 16; rp++) TEX['REDSTONE_WIRE_' + rp] = { rgba: WG.EXTRA_TILES.WIRE_DOT, side: dustTex, top: dustTex, bottom: dustTex };
  // 点いたランプ：PDF のランプの絵を明るく暖かい色に
  if (TEX.REDSTONE_LAMP) {
    var lamp = decode(TEX.REDSTONE_LAMP.side), on = new Uint8Array(192);
    for (var li = 0; li < 64; li++) {
      var l = (lamp[li * 3] + lamp[li * 3 + 1] + lamp[li * 3 + 2]) / 3 / 255;
      on[li * 3] = Math.min(255, 200 + l * 90); on[li * 3 + 1] = Math.min(255, 140 + l * 160); on[li * 3 + 2] = Math.min(255, 60 + l * 120);
    }
    TEX.REDSTONE_LAMP_ON = { side: on, top: on, bottom: on };
  }
  // 鉄の扉（明るい灰色、鋲と窓）
  function ironDoor(upper) {
    var rows = upper ? ['dddddddd', 'dlllllld', 'dl.ll.ld', 'dl.ll.ld', 'dlllllld', 'dl.ll.ld', 'dlllllld', 'dmlmmlmd'] :
      ['dmlmmlmd', 'dlllllld', 'dlrllrld', 'dllllkld', 'dllllkld', 'dlrllrld', 'dlllllld', 'dddddddd'];
    var rgba = art(rows, { d: '#8c8c8c', l: '#d6d6d6', m: '#c0c0c0', r: '#a8a8a8', k: '#5c5c5c' });
    var edge = rgbOf(art(['dddddddd', 'dddddddd', 'dddddddd', 'dddddddd', 'dddddddd', 'dddddddd', 'dddddddd', 'dddddddd'], { d: '#a8a8a8' }));
    return { rgba: rgba, side: rgbOf(rgba), top: edge, bottom: edge };
  }
  TEX.IRON_DOOR_L = ironDoor(false); TEX.IRON_DOOR_U = ironDoor(true);
  // サトウキビ、ネザーウォート（4 段階）
  TEX.SUGAR_CANE = cutout(art(['.a...b..', '.a..bb..', '.ac.b...', '.a..bc..', 'ca..b...', '.a..b..c', '.ac.bc..', '.a..b...'], { a: '#8ac25a', b: '#74ae48', c: '#a8d878' }));
  var WART = [
    ['........', '........', '........', '........', '........', '...a....', '...b..a.', '..bb.bb.'],
    ['........', '........', '........', '........', '..a..a..', '..b.ab..', '.bb.bb..', '.b..b...'],
    ['........', '........', '..a..a..', '.aab.aa.', '..b.ab..', '.bb.bb..', '..b.b...', '.b..b...'],
    ['........', '.aa..aa.', 'acab.aca', '.ab.aab.', '..b.ab..', '.bb.bb..', '..b.b...', '.b..b...']
  ];
  WART.forEach(function (rows, i) { TEX['NETHER_WART_' + i] = cutout(art(rows, { a: '#a8242c', b: '#6a1a1e', c: '#d04048' })); });
})(typeof window !== 'undefined' ? window : globalThis);
