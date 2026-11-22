// コマンド。T キーか / キーで入力欄を開き、Enter で実行する（Minecraft のコマンドの書き方に合わせた）。
// 座標は数か、~（今の場所）・~5（今の場所から 5）。ブロック・アイテム・生き物は、キー（stone, diamond_sword）か日本語の名前で書ける。
// 使えるもの：/help /gamemode /time /tp /give /summon /kill /effect /xp /clear /setblock /fill /locate /seed
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS;

  // 名前 → キー（ITEMS か MOB_TYPES のキー）
  // 本家の英語の名前（このゲームでは独自の名前にしたもの）→ キー
  var ALIAS = { CREEPER: 'BOMBER', ENDERMAN: 'SHADOW', ENDER_DRAGON: 'END_DRAGON', BLAZE: 'FIRE_SPIRIT', GHAST: 'WAILER', WITHER_SKELETON: 'DARK_SKELETON',
    WITHER: 'SKULL_BOSS', SHULKER: 'SHELL_GUARD', PHANTOM: 'NIGHT_RAY', GUARDIAN: 'EYE_FISH', ELDER_GUARDIAN: 'EYE_FISH', WARDEN: 'DEEP_WARDEN', IRON_GOLEM: 'GOLEM',
    MAGMA_CUBE: 'MAGMA_SLIME', COD: 'FISH', SALMON: 'FISH', TROPICAL_FISH: 'FISH', ENDER_PEARL: 'SHADOW_PEARL', EYE_OF_ENDER: 'ENDER_EYE', SHULKER_SHELL: 'SHELL',
    SHULKER_BOX: 'SHELL_BOX', ENDER_CHEST: 'LINKED_CHEST', WITHER_SKELETON_SKULL: 'DARK_SKULL' };
  function has(table, k) { return Object.prototype.hasOwnProperty.call(table, k); }
  function findKey(name, table, nameOf) {
    if (!name) return null;
    var k = name.replace(/^minecraft:/i, '').toUpperCase();
    if (has(table, k)) return k;   // 空気（AIR）は 0 なので、値ではなく「あるかどうか」で見る
    if (ALIAS[k] && has(table, ALIAS[k])) return ALIAS[k];
    var keys = Object.keys(table);
    for (var i = 0; i < keys.length; i++) if (nameOf(keys[i]) === name) return keys[i];
    return null;
  }
  function itemKey(n) { return findKey(n, ITEMS, function (k) { return ITEMS[k].name; }); }
  function mobKey(n) { return findKey(n, WG.MOB_TYPES, function (k) { return WG.MOB_TYPES[k].name; }); }
  function blockId(n) {
    var k = findKey(n, B, function (k) { return WG.blockName ? WG.blockName(B[k]) : k; });
    return k != null ? B[k] : null;
  }
  // 座標 1 つ（~ は基準からの相対）
  function coord(s, base) {
    if (s == null) return null;
    var v;
    if (s[0] === '~') { if (s.length === 1) return base; v = Number(s.slice(1)); return isFinite(v) ? base + v : null; }
    v = Number(s);
    return isFinite(v) ? v : null;
  }
  function xyz(a, i, p) {
    var x = coord(a[i], p[0]), y = coord(a[i + 1], p[1]), z = coord(a[i + 2], p[2]);
    return x == null || y == null || z == null ? null : [x, y, z];
  }
  var MODES = { survival: 'survival', s: 'survival', 0: 'survival', creative: 'creative', c: 'creative', 1: 'creative',
    adventure: 'adventure', a: 'adventure', 2: 'adventure', spectator: 'spectator', sp: 'spectator', 3: 'spectator',
    'サバイバル': 'survival', 'クリエイティブ': 'creative', 'アドベンチャー': 'adventure', 'スペクテイター': 'spectator' };
  // 対象の指定（@s・@p・@a）は、自分のこととして読み飛ばす（このゲームはひとり用）
  function dropSel(a, i) { if (a[i] && /^@[spa](\[.*\])?$/i.test(a[i])) a.splice(i, 1); }
  // /locate で探せるもの：[種類, 次元, 名前, 探す広さ（区画の数）]
  var LOCATE = { village: ['village', 'overworld', '村'], desert_pyramid: ['temple', 'overworld', '砂漠のピラミッド'], temple: ['temple', 'overworld', '砂漠のピラミッド'],
    stronghold: ['stronghold', 'overworld', '要塞', 3], monument: ['monument', 'overworld', '海底神殿', 3], ocean_monument: ['monument', 'overworld', '海底神殿', 3],
    jungle_pyramid: ['jungle', 'overworld', 'ジャングルの寺院', 5], jungle_temple: ['jungle', 'overworld', 'ジャングルの寺院', 5], jungle: ['jungle', 'overworld', 'ジャングルの寺院', 5],
    shipwreck: ['ship', 'overworld', '難破船', 6], ship: ['ship', 'overworld', '難破船', 6], mansion: ['mansion', 'overworld', '森の洋館', 2], woodland_mansion: ['mansion', 'overworld', '森の洋館', 2],
    fortress: ['fortress', 'nether', 'ネザー要塞', 5], nether_fortress: ['fortress', 'nether', 'ネザー要塞', 5], bastion: ['bastion', 'nether', 'ピグリンの砦', 4], bastion_remnant: ['bastion', 'nether', 'ピグリンの砦', 4],
    end_city: ['city', 'end', 'エンドシティ', 12], city: ['city', 'end', 'エンドシティ', 12],
    pillager_outpost: ['outpost', 'overworld', '前哨基地', 5], outpost: ['outpost', 'overworld', '前哨基地', 5], ruined_portal: ['ruined_portal', 'overworld', '廃ポータル', 6],
    igloo: ['igloo', 'overworld', 'イグルー', 8], ocean_ruin: ['ocean_ruin', 'overworld', '海底遺跡', 8], swamp_hut: ['swamp_hut', 'overworld', '沼の小屋', 8], ancient_city: ['ancient_city', 'overworld', '古代都市', 3] };
  var DIM_NAME = { overworld: '地上', nether: 'ネザー', end: 'エンド' };
  function inWorld(wd, y) { return y >= wd.minY && y <= wd.maxY; }
  var TIMES = { day: 1000, noon: 6000, sunset: 12000, night: 13000, midnight: 18000, sunrise: 23000 };

  var HELP = [
    '/gamemode <survival|creative|adventure|spectator>', '/time set <day|noon|night|midnight|数> ・ /time add <数>', '/tp <x> <y> <z>',
    '/give <アイテム> [個数]', '/summon <生き物> [x y z]', '/kill [@e|@e[type=生き物]]', '/effect give <効果> [秒] [強さ] ・ /effect clear',
    '/xp add <数> [levels|points]', '/clear [アイテム] [個数]', '/setblock <x> <y> <z> <ブロック>', '/fill <x1> <y1> <z1> <x2> <y2> <z2> <ブロック>',
    '/weather <clear|rain|thunder> [秒]', '/locate <village|stronghold|monument|jungle_pyramid|shipwreck|mansion|desert_pyramid|pillager_outpost|ruined_portal|igloo|ocean_ruin|swamp_hut|ancient_city|fortress|bastion|end_city>', '/seed',
    '（@s・@p は書いても書かなくても同じです）'
  ];

  // 実行して、表示する文を返す
  WG.runCommand = function (g, text) {
    var a = String(text || '').trim().replace(/^\//, '').split(/\s+/), cmd = (a[0] || '').toLowerCase(), w = g.walker, p = w.pos, wd = g.world, k, n;
    if (!cmd) return '';
    if (WG.advance) WG.advance(g, 'command');
    switch (cmd) {
      case 'help': case '?':
        return HELP.join('\n');
      case 'gamemode': case 'gm':
        var m = MODES[(a[1] || '').toLowerCase()];
        if (!m) return 'モードがわかりません：' + (a[1] || '');
        if (g.ui.setGameMode) g.ui.setGameMode(m); else g.setMode(m);
        return 'ゲームモードを' + WG.GAME_MODES[m] + 'にしました';
      case 'time':
        var note = wd.dimKey === 'overworld' ? '' : '（' + DIM_NAME[wd.dimKey] + 'では時間が見えません）';
        if (a[1] === 'set') { n = TIMES[a[2]] != null ? TIMES[a[2]] : parseInt(a[2], 10); if (isNaN(n)) return '時刻がわかりません'; n = ((n % 24000) + 24000) % 24000; g.setTime(n); return '時刻を ' + n + ' にしました' + note; }
        if (a[1] === 'add') { n = parseInt(a[2], 10); if (isNaN(n)) return '数がわかりません'; g.setTime(((wd.time + n) % 24000 + 24000) % 24000); return '時刻を ' + n + ' 進めました（今は ' + Math.floor(wd.time) + '）' + note; }
        if (a[1] === 'query') return '時刻は ' + Math.floor(wd.time) + ' です';
        return '使い方：/time set <day|night|数> ・ /time add <数>';
      case 'tp': case 'teleport':
        dropSel(a, 1);
        var t = xyz(a, 1, p);
        if (!t) return '使い方：/tp <x> <y> <z>（~ は今の場所、~5 は 5 先）';
        if (t[1] < wd.minY - 64 || t[1] > wd.maxY + 256) return '高さが世界の外です（' + wd.minY + '〜' + wd.maxY + '）';
        w.pos = t.slice(); w.prev = t.slice(); w.vel = [0, 0, 0]; w.fallDist = 0;
        return t.map(function (v) { return Math.round(v * 10) / 10; }).join(', ') + ' へ移りました';
      case 'give':
        dropSel(a, 1);
        k = itemKey(a[1]);
        if (!k) return 'アイテムがわかりません：' + (a[1] || '');
        n = a[2] == null ? 1 : parseInt(a[2], 10);
        if (a[2] != null && (!(n >= 1) || String(n) !== a[2].replace(/^\+/, ''))) return '個数は 1〜6400 の数で書きます';
        n = Math.min(6400, n);
        var left = n - g.inv.add(k, n);
        if (left > 0) g.spawnItem(k, left, p[0], p[1] + 1, p[2], 0, 0);
        return ITEMS[k].name + ' を ' + n + ' 個あげました';
      case 'summon':
        k = mobKey(a[1]);
        if (!k) return '生き物がわかりません：' + (a[1] || '');
        if (a.length > 2 && a.length < 5) return '座標は x y z の 3 つを書きます（省くと目の前）';
        var at = a.length >= 5 ? xyz(a, 2, p) : [p[0] + Math.sin(w.yaw) * -2, p[1], p[2] - Math.cos(w.yaw) * 2];
        if (!at) return '座標がわかりません';
        g.mobs.spawn(k, at[0], at[1], at[2]);
        return WG.MOB_TYPES[k].name + 'を出しました';
      case 'kill':
        if (!a[1] || a[1] === '@s' || a[1] === '@p') { if (g.mode !== 'survival') return 'サバイバル・アドベンチャーのときだけ倒れます'; g.damage(1000, true); return '倒れました'; }
        var mt = /^@e(?:\[type=([^\]]+)\])?$/.exec(a[1]);
        if (!mt) return '使い方：/kill ・ /kill @e ・ /kill @e[type=zombie]';
        var only = mt[1] ? mobKey(mt[1]) : null;
        if (mt[1] && !only) return '生き物がわかりません：' + mt[1];
        n = 0;
        g.mobs.list.forEach(function (m) { if (!m.dead && (!only || m.type === only)) { m.hp = 0; m.dead = 1; m.vx = m.vz = 0; n++; } });
        return n + ' 体を倒しました';
      case 'effect':
        dropSel(a, 2);
        var effKey = function (s) { var e = (s || '').replace(/^minecraft:/i, '').toUpperCase(); if (WG.EFFECTS[e]) return e; return Object.keys(WG.EFFECTS).filter(function (q) { return WG.EFFECTS[q][0] === s; })[0]; };
        if (a[1] === 'clear') {
          if (a[2]) { k = effKey(a[2]); if (!k) return '効果がわかりません：' + a[2]; if (!g.effects[k]) return WG.EFFECTS[k][0] + 'は付いていません'; delete g.effects[k]; g.inv.changed(); return WG.EFFECTS[k][0] + 'を消しました'; }
          Object.keys(g.effects).forEach(function (e) { delete g.effects[e]; }); g.inv.changed(); return '効果をすべて消しました';
        }
        if (a[1] === 'give') {
          k = (a[2] || '').replace(/^minecraft:/i, '').toUpperCase();
          if (!WG.EFFECTS[k]) { var hit = Object.keys(WG.EFFECTS).filter(function (e) { return WG.EFFECTS[e][0] === a[2]; })[0]; k = hit; }
          if (!k || !WG.EFFECTS[k]) return '効果がわかりません。使えるもの：' + Object.keys(WG.EFFECTS).join(', ').toLowerCase();
          var sec = a[3] == null ? 30 : parseInt(a[3], 10), amp = a[4] == null ? 0 : parseInt(a[4], 10);
          if (!(sec >= 1) || sec > 1000000) return '秒は 1 以上の数で書きます';
          if (!(amp >= 0) || amp > 4) return '強さは 0〜4 で書きます（0 が I）';
          g.addEffect(k, sec * 20, amp);
          return WG.EFFECTS[k][0] + '（' + sec + ' 秒）を付けました';
        }
        return '使い方：/effect give <効果> [秒] [強さ] ・ /effect clear';
      case 'xp': case 'experience':
        n = parseInt(a[2], 10);
        if (a[1] !== 'add' || isNaN(n)) return '使い方：/xp add <数> [levels|points]';
        if (a[3] === 'levels' || a[3] === 'l') g.xp.level = Math.max(0, Math.min(100000, g.xp.level + n));
        else if (n < 0) g.xp.points = Math.max(0, g.xp.points + n);
        else if (g.addXp) g.addXp(Math.min(n, 10000000)); else g.xp.points += n;
        g.inv.changed();
        return '経験値を ' + n + (a[3] === 'levels' ? ' レベル' : '') + ' 足しました';
      case 'clear':
        dropSel(a, 1);
        if (!a[1]) { g.inv.clear(); return '持ち物を空にしました'; }
        k = itemKey(a[1]);
        if (!k) return 'アイテムがわかりません：' + a[1];
        var lim = a[2] == null ? Infinity : parseInt(a[2], 10), gone = 0;
        if (!(lim >= 0)) return '個数は 0 以上の数で書きます';
        g.inv.slots.forEach(function (sl, i) { if (sl && sl.key === k && gone < lim) { var t2 = Math.min(sl.n, lim - gone); sl.n -= t2; gone += t2; if (sl.n <= 0) g.inv.slots[i] = null; } });
        g.inv.changed();
        return ITEMS[k].name + 'を ' + gone + ' 個消しました';
      case 'setblock':
        var sp = xyz(a, 1, p), id = blockId(a[4]);
        if (!sp || id == null) return '使い方：/setblock <x> <y> <z> <ブロック>';
        sp = sp.map(Math.floor);
        if (!inWorld(wd, sp[1])) return '高さが世界の外です（' + wd.minY + '〜' + wd.maxY + '）';
        wd.setBlock(sp[0], sp[1], sp[2], id); w.remesh(sp[0], sp[2]);
        if (wd.fluids) wd.fluids.notify(sp[0], sp[1], sp[2]);   // 水・溶岩を置いたら流れ始める（消したら周りが流れ込む）
        return WG.blockName(id) + 'を置きました';
      case 'fill':
        var f1 = xyz(a, 1, p), f2 = xyz(a, 4, p), fid = blockId(a[7]);
        if (!f1 || !f2 || fid == null) return '使い方：/fill <x1> <y1> <z1> <x2> <y2> <z2> <ブロック>';
        var lo = [0, 1, 2].map(function (q) { return Math.floor(Math.min(f1[q], f2[q])); }), hi = [0, 1, 2].map(function (q) { return Math.floor(Math.max(f1[q], f2[q])); });
        if (hi[1] < wd.minY || lo[1] > wd.maxY) return '高さが世界の外です（' + wd.minY + '〜' + wd.maxY + '）';
        lo[1] = Math.max(lo[1], wd.minY); hi[1] = Math.min(hi[1], wd.maxY);
        var vol = (hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1);
        if (vol > 32768) return '広すぎます（' + vol + ' ブロック。32768 まで）';
        for (var x = lo[0]; x <= hi[0]; x++) for (var y = lo[1]; y <= hi[1]; y++) for (var z = lo[2]; z <= hi[2]; z++) {
          wd.setBlock(x, y, z, fid);
          // 箱の表面だけ水・溶岩に知らせる（中は周りが同じなので流れない）
          if (wd.fluids && (x === lo[0] || x === hi[0] || y === lo[1] || y === hi[1] || z === lo[2] || z === hi[2])) wd.fluids.notify(x, y, z);
        }
        for (var cx = lo[0] >> 4; cx <= hi[0] >> 4; cx++) for (var cz = lo[2] >> 4; cz <= hi[2] >> 4; cz++) w.remesh(cx * 16 + 1, cz * 16 + 1);
        return vol + ' ブロックを置きました';
      case 'locate':
        var lk = LOCATE[(a[2] && a[1] === 'structure' ? a[2] : a[1] || '').replace(/^minecraft:/, '').toLowerCase()];
        if (!lk) return '使い方：/locate <' + Object.keys(LOCATE).filter(function (q, i, l) { return l.indexOf(q) === i; }).slice(0, 11).join('|') + '>';
        if (lk[1] !== wd.dimKey) return lk[2] + 'は' + DIM_NAME[lk[1]] + 'にあります（今は' + DIM_NAME[wd.dimKey] + '）';
        if (lk[0] !== 'village' && lk[0] !== 'temple') {
          var ls = WG.locateStructure && WG.locateStructure(wd, lk[0], p[0], p[2], lk[3]);
          if (!ls) return '近くに' + lk[2] + 'はありません';
          return 'いちばん近い' + lk[2] + '：' + ls.x + ', ' + ls.y + ', ' + ls.z + '（' + Math.round(Math.hypot(ls.x - p[0], ls.z - p[2])) + ' ブロック）';
        }
        if (lk[0] === 'temple') {
          var tb = null, tdist = 1e9, ts = wd.gen.structures;
          for (var tx2 = Math.floor(p[0] / 176) - 8; tx2 <= Math.floor(p[0] / 176) + 8; tx2++) for (var tz2 = Math.floor(p[2] / 176) - 8; tz2 <= Math.floor(p[2] / 176) + 8; tz2++) {
            var tp2 = ts.temple(tx2, tz2); if (tp2) { var dd2 = Math.hypot(tp2.x - p[0], tp2.z - p[2]); if (dd2 < tdist) { tdist = dd2; tb = tp2; } }
          }
          return tb ? 'いちばん近い砂漠のピラミッド：' + tb.x + ', ' + tb.y + ', ' + tb.z + '（' + Math.round(tdist) + ' ブロック）' : '近くに砂漠のピラミッドはありません';
        }
        var st = wd.gen && wd.gen.structures;
        if (!st) return 'この次元には村がありません';
        var best = null, bd = 1e9, R = 6, vr = 256;
        for (var rx = Math.floor(p[0] / vr) - R; rx <= Math.floor(p[0] / vr) + R; rx++) for (var rz = Math.floor(p[2] / vr) - R; rz <= Math.floor(p[2] / vr) + R; rz++) {
          var v = st.village(rx, rz);
          if (v) { var d = Math.hypot(v.x - p[0], v.z - p[2]); if (d < bd) { bd = d; best = v; } }
        }
        return best ? 'いちばん近い村：' + best.x + ', ' + best.z + '（' + Math.round(bd) + ' ブロック）' : '近くに村はありません';
      case 'seed':
        return 'シード：' + wd.seedText;
    }
    return 'コマンドがわかりません：/' + cmd + '（/help で一覧）';
  };
  WG.COMMAND_HELP = HELP;
})(typeof window !== 'undefined' ? window : globalThis);
