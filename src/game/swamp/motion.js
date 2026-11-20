import { GROUND_Y } from '../level-one.js';
import { randomFrom, shape } from './scenery.js';

export function addReactiveFerns(scene) {
  const key = 'swamp-ferns';
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 54, 39);
    const ctx = texture.context, random = randomFrom(1129);
    for (let stem = 0; stem < 9; stem++) {
      const direction = stem - 4, tipX = 27 + direction * (3.4 + random() * 2);
      const tipY = 4 + Math.abs(direction) * 3 + random() * 6;
      ctx.strokeStyle = '#35553b';
      ctx.lineWidth = .7;
      ctx.beginPath();
      ctx.moveTo(27, 38);
      ctx.quadraticCurveTo(28 + direction, 15, tipX, tipY);
      ctx.stroke();
      for (let leaf = 2; leaf < 8; leaf++) {
        const t = leaf / 8;
        const x = 27 + (tipX - 27) * t * t, y = 38 + (tipY - 38) * t;
        const width = 5 - t * 3;
        const green = leaf % 2?'#63894d':'#426d43';
        shape(ctx,green,[[x,y],[x-width-2,y-3],[x-width,y-5],[x+.6,y-2],[x+width,y-4],[x+width+1,y-2]]);
      }
    }
    texture.refresh();
  }
  const plants = [];
  for (const [start, end] of scene.level.ground) {
    const random = randomFrom(start + 298);
    for (let x = start + 23; x < end - 15; x += 28 + random() * 27) {
      const sprite = scene.add.image(x, GROUND_Y + 1, key).setOrigin(.5,1)
        .setScale(.36 + random() * .37).setFlipX(random()>.5).setDepth(-1.64);
      scene.swamp.light?.(sprite);
      scene.swamp.cast?.(sprite,false,true);
      plants.push({ sprite, phase: random() * 6.28, angle: 0, speed: 0 });
    }
  }
  return delta => {
    const time = scene.elapsed / 1100;
    const player = scene.player;
    const dt = Math.min(30, delta) / 1000;
    const motion = !scene.ui.reduceMotion;
    const left = scene.cameras.main.scrollX - 35, right = left + scene.cameras.main.width + 70;
    for (const plant of plants) {
      const { sprite, phase } = plant;
      if (sprite.x < left || sprite.x > right) continue;
      const distance = player.x - sprite.x;
      const proximity = player.y > 154 ? Math.max(0, 1 - Math.abs(distance) / 24) : 0;
      const target = motion ? .1 * Math.sin(time * 1.9 + phase) + proximity *
        Math.max(-.49,Math.min(.49,player.body.velocity.x * .004)) : 0;
      plant.speed = (plant.speed + (target - plant.angle) * 52 * dt) * Math.exp(-dt * 6);
      plant.angle += plant.speed * dt;
      sprite.setRotation(plant.angle);
    }
  };
}
