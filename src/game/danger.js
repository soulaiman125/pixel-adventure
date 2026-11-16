import { segmentIntersectsBox } from './monster-ai.js';

const palette = {
  laser: [0x5bf4ff, 0xe8ffff], lightning: [0xb19bff, 0xf0ecff],
  saw: [0xe6aabc, 0xfbe3ed], crusher: [0x9275a9, 0xfed3a6], walls: [0x9275a9, 0xfed3a6],
  electricFloor: [0x5ea4ff, 0xe1faff], electricPulse: [0x935eff, 0xf2daff],
  poisonPool: [0x7d9c3a, 0xdbf685], poisonCloud: [0x9baa46, 0xe5f29c],
  poisonSpit: [0x96c74d, 0xf0ffab], risingLava: [0xe15149, 0xffb560],
  rotatingLaser: [0x459ce4, 0xe2fcff], laserGrid: [0x7896fa, 0xe7faff],
  piston: [0xbd756e, 0xffd7a0], charged: [0x7159b9, 0xd6fbff],
};

export function hazardPhase(hazard, elapsed) {
  if (hazard.kind === 'saw' || hazard.kind === 'poisonPool') return 'active';
  const period = hazard.period ?? 3100;
  const time = ((elapsed + (hazard.offset ?? (hazard.x * 3) % 850)) % period + period) % period;
  const warning = hazard.warning ?? 780;
  if (time < warning) return 'warning';
  return time < warning + (hazard.active ?? 740) ? 'active' : 'idle';
}

// Reuse the frame object in the game loop. Its coordinates always match the active art.
export function hazardFrame(hazard, elapsed, frame = {}) {
  const { kind, x, y, width, height, dx = 0, dy = 0 } = hazard;
  const period = hazard.period ?? 3100;
  const time = ((elapsed + (hazard.offset ?? (x * 3) % 850)) % period + period) % period;
  const phase = hazardPhase(hazard, elapsed);
  const age = Math.min(1, Math.max(0, (time - (hazard.warning ?? 780)) / (hazard.active ?? 740)));
  const travel = Math.sin(elapsed / period * 2 * Math.PI);
  frame.phase = phase;
  frame.width = width;
  frame.height = height;
  frame.x = x;
  frame.y = y;
  frame.otherX = undefined;
  if (kind === 'saw' || kind === 'laser' || kind === 'lightning') {
    frame.x += dx * travel;
    frame.y += dy * travel;
  } else if (kind === 'crusher' || kind === 'piston') {
    frame.y += phase === 'active' ? dy * Math.min(1, age * 4, (1 - age) * 4) : 0;
  } else if (kind === 'walls') {
    const closing = phase === 'active' ? Math.min(1, age * 3, (1 - age) * 3) : 0;
    frame.x = x - hazard.spread * (1 - closing * .78);
    frame.otherX = 2 * x - frame.x;
  } else if (kind === 'poisonSpit') {
    frame.x += age * dx;
    frame.y -= 37 * 4 * age * (1 - age);
  } else if (kind === 'risingLava' && phase === 'active') {
    frame.y = Math.max(202, y - dy * Math.sin(Math.PI * age));
  } else if (kind === 'rotatingLaser') {
    const angle = (hazard.angle ?? 0) + age * Math.PI;
    frame.armX = Math.cos(angle) * hazard.radius;
    frame.armY = Math.sin(angle) * hazard.radius;
  }
  return frame;
}

export function dangerHits(body, hazard, frame) {
  if (frame.phase !== 'active') return false;
  if (hazard.kind === 'rotatingLaser') {
    return segmentIntersectsBox(frame.x - frame.armX, frame.y - frame.armY, frame.x + frame.armX, frame.y + frame.armY,
      body.left - 2, body.top - 2, body.right + 2, body.bottom + 2);
  }
  if (hazard.kind === 'laserGrid') {
    if (body.bottom < frame.y - frame.height / 2 || body.top > frame.y + frame.height / 2) return false;
    for (let beam = -1; beam <= 1; beam++) {
      const position = frame.x + beam * hazard.spacing;
      if (body.left - 2 <= position && body.right + 2 >= position) return true;
    }
    return false;
  }
  const halfWidth = Math.max(1, frame.width / 2 - 2);
  const halfHeight = Math.max(1, frame.height / 2 - 1);
  if (hazard.kind === 'saw') {
    const dx = Math.max(body.left - frame.x, 0, frame.x - body.right);
    const dy = Math.max(body.top - frame.y, 0, frame.y - body.bottom);
    return dx * dx + dy * dy < halfWidth ** 2;
  }
  if (body.bottom <= frame.y - halfHeight || body.top >= frame.y + halfHeight) return false;
  return (body.right > frame.x - halfWidth && body.left < frame.x + halfWidth)
    || (frame.otherX !== undefined && body.right > frame.otherX - halfWidth && body.left < frame.otherX + halfWidth);
}

function drawBlock(graphics, x, y, width, height, color, edge) {
  const left = x - width / 2;
  const top = y - height / 2;
  graphics.fillStyle(color).fillRect(left, top, width, height);
  graphics.fillStyle(edge).fillRect(left + 2, top + height - 4, width - 4, 2);
}

function drawWarning(graphics, hazard, frame, opacity, assisted) {
  const { kind, dx = 0, dy = 0, spread } = hazard;
  const { x, y, width, height } = frame;
  const size = kind === 'walls' ? spread * 2 + width : Math.max(12, width + Math.abs(dx) * 2);
  const left = hazard.x - size / 2;
  graphics.fillStyle(0xffd787, opacity);
  for (let mark = 0; mark < size; mark += 8) {
    graphics.fillRect(left + mark, 181, Math.min(5, size - mark), 2);
  }
  const color = assisted ? 0xfff2a3 : 0xffca77;
  graphics.lineStyle(assisted ? 2 : 1, color, opacity);
  if (kind === 'laser' || kind === 'lightning') {
    graphics.strokeRect(x - width / 2, y - height / 2, width, height);
    if (assisted && (dx || dy)) {
      graphics.strokeRect(hazard.x - width / 2 - Math.abs(dx), hazard.y - height / 2 - Math.abs(dy),
        width + Math.abs(dx) * 2, height + Math.abs(dy) * 2);
    }
  } else if (kind === 'crusher' || kind === 'piston') {
    graphics.strokeRect(x - width / 2, y + dy - height / 2, width, height);
    if (assisted) graphics.strokeRect(x - width / 2, y + Math.min(0, dy) - height / 2, width, height + Math.abs(dy));
  } else if (kind === 'risingLava') {
    graphics.fillRect(x - width / 2, Math.max(202, y - dy) - height / 2, width, 2);
  } else if (kind === 'poisonSpit') {
    for (let step = 0; step <= 1; step += .25) {
      graphics.fillRect(x + dx * step, y - 148 * step * (1 - step), 2, 2);
    }
  } else if (kind !== 'walls') {
    graphics.strokeRect(x - width / 2, y - height / 2, width, height);
  }
}

export function paintDanger(graphics, hazard, frame, elapsed = 0, reduced = false, assisted = false) {
  graphics.clear();
  const { kind } = hazard;
  const { x, y, width, height, phase, otherX } = frame;
  const [fill, edge] = palette[kind];
  const pulse = reduced ? .85 : .76 + Math.sin(elapsed / 155) * .13;
  if (kind === 'rotatingLaser' || kind === 'laserGrid') {
    graphics.fillStyle(fill, .8).fillRect(x - 3, y - 3, 6, 6);
    if (phase === 'idle') return;
    const live = phase === 'active';
    graphics.lineStyle(live ? 4 : 1, live ? edge : 0xffcf92, live ? 1 : pulse);
    if (kind === 'rotatingLaser') {
      graphics.lineBetween(x - frame.armX, y - frame.armY, x + frame.armX, y + frame.armY);
      if (!live) graphics.strokeCircle(x, y, hazard.radius);
    } else {
      for (let beam = -1; beam <= 1; beam++) {
        const position = x + beam * hazard.spacing;
        graphics.lineBetween(position, y - height / 2, position, y + height / 2);
      }
    }
    return;
  }
  if (kind === 'saw') {
    const angle = reduced ? 0 : elapsed / 125;
    const radius = width / 2;
    graphics.fillStyle(fill).fillCircle(x, y, radius * .77);
    graphics.fillStyle(edge);
    for (let i = 0; i < 8; i++) {
      const a = angle + i * Math.PI / 4;
      graphics.fillTriangle(x + Math.cos(a) * radius, y + Math.sin(a) * radius,
        x + Math.cos(a - .25) * radius * .62, y + Math.sin(a - .25) * radius * .62,
        x + Math.cos(a + .27) * radius * .62, y + Math.sin(a + .27) * radius * .62);
    }
    graphics.fillStyle(0x4b4159).fillRect(x - 2, y - 2, 4, 4);
    if (assisted) graphics.lineStyle(1, 0xffe49a, .8).strokeCircle(x, y, radius - 2);
    return;
  }
  if (phase !== 'active') {
    if (kind === 'crusher' || kind === 'walls' || kind === 'piston') {
      drawBlock(graphics, x, y, width, height, fill, edge);
      if (otherX !== undefined) drawBlock(graphics, otherX, y, width, height, fill, edge);
    }
    if (phase === 'warning') {
      drawWarning(graphics, hazard, frame, pulse, assisted);
    }
    return;
  }
  if (kind === 'poisonCloud') {
    graphics.fillStyle(fill, .38).fillRect(x - width / 2, y - height / 2, width, height);
    graphics.lineStyle(1, edge, .86).strokeRect(x - width / 2, y - height / 2, width, height);
    for (let i = -width / 2 + 4; i < width / 2; i += 8) {
      graphics.fillStyle(edge, pulse).fillRect(x + i, y + (i % 3) - 3, 3, 3);
    }
  } else {
    drawBlock(graphics, x, y, width, height, fill, edge);
    if (otherX !== undefined) drawBlock(graphics, otherX, y, width, height, fill, edge);
    if (kind === 'laser' || kind === 'lightning') {
      graphics.fillStyle(edge).fillRect(x - Math.max(1, width / 2 - 2), y - Math.max(1, height / 2 - 2),
        Math.max(2, width - 4), Math.max(2, height - 4));
    }
  }
  if (assisted) {
    graphics.lineStyle(1, 0xffeca7, .92).strokeRect(x - width / 2, y - height / 2, width, height);
    if (otherX !== undefined) graphics.strokeRect(otherX - width / 2, y - height / 2, width, height);
  }
}

const hazardSounds = {
  laser: ['laserCharge', 'laserFire'],
  lightning: ['laserCharge', 'electric'],
  electricFloor: ['charge', 'electric'],
  electricPulse: ['charge', 'electric'],
  risingLava: ['warning', 'fire'],
  crusher: ['charge', 'impact'],
  walls: ['charge', 'impact'],
  poisonCloud: ['warning', 'poison'],
  poisonSpit: ['warning', 'poison'],
  rotatingLaser: ['laserCharge', 'laserFire'],
  laserGrid: ['laserCharge', 'laserFire'],
  piston: ['charge', 'impact'],
  charged: ['charge', 'electric'],
};

export function addDanger(scene, hazard) {
  const graphics = scene.add.graphics().setDepth(hazard.kind === 'poisonPool' || hazard.kind === 'risingLava' ? -1 : 2);
  const frame = {};
  let previous;
  let sawAfter = 0;
  return (elapsed) => {
    if (Math.abs(scene.player.x - hazard.x) > 500) {
      graphics.setVisible(false);
      previous = undefined;
      return;
    }
    hazardFrame(hazard, elapsed, frame);
    const visible = frame.x + frame.width / 2 + (hazard.spread ?? 0) >= scene.cameraX - 45
      && frame.x - frame.width / 2 - (hazard.spread ?? 0) <= scene.cameraX + scene.scale.width + 45;
    graphics.setVisible(visible);
    if (visible) paintDanger(graphics, hazard, frame, elapsed, scene.ui.reduceMotion, scene.ui.dangerGuides);
    const near = Math.abs(scene.player.x - frame.x) < 110;
    if (near && previous !== frame.phase && hazardSounds[hazard.kind]) {
      const [warn, activate] = hazardSounds[hazard.kind];
      if (frame.phase === 'warning') scene.ui.playSound(warn);
      if (frame.phase === 'active') scene.ui.playSound(activate);
    }
    if (hazard.kind === 'saw' && Math.abs(scene.player.x - frame.x) < 42 && elapsed >= sawAfter) {
      sawAfter = elapsed + 1200;
      scene.ui.playSound('saw');
    }
    previous = near ? frame.phase : undefined;
    if (dangerHits(scene.player.body, hazard, frame)) scene.damage();
  };
}
