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

// 見た目：空気以外のブロックは、すべての面に 16×16 のドット絵の見た目がある
(function () {
  var none = ['AIR'];
  var miss = WG.BLOCKS.filter(function (b) {
    return none.indexOf(b.key) < 0 && ['top', 'side', 'bottom'].some(function (f) { var t = WG.skinTexture(b.id, f); return !t || t.length !== 768; });
  }).map(function (b) { return b.key; });
  check(!miss.length, 'ブロックの見た目（16×16 のドット絵）が読み込めている（' + (WG.BLOCKS.length - none.length) + ' 種）' + (miss.length ? ' 不足: ' + miss.join(', ') : ''));
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
  return { locked: function () { return true; }, lock: function () {}, unlock: function () {}, status: function () {}, hurt: function () {}, toast: function (t) { this.last = t; }, sleep: function () {}, hud: el, inv: el, dead: el, cursor: el };
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

// ---- 道具・チェスト・落ちる砂・昼と夜・ガラス ----
(function () {
  var hand = WG.mining('STONE', null), wood = WG.mining('STONE', { key: 'WOODEN_PICKAXE' }), stoneOnDia = WG.mining('DIAMOND_ORE', { key: 'STONE_PICKAXE' }),
    ironOnDia = WG.mining('DIAMOND_ORE', { key: 'IRON_PICKAXE' }), obs = WG.mining('OBSIDIAN', { key: 'DIAMOND_PICKAXE' });
  var t = function (m) { return Math.ceil(1 / m.perTick); };
  check(t(hand) === 150 && !hand.harvest && t(wood) === 23 && wood.harvest && !stoneOnDia.harvest && ironOnDia.harvest && t(obs) === 188,
    '道具：石は素手 7.5 秒でドロップなし・木のツルハシ 1.15 秒、ダイヤ鉱石は鉄のツルハシから、黒曜石はダイヤのツルハシで 9.4 秒');
  var r = WG.Craft.match(['OAK_PLANKS', 'BIRCH_PLANKS', 'OAK_PLANKS', null, 'STICK', null, null, 'STICK', null], 3);
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), g = new WG.Game(nullView, w, nullUI);
  g.inv.slots[0] = { key: 'GOLDEN_PICKAXE', n: 1, dmg: 31 }; g.wearTool(1.5);
  check(r && r.key === 'WOODEN_PICKAXE' && g.inv.slots[0] === null, 'ツルハシを作れ、耐久値がなくなると壊れる');
})();
(function () {
  var wd = new WG.World(SEED, 'overworld'), found = null;
  for (var cz = -6; cz <= 6 && !found; cz++) for (var cx = -6; cx <= 6 && !found; cx++) {
    var c = wd.chunk(cx, cz);
    for (var i = 0; i < c.blocks.length; i++) if (c.blocks[i] === B.CHEST) { found = [(cx << 4) + (i & 15), (i >> 8) - 64, (cz << 4) + ((i >> 4) & 15)]; break; }
  }
  var g = new WG.Game(nullView, wd, nullUI), a = g.chestAt(found[0], found[1], found[2]);
  var w2 = new WG.World(SEED, 'overworld'), b = new WG.Game(nullView, w2, nullUI).chestAt(found[0], found[1], found[2]);
  check(a.filter(Boolean).length >= 3 && JSON.stringify(a) === JSON.stringify(b), '地下のチェストの中身は、場所とシードで決まる（' + a.filter(Boolean).map(function (s) { return s.key + '×' + s.n; }).join(' ') + '）');
})();
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : (x === 0 && z === 0 && y >= 15 && y <= 17) ? B.SAND : (x === 0 && z === 0 && y === 14) ? B.DIRT : 0; });
  var g = new WG.Game(nullView, w, nullUI); g.walker.pos = [20.5, 11, 20.5]; g.setMode('creative');
  g.breakBlock(0, 14, 0);
  for (var i = 0; i < 60; i++) g.tick();
  check(w.block(0, 11, 0) === B.SAND && w.block(0, 13, 0) === B.SAND && w.block(0, 14, 0) === B.AIR && !g.falling.length, '下を壊すと、積んだ砂が全部落ちて積もる');
})();
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; });
  w.dim = { view: { yMax: 255 }, palette: WG.DIMS.overworld.palette };
  var g = new WG.Game(nullView, w, nullUI), d = [];
  [6000, 12000, 18000].forEach(function (t) { g.setTime(t); d.push(g.sky().dark); });
  g.setTime(23999); g.tick();
  check(d[0] === 0 && d[1] < 2 && d[2] === 11 && w.time === 0, '昼と夜：正午は空の光そのまま、真夜中は 11 段暗い、1 日 24000 刻み');
  check(WG.blockKind(B.GLASS) === 'solid' && !WG.OPAQUE[B.GLASS] && WG.LIGHT_BLOCK[B.GLASS] === 0 && WG.Craft.SMELT.SAND === 'GLASS', 'ガラス：通れないが光を通し、砂を焼いて作れる');
})();

// 空腹・ベッド・生き物
function playGame(w) { var g = new WG.Game(nullView, w, nullUI); g.walker.remesh = function () {}; g.walker.pos = [0.5, 11, 0.5]; g.walker.prev = g.walker.pos.slice(); g.walker.lightLevels = function () { return [15, 0]; }; g.mobs.spawnTick = function () {}; return g; }
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), g = playGame(w), i;
  g.walker.yaw = Math.PI; g.walker.keys = { KeyW: true, ControlLeft: true };
  for (i = 0; i < 20 * 60; i++) g.walker.tick();
  var afterRun = g.food;
  g.walker.keys = {}; g.food = 0; g.sat = 0; g.health = 5;
  for (i = 0; i < 20 * 30; i++) g.tick();
  var starved = g.health;
  g.food = 10; g.sat = 0; g.inv.slots[0] = { key: 'COOKED_BEEF', n: 1 }; g.walker.target = null; g.mouseR = true;
  for (i = 0; i < 32; i++) g.tick();
  check(afterRun < 20 && starved === 1 && !g.walker.canSprint === false && g.food === 18 && Math.abs(g.sat - 12.8) < 1e-6, '空腹：ダッシュで減り（1 分で ' + afterRun + '）、0 だと体力 1 まで減り、ステーキで 10 → ' + g.food + '（隠し ' + g.sat.toFixed(1) + '）');
})();
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), g = playGame(w), i;
  g.inv.slots[0] = { key: 'BED', n: 1 }; g.walker.yaw = 0;
  g.walker.target = { x: 0, y: 10, z: -3, id: B.STONE, px: 0, py: 11, pz: -3 }; g.place();
  var placed = w.block(0, 11, -3) === B.BED_FOOT_N && w.block(0, 11, -4) === B.BED_HEAD_N;
  w.time = 6000; g.useBed(0, 11, -4); var dayRefused = !g.sleeping;
  w.time = 18000; g.useBed(0, 11, -4);
  for (i = 0; i < 101; i++) g.tick();
  var morning = w.time < 100 && !g.sleeping;
  g.walker.pos = [30.5, 11, 30.5]; g.die(); g.respawn();
  var home = Math.abs(g.walker.pos[0]) < 3 && Math.abs(g.walker.pos[2] + 3) < 3;
  g.breakBlock(0, 11, -3);
  check(placed && dayRefused && morning && home && w.block(0, 11, -4) === B.AIR, 'ベッド：置ける、昼は眠れない、夜は眠ると朝になる、倒れるとベッドで目覚める、片方を壊すと両方なくなる');
  var n = flatWorld(function (x, y, z) { return y <= 10 ? B.NETHERRACK : 0; }); n.dimKey = 'nether';
  var gn = playGame(n); gn.setMode('survival'); n.setBlock(0, 11, -3, B.BED_FOOT_N); n.setBlock(0, 11, -4, B.BED_HEAD_N); gn.useBed(0, 11, -3);
  check(n.block(0, 11, -3) === B.AIR && gn.health < 20, 'ネザーでベッドを使うと爆発する（体力 20 → ' + gn.health + '）');
})();
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.GRASS : 0; }), g = playGame(w), i;
  w.time = 6000;
  var pig = g.mobs.spawn('PIG', 2.5, 11, 0.5); g.inv.slots[0] = { key: 'DIAMOND_AXE', n: 1 };
  g.attack(pig); for (i = 0; i < 11; i++) g.tick(); g.attack(pig); for (i = 0; i < 25; i++) g.tick();
  var meat = g.inv.slots.concat(g.entities).some(function (s) { return s && s.key === 'RAW_PORKCHOP'; });
  var z1 = g.mobs.spawn('ZOMBIE', 10.5, 11, 0.5); for (i = 0; i < 200; i++) g.tick();
  check(!g.mobs.list.includes(pig) && meat && z1.hp < 20, '生き物：豚はダイヤの斧 2 回で倒れて生の豚肉を落とす、昼のゾンビは燃える（体力 ' + z1.hp + '）');
  w.time = 18000; g.mobs.list.length = 0; g.health = 20; g.mobs.spawn('ZOMBIE', 8.5, 11, 0.5);
  for (i = 0; i < 200; i++) g.tick();
  var zombieHit = g.health < 20;
  g.mobs.list.length = 0; g.health = 20; var shots = 0, orig = g.mobs.shoot;
  g.mobs.shoot = function () { shots++; return orig.apply(this, arguments); };
  g.mobs.spawn('SKELETON', 10.5, 11, 0.5); for (i = 0; i < 200; i++) g.tick();
  g.mobs.list.length = 0; g.health = 20; g.walker.pos = [0.5, 11, 0.5];
  var bm = g.mobs.spawn('BOMBER', 6.5, 11, 0.5);
  for (i = 0; i < 200 && g.mobs.list.includes(bm); i++) g.tick();
  var holes = 0; for (var hx = -8; hx <= 12; hx++) for (var hz = -8; hz <= 8; hz++) for (var hy = 5; hy <= 10; hy++) if (w.block(hx, hy, hz) === B.AIR) holes++;
  check(zombieHit && shots >= 2 && !g.mobs.list.includes(bm) && holes > 10, '敵：夜のゾンビは殴り、スケルトンは矢を射ち（' + shots + ' 本）、ハゼゴケは近づいて爆発する');
})();

// 泳ぐ・ブロックを持ったまま掘る
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : y <= 30 ? B.WATER : 0; });
  var wk = new WG.Walker(nullView, w), i; wk.remesh = function () {}; wk.pos = [0.5, 20, 0.5]; wk.prev = wk.pos.slice(); wk.ready = true; wk.yaw = Math.PI; wk.pitch = 0;
  wk.keys = { KeyW: true, ControlLeft: true }; for (i = 0; i < 100; i++) wk.tick();
  var z0 = wk.pos[2]; for (i = 0; i < 100; i++) wk.tick();
  var speed = (wk.pos[2] - z0) / 5;
  check(wk.swimming && wk.height() === 0.6 && Math.abs(speed - 5.6) < 0.2, '水に潜ってダッシュすると泳ぐ（高さ 0.6、秒速 ' + speed.toFixed(2) + ' ブロック）');
  var held = WG.mining('SAND', { key: 'DIRT', n: 5 }), stoneOnOre = WG.mining('COAL_ORE', { key: 'STONE', n: 5 });
  check(held.perTick > 0 && !held.match && !stoneOnOre.harvest, 'ブロックを持ったままでも素手と同じ速さで掘れる（道具の扱いにならない）');
})();

// 鉱脈と構造物
(function () {
  var wd = new WG.World(SEED, 'overworld'), sizes = [], seen = new Set();
  for (var cz = 0; cz < 4; cz++) for (var cx = 0; cx < 4; cx++) wd.chunk(cx, cz);
  // 石炭のつながった塊の大きさ（チャンク 1,1 の中から数える）
  var c = wd.chunk(1, 1);
  for (var i = 0; i < c.blocks.length; i++) {
    if (c.blocks[i] !== B.COAL_ORE || seen.has(i)) continue;
    var st = [i], n = 0; seen.add(i);
    while (st.length) {
      var k = st.pop(); n++;
      var x = k & 15, z = (k >> 4) & 15, y = k >> 8;
      [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(function (d) {
        var xx = x + d[0], yy = y + d[1], zz = z + d[2];
        if (xx < 0 || xx > 15 || zz < 0 || zz > 15 || yy < 0 || yy >= 384) return;
        var j = (yy << 8) | (zz << 4) | xx;
        if (c.blocks[j] === B.COAL_ORE && !seen.has(j)) { seen.add(j); st.push(j); }
      });
    }
    sizes.push(n);
  }
  var big = sizes.filter(function (n) { return n >= 4; }).length;
  check(sizes.length > 0 && big / sizes.length > 0.5, '鉱石は塊（鉱脈）で出る：石炭の塊 ' + sizes.length + ' 個、4 個以上の塊が ' + big + ' 個');
  // 構造物：見つかった村の家の真ん中の床と、チャンクの作る順番によらないこと
  var S = wd.gen.structures, vil = null, tem = null, mine = null;
  for (var rz = -3; rz < 3; rz++) for (var rx = -3; rx < 3; rx++) {
    vil = vil || S.village(rx, rz); mine = mine || S.mineshaft(rx, rz);
  }
  for (rz = -6; rz < 6 && !tem; rz++) for (rx = -6; rx < 6 && !tem; rx++) tem = S.temple(rx, rz);
  var house = vil && vil.parts.filter(function (p) { return p.kind === 'house'; })[0];
  var hx = house.ox + house.ux * (house.W >> 1) + house.vx, hz = house.oz + house.uz * (house.W >> 1) + house.vz;
  var a = new WG.World(SEED, 'overworld'), b = new WG.World(SEED, 'overworld');
  a.block(hx + 40, 0, hz + 40); var ida = a.block(hx, house.y + 1, hz), idb = b.block(hx, house.y + 1, hz);
  var doorAir = ida === B.AIR && a.block(hx, house.y + 2, hz) === B.AIR && a.block(hx, house.y, hz) !== B.AIR;
  check(!!vil && !!tem && !!mine && doorAir && ida === idb && a.block(tem.x, tem.y + 11, tem.z) === B.GOLD_BLOCK, '構造物：村（家 ' + vil.parts.filter(function (p) { return p.kind === 'house'; }).length + ' 軒）・砂漠のピラミッド・廃坑ができ、作る順番によらず同じ');
  var shaft = mine.segs[0], mx = shaft.x + shaft.dx * 2, mz = shaft.z + shaft.dz * 2;
  var mw = new WG.World(SEED, 'overworld'), ground = mw.gen.column(mx, mz).h;
  check(shaft.y + 3 > ground - 4 || mw.block(mx, shaft.y + 1, mz) === B.AIR, '廃坑の通路が掘られている');
})();

// アイテム図鑑から加えたもの
(function () {
  check(Object.keys(WG.ICONS).length >= 120 && WG.itemIcon16('DIAMOND_SWORD').length === 1024 && WG.BLOCKS.length <= 65535, 'アイテムのアイコン（ドット絵 ' + Object.keys(WG.ICONS).length + ' 個、16×16）、ブロックは ' + WG.BLOCKS.length + ' 種類（2 バイトで持つ）');
  var w = flatWorld(function (x, y, z) { return y <= 10 ? (y === 10 ? B.GRASS : B.DIRT) : 0; }), g = playGame(w), i, t;
  w.setBlock(3, 10, 0, B.WATER);
  function aim(x, y, z, px, py, pz) { g.walker.target = { x: x, y: y, z: z, id: w.block(x, y, z), px: px, py: py, pz: pz }; }
  g.inv.slots[0] = { key: 'IRON_HOE', n: 1 }; g.inv.sel = 0; aim(2, 10, 0, 2, 11, 0); g.use();
  var tilled = w.block(2, 10, 0) === B.FARMLAND_MOIST;
  g.inv.slots[0] = { key: 'WHEAT_SEEDS', n: 1 }; aim(2, 10, 0, 2, 11, 0); g.use();
  var planted = w.block(2, 11, 0) === B.WHEAT_0;
  for (t = 0; t < 2000 && w.block(2, 11, 0) !== B.WHEAT_7; t++) g.growCrop(2, 11, 0, 0);
  g.breakBlock(2, 11, 0, true);
  var wheat = g.entities.some(function (e) { return e.key === 'WHEAT'; });
  check(tilled && planted && t < 2000 && wheat, '農業：クワで耕すと水の近くで湿った耕地、種を植えると育ち（' + t + ' 回のランダムな刻み）、実ると小麦がとれる');
  var a = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), ga = playGame(a);
  ga.health = 20; ga.hurtPlayer(10, 3, 0); var plain = 20 - ga.health; ga.invuln = 0;
  ['HELMET', 'CHESTPLATE', 'LEGGINGS', 'BOOTS'].forEach(function (p, k) { ga.armor[k] = { key: 'DIAMOND_' + p, n: 1 }; });
  ga.health = 20; ga.hurtPlayer(10, 3, 0);
  check(plain === 10 && Math.abs(20 - ga.health - 3) < 1e-9 && ga.armor[0].dmg === 2, '防具：ダイヤ一式で 10 ダメージが 3 に減り、耐久値が減る（Minecraft の式）');
  var zb = ga.mobs.spawn('ZOMBIE', 0.5, 11, -8);
  ga.inv.clear(); ga.inv.slots[0] = { key: 'BOW', n: 1 }; ga.inv.slots[1] = { key: 'ARROW', n: 3 }; ga.inv.sel = 0;
  ga.walker.eye = [0.5, 12.62, 0.5]; ga.walker.dir = [0, 0.05, -1];
  ga.mouseR = true; for (i = 0; i < 25; i++) ga.tickBow(); ga.mouseR = false; ga.tickBow();
  for (i = 0; i < 20; i++) ga.mobs.tickArrows();
  check(zb.hp <= 14 && ga.inv.slots[1].n === 2, '弓：引き切って射るとゾンビに 6 以上のダメージ（体力 20 → ' + zb.hp + '）、矢を 1 本使う');
  // 扉・ハーフブロック・段差・柵・はしご
  var d = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), gd = playGame(d);
  gd.walker.yaw = 0; gd.inv.slots[0] = { key: 'OAK_DOOR', n: 1 }; gd.inv.sel = 0;
  gd.walker.target = { x: 0, y: 10, z: -3, id: B.STONE, px: 0, py: 11, pz: -3 }; gd.use();
  var placed = d.block(0, 11, -3) === B.OAK_DOOR_NCL && d.block(0, 12, -3) === B.OAK_DOOR_NCU;
  gd.inv.slots[0] = null; gd.walker.target = { x: 0, y: 11, z: -3, id: d.block(0, 11, -3), px: 0, py: 11, pz: -2 }; gd.use();
  check(placed && d.block(0, 12, -3) === B.OAK_DOOR_NOU, '扉：2 マスで置け、右クリックで上下とも開く');
  var st = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : (y === 11 && z <= -2 && z >= -12) ? B.OAK_SLAB : 0; }), gs = playGame(st);
  gs.walker.yaw = 0; gs.walker.keys = { KeyW: true }; gs.walker.onGround = true;
  for (i = 0; i < 30; i++) gs.walker.tick();
  var fe = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : (y === 11 && z === -2) ? B.OAK_FENCE : 0; }), gf = playGame(fe);
  gf.walker.yaw = 0; gf.walker.keys = { KeyW: true, Space: true }; gf.walker.onGround = true;
  for (i = 0; i < 60; i++) gf.walker.tick();
  var la = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : (z === -1 && y < 20) ? B.STONE : (x === 0 && z === 0 && y >= 11 && y < 20) ? B.LADDER_S : 0; }), gl = playGame(la);
  gl.walker.yaw = 0; gl.walker.keys = { KeyW: true }; gl.walker.onGround = true;
  for (i = 0; i < 40; i++) gl.walker.tick();
  check(Math.abs(gs.walker.pos[1] - 11.5) < 1e-6 && gf.walker.pos[2] > -1.4 && gl.walker.pos[1] > 15, '段差 0.5 は歩いて上がり（y ' + gs.walker.pos[1].toFixed(2) + '）、柵は越えられず、はしごは登れる（2 秒で y ' + gl.walker.pos[1].toFixed(1) + '）');
  check(WG.Craft.match(['WHEAT', 'WHEAT', 'WHEAT', null, null, null, null, null, null], 3).key === 'BREAD' &&
    WG.Craft.match(['IRON_INGOT', null, 'IRON_INGOT', null, 'IRON_INGOT', null, null, null, null], 3).key === 'BUCKET' &&
    WG.Craft.match(['COBBLESTONE', null, null, 'COBBLESTONE', 'COBBLESTONE', null, 'COBBLESTONE', 'COBBLESTONE', 'COBBLESTONE'], 3).key === 'COBBLESTONE_STAIRS',
    'レシピ：パン、バケツ、階段（ほか剣・クワ・弓・矢・防具・扉・柵・はしご・ハーフブロックなど）');
})();

// レッドストーン・エンチャント・ポーション・釣り・盾・階段・踏み荒らし
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), g = playGame(w), i;
  g.walker.pos = [20.5, 11, 20.5];
  w.setBlock(0, 11, 0, B.LEVER_F); for (var x = 1; x <= 3; x++) w.setBlock(x, 11, 0, B.REDSTONE_WIRE_0); w.setBlock(4, 11, 0, B.REDSTONE_LAMP);
  for (i = 0; i < 3; i++) g.tick();
  g.rs.toggleLever(0, 11, 0); for (i = 0; i < 3; i++) g.tick();
  var pw = [1, 2, 3].map(function (x) { return WG.wirePower(w.block(x, 11, 0)); }).join(',');
  w.setBlock(0, 11, 4, B.REDSTONE_BLOCK); w.setBlock(1, 11, 4, B.STONE); w.setBlock(2, 11, 4, B.REDSTONE_WALL_TORCH_E);
  w.setBlock(0, 11, 8, B.LEVER_F); w.setBlock(1, 11, 8, B.PISTON_E); w.setBlock(2, 11, 8, B.COBBLESTONE);
  for (i = 0; i < 4; i++) g.tick(); g.rs.toggleLever(0, 11, 8); for (i = 0; i < 4; i++) g.tick();
  check(pw === '15,14,13' && w.block(4, 11, 0) === B.REDSTONE_LAMP_ON && w.block(2, 11, 4) === B.REDSTONE_WALL_TORCH_E && w.block(3, 11, 8) === B.COBBLESTONE && w.block(2, 11, 8) === B.PISTON_HEAD_E,
    'レッドストーン：レバーの動力が粉で 1 ずつ弱まり（' + pw + '）ランプが点く、動力ブロックの隣のトーチ、ピストンが押す');
  var offers = WG.enchantOffers('DIAMOND_SWORD', 15, Math.random), r = WG.anvilCombine({ key: 'IRON_PICKAXE', n: 1, ench: { EFFICIENCY: 3 } }, { key: 'ENCHANTED_BOOK', n: 1, ench: { EFFICIENCY: 3 } });
  check(offers[2].cost === 30 && Object.keys(offers[2].ench).length >= 1 && r.item.ench.EFFICIENCY === 4, 'エンチャント：本棚 15 台で最大レベル 30 の候補、金床で同じレベルを重ねると 1 つ上がる');
  var st = new WG.BrewingStand(); st.slots = [{ key: 'POTION_WATER', n: 1 }, null, null, { key: 'NETHER_WART', n: 1 }, { key: 'BLAZE_POWDER', n: 1 }];
  for (i = 0; i < 405; i++) st.tick(); st.slots[3] = { key: 'BLAZE_POWDER', n: 1 }; for (i = 0; i < 405; i++) st.tick();
  check(st.slots[0].key === 'POTION_STRENGTH' && WG.brew('POTION_STRENGTH', 'GUNPOWDER') === 'SPLASH_POTION_STRENGTH' && WG.brew('POTION_SWIFTNESS', 'FERMENTED_SPIDER_EYE') === 'POTION_SLOWNESS',
    'ポーション：水 → 奇妙 → 力（醸造台 20 秒ずつ）、火薬で投げるポーション、発酵したクモの目で逆の効果');
  var c = {}; for (i = 0; i < 2000; i++) { var l = WG.fishLoot(0, Math.random); c[l.key] = (c[l.key] || 0) + 1; }
  var fish = (c.COD || 0) + (c.SALMON || 0) + (c.PUFFERFISH || 0) + (c.TROPICAL_FISH || 0);
  check(fish > 1600 && fish < 1800, '釣り：魚が約 85%（2000 回で ' + fish + '）');
  g.inv.slots[0] = { key: 'SHIELD', n: 1 }; g.inv.sel = 0; g.mouseR = true; for (i = 0; i < 6; i++) g.tickExtra(); g.walker.yaw = 0; g.walker.pos = [0.5, 11, 0.5];
  g.health = 20; g.invuln = 0; g.hurtPlayer(5, 0.5, -3); var front = g.health; g.invuln = 0; g.hurtPlayer(5, 0.5, 4); g.mouseR = false;
  check(front === 20 && g.health === 15, '盾：構えると前からの攻撃を防ぎ、後ろからは防げない');
  check(WG.stairShape(B.OAK_STAIRS_N, function (dx, dz) { return dx === 0 && dz === -1 ? B.OAK_STAIRS_W : 0; }) === 'OL' && WG.blockBoxes(B.OAK_STAIRS_N_T)[0][1] === 8,
    '階段：隣の階段で角の形（外角・内角）になり、逆さまにも置ける');
  var f = flatWorld(function (x, y, z) { return y <= 9 ? B.DIRT : y === 10 ? B.FARMLAND : 0; }), gf = playGame(f);
  check(gf.trample(0, 10, 0, 3) && f.block(0, 10, 0) === B.DIRT && !gf.trample(1, 10, 0, 0.4), '耕地は高い所から落ちると土に戻り、0.5 未満では戻らない');
})();

// ホッパー・コンパレーター・オブザーバー・ディスペンサー
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), g = playGame(w), i;
  g.walker.pos = [30.5, 11, 30.5];
  w.setBlock(0, 13, 0, B.CHEST); w.chests.set('0,13,0', new Array(27).fill(null)); w.chests.get('0,13,0')[0] = { key: 'RAW_IRON', n: 2 };
  w.setBlock(0, 12, 0, B.HOPPER_D); w.setBlock(0, 11, 0, B.FURNACE);
  for (i = 0; i < 40; i++) g.tick();
  var fur = w.furnaces.get('0,11,0'), moved = fur && fur.slots[0] && fur.slots[0].n === 2;
  w.setBlock(4, 11, 0, B.CHEST); w.chests.set('4,11,0', new Array(27).fill(null));
  for (var k = 0; k < 9; k++) w.chests.get('4,11,0')[k] = { key: 'COBBLESTONE', n: 64 };
  w.setBlock(5, 11, 0, B.COMPARATOR_EC); w.setBlock(6, 11, 0, B.REDSTONE_WIRE_0);
  for (i = 0; i < 12; i++) g.tick();
  w.setBlock(10, 11, 0, B.OBSERVER_W); w.setBlock(11, 11, 0, B.REDSTONE_LAMP); for (i = 0; i < 3; i++) g.tick();
  w.setBlock(9, 11, 0, B.STONE); var lit = 0; for (i = 0; i < 6; i++) { g.tick(); if (w.block(11, 11, 0) === B.REDSTONE_LAMP_ON) lit++; }
  w.setBlock(0, 11, 6, B.LEVER_F); w.setBlock(1, 11, 6, B.DISPENSER_E); g.container(1, 11, 6).slots[0] = { key: 'WATER_BUCKET', n: 1 };
  for (i = 0; i < 3; i++) g.tick(); g.rs.toggleLever(0, 11, 6); for (i = 0; i < 8; i++) g.tick();
  check(moved && w.compOut.get('5,11,0') === 5 && lit === 2 && w.block(2, 11, 6) === B.WATER,
    'ホッパー（チェスト → かまど）、コンパレーター（チェストの 1/3 で強さ 5）、オブザーバー（2 刻みの信号）、ディスペンサー（水をまく）');
})();

console.log('\n' + (failed ? failed + ' 件の確認に失敗しました' : 'すべての確認に通りました'));
process.exit(failed ? 1 : 0);
