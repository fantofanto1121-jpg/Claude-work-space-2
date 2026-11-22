// 遊ぶ：ブロックを壊す・置く、ドロップ、インベントリとクラフト、かまど、水の流れ、サバイバルとクリエイティブ（パソコン版のみ）。
// 操作は Minecraft の初期設定と同じ：
//   左クリック 壊す（サバイバルは押し続ける）、右クリック 置く・作業台やかまどを開く（Shift を押しながらだと置く）、
//   中クリック 見ているブロックを持つ、1〜9・ホイール 持ち替え、E インベントリ、Q 捨てる（Ctrl＋Q でまとめて）、
//   クリエイティブではスペースの 2 度押しで飛ぶ。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, FLUID = WG.FLUID, Craft = WG.Craft;

  var SOLID = new Uint8Array(WG.BLOCKS.length);
  WG.BLOCKS.forEach(function (b) { SOLID[b.id] = b.kind === 'solid' ? 1 : 0; });
  function isPlant(id) { return WG.blockKind(id) === 'plant'; }
  function isCrop(id) { return WG.blockKind(id) === 'crop'; }
  function kindOf(id) { return WG.blockKind(id); }
  function isDoor(id) { return kindOf(id) === 'door'; }
  function isDeco(id) { return WG.blockKind(id) === 'deco'; }
  // 上から置くと置き換わるもの（空気、流体、草花）
  function replaceable(id) { return id === B.AIR || FLUID[id] > 0 || (isPlant(id) && id !== B.BROWN_MUSHROOM && id !== B.RED_MUSHROOM) || id === B.FIRE; }
  // 壁掛けトーチ：向き → 取り付けている壁の向き
  var WALL = {};
  WALL[B.WALL_TORCH_E] = [-1, 0]; WALL[B.WALL_TORCH_W] = [1, 0]; WALL[B.WALL_TORCH_S] = [0, -1]; WALL[B.WALL_TORCH_N] = [0, 1];

  var MAX_HEALTH = 20, MAX_AIR = 300, DAY = 24000;
  // 下が空くと落ちるブロック（砂・砂利）。落ちて入れる場所は、空気・流体・草花。
  var GRAVITY = {}; GRAVITY[B.SAND] = GRAVITY[B.GRAVEL] = 1;
  WG.GRAVITY = GRAVITY;   // 落ちるブロック（コンクリートパウダーも js/deco.js で足す）
  function canFallInto(id) { return id === B.AIR || FLUID[id] > 0 || isPlant(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  // プレイヤー（持ち物・体力など）。表示や次元を切り替えても残るよう、ゲームの外に置く。
  function Player() {
    this.inv = new WG.Inventory();
    this.health = MAX_HEALTH; this.air = MAX_AIR; this.dead = false;
    // 空腹（Minecraft と同じ）：満腹度 0〜20、隠し満腹度（はじめ 5）、疲れ
    this.food = 20; this.sat = 5; this.exhaust = 0;
    this.bed = null;   // リスポーン地点にしたベッド { x, y, z, dim }
    this.armor = [null, null, null, null];   // 防具（頭・胴・脚・足）
  }

  function Game(view, world, ui, player) {
    var self = this;
    this.view = view; this.world = world; this.ui = ui;
    this.player = player || new Player();
    this.inv = this.player.inv;
    this.mode = 'survival';
    this.health = this.player.health; this.air = this.player.air; this.dead = this.player.dead;
    this.invuln = 0; this.regen = 0;
    // 落ちているアイテム、かまど、流体の動きは世界ごとに残す
    this.entities = world.items || (world.items = []);
    if (!world.furnaces) world.furnaces = new Map();
    if (!world.chests) world.chests = new Map();
    if (world.time == null) world.time = 1000;   // 朝（Minecraft の時刻 1000 = 午前 7 時）
    if (!world.fluids) world.fluids = new WG.Fluids(world);
    world.fluids.onChange = function (x, y, z, oldId, newId) { self.fluidChanged(x, y, z, oldId, newId); };
    this.particles = []; this.falling = [];
    this.food = this.player.food; this.sat = this.player.sat; this.exhaust = this.player.exhaust;
    this.foodTimer = 0; this.eating = null; this.sleeping = null; this.tickCount = 0;
    this.mobs = new WG.Mobs(this);
    this.armor = this.player.armor || (this.player.armor = [null, null, null, null]);
    this.bowT = 0; this.regenT = 0;
    if (!world.fires) world.fires = new Map();   // 燃えている火（キー → 燃えた時間）
    this.breaking = null; this.breakDelay = 0; this.placeDelay = 0;
    this.mouseL = false; this.mouseR = false;
    this.clickL = false; this.clickR = false;   // 短いクリックも次の刻みで必ず受け付ける
    this.invOpen = false; this.screen = null; this.cursor = null;
    this.craft = []; this.craftN = 2; this.craftResult = null; this.furnaceKey = null;
    this.hudKey = '';
    this.walker = new WG.Walker(view, world, {
      active: function () { return !self.dead && (ui.locked() || self.invOpen); },
      status: ui.status,
      tick: function () { self.tick(); },
      land: function (d, below) { self.land(d, below); },
      ride: function (w, shift) { return self.rideTick ? self.rideTick(w, shift) : false; },
      voidDamage: function () { return self.mode === 'survival'; },
      draw: function (w, a) { self.draw(a); },
      sky: function () { return self.sky(); },
      chunkBuilt: function (cx, cz) { self.mobs.populate(cx, cz); }
    });
    this.initExtra();
  }

  Game.prototype.start = function (x, z) {
    this.walker.start(x, z);
    this.setMode(this.mode);
    if (this.dead) this.ui.dead.classList.remove('hide');
  };
  Game.prototype.stop = function () {
    this.closeInventory();
    this.player.health = this.health; this.player.air = this.air; this.player.dead = this.dead;
    this.player.food = this.food; this.player.sat = this.sat; this.player.exhaust = this.exhaust;
    this.walker.using = false;
    this.world.items = this.entities;
    this.world.fluids.onChange = function () {};
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
    if (this.invOpen) {
      // クリエイティブの一覧とサバイバルのインベントリは画面が違うので、開き直す
      if (this.screen === 'inv' || this.screen === 'creative') { this.closeInventory(); this.openInventory(m === 'creative' ? 'creative' : 'inv'); }
      else this.renderInventory();
    }
  };

  // ---------------- 1 刻みごと ----------------
  Game.prototype.tick = function () {
    var w = this.walker, surv = this.mode === 'survival', wd = this.world;
    if (this.invuln > 0) this.invuln--;

    this.tickCount++;
    // 眠っている間は動かない。100 刻み（5 秒）で朝になる。
    if (this.sleeping) {
      var sl = this.sleeping;
      w.keys = {}; w.vel = [0, 0, 0]; w.pos = sl.pos.slice(); w.prev = sl.pos.slice();
      this.ui.sleep(Math.min(1, ++sl.t / 60));
      if (this.mobs.near(w.pos[0], w.pos[1], w.pos[2], 8, 5, true)) { this.wake(); this.ui.toast('近くに敵がいるため、起こされました'); }
      else if (sl.t >= 100) { wd.time = 0; this.wake(); }
      return;
    }

    // 体力：溶岩、奈落、おぼれる。回復と空腹は下の hunger で。
    if (surv) {
      var flu = w.fluid();
      if (flu === 'lava') { this.damage(4, false, 'fire'); this.burnT = Math.max(this.burnT || 0, 300); }
      if (w.inBlock(B.FIRE)) { this.damage(1, false, 'fire'); this.burnT = Math.max(this.burnT || 0, 160); }
      // 体に火がついている間は 1 秒ごとに 1 減る。水に入ると消える。
      if (this.burnT > 0) {
        if (flu === 'water') this.burnT = 0;
        else if (--this.burnT % 20 === 0) this.damage(1, true, 'fire');
      }
      // 金のリンゴの再生：1.25 秒ごとに 1 回復
      if (this.regenT > 0) { this.regenT--; if (this.regenT % 25 === 0 && this.health < MAX_HEALTH) this.health = Math.min(MAX_HEALTH, this.health + 1); }
      if (w.pos[1] < wd.minY - 64) this.damage(4);
      var e = w.eye || w.pos, eyeId = wd.block(Math.floor(e[0]), Math.floor(e[1]), Math.floor(e[2]));
      if (WG.isWater(eyeId)) {
        var resp = 0; this.armor.forEach(function (s) { resp += WG.enchLevel(s, 'RESPIRATION'); });
        if (!this.effects.WATER_BREATHING && !(resp && Math.random() < resp / (resp + 1))) this.air--;
        if (this.air <= -20) { this.air = 0; this.damage(2, true); }
      } else this.air = Math.min(MAX_AIR, this.air + 4);
      this.hunger();
    }
    w.canSprint = !surv || this.food > 6;

    // 生き物を叩く（クリックしたときだけ。ブロックより手前にいるとき）
    if (this.clickL && this.mobs.target && !this.invOpen) {
      this.attack(this.mobs.target.mob);
      this.clickL = false; this.mouseL = false;
    }

    // 食べる：食べ物を持って右クリックを押し続けると、32 刻み（1.6 秒）で食べる
    this.tickEating();
    this.tickBow();
    this.tickExtra();

    // 壊す
    if (this.breakDelay > 0) this.breakDelay--;
    var t = w.target;
    var holdL = this.mouseL || this.clickL;
    this.clickL = false;
    if (holdL && t && !this.invOpen && this.breakDelay === 0) {
      if (!surv) { this.breakBlock(t.x, t.y, t.z); this.breakDelay = 5; this.breaking = null; }
      else {
        // 掘る速さとドロップは、持っている道具で変わる（Minecraft と同じ式）
        var bkey = WG.BLOCKS[t.id].key, held = this.inv.held(), mn = this.miningBonus(WG.mining(bkey, held), held, bkey);
        if (mn.perTick > 0) {
          var b = this.breaking;
          if (!b || b.x !== t.x || b.y !== t.y || b.z !== t.z || b.tool !== (held ? held.key : '')) b = this.breaking = { x: t.x, y: t.y, z: t.z, p: 0, tool: held ? held.key : '' };
          b.p += mn.perTick;
          if (b.p >= 1) {
            this.breakBlock(t.x, t.y, t.z, mn.harvest);
            this.breaking = null; this.breakDelay = 5;
            this.wearTool(ITEMS[bkey] ? ITEMS[bkey].hardness : 1);
          }
        } else this.breaking = null;
      }
    } else if (!holdL || !t) this.breaking = null;

    // 置く・使う（押し続けると 4 刻みごとに置く）
    if (this.placeDelay > 0) this.placeDelay--;
    if ((this.mouseR || this.clickR) && this.placeDelay === 0 && !this.invOpen && !this.eating) { this.use(); this.placeDelay = 4; }
    this.clickR = false;

    // 水と溶岩、かまど
    wd.fluids.tick(3000);
    var self = this;
    wd.furnaces.forEach(function (f, key) {
      // 溶鉱炉と燻製器は、決まった物だけを 2 倍の速さで焼く（燃料も 2 倍の速さで減る）
      var p = key.split(',').map(Number), id = wd.block(p[0], p[1], p[2]);
      f.only = id === B.BLAST_FURNACE || id === B.BLAST_FURNACE_LIT ? 'ore' : id === B.SMOKER || id === B.SMOKER_LIT ? 'food' : null;
      var ch = f.tick(); if (f.only) ch = f.tick() || ch;
      if (!ch) return;
      // 燃え始め・燃え終わりで、かまどの見た目（と光）を変える
      var kind = WG.furnaceKind ? WG.furnaceKind(id) : (id === B.FURNACE || id === B.FURNACE_LIT ? 'FURNACE' : null);
      if (!kind) { wd.furnaces.delete(key); return; }
      wd.setBlock(p[0], p[1], p[2], f.burn > 0 ? B[kind + '_LIT'] : B[kind]);
      self.walker.remesh(p[0], p[2]);
    });

    this.tickFalling();
    this.tickFires();
    this.randomTicks();
    this.tickEntities();
    this.mobs.tick();
    if (wd.dimKey === 'overworld') wd.time = (wd.time + 1) % DAY;
  };

  // 道具を使うと耐久値が減り、なくなると壊れる（硬さ 0 のブロックでは減らない）
  Game.prototype.wearTool = function (hardness) {
    var held = this.inv.held(), it = held ? ITEMS[held.key] : null;
    if (!it || !it.dur || !(hardness > 0)) return;
    this.wearItem(this.inv.sel, 1);
  };

  // ---------------- 昼と夜 ----------------
  // Minecraft と同じく 1 日は 24000 刻み（20 分）。0 が日の出（午前 6 時）、6000 が正午、18000 が真夜中。
  Game.prototype.dayAngle = function () {
    var f = ((this.world.time / DAY - 0.25) % 1 + 1) % 1;
    return f + (1 - (Math.cos(f * Math.PI) + 1) / 2 - f) / 3;
  };
  Game.prototype.sky = function () {
    if (this.world.dimKey !== 'overworld') return null;
    var f = this.dayAngle(), c = Math.cos(f * Math.PI * 2), bright = clamp(c * 2 + 0.5, 0, 1);
    var pal = (this.world.dim && this.world.dim.palette) || WG.DIMS.overworld.palette;
    var dayTop = pal.skyTop.map(function (v) { return v / 255; }), dayLow = pal.skyLow.map(function (v) { return v / 255; });
    var top = mix([0.02, 0.03, 0.07], dayTop, bright), low = mix([0.05, 0.07, 0.12], dayLow, bright);
    // 朝焼けと夕焼け（太陽が地平線の近くにある間だけ）。遠くの霞には少しだけ混ぜる。
    var fog = low;
    if (Math.abs(c) < 0.4) {
      var k = 1 - Math.abs(c) / 0.4;
      fog = mix(low, [0.86, 0.5, 0.3], k * 0.12);
      low = mix(low, [0.86, 0.5, 0.3], k * 0.5);
    }
    return {
      top: top, low: low, fog: fog, dark: (1 - bright) * 11,
      tint: mix([0.7, 0.76, 1.0], [1, 1, 1], bright),
      celestial: { angle: f * Math.PI * 2, stars: clamp((1 - bright) * 1.3 - 0.3, 0, 1) * 0.9 }
    };
  };
  Game.prototype.setTime = function (t) { this.world.time = ((t % DAY) + DAY) % DAY; };
  Game.prototype.timeText = function () {
    if (this.world.dimKey !== 'overworld') return '';
    var h = (this.world.time / 1000 + 6) % 24, hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    return hh + ':' + (mm < 10 ? '0' : '') + mm;
  };

  // ---------------- 落ちる砂と砂利 ----------------
  // 下が空いたら、ブロックを外して落ちるものにする（上に積もった分も続けて落ちる）
  Game.prototype.checkFall = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z);
    if (!GRAVITY[id] || y <= wd.minY || !canFallInto(wd.block(x, y - 1, z))) return;
    wd.setBlock(x, y, z, B.AIR);
    this.walker.remesh(x, z);
    wd.fluids.notify(x, y, z);
    this.falling.push({ id: id, x: x + 0.5, y: y, z: z + 0.5, py: y, vy: 0 });
    this.checkFall(x, y + 1, z);
  };
  Game.prototype.tickFalling = function () {
    var wd = this.world, keep = [];
    for (var i = 0; i < this.falling.length; i++) {
      var f = this.falling[i], bx = Math.floor(f.x), bz = Math.floor(f.z);
      f.py = f.y; f.vy -= 0.04;
      var ny = f.y + f.vy, land = null;
      f.vy *= 0.98;
      for (var cy = Math.floor(f.y) - 1; cy >= Math.floor(ny); cy--) {
        if (!canFallInto(wd.block(bx, cy, bz))) { land = cy + 1; break; }
      }
      if (land === null) {
        f.y = ny;
        if (f.y > wd.minY - 64) keep.push(f);
        continue;
      }
      // 着地：草花なら押しのけて置き、置けない所ならアイテムになる
      var cur = wd.block(bx, land, bz);
      if (cur === B.AIR || FLUID[cur] || isPlant(cur)) {
        if (isPlant(cur) && this.mode === 'survival') this.dropFor(cur, bx, land, bz, true);
        wd.setBlock(bx, land, bz, f.id);
        this.walker.remesh(bx, bz);
        wd.fluids.notify(bx, land, bz);
      } else this.spawnItem(WG.BLOCKS[f.id].key, 1, f.x, land + 0.2, f.z, 0.05, 10);
    }
    this.falling = keep;
  };

  // armored なら防具で減らす（生き物・矢・爆発・溶岩・火。落下・おぼれ・空腹は減らない）
  Game.prototype.damage = function (n, ignoreInvuln, armored) {
    if (this.mode !== 'survival' || this.dead || (this.invuln > 0 && !ignoreInvuln)) return false;
    n = this.modifyDamage(n, armored);
    if (n <= 0) return false;
    if (armored && armored !== 'fall') n = this.armorReduce(n);
    this.health = Math.max(0, this.health - n);
    this.invuln = 10; this.regen = 0; this.exhaust += 0.1;
    this.ui.hurt();
    if (this.sleeping) this.wake();
    if (this.health <= 0) this.die();
    return true;
  };
  // 防具の守り（Minecraft と同じ式）。守った分、各部位の耐久値が減る（4 ダメージごとに 1、少なくとも 1）。
  Game.prototype.armorPoints = function () {
    var d = 0, t = 0;
    this.armor.forEach(function (s) { if (s) { d += ITEMS[s.key].def; t += ITEMS[s.key].tough; } });
    return [d, t];
  };
  Game.prototype.armorReduce = function (n) {
    var at = this.armorPoints(), def = at[0], tough = at[1], self = this;
    if (!def) return n;
    var k = Math.min(20, Math.max(def / 5, def - 4 * n / (tough + 8))) / 25, wear = Math.max(1, Math.floor(n / 4));
    this.armor.forEach(function (s, i) {
      if (!s) return;
      var ub = WG.enchLevel ? WG.enchLevel(s, 'UNBREAKING') : 0;   // 防具の耐久力：60% + 40%/(レベル+1) の確率で減る（Minecraft と同じ）
      if (!ub || Math.random() < 0.6 + 0.4 / (ub + 1)) s.dmg = (s.dmg || 0) + wear;
      if (s.dmg >= ITEMS[s.key].dur) { self.armor[i] = null; if (self.ui.toast) self.ui.toast(WG.itemName(s.key) + 'が壊れました'); }
    });
    this.inv.changed();
    return n * (1 - k);
  };
  // 生き物や矢に傷つけられる（相手から離れる向きに押される）
  Game.prototype.hurtPlayer = function (n, fx, fz, type) {
    this.lastFrom = [fx, fz];
    var ok = this.damage(n, false, type || true);
    this.lastFrom = null;
    if (!ok) return;
    var w = this.walker, dx = w.pos[0] - fx, dz = w.pos[2] - fz, d = Math.hypot(dx, dz) || 1;
    w.vel[0] += dx / d * 0.4; w.vel[2] += dz / d * 0.4; w.vel[1] = Math.max(w.vel[1], 0.4);
  };

  // ---------------- 空腹（Minecraft と同じ） ----------------
  // 疲れが 4 たまるごとに隠し満腹度（なければ満腹度）が 1 減る。
  // 満腹度 18 以上で 4 秒ごとに回復、満腹度 20 で隠し満腹度があれば 0.5 秒ごとに回復。0 だと 4 秒ごとに体力が減る（1 までは）。
  Game.prototype.hunger = function () {
    var w = this.walker;
    this.exhaust += w.exhaustion || 0; w.exhaustion = 0;
    while (this.exhaust >= 4) {
      this.exhaust -= 4;
      if (this.sat > 0) this.sat = Math.max(0, this.sat - 1); else this.food = Math.max(0, this.food - 1);
    }
    this.foodTimer++;
    if (this.sat > 0 && this.food >= 20 && this.health < MAX_HEALTH) {
      if (this.foodTimer >= 10) { this.health = Math.min(MAX_HEALTH, this.health + 1); this.exhaust += 6; this.foodTimer = 0; }
    } else if (this.food >= 18 && this.health < MAX_HEALTH) {
      if (this.foodTimer >= 80) { this.health = Math.min(MAX_HEALTH, this.health + 1); this.exhaust += 6; this.foodTimer = 0; }
    } else if (this.food <= 0) {
      if (this.foodTimer >= 80) { if (this.health > 1) this.damage(1, true); this.foodTimer = 0; }
    } else this.foodTimer = 0;
  };

  Game.prototype.tickEating = function () {
    var held = this.inv.held(), it = held ? ITEMS[held.key] : null, w = this.walker;
    // 金のリンゴとミルクは、おなかがいっぱいでも口にできる（Minecraft と同じ）
    var canEat = this.mode === 'survival' && it && (it.food || it.milk || (it.potion && !it.splash)) && (this.food < 20 || it.regen || it.milk || it.potion) && !this.invOpen;
    var tid = w.target ? w.target.id : -1;
    var aimUse = w.target && (tid === B.CRAFTING_TABLE || tid === B.FURNACE || tid === B.FURNACE_LIT || tid === B.CHEST || WG.blockKind(tid) === 'bed' || isDoor(tid) ||
      // 耕地に向けたニンジン・ジャガイモは植える
      (it && it.plant && (tid === B.FARMLAND || tid === B.FARMLAND_MOIST) && w.target.py === w.target.y + 1));
    if (this.mobs.target && it && (it.key === 'BUCKET' || it.key === 'SHEARS')) aimUse = true;
    if (canEat && this.mouseR && !aimUse) {
      if (!this.eating || this.eating.slot !== this.inv.sel) this.eating = { slot: this.inv.sel, t: 0 };
      w.using = true;
      if (++this.eating.t >= 32) {
        if (it.food) {
          this.food = Math.min(20, this.food + it.food);
          this.sat = Math.min(this.food, this.sat + it.food * it.sat * 2);
        }
        if (it.regen) this.regenT = it.regen;
        this.consumeExtra(it);
        this.inv.take(this.inv.sel, 1);
        // シチューはボウルが、ミルクはバケツが残る
        var rest = it.leaves || (it.milk ? 'BUCKET' : it.potion ? 'GLASS_BOTTLE' : null);
        if (rest && !this.inv.add(rest, 1)) this.spawnItem(rest, 1, w.pos[0], w.pos[1] + 1, w.pos[2], 0.1, 20);
        this.eating = null; w.using = false; this.mouseR = false;
        var dir = w.dir || [0, 0, 0];
        this.burst(w.pos[0] - 0.5 + dir[0] * 0.4, w.pos[1] + 1.2, w.pos[2] - 0.5 + dir[2] * 0.4, B.DIRT, held.key);
      }
    } else if (this.eating) { this.eating = null; w.using = false; }
  };

  // ---------------- 弓 ----------------
  // 右クリックを押し続けて引き、離すと射る（Minecraft と同じ：1 秒で引き切り、速さ最大 3、引き切ると会心）。
  // サバイバルでは矢を 1 本使い、弓の耐久値が 1 減る。
  Game.prototype.tickBow = function () {
    var held = this.inv.held(), it = held ? ITEMS[held.key] : null, w = this.walker, surv = this.mode === 'survival';
    var arrowAt = -1;
    for (var i = 0; i < 36 && surv; i++) if (this.inv.slots[i] && this.inv.slots[i].key === 'ARROW') { arrowAt = i; break; }
    var can = it && it.bow && (!surv || arrowAt >= 0);
    if (can && this.mouseR && !this.invOpen) { this.bowT++; w.using = true; return; }
    if (this.bowT <= 0) return;
    var t = this.bowT; this.bowT = 0; w.using = false;
    if (!can || !w.eye || !w.dir) return;
    var f = t / 20; f = Math.min(1, (f * f + f * 2) / 3);
    if (f < 0.1) return;
    var v = f * 3, dmg = Math.ceil(v * 2), pw = WG.enchLevel(held, 'POWER'), inf = WG.enchLevel(held, 'INFINITY');
    if (pw) dmg = Math.ceil(dmg * (1 + 0.25 * (pw + 1)));   // 射撃ダメージ増加
    if (f >= 1) dmg += Math.floor(Math.random() * (dmg / 2 + 2));
    var ar = this.mobs.shootFromPlayer(w.eye, w.dir, v, dmg, surv && !inf);
    ar.flame = WG.enchLevel(held, 'FLAME') > 0; ar.punch = WG.enchLevel(held, 'PUNCH');
    if (surv) { if (!inf) this.inv.take(arrowAt, 1); this.wearTool(1); }
    this.exhaust += 0.1;
  };

  // ---------------- 作物と耕地、火 ----------------
  var CROP_N = { WHEAT: 8, CARROTS: 4, POTATOES: 4, NETHER_WART: 4 };
  function cropInfo(id) {
    var m = /^(WHEAT|CARROTS|POTATOES|NETHER_WART)_(\d)$/.exec(WG.BLOCKS[id].key);
    return m ? { type: m[1], stage: +m[2], max: CROP_N[m[1]] - 1 } : null;
  }
  WG.cropInfo = cropInfo;
  // ランダムな刻み（Minecraft と同じく、近くのチャンクの 16×16×16 ごとに毎刻 3 か所）：作物が育ち、耕地が湿る・乾く
  Game.prototype.randomTicks = function () {
    var w = this.walker, wd = this.world, pcx = Math.floor(w.pos[0]) >> 4, pcz = Math.floor(w.pos[2]) >> 4, sy0 = (Math.floor(w.pos[1]) >> 4) << 4;
    for (var cz = pcz - 6; cz <= pcz + 6; cz++) for (var cx = pcx - 6; cx <= pcx + 6; cx++) {
      if (wd.hasChunk && !wd.hasChunk(cx, cz)) continue;
      for (var sy = Math.max(wd.minY, sy0 - 32); sy <= Math.min(wd.maxY - 15, sy0 + 32); sy += 16) {
        for (var n = 0; n < 3; n++) {
          var x = (cx << 4) + ((Math.random() * 16) | 0), y = sy + ((Math.random() * 16) | 0), z = (cz << 4) + ((Math.random() * 16) | 0);
          var id = wd.block(x, y, z), k = kindOf(id);
          if (k === 'crop') this.growCrop(x, y, z, 0);
          else if (FLUID[id] === 2 && WG.FLUID_LEVEL[id] === 0) this.lavaTick(x, y, z);
          else if (id === B.SUGAR_CANE && Math.random() < 1 / 16 && wd.block(x, y + 1, z) === B.AIR && wd.block(x, y - 2, z) !== B.SUGAR_CANE) {
            wd.setBlock(x, y + 1, z, B.SUGAR_CANE); this.walker.remesh(x, z);   // サトウキビは 3 段まで伸びる
          }
          else if (k === 'farm') this.tickFarmland(x, y, z);
        }
      }
    }
  };
  // 作物を育てる。n は進める段階（骨粉）、0 ならランダムな刻み（明るさ 9 以上、耕地が湿っているほど育ちやすい）
  Game.prototype.growCrop = function (x, y, z, n) {
    var wd = this.world, id = wd.block(x, y, z), c = cropInfo(id);
    if (!c || c.stage >= c.max) return false;
    if (c.type === 'NETHER_WART') {
      // ネザーウォート：明るさに関係なく、ランダムな刻みの 1 割で育つ。骨粉は効かない
      if (n || Math.random() >= 0.1) return false;
      n = 1;
    } else if (!n) {
      var lt = this.walker.lightLevels(x, y, z), sk = this.sky(), dark = sk ? sk.dark : 0;
      if (Math.max(lt[0] - dark, lt[1]) < 9) return false;
      var f = 1;
      for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) {
        var b = wd.block(x + dx, y - 1, z + dz), g = b === B.FARMLAND_MOIST ? 3 : b === B.FARMLAND ? 1 : 0;
        f += dx || dz ? g / 4 : g;
      }
      if (Math.random() >= 1 / (Math.floor(25 / f) + 1)) return false;
      if (c.max === 3 && Math.random() < 0.5) return false;   // ニンジン・ジャガイモは本来 8 段階なので、4 段階では半分の確率で進む
      n = 1;
    } else if (c.max === 3) n = Math.max(1, Math.round(n / 2));
    wd.setBlock(x, y, z, B[c.type + '_' + Math.min(c.max, c.stage + n)]);
    this.walker.remesh(x, z);
    return true;
  };
  // 耕地：4 ブロック以内に水があれば湿る。乾いた耕地は、上に作物がなければ土に戻る。
  Game.prototype.tickFarmland = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z), wet = false;
    for (var dy = 0; dy <= 1 && !wet; dy++) for (var dz = -4; dz <= 4 && !wet; dz++) for (var dx = -4; dx <= 4 && !wet; dx++) if (WG.isWater(wd.block(x + dx, y + dy, z + dz))) wet = true;
    var to = wet ? B.FARMLAND_MOIST : id === B.FARMLAND_MOIST ? B.FARMLAND : isCrop(wd.block(x, y + 1, z)) ? id : B.DIRT;
    if (to !== id) { wd.setBlock(x, y, z, to); this.walker.remesh(x, z); }
  };
  // 燃えやすさ [燃え移りやすさ, 燃え尽きやすさ]（Minecraft の値）
  var FLAM = new Array(WG.BLOCKS.length);
  WG.BLOCKS.forEach(function (b) {
    var k = b.key;
    if (/_PLANKS$|_FENCE$|^(OAK|SPRUCE|ACACIA|BIRCH|JUNGLE)_(STAIRS|SLAB)/.test(k)) FLAM[b.id] = [5, 20];
    else if (/_LOG$/.test(k)) FLAM[b.id] = [5, 5];
    else if (/_LEAVES$/.test(k) || k === 'WHITE_WOOL') FLAM[b.id] = [30, 60];
    else if (k === 'SHORT_GRASS' || k === 'DANDELION' || k === 'POPPY') FLAM[b.id] = [60, 100];
    else if (k === 'TNT') FLAM[b.id] = [15, 100];
    else if (k === 'BOOKSHELF') FLAM[b.id] = [30, 20];
  });
  WG.FLAM = FLAM;
  var N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  function rint(n) { return Math.floor(Math.random() * n); }
  // 火：30〜40 刻みごとに年を取り、周りの燃えやすいブロックを燃やし（燃え尽きると火か空気になる）、近くの空いた所へ燃え広がる。
  // ネザーラック・マグマの上では消えない。燃えるものが周りになく、下が固くなければ消える（Minecraft と同じ考え方）。
  Game.prototype.tickFires = function () {
    var wd = this.world, self = this;
    if (!wd.fires.size) return;
    var list = [];
    wd.fires.forEach(function (f, key) { list.push([key, f]); });
    list.forEach(function (e) {
      var key = e[0], f = e[1], p = key.split(',').map(Number), x = p[0], y = p[1], z = p[2];
      if (typeof f === 'number') { f = { age: 0, t: 30 + rint(10) }; wd.fires.set(key, f); }
      if (wd.block(x, y, z) !== B.FIRE) { wd.fires.delete(key); return; }
      if (--f.t > 0) return;
      f.t = 30 + rint(10);
      var below = wd.block(x, y - 1, z), forever = below === B.NETHERRACK || below === B.MAGMA;
      var fuel = N6.some(function (d) { return FLAM[wd.block(x + d[0], y + d[1], z + d[2])]; });
      if (!fuel && !WG.COLLIDE[below]) { self.setFire(x, y, z, false); return; }
      f.age = Math.min(15, f.age + (rint(3) >> 1));
      if (!forever) {
        if (!fuel && (!WG.COLLIDE[below] || f.age > 3)) { self.setFire(x, y, z, false); return; }
        if (!FLAM[below] && f.age === 15 && rint(4) === 0) { self.setFire(x, y, z, false); return; }
      }
      // まわりを燃やす
      N6.forEach(function (d) {
        var nx = x + d[0], ny = y + d[1], nz = z + d[2], nid = wd.block(nx, ny, nz), fl = FLAM[nid];
        if (!fl || rint(d[1] ? 250 : 300) >= fl[1]) return;
        if (nid === B.TNT) { self.primeTnt(nx, ny, nz, 80); return; }
        if (rint(f.age + 10) < 5) self.setFire(nx, ny, nz, true, Math.min(15, f.age + (rint(5) >> 2)));
        else { wd.setBlock(nx, ny, nz, B.AIR); self.walker.remesh(nx, nz); self.checkFall(nx, ny + 1, nz); }
      });
      // 燃え広がる
      for (var dy = -1; dy <= 4; dy++) for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy && !dz) continue;
        var ax = x + dx, ay = y + dy, az = z + dz;
        if (wd.block(ax, ay, az) !== B.AIR) continue;
        var enc = 0;
        N6.forEach(function (d) { var fl = FLAM[wd.block(ax + d[0], ay + d[1], az + d[2])]; if (fl && fl[0] > enc) enc = fl[0]; });
        if (!enc) continue;
        var chance = (enc + 40 + 14) / (f.age + 30);
        if (chance > 0 && rint(100 + (dy > 1 ? (dy - 1) * 100 : 0)) <= chance) self.setFire(ax, ay, az, true, Math.min(15, f.age + (rint(5) >> 2)));
      }
    });
    this.mobs.list.forEach(function (m) { if (wd.block(Math.floor(m.x), Math.floor(m.y + 0.2), Math.floor(m.z)) === B.FIRE) { m.fire = Math.max(m.fire || 0, 160); } });
  };
  // 火を付ける・消す
  Game.prototype.setFire = function (x, y, z, on, age) {
    var wd = this.world, key = x + ',' + y + ',' + z;
    if (on) { wd.setBlock(x, y, z, B.FIRE); wd.fires.set(key, { age: age || 0, t: 30 + rint(10) }); }
    else { if (wd.block(x, y, z) === B.FIRE) wd.setBlock(x, y, z, B.AIR); wd.fires.delete(key); }
    this.walker.remesh(x, z);
  };
  // 溶岩のランダムな刻み：近くの燃えやすいブロックの横の空いた所に火を付ける（Minecraft と同じ）
  Game.prototype.lavaTick = function (x, y, z) {
    var wd = this.world, n = rint(3);
    for (var k = 0; k < n; k++) {
      x += rint(3) - 1; y += 1; z += rint(3) - 1;
      var id = wd.block(x, y, z);
      if (id !== B.AIR) { if (WG.COLLIDE[id]) return; continue; }
      if (N6.some(function (d) { return FLAM[wd.block(x + d[0], y + d[1], z + d[2])]; })) { this.setFire(x, y, z, true, 0); return; }
    }
  };

  // ---------------- 戦う ----------------
  // 攻撃力は持っているもので決まり、落ちながら叩くと 1.5 倍（会心の一撃）。道具は 2 減る。
  Game.prototype.attack = function (m) {
    var w = this.walker, held = this.inv.held(), dmg = this.attackBonus(WG.attackDamage(held), m, held);
    if (!w.onGround && w.vel[1] < 0 && !w.flying) dmg *= 1.5;
    if (this.mobs.hurt(m, dmg, [w.pos[0], w.pos[2], w.sprint ? 0.8 : 0.4])) {
      this.afterAttack(m, held);
      this.exhaust += 0.1;
      // 剣は 1、ほかの道具は 2 減る
      if (this.mode === 'survival') { this.wearTool(1); if (!(held && ITEMS[held.key].tool === 'sword')) this.wearTool(1); }
    }
  };

  // 爆発（Minecraft の考え方を簡単にしたもの）：中心から離れるほど、硬いブロックほど壊れにくい。
  // 体力の減り方は Minecraft と同じ式（威力 P、距離 d：(1 - d / 2P) から求める）。
  Game.prototype.explode = function (x, y, z, power) {
    var wd = this.world, R = Math.ceil(power * 1.6), touched = {}, self = this, below = [];
    for (var dy = -R; dy <= R; dy++) for (var dz = -R; dz <= R; dz++) for (var dx = -R; dx <= R; dx++) {
      var bx = Math.floor(x) + dx, by = Math.floor(y) + dy, bz = Math.floor(z) + dz, id = wd.block(bx, by, bz);
      if (id === B.AIR) continue;
      var dist = Math.hypot(bx + 0.5 - x, by + 0.5 - y, bz + 0.5 - z), res = resistance(id);
      if (power * (0.7 + Math.random() * 0.6) - dist * 0.75 - (res + 0.3) * 0.3 <= 0) continue;
      if (id === B.TNT) { this.primeTnt(bx, by, bz, 10 + Math.floor(Math.random() * 20)); continue; }   // 爆発で TNT に火がつく
      wd.setBlock(bx, by, bz, B.AIR);
      if (Math.random() < 1 / power && !FLUID[id]) this.dropFor(id, bx, by, bz);
      touched[(bx >> 4) + ',' + (bz >> 4)] = [bx, bz];
      below.push([bx, by, bz]);
    }
    Object.keys(touched).forEach(function (k) { var c = touched[k]; self.walker.remesh(c[0], c[1]); });
    below.forEach(function (c) { wd.fluids.notify(c[0], c[1], c[2]); self.checkFall(c[0], c[1] + 1, c[2]); });
    // 体力とはじき飛ばし
    var w = this.walker, pc = [w.pos[0], w.pos[1] + 0.9, w.pos[2]], d = Math.hypot(pc[0] - x, pc[1] - y, pc[2] - z);
    if (d < power * 2) {
      var imp = 1 - d / (power * 2), n = Math.floor((imp * imp + imp) / 2 * 7 * power * 2 + 1);
      this.lastFrom = [x, z];
      var hurt = this.damage(n, true, 'explosion');
      this.lastFrom = null;
      if (hurt) {
        var k = (d || 1); w.vel[0] += (pc[0] - x) / k * imp; w.vel[1] += Math.max(0.2, (pc[1] - y) / k * imp); w.vel[2] += (pc[2] - z) / k * imp;
      }
    }
    this.mobs.list.forEach(function (m) {
      var md = Math.hypot(m.x - x, m.y + 0.5 - y, m.z - z);
      if (md < power * 2) { var mi = 1 - md / (power * 2); self.mobs.hurt(m, Math.floor((mi * mi + mi) / 2 * 7 * power * 2 + 1), [x, z, mi]); }
    });
    this.puff(x, y, z, [235, 235, 230], 40, 0.5);
  };
  function resistance(id) {
    var key = WG.BLOCKS[id].key;
    if (FLUID[id] || key === 'OBSIDIAN' || key === 'BEDROCK' || key === 'END_PORTAL_FRAME') return 1e9;
    var it = ITEMS[key];
    if (it && it.tool === 'pickaxe' && it.needTier != null) return 6;
    if (it && it.tool === 'axe') return 3;
    return it ? Math.max(0.2, it.hardness) : 1;
  }

  // 煙や粉のような粒
  Game.prototype.puff = function (x, y, z, c, n, spread) {
    for (var i = 0; i < n; i++) {
      var s = spread || 0.25;
      this.particles.push({ x: x + (Math.random() - 0.5) * s * 2, y: y + (Math.random() - 0.5) * s * 2, z: z + (Math.random() - 0.5) * s * 2,
        vx: (Math.random() - 0.5) * 0.2, vy: Math.random() * 0.15, vz: (Math.random() - 0.5) * 0.2, life: 10 + Math.floor(Math.random() * 15), c: c });
    }
  };

  // ---------------- ベッド ----------------
  function isBed(id) { return WG.blockKind(id) === 'bed'; }
  // ベッドの足側の場所
  Game.prototype.bedFoot = function (x, y, z) {
    var id = this.world.block(x, y, z), d = WG.BED_DIR[id];
    if (!d) return null;
    return WG.BED_HEAD[id] ? [x - d[0], y, z - d[1]] : [x, y, z];
  };
  Game.prototype.useBed = function (x, y, z) {
    var wd = this.world, w = this.walker, foot = this.bedFoot(x, y, z);
    if (!foot) return;
    // ネザーとエンドでは眠れず、爆発する（Minecraft と同じ）
    if (wd.dimKey !== 'overworld') {
      var head = [foot[0] + WG.BED_DIR[wd.block(foot[0], foot[1], foot[2])][0], foot[1], foot[2] + WG.BED_DIR[wd.block(foot[0], foot[1], foot[2])][1]];
      wd.setBlock(foot[0], foot[1], foot[2], B.AIR); wd.setBlock(head[0], head[1], head[2], B.AIR);
      this.explode(head[0] + 0.5, head[1] + 0.5, head[2] + 0.5, 5);
      return;
    }
    this.player.bed = { x: foot[0], y: foot[1], z: foot[2], dim: wd.dimKey };
    var t = wd.time;
    if (t < 12542 || t >= 23460) { this.ui.toast('リスポーン地点を設定しました。眠れるのは夜だけです'); return; }
    if (this.mobs.near(w.pos[0], w.pos[1], w.pos[2], 8, 5, true)) { this.ui.toast('リスポーン地点を設定しました。近くに敵がいるため眠れません'); return; }
    var d = WG.BED_DIR[wd.block(foot[0], foot[1], foot[2])];
    this.sleeping = { t: 0, pos: [foot[0] + 0.5 + d[0] * 0.5, foot[1] + 0.5625, foot[2] + 0.5 + d[1] * 0.5] };
    w.pitch = 0.6;
    this.ui.toast('リスポーン地点を設定しました');
  };
  Game.prototype.wake = function () {
    var w = this.walker, sl = this.sleeping;
    this.sleeping = null;
    this.ui.sleep(0);
    if (!sl) return;
    // ベッドの横の空いた場所に立つ
    var fx = Math.floor(sl.pos[0]), fz = Math.floor(sl.pos[2]), y = this.world.block(fx, Math.floor(sl.pos[1]), fz);
    var stand = this.standNear(fx, Math.floor(sl.pos[1]), fz);
    void y;
    if (stand) { w.pos = stand; w.prev = stand.slice(); }
  };
  // ベッドのまわりで立てる場所
  Game.prototype.standNear = function (x, y, z) {
    var wd = this.world;
    for (var r = 1; r <= 2; r++) for (var dz = -r; dz <= r; dz++) for (var dx = -r; dx <= r; dx++) for (var dy = 1; dy >= -1; dy--) {
      var px = x + dx, py = y + dy, pz = z + dz;
      if (WG.COLLIDE[wd.block(px, py - 1, pz)] > 0 && !WG.COLLIDE[wd.block(px, py, pz)] && !WG.COLLIDE[wd.block(px, py + 1, pz)] && !FLUID[wd.block(px, py, pz)]) {
        var h = WG.COLLIDE[wd.block(px, py - 1, pz)];
        return [px + 0.5, py - 1 + h, pz + 0.5];
      }
    }
    return null;
  };

  Game.prototype.land = function (fall, below) {
    // 干し草の俵に落ちると、落下のダメージは 2 割になる
    var d = below === B.HAY_BALE ? Math.floor((fall - 3) * 0.2) : Math.ceil(fall - 3);
    if (d > 0) this.damage(d, true, 'fall');
    // 耕地に落ちると、落ちた高さ − 0.5 の確率で土に戻る（踏み荒らし。上の作物も取れる）
    var w = this.walker;
    this.trample(Math.floor(w.pos[0]), Math.floor(w.pos[1] - 0.05), Math.floor(w.pos[2]), fall);
  };
  Game.prototype.trample = function (x, y, z, fall) {
    var wd = this.world, id = wd.block(x, y, z);
    if ((id !== B.FARMLAND && id !== B.FARMLAND_MOIST) || !(Math.random() < fall - 0.5)) return false;
    if (isCrop(wd.block(x, y + 1, z))) this.popBlock(x, y + 1, z);
    wd.setBlock(x, y, z, B.DIRT); this.walker.remesh(x, z);
    return true;
  };

  Game.prototype.die = function () {
    var w = this.walker, s = this.inv.slots;
    this.closeInventory();
    this.dead = true;
    this.mouseL = this.mouseR = false;
    for (var i = 0; i < s.length; i++) if (s[i]) this.spawnItem(s[i].key, s[i].n, w.pos[0], w.pos[1] + 0.5, w.pos[2], 0.25, 40, s[i].dmg, s[i].ench);
    for (i = 0; i < 4; i++) if (this.armor[i]) { var am = this.armor[i]; this.spawnItem(am.key, 1, w.pos[0], w.pos[1] + 0.5, w.pos[2], 0.25, 40, am.dmg, am.ench); this.armor[i] = null; }
    // 経験値は一部が落ちる（レベル × 7、最大 100）。効果と火は消える。
    if (this.mode === 'survival') this.spawnOrbs(w.pos[0], w.pos[1] + 0.5, w.pos[2], Math.min(100, this.xp.level * 7));
    this.xp.level = 0; this.xp.points = 0;
    Object.keys(this.effects).forEach(function (k) { delete this.effects[k]; }, this);
    this.burnT = 0; this.bobber = null;
    this.inv.clear();
    this.ui.dead.classList.remove('hide');
    this.ui.unlock();
  };

  Game.prototype.respawn = function () {
    var w = this.walker, bed = this.player.bed, at = null;
    this.dead = false; this.health = MAX_HEALTH; this.air = MAX_AIR; this.invuln = 0;
    this.food = 20; this.sat = 5; this.exhaust = 0;
    // ベッドがあればその横、なければ始めた場所
    if (bed && bed.dim === this.world.dimKey && isBed(this.world.block(bed.x, bed.y, bed.z))) at = this.standNear(bed.x, bed.y, bed.z);
    else if (bed) { this.ui.toast('ベッドがないか、ふさがれています'); this.player.bed = null; }
    w.pos = at || w.spawnPoint.slice(); w.prev = w.pos.slice(); w.vel = [0, 0, 0]; w.fallDist = 0; w.flying = false;
    this.ui.dead.classList.add('hide');
    this.ui.lock();
  };

  // ---------------- 壊す・置く ----------------
  // harvest が false なら（道具が足りないとき）ドロップしない
  Game.prototype.breakBlock = function (x, y, z, harvest) {
    var wd = this.world, id = wd.block(x, y, z), surv = this.mode === 'survival', self = this;
    if (id === B.AIR || FLUID[id]) return;
    if (surv) this.exhaust += 0.005;   // ブロックを壊すと少しおなかが減る（本家と同じ）
    // チェストの中身は、その場に落ちる（まだ開けていない地下のチェストも）
    if (id === B.CHEST) {
      this.chestAt(x, y, z).forEach(function (s) { if (s) self.spawnItem(s.key, s.n, x + 0.5, y + 0.3, z + 0.5, 0.1, 10, s.dmg, s.ench); });
      wd.chests.delete(x + ',' + y + ',' + z);
      if (this.chestKey === x + ',' + y + ',' + z) this.closeInventory();
    }
    wd.setBlock(x, y, z, B.AIR);
    if (id === B.FIRE) { wd.fires.delete(x + ',' + y + ',' + z); this.walker.remesh(x, z); return; }   // 火は叩くと消える
    this.burst(x, y, z, id);
    // 扉はもう半分も一緒に取れる（ドロップは下の半分の 1 つ）
    if (isDoor(id)) {
      var upper = /U$/.test(WG.BLOCKS[id].key), oy = upper ? y - 1 : y + 1, oid = wd.block(x, oy, z);
      if (isDoor(oid)) { wd.setBlock(x, oy, z, B.AIR); if (upper) id = oid; }
    }
    if (surv && harvest !== false) this.dropFor(id, x, y, z);
    // かまどの中身は、その場に落ちる
    var fk = x + ',' + y + ',' + z, fur = wd.furnaces.get(fk);
    if (fur) {
      fur.slots.forEach(function (s) { if (s) self.spawnItem(s.key, s.n, x + 0.5, y + 0.3, z + 0.5, 0.1, 10, s.dmg, s.ench); });
      wd.furnaces.delete(fk);
      if (this.furnaceKey === fk) this.closeInventory();
    }
    // 支えを失ったもの：上の草花・トーチ、横に掛けたトーチ
    // ベッドはもう半分も一緒に取れる（ドロップは 1 つ）
    if (isBed(id)) {
      var bd = WG.BED_DIR[id], ox = WG.BED_HEAD[id] ? x - bd[0] : x + bd[0], oz = WG.BED_HEAD[id] ? z - bd[1] : z + bd[1];
      if (isBed(wd.block(ox, y, oz))) { wd.setBlock(ox, y, oz, B.AIR); this.walker.remesh(ox, oz); }
    }
    var up = wd.block(x, y + 1, z);
    if (isPlant(up) || up === B.TORCH || isCrop(up) || up === B.FIRE) this.popBlock(x, y + 1, z);
    else if (isDoor(up) && /L$/.test(WG.BLOCKS[up].key)) this.breakBlock(x, y + 1, z, surv);
    // 横に掛けたトーチとはしご
    [[1, 0, B.WALL_TORCH_E, B.LADDER_E], [-1, 0, B.WALL_TORCH_W, B.LADDER_W], [0, 1, B.WALL_TORCH_S, B.LADDER_S], [0, -1, B.WALL_TORCH_N, B.LADDER_N]].forEach(function (d) {
      var nb = wd.block(x + d[0], y, z + d[1]);
      if (nb === d[2] || nb === d[3]) self.popBlock(x + d[0], y, z + d[1]);
    });
    this.breakExtra(x, y, z, id);
    this.walker.remesh(x, z);
    wd.fluids.notify(x, y, z);
    this.checkFall(x, y + 1, z);
  };

  // 支えを失って取れる（サバイバルならドロップ）
  Game.prototype.popBlock = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z);
    wd.setBlock(x, y, z, B.AIR);
    if (this.mode === 'survival') this.dropFor(id, x, y, z);
    this.walker.remesh(x, z);
    wd.fluids.notify(x, y, z);
    this.checkFall(x, y + 1, z);
  };

  Game.prototype.dropFor = function (id, x, y, z) {
    var key = WG.BLOCKS[id].key, held = this.inv.held(), hk = held ? held.key : '', self = this;
    function drop(k, n) { if (n > 0) self.spawnItem(k, n, x + 0.5, y + 0.25, z + 0.5, 0.1, 10); }
    function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
    // 作物：実ると収穫（小麦 1 と種 0〜3、ニンジン・ジャガイモ 2〜5）、実る前は種か 1 つ（Minecraft と同じ）
    var c = cropInfo(id);
    if (c) {
      var ripe = c.stage >= c.max;
      if (c.type === 'WHEAT') { if (ripe) { drop('WHEAT', 1); drop('WHEAT_SEEDS', rnd(0, 3)); } else drop('WHEAT_SEEDS', 1); }
      else if (c.type === 'NETHER_WART') drop('NETHER_WART', ripe ? rnd(2, 4) : 1);
      else drop(c.type === 'CARROTS' ? 'CARROT' : 'POTATO', ripe ? rnd(2, 5) : 1);
      return;
    }
    if (id === B.GRAVEL && Math.random() < 0.1) { drop('FLINT', 1); return; }   // 砂利は 1 割で火打石
    if (/_LEAVES$/.test(key)) {
      if (hk === 'SHEARS') { drop(key, 1); return; }                           // ハサミなら葉そのもの
      if (id === B.OAK_LEAVES && Math.random() < 0.005) drop('APPLE', 1);       // オークの葉からリンゴ（0.5%）
      if (Math.random() < 0.02) drop('STICK', rnd(1, 2));                       // 棒（2%）
      return;
    }
    if (id === B.COBWEB && hk === 'SHEARS') { drop('COBWEB', 1); return; }
    if (this.dropExtra(id, x, y, z)) return;
    var it = ITEMS[key];
    if (!it || !it.drop || Math.random() >= it.dropChance) return;
    var n = it.dropMin + Math.floor(Math.random() * (it.dropMax - it.dropMin + 1));
    this.spawnItem(it.drop, n, x + 0.5, y + 0.25, z + 0.5, 0.1, 10);
  };

  // 流体が動いてブロックが変わったとき：面を作り直し、押し流された草花・トーチを落とす
  Game.prototype.fluidChanged = function (x, y, z, oldId, newId) {
    if ((isPlant(oldId) || isDeco(oldId)) && this.mode === 'survival') this.dropFor(oldId, x, y, z);
    this.walker.remesh(x, z, false);
  };

  // 右クリック：生き物に使う（ハサミ・バケツ）、防具を着る、扉・作業台・かまど・チェスト・ベッドを使う（Shift なら置く）、
  // 道具を使う（バケツ・火打石と打ち金・クワ・骨粉）、それ以外は置く
  Game.prototype.use = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), it = held ? ITEMS[held.key] : null, surv = this.mode === 'survival';
    var shift = w.keys.ShiftLeft || w.keys.ShiftRight;
    var mt = this.mobs.target && this.mobs.target.mob;
    if (this.useExtra(t, held, it, shift)) return;
    // スポーンエッグ：見ている面の前に生き物を出す（スポナーなら中身を変える）
    if (it && it.egg && t && !mt) { WG.useSpawnEgg(this, t, it); this.mouseR = this.clickR = false; return; }
    // えさをやる：動物は恋をして子どもを作り、子どもは早く育つ
    if (mt && it && !mt.dead && this.mobs.feed(mt, it.key)) {
      if (surv) this.inv.take(this.inv.sel, 1);
      if (WG.Sound) WG.Sound.play('eat', mt.x, mt.y + 0.5, mt.z);
      this.mouseR = this.clickR = false;
      return;
    }
    // 村人：右クリックで取引の画面
    if (mt && !mt.dead && mt.type === 'VILLAGER' && !mt.baby && !(it && it.egg)) { this.mouseR = this.clickR = false; this.openTrade(mt); return; }
    // オオカミ：骨で飼いならす（3 回に 1 回）。飼いならしたオオカミは、骨以外で右クリックすると座る・立つ
    if (mt && !mt.dead && mt.type === 'WOLF') {
      if (!mt.tame && it && it.key === 'BONE' && !mt.angry) {
        if (surv) this.inv.take(this.inv.sel, 1);
        if (Math.random() < 1 / 3) { mt.tame = true; mt.hp = mt.maxHp = 20; mt.ai.tx = null; this.puff(mt.x, mt.y + 0.9, mt.z, [220, 60, 70], 12); if (WG.advance) WG.advance(this, 'tame'); }
        else this.puff(mt.x, mt.y + 0.9, mt.z, [90, 90, 90], 6);
        this.mouseR = this.clickR = false;
        return;
      }
      if (mt.tame && !(it && it.key === 'BONE')) { mt.sit = !mt.sit; mt.vx = mt.vz = 0; this.mouseR = this.clickR = false; return; }
    }
    if (mt && it && !mt.dead) {
      // ハサミで羊の毛を刈る（白の羊毛 1〜3 個）
      if (it.key === 'SHEARS' && mt.type === 'SHEEP' && !mt.sheared) {
        mt.sheared = true;
        this.spawnItem((mt.color || 'WHITE') + '_WOOL', 1 + Math.floor(Math.random() * 3), mt.x, mt.y + 1, mt.z, 0.15, 10);
        if (surv) this.wearTool(1);
        this.mouseR = this.clickR = false;
        return;
      }
      // バケツで牛の乳をしぼる
      if (it.key === 'BUCKET' && mt.type === 'COW') { this.fillBucket('MILK_BUCKET'); this.mouseR = this.clickR = false; return; }
    }
    // 防具は右クリックで身につける（着ていたものと入れ替える）
    if (it && it.armor != null) {
      var old = this.armor[it.armor];
      this.armor[it.armor] = held; this.inv.slots[this.inv.sel] = old; this.inv.changed();
      this.mouseR = this.clickR = false;
      return;
    }
    if (t && !shift) {
      if (isDoor(t.id)) { this.mouseR = this.clickR = false; this.toggleDoor(t.x, t.y, t.z); return; }
      if (isBed(t.id)) { this.mouseR = this.clickR = false; this.useBed(t.x, t.y, t.z); return; }
      if (t.id === B.CRAFTING_TABLE) { this.mouseR = this.clickR = false; this.openInventory('table'); return; }
      if (t.id === B.CHEST) {
        this.mouseR = this.clickR = false;
        this.chestAt(t.x, t.y, t.z);
        this.chestKey = t.x + ',' + t.y + ',' + t.z;
        this.openInventory('chest');
        return;
      }
      if (t.id === B.FURNACE || t.id === B.FURNACE_LIT) {
        this.mouseR = this.clickR = false;
        var key = t.x + ',' + t.y + ',' + t.z;
        if (!this.world.furnaces.has(key)) this.world.furnaces.set(key, new Craft.Furnace());
        this.furnaceKey = key;
        this.openInventory('furnace');
        return;
      }
    }
    if (it && it.bucket != null) { this.useBucket(it); this.mouseR = this.clickR = false; return; }
    if (!t || !held) return;
    var wd = this.world;
    // 火打石と打ち金：見ている面の前に火を付ける
    if (it.igniter) {
      if (wd.block(t.px, t.py, t.pz) === B.AIR && WG.COLLIDE[t.id]) {
        if (t.id === B.TNT) this.primeTnt(t.x, t.y, t.z, 80);
        else if (!(WG.lightPortal && WG.lightPortal(this, t.px, t.py, t.pz))) this.setFire(t.px, t.py, t.pz, true, 0);
        if (WG.Sound) WG.Sound.play('ignite', t.px + 0.5, t.py + 0.5, t.pz + 0.5);
        if (surv) this.wearTool(1);
      }
      this.mouseR = this.clickR = false;
      return;
    }
    // クワ：草ブロックと土を耕す（上が空いているとき）
    if (it.tool === 'hoe') {
      if ((t.id === B.GRASS || t.id === B.DIRT) && wd.block(t.x, t.y + 1, t.z) === B.AIR && t.py !== t.y - 1) {
        wd.setBlock(t.x, t.y, t.z, B.FARMLAND); this.tickFarmland(t.x, t.y, t.z); w.remesh(t.x, t.z);
        if (surv) this.wearTool(1);
      }
      return;
    }
    // 骨粉：作物を 2〜5 段階育てる。草ブロックには草花を生やす。
    if (held.key === 'BONE_MEAL') {
      var used = false;
      if (isCrop(t.id) && !/^NETHER_WART/.test(WG.BLOCKS[t.id].key)) used = this.growCrop(t.x, t.y, t.z, 2 + Math.floor(Math.random() * 4));
      else if (t.id === B.GRASS && wd.block(t.x, t.y + 1, t.z) === B.AIR) {
        for (var q = 0; q < 24; q++) {
          var gx = t.x + Math.round((Math.random() - 0.5) * 6), gz = t.z + Math.round((Math.random() - 0.5) * 6);
          if (wd.block(gx, t.y, gz) === B.GRASS && wd.block(gx, t.y + 1, gz) === B.AIR) {
            var r = Math.random();
            wd.setBlock(gx, t.y + 1, gz, r < 0.85 ? B.SHORT_GRASS : r < 0.93 ? B.DANDELION : B.POPPY); w.remesh(gx, gz);
          }
        }
        used = true;
      }
      if (used) {
        this.puff(t.x + 0.5, t.y + 1.2, t.z + 0.5, [120, 200, 90], 10, 0.6);
        if (surv) this.inv.take(this.inv.sel, 1);
      }
      this.mouseR = this.clickR = false;
      return;
    }
    this.place();
  };

  // 扉を開け閉めする（上下の 2 マスとも）
  Game.prototype.toggleDoor = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z), key = WG.BLOCKS[id].key, oy = /U$/.test(key) ? y - 1 : y + 1;
    function flip(k) { return k.replace(/([NESW])([CO])([LU])$/, function (m, d, o, h) { return d + (o === 'C' ? 'O' : 'C') + h; }); }
    wd.setBlock(x, y, z, B[flip(key)]);
    var oid = wd.block(x, oy, z);
    if (isDoor(oid)) wd.setBlock(x, oy, z, B[flip(WG.BLOCKS[oid].key)]);
    this.walker.remesh(x, z);
  };

  // 空のバケツを 1 つ、中身の入ったバケツに替える（束なら 1 つ減らして入れる）
  Game.prototype.fillBucket = function (key) {
    var held = this.inv.held(), w = this.walker;
    if (!held) return;
    if (held.n <= 1) { this.inv.slots[this.inv.sel] = { key: key, n: 1 }; this.inv.changed(); return; }
    this.inv.take(this.inv.sel, 1);
    if (!this.inv.add(key, 1)) this.spawnItem(key, 1, w.pos[0], w.pos[1] + 1, w.pos[2], 0.1, 20);
  };
  // 見ている先の、流体の元（水源・溶岩の元）。固いブロックに当たれば null。
  Game.prototype.fluidTarget = function () {
    var w = this.walker, e = w.eye, d = w.dir, wd = this.world;
    if (!e || !d) return null;
    for (var t = 0; t <= 5; t += 0.05) {
      var x = Math.floor(e[0] + d[0] * t), y = Math.floor(e[1] + d[1] * t), z = Math.floor(e[2] + d[2] * t), id = wd.block(x, y, z);
      if (FLUID[id] && WG.FLUID_LEVEL[id] === 0) return { x: x, y: y, z: z, id: id };
      if (WG.COLLIDE[id] || WG.OPAQUE[id]) return null;
    }
    return null;
  };
  Game.prototype.useBucket = function (it) {
    var w = this.walker, wd = this.world, surv = this.mode === 'survival';
    if (it.bucket === 0) {
      var f = this.fluidTarget();
      if (!f) return;
      wd.setBlock(f.x, f.y, f.z, B.AIR); wd.fluids.notify(f.x, f.y, f.z); w.remesh(f.x, f.z);
      this.fillBucket(FLUID[f.id] === 1 ? 'WATER_BUCKET' : 'LAVA_BUCKET');
      return;
    }
    var t = w.target;
    if (!t) return;
    var x = t.px, y = t.py, z = t.pz;
    if (isPlant(t.id)) { x = t.x; y = t.y; z = t.z; }
    if (!replaceable(wd.block(x, y, z))) return;
    if (it.bucket === 1 && wd.dimKey === 'nether') this.puff(x + 0.5, y + 0.5, z + 0.5, [230, 230, 230], 14, 0.8);   // ネザーでは水は蒸発する
    else { wd.setBlock(x, y, z, it.bucket === 1 ? B.WATER : B.LAVA); wd.fluids.notify(x, y, z); w.remesh(x, z); }
    if (surv) { this.inv.slots[this.inv.sel] = { key: 'BUCKET', n: 1 }; this.inv.changed(); }
  };

  // 見ている向き（東西南北）
  Game.prototype.facing = function () {
    var w = this.walker, fx = -Math.sin(w.yaw), fz = -Math.cos(w.yaw);
    return Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 'E' : 'W') : (fz > 0 ? 'S' : 'N');
  };
  // 体と重ならないか（x, y, z のマスの高さ h まで）
  Game.prototype.bodyFree = function (x, y, z, h) {
    var b = this.walker.box();
    return !(b[0] < x + 1 && b[3] > x && b[1] < y + h && b[4] > y && b[2] < z + 1 && b[5] > z);
  };
  // 扉：下と上の 2 マス、下が固いこと。向きは見ている向き。
  Game.prototype.placeDoor = function (t, wood) {
    var wd = this.world, x = isPlant(t.id) ? t.x : t.px, y = isPlant(t.id) ? t.y : t.py, z = isPlant(t.id) ? t.z : t.pz, d = this.facing();
    if (!replaceable(wd.block(x, y, z)) || !replaceable(wd.block(x, y + 1, z)) || WG.COLLIDE[wd.block(x, y - 1, z)] < 1) return;
    if (!this.bodyFree(x, y, z, 2)) return;
    wd.setBlock(x, y, z, B[wood + '_DOOR_' + d + 'CL']); wd.setBlock(x, y + 1, z, B[wood + '_DOOR_' + d + 'CU']);
    if (this.mode === 'survival') this.inv.take(this.inv.sel, 1);
    this.walker.remesh(x, z);
  };
  // はしご：固いブロックの横の面にだけ付く
  Game.prototype.placeLadder = function (t) {
    var wd = this.world, dx = t.px - t.x, dz = t.pz - t.z;
    if (t.py !== t.y || !(dx || dz) || !SOLID[t.id] || !WG.OPAQUE[t.id] || !replaceable(wd.block(t.px, t.py, t.pz))) return;
    wd.setBlock(t.px, t.py, t.pz, B['LADDER_' + (dx > 0 ? 'E' : dx < 0 ? 'W' : dz > 0 ? 'S' : 'N')]);
    if (this.mode === 'survival') this.inv.take(this.inv.sel, 1);
    this.walker.remesh(t.px, t.pz);
  };
  // 作物を植える：耕地の上の面に
  Game.prototype.plantCrop = function (t, it) {
    var wd = this.world;
    if ((t.id !== B.FARMLAND && t.id !== B.FARMLAND_MOIST) || t.py !== t.y + 1 || wd.block(t.px, t.py, t.pz) !== B.AIR) return;
    wd.setBlock(t.px, t.py, t.pz, B[it.plant]);
    if (this.mode === 'survival') this.inv.take(this.inv.sel, 1);
    this.walker.remesh(t.px, t.pz);
  };

  Game.prototype.place = function () {
    var w = this.walker, t = w.target, held = this.inv.held();
    if (!t || !held) return;
    var it = ITEMS[held.key], wd = this.world, override = null;
    if (this.placeExtra(t, it)) return;
    if (it && it.bed) { this.placeBed(t); return; }
    if (it && it.door) { this.placeDoor(t, it.door); return; }
    if (it && it.ladder) { this.placeLadder(t); return; }
    if (it && it.plant) { this.plantCrop(t, it); return; }
    // 階段は見ている向きに上る形で置く
    // 下の面、または横の面の上半分に付けると逆さま（Minecraft と同じ）
    var upper = t.py === t.y - 1 || (t.py === t.y && t.hy > 0.5);
    if (it && it.stairs) override = B[it.stairs + '_STAIRS_' + this.facing() + (upper ? '_T' : '')];
    // ハーフブロック：同じハーフブロックの空いた側に重ねると 2 段。下の面に付けると上半分に置く。
    if (it && it.slab) {
      var sb = B[it.slab + '_SLAB'], st = B[it.slab + '_SLAB_TOP'], sd = B[it.slab + '_SLAB_DOUBLE'];
      var into = null;
      if ((t.id === sb && t.py === t.y + 1 && t.px === t.x && t.pz === t.z) || (t.id === st && t.py === t.y - 1 && t.px === t.x && t.pz === t.z)) into = [t.x, t.y, t.z];
      else { var cur = wd.block(t.px, t.py, t.pz); if (cur === sb || cur === st) into = [t.px, t.py, t.pz]; }
      if (into) {
        wd.setBlock(into[0], into[1], into[2], sd);
        if (this.mode === 'survival') this.inv.take(this.inv.sel, 1);
        w.remesh(into[0], into[2]);
        return;
      }
      override = upper ? st : sb;
    }
    if (!it || (it.block < 0 && override == null)) return;
    var x, y, z, blockId = override != null ? override : it.block;
    if (isPlant(t.id) && replaceable(t.id)) { x = t.x; y = t.y; z = t.z; } else { x = t.px; y = t.py; z = t.pz; }
    if (y < wd.minY || y > wd.maxY || !replaceable(wd.block(x, y, z))) return;
    if (isPlant(blockId) && !SOLID[wd.block(x, y - 1, z)]) return;
    if (WG.SUPPORT[blockId] && !WG.OPAQUE[wd.block(x, y - 1, z)]) return;   // 感圧板は固いブロックの上だけ
    if (blockId === B.TORCH) {
      // 上の面なら床置き、横の面なら壁掛け（下の面には付けられない）
      var dx = x - t.x, dz = z - t.z;
      if (y === t.y + 1 && dx === 0 && dz === 0) { if (!SOLID[wd.block(x, y - 1, z)]) return; }
      else if (y === t.y && SOLID[t.id]) blockId = dx === 1 ? B.WALL_TORCH_E : dx === -1 ? B.WALL_TORCH_W : dz === 1 ? B.WALL_TORCH_S : B.WALL_TORCH_N;
      else return;
    }
    // 自分の体と重なる場所には置けない
    if (WG.COLLIDE[blockId] > 0 && !this.bodyFree(x, y, z, Math.min(1, WG.COLLIDE[blockId]))) return;
    wd.setBlock(x, y, z, blockId);
    if (blockId === B.CHEST) wd.chests.set(x + ',' + y + ',' + z, new Array(27).fill(null));   // 置いたチェストは空
    if (this.mode === 'survival') this.inv.take(this.inv.sel, 1);
    w.remesh(x, z);
    wd.fluids.notify(x, y, z);
    this.checkFall(x, y, z);
  };

  // ベッドを置く：見ている向きに頭が来るよう 2 マス。どちらのマスも空いていて、下が固いこと。
  Game.prototype.placeBed = function (t) {
    var w = this.walker, wd = this.world, fx = -Math.sin(w.yaw), fz = -Math.cos(w.yaw);
    var dir = Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 'E' : 'W') : (fz > 0 ? 'S' : 'N'), d = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[dir];
    var x = isPlant(t.id) ? t.x : t.px, y = isPlant(t.id) ? t.y : t.py, z = isPlant(t.id) ? t.z : t.pz, hx = x + d[0], hz = z + d[1];
    if (!replaceable(wd.block(x, y, z)) || !replaceable(wd.block(hx, y, hz))) return;
    if (WG.COLLIDE[wd.block(x, y - 1, z)] < 1 || WG.COLLIDE[wd.block(hx, y - 1, hz)] < 1) return;
    var b = w.box();
    if ([[x, z], [hx, hz]].some(function (c) { return b[0] < c[0] + 1 && b[3] > c[0] && b[1] < y + 0.5625 && b[4] > y && b[2] < c[1] + 1 && b[5] > c[1]; })) return;
    wd.setBlock(x, y, z, B['BED_FOOT_' + dir]); wd.setBlock(hx, y, hz, B['BED_HEAD_' + dir]);
    if (this.mode === 'survival') this.inv.take(this.inv.sel, 1);
    w.remesh(x, z); w.remesh(hx, hz);
  };

  // チェストの中身（27 枠）。地下の部屋のチェストは、初めて開いたときに中身が決まる（場所とシードで決まる）。
  var LOOT_OVER = [['COAL', 1, 6, 10], ['IRON_INGOT', 1, 4, 10], ['GOLD_INGOT', 1, 4, 5], ['REDSTONE', 1, 4, 10], ['WHEAT_SEEDS', 2, 4, 10],
    ['LAPIS', 1, 3, 6], ['RAW_COPPER', 1, 5, 8], ['TORCH', 2, 6, 6], ['DIAMOND', 1, 2, 2], ['IRON_PICKAXE', 1, 1, 2],
    ['BREAD', 1, 3, 8], ['APPLE', 1, 3, 6], ['WHEAT', 1, 5, 6], ['CARROT', 1, 4, 4], ['POTATO', 1, 4, 4], ['BONE', 1, 4, 6],
    ['STRING', 1, 4, 6], ['ARROW', 2, 8, 5], ['IRON_SWORD', 1, 1, 2], ['IRON_HELMET', 1, 1, 1], ['BUCKET', 1, 1, 2], ['GOLDEN_APPLE', 1, 1, 1],
    ['SLIME_BALL', 1, 3, 4], ['BOOK', 1, 3, 4], ['PAPER', 1, 5, 4], ['SUGAR_CANE', 1, 4, 3], ['GLISTERING_MELON_SLICE', 1, 2, 2], ['RABBIT_FOOT', 1, 1, 1],
    ['SADDLE', 1, 1, 4], ['NAME_TAG', 1, 1, 3], ['COCOA_BEANS', 1, 4, 4]];
  // ネザーの要塞のチェスト（ブレイズやガストがいないので、その材料もここに入れている）
  var LOOT_NETHER = [['BLAZE_ROD', 1, 3, 10], ['NETHER_WART', 2, 6, 10], ['GHAST_TEAR', 1, 2, 6], ['MAGMA_CREAM', 1, 3, 6], ['GOLD_INGOT', 1, 5, 10],
    ['IRON_INGOT', 1, 5, 8], ['DIAMOND', 1, 3, 4], ['OBSIDIAN', 2, 6, 3], ['FLINT_AND_STEEL', 1, 1, 3], ['GLISTERING_MELON_SLICE', 1, 3, 4], ['RABBIT_FOOT', 1, 2, 3], ['SLIME_BALL', 1, 3, 3]];
  Game.prototype.chestAt = function (x, y, z) {
    var wd = this.world, key = x + ',' + y + ',' + z, c = wd.chests.get(key);
    if (c) return c;
    c = new Array(27).fill(null);
    var LOOT = wd.dimKey === 'nether' ? LOOT_NETHER : LOOT_OVER;
    var seed = wd.seed || 0, n = 3 + WG.hash(seed, x, y, z, 71) % 4, total = LOOT.reduce(function (a, l) { return a + l[3]; }, 0);
    for (var i = 0; i < n; i++) {
      var r = WG.hash(seed, x, y, z, 72 + i) % total, l = LOOT[0];
      for (var j = 0; j < LOOT.length; j++) { if (r < LOOT[j][3]) { l = LOOT[j]; break; } r -= LOOT[j][3]; }
      var cnt = l[1] + WG.hash(seed, x, y, z, 82 + i) % (l[2] - l[1] + 1), at = WG.hash(seed, x, y, z, 92 + i) % 27;
      while (c[at]) at = (at + 1) % 27;
      c[at] = { key: l[0], n: cnt };
    }
    wd.chests.set(key, c);
    return c;
  };

  // 見ているブロックを持つ（中クリック）
  Game.prototype.pickBlock = function () {
    var t = this.walker.target;
    if (!t) return;
    var key = WG.BLOCKS[t.id].key, s = this.inv.slots, i;
    if (/^WALL_TORCH_/.test(key)) key = 'TORCH';
    if (key === 'FURNACE_LIT') key = 'FURNACE';
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
    var e = this.spawnItem(s.key, s.n, w.eye[0], w.eye[1] - 0.3, w.eye[2], 0, 40, held.dmg, held.ench, WG.itemExtra(held));
    e.vx = d[0] * 0.3; e.vy = d[1] * 0.3 + 0.1; e.vz = d[2] * 0.3;
  };

  // ---------------- 落ちているアイテムと粒 ----------------
  // アイテムが持つ、key・n・dmg・ench 以外のもの（地図の場所、箱の中身、旗の模様など）。捨てて拾っても残す
  WG.itemExtra = function (s) {
    var o = null;
    if (s) Object.keys(s).forEach(function (k) { if (k !== 'key' && k !== 'n' && k !== 'dmg' && k !== 'ench') (o || (o = {}))[k] = s[k]; });
    return o;
  };
  Game.prototype.spawnItem = function (key, n, x, y, z, spread, delay, dmg, ench, extra) {
    var e = {
      dmg: dmg || 0, ench: ench, extra: extra || null,
      key: key, n: n, x: x, y: y, z: z, px: x, py: y, pz: z,
      vx: (Math.random() - 0.5) * spread, vy: 0.2 * (spread > 0 ? 1 : 0), vz: (Math.random() - 0.5) * spread,
      age: Math.floor(Math.random() * 100), delay: delay, ground: false
    };
    this.entities.push(e);
    if (this.entities.length > 400) this.entities.shift();
    return e;
  };

  Game.prototype.burst = function (x, y, z, id, itemKey) {
    var c = itemKey && ITEMS[itemKey].color ? hexRGB(ITEMS[itemKey].color) : WG.blockColor(id, 'side', WG.BI ? WG.BI.PLAINS : -1);
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
      var cx = Math.floor(e.x), cy = Math.floor(e.y + 0.125), cz = Math.floor(e.z);
      if (SOLID[wd.block(cx, cy, cz)]) {
        // ブロックの中にいたら、いちばん近い空いた面から外へ押し出す（Minecraft と同じ）
        var fx = e.x - cx, fy = e.y + 0.125 - cy, fz = e.z - cz, best = null, bd = 9;
        [[1, 0, 0, 1 - fx], [-1, 0, 0, fx], [0, 1, 0, 1 - fy], [0, -1, 0, fy], [0, 0, 1, 1 - fz], [0, 0, -1, fz]].forEach(function (d) {
          if (!SOLID[wd.block(cx + d[0], cy + d[1], cz + d[2])] && d[3] < bd) { bd = d[3]; best = d; }
        });
        if (!best) best = [0, 1, 0];
        var sp = 0.1 + Math.random() * 0.2;
        e.vx = best[0] ? best[0] * sp : e.vx * 0.5; e.vy = best[1] ? best[1] * sp : e.vy * 0.5; e.vz = best[2] ? best[2] * sp : e.vz * 0.5;
        e.x += e.vx; e.y += e.vy; e.z += e.vz;
      } else {
        var here = wd.block(cx, cy, cz);
        // 溶岩や火に落ちたアイテムは燃えてなくなる（ネザライトの物は燃えない）
        if ((WG.isLava(here) || here === B.FIRE) && !/NETHERITE|ANCIENT_DEBRIS/.test(e.key)) { if (this.puff) this.puff(e.x, e.y + 0.3, e.z, [70, 70, 70], 4, 0.06); continue; }
        if (WG.isWater(here)) {
          e.vy = Math.min(e.vy + 0.02, 0.06);
          var flow = WG.fluidFlow(wd, cx, cy, cz);
          if (flow) { e.vx += flow[0] * 0.014; e.vy += flow[1] * 0.014; e.vz += flow[2] * 0.014; }
        } else e.vy -= 0.04;
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
      }
      if (e.delay > 0) e.delay--;
      // 拾う（体の周り 1 ブロック、上下 0.5 ブロックの範囲）
      if (!this.dead && !this.spectator && e.delay === 0 && e.x > pb[0] - 1 && e.x < pb[3] + 1 && e.y + 0.25 > pb[1] - 0.5 && e.y < pb[4] + 0.5 && e.z > pb[2] - 1 && e.z < pb[5] + 1) {
        var got = this.inv.add(e.key, e.n, e.dmg, e.ench, e.extra);
        e.n -= got;
        if (got && WG.Sound) WG.Sound.play('pop', e.x, e.y, e.z);
      }
      if (e.n > 0 && e.age < 6000 && e.y > wd.minY - 64) keep.push(e);
    }
    this.entities.length = 0;
    Array.prototype.push.apply(this.entities, keep);
    keep = [];
    for (i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      p.vy -= p.smoke ? -0.001 : p.fw ? 0.006 : 0.04; if (p.fw) { p.vx *= 0.93; p.vy *= 0.93; p.vz *= 0.93; } p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vx *= 0.98; p.vz *= 0.98;
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

  function Batch(alpha) { this.pos = []; this.col = []; this.uv = []; this.lt = []; this.alpha = alpha; this.L = [15, 0]; }
  Batch.prototype.v = function (x, y, z, c, f, u, v, tile) {
    this.pos.push(x * 16, y * 16, z * 16, 0);
    this.col.push(Math.min(255, c[0] * f * 0.5) | 0, Math.min(255, c[1] * f * 0.5) | 0, Math.min(255, c[2] * f * 0.5) | 0, 0);
    this.uv.push(u, v, tile & 255, tile >> 8);
    this.lt.push(this.L[0] * 17, this.L[1] * 17, 0, 0);   // 光の段階（明るさは描くときに時刻で決まる）
  };
  Batch.prototype.done = function () {
    return { pos: new Float32Array(this.pos), col: new Uint8Array(this.col), uv: new Uint8Array(this.uv), lt: new Uint8Array(this.lt), count: this.pos.length / 4, alpha: this.alpha };
  };
  // 回した立方体（中心 cx, cz、底 y、大きさ s、回転 r、光の段階 lt）
  function hexRGB(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  // 生き物の体の箱：o（1/16 単位の角）、s（大きさ）、tf（ローカル → 世界の座標）、c（色）
  function modelBox(bt, o, s, tf, c) {
    FACES.forEach(function (F) {
      var P = F[0].map(function (p) { return tf(o[0] + p[0] * s[0], o[1] + p[1] * s[1], o[2] + p[2] * s[2]); });
      TRI.forEach(function (k) { bt.v(P[k][0], P[k][1], P[k][2], c, F[1], UV[k][0], UV[k][1], 0); });
    });
  }
  function cube(bt, cx, y, cz, s, r, tileOf, colorOf, lt) {
    bt.L = lt;
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
  // 4 隅を指定した、見た目のある 1 枚（左上・右上・右下・左下の順）。絵画・額縁・看板などに使う
  WG.quad3d = function (bt, P, tile, c, lt) { bt.L = lt; TRI.forEach(function (k) { bt.v(P[k][0], P[k][1], P[k][2], c, 1, UV[k][0], UV[k][1], tile); }); };
  WG.modelBox = function (bt, o, s, tf, c, lt) { bt.L = lt; modelBox(bt, o, s, tf, c); };
  function sprite(bt, cx, y, cz, s, r, tile, c, lt) {
    bt.L = lt;
    var cr = Math.cos(r) * s / 2, sr = Math.sin(r) * s / 2;
    var P = [[cx - cr, y + s, cz - sr], [cx + cr, y + s, cz + sr], [cx + cr, y, cz + sr], [cx - cr, y, cz - sr]];
    TRI.forEach(function (k) { bt.v(P[k][0], P[k][1], P[k][2], c, 1, UV[k][0], UV[k][1], tile); });
  }

  Game.prototype.draw = function (a) {
    var solid = new Batch(1), crack = new Batch(0.55), plains = WG.BI ? WG.BI.PLAINS : -1, WHITE = [255, 255, 255], w = this.walker;
    this.entities.forEach(function (e) {
      var x = e.px + (e.x - e.px) * a, y = e.py + (e.y - e.py) * a, z = e.pz + (e.z - e.pz) * a;
      var t = e.age + a, r = t / 20, bob = Math.sin(t / 10) * 0.1 + 0.1, it = ITEMS[e.key], lt = w.lightLevels(x, y + 0.2, z);
      var bid = it.block >= 0 ? it.block : it.icon != null ? it.icon : -1;
      if (bid >= 0 && !isPlant(bid) && !isDeco(bid) && !WG.itemIcon16(e.key)) {
        cube(solid, x, y + bob, z, 0.25, r, function (f) { return WG.atlasTile(bid, f); }, function (f) {
          return WG.skinTexture(bid, f) ? WG.tintOf(bid, f, plains).map(function (m) { return m * 255; }) : WG.blockColor(bid, f, plains);
        }, lt);
      } else {
        var tile = it.block >= 0 && !WG.itemIcon16(e.key) ? WG.atlasTile(it.block, 'side') : WG.itemTile(e.key);
        var c = it.block === B.SHORT_GRASS ? WG.tintOf(it.block, 'side', plains).map(function (m) { return m * 255; }) : WHITE;
        sprite(solid, x, y + bob, z, 0.4, r, tile, c, lt);
      }
    });
    this.particles.forEach(function (p) {
      cube(solid, p.x, p.y, p.z, p.fw ? 0.11 : 0.08, 0, function () { return 0; }, function () { return p.c; }, p.glow ? [15, 15] : w.lightLevels(p.x, p.y, p.z));
    });
    // 落ちてくる砂・砂利（ブロックと同じ大きさ）
    this.falling.forEach(function (f) {
      var y = f.py + (f.y - f.py) * a;
      cube(solid, f.x, y, f.z, 1, 0, function (fc) { return WG.atlasTile(f.id, fc); }, function () { return WHITE; }, w.lightLevels(f.x, y + 0.5, f.z));
    });
    var b = this.breaking;
    if (b && b.p > 0) {
      var ct = WG.crackTile(Math.floor(b.p * 4));
      cube(crack, b.x + 0.5, b.y - 0.003, b.z + 0.5, 1.006, 0, function () { return ct; }, function () { return WHITE; }, [15, 0]);
    }
    // 生き物と矢。視線の先の生き物（叩ける相手）も探す。
    this.mobs.draw(solid, a, modelBox);
    this.drawExtra(solid, a, cube);
    var reach = this.mode === 'creative' ? 5 : 3, mt = w.eye ? this.mobs.pick(w.eye, w.dir, reach) : null;
    if (mt && w.target) {
      var tc = [w.target.x + 0.5 - w.eye[0], w.target.y + 0.5 - w.eye[1], w.target.z + 0.5 - w.eye[2]];
      if (Math.hypot(tc[0], tc[1], tc[2]) < mt.dist - 0.5) mt = null;
    }
    this.mobs.target = mt;
    if (mt) this.view.outline = null;
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
    var half = H.map(function (r) { return r.split('').map(function (ch, i) { return ch === 'f' && i > 3 ? 'e' : ch; }).join(''); });
    var empty = H.map(function (r) { return r.replace(/f/g, 'e'); });
    var col = { o: '#1d1b1b', f: '#b9473f', e: '#3a3434' };
    var bubble = ['..ooo..', '.obbbo.', 'obwbbbo', 'obbbbbo', 'obbbbbo', '.obbbo.', '..ooo..'];
    var meat = ['...ooo.', '..offfo', '.offffo', 'offfffo', 'obffoo.', 'ob.oo..', '.o.....'];
    var meatHalf = meat.map(function (r) { return r.split('').map(function (ch, i) { return ch === 'f' && i < 4 ? 'e' : ch; }).join(''); });
    var meatEmpty = meat.map(function (r) { return r.replace(/f/g, 'e'); });
    var mc = { o: '#231a14', f: '#b0703c', e: '#3a3430', b: '#e3dccb' };
    var arm = ['oo.o.oo', 'offoffo', 'offfffo', '.offfo.', '.offfo.', '.offfo.', '.ooooo.'];
    var armHalf = arm.map(function (r) { return r.split('').map(function (ch, i) { return ch === 'f' && i > 3 ? 'e' : ch; }).join(''); });
    var armEmpty = arm.map(function (r) { return r.replace(/f/g, 'e'); });
    var ac = { o: '#1f2023', f: '#c8ccd2', e: '#3a3b3f' };
    heartURLs = {
      full: pixelIcon(H, col), half: pixelIcon(half, col), empty: pixelIcon(empty, col),
      bubble: pixelIcon(bubble, { o: '#1d2733', b: '#6f9cc9', w: '#dce8f2' }),
      food: pixelIcon(meat, mc), foodHalf: pixelIcon(meatHalf, mc), foodEmpty: pixelIcon(meatEmpty, mc),
      armor: pixelIcon(arm, ac), armorHalf: pixelIcon(armHalf, ac), armorEmpty: pixelIcon(armEmpty, ac)
    };
    return heartURLs;
  }

  function slotHTML(s) {
    if (!s) return '';
    var it = ITEMS[s.key], bar = '';
    if (it && it.dur && s.dmg) {
      var left = 1 - s.dmg / it.dur;
      bar = '<span class="dur"><i style="width:' + Math.round(left * 100) + '%;background:hsl(' + Math.round(left * 110) + ',55%,48%)"></i></span>';
    }
    var gl = s.ench && Object.keys(s.ench).length ? ' class="ench"' : '';
    return '<img src="' + WG.iconURL(s.key) + '" alt=""' + gl + '>' + (s.n > 1 ? '<span class="n">' + s.n + '</span>' : '') + bar;
  }

  Game.prototype.updateHud = function () {
    var ui = this.ui, surv = this.mode === 'survival', inv = this.inv;
    ui.hud.classList.toggle('hide', this.dead);
    if (this.screen === 'furnace') this.updateFurnaceBars();
    var ap = surv ? this.armorPoints()[0] : 0;
    this.updateHudExtra();
    var key = [inv.version, inv.sel, this.mode, surv ? this.health : '', surv && this.air < MAX_AIR ? Math.ceil(Math.max(0, this.air) / 30) : '', surv ? this.food : '', ap].join('|');
    if (key === this.hudKey) return;
    var prevSel = this.hudKey ? +this.hudKey.split('|')[1] : -1, prevVer = this.hudKey ? +this.hudKey.split('|')[0] : -1;
    this.hudKey = key;
    var html = '';
    for (var i = 0; i < 9; i++) html += '<div class="slot' + (i === inv.sel ? ' sel' : '') + '">' + slotHTML(inv.slots[i]) + '</div>';
    ui.hotbar.innerHTML = html;
    var hu = hearts(), h = '';
    if (surv) for (i = 0; i < 10; i++) h += '<img src="' + (this.health >= i * 2 + 2 ? hu.full : this.health === i * 2 + 1 ? hu.half : hu.empty) + '" alt="">';
    ui.hearts.innerHTML = h;
    // 防御の点（胸当ての絵 10 個、左から）
    var ar = '';
    if (ap > 0) for (i = 0; i < 10; i++) ar += '<img src="' + (ap >= i * 2 + 2 ? hu.armor : ap === i * 2 + 1 ? hu.armorHalf : hu.armorEmpty) + '" alt="">';
    if (ui.armor) ui.armor.innerHTML = ar;
    var bub = '';
    if (surv && this.air < MAX_AIR) for (i = 0; i < Math.ceil(Math.max(0, this.air) / 30); i++) bub += '<img src="' + hu.bubble + '" alt="">';
    ui.air.innerHTML = bub;
    // 満腹度（右から減っていく）
    var fd = '';
    if (surv) for (i = 0; i < 10; i++) fd += '<img src="' + (this.food >= i * 2 + 2 ? hu.food : this.food === i * 2 + 1 ? hu.foodHalf : hu.foodEmpty) + '" alt="">';
    ui.food.innerHTML = fd;
    // 持ち替えたら名前を少し見せる
    var held = inv.held();
    if (prevSel !== inv.sel || prevVer !== inv.version) {
      if (held && (prevSel !== inv.sel || this.lastName !== held.key)) {
        ui.itemName.textContent = WG.itemName(held.key);
        ui.itemName.classList.remove('fade'); void ui.itemName.offsetWidth; ui.itemName.classList.add('fade');
      }
      this.lastName = held ? held.key : null;
    }
    if (this.invOpen) this.renderInventory();
  };

  // ---------------- インベントリ・作業台・かまどの画面 ----------------
  Game.prototype.toggleInventory = function () {
    if (this.dead) return;
    if (this.invOpen) { this.closeInventory(); this.ui.lock(); }
    else this.openInventory(this.mode === 'creative' ? 'creative' : 'inv');
  };
  Game.prototype.openInventory = function (screen) {
    this.invOpen = true;
    this.screen = screen;
    this.mouseL = this.mouseR = false;
    this.craftN = screen === 'table' ? 3 : 2;
    this.craft = new Array(this.craftN * this.craftN).fill(null);
    this.craftResult = null;
    this.ui.inv.classList.remove('hide');
    this.renderInventory();
    this.ui.unlock();
  };
  Game.prototype.closeInventory = function () {
    if (!this.invOpen) return;
    this.invOpen = false;
    var w = this.walker, self = this;
    // クラフトの枠に残ったものと、手に持ったままのものはインベントリへ戻す（入らなければ足元に落とす）。
    // クリエイティブの一覧から取ったものは消す。
    var back = this.craft.filter(Boolean).concat(this.enchSlots.filter(Boolean), this.anvilSlots.filter(Boolean), (this.workSlots || []).filter(Boolean));
    this.workSlots = [null, null];
    this.enchSlots = [null, null]; this.anvilSlots = [null, null]; this.offers = null; this.brewKey = null;
    if (this.cursor && !(this.screen === 'creative')) back.push(this.cursor);
    back.forEach(function (s) {
      var left = s.n - self.inv.add(s.key, s.n, s.dmg, s.ench);
      if (left > 0) self.spawnItem(s.key, left, w.pos[0], w.pos[1] + 1, w.pos[2], 0.1, 40, s.dmg, s.ench);
    });
    if (this.tradeMob) { this.tradeMob.trading = false; this.tradeMob = null; }
    this.craft = []; this.craftResult = null; this.cursor = null; this.screen = null; this.furnaceKey = null; this.chestKey = null; this.lastScreen = null; this.contKey = null;
    this.ui.inv.classList.add('hide');
    this.ui.cursor.classList.add('hide');
  };

  Game.prototype.furnace = function () { return this.furnaceKey ? this.world.furnaces.get(this.furnaceKey) : null; };

  WG.slotHTMLFull = function (c, i, s, extra) { return slot(c, i, s, extra); };
  function slot(c, i, s, extra) {
    var tt = s ? WG.itemName(s.key) + (s.ench && Object.keys(s.ench).length ? '（' + WG.enchText(s.ench) + '）' : '') : '';
    return '<div class="slot' + (extra || '') + '" data-c="' + c + '" data-i="' + i + '"' + (s ? ' title="' + tt + '"' : '') + '>' + slotHTML(s) + '</div>';
  }

  Game.prototype.renderInventory = function () {
    var ui = this.ui, s = this.inv.slots, i, html = '', sc = this.screen;
    ui.invTitle.textContent = { creative: 'クリエイティブ', inv: 'インベントリ', table: '作業台', furnace: this.furnaceName || 'かまど', chest: 'チェスト', etable: 'エンチャント', brew: '醸造台', anvil: '金床', trade: '取引', adv: '進捗', box: this.boxTitle || '樽', loom: '機織り機', beacon: 'ビーコン', smith: '鍛冶台', cutter: '石切台', carto: '製図台', hopper: 'ホッパー', disp: /^DROPPER/.test(WG.BLOCKS[this.world.block.apply(this.world, (this.contKey || '0,0,0').split(',').map(Number))].key) ? 'ドロッパー' : 'ディスペンサー' }[sc];
    if (sc === 'etable' || sc === 'brew' || sc === 'anvil' || sc === 'hopper' || sc === 'disp' || (WG.EXTRA_SCREENS && WG.EXTRA_SCREENS[sc])) html += this.renderExtraScreen(sc);
    if (sc === 'trade') html += this.renderTrade();
    if (sc === 'adv') html += this.renderAdvancements();
    if (sc === 'creative') {
      html += '<div class="grid pal">';
      WG.PLACEABLE.concat(Object.keys(ITEMS).filter(function (k) { return ITEMS[k].block < 0; })).forEach(function (k) {
        html += '<div class="slot" data-c="pal" data-i="' + k + '" title="' + WG.itemName(k) + '"><img src="' + WG.iconURL(k) + '" alt=""></div>';
      });
      html += '</div>';
    } else if (sc === 'inv' || sc === 'table') {
      var n = this.craftN;
      html += '<div class="craft">';
      // インベントリの画面では、左に防具の 4 枠（頭・胴・脚・足）
      if (sc === 'inv') {
        html += '<div class="armcol">';
        for (i = 0; i < 4; i++) html += slot('arm', i, this.armor[i], ' arm');
        html += '</div>';
      }
      html += '<div class="cgrid" style="grid-template-columns:repeat(' + n + ',44px)">';
      for (i = 0; i < n * n; i++) html += slot('craft', i, this.craft[i]);
      html += '</div><div class="arrow"></div>' + slot('res', 0, this.craftResult, ' result') + '</div>';
    } else if (sc === 'chest') {
      var ch = this.world.chests.get(this.chestKey);
      html += '<div class="grid chest">';
      for (i = 0; i < 27; i++) html += slot('ch', i, ch[i]);
      html += '</div>';
    } else if (sc === 'furnace') {
      var f = this.furnace();
      html += '<div class="craft furn"><div class="fcol">' + slot('fur', 0, f.slots[0]) + '<div class="flame"><i id="flameBar"></i></div>' + slot('fur', 1, f.slots[1]) +
        '</div><div class="arrow prog"><i id="cookBar"></i></div>' + slot('fur', 2, f.slots[2], ' result') + '</div>';
    }
    if (sc !== 'creative') {
      html += '<div class="grid">';
      for (i = 9; i < 36; i++) html += slot('inv', i, s[i]);
      html += '</div>';
    }
    html += '<div class="grid bar">';
    for (i = 0; i < 9; i++) html += slot('inv', i, s[i], i === this.inv.sel ? ' sel' : '');
    html += '</div>';
    // 描き直してもスクロールの位置を保つ（クリエイティブの一覧など）
    var pal = ui.invBody.querySelector && ui.invBody.querySelector('.pal'), keepTop = pal ? pal.scrollTop : 0, bodyTop = ui.invBody.scrollTop || 0;
    ui.invBody.innerHTML = html;
    var pal2 = ui.invBody.querySelector && ui.invBody.querySelector('.pal');
    if (pal2 && sc === this.lastScreen) pal2.scrollTop = keepTop;
    if (sc === this.lastScreen) ui.invBody.scrollTop = bodyTop;
    this.lastScreen = sc;
    ui.cursor.innerHTML = slotHTML(this.cursor);
    ui.cursor.classList.toggle('hide', !this.cursor);
    if (sc === 'furnace') this.updateFurnaceBars();
  };

  Game.prototype.updateFurnaceBars = function () {
    var f = this.furnace(), fb = document.getElementById('flameBar'), cb = document.getElementById('cookBar');
    if (!f || !fb || !cb) return;
    fb.style.height = (f.burnMax ? f.burn / f.burnMax * 100 : 0) + '%';
    cb.style.width = (f.cook / Craft.COOK * 100) + '%';
    // かまどの中身が変わったら枠も描き直す
    var sig = JSON.stringify(f.slots);
    if (sig !== this.furnaceSig) { this.furnaceSig = sig; if (this.lastFurnaceRender !== sig) { this.lastFurnaceRender = sig; this.renderInventory(); } }
  };

  // 枠の中身を読む・書く
  Game.prototype.getSlot = function (c, i) {
    if (c === 'inv') return this.inv.slots[i];
    if (c === 'craft') return this.craft[i];
    if (c === 'fur') return this.furnace().slots[i];
    if (c === 'ch') return this.world.chests.get(this.chestKey)[i];
    if (c === 'arm') return this.armor[i];
    var ex = this.getExtraSlot(c, i);
    return ex === undefined ? null : ex;
  };
  Game.prototype.setSlot = function (c, i, v) {
    if (v && v.n <= 0) v = null;
    if (c === 'inv') this.inv.slots[i] = v;
    else if (c === 'craft') this.craft[i] = v;
    else if (c === 'fur') this.furnace().slots[i] = v;
    else if (c === 'ch') this.world.chests.get(this.chestKey)[i] = v;
    else if (c === 'arm') this.armor[i] = v;
    else this.setExtraSlot(c, i, v);
  };
  Game.prototype.updateCraft = function () {
    this.craftResult = this.craft.length ? Craft.match(this.craft.map(function (s) { return s ? s.key : null; }), this.craftN) : null;
  };
  // できたものを 1 回分取る（材料を 1 つずつ減らす）
  Game.prototype.consumeCraft = function () {
    for (var i = 0; i < this.craft.length; i++) if (this.craft[i]) { this.craft[i].n--; if (this.craft[i].n <= 0) this.craft[i] = null; }
    this.updateCraft();
  };
  Game.prototype.space = function (key) {
    var max = ITEMS[key].max, room = 0, s = this.inv.slots;
    for (var i = 0; i < 36; i++) room += !s[i] ? max : s[i].key === key ? max - s[i].n : 0;
    return room;
  };

  // 枠をクリックしたとき（Minecraft と同じ：左で束ごと、右で半分・1 個、Shift＋左で別の場所へまとめて移す）
  Game.prototype.clickSlot = function (el, button, shift) {
    var c = el.dataset.c, cur = this.cursor, inv = this.inv, r;
    if (c === 'pal') {
      // クリエイティブの一覧：手に持っていれば捨てる、なければ取る（左で 1 束、右で 1 個）
      var k = el.dataset.i;
      this.cursor = cur ? null : { key: k, n: button === 2 ? 1 : ITEMS[k].max };
      this.renderInventory();
      return;
    }
    var i = +el.dataset.i;
    if (this.clickExtra(c, i)) { inv.changed(); this.renderInventory(); return; }
    // かまどからできたものを取ると経験値（1 個あたりの値を足し、端数は確率で）
    if (c === 'fur' && i === 2 && this.furnace().slots[2] && this.mode === 'survival') {
      var fo = this.furnace().slots[2], xv = (WG.SMELT_XP[fo.key] || 0) * fo.n, whole = Math.floor(xv) + (Math.random() < xv % 1 ? 1 : 0), wp = this.walker.pos;
      if (whole) this.spawnOrbs(wp[0], wp[1] + 0.5, wp[2], whole);
    }
    if (c === 'res' || (c === 'fur' && i === 2)) {
      // できたものの枠：取るだけ
      r = c === 'res' ? this.craftResult : this.furnace().slots[2];
      if (!r) return;
      if (shift) {
        if (c === 'res') {
          for (var guard = 0; guard < 64 && this.craftResult && this.space(this.craftResult.key) >= this.craftResult.n; guard++) {
            inv.add(this.craftResult.key, this.craftResult.n); this.consumeCraft();
          }
        } else { var moved = inv.add(r.key, r.n); r.n -= moved; if (r.n <= 0) this.furnace().slots[2] = null; }
      } else if (!cur || (cur.key === r.key && cur.n + r.n <= ITEMS[r.key].max)) {
        if (cur) cur.n += r.n; else this.cursor = { key: r.key, n: r.n };
        if (c === 'res') this.consumeCraft(); else this.furnace().slots[2] = null;
      }
      inv.changed(); this.renderInventory();
      return;
    }
    var sl = this.getSlot(c, i);
    // 防具の枠には、その部位の防具だけ入る
    if (c === 'arm' && cur && ITEMS[cur.key].armor !== i) return;
    if (cur && !this.slotAccepts(c, i, cur.key)) return;
    if (shift && sl && button === 0) {
      this.shiftMove(c, i, sl);
    } else if (button === 0) {
      if (!cur) { this.cursor = sl; this.setSlot(c, i, null); }
      else if (!sl) { this.setSlot(c, i, cur); this.cursor = null; }
      else if (sl.key === cur.key) {
        var m = Math.min(ITEMS[sl.key].max - sl.n, cur.n);
        sl.n += m; cur.n -= m; if (cur.n <= 0) this.cursor = null;
      } else { this.setSlot(c, i, cur); this.cursor = sl; }
    } else if (button === 2) {
      if (!cur && sl && sl.n === 1) { this.cursor = sl; this.setSlot(c, i, null); }
      else if (!cur && sl) { var half = Math.ceil(sl.n / 2); this.cursor = { key: sl.key, n: half }; sl.n -= half; if (sl.n <= 0) this.setSlot(c, i, null); }
      else if (cur && (!sl || (sl.key === cur.key && sl.n < ITEMS[sl.key].max))) {
        if (!sl) this.setSlot(c, i, { key: cur.key, n: 1 }); else sl.n++;
        cur.n--; if (cur.n <= 0) this.cursor = null;
      } else if (cur && sl) { this.setSlot(c, i, cur); this.cursor = sl; }
    }
    if (c === 'craft') this.updateCraft();
    inv.changed();
    this.renderInventory();
  };

  // Shift＋クリック：クラフトの枠・かまど → インベントリ、インベントリ → かまど（燃料・材料）またはホットバー ⇔ 中身
  Game.prototype.shiftMove = function (c, i, sl) {
    var inv = this.inv, s = inv.slots;
    if (c !== 'inv') {
      var moved = inv.add(sl.key, sl.n, sl.dmg, sl.ench);
      sl.n -= moved; if (sl.n <= 0) this.setSlot(c, i, null);
      return;
    }
    if (this.screen === 'chest') {
      var chest = this.world.chests.get(this.chestKey), mx = ITEMS[sl.key].max, k2;
      for (k2 = 0; k2 < 27 && sl.n > 0; k2++) if (chest[k2] && chest[k2].key === sl.key && chest[k2].n < mx) { var a2 = Math.min(sl.n, mx - chest[k2].n); chest[k2].n += a2; sl.n -= a2; }
      for (k2 = 0; k2 < 27 && sl.n > 0; k2++) if (!chest[k2]) { chest[k2] = sl; s[i] = null; return; }
      if (sl.n <= 0) s[i] = null;
      return;
    }
    if (this.mode === 'creative' && this.screen === 'creative') { s[i] = null; return; }
    // 防具は空いている防具の枠へ
    var ai = ITEMS[sl.key].armor;
    if (this.screen === 'inv' && ai != null && !this.armor[ai]) { this.armor[ai] = sl; s[i] = null; return; }
    if (this.screen === 'furnace') {
      var f = this.furnace(), to = Craft.SMELT[sl.key] ? 0 : Craft.FUEL[sl.key] ? 1 : -1;
      if (to >= 0) {
        var dst = f.slots[to];
        if (!dst) { f.slots[to] = sl; s[i] = null; }
        else if (dst.key === sl.key) { var a = Math.min(sl.n, ITEMS[sl.key].max - dst.n); dst.n += a; sl.n -= a; if (sl.n <= 0) s[i] = null; }
        return;
      }
    }
    var range = i < 9 ? [9, 36] : [0, 9], key = sl.key, max = ITEMS[key].max, n = sl.n, j;
    for (j = range[0]; j < range[1] && n > 0; j++) if (s[j] && s[j].key === key && s[j].n < max) { var b = Math.min(n, max - s[j].n); s[j].n += b; n -= b; }
    for (j = range[0]; j < range[1] && n > 0; j++) if (!s[j]) { if (n === sl.n) { s[j] = sl; s[i] = null; return; } s[j] = { key: key, n: n }; n = 0; }
    if (n > 0) sl.n = n; else s[i] = null;
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
    if (button === 0) { this.mouseL = down; if (down) { this.breakDelay = 0; this.clickL = true; } }
    else if (button === 2) { this.mouseR = down; if (down) { this.placeDelay = 0; this.clickR = true; } }
    else if (button === 1 && down) this.pickBlock();
  };
  Game.prototype.wheel = function (dy) {
    if (!dy) return;
    this.inv.sel = (this.inv.sel + (dy > 0 ? 1 : -1) + 9) % 9;
    this.inv.changed();
  };

  WG.Game = Game;
  WG.Player = Player;
})(typeof window !== 'undefined' ? window : globalThis);
