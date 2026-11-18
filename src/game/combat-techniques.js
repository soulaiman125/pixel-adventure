export const CHARGE_READY = 320;
export const CHARGE_LIMIT = 900;
export const SPRINT_SPEED = 176;
export const PARRY = { duration:260, start:34, end:132, miss:800, success:325, counter:490 };
export const AIR_DIVE = { x:-6, y:-8, w:22, h:21, open:64, close:171, damage:15, duration:285 };

export function cooldown(kind, tier = 0) {
  switch (kind) {
    case 'charged': return 1500;
    case 'throw': return tier >= 3 ? 590 : tier ? 305 : 350;
    case 'dash': return tier ? 615 : 700;
    case 'cyclone': return tier >= 2 ? 2500 : 3000;
    case 'execution': return 6000;
    default: return 0;
  }
}

export function canParry(parry, now, sourceX, playerX) {
  if (!parry || parry.success) return false;
  const age = now - parry.since;
  return age >= PARRY.start && age < PARRY.end+(parry.guard??0) && (sourceX - playerX) * parry.direction >= -3;
}

export const SPECIALS = {
  charged: { duration: 390, windows: [[114,160,18]] },
  cyclone: { duration: 490, windows: [[128,214,13],[244,315,7]] },
  execution: { duration: 610, windows: [[190,230,6],[272,314,6],[390,445,19]] },
};

export function activeWindows(action, elapsed) {
  const { windows } = action.spec ?? SPECIALS[action.kind];
  const age = elapsed - action.since;
  return windows.map(([open,close], index) => age >= open && age < close ? index : -1).filter(index => index >= 0);
}

export function inRadius(box, x, y, radius) {
  const dx = x - Math.max(box.left,Math.min(x,box.right));
  const dy = y - Math.max(box.top,Math.min(y,box.bottom));
  return dx*dx + dy*dy <= radius*radius;
}
