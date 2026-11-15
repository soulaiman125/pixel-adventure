const PARTICLE_LIMIT = 32;

export function createFeedback(scene) {
  const particles = Array.from({ length: PARTICLE_LIMIT }, () => ({
    art: scene.add.rectangle(0, 0, 2, 2).setVisible(false).setDepth(6),
    until: 0,
  }));
  const echo = scene.add.image(0, 0, 'hero-fall').setOrigin(.5, 1).setVisible(false).setDepth(5);
  const shield = scene.add.graphics().setDepth(5);
  let cursor = 0;
  let echoUntil = 0;
  let echoY = 0;

  function emit(x, y, color, count, dust = false) {
    if (scene.ui.reduceMotion) return;
    for (let index = 0; index < count; index++) {
      const particle = particles[cursor];
      cursor = (cursor + 1) % particles.length;
      const angle = index * Math.PI * 2 / count - Math.PI / 2;
      particle.x = x;
      particle.y = y;
      particle.dx = dust ? (index - 1.5) * 7 : Math.cos(angle) * 15;
      particle.dy = dust ? -4 : Math.sin(angle) * 13 - 2;
      particle.until = scene.elapsed + 270;
      particle.art.setPosition(x, y).setFillStyle(color).setAlpha(1).setVisible(true);
    }
  }

  return {
    emit,
    death(player) {
      if (scene.ui.reduceMotion) return;
      echoY = player.y;
      echoUntil = scene.elapsed + 245;
      echo.setPosition(player.x, echoY).setTexture('hero-fall')
        .setTint(0xff947c).setFlipX(player.flipX).setAlpha(.85).setVisible(true);
    },
    update() {
      const now = scene.elapsed;
      const reduced = scene.ui.reduceMotion;
      for (const { art, until, x, y, dx, dy } of particles) {
        if (!art.visible) continue;
        if (reduced || now >= until) art.setVisible(false);
        else {
          const age = 1 - (until - now) / 270;
          art.setPosition(Math.round(x + dx * age), Math.round(y + dy * age + 4 * age ** 2));
          art.setAlpha(1 - age);
        }
      }
      if (echo.visible) {
        const left = Math.max(0, (echoUntil - now) / 245);
        echo.setVisible(!reduced && left > 0).setAlpha(left * .85).setY(echoY - (1 - left) * 8);
      }
      shield.clear();
      if (now < scene.invulnerableUntil) {
        const { x, y } = scene.player;
        shield.lineStyle(1, 0xffdc95, .9).strokeRoundedRect(Math.round(x - 10), Math.round(y - 23), 20, 22, 4);
      }
    },
  };
}
