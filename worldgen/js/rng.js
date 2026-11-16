// 座標ハッシュ乱数。状態を持たず、(シード, x, y, z, 用途番号) だけで値が決まる。
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};

  function mix(h) {
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // 32bit 符号なし整数を返す
  function hash(seed, x, y, z, salt) {
    var h = mix((seed ^ 0x9e3779b9 ^ Math.imul(salt | 0, 0x632be5ab)) | 0);
    h = mix((h + Math.imul(x | 0, 0x85ebca6b)) | 0);
    h = mix((h + Math.imul(y | 0, 0xc2b2ae35)) | 0);
    h = mix((h + Math.imul(z | 0, 0x27d4eb2f)) | 0);
    return h;
  }

  // [0, 1) の実数
  function rnd(seed, x, y, z, salt) {
    return hash(seed, x, y, z, salt) / 4294967296;
  }

  // 文字列のシードを 32bit 整数にする（整数表記ならその値）
  function seedOf(text) {
    var s = String(text == null ? '' : text).trim();
    if (/^-?\d{1,10}$/.test(s)) return Number(s) | 0;
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h | 0;
  }

  WG.hash = hash;
  WG.rnd = rnd;
  WG.seedOf = seedOf;
})(typeof window !== 'undefined' ? window : globalThis);
