export const CHARGE_READY = 320;
export const CHARGE_LIMIT = 900;
export const SPRINT_SPEED = 172;

export const SPECIALS = {
  charged: { duration: 390, windows: [[114,160,18]] },
  cyclone: { duration: 490, windows: [[128,214,13],[244,315,7]] },
  execution: { duration: 610, windows: [[190,230,6],[272,314,6],[390,445,19]] },
};

export function energyCost(kind, tier) {
  return kind === 'execution' ? 60 : tier >= 2 ? 24 : 30;
}

export function adjustEnergy(state, change) {
  state.energy = Math.max(0, Math.min(100, (state.energy ?? 0) + change));
}

export function activeWindows(action, elapsed) {
  const { windows } = SPECIALS[action.kind];
  const age = elapsed - action.since;
  return windows.map(([open,close], index) => age >= open && age < close ? index : -1).filter(index => index >= 0);
}

export function inRadius(box, x, y, radius) {
  const dx = x - Math.max(box.left,Math.min(x,box.right));
  const dy = y - Math.max(box.top,Math.min(y,box.bottom));
  return dx*dx + dy*dy <= radius*radius;
}
