// 天気と、自然・ブロック（第 3 回）
// ・天気：晴れ・雨・雷雨が、本家と同じくらいの長さで移り変わる。寒いバイオームでは雪、砂漠とサバンナでは降らない
//   雨のすじ・雪のかけら（屋根の下には降らない）、地面のしぶき、空が暗く霞む、雨の音（屋根の下ではこもる）
//   雨は火を消し、耕地を湿らせ、大釜にたまる。雪は積もり、水を凍らせる
// ・雷：雷雨のときに落ちる。稲妻の絵と空の光、雷の音（遠いほど遅れて低く）。落ちた所に火、近くの生き物は傷つく
// ・避雷針：近くに落ちる雷を引き寄せ、火を出さずに動力 15 を出す。下の銅の錆を落とす
// ・大釜（水を入れる・くむ・瓶で取る、コンパレーター）、銅の酸化（斧で削る・ハチの巣のかけらでロウ引き）
// ・花とシダと枯れ木、雪ブロック・氷塊・青氷
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game;
  function keyOf(id) { return WG.BLOCKS[id] ? WG.BLOCKS[id].key : ''; }
  function rint(n) { return Math.floor(Math.random() * n); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  // ---------------- アイテムとレシピ ----------------
  function blockItem(key, hardness, drop, tool, tier) {
    var id = B[key];
    ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: 1, dropMax: 1, dropChance: 1 };
    if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = tier; }
    return ITEMS[key];
  }
  blockItem('CAULDRON', 2, 'CAULDRON', 'pickaxe', 0);
  for (var c = 1; c < 4; c++) blockItem('CAULDRON_' + c, 2, 'CAULDRON', 'pickaxe', 0);
  blockItem('LIGHTNING_ROD', 3, 'LIGHTNING_ROD', 'pickaxe', 1); blockItem('LIGHTNING_ROD_ON', 3, 'LIGHTNING_ROD', 'pickaxe', 1);
  var COPPER = ['COPPER_BLOCK', 'EXPOSED_COPPER', 'WEATHERED_COPPER', 'OXIDIZED_COPPER'], WAXED = ['WAXED_COPPER_BLOCK', 'WAXED_EXPOSED_COPPER', 'WAXED_WEATHERED_COPPER', 'WAXED_OXIDIZED_COPPER'];
  COPPER.slice(1).concat(WAXED).forEach(function (k) { blockItem(k, 3, k, 'pickaxe', 1); });
  ['CORNFLOWER', 'ALLIUM', 'AZURE_BLUET', 'OXEYE_DAISY', 'BLUE_ORCHID', 'LILY_OF_THE_VALLEY', 'RED_TULIP', 'ORANGE_TULIP', 'WHITE_TULIP', 'PINK_TULIP'].forEach(function (k) { blockItem(k, 0); });
  blockItem('FERN', 0, null); blockItem('DEAD_BUSH', 0, 'STICK'); ITEMS.DEAD_BUSH.dropMin = 0; ITEMS.DEAD_BUSH.dropMax = 2;
  blockItem('SNOW_BLOCK', 0.2, 'SNOWBALL', 'shovel', 0); ITEMS.SNOW_BLOCK.dropMin = ITEMS.SNOW_BLOCK.dropMax = 4;
  blockItem('PACKED_ICE', 0.5, null, 'pickaxe', 0); blockItem('BLUE_ICE', 2.8, null, 'pickaxe', 0);
  Craft.SHAPED.push(
    [['I I', 'I I', 'III'], { I: 'IRON_INGOT' }, 'CAULDRON', 1],
    [['C', 'C', 'C'], { C: 'COPPER_INGOT' }, 'LIGHTNING_ROD', 1],
    [['SS', 'SS'], { S: 'SNOWBALL' }, 'SNOW_BLOCK', 1],
    [['III', 'III', 'III'], { I: 'ICE' }, 'PACKED_ICE', 1],
    [['III', 'III', 'III'], { I: 'PACKED_ICE' }, 'BLUE_ICE', 1]);
  var DYE = { CORNFLOWER: 'BLUE_DYE', ALLIUM: 'MAGENTA_DYE', AZURE_BLUET: 'LIGHT_GRAY_DYE', OXEYE_DAISY: 'LIGHT_GRAY_DYE', BLUE_ORCHID: 'LIGHT_BLUE_DYE', LILY_OF_THE_VALLEY: 'WHITE_DYE',
    RED_TULIP: 'RED_DYE', ORANGE_TULIP: 'ORANGE_DYE', WHITE_TULIP: 'LIGHT_GRAY_DYE', PINK_TULIP: 'PINK_DYE' };
  Object.keys(DYE).forEach(function (k) { if (ITEMS[DYE[k]]) Craft.SHAPELESS.push([[k], DYE[k], 1]); });
  WAXED.forEach(function (k, i) { Craft.SHAPELESS.push([[COPPER[i], 'HONEYCOMB'], k, 1]); });

  // ---------------- 降り方（バイオーム） ----------------
  var SNOWY = { snowy_plains: 1, snowy_mountain: 1, frozen_ocean: 1 }, DRY = { desert: 1, savanna: 1, badlands: 1 };
  function precip(wd, x, z) {
    if (wd.dimKey !== 'overworld' || !wd.biomeAt) return 'none';
    var b = WG.BIOMES[wd.biomeAt(Math.floor(x), Math.floor(z))], k = b ? b.key : 'plains';
    return SNOWY[k] ? 'snow' : DRY[k] ? 'none' : 'rain';
  }
  WG.precipAt = precip;
  // その列でいちばん上の、雨を止めるブロックの上の高さ（y0 から下へ探す）
  function topAt(wd, x, z, y0, y1) {
    for (var y = y0; y >= y1; y--) { var id = wd.block(x, y, z); if (id !== B.AIR && (WG.COLLIDE[id] > 0 || WG.FLUID[id])) return y + 1; }
    return y1;
  }
  WG.rainTop = topAt;
  function state(wd) { return wd.weather || (wd.weather = { rain: false, thunder: false, rainT: 12000 + rint(156000), thunderT: 12000 + rint(156000) }); }
  WG.weatherState = state;
  Game.prototype.setWeather = function (kind, secs) {
    var s = state(this.world), t = secs ? secs * 20 : 6000 + rint(12000);
    s.rain = kind !== 'clear'; s.thunder = kind === 'thunder';
    s.rainT = t; s.thunderT = s.thunder ? t : (kind === 'clear' ? t : 12000 + rint(156000));
    if (secs === 0) { this.rainLv = s.rain ? 1 : 0; this.thunderLv = s.thunder ? 1 : 0; }
  };
  Game.prototype.isRainingAt = function (x, y, z) {
    var wd = this.world;
    if ((this.rainLv || 0) < 0.2 || precip(wd, x, z) !== 'rain') return false;
    return topAt(wd, Math.floor(x), Math.floor(z), Math.min(wd.maxY - 1, Math.floor(y) + 48), Math.floor(y)) <= Math.floor(y);
  };

  // ---------------- 毎刻 ----------------
  Game.prototype.tickWeather = function () {
    var wd = this.world, w = this.walker, self = this;
    if (wd.dimKey !== 'overworld') { this.rainLv = this.thunderLv = 0; if (WG.Sound && WG.Sound.setRain) WG.Sound.setRain(0); return; }
    var s = state(wd);
    if (--s.rainT <= 0) { s.rain = !s.rain; s.rainT = s.rain ? 12000 + rint(12000) : 12000 + rint(168000); }
    if (--s.thunderT <= 0) { s.thunder = !s.thunder; s.thunderT = s.thunder ? 3600 + rint(12000) : 12000 + rint(168000); }
    var tr = s.rain ? 1 : 0, tt = s.rain && s.thunder ? 1 : 0;
    this.rainLv = clamp((this.rainLv || 0) + clamp(tr - (this.rainLv || 0), -0.01, 0.01), 0, 1);
    this.thunderLv = clamp((this.thunderLv || 0) + clamp(tt - (this.thunderLv || 0), -0.01, 0.01), 0, 1);
    if (this.flashT > 0) this.flashT--;
    var p = w.pos, here = precip(wd, p[0], p[2]), now = this.tickCount || 0;
    // 雨の音：降っている所の近くにいるか（屋根の下はこもる）
    if (WG.Sound && WG.Sound.setRain && now % 10 === 0) {
      var open = topAt(wd, Math.floor(p[0]), Math.floor(p[2]), Math.min(wd.maxY - 1, Math.floor(p[1]) + 40), Math.floor(p[1] + 1)) <= Math.floor(p[1] + 1);
      WG.Sound.setRain(here === 'rain' ? this.rainLv : 0, !open);
    }
    if (this.rainLv > 0.2 && here !== 'none') {
      // 地面のしぶき（雨）
      for (var i = 0; i < (here === 'rain' ? 4 : 0); i++) {
        var sx = Math.floor(p[0]) + rint(17) - 8, sz = Math.floor(p[2]) + rint(17) - 8, ty = topAt(wd, sx, sz, Math.floor(p[1]) + 12, Math.floor(p[1]) - 10);
        if (ty > Math.floor(p[1]) - 10 && precip(wd, sx, sz) === 'rain') this.particles.push({ x: sx + Math.random(), y: ty + 0.05, z: sz + Math.random(), vx: (Math.random() - 0.5) * 0.04, vy: 0.06, vz: (Math.random() - 0.5) * 0.04, life: 4, c: [178, 196, 224] });
      }
      // 雪が積もる・水が凍る（近くの列を少しずつ）、雨が火を消す・耕地を湿らせる
      for (var j = 0; j < 2; j++) {
        var cx = Math.floor(p[0]) + rint(65) - 32, cz = Math.floor(p[2]) + rint(65) - 32, pk = precip(wd, cx, cz);
        if (pk === 'none') continue;
        var top = topAt(wd, cx, cz, Math.min(wd.maxY - 1, Math.floor(p[1]) + 40), Math.max(wd.minY, Math.floor(p[1]) - 40)), below = wd.block(cx, top - 1, cz);
        if (pk === 'snow') {
          if (below === B.WATER) { wd.setBlock(cx, top - 1, cz, B.ICE); w.remesh(cx, cz); }
          else if (WG.OPAQUE[below] && wd.block(cx, top, cz) === B.AIR && Math.random() < 0.3) { wd.setBlock(cx, top, cz, B.SNOW_LAYER); w.remesh(cx, cz); }
        } else if (below === B.FARMLAND) { wd.setBlock(cx, top - 1, cz, B.FARMLAND_MOIST); w.remesh(cx, cz); }
      }
      if (here === 'rain' && now % 20 === 0 && wd.fires) wd.fires.forEach(function (f, key) {
        var q = key.split(',').map(Number);
        if (Math.random() < 0.3 && self.isRainingAt(q[0] + 0.5, q[1], q[2] + 0.5)) self.setFire(q[0], q[1], q[2], false);
      });
      // 雨に当たると、体の火が消える
      if (this.burnT > 0 && now % 5 === 0 && this.isRainingAt(p[0], p[1] + 1, p[2])) this.burnT = 0;
    }
    // 雷：雷雨の間、ときどき近くに落ちる
    if (this.thunderLv > 0.6 && Math.random() < 1 / 160) this.lightningNear();
    // 避雷針の動力が切れる
    if (wd.rodPow) wd.rodPow.forEach(function (t, key) {
      if (--t > 0) { wd.rodPow.set(key, t); return; }
      wd.rodPow.delete(key);
      var q = key.split(',').map(Number);
      if (wd.block(q[0], q[1], q[2]) === B.LIGHTNING_ROD_ON) { wd.setBlock(q[0], q[1], q[2], B.LIGHTNING_ROD); w.remesh(q[0], q[2]); if (self.rs) self.rs.dirty.push(q); }
    });
    // 雷の音は、距離に合わせて遅れて届く
    this.thunders = (this.thunders || []).filter(function (t) { if (t.at > now) return true; if (WG.Sound) WG.Sound.play('thunder', null, null, null, t.near); return false; });
    this.bolts = (this.bolts || []).filter(function (b) { return ++b.t < 10; });
  };
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () { var r = tickExtra.apply(this, arguments); this.tickWeather(); return r; };

  // ---------------- 雷 ----------------
  function rodsNear(wd, x, z, r) {
    var best = null, bd = r;
    (wd.rods || new Set()).forEach(function (key) {
      var q = key.split(',').map(Number), d = Math.hypot(q[0] - x, q[2] - z);
      if (d < bd && WG.isRod(wd.block(q[0], q[1], q[2]))) { bd = d; best = q; }
    });
    return best;
  }
  WG.isRod = function (id) { return id === B.LIGHTNING_ROD || id === B.LIGHTNING_ROD_ON; };
  Game.prototype.lightningNear = function () {
    var wd = this.world, p = this.walker.pos, x = Math.floor(p[0]) + rint(97) - 48, z = Math.floor(p[2]) + rint(97) - 48;
    if (precip(wd, x, z) !== 'rain') return null;
    var rod = rodsNear(wd, x + 0.5, z + 0.5, 64);
    if (rod && topAt(wd, rod[0], rod[2], Math.min(wd.maxY - 1, rod[1] + 64), rod[1]) <= rod[1] + 1) return this.strike(rod[0], rod[1], rod[2]);
    var top = topAt(wd, x, z, Math.min(wd.maxY - 1, Math.floor(p[1]) + 64), Math.max(wd.minY, Math.floor(p[1]) - 48));
    return this.strike(x, top, z);
  };
  // (x, y, z) に雷を落とす。y は地面の上（避雷針ならその場所）
  Game.prototype.strike = function (x, y, z) {
    var wd = this.world, w = this.walker, self = this, id = wd.block(x, y, z), onRod = WG.isRod(id);
    var seed = rint(1e9), bolt = { x: x + 0.5, y: onRod ? y + 1 : y, z: z + 0.5, t: 0, seed: seed };
    (this.bolts || (this.bolts = [])).push(bolt);
    this.flashT = 6;
    var d = Math.hypot(w.pos[0] - x, w.pos[1] - y, w.pos[2] - z);
    (this.thunders || (this.thunders = [])).push({ at: (this.tickCount || 0) + Math.min(40, Math.round(d / 17)), near: clamp(1 - d / 96, 0.1, 1) });
    if (onRod) {
      wd.setBlock(x, y, z, B.LIGHTNING_ROD_ON); w.remesh(x, z);
      (wd.rodPow || (wd.rodPow = new Map())).set(x + ',' + y + ',' + z, 8);
      if (this.rs) this.rs.dirty.push([x, y, z]);
      var under = wd.block(x, y - 1, z), ci = COPPER.indexOf(keyOf(under));
      if (ci > 0) { wd.setBlock(x, y - 1, z, B.COPPER_BLOCK); w.remesh(x, z); }   // 雷で銅の錆が落ちる
      for (var k = 0; k < 14; k++) this.particles.push({ x: x + 0.5, y: y + 1, z: z + 0.5, vx: (Math.random() - 0.5) * 0.5, vy: Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.5, life: 6 + rint(6), c: [255, 240, 190], glow: true });
      return bolt;
    }
    // 火（落ちた所と、まわりにいくつか）
    var fire = function (fx, fz) { var fy = topAt(wd, fx, fz, y + 2, y - 3); if (wd.block(fx, fy, fz) === B.AIR && WG.COLLIDE[wd.block(fx, fy - 1, fz)] >= 1 && !WG.FLUID[wd.block(fx, fy - 1, fz)]) self.setFire(fx, fy, fz, true, 0); };
    fire(x, z); for (var f = 0; f < 3; f++) if (Math.random() < 0.4) fire(x + rint(3) - 1, z + rint(3) - 1);
    // 近くの生き物とプレイヤー
    if (d < 3.5 && !this.dead) { this.damage(5, true, 'lightning'); if (!(this.effects && this.effects.FIRE_RESISTANCE)) this.burnT = Math.max(this.burnT || 0, 160); }
    this.mobs.list.forEach(function (m) {
      if (m.dead || Math.hypot(m.x - x - 0.5, m.z - z - 0.5) > 3.5 || Math.abs(m.y - y) > 6) return;
      self.mobs.hurt(m, 5, null); if (!WG.MOB_TYPES[m.type].fireproof) m.fire = Math.max(m.fire || 0, 160);
    });
    for (var e = 0; e < 18; e++) this.particles.push({ x: x + 0.5, y: y + 0.2, z: z + 0.5, vx: (Math.random() - 0.5) * 0.5, vy: Math.random() * 0.35, vz: (Math.random() - 0.5) * 0.5, life: 6 + rint(8), c: [255, 236, 170], glow: true });
    return bolt;
  };
  // 避雷針の場所を覚える（置く・壊すと変わる）
  if (WG.World) {
    var setBlock = WG.World.prototype.setBlock;
    WG.World.prototype.setBlock = function (x, y, z, id) {
      var was = this.block(x, y, z), r = setBlock.apply(this, arguments);
      if (WG.isRod(id) || WG.isRod(was)) { var rs = this.rods || (this.rods = new Set()), k = x + ',' + y + ',' + z; if (WG.isRod(id)) rs.add(k); else rs.delete(k); }
      return r;
    };
  }
  // 避雷針は、雷が落ちてから 8 刻みの間、動力 15 を出す
  if (WG.Redstone) {
    var emit = WG.Redstone.prototype.emit;
    WG.Redstone.prototype.emit = function (x, y, z) { if (this.get(x, y, z) === B.LIGHTNING_ROD_ON) return 15; return emit.apply(this, arguments); };
  }

  // ---------------- 空：雨で暗く・灰色に、霞が近く。稲妻で一瞬明るく ----------------
  var sky = Game.prototype.sky;
  Game.prototype.sky = function () {
    var s = sky.apply(this, arguments), r = this.rainLv || 0, th = this.thunderLv || 0;
    if (!s || (!r && !(this.flashT > 0))) return s;
    function gray(c, k) { var g = (c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15); return mix(c, [g * 0.86, g * 0.9, g * 0.98], 0.85 * r).map(function (v) { return v * k; }); }
    var k = 1 - 0.28 * r - 0.3 * th;
    s.top = gray(s.top, k); s.low = gray(s.low, k); s.fog = gray(s.fog, k);
    s.dark = Math.min(11, s.dark + 3 * r + 2 * th);
    s.tint = mix(s.tint, [0.86, 0.9, 0.98], r * 0.6);
    if (s.celestial) s.celestial.stars *= 1 - r;
    s.fogK = 1 - 0.55 * r;
    if (this.flashT > 0) {
      var f = this.flashT / 6;
      s.top = mix(s.top, [0.82, 0.86, 1], f * 0.75); s.low = mix(s.low, [0.82, 0.86, 1], f * 0.6); s.fog = mix(s.fog, [0.75, 0.8, 0.95], f * 0.5);
      s.dark = s.dark * (1 - f);
    }
    return s;
  };

  // ---------------- 絵：雨のすじ・雪・稲妻 ----------------
  // 半透明の面を作る（play.js の Batch と同じ形）
  function Strip(alpha) { this.pos = []; this.col = []; this.uv = []; this.lt = []; this.alpha = alpha; }
  Strip.prototype.v = function (x, y, z, c, L) {
    this.pos.push(x * 16, y * 16, z * 16, 0);
    this.col.push(Math.min(255, c[0] * 0.5) | 0, Math.min(255, c[1] * 0.5) | 0, Math.min(255, c[2] * 0.5) | 0, 0);
    this.uv.push(0, 0, 0, 0);
    this.lt.push(L[0] * 17, L[1] * 17, 0, 0);
  };
  // 帯（下の点 → 上の点。カメラに向けて幅を付ける）
  Strip.prototype.seg = function (xb, yb, zb, xt, yt, zt, w2, ex, ez, c, L, c2) {
    var mx = (xb + xt) / 2 - ex, mz = (zb + zt) / 2 - ez, d = Math.hypot(mx, mz) || 1, rx = -mz / d * w2, rz = mx / d * w2, cb = c2 || c;
    var P = [[xt - rx, yt, zt - rz, c], [xt + rx, yt, zt + rz, c], [xb + rx, yb, zb + rz, cb], [xb - rx, yb, zb - rz, cb]];
    var self = this;
    [0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2].forEach(function (k) { self.v(P[k][0], P[k][1], P[k][2], P[k][3], L); });
  };
  Strip.prototype.band = function (x, y0, z, y1, w2, ex, ez, c, L, c2) { this.seg(x, y0, z, x, y1, z, w2, ex, ez, c, L, c2); };
  Strip.prototype.done = function () { return { pos: new Float32Array(this.pos), col: new Uint8Array(this.col), uv: new Uint8Array(this.uv), lt: new Uint8Array(this.lt), count: this.pos.length / 4, alpha: this.alpha }; };
  function h32(a, b, c) { var h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  var draw = Game.prototype.draw;
  Game.prototype.draw = function (a) {
    var r = draw.apply(this, arguments), w = this.walker, wd = this.world, e = w.eye || [w.pos[0], w.pos[1] + 1.6, w.pos[2]];
    var lv = this.rainLv || 0, bolts = this.bolts || [];
    if ((lv < 0.02 && !bolts.length) || !this.view || !this.view.dynamic || wd.dimKey !== 'overworld') return r;
    var rain = new Strip(0.55), snow = new Strip(0.9), bolt = new Strip(0.95), halo = new Strip(0.3), t = (this.tickCount || 0) + a, R = 13, ex = Math.floor(e[0]), ez = Math.floor(e[2]), ey = e[1];
    // 列ごとの屋根の高さは、20 刻みごとか動いたときだけ調べ直す
    var ck = ex + ',' + ez + ',' + Math.floor(ey / 4) + ',' + (wd.editCount || 0) + ',' + Math.floor(t / 20);
    if (this._rainKey !== ck) {
      this._rainKey = ck; var tops = this._rainTops = new Int16Array((2 * R + 1) * (2 * R + 1)), kinds = this._rainKinds = new Uint8Array(tops.length);
      for (var dz = -R; dz <= R; dz++) for (var dx = -R; dx <= R; dx++) {
        var n = (dz + R) * (2 * R + 1) + dx + R, pk = precip(wd, ex + dx, ez + dz);
        kinds[n] = pk === 'rain' ? 1 : pk === 'snow' ? 2 : 0;
        tops[n] = kinds[n] ? topAt(wd, ex + dx, ez + dz, Math.min(wd.maxY - 1, Math.floor(ey) + 14), Math.floor(ey) - 14) : 32767;
      }
    }
    var tops2 = this._rainTops, kinds2 = this._rainKinds, sun = 1;   // 夜の暗さは描くときに空の光で決まる
    var RC = [150 * sun + 20, 168 * sun + 22, 200 * sun + 30], RC2 = [110 * sun + 14, 126 * sun + 16, 160 * sun + 24], SC = [240 * sun + 10, 242 * sun + 10, 248 * sun + 6], L = [15, 0];
    if (lv > 0.02) for (var dz2 = -R; dz2 <= R; dz2++) for (var dx2 = -R; dx2 <= R; dx2++) {
      var m = (dz2 + R) * (2 * R + 1) + dx2 + R, kind = kinds2[m];
      if (!kind || dx2 * dx2 + dz2 * dz2 > R * R) continue;
      var cx = ex + dx2, cz = ez + dz2, top = tops2[m], span = 24, base = Math.floor(ey) - 10;
      for (var q = 0; q < 2; q++) {
        if (h32(cx, cz, q) > lv) continue;
        var ph = h32(cz, cx, q + 7), ox = 0.15 + 0.7 * h32(cx, q, cz), oz = 0.15 + 0.7 * h32(q, cz, cx);
        if (Math.hypot(cx + ox - e[0], cz + oz - e[2]) < 1.6) continue;   // 目のすぐ近くのすじは描かない（大きな板に見える）
        if (kind === 1) {
          var yy = base + span - ((t * (0.95 + ph * 0.3) + ph * span) % span), len = 0.9 + ph * 0.5;
          if (yy - len < top) continue;
          rain.band(cx + ox, yy - len, cz + oz, yy, 0.022, e[0], e[2], RC, L, RC2);
        } else {
          var ys = base + span - ((t * (0.07 + ph * 0.04) + ph * span) % span);
          if (ys < top) continue;
          var sw = Math.sin(t * 0.06 + ph * 20) * 0.35;
          snow.band(cx + ox + sw, ys, cz + oz + Math.cos(t * 0.05 + ph * 9) * 0.3, ys + 0.09, 0.05, e[0], e[2], SC, L);
        }
      }
    }
    // 稲妻：上空からの折れ線と枝。始めの数刻だけ光り、点滅する
    bolts.forEach(function (b) {
      if (b.t > 7 || (b.t % 3 === 2)) return;
      var rnd = function (i) { return h32(b.seed, i, 99) - 0.5; }, x = b.x, y = b.y + 90, z = b.z, i = 0, BC = [255, 255, 255], BC2 = [214, 222, 255];
      var seg = function (x0, y0, z0, x1, y1, z1, wdt) {
        bolt.seg(x1, y1, z1, x0, y0, z0, wdt, e[0], e[2], BC, [15, 15], BC2);
        halo.seg(x1, y1, z1, x0, y0, z0, wdt * 2.4, e[0], e[2], [210, 218, 255], [15, 15]);   // まわりの光
      };
      while (y > b.y && i < 120) {
        var ny = Math.max(b.y, y - 1.2 - Math.abs(rnd(i)) * 2.6), nx = ny <= b.y ? b.x : x + rnd(i + 100) * 1.6 + (b.x - x) * 0.08, nz = ny <= b.y ? b.z : z + rnd(i + 200) * 1.6 + (b.z - z) * 0.08;
        seg(x, y, z, nx, ny, nz, 0.14);
        if (rnd(i + 300) > 0.36 && y - b.y > 10) { var bx = nx, by = ny, bz = nz, dxb = rnd(i + 400) * 1.8, dzb = rnd(i + 600) * 1.8; for (var q = 0; q < 4; q++) { var cx2 = bx + dxb + rnd(i * 7 + q) * 0.8, cy2 = by - 1.5 - Math.abs(rnd(i * 9 + q)) * 1.5, cz2 = bz + dzb + rnd(i * 11 + q) * 0.8; seg(bx, by, bz, cx2, cy2, cz2, 0.05); bx = cx2; by = cy2; bz = cz2; } }   // 枝
        x = nx; y = ny; z = nz; i++;
      }
    });
    if (rain.pos.length) this.view.dynamic.push(rain.done());
    if (snow.pos.length) this.view.dynamic.push(snow.done());
    if (bolt.pos.length) { this.view.dynamic.push(halo.done()); this.view.dynamic.push(bolt.done()); }
    return r;
  };

  // ---------------- ランダムな刻み：銅の酸化、雨のたまる大釜 ----------------
  var RT = WG.RANDOM_TICK = WG.RANDOM_TICK || {};
  COPPER.slice(0, 3).forEach(function (k, i) {
    RT[B[k]] = function (g, x, y, z) { if (Math.random() < 0.06) { g.world.setBlock(x, y, z, B[COPPER[i + 1]]); g.walker.remesh(x, z); } };
  });
  [B.CAULDRON, B.CAULDRON_1, B.CAULDRON_2].forEach(function (id, lv) {
    RT[id] = function (g, x, y, z) { if (Math.random() < 0.25 && g.isRainingAt(x + 0.5, y + 1, z + 0.5)) { g.world.setBlock(x, y, z, B['CAULDRON_' + (lv + 1)]); g.walker.remesh(x, z); if (g.rs) g.rs.dirty.push([x, y, z]); } };
  });
  // 雨の当たる耕地は湿る
  var tickFarmland = Game.prototype.tickFarmland;
  Game.prototype.tickFarmland = function (x, y, z) {
    if (this.world.block(x, y, z) === B.FARMLAND && this.isRainingAt(x + 0.5, y + 1, z + 0.5)) { this.world.setBlock(x, y, z, B.FARMLAND_MOIST); this.walker.remesh(x, z); return; }
    return tickFarmland.apply(this, arguments);
  };

  // ---------------- 大釜のコンパレーター ----------------
  var containerSignal = Game.prototype.containerSignal;
  Game.prototype.containerSignal = function (x, y, z) {
    var id = this.world.block(x, y, z);
    if (id === B.CAULDRON) return 0;
    if (id === B.CAULDRON_1 || id === B.CAULDRON_2 || id === B.CAULDRON_3) return +keyOf(id).slice(-1);
    return containerSignal.apply(this, arguments);
  };

  // ---------------- 右クリック：大釜・銅を削る・ロウ引き ----------------
  function cauldronLevel(id) { return id === B.CAULDRON ? 0 : id === B.CAULDRON_1 ? 1 : id === B.CAULDRON_2 ? 2 : id === B.CAULDRON_3 ? 3 : -1; }
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), it = held ? ITEMS[held.key] : null, wd = this.world, surv = this.mode === 'survival', self = this;
    var shift = w.keys && (w.keys.ShiftLeft || w.keys.ShiftRight);
    function done() { self.mouseR = self.clickR = false; }
    function give(k) { if (!surv) return; if (held.n === 1) self.inv.slots[self.inv.sel] = { key: k, n: 1 }; else { self.inv.take(self.inv.sel, 1); if (!self.inv.add(k, 1)) self.spawnItem(k, 1, w.pos[0], w.pos[1] + 1, w.pos[2], 0.1, 10); } self.inv.changed(); }
    function setLv(n) { wd.setBlock(t.x, t.y, t.z, n ? B['CAULDRON_' + n] : B.CAULDRON); w.remesh(t.x, t.z); if (self.rs) self.rs.dirty.push([t.x, t.y, t.z]); }
    if (t && it && !shift && !this.spectator) {
      var lv = cauldronLevel(t.id);
      if (lv >= 0) {
        var snd = function (n) { if (WG.Sound) WG.Sound.play(n, t.x + 0.5, t.y + 0.8, t.z + 0.5); };
        if (held.key === 'WATER_BUCKET') { setLv(3); give('BUCKET'); snd('drink'); done(); return; }
        if (held.key === 'BUCKET' && lv === 3) { setLv(0); give('WATER_BUCKET'); snd('drink'); done(); return; }
        if (held.key === 'GLASS_BOTTLE' && lv > 0) { setLv(lv - 1); give('POTION_WATER'); snd('drink'); done(); return; }
        if (held.key === 'POTION_WATER' && lv < 3) { setLv(lv + 1); give('GLASS_BOTTLE'); snd('drink'); done(); return; }
        // 色の付いた革の防具などはないので、ほかの物は何もしない
      }
      var ci = COPPER.indexOf(keyOf(t.id)), wi = WAXED.indexOf(keyOf(t.id));
      if (it.tool === 'axe' && (ci > 0 || wi >= 0)) {
        wd.setBlock(t.x, t.y, t.z, B[wi >= 0 ? COPPER[wi] : COPPER[ci - 1]]); w.remesh(t.x, t.z);
        this.puff(t.x + 0.5, t.y + 0.5, t.z + 0.5, wi >= 0 ? [240, 200, 90] : [110, 200, 170], 12, 0.6);
        if (surv && this.wearTool) this.wearTool(1);
        if (WG.Sound) WG.Sound.play('break', t.x + 0.5, t.y + 0.5, t.z + 0.5, 'stone');
        done(); return;
      }
      if (held.key === 'HONEYCOMB' && ci >= 0) {
        wd.setBlock(t.x, t.y, t.z, B[WAXED[ci]]); w.remesh(t.x, t.z);
        this.puff(t.x + 0.5, t.y + 0.5, t.z + 0.5, [240, 190, 70], 12, 0.6);
        if (surv) this.inv.take(this.inv.sel, 1);
        done(); return;
      }
    }
    return use.apply(this, arguments);
  };

  // ---------------- コマンド /weather ----------------
  var run = WG.runCommand;
  if (run) WG.runCommand = function (g, text) {
    var a = String(text || '').trim().replace(/^\//, '').split(/\s+/);
    if ((a[0] || '').toLowerCase() !== 'weather') return run.apply(this, arguments);
    if (g.world.dimKey !== 'overworld') return '天気は地上だけです';
    var k = (a[1] || '').toLowerCase(), secs = a[2] != null ? parseInt(a[2], 10) : null;
    if (k === 'query') { var s = state(g.world); return '今の天気：' + (s.rain ? (s.thunder ? '雷雨' : '雨') : '晴れ'); }
    if (k !== 'clear' && k !== 'rain' && k !== 'thunder') return '使い方：/weather <clear|rain|thunder> [秒] ・ /weather query';
    g.setWeather(k, isNaN(secs) ? null : secs);
    return '天気を' + { clear: '晴れ', rain: '雨', thunder: '雷雨' }[k] + 'にしました';
  };
})(typeof window !== 'undefined' ? window : globalThis);
