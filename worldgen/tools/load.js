// ブラウザと同じ js ファイルを Node.js に読み込む（index.html と同じ順番）
'use strict';
var path = require('path');
var FILES = ['rng.js', 'noise.js', 'blocks.js', 'overworld.js', 'nether.js', 'end.js', 'world.js', 'paint.js'];
FILES.forEach(function (f) { require(path.join(__dirname, '..', 'js', f)); });
module.exports = globalThis.WG;
