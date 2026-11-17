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

// 歩く：平らな地面での速さとジャンプの高さが Minecraft と同じで、壁を抜けないこと
(function () {
  var wallX = 20;
  var flat = { minY: 0, maxY: 255, dim: { view: { yMax: 255 } }, block: function (x, y, z) {
    return y <= 10 || (x === wallX && y <= 12) ? B.STONE : B.AIR;
  } };
  flat.peekBlock = flat.block;
  var view = { upload: function () { return {}; }, remove: function () {}, render: function () {} };
  var w = new WG.Walker(view, flat, {}), i;
  w.spawn(0, 0);
  function speed(keys) {
    w.keys = keys; w.pos = [0.5, 11, 0.5]; w.vel = [0, 0, 0]; w.yaw = Math.PI;
    for (i = 0; i < 20; i++) w.tick();
    var q = w.pos.slice();
    for (i = 0; i < 20; i++) w.tick();
    return Math.hypot(w.pos[0] - q[0], w.pos[2] - q[2]);
  }
  var walk = speed({ KeyW: true }), sprint = speed({ KeyW: true, ControlLeft: true }), sneak = speed({ KeyW: true, ShiftLeft: true });
  check(Math.abs(walk - 4.317) < 0.01 && Math.abs(sprint - 5.612) < 0.01 && Math.abs(sneak - 1.295) < 0.01,
    '歩く速さ（毎秒 歩き ' + walk.toFixed(3) + '、ダッシュ ' + sprint.toFixed(3) + '、スニーク ' + sneak.toFixed(3) + ' ブロック）');
  w.keys = {}; w.pos = [0.5, 11, 0.5]; w.vel = [0, 0, 0];
  for (i = 0; i < 5; i++) w.tick();
  var y0 = w.pos[1], top = y0;
  w.keys = { Space: true }; w.tick(); w.keys = {};
  for (i = 0; i < 20; i++) { w.tick(); top = Math.max(top, w.pos[1]); }
  check(Math.abs(top - y0 - 1.2522) < 0.01, 'ジャンプの高さ ' + (top - y0).toFixed(4) + ' ブロック');
  w.pos = [15.5, 11, 0.5]; w.vel = [0, 0, 0]; w.yaw = -Math.PI / 2; w.keys = { KeyW: true, ControlLeft: true, Space: true };
  var inside = 0;
  for (i = 0; i < 200; i++) { w.tick(); if (w.hits(w.box())) inside++; }
  check(inside === 0 && w.pos[0] < wallX, '2 段の壁は越えられず、体が壁に重ならない');
})();

// 置いた・壊したブロックは、チャンクを作り直しても残る。ドロップはすべて実在のアイテムを指す。
(function () {
  var w = new WG.World(SEED, 'overworld');
  w.setBlock(5, 100, 5, B.OBSIDIAN); w.setBlock(-17, 10, 40, B.AIR);
  w.full.clear(); w.surf.clear(); w.sums.clear();
  var top = w.summary(0, 0, w.maxY).topY[(5 << 4) | 5];
  check(w.block(5, 100, 5) === B.OBSIDIAN && w.block(-17, 10, 40) === B.AIR && top === 100, '置いた・壊したブロックが作り直しても残り、地形図にも出る');
  var bad = Object.keys(WG.ITEMS).filter(function (k) { var d = WG.ITEMS[k].drop; return d && !WG.ITEMS[d]; });
  var noData = WG.PLACEABLE.filter(function (k) { return WG.ITEMS[k] == null; });
  check(!bad.length && !noData.length, 'ドロップと硬度の表がそろっている' + (bad.length || noData.length ? '（' + bad.concat(noData).join(', ') + '）' : ''));
})();

// ---- 水の流れ・光・クラフト・持ち物（遊ぶ） ----
function flatWorld(fn) {
  var set = new Map(), w = { minY: 0, maxY: 255, height: 256, dimKey: 'overworld', dim: { view: { yMax: 255 } } };
  w.block = function (x, y, z) { var k = x + ',' + y + ',' + z; return set.has(k) ? set.get(k) : fn(x, y, z); };
  w.peekBlock = w.block;
  w.setBlock = function (x, y, z, id) { set.set(x + ',' + y + ',' + z, id); return true; };
  return w;
}
var nullView = { upload: function () { return {}; }, remove: function () {}, render: function () {} };
var nullUI = (function () {
  var cl = { add: function () {}, remove: function () {}, toggle: function () {} }, el = { classList: cl };
  return { locked: function () { return true; }, lock: function () {}, unlock: function () {}, status: function () {}, hurt: function () {}, hud: el, inv: el, dead: el, cursor: el };
})();
(function () {
  // 水源 1 つから 7 マスまで広がり、水源を取ると引く
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), f = new WG.Fluids(w), i, n = 0, x, z;
  w.setBlock(0, 11, 0, B.WATER); f.notify(0, 11, 0);
  for (i = 0; i < 200; i++) f.tick();
  for (x = -9; x <= 9; x++) for (z = -9; z <= 9; z++) if (WG.FLUID[w.block(x, 11, z)]) n++;
  w.setBlock(0, 11, 0, B.AIR); f.notify(0, 11, 0);
  for (i = 0; i < 300; i++) f.tick();
  var left = 0;
  for (x = -9; x <= 9; x++) for (z = -9; z <= 9; z++) if (WG.FLUID[w.block(x, 11, z)]) left++;
  check(n === 113 && left === 0 && WG.FLUID_LEVEL[w.block(7, 11, 0)] === 0, '水が 7 マスまで広がり（' + n + ' マス）、水源を取ると引く（残り ' + left + '）');
  // 無限水源と、水と溶岩
  var w2 = flatWorld(function (x, y, z) { if (y <= 10) return B.STONE; if (y === 11 && !(x >= 0 && x <= 1 && z >= 0 && z <= 1)) return B.STONE; return 0; }), f2 = new WG.Fluids(w2);
  w2.setBlock(0, 11, 0, B.WATER); w2.setBlock(1, 11, 1, B.WATER); f2.notify(0, 11, 0); f2.notify(1, 11, 1);
  for (i = 0; i < 100; i++) f2.tick();
  var w3 = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), f3 = new WG.Fluids(w3);
  w3.setBlock(0, 11, 0, B.LAVA); w3.setBlock(3, 11, 0, B.WATER); f3.notify(0, 11, 0); f3.notify(3, 11, 0);
  for (i = 0; i < 400; i++) f3.tick();
  check(w2.block(0, 11, 1) === B.WATER && w2.block(1, 11, 0) === B.WATER && w3.block(0, 11, 0) === B.OBSIDIAN, '2 つの水源の間に水源ができ、水が溶岩の元に触れると黒曜石になる');
})();
(function () {
  var wd = new WG.World(SEED, 'overworld'), c = wd.chunk(0, 0), x = 8, z = 8, h = c.hmap[(z << 4) | x];
  for (var dx = -3; dx <= 3; dx++) for (var dz = -3; dz <= 3; dz++) for (var dy = 0; dy < 3; dy++) wd.setBlock(x + dx, h - 10 + dy, z + dz, B.AIR);
  wd.setBlock(x, h - 10, z, B.TORCH);
  var L = WG.chunkLight(wd, 0, 0), at = function (xx, yy, zz) { var v = L[((yy + 65) * 18 + zz + 1) * 18 + xx + 1]; return [v >> 4, v & 15]; };
  var sky = at(x, h + 1, z), t1 = at(x + 1, h - 10, z), t3 = at(x + 3, h - 10, z), deep = at(3, -40, 3);
  check(sky[0] === 15 && t1[0] === 0 && t1[1] === 13 && t3[1] === 11 && deep[0] === 0, '光：空の下は 15、地下の部屋は空の光 0、トーチの隣 13・3 マス先 11（' + [sky, t1, t3, deep].map(function (a) { return a.join('/'); }).join(' ') + '）');
})();
(function () {
  var m = WG.Craft.match;
  var r1 = m(['OAK_LOG', null, null, null], 2), r2 = m(['OAK_PLANKS', 'OAK_PLANKS', 'OAK_PLANKS', 'OAK_PLANKS'], 2);
  var r3 = m([null, 'COAL', null, null, 'STICK', null, null, null, null], 3), r4 = m(['STICK', 'COAL', null, null], 2);
  var f = new WG.Craft.Furnace(); f.slots = [{ key: 'RAW_IRON', n: 3 }, { key: 'COAL', n: 1 }, null];
  for (var i = 0; i < 700; i++) f.tick();
  check(r1.key === 'OAK_PLANKS' && r1.n === 4 && r2.key === 'CRAFTING_TABLE' && r3.key === 'TORCH' && r3.n === 4 && !r4 && f.slots[2] && f.slots[2].key === 'IRON_INGOT' && f.slots[2].n === 3,
    'クラフト（原木→板材 4、板材 4→作業台、石炭と棒→トーチ 4）と、かまど（粗い鉄 3 → 鉄インゴット 3）');
})();
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), p = new WG.Player();
  var g = new WG.Game(nullView, w, nullUI, p);
  g.inv.add('DIRT', 5); g.health = 13; g.spawnItem('COAL', 2, 3, 11, 3, 0, 10);
  g.walker.stop = function () {}; g.stop();
  var g2 = new WG.Game(nullView, w, nullUI, p), g3 = new WG.Game(nullView, flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), nullUI, p);
  check(g2.inv.slots[0] && g2.inv.slots[0].n === 5 && g2.health === 13 && g2.entities.length === 1 && g3.inv.slots[0] && g3.entities.length === 0,
    '表示や次元を切り替えても、持ち物と体力が残る（落ちているアイテムは世界ごと）');
  // 水中の壁で速く上がらない
  var rise = [false, true].map(function (wall) {
    var ww = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : (wall && x === 3 && y <= 40) ? B.STONE : y <= 40 ? B.WATER : 0 });
    var k = new WG.Walker(nullView, ww, {}); k.pos = [1.5, 11, 0.5]; k.prev = k.pos.slice(); k.yaw = -Math.PI / 2;
    k.keys = { KeyW: true, Space: true }; for (var i = 0; i < 40; i++) k.tick();
    return k.pos[1];
  });
  check(Math.abs(rise[0] - rise[1]) < 0.01, '水中で壁に沿っても、速く上がらない（' + rise.map(function (v) { return v.toFixed(2); }).join(' / ') + '）');
  // ブロックの中のアイテムは押し出される
  var w4 = flatWorld(function (x, y, z) { return y <= 20 ? B.STONE : 0; }), g4 = new WG.Game(nullView, w4, nullUI);
  g4.walker.pos = [50, 21, 50];
  var e = g4.spawnItem('DIRT', 1, 0.5, 20.5, 0.5, 0, 10);
  for (var i = 0; i < 40; i++) g4.tickEntities();
  check(e.y >= 21 - 1e-6, 'ブロックの中のアイテムが外へ押し出される（y ' + e.y.toFixed(2) + '）');
})();

console.log('\n' + (failed ? failed + ' 件の確認に失敗しました' : 'すべての確認に通りました'));
process.exit(failed ? 1 : 0);
