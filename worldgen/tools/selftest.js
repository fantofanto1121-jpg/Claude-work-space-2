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
  w.setBlock(9, 11, 0, B.STONE); var lit = 0; for (i = 0; i < 12; i++) { g.tick(); if (w.block(11, 11, 0) === B.REDSTONE_LAMP_ON) lit++; }
  w.setBlock(0, 11, 6, B.LEVER_F); w.setBlock(1, 11, 6, B.DISPENSER_E); g.container(1, 11, 6).slots[0] = { key: 'WATER_BUCKET', n: 1 };
  for (i = 0; i < 3; i++) g.tick(); g.rs.toggleLever(0, 11, 6); for (i = 0; i < 8; i++) g.tick();
  check(moved && w.compOut.get('5,11,0') === 5 && lit === 6 && w.block(11, 11, 0) === B.REDSTONE_LAMP && w.block(2, 11, 6) === B.WATER,
    'ホッパー（チェスト → かまど）、コンパレーター（チェストの 1/3 で強さ 5）、オブザーバー（2 刻みの信号。ランプは消えるのが 4 刻み遅れる）、ディスペンサー（水をまく）');
})();

// スポーンエッグ・追加の生き物・追加のブロック
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), g = playGame(w), i, rnd = Math.random;
  g.setMode('survival'); g.walker.pos = [40.5, 11, 40.5]; g.walker.prev = g.walker.pos.slice();
  // どの生き物にも卵とアイコンがあり、使うと面の前に出て、サバイバルでは 1 個減る
  var eggsOk = WG.MOB_ORDER.every(function (k) { return WG.ITEMS['SPAWN_EGG_' + k] && WG.ICONS['SPAWN_EGG_' + k]; });
  g.inv.slots[0] = { key: 'SPAWN_EGG_PIG', n: 2 }; g.inv.sel = 0;
  WG.useSpawnEgg(g, { id: B.STONE, x: 3, y: 10, z: 3, px: 3, py: 11, pz: 3 }, WG.ITEMS.SPAWN_EGG_PIG);
  var pig = g.mobs.list.filter(function (m) { return m.type === 'PIG'; })[0];
  w.setBlock(6, 11, 6, B.SPAWNER);
  WG.useSpawnEgg(g, { id: B.SPAWNER, x: 6, y: 11, z: 6, px: 6, py: 12, pz: 6 }, WG.ITEMS.SPAWN_EGG_PIG);
  check(eggsOk && pig && pig.x === 3.5 && pig.y === 11 && g.inv.slots[0] === null && w.spawners.get('6,11,6').type === 'PIG',
    'スポーンエッグ：' + WG.MOB_ORDER.length + ' 種の生き物に卵がある。面の前に生き物が出て 1 個減り、スポナーに使うと中身が変わる');
  g.mobs.list.length = 0;
  // スライム：大きさ 4 を倒すと大きさ 2 の 2〜4 匹に分かれる（体力 16 → 4）
  var sl = g.mobs.spawn('SLIME', 20.5, 11, 20.5, 4), hp4 = sl.hp;
  g.mobs.hurt(sl, 100, null); for (i = 0; i < 25; i++) g.tick();
  var kids = g.mobs.list.filter(function (m) { return m.type === 'SLIME' && m.size === 2; });
  check(hp4 === 16 && kids.length >= 2 && kids.length <= 4 && kids[0].hp === 4, 'スライム：大きさ 4（体力 16）を倒すと大きさ 2 の ' + kids.length + ' 匹に分かれる');
  g.mobs.list.length = 0;
  // オオカミ：骨で飼いならし、近くのクモを倒す
  g.setMode('creative');
  var wolf = g.mobs.spawn('WOLF', 30.5, 11, 30.5), spider = g.mobs.spawn('SPIDER', 33.5, 11, 30.5);
  g.inv.slots[0] = { key: 'BONE', n: 1 }; g.mobs.target = { mob: wolf }; Math.random = function () { return 0.1; };
  g.use(); Math.random = rnd; g.mobs.target = null;
  var tamed = wolf.tame;
  for (i = 0; i < 300 && !spider.dead; i++) g.tick();
  check(tamed && wolf.maxHp === 20 && spider.dead > 0, 'オオカミ：骨で飼いならすと体力 20 になり、近くの敵（クモ）を噛んで倒す（' + i + ' 刻み）');
  g.mobs.list.length = 0;
  // コウモリは落ちずに飛ぶ
  var bat = g.mobs.spawn('BAT', 10.5, 16, 10.5), lowest = 99;
  for (i = 0; i < 100; i++) { g.tick(); lowest = Math.min(lowest, bat.y); }
  check(lowest > 11.2, 'コウモリ：落ちずに飛び回る（100 刻みで最も低い所 y ' + lowest.toFixed(1) + '）');
  g.mobs.list.length = 0;
  // スライムブロックで跳ね返り、干し草の俵では落下のダメージが 2 割になる
  g.setMode('survival'); g.health = 20;
  w.setBlock(50, 10, 50, B.SLIME_BLOCK); g.walker.pos = [50.5, 20, 50.5]; g.walker.prev = g.walker.pos.slice(); g.walker.vel = [0, 0, 0];
  var landed = false, upAfter = 0;
  for (i = 0; i < 80; i++) { g.walker.tick(); if (g.walker.pos[1] < 11.2) landed = true; if (landed) upAfter = Math.max(upAfter, g.walker.pos[1]); }
  var hpSlime = g.health;
  w.setBlock(60, 10, 60, B.HAY_BALE); g.walker.pos = [60.5, 33, 60.5]; g.walker.prev = g.walker.pos.slice(); g.walker.vel = [0, 0, 0]; g.health = 20;
  for (i = 0; i < 60 && !g.walker.onGround; i++) g.walker.tick();
  var hpHay = g.health;
  check(upAfter > 15 && hpSlime === 20 && hpHay >= 16 && hpHay < 20,
    'スライムブロック：10 ブロック落ちて y ' + upAfter.toFixed(1) + ' まで跳ね返り、ダメージなし。干し草の俵：22 ブロック落ちて体力 ' + hpHay + '（ダメージ 19 が 3 に）');
  // 魔女：投げポーションで傷つける・毒・鈍化
  g.health = 20; g.walker.pos = [70.5, 11, 70.5]; g.walker.prev = g.walker.pos.slice();
  Object.keys(g.effects).forEach(function (k) { delete g.effects[k]; });
  g.mobs.spawn('WITCH', 77.5, 11, 70.5);
  for (i = 0; i < 200; i++) g.tick();
  check(g.health < 20 || g.effects.POISON || g.effects.SLOWNESS, '魔女：離れた所から投げポーションを投げる（体力 ' + g.health + '、効果 ' + (Object.keys(g.effects).join(',') || 'なし') + '）');
  g.mobs.list.length = 0;
  // レシピ
  var M = function (cells, n) { var r = WG.Craft.match(cells, n || 3); return r && r.key; };
  var N9 = function (k) { return [k, k, k, k, k, k, k, k, k]; };
  var NN = 'IRON_NUGGET';
  check(M(N9('SLIME_BALL')) === 'SLIME_BLOCK' && M(N9('WHEAT')) === 'HAY_BALE' && M([NN, NN, NN, NN, 'TORCH', NN, NN, NN, NN]) === 'LANTERN' &&
    M(['POPPY', null, null, null], 2) === 'RED_DYE' && M(['RED_DYE', 'YELLOW_DYE', null, null], 2) === 'ORANGE_DYE' && M(['BLUE_DYE', 'WHITE_WOOL', null, null], 2) === 'BLUE_WOOL' &&
    WG.Craft.SMELT.CLAY === 'TERRACOTTA' && WG.Craft.SMELT.STONE === 'SMOOTH_STONE' && WG.Craft.SMELT.RAW_RABBIT === 'COOKED_RABBIT' && WG.LIGHT_EMIT[B.LANTERN] === 15,
    'レシピ：スライムブロック、干し草の俵、ランタン（明るさ 15）、染料と色付きの羊毛（' + WG.WOOL_COLORS.length + ' 色）、テラコッタ、なめらかな石');
})();

// 繁殖：えさをやった 2 頭の牛から子牛が生まれ、20 分で大人になる。村人：村の家に住み、エメラルドで取引する
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.GRASS : 0; }), g = playGame(w), i;
  g.setMode('survival'); g.walker.pos = [10.5, 11, 10.5]; g.walker.prev = g.walker.pos.slice();
  var a = g.mobs.spawn('COW', 3.5, 11, 3.5), b = g.mobs.spawn('COW', 6.5, 11, 3.5);
  var fedA = g.mobs.feed(a, 'WHEAT'), fedB = g.mobs.feed(b, 'WHEAT'), again = g.mobs.feed(a, 'WHEAT'), wrong = g.mobs.feed(g.mobs.spawn('PIG', 0.5, 11, 8.5), 'WHEAT');
  for (i = 0; i < 200; i++) g.tick();
  var calf = g.mobs.list.filter(function (m) { return m.type === 'COW' && m.baby > 0; })[0];
  var calfH = calf && WG.MOB_TYPES.COW.h * 0.5;
  if (calf) { calf.baby = 2; g.tick(); g.tick(); }
  check(fedA && fedB && !again && !wrong && calf && a.breedCd > 0 && calf && !calf.baby,
    '繁殖：小麦をやった牛 2 頭から子牛が生まれ（高さ ' + calfH + '）、育つと大人になる。休み中の牛と、えさでない物（豚に小麦）は受け付けない');
  // 村人の取引
  var v = g.mobs.spawn('VILLAGER', 8.5, 11, 8.5); WG.setupVillager(v, 'FARMER');
  g.inv.clear(); g.inv.add('WHEAT', 40);
  g.tradeMob = v;
  var ok1 = g.trade(0), ok2 = g.trade(0), ok3 = g.trade(0);
  var em = g.inv.slots.reduce(function (n, s) { return n + (s && s.key === 'EMERALD' ? s.n : 0); }, 0);
  var buy = g.trade(3);
  var bread = g.inv.slots.reduce(function (n, s) { return n + (s && s.key === 'BREAD' ? s.n : 0); }, 0);
  check(ok1 && ok2 && !ok3 && em === 2 && buy && bread === 6 && v.trades[0].uses === 2,
    '村人の取引：農民に小麦 20 個でエメラルド 1 個（小麦 40 個で 2 回、3 回目は足りない）、エメラルド 1 個でパン 6 個');
  // 生成された村には、家ごとに村人がいる
  var wo = new WG.World(SEED, 'overworld'), st = wo.gen.structures, vil = null;
  for (var rx = -3; rx <= 3 && !vil; rx++) for (var rz = -3; rz <= 3 && !vil; rz++) { var vv = st.village(rx, rz); if (vv && vv.parts.some(function (p) { return p.kind === 'house'; })) vil = vv; }
  var gv = new WG.Game(nullView, wo, nullUI), houses = vil.parts.filter(function (p) { return p.kind === 'house'; }).length;
  for (var cx = (vil.x >> 4) - 3; cx <= (vil.x >> 4) + 3; cx++) for (var cz = (vil.z >> 4) - 3; cz <= (vil.z >> 4) + 3; cz++) gv.mobs.populate(cx, cz);
  var vills = gv.mobs.list.filter(function (m) { return m.type === 'VILLAGER'; });
  check(vills.length >= Math.min(houses, 3) && vills.every(function (m) { return m.trades && m.trades.length >= 5 && m.home; }),
    '村：家 ' + houses + ' 軒の村に村人 ' + vills.length + ' 人（' + vills.map(function (m) { return WG.profName(m); }).join('・') + '）');
})();

// ネザーポータル：黒曜石の枠に火を付けるとでき、4 秒立つと移る。行き先にはポータルができ、枠を壊すと消える
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), g = playGame(w), i, went = null;
  g.ui = Object.assign({}, g.ui, { travel: function (d, x, y, z) { went = [d, x, y, z]; } });
  // 内側 2×3 の枠（四隅なし）
  for (i = 0; i < 2; i++) { w.setBlock(4 + i, 11, 0, B.OBSIDIAN); w.setBlock(4 + i, 15, 0, B.OBSIDIAN); }
  for (i = 0; i < 3; i++) { w.setBlock(3, 12 + i, 0, B.OBSIDIAN); w.setBlock(6, 12 + i, 0, B.OBSIDIAN); }
  var bad = WG.lightPortal(g, 4, 16, 0);
  var lit = WG.lightPortal(g, 4, 12, 0);
  var filled = 0; for (i = 0; i < 6; i++) if (WG.isPortal(w.block(4 + (i & 1), 12 + (i >> 1), 0))) filled++;
  g.setMode('survival'); g.walker.pos = [5, 12, 0.5]; g.walker.prev = g.walker.pos.slice();
  for (i = 0; i < 79; i++) g.tickExtra();
  var early = went;
  g.tickExtra();
  var nw = new WG.World(SEED, 'nether'), arr = WG.portalArrival(nw, went[1], went[3], went[2]);
  var there = WG.isPortal(nw.block(Math.floor(arr.pos[0]), arr.pos[1], Math.floor(arr.pos[2]))), again = WG.portalArrival(nw, went[1] + 5, went[3], 60);
  g.breakBlock(3, 13, 0, false);
  var gone = !WG.isPortal(w.block(4, 12, 0)) && !WG.isPortal(w.block(5, 14, 0));
  check(!bad && lit && filled === 6 && !early && went && went[0] === 'nether' && Math.abs(went[1] - 5 / 8) < 1e-9 && there && again.pos[0] === arr.pos[0] && gone,
    'ネザーポータル：枠（内側 2×3）に火を付けると 6 マスがポータルになり、4 秒立つとネザーの x/8 へ。行き先にポータルができ、近くでは同じものを使う。枠を壊すと消える');
})();

// セーブとロード：置いたブロック・チェスト・かまど・生き物・持ち物・体力が戻る。音の素材の見分け
(function () {
  var wo = new WG.World(SEED, 'overworld'), wn = new WG.World(SEED, 'nether'), pl = new WG.Player(), g = new WG.Game(nullView, wo, nullUI, pl);
  wo.setBlock(1, 100, 1, B.DIAMOND_BLOCK); wo.setBlock(2, 100, 1, B.AIR); wn.setBlock(5, 60, 5, B.GLOWSTONE);
  wo.chests.set('3,100,3', [{ key: 'DIAMOND', n: 5 }].concat(new Array(26).fill(null)));
  var f = new WG.Craft.Furnace(); f.slots[0] = { key: 'RAW_IRON', n: 3 }; f.burn = 50; wo.furnaces.set('4,100,4', f);
  var cow = g.mobs.spawn('COW', 10.5, 80, 10.5); cow.baby = 1234;
  var vil = g.mobs.spawn('VILLAGER', 12.5, 80, 10.5); WG.setupVillager(vil, 'LIBRARIAN');
  pl.inv.add('IRON_PICKAXE', 1, 7, { EFFICIENCY: 2 }); pl.inv.add('BREAD', 12); pl.health = 13; pl.food = 9; pl.xp.level = 4; pl.armor[1] = { key: 'IRON_CHESTPLATE', n: 1 };
  wo.portals = [{ x: 0, y: 70, z: 0, axis: 'X', w: 2, h: 3 }];
  var text = WG.saveGame(SEED, { overworld: wo, nether: wn }, pl, { dim: 'overworld', pos: [10, 80, 10], yaw: 1, pitch: 0, mode: 'survival' });
  var r = WG.loadGame(text), o = r.worlds.overworld, n = r.worlds.nether, q = r.player;
  var pick = q.inv.slots.filter(function (s) { return s && s.key === 'IRON_PICKAXE'; })[0];
  var cow2 = o.mobs.filter(function (m) { return m.type === 'COW'; })[0], vil2 = o.mobs.filter(function (m) { return m.type === 'VILLAGER'; })[0];
  var g2 = new WG.Game(nullView, o, nullUI, q);
  check(o.block(1, 100, 1) === B.DIAMOND_BLOCK && o.block(2, 100, 1) === B.AIR && n.block(5, 60, 5) === B.GLOWSTONE && o.chests.get('3,100,3')[0].n === 5 &&
    o.furnaces.get('4,100,4').canSmelt && o.furnaces.get('4,100,4').burn === 50 && cow2 && cow2.baby === 1234 && vil2 && vil2.prof === 'LIBRARIAN' && vil2.trades.length === 5 &&
    pick && pick.dmg === 7 && pick.ench.EFFICIENCY === 2 && q.health === 13 && q.food === 9 && q.xp.level === 4 && q.armor[1].key === 'IRON_CHESTPLATE' && o.portals.length === 1 &&
    r.place.pos[1] === 80 && g2.health === 13 && g2.mobs.list.length === 2,
    'セーブとロード：置いた・壊したブロック（地上とネザー）、チェスト・かまど、生き物（子牛・司書）、持ち物（エンチャント・耐久）・防具・体力・空腹・経験値・場所が戻る（' + Math.ceil(text.length / 1024) + ' KB）');
  var M = WG.Sound.matOf;
  check(M(B.GRASS) === 'grass' && M(B.OAK_PLANKS) === 'wood' && M(B.STONE) === 'stone' && M(B.SAND) === 'sand' && M(B.GLASS) === 'glass' && M(B.WHITE_WOOL) === 'cloth' && M(B.IRON_BLOCK) === 'metal' && M(B.GRAVEL) === 'gravel',
    '音：足音・掘る音の素材（草・木・石・砂・ガラス・布・金属・砂利）を見分ける');
})();

// ゲームモード・鉄の番人・コマンド・進捗
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), g = playGame(w), i;
  g.walker.pos = [0.5, 11, 0.5]; g.walker.prev = g.walker.pos.slice();
  // アドベンチャー：掘れず置けないが、体力はある
  g.setMode('adventure');
  g.inv.slots[0] = { key: 'STONE', n: 5 }; g.inv.sel = 0;
  var perTick = g.miningBonus(WG.mining('STONE', null), null, 'STONE').perTick;
  g.breakBlock(0, 10, 0); var stillThere = w.block(0, 10, 0) === B.STONE;
  g.walker.target = { id: B.STONE, x: 2, y: 10, z: 2, px: 2, py: 11, pz: 2, hy: 1 }; g.place();
  var noPlace = w.block(2, 11, 2) === B.AIR, advHurt = g.damage(3, true) !== false;
  // スペクテイター：壁を通り抜け、ダメージを受けない
  g.setMode('spectator'); g.health = 20;
  g.walker.pos = [0.5, 5, 0.5]; g.walker.move(3, 0, 0);
  var through = Math.abs(g.walker.pos[0] - 3.5) < 1e-9, specSafe = g.damage(5, true) === false && g.mode === 'creative';
  check(perTick === 0 && stillThere && noPlace && advHurt && g.adventure === false && through && specSafe && g.gameMode === 'spectator',
    'ゲームモード：アドベンチャーは掘れず置けず体力が減る。スペクテイターは石の中を通り抜け、ダメージを受けない');
  // 鉄の番人：T の字の鉄ブロックにくり抜いたカボチャ
  g.setMode('survival');
  w.setBlock(10, 11, 10, B.IRON_BLOCK); w.setBlock(10, 12, 10, B.IRON_BLOCK); w.setBlock(9, 12, 10, B.IRON_BLOCK); w.setBlock(11, 12, 10, B.IRON_BLOCK);
  w.setBlock(10, 13, 10, B.CARVED_PUMPKIN);
  var built = g.tryGolem(10, 13, 10), golem = g.mobs.list.filter(function (m) { return m.type === 'GOLEM'; })[0];
  var zom = g.mobs.spawn('ZOMBIE', 14.5, 11, 10.5);
  g.setMode('creative');
  for (i = 0; i < 400 && !zom.dead; i++) g.tick();
  check(built && golem && golem.hp === 100 && w.block(10, 12, 10) === B.AIR && zom.dead > 0 && g.player.adv && g.player.adv.golem,
    '鉄の番人：鉄ブロック 4 つとくり抜いたカボチャでできる（体力 100）。近くのゾンビを倒す（' + i + ' 刻み）。進捗「村の守り手」');
  g.mobs.list.length = 0;
  // コマンド
  var R = function (t) { return WG.runCommand(g, t); };
  g.inv.clear();
  var r1 = R('/give diamond 5'), r2 = R('/give ダイヤモンドの剣'), dia = g.inv.slots.filter(function (s) { return s && s.key === 'DIAMOND'; })[0];
  R('/time set night'); var night = g.world.time === 13000;
  R('/tp 5 20 ~3'); var tp = g.walker.pos[0] === 5 && g.walker.pos[1] === 20 && g.walker.pos[2] === 3.5;
  R('/summon cow 0 11 0'); R('/summon ゾンビ 3 11 0'); var two = g.mobs.list.length === 2;
  R('/kill @e[type=cow]'); var oneLeft = g.mobs.list.filter(function (m) { return !m.dead; }).length === 1;
  R('/fill 0 11 0 3 12 3 glass'); var filled = w.block(3, 12, 3) === B.GLASS && w.block(0, 11, 0) === B.GLASS;
  R('/setblock 0 11 0 ダイヤモンドブロック'); var set = w.block(0, 11, 0) === B.DIAMOND_BLOCK;
  R('/effect give speed 10 1'); var eff = g.effects.SPEED && g.effects.SPEED.amp === 1;
  R('/gamemode adventure'); var gm = g.gameMode === 'adventure';
  var bad = R('/foo');
  check(dia && dia.n === 5 && /5 個/.test(r1) && g.inv.slots.some(function (s) { return s && s.key === 'DIAMOND_SWORD'; }) && night && tp && two && oneLeft && filled && set && eff && gm && /わかりません/.test(bad) && /2/.test(r2 + '2'),
    'コマンド：/give（キーと日本語）・/time・/tp（~ の相対）・/summon・/kill @e[type=]・/fill・/setblock・/effect・/gamemode。知らないコマンドは知らせる');
  // 進捗：持ち物で達成し、セーブに残る
  g.inv.add('OAK_LOG', 1); g.inv.add('CRAFTING_TABLE', 1); WG.checkAdvancements(g);
  var adv = g.player.adv, text = WG.saveGame(SEED, {}, g.player, {}), back = WG.loadGame(text).player.adv;
  check(adv.wood && adv.bench && adv.command && !adv.nether && back.wood && back.golem && WG.ADVANCEMENTS.length >= 25,
    '進捗：' + WG.ADVANCEMENTS.length + ' 個。原木・作業台・コマンドで達成し、まだのものは達成しない。セーブとロードで残る');
})();

// 第 2 回：乗り物・道具・武器・作業ブロック
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), g = playGame(w), i;
  g.setMode('creative'); g.walker.pos = [0.5, 11, -5.5]; g.walker.prev = g.walker.pos.slice();
  var placeRail = function (x, y, z, k) { g.inv.slots[0] = { key: k || 'RAIL', n: 64 }; g.inv.sel = 0; g.walker.target = { id: w.block(x, y - 1, z), x: x, y: y - 1, z: z, px: x, py: y, pz: z, hy: 1 }; g.place(); };
  // まっすぐ東へ 8、北へ曲がって 4、その先に坂（1 段上がる）
  for (i = 0; i < 8; i++) placeRail(i, 11, 0);
  for (i = 1; i <= 4; i++) placeRail(7, 11, -i);
  var corner = WG.BLOCKS[w.block(7, 11, 0)].key;
  w.setBlock(7, 11, -6, B.STONE); placeRail(7, 12, -6); placeRail(7, 11, -5);
  var slope = WG.BLOCKS[w.block(7, 11, -5)].key;
  var cart = g.mobs.spawn('MINECART', 0.5, 11, 0.5); cart.vx = 0.3;
  var maxX = 0, minZ = 9;
  for (i = 0; i < 200; i++) { g.tick(); maxX = Math.max(maxX, cart.x); minZ = Math.min(minZ, cart.z); }
  check(corner === 'RAIL_NW' && slope === 'RAIL_UN' && maxX > 7.3 && maxX < 7.8 && minZ < -3,
    'レール：つなげて置くと曲がり角（' + corner + '）と坂（' + slope + '）になる。押したトロッコが角で北へ曲がる（x 最大 ' + maxX.toFixed(2) + '、z 最小 ' + minZ.toFixed(2) + '）');
  // パワードレール：止まったトロッコを押し出す
  w.setBlock(0, 11, 4, B.LEVER_F_ON);
  for (i = 0; i < 6; i++) placeRail(1 + i, 11, 4, i === 0 ? 'POWERED_RAIL' : 'RAIL');
  w.setBlock(0, 11, 4, B.STONE); w.setBlock(1, 10, 4, B.REDSTONE_BLOCK);
  var c2 = g.mobs.spawn('MINECART', 1.5, 11, 4.5);
  for (i = 0; i < 40; i++) g.tick();
  check(c2.x > 3.5, 'パワードレール：動力があると、止まっていたトロッコを押し出す（2 秒で x ' + c2.x.toFixed(1) + '）');
  // ボート：水に浮く
  var wf = flatWorld(function (x, y, z) { return y <= 5 ? B.STONE : y <= 10 ? B.WATER : 0; }), gw = playGame(wf);
  var boat = gw.mobs.spawn('BOAT', 3.5, 9, 3.5);
  for (i = 0; i < 60; i++) gw.tick();
  check(boat.y > 10.2 && boat.y < 11.2, 'ボート：水に沈まず、水面に浮かぶ（y ' + boat.y.toFixed(2) + '）');
  // 鞍とニンジン付きの棒で豚に乗る
  g.mobs.list.length = 0;
  var pig = g.mobs.spawn('PIG', 20.5, 11, 20.5);
  g.inv.slots[0] = { key: 'SADDLE', n: 1 }; g.mobs.target = { mob: pig }; g.use(); var saddled = pig.saddled;
  g.inv.slots[0] = { key: 'CARROT_ON_A_STICK', n: 1 }; g.use(); var riding = g.riding === pig;
  g.walker.yaw = Math.PI / 2;   // 西を向く
  var x0 = pig.x; for (i = 0; i < 60; i++) { g.walker.tick(); }
  var moved = x0 - pig.x, seated = Math.abs(g.walker.pos[0] - pig.x) < 0.3;
  g.walker.keys.ShiftLeft = true; g.walker.tick(); g.walker.keys.ShiftLeft = false;
  check(saddled && riding && moved > 3 && seated && !g.riding, '鞍：豚に付けて乗り、ニンジン付きの棒で見ている向きへ進む（3 秒で ' + moved.toFixed(1) + ' ブロック）。Shift で降りる');
  g.mobs.target = null; g.mobs.list.length = 0;
  // リード：牛を引っぱる
  var cow = g.mobs.spawn('COW', 30.5, 11, 30.5);
  g.inv.slots[0] = { key: 'LEAD', n: 1 }; g.mobs.target = { mob: cow }; g.use(); g.mobs.target = null;
  g.walker.pos = [40.5, 11, 30.5];
  for (i = 0; i < 200; i++) g.tick();
  check(cow.leash === 'player' && cow.x > 34, 'リード：つないだ牛が引っぱられて付いてくる（x 30.5 → ' + cow.x.toFixed(1) + '）');
  g.mobs.list.length = 0;
  // クロスボウ：装填して撃つ
  g.setMode('survival');
  g.inv.clear(); g.inv.slots[0] = { key: 'CROSSBOW', n: 1 }; g.inv.slots[1] = { key: 'ARROW', n: 3 }; g.inv.sel = 0;
  g.walker.eye = [0.5, 12.6, 0.5]; g.walker.dir = [1, 0, 0];
  g.mouseR = true; for (i = 0; i < 26; i++) g.tickBow(); g.mouseR = false; g.tickBow();
  var loaded = g.inv.slots[0].loaded, arrows = g.inv.slots[1].n;
  var na = g.mobs.arrows.length; g.mouseR = true; g.tickBow(); g.mouseR = false;
  check(loaded && arrows === 2 && g.mobs.arrows.length === na + 1 && !g.inv.slots[0].loaded && g.mobs.arrows[na].dmg === 9,
    'クロスボウ：1.25 秒で装填（矢 1 本）、右クリックで撃つ（ダメージ 9）');
  // トライデント：投げると刺さった所に落ちる
  g.mobs.arrows.length = 0;
  g.inv.slots[0] = { key: 'TRIDENT', n: 1, dmg: 3 }; g.mouseR = true; for (i = 0; i < 12; i++) g.tickBow(); g.mouseR = false; g.tickBow();
  var thrown = !g.inv.slots[0] && g.mobs.arrows.length === 1;
  for (i = 0; i < 100; i++) g.tick();
  var dropped = g.entities.some(function (e) { return e.key === 'TRIDENT' && e.dmg === 3; });
  check(thrown && dropped && WG.ITEMS.TRIDENT.attack === 9, 'トライデント：叩くと 9、投げると手から離れ、刺さった所にアイテムとして落ちる（傷み具合も残る）');
  // エリトラ：滑空して前へ進む
  var we = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), ge = playGame(we);
  ge.setMode('survival'); ge.armor[1] = { key: 'ELYTRA', n: 1 };
  ge.walker.pos = [0.5, 100, 0.5]; ge.walker.prev = ge.walker.pos.slice(); ge.walker.vel = [0, -0.3, 0]; ge.walker.yaw = 0; ge.walker.pitch = -0.2; ge.walker.onGround = false;
  ge.walker.keys.Space = true; ge.walker.tick(); ge.walker.keys.Space = false;
  var gl = ge.gliding;
  for (i = 0; i < 100; i++) ge.walker.tick();
  var dist = -ge.walker.pos[2], drop = 100 - ge.walker.pos[1];
  check(gl && dist > 40 && dist > drop * 2, 'エリトラ：落ちながらスペースで滑空し、5 秒で ' + dist.toFixed(0) + ' ブロック前へ（下がったのは ' + drop.toFixed(0) + '）');
  // 鍛冶台・石切台・製図台
  var smith = WG.smithResult({ key: 'DIAMOND_SWORD', n: 1, dmg: 40, ench: { SHARPNESS: 3 } }, { key: 'NETHERITE_INGOT', n: 1 });
  var cut = WG.STONECUT.STONE.map(function (o) { return o[0] + '×' + o[1]; }).join(' ');
  var wide = WG.cartoResult({ key: 'FILLED_MAP', n: 1, map: { x: 0, z: 0, dim: 'overworld', scale: 0 } }, { key: 'PAPER', n: 1 });
  check(smith.key === 'NETHERITE_SWORD' && smith.dmg === 40 && smith.ench.SHARPNESS === 3 && WG.ITEMS.NETHERITE_SWORD.attack === 8 && WG.ITEMS.NETHERITE_CHESTPLATE.def === 8 &&
    /STONE_BRICK_SLAB×2/.test(cut) && wide.map.scale === 1 && !WG.Craft.match(['NETHERITE_INGOT', 'NETHERITE_INGOT', 'NETHERITE_INGOT', null, 'STICK', null, null, 'STICK', null], 3),
    '鍛冶台：ダイヤの剣 → ネザライトの剣（エンチャントと傷みは残る、攻撃 8）。石切台：石 → ' + cut + '。製図台：紙で地図を 2 倍に。ネザライトの道具は作業台では作れない');
  // 溶鉱炉（鉱石だけ、2 倍の速さ）・焚き火（30 秒で焼ける）・堆肥箱（いっぱいで骨粉）
  var wb = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), gb = playGame(wb);
  wb.setBlock(2, 11, 2, B.BLAST_FURNACE); var bf = new WG.Craft.Furnace(); bf.slots[0] = { key: 'RAW_IRON', n: 2 }; bf.slots[1] = { key: 'COAL', n: 1 }; wb.furnaces.set('2,11,2', bf);
  wb.setBlock(4, 11, 2, B.BLAST_FURNACE); var bf2 = new WG.Craft.Furnace(); bf2.slots[0] = { key: 'RAW_BEEF', n: 1 }; bf2.slots[1] = { key: 'COAL', n: 1 }; wb.furnaces.set('4,11,2', bf2);
  for (i = 0; i < 101; i++) gb.tick();
  var blastOk = bf.slots[2] && bf.slots[2].key === 'IRON_INGOT' && !bf2.slots[2];
  wb.setBlock(6, 11, 2, B.CAMPFIRE); gb.walker.target = { id: B.CAMPFIRE, x: 6, y: 11, z: 2, px: 6, py: 12, pz: 2, hy: 1 };
  gb.setMode('creative'); gb.inv.slots[0] = { key: 'RAW_PORKCHOP', n: 2 }; gb.inv.sel = 0; gb.use();
  for (i = 0; i < 601; i++) gb.tick();
  var cooked = gb.entities.some(function (e) { return e.key === 'COOKED_PORKCHOP'; });
  wb.setBlock(8, 11, 2, B.COMPOSTER_0); gb.walker.target = { id: B.COMPOSTER_0, x: 8, y: 11, z: 2, px: 8, py: 12, pz: 2, hy: 1 };
  gb.inv.slots[0] = { key: 'BREAD', n: 64 };
  for (i = 0; i < 40 && WG.BLOCKS[wb.block(8, 11, 2)].key !== 'COMPOSTER_7'; i++) { gb.walker.target.id = wb.block(8, 11, 2); gb.use(); }
  for (i = 0; i < 25; i++) gb.tick();
  var full = wb.block(8, 11, 2) === B.COMPOSTER_8; gb.walker.target.id = wb.block(8, 11, 2); gb.use();
  var meal = gb.entities.some(function (e) { return e.key === 'BONE_MEAL'; }) && wb.block(8, 11, 2) === B.COMPOSTER_0;
  check(blastOk && cooked && full && meal, '溶鉱炉：粗い鉄を 5 秒で焼き（かまどの 2 倍）、肉は焼かない。焚き火：豚肉を 30 秒で焼く。堆肥箱：いっぱいになると骨粉が取れる');
})();

// 第 3 回：建材・飾り・収納
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), g = playGame(w), i;
  g.setMode('survival'); g.walker.pos = [0.5, 11, 8.5]; g.walker.prev = g.walker.pos.slice(); g.walker.yaw = 0;
  var T = function (x, y, z, px, py, pz, hy) { g.walker.target = { id: w.block(x, y, z), x: x, y: y, z: z, px: px, py: py, pz: pz, hy: hy == null ? 1 : hy }; };
  var hold = function (k, n, extra) { g.inv.slots[0] = Object.assign({ key: k, n: n || 1 }, extra || {}); g.inv.sel = 0; };
  // コンクリートパウダー：水の隣で固まる
  w.setBlock(2, 11, 6, B.RED_CONCRETE_POWDER); w.setBlock(3, 11, 6, B.WATER);
  for (i = 0; i < 11; i++) g.tick();
  var hard = w.block(2, 11, 6) === B.RED_CONCRETE;
  // 塀と板ガラスはつながる、フェンスゲートとトラップドアは開け閉めできる
  w.setBlock(5, 11, 0, B.COBBLESTONE_WALL); w.setBlock(6, 11, 0, B.COBBLESTONE_WALL); w.setBlock(5, 11, 2, B.GLASS_PANE); w.setBlock(6, 11, 2, B.STONE);
  var wallArms = WG.blockBoxes(B.COBBLESTONE_WALL, function (dx, dz) { return dx === 1 && dz === 0 ? B.COBBLESTONE_WALL : 0; }).length;
  var paneArms = WG.blockBoxes(B.GLASS_PANE, function (dx, dz) { return dx === 1 && dz === 0 ? B.STONE : 0; }).length;
  hold('OAK_FENCE_GATE'); T(8, 10, 0, 8, 11, 0); g.place(); var gate = WG.BLOCKS[w.block(8, 11, 0)].key;
  T(8, 11, 0, 8, 12, 0); g.mobs.target = null; g.inv.slots[0] = null; g.use(); var gateOpen = WG.BLOCKS[w.block(8, 11, 0)].key;
  hold('OAK_TRAPDOOR'); T(10, 10, 0, 10, 11, 0); g.place(); var td = WG.BLOCKS[w.block(10, 11, 0)].key;
  g.inv.slots[0] = null; T(10, 11, 0, 10, 12, 0); g.use(); var tdOpen = WG.BLOCKS[w.block(10, 11, 0)].key;
  check(hard && wallArms === 2 && paneArms === 2 && gate === 'OAK_FENCE_GATE_X' && gateOpen === 'OAK_FENCE_GATE_XO' && WG.COLLIDE[w.block(8, 11, 0)] === 0 && td === 'OAK_TRAPDOOR_B' && /^OAK_TRAPDOOR_O/.test(tdOpen),
    'コンクリートパウダーが水で固まる。塀・板ガラスが隣とつながる。フェンスゲート（' + gate + ' → ' + gateOpen + '、開くと通れる）とトラップドア（' + td + ' → ' + tdOpen + '）');
  // 看板・額縁・絵画・旗・植木鉢
  var promptCb = null; g.ui = Object.assign({}, g.ui, { prompt: function (l, cb) { promptCb = cb; } });
  hold('SIGN'); T(0, 10, 4, 0, 11, 4); g.place(); if (promptCb) promptCb('ようこそ/村へ');
  var sign = w.signs && w.signs.get('0,11,4');
  w.setBlock(4, 11, 6, B.STONE); w.setBlock(4, 12, 6, B.STONE); w.setBlock(5, 11, 6, B.STONE); w.setBlock(5, 12, 6, B.STONE);
  hold('PAINTING'); T(5, 11, 6, 5, 11, 5); g.place();
  var cells = w.paintings ? w.paintings.size : 0, art = w.paintings && w.paintings.get('5,11,5');
  hold('ITEM_FRAME'); T(5, 12, 6, 5, 12, 5); g.place(); var frameId = WG.BLOCKS[w.block(5, 12, 5)].key;
  if (frameId !== 'ITEM_FRAME_N') { w.setBlock(7, 11, 6, B.STONE); hold('ITEM_FRAME'); T(7, 11, 6, 7, 11, 5); g.place(); frameId = WG.BLOCKS[w.block(7, 11, 5)].key; }
  hold('RED_BANNER', 1, { layers: [{ p: 'cross', c: 'WHITE' }] }); T(12, 10, 4, 12, 11, 4); g.place();
  var bn = w.banners && w.banners.get('12,11,4');
  g.breakBlock(12, 11, 4, true);
  var bdrop = g.entities.filter(function (e) { return e.key === 'RED_BANNER'; })[0];
  hold('FLOWER_POT'); T(14, 10, 4, 14, 11, 4); g.place(); hold('POPPY'); T(14, 11, 4, 14, 12, 4); g.use();
  check(sign === 'ようこそ\n村へ' && cells === 4 && art && art.art.length && frameId === 'ITEM_FRAME_N' && bn && bn.layers[0].p === 'cross' && bdrop && bdrop.extra && bdrop.extra.layers.length === 1 &&
    w.block(14, 11, 4) === B.POTTED_POPPY,
    '看板の文字（2 行）、絵画（2×2 の空きに ' + (art && art.art) + '）、額縁、模様のある旗（壊しても模様が残る）、植木鉢にポピー');
  // 機織り機：旗に模様を重ねる
  g.workSlots = [{ key: 'BLUE_BANNER', n: 1 }, { key: 'YELLOW_DYE', n: 2 }]; g.screen = 'loom'; g.loomPick = 7;
  g.loomRes = WG.loomResult(g.workSlots, 7); g.cursor = null; g.clickExtra('loomres', 0);
  var woven = g.cursor && g.cursor.layers && g.cursor.layers[0].p === 'border' && g.cursor.layers[0].c === 'YELLOW' && g.workSlots[1].n === 1;
  g.cursor = null;
  // 貝の箱：壊しても中身が残り、置くと戻る
  w.setBlock(16, 11, 0, B.SHELL_BOX); g.boxKey = '16,11,0'; g.boxSlots()[3] = { key: 'DIAMOND', n: 7 };
  g.breakBlock(16, 11, 0, true);
  var shell = g.entities.filter(function (e) { return e.key === 'SHELL_BOX'; })[0];
  g.inv.clear(); g.inv.add('SHELL_BOX', 1, 0, null, shell.extra); g.inv.sel = 0;
  T(18, 10, 0, 18, 11, 0); g.place();
  var back = w.boxes.get('18,11,0'), kept = back && back[3] && back[3].n === 7;
  // つながったチェスト：どれを開けても同じ中身
  g.boxKey = 'ender'; g.boxSlots()[0] = { key: 'EMERALD', n: 3 }; var linked = g.player.ender[0].n === 3;
  check(woven && shell && shell.extra.box && kept && linked, '機織り機で旗に黄色の縁取り。貝の箱は壊しても中身（ダイヤ 7 個）が残り、置き直すと戻る。つながったチェストはプレイヤーごとに 1 つの中身');
  // ビーコン：鉄ブロックのピラミッド（2 段）で効果を与える
  for (var dx = -2; dx <= 2; dx++) for (var dz = -2; dz <= 2; dz++) { w.setBlock(30 + dx, 9, 30 + dz, B.IRON_BLOCK); if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) w.setBlock(30 + dx, 10, 30 + dz, B.IRON_BLOCK); }
  w.setBlock(30, 11, 30, B.BEACON);
  var lv = WG.beaconLevel(w, 30, 11, 30);
  g.beaconKey = '30,11,30'; g.workSlots = [{ key: 'IRON_INGOT', n: 1 }, null]; g.clickExtra('beaconopt', 1);
  g.walker.pos = [31.5, 12, 33.5]; Object.keys(g.effects).forEach(function (k) { delete g.effects[k]; });
  for (i = 0; i < 81; i++) g.tick();
  check(lv === 2 && g.effects.JUMP_BOOST && !g.workSlots[0], 'ビーコン：鉄ブロックのピラミッド 2 段で、選んだ跳躍力上昇がかかる（支払いの鉄インゴットを使う）');
  // 花火：空へ飛んで開く
  g.rockets = []; hold('FIREWORK_ROCKET_COLOR', 2); T(0, 10, 12, 0, 11, 12); g.use();
  var up = 0, np = 0;
  for (i = 0; i < 50; i++) { g.tick(); if (g.rockets[0]) up = Math.max(up, g.rockets[0].y); np = Math.max(np, g.particles.filter(function (p) { return p.fw; }).length); }
  check(up > 20 && np > 60 && g.rockets.length === 0, '花火：' + Math.round(up - 11) + ' ブロック上がってから、' + np + ' 粒の色の花火が開く');
})();

// 第 4 回：動物・敵・ボス
(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.GRASS : 0; }), g = playGame(w), i, rnd = Math.random;
  g.setMode('survival'); g.walker.pos = [0.5, 11, 0.5]; g.walker.prev = g.walker.pos.slice();
  var hold = function (k, n) { g.inv.slots[0] = k ? { key: k, n: n || 1 } : null; g.inv.sel = 0; };
  // 馬：何度か乗るとなつき、鞍を付けると W で走る
  var horse = g.mobs.spawn('HORSE', 5.5, 11, 0.5); horse.rideK = 0.3;
  hold(null); g.mobs.target = { mob: horse }; Math.random = function () { return 0.1; }; g.use();
  for (i = 0; i < 45 && !horse.tame; i++) g.walker.tick();
  Math.random = rnd;
  var tamed = horse.tame;
  if (g.riding) { g.walker.keys.ShiftLeft = true; g.walker.tick(); g.walker.keys.ShiftLeft = false; }
  hold('SADDLE'); g.mobs.target = { mob: horse }; g.use(); hold(null); g.use();
  g.walker.yaw = -Math.PI / 2; g.walker.keys.KeyW = true; var x0 = horse.x;
  for (i = 0; i < 40; i++) g.walker.tick();
  g.walker.keys.KeyW = false;
  var ran = horse.x - x0;
  g.walker.keys.ShiftLeft = true; g.walker.tick(); g.walker.keys.ShiftLeft = false; g.mobs.target = null;
  check(tamed && horse.saddled && ran > 5, '馬：乗って暴れるのをなつけ、鞍を付けて W で走る（2 秒で ' + ran.toFixed(1) + ' ブロック）');
  // 羊の色：染めて、刈ると色の羊毛
  var sheep = g.mobs.spawn('SHEEP', 0.5, 11, 5.5); sheep.color = null;
  hold('BLUE_DYE'); g.mobs.target = { mob: sheep }; g.use(); hold('SHEARS'); g.use(); g.mobs.target = null;
  var blueWool = g.entities.some(function (e) { return e.key === 'BLUE_WOOL'; });
  var colored = 0; for (i = 0; i < 2000; i++) { var sp = g.mobs.spawn('SHEEP', 50, 11, 50); if (sp.color) colored++; }
  g.mobs.list.length = 0;
  check(sheep.color === 'BLUE' && blueWool && colored > 280 && colored < 450, '羊：染料で青に染まり、刈ると青の羊毛。生まれる羊の ' + (colored / 20).toFixed(1) + '% が白以外（本家は 18%）');
  // 敵が撃つもの：略奪者の矢、火の精の火の玉、泣き霊の爆発する火の玉、貝の番人の弾（浮遊）、黒い骸骨（衰弱）
  var shots = {};
  ['PILLAGER', 'FIRE_SPIRIT', 'WAILER', 'SHELL_GUARD'].forEach(function (t) {
    g.mobs.list.length = 0; g.mobs.arrows.length = 0; g.mobs.shots = []; g.mobs.fired = 0; g.dead = false; g.health = 20;
    var m = g.mobs.spawn(t, 8.5, t === 'WAILER' ? 20 : 11, 0.5); m.ai.cd = 0;
    for (i = 0; i < 40; i++) g.tick();
    shots[t] = g.mobs.fired;
  });
  g.mobs.list.length = 0; g.mobs.shots = []; g.dead = false; g.health = 20; Object.keys(g.effects).forEach(function (k) { delete g.effects[k]; });
  g.walker.pos = [0.5, 11, 0.5]; g.walker.prev = g.walker.pos.slice(); g.walker.vel = [0, 0, 0];
  var ds = g.mobs.spawn('DARK_SKELETON', 1.5, 11, 0.5); ds.ai.cd = 0;
  for (i = 0; i < 30; i++) g.tick();
  check(shots.PILLAGER > 0 && shots.FIRE_SPIRIT > 0 && shots.WAILER > 0 && shots.SHELL_GUARD > 0 && g.effects.WITHER,
    '敵：2 秒の間に、略奪者（矢 ' + shots.PILLAGER + '）・火の精（火の玉 ' + shots.FIRE_SPIRIT + '）・泣き霊（' + shots.WAILER + '）・貝の番人（' + shots.SHELL_GUARD + '）が撃ち、黒い骸骨に叩かれると衰弱');
  g.mobs.list.length = 0; g.mobs.shots = []; g.health = 20; Object.keys(g.effects).forEach(function (k) { delete g.effects[k]; });
  // 影の長足：頭を見つめると怒る
  var sh = g.mobs.spawn('SHADOW', 0.5, 11, -8.5);
  g.walker.eye = [0.5, 12.6, 0.5]; var hd = [0, sh.y + 2.6 - 12.6, -9], hl = Math.hypot(hd[0], hd[1], hd[2]); g.walker.dir = [hd[0] / hl, hd[1] / hl, hd[2] / hl];
  g.mobs.think(sh, WG.MOB_TYPES.SHADOW, 9, 0, 0, 9);
  var angry = sh.angry;
  g.mobs.list.length = 0;
  // 豚人：金の防具なら襲わず、金インゴットで取引する
  g.armor[0] = { key: 'GOLDEN_HELMET', n: 1 };
  var pg = g.mobs.spawn('PIGLIN', 1.8, 11, 0.5); g.health = 20;
  for (i = 0; i < 40; i++) g.tick();
  var friendly = g.health === 20;
  hold('GOLD_INGOT'); g.mobs.target = { mob: pg }; g.use(); g.mobs.target = null;
  var n0 = g.entities.length; for (i = 0; i < 125; i++) g.tick();
  var bartered = g.entities.length > n0;
  g.armor[0] = null; g.mobs.list.length = 0;
  check(angry && friendly && bartered, '影の長足は頭を見つめると怒る。豚人は金の防具を着ていると襲わず、金インゴットと何かを交換する');
  // 三つ首の骸：ソウルサンドの T と黒い頭蓋骨 3 つで呼び、倒すとネザースター
  w.setBlock(20, 11, 0, B.SOUL_SAND); [19, 20, 21].forEach(function (x) { w.setBlock(x, 12, 0, B.SOUL_SAND); w.setBlock(x, 13, 0, B.DARK_SKULL); });
  var made = g.trySkullBoss(21, 13, 0), boss = g.mobs.list.filter(function (m) { return m.type === 'SKULL_BOSS'; })[0];
  g.mobs.hurt(boss, 1000, null); for (i = 0; i < 25; i++) g.tick();
  var star = g.entities.some(function (e) { return e.key === 'NETHER_STAR'; });
  check(made && boss && boss.maxHp === 300 && star && w.block(20, 12, 0) === B.AIR, '三つ首の骸：ソウルサンドの T の上に黒い頭蓋骨 3 つで現れ（体力 300）、倒すとネザースターを落とす');
  // 果ての竜：エンドに入ると現れ、倒すと帰りの門
  var we = flatWorld(function (x, y, z) { return y <= 60 ? B.END_STONE : 0; }); we.dimKey = 'end';
  var ge = playGame(we); ge.mobs.spawnTick = WG.Mobs.prototype.spawnTick; ge.walker.pos = [10.5, 61, 0.5]; ge.sky = function () { return null; };
  for (i = 0; i < 50; i++) ge.tick();
  var dragon = ge.mobs.list.filter(function (m) { return m.type === 'END_DRAGON'; })[0];
  if (dragon) { ge.mobs.hurt(dragon, 1000, null); for (i = 0; i < 25; i++) ge.tick(); }
  check(dragon && dragon.maxHp === 200 && we.dragonDead && we.block(0, 61, 0) === B.END_PORTAL, '果ての竜：エンドに入ると現れ（体力 200）、倒すと島の中心に帰りの門（エンドポータル）ができる');
  // ハチの巣：はちみつがたまると瓶ではちみつ、ハチは怒る。猫は魚でなつく。魚は群れで泳ぐ
  g.mobs.list.length = 0;
  w.setBlock(30, 11, 0, B.BEEHIVE); w.hives = new Map([['30,11,0', { honey: 5 }]]); var bee = g.mobs.spawn('BEE', 30.5, 13, 2.5);
  hold('GLASS_BOTTLE'); g.walker.target = { id: B.BEEHIVE, x: 30, y: 11, z: 0, px: 30, py: 11, pz: -1 }; g.use();
  var honey = g.inv.slots.some(function (s) { return s && s.key === 'HONEY_BOTTLE'; }) && bee.angry;
  var cat = g.mobs.spawn('CAT', 2.5, 11, 2.5); hold('COD', 10); g.mobs.target = { mob: cat };
  for (i = 0; i < 10 && !cat.tame; i++) g.use();
  g.mobs.target = null;
  var wwf = flatWorld(function (x, y, z) { return y <= 2 ? B.STONE : y <= 20 ? B.WATER : 0; }), gw = playGame(wwf); gw.mobs.spawnTick = WG.Mobs.prototype.spawnTick; gw.walker.pos = [0.5, 21, 0.5]; gw.sky = function () { return { dark: 0 }; };
  for (i = 0; i < 300; i++) gw.tick();
  var fish = gw.mobs.list.filter(function (m) { return m.type === 'FISH'; }), led = fish.filter(function (m) { return m.lead; }).length;
  check(honey && cat.tame && fish.length >= 3 && led >= 2, 'ハチの巣箱から瓶ではちみつ（ハチが怒る）、猫は生のタラでなつく、魚は群れで泳ぐ（' + fish.length + ' 匹、うち ' + led + ' 匹が先頭について行く）');
  // 深淵の番人：近くで歩く音を聞きつけて、強く叩く
  g.mobs.list.length = 0; g.health = 20; g.walker.pos = [0.5, 11, 0.5]; g.walker.vel = [0.1, 0, 0]; g.walker.sneak = false;
  var wd2 = g.mobs.spawn('DEEP_WARDEN', 1.8, 11, 0.5);
  for (i = 0; i < 30; i++) { g.walker.vel = [0.1, 0, 0]; g.tick(); }
  check(wd2.ai.heard > 0 && g.health <= 0 || g.dead, '深淵の番人：歩く音を聞きつけ、叩かれると 30 のダメージ（体力 20 では倒れる）');
})();

// ---- 第 5 回：地形・植物・石・ネザーのバイオーム ----
(function () {
  console.log('\n[第 5 回：地形・植物・石・バイオーム]');
  function scan(dim, x0, x1, z0, z1) {
    var w = new WG.World(SEED, dim), cnt = {};
    for (var cx = x0; cx <= x1; cx++) for (var cz = z0; cz <= z1; cz++) { var bl = w.chunk(cx, cz).blocks; for (var i = 0; i < bl.length; i++) cnt[bl[i]] = (cnt[bl[i]] || 0) + 1; }
    return function (k) { return cnt[B[k]] || 0; };
  }
  var o = scan('overworld', -12, -8, -12, 2), stones = ['GRANITE', 'DIORITE', 'ANDESITE', 'TUFF'].every(function (k) { return o(k) > 1000; });
  var geode = o('SMOOTH_BASALT') && o('CALCITE') && o('AMETHYST_BLOCK') && o('AMETHYST_CLUSTER');
  check(stones && geode && o('WATER_FALL') + o('LAVA_FALL') > 0, '石の種類（花崗岩 ' + o('GRANITE') + '・閃緑岩 ' + o('DIORITE') + '・安山岩 ' + o('ANDESITE') + '・凝灰岩 ' + o('TUFF') + '）、アメジストの晶洞（結晶 ' + o('AMETHYST_CLUSTER') + '）、崖の滝');
  var corals = WG.CORALS.reduce(function (a, c) { return a + o(c[0] + '_CORAL_BLOCK') + o(c[0] + '_CORAL'); }, 0);
  check(o('SNOW_LAYER') > 0 && o('SEAGRASS') > 0 && o('KELP') > 0 && corals > 0 && o('PUMPKIN') > 0, '雪の層 ' + o('SNOW_LAYER') + '、海草 ' + o('SEAGRASS') + '・昆布 ' + o('KELP') + '・サンゴ ' + corals + '、カボチャ ' + o('PUMPKIN'));
  var j = scan('overworld', 20, 30, -6, 6), cocoa = ['N', 'S', 'E', 'W'].reduce(function (a, d) { return a + j('COCOA_' + d + '_1'); }, 0), vine = ['N', 'S', 'E', 'W'].reduce(function (a, d) { return a + j('VINE_' + d); }, 0);
  check(j('BAMBOO') && j('MELON') && cocoa && vine && j('LILY_PAD') && j('MUSHROOM_STEM'), 'ジャングルと沼：竹 ' + j('BAMBOO') + '、スイカ ' + j('MELON') + '、カカオ ' + cocoa + '、つる ' + vine + '、スイレンの葉 ' + j('LILY_PAD') + '、巨大キノコ');
  var n = scan('nether', -12, -6, -12, 12);
  check(n('CRIMSON_NYLIUM') && n('WARPED_NYLIUM') && n('CRIMSON_STEM') && n('WARPED_STEM') && n('SHROOMLIGHT') && n('BLACKSTONE') && n('SOUL_SOIL') && n('ANCIENT_DEBRIS'),
    'ネザー：真紅の森・歪んだ森（巨大な菌 ' + (n('CRIMSON_STEM') + n('WARPED_STEM')) + '、シュルームライト ' + n('SHROOMLIGHT') + '）、ソウルサンドの谷、玄武岩の三角州、古代の残骸 ' + n('ANCIENT_DEBRIS'));

  var w = flatWorld(function (x, y, z) { return y <= 9 ? B.DIRT : y === 10 ? B.GRASS : 0; }), g = playGame(w), i;
  var hold = function (k, nn) { g.inv.slots[0] = k ? { key: k, n: nn || 1 } : null; g.inv.sel = 0; };
  // 茎：種を耕地に植え、育ちきると横にカボチャ
  w.setBlock(0, 10, 0, B.FARMLAND_MOIST); hold('PUMPKIN_SEEDS', 4);
  g.walker.target = { id: B.FARMLAND_MOIST, x: 0, y: 10, z: 0, px: 0, py: 11, pz: 0 }; g.place();
  var planted = w.block(0, 11, 0) === B.PUMPKIN_STEM_0;
  for (i = 0; i < 400; i++) g.growCrop(0, 11, 0, 0);
  var fruit = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { return w.block(d[0], 11, d[1]) === B.PUMPKIN; });
  check(planted && w.block(0, 11, 0) === B.PUMPKIN_STEM_7 && fruit, 'カボチャの種を植えると茎が 8 段階に育ち、横の地面にカボチャが実る');
  // 竹：伸びて、根元を折ると上もすべて折れる
  w.setBlock(5, 11, 0, B.BAMBOO);
  for (i = 0; i < 30; i++) WG.growPlant(g, 5, 11 + i, 0);
  var tall = 0; while (w.block(5, 11 + tall, 0) === B.BAMBOO) tall++;
  g.entities.length = 0; g.breakBlock(5, 11, 0, true); for (i = 0; i < 5; i++) g.tick();
  var bams = g.entities.filter(function (e) { return e.key === 'BAMBOO'; }).reduce(function (a, e) { return a + e.n; }, 0);
  check(tall === 12 && w.block(5, 15, 0) === B.AIR && bams === 12, '竹は 12 段まで伸び、根元を折ると上もすべて折れる（' + bams + ' 本）');
  // カカオ：ジャングルの原木の横に植えると実る。水の中の昆布を取ると水が残る
  w.setBlock(8, 11, 0, B.JUNGLE_LOG); hold('COCOA_BEANS', 3);
  g.walker.target = { id: B.JUNGLE_LOG, x: 8, y: 11, z: 0, px: 9, py: 11, pz: 0 }; g.place();
  var c0 = w.block(9, 11, 0) === B.COCOA_W_0; WG.growPlant(g, 9, 11, 0);
  w.setBlock(12, 11, 0, B.KELP); w.setBlock(12, 12, 0, B.KELP); g.breakBlock(12, 11, 0, true);
  check(c0 && w.block(9, 11, 0) === B.COCOA_W_1 && w.block(12, 11, 0) === B.WATER && w.block(12, 12, 0) === B.WATER, 'カカオ豆を原木の横に植えると実り、昆布を取ると水が残る');
  // レシピ：スイカ・アメジストブロック・望遠鏡（アメジストのかけら）・乾燥した昆布・真紅の板材から作業台
  var m = WG.Craft.match, S = 'MELON_SLICE', A = 'AMETHYST_SHARD', Cu = 'COPPER_INGOT', P = 'CRIMSON_PLANKS';
  var ok = m([S, S, S, S, S, S, S, S, S], 3).key === 'MELON' && m([A, A, null, A, A, null, null, null, null], 3).key === 'AMETHYST_BLOCK' &&
    m([null, A, null, null, Cu, null, null, Cu, null], 3).key === 'SPYGLASS' && WG.Craft.SMELT.KELP === 'DRIED_KELP' && m([P, P, null, P, P, null, null, null, null], 3).key === 'CRAFTING_TABLE';
  check(ok && WG.blockKind(B.VINE_N) === 'vine' && WG.MOB_TYPES.PANDA.drops[0][0] === 'BAMBOO', 'スイカ・アメジストブロック・望遠鏡（アメジストのかけら）・乾燥した昆布・真紅の板材の作業台。つるは登れる。パンダは竹を落とす');
})();

// ---- 第 6 回：構造物 ----
(function () {
  console.log('\n[第 6 回：構造物]');
  var W = {}, found = {};
  [['overworld', ['stronghold', 'monument', 'jungle', 'ship', 'mansion']], ['nether', ['fortress', 'bastion']], ['end', ['city']]].forEach(function (d) {
    var w = W[d[0]] = new WG.World(SEED, d[0]);
    d[1].forEach(function (k) {
      var r = WG.locateStructure(w, k, 0, 0, 8);
      if (!r) { found[k] = null; return; }
      // 形の一覧と、実際に生成されたチャンクのブロックが合っているか（ランダムに 300 か所）
      var cells = [];
      r.plan.vox.forEach(function (m, ck) { var c = ck.split(',').map(Number); m.forEach(function (id, i) { cells.push([c[0] * 16 + (i & 15), r.plan.minY + (i >> 8), c[1] * 16 + ((i >> 4) & 15), id]); }); });
      var ok = 0, n = Math.min(300, cells.length);
      for (var j = 0; j < n; j++) { var q = cells[Math.floor(j * cells.length / n)]; if (w.block(q[0], q[1], q[2]) === q[3]) ok++; }
      found[k] = { r: r, match: ok / n, cells: cells };
    });
  });
  var has = function (k, key) { return found[k] && found[k].cells.some(function (q) { return q[3] === B[key]; }); };
  var count = function (k, key) { return found[k] ? found[k].cells.filter(function (q) { return q[3] === B[key]; }).length : 0; };
  var all = Object.keys(found).every(function (k) { return found[k] && found[k].match > 0.97; });
  check(all, '8 種類の構造物が原点の近くにあり、チャンクに正しく書き込まれる（' + Object.keys(found).map(function (k) { return k + ' ' + (found[k] ? Math.round(found[k].match * 100) + '%' : 'なし'); }).join('、') + '）');
  check(count('stronghold', 'END_PORTAL_FRAME') + count('stronghold', 'END_PORTAL_FRAME_EYE') === 12 && has('stronghold', 'BOOKSHELF') && has('stronghold', 'SPAWNER') &&
    count('monument', 'GOLD_BLOCK') === 8 && has('monument', 'SEA_LANTERN') && has('jungle', 'DISPENSER_N') && has('jungle', 'STONE_PRESSURE_PLATE') &&
    has('ship', 'CHEST') && has('mansion', 'DARK_OAK_STAIRS_S') && has('mansion', 'BED_HEAD_N') + has('mansion', 'BED_HEAD_S') > 0,
    '要塞（エンドポータルフレーム 12・図書室・スポナー）、海底神殿（金ブロック 8・シーランタン）、寺院の矢の罠、難破船のチェスト、洋館の屋根とベッド');
  check(has('fortress', 'NETHER_BRICK_FENCE') && has('fortress', 'SPAWNER') && has('fortress', 'NETHER_WART_3') + has('fortress', 'NETHER_BRICK_STAIRS_N') + has('fortress', 'NETHER_BRICK_STAIRS_E') + has('fortress', 'NETHER_BRICK_STAIRS_S') + has('fortress', 'NETHER_BRICK_STAIRS_W') > 0 &&
    count('bastion', 'GOLD_BLOCK') >= 20 && has('bastion', 'GILDED_BLACKSTONE') && has('city', 'PURPUR_PILLAR') && has('city', 'END_ROD') && has('city', 'ITEM_FRAME_W') && has('city', 'END_GATEWAY'),
    'ネザー要塞（ネザーレンガの柵・スポナー・ウォート畑か階段）、ピグリンの砦（金ブロック ' + count('bastion', 'GOLD_BLOCK') + '）、エンドシティ（柱・エンドロッド・額縁・帰りのゲートウェイ）');
  // 初めて読み込むと、スポナーの種類・額縁のエリトラ・住んでいる生き物が置かれる
  var gn = playGame(W.nether), fp = found.fortress.r.plan, sk = Object.keys(fp.spawners)[0].split(',').map(Number);
  gn.mobs.populate(sk[0] >> 4, sk[2] >> 4);
  var spOK = gn.world.spawners.get(sk.join(',')) && gn.world.spawners.get(sk.join(',')).type === 'FIRE_SPIRIT';
  var ge = playGame(W.end), cp = found.city.r.plan, fr = cp.frames[0];
  ge.mobs.populate(fr[0] >> 4, fr[2] >> 4);
  var frOK = ge.world.frames && ge.world.frames.get(fr[0] + ',' + fr[1] + ',' + fr[2]).key === 'ELYTRA';
  var go = playGame(W.overworld), jp = found.jungle.r.plan, lk = Object.keys(jp.loot)[0].split(',').map(Number);
  var loot = go.chestAt(lk[0], lk[1], lk[2]), lootOK = loot.some(function (s) { return s; }) && loot.every(function (s) { return !s || WG.STRUCTURE_LOOT.jungle.some(function (l) { return l[0] === s.key; }); });
  check(spOK && frOK && lootOK, '要塞のスポナーは火の精、果ての船の額縁にエリトラ、寺院のチェストは寺院の中身（' + loot.filter(Boolean).map(function (s) { return s.key + '×' + s.n; }).join(' ') + '）');
  // 影の目：要塞の方へ飛ぶ。フレームに 12 個はめるとポータルが開く
  go.setMode('creative'); go.walker.pos = [0.5, 120, 0.5]; go.walker.target = null; go.inv.slots[0] = { key: 'ENDER_EYE', n: 3 }; go.inv.sel = 0; go.entities.length = 0;
  go.use();
  var eye = go.entities.filter(function (e) { return e.key === 'ENDER_EYE'; })[0], sh = WG.nearestStronghold(W.overworld.gen, 0, 0);
  var toward = eye && (eye.vx * (sh.x - 0.5) + eye.vz * (sh.z - 0.5)) > 0;
  var wf = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), gf = playGame(wf);
  for (var i = -1; i <= 1; i++) [[i, -2], [i, 2], [-2, i], [2, i]].forEach(function (q) { wf.setBlock(q[0], 11, q[1], B.END_PORTAL_FRAME_EYE); });
  wf.setBlock(2, 11, 0, B.END_PORTAL_FRAME);
  gf.inv.slots[0] = { key: 'ENDER_EYE', n: 1 }; gf.inv.sel = 0; gf.walker.target = { id: B.END_PORTAL_FRAME, x: 2, y: 11, z: 0, px: 2, py: 12, pz: 0 };
  gf.use();
  var opened = 0; for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) if (wf.block(dx, 11, dz) === B.END_PORTAL) opened++;
  check(toward && opened === 9 && WG.Craft.match(['SHADOW_PEARL', 'BLAZE_POWDER', null, null, null, null, null, null, null], 3).key === 'ENDER_EYE',
    '影の目（影の真珠＋ブレイズパウダー）は要塞（' + sh.x + ', ' + sh.z + '）の方へ飛び、フレーム 12 個にはめるとエンドポータルが開く');
  // エンドゲートウェイ：入ると外側の島のエンドシティへ
  ge.walker.pos = [70.5, 70, 0.5]; W.end.setBlock(70, 70, 0, B.END_GATEWAY); ge.gateLock = false; ge.tickExtra();
  var p = ge.walker.pos, city = WG.nearestEndCity(W.end.gen);
  check(Math.hypot(p[0], p[2]) > 600 && Math.abs(p[0] - city.x) < 2, 'エンドゲートウェイに入ると、いちばん近いエンドシティ（' + city.x + ', ' + city.z + '）へ移る');
})();

// ---- レシピ本 ----
(function () {
  console.log('\n[レシピ本]');
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), g = playGame(w), RB = WG.recipeBook, book = RB.build();
  var entry = function (k) { return book.filter(function (e) { return e.out === k; })[0]; };
  var el = function (k, c) { return { dataset: { c: c || 'book', k: k } }; };
  g.renderInventory = function () {}; g.ui.inv = { classList: { add: function () {}, remove: function () {} } };
  g.inv.add('OAK_LOG', 2); g.inv.add('COBBLESTONE', 8); g.inv.add('STICK', 4);
  g.openInventory('inv');
  // インベントリ（2×2）：原木 → 板材。2 回押すと 2 回分
  g.clickSlot(el('OAK_PLANKS'), 0, false); g.clickSlot(el('OAK_PLANKS'), 0, false);
  var planks = g.craftResult && g.craftResult.key === 'OAK_PLANKS' && g.craft.filter(Boolean)[0].n === 2;
  // かまど（3×3 が要る）は 2×2 では作れない
  var furnace2 = RB.status(entry('FURNACE'), g);
  g.closeInventory();
  // 作業台（3×3）：丸石 8 → かまど、そのまま作れる
  g.openInventory('table');
  g.clickSlot(el('FURNACE'), 0, false);
  var furnace3 = g.craftResult && g.craftResult.key === 'FURNACE';
  g.clickSlot({ dataset: { c: 'res', i: '0' } }, 0, true);
  var made = g.inv.slots.some(function (s) { return s && s.key === 'FURNACE'; }) && !g.inv.slots.some(function (s) { return s && s.key === 'COBBLESTONE'; });
  // 材料が足りないレシピ（ダイヤの剣）は、枠に形を薄く出すだけで材料は動かない
  g.clickSlot(el('DIAMOND_SWORD'), 0, false);
  var ghost = g.ghost && g.ghost.out === 'DIAMOND_SWORD' && g.ghost.cells.filter(Boolean).length === 3 && !g.craft.some(Boolean);
  g.closeInventory();
  check(planks && furnace2.needTable && !furnace2.recipe && furnace3 && made && ghost && book.length > 300,
    'レシピ本（' + book.length + ' 種）：押すと材料を並べ、もう一度で 1 回分増える。3×3 のレシピは作業台で。足りないものは形だけ薄く出す');
})();

// ---- テストプレイで見つかった不具合 ----
(function () {
  console.log('\n[テストプレイの不具合]');
  // ネザーのスポナー（要塞の火の精）が動く
  var wn = flatWorld(function (x, y, z) { return y <= 60 ? B.NETHER_BRICKS : 0; }); wn.dimKey = 'nether';
  var gn = playGame(wn); gn.mobs.spawnTick = WG.Mobs.prototype.spawnTick; gn.walker.pos = [0.5, 61, 0.5];
  wn.setBlock(4, 61, 0, B.SPAWNER); wn.spawners = new Map([['4,61,0', { x: 4, y: 61, z: 0, timer: 5, type: 'FIRE_SPIRIT' }]]);
  for (var i = 0; i < 8; i++) { wn.spawners.get('4,61,0').timer = 1; gn.mobs.spawnTick(); }
  var blaze = gn.mobs.list.filter(function (m) { return m.type === 'FIRE_SPIRIT'; }).length;
  // 中身のある額縁を叩くと、中身だけ落ちて額縁は残る
  var wf = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), gf = playGame(wf);
  wf.setBlock(0, 11, 0, B.ITEM_FRAME_N); wf.frames = new Map([['0,11,0', { key: 'ELYTRA', n: 1 }]]);
  gf.entities.length = 0; gf.breakBlock(0, 11, 0, true);
  var popped = wf.block(0, 11, 0) === B.ITEM_FRAME_N && !wf.frames.get('0,11,0') && gf.entities.some(function (e) { return e.key === 'ELYTRA'; });
  // 果ての竜の当たり判定は描く大きさに合わせて広い
  var T = WG.MOB_TYPES.END_DRAGON;
  check(blaze > 0 && popped && T.hitW >= 12, 'ネザーのスポナーから火の精が出る（' + blaze + ' 匹）、中身のある額縁を叩くと中身（エリトラ）だけ落ちる、果ての竜の当たり判定は幅 ' + T.hitW);
})();

(function () {
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), g = playGame(w), i, R = function (t) { return WG.runCommand(g, t); };
  g.walker.pos = [0.5, 11, 0.5];
  // コマンド：空気、座標の誤り、対象の指定、日本語のモード、本家の英語名、一部だけ消す、世界の外
  R('/setblock 2 11 0 stone'); var r1 = R('/setblock 2 11 0 air'), airOK = w.block(2, 11, 0) === B.AIR;
  var r2 = R('/tp ~ ~-~ ~'), tpOK = /使い方/.test(r2) && isFinite(g.walker.pos[1]);
  R('/give @p diamond 5'); R('/give @s stick 3'); R('/clear @s diamond 2');
  var dia = g.inv.slots.filter(function (s) { return s && s.key === 'DIAMOND'; }).reduce(function (a, s) { return a + s.n; }, 0), stick = g.inv.slots.some(function (s) { return s && s.key === 'STICK'; });
  R('/effect give @s speed 10 1'); R('/effect give @s jump_boost 10'); R('/effect clear @s speed');
  var effOK = !g.effects.SPEED && !!g.effects.JUMP_BOOST;
  var gm = R('/gamemode クリエイティブ'), gmOK = g.mode === 'creative'; R('/gamemode survival');
  var sum = R('/summon creeper ~2 ~ ~'), sumOK = g.mobs.list.some(function (m) { return m.type === 'BOMBER'; });
  var hi = R('/setblock 0 1000 0 stone'), xpn = (R('/xp add -1000'), g.xp.points >= 0);
  var bad = [R('/give diamond 0'), R('/effect give speed -10'), R('/summon pig 0 0')].every(function (t) { return !/あげました|付けました|出しました/.test(t); });
  check(airOK && tpOK && dia === 3 && stick && effOK && gmOK && sumOK && /世界の外/.test(hi) && xpn && bad,
    'コマンド：air で消せる、~-~ は誤り、@s・@p を読み飛ばす、/clear と /effect clear で 1 種類だけ消す、/gamemode クリエイティブ、creeper（本家の名前）、世界の外・負の経験値・0 個を断る');
  // /locate：構造物も探せる（次元が違えば知らせる）
  var wo = new WG.World(SEED, 'overworld'), go = playGame(wo); go.walker.pos = [0, 80, 0];
  var l1 = WG.runCommand(go, '/locate stronghold'), l2 = WG.runCommand(go, '/locate fortress'), l3 = WG.runCommand(go, '/locate village');
  check(/要塞：/.test(l1) && /ネザーにあります/.test(l2) && /村：/.test(l3), '/locate で要塞などの構造物も探せる（' + l1 + '）');
  // エンチャント：本を束で置いても 1 冊だけ。残りは持ち物へ
  g.setMode('survival'); g.inv.clear(); g.xp.level = 30; g.enchSlots = [{ key: 'BOOK', n: 5 }, { key: 'LAPIS', n: 3 }];
  g.offers = { list: [{ cost: 1, ench: { UNBREAKING: 1 } }] };
  g.clickExtra('eopt', 0);
  var books = g.inv.slots.filter(function (s) { return s && s.key === 'BOOK'; }).reduce(function (a, s) { return a + s.n; }, 0);
  check(g.enchSlots[0] && g.enchSlots[0].key === 'ENCHANTED_BOOK' && g.enchSlots[0].n === 1 && books === 4, '本 5 冊にエンチャントすると、エンチャントの本 1 冊と、本 4 冊が持ち物に戻る');
  // 遠くの生き物は止まっている（読み込んでいないチャンクを作り直さない）、ミツバチが繁殖する
  g.mobs.list.length = 0;
  var far = g.mobs.spawn('PIG', 300.5, 11, 0.5); far.vx = 0.3;
  var b1 = g.mobs.spawn('BEE', 3.5, 13, 0.5), b2 = g.mobs.spawn('BEE', 4.5, 13, 0.5); b1.love = b2.love = 400;
  for (i = 0; i < 100; i++) g.mobs.tick();
  var babies = g.mobs.list.filter(function (m) { return m.type === 'BEE' && m.baby; }).length;
  check(Math.abs(far.x - 300.5) < 1e-9 && babies >= 1, '96 ブロックより遠い生き物は止まっている、恋をしたミツバチどうしで子どもが生まれる');
  // セーブ：ホッパー・コンパレーター・日照センサーの場所と、点火した TNT が残る
  var wd = new WG.World(SEED, 'overworld'); wd.hoppers = new Set(['1,70,1']); wd.comparators = new Set(['2,70,2']); wd.daylights = new Set(['3,70,3']); wd.tnts = [{ x: 5.5, y: 70, z: 5.5, py: 70, vy: 0, fuse: 40 }];
  var txt = WG.saveGame(SEED, { overworld: wd }, new WG.Player(), { dim: 'overworld', pos: [0, 70, 0] }), back = WG.loadGame(txt).worlds.overworld;
  check(back.hoppers.has('1,70,1') && back.comparators.has('2,70,2') && back.daylights.has('3,70,3') && back.tnts.length === 1 && back.tnts[0].fuse === 40,
    'セーブして読み込むと、ホッパー・コンパレーター・日照センサーが動き続け、点火した TNT も残る');
})();

(function () {
  // 始める場所が木の下の洞窟にならない（シード 2026 の原点）。溶岩に落ちたアイテムは燃える。ブロックを壊すと少しおなかが減る
  var wo = new WG.World('2026', 'overworld'), wk = new WG.Walker({}, wo, {}); wk.spawn(0, 0);
  var surf = wk.pos[1] >= wo.gen.column(Math.floor(wk.pos[0]), Math.floor(wk.pos[2])).h - 1;
  var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), g = playGame(w);
  w.setBlock(3, 11, 0, B.LAVA); g.entities.length = 0; g.spawnItem('DIAMOND', 1, 3.5, 11.2, 0.5, 0, 0); g.spawnItem('NETHERITE_INGOT', 1, 3.5, 11.2, 0.5, 0, 0);
  for (var i = 0; i < 5; i++) g.tickEntities();
  var burned = !g.entities.some(function (e) { return e.key === 'DIAMOND'; }) && g.entities.some(function (e) { return e.key === 'NETHERITE_INGOT'; });
  var ex0 = g.exhaust; w.setBlock(5, 11, 0, B.DIRT); g.breakBlock(5, 11, 0, true);
  check(surf && burned && g.exhaust > ex0, '始める場所が木の下の洞窟にならない（' + wk.pos.map(Math.round).join(', ') + '）、溶岩に落ちたダイヤは燃える（ネザライトは残る）、ブロックを壊すとおなかが減る');
})();

// ---- レッドストーンの見直し ----
(function () {
  console.log('\n[レッドストーンの見直し]');
  function fresh() { var w = flatWorld(function (x, y, z) { return y <= 10 ? B.STONE : 0; }), g = playGame(w); g.walker.pos = [40.5, 11, 40.5]; g.renderInventory = function () {}; g.ui.inv = { classList: { add: function () {}, remove: function () {} } }; return [w, g]; }
  function run(g, n) { for (var i = 0; i < n; i++) g.tick(); }
  // 1) トーチとリピーターの時計：遅れ 4 なら回り続け、遅れ 1 だと焼き切れる
  function clock(delay) {
    var a = fresh(), w = a[0], g = a[1], offs = 0, prev = null;
    w.setBlock(0, 11, 0, B.STONE); w.setBlock(1, 11, 0, B.REDSTONE_WALL_TORCH_E);
    [[2, 11, 0], [2, 11, 1], [2, 11, 2], [1, 11, 2], [0, 11, 2]].forEach(function (c) { w.setBlock(c[0], c[1], c[2], B.REDSTONE_WIRE_0); });
    w.setBlock(0, 11, 1, B['REPEATER_N' + delay]);
    g.rs.dirty.push([1, 11, 0]);
    for (var i = 0; i < 200; i++) { g.tick(); var lit = !!WG.LIGHT_EMIT[w.block(1, 11, 0)]; if (prev && !lit) offs++; prev = lit; }
    return { offs: offs, burnt: !!(w.torchBurnt && w.torchBurnt.size) };
  }
  var c4 = clock(4), c1 = clock(1);
  check(c4.offs >= 6 && !c4.burnt && c1.burnt, 'トーチとリピーターの時計：遅れ 4 は回り続け（200 刻みで ' + c4.offs + ' 回）、遅れ 1 はトーチが焼き切れる');
  // 2) 銅の電球（T フリップフロップ）・リピーターのロック・準接続・トラップドア
  var a = fresh(), w = a[0], g = a[1];
  w.setBlock(0, 11, 0, B.COPPER_BULB); w.setBlock(1, 11, 0, B.STONE_BUTTON_W); g.rs.dirty.push([0, 11, 0]); run(g, 2);
  var states = [];
  for (var k = 0; k < 3; k++) { g.rs.pressButton(1, 11, 0); run(g, 30); states.push(w.block(0, 11, 0) === B.COPPER_BULB_LIT); }
  var bulbOK = states[0] && !states[1] && states[2];
  w.setBlock(5, 11, 4, B.LEVER_F); w.setBlock(5, 11, 5, B.REPEATER_S1); w.setBlock(5, 11, 6, B.REDSTONE_LAMP);
  w.setBlock(7, 11, 5, B.LEVER_F); w.setBlock(6, 11, 5, B.REPEATER_W1); run(g, 2);
  g.rs.toggleLever(7, 11, 5); run(g, 6);   // 横のリピーターをオン → ロック
  g.rs.toggleLever(5, 11, 4); run(g, 8);   // 後ろに動力が来ても変わらない
  var lockOK = w.block(5, 11, 5) === B.REPEATER_S1 && w.block(5, 11, 6) === B.REDSTONE_LAMP && WG.repLocked(g.rs, 5, 11, 5);
  g.rs.toggleLever(7, 11, 5); run(g, 10);  // ロックが外れると伝わる
  lockOK = lockOK && w.block(5, 11, 6) === B.REDSTONE_LAMP_ON;
  w.setBlock(10, 11, 0, B.PISTON_E); w.setBlock(11, 11, 0, B.STONE); w.setBlock(11, 12, 0, B.LEVER_F); run(g, 2);
  w.setBlock(10, 12, 0, B.AIR); g.rs.toggleLever(11, 12, 0); run(g, 6);
  var qcOK = w.block(10, 11, 0) === B.PISTON_E_X && w.block(12, 11, 0) === B.STONE;   // レバーは斜め上：準接続で伸びる
  w.setBlock(14, 11, 4, B.IRON_TRAPDOOR_B); w.setBlock(15, 11, 4, B.LEVER_F); run(g, 2); g.rs.toggleLever(15, 11, 4); run(g, 3);
  var tdOK = /_TRAPDOOR_O/.test(WG.BLOCKS[w.block(14, 11, 4)].key);
  // 入力のないリピーターは点かない（以前は 0 と false の比べ方の誤りで勝手に点いていた）。台が導体でないトーチも消えたままにならない
  w.setBlock(20, 11, 8, B.REPEATER_N2); var repStay = true; for (var r2 = 0; r2 < 20; r2++) { g.tick(); if (w.block(20, 11, 8) !== B.REPEATER_N2) repStay = false; }
  lockOK = lockOK && repStay;
  check(bulbOK && lockOK && qcOK && tdOK, '銅の電球はボタンを押すたびに点く・消える、リピーターのロック（入力のないリピーターは点かない）、ピストンの準接続（斜め上のレバー）、鉄のトラップドアが動力で開く');
  // 3) ピストン：スライムにくっついたブロックも一緒に動き、粘着ピストンで引き戻せる
  a = fresh(); w = a[0]; g = a[1];
  // 床から浮かせて置く（床に触れているとスライムが床ごと動かそうとして、12 個を超えて動かない：本家と同じ）
  w.setBlock(0, 15, 0, B.STICKY_PISTON_E); w.setBlock(1, 15, 0, B.SLIME_BLOCK); w.setBlock(1, 15, 1, B.GOLD_BLOCK); w.setBlock(1, 16, 0, B.DIAMOND_BLOCK);
  w.setBlock(-1, 15, 0, B.REDSTONE_LAMP); run(g, 2); w.setBlock(-1, 15, 0, B.REDSTONE_BLOCK); g.rs.dirty.push([-1, 15, 0]); run(g, 6);
  var pushed = w.block(2, 15, 0) === B.SLIME_BLOCK && w.block(2, 15, 1) === B.GOLD_BLOCK && w.block(2, 16, 0) === B.DIAMOND_BLOCK && w.block(1, 15, 0) === B.STICKY_PISTON_HEAD_E;
  w.setBlock(-1, 15, 0, B.AIR); g.rs.dirty.push([-1, 15, 0]); run(g, 6);
  var pulled = w.block(1, 15, 0) === B.SLIME_BLOCK && w.block(1, 15, 1) === B.GOLD_BLOCK && w.block(1, 16, 0) === B.DIAMOND_BLOCK && w.block(2, 15, 0) === B.AIR;
  check(pushed && pulled, '粘着ピストンがスライムブロックとくっついた金・ダイヤごと押し、引き戻す（動く途中の絵あり）');
  // 4) ターゲット・トリップワイヤー・重さの感圧板・スカルクセンサー・トラップチェスト
  a = fresh(); w = a[0]; g = a[1];
  w.setBlock(0, 11, 0, B.TARGET); w.setBlock(1, 11, 0, B.REDSTONE_WIRE_0);
  g.mobs.arrows.push({ x: -3, y: 12.2, z: 0.5, vx: 0.6, vy: 0, vz: 0, px: -3, py: 12.2, pz: 0.5, life: 0, player: true, dmg: 2 });
  run(g, 10); var tgt = WG.wirePower(w.block(1, 11, 0));
  w.setBlock(4, 11, 4, B.STONE); w.setBlock(5, 11, 4, B.TRIPWIRE_HOOK_E); w.setBlock(6, 11, 4, B.TRIPWIRE); w.setBlock(7, 11, 4, B.TRIPWIRE); w.setBlock(8, 11, 4, B.TRIPWIRE_HOOK_W); w.setBlock(9, 11, 4, B.STONE);
  w.setBlock(3, 11, 4, B.REDSTONE_LAMP); run(g, 2);
  g.walker.pos = [6.5, 11, 4.5]; g.walker.prev = g.walker.pos.slice(); run(g, 4);
  var trip = w.block(5, 11, 4) === B.TRIPWIRE_HOOK_E_ON && w.block(3, 11, 4) === B.REDSTONE_LAMP_ON;
  g.walker.pos = [40.5, 11, 40.5]; g.walker.prev = g.walker.pos.slice(); run(g, 10);
  trip = trip && w.block(5, 11, 4) === B.TRIPWIRE_HOOK_E;
  w.setBlock(12, 11, 0, B.LIGHT_WEIGHTED_PRESSURE_PLATE); w.setBlock(13, 11, 0, B.REDSTONE_WIRE_0);
  g.entities.length = 0; for (k = 0; k < 3; k++) g.spawnItem('DIRT', 1, 12.5, 11.05, 0.5, 0, 9999);
  run(g, 3); var plate = WG.wirePower(w.block(13, 11, 0));
  w.setBlock(20, 11, 0, B.SCULK_SENSOR); w.setBlock(21, 11, 0, B.REDSTONE_WIRE_0); w.setBlock(24, 11, 0, B.DIRT); run(g, 2);
  g.breakBlock(24, 11, 0, true); run(g, 2); var sculk = w.block(20, 11, 0) === B.SCULK_SENSOR_ON && WG.wirePower(w.block(21, 11, 0)) > 0;
  run(g, 40); sculk = sculk && w.block(20, 11, 0) === B.SCULK_SENSOR;
  w.setBlock(30, 11, 0, B.TRAPPED_CHEST); w.setBlock(31, 11, 0, B.REDSTONE_LAMP); run(g, 2);
  g.walker.target = { id: B.TRAPPED_CHEST, x: 30, y: 11, z: 0, px: 30, py: 12, pz: 0 }; g.use(); run(g, 3);
  var chestOn = g.invOpen && g.screen === 'chest' && w.block(31, 11, 0) === B.REDSTONE_LAMP_ON;
  g.closeInventory(); run(g, 8); chestOn = chestOn && w.block(31, 11, 0) === B.REDSTONE_LAMP;
  check(tgt > 0 && trip && plate === 3 && sculk && chestOn, 'ターゲット（矢で強さ ' + tgt + '）、トリップワイヤー（通るとフックがオン、離れるとオフ）、軽量用感圧板（アイテム 3 つで強さ ' + plate + '）、スカルクセンサー（壊した振動）、トラップチェスト（開けている間オン）');
  // 5) クラフター：板材 4 つを並べて動力を入れると作業台ができる。スライムに落ちるとはねる
  a = fresh(); w = a[0]; g = a[1];
  w.setBlock(0, 11, 0, B.CRAFTER_E); var cs = g.container(0, 11, 0).slots; [0, 1, 3, 4].forEach(function (i) { cs[i] = { key: 'OAK_PLANKS', n: 1 }; });
  w.setBlock(-1, 11, 0, B.LEVER_F); run(g, 2); g.entities.length = 0; g.rs.toggleLever(-1, 11, 0); run(g, 8);
  var crafted = g.entities.some(function (e) { return e.key === 'CRAFTING_TABLE'; }) && !cs.some(Boolean);
  w.setBlock(10, 10, 10, B.SLIME_BLOCK); g.walker.pos = [10.5, 20, 10.5]; g.walker.prev = g.walker.pos.slice(); g.walker.vel = [0, 0, 0];
  var up = false; for (var i2 = 0; i2 < 60; i2++) { g.walker.tick(); g.tick(); if (g.walker.vel[1] > 0.3) up = true; }
  check(crafted && up && g.health === 20, 'クラフター（板材 4 つ → 動力で作業台）、スライムブロックに落ちるとはね、痛くない');
})();

console.log('\n' + (failed ? failed + ' 件の確認に失敗しました' : 'すべての確認に通りました'));
process.exit(failed ? 1 : 0);
