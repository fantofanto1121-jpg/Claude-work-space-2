// ブラウザと同じ js ファイルを Node.js に読み込む（index.html と同じ順番）
'use strict';
var path = require('path');
var FILES = ['rng.js', 'noise.js', 'textures.js', 'newtex.js', 'tex16.js', 'blocks.js', 'features.js', 'overworld.js', 'nether.js', 'end.js', 'world.js', 'paint.js', 'render3d.js', 'light.js', 'fluid.js', 'walk.js', 'icons.js', 'items.js', 'crafting.js', 'magic.js', 'redstone.js', 'mobs.js', 'eggs.js', 'play.js', 'play2.js', 'village.js', 'portal.js', 'sound.js', 'save.js', 'modes.js', 'advance.js', 'commands.js', 'vehicles.js', 'gear.js', 'workblocks.js', 'deco.js', 'creatures.js', 'terrain.js', 'structures.js', 'redstone2.js', 'items2.js', 'weather.js', 'structures2.js', 'raids.js', 'trials.js', 'animals.js', 'colors.js', 'biomes.js', 'caves.js', 'workshop.js', 'motion.js', 'netherend.js', 'mobskins.js', 'polish.js', 'recipebook.js'];
FILES.forEach(function (f) { require(path.join(__dirname, '..', 'js', f)); });
module.exports = globalThis.WG;
