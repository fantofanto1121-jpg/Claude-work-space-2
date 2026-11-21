// レシピ本（本家と同じく、インベントリ・作業台・かまどの画面の左に出る）。
// ・すべてのレシピを、できるものごとに 1 つの枠で並べる（作れるものが先、作れないものは暗く）。名前で探せる。「作れるものだけ」の切り替えあり
// ・作れるレシピを押すと、持ち物から材料をクラフトの枠に並べる（もう一度押すと 1 回分ずつ増える。Shift＋クリックで作れるだけ）
// ・作れないレシピを押すと、枠に材料の形を薄く出す（何が足りないかが分かる）
// ・3×3 が要るレシピは、インベントリの 2×2 では「作業台」の印を付けて暗くする
// ・かまどでは、焼けるものの一覧を出し、押すと材料の枠へ入れる
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var Game = WG.Game, Craft = WG.Craft, ITEMS = WG.ITEMS, GROUPS = Craft.GROUPS || {};
  function accepts(want, key) { return !!key && (GROUPS[want] ? GROUPS[want].indexOf(key) >= 0 : want === key); }

  // ---- レシピの一覧（できるものごとにまとめる） ----
  var BOOK = null;
  function build() {
    var byOut = {}, order = [];
    function add(r) { if (!ITEMS[r.out]) return; if (!byOut[r.out]) { byOut[r.out] = []; order.push(r.out); } byOut[r.out].push(r); }
    Craft.SHAPED.forEach(function (R) {
      var rows = R[0].slice();
      // 端の空いた行・列を落とす（どこに置いても作れるので）
      while (rows.length && !rows[0].trim()) rows.shift();
      while (rows.length && !rows[rows.length - 1].trim()) rows.pop();
      var w = Math.max.apply(null, rows.map(function (r) { return r.length; })), x0 = 0, x1 = w - 1;
      rows = rows.map(function (r) { while (r.length < w) r += ' '; return r; });
      while (x0 < x1 && rows.every(function (r) { return r[x0] === ' '; })) x0++;
      while (x1 > x0 && rows.every(function (r) { return r[x1] === ' '; })) x1--;
      rows = rows.map(function (r) { return r.slice(x0, x1 + 1); });
      var cells = [];
      rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) cells.push(r[x] === ' ' ? null : { x: x, y: y, want: R[1][r[x]], sym: r[x] }); });
      add({ out: R[2], n: R[3], w: x1 - x0 + 1, h: rows.length, cells: cells.filter(Boolean), shaped: true });
    });
    Craft.SHAPELESS.forEach(function (S) {
      var k = S[0].length, w = k <= 4 ? Math.min(2, k) : 3;
      add({ out: S[1], n: S[2], w: w, h: Math.ceil(k / w), cells: S[0].map(function (want, i) { return { x: i % w, y: Math.floor(i / w), want: want, sym: 'i' + i }; }), shaped: false });
    });
    BOOK = order.map(function (k) { return { out: k, recipes: byOut[k] }; });
  }

  // 持ち物の数（傷みやエンチャントのない束だけを材料に使う）
  function counts(g) {
    var c = {};
    g.inv.slots.forEach(function (s) { if (s && !s.dmg && !s.ench) c[s.key] = (c[s.key] || 0) + s.n; });
    (g.craft || []).forEach(function (s) { if (s && !s.dmg && !s.ench) c[s.key] = (c[s.key] || 0) + s.n; });
    return c;
  }
  // k 回分の材料の割り当て（枠ごとのキー）。足りなければ null。同じ記号には同じ材料を選ぶ
  function assign(r, cnt, k) {
    var left = Object.assign({}, cnt), bySym = {}, out = [];
    for (var i = 0; i < r.cells.length; i++) {
      var c = r.cells[i], key = null;
      var cand = GROUPS[c.want] ? GROUPS[c.want] : [c.want];
      if (bySym[c.sym] && (left[bySym[c.sym]] || 0) >= k) key = bySym[c.sym];
      else cand.forEach(function (kk) { if ((left[kk] || 0) >= k && (!key || left[kk] > left[key])) key = kk; });
      if (!key) return null;
      left[key] -= k; bySym[c.sym] = key; out.push(key);
    }
    return out;
  }
  function fits(r, n) { return r.w <= n && r.h <= n; }
  // できるもの 1 つについて：この枠の大きさで作れるレシピ（あれば）と、作れる回数
  function status(entry, g) {
    var cnt = counts(g), n = g.craftN || 2, best = null, fitsAny = false;
    entry.recipes.forEach(function (r) { if (!fits(r, n)) return; fitsAny = true; if (!best && assign(r, cnt, 1)) best = r; });
    return { recipe: best, fits: fitsAny, needTable: !fitsAny };
  }

  // ---- クラフトの枠に並べる ----
  function takeFromInv(g, key, n) {
    var s = g.inv.slots;
    for (var i = 35; i >= 0 && n > 0; i--) if (s[i] && s[i].key === key && !s[i].dmg && !s[i].ench) { var t = Math.min(n, s[i].n); s[i].n -= t; n -= t; if (s[i].n <= 0) s[i] = null; }
  }
  function clearGrid(g) {
    var wp = g.walker.pos;
    for (var i = 0; i < g.craft.length; i++) if (g.craft[i]) {
      var it = g.craft[i], moved = g.inv.add(it.key, it.n, it.dmg, it.ench);
      if (moved < it.n) g.spawnItem(it.key, it.n - moved, wp[0], wp[1] + 1.2, wp[2], 0.1, 30, it.dmg, it.ench);
      g.craft[i] = null;
    }
  }
  function place(g, r, sets) {
    var cnt = counts(g), max = 64, k, keys = null;
    r.cells.forEach(function (c) { max = Math.min(max, ITEMS[GROUPS[c.want] ? GROUPS[c.want][0] : c.want] ? ITEMS[GROUPS[c.want] ? GROUPS[c.want][0] : c.want].max : 64); });
    for (k = Math.min(sets, max); k >= 1; k--) { keys = assign(r, cnt, k); if (keys) break; }
    if (!keys) return false;
    clearGrid(g);
    var n = g.craftN;
    r.cells.forEach(function (c, i) { takeFromInv(g, keys[i], k); g.craft[c.y * n + c.x] = { key: keys[i], n: k }; });
    g.ghost = null;
    g.updateCraft(); g.inv.changed();
    return true;
  }
  function gridSets(g, r) {
    // 今の枠が、このレシピの何回分になっているか
    if (!g.craftResult || g.craftResult.key !== r.out) return 0;
    var m = 64;
    g.craft.forEach(function (s) { if (s) m = Math.min(m, s.n); });
    return m;
  }
  function showGhost(g, r) {
    var n = g.craftN, cells = new Array(n * n).fill(null);
    r.cells.forEach(function (c) { cells[c.y * n + c.x] = GROUPS[c.want] ? GROUPS[c.want][0] : c.want; });
    g.ghost = { out: r.out, cells: cells };
  }

  // ---- 画面 ----
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function needText(r) {
    var m = {};
    r.cells.forEach(function (c) { var nm = GROUPS[c.want] ? (c.want === 'PLANKS' ? '板材' : c.want === 'LOGS' ? '原木' : c.want === 'COALS' ? '石炭か木炭' : c.want === 'COBBLES' ? '丸石' : c.want === 'WOOD_SLABS' ? '木のハーフブロック' : WG.itemName(GROUPS[c.want][0])) : WG.itemName(c.want); m[nm] = (m[nm] || 0) + 1; });
    return Object.keys(m).map(function (k) { return k + (m[k] > 1 ? '×' + m[k] : ''); }).join('、');
  }
  Game.prototype.bookHTML = function () {
    if (!BOOK) build();
    var g = this, sc = this.screen, q = (this.bookQuery || '').trim(), only = !!this.bookOnly, html = '', list;
    html += '<div class="rb-head"><span class="rb-title">レシピ</span><button class="eopt rb-only' + (only ? ' on' : '') + '" data-c="bookonly">作れるものだけ</button></div>';
    html += '<input class="rb-q" type="text" placeholder="名前で探す" value="' + esc(q) + '" spellcheck="false" autocomplete="off">';
    html += '<div class="rb-list">';
    if (sc === 'furnace') {
      var have = counts(this), keys = Object.keys(Craft.SMELT).filter(function (k) { return ITEMS[k] && ITEMS[Craft.SMELT[k]]; });
      keys.sort(function (a, b) { return (have[b] ? 1 : 0) - (have[a] ? 1 : 0); });
      keys.forEach(function (k) {
        var out = Craft.SMELT[k], ok = !!have[k];
        if (only && !ok) return;
        if (q && WG.itemName(out).indexOf(q) < 0 && WG.itemName(k).indexOf(q) < 0) return;
        html += '<div class="slot rb' + (ok ? '' : ' no') + '" data-c="booksmelt" data-k="' + k + '" title="' + esc(WG.itemName(out) + '（' + WG.itemName(k) + 'を焼く）') + '"><img src="' + WG.iconURL(out) + '" alt=""></div>';
      });
    } else {
      var rows = BOOK.map(function (e) { return { e: e, st: status(e, g) }; });
      rows = rows.filter(function (r) { return (!only || r.st.recipe) && (!q || WG.itemName(r.e.out).indexOf(q) >= 0); });
      rows.sort(function (a, b) { return (b.st.recipe ? 2 : b.st.fits ? 1 : 0) - (a.st.recipe ? 2 : a.st.fits ? 1 : 0); });
      rows.forEach(function (r) {
        var rc = r.st.recipe || r.e.recipes[0], ok = !!r.st.recipe;
        html += '<div class="slot rb' + (ok ? '' : ' no') + (r.st.needTable ? ' tbl' : '') + (g.ghost && g.ghost.out === r.e.out ? ' gh' : '') + '" data-c="book" data-k="' + r.e.out + '" title="' +
          esc(WG.itemName(r.e.out) + (rc.n > 1 ? ' ×' + rc.n : '') + '\n材料：' + needText(rc) + (r.st.needTable ? '\n作業台で作る' : '')) + '"><img src="' + WG.iconURL(r.e.out) + '" alt="">' + (rc.n > 1 ? '<span class="n">' + rc.n + '</span>' : '') + '</div>';
      });
      if (!rows.length) html += '<div class="rb-none">' + (only ? '今の持ち物で作れるものはありません' : '見つかりません') + '</div>';
    }
    html += '</div>';
    var tip = sc === 'furnace' ? '押すと材料の枠へ入れる' : '押すと材料を並べる（もう一度で 1 回分ずつ増える）';
    html += '<div class="rb-tip">' + tip + '</div>';
    return html;
  };

  // 画面の左にレシピ本を足す
  var BOOK_SCREENS = { inv: 1, table: 1, furnace: 1 };
  var render = Game.prototype.renderInventory;
  Game.prototype.renderInventory = function () {
    var body = this.ui.invBody, old = body && body.querySelector && body.querySelector('.rb-list'), keep = old ? old.scrollTop : 0,
      hadFocus = typeof document !== 'undefined' && document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('rb-q');
    render.apply(this, arguments);
    if (!BOOK_SCREENS[this.screen] || !body || !body.querySelector || typeof document === 'undefined') return;
    // 枠の薄い材料（作れないレシピを押したとき）
    if (this.ghost && this.screen !== 'furnace') {
      var g = this;
      [].forEach.call(body.querySelectorAll('.slot[data-c="craft"]'), function (el) {
        var k = g.ghost.cells[+el.dataset.i];
        if (k && !g.craft[+el.dataset.i] && ITEMS[k]) el.insertAdjacentHTML('beforeend', '<img class="ghost" src="' + WG.iconURL(k) + '" alt="">');
        if (k && !g.craft[+el.dataset.i]) el.classList.add('ghosted');
      });
    }
    var row = document.createElement('div'), main = document.createElement('div'), book = document.createElement('div');
    row.className = 'invrow'; main.className = 'invmain'; book.className = 'rbook';
    while (body.firstChild) main.appendChild(body.firstChild);
    book.innerHTML = this.bookHTML();
    row.appendChild(book); row.appendChild(main); body.appendChild(row);
    var lst = book.querySelector('.rb-list'); if (lst) lst.scrollTop = keep;
    var self = this, q = book.querySelector('.rb-q');
    q.addEventListener('input', function () { self.bookQuery = q.value; var l = book.querySelector('.rb-list'), tmp = document.createElement('div'); tmp.innerHTML = self.bookHTML(); l.innerHTML = tmp.querySelector('.rb-list').innerHTML; });
    q.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Escape') q.blur(); });
    if (hadFocus) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  };

  // レシピ本の枠を押したとき
  var clickSlot = Game.prototype.clickSlot;
  Game.prototype.clickSlot = function (el, button, shift) {
    var c = el.dataset.c;
    if (c === 'bookonly') { this.bookOnly = !this.bookOnly; this.renderInventory(); return; }
    if (c === 'booksmelt') {
      var k = el.dataset.k, f = this.furnace(), s = this.inv.slots, inSl = f.slots[0];
      if (inSl && inSl.key !== k) { var mv = this.inv.add(inSl.key, inSl.n, inSl.dmg, inSl.ench); inSl.n -= mv; if (inSl.n > 0) { this.renderInventory(); return; } f.slots[0] = null; }
      for (var i = 0; i < 36; i++) if (s[i] && s[i].key === k) {
        var dst = f.slots[0], room = ITEMS[k].max - (dst ? dst.n : 0), t = Math.min(room, s[i].n);
        if (t <= 0) break;
        if (dst) dst.n += t; else f.slots[0] = { key: k, n: t };
        s[i].n -= t; if (s[i].n <= 0) s[i] = null;
        if (!shift) break;
      }
      this.inv.changed(); this.renderInventory();
      return;
    }
    if (c !== 'book') {
      var r0 = clickSlot.apply(this, arguments);
      if (c === 'craft' && this.ghost && this.craft.some(Boolean)) { this.ghost = null; this.renderInventory(); }
      return r0;
    }
    if (!BOOK) build();
    var key = el.dataset.k, entry = BOOK.filter(function (e) { return e.out === key; })[0];
    if (!entry || this.cursor) return;
    var st = status(entry, this);
    if (!st.recipe) {
      // 作れない：材料の形を薄く出す（この枠に入らないものは「作業台で」と知らせる）
      var r = entry.recipes.filter(function (x) { return fits(x, this.craftN); }, this)[0];
      if (r) { clearGrid(this); showGhost(this, r); this.updateCraft(); this.inv.changed(); }
      else if (this.ui.toast) this.ui.toast(WG.itemName(key) + 'は作業台で作ります（材料：' + needText(entry.recipes[0]) + '）');
      this.renderInventory();
      return;
    }
    var now = gridSets(this, st.recipe);
    place(this, st.recipe, shift ? 64 : now + 1);
    this.renderInventory();
  };
  // 画面を閉じたら薄い材料も消す
  var closeInv = Game.prototype.closeInventory;
  Game.prototype.closeInventory = function () { this.ghost = null; return closeInv.apply(this, arguments); };

  WG.recipeBook = { build: function () { build(); return BOOK; }, status: status, place: place, assign: assign, counts: counts };
})(typeof window !== 'undefined' ? window : globalThis);
