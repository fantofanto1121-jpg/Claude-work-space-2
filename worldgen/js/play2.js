// 遊ぶ（追加）：レッドストーンの置き方と使い方、TNT、経験値、ポーションの効果、エンチャントの効き目、
// エンチャントテーブル・醸造台・金床の画面、釣り、盾。play.js の Game に足す。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, FLUID = WG.FLUID, Game = WG.Game;
  function kind(id) { return WG.blockKind(id); }
  function keyOf(id) { return WG.BLOCKS[id].key; }
  function ench(s, k) { return WG.enchLevel(s, k); }
  function rint(n) { return Math.floor(Math.random() * n); }
  var DV = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  var UNDEAD = { ZOMBIE: 1, SKELETON: 1 };

  // ---------------- はじめに ----------------
  Game.prototype.initExtra = function () {
    var self = this, wd = this.world, p = this.player;
    this.rs = new WG.Redstone(this);
    if (!wd.brewing) wd.brewing = new Map();
    if (!wd.tnts) wd.tnts = [];
    if (!wd.orbs) wd.orbs = [];
    this.tnts = wd.tnts; this.orbs = wd.orbs; this.throwns = [];
    if (!p.xp) p.xp = { level: 0, points: 0 };
    if (!p.effects) p.effects = {};
    this.xp = p.xp; this.effects = p.effects;
    this.bobber = null; this.blocking = 0; this.burnT = 0;
    this.enchSlots = [null, null]; this.anvilSlots = [null, null]; this.offers = null;
    // ブロックが変わったら、レッドストーンの計算に知らせる
    if (!wd.rsWrapped) {
      var set = wd.setBlock;
      wd.setBlock = function (x, y, z, id) { var r = set.call(wd, x, y, z, id); if (wd.onSet) wd.onSet(x, y, z, id); return r; };
      wd.rsWrapped = true;
    }
    wd.onSet = function (x, y, z, id) { self.rs.mark(x, y, z); self.rs.observe(x, y, z); self.trackPart(x, y, z, id); };
    ['hoppers', 'comparators', 'daylights'].forEach(function (k) { if (!wd[k]) wd[k] = new Set(); });
    if (!wd.containers) wd.containers = new Map();
    if (!wd.notes) wd.notes = new Map();
  };

  // ---------------- 毎刻 ----------------
  Game.prototype.tickExtra = function () {
    var self = this, w = this.walker;
    this.rs.tick();
    this.tickTnt();
    this.tickOrbs();
    this.tickEffects();
    this.tickBobber();
    this.tickThrown();
    this.world.brewing.forEach(function (b) { b.tick(); });
    this.tickParts();
    // 盾：右クリックを押し続けると 0.25 秒後に構える
    var held = this.inv.held(), it = held ? ITEMS[held.key] : null;
    if (it && it.shield && this.mouseR && !this.invOpen) { this.blocking++; w.using = true; }
    else if (this.blocking) { this.blocking = 0; w.using = false; }
    // 効果で歩く速さ・ジャンプを変える
    var sp = this.effects.SPEED, sl = this.effects.SLOWNESS, jb = this.effects.JUMP_BOOST;
    w.speedMul = (1 + (sp ? 0.2 * (sp.amp + 1) : 0)) * (1 - (sl ? 0.15 * (sl.amp + 1) : 0));
    w.jumpBoost = jb ? 0.1 * (jb.amp + 1) : 0;
    w.nightVision = !!this.effects.NIGHT_VISION;
    if (this.ui.burning) this.ui.burning(this.burnT > 0 && !this.effects.FIRE_RESISTANCE);
    void self;
  };

  // ---------------- ダメージの計算 ----------------
  // type：true（生き物）・'projectile'・'explosion'・'fire'・'fall'
  Game.prototype.modifyDamage = function (n, type) {
    if (type === 'fire' && this.effects.FIRE_RESISTANCE) return 0;
    // 盾：前から来た攻撃・矢・爆発は防ぐ（盾の耐久値が減る）
    if (this.blocking >= 5 && (type === true || type === 'projectile' || type === 'explosion') && this.lastFrom) {
      var w = this.walker, fx = -Math.sin(w.yaw), fz = -Math.cos(w.yaw), dx = this.lastFrom[0] - w.pos[0], dz = this.lastFrom[1] - w.pos[2];
      if (fx * dx + fz * dz > 0) {
        if (n >= 3) this.wearItem(this.inv.sel, 1 + Math.floor(n));
        this.puff(w.pos[0] + fx * 0.6, w.pos[1] + 1.2, w.pos[2] + fz * 0.6, [200, 190, 170], 4, 0.3);
        return 0;
      }
    }
    // エンチャントの守り（Minecraft と同じ：守りの点 EPF、最大 20、1 点で 4%）
    if (type) {
      var epf = 0;
      this.armor.forEach(function (s) {
        if (!s) return;
        epf += ench(s, 'PROTECTION');
        if (type === 'fire') epf += ench(s, 'FIRE_PROTECTION') * 2;
        if (type === 'explosion') epf += ench(s, 'BLAST_PROTECTION') * 2;
        if (type === 'projectile') epf += ench(s, 'PROJECTILE_PROTECTION') * 2;
        if (type === 'fall') epf += ench(s, 'FEATHER_FALLING') * 3;
      });
      n *= 1 - Math.min(20, epf) * 0.04;
    }
    return n;
  };
  // 持っているもの（i 番の枠）の耐久値を減らす（耐久力のエンチャントで減りにくい）
  Game.prototype.wearItem = function (i, amount) {
    var s = this.inv.slots[i], it = s ? ITEMS[s.key] : null;
    if (!it || !it.dur || this.mode !== 'survival') return;
    var ub = ench(s, 'UNBREAKING');
    for (var k = 0; k < amount; k++) if (!ub || Math.random() < 1 / (ub + 1)) s.dmg = (s.dmg || 0) + 1;
    if (s.dmg >= it.dur) this.inv.slots[i] = null;
    this.inv.changed();
  };

  // ---------------- 戦う：エンチャントと効果 ----------------
  Game.prototype.attackBonus = function (dmg, m, held) {
    var s = this.effects.STRENGTH, wk = this.effects.WEAKNESS;
    if (s) dmg += 3 * (s.amp + 1);
    if (wk) dmg -= 4 * (wk.amp + 1);
    var sh = ench(held, 'SHARPNESS'), sm = ench(held, 'SMITE');
    if (sh) dmg += 0.5 * sh + 0.5;
    if (sm && UNDEAD[m.type]) dmg += 2.5 * sm;
    return Math.max(0, dmg);
  };
  Game.prototype.afterAttack = function (m, held) {
    var kb = ench(held, 'KNOCKBACK'), fa = ench(held, 'FIRE_ASPECT'), w = this.walker;
    if (kb) { var dx = m.x - w.pos[0], dz = m.z - w.pos[2], d = Math.hypot(dx, dz) || 1; m.vx += dx / d * 0.5 * kb; m.vz += dz / d * 0.5 * kb; m.vy = Math.max(m.vy, 0.3); }
    if (fa) m.fire = Math.max(m.fire || 0, 80 * fa);
    m.looting = ench(held, 'LOOTING');
  };

  // ---------------- 掘る：エンチャント ----------------
  Game.prototype.miningBonus = function (mn, held, bkey) {
    var ef = ench(held, 'EFFICIENCY');
    if (ef && mn.match) { var it = ITEMS[held.key], h = ITEMS[bkey] ? ITEMS[bkey].hardness : 1; if (h > 0) mn.perTick = (it.speed + ef * ef + 1) / h / (mn.harvest ? 30 : 100); }
    // 水の中では 5 分の 1 の速さ（水中呼吸ではなく、Minecraft の「水中採掘」がないとき）
    var w = this.walker, e = w.eye || w.pos;
    if (WG.isWater(this.world.block(Math.floor(e[0]), Math.floor(e[1]), Math.floor(e[2])))) mn.perTick /= 5;
    if (!w.onGround && !w.flying && !w.fluid()) mn.perTick /= 5;   // 宙に浮いていると 5 分の 1（Minecraft と同じ）
    return mn;
  };
  // ドロップ：シルクタッチはブロックそのもの、幸運は鉱石の数を増やす。鉱石は経験値も出す。
  var FORTUNE_ORES = /_ORE$/;
  Game.prototype.dropExtra = function (id, x, y, z) {
    var held = this.inv.held(), key = keyOf(id), it = ITEMS[key];
    if (ench(held, 'SILK_TOUCH') && ITEMS[key] && ITEMS[key].block >= 0 && WG.PLACEABLE.indexOf(key) >= 0 && it.drop !== key) {
      this.spawnItem(key, 1, x + 0.5, y + 0.25, z + 0.5, 0.1, 10);
      return true;
    }
    var xp = WG.ORE_XP[key];
    if (xp) this.spawnOrbs(x + 0.5, y + 0.5, z + 0.5, xp[0] + rint(xp[1] - xp[0] + 1));
    var fo = ench(held, 'FORTUNE');
    if (fo && FORTUNE_ORES.test(key) && it && it.drop && it.drop !== key) {
      var n = it.dropMin + rint(it.dropMax - it.dropMin + 1);
      n *= Math.max(0, rint(fo + 2) - 1) + 1;
      this.spawnItem(it.drop, n, x + 0.5, y + 0.25, z + 0.5, 0.1, 10);
      return true;
    }
    return false;
  };

  // ---------------- 経験値 ----------------
  Game.prototype.spawnOrbs = function (x, y, z, total) {
    while (total > 0) {
      var v = total >= 17 ? 17 : total >= 7 ? 7 : total >= 3 ? 3 : 1;
      total -= v;
      this.orbs.push({ x: x, y: y, z: z, px: x, py: y, pz: z, vx: (Math.random() - 0.5) * 0.2, vy: 0.2, vz: (Math.random() - 0.5) * 0.2, v: v, age: 0 });
    }
  };
  Game.prototype.addXp = function (n) {
    // 修繕：経験値で、身につけているか持っている修繕付きの道具を直す（1 点で 2）
    var self = this, cands = this.armor.concat([this.inv.held()]).filter(function (s) { return s && ench(s, 'MENDING') && s.dmg > 0; });
    if (cands.length) { var s = cands[rint(cands.length)], fix = Math.min(s.dmg, n * 2); s.dmg -= fix; n -= Math.ceil(fix / 2); this.inv.changed(); }
    var xp = this.xp;
    xp.points += n;
    while (xp.points >= WG.xpNeed(xp.level)) { xp.points -= WG.xpNeed(xp.level); xp.level++; }
    this.inv.changed();
    void self;
  };
  Game.prototype.spendLevels = function (n) {
    this.xp.level = Math.max(0, this.xp.level - n);
    this.xp.points = Math.min(this.xp.points, WG.xpNeed(this.xp.level) - 1);
    this.inv.changed();
  };
  Game.prototype.tickOrbs = function () {
    var w = this.walker, keep = [], wd = this.world;
    for (var i = 0; i < this.orbs.length; i++) {
      var o = this.orbs[i];
      o.px = o.x; o.py = o.y; o.pz = o.z; o.age++;
      var dx = w.pos[0] - o.x, dy = w.pos[1] + 0.9 - o.y, dz = w.pos[2] - o.z, d = Math.hypot(dx, dy, dz);
      if (!this.dead && this.mode === 'survival' && d < 8 && o.age > 10) { var k = (1 - d / 8) * (1 - d / 8) * 0.1 / (d || 1); o.vx += dx * k; o.vy += dy * k; o.vz += dz * k; }
      if (!this.dead && this.mode === 'survival' && d < 1.2 && o.age > 10) { this.addXp(o.v); continue; }
      o.vy -= 0.03;
      var nx = o.x + o.vx, ny = o.y + o.vy, nz = o.z + o.vz;
      if (WG.COLLIDE[wd.block(Math.floor(nx), Math.floor(ny - 0.1), Math.floor(nz))]) { o.vy = 0; ny = o.y; o.vx *= 0.6; o.vz *= 0.6; }
      o.x = nx; o.y = ny; o.z = nz; o.vx *= 0.98; o.vz *= 0.98; o.vy *= 0.98;
      if (o.age < 6000 && o.y > wd.minY - 64) keep.push(o);
    }
    this.orbs.length = 0; Array.prototype.push.apply(this.orbs, keep);
  };

  // ---------------- 効果 ----------------
  Game.prototype.addEffect = function (key, ticks, amp) {
    var e = this.effects[key];
    if (key === 'INSTANT_HEALTH') { this.health = Math.min(20, this.health + (4 << amp)); return; }
    if (key === 'INSTANT_DAMAGE') { this.damage(6 << amp, true); return; }
    if (!e || e.amp < amp || (e.amp === amp && e.t < ticks)) this.effects[key] = { t: ticks, amp: amp, max: ticks };
    this.inv.changed();
  };
  Game.prototype.tickEffects = function () {
    var ef = this.effects, self = this, changed = false;
    Object.keys(ef).forEach(function (k) {
      var e = ef[k];
      if (k === 'REGENERATION' && e.t % Math.max(1, 50 >> e.amp) === 0 && self.health < 20) self.health = Math.min(20, self.health + 1);
      if (k === 'POISON' && e.t % Math.max(1, 25 >> e.amp) === 0 && self.health > 1) self.damage(1, true);
      if (--e.t <= 0) { delete ef[k]; changed = true; }
    });
    if (changed) this.inv.changed();   // 残り時間の表示は毎フレーム updateHudExtra で書く（インベントリ画面は描き直さない）
  };
  // 飲む・食べた後の効果（クモの目・フグの毒、ポーション）
  Game.prototype.consumeExtra = function (it) {
    if (it.poison) this.addEffect('POISON', 100, 0);
    if (it.pufferfish) { this.addEffect('POISON', 1200, 1); }
    if (it.potion && it.effect) this.addEffect(it.effect, it.secs * 20, it.amp);
    if (it.milk) Object.keys(this.effects).forEach(function (k) { delete this.effects[k]; }, this);
  };

  // ---------------- 投げるポーション ----------------
  Game.prototype.throwPotion = function (key) {
    var w = this.walker, e = w.eye, d = w.dir;
    if (!e || !d) return;
    this.throwns.push({ key: key, x: e[0] + d[0] * 0.4, y: e[1] + d[1] * 0.4, z: e[2] + d[2] * 0.4, px: e[0], py: e[1], pz: e[2], vx: d[0] * 0.5, vy: d[1] * 0.5 + 0.1, vz: d[2] * 0.5, age: 0 });
  };
  Game.prototype.tickThrown = function () {
    var wd = this.world, keep = [], self = this;
    this.throwns.forEach(function (t) {
      t.px = t.x; t.py = t.y; t.pz = t.z; t.age++;
      t.vy -= 0.05; t.x += t.vx; t.y += t.vy; t.z += t.vz;
      var hitMob = self.mobs.list.some(function (m) { return !m.dead && Math.abs(m.x - t.x) < 0.6 && t.y > m.y && t.y < m.y + 1.8 && Math.abs(m.z - t.z) < 0.6; });
      if (WG.COLLIDE[wd.block(Math.floor(t.x), Math.floor(t.y), Math.floor(t.z))] || hitMob || t.age > 200) self.splash(t);
      else keep.push(t);
    });
    this.throwns = keep;
  };
  // 割れたところから 4 ブロック以内に、近いほど強く効く
  Game.prototype.splash = function (t) {
    var it = ITEMS[t.key], w = this.walker, self = this, col = WG.EFFECTS[it.effect] ? WG.EFFECTS[it.effect][1] : '#385dc6';
    var c = [parseInt(col.substr(1, 2), 16), parseInt(col.substr(3, 2), 16), parseInt(col.substr(5, 2), 16)];
    this.puff(t.x, t.y, t.z, c, 30, 1.2);
    if (!it.effect) { if (this.burnT) this.burnT = 0; return; }
    var dp = Math.hypot(w.pos[0] - t.x, w.pos[1] + 0.9 - t.y, w.pos[2] - t.z);
    if (dp < 4) { var f = 1 - dp / 4; this.addEffect(it.effect, Math.round(it.secs * 20 * 0.75 * f), it.amp); }
    this.mobs.list.forEach(function (m) {
      var dm = Math.hypot(m.x - t.x, m.y + 0.5 - t.y, m.z - t.z);
      if (dm >= 4 || m.dead) return;
      var f2 = 1 - dm / 4, heal = it.effect === 'INSTANT_HEALTH', harm = it.effect === 'INSTANT_DAMAGE';
      // アンデッド（ゾンビ・スケルトン）は治癒で傷つき、負傷で治る
      if (UNDEAD[m.type]) { var tmp = heal; heal = harm; harm = tmp; }
      if (harm) self.mobs.hurt(m, Math.round((6 << it.amp) * f2), null);
      if (heal) m.hp = Math.min(m.maxHp || m.hp + 4, m.hp + Math.round((4 << it.amp) * f2));
      if (it.effect === 'POISON' && !UNDEAD[m.type]) m.poison = Math.round(it.secs * 20 * 0.75 * f2);
    });
  };

  // ---------------- TNT ----------------
  Game.prototype.primeTnt = function (x, y, z, fuse) {
    var wd = this.world;
    if (wd.block(x, y, z) === B.TNT) { wd.setBlock(x, y, z, B.AIR); this.walker.remesh(x, z); }
    this.tnts.push({ x: x + 0.5, y: y, z: z + 0.5, py: y, vy: 0.2, fuse: fuse });
  };
  Game.prototype.tickTnt = function () {
    var wd = this.world, keep = [], self = this, list = this.tnts.slice();
    this.tnts.length = 0;
    list.forEach(function (t) {
      t.py = t.y; t.vy -= 0.04;
      var ny = t.y + t.vy;
      if (WG.COLLIDE[wd.block(Math.floor(t.x), Math.floor(ny), Math.floor(t.z))]) { ny = Math.floor(ny) + 1; t.vy = 0; }
      t.y = ny; t.vy *= 0.98;
      if (--t.fuse <= 0) self.explode(t.x, t.y + 0.5, t.z, 4);
      else keep.push(t);
    });
    Array.prototype.push.apply(this.tnts, keep);
  };

  // ---------------- 右クリック（追加分） ----------------
  // 戻り値 true なら、ここで済んだ
  Game.prototype.useExtra = function (t, held, it, shift) {
    var w = this.walker, wd = this.world, surv = this.mode === 'survival';
    // 投げるポーションは右クリックで投げる
    if (it && it.splash) { this.throwPotion(held.key); if (surv) this.inv.take(this.inv.sel, 1); this.mouseR = this.clickR = false; return true; }
    // 釣り竿：投げる・巻く
    if (it && it.rod) { this.useRod(); this.mouseR = this.clickR = false; return true; }
    if (it && it.shield) return true;
    // ガラス瓶：水をくむ
    if (it && held.key === 'GLASS_BOTTLE') {
      var f = this.fluidTarget();
      if (f && FLUID[f.id] === 1) { this.fillBucket('POTION_WATER'); }
      this.mouseR = this.clickR = false;
      return true;
    }
    if (!t) return false;
    var k = kind(t.id);
    if (!shift) {
      if (k === 'lever') { this.rs.toggleLever(t.x, t.y, t.z); this.mouseR = this.clickR = false; return true; }
      if (k === 'button') { this.rs.pressButton(t.x, t.y, t.z); this.mouseR = this.clickR = false; return true; }
      if (k === 'repeater') { this.rs.cycleRepeater(t.x, t.y, t.z); this.mouseR = this.clickR = false; return true; }
      if (k === 'comparator') { this.rs.toggleComparator(t.x, t.y, t.z); this.mouseR = this.clickR = false; return true; }
      if (k === 'daylight') { wd.setBlock(t.x, t.y, t.z, t.id === B.DAYLIGHT_DETECTOR ? B.DAYLIGHT_DETECTOR_INV : B.DAYLIGHT_DETECTOR); this.walker.remesh(t.x, t.z); this.updateDaylight(t.x + ',' + t.y + ',' + t.z); this.mouseR = this.clickR = false; return true; }
      if (t.id === B.NOTE_BLOCK) { var nk = t.x + ',' + t.y + ',' + t.z; wd.notes.set(nk, ((wd.notes.get(nk) || 0) + 1) % 25); this.playNote(t.x, t.y, t.z); this.mouseR = this.clickR = false; return true; }
      if (/^(HOPPER|DISPENSER|DROPPER)_/.test(keyOf(t.id))) {
        this.mouseR = this.clickR = false;
        this.contKey = t.x + ',' + t.y + ',' + t.z; this.container(t.x, t.y, t.z);
        this.openInventory(/^HOPPER/.test(keyOf(t.id)) ? 'hopper' : 'disp');
        return true;
      }
      if (/^IRON_DOOR_/.test(keyOf(t.id))) { this.mouseR = this.clickR = false; return true; }   // 鉄の扉は手では開かない
      if (t.id === B.ENCHANTING_TABLE) { this.mouseR = this.clickR = false; this.tableKey = [t.x, t.y, t.z]; this.openInventory('etable'); return true; }
      if (t.id === B.ANVIL) { this.mouseR = this.clickR = false; this.openInventory('anvil'); return true; }
      if (t.id === B.BREWING_STAND) {
        this.mouseR = this.clickR = false;
        var bk = t.x + ',' + t.y + ',' + t.z;
        if (!wd.brewing.has(bk)) wd.brewing.set(bk, new WG.BrewingStand());
        this.brewKey = bk; this.openInventory('brew');
        return true;
      }
    }
    if (it && held.key === 'FLINT_AND_STEEL' && t.id === B.TNT) { this.primeTnt(t.x, t.y, t.z, 80); this.wearItem(this.inv.sel, 1); this.mouseR = this.clickR = false; return true; }
    return false;
  };

  // ---------------- 置く（追加分） ----------------
  function attachFace(t) {
    var dx = t.px - t.x, dz = t.pz - t.z;
    if (t.py === t.y + 1) return 'F';
    if (t.py !== t.y || (!dx && !dz)) return null;
    return dx > 0 ? 'E' : dx < 0 ? 'W' : dz > 0 ? 'S' : 'N';
  }
  Game.prototype.placeExtra = function (t, it) {
    if (!it) return false;
    var wd = this.world, surv = this.mode === 'survival', x = t.px, y = t.py, z = t.pz, self = this, id = null;
    function free() { var c = wd.block(x, y, z); return c === B.AIR || FLUID[c] || (kind(c) === 'plant' && c !== B.BROWN_MUSHROOM && c !== B.RED_MUSHROOM) || c === B.FIRE; }
    function solidTop() { return WG.OPAQUE[wd.block(x, y - 1, z)] || kind(wd.block(x, y - 1, z)) === 'slab' && /_TOP$/.test(keyOf(wd.block(x, y - 1, z))); }
    function done() { wd.setBlock(x, y, z, id); if (surv) self.inv.take(self.inv.sel, 1); self.walker.remesh(x, z); wd.fluids.notify(x, y, z); return true; }
    if (it.wire) { if (free() && solidTop()) { id = B.REDSTONE_WIRE_0; done(); } return true; }
    if (it.rtorch) {
      var f = attachFace(t);
      if (!f || !free()) return true;
      if (f === 'F') { if (!solidTop()) return true; id = B.REDSTONE_TORCH; }
      else { if (!WG.OPAQUE[t.id]) return true; id = B['REDSTONE_WALL_TORCH_' + f]; }
      return done();
    }
    if (it.attach) {
      var fa = attachFace(t);
      if (!fa || !free()) return true;
      if (fa === 'F' ? !solidTop() : !WG.OPAQUE[t.id]) return true;
      id = B[(it.attach === 'LEVER' ? 'LEVER_' : it.attach + '_') + fa];
      return done();
    }
    if (it.repeater) { if (free() && solidTop()) { id = B['REPEATER_' + this.facing() + '1']; done(); } return true; }
    if (it.comparator) { if (free() && solidTop()) { id = B['COMPARATOR_' + this.facing() + 'C']; done(); } return true; }
    if (it.oriented) {
      if (!free() || !this.bodyFree(x, y, z, 1)) return true;
      var pt = this.walker.pitch, toward = pt > 0.8 ? 'D' : pt < -0.8 ? 'U' : { N: 'S', S: 'N', E: 'W', W: 'E' }[this.facing()];
      if (it.oriented === 'HOPPER') {
        // ホッパーはクリックしたブロックの方へ出す（上・下の面なら下へ）
        var hx = t.x - x, hz = t.z - z;
        id = B['HOPPER_' + (t.y !== y || (!hx && !hz) ? 'D' : hx > 0 ? 'E' : hx < 0 ? 'W' : hz > 0 ? 'S' : 'N')];
      } else if (it.oriented === 'OBSERVER') id = B['OBSERVER_' + toward];   // 顔はプレイヤーの方
      else id = B[it.oriented + '_' + toward];                               // 口はプレイヤーの方
      return done();
    }
    if (it.piston) {
      if (!free() || !this.bodyFree(x, y, z, 1)) return true;
      // ピストンはプレイヤーの方を向く（真上・真下から置けば上下）
      var p = this.walker.pitch, f6 = p > 0.8 ? 'D' : p < -0.8 ? 'U' : { N: 'S', S: 'N', E: 'W', W: 'E' }[this.facing()];
      id = B[it.piston + '_' + f6];
      return done();
    }
    if (it.plantWart) {
      if (t.id === B.SOUL_SAND && t.py === t.y + 1 && wd.block(x, y, z) === B.AIR) { id = B.NETHER_WART_0; done(); }
      return true;
    }
    if (it.key === 'SUGAR_CANE') {
      // 下がサトウキビか、水のそばの草・土・砂
      var below = wd.block(x, y - 1, z), ok = below === B.SUGAR_CANE;
      if (!ok && (below === B.GRASS || below === B.DIRT || below === B.SAND)) ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { return WG.isWater(wd.block(x + d[0], y - 1, z + d[1])); });
      if (ok && free()) { id = B.SUGAR_CANE; done(); }
      return true;
    }
    return false;
  };

  // ---------------- 壊したとき（追加分） ----------------
  Game.prototype.breakExtra = function (x, y, z, id) {
    var wd = this.world, self = this;
    // 支えを失ったもの（粉・レバー・ボタン・感圧板・リピーター・レッドストーントーチ）
    [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]].forEach(function (d) {
      var nx = x + d[0], ny = y + d[1], nz = z + d[2], nid = wd.block(nx, ny, nz), sp = WG.SUPPORT[nid];
      if (sp && nx + sp[0] === x && ny + sp[1] === y && nz + sp[2] === z) self.popBlock(nx, ny, nz);
    });
    // サトウキビは上も取れる
    if (id === B.SUGAR_CANE) for (var yy = y + 1; wd.block(x, yy, z) === B.SUGAR_CANE; yy++) this.popBlock(x, yy, z);
    // ピストンと頭は一緒に取れる
    var m = /PISTON_(?:HEAD_)?([NESWUD])(_X)?$/.exec(keyOf(id));
    if (m && (kind(id) === 'phead' || m[2])) {
      var v = { N: [0, 0, -1], S: [0, 0, 1], E: [1, 0, 0], W: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0] }[m[1]], sgn = kind(id) === 'phead' ? -1 : 1;
      var ox = x + v[0] * sgn, oy = y + v[1] * sgn, oz = z + v[2] * sgn, oid = wd.block(ox, oy, oz);
      if (kind(oid) === 'piston' || kind(oid) === 'phead') { wd.setBlock(ox, oy, oz, B.AIR); if (kind(oid) === 'piston' && this.mode === 'survival') this.dropFor(oid, ox, oy, oz); this.walker.remesh(ox, oz); }
    }
    // ホッパー・ディスペンサー・ドロッパーの中身は落ちる
    var ck = x + ',' + y + ',' + z, cs = wd.containers.get(ck);
    if (cs) { cs.forEach(function (s) { if (s) self.spawnItem(s.key, s.n, x + 0.5, y + 0.3, z + 0.5, 0.1, 10, s.dmg, s.ench); }); wd.containers.delete(ck); if (this.contKey === ck) this.closeInventory(); }
    if (id === B.BREWING_STAND) {
      var bk = x + ',' + y + ',' + z, st = wd.brewing.get(bk);
      if (st) { st.slots.forEach(function (s) { if (s) self.spawnItem(s.key, s.n, x + 0.5, y + 0.3, z + 0.5, 0.1, 10); }); wd.brewing.delete(bk); }
      if (this.brewKey === bk) this.closeInventory();
    }
  };

  // ---------------- 釣り ----------------
  Game.prototype.useRod = function () {
    var w = this.walker, held = this.inv.held();
    if (this.bobber) {
      var b = this.bobber;
      if (b.bite > 0) {
        var luck = ench(held, 'LUCK_OF_THE_SEA'), loot = WG.fishLoot(luck, Math.random), dx = w.pos[0] - b.x, dy = w.pos[1] + 1 - b.y, dz = w.pos[2] - b.z;
        var e = this.spawnItem(loot.key, loot.n, b.x, b.y + 0.3, b.z, 0, 0, loot.dmg, loot.ench);
        e.vx = dx * 0.1; e.vy = dy * 0.1 + Math.sqrt(Math.hypot(dx, dy, dz)) * 0.08; e.vz = dz * 0.1;
        this.spawnOrbs(w.pos[0], w.pos[1] + 0.5, w.pos[2], 1 + rint(6));
        this.wearItem(this.inv.sel, 1);
      }
      this.bobber = null;
      return;
    }
    if (!w.eye || !w.dir) return;
    var sx = w.eye[0] + w.dir[0] * 0.8, sy = w.eye[1] + w.dir[1] * 0.8 - 0.1, sz = w.eye[2] + w.dir[2] * 0.8;
    this.bobber = { x: sx, y: sy, z: sz, px: sx, py: sy, pz: sz, vx: w.dir[0] * 0.9, vy: w.dir[1] * 0.9 + 0.2, vz: w.dir[2] * 0.9,
      inWater: false, wait: 0, bite: 0, slot: this.inv.sel };
  };
  Game.prototype.tickBobber = function () {
    var b = this.bobber, w = this.walker, wd = this.world;
    if (!b) return;
    var held = this.inv.held();
    if (!held || !ITEMS[held.key].rod || this.inv.sel !== b.slot || Math.hypot(b.x - w.pos[0], b.z - w.pos[2]) > 32) { this.bobber = null; return; }
    b.px = b.x; b.py = b.y; b.pz = b.z;
    var water = WG.isWater(wd.block(Math.floor(b.x), Math.floor(b.y), Math.floor(b.z)));
    if (water) {
      // 水に浮く。待ち時間（5〜30 秒、入れ食いで 5 秒ずつ短く）のあと、0.5〜1 秒の間に巻くと釣れる
      if (!b.inWater) { b.inWater = true; b.wait = Math.max(20, 100 + rint(500) - ench(held, 'LURE') * 100); this.puff(b.x, b.y + 0.3, b.z, [200, 220, 240], 6, 0.3); }
      b.vy += (Math.floor(b.y) + 0.85 - b.y) * 0.1; b.vy *= 0.8; b.vx *= 0.8; b.vz *= 0.8;
      if (b.bite > 0) { if (--b.bite === 0) b.wait = 100 + rint(500); b.vy -= 0.04; }
      else if (--b.wait <= 0) { b.bite = 10 + rint(10); this.puff(b.x, b.y + 0.2, b.z, [220, 235, 250], 12, 0.5); }
    } else {
      b.vy -= 0.03; b.vx *= 0.92; b.vz *= 0.92; b.vy *= 0.92;
      if (WG.COLLIDE[wd.block(Math.floor(b.x + b.vx), Math.floor(b.y + b.vy), Math.floor(b.z + b.vz))]) { b.vx = b.vy = b.vz = 0; }
    }
    b.x += b.vx; b.y += b.vy; b.z += b.vz;
  };

  // ---------------- エンチャントテーブル・醸造台・金床の画面 ----------------
  function slotHtml(c, i, s, extra) { return WG.slotHTMLFull(c, i, s, extra); }
  // 本棚の数（テーブルから 2 ブロック離れた周り、高さ 0〜1）
  Game.prototype.shelves = function () {
    var p = this.tableKey, wd = this.world, n = 0;
    if (!p) return 0;
    for (var dy = 0; dy <= 1; dy++) for (var dz = -2; dz <= 2; dz++) for (var dx = -2; dx <= 2; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== 2) continue;
      if (wd.block(p[0] + dx, p[1] + dy, p[2] + dz) === B.BOOKSHELF) n++;
    }
    return Math.min(15, n);
  };
  Game.prototype.renderExtraScreen = function (sc) {
    var html = '', i;
    if (sc === 'etable') {
      var s0 = this.enchSlots[0];
      if (s0 && WG.enchantable(s0.key) && !(s0.ench && Object.keys(s0.ench).length) && (!this.offers || this.offers.key !== s0.key)) {
        var seed = this.xp.seed || (this.xp.seed = 1 + rint(1e9)), r = seed;
        var rnd = function () { r = (Math.imul(r ^ (r >>> 15), 0x2c1b3c6d) + 0x9e3779b9) | 0; return ((r >>> 0) % 1e6) / 1e6; };
        this.offers = { key: s0.key, list: WG.enchantOffers(s0.key, this.shelves(), rnd) };
      } else if (!s0 || !WG.enchantable(s0.key)) this.offers = null;
      html += '<div class="craft ench"><div class="fcol">' + slotHtml('en', 0, s0) + slotHtml('en', 1, this.enchSlots[1]) + '</div><div class="eopts">';
      var lap = this.enchSlots[1] && this.enchSlots[1].key === 'LAPIS' ? this.enchSlots[1].n : 0;
      for (i = 0; i < 3; i++) {
        var o = this.offers && this.offers.list[i], first = o && Object.keys(o.ench)[0];
        var ok = o && first && (this.mode === 'creative' || (this.xp.level >= o.cost && lap >= i + 1));
        html += '<div class="eopt' + (ok ? '' : ' off') + '" data-c="eopt" data-i="' + i + '">' +
          (o && first ? '<b>' + WG.ENCHANTS[first].name + (WG.ENCHANTS[first].max > 1 ? ' ' + ['', 'I', 'II', 'III', 'IV', 'V'][o.ench[first]] : '') + ' …?</b><span>レベル ' + o.cost + '・ラピスラズリ ' + (i + 1) + '</span>' : '<span>　</span>') + '</div>';
      }
      html += '</div></div><div class="note">本棚 ' + this.shelves() + ' 台　経験値レベル ' + this.xp.level + '</div>';
    } else if (sc === 'brew') {
      var st = this.world.brewing.get(this.brewKey);
      html += '<div class="craft brew"><div class="fcol">' + slotHtml('br', 3, st.slots[3]) + '<div class="arrow prog down"><i id="brewBar"></i></div><div class="brow">' +
        slotHtml('br', 0, st.slots[0]) + slotHtml('br', 1, st.slots[1]) + slotHtml('br', 2, st.slots[2]) + '</div></div><div class="fcol">' + slotHtml('br', 4, st.slots[4]) +
        '<div class="note">燃料 ' + st.fuel + '</div></div></div>';
    } else if (sc === 'hopper' || sc === 'disp') {
      var cs = this.world.containers.get(this.contKey) || [];
      html += '<div class="craft"><div class="cgrid" style="grid-template-columns:repeat(' + (sc === 'hopper' ? 5 : 3) + ',44px)">';
      for (i = 0; i < cs.length; i++) html += slotHtml('ct', i, cs[i]);
      html += '</div></div>';
    } else if (sc === 'anvil') {
      var res = WG.anvilCombine(this.anvilSlots[0], this.anvilSlots[1]);
      this.anvilRes = res;
      html += '<div class="craft">' + slotHtml('an', 0, this.anvilSlots[0]) + '<span class="plus">＋</span>' + slotHtml('an', 1, this.anvilSlots[1]) +
        '<div class="arrow"></div>' + slotHtml('anres', 0, res && res.item, ' result') + '</div>' +
        '<div class="note">' + (res ? res.tooExpensive ? '高すぎます（レベル ' + res.cost + '）' : '費用：経験値レベル ' + res.cost + (this.mode === 'survival' && this.xp.level < res.cost ? '（足りません）' : '') : '左に道具、右に同じ道具か本、または修理の材料') + '</div>';
    }
    return html;
  };
  Game.prototype.getExtraSlot = function (c, i) {
    if (c === 'en') return this.enchSlots[i];
    if (c === 'an') return this.anvilSlots[i];
    if (c === 'br') return this.world.brewing.get(this.brewKey).slots[i];
    if (c === 'ct') return (this.world.containers.get(this.contKey) || [])[i];
    return undefined;
  };
  Game.prototype.setExtraSlot = function (c, i, v) {
    if (c === 'en') { this.enchSlots[i] = v; if (i === 0) this.offers = null; return true; }
    if (c === 'an') { this.anvilSlots[i] = v; return true; }
    if (c === 'br') { this.world.brewing.get(this.brewKey).slots[i] = v; return true; }
    if (c === 'ct') { var cs = this.world.containers.get(this.contKey); if (cs) cs[i] = v; return true; }
    return false;
  };
  // 枠の制限（ラピスの枠はラピスだけ、瓶の枠はポーションだけ、燃料はブレイズパウダーだけ）
  Game.prototype.slotAccepts = function (c, i, key) {
    if (c === 'en' && i === 1) return key === 'LAPIS';
    if (c === 'en' && i === 0) return WG.enchantable(key);
    if (c === 'br' && i < 3) return !!(ITEMS[key].potion);
    if (c === 'br' && i === 3) return WG.BREW_INGREDIENTS.indexOf(key) >= 0;
    if (c === 'br' && i === 4) return key === 'BLAZE_POWDER';
    return true;
  };
  // エンチャントを選ぶ・金床の結果を取る
  Game.prototype.clickExtra = function (c, i) {
    var surv = this.mode === 'survival';
    if (c === 'trade') { this.trade(i); return true; }
    if (c === 'eopt') {
      var o = this.offers && this.offers.list[i], s0 = this.enchSlots[0], lap = this.enchSlots[1];
      if (!o || !s0 || !Object.keys(o.ench).length) return true;
      if (surv && (this.xp.level < o.cost || !lap || lap.key !== 'LAPIS' || lap.n < i + 1)) return true;
      var out = s0.key === 'BOOK' ? { key: 'ENCHANTED_BOOK', n: 1 } : s0;
      out.ench = o.ench;
      this.enchSlots[0] = out;
      if (surv) { this.spendLevels(i + 1); lap.n -= i + 1; if (lap.n <= 0) this.enchSlots[1] = null; }
      this.xp.seed = 1 + rint(1e9); this.offers = null;
      this.puff(this.walker.pos[0], this.walker.pos[1] + 1.5, this.walker.pos[2], [150, 90, 220], 12, 0.6);
      return true;
    }
    if (c === 'anres') {
      var r = this.anvilRes;
      if (!r || !r.item || this.cursor) return true;
      if (surv && this.xp.level < r.cost) return true;
      if (surv) this.spendLevels(r.cost);
      this.cursor = r.item; this.anvilSlots[0] = null;
      var b = this.anvilSlots[1]; if (b) { b.n -= r.use; if (b.n <= 0) this.anvilSlots[1] = null; }
      return true;
    }
    return false;
  };

  // ---------------- 入れ物（チェスト・かまど・醸造台・ホッパー・ディスペンサー・ドロッパー） ----------------
  var CSIZE = { HOPPER: 5, DISPENSER: 9, DROPPER: 9 };
  Game.prototype.container = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z), key = x + ',' + y + ',' + z, m;
    if (id === B.CHEST) return { slots: this.chestAt(x, y, z), type: 'chest' };
    if (id === B.FURNACE || id === B.FURNACE_LIT) { if (!wd.furnaces.has(key)) wd.furnaces.set(key, new WG.Craft.Furnace()); return { slots: wd.furnaces.get(key).slots, type: 'furnace' }; }
    if (id === B.BREWING_STAND) { if (!wd.brewing.has(key)) wd.brewing.set(key, new WG.BrewingStand()); return { slots: wd.brewing.get(key).slots, type: 'brew' }; }
    if ((m = /^(HOPPER|DISPENSER|DROPPER)_/.exec(keyOf(id)))) {
      if (!wd.containers.has(key)) wd.containers.set(key, new Array(CSIZE[m[1]]).fill(null));
      return { slots: wd.containers.get(key), type: m[1].toLowerCase() };
    }
    return null;
  };
  // 入れられる枠（Minecraft と同じ：かまどは上から材料・横から燃料、醸造台は上から材料・横から瓶と燃料）
  function insertSlots(c, key, fromAbove) {
    var all = c.slots.map(function (s, i) { return i; });
    if (c.type === 'furnace') return fromAbove ? [0] : (WG.Craft.FUEL[key] ? [1] : []);
    if (c.type === 'brew') return fromAbove ? (WG.BREW_INGREDIENTS.indexOf(key) >= 0 ? [3] : []) : key === 'BLAZE_POWDER' ? [4] : ITEMS[key].potion ? [0, 1, 2] : [];
    return all;
  }
  // 1 個入れる（入れられたら true）
  Game.prototype.insertInto = function (c, s, fromAbove) {
    var list = insertSlots(c, s.key, fromAbove), max = ITEMS[s.key].max, i;
    for (i = 0; i < list.length; i++) { var t = c.slots[list[i]]; if (t && t.key === s.key && t.n < max && !t.ench && !s.ench) { t.n++; return true; } }
    for (i = 0; i < list.length; i++) if (!c.slots[list[i]]) { c.slots[list[i]] = { key: s.key, n: 1, dmg: s.dmg, ench: s.ench }; return true; }
    return false;
  };
  // 取り出す枠（かまどはできたもの、醸造台は瓶）
  function extractSlots(c) { return c.type === 'furnace' ? [2] : c.type === 'brew' ? [0, 1, 2] : c.slots.map(function (s, i) { return i; }); }
  // 比べる強さ：中身の量（Minecraft の式：1 + 満たされた割合 × 14、空なら 0）。入れ物でなければ −1
  Game.prototype.containerSignal = function (x, y, z) {
    var id = this.world.block(x, y, z);
    if (id !== B.CHEST && id !== B.FURNACE && id !== B.FURNACE_LIT && id !== B.BREWING_STAND && !/^(HOPPER|DISPENSER|DROPPER)_/.test(keyOf(id))) return -1;
    var c = this.container(x, y, z), f = 0, any = false;
    c.slots.forEach(function (s) { if (s) { f += s.n / ITEMS[s.key].max; any = true; } });
    return any ? Math.floor(1 + f / c.slots.length * 14) : 0;
  };

  // ---------------- 毎刻動くもの（ホッパー・コンパレーター・日照センサー） ----------------
  Game.prototype.trackPart = function (x, y, z, id) {
    var wd = this.world, key = x + ',' + y + ',' + z, k = kind(id);
    if (!wd.hoppers) return;
    if (k === 'hopper') wd.hoppers.add(key); else wd.hoppers.delete(key);
    if (k === 'comparator') wd.comparators.add(key); else wd.comparators.delete(key);
    if (k === 'daylight') { wd.daylights.add(key); this.updateDaylight(key); } else if (wd.daylights.delete(key)) wd.daylight.delete(key);
  };
  Game.prototype.tickParts = function () {
    var wd = this.world, self = this, t = this.tickCount;
    wd.hoppers.forEach(function (key) { self.tickHopper(key); });
    if (t % 4 === 0) wd.comparators.forEach(function (key) { var p = key.split(',').map(Number), id = wd.block(p[0], p[1], p[2]); if (kind(id) === 'comparator') self.rs.updateComparator(p[0], p[1], p[2], id); });
    if (t % 20 === 0) wd.daylights.forEach(function (key) { self.updateDaylight(key); });
  };
  // 日照センサー：空の光（昼と夜で変わる）の強さ。反転なら 15 から引く
  Game.prototype.updateDaylight = function (key) {
    var wd = this.world, p = key.split(',').map(Number), id = wd.block(p[0], p[1], p[2]);
    if (kind(id) !== 'daylight') return;
    var sk = this.sky(), lt = this.walker.lightLevels(p[0], p[1], p[2]), pw = Math.max(0, Math.min(15, Math.round(lt[0] - (sk ? sk.dark : 0) * 1.4)));
    if (id === B.DAYLIGHT_DETECTOR_INV) pw = 15 - pw;
    if ((wd.daylight.get(key) || 0) !== pw) { wd.daylight.set(key, pw); this.rs.dirty.push(p); }
  };
  // ホッパー：8 刻みに 1 個、向いている入れ物へ渡し、上の入れ物か、上に落ちているアイテムから 1 個取る。動力を受けると止まる。
  var HV = { D: [0, -1, 0], N: [0, 0, -1], E: [1, 0, 0], S: [0, 0, 1], W: [-1, 0, 0] };
  Game.prototype.tickHopper = function (key) {
    var wd = this.world, p = key.split(',').map(Number), x = p[0], y = p[1], z = p[2], id = wd.block(x, y, z);
    if (kind(id) !== 'hopper') { wd.hoppers.delete(key); return; }
    var c = this.container(x, y, z);
    if (!this.hopperCd) this.hopperCd = {};
    if (this.hopperCd[key] > 0) { this.hopperCd[key]--; return; }
    if (wd.hopperLock.get(key)) return;
    var moved = false, f = keyOf(id).slice(-1), v = HV[f];
    // 渡す
    var out = this.container(x + v[0], y + v[1], z + v[2]);
    if (out) for (var i = 0; i < c.slots.length && !moved; i++) {
      var s = c.slots[i];
      if (s && this.insertInto(out, s, f === 'D')) { s.n--; if (s.n <= 0) c.slots[i] = null; moved = true; }
    }
    // 取る（上の入れ物 → 上のアイテム）
    var above = this.container(x, y + 1, z), pulled = false;
    if (above) {
      var ex = extractSlots(above);
      for (var j = 0; j < ex.length && !pulled; j++) {
        var a = above.slots[ex[j]];
        if (a && (above.type !== 'brew' || !wd.brewing.get(x + ',' + (y + 1) + ',' + z).time) && this.insertInto(c, a, true)) { a.n--; if (a.n <= 0) above.slots[ex[j]] = null; pulled = true; }
      }
    } else if (!WG.OPAQUE[wd.block(x, y + 1, z)]) {
      for (var e = 0; e < this.entities.length && !pulled; e++) {
        var it = this.entities[e];
        if (Math.floor(it.x) !== x || Math.floor(it.z) !== z || it.y < y + 0.6 || it.y > y + 2) continue;
        if (this.insertInto(c, it, true)) { it.n--; pulled = true; if (it.n <= 0) this.entities.splice(e, 1); }
      }
    }
    if (moved || pulled) { this.hopperCd[key] = 8; this.inv.changed(); }
  };

  // ---------------- ディスペンサー・ドロッパー ----------------
  var D6 = { N: [0, 0, -1], S: [0, 0, 1], E: [1, 0, 0], W: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0] };
  Game.prototype.dispense = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z), m = /^(DISPENSER|DROPPER)_([NESWUD])$/.exec(keyOf(id));
    if (!m) return;
    var c = this.container(x, y, z), full = [];
    c.slots.forEach(function (s, i) { if (s) full.push(i); });
    var v = D6[m[2]], fx = x + v[0], fy = y + v[1], fz = z + v[2], self = this;
    if (!full.length) { this.puff(fx + 0.5, fy + 0.5, fz + 0.5, [150, 150, 150], 3, 0.2); return; }   // 空：カチッと鳴るだけ
    var si = full[rint(full.length)], s = c.slots[si], key = s.key, it = ITEMS[key], fid = wd.block(fx, fy, fz);
    function use1() { s.n--; if (s.n <= 0) c.slots[si] = null; }
    function drop() {
      var front = self.container(fx, fy, fz);
      if (front && m[1] === 'DROPPER') { if (self.insertInto(front, s, v[1] < 0)) use1(); return; }
      var e = self.spawnItem(key, 1, fx + 0.5 - v[0] * 0.3, fy + 0.3 + (v[1] < 0 ? 0 : 0.2), fz + 0.5 - v[2] * 0.3, 0, 8, s.dmg, s.ench);
      e.vx = v[0] * 0.25 + (Math.random() - 0.5) * 0.05; e.vy = v[1] * 0.25 + 0.1; e.vz = v[2] * 0.25 + (Math.random() - 0.5) * 0.05;
      use1();
    }
    this.puff(fx + 0.5, fy + 0.5, fz + 0.5, [170, 170, 170], 5, 0.3);
    if (m[1] === 'DROPPER') { drop(); this.inv.changed(); return; }
    var free = fid === B.AIR || FLUID[fid] || kind(fid) === 'plant';
    if (key === 'ARROW') {
      var ar = this.mobs.shootFromPlayer([fx + 0.5 - v[0] * 0.4, fy + 0.6, fz + 0.5 - v[2] * 0.4], [v[0], v[1] + 0.1, v[2]], 1.1, 3, false);
      ar.any = true; use1();
    } else if (it.splash) {
      this.throwns.push({ key: key, x: fx + 0.5, y: fy + 0.5, z: fz + 0.5, px: fx + 0.5, py: fy + 0.5, pz: fz + 0.5, vx: v[0] * 0.5, vy: v[1] * 0.5 + 0.1, vz: v[2] * 0.5, age: 0 }); use1();
    } else if ((key === 'WATER_BUCKET' || key === 'LAVA_BUCKET') && free) {
      wd.setBlock(fx, fy, fz, key === 'WATER_BUCKET' ? B.WATER : B.LAVA); wd.fluids.notify(fx, fy, fz); this.walker.remesh(fx, fz); c.slots[si] = { key: 'BUCKET', n: 1 };
    } else if (key === 'BUCKET' && FLUID[fid] && WG.FLUID_LEVEL[fid] === 0) {
      wd.setBlock(fx, fy, fz, B.AIR); wd.fluids.notify(fx, fy, fz); this.walker.remesh(fx, fz); use1();
      var filled = FLUID[fid] === 1 ? 'WATER_BUCKET' : 'LAVA_BUCKET';
      if (!this.insertInto(c, { key: filled }, false)) this.spawnItem(filled, 1, fx + 0.5, fy + 0.5, fz + 0.5, 0.05, 8);
    } else if (key === 'FLINT_AND_STEEL') {
      if (fid === B.TNT) this.primeTnt(fx, fy, fz, 80); else if (fid === B.AIR) this.setFire(fx, fy, fz, true, 0);
      s.dmg = (s.dmg || 0) + 1; if (s.dmg >= it.dur) c.slots[si] = null;
    } else if (key === 'TNT') {
      this.tnts.push({ x: fx + 0.5, y: fy, z: fz + 0.5, py: fy, vy: 0.2, fuse: 80 }); use1();
    } else if (key === 'BONE_MEAL' && WG.blockKind(fid) === 'crop') {
      if (this.growCrop(fx, fy, fz, 2 + rint(4))) use1();
    } else if (key === 'SHEARS') {
      var sheep = this.mobs.list.filter(function (mm) { return mm.type === 'SHEEP' && !mm.sheared && Math.floor(mm.x) === fx && Math.floor(mm.z) === fz; })[0];
      if (sheep) { sheep.sheared = true; this.spawnItem('WHITE_WOOL', 1 + rint(3), sheep.x, sheep.y + 1, sheep.z, 0.15, 10); s.dmg = (s.dmg || 0) + 1; }
    } else drop();
    this.inv.changed();
  };

  // ---------------- 音符ブロック ----------------
  // 右クリックで音の高さ（25 段、F♯3〜F♯5）、動力を受けると鳴る。下のブロックで楽器が変わる（Minecraft と同じ組み合わせ）。
  function instrument(id) {
    var k = keyOf(id);
    if (/_PLANKS$|_LOG$|_FENCE$|^CRAFTING_TABLE$|^CHEST$|^NOTE_BLOCK$|^BOOKSHELF$/.test(k)) return 'bass';
    if (/^SAND$|^GRAVEL$|^SOUL_SAND$/.test(k)) return 'snare';
    if (/^GLASS$|^GLOWSTONE$/.test(k)) return 'hat';
    if (/^STONE$|^COBBLESTONE$|_ORE$|^NETHERRACK$|^OBSIDIAN$|^STONE_BRICKS$|^BRICKS$|^SANDSTONE$|^QUARTZ_BLOCK$|^BASALT$|^DEEPSLATE$/.test(k)) return 'bd';
    if (k === 'GOLD_BLOCK') return 'bell';
    if (k === 'CLAY') return 'flute';
    if (k === 'WHITE_WOOL') return 'guitar';
    if (k === 'ICE') return 'chime';
    if (k === 'IRON_BLOCK') return 'iron';
    return 'harp';
  }
  Game.prototype.playNote = function (x, y, z) {
    var wd = this.world;
    if (wd.block(x, y + 1, z) !== B.AIR) return;   // 上がふさがっていると鳴らない
    var pitch = wd.notes.get(x + ',' + y + ',' + z) || 0, ins = instrument(wd.block(x, y - 1, z));
    // 音符の粒（高さで色が変わる）
    var h = pitch / 24, col = [Math.round(255 * Math.max(0, Math.sin(h * 6.28) * 0.5 + 0.5)), Math.round(255 * Math.max(0, Math.sin(h * 6.28 + 2.1) * 0.5 + 0.5)), Math.round(255 * Math.max(0, Math.sin(h * 6.28 + 4.2) * 0.5 + 0.5))];
    this.puff(x + 0.5, y + 1.2, z + 0.5, col, 3, 0.15);
    if (WG.noteSound) WG.noteSound(pitch, ins, Math.hypot(x + 0.5 - this.walker.pos[0], y - this.walker.pos[1], z + 0.5 - this.walker.pos[2]));
  };
  // 音（ブラウザだけ。Web Audio で作る）
  var actx = null;
  WG.noteSound = function (pitch, ins, dist) {
    if (typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext) || dist > 48) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var t = actx.currentTime, f = 185 * Math.pow(2, pitch / 12), vol = 0.25 * Math.max(0, 1 - dist / 48), g = actx.createGain();
      g.connect(actx.destination);
      if (ins === 'snare' || ins === 'hat' || ins === 'bd') {
        // 打楽器：雑音の短い音
        var len = ins === 'bd' ? 0.18 : ins === 'snare' ? 0.12 : 0.05, buf = actx.createBuffer(1, Math.floor(actx.sampleRate * len), actx.sampleRate), d = buf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, ins === 'bd' ? 3 : 2);
        var src = actx.createBufferSource(), flt = actx.createBiquadFilter();
        src.buffer = buf; flt.type = ins === 'bd' ? 'lowpass' : ins === 'hat' ? 'highpass' : 'bandpass'; flt.frequency.value = ins === 'bd' ? 160 + pitch * 6 : ins === 'hat' ? 7000 : 1800 + pitch * 40;
        src.connect(flt); flt.connect(g); g.gain.value = vol * 1.6; src.start(t);
        return;
      }
      var o = actx.createOscillator(), mul = ins === 'bass' ? 0.25 : ins === 'bell' || ins === 'chime' ? 2 : ins === 'flute' ? 1 : ins === 'guitar' ? 0.5 : 1;
      o.type = ins === 'bass' || ins === 'guitar' ? 'triangle' : ins === 'flute' ? 'sine' : ins === 'iron' ? 'square' : 'sine';
      o.frequency.value = f * mul;
      var dur = ins === 'bell' || ins === 'chime' ? 1.6 : ins === 'flute' ? 0.7 : 0.9;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * (ins === 'iron' ? 0.4 : 1), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* 音が出せない環境では鳴らさない */ }
  };

  // ---------------- 画面の表示（経験値・効果・盾） ----------------
  Game.prototype.updateHudExtra = function () {
    var ui = this.ui, surv = this.mode === 'survival', xp = this.xp, self = this;
    if (ui.xpbar) {
      ui.xpbar.style.visibility = surv ? 'visible' : 'hidden';
      ui.xpbar.firstChild.style.width = (xp.points / WG.xpNeed(xp.level) * 100) + '%';
      ui.xplv.textContent = xp.level;
      ui.xpbar.classList.toggle('empty', !xp.level);
    }
    if (ui.effects) {
      var eh = Object.keys(this.effects).map(function (k) {
        var e = self.effects[k], ef = WG.EFFECTS[k], sec = Math.ceil(e.t / 20);
        return '<div><i style="background:' + ef[1] + '"></i>' + ef[0] + (e.amp ? ' II' : '') + '<span>' + Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2) + '</span></div>';
      }).join('');
      if (eh !== this.lastEffects) { this.lastEffects = eh; ui.effects.innerHTML = eh; }
    }
    if (ui.shield) {
      var held = this.inv.held(), sh = held && ITEMS[held.key].shield && !this.dead;
      if (sh && !ui.shield.src) ui.shield.src = WG.iconURL('SHIELD');
      ui.shield.classList.toggle('on', !!sh);
      ui.shield.classList.toggle('up', this.blocking >= 5);
    }
  };

  // ---------------- 描く（追加分） ----------------
  Game.prototype.drawExtra = function (solid, a, cube) {
    var w = this.walker, t = this.tickCount, WHITE = [255, 255, 255];
    this.tnts.forEach(function (n) {
      var y = n.py + (n.y - n.py) * a, flash = Math.floor(n.fuse / 5) % 2 === 0, s = 1 + (n.fuse < 10 ? (10 - n.fuse) * 0.02 : 0);
      cube(solid, n.x, y - (s - 1) / 2, n.z, s, 0, function (fc) { return WG.atlasTile(B.TNT, fc); }, function () { return flash ? [255, 255, 255] : [200, 200, 200]; }, flash ? [15, 15] : w.lightLevels(n.x, y + 0.5, n.z));
    });
    this.orbs.forEach(function (o) {
      var x = o.px + (o.x - o.px) * a, y = o.py + (o.y - o.py) * a, z = o.pz + (o.z - o.pz) * a, pulse = 0.5 + 0.5 * Math.sin((o.age + a) / 3);
      var s = 0.1 + Math.min(0.1, o.v / 100);
      cube(solid, x, y, z, s, (o.age + a) / 8, function () { return 0; }, function () { return [120 + 100 * pulse, 230, 40 + 40 * pulse]; }, [15, 15]);
    });
    this.throwns.forEach(function (p) {
      var x = p.px + (p.x - p.px) * a, y = p.py + (p.y - p.py) * a, z = p.pz + (p.z - p.pz) * a, col = WG.EFFECTS[ITEMS[p.key].effect] ? WG.EFFECTS[ITEMS[p.key].effect][1] : '#385dc6';
      cube(solid, x, y, z, 0.18, (p.age + a) / 4, function () { return 0; }, function () { return [parseInt(col.substr(1, 2), 16), parseInt(col.substr(3, 2), 16), parseInt(col.substr(5, 2), 16)]; }, w.lightLevels(x, y, z));
    });
    var b = this.bobber;
    var bnear = b && w.eye && Math.hypot(b.x - w.eye[0], b.y - w.eye[1], b.z - w.eye[2]) < 1.2;   // 投げた直後（目の前）は描かない
    if (b && w.eye && !bnear) {
      var bx = b.px + (b.x - b.px) * a, by = b.py + (b.y - b.py) * a, bz = b.pz + (b.z - b.pz) * a, lt = w.lightLevels(bx, by, bz);
      cube(solid, bx, by - 0.06, bz, 0.12, 0, function () { return 0; }, function (fc) { return fc === 'top' ? [220, 40, 40] : [235, 235, 235]; }, lt);
      // 糸：竿の先（目の右下）から浮きまで
      var sy = Math.sin(w.yaw), cy = Math.cos(w.yaw), tip = [w.eye[0] + cy * 0.35 - sy * 0.5, w.eye[1] - 0.25, w.eye[2] - sy * 0.35 - cy * 0.5], n = 24;
      for (var i = 1; i < n; i++) {
        var f = i / n, sag = Math.sin(f * Math.PI) * 0.4 * (b.inWater ? 0.4 : 1);
        cube(solid, tip[0] + (bx - tip[0]) * f, tip[1] + (by - tip[1]) * f - sag, tip[2] + (bz - tip[2]) * f, 0.025, 0, function () { return 0; }, function () { return [40, 40, 40]; }, lt);
      }
    }
    void t; void WHITE;
  };
})(typeof window !== 'undefined' ? window : globalThis);
