// ブロック（ロードマップ 第 16 段階）
// ろうそく（4 本まで・火を付ける・ろうそく付きケーキ）、鐘、書見台と本と羽根ペン（書いた本）、足場（登れる・上の足場もいっしょに壊れる）、
// スポンジ（水を吸う・かまどで乾かす）、鎖、魂のたいまつ・魂の焚き火・魂の火、吊り看板、彫られた本棚（本を 6 冊まで）、遮光ガラス、
// カエルの光（カエルが小さなマグマスライムを食べると）、磨かれた玄武岩、銅の建材（切り込み入りの銅・銅のドア・銅のトラップドア）、
// 溶岩入りの大釜、芽生えたアメジスト（晶洞の中で結晶が育つ）、シーピクルス、ネザースプラウト、ウィザーローズ
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ITEMS = WG.ITEMS, Craft = WG.Craft, Game = WG.Game, Mobs = WG.Mobs, hash = WG.hash;
  function keyOf(id) { return WG.BLOCKS[id] ? WG.BLOCKS[id].key : ''; }
  function blockItem(key, hardness, drop, tool, n) {
    var id = B[key]; ITEMS[key] = { key: key, name: WG.blockName(id), block: id, max: 64, hardness: hardness, drop: drop === undefined ? key : drop, dropMin: n || 1, dropMax: n || 1, dropChance: 1 };
    if (tool) { ITEMS[key].tool = tool; ITEMS[key].needTier = 0; }
    return ITEMS[key];
  }
  function store(wd, name) { return wd[name] || (wd[name] = new Map()); }
  function keyAt(x, y, z) { return x + ',' + y + ',' + z; }
  var FACING_OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };

  // ---------------- アイテム ----------------
  [1, 2, 3, 4].forEach(function (n) { blockItem('CANDLE_' + n, 0.1, 'CANDLE', null, n); blockItem('CANDLE_' + n + '_LIT', 0.1, 'CANDLE', null, n); blockItem('SEA_PICKLE_' + n, 0, 'SEA_PICKLE', null, n); });
  ITEMS.CANDLE = { key: 'CANDLE', name: 'ろうそく', block: B.CANDLE_1, max: 64, hardness: 0.1, drop: 'CANDLE', dropMin: 1, dropMax: 1, dropChance: 1 };
  ITEMS.SEA_PICKLE = { key: 'SEA_PICKLE', name: 'シーピクルス', block: B.SEA_PICKLE_1, max: 64, hardness: 0, drop: 'SEA_PICKLE', dropMin: 1, dropMax: 1, dropChance: 1 };
  blockItem('CANDLE_CAKE', 0.5, 'CANDLE'); blockItem('CANDLE_CAKE_LIT', 0.5, 'CANDLE');
  blockItem('BELL', 5, 'BELL', 'pickaxe'); blockItem('LECTERN', 2.5, 'LECTERN', 'axe'); blockItem('SCAFFOLDING', 0, 'SCAFFOLDING');
  blockItem('SPONGE', 0.6, 'SPONGE', 'hoe'); blockItem('WET_SPONGE', 0.6, 'WET_SPONGE', 'hoe'); blockItem('CHAIN', 5, 'CHAIN', 'pickaxe');
  blockItem('SOUL_TORCH', 0, 'SOUL_TORCH'); blockItem('SOUL_CAMPFIRE', 2, 'SOUL_CAMPFIRE', 'axe'); blockItem('SOUL_FIRE', 0, null);
  ['N', 'E', 'S', 'W'].forEach(function (d) { blockItem('SOUL_WALL_TORCH_' + d, 0, 'SOUL_TORCH'); blockItem('HANGING_SIGN_' + d, 1, 'HANGING_SIGN', 'axe'); blockItem('COPPER_TRAPDOOR_' + ['B', 'T', 'ON', 'OE'][['N', 'E', 'S', 'W'].indexOf(d)], 3, 'COPPER_TRAPDOOR', 'pickaxe'); });
  blockItem('COPPER_TRAPDOOR_OS', 3, 'COPPER_TRAPDOOR', 'pickaxe'); blockItem('COPPER_TRAPDOOR_OW', 3, 'COPPER_TRAPDOOR', 'pickaxe');
  ITEMS.HANGING_SIGN = { key: 'HANGING_SIGN', name: '吊り看板', block: -1, max: 16, shape: 'lump', color: '#a5824f' };
  for (var bs = 0; bs <= 6; bs++) blockItem('CHISELED_BOOKSHELF_' + bs, 1.5, 'CHISELED_BOOKSHELF', 'axe');
  ITEMS.CHISELED_BOOKSHELF = Object.assign({}, ITEMS.CHISELED_BOOKSHELF_0, { key: 'CHISELED_BOOKSHELF', name: '彫られた本棚' });
  blockItem('TINTED_GLASS', 0.3, 'TINTED_GLASS'); blockItem('OCHRE_FROGLIGHT', 0.3); blockItem('VERDANT_FROGLIGHT', 0.3); blockItem('PEARLESCENT_FROGLIGHT', 0.3);
  blockItem('POLISHED_BASALT', 1.25, 'POLISHED_BASALT', 'pickaxe'); blockItem('CUT_COPPER', 3, 'CUT_COPPER', 'pickaxe');
  WG.BLOCKS.forEach(function (b) { var m = /^COPPER_DOOR_[NESW][CO]([LU])$/.exec(b.key); if (m) blockItem(b.key, 3, m[1] === 'L' ? 'COPPER_DOOR' : null, 'pickaxe'); });
  ITEMS.COPPER_DOOR = { key: 'COPPER_DOOR', name: '銅のドア', block: -1, max: 64, door: 'COPPER' };
  ITEMS.COPPER_TRAPDOOR = { key: 'COPPER_TRAPDOOR', name: '銅のトラップドア', block: -1, max: 64, trapdoor: 'COPPER' };
  blockItem('LAVA_CAULDRON', 2, 'CAULDRON', 'pickaxe'); blockItem('BUDDING_AMETHYST', 1.5, null, 'pickaxe');
  blockItem('NETHER_SPROUTS', 0, null); blockItem('WITHER_ROSE', 0, 'WITHER_ROSE');
  ITEMS.WRITABLE_BOOK = { key: 'WRITABLE_BOOK', name: '本と羽根ペン', block: -1, max: 1, shape: 'lump', color: '#8a5a3a' };
  ITEMS.WRITTEN_BOOK = { key: 'WRITTEN_BOOK', name: '書いた本', block: -1, max: 16, shape: 'lump', color: '#6a4a2a' };
  var BOOKS = { BOOK: 1, ENCHANTED_BOOK: 1, WRITABLE_BOOK: 1, WRITTEN_BOOK: 1 };

  // ---------------- レシピ ----------------
  Craft.SHAPED.push(
    [['S', 'H'], { S: 'STRING', H: 'HONEYCOMB' }, 'CANDLE', 1],
    [['SSS', ' B ', ' S '], { S: 'WOOD_SLABS', B: 'BOOKSHELF' }, 'LECTERN', 1],
    [['BSB', 'B B', 'B B'], { B: 'BAMBOO', S: 'STRING' }, 'SCAFFOLDING', 6],
    [['N', 'I', 'N'], { N: 'IRON_NUGGET', I: 'IRON_INGOT' }, 'CHAIN', 1],
    [['C', 'S', 'O'], { C: 'COALS', S: 'STICK', O: 'SOUL_SAND' }, 'SOUL_TORCH', 4],
    [[' S ', 'SOS', 'LLL'], { S: 'STICK', O: 'SOUL_SAND', L: 'LOGS' }, 'SOUL_CAMPFIRE', 1],
    [['C C', 'PPP', 'PPP'], { C: 'CHAIN', P: 'STRIPPED_OAK_LOG' }, 'HANGING_SIGN', 6],
    [['PPP', 'SSS', 'PPP'], { P: 'PLANKS', S: 'WOOD_SLABS' }, 'CHISELED_BOOKSHELF', 1],
    [[' A ', 'AGA', ' A '], { A: 'AMETHYST_SHARD', G: 'GLASS' }, 'TINTED_GLASS', 2],
    [['BB', 'BB'], { B: 'BASALT' }, 'POLISHED_BASALT', 4],
    [['CC', 'CC'], { C: 'COPPER_BLOCK' }, 'CUT_COPPER', 4],
    [['CC', 'CC', 'CC'], { C: 'COPPER_INGOT' }, 'COPPER_DOOR', 3],
    [['CCC', 'CCC'], { C: 'COPPER_INGOT' }, 'COPPER_TRAPDOOR', 2],
    [['GGG', 'GIG', 'G G'], { G: 'GOLD_INGOT', I: 'IRON_INGOT' }, 'BELL', 1]);
  Craft.SHAPELESS.push([['BOOK', 'INK_SAC', 'FEATHER'], 'WRITABLE_BOOK', 1], [['WITHER_ROSE'], 'BLACK_DYE', 1], [['CANDLE', 'CAKE'], 'CANDLE', 1]);
  Craft.SHAPELESS.pop();   // （ケーキは置いてからろうそくを立てる）
  Craft.SMELT.WET_SPONGE = 'SPONGE';
  Craft.FUEL.SCAFFOLDING = 50; Craft.FUEL.LECTERN = 300; Craft.FUEL.CHISELED_BOOKSHELF = 300;

  // ---------------- 本の画面（書く・読む） ----------------
  WG.EXTRA_SCREENS = WG.EXTRA_SCREENS || {};
  WG.EXTRA_SCREENS.book = 1;
  function esc(t) { return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  Game.prototype.openBook = function (book, edit, onTake) {
    if (!book.pages || !book.pages.length) book.pages = [''];
    this.bookCtx = { book: book, page: 0, edit: !!edit, onTake: onTake || null };
    this.openInventory('book');
  };
  var renderExtraScreen = Game.prototype.renderExtraScreen;
  Game.prototype.renderExtraScreen = function (sc) {
    if (sc !== 'book') return renderExtraScreen.apply(this, arguments);
    var c = this.bookCtx, b = c && c.book;
    if (!b) return '';
    var n = b.pages.length, p = c.page, html = '<div class="bookview">';
    html += '<div class="bookhead">' + (b.title ? '<b>' + esc(b.title) + '</b>' + (b.author ? '<span>' + esc(b.author) + '</span>' : '') : '<b>本と羽根ペン</b>') + '<i>' + (p + 1) + ' / ' + n + ' ページ</i></div>';
    html += c.edit ? '<textarea class="bk-text" maxlength="400">' + esc(b.pages[p]) + '</textarea>' : '<div class="bk-page">' + esc(b.pages[p]).replace(/\n/g, '<br>') + '</div>';
    html += '<div class="bookbtns"><div class="trade' + (p > 0 ? '' : ' off') + '" data-c="bookprev" data-i="0"><span class="tname">前のページ</span></div>';
    html += '<div class="trade' + (p < n - 1 || (c.edit && n < 50) ? '' : ' off') + '" data-c="booknext" data-i="0"><span class="tname">' + (p < n - 1 ? '次のページ' : 'ページを足す') + '</span></div>';
    if (c.edit) html += '<div class="trade" data-c="booksign" data-i="0"><span class="tname">題名を付けて閉じる</span></div>';
    if (c.onTake) html += '<div class="trade" data-c="booktake" data-i="0"><span class="tname">本を取る</span></div>';
    return html + '</div></div>';
  };
  var clickExtra = Game.prototype.clickExtra;
  Game.prototype.clickExtra = function (c, i) {
    var bc = this.bookCtx;
    if (bc && /^book(prev|next|sign|take)$/.test(c)) {
      if (c === 'bookprev' && bc.page > 0) bc.page--;
      if (c === 'booknext') { if (bc.page < bc.book.pages.length - 1) bc.page++; else if (bc.edit && bc.book.pages.length < 50) { bc.book.pages.push(''); bc.page++; } }
      if (c === 'booksign') {
        var self = this, bk = bc.book;
        var title = (typeof window !== 'undefined' && window.prompt) ? window.prompt('本の題名（16 文字まで）', '') : '本';
        if (title != null && String(title).trim()) { bk.key = 'WRITTEN_BOOK'; bk.title = String(title).replace(/[<>"&]/g, '').trim().slice(0, 16); bk.author = 'あなた'; self.inv.changed(); self.closeInventory(); return true; }
      }
      if (c === 'booktake' && bc.onTake) { bc.onTake(); this.closeInventory(); return true; }
      return true;
    }
    return clickExtra.apply(this, arguments);
  };
  var renderInventory = Game.prototype.renderInventory;
  Game.prototype.renderInventory = function () {
    var act = typeof document !== 'undefined' && document.activeElement, had = act && act.classList && act.classList.contains('bk-text'), caret = had ? act.selectionStart : 0;
    renderInventory.apply(this, arguments);
    if (this.screen === 'book' && this.ui.invTitle) this.ui.invTitle.textContent = '本';
    if (this.screen !== 'book' || typeof document === 'undefined') return;
    var ta = document.querySelector('.bk-text'), self = this;
    if (!ta) return;
    ta.addEventListener('input', function () { var bc = self.bookCtx; if (bc && bc.edit) bc.book.pages[bc.page] = ta.value.slice(0, 400); });
    ta.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Escape') ta.blur(); });
    ta.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    if (had) { ta.focus(); try { ta.setSelectionRange(caret, caret); } catch (e) { /* 何もしない */ } }
  };

  // ---------------- 置く ----------------
  function solidAt(wd, x, y, z) { return WG.COLLIDE[wd.block(x, y, z)] >= 1 && WG.blockKind(wd.block(x, y, z)) === 'solid'; }
  function candleN(id) { var m = /^CANDLE_(\d)(_LIT)?$/.exec(keyOf(id)); return m ? { n: +m[1], lit: !!m[2] } : null; }
  function pickleN(id) { var m = /^SEA_PICKLE_(\d)$/.exec(keyOf(id)); return m ? +m[1] : 0; }
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), wd = this.world, surv = this.mode === 'survival', self = this;
    if (!t || !held) return place.apply(this, arguments);
    var x = t.px, y = t.py, z = t.pz, free = wd.block(x, y, z) === B.AIR || WG.isWater(wd.block(x, y, z));
    var used = function (id, px, py, pz) { wd.setBlock(px, py, pz, id); if (surv) self.inv.take(self.inv.sel, 1); w.remesh(px, pz); if (WG.Sound) WG.Sound.play('place', px + 0.5, py + 0.5, pz + 0.5); };
    if (held.key === 'CANDLE') {
      var cd = candleN(t.id);
      if (cd && cd.n < 4) { used(B['CANDLE_' + (cd.n + 1) + (cd.lit ? '_LIT' : '')], t.x, t.y, t.z); return; }
      if (t.id === B.CAKE_0) { used(B.CANDLE_CAKE, t.x, t.y, t.z); return; }
      if (free && y === t.y + 1 && solidAt(wd, x, y - 1, z)) used(B.CANDLE_1, x, y, z);
      return;
    }
    if (held.key === 'SEA_PICKLE') {
      var pn = pickleN(t.id);
      if (pn && pn < 4) { used(B['SEA_PICKLE_' + (pn + 1)], t.x, t.y, t.z); return; }
      if (free && y === t.y + 1 && solidAt(wd, x, y - 1, z)) used(B.SEA_PICKLE_1, x, y, z);
      return;
    }
    if (held.key === 'SOUL_TORCH') {
      if (!free) return;
      if (y === t.y + 1 && solidAt(wd, x, y - 1, z)) used(B.SOUL_TORCH, x, y, z);
      else if (y === t.y && solidAt(wd, t.x, t.y, t.z)) { var dx = x - t.x, dz = z - t.z; used(B['SOUL_WALL_TORCH_' + (dx === 1 ? 'E' : dx === -1 ? 'W' : dz === 1 ? 'S' : 'N')], x, y, z); }
      return;
    }
    if (held.key === 'HANGING_SIGN') {
      if (!free || y !== t.y - 1) return;   // 天井の下だけ
      var f = this.facing ? this.facing() : 'N', k = keyAt(x, y, z);
      used(B['HANGING_SIGN_' + FACING_OPP[f]], x, y, z);
      this.mouseR = this.clickR = false;
      if (this.ui.prompt) this.ui.prompt('吊り看板に書く文字（「/」で改行）', function (text) { store(wd, 'signs').set(k, String(text || '').split('/').slice(0, 4).map(function (s) { return s.slice(0, 12); }).join('\n')); });
      return;
    }
    var r = place.apply(this, arguments);
    // スポンジ：まわりの水を吸う
    if (held.key === 'SPONGE' && wd.block(x, y, z) === B.SPONGE && absorb(wd, x, y, z) > 0) { wd.setBlock(x, y, z, B.WET_SPONGE); for (var rx = -7; rx <= 7; rx += 7) for (var rz = -7; rz <= 7; rz += 7) w.remesh(x + rx, z + rz); this.puff(x + 0.5, y + 0.5, z + 0.5, [120, 160, 220], 12, 0.6); }
    if (held.key === 'CHISELED_BOOKSHELF' && wd.block(x, y, z) === B.CHISELED_BOOKSHELF_0) store(wd, 'shelves').set(keyAt(x, y, z), []);
    return r;
  };
  function absorb(wd, x, y, z) {
    var q = [[x, y, z, 0]], seen = new Set([keyAt(x, y, z)]), n = 0;
    while (q.length && n < 65) {
      var c = q.shift();
      [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(function (d) {
        var nx = c[0] + d[0], ny = c[1] + d[1], nz = c[2] + d[2], k = keyAt(nx, ny, nz);
        if (seen.has(k) || c[3] >= 7) return; seen.add(k);
        if (WG.isWater(wd.block(nx, ny, nz)) || wd.block(nx, ny, nz) === B.SEAGRASS || wd.block(nx, ny, nz) === B.KELP) { wd.setBlock(nx, ny, nz, B.AIR); n++; q.push([nx, ny, nz, c[3] + 1]); }
      });
    }
    return n;
  }
  WG.spongeAbsorb = absorb;

  // ---------------- 右クリック ----------------
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    var w = this.walker, t = w.target, held = this.inv.held(), wd = this.world, surv = this.mode === 'survival', self = this;
    var done = function (x, z) { self.mouseR = self.clickR = false; if (x != null) w.remesh(x, z); };
    var mt = this.mobs.target && this.mobs.target.mob;
    if (this.spectator || mt) return use.apply(this, arguments);
    // 本を書く・読む（手に持って右クリック）
    if (held && held.key === 'WRITABLE_BOOK' && !(t && (t.id === B.LECTERN || /^CHISELED_BOOKSHELF_/.test(keyOf(t.id))))) { done(); this.openBook(held, true); return; }
    if (held && held.key === 'WRITTEN_BOOK' && !(t && (t.id === B.LECTERN || /^CHISELED_BOOKSHELF_/.test(keyOf(t.id))))) { done(); this.openBook(held, false); return; }
    if (!t) return use.apply(this, arguments);
    var id = t.id, bk = keyOf(id), k = keyAt(t.x, t.y, t.z), cd = candleN(id), fireTool = held && (held.key === 'FLINT_AND_STEEL' || held.key === 'FIRE_CHARGE');
    // ろうそく：火を付ける・消す
    if ((cd || id === B.CANDLE_CAKE) && fireTool) { wd.setBlock(t.x, t.y, t.z, id === B.CANDLE_CAKE ? B.CANDLE_CAKE_LIT : B['CANDLE_' + cd.n + '_LIT']); if (surv && held.key === 'FIRE_CHARGE') this.inv.take(this.inv.sel, 1); else if (surv && this.wearItem) this.wearItem(this.inv.sel, 1); if (WG.Sound) WG.Sound.play('ignite', t.x, t.y, t.z); done(t.x, t.z); return; }
    if (((cd && cd.lit) || id === B.CANDLE_CAKE_LIT) && !held) { wd.setBlock(t.x, t.y, t.z, id === B.CANDLE_CAKE_LIT ? B.CANDLE_CAKE : B['CANDLE_' + cd.n]); this.puff(t.x + 0.5, t.y + 0.6, t.z + 0.5, [120, 120, 120], 4, 0.2); done(t.x, t.z); return; }
    // ろうそく付きケーキを食べる：ろうそくが落ち、ケーキは 1 切れ減る
    if ((id === B.CANDLE_CAKE || id === B.CANDLE_CAKE_LIT) && !held && this.food < 20) { wd.setBlock(t.x, t.y, t.z, B.CAKE_1); this.spawnItem('CANDLE', 1, t.x + 0.5, t.y + 0.8, t.z + 0.5, 0.1, 10); this.food = Math.min(20, this.food + 2); this.sat = Math.min(this.food, (this.sat || 0) + 0.4); done(t.x, t.z); return; }
    // 鐘
    if (id === B.BELL) { ring(this, t.x, t.y, t.z); done(); return; }
    // 書見台
    if (id === B.LECTERN) {
      var lec = store(wd, 'lecterns'), book = lec.get(k);
      if (!book && held && (held.key === 'WRITABLE_BOOK' || held.key === 'WRITTEN_BOOK')) { lec.set(k, Object.assign({}, held, { n: 1 })); if (surv) this.inv.take(this.inv.sel, 1); done(); return; }
      if (book) { done(); this.openBook(book, false, function () { lec.delete(k); if (!self.inv.add(book.key, 1, 0, null, WG.itemExtra(book))) self.spawnItem(book.key, 1, t.x + 0.5, t.y + 1, t.z + 0.5, 0.1, 10, 0, null, WG.itemExtra(book)); }); return; }
      done(); return;
    }
    // 彫られた本棚：本を入れる・出す
    var sh = /^CHISELED_BOOKSHELF_(\d)$/.exec(bk);
    if (sh) {
      var shelves = store(wd, 'shelves'), list = shelves.get(k) || [];
      if (held && BOOKS[held.key] && list.length < 6) { list.push(Object.assign({}, held, { n: 1 })); if (surv || true) this.inv.take(this.inv.sel, 1); }
      else if (!held && list.length) { var bo = list.pop(); if (!this.inv.add(bo.key, 1, 0, bo.ench, WG.itemExtra(bo))) this.spawnItem(bo.key, 1, t.x + 0.5, t.y + 1, t.z + 0.5, 0.1, 10); }
      else { done(); return; }
      shelves.set(k, list); wd.setBlock(t.x, t.y, t.z, B['CHISELED_BOOKSHELF_' + list.length]); this.inv.changed();
      if (WG.Sound) WG.Sound.play('place', t.x + 0.5, t.y + 0.5, t.z + 0.5, 'wood');
      done(t.x, t.z); return;
    }
    // 吊り看板を書き直す
    if (/^HANGING_SIGN_/.test(bk)) { done(); if (this.ui.prompt) this.ui.prompt('吊り看板に書く文字（「/」で改行）', function (text) { store(wd, 'signs').set(k, String(text || '').split('/').slice(0, 4).map(function (s) { return s.slice(0, 12); }).join('\n')); }); return; }
    // 溶岩入りの大釜
    if (held && held.key === 'LAVA_BUCKET' && id === B.CAULDRON) { wd.setBlock(t.x, t.y, t.z, B.LAVA_CAULDRON); if (surv) this.inv.slots[this.inv.sel] = { key: 'BUCKET', n: 1 }; this.inv.changed(); if (WG.Sound) WG.Sound.play('splash', t.x, t.y, t.z); done(t.x, t.z); return; }
    if (held && held.key === 'BUCKET' && id === B.LAVA_CAULDRON) { wd.setBlock(t.x, t.y, t.z, B.CAULDRON); if (surv) { if (held.n > 1) { held.n--; this.inv.add('LAVA_BUCKET', 1); } else this.inv.slots[this.inv.sel] = { key: 'LAVA_BUCKET', n: 1 }; } this.inv.changed(); done(t.x, t.z); return; }
    var r = use.apply(this, arguments);
    // 魂の火：ソウルサンド・ソウルソイルの上の火は青い
    if (fireTool && wd.block(t.px, t.py, t.pz) === B.FIRE && (wd.block(t.px, t.py - 1, t.pz) === B.SOUL_SAND || wd.block(t.px, t.py - 1, t.pz) === B.SOUL_SOIL)) { wd.setBlock(t.px, t.py, t.pz, B.SOUL_FIRE); w.remesh(t.px, t.pz); }
    return r;
  };
  function ring(g, x, y, z) {
    if (WG.Sound) { WG.Sound.play('bell', x + 0.5, y + 0.5, z + 0.5); }
    g.puff(x + 0.5, y + 0.7, z + 0.5, [250, 220, 120], 10, 0.5);
    // 鐘の音で、近くの敵が光って見える（壁越しにも見つけやすく）
    var now = g.tickCount || 0;
    g.mobs.list.forEach(function (m) { if (WG.MOB_TYPES[m.type] && WG.MOB_TYPES[m.type].hostile && Math.hypot(m.x - x, m.z - z) < 32) m.glowUntil = now + 200; });
  }
  WG.ringBell = ring;
  // 鐘は叩いても鳴る
  var attackBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z), k = keyAt(x, y, z), self = this;
    var r = attackBlock.apply(this, arguments);
    if (wd.block(x, y, z) === id) return r;
    var drop = function (s) { self.spawnItem(s.key, 1, x + 0.5, y + 0.5, z + 0.5, 0.1, 10, s.dmg, s.ench, WG.itemExtra(s)); };
    if (id === B.LECTERN && wd.lecterns && wd.lecterns.get(k)) { drop(wd.lecterns.get(k)); wd.lecterns.delete(k); }
    if (/^CHISELED_BOOKSHELF_/.test(keyOf(id)) && wd.shelves && wd.shelves.get(k)) { wd.shelves.get(k).forEach(drop); wd.shelves.delete(k); }
    if (/^HANGING_SIGN_/.test(keyOf(id)) && wd.signs) wd.signs.delete(k);
    // 足場：上に積んだ足場もいっしょに崩れる
    if (id === B.SCAFFOLDING) for (var yy = y + 1; wd.block(x, yy, z) === B.SCAFFOLDING && yy < y + 64; yy++) { wd.setBlock(x, yy, z, B.AIR); if (this.mode === 'survival') this.spawnItem('SCAFFOLDING', 1, x + 0.5, yy + 0.5, z + 0.5, 0.1, 10); }
    if ((id === B.NETHER_SPROUTS) && this.mode === 'survival' && this.inv.held() && this.inv.held().key === 'SHEARS') this.spawnItem('NETHER_SPROUTS', 1, x + 0.5, y + 0.3, z + 0.5, 0.1, 10);
    if (this.walker.remesh) this.walker.remesh(x, z);
    return r;
  };

  // ---------------- 刻み：アメジストが育つ・ウィザーローズにさわる ----------------
  WG.RANDOM_TICK = WG.RANDOM_TICK || {};
  WG.RANDOM_TICK[B.BUDDING_AMETHYST] = function (g, x, y, z) {
    if (Math.random() > 0.2 || B.AMETHYST_CLUSTER == null) return;
    var d = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]][Math.floor(Math.random() * 6)], wd = g.world;
    if (wd.block(x + d[0], y + d[1], z + d[2]) === B.AIR) { wd.setBlock(x + d[0], y + d[1], z + d[2], B.AMETHYST_CLUSTER); g.walker.remesh(x + d[0], z + d[2]); }
  };
  var tick = Game.prototype.tick;
  Game.prototype.tick = function () {
    var r = tick.apply(this, arguments), w = this.walker, p = w.pos;
    if (p && this.mode === 'survival') {
      var id = this.world.block(Math.floor(p[0]), Math.floor(p[1] + 0.1), Math.floor(p[2]));
      if (id === B.WITHER_ROSE && !(this.effects && this.effects.WITHER)) this.addEffect('WITHER', 40, 0);
    }
    return r;
  };

  // ---------------- 生き物：カエルの光・ウィザーローズ・大目玉魚のスポンジ・鐘で光る ----------------
  var FROG_LIGHT = function (tint) { if (!tint) return 'OCHRE_FROGLIGHT'; return tint[1] > tint[0] ? 'VERDANT_FROGLIGHT' : tint[2] > 160 ? 'PEARLESCENT_FROGLIGHT' : 'OCHRE_FROGLIGHT'; };
  var mtick = Mobs.prototype.tick;
  Mobs.prototype.tick = function () {
    var r = mtick.apply(this, arguments), g = this.game, self = this;
    this.list.forEach(function (f) {
      if (f.type !== 'FROG' || f.dead || f.baby) return;
      self.list.forEach(function (s) {
        if (s.type !== 'MAGMA_SLIME' || s.dead || (s.size || 1) > 1 || Math.hypot(s.x - f.x, s.y - f.y, s.z - f.z) > 1.4) return;
        s.dead = 1; s.silentDeath = true; g.spawnItem(FROG_LIGHT(f.tint), 1, s.x, s.y + 0.3, s.z, 0.1, 10); g.puff(s.x, s.y + 0.3, s.z, [240, 200, 120], 8, 0.4);
      });
    });
    if (this.list.some(function (m) { return m.silentDeath; })) this.list = this.list.filter(function (m) { return !m.silentDeath; });
    return r;
  };
  var die = Mobs.prototype.die;
  Mobs.prototype.die = function (m) {
    var wd = this.world, boss = this.list.some(function (q) { return q.type === 'SKULL_BOSS' && !q.dead && Math.hypot(q.x - m.x, q.z - m.z) < 10; });
    if (boss && m.type !== 'SKULL_BOSS') { var x = Math.floor(m.x), y = Math.floor(m.y), z = Math.floor(m.z); if (wd.block(x, y, z) === B.AIR && WG.COLLIDE[wd.block(x, y - 1, z)] >= 1) { wd.setBlock(x, y, z, B.WITHER_ROSE); if (this.game.walker.remesh) this.game.walker.remesh(x, z); } }
    if (m.type === 'ELDER_EYE_FISH') this.game.spawnItem('WET_SPONGE', 1, m.x, m.y + 0.5, m.z, 0.1, 10);
    return die.apply(this, arguments);
  };
  var draw = Mobs.prototype.draw;
  Mobs.prototype.draw = function (bt, a, cube) {
    var r = draw.apply(this, arguments), now = this.game.tickCount || 0;
    this.list.forEach(function (m) {
      if (!(m.glowUntil > now)) return;
      var T2 = WG.MOB_TYPES[m.type], h = (T2.h || 1) * (T2.scale || 1), wd2 = (T2.w || 0.6) * (T2.scale || 1);
      cube(bt, m.x, m.y + h + 0.2, m.z, 0.12, 0, function () { return 0; }, function () { return [255, 240, 200]; }, [15, 15]);
      void wd2;
    });
    return r;
  };

  // ---------------- 生成：芽生えたアメジスト・シーピクルス・ネザースプラウト ----------------
  var Overworld = WG.Overworld, ogen = Overworld.prototype.generate, MINY = -64;
  Overworld.prototype.generate = function (cx, cz, surfaceOnly) {
    var r = ogen.apply(this, arguments), bl = r.blocks, bio = r.biome, hm = r.hmap, seed = this.seed, x0 = cx << 4, z0 = cz << 4;
    if (!surfaceOnly && B.AMETHYST_BLOCK != null) for (var i = 0; i < bl.length; i++) if (bl[i] === B.AMETHYST_BLOCK && hash(seed, x0 + (i & 15), (i >> 8) + MINY, z0 + ((i >> 4) & 15), 1601) % 12 === 0) bl[i] = B.BUDDING_AMETHYST;
    for (var c = 0; c < 256; c++) {
      if (WG.BIOMES[bio[c]].key !== 'warm_ocean') continue;
      var h = hm[c], above = ((h + 1 - MINY) << 8) | c, hv = hash(seed, x0 + (c & 15), h, z0 + (c >> 4), 1602);
      if (bl[above] === B.WATER && hv % 23 === 0 && bl[((h - MINY) << 8) | c] !== B.WATER) bl[above] = B['SEA_PICKLE_' + (1 + (hv >>> 5) % 4)];
    }
    return r;
  };
  var Nether = WG.Nether, ngen = Nether.prototype.generate;
  Nether.prototype.generate = function (cx, cz) {
    var r = ngen.apply(this, arguments), bl = r.blocks, seed = this.seed, x0 = cx << 4, z0 = cz << 4;
    for (var i = 256; i < bl.length - 256; i++) if (bl[i] === B.AIR && bl[i - 256] === B.WARPED_NYLIUM && hash(seed, x0 + (i & 15), i >> 8, z0 + ((i >> 4) & 15), 1603) % 7 === 0) bl[i] = B.NETHER_SPROUTS;
    return r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
