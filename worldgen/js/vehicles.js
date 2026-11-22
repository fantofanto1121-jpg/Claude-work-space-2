// 乗り物と、生き物につなぐ道具（Minecraft の決まりに合わせたもの）。
// - レール：置くと、隣のレールにつながる形（まっすぐ・曲がり角・坂）になる。パワードレールは動力があると加速し、ないとブレーキになる。
// - トロッコ：レールの上を走る。右クリックで乗り、W で押す。坂では重さで速くなる・遅くなる。最高 0.4 ブロック/刻み（8 m/秒）。
// - ボート：水に浮かび、W で進み A・D で向きを変える。陸では遅い。叩くと壊れてボートに戻る。
// - 鞍：豚に付けると乗れる。ニンジン付きの棒を持つと、見ている向きへ豚が進む。
// - リード：動物をつなぎ、引っぱって連れて行ける。柵を右クリックすると柵につなぐ。10 ブロック離れると切れる。
// - 名札：生き物に名前を付ける（頭の上に出る）。名前のある生き物は遠くても消えない。
// 乗っている間とシフトで降りるのは、walk.js の ride の入口から動かす。乗り物は生き物の一覧（mobs.js）に入れて描く。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Mobs = WG.Mobs, TYPES = WG.MOB_TYPES, MODELS = WG.MOB_MODELS;

  function item(key, name, max, extra) {
    var it = { key: key, name: name, block: -1, max: max || 64, shape: 'lump', color: '#888888' };
    for (var k in extra || {}) it[k] = extra[k];
    ITEMS[key] = it;
    return it;
  }
  item('RAIL', 'レール', 64, { rail: 'RAIL' }); item('POWERED_RAIL', 'パワードレール', 64, { rail: 'POWERED_RAIL' });
  item('MINECART', 'トロッコ', 1, { vehicle: 'MINECART' }); item('BOAT', 'ボート', 1, { vehicle: 'BOAT' });
  item('SADDLE', '鞍', 1); item('CARROT_ON_A_STICK', 'ニンジン付きの棒', 1, { dur: 25 });
  item('LEAD', 'リード'); item('NAME_TAG', '名札');
  Craft.SHAPED.push(
    [['I I', 'ISI', 'I I'], { I: 'IRON_INGOT', S: 'STICK' }, 'RAIL', 16],
    [['G G', 'GSG', 'GRG'], { G: 'GOLD_INGOT', S: 'STICK', R: 'REDSTONE' }, 'POWERED_RAIL', 6],
    [['I I', 'III'], { I: 'IRON_INGOT' }, 'MINECART', 1],
    [['P P', 'PPP'], { P: 'PLANKS' }, 'BOAT', 1],
    [['SS ', 'SB ', '  S'], { S: 'STRING', B: 'SLIME_BALL' }, 'LEAD', 2]
  );
  Craft.SHAPELESS.push([['FISHING_ROD', 'CARROT'], 'CARROT_ON_A_STICK', 1]);
  Craft.FUEL.BOAT = 1200;

  // ---- 乗り物の種類と見た目（生き物の一覧に入れる）----
  function box(x, y, z, w, h, d, c, sw) { return { o: [x, y, z], s: [w, h, d], c: [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)], sw: sw || null }; }
  TYPES.BOAT = { name: 'ボート', w: 1.375, h: 0.5625, hp: 4, speed: 0, food: [], drops: [['BOAT', 1, 1]], vehicle: true, noFall: true, seat: 0.25 };
  TYPES.MINECART = { name: 'トロッコ', w: 0.98, h: 0.7, hp: 6, speed: 0, food: [], drops: [['MINECART', 1, 1]], vehicle: true, noFall: true, seat: 0.3 };
  var PL = '#a5824f', PD = '#7a5a35';
  MODELS.BOAT = [box(-7, 0, -11, 14, 2, 22, PL), box(-7, 2, -11, 1.5, 6, 22, PD), box(5.5, 2, -11, 1.5, 6, 22, PD), box(-5.5, 2, 9.5, 11, 6, 1.5, PD), box(-5.5, 2, -11, 11, 5, 1.5, PD),
    box(-5.5, 4, -2, 11, 1, 3, PL), box(-9.5, 5, -4, 1, 1, 9, '#5e4428'), box(8.5, 5, -4, 1, 1, 9, '#5e4428'), box(-10, 4.5, 4, 1.5, 2.5, 3, '#5e4428'), box(8.5, 4.5, 4, 1.5, 2.5, 3, '#5e4428')];
  MODELS.MINECART = [box(-8, 1.5, -10, 16, 1, 20, '#5a5a60'), box(-8, 2.5, -10, 1, 8, 20, '#8a8a92'), box(7, 2.5, -10, 1, 8, 20, '#8a8a92'), box(-7, 2.5, -10, 14, 8, 1, '#7a7a82'), box(-7, 2.5, 9, 14, 8, 1, '#7a7a82'),
    box(-8.6, 0, -7, 1, 3, 3, '#2a2a2e'), box(7.6, 0, -7, 1, 3, 3, '#2a2a2e'), box(-8.6, 0, 4, 1, 3, 3, '#2a2a2e'), box(7.6, 0, 4, 1, 3, 3, '#2a2a2e'),
    box(-7.2, 10.5, -10.2, 14.4, 0.6, 20.4, '#a8a8b0')];

  // ---- レール ----
  var DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  function isRail(id) { return !!WG.railInfo(id); }
  function railAt(wd, x, y, z) { return isRail(wd.block(x, y, z)); }
  // つながっている先のレール（同じ高さか、1 つ上・下）
  function linked(wd, x, y, z, d) { var nx = x + d[0], nz = z + d[1]; return railAt(wd, nx, y, nz) || railAt(wd, nx, y + 1, nz) || railAt(wd, nx, y - 1, nz); }
  // 置く場所のまわりから、レールの形を決める（powered はまっすぐと坂だけ）
  function shapeFor(wd, x, y, z, powered, facing) {
    var up = null, links = [];
    ['N', 'E', 'S', 'W'].forEach(function (k) {
      var d = DIRS[k];
      if (railAt(wd, x + d[0], y + 1, z + d[1])) up = up || k;
      if (railAt(wd, x + d[0], y, z + d[1]) || railAt(wd, x + d[0], y - 1, z + d[1])) links.push(k);
    });
    if (up) return 'U' + up;
    var has = function (k) { return links.indexOf(k) >= 0; };
    if ((has('N') || has('S')) && !(has('E') || has('W'))) return 'NS';
    if ((has('E') || has('W')) && !(has('N') || has('S'))) return 'EW';
    if (links.length >= 2 && !powered) {
      var ns = has('N') ? 'N' : 'S', ew = has('E') ? 'E' : 'W';
      if (!(has('N') && has('S')) && !(has('E') && has('W'))) return ns + ew;
    }
    if (links.length) return links[0] === 'N' || links[0] === 'S' ? 'NS' : 'EW';
    return facing === 'N' || facing === 'S' ? 'NS' : 'EW';
  }
  function setRail(wd, x, y, z, base, shape) {
    if (base !== 'RAIL' && !/^(NS|EW|U.)$/.test(shape)) shape = shape[0] === 'N' || shape[0] === 'S' ? 'NS' : 'EW';   // パワード・ディテクター・アクティベーターはまっすぐと坂だけ
    wd.setBlock(x, y, z, B[base + '_' + shape]);
  }
  // 1 方向にしかつながっていない隣のレールを、新しいレールへ向け直す
  function relinkNeighbors(game, x, y, z) {
    var wd = game.world;
    ['N', 'E', 'S', 'W'].forEach(function (k) {
      var d = DIRS[k];
      [0, -1, 1].forEach(function (dy) {
        var nx = x + d[0], ny = y + dy, nz = z + d[1], id = wd.block(nx, ny, nz), ri = WG.railInfo(id);
        if (!ri) return;
        var n = ri.exits.filter(function (e) { return linked(wd, nx, ny, nz, e); }).length;
        if (n >= 2) return;
        var rb = ri.kind || (ri.powered ? 'POWERED_RAIL' : 'RAIL');
        setRail(wd, nx, ny, nz, rb, shapeFor(wd, nx, ny, nz, rb !== 'RAIL', k));
        game.walker.remesh(nx, nz);
      });
    });
  }

  // ---- 置く：レール・乗り物 ----
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), it = held && ITEMS[held.key], wd = this.world, surv = this.mode === 'survival';
    if (t && it && it.rail) {
      var x = t.px, y = t.py, z = t.pz;
      if (wd.block(x, y, z) !== B.AIR || WG.COLLIDE[wd.block(x, y - 1, z)] < 1) return;
      setRail(wd, x, y, z, it.rail, shapeFor(wd, x, y, z, it.rail !== 'RAIL', this.facing()));
      relinkNeighbors(this, x, y, z);
      w.remesh(x, z);
      if (surv) this.inv.take(this.inv.sel, 1);
      return;
    }
    if (t && it && it.vehicle) {
      var onRail = isRail(t.id), water = WG.isWater(t.id) || WG.isWater(wd.block(t.px, t.py, t.pz));
      if (it.vehicle === 'MINECART' && !onRail) return;
      var vx = onRail ? t.x : t.px, vy = onRail ? t.y : t.py, vz = onRail ? t.z : t.pz;
      if (it.vehicle === 'BOAT' && water) { vx = t.x; vz = t.z; vy = t.y + 0.7; }
      var m = this.mobs.spawn(it.vehicle, vx + 0.5, vy, vz + 0.5);
      m.yaw = m.pyaw = w.yaw + Math.PI;
      if (surv) this.inv.take(this.inv.sel, 1);
      return;
    }
    return place.apply(this, arguments);
  };

  // ---- 使う：乗る・鞍・リード・名札 ----
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var mt = this.mobs.target && this.mobs.target.mob, held = this.inv.held(), it = held && ITEMS[held.key], surv = this.mode === 'survival', w = this.walker, t = w.target, self = this;
    var done = function () { self.mouseR = self.clickR = false; };
    if (this.spectator) return use.apply(this, arguments);
    // 柵にリードを結ぶ
    if (t && WG.blockKind(t.id) === 'fence' && !mt) {
      var tied = 0;
      this.mobs.list.forEach(function (m) { if (m.leash === 'player') { m.leash = [t.x, t.y, t.z]; tied++; } });
      if (tied) { done(); return; }
    }
    if (mt && !mt.dead) {
      var T = TYPES[mt.type];
      if (it && it.key === 'NAME_TAG' && !T.vehicle) {
        done();
        this.ui.prompt && this.ui.prompt('名札に書く名前', function (name) {
          if (!name) return;
          mt.name = name.slice(0, 24);
          if (surv) self.inv.take(self.inv.sel, 1);
        });
        return;
      }
      if (mt.leash) { mt.leash = null; this.spawnItem('LEAD', 1, mt.x, mt.y + 0.5, mt.z, 0.1, 10); done(); return; }
      if (it && it.key === 'LEAD' && !T.hostile && !T.vehicle) { mt.leash = 'player'; if (surv) this.inv.take(this.inv.sel, 1); done(); return; }
      if (it && it.key === 'SADDLE' && mt.type === 'PIG' && !mt.saddled && !mt.baby) { mt.saddled = true; if (surv) this.inv.take(this.inv.sel, 1); done(); return; }
      var food = it && T.breed && T.breed.indexOf(it.key) >= 0;
      if ((T.vehicle || (mt.saddled && !food) || (T.rideable && mt.tame && !food)) && !this.riding) { this.mount(mt); done(); return; }
    }
    return use.apply(this, arguments);
  };
  Game.prototype.mount = function (m) {
    this.riding = m; m.rider = true;
    var w = this.walker; w.flying = false; w.vel = [0, 0, 0];
    this.lastRideYaw = m.yaw;
  };
  Game.prototype.dismount = function () {
    var m = this.riding, w = this.walker, wd = this.world;
    if (!m) return;
    this.riding = null; m.rider = false;
    // 横の空いている所へ降りる（なければ上）
    var side = [[1, 0], [-1, 0], [0, 1], [0, -1]], at = [m.x, m.y + TYPES[m.type].h + 0.1, m.z];
    for (var i = 0; i < 4; i++) {
      var x = Math.floor(m.x + side[i][0] * 1.2), z = Math.floor(m.z + side[i][1] * 1.2), y = Math.floor(m.y + 0.3);
      if (!WG.COLLIDE[wd.block(x, y, z)] && !WG.COLLIDE[wd.block(x, y + 1, z)]) { at = [x + 0.5, y, z + 0.5]; break; }
    }
    w.pos = at; w.prev = at.slice(); w.vel = [0, 0, 0]; w.fallDist = 0;
  };
  // 乗っている間：体を席に置き、操作を乗り物に渡す
  var rideTick = Game.prototype.rideTick;
  Game.prototype.rideTick = function (w, shift) {
    var m = this.riding;
    if (!m) return rideTick ? rideTick.call(this, w, shift) : false;
    if (m.dead || this.dead || this.spectator) { this.dismount(); return false; }
    if (shift) { this.dismount(); return false; }
    var k = w.keys;
    m.ctrl = { f: (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0), s: (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0), yaw: w.yaw };
    // ボートの向きが変わったら、視点も一緒に回す
    if (m.type === 'BOAT') { w.yaw += m.yaw - (this.lastRideYaw == null ? m.yaw : this.lastRideYaw); this.lastRideYaw = m.yaw; }
    var T = TYPES[m.type], seat = T.seat != null ? T.seat : T.h * 0.75;
    w.pos = [m.x, m.y + seat * (m.baby ? 0.5 : 1), m.z]; w.vel = [0, 0, 0]; w.fallDist = 0; w.onGround = false;
    return true;
  };

  // ---- 乗り物と、つながれた生き物の動き ----
  var special = Mobs.prototype.special;
  Mobs.prototype.special = function (m, T, dist, dx, dy, dz) {
    var g = this.game, w = g.walker;
    if (T.vehicle) { if (m.type === 'MINECART') this.cartTick(m); else this.boatTick(m); return 'done'; }
    // リード：主人か柵の結び目へ引っぱる
    if (m.leash) {
      var to = m.leash === 'player' ? [w.pos[0], w.pos[2]] : [m.leash[0] + 0.5, m.leash[2] + 0.5];
      var ld = Math.hypot(to[0] - m.x, to[1] - m.z);
      if (m.leash !== 'player' && !(WG.blockKind(this.world.block(m.leash[0], m.leash[1], m.leash[2])) === 'fence')) ld = 99;
      if (ld > 10) { m.leash = null; g.spawnItem('LEAD', 1, m.x, m.y + 0.5, m.z, 0.1, 10); return null; }
      if (ld > 6) { m.vx += (to[0] - m.x) / ld * 0.08; m.vz += (to[1] - m.z) / ld * 0.08; }
      if (ld > 3) return { want: to, speed: T.speed * 1.5, chase: true };
    }
    // 鞍を付けた豚：乗っている人がニンジン付きの棒を持つと、見ている向きへ進む
    if (m.rider && g.riding === m && T.vehicle !== true) {
      var held = g.inv.held();
      if (held && held.key === 'CARROT_ON_A_STICK') {
        var fx = -Math.sin(w.yaw), fz = -Math.cos(w.yaw);
        if (m.age % 200 === 0 && g.mode === 'survival') g.wearItem && g.wearItem(g.inv.sel, 1);
        return { want: [m.x + fx * 3, m.z + fz * 3], speed: 0.13, chase: true };
      }
      if (T.rideable && m.ctrl && m.ctrl.f) {
        var hx = -Math.sin(w.yaw) * m.ctrl.f, hz = -Math.cos(w.yaw) * m.ctrl.f;
        return { want: [m.x + hx * 3, m.z + hz * 3], speed: T.rideSpeed || 0.2, chase: true };
      }
      if (T.rideable) return 'done';
    }
    return special.apply(this, arguments);
  };
  // レールの上のトロッコは、自分で動かす（重さ・坂・パワードレール）
  var physics = Mobs.prototype.physics;
  Mobs.prototype.physics = function (m, T) {
    if (m.type === 'MINECART' && m.railing) return;
    if (m.type === 'BOAT') return this.boatPhysics(m, T);
    return physics.apply(this, arguments);
  };
  function cellRail(wd, x, y, z) {
    for (var dy = 0; dy >= -1; dy--) { var id = wd.block(x, y + dy, z), ri = WG.railInfo(id); if (ri) return { y: y + dy, info: ri, id: id }; }
    return null;
  }
  Mobs.prototype.cartTick = function (m) {
    var wd = this.world, g = this.game, cx = Math.floor(m.x), cz = Math.floor(m.z);
    var r = cellRail(wd, cx, m.ry != null && m.railing ? m.ry : Math.floor(m.y + 0.1), cz) || cellRail(wd, cx, Math.floor(m.y + 0.5), cz);
    if (!r) { if (m.railing) { m.railing = false; m.vx = (m.rdir || [0, 0])[0] * (m.rv || 0); m.vz = (m.rdir || [0, 0])[1] * (m.rv || 0); } return; }
    if (!m.railing) {
      // レールに乗った：向きを今の動きに近い出口に
      var ex = r.info.exits, mv = [m.vx, m.vz];
      m.rdir = (ex[0][0] * mv[0] + ex[0][1] * mv[1]) >= (ex[1][0] * mv[0] + ex[1][1] * mv[1]) ? ex[0].slice() : ex[1].slice();
      m.rv = Math.hypot(m.vx, m.vz); m.railing = true; m.ry = r.y; m.rcell = cx + ',' + cz; m.pending = null;
      m.vx = m.vy = m.vz = 0;
    }
    var info = r.info, rv = m.rv || 0, d = m.rdir;
    // 坂：上りは遅く、下りは速く
    if (info.up) { var u = DIRS[info.up]; rv += (u[0] === d[0] && u[1] === d[1]) ? -0.0078 : 0.0078; }
    // ディテクターレール：トロッコが乗っている間（と 1 秒後まで）動力を出す。アクティベーターレール：動力があれば乗っている人を降ろす
    if (info.kind === 'DETECTOR_RAIL') {
      var dk = cx + ',' + r.y + ',' + cz, dm = wd.detect || (wd.detect = new Map());
      if (!dm.has(dk) && g.rs) { g.rs.dirty.push([cx, r.y, cz]); g.rs.dirty.push([cx, r.y - 1, cz]); }
      dm.set(dk, 20);
    }
    if (info.kind === 'ACTIVATOR_RAIL' && g.rs && g.rs.powered(cx, r.y, cz) && m.rider && g.riding === m) g.dismount();
    // パワードレール：動力があれば加速（止まっていれば押し出す）、なければブレーキ
    if (info.powered) {
      if (g.rs && g.rs.powered(cx, r.y, cz)) {
        if (rv < 0.02) {
          var back = [-d[0], -d[1]];
          if (WG.COLLIDE[wd.block(cx + d[0], r.y, cz + d[1])] >= 1 && !WG.COLLIDE[wd.block(cx + back[0], r.y, cz + back[1])]) { m.rdir = d = back; }
          rv = Math.max(rv, 0.1);
        }
        rv += 0.06;
      } else { rv *= 0.5; if (rv < 0.003) rv = 0; }
    }
    // 乗っている人が W で押す
    if (m.rider && m.ctrl && m.ctrl.f) {
      var lx = -Math.sin(m.ctrl.yaw), lz = -Math.cos(m.ctrl.yaw), dot = lx * d[0] + lz * d[1];
      rv += (dot >= 0 ? 1 : -1) * m.ctrl.f * 0.006;
    }
    rv *= m.rider ? 0.997 : 0.985;
    if (rv < 0) { rv = -rv; m.rdir = d = [-d[0], -d[1]]; m.pending = null; }
    rv = Math.min(0.4, rv);
    // 進む（細かく分けて、ブロックの境目と中心で向きを決める）
    var steps = Math.max(1, Math.ceil(rv / 0.1)), st = rv / steps;
    for (var i = 0; i < steps && rv > 0; i++) {
      var ox = m.x, oz = m.z;
      m.x += d[0] * st; m.z += d[1] * st;
      // 曲がり角：中心を越えたら向きを変える
      if (m.pending) {
        var fx = ox - Math.floor(ox), fz = oz - Math.floor(oz), nfx = m.x - Math.floor(ox), nfz = m.z - Math.floor(oz);
        if ((d[0] && (fx - 0.5) * (nfx - 0.5) <= 0) || (d[1] && (fz - 0.5) * (nfz - 0.5) <= 0)) {
          m.x = Math.floor(ox) + 0.5; m.z = Math.floor(oz) + 0.5; m.rdir = d = m.pending; m.pending = null;
        }
      }
      var ncx = Math.floor(m.x), ncz = Math.floor(m.z), key = ncx + ',' + ncz;
      if (key !== m.rcell) {
        // 次のマスのレール（同じ高さ、1 つ上、1 つ下）
        var nr = null, tryY = [m.ry, m.ry + 1, m.ry - 1];
        for (var q = 0; q < 3 && !nr; q++) { var id = wd.block(ncx, tryY[q], ncz), ri = WG.railInfo(id); if (ri) nr = { y: tryY[q], info: ri }; }
        if (!nr) {
          if (WG.COLLIDE[wd.block(ncx, m.ry, ncz)] >= 1) { m.x = ox; m.z = oz; rv = 0; break; }   // 壁に当たって止まる
          m.railing = false; m.vx = d[0] * rv; m.vz = d[1] * rv; m.vy = 0; m.rv = 0; return;    // レールの終わりから飛び出す
        }
        m.rcell = key; m.ry = nr.y;
        var entry = [-d[0], -d[1]], ex2 = nr.info.exits;
        var hit = ex2[0][0] === entry[0] && ex2[0][1] === entry[1] ? 1 : ex2[1][0] === entry[0] && ex2[1][1] === entry[1] ? 0 : -1;
        if (hit >= 0) { var out = ex2[hit]; if (out[0] !== d[0] || out[1] !== d[1]) m.pending = out.slice(); }
        else { var best = (ex2[0][0] * d[0] + ex2[0][1] * d[1]) >= (ex2[1][0] * d[0] + ex2[1][1] * d[1]) ? ex2[0] : ex2[1]; m.rdir = d = best.slice(); }
        info = nr.info;
      }
      // まっすぐの間は、横の位置をレールの中心にそろえる
      if (!m.pending) { if (d[0]) m.z = Math.floor(m.z) + 0.5; else m.x = Math.floor(m.x) + 0.5; }
    }
    m.rv = rv;
    // 高さ：坂の上では上る向きへの進み具合
    var cur = WG.railInfo(wd.block(Math.floor(m.x), m.ry, Math.floor(m.z))), fr = 0;
    if (cur && cur.up) {
      var fxx = m.x - Math.floor(m.x), fzz = m.z - Math.floor(m.z);
      fr = cur.up === 'N' ? 1 - fzz : cur.up === 'S' ? fzz : cur.up === 'E' ? fxx : 1 - fxx;
    }
    m.y = m.ry + fr + 1 / 16;
    if (rv > 0.01) m.yaw = Math.atan2(d[0], d[1]);
    m.walk += rv;
  };
  // ボート：水面に浮かぶ。乗っている人の W・A・D で進む・曲がる
  Mobs.prototype.boatTick = function (m) {
    var c = m.rider && m.ctrl;
    var water = WG.isWater(this.world.block(Math.floor(m.x), Math.floor(m.y + 0.1), Math.floor(m.z))) || WG.isWater(this.world.block(Math.floor(m.x), Math.floor(m.y - 0.2), Math.floor(m.z)));
    if (c) {
      m.yaw -= c.s * 0.06;
      var a = (water ? 0.04 : 0.006) * c.f;
      m.vx += Math.sin(m.yaw) * a; m.vz += Math.cos(m.yaw) * a;
    }
  };
  Mobs.prototype.boatPhysics = function (m, T) {
    var w = this.game.walker, wd = this.world;
    var inW = WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y + 0.2), Math.floor(m.z)));
    var onW = !inW && WG.isWater(wd.block(Math.floor(m.x), Math.floor(m.y - 0.1), Math.floor(m.z)));
    if (inW) { m.vy = Math.min(0.12, m.vy + 0.05); m.vy *= 0.85; } else if (onW) { m.vy = Math.max(m.vy * 0.5, -0.02); } else m.vy -= 0.06;
    var hw = T.w / 2, b = [m.x - hw, m.y, m.z - hw, m.x + hw, m.y + T.h, m.z + hw], ry = m.vy, rx = m.vx, rz = m.vz;
    var dy = w.clip(b, 1, m.vy); b[1] += dy; b[4] += dy;
    var dx = w.clip(b, 0, m.vx); b[0] += dx; b[3] += dx;
    var dz = w.clip(b, 2, m.vz); b[2] += dz; b[5] += dz;
    m.ground = ry < 0 && Math.abs(dy - ry) > 1e-9;
    if (Math.abs(dy - ry) > 1e-9) m.vy = 0;
    if (Math.abs(dx - rx) > 1e-9) m.vx = 0;
    if (Math.abs(dz - rz) > 1e-9) m.vz = 0;
    m.x = (b[0] + b[3]) / 2; m.y = b[1]; m.z = (b[2] + b[5]) / 2;
    var f = inW || onW ? 0.94 : m.ground ? 0.5 : 0.95;
    m.vx *= f; m.vz *= f;
    var sp = Math.hypot(m.vx, m.vz);
    if (sp > 0.4) { m.vx *= 0.4 / sp; m.vz *= 0.4 / sp; }
  };
  // 乗り物は怒らず、逃げない（叩くと壊れる）
  var hurt = Mobs.prototype.hurt;
  Mobs.prototype.hurt = function (m) {
    var r = hurt.apply(this, arguments);
    if (TYPES[m.type].vehicle) { m.ai.panic = 0; m.angry = false; }
    return r;
  };

  // ---- 描く：リードの綱と結び目、名前 ----
  var drawExtra = Game.prototype.drawExtra;
  Game.prototype.drawExtra = function (solid, a, cube) {
    drawExtra.call(this, solid, a, cube);
    var w = this.walker, self = this;
    this.mobs.list.forEach(function (m) {
      if (!m.leash || m.dead) return;
      var mx = m.px + (m.x - m.px) * a, my = m.py + (m.y - m.py) * a + TYPES[m.type].h * 0.75 * (m.baby ? 0.5 : 1), mz = m.pz + (m.z - m.pz) * a, to;
      if (m.leash === 'player') {
        if (!w.eye) return;
        var sy = Math.sin(w.yaw), cy = Math.cos(w.yaw);
        to = [w.eye[0] + cy * 0.3 - sy * 0.4, w.eye[1] - 0.5, w.eye[2] - sy * 0.3 - cy * 0.4];
      } else {
        to = [m.leash[0] + 0.5, m.leash[1] + 0.6, m.leash[2] + 0.5];
        cube(solid, to[0], to[1] - 0.1, to[2], 0.22, 0, function () { return 0; }, function () { return [150, 112, 70]; }, w.lightLevels(to[0], to[1], to[2]));
      }
      var lt = w.lightLevels(mx, my, mz), n = 20, len = Math.hypot(to[0] - mx, to[1] - my, to[2] - mz);
      for (var i = 1; i < n; i++) {
        var f = i / n, sag = Math.sin(f * Math.PI) * Math.min(0.6, len * 0.08);
        cube(solid, mx + (to[0] - mx) * f, my + (to[1] - my) * f - sag, mz + (to[2] - mz) * f, 0.05, 0, function () { return 0; }, function () { return [120, 88, 52]; }, lt);
      }
    });
    void self;
  };
  // 名前の札（画面の上に重ねる文字。名前のある生き物だけ）
  var labels = [];
  Game.prototype.drawLabels = function (a) {
    var view = this.view, box = this.ui.labels;
    if (!box || !view.vp || !view.canvas) return;
    var vp = view.vp, W = view.canvas.clientWidth, H = view.canvas.clientHeight, n = 0, w = this.walker;
    this.mobs.list.forEach(function (m) {
      if (!m.name || m.dead) return;
      var x = m.px + (m.x - m.px) * a, y = m.py + (m.y - m.py) * a + TYPES[m.type].h * (m.size || 1) * (m.baby ? 0.5 : 1) + 0.45, z = m.pz + (m.z - m.pz) * a;
      if (Math.hypot(x - w.pos[0], z - w.pos[2]) > 24) return;
      var cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
      if (cw <= 0.1) return;
      var sx = (vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw, sy = (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / cw;
      if (Math.abs(sx) > 1.1 || Math.abs(sy) > 1.1) return;
      var el = labels[n] || (labels[n] = box.appendChild(document.createElement('div')));
      el.textContent = m.name; el.style.display = '';
      el.style.transform = 'translate(' + Math.round((sx * 0.5 + 0.5) * W) + 'px,' + Math.round((0.5 - sy * 0.5) * H) + 'px) translate(-50%,-100%)';
      n++;
    });
    for (var i = n; i < labels.length; i++) labels[i].style.display = 'none';
  };
  var draw = Game.prototype.draw;
  Game.prototype.draw = function (a) { draw.call(this, a); if (typeof document !== 'undefined') this.drawLabels(a); };
  var stop = Game.prototype.stop;
  Game.prototype.stop = function () { if (this.riding) this.dismount(); labels.forEach(function (el) { el.style.display = 'none'; }); return stop.apply(this, arguments); };
})(typeof window !== 'undefined' ? window : globalThis);
