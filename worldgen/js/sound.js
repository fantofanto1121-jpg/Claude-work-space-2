// 音：足音・ブロックを掘る／壊す／置く音・生き物の声・ダメージ・爆発・扉・アイテムを拾う音など。
// 音のファイルは使わず、Web Audio で雑音と音の高さを組み合わせてその場で作る（独自の音。本家の音ではない）。
// 聞こえ方：遠いほど小さく（16 ブロック、爆発は 48 ブロック）、左右は向きで振り分ける。画面の「音」で切り替える。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var B = WG.B, ctx = null, noise = null, master = null;
  var S = WG.Sound = { enabled: true, volume: 0.6, listener: { pos: [0, 0, 0], yaw: 0 }, last: '' };
  try { var sv = G.localStorage && G.localStorage.getItem('wg-sound'); if (sv === 'off') S.enabled = false; } catch (e) { /* 保存できない環境 */ }

  function ac() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    if (typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return null;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = S.volume; master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var d = noise.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    return ctx;
  }
  S.setEnabled = function (on) {
    S.enabled = !!on;
    try { G.localStorage && G.localStorage.setItem('wg-sound', on ? 'on' : 'off'); } catch (e) { /* 保存できない環境 */ }
  };

  // ---- 部品：出口（音量と左右）、雑音、音の高さ ----
  function out(vol, pan) {
    var g = ctx.createGain(); g.gain.value = vol;
    if (ctx.createStereoPanner) { var p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(master); }
    else g.connect(master);
    return g;
  }
  // 雑音を、フィルター（種類・周波数・Q）に通し、エンベロープ（立ち上がり a、長さ len）で鳴らす
  function burst(dst, t, len, type, freq, q, a, peak, freq2) {
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise; f.type = type; f.frequency.setValueAtTime(freq, t); if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + len);
    f.Q.value = q || 1;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak || 1, t + (a || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f); f.connect(g); g.connect(dst);
    src.start(t, Math.random() * 1.5, len + 0.05);
  }
  // 音の高さ（波形、周波数 f0 → f1、長さ、強さ、ビブラート）
  function tone(dst, t, len, wave, f0, f1, peak, vib, filt) {
    var o = ctx.createOscillator(), g = ctx.createGain(), node = o;
    o.type = wave; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + len);
    if (vib) { var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = vib[0]; lg.gain.value = vib[1]; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + len + 0.05); }
    if (filt) { var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt; f.Q.value = 2; o.connect(f); node = f; }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak || 0.5, t + Math.min(0.03, len / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    node.connect(g); g.connect(dst);
    o.start(t); o.stop(t + len + 0.05);
  }
  function rr(a, b) { return a + Math.random() * (b - a); }

  // ---- 素材ごとの音（足音・掘る・壊す・置く） ----
  var MAT = {};
  function matOf(id) {
    if (MAT[id]) return MAT[id];
    var k = WG.BLOCKS[id] ? WG.BLOCKS[id].key : '', kind = WG.blockKind ? WG.blockKind(id) : '', m = 'stone';
    if (/GRASS|DIRT|LEAVES|FARMLAND|CLAY|MUSHROOM|WHEAT|CARROT|POTATO|SUGAR_CANE|CACTUS|HAY|SLIME|DANDELION|POPPY|CHORUS|WART|COBWEB/.test(k) || kind === 'plant' || kind === 'crop') m = 'grass';
    else if (/SAND|SOUL/.test(k)) m = 'sand';
    else if (/GRAVEL/.test(k)) m = 'gravel';
    else if (/SNOW/.test(k)) m = 'snow';
    else if (/WOOL|BED/.test(k)) m = 'cloth';
    else if (/GLASS|ICE|GLOWSTONE|LAMP|PORTAL/.test(k)) m = 'glass';
    else if (/PLANKS|_LOG|DOOR_|FENCE|CHEST|CRAFTING|BOOKSHELF|LADDER|NOTE_BLOCK|DAYLIGHT|TORCH|_STAIRS_|_SLAB/.test(k) && !/IRON|COBBLE|STONE|BRICK|SANDSTONE/.test(k)) m = 'wood';
    else if (/IRON|GOLD_BLOCK|ANVIL|HOPPER|LANTERN|COPPER_BLOCK/.test(k)) m = 'metal';
    return (MAT[id] = m);
  }
  S.matOf = matOf;
  // what：'step' 'hit'（掘っている途中）'break' 'place'
  function blockSound(dst, t, m, what) {
    var big = what === 'break' || what === 'place', v = what === 'step' ? 0.35 : what === 'hit' ? 0.4 : 0.9, len = what === 'step' ? 0.09 : what === 'hit' ? 0.07 : 0.2;
    var p = rr(0.85, 1.15);
    if (m === 'grass') { burst(dst, t, len * 1.3, 'lowpass', 1500 * p, 0.7, 0.01, v); if (big) burst(dst, t + 0.04, len, 'bandpass', 700 * p, 1, 0.01, v * 0.6); }
    else if (m === 'sand') burst(dst, t, len * 1.4, 'highpass', 2500 * p, 0.6, 0.02, v * 0.6);
    else if (m === 'gravel') { for (var i = 0; i < (big ? 6 : 3); i++) burst(dst, t + i * 0.022, 0.03, 'bandpass', rr(900, 2200), 2, 0.002, v * 0.9); }
    else if (m === 'snow') burst(dst, t, len * 1.5, 'bandpass', 3500 * p, 0.8, 0.03, v * 0.5);
    else if (m === 'cloth') burst(dst, t, len * 1.2, 'lowpass', 600 * p, 0.6, 0.02, v * 0.7);
    else if (m === 'wood') { burst(dst, t, len, 'bandpass', 450 * p, 3, 0.002, v * 1.4); tone(dst, t, len * 0.9, 'triangle', 190 * p, 150 * p, v * 0.25); }
    else if (m === 'glass') {
      if (what === 'break') { burst(dst, t, 0.3, 'highpass', 3000, 1, 0.002, v); for (var j = 0; j < 4; j++) tone(dst, t + j * 0.03, 0.25, 'sine', rr(2200, 4200), null, 0.12); }
      else burst(dst, t, len, 'bandpass', 2600 * p, 4, 0.002, v);
    } else if (m === 'metal') { burst(dst, t, len * 0.6, 'bandpass', 1800 * p, 2, 0.002, v); tone(dst, t, big ? 0.4 : 0.12, 'square', 620 * p, 600 * p, v * 0.08); tone(dst, t, big ? 0.5 : 0.15, 'sine', 1430 * p, null, v * 0.12); }
    else { burst(dst, t, len, 'bandpass', 1100 * p, 1.4, 0.002, v * 1.2); burst(dst, t, len * 0.5, 'lowpass', 300 * p, 1, 0.002, v * 0.8); }
  }

  // ---- 生き物の声（大まかな似せ方。高さは毎回少し変える） ----
  function voice(dst, t, type, hurt) {
    var p = rr(0.9, 1.1) * (hurt ? 1.25 : 1);
    switch (type) {
      case 'PIG': tone(dst, t, 0.12, 'sawtooth', 260 * p, 190 * p, 0.35, null, 900); tone(dst, t + 0.16, 0.14, 'sawtooth', 240 * p, 170 * p, 0.35, null, 900); break;
      case 'COW': tone(dst, t, hurt ? 0.4 : 0.9, 'sawtooth', 120 * p, 95 * p, 0.45, [5, 4], 700); break;
      case 'SHEEP': tone(dst, t, hurt ? 0.3 : 0.6, 'sawtooth', 330 * p, 300 * p, 0.3, [24, 18], 1500); break;
      case 'CHICKEN': for (var i = 0; i < 2; i++) tone(dst, t + i * 0.09, 0.06, 'square', 1100 * p, 700 * p, 0.12, null, 2500); break;
      case 'RABBIT': tone(dst, t, 0.05, 'sine', 1600 * p, 1200 * p, 0.1); break;
      case 'WOLF': if (hurt) tone(dst, t, 0.25, 'sawtooth', 900 * p, 500 * p, 0.25, null, 2000); else { tone(dst, t, 0.1, 'sawtooth', 420 * p, 260 * p, 0.4, null, 1400); tone(dst, t + 0.16, 0.1, 'sawtooth', 420 * p, 260 * p, 0.35, null, 1400); } break;
      case 'VILLAGER': tone(dst, t, 0.32, 'sawtooth', 230 * p, hurt ? 300 * p : 170 * p, 0.35, [7, 6], 800); break;
      case 'ZOMBIE': tone(dst, t, 0.9, 'sawtooth', 95 * p, 70 * p, 0.45, [6, 6], 500); burst(dst, t, 0.6, 'lowpass', 400, 1, 0.1, 0.15); break;
      case 'SKELETON': for (var j = 0; j < 4; j++) burst(dst, t + j * 0.05 + rr(0, 0.02), 0.03, 'bandpass', rr(1500, 2500), 5, 0.001, 0.6); break;
      case 'SPIDER': case 'CAVE_SPIDER': burst(dst, t, 0.4, 'highpass', 3000 * p, 0.7, 0.05, 0.35); break;
      case 'BOMBER': burst(dst, t, 0.35, 'bandpass', 700 * p, 2, 0.05, 0.3, 300); break;
      case 'SLIME': case 'MAGMA_SLIME': tone(dst, t, 0.12, 'sine', 180 * p, 60 * p, 0.5); burst(dst, t, 0.1, 'lowpass', 600, 1, 0.005, 0.3); break;
      case 'VINDICATOR': tone(dst, t, 0.22, 'sawtooth', 190 * p, 150 * p, 0.3, [7, 8], 1100); break;
      case 'EVOKER': tone(dst, t, 0.5, 'sawtooth', 240 * p, 300 * p, 0.25, [5, 12], 1400); tone(dst, t + 0.1, 0.4, 'triangle', 480 * p, 520 * p, 0.12); break;
      case 'VEX': for (var vq = 0; vq < 3; vq++) tone(dst, t + vq * 0.07, 0.06, 'triangle', 1500 * p + vq * 120, 1300 * p, 0.1); break;
      case 'WITCH': for (var k = 0; k < 3; k++) tone(dst, t + k * 0.1, 0.08, 'sawtooth', 520 * p + k * 30, 480 * p, 0.2, null, 1800); break;
      case 'BAT': tone(dst, t, 0.04, 'sine', 3800 * p, 3200 * p, 0.08); break;
      case 'SQUID': burst(dst, t, 0.3, 'lowpass', 500, 1, 0.05, 0.15); break;
      default: burst(dst, t, 0.15, 'lowpass', 800, 1, 0.01, 0.3);
    }
  }

  // ---- 鳴らす：name と、鳴る場所（なければ自分） ----
  S.play = function (name, x, y, z, arg) {
    if (!S.enabled || typeof window === 'undefined') return;
    var c = ac();
    if (!c) return;
    var L = S.listener, dx = x == null ? 0 : x - L.pos[0], dy = y == null ? 0 : y - L.pos[1] - 1.6, dz = z == null ? 0 : z - L.pos[2];
    var d = Math.hypot(dx, dy, dz), range = name === 'explode' ? 48 : name === 'step' ? 12 : 16;
    if (d > range) return;
    var vol = Math.pow(1 - d / range, 1.5), pan = 0;
    if (d > 0.5) { var rx = Math.cos(L.yaw), rz = -Math.sin(L.yaw); pan = Math.max(-0.8, Math.min(0.8, (dx * rx + dz * rz) / d)); }
    var t = c.currentTime + 0.005, dst = out(vol, pan);
    switch (name) {
      case 'step': case 'hit': case 'break': case 'place': blockSound(dst, t, arg || 'stone', name); break;
      case 'mob': voice(dst, t, arg, false); break;
      case 'mobhurt': voice(dst, t, arg, true); burst(dst, t, 0.08, 'lowpass', 900, 1, 0.002, 0.5); break;
      case 'hurt': tone(dst, t, 0.18, 'sawtooth', 210, 140, 0.35, null, 900); burst(dst, t, 0.1, 'lowpass', 700, 1, 0.002, 0.6); break;
      case 'explode': burst(dst, t, 1.4, 'lowpass', 900, 0.8, 0.005, 1.2, 80); tone(dst, t, 0.6, 'sine', 70, 35, 0.9); break;
      case 'door': burst(dst, t, 0.18, 'bandpass', 320, 4, 0.01, 0.9); tone(dst, t + 0.12, 0.06, 'triangle', 160, 120, 0.3); break;
      case 'piston': burst(dst, t, 0.12, 'bandpass', 520, 3, 0.005, 0.8); tone(dst, t, 0.08, 'square', 110, 70, 0.18); break;
      case 'click': tone(dst, t, 0.03, 'square', 900, 600, 0.15); break;
      case 'pop': tone(dst, t, 0.08, 'sine', rr(700, 900), rr(1300, 1600), 0.2); break;
      case 'orb': tone(dst, t, 0.25, 'sine', rr(1400, 2200), null, 0.08); break;
      case 'eat': for (var i = 0; i < 3; i++) burst(dst, t + i * 0.09, 0.06, 'bandpass', rr(900, 1600), 2, 0.003, 0.5); break;
      case 'drink': for (var j = 0; j < 3; j++) tone(dst, t + j * 0.12, 0.08, 'sine', rr(300, 380), rr(500, 600), 0.2); break;
      case 'splash': burst(dst, t, 0.4, 'bandpass', 1400, 0.8, 0.01, 0.7, 500); break;
      case 'ignite': burst(dst, t, 0.05, 'highpass', 4000, 1, 0.001, 0.7); burst(dst, t + 0.03, 0.3, 'lowpass', 1200, 1, 0.05, 0.3); break;
      case 'portal': tone(dst, t, 1.2, 'sawtooth', 90, 140, 0.15, [3, 10], 500); burst(dst, t, 1.2, 'bandpass', 600, 2, 0.4, 0.3, 1400); break;
      case 'trade': voice(dst, t, 'VILLAGER', false); tone(dst, t + 0.2, 0.2, 'sine', 1800, null, 0.06); break;
      case 'bow': tone(dst, t, 0.12, 'triangle', 300, 180, 0.4); burst(dst, t, 0.1, 'highpass', 2000, 1, 0.002, 0.3); break;
      case 'firework': burst(dst, t, 0.12, 'lowpass', 1200, 1, 0.002, 0.8); for (var f = 0; f < 10; f++) burst(dst, t + 0.15 + f * 0.04 + Math.random() * 0.05, 0.03, 'highpass', 4000, 1, 0.001, 0.4); break;
      case 'levelup': [523, 659, 784].forEach(function (f, n) { tone(dst, t + n * 0.08, 0.25, 'triangle', f, null, 0.2); }); break;
      // 雷：近いと鋭く裂ける音、遠いと低くうなる音
      case 'thunder':
        var near = arg == null ? 1 : arg;
        if (near > 0.5) burst(dst, t, 0.35, 'highpass', 1800, 0.7, 0.002, 1.1 * near);
        burst(dst, t + 0.05, 3.2, 'lowpass', 420 + near * 500, 0.8, 0.08, 1.3, 60); burst(dst, t + 0.6, 2.6, 'lowpass', 260, 0.9, 0.3, 0.9, 50); tone(dst, t, 2.4, 'sine', 52, 34, 0.6); break;
      // スカルクシュリーカー：かすれた高い叫び。エヴォーカーの牙：かみ合う音
      case 'shriek': burst(dst, t, 1.2, 'bandpass', 2400, 6, 0.08, 0.8, 1200); tone(dst, t, 1.1, 'sawtooth', 880, 620, 0.12, [9, 30], 2600); break;
      case 'fangs': burst(dst, t, 0.08, 'bandpass', 900, 3, 0.002, 0.8); tone(dst, t, 0.1, 'square', 220, 120, 0.15, null, 800); break;
      // 襲撃の角笛（低く長い 3 音）、風の弾
      case 'raidhorn': [0, 0.9, 1.8].forEach(function (d, n) { tone(dst, t + d, 1.0, 'sawtooth', n === 2 ? 147 : 165, n === 2 ? 139 : 156, 0.4, [4, 4], 700); tone(dst, t + d, 1.0, 'sine', 82, 78, 0.3); }); break;
      case 'wind': burst(dst, t, 0.5, 'bandpass', 900, 1.5, 0.01, 1, 2400); burst(dst, t, 0.2, 'lowpass', 300, 1, 0.005, 0.6); break;
      // ヤギの角笛：低い 2 本の音が揺れながら長く響く
      case 'horn': tone(dst, t, 2.4, 'sawtooth', 196, 185, 0.45, [4.5, 5], 820); tone(dst, t + 0.04, 2.3, 'sawtooth', 294, 277, 0.22, [4.5, 6], 1100); tone(dst, t, 2.4, 'sine', 98, 92, 0.3); break;
      // 不死のトーテム：きらめく上がり音と、ふわっとした息
      case 'totem': [523, 659, 784, 1047, 1319, 1568].forEach(function (f, n) { tone(dst, t + n * 0.06, 0.7, 'sine', f, f * 1.01, 0.16, [6, 4]); }); burst(dst, t, 0.9, 'bandpass', 1800, 0.7, 0.2, 0.35, 5200); break;
    }
  };

  // ---- 雨の音（ずっと鳴る雑音。屋根の下ではこもった音） ----
  var rainNode = null;
  S.setRain = function (level, muffled) {
    if (!S.enabled || typeof window === 'undefined') level = 0;
    if (!rainNode && level <= 0) return;
    var c = ac(); if (!c) return;
    if (!rainNode) {
      var src = c.createBufferSource(), hp = c.createBiquadFilter(), lp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = noise; src.loop = true; hp.type = 'highpass'; hp.frequency.value = 400; lp.type = 'lowpass'; lp.frequency.value = 6000; g.gain.value = 0;
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master); src.start();
      rainNode = { g: g, lp: lp };
    }
    var now = c.currentTime;
    rainNode.g.gain.setTargetAtTime(Math.max(0, level) * (muffled ? 0.16 : 0.24), now, 0.4);
    rainNode.lp.frequency.setTargetAtTime(muffled ? 900 : 6000, now, 0.4);
  };
  // ---- ジュークボックスの曲（このゲームのために作った旋律） ----
  // 音階の度数（0 が主音、音階の長さを超えると 1 オクターブ上）:拍。'-' は休み。bass は小節ごとの根音の度数。
  var SONGS = {
    MEADOW: { bpm: 108, root: 392, scale: [0, 2, 4, 7, 9], lead: 'triangle', bassWave: 'triangle', style: 'walk',
      mel: '2:1 3:1 4:2 3:1 2:1 1:2 0:1 1:1 2:1 4:1 3:4 2:1 3:1 4:1 5:1 6:2 5:2 4:1 3:1 2:1 1:1 2:4 ' +
           '5:1.5 4:.5 3:2 4:1.5 3:.5 2:2 1:1 2:1 3:1 1:1 0:4 2:1 4:1 5:1 7:1 6:2 4:2 3:1 2:1 1:1 2:1 0:4',
      bass: [0, 3, 0, 2, 0, 3, 3, 0, 3, 2, 1, 0, 0, 3, 2, 0] },
    DRIP: { bpm: 72, root: 220, scale: [0, 2, 3, 5, 7, 8, 10], lead: 'sine', bassWave: 'sine', style: 'drone', echo: true,
      mel: '4:1 -:1 7:.5 6:.5 4:1 2:2 -:1 0:1 3:1 4:1 5:1 4:.5 3:.5 2:3 -:1 4:1 -:.5 7:.5 9:1 8:1 7:2 4:2 5:1 4:1 2:1 1:1 0:3 -:1 ' +
           '7:1 9:1 11:2 10:1 9:1 7:2 8:1 7:1 5:1 4:1 2:4 4:.5 5:.5 7:1 4:1 2:1 3:2 1:2 -1:1 0:1 2:1 4:1 0:4',
      bass: [0, 5, 3, 4, 0, 5, 3, 4, 2, 5, 3, 4, 0, 3, 4, 0] },
    FORGE: { bpm: 128, root: 146.83, scale: [0, 1, 3, 5, 7, 8, 10], lead: 'square', bassWave: 'sawtooth', style: 'pulse', filt: 1400,
      mel: '0:.5 1:.5 0:.5 -:.5 3:1 4:1 5:.5 4:.5 3:.5 1:.5 0:2 7:.5 8:.5 7:.5 5:.5 4:1 3:1 1:2 0:2 ' +
           '0:.5 1:.5 3:.5 4:.5 5:1 7:1 8:1 7:.5 5:.5 4:2 3:.5 4:.5 5:.5 4:.5 3:1 1:1 0:4',
      bass: [0, 0, 5, 1, 0, 5, 3, 0] },
    STARS: { bpm: 60, root: 261.63, scale: [0, 2, 4, 6, 7, 9, 11], lead: 'sine', bassWave: 'sine', style: 'pad', vib: [5, 3], echo: true,
      mel: '4:2 6:2 7:3 6:1 4:2 2:2 3:4 4:2 6:2 9:3 8:1 7:2 6:1 4:1 4:4',
      bass: [0, 4, 5, 3, 0, 4, 5, 0] },
    MARKET: { bpm: 120, root: 293.66, scale: [0, 2, 4, 5, 7, 9, 10], lead: 'triangle', bassWave: 'triangle', style: 'bounce',
      mel: '0:.5 2:.5 4:.5 2:.5 4:1 5:1 4:.5 3:.5 2:1 0:2 6:.5 5:.5 4:.5 5:.5 6:1 4:1 3:2 1:2 ' +
           '0:.5 2:.5 4:.5 7:.5 6:1 4:1 5:.5 4:.5 3:.5 2:.5 1:2 4:.5 3:.5 2:.5 1:.5 0:1 -1:1 0:4',
      bass: [0, 0, 6, 3, 0, 3, 4, 0] }
  };
  S.SONGS = SONGS;
  function freqOf(song, d, oct) {
    var n = song.scale.length, o = Math.floor(d / n), i = d - o * n;
    return song.root * Math.pow(2, (song.scale[i] + 12 * (o + (oct || 0))) / 12);
  }
  function parseMel(str) { return str.trim().split(/\s+/).map(function (tk) { var p = tk.split(':'); return [p[0] === '-' ? null : +p[0], +p[1]]; }); }
  // 長さ（秒）：旋律 2 回分（2 回目は 3 度上の重ねを足す）
  S.songLength = function (key) { var s = SONGS[key]; return s ? s.bass.length * 4 * 60 / s.bpm * 2 + 1.5 : 0; };
  var ACTIVE = [];
  S.music = function (key, x, y, z) {
    var song = SONGS[key], dur = S.songLength(key), none = { dur: dur, stop: function () {} };
    if (!song || !S.enabled || typeof window === 'undefined') return none;
    var c = ac();
    if (!c) return none;
    var bus = c.createGain(); bus.gain.value = 0;
    var pan = c.createStereoPanner ? c.createStereoPanner() : null;
    if (pan) { bus.connect(pan); pan.connect(master); } else bus.connect(master);
    var dst = bus;
    if (song.echo) {
      var dl = c.createDelay(1), fb = c.createGain(), wet = c.createGain();
      dl.delayTime.value = 60 / song.bpm * 0.75; fb.gain.value = 0.32; wet.gain.value = 0.4;
      dst = c.createGain(); dst.connect(bus); dst.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(bus);
    }
    var beat = 60 / song.bpm, mel = parseMel(song.mel), t0 = c.currentTime + 0.15, bar = 4 * beat, pass;
    for (pass = 0; pass < 2; pass++) {
      var tp = t0 + pass * song.bass.length * bar, t = tp;
      mel.forEach(function (n) {
        if (n[0] != null) {
          var len = n[1] * beat, f = freqOf(song, n[0], 0), sus = song.style === 'pad' ? len * 1.1 : Math.max(0.12, len * 0.92);
          tone(dst, t, sus, song.lead, f, f, song.lead === 'square' ? 0.07 : 0.18, song.vib || null, song.filt || null);
          if (pass === 1) tone(dst, t, sus, 'sine', freqOf(song, n[0] + 2, 0), null, 0.06);   // 2 回目は 3 度上を重ねる
        }
        t += n[1] * beat;
      });
      song.bass.forEach(function (d, b) {
        var tb = tp + b * bar, r = freqOf(song, d, -2), fi = freqOf(song, d + 2, -2), q;
        if (song.style === 'pulse') for (q = 0; q < 8; q++) tone(dst, tb + q * beat / 2, beat * 0.4, song.bassWave, q % 4 === 3 ? fi : r, null, 0.09, null, 600);
        else if (song.style === 'bounce') for (q = 0; q < 4; q++) tone(dst, tb + q * beat, beat * 0.5, song.bassWave, q % 2 ? fi : r, null, 0.16);
        else if (song.style === 'pad') { [d, d + 2, d + 4].forEach(function (cd) { tone(dst, tb, bar * 1.05, 'sine', freqOf(song, cd, -1), null, 0.05, [0.3, 1.5]); }); tone(dst, tb, bar, 'sine', r, null, 0.12); }
        else if (song.style === 'drone') { tone(dst, tb, bar * 1.02, song.bassWave, r, null, 0.14); tone(dst, tb + 2 * beat, bar * 0.5, 'sine', fi * 2, null, 0.04); }
        else { tone(dst, tb, beat * 1.8, song.bassWave, r, null, 0.16); tone(dst, tb + 2 * beat, beat * 1.8, song.bassWave, fi, null, 0.13); }
        // 軽い打楽器（雑音の短い音）
        if (song.style === 'pulse' || song.style === 'bounce' || song.style === 'walk') for (q = 0; q < 4; q++) burst(dst, tb + q * beat + (q % 2 ? 0 : 0), 0.05, 'highpass', q % 2 ? 6000 : 3000, 1, 0.002, q % 2 ? 0.1 : 0.06);
      });
    }
    var m = { x: x, y: y, z: z, bus: bus, pan: pan, end: c.currentTime + dur };
    ACTIVE.push(m);
    S.updateMusic();
    return { dur: dur, stop: function () { try { bus.gain.cancelScheduledValues(c.currentTime); bus.gain.setTargetAtTime(0, c.currentTime, 0.05); setTimeout(function () { bus.disconnect(); }, 400); } catch (e) {} m.end = 0; } };
  };
  // 聞こえ方：ジュークボックスから 48 ブロックまで、近いほど大きく、左右にも振る
  S.updateMusic = function () {
    if (!ctx) return;
    var L = S.listener, now = ctx.currentTime;
    ACTIVE = ACTIVE.filter(function (m) { return m.end > now; });
    ACTIVE.forEach(function (m) {
      var dx = m.x - L.pos[0], dy = m.y - L.pos[1] - 1.6, dz = m.z - L.pos[2], d = Math.hypot(dx, dy, dz);
      var vol = d > 48 ? 0 : Math.pow(1 - d / 48, 1.6) * 0.9;
      m.bus.gain.setTargetAtTime(vol, now, 0.1);
      if (m.pan && d > 0.5) { var rx = Math.cos(L.yaw), rz = -Math.sin(L.yaw); m.pan.pan.setTargetAtTime(Math.max(-0.7, Math.min(0.7, (dx * rx + dz * rz) / d)), now, 0.1); }
    });
  };

  // ---- ゲームにつなぐ ----
  var Game = WG.Game, Mobs = WG.Mobs;
  if (!Game) return;
  function at(x, y, z) { return [x + 0.5, y + 0.5, z + 0.5]; }
  var tickExtra = Game.prototype.tickExtra;
  Game.prototype.tickExtra = function () {
    tickExtra.call(this);
    var w = this.walker, wd = this.world, p = w.pos;
    S.listener.pos = p; S.listener.yaw = w.yaw;
    if (ACTIVE.length && (this.tickCount || 0) % 4 === 0) S.updateMusic();
    if (!S.enabled) return;
    // 足音：1.6 ブロック歩くごと（しゃがみ・飛行中・水の中は鳴らさない）
    var step = Math.floor((w.walkDist || 0) / 1.6);
    if (this.stepN == null) this.stepN = step;
    if (step !== this.stepN) {
      this.stepN = step;
      var below = wd.block(Math.floor(p[0]), Math.floor(p[1] - 0.2), Math.floor(p[2]));
      if (w.onGround && !w.sneak && !w.flying && below && !WG.FLUID[below]) S.play('step', p[0], p[1] + 1.6, p[2], matOf(below));
    }
    // 着地
    if (w.onGround && !this.wasGround && (this.lastVy || 0) < -0.4) {
      var b2 = wd.block(Math.floor(p[0]), Math.floor(p[1] - 0.2), Math.floor(p[2]));
      if (b2) S.play('step', p[0], p[1] + 1.6, p[2], matOf(b2));
    }
    this.wasGround = w.onGround; this.lastVy = w.vel ? w.vel[1] : 0;
    // 掘っている途中の音（4 刻みごと）
    var br = this.breaking;
    if (br && this.mouseL && this.tickCount % 4 === 0) { var bid = wd.block(br.x, br.y, br.z); if (bid) S.play('hit', br.x + 0.5, br.y + 0.5, br.z + 0.5, matOf(bid)); }
    // 生き物の鳴き声（近くの生き物が、ときどき）
    var mobs = this.mobs.list;
    for (var i = 0; i < mobs.length; i++) {
      var m = mobs[i];
      if (m.dead || Math.random() > 1 / 320) continue;
      if (Math.abs(m.x - p[0]) > 16 || Math.abs(m.z - p[2]) > 16) continue;
      S.play('mob', m.x, m.y + 1, m.z, m.type);
    }
  };
  var breakBlock = Game.prototype.breakBlock;
  Game.prototype.breakBlock = function (x, y, z, harvest) {
    var id = this.world.block(x, y, z), r = breakBlock.call(this, x, y, z, harvest);
    if (id && this.world.block(x, y, z) !== id) { var q = at(x, y, z); S.play('break', q[0], q[1], q[2], matOf(id)); }
    return r;
  };
  var place = Game.prototype.place;
  Game.prototype.place = function () {
    var t = this.walker.target, n0 = this.world.editCount, r = place.apply(this, arguments);
    if (t && this.world.editCount !== n0) {
      var id = this.world.block(t.px, t.py, t.pz) || this.world.block(t.x, t.y, t.z), q = at(t.px, t.py, t.pz);
      S.play('place', q[0], q[1], q[2], matOf(id));
    }
    return r;
  };
  var damage = Game.prototype.damage;
  Game.prototype.damage = function () {
    var r = damage.apply(this, arguments);
    if (r !== false && this.mode === 'survival') S.play('hurt');
    return r;
  };
  var splash = Game.prototype.splash;
  if (splash) Game.prototype.splash = function (t) { S.play('splash', t.x, t.y, t.z); return splash.apply(this, arguments); };
  var explode = Game.prototype.explode;
  Game.prototype.explode = function (x, y, z) { S.play('explode', x, y, z); return explode.apply(this, arguments); };
  var toggleDoor = Game.prototype.toggleDoor;
  Game.prototype.toggleDoor = function (x, y, z) { S.play('door', x + 0.5, y + 1, z + 0.5); return toggleDoor.apply(this, arguments); };
  var consumeExtra = Game.prototype.consumeExtra;
  Game.prototype.consumeExtra = function (it) { S.play(it && (it.potion || it.milk) ? 'drink' : 'eat'); return consumeExtra.apply(this, arguments); };
  if (Mobs) {
    var hurt = Mobs.prototype.hurt;
    Mobs.prototype.hurt = function (m) {
      var r = hurt.apply(this, arguments);
      if (r) S.play('mobhurt', m.x, m.y + 1, m.z, m.type);
      return r;
    };
  }
  // 音符ブロックの音も、音を切っているときは鳴らさない
  var note = WG.noteSound;
  if (note) WG.noteSound = function () { if (S.enabled) note.apply(this, arguments); };
})(typeof window !== 'undefined' ? window : globalThis);
