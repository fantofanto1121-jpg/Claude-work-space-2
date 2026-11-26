// 自分の姿と左手（ロードマップ 第 13 段階）
// F5：一人称 → 後ろから → 前から。外から見るときは、自分の体（歩く・しゃがむ・泳ぐ／這う・滑空の姿勢、防具、持ち物）を描く
// 左手（オフハンド）：F で持ち替え。盾は左手でも構えられ、トーテムは左手でも効く。右手が空なら、左手のブロック（たいまつなど）を置く
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Game = WG.Game;
  var VIEW_NAMES = ['一人称', '後ろから', '前から'];
  function off(g) { var p = g.player || g; return p.offhand || null; }
  function setOff(g, v) { (g.player || g).offhand = v && v.n > 0 ? v : null; }
  WG.offhandOf = off;

  // ---------------- キー ----------------
  var key = Game.prototype.key;
  Game.prototype.key = function (e, down) {
    if (down && !e.repeat && !this.spectator && this.ui.locked && this.ui.locked() && !this.invOpen) {
      if (e.code === 'F5') {
        if (e.preventDefault) e.preventDefault();
        this.viewMode = ((this.viewMode || 0) + 1) % 3;
        if (this.ui.toast) this.ui.toast('視点：' + VIEW_NAMES[this.viewMode]);
        return true;
      }
      if (e.code === 'KeyF') { this.swapHands(); return true; }
    }
    return key.apply(this, arguments);
  };
  Game.prototype.swapHands = function () {
    var i = this.inv.sel, a = this.inv.slots[i], b = off(this);
    this.inv.slots[i] = b || null; setOff(this, a);
    this.inv.changed();
    if (WG.Sound) WG.Sound.play('pop');
  };
  // 左手のものを一時的に右手にして、f を呼ぶ
  function withOffhand(g, f) {
    var i = g.inv.sel, a = g.inv.slots[i], b = off(g);
    g.inv.slots[i] = b; setOff(g, a);
    try { return f(); } finally { var nb = g.inv.slots[i]; g.inv.slots[i] = off(g); setOff(g, nb); g.inv.changed(); }
  }
  WG.withOffhand = withOffhand;

  // ---------------- 左手の働き ----------------
  // 右手が空なら、左手のブロックを置く・左手のものを使う
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var self = this, args = arguments, o = off(this);
    if (!this.inv.held() && o && ITEMS[o.key] && !ITEMS[o.key].shield && !this.invOpen) return withOffhand(this, function () { return place.apply(self, args); });
    return place.apply(this, arguments);
  };
  // 盾：左手にあれば、右手が盾以外でも、右クリックを押し続けると構える
  var tick = Game.prototype.tick;
  Game.prototype.tick = function () {
    var r = tick.apply(this, arguments), o = off(this), held = this.inv.held(), w = this.walker;
    if (o && ITEMS[o.key] && ITEMS[o.key].shield && !(held && ITEMS[held.key] && ITEMS[held.key].shield) && this.mouseR && !this.invOpen) {
      this.offBlock = (this.offBlock || 0) + 1; this.blocking = this.offBlock; w.using = true; this.blockingOff = true;
    } else if (this.offBlock) { this.offBlock = 0; this.blockingOff = false; if (!(held && ITEMS[held.key] && ITEMS[held.key].shield)) { this.blocking = 0; w.using = false; } }
    // 外から見る体の動き（歩いた距離で手足を振る）
    var p = w.pos, lp = this._svLast || p;
    var sp = Math.hypot(p[0] - lp[0], p[2] - lp[2]);
    this._svLast = p.slice();
    this._svSpeed = (this._svSpeed || 0) * 0.6 + Math.min(0.4, sp) * 0.4;
    this._svPhase = (this._svPhase || 0) + Math.min(0.4, sp) * 2.4;
    this._svBodyYaw = this._svBodyYaw == null ? w.yaw : this._svBodyYaw + angleDiff(this._svBodyYaw, w.yaw) * (sp > 0.02 ? 0.5 : 0.15);
    return r;
  };
  var modifyDamage = Game.prototype.modifyDamage;
  Game.prototype.modifyDamage = function () {
    var self = this, args = arguments;
    if (this.blockingOff && off(this)) return withOffhand(this, function () { return modifyDamage.apply(self, args); });   // 傷むのは左手の盾
    return modifyDamage.apply(this, arguments);
  };
  // 不死のトーテム：左手にあっても効く
  var die = Game.prototype.die;
  Game.prototype.die = function () {
    var self = this, o = off(this), held = this.inv.held();
    if (this.mode === 'survival' && o && o.key === 'TOTEM_OF_UNDYING' && !(held && held.key === 'TOTEM_OF_UNDYING')) return withOffhand(this, function () { return die.apply(self); });
    return die.apply(this, arguments);
  };

  // ---------------- インベントリの枠とホットバーの横の枠 ----------------
  var getExtraSlot = Game.prototype.getExtraSlot;
  Game.prototype.getExtraSlot = function (c, i) { if (c === 'off') return off(this); return getExtraSlot.apply(this, arguments); };
  var setExtraSlot = Game.prototype.setExtraSlot;
  Game.prototype.setExtraSlot = function (c, i, v) { if (c === 'off') { setOff(this, v); return true; } return setExtraSlot.apply(this, arguments); };
  var renderInventory = Game.prototype.renderInventory;
  Game.prototype.renderInventory = function () {
    renderInventory.apply(this, arguments);
    if (typeof document === 'undefined') return;
    var arms = document.querySelectorAll('.slot[data-c="arm"]');
    if (!arms.length || document.querySelector('.slot[data-c="off"]')) return;
    var last = arms[arms.length - 1], tmp = document.createElement('div');
    tmp.innerHTML = WG.slotHTMLFull('off', 0, off(this), ' arm offslot');
    last.parentNode.insertBefore(tmp.firstChild, last.nextSibling);
  };
  var updateHud = Game.prototype.updateHud;
  Game.prototype.updateHud = function () {
    var r = updateHud.apply(this, arguments);
    if (typeof document === 'undefined' || !this.ui.hotbar) return r;
    var o = off(this), el = document.getElementById('offhandHud'), sig = o ? o.key + ':' + o.n + ':' + (o.dmg || 0) : '';
    if (!o) { if (el) el.style.display = 'none'; return r; }
    if (!el) { el = document.createElement('div'); el.id = 'offhandHud'; el.className = 'slot'; document.body.appendChild(el); }
    var hb = this.ui.hotbar.getBoundingClientRect();
    el.style.display = this.ui.hotbar.offsetParent ? '' : 'none';
    el.style.left = Math.round(hb.left - 56) + 'px'; el.style.top = Math.round(hb.top + (hb.height - 44) / 2) + 'px';
    if (el.dataset.sig !== sig) { el.dataset.sig = sig; el.innerHTML = WG.slotHTMLFull('offh', 0, o, '').replace(/^<div[^>]*>|<\/div>$/g, ''); }
    return r;
  };

  // ---------------- 視点：後ろから・前から ----------------
  function angleDiff(a, b) { var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
  if (WG.View3D) {
    var render = WG.View3D.prototype.render;
    WG.View3D.prototype.render = function () {
      var g = WG.curGame, fp = this.fp;
      if (!g || !g.viewMode || !fp || g.spectator) return render.apply(this, arguments);
      var front = g.viewMode === 2, yaw = fp.yaw + (front ? Math.PI : 0), pitch = front ? -fp.pitch : fp.pitch, cp = Math.cos(pitch);
      var dir = [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp], e = fp.eye, wd = g.world, dist = 4;
      // 壁にめり込まないよう、少しずつ下がって、ぶつかる手前で止める
      for (var t = 0.2; t <= 4; t += 0.1) {
        var x = e[0] - dir[0] * t, y = e[1] - dir[1] * t, z = e[2] - dir[2] * t;
        if (WG.COLLIDE[wd.block(Math.floor(x), Math.floor(y), Math.floor(z))] >= 1) { dist = Math.max(0.3, t - 0.3); break; }
      }
      this.fp = Object.assign({}, fp, { eye: [e[0] - dir[0] * dist, e[1] - dir[1] * dist, e[2] - dir[2] * dist], yaw: yaw, pitch: pitch });
      try { return render.apply(this, arguments); } finally { this.fp = fp; }
    };
  }

  // ---------------- 自分の体を描く ----------------
  var SKIN = [214, 166, 128], HAIR = [70, 46, 30], SHIRT = [62, 128, 140], PANTS = [58, 62, 120], SHOE = [64, 60, 58], EYE_W = [240, 240, 240], EYE_B = [52, 70, 140];
  var ARMOR_RGB = { LEATHER: [140, 86, 52], CHAINMAIL: [150, 152, 156], IRON: [200, 202, 206], GOLDEN: [232, 196, 64], DIAMOND: [86, 210, 200], NETHERITE: [70, 64, 70], TURTLE: [90, 160, 70] };
  function armorColor(s) { if (!s) return null; var m = /^([A-Z]+)_/.exec(s.key); return m && ARMOR_RGB[m[1]] || [180, 180, 186]; }
  function box(bt, o, s, tf, c, lt, mat, ofs) {
    bt.L = lt;
    if (mat && WG.mobTexturedBox && WG.mobTexturedBox(bt, o, s, tf, c, { mat: mat, ofs: ofs || 0 }) !== false) return;
    WG.modelBox(bt, o, s, tf, c, lt);
  }
  var drawExtra = Game.prototype.drawExtra;
  Game.prototype.drawExtra = function (solid, a, cube) {
    drawExtra.apply(this, arguments);
    if (!this.viewMode || this.spectator || this.dead) return;
    var w = this.walker, P = w.prev || w.pos, x = P[0] + (w.pos[0] - P[0]) * a, y = P[1] + (w.pos[1] - P[1]) * a, z = P[2] + (w.pos[2] - P[2]) * a;
    var lt = w.lightLevels(x, y + 1, z), yaw = this._svBodyYaw == null ? w.yaw : this._svBodyYaw, headYaw = angleDiff(yaw, w.yaw), pitch = w.pitch;
    var lying = w.swimming || w.crawl || this.gliding, sneak = w.sneak && !lying && !w.flying, S = 1.8 / 32;
    var swing = Math.sin(this._svPhase || 0) * Math.min(0.9, (this._svSpeed || 0) * 7), idle = Math.sin((this.tickCount || 0) * 0.08) * 0.04;
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    // 全体の姿勢：寝そべる（泳ぐ・這う・滑空）は腰を中心に前へ倒す、しゃがむは上体を前へ
    var bodyPitch = lying ? -Math.PI / 2 + (this.gliding ? 0.1 : 0) : 0, lean = sneak ? 0.45 : 0, drop = sneak ? 3 : 0, lift = lying ? 6 : 0;
    var place = function (lx, ly, lz) {
      // 寝そべり：腰（y=12）を中心に、前（-z）へ倒す
      if (bodyPitch) { var yy = ly - 12, zz = lz; ly = 12 + yy * Math.cos(bodyPitch) - zz * Math.sin(bodyPitch); lz = yy * Math.sin(bodyPitch) + zz * Math.cos(bodyPitch); ly -= 12 - lift; }
      ly -= drop;
      var wx = lx * S, wy = ly * S, wz = lz * S;
      return [x + wx * cy + wz * sy, y + wy, z - wx * sy + wz * cy];
    };
    // 部品ごとの回転（rx：左右の軸、ふりの角度）を、支点のまわりに
    var part = function (pivot, rx, extra) {
      return function (lx, ly, lz) {
        var yy = ly - pivot[1], zz = lz - pivot[2];
        if (rx) { var ny = yy * Math.cos(rx) - zz * Math.sin(rx), nz = yy * Math.sin(rx) + zz * Math.cos(rx); yy = ny; zz = nz; }
        if (extra) { var r2 = extra(lx - pivot[0], yy, zz); lx = r2[0] + pivot[0]; yy = r2[1]; zz = r2[2]; }
        return place(lx, yy + pivot[1], zz + pivot[2]);
      };
    };
    // 上体：しゃがむと前へ倒れる
    var torso = function (lx, ly, lz) {
      if (lean) { var yy = ly - 12, zz = lz; ly = 12 + yy * Math.cos(lean) - zz * Math.sin(-lean); lz = yy * Math.sin(-lean) + zz * Math.cos(lean); }
      return place(lx, ly, lz);
    };
    var torsoPart = function (pivot, rx, yawH, pitchH) {
      return function (lx, ly, lz) {
        var xx = lx - pivot[0], yy = ly - pivot[1], zz = lz - pivot[2];
        if (yawH) { var nx = xx * Math.cos(yawH) + zz * Math.sin(yawH), nz2 = -xx * Math.sin(yawH) + zz * Math.cos(yawH); xx = nx; zz = nz2; }
        if (pitchH) { var ny2 = yy * Math.cos(pitchH) + zz * Math.sin(pitchH), nz3 = -yy * Math.sin(pitchH) + zz * Math.cos(pitchH); yy = ny2; zz = nz3; }
        if (rx) { var ny = yy * Math.cos(rx) - zz * Math.sin(rx), nz = yy * Math.sin(rx) + zz * Math.cos(rx); yy = ny; zz = nz; }
        return torso(xx + pivot[0], yy + pivot[1], zz + pivot[2]);
      };
    };
    var arm = this.armor || [], elytra = arm[1] && arm[1].key === 'ELYTRA', helm = armorColor(arm[0]), chest = elytra ? null : armorColor(arm[1]), legs = armorColor(arm[2]), boots = armorColor(arm[3]);
    var legSw = lying ? Math.sin(this._svPhase || 0) * 0.4 : swing, armSw = lying ? (this.gliding ? 0 : Math.sin((this._svPhase || 0) * 0.7) * 0.9) : -swing * 0.8;
    // 脚
    [[-4, legSw], [0, -legSw]].forEach(function (q) {
      var tf = part([q[0] + 2, 12, 0], q[1]);
      box(solid, [q[0], 0, -2], [4, 12, 4], tf, legs || PANTS, lt, legs ? 'METAL' : 'CLOTH', q[0] + 9);
      box(solid, [q[0] - 0.1, -0.05, -2.1], [4.2, 3, 4.2], tf, boots || SHOE, lt, boots ? 'METAL' : 'LEATHER', 3);
    });
    // 胴
    box(solid, [-4, 12, -2], [8, 12, 4], torso, chest || SHIRT, lt, chest ? 'METAL' : 'CLOTH', 5);
    // 腕（右は持ち物を持つ。盾を構えると左腕を前へ）
    var blockingL = this.blocking >= 5 && this.blockingOff, blockingR = this.blocking >= 5 && !this.blockingOff, using = w.using && !blockingL && !blockingR;
    var rArm = blockingR ? -1.1 : using ? -1.3 : armSw + idle, lArm = blockingL ? -1.1 : -armSw - idle;
    var rTf = torsoPart([-6, 22, 0], rArm), lTf = torsoPart([6, 22, 0], lArm);
    box(solid, [-8, 12, -2], [4, 12, 4], rTf, chest || SHIRT, lt, chest ? 'METAL' : 'CLOTH', 7);
    box(solid, [-8, 12, -2.05], [4, 3, 4.1], rTf, SKIN, lt, 'SKIN', 2);
    box(solid, [4, 12, -2], [4, 12, 4], lTf, chest || SHIRT, lt, chest ? 'METAL' : 'CLOTH', 8);
    box(solid, [4, 12, -2.05], [4, 3, 4.1], lTf, SKIN, lt, 'SKIN', 4);
    // エリトラ：背中の 2 枚の翼（滑空中は広げる）
    if (elytra) {
      var spread = this.gliding ? 0.9 : 0.15;
      [-1, 1].forEach(function (sd) {
        var wtf = torsoPart([sd * 1, 23, 2], 0, 0, 0), roll = function (lx, ly, lz) { var dx = lx - sd, dz = lz - 2, a2 = sd * spread; return wtf(sd + dx * Math.cos(a2) - dz * Math.sin(a2), ly, 2 + dx * Math.sin(a2) + dz * Math.cos(a2)); };
        box(solid, [sd > 0 ? 1 : -11, 4, 2.2], [10, 20, 1], roll, [120, 118, 140], lt, 'FEATHER', sd > 0 ? 3 : 5);
      });
    }
    // 頭（見ている向きへ回る）
    var hTf = torsoPart([0, 24, 0], 0, Math.max(-1, Math.min(1, headYaw)), lying ? Math.max(-0.6, Math.min(0.9, pitch + 1.2)) : -pitch);
    box(solid, [-4, 24, -4], [8, 8, 8], hTf, SKIN, lt, 'SKIN', 1);
    box(solid, [-4.1, 29, -4.1], [8.2, 3.2, 8.2], hTf, HAIR, lt, 'FUR', 6);
    box(solid, [-4.1, 25, 1], [8.2, 4.2, 3.2], hTf, HAIR, lt, 'FUR', 2);
    box(solid, [-3, 27, -4.2], [2, 1, 0.3], hTf, EYE_W, lt); box(solid, [-2, 27, -4.25], [1, 1, 0.3], hTf, EYE_B, lt);
    box(solid, [1, 27, -4.2], [2, 1, 0.3], hTf, EYE_W, lt); box(solid, [1, 27, -4.25], [1, 1, 0.3], hTf, EYE_B, lt);
    box(solid, [-1.5, 25, -4.2], [3, 0.6, 0.3], hTf, [150, 96, 80], lt);
    if (helm) box(solid, [-4.6, 27.5, -4.6], [9.2, 5, 9.2], hTf, helm, lt, 'METAL', 4);
    // 持ち物：右手・左手
    var self = this, drawHeld = function (s, tf, left) {
      if (!s) return;
      var it = ITEMS[s.key];
      if (!it) return;
      if (it.shield) { box(solid, [left ? 7 : -9, 10, -9], [1.5, 12, 10], tf, [120, 84, 48], lt, 'WOOD', 3); box(solid, [left ? 6.8 : -9.2, 15.5, -5], [1.9, 1.5, 2], tf, [150, 150, 156], lt); return; }
      var hx = left ? 6 : -6, P0 = tf(hx, 13, -1), up = tf(hx, 13 + 9, -1 - 6), side = tf(hx + 0.01, 13, -1 - 9);
      if (it.block >= 0 && !WG.itemIcon16(s.key) && WG.blockKind(it.block) === 'solid') {
        var c3 = tf(hx, 11, -4);
        cube(solid, c3[0], c3[1] - 0.12, c3[2], 0.26, yaw, function (fc) { return WG.atlasTile(it.block, fc); }, function () { return [255, 255, 255]; }, lt);
        return;
      }
      var tile = WG.itemTile(s.key);
      if (tile == null && it.block >= 0) tile = WG.atlasTile(it.block, 'side');
      if (tile == null) return;
      // 手から前上へ伸びる 1 枚の絵（両面）
      var sx = left ? 7 : -7, A = tf(hx, 10, -2), Bq = tf(hx, 20, -6), C = tf(hx + sx, 16, -13), D = tf(hx + sx, 6, -9);   // 斜めに持つ（前からも後ろからも見える）
      WG.quad3d(solid, [Bq, C, D, A], tile, [255, 255, 255], lt);
      WG.quad3d(solid, [C, Bq, A, D], tile, [255, 255, 255], lt);
      void P0; void up; void side; void self;
    };
    drawHeld(this.inv.held(), rTf, false);
    drawHeld(off(this), lTf, true);
  };
})(typeof window !== 'undefined' ? window : globalThis);
