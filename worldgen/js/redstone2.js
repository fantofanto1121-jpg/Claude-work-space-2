// レッドストーンの見直し（追加の部品と、遊ぶときの動き）。
// ・トリップワイヤー（フック 2 つの間に糸を張り、何かが触れるとフックがオン）
// ・ターゲット（矢が当たると、真ん中に近いほど強い動力を 1 秒）
// ・重さを量る感圧板（軽量用は乗っている数、重量用は 10 ごとに 1）
// ・トラップチェスト（開けている間、動力 1。下のブロックは強く動く）
// ・スカルクセンサー（8 ブロック以内の振動：歩く・置く・壊す。近いほど強い）
// ・クラフター（9 枠に並べた材料を、動力を受けるたびに 1 回クラフトして前へ出す）
// ・スライムブロック（落ちるとはねる）・ハチミツブロック（遅くなる、壁をゆっくり滑る）
// ・ピストンで動いているブロックの絵、狙っている部品の強さの表示
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Mobs = WG.Mobs, Walker = WG.Walker;
  function keyOf(id) { return WG.BLOCKS[id] ? WG.BLOCKS[id].key : ''; }
  function kind(id) { return WG.blockKind(id); }
  function dirName(x, z) { return x > 0 ? 'E' : x < 0 ? 'W' : z > 0 ? 'S' : 'N'; }
  var DV = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

  // ---------------- アイテムとレシピ ----------------
  ITEMS.TRIPWIRE_HOOK = { key: 'TRIPWIRE_HOOK', name: 'トリップワイヤーフック', block: -1, max: 64, icon: B.TRIPWIRE_HOOK_N };
  ITEMS.CRAFTER = { key: 'CRAFTER', name: 'クラフター', block: -1, max: 64, oriented: 'CRAFTER', icon: B.CRAFTER_S };
  ITEMS.DETECTOR_RAIL = { key: 'DETECTOR_RAIL', name: 'ディテクターレール', block: -1, max: 64, rail: 'DETECTOR_RAIL' };
  ITEMS.ACTIVATOR_RAIL = { key: 'ACTIVATOR_RAIL', name: 'アクティベーターレール', block: -1, max: 64, rail: 'ACTIVATOR_RAIL' };
  Craft.SHAPED.push(
    [['I', 'S', 'P'], { I: 'IRON_INGOT', S: 'STICK', P: 'PLANKS' }, 'TRIPWIRE_HOOK', 2],
    [['GG'], { G: 'GOLD_INGOT' }, 'LIGHT_WEIGHTED_PRESSURE_PLATE', 1], [['II'], { I: 'IRON_INGOT' }, 'HEAVY_WEIGHTED_PRESSURE_PLATE', 1],
    [[' R ', 'RHR', ' R '], { R: 'REDSTONE', H: 'HAY_BLOCK' }, 'TARGET', 1],
    [['I I', 'IPI', 'IRI'], { I: 'IRON_INGOT', P: 'STONE_PRESSURE_PLATE', R: 'REDSTONE' }, 'DETECTOR_RAIL', 6],
    [['ISI', 'ITI', 'ISI'], { I: 'IRON_INGOT', S: 'STICK', T: 'REDSTONE_TORCH' }, 'ACTIVATOR_RAIL', 6],
    [['III', 'ICI', 'RDR'], { I: 'IRON_INGOT', C: 'CRAFTING_TABLE', R: 'REDSTONE', D: 'DROPPER' }, 'CRAFTER', 1],
    [[' C ', 'CBC', ' R '], { C: 'COPPER_BLOCK', B: 'BLAZE_ROD', R: 'REDSTONE' }, 'COPPER_BULB', 4],
    [['SSS', 'SSS', 'SSS'], { S: 'SLIME_BALL' }, 'SLIME_BLOCK', 1], [['HH', 'HH'], { H: 'HONEY_BOTTLE' }, 'HONEY_BLOCK', 1],
    [['WWW', 'WWW', 'WWW'], { W: 'WHEAT' }, 'HAY_BLOCK', 1]);
  Craft.SHAPELESS.push([['CHEST', 'TRIPWIRE_HOOK'], 'TRAPPED_CHEST', 1], [['SLIME_BLOCK'], 'SLIME_BALL', 9], [['HAY_BLOCK'], 'WHEAT', 9]);
  Craft.FUEL.HAY_BLOCK = 0;

  // ---------------- 置く：フック（壁の横）・糸（上の面） ----------------
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var t = this.walker.target, held = this.inv.held(), wd = this.world, surv = this.mode === 'survival';
    if (t && held && held.key === 'TRIPWIRE_HOOK') {
      var dx = t.px - t.x, dz = t.pz - t.z;
      if (t.py !== t.y || !(dx || dz) || !WG.OPAQUE[t.id] || wd.block(t.px, t.py, t.pz) !== B.AIR) return;
      wd.setBlock(t.px, t.py, t.pz, B['TRIPWIRE_HOOK_' + dirName(dx, dz)]); this.walker.remesh(t.px, t.pz);
      if (surv) this.inv.take(this.inv.sel, 1);
      return;
    }
    if (t && held && held.key === 'STRING' && wd.block(t.px, t.py, t.pz) === B.AIR && !this.mobs.target) {
      wd.setBlock(t.px, t.py, t.pz, B.TRIPWIRE); this.walker.remesh(t.px, t.pz);
      if (surv) this.inv.take(this.inv.sel, 1);
      return;
    }
    return place.apply(this, arguments);
  };

  // ---------------- 毎刻：トリップワイヤー・感圧板の重さ・ターゲット・スカルクセンサー ----------------
  function track(wd, name) { return wd[name] || (wd[name] = new Map()); }
  function boxHits(b, x, y, z, h) { return b[0] < x + 1 && b[3] > x && b[1] < y + h && b[4] > y && b[2] < z + 1 && b[5] > z; }
  // 体の箱の一覧（プレイヤー・生き物・アイテム）
  function bodies(g, withItems) {
    var out = [];
    if (!g.dead && !g.spectator) out.push(g.walker.box());
    g.mobs.list.forEach(function (m) { if (!m.dead) out.push([m.x - 0.3, m.y, m.z - 0.3, m.x + 0.3, m.y + 1, m.z + 0.3]); });
    if (withItems) g.entities.forEach(function (e) { out.push([e.x - 0.125, e.y, e.z - 0.125, e.x + 0.125, e.y + 0.25, e.z + 0.125]); });
    return out;
  }
  WG.rsBodies = bodies;
  // 体が触れている糸から、糸の両端のフックを探す。今オンのフックも調べ直す
  function cellsUnder(bs, fn) {
    bs.forEach(function (b) {
      for (var x = Math.floor(b[0]); x <= Math.floor(b[3] - 1e-6); x++) for (var z = Math.floor(b[2]); z <= Math.floor(b[5] - 1e-6); z++)
        for (var y = Math.floor(b[1]); y <= Math.floor(b[1] + 0.3); y++) fn(x, y, z);
    });
  }
  Game.prototype.tickTripwires = function () {
    var wd = this.world, rs = this.rs, bs = bodies(this, true), cand = new Map(), on = track(wd, 'tripOn');
    on.forEach(function (v, key) { var c = key.split(',').map(Number); cand.set(key, c); });
    cellsUnder(bs, function (x, y, z) {
      var id = wd.block(x, y, z);
      if (id !== B.TRIPWIRE && id !== B.TRIPWIRE_ON) return;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        for (var i = 1; i <= 41; i++) {
          var hx = x + d[0] * i, hz = z + d[1] * i, hid = wd.block(hx, y, hz);
          if (hid === B.TRIPWIRE || hid === B.TRIPWIRE_ON) continue;
          if (kind(hid) === 'hook') cand.set(hx + ',' + y + ',' + hz, [hx, y, hz]);
          break;
        }
      });
    });
    cand.forEach(function (h, hkey) {
      var hid = wd.block(h[0], h[1], h[2]), m = /HOOK_([NESW])(_ON)?$/.exec(keyOf(hid));
      if (!m) { on.delete(hkey); return; }
      var d = DV[m[1]], cells = [], ok = false, hit = false;
      for (var i = 1; i <= 41; i++) {
        var x = h[0] + d[0] * i, z = h[2] + d[1] * i, id = wd.block(x, h[1], z), om;
        if (id === B.TRIPWIRE || id === B.TRIPWIRE_ON) { cells.push([x, h[1], z]); if (bs.some(function (b) { return boxHits(b, x, h[1], z, 0.3); })) hit = true; continue; }
        om = /HOOK_([NESW])/.exec(keyOf(id));
        if (om && DV[om[1]][0] === -d[0] && DV[om[1]][1] === -d[1] && cells.length) ok = true;
        break;
      }
      var want = ok && hit, isOn = !!m[2];
      if (want) on.set(hkey, 1); else on.delete(hkey);
      if (want === isOn) return;
      rs.set(h[0], h[1], h[2], B['TRIPWIRE_HOOK_' + m[1] + (want ? '_ON' : '')]);
      var sp = WG.SUPPORT[hid]; rs.dirty.push([h[0] + sp[0], h[1], h[2] + sp[2]]);
      cells.forEach(function (c) { rs.set(c[0], c[1], c[2], want ? B.TRIPWIRE_ON : B.TRIPWIRE); });
      if (WG.Sound) WG.Sound.play('click', h[0] + 0.5, h[1] + 0.5, h[2] + 0.5);
    });
  };
  // 感圧板：重さを量る板は、乗っている数で強さが変わる（体の下の板と、今オンの板だけ調べる）
  var tickPlates = WG.Redstone.prototype.tickPlates;
  WG.Redstone.prototype.tickPlates = function () {
    tickPlates.apply(this, arguments);
    var g = this.g, wd = this.w, self = this, lv = track(wd, 'plateLevel'), bs = bodies(g, true), cand = new Map();
    lv.forEach(function (v, key) { cand.set(key, key.split(',').map(Number)); });
    cellsUnder(bs, function (x, y, z) { if (/WEIGHTED_PRESSURE_PLATE/.test(keyOf(wd.block(x, y, z)))) cand.set(x + ',' + y + ',' + z, [x, y, z]); });
    cand.forEach(function (c, key) {
      var k = keyOf(wd.block(c[0], c[1], c[2]));
      if (!/WEIGHTED_PRESSURE_PLATE/.test(k)) { lv.delete(key); return; }
      var n = bs.filter(function (b) { return boxHits(b, c[0], c[1], c[2], 0.3); }).length, heavy = /^HEAVY/.test(k);
      var level = n ? Math.min(15, heavy ? Math.ceil(n / 10) : n) : 0, base = k.replace(/_ON$/, '');
      if ((lv.get(key) || 0) === level) { if (!level) lv.delete(key); return; }
      if (level) lv.set(key, level); else lv.delete(key);
      self.set(c[0], c[1], c[2], B[base + (level ? '_ON' : '')]); self.dirty.push([c[0], c[1] - 1, c[2]]);
    });
  };
  // ターゲット：矢が刺さったら、当たった所が真ん中に近いほど強い動力（1 秒）
  var tickArrows = Mobs.prototype.tickArrows;
  Mobs.prototype.tickArrows = function () {
    var before = this.arrows.filter(function (a) { return !a.stuck; });
    tickArrows.apply(this, arguments);
    var g = this.game, wd = this.world;
    before.forEach(function (a) {
      if (!a.stuck) return;
      var bx = Math.floor(a.x), by = Math.floor(a.y), bz = Math.floor(a.z);
      if (wd.block(bx, by, bz) !== B.TARGET) return;
      // 当たった面：入ってきた向きで決め、その面の上での真ん中からのずれで強さを出す
      var fx = a.x - bx - 0.5, fy = a.y - by - 0.5, fz = a.z - bz - 0.5, ax = Math.abs(a.vx), ay = Math.abs(a.vy), az = Math.abs(a.vz), off;
      if (ax >= ay && ax >= az) off = Math.max(Math.abs(fy), Math.abs(fz)); else if (ay >= az) off = Math.max(Math.abs(fx), Math.abs(fz)); else off = Math.max(Math.abs(fx), Math.abs(fy));
      var pw = Math.max(1, Math.min(15, Math.ceil(15 * (1 - off * 2))));
      track(wd, 'targetPow').set(bx + ',' + by + ',' + bz, pw);
      (wd.targetTime || (wd.targetTime = new Map())).set(bx + ',' + by + ',' + bz, 20);
      if (g.rs) g.rs.dirty.push([bx, by, bz]);
      if (g.ui && g.ui.toast && a.player) g.ui.toast('ターゲットに当たった（強さ ' + pw + '）');
    });
  };
  // スカルクセンサー：振動（歩く・置く・壊す）を 8 ブロック以内で感じる
  Game.prototype.vibrate = function (x, y, z) {
    var wd = this.world, rs = this.rs, pw = track(wd, 'sculkPow'), tm = track(wd, 'sculkTime');
    for (var sx = Math.floor(x) - 8; sx <= Math.floor(x) + 8; sx++) for (var sy = Math.floor(y) - 8; sy <= Math.floor(y) + 8; sy++) for (var sz = Math.floor(z) - 8; sz <= Math.floor(z) + 8; sz++) {
      var id = wd.peekBlock ? wd.peekBlock(sx, sy, sz) : wd.block(sx, sy, sz);
      if (id !== B.SCULK_SENSOR) continue;
      var key = sx + ',' + sy + ',' + sz, d = Math.hypot(sx + 0.5 - x, sy + 0.5 - y, sz + 0.5 - z);
      if (d > 8 || tm.get(key)) continue;   // 動いている間と休みの間は感じない
      pw.set(key, Math.max(1, 15 - Math.floor(d * 14 / 8))); tm.set(key, 30);
      rs.set(sx, sy, sz, B.SCULK_SENSOR_ON); rs.dirty.push([sx, sy - 1, sz]);
      if (this.puff) this.puff(sx + 0.5, sy + 1, sz + 0.5, [80, 220, 230], 4, 0.05);
    }
  };
  function tickTimers(g) {
    var wd = g.world, rs = g.rs;
    if (wd.targetTime) wd.targetTime.forEach(function (t, key) {
      if (--t > 0) { wd.targetTime.set(key, t); return; }
      wd.targetTime.delete(key); wd.targetPow.delete(key); var c = key.split(',').map(Number); rs.dirty.push(c);
    });
    if (wd.sculkTime) wd.sculkTime.forEach(function (t, key) {
      var c = key.split(',').map(Number);
      if (t > 0) { if (--t === 0) { wd.sculkPow.delete(key); if (wd.block(c[0], c[1], c[2]) === B.SCULK_SENSOR_ON) { rs.set(c[0], c[1], c[2], B.SCULK_SENSOR); rs.dirty.push([c[0], c[1] - 1, c[2]]); } t = -10; } wd.sculkTime.set(key, t); return; }
      if (++t >= 0) wd.sculkTime.delete(key); else wd.sculkTime.set(key, t);   // 休み（10 刻み）
    });
    if (wd.detect) wd.detect.forEach(function (t, key) {
      if (--t > 0) { wd.detect.set(key, t); return; }
      wd.detect.delete(key); var c = key.split(',').map(Number); rs.dirty.push(c); rs.dirty.push([c[0], c[1] - 1, c[2]]);
    });
  }
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    tickExtra.apply(this, arguments);
    if (!this.rs) return;
    var w = this.walker;
    if (this.tickCount % 2 === 0) this.tickTripwires();
    tickTimers(this);
    // 歩く振動（しゃがむと出ない）
    var moved = Math.hypot(w.pos[0] - w.prev[0], w.pos[2] - w.prev[2]);
    if (w.onGround && !w.sneak && moved > 0.04 && this.tickCount % 8 === 0 && !this.spectator) this.vibrate(w.pos[0], w.pos[1], w.pos[2]);
  };
  // 置く・壊すも振動。トラップチェストを開け閉めしたら周りに知らせる
  var breakBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function (x, y, z) {
    var id = this.world.block(x, y, z), r = breakBlock.apply(this, arguments);
    if (this.world.block(x, y, z) !== id && this.rs) this.vibrate(x + 0.5, y + 0.5, z + 0.5);
    return r;
  };
  var place2 = Game.prototype.place;
  Game.prototype.place = function () {
    var ec = this.world.editCount, r = place2.apply(this, arguments), t = this.walker.target;
    if (this.world.editCount !== ec && t && this.rs) this.vibrate(t.px + 0.5, t.py + 0.5, t.pz + 0.5);
    return r;
  };
  function chestPoke(g) { if (g.rs && g.chestKey) { var c = g.chestKey.split(',').map(Number); g.rs.dirty.push(c); g.rs.dirty.push([c[0], c[1] - 1, c[2]]); } }
  var openInv = Game.prototype.openInventory, closeInv = Game.prototype.closeInventory;
  Game.prototype.openInventory = function (sc) { var r = openInv.apply(this, arguments); if (sc === 'chest') chestPoke(this); return r; };
  Game.prototype.closeInventory = function () { var was = this.screen === 'chest' && this.invOpen, ck = this.chestKey, r = closeInv.apply(this, arguments); if (was && this.rs && ck) { var c = ck.split(',').map(Number); this.rs.dirty.push(c); this.rs.dirty.push([c[0], c[1] - 1, c[2]]); } return r; };

  // ---------------- クラフター ----------------
  var D6 = { N: [0, 0, -1], S: [0, 0, 1], E: [1, 0, 0], W: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0] };
  Game.prototype.craftAt = function (x, y, z) {
    var wd = this.world, m = /^CRAFTER_([NESWUD])$/.exec(keyOf(wd.block(x, y, z)));
    if (!m) return false;
    var c = this.container(x, y, z), r = Craft.match(c.slots.map(function (s) { return s ? s.key : null; }), 3), v = D6[m[1]];
    var fx = x + v[0], fy = y + v[1], fz = z + v[2];
    if (!r) { if (this.puff) this.puff(fx + 0.5, fy + 0.5, fz + 0.5, [150, 150, 150], 3, 0.1); return false; }
    c.slots.forEach(function (s, i) { if (s) { s.n--; if (s.n <= 0) c.slots[i] = null; } });
    var front = this.container(fx, fy, fz), out = { key: r.key, n: r.n };
    if (!(front && this.insertInto(front, out, v[1] < 0) && out.n <= 0)) {
      var e = this.spawnItem(r.key, out.n, fx + 0.5 - v[0] * 0.3, fy + 0.3, fz + 0.5 - v[2] * 0.3, 0, 8);
      if (e) { e.vx = v[0] * 0.2; e.vy = v[1] * 0.2 + 0.1; e.vz = v[2] * 0.2; }
    }
    if (this.puff) this.puff(fx + 0.5, fy + 0.5, fz + 0.5, [200, 180, 140], 6, 0.2);
    this.inv.changed();
    return true;
  };

  // ---------------- スライム・ハチミツの上 ----------------
  var wtick = Walker.prototype.tick;
  Walker.prototype.tick = function () {
    var vy0 = this.vel ? this.vel[1] : 0, wd = this.world, p = this.pos;
    var below = wd.block(Math.floor(p[0]), Math.floor(p[1] - 0.05), Math.floor(p[2]));
    if (below === B.SLIME_BLOCK && !this.sneak) this.fallDist = 0;   // スライムに落ちても痛くない
    var r = wtick.apply(this, arguments);
    var b2 = wd.block(Math.floor(this.pos[0]), Math.floor(this.pos[1] - 0.05), Math.floor(this.pos[2]));
    if (this.onGround && b2 === B.SLIME_BLOCK && !this.sneak && vy0 < -0.12) { this.vel[1] = -vy0 * 0.85; this.onGround = false; this.fallDist = 0; }
    if (this.onGround && b2 === B.HONEY_BLOCK) { this.vel[0] *= 0.4; this.vel[2] *= 0.4; if (this.vel[1] > 0) this.vel[1] *= 0.5; }
    // ハチミツの壁に触れて落ちていると、ゆっくり滑り落ちる
    if (!this.onGround && this.vel[1] < -0.06) {
      var fx = Math.floor(this.pos[0]), fy = Math.floor(this.pos[1] + 0.5), fz = Math.floor(this.pos[2]);
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var bx = fx + d[0], bz = fz + d[1]; return wd.block(bx, fy, bz) === B.HONEY_BLOCK && Math.abs(p[0] - (bx + 0.5)) < 0.85 && Math.abs(p[2] - (bz + 0.5)) < 0.85; })) { this.vel[1] = -0.06; this.fallDist = 0; }
    }
    return r;
  };

  // ---------------- 絵：ピストンで動いているブロック ----------------
  var drawExtra = Game.prototype.drawExtra;
  Game.prototype.drawExtra = function (solid, a, cube) {
    var r = drawExtra.apply(this, arguments), w = this.walker, anims = this.world.pistonAnims, WHITE = [255, 255, 255];
    if (anims && anims.length) anims.forEach(function (m) {
      var k = Math.min(1, (m.t + a) / 3), x = m.x + 0.5 - m.v[0] * (1 - k), y = m.y - m.v[1] * (1 - k), z = m.z + 0.5 - m.v[2] * (1 - k);
      cube(solid, x, y, z, 1, 0, function (fc) { return WG.atlasTile(m.id, fc); }, function () { return WHITE; }, w.lightLevels(x, y + 0.5, z));
    });
    return r;
  };

  // ---------------- コンパレーターが読むもの（追加） ----------------
  var containerSignal = Game.prototype.containerSignal;
  Game.prototype.containerSignal = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z), key = keyOf(id), k = x + ',' + y + ',' + z, m;
    if (id === B.COPPER_BULB_LIT) return 15;
    if (id === B.COPPER_BULB) return 0;
    if ((m = /^COMPOSTER_(\d)$/.exec(key))) return +m[1];
    if (/^ITEM_FRAME_/.test(key)) return wd.frames && wd.frames.get(k) ? 1 : 0;
    if ((id === B.BARREL || /SHELL_BOX$/.test(WG.BLOCKS[id].key)) && wd.boxes) {
      var c = wd.boxes.get(k) || [], f = 0, any = false;
      c.forEach(function (s) { if (s) { f += s.n / (ITEMS[s.key] ? ITEMS[s.key].max : 64); any = true; } });
      return any ? Math.floor(1 + f / 27 * 14) : 0;
    }
    return containerSignal.apply(this, arguments);
  };

  // ---------------- 狙っている部品の強さ（画面の下に出す） ----------------
  WG.blockStatus = function (g, t) {
    var id = t.id, name = WG.blockName(id), k = kind(id), key = keyOf(id), rs = g && g.rs, wd = g && g.world, pk = t.x + ',' + t.y + ',' + t.z;
    if (!rs) return name;
    if (k === 'wire') return name + '（強さ ' + WG.wirePower(id) + '）';
    if (k === 'repeater') { var dm = /REPEATER_[NESW](\d)/.exec(key); return name + '（遅れ ' + dm[1] + (WG.repLocked(rs, t.x, t.y, t.z) ? '、ロック中' : '') + (/_ON$/.test(key) ? '、オン' : '') + '）'; }
    if (k === 'comparator') return name + '（' + (/^COMPARATOR_[NESW]S/.test(key) ? '減算' : '比較') + '、出力 ' + (/_ON$/.test(key) ? wd.compOut.get(pk) || 0 : 0) + '）';
    if (/WEIGHTED_PRESSURE_PLATE/.test(key)) return name + '（強さ ' + ((wd.plateLevel && wd.plateLevel.get(pk)) || 0) + '）';
    if (id === B.TARGET) return name + '（強さ ' + ((wd.targetPow && wd.targetPow.get(pk)) || 0) + '）';
    if (k === 'sculk') return name + '（強さ ' + ((wd.sculkPow && wd.sculkPow.get(pk)) || 0) + '）';
    if (k === 'daylight') return name + '（強さ ' + (wd.daylight.get(pk) || 0) + '）';
    if (WG.OPAQUE[id] && k === 'solid' && id !== B.REDSTONE_BLOCK) {
      var st = rs.strong(t.x, t.y, t.z), wk = st ? 0 : rs.weak(t.x, t.y, t.z);
      if (st) return name + '（強い動力 ' + st + '）';
      if (wk) return name + '（弱い動力 ' + wk + '）';
    }
    return name;
  };
})(typeof window !== 'undefined' ? window : globalThis);
