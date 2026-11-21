// ゲームモード（Minecraft と同じ 4 つ）と、鉄の番人の作り方。
// - サバイバル・クリエイティブ：これまでどおり。
// - アドベンチャー：サバイバルと同じく体力・空腹があるが、ブロックを壊すことも置くこともできない（扉・チェスト・取引などは使える）。
// - スペクテイター：空を飛び、ブロックを通り抜ける。ダメージを受けず、敵にも気づかれない。何も壊さず・置かず・使わず、持ち物もない。
// 中では、アドベンチャーは mode = 'survival'、スペクテイターは mode = 'creative' として動かし、違うところだけここで止める。
// 鉄の番人：鉄のブロックを T の字（縦 2 段、上の段の左右に 1 つずつ）に置き、上にくり抜いたカボチャを置くとできる。
// カボチャはハサミで右クリックすると、くり抜いたカボチャになる。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, Game = WG.Game, Walker = WG.Walker;
  WG.GAME_MODES = { survival: 'サバイバル', creative: 'クリエイティブ', adventure: 'アドベンチャー', spectator: 'スペクテイター' };

  var setMode = Game.prototype.setMode;
  Game.prototype.setMode = function (m) {
    if (!WG.GAME_MODES[m]) m = 'survival';
    this.gameMode = m; this.adventure = m === 'adventure'; this.spectator = m === 'spectator';
    setMode.call(this, m === 'adventure' ? 'survival' : m === 'spectator' ? 'creative' : m);
    var w = this.walker;
    w.noclip = this.spectator;
    if (this.spectator) { w.flying = true; if (this.invOpen) this.closeInventory(); }
    if (this.ui.hotbar) this.ui.hotbar.style.visibility = this.spectator ? 'hidden' : '';
  };
  // アドベンチャーは掘れない
  var miningBonus = Game.prototype.miningBonus;
  Game.prototype.miningBonus = function () {
    var r = miningBonus.apply(this, arguments);
    if (this.adventure) r = Object.assign({}, r, { perTick: 0 });
    return r;
  };
  var breakBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function () { if (this.adventure || this.spectator) return; return breakBlock.apply(this, arguments); };
  // アドベンチャーとスペクテイターは置けない
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    if (this.adventure || this.spectator) return;
    var t = this.walker.target, r = place.apply(this, arguments);
    if (t && this.world.block(t.px, t.py, t.pz) === B.CARVED_PUMPKIN) this.tryGolem(t.px, t.py, t.pz);
    return r;
  };
  // スペクテイターは何も使わず、叩かない。ハサミでカボチャをくり抜く
  var use = Game.prototype.use;
  Game.prototype.use = function () {
    if (this.spectator) return;
    var t = this.walker.target, held = this.inv.held();
    if (t && held && held.key === 'SHEARS' && t.id === B.PUMPKIN && !this.adventure) {
      this.world.setBlock(t.x, t.y, t.z, B.CARVED_PUMPKIN); this.walker.remesh(t.x, t.z);
      if (this.mode === 'survival') this.wearTool(1);
      this.mouseR = this.clickR = false;
      return;
    }
    return use.apply(this, arguments);
  };
  var attack = Game.prototype.attack;
  Game.prototype.attack = function (m) { if (this.spectator) return; if (m) m.byPlayer = true; return attack.apply(this, arguments); };
  var key = Game.prototype.key;
  Game.prototype.key = function (e, down) {
    if (this.spectator && (e.code === 'KeyE' || e.code === 'KeyQ')) return true;   // スペクテイターは持ち物を開かない・捨てない
    return key.call(this, e, down);
  };

  // スペクテイターは壁を通り抜ける
  var move = Walker.prototype.move;
  Walker.prototype.move = function (dx, dy, dz) {
    if (!this.noclip) return move.call(this, dx, dy, dz);
    this.pos[0] += dx; this.pos[1] += dy; this.pos[2] += dz;
    this.onGround = false; this.collidedH = false;
    return Math.hypot(dx, dz);
  };

  // ---- 鉄の番人を作る ----
  Game.prototype.tryGolem = function (x, y, z) {
    var wd = this.world, I = B.IRON_BLOCK;
    if (wd.block(x, y - 1, z) !== I || wd.block(x, y - 2, z) !== I) return false;
    var arms = null;
    if (wd.block(x - 1, y - 1, z) === I && wd.block(x + 1, y - 1, z) === I) arms = [[x - 1, z], [x + 1, z]];
    else if (wd.block(x, y - 1, z - 1) === I && wd.block(x, y - 1, z + 1) === I) arms = [[x, z - 1], [x, z + 1]];
    if (!arms) return false;
    var self = this;
    [[x, y, z], [x, y - 1, z], [x, y - 2, z], [arms[0][0], y - 1, arms[0][1]], [arms[1][0], y - 1, arms[1][1]]].forEach(function (c) {
      wd.setBlock(c[0], c[1], c[2], B.AIR); self.walker.remesh(c[0], c[2]);
    });
    var m = this.mobs.spawn('GOLEM', x + 0.5, y - 2, z + 0.5);
    m.home = [x + 0.5, z + 0.5];
    this.puff(x + 0.5, y - 1, z + 0.5, [200, 200, 200], 20, 0.8);
    if (WG.advance) WG.advance(this, 'golem');
    return true;
  };
  // スペクテイターは傷つかない
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    tickExtra.call(this);
    if (this.spectator) { this.health = 20; this.air = 300; this.fire = 0; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
