// ポーションのキーと色（アイコンを作るときに build.py が読む）
var WG = require('../load.js'), out = {};
Object.keys(WG.ITEMS).forEach(function (k) { var it = WG.ITEMS[k]; if (it.potion) out[k] = { splash: !!it.splash, color: it.color }; });
process.stdout.write(JSON.stringify(out));
