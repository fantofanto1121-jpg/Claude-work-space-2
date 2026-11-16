// 動作確認: node tools/selftest.js
// 1. 同じシードで同じ結果になること
// 2. 生成の順番を変えても同じ結果になること（境界をまたぐ木・部屋・柱なども含む）
// 3. 地表だけの生成と、すべての生成で、真上から見た結果が一致すること
// 4. 次元ごとのブロックの割合と、必要なブロックが出ていること
// 5. 生成時間
'use strict';
var WG = require('./load.js');
var B = WG.B;

var failed = 0;
function check(ok, msg) {
  console.log((ok ? '  OK   ' : '  NG   ') + msg);
  if (!ok) failed++;
}
function digest(a) {
  var h = 0x811c9dc5;
  for (var i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 0x01000193);
  return (h >>> 0).toString(16);
}
function chunkList(cx0, cz0, n) {
  var l = [];
  for (var z = 0; z < n; z++) for (var x = 0; x < n; x++) l.push([cx0 + x, cz0 + z]);
  return l;
}
function shuffled(list, seed) {
  var a = list.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = WG.hash(seed, i, 0, 0, 1) % (i + 1), t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

var SEED = '7';
var AREAS = {
  overworld: [chunkList(-4, -4, 8), chunkList(40, -20, 4)],
  nether: [chunkList(-4, -4, 8)],
  end: [chunkList(-6, -6, 12), chunkList(28, 12, 6)]
};
var REQUIRED = {
  overworld: ['AIR', 'BEDROCK', 'STONE', 'DEEPSLATE', 'DIRT', 'WATER', 'LAVA', 'COAL_ORE', 'IRON_ORE', 'DEEPSLATE_DIAMOND_ORE', 'DEEPSLATE_REDSTONE_ORE'],
  nether: ['AIR', 'BEDROCK', 'NETHERRACK', 'LAVA', 'SOUL_SAND', 'SOUL_SOIL', 'MAGMA', 'GLOWSTONE', 'BASALT', 'QUARTZ_ORE', 'NETHER_GOLD_ORE'],
  end: ['AIR', 'END_STONE', 'OBSIDIAN', 'END_PORTAL_FRAME', 'CHORUS_PLANT', 'CHORUS_FLOWER']
};

console.log('シード ' + SEED + '\n');

['overworld', 'nether', 'end'].forEach(function (dim) {
  console.log('[' + WG.DIMS[dim].name + ']');
  var list = [].concat.apply([], AREAS[dim]);

  // 1. 同じシード
  var w1 = new WG.World(SEED, dim), w2 = new WG.World(SEED, dim), same = true;
  var t0 = Date.now();
  var d1 = list.map(function (c) { return digest(w1.chunk(c[0], c[1]).blocks); });
  var t1 = Date.now() - t0;
  list.forEach(function (c, i) { if (digest(w2.chunk(c[0], c[1]).blocks) !== d1[i]) same = false; });
  check(same, '同じシードで同じ結果（' + list.length + ' チャンク）');

  // 2. 生成順を変える（逆順・ばらばら・1 つおき）
  var orders = { 逆順: list.slice().reverse(), ばらばら: shuffled(list, 99), 一つおき: list.filter(function (c, i) { return i % 2; }).concat(list.filter(function (c, i) { return !(i % 2); })) };
  Object.keys(orders).forEach(function (name) {
    var w = new WG.World(SEED, dim), got = {};
    orders[name].forEach(function (c) { got[c[0] + ',' + c[1]] = digest(w.chunk(c[0], c[1]).blocks); });
    var ok = list.every(function (c, i) { return got[c[0] + ',' + c[1]] === d1[i]; });
    check(ok, '生成順を変えても同じ結果（' + name + '）');
  });

  // 違うシードでは違う結果
  var w3 = new WG.World(SEED + 'x', dim);
  var diff = list.some(function (c, i) { return digest(w3.chunk(c[0], c[1]).blocks) !== d1[i]; });
  check(diff, '違うシードでは違う結果');

  // 3. 地表だけの生成（オーバーワールドのみ）
  if (w1.gen.supportsSurfaceOnly) {
    var ws = new WG.World(SEED, dim), okS = true;
    list.forEach(function (c) {
      var a = ws.summary(c[0], c[1], ws.maxY), b = w1.summary(c[0], c[1], w1.maxY);
      if (digest(a.topId) !== digest(b.topId) || digest(new Uint8Array(a.topY.buffer)) !== digest(new Uint8Array(b.topY.buffer)) ||
        digest(a.floorId) !== digest(b.floorId)) okS = false;
    });
    check(okS, '地表だけの生成と、すべての生成で、地形図が一致');
  }

  // 4. 割合
  var count = new Float64Array(WG.BLOCKS.length), total = 0, bottom = true, w = w1;
  list.forEach(function (c) {
    var bl = w.chunk(c[0], c[1]).blocks;
    for (var i = 0; i < bl.length; i++) count[bl[i]]++;
    total += bl.length;
    if (dim !== 'end') for (var k = 0; k < 256; k++) if (bl[k] !== B.BEDROCK) bottom = false;
  });
  if (dim !== 'end') check(bottom, '最下段はすべて岩盤');
  if (dim === 'nether') {
    var topOk = true;
    list.forEach(function (c) { var bl = w.chunk(c[0], c[1]).blocks; for (var k = 0; k < 256; k++) if (bl[(127 << 8) | k] !== B.BEDROCK) topOk = false; });
    check(topOk, '最上段はすべて岩盤');
  }
  var missing = REQUIRED[dim].filter(function (k) { return !count[B[k]]; });
  check(!missing.length, '必要なブロックが出ている' + (missing.length ? '（不足: ' + missing.join(', ') + '）' : ''));

  var groups = {
    '空気': ['AIR'], '石・深層岩': ['STONE', 'DEEPSLATE'], '岩盤': ['BEDROCK'], '水': ['WATER'], '溶岩': ['LAVA'],
    '土・草': ['DIRT', 'GRASS'], '砂・砂岩・砂利': ['SAND', 'SANDSTONE', 'GRAVEL'],
    '木（原木と葉）': ['OAK_LOG', 'OAK_LEAVES', 'BIRCH_LOG', 'BIRCH_LEAVES', 'SPRUCE_LOG', 'SPRUCE_LEAVES', 'JUNGLE_LOG', 'JUNGLE_LEAVES', 'ACACIA_LOG', 'ACACIA_LEAVES'],
    '鉱石': WG.BLOCKS.filter(function (b) { return /ORE$/.test(b.key); }).map(function (b) { return b.key; }),
    '部屋（丸石・スポナー・宝箱）': ['COBBLESTONE', 'MOSSY_COBBLESTONE', 'SPAWNER', 'CHEST'],
    'ネザーラック': ['NETHERRACK'], 'ソウルサンド・ソイル': ['SOUL_SAND', 'SOUL_SOIL'], '玄武岩': ['BASALT'], 'グロウストーン': ['GLOWSTONE'],
    'エンドストーン': ['END_STONE'], '黒曜石': ['OBSIDIAN'], 'コーラス': ['CHORUS_PLANT', 'CHORUS_FLOWER'], 'ポータル枠': ['END_PORTAL_FRAME']
  };
  console.log('    ブロックの割合（' + list.length + ' チャンク、' + total + ' ブロック）');
  Object.keys(groups).forEach(function (g) {
    var n = 0;
    groups[g].forEach(function (k) { n += count[B[k]]; });
    if (n) console.log('      ' + (g + '　'.repeat(16)).slice(0, 15) + ('        ' + (n / total * 100).toFixed(3)).slice(-9) + ' %   ' + n);
  });

  // 5. 時間
  var avg = t1 / list.length;
  console.log('    生成時間  平均 ' + avg.toFixed(2) + ' ms / チャンク（' + list.length + ' チャンク ' + t1 + ' ms）');
  check(avg < 100, '1 チャンクあたり 100 ms 以下');
  console.log('');
});

// 境界：幹が東端の近く（x=13, 14）にあり、同じ高さの葉が東隣のチャンクの西端（x=0）に出ている例を数える
(function () {
  var a = new WG.World(SEED, 'overworld'), b = new WG.World(SEED, 'overworld');
  var logs = [B.OAK_LOG, B.BIRCH_LOG, B.SPRUCE_LOG, B.JUNGLE_LOG, B.ACACIA_LOG];
  var leaves = [B.OAK_LEAVES, B.BIRCH_LEAVES, B.SPRUCE_LEAVES, B.JUNGLE_LEAVES, B.ACACIA_LEAVES];
  var crossing = 0;
  for (var cz = -6; cz < 6; cz++) for (var cx = -6; cx < 6; cx++) {
    var w = a.chunk(cx, cz).blocks, e = a.chunk(cx + 1, cz).blocks;
    for (var z = 0; z < 16; z++) for (var y = 0; y < 384; y++) {
      var k = (y << 8) | (z << 4);
      var t = Math.max(logs.indexOf(w[k | 14]), logs.indexOf(w[k | 13]));
      if (t >= 0 && e[k] === leaves[t]) { crossing++; break; }
    }
  }
  check(crossing > 0, '境界をまたぐ木が両側に描かれている（' + crossing + ' 本）');
  var only = b.chunk(3, -2), full = a.chunk(3, -2);
  check(digest(only.blocks) === digest(full.blocks), '周りを生成しないで 1 チャンクだけ作っても同じ結果');
})();

// 見た目：草花とコーラス以外のブロックは、すべての面に 8×8 の見た目がある
(function () {
  var none = ['AIR', 'SHORT_GRASS', 'DANDELION', 'POPPY', 'CHORUS_PLANT', 'CHORUS_FLOWER'];
  var miss = WG.BLOCKS.filter(function (b) {
    return none.indexOf(b.key) < 0 && ['top', 'side', 'bottom'].some(function (f) { var t = WG.skinTexture(b.id, f); return !t || t.length !== 192; });
  }).map(function (b) { return b.key; });
  check(!miss.length, 'ブロックの見た目が読み込めている（' + (WG.BLOCKS.length - none.length) + ' 種）' + (miss.length ? ' 不足: ' + miss.join(', ') : ''));
})();

console.log('\n' + (failed ? failed + ' 件の確認に失敗しました' : 'すべての確認に通りました'));
process.exit(failed ? 1 : 0);
