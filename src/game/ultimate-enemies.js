import { terrainBlocks } from './monster-ai.js';
import { REALMS } from './legends-worlds.js';
import { expandedClips, paintedAtlas } from './rendering/painted-atlas.js';
import { actorBiome } from './rendering/actor-art.js';
import { paintEnemy } from './rendering/painted-enemy.js';

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

const looping = new Set(['patrol','idle']);
const clips = expandedClips({patrol:4,idle:4,air:4,windup:3,strike:4,recover:3,evade:3,hit:3,fall:4},looping);

export const ultimateTexture=(scene,type)=>'painted-enemy-'+actorBiome(scene)+'-'+type;

export function loadUltimateEnemies(scene,roster=Object.keys(ULTIMATE_ENEMIES)) {
  for(const type of new Set(roster)){
    if(!Object.hasOwn(ULTIMATE_ENEMIES,type))continue;
    paintedAtlas(scene,ultimateTexture(scene,type),38,34,clips,(ctx,x,y,clip,frame,count,palette)=>
      paintEnemy(palette,ctx,x,y,38,34,type,clip,frame,count));
  }
}

export function ultimateEnemyFrame(enemy,time,reduced) {
  const state = enemy.getData('ultimateState');
  const hit = time < (enemy.getData('shadowHitUntil') ?? 0);
  const { x,y } = enemy.body.velocity;
  const phase = hit ? 'hit' : state.phase !== 'patrol' ? state.phase :
    !flyingUltimate(enemy.getData('type')) && Math.abs(y)>50 ? 'air' : Math.abs(x)<5 ? 'idle' : 'patrol';
  const frames = clips[phase];
  if (reduced) return phase + (phase === 'strike' ? 3 : 0);
  if (looping.has(phase) || phase==='air') return phase + Math.floor(time / (118/3)) % frames;
  const age = time - (phase === 'hit' ? enemy.getData('shadowHitUntil') - 240 : state.started ?? time);
  const frame = Math.max(0,Math.min(frames-1,Math.floor(age/(phase==='windup'?60:55/3))));
  return phase + frame;
}

export function ultimateFallFrame(progress) {
  return 'fall'+Math.min(clips.fall-1,Math.floor(progress*clips.fall));
}
