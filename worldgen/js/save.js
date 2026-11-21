// セーブとロード。世界ごと（地上・ネザー・エンド）の置いた／壊したブロック、チェスト・かまど・醸造台などの中身、
// 生き物、落ちているアイテム、ポータル、時刻と、プレイヤー（持ち物・防具・体力・空腹・経験値・効果・ベッド・場所）を 1 つの JSON にする。
// ブロックの変更はチャンクごとに「場所の番号（Uint32）」と「ブロック（Uint16）」の 2 つの並びを base64 にして小さくしている。
// 保存先はブラウザ（localStorage、シードごとに 1 つ）と、ファイル（書き出し・読み込み）。画面のつなぎは main.js。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var VERSION = 1;

  function b64(u8) {
    if (typeof Buffer !== 'undefined' && !G.btoa) return Buffer.from(u8).toString('base64');
    var s = '';
    for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return G.btoa(s);
  }
  function unb64(str) {
    if (typeof Buffer !== 'undefined' && !G.atob) return new Uint8Array(Buffer.from(str, 'base64'));
    var bin = G.atob(str), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function mapToArr(m) { return m ? Array.from(m.entries()) : []; }
  // 生き物：関数や画面の都合のもの（取引中など）は除く
  function cleanMob(m) {
    var o = {};
    Object.keys(m).forEach(function (k) { if (k !== 'trading' && typeof m[k] !== 'function') o[k] = m[k]; });
    return o;
  }

  function saveWorld(wd) {
    var edits = {};
    wd.edits.forEach(function (ed, key) {
      var idx = new Uint32Array(ed.size), ids = new Uint16Array(ed.size), n = 0;
      ed.forEach(function (id, i) { idx[n] = i; ids[n] = id; n++; });
      edits[key] = [b64(new Uint8Array(idx.buffer)), b64(new Uint8Array(ids.buffer))];
    });
    return {
      edits: edits, editCount: wd.editCount, time: wd.time,
      chests: mapToArr(wd.chests), containers: mapToArr(wd.containers), notes: mapToArr(wd.notes), compOut: mapToArr(wd.compOut),
      furnaces: mapToArr(wd.furnaces).map(function (e) { return [e[0], { slots: e[1].slots, burn: e[1].burn, burnMax: e[1].burnMax, cook: e[1].cook }]; }),
      brewing: mapToArr(wd.brewing).map(function (e) { return [e[0], { slots: e[1].slots, fuel: e[1].fuel, time: e[1].time }]; }),
      spawners: mapToArr(wd.spawners), fires: mapToArr(wd.fires), populated: wd.populated ? Array.from(wd.populated) : [], portals: wd.portals || [],
      mobs: (wd.mobs || []).filter(function (m) { return !m.dead; }).map(cleanMob),
      items: (wd.items || []).map(function (e) { return { key: e.key, n: e.n, x: e.x, y: e.y, z: e.z, dmg: e.dmg, ench: e.ench, age: e.age || 0 }; })
    };
  }
  function loadWorld(wd, s) {
    wd.edits = new Map();
    Object.keys(s.edits || {}).forEach(function (key) {
      var a = unb64(s.edits[key][0]), b = unb64(s.edits[key][1]);
      var idx = new Uint32Array(a.buffer, a.byteOffset, a.length >> 2), ids = new Uint16Array(b.buffer, b.byteOffset, b.length >> 1), ed = new Map();
      for (var i = 0; i < idx.length; i++) ed.set(idx[i], ids[i]);
      wd.edits.set(key, ed);
    });
    wd.editCount = s.editCount || 0;
    if (s.time != null) wd.time = s.time;
    wd.chests = new Map(s.chests || []); wd.containers = new Map(s.containers || []); wd.notes = new Map(s.notes || []); wd.compOut = new Map(s.compOut || []);
    wd.furnaces = new Map((s.furnaces || []).map(function (e) { return [e[0], Object.assign(new WG.Craft.Furnace(), e[1])]; }));
    wd.brewing = new Map((s.brewing || []).map(function (e) { return [e[0], Object.assign(new WG.BrewingStand(), e[1])]; }));
    wd.spawners = new Map(s.spawners || []); wd.fires = new Map(s.fires || []); wd.populated = new Set(s.populated || []); wd.portals = s.portals || [];
    wd.mobs = (s.mobs || []).filter(function (m) { return WG.MOB_TYPES[m.type]; }).map(function (m) {
      m.px = m.x; m.py = m.y; m.pz = m.z; m.pyaw = m.yaw; m.pwalk = m.walk || 0; m.ai = m.ai || { timer: 0, tx: null, tz: null, panic: 0, cd: 0, fuse: 0, pfuse: 0 };
      return m;
    });
    wd.items = (s.items || []).filter(function (e) { return WG.ITEMS[e.key]; }).map(function (e) {
      return { key: e.key, n: e.n, x: e.x, y: e.y, z: e.z, px: e.x, py: e.y, pz: e.z, vx: 0, vy: 0, vz: 0, delay: 0, age: e.age || 0, dmg: e.dmg, ench: e.ench };
    });
  }

  // 全体を JSON の文字列にする。worlds は { dimKey: World }、place は { dim, pos, yaw, pitch, mode }
  WG.saveGame = function (seed, worlds, player, place) {
    var data = { v: VERSION, seed: String(seed), savedAt: Date.now(), place: place, worlds: {},
      player: { inv: player.inv.slots, sel: player.inv.sel, health: player.health, air: player.air, dead: player.dead, food: player.food, sat: player.sat,
        exhaust: player.exhaust, armor: player.armor, xp: player.xp, effects: player.effects, bed: player.bed, adv: player.adv || {} } };
    Object.keys(worlds).forEach(function (dim) { data.worlds[dim] = saveWorld(worlds[dim]); });
    return JSON.stringify(data);
  };
  // 文字列から戻す → { seed, worlds: { dimKey: World }, player, place }。読めなければ例外
  WG.loadGame = function (text) {
    var data = JSON.parse(text);
    if (!data || data.v !== VERSION || !data.worlds || !data.player) throw new Error('このゲームのセーブデータではありません');
    var worlds = {};
    Object.keys(data.worlds).forEach(function (dim) {
      if (!WG.DIMS[dim]) return;
      var wd = new WG.World(data.seed, dim);
      loadWorld(wd, data.worlds[dim]);
      worlds[dim] = wd;
    });
    var p = new WG.Player(), q = data.player;
    p.inv.slots = (q.inv || []).map(function (s) { return s && WG.ITEMS[s.key] ? s : null; });
    while (p.inv.slots.length < 36) p.inv.slots.push(null);
    p.inv.sel = q.sel || 0;
    ['health', 'air', 'dead', 'food', 'sat', 'exhaust', 'xp', 'effects', 'bed', 'adv'].forEach(function (k) { if (q[k] != null) p[k] = q[k]; });
    if (q.armor) p.armor = q.armor.map(function (s) { return s && WG.ITEMS[s.key] ? s : null; });
    p.inv.changed();
    return { seed: data.seed, worlds: worlds, player: p, place: data.place || {}, savedAt: data.savedAt };
  };

  // ---- ブラウザに保存（シードごとに 1 つ） ----
  function key(seed) { return 'wg-save:' + seed; }
  WG.storeSave = function (seed, text) {
    try { G.localStorage.setItem(key(seed), text); return true; } catch (e) { return false; }
  };
  WG.readSave = function (seed) {
    try { return G.localStorage.getItem(key(seed)); } catch (e) { return null; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
