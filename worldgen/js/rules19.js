// 遊び方の仕組み（ロードマップ 第 19 段階）
// ハードコア（倒れると観戦だけになる・難易度はハード）、世界の端（/worldborder）、ゲームルール（/gamerule）、
// 村人の繁殖と旅の商人、生成された滝や地下の水・溶岩がはじめから流れる（崖の湧き水・洞窟の湧き水）、
// 不吉な試練（凶兆があると試練が強くなり、不吉な試練の鍵で宝庫からよい物）、
// エンドクリスタル（柱の上の結晶が竜を癒やす・4 つ置くと竜を呼び直す）と竜の卵、コマンドブロック・バリア・光ブロック
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Game = WG.Game, Mobs = WG.Mobs, TYPES = WG.MOB_TYPES, MODELS = WG.MOB_MODELS, hash = WG.hash;
  function keyOf(id) { return WG.BLOCKS[id] ? WG.BLOCKS[id].key : ''; }
  function item(key, name, max, extra) { var it = { key: key, name: name, block: -1, max: max || 64, shape: 'lump', color: '#888888' }; for (var k in extra || {}) it[k] = extra[k]; ITEMS[key] = it; return it; }
  function blockItem(key, hardness, drop, tool) { var id = B[key]; ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: 1, dropMax: 1, dropChance: 1 }; if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = 0; } return ITEMS[key]; }
  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function box(x, y, z, w, h, d, c, extra) { return Object.assign({ o: [x, y, z], s: [w, h, d], c: hex(c), sw: null }, extra || {}); }
  function rint(n) { return Math.floor(Math.random() * n); }
  function toast(g, t) { if (g.ui && g.ui.toast) g.ui.toast(t); }

  // ---------------- ブロックとアイテム ----------------
  blockItem('COMMAND_BLOCK', -1); blockItem('BARRIER', -1);
  [15, 11, 7, 3].forEach(function (lv) { blockItem('LIGHT_' + lv, -1, lv === 15 ? 'LIGHT_15' : null); });
  blockItem('DRAGON_EGG', 3, 'DRAGON_EGG');
  item('END_CRYSTAL', 'エンドクリスタル', 64);
  item('OMINOUS_TRIAL_KEY', '不吉な試練の鍵', 64);
  item('OMINOUS_BOTTLE', '不吉な瓶', 64, { potion: true, effect: 'BAD_OMEN', secs: 300, amp: 0, color: '#2a4a5a' });
  WG.Craft.SHAPED.push([['GGG', 'GEG', 'GTG'], { G: 'GLASS', E: 'ENDER_EYE', T: 'GHAST_TEAR' }, 'END_CRYSTAL', 1]);
  if (WG.STRUCTURE_LOOT && WG.STRUCTURE_LOOT.outpost) WG.STRUCTURE_LOOT.outpost.push(['OMINOUS_BOTTLE', 1, 1, 4]);

  // ---------------- ゲームルール ----------------
  var RULES = { keepInventory: false, doDaylightCycle: true, doWeatherCycle: true, doMobSpawning: true, naturalRegeneration: true, doImmediateRespawn: false, fallDamage: true, fireDamage: true, drowningDamage: true };
  var RULE_NAMES = { keepInventory: '倒れても持ち物を落とさない', doDaylightCycle: '時間が進む', doWeatherCycle: '天気が変わる', doMobSpawning: '生き物が自然に出る', naturalRegeneration: '満腹で体力が回復する',
    doImmediateRespawn: 'すぐに生き返る', fallDamage: '落下のダメージ', fireDamage: '火のダメージ', drowningDamage: 'おぼれるダメージ' };
  WG.GAME_RULES = RULES;
  function rule(g, k) { var r = g.player && g.player.rules; return r && r[k] != null ? r[k] : RULES[k]; }
  WG.gameRule = rule;

  // ---------------- 世界の端 ----------------
  var BIG = 59999968;
  function border(g) { var b = g.player && g.player.border; return b && b.size < BIG ? b : null; }
  WG.worldBorder = border;

  // ---------------- コマンド ----------------
  var run = WG.runCommand;
  WG.runCommand = function (g, text) {
    var a = String(text || '').trim().replace(/^\//, '').split(/\s+/), cmd = (a[0] || '').toLowerCase(), p = g.player;
    if (cmd === 'gamerule') {
      var k = Object.keys(RULES).filter(function (r) { return r.toLowerCase() === (a[1] || '').toLowerCase(); })[0];
      if (!k) return 'ゲームルール：' + Object.keys(RULES).map(function (r) { return r + '（' + RULE_NAMES[r] + '）= ' + rule(g, r); }).join('\n');
      if (a[2] == null) return k + ' = ' + rule(g, k);
      if (!/^(true|false)$/i.test(a[2])) return '使い方：/gamerule ' + k + ' <true|false>';
      (p.rules || (p.rules = {}))[k] = /^true$/i.test(a[2]);
      return k + '（' + RULE_NAMES[k] + '）を ' + p.rules[k] + ' にしました';
    }
    if (cmd === 'worldborder') {
      var b = p.border || (p.border = { size: BIG, cx: 0, cz: 0 }), sub = (a[1] || '').toLowerCase();
      if (sub === 'set' && +a[2] > 0) { b.size = Math.max(4, Math.min(BIG, Math.floor(+a[2]))); return '世界の端を幅 ' + b.size + ' にしました（中心 ' + b.cx + ', ' + b.cz + '）'; }
      if (sub === 'center' && a[3] != null) { b.cx = Math.floor(+a[2] || 0); b.cz = Math.floor(+a[3] || 0); return '世界の端の中心を ' + b.cx + ', ' + b.cz + ' にしました'; }
      if (sub === 'get') return b.size >= BIG ? '世界の端はありません' : '世界の端の幅：' + b.size + '（中心 ' + b.cx + ', ' + b.cz + '）';
      return '使い方：/worldborder set <幅> ・ /worldborder center <x> <z> ・ /worldborder get';
    }
    return run.apply(this, arguments);
  };
  if (WG.COMMAND_HELP) WG.COMMAND_HELP.splice(WG.COMMAND_HELP.length - 1, 0, '/gamerule [ルール] [true|false]', '/worldborder set <幅> ・ /worldborder center <x> <z> ・ /worldborder get');

  // ---------------- ハードコア ----------------
  var setDifficulty = Game.prototype.setDifficulty;
  Game.prototype.setDifficulty = function (d) { if (this.player && this.player.hardcore && d !== 'hard') return false; return setDifficulty.apply(this, arguments); };
  Game.prototype.setHardcore = function () { this.player.hardcore = true; setDifficulty.call(this, 'hard'); this.hudKey = null; if (WG.syncDifficultyButtons) WG.syncDifficultyButtons(); };
  var die = Game.prototype.die;
  Game.prototype.die = function () {
    var keep = rule(this, 'keepInventory'), p = this.player, self = this, saved = null;
    if (keep) { saved = { slots: this.inv.slots.slice(), armor: this.armor.slice(), off: p.offhand, lv: this.xp.level }; this.inv.slots = this.inv.slots.map(function () { return null; }); this.armor = [null, null, null, null]; p.offhand = null; this.xp.level = 0; }
    var r = die.apply(this, arguments);
    if (saved) { this.inv.slots = saved.slots; this.armor = saved.armor; p.armor = this.armor; p.offhand = saved.off; this.xp.level = saved.lv; this.inv.changed(); }
    if (typeof document !== 'undefined') {
      var sub = document.querySelector('#dead .dead-sub'), btn = document.getElementById('respawn');
      if (sub) sub.textContent = p.hardcore ? 'ハードコアでは生き返れません。この世界は見て回ることだけできます' : keep ? '持ち物はそのまま持っています' : '持っていたものはその場に落ちています';
      if (btn) btn.textContent = p.hardcore ? '観戦する' : 'リスポーン';
    }
    if (rule(this, 'doImmediateRespawn') && !p.hardcore) setTimeout(function () { if (self.dead) self.respawn(); }, 0);
    return r;
  };
  var respawn = Game.prototype.respawn;
  Game.prototype.respawn = function () {
    var r = respawn.apply(this, arguments);
    if (this.player.hardcore) { if (this.ui.setGameMode) this.ui.setGameMode('spectator'); else this.setMode('spectator'); toast(this, 'ハードコア：観戦だけできます'); }
    return r;
  };
  var setMode = Game.prototype.setMode;
  Game.prototype.setMode = function (m) {
    // ハードコアで倒れたあとは、観戦のほかに戻れない
    if (this.player && this.player.hardcore && this.player.hardcoreOver && m !== 'spectator') m = 'spectator';
    return setMode.call(this, m);
  };
  var respawnMark = Game.prototype.respawn;
  Game.prototype.respawn = function () { if (this.player.hardcore) this.player.hardcoreOver = true; return respawnMark.apply(this, arguments); };
  // ダメージのルール
  var damage = Game.prototype.damage;
  Game.prototype.damage = function (n, ignore, type) {
    if ((type === 'fall' && !rule(this, 'fallDamage')) || (type === 'fire' && !rule(this, 'fireDamage')) || (this.air <= 0 && !type && !rule(this, 'drowningDamage'))) return false;
    return damage.apply(this, arguments);
  };
  // 横の欄：ハードコアのボタン（新しい世界の前に押すか、遊んでいる途中で押す。いったん付けると外せない）
  if (typeof document !== 'undefined') {
    var addBtn = function () {
      var box = document.getElementById('diffs');
      if (!box || document.getElementById('hardcoreBtn')) return;
      var row = document.createElement('div'); row.className = 'seg'; row.style.marginTop = '6px';
      var b = document.createElement('button'); b.id = 'hardcoreBtn'; b.textContent = 'ハードコア'; b.title = '難易度はハードに固定。倒れると生き返れず、観戦だけになります';
      row.appendChild(b); box.parentNode.insertBefore(row, box.nextSibling);
      b.addEventListener('click', function () {
        var g = WG.curGame;
        if (g && g.player.hardcore) return;
        if (g && !window.confirm('ハードコアにすると元に戻せません。よろしいですか？')) return;
        WG.pendingHardcore = true; WG.pendingDifficulty = 'hard';
        if (g) g.setHardcore();
        b.classList.add('on'); b.blur();
      });
      setInterval(function () { var g = WG.curGame; b.classList.toggle('on', !!(g ? g.player.hardcore : WG.pendingHardcore)); }, 1500);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBtn); else addBtn();
  }

  // ---------------- 毎刻：ルール・世界の端・儀式 ----------------
  var tick = Game.prototype.tick;
  Game.prototype.tick = function () {
    var wd = this.world, t0 = wd.time, st = wd.weather, wt = st ? [st.rainT, st.thunderT] : null, hp0 = this.health, g = this;
    if (this.player && this.player.hardcore == null && WG.pendingHardcore) this.setHardcore();
    var r = tick.apply(this, arguments);
    if (!rule(this, 'doDaylightCycle')) wd.time = t0;
    if (!rule(this, 'doWeatherCycle') && st && wt) { st.rainT = wt[0]; st.thunderT = wt[1]; }
    if (!rule(this, 'naturalRegeneration') && this.health > hp0 && !(this.effects && this.effects.REGENERATION) && !this.regenT) this.health = hp0;
    // 世界の端：外に出ると押し戻され、ダメージを受ける（ネザーでは 8 分の 1）
    var b = border(this), w = this.walker, p = w.pos;
    if (b && p) {
      var sc = wd.dimKey === 'nether' ? 8 : 1, half = b.size / 2 / sc, cx = b.cx / sc, cz = b.cz / sc;
      var ox = Math.max(0, Math.abs(p[0] - cx) - half), oz = Math.max(0, Math.abs(p[2] - cz) - half);
      if (ox > 0 || oz > 0) {
        if (this.mode === 'survival' && this.tickCount % 20 === 0) this.damage(Math.max(1, Math.floor((ox + oz) * 0.2)), true);
        if (ox > 0.3) { p[0] = cx + Math.sign(p[0] - cx) * (half - 0.05); w.vel[0] = 0; }
        if (oz > 0.3) { p[2] = cz + Math.sign(p[2] - cz) * (half - 0.05); w.vel[2] = 0; }
      }
    }
    // 光ブロック・バリアを手に持っていると見える（10 刻みごとに近くを探す）
    var held = this.inv.held(), show = held && (held.key === 'BARRIER' || /^LIGHT_/.test(held.key));
    w.showHidden = !!show;
    if (show && p && this.tickCount % 10 === 0) {
      var list = [], x0 = Math.floor(p[0]), y0 = Math.floor(p[1]), z0 = Math.floor(p[2]);
      for (var dy = -6; dy <= 8; dy++) for (var dz = -14; dz <= 14; dz++) for (var dx = -14; dx <= 14; dx++) { var id = wd.block(x0 + dx, y0 + dy, z0 + dz), k = keyOf(id); if (id === B.BARRIER || /^LIGHT_\d+$/.test(k)) list.push([x0 + dx, y0 + dy, z0 + dz, id]); }
      this.hiddenBlocks = list;
    }
    if (!show) this.hiddenBlocks = null;
    // 竜を呼び直す儀式
    if (wd.ritual) tickRitual(this);
    // 旅の商人
    if (this.tickCount % 1200 === 0 && wd.dimKey === 'overworld' && rule(this, 'doMobSpawning')) maybeTrader(this);
    void g;
    return r;
  };
  // 光ブロックは、持っていないときは狙えない（通り抜けて向こうのブロックを狙う）
  var Walker = WG.Walker, pick = Walker.prototype.pick;
  Walker.prototype.pick = function () {
    if (this.showHidden) return pick.apply(this, arguments);
    var wd = this.world, pb = wd.peekBlock;
    wd.peekBlock = function (x, y, z) { var id = pb.call(wd, x, y, z); return id && WG.BLOCKS[id] && WG.BLOCKS[id].kind === 'lightblk' ? 0 : id; };
    try { return pick.apply(this, arguments); } finally { wd.peekBlock = pb; }
  };

  // ---------------- 描く：世界の端・見えないブロックの枠・クリスタルの光線 ----------------
  function edges(bt, x, y, z, c, t) {
    var id3 = function (a, b, d) { return [a, b, d]; }, L = [15, 15];
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (q) {
      WG.modelBox(bt, [x + q[0] * (1 - t), y, z + q[1] * (1 - t)], [t, 1, t], id3, c, L);
      WG.modelBox(bt, [x, y + q[0] * (1 - t), z + q[1] * (1 - t)], [1, t, t], id3, c, L);
      WG.modelBox(bt, [x + q[0] * (1 - t), y + q[1] * (1 - t), z], [t, t, 1], id3, c, L);
    });
  }
  function beam(bt, a, b, c) {
    var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.5)), id3 = function (x, y, z) { return [x, y, z]; };
    for (var i = 0; i < n; i++) { var f = i / n; WG.modelBox(bt, [a[0] + dx * f - 0.06, a[1] + dy * f - 0.06, a[2] + dz * f - 0.06], [0.12, 0.12, 0.12], id3, c, [15, 15]); }
  }
  var drawExtra = Game.prototype.drawExtra;
  Game.prototype.drawExtra = function (solid, a, cube) {
    var r = drawExtra.apply(this, arguments), g = this, wd = this.world, p = this.walker.pos;
    (this.hiddenBlocks || []).forEach(function (q) {
      if (q[3] === B.BARRIER) { edges(solid, q[0], q[1], q[2], [214, 52, 46], 0.05); cube(solid, q[0] + 0.5, q[1] + 0.3, q[2] + 0.5, 0.38, 0, function () { return 0; }, function () { return [200, 40, 36]; }, [15, 15]); }
      else { var lv = +keyOf(q[3]).split('_')[1]; edges(solid, q[0] + 0.25, q[1] + 0.25, q[2] + 0.25, [240, 214, 110], 0.04); cube(solid, q[0] + 0.5, q[1] + 0.35, q[2] + 0.5, 0.12 + lv * 0.012, 0, function () { return 0; }, function () { return [255, 240, 170]; }, [15, 15]); }
    });
    // 世界の端：近づくと、斜めの縞の壁が見える
    var b = border(this);
    if (b && p) {
      var sc = wd.dimKey === 'nether' ? 8 : 1, half = b.size / 2 / sc, cx = b.cx / sc, cz = b.cz / sc, col = [96, 168, 226];
      [[cx - half, 0], [cx + half, 0], [cz - half, 1], [cz + half, 1]].forEach(function (wl) {
        var d = wl[1] ? Math.abs(p[2] - wl[0]) : Math.abs(p[0] - wl[0]);
        if (d > 12) return;
        var along = wl[1] ? p[0] : p[2], lo = wl[1] ? cx - half : cz - half, hi = wl[1] ? cx + half : cz + half, y0 = Math.floor(p[1]) - 8, shade = 1 - d / 14;
        var c2 = [150 + 60 * shade, 196 + 40 * shade, 236 + 16 * shade];
        for (var s = Math.floor(along / 3) * 3 - 18; s <= along + 18; s += 3) {
          if (s < lo || s > hi) continue;
          var tf = wl[1] ? function (x, y, z) { return [x + (y - y0) * 0.6, y, z]; } : function (x, y, z) { return [x, y, z + (y - y0) * 0.6]; };
          var sx = wl[1] ? s - 10 : wl[0] - 0.02, sz = wl[1] ? wl[0] - 0.02 : s - 10;
          if (wl[1]) WG.modelBox(solid, [s - (16 * 0.6) / 2, y0, wl[0] - 0.02], [0.22, 16, 0.04], tf, c2, [15, 15]);
          else WG.modelBox(solid, [wl[0] - 0.02, y0, s - (16 * 0.6) / 2], [0.04, 16, 0.22], tf, c2, [15, 15]);
          void sx; void sz;
        }
      });
    }
    // エンドクリスタルの光線（竜へ・儀式の点へ）
    this.mobs.list.forEach(function (m) {
      if (m.type !== 'END_CRYSTAL' || m.dead) return;
      var to = m.beamTo;
      if (to) beam(solid, [m.x, m.y + 0.9, m.z], to, wd.ritual ? [230, 170, 255] : [250, 200, 255]);
    });
    void g;
    return r;
  };

  // ---------------- エンドクリスタル ----------------
  TYPES.END_CRYSTAL = { name: 'エンドクリスタル', w: 1.6, h: 1.8, hp: 1, speed: 0, food: [], drops: [], noFall: true, fireproof: true, crystal: true };
  // 台の上に浮かぶ結晶：外側のガラスの枠（12 本の辺）と、桃色の芯
  var CF = [];
  for (var e1 = 0; e1 < 2; e1++) for (var e2 = 0; e2 < 2; e2++) {
    var a1 = e1 ? 6 : -7, a2 = e2 ? 6 : -7;
    CF.push(box(a1, 7, a2, 1, 14, 1, '#e6e0ee'), box(-7, 7 + (e1 ? 13 : 0), a2, 14, 1, 1, '#e6e0ee'), box(a1, 7 + (e2 ? 13 : 0), -7, 1, 1, 14, '#e6e0ee'));
  }
  MODELS.END_CRYSTAL = [box(-8, 0, -8, 16, 3, 16, '#3a3a40'), box(-7.5, 3, -7.5, 15, 1, 15, '#26262c')].concat(CF,
    [box(-4.5, 9.5, -4.5, 9, 9, 9, '#d8a8ec'), box(-3, 11, -3, 6, 6, 6, '#ff70c8'), box(-1.6, 12.4, -1.6, 3.2, 3.2, 3.2, '#ffe0f6')]);
  var special = Mobs.prototype.special;
  Mobs.prototype.special = function (m) {
    if (m.type !== 'END_CRYSTAL') return special.apply(this, arguments);
    var g = this.game, wd = this.world;
    m.yaw += 0.08; m.vx = m.vz = 0; m.vy = 0; m.persist = true;
    if (m.age % 6 === 0) g.particles.push({ x: m.x + (Math.random() - 0.5), y: m.y + 0.6 + Math.random(), z: m.z + (Math.random() - 0.5), vx: 0, vy: 0.02, vz: 0, life: 20, c: [240, 160, 230], glow: true });
    // 竜が近くにいれば光線で癒やす
    m.beamTo = null;
    if (wd.ritual && m.ritual) { m.beamTo = [0.5, wd.ritual.y + 14, 0.5]; return 'done'; }
    var dr = this.list.filter(function (q) { return q.type === 'END_DRAGON' && !q.dead && Math.hypot(q.x - m.x, q.y - m.y, q.z - m.z) < 40; })[0];
    if (dr) { m.beamTo = [dr.x, dr.y + 1.5, dr.z]; if (m.age % 10 === 0 && dr.hp < TYPES.END_DRAGON.hp) dr.hp = Math.min(TYPES.END_DRAGON.hp, dr.hp + 1); }
    return 'done';
  };
  var physics = Mobs.prototype.physics;
  Mobs.prototype.physics = function (m) { if (m.type === 'END_CRYSTAL') return; return physics.apply(this, arguments); };
  var mdie = Mobs.prototype.die;
  Mobs.prototype.die = function (m) {
    var g = this.game, r;
    if (m.type === 'END_CRYSTAL') { if (!m.quiet && !m.ritual) g.explode(m.x, m.y + 0.5, m.z, 3); g.puff(m.x, m.y + 1, m.z, [240, 170, 240], 20, 0.6); return; }
    r = mdie.apply(this, arguments);
    return r;
  };
  // 柱の上にクリスタル（竜がまだいる果ての世界）
  var populate = Mobs.prototype.populate;
  Mobs.prototype.populate = function (cx, cz) {
    var r = populate.apply(this, arguments), wd = this.world, gen = wd.gen, self = this;
    if (wd.dimKey === 'end' && gen && gen.pillars && !wd.dragonDead) {
      var done = wd.crystalsPut || (wd.crystalsPut = {});
      gen.pillars.forEach(function (pl, i) {
        if ((pl.x >> 4) !== cx || (pl.z >> 4) !== cz || done[i]) return;
        done[i] = 1; var m = self.spawn('END_CRYSTAL', pl.x + 0.5, pl.top + 1, pl.z + 0.5); if (m) m.persist = true;
      });
    }
    springs(this, cx, cz);
    return r;
  };
  // 竜の卵：はじめて竜を倒したとき、帰りの門の中心の柱の上に
  var dragonDied = Mobs.prototype.dragonDied;
  Mobs.prototype.dragonDied = function (m) {
    var r = dragonDied.apply(this, arguments), wd = this.world, g = this.game;
    var y = portalY(wd);
    if (y != null) {
      for (var i = 0; i < 4; i++) wd.setBlock(0, y + i, 0, B.BEDROCK);
      if (!wd.eggPlaced) { wd.setBlock(0, y + 4, 0, B.DRAGON_EGG); wd.eggPlaced = true; }
      g.walker.remesh(0, 0);
    }
    wd.ritual = null;
    return r;
  };
  function portalY(wd) { for (var y = 140; y > 0; y--) if (wd.block(1, y, 0) === B.END_PORTAL || (wd.block(1, y, 0) === B.AIR && wd.block(2, y, 0) === B.BEDROCK && wd.block(1, y - 1, 0) === B.BEDROCK)) return y; return null; }
  WG.endPortalY = portalY;
  // 儀式：帰りの門のまわりに 4 つ置くと、光線が空の一点に集まり、竜が戻ってくる
  function tickRitual(g) {
    var wd = g.world, rt = wd.ritual;
    if (!rt) return;
    rt.t++;
    if (rt.t % 4 === 0) g.particles.push({ x: 0.5 + (Math.random() - 0.5) * 2, y: rt.y + 14 + (Math.random() - 0.5) * 2, z: 0.5 + (Math.random() - 0.5) * 2, vx: 0, vy: 0, vz: 0, life: 30, c: [240, 190, 255], glow: true });
    if (rt.t === 1) toast(g, '竜を呼び直す儀式が始まった');
    if (rt.t < 200) return;
    g.mobs.list.forEach(function (m) { if (m.type === 'END_CRYSTAL' && m.ritual) { m.quiet = true; m.dead = 1; g.puff(m.x, m.y + 1, m.z, [240, 170, 240], 24, 0.7); } });
    for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) if (wd.block(dx, rt.y, dz) === B.END_PORTAL) wd.setBlock(dx, rt.y, dz, B.AIR);
    g.walker.remesh(0, 0);
    wd.dragonDead = false; wd.ritual = null;
    var d = g.mobs.spawn('END_DRAGON', 30, 90, 0); if (d && d.ai) d.ai.ang = 0;
    if (WG.Sound) WG.Sound.play('explode', 0.5, rt.y + 10, 0.5);
    toast(g, '果ての竜が戻ってきた');
  }
  WG.tickRitual = tickRitual;

  // ---------------- 右クリック ----------------
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), wd = this.world, surv = this.mode === 'survival', self = this, mt = this.mobs.target && this.mobs.target.mob;
    var done = function () { self.mouseR = self.clickR = false; };
    if (this.spectator) return use.apply(this, arguments);
    if (mt && mt.type === 'WANDERING_TRADER' && !mt.dead) { done(); this.openTrade(mt); return; }
    if (!t) return use.apply(this, arguments);
    var id = t.id, k = t.x + ',' + t.y + ',' + t.z;
    // エンドクリスタルを置く（黒曜石か岩盤の上）
    if (held && held.key === 'END_CRYSTAL' && (id === B.OBSIDIAN || id === B.BEDROCK) && t.py === t.y + 1 && wd.block(t.x, t.y + 1, t.z) === B.AIR) {
      done();
      var m = this.mobs.spawn('END_CRYSTAL', t.x + 0.5, t.y + 1, t.z + 0.5); if (!m) return;
      m.persist = true; if (surv) this.inv.take(this.inv.sel, 1);
      if (wd.dimKey === 'end' && wd.dragonDead && !wd.ritual) {
        var py = portalY(wd), ring = py != null && this.mobs.list.filter(function (q) { return q.type === 'END_CRYSTAL' && !q.dead && Math.abs(q.y - py) < 2 && Math.hypot(q.x - 0.5, q.z - 0.5) < 4.5; });
        if (ring && ring.length >= 4) { ring.forEach(function (q) { q.ritual = true; }); wd.ritual = { t: 0, y: py }; }
      }
      return;
    }
    // 竜の卵：さわると近くへ瞬間移動する
    if (id === B.DRAGON_EGG) { done(); eggHop(this, t.x, t.y, t.z); return; }
    // コマンドブロック（クリエイティブで書く）
    if (id === B.COMMAND_BLOCK) {
      done();
      if (this.mode !== 'creative') { toast(this, 'コマンドブロックはクリエイティブで使えます'); return; }
      var cmds = wd.cmds || (wd.cmds = new Map());
      if (this.ui.prompt) this.ui.prompt('コマンドブロックのコマンド（今：' + (cmds.get(k) || 'なし') + '）', function (text) { if (text != null) cmds.set(k, String(text).trim()); });
      return;
    }
    // 光ブロック：持って右クリックで明るさを変える
    if (/^LIGHT_\d+$/.test(keyOf(id)) && held && /^LIGHT_/.test(held.key)) { done(); var L = [15, 11, 7, 3], lv = +keyOf(id).split('_')[1]; wd.setBlock(t.x, t.y, t.z, B['LIGHT_' + L[(L.indexOf(lv) + 1) % 4]]); w.remesh(t.x, t.z); return; }
    // 不吉な試練の鍵：宝庫からよい物（1 つの宝庫に 1 回）
    if (id === B.VAULT || id === B.VAULT_OPEN) {
      if (held && held.key === 'OMINOUS_TRIAL_KEY') {
        done();
        var used = wd.omenVault || (wd.omenVault = new Set());
        if (used.has(k)) { toast(this, 'この宝庫はもう開けました'); return; }
        used.add(k); if (surv) this.inv.take(this.inv.sel, 1);
        var LOOT = [['HEAVY_CORE', 1, 1, 4], ['ENCHANTED_GOLDEN_APPLE', 1, 1, 3], ['DIAMOND_BLOCK', 1, 2, 4], ['EMERALD_BLOCK', 1, 3, 5], ['ENCHANTED_BOOK', 1, 1, 6], ['DIAMOND', 2, 4, 6], ['OMINOUS_BOTTLE', 1, 1, 4]].filter(function (l) { return ITEMS[l[0]]; });
        var tot = LOOT.reduce(function (s, l) { return s + l[3]; }, 0);
        for (var i = 0; i < 3; i++) { var rr = rint(tot), l = LOOT[0]; for (var j = 0; j < LOOT.length; j++) { if (rr < LOOT[j][3]) { l = LOOT[j]; break; } rr -= LOOT[j][3]; } var e = this.spawnItem(l[0], l[1] + rint(l[2] - l[1] + 1), t.x + 0.5, t.y + 1.05, t.z + 0.5, 0.05, 10 + i * 10); if (e) e.vy = 0.2; }
        this.puff(t.x + 0.5, t.y + 1, t.z + 0.5, [110, 180, 220], 24, 0.6); if (WG.Sound) WG.Sound.play('levelup', t.x + 0.5, t.y + 1, t.z + 0.5);
        return;
      }
    }
    return use.apply(this, arguments);
  };
  function eggHop(g, x, y, z) {
    var wd = g.world;
    for (var n = 0; n < 40; n++) {
      var nx = x + rint(31) - 15, nz = z + rint(31) - 15, ny = y + rint(15) - 7;
      if (wd.block(nx, ny, nz) === B.AIR && WG.COLLIDE[wd.block(nx, ny - 1, nz)] >= 1) {
        wd.setBlock(x, y, z, B.AIR); wd.setBlock(nx, ny, nz, B.DRAGON_EGG); g.walker.remesh(x, z); g.walker.remesh(nx, nz);
        for (var i = 0; i <= 24; i++) { var f = i / 24; g.particles.push({ x: x + 0.5 + (nx - x) * f, y: y + 0.5 + (ny - y) * f, z: z + 0.5 + (nz - z) * f, vx: 0, vy: 0.01, vz: 0, life: 24, c: [170, 80, 220], glow: true }); }
        if (WG.Sound) WG.Sound.play('portal', nx + 0.5, ny + 0.5, nz + 0.5);
        return true;
      }
    }
    return false;
  }
  WG.eggHop = eggHop;
  // 竜の卵は叩いても逃げる
  var breakBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function (x, y, z) {
    if (this.world.block(x, y, z) === B.DRAGON_EGG && this.mode === 'survival') { eggHop(this, x, y, z); return false; }
    return breakBlock.apply(this, arguments);
  };

  // ---------------- コマンドブロック：レッドストーンの信号が入ったときに 1 回実行 ----------------
  var R = WG.Redstone, updateComp = R.prototype.updateComp;
  R.prototype.updateComp = function (x, y, z) {
    if (this.get(x, y, z) !== B.COMMAND_BLOCK) return updateComp.apply(this, arguments);
    var g = this.g, wd = g.world, k = x + ',' + y + ',' + z, on = this.powered(x, y, z), was = wd.cmdOn && wd.cmdOn.has(k);
    if (on && !was) {
      (wd.cmdOn || (wd.cmdOn = new Set())).add(k);
      var cmd = wd.cmds && wd.cmds.get(k);
      if (cmd) { var out = WG.runCommand(g, cmd); if (out) toast(g, '［コマンドブロック］' + String(out).split('\n')[0]); }
    } else if (!on && was) wd.cmdOn.delete(k);
  };

  // ---------------- 不吉な試練 ----------------
  var tickTrials = Game.prototype.tickTrials;
  Game.prototype.tickTrials = function () {
    var wd = this.world, self = this, before = {};
    if (wd.trials) wd.trials.forEach(function (t, key) { before[key] = t.state; });
    var r = tickTrials.apply(this, arguments);
    if (!wd.trials) return r;
    wd.trials.forEach(function (t, key) {
      // 凶兆を持って近づくと、不吉な試練になる（敵が多く、強い）
      if (before[key] === 'idle' && t.state === 'active' && self.effects.BAD_OMEN) { t.ominous = true; t.total = (t.total || 6) + 3; delete self.effects.BAD_OMEN; self.inv.changed(); toast(self, '不吉な試練が始まった'); }
      if (t.ominous) {
        self.mobs.list.forEach(function (m) { if (m.trialKey === key && !m.omen && !m.dead) { m.omen = true; m.hp = Math.round(m.hp * 1.6); m.strong = 1; } });
        if (t.state === 'active' && (self.tickCount || 0) % 5 === 0) { var q = key.split(',').map(Number); for (var f = 0; f < 2; f++) self.particles.push({ x: q[0] + 0.2 + Math.random() * 0.6, y: q[1] + 0.2 + Math.random() * 0.6, z: q[2] + 0.2 + Math.random() * 0.6, vx: 0, vy: 0.035, vz: 0, life: 12, c: [90, 200, 230], glow: true }); }
        if (before[key] === 'active' && t.state === 'cool') { var p = key.split(',').map(Number); var e = self.spawnItem('OMINOUS_TRIAL_KEY', 1, p[0] + 0.5, p[1] + 1.2, p[2] + 0.5, 0.05, 10); if (e) e.vy = 0.25; t.ominous = false; }
      }
    });
    return r;
  };
  // 不吉な試練の敵は、強く叩く
  var hurtPlayer = Game.prototype.hurtPlayer;
  Game.prototype.hurtPlayer = function (n, fx, fz) {
    var near = this.mobs.list.some(function (m) { return m.strong && !m.dead && Math.hypot(m.x - fx, m.z - fz) < 0.5; });
    if (near) { var a = Array.prototype.slice.call(arguments); a[0] = n * 1.5; return hurtPlayer.apply(this, a); }
    return hurtPlayer.apply(this, arguments);
  };

  // ---------------- 村人の繁殖 ----------------
  var FOOD = { BREAD: 4, CARROT: 1, POTATO: 1, BEETROOT: 1 };
  var mtick = Mobs.prototype.tick;
  Mobs.prototype.tick = function () {
    var r = mtick.apply(this, arguments), g = this.game, wd = this.world, self = this, now = g.tickCount || 0;
    if (now % 20) return r;
    var vs = this.list.filter(function (m) { return m.type === 'VILLAGER' && !m.dead; });
    vs.forEach(function (v) {
      // 近くに落ちている食べ物を拾う
      for (var i = g.entities.length - 1; i >= 0; i--) {
        var e = g.entities[i];
        if (FOOD[e.key] && !e.delay && Math.hypot(e.x - v.x, e.y - v.y, e.z - v.z) < 1.6 && (v.food || 0) < 24) { v.food = (v.food || 0) + FOOD[e.key] * e.n; g.entities.splice(i, 1); }
      }
    });
    if (now % 100) return r;
    vs.forEach(function (v) {
      if (v.baby || (v.food || 0) < 12 || (v.breedCd || 0) > now) return;
      var mate = vs.filter(function (o) { return o !== v && !o.baby && (o.food || 0) >= 12 && !((o.breedCd || 0) > now) && Math.hypot(o.x - v.x, o.z - v.z) < 4; })[0];
      if (!mate) return;
      // 空いたベッドが必要
      var beds = 0, x0 = Math.floor(v.x), y0 = Math.floor(v.y), z0 = Math.floor(v.z);
      for (var dy = -2; dy <= 2; dy++) for (var dz = -10; dz <= 10; dz++) for (var dx = -10; dx <= 10; dx++) if (WG.blockKind(wd.block(x0 + dx, y0 + dy, z0 + dz)) === 'bed' && /_HEAD|_H$|HEAD/.test(keyOf(wd.block(x0 + dx, y0 + dy, z0 + dz)))) beds++;
      var people = vs.filter(function (o) { return Math.hypot(o.x - v.x, o.z - v.z) < 16; }).length;
      if (beds <= people) return;
      v.food -= 12; mate.food -= 12; v.breedCd = mate.breedCd = now + 6000;
      var kid = self.spawn('VILLAGER', (v.x + mate.x) / 2, v.y + 0.2, (v.z + mate.z) / 2);
      if (kid) { kid.baby = 24000; kid.persist = true; if (WG.setupVillager) WG.setupVillager(kid); }
      for (var h = 0; h < 6; h++) g.particles.push({ x: v.x + (Math.random() - 0.5), y: v.y + 2 + Math.random() * 0.5, z: v.z + (Math.random() - 0.5), vx: 0, vy: 0.03, vz: 0, life: 24, c: [230, 70, 90], glow: true });
    });
    return r;
  };

  // ---------------- 旅の商人（ときどき 2 頭の行商人のラマを連れてやってくる） ----------------
  TYPES.WANDERING_TRADER = Object.assign({}, TYPES.VILLAGER, { name: '旅の商人', drops: [['MILK_BUCKET', 0, 0]], despawn: false });
  MODELS.WANDERING_TRADER = MODELS.VILLAGER.map(function (pt) { return Object.assign({}, pt, pt.prof ? { prof: null, c: pt.prof === 2 ? [52, 84, 150] : [70, 110, 180] } : {}); })
    .concat([box(-4.5, 30.5, -4.5, 9, 2, 9, '#3a5aa0'), box(-3.5, 32.5, -3.5, 7, 1.5, 7, '#4a6ab0'), box(-1, 14, -4.8, 2, 8, 0.5, '#c8a040')]);
  var TRADER_GOODS = [['EMERALD', 1], ['OAK_SAPLING', 1], ['EMERALD', 1], ['CHERRY_SAPLING', 1], ['EMERALD', 1], ['SAND', 8], ['EMERALD', 1], ['RED_SAND', 4], ['EMERALD', 2], ['POINTED_DRIPSTONE', 2],
    ['EMERALD', 1], ['LILY_PAD', 2], ['EMERALD', 3], ['GLOWSTONE', 1], ['EMERALD', 1], ['BLUE_DYE', 3], ['EMERALD', 5], ['NAUTILUS_SHELL', 1], ['EMERALD', 3], ['SEA_PICKLE', 1], ['EMERALD', 1], ['MOSS_BLOCK', 2],
    ['EMERALD', 1], ['PUMPKIN', 1], ['EMERALD', 4], ['BLUE_ICE', 1], ['EMERALD', 2], ['GUNPOWDER', 1], ['EMERALD', 1], ['FERN', 1]];
  function traderTrades() {
    var all = [];
    for (var i = 0; i + 1 < TRADER_GOODS.length; i += 2) if (ITEMS[TRADER_GOODS[i + 1][0]]) all.push({ a: TRADER_GOODS[i], out: TRADER_GOODS[i + 1], uses: 0, max: 4 });
    for (var j = all.length - 1; j > 0; j--) { var r = rint(j + 1), tt = all[j]; all[j] = all[r]; all[r] = tt; }
    return all.slice(0, 6);
  }
  var profName = WG.profName;
  WG.profName = function (m) { return m && m.type === 'WANDERING_TRADER' ? '旅の商人' : profName.apply(this, arguments); };
  function maybeTrader(g) {
    var wd = g.world, p = g.walker.pos;
    if (g.mobs.list.some(function (m) { return m.type === 'WANDERING_TRADER' && !m.dead; })) return;
    wd.traderChance = Math.min(75, (wd.traderChance || 25) + 25);
    if (Math.random() * 1000 > wd.traderChance * 2) return;
    for (var n = 0; n < 20; n++) {
      var a = Math.random() * 6.28, d = 16 + Math.random() * 12, x = Math.floor(p[0] + Math.cos(a) * d), z = Math.floor(p[2] + Math.sin(a) * d), y;
      for (y = Math.floor(p[1]) + 12; y > Math.floor(p[1]) - 12; y--) if (WG.COLLIDE[wd.block(x, y - 1, z)] >= 1 && wd.block(x, y, z) === B.AIR && wd.block(x, y + 1, z) === B.AIR) break;
      if (y <= Math.floor(p[1]) - 12) continue;
      spawnTrader(g, x + 0.5, y, z + 0.5);
      wd.traderChance = 25;
      return;
    }
  }
  function spawnTrader(g, x, y, z) {
    var t = g.mobs.spawn('WANDERING_TRADER', x, y, z); if (!t) return null;
    t.trades = traderTrades(); t.leaveAt = (g.tickCount || 0) + 48000; t.persist = true;
    [-1.5, 1.5].forEach(function (o) { var l = g.mobs.spawn('TRADER_LLAMA', x + o, y, z + 1); if (l) { l.follow = t; l.persist = true; } });
    toast(g, '旅の商人がやってきた');
    return t;
  }
  WG.spawnTrader = spawnTrader;
  var special2 = Mobs.prototype.special;
  Mobs.prototype.special = function (m, T) {
    var g = this.game;
    if (m.type === 'WANDERING_TRADER') {
      if (m.leaveAt && (g.tickCount || 0) > m.leaveAt) { m.dead = 1; m.quietDeath = true; g.puff(m.x, m.y + 1, m.z, [200, 200, 220], 12, 0.4); return 'done'; }
      if (m.trading) return 'done';
    }
    if (m.follow) {
      var f = m.follow;
      if (f.dead) { m.follow = null; m.leaveAt = (g.tickCount || 0) + 200; }
      else if (Math.hypot(f.x - m.x, f.z - m.z) > 3) return { want: [f.x, f.z], speed: (T.speed || 0.08) * 1.4, chase: true };
    }
    if (m.type === 'TRADER_LLAMA' && m.leaveAt && (g.tickCount || 0) > m.leaveAt) { m.dead = 1; return 'done'; }
    return special2.apply(this, arguments);
  };

  // ---------------- 湧き水：崖の途中と洞窟の壁から、水と溶岩がはじめから流れ出る ----------------
  var Overworld = WG.Overworld, ogen = Overworld.prototype.generate, MINY = -64;
  var SPRINGS = new Map(); WG._springs = SPRINGS;
  Overworld.prototype.generate = function (cx, cz, surfaceOnly) {
    var r = ogen.apply(this, arguments);
    if (surfaceOnly) return r;
    var bl = r.blocks, hm = r.hmap, seed = this.seed, x0 = cx << 4, z0 = cz << 4, list = [], H = bl.length >> 8;
    var at = function (x, y, z) { return ((y - MINY) << 8) | (z << 4) | x; };
    // 崖：となりの列より 5 以上高い列の、崖の面の中ほどに水の湧き口
    for (var z = 1; z < 15; z++) for (var x = 1; x < 15; x++) {
      var h = hm[(z << 4) | x], hv = hash(seed, x0 + x, 77, z0 + z, 1901);
      if (hv % 9) continue;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) {
        var nh = hm[((z + d[1]) << 4) | (x + d[0])];
        if (h - nh < 5) return false;
        var y = nh + 2 + (hv >>> 4) % Math.max(1, h - nh - 3), i = at(x, y, z), j = at(x + d[0], y, z + d[1]);
        if (bl[i] !== B.STONE && bl[i] !== B.DIRT && bl[i] !== B.GRANITE && bl[i] !== B.ANDESITE && bl[i] !== B.DIORITE) return false;
        if (bl[j] !== B.AIR) return false;
        bl[i] = B.WATER; list.push([x0 + x, y, z0 + z]); return true;
      });
    }
    // 洞窟：空洞に面した壁に、浅い所は水、深い所は溶岩の湧き口
    for (var n = 0; n < 6; n++) {
      var hx = hash(seed, cx, n, cz, 1902), xx = 1 + hx % 14, zz = 1 + (hx >>> 4) % 14, yy = MINY + 8 + (hx >>> 8) % 100;
      if (yy >= hm[(zz << 4) | xx] - 6) continue;
      var ii = at(xx, yy, zz);
      if (bl[ii] !== B.STONE && bl[ii] !== B.DEEPSLATE) continue;
      var open = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0]].some(function (d) { return bl[at(xx + d[0], yy + d[1], zz + d[2])] === B.AIR; });
      if (!open) continue;
      bl[ii] = yy < 0 ? B.LAVA : B.WATER; list.push([x0 + xx, yy, z0 + zz]);
    }
    // 生成された水と溶岩のうち、横か下が空いているもの（滝・地下の水）も流し始める
    var topH = 0; for (var q = 0; q < 256; q++) if (hm[q] > topH) topH = hm[q];
    var lim = Math.min(bl.length - 256, (topH - MINY) << 8);   // 地面より下だけ（海や川の水面は見ない）
    for (var k = 256; k < lim; k++) {
      var id = bl[k];
      if (id !== B.WATER && id !== B.LAVA) continue;
      if ((k >> 8) + MINY >= hm[k & 255]) continue;
      if (id === B.WATER && (k >> 8) + MINY < 0) continue;   // 深い所の水は、洞窟が水びたしにならないよう流さない
      if (list.length >= 96) break;
      var lx = k & 15, lz = (k >> 4) & 15;
      var under = (k >> 8) + MINY < hm[(lz << 4) | lx];   // 地面より下（地下の水たまり）なら、下へ落ちる流れも
      if ((under && bl[k - 256] === B.AIR) || (lx > 0 && bl[k - 1] === B.AIR) || (lx < 15 && bl[k + 1] === B.AIR) || (lz > 0 && bl[k - 16] === B.AIR) || (lz < 15 && bl[k + 16] === B.AIR)) list.push([x0 + lx, (k >> 8) + MINY, z0 + lz]);
    }
    void H;
    if (list.length) SPRINGS.set(cx + ',' + cz + ',' + seed, list.slice(0, 400));
    return r;
  };
  function springs(mobs, cx, cz) {
    var wd = mobs.world, fl = wd.fluids, key = cx + ',' + cz + ',' + (wd.gen && wd.gen.seed), list = SPRINGS.get(key);
    if (!list || !fl || wd.dimKey !== 'overworld') return;
    SPRINGS.delete(key);
    var started = wd.springsDone || (wd.springsDone = new Set());
    if (started.has(cx + ',' + cz)) return;
    started.add(cx + ',' + cz);
    list.forEach(function (q, i) { var id = wd.block(q[0], q[1], q[2]); if (id === B.WATER || id === B.LAVA) fl.schedule(q[0], q[1], q[2], 2 + (i % 20)); });
  }
  WG.startSprings = springs;
})(typeof window !== 'undefined' ? window : globalThis);
