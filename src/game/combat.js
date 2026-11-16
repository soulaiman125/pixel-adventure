import { contact } from './obstacles.js';
import { EXPANSION_ENEMIES, strikeEnemy, updateExpansionEnemy } from './expansion-enemies.js';
import { updateExpansionBoss } from './expansion-bosses.js';
import { blocksMonsterHit, monsters, terrainBlocks, updateMonster } from './monster-ai.js';

const phases = ['Warn: jump the low wave', 'Warn: move away from the marker'];
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
  if (config.kind) scene.boss.trapArt = [];
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
      boss.hits++;
      boss.flashUntil = now + 145;
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
  if (now < scene.swingUntil && !scene.ui.reduceMotion) {
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
    else contact(scene, shot.dot.x, shot.dot.y, shot.radius * 1.65, shot.radius * 1.65);
    if (shot.dot.active) projectiles[active++] = shot;
  }
  // A hit can empty the list during the loop.
  projectiles.length = Math.min(active, projectiles.length);
  if (scene.boss?.hp > 0) {
    const boss = scene.boss;
    if (boss.kind) {
      updateExpansionBoss(scene, boss, fire);
      if (boss.phase === 'attack') contact(scene, boss.x, 170, 27, 24);
    } else updateBoss(scene, boss);
  }
}

function updateBoss(scene, boss) {
  const now = scene.elapsed;
  if (boss.phase === 'waiting' && scene.player.x >= boss.start) {
    boss.phase = 'warn';
    boss.since = now;
    boss.target = scene.player.x;
    scene.ui.playSound('bossWarning');
  }
  const age = now - boss.since;
  const pattern = boss.cycle % 2;
  if (boss.phase === 'warn' && age >= 900) {
    boss.phase = 'attack';
    boss.since = now;
    scene.ui.playSound('bossStrike');
    if (pattern === 0) {
      const direction = scene.player.x < boss.x ? -1 : 1;
      fire(scene, boss.x + direction * 20, 177, direction * 116, 0, 6);
      fire(scene, boss.x + direction * 24, 176, direction * 157, 0, 5);
    } else {
      for (const offset of [-17, 0, 17]) fire(scene, boss.target + offset, 35 - Math.abs(offset), 0, 150);
    }
  } else if (boss.phase === 'attack' && age >= 980) {
    boss.phase = 'open';
    boss.hits = 0;
    boss.since = now;
  } else if (boss.phase === 'open' && age >= 2450) {
    boss.phase = 'warn';
    boss.cycle++;
    boss.since = now;
    boss.target = scene.player.x;
    scene.ui.playSound('bossWarning');
  }
  const vulnerable = boss.phase === 'open' && boss.hits < 2;
  boss.art.clear().fillStyle(vulnerable ? 0x9469a5 : 0x6a4e83).fillRoundedRect(boss.x - 18, 152, 36, 32, 4);
  boss.art.fillStyle(vulnerable ? 0xffe192 : 0xe98ab3).fillRect(boss.x - 8, 163, 16, 5);
  boss.art.fillStyle(0xd6aac6).fillTriangle(boss.x - 16, 153, boss.x - 14, 140, boss.x - 5, 153);
  boss.art.fillTriangle(boss.x + 16, 153, boss.x + 14, 140, boss.x + 5, 153);
  boss.indicator.clear();
  if (boss.phase === 'warn') {
    const x = pattern === 1 ? boss.target : boss.x;
    boss.indicator.fillStyle(0xffd181).fillRect(x - 19, 180, 38, 3);
  }
  if (boss.phase === 'attack') contact(scene, boss.x, 170, 29, 27);
  if (boss.phase !== 'waiting') {
    const cue = vulnerable ? 'Attack now!' : boss.phase === 'warn' ? phases[pattern]
      : boss.phase === 'open' ? 'Guard up · Get ready' : 'Dodge!';
    scene.ui.onBoss(boss, cue);
  }
}
