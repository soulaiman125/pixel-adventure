import { dangerHits, hazardFrame, paintDanger } from './danger.js';

const names = {
  spores: 'Spore mark · Move away',
  venom: 'Venom sweep · Jump the low wave',
  bloom: 'Spore bloom · Leave the marked zone',
  wave: 'Shockwave · Jump the low wave',
  bolts: 'Lightning rods · Leave the marked zone',
  impact: 'Impact zone · Move away',
};

const profiles = {
  queen: [
    { pattern: 'spores', warning: 960, attack: 1260, open: 2350 },
    { pattern: 'venom', warning: 880, attack: 1400, open: 2090 },
    { pattern: 'bloom', warning: 840, attack: 1280, open: 1830 },
  ],
  titan: [
    { pattern: 'wave', warning: 1030, attack: 1400, open: 2380 },
    { pattern: 'bolts', warning: 920, attack: 1350, open: 2100 },
    { pattern: 'impact', warning: 830, attack: 1420, open: 1800 },
  ],
};

export function bossTier(boss) {
  return Math.min(2, Math.floor((boss.maxHp - boss.hp) * 3 / boss.maxHp));
}

function attackPlan(pattern, target) {
  const field = (kind, x, y, width, height, options) =>
    ({ kind, x, y, width, height, offset: 0, warning: 0, active: 1200, period: 4000, ...options });
  switch (pattern) {
    case 'spores': return [field('poisonCloud', target, 166, 40, 30)];
    case 'bloom': return [-27, 0, 27].map((offset) => field('poisonCloud', target + offset, 166, 22, 32));
    case 'bolts': return [-20, 20].map((offset) => field('lightning', target + offset, 135, 12, 90));
    case 'impact': return [
      field('crusher', target, 108, 52, 26, { dy: 60, active: 1050 }),
      field('electricPulse', target, 176, 72, 15, { warning: 610, active: 610 }),
    ];
    default: return [];
  }
}

function beginWarning(scene, boss) {
  boss.phase = 'warn';
  boss.tier = bossTier(boss);
  boss.profile = profiles[boss.kind][boss.tier];
  boss.target = Math.round(scene.player.x);
  boss.since = scene.elapsed;
  boss.traps = attackPlan(boss.profile.pattern, boss.target);
  while (boss.trapArt.length < boss.traps.length) {
    boss.trapArt.push({ art: scene.add.graphics().setDepth(3), frame: {} });
  }
  scene.ui.playSound('warning');
}

function shell(boss, reduced, time) {
  const art = boss.art;
  const x = boss.x;
  const queen = boss.kind === 'queen';
  const open = boss.phase === 'open' && boss.hits < 2;
  const hit = !reduced && boss.flashUntil > time;
  const bright = queen ? 0xd0e889 : 0x9ff7ff;
  const shellColor = queen ? 0x668849 : 0x535d9a;
  art.clear().fillStyle(0x272438).fillRect(x - 20, 151, 40, 33);
  art.fillStyle(hit ? 0xffefbb : shellColor).fillRect(x - 16, 151, 32, 29);
  art.fillStyle(0x30293a).fillRect(x - 11, 160, 22, 9);
  if (queen) {
    art.fillStyle(shellColor).fillTriangle(x - 17, 158, x - 34, 140, x - 29, 172);
    art.fillTriangle(x + 17, 158, x + 34, 140, x + 29, 172);
    art.fillStyle(bright).fillTriangle(x - 18, 156, x - 28, 146, x - 23, 165);
    art.fillTriangle(x + 18, 156, x + 28, 146, x + 23, 165);
  } else {
    art.fillStyle(shellColor).fillRect(x - 29, 154, 10, 15).fillRect(x + 19, 154, 10, 15);
    art.fillStyle(bright).fillRect(x - 25, 147, 4, 11).fillRect(x + 21, 147, 4, 11);
  }
  art.fillStyle(open ? 0xffda82 : bright).fillRect(x - 6, 162, 12, 4);
  for (let step = 0; step <= (boss.tier ?? 0); step++) {
    art.fillStyle(bright).fillRect(x - 10 + step * 8, 144, 4, 3 + step);
  }
}

export function resetExpansionBoss(scene, boss) {
  boss.hp = boss.maxHp;
  boss.phase = 'waiting';
  boss.tier = 0;
  boss.cycle = 0;
  boss.hits = 0;
  boss.flashUntil = 0;
  for (const { art } of boss.trapArt) art.clear();
  boss.indicator.clear();
  scene.ui.onBoss(boss, 'Re-enter the arena');
}

export function updateExpansionBoss(scene, boss, fire) {
  const now = scene.elapsed;
  if (boss.phase === 'waiting') {
    if (scene.player.x < boss.start) {
      shell(boss, scene.ui.reduceMotion, now);
      return;
    }
    beginWarning(scene, boss);
  }
  let age = now - boss.since;
  const { pattern, warning, attack, open } = boss.profile;
  if (boss.phase === 'warn' && age >= warning) {
    boss.phase = 'attack';
    boss.since = now;
    age = 0;
    if (pattern === 'wave' || pattern === 'venom') {
      const side = scene.player.x < boss.x ? -1 : 1;
      const tint = pattern === 'venom' ? 0xb4df73 : 0x85d9ff;
      fire(scene, boss.x + side * 21, 177, side * 115, 0, 5, tint);
      fire(scene, boss.x + side * 22, 173, side * 153, 0, 4, tint);
    }
  } else if (boss.phase === 'attack' && age >= attack) {
    boss.phase = 'open';
    boss.hits = 0;
    boss.since = now;
  } else if (boss.phase === 'open' && age >= open) {
    boss.cycle++;
    beginWarning(scene, boss);
  }
  shell(boss, scene.ui.reduceMotion, now);
  boss.indicator.clear();
  if (boss.phase === 'warn' && boss.traps.length === 0) {
    boss.indicator.fillStyle(0xffd787).fillRect(boss.x - 30, 181, 60, 3);
  }
  boss.trapArt.forEach(({ art, frame }, index) => {
    const field = boss.traps[index];
    if (!field || boss.phase === 'open' || boss.phase === 'waiting') {
      art.clear();
      return;
    }
    hazardFrame(field, now - boss.since, frame);
    if (boss.phase === 'warn') frame.phase = 'warning';
    paintDanger(art, field, frame, now, scene.ui.reduceMotion);
    if (dangerHits(scene.player.body, field, frame)) scene.damage();
  });
  if (boss.phase === 'waiting') return;
  const label = `Phase ${boss.tier + 1}/3`;
  const text = boss.phase === 'warn' ? names[boss.profile.pattern] : boss.phase === 'attack' ? 'Dodge!'
    : boss.hits < 2 ? 'Attack now!' : 'Guard up · Get ready';
  scene.ui.onBoss(boss, `${label} · ${text}`);
}
