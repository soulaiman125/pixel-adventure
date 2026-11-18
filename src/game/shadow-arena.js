export const SHADOW_ARENA = {
  name: 'Shadow Training Hall', theme: 'verdant', width: 1060, spawnX: 68, flagX: 1020,
  ground: [[0, 1060]],
  platforms: [[275, 150, 56], [390, 124, 62], [528, 143, 60], [800, 141, 54], [880, 118, 56]],
  solidWalls: [[740, 112, 14, 72]],
  coins: [[301, 133], [420, 107], [908, 101]],
  enemies: [[380, 62, 27], [496, 125, 23, 'flying'], [225, 0, 0, 'dummy'],
    [766, 16, 22, 'guard'], [793, 20, 16], [830, 46, 26]],
  boss: {kind:'crown',name:'Training Crown',x:1002,start:914,hp:6},
  hazards: [{ kind: 'laserGrid', x: 960, y: 162, width: 31, height: 43, spacing: 9,
    warning: 900, active: 760, period: 3200, offset: 0 }],
  trees: [[22, .65], [125, .50], [592, .65], [1018, .52]],
};
