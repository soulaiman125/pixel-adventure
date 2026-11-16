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

export function scriptLevel(level, index) {
  if (!encounters[index]) return level;
  return {
    ...level,
    enemies: level.enemies.map(([x, distance, speed, type], slot) =>
      [x, distance, speed, encounters[index][slot] ?? type]),
  };
}
