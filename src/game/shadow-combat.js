import { blocksMonsterHit, terrainBlocks } from './monster-ai.js';
import { guardBlocks } from './expansion-enemies.js';
import { armouredUltimate, ULTIMATE_ENEMIES, ultimateGuard } from './ultimate-enemies.js';
import { DEFAULT_HERO } from './legends-heroes.js';
import { canDash, DASH, horizontalEntry, intersects, KATANA, SHURIKEN, stepStrike, strikeBox } from './shadow-rules.js';
import { activeWindows, AIR_DIVE, canParry, CHARGE_LIMIT, CHARGE_READY, cooldown, inRadius, PARRY, SPECIALS } from './combat-techniques.js';

const SHAKE = .0025;
const ENEMY_HEALTH = { dummy: 40, flying: 8, bat: 8, demon: 8, guard: 20, knight: 20, golem: 20, sentinel: 20 };
const BOSS_BOX = { width: 28, top: 153, bottom: 184 };
const FIGHT_REACH = 2;

export function createShadow(scene) {
  return {
    attack: null, throw: null, dash: null, groundDashAt: 0, airUsed: false, projectiles: [],
    effect: scene.add.graphics().setDepth(6.5), spark: scene.add.graphics().setDepth(7.5),
    enemyHp: new WeakMap(), holdUntil: 0, lastHit: null,
    special: null, charging: null, heldAttackAt: null, sprint: false,
    readyAt: {}, uses: {}, dodgeUntil: 0, parry: null, counterUntil: 0,
    airAttacked: false, wallJumpUsed: false,
  };
}

const tier = (scene, skill) => scene.ui?.shadowTier?.(skill) ?? 0;
function use(state, ability) {
  state.uses ??= {};
  state.uses[ability] = (state.uses[ability] ?? 0) + 1;
}

export function parryAttack(scene, sourceX) {
  const state = scene.ninja;
  if (!state || !canParry(state.parry, scene.elapsed, sourceX, scene.player.x)) return false;
  state.parry.success = true;
  state.parry.succeededAt = scene.elapsed;
  state.counterUntil = scene.elapsed + PARRY.counter;
  (state.readyAt ??= {}).parry = scene.elapsed + PARRY.success;
  use(state, 'parrySuccess');
  scene.burst(scene.player.x + 9 * state.parry.direction, scene.player.y - 13, 0x8dfff5, 11);
  scene.ui.playSound('parrySuccess');
  return true;
}

export function cancelCharge(scene) {
  if (!scene.ninja) return;
  scene.ninja.charging = null;
  scene.ninja.heldAttackAt = null;
}

export function endDash(scene) {
  if (!scene.ninja.dash) return;
  scene.ninja.lastDashDistance = Math.abs(scene.player.x - scene.ninja.dash.startX);
  scene.ninja.dashBrakeUntil = scene.elapsed + 110;
  scene.ninja.dash = null;
  const { body } = scene.player;
  body.setAllowGravity(true);
  const cap = scene.hero?.speed ?? 132;
  body.maxVelocity.x = cap;
  body.velocity.x = Math.max(-cap, Math.min(cap, body.velocity.x));
}

export function updateDash(scene, grounded, direction) {
  const state = scene.ninja;
  const body = scene.player.body;
  const now = scene.elapsed;
  if (grounded) {
    state.airUsed = false;
    state.airAttacked = false;
    state.wallJumpUsed = false;
  }
  if (state.dash) {
    if (tier(scene,'dash') >= 2 && direction && direction !== state.dash.direction
      && !state.dash.reversed && now-state.dash.since >= 45) {
      state.dash.direction = direction;
      state.dash.reversed = true;
    }
    // Crossing a ledge consumes this airborne sequence's dash, even if the
    // dash began on land. Chaining another dash would skip bridge routes.
    if (!grounded) {
      state.airUsed = true;
      state.dash.air = true;
    }
    const { since, direction: side } = state.dash;
    if (now - since >= DASH.duration || (side < 0 ? body.blocked.left : body.blocked.right)) endDash(scene);
  }
  const pressed = scene.controls.consumeDash();
  if (pressed && canDash(state, now, grounded)) {
    const side = direction || (scene.player.flipX ? -1 : 1);
    if (!(side < 0 ? body.blocked.left : body.blocked.right)) {
      const air = !grounded;
      state.dash = { since: now, direction: side, air, startX:scene.player.x };
      cancelCharge(scene);
      use(state,'dash');
      if (air) {
        state.airUsed = true;
        body.setAllowGravity(false);
        body.setVelocityY(0);
      } else state.groundDashAt = now + cooldown('dash', tier(scene, 'dash'))+(scene.hero?.bonus.dashWait??0);
      body.maxVelocity.x = scene.hero?.dash ?? DASH.speed;
      scene.ui.playSound('dash');
    }
  }
  if (!state.dash) return false;
  const side = state.dash.direction;
  scene.player.setFlipX(side < 0).setAccelerationX(0).setDragX(0).setVelocityX(side * (scene.hero?.dash ?? DASH.speed));
  return true;
}

export function clearShadow(scene, respawn = false) {
  const state = scene.ninja;
  if (!state) return;
  endDash(scene);
  state.attack = null;
  state.throw = null;
  state.special = null;
  cancelCharge(scene);
  state.dodgeUntil = 0;
  state.parry = null;
  state.counterUntil = 0;
  state.wallSlide = 0;
  state.wallJumpUntil = 0;
  state.dashBrakeUntil = 0;
  state.sprintJumpUntil = 0;
  state.diveLandUntil = 0;
  state.sprint = false;
  state.sprintSince = undefined;
  state.sprintStop = undefined;
  state.effect.clear();
  state.spark.clear();
  state.lastHit = null;
  state.holdUntil = 0;
  for (const shot of state.projectiles) shot.setActive(false).setVisible(false);
  if (!respawn) return;
  state.airUsed = true;
  state.groundDashAt = scene.elapsed;
  scene.controls.consumeDash();
  scene.controls.consumeThrow();
}

function impact(scene, x, y, direction, heavy, sound) {
  const state = scene.ninja;
  state.lastHit = { x, y, direction, heavy, time: scene.elapsed };
  state.holdUntil = scene.elapsed + (heavy ? 53 : 31);
  scene.burst(x, y, heavy ? 0xffba83 : 0xa9eeff, heavy ? 9 : 5);
  if (heavy && !scene.ui.reduceMotion) scene.cameras.main.shake(104, SHAKE);
  if (sound) scene.ui.playSound(sound);
}

function enemyHit(scene, enemy, damage, direction, ranged, counter = false) {
  // Ranged guard checks use the projectile's approach side.
  const source = ranged ? { x: enemy.x - direction * 20, y: enemy.y } : scene.player;
  if (!counter && (blocksMonsterHit(enemy, source) || guardBlocks(enemy, source, scene.elapsed)
    || ultimateGuard(enemy, source, scene.elapsed, damage >= 20))) {
    if (enemy.getData('type') === 'guard' && !ranged) enemy.setData('exposedUntil', scene.elapsed + 730);
    impact(scene, enemy.x, enemy.y - 8, direction, false, 'block');
    return false;
  }
  const state = scene.ninja;
  const type = enemy.getData('type');
  const max = (ULTIMATE_ENEMIES[type]?.hp ?? ENEMY_HEALTH[type] ?? 10) + (enemy.getData('captain') ? 12 : 0);
  const health = (state.enemyHp.get(enemy) ?? max) - damage;
  if (scene.elapsed >= (enemy.getData('shadowHitUntil') ?? 0)
    && scene.elapsed >= (enemy.getData('shadowStaggerReady') ?? 0)) {
    enemy.setData('shadowHitUntil',scene.elapsed + (damage >= 20 ? 310 : 240)+(scene.hero?.stagger??0));
    enemy.setData('shadowStaggerReady',scene.elapsed + 420);
    const enemyState = enemy.getData('ultimateState');
    if (enemyState?.phase === 'windup') {
      Object.assign(enemyState,{phase:'recover',started:scene.elapsed,until:scene.elapsed+390});
      enemy.getData('signal')?.clear();
    }
  }
  impact(scene, enemy.x, enemy.y - 8, direction, damage >= 20, ranged ? 'shurikenHit' : 'katanaHit');
  state.enemyHp.set(enemy, health > 0 ? health : max);
  if (type === 'dummy') {
    scene.ui.onShadowDummy?.(Math.max(0, health), max);
  } else if (health <= 0) {
    scene.defeatEnemy(enemy);
  }
  return true;
}

function registerHit(scene, target, counter = false) {
  if (target.getData?.('type') !== 'dummy') scene.runTally?.hit(scene.elapsed,counter);
}

function bossBody(boss) {
  return { left: boss.x - BOSS_BOX.width / 2, right: boss.x + BOSS_BOX.width / 2, top: BOSS_BOX.top, bottom: BOSS_BOX.bottom };
}

function attack(scene, strike, spec, hitBoss) {
  const { x, y } = scene.player;
  const { direction, hit } = strike;
  const box = strikeBox(spec, x, y, direction);
  for (const enemy of scene.enemies.getChildren()) {
    if (!enemy.active || hit.has(enemy) || !intersects(box, enemy.body)) continue;
    if (wallBetween(scene, x, enemy.x, Math.max(box.top, enemy.body.top))) continue;
    hit.add(enemy);
    if(enemyHit(scene, enemy, spec.damage, direction, false,strike.counter)) registerHit(scene,enemy,strike.counter);
  }
  const boss = scene.boss;
  if (!boss || boss.hp <= 0 || boss.phase === 'waiting' || hit.has(boss) || !intersects(box, bossBody(boss))) return;
  if (wallBetween(scene, x, boss.x, Math.max(box.top, BOSS_BOX.top))) return;
  hit.add(boss);
  if (hitBoss(spec.damage >= 20 ? 2 : 1)) {
    registerHit(scene,boss,strike.counter);
    impact(scene, boss.x, 165, direction, spec.damage >= 20);
  }
  else impact(scene, boss.x, 165, direction, false, 'block');
}

function wallBetween(scene, x, next, y) {
  return scene.solidWalls?.getChildren().some(({ body }) => horizontalEntry(x, next, y, body) < Infinity) ?? false;
}

function lineTo(scene, target) {
  const {x,y}=scene.player;
  const targetY=target===scene.boss ? 169 : target.body.center.y;
  return !wallBetween(scene,x,target.x,y-15) && !terrainBlocks(scene,x,y-15,target.x,targetY);
}

function validExecutionTarget(scene,target) {
  if(!target || Math.abs(target.x-scene.player.x)>54+(tier(scene,'execution')>=2?12:0)
    +(scene.hero?.field?26:0)+(scene.hero?.bonus.reachSpecial??0)) return false;
  if(target===scene.boss) {
    if(target.hp<=0 || target.phase!=='open' || target.hits>=2)return false;
  }else if(!target.active || Math.abs(target.y-scene.player.y)>27 ||
    blocksMonsterHit(target,scene.player) || guardBlocks(target,scene.player,scene.elapsed)
    || (armouredUltimate(target.getData('type')) && target.getData('ultimateState')?.phase !== 'recover'
      && (scene.player.x-target.x)*target.getData('ultimateState').facing >= 0
      && scene.elapsed >= (target.getData('exposedUntil') ?? 0))) return false;
  return lineTo(scene,target);
}

function startSpecial(scene,kind,direction) {
  const state=scene.ninja;
  const hero=scene.hero ?? DEFAULT_HERO;
  if (scene.elapsed < (state.readyAt?.[kind] ?? 0)) return false;
  let target;
  if(kind==='execution'){
    target=[...scene.enemies.getChildren(),scene.boss]
      .filter(item=>validExecutionTarget(scene,item))
      .sort((a,b)=>Math.abs(a.x-scene.player.x)-Math.abs(b.x-scene.player.x))[0];
    if(!target){
      scene.ui.onShadowFeedback?.('Move closer to an exposed target');
      return false;
    }
    direction=Math.sign(target.x-scene.player.x)||direction;
  }
  const bump=hero.bonus[{charged:'chargeWait',cyclone:'specialWait',execution:'ultimateWait'}[kind]]??0;
  const spec=hero.specials[kind];
  const anchor=kind==='execution'&&hero.field?target.x:kind==='cyclone'&&(hero.field||hero.id==='frost')?scene.player.x+direction*22:undefined;
  (state.readyAt ??= {})[kind] = scene.elapsed + cooldown(kind,tier(scene,kind))+bump;
  state.special={kind,direction,target,anchor,spec,since:scene.elapsed,hit:spec.windows.map(()=>new Set())};
  use(state,kind);
  scene.ui.playSound(kind);
  return true;
}

function updateSpecial(scene,hitBoss) {
  const state=scene.ninja;
  const action=state.special;
  if(!action)return;
  const {kind,target,direction}=action;
  const hero=scene.hero ?? DEFAULT_HERO;
  const spec=action.spec ?? SPECIALS[kind];
  const age=scene.elapsed-action.since;
  if(age>=spec.duration){state.special=null;return;}
  if(kind==='execution' && ((target===scene.boss && target.hp>0 && target.phase!=='open')
    || (target===scene.boss && target.hits>=2))) action.interrupted=true;
  if(action.interrupted)return;
  scene.player.setFlipX(direction<0);
  for(const index of activeWindows(action,scene.elapsed)){
    const struck=action.hit[index];
    if(kind==='charged'){
      if(!struck.size){
        struck.add(action);
        releaseShuriken(scene,direction,0,'charged');
        scene.ui.playSound('katana3');
      }
      continue;
    }
    const {x,y}=scene.player;
    const targets=kind==='execution'&&!hero.field?[target]:[...scene.enemies.getChildren(),scene.boss];
    const radius=(kind==='execution'?hero.field?38:48:hero.radius+(tier(scene,'cyclone')?6:0))+(hero.bonus.radius??0);
    const final=index===spec.windows.length-1;
    const bonus=final?(kind==='cyclone'&&tier(scene,kind)>=3?4:kind==='execution'&&tier(scene,kind)>=1?6:0):0;
    const damage=spec.windows[index][2]+bonus+(hero.bonus.power??0);
    for(const item of targets){
      if(!item||struck.has(item)||(item!==scene.boss&&!item.active)
        ||(kind==='execution'&&item===scene.boss&&!final)
        ||(item===scene.boss&&(item.hp<=0||item.phase!=='open'||item.hits>=2))
        ||!inRadius(item===scene.boss?bossBody(item):item.body,action.anchor??x,y-14,radius)||!lineTo(scene,item))continue;
      struck.add(item);
      const side=Math.sign(item.x-x)||direction;
      const landed=item===scene.boss?hitBoss(final?2:1):enemyHit(scene,item,damage,side,false);
      if(landed){
        if(item===scene.boss)impact(scene,item.x,166,side,final,'katanaHit');
        else if(hero.control && !struck.controlled){
          item.setData('shadowHitUntil',Math.max(item.getData('shadowHitUntil')??0,scene.elapsed+hero.control));
          struck.controlled=true;
        }
        registerHit(scene,item);
        if(final&&kind==='execution'&&tier(scene,kind)>=3)state.readyAt.execution -= 1000;
      }
    }
  }
}

export function specialMovement(scene, direction, grounded) {
  const {special} = scene.ninja;
  if (special?.kind !== 'execution') {
    const restricted = special?.kind === 'cyclone' || scene.ninja.parry?.success === false;
    return direction * (restricted ? .45 : 1);
  }
  if(scene.hero?.field) return direction*.3;
  const age=scene.elapsed-special.since;
  if(!grounded||special.interrupted||age<56||age>=180||!validExecutionTarget(scene,special.target))return 0;
  // Only approach along the same continuous surface; Phaser resolves contact.
  const {x,y}=scene.player;
  const ledge=[scene.ground,scene.platforms].some(group=>group?.getChildren().some(({body})=>
    body.enable&&Math.abs(y-body.top)<=3&&x>=body.left+4&&x<=body.right-4
    && special.target.x>=body.left+6&&special.target.x<=body.right-6));
  const distance=special.target.x-x;
  return ledge&&Math.abs(distance)>24 ? Math.sign(distance)*1.3 : 0;
}

function updateShuriken(scene, delta, hitBoss) {
  const state = scene.ninja;
  const now = scene.elapsed;
  for (const shot of state.projectiles) {
    if (!shot.active) continue;
    const next = shot.x + shot.direction * (shot.speed ?? SHURIKEN.speed) * delta / 1000;
    const radius=shot.kind==='charged' ? 6+(tier(scene,'katana')>=2?3:0) : FIGHT_REACH;
    let entry = horizontalEntry(shot.x, next, shot.y, { left: -1, right: 0, top: 0, bottom: 260 }, FIGHT_REACH);
    entry = Math.min(entry, horizontalEntry(shot.x, next, shot.y, { left: scene.level.width, right: scene.level.width + 1, top: 0, bottom: 260 }, FIGHT_REACH));
    for (const group of [scene.ground, scene.platforms, scene.solidWalls]) {
      if (!group) continue;
      for (const { body } of group.getChildren()) {
        if (body.enable) entry = Math.min(entry, horizontalEntry(shot.x, next, shot.y, body, FIGHT_REACH));
      }
    }
    let target;
    for (const enemy of scene.enemies.getChildren()) {
      if (!enemy.active || shot.hit?.has(enemy)) continue;
      const distance = horizontalEntry(shot.x, next, shot.y, enemy.body, radius);
      if (distance < entry) { entry = distance; target = enemy; }
    }
    const boss = scene.boss;
    if (boss?.hp > 0 && boss.phase !== 'waiting') {
      const distance = horizontalEntry(shot.x, next, shot.y, bossBody(boss), radius);
      if (distance < entry) { entry = distance; target = boss; }
    }
    if (entry <= 1) {
      const x = shot.x + entry * (next - shot.x);
      if (target && target !== boss) {
        const landed=enemyHit(scene,target, shot.damage??(shot.kind==='charged'?18:SHURIKEN.damage),shot.direction,true);
        if(landed){
          if(scene.hero?.id==='ranger'&&shot.kind==='star') target.setData('shadowHitUntil',now+360);
          registerHit(scene,target);
          if(shot.pierce>0){
            shot.hit.add(target);
            shot.pierce--;
            shot.x=x;
            continue;
          }
        }
      }
      else if (target === boss && boss) {
        if ((shot.kind==='primary'||boss.rangedCycle !== boss.cycle) && hitBoss(shot.damage>=20?2:1)) {
          boss.rangedCycle = boss.cycle;
          registerHit(scene,boss);
          impact(scene, x, shot.y, shot.direction, false);
        } else impact(scene, x, shot.y, shot.direction, false, 'block');
      } else impact(scene, x, shot.y, shot.direction, false, 'shurikenHit');
      shot.setActive(false).setVisible(false);
    } else if (now >= shot.expires) shot.setActive(false).setVisible(false);
    else {
      shot.x = next;
      if(shot.kind!=='charged')shot.setFrame('star' + (scene.ui.reduceMotion ? 0 : Math.floor((now - shot.since) / 36) % 4));
    }
  }
}

function releaseShuriken(scene, direction, offset = 0, kind = 'star', primaryDamage) {
  const state = scene.ninja;
  const hero=scene.hero ?? DEFAULT_HERO;
  const [speed,life,damage,pierce]=hero.shot;
  let shot = state.projectiles.find((image) => !image.active);
  if (!shot) {
    shot = scene.add.image(0, 0, 'shadow-weapons', 'star0').setDepth(5.5);
    state.projectiles.push(shot);
  }
  // Starting at the center prevents spawning on the other side of a wall.
  const height = kind === 'charged' ? 16 : 12;
  const texture=hero.id==='shadow'?(kind==='charged'?'shadow-wave':'shadow-weapons'):'legends-shot-'+hero.id;
  shot.setTexture(texture,kind==='charged'&&hero.id==='shadow'?'wave0':'star0')
    .setFlipX(direction<0).setPosition(scene.player.x, scene.player.y - height + offset).setActive(true).setVisible(true);
  shot.direction = direction;
  shot.since = scene.elapsed;
  shot.kind=kind;
  shot.speed=(kind==='charged'&&hero.id==='shadow'?210:speed)+(hero.bonus.projectile??0);
  shot.damage=primaryDamage??(kind==='charged'?Math.max(18,damage+8):damage);
  shot.pierce=kind==='star'&&tier(scene,'shuriken')>=2?1:hero.id==='ranger'&&kind==='charged'?2:pierce;
  shot.hit=new Set();
  shot.expires = scene.elapsed + (kind==='charged' ? (tier(scene,'katana')>=2?420:hero.bow?510:280) : life+(hero.bonus.reach??0)*23);
}

export function updateShadowCombat(scene, delta, pressed, hitBoss) {
  const state = scene.ninja;
  const hero=scene.hero ?? DEFAULT_HERO;
  const time = scene.elapsed;
  const direction = (Number(scene.controls.isDown('right')) - Number(scene.controls.isDown('left'))) ||
    (scene.player.flipX ? -1 : 1);
  const previous = state.attack;
  const held = scene.controls.isDown('attack');
  if (scene.controls.consume?.('cancel-attack') && !held) cancelCharge(scene);
  if (state.throw && time - state.throw.since >= SHURIKEN.duration) state.throw = null;
  if (state.parry && time-state.parry.since >= PARRY.duration) state.parry = null;
  const offLandingRecovery = time >= (state.diveLandUntil ?? 0);
  const idle=!state.dash&&!state.throw&&!state.special&&!state.attack&&!state.charging&&!state.parry&&offLandingRecovery;
  const parry = scene.controls.consume?.('parry');
  const execution=scene.controls.consume?.('execution');
  const cyclone=scene.controls.consume?.('cyclone');
  if (idle && parry && time >= (state.readyAt?.parry ?? 0)) {
    state.parry = { since:time, direction, success:false, guard:hero.guard };
    (state.readyAt ??= {}).parry = time + PARRY.miss;
    scene.player.setFlipX(direction < 0);
    scene.ui.playSound('parry');
    use(state, 'parry');
  } else if(idle && execution) startSpecial(scene,'execution',direction);
  else if(idle && cyclone) startSpecial(scene,'cyclone',direction);
  if(pressed && idle && !state.special && !state.parry)state.heldAttackAt=time;
  if(pressed && state.attack)state.heldAttackAt=null;
  if(!held && !state.charging)state.heldAttackAt=null;
  if(held && state.heldAttackAt!=null && time-state.heldAttackAt>=CHARGE_READY && !state.attack
    && !state.special && !state.dash && !state.throw && !state.charging && !state.parry
    && time >= (state.readyAt?.charged ?? 0)) {
    state.charging={since:state.heldAttackAt,direction};
    scene.ui.playSound('chargeReady');
  }
  if(state.charging && (!held || time-state.charging.since>=CHARGE_LIMIT)){
    startSpecial(scene,'charged',state.charging.direction);
    cancelCharge(scene);
  }
  const inAir = Boolean(scene.player.body && !scene.player.body.blocked.down);
  const parryCounter = state.parry?.success && time-state.parry.succeededAt >= 70;
  if (pressed && parryCounter) state.parry = null;
  if (state.attack?.dive) {
    if (!inAir) {
      state.diveLandUntil = time + 125;
      scene.landUntil = Math.max(scene.landUntil ?? 0,time+158);
    }
    if (!inAir || time-state.attack.since >= AIR_DIVE.duration) state.attack = null;
  } else {
    stepStrike(state,time,pressed,direction,!state.dash&&!state.throw&&!state.special&&!state.charging&&!state.parry
      && offLandingRecovery && (!inAir || !state.airAttacked),tier(scene,'katana')?38:0,hero.combo);
  }
  if (state.attack !== previous && state.attack) {
    state.attack.air = inAir;
    if (inAir) state.airAttacked = true;
    state.attack.dive = inAir && state.attack.index === 0 && scene.controls.isDown('drop');
    if (state.attack.dive) {
      scene.player.body.setVelocityY(Math.max(205,scene.player.body.velocity.y));
      state.heldAttackAt = null;
      use(state,'dive');
    }
    state.attack.sprint=state.attack.index===0&&state.sprint&&tier(scene,'sprint')>=3;
    state.attack.counter=state.attack.index===0&&time<Math.max(state.dodgeUntil,state.counterUntil ?? 0);
    if(state.attack.counter){state.dodgeUntil=0;state.counterUntil=0;use(state,'counter');}
    use(state,'katana');
    scene.ui.playSound('katana' + (state.attack.index + 1));
  }
  if (scene.controls.consumeThrow() && !state.attack && !state.dash && !state.throw && !state.charging && !state.special
      && !state.parry && offLandingRecovery && time >= (state.readyAt?.throw ?? 0)) {
    const upgrade = tier(scene,'shuriken');
    (state.readyAt ??= {}).throw = time + cooldown('throw',upgrade);
    state.throw = { direction, since: time, released: false, triple:upgrade >= 3 };
    use(state,'shuriken');
  }
  if (state.throw) {
    scene.player.setFlipX(state.throw.direction < 0);
    if (!state.throw.released && time - state.throw.since >= SHURIKEN.release) {
      state.throw.released = true;
      releaseShuriken(scene, state.throw.direction);
      if(state.throw.triple){
        releaseShuriken(scene,state.throw.direction,-12);
        releaseShuriken(scene,state.throw.direction,9);
      }
      scene.ui.playSound('shuriken');
    }
  }
  if (state.attack) {
    const strike = state.attack;
    const base = strike.dive ? AIR_DIVE : hero.combo[strike.index];
    const spec=strike.sprint||strike.counter ? {...base,w:base.w+6,damage:base.damage+(strike.counter?8:4)} :
      strike.index===2&&tier(scene,'katana')>=3 ? {...base,damage:24} : base;
    const age = time - strike.since;
    scene.player.setFlipX(strike.direction < 0);
    if (age >= spec.open && age < spec.close) {
      if (!hero.bow || strike.dive || strike.counter) attack(scene,strike,spec,hitBoss);
      else if (!strike.emitted){
        strike.emitted=true;
        releaseShuriken(scene,strike.direction,0,'primary',spec.damage);
        if (hero.alternate || strike.index===2) releaseShuriken(scene,strike.direction,-10,'primary',Math.max(5,spec.damage-4));
      }
    }
  }
  updateSpecial(scene,hitBoss);
  updateShuriken(scene, delta, hitBoss);
  if(state.dash&&!state.dash.dodged&&scene.projectiles.some(({dot})=>
    dot.active&&Math.abs(dot.x-scene.player.x)<25&&dot.y<scene.player.y-19&&dot.y>scene.player.y-38)){
    state.dash.dodged=true;
    if(tier(scene,'dash')>=3){
      state.dodgeUntil=time+450;
      scene.ui.onShadowFeedback?.('Counter ready');
    }
  }
  scene.ui.onShadowAvailability?.(state, time);
}
