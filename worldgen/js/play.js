// 遊ぶ：ブロックを壊す・置く、ドロップ、インベントリ、サバイバルとクリエイティブ（パソコン版のみ）。
// 操作は Minecraft の初期設定と同じ：
//   左クリック 壊す（サバイバルは押し続ける）、右クリック 置く、中クリック 見ているブロックを持つ、
//   1〜9・ホイール 持ち替え、E インベントリ、Q 捨てる（Ctrl＋Q でまとめて）、
//   クリエイティブではスペースの 2 度押しで飛ぶ。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS;

  var SOLID = new Uint8Array(WG.BLOCKS.length);
  WG.BLOCKS.forEach(function (b) { SOLID[b.id] = b.kind === 'solid' ? 1 : 0; });
  function isPlant(id) { return WG.blockKind(id) === 'plant'; }
  function replaceable(id) { return id === B.AIR || id === B.WATER || id === B.LAVA || isPlant(id); }

  var MAX_HEALTH = 20, MAX_AIR = 300;

  function Game(view, world, ui) {
    var self = this;
    this.view = view; this.world = world; this.ui = ui;
    this.inv = new WG.Inventory();
    this.mode = 'survival';
    this.health = MAX_HEALTH; this.air = MAX_AIR; this.invuln = 0; this.regen = 0; this.dead = false;
    this.entities = []; this.particles = [];
    this.breaking = null; this.breakDelay = 0; this.placeDelay = 0;
    this.mouseL = false; this.mouseR = false;
    this.invOpen = false; this.cursor = null;
    this.hudKey = ''; this.nameTimer = 0;
    this.walker = new WG.Walker(view, world, {
      active: function () { return !self.dead && (ui.locked() || self.invOpen); },
      status: ui.status,
      tick: function () { self.tick(); },
      land: function (d) { self.land(d); },
      voidDamage: function () { return self.mode === 'survival'; },
      draw: function (w, a) { self.draw(a); }
    });
  }

  Game.prototype.start = function (x, z) {
    this.walker.start(x, z);
    this.setMode(this.mode);
  };
  Game.prototype.stop = function () {
    this.walker.stop();
    this.view.dynamic = null;
    this.ui.hud.classList.add('hide');
    this.ui.inv.classList.add('hide');
    this.ui.dead.classList.add('hide');
  };

  Game.prototype.setMode = function (m) {
    this.mode = m;
    var w = this.walker;
    w.canFly = m === 'creative';
    w.reach = m === 'creative' ? 5 : 4.5;
    if (m !== 'creative') w.flying = false;
    if (m === 'creative') { this.health = MAX_HEALTH; this.air = MAX_AIR; }
    this.breaking = null;
    this.hudKey = '';
    if (this.invOpen) this.renderInventory();
  };

  // ---------------- 1 刻みごと ----------------
  Game.prototype.tick = function () {
    var w = this.walker, surv = this.mode === 'survival';
    if (this.invuln > 0) this.invuln--;

    // 体力：溶岩、奈落、おぼれる、自然に回復（空腹はない）
    if (surv) {
      if (w.fluid() === 'lava') this.damage(4);
      if (w.pos[1] < this.world.minY - 64) this.damage(4);
      var e = w.eye || w.pos, eyeId = this.world.block(Math.floor(e[0]), Math.floor(e[1]), Math.floor(e[2]));
      if (eyeId === B.WATER) {
        this.air--;
        if (this.air <= -20) { this.air = 0; this.damage(2, true); }
      } else this.air = Math.min(MAX_AIR, this.air + 4);
      if (this.health < MAX_HEALTH && !this.dead && ++this.regen >= 40) { this.health++; this.regen = 0; }
    }

    // 壊す
    if (this.breakDelay > 0) this.breakDelay--;
    var t = w.target;
    if (this.mouseL && t && !this.invOpen && this.breakDelay === 0) {
      if (!surv) { this.breakBlock(t.x, t.y, t.z); this.breakDelay = 5; this.breaking = null; }
      else {
        var it = ITEMS[WG.BLOCKS[t.id].key], h = it ? it.hardness : 1;
        if (h >= 0) {
          var b = this.breaking;
          if (!b || b.x !== t.x || b.y !== t.y || b.z !== t.z) b = this.breaking = { x: t.x, y: t.y, z: t.z, p: 0 };
          b.p += h === 0 ? 1 : 1 / (h * 1.5 * 20);
          if (b.p >= 1) { this.breakBlock(t.x, t.y, t.z); this.breaking = null; this.breakDelay = 5; }
        } else this.breaking = null;
      }
    } else if (!this.mouseL || !t) this.breaking = null;

    // 置く（押し続けると 4 刻みごと）
    if (this.placeDelay > 0) this.placeDelay--;
    if (this.mouseR && this.placeDelay === 0 && !this.invOpen) { this.place(); this.placeDelay = 4; }

    this.tickEntities();
  };

  Game.prototype.damage = function (n, ignoreInvuln) {
    if (this.mode !== 'survival' || this.dead || (this.invuln > 0 && !ignoreInvuln)) return;
    this.health = Math.max(0, this.health - n);
    this.invuln = 10; this.regen = 0;
    this.ui.hurt();
    if (this.health <= 0) this.die();
  };

  Game.prototype.land = function (fall) {
    var d = Math.ceil(fall - 3);
    if (d > 0) this.damage(d, true);
  };

  Game.prototype.die = function () {
    var w = this.walker, s = this.inv.slots;
    this.dead = true;
    this.mouseL = this.mouseR = false;
    for (var i = 0; i < s.length; i++) if (s[i]) this.spawnItem(s[i].key, s[i].n, w.pos[0], w.pos[1] + 0.5, w.pos[2], 0.25, 40);
    this.inv.clear();
    this.closeInventory(true);
    this.ui.dead.classList.remove('hide');
    this.ui.unlock();
  };

  Game.prototype.respawn = function () {
    var w = this.walker;
    this.dead = false; this.health = MAX_HEALTH; this.air = MAX_AIR; this.invuln = 0;
    w.pos = w.spawnPoint.slice(); w.prev = w.pos.slice(); w.vel = [0, 0, 0]; w.fallDist = 0; w.flying = false;
    this.ui.dead.classList.add('hide');
    this.ui.lock();
  };

  // ---------------- 壊す・置く ----------------
  Game.prototype.breakBlock = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z), surv = this.mode === 'survival';
    if (id === B.AIR || id === B.WATER || id === B.LAVA) return;
    wd.setBlock(x, y, z, B.AIR);
    this.burst(x, y, z, id);
    if (surv) this.dropFor(id, x, y, z);
    // 上に草花があれば一緒に取れる
    var up = wd.block(x, y + 1, z);
    if (isPlant(up)) { wd.setBlock(x, y + 1, z, B.AIR); if (surv) this.dropFor(up, x, y + 1, z); }
    this.walker.remesh(x, z);
  };

  Game.prototype.dropFor = function (id, x, y, z) {
    var it = ITEMS[WG.BLOCKS[id].key];
    if (!it || !it.drop || Math.random() >= it.dropChance) return;
    var n = it.dropMin + Math.floor(Math.random() * (it.dropMax - it.dropMin + 1));
    this.spawnItem(it.drop, n, x + 0.5, y + 0.25, z + 0.5, 0.1, 10);
  };

  Game.prototype.place = function () {
    var w = this.walker, t = w.target, held = this.inv.held();
    if (!t || !held) return;
    var it = ITEMS[held.key];
    if (!it || it.block < 0) return;
    var x, y, z;
    if (isPlant(t.id)) { x = t.x; y = t.y; z = t.z; } else { x = t.px; y = t.py; z = t.pz; }
    var wd = this.world;
    if (y < wd.minY || y > wd.maxY || !replaceable(wd.block(x, y, z))) return;
    if (isPlant(it.block) && !SOLID[wd.block(x, y - 1, z)]) return;
    if (SOLID[it.block]) {
      // 自分の体と重なる場所には置けない
      var b = w.box();
      if (b[0] < x + 1 && b[3] > x && b[1] < y + 1 && b[4] > y && b[2] < z + 1 && b[5] > z) return;
    }
    wd.setBlock(x, y, z, it.block);
    if (this.mode === 'survival') this.inv.take(this.inv.sel, 1);
    w.remesh(x, z);
  };

  // 見ているブロックを持つ（中クリック）
  Game.prototype.pickBlock = function () {
    var t = this.walker.target;
    if (!t) return;
    var key = WG.BLOCKS[t.id].key, s = this.inv.slots, i;
    if (!ITEMS[key]) return;
    for (i = 0; i < 9; i++) if (s[i] && s[i].key === key) { this.inv.sel = i; this.inv.changed(); return; }
    if (this.mode === 'creative') {
      var slot = this.inv.sel;
      if (s[slot]) for (i = 0; i < 9; i++) if (!s[i]) { slot = i; break; }
      s[slot] = { key: key, n: ITEMS[key].max }; this.inv.sel = slot; this.inv.changed();
    } else {
      for (i = 9; i < 36; i++) if (s[i] && s[i].key === key) {
        var tmp = s[this.inv.sel]; s[this.inv.sel] = s[i]; s[i] = tmp; this.inv.changed(); return;
      }
    }
  };

  // 持っているものを捨てる（Q、Ctrl＋Q でまとめて）
  Game.prototype.dropHeld = function (all) {
    var w = this.walker, held = this.inv.held();
    if (!held || !w.eye) return;
    var s = this.inv.take(this.inv.sel, all ? held.n : 1), d = w.dir;
    var e = this.spawnItem(s.key, s.n, w.eye[0], w.eye[1] - 0.3, w.eye[2], 0, 40);
    e.vx = d[0] * 0.3; e.vy = d[1] * 0.3 + 0.1; e.vz = d[2] * 0.3;
  };

  // ---------------- 落ちているアイテムと粒 ----------------
  Game.prototype.spawnItem = function (key, n, x, y, z, spread, delay) {
    var e = {
      key: key, n: n, x: x, y: y, z: z, px: x, py: y, pz: z,
      vx: (Math.random() - 0.5) * spread, vy: 0.2 * (spread > 0 ? 1 : 0), vz: (Math.random() - 0.5) * spread,
      age: Math.floor(Math.random() * 100), delay: delay, ground: false
    };
    this.entities.push(e);
    if (this.entities.length > 400) this.entities.shift();
    return e;
  };

  Game.prototype.burst = function (x, y, z, id) {
    var c = WG.blockColor(id, 'side', WG.BI ? WG.BI.PLAINS : -1);
    for (var i = 0; i < 14; i++) {
      this.particles.push({
        x: x + 0.15 + Math.random() * 0.7, y: y + 0.15 + Math.random() * 0.7, z: z + 0.15 + Math.random() * 0.7,
        vx: (Math.random() - 0.5) * 0.15, vy: Math.random() * 0.15, vz: (Math.random() - 0.5) * 0.15,
        life: 8 + Math.floor(Math.random() * 12), c: c, id: id
      });
    }
    if (this.particles.length > 300) this.particles.splice(0, this.particles.length - 300);
  };

  Game.prototype.tickEntities = function () {
    var w = this.walker, wd = this.world, pb = w.box(), keep = [], i, e;
    for (i = 0; i < this.entities.length; i++) {
      e = this.entities[i];
      e.px = e.x; e.py = e.y; e.pz = e.z; e.age++;
      var inWater = wd.block(Math.floor(e.x), Math.floor(e.y + 0.1), Math.floor(e.z)) === B.WATER;
      if (inWater) e.vy = Math.min(e.vy + 0.02, 0.06); else e.vy -= 0.04;
      var b = [e.x - 0.125, e.y, e.z - 0.125, e.x + 0.125, e.y + 0.25, e.z + 0.125];
      var dy = w.clip(b, 1, e.vy); b[1] += dy; b[4] += dy;
      var dx = w.clip(b, 0, e.vx); b[0] += dx; b[3] += dx;
      var dz = w.clip(b, 2, e.vz); b[2] += dz; b[5] += dz;
      e.ground = dy !== e.vy && e.vy < 0;
      if (dy !== e.vy) e.vy = 0;
      if (dx !== e.vx) e.vx = 0;
      if (dz !== e.vz) e.vz = 0;
      e.x = (b[0] + b[3]) / 2; e.y = b[1]; e.z = (b[2] + b[5]) / 2;
      var f = e.ground ? 0.6 * 0.98 : 0.98;
      e.vx *= f; e.vz *= f; e.vy *= 0.98;
      if (e.delay > 0) e.delay--;
      // 拾う（体の周り 1 ブロック、上下 0.5 ブロックの範囲）
      if (!this.dead && e.delay === 0 && e.x > pb[0] - 1 && e.x < pb[3] + 1 && e.y + 0.25 > pb[1] - 0.5 && e.y < pb[4] + 0.5 && e.z > pb[2] - 1 && e.z < pb[5] + 1) {
        e.n -= this.inv.add(e.key, e.n);
      }
      if (e.n > 0 && e.age < 6000 && e.y > wd.minY - 64) keep.push(e);
    }
    this.entities = keep;
    keep = [];
    for (i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      p.vy -= 0.04; p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vx *= 0.98; p.vz *= 0.98;
      if (this.walker.solid(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))) { p.y -= p.vy; p.vy = 0; p.vx *= 0.7; p.vz *= 0.7; }
      if (--p.life > 0) keep.push(p);
    }
    this.particles = keep;
  };

  // ---------------- 描く ----------------
  // 立方体の 6 面：[4 隅（0〜1）, 面の明るさ, 面の種類]
  var FACES = [
    [[[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], 1.0, 'top'],
    [[[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]], 0.5, 'bottom'],
    [[[1, 1, 0], [0, 1, 0], [0, 0, 0], [1, 0, 0]], 0.8, 'side'],
    [[[0, 1, 1], [1, 1, 1], [1, 0, 1], [0, 0, 1]], 0.74, 'side'],
    [[[0, 1, 0], [0, 1, 1], [0, 0, 1], [0, 0, 0]], 0.66, 'side'],
    [[[1, 1, 1], [1, 1, 0], [1, 0, 0], [1, 0, 1]], 0.86, 'side']
  ];
  var UV = [[0, 0], [16, 0], [16, 16], [0, 16]], TRI = [0, 1, 2, 0, 2, 3];

  function Batch(alpha) { this.pos = []; this.col = []; this.uv = []; this.alpha = alpha; }
  Batch.prototype.v = function (x, y, z, c, f, u, v, tile) {
    this.pos.push(x * 16, y * 16, z * 16, 0);
    this.col.push(Math.min(255, c[0] * f * 0.5) | 0, Math.min(255, c[1] * f * 0.5) | 0, Math.min(255, c[2] * f * 0.5) | 0, 0);
    this.uv.push(u, v, tile & 255, tile >> 8);
  };
  Batch.prototype.done = function () {
    return { pos: new Float32Array(this.pos), col: new Uint8Array(this.col), uv: new Uint8Array(this.uv), count: this.pos.length / 4, alpha: this.alpha };
  };
  // 回した立方体（中心 cx, cz、底 y、大きさ s、回転 r）
  function cube(bt, cx, y, cz, s, r, tileOf, colorOf) {
    var cr = Math.cos(r), sr = Math.sin(r);
    FACES.forEach(function (F) {
      var tile = tileOf(F[2]), c = colorOf(F[2]);
      TRI.forEach(function (k) {
        var p = F[0][k], lx = (p[0] - 0.5) * s, lz = (p[2] - 0.5) * s;
        bt.v(cx + lx * cr - lz * sr, y + p[1] * s, cz + lx * sr + lz * cr, c, F[1], UV[k][0], UV[k][1], tile);
      });
    });
  }
  // 平らな絵（回しながら見せる）
  function sprite(bt, cx, y, cz, s, r, tile, c) {
    var cr = Math.cos(r) * s / 2, sr = Math.sin(r) * s / 2;
    var P = [[cx - cr, y + s, cz - sr], [cx + cr, y + s, cz + sr], [cx + cr, y, cz + sr], [cx - cr, y, cz - sr]];
    TRI.forEach(function (k) { bt.v(P[k][0], P[k][1], P[k][2], c, 1, UV[k][0], UV[k][1], tile); });
  }

  Game.prototype.draw = function (a) {
    var solid = new Batch(1), crack = new Batch(0.55), plains = WG.BI ? WG.BI.PLAINS : -1, WHITE = [255, 255, 255];
    this.entities.forEach(function (e) {
      var x = e.px + (e.x - e.px) * a, y = e.py + (e.y - e.py) * a, z = e.pz + (e.z - e.pz) * a;
      var t = e.age + a, r = t / 20, bob = Math.sin(t / 10) * 0.1 + 0.1, it = ITEMS[e.key];
      if (it.block >= 0 && !isPlant(it.block)) {
        cube(solid, x, y + bob, z, 0.25, r, function (f) { return WG.atlasTile(it.block, f); }, function (f) {
          return WG.skinTexture(it.block, f) ? WG.tintOf(it.block, f, plains).map(function (m) { return m * 255; }) : WG.blockColor(it.block, f, plains);
        });
      } else {
        var tile = it.block >= 0 ? WG.atlasTile(it.block, 'side') : WG.itemTile(e.key);
        var c = it.block === B.SHORT_GRASS ? WG.blockColor(it.block, 'side', plains) : WHITE;
        sprite(solid, x, y + bob, z, 0.4, r, tile, c);
      }
    });
    this.particles.forEach(function (p) {
      cube(solid, p.x, p.y, p.z, 0.08, 0, function () { return 0; }, function () { return p.c; });
    });
    var b = this.breaking;
    if (b && b.p > 0) {
      var ct = WG.crackTile(Math.floor(b.p * 4));
      cube(crack, b.x + 0.5, b.y - 0.003, b.z + 0.5, 1.006, 0, function () { return ct; }, function () { return WHITE; });
    }
    this.view.dynamic = [solid.done(), crack.done()];
    this.updateHud();
  };

  // ---------------- 画面の表示（ホットバー・体力・空気） ----------------
  var heartURLs = null;
  function pixelIcon(rows, colors) {
    var c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
    var x = c.getContext('2d');
    rows.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (colors[r[i]]) { x.fillStyle = colors[r[i]]; x.fillRect(i, j, 1, 1); } });
    return c.toDataURL();
  }
  function hearts() {
    if (heartURLs) return heartURLs;
    var H = ['.oo.oo.', 'offoffo', 'offfffo', 'offfffo', '.offfo.', '..ofo..', '...o...'];
    var half = H.map(function (r) { return r.split('').map(function (ch, i) { return ch === 'f' && i > 3 ? 'e' : ch === 'f' && i === 3 ? 'f' : ch; }).join(''); });
    var empty = H.map(function (r) { return r.replace(/f/g, 'e'); });
    var col = { o: '#1d1b1b', f: '#b9473f', e: '#3a3434' };
    var bubble = ['..ooo..', '.obbbo.', 'obwbbbo', 'obbbbbo', 'obbbbbo', '.obbbo.', '..ooo..'];
    heartURLs = {
      full: pixelIcon(H, col), half: pixelIcon(half, col), empty: pixelIcon(empty, col),
      bubble: pixelIcon(bubble, { o: '#1d2733', b: '#6f9cc9', w: '#dce8f2' })
    };
    return heartURLs;
  }

  function slotHTML(s) {
    if (!s) return '';
    return '<img src="' + WG.iconURL(s.key) + '" alt="">' + (s.n > 1 ? '<span class="n">' + s.n + '</span>' : '');
  }

  Game.prototype.updateHud = function () {
    var ui = this.ui, surv = this.mode === 'survival', inv = this.inv;
    ui.hud.classList.toggle('hide', this.dead);
    var key = [inv.version, inv.sel, this.mode, surv ? this.health : '', surv && this.air < MAX_AIR ? Math.ceil(Math.max(0, this.air) / 30) : ''].join('|');
    if (key === this.hudKey) return;
    var prevSel = this.hudKey ? +this.hudKey.split('|')[1] : -1, prevVer = this.hudKey ? +this.hudKey.split('|')[0] : -1;
    this.hudKey = key;
    var html = '';
    for (var i = 0; i < 9; i++) html += '<div class="slot' + (i === inv.sel ? ' sel' : '') + '">' + slotHTML(inv.slots[i]) + '</div>';
    ui.hotbar.innerHTML = html;
    var hu = hearts(), h = '';
    if (surv) for (i = 0; i < 10; i++) h += '<img src="' + (this.health >= i * 2 + 2 ? hu.full : this.health === i * 2 + 1 ? hu.half : hu.empty) + '" alt="">';
    ui.hearts.innerHTML = h;
    var bub = '';
    if (surv && this.air < MAX_AIR) for (i = 0; i < Math.ceil(Math.max(0, this.air) / 30); i++) bub += '<img src="' + hu.bubble + '" alt="">';
    ui.air.innerHTML = bub;
    // 持ち替えたら名前を少し見せる
    var held = inv.held();
    if (prevSel !== inv.sel || prevVer !== inv.version) {
      if (held && (prevSel !== inv.sel || !this.lastName || this.lastName !== held.key)) {
        ui.itemName.textContent = WG.itemName(held.key);
        ui.itemName.classList.remove('fade'); void ui.itemName.offsetWidth; ui.itemName.classList.add('fade');
      }
      this.lastName = held ? held.key : null;
    }
    if (this.invOpen) this.renderInventory();
  };

  // ---------------- インベントリの画面 ----------------
  Game.prototype.toggleInventory = function () {
    if (this.dead) return;
    if (this.invOpen) { this.closeInventory(); this.ui.lock(); }
    else this.openInventory();
  };
  Game.prototype.openInventory = function () {
    this.invOpen = true;
    this.mouseL = this.mouseR = false;
    this.ui.inv.classList.remove('hide');
    this.renderInventory();
    this.ui.unlock();
  };
  Game.prototype.closeInventory = function (silent) {
    if (!this.invOpen) return;
    this.invOpen = false;
    // 手に持ったままのものは、サバイバルなら戻す（入らなければ足元に落とす）、クリエイティブなら消す
    if (this.cursor && this.mode === 'survival' && !this.dead) {
      var left = this.cursor.n - this.inv.add(this.cursor.key, this.cursor.n), w = this.walker;
      if (left > 0) this.spawnItem(this.cursor.key, left, w.pos[0], w.pos[1] + 1, w.pos[2], 0.1, 40);
    }
    this.cursor = null;
    this.ui.inv.classList.add('hide');
    this.ui.cursor.classList.add('hide');
    void silent;
  };

  Game.prototype.renderInventory = function () {
    var ui = this.ui, s = this.inv.slots, i, html = '';
    var creative = this.mode === 'creative';
    ui.invTitle.textContent = creative ? 'クリエイティブ' : 'インベントリ';
    if (creative) {
      html += '<div class="grid pal">';
      WG.PLACEABLE.forEach(function (k) { html += '<div class="slot" data-pal="' + k + '" title="' + WG.itemName(k) + '"><img src="' + WG.iconURL(k) + '" alt=""></div>'; });
      html += '</div>';
    } else {
      html += '<div class="grid">';
      for (i = 9; i < 36; i++) html += '<div class="slot" data-i="' + i + '"' + (s[i] ? ' title="' + WG.itemName(s[i].key) + '"' : '') + '>' + slotHTML(s[i]) + '</div>';
      html += '</div>';
    }
    html += '<div class="grid bar">';
    for (i = 0; i < 9; i++) html += '<div class="slot' + (i === this.inv.sel ? ' sel' : '') + '" data-i="' + i + '"' + (s[i] ? ' title="' + WG.itemName(s[i].key) + '"' : '') + '>' + slotHTML(s[i]) + '</div>';
    html += '</div>';
    ui.invBody.innerHTML = html;
    ui.cursor.innerHTML = slotHTML(this.cursor);
    ui.cursor.classList.toggle('hide', !this.cursor);
  };

  // 枠をクリックしたとき（Minecraft と同じ：左で束ごと、右で半分・1 個、Shift＋左でホットバーと中身の間を移す）
  Game.prototype.clickSlot = function (el, button, shift) {
    var inv = this.inv, s = inv.slots, cur = this.cursor;
    if (el.dataset.pal) {
      // クリエイティブの一覧：手に持っていれば捨てる、なければ取る（左で 1 束、右で 1 個）
      if (cur) this.cursor = null;
      else this.cursor = { key: el.dataset.pal, n: button === 2 ? 1 : ITEMS[el.dataset.pal].max };
      this.renderInventory();
      return;
    }
    var i = +el.dataset.i, slot = s[i];
    if (shift && slot && button === 0) {
      // ホットバー ⇔ 中身（クリエイティブでは中身がないので、そのまま消す）
      if (this.mode === 'creative') { s[i] = null; inv.changed(); return; }
      var range = i < 9 ? [9, 36] : [0, 9], key = slot.key, max = ITEMS[key].max, n = slot.n, j;
      for (j = range[0]; j < range[1] && n > 0; j++) if (s[j] && s[j].key === key && s[j].n < max) { var a = Math.min(n, max - s[j].n); s[j].n += a; n -= a; }
      for (j = range[0]; j < range[1] && n > 0; j++) if (!s[j]) { s[j] = { key: key, n: n }; n = 0; }
      if (n > 0) slot.n = n; else s[i] = null;
      inv.changed();
      return;
    }
    if (button === 0) {
      if (!cur) { this.cursor = slot; s[i] = null; }
      else if (!slot) { s[i] = cur; this.cursor = null; }
      else if (slot.key === cur.key) {
        var room = ITEMS[slot.key].max - slot.n, m = Math.min(room, cur.n);
        slot.n += m; cur.n -= m; if (cur.n <= 0) this.cursor = null;
      } else { s[i] = cur; this.cursor = slot; }
    } else if (button === 2) {
      if (!cur && slot) { var half = Math.ceil(slot.n / 2); this.cursor = { key: slot.key, n: half }; slot.n -= half; if (slot.n <= 0) s[i] = null; }
      else if (cur && (!slot || (slot.key === cur.key && slot.n < ITEMS[slot.key].max))) {
        if (!slot) s[i] = { key: cur.key, n: 1 }; else slot.n++;
        cur.n--; if (cur.n <= 0) this.cursor = null;
      } else if (cur && slot) { s[i] = cur; this.cursor = slot; }
    }
    inv.changed();
    this.renderInventory();
  };

  // ---------------- 入力 ----------------
  Game.prototype.key = function (e, down) {
    var c = e.code, locked = this.ui.locked();
    if (down && c === 'KeyE' && !e.repeat) { this.toggleInventory(); return true; }
    if (down && c === 'Escape' && this.invOpen) { this.closeInventory(); return true; }
    if (!locked) return false;
    if (down && c === 'KeyQ' && !e.repeat) { this.dropHeld(e.ctrlKey); return true; }
    if (down && /^Digit[1-9]$/.test(c)) { this.inv.sel = +c.slice(5) - 1; this.inv.changed(); return true; }
    return false;
  };
  Game.prototype.mouse = function (button, down) {
    if (this.dead || this.invOpen) return;
    if (button === 0) { this.mouseL = down; if (down) this.breakDelay = 0; }
    else if (button === 2) { this.mouseR = down; if (down) this.placeDelay = 0; }
    else if (button === 1 && down) this.pickBlock();
  };
  Game.prototype.wheel = function (dy) {
    if (!dy) return;
    this.inv.sel = (this.inv.sel + (dy > 0 ? 1 : -1) + 9) % 9;
    this.inv.changed();
  };

  WG.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
