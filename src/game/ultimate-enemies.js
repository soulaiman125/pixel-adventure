import { terrainBlocks } from './monster-ai.js';
import { atlas, pixelPen } from './prototype-sprites.js';
import { REALMS } from './legends-worlds.js';

export const ULTIMATE_ENEMIES = {
  shadowRival: { reach:49, wind:620, active:210, recovery:530, hp:17, colors:['#161d35','#3f416d','#e670b3','#ffe6df'] },
  ironGuardian: { reach:45, wind:880, active:190, recovery:830, hp:25, colors:['#273331','#52635a','#eab774','#fff0bd'] },
  nightHunter: { reach:126, wind:730, active:180, recovery:750, hp:12, colors:['#22213e','#585383','#99f4de','#eeeaff'] },
};
const roles = [
  ['duelist','flier','caster'], ['guard','duelist','caster'], ['flier','guard','flier'],
  ['flier','duelist','guard'], ['guard','duelist','caster'],
];
for (const [world,realm] of REALMS.entries()) {
  for (const [index,id] of realm.enemies.entries()) {
    const role=roles[world][index];
    const ranged=role==='flier'||role==='caster';
    ULTIMATE_ENEMIES[id] = {role, reach:ranged ? 93+index*12 : role==='guard' ? 42 : 49,
      wind:730+index*80, active:190, recovery:560+index*90, hp:role==='guard'?24:ranged?12:16,
      colors:realm.colors, shot:ranged ? [104+world*6,role==='flier'?44:0,role==='caster'?100:0] : undefined};
  }
}
export const flyingUltimate = type => type==='nightHunter' || ULTIMATE_ENEMIES[type]?.role==='flier';
export const armouredUltimate = type => type==='ironGuardian' || ULTIMATE_ENEMIES[type]?.role==='guard';

export function enemyPhase(state, now, visible) {
  if (state.phase === 'patrol') return visible ? 'windup' : 'patrol';
  if (now < state.until) return state.phase;
  if (state.phase === 'windup') return visible ? 'strike' : 'recover';
  if (state.phase === 'strike' || state.phase === 'evade') return 'recover';
  return 'patrol';
}

export function ultimateGuard(enemy, source, time, heavy = false) {
  const { type, ultimateState:state, exposedUntil } = enemy.data.values;
  if (!state || time < (exposedUntil ?? 0) || state.phase === 'recover' ||
    source.y < enemy.y - 18 || (source.x - enemy.x) * state.facing < 0) return false;
  if (armouredUltimate(type) && (state.phase === 'patrol' || state.phase === 'windup')) {
    if (heavy) {
      enemy.setData('exposedUntil',time + 880);
      return false;
    }
    return true;
  }
  if ((type !== 'shadowRival' && ULTIMATE_ENEMIES[type]?.role !== 'duelist') || state.phase !== 'patrol' || time < (state.nextParry ?? 0)) return false;
  state.frontHits = (state.frontHits ?? 0) + 1;
  if (state.frontHits < 2 || heavy) return false;
  state.frontHits = 0;
  state.nextParry = time + 2200;
  state.phase = 'evade';
  state.until = time + 160;
  return true;
}

export function updateUltimateEnemy(scene, enemy, fire, hit) {
  const { type, left, right, speed, ultimateState:state, signal, captain } = enemy.data.values;
  const def = ULTIMATE_ENEMIES[type];
  const { player, elapsed:now } = scene;
  const dx = player.x - enemy.x;
  const airborne = flyingUltimate(type);
  const ranged = airborne || def.role === 'caster';
  const seen = enemy.x >= scene.cameraX + 4 && enemy.x <= scene.cameraX + scene.scale.width - 4
    && Math.abs(dx) < def.reach + (state.phase === 'windup' ? 16 : 0)
    && Math.abs(player.y - enemy.y) < (airborne ? 75 : 28)
    && !terrainBlocks(scene,enemy.x,enemy.y-8,player.x,player.y-10);
  const next = enemyPhase(state,now,seen);
  if (next !== state.phase) {
    state.phase = next;
    state.started = now;
    if (next === 'windup') {
      state.facing = Math.sign(dx) || 1;
      state.until = now + def.wind;
      scene.ui.playSound(ranged ? 'hunterCue' : 'charge');
    } else if (next === 'strike') {
      state.until = now + def.active;
      state.connected = false;
      if (ranged) {
        const [speed,arc,gravity]=def.shot ?? [111,0,0];
        const rise=airborne ? Math.max(-50,Math.min(58,(player.y-enemy.y)*1.9)) : -27;
        fire(scene,enemy.x+state.facing*10,enemy.y-7,state.facing*speed,rise-arc*.25,4,
          Number.parseInt(def.colors[3].slice(1),16),gravity,{ground:true,lifetime:1240});
      }
      scene.ui.playSound(ranged ? 'shuriken' : 'katana3');
    } else if (next === 'recover') state.until = now + def.recovery;
  }
  const side = state.facing;
  let vx = 0;
  if (state.phase === 'patrol') {
    if (enemy.x <= left) state.facing = 1;
    if (enemy.x >= right) state.facing = -1;
    vx = state.facing * speed * (airborne ? .78 : type === 'ironGuardian' ? .55 : 1.05);
  } else if (state.phase === 'evade') vx = -side * 86;
  else if (state.phase === 'strike' && !ranged) {
    vx = side * (armouredUltimate(type) ? 28 : 84);
    const range = captain ? 38 : armouredUltimate(type) ? 34 : 29;
    if (!state.connected && (player.x-enemy.x)*side >= -5 && Math.abs(player.x-enemy.x) <= range
      && Math.abs(player.y-enemy.y) < 14) {
      state.connected = true;
      hit(enemy.x, enemy);
    }
  }
  if (vx < 0 && enemy.x <= left || vx > 0 && enemy.x >= right) vx = 0;
  enemy.setFlipX(state.facing < 0).setVelocityX(vx);
  if (airborne) {
    const altitude = state.phase === 'patrol' || state.phase === 'recover' ? 143 + Math.sin(now/290 + left)*12 : 151;
    enemy.setVelocityY((altitude-enemy.y)*7);
  }
  signal.clear();
  if (state.phase === 'windup') {
    const reach = ranged ? 42 : captain ? 38 : 31;
    signal.fillStyle(0x7debdf,.85).fillRect(Math.min(enemy.x,enemy.x+side*reach),enemy.y-9,reach,1)
      .fillRect(enemy.x-1,enemy.y-31,2,7).fillRect(enemy.x-1,enemy.y-22,2,2);
  }
}

// Each row specifies head, front foot, weapon arm and wing/shield angles in pixel coordinates.
const POSES = {
  patrol:[[12,7,17,29,18,18,5],[13,8,14,27,17,19,8],[12,7,9,29,15,18,5],[11,8,11,27,16,16,10]],
  windup:[[11,9,15,29,11,18,8],[10,10,15,30,7,15,11],[9,11,17,30,5,14,13]],
  strike:[[13,8,15,28,13,8,5],[16,11,21,29,27,13,2],[17,13,20,29,29,19,7],[15,12,18,29,22,24,11]],
  recover:[[15,12,18,29,21,23,11],[12,13,15,29,16,23,13],[12,9,14,29,15,19,7]],
  evade:[[17,10,19,29,19,13,11],[13,12,20,28,13,15,7],[10,10,17,28,11,16,10]],
  hit:[[11,9,14,29,15,17,7],[8,10,12,30,9,20,12],[10,10,15,29,12,21,7]],
  fall:[[10,10,16,29,11,18,7],[8,16,19,30,10,24,15],[10,22,23,31,13,28,22],[16,26,23,32,23,30,24]],
};

export function loadUltimateEnemies(scene, roster=Object.keys(ULTIMATE_ENEMIES)) {
  for (const [type,{colors}] of Object.entries(ULTIMATE_ENEMIES)) {
    if (!roster.includes(type) || scene.textures.exists(type)) continue;
    const clips = Object.fromEntries(Object.entries(POSES).map(([name,poses])=>[name,poses.length]));
    atlas(scene,type,38,34,clips,(ctx,x,y,clip,frame)=>{
      const pen = pixelPen(ctx,x,y);
      const rect = (px,py,width,height,color) => pen.rect(color,px,py,width,height);
      const line = (ax,ay,bx,by,color,width) => {
        const length = Math.max(1,Math.abs(bx-ax),Math.abs(by-ay));
        for (let i=0;i<=length;i++) {
          rect(Math.round(ax+(bx-ax)*i/length-width/2),Math.round(ay+(by-ay)*i/length-width/2),width,width,color);
        }
      };
      const [hx,hy,fx,fy,ax,ay,wing] = POSES[clip][frame];
      const [ink,metal,mark,light] = colors;
      const heavy = armouredUltimate(type);
      const flying = flyingUltimate(type);
      if (flying) {
        line(hx-2,hy+12,2,wing,ink,6);
        line(hx-1,hy+10,3,wing,metal,3);
        line(hx+7,hy+12,23,wing+2,ink,6);
        line(hx+8,hy+10,23,wing+2,metal,3);
      }
      line(hx+2,hy+14,Math.max(3,hx-5),fy-1,ink,6);
      line(hx+5,hy+14,fx,fy,ink,7);
      line(hx+5,hy+14,fx,fy-1,metal,4);
      rect(fx-2,fy,7,3,ink);
      rect(hx-2,hy+7,heavy?14:11,Math.min(13,31-hy),ink);
      rect(hx,hy+8,heavy?10:8,Math.min(9,28-hy),metal);
      rect(hx-2,hy,11,9,ink);
      rect(hx,hy,7,3,metal);
      rect(hx+4,hy+3,5,2,mark);
      rect(hx+7,hy+3,2,1,light);
      line(hx+5,hy+11,ax,ay,ink,6);
      line(hx+5,hy+10,ax,ay,metal,3);
      rect(ax-1,ay-1,3,3,mark);
      if (heavy && clip !== 'fall') {
        rect(ax-2,ay-4,9,12,ink);
        rect(ax,ay-3,6,9,metal);
        rect(ax+2,ay-2,2,6,mark);
      } else if (!flying) {
        line(ax,ay,Math.min(36,ax+8),Math.max(1,ay-6),ink,4);
        line(ax,ay,Math.min(36,ax+8),Math.max(1,ay-6),light,2);
      } else rect(ax+3,ay-1,3,3,light);
      line(hx-1,hy+8,Math.max(2,hx-7),hy+11+frame%3,mark,2);
    });
  }
}

export function ultimateEnemyFrame(enemy,time,reduced) {
  const state = enemy.getData('ultimateState');
  const phase = time < (enemy.getData('shadowHitUntil') ?? 0) ? 'hit' : state.phase;
  const frames = POSES[phase].length;
  if (reduced) return phase + (phase === 'strike' ? 1 : 0);
  if (phase === 'patrol') return phase + (Math.floor(time / 118) % frames);
  const age = time - (phase === 'hit' ? enemy.getData('shadowHitUntil') - 240 : state.started ?? time);
  const frame = Math.max(0,Math.min(frames-1,Math.floor(age/(phase==='windup'?180:55))));
  return phase + frame;
}
