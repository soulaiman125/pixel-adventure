import { VIEW_HEIGHT } from '../level-one.js';
import { makeCanvas } from '../rendering/lighting.js';
import { randomFrom, shape, treeTexture } from './scenery.js';
import { canvasLayer } from '../rendering/projected-shadows.js';

export function weatherStone(ctx, width, height, seed, mossLine = 1) {
  const random = randomFrom(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < width * height / 7; i++) {
    const x = Math.floor(random() * width), y = Math.floor(random() * height);
    ctx.fillStyle = i % 3 ? '#b1ad743e' : '#101e216a';
    ctx.fillRect(x, y, 1 + Math.floor(random() * 3), 1);
  }
  for (let x = -2; x < width; x += 7 + random() * 8) {
    const y = mossLine + Math.floor(random() * 3);
    shape(ctx, '#576839', [[x,y],[x+8,y-2],[x+13,y+1],[x+9,y+3],[x+5,y+6],[x+3,y+3]]);
    ctx.fillStyle = '#a6aa63a3';
    ctx.fillRect(x + 2, y, 4 + random() * 4, .8);
  }
  for (let x = 12; x < width; x += 18 + random() * 15) {
    const y = 3 + random() * Math.max(3, height - 10);
    ctx.strokeStyle = '#101e1bb5';
    ctx.lineWidth = .8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 2, y + 2);
    ctx.lineTo(x - 1, y + 4);
    ctx.lineTo(x + 4, Math.min(height, y + 7));
    ctx.stroke();
    ctx.fillStyle = '#d0cfaa85';
    ctx.fillRect(x + 3, y + 2, 4 + random() * 2, .6);
  }
  ctx.restore();
}

export function swampSurface(scene, x, y, width, height) {
  const key = 'swamp-stone-' + x + '-' + y;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, width, height);
    const ctx = texture.context, random = randomFrom(x * 17 + y);
    const mortar = ctx.createLinearGradient(0, 0, 0, height);
    mortar.addColorStop(0, '#536b4c');
    mortar.addColorStop(.48, '#293e36');
    mortar.addColorStop(1, '#142720');
    ctx.fillStyle = mortar;
    ctx.fillRect(0, 0, width, height);
    for (let row = 0; row < height; row += 9) {
      const offset = row % 2 ? -11 : 0;
      for (let col = offset; col < width; col += 22) {
        const green = 62 + Math.floor(random() * 24);
        const stone = ctx.createLinearGradient(0, row, 0, row + 9);
        stone.addColorStop(0, 'rgb(' + (green-5) + ',' + (green+10) + ',' + (green-6) + ')');
        stone.addColorStop(.23, 'rgb(' + (green-18) + ',' + green + ',' + (green-8) + ')');
        stone.addColorStop(1, '#22372e');
        shape(ctx, stone, [[col+1,row+1],[col+19,row],[col+21,row+2],[col+21,row+7],[col+18,row+8],[col+2,row+8],[col,row+6]]);
      }
    }
    weatherStone(ctx, width, height, x * 3 + y);
    ctx.fillStyle = '#b9c17a';
    ctx.fillRect(1, 0, width - 2, 1);
    ctx.fillStyle = '#d4d8a660';
    for (let i = 3; i < width - 3; i += 9 + random() * 8) ctx.fillRect(i, 1, 2 + random() * 6, 1);
    texture.refresh();
  }
  return scene.add.image(x, y, key).setOrigin(0);
}

export function swampTree(scene, index) {
  const key = 'swamp-tree-' + index % 4;
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, 111, 114);
  const { context } = texture;
  treeTexture(context, 55, 113, 91, index + 429, ['#182b23', '#304638', '#5e6849']);
  texture.refresh();
  return key;
}

export function addSwampWater(scene) {
  const pools = scene.level.hazards.filter(({kind}) => kind === 'poisonPool');
  const view = scene.textures.get(scene.textures.exists('swamp-distance') ? 'swamp-distance' : 'campaign-world-jungle').getSourceImage();
  // Reuse the lit vista as a reflection plate. Copying the live playfield caused a Canvas readback on each moving frame.
  const reflection = makeCanvas(720,31);
  reflection.getContext('2d').drawImage(view,0,view.height*.55,view.width,view.height*.33,0,0,720,31);
  canvasLayer(scene, -.82, (ctx, camera) => {
    const width = Math.ceil(camera.width);
    const visible = pools.filter(p => Math.abs(p.x - (camera.scrollX + width / 2)) < (width + p.width) / 2);
    if (!visible.length) return;
    const time = scene.ui.reduceMotion ? 0 : scene.elapsed / 650;
    const reflectionScroll=Math.min(180,camera.scrollX*.12);
    for (const pool of visible) {
      const x = Math.max(0, pool.x - pool.width / 2 - camera.scrollX);
      const right = Math.min(width, pool.x + pool.width / 2 - camera.scrollX);
      const y = pool.y - pool.height / 2;
      if (right <= x) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, right - x, VIEW_HEIGHT - y);
      ctx.clip();
      const wet = ctx.createLinearGradient(0, y, 0, VIEW_HEIGHT);
      wet.addColorStop(0, '#8caa49b5');
      wet.addColorStop(.72, '#253d25d8');
      wet.addColorStop(1, '#1c3022');
      ctx.fillStyle = wet;
      ctx.fillRect(x, y, right - x, VIEW_HEIGHT - y);
      for (let row = 0; row < 26; row += 3) {
        const displacement = Math.sin(time * 2 + row * .48) * (1.8 + row * .09);
        ctx.globalAlpha = .37 - row * .01;
        ctx.drawImage(reflection,reflectionScroll,28-row,540,3,displacement,y+row,width,3);
      }
      ctx.globalAlpha = .74;
      ctx.fillStyle = '#bfce70';
      ctx.fillRect(x, y, right - x, 1);
      ctx.globalAlpha = .28;
      for (let i = 0; i < 8; i++) {
        const wx = (i * 43 + pool.x - time * (3 + i % 3)) % Math.max(1, right - x);
        ctx.fillRect(x + wx, y + 3 + i * 2.6, 8 + i % 3 * 5, .75);
      }
      ctx.restore();
    }
  }, false);
}
