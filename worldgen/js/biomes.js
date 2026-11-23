// 新しいバイオームの素材（ロードマップ 第 3 段階）
// 桜の林（桜の木・桜の花びら）、マングローブの沼（マングローブの木と根・泥）、荒野（赤い砂・色の地層）、キノコ島（菌糸・大きなキノコ）
// 地形と木の形は js/overworld.js、草花は js/terrain.js
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft;
  function blockItem(key, hardness, drop, tool) {
    var id = B[key]; ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: 1, dropMax: 1, dropChance: 1 };
    if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = 0; ITEMS[key].fast = true; }
    return ITEMS[key];
  }
  ['CHERRY', 'MANGROVE'].forEach(function (w) {
    blockItem(w + '_LOG', 2, w + '_LOG', 'axe'); blockItem(w + '_PLANKS', 2, w + '_PLANKS', 'axe'); blockItem(w + '_LEAVES', 0.2, null);
    Craft.SHAPELESS.push([[w + '_LOG'], w + '_PLANKS', 4]);
    Craft.GROUPS.PLANKS.push(w + '_PLANKS'); Craft.GROUPS.LOGS.push(w + '_LOG'); if (Craft.GROUPS.WOOD_SLABS) Craft.GROUPS.WOOD_SLABS.push(w + '_SLAB');
    Craft.FUEL[w + '_PLANKS'] = 300; Craft.FUEL[w + '_LOG'] = 300; Craft.SMELT[w + '_LOG'] = 'CHARCOAL';
  });
  blockItem('MANGROVE_ROOTS', 0.7, 'MANGROVE_ROOTS', 'axe'); blockItem('MUDDY_MANGROVE_ROOTS', 0.7, 'MUDDY_MANGROVE_ROOTS', 'shovel');
  blockItem('MUD', 0.5, 'MUD', 'shovel'); blockItem('PACKED_MUD', 1, 'PACKED_MUD', 'pickaxe'); blockItem('MUD_BRICKS', 1.5, 'MUD_BRICKS', 'pickaxe');
  blockItem('RED_SAND', 0.5, 'RED_SAND', 'shovel'); blockItem('RED_SANDSTONE', 0.8, 'RED_SANDSTONE', 'pickaxe');
  blockItem('MYCELIUM', 0.6, 'DIRT', 'shovel'); blockItem('PINK_PETALS', 0, 'PINK_PETALS');
  Craft.SHAPELESS.push([['MUD', 'WHEAT'], 'PACKED_MUD', 1], [['MUD', 'MANGROVE_ROOTS'], 'MUDDY_MANGROVE_ROOTS', 1], [['PINK_PETALS'], 'PINK_DYE', 1]);
  Craft.SHAPED.push([['PP', 'PP'], { P: 'PACKED_MUD' }, 'MUD_BRICKS', 4], [['SS', 'SS'], { S: 'RED_SAND' }, 'RED_SANDSTONE', 1]);
  Craft.SMELT.RED_SAND = 'GLASS';
  if (WG.GRAVITY) WG.GRAVITY[B.RED_SAND] = 1;
  // 水入り瓶を土に使うと泥になる
  var Game = WG.Game, use = Game.prototype.use;
  Game.prototype.use = function () {
    var t = this.walker.target, held = this.inv.held();
    if (t && held && held.key === 'POTION_WATER' && (t.id === B.DIRT || t.id === B.COARSE_DIRT)) {
      this.world.setBlock(t.x, t.y, t.z, B.MUD); this.walker.remesh(t.x, t.z);
      if (this.mode === 'survival') { this.inv.slots[this.inv.sel] = held.n > 1 ? { key: 'POTION_WATER', n: held.n - 1 } : { key: 'GLASS_BOTTLE', n: 1 }; this.inv.changed(); }
      this.puff(t.x + 0.5, t.y + 1, t.z + 0.5, [90, 80, 70], 8, 0.4);
      this.mouseR = this.clickR = false; return;
    }
    return use.apply(this, arguments);
  };
})(typeof window !== 'undefined' ? window : globalThis);
