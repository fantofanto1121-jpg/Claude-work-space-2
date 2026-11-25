// 動きと体験（ロードマップ 第 6 段階）
// 難易度：ピースフル・イージー・ノーマル・ハード（敵・受けるダメージ・空腹）
// 統計：歩いた・泳いだ・飛んだ距離、掘った・置いたブロック、倒した生き物など（L キーの画面に「統計」の札）
// 泳ぎ：水に飛び込むしぶき、口からの泡、水面を泳ぐときの白い航跡
// しゃがむと縁で止まる・水中を這う姿勢・修繕のエンチャントは、前からある（js/walk.js・js/play2.js）。ここでは確かめるテストを足す
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var Game = WG.Game, Mobs = WG.Mobs, ITEMS = WG.ITEMS;
  var DIFFS = [['peaceful', 'ピースフル'], ['easy', 'イージー'], ['normal', 'ノーマル'], ['hard', 'ハード']];
  WG.DIFFICULTIES = DIFFS;
  WG.pendingDifficulty = 'normal';
  function diffOf(g) { var p = g.player || g; return p.difficulty || 'normal'; }
  WG.difficultyOf = diffOf;
  Game.prototype.setDifficulty = function (d) {
    if (!DIFFS.some(function (q) { return q[0] === d; })) return false;
    (this.player || this).difficulty = d;
    if (d === 'peaceful') this.clearHostiles();
    return true;
  };
  Game.prototype.clearHostiles = function () {
    var T = WG.MOB_TYPES;
    if (!this.mobs || !this.mobs.list) return;
    var keep = this.mobs.list.filter(function (m) { return !(T[m.type] && T[m.type].hostile) || m.type === 'END_DRAGON' || m.type === 'SKULL_BOSS'; });   // ボスは残す
    this.mobs.list.length = 0; Array.prototype.push.apply(this.mobs.list, keep);
  };

  // ---------------- 難易度の効き目 ----------------
  // 生き物・矢から受けるダメージ：イージーは半分＋1（元より大きくはしない）、ハードは 1.5 倍
  WG.scaleMobDamage = function (d, n) { return d === 'easy' ? Math.min(n, n / 2 + 1) : d === 'hard' ? n * 1.5 : d === 'peaceful' ? 0 : n; };
  var hurtPlayer = Game.prototype.hurtPlayer;
  Game.prototype.hurtPlayer = function (n, fx, fz, type) {
    var args = Array.prototype.slice.call(arguments);
    args[0] = WG.scaleMobDamage(diffOf(this), n);
    if (args[0] <= 0) return;
    return hurtPlayer.apply(this, args);
  };
  // 空腹：ピースフルは減らず体力も満腹度も戻る、イージーは体力 10 まで、ノーマルは 1 まで、ハードは倒れるまで減る
  var hunger = Game.prototype.hunger;
  Game.prototype.hunger = function () {
    var d = diffOf(this), pre = this.foodTimer || 0, hp = this.health;
    if (d === 'peaceful') {
      this.exhaust = 0;
      if (((this.tickCount || 0) % 20) === 0) { if (this.health < 20) this.health = Math.min(20, this.health + 1); if (this.food < 20) this.food++; }
    }
    this._starving = this.food <= 0;
    hunger.apply(this, arguments);
    this._starving = false;
    if (d === 'easy' && this.food <= 0 && hp <= 10 && this.health < hp) this.health = hp;
    if (d === 'hard' && this.food <= 0 && pre >= 79 && this.health === 1 && hp === 1) this.damage(1, true);
  };
  // ピースフルでは、敵は出てこない（出てきたものもすぐ消える）
  var spawnTick = Mobs.prototype.spawnTick;
  Mobs.prototype.spawnTick = function () {
    var r = spawnTick.apply(this, arguments);
    if (this.game && diffOf(this.game) === 'peaceful') this.game.clearHostiles();
    return r;
  };

  // ---------------- 統計 ----------------
  function stats(g) {
    var p = g.player || g;
    if (!p.stats) p.stats = { time: 0, walk: 0, sprint: 0, sneak: 0, swim: 0, fly: 0, glide: 0, fall: 0, jumps: 0, mined: 0, placed: 0, kills: 0, deaths: 0, dealt: 0, taken: 0, crafted: 0, minedBy: {}, killedBy: {} };
    return p.stats;
  }
  WG.playerStats = stats;
  var tick = Game.prototype.tick;
  Game.prototype.tick = function () {
    WG.curGame = this;
    if (this.player && this.player.difficulty == null) this.player.difficulty = WG.pendingDifficulty || 'normal';
    var w = this.walker, p0 = this._lastPos, ground0 = this._lastGround;
    var r = tick.apply(this, arguments);
    if (w && w.pos) { this._lastPos = w.pos.slice(); this._lastGround = w.onGround; }
    if (!p0 || !w || this.dead || this.spectator) return r;
    var s = stats(this), p = w.pos, dx = p[0] - p0[0], dy = p[1] - p0[1], dz = p[2] - p0[2], h = Math.sqrt(dx * dx + dz * dz);
    s.time++;
    if (h < 2 && Math.abs(dy) < 4) {   // テレポートは数えない
      var wet = w.fluid && w.fluid() === 'water';
      if (this.gliding) s.glide += Math.sqrt(h * h + dy * dy);
      else if (w.flying) s.fly += Math.sqrt(h * h + dy * dy);
      else if (w.swimming || wet) s.swim += h;
      else if (w.onGround || ground0) { if (w.sprint) s.sprint += h; else if (w.sneak) s.sneak += h; else s.walk += h; }
      else if (dy < 0) s.fall += -dy;
    }
    if (ground0 && !w.onGround && w.vel && w.vel[1] > 0.3 && !w.flying) s.jumps++;
    swimEffects(this, p0);
    return r;
  };
  var breakBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function (x, y, z) {
    var wd = this.world, id = wd.block(x, y, z), r = breakBlock.apply(this, arguments);
    if (id !== WG.B.AIR && wd.block(x, y, z) !== id) { var s = stats(this), k = WG.BLOCKS[id].key; s.mined++; s.minedBy[k] = (s.minedBy[k] || 0) + 1; }
    return r;
  };
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var t = this.walker.target, wd = this.world, before = t ? wd.block(t.px, t.py, t.pz) : null;
    var r = place.apply(this, arguments);
    if (t && wd.block(t.px, t.py, t.pz) !== before && wd.block(t.px, t.py, t.pz) !== WG.B.AIR) stats(this).placed++;
    return r;
  };
  var attack = Game.prototype.attack;
  Game.prototype.attack = function (m) {
    var hp = m && m.hp, r = attack.apply(this, arguments);
    if (m && hp != null && m.hp < hp) stats(this).dealt += Math.min(hp, hp - m.hp);
    return r;
  };
  var die = Mobs.prototype.die;
  Mobs.prototype.die = function (m) {
    if (m && m.byPlayer && this.game) { var s = stats(this.game); s.kills++; s.killedBy[m.type] = (s.killedBy[m.type] || 0) + 1; }
    return die.apply(this, arguments);
  };
  var gdie = Game.prototype.die;
  Game.prototype.die = function () { if (!this.dead) stats(this).deaths++; return gdie.apply(this, arguments); };
  var damage = Game.prototype.damage;
  Game.prototype.damage = function () {
    var hp = this.health, r = damage.apply(this, arguments);
    if (r && this.health < hp) stats(this).taken += hp - this.health;
    return r;
  };
  var consumeCraft = Game.prototype.consumeCraft;
  Game.prototype.consumeCraft = function () { if (this.craftResult) stats(this).crafted += this.craftResult.n || 1; return consumeCraft.apply(this, arguments); };

  // ---------------- 統計の画面（進捗の画面に札を付ける） ----------------
  function fmtDist(m) { return m >= 1000 ? (m / 1000).toFixed(2) + ' km' : Math.round(m) + ' m'; }
  function fmtTime(t) { var sec = Math.floor(t / 20), hh = Math.floor(sec / 3600), mm = Math.floor(sec / 60) % 60; return hh ? hh + ' 時間 ' + mm + ' 分' : mm + ' 分 ' + (sec % 60) + ' 秒'; }
  function icon(k) { try { return WG.iconURL(k); } catch (e) { return ''; } }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  var MOVE = [['walk', '歩いた', '#8aa070'], ['sprint', '走った', '#b89a5a'], ['sneak', 'しゃがんで歩いた', '#7a8a90'], ['swim', '泳いだ', '#5a8ab0'], ['fly', '飛んだ', '#a0a0b8'], ['glide', '滑空した', '#9a7ab0'], ['fall', '落ちた', '#a86a5a']];
  Game.prototype.renderStats = function () {
    var s = stats(this), max = 1, html = '<div class="stats">';
    MOVE.forEach(function (m) { max = Math.max(max, s[m[0]]); });
    html += '<div class="stcard wide"><h4>移動</h4>';
    MOVE.forEach(function (m) {
      html += '<div class="strow"><span class="stk">' + m[1] + '</span><span class="stbar"><i style="width:' + (s[m[0]] / max * 100).toFixed(1) + '%;background:' + m[2] + '"></i></span><span class="stv">' + fmtDist(s[m[0]]) + '</span></div>';
    });
    html += '</div>';
    var nums = [['遊んだ時間', fmtTime(s.time)], ['ジャンプ', s.jumps + ' 回'], ['倒れた', s.deaths + ' 回'], ['与えたダメージ', (s.dealt / 2).toFixed(1) + ' ハート'], ['受けたダメージ', (s.taken / 2).toFixed(1) + ' ハート'], ['作ったもの', s.crafted + ' 個'],
      ['掘ったブロック', s.mined + ' 個'], ['置いたブロック', s.placed + ' 個'], ['倒した生き物', s.kills + ' 匹'], ['難易度', DIFFS.filter(function (q) { return q[0] === diffOf(this); }, this)[0][1]]];
    html += '<div class="stcard wide stnums">' + nums.map(function (n) { return '<div><span>' + n[0] + '</span><b>' + n[1] + '</b></div>'; }).join('') + '</div>';
    var top = function (obj, n) { return Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; }).slice(0, n); };
    html += '<div class="stcard"><h4>よく掘ったブロック</h4>';
    var tm = top(s.minedBy, 6);
    if (!tm.length) html += '<div class="stnone">まだありません</div>';
    tm.forEach(function (k) {
      var ik = ITEMS[k] ? k : null;
      html += '<div class="stitem">' + (ik && icon(ik) ? '<img src="' + icon(ik) + '" alt="">' : '<i></i>') + '<span>' + esc(WG.blockName(WG.B[k])) + '</span><b>' + s.minedBy[k] + '</b></div>';
    });
    html += '</div><div class="stcard"><h4>よく倒した生き物</h4>';
    var tk = top(s.killedBy, 6);
    if (!tk.length) html += '<div class="stnone">まだありません</div>';
    tk.forEach(function (k) {
      var egg = ITEMS['SPAWN_EGG_' + k] ? 'SPAWN_EGG_' + k : null, T = WG.MOB_TYPES[k];
      html += '<div class="stitem">' + (egg && icon(egg) ? '<img src="' + icon(egg) + '" alt="">' : '<i></i>') + '<span>' + esc(T ? T.name : k) + '</span><b>' + s.killedBy[k] + '</b></div>';
    });
    return html + '</div></div>';
  };
  var renderAdv = Game.prototype.renderAdvancements;
  Game.prototype.renderAdvancements = function () {
    var tab = this.advTab || 'adv';
    var head = '<div class="advtabs"><div class="slot advtab' + (tab === 'adv' ? ' on' : '') + '" data-c="advtab" data-i="0">進捗</div><div class="slot advtab' + (tab === 'stats' ? ' on' : '') + '" data-c="advtab" data-i="1">統計</div></div>';
    return head + (tab === 'stats' ? this.renderStats() + '<div class="note">L キーで閉じる</div>' : renderAdv.apply(this, arguments));
  };
  var clickExtra = Game.prototype.clickExtra;
  Game.prototype.clickExtra = function (c, i) {
    if (c === 'advtab') { this.advTab = i ? 'stats' : 'adv'; return true; }
    return clickExtra.apply(this, arguments);
  };

  // ---------------- 泳ぎの見た目と音 ----------------
  function swimEffects(g, p0) {
    var w = g.walker, wd = g.world, p = w.pos, ps = g.particles;
    if (!ps) return;
    var eye = [p[0], p[1] + (w.swimming || w.crawl ? 0.4 : w.sneak ? 1.27 : 1.62), p[2]];
    var feetWet = WG.isWater(wd.block(Math.floor(p[0]), Math.floor(p[1] + 0.1), Math.floor(p[2])));
    var eyeWet = WG.isWater(wd.block(Math.floor(eye[0]), Math.floor(eye[1]), Math.floor(eye[2])));
    // 飛び込んだしぶき（速く落ちて水に入ったとき）
    var wasWet = g._feetWet;
    g._feetWet = feetWet;
    if (feetWet && wasWet === false && p0[1] - p[1] > 0.25) {
      var sy = Math.floor(p[1] + 0.1) + 1, n = Math.min(40, 14 + Math.floor((p0[1] - p[1]) * 30));
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, sp = 0.06 + Math.random() * 0.1;
        ps.push({ x: p[0] + Math.cos(a) * 0.3, y: sy, z: p[2] + Math.sin(a) * 0.3, vx: Math.cos(a) * sp, vy: 0.18 + Math.random() * 0.2, vz: Math.sin(a) * sp, life: 16 + Math.floor(Math.random() * 10), c: [228, 240, 250], sz: 0.07 });
      }
      if (WG.Sound) WG.Sound.play('splash', p[0], p[1], p[2]);
    }
    var d = w.dir || [0, 0, -1];
    // 口から泡（水の中で、ときどき。目の少し前に出て、上へ昇る）
    if (eyeWet && g.tickCount % 9 === 0) {
      for (var q = 0; q < 1 + (Math.random() < 0.4 ? 1 : 0); q++)
        ps.push({ x: eye[0] + d[0] * 0.7 + (Math.random() - 0.5) * 0.25, y: eye[1] - 0.15 + d[1] * 0.5, z: eye[2] + d[2] * 0.7 + (Math.random() - 0.5) * 0.25, vx: (Math.random() - 0.5) * 0.01, vy: 0.03, vz: (Math.random() - 0.5) * 0.01, life: 40, c: [196, 226, 246], smoke: true, sz: 0.035 + Math.random() * 0.03 });
    }
    // 泳いでいると、まわりの泡が後ろへ流れていく（進んでいる感じ）
    if (w.swimming && g.tickCount % 2 === 0) {
      var sx = -d[2], sz2 = d[0], side = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.7);
      ps.push({ x: eye[0] + d[0] * 1.6 + sx * side, y: eye[1] + (Math.random() - 0.6) * 0.8, z: eye[2] + d[2] * 1.6 + sz2 * side, vx: -d[0] * 0.06, vy: 0.01, vz: -d[2] * 0.06, life: 26, c: [210, 232, 248], smoke: true, sz: 0.03 + Math.random() * 0.02 });
    }
    // 水面を進むと、白い航跡
    var surf = feetWet && !eyeWet && !WG.isWater(wd.block(Math.floor(p[0]), Math.floor(p[1] + 1.2), Math.floor(p[2])));
    var h = Math.hypot(p[0] - p0[0], p[2] - p0[2]);
    if (surf && h > 0.08 && g.tickCount % 2 === 0) {
      var top = Math.floor(p[1] + 0.1) + 0.92;
      for (var k = 0; k < 2; k++) ps.push({ x: p[0] + (Math.random() - 0.5) * 0.6, y: top, z: p[2] + (Math.random() - 0.5) * 0.6, vx: (Math.random() - 0.5) * 0.03, vy: 0.01, vz: (Math.random() - 0.5) * 0.03, life: 18, c: [236, 244, 250], smoke: true, sz: 0.06 });
    }
  }
  WG.swimEffects = swimEffects;

  // ---------------- コマンド /difficulty ----------------
  var run = WG.runCommand;
  if (run) WG.runCommand = function (g, text) {
    var a = String(text || '').trim().replace(/^\//, '').split(/\s+/);
    if ((a[0] || '').toLowerCase() !== 'difficulty') return run.apply(this, arguments);
    var k = (a[1] || '').toLowerCase(), names = { p: 'peaceful', e: 'easy', n: 'normal', h: 'hard', 0: 'peaceful', 1: 'easy', 2: 'normal', 3: 'hard' };
    k = names[k] || k;
    if (!k) return '今の難易度：' + DIFFS.filter(function (q) { return q[0] === diffOf(g); })[0][1];
    if (!g.setDifficulty(k)) return '使い方：/difficulty <peaceful|easy|normal|hard>';
    syncButtons();
    return '難易度を' + DIFFS.filter(function (q) { return q[0] === k; })[0][1] + 'にしました';
  };

  // ---------------- 横の欄の難易度のボタン ----------------
  function syncButtons() {
    if (typeof document === 'undefined') return;
    var box = document.getElementById('diffs');
    if (!box) return;
    var cur = WG.curGame ? diffOf(WG.curGame) : WG.pendingDifficulty;
    [].forEach.call(box.children, function (b) { b.classList.toggle('on', b.dataset.d === cur); });
  }
  WG.syncDifficultyButtons = syncButtons;
  if (typeof document !== 'undefined') {
    var hook = function () {
      var box = document.getElementById('diffs');
      if (!box) return;
      box.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        WG.pendingDifficulty = b.dataset.d;
        if (WG.curGame) WG.curGame.setDifficulty(b.dataset.d);
        syncButtons();
        b.blur();
      });
      syncButtons();
      setInterval(syncButtons, 1500);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
  }
})(typeof window !== 'undefined' ? window : globalThis);
