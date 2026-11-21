// 武器・防具・道具（Minecraft の値に合わせたもの）。
// - クロスボウ：右クリックを押し続けて装填（1.25 秒、矢 1 本）し、もう一度右クリックで撃つ（ダメージ 9、速さ 3.15）。
// - トライデント：近くで叩くとダメージ 9。右クリックを 0.5 秒押して離すと投げる（ダメージ 8）。刺さった所に落ちるので拾う。
// - エリトラ：胴に付ける。落ちている間にスペースを押すと滑空する（下を向くと速く、上を向くと上がる）。
// - チェーン・ネザライトの防具と、ネザライトの道具（ネザライトは鍛冶台で作る。js/workblocks.js）。
// - 地図：使うと、その場所の 128×128 ブロックの地形を描いた地図になる。持っている間、画面の右下に出る（自分の位置と向きの印つき）。
// - コンパス：持つと、はじめに立った場所（世界の出発点）の向きを指す。ネザーとエンドでは回り続ける。
// - 時計：持つと、昼と夜の文字盤で時刻がわかる。
// - 望遠鏡：右クリックを押している間、遠くを大きく見る。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Mobs = WG.Mobs;

  function item(key, name, max, extra) {
    var it = { key: key, name: name, block: -1, max: max || 64, shape: 'lump', color: '#888888' };
    for (var k in extra || {}) it[k] = extra[k];
    ITEMS[key] = it;
    return it;
  }
  item('CROSSBOW', 'クロスボウ', 1, { crossbow: true, dur: 465 });
  item('TRIDENT', 'トライデント', 1, { trident: true, dur: 250, attack: 9 });
  item('ELYTRA', 'エリトラ', 1, { armor: 1, def: 0, tough: 0, dur: 432, elytra: true });
  item('MAP', '白紙の地図'); item('FILLED_MAP', '地図', 1, { filledMap: true });
  item('COMPASS', 'コンパス'); item('CLOCK', '時計'); item('SPYGLASS', '望遠鏡', 1);
  item('NETHERITE_SCRAP', 'ネザライトの欠片'); item('NETHERITE_INGOT', 'ネザライトインゴット');
  Craft.SHAPED.push(
    [['SIS', 'XFX', ' S '], { S: 'STICK', I: 'IRON_INGOT', X: 'STRING', F: 'FLINT' }, 'CROSSBOW', 1],
    [['PPP', 'PCP', 'PPP'], { P: 'PAPER', C: 'COMPASS' }, 'MAP', 1],
    [[' I ', 'IRI', ' I '], { I: 'IRON_INGOT', R: 'REDSTONE' }, 'COMPASS', 1],
    [[' G ', 'GRG', ' G '], { G: 'GOLD_INGOT', R: 'REDSTONE' }, 'CLOCK', 1],
    [[' A ', ' C ', ' C '], { A: 'GLASS', C: 'COPPER_INGOT' }, 'SPYGLASS', 1]
  );
  Craft.SHAPELESS.push([['NETHERITE_SCRAP', 'NETHERITE_SCRAP', 'NETHERITE_SCRAP', 'NETHERITE_SCRAP', 'GOLD_INGOT', 'GOLD_INGOT', 'GOLD_INGOT', 'GOLD_INGOT'], 'NETHERITE_INGOT', 1]);
  Craft.SMELT.ANCIENT_DEBRIS = 'NETHERITE_SCRAP';
  // ネザライトの物は燃えない（溶岩に落ちても消えない）
  WG.FIREPROOF_ITEM = function (key) { return /^NETHERITE|ANCIENT_DEBRIS/.test(key); };

  // ---------------- クロスボウとトライデント ----------------
  function arrowSlot(g) { for (var i = 0; i < 36; i++) if (g.inv.slots[i] && g.inv.slots[i].key === 'ARROW') return i; return -1; }
  var tickBow = Game.prototype.tickBow;
  Game.prototype.tickBow = function () {
    var held = this.inv.held(), it = held && ITEMS[held.key];
    if (it && it.crossbow) return this.tickCrossbow(held);
    if (it && it.trident) return this.tickTrident(held);
    this.cbT = this.trT = 0;
    return tickBow.call(this);
  };
  Game.prototype.tickCrossbow = function (held) {
    var w = this.walker, surv = this.mode === 'survival';
    if (!this.mouseR || this.invOpen) { this.cbWait = false; if (this.cbT) { this.cbT = 0; w.using = false; } return; }
    if (held.loaded) {
      if (this.cbWait || !w.eye) return;
      var a = this.mobs.shootFromPlayer(w.eye, w.dir, 3.15, 9, surv);
      a.punch = WG.enchLevel(held, 'PUNCH');
      held.loaded = false; this.cbWait = true; this.inv.changed();
      if (surv) this.wearTool(1);
      if (WG.Sound) WG.Sound.play('bow');
      return;
    }
    if (this.cbWait) return;
    var slot = arrowSlot(this);
    if (surv && slot < 0) return;
    this.cbT = (this.cbT || 0) + 1; w.using = true;
    if (this.cbT >= 25) {
      held.loaded = true; this.cbT = 0; w.using = false; this.cbWait = true;
      if (surv) this.inv.take(slot, 1);
      this.inv.changed();
      if (WG.Sound) WG.Sound.play('door');
    }
  };
  Game.prototype.tickTrident = function (held) {
    var w = this.walker, surv = this.mode === 'survival';
    if (this.mouseR && !this.invOpen) { this.trT = (this.trT || 0) + 1; w.using = true; return; }
    if (!this.trT) return;
    var t = this.trT; this.trT = 0; w.using = false;
    if (t < 10 || !w.eye) return;
    var a = this.mobs.shootFromPlayer(w.eye, w.dir, 2.5, 8, false);
    a.trident = { dmg: held.dmg || 0, ench: held.ench, drop: surv };
    if (surv) { this.inv.slots[this.inv.sel] = null; this.inv.changed(); }
    if (WG.Sound) WG.Sound.play('bow');
  };
  // 投げたトライデントは、刺さった所・当たった所にアイテムとして落ちる
  var tickArrows = Mobs.prototype.tickArrows;
  Mobs.prototype.tickArrows = function () {
    var tr = this.arrows.filter(function (a) { return a.trident; }), g = this.game;
    tickArrows.call(this);
    tr.forEach(function (a) {
      if (!a.dead && !a.stuck) return;
      if (a.trident.drop) g.spawnItem('TRIDENT', 1, a.x - a.vx * 0.1, a.y + 0.2, a.z - a.vz * 0.1, 0, 10, a.trident.dmg, a.trident.ench);
      a.trident = null; a.life = 1e9;
    });
  };

  // ---------------- エリトラ ----------------
  var rideTick = Game.prototype.rideTick;
  Game.prototype.rideTick = function (w, shift) {
    if (this.riding) return rideTick.call(this, w, shift);
    var chest = this.armor && this.armor[1], ok = chest && chest.key === 'ELYTRA' && (chest.dmg || 0) < ITEMS.ELYTRA.dur - 1;
    var space = !!w.keys.Space, edge = space && !this.spaceWas;
    this.spaceWas = space;
    if (!this.gliding) {
      if (ok && edge && !w.onGround && !w.flying && w.vel[1] < 0 && !w.fluid() && !this.spectator) { this.gliding = true; this.glideT = 0; }
      else return rideTick ? rideTick.call(this, w, shift) : false;
    }
    if (!ok || w.flying || w.fluid() || this.dead) { this.gliding = false; return false; }
    // Minecraft の滑空の式（見ている向きへ速さを移す）
    var v = w.vel, p = w.pitch, cp = Math.cos(p), lx = -Math.sin(w.yaw) * cp, ly = Math.sin(p), lz = -Math.cos(w.yaw) * cp;
    var hv = Math.hypot(v[0], v[2]), f1 = cp * cp;
    v[1] += -0.08 + f1 * 0.06;
    if (v[1] < 0 && cp > 0) { var d5 = v[1] * -0.1 * f1; v[1] += d5; v[0] += lx * d5 / cp; v[2] += lz * d5 / cp; }
    if (ly > 0 && cp > 0) { var d9 = hv * ly * 0.04; v[1] += d9 * 3.2; v[0] -= lx * d9 / cp; v[2] -= lz * d9 / cp; }
    if (cp > 0) { v[0] += (lx / cp * hv - v[0]) * 0.1; v[2] += (lz / cp * hv - v[2]) * 0.1; }
    v[0] *= 0.99; v[1] *= 0.98; v[2] *= 0.99;
    if (this.boost > 0) { this.boost--; v[0] += lx * 0.1 + (lx * 1.5 - v[0]) * 0.5 * 0.1; v[1] += ly * 0.1 + (ly * 1.5 - v[1]) * 0.5 * 0.1; v[2] += lz * 0.1 + (lz * 1.5 - v[2]) * 0.5 * 0.1; }
    var moved = w.move(v[0], v[1], v[2]);
    if (w.collidedH) { v[0] *= 0.3; v[2] *= 0.3; }
    w.walkDist += moved * 0.2; w.fallDist = 0;
    if (++this.glideT % 20 === 0 && this.mode === 'survival') chest.dmg = (chest.dmg || 0) + 1;
    if (w.onGround) { this.gliding = false; v[1] = 0; }
    return true;
  };

  // ---------------- 地図・コンパス・時計・望遠鏡 ----------------
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var held = this.inv.held();
    if (held && held.key === 'MAP' && !this.spectator) {
      var p = this.walker.pos, sz = 128, cx = Math.floor((p[0] + 64) / sz) * sz, cz = Math.floor((p[2] + 64) / sz) * sz;
      var map = { key: 'FILLED_MAP', n: 1, map: { x: cx, z: cz, dim: this.world.dimKey, scale: 0 } };
      if (this.mode === 'survival') this.inv.take(this.inv.sel, 1);
      if (this.inv.slots[this.inv.sel] === null) this.inv.slots[this.inv.sel] = map; else this.inv.add('FILLED_MAP', 1, 0) && this.inv.slots.some(function (s) { if (s && s.key === 'FILLED_MAP' && !s.map) { s.map = map.map; return true; } return false; });
      this.inv.changed();
      this.mouseR = this.clickR = false;
      return;
    }
    return use.apply(this, arguments);
  };
  // 地図の絵：中心と広さ（scale 0 は 128 ブロック、1 つ上がるごとに 2 倍）。真上から見た地形図を 128×128 に縮める
  var mapCache = {};
  WG.renderMap = function (world, mp) {
    var size = 128 << (mp.scale || 0), half = size / 2, c = document.createElement('canvas');
    c.width = c.height = 128;
    var x2 = c.getContext('2d'), img = x2.createImageData(128, 128), d = img.data, step = size / 128;
    var cx0 = (mp.x - half) >> 4, cz0 = (mp.z - half) >> 4, n = size >> 4, tile = new Uint8ClampedArray(256 * 4);
    for (var cz = 0; cz < n; cz++) for (var cx = 0; cx < n; cx++) {
      WG.Paint.topTile(world, cx0 + cx, cz0 + cz, world.dim.view.yMax, tile, 1);
      for (var j = 0; j < 16; j += step) for (var i = 0; i < 16; i += step) {
        var px = (cx * 16 + i) / step, pz = (cz * 16 + j) / step, o = (pz * 128 + px) * 4, q = (j * 16 + i) * 4;
        // 紙の地図らしく、色を少し褪せさせて段に揃える
        d[o] = Math.round((tile[q] * 0.78 + 52) / 12) * 12; d[o + 1] = Math.round((tile[q + 1] * 0.76 + 48) / 12) * 12; d[o + 2] = Math.round((tile[q + 2] * 0.7 + 36) / 12) * 12; d[o + 3] = 255;
      }
    }
    x2.putImageData(img, 0, 0);
    return c.toDataURL();
  };
  Game.prototype.updateHeldView = function () {
    var ui = this.ui, held = this.inv.held(), key = held ? held.key : '', w = this.walker, wd = this.world;
    if (!ui.heldView) return;
    var el = ui.heldView, kind = this.invOpen || this.spectator ? '' : key === 'FILLED_MAP' && held.map ? 'map' : key === 'COMPASS' ? 'compass' : key === 'CLOCK' ? 'clock' : '';
    if (el.dataset.kind !== kind) { el.dataset.kind = kind; el.className = kind ? 'on ' + kind : ''; el.innerHTML = kind === 'map' ? '<img alt=""><i></i>' : kind ? '<canvas width="64" height="64"></canvas>' : ''; el.dataset.src = ''; }
    if (kind === 'map') {
      var mp = held.map, ck = mp.dim + '|' + mp.x + '|' + mp.z + '|' + (mp.scale || 0);
      if (mp.dim === wd.dimKey && (!mapCache[ck] || (this.tickCount - mapCache[ck].t > 200 && mapCache[ck].edits !== wd.editCount))) {
        try { mapCache[ck] = { url: WG.renderMap(wd, mp), t: this.tickCount, edits: wd.editCount }; } catch (e) { mapCache[ck] = { url: '', t: this.tickCount }; }
      }
      var img = el.querySelector('img');
      if (mapCache[ck] && el.dataset.src !== ck + mapCache[ck].t) { img.src = mapCache[ck].url; el.dataset.src = ck + mapCache[ck].t; }
      var size = 128 << (mp.scale || 0), fx = (w.pos[0] - (mp.x - size / 2)) / size, fz = (w.pos[2] - (mp.z - size / 2)) / size, mk = el.querySelector('i');
      var inside = mp.dim === wd.dimKey && fx >= 0 && fx <= 1 && fz >= 0 && fz <= 1;
      mk.style.display = inside ? '' : 'none';
      mk.style.left = (fx * 100) + '%'; mk.style.top = (fz * 100) + '%'; mk.style.transform = 'translate(-50%,-50%) rotate(' + (-w.yaw * 180 / Math.PI + 180) + 'deg)';
    } else if (kind) {
      var cv = el.querySelector('canvas'), x = cv.getContext('2d'), R = 30;
      x.clearRect(0, 0, 64, 64); x.imageSmoothingEnabled = false;
      x.fillStyle = '#3a2a1a'; x.beginPath(); x.arc(32, 32, R + 2, 0, 7); x.fill();
      if (kind === 'compass') {
        x.fillStyle = '#c8c0a8'; x.beginPath(); x.arc(32, 32, R - 1, 0, 7); x.fill();
        var sp = wd.spawn || [0, 0, 0], ang;
        if (wd.dimKey !== 'overworld') ang = this.tickCount * 0.35;
        else ang = Math.atan2(sp[0] - w.pos[0], -(sp[2] - w.pos[2])) + w.yaw;   // 画面の上が見ている向き
        x.save(); x.translate(32, 32); x.rotate(ang);
        x.fillStyle = '#c0302a'; x.beginPath(); x.moveTo(0, -24); x.lineTo(5, 0); x.lineTo(-5, 0); x.fill();
        x.fillStyle = '#5a5a60'; x.beginPath(); x.moveTo(0, 24); x.lineTo(5, 0); x.lineTo(-5, 0); x.fill();
        x.restore();
      } else {
        // 時計：上半分が昼（空色と太陽）、下半分が夜（紺と月）。時刻で回る
        var t = ((wd.time || 0) % 24000) / 24000, a2 = -t * Math.PI * 2 + Math.PI / 2;
        x.save(); x.beginPath(); x.arc(32, 32, R - 1, 0, 7); x.clip();
        x.translate(32, 32); x.rotate(a2);
        x.fillStyle = '#6fa8dc'; x.fillRect(-R, -R, 2 * R, R); x.fillStyle = '#1c2448'; x.fillRect(-R, 0, 2 * R, R);
        x.fillStyle = '#f4d060'; x.beginPath(); x.arc(0, -R * 0.55, 7, 0, 7); x.fill();
        x.fillStyle = '#e8e8f0'; x.beginPath(); x.arc(0, R * 0.55, 6, 0, 7); x.fill();
        x.restore();
        x.fillStyle = '#e8c540'; x.beginPath(); x.moveTo(32, 4); x.lineTo(28, 12); x.lineTo(36, 12); x.fill();
      }
    }
    // 望遠鏡：右クリックを押している間だけ大きく見る
    var spy = key === 'SPYGLASS' && this.mouseR && !this.invOpen && !this.spectator;
    w.zoom = spy ? 0.1 : 1;
    if (ui.spyView) ui.spyView.classList.toggle('on', spy);
  };
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    tickExtra.call(this);
    if (!this.world.spawn) this.world.spawn = this.walker.spawnPoint ? this.walker.spawnPoint.slice() : this.walker.pos.slice();
    if (typeof document !== 'undefined') this.updateHeldView();
  };
})(typeof window !== 'undefined' ? window : globalThis);
