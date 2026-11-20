const HIT_STOP_MS = 190;
const DISSOLVE_MS = 840;
const accents = {
  crown: [0xf2ca8d,0xae80df], queen: [0xe9ff96,0x8bc951], titan: [0xddfaff,0x6ce5ff],
  phantom: [0xeedcff,0xa68be6], abyss: [0xbeffef,0x659fbf], dragon: [0xe6f5ff,0x9ed3ef],
  cyber: [0x9cffff,0xf775e1], emperor: [0xffc2d8,0xe87a90],
};

export function beginBossFinisher(scene, boss) {
  if (!scene.swampOptions?.finisher || scene.ui.reduceMotion || scene.bossFinisher) return false;
  const camera = scene.cameras.main, originalZoom = camera.zoom;
  const [light, color] = accents[boss.kind] ?? accents.crown;
  const graphics = scene.add.graphics().setDepth(9);
  const wasPaused = scene.physics.world.isPaused;
  scene.physics.pause();
  scene.controls.discardActions();
  camera.flash(156, light >> 16, light >> 8 & 255, light & 255, true);
  let time = 0;
  boss.finishAge = 0;
  scene.bossFinisher = delta => {
    time += Math.min(50, delta);
    const release = Math.max(0, time - HIT_STOP_MS);
    const t = Math.min(1, release / DISSOLVE_MS);
    boss.finishAge = release * .82;
    const punch = Math.min(1, time / 85) * (1 - t) ** 3;
    camera.setZoom(originalZoom * (1 + .12 * punch));
    const x = boss.x, y = 159;
    graphics.clear();
    if (release > 0) {
      graphics.lineStyle(2, light, .65 * (1 - t) ** 2).strokeCircle(x, y, 8 + 51 * t);
      for (let i = 0; i < 27; i++) {
        const angle = i * 2.39996;
        const travel = (20 + i % 7 * 7) * (1 - (1 - t) ** 2);
        const px = x + Math.cos(angle) * travel;
        const py = y + Math.sin(angle) * travel * .83 - 20 * t + 16 * t * t;
        const size = (1.4 + i % 4) * (1 - t * .72), lightness = (1 - t) ** 1.15;
        graphics.fillStyle(i % 3 ? color : light, lightness)
          .fillTriangle(px - size, py, px + size * .72, py - size, px + size, py + size * .5);
      }
    }
    if (t === 1) {
      graphics.destroy();
      camera.setZoom(originalZoom);
      boss.finishAge = Infinity;
      scene.bossFinisher = null;
      scene.controls.discardActions();
      if (!wasPaused) scene.physics.resume();
    }
  };
  return true;
}
