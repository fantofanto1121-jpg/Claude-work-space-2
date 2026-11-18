// 画面の操作と表示の切り替え
(function () {
  'use strict';
  var WG = window.WG;
  var $ = function (id) { return document.getElementById(id); };
  var ZOOMS = [1, 2, 3, 4, 6, 8, 12, 16];
  var DIM_KEYS = ['overworld', 'nether', 'end'];

  var state = { seed: '7', dim: 'overworld', mode: 'top', cx: 0, cz: 0, zoom: 1, axis: 0, size3d: 96 };
  var perDim = {};
  DIM_KEYS.forEach(function (k) {
    var v = WG.DIMS[k].view;
    perDim[k] = { yMin: v.yMin, yMax: v.yMax, slice: v.slice, cy: v.cy };
  });
  var worlds = {};
  function world() {
    var key = state.seed + '|' + state.dim;
    if (!worlds[key]) {
      for (var k in worlds) if (k.split('|')[0] !== state.seed) delete worlds[k];
      worlds[key] = new WG.World(state.seed, state.dim);
    }
    return worlds[key];
  }
  function dv() { return perDim[state.dim]; }

  var c2d = $('c2d'), ctx = c2d.getContext('2d'), c3d = $('c3d');
  var view3d = null;
  var dpr = window.devicePixelRatio || 1;

  // ---------------- 2D ----------------
  // 拡大率が 8 以上のときは、ブロックの見た目（8×8）を描いた細かいタイルを使う
  var tileCache = new Map(), TILE_LIMIT = 9000, TEX_LIMIT = 400;
  var texCache = new Map();
  function resOf() { return ZOOMS[state.zoom] >= 8 ? 8 : 1; }
  var job = null, jobToken = 0;

  function resize2D() {
    dpr = window.devicePixelRatio || 1;
    var w = Math.max(1, Math.round(c2d.clientWidth * dpr)), h = Math.max(1, Math.round(c2d.clientHeight * dpr));
    if (c2d.width !== w || c2d.height !== h) { c2d.width = w; c2d.height = h; }
  }

  function tileKey(kind, a, b) {
    return state.seed + '|' + state.dim + '|' + kind + '|' + a + '|' + b;
  }

  function start2D() {
    resize2D();
    b3Token++;
    var tok = ++jobToken, w = world(), z = ZOOMS[state.zoom] * dpr, W = c2d.width, H = c2d.height, d = dv(), res = resOf();
    var items = [], ox, oy, offW, offH, kind, c, i;
    if (state.mode === 'top' || state.mode === 'slice') {
      var c0x = Math.floor((state.cx - W / 2 / z) / 16), c1x = Math.floor((state.cx + W / 2 / z) / 16);
      var c0z = Math.floor((state.cz - H / 2 / z) / 16), c1z = Math.floor((state.cz + H / 2 / z) / 16);
      var mcx = Math.floor(state.cx / 16), mcz = Math.floor(state.cz / 16);
      kind = (state.mode === 'top' ? 'top:' + d.yMax : 'slice:' + d.slice) + ':' + res;
      for (var cz = c0z; cz <= c1z; cz++) for (var cx = c0x; cx <= c1x; cx++) {
        items.push({ a: cx, b: cz, px: (cx - c0x) * 16 * res, py: (cz - c0z) * 16 * res, d: (cx - mcx) * (cx - mcx) + (cz - mcz) * (cz - mcz) });
      }
      offW = (c1x - c0x + 1) * 16 * res; offH = (c1z - c0z + 1) * 16 * res;
      ox = W / 2 + (c0x * 16 - state.cx) * z; oy = H / 2 + (c0z * 16 - state.cz) * z;
    } else {
      var hc = state.axis === 0 ? state.cx : state.cz, line = Math.floor(state.axis === 0 ? state.cz : state.cx);
      var c0 = Math.floor((hc - W / 2 / z) / 16), c1 = Math.floor((hc + W / 2 / z) / 16), mc = Math.floor(hc / 16);
      kind = 'sec:' + state.axis + ':' + line + ':' + d.yMin + ':' + d.yMax + ':' + res;
      for (c = c0; c <= c1; c++) items.push({ a: c, b: line, px: (c - c0) * 16 * res, py: 0, d: Math.abs(c - mc) });
      offW = (c1 - c0 + 1) * 16 * res; offH = (d.yMax - d.yMin + 1) * res;
      ox = W / 2 + (c0 * 16 - hc) * z; oy = H / 2 - (d.yMax + 1 - d.cy) * z;
    }
    items.sort(function (p, q) { return p.d - q.d; });
    var off = document.createElement('canvas');
    off.width = offW; off.height = offH;
    var octx = off.getContext('2d');
    var missing = [];
    for (i = 0; i < items.length; i++) {
      var it = items[i], key = tileKey(kind, it.a, it.b), t = (res > 1 ? texCache : tileCache).get(key);
      it.key = key;
      if (t) octx.putImageData(t, it.px, it.py); else missing.push(it);
    }
    job = { tok: tok, w: w, kind: kind, res: res, off: off, octx: octx, ox: ox, oy: oy, z: z, missing: missing, i: 0, total: items.length, t0: performance.now(), g0: w.genCount, gt0: w.genTime };
    blit();
    if (missing.length) requestAnimationFrame(pump); else finish2D();
  }

  function makeTile(w, kind, a, b, res) {
    var d = dv(), img;
    if (kind.indexOf('top:') === 0) { img = new ImageData(16 * res, 16 * res); WG.Paint.topTile(w, a, b, d.yMax, img.data, res); }
    else if (kind.indexOf('slice:') === 0) { img = new ImageData(16 * res, 16 * res); WG.Paint.sliceTile(w, a, b, d.slice, img.data, res); }
    else { img = new ImageData(16 * res, (d.yMax - d.yMin + 1) * res); WG.Paint.sectionTile(w, state.axis, b, a, d.yMin, d.yMax, img.data, res); }
    return img;
  }

  function pump() {
    if (!job || job.tok !== jobToken) return;
    var t0 = performance.now();
    while (job.i < job.missing.length && performance.now() - t0 < 22) {
      var it = job.missing[job.i++];
      var img = makeTile(job.w, job.kind, it.a, it.b, job.res);
      var cache = job.res > 1 ? texCache : tileCache;
      cache.set(it.key, img);
      if (cache.size > (job.res > 1 ? TEX_LIMIT : TILE_LIMIT)) cache.delete(cache.keys().next().value);
      job.octx.putImageData(img, it.px, it.py);
    }
    blit();
    if (job.i < job.missing.length) {
      setProgress('生成中 ' + (job.total - job.missing.length + job.i) + ' / ' + job.total + ' チャンク');
      requestAnimationFrame(pump);
    } else finish2D();
  }

  function finish2D() {
    var n = job.w.genCount - job.g0, t = job.w.genTime - job.gt0;
    setProgress(job.total + ' チャンク表示' + (n ? '　新規生成 ' + n + '（平均 ' + (t / n).toFixed(1) + ' ms）' : ''));
  }

  function blit() {
    var pal = world().dim.palette;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgb(' + pal.void.join(',') + ')';
    ctx.fillRect(0, 0, c2d.width, c2d.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(job.off, Math.round(job.ox), Math.round(job.oy), job.off.width * job.z / job.res, job.off.height * job.z / job.res);
  }

  // 画面の点 → 世界の座標
  function screenToWorld(mx, my) {
    var z = ZOOMS[state.zoom], W = c2d.clientWidth, H = c2d.clientHeight;
    if (state.mode === 'section') {
      var hc = state.axis === 0 ? state.cx : state.cz, h = Math.floor(hc + (mx - W / 2) / z);
      var y = Math.floor(dv().cy + (H / 2 - my) / z), line = Math.floor(state.axis === 0 ? state.cz : state.cx);
      return state.axis === 0 ? { x: h, y: y, z: line } : { x: line, y: y, z: h };
    }
    return { x: Math.floor(state.cx + (mx - W / 2) / z), z: Math.floor(state.cz + (my - H / 2) / z) };
  }

  function hover2D(mx, my) {
    var w = world(), p = screenToWorld(mx, my), d = dv(), id = -1, y = p.y;
    if (state.mode === 'top') {
      var s = w.peekSummary(p.x >> 4, p.z >> 4, d.yMax);
      if (s) { var i = ((p.z & 15) << 4) | (p.x & 15); id = s.topId[i]; y = s.topY[i]; if (id === 0) y = null; }
    } else if (state.mode === 'slice') {
      y = d.slice; id = w.peekBlock(p.x, y, p.z);
    } else {
      if (y < d.yMin || y > d.yMax) id = -1; else id = w.peekBlock(p.x, y, p.z);
    }
    showHover(p.x, y, p.z, id);
  }

  function showHover(x, y, z, id, biome) {
    var t = 'X ' + x + (y != null ? '　Y ' + y : '') + '　Z ' + z;
    if (id >= 0) t += '　' + WG.blockName(id);
    if (state.dim === 'overworld') {
      var b = biome != null && biome >= 0 ? biome : world().biomeAt(x, z);
      if (b >= 0) t += '　（' + WG.BIOMES[b].name + '）';
    }
    $('hover').textContent = t;
  }

  function setProgress(t) { $('progress').textContent = t; }

  // ---------------- 3D ----------------
  var b3 = null, b3Token = 0, lastVolKey = '', lastDone = '';

  function start3D() {
    if (!view3d) {
      view3d = new WG.View3D(c3d);
      if (!view3d.ok) { setProgress('この環境では WebGL が使えないため、立体表示はできません'); return; }
    }
    if (!view3d.ok) return;
    jobToken++;
    var w = world(), d = dv(), S = state.size3d;
    var x0 = Math.round((state.cx - S / 2) / 16) * 16, z0 = Math.round((state.cz - S / 2) / 16) * 16;
    var yMin = Math.max(w.minY, d.yMin), yMax = Math.min(w.maxY, d.yMax);
    if (yMax < yMin) { setProgress('上端が下端より下になっています'); return; }
    var key = [state.seed, state.dim, x0, z0, S, yMin, yMax].join('|');
    if (key === lastVolKey && view3d.vol && !b3) { view3d.render(); setProgress(lastDone); return; }
    var keepCam = lastVolKey && lastVolKey.split('|')[1] === state.dim && lastVolKey.split('|')[4] === String(S);
    lastVolKey = key;
    var tok = ++b3Token;
    view3d.clear();
    var vol = new WG.Volume(w, x0, z0, S, yMin, yMax);
    var n = S / 16, list = [];
    for (var a = 0; a < n; a++) for (var b = 0; b < n; b++) list.push([a, b, Math.abs(a - n / 2 + 0.5) + Math.abs(b - n / 2 + 0.5)]);
    list.sort(function (p, q) { return p[2] - q[2]; });
    b3 = { tok: tok, w: w, vol: vol, list: list, i: 0, phase: 0, keepCam: keepCam, t0: performance.now(), g0: w.genCount, gt0: w.genTime };
    view3d.setVolume(vol, w.dim.palette, keepCam);
    view3d.render();
    requestAnimationFrame(pump3D);
  }

  function surfaceY(vol) {
    var sum = 0, cnt = 0, OPQ = WG.OPAQUE;
    for (var vz = 1; vz <= vol.size; vz += 4) for (var vx = 1; vx <= vol.size; vx += 4) {
      for (var vy = vol.ny; vy >= 1; vy--) {
        var id = vol.v[(vy * vol.sz + vz) * vol.sx + vx];
        if (OPQ[id] || id === WG.B.WATER) { sum += vy; cnt++; break; }
      }
    }
    return vol.yMin + (cnt ? sum / cnt : vol.ny / 2) - 1;
  }

  function pump3D() {
    if (!b3 || b3.tok !== b3Token) return;
    var t0 = performance.now(), vol = b3.vol, it;
    if (b3.phase === 0) {
      while (b3.i < b3.list.length && performance.now() - t0 < 30) {
        it = b3.list[b3.i++];
        vol.fillChunk(b3.w.chunk((vol.x0 >> 4) + it[0], (vol.z0 >> 4) + it[1]));
      }
      setProgress('生成中 ' + b3.i + ' / ' + b3.list.length + ' チャンク');
      if (b3.i >= b3.list.length) {
        b3.phase = 1; b3.i = 0;
        b3.gen = { n: b3.w.genCount - b3.g0, t: b3.w.genTime - b3.gt0 };
        view3d.focus(surfaceY(vol));
      }
    } else {
      while (b3.i < b3.list.length && performance.now() - t0 < 30) {
        it = b3.list[b3.i++];
        view3d.upload(WG.meshPart(vol, 1 + it[0] * 16, 1 + it[1] * 16, 17 + it[0] * 16, 17 + it[1] * 16));
      }
      view3d.render();
      setProgress('面を作成中 ' + b3.i + ' / ' + b3.list.length);
      if (b3.i >= b3.list.length) {
        var g = b3.gen;
        lastDone = vol.size + '×' + vol.size + '×' + vol.ny + ' ブロック' + (g.n ? '　新規生成 ' + g.n + ' チャンク（平均 ' + (g.t / g.n).toFixed(1) + ' ms）' : '') +
          '　' + Math.round(performance.now() - b3.t0) + ' ms';
        setProgress(lastDone);
        b3 = null;
        return;
      }
    }
    requestAnimationFrame(pump3D);
  }

  // ---------------- 画面の状態 ----------------
  var raf = 0;
  function refresh() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      if (state.mode !== 'walk') stopWalk();
      if (state.mode === 'walk') startWalk();
      else if (state.mode === '3d') start3D(); else start2D();
    });
  }

  // ---------------- 歩く・遊ぶ（パソコン版のみ） ----------------
  var DESKTOP = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var game = null, walker = null, walkKey = '', walkEdits = 0, gameMode = 'survival';
  // 持ち物・体力は、表示や次元を切り替えても残す（シードを変えたときだけ新しくする）
  var player = new WG.Player();
  function locked() { return document.pointerLockElement === c3d; }
  var toastTimer = 0;

  var gameUI = {
    locked: locked,
    lock: lockPointer,
    unlock: function () { if (locked()) document.exitPointerLock(); },
    status: walkStatus,
    hurt: function () { var h = $('hurt'); h.classList.remove('on'); void h.offsetWidth; h.classList.add('on'); },
    hud: $('hud'), hotbar: $('hotbar'), hearts: $('hearts'), air: $('air'), food: $('food'), itemName: $('itemName'),
    toast: function (t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('on'); }, 2600); },
    sleep: function (k) { $('sleepFade').style.opacity = k * 0.92; },
    inv: $('inv'), invTitle: $('invTitle'), invBody: $('invBody'), cursor: $('cursorItem'), dead: $('dead')
  };

  function startWalk() {
    if (!view3d) view3d = new WG.View3D(c3d);
    if (!view3d.ok) { setProgress('この環境では WebGL が使えないため、歩くことはできません'); return; }
    var key = state.seed + '|' + state.dim;
    if (game && walkKey === key) {
      // 同じ世界で中心が変わったら、その場所へ移る
      if (Math.floor(walker.spawnCenter[0]) !== Math.floor(state.cx) || Math.floor(walker.spawnCenter[1]) !== Math.floor(state.cz)) {
        walker.spawnCenter = [state.cx, state.cz];
        walker.spawn(state.cx, state.cz);
      }
      return;
    }
    stopWalk();
    jobToken++; b3Token++; b3 = null;
    view3d.clear(); lastVolKey = '';
    view3d.palette = world().dim.palette;
    walkKey = key;
    walkEdits = world().editCount;
    game = new WG.Game(view3d, world(), gameUI, player);
    game.mode = gameMode;
    walker = game.walker;
    walker.spawnCenter = [state.cx, state.cz];
    game.start(state.cx, state.cz);
    updateWalkCard();
  }

  function stopWalk() {
    if (!game) return;
    // 歩いた先を、ほかの表示の中心にする
    state.cx = Math.round(walker.pos[0]); state.cz = Math.round(walker.pos[2]);
    $('cx').value = state.cx; $('cz').value = state.cz;
    // ブロックを置いた・壊したなら、地図の絵を作り直す
    if (world().editCount !== walkEdits) { tileCache.clear(); texCache.clear(); }
    game.stop();
    game = null; walker = null; walkKey = ''; lastVolKey = '';
    if (locked()) document.exitPointerLock();
    updateWalkCard();
  }

  function walkStatus(w, pending) {
    var p = w.pos, t = 'X ' + p[0].toFixed(1) + '　Y ' + p[1].toFixed(1) + '　Z ' + p[2].toFixed(1) + '　' + w.facing() + '向き';
    if (state.dim === 'overworld') t += '　（' + WG.BIOMES[world().biomeAt(Math.floor(p[0]), Math.floor(p[2]))].name + '）';
    if (w.flying) t += '　飛行中';
    var tt = game ? game.timeText() : '';
    if (tt) { t += '　' + tt; $('timeNow').textContent = tt; }
    $('hover').textContent = t;
    var mt = game && game.mobs.target, r;
    if (mt) { var T = WG.MOB_TYPES[mt.mob.type]; r = '照準: ' + T.name + '（体力 ' + Math.max(0, Math.ceil(mt.mob.hp)) + ' / ' + T.hp + '）'; }
    else r = w.ready ? (w.target ? '照準: ' + WG.blockName(w.target.id) + '（' + w.target.x + ', ' + w.target.y + ', ' + w.target.z + '）' : '') : '読み込み中';
    if (pending) r += (r ? '　' : '') + '残り ' + pending + ' チャンク';
    setProgress(r);
    if (!w.ready !== walkLoading) { walkLoading = !w.ready; updateWalkCard(); }
  }
  var walkLoading = false;

  function updateWalkCard() {
    var on = state.mode === 'walk' && !!game, busy = on && (game.invOpen || game.dead);
    $('cross').classList.toggle('hide', !(on && locked()));
    $('walkCard').classList.toggle('hide', !on || locked() || busy);
    $('wcTitle').textContent = walkLoading ? '読み込み中…' : 'クリックして遊ぶ';
  }

  function lockPointer() {
    if (!game || locked() || game.dead || game.invOpen) return;
    try {
      var r = c3d.requestPointerLock();
      if (r && r.catch) r.catch(function () { updateWalkCard(); });
    } catch (e) { updateWalkCard(); }
  }
  $('walkCard').addEventListener('click', lockPointer);
  $('respawn').addEventListener('click', function () { if (game) game.respawn(); });
  $('times').addEventListener('click', function (e) {
    var t = e.target.dataset && e.target.dataset.t;
    if (t != null && game) game.setTime(+t);
  });
  $('modesGame').addEventListener('click', function (e) {
    var v = e.target.dataset && e.target.dataset.v;
    if (!v) return;
    gameMode = v;
    if (game) game.setMode(v);
    syncUI();
  });
  document.addEventListener('pointerlockchange', function () {
    if (!locked() && walker) { walker.releaseKeys(); game.mouseL = game.mouseR = false; }
    updateWalkCard();
  });
  document.addEventListener('mousemove', function (e) {
    if (walker && locked()) walker.look(e.movementX || 0, e.movementY || 0);
    var cur = $('cursorItem');
    if (game && game.invOpen) { cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px'; }
  });
  document.addEventListener('mousedown', function (e) {
    if (game && locked()) { e.preventDefault(); game.mouse(e.button, true); }
  });
  document.addEventListener('mouseup', function (e) {
    if (game) game.mouse(e.button, false);
  });
  document.addEventListener('contextmenu', function (e) { if (game && (locked() || game.invOpen)) e.preventDefault(); });
  document.addEventListener('wheel', function (e) {
    if (game && locked()) { e.preventDefault(); game.wheel(e.deltaY); }
  }, { passive: false });
  $('invBody').addEventListener('mousedown', function (e) {
    var el = e.target.closest('.slot');
    if (!el || !game) return;
    e.preventDefault();
    game.clickSlot(el, e.button, e.shiftKey);
  });
  var GAME_KEYS = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, Space: 1, ShiftLeft: 1, ShiftRight: 1, ControlLeft: 1, ControlRight: 1 };
  document.addEventListener('keydown', function (e) {
    if (!game || state.mode !== 'walk') return;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && !locked()) return;
    if (game.key(e, true)) { e.preventDefault(); updateWalkCard(); return; }
    if (!locked()) return;
    if (GAME_KEYS[e.code]) { e.preventDefault(); walker.key(e.code, true, e.repeat); }
  });
  document.addEventListener('keyup', function (e) {
    if (!walker) return;
    if (GAME_KEYS[e.code]) { e.preventDefault(); walker.key(e.code, false, false); }
  });
  window.addEventListener('blur', function () { if (walker) walker.releaseKeys(); if (game) game.mouseL = game.mouseR = false; });
  // 遊んでいる間に Ctrl＋W などでページを閉じかけたときは確認する
  window.addEventListener('beforeunload', function (e) {
    if (game && (locked() || world().editCount !== walkEdits)) { e.preventDefault(); e.returnValue = ''; }
  });

  function syncUI() {
    var d = dv(), w = world();
    [].forEach.call($('dims').children, function (b) { b.classList.toggle('on', b.dataset.v === state.dim); });
    [].forEach.call($('modes').children, function (b) { b.classList.toggle('on', b.dataset.v === state.mode); });
    [].forEach.call($('axes').children, function (b) { b.classList.toggle('on', +b.dataset.v === state.axis); });
    $('g-slice').classList.toggle('hide', state.mode !== 'slice');
    $('g-axis').classList.toggle('hide', state.mode !== 'section');
    var walk = state.mode === 'walk';
    $('g-zoom').classList.toggle('hide', state.mode === '3d' || walk);
    $('g-size').classList.toggle('hide', state.mode !== '3d');
    $('g-pad').classList.toggle('hide', walk);
    $('g-range').classList.toggle('hide', walk);
    $('walkBtn').classList.toggle('hide', !DESKTOP);
    $('g-game').classList.toggle('hide', !walk);
    $('g-time').classList.toggle('hide', !walk || state.dim !== 'overworld');
    [].forEach.call($('modesGame').children, function (b) { b.classList.toggle('on', b.dataset.v === gameMode); });
    c2d.classList.toggle('hide', state.mode === '3d' || walk);
    c3d.classList.toggle('hide', state.mode !== '3d' && !walk);
    updateWalkCard();
    var sl = $('sliceY');
    sl.min = w.minY; sl.max = w.maxY; sl.value = d.slice;
    $('sliceYv').textContent = d.slice;
    $('zoom').value = state.zoom;
    $('zoomv').textContent = '×' + ZOOMS[state.zoom];
    $('cx').value = Math.round(state.cx); $('cz').value = Math.round(state.cz);
    $('yMin').value = d.yMin; $('yMax').value = d.yMax;
    $('yMin').min = $('yMax').min = w.minY; $('yMin').max = $('yMax').max = w.maxY;
    $('size3d').value = String(state.size3d);
    $('help').innerHTML = HELP[state.mode];
  }

  var HELP = {
    top: 'ドラッグで移動、ホイールで拡大縮小。<br>上端の高さから下へ見て、最初に当たるブロックを描きます。陰影は北西からの光です。',
    slice: 'ドラッグで移動、ホイールで拡大縮小。<br>指定した高さのブロックを描きます。空気の場所は、その下にあるものを暗く描きます。',
    section: 'ドラッグで移動、ホイールで拡大縮小。<br>表示範囲の中心を通る線で縦に切ります。上下は「表示範囲の上下」で決まります。',
    walk: '画面をクリックすると遊べます（パソコンのみ）。操作は Minecraft と同じです。<br>サバイバルは掘るのに時間がかかり、ドロップを拾って使います。クリエイティブはすぐ壊せて、E の一覧からどのブロックでも取り出せ、スペースの 2 度押しで飛べます。<br>表示範囲の中心を変えて「移動」を押すと、その場所へ移ります。',
    '3d': '左ドラッグで回転、右ドラッグか Shift＋ドラッグで平行移動、ホイールで拡大縮小。<br>上端より上は空気として扱い、下端と四方は切り口を見せます。中心を変えると作り直します。'
  };

  function clampY(v) { var w = world(); return Math.max(w.minY, Math.min(w.maxY, v | 0)); }

  // ---------------- 入力 ----------------
  $('apply').onclick = function () {
    state.seed = $('seed').value.trim() || '0';
    stopWalk();
    player = new WG.Player();
    tileCache.clear(); texCache.clear(); lastVolKey = '';
    syncUI(); refresh();
  };
  $('seed').onkeydown = function (e) { if (e.key === 'Enter') $('apply').onclick(); };
  $('dims').onclick = function (e) {
    var v = e.target.dataset && e.target.dataset.v;
    if (!v || v === state.dim) return;
    state.dim = v; syncUI(); refresh();
  };
  $('modes').onclick = function (e) {
    var v = e.target.dataset && e.target.dataset.v;
    if (!v) return;
    state.mode = v; syncUI(); refresh();
  };
  $('axes').onclick = function (e) {
    var v = e.target.dataset && e.target.dataset.v;
    if (v == null) return;
    state.axis = +v; syncUI(); refresh();
  };
  $('sliceY').oninput = function () { dv().slice = +this.value; $('sliceYv').textContent = this.value; refresh(); };
  $('zoom').oninput = function () { state.zoom = +this.value; $('zoomv').textContent = '×' + ZOOMS[state.zoom]; refresh(); };
  $('size3d').onchange = function () { state.size3d = +this.value; refresh(); };
  $('go').onclick = function () { state.cx = +$('cx').value || 0; state.cz = +$('cz').value || 0; refresh(); };
  $('origin').onclick = function () { state.cx = 0; state.cz = 0; syncUI(); refresh(); };
  [$('cx'), $('cz')].forEach(function (el) { el.onkeydown = function (e) { if (e.key === 'Enter') $('go').onclick(); }; });
  [].forEach.call(document.querySelectorAll('.pad button'), function (b) {
    b.onclick = function () {
      var m = b.dataset.m.split(',').map(Number);
      var step = state.mode === '3d' ? state.size3d / 2 : Math.max(16, Math.round(c2d.clientWidth / ZOOMS[state.zoom] / 4));
      if (state.mode === 'section') {
        if (state.axis === 0) { state.cx += m[0] * step; state.cz += m[1] * 4; }
        else { state.cz += m[1] * step; state.cx += m[0] * 4; }
      } else { state.cx += m[0] * step; state.cz += m[1] * step; }
      syncUI(); refresh();
    };
  });
  function onY() {
    var d = dv(), a = clampY(+$('yMin').value), b = clampY(+$('yMax').value);
    if (b < a) { var t = a; a = b; b = t; }
    d.yMin = a; d.yMax = b; d.cy = (a + b) / 2;
    syncUI(); refresh();
  }
  $('yMin').onchange = onY; $('yMax').onchange = onY;

  $('png').onclick = function () {
    var cv = state.mode === '3d' || state.mode === 'walk' ? c3d : c2d;
    if ((state.mode === '3d' || state.mode === 'walk') && view3d) view3d.render();
    cv.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'world_' + state.seed + '_' + state.dim + '_' + state.mode + '_' + Math.round(state.cx) + '_' + Math.round(state.cz) + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, 'image/png');
  };

  // 2D：ドラッグで移動、ホイールで拡大
  var drag = null;
  c2d.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY, cx: state.cx, cz: state.cz, cy: dv().cy };
    c2d.setPointerCapture(e.pointerId); c2d.classList.add('drag');
  });
  c2d.addEventListener('pointermove', function (e) {
    var r = c2d.getBoundingClientRect();
    if (drag) {
      var z = ZOOMS[state.zoom], dx = (e.clientX - drag.x) / z, dy = (e.clientY - drag.y) / z;
      if (state.mode === 'section') {
        if (state.axis === 0) state.cx = drag.cx - dx; else state.cz = drag.cz - dx;
        dv().cy = drag.cy + dy;
      } else { state.cx = drag.cx - dx; state.cz = drag.cz - dy; }
      $('cx').value = Math.round(state.cx); $('cz').value = Math.round(state.cz);
      refresh();
    }
    hover2D(e.clientX - r.left, e.clientY - r.top);
  });
  function endDrag() { drag = null; c2d.classList.remove('drag'); }
  c2d.addEventListener('pointerup', endDrag);
  c2d.addEventListener('pointercancel', endDrag);
  c2d.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = c2d.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    var W = c2d.clientWidth, H = c2d.clientHeight, z0 = ZOOMS[state.zoom];
    var nz = Math.max(0, Math.min(ZOOMS.length - 1, state.zoom + (e.deltaY < 0 ? 1 : -1)));
    if (nz === state.zoom) return;
    var z1 = ZOOMS[nz], k = 1 / z0 - 1 / z1;
    if (state.mode === 'section') {
      if (state.axis === 0) state.cx += (mx - W / 2) * k; else state.cz += (mx - W / 2) * k;
      dv().cy -= (my - H / 2) * k;
    } else { state.cx += (mx - W / 2) * k; state.cz += (my - H / 2) * k; }
    state.zoom = nz; syncUI(); refresh();
  }, { passive: false });

  // 3D：回転・平行移動・拡大。ドラッグ中は解像度を下げる。
  var d3 = null;
  c3d.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  c3d.addEventListener('pointerdown', function (e) {
    if (state.mode === 'walk') { lockPointer(); return; }
    if (!view3d || !view3d.ok) return;
    d3 = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey };
    c3d.setPointerCapture(e.pointerId); c3d.classList.add('drag');
    view3d.res = 0.5; view3d.render();
  });
  var hoverRaf = 0, hoverPos = null;
  c3d.addEventListener('pointermove', function (e) {
    if (state.mode === 'walk' || !view3d || !view3d.ok) return;
    if (d3) {
      var dx = e.clientX - d3.x, dy = e.clientY - d3.y;
      d3.x = e.clientX; d3.y = e.clientY;
      if (d3.pan) {
        var s = view3d.dist / c3d.clientHeight * 0.9, cy = Math.cos(view3d.yaw), sy = Math.sin(view3d.yaw);
        // 画面の右方向 (cos, -sin)、奥方向 (-sin, -cos)
        view3d.target[0] += (-cy * dx - sy * dy) * s;
        view3d.target[2] += (sy * dx - cy * dy) * s;
      } else {
        view3d.yaw -= dx * 0.008;
        view3d.pitch = Math.max(-1.45, Math.min(1.5, view3d.pitch + dy * 0.008));
      }
      view3d.render();
      return;
    }
    var r = c3d.getBoundingClientRect();
    hoverPos = [e.clientX - r.left, e.clientY - r.top];
    if (!hoverRaf) hoverRaf = requestAnimationFrame(function () {
      hoverRaf = 0;
      var h = view3d.pick(hoverPos[0], hoverPos[1]);
      if (h) showHover(h.x, h.y, h.z, h.id, h.biome); else $('hover').textContent = ' ';
    });
  });
  function end3D() {
    if (!d3) return;
    d3 = null; c3d.classList.remove('drag');
    view3d.res = 1; view3d.render();
  }
  c3d.addEventListener('pointerup', end3D);
  c3d.addEventListener('pointercancel', end3D);
  c3d.addEventListener('wheel', function (e) {
    e.preventDefault();
    if (state.mode === 'walk' || !view3d || !view3d.ok) return;
    view3d.dist = Math.max(8, Math.min(1200, view3d.dist * Math.pow(1.0015, e.deltaY)));
    view3d.render();
  }, { passive: false });

  window.addEventListener('resize', function () {
    if (state.mode === 'walk') return;
    if (state.mode === '3d') { if (view3d && view3d.ok) view3d.render(); } else refresh();
  });

  syncUI();
  refresh();
})();
