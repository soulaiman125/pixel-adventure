import { VIEW_HEIGHT, GROUND_Y } from '../level-one.js';
import { makeCanvas } from './lighting.js';
import { canvasLayer } from './shadows.js';

export function softenDistance(source) {
  const scale = Math.min(1, 880 / source.width, 400 / source.height);
  const image = makeCanvas(Math.round(source.width * scale), Math.round(source.height * scale));
  const ctx = image.getContext('2d');
  ctx.filter = 'blur(2px) saturate(.85)';
  ctx.drawImage(source, -3, -3, image.width + 6, image.height + 6);
  return image;
}

function radial(inner, outer) {
  const target = makeCanvas(80, 80);
  const ctx = target.getContext('2d');
  const glow = ctx.createRadialGradient(40, 40, 0, 40, 40, 39);
  glow.addColorStop(0, inner);
  glow.addColorStop(.52, outer);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 80, 80);
  return target;
}

export function addSwampLamps(scene) {
  const lamps = scene.add.graphics().setDepth(-1.4);
  for (const {x,y} of scene.swamp.lamps) {
    lamps.fillStyle(0x202823).fillRect(x - 1, y, 3, GROUND_Y - y);
    lamps.fillStyle(0x394438).fillRect(x - 5, y - 8, 11, 14);
    lamps.fillStyle(0x101d18).fillTriangle(x - 7, y - 8, x + 8, y - 8, x, y - 13);
    lamps.fillStyle(0xd8a04b).fillRect(x - 3, y - 5, 7, 8);
    lamps.fillStyle(0xffe389).fillRect(x - 1, y - 4, 3, 5);
  }
}

export function addSwampPost(scene) {
  const occlusion = radial('#06150fbd', '#09201755');
  const torch = radial('#fff0a784', '#deb65b26');
  const coinGlow = radial('#f7ce6839', '#eeba5220');
  const green = radial('#a0d28185', '#66985428');
  canvasLayer(scene, .56, (ctx, camera) => {
    const left = camera.scrollX - 62, right = camera.scrollX + camera.width + 62;
    for (const [x, scale] of scene.level.trees) {
      if (x < left || x > right) continue;
      ctx.drawImage(occlusion, x - 46 * scale, GROUND_Y - 7, 92 * scale, 21);
    }
    for (const [start, end] of scene.level.ground) {
      if (start > right || end < left) continue;
      ctx.drawImage(occlusion, start - 11, GROUND_Y, 28, 16);
      ctx.drawImage(occlusion, end - 22, GROUND_Y, 30, 16);
    }
  });
  canvasLayer(scene, 5.7, (ctx, camera) => {
    const left = camera.scrollX - 55, right = camera.scrollX + camera.width + 55;
    ctx.globalCompositeOperation = 'screen';
    for (const { x,y } of scene.swamp.lamps) {
      if (x < left || x > right) continue;
      ctx.drawImage(torch, x - 50, y - 50, 100, 100);
    }
    for (const coin of scene.coins.getChildren()) {
      if (!coin.active || coin.x < left || coin.x > right) continue;
      ctx.drawImage(coinGlow, coin.x - 8, coin.y - 8, 16, 16);
    }
    for (const shot of scene.ninja?.projectiles ?? []) {
      if (shot.active && shot.x >= left && shot.x <= right)
        ctx.drawImage(green, shot.x - 13, shot.y - 13, 26, 26);
    }
  });
  let cache, width;
  canvasLayer(scene, 10.7, (ctx, camera) => {
    if (width !== camera.width) {
      width = camera.width;
      cache = makeCanvas(width, VIEW_HEIGHT);
      const paint = cache.getContext('2d');
      const edges = paint.createRadialGradient(width * .49, VIEW_HEIGHT * .44, 19,
        width * .50, VIEW_HEIGHT * .46, Math.max(132, width * .61));
      edges.addColorStop(.10, 'transparent');
      edges.addColorStop(.62, '#12281b05');
      edges.addColorStop(1, '#101a12b0');
      paint.fillStyle = edges;
      paint.fillRect(0, 0, width, VIEW_HEIGHT);
    }
    // A soft-light olive grade adds contrast without reading back the front buffer.
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = '#95a16634';
    ctx.fillRect(0, 0, width, VIEW_HEIGHT);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(cache, 0, 0);
  }, false);
}
