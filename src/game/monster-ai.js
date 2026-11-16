export const monsters = {
  knight: { reach: 40, warning: 760, attack: 290, recover: 980, strike: 110, tint: 0xffdf9b },
  demon: { reach: 100, warning: 820, attack: 170, recover: 1200, shot: 105, gravity: 165, vy: -30, tint: 0xff9462, flying: true },
  golem: { reach: 49, warning: 920, attack: 230, recover: 1160, shot: 84, tint: 0xffce80 },
  assassin: { reach: 68, warning: 790, attack: 430, recover: 1020, strike: 119, tint: 0xe5b0ff },
  stalker: { reach: 87, warning: 860, attack: 190, recover: 1230, shot: 87, gravity: 225, vy: -58, tint: 0xbef08c },
  sentinel: { reach: 104, warning: 900, attack: 190, recover: 1270, shot: 150, tint: 0x9ef4ff },
};

export function segmentIntersectsBox(x1, y1, x2, y2, left, top, right, bottom) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const ax = dx ? (left - x1) / dx : (x1 >= left && x1 <= right ? -Infinity : Infinity);
  const bx = dx ? (right - x1) / dx : (x1 >= left && x1 <= right ? Infinity : -Infinity);
  const ay = dy ? (top - y1) / dy : (y1 >= top && y1 <= bottom ? -Infinity : Infinity);
  const by = dy ? (bottom - y1) / dy : (y1 >= top && y1 <= bottom ? Infinity : -Infinity);
  if ((!dx && ax === Infinity) || (!dy && ay === Infinity)) return false;
  return Math.max(0, Math.min(ax, bx), Math.min(ay, by)) <= Math.min(1, Math.max(ax, bx), Math.max(ay, by));
}

export function terrainBlocks(scene, x1, y1, x2, y2) {
  if (Math.min(y1, y2) <= 192) {
    for (const { body } of scene.platforms.getChildren()) {
      if (!body.enable || body.right < Math.min(x1, x2) || body.left > Math.max(x1, x2)) continue;
      if (segmentIntersectsBox(x1, y1, x2, y2, body.left, body.top, body.right, body.bottom)) return true;
    }
  }
  if (Math.max(y1, y2) >= 184) {
    return scene.level.ground.some(([left, right]) =>
      segmentIntersectsBox(x1, y1, x2, y2, left, 184, right, 224));
  }
  return false;
}

export function monsterPhase(brain, now, eligible) {
  switch (brain.phase) {
    case 'patrol': return eligible ? 'prepare' : 'patrol';
    case 'prepare': return !eligible ? 'recover' : now >= brain.until ? 'attack' : 'prepare';
    case 'attack': return now >= brain.until ? 'recover' : 'attack';
    case 'recover': return now >= brain.until ? 'patrol' : 'recover';
  }
}

export function blocksMonsterHit(enemy, player) {
  const { type, brain } = enemy.data.values;
  if (!brain || brain.phase === 'recover' || player.y < enemy.y - 17) return false;
  if (type === 'golem' || type === 'sentinel') return brain.phase === 'patrol';
  return type === 'knight' && brain.phase !== 'attack' && (player.x - enemy.x) * brain.facing > 0;
}

export function updateMonster(scene, enemy, fire) {
  const { left, right, speed, type, brain, signal } = enemy.data.values;
  const spec = monsters[type];
  const now = scene.elapsed;
  const player = scene.player;
  const dx = player.x - enemy.x;
  const weaponY = enemy.y - (spec.flying ? 6 : 8);
  const visible = enemy.x >= scene.cameraX + 3 && enemy.x <= scene.cameraX + scene.scale.width - 3;
  const height = Math.abs(player.y - enemy.y);
  const seen = visible && Math.abs(dx) < spec.reach + (brain.phase === 'prepare' ? 20 : 0)
    && height < (spec.flying ? 70 : 35) && !terrainBlocks(scene, enemy.x, weaponY, player.x, player.y - 9);
  const next = monsterPhase(brain, now, seen);
  if (next !== brain.phase) {
    brain.phase = next;
    const pace = scene.level.script?.enemyPace ?? 1;
    if (next === 'prepare') {
      brain.facing = Math.sign(dx) || 1;
      brain.until = now + Math.max(650, spec.warning * pace);
      scene.ui.playSound(type === 'sentinel' ? 'laserCharge' : 'charge');
    } else if (next === 'attack') {
      brain.until = now + spec.attack;
      if (spec.shot) fire(scene, enemy.x + brain.facing * 9, weaponY, brain.facing * spec.shot,
        spec.vy ?? 0, 4, spec.tint, spec.gravity, { lifetime: type === 'golem' ? 520 : 1250, ground: true });
      scene.ui.playSound(type === 'sentinel' ? 'laserFire' : type === 'demon' ? 'fire' : type === 'stalker' ? 'poison' : 'impact');
    } else if (next === 'recover') brain.until = now + spec.recover * pace;
  }
  signal.clear();
  let velocity = 0;
  if (brain.phase === 'patrol') {
    if (enemy.x <= left) brain.facing = 1;
    if (enemy.x >= right) brain.facing = -1;
    velocity = brain.facing * speed;
  } else if (brain.phase === 'attack' && spec.strike) {
    if (brain.facing > 0 ? enemy.x < right - 1 : enemy.x > left + 1) velocity = brain.facing * spec.strike;
  } else if (brain.phase === 'prepare') {
    const end = enemy.x + brain.facing * (spec.shot ? Math.min(48, spec.reach) : 24);
    signal.fillStyle(0xffd790, .9).fillRect(Math.min(enemy.x, end), weaponY, Math.abs(end - enemy.x), 1);
    signal.fillRect(enemy.x - 1, enemy.y - 24, 3, 6).fillRect(enemy.x - 1, enemy.y - 16, 3, 2);
  }
  enemy.setFlipX(brain.facing < 0).setVelocityX(velocity);
  if (spec.flying) {
    const height = brain.phase === 'patrol' ? 148 + Math.sin((now + left) / 260) * 9 : 153;
    enemy.setVelocityY((height - enemy.y) * 8);
  }
}
