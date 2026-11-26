// エンチャントと効果（ロードマップ 第 18 段階）
// エンチャント：棘の鎧・水中歩行・氷渡り・水中採掘・魂の速さ・スニーク速度上昇・範囲ダメージ増加・虫特効・忠誠・激流・召雷・水生特効・
//   拡散・貫通・高速装填・密度・破砕・風爆・束縛の呪い・消滅の呪い
// 効果：採掘速度上昇・耐性・吐き気・盲目・満腹度回復・体力増強・幸運・低速落下・イルカの好意（採掘速度低下は js/hostiles2.js）
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Game = WG.Game, Mobs = WG.Mobs, TYPES = WG.MOB_TYPES, ENCHANTS = WG.ENCHANTS;
  function lv(s, k) { return WG.enchLevel ? WG.enchLevel(s, k) : 0; }
  function armorLv(g, k) { var n = 0; (g.armor || []).forEach(function (s) { if (s) n = Math.max(n, lv(s, k)); }); return n; }
  function boots(g, k) { return g.armor && g.armor[3] ? lv(g.armor[3], k) : 0; }
  function ef(g, k) { return g.effects && g.effects[k]; }

  // ---------------- エンチャントの表 ----------------
  // [キー, 名前, 最大, 付くもの, 重み, 最小の力, レベルごと, 宝物だけ]
  [['THORNS', '棘の鎧', 3, 'armor', 1, 10, 20], ['DEPTH_STRIDER', '水中歩行', 3, 'feet', 2, 10, 10], ['FROST_WALKER', '氷渡り', 2, 'feet', 2, 10, 10, true],
    ['AQUA_AFFINITY', '水中採掘', 1, 'head', 2, 1, 0], ['SOUL_SPEED', '魂の速さ', 3, 'feet', 1, 10, 10, true], ['SWIFT_SNEAK', 'スニーク速度上昇', 3, 'armor2', 1, 25, 25, true],
    ['SWEEPING_EDGE', '範囲ダメージ増加', 3, 'weapon', 2, 5, 9], ['BANE_OF_ARTHROPODS', '虫特効', 5, 'weapon', 5, 5, 8],
    ['LOYALTY', '忠誠', 3, 'trident', 5, 12, 7], ['RIPTIDE', '激流', 3, 'trident', 2, 17, 7], ['CHANNELING', '召雷', 1, 'trident', 1, 25, 0], ['IMPALING', '水生特効', 5, 'trident', 2, 1, 8],
    ['MULTISHOT', '拡散', 1, 'crossbow', 2, 20, 0], ['PIERCING', '貫通', 4, 'crossbow', 10, 1, 10], ['QUICK_CHARGE', '高速装填', 3, 'crossbow', 5, 12, 20],
    ['DENSITY', '密度', 5, 'mace', 5, 5, 8], ['BREACH', '破砕', 4, 'mace', 2, 15, 9], ['WIND_BURST', '風爆', 3, 'mace', 2, 15, 9, true],
    ['BINDING_CURSE', '束縛の呪い', 1, 'armor', 1, 25, 0, true], ['VANISHING_CURSE', '消滅の呪い', 1, 'any', 1, 25, 0, true]
  ].forEach(function (e) { ENCHANTS[e[0]] = { key: e[0], name: e[1], max: e[2], on: e[3], weight: e[4], min: e[5], step: e[6], treasure: !!e[7], curse: /_CURSE$/.test(e[0]) }; });
  WG.enchCategory = function (key) { return { TRIDENT: 'trident', CROSSBOW: 'crossbow', MACE: 'mace' }[key] || null; };
  var EX = WG.ENCH_EXCL || [];
  EX.forEach(function (g) { if (g.indexOf('SHARPNESS') >= 0 && g.indexOf('SMITE') >= 0) g.push('BANE_OF_ARTHROPODS'); });
  EX.push(['DEPTH_STRIDER', 'FROST_WALKER'], ['MULTISHOT', 'PIERCING'], ['RIPTIDE', 'LOYALTY'], ['RIPTIDE', 'CHANNELING'], ['DENSITY', 'BREACH']);

  // ---------------- 効果の表 ----------------
  var E = WG.EFFECTS;
  E.HASTE = ['採掘速度上昇', '#d9c043']; E.RESISTANCE = ['耐性', '#9146f0']; E.NAUSEA = ['吐き気', '#551d4a']; E.BLINDNESS = ['盲目', '#1f1f23'];
  E.SATURATION = ['満腹度回復', '#f82423']; E.HEALTH_BOOST = ['体力増強', '#f87d23']; E.LUCK = ['幸運', '#59c106']; E.SLOW_FALLING = ['低速落下', '#f3cfb9'];
  E.DOLPHINS_GRACE = ['イルカの好意', '#88a3be']; E.TURTLE_MASTER = ['タートルマスター', '#7a6a5a'];

  // ---------------- ポーション：低速落下・タートルマスター・幸運 ----------------
  function item(key, name, max, extra) { var it = { key: key, name: name, block: -1, max: max || 64, shape: 'lump', color: '#888888' }; for (var k in extra || {}) it[k] = extra[k]; ITEMS[key] = it; }
  [['SLOW_FALLING', '低速落下', 'SLOW_FALLING', 90, 240, 0], ['TURTLE_MASTER', 'タートルマスター', 'TURTLE_MASTER', 20, 40, 20], ['LUCK', '幸運', 'LUCK', 300, 0, 0]].forEach(function (p) {
    var vars = [['', p[3], 0, '']];
    if (p[4]) vars.push(['_LONG', p[4], 0, '（延長）']);
    if (p[5]) vars.push(['_II', p[5], 1, ' II']);
    vars.forEach(function (v) {
      ['', 'SPLASH_'].forEach(function (sp) {
        item(sp + 'POTION_' + p[0] + v[0], (sp ? '投げ' : '') + p[1] + 'のポーション' + v[3], 1, { potion: true, splash: !!sp, effect: p[2], secs: v[1], amp: v[2], color: E[p[2]][1], base: p[0], variant: v[0] });
      });
    });
  });
  var brew = WG.brew;
  WG.brew = function (potKey, ing) {
    var it = ITEMS[potKey];
    if (potKey === 'POTION_AWKWARD' && ing === 'PHANTOM_MEMBRANE') return 'POTION_SLOW_FALLING';
    if (potKey === 'POTION_AWKWARD' && ing === 'TURTLE_HELMET') return 'POTION_TURTLE_MASTER';
    if (it && /^(SLOW_FALLING|TURTLE_MASTER|LUCK)$/.test(it.base || '')) {
      var sp = it.splash ? 'SPLASH_' : '';
      if (ing === 'GUNPOWDER' && !it.splash) return 'SPLASH_' + potKey;
      if (ing === 'REDSTONE' && !it.variant && ITEMS[sp + 'POTION_' + it.base + '_LONG']) return sp + 'POTION_' + it.base + '_LONG';
      if (ing === 'GLOWSTONE_DUST' && !it.variant && ITEMS[sp + 'POTION_' + it.base + '_II']) return sp + 'POTION_' + it.base + '_II';
      return null;
    }
    return brew(potKey, ing);
  };
  if (WG.BREW_INGREDIENTS) WG.BREW_INGREDIENTS.push('PHANTOM_MEMBRANE', 'TURTLE_HELMET');

  // 効果を付ける：タートルマスターは耐性と移動速度低下に分ける。体力増強は増えた分の体力も足す
  var addEffect = Game.prototype.addEffect;
  Game.prototype.addEffect = function (key, ticks, amp) {
    // 満腹度回復はすぐに効く（1 刻ごとに満腹度 1 の分をまとめて）
    if (key === 'SATURATION') { this.food = Math.min(20, this.food + (amp + 1) * Math.max(1, ticks)); addEffect.apply(this, arguments); this.inv.changed(); return; }
    if (key === 'TURTLE_MASTER') { addEffect.call(this, 'RESISTANCE', ticks, 2 + amp); addEffect.call(this, 'SLOWNESS', ticks, 3 + amp); return; }
    var had = this.effects.HEALTH_BOOST;
    var r = addEffect.apply(this, arguments);
    if (key === 'HEALTH_BOOST' && !had) this.health = Math.min(this.maxHealth(), this.health + 4 * (amp + 1));
    return r;
  };
  var maxHealth = Game.prototype.maxHealth;
  Game.prototype.maxHealth = function () { var hb = this.effects && this.effects.HEALTH_BOOST; return maxHealth.call(this) + (hb ? 4 * (hb.amp + 1) : 0); };

  // ---------------- 守り：耐性・棘の鎧 ----------------
  var modifyDamage = Game.prototype.modifyDamage;
  Game.prototype.modifyDamage = function (n, type) {
    n = modifyDamage.apply(this, arguments);
    var rs = ef(this, 'RESISTANCE');
    if (rs && n > 0) n *= Math.max(0, 1 - 0.2 * (rs.amp + 1));
    return n;
  };
  var hurtPlayer = Game.prototype.hurtPlayer;
  Game.prototype.hurtPlayer = function (n, fx, fz, type) {
    var hp0 = this.health, r = hurtPlayer.apply(this, arguments), th = armorLv(this, 'THORNS');
    if (th && type !== 'projectile' && this.health < hp0 && Math.random() < 0.15 * th) {
      var m = this.mobs.list.filter(function (q) { return !q.dead && Math.hypot(q.x - fx, q.z - fz) < 0.8; })[0];
      if (m) { this.mobs.hurt(m, 1 + Math.floor(Math.random() * 4), [this.walker.pos[0], this.walker.pos[2], 0.4]); this.puff(m.x, m.y + 1, m.z, [140, 200, 120], 6, 0.3); }
    }
    return r;
  };
  // 低速落下：落下のダメージを受けない
  var land = Game.prototype.land;
  Game.prototype.land = function (fall) { if (ef(this, 'SLOW_FALLING')) return; return land.apply(this, arguments); };

  // ---------------- 掘る：採掘速度上昇・水中採掘 ----------------
  var miningBonus = Game.prototype.miningBonus;
  Game.prototype.miningBonus = function (mn) {
    var r = miningBonus.apply(this, arguments), h = ef(this, 'HASTE'), w = this.walker, e = w.eye || w.pos;
    if (h) r.perTick *= 1 + 0.2 * (h.amp + 1);
    if (this.armor && this.armor[0] && lv(this.armor[0], 'AQUA_AFFINITY') && WG.isWater(this.world.block(Math.floor(e[0]), Math.floor(e[1]), Math.floor(e[2])))) r.perTick *= 5;
    return r;
  };

  // ---------------- 戦う：範囲ダメージ増加・虫特効・水生特効・密度・破砕・風爆 ----------------
  var BUGS = { SPIDER: 1, CAVE_SPIDER: 1, STONE_MITE: 1, SHADOW_MITE: 1, BEE: 1, ENDERMITE: 1 };
  var attackBonus = Game.prototype.attackBonus;
  Game.prototype.attackBonus = function (dmg, m, held) {
    var d = attackBonus.apply(this, arguments), T = m && TYPES[m.type];
    var bn = lv(held, 'BANE_OF_ARTHROPODS'); if (bn && T && BUGS[m.type]) d += 2.5 * bn;
    var im = lv(held, 'IMPALING'); if (im && T && (T.swims || T.fish)) d += 2.5 * im;
    if (this.maceBonus) { d += 0.5 * lv(held, 'DENSITY') * (this.walker.fallDist || 0); d += lv(held, 'BREACH') * 1.5; }
    return d;
  };
  var attack = Game.prototype.attack;
  Game.prototype.attack = function (m) {
    var w = this.walker, held = this.inv.held(), it = held && ITEMS[held.key], g = this;
    var smash = held && held.key === 'MACE' && (w.fallDist || 0) >= 1.5 && !w.flying, hp0 = m && m.hp;
    var r = attack.apply(this, arguments);
    // 風爆：叩きつけたあと、空へ跳ね上がる
    var wb = smash && lv(held, 'WIND_BURST');
    if (wb) { w.vel[1] = 0.55 + 0.3 * wb; w.fallDist = 0; for (var i = 0; i < 18; i++) { var a = i / 18 * 6.28; g.particles.push({ x: w.pos[0] + Math.cos(a) * 0.4, y: w.pos[1] + 0.1, z: w.pos[2] + Math.sin(a) * 0.4, vx: Math.cos(a) * 0.18, vy: 0.02, vz: Math.sin(a) * 0.18, life: 14, c: [214, 232, 244] }); } if (WG.Sound) WG.Sound.play('splash', w.pos[0], w.pos[1], w.pos[2]); }
    // 範囲ダメージ増加：剣で地面から叩くと、まわりの生き物にもダメージ（白い弧が見える）
    var sw = it && it.tool === 'sword' && lv(held, 'SWEEPING_EDGE');
    if (sw && m && w.onGround && !w.sprint && m.hp < hp0) {
      var base = WG.attackDamage(held), side = 1 + base * sw / (sw + 1);
      this.mobs.list.forEach(function (o) { if (o !== m && !o.dead && !TYPES[o.type].vehicle && !(TYPES[o.type].tame && o.tame) && Math.hypot(o.x - m.x, o.z - m.z) < 1.6 && Math.abs(o.y - m.y) < 1) g.mobs.hurt(o, side, [w.pos[0], w.pos[2], 0.4]); });
      var fx = -Math.sin(w.yaw), fz = -Math.cos(w.yaw);
      for (var k = -6; k <= 6; k++) { var ang = Math.atan2(fx, fz) + k * 0.16, rr = 1.6; g.particles.push({ x: w.pos[0] + Math.sin(ang) * rr, y: w.pos[1] + 1.1 + k * 0.012, z: w.pos[2] + Math.cos(ang) * rr, vx: 0, vy: 0, vz: 0, life: 6 + (6 - Math.abs(k)) / 3 | 0, c: [240, 240, 236], glow: true }); }
    }
    return r;
  };

  // ---------------- トライデント：忠誠・激流・召雷・水生特効 ----------------
  var tickTrident = Game.prototype.tickTrident;
  Game.prototype.tickTrident = function (held) {
    var w = this.walker, rp = lv(held, 'RIPTIDE'), wd = this.world;
    if (rp && !(this.mouseR && !this.invOpen) && this.trT >= 10 && w.eye) {
      var wet = w.fluid && w.fluid() === 'water', st = wd.weather, rain = st && st.rain && WG.precipAt ? WG.precipAt(wd, w.pos[0], w.pos[2]) === 'rain' : st && st.rain;
      this.trT = 0; w.using = false;
      if (!wet && !rain) return;
      var p = 0.9 + 0.45 * rp; w.vel = [w.dir[0] * p, w.dir[1] * p + 0.1, w.dir[2] * p]; w.flying = false; w.fallDist = 0; this.riptide = 20;
      if (this.mode === 'survival' && this.wearTool) this.wearTool(1);
      if (WG.Sound) WG.Sound.play('splash', w.pos[0], w.pos[1], w.pos[2]);
      return;
    }
    var n0 = this.mobs.arrows.length, r = tickTrident.apply(this, arguments), a = this.mobs.arrows[this.mobs.arrows.length - 1], g = this;
    if (this.mobs.arrows.length > n0 && a && a.trident) {
      a.impale = lv(held, 'IMPALING'); a.loyal = lv(held, 'LOYALTY'); a.tridentDmg = held.dmg || 0; a.tridentEnch = held.ench;
      if (lv(held, 'CHANNELING')) a.onHit = function (m) { var st = g.world.weather; if (st && st.thunder && g.strike) g.strike(Math.floor(m.x), Math.floor(m.y), Math.floor(m.z)); };
    }
    return r;
  };
  // 忠誠：刺さったトライデントは持ち主のところへ飛んで戻る
  var tickArrows = Mobs.prototype.tickArrows;
  Mobs.prototype.tickArrows = function () {
    var g = this.game, loyal = this.arrows.filter(function (a) { return a.trident && a.loyal && a.trident.drop; });
    loyal.forEach(function (a) { a.trident.drop = false; });
    var r = tickArrows.apply(this, arguments);
    loyal.forEach(function (a) {
      if (a.trident) { a.trident.drop = true; return; }   // まだ飛んでいる
      (g.returning || (g.returning = [])).push({ x: a.x, y: a.y, z: a.z, px: a.x, py: a.y, pz: a.z, sp: 0.35 + 0.15 * a.loyal, s: { key: 'TRIDENT', n: 1, dmg: a.tridentDmg, ench: a.tridentEnch } });
    });
    return r;
  };
  // ---------------- クロスボウ：拡散・貫通・高速装填 ----------------
  var tickCrossbow = Game.prototype.tickCrossbow;
  Game.prototype.tickCrossbow = function (held) {
    var w = this.walker, qc = lv(held, 'QUICK_CHARGE'), firing = held.loaded && !held.fwLoad && this.mouseR && !this.invOpen && !this.cbWait && w.eye;
    if (qc && !held.loaded && this.mouseR && !this.invOpen && !this.cbWait) this.cbT = (this.cbT || 0) + (25 / (25 - 5 * qc) - 1);
    var n0 = this.mobs.arrows.length, r = tickCrossbow.apply(this, arguments), self = this;
    if (firing && !held.loaded) {
      var pc = lv(held, 'PIERCING'), shot = this.mobs.arrows.slice(n0);
      shot.forEach(function (a) { if (pc) a.pierce = pc; });
      if (lv(held, 'MULTISHOT')) [-0.17, 0.17].forEach(function (da) {
        var c = Math.cos(da), s = Math.sin(da), d = w.dir, dir = [d[0] * c - d[2] * s, d[1], d[0] * s + d[2] * c];
        var a2 = self.mobs.shootFromPlayer(w.eye, dir, 3.15, 9, false); a2.punch = shot[0] ? shot[0].punch : 0;
      });
    }
    return r;
  };

  // ---------------- 呪い ----------------
  var clickSlot = Game.prototype.clickSlot;
  Game.prototype.clickSlot = function (el) {
    var c = el && el.dataset ? el.dataset.c : null, i = el && el.dataset ? +el.dataset.i : -1;
    if (c === 'arm' && this.mode === 'survival' && this.armor[i] && lv(this.armor[i], 'BINDING_CURSE')) { if (this.ui.toast) this.ui.toast('束縛の呪いで外せません'); return; }
    return clickSlot.apply(this, arguments);
  };
  var die = Game.prototype.die;
  Game.prototype.die = function () {
    var s = this.inv.slots, i;
    for (i = 0; i < s.length; i++) if (s[i] && lv(s[i], 'VANISHING_CURSE')) s[i] = null;
    for (i = 0; i < 4; i++) if (this.armor[i] && lv(this.armor[i], 'VANISHING_CURSE')) this.armor[i] = null;
    if (this.player.offhand && lv(this.player.offhand, 'VANISHING_CURSE')) this.player.offhand = null;
    return die.apply(this, arguments);
  };

  // ---------------- 毎刻：足のエンチャント・効果 ----------------
  var tick = Game.prototype.tick;
  Game.prototype.tick = function () {
    var r = tick.apply(this, arguments), g = this, w = this.walker, wd = this.world, p = w.pos;
    if (!p || this.dead) return r;
    var fl = w.fluid ? w.fluid() : null, below = wd.block(Math.floor(p[0]), Math.floor(p[1] - 0.2), Math.floor(p[2]));
    // 水中歩行・イルカの好意
    var ds = boots(this, 'DEPTH_STRIDER'), dg = ef(this, 'DOLPHINS_GRACE');
    w.fluidMul = (1 + ds * 0.55) * (dg ? 2.4 : 1); w.fluidDrag = ds * 0.035 + (dg ? 0.08 : 0);
    // スニーク速度上昇
    var ss = this.armor && this.armor[2] ? lv(this.armor[2], 'SWIFT_SNEAK') : 0; w.sneakMul = 1 + 0.5 * ss;
    // 魂の速さ：ソウルサンドとソウルソイルの上で速く、青い魂が舞う
    var so = boots(this, 'SOUL_SPEED');
    if (so && w.onGround && (below === B.SOUL_SAND || below === B.SOUL_SOIL)) {
      w.speedMul = (w.speedMul || 1) * (1.6 + 0.25 * so) * (below === B.SOUL_SAND ? 1.6 : 1);
      if (Math.hypot(w.vel[0], w.vel[2]) > 0.05 && Math.random() < 0.4) this.particles.push({ x: p[0] + (Math.random() - 0.5) * 0.5, y: p[1] + 0.1, z: p[2] + (Math.random() - 0.5) * 0.5, vx: 0, vy: 0.04, vz: 0, life: 20, c: [110, 220, 230], glow: true });
    }
    // 低速落下
    w.slowFall = !!ef(this, 'SLOW_FALLING');
    // 氷渡り：足元のまわりの水が凍り、しばらくすると溶ける
    var fw = boots(this, 'FROST_WALKER');
    if (fw && w.onGround && !fl) {
      var R = 2 + fw, x0 = Math.floor(p[0]), z0 = Math.floor(p[2]), y = Math.floor(p[1] - 0.2), fz = wd.frosted || (wd.frosted = new Map());
      for (var dz = -R; dz <= R; dz++) for (var dx = -R; dx <= R; dx++) {
        if (dx * dx + dz * dz > R * R) continue;
        var bx = x0 + dx, bz = z0 + dz;
        if (wd.block(bx, y, bz) === B.WATER && wd.block(bx, y + 1, bz) === B.AIR) { wd.setBlock(bx, y, bz, B.ICE); fz.set(bx + ',' + y + ',' + bz, 60 + Math.floor(Math.random() * 60)); w.remesh(bx, bz); }
      }
    }
    if (wd.frosted && wd.frosted.size && (this.tickCount || 0) % 5 === 0) wd.frosted.forEach(function (t, k) {
      var q = k.split(',').map(Number), on = Math.floor(p[0]) === q[0] && Math.floor(p[2]) === q[2] && Math.floor(p[1] - 0.2) === q[1];
      if (on && fw) return;
      t -= 5; if (t > 0) { wd.frosted.set(k, t); return; }
      wd.frosted.delete(k); if (wd.block(q[0], q[1], q[2]) === B.ICE) { wd.setBlock(q[0], q[1], q[2], B.WATER); w.remesh(q[0], q[2]); }
    });
    // 激流で飛んでいる間は、くるくる回る水しぶき
    if (this.riptide > 0) { this.riptide--; for (var k2 = 0; k2 < 3; k2++) { var a = (this.tickCount + k2 * 2) * 0.9; this.particles.push({ x: p[0] + Math.cos(a) * 0.7, y: p[1] + 1 + Math.sin(a) * 0.7, z: p[2], vx: 0, vy: 0, vz: 0, life: 8, c: [150, 200, 240] }); } }
    // 体力増強が切れたら、増えた分の体力は消える
    if (this.health > this.maxHealth()) this.health = this.maxHealth();
    // イルカ：泳いでいるプレイヤーの近くにいると好意をくれる
    if (this.tickCount % 20 === 0 && w.swimming) this.mobs.list.forEach(function (m) { if (m.type === 'DOLPHIN' && !m.dead && Math.hypot(m.x - p[0], m.y - p[1], m.z - p[2]) < 6) g.addEffect('DOLPHINS_GRACE', 100, 0); });
    // 盲目のあいだは走れない
    if (ef(this, 'BLINDNESS')) w.sprint = false;
    // 戻ってくるトライデント
    if (this.returning && this.returning.length) this.returning = this.returning.filter(function (t) {
      var tx = p[0], ty = p[1] + 1.2, tz = p[2], d = Math.hypot(tx - t.x, ty - t.y, tz - t.z);
      t.px = t.x; t.py = t.y; t.pz = t.z;
      if (d < 1.2) { if (!g.inv.add('TRIDENT', 1, t.s.dmg, t.s.ench)) g.spawnItem('TRIDENT', 1, tx, ty, tz, 0, 0, t.s.dmg, t.s.ench); if (WG.Sound) WG.Sound.play('pop', tx, ty, tz); return false; }
      t.x += (tx - t.x) / d * t.sp; t.y += (ty - t.y) / d * t.sp; t.z += (tz - t.z) / d * t.sp; t.dir = [(tx - t.x) / d, (ty - t.y) / d, (tz - t.z) / d];
      if (Math.random() < 0.5) g.particles.push({ x: t.x, y: t.y, z: t.z, vx: 0, vy: 0, vz: 0, life: 10, c: [120, 220, 210], glow: true });
      return true;
    });
    this.updateEffectScreen();
    return r;
  };
  var drawExtra = Game.prototype.drawExtra;
  Game.prototype.drawExtra = function (solid, a, cube) {
    var r = drawExtra.apply(this, arguments);
    (this.returning || []).forEach(function (t) {
      var x = t.px + (t.x - t.px) * a, y = t.py + (t.y - t.py) * a, z = t.pz + (t.z - t.pz) * a, d = t.dir || [0, 0, 1];
      for (var i = -3; i <= 3; i++) cube(solid, x + d[0] * i * 0.18, y + d[1] * i * 0.18, z + d[2] * i * 0.18, i === -3 ? 0.11 : 0.06, 0, function () { return 0; }, function () { return i === -3 ? [150, 210, 200] : [70, 140, 140]; }, [15, 15]);
    });
    return r;
  };

  // ---------------- 画面：吐き気（ゆがむ）と盲目（まわりが暗い） ----------------
  Game.prototype.updateEffectScreen = function () {
    if (typeof document === 'undefined') return;
    var na = ef(this, 'NAUSEA'), bl = ef(this, 'BLINDNESS'), cv = document.getElementById('c3d');
    if (cv) {
      var t = (this.tickCount || 0) * 0.07, k = na ? Math.min(1, na.t / 60) : 0;
      cv.style.transform = k ? 'perspective(900px) rotateY(' + (Math.sin(t) * 7 * k).toFixed(2) + 'deg) rotateX(' + (Math.cos(t * 1.3) * 4 * k).toFixed(2) + 'deg) scale(' + (1 + 0.14 * k) + ') skewX(' + (Math.sin(t * 0.7) * 3 * k).toFixed(2) + 'deg)' : '';
      cv.style.filter = k ? 'hue-rotate(' + (Math.sin(t * 0.5) * 25 * k).toFixed(1) + 'deg) saturate(' + (1 + 0.3 * k) + ')' : '';
    }
    var ov = document.getElementById('blindView');
    if (bl && !ov && cv && cv.parentElement) { ov = document.createElement('div'); ov.id = 'blindView'; ov.style.cssText = 'position:absolute;inset:0;pointer-events:none;transition:opacity .6s;background:radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0, rgba(0,0,0,.55) 9%, rgba(0,0,0,.96) 22%, #000 40%)'; cv.parentElement.insertBefore(ov, cv.nextSibling); }
    if (ov) ov.style.opacity = bl ? Math.min(1, bl.t / 20) : 0;
  };

  // ---------------- 手に入れ方：怪しげなシチュー・フグ・エンチャントされた金のリンゴ ----------------
  var STEW = { DANDELION: ['SATURATION', 7], BLUE_ORCHID: ['SATURATION', 7], POPPY: ['NIGHT_VISION', 100], AZURE_BLUET: ['BLINDNESS', 160], ALLIUM: ['FIRE_RESISTANCE', 80],
    OXEYE_DAISY: ['REGENERATION', 160], CORNFLOWER: ['JUMP_BOOST', 120], LILY_OF_THE_VALLEY: ['POISON', 240], WITHER_ROSE: ['WITHER', 160], TORCHFLOWER: ['NIGHT_VISION', 100] };
  WG.STEW_EFFECTS = STEW;
  item('SUSPICIOUS_STEW', '怪しげなシチュー', 1, { food: 6, sat: 0.6, leaves: 'BOWL' });
  Object.keys(STEW).forEach(function (f) { if (ITEMS[f]) WG.Craft.SHAPELESS.push([['BOWL', 'BROWN_MUSHROOM', 'RED_MUSHROOM', f], 'SUSPICIOUS_STEW', 1]); });
  // 作るときに花を覚えておく
  var craftResult = WG.Craft.match;
  WG.Craft.match = function (grid) {
    var r = craftResult.apply(this, arguments);
    if (r && r.key === 'SUSPICIOUS_STEW') { var f = (grid || []).filter(function (k) { return k && STEW[k]; })[0]; if (f) r = Object.assign({}, r, { stew: f }); }
    return r;
  };
  var consumeExtra = Game.prototype.consumeExtra;
  Game.prototype.consumeExtra = function (it) {
    var held = this.inv.held(), st = held && held.stew, r = consumeExtra.apply(this, arguments);
    if (it.key === 'SUSPICIOUS_STEW' && st && STEW[st]) this.addEffect(STEW[st][0], STEW[st][1], 0);
    if (it.key === 'PUFFERFISH') this.addEffect('NAUSEA', 300, 0);
    if (it.key === 'ENCHANTED_GOLDEN_APPLE') this.addEffect('RESISTANCE', 6000, 0);
    return r;
  };
  var stackInfo = WG.stackInfo;
  WG.stackInfo = function (s) { var t = stackInfo ? stackInfo(s) : ''; if (s.key === 'SUSPICIOUS_STEW' && s.stew && STEW[s.stew]) t += '（' + WG.itemName(s.stew) + '）'; return t; };
})(typeof window !== 'undefined' ? window : globalThis);
