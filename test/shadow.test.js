import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canDash, DASH, horizontalEntry, intersects, KATANA, refill, SHURIKEN, spendCharge, stepStrike, strikeBox } from '../src/game/shadow-rules.js';
import { shadowFrames } from '../src/game/shadow-art.js';
import { updateDash, updateShadowCombat } from '../src/game/shadow-combat.js';
import { updateCombat } from '../src/game/combat.js';

test('Shadow Ninja has 33 authored pose sets with consistent integer anchors', () => {
  assert.equal(Object.keys(shadowFrames).length, 33);
  for (const frames of Object.values(shadowFrames)) {
    assert(frames.length > 2);
    assert(frames.every(({ hips, chest, head }) => [...hips, ...chest, ...head].every(Number.isInteger)));
    assert(new Set(frames.map(JSON.stringify)).size >= 3);
  }
});

test('katana buffers one follow-up during the window, locks direction per strike and resets after recovery', () => {
  const state = { attack: null };
  const press = (time, direction = 1) => stepStrike(state, time, true, direction, true);
  const tick = (time, direction = 1) => stepStrike(state, time, false, direction, true);
  press(0);
  press(40, -1);
  assert.equal(state.attack.queued, false);
  assert.equal(state.attack.direction, 1);
  press(100);
  press(170);
  tick(182, -1);
  assert.deepEqual([state.attack.index, state.attack.direction], [1, -1]);
  press(315);
  tick(397);
  assert.equal(state.attack.index, 2);
  press(630);
  assert.equal(state.attack.queued, false);
  tick(746);
  assert.equal(state.attack.index, 2);
  tick(747);
  assert.equal(state.attack, null);
  press(748);
  assert.equal(state.attack.index, 0);
});

test('katana has increasing damage and distinct, forward-only active boxes', () => {
  assert.deepEqual(KATANA.map(({damage}) => damage), [10,12,20]);
  const target = { left: 121, right: 126, top: 153, bottom: 164 };
  const boxes = KATANA.map(spec => strikeBox(spec, 100, 184, 1));
  assert(!intersects(boxes[0], target));
  assert(intersects(boxes[1], target));
  assert(intersects(boxes[2], { ...target, bottom: 182 }));
  assert(!intersects(strikeBox(KATANA[2], 100, 184, -1), target));
  assert(KATANA.every(({open,close,duration}) => open < close && close < duration));
});

test('ground dash honors a cooldown and air dash cannot refresh from a wall or attack state', () => {
  const state = { groundDashAt: 900, airUsed: false };
  assert(!canDash(state, 899, true));
  assert(canDash(state, 900, true));
  assert(canDash(state, 0, false));
  state.airUsed = true;
  assert(!canDash(state, 9999, false));
  state.attack = {};
  assert(!canDash(state, 9999, true));
  assert(DASH.cooldown > DASH.duration);
});

test('shuriken has three charges and refills one charge at a time without overfilling', () => {
  const state = { charges: 3, rechargeAt: Infinity };
  for (let i = 0; i < 3; i++) assert(spendCharge(state, i * 400));
  assert(!spendCharge(state, 1200));
  refill(state, SHURIKEN.recharge - 1);
  assert.equal(state.charges, 0);
  refill(state, SHURIKEN.recharge);
  assert.equal(state.charges, 1);
  refill(state, 60000);
  assert.equal(state.charges, 3);
});

test('swept shuriken uses the first radius-aware contact in either direction', () => {
  const wall = { left: 15, right: 18, top: 5, bottom: 20 };
  assert.equal(horizontalEntry(0, 40, 15, wall, 2), 13 / 40);
  assert.equal(horizontalEntry(40, 0, 15, wall, 2), .5);
  assert.equal(horizontalEntry(1, 12, 15, wall, 2), Infinity);
  assert.equal(horizontalEntry(0, 40, 2, wall, 2), Infinity);
  assert.equal(horizontalEntry(16, 11, 15, wall, 2), 0);
});

test('a live katana window hands numeric damage to the boss once per strike', () => {
  const fight = [];
  const attack = { index: 2, since: 0, direction: 1, queued: false, hit: new Set() };
  const scene = {
    ninja: { attack, charges: 3, projectiles: [] },
    elapsed: 155,
    player: { x: 100, y: 184, setFlipX() {} },
    controls: { isDown: () => false, consumeThrow: () => false },
    enemies: { getChildren: () => [] },
    boss: { x: 126, hp: 6, phase: 'open' },
    ui: { reduceMotion: true, playSound() {} },
    burst() {},
  };
  const hit = (damage) => { fight.push(damage); return true; };
  updateShadowCombat(scene, 16, false, hit);
  scene.elapsed = 171;
  updateShadowCombat(scene, 16, false, hit);
  assert.deepEqual(fight, [2]);
});

test('a ground dash leaving a ledge spends the air dash until an actual landing', () => {
  const body={ blocked:{left:false,right:false},maxVelocity:{x:132},velocity:{x:0,y:0},
    setAllowGravity(value){this.allowGravity=value;},setVelocityY(value){this.velocity.y=value;} };
  let pressed=true;
  const scene={
    elapsed:0,ninja:{airUsed:false,groundDashAt:0,dash:null},controls:{consumeDash(){const value=pressed;pressed=false;return value;}},
    ui:{playSound(){}},player:{flipX:false,body,setFlipX(value){this.flipX=value;return this;},
      setAccelerationX(){return this;},setDragX(){return this;},setVelocityX(value){body.velocity.x=value;return this;}},
  };
  assert(updateDash(scene,true,1));
  scene.elapsed=50;
  assert(updateDash(scene,false,1));
  assert(scene.ninja.airUsed);
  scene.elapsed=170;
  assert(!updateDash(scene,false,1));
  pressed=true;
  assert(!updateDash(scene,false,1));
  assert(scene.ninja.airUsed);
  updateDash(scene,true,1);
  assert(!scene.ninja.airUsed);
  pressed=true;
  assert(updateDash(scene,false,1));
  assert.equal(body.allowGravity,false);
  body.blocked.right=true;
  scene.elapsed=180;
  assert(!updateDash(scene,false,1));
  assert.equal(body.allowGravity,true);
  assert(scene.ninja.airUsed);
});

test('ranged guard tests use the approach side even after the player turns', () => {
  const values={type:'guard',exposedUntil:0};
  const enemy={x:130,y:184,active:true,flipX:false,body:{left:123,right:138,top:168,bottom:184,velocity:{x:20}},
    data:{values},getData(key){return values[key];},setData(key,value){values[key]=value;}};
  const shot={x:145,y:175,active:true,direction:-1,expires:1000,since:0,
    setActive(value){this.active=value;return this;},setVisible(){return this;}};
  let defeated=false;
  const scene={
    elapsed:100,level:{width:400},ninja:{charges:3,attack:null,throw:null,enemyHp:new WeakMap(),projectiles:[shot]},
    player:{x:20,y:184,flipX:false},controls:{isDown:()=>false,consumeThrow:()=>false},
    enemies:{getChildren:()=>[enemy]},ground:{getChildren:()=>[]},platforms:{getChildren:()=>[]},
    ui:{reduceMotion:true,playSound(){}},burst(){},defeatEnemy(){defeated=true;},
  };
  updateShadowCombat(scene,100,false,()=>false);
  assert(!defeated);
  assert.equal(scene.ninja.enemyHp.has(enemy),false);
  assert.equal(shot.active,false);
});

test('an armored guard resumes its patrol after ninja hit recovery', () => {
  const warning={setPosition(){return this;},setVisible(){return this;}};
  const values={type:'guard',left:80,right:140,speed:32,shadowHitUntil:240,warning};
  const enemy={active:true,x:100,y:184,flipX:false,body:{velocity:{x:0,y:0}},data:{values},
    getData(key){return values[key];},setFlipX(value){this.flipX=value;return this;},
    setVelocityX(value){this.body.velocity.x=value;return this;}};
  const scene={elapsed:300,ninja:{charges:3,attack:null,throw:null,projectiles:[]},
    player:{x:30,y:184,flipX:false},controls:{consumeAttack:()=>false,consumeThrow:()=>false,isDown:()=>false},
    enemies:{getChildren:()=>[enemy],children:{iterate(fn){fn(enemy);}}},
    projectiles:[],attackEffect:{clear(){}},boss:null,ui:{}};
  updateCombat(scene,16);
  assert.equal(enemy.body.velocity.x,32);
});
