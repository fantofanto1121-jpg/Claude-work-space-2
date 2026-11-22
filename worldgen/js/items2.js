// 足りなかったアイテム（第 2 回）
// ・食べ物：卵・ケーキ（置いて 7 口）・パンプキンパイ・クッキー・ビートルート（種・作物・スープ）・スイートベリー（茂み）
//   ウサギシチュー・あやしいシチュー・エンチャントされた金のリンゴ
// ・戦い：不死のトーテム・衝撃吸収と発光の効果・光の矢・効能付きの矢・残留ポーション・竜の息・カメの甲羅
// ・道具：エンチャントの瓶・ファイヤーチャージ・防具立て・バンドル・ジュークボックスとレコード（曲はこのゲームのための作曲）
//   ヤギの角笛・リカバリーコンパス
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Mobs = WG.Mobs, TYPES = WG.MOB_TYPES, MODELS = WG.MOB_MODELS, Walker = WG.Walker;
  function keyOf(id) { return WG.BLOCKS[id] ? WG.BLOCKS[id].key : ''; }
  function rint(n) { return Math.floor(Math.random() * n); }
  function item(key, name, max, extra) {
    var it = { key: key, name: name, block: -1, max: max || 64, shape: 'lump', color: '#888888' };
    for (var k in extra || {}) it[k] = extra[k];
    ITEMS[key] = it;
    return it;
  }
  function blockItem(key, hardness) { var id = B[key]; ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: null, dropMin: 1, dropMax: 1, dropChance: 1 }; }
  function rgb(hex) { return [parseInt(hex.substr(1, 2), 16), parseInt(hex.substr(3, 2), 16), parseInt(hex.substr(5, 2), 16)]; }
  var UNDEAD = { ZOMBIE: 1, SKELETON: 1, HUSK: 1, DROWNED: 1, DARK_SKELETON: 1, SKULL_BOSS: 1 };

  // ---------------- 効果（追加） ----------------
  WG.EFFECTS.ABSORPTION = ['衝撃吸収', '#2552a5'];
  WG.EFFECTS.GLOWING = ['発光', '#94a061'];

  // ---------------- アイテム ----------------
  item('EGG', '卵', 16, { splash: true, throwColor: '#f0e6d0' });
  item('CAKE', 'ケーキ', 1);
  item('PUMPKIN_PIE', 'パンプキンパイ', 64, { food: 8, sat: 0.3 });
  item('COOKIE', 'クッキー', 64, { food: 2, sat: 0.1 });
  item('BEETROOT', 'ビートルート', 64, { food: 1, sat: 0.6 });
  item('BEETROOT_SEEDS', 'ビートルートの種', 64, { plant: 'BEETROOTS_0' });
  item('BEETROOT_SOUP', 'ビートルートスープ', 1, { food: 6, sat: 0.6, leaves: 'BOWL' });
  item('SWEET_BERRIES', 'スイートベリー', 64, { food: 2, sat: 0.1 });
  item('RABBIT_STEW', 'ウサギシチュー', 1, { food: 10, sat: 0.6, leaves: 'BOWL' });
  item('SUSPICIOUS_STEW_POPPY', 'あやしいシチュー', 1, { food: 6, sat: 0.6, leaves: 'BOWL', stew: ['NIGHT_VISION', 100] });
  item('SUSPICIOUS_STEW_DANDELION', 'あやしいシチュー', 1, { food: 6, sat: 0.6, leaves: 'BOWL', stew: ['SATURATION', 0] });
  item('ENCHANTED_GOLDEN_APPLE', 'エンチャントされた金のリンゴ', 64, { food: 4, sat: 1.2, regen: 1, godApple: true });
  item('TOTEM_OF_UNDYING', '不死のトーテム', 1);
  item('SPECTRAL_ARROW', '光の矢', 64, { arrow: true, glowArrow: true });
  ITEMS.ARROW.arrow = true;
  item('DRAGON_BREATH', '竜の息', 64);
  item('SCUTE', 'カメのウロコ', 64);
  item('TURTLE_HELMET', 'カメの甲羅', 1, { armor: 0, def: 2, tough: 0, dur: 275, mat: 'SCUTE' });
  item('EXPERIENCE_BOTTLE', 'エンチャントの瓶', 64, { splash: true, xpBottle: true, throwColor: '#7ad84a' });
  item('FIRE_CHARGE', 'ファイヤーチャージ', 64);
  item('ARMOR_STAND', '防具立て', 16);
  item('BUNDLE', 'バンドル', 1, { bundle: true });
  item('BUNDLE_FILLED', 'バンドル', 1, { bundle: true });
  item('GOAT_HORN', 'ヤギの角笛', 1);
  item('RECOVERY_COMPASS', 'リカバリーコンパス', 1);
  blockItem('JUKEBOX', 2);
  ITEMS.JUKEBOX.drop = 'JUKEBOX';
  for (var cb = 0; cb < 7; cb++) blockItem('CAKE_' + cb, 0.5);
  for (var bt = 0; bt < 4; bt++) { blockItem('BEETROOTS_' + bt, 0); blockItem('SWEET_BERRY_BUSH_' + bt, 0); }

  // レコード（曲名と、コンパレーターの強さ）。旋律は js/sound.js の WG.Sound.music にある
  var DISCS = [['MEADOW', '朝の草原'], ['DRIP', '洞窟のしずく'], ['FORGE', 'ネザーの炉'], ['STARS', '果ての星'], ['MARKET', '村の市場']];
  DISCS.forEach(function (d, i) { item('MUSIC_DISC_' + d[0], 'レコード「' + d[1] + '」', 1, { disc: d[0], song: d[1], signal: i + 1 }); });
  WG.DISCS = DISCS;

  // 残留ポーションと効能付きの矢（投げポーションの種類ごと）
  Object.keys(ITEMS).forEach(function (k) {
    var it = ITEMS[k];
    if (!it.potion || !it.splash || !/^SPLASH_POTION_/.test(k)) return;
    var lk = k.replace('SPLASH_', 'LINGERING_');
    item(lk, it.name.replace(/^投げ/, '残留'), 1, { potion: true, splash: true, lingering: true, effect: it.effect, secs: it.secs, amp: it.amp, color: it.color, base: it.base, variant: it.variant });
    if (!it.effect) return;
    var ak = k.replace('SPLASH_POTION_', 'TIPPED_ARROW_'), nm = it.name.replace(/^投げ/, '').replace('のポーション', 'の矢');
    item(ak, nm, 64, { arrow: true, tipped: true, effect: it.effect, secs: Math.max(1, Math.round(it.secs / 8)), amp: it.amp, color: it.color, base: it.base, variant: it.variant });
    Craft.SHAPED.push([['AAA', 'APA', 'AAA'], { A: 'ARROW', P: lk }, ak, 8]);
  });
  // 醸造：投げポーション＋竜の息 → 残留ポーション。残留ポーションにも延長・強化・反転が効く
  var brew = WG.brew;
  WG.brew = function (potKey, ing) {
    var it = ITEMS[potKey];
    if (it && it.lingering) { var r = brew('SPLASH_' + potKey.replace('LINGERING_', ''), ing); return r && /^SPLASH_/.test(r) && ITEMS[r.replace('SPLASH_', 'LINGERING_')] ? r.replace('SPLASH_', 'LINGERING_') : null; }
    if (it && it.splash && ing === 'DRAGON_BREATH') return ITEMS[potKey.replace('SPLASH_', 'LINGERING_')] ? potKey.replace('SPLASH_', 'LINGERING_') : null;
    return brew.apply(this, arguments);
  };
  WG.BREW_INGREDIENTS.push('DRAGON_BREATH');
  // ---------------- レシピ ----------------
  Craft.SHAPED.push(
    [['MMM', 'SES', 'WWW'], { M: 'MILK_BUCKET', S: 'SUGAR', E: 'EGG', W: 'WHEAT' }, 'CAKE', 1],
    [['WCW'], { W: 'WHEAT', C: 'COCOA_BEANS' }, 'COOKIE', 8],
    [['SSS', 'S S'], { S: 'SCUTE' }, 'TURTLE_HELMET', 1],
    [['SSS', ' S ', 'SWS'], { S: 'STICK', W: 'COBBLESTONE_SLAB' }, 'ARMOR_STAND', 1],
    [['S', 'L'], { S: 'STRING', L: 'LEATHER' }, 'BUNDLE', 1],
    [['PPP', 'PDP', 'PPP'], { P: 'PLANKS', D: 'DIAMOND' }, 'JUKEBOX', 1],
    [['AAA', 'ACA', 'AAA'], { A: 'AMETHYST_SHARD', C: 'COMPASS' }, 'RECOVERY_COMPASS', 1],
    [[' G ', 'GAG', ' G '], { G: 'GLOWSTONE_DUST', A: 'ARROW' }, 'SPECTRAL_ARROW', 2]);
  Craft.SHAPELESS.push(
    [['PUMPKIN', 'SUGAR', 'EGG'], 'PUMPKIN_PIE', 1],
    [['BEETROOT', 'BEETROOT', 'BEETROOT', 'BEETROOT', 'BEETROOT', 'BEETROOT', 'BOWL'], 'BEETROOT_SOUP', 1],
    [['COOKED_RABBIT', 'CARROT', 'BAKED_POTATO', 'BROWN_MUSHROOM', 'BOWL'], 'RABBIT_STEW', 1],
    [['RED_MUSHROOM', 'BROWN_MUSHROOM', 'BOWL', 'POPPY'], 'SUSPICIOUS_STEW_POPPY', 1],
    [['RED_MUSHROOM', 'BROWN_MUSHROOM', 'BOWL', 'DANDELION'], 'SUSPICIOUS_STEW_DANDELION', 1],
    [['BLAZE_POWDER', 'COAL', 'GUNPOWDER'], 'FIRE_CHARGE', 3],
    [['BEETROOT'], 'RED_DYE', 1]);
  // ケーキを作るとバケツが 3 つ戻る
  var consumeCraft = Game.prototype.consumeCraft;
  Game.prototype.consumeCraft = function () {
    var r = this.craftResult, w = this.walker;
    consumeCraft.apply(this, arguments);
    if (r && r.key === 'CAKE') { var left = 3 - this.inv.add('BUCKET', 3); if (left > 0) this.spawnItem('BUCKET', left, w.pos[0], w.pos[1] + 1, w.pos[2], 0.1, 20); }
  };

  // ---------------- 宝箱・ドロップ ----------------
  var SL = WG.STRUCTURE_LOOT || {};
  function addLoot(t, list) { if (SL[t]) list.forEach(function (l) { if (ITEMS[l[0]]) SL[t].push(l); }); }
  addLoot('mansion', [['TOTEM_OF_UNDYING', 1, 1, 8], ['MUSIC_DISC_MARKET', 1, 1, 3], ['MUSIC_DISC_DRIP', 1, 1, 3]]);
  addLoot('stronghold', [['EXPERIENCE_BOTTLE', 1, 4, 6], ['MUSIC_DISC_STARS', 1, 1, 2]]);
  addLoot('ship_supply', [['BEETROOT_SEEDS', 2, 6, 6], ['SWEET_BERRIES', 2, 6, 4]]);
  addLoot('ship_treasure', [['EXPERIENCE_BOTTLE', 1, 5, 10]]);
  addLoot('jungle', [['ENCHANTED_GOLDEN_APPLE', 1, 1, 1], ['MUSIC_DISC_MEADOW', 1, 1, 2]]);
  addLoot('bastion', [['ENCHANTED_GOLDEN_APPLE', 1, 1, 2], ['MUSIC_DISC_FORGE', 1, 1, 3]]);
  addLoot('end_city', [['EXPERIENCE_BOTTLE', 2, 6, 6], ['MUSIC_DISC_STARS', 1, 1, 2]]);
  addLoot('fortress', [['MUSIC_DISC_FORGE', 1, 1, 2]]);
  if (WG.DUNGEON_LOOT) WG.DUNGEON_LOOT.push(['ENCHANTED_GOLDEN_APPLE', 1, 1, 1], ['BEETROOT_SEEDS', 2, 4, 6], ['MUSIC_DISC_MEADOW', 1, 1, 2], ['MUSIC_DISC_DRIP', 1, 1, 2], ['EXPERIENCE_BOTTLE', 1, 3, 3]);
  // ヤギは角笛を落とすことがある。カメは海草で増え、子が育つとウロコを落とす
  if (TYPES.GOAT) { TYPES.GOAT.rare = ['GOAT_HORN']; TYPES.GOAT.rareP = 0.35; }
  if (TYPES.TURTLE) { TYPES.TURTLE.food = ['SEAGRASS']; TYPES.TURTLE.breed = ['SEAGRASS']; TYPES.TURTLE.breeds = true; }
  if (TYPES.CHICKEN) TYPES.CHICKEN.food = TYPES.CHICKEN.food.concat(['BEETROOT_SEEDS']);
  if (TYPES.PIG) TYPES.PIG.food = (TYPES.PIG.food || []).concat(['BEETROOT']);

  // ---------------- 防具立て（動かない生き物として置く） ----------------
  TYPES.ARMOR_STAND = { name: '防具立て', w: 0.5, h: 1.975, hp: 2, speed: 0, food: [], drops: [], noFall: true, stand: true };
  (function () {
    function hex(c) { return rgb(c); }
    function box(x, y, z, w, h, d, c, extra) { var b = { o: [x, y, z], s: [w, h, d], c: hex(c), sw: null }; for (var k in extra || {}) b[k] = extra[k]; return b; }
    var W = '#b08a54', S = '#8e8e8a', P = [box(-6, 0, -6, 12, 1, 12, S), box(-3, 1, -1, 2, 11, 2, W), box(1, 1, -1, 2, 11, 2, W), box(-4, 11, -1.5, 8, 2, 3, W),
      box(-3, 13, -1, 2, 8, 2, W), box(1, 13, -1, 2, 8, 2, W), box(-6, 21, -1.5, 12, 3, 3, W), box(-1, 24, -1, 2, 7, 2, W),
      box(-8, 12, -1, 2, 10, 2, W), box(6, 12, -1, 2, 10, 2, W)];
    // 防具の素材ごとの色
    var MAT = { LEATHER: '#94582c', CHAINMAIL: '#8c8c94', IRON: '#cfcfd4', GOLDEN: '#e8b830', DIAMOND: '#46d4cc', NETHERITE: '#4c4448', TURTLE: '#4c9a3c' };
    function matOf(key) { var m = /^(LEATHER|CHAINMAIL|IRON|GOLDEN|DIAMOND|NETHERITE|TURTLE)_/.exec(key); return m ? m[1] : 'IRON'; }
    WG.standMat = matOf;
    var SHAPES = [
      [[-4.5, 23.5, -4.5, 9, 9, 9]],
      [[-4.5, 11.5, -2.5, 9, 13, 5], [-8.6, 17.5, -2.5, 4.2, 7, 5], [4.4, 17.5, -2.5, 4.2, 7, 5]],
      [[-4.5, 3, -2.5, 4.4, 9.8, 5], [0.1, 3, -2.5, 4.4, 9.8, 5]],
      [[-4.6, 0.9, -2.6, 4.5, 3.6, 5.2], [0.1, 0.9, -2.6, 4.5, 3.6, 5.2]]];
    Object.keys(MAT).forEach(function (mat) {
      SHAPES.forEach(function (list, slot) {
        list.forEach(function (s) {
          P.push(box(s[0], s[1], s[2], s[3], s[4], s[5], MAT[mat], { only: function (m) { var a = m.armor && m.armor[slot]; return !!a && matOf(a.key) === mat; } }));
        });
      });
    });
    MODELS.ARMOR_STAND = P;
  })();
  // 防具立てを壊すと、防具立てと着せた防具を落とす（経験値は出ない）
  var mdie = Mobs.prototype.die;
  Mobs.prototype.die = function (m) {
    var g = this.game;
    if (m.type === 'ARMOR_STAND') {
      g.spawnItem('ARMOR_STAND', 1, m.x, m.y + 0.3, m.z, 0.1, 10);
      (m.armor || []).forEach(function (a) { if (a) g.spawnItem(a.key, 1, m.x, m.y + 0.8, m.z, 0.1, 10, a.dmg, a.ench); });
      m.armor = [null, null, null, null];
      g.spawnOrbs = null; try { return mdie.apply(this, arguments); } finally { delete g.spawnOrbs; }
    }
    return mdie.apply(this, arguments);
  };

  // ---------------- 生き物：発光・遅くなる・卵を産む・カメのウロコ・竜の息 ----------------
  function applyToMob(g, m, effect, ticks, amp) {
    if (m.dead || m.type === 'ARMOR_STAND') return;
    var heal = effect === 'INSTANT_HEALTH', harm = effect === 'INSTANT_DAMAGE';
    if (UNDEAD[m.type]) { var t = heal; heal = harm; harm = t; }
    if (harm) g.mobs.hurt(m, 6 << amp, null);
    if (heal) m.hp = Math.min(m.maxHp || TYPES[m.type].hp, m.hp + (4 << amp));
    if (effect === 'POISON' && !UNDEAD[m.type]) m.poison = Math.max(m.poison || 0, ticks);
    if (effect === 'SLOWNESS') m.slowT = Math.max(m.slowT || 0, ticks);
    if (effect === 'GLOWING') m.glow = Math.max(m.glow || 0, ticks);
  }
  WG.applyToMob = applyToMob;
  var mtick = Mobs.prototype.tick;
  Mobs.prototype.tick = function () {
    var g = this.game, before = {};
    this.list.forEach(function (m) { if (m.slowT > 0) before[m.id || (m.id = Math.random())] = [m.x, m.z]; if (m.type === 'TURTLE') m.wasBaby = m.baby > 0; });
    mtick.apply(this, arguments);
    var wd = this.world;
    this.list.forEach(function (m) {
      if (m.dead) return;
      if (m.glow > 0) m.glow--;
      if (m.slowT > 0) { m.slowT--; var b = before[m.id]; if (b) { m.x = b[0] + (m.x - b[0]) * 0.55; m.z = b[1] + (m.z - b[1]) * 0.55; } }
      if (m.type === 'ARMOR_STAND') { m.vx = m.vz = 0; m.ai && (m.ai.tx = null); }
      // 鶏はときどき卵を産む（5〜10 分ごと）
      if (m.type === 'CHICKEN' && !m.baby) {
        if (m.eggT == null) m.eggT = 6000 + rint(6000);
        if (--m.eggT <= 0) { m.eggT = 6000 + rint(6000); g.spawnItem('EGG', 1, m.x, m.y + 0.3, m.z, 0.05, 10); if (WG.Sound) WG.Sound.play('pop', m.x, m.y, m.z); }
      }
      // カメの子が大人になると、ウロコを 1 つ落とす
      if (m.type === 'TURTLE' && m.wasBaby && !(m.baby > 0)) { g.spawnItem('SCUTE', 1, m.x, m.y + 0.3, m.z, 0.05, 10); m.wasBaby = false; }
      // 果ての竜は、ときどき紫の火の玉を吐く。落ちたところに竜の息の雲が残る
      if (m.type === 'END_DRAGON' && wd.dimKey === 'end' && g.mode === 'survival' && !g.dead) {
        if (m.breathCd == null) m.breathCd = 300 + rint(300);
        var w = g.walker, dist = Math.hypot(w.pos[0] - m.x, w.pos[1] - m.y, w.pos[2] - m.z);
        if (--m.breathCd <= 0 && dist < 64) {
          m.breathCd = 260 + rint(300);
          var tx = w.pos[0] - m.x, ty = w.pos[1] + 0.5 - m.y, tz = w.pos[2] - m.z, d = Math.hypot(tx, ty, tz) || 1;
          (g.breathBalls || (g.breathBalls = [])).push({ x: m.x, y: m.y + 1, z: m.z, vx: tx / d * 0.7, vy: ty / d * 0.7, vz: tz / d * 0.7, life: 0 });
          if (WG.Sound) WG.Sound.play('ignite', m.x, m.y, m.z);
        }
      }
    });
  };
  // 発光している生き物は、いつも明るく、少し白っぽく描く
  var mdraw = Mobs.prototype.draw;
  Mobs.prototype.draw = function (bt, a, cube) {
    var all = this.list, glow = all.filter(function (m) { return m.glow > 0 && !m.dead; });
    if (!glow.length) return mdraw.apply(this, arguments);
    this.list = all.filter(function (m) { return glow.indexOf(m) < 0; });
    try { mdraw.call(this, bt, a, cube); } finally { this.list = all; }
    var arrows = this.arrows, pulse = 0.22 + 0.1 * Math.sin((this.game.tickCount || 0) * 0.3);
    this.list = glow; this.arrows = [];
    try {
      mdraw.call(this, bt, a, function (b2, o, s, fn, c) {
        b2.L = [15, 15];
        cube(b2, o, s, fn, [c[0] + (255 - c[0]) * pulse, c[1] + (250 - c[1]) * pulse, c[2] + (215 - c[2]) * pulse]);
      });
    } finally { this.list = all; this.arrows = arrows; }
  };

  // ---------------- 矢：光の矢・効能付きの矢 ----------------
  var tickArrows = Mobs.prototype.tickArrows;
  Mobs.prototype.tickArrows = function () {
    var g = this.game, flying = this.arrows.filter(function (a) { return a.kind && !a.stuck && !a.dead; });
    tickArrows.apply(this, arguments);
    var self = this;
    flying.forEach(function (a) {
      if (!a.dead) return;
      var best = null, bd = 2.5;
      self.list.forEach(function (m) { if (m.dead) return; var d = Math.hypot(m.x - a.x, m.y + 0.6 - a.y, m.z - a.z); if (d < bd) { bd = d; best = m; } });
      var it = ITEMS[a.kind];
      if (!best || !it) return;
      if (it.glowArrow) applyToMob(g, best, 'GLOWING', 200, 0);
      if (it.tipped) applyToMob(g, best, it.effect, it.secs * 20, it.amp);
    });
    // 飛んでいる矢・刺さった矢から、効果の色の粒
    if ((g.tickCount || 0) % 2 === 0) this.arrows.forEach(function (a) {
      var it = a.kind && ITEMS[a.kind];
      if (!it || (a.stuck && Math.random() < 0.7)) return;
      var c = it.glowArrow ? [255, 236, 120] : rgb(it.color || '#ffffff');
      g.particles.push({ x: a.x, y: a.y, z: a.z, vx: (Math.random() - 0.5) * 0.02, vy: 0.01, vz: (Math.random() - 0.5) * 0.02, life: 12, c: c });
    });
  };

  // ---------------- 投げるもの：卵・エンチャントの瓶・残留ポーション ----------------
  var splash = Game.prototype.splash;
  Game.prototype.splash = function (t) {
    var it = ITEMS[t.key];
    if (t.key === 'EGG') {
      this.puff(t.x, t.y, t.z, [240, 232, 210], 8, 0.15); this.puff(t.x, t.y, t.z, [240, 200, 80], 3, 0.1);
      if (Math.random() < 1 / 8) { var c = this.mobs.spawn('CHICKEN', t.x, Math.floor(t.y) + 0.1, t.z); if (c) c.baby = 24000; }
      return;
    }
    if (it && it.xpBottle) {
      this.puff(t.x, t.y, t.z, [120, 220, 90], 18, 0.4); this.puff(t.x, t.y, t.z, [200, 240, 255], 8, 0.3);
      this.spawnOrbs(t.x, t.y + 0.2, t.z, 3 + rint(9));
      if (WG.Sound) WG.Sound.play('pop', t.x, t.y, t.z);
      return;
    }
    if (it && it.lingering) {
      this.puff(t.x, t.y, t.z, rgb(it.color || '#385dc6'), 24, 1);
      if (it.effect) this.addCloud(t.x, t.y, t.z, { effect: it.effect, secs: it.secs, amp: it.amp, color: it.color, max: 600 });
      return;
    }
    return splash.apply(this, arguments);
  };
  // 雲：半径 3 から小さくなっていき、中にいるものに 1 秒ごとに効く（効果の時間は 1/4）
  Game.prototype.addCloud = function (x, y, z, o) {
    var wd = this.world, fy = Math.floor(y);
    for (var k = 0; k < 4 && fy > wd.minY && !WG.COLLIDE[wd.block(Math.floor(x), fy - 1, Math.floor(z))]; k++) fy--;
    var c = { x: x, y: fy, z: z, r: 3, t: 0, max: o.max || 600, effect: o.effect, secs: o.secs || 0, amp: o.amp || 0, color: o.color || '#ffffff', breath: !!o.breath };
    (this.clouds || (this.clouds = [])).push(c);
    return c;
  };
  Game.prototype.tickClouds = function () {
    var self = this, w = this.walker, keep = [];
    (this.clouds || []).forEach(function (c) {
      c.t++;
      var r = Math.max(0.5, c.r * (1 - c.t / c.max * 0.8)), col = rgb(c.color);
      // 粒：床の上の円にゆっくり立ちのぼる
      for (var i = 0; i < Math.ceil(r * 2.5); i++) {
        var an = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * r;
        self.particles.push({ x: c.x + Math.cos(an) * rr, y: c.y + 0.05 + Math.random() * 0.2, z: c.z + Math.sin(an) * rr, vx: 0, vy: 0.012 + Math.random() * 0.01, vz: 0, life: 14 + rint(10),
          c: [Math.min(255, col[0] * (0.8 + Math.random() * 0.4)), Math.min(255, col[1] * (0.8 + Math.random() * 0.4)), Math.min(255, col[2] * (0.8 + Math.random() * 0.4))] });
      }
      if (c.t % 20 === 0 && c.effect) {
        var ticks = Math.max(20, Math.round(c.secs * 20 / 4));
        if (!self.dead && Math.hypot(w.pos[0] - c.x, w.pos[2] - c.z) < r && Math.abs(w.pos[1] - c.y) < 1.5) {
          if (c.breath) self.damage(3, true, 'magic'); else self.addEffect(c.effect, ticks, c.amp);
        }
        self.mobs.list.forEach(function (m) { if (!m.dead && Math.hypot(m.x - c.x, m.z - c.z) < r && Math.abs(m.y - c.y) < 1.5 && !(c.breath && m.type === 'END_DRAGON')) applyToMob(self, m, c.effect, ticks, c.amp); });
      }
      c.rNow = r;
      if (c.t < c.max && c.r > 0.3) keep.push(c);
    });
    this.clouds = keep;
    // 竜の火の玉
    var wd = this.world, kb = [];
    (this.breathBalls || []).forEach(function (b) {
      b.life++; b.x += b.vx; b.y += b.vy; b.z += b.vz;
      for (var i = 0; i < 3; i++) self.particles.push({ x: b.x + (Math.random() - 0.5) * 0.4, y: b.y + (Math.random() - 0.5) * 0.4, z: b.z + (Math.random() - 0.5) * 0.4, vx: 0, vy: 0, vz: 0, life: 10, c: [190 + rint(40), 80 + rint(40), 230] });
      var hitP = Math.hypot(w.pos[0] - b.x, w.pos[1] + 0.9 - b.y, w.pos[2] - b.z) < 1.2;
      if (hitP || WG.COLLIDE[wd.block(Math.floor(b.x), Math.floor(b.y), Math.floor(b.z))] >= 1 || b.life > 160) {
        self.addCloud(b.x, b.y + 0.5, b.z, { effect: 'INSTANT_DAMAGE', amp: 0, color: '#b45ae0', max: 400, breath: true });
        if (WG.Sound) WG.Sound.play('pop', b.x, b.y, b.z);
      } else kb.push(b);
    });
    this.breathBalls = kb;
  };

  // ---------------- 効果：衝撃吸収（黄色いハート） ----------------
  var addEffect = Game.prototype.addEffect;
  Game.prototype.addEffect = function (key, ticks, amp) {
    if (key === 'SATURATION') { this.sat = Math.min(this.food, this.sat + 2 * (amp + 1)); return; }
    if (key === 'ABSORPTION') this.absorb = Math.max(this.absorb || 0, 4 * (amp + 1));
    return addEffect.apply(this, arguments);
  };
  var tickEffects = Game.prototype.tickEffects;
  Game.prototype.tickEffects = function () {
    var r = tickEffects.apply(this, arguments);
    if (this.absorb && !this.effects.ABSORPTION) this.absorb = 0;
    return r;
  };
  var damage = Game.prototype.damage;
  Game.prototype.damage = function () {
    var A = this.absorb || 0;
    if (!A || this.mode !== 'survival' || this.dead) return damage.apply(this, arguments);
    var H = this.health;
    this.health = H + A; this._totemFired = false;
    var ok = damage.apply(this, arguments);
    if (this._totemFired || this.dead) return ok;
    var T = this.health;
    this.health = Math.min(H, T); this.absorb = Math.max(0, T - this.health);
    if (!this.absorb && this.effects.ABSORPTION) { delete this.effects.ABSORPTION; this.inv.changed(); }
    return ok;
  };
  var goldHearts = null;
  function goldHeart() {
    if (goldHearts) return goldHearts;
    var H = ['.oo.oo.', 'offoffo', 'ofwfffo', 'offfffo', '.offfo.', '..ofo..', '...o...'], col = { o: '#3a2a08', f: '#e8b830', w: '#fff4b0' };
    function mk(rows) {
      var c = document.createElement('canvas'); c.width = 7; c.height = 7; var x = c.getContext('2d');
      rows.forEach(function (r, j) { for (var i = 0; i < 7; i++) if (col[r[i]]) { x.fillStyle = col[r[i]]; x.fillRect(i, j, 1, 1); } });
      return c.toDataURL();
    }
    goldHearts = { full: mk(H), half: mk(H.map(function (r) { return r.split('').map(function (ch, i) { return (ch === 'f' || ch === 'w') && i > 3 ? '.' : ch; }).join(''); })) };
    return goldHearts;
  }
  var updateHud = Game.prototype.updateHud;
  Game.prototype.updateHud = function () {
    var A = this.mode === 'survival' ? Math.ceil(this.absorb || 0) : 0;
    if (A !== this._absShown) this.hudKey = null;
    var k0 = this.hudKey;
    var r = updateHud.apply(this, arguments);
    if ((this.hudKey !== k0 || A !== this._absShown) && this.ui && this.ui.hearts && typeof document !== 'undefined') {
      this._absShown = A;
      if (A > 0) {
        var gh = goldHeart(), h = '';
        for (var i = 0; i < Math.ceil(A / 2); i++) h += '<img class="gold" src="' + (A >= i * 2 + 2 ? gh.full : gh.half) + '" alt="">';
        this.ui.hearts.insertAdjacentHTML('beforeend', h);
      }
    }
    return r;
  };

  // ---------------- 不死のトーテム ----------------
  var die = Game.prototype.die;
  Game.prototype.die = function () {
    var held = this.inv.held(), w = this.walker;
    if (this.mode === 'survival' && held && held.key === 'TOTEM_OF_UNDYING' && !(w.pos[1] < this.world.minY - 32)) {
      this.inv.take(this.inv.sel, 1);
      this.dead = false; this.health = 1;
      Object.keys(this.effects).forEach(function (k) { delete this.effects[k]; }, this);
      this.absorb = 0;
      this.addEffect('REGENERATION', 900, 1); this.addEffect('ABSORPTION', 100, 1); this.addEffect('FIRE_RESISTANCE', 800, 0);
      this.burnT = 0; this._totemFired = true; this.invuln = 20;
      for (var i = 0; i < 4; i++) { this.puff(w.pos[0], w.pos[1] + 1, w.pos[2], [230, 200, 60], 14, 0.9); this.puff(w.pos[0], w.pos[1] + 1, w.pos[2], [90, 200, 70], 10, 0.9); }
      if (WG.Sound) WG.Sound.play('totem', w.pos[0], w.pos[1] + 1, w.pos[2]);
      if (this.ui && this.ui.toast) this.ui.toast('不死のトーテムが身代わりになった');
      showTotem();
      this.inv.changed();
      return;
    }
    // 死んだ場所を覚える（リカバリーコンパス）。バンドルの中身も落とす
    if (this.player) this.player.lastDeath = { x: w.pos[0], y: w.pos[1], z: w.pos[2], dim: this.world.dimKey };
    var self = this;
    this.inv.slots.forEach(function (s) { if (s && s.items) { s.items.forEach(function (q) { self.spawnItem(q.key, q.n, w.pos[0], w.pos[1] + 0.5, w.pos[2], 0.25, 40, q.dmg, q.ench); }); s.items = []; s.key = 'BUNDLE'; } });
    return die.apply(this, arguments);
  };
  // 画面の真ん中に、トーテムの絵が大きく浮かんで消える
  function showTotem() {
    if (typeof document === 'undefined' || !WG.iconURL) return;
    var el = document.createElement('img');
    el.src = WG.iconURL('TOTEM_OF_UNDYING'); el.alt = '';
    el.style.cssText = 'position:fixed;left:50%;top:46%;width:96px;height:96px;margin:-48px 0 0 -48px;image-rendering:pixelated;pointer-events:none;z-index:50;' +
      'transition:transform 1.4s cubic-bezier(.2,.8,.3,1),opacity 1.4s ease-in;transform:scale(.4) rotate(-12deg);opacity:1;filter:drop-shadow(0 0 10px rgba(240,210,90,.55))';
    document.body.appendChild(el);
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.style.transform = 'scale(3.2) rotate(8deg)'; el.style.opacity = '0'; }); });
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1600);
  }

  // ---------------- 食べる（追加の効果） ----------------
  var consumeExtra = Game.prototype.consumeExtra;
  Game.prototype.consumeExtra = function (it) {
    if (it.stew) this.addEffect(it.stew[0], it.stew[1], 0);
    if (it.godApple) { this.addEffect('REGENERATION', 400, 1); this.addEffect('ABSORPTION', 2400, 3); this.addEffect('FIRE_RESISTANCE', 6000, 0); }
    return consumeExtra.apply(this, arguments);
  };
  // ケーキ・茂み・ジュークボックスに向けているときは、手の食べ物を食べ始めない（実を摘む・ケーキを食べるほうを優先）
  function aimsUse(g) {
    var t = g.walker.target, held = g.inv.held();
    if (!t) return false;
    var k = keyOf(t.id);
    if (/^CAKE_|^SWEET_BERRY_BUSH_[23]$|^JUKEBOX$/.test(k)) return true;
    if (held && held.key === 'SWEET_BERRIES' && t.py === t.y + 1 && [B.GRASS, B.DIRT, B.PODZOL, B.COARSE_DIRT].indexOf(t.id) >= 0) return true;
    return false;
  }
  var tickEating = Game.prototype.tickEating;
  Game.prototype.tickEating = function () {
    if (!this.mouseR || !aimsUse(this)) return tickEating.apply(this, arguments);
    this.mouseR = false;
    try { return tickEating.apply(this, arguments); } finally { this.mouseR = true; }
  };

  // ---------------- 作物：ビートルート・スイートベリー ----------------
  var growCrop = Game.prototype.growCrop;
  Game.prototype.growCrop = function (x, y, z, n) {
    var wd = this.world, m = /^BEETROOTS_(\d)$/.exec(keyOf(wd.block(x, y, z)));
    if (!m) return growCrop.apply(this, arguments);
    var st = +m[1];
    if (st >= 3) return false;
    if (!n) {
      var lt = this.walker.lightLevels(x, y, z), sk = this.sky ? this.sky() : null;
      if (Math.max(lt[0] - (sk ? sk.dark : 0), lt[1]) < 9) return false;
      var moist = wd.block(x, y - 1, z) === B.FARMLAND_MOIST;
      if (Math.random() >= (moist ? 0.12 : 0.05)) return false;
      n = 1;
    } else n = Math.random() < 0.75 ? 1 : 0;   // 骨粉はビートルートには効きにくい
    if (!n) return true;
    wd.setBlock(x, y, z, B['BEETROOTS_' + Math.min(3, st + n)]); this.walker.remesh(x, z);
    return true;
  };
  // 茂み：ランダムな刻みで 4 段階に育つ（明るさ 9 以上）。play.js の randomTicks から呼ばれる
  WG.onPlantTick = function (g, x, y, z, id) {
    var m = /^SWEET_BERRY_BUSH_(\d)$/.exec(keyOf(id));
    if (!m || +m[1] >= 3 || Math.random() >= 0.2) return;
    var lt = g.walker.lightLevels(x, y + 1, z);
    if (Math.max(lt[0], lt[1]) < 9) return;
    g.world.setBlock(x, y, z, B['SWEET_BERRY_BUSH_' + (+m[1] + 1)]); g.walker.remesh(x, z);
  };
  var dropFor = Game.prototype.dropFor;
  Game.prototype.dropFor = function (id, x, y, z) {
    var k = keyOf(id), self = this, m;
    function drop(key, n) { if (n > 0) self.spawnItem(key, n, x + 0.5, y + 0.25, z + 0.5, 0.1, 10); }
    if ((m = /^BEETROOTS_(\d)$/.exec(k))) { if (+m[1] >= 3) { drop('BEETROOT', 1); drop('BEETROOT_SEEDS', 1 + rint(3)); } else drop('BEETROOT_SEEDS', 1); return; }
    if ((m = /^SWEET_BERRY_BUSH_(\d)$/.exec(k))) { var s = +m[1]; drop('SWEET_BERRIES', s === 3 ? 2 + rint(2) : s === 2 ? 1 + rint(2) : 0); return; }
    if (/^CAKE_/.test(k)) return;
    return dropFor.apply(this, arguments);
  };

  // ---------------- 置く：ケーキ・スイートベリー ----------------
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var t = this.walker.target, held = this.inv.held(), wd = this.world, surv = this.mode === 'survival';
    if (t && held && (held.key === 'CAKE' || held.key === 'SWEET_BERRIES')) {
      var below = wd.block(t.px, t.py - 1, t.pz);
      if (wd.block(t.px, t.py, t.pz) !== B.AIR || this.mobs.target) return;
      if (held.key === 'CAKE') { if (!WG.OPAQUE[below] && WG.COLLIDE[below] < 1) return; wd.setBlock(t.px, t.py, t.pz, B.CAKE_0); }
      else { if ([B.GRASS, B.DIRT, B.PODZOL, B.COARSE_DIRT, B.FARMLAND, B.FARMLAND_MOIST].indexOf(below) < 0) return; wd.setBlock(t.px, t.py, t.pz, B.SWEET_BERRY_BUSH_0); }
      this.walker.remesh(t.px, t.pz);
      if (WG.Sound) WG.Sound.play('place', t.px + 0.5, t.py + 0.5, t.pz + 0.5, 'grass');
      if (surv) this.inv.take(this.inv.sel, 1);
      return;
    }
    return place.apply(this, arguments);
  };

  // ---------------- ジュークボックス ----------------
  var playing = {};   // 場所 → { disc, end（刻み）, stop }
  function jukeMap(wd) { return wd.jukeboxes || (wd.jukeboxes = new Map()); }
  Game.prototype.jukeboxPlaying = function (x, y, z) { var p = playing[this.world.dimKey + ':' + x + ',' + y + ',' + z]; return !!p && p.end > (this.tickCount || 0); };
  Game.prototype.startDisc = function (x, y, z, disc) {
    var key = this.world.dimKey + ':' + x + ',' + y + ',' + z, it = ITEMS[disc];
    this.stopDisc(x, y, z);
    var h = WG.Sound && WG.Sound.music ? WG.Sound.music(it.disc, x + 0.5, y + 0.5, z + 0.5) : null, dur = h ? h.dur : 30;
    playing[key] = { disc: disc, end: (this.tickCount || 0) + Math.ceil(dur * 20), stop: h ? h.stop : null, x: x, y: y, z: z };
    if (this.ui && this.ui.toast) this.ui.toast('再生中：「' + it.song + '」');
    if (this.rs) this.rs.dirty.push([x, y, z]);
  };
  Game.prototype.stopDisc = function (x, y, z) {
    var key = this.world.dimKey + ':' + x + ',' + y + ',' + z, p = playing[key];
    if (p) { if (p.stop) p.stop(); delete playing[key]; if (this.rs) this.rs.dirty.push([x, y, z]); }
  };
  Game.prototype.ejectDisc = function (x, y, z) {
    var jm = jukeMap(this.world), k = x + ',' + y + ',' + z, disc = jm.get(k);
    if (!disc) return false;
    jm.delete(k); this.stopDisc(x, y, z);
    var e = this.spawnItem(disc, 1, x + 0.5, y + 1.05, z + 0.5, 0.05, 10);
    if (e) e.vy = 0.15;
    return true;
  };
  var breakBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function (x, y, z) {
    if (this.world.block(x, y, z) === B.JUKEBOX) this.ejectDisc(x, y, z);
    return breakBlock.apply(this, arguments);
  };
  var containerSignal = Game.prototype.containerSignal;
  Game.prototype.containerSignal = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z), k = keyOf(id), m;
    if (id === B.JUKEBOX) { var d = jukeMap(wd).get(x + ',' + y + ',' + z); return d && ITEMS[d] ? ITEMS[d].signal : 0; }
    if ((m = /^CAKE_(\d)$/.exec(k))) return (7 - m[1]) * 2;
    return containerSignal.apply(this, arguments);
  };
  // 鳴っている間、ジュークボックスは動力 15 を出す
  if (WG.Redstone) {
    var emit = WG.Redstone.prototype.emit;
    WG.Redstone.prototype.emit = function (x, y, z) {
      if (this.get(x, y, z) === B.JUKEBOX) { var g = this.g; return g && g.jukeboxPlaying && g.jukeboxPlaying(x, y, z) ? 15 : 0; }
      return emit.apply(this, arguments);
    };
  }

  // ---------------- 右クリック ----------------
  function bushStage(id) { var m = /^SWEET_BERRY_BUSH_(\d)$/.exec(keyOf(id)); return m ? +m[1] : -1; }
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), it = held ? ITEMS[held.key] : null, wd = this.world, surv = this.mode === 'survival';
    var shift = w.keys && (w.keys.ShiftLeft || w.keys.ShiftRight), mt = this.mobs.target && this.mobs.target.mob, self = this;
    function done() { self.mouseR = self.clickR = false; }
    if (this.spectator) return use.apply(this, arguments);
    // 防具立て：防具を着せる・脱がせる
    if (mt && !mt.dead && mt.type === 'ARMOR_STAND') {
      mt.armor = mt.armor || [null, null, null, null];
      if (it && it.armor != null) {
        var old = mt.armor[it.armor];
        mt.armor[it.armor] = { key: held.key, n: 1, dmg: held.dmg, ench: held.ench };
        if (surv || old) this.inv.slots[this.inv.sel] = old || null;
        this.inv.changed();
      } else {
        for (var s = 0; s < 4; s++) if (mt.armor[s]) { var a = mt.armor[s]; mt.armor[s] = null; if (!this.inv.add(a.key, 1, a.dmg, a.ench)) this.spawnItem(a.key, 1, w.pos[0], w.pos[1] + 1, w.pos[2], 0.1, 10, a.dmg, a.ench); break; }
      }
      if (WG.Sound) WG.Sound.play('place', mt.x, mt.y + 1, mt.z, 'wood');
      done(); return;
    }
    // ガラス瓶：竜の息の雲をくむ
    if (it && held.key === 'GLASS_BOTTLE') {
      var cl = (this.clouds || []).filter(function (c) { return c.breath && Math.hypot(w.pos[0] - c.x, w.pos[2] - c.z) < (c.rNow || c.r) + 2.5 && Math.abs(w.pos[1] - c.y) < 3; })[0];
      if (cl) {
        cl.r -= 0.5;
        this.inv.take(this.inv.sel, 1);
        if (!this.inv.add('DRAGON_BREATH', 1)) this.spawnItem('DRAGON_BREATH', 1, w.pos[0], w.pos[1] + 1, w.pos[2], 0.1, 10);
        if (WG.Sound) WG.Sound.play('drink', w.pos[0], w.pos[1] + 1, w.pos[2]);
        done(); return;
      }
    }
    if (t && !shift) {
      var k = keyOf(t.id), m;
      // ケーキを 1 口食べる（おなかがすいているとき。クリエイティブはいつでも）
      if ((m = /^CAKE_(\d)$/.exec(k))) {
        if (!surv || this.food < 20) {
          var b = +m[1] + 1;
          if (surv) { this.food = Math.min(20, this.food + 2); this.sat = Math.min(this.food, this.sat + 0.4); }
          wd.setBlock(t.x, t.y, t.z, b >= 7 ? B.AIR : B['CAKE_' + b]); w.remesh(t.x, t.z);
          this.puff(t.x + 0.5, t.y + 0.5, t.z + 0.5, [236, 226, 214], 6, 0.2); this.puff(t.x + 0.5, t.y + 0.5, t.z + 0.5, [200, 60, 50], 2, 0.2);
          if (WG.Sound) WG.Sound.play('eat', t.x + 0.5, t.y + 0.5, t.z + 0.5);
          if (this.rs) this.rs.dirty.push([t.x, t.y, t.z]);
        }
        done(); return;
      }
      // 実った茂みから摘む
      var bs = bushStage(t.id);
      if (bs >= 2 && !(it && it.key === 'BONE_MEAL' && bs < 3)) {
        var n = bs === 3 ? 2 + rint(2) : 1 + rint(2), e = this.spawnItem('SWEET_BERRIES', n, t.x + 0.5, t.y + 0.6, t.z + 0.5, 0.15, 10);
        wd.setBlock(t.x, t.y, t.z, B.SWEET_BERRY_BUSH_1); w.remesh(t.x, t.z);
        if (WG.Sound) WG.Sound.play('break', t.x + 0.5, t.y + 0.5, t.z + 0.5, 'grass');
        done(); return;
      }
      if (bs >= 0 && bs < 3 && it && it.key === 'BONE_MEAL') {
        wd.setBlock(t.x, t.y, t.z, B['SWEET_BERRY_BUSH_' + (bs + 1)]); w.remesh(t.x, t.z);
        this.puff(t.x + 0.5, t.y + 0.5, t.z + 0.5, [120, 200, 90], 10, 0.4);
        if (surv) this.inv.take(this.inv.sel, 1);
        done(); return;
      }
      // ジュークボックス：レコードを入れる・出す
      if (t.id === B.JUKEBOX) {
        var jm = jukeMap(wd), jk = t.x + ',' + t.y + ',' + t.z;
        if (jm.get(jk)) this.ejectDisc(t.x, t.y, t.z);
        else if (it && it.disc) { jm.set(jk, held.key); if (surv) this.inv.take(this.inv.sel, 1); else this.inv.changed(); this.startDisc(t.x, t.y, t.z, held.key); }
        done(); return;
      }
    }
    if (it) {
      // ファイヤーチャージ：火をつける（TNT・ネザーポータルも）
      if (held.key === 'FIRE_CHARGE' && t) {
        if (t.id === B.TNT) this.primeTnt(t.x, t.y, t.z, 80);
        else if (wd.block(t.px, t.py, t.pz) === B.AIR) { if (!(WG.lightPortal && WG.lightPortal(this, t.px, t.py, t.pz))) this.setFire(t.px, t.py, t.pz, true, 0); }
        else { done(); return; }
        if (surv) this.inv.take(this.inv.sel, 1);
        if (WG.Sound) WG.Sound.play('ignite', t.px + 0.5, t.py + 0.5, t.pz + 0.5);
        done(); return;
      }
      // 防具立てを置く（上の面に、こちらを向けて）
      if (held.key === 'ARMOR_STAND' && t && !mt) {
        if (t.py !== t.y + 1 || wd.block(t.px, t.py, t.pz) !== B.AIR || wd.block(t.px, t.py + 1, t.pz) !== B.AIR) { done(); return; }
        var st = this.mobs.spawn('ARMOR_STAND', t.px + 0.5, t.py, t.pz + 0.5);
        if (st) { st.armor = [null, null, null, null]; st.yaw = st.pyaw = Math.round((w.yaw + Math.PI) / (Math.PI / 4)) * (Math.PI / 4); st.persist = true; }
        if (surv) this.inv.take(this.inv.sel, 1);
        if (WG.Sound) WG.Sound.play('place', t.px + 0.5, t.py + 0.5, t.pz + 0.5, 'wood');
        done(); return;
      }
      // ヤギの角笛：遠くまで響く音（7 秒に 1 回）
      if (held.key === 'GOAT_HORN') {
        if (!(this.hornCd > 0)) { this.hornCd = 140; if (WG.Sound) WG.Sound.play('horn'); if (this.ui && this.ui.toast) this.ui.toast('角笛の音が響いた'); }
        done(); return;
      }
      // バンドルを手に持って右クリック：中身をぜんぶ前に出す
      if (it.bundle && held.items && held.items.length && !t) {
        var d = w.dir || [0, 0, 1];
        held.items.forEach(function (q) { var e2 = self.spawnItem(q.key, q.n, w.pos[0] + d[0], w.pos[1] + 1.2, w.pos[2] + d[2], 0.05, 20, q.dmg, q.ench); if (e2) { e2.vx = d[0] * 0.2; e2.vz = d[2] * 0.2; } });
        held.items = []; held.key = 'BUNDLE'; this.inv.changed();
        done(); return;
      }
    }
    return use.apply(this, arguments);
  };

  // ---------------- バンドル（インベントリの中で右クリック） ----------------
  // 中身の重さは 64 まで（64 個まとまる物は 1 個 1、16 個の物は 4、1 個の物は 64）
  function weightOf(s) { return (s.items || []).reduce(function (a, q) { return a + q.n * 64 / (ITEMS[q.key] ? ITEMS[q.key].max : 64); }, 0); }
  WG.bundleWeight = weightOf;
  function bundlePut(bundle, stack) {
    if (!stack || ITEMS[stack.key].bundle) return 0;
    var per = 64 / ITEMS[stack.key].max, room = Math.floor((64 - weightOf(bundle)) / per + 1e-6), n = Math.min(room, stack.n);
    if (n <= 0) return 0;
    bundle.items = bundle.items || [];
    var last = bundle.items[bundle.items.length - 1];
    if (last && last.key === stack.key && !stack.dmg && !stack.ench && !last.dmg && !last.ench) last.n += n;
    else bundle.items.push({ key: stack.key, n: n, dmg: stack.dmg, ench: stack.ench });
    bundle.key = 'BUNDLE_FILLED';
    return n;
  }
  function bundleTake(bundle) {
    var q = bundle.items && bundle.items.pop();
    if (!bundle.items || !bundle.items.length) bundle.key = 'BUNDLE';
    return q || null;
  }
  WG.bundlePut = bundlePut; WG.bundleTake = bundleTake;
  var clickSlot = Game.prototype.clickSlot;
  Game.prototype.clickSlot = function (el, button, shift) {
    var c = el.dataset.c, i = +el.dataset.i, cur = this.cursor;
    if (button !== 2 || c === 'pal' || c === 'res' || c === 'arm' || !this.getSlot) return clickSlot.apply(this, arguments);
    var sl = this.getSlot(c, i), cb = cur && ITEMS[cur.key] && ITEMS[cur.key].bundle, sb = sl && ITEMS[sl.key] && ITEMS[sl.key].bundle;
    if (!cb && !sb) return clickSlot.apply(this, arguments);
    if (cb && sl && !sb) { var n = bundlePut(cur, sl); sl.n -= n; if (sl.n <= 0) this.setSlot(c, i, null); }
    else if (cb && !sl) { var q = bundleTake(cur); if (q) this.setSlot(c, i, q); }
    else if (sb && cur && !cb) { var n2 = bundlePut(sl, cur); cur.n -= n2; if (cur.n <= 0) this.cursor = null; }
    else if (sb && !cur) { var q2 = bundleTake(sl); if (q2) this.cursor = q2; }
    else return clickSlot.apply(this, arguments);
    if (WG.Sound) WG.Sound.play('place', null, null, null, 'wool');
    this.inv.changed(); this.renderInventory();
  };

  // ---------------- 毎刻：茂みのとげ・カメの甲羅・ジュークボックスの音符・雲 ----------------
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    var r = tickExtra.apply(this, arguments), w = this.walker, wd = this.world, self = this;
    if (this.hornCd > 0) this.hornCd--;
    this.tickClouds();
    // スイートベリーの茂みの中を動くと、とげで傷つく（育った茂みだけ）
    if (!this.dead && this.mode === 'survival') {
      var fx = Math.floor(w.pos[0]), fy = Math.floor(w.pos[1] + 0.1), fz = Math.floor(w.pos[2]), bs = bushStage(wd.block(fx, fy, fz));
      if (bs >= 1 && w.vel && Math.hypot(w.vel[0], w.vel[2]) > 0.02 && !w.sneak) {
        if (!(this.invuln > 0)) { this.damage(1, false, 'bush'); }
      }
      // カメの甲羅：水の外では水中呼吸 10 秒が付き続ける（潜ると減っていく）
      var hd = this.armor && this.armor[0];
      if (hd && hd.key === 'TURTLE_HELMET' && !WG.isWater(wd.block(fx, Math.floor(w.pos[1] + 1.6), fz))) {
        var e = this.effects.WATER_BREATHING;
        if (!e || e.t < 200) this.effects.WATER_BREATHING = { t: 200, amp: 0, max: 200 };
      }
    }
    // 鳴っているジュークボックスから音符の粒
    var now = this.tickCount || 0;
    Object.keys(playing).forEach(function (key) {
      var p = playing[key];
      if (p.end <= now) { delete playing[key]; if (self.rs && key.split(':')[0] === wd.dimKey) self.rs.dirty.push([p.x, p.y, p.z]); return; }
      if (key.split(':')[0] !== wd.dimKey || now % 12) return;
      var hue = (now / 12 * 37) % 360, c = hsl(hue);
      self.particles.push({ x: p.x + 0.5 + (Math.random() - 0.5) * 0.4, y: p.y + 1.2, z: p.z + 0.5 + (Math.random() - 0.5) * 0.4, vx: 0, vy: 0.03, vz: 0, life: 24, c: c, note: true });
    });
    return r;
  };
  function hsl(h) {
    var s = 0.55, l = 0.62, c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = [0, 0, 0];
    if (h < 60) r = [c, x, 0]; else if (h < 120) r = [x, c, 0]; else if (h < 180) r = [0, c, x]; else if (h < 240) r = [0, x, c]; else if (h < 300) r = [x, 0, c]; else r = [c, 0, x];
    return [Math.round((r[0] + m) * 255), Math.round((r[1] + m) * 255), Math.round((r[2] + m) * 255)];
  }
  // 茂みの中は歩きにくい
  var wtick = Walker.prototype.tick;
  Walker.prototype.tick = function () {
    var r = wtick.apply(this, arguments), p = this.pos, wd = this.world;
    if (wd && this.vel && bushStage(wd.block(Math.floor(p[0]), Math.floor(p[1] + 0.1), Math.floor(p[2]))) >= 0 && !this.flying) { this.vel[0] *= 0.8; this.vel[2] *= 0.8; if (this.vel[1] < 0) this.vel[1] *= 0.75; }
    return r;
  };

  // ---------------- リカバリーコンパス（最後に死んだ場所を指す） ----------------
  var updateHeldView = Game.prototype.updateHeldView;
  Game.prototype.updateHeldView = function () {
    var ui = this.ui, held = this.inv.held(), w = this.walker;
    if (!ui || !ui.heldView || !held || held.key !== 'RECOVERY_COMPASS' || this.invOpen || this.spectator) return updateHeldView.apply(this, arguments);
    var el = ui.heldView;
    if (el.dataset.kind !== 'rcompass') { el.dataset.kind = 'rcompass'; el.className = 'on compass'; el.innerHTML = '<canvas width="64" height="64"></canvas>'; el.dataset.src = ''; }
    var x = el.querySelector('canvas').getContext('2d'), R = 30, ld = this.player && this.player.lastDeath, ang;
    x.clearRect(0, 0, 64, 64);
    x.fillStyle = '#1a2a2c'; x.beginPath(); x.arc(32, 32, R + 2, 0, 7); x.fill();
    var gr = x.createRadialGradient(28, 26, 4, 32, 32, R);
    gr.addColorStop(0, '#2c4a50'); gr.addColorStop(1, '#10262a');
    x.fillStyle = gr; x.beginPath(); x.arc(32, 32, R - 1, 0, 7); x.fill();
    // 目盛り
    x.strokeStyle = 'rgba(150,220,210,.45)'; x.lineWidth = 1.5;
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; x.beginPath(); x.moveTo(32 + Math.sin(a) * (R - 6), 32 - Math.cos(a) * (R - 6)); x.lineTo(32 + Math.sin(a) * (R - 2), 32 - Math.cos(a) * (R - 2)); x.stroke(); }
    if (!ld || ld.dim !== this.world.dimKey) ang = (this.tickCount || 0) * 0.3;
    else ang = Math.atan2(ld.x - w.pos[0], -(ld.z - w.pos[2])) + w.yaw;
    x.save(); x.translate(32, 32); x.rotate(ang);
    x.fillStyle = '#5ae0d0'; x.beginPath(); x.moveTo(0, -24); x.lineTo(5, 0); x.lineTo(-5, 0); x.fill();
    x.fillStyle = '#e8f8f4'; x.beginPath(); x.moveTo(0, -24); x.lineTo(2, -8); x.lineTo(-1, -8); x.fill();
    x.fillStyle = '#3a4a50'; x.beginPath(); x.moveTo(0, 24); x.lineTo(5, 0); x.lineTo(-5, 0); x.fill();
    x.restore();
    x.fillStyle = '#c8e8e0'; x.beginPath(); x.arc(32, 32, 2.5, 0, 7); x.fill();
    w.zoom = 1;
    if (ui.spyView) ui.spyView.classList.remove('on');
  };
})(typeof window !== 'undefined' ? window : globalThis);
