export const EXPANSION_ENEMIES = new Set(['guard', 'bat', 'charger', 'poison', 'robot']);

export function guardBlocks(enemy, player, now) {
  const side = enemy.body.velocity.x < 0 ? -1 : enemy.body.velocity.x > 0 ? 1 : enemy.flipX ? -1 : 1;
  return enemy.getData('type') === 'guard' && now >= (enemy.getData('exposedUntil') ?? 0)
    && (player.x - enemy.x) * side >= 0 && player.y > enemy.y - 17;
}

export function strikeEnemy(scene, enemy) {
  if (guardBlocks(enemy, scene.player, scene.elapsed)) {
    enemy.setData('exposedUntil', scene.elapsed + 730);
    enemy.getData('warning')?.setVisible(false);
    scene.burst(enemy.x, enemy.y - 9, 0xffe5a0, 4);
    scene.ui.playSound('block');
    return;
  }
  scene.defeatEnemy(enemy);
}

export function updateExpansionEnemy(scene, enemy, fire) {
  const { left, right, type, speed } = enemy.data.values;
  const now = scene.elapsed;
  if (enemy.body.velocity.x !== 0) enemy.setFlipX(enemy.body.velocity.x < 0);
  if (type === 'bat') {
    // Correct toward a repeating altitude so frame rate changes cannot cause drift.
    const desiredY = 144 + Math.sin(now / 275 + left) * 12;
    enemy.setVelocityY((desiredY - enemy.y) * 11);
    enemy.getData('warning').setPosition(enemy.x, enemy.y - 16).setVisible(
      Math.abs(scene.player.x - enemy.x) < 50 && Math.cos(now / 275 + left) > .4);
    return;
  }
  const warning = enemy.getData('warning');
  const distance = scene.player.x - enemy.x;
  if (type === 'guard') {
    warning.setPosition(enemy.x + (enemy.flipX ? -6 : 6), enemy.y - 15)
      .setVisible(Math.abs(distance) < 48 && guardBlocks(enemy, scene.player, now));
    return;
  }
  const isCharge = type === 'charger';
  const armed = enemy.getData('actionAt') ?? 0;
  const recovering = enemy.getData('recoverUntil') > now;
  if (!armed && !recovering && Math.abs(distance) < (isCharge ? 102 : 138)) {
    enemy.setData({ actionAt: now + (isCharge ? 620 : 690), aim: Math.sign(distance) || 1 });
    scene.ui.playSound(isCharge ? 'charge' : 'warning');
  } else if (armed && now >= armed) {
    const direction = enemy.getData('aim');
    if (isCharge) enemy.setData('chargeUntil', now + 390);
    else fire(scene, enemy.x + direction * 9, enemy.y - 9, direction * (type === 'robot' ? 122 : 91),
      type === 'poison' ? -74 : 0, 4, type === 'robot' ? 0x91eaff : 0xb8db77, type === 'poison' ? 230 : 0);
    enemy.setData({ actionAt: 0, recoverUntil: now + (isCharge ? 1800 : 2250) });
    if (Math.abs(distance) < 150) scene.ui.playSound(type === 'robot' ? 'electric' : type === 'poison' ? 'poison' : 'hazard');
  }
  const actionAt = enemy.getData('actionAt') || 0;
  warning.setPosition(enemy.x, enemy.y - 18).setVisible(actionAt > 0);
  if (actionAt) {
    enemy.setFlipX(enemy.getData('aim') < 0);
    enemy.setVelocityX(0);
  } else if (isCharge && now < enemy.getData('chargeUntil')) {
    const direction = enemy.getData('aim');
    const room = direction > 0 ? enemy.x < right - 2 : enemy.x > left + 2;
    enemy.setVelocityX(room ? direction * Math.min(113, speed * 2.3) : 0);
  } else if (enemy.body.velocity.x === 0 || Math.abs(enemy.body.velocity.x) > speed) {
    enemy.setVelocityX(enemy.x >= right - 2 ? -speed : enemy.x <= left + 2 ? speed : enemy.flipX ? -speed : speed);
  }
}
