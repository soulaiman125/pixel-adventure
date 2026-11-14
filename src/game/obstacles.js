const WARNING_MS = 620;
const CYCLE_MS = 2700;

export function contact(scene, x, y, width, height) {
  const body = scene.player.body;
  if (body.right > x - width / 2 && body.left < x + width / 2
    && body.bottom > y - height / 2 && body.top < y + height / 2) scene.damage();
}

function spikes(scene, x, y, width) {
  const art = scene.add.graphics().setDepth(1);
  for (let offset = 0; offset < width; offset += 5) {
    const left = x - width / 2 + offset;
    const right = Math.min(left + 5, x + width / 2);
    art.fillStyle(0x4c455d).fillTriangle(left, y, (left + right) / 2, y - 8, right, y);
    art.fillStyle(0xf7ccd1).fillTriangle(left, y, (left + right) / 2, y - 8, (left + right) / 2, y);
  }
}

function falling(scene, type, x, y, width) {
  const ice = type === 'icicle';
  const fill = ice ? 0x9ce8ff : 0xd58f7a;
  const art = scene.add.graphics().setDepth(5);
  if (ice) {
    art.fillStyle(fill).fillTriangle(-width / 2, -8, width / 2, -8, 0, 9);
    art.fillStyle(0xe8ffff).fillTriangle(-width / 2, -8, 0, -8, 0, 9);
  } else {
    art.fillStyle(0x7b5361).fillRect(-width / 2, -6, width, 12);
    art.fillStyle(fill).fillRect(-width / 2 + 2, -7, width - 4, 8);
    art.fillStyle(0xf4be8d).fillRect(-width / 2 + 3, -7, width - 7, 2);
  }
  const warning = scene.add.graphics().setDepth(2);
  warning.fillStyle(0x412b3f).fillRect(x - 4, y - 17, 8, 13);
  warning.fillStyle(0xffdf84).fillRect(x - 1, y - 15, 2, 6).fillRect(x - 1, y - 7, 2, 2);
  return (time) => {
    const phase = (time + (x * 11) % CYCLE_MS) % CYCLE_MS;
    const flight = phase >= WARNING_MS && phase < WARNING_MS + 660;
    const t = (phase - WARNING_MS) / 660;
    const dropY = flight ? 25 + (y - 17) * t * t : 25;
    const near = Math.abs(scene.player.x - x) < 140;
    warning.setVisible(near && phase < WARNING_MS);
    art.setPosition(x, dropY).setVisible(near && (flight || phase < WARNING_MS));
    if (near && flight) contact(scene, x, dropY, width - 4, 11);
  };
}

function flame(scene, type, x, y, width) {
  const art = scene.add.graphics().setDepth(1);
  let frame = -1;
  return (time) => {
    const tick = scene.ui.reduceMotion ? 0 : Math.floor(time / 75);
    if (type === 'lava') {
      if (tick !== frame) {
        frame = tick;
        art.clear().fillStyle(0x9b344b).fillRect(x - width / 2, y, width, 26);
        art.fillStyle(0xff934f).fillRect(x - width / 2, y, width, 3);
        for (let offset = (tick * 2) % 15; offset < width - 5; offset += 15) {
          art.fillStyle(0xffcf75).fillRect(x - width / 2 + offset, y + 2, 5, 2);
        }
      }
      contact(scene, x, y + 14, width, 28);
      return;
    }
    const phase = (time + x * 6) % 2800;
    const active = phase >= 650 && phase < 1600;
    art.clear().fillStyle(0x593a51).fillRect(x - width / 2, y - 3, width, 3);
    if (phase < 650) {
      art.fillStyle(0xffc674).fillRect(x - 2, y - 9, 4, 5);
      return;
    }
    if (!active) return;
    const progress = (phase - 650) / 950;
    const height = type === 'jet' ? 40 : 12;
    const top = type === 'jet' ? y - height : y - 12 - 106 * progress * (1 - progress);
    art.fillStyle(0xe75252).fillRect(x - width / 2, top, width, height);
    art.fillStyle(0xff9951).fillRect(x - width / 2 + 2, top + 2, width - 4, height - 2);
    const coreTop = 4 + tick % 4;
    art.fillStyle(0xffda78).fillRect(x - 2, top + coreTop, 4, height - coreTop - 1);
    contact(scene, x, top + height / 2, width - 4, height - 2);
  };
}

export function addObstacles(scene, hazards = []) {
  const updates = [];
  for (const [type, x, y, width, range] of hazards) {
    if (type === 'rock' || type === 'icicle') {
      updates.push(falling(scene, type, x, y, width));
      continue;
    }
    if (['lava', 'jet', 'fireball'].includes(type)) {
      updates.push(flame(scene, type, x, y, width));
      continue;
    }
    if (type === 'sweep') {
      const saw = scene.add.graphics().setDepth(2);
      const radius = width / 2;
      saw.fillStyle(0xf4a3b8);
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        saw.fillTriangle(0, 0, Math.cos(angle - .24) * radius, Math.sin(angle - .24) * radius,
          Math.cos(angle + .24) * radius, Math.sin(angle + .24) * radius);
      }
      saw.fillStyle(0x765479).fillCircle(0, 0, radius * .62);
      updates.push((time) => {
        const position = x + Math.sin(time / 520) * range;
        saw.setPosition(position, y);
        if (!scene.ui.reduceMotion) saw.setRotation(time / 175);
        contact(scene, position, y, width * .72, width * .72);
      });
      continue;
    }
    spikes(scene, x, y, width);
    updates.push(() => contact(scene, x, y - 4, width - 3, 8));
  }
  return updates;
}

export function updatePlatforms(scene) {
  for (const ledge of scene.specialPlatforms) {
    const { surface, visual, x, y, kind, a, b, period } = ledge;
    if (kind === 'vanish') {
      const phase = (scene.elapsed + x * 7) % period / period;
      const present = phase < 0.76;
      surface.body.enable = present;
      visual.setAlpha(!present ? 0.13 : phase > 0.59 ? (scene.ui.reduceMotion ? 0.57 : 0.62 + Math.sin(phase * 140) * 0.2) : 1);
      continue;
    }
    if (kind === 'crumble') {
      if (scene.riding === surface && ledge.triggered === undefined) ledge.triggered = scene.elapsed;
      if (ledge.triggered === undefined) continue;
      const age = scene.elapsed - ledge.triggered;
      if (age >= 2300) {
        ledge.triggered = undefined;
        surface.body.enable = true;
        visual.setAlpha(1).setPosition(x, y);
      } else if (age >= 540) {
        surface.body.enable = false;
        visual.setAlpha(Math.max(0, 1 - (age - 540) / 380)).setY(y + (scene.ui.reduceMotion ? 0 : (age - 540) / 12));
      } else {
        visual.setAlpha(scene.ui.reduceMotion ? 0.61 : 0.75 + Math.sin(age / 24) * 0.25);
      }
      continue;
    }
    if (kind !== 'moving') continue;
    const phase = (1 - Math.cos(scene.elapsed / period * 2 * Math.PI)) / 2;
    const nextX = x + a * (phase - 0.5) * 2;
    const nextY = y + b * (phase - 0.5) * 2;
    const dx = nextX - visual.x;
    const dy = nextY - visual.y;
    if (scene.riding === surface) {
      const player = scene.player;
      if (player.body.velocity.y >= 0) {
        player.x += dx;
        player.y += dy;
      }
    }
    visual.setPosition(nextX, nextY);
    surface.setPosition(surface.x + dx, surface.y + dy).body.updateFromGameObject();
  }
  scene.riding = null;
}
