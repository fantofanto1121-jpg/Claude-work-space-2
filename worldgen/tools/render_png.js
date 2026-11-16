// 真上からの地形図を PNG で書き出す（Node.js の標準機能だけを使う）
// 使い方: node tools/render_png.js [--seed 7] [--dim overworld|nether|end] [--size 512] [--x 0] [--z 0] [--ymax N] [--scale 1] [--out map.png]
'use strict';
var fs = require('fs');
var zlib = require('zlib');
var WG = require('./load.js');

function args() {
  var a = process.argv.slice(2), o = {};
  for (var i = 0; i < a.length; i++) if (a[i].slice(0, 2) === '--') o[a[i].slice(2)] = a[i + 1], i++;
  return o;
}

var CRC = (function () {
  var t = new Uint32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  var c = 0xffffffff;
  for (var i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  var len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  var td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
// RGBA の配列を PNG にする
function encodePNG(w, h, rgba) {
  var raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}

// 範囲 [x0, x0+w) × [z0, z0+h) を 1 ブロック 1 ピクセルで描く
function renderTop(world, x0, z0, w, h, yMax) {
  var img = new Uint8ClampedArray(w * h * 4), tile = new Uint8ClampedArray(1024);
  var c0x = x0 >> 4, c1x = (x0 + w - 1) >> 4, c0z = z0 >> 4, c1z = (z0 + h - 1) >> 4;
  for (var cz = c0z; cz <= c1z; cz++) for (var cx = c0x; cx <= c1x; cx++) {
    WG.Paint.topTile(world, cx, cz, yMax, tile);
    for (var i = 0; i < 256; i++) {
      var px = (cx << 4) + (i & 15) - x0, pz = (cz << 4) + (i >> 4) - z0;
      if (px < 0 || px >= w || pz < 0 || pz >= h) continue;
      var o = (pz * w + px) * 4;
      img[o] = tile[i * 4]; img[o + 1] = tile[i * 4 + 1]; img[o + 2] = tile[i * 4 + 2]; img[o + 3] = 255;
    }
  }
  return img;
}

function scaleUp(img, w, h, s) {
  if (s === 1) return img;
  var out = new Uint8ClampedArray(w * s * h * s * 4);
  for (var y = 0; y < h * s; y++) for (var x = 0; x < w * s; x++) {
    var si = (((y / s) | 0) * w + ((x / s) | 0)) * 4, di = (y * w * s + x) * 4;
    out[di] = img[si]; out[di + 1] = img[si + 1]; out[di + 2] = img[si + 2]; out[di + 3] = 255;
  }
  return out;
}

if (require.main === module) {
  var o = args();
  var dim = o.dim || 'overworld', size = +(o.size || 512), scale = +(o.scale || 1);
  var world = new WG.World(o.seed || '7', dim);
  var yMax = o.ymax != null ? +o.ymax : WG.DIMS[dim].view.yMax;
  var cx = +(o.x || 0), cz = +(o.z || 0);
  var x0 = Math.floor(cx - size / 2), z0 = Math.floor(cz - size / 2);
  var t0 = Date.now();
  var img = scaleUp(renderTop(world, x0, z0, size, size, yMax), size, size, scale);
  var out = o.out || ('map_' + dim + '.png');
  fs.writeFileSync(out, encodePNG(size * scale, size * scale, img));
  console.log(out + '  ' + size + 'x' + size + ' ブロック  ' + world.genCount + ' チャンク  ' + (Date.now() - t0) + ' ms');
}

module.exports = { encodePNG: encodePNG, renderTop: renderTop };
