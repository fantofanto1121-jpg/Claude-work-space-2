// 進捗（実績）。手に入れた物・行った場所・したこと で達成し、画面の右上に知らせる。L キーで一覧を開く。
// 題と説明はこのゲームのために書いたもの。達成した記録はプレイヤーに持たせ、セーブにも入る。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var Game = WG.Game, Mobs = WG.Mobs;

  function has(g, re) {
    var s = g.inv.slots;
    for (var i = 0; i < s.length; i++) if (s[i] && (typeof re === 'string' ? s[i].key === re : re.test(s[i].key))) return true;
    return false;
  }
  function wearing(g, re) { return (g.armor || []).some(function (s) { return s && re.test(s.key); }); }
  // [キー, 題, 説明, 調べ方（関数）か、出来事の名前]
  var LIST = [
    ['wood', '木を切る', '原木を手に入れる', function (g) { return has(g, /_LOG$/); }],
    ['bench', '作る場所', '作業台を作る', function (g) { return has(g, 'CRAFTING_TABLE'); }],
    ['stone', '石の時代', '丸石を手に入れる', function (g) { return has(g, /^COBBLE/); }],
    ['stone_pick', 'よい道具', '石のツルハシを作る', function (g) { return has(g, 'STONE_PICKAXE'); }],
    ['furnace', '火をおこす', 'かまどを作る', function (g) { return has(g, 'FURNACE'); }],
    ['iron', '鉄を手に', '鉄インゴットを手に入れる', function (g) { return has(g, 'IRON_INGOT'); }],
    ['iron_armor', '鉄の守り', '鉄の防具を身につける', function (g) { return wearing(g, /^IRON_/); }],
    ['bread', '一日の糧', 'パンを作る', function (g) { return has(g, 'BREAD'); }],
    ['lava', '熱い荷物', '溶岩をバケツにくむ', function (g) { return has(g, 'LAVA_BUCKET'); }],
    ['diamond', '輝く石', 'ダイヤモンドを手に入れる', function (g) { return has(g, 'DIAMOND'); }],
    ['obsidian', '黒い石', '黒曜石を手に入れる', function (g) { return has(g, 'OBSIDIAN'); }],
    ['shield', '身を守る', '盾を作る', function (g) { return has(g, 'SHIELD'); }],
    ['fish', '釣り人', '魚を釣る', function (g) { return has(g, /^(COD|SALMON|PUFFERFISH|TROPICAL_FISH)$/); }],
    ['enchant', '魔法の道具', 'エンチャントした物を持つ', function (g) { return g.inv.slots.some(function (s) { return s && s.ench && Object.keys(s.ench).length; }); }],
    ['potion', '薬師', 'ポーションを作る', function (g) { return has(g, /^(SPLASH_)?POTION_(?!WATER|AWKWARD)/); }],
    ['emerald', '商売上手', 'エメラルドを手に入れる', function (g) { return has(g, 'EMERALD'); }],
    ['nether', '地の底へ', 'ネザーに入る', function (g) { return g.world.dimKey === 'nether'; }],
    ['end', '果ての地', 'エンドに入る', function (g) { return g.world.dimKey === 'end'; }],
    ['sleep', 'おやすみ', 'ベッドで眠る', function (g) { return !!g.sleeping; }],
    ['kill', '夜の守り', '敵を倒す', 'kill'],
    ['breed', '新しい命', '動物を繁殖させる', 'breed'],
    ['tame', '友だち', 'オオカミを飼いならす', 'tame'],
    ['trade', '取引', '村人と取引する', 'trade'],
    ['golem', '村の守り手', '鉄の番人を作る', 'golem'],
    ['portal', '門を開く', 'ネザーポータルに火を付ける', 'portal'],
    ['command', '呪文', 'コマンドを使う', 'command']
  ];
  WG.ADVANCEMENTS = LIST;

  function done(g) { var p = g.player; return p.adv || (p.adv = {}); }
  function grant(g, a) {
    var d = done(g);
    if (d[a[0]]) return false;
    d[a[0]] = Date.now();
    if (g.ui && g.ui.toast) g.ui.toast('進捗を達成：' + a[1] + '（' + a[2] + '）');
    if (WG.Sound) WG.Sound.play('levelup');
    if (g.invOpen && g.screen === 'adv') g.renderInventory();
    return true;
  }
  // 出来事で達成する
  WG.advance = function (g, ev) {
    if (!g || !g.player) return;
    LIST.forEach(function (a) { if (a[3] === ev) grant(g, a); });
  };
  // 持ち物などで達成するもの（1 秒ごとに調べる）
  WG.checkAdvancements = function (g) {
    var d = done(g);
    LIST.forEach(function (a) { if (typeof a[3] === 'function' && !d[a[0]] && a[3](g)) grant(g, a); });
  };

  // ---- ゲームにつなぐ ----
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    tickExtra.call(this);
    if (this.tickCount % 20 === 0 && !this.spectator) WG.checkAdvancements(this);
  };
  var trade = Game.prototype.trade;
  if (trade) Game.prototype.trade = function () { var r = trade.apply(this, arguments); if (r) WG.advance(this, 'trade'); return r; };
  var light = WG.lightPortal;
  if (light) WG.lightPortal = function (g) { var r = light.apply(this, arguments); if (r) WG.advance(g, 'portal'); return r; };
  var breed = Mobs.prototype.breed;
  Mobs.prototype.breed = function () { var r = breed.apply(this, arguments); WG.advance(this.game, 'breed'); return r; };
  var die = Mobs.prototype.die;
  Mobs.prototype.die = function (m) { if (m.byPlayer && WG.MOB_TYPES[m.type].hostile) WG.advance(this.game, 'kill'); return die.apply(this, arguments); };
  var key = Game.prototype.key;
  Game.prototype.key = function (e, down) {
    if (down && e.code === 'KeyL' && !e.repeat && !this.spectator && (this.ui.locked() || (this.invOpen && this.screen === 'adv'))) {
      if (this.invOpen && this.screen === 'adv') this.closeInventory(); else this.openInventory('adv');
      return true;
    }
    return key.call(this, e, down);
  };
  // 一覧の画面
  Game.prototype.renderAdvancements = function () {
    var d = done(this), n = 0, html = '<div class="advs">';
    LIST.forEach(function (a) {
      var ok = !!d[a[0]]; if (ok) n++;
      html += '<div class="adv' + (ok ? ' got' : '') + '"><b>' + a[1] + '</b><span>' + a[2] + '</span></div>';
    });
    return html + '</div><div class="note">達成 ' + n + ' / ' + LIST.length + '（L キーで閉じる）</div>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
