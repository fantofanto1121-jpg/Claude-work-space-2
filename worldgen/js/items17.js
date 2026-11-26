// 機能とアイテム（ロードマップ 第 17 段階）
// リスポーンアンカー（ネザーで使う。ほかの所で使うと爆発）、ロードストーンとコンパス、つながったチェストの見直し（黒曜石を落とす・まわりに粒）、
// 頭（プレイヤー・ゾンビ・ハゼゴケ・骸骨・竜）、馬鎧（革・鉄・金・ダイヤモンド）、メイスと重い核（落ちながら叩くと強い）、
// 鍛冶型（ネザライトへの強化・防具の飾り）、チェスト付き・ホッパー付き・TNT 付き・かまど付きのトロッコ、チェスト付きボートと竹のいかだ、
// クロスボウで花火を撃つ、レコードの破片（9 つで「かけらの歌」）、ポップしたコーラスフルーツ
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Mobs = WG.Mobs, TYPES = WG.MOB_TYPES, MODELS = WG.MOB_MODELS;
  function keyOf(id) { return WG.BLOCKS[id] ? WG.BLOCKS[id].key : ''; }
  function item(key, name, max, extra) { var it = { key: key, name: name, block: -1, max: max || 64, shape: 'lump', color: '#888888' }; for (var k in extra || {}) it[k] = extra[k]; ITEMS[key] = it; return it; }
  function blockItem(key, hardness, drop, tool) {
    var id = B[key]; ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: 1, dropMax: 1, dropChance: 1 };
    if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = 0; }
    return ITEMS[key];
  }
  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }

  // ---------------- ブロックとアイテム ----------------
  for (var ra = 0; ra <= 4; ra++) blockItem('RESPAWN_ANCHOR_' + ra, 50, 'RESPAWN_ANCHOR_0', 'pickaxe');
  blockItem('LODESTONE', 3.5, 'LODESTONE', 'pickaxe');
  var HEADS = ['PLAYER_HEAD', 'ZOMBIE_HEAD', 'MOSS_HEAD', 'SKELETON_SKULL', 'DRAGON_HEAD'];
  HEADS.forEach(function (k) { blockItem(k, 1); });
  blockItem('HEAVY_CORE', 10, 'HEAVY_CORE', 'pickaxe');
  // つながったチェスト：シルクタッチでないと黒曜石 8 個
  Object.assign(ITEMS.LINKED_CHEST, { drop: 'OBSIDIAN', dropMin: 8, dropMax: 8 });
  item('MACE', 'メイス', 1, { attack: 6, dur: 500, mace: true });
  var HARMOR = { LEATHER_HORSE_ARMOR: ['革の馬鎧', 3, '#8c5634'], IRON_HORSE_ARMOR: ['鉄の馬鎧', 5, '#c8cace'], GOLDEN_HORSE_ARMOR: ['金の馬鎧', 7, '#e8c440'], DIAMOND_HORSE_ARMOR: ['ダイヤモンドの馬鎧', 11, '#56d2c8'] };
  Object.keys(HARMOR).forEach(function (k) { item(k, HARMOR[k][0], 1, { horseArmor: HARMOR[k][1] }); });
  var TRIMS = { RIPPLE: '波紋', FANG: '牙', STAR: '星', LEAF: '葉' };
  item('NETHERITE_UPGRADE', 'ネザライト強化の鍛冶型', 64, { template: 'UPGRADE' });
  Object.keys(TRIMS).forEach(function (k) { item('TRIM_' + k, TRIMS[k] + 'の鍛冶型（防具の飾り）', 64, { template: k }); });
  var TRIM_MATS = { IRON_INGOT: ['鉄', '#d8dadc'], GOLD_INGOT: ['金', '#f0c838'], COPPER_INGOT: ['銅', '#d07a50'], EMERALD: ['エメラルド', '#30c060'], DIAMOND: ['ダイヤモンド', '#60e0d8'],
    REDSTONE: ['レッドストーン', '#c02020'], LAPIS_LAZULI: ['ラピスラズリ', '#2a50b0'], AMETHYST_SHARD: ['アメジスト', '#a070d8'], QUARTZ: ['クォーツ', '#ece6dc'], NETHERITE_INGOT: ['ネザライト', '#4a4048'] };
  var CARTS = { CHEST: ['チェスト付きトロッコ', 'CHEST'], HOPPER: ['ホッパー付きトロッコ', 'HOPPER'], TNT: ['TNT 付きトロッコ', 'TNT'], FURNACE: ['かまど付きトロッコ', 'FURNACE'] };
  Object.keys(CARTS).forEach(function (v) { item(v + '_MINECART', CARTS[v][0], 1, { vehicle: 'MINECART', variant: v }); });
  item('CHEST_BOAT', 'チェスト付きボート', 1, { vehicle: 'BOAT', variant: 'CHEST' });
  item('BAMBOO_RAFT', '竹のいかだ', 1, { vehicle: 'BOAT', variant: 'RAFT' });
  item('DISC_FRAGMENT', 'レコードの破片', 64);
  item('MUSIC_DISC_SHARD', 'レコード「かけらの歌」', 1, { disc: 'SHARD', song: 'かけらの歌', signal: 6 });
  if (WG.DISCS) WG.DISCS.push(['SHARD', 'かけらの歌']);
  item('POPPED_CHORUS_FRUIT', 'ポップしたコーラスフルーツ', 64);

  // オリジナルの曲：「かけらの歌」（ゆっくりした短調。割れたものをつなぎ直すように、同じ音型が少しずつ高くなる）
  if (WG.Sound && WG.Sound.SONGS) WG.Sound.SONGS.SHARD = { bpm: 84, root: 196, scale: [0, 2, 3, 5, 7, 8, 11], lead: 'sine', bassWave: 'triangle', style: 'drone', echo: true,
    mel: '0:1 2:.5 3:.5 4:2 3:1 2:1 0:2 -:1 1:1 3:.5 4:.5 5:2 4:1 3:1 1:2 -:1 2:1 4:.5 5:.5 6:2 5:1 4:1 2:2 ' +
         '7:1 6:.5 5:.5 4:1 3:1 4:1 2:1 0:1 -1:1 0:4',
    bass: [0, 5, 3, 4, 0, 5, 6, 0] };

  // ---------------- レシピ ----------------
  Craft.SHAPED.push(
    [['CCC', 'GGG', 'CCC'], { C: 'CRYING_OBSIDIAN', G: 'GLOWSTONE' }, 'RESPAWN_ANCHOR_0', 1],
    [['SSS', 'SNS', 'SSS'], { S: 'CHISELED_STONE_BRICKS', N: 'NETHERITE_INGOT' }, 'LODESTONE', 1],
    [['H', 'R'], { H: 'HEAVY_CORE', R: 'WIND_ROD' }, 'MACE', 1],
    [['L L', 'LLL', 'L L'], { L: 'LEATHER' }, 'LEATHER_HORSE_ARMOR', 1],
    [['DTD', 'DND', 'DDD'], { D: 'DIAMOND', T: 'NETHERITE_UPGRADE', N: 'NETHERRACK' }, 'NETHERITE_UPGRADE', 2]);
  Object.keys(TRIMS).forEach(function (k) { Craft.SHAPED.push([['DTD', 'DCD', 'DDD'], { D: 'DIAMOND', T: 'TRIM_' + k, C: 'COBBLESTONE' }, 'TRIM_' + k, 2]); });
  Craft.SHAPED.unshift([['P P', 'PPP'], { P: 'BAMBOO_PLANKS' }, 'BAMBOO_RAFT', 1]);   // （ボートより先に見る）
  Craft.SHAPED.push([['DDD', 'DDD', 'DDD'], { D: 'DISC_FRAGMENT' }, 'MUSIC_DISC_SHARD', 1]);
  Craft.SHAPELESS.push([['CHEST', 'MINECART'], 'CHEST_MINECART', 1], [['HOPPER', 'MINECART'], 'HOPPER_MINECART', 1], [['TNT', 'MINECART'], 'TNT_MINECART', 1],
    [['FURNACE', 'MINECART'], 'FURNACE_MINECART', 1], [['CHEST', 'BOAT'], 'CHEST_BOAT', 1], [['CHEST', 'BAMBOO_RAFT'], 'CHEST_BOAT', 1]);
  Craft.SMELT.CHORUS_FRUIT = 'POPPED_CHORUS_FRUIT';
  // 果ての棒と紫のブロックは、ポップしたコーラスフルーツから（もとの生のコーラスフルーツのレシピを置きかえ）
  Craft.SHAPED.forEach(function (r) { if ((r[2] === 'END_ROD' || r[2] === 'PURPUR_BLOCK') && r[1].C === 'CHORUS_FRUIT') r[1].C = 'POPPED_CHORUS_FRUIT'; });
  Craft.FUEL.BAMBOO_RAFT = 1200; Craft.FUEL.CHEST_BOAT = 1200;

  // ---------------- 宝箱 ----------------
  var SL = WG.STRUCTURE_LOOT || {};
  function addLoot(t, list) { if (SL[t]) list.forEach(function (l) { if (ITEMS[l[0]]) SL[t].push(l); }); }
  addLoot('bastion', [['NETHERITE_UPGRADE', 1, 1, 8], ['TRIM_FANG', 1, 1, 4], ['GOLDEN_HORSE_ARMOR', 1, 1, 4]]);
  addLoot('ocean_ruin', [['TRIM_RIPPLE', 1, 1, 5]]); addLoot('end_city', [['TRIM_STAR', 1, 1, 4], ['DIAMOND_HORSE_ARMOR', 1, 1, 4], ['IRON_HORSE_ARMOR', 1, 1, 4]]);
  addLoot('jungle', [['TRIM_LEAF', 1, 1, 4], ['IRON_HORSE_ARMOR', 1, 1, 3], ['GOLDEN_HORSE_ARMOR', 1, 1, 3], ['DIAMOND_HORSE_ARMOR', 1, 1, 1]]);
  addLoot('stronghold', [['IRON_HORSE_ARMOR', 1, 1, 3], ['GOLDEN_HORSE_ARMOR', 1, 1, 2], ['DIAMOND_HORSE_ARMOR', 1, 1, 1]]);
  addLoot('fortress', [['GOLDEN_HORSE_ARMOR', 1, 1, 4], ['IRON_HORSE_ARMOR', 1, 1, 3], ['DIAMOND_HORSE_ARMOR', 1, 1, 2]]);
  addLoot('ancient_city', [['DISC_FRAGMENT', 1, 3, 8], ['DIAMOND_HORSE_ARMOR', 1, 1, 2]]);

  // ---------------- 鍛冶台：鍛冶型 ＋ 材料 ＋ 素材 ----------------
  function smith3(tp, base, add) {
    if (!tp || !base || !add) return null;
    var t = ITEMS[tp.key] && ITEMS[tp.key].template;
    if (t === 'UPGRADE') return WG.smithResult(base, add);
    if (t && TRIMS[t] && ITEMS[base.key] && ITEMS[base.key].armor != null && TRIM_MATS[add.key]) {
      var out = JSON.parse(JSON.stringify(base)); out.n = 1; out.trim = { p: t, m: add.key };
      return out;
    }
    return null;
  }
  WG.smith3 = smith3;
  WG.TRIM_RGB = function (s) { return s && s.trim && TRIM_MATS[s.trim.m] ? hex(TRIM_MATS[s.trim.m][1]) : null; };
  var renderExtraScreen = Game.prototype.renderExtraScreen;
  Game.prototype.renderExtraScreen = function (sc) {
    if (sc !== 'smith') return renderExtraScreen.apply(this, arguments);
    var ws = this.workSlots || (this.workSlots = [null, null, null]), res = smith3(ws[2], ws[0], ws[1]), sl = function (i, s, ex) { return WG.slotHTMLFull('wk', i, s, ex); };
    this.workRes = res;
    var html = '<div class="craft">' + sl(2, ws[2]) + '<span class="plus">＋</span>' + sl(0, ws[0]) + '<span class="plus">＋</span>' + sl(1, ws[1]) + '<div class="arrow"></div>' +
      WG.slotHTMLFull('wkres', 0, res && Object.assign({}, res), ' result') + '</div>';
    return html + '<div class="note">左から：鍛冶型・道具か防具・素材（ネザライト強化はネザライトインゴット、防具の飾りは鉄・金・銅・宝石など）</div>';
  };
  var clickExtra = Game.prototype.clickExtra;
  Game.prototype.clickExtra = function (c, i) {
    if (c === 'wkres' && this.screen === 'smith') {
      var ws = this.workSlots, r = this.workRes;
      if (!r || this.cursor) return true;
      this.cursor = r;
      ws[0] = null; [1, 2].forEach(function (j) { if (ws[j] && --ws[j].n <= 0) ws[j] = null; });
      if (WG.Sound) WG.Sound.play('place', null, null, null, 'metal');
      return true;
    }
    return clickExtra.apply(this, arguments);
  };
  var stackInfo = WG.stackInfo;
  WG.stackInfo = function (s) {
    var t = stackInfo ? stackInfo(s) : '';
    if (s.trim) t += '（' + TRIMS[s.trim.p] + 'の飾り・' + (TRIM_MATS[s.trim.m] ? TRIM_MATS[s.trim.m][0] : '') + '）';
    if (s.lode) t += '（ロードストーン ' + s.lode.x + ', ' + s.lode.y + ', ' + s.lode.z + ' を指す）';
    if (s.fwLoad) t += '（花火を装填）';
    return t;
  };

  // ---------------- 右クリック ----------------
  function anchorN(id) { var m = /^RESPAWN_ANCHOR_(\d)$/.exec(keyOf(id)); return m ? +m[1] : -1; }
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), wd = this.world, surv = this.mode === 'survival', self = this;
    var mt = this.mobs.target && this.mobs.target.mob, shift = w.keys && (w.keys.ShiftLeft || w.keys.ShiftRight);
    var done = function () { self.mouseR = self.clickR = false; };
    if (this.spectator) return use.apply(this, arguments);
    if (mt && !mt.dead) {
      // 乗り物の中身を開く・かまど付きトロッコに燃料
      if (mt.type === 'MINECART' && (mt.variant === 'CHEST' || mt.variant === 'HOPPER') || (mt.type === 'BOAT' && mt.variant === 'CHEST' && (shift || this.riding === mt))) {
        done(); mt.inv = mt.inv || new Array(mt.variant === 'HOPPER' ? 5 : 27).fill(null);
        this.boxKey = 'mob'; this.boxMob = mt; this.boxTitle = mt.variant === 'HOPPER' ? 'ホッパー付きトロッコ' : mt.type === 'BOAT' ? 'チェスト付きボート' : 'チェスト付きトロッコ';
        this.openInventory('box'); if (WG.Sound) WG.Sound.play('door', mt.x, mt.y, mt.z); return;
      }
      if (mt.type === 'MINECART' && mt.variant === 'FURNACE') {
        if (held && (held.key === 'COAL' || held.key === 'CHARCOAL')) { mt.fuel = (mt.fuel || 0) + 3600; if (surv) this.inv.take(this.inv.sel, 1); mt.push = [-Math.sin(w.yaw), -Math.cos(w.yaw)]; }
        done(); return;
      }
      if (mt.type === 'MINECART' && mt.variant === 'TNT') { done(); return; }
      // 馬鎧
      if ((mt.type === 'HORSE') && !mt.baby) {
        if (held && ITEMS[held.key].horseArmor && mt.tame && !mt.harmor) { mt.harmor = held.key; if (surv) this.inv.take(this.inv.sel, 1); if (WG.Sound) WG.Sound.play('place', mt.x, mt.y, mt.z, 'metal'); done(); return; }
        if (!held && shift && mt.harmor) { this.spawnItem(mt.harmor, 1, mt.x, mt.y + 1, mt.z, 0.1, 10); mt.harmor = null; done(); return; }
      }
      return use.apply(this, arguments);
    }
    if (!t) return use.apply(this, arguments);
    var id = t.id, an = anchorN(id);
    // リスポーンアンカー：グロウストーンで充電、ネザーでは復活の場所に、ほかの所では爆発する
    if (an >= 0) {
      done();
      if (held && held.key === 'GLOWSTONE' && an < 4) { wd.setBlock(t.x, t.y, t.z, B['RESPAWN_ANCHOR_' + (an + 1)]); if (surv) this.inv.take(this.inv.sel, 1); w.remesh(t.x, t.z); this.puff(t.x + 0.5, t.y + 1.1, t.z + 0.5, [190, 110, 255], 10, 0.4); if (WG.Sound) WG.Sound.play('portal', t.x + 0.5, t.y + 0.5, t.z + 0.5); return; }
      if (an === 0) return;
      if (wd.dimKey !== 'nether') { wd.setBlock(t.x, t.y, t.z, B.AIR); w.remesh(t.x, t.z); this.explode(t.x + 0.5, t.y + 0.5, t.z + 0.5, 5); return; }
      this.player.bed = { x: t.x, y: t.y, z: t.z, dim: wd.dimKey, anchor: true };
      if (this.ui.toast) this.ui.toast('リスポーン地点を設定しました');
      return;
    }
    // ロードストーンにコンパスを使うと、そこを指すようになる
    if (id === B.LODESTONE && held && held.key === 'COMPASS') {
      done();
      var lode = { x: t.x, y: t.y, z: t.z, dim: wd.dimKey };
      if (held.n > 1) { held.n--; if (!this.inv.add('COMPASS', 1, 0, null, { lode: lode })) this.spawnItem('COMPASS', 1, t.x + 0.5, t.y + 1.2, t.z + 0.5, 0.1, 10, 0, null, { lode: lode }); }
      else held.lode = lode;
      this.inv.changed(); this.puff(t.x + 0.5, t.y + 1.1, t.z + 0.5, [200, 200, 220], 8, 0.4); if (WG.Sound) WG.Sound.play('place', t.x, t.y, t.z, 'metal');
      return;
    }
    // つながったチェスト：開くときに紫の粒が吸い込まれる
    if (id === B.LINKED_CHEST) for (var n = 0; n < 14; n++) { var a = Math.random() * 6.28; this.particles.push({ x: t.x + 0.5 + Math.cos(a) * 1.1, y: t.y + 0.4 + Math.random(), z: t.z + 0.5 + Math.sin(a) * 1.1, vx: -Math.cos(a) * 0.05, vy: 0.01, vz: -Math.sin(a) * 0.05, life: 20, c: [170, 90, 230], glow: true }); }
    // 試練の金庫：まれに重い核
    var vault = id === B.VAULT && held && held.key === 'TRIAL_KEY', vk = t.x + ',' + t.y + ',' + t.z, before = vault && wd.vaultUsed && wd.vaultUsed.has(vk);
    var r = use.apply(this, arguments);
    if (vault && !before && wd.vaultUsed && wd.vaultUsed.has(vk) && Math.random() < 0.1) this.spawnItem('HEAVY_CORE', 1, t.x + 0.5, t.y + 1.2, t.z + 0.5, 0.1, 10);
    return r;
  };
  // 入れ物の画面：乗り物の中身
  var boxSlots = Game.prototype.boxSlots;
  Game.prototype.boxSlots = function () { if (this.boxKey === 'mob' && this.boxMob) return this.boxMob.inv; return boxSlots.apply(this, arguments); };

  // 乗り物を置く：種類を付ける（レールの上だけのトロッコも）
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var held = this.inv.held(), it = held && ITEMS[held.key], t = this.walker.target;
    if (it && it.vehicle && it.variant) {
      if (it.vehicle === 'MINECART' && !(t && WG.railInfo(t.id))) return;
      var n0 = this.mobs.list.length, r = place.apply(this, arguments), m = this.mobs.list[this.mobs.list.length - 1];
      if (this.mobs.list.length > n0 && m && m.type === it.vehicle) { m.variant = it.variant; if (it.variant === 'CHEST' || it.variant === 'HOPPER') m.inv = new Array(it.variant === 'HOPPER' ? 5 : 27).fill(null); }
      return r;
    }
    return place.apply(this, arguments);
  };
  // 中身のある乗り物・ホッパーやかまどの付いたトロッコは乗れない
  var mount = Game.prototype.mount;
  Game.prototype.mount = function (m) { if (m.type === 'MINECART' && m.variant) return; return mount.apply(this, arguments); };

  // ---------------- 復活：リスポーンアンカー ----------------
  var respawn = Game.prototype.respawn;
  Game.prototype.respawn = function () {
    var bed = this.player.bed;
    if (!bed || !bed.anchor) return respawn.apply(this, arguments);
    var wd = this.world, n = anchorN(wd.block(bed.x, bed.y, bed.z)), ok = bed.dim === wd.dimKey && n > 0, at = ok && this.standNear(bed.x, bed.y, bed.z);
    this.player.bed = null;
    var r = respawn.apply(this, arguments), w = this.walker;
    if (at) { this.player.bed = bed; w.pos = at; w.prev = at.slice(); wd.setBlock(bed.x, bed.y, bed.z, B['RESPAWN_ANCHOR_' + (n - 1)]); if (w.remesh) w.remesh(bed.x, bed.z); }
    else if (this.ui.toast) this.ui.toast('リスポーンアンカーの充電がないか、ふさがれています');
    return r;
  };

  // ---------------- コンパス：ロードストーンを指す ----------------
  var updateHeldView = Game.prototype.updateHeldView;
  Game.prototype.updateHeldView = function () {
    var held = this.inv.held(), wd = this.world;
    if (!(held && held.key === 'COMPASS' && held.lode)) return updateHeldView.apply(this, arguments);
    var L = held.lode, here = L.dim === wd.dimKey && wd.block(L.x, L.y, L.z) === B.LODESTONE, sp = wd.spawn, dk = wd.dimKey;
    // 指す先を一時的にロードストーンに（なくなったら、くるくる回る）
    wd.spawn = [L.x + 0.5, L.y, L.z + 0.5]; wd.dimKey = here ? 'overworld' : 'lost';
    try { return updateHeldView.apply(this, arguments); } finally { wd.spawn = sp; wd.dimKey = dk; }
  };

  // ---------------- 戦う：メイス ----------------
  var attack = Game.prototype.attack;
  Game.prototype.attack = function (m) {
    var w = this.walker, held = this.inv.held(), fall = w.fallDist || 0;
    if (!(held && held.key === 'MACE' && fall >= 1.5 && !w.flying)) return attack.apply(this, arguments);
    this.maceBonus = fall <= 3 ? 4 * fall : fall <= 8 ? 12 + 2 * (fall - 3) : 22 + (fall - 8);
    var r = attack.apply(this, arguments), self = this;
    this.maceBonus = 0; w.fallDist = 0; w.vel[1] = Math.max(w.vel[1], 0.12);
    // 叩きつけ：まわりの生き物を吹き飛ばす
    this.mobs.list.forEach(function (o) {
      if (o === m || o.dead || TYPES[o.type].vehicle) return;
      var dx = o.x - m.x, dz = o.z - m.z, d = Math.hypot(dx, dz);
      if (d < 3.5 && Math.abs(o.y - m.y) < 2) { o.vx += dx / (d || 1) * 0.6 * (1 - d / 3.5); o.vz += dz / (d || 1) * 0.6 * (1 - d / 3.5); o.vy = 0.35; }
    });
    for (var i = 0; i < 28; i++) { var a = i / 28 * Math.PI * 2; self.particles.push({ x: m.x + Math.cos(a) * 0.6, y: m.y + 0.1, z: m.z + Math.sin(a) * 0.6, vx: Math.cos(a) * 0.22, vy: 0.04, vz: Math.sin(a) * 0.22, life: 16, c: [150, 140, 128] }); }
    if (WG.Sound) WG.Sound.play('explode', m.x, m.y, m.z);
    if (this.ui.shake) this.ui.shake(6);
    return r;
  };
  var attackBonus = Game.prototype.attackBonus;
  Game.prototype.attackBonus = function (dmg) { return attackBonus.apply(this, arguments) + (this.maceBonus || 0); };

  // ---------------- クロスボウ：左手の花火を装填して撃つ ----------------
  var tickCrossbow = Game.prototype.tickCrossbow;
  Game.prototype.tickCrossbow = function (held) {
    var w = this.walker, off = WG.offhandOf ? WG.offhandOf(this) : null, surv = this.mode === 'survival';
    if (held.loaded && held.fwLoad) {
      if (!this.mouseR || this.invOpen) { this.cbWait = false; return; }
      if (this.cbWait || !w.eye) return;
      var d = w.dir;
      (this.cbRockets || (this.cbRockets = [])).push({ x: w.eye[0] + d[0] * 0.5, y: w.eye[1] - 0.1 + d[1] * 0.5, z: w.eye[2] + d[2] * 0.5, px: w.eye[0], py: w.eye[1], pz: w.eye[2], v: [d[0] * 1.1, d[1] * 1.1, d[2] * 1.1], life: 0, fw: held.fwLoad.fw || null, burst: held.fwLoad.burst });
      held.loaded = false; delete held.fwLoad; this.cbWait = true; this.inv.changed();
      if (surv && this.wearTool) this.wearTool(3);
      if (WG.Sound) WG.Sound.play('firework', w.pos[0], w.pos[1], w.pos[2]);
      return;
    }
    var rocket = off && ITEMS[off.key] && ITEMS[off.key].rocket;
    if (!held.loaded && rocket && this.mouseR && !this.invOpen && !this.cbWait) {
      this.cbT = (this.cbT || 0) + 1; w.using = true;
      if (this.cbT >= 25) {
        held.loaded = true; held.fwLoad = { fw: off.fw || null, burst: !!ITEMS[off.key].burst }; this.cbT = 0; w.using = false; this.cbWait = true;
        if (surv) { off.n--; if (off.n <= 0) this.player.offhand = null; }
        this.inv.changed(); if (WG.Sound) WG.Sound.play('door');
      }
      return;
    }
    return tickCrossbow.apply(this, arguments);
  };
  function rocketBoom(g, r) {
    if (WG.Sound) WG.Sound.play('firework', r.x, r.y, r.z);
    var stars = r.fw && r.fw.stars || [];
    if (stars.length && WG.fireworkBurst) stars.forEach(function (st) { WG.fireworkBurst(g, r, st); });
    else for (var n = 0; n < 60; n++) { var th = Math.random() * 6.28, ph = Math.acos(2 * Math.random() - 1), sp = 0.22; g.particles.push({ x: r.x, y: r.y, z: r.z, vx: Math.sin(ph) * Math.cos(th) * sp, vy: Math.cos(ph) * sp, vz: Math.sin(ph) * Math.sin(th) * sp, life: 24, c: n % 2 ? [255, 200, 80] : [255, 110, 70], glow: true, fw: true }); }
    var dmg = 5 + 2 * stars.length;
    g.mobs.list.forEach(function (m) { if (!m.dead && !TYPES[m.type].vehicle && Math.hypot(m.x - r.x, m.y + 0.8 - r.y, m.z - r.z) < 3) g.mobs.hurt(m, dmg, [r.x, r.z, 0.5]); });
  }
  WG.crossbowRocketBoom = rocketBoom;

  // ---------------- 毎刻：花火・乗り物・まわりの粒 ----------------
  var tick = Game.prototype.tick;
  Game.prototype.tick = function () {
    var r = tick.apply(this, arguments), g = this, wd = this.world, w = this.walker, p = w.pos;
    if (this.cbRockets && this.cbRockets.length) {
      this.cbRockets = this.cbRockets.filter(function (k) {
        k.px = k.x; k.py = k.y; k.pz = k.z; k.life++;
        for (var s = 0; s < 3; s++) {
          k.x += k.v[0] / 3; k.y += k.v[1] / 3; k.z += k.v[2] / 3;
          var hitB = WG.COLLIDE[wd.block(Math.floor(k.x), Math.floor(k.y), Math.floor(k.z))] >= 1;
          var hitM = g.mobs.list.some(function (m) { var T = TYPES[m.type]; return !m.dead && !T.vehicle && Math.abs(m.x - k.x) < (T.w || 0.6) && Math.abs(m.z - k.z) < (T.w || 0.6) && k.y > m.y && k.y < m.y + (T.h || 1.8) * (T.scale || 1); });
          if (hitB || hitM || k.life > 50) { rocketBoom(g, k); return false; }
        }
        if (k.life % 1 === 0) g.particles.push({ x: k.x, y: k.y, z: k.z, vx: 0, vy: -0.01, vz: 0, life: 10, c: [255, 220, 150], glow: true, fw: true });
        return true;
      });
    }
    // まわりのつながったチェストとリスポーンアンカーから、ときどき粒
    if (p && (this.tickCount || 0) % 20 === 0) {
      var near = [], x0 = Math.floor(p[0]), y0 = Math.floor(p[1]), z0 = Math.floor(p[2]);
      for (var dy = -3; dy <= 3; dy++) for (var dz = -6; dz <= 6; dz++) for (var dx = -6; dx <= 6; dx++) {
        var id = wd.block(x0 + dx, y0 + dy, z0 + dz);
        if (id === B.LINKED_CHEST || anchorN(id) > 0) near.push([x0 + dx, y0 + dy, z0 + dz, id]);
      }
      this.glowBlocks = near;
    }
    if (this.glowBlocks && (this.tickCount || 0) % 3 === 0) this.glowBlocks.forEach(function (q) {
      if (Math.random() < 0.5) return;
      var anc = q[3] !== B.LINKED_CHEST, a = Math.random() * 6.28;
      g.particles.push(anc ? { x: q[0] + 0.2 + Math.random() * 0.6, y: q[1] + 1.02, z: q[2] + 0.2 + Math.random() * 0.6, vx: 0, vy: 0.03, vz: 0, life: 22, c: [180, 100, 255], glow: true }
        : { x: q[0] + 0.5 + Math.cos(a) * 0.7, y: q[1] + Math.random(), z: q[2] + 0.5 + Math.sin(a) * 0.7, vx: -Math.cos(a) * 0.02, vy: 0.01, vz: -Math.sin(a) * 0.02, life: 26, c: [150, 80, 210], glow: true });
    });
    return r;
  };
  var drawExtra = Game.prototype.drawExtra;
  Game.prototype.drawExtra = function (solid, a, cube) {
    var r = drawExtra.apply(this, arguments);
    (this.cbRockets || []).forEach(function (k) {
      cube(solid, k.px + (k.x - k.px) * a, k.py + (k.y - k.py) * a, k.pz + (k.z - k.pz) * a, 0.13, 0, function () { return 0; }, function (fc) { return fc === 'top' ? [220, 60, 50] : [230, 210, 170]; }, [15, 15]);
    });
    return r;
  };

  // ---------------- 乗り物：トロッコとボートの種類 ----------------
  var special = Mobs.prototype.special;
  Mobs.prototype.special = function (m, T) {
    var g = this.game, self = this;
    if (m.type === 'MINECART' && m.variant && !m.dead) {
      // かまど付き：燃料があるあいだ、押された向きに進む
      if (m.variant === 'FURNACE' && m.fuel > 0) {
        m.fuel--;
        if (m.railing) { m.rv = Math.max(m.rv || 0, 0.16); if (m.push && m.rdir && m.rdir[0] * m.push[0] + m.rdir[1] * m.push[1] < 0 && m.rv < 0.17) { m.rdir = [-m.rdir[0], -m.rdir[1]]; } m.push = null; }
        if (m.age % 3 === 0) g.particles.push({ x: m.x, y: m.y + 1.1, z: m.z, vx: 0, vy: 0.04, vz: 0, life: 26, c: [90, 90, 90] });
      }
      // ホッパー付き：近くに落ちているアイテムを拾う
      if (m.variant === 'HOPPER' && m.age % 4 === 0) {
        m.inv = m.inv || new Array(5).fill(null);
        g.entities.forEach(function (e) {
          if (e.dead || e.delay > 0 || Math.abs(e.x - m.x) > 1 || Math.abs(e.z - m.z) > 1 || e.y < m.y - 0.5 || e.y > m.y + 1.5) return;
          for (var i = 0; i < 5 && e.n > 0; i++) {
            var s = m.inv[i], max = ITEMS[e.key] ? ITEMS[e.key].max : 64;
            if (!s) { m.inv[i] = { key: e.key, n: e.n }; if (e.dmg) m.inv[i].dmg = e.dmg; if (e.ench) m.inv[i].ench = e.ench; if (e.extra) Object.assign(m.inv[i], e.extra); e.n = 0; }
            else if (s.key === e.key && !e.extra && !s.ench && s.n < max) { var k = Math.min(max - s.n, e.n); s.n += k; e.n -= k; }
          }
          if (e.n <= 0) e.dead = true;
        });
        for (var q = g.entities.length - 1; q >= 0; q--) if (g.entities[q].dead) g.entities.splice(q, 1);
      }
      // TNT 付き：火が付いたら点滅して爆発
      if (m.variant === 'TNT' && m.fuse > 0 && --m.fuse === 0) { m.dead = 1; m.noDrop = true; g.explode(m.x, m.y + 0.5, m.z, 4); }
      if (m.variant === 'TNT' && m.fuse > 0 && m.age % 2 === 0) g.particles.push({ x: m.x, y: m.y + 1.2, z: m.z, vx: 0, vy: 0.05, vz: 0, life: 10, c: [200, 200, 200] });
      this.cartTick(m);
      return 'done';
    }
    void self;
    return special.apply(this, arguments);
  };
  var hurt = Mobs.prototype.hurt;
  Mobs.prototype.hurt = function (m, dmg) {
    if (m.type === 'MINECART' && m.variant === 'TNT') { if (!m.fuse) { m.fuse = 60; if (WG.Sound) WG.Sound.play('ignite', m.x, m.y, m.z); } return true; }
    if (m.harmor && ITEMS[m.harmor]) { var a = Array.prototype.slice.call(arguments); a[1] = dmg * (1 - ITEMS[m.harmor].horseArmor * 0.04); return hurt.apply(this, a); }
    return hurt.apply(this, arguments);
  };
  var die = Mobs.prototype.die;
  Mobs.prototype.die = function (m) {
    var g = this.game, T = TYPES[m.type], old = T.drops;
    if (m.noDrop) { T.drops = []; try { return die.apply(this, arguments); } finally { T.drops = old; } }
    if (m.inv) m.inv.forEach(function (s) { if (s) g.spawnItem(s.key, s.n, m.x, m.y + 0.5, m.z, 0.2, 10, s.dmg, s.ench, WG.itemExtra(s)); });
    if (m.harmor) g.spawnItem(m.harmor, 1, m.x, m.y + 0.5, m.z, 0.1, 10);
    if (m.type === 'MINECART' && m.variant) g.spawnItem(m.variant, 1, m.x, m.y + 0.5, m.z, 0.1, 10);
    if (m.type === 'BOAT' && m.variant === 'CHEST') g.spawnItem('CHEST', 1, m.x, m.y + 0.5, m.z, 0.1, 10);
    // 頭：プレイヤーに倒された敵がまれに落とす。竜は必ず
    var HEAD = { ZOMBIE: 'ZOMBIE_HEAD', SKELETON: 'SKELETON_SKULL', BOMBER: 'MOSS_HEAD' }[m.type];
    if (HEAD && m.byPlayer && Math.random() < 0.03) g.spawnItem(HEAD, 1, m.x, m.y + 0.5, m.z, 0.1, 10);
    if (m.type === 'END_DRAGON') g.spawnItem('DRAGON_HEAD', 1, m.x, m.y + 1, m.z, 0.1, 10);
    if (m.type === 'BOAT' && m.variant === 'RAFT') { T.drops = [['BAMBOO_RAFT', 1, 1]]; try { return die.apply(this, arguments); } finally { T.drops = old; } }
    return die.apply(this, arguments);
  };
  var gattack = Game.prototype.attack;
  Game.prototype.attack = function (m) { if (m) m.byPlayer = true; return gattack.apply(this, arguments); };

  // ---------------- 見た目：トロッコの中身・ボートの種類・馬鎧 ----------------
  var box = function (x, y, z, w, h, d, c, extra) { return Object.assign({ o: [x, y, z], s: [w, h, d], c: hex(c), sw: null }, extra || {}); };
  var is = function (t, v) { return function (m) { return m.variant === v; }; };   // （t は読みやすさのための印）
  MODELS.MINECART.push(
    box(-6.5, 2.5, -6.5, 13, 9, 13, '#9a6a32', { only: is('M', 'CHEST') }), box(-6.6, 8.5, -6.6, 13.2, 1, 13.2, '#5a3a1a', { only: is('M', 'CHEST') }), box(-1, 6, 6.5, 2, 3, 0.6, '#c8c8cc', { only: is('M', 'CHEST') }),
    box(-6.5, 8, -6.5, 13, 3, 13, '#4a4a50', { only: is('M', 'HOPPER') }), box(-4, 4, -4, 8, 4, 8, '#5a5a62', { only: is('M', 'HOPPER') }), box(-5.5, 10.9, -5.5, 11, 0.3, 11, '#26262a', { only: is('M', 'HOPPER') }),
    box(-6.5, 2.5, -6.5, 13, 13, 13, '#c83a2a', { only: is('M', 'TNT') }), box(-6.6, 7, -6.6, 13.2, 4, 13.2, '#e8e4dc', { only: is('M', 'TNT') }), box(-6.4, 15.5, -6.4, 12.8, 0.3, 12.8, '#a8a8a0', { only: is('M', 'TNT') }),
    box(-6.5, 2.5, -6.5, 13, 13, 13, '#7a7a7e', { only: is('M', 'FURNACE') }), box(-3, 5, 6.5, 6, 4, 0.5, '#2a2a2c', { only: function (m) { return m.variant === 'FURNACE' && !(m.fuel > 0); } }),
    box(-3, 5, 6.5, 6, 4, 0.5, '#ffb040', { only: function (m) { return m.variant === 'FURNACE' && m.fuel > 0; } }));
  // TNT 付きトロッコは火が付くと白く点滅
  MODELS.MINECART.push(box(-6.7, 2.3, -6.7, 13.4, 13.4, 13.4, '#ffffff', { only: function (m) { return m.variant === 'TNT' && m.fuse > 0 && m.fuse % 8 < 4; } }));
  var boatParts = MODELS.BOAT.slice();
  boatParts.forEach(function (pt) { var o = pt.only; pt.only = function (m) { return m.variant !== 'RAFT' && (!o || o(m)); }; });
  var RAFT = function (m) { return m.variant === 'RAFT'; };
  for (var rb = 0; rb < 7; rb++) MODELS.BOAT.push(box(-8 + rb * 2.3, 0, -12, 2.2, 3, 24, rb % 2 ? '#c8b050' : '#d8c060', { only: RAFT }));
  MODELS.BOAT.push(box(-8.5, 3, -9, 17, 1.2, 1.4, '#9a8838', { only: RAFT }), box(-8.5, 3, 7.6, 17, 1.2, 1.4, '#9a8838', { only: RAFT }),
    box(-5, 2, -9.5, 10, 8, 7, '#9a6a32', { only: function (m) { return m.variant === 'CHEST'; } }), box(-5.1, 7.5, -9.6, 10.2, 0.8, 7.2, '#5a3a1a', { only: function (m) { return m.variant === 'CHEST'; } }));
  // 馬鎧：体・首・頭に重ねる
  var HC = { LEATHER_HORSE_ARMOR: '#8c5634', IRON_HORSE_ARMOR: '#c8cace', GOLDEN_HORSE_ARMOR: '#e8c440', DIAMOND_HORSE_ARMOR: '#56d2c8' };
  Object.keys(HC).forEach(function (k) {
    var on = function (m) { return m.harmor === k; }, c = HC[k], dk = '#' + hex(c).map(function (v) { return ('0' + Math.floor(v * 0.72).toString(16)).slice(-2); }).join('');
    MODELS.HORSE.push(box(-5.5, 12.5, -9, 11, 9, 17, c, { only: on }), box(-5.6, 12.4, 2.5, 11.2, 9.2, 1, dk, { only: on }), box(-3.4, 18, 8.6, 6.8, 10, 6.8, c, { only: on }),
      box(-3.4, 28.1, 12.6, 6.8, 2.2, 9.6, c, { only: on }), box(-0.6, 29.6, 12.8, 1.2, 1.4, 9, dk, { only: on }));
  });
})(typeof window !== 'undefined' ? window : globalThis);
