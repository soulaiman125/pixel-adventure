import { ACTOR_DENSITY, actorBiome, configureDenseTexture, materialPen, useActorPalette } from './rendering/actor-art.js';

import { expandedClips, paintedAtlas } from './rendering/painted-atlas.js';
import { paintEnemy } from './rendering/painted-enemy.js';
import { rememberVisualTexture } from './rendering/texture-budget.js';
import { inbetweens, sampleTrack } from './rendering/frame-tracks.js';

// Scanline fills keep diagonals on the same opaque pixel grid as the hand-placed details.
export function pixelPen(context, ox = 0, oy = 0) {
  const painted = materialPen(context,ox,oy);
  if (painted) return painted;
  function rect(color, x, y, width, height) {
    context.fillStyle = color;
    context.fillRect(ox + x, oy + y, width, height);
  }
  function shape(color, ...points) {
    const low = Math.min(...points.map(point => point[1]));
    const high = Math.max(...points.map(point => point[1]));
    for (let y = low; y < high; y++) {
      const intersections = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i];
        const [bx, by] = points[(i + 1) % points.length];
        const scan = y + .5;
        if ((ay > scan) !== (by > scan)) intersections.push(ax + (scan - ay) * (bx - ax) / (by - ay));
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i < intersections.length; i += 2) {
        const start = Math.ceil(intersections[i] - .5);
        rect(color, start, y, Math.ceil(intersections[i + 1] - .5) - start, 1);
      }
    }
  }
  return { rect, shape };
}

const outfits = {
  scout: ['#234450', '#3e8081', '#85c4ae', '#8d2941', '#dc5d54', '#ffac71'],
  ember: ['#54404a', '#9a5760', '#e1a088', '#7b2943', '#ec633b', '#ffca79'],
  frost: ['#344c77', '#567faa', '#b2ddf4', '#326476', '#56a8bf', '#b9fff1'],
  storm: ['#35345e', '#6864a0', '#b4b8e8', '#55458f', '#9166d9', '#ded0ff'],
};
const ink = '#17232d';
const dark = '#25343c';
const metal = '#77a5ac';
const shine = '#d9efcf';
const gold = '#ebbe71';

export const heroClips = inbetweens({idle:4,run:8,rise:3,fall:3,land:3,attack:4,
  hurt:2,recoil:3,death:5,respawn:4,victory:4},new Set(['idle','run','victory']));
export const brambleClips = expandedClips({idle:4,patrol:6,air:3,windup:3,lunge:3,hurt:2,death:5},new Set(['idle','patrol']));
const heroSteps = [[-4,4],[-2,3],[0,2],[3,-2],[4,-4],[2,-3],[0,-2],[-3,2]];

function hero(context, ox, oy, pose, frame, colors) {
  const { rect: r, shape: s } = pixelPen(context, ox, oy);
  const [shadow, armor, light, clothDark, cloth, clothLight] = colors;
  const dead = pose === 'death';
  const crouch = dead ? frame * 4 : pose === 'land' ? sampleTrack([4,3,1],frame) : 0;
  const recoil = pose === 'hurt' || pose === 'recoil';
  const run = pose === 'run';
  const rising = pose === 'rise';
  const falling = pose === 'fall';
  const air = rising || falling;
  const step = run ? sampleTrack([0,1,2,1,0,1,2,1],frame,true) : 0;
  const low = crouch + step + (recoil ? frame + 1 : pose === 'idle' && frame === 2 ? 1 : 0);
  const face = recoil ? -sampleTrack([2,5,3],frame) : pose === 'attack' && frame === 1 ? 2 : 0;
  const x = 22 + face;
  const y = 11 + low;
  if (dead && frame === 4) {
    r(clothDark, 13, 41, 20, 5);
    r(cloth, 10, 42, 15, 1);
    r(metal, 27, 44, 10, 2);
    r(gold, 25, 44, 3, 2);
    return;
  }
  // A diagonal scabbard and a flared scarf separate the silhouette from the background.
  if (pose !== 'attack') {
    s(ink,[x-5,y+12],[x-2,y+12],[x+9,y+29],[x+6,y+32],[x+3,y+29],[x-7,y+14]);
    s('#8b6948',[x-4,y+14],[x-3,y+14],[x+7,y+29],[x+5,y+29]);
    r(gold,x-8,y+11,7,2);
  }
  const trail = recoil ? frame + 5 : run || air ? 4 + frame % 3 : frame % 3;
  s(ink,[x-7,y+10],[x+5,y+11],[x+6,y+16],[x-4,y+18],[x-9,y+16],[x-18-trail,y+21-trail],
    [x-16-trail,y+16-trail],[x-20-trail,y+13-trail],[x-10,y+13]);
  s(clothDark,[x-7,y+12],[x+5,y+12],[x+5,y+15],[x-5,y+17],[x-10,y+15],
    [x-17-trail,y+19-trail],[x-15-trail,y+16-trail],[x-18-trail,y+14-trail],[x-10,y+14]);
  s(cloth,[x-7,y+12],[x+4,y+12],[x+3,y+14],[x-9,y+15],[x-17-trail,y+14-trail],[x-10,y+14]);
  r(clothLight,x-4,y+12,5,1);
  // Legs and articulated boots, behind the belted coat.
  const feet = run ? sampleTrack(heroSteps,frame,true) : rising ? sampleTrack([[0,-4],[2,-4],[4,-3]],frame) :
    falling ? sampleTrack([[2,-3],[2,-2],[3,-1]],frame) : recoil ? [-4,2] : [-3,3];
  for (const [index, foot] of feet.entries()) {
    const hip = x + (index ? 3 : -4);
    const px = x + foot * 2;
    const lift = rising ? (index ? 5 + frame : 3 + frame) : falling ? (index ? 1 : 3 - frame) : 0;
    const floor = 46 - (run ? (frame + index * 4) % 4 : lift);
    s(ink,[hip-3,y+22],[hip+4,y+22],[px+3,floor-4],[px+6,floor-3],[px+6,floor],[px-4,floor],[px-4,floor-5]);
    s(index ? shadow : armor,[hip-1,y+23],[hip+2,y+23],[px+2,floor-5],[px-2,floor-4],[px-3,floor-5]);
    r(index ? metal : light,px-2,floor-4,4,2);
    r(dark,px-2,floor-2,7,1);
  }
  s(ink,[x-8,y+15],[x+5,y+15],[x+8,y+19],[x+6,y+25],[x+9,y+29],[x-7,y+28],[x-11,y+24]);
  s(shadow,[x-7,y+16],[x+4,y+16],[x+6,y+19],[x+4,y+24],[x+6,y+27],[x-7,y+26],[x-9,y+23]);
  s(armor,[x-7,y+16],[x+2,y+16],[x+4,y+19],[x+1,y+23],[x-7,y+23],[x-8,y+20]);
  s(light,[x-7,y+17],[x-2,y+16],[x+1,y+17],[x-5,y+19],[x-8,y+19]);
  r('#563e38',x-7,y+23,13,3);
  r(gold,x+1,y+23,4,3);
  r(ink,x+2,y+24,2,1);
  r(metal,x-5,y+26,2,1);
  // Head, hair, back-lit brow, and a metal brow plate.
  s(ink,[x-7,y],[x-3,y-4],[x+5,y-4],[x+9,y-1],[x+9,y+4],[x+11,y+6],[x+8,y+8],
    [x+8,y+11],[x+4,y+13],[x-4,y+12],[x-8,y+8]);
  s('#583a31',[x-6,y],[x-2,y-3],[x+4,y-3],[x+8,y-1],[x+7,y+3],[x+2,y+3],
    [x-1,y+8],[x-6,y+8]);
  s('#af7952',[x-5,y-1],[x-1,y-3],[x+4,y-3],[x+6,y-2],[x+1,y],[x-2,y+2],[x-5,y+4]);
  s('#f1b480',[x+1,y+3],[x+7,y+3],[x+8,y+5],[x+10,y+6],[x+7,y+7],[x+7,y+10],[x+4,y+11],[x-1,y+10]);
  r('#a56256',x+3,y+9,4,1);
  r('#593a37',x+5,y+5,3,recoil?2:1);
  if (!recoil && !(pose==='idle' && frame===2)) r(shine,x+5,y+5,1,1);
  r(cloth,x-4,y+10,7,3);
  r(clothLight,x-4,y+10,4,1);
  r(metal,x+1,y,7,2);
  r(shine,x+4,y,3,1);
  // Leading arm and blade silhouette change around the swing.
  const strike = pose === 'attack';
  const raise = pose === 'victory';
  const handX = x + (strike ? sampleTrack([0,11,12,7],frame) : raise ? sampleTrack([7,9,10,9],frame,true) :
    run ? 5 + feet[0] : rising ? 11 : falling ? 6 : recoil ? 10 - frame * 3 : 7);
  const handY = y + (strike ? sampleTrack([12,18,18,21],frame) : raise ? sampleTrack([12,9,8,10],frame,true) :
    rising ? sampleTrack([14,12,14],frame) : falling ? sampleTrack([16,18,21],frame) : recoil ? 11 + frame * 2 : 21);
  s(ink,[x-3,y+15],[x+3,y+14],[handX+4,handY-2],[handX+3,handY+3],[handX-2,handY+3],[x-4,y+20]);
  s(armor,[x-2,y+16],[x+2,y+15],[handX+2,handY-1],[handX,handY+2],[x-3,y+19]);
  r(light,x-2,y+16,5,2);
  r('#f0b47d',handX,handY-1,3,3);
  if (strike || raise) {
    const tipX = raise ? handX+3 : Math.min(51, handX+sampleTrack([4,16,13,8],frame));
    const tipY = raise ? handY-19 : handY+sampleTrack([-12,-4,0,8],frame);
    s(ink,[handX+1,handY-3],[tipX,tipY-1],[tipX+2,tipY+2],[handX+2,handY+4]);
    s(metal,[handX+2,handY-2],[tipX,tipY],[tipX+1,tipY+1],[handX+2,handY+2]);
    s(shine,[handX+2,handY-2],[tipX,tipY],[handX+3,handY]);
    r(gold,handX+1,handY-4,2,8);
  }
  if (pose==='respawn' && frame<3) {
    const distance=frame*3;
    r(metal,x-13-distance,y+13-distance,2,4);
    r(shine,x-14-distance,y+14-distance,4,1);
    r(shine,x+12+distance,y+27-distance,2,2);
  }
}

export function atlas(scene, key, width, height, clips, paint, density = 1) {
  if (scene.textures.exists(key)) return;
  const frames = Object.entries(clips).flatMap(([pose, count]) => Array.from({ length:count }, (_, n) => [pose, n]));
  const columns = Math.min(8,frames.length);
  const texture = scene.textures.createCanvas(key, density * columns * width, density * Math.ceil(frames.length / columns) * height);
  if (density > 1) {
    configureDenseTexture(texture,density);
    useActorPalette(texture.context,actorBiome(scene));
    texture.context.scale(density,density);
  }
  frames.forEach(([pose, n], index) => {
    const x = (index % columns) * width;
    const y = Math.floor(index / columns) * height;
    texture.context.save();
    texture.context.beginPath();
    texture.context.rect(x, y, width, height);
    texture.context.clip();
    paint(texture.context, x, y, pose, n);
    texture.context.restore();
    const frame = texture.add(pose+n,0,x*density,y*density,width*density,height*density);
    if (density>1) frame.setTrim(width,height,0,0,width,height);
  });
  texture.refresh();
}

export function actorAtlas(scene,key,width,height,clips,paint,density=ACTOR_DENSITY) {
  atlas(scene,key,width,height,clips,paint,density);
  rememberVisualTexture(scene,key);
}

export function heroAtlas(scene, costume) {
  const name = Object.hasOwn(outfits, costume) ? costume : 'scout';
  const key = 'field-hero-' + name;
  actorAtlas(scene, key, 56, 46, heroClips, (ctx, x, y, pose, frame) => hero(ctx, x + 5, y, pose, frame/2, outfits[name]));
  return key;
}

export function brambleAtlas(scene) {
  paintedAtlas(scene,'brambleback',42,29,brambleClips,(ctx,x,y,clip,frame,count,palette)=>
    paintEnemy(palette,ctx,x,y,42,29,'brambleback',clip,frame,count));
}

export function clipFrame(clips, name, age, duration, loop = false) {
  const count = clips[name];
  const tick = Math.max(0, Math.floor(age * count / duration));
  return name + (loop ? tick % count : Math.min(count - 1, tick));
}
