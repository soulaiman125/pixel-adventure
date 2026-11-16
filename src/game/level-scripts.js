const encounters = {
  7: { 2: 'golem' },
  13: { 1: 'demon' },
  15: { 0: 'demon', 3: 'golem' },
  17: { 1: 'assassin' },
  18: { 1: 'assassin', 4: 'knight' },
  19: { 2: 'knight' },
  20: { 0: 'stalker', 1: 'knight' },
  22: { 1: 'stalker' },
  24: { 0: 'knight' },
  25: { 0: 'sentinel', 2: 'sentinel' },
  27: { 0: 'golem', 4: 'sentinel' },
  28: { 1: 'assassin', 4: 'sentinel' },
};

export const trap = (kind, x, y, width, height, options = {}) => ({ kind, x, y, width, height, ...options });

const traps = {
  23: [trap('piston', 1580, 195, 22, 20, { dy: -23, warning: 850, offset: 900 })],
  26: [trap('laserGrid', 631, 165, 36, 38, { spacing: 13, warning: 930, offset: 950, active: 590 })],
  27: [trap('charged', 1052, 143, 25, 8, { warning: 930, offset: 610 })],
  28: [trap('rotatingLaser', 1091, 166, 62, 62, { radius: 28, angle: -.35, warning: 1000, active: 780, offset: 1600 })],
};

export function scriptLevel(level, index) {
  if (!encounters[index] && !traps[index]) return level;
  return {
    ...level,
    hazards: traps[index] ? [...level.hazards, ...traps[index]] : level.hazards,
    enemies: encounters[index] ? level.enemies.map(([x, distance, speed, type], slot) =>
      [x, distance, speed, encounters[index][slot] ?? type]) : level.enemies,
  };
}
