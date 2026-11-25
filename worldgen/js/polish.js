// 仕上げ（ロードマップ 第 8 段階）
// 性能：見えない生き物（後ろにいる・遠すぎる）は描かない。描く時間の多くは生き物の形づくりなので、群れの中で効く
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var Mobs = WG.Mobs;
  var FAR2 = 96 * 96;
  // 見えるかどうか：目からの向きが視線と大きく逆なら描かない（画面の端で欠けないよう、広めに残す）
  WG.mobVisible = function (m, e, d, T) {
    var dx = m.x - e[0], dy = m.y + 0.9 - e[1], dz = m.z - e[2], d2 = dx * dx + dy * dy + dz * dz;
    var big = T && (T.w || 0) * (T.scale || 1) > 2.5;
    if (big) return d2 < FAR2 * 4;
    if (d2 > FAR2) return false;
    if (d2 < 16) return true;
    return dx * d[0] + dy * d[1] + dz * d[2] > -0.3 * Math.sqrt(d2) - 1.5;
  };
  var draw = Mobs.prototype.draw;
  Mobs.prototype.draw = function () {
    var w = this.game && this.game.walker, e = w && w.eye, d = w && w.dir, all = this.list, T = WG.MOB_TYPES;
    if (!e || !d || all.length < 6) return draw.apply(this, arguments);
    var vis = all.filter(function (m) { return WG.mobVisible(m, e, d, T[m.type]); });
    if (vis.length === all.length) return draw.apply(this, arguments);
    this.list = vis;
    try { return draw.apply(this, arguments); } finally { this.list = all; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
