// 道具と作業台（ロードマップ 第 5 段階）
// 砥石：エンチャントを外して経験値に戻す。同じ道具 2 つを合わせて直す
// 金床：名前を付ける。使うたびに少しずつ傷み（欠けた → 壊れかけ → 壊れる）
// 機織り機：模様を増やし、模様を絵で選べるようにする。旗のアイコンにも模様を描く
// 地図：額縁に入れると、額縁いっぱいに地図を描く
// 花火：花火の星（色・消えるときの色・形・尾・きらめき）と、飛ぶ高さ・星を入れたロケット花火
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game;
  var C16 = WG.COLORS16;
  function keyOf(id) { return WG.BLOCKS[id] ? WG.BLOCKS[id].key : ''; }
  function rgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function clone(o) { return o ? JSON.parse(JSON.stringify(o)) : o; }
  function blockItem(key, hardness, drop, tool) {
    var id = B[key]; ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: 1, dropMax: 1, dropChance: 1 };
    if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = 0; }
    return ITEMS[key];
  }
  blockItem('GRINDSTONE', 2, 'GRINDSTONE', 'pickaxe');
  blockItem('CHIPPED_ANVIL', 5, 'CHIPPED_ANVIL', 'pickaxe');
  blockItem('DAMAGED_ANVIL', 5, 'DAMAGED_ANVIL', 'pickaxe');
  ITEMS.FIREWORK_STAR = { key: 'FIREWORK_STAR', name: '花火の星', block: -1, max: 64 };
  Craft.SHAPED.push([['SWS', 'P P'], { S: 'STICK', W: 'COBBLESTONE_SLAB', P: 'PLANKS' }, 'GRINDSTONE', 1]);
  if (WG.GRAVITY && WG.GRAVITY[B.ANVIL]) WG.GRAVITY[B.CHIPPED_ANVIL] = WG.GRAVITY[B.DAMAGED_ANVIL] = WG.GRAVITY[B.ANVIL];
  var ANVILS = [B.ANVIL, B.CHIPPED_ANVIL, B.DAMAGED_ANVIL];
  WG.EXTRA_SCREENS = WG.EXTRA_SCREENS || {};
  WG.EXTRA_SCREENS.grind = 1;

  // ---------------- 砥石 ----------------
  // 戻る経験値：外したエンチャントのレベルの合計から（本家と同じく、半分〜全部のあいだ）
  function grindXP(s) { var t = 0; Object.keys((s && s.ench) || {}).forEach(function (k) { t += s.ench[k] * 3; }); return t; }
  function grindResult(a, b) {
    if (!a && !b) return null;
    var one = a && b ? null : a || b;
    if (one) {
      if (!one.ench || !Object.keys(one.ench).length) return null;
      var out = { key: one.key === 'ENCHANTED_BOOK' ? 'BOOK' : one.key, n: 1 };
      if (one.dmg) out.dmg = one.dmg;
      if (one.name) out.name = one.name;
      return { item: out, xp: grindXP(one) };
    }
    // 同じ道具 2 つ：耐久を足して、さらに 5% 直す。エンチャントは外れる
    var ia = ITEMS[a.key];
    if (a.key !== b.key || !ia || !ia.dur || a.n !== 1 || b.n !== 1) return null;
    var left = (ia.dur - (a.dmg || 0)) + (ia.dur - (b.dmg || 0)) + Math.floor(ia.dur * 0.05);
    var o2 = { key: a.key, n: 1 }, d = Math.max(0, ia.dur - left);
    if (d) o2.dmg = d;
    if (a.name) o2.name = a.name;
    return { item: o2, xp: grindXP(a) + grindXP(b) };
  }
  WG.grindResult = grindResult;

  // ---------------- 金床：名前と傷み ----------------
  function cleanName(t) { return String(t == null ? '' : t).replace(/[<>"'&\\]/g, '').trim().slice(0, 30); }
  WG.cleanItemName = cleanName;
  // 名前を変えたときの結果（合わせる・直すの結果に重ねる。名前だけなら費用 1）
  WG.anvilWithName = function (a, b, name) {
    var base = b ? WG.anvilCombine(a, b) : null;
    if (!a) return base;
    if (name == null) return base;
    name = cleanName(name);
    var cur = a.name || '';
    if (name === cur || (name === WG.itemName(a.key) && !cur)) return base;
    if (base && base.tooExpensive) return base;
    var res = base ? { item: clone(base.item), cost: base.cost, use: base.use } : { item: clone(a), cost: 0, use: 0 };
    res.item.n = base ? res.item.n : a.n;
    if (name) res.item.name = name; else delete res.item.name;
    res.cost += 1; res.renamed = true;
    return res;
  };
  // 使ったあとの傷み（12%）：金床 → 欠けた金床 → 壊れかけの金床 → 壊れる
  WG.anvilWear = function (wd, x, y, z, roll) {
    var id = wd.block(x, y, z), i = ANVILS.indexOf(id);
    if (i < 0 || roll >= 0.12) return id;
    var nx = i < 2 ? ANVILS[i + 1] : B.AIR;
    wd.setBlock(x, y, z, nx);
    return nx;
  };

  // ---------------- 旗の模様を増やす ----------------
  // 布は 14×28。条件 f(x, y) を満たすところを、横に続く四角にまとめる
  function rects(f) {
    var out = [];
    for (var y = 0; y < 28; y++) {
      var x0 = -1;
      for (var x = 0; x <= 14; x++) {
        var on = x < 14 && f(x + 0.5, y + 0.5);
        if (on && x0 < 0) x0 = x;
        if (!on && x0 >= 0) { out.push([x0, y, x, y + 1]); x0 = -1; }
      }
    }
    // 縦に同じ幅で続くものは 1 つにまとめる（描く箱を減らす）
    var merged = [];
    out.forEach(function (r) {
      var m = merged.filter(function (q) { return q[0] === r[0] && q[2] === r[2] && q[3] === r[1]; })[0];
      if (m) m[3] = r[3]; else merged.push(r.slice());
    });
    return merged;
  }
  var NEW_PATTERNS = [
    ['half_bottom', '下半分', function (x, y) { return y >= 14; }],
    ['half_right', '右半分', function (x, y) { return x >= 7; }],
    ['diagonal_right', '右上の斜め', function (x, y) { return y < x * 2; }],
    ['diagonal_left', '左上の斜め', function (x, y) { return y < (14 - x) * 2; }],
    ['triangle_bottom', '下の三角', function (x, y) { return y > 20 + Math.abs(x - 7) * 1.1; }],
    ['triangle_top', '上の三角', function (x, y) { return y < 8 - Math.abs(x - 7) * 1.1; }],
    ['teeth_bottom', '下のぎざぎざ', function (x, y) { return y > 28 - 4 + Math.abs((x % 4.67) - 2.33) * 1.6; }],
    ['teeth_top', '上のぎざぎざ', function (x, y) { return y < 4 - Math.abs((x % 4.67) - 2.33) * 1.6; }],
    ['circle', '中央の円', function (x, y) { return (x - 7) * (x - 7) + (y - 14) * (y - 14) < 18; }],
    ['rhombus', 'ひし形', function (x, y) { return Math.abs(x - 7) / 5.5 + Math.abs(y - 14) / 9 < 1; }],
    ['saltire', '斜めの十字', function (x, y) { return Math.abs(y / 2 - x) < 1.3 || Math.abs(y / 2 - (14 - x)) < 1.3; }],
    ['corner_tl', '左上の角', function (x, y) { return x < 6 && y < 10; }],
    ['corner_br', '右下の角', function (x, y) { return x >= 8 && y >= 18; }],
    ['bricks', 'れんが', function (x, y) { var row = Math.floor(y / 4); return y % 4 < 1 || (x + (row % 2 ? 3.5 : 0)) % 7 < 1; }],
    ['checker', '市松', function (x, y) { return (Math.floor(x / 3.5) + Math.floor(y / 3.5)) % 2 === 0; }],
    ['gradient', '上からのぼかし', function (x, y) { var t = y / 18, d = ((Math.floor(x) * 5 + Math.floor(y) * 3) % 8) / 8; return t < 1 && d >= t; }],
    ['sun', '日の輪', function (x, y) { var dx = x - 7, dy = y - 11, r = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx); return r < 2.8 || (r > 4 && r < 6.2 && Math.abs(((a / (Math.PI / 4)) % 1 + 1) % 1 - 0.5) > 0.32); }],
    ['leaf', '一枚の葉', function (x, y) { if (y > 22 && y < 26) return Math.abs(x - 7) < 0.6; if (y < 5 || y > 22) return false; var w = Math.sin(Math.PI * (y - 5) / 17) * 4.6; return Math.abs(x - 7) < w && Math.abs(x - 7) > 0.45; }]
  ];
  var PATTERNS = WG.BANNER_PATTERNS;
  NEW_PATTERNS.forEach(function (p) { PATTERNS.push([p[0], p[1], rects(p[2])]); });
  function colorHex(name) { var c = C16.filter(function (q) { return q[0] === name; })[0]; return c ? c[2] : '#e9ecec'; }
  function covered(pat, x, y) { return pat[2].some(function (r) { return x >= r[0] && x < r[2] && y >= r[1] && y < r[3]; }); }
  function patternOf(key) { return PATTERNS.filter(function (pp) { return pp[0] === key; })[0]; }
  // 旗の布の色（14×28）を 1 マスずつ求める
  function clothColor(base, layers, x, y) {
    var c = colorHex(base);
    (layers || []).forEach(function (ly) { var p = patternOf(ly.p); if (p && covered(p, x, y)) c = colorHex(ly.c); });
    return c;
  }
  WG.bannerClothColor = clothColor;
  // 旗の絵（機織り機の見本と、できあがりの大きな見本）
  var bannerCache = {};
  function bannerURL(base, layers, scale) {
    var ck = base + '|' + JSON.stringify(layers || []) + '|' + scale;
    if (bannerCache[ck]) return bannerCache[ck];
    if (typeof document === 'undefined') return '';
    var c = document.createElement('canvas'), W = 14 * scale, H = 28 * scale;
    c.width = W + 2 * scale; c.height = H + 4 * scale;
    var x = c.getContext('2d');
    x.fillStyle = '#5e4128'; x.fillRect(0, 0, c.width, 2 * scale);
    x.fillStyle = '#8a6440'; x.fillRect(0, 0, c.width, scale);
    for (var j = 0; j < 28; j++) for (var i = 0; i < 14; i++) {
      var col = rgb(clothColor(base, layers, i + 0.5, j + 0.5)), sh = 1 - 0.14 * (i / 13) + (i === 0 ? 0.08 : 0) - (j > 25 ? 0.06 : 0);
      x.fillStyle = 'rgb(' + col.map(function (v) { return Math.max(0, Math.min(255, Math.round(v * sh))); }).join(',') + ')';
      x.fillRect(scale + i * scale, 2 * scale + j * scale, scale, scale);
    }
    return (bannerCache[ck] = c.toDataURL());
  }
  WG.bannerURL = bannerURL;

  // ---------------- 持ち物の絵：模様のある旗・色の付いた花火の星 ----------------
  var stackIconCache = {};
  function pixelsURL(px) {
    if (typeof document === 'undefined') return '';
    var c = document.createElement('canvas'); c.width = c.height = 16;
    var x = c.getContext('2d'), im = x.createImageData(16, 16);
    im.data.set(px); x.putImageData(im, 0, 0);
    return c.toDataURL();
  }
  function lum(c) { return c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; }
  // 花火の色（染料の色を、夜空で映えるように明るくしたもの）
  var FW_RGB = { WHITE: [240, 240, 240], ORANGE: [255, 150, 40], MAGENTA: [230, 90, 220], LIGHT_BLUE: [120, 190, 255], YELLOW: [255, 230, 70], LIME: [140, 240, 70],
    PINK: [255, 150, 190], GRAY: [150, 150, 160], LIGHT_GRAY: [200, 200, 210], CYAN: [70, 210, 220], PURPLE: [170, 90, 240], BLUE: [70, 100, 255],
    BROWN: [190, 120, 70], GREEN: [80, 190, 60], RED: [255, 70, 60], BLACK: [80, 80, 100] };
  WG.FW_RGB = FW_RGB;
  // 星のアイコンで色に置き換える 3 つの点の色（js/icons の FIREWORK_STAR と同じ）
  var SPECK = [[224, 64, 64], [240, 208, 64], [64, 128, 224]];
  WG.stackIconURL = function (s) {
    var it = ITEMS[s.key];
    if (it && it.banner && s.layers && s.layers.length) {
      var ck = 'b|' + it.banner + '|' + JSON.stringify(s.layers);
      if (stackIconCache[ck]) return stackIconCache[ck];
      var px = WG.itemIcon16(s.key);
      if (!px) return WG.iconURL(s.key);
      px = new Uint8ClampedArray(px);
      var mid = [px[(5 * 16 + 6) * 4], px[(5 * 16 + 6) * 4 + 1], px[(5 * 16 + 6) * 4 + 2]], ml = Math.max(1, lum(mid));
      // 布の中（行 3〜13、輪郭と棒は除く）を、14×28 の布に当てて塗る
      for (var y = 3; y <= 13; y++) for (var x = 3; x <= 12; x++) {
        var o = (y * 16 + x) * 4;
        if (!px[o + 3]) continue;
        var cur = [px[o], px[o + 1], px[o + 2]], l = lum(cur);
        if (l < 60 || (Math.abs(cur[0] - 138) < 30 && Math.abs(cur[1] - 98) < 30 && Math.abs(cur[2] - 50) < 25 && it.banner !== 'BROWN' && it.banner !== 'ORANGE')) continue;
        var u = (x - 4 + 0.5) / 8 * 14, v = (y - 3 + 0.5) / 11 * 28, hex = clothColor(it.banner, s.layers, u, v);
        if (hex === colorHex(it.banner)) continue;
        var c = rgb(hex), k = Math.max(0.7, Math.min(1.3, l / ml));
        px[o] = Math.min(255, c[0] * k); px[o + 1] = Math.min(255, c[1] * k); px[o + 2] = Math.min(255, c[2] * k);
      }
      return (stackIconCache[ck] = pixelsURL(px));
    }
    if (s.key === 'FIREWORK_STAR' && s.star && s.star.c && s.star.c.length) {
      var ck2 = 's|' + s.star.c.join(',');
      if (stackIconCache[ck2]) return stackIconCache[ck2];
      var p2 = WG.itemIcon16('FIREWORK_STAR');
      if (!p2) return WG.iconURL(s.key);
      p2 = new Uint8ClampedArray(p2);
      for (var i = 0; i < 256; i++) {
        var o2 = i * 4;
        for (var sI = 0; sI < 3; sI++) if (Math.abs(p2[o2] - SPECK[sI][0]) < 6 && Math.abs(p2[o2 + 1] - SPECK[sI][1]) < 6 && Math.abs(p2[o2 + 2] - SPECK[sI][2]) < 6) {
          var cc = FW_RGB[s.star.c[sI % s.star.c.length]] || [255, 255, 255];
          p2[o2] = cc[0]; p2[o2 + 1] = cc[1]; p2[o2 + 2] = cc[2];
        }
      }
      return (stackIconCache[ck2] = pixelsURL(p2));
    }
    return WG.iconURL(s.key);
  };
  // 枠の説明（マウスを乗せたとき）
  var SHAPE_NAME = { ball: '小さな玉', large: '大きな玉', star: '星形', burst: '弾ける', ring: '輪' };
  function colorNames(list) { return list.map(function (c) { var q = C16.filter(function (r) { return r[0] === c; })[0]; return q ? q[1].replace(/色$/, '') : c; }).join('・'); }
  function starText(st) {
    var t = SHAPE_NAME[st.s || 'ball'] + '、' + colorNames(st.c || []);
    if (st.f && st.f.length) t += '→' + colorNames(st.f);
    if (st.t) t += '、尾を引く';
    if (st.k) t += '、きらめく';
    return t;
  }
  WG.stackInfo = function (s) {
    if (s.key === 'FIREWORK_STAR' && s.star) return '（' + starText(s.star) + '）';
    if (s.fw) return '（飛ぶ高さ ' + (s.fw.flight || 1) + (s.fw.stars && s.fw.stars.length ? '・' + s.fw.stars.map(starText).join('／') : '') + '）';
    if (s.layers && s.layers.length) return '（' + s.layers.map(function (l) { var p = patternOf(l.p); return colorNames([l.c]) + 'の' + (p ? p[1] : l.p); }).join('、') + '）';
    if (s.name) return '（' + WG.itemName(s.key) + '）';
    return '';
  };

  // ---------------- 花火の星とロケット花火を作る ----------------
  var SHAPE_ITEM = { FIRE_CHARGE: 'large', GOLD_NUGGET: 'star', FEATHER: 'burst', AMETHYST_SHARD: 'ring' };
  function dyeOf(key) { var m = /^(\w+)_DYE$/.exec(key); return m && FW_RGB[m[1]] ? m[1] : null; }
  // 作業台の枠（束の並び）から、花火の作り方に合うものを探す
  function fireworkCraft(stacks) {
    var cells = stacks.filter(Boolean), cnt = {}, dyes = [], stars = [], other = [];
    if (!cells.length) return null;
    cells.forEach(function (s) {
      cnt[s.key] = (cnt[s.key] || 0) + 1;
      var d = dyeOf(s.key);
      if (d) dyes.push(d);
      else if (s.key === 'FIREWORK_STAR') stars.push(s);
      else if (['PAPER', 'GUNPOWDER', 'DIAMOND', 'GLOWSTONE_DUST'].indexOf(s.key) < 0 && !SHAPE_ITEM[s.key]) other.push(s);
    });
    if (other.length) return null;
    var gp = cnt.GUNPOWDER || 0, shapes = Object.keys(SHAPE_ITEM).filter(function (k) { return cnt[k]; });
    // ロケット花火：紙 1・火薬 1〜3・星 0〜7
    if (cnt.PAPER === 1 && gp >= 1 && gp <= 3 && !dyes.length && !shapes.length && !cnt.DIAMOND && !cnt.GLOWSTONE_DUST) {
      if (gp === 1 && !stars.length) return null;   // ただのロケット花火（今までのレシピ）
      return { key: 'FIREWORK_ROCKET', n: 3, fw: { flight: gp, stars: stars.map(function (s) { return clone(s.star || { c: ['WHITE'], s: 'ball' }); }) } };
    }
    // 消える色を足す：星 1・染料 1〜8
    if (stars.length === 1 && dyes.length && !gp && !cnt.PAPER && !shapes.length && !cnt.DIAMOND && !cnt.GLOWSTONE_DUST) {
      var st = clone(stars[0].star || { c: ['WHITE'], s: 'ball' });
      st.f = dyes;
      return { key: 'FIREWORK_STAR', n: 1, star: st };
    }
    // 星：火薬 1・染料 1〜8・形 0〜1・ダイヤモンド（尾）・グロウストーンダスト（きらめき）
    if (gp === 1 && !stars.length && !cnt.PAPER && dyes.length && shapes.length <= 1 && (!shapes.length || cnt[shapes[0]] === 1) && (cnt.DIAMOND || 0) <= 1 && (cnt.GLOWSTONE_DUST || 0) <= 1) {
      var o = { c: dyes, s: shapes.length ? SHAPE_ITEM[shapes[0]] : 'ball' };
      if (cnt.DIAMOND) o.t = true;
      if (cnt.GLOWSTONE_DUST) o.k = true;
      return { key: 'FIREWORK_STAR', n: 1, star: o };
    }
    return null;
  }
  WG.fireworkCraft = fireworkCraft;
  var updateCraft = Game.prototype.updateCraft;
  Game.prototype.updateCraft = function () {
    updateCraft.apply(this, arguments);
    var fw = fireworkCraft(this.craft || []);
    if (fw) this.craftResult = fw;
  };

  // ---------------- 花火が開く ----------------
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  WG.fireworkBurst = function (g, r, st) {
    var cols = (st.c || ['WHITE']).map(function (c) { return FW_RGB[c] || [255, 255, 255]; }), fade = st.f && st.f.length ? st.f.map(function (c) { return FW_RGB[c] || [255, 255, 255]; }) : null;
    var shape = st.s || 'ball', pts = [], i, n;
    var R3 = function () { var th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1); return [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)]; };
    // 平らな形は、プレイヤーのほうを向く面に描く
    var p = g.walker.pos, dx = r.x - p[0], dz = r.z - p[2], dl = Math.sqrt(dx * dx + dz * dz) || 1, ux = -dz / dl, uz = dx / dl;
    if (shape === 'ball' || shape === 'large') {
      n = shape === 'large' ? 150 : 80;
      var sp = shape === 'large' ? 0.44 : 0.24;
      for (i = 0; i < n; i++) { var d = R3(), k = sp * (0.92 + Math.random() * 0.1); pts.push([d[0] * k, d[1] * k, d[2] * k]); }
    } else if (shape === 'star') {
      // 5 つの角の星の輪郭
      var corners = [];
      for (i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.42 : 1; corners.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      for (i = 0; i < 10; i++) {
        var c0 = corners[i], c1 = corners[(i + 1) % 10];
        for (var s = 0; s < 8; s++) { var t = s / 8, px = c0[0] + (c1[0] - c0[0]) * t, py = c0[1] + (c1[1] - c0[1]) * t; pts.push([px * ux * 0.32, -py * 0.32, px * uz * 0.32]); }
      }
    } else if (shape === 'ring') {
      // 少し傾いた 2 重の輪
      var tilt = 0.35 + Math.random() * 0.4;
      for (var ring = 0; ring < 2; ring++) for (i = 0; i < 56; i++) {
        var an = i / 56 * Math.PI * 2, rk = ring ? 0.2 : 0.3, cx = Math.cos(an) * rk, cy = Math.sin(an) * rk;
        pts.push([cx * ux, cy * Math.cos(tilt), cx * uz + cy * Math.sin(tilt)]);
      }
    } else {
      // 弾ける：ばらばらの速さで、少し上向きに散る
      for (i = 0; i < 120; i++) { var d2 = R3(), k2 = 0.06 + Math.random() * 0.34; pts.push([d2[0] * k2, d2[1] * k2 + 0.05, d2[2] * k2]); }
    }
    pts.forEach(function (v, j) {
      var life = 30 + Math.floor(Math.random() * 16), c = cols[j % cols.length];
      g.particles.push({ x: r.x, y: r.y, z: r.z, vx: v[0], vy: v[1], vz: v[2], life: life, life0: life, c: c.slice(), c0: c, glow: true, fw: true, fwx: true,
        sz: shape === 'large' ? 0.12 : 0.1, fade: fade ? fade[j % fade.length] : null, trail: !!st.t, tw: !!st.k });
    });
    // 開いた瞬間の光
    g.particles.push({ x: r.x, y: r.y, z: r.z, vx: 0, vy: 0, vz: 0, life: 3, c: [255, 250, 230], glow: true, fw: true, sz: shape === 'large' ? 0.9 : 0.6 });
    if (st.k && WG.Sound) for (var q = 0; q < 2; q++) WG.Sound.play('firework', r.x, r.y, r.z);
  };
  // 星の粒：消える色へ変わる・尾を引く・きらめく
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    tickExtra.apply(this, arguments);
    var ps = this.particles, add = [], tc = this.tickCount || 0;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (!p.fwx) continue;
      var t = 1 - p.life / p.life0;
      if (p.fade && t > 0.45) p.c = mix(p.c0, p.fade, Math.min(1, (t - 0.45) / 0.3));
      if (p.trail && tc % 2 === 0 && p.life > 6) add.push({ x: p.x, y: p.y, z: p.z, vx: 0, vy: -0.012, vz: 0, life: 10, c: mix(p.c, [255, 240, 200], 0.4), glow: true, fw: true, sz: 0.06 });
      if (p.tw && t > 0.35) p.sz = Math.random() < 0.45 ? 0.002 : 0.13;
      else if (t > 0.8) p.sz = 0.1 * (1 - (t - 0.8) / 0.2) + 0.02;
    }
    if (add.length) Array.prototype.push.apply(ps, add.slice(0, 600));
  };

  // ---------------- 額縁の地図 ----------------
  // アトラスの中に、64×64 の地図を 8 枚分（1 枚 = 16×16 の絵 16 枚）確保しておき、使うときに描き込む
  var SLOTS = 8, slotKey = new Array(SLOTS).fill(null), slotUse = new Array(SLOTS).fill(0), slotTime = new Array(SLOTS).fill(-1e9), slotEdits = new Array(SLOTS).fill(-1);
  WG.EXTRA_TILES = WG.EXTRA_TILES || {};
  for (var si = 0; si < SLOTS; si++) for (var ti = 0; ti < 16; ti++) {
    var blank = new Uint8Array(256 * 4);
    for (var bi = 0; bi < 256; bi++) { blank[bi * 4] = 214; blank[bi * 4 + 1] = 196; blank[bi * 4 + 2] = 150; blank[bi * 4 + 3] = 255; }
    blank[0] = si; blank[1] = ti; blank[2] = 77;   // 同じ絵としてまとめられないように、1 点だけ違える
    WG.EXTRA_TILES['MAPSLOT_' + si + '_' + ti] = blank;
  }
  var uploads = [];
  // 地図の 64×64 の色（真上から見た地形を、紙の地図の色にする）
  function mapPixels(world, mp) {
    var size = 128 << (mp.scale || 0), half = size / 2, step = size / 64, out = new Uint8Array(64 * 64 * 4), tile = new Uint8ClampedArray(256 * 4);
    var cx0 = Math.floor((mp.x - half) / 16), cz0 = Math.floor((mp.z - half) / 16), n = size >> 4;
    for (var cz = 0; cz < n; cz++) for (var cx = 0; cx < n; cx++) {
      WG.Paint.topTile(world, cx0 + cx, cz0 + cz, world.dim.view.yMax, tile, 1);
      for (var j = 0; j < 16; j += step) for (var i = 0; i < 16; i += step) {
        var px = Math.floor((cx * 16 + i) / step), pz = Math.floor((cz * 16 + j) / step), o = (pz * 64 + px) * 4, q = (j * 16 + i) * 4;
        if (px > 63 || pz > 63) continue;
        out[o] = Math.round((tile[q] * 0.78 + 52) / 12) * 12; out[o + 1] = Math.round((tile[q + 1] * 0.76 + 48) / 12) * 12; out[o + 2] = Math.round((tile[q + 2] * 0.7 + 36) / 12) * 12; out[o + 3] = 255;
      }
    }
    // 紙の縁
    for (var e = 0; e < 64; e++) [[e, 0], [e, 63], [0, e], [63, e]].forEach(function (c) { var o2 = (c[1] * 64 + c[0]) * 4; out[o2] = 196; out[o2 + 1] = 176; out[o2 + 2] = 128; out[o2 + 3] = 255; });
    return out;
  }
  WG.mapPixels = mapPixels;
  var frameTick = 0, drawnThisFrame = 0;
  WG.frameMap = function (wd, solid, mp, q, n, R, lt) {
    if (mp.dim && mp.dim !== wd.dimKey) return false;
    var ck = (mp.dim || '') + '|' + mp.x + '|' + mp.z + '|' + (mp.scale || 0), s = slotKey.indexOf(ck);
    frameTick++;
    var stale = s >= 0 && slotEdits[s] !== wd.editCount && frameTick - slotTime[s] > 600;
    if (s < 0 || stale) {
      if (drawnThisFrame > 0 && s < 0) return false;   // 1 回に描き直すのは 1 枚だけ
      if (s < 0) { s = 0; for (var k = 1; k < SLOTS; k++) if (slotUse[k] < slotUse[s]) s = k; }
      var px;
      try { px = mapPixels(wd, mp); } catch (e) { return false; }
      drawnThisFrame++;
      slotKey[s] = ck; slotTime[s] = frameTick; slotEdits[s] = wd.editCount;
      for (var t = 0; t < 16; t++) {
        var tp = new Uint8Array(256 * 4), tx = (t % 4) * 16, ty = Math.floor(t / 4) * 16;
        for (var y = 0; y < 16; y++) tp.set(px.subarray(((ty + y) * 64 + tx) * 4, ((ty + y) * 64 + tx + 16) * 4), y * 64);
        uploads.push({ tile: WG.extraTile('MAPSLOT_' + s + '_' + t), px: tp });
      }
    }
    slotUse[s] = frameTick;
    var cx = q[0] + 0.5 - n[0] * (0.5 - 0.08), cz = q[2] + 0.5 - n[1] * (0.5 - 0.08), y0 = q[1] + 1, c = [235, 235, 235];
    for (var j = 0; j < 4; j++) for (var i = 0; i < 4; i++) {
      var a0 = -0.5 + i * 0.25, a1 = a0 + 0.25, h0 = y0 - j * 0.25, h1 = h0 - 0.25;
      WG.quad3d(solid, [[cx + R[0] * a0, h0, cz + R[1] * a0], [cx + R[0] * a1, h0, cz + R[1] * a1], [cx + R[0] * a1, h1, cz + R[1] * a1], [cx + R[0] * a0, h1, cz + R[1] * a0]],
        WG.extraTile('MAPSLOT_' + s + '_' + (j * 4 + i)), c, lt);
    }
    return true;
  };
  WG.frameMapUploads = uploads;
  // 描いた地図をアトラスへ送る（描く前に、まとめて）
  if (WG.View3D) {
    var render = WG.View3D.prototype.render;
    WG.View3D.prototype.render = function () {
      drawnThisFrame = 0;
      if (uploads.length && this.gl && this.atlasTex) {
        var gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
        uploads.splice(0).forEach(function (u) { if (u.tile == null) return; gl.texSubImage2D(gl.TEXTURE_2D, 0, (u.tile % 32) * 16, Math.floor(u.tile / 32) * 16, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, u.px); });
      }
      return render.apply(this, arguments);
    };
  }

  // ---------------- 右クリック：砥石・金床 ----------------
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var w = this.walker, t = w.target, shift = w.keys.ShiftLeft || w.keys.ShiftRight, self = this;
    if (t && !this.spectator && !shift && !(this.mobs.target && this.mobs.target.mob)) {
      if (t.id === B.GRINDSTONE) { this.mouseR = this.clickR = false; this.workSlots = [null, null]; this.openInventory('grind'); return; }
      if (ANVILS.indexOf(t.id) >= 0) { this.mouseR = this.clickR = false; this.anvilPos = [t.x, t.y, t.z]; this.anvilName = null; this.openInventory('anvil'); return; }
    }
    return use.apply(this, arguments);
  };

  // ---------------- 画面 ----------------
  function slotHtml(c, i, s, extra) { return WG.slotHTMLFull(c, i, s, extra); }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  var renderExtraScreen = Game.prototype.renderExtraScreen;
  Game.prototype.renderExtraScreen = function (sc) {
    var ws = this.workSlots || (this.workSlots = [null, null]), html = '', self = this;
    if (sc === 'grind') {
      var res = grindResult(ws[0], ws[1]);
      this.grindRes = res;
      html += '<div class="craft"><div class="cgrid" style="grid-template-columns:44px">' + slotHtml('wk', 0, ws[0]) + slotHtml('wk', 1, ws[1]) + '</div><div class="arrow"></div>' + slotHtml('grres', 0, res && res.item, ' result') + '</div>';
      return html + '<div class="note">' + (res ? res.xp ? 'エンチャントを外して、経験値 ' + res.xp + ' ほどに戻します' : '2 つを合わせて直します（エンチャントは外れます）' : 'エンチャントの付いた道具か本を 1 つ、または同じ道具を 2 つ入れる') + '</div>';
    }
    if (sc === 'anvil') {
      var a = this.anvilSlots[0], b = this.anvilSlots[1], r = WG.anvilWithName(a, b, this.anvilName);
      this.anvilRes = r;
      var nameVal = this.anvilName != null ? this.anvilName : a ? a.name || WG.itemName(a.key) : '';
      html += '<div class="anvilname"><input class="an-name" maxlength="30" placeholder="名前" value="' + esc(nameVal) + '"' + (a ? '' : ' disabled') + '></div>';
      html += '<div class="craft">' + slotHtml('an', 0, a) + '<span class="plus">＋</span>' + slotHtml('an', 1, b) + '<div class="arrow"></div>' + slotHtml('anres', 0, r && r.item, ' result') + '</div>';
      var wear = this.anvilPos ? keyOf(this.world.block(this.anvilPos[0], this.anvilPos[1], this.anvilPos[2])) : 'ANVIL';
      html += '<div class="note">' + (r ? r.tooExpensive ? '高すぎます（レベル ' + r.cost + '）' : '費用：経験値レベル ' + r.cost + (this.mode === 'survival' && this.xp.level < r.cost ? '（足りません）' : '') : '左に道具、右に同じ道具か本、または修理の材料。上の欄で名前を付けられます') +
        (wear === 'CHIPPED_ANVIL' ? '　この金床は欠けています' : wear === 'DAMAGED_ANVIL' ? '　この金床は壊れかけです' : '') + '</div>';
      return html;
    }
    if (sc === 'loom') {
      var lr = WG.loomResult(ws, this.loomPick), bn = ws[0], dye = ws[1], base = bn && ITEMS[bn.key].banner || 'WHITE', dm = dye && /^(\w+)_DYE$/.exec(dye.key), dc = dm ? dm[1] : base === 'BLACK' ? 'WHITE' : 'BLACK';
      this.loomRes = lr;
      html += '<div class="craft loom">' + '<div class="cgrid" style="grid-template-columns:44px">' + slotHtml('wk', 0, ws[0]) + slotHtml('wk', 1, ws[1]) + '</div><div class="loompats">';
      PATTERNS.forEach(function (p, i) {
        html += '<div class="slot lpat' + (self.loomPick === i ? ' on' : '') + '" data-c="loomopt" data-i="' + i + '" title="' + p[1] + '"><img src="' + bannerURL(base, [{ p: p[0], c: dc }], 2) + '" alt=""></div>';
      });
      html += '</div><div class="arrow"></div><div class="loomprev">' + (lr ? '<img src="' + bannerURL(base, lr.layers, 4) + '" alt="">' : bn ? '<img src="' + bannerURL(base, bn.layers || [], 4) + '" alt="" style="opacity:.55">' : '') + slotHtml('loomres', 0, lr && { key: lr.key, n: 1, layers: lr.layers }, ' result') + '</div></div>';
      return html + '<div class="note">' + (this.loomPick >= 0 ? '模様：' + PATTERNS[this.loomPick][1] + '　' : '') + '左上に旗、左下に染料を入れ、模様を選ぶ（重ねられるのは 6 つまで）</div>';
    }
    return renderExtraScreen.call(this, sc);
  };
  // 金床の名前の欄：打つたびに、結果の枠と説明だけを書き直す（入力中の文字を消さないように）
  var renderInventory = Game.prototype.renderInventory;
  Game.prototype.renderInventory = function () {
    var act = typeof document !== 'undefined' && document.activeElement, had = act && act.classList && act.classList.contains('an-name'), caret = had ? act.selectionStart : 0;
    renderInventory.apply(this, arguments);
    if (this.screen === 'grind' && this.ui.invTitle) this.ui.invTitle.textContent = '砥石';
    if (this.screen !== 'anvil' || typeof document === 'undefined') return;
    var inp = document.querySelector('.an-name'), self = this;
    if (!inp) return;
    var refresh = function () {
      self.anvilName = inp.value;
      var tmp = document.createElement('div'); tmp.innerHTML = self.renderExtraScreen('anvil');
      var oldR = document.querySelector('.slot[data-c="anres"]'), newR = tmp.querySelector('.slot[data-c="anres"]'), notes = document.querySelectorAll('.note'), newN = tmp.querySelector('.note');
      if (oldR && newR) oldR.outerHTML = newR.outerHTML;
      if (notes.length && newN) notes[notes.length - 1].innerHTML = newN.innerHTML;
    };
    inp.addEventListener('input', function (e) { if (!e.isComposing) refresh(); });
    inp.addEventListener('compositionend', refresh);
    inp.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Escape' || e.key === 'Enter') inp.blur(); });
    inp.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    if (had) { inp.focus(); try { inp.setSelectionRange(caret, caret); } catch (e) { /* 何もしない */ } }
  };
  var getExtraSlot = Game.prototype.getExtraSlot;
  Game.prototype.getExtraSlot = function (c, i) { if (c === 'grres') return this.grindRes && this.grindRes.item; return getExtraSlot.call(this, c, i); };
  var clickExtra = Game.prototype.clickExtra;
  Game.prototype.clickExtra = function (c, i) {
    var ws = this.workSlots || (this.workSlots = [null, null]), wp = this.walker.pos;
    if (c === 'grres') {
      var r = this.grindRes;
      if (!r || this.cursor) return true;
      this.cursor = r.item; ws[0] = ws[1] = null; this.grindRes = null;
      if (this.mode === 'survival' && r.xp) this.spawnOrbs(wp[0], wp[1] + 0.5, wp[2], Math.ceil(r.xp * (0.5 + Math.random() * 0.5)));
      if (WG.Sound) WG.Sound.play('place', null, null, null, 'stone');
      return true;
    }
    if (c === 'anres') {
      var ap = this.anvilPos;
      if (ap && ANVILS.indexOf(this.world.block(ap[0], ap[1], ap[2])) < 0) return true;   // 金床がもうない
      var ar = this.anvilRes, before = this.anvilSlots[0];
      var out = clickExtra.call(this, c, i);
      if (ar && ar.item && before && !this.anvilSlots[0]) {
        this.anvilName = null;
        if (WG.Sound) WG.Sound.play('place', null, null, null, 'metal');
        if (ap && this.mode !== 'creative') {
          var was = this.world.block(ap[0], ap[1], ap[2]), nx = WG.anvilWear(this.world, ap[0], ap[1], ap[2], Math.random());
          if (nx !== was) {
            if (this.walker.remesh) this.walker.remesh(ap[0], ap[2]);
            if (nx === B.AIR) {
              if (WG.Sound) WG.Sound.play('break', ap[0] + 0.5, ap[1] + 0.5, ap[2] + 0.5, 'metal');
              if (this.burst) this.burst(ap[0], ap[1], ap[2], was);
              if (this.ui.toast) this.ui.toast('金床が壊れました');
            }
          }
        }
      }
      return out;
    }
    return clickExtra.call(this, c, i);
  };
})(typeof window !== 'undefined' ? window : globalThis);
