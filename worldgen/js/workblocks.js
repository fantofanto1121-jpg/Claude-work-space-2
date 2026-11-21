// 作業ブロック（Minecraft の決まりに合わせたもの）。
// - 鍛冶台：ダイヤモンドの道具・防具とネザライトインゴットで、ネザライトの物にする（エンチャントと傷み具合は残る）。
// - 石切台：石の仲間 1 個から、階段 1 個・ハーフブロック 2 個・石レンガ 1 個などを切り出す。
// - 製図台：地図と紙で広い地図（2 倍、4 段階まで）、地図と白紙の地図で写し。
// - 溶鉱炉：鉱石と粗い金属だけを、かまどの 2 倍の速さで焼く。燻製器：食べ物だけを 2 倍の速さで焼く。
// - 焚き火：明るさ 15。生の食べ物を 4 つまで載せると 30 秒で焼ける。上に立つと火傷する。煙が上がる。
// - 堆肥箱：植物を入れると、確率で中身が増える（7 段）。いっぱいになると骨粉が 1 つ取れる。
// 機織り機は、旗と一緒に第 3 回で加える。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game;

  Craft.SHAPED.push(
    [['II', 'PP', 'PP'], { I: 'IRON_INGOT', P: 'PLANKS' }, 'SMITHING_TABLE', 1],
    [[' I ', 'SSS'], { I: 'IRON_INGOT', S: 'STONE' }, 'STONECUTTER', 1],
    [['AA', 'PP', 'PP'], { A: 'PAPER', P: 'PLANKS' }, 'CARTOGRAPHY_TABLE', 1],
    [['III', 'IFI', 'SSS'], { I: 'IRON_INGOT', F: 'FURNACE', S: 'SMOOTH_STONE' }, 'BLAST_FURNACE', 1],
    [[' L ', 'LFL', ' L '], { L: 'LOGS', F: 'FURNACE' }, 'SMOKER', 1],
    [[' S ', 'SCS', 'LLL'], { S: 'STICK', C: 'COALS', L: 'LOGS' }, 'CAMPFIRE', 1],
    [['S S', 'S S', 'SSS'], { S: 'WOOD_SLABS' }, 'COMPOSTER_0', 1]
  );
  ITEMS.CAMPFIRE.drop = 'CHARCOAL';
  WG.EXTRA_SCREENS = { smith: 1, cutter: 1, carto: 1 };
  WG.furnaceKind = function (id) {
    return id === B.FURNACE || id === B.FURNACE_LIT ? 'FURNACE' : id === B.BLAST_FURNACE || id === B.BLAST_FURNACE_LIT ? 'BLAST_FURNACE' : id === B.SMOKER || id === B.SMOKER_LIT ? 'SMOKER' : null;
  };
  // 溶鉱炉と燻製器が焼けるもの
  function isOre(k) { return /^RAW_(IRON|GOLD|COPPER)$|_ORE$|^ANCIENT_DEBRIS$/.test(k); }
  function isFood(k) { return !!(ITEMS[k] && ITEMS[k].food) || k === 'POTATO'; }
  var canSmelt = Craft.Furnace.prototype.canSmelt;
  Craft.Furnace.prototype.canSmelt = function () {
    var inp = this.slots[0];
    if (inp && this.only === 'ore' && !isOre(inp.key)) return false;
    if (inp && this.only === 'food' && !isFood(inp.key)) return false;
    return canSmelt.call(this);
  };

  // 石切台の切り出し
  var CUT = {
    STONE: [['STONE_BRICKS', 1], ['STONE_BRICK_STAIRS', 1], ['STONE_BRICK_SLAB', 2]],
    STONE_BRICKS: [['STONE_BRICK_STAIRS', 1], ['STONE_BRICK_SLAB', 2]],
    COBBLESTONE: [['COBBLESTONE_STAIRS', 1], ['COBBLESTONE_SLAB', 2]],
    SANDSTONE: [['SANDSTONE_STAIRS', 1], ['SANDSTONE_SLAB', 2]],
    BRICKS: [['BRICK_STAIRS', 1], ['BRICK_SLAB', 2]]
  };
  WG.STONECUT = CUT;
  // 鍛冶台：ダイヤモンド → ネザライト
  function smithResult(a, b) {
    if (!a || !b || b.key !== 'NETHERITE_INGOT' || !/^DIAMOND_/.test(a.key)) return null;
    var key = a.key.replace(/^DIAMOND_/, 'NETHERITE_');
    if (!ITEMS[key]) return null;
    var out = { key: key, n: 1 };
    if (a.dmg) out.dmg = a.dmg;
    if (a.ench) out.ench = JSON.parse(JSON.stringify(a.ench));
    return out;
  }
  // 製図台：広げる（紙）か、写す（白紙の地図）
  function cartoResult(a, b) {
    if (!a || !b || a.key !== 'FILLED_MAP' || !a.map) return null;
    if (b.key === 'PAPER' && (a.map.scale || 0) < 4) { var m = a.map, s = (m.scale || 0) + 1, sz = 128 << s; return { key: 'FILLED_MAP', n: 1, map: { x: Math.floor((m.x + sz / 2) / sz) * sz, z: Math.floor((m.z + sz / 2) / sz) * sz, dim: m.dim, scale: s } }; }
    if (b.key === 'MAP') return { key: 'FILLED_MAP', n: 2, map: JSON.parse(JSON.stringify(a.map)), copy: true };
    return null;
  }
  WG.smithResult = smithResult; WG.cartoResult = cartoResult;

  function slotHtml(c, i, s, extra) { return WG.slotHTMLFull(c, i, s, extra); }
  var renderExtraScreen = Game.prototype.renderExtraScreen;
  Game.prototype.renderExtraScreen = function (sc) {
    var ws = this.workSlots || (this.workSlots = [null, null]), html = '';
    if (sc === 'smith' || sc === 'carto') {
      var res = sc === 'smith' ? smithResult(ws[0], ws[1]) : cartoResult(ws[0], ws[1]);
      this.workRes = res;
      html += '<div class="craft">' + slotHtml('wk', 0, ws[0]) + '<span class="plus">＋</span>' + slotHtml('wk', 1, ws[1]) + '<div class="arrow"></div>' + slotHtml('wkres', 0, res && { key: res.key, n: res.n, ench: res.ench }, ' result') + '</div>';
      html += '<div class="note">' + (sc === 'smith' ? '左にダイヤモンドの道具か防具、右にネザライトインゴット' : '左に地図、右に紙（地図を広げる）か白紙の地図（写す）') + '</div>';
      return html;
    }
    if (sc === 'cutter') {
      var inp = ws[0], opts = inp && CUT[inp.key] || [];
      html += '<div class="craft">' + slotHtml('wk', 0, inp) + '<div class="arrow"></div><div class="trades" style="min-width:250px">';
      opts.forEach(function (o, i) {
        html += '<div class="trade" data-c="cutopt" data-i="' + i + '"><span class="tslot"><img src="' + WG.iconURL(o[0]) + '" alt="">' + (o[1] > 1 ? '<i>' + o[1] + '</i>' : '') + '</span><span class="tname">' + WG.itemName(o[0]) + '</span></div>';
      });
      if (!opts.length) html += '<div class="note" style="margin:0">石・石レンガ・丸石・砂岩・レンガを入れると、切り出せる物が出ます</div>';
      return html + '</div></div>';
    }
    return renderExtraScreen.call(this, sc);
  };
  var getExtraSlot = Game.prototype.getExtraSlot;
  Game.prototype.getExtraSlot = function (c, i) { if (c === 'wk') return (this.workSlots || (this.workSlots = [null, null]))[i]; return getExtraSlot.call(this, c, i); };
  var setExtraSlot = Game.prototype.setExtraSlot;
  Game.prototype.setExtraSlot = function (c, i, v) { if (c === 'wk') { (this.workSlots || (this.workSlots = [null, null]))[i] = v; return true; } return setExtraSlot.call(this, c, i, v); };
  var clickExtra = Game.prototype.clickExtra;
  Game.prototype.clickExtra = function (c, i) {
    var ws = this.workSlots || (this.workSlots = [null, null]);
    if (c === 'wkres') {
      var r = this.workRes;
      if (!r || this.cursor) return true;
      this.cursor = { key: r.key, n: r.n }; if (r.dmg) this.cursor.dmg = r.dmg; if (r.ench) this.cursor.ench = r.ench; if (r.map) this.cursor.map = r.map;
      // 写しは 2 枚とも同じ地図。地図を 1 枚、もう 1 つを 1 個減らす
      ws[0] = null;
      if (ws[1] && --ws[1].n <= 0) ws[1] = null;
      if (r.copy) { var second = { key: 'FILLED_MAP', n: 1, map: r.map }; this.cursor.n = 1; if (!this.inv.add('FILLED_MAP', 1)) this.spawnItem('FILLED_MAP', 1, this.walker.pos[0], this.walker.pos[1] + 1, this.walker.pos[2], 0, 10); this.inv.slots.some(function (s) { if (s && s.key === 'FILLED_MAP' && !s.map) { s.map = second.map; return true; } return false; }); }
      if (WG.Sound) WG.Sound.play('place', null, null, null, 'metal');
      return true;
    }
    if (c === 'cutopt') {
      var inp = ws[0], o = inp && CUT[inp.key] && CUT[inp.key][i];
      if (!o) return true;
      var left = o[1] - this.inv.add(o[0], o[1]);
      if (left > 0) this.spawnItem(o[0], left, this.walker.pos[0], this.walker.pos[1] + 1, this.walker.pos[2], 0, 10);
      if (--inp.n <= 0) ws[0] = null;
      if (WG.Sound) WG.Sound.play('hit', null, null, null, 'stone');
      return true;
    }
    return clickExtra.call(this, c, i);
  };

  // ---- 右クリック：作業ブロックを開く・焚き火に載せる・堆肥を入れる ----
  var COMPOST = { WHEAT_SEEDS: 0.3, OAK_LEAVES: 0.3, BIRCH_LEAVES: 0.3, SPRUCE_LEAVES: 0.3, JUNGLE_LEAVES: 0.3, ACACIA_LEAVES: 0.3, SUGAR_CANE: 0.5, CACTUS: 0.5,
    WHEAT: 0.65, CARROT: 0.65, POTATO: 0.65, APPLE: 0.65, PUMPKIN: 0.65, CARVED_PUMPKIN: 0.65, BROWN_MUSHROOM: 0.65, RED_MUSHROOM: 0.65, DANDELION: 0.65, POPPY: 0.65,
    NETHER_WART: 0.65, BREAD: 0.85, BAKED_POTATO: 0.85, HAY_BALE: 0.85 };
  WG.COMPOST = COMPOST;
  function composterLevel(id) { var k = WG.BLOCKS[id].key, m = /^COMPOSTER_(\d)$/.exec(k); return m ? +m[1] : -1; }
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), shift = w.keys.ShiftLeft || w.keys.ShiftRight, wd = this.world, surv = this.mode === 'survival', self = this;
    var done = function () { self.mouseR = self.clickR = false; };
    if (t && !this.spectator && !(this.mobs.target && this.mobs.target.mob)) {
      var screen = { SMITHING_TABLE: 'smith', STONECUTTER: 'cutter', CARTOGRAPHY_TABLE: 'carto' }[WG.BLOCKS[t.id].key];
      if (screen && !shift) { done(); this.workSlots = [null, null]; this.openInventory(screen); return; }
      var fk = WG.furnaceKind(t.id);
      if (fk && fk !== 'FURNACE' && !shift) {
        done();
        var key = t.x + ',' + t.y + ',' + t.z;
        if (!wd.furnaces.has(key)) wd.furnaces.set(key, new Craft.Furnace());
        this.furnaceKey = key; this.furnaceName = fk === 'SMOKER' ? '燻製器' : '溶鉱炉';
        this.openInventory('furnace');
        return;
      }
      if (fk === 'FURNACE') this.furnaceName = null;
      // 焚き火に生の食べ物を載せる
      if (t.id === B.CAMPFIRE && held && Craft.SMELT[held.key] && isFood(Craft.SMELT[held.key])) {
        var ck = t.x + ',' + t.y + ',' + t.z, cf = (wd.campfires || (wd.campfires = new Map())).get(ck) || [];
        if (cf.length < 4) { cf.push({ key: held.key, t: 0 }); wd.campfires.set(ck, cf); if (surv) this.inv.take(this.inv.sel, 1); }
        done(); return;
      }
      // 堆肥箱
      var lvl = composterLevel(t.id);
      if (lvl >= 0) {
        if (lvl === 8) { wd.setBlock(t.x, t.y, t.z, B.COMPOSTER_0); this.spawnItem('BONE_MEAL', 1, t.x + 0.5, t.y + 1.1, t.z + 0.5, 0.05, 10); w.remesh(t.x, t.z); done(); return; }
        if (held && COMPOST[held.key] != null && lvl < 7) {
          if (surv) this.inv.take(this.inv.sel, 1);
          if (Math.random() < COMPOST[held.key]) {
            wd.setBlock(t.x, t.y, t.z, B['COMPOSTER_' + (lvl + 1)]); w.remesh(t.x, t.z);
            if (lvl + 1 === 7) (wd.compostReady || (wd.compostReady = new Map())).set(t.x + ',' + t.y + ',' + t.z, this.tickCount + 20);
          }
          this.puff(t.x + 0.5, t.y + 1, t.z + 0.5, [110, 160, 70], 4, 0.3);
          done(); return;
        }
      }
    }
    return use.apply(this, arguments);
  };

  // ---- 刻み：焚き火（焼く・煙・火傷）と、堆肥ができあがる ----
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    tickExtra.call(this);
    var wd = this.world, self = this, w = this.walker;
    if (wd.campfires) wd.campfires.forEach(function (list, key) {
      var p = key.split(',').map(Number);
      if (wd.block(p[0], p[1], p[2]) !== B.CAMPFIRE) { list.forEach(function (it) { self.spawnItem(it.key, 1, p[0] + 0.5, p[1] + 0.5, p[2] + 0.5, 0.1, 10); }); wd.campfires.delete(key); return; }
      for (var i = list.length - 1; i >= 0; i--) {
        if (++list[i].t >= 600) { self.spawnItem(Craft.SMELT[list[i].key], 1, p[0] + 0.5, p[1] + 0.6, p[2] + 0.5, 0.1, 10); list.splice(i, 1); }
      }
    });
    if (this.tickCount % 8 === 0) {
      // 近くの焚き火から煙
      var px = Math.floor(w.pos[0]), py = Math.floor(w.pos[1]), pz = Math.floor(w.pos[2]);
      for (var n = 0; n < 6; n++) {
        var x = px + Math.floor(Math.random() * 17) - 8, y = py + Math.floor(Math.random() * 9) - 4, z = pz + Math.floor(Math.random() * 17) - 8;
        if (wd.block(x, y, z) === B.CAMPFIRE) this.particles.push({ x: x + 0.5 + (Math.random() - 0.5) * 0.3, y: y + 0.9, z: z + 0.5 + (Math.random() - 0.5) * 0.3, vx: 0, vy: 0.06, vz: 0, life: 60, c: [120, 120, 124], smoke: true });
      }
    }
    if (this.tickCount % 20 === 0 && this.mode === 'survival' && wd.block(Math.floor(w.pos[0]), Math.floor(w.pos[1] + 0.1), Math.floor(w.pos[2])) === B.CAMPFIRE) this.damage(1, false, 'fire');
    if (wd.compostReady) wd.compostReady.forEach(function (at, key) {
      if (self.tickCount < at) return;
      var p = key.split(',').map(Number);
      if (wd.block(p[0], p[1], p[2]) === B.COMPOSTER_7) { wd.setBlock(p[0], p[1], p[2], B.COMPOSTER_8); w.remesh(p[0], p[2]); }
      wd.compostReady.delete(key);
    });
  };
  // 焚き火の上の食べ物を描く
  var drawExtra = Game.prototype.drawExtra;
  Game.prototype.drawExtra = function (solid, a, cube) {
    drawExtra.call(this, solid, a, cube);
    var w = this.walker;
    if (this.world.campfires) this.world.campfires.forEach(function (list, key) {
      var p = key.split(',').map(Number), lt = [15, 15];
      list.forEach(function (it, i) {
        var ox = (i & 1 ? 0.7 : 0.3), oz = (i & 2 ? 0.7 : 0.3), tile = WG.itemTile(it.key);
        cube(solid, p[0] + ox, p[1] + 0.47, p[2] + oz, 0.28, i * 1.57, function () { return tile; }, function () { return [255, 255, 255]; }, lt);
      });
    });
    void w;
  };
})(typeof window !== 'undefined' ? window : globalThis);
