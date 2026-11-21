// ネザーポータル（Minecraft と同じ決まり）。
// - 黒曜石で内側が幅 2〜21・高さ 3〜21 の枠を作り（四隅はなくてよい）、内側に火打石と打ち金で火を付けると、内側がポータルになる。
// - ポータルの中に 4 秒（クリエイティブはすぐ）立っていると、地上 ⇔ ネザーへ移る。ネザーの 1 ブロックは地上の 8 ブロック。
// - 移った先の近く（ネザー 16 ブロック、地上 128 ブロック以内）にポータルがあればそこに出る。なければ新しく作る（足場の黒曜石も）。
// - 枠の黒曜石を壊すと、つながったポータルは消える。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, Game = WG.Game;
  var PX = B.NETHER_PORTAL_X, PZ = B.NETHER_PORTAL_Z;
  function isPortal(id) { return id === PX || id === PZ; }
  WG.isPortal = isPortal;
  function open(id) { return id === B.AIR || id === B.FIRE; }

  function portals(wd) { return wd.portals || (wd.portals = []); }

  // (x, y, z) を内側に含む枠を探して、ポータルで満たす。できたら { x, y, z, axis, w, h }
  function findFrame(wd, x, y, z, axis) {
    var dx = axis === 'X' ? 1 : 0, dz = axis === 'X' ? 0 : 1, y0 = y, l = 0, r = 0, h, i, j;
    if (!open(wd.block(x, y, z))) return null;
    while (y - y0 < 21 && open(wd.block(x, y0 - 1, z))) y0--;
    if (wd.block(x, y0 - 1, z) !== B.OBSIDIAN) return null;
    while (l < 21 && open(wd.block(x - dx * (l + 1), y0, z - dz * (l + 1)))) l++;
    while (r < 21 && open(wd.block(x + dx * (r + 1), y0, z + dz * (r + 1)))) r++;
    var x0 = x - dx * l, z0 = z - dz * l, w = l + r + 1;
    if (w < 2 || w > 21) return null;
    if (wd.block(x0 - dx, y0, z0 - dz) !== B.OBSIDIAN || wd.block(x0 + dx * w, y0, z0 + dz * w) !== B.OBSIDIAN) return null;
    for (h = 0; h < 22 && open(wd.block(x0, y0 + h, z0)); h++);
    if (h < 3 || h > 21) return null;
    for (i = 0; i < w; i++) {
      var cx = x0 + dx * i, cz = z0 + dz * i;
      if (wd.block(cx, y0 - 1, cz) !== B.OBSIDIAN || wd.block(cx, y0 + h, cz) !== B.OBSIDIAN) return null;
      for (j = 0; j < h; j++) if (!open(wd.block(cx, y0 + j, cz))) return null;
    }
    for (j = 0; j < h; j++) if (wd.block(x0 - dx, y0 + j, z0 - dz) !== B.OBSIDIAN || wd.block(x0 + dx * w, y0 + j, z0 + dz * w) !== B.OBSIDIAN) return null;
    return { x: x0, y: y0, z: z0, axis: axis, w: w, h: h };
  }
  function fill(game, p) {
    var wd = game.world, dx = p.axis === 'X' ? 1 : 0, dz = 1 - dx, id = p.axis === 'X' ? PX : PZ;
    for (var i = 0; i < p.w; i++) for (var j = 0; j < p.h; j++) {
      var x = p.x + dx * i, y = p.y + j, z = p.z + dz * i;
      if (wd.fires) wd.fires.delete(x + ',' + y + ',' + z);
      wd.setBlock(x, y, z, id);
      game.walker.remesh(x, z);
    }
    portals(wd).push({ x: p.x, y: p.y, z: p.z, axis: p.axis, w: p.w, h: p.h });
  }
  // 火を付けたところが枠の内側なら、ポータルを作る
  WG.lightPortal = function (game, x, y, z) {
    if (game.world.dimKey === 'end') return false;
    var p = findFrame(game.world, x, y, z, 'X') || findFrame(game.world, x, y, z, 'Z');
    if (!p) return false;
    fill(game, p);
    if (WG.Sound) WG.Sound.play('portal', x + 0.5, y + 0.5, z + 0.5);
    return true;
  };
  // 壊れたブロックの隣のポータルを、つながっているものごと消す
  WG.breakPortalNear = function (game, x, y, z) {
    var wd = game.world, stack = [], seen = {};
    [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0, 0, 0]].forEach(function (d) { stack.push([x + d[0], y + d[1], z + d[2]]); });
    var n = 0;
    while (stack.length && n < 2000) {
      var c = stack.pop(), k = c.join(',');
      if (seen[k]) continue;
      seen[k] = 1;
      if (!isPortal(wd.block(c[0], c[1], c[2]))) continue;
      wd.setBlock(c[0], c[1], c[2], B.AIR); game.walker.remesh(c[0], c[2]); n++;
      [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(function (d) { stack.push([c[0] + d[0], c[1] + d[1], c[2] + d[2]]); });
    }
    if (n) wd.portals = portals(wd).filter(function (p) { return isPortal(wd.block(p.x, p.y, p.z)); });
  };

  // ---- 移った先：近くのポータルを探すか、新しく作る ----
  // 返すのは立つ場所 [x, y, z] と向き（ポータルの面に垂直）
  WG.portalArrival = function (wd, x, z, fromY) {
    var reach = wd.dimKey === 'nether' ? 16 : 128, best = null, bd = 1e9;
    wd.portals = portals(wd).filter(function (p) { return isPortal(wd.block(p.x, p.y, p.z)); });
    wd.portals.forEach(function (p) {
      var d = Math.max(Math.abs(p.x - x), Math.abs(p.z - z));
      if (d <= reach && d < bd) { bd = d; best = p; }
    });
    if (!best) best = buildPortal(wd, Math.floor(x), Math.floor(z), fromY);
    var dx = best.axis === 'X' ? 1 : 0, dz = 1 - dx;
    return { pos: [best.x + dx * best.w / 2 + dz * 0.5, best.y, best.z + dz * best.w / 2 + dx * 0.5], yaw: best.axis === 'X' ? 0 : Math.PI / 2 };
  };
  // 幅 2・高さ 3 の内側を持つポータルを作る（東西向き）。前後に 1 マスずつ足場と空き
  function buildPortal(wd, x, z, fromY) {
    var lo = wd.minY + 6, hi = wd.dimKey === 'nether' ? 118 : wd.maxY - 8, at = null, y, k;
    function fits(px, py, pz) {
      for (var i = -1; i <= 2; i++) for (var dz = -1; dz <= 1; dz++) {
        if (!WG.COLLIDE[wd.block(px + i, py - 1, pz + dz)] && dz === 0) return false;
        for (var j = 0; j < 4; j++) { var b = wd.block(px + i, py + j, pz + dz); if (WG.COLLIDE[b] || WG.FLUID[b]) return false; }
      }
      return true;
    }
    // 近くを渦巻き状に、元の高さに近い順で探す
    var start = Math.max(lo, Math.min(hi, wd.dimKey === 'overworld' && wd.gen.column ? wd.gen.column(x, z).h + 1 : Math.round(fromY)));
    for (var r = 0; r <= 16 && !at; r += 2) {
      for (var a = 0; a < Math.max(1, r * 4) && !at; a++) {
        var t = a / Math.max(1, r * 4) * Math.PI * 2, px = x + Math.round(Math.cos(t) * r), pz = z + Math.round(Math.sin(t) * r);
        for (k = 0; k < 48 && !at; k++) {
          y = start + (k & 1 ? -1 : 1) * ((k + 1) >> 1);
          if (y < lo || y > hi) continue;
          if (fits(px, y, pz)) at = [px, y, pz];
        }
      }
    }
    if (!at) {
      // 場所がなければ、元の高さに空間をくりぬき、黒曜石の足場を置く
      y = Math.max(lo + 2, Math.min(hi - 4, start));
      at = [x, y, z];
      for (var i = -1; i <= 2; i++) for (var dz = -1; dz <= 1; dz++) {
        wd.setBlock(x + i, y - 1, z + dz, B.OBSIDIAN);
        for (var j = 0; j < 4; j++) wd.setBlock(x + i, y + j, z + dz, B.AIR);
      }
    }
    x = at[0]; y = at[1]; z = at[2];
    for (i = -1; i <= 2; i++) for (j = -1; j <= 3; j++) {
      if (i >= 0 && i <= 1 && j >= 0 && j <= 2) wd.setBlock(x + i, y + j, z, PX);
      else wd.setBlock(x + i, y + j, z, B.OBSIDIAN);
    }
    var p = { x: x, y: y, z: z, axis: 'X', w: 2, h: 3 };
    portals(wd).push(p);
    return p;
  }

  // ---- ゲームに足す：ポータルの中にいる時間を数え、移る ----
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    tickExtra.call(this);
    var w = this.walker, wd = this.world, p = w.pos;
    var inside = isPortal(wd.block(Math.floor(p[0]), Math.floor(p[1] + 0.2), Math.floor(p[2]))) || isPortal(wd.block(Math.floor(p[0]), Math.floor(p[1] + 1.2), Math.floor(p[2])));
    if (!inside) { this.portalT = 0; this.portalLock = false; return; }
    if (this.portalLock || this.dead || !this.ui.travel) return;
    this.portalT = (this.portalT || 0) + 1;
    if (this.portalT === 1 && WG.Sound) WG.Sound.play('portal', p[0], p[1] + 1, p[2]);
    if (this.portalT >= (this.mode === 'creative' ? 1 : 80)) {
      this.portalT = 0; this.portalLock = true;
      var dest = wd.dimKey === 'nether' ? 'overworld' : 'nether', k = dest === 'nether' ? 1 / 8 : 8;
      this.ui.travel(dest, p[0] * k, p[1], p[2] * k);
    }
  };
  // 枠を壊したら、ポータルも消える
  var breakBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function (x, y, z, harvest) {
    var id = this.world.block(x, y, z), r = breakBlock.call(this, x, y, z, harvest);
    if (id === B.OBSIDIAN || isPortal(id)) WG.breakPortalNear(this, x, y, z);
    return r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
