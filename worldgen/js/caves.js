// 洞窟のバイオーム（ロードマップ 第 4 段階）
// 繁茂した洞窟：苔・苔のじゅうたん・ツツジ・洞窟のつる（光るベリー）・胞子の花・ドリップリーフ。地形は js/terrain.js
// 鍾乳洞：鍾乳石ブロックと、天井から垂れる鍾乳石・床から伸びる石筍。付け根を壊すと落ちてきて、当たると痛い
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game;
  function keyOf(id) { return WG.BLOCKS[id] ? WG.BLOCKS[id].key : ''; }
  function rint(n) { return Math.floor(Math.random() * n); }
  function blockItem(key, hardness, drop, tool) {
    var id = B[key]; ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: 1, dropMax: 1, dropChance: 1 };
    if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = 0; }
    return ITEMS[key];
  }
  ['MOSS_BLOCK', 'MOSS_CARPET', 'AZALEA', 'FLOWERING_AZALEA', 'SPORE_BLOSSOM', 'SMALL_DRIPLEAF', 'BIG_DRIPLEAF'].forEach(function (k) { blockItem(k, k === 'MOSS_BLOCK' ? 0.1 : 0, k, k === 'MOSS_BLOCK' ? 'hoe' : null); });
  blockItem('DRIPSTONE_BLOCK', 1.5, 'DRIPSTONE_BLOCK', 'pickaxe');
  ['UP_TIP', 'UP_MID', 'DOWN_TIP', 'DOWN_MID'].forEach(function (s) { blockItem('POINTED_DRIPSTONE_' + s, 1.5, 'POINTED_DRIPSTONE', 'pickaxe'); });
  blockItem('CAVE_VINES', 0, null); blockItem('CAVE_VINES_LIT', 0, 'GLOW_BERRIES');
  ITEMS.POINTED_DRIPSTONE = { key: 'POINTED_DRIPSTONE', name: '鍾乳石', block: -1, max: 64, shape: 'lump', color: '#866b5c' };
  ITEMS.GLOW_BERRIES = { key: 'GLOW_BERRIES', name: '光るベリー', block: -1, max: 64, shape: 'lump', color: '#e8a030', food: 2, sat: 0.1 };
  Craft.SHAPED.push([['MM'], { M: 'MOSS_BLOCK' }, 'MOSS_CARPET', 3], [['PP', 'PP'], { P: 'POINTED_DRIPSTONE' }, 'DRIPSTONE_BLOCK', 1]);
  Craft.SHAPELESS.push([['COBBLESTONE', 'MOSS_BLOCK'], 'MOSSY_COBBLESTONE', 1], [['STONE_BRICKS', 'MOSS_BLOCK'], 'MOSSY_STONE_BRICKS', 1]);
  if (WG.Craft.FUEL) WG.Craft.FUEL.AZALEA = 100;

  var isDown = function (id) { return id === B.POINTED_DRIPSTONE_DOWN_TIP || id === B.POINTED_DRIPSTONE_DOWN_MID; };
  var isUp = function (id) { return id === B.POINTED_DRIPSTONE_UP_TIP || id === B.POINTED_DRIPSTONE_UP_MID; };
  var isVine = function (id) { return id === B.CAVE_VINES || id === B.CAVE_VINES_LIT; };

  // ---------------- 置く：鍾乳石（床なら上向き、天井なら下向き、先に足すと伸びる）、光るベリー（天井につる） ----------------
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var t = this.walker.target, held = this.inv.held(), wd = this.world, w = this.walker, surv = this.mode === 'survival';
    if (t && held && (held.key === 'POINTED_DRIPSTONE' || held.key === 'GLOW_BERRIES')) {
      var up = t.py === t.y + 1, down = t.py === t.y - 1;
      if (wd.block(t.px, t.py, t.pz) !== B.AIR || this.mobs.target || !(up || down)) return;
      var solid = WG.COLLIDE[t.id] >= 1;
      if (held.key === 'GLOW_BERRIES') {
        if (!down || !(solid || isVine(t.id))) return;
        wd.setBlock(t.px, t.py, t.pz, B.CAVE_VINES);
      } else {
        if (up && !(solid || t.id === B.POINTED_DRIPSTONE_UP_TIP)) return;
        if (down && !(solid || t.id === B.POINTED_DRIPSTONE_DOWN_TIP)) return;
        if (t.id === B.POINTED_DRIPSTONE_UP_TIP) wd.setBlock(t.x, t.y, t.z, B.POINTED_DRIPSTONE_UP_MID);
        if (t.id === B.POINTED_DRIPSTONE_DOWN_TIP) wd.setBlock(t.x, t.y, t.z, B.POINTED_DRIPSTONE_DOWN_MID);
        wd.setBlock(t.px, t.py, t.pz, up ? B.POINTED_DRIPSTONE_UP_TIP : B.POINTED_DRIPSTONE_DOWN_TIP);
      }
      w.remesh(t.px, t.pz);
      if (surv) this.inv.take(this.inv.sel, 1);
      if (WG.Sound) WG.Sound.play('place', t.px + 0.5, t.py + 0.5, t.pz + 0.5, held.key === 'GLOW_BERRIES' ? 'grass' : 'stone');
      return;
    }
    return place.apply(this, arguments);
  };
  // 天井に向けた光るベリーは、食べずに植える
  var tickEating = Game.prototype.tickEating;
  Game.prototype.tickEating = function () {
    var held = this.inv.held(), t = this.walker.target;
    var aim = t && ((held && held.key === 'GLOW_BERRIES' && t.py === t.y - 1) || t.id === B.CAVE_VINES_LIT);
    if (!this.mouseR || !aim) return tickEating.apply(this, arguments);
    this.mouseR = false; try { return tickEating.apply(this, arguments); } finally { this.mouseR = true; }
  };

  // ---------------- 右クリック：光る実を摘む、骨粉（苔が広がる・つるに実が付く） ----------------
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var t = this.walker.target, held = this.inv.held(), wd = this.world, w = this.walker, surv = this.mode === 'survival', self = this;
    if (t && t.id === B.CAVE_VINES_LIT && !(held && held.key === 'BONE_MEAL')) {
      wd.setBlock(t.x, t.y, t.z, B.CAVE_VINES); w.remesh(t.x, t.z);
      this.spawnItem('GLOW_BERRIES', 1, t.x + 0.5, t.y + 0.3, t.z + 0.5, 0.1, 10);
      this.mouseR = this.clickR = false; return;
    }
    if (t && held && held.key === 'BONE_MEAL') {
      if (t.id === B.CAVE_VINES) { wd.setBlock(t.x, t.y, t.z, B.CAVE_VINES_LIT); w.remesh(t.x, t.z); this.puff(t.x + 0.5, t.y + 0.5, t.z + 0.5, [120, 200, 90], 8, 0.4); if (surv) this.inv.take(this.inv.sel, 1); this.mouseR = this.clickR = false; return; }
      if (t.id === B.MOSS_BLOCK) {
        // 苔が近くの石や土に広がり、上に苔のじゅうたんやツツジが生える
        var ROCK = [B.STONE, B.DEEPSLATE, B.TUFF, B.GRANITE, B.DIORITE, B.ANDESITE, B.DIRT, B.GRASS, B.COBBLESTONE];
        for (var dx = -3; dx <= 3; dx++) for (var dz = -3; dz <= 3; dz++) for (var dy = -1; dy <= 1; dy++) {
          if (Math.hypot(dx, dz) > 3.2 || Math.random() < 0.3) continue;
          var x = t.x + dx, y = t.y + dy, z = t.z + dz, id = wd.block(x, y, z);
          if (ROCK.indexOf(id) >= 0 && wd.block(x, y + 1, z) === B.AIR) wd.setBlock(x, y, z, B.MOSS_BLOCK);
          if (wd.block(x, y, z) === B.MOSS_BLOCK && wd.block(x, y + 1, z) === B.AIR) { var r = Math.random(); if (r < 0.35) wd.setBlock(x, y + 1, z, B.MOSS_CARPET); else if (r < 0.4) wd.setBlock(x, y + 1, z, r < 0.38 ? B.AZALEA : B.FLOWERING_AZALEA); else if (r < 0.5) wd.setBlock(x, y + 1, z, B.SHORT_GRASS); }
        }
        for (var cx = (t.x - 4) >> 4; cx <= (t.x + 4) >> 4; cx++) for (var cz = (t.z - 4) >> 4; cz <= (t.z + 4) >> 4; cz++) w.remesh(cx * 16 + 1, cz * 16 + 1);
        this.puff(t.x + 0.5, t.y + 1, t.z + 0.5, [120, 200, 90], 20, 1.5);
        if (surv) this.inv.take(this.inv.sel, 1);
        this.mouseR = this.clickR = false; return;
      }
    }
    return use.apply(this, arguments);
  };

  // ---------------- 壊す：下に垂れた鍾乳石は落ち、上の石筍は折れる。つる・胞子の花も落ちる ----------------
  var breakBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function (x, y, z) {
    var wd = this.world, was = wd.block(x, y, z), r = breakBlock.apply(this, arguments), self = this;
    if (wd.block(x, y, z) === was) return r;   // 壊れなかった
    // 下の鍾乳石：つながっている分がまとめて落ちる
    var n = 0;
    for (var yy = y - 1; isDown(wd.block(x, yy, z)) && n < 12; yy--, n++) {
      var id = wd.block(x, yy, z);
      wd.setBlock(x, yy, z, B.AIR);
      (this.dripFalls || (this.dripFalls = [])).push({ x: x + 0.5, y: yy, z: z + 0.5, py: yy, vy: 0, id: id, n: 0 });
    }
    if (n) this.walker.remesh(x, z);
    // 上の石筍（下が付け根だったもの）は折れる
    for (yy = y + 1; isUp(wd.block(x, yy, z)) && yy < y + 12; yy++) { wd.setBlock(x, yy, z, B.AIR); this.spawnItem('POINTED_DRIPSTONE', 1, x + 0.5, yy + 0.3, z + 0.5, 0.1, 10); this.walker.remesh(x, z); }
    // 下のつると胞子の花
    for (yy = y - 1; (isVine(wd.block(x, yy, z)) || wd.block(x, yy, z) === B.SPORE_BLOSSOM) && yy > y - 30; yy--) {
      var v = wd.block(x, yy, z);
      wd.setBlock(x, yy, z, B.AIR);
      if (v === B.CAVE_VINES_LIT) this.spawnItem('GLOW_BERRIES', 1, x + 0.5, yy + 0.3, z + 0.5, 0.1, 10);
      if (v === B.SPORE_BLOSSOM) this.spawnItem('SPORE_BLOSSOM', 1, x + 0.5, yy + 0.3, z + 0.5, 0.1, 10);
      this.walker.remesh(x, z);
    }
    return r;
  };

  // ---------------- 毎刻：落ちる鍾乳石、胞子の花の舞う粒、鍾乳石の先のしずく ----------------
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    var r = tickExtra.apply(this, arguments), wd = this.world, w = this.walker, self = this;
    this.dripFalls = (this.dripFalls || []).filter(function (f) {
      f.py = f.y; f.vy = Math.max(-1.2, f.vy - 0.05); f.y += f.vy; f.n++;
      var pb = w.box();
      if (!self.dead && f.x > pb[0] - 0.3 && f.x < pb[3] + 0.3 && f.z > pb[2] - 0.3 && f.z < pb[5] + 0.3 && f.y < pb[4] + 0.2 && f.y > pb[1] - 0.5) {
        self.hurtPlayer(Math.min(10, 2 + Math.round(-f.vy * 6)), f.x, f.z, 'falling');
        self.puff(f.x, f.y, f.z, [134, 107, 92], 10, 0.3); return false;
      }
      if (WG.COLLIDE[wd.block(Math.floor(f.x), Math.floor(f.y), Math.floor(f.z))] >= 1 || f.n > 200) {
        self.puff(f.x, Math.floor(f.y) + 1.05, f.z, [134, 107, 92], 10, 0.4);
        self.spawnItem('POINTED_DRIPSTONE', 1, f.x, Math.floor(f.y) + 1.2, f.z, 0.1, 10);
        if (WG.Sound) WG.Sound.play('break', f.x, f.y + 1, f.z, 'stone');
        return false;
      }
      return true;
    });
    if (wd.dimKey === 'overworld' && w.pos[1] < 60) {
      for (var k = 0; k < 40; k++) {
        var x = Math.floor(w.pos[0]) + rint(21) - 10, y = Math.floor(w.pos[1]) + rint(13) - 4, z = Math.floor(w.pos[2]) + rint(21) - 10, id = wd.block(x, y, z);
        if (id === B.SPORE_BLOSSOM) for (var q = 0; q < 3; q++) this.particles.push({ x: x + Math.random() * 8 - 3.5, y: y - Math.random() * 4, z: z + Math.random() * 8 - 3.5, vx: (Math.random() - 0.5) * 0.01, vy: -0.008, vz: (Math.random() - 0.5) * 0.01, life: 60 + rint(40), c: [120, 200, 110], glow: true });
        else if (id === B.POINTED_DRIPSTONE_DOWN_TIP && Math.random() < 0.3) this.particles.push({ x: x + 0.5, y: y + 0.05, z: z + 0.5, vx: 0, vy: -0.25, vz: 0, life: 14, c: [150, 170, 200] });
        else if (id === B.CAVE_VINES_LIT && Math.random() < 0.15) this.particles.push({ x: x + 0.3 + Math.random() * 0.4, y: y + 0.4, z: z + 0.3 + Math.random() * 0.4, vx: 0, vy: 0.005, vz: 0, life: 20, c: [255, 190, 80], glow: true });
      }
    }
    return r;
  };
  var drawExtra = Game.prototype.drawExtra;
  Game.prototype.drawExtra = function (solid, a, cube) {
    var r = drawExtra.apply(this, arguments), w = this.walker;
    (this.dripFalls || []).forEach(function (f) {
      var y = f.py + (f.y - f.py) * a, tl = WG.atlasTile(f.id, 'side');
      cube(solid, f.x, y, f.z, 0.45, 0, function () { return tl; }, function () { return [255, 255, 255]; }, w.lightLevels(f.x, y + 0.5, f.z));
    });
    return r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
