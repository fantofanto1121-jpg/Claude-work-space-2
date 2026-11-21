// 建材・飾り・収納（Minecraft の決まりに合わせたもの）。ブロックの形は blocks.js、見た目は tex16.js。
// - コンクリートパウダー：砂のように落ち、水に触れるとコンクリートに固まる。色付きガラス・板ガラス・テラコッタ、茶色の染料（カカオ豆）。
// - 塀・板ガラス・鉄格子は隣とつながる。トラップドア・フェンスゲートは右クリックで開け閉め（鉄のトラップドアは手では開かない）。
// - 看板：置くと文字を書ける（「/」で改行、4 行まで）。右クリックで書き直す。文字は看板の面に重ねて出す。
// - 額縁：右クリックで持っている物を 1 つ飾る。絵画：壁に掛けると、空いている広さに合う絵（このゲームのために描いた 7 枚）を選ぶ。
// - 旗：羊毛 6 個と棒。機織り機で、染料の色の模様（11 種）を 6 つまで重ねられる。立てても、壁に掛けてもよい。
// - 植木鉢：花・キノコ・サボテンを植える。花火：空へ飛んで、色の花火（染料入り）が開く。エリトラで滑空中に使うと加速する。
// - ビーコン：鉄・金・ダイヤモンド・エメラルド・ネザライトのブロックのピラミッド（1〜4 段）の上に置くと光の柱が立ち、
//   近くのプレイヤーに効果（移動速度上昇・跳躍力上昇・攻撃力上昇、4 段なら再生能力も）を与える。効果は支払い（インゴットなど）で選ぶ。
// - 樽：27 枠の入れ物。貝の箱：壊しても中身が入ったままアイテムになる箱。つながったチェスト：どこで開けても同じ中身（プレイヤーごと）。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Mobs = WG.Mobs;
  var C16 = WG.COLORS16, WOODS = WG.WOODS.map(function (w) { return w[0]; });

  function item(key, name, max, extra) {
    var it = { key: key, name: name, block: -1, max: max || 64, shape: 'lump', color: '#888888' };
    for (var k in extra || {}) it[k] = extra[k];
    ITEMS[key] = it;
    return it;
  }
  WOODS.concat(['IRON']).forEach(function (w) { item(w + '_TRAPDOOR', (w === 'IRON' ? '鉄' : WG.WOODS.filter(function (q) { return q[0] === w; })[0][1]) + 'のトラップドア', 64, { trapdoor: w }); });
  WOODS.forEach(function (w) { item(w + '_FENCE_GATE', WG.WOODS.filter(function (q) { return q[0] === w; })[0][1] + 'のフェンスゲート', 64, { gate: w }); });
  item('SIGN', '看板', 16, { sign: true }); item('ITEM_FRAME', '額縁', 64, { frame: true }); item('PAINTING', '絵画', 64, { painting: true });
  C16.forEach(function (c) { item(c[0] + '_BANNER', c[1] + 'の旗', 16, { banner: c[0] }); });
  item('BROWN_DYE', '茶色の染料', 64, { dyeColor: '#72482a' }); item('COCOA_BEANS', 'カカオ豆');
  item('NETHER_STAR', 'ネザースター'); item('SHELL', '貝殻');
  item('FIREWORK_ROCKET', 'ロケット花火', 64, { rocket: true }); item('FIREWORK_ROCKET_COLOR', '色の花火', 64, { rocket: true, burst: true });
  ITEMS.NETHER_STAR.fireproof = true;

  // ---------------- レシピ ----------------
  var S = Craft.SHAPED, L = Craft.SHAPELESS;
  C16.forEach(function (c) {
    var dye = c[0] + '_DYE', wool = c[0] + '_WOOL';
    L.push([[dye, 'SAND', 'SAND', 'SAND', 'SAND', 'GRAVEL', 'GRAVEL', 'GRAVEL', 'GRAVEL'], c[0] + '_CONCRETE_POWDER', 8]);
    S.push([['GGG', 'GDG', 'GGG'], { G: 'GLASS', D: dye }, c[0] + '_STAINED_GLASS', 8], [['TTT', 'TDT', 'TTT'], { T: 'TERRACOTTA', D: dye }, c[0] + '_TERRACOTTA', 8],
      [['GGG', 'GGG'], { G: c[0] + '_STAINED_GLASS' }, c[0] + '_STAINED_GLASS_PANE', 16], [['WWW', 'WWW', ' S '], { W: wool, S: 'STICK' }, c[0] + '_BANNER', 1]);
    L.push([['PAPER', 'GUNPOWDER', dye], 'FIREWORK_ROCKET_COLOR', 3]);
  });
  L.push([['COCOA_BEANS'], 'BROWN_DYE', 1], [['BROWN_DYE', 'WHITE_WOOL'], 'BROWN_WOOL', 1], [['PAPER', 'GUNPOWDER'], 'FIREWORK_ROCKET', 3]);
  S.push([['GGG', 'GGG'], { G: 'GLASS' }, 'GLASS_PANE', 16], [['III', 'III'], { I: 'IRON_INGOT' }, 'IRON_BARS', 16], [['II', 'II'], { I: 'IRON_INGOT' }, 'IRON_TRAPDOOR', 1],
    [['PPP', 'PPP', ' S '], { P: 'PLANKS', S: 'STICK' }, 'SIGN', 3], [['SSS', 'SLS', 'SSS'], { S: 'STICK', L: 'LEATHER' }, 'ITEM_FRAME', 1],
    [['SSS', 'SWS', 'SSS'], { S: 'STICK', W: 'WHITE_WOOL' }, 'PAINTING', 1], [['B B', ' B '], { B: 'BRICK' }, 'FLOWER_POT', 1],
    [['SS', 'PP'], { S: 'STRING', P: 'PLANKS' }, 'LOOM', 1], [['PSP', 'P P', 'PSP'], { P: 'PLANKS', S: 'WOOD_SLABS' }, 'BARREL', 1],
    [['GGG', 'GNG', 'OOO'], { G: 'GLASS', N: 'NETHER_STAR', O: 'OBSIDIAN' }, 'BEACON', 1], [['S', 'C', 'S'], { S: 'SHELL', C: 'CHEST' }, 'SHELL_BOX', 1],
    [['OOO', 'OCO', 'OOO'], { O: 'OBSIDIAN', C: 'CHORUS_FRUIT' }, 'LINKED_CHEST', 1]);
  [['COBBLESTONE', 'COBBLESTONE'], ['MOSSY_COBBLESTONE', 'MOSSY_COBBLESTONE'], ['STONE_BRICK', 'STONE_BRICKS'], ['BRICK', 'BRICKS'], ['SANDSTONE', 'SANDSTONE'], ['NETHER_BRICK', 'NETHER_BRICKS']].forEach(function (m) {
    S.push([['MMM', 'MMM'], { M: m[1] }, m[0] + '_WALL', 6]);
  });
  WOODS.forEach(function (w) { S.push([['PPP', 'PPP'], { P: w + '_PLANKS' }, w + '_TRAPDOOR', 2], [['SPS', 'SPS'], { S: 'STICK', P: w + '_PLANKS' }, w + '_FENCE_GATE', 1]); });
  S.push([['EEE', 'EEE', 'EEE'], { E: 'EMERALD' }, 'EMERALD_BLOCK', 1], [['NNN', 'NNN', 'NNN'], { N: 'NETHERITE_INGOT' }, 'NETHERITE_BLOCK', 1]);
  L.push([['EMERALD_BLOCK'], 'EMERALD', 9], [['NETHERITE_BLOCK'], 'NETHERITE_INGOT', 9]);
  Craft.FUEL.BARREL = 300; Craft.FUEL.LOOM = 300; Craft.FUEL.SIGN = 200;
  WOODS.forEach(function (w) { Craft.FUEL[w + '_TRAPDOOR'] = 300; Craft.FUEL[w + '_FENCE_GATE'] = 300; });

  // ---------------- コンクリートパウダー ----------------
  C16.forEach(function (c) { WG.GRAVITY[B[c[0] + '_CONCRETE_POWDER']] = 1; });
  function powderColor(id) { var m = /^(\w+)_CONCRETE_POWDER$/.exec(WG.BLOCKS[id].key); return m ? m[1] : null; }

  // ---------------- 向きと場所 ----------------
  var OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
  function normalOf(t) { var dx = t.px - t.x, dz = t.pz - t.z; return dx > 0 ? 'E' : dx < 0 ? 'W' : dz > 0 ? 'S' : dz < 0 ? 'N' : null; }
  var NV = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  // 壁に向かって見たときの「右」の向き
  var RIGHT = { N: [-1, 0], S: [1, 0], E: [0, -1], W: [0, 1] };
  function keyOf(x, y, z) { return x + ',' + y + ',' + z; }
  function store(wd, name) { return wd[name] || (wd[name] = new Map()); }
  function remesh(g, x, z) { g.walker.remesh(x, z); }

  // 絵画の一覧 [名前, 幅, 高さ]
  var ARTS = [['SUNSET', 1, 1], ['FLOWER', 1, 1], ['MOUNTAINS', 2, 1], ['LAKE', 2, 1], ['TOWER', 1, 2], ['FOREST', 2, 2], ['STARS', 2, 2]];
  WG.PAINTINGS = ARTS;
  // 旗の模様 [キー, 名前, 布の上の四角（x0, 上からの y0, x1, y1。布は 14×28）]
  var PATTERNS = [['stripe_bottom', '下の帯', [[0, 21, 14, 28]]], ['stripe_top', '上の帯', [[0, 0, 14, 7]]], ['stripe_left', '左の帯', [[0, 0, 4, 28]]],
    ['stripe_right', '右の帯', [[10, 0, 14, 28]]], ['stripe_center', '縦の中帯', [[5, 0, 9, 28]]], ['stripe_middle', '横の中帯', [[0, 12, 14, 16]]],
    ['cross', '十字', [[5, 0, 9, 28], [0, 12, 14, 16]]], ['border', '縁取り', [[0, 0, 14, 2], [0, 26, 14, 28], [0, 2, 2, 26], [12, 2, 14, 26]]],
    ['half_top', '上半分', [[0, 0, 14, 14]]], ['half_left', '左半分', [[0, 0, 7, 28]]], ['square', '中央の四角', [[4, 10, 10, 18]]],
    ['stripes', '細い縦じま', [[1, 0, 3, 28], [6, 0, 8, 28], [11, 0, 13, 28]]]];
  WG.BANNER_PATTERNS = PATTERNS;
  function colorHex(name) { var c = C16.filter(function (q) { return q[0] === name; })[0]; return c ? c[2] : '#e9ecec'; }
  function rgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function dyeName(key) { var m = /^(\w+)_DYE$/.exec(key); return m && C16.some(function (c) { return c[0] === m[1]; }) ? m[1] : null; }

  // ---------------- 置く ----------------
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), it = held && ITEMS[held.key], wd = this.world, surv = this.mode === 'survival', self = this;
    if (!t || !it) return place.apply(this, arguments);
    var x = t.px, y = t.py, z = t.pz, k = keyOf(x, y, z), nrm = normalOf(t), up = t.py > t.y, free = wd.block(x, y, z) === B.AIR || WG.FLUID[wd.block(x, y, z)];
    var used = function () { if (surv) self.inv.take(self.inv.sel, 1); remesh(self, x, z); };
    if (it.trapdoor) {
      if (!free) return;
      var top = t.py < t.y || (!up && nrm && t.hy > 0.5);
      wd.setBlock(x, y, z, B[it.trapdoor + '_TRAPDOOR_' + (top ? 'T' : 'B')]); used(); return;
    }
    if (it.gate) {
      if (!free) return;
      var f = this.facing();
      wd.setBlock(x, y, z, B[it.gate + '_FENCE_GATE_' + (f === 'N' || f === 'S' ? 'X' : 'Z')]); used(); return;
    }
    if (it.sign || it.banner) {
      if (!free || t.py < t.y) return;
      var id = up ? B[(it.sign ? 'SIGN_' : 'BANNER_') + OPP[this.facing()]] : B[(it.sign ? 'WALL_SIGN_' : 'WALL_BANNER_') + nrm];
      wd.setBlock(x, y, z, id); used();
      if (it.banner) store(wd, 'banners').set(k, { color: it.banner, layers: (held.layers || []).slice() });
      else this.ui.prompt && this.ui.prompt('看板に書く文字（「/」で改行）', function (text) { store(wd, 'signs').set(k, String(text || '').split('/').slice(0, 4).map(function (s) { return s.slice(0, 15); }).join('\n')); });
      return;
    }
    if (it.frame) {
      if (!free || !nrm) return;
      wd.setBlock(x, y, z, B['ITEM_FRAME_' + nrm]); used(); return;
    }
    if (it.painting) {
      if (!free || !nrm) return;
      var R = RIGHT[nrm], fits = ARTS.filter(function (a) {
        for (var i = 0; i < a[1]; i++) for (var j = 0; j < a[2]; j++) {
          var cx = x + R[0] * i, cz = z + R[1] * i, cy = y + j;
          if (wd.block(cx, cy, cz) !== B.AIR || WG.COLLIDE[wd.block(cx - NV[nrm][0], cy, cz - NV[nrm][1])] < 1) return false;
        }
        return true;
      });
      if (!fits.length) return;
      var big = Math.max.apply(null, fits.map(function (a) { return a[1] * a[2]; })), pick = fits.filter(function (a) { return a[1] * a[2] === big; });
      var art = pick[Math.floor(Math.random() * pick.length)], cells = [];
      for (var i = 0; i < art[1]; i++) for (var j = 0; j < art[2]; j++) cells.push([x + R[0] * i, y + j, z + R[1] * i, i, art[2] - 1 - j]);
      var keys = cells.map(function (c) { return keyOf(c[0], c[1], c[2]); });
      cells.forEach(function (c, n) {
        wd.setBlock(c[0], c[1], c[2], B['PAINTING_' + nrm]);
        store(wd, 'paintings').set(keys[n], { art: art[0], tile: c[4] * art[1] + c[3], face: nrm, cells: keys });
        remesh(self, c[0], c[2]);
      });
      if (surv) this.inv.take(this.inv.sel, 1);
      return;
    }
    var box = held.key === 'SHELL_BOX' && held.box ? held.box : null;
    var r = place.apply(this, arguments);
    if (box && wd.block(x, y, z) === B.SHELL_BOX) store(wd, 'boxes').set(k, JSON.parse(JSON.stringify(box)));
    return r;
  };

  // ---------------- 右クリック ----------------
  var POTTABLE = { DANDELION: 1, POPPY: 1, RED_MUSHROOM: 1, BROWN_MUSHROOM: 1, CACTUS: 1 };
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), it = held && ITEMS[held.key], wd = this.world, surv = this.mode === 'survival', self = this;
    var shift = w.keys.ShiftLeft || w.keys.ShiftRight, mt = this.mobs.target && this.mobs.target.mob;
    var done = function () { self.mouseR = self.clickR = false; };
    if (this.spectator) return use.apply(this, arguments);
    // 花火：滑空中なら加速、そうでなければ見ている所から打ち上げる
    if (it && it.rocket) {
      if (this.gliding) { this.boost = 30; if (surv) this.inv.take(this.inv.sel, 1); done(); return; }
      if (t) { (this.rockets || (this.rockets = [])).push({ x: t.px + 0.5, y: t.py + 0.2, z: t.pz + 0.5, py: t.py + 0.2, vy: 0.3, life: 0, max: 26 + Math.floor(Math.random() * 10), burst: !!it.burst }); if (surv) this.inv.take(this.inv.sel, 1); if (WG.Sound) WG.Sound.play('ignite', t.px, t.py, t.pz); done(); return; }
    }
    if (!t || mt || (shift && held && it.block >= 0)) return use.apply(this, arguments);
    var id = t.id, bk = WG.BLOCKS[id].key, k = keyOf(t.x, t.y, t.z), m;
    // トラップドア・フェンスゲート
    if ((m = /^(\w+)_TRAPDOOR_(\w+)$/.exec(bk)) && m[1] !== 'IRON') {
      var nxt = /^O/.test(m[2]) ? (wd.trapClosed && wd.trapClosed.get(k)) || 'B' : 'O' + this.facing();
      if (!/^O/.test(m[2])) store(wd, 'trapClosed').set(k, m[2]);
      wd.setBlock(t.x, t.y, t.z, B[m[1] + '_TRAPDOOR_' + nxt]); remesh(this, t.x, t.z); if (WG.Sound) WG.Sound.play('door', t.x + 0.5, t.y + 0.5, t.z + 0.5); done(); return;
    }
    if ((m = /^(\w+)_FENCE_GATE_(X|Z)(O?)$/.exec(bk))) {
      wd.setBlock(t.x, t.y, t.z, B[m[1] + '_FENCE_GATE_' + m[2] + (m[3] ? '' : 'O')]); remesh(this, t.x, t.z); if (WG.Sound) WG.Sound.play('door', t.x + 0.5, t.y + 0.5, t.z + 0.5); done(); return;
    }
    // 看板を書き直す
    if (/^(WALL_)?SIGN_/.test(bk)) {
      done();
      this.ui.prompt && this.ui.prompt('看板に書く文字（「/」で改行）', function (text) { store(wd, 'signs').set(k, String(text || '').split('/').slice(0, 4).map(function (s) { return s.slice(0, 15); }).join('\n')); });
      return;
    }
    // 額縁に飾る
    if (/^ITEM_FRAME_/.test(bk)) {
      var fr = store(wd, 'frames');
      if (!fr.get(k) && held) { var one = Object.assign({}, held, { n: 1 }); fr.set(k, one); if (surv) this.inv.take(this.inv.sel, 1); }
      done(); return;
    }
    // 植木鉢
    if (bk === 'FLOWER_POT' && held && POTTABLE[held.key]) { wd.setBlock(t.x, t.y, t.z, B['POTTED_' + held.key]); if (surv) this.inv.take(this.inv.sel, 1); remesh(this, t.x, t.z); done(); return; }
    if ((m = /^POTTED_(\w+)$/.exec(bk)) && !held) { this.inv.add(m[1], 1); wd.setBlock(t.x, t.y, t.z, B.FLOWER_POT); remesh(this, t.x, t.z); done(); return; }
    // 入れ物・機織り機・ビーコン
    var box = { BARREL: '樽', SHELL_BOX: '貝の箱', LINKED_CHEST: 'つながったチェスト' }[bk];
    if (box) { done(); this.boxKey = bk === 'LINKED_CHEST' ? 'ender' : k; this.boxTitle = box; this.openInventory('box'); if (WG.Sound) WG.Sound.play('door', t.x + 0.5, t.y + 0.5, t.z + 0.5); return; }
    if (bk === 'LOOM') { done(); this.workSlots = [null, null]; this.loomPick = -1; this.openInventory('loom'); return; }
    if (bk === 'BEACON') { done(); this.workSlots = [null, null]; this.beaconKey = k; this.openInventory('beacon'); return; }
    return use.apply(this, arguments);
  };

  // ---------------- 壊す：中身・飾り・絵画・旗 ----------------
  var breakBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function (x, y, z, harvest) {
    var wd = this.world, id = wd.block(x, y, z), bk = WG.BLOCKS[id].key, k = keyOf(x, y, z), self = this, surv = this.mode === 'survival';
    var drop = function (key, n, extra) { self.spawnItem(key, n, x + 0.5, y + 0.4, z + 0.5, 0.1, 10, extra && extra.dmg, extra && extra.ench, extra && WG.itemExtra(extra)); };
    var boxes = wd.boxes, frames = wd.frames, paints = wd.paintings, banners = wd.banners;
    var r = breakBlock.call(this, x, y, z, harvest);
    if (wd.block(x, y, z) === id) return r;   // 壊れなかった（アドベンチャーなど）
    if (bk === 'BARREL' && boxes && boxes.get(k)) { boxes.get(k).forEach(function (s) { if (s) drop(s.key, s.n, s); }); boxes.delete(k); }
    if (bk === 'SHELL_BOX') { var c = boxes && boxes.get(k), full = c && c.some(Boolean); drop('SHELL_BOX', 1, full ? { box: c } : null); if (boxes) boxes.delete(k); }
    if (/^ITEM_FRAME_/.test(bk) && frames && frames.get(k)) { var fi = frames.get(k); drop(fi.key, 1, fi); frames.delete(k); }
    if (/^(WALL_)?SIGN_/.test(bk) && wd.signs) wd.signs.delete(k);
    if (/^(WALL_)?BANNER_/.test(bk) && banners && banners.get(k)) { var bn = banners.get(k); drop(bn.color + '_BANNER', 1, bn.layers.length ? { layers: bn.layers } : null); banners.delete(k); }
    if (/^POTTED_/.test(bk)) drop(bk.replace('POTTED_', ''), 1);
    if (/^PAINTING_/.test(bk) && paints && paints.get(k)) {
      var pt = paints.get(k);
      pt.cells.forEach(function (ck) { var p = ck.split(',').map(Number); if (/^PAINTING_/.test(WG.BLOCKS[wd.block(p[0], p[1], p[2])].key)) wd.setBlock(p[0], p[1], p[2], B.AIR); paints.delete(ck); remesh(self, p[0], p[2]); });
      if (surv) drop('PAINTING', 1);
    }
    if (bk === 'BEACON' && wd.beacons) wd.beacons.delete(k);
    void surv;
    return r;
  };

  // ---------------- 画面：入れ物・機織り機・ビーコン ----------------
  WG.EXTRA_SCREENS.box = 1; WG.EXTRA_SCREENS.loom = 1; WG.EXTRA_SCREENS.beacon = 1;
  Game.prototype.boxSlots = function () {
    if (this.boxKey === 'ender') { var p = this.player; return p.ender || (p.ender = new Array(27).fill(null)); }
    var b = store(this.world, 'boxes');
    if (!b.get(this.boxKey)) b.set(this.boxKey, new Array(27).fill(null));
    return b.get(this.boxKey);
  };
  function slotHtml(c, i, s, extra) { return WG.slotHTMLFull(c, i, s, extra); }
  function loomResult(ws, pick) {
    var bn = ws[0], dye = ws[1], col = dye && dyeName(dye.key);
    if (!bn || !ITEMS[bn.key].banner || !col || pick < 0 || (bn.layers || []).length >= 6) return null;
    return { key: bn.key, n: 1, layers: (bn.layers || []).concat([{ p: PATTERNS[pick][0], c: col }]) };
  }
  WG.loomResult = loomResult;
  // ビーコンのピラミッドの段（0〜4）
  var BASE = {}; ['IRON_BLOCK', 'GOLD_BLOCK', 'DIAMOND_BLOCK', 'EMERALD_BLOCK', 'NETHERITE_BLOCK'].forEach(function (k) { if (B[k] != null) BASE[B[k]] = 1; });
  function beaconLevel(wd, x, y, z) {
    var lv = 0;
    for (var i = 1; i <= 4; i++) {
      for (var dx = -i; dx <= i; dx++) for (var dz = -i; dz <= i; dz++) if (!BASE[wd.block(x + dx, y - i, z + dz)]) return lv;
      lv = i;
    }
    return lv;
  }
  WG.beaconLevel = beaconLevel;
  var BEACON_EFFECTS = [['SPEED', 1], ['JUMP_BOOST', 2], ['STRENGTH', 3], ['REGENERATION', 4]];
  var PAY = { IRON_INGOT: 1, GOLD_INGOT: 1, DIAMOND: 1, EMERALD: 1, NETHERITE_INGOT: 1 };
  var renderExtraScreen = Game.prototype.renderExtraScreen;
  Game.prototype.renderExtraScreen = function (sc) {
    var ws = this.workSlots || (this.workSlots = [null, null]), html = '', self = this;
    if (sc === 'box') {
      var cs = this.boxSlots();
      html += '<div class="craft"><div class="cgrid" style="grid-template-columns:repeat(9,44px)">';
      for (var i = 0; i < cs.length; i++) html += slotHtml('bx', i, cs[i]);
      return html + '</div></div>';
    }
    if (sc === 'loom') {
      var res = loomResult(ws, this.loomPick);
      this.loomRes = res;
      html += '<div class="craft">' + slotHtml('wk', 0, ws[0]) + slotHtml('wk', 1, ws[1]) + '<div class="trades" style="min-width:200px;max-height:180px">';
      PATTERNS.forEach(function (p, i) { html += '<div class="trade' + (self.loomPick === i ? '' : ' off') + '" style="opacity:1" data-c="loomopt" data-i="' + i + '"><span class="tname">' + p[1] + '</span></div>'; });
      html += '</div><div class="arrow"></div>' + slotHtml('loomres', 0, res && { key: res.key, n: 1 }, ' result') + '</div>';
      return html + '<div class="note">左に旗、右に染料を入れ、模様を選ぶ（重ねられるのは 6 つまで）</div>';
    }
    if (sc === 'beacon') {
      var p = this.beaconKey.split(',').map(Number), lv = beaconLevel(this.world, p[0], p[1], p[2]), st = store(this.world, 'beacons').get(this.beaconKey) || {};
      html += '<div class="craft">' + slotHtml('wk', 0, ws[0]) + '<div class="trades" style="min-width:260px">';
      BEACON_EFFECTS.forEach(function (e, i) {
        var ok = lv >= e[1], on = st.eff === e[0] || (e[0] === 'REGENERATION' && st.eff2);
        html += '<div class="trade' + (ok ? '' : ' off') + '" data-c="beaconopt" data-i="' + i + '"><span class="tname">' + (on ? '● ' : '') + WG.EFFECTS[e[0]][0] + '（' + e[1] + ' 段から）</span></div>';
      });
      return html + '</div></div><div class="note">ピラミッド ' + lv + ' 段。左の枠に鉄・金インゴット、ダイヤモンド、エメラルド、ネザライトインゴットを 1 つ入れて、効果を選ぶ</div>';
    }
    return renderExtraScreen.call(this, sc);
  };
  var getExtraSlot = Game.prototype.getExtraSlot;
  Game.prototype.getExtraSlot = function (c, i) { if (c === 'bx') return this.boxSlots()[i]; return getExtraSlot.call(this, c, i); };
  var setExtraSlot = Game.prototype.setExtraSlot;
  Game.prototype.setExtraSlot = function (c, i, v) {
    if (c === 'bx') { if (v && this.boxKey !== 'ender' && v.key === 'SHELL_BOX' && WG.BLOCKS[this.world.block.apply(this.world, this.boxKey.split(',').map(Number))].key === 'SHELL_BOX') return false; this.boxSlots()[i] = v; return true; }
    return setExtraSlot.call(this, c, i, v);
  };
  var clickExtra = Game.prototype.clickExtra;
  Game.prototype.clickExtra = function (c, i) {
    var ws = this.workSlots || (this.workSlots = [null, null]);
    if (c === 'loomopt') { this.loomPick = i; return true; }
    if (c === 'loomres') {
      var r = this.loomRes;
      if (!r || this.cursor) return true;
      this.cursor = r; ws[0] = null; if (ws[1] && --ws[1].n <= 0) ws[1] = null; this.loomPick = -1;
      return true;
    }
    if (c === 'beaconopt') {
      var p = this.beaconKey.split(',').map(Number), lv = beaconLevel(this.world, p[0], p[1], p[2]), e = BEACON_EFFECTS[i];
      if (!e || lv < e[1] || !ws[0] || !PAY[ws[0].key]) return true;
      var st = store(this.world, 'beacons').get(this.beaconKey) || {};
      if (e[0] === 'REGENERATION') st.eff2 = true; else st.eff = e[0];
      store(this.world, 'beacons').set(this.beaconKey, st);
      if (--ws[0].n <= 0) ws[0] = null;
      if (WG.Sound) WG.Sound.play('levelup');
      return true;
    }
    return clickExtra.call(this, c, i);
  };

  // ---------------- 刻み：パウダーが固まる・ビーコンの効果・花火 ----------------
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    tickExtra.call(this);
    var wd = this.world, w = this.walker, self = this, p = w.pos;
    if (this.tickCount % 10 === 0) {
      var px = Math.floor(p[0]), py = Math.floor(p[1]), pz = Math.floor(p[2]);
      for (var x = px - 6; x <= px + 6; x++) for (var y = py - 4; y <= py + 4; y++) for (var z = pz - 6; z <= pz + 6; z++) {
        var col = powderColor(wd.block(x, y, z));
        if (!col) continue;
        if ([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(function (d) { return WG.isWater(wd.block(x + d[0], y + d[1], z + d[2])); })) {
          wd.setBlock(x, y, z, B[col + '_CONCRETE']); remesh(this, x, z);
        }
      }
    }
    if (this.tickCount % 80 === 0 && wd.beacons) wd.beacons.forEach(function (st, key) {
      var q = key.split(',').map(Number);
      if (wd.block(q[0], q[1], q[2]) !== B.BEACON) { wd.beacons.delete(key); return; }
      var lv = beaconLevel(wd, q[0], q[1], q[2]), range = 10 + lv * 10;
      st.level = lv;
      if (!lv || Math.abs(p[0] - q[0]) > range || Math.abs(p[2] - q[2]) > range) return;
      if (st.eff) self.addEffect(st.eff, 260, 0);
      if (st.eff2 && lv >= 4) self.addEffect('REGENERATION', 260, 0);
    });
    var rk = this.rockets || [], keep = [];
    rk.forEach(function (r) {
      r.py = r.y; r.life++; r.vy = Math.min(0.75, r.vy + 0.04); r.y += r.vy;
      if (r.life % 2 === 0) self.particles.push({ x: r.x + (Math.random() - 0.5) * 0.1, y: r.y - 0.3, z: r.z + (Math.random() - 0.5) * 0.1, vx: 0, vy: -0.05, vz: 0, life: 12, c: [255, 220, 150], glow: true, fw: true });
      if (r.life < r.max && !WG.COLLIDE[wd.block(Math.floor(r.x), Math.floor(r.y + 0.5), Math.floor(r.z))]) { keep.push(r); return; }
      if (WG.Sound) WG.Sound.play('firework', r.x, r.y, r.z);
      if (!r.burst) return;
      var pal = [[255, 80, 80], [255, 200, 60], [90, 200, 255], [140, 255, 120], [230, 120, 255], [255, 255, 255]], c1 = pal[Math.floor(Math.random() * pal.length)], c2 = pal[Math.floor(Math.random() * pal.length)];
      for (var n = 0; n < 90; n++) {
        var th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), sp = 0.32 + Math.random() * 0.06;
        self.particles.push({ x: r.x, y: r.y, z: r.z, vx: Math.sin(ph) * Math.cos(th) * sp, vy: Math.cos(ph) * sp, vz: Math.sin(ph) * Math.sin(th) * sp, life: 30 + Math.floor(Math.random() * 16), c: n % 3 ? c1 : c2, glow: true, fw: true });
      }
    });
    this.rockets = keep;
  };

  // ---------------- 描く：絵画・額縁の中身・旗・ビーコンの光・花火 ----------------
  var WHITE = [255, 255, 255];
  var drawExtra = Game.prototype.drawExtra;
  Game.prototype.drawExtra = function (solid, a, cube) {
    drawExtra.call(this, solid, a, cube);
    var wd = this.world, w = this.walker, p = w.pos, near = function (k) { var q = k.split(',').map(Number); return Math.abs(q[0] - p[0]) < 64 && Math.abs(q[2] - p[2]) < 64 ? q : null; };
    if (wd.paintings) wd.paintings.forEach(function (pt, k) {
      var q = near(k); if (!q) return;
      var n = NV[pt.face], R = RIGHT[pt.face], tile = WG.extraTile('PAINT_' + pt.art + '_' + pt.tile);
      var cx = q[0] + 0.5 - n[0] * (0.5 - 0.07), cz = q[2] + 0.5 - n[1] * (0.5 - 0.07);
      var P = [[cx - R[0] * 0.5, q[1] + 1, cz - R[1] * 0.5], [cx + R[0] * 0.5, q[1] + 1, cz + R[1] * 0.5], [cx + R[0] * 0.5, q[1], cz + R[1] * 0.5], [cx - R[0] * 0.5, q[1], cz - R[1] * 0.5]];
      WG.quad3d(solid, P, tile, [235, 235, 235], w.lightLevels(cx + n[0] * 0.5, q[1] + 0.5, cz + n[1] * 0.5));
    });
    if (wd.frames) wd.frames.forEach(function (s, k) {
      var q = near(k); if (!q) return;
      var f = WG.BLOCKS[wd.block(q[0], q[1], q[2])].key.slice(-1), n = NV[f], R = RIGHT[f], it = ITEMS[s.key];
      if (!n) return;
      var cx = q[0] + 0.5 - n[0] * (0.5 - 0.075), cz = q[2] + 0.5 - n[1] * (0.5 - 0.075), lt = w.lightLevels(cx + n[0] * 0.5, q[1] + 0.5, cz + n[1] * 0.5);
      var tile = WG.itemIcon16(s.key) || (it && it.block < 0) ? WG.itemTile(s.key) : null;
      if (tile != null) {
        var h = 0.32;
        WG.quad3d(solid, [[cx - R[0] * h, q[1] + 0.5 + h, cz - R[1] * h], [cx + R[0] * h, q[1] + 0.5 + h, cz + R[1] * h], [cx + R[0] * h, q[1] + 0.5 - h, cz + R[1] * h], [cx - R[0] * h, q[1] + 0.5 - h, cz - R[1] * h]], tile, WHITE, lt);
      } else if (it && it.block >= 0) {
        cube(solid, cx + n[0] * 0.15, q[1] + 0.32, cz + n[1] * 0.15, 0.36, 0, function (fc) { return WG.atlasTile(it.block, fc); }, function () { return WHITE; }, lt);
      }
    });
    if (wd.banners) wd.banners.forEach(function (bn, k) {
      var q = near(k); if (!q) return;
      var bk = WG.BLOCKS[wd.block(q[0], q[1], q[2])].key, wall = /^WALL_/.test(bk), f = bk.slice(-1), th = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 }[f];
      if (th == null) return;
      var cs = Math.cos(th), sn = Math.sin(th), lt = w.lightLevels(q[0] + 0.5, q[1] + 0.5, q[2] + 0.5);
      var tf = function (x, y, z) { var lx = (x - 8) / 16, lz = (z - 8) / 16; return [q[0] + 0.5 + lx * cs + lz * sn, q[1] + y / 16, q[2] + 0.5 - lx * sn + lz * cs]; };
      var base = rgb(colorHex(bn.color)), top = wall ? 15 : 40, z0 = wall ? 0.6 : 7.6;
      var sway = Math.sin(((wd.time || 0) + a) * 0.05 + q[0]) * 0.4;
      if (!wall) { WG.modelBox(solid, [7, 0, 7], [2, 42, 2], tf, [120, 90, 56], lt); }
      WG.modelBox(solid, [1, top - 1, z0 - 0.4], [14, 1.6, 1.6], tf, [120, 90, 56], lt);
      WG.modelBox(solid, [1, top - 29, z0 + sway * 0.2], [14, 28, 0.8], tf, base, lt);
      (bn.layers || []).forEach(function (ly, i) {
        var pat = PATTERNS.filter(function (pp) { return pp[0] === ly.p; })[0], c = rgb(colorHex(ly.c));
        if (!pat) return;
        pat[2].forEach(function (rc) { WG.modelBox(solid, [1 + rc[0], top - 1 - rc[3], z0 + 0.8 + sway * 0.2 + 0.04 * (i + 1)], [rc[2] - rc[0], rc[3] - rc[1], 0.04], tf, c, lt); });
      });
    });
    if (wd.beacons) wd.beacons.forEach(function (st, k) {
      var q = near(k); if (!q || !st.level || !st.eff) return;
      var above = WG.BLOCKS[wd.block(q[0], q[1] + 1, q[2])].key, m = /^(\w+)_STAINED_GLASS$/.exec(above), col = m ? rgb(colorHex(m[1])) : [214, 246, 255];
      // 光の柱：細い芯と、少し太い淡い外側
      var id3 = function (x, y, z) { return [x, y, z]; };
      WG.modelBox(solid, [q[0] + 0.38, q[1] + 1, q[2] + 0.38], [0.24, 96, 0.24], id3, col, [15, 15]);
      WG.modelBox(solid, [q[0] + 0.3, q[1] + 1, q[2] + 0.3], [0.4, 96, 0.4], id3, [col[0] * 0.55, col[1] * 0.6, col[2] * 0.62], [15, 15]);
    });
    (this.rockets || []).forEach(function (r) {
      var y = r.py + (r.y - r.py) * a;
      cube(solid, r.x, y, r.z, 0.14, 0, function () { return 0; }, function (fc) { return fc === 'top' ? [220, 60, 50] : [230, 210, 170]; }, [15, 15]);
    });
  };

  // 看板の文字（画面に重ねる。看板の面がこちらを向いていて、12 ブロック以内のときだけ）
  var signEls = [];
  Game.prototype.drawSigns = function (a) {
    var view = this.view, box = this.ui.labels, wd = this.world, w = this.walker, n = 0;
    if (!box || !view.vp || !view.canvas || !wd.signs) { signEls.forEach(function (el) { el.style.display = 'none'; }); return; }
    var vp = view.vp, W = view.canvas.clientWidth, H = view.canvas.clientHeight, e = w.eye || w.pos;
    wd.signs.forEach(function (text, k) {
      var q = k.split(',').map(Number), bk = WG.BLOCKS[wd.block(q[0], q[1], q[2])].key, f = bk.slice(-1), nv = NV[f];
      if (!nv || !text) return;
      var wall = /^WALL_/.test(bk), x = q[0] + 0.5 + nv[0] * (wall ? -0.4 : 0.06), y = q[1] + (wall ? 0.5 : 0.75), z = q[2] + 0.5 + nv[1] * (wall ? -0.4 : 0.06);
      var dx = x - e[0], dy = y - e[1], dz = z - e[2], d = Math.hypot(dx, dy, dz);
      if (d > 12 || dx * nv[0] + dz * nv[1] >= 0) return;
      var cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
      if (cw <= 0.1) return;
      var sx = (vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw, sy = (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / cw;
      if (Math.abs(sx) > 1.1 || Math.abs(sy) > 1.1) return;
      var el = signEls[n] || (signEls[n] = box.appendChild(document.createElement('div')));
      el.className = 'signtext'; el.textContent = text; el.style.display = '';
      el.style.fontSize = Math.max(7, Math.min(44, H * 0.11 / d)) + 'px';
      el.style.transform = 'translate(' + Math.round((sx * 0.5 + 0.5) * W) + 'px,' + Math.round((0.5 - sy * 0.5) * H) + 'px) translate(-50%,-50%)';
      n++;
    });
    for (var i = n; i < signEls.length; i++) signEls[i].style.display = 'none';
  };
  var draw = Game.prototype.draw;
  Game.prototype.draw = function (a) { draw.call(this, a); if (typeof document !== 'undefined') this.drawSigns(a); };
  void Mobs;
})(typeof window !== 'undefined' ? window : globalThis);
