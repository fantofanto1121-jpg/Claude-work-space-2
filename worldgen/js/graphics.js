// 画質の設定（横の欄の「画質」）：描画距離・影・雲。選んだものはこのブラウザに覚えておく
// 影と雲の見え方そのものは js/render3d.js（空・霞・太陽の光と影・水面・風）
(function (G) {
  'use strict';
  var WG = G.WG = G.WG || {};
  var GFX = WG.GFX = WG.GFX || { shadows: true, clouds: true, shadowSize: 2048 };
  var touch = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0) && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  // 決まりの値：パソコンは描画距離 8・影あり、タッチの端末は 6・影なし（重くならないように）
  var conf = { dist: touch ? 6 : 8, shadows: !touch, clouds: true };
  try { var saved = JSON.parse(G.localStorage.getItem('wg-gfx') || 'null'); if (saved) Object.assign(conf, saved); } catch (e) { /* 覚えられない環境では決まりの値 */ }
  function apply() {
    GFX.shadows = !!conf.shadows; GFX.clouds = !!conf.clouds;
    if (WG.setWalkRadius) WG.setWalkRadius(conf.dist);
  }
  function save() { try { G.localStorage.setItem('wg-gfx', JSON.stringify(conf)); } catch (e) { /* 何もしない */ } }
  apply();
  WG.gfxConf = conf;
  if (typeof document === 'undefined') return;
  // 画面の端を少しだけ暗くする（立体と歩く表示のとき）
  function vignette() {
    var cv = document.getElementById('c3d'), v = document.getElementById('vign');
    if (!cv || !cv.parentElement) return;
    if (!v) { v = document.createElement('div'); v.id = 'vign'; v.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.22) 100%)'; cv.parentElement.insertBefore(v, cv.nextSibling); }
    v.style.display = cv.classList.contains('hide') ? 'none' : '';
  }
  function sync() {
    var d = document.getElementById('gfxDist'), f = document.getElementById('gfxFx');
    if (d) [].forEach.call(d.children, function (b) { b.classList.toggle('on', +b.dataset.v === conf.dist); });
    if (f) [].forEach.call(f.children, function (b) { b.classList.toggle('on', !!conf[b.dataset.k]); b.textContent = (b.dataset.k === 'shadows' ? '影' : '雲') + '：' + (conf[b.dataset.k] ? 'あり' : 'なし'); });
  }
  function hook() {
    var d = document.getElementById('gfxDist'), f = document.getElementById('gfxFx');
    if (d) d.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; conf.dist = +b.dataset.v; apply(); save(); sync(); b.blur(); });
    if (f) f.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; conf[b.dataset.k] = !conf[b.dataset.k]; apply(); save(); sync(); b.blur(); });
    sync();
    vignette(); setInterval(vignette, 700);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
})(typeof window !== 'undefined' ? window : globalThis);
