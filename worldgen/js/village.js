// 村人と取引。村の家ごとに 1 人の村人が住み、職業（家の種類で決まる）ごとの品物をエメラルドで売り買いする。
// 値段と品物は Minecraft の村人の取引を手本にした（見習いから達人までの段階はなく、最初から全部の品物を並べる）。
// 1 つの品物は 12 回まで取引でき、5 分（6000 刻み）ごとに補充される。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var ITEMS = WG.ITEMS;

  ITEMS.EMERALD = { key: 'EMERALD', name: 'エメラルド', block: -1, max: 64, shape: 'gem', color: '#2ab454' };

  // 職業 [キー, 名前, 服の色, 前掛けの色, 品物 [払うもの, 払うもの 2, もらうもの]]
  var E = 'EMERALD';
  var PROFS = {
    FARMER: ['農民', '#8a6a3a', '#c8a050', [[['WHEAT', 20], null, [E, 1]], [['POTATO', 26], null, [E, 1]], [['CARROT', 22], null, [E, 1]],
      [[E, 1], null, ['BREAD', 6]], [[E, 1], null, ['APPLE', 4]], [[E, 3], null, ['GOLDEN_CARROT', 3]]]],
    LIBRARIAN: ['司書', '#e8e4dc', '#8a3a2a', [[['PAPER', 24], null, [E, 1]], [['BOOK', 4], null, [E, 1]], [[E, 9], null, ['BOOKSHELF', 1]],
      [[E, 1], null, ['LANTERN', 1]], [[E, 12], ['BOOK', 1], ['ENCHANTED_BOOK', 1]]]],
    TOOLSMITH: ['道具鍛冶', '#4a4a50', '#2a2a2e', [[['COAL', 15], null, [E, 1]], [['IRON_INGOT', 4], null, [E, 1]], [[E, 1], null, ['STONE_AXE', 1]],
      [[E, 1], null, ['STONE_PICKAXE', 1]], [[E, 1], null, ['STONE_SHOVEL', 1]], [[E, 7], null, ['IRON_PICKAXE', 1]]]],
    ARMORER: ['防具鍛冶', '#5a5a64', '#2e2e34', [[['COAL', 15], null, [E, 1]], [['IRON_INGOT', 4], null, [E, 1]], [[E, 5], null, ['IRON_HELMET', 1]],
      [[E, 9], null, ['IRON_CHESTPLATE', 1]], [[E, 7], null, ['IRON_LEGGINGS', 1]], [[E, 4], null, ['IRON_BOOTS', 1]], [[E, 5], null, ['SHIELD', 1]]]],
    BUTCHER: ['肉屋', '#e4e0d8', '#b03a32', [[['RAW_CHICKEN', 14], null, [E, 1]], [['RAW_PORKCHOP', 7], null, [E, 1]], [['RAW_RABBIT', 4], null, [E, 1]],
      [[E, 1], null, ['COOKED_PORKCHOP', 5]], [[E, 1], null, ['COOKED_CHICKEN', 8]]]],
    CLERIC: ['聖職者', '#6a2a7a', '#c8a030', [[['ROTTEN_FLESH', 32], null, [E, 1]], [['GOLD_INGOT', 3], null, [E, 1]], [[E, 1], null, ['REDSTONE', 2]],
      [[E, 1], null, ['LAPIS', 1]], [[E, 4], null, ['GLOWSTONE', 1]], [[E, 3], null, ['GLASS_BOTTLE', 4]]]]
  };
  var PROF_KEYS = Object.keys(PROFS);
  WG.VILLAGER_PROFS = PROFS;

  function hexRGB(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  WG.profColor = function (m, part) { var p = PROFS[m.prof] || PROFS.FARMER; return hexRGB(part === 2 ? p[2] : p[1]); };
  WG.profName = function (m) { return (PROFS[m.prof] || PROFS.FARMER)[0]; };

  // 付けるエンチャント（取引の本）：宝のエンチャント以外から 1 つ、レベルはでたらめ
  function randomBookEnch() {
    var keys = Object.keys(WG.ENCHANTS).filter(function (k) { return !WG.ENCHANTS[k].treasure; }), k = keys[Math.floor(Math.random() * keys.length)], o = {};
    o[k] = 1 + Math.floor(Math.random() * WG.ENCHANTS[k].max);
    return o;
  }
  WG.setupVillager = function (m, prof) {
    m.prof = prof || m.prof || PROF_KEYS[Math.floor(Math.random() * PROF_KEYS.length)];
    m.trades = PROFS[m.prof][3].map(function (t) {
      var o = { a: t[0], b: t[1], out: t[2], uses: 0, max: 12 };
      if (t[2][0] === 'ENCHANTED_BOOK') o.ench = randomBookEnch();
      return o;
    });
  };

  // 村の家ごとに村人を 1 人（家の中央の床の上）。家の種類で職業が決まる
  var BY_HOUSE = { farm: ['FARMER'], smithy: ['TOOLSMITH', 'ARMORER'], small: ['BUTCHER', 'CLERIC', 'FARMER'], house: ['LIBRARIAN', 'FARMER', 'BUTCHER'], big: ['LIBRARIAN', 'CLERIC'] };
  WG.populateVillage = function (mobs, cx, cz) {
    var wd = mobs.world, st = wd.gen && wd.gen.structures;
    if (!st || !st.near) return;
    var x0 = cx << 4, z0 = cz << 4;
    st.near(x0, z0, false).forEach(function (v) {
      if (!v.parts) return;
      v.parts.forEach(function (p) {
        if (p.kind !== 'house') return;
        var hx = p.ox + p.ux * (p.W >> 1) + p.vx * (p.D >> 1), hz = p.oz + p.uz * (p.W >> 1) + p.vz * (p.D >> 1);
        if (hx < x0 || hx > x0 + 15 || hz < z0 || hz > z0 + 15) return;
        for (var y = p.y - 1; y < p.y + 6; y++) {
          if (WG.COLLIDE[wd.block(hx, y - 1, hz)] >= 0.5 && !WG.COLLIDE[wd.block(hx, y, hz)] && !WG.COLLIDE[wd.block(hx, y + 1, hz)]) {
            var list = BY_HOUSE[p.type] || PROF_KEYS, m = mobs.spawn('VILLAGER', hx + 0.5, y + (WG.COLLIDE[wd.block(hx, y - 1, hz)] < 1 ? WG.COLLIDE[wd.block(hx, y - 1, hz)] - 1 : 0), hz + 0.5);
            WG.setupVillager(m, list[((p.seed >>> 5) ^ (p.seed >>> 19)) % list.length]);
            m.home = [hx + 0.5, hz + 0.5];
            break;
          }
        }
      });
    });
  };

  // ---------------- 取引の画面（play.js の Game に足す） ----------------
  var Game = WG.Game;
  function count(inv, key) { return inv.slots.reduce(function (a, s) { return a + (s && s.key === key && !(s.ench && Object.keys(s.ench).length) ? s.n : 0); }, 0); }
  function remove(inv, key, n) {
    for (var i = 0; i < inv.slots.length && n > 0; i++) {
      var s = inv.slots[i];
      if (!s || s.key !== key || (s.ench && Object.keys(s.ench).length)) continue;
      var k = Math.min(n, s.n); s.n -= k; n -= k;
      if (s.n <= 0) inv.slots[i] = null;
    }
    inv.changed();
  }
  function icon(key, n) { return '<span class="tslot"><img src="' + WG.iconURL(key) + '" alt="">' + (n > 1 ? '<i>' + n + '</i>' : '') + '</span>'; }
  Game.prototype.openTrade = function (m) {
    this.tradeMob = m; m.trading = true;
    this.openInventory('trade');
  };
  Game.prototype.renderTrade = function () {
    var m = this.tradeMob, self = this, html = '<div class="trades">';
    if (!m || !m.trades) return '';
    m.trades.forEach(function (t, i) {
      var can = count(self.inv, t.a[0]) >= t.a[1] && (!t.b || count(self.inv, t.b[0]) >= t.b[1]) && t.uses < t.max;
      var name = WG.itemName(t.out[0]) + (t.ench ? '（' + WG.enchText(t.ench) + '）' : '');
      html += '<div class="trade' + (can ? '' : ' off') + '" data-c="trade" data-i="' + i + '" title="' + name + '">' + icon(t.a[0], t.a[1]) + (t.b ? '<span class="plus">＋</span>' + icon(t.b[0], t.b[1]) : '') +
        '<span class="tarrow">→</span>' + icon(t.out[0], t.out[1]) + '<span class="tname">' + name + (t.uses >= t.max ? '（売り切れ）' : '') + '</span></div>';
    });
    return html + '</div><div class="note">' + WG.profName(m) + '：品物をクリックすると、持ち物から払って受け取ります（1 つの品物は 12 回まで。時間がたつと補充）</div>';
  };
  // 品物を 1 回取引する。できたら true
  Game.prototype.trade = function (i) {
    var m = this.tradeMob, t = m && m.trades && m.trades[i], inv = this.inv;
    if (!t || t.uses >= t.max) return false;
    if (count(inv, t.a[0]) < t.a[1] || (t.b && count(inv, t.b[0]) < t.b[1])) return false;
    remove(inv, t.a[0], t.a[1]); if (t.b) remove(inv, t.b[0], t.b[1]);
    var left = t.out[1] - inv.add(t.out[0], t.out[1], 0, t.ench ? JSON.parse(JSON.stringify(t.ench)) : undefined);
    if (left > 0) { var w = this.walker; this.spawnItem(t.out[0], left, w.pos[0], w.pos[1] + 1, w.pos[2], 0.1, 40, 0, t.ench); }
    t.uses++;
    if (t.ench) t.ench = randomBookEnch();   // 本は取引のたびに別のエンチャントになる
    if (this.spawnOrbs) this.spawnOrbs(m.x, m.y + 1, m.z, 3 + Math.floor(Math.random() * 4));
    if (WG.Sound) WG.Sound.play('trade', m.x, m.y + 1.5, m.z);
    return true;
  };
})(typeof window !== 'undefined' ? window : globalThis);
