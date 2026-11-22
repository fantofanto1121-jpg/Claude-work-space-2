// エンチャント・経験値・金床、ポーションと醸造、釣り、盾（Minecraft の決まりに合わせたもの）。
// アイテムの定義・レシピ・計算だけをここに置き、画面と操作は play.js に置く。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var ITEMS = WG.ITEMS, Craft = WG.Craft;

  function item(key, name, max, extra) {
    var it = { key: key, name: name, block: -1, max: max || 64, shape: 'lump', color: '#888888' };
    for (var k in extra || {}) it[k] = extra[k];
    ITEMS[key] = it;
    return it;
  }

  // ---------------- 材料 ----------------
  item('PAPER', '紙'); item('BOOK', '本'); item('SUGAR', '砂糖'); item('SLIME_BALL', 'スライムボール');
  item('BLAZE_ROD', 'ブレイズロッド'); item('BLAZE_POWDER', 'ブレイズパウダー'); item('NETHER_WART', 'ネザーウォート', 64, { plantWart: true });
  item('SPIDER_EYE', 'クモの目', 64, { food: 2, sat: 0.8, poison: true }); item('FERMENTED_SPIDER_EYE', '発酵したクモの目');
  item('GHAST_TEAR', 'ガストの涙'); item('MAGMA_CREAM', 'マグマクリーム'); item('GLISTERING_MELON_SLICE', 'きらめくスイカの薄切り');
  item('RABBIT_FOOT', 'ウサギの足'); item('GLASS_BOTTLE', 'ガラス瓶');
  item('ENCHANTED_BOOK', 'エンチャントの本', 1, { enchBook: true });
  // 魚（Minecraft の満腹度）
  [['COD', 'タラ', 2, 0.1], ['COOKED_COD', '焼き鱈', 5, 0.6], ['SALMON', '鮭', 2, 0.1], ['COOKED_SALMON', '焼き鮭', 6, 0.8],
    ['PUFFERFISH', 'フグ', 1, 0.1], ['TROPICAL_FISH', '熱帯魚', 1, 0.1]].forEach(function (f) { item(f[0], f[1], 64, { food: f[2], sat: f[3] }); });
  ITEMS.PUFFERFISH.pufferfish = true;
  Craft.SMELT.COD = 'COOKED_COD'; Craft.SMELT.SALMON = 'COOKED_SALMON';
  // 道具：釣り竿・盾
  item('FISHING_ROD', '釣り竿', 1, { rod: true, dur: 64 });
  item('SHIELD', '盾', 1, { shield: true, dur: 336 });

  // ---------------- レシピ ----------------
  Craft.SHAPED.push(
    [['###'], { '#': 'SUGAR_CANE' }, 'PAPER', 3],
    [['###', 'BBB', '###'], { '#': 'PLANKS', B: 'BOOK' }, 'BOOKSHELF', 1],
    [[' B ', 'DOD', 'OOO'], { B: 'BOOK', D: 'DIAMOND', O: 'OBSIDIAN' }, 'ENCHANTING_TABLE', 1],
    [['III', ' i ', 'iii'], { I: 'IRON_BLOCK', i: 'IRON_INGOT' }, 'ANVIL', 1],
    [[' R ', 'CCC'], { R: 'BLAZE_ROD', C: 'COBBLES' }, 'BREWING_STAND', 1],
    [['# #', ' # '], { '#': 'GLASS' }, 'GLASS_BOTTLE', 3],
    [['  S', ' SX', 'S X'], { S: 'STICK', X: 'STRING' }, 'FISHING_ROD', 1],
    [['PIP', 'PPP', ' P '], { P: 'PLANKS', I: 'IRON_INGOT' }, 'SHIELD', 1]
  );
  Craft.SHAPELESS.push(
    [['PAPER', 'PAPER', 'PAPER', 'LEATHER'], 'BOOK', 1], [['SUGAR_CANE'], 'SUGAR', 1], [['BLAZE_ROD'], 'BLAZE_POWDER', 2],
    [['SPIDER_EYE', 'BROWN_MUSHROOM', 'SUGAR'], 'FERMENTED_SPIDER_EYE', 1], [['BLAZE_POWDER', 'SLIME_BALL'], 'MAGMA_CREAM', 1]
  );
  Craft.FUEL.FISHING_ROD = 300; Craft.FUEL.SHIELD = 300; Craft.FUEL.BOOKSHELF = 300; Craft.FUEL.BLAZE_ROD = 2400;

  // ---------------- 経験値 ----------------
  // 次のレベルまでの経験値（Minecraft の式）
  function xpNeed(level) { return level <= 15 ? 2 * level + 7 : level <= 30 ? 5 * level - 38 : 9 * level - 158; }
  WG.xpNeed = xpNeed;
  // 鉱石を壊したときの経験値 [最小, 最大]
  WG.ORE_XP = { COAL_ORE: [0, 2], DEEPSLATE_COAL_ORE: [0, 2], DIAMOND_ORE: [3, 7], DEEPSLATE_DIAMOND_ORE: [3, 7], LAPIS_ORE: [2, 5],
    DEEPSLATE_LAPIS_ORE: [2, 5], REDSTONE_ORE: [1, 5], DEEPSLATE_REDSTONE_ORE: [1, 5], QUARTZ_ORE: [2, 5], NETHER_GOLD_ORE: [0, 1], SPAWNER: [15, 43] };
  // かまどで焼いたものの経験値（1 個あたり）
  WG.SMELT_XP = { IRON_INGOT: 0.7, GOLD_INGOT: 1, COPPER_INGOT: 0.7, STONE: 0.1, DEEPSLATE: 0.1, BRICK: 0.3, NETHER_BRICK: 0.1, GLASS: 0.1,
    CHARCOAL: 0.15, COOKED_PORKCHOP: 0.35, COOKED_BEEF: 0.35, COOKED_MUTTON: 0.35, COOKED_CHICKEN: 0.35, BAKED_POTATO: 0.35, COOKED_COD: 0.35, COOKED_SALMON: 0.35 };

  // ---------------- エンチャント ----------------
  // [キー, 名前, 最大レベル, 付くもの, 重み, 最小の力（レベル 1）, レベルごとの増え, 宝物だけ]
  // 付くもの：armor（防具すべて）、head・feet、weapon（剣）、digger（ツルハシ・斧・シャベル・クワ）、bow、rod、any（耐久値のあるもの）
  var ENCH = [
    ['PROTECTION', 'ダメージ軽減', 4, 'armor', 10, 1, 11], ['FIRE_PROTECTION', '火炎耐性', 4, 'armor', 5, 10, 8],
    ['BLAST_PROTECTION', '爆発耐性', 4, 'armor', 2, 5, 8], ['PROJECTILE_PROTECTION', '飛び道具耐性', 4, 'armor', 5, 3, 6],
    ['FEATHER_FALLING', '落下耐性', 4, 'feet', 5, 5, 6], ['RESPIRATION', '水中呼吸', 3, 'head', 2, 10, 10],
    ['SHARPNESS', 'ダメージ増加', 5, 'weapon', 10, 1, 11], ['SMITE', 'アンデッド特効', 5, 'weapon', 5, 5, 8],
    ['KNOCKBACK', 'ノックバック', 2, 'weapon', 5, 5, 20], ['FIRE_ASPECT', '火属性', 2, 'weapon', 2, 10, 20],
    ['LOOTING', 'ドロップ増加', 3, 'weapon', 2, 15, 9], ['EFFICIENCY', '効率強化', 5, 'digger', 10, 1, 10],
    ['SILK_TOUCH', 'シルクタッチ', 1, 'digger', 1, 15, 0], ['FORTUNE', '幸運', 3, 'digger', 2, 15, 9],
    ['UNBREAKING', '耐久力', 3, 'any', 5, 5, 8], ['POWER', '射撃ダメージ増加', 5, 'bow', 10, 1, 10],
    ['PUNCH', 'パンチ', 2, 'bow', 2, 12, 20], ['FLAME', 'フレイム', 1, 'bow', 2, 20, 0], ['INFINITY', '無限', 1, 'bow', 1, 20, 0],
    ['LURE', '入れ食い', 3, 'rod', 2, 15, 9], ['LUCK_OF_THE_SEA', '宝釣り', 3, 'rod', 2, 15, 9], ['MENDING', '修繕', 1, 'any', 2, 25, 0, true]
  ];
  var ENCHANTS = {};
  ENCH.forEach(function (e) { ENCHANTS[e[0]] = { key: e[0], name: e[1], max: e[2], on: e[3], weight: e[4], min: e[5], step: e[6], treasure: !!e[7] }; });
  // 一緒に付かない組
  var EXCL = [['PROTECTION', 'FIRE_PROTECTION', 'BLAST_PROTECTION', 'PROJECTILE_PROTECTION'], ['SHARPNESS', 'SMITE'], ['SILK_TOUCH', 'FORTUNE'], ['INFINITY', 'MENDING']];
  function compatible(a, b) { return a !== b && !EXCL.some(function (g) { return g.indexOf(a) >= 0 && g.indexOf(b) >= 0; }); }
  var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
  WG.ENCHANTS = ENCHANTS;
  WG.enchText = function (ench) { return Object.keys(ench || {}).map(function (k) { return ENCHANTS[k].name + (ENCHANTS[k].max > 1 ? ' ' + ROMAN[ench[k]] : ''); }).join('、'); };

  // アイテムの種類（エンチャントの付き先）
  function category(key) {
    var it = ITEMS[key];
    if (!it) return null;
    if (it.armor != null) return 'armor' + it.armor;
    if (it.tool === 'sword') return 'weapon';
    if (it.tool === 'pickaxe' || it.tool === 'axe' || it.tool === 'shovel' || it.tool === 'hoe') return 'digger';
    if (it.bow) return 'bow';
    if (it.rod) return 'rod';
    if (it.dur) return 'other';
    if (key === 'BOOK' || key === 'ENCHANTED_BOOK') return 'book';
    return null;
  }
  function applies(e, cat) {
    if (cat === 'book') return true;
    if (!cat) return false;
    if (e.on === 'any') return true;
    if (e.on === 'armor') return /^armor/.test(cat);
    if (e.on === 'head') return cat === 'armor0';
    if (e.on === 'feet') return cat === 'armor3';
    if (e.key === 'SHARPNESS' || e.key === 'SMITE') return cat === 'weapon' || (cat === 'digger' && /_AXE$/.test(arguments[2] || ''));
    return e.on === cat;
  }
  WG.enchantable = function (key) { var c = category(key); return !!c && c !== 'other' || key === 'SHEARS' || key === 'SHIELD' || key === 'FLINT_AND_STEEL'; };
  // 素材ごとのエンチャントのしやすさ（Minecraft の値）
  function enchantability(key) {
    if (/^WOODEN_|^LEATHER_/.test(key)) return 15;
    if (/^STONE_/.test(key)) return 5;
    if (/^IRON_/.test(key)) return ITEMS[key].armor != null ? 9 : 14;
    if (/^GOLDEN_/.test(key)) return ITEMS[key].armor != null ? 25 : 22;
    if (/^DIAMOND_/.test(key)) return 10;
    return 1;
  }
  // 力 power で選べるエンチャントの一覧 [{key, lvl}]
  function available(key, power, treasure) {
    var cat = category(key), out = [];
    Object.keys(ENCHANTS).forEach(function (k) {
      var e = ENCHANTS[k];
      if ((e.treasure && !treasure) || !applies(e, cat, key)) return;
      for (var l = e.max; l >= 1; l--) {
        var lo = e.min + (l - 1) * e.step, hi = lo + (e.step ? 20 : 50);
        if (power >= lo && power <= hi) { out.push({ key: k, lvl: l, weight: e.weight }); break; }
      }
    });
    return out;
  }
  function pick(list, rnd) {
    var total = list.reduce(function (a, e) { return a + e.weight; }, 0), r = rnd() * total;
    for (var i = 0; i < list.length; i++) { r -= list[i].weight; if (r < 0) return list[i]; }
    return list[list.length - 1];
  }
  // エンチャントを決める（Minecraft の作り方：レベルに素材のしやすさを足して揺らし、重みで選び、たまに追加）
  function rollEnchants(key, level, rnd, treasure) {
    var ab = enchantability(key), L = level + 1 + Math.floor(rnd() * (Math.floor(ab / 4) + 1)) + Math.floor(rnd() * (Math.floor(ab / 4) + 1));
    L = Math.max(1, Math.round(L * (1 + (rnd() + rnd() - 1) * 0.15)));
    var list = available(key === 'BOOK' ? 'BOOK' : key, L, treasure), out = {};
    if (!list.length) return out;
    var first = pick(list, rnd); out[first.key] = first.lvl;
    while (rnd() < (L + 1) / 50) {
      list = list.filter(function (e) { return Object.keys(out).every(function (k) { return compatible(k, e.key); }); });
      if (!list.length) break;
      var e = pick(list, rnd); out[e.key] = e.lvl; L = Math.floor(L / 2);
    }
    return out;
  }
  WG.rollEnchants = rollEnchants;
  // エンチャントテーブルの 3 つの候補（本棚の数 0〜15）
  WG.enchantOffers = function (key, shelves, rnd) {
    var base = 1 + Math.floor(rnd() * 8) + Math.floor(shelves / 2) + Math.floor(rnd() * (shelves + 1));
    var costs = [Math.max(Math.floor(base / 3), 1), Math.floor(base * 2 / 3) + 1, Math.max(base, shelves * 2)];
    return costs.map(function (c) { return { cost: c, ench: rollEnchants(key, c, rnd, false) }; });
  };
  // 金床：左のアイテムに、右（同じ道具か本）のエンチャントを合わせる。修理もする。費用はレベル。
  WG.anvilCombine = function (a, b) {
    if (!a || !b) return null;
    var ia = ITEMS[a.key], ib = ITEMS[b.key], out = { key: a.key, n: 1, dmg: a.dmg || 0, ench: Object.assign({}, a.ench || {}) }, cost = 0, changed = false;
    // 材料で修理（1 個で耐久の 25%）
    if (ia.dur && (ia.mat === b.key || (ia.mat === 'PLANKS' && /_PLANKS$/.test(b.key)) || (ia.mat === 'COBBLES' && (b.key === 'COBBLESTONE' || b.key === 'COBBLED_DEEPSLATE'))) && out.dmg > 0) {
      var units = Math.min(b.n, Math.ceil(out.dmg / (ia.dur / 4)));
      out.dmg = Math.max(0, out.dmg - Math.floor(ia.dur / 4) * units);
      return { item: out, cost: units, use: units };
    }
    var book = b.key === 'ENCHANTED_BOOK';
    if (!book && b.key !== a.key) return null;
    if (!book && ia.dur) { var left = ia.dur - (a.dmg || 0) + ia.dur - (b.dmg || 0) + Math.floor(ia.dur * 0.12); var nd = Math.max(0, ia.dur - left); if (nd < out.dmg) { out.dmg = nd; cost += 2; changed = true; } }
    var cat = category(a.key);
    Object.keys(b.ench || {}).forEach(function (k) {
      var e = ENCHANTS[k];
      if (a.key !== 'ENCHANTED_BOOK' && !applies(e, cat, a.key)) return;
      if (!Object.keys(out.ench).every(function (o) { return o === k || compatible(o, k); })) return;
      var lv = out.ench[k] === b.ench[k] ? Math.min(e.max, b.ench[k] + 1) : Math.max(out.ench[k] || 0, b.ench[k]);
      if (lv !== out.ench[k]) { out.ench[k] = lv; changed = true; }
      cost += lv * (book ? 1 : 2) * (e.weight >= 10 ? 1 : e.weight >= 5 ? 2 : 4) / (book ? 2 : 1);
    });
    if (!changed) return null;
    cost = Math.max(1, Math.round(cost));
    if (cost >= 40) return { item: null, cost: cost, tooExpensive: true };
    return { item: out, cost: cost, use: 1 };
  };
  WG.enchLevel = function (s, key) { return s && s.ench && s.ench[key] || 0; };

  // ---------------- ポーション ----------------
  // 効果 [キー, 名前, 色]
  var EFFECTS = {
    SPEED: ['移動速度上昇', '#7cafc6'], SLOWNESS: ['移動速度低下', '#5a6c81'], STRENGTH: ['攻撃力上昇', '#932423'], WEAKNESS: ['弱体化', '#484d48'],
    INSTANT_HEALTH: ['即時回復', '#f82423'], INSTANT_DAMAGE: ['即時ダメージ', '#430a09'], JUMP_BOOST: ['跳躍力上昇', '#22ff4c'],
    REGENERATION: ['再生能力', '#cd5cab'], POISON: ['毒', '#4e9331'], FIRE_RESISTANCE: ['耐火', '#e49a3a'], WATER_BREATHING: ['水中呼吸', '#2e5299'],
    NIGHT_VISION: ['暗視', '#1f1fa1'], INVISIBILITY: ['透明化', '#7f8392']
  };
  WG.EFFECTS = EFFECTS;
  // ポーション [キー, 名前, 効果, 時間（秒）, 長いとき, 強いとき（II の時間）]
  var POTIONS = [
    ['SWIFTNESS', '移動速度上昇', 'SPEED', 180, 480, 90], ['SLOWNESS', '移動速度低下', 'SLOWNESS', 90, 240, 20],
    ['STRENGTH', '力', 'STRENGTH', 180, 480, 90], ['WEAKNESS', '弱化', 'WEAKNESS', 90, 240, 0],
    ['HEALING', '治癒', 'INSTANT_HEALTH', 0, 0, 0], ['HARMING', '負傷', 'INSTANT_DAMAGE', 0, 0, 0],
    ['LEAPING', '跳躍', 'JUMP_BOOST', 180, 480, 90], ['REGENERATION', '再生', 'REGENERATION', 45, 90, 22],
    ['POISON', '毒', 'POISON', 45, 90, 21], ['FIRE_RESISTANCE', '耐火', 'FIRE_RESISTANCE', 180, 480, 0],
    ['WATER_BREATHING', '水中呼吸', 'WATER_BREATHING', 180, 480, 0], ['NIGHT_VISION', '暗視', 'NIGHT_VISION', 180, 480, 0],
    ['INVISIBILITY', '透明化', 'INVISIBILITY', 180, 480, 0]
  ];
  var POT = {};
  POTIONS.forEach(function (p) { POT[p[0]] = p; });
  // 水入りの瓶・奇妙なポーション（効果なし）
  item('POTION_WATER', '水入り瓶', 1, { potion: true, color: '#385dc6' });
  item('POTION_AWKWARD', '奇妙なポーション', 1, { potion: true, color: '#385dc6' });
  POTIONS.forEach(function (p) {
    var vars = [['', p[3], 0, '']];
    if (p[4]) vars.push(['_LONG', p[4], 0, '（延長）']);
    if (p[5] || /HEALING|HARMING/.test(p[0])) vars.push(['_II', p[5], 1, ' II']);
    vars.forEach(function (v) {
      ['', 'SPLASH_'].forEach(function (sp) {
        var key = sp + 'POTION_' + p[0] + v[0];
        item(key, (sp ? '投げ' : '') + p[1] + 'のポーション' + v[3], 1, { potion: true, splash: !!sp, effect: p[2], secs: v[1], amp: v[2], color: EFFECTS[p[2]][1], base: p[0], variant: v[0] });
      });
    });
  });
  // 醸造：(瓶のポーション, 材料) → できるポーション
  function brew(potKey, ing) {
    var it = ITEMS[potKey];
    if (!it || !it.potion) return null;
    var sp = it.splash ? 'SPLASH_' : '';
    if (potKey === 'POTION_WATER') {
      if (ing === 'NETHER_WART') return 'POTION_AWKWARD';
      if (ing === 'FERMENTED_SPIDER_EYE') return 'POTION_WEAKNESS';
      return null;
    }
    if (potKey === 'POTION_AWKWARD') {
      var MAP = { SUGAR: 'SWIFTNESS', GLISTERING_MELON_SLICE: 'HEALING', SPIDER_EYE: 'POISON', GHAST_TEAR: 'REGENERATION', MAGMA_CREAM: 'FIRE_RESISTANCE',
        BLAZE_POWDER: 'STRENGTH', GOLDEN_CARROT: 'NIGHT_VISION', PUFFERFISH: 'WATER_BREATHING', RABBIT_FOOT: 'LEAPING' };
      return MAP[ing] ? 'POTION_' + MAP[ing] : null;
    }
    if (!it.base) return null;
    var p = POT[it.base];
    if (ing === 'GUNPOWDER' && !it.splash) return 'SPLASH_' + potKey;
    if (ing === 'REDSTONE' && p[4] && it.variant !== '_LONG') return sp + 'POTION_' + it.base + '_LONG';
    if (ing === 'GLOWSTONE_DUST' && ITEMS[sp + 'POTION_' + it.base + '_II'] && it.variant !== '_II') return sp + 'POTION_' + it.base + '_II';
    if (ing === 'FERMENTED_SPIDER_EYE') {
      var CORR = { SWIFTNESS: 'SLOWNESS', LEAPING: 'SLOWNESS', HEALING: 'HARMING', POISON: 'HARMING', NIGHT_VISION: 'INVISIBILITY' };
      var to = CORR[it.base];
      if (!to) return null;
      var v = ITEMS[sp + 'POTION_' + to + it.variant] ? it.variant : '';
      return sp + 'POTION_' + to + v;
    }
    return null;
  }
  WG.brew = brew;
  WG.BREW_INGREDIENTS = ['NETHER_WART', 'SUGAR', 'GLISTERING_MELON_SLICE', 'SPIDER_EYE', 'GHAST_TEAR', 'MAGMA_CREAM', 'BLAZE_POWDER', 'GOLDEN_CARROT',
    'PUFFERFISH', 'RABBIT_FOOT', 'FERMENTED_SPIDER_EYE', 'REDSTONE', 'GLOWSTONE_DUST', 'GUNPOWDER'];

  // 醸造台 1 台：[瓶 0〜2, 材料, 燃料（ブレイズパウダー）]。1 回 400 刻み（20 秒）、パウダー 1 つで 20 回。
  function BrewingStand() { this.slots = [null, null, null, null, null]; this.fuel = 0; this.time = 0; }
  BrewingStand.prototype.canBrew = function () {
    var ing = this.slots[3];
    if (!ing) return false;
    for (var i = 0; i < 3; i++) if (this.slots[i] && WG.brew(this.slots[i].key, ing.key)) return true;
    return false;
  };
  BrewingStand.prototype.tick = function () {
    if (this.fuel <= 0 && this.slots[4] && this.slots[4].key === 'BLAZE_POWDER' && this.canBrew()) {
      this.fuel = 20; if (--this.slots[4].n <= 0) this.slots[4] = null;
    }
    if (this.time > 0) {
      if (!this.canBrew()) { this.time = 0; return true; }
      if (--this.time === 0) {
        for (var i = 0; i < 3; i++) if (this.slots[i]) { var to = WG.brew(this.slots[i].key, this.slots[3].key); if (to) this.slots[i] = { key: to, n: 1 }; }
        if (--this.slots[3].n <= 0) this.slots[3] = null;
        return true;
      }
      return false;
    }
    if (this.fuel > 0 && this.canBrew()) { this.fuel--; this.time = 400; return true; }
    return false;
  };
  WG.BrewingStand = BrewingStand;

  // ---------------- 釣り ----------------
  // 釣れるもの（Minecraft の割合：魚 85%、がらくた 10%、お宝 5%。宝釣りでお宝が増え、がらくたが減る）
  WG.fishLoot = function (luck, rnd) {
    var treasure = 0.05 + 0.021 * luck, junk = 0.1 - 0.0195 * luck, r = rnd();
    if (r < treasure) {
      var t = rnd();
      if (t < 0.34) return { key: 'BOW', n: 1, dmg: Math.floor(rnd() * 150), ench: rollEnchants('BOW', 30, rnd, true) };
      if (t < 0.67) return { key: 'FISHING_ROD', n: 1, dmg: Math.floor(rnd() * 30), ench: rollEnchants('FISHING_ROD', 30, rnd, true) };
      return { key: 'ENCHANTED_BOOK', n: 1, ench: rollEnchants('BOOK', 30, rnd, true) };
    }
    if (r < treasure + junk) {
      var J = [['BOWL', 1], ['LEATHER', 1], ['LEATHER_BOOTS', 1], ['ROTTEN_FLESH', 1], ['STICK', 1], ['STRING', 1], ['POTION_WATER', 1], ['BONE', 1]];
      var j = J[Math.floor(rnd() * J.length)];
      return { key: j[0], n: j[1], dmg: j[0] === 'LEATHER_BOOTS' ? Math.floor(rnd() * 50) : undefined };
    }
    var f = rnd();
    return { key: f < 0.6 ? 'COD' : f < 0.85 ? 'SALMON' : f < 0.98 ? 'PUFFERFISH' : 'TROPICAL_FISH', n: 1 };
  };
})(typeof window !== 'undefined' ? window : globalThis);
