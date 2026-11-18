import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canParry, PARRY } from '../src/game/combat-techniques.js';
import { bindingsFor, gamepadActions } from '../src/game/controls.js';
import { enemyPhase, ultimateGuard, ULTIMATE_ENEMIES } from '../src/game/ultimate-enemies.js';
import { createSurvival, ultimateLevel, waveComposition } from '../src/game/ultimate-levels.js';
import { clearRank, createTally, createUltimateProgress } from '../src/game/ultimate-progress.js';
import { canWallJump, wallSide } from '../src/game/wall-movement.js';
import { LEVELS } from '../src/game/levels.js';

test('Parry uses a short frontal window and consumes its protection on success', () => {
  const action = { since:200, direction:1 };
  assert(!canParry(action,200+PARRY.start-1,25,0));
  assert(canParry(action,200+PARRY.start,25,0));
  assert(!canParry(action,200+PARRY.start,-20,0));
  assert(!canParry(action,200+PARRY.end,25,0));
  action.success = true;
  assert(!canParry(action,200+PARRY.start,25,0));
});

test('wall movement requires an authored collider and allows one wall launch in the air', () => {
  const body = { left:30,right:42,top:135,bottom:153,blocked:{right:true} };
  const walls = {getChildren:()=>[{body:{left:42,right:50,top:111,bottom:180}}]};
  assert.equal(wallSide(body,walls,1),1);
  assert.equal(wallSide(body,walls,-1),0);
  assert.equal(wallSide(body,null,1),0);
  const state = { airUsed:true };
  assert(canWallJump(state,1,true));
  state.wallJumpUsed = true;
  assert(!canWallJump(state,1,true));
  assert(state.airUsed);
});

test('enemy windup cannot skip its telegraph and directional shield opens after a heavy strike', () => {
  const brain = {phase:'patrol',until:0,facing:1};
  assert.equal(enemyPhase(brain,0,false),'patrol');
  assert.equal(enemyPhase(brain,0,true),'windup');
  Object.assign(brain,{phase:'windup',until:600});
  assert.equal(enemyPhase(brain,599,true),'windup');
  assert.equal(enemyPhase(brain,600,false),'recover');
  assert.equal(enemyPhase(brain,600,true),'strike');
  const enemy = {x:40,y:184,data:{values:{type:'ironGuardian',ultimateState:brain}},
    setData(key,value){this.data.values[key]=value;}};
  const front = {x:60,y:184};
  assert(ultimateGuard(enemy,front,520));
  assert(!ultimateGuard(enemy,{x:12,y:184},520));
  assert(!ultimateGuard(enemy,front,520,true));
  assert(!ultimateGuard(enemy,front,521));
});

test('rank scoring allows S without all coins and preserves the highest score and feats', () => {
  const run = {elapsed:10000,par:20000,deaths:0,damage:0,hits:10,coins:5,total:12,defeats:3,highChain:20,counters:1};
  assert.equal(clearRank(run).rank,'S');
  assert.equal(clearRank({...run,elapsed:38000,damage:4,deaths:4,hits:3}).rank,'C');
  const store = new Map();
  const storage = {getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)};
  const progress = createUltimateProgress(storage);
  const first = progress.finish(19,{width:1000,boss:{kind:'crown'}},run,{parrySuccess:1});
  progress.finish(19,{width:1000,boss:{kind:'crown'}},{...run,elapsed:68000});
  progress.arena(6,2025);
  progress.arena(1,100);
  assert(progress.award('grove'));
  assert(!progress.award('grove'));
  const restored = createUltimateProgress(storage);
  assert.deepEqual(restored.rank(19),first);
  assert.deepEqual(restored.bestArena(),{wave:6,score:2025});
  assert(['arena','grove','clean','combo','sword','fast','parry'].every(key=>restored.has(key)));
  const tally = createTally();
  tally.hit(20); tally.hit(40,true); tally.hurt(); tally.hit(100);
  assert.deepEqual([tally.hits,tally.chain,tally.highChain,tally.damage,tally.counters],[3,1,2,1,1]);
});

test('campaign additions keep routes and coin totals and introduce each new archetype', () => {
  const levels = LEVELS.map(ultimateLevel);
  for (const [index,level] of levels.entries()) {
    assert.deepEqual(level.ground,LEVELS[index].ground);
    assert.deepEqual(level.coins,LEVELS[index].coins);
    assert.equal(level.flagX, LEVELS[index].flagX);
  }
  const enemies = new Set(levels.flatMap(level=>level.enemies.map(enemy=>enemy[3])));
  assert(Object.keys(ULTIMATE_ENEMIES).every(type=>enemies.has(type)));
  assert.deepEqual(levels.flatMap(level=>level.secret?.id ?? []),['grove','shrine']);
  const largestWave = waveComposition(55);
  assert(largestWave.length <= 6);
  assert(largestWave.every(type=>largestWave.filter(entry=>entry===type).length <= 3));
});

test('Survival reuses its enemy pool and advances through a captain wave', () => {
  const enemies = Object.keys(ULTIMATE_ENEMIES).flatMap(type=>Array.from({length:3},()=>({
    active:true,data:{type}, getData(key){return this.data[key];},
    setData(value){Object.assign(this.data,value);}, disableBody(){this.active=false;},
    enableBody(){this.active=true;return this;}, setAlpha(){return this;}, setVelocity(){return this;},
  })));
  const scene = {elapsed:0,ui:{},ninja:{enemyHp:new WeakMap()},enemies:{getChildren:()=>enemies},clearProjectiles(){}};
  const survival = createSurvival(scene);
  for (let wave=1;wave<=6;wave++) {
    scene.elapsed += 1700;
    survival.update();
    assert.equal(survival.run.wave,wave);
    assert.equal(survival.cleared(),wave-1);
    const active = enemies.filter(enemy=>enemy.active);
    assert.deepEqual(active.map(enemy=>enemy.data.type).sort(),waveComposition(wave).sort());
    if (wave%3===0) assert(active.some(enemy=>enemy.data.captain));
    for (const enemy of active) { enemy.disableBody(); survival.defeat(); }
    survival.update();
    assert.equal(survival.cleared(),wave);
  }
  assert(survival.run.score > 2000);
  assert.equal(enemies.length,9);
  assert.deepEqual([survival.hurt(),survival.hurt(),survival.hurt()],[false,false,true]);
});

test('standard gamepad maps simultaneous movement, jump, katana and parry', () => {
  const buttons = Array.from({length:16},(_,i) => ({pressed:[0,1,2,9].includes(i)}));
  const actions = gamepadActions({axes:[.9,.01],buttons});
  assert(actions.right && actions.jump && actions.attack && actions.parry && actions.pause);
  assert(!actions.left && !actions.sprint);
});

test('legacy keyboard remaps retain their key when Parry first becomes available', () => {
  const preferences={keys:{throw:'KeyQ'}};
  assert.deepEqual(bindingsFor(preferences,'throw'),['KeyQ']);
  assert.deepEqual(bindingsFor(preferences,'parry'),['KeyE']);
  assert.deepEqual(bindingsFor({},'parry'),['KeyQ']);
});
