import { blocksMonsterHit } from './monster-ai.js';
import { guardBlocks } from './expansion-enemies.js';
import { canDash, DASH, horizontalEntry, intersects, KATANA, refill, SHURIKEN, spendCharge, stepStrike, strikeBox } from './shadow-rules.js';

const SHAKE = .0025;
const ENEMY_HEALTH = { dummy: 40, flying: 8, bat: 8, demon: 8, guard: 20, knight: 20, golem: 20, sentinel: 20 };
const BOSS_BOX = { width: 28, top: 153, bottom: 184 };
const FIGHT_REACH = 2;

export function createShadow(scene) {
  return {
    attack: null, throw: null, dash: null, groundDashAt: 0, airUsed: false, charges: SHURIKEN.capacity,
    rechargeAt: Infinity, projectiles: [],
    effect: scene.add.graphics().setDepth(6.5), spark: scene.add.graphics().setDepth(7.5),
    enemyHp: new WeakMap(), holdUntil: 0, lastHit: null,
  };
}

export function endDash(scene) {
  if (!scene.ninja.dash) return;
  scene.ninja.dash = null;
  const { body } = scene.player;
  body.setAllowGravity(true);
  body.maxVelocity.x = 132;
  body.velocity.x = Math.max(-132, Math.min(132, body.velocity.x));
}

export function updateDash(scene, grounded, direction) {
  const state = scene.ninja;
  const body = scene.player.body;
  const now = scene.elapsed;
  if (grounded) state.airUsed = false;
  if (state.dash) {
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
      state.dash = { since: now, direction: side, air };
      if (air) {
        state.airUsed = true;
        body.setAllowGravity(false);
        body.setVelocityY(0);
      } else state.groundDashAt = now + DASH.cooldown;
      body.maxVelocity.x = DASH.speed;
      scene.ui.playSound('dash');
    }
  }
  if (!state.dash) return false;
  const side = state.dash.direction;
  scene.player.setFlipX(side < 0).setAccelerationX(0).setDragX(0).setVelocityX(side * DASH.speed);
  return true;
}

export function clearShadow(scene, respawn = false) {
  const state = scene.ninja;
  if (!state) return;
  endDash(scene);
  state.attack = null;
  state.throw = null;
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

function enemyHit(scene, enemy, damage, direction, ranged) {
  // Ranged guard checks use the projectile's approach side.
  const source = ranged ? { x: enemy.x - direction * 20, y: enemy.y } : scene.player;
  if (blocksMonsterHit(enemy, source) || guardBlocks(enemy, source, scene.elapsed)) {
    if (enemy.getData('type') === 'guard' && !ranged) enemy.setData('exposedUntil', scene.elapsed + 730);
    impact(scene, enemy.x, enemy.y - 8, direction, false, 'block');
    return;
  }
  const state = scene.ninja;
  const type = enemy.getData('type');
  const max = ENEMY_HEALTH[type] ?? 10;
  const health = (state.enemyHp.get(enemy) ?? max) - damage;
  const until = scene.elapsed + (damage >= 20 ? 310 : 240);
  enemy.setData('shadowHitUntil', until);
  impact(scene, enemy.x, enemy.y - 8, direction, damage >= 20, ranged ? 'shurikenHit' : 'katanaHit');
  state.enemyHp.set(enemy, health > 0 ? health : max);
  if (type === 'dummy') {
    scene.ui.onShadowDummy?.(Math.max(0, health), max);
  } else if (health <= 0) {
    scene.defeatEnemy(enemy);
  }
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
    enemyHit(scene, enemy, spec.damage, direction, false);
  }
  const boss = scene.boss;
  if (!boss || boss.hp <= 0 || boss.phase === 'waiting' || hit.has(boss) || !intersects(box, bossBody(boss))) return;
  if (wallBetween(scene, x, boss.x, Math.max(box.top, BOSS_BOX.top))) return;
  hit.add(boss);
  if (hitBoss(spec.damage >= 20 ? 2 : 1)) impact(scene, boss.x, 165, direction, spec.damage >= 20);
  else impact(scene, boss.x, 165, direction, false, 'block');
}

function wallBetween(scene, x, next, y) {
  return scene.solidWalls?.getChildren().some(({ body }) => horizontalEntry(x, next, y, body) < Infinity) ?? false;
}

function updateShuriken(scene, delta, hitBoss) {
  const state = scene.ninja;
  const now = scene.elapsed;
  for (const shot of state.projectiles) {
    if (!shot.active) continue;
    const next = shot.x + shot.direction * SHURIKEN.speed * delta / 1000;
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
      if (!enemy.active) continue;
      const distance = horizontalEntry(shot.x, next, shot.y, enemy.body, FIGHT_REACH);
      if (distance < entry) { entry = distance; target = enemy; }
    }
    const boss = scene.boss;
    if (boss?.hp > 0 && boss.phase !== 'waiting') {
      const distance = horizontalEntry(shot.x, next, shot.y, bossBody(boss), FIGHT_REACH);
      if (distance < entry) { entry = distance; target = boss; }
    }
    if (entry <= 1) {
      const x = shot.x + entry * (next - shot.x);
      if (target && target !== boss) enemyHit(scene, target, SHURIKEN.damage, shot.direction, true);
      else if (target === boss && boss) {
        if (boss.rangedCycle !== boss.cycle && hitBoss(1)) {
          boss.rangedCycle = boss.cycle;
          impact(scene, x, shot.y, shot.direction, false);
        } else impact(scene, x, shot.y, shot.direction, false, 'block');
      } else impact(scene, x, shot.y, shot.direction, false, 'shurikenHit');
      shot.setActive(false).setVisible(false);
    } else if (now >= shot.expires) shot.setActive(false).setVisible(false);
    else {
      shot.x = next;
      shot.setFrame('star' + (scene.ui.reduceMotion ? 0 : Math.floor((now - shot.since) / 36) % 4));
    }
  }
}

function releaseShuriken(scene, direction) {
  const state = scene.ninja;
  let shot = state.projectiles.find((image) => !image.active);
  if (!shot) {
    shot = scene.add.image(0, 0, 'shadow-weapons', 'star0').setDepth(5.5);
    state.projectiles.push(shot);
  }
  // Starting at the center prevents spawning on the other side of a wall.
  shot.setPosition(scene.player.x, scene.player.y - 16).setActive(true).setVisible(true);
  shot.direction = direction;
  shot.since = scene.elapsed;
  shot.expires = scene.elapsed + SHURIKEN.life;
}

export function updateShadowCombat(scene, delta, pressed, hitBoss) {
  const state = scene.ninja;
  const time = scene.elapsed;
  const direction = (Number(scene.controls.isDown('right')) - Number(scene.controls.isDown('left'))) ||
    (scene.player.flipX ? -1 : 1);
  const previous = state.attack;
  const previousCharges = state.charges;
  refill(state, time);
  if (state.throw && time - state.throw.since >= SHURIKEN.duration) state.throw = null;
  stepStrike(state, time, pressed, direction, !state.dash && !state.throw);
  if (state.attack !== previous && state.attack) scene.ui.playSound('katana' + (state.attack.index + 1));
  if (scene.controls.consumeThrow() && !state.attack && !state.dash && !state.throw && spendCharge(state, time)) {
    state.throw = { direction, since: time, released: false };
  }
  if (state.throw) {
    scene.player.setFlipX(state.throw.direction < 0);
    if (!state.throw.released && time - state.throw.since >= SHURIKEN.release) {
      state.throw.released = true;
      releaseShuriken(scene, state.throw.direction);
      scene.ui.playSound('shuriken');
    }
  }
  if (state.attack) {
    const strike = state.attack;
    const spec = KATANA[strike.index];
    const age = time - strike.since;
    scene.player.setFlipX(strike.direction < 0);
    if (age >= spec.open && age < spec.close) attack(scene, strike, spec, hitBoss);
  }
  updateShuriken(scene, delta, hitBoss);
  if (previousCharges !== state.charges) scene.ui.onShadowCharges(state.charges);
}
