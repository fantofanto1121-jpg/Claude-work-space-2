// 色の建材（ロードマップ 第 2 段階）
// ・じゅうたん（羊毛 2 つで 3 枚。薄い板で、上に物を置ける）
// ・彩釉テラコッタ（色付きテラコッタをかまどで焼く。色ごとに違う模様）
// ・色付きのベッド（その色の羊毛 3 つと板材 3 つ。白いベッドと染料でも）
// 色付きガラス・板ガラス、コンクリートとコンクリートパウダーは、もとからある
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft;
  function blockItem(key, hardness, drop, tool) {
    var id = B[key]; ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: 1, dropMax: 1, dropChance: 1 };
    if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = 0; }
  }
  WG.C16B.forEach(function (c) {
    var k = c[0];
    blockItem(k + '_CARPET', 0.1);
    blockItem(k + '_GLAZED_TERRACOTTA', 1.4, k + '_GLAZED_TERRACOTTA', 'pickaxe');
    Craft.SHAPED.push([['WW'], { W: k + '_WOOL' }, k + '_CARPET', 3]);
    var terra = k + '_TERRACOTTA';
    if (ITEMS[terra]) Craft.SMELT[terra] = k + '_GLAZED_TERRACOTTA';
    if (k === 'WHITE') return;
    ITEMS[k + '_BED'] = { key: k + '_BED', name: c[1] + 'のベッド', block: -1, max: 1, bed: true, bedColor: k };
    ['FOOT', 'HEAD'].forEach(function (p) { ['N', 'E', 'S', 'W'].forEach(function (d) { blockItem('BED_' + k + '_' + p + '_' + d, 0.2, k + '_BED'); }); });
    Craft.SHAPED.push([['WWW', 'PPP'], { W: k + '_WOOL', P: 'PLANKS' }, k + '_BED', 1]);
    if (ITEMS[k + '_DYE']) Craft.SHAPELESS.push([['BED', k + '_DYE'], k + '_BED', 1]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
