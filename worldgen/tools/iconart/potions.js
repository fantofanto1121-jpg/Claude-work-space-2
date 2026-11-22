// ポーションのキーと色（アイコンを作るときに build.py が読む）。効能付きの矢は arrow: true
var WG = require('../load.js'), out = {};
Object.keys(WG.ITEMS).forEach(function (k) { var it = WG.ITEMS[k]; if (it.potion || it.tipped) out[k] = { splash: !!it.splash, lingering: !!it.lingering, arrow: !!it.tipped, color: it.color }; });
process.stdout.write(JSON.stringify(out));
