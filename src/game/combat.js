import { contact } from './obstacles.js';
import { EXPANSION_ENEMIES, strikeEnemy, updateExpansionEnemy } from './expansion-enemies.js';
import { phaseHealthFloor, updateExpansionBoss } from './expansion-bosses.js';
import { blocksMonsterHit, monsters, terrainBlocks, updateMonster } from './monster-ai.js';
import { paintPrototypeSlash } from './prototype-actors.js';
import { addTitanPresentation } from './prototype-titan.js';

const PROJECTILE_LIMIT = 24;

export function attackReaches(player, x, y, width = 12, height = 13) {
  const forward = (player.flipX ? -1 : 1) * (x - player.x);
  return forward >= -width / 2 && forward <= 24 + width / 2
    && Math.abs(player.y - 10 - y) <= 11 + height / 2;
}

export function addCombat(scene) {
  scene.projectiles = [];
  scene.projectilePool = [];
  scene.attackAfter = 0;
  scene.attackEffect = scene.add.graphics().setDepth(7);
  const config = scene.level.boss;
  if (!config) {
    scene.boss = null;
    return;
  }
  const art = scene.add.graphics().setDepth(3);
  const indicator = scene.add.graphics().setDepth(2);
  scene.boss = { ...config, maxHp: config.hp, art, indicator, phase: 'waiting', cycle: 0, since: 0 };
  scene.boss.trapArt = [];
  if(scene.titanPrototype) scene.boss.presentation=addTitanPresentation(scene,scene.boss);
}

function fire(scene, x, y, vx, vy = 0, radius = 5, tint = 0xffa4ba, gravity = 0, rules) {
  let shot = scene.projectilePool.find(({ dot }) => !dot.active);
  if (!shot) {
    if (scene.projectilePool.length >= PROJECTILE_LIMIT) return;
    shot = { dot: scene.add.rectangle(x, y, radius * 2, radius * 2, tint).setDepth(5) };
    scene.projectilePool.push(shot);
  }
  shot.dot.setPosition(x, y).setSize(radius * 2, radius * 2).setFillStyle(tint)
    .setStrokeStyle(1, 0xffe4bd).setActive(true).setVisible(true);
  shot.vx = vx;
  shot.vy = vy;
  shot.gravity = gravity;
  shot.radius = radius;
  shot.expires = scene.elapsed + (rules?.lifetime ?? 2700);
  shot.stopsOnTerrain = rules?.ground === true;
  shot.titanWave = rules?.titanWave === true;
  if (shot.titanWave) shot.dot.setStrokeStyle(1,0xdeffff);
  scene.projectiles.push(shot);
}

function updateEnemyShots(scene, enemy) {
  const { type, left } = enemy.data.values;
  if (monsters[type]) {
    updateMonster(scene, enemy, fire);
    return;
  }
  if (EXPANSION_ENEMIES.has(type)) {
    updateExpansionEnemy(scene, enemy, fire);
    return;
  }
  if (type === 'flying') {
    enemy.setVelocityY(Math.cos(scene.elapsed / 295 + left) * 25);
    return;
  }
  if (type !== 'shooter') return;
  const warning = enemy.getData('warning');
  const near = Math.abs(enemy.x - scene.player.x) < 156
    && enemy.x >= scene.cameraX && enemy.x <= scene.cameraX + scene.scale.width;
  if (!near) {
    enemy.setData('shotAt', 0);
    warning.setVisible(false);
    return;
  }
  const shotAt = enemy.getData('shotAt') || scene.elapsed + 650;
  enemy.setData('shotAt', shotAt);
  if (scene.elapsed >= shotAt) {
    fire(scene, enemy.x, enemy.y - 7, scene.player.x < enemy.x ? -84 : 84, 0, 5, 0xffa4ba, 0, { ground: true });
    enemy.setData('shotAt', scene.elapsed + 2200);
  }
  warning.setPosition(enemy.x, enemy.y - 17).setVisible(shotAt - scene.elapsed < 515);
}

export function updateCombat(scene, delta) {
  const now = scene.elapsed;
  const swing = scene.controls.consumeAttack();
  if (swing && now >= scene.attackAfter) {
    scene.attackAfter = now + 335;
    scene.swingUntil = now + 150;
    scene.ui.playSound('attack');
    scene.enemies.children.iterate((enemy) => {
      if (!enemy.active || !attackReaches(scene.player, enemy.x, enemy.y - 6)) return;
      if (blocksMonsterHit(enemy, scene.player)) {
        scene.burst(enemy.x, enemy.y - 11, 0xffd690);
        scene.ui.playSound('block');
      } else strikeEnemy(scene, enemy);
    });
    const boss = scene.boss;
    if (boss?.phase === 'open' && boss.hits < 2 && attackReaches(scene.player, boss.x, 168, 28, 31)) {
      boss.hp--;
      boss.hits = boss.hp === phaseHealthFloor(boss) ? 2 : boss.hits + 1;
      boss.flashUntil = now + 145;
      if (scene.prototypeActors?.enabled()) scene.prototypeActors.hit(boss.x,164,true);
      scene.burst(boss.x, 164, 0xffd97d, 8);
      scene.ui.playSound('bossHit');
      if (!scene.ui.reduceMotion) scene.cameras.main.shake(boss.hp === 0 ? 240 : 135, boss.hp === 0 ? .009 : .005);
      if (boss.hp === 0) {
        boss.phase = 'defeated';
        boss.art.clear();
        boss.indicator.clear();
        boss.trapArt?.forEach(({ art }) => art.clear());
        scene.clearProjectiles();
        scene.burst(boss.x, 161, 0xd8ffff, 14);
        scene.burst(boss.x, 149, 0xffdc96, 10);
        scene.ui.playSound('bossDefeat');
        scene.ui.onBoss(boss, 'Boss defeated · Reach the flag');
      }
    }
  }
  scene.attackEffect.clear();
  if (now < scene.swingUntil && scene.prototypeActors?.enabled()) {
    const sign=scene.player.flipX?-1:1;
    paintPrototypeSlash(scene.attackEffect,scene.player.x,scene.player.y-17,sign,scene.swingUntil-now,scene.ui.reduceMotion);
  } else if (now < scene.swingUntil && !scene.ui.reduceMotion) {
    const sign = scene.player.flipX ? -1 : 1;
    const x = scene.player.x + sign * 9;
    const y = scene.player.y - 13;
    const length = now + 90 < scene.swingUntil ? 17 : 12;
    scene.attackEffect.fillStyle(0xe29150).fillTriangle(x, y + 9, x + sign * length, y, x + sign * 8, y + 11);
    scene.attackEffect.fillStyle(0xffefad).fillTriangle(x, y + 6, x + sign * length, y, x + sign * 7, y + 8);
  }
  scene.enemies.children.iterate((enemy) => { if (enemy.active) updateEnemyShots(scene, enemy); });
  let active = 0;
  const projectiles = scene.projectiles;
  for (const shot of projectiles) {
    if (!shot.dot.active) continue;
    const x = shot.dot.x;
    const y = shot.dot.y;
    shot.vy += shot.gravity * delta / 1000;
    shot.dot.x += shot.vx * delta / 1000;
    shot.dot.y += shot.vy * delta / 1000;
    if (now >= shot.expires || shot.dot.x < 0 || shot.dot.x > scene.level.width || shot.dot.y > 188
      || (shot.stopsOnTerrain && terrainBlocks(scene, x, y, shot.dot.x, shot.dot.y))) {
      shot.dot.setActive(false).setVisible(false);
    }
    else {
      if (shot.titanWave) {
        const side=Math.sign(shot.vx);
        const {x,y}=shot.dot;
        scene.attackEffect.fillStyle(0x8ad8ff,.46).fillTriangle(x,y-4,x-side*11,y+2,x,y+5);
        scene.attackEffect.fillStyle(0xf3ffff).fillRect(x-2,y-2,4,4);
      }
      contact(scene, shot.dot.x, shot.dot.y, shot.radius * 1.65, shot.radius * 1.65);
    }
    if (shot.dot.active) projectiles[active++] = shot;
  }
  // A hit can empty the list during the loop.
  projectiles.length = Math.min(active, projectiles.length);
  if (scene.boss?.hp > 0) {
    const boss = scene.boss;
    updateExpansionBoss(scene, boss, fire);
    if (boss.phase === 'attack') contact(scene, boss.x, 170, 27, 24);
  }
}
