// コマンド。T キーか / キーで入力欄を開き、Enter で実行する（Minecraft のコマンドの書き方に合わせた）。
// 座標は数か、~（今の場所）・~5（今の場所から 5）。ブロック・アイテム・生き物は、キー（stone, diamond_sword）か日本語の名前で書ける。
// 使えるもの：/help /gamemode /time /tp /give /summon /kill /effect /xp /clear /setblock /fill /locate /seed
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS;

  // 名前 → キー（ITEMS か MOB_TYPES のキー）
  function findKey(name, table, nameOf) {
    if (!name) return null;
    var k = name.replace(/^minecraft:/i, '').toUpperCase();
    if (table[k]) return k;
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
    if (s[0] === '~') return base + (s.length > 1 ? parseFloat(s.slice(1)) : 0);
    var v = parseFloat(s);
    return isNaN(v) ? null : v;
  }
  function xyz(a, i, p) {
    var x = coord(a[i], p[0]), y = coord(a[i + 1], p[1]), z = coord(a[i + 2], p[2]);
    return x == null || y == null || z == null ? null : [x, y, z];
  }
  var MODES = { survival: 'survival', s: 'survival', 0: 'survival', creative: 'creative', c: 'creative', 1: 'creative',
    adventure: 'adventure', a: 'adventure', 2: 'adventure', spectator: 'spectator', sp: 'spectator', 3: 'spectator' };
  var TIMES = { day: 1000, noon: 6000, sunset: 12000, night: 13000, midnight: 18000, sunrise: 23000 };

  var HELP = [
    '/gamemode <survival|creative|adventure|spectator>', '/time set <day|noon|night|midnight|数> ・ /time add <数>', '/tp <x> <y> <z>',
    '/give <アイテム> [個数]', '/summon <生き物> [x y z]', '/kill [@e|@e[type=生き物]]', '/effect give <効果> [秒] [強さ] ・ /effect clear',
    '/xp add <数> [levels|points]', '/clear', '/setblock <x> <y> <z> <ブロック>', '/fill <x1> <y1> <z1> <x2> <y2> <z2> <ブロック>',
    '/locate village', '/seed'
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
        if (a[1] === 'set') { n = TIMES[a[2]] != null ? TIMES[a[2]] : parseInt(a[2], 10); if (isNaN(n)) return '時刻がわかりません'; g.setTime(((n % 24000) + 24000) % 24000); return '時刻を ' + n + ' にしました'; }
        if (a[1] === 'add') { n = parseInt(a[2], 10); if (isNaN(n)) return '数がわかりません'; g.setTime(((wd.time + n) % 24000 + 24000) % 24000); return '時刻を ' + n + ' 進めました'; }
        if (a[1] === 'query') return '時刻は ' + Math.floor(wd.time) + ' です';
        return '使い方：/time set <day|night|数> ・ /time add <数>';
      case 'tp': case 'teleport':
        var t = xyz(a, 1, p);
        if (!t) return '使い方：/tp <x> <y> <z>';
        w.pos = t.slice(); w.prev = t.slice(); w.vel = [0, 0, 0]; w.fallDist = 0;
        return t.map(function (v) { return Math.round(v * 10) / 10; }).join(', ') + ' へ移りました';
      case 'give':
        k = itemKey(a[1]); n = Math.max(1, Math.min(6400, parseInt(a[2], 10) || 1));
        if (!k) return 'アイテムがわかりません：' + (a[1] || '');
        var left = n - g.inv.add(k, n);
        if (left > 0) g.spawnItem(k, left, p[0], p[1] + 1, p[2], 0, 0);
        return ITEMS[k].name + ' を ' + n + ' 個あげました';
      case 'summon':
        k = mobKey(a[1]);
        if (!k) return '生き物がわかりません：' + (a[1] || '');
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
        if (a[1] === 'clear') { Object.keys(g.effects).forEach(function (e) { delete g.effects[e]; }); g.inv.changed(); return '効果を消しました'; }
        if (a[1] === 'give') {
          k = (a[2] || '').replace(/^minecraft:/i, '').toUpperCase();
          if (!WG.EFFECTS[k]) { var hit = Object.keys(WG.EFFECTS).filter(function (e) { return WG.EFFECTS[e][0] === a[2]; })[0]; k = hit; }
          if (!k || !WG.EFFECTS[k]) return '効果がわかりません。使えるもの：' + Object.keys(WG.EFFECTS).join(', ').toLowerCase();
          var sec = parseInt(a[3], 10) || 30, amp = Math.max(0, Math.min(4, parseInt(a[4], 10) || 0));
          g.addEffect(k, sec * 20, amp);
          return WG.EFFECTS[k][0] + '（' + sec + ' 秒）を付けました';
        }
        return '使い方：/effect give <効果> [秒] [強さ] ・ /effect clear';
      case 'xp': case 'experience':
        n = parseInt(a[2], 10);
        if (a[1] !== 'add' || isNaN(n)) return '使い方：/xp add <数> [levels|points]';
        if (a[3] === 'levels' || a[3] === 'l') g.xp.level = Math.max(0, g.xp.level + n);
        else if (g.addXp) g.addXp(n); else g.xp.points += n;
        g.inv.changed();
        return '経験値を ' + n + (a[3] === 'levels' ? ' レベル' : '') + ' 足しました';
      case 'clear':
        g.inv.clear(); return '持ち物を空にしました';
      case 'setblock':
        var sp = xyz(a, 1, p), id = blockId(a[4]);
        if (!sp || id == null) return '使い方：/setblock <x> <y> <z> <ブロック>';
        sp = sp.map(Math.floor);
        wd.setBlock(sp[0], sp[1], sp[2], id); w.remesh(sp[0], sp[2]);
        return 'ブロックを置きました';
      case 'fill':
        var f1 = xyz(a, 1, p), f2 = xyz(a, 4, p), fid = blockId(a[7]);
        if (!f1 || !f2 || fid == null) return '使い方：/fill <x1> <y1> <z1> <x2> <y2> <z2> <ブロック>';
        var lo = [0, 1, 2].map(function (q) { return Math.floor(Math.min(f1[q], f2[q])); }), hi = [0, 1, 2].map(function (q) { return Math.floor(Math.max(f1[q], f2[q])); });
        var vol = (hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1);
        if (vol > 32768) return '広すぎます（' + vol + ' ブロック。32768 まで）';
        for (var x = lo[0]; x <= hi[0]; x++) for (var y = lo[1]; y <= hi[1]; y++) for (var z = lo[2]; z <= hi[2]; z++) wd.setBlock(x, y, z, fid);
        for (var cx = lo[0] >> 4; cx <= hi[0] >> 4; cx++) for (var cz = lo[2] >> 4; cz <= hi[2] >> 4; cz++) w.remesh(cx * 16 + 1, cz * 16 + 1);
        return vol + ' ブロックを置きました';
      case 'locate':
        if ((a[1] || '').replace(/^minecraft:/, '') !== 'village') return '使い方：/locate village';
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
