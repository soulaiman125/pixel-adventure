export const DASH = { speed: 252, duration: 155, cooldown: 700 };
export const SHURIKEN = { duration: 300, release: 77, speed: 245, life: 630, damage: 8 };
export const KATANA = [
  { pose: 'slash1', duration: 182, open: 48, close: 105, buffer: 94, damage: 10, x: 6, y: -16, w: 23, h: 13 },
  { pose: 'slash2', duration: 215, open: 60, close: 135, buffer: 119, damage: 12, x: 5, y: -30, w: 23, h: 25 },
  { pose: 'slash3', duration: 350, open: 150, close: 229, buffer: 230, damage: 20, x: 3, y: -24, w: 29, h: 23 },
];

export function strikeBox(spec, x, y, direction) {
  const start = x + direction * spec.x;
  const end = start + direction * spec.w;
  return { left: Math.min(start, end), right: Math.max(start, end), top: y + spec.y, bottom: y + spec.y + spec.h };
}

export function intersects(a, b) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

export function startStrike(state, now, direction, index = 0) {
  state.attack = { index, since: now, direction, queued: false, hit: new Set() };
}

export function stepStrike(state, now, pressed, direction, canStart, bufferBonus = 0, combo = KATANA) {
  const strike = state.attack;
  if (!strike) {
    if (pressed && canStart) startStrike(state, now, direction);
    return;
  }
  const spec = combo[strike.index];
  const age = now - strike.since;
  if (pressed && !strike.dive && strike.index < 2 && age >= spec.buffer - bufferBonus && age < spec.duration) strike.queued = true;
  if (age < spec.duration) return;
  state.attack = null;
  if (strike.queued) startStrike(state, now, direction, strike.index + 1);
  else if (pressed && canStart) startStrike(state, now, direction);
}

export function canDash(state, time, grounded) {
  return !state.dash && !state.attack && !state.throw && !state.special && !state.charging && !state.parry
    && time >= (state.diveLandUntil ?? 0)
    && (grounded ? time >= state.groundDashAt : !state.airUsed);
}

// Fraction along a rightward or leftward horizontal segment, including projectile radius.
export function horizontalEntry(x, next, y, box, radius = 0) {
  if (y < box.top - radius || y > box.bottom + radius) return Infinity;
  const left = box.left - radius;
  const right = box.right + radius;
  if (x >= left && x <= right) return 0;
  if (next > x && x < left && next >= left) return (left - x) / (next - x);
  if (next < x && x > right && next <= right) return (right - x) / (next - x);
  return Infinity;
}
