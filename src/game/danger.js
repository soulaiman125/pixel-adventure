const palette = {
  laser: [0x5bf4ff, 0xe8ffff], lightning: [0xb19bff, 0xf0ecff],
  saw: [0xe6aabc, 0xfbe3ed], crusher: [0x9275a9, 0xfed3a6], walls: [0x9275a9, 0xfed3a6],
  electricFloor: [0x5ea4ff, 0xe1faff], electricPulse: [0x935eff, 0xf2daff],
  poisonPool: [0x7d9c3a, 0xdbf685], poisonCloud: [0x9baa46, 0xe5f29c],
  poisonSpit: [0x96c74d, 0xf0ffab], risingLava: [0xe15149, 0xffb560],
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
  } else if (kind === 'crusher') {
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
  }
  return frame;
}

export function dangerHits(body, hazard, frame) {
  if (frame.phase !== 'active') return false;
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

export function paintDanger(graphics, hazard, frame, elapsed = 0, reduced = false) {
  graphics.clear();
  const { kind } = hazard;
  const { x, y, width, height, phase, otherX } = frame;
  const [fill, edge] = palette[kind];
  const pulse = !reduced && Math.floor(elapsed / 125) % 2 === 0 ? .85 : .6;
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
    return;
  }
  if (phase !== 'active') {
    if (kind === 'crusher' || kind === 'walls') {
      drawBlock(graphics, x, y, width, height, fill, edge);
      if (otherX !== undefined) drawBlock(graphics, otherX, y, width, height, fill, edge);
    }
    if (phase === 'warning') {
      const markerWidth = kind === 'walls' ? hazard.spread * 2 : Math.max(12, width);
      graphics.fillStyle(0xffd787, pulse).fillRect(hazard.x - markerWidth / 2, 181, markerWidth, 3);
      if (kind === 'laser' || kind === 'lightning') {
        graphics.lineStyle(1, edge, pulse).strokeRect(x - width / 2, y - height / 2, width, height);
      }
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
}

export function addDanger(scene, hazard) {
  const graphics = scene.add.graphics().setDepth(hazard.kind === 'poisonPool' || hazard.kind === 'risingLava' ? -1 : 2);
  const frame = {};
  let previous;
  return (elapsed) => {
    if (Math.abs(scene.player.x - hazard.x) > 500) {
      graphics.setVisible(false);
      previous = undefined;
      return;
    }
    graphics.setVisible(true);
    hazardFrame(hazard, elapsed, frame);
    paintDanger(graphics, hazard, frame, elapsed, scene.ui.reduceMotion);
    if (frame.phase === 'warning' && previous !== frame.phase && Math.abs(scene.player.x - hazard.x) < 110) {
      scene.ui.playSound('warning');
    }
    previous = frame.phase;
    if (dangerHits(scene.player.body, hazard, frame)) scene.damage();
  };
}
