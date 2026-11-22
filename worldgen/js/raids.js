// 襲撃とラヴェジャー、埋もれた宝とコンジット
// ・前哨基地の隊長（旗を背負った略奪者）を倒すと「不吉な瓶」。飲むと「凶兆」が付き、その状態で村に入ると襲撃が始まる
//   3 回の波で略奪者・ヴィンディケーター・ラヴェジャー・エヴォーカー・魔女が攻めてくる。画面の上に襲撃の棒
//   守りきると「村の英雄」（村人の値段が安くなる）。プレイヤーが倒れるか、村から遠く離れると負け
// ・ラヴェジャー：大きな獣。突進して強く叩き、跳ね飛ばす。葉や作物を踏みつぶして進む
// ・埋もれた宝：砂浜の砂の下の宝箱（海洋の心がかならず入る）。難破船の地図の箱に「宝の地図」（印の × まで導く）
// ・コンジット：海洋の心とオウムガイの殻 8 つ。プリズマリンで囲むと、まわりの水中で「コンジットパワー」（水中呼吸と暗視）
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Mobs = WG.Mobs, TYPES = WG.MOB_TYPES, MODELS = WG.MOB_MODELS, hash = WG.hash, rnd = WG.rnd;
  var S = WG.StructAPI, Plan = S.Plan, spec = S.spec, bbox = S.bbox, biomeKey = S.biomeKey, SEA = S.SEA, SALT = S.SALT + 400;
  function rint(n) { return Math.floor(Math.random() * n); }
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function box(x, y, z, w, h, d, c, sw, extra) { var b = { o: [x, y, z], s: [w, h, d], c: hex(c), sw: sw || null }; if (extra) for (var k in extra) b[k] = extra[k]; return b; }
  function item(key, name, max, extra) { var it = { key: key, name: name, block: -1, max: max || 64, shape: 'lump', color: '#888888' }; for (var k in extra || {}) it[k] = extra[k]; ITEMS[key] = it; return it; }

  // ---------------- アイテム・効果 ----------------
  item('OMINOUS_BOTTLE', '不吉な瓶', 64, { potion: true, effect: 'BAD_OMEN', secs: 6000, amp: 0, color: '#2a4a3a' });
  item('HEART_OF_THE_SEA', '海洋の心', 64); item('NAUTILUS_SHELL', 'オウムガイの殻', 64); item('TREASURE_MAP', '宝の地図', 1);
  ITEMS.CONDUIT = { key: 'CONDUIT', name: 'コンジット', block: B.CONDUIT, max: 64, hardness: 3, drop: 'CONDUIT', dropMin: 1, dropMax: 1, dropChance: 1 };
  Craft.SHAPED.push([['NNN', 'NHN', 'NNN'], { N: 'NAUTILUS_SHELL', H: 'HEART_OF_THE_SEA' }, 'CONDUIT', 1]);
  WG.EFFECTS.BAD_OMEN = ['凶兆', '#0b6138']; WG.EFFECTS.HERO_OF_THE_VILLAGE = ['村の英雄', '#44ff44']; WG.EFFECTS.CONDUIT_POWER = ['コンジットパワー', '#1dc2d1'];
  if (TYPES.DROWNED) { TYPES.DROWNED.rare = (TYPES.DROWNED.rare || []).concat(['NAUTILUS_SHELL']); TYPES.DROWNED.rareP = 0.08; }
  if (S.LOOT.ship_map) S.LOOT.ship_map.push(['TREASURE_MAP', 1, 1, 60]);
  if (S.LOOT.ship_treasure) S.LOOT.ship_treasure.push(['NAUTILUS_SHELL', 1, 2, 8]);
  S.LOOT.buried_treasure = [['IRON_INGOT', 1, 4, 20], ['GOLD_INGOT', 1, 4, 10], ['TNT', 1, 2, 5], ['EMERALD', 4, 8, 5], ['DIAMOND', 1, 2, 5], ['COOKED_COD', 2, 4, 5],
    ['LEATHER_CHESTPLATE', 1, 1, 1], ['IRON_SWORD', 1, 1, 1], ['PRISMARINE_CRYSTALS', 1, 5, 5]].filter(function (l) { return ITEMS[l[0]]; });

  // ---------------- ラヴェジャー ----------------
  var RV = '#5c5a58', RD = '#3e3c3a';
  MODELS.RAVAGER = [box(-7, 0, 5, 5, 14, 5, RD, 'L1'), box(2, 0, 5, 5, 14, 5, RD, 'L2'), box(-7, 0, -11, 5, 14, 5, RD, 'L2'), box(2, 0, -11, 5, 14, 5, RD, 'L1'),
    box(-8, 13, -13, 16, 16, 24, RV), box(-9, 24, -12, 18, 7, 18, '#6a6866'),
    box(-6, 12, 11, 12, 14, 9, RV), box(-5, 9, 14, 10, 4, 7, '#4a4846'),                      // 頭とあご
    box(-9, 24, 13, 3, 3, 3, '#d8d0b8'), box(6, 24, 13, 3, 3, 3, '#d8d0b8'), box(-10, 26, 11, 2, 6, 2, '#d8d0b8'), box(8, 26, 11, 2, 6, 2, '#d8d0b8'),   // 角
    box(-4, 20, 20, 2, 2, 0.4, '#1a1a1a'), box(2, 20, 20, 2, 2, 0.4, '#1a1a1a'), box(-1, 16, 20, 2, 4, 0.6, '#3a3836')];
  TYPES.RAVAGER = { name: 'ラヴェジャー', w: 1.95, h: 2.2, hp: 100, speed: 0.1, hostile: true, range: 32, ai: 'melee', dmg: 12, toss: 0.7, drops: [['SADDLE', 1, 1]], food: [] };
  // 隊長（旗を背負う）：略奪者とヴィンディケーターの見た目に足す
  ['PILLAGER', 'VINDICATOR'].forEach(function (k) {
    if (!MODELS[k]) return;
    var cap = function (m) { return !!m.captain; };
    MODELS[k] = MODELS[k].concat([box(-0.5, 12, -3, 1, 20, 1, '#6a4a2a', null, { only: cap }), box(-4, 21, -3.6, 8, 12, 0.6, '#e8e6de', null, { only: cap }),
      box(-2.5, 26, -3.9, 5, 3, 0.4, '#262626', null, { only: cap }), box(-1, 23, -3.9, 2, 7, 0.4, '#3a3a3a', null, { only: cap }), box(-3, 31, -3.9, 6, 1, 0.4, '#9a9a96', null, { only: cap })]);
  });
  ['RAVAGER'].forEach(function (k) {
    if (WG.MOB_ORDER.indexOf(k) < 0) WG.MOB_ORDER.push(k);
    ITEMS['SPAWN_EGG_' + k] = { key: 'SPAWN_EGG_' + k, name: TYPES[k].name + 'のスポーンエッグ', block: -1, max: 64, shape: 'lump', color: '#888888', egg: k };
  });
  // 前哨基地のいちばん上の略奪者は隊長
  S.SPECS.forEach(function (sp) {
    if (sp.key !== 'po') return;
    var build = sp.build;
    sp.build = function () { var P = build.apply(this, arguments), l = P.mobs[P.mobs.length - 1]; if (l) l[4] = Object.assign({}, l[4] || {}, { captain: true }); return P; };
  });
  // 隊長は不吉な瓶を落とす
  var die = Mobs.prototype.die;
  Mobs.prototype.die = function (m) {
    if (m.captain && m.byPlayer !== false) this.game.spawnItem('OMINOUS_BOTTLE', 1, m.x, m.y + 0.5, m.z, 0.1, 10);
    return die.apply(this, arguments);
  };

  // ---------------- 村を探す ----------------
  function villageNear(wd, x, z, r) {
    var st = wd.gen && wd.gen.structures, best = null, bd = r;
    if (!st || !st.village) return null;
    for (var rx = Math.floor(x / 256) - 1; rx <= Math.floor(x / 256) + 1; rx++) for (var rz = Math.floor(z / 256) - 1; rz <= Math.floor(z / 256) + 1; rz++) {
      var v = st.village(rx, rz); if (!v) continue;
      var d = Math.hypot(v.x - x, v.z - z); if (d < bd) { bd = d; best = v; }
    }
    return best;
  }
  WG.villageNear = villageNear;
  function groundAt(wd, x, z, y0) {
    for (var y = y0 + 24; y > y0 - 40; y--) { var id = wd.block(x, y - 1, z); if (WG.COLLIDE[id] >= 1 && !WG.COLLIDE[wd.block(x, y, z)] && !WG.COLLIDE[wd.block(x, y + 1, z)] && !WG.FLUID[wd.block(x, y, z)]) return y; }
    return null;
  }

  // ---------------- 襲撃 ----------------
  var WAVES = [[['PILLAGER', 3], ['VINDICATOR', 1]], [['PILLAGER', 3], ['VINDICATOR', 2], ['RAVAGER', 1]], [['PILLAGER', 4], ['VINDICATOR', 3], ['EVOKER', 1], ['RAVAGER', 1], ['WITCH', 1]]];
  Game.prototype.startRaid = function (cx, cy, cz) {
    this.raid = { cx: cx, cy: cy, cz: cz, wave: 0, waves: WAVES.length, state: 'pre', timer: 100, hp0: 1 };
    delete this.effects.BAD_OMEN; this.inv.changed();
    if (this.ui && this.ui.toast) this.ui.toast('襲撃がやって来る');
    if (WG.Sound) WG.Sound.play('raidhorn');
  };
  Game.prototype.spawnWave = function () {
    var r = this.raid, wd = this.world, self = this, list = [], a = Math.random() * Math.PI * 2;
    WAVES[r.wave].forEach(function (e, gi) {
      for (var n = 0; n < e[1]; n++) {
        for (var t = 0; t < 12; t++) {
          var ang = a + (Math.random() - 0.5) * 0.8, d = 30 + Math.random() * 8, x = Math.floor(r.cx + Math.cos(ang) * d), z = Math.floor(r.cz + Math.sin(ang) * d), y = groundAt(wd, x, z, r.cy);
          if (y == null) continue;
          var m = self.mobs.spawn(e[0], x + 0.5, y, z + 0.5);
          if (m) { m.raid = true; m.persist = true; if (!list.length && e[0] !== 'RAVAGER') m.captain = r.wave === r.waves - 1; list.push(m); }
          break;
        }
      }
    });
    r.hp0 = list.reduce(function (s, m) { return s + (m.maxHp || TYPES[m.type].hp); }, 0) || 1;
    r.wave++; r.state = 'wave';
    if (this.ui && this.ui.toast) this.ui.toast('襲撃：第 ' + r.wave + ' 波（' + list.length + ' 体）');
    if (WG.Sound) WG.Sound.play('raidhorn');
  };
  Game.prototype.tickRaid = function () {
    var wd = this.world, w = this.walker, p = w.pos, r = this.raid, self = this;
    if (!r) {
      if (this.effects.BAD_OMEN && this.mode === 'survival' && wd.dimKey === 'overworld' && (this.tickCount || 0) % 20 === 0) {
        var v = villageNear(wd, p[0], p[2], 56);
        if (v) this.startRaid(v.x, v.y || Math.floor(p[1]), v.z);
      }
      return;
    }
    var raiders = this.mobs.list.filter(function (m) { return m.raid && !m.dead; });
    if (r.state === 'pre') { if (--r.timer <= 0) this.spawnWave(); }
    else if (r.state === 'wave') {
      if (!raiders.length) {
        if (r.wave < r.waves) { r.state = 'pre'; r.timer = 300; if (this.ui && this.ui.toast) this.ui.toast('次の波まで、少し休める'); }
        else {
          r.state = 'won'; r.timer = 200;
          this.addEffect('HERO_OF_THE_VILLAGE', 48000, 0);
          if (this.ui && this.ui.toast) this.ui.toast('襲撃から村を守った');
          if (WG.advance) WG.advance(this, 'raid');
          for (var k = 0; k < 6; k++) this.particles.push({ x: r.cx + (Math.random() - 0.5) * 10, y: p[1] + 6 + Math.random() * 4, z: r.cz + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 0.3, vy: 0.1, vz: (Math.random() - 0.5) * 0.3, life: 30, c: [[255, 220, 80], [120, 230, 120], [120, 180, 255]][k % 3], glow: true, fw: true });
          if (WG.Sound) WG.Sound.play('firework');
        }
      }
    } else if (--r.timer <= 0) { this.raid = null; return; }
    if ((r.state === 'pre' || r.state === 'wave') && (this.dead || Math.hypot(p[0] - r.cx, p[2] - r.cz) > 128)) {
      r.state = 'lost'; r.timer = 100; if (this.ui && this.ui.toast) this.ui.toast('襲撃に負けた');
      raiders.forEach(function (m) { m.raid = false; });
    }
    // 襲撃の者は、プレイヤーが遠いと村の真ん中・村人のほうへ進む。近くの村人を叩く
    if (r.state === 'wave') raiders.forEach(function (m) {
      var dp = Math.hypot(m.x - p[0], m.z - p[2]);
      var vill = null, vd = 24; self.mobs.list.forEach(function (o) { if (o.type === 'VILLAGER' && !o.dead) { var d = Math.hypot(o.x - m.x, o.z - m.z); if (d < vd) { vd = d; vill = o; } } });
      if (dp > 14) { var tx = vill ? vill.x : r.cx, tz = vill ? vill.z : r.cz, dx = tx - m.x, dz = tz - m.z, d = Math.hypot(dx, dz) || 1; if (d > 1.2) { m.vx += dx / d * 0.015; m.vz += dz / d * 0.015; m.yaw = Math.atan2(dx, dz); } }
      if (vill && vd < 1.6 && (self.tickCount || 0) % 20 === 0 && m.type !== 'PILLAGER' && m.type !== 'WITCH') self.mobs.hurt(vill, TYPES[m.type].dmg || 4, [m.x, m.z, 0.4]);
    });
  };
  // ラヴェジャーは葉と作物を踏みつぶす
  var mtick = Mobs.prototype.tick;
  Mobs.prototype.tick = function () {
    var r = mtick.apply(this, arguments), wd = this.world, g = this.game;
    if ((g.tickCount || 0) % 5 === 0) this.list.forEach(function (m) {
      if (m.type !== 'RAVAGER' || m.dead) return;
      var fx = Math.floor(m.x + Math.sin(m.yaw) * 1.3), fz = Math.floor(m.z + Math.cos(m.yaw) * 1.3);
      for (var y = Math.floor(m.y); y <= Math.floor(m.y) + 2; y++) {
        var id = wd.block(fx, y, fz), k = WG.BLOCKS[id] ? WG.BLOCKS[id].key : '';
        if (/_LEAVES$/.test(k) || WG.blockKind(id) === 'crop') { g.breakBlock(fx, y, fz, false); }
      }
    });
    return r;
  };

  // ---------------- 村の英雄：値段が 3 割安い ----------------
  function discounted(g, fn) {
    var m = g.tradeMob, saved = [];
    if (!g.effects.HERO_OF_THE_VILLAGE || !m || !m.trades) return fn();
    m.trades.forEach(function (t) { saved.push(t.a[1]); if (t.a[0] === 'EMERALD') t.a[1] = Math.max(1, Math.floor(t.a[1] * 0.7)); });
    try { return fn(); } finally { m.trades.forEach(function (t, i) { t.a[1] = saved[i]; }); }
  }
  var trade = Game.prototype.trade, renderTrade = Game.prototype.renderTrade, self0 = null;
  Game.prototype.trade = function () { var self = this, args = arguments; return discounted(this, function () { return trade.apply(self, args); }); };
  Game.prototype.renderTrade = function () { var self = this, args = arguments; return discounted(this, function () { return renderTrade.apply(self, args); }); };

  // ---------------- 埋もれた宝 ----------------
  spec({ key: 'bt', dim: 'overworld', size: 128, reach: 2,
    head: function (gen, rx, rz) {
      var s = gen.seed;
      if (rnd(s, rx, 0, rz, SALT + 1) >= 0.5) return null;
      for (var tr = 0; tr < 10; tr++) {
        var x = rx * 128 + 8 + hash(s, rx, 1 + tr, rz, SALT + 1) % 112, z = rz * 128 + 8 + hash(s, rx, 11 + tr, rz, SALT + 1) % 112, c = gen.column(x, z);
        if (biomeKey(gen, x, z) === 'beach' && c.h >= SEA && c.h <= SEA + 3) return bbox({ x: x, z: z, y: c.h - 2 }, 1);
      }
      return null;
    },
    build: function (gen, h) { var P = new Plan(-64, 320, 'buried_treasure'); P.chest(h.x, h.y, h.z, 'buried_treasure'); P.set(h.x, h.y - 1, h.z, B.SANDSTONE); return P; }
  });
  S.KIND_KEY.buried_treasure = 'bt';
  // 宝箱には、かならず海洋の心
  var chestAt = Game.prototype.chestAt;
  Game.prototype.chestAt = function (x, y, z) {
    var wd = this.world, k = x + ',' + y + ',' + z, fresh = !wd.chests.has(k), c = chestAt.apply(this, arguments);
    if (fresh && c && WG.structuresNear(wd, x, z).some(function (p) { return p.loot[k] === 'buried_treasure'; }) && !c.some(function (s) { return s && s.key === 'HEART_OF_THE_SEA'; })) {
      var i = c.indexOf(null); if (i < 0) i = 13; c[i] = { key: 'HEART_OF_THE_SEA', n: 1 };
    }
    return c;
  };
  // 宝の地図：持つと、いちばん近い埋もれた宝のまわりの地図になる（× の印つき）
  Game.prototype.readTreasureMap = function (slot) {
    var s = this.inv.slots[slot], wd = this.world, p = this.walker.pos;
    if (!s || s.key !== 'TREASURE_MAP' || wd.dimKey !== 'overworld') return false;
    var l = WG.locateStructure(wd, 'buried_treasure', p[0], p[2], 12);
    if (!l) { if (this.ui && this.ui.toast) this.ui.toast('近くに宝は見つかりません'); return false; }
    this.inv.slots[slot] = { key: 'FILLED_MAP', n: 1, map: { x: l.x + 24, z: l.z - 16, dim: 'overworld', scale: 0, mark: [l.x, l.z], treasure: true } };
    this.inv.changed();
    if (this.ui && this.ui.toast) this.ui.toast('宝の地図を広げた（× の所を掘る）');
    return true;
  };
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var held = this.inv.held();
    if (held && held.key === 'TREASURE_MAP') { this.readTreasureMap(this.inv.sel); this.mouseR = this.clickR = false; return; }
    return use.apply(this, arguments);
  };
  var updateHeldView = Game.prototype.updateHeldView;
  Game.prototype.updateHeldView = function () {
    var r = updateHeldView.apply(this, arguments), ui = this.ui, held = this.inv.held();
    if (!ui || !ui.heldView || typeof document === 'undefined') return r;
    var el = ui.heldView, mk = el.querySelector('.tmark');
    if (held && held.key === 'FILLED_MAP' && held.map && held.map.mark && el.dataset.kind === 'map') {
      if (!mk) { mk = document.createElement('b'); mk.className = 'tmark'; mk.style.cssText = 'position:absolute;width:9%;height:9%;transform:translate(-50%,-50%);pointer-events:none;' +
        'background:linear-gradient(45deg,transparent 40%,#a8231c 40%,#a8231c 60%,transparent 60%),linear-gradient(-45deg,transparent 40%,#a8231c 40%,#a8231c 60%,transparent 60%)'; el.appendChild(mk); }
      var mp = held.map, size = 128 << (mp.scale || 0);
      mk.style.left = ((mp.mark[0] - (mp.x - size / 2)) / size * 100) + '%'; mk.style.top = ((mp.mark[1] - (mp.z - size / 2)) / size * 100) + '%'; mk.style.display = '';
    } else if (mk) mk.style.display = 'none';
    return r;
  };

  // ---------------- コンジット ----------------
  var PRISM = {};
  ['PRISMARINE', 'PRISMARINE_BRICKS', 'DARK_PRISMARINE', 'SEA_LANTERN'].forEach(function (k) { if (B[k] != null) PRISM[B[k]] = 1; });
  function conduitFrame(wd, x, y, z) {
    var n = 0;
    for (var dx = -2; dx <= 2; dx++) for (var dy = -2; dy <= 2; dy++) for (var dz = -2; dz <= 2; dz++) if (PRISM[wd.block(x + dx, y + dy, z + dz)]) n++;
    return n;
  }
  WG.conduitFrame = conduitFrame;
  Game.prototype.tickConduits = function () {
    var wd = this.world, w = this.walker, p = w.pos, self = this;
    if (!wd.conduits || !wd.conduits.size) return;
    wd.conduits.forEach(function (key) {
      var q = key.split(',').map(Number);
      if (wd.block(q[0], q[1], q[2]) !== B.CONDUIT) { wd.conduits.delete(key); return; }
      var n = conduitFrame(wd, q[0], q[1], q[2]), on = n >= 16 && WG.isWater(wd.block(q[0], q[1] + 1, q[2]));
      if (!on) return;
      var range = Math.floor(n / 7) * 16, d = Math.hypot(p[0] - q[0] - 0.5, p[1] + 1 - q[1] - 0.5, p[2] - q[2] - 0.5);
      if (d < range && WG.isWater(wd.block(Math.floor(p[0]), Math.floor(p[1] + 1), Math.floor(p[2])))) self.addEffect('CONDUIT_POWER', 260, 0);
      if (d < 32) for (var i = 0; i < 2; i++) { var a = Math.random() * Math.PI * 2, r = 1.5 + Math.random(); self.particles.push({ x: q[0] + 0.5 + Math.cos(a) * r, y: q[1] + 0.5 + (Math.random() - 0.5) * 2, z: q[2] + 0.5 + Math.sin(a) * r, vx: -Math.cos(a) * 0.05, vy: 0, vz: -Math.sin(a) * 0.05, life: 20, c: [120, 220, 230], glow: true }); }
    });
  };
  // コンジットパワー：水中呼吸と、水の中がよく見える
  var tickEffects = Game.prototype.tickEffects;
  Game.prototype.tickEffects = function () {
    var r = tickEffects.apply(this, arguments);
    if (this.effects.CONDUIT_POWER) { this.air = Math.max(this.air, 290); if (this.walker) this.walker.nightVision = true; }
    return r;
  };
  if (WG.World) {
    var setBlock = WG.World.prototype.setBlock;
    WG.World.prototype.setBlock = function (x, y, z, id) {
      var r = setBlock.apply(this, arguments);
      if (id === B.CONDUIT) (this.conduits || (this.conduits = new Set())).add(x + ',' + y + ',' + z);
      return r;
    };
  }

  // ---------------- 毎刻と、襲撃の棒 ----------------
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    var r = tickExtra.apply(this, arguments);
    this.tickRaid();
    if ((this.tickCount || 0) % 20 === 0) this.tickConduits();
    // 持った宝の地図は、すぐに広げる
    var held = this.inv.held();
    if (held && held.key === 'TREASURE_MAP' && (this.tickCount || 0) % 10 === 0) this.readTreasureMap(this.inv.sel);
    var bar = this.ui && this.ui.bossbar, rd = this.raid;
    if (bar && rd && (rd.state === 'wave' || rd.state === 'pre') && bar.classList.contains('hide')) {
      var hp = this.mobs.list.filter(function (m) { return m.raid && !m.dead; }).reduce(function (s, m) { return s + Math.max(0, m.hp); }, 0);
      bar.classList.remove('hide');
      bar.querySelector('b').textContent = rd.state === 'pre' ? '襲撃（第 ' + (rd.wave + 1) + ' 波が来る）' : '襲撃 ・ 第 ' + rd.wave + ' / ' + rd.waves + ' 波';
      bar.querySelector('i').style.width = (rd.state === 'pre' ? 100 : Math.max(0, hp / rd.hp0 * 100)) + '%';
    }
    return r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
