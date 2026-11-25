// レッドストーン：粉の強さ（0〜15）の伝わり方、トーチ・リピーターの遅れ、ランプ・扉・TNT・ピストンの動き。
// Minecraft の決まりに合わせている：
//   ・動力源（レッドストーンブロック、オンのレバー・ボタン・感圧板、点いたトーチ、オンのリピーター）は隣へ 15 を出す。
//   ・粉は 1 マス進むごとに 1 弱まる。粉は乗っているブロックと、向いている先のブロックに動力を与える（弱い動力）。
//   ・トーチの下のブロック、レバー・ボタンの付いたブロック、感圧板の下のブロック、リピーターの先のブロックは強い動力を受け、隣の粉にも 15 を渡す。
//   ・トーチは付いているブロックに動力があると 2 刻み後に消える。リピーターは 2〜8 刻み遅れて後ろの動力を前へ 15 で出す。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, KIND = function (id) { return WG.blockKind(id); };
  var N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  var H4 = [[0, -1, 'n'], [1, 0, 'e'], [0, 1, 's'], [-1, 0, 'w']];
  var DVEC = { N: [0, 0, -1], E: [1, 0, 0], S: [0, 0, 1], W: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0] };

  var WIRE0 = B.REDSTONE_WIRE_0, WIRE15 = B.REDSTONE_WIRE_15;
  function isWire(id) { return id >= WIRE0 && id <= WIRE15; }
  function wirePower(id) { return isWire(id) ? id - WIRE0 : 0; }
  WG.wirePower = wirePower;
  WG.isWire = isWire;
  function keyOf(id) { return WG.BLOCKS[id].key; }
  function isOn(id) { return /_ON$/.test(keyOf(id)); }
  // リピーターの向き（出す向き）
  function repFacing(id) { var m = /^REPEATER_([NESW])(\d)/.exec(keyOf(id)); return m ? m[1] : null; }
  function repDelay(id) { return +/^REPEATER_[NESW](\d)/.exec(keyOf(id))[1]; }
  function solidOpaque(id) { return WG.OPAQUE[id] && WG.blockKind(id) === 'solid' && !WG.ORIENT[id] && id !== B.SLIME_BLOCK && id !== B.HONEY_BLOCK && id !== B.TARGET && id !== B.TRAPPED_CHEST; }
  function compFacing(id) { var m = /^COMPARATOR_([NESW])/.exec(keyOf(id)); return m ? m[1] : null; }

  // 粉が隣とつながるか（見た目と、動力を向ける向き）。get(dx, dy, dz) は隣のブロック。
  // 戻り値 { n, e, s, w }：0 つながらない、1 同じ高さか 1 段下、2 1 段上（壁を登る）
  function connectsTo(id, dx, dz) {
    var k = KIND(id);
    if (k === 'rtorch' || k === 'lever' || k === 'button' || k === 'plate' || id === B.REDSTONE_BLOCK) return true;
    if (k === 'repeater' || k === 'comparator') { var f = repFacing(id) || compFacing(id), v = DVEC[f]; return v[0] !== 0 ? dx !== 0 : dz !== 0; }
    if (k === 'daylight' || k === 'hook' || k === 'sculk' || id === B.TARGET || id === B.TRAPPED_CHEST) return true;
    if (/^(LIGHT|HEAVY)_WEIGHTED/.test(keyOf(id))) return true;
    return false;
  }
  function wireConnections(get) {
    var out = { n: 0, e: 0, s: 0, w: 0 }, upOpen = !WG.OPAQUE[get(0, 1, 0)];
    H4.forEach(function (d) {
      var side = get(d[0], 0, d[1]);
      if (isWire(side) || connectsTo(side, d[0], d[1])) out[d[2]] = 1;
      else if (upOpen && WG.OPAQUE[side] && isWire(get(d[0], 1, d[1]))) out[d[2]] = 2;
      else if (!WG.OPAQUE[side] && isWire(get(d[0], -1, d[1]))) out[d[2]] = 1;
    });
    return out;
  }
  WG.wireConnections = wireConnections;

  function Redstone(game) {
    this.g = game; this.w = game.world;
    this.dirty = []; this.sched = []; this.time = 0; this.busy = false;
    if (!this.w.rsDoors) this.w.rsDoors = new Map();   // 扉が前に動力を受けていたか
    if (!this.w.plates) this.w.plates = new Map();     // 押されている感圧板（キー → 残りの刻み）
    if (!this.w.compOut) this.w.compOut = new Map();   // コンパレーターの出す強さ
    if (!this.w.daylight) this.w.daylight = new Map(); // 日照センサーの強さ
    if (!this.w.rsPrev) this.w.rsPrev = new Map();     // ディスペンサー・音符ブロックが前に動力を受けていたか
    if (!this.w.hopperLock) this.w.hopperLock = new Map();
  }
  Redstone.prototype.get = function (x, y, z) { return this.w.block(x, y, z); };
  Redstone.prototype.mark = function (x, y, z) { if (!this.busy) this.dirty.push([x, y, z]); };
  Redstone.prototype.set = function (x, y, z, id) {
    this.busy = true; this.w.setBlock(x, y, z, id); this.busy = false;
    this.g.walker.remesh(x, z);
    this.dirty.push([x, y, z]);
  };
  Redstone.prototype.conn = function (x, y, z) { var self = this; return wireConnections(function (dx, dy, dz) { return self.get(x + dx, y + dy, z + dz); }); };

  // 動力源が隣のマス (tx, ty, tz) へ出す強さ（粉を除く）
  Redstone.prototype.emit = function (x, y, z, tx, ty, tz) {
    var id = this.get(x, y, z), k = KIND(id);
    if (id === B.REDSTONE_BLOCK) return 15;
    if (k === 'plate' && isOn(id) && /WEIGHTED/.test(keyOf(id))) return this.w.plateLevel ? this.w.plateLevel.get(x + ',' + y + ',' + z) || 0 : 0;
    if ((k === 'lever' || k === 'button' || k === 'plate') && isOn(id)) return 15;
    if (k === 'rtorch' && WG.LIGHT_EMIT[id]) {
      var sp = WG.SUPPORT[id];
      if (sp && x + sp[0] === tx && y + sp[1] === ty && z + sp[2] === tz) return 0;   // 付いているブロックへは出さない
      return 15;
    }
    if (k === 'repeater' && isOn(id)) { var v = DVEC[repFacing(id)]; return x + v[0] === tx && y === ty && z + v[2] === tz ? 15 : 0; }
    // コンパレーター：前へ、計算した強さ
    if (k === 'comparator' && isOn(id)) { var cv = DVEC[compFacing(id)]; return x + cv[0] === tx && y === ty && z + cv[2] === tz ? (this.w.compOut.get(x + ',' + y + ',' + z) || 0) : 0; }
    // オブザーバー：顔の反対側（後ろ）へ 15
    if (k === 'solid' && WG.ORIENT[id] && /^OBSERVER_.*_ON$/.test(keyOf(id))) { var ov = DVEC[WG.ORIENT[id]]; return x - ov[0] === tx && y - ov[1] === ty && z - ov[2] === tz ? 15 : 0; }
    // 日照センサー：まわりへ明るさに合わせた強さ
    if (k === 'daylight') return this.w.daylight.get(x + ',' + y + ',' + z) || 0;
    var pk = x + ',' + y + ',' + z;
    // 重さを量る感圧板は、乗っている数に合わせた強さ（ほかの板は 15）
    if (k === 'plate' && isOn(id) && /WEIGHTED/.test(keyOf(id))) return this.w.plateLevel ? this.w.plateLevel.get(pk) || 0 : 0;
    if (k === 'hook' && isOn(id)) return 15;
    if (id === B.TARGET) return this.w.targetPow ? this.w.targetPow.get(pk) || 0 : 0;
    if (id === B.TRAPPED_CHEST) return this.g.invOpen && this.g.screen === 'chest' && this.g.chestKey === pk ? 1 : 0;
    if (k === 'sculk' && isOn(id)) return this.w.sculkPow ? this.w.sculkPow.get(pk) || 0 : 0;
    if (k === 'rail' && this.w.detect && this.w.detect.has(pk)) return 15;
    return 0;
  };
  // ブロック (bx, by, bz) が強い動力を受けているか
  Redstone.prototype.strong = function (bx, by, bz) {
    for (var i = 0; i < 6; i++) {
      var d = N6[i], x = bx + d[0], y = by + d[1], z = bz + d[2], id = this.get(x, y, z), k = KIND(id);
      if ((k === 'lever' || k === 'button' || k === 'hook') && isOn(id)) { var sp = WG.SUPPORT[id]; if (x + sp[0] === bx && y + sp[1] === by && z + sp[2] === bz) return 15; }
      if (k === 'plate' && isOn(id) && d[1] === 1) return /WEIGHTED/.test(keyOf(id)) ? this.emit(x, y, z, bx, by, bz) : 15;
      // 真上のトラップチェスト・ディテクターレール・スカルクセンサーは、下のブロックを強く動かす
      if (d[1] === 1 && (id === B.TRAPPED_CHEST || k === 'rail' || k === 'sculk')) { var e2 = this.emit(x, y, z, bx, by, bz); if (e2) return e2; }
      if (k === 'rtorch' && WG.LIGHT_EMIT[id] && d[1] === -1) return 15;   // トーチは真上のブロックを強く動かす
      if ((k === 'repeater' || k === 'comparator') && isOn(id)) { var e = this.emit(x, y, z, bx, by, bz); if (e) return e; }
      if (k === 'solid' && WG.ORIENT[id] && isOn(id) && this.emit(x, y, z, bx, by, bz)) return 15;
    }
    return 0;
  };
  // 粉が (x, y, z) から隣のマス (tx, tz)・下を向いているか
  Redstone.prototype.wirePoints = function (x, y, z, tx, ty, tz) {
    if (ty === y - 1 && tx === x && tz === z) return true;
    if (ty !== y) return false;
    var c = this.conn(x, y, z), n = c.n + c.e + c.s + c.w, dx = tx - x, dz = tz - z;
    if (!(c.n || c.e || c.s || c.w)) return true;
    var dirs = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }, opp = { n: 's', e: 'w', s: 'n', w: 'e' };
    for (var k in dirs) {
      if (dirs[k][0] !== dx || dirs[k][1] !== dz) continue;
      if (c[k]) return true;
      // つながりが 1 つだけなら反対側もまっすぐ向く
      var one = (c.n ? 1 : 0) + (c.e ? 1 : 0) + (c.s ? 1 : 0) + (c.w ? 1 : 0) === 1;
      if (one && c[opp[k]]) return true;
    }
    void n;
    return false;
  };
  // ブロック (bx, by, bz) が粉から受ける弱い動力
  Redstone.prototype.weak = function (bx, by, bz) {
    var best = 0;
    for (var i = 0; i < 6; i++) {
      var d = N6[i];
      if (d[1] === -1) continue;   // 下の粉は上のブロックに動力を与えない
      var x = bx + d[0], y = by + d[1], z = bz + d[2], id = this.get(x, y, z);
      if (isWire(id) && wirePower(id) > best && this.wirePoints(x, y, z, bx, by, bz)) best = wirePower(id);
    }
    return best;
  };
  // 部品（ランプ・扉・TNT・ピストン・トーチ以外）が動力を受けているか。skip は数えない向き（ピストンの前）
  Redstone.prototype.powered = function (cx, cy, cz, skip) {
    for (var i = 0; i < 6; i++) {
      var d = N6[i];
      if (skip && d[0] === skip[0] && d[1] === skip[1] && d[2] === skip[2]) continue;
      var x = cx + d[0], y = cy + d[1], z = cz + d[2], id = this.get(x, y, z);
      if (this.emit(x, y, z, cx, cy, cz)) return true;
      if (isWire(id) && wirePower(id) > 0 && this.wirePoints(x, y, z, cx, cy, cz)) return true;
      if (solidOpaque(id) && id !== B.REDSTONE_BLOCK && (this.strong(x, y, z) || this.weak(x, y, z))) return true;
    }
    return false;
  };
  // 粉への入力（粉からの分を除く）
  Redstone.prototype.wireInput = function (wx, wy, wz) {
    var best = 0;
    for (var i = 0; i < 6; i++) {
      var d = N6[i], x = wx + d[0], y = wy + d[1], z = wz + d[2], id = this.get(x, y, z);
      var e = this.emit(x, y, z, wx, wy, wz);
      if (e > best) best = e;
      if (solidOpaque(id) && this.strong(x, y, z)) best = 15;
    }
    return best;
  };
  // 粉どうしのつながり（同じ高さ、1 段上、1 段下）
  Redstone.prototype.wireNeighbors = function (x, y, z) {
    var out = [], upOpen = !WG.OPAQUE[this.get(x, y + 1, z)];
    for (var i = 0; i < 4; i++) {
      var d = H4[i], nx = x + d[0], nz = z + d[1], side = this.get(nx, y, nz);
      if (isWire(side)) out.push([nx, y, nz]);
      else if (WG.OPAQUE[side]) { if (upOpen && isWire(this.get(nx, y + 1, nz))) out.push([nx, y + 1, nz]); }
      else if (isWire(this.get(nx, y - 1, nz))) out.push([nx, y - 1, nz]);
    }
    return out;
  };

  // 1 刻み：予定の切り替え（トーチ・リピーター・ボタン）と、変わった所のまわりの計算
  Redstone.prototype.tick = function () {
    this.time++;
    var due = [], keep = [], self = this;
    this.sched.forEach(function (e) { (e.t <= self.time ? due : keep).push(e); });
    this.sched = keep;
    due.forEach(function (e) {
      if (e.fn) { e.fn(); return; }
      if (self.get(e.x, e.y, e.z) !== e.from) return;
      // トーチが短い間に何度も消える（8 回 / 3 秒）と焼き切れて、しばらく点かない（本家と同じ）
      if (KIND(e.from) === 'rtorch' && WG.LIGHT_EMIT[e.from] && !WG.LIGHT_EMIT[e.to]) {
        var tk = e.x + ',' + e.y + ',' + e.z, hist = (self.w.torchHist || (self.w.torchHist = new Map())).get(tk) || [];
        hist = hist.filter(function (t0) { return self.time - t0 < 60; }); hist.push(self.time); self.w.torchHist.set(tk, hist);
        if (hist.length >= 8) { (self.w.torchBurnt || (self.w.torchBurnt = new Map())).set(tk, self.time + 160); self.later(161, function () { self.dirty.push([e.x, e.y, e.z]); }); if (self.g.puff) self.g.puff(e.x + 0.5, e.y + 0.8, e.z + 0.5, [80, 80, 80], 8, 0.08); }
      }
      if (KIND(e.from) === 'rtorch' && !WG.LIGHT_EMIT[e.from] && WG.LIGHT_EMIT[e.to] && self.w.torchBurnt && (self.w.torchBurnt.get(e.x + ',' + e.y + ',' + e.z) || 0) > self.time) return;
      self.set(e.x, e.y, e.z, e.to);
      // オブザーバーは 2 刻みで元に戻る
      if (/^OBSERVER_.*_ON$/.test(keyOf(e.to))) self.schedule(e.x, e.y, e.z, e.to, e.from, 2);
    });
    this.tickPlates();
    this.tickAnims(false);
    var guard = 0;
    while (this.dirty.length && guard++ < 8) { var d = this.dirty; this.dirty = []; this.update(d); }
  };
  Redstone.prototype.later = function (delay, fn, tag) {
    for (var i = 0; i < this.sched.length; i++) if (tag && this.sched[i].tag === tag) return;
    this.sched.push({ t: this.time + delay, fn: fn, tag: tag });
  };
  // オブザーバー：見ている前のマスが変わったら、2 刻み後に後ろへ 2 刻みの動力を出す
  Redstone.prototype.observe = function (x, y, z) {
    for (var i = 0; i < 6; i++) {
      var d = N6[i], ox = x + d[0], oy = y + d[1], oz = z + d[2], id = this.get(ox, oy, oz), o = WG.ORIENT[id];
      if (!o || !/^OBSERVER_[NESWUD]$/.test(keyOf(id))) continue;
      var v = DVEC[o];
      if (ox + v[0] !== x || oy + v[1] !== y || oz + v[2] !== z) continue;
      this.schedule(ox, oy, oz, id, B[keyOf(id) + '_ON'], 2);
    }
  };
  Redstone.prototype.schedule = function (x, y, z, from, to, delay) {
    for (var i = 0; i < this.sched.length; i++) { var e = this.sched[i]; if (!e.fn && e.x === x && e.y === y && e.z === z) return; }
    this.sched.push({ x: x, y: y, z: z, from: from, to: to, t: this.time + delay });
  };

  Redstone.prototype.update = function (list) {
    var self = this, wires = new Map(), comps = new Map(), i, k;
    function addComp(x, y, z) { comps.set(x + ',' + y + ',' + z, [x, y, z]); }
    // 1) 変わった所のまわりの粉を集め、つながっている粉を全部たどる
    list.forEach(function (p) {
      for (var dy = -1; dy <= 1; dy++) for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) {
        var x = p[0] + dx, y = p[1] + dy, z = p[2] + dz;
        if (isWire(self.get(x, y, z))) wires.set(x + ',' + y + ',' + z, [x, y, z]);
        addComp(x, y, z);
      }
    });
    var stack = Array.from(wires.values());
    while (stack.length && wires.size < 4000) {
      var q = stack.pop();
      this.wireNeighbors(q[0], q[1], q[2]).forEach(function (n) { var kk = n.join(','); if (!wires.has(kk)) { wires.set(kk, n); stack.push(n); } });
    }
    // 2) 強さを決める（入力から 1 ずつ弱めて広げる）
    if (wires.size) {
      var pw = new Map(), buckets = [];
      for (i = 0; i <= 15; i++) buckets.push([]);
      wires.forEach(function (p, kk) { var s = self.wireInput(p[0], p[1], p[2]); pw.set(kk, s); buckets[s].push(p); });
      for (var lv = 15; lv > 0; lv--) {
        var bk = buckets[lv];
        for (i = 0; i < bk.length; i++) {
          var p = bk[i];
          if (pw.get(p.join(',')) !== lv) continue;
          this.wireNeighbors(p[0], p[1], p[2]).forEach(function (n) {
            var kk = n.join(',');
            if (pw.has(kk) && pw.get(kk) < lv - 1) { pw.set(kk, lv - 1); buckets[lv - 1].push(n); }
          });
        }
      }
      // 3) 変わった粉を書き換え、まわりの部品を確かめる
      pw.forEach(function (v, kk) {
        var p = wires.get(kk), cur = self.get(p[0], p[1], p[2]);
        if (wirePower(cur) === v) return;
        self.busy = true; self.w.setBlock(p[0], p[1], p[2], WIRE0 + v); self.busy = false;
        self.g.walker.remesh(p[0], p[2]);
        for (var dy = -2; dy <= 1; dy++) for (var dz = -2; dz <= 2; dz++) for (var dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dz) <= 2) addComp(p[0] + dx, p[1] + dy, p[2] + dz);
      });
    }
    // 4) 部品
    comps.forEach(function (p) { self.updateComp(p[0], p[1], p[2]); });
    void k;
  };

  Redstone.prototype.updateComp = function (x, y, z) {
    var id = this.get(x, y, z), k = KIND(id), key = keyOf(id), g = this.g;
    if (id === B.REDSTONE_LAMP || id === B.REDSTONE_LAMP_ON) {
      // ランプはすぐ点き、消えるのは 4 刻み後（本家と同じ）
      var on = this.powered(x, y, z), self0 = this;
      if (on && id === B.REDSTONE_LAMP) this.set(x, y, z, B.REDSTONE_LAMP_ON);
      else if (!on && id === B.REDSTONE_LAMP_ON) this.later(4, function () { if (self0.get(x, y, z) === B.REDSTONE_LAMP_ON && !self0.powered(x, y, z)) self0.set(x, y, z, B.REDSTONE_LAMP); }, 'lamp' + x + ',' + y + ',' + z);
    } else if (k === 'trapdoor' || k === 'gate') {
      // トラップドア（鉄も）・フェンスゲートは、動力を受けると開き、なくなると閉じる
      var tkk = 'td' + x + ',' + y + ',' + z, tpow = this.powered(x, y, z), tprev = !!this.w.rsPrev.get(tkk);
      if (tpow === tprev) return;
      this.w.rsPrev.set(tkk, tpow);
      var tm = /^(\w+)_TRAPDOOR_(\w+)$/.exec(key), gm = /^(\w+)_FENCE_GATE_(X|Z)(O?)$/.exec(key), tgt = null;
      if (tm) {
        var isOpen = /^O/.test(tm[2]);
        if (tpow && !isOpen) { (this.w.trapClosed || (this.w.trapClosed = new Map())).set(x + ',' + y + ',' + z, tm[2]); tgt = B[tm[1] + '_TRAPDOOR_ON']; }
        else if (!tpow && isOpen) tgt = B[tm[1] + '_TRAPDOOR_' + ((this.w.trapClosed && this.w.trapClosed.get(x + ',' + y + ',' + z)) || 'B')];
      } else if (gm && tpow !== !!gm[3]) tgt = B[gm[1] + '_FENCE_GATE_' + gm[2] + (tpow ? 'O' : '')];
      if (tgt != null) { this.set(x, y, z, tgt); if (WG.Sound) WG.Sound.play('door', x + 0.5, y + 0.5, z + 0.5); }
    } else if (id === B.COPPER_BULB || id === B.COPPER_BULB_LIT) {
      // 銅の電球：動力を受けるたびに点く・消えるが入れ替わる
      var bk = 'cb' + x + ',' + y + ',' + z, bnow = this.powered(x, y, z), bbef = !!this.w.rsPrev.get(bk);
      this.w.rsPrev.set(bk, bnow);
      if (bnow && !bbef) this.set(x, y, z, id === B.COPPER_BULB ? B.COPPER_BULB_LIT : B.COPPER_BULB);
    } else if (id === B.TNT) {
      if (this.powered(x, y, z)) g.primeTnt(x, y, z, 80);
    } else if (k === 'door') {
      var upper = /U$/.test(key), ly = upper ? y - 1 : y, kk = x + ',' + ly + ',' + z;
      var pow = this.powered(x, ly, z) || this.powered(x, ly + 1, z), was = !!this.w.rsDoors.get(kk);
      if (pow === was) return;
      this.w.rsDoors.set(kk, pow);
      var lid = this.get(x, ly, z), lkey = keyOf(lid), open = /O[LU]$/.test(lkey);
      if (open !== pow) g.toggleDoor(x, ly, z);
    } else if (k === 'rtorch') {
      var sp = WG.SUPPORT[id], ax = x + sp[0], ay = y + sp[1], az = z + sp[2], att = this.get(ax, ay, az);
      var off = !!(att === B.REDSTONE_BLOCK || (solidOpaque(att) && (this.strong(ax, ay, az) > 0 || this.weak(ax, ay, az) > 0)));
      var lit = !!WG.LIGHT_EMIT[id];
      if (!off && !lit && this.w.torchBurnt && (this.w.torchBurnt.get(x + ',' + y + ',' + z) || 0) > this.time) return;   // 焼き切れている間は点かない
      if (off === lit) {
        var to = lit ? B[key + '_OFF'] : B[key.replace(/_OFF$/, '')];
        this.schedule(x, y, z, id, to, 2);
      }
    } else if (k === 'repeater') {
      var f = repFacing(id), v = DVEC[f], bx = x - v[0], bz = z - v[2], bid = this.get(bx, y, bz);
      // （!! で真偽にする：0 のままだと「オフ」と比べて違うことになり、入力のないリピーターが勝手に点いていた）
      var inp = !!((isWire(bid) && wirePower(bid) > 0) || this.emit(bx, y, bz, x, y, z) > 0 || bid === B.REDSTONE_BLOCK ||
        (solidOpaque(bid) && (this.strong(bx, y, bz) > 0 || this.weak(bx, y, bz) > 0)));
      var ison = isOn(id);
      if (this.repLocked(x, y, z, f)) return;   // 横から押さえられていると、今の状態のまま
      if (inp !== ison) this.schedule(x, y, z, id, ison ? B[key.replace(/_ON$/, '')] : B[key + '_ON'], repDelay(id) * 2);
    } else if (k === 'hopper') {
      this.w.hopperLock.set(x + ',' + y + ',' + z, this.powered(x, y, z));   // 動力を受けたホッパーは止まる
    } else if (/^(DISPENSER|DROPPER|CRAFTER)_/.test(key) || id === B.NOTE_BLOCK) {
      // 動力を受けた瞬間に 1 回動く（ディスペンサー・ドロッパー・クラフターは 4 刻み後）。準接続：1 つ上のマスに動力があっても動く（音符ブロックは除く）
      var kk2 = x + ',' + y + ',' + z, now = this.powered(x, y, z) || (id !== B.NOTE_BLOCK && this.powered(x, y + 1, z)), before = !!this.w.rsPrev.get(kk2);
      this.w.rsPrev.set(kk2, now);
      if (now && !before) {
        if (id === B.NOTE_BLOCK) g.playNote(x, y, z);
        else if (/^CRAFTER_/.test(key)) this.later(4, function () { if (g.craftAt) g.craftAt(x, y, z); });
        else this.later(4, function () { g.dispense(x, y, z); });
      }
    } else if (k === 'comparator') {
      this.updateComparator(x, y, z, id);
    } else if (k === 'piston') {
      var pm = /^(STICKY_)?PISTON_([NESWUD])(_X)?$/.exec(key);
      if (!pm) return;
      // 準接続：ピストンの 1 つ上のマスに動力があっても伸びる（本家と同じ）
      var fv = DVEC[pm[2]], pon = this.powered(x, y, z, fv) || (pm[2] !== 'U' && this.powered(x, y + 1, z));
      if (pon && !pm[3]) this.extend(x, y, z, !!pm[1], pm[2]);
      else if (!pon && pm[3]) this.retract(x, y, z, !!pm[1], pm[2]);
    }
  };

  // リピーターのロック：横からオンのリピーター・コンパレーターがこちらを向いている
  Redstone.prototype.repLocked = function (x, y, z, f) {
    var v = DVEC[f], self = this;
    return [[v[2], -v[0]], [-v[2], v[0]]].some(function (d) {
      var sid = self.get(x + d[0], y, z + d[1]), sk = KIND(sid);
      if ((sk !== 'repeater' && sk !== 'comparator') || !isOn(sid)) return false;
      var sv = DVEC[repFacing(sid) || compFacing(sid)];
      return sv[0] === -d[0] && sv[2] === -d[1];
    });
  };
  WG.repLocked = function (rs, x, y, z) { var id = rs.get(x, y, z); return KIND(id) === 'repeater' && rs.repLocked(x, y, z, repFacing(id)); };

  // ---- コンパレーター ----
  // 後ろの強さ（入れ物ならその中身の量、粉・動力源・動力を受けたブロック）と、横の強さ（粉・リピーター・コンパレーター・動力ブロック）
  Redstone.prototype.rearPower = function (x, y, z, f) {
    var v = DVEC[f], rx = x - v[0], rz = z - v[2], rid = this.get(rx, y, rz), g = this.g;
    var fill = g.containerSignal ? g.containerSignal(rx, y, rz) : -1;
    if (fill >= 0) return fill;
    if (isWire(rid)) return wirePower(rid);
    var e = this.emit(rx, y, rz, x, y, z);
    if (e) return e;
    if (solidOpaque(rid)) {
      var p = this.strong(rx, y, rz) || this.weak(rx, y, rz);
      if (p) return p;
      var f2 = g.containerSignal ? g.containerSignal(rx - v[0], y, rz - v[2]) : -1;   // ブロック越しの入れ物も読む
      return f2 > 0 ? f2 : 0;
    }
    return 0;
  };
  Redstone.prototype.sidePower = function (x, y, z, f) {
    var v = DVEC[f], best = 0, self = this;
    [[v[2], -v[0]], [-v[2], v[0]]].forEach(function (d) {
      var sx = x + d[0], sz = z + d[1], sid = self.get(sx, y, sz), k = KIND(sid), p = 0;
      if (isWire(sid)) p = wirePower(sid);
      else if (sid === B.REDSTONE_BLOCK) p = 15;
      else if (k === 'repeater' || k === 'comparator') p = self.emit(sx, y, sz, x, y, z);
      if (p > best) best = p;
    });
    return best;
  };
  Redstone.prototype.updateComparator = function (x, y, z, id) {
    var key = keyOf(id), f = compFacing(id), sub = /^COMPARATOR_[NESW]S/.test(key), self = this;
    var rear = this.rearPower(x, y, z, f), side = this.sidePower(x, y, z, f);
    var out = sub ? Math.max(0, rear - side) : (rear >= side ? rear : 0), kk = x + ',' + y + ',' + z;
    if (out === (this.w.compOut.get(kk) || 0) && (out > 0) === isOn(id)) return;
    this.later(2, function () {
      var cur = self.get(x, y, z);
      if (KIND(cur) !== 'comparator') return;
      self.w.compOut.set(kk, out);
      var base = keyOf(cur).replace(/_ON$/, ''), want = B[base + (out > 0 ? '_ON' : '')];
      if (want !== cur) self.set(x, y, z, want); else self.dirty.push([x, y, z]);
      var v = DVEC[f]; self.dirty.push([x + v[0], y, z + v[2]]);
    }, 'cmp' + kk);
  };
  // 右クリック：比較 ⇔ 減算
  Redstone.prototype.toggleComparator = function (x, y, z) {
    var id = this.get(x, y, z), key = keyOf(id);
    this.set(x, y, z, B[key.replace(/^(COMPARATOR_[NESW])([CS])/, function (m, a, b) { return a + (b === 'C' ? 'S' : 'C'); })]);
  };

  // ---- ピストン ----
  // 押せないもの：岩盤・黒曜石・ポータル枠・スポナー・中身のあるもの（チェスト・かまど）・伸びたピストン・テーブル類
  var FIXED = ['BEDROCK', 'OBSIDIAN', 'END_PORTAL_FRAME', 'SPAWNER', 'CHEST', 'TRAPPED_CHEST', 'FURNACE', 'FURNACE_LIT', 'ENCHANTING_TABLE', 'BREWING_STAND',
    'BEACON', 'BARREL', 'SHELL_BOX', 'LINKED_CHEST', 'CRYING_OBSIDIAN', 'END_GATEWAY', 'END_PORTAL', 'MOVING_PISTON', 'BLAST_FURNACE', 'BLAST_FURNACE_LIT', 'SMOKER', 'SMOKER_LIT'].concat(WG.COLORS16.map(function (c) { return c[0] + '_SHELL_BOX'; }));
  // 押されると壊れるもの
  var BREAKS = { plant: 1, deco: 1, crop: 1, wire: 1, fire: 1, web: 1, cane: 1, ladder: 1, door: 1, rtorch: 1, lever: 1, button: 1, plate: 1, repeater: 1, bed: 1 };
  function movable(id) {
    var k = KIND(id), key = keyOf(id);
    if (FIXED.indexOf(key) >= 0 || k === 'phead' || (k === 'piston' && /_X$/.test(key))) return false;
    if (/^(HOPPER|DISPENSER|DROPPER|CRAFTER)_/.test(key) || k === 'frame' || k === 'sign' || k === 'banner') return false;   // 中身や情報を持つもの
    return true;
  }
  function sticky(id) { return id === B.SLIME_BLOCK || id === B.HONEY_BLOCK; }
  // 動かすブロックのまとまりを集める（スライム・ハチミツは横のブロックも一緒に。スライムとハチミツはくっつかない）。動かせなければ null
  Redstone.prototype.gather = function (sx, sy, sz, v, px, py, pz) {
    var self = this, set = new Map(), stack = [[sx, sy, sz]], k2 = function (a, b, c) { return a + ',' + b + ',' + c; };
    var bad = false;
    function want(x, y, z, forced) {
      if (bad) return;
      var id = self.get(x, y, z), kk = k2(x, y, z);
      if (set.has(kk) || (x === px && y === py && z === pz)) { if (forced && x === px && y === py && z === pz) bad = true; return; }
      if (y < self.w.minY || y > self.w.maxY) { if (forced) bad = true; return; }
      if (id === B.AIR || WG.FLUID[id] || BREAKS[KIND(id)]) return;
      if (!movable(id)) { if (forced) bad = true; return; }
      set.set(kk, [x, y, z, id]); stack.push([x, y, z]);
      if (set.size > 12) bad = true;
    }
    want(sx, sy, sz, true); stack = [[sx, sy, sz]];
    while (stack.length && !bad) {
      var c = stack.pop(), id = self.get(c[0], c[1], c[2]);
      if (!set.has(k2(c[0], c[1], c[2]))) continue;
      want(c[0] + v[0], c[1] + v[1], c[2] + v[2], true);   // 進む先は押さなければならない
      if (sticky(id)) N6.forEach(function (d) {
        var nid = self.get(c[0] + d[0], c[1] + d[1], c[2] + d[2]);
        if ((id === B.SLIME_BLOCK && nid === B.HONEY_BLOCK) || (id === B.HONEY_BLOCK && nid === B.SLIME_BLOCK)) return;
        if (d[0] === -v[0] && d[1] === -v[1] && d[2] === -v[2]) { want(c[0] + d[0], c[1] + d[1], c[2] + d[2], false); return; }
        want(c[0] + d[0], c[1] + d[1], c[2] + d[2], false);
      });
    }
    return bad ? null : Array.from(set.values());
  };
  // まとまりを動かす：元の場所を空け、行き先は「動いているブロック」にして、3 刻みの間すべらせて見せてから置く
  Redstone.prototype.moveGroup = function (list, v) {
    var self = this, g = this.g, dest = new Map();
    list.forEach(function (c) { dest.set((c[0] + v[0]) + ',' + (c[1] + v[1]) + ',' + (c[2] + v[2]), c); });
    // 行き先の壊れるもの（草花・粉など）を落とす
    list.forEach(function (c) { var tx = c[0] + v[0], ty = c[1] + v[1], tz = c[2] + v[2], tid = self.get(tx, ty, tz); if (!dest.has(tx + ',' + ty + ',' + tz) || true) { if (BREAKS[KIND(tid)] && !list.some(function (q) { return q[0] === tx && q[1] === ty && q[2] === tz; })) g.popBlock(tx, ty, tz); } });
    list.forEach(function (c) { self.set(c[0], c[1], c[2], B.AIR); });
    var anims = this.w.pistonAnims || (this.w.pistonAnims = []);
    list.forEach(function (c) {
      var tx = c[0] + v[0], ty = c[1] + v[1], tz = c[2] + v[2];
      self.set(tx, ty, tz, B.MOVING_PISTON);
      anims.push({ id: c[3], x: tx, y: ty, z: tz, v: v.slice(), t: 0 });
    });
    // 行き先にいる生き物・アイテム・プレイヤーを一緒に動かす（スライムの上ならはね飛ばす）
    var cells = list.map(function (c) { return [c[0] + v[0], c[1] + v[1], c[2] + v[2], c[3]]; });
    function inCell(bx0, by0, bz0, bx1, by1, bz1) { return cells.filter(function (c) { return bx0 < c[0] + 1 && bx1 > c[0] && by0 < c[1] + 1.05 && by1 > c[1] && bz0 < c[2] + 1 && bz1 > c[2]; }); }
    var wk = g.walker, b = wk.box(), hit = inCell(b[0], b[1], b[2], b[3], b[4], b[5]);
    if (hit.length) {
      var slime = hit.some(function (c) { return c[3] === B.SLIME_BLOCK; });
      wk.pos[0] += v[0]; wk.pos[1] += Math.max(0, v[1]) * 1.01; wk.pos[2] += v[2];
      if (slime) { wk.vel[0] += v[0] * 0.9; wk.vel[1] += Math.max(0.2, v[1] * 1.0); wk.vel[2] += v[2] * 0.9; }
    }
    g.mobs.list.forEach(function (m) {
      var hw = 0.3; if (!inCell(m.x - hw, m.y, m.z - hw, m.x + hw, m.y + 1, m.z + hw).length) return;
      m.x += v[0]; m.y += Math.max(0, v[1]); m.z += v[2]; m.px = m.x; m.py = m.y; m.pz = m.z;
    });
    g.entities.forEach(function (e) { if (inCell(e.x - 0.1, e.y, e.z - 0.1, e.x + 0.1, e.y + 0.2, e.z + 0.1).length) { e.x += v[0]; e.y += Math.max(0, v[1]); e.z += v[2]; } });
  };
  // 動く絵を進める（3 刻みで置く）。finish なら今すぐ置く
  Redstone.prototype.tickAnims = function (finish) {
    var anims = this.w.pistonAnims, self = this;
    if (!anims || !anims.length) return;
    var keep = [];
    anims.forEach(function (a) {
      if (++a.t < 3 && !finish) { keep.push(a); return; }
      if (self.get(a.x, a.y, a.z) === B.MOVING_PISTON) self.set(a.x, a.y, a.z, a.id);
    });
    this.w.pistonAnims = keep;
  };
  Redstone.prototype.extend = function (x, y, z, sticky, f) {
    var v = DVEC[f], g = this.g, hx = x + v[0], hy = y + v[1], hz = z + v[2];
    this.tickAnims(true);
    if (hy < this.w.minY || hy > this.w.maxY) return;
    var hid = this.get(hx, hy, hz), list = [];
    if (hid !== B.AIR && !WG.FLUID[hid] && !BREAKS[KIND(hid)]) {
      list = this.gather(hx, hy, hz, v, x, y, z);
      if (!list) return;   // 押せないものがある・12 個より多い
    } else if (BREAKS[KIND(hid)]) g.popBlock(hx, hy, hz);
    if (list.length) this.moveGroup(list, v);
    this.set(x, y, z, B[(sticky ? 'STICKY_' : '') + 'PISTON_' + f + '_X']);
    this.set(hx, hy, hz, B[(sticky ? 'STICKY_' : '') + 'PISTON_HEAD_' + f]);
    if (!list.length) {
      var wk = g.walker, b = wk.box();
      if (b[0] < hx + 1 && b[3] > hx && b[1] < hy + 1 && b[4] > hy && b[2] < hz + 1 && b[5] > hz) { wk.pos[0] += v[0]; wk.pos[1] += Math.max(0, v[1]) * 1.01; wk.pos[2] += v[2]; }
    }
    if (WG.Sound) WG.Sound.play('piston', x + 0.5, y + 0.5, z + 0.5);
    g.puff && g.puff(x + 0.5 + v[0], y + 0.5 + v[1], z + 0.5 + v[2], [190, 180, 160], 3, 0.3);
  };
  Redstone.prototype.retract = function (x, y, z, sticky, f) {
    var v = DVEC[f], hx = x + v[0], hy = y + v[1], hz = z + v[2], back = [-v[0], -v[1], -v[2]];
    this.tickAnims(true);
    if (KIND(this.get(hx, hy, hz)) === 'phead') this.set(hx, hy, hz, B.AIR);
    this.set(x, y, z, B[(sticky ? 'STICKY_' : '') + 'PISTON_' + f]);
    if (sticky) {
      var fx = hx + v[0], fy = hy + v[1], fz = hz + v[2], fid = this.get(fx, fy, fz);
      if (fid !== B.AIR && !WG.FLUID[fid] && movable(fid) && !BREAKS[KIND(fid)]) {
        var list = this.gather(fx, fy, fz, back, x, y, z);
        if (list) this.moveGroup(list, back);
      }
    }
  };

  // ---- 手で動かすもの ----
  Redstone.prototype.toggleLever = function (x, y, z) {
    var id = this.get(x, y, z), key = keyOf(id);
    this.set(x, y, z, isOn(id) ? B[key.replace(/_ON$/, '')] : B[key + '_ON']);
    var sp = WG.SUPPORT[id]; this.dirty.push([x + sp[0], y + sp[1], z + sp[2]]);
  };
  Redstone.prototype.pressButton = function (x, y, z) {
    var id = this.get(x, y, z), key = keyOf(id);
    if (isOn(id)) return;
    var on = B[key + '_ON'];
    this.set(x, y, z, on);
    var sp = WG.SUPPORT[id]; this.dirty.push([x + sp[0], y + sp[1], z + sp[2]]);
    this.schedule(x, y, z, on, id, /^OAK/.test(key) ? 30 : 20);   // 石は 1 秒、木は 1.5 秒
  };
  Redstone.prototype.cycleRepeater = function (x, y, z) {
    var id = this.get(x, y, z), m = /^REPEATER_([NESW])(\d)(_ON)?$/.exec(keyOf(id));
    this.set(x, y, z, B['REPEATER_' + m[1] + (+m[2] % 4 + 1) + (m[3] || '')]);
  };
  // 感圧板：上にプレイヤー・生き物（木の板は落ちているアイテムも）がいる間はオン。いなくなって 1 秒後にオフ。
  Redstone.prototype.tickPlates = function () {
    var g = this.g, w = g.walker, self = this, here = [];
    function at(x, y, z, items) {
      var bx = Math.floor(x), by = Math.floor(y + 0.05), bz = Math.floor(z), id = self.get(bx, by, bz);
      if (KIND(id) !== 'plate' || /WEIGHTED/.test(keyOf(id)) || (items && !/^OAK/.test(keyOf(id)))) return;
      here.push([bx, by, bz, id]);
    }
    if (!g.dead) at(w.pos[0], w.pos[1], w.pos[2]);
    g.mobs.list.forEach(function (m) { at(m.x, m.y, m.z); });
    g.entities.forEach(function (e) { at(e.x, e.y, e.z, true); });
    here.forEach(function (p) {
      var key = p[0] + ',' + p[1] + ',' + p[2];
      self.w.plates.set(key, 20);
      if (!isOn(p[3])) { self.set(p[0], p[1], p[2], B[keyOf(p[3]) + '_ON']); self.dirty.push([p[0], p[1] - 1, p[2]]); }
    });
    this.w.plates.forEach(function (t, key) {
      if (here.some(function (p) { return p[0] + ',' + p[1] + ',' + p[2] === key; })) return;
      if (--t > 0) { self.w.plates.set(key, t); return; }
      self.w.plates.delete(key);
      var c = key.split(',').map(Number), id = self.get(c[0], c[1], c[2]);
      if (KIND(id) === 'plate' && isOn(id)) { self.set(c[0], c[1], c[2], B[keyOf(id).replace(/_ON$/, '')]); self.dirty.push([c[0], c[1] - 1, c[2]]); }
    });
  };

  WG.Redstone = Redstone;
})(typeof window !== 'undefined' ? window : globalThis);
