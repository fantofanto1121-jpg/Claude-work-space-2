// 仕上げ 2（ロードマップ 第 20 段階）
// ・幸運の効果：釣りで宝が出やすくなる（宝釣りのエンチャントと同じように効く）
// ・スマホの操作に「視点の切り替え」と「左手との持ち替え」のボタン
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};

  // ---------------- 幸運 ----------------
  var fishLoot = WG.fishLoot;
  WG.fishLoot = function (luck, rnd) {
    var g = WG.curGame, lk = g && g.effects && g.effects.LUCK;
    return fishLoot.call(this, (luck || 0) + (lk ? lk.amp + 1 : 0), rnd);
  };

  // ---------------- スマホのボタン ----------------
  if (typeof document === 'undefined') return;
  var add = function () {
    var top = document.getElementById('tTop');
    if (!top || document.getElementById('tView')) return;
    var st = document.createElement('style');
    st.textContent = '#tView, #tSwap { font-size: 12px; color: #ecebe6; letter-spacing: 0; line-height: 1; }';
    document.head.appendChild(st);
    [['tView', '視点', function (g) { if (g.spectator) return; g.viewMode = ((g.viewMode || 0) + 1) % 3; if (g.ui.toast) g.ui.toast('視点：' + ['一人称', '後ろから', '前から'][g.viewMode]); }],
      ['tSwap', '持替', function (g) { if (g.swapHands && !g.spectator) g.swapHands(); }]].reverse().forEach(function (d) {
      var b = document.createElement('div'); b.id = d[0]; b.className = 'tbtn'; b.textContent = d[1];
      top.insertBefore(b, top.firstChild);
      b.addEventListener('touchstart', function (e) { e.preventDefault(); var g = WG.curGame; if (g) d[2](g); }, { passive: false });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})(typeof window !== 'undefined' ? window : globalThis);
