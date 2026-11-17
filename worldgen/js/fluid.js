// 水と溶岩の流れ。Minecraft と同じ考え方で動かす：
// ・元（水源）は 0、流れは 1〜7（元から離れるほど大きい）、落ちているものは 8。
// ・まず下へ流れる。下へ行けないときは横へ広がる（水は 7 マス、溶岩は 3 マス。ネザーの溶岩は 7 マス）。
//   横へ広がるときは、4 マス（溶岩は 2 マス）以内に下りられる穴があれば、その方向へだけ流れる。
// ・元がなくなった流れは、端から順に引いていく。
// ・2 つ以上の水源にはさまれ、下が固いか水源なら、新しい水源になる（無限水源）。
// ・水が溶岩の元に触れると黒曜石、溶岩の流れに触れると丸石、溶岩が水へ流れ込むと石になる。
// 水は 5 刻み、溶岩は 30 刻み（ネザーは 10 刻み）ごとに動く。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, FLUID = WG.FLUID, LV = WG.FLUID_LEVEL;
  var SOLID = new Uint8Array(WG.BLOCKS.length), WASH = new Uint8Array(WG.BLOCKS.length);
  WG.BLOCKS.forEach(function (b) {
    SOLID[b.id] = b.kind === 'solid' ? 1 : 0;
    WASH[b.id] = b.kind === 'plant' || b.kind === 'deco' ? 1 : 0;   // 流れに押し流されるもの
  });
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function Fluids(world, onChange) {
    this.world = world;
    this.onChange = onChange || function () {};
    this.queue = new Map();   // "x,y,z" → 動く刻み
    this.time = 0;
    this.nether = world.dimKey === 'nether';
  }

  Fluids.prototype.delay = function (type) { return type === 1 ? 5 : this.nether ? 10 : 30; };
  Fluids.prototype.drop = function (type) { return type === 1 || this.nether ? 1 : 2; };
  Fluids.prototype.slope = function (type) { return type === 1 || this.nether ? 4 : 2; };

  Fluids.prototype.schedule = function (x, y, z, delay) {
    var key = x + ',' + y + ',' + z, due = this.time + delay, old = this.queue.get(key);
    if (old === undefined || old > due) this.queue.set(key, due);
  };

  // ブロックが変わったときに呼ぶ。周りの流体を動かす予定に入れる。
  Fluids.prototype.notify = function (x, y, z) {
    var w = this.world, P = [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (var i = 0; i < P.length; i++) {
      var px = x + P[i][0], py = y + P[i][1], pz = z + P[i][2], t = FLUID[w.block(px, py, pz)];
      if (t) this.schedule(px, py, pz, this.delay(t));
    }
  };

  Fluids.prototype.set = function (x, y, z, id) {
    var w = this.world, old = w.block(x, y, z);
    if (old === id) return;
    w.setBlock(x, y, z, id);
    this.onChange(x, y, z, old, id);
    this.notify(x, y, z);
  };

  // その場所へ流れ込めるか（空気、押し流せるもの、自分より弱い同じ流れ）
  Fluids.prototype.canFlow = function (id, type, level) {
    if (id === B.AIR || WASH[id]) return true;
    var t = FLUID[id];
    if (t === type) return LV[id] !== 0 && LV[id] !== 8 && LV[id] > level;
    return t !== 0;  // ちがう流体（水と溶岩）は混ざって固まる
  };

  // 流れ込む（水と溶岩が出会ったら固まる）
  Fluids.prototype.flowInto = function (x, y, z, type, level) {
    var cur = this.world.block(x, y, z), ct = FLUID[cur];
    if (ct && ct !== type) {
      if (type === 2) this.set(x, y, z, B.STONE);                         // 溶岩が水へ
      else this.set(x, y, z, LV[cur] === 0 ? B.OBSIDIAN : B.COBBLESTONE); // 水が溶岩へ
      return;
    }
    this.set(x, y, z, WG.fluidId(type, level));
  };

  // 下りられる穴までの近さで、流れる向きを選ぶ
  Fluids.prototype.directions = function (x, y, z, type, level) {
    var w = this.world, best = 99, out = [], maxD = this.slope(type), self = this;
    function search(px, pz, d, from) {
      if (d > maxD) return 99;
      if (self.canFlow(w.block(px, y - 1, pz), type, -1)) return d;
      var m = 99;
      for (var k = 0; k < 4; k++) {
        if (k === from) continue;
        var nx = px + DIRS[k][0], nz = pz + DIRS[k][1];
        if (!self.canFlow(w.block(nx, y, nz), type, level)) continue;
        m = Math.min(m, search(nx, nz, d + 1, k ^ 1));
      }
      return m;
    }
    for (var k = 0; k < 4; k++) {
      var nx = x + DIRS[k][0], nz = z + DIRS[k][1];
      if (!this.canFlow(w.block(nx, y, nz), type, level)) continue;
      var d = search(nx, nz, 1, k ^ 1);
      if (d < best) { best = d; out = [k]; } else if (d === best) out.push(k);
    }
    return out;
  };

  Fluids.prototype.update = function (x, y, z) {
    var w = this.world, id = w.block(x, y, z), type = FLUID[id];
    if (!type) return;
    var level = LV[id], drop = this.drop(type), k, nid;

    // 溶岩が水に触れたら固まる
    if (type === 2) {
      for (k = 0; k < 5; k++) {
        var p = k < 4 ? [x + DIRS[k][0], y, z + DIRS[k][1]] : [x, y + 1, z];
        if (FLUID[w.block(p[0], p[1], p[2])] === 1) { this.set(x, y, z, level === 0 ? B.OBSIDIAN : B.COBBLESTONE); return; }
      }
    }

    // 流れ：上か横から水が来ているかで、自分の段階を決め直す
    if (level !== 0) {
      var nl;
      if (FLUID[w.block(x, y + 1, z)] === type) nl = 8;
      else {
        var best = 99, sources = 0;
        for (k = 0; k < 4; k++) {
          nid = w.block(x + DIRS[k][0], y, z + DIRS[k][1]);
          if (FLUID[nid] !== type) continue;
          var nlv = LV[nid];
          if (nlv === 0) sources++;
          best = Math.min(best, (nlv === 8 ? 0 : nlv) + drop);
        }
        nl = best <= 7 ? best : -1;
        if (type === 1 && sources >= 2) {
          var below = w.block(x, y - 1, z);
          if (SOLID[below] || (FLUID[below] === 1 && LV[below] === 0)) nl = 0;
        }
      }
      if (nl !== level) {
        this.set(x, y, z, nl < 0 ? B.AIR : WG.fluidId(type, nl));
        return;
      }
    }

    // 広がる：まず下へ
    var under = w.block(x, y - 1, z);
    if (y - 1 >= w.minY && this.canFlow(under, type, 7) && !(FLUID[under] === type && LV[under] === 8)) {
      this.flowInto(x, y - 1, z, type, 8);
      if (level !== 0) return;
    } else if (FLUID[under] === type && level !== 0 && LV[under] !== 0) {
      // 下が同じ流れ（落ちた先）なら横へは広がらない
      return;
    }
    var next = (level === 8 ? 0 : level) + drop;
    if (next > 7) return;
    var dirs = this.directions(x, y, z, type, next);
    for (var i = 0; i < dirs.length; i++) {
      var nx = x + DIRS[dirs[i]][0], nz = z + DIRS[dirs[i]][1];
      if (this.canFlow(w.block(nx, y, nz), type, next)) this.flowInto(nx, y, nz, type, next);
    }
  };

  // 1 刻み進める（1 刻みで動かすのは最大 limit 個）
  Fluids.prototype.tick = function (limit) {
    this.time++;
    if (!this.queue.size) return 0;
    var due = [], self = this;
    this.queue.forEach(function (t, key) { if (t <= self.time && due.length < (limit || 3000)) due.push(key); });
    for (var i = 0; i < due.length; i++) {
      this.queue.delete(due[i]);
      var p = due[i].split(',');
      this.update(+p[0], +p[1], +p[2]);
    }
    return due.length;
  };

  // 流れの向き（体やアイテムを押す）。周りより高い所から低い所へ。落ちている水は下向き。
  function height(id, type) {
    if (FLUID[id] !== type) return -1;
    var lv = LV[id];
    return lv === 0 || lv === 8 ? 8 / 9 : (8 - lv) / 9;
  }
  WG.fluidFlow = function (world, x, y, z) {
    var id = world.block(x, y, z), type = FLUID[id];
    if (!type) return null;
    var h = height(id, type), fx = 0, fz = 0;
    for (var k = 0; k < 4; k++) {
      var nx = x + DIRS[k][0], nz = z + DIRS[k][1], nid = world.block(nx, y, nz), nh = height(nid, type);
      if (nh < 0) {
        if (SOLID[nid]) continue;
        // 横が空いていて、その下に同じ流体があるなら、そちらへ下っていく
        var b = world.block(nx, y - 1, nz);
        if (FLUID[b] !== type) continue;
        nh = height(b, type) - 8 / 9;
      }
      var d = h - nh;
      fx += DIRS[k][0] * d; fz += DIRS[k][1] * d;
    }
    var fy = LV[id] === 8 ? -6 : 0, len = Math.hypot(fx, fy, fz);
    return len > 1e-6 ? [fx / len, fy / len, fz / len] : null;
  };

  WG.Fluids = Fluids;
})(typeof window !== 'undefined' ? window : globalThis);
