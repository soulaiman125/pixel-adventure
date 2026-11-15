import { VIEW_HEIGHT } from './level-one.js';

function texture(scene, key, width, height, draw) {
  const canvas = scene.textures.createCanvas(key, width, height);
  draw(canvas.context);
  canvas.refresh();
}

function box(context, color, x, y, width, height) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function shape(context, color, points) {
  context.fillStyle = color;
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  context.fill();
}

function pixels(context, palette, rows, x = 0, y = 0) {
  rows.forEach((row, dy) => {
    [...row].forEach((pixel, dx) => {
      if (palette[pixel]) box(context, palette[pixel], x + dx, y + dy, 1, 1);
    });
  });
}

function randomSequence(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function drawSky(context) {
  const light = context.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  light.addColorStop(0, '#56aacb');
  light.addColorStop(0.62, '#9fdbdf');
  light.addColorStop(1, '#e3f0ce');
  box(context, light, 0, 0, 2, VIEW_HEIGHT);
}

function drawSun(context) {
  shape(context, '#fff4b8', [[13, 0], [29, 0], [29, 4], [37, 4], [37, 10], [42, 10],
    [42, 30], [37, 30], [37, 36], [29, 36], [29, 40], [13, 40], [13, 36], [5, 36],
    [5, 30], [0, 30], [0, 10], [5, 10], [5, 4], [13, 4]]);
  box(context, '#ffe89e', 13, 36, 16, 4);
  box(context, '#ffe89e', 5, 30, 32, 6);
}

function drawClouds(context) {
  const clouds = [[52, 33, 59], [146, 58, 45], [232, 32, 62], [405, 52, 54],
    [530, 23, 74], [688, 49, 62]];
  for (const [x, y, width] of clouds) {
    box(context, '#bfdfe1', x, y + 9, width, 5);
    box(context, '#e7f4e7', x + 3, y + 5, width - 6, 5);
    box(context, '#fffae7', x + 13, y + 1, width - 30, 9);
    box(context, '#fffae7', x + 24, y - 4, Math.max(8, width - 48), 9);
    box(context, '#ddebdf', x + 8, y + 14, width - 17, 2);
  }
  const birds = { b: '#526f7a' };
  for (const [x, y] of [[313, 57], [326, 51], [339, 54], [601, 30], [613, 35]]) {
    pixels(context, birds, ['b...b', '.b.b.', '..b..'], x, y);
  }
}

function drawMountains(context) {
  const peaks = [
    [45, 103, 69], [116, 74, 87], [200, 101, 71], [288, 65, 103],
    [391, 97, 76], [482, 70, 100], [590, 93, 90], [675, 71, 87],
    [748, 103, 55],
  ];
  for (const [x, y, width] of peaks) {
    const base = 174;
    shape(context, '#76aeda', [[x - width, base], [x - 12, y + 11], [x, y], [x + 11, y + 8], [x + width, base]]);
    shape(context, '#5f9ace', [[x, y], [x + 11, y + 8], [x + width, base], [x + 16, base], [x - 14, y + 34]]);
    shape(context, '#b4dff0', [[x - 34, y + 35], [x - 12, y + 11], [x, y], [x + 11, y + 8],
      [x + 43, y + 40], [x + 15, y + 25], [x + 7, y + 34], [x - 8, y + 23]]);
    shape(context, '#d9f1fa', [[x - 31, y + 31], [x - 12, y + 11], [x, y], [x + 8, y + 7],
      [x + 15, y + 25], [x + 1, y + 18], [x - 8, y + 23], [x - 15, y + 21]]);
    box(context, '#9bc5db', x - 23, y + 39, 9, 1);
    box(context, '#8bbad6', x - 29, y + 43, 12, 1);
  }
}

function drawHills(context) {
  const hills = [[50, 127, 82], [199, 132, 106], [370, 118, 105], [529, 131, 96], [701, 119, 118]];
  for (const [x, y, width] of hills) {
    shape(context, '#58b7ad', [[x - width, 220], [x - width, y + 55], [x - 53, y + 22],
      [x - 27, y + 6], [x - 12, y], [x + 12, y], [x + 30, y + 6], [x + 58, y + 25],
      [x + width, y + 52], [x + width, 220]]);
    shape(context, '#68c7b1', [[x - 55, y + 25], [x - 27, y + 6], [x - 12, y], [x + 12, y],
      [x + 30, y + 6], [x + 42, y + 14], [x + 8, y + 10], [x - 11, y + 13]]);
  }
}

function drawPines(context) {
  const next = randomSequence(27);
  for (let x = 6; x < 754; x += 10 + Math.floor(next() * 11)) {
    const h = 13 + Math.floor(next() * 22);
    const y = 187 - Math.floor(next() * 10);
    const w = Math.floor(h * 0.36);
    box(context, '#338d83', x - 1, y - 11, 3, 16);
    shape(context, '#399f8e', [[x, y - h], [x + w, y - 8], [x + w - 3, y - 8],
      [x + w + 3, y], [x - w - 3, y], [x - w + 3, y - 8], [x - w, y - 8]]);
    shape(context, '#43ab96', [[x, y - h], [x + 1, y], [x - w - 3, y], [x - w + 3, y - 8], [x - w, y - 8]]);
  }
  box(context, '#398f86', 0, 187, 768, 33);
}

function drawTree(context) {
  box(context, '#5d4245', 31, 30, 9, 40);
  box(context, '#9e6750', 32, 44, 4, 24);
  box(context, '#a97856', 26, 64, 8, 4);
  box(context, '#73464b', 38, 63, 8, 6);
  shape(context, '#236058', [[5, 28], [11, 28], [11, 15], [20, 15], [20, 7], [32, 7],
    [32, 1], [49, 1], [49, 7], [59, 7], [59, 16], [65, 16], [65, 25], [71, 25],
    [71, 41], [65, 41], [65, 47], [54, 47], [54, 54], [31, 54], [31, 51], [15, 51],
    [15, 46], [5, 46], [5, 39], [0, 39], [0, 31], [5, 31]]);
  shape(context, '#379b68', [[1, 31], [7, 31], [7, 25], [13, 25], [13, 14], [21, 14],
    [21, 7], [33, 7], [33, 1], [49, 1], [49, 7], [59, 7], [59, 16], [65, 16], [65, 34],
    [57, 34], [57, 41], [46, 41], [46, 45], [31, 45], [31, 41], [12, 41], [12, 38], [1, 38]]);
  shape(context, '#62bb70', [[11, 24], [15, 24], [15, 15], [22, 15], [22, 8], [34, 8],
    [34, 2], [48, 2], [48, 9], [55, 9], [55, 17], [48, 17], [48, 13], [34, 13],
    [34, 21], [26, 21], [26, 27], [11, 27]]);
  box(context, '#87ce7d', 35, 4, 9, 2);
  box(context, '#5bb778', 46, 28, 12, 4);
  box(context, '#56b277', 20, 32, 9, 3);
}

function drawDirt(context, height) {
  box(context, '#4c3b49', 0, 0, 48, height);
  box(context, '#795445', 0, 5, 48, Math.min(13, height - 5));
  const next = randomSequence(7);
  for (let index = 0; index < height + 2; index += 1) {
    const x = Math.floor(next() * 48);
    const y = 8 + Math.floor(next() * (height - 8));
    const color = ['#99634e', '#543744', '#ad7253', '#71454a'][index % 4];
    box(context, color, x, y, 2 + Math.floor(next() * 5), 1 + Math.floor(next() * 2));
  }
  box(context, '#2d634d', 0, 4, 48, 4);
  box(context, '#69ad52', 0, 1, 48, 4);
  box(context, '#c3e776', 0, 0, 48, 1);
  [[2, 3], [11, 5], [26, 5], [37, 7], [45, 2]].forEach(([x, width], index) => {
    box(context, '#80cb57', x, 1, width, 3);
    box(context, '#347a50', x, 5, width, 4 + index % 2);
  });
  if (height > 12) {
    for (const [x, y] of [[3, 17], [24, 28], [39, 14]]) {
      shape(context, '#674955', [[x, y + 3], [x + 2, y], [x + 7, y], [x + 9, y + 3], [x + 7, y + 5], [x + 1, y + 5]]);
      box(context, '#977061', x + 2, y + 1, 5, 1);
    }
  }
}

function drawHero(context, pose) {
  const colors = { o: '#202a3d', r: '#e95c51', R: '#ff9272', k: '#9c394a',
    s: '#ffd391', S: '#d99667', e: '#253447', w: '#fff3d3', b: '#32687b', B: '#62c4be',
    y: '#ffe57d', Y: '#eaa34c' };
  pixels(context, colors, [
    '......oooooo....', '....ooRRRRRoo...', '...oRRrrrrrro...', '...oRrrrrrrro...',
    '...orrkroooooo..', '...ookossswweo..', '....oosssswseo..', '....osssSsssso..',
    '.....ooSSSooo...', '....oyyyyyYo....', '..ooyyoBBwBoo...', '.oyYooBBBBBbo...',
    '.oY...oBbBBso...', '......obbbooo...',
  ], 0, 2);
  const boots = {
    idle: ['......oBobo.....', '......oBobo.....', '.....oookko.....', '.....orrooroo...', '.....ooooooo....'],
    step: ['.....oBboo......', '....oBbo.obo....', '...ooko..oobo...', '...orro...orro..', '...ooo....oooo..'],
    stride: ['......oBboo.....', '.....ob.Bo......', '.....obooRo.....', '....oro.ooo.....', '....ooo.........'],
    jump: ['.....oBboo......', '....oBbooobo....', '...orro..oboo...', '...ooo....oroo..', '..........ooo...'],
    fall: ['.....oBBbo......', '.....oBo.oBo....', '.....oBo..oro...', '.....orro.ooo...', '.....oooo.......'],
  };
  pixels(context, colors, boots[pose], 0, 16);
  if (pose === 'stride' || pose === 'jump') {
    pixels(context, colors, ['.ooo', 'oyYo', 'oo..'], 0, 12);
  }
}

function drawSlime(context, rising, colors = {}) {
  const palette = { o: '#335046', a: '#63ac63', b: '#a9dd6d', c: '#e1f38e',
    d: '#47855c', e: '#273d34', w: '#f3f9b8', p: '#edbc84', ...colors };
  const rows = [
    '......oooooo......', '....oobccccboo....', '...obccccbbbbbo...', '..obbbbbbbbbbbbo..',
    '.obbbewbbbewbbbbo.', '.obbbebbbbebbbbbo.', '.oabpbbbbbbbpbao.', 'oaaabbbbeabbbaaado',
    'oddaaaaaaaaaaddddo', 'ooddddddddddddddoo', '..oooooooooooooo..',
  ];
  pixels(context, palette, rows, 0, rising ? 0 : 2);
}

function drawCoin(context, width) {
  const x = Math.floor((14 - width) / 2);
  box(context, '#ae631f', x, 3, width, 8);
  box(context, '#ae631f', x + 1, 1, width - 2, 12);
  box(context, '#ffb52e', x + 1, 3, width - 2, 8);
  box(context, '#ffd453', x + 2, 2, width - 4, 9);
  box(context, '#fff0a0', x + 2, 3, 1, 5);
  box(context, '#fff0a0', x + 2, 2, Math.max(1, width - 5), 1);
  if (width > 8) {
    const middle = x + Math.floor(width / 2);
    box(context, '#e4912c', middle, 4, 1, 6);
    box(context, '#e4912c', middle - 1, 6, 3, 2);
  }
}

function drawCheckpoint(context, active) {
  box(context, '#354653', 4, 1, 2, 23);
  box(context, '#c4c3a0', 4, 3, 1, 20);
  box(context, '#5f4d54', 2, 22, 7, 2);
  const color = active ? '#d7f879' : '#86adb0';
  shape(context, color, [[6, 3], [17, 3], [15, 6], [17, 9], [6, 9]]);
  box(context, active ? '#6db258' : '#5a838c', 6, 8, 10, 1);
  box(context, color, 3, 0, 4, 2);
}

function drawFlag(context) {
  box(context, '#263d50', 9, 4, 3, 44);
  box(context, '#dce7bd', 9, 6, 1, 40);
  box(context, '#fff2a0', 7, 1, 7, 5);
  box(context, '#e5ab55', 7, 5, 7, 2);
  shape(context, '#fff1a0', [[12, 9], [27, 9], [27, 11], [32, 11], [32, 14],
    [38, 14], [38, 17], [33, 17], [33, 20], [27, 20], [27, 23], [12, 23]]);
  box(context, '#ffbf4e', 12, 19, 15, 4);
  box(context, '#ffbf4e', 27, 17, 6, 3);
  box(context, '#5c5755', 5, 46, 11, 4);
  box(context, '#a3a47a', 7, 45, 7, 2);
}

export function createArt(scene) {
  texture(scene, 'sky', 2, VIEW_HEIGHT, drawSky);
  texture(scene, 'sun', 42, 40, drawSun);
  texture(scene, 'clouds', 768, VIEW_HEIGHT, drawClouds);
  texture(scene, 'mountains', 768, VIEW_HEIGHT, drawMountains);
  texture(scene, 'hills', 768, VIEW_HEIGHT, drawHills);
  texture(scene, 'pines', 768, VIEW_HEIGHT, drawPines);
  texture(scene, 'tree', 72, 70, drawTree);
  texture(scene, 'ground', 48, 40, (ctx) => drawDirt(ctx, 40));
  texture(scene, 'platform', 48, 12, (ctx) => drawDirt(ctx, 12));
  for (const pose of ['idle', 'step', 'stride', 'jump', 'fall']) {
    texture(scene, 'hero-' + pose, 16, 21, (ctx) => drawHero(ctx, pose));
  }
  texture(scene, 'slime-rest', 18, 13, (ctx) => drawSlime(ctx, false));
  texture(scene, 'slime-hop', 18, 13, (ctx) => drawSlime(ctx, true));
  texture(scene, 'coin-wide', 14, 14, (ctx) => drawCoin(ctx, 11));
  texture(scene, 'coin-narrow', 14, 14, (ctx) => drawCoin(ctx, 7));
  texture(scene, 'coin-edge', 14, 14, (ctx) => drawCoin(ctx, 4));
  texture(scene, 'checkpoint', 18, 24, (ctx) => drawCheckpoint(ctx, false));
  texture(scene, 'checkpoint-active', 18, 24, (ctx) => drawCheckpoint(ctx, true));
  texture(scene, 'flag', 39, 50, drawFlag);
  for (const type of ['guard', 'bat', 'charger', 'poison', 'robot']) {
    for (const pose of ['rest', 'hop']) {
      texture(scene, `${type}-${pose}`, 18, 18, (ctx) => drawExpansionEnemy(ctx, type, pose === 'hop'));
    }
  }
}

function drawExpansionEnemy(context, type, alternate) {
  const colors = {
    guard: ['#394155', '#8494a4', '#dbe5cf'],
    bat: ['#4b3659', '#9670af', '#ecd1fc'],
    charger: ['#513947', '#cb8266', '#ffdf9c'],
    poison: ['#43573d', '#8baf59', '#e3f88e'],
    robot: ['#3d4370', '#7290b9', '#a1fff4'],
  }[type];
  const [edge, base, detail] = colors;
  if (type === 'bat') {
    const tip = alternate ? 1 : 8;
    shape(context, base, [[0, tip], [5, 6], [8, 11], [10, 11], [13, 6], [18, tip], [16, 12], [12, 14],
      [10, 17], [6, 17], [5, 14], [2, 12]]);
    box(context, edge, 5, 9, 8, 7);
    box(context, detail, 8, 11, 5, 2);
    return;
  }
  box(context, edge, 2, 5, 13, 11);
  box(context, base, 3, 6, 12, 8);
  box(context, detail, 8, 8, 5, 2);
  box(context, edge, alternate ? 4 : 2, 16, 5, 2);
  box(context, edge, alternate ? 11 : 12, 16, 5, 2);
  if (type === 'guard') {
    box(context, edge, 12, 6, 6, 11);
    box(context, base, 13, 6, 5, 9);
    box(context, detail, 14, 7, 2, 6);
  } else if (type === 'charger') {
    shape(context, detail, [[12, 8], [18, 5], [17, 11], [13, 12]]);
  } else if (type === 'poison') {
    box(context, detail, 2, 3, 4, 5);
    box(context, base, 11, 2, 4, 4);
    box(context, detail, 11, 12, 2, 2);
  } else {
    box(context, detail, 6, 2, 2, 5);
    box(context, base, 12, 12, 6, 3);
    box(context, detail, 16, 12, 2, 2);
  }
}

export function drawMeadow(scene, segments, groundY, theme = 'verdant') {
  const detail = scene.add.graphics().setDepth(-1);
  const next = randomSequence(301);
  const [stem, leaf, flower, light, bloom] = {
    verdant: [0x419050, 0x93cc5e, 0x287c57, 0xffd66c, 0xffaaa1],
    canyon: [0xa05c58, 0xe8a867, 0x8c524d, 0xffdf9a, 0xef98a7],
    crystal: [0x547bad, 0x9bd9ea, 0x426594, 0xd4fbfb, 0xbea4ee],
    fire: [0x854759,0xd18364,0x704050,0xffc26e,0xff847b],
    castle: [0x525075,0x8f91bf,0x464369,0xe6abc7,0xd19de8],
    jungle: [0x446655, 0xa0ad61, 0x467450, 0xf2dc7d, 0xbdb6ed],
    thunder: [0x56618f, 0x889dd1, 0x655988, 0xb6f6fa, 0xffd995],
  }[theme];
  for (const [start, end] of segments) {
    for (let x = start + 7; x < end - 8; x += 7 + Math.floor(next() * 13)) {
      const y = groundY - 1;
      detail.fillStyle(stem).fillRect(x, y - 3, 2, 4).fillRect(x + 3, y - 2, 2, 3);
      detail.fillStyle(leaf).fillRect(x + 1, y - 5, 1, 4);
      if (next() < 0.3) {
        detail.fillStyle(flower).fillRect(x + 3, y - 7, 1, 6);
        detail.fillStyle(next() < 0.65 ? light : bloom).fillRect(x + 2, y - 8, 3, 2);
      }
    }
  }
  return detail;
}

const LANDSCAPES = {
  jungle: {
    sky: ['#304854', '#527260', '#9aaa6d'], sun: ['#dce08e', '#a3b067'], clouds: ['#59705e', '#8e9b73'],
    ridge: ['#596768', '#415656', '#919776'], hills: ['#526c59', '#849666'], foreground: ['#405a50', '#6b875c'],
    terrain: ['#3f3d50', '#53495b', '#706077', '#829652', '#c3d787', '#97ab59'],
    slime: { o: '#493f5b', a: '#8774a3', b: '#b39ac1', c: '#e7d4ce', d: '#635879', e: '#3c344d', w: '#ffe5d5' },
  },
  thunder: {
    sky: ['#252a4c', '#43557a', '#7990b4'], sun: ['#dedcf6', '#a4a9d6'], clouds: ['#62769d', '#a0aec7'],
    ridge: ['#56618c', '#455076', '#a0a8c8'], hills: ['#52688d', '#94aac5'], foreground: ['#3a4968', '#5e729b'],
    terrain: ['#363a56', '#444d6a', '#596481', '#7997b4', '#c9f3f0', '#83acc3'],
    slime: { o: '#433959', a: '#8076a5', b: '#ad98c9', c: '#ccffff', d: '#5d5688', e: '#393050', w: '#ffe5d5' },
  },
  castle: {
    sky: ['#272b50','#51456e','#797091'], sun: ['#ead8e7','#b79ebf'], clouds: ['#71628c','#a88dae'],
    ridge: ['#645a80','#453f64','#9c87a6'], hills: ['#514969','#786f91'], foreground: ['#352f51','#605374'],
    terrain: ['#39314b','#4c4363','#655575','#8b7b9a','#c1aaca','#937ea5'],
    slime: { o: '#493859', a: '#8060a0', b: '#b78cca', c: '#ffb8c0', d: '#5c4b85', e: '#362846', w: '#ffe5d5' },
  },
  fire: {
    sky: ['#552945','#9b4d61','#f19163'], sun: ['#ffd795','#ed956f'], clouds: ['#9e5d6b','#d67b77'],
    ridge: ['#8f505e','#66394f','#c97c70'], hills: ['#9e5a65','#d77b63'], foreground: ['#633b4f','#995362'],
    terrain: ['#462b41','#693c4e','#99505b','#d57858','#ffb477','#df7555'],
    slime: { o: '#682c4a', a: '#d35244', b: '#fc8654', c: '#ffe18b', d: '#ac3d50', e: '#4f2541', w: '#fff5c3' },
  },
  canyon: {
    sky: ['#8a528b', '#ee8b86', '#ffda9d'],
    sun: ['#fff0a8', '#ffbb77'],
    clouds: ['#ea928e', '#ffc1a1'],
    ridge: ['#a76083', '#875274', '#d88b95'],
    hills: ['#bc6774', '#eb8c7c'],
    foreground: ['#874c60', '#ae625f'],
    terrain: ['#643b48', '#945053', '#b96755', '#e29361', '#ffc57e', '#e29763'],
    slime: { o: '#763f57', a: '#d77761', b: '#ffa267', c: '#ffe18b', d: '#ad555d', e: '#523448', w: '#fff5c3' },
  },
  crystal: {
    sky: ['#506eae', '#9aadcf', '#cbe8ef'],
    sun: ['#f2f4fc', '#c1d7f4'],
    clouds: ['#9eb6d6', '#d1e5f5'],
    ridge: ['#708ab3', '#5d689a', '#e1eefb'],
    hills: ['#78a5bd', '#a7cacf'],
    foreground: ['#547899', '#749fb3'],
    terrain: ['#3b4365', '#506080', '#6081a2', '#95c5de', '#ebf8fa', '#aecfe1'],
    slime: { o: '#405477', a: '#6aa6c8', b: '#8fdbed', c: '#e1fbfa', d: '#576ba0', e: '#26354f', w: '#f1ffff' },
  },
};

function drawHorizon(context, color, y) {
  box(context, color, 0, y, 768, VIEW_HEIGHT - y);
}

function drawRidges(context, colors, desert) {
  const peaks = [[63, 106, 83], [158, 71, 90], [247, 94, 77], [333, 63, 102],
    [444, 96, 76], [535, 74, 91], [628, 89, 80], [712, 70, 83]];
  for (const [x, y, radius] of peaks) {
    const base = 172;
    if (desert) {
      shape(context, colors[0], [[x - radius, base], [x - 44, base - 33], [x - 30, y + 28],
        [x - 24, y + 11], [x - 16, y + 11], [x - 16, y], [x + 22, y], [x + 22, y + 12],
        [x + 30, y + 12], [x + 41, base - 30], [x + radius, base]]);
      shape(context, colors[1], [[x + 6, y], [x + 22, y], [x + 22, y + 12], [x + 30, y + 12],
        [x + 41, base - 30], [x + radius, base], [x + 24, base], [x + 10, y + 28]]);
      box(context, colors[2], x - 25, y + 23, 50, 3);
      box(context, colors[2], x - 32, y + 35, 39, 2);
    } else {
      shape(context, colors[0], [[x - radius, base], [x - 41, y + 38], [x - 24, y + 33],
        [x - 9, y + 8], [x, y], [x + 14, y + 19], [x + 23, y + 19], [x + radius, base]]);
      shape(context, colors[1], [[x, y], [x + 14, y + 19], [x + 23, y + 19], [x + radius, base],
        [x + 22, base], [x - 8, y + 39]]);
      shape(context, colors[2], [[x - 40, y + 38], [x - 24, y + 33], [x - 9, y + 8], [x, y],
        [x + 14, y + 19], [x + 23, y + 19], [x + 42, y + 44], [x + 18, y + 30],
        [x + 14, y + 37], [x + 3, y + 22], [x - 13, y + 34], [x - 14, y + 28]]);
    }
  }
}

function drawSlopes(context, colors) {
  drawHorizon(context, colors[0], 171);
  for (const [x, y] of [[44, 143], [168, 123], [321, 141], [466, 125], [598, 148], [706, 131]]) {
    shape(context, colors[0], [[x - 77, 189], [x - 48, y + 20], [x - 21, y + 5], [x, y],
      [x + 19, y + 3], [x + 43, y + 13], [x + 79, 189]]);
    shape(context, colors[1], [[x - 48, y + 20], [x - 21, y + 5], [x, y], [x + 19, y + 3],
      [x + 43, y + 13], [x + 10, y + 7], [x - 6, y + 7]]);
  }
}

function drawLandscapeProp(context, desert) {
  if (desert) {
    const outline = '#725460';
    const shade = '#547565';
    shape(context, outline, [[31, 69], [31, 11], [34, 7], [42, 7], [46, 11], [46, 31],
      [53, 31], [53, 18], [56, 15], [62, 15], [65, 19], [65, 37], [59, 43], [46, 43],
      [46, 69]]);
    shape(context, outline, [[31, 51], [20, 51], [13, 46], [13, 30], [16, 27], [22, 27],
      [25, 31], [25, 40], [31, 40]]);
    box(context, shade, 34, 11, 8, 58);
    box(context, shade, 16, 31, 5, 13);
    box(context, shade, 56, 19, 5, 17);
    box(context, '#86a276', 35, 11, 2, 54);
    box(context, '#9ea47c', 39, 6, 5, 2);
  } else {
    shape(context, '#54648e', [[5, 69], [12, 55], [22, 49], [29, 23], [39, 3], [48, 15],
      [51, 42], [58, 27], [67, 36], [70, 58], [69, 69]]);
    shape(context, '#7aadcf', [[24, 66], [33, 24], [39, 3], [48, 15], [51, 42], [45, 65]]);
    shape(context, '#c2f5f6', [[33, 24], [39, 3], [48, 15], [43, 22], [39, 46]]);
    shape(context, '#9292ce', [[45, 65], [51, 42], [58, 27], [60, 56], [57, 69]]);
    shape(context, '#b4e0f2', [[51, 42], [58, 27], [67, 36], [64, 43], [59, 44]]);
    box(context, '#dbf6fa', 18, 63, 11, 3);
  }
  box(context, desert ? '#bc7a64' : '#abd5e7', 22, 68, 35, 2);
}

function drawForeground(context, colors, desert) {
  drawHorizon(context, colors[0], 183);
  const next = randomSequence(138);
  for (let x = 8; x < 763; x += 8 + Math.floor(next() * 23)) {
    const y = 184;
    const h = 4 + Math.floor(next() * 18);
    if (desert) {
      box(context, colors[1], x, y - h, 2, h);
      box(context, colors[1], x - 3, y - h + 4, 2, 5);
      box(context, colors[1], x - 3, y - h + 8, 5, 2);
    } else {
      shape(context, colors[1], [[x - 4, y], [x, y - h], [x + 4, y - h + 5], [x + 6, y]]);
      box(context, colors[0], x + 2, y - Math.floor(h / 2), 3, Math.floor(h / 2));
    }
  }
}

function drawRock(context, height, colors, desert) {
  const [shadow, base, middle, edge, top, fleck] = colors;
  box(context, shadow, 0, 0, 48, height);
  box(context, base, 0, 4, 48, Math.min(height - 4, 12));
  const next = randomSequence(37);
  for (let index = 0; index < height * 1.3; index += 1) {
    const x = Math.floor(next() * 48);
    const y = 5 + Math.floor(next() * (height - 5));
    box(context, index % 4 === 0 ? middle : base, x, y, 2 + Math.floor(next() * 8), 1 + (index % 2));
  }
  if (height > 12) {
    for (const [x, y, width] of [[0, 14, 21], [8, 24, 22], [31, 20, 17], [32, 31, 11]]) {
      box(context, middle, x, y, width, 1);
    }
  }
  box(context, edge, 0, 1, 48, 3);
  box(context, top, 0, 0, 48, 1);
  for (const [x, width] of [[2, 5], [13, 8], [28, 6], [40, 5]]) {
    box(context, fleck, x, 2, width, desert ? 2 : 4);
  }
}

export function createThemeArt(scene, theme) {
  if (theme === 'verdant' || scene.textures.exists(theme + '-sky')) return;
  const colors = LANDSCAPES[theme];
  const desert = theme !== 'crystal';
  texture(scene, theme + '-sky', 2, VIEW_HEIGHT, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    colors.sky.forEach((color, index) => gradient.addColorStop(index * 0.5, color));
    box(ctx, gradient, 0, 0, 2, VIEW_HEIGHT);
  });
  texture(scene, theme + '-sun', 42, 40, (ctx) => {
    shape(ctx, colors.sun[0], [[12, 0], [30, 0], [30, 4], [36, 4], [36, 9], [42, 9], [42, 30],
      [36, 30], [36, 36], [30, 36], [30, 40], [12, 40], [12, 36], [6, 36], [6, 30],
      [0, 30], [0, 9], [6, 9], [6, 4], [12, 4]]);
    box(ctx, colors.sun[1], 6, 30, 30, 3);
    box(ctx, colors.sun[1], 12, 36, 18, 4);
  });
  texture(scene, theme + '-clouds', 768, VIEW_HEIGHT, (ctx) => {
    for (const [x, y, width] of [[21, 48, 72], [126, 62, 56], [254, 37, 79], [391, 59, 90],
      [542, 29, 64], [641, 49, 82]]) {
      box(ctx, colors.clouds[0], x, y + 4, width, 3);
      box(ctx, colors.clouds[1], x + 9, y + 1, width - 15, 3);
      box(ctx, colors.clouds[1], x + 22, y - 2, width - 39, 3);
    }
  });
  texture(scene, theme + '-mountains', 768, VIEW_HEIGHT, (ctx) => drawRidges(ctx, colors.ridge, desert));
  texture(scene, theme + '-hills', 768, VIEW_HEIGHT, (ctx) => drawSlopes(ctx, colors.hills));
  texture(scene, theme + '-pines', 768, VIEW_HEIGHT, (ctx) => drawForeground(ctx, colors.foreground, desert));
  texture(scene, theme + '-tree', 72, 70, (ctx) => {
    if (theme === 'jungle') {
      box(ctx, '#555167', 32, 25, 9, 45);
      shape(ctx, '#52694e', [[3,29],[16,13],[26,13],[34,4],[47,4],[54,10],[67,13],[72,30],[53,37],[34,30],[15,39]]);
      shape(ctx, '#a4ae6b', [[4,28],[16,13],[26,13],[34,4],[47,4],[54,10],[66,13],[54,18],[34,12],[22,21]]);
      box(ctx, '#af8cb7', 16, 33, 3, 15);
      box(ctx, '#af8cb7', 54, 30, 2, 17);
      return;
    }
    if (theme === 'thunder') {
      box(ctx, '#3a4566', 27, 14, 19, 56);
      box(ctx, '#687c9b', 32, 18, 3, 48);
      box(ctx, '#4b5173', 15, 18, 43, 8);
      box(ctx, '#b7f1ec', 18, 20, 37, 2);
      box(ctx, '#d5b8f2', 35, 5, 4, 15);
      return;
    }
    if (theme !== 'castle') return drawLandscapeProp(ctx, desert);
    box(ctx, '#453b60', 13, 19, 44, 51);
    box(ctx, '#675674', 16, 21, 18, 49);
    for (const x of [13, 24, 37, 48]) box(ctx, '#806989', x, 12, 8, 11);
    for (const y of [30, 47, 61]) box(ctx, '#3f3456', 13, y, 44, 2);
    box(ctx, '#d88aad', 39, 31, 5, 11);
  });
  texture(scene, theme + '-ground', 48, 40, (ctx) => drawRock(ctx, 40, colors.terrain, desert));
  texture(scene, theme + '-platform', 48, 12, (ctx) => drawRock(ctx, 12, colors.terrain, desert));
  texture(scene, theme + '-slime-rest', 18, 13, (ctx) => drawSlime(ctx, false, colors.slime));
  texture(scene, theme + '-slime-hop', 18, 13, (ctx) => drawSlime(ctx, true, colors.slime));
}
