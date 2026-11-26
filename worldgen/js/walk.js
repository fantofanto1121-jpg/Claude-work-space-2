// 歩く（パソコン版のみ）。操作は Minecraft と同じ：
//   マウスで視点、W A S D で移動、スペースでジャンプ（水の中では上がる）、
//   左 Shift でスニーク（端から落ちない）、左 Ctrl か W の 2 度押しでダッシュ、Esc でマウスを離す。
// 動きは 1 秒 20 回（Minecraft と同じ刻み）で計算し、描くときは刻みの間を補間する。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B;

  var SOLID = new Uint8Array(WG.BLOCKS.length), TREE = new Uint8Array(WG.BLOCKS.length);
  WG.BLOCKS.forEach(function (b) { SOLID[b.id] = b.kind === 'solid' ? 1 : 0; TREE[b.id] = /_(LOG|LEAVES)$/.test(b.key) ? 1 : 0; });

  var RADIUS = 6;                 // 描画距離（チャンク）
  var HALF_W = 0.3;               // 体の幅の半分
  var HEIGHT = 1.8, HEIGHT_SNEAK = 1.5;
  var EYE = 1.62, EYE_SNEAK = 1.27;
  var HEIGHT_SWIM = 0.6, EYE_SWIM = 0.4;   // 泳いでいるとき・狭いところで這うとき（Minecraft と同じ）
  var TICK = 0.05;                // 1 刻み（秒）
  var FOV = 70 * Math.PI / 180;   // 縦の視野角
  var REACH = 5;                  // 照準が届く距離（サバイバルは 4.5）
  var SENS = 0.0025;              // マウスの感度（1 カウントあたりの角度）

  // 近い順に並べた、読み込むチャンクの相対位置
  var OFFSETS = [];
  for (var dz = -RADIUS; dz <= RADIUS; dz++) for (var dx = -RADIUS; dx <= RADIUS; dx++) {
    if (dx * dx + dz * dz <= RADIUS * RADIUS + RADIUS) OFFSETS.push([dx, dz, dx * dx + dz * dz]);
  }
  OFFSETS.sort(function (a, b) { return a[2] - b[2]; });

  // チャンク 1 つ分の体積。周りの 1 列は隣のチャンクから写すので、境目の面と角の暗さが正しくなる。
  function chunkVolume(world, cx, cz) {
    var vol = new WG.Volume(world, cx << 4, cz << 4, 16, world.minY, world.maxY);
    var sx = vol.sx, sz = vol.sz, v = vol.v, ny = vol.ny;
    for (var nz = -1; nz <= 1; nz++) for (var nx = -1; nx <= 1; nx++) {
      var c = world.chunk(cx + nx, cz + nz);
      if (nx === 0 && nz === 0) { vol.fillChunk(c); continue; }
      var xs = nx < 0 ? [0] : nx > 0 ? [17] : null, zs = nz < 0 ? [0] : nz > 0 ? [17] : null;
      var xa = xs ? xs[0] : 1, xb = xs ? xs[0] : 16, za = zs ? zs[0] : 1, zb = zs ? zs[0] : 16;
      for (var vz = za; vz <= zb; vz++) for (var vx = xa; vx <= xb; vx++) {
        var lx = vx - 1 - nx * 16, lz = vz - 1 - nz * 16, col = (lz << 4) | lx;
        for (var vy = 1; vy <= ny; vy++) v[(vy * sz + vz) * sx + vx] = c.blocks[((vy - 1) << 8) | col];
      }
    }
    return vol;
  }

  function Walker(view, world, hooks) {
    this.view = view;
    this.world = world;
    this.hooks = hooks || {};
    this.loaded = new Map();
    this.keys = {};
    this.yaw = 0; this.pitch = 0;
    this.pos = [0, 0, 0]; this.prev = [0, 0, 0]; this.vel = [0, 0, 0];
    this.onGround = false; this.collidedH = false;
    this.sneak = false; this.sprint = false; this.sprintTap = false; this.swimming = false; this.crawl = false; this.lastW = 0; this.jumpDelay = 0;
    this.canFly = false; this.flying = false; this.lastSpace = 0; this.fallDist = 0; this.reach = REACH;
    this.eyeH = EYE; this.fovK = 1;
    this.walkDist = 0; this.prevWalkDist = 0; this.bob = 0; this.prevBob = 0;
    this.acc = 0; this.ready = false; this.running = false; this.frameN = 0;
    this.target = null;
    this.lights = new Map();   // チャンクごとの明るさ
    this.dirty = new Map();    // あとで作り直すチャンク（0 が先）
  }

  // ぶつかる高さ（0 は通れる、1 は固いブロック、ベッドは 9/16）
  Walker.prototype.solid = function (x, y, z) { return WG.COLLIDE[this.world.block(x, y, z)]; };

  // 立ち位置を探す：上から見て、足元が固体（か水）で、体の 2 マスが空いている場所（木の上は除く）
  Walker.prototype.findStand = function (x, z) {
    var w = this.world, top = Math.min(w.maxY - 2, w.dim.view.yMax), tree = false;
    for (var y = top; y > w.minY; y--) {
      var below = w.block(x, y - 1, z), here = w.block(x, y, z), up = w.block(x, y + 1, z);
      if ((SOLID[below] || WG.isWater(below)) && !TREE[below] && !SOLID[here] && !SOLID[up] && !WG.isLava(here) && !WG.isLava(up) && !WG.isLava(below)) return y;
      // 木の幹や葉を通り抜けた先の地面に立てなければ、その列はあきらめる（幹の下の洞窟へ落ちないように）
      if (TREE[here] || TREE[below]) tree = true;
      else if (tree && SOLID[below]) return null;
    }
    return null;
  };

  Walker.prototype.spawn = function (x, z) {
    var bx = Math.floor(x), bz = Math.floor(z), y = null;
    // 立てる場所がなければ、近くを渦巻き状に探す（エンドの空間など）
    for (var r = 0; r <= 48 && y === null; r += 4) {
      for (var a = 0; a < Math.max(1, r * 2) && y === null; a++) {
        var t = a / Math.max(1, r * 2) * Math.PI * 2, px = bx + Math.round(Math.cos(t) * r), pz = bz + Math.round(Math.sin(t) * r);
        y = this.findStand(px, pz);
        if (y !== null) { bx = px; bz = pz; }
      }
    }
    if (y === null) y = this.world.maxY - 2;
    this.pos = [bx + 0.5, y, bz + 0.5];
    this.prev = this.pos.slice();
    this.vel = [0, 0, 0];
    this.spawnPoint = this.pos.slice();
    this.ready = false;
  };

  Walker.prototype.height = function () { return this.swimming || this.crawl ? HEIGHT_SWIM : this.sneak && !this.flying ? HEIGHT_SNEAK : HEIGHT; };
  Walker.prototype.box = function (p, h) {
    p = p || this.pos; h = h || this.height();
    return [p[0] - HALF_W, p[1], p[2] - HALF_W, p[0] + HALF_W, p[1] + h, p[2] + HALF_W];
  };

  // ブロックの当たりの箱（世界の座標）。階段・柵・扉などは WG.blockBoxes の形、ほかは高さ COLLIDE の箱。
  var EPS = 1e-7;
  Walker.prototype.cellBoxes = function (x, y, z) {
    var w = this.world, id = w.block(x, y, z);
    if (WG.isShaped(id)) {
      var bs = WG.blockBoxes(id, function (dx, dz) { return w.block(x + dx, y, z + dz); }, true), out = [];
      for (var i = 0; i < bs.length; i++) out.push([x + bs[i][0] / 16, y + bs[i][1] / 16, z + bs[i][2] / 16, x + bs[i][3] / 16, y + bs[i][4] / 16, z + bs[i][5] / 16]);
      return out;
    }
    var h = WG.COLLIDE[id];
    return h ? [[x, y, z, x + 1, y + h, z + 1]] : null;
  };

  // 箱が固体と重なっているか（下のマスも見る：柵は高さ 1.5）
  Walker.prototype.hits = function (b) {
    for (var y = Math.floor(b[1]) - 1; y <= Math.floor(b[4] - EPS); y++)
      for (var z = Math.floor(b[2]); z <= Math.floor(b[5] - EPS); z++)
        for (var x = Math.floor(b[0]); x <= Math.floor(b[3] - EPS); x++) {
          var bs = this.cellBoxes(x, y, z);
          if (!bs) continue;
          for (var i = 0; i < bs.length; i++) {
            var c = bs[i];
            if (c[0] < b[3] - EPS && c[3] > b[0] + EPS && c[1] < b[4] - EPS && c[4] > b[1] + EPS && c[2] < b[5] - EPS && c[5] > b[2] + EPS) return true;
          }
        }
    return false;
  };

  // 1 つの軸の移動量を、ぶつかる手前まで縮める
  Walker.prototype.clip = function (b, axis, d) {
    if (d === 0) return 0;
    var lo = [b[0], b[1], b[2]], hi = [b[3], b[4], b[5]];
    if (d > 0) hi[axis] += d; else lo[axis] += d;
    var a1 = (axis + 1) % 3, a2 = (axis + 2) % 3;
    for (var y = Math.floor(lo[1]) - 1; y <= Math.floor(hi[1] - EPS); y++)
      for (var z = Math.floor(lo[2]); z <= Math.floor(hi[2] - EPS); z++)
        for (var x = Math.floor(lo[0]); x <= Math.floor(hi[0] - EPS); x++) {
          var bs = this.cellBoxes(x, y, z);
          if (!bs) continue;
          for (var i = 0; i < bs.length; i++) {
            var c = bs[i];
            // ほかの 2 軸で重なっている箱だけ
            if (!(c[a1] < b[a1 + 3] - EPS && c[a1 + 3] > b[a1] + EPS && c[a2] < b[a2 + 3] - EPS && c[a2 + 3] > b[a2] + EPS)) continue;
            if (d > 0 && c[axis] >= b[axis + 3] - EPS) d = Math.min(d, c[axis] - b[axis + 3]);
            else if (d < 0 && c[axis + 3] <= b[axis] + EPS) d = Math.max(d, c[axis + 3] - b[axis]);
          }
        }
    return d;
  };

  // 体が触れているブロックに id があるか
  Walker.prototype.inBlock = function (id) {
    var b = this.box();
    for (var y = Math.floor(b[1] + 0.001); y <= Math.floor(b[4] - 0.001); y++)
      for (var z = Math.floor(b[2] + 0.001); z <= Math.floor(b[5] - 0.001); z++)
        for (var x = Math.floor(b[0] + 0.001); x <= Math.floor(b[3] - 0.001); x++) if (this.world.block(x, y, z) === id) return true;
    return false;
  };

  // 体が触れている液体（溶岩を優先）
  Walker.prototype.fluid = function () {
    var b = this.box(), found = null;
    for (var y = Math.floor(b[1] + 0.001); y <= Math.floor(b[4] - 0.001); y++)
      for (var z = Math.floor(b[2] + 0.001); z <= Math.floor(b[5] - 0.001); z++)
        for (var x = Math.floor(b[0] + 0.001); x <= Math.floor(b[3] - 0.001); x++) {
          var id = this.world.block(x, y, z);
          if (WG.isLava(id)) return 'lava';
          if (WG.isWater(id)) found = 'water';
        }
    return found;
  };

  Walker.prototype.move = function (dx, dy, dz) {
    var b = this.box();
    // スニーク中は、足場の外へ出る動きを止める
    if (this.sneak && this.onGround) {
      var self = this;
      var ground = function (ox, oz) { return self.hits([b[0] + ox, b[1] - 0.6, b[2] + oz, b[3] + ox, b[1], b[5] + oz]); };
      while (dx !== 0 && !ground(dx, 0)) dx = Math.abs(dx) < 0.05 ? 0 : dx - Math.sign(dx) * 0.05;
      while (dz !== 0 && !ground(0, dz)) dz = Math.abs(dz) < 0.05 ? 0 : dz - Math.sign(dz) * 0.05;
      while (dx !== 0 && dz !== 0 && !ground(dx, dz)) {
        dx = Math.abs(dx) < 0.05 ? 0 : dx - Math.sign(dx) * 0.05;
        dz = Math.abs(dz) < 0.05 ? 0 : dz - Math.sign(dz) * 0.05;
      }
    }
    var ry = dy, rx = dx, rz = dz, b0 = b.slice(), was = this.onGround;
    dy = this.clip(b, 1, dy); b[1] += dy; b[4] += dy;
    dx = this.clip(b, 0, dx); b[0] += dx; b[3] += dx;
    dz = this.clip(b, 2, dz); b[2] += dz; b[5] += dz;
    var cy = Math.abs(dy - ry) > 1e-9, cx = Math.abs(dx - rx) > 1e-9, cz = Math.abs(dz - rz) > 1e-9;
    this.onGround = cy && ry < 0;
    // 0.6 までの段差（ハーフブロック・階段）は、そのまま上がる（Minecraft と同じ）
    if ((cx || cz) && (was || this.onGround) && !this.flying) {
      var s2 = b0.slice(), up = this.clip(s2, 1, 0.6);
      s2[1] += up; s2[4] += up;
      var sx2 = this.clip(s2, 0, rx); s2[0] += sx2; s2[3] += sx2;
      var sz2 = this.clip(s2, 2, rz); s2[2] += sz2; s2[5] += sz2;
      var dn = this.clip(s2, 1, -up); s2[1] += dn; s2[4] += dn;
      if (sx2 * sx2 + sz2 * sz2 > dx * dx + dz * dz + 1e-9) {
        b = s2; dx = sx2; dz = sz2; dy = up + dn;
        cx = Math.abs(dx - rx) > 1e-9; cz = Math.abs(dz - rz) > 1e-9; cy = true; this.onGround = true;
      }
    }
    if (cy) this.vel[1] = 0;
    if (cx) this.vel[0] = 0;
    if (cz) this.vel[2] = 0;
    this.collidedH = cx || cz;
    this.pos = [(b[0] + b[3]) / 2, b[1], (b[2] + b[5]) / 2];
    return Math.hypot(dx, dz);
  };

  // 1 刻みの動き（Minecraft の歩き・ジャンプ・泳ぎの数値に合わせている）
  Walker.prototype.tick = function () {
    var k = this.keys, v = this.vel;
    this.prev = this.pos.slice();
    this.prevWalkDist = this.walkDist; this.prevBob = this.bob;

    var shift = !!(k.ShiftLeft || k.ShiftRight), wantSneak = shift && !this.flying;
    // 天井が低くて立てないときはしゃがんだまま
    if (!wantSneak && this.sneak && !this.flying && this.hits(this.box(this.pos, HEIGHT))) wantSneak = true;
    this.sneak = wantSneak;
    if (!this.canFly) this.flying = false;
    // 乗り物に乗っている・滑空しているときは、ゲームの側が動かす
    if (this.hooks.ride && this.hooks.ride(this, shift)) { if (this.hooks.tick) this.hooks.tick(this); return; }

    var f = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0), s = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
    if (!k.KeyW) this.sprintTap = false;
    // 満腹度が 6 以下のとき・食べている間はダッシュできない（Minecraft と同じ）
    if (f <= 0 || this.sneak || this.collidedH || this.canSprint === false || this.using) this.sprint = false;
    else if (k.ControlLeft || k.ControlRight || this.sprintTap) this.sprint = true;
    // 泳ぐ：水に潜ったままダッシュすると、体を横にして見ている向きへ速く泳ぐ（Minecraft と同じ）。
    // 泳ぎ終わっても頭の上が狭いときは、這ったまま（高さ 0.6）
    var inWater = !this.flying && this.fluid() === 'water';
    var eyeWet = WG.isWater(this.world.block(Math.floor(this.pos[0]), Math.floor(this.pos[1] + (this.swimming ? EYE_SWIM : EYE)), Math.floor(this.pos[2])));
    this.swimming = !!(this.sprint && inWater && (this.swimming || eyeWet));
    this.crawl = !this.swimming && !this.flying && this.hits(this.box(this.pos, this.sneak ? HEIGHT_SNEAK : HEIGHT));
    if (this.crawl && this.hits(this.box(this.pos, HEIGHT_SWIM))) this.crawl = false;
    var len = Math.hypot(f, s);
    if (len > 1) { f /= len; s /= len; }
    f *= 0.98; s *= 0.98;
    if (this.sneak) { var snk = Math.min(1, 0.3 * (this.sneakMul || 1)); f *= snk; s *= snk; }   // スニーク速度上昇で速く
    if (this.using) { f *= 0.2; s *= 0.2; }   // 食べている間はゆっくり

    var fl = this.fluid(), accel, drag;
    if (this.flying) { accel = this.sprint ? 0.1 : 0.05; drag = 0.91; }
    else if (fl) { accel = (this.swimming ? 0.0287 : 0.02) * (fl === 'water' ? this.fluidMul || 1 : 1); drag = fl === 'water' ? Math.min(0.94, (this.sprint ? 0.9 : 0.8) + (this.fluidDrag || 0)) : 0.5; }   // 水中歩行・イルカの好意
    else if (this.onGround) { accel = 0.1 * (this.sprint ? 1.3 : 1) * (this.speedMul || 1); drag = 0.546; }
    else { accel = this.sprint ? 0.026 : 0.02; drag = 0.91; }

    var sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    var fx = -sy, fz = -cy, rx = cy, rz = -sy;
    v[0] += (fx * f + rx * s) * accel;
    v[2] += (fz * f + rz * s) * accel;

    if (this.jumpDelay > 0) this.jumpDelay--;
    if (this.flying) {
      // 飛んでいる間：スペースで上がり、Shift で下がる
      if (k.Space) v[1] += 0.15;
      if (shift) v[1] -= 0.15;
    } else if (k.Space) {
      if (fl) {
        v[1] += 0.04;
        // 水から岸へ上がる：Minecraft と同じく、0.6 上が空いていて水もない（水面の近く）ときだけ
        if (this.collidedH && this.freeAbove(v[0], v[2])) v[1] = 0.3;
      } else if (this.onGround && this.jumpDelay === 0) {
        v[1] = 0.42 + (this.jumpBoost || 0);   // 跳躍力上昇で高く
        this.exhaustion = (this.exhaustion || 0) + (this.sprint ? 0.2 : 0.05);   // ジャンプで疲れる
        if (this.sprint) { v[0] += fx * 0.2; v[2] += fz * 0.2; }
        this.jumpDelay = 10;
      }
    } else this.jumpDelay = 0;

    // 泳いでいる間の上下：見ている向きへ（水面の近くでは、上を向くかスペースで上がる）
    if (this.swimming) {
      var ly = Math.sin(this.pitch), above = WG.isWater(this.world.block(Math.floor(this.pos[0]), Math.floor(this.pos[1] + 0.9), Math.floor(this.pos[2])));
      if (ly <= 0 || k.Space || above) v[1] += (ly - v[1]) * (ly < -0.2 ? 0.085 : 0.06);
    }
    if (fl && !this.flying) {
      var push = this.flowPush();
      if (push) { var pk = fl === 'water' ? 0.014 : this.world.dimKey === 'nether' ? 0.007 : 0.0023; v[0] += push[0] * pk; v[1] += push[1] * pk; v[2] += push[2] * pk; }
    }
    // はしご：横の速さと落ちる速さを抑え、スニークで止まる（Minecraft と同じ）
    var feet = this.world.block(Math.floor(this.pos[0]), Math.floor(this.pos[1]), Math.floor(this.pos[2]));
    var onLadder = !this.flying && (WG.blockKind(feet) === 'ladder' || WG.blockKind(feet) === 'vine' || WG.blockKind(feet) === 'scaffold');
    if (onLadder) {
      v[0] = Math.max(-0.15, Math.min(0.15, v[0])); v[2] = Math.max(-0.15, Math.min(0.15, v[2]));
      v[1] = Math.max(v[1], -0.15);
      if (this.sneak && v[1] < 0) v[1] = 0;
    }
    // クモの巣：動きが遅くなる（横 0.25 倍、縦 0.05 倍）
    var web = !this.flying && this.inBlock(WG.B.COBWEB);
    var y0 = this.pos[1], wasGround = this.onGround, vy0 = v[1];
    var moved = web ? this.move(v[0] * 0.25, v[1] * 0.05, v[2] * 0.25) : this.move(v[0], v[1], v[2]);
    if (web) { v[0] = v[1] = v[2] = 0; this.fallDist = 0; }
    if (onLadder) { this.fallDist = 0; if (this.collidedH || k.Space) v[1] = 0.2; }

    if (this.flying) { v[0] *= drag; v[2] *= drag; v[1] *= 0.6; if (this.onGround) this.flying = false; }
    else if (fl) { v[0] *= drag; v[2] *= drag; v[1] = this.swimming ? v[1] * 0.8 : v[1] * drag - 0.02; }
    else { v[1] = (v[1] - 0.08) * 0.98; v[0] *= drag; v[2] *= drag; if (this.slowFall && v[1] < -0.06) { v[1] = -0.06; this.fallDist = 0; } }   // 低速落下

    // 落ちた高さ（着地したときに知らせる。水の中と飛行中は数えない）
    if (fl || this.flying) this.fallDist = 0;
    else if (this.pos[1] < y0) this.fallDist += y0 - this.pos[1];
    if (this.onGround && !wasGround) {
      var below = this.world.block(Math.floor(this.pos[0]), Math.floor(this.pos[1] - 0.05), Math.floor(this.pos[2]));
      // スライムブロック：しゃがんでいなければ、落ちてきた速さで跳ね返り、落下のダメージを受けない
      if (below === WG.B.SLIME_BLOCK) { if (!this.sneak && vy0 < -0.1) { v[1] = -vy0 * 0.95; this.onGround = false; } }
      else if (this.hooks.land) this.hooks.land(this.fallDist, below);
      this.fallDist = 0;
    } else if (this.onGround) this.fallDist = 0;

    // 視点の揺れ（歩いた距離で進む）
    this.walkDist += moved * 0.6;
    // 疲れ（空腹のもと）：ダッシュは 1 ブロックごとに 0.1、泳ぐと 0.01（Minecraft と同じ）
    if (this.sprint && !this.flying) this.exhaustion = (this.exhaustion || 0) + moved * 0.1;
    else if (fl && !this.flying) this.exhaustion = (this.exhaustion || 0) + moved * 0.01;
    var target = this.onGround && !fl ? Math.min(1, moved / 0.216) : 0;
    this.bob += (target - this.bob) * 0.4;

    // 奈落に落ちたら最初の場所へ戻す（サバイバルでは体力が減るので、ゲームの側に任せる）
    if (this.pos[1] < this.world.minY - 48 && !(this.hooks.voidDamage && this.hooks.voidDamage())) {
      this.pos = this.spawnPoint.slice(); this.prev = this.pos.slice(); this.vel = [0, 0, 0];
    }
    if (this.hooks.tick) this.hooks.tick(this);
  };

  // スペースの 2 度押しで飛ぶ・降りる（飛べるときだけ）
  Walker.prototype.spaceTap = function () {
    var t = WG.now();
    if (this.canFly && t - this.lastSpace < 350) { this.flying = !this.flying; this.lastSpace = 0; if (this.flying) this.vel[1] = 0; }
    else this.lastSpace = t;
  };

  // 体の上 0.6 が、固いブロックにも流体にも当たらないか（水から岸へ上がれるか）
  Walker.prototype.freeAbove = function (dx, dz) {
    var b = this.box(), o = [b[0] + dx, b[1] + 0.6, b[2] + dz, b[3] + dx, b[4] + 0.6, b[5] + dz];
    for (var y = Math.floor(o[1]); y <= Math.floor(o[4] - 1e-7); y++)
      for (var z = Math.floor(o[2]); z <= Math.floor(o[5] - 1e-7); z++)
        for (var x = Math.floor(o[0]); x <= Math.floor(o[3] - 1e-7); x++) {
          var id = this.world.block(x, y, z);
          if (SOLID[id] || WG.FLUID[id]) return false;
        }
    return true;
  };

  // 体が触れている流れの向きの合計
  Walker.prototype.flowPush = function () {
    var b = this.box(), sx = 0, sy = 0, sz = 0, n = 0;
    for (var y = Math.floor(b[1] + 0.001); y <= Math.floor(b[4] - 0.001); y++)
      for (var z = Math.floor(b[2] + 0.001); z <= Math.floor(b[5] - 0.001); z++)
        for (var x = Math.floor(b[0] + 0.001); x <= Math.floor(b[3] - 0.001); x++) {
          var f = WG.fluidFlow(this.world, x, y, z);
          if (f) { sx += f[0]; sy += f[1]; sz += f[2]; n++; }
        }
    var len = Math.hypot(sx, sy, sz);
    return n && len > 1e-6 ? [sx / len, sy / len, sz / len] : null;
  };

  // チャンクの面を作る（歩く表示では光も付ける）
  Walker.prototype.build = function (cx, cz) {
    var key = cx + ',' + cz, old = this.loaded.get(key);
    if (old) this.view.remove(old);
    var vol = chunkVolume(this.world, cx, cz);
    vol.light = WG.chunkLight(this.world, cx, cz);
    vol.ambient = WG.AMBIENT[this.world.dimKey] || 0;
    this.lights.set(key, vol.light);
    var mesh = WG.meshPart(vol, 1, 1, 17, 17);
    this.loaded.set(key, mesh.opaque.idx.length || mesh.water.idx.length ? this.view.upload(mesh, [cx << 4, this.world.minY, cz << 4]) : null);
    this.dirty.delete(key);
    if (this.hooks.chunkBuilt) this.hooks.chunkBuilt(cx, cz);
  };

  // ブロックが変わったチャンクを作り直す。now が false でなければ、そのチャンク（と面が接する隣）をすぐ作り直す。
  // 光だけが変わるかもしれない周りのチャンクは、あとで少しずつ作り直す。
  Walker.prototype.remesh = function (x, z, now) {
    var cx = x >> 4, cz = z >> 4, lx = x & 15, lz = z & 15;
    for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) {
      var key = (cx + dx) + ',' + (cz + dz);
      if (!this.loaded.has(key)) continue;
      var touch = (dx === 0 || (dx === -1 && lx === 0) || (dx === 1 && lx === 15)) && (dz === 0 || (dz === -1 && lz === 0) || (dz === 1 && lz === 15));
      if (touch && now !== false) this.build(cx + dx, cz + dz);
      else if (!this.dirty.has(key) || this.dirty.get(key) > (touch ? 0 : 1)) this.dirty.set(key, touch ? 0 : 1);
    }
  };

  // ある場所の明るさ（0〜1）。落ちているアイテムなどに使う。
  // ある場所の光の段階 [空の光, ブロックの光]（0〜15）。落ちているアイテムなどに使う。
  Walker.prototype.lightLevels = function (x, y, z) {
    var bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z), L = this.lights.get((bx >> 4) + ',' + (bz >> 4));
    if (!L || by < this.world.minY || by > this.world.maxY) return [15, 0];
    var lv = L[((by - this.world.minY + 1) * 18 + (bz & 15) + 1) * 18 + (bx & 15) + 1];
    return [lv >> 4, lv & 15];
  };

  // 視線の先のブロック（液体と空気は通り抜ける）
  Walker.prototype.pick = function (e, d) {
    var c = [Math.floor(e[0]), Math.floor(e[1]), Math.floor(e[2])], step = [], tMax = [], tDel = [], k;
    for (k = 0; k < 3; k++) {
      step[k] = d[k] > 0 ? 1 : -1;
      tDel[k] = Math.abs(1 / (d[k] || 1e-9));
      tMax[k] = (d[k] > 0 ? c[k] + 1 - e[k] : e[k] - c[k]) * tDel[k];
    }
    var prev = null, tIn = 0;
    for (var n = 0; n < 32; n++) {
      var id = this.world.peekBlock(c[0], c[1], c[2]);
      if (id > 0 && (!WG.FLUID[id] || (WG.isWaterPlant && WG.isWaterPlant(id)))) {
        // hy は当たった点の高さのマスの中での位置（0〜1）：階段・ハーフブロックの上下を決める
        return { x: c[0], y: c[1], z: c[2], id: id, px: prev ? prev[0] : c[0], py: prev ? prev[1] : c[1] + 1, pz: prev ? prev[2] : c[2],
          hy: e[1] + d[1] * tIn - c[1] };
      }
      k = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
      if (tMax[k] > this.reach) return null;
      tIn = tMax[k];
      prev = c.slice();
      c[k] += step[k]; tMax[k] += tDel[k];
    }
    return null;
  };

  // 周りのチャンクを近い順に作り、遠いものは捨てる
  Walker.prototype.stream = function (budget) {
    var t0 = WG.now(), pcx = Math.floor(this.pos[0] / 16), pcz = Math.floor(this.pos[2] / 16), self = this;
    this.loaded.forEach(function (part, key) {
      var p = key.split(','), dx = +p[0] - pcx, dz = +p[1] - pcz;
      if (dx * dx + dz * dz > (RADIUS + 1.5) * (RADIUS + 1.5)) { if (part) self.view.remove(part); self.loaded.delete(key); self.lights.delete(key); self.dirty.delete(key); }
    });
    var pending = 0;
    for (var i = 0; i < OFFSETS.length; i++) {
      var cx = pcx + OFFSETS[i][0], cz = pcz + OFFSETS[i][1], key = cx + ',' + cz;
      if (this.loaded.has(key)) continue;
      if (WG.now() - t0 > budget) { pending++; continue; }
      this.build(cx, cz);
    }
    // 作り直しを待っているチャンク（面が接するもの、近いものから）
    if (this.dirty.size && WG.now() - t0 < budget) {
      var list = [];
      this.dirty.forEach(function (pr, key) { var p = key.split(','); list.push([pr, Math.abs(+p[0] - pcx) + Math.abs(+p[1] - pcz), +p[0], +p[1]]); });
      list.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      for (var j2 = 0; j2 < list.length && WG.now() - t0 < budget; j2++) this.build(list[j2][2], list[j2][3]);
    }
    if (!this.ready) {
      var ok = true;
      for (var j = 0; j < 9; j++) if (!this.loaded.has((pcx + OFFSETS[j][0]) + ',' + (pcz + OFFSETS[j][1]))) ok = false;
      this.ready = ok;
    }
    return pending;
  };

  Walker.prototype.start = function (x, z) {
    var self = this, view = this.view, R16 = RADIUS * 16;
    this.spawn(x, z);
    this.running = true;
    view.cull = function (p, eye) {
      if (!p.origin) return true;
      var dx = p.origin[0] + 8 - eye[0], dz = p.origin[2] + 8 - eye[2], d = Math.hypot(dx, dz);
      if (d < 40) return true;
      return (dx * -Math.sin(self.yaw) + dz * -Math.cos(self.yaw)) / d > -0.35;
    };
    var last = WG.now();
    function frame() {
      if (!self.running) return;
      var now = WG.now(), dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      var pending = self.stream(self.ready ? 6 : 40);
      if (self.ready && self.hooks.active()) {
        self.acc += dt;
        while (self.acc >= TICK) { self.tick(); self.acc -= TICK; }
      } else self.acc = 0;
      self.draw(dt, pending);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };

  Walker.prototype.stop = function () {
    this.running = false;
    this.view.fp = null; this.view.cull = null; this.view.outline = null;
    this.view.clear();
    this.loaded.clear();
  };

  Walker.prototype.draw = function (dt, pending) {
    var a = this.acc / TICK, p = [0, 0, 0], k;
    for (k = 0; k < 3; k++) p[k] = this.prev[k] + (this.pos[k] - this.prev[k]) * a;
    var eyeTarget = this.swimming || this.crawl ? EYE_SWIM : this.sneak ? EYE_SNEAK : EYE;
    this.eyeH += (eyeTarget - this.eyeH) * Math.min(1, dt * 14);
    var wd = this.prevWalkDist + (this.walkDist - this.prevWalkDist) * a;
    var bob = this.prevBob + (this.bob - this.prevBob) * a;
    var sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    var side = Math.sin(wd * Math.PI) * bob * 0.045, up = -Math.abs(Math.cos(wd * Math.PI)) * bob * 0.07;
    var eye = [p[0] + cy * side, p[1] + this.eyeH + up + bob * 0.035, p[2] - sy * side];
    this.fovK += ((this.sprint ? 1.1 : 1) * (this.zoom || 1) - this.fovK) * Math.min(1, dt * 8);
    this.eye = eye; this.dir = [-sy * Math.cos(this.pitch), Math.sin(this.pitch), -cy * Math.cos(this.pitch)];

    var cp = Math.cos(this.pitch);
    var dir = [-sy * cp, Math.sin(this.pitch), -cy * cp];
    this.target = this.ready ? this.pick(eye, dir) : null;

    // 目が液体の中にあるときは、色の付いた近い霞にする
    var eyeId = this.world.peekBlock(Math.floor(eye[0]), Math.floor(eye[1]), Math.floor(eye[2]));
    var far = RADIUS * 16, fp = { eye: eye, yaw: this.yaw, pitch: this.pitch, fov: FOV * this.fovK, far: far + 32, fogNear: far * 0.55, fogFar: far - 4 };
    // 昼と夜（空の色、空の光の弱まり、太陽・月・星）
    var sky = this.hooks.sky ? this.hooks.sky(dt) : null;
    if (sky) { fp.skyTop = sky.top; fp.skyLow = sky.low; fp.skyFog = sky.fog; fp.skyDark = sky.dark; fp.skyTint = sky.tint; fp.celestial = sky.celestial; if (sky.fogK) { fp.fogNear *= sky.fogK; fp.fogFar *= 0.55 + 0.45 * sky.fogK; } }
    this.view.ambient = this.nightVision ? 0.9 : WG.AMBIENT[this.world.dimKey] || 0;   // 暗視：暗い所もよく見える
    if (WG.isWater(eyeId)) { fp.fogColor = [0.12, 0.21, 0.42]; fp.fogNear = 0; fp.fogFar = 16; }
    else if (WG.isLava(eyeId)) { fp.fogColor = [0.62, 0.22, 0.05]; fp.fogNear = 0; fp.fogFar = 2.5; }
    else if (WG.FOG_BLOCK && WG.FOG_BLOCK[eyeId]) { fp.fogColor = WG.FOG_BLOCK[eyeId].c; fp.fogNear = 0; fp.fogFar = WG.FOG_BLOCK[eyeId].far; }   // 粉雪の中（js/biomes3.js）
    this.view.fp = fp;
    this.view.outline = this.target ? [this.target.x, this.target.y, this.target.z] : null;
    this.view.res = 1;
    if (this.hooks.draw) this.hooks.draw(this, a);
    this.view.render();

    if (this.hooks.status && (this.frameN++ % 6 === 0)) this.hooks.status(this, pending);
  };

  Walker.prototype.look = function (mx, my) {
    // マウスを固定した直後に、ブラウザが大きな飛びを報告することがあるので無視する
    if (Math.abs(mx) > 300 || Math.abs(my) > 300) return;
    this.yaw -= mx * SENS;
    this.pitch = Math.max(-1.5697, Math.min(1.5697, this.pitch - my * SENS));
  };

  Walker.prototype.key = function (code, down, repeat) {
    if (down && code === 'Space' && !repeat) this.spaceTap();
    if (down && code === 'KeyW' && !repeat) {
      var t = WG.now();
      if (t - this.lastW < 300) this.sprintTap = true;
      this.lastW = t;
    }
    this.keys[code] = down;
  };

  Walker.prototype.releaseKeys = function () { this.keys = {}; this.sprintTap = false; };

  Walker.prototype.facing = function () {
    var a = ((-this.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return ['北', '東', '南', '西'][Math.round(a / (Math.PI / 2)) % 4];
  };

  WG.Walker = Walker;
  WG.chunkVolume = chunkVolume;
  WG.WALK_RADIUS = RADIUS;
})(typeof window !== 'undefined' ? window : globalThis);
