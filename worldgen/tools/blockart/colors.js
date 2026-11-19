// 今の見た目の面ごとの平均色（gen.py が色の土台に使う）
var WG = require('../load.js'), T = WG.TEXTURES, out = {};
function dec(v) { return typeof v === 'string' ? Buffer.from(v, 'base64') : Buffer.from(v); }
function avg(b) { var r = 0, g = 0, bb = 0, n = 0; for (var i = 0; i < b.length; i += 3) { r += b[i]; g += b[i + 1]; bb += b[i + 2]; n++; } return '#' + [r / n, g / n, bb / n].map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); }
Object.keys(T).forEach(function (k) { var t = T[k]; out[k] = { side: avg(dec(t.side)), top: avg(dec(t.top || t.side)), bottom: avg(dec(t.bottom || t.side)) }; });
process.stdout.write(JSON.stringify(out));
