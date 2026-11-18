import { dangerHits, hazardFrame, paintDanger } from './danger.js';
import { paintTitanField } from './prototype-titan.js';
import { LEGEND_BOSSES, LEGEND_TELEGRAPHS } from './legends-bosses.js';

const names = {
  spores: 'Spore mark · Move away',
  venom: 'Venom sweep · Jump or parry the approaching shot',
  bloom: 'Spore bloom · Leave the marked zone',
  wave: 'Shockwave · Jump or parry the approaching shot',
  bolts: 'Lightning rods · Leave the marked zone',
  impact: 'Impact then pulse · Clear the marked zone',
  sigils: 'Falling sigils · Leave the marked zone',
  crownfall: 'Crownfall · Leave the marked zone',
};

const profiles = {
  crown: [
    { pattern: 'wave', warning: 1000, attack: 1360, open: 2270 },
    { pattern: 'sigils', warning: 960, attack: 1270, open: 2020 },
    { pattern: 'crownfall', warning: 980, attack: 1400, open: 1690 },
  ],
  queen: [
    { pattern: 'spores', warning: 960, attack: 1260, open: 2350 },
    { pattern: 'venom', warning: 880, attack: 1400, open: 2090 },
    { pattern: 'bloom', warning: 900, attack: 1280, open: 1650 },
  ],
  titan: [
    { pattern: 'wave', warning: 1030, attack: 1400, open: 2380 },
    { pattern: 'bolts', warning: 920, attack: 1350, open: 2100 },
    { pattern: 'impact', warning: 900, attack: 1420, open: 1580 },
  ],
};

export function bossTier(boss) {
  return Math.min(2, Math.floor((boss.maxHp - boss.hp) * 3 / boss.maxHp));
}

export function phaseHealthFloor(boss) {
  return Math.max(0, boss.maxHp - Math.ceil(((boss.tier ?? 0) + 1) * boss.maxHp / 3));
}

function attackPlan(pattern, target) {
  const field = (kind, x, y, width, height, options) =>
    ({ kind, x, y, width, height, offset: 0, warning: 0, active: 1200, period: 4000, ...options });
  switch (pattern) {
    case 'spores': return [field('poisonCloud', target, 166, 40, 30)];
    case 'bloom': return [-27, 0, 27].map((offset) =>
      field('poisonCloud', target + offset, 166, 22, 32, { warning: offset ? 180 : 0, active: 1080 }));
    case 'bolts': return [-20, 20].map((offset) => field('lightning', target + offset, 135, 12, 90));
    case 'sigils': return [-18, 0, 18].map((offset) =>
      field('crusher', target + offset, 101, 12, 22, { dy: 65, warning: offset ? 150 : 0, active: 990 }));
    case 'crownfall': return [
      field('crusher', target, 107, 58, 28, { dy: 61, active: 920 }),
      field('electricPulse', target, 176, 83, 13, { warning: 580, active: 640 }),
    ];
    case 'impact': return [
      field('crusher', target, 108, 52, 26, { dy: 60, active: 1050 }),
      field('electricPulse', target, 176, 78, 15, { warning: 610, active: 610 }),
    ];
    default: return [];
  }
}

function beginWarning(scene, boss) {
  const previousTier = boss.tier;
  boss.phase = 'warn';
  boss.tier = bossTier(boss);
  const pattern = (LEGEND_BOSSES[boss.kind]?.phases ?? profiles[boss.kind])[boss.tier];
  const pace = scene.level?.script?.bossPace ?? 1;
  boss.profile = { ...pattern, warning: Math.max(780, pattern.warning * pace),
    open: Math.max(1270, pattern.open * pace) };
  boss.target = Math.round(scene.player.x);
  boss.since = scene.elapsed;
  boss.traps = pattern.plan ? pattern.plan(boss.target) : attackPlan(boss.profile.pattern, boss.target);
  while (boss.trapArt.length < boss.traps.length) {
    boss.trapArt.push({ art: scene.add.graphics().setDepth(3), frame: {} });
  }
  if (previousTier !== undefined && previousTier !== boss.tier) {
    scene.burst?.(boss.x, 150, 0xe4ebaa, 10);
    if (!scene.ui.reduceMotion) scene.cameras?.main.shake(120,.003);
  }
  scene.ui.playSound(previousTier !== undefined && previousTier !== boss.tier ? 'bossPhase' : 'bossWarning');
}

function shell(boss, reduced, time) {
  if(boss.presentation) return;
  const art = boss.art;
  const x = boss.x;
  const queen = boss.kind === 'queen';
  const crown = boss.kind === 'crown';
  const open = boss.phase === 'open' && boss.hits < 2;
  const hit = !reduced && boss.flashUntil > time;
  const bright = queen ? 0xd0e889 : crown ? 0xf7bde4 : 0x9ff7ff;
  const shellColor = queen ? 0x668849 : crown ? 0x805887 : 0x535d9a;
  const flare = reduced ? 0 : boss.phase === 'warn'
    ? Math.min(5, Math.floor((time - boss.since) / 170)) : boss.phase === 'attack' ? 5 : 0;
  art.clear().fillStyle(0x272438).fillRect(x - 20, 151, 40, 33);
  art.fillStyle(hit ? 0xffefbb : shellColor).fillRect(x - 16, 151, 32, 29);
  art.fillStyle(0x30293a).fillRect(x - 11, 160, 22, 9);
  if (crown) {
    art.fillStyle(0x493656).fillRect(x - 23, 150, 46, 28);
    art.fillStyle(shellColor).fillRect(x - 15, 146, 30, 27);
    const teeth = 4 + flare;
    for (let i = -1; i <= 1; i++) {
      art.fillStyle(bright).fillRect(x + i * 9 - 2, 146 - teeth, 5, teeth + 1);
    }
    art.fillStyle(0x392d4c).fillRect(x - 11, 158, 22, 13);
  } else if (queen) {
    art.fillStyle(shellColor).fillTriangle(x - 17, 158, x - 34 - flare, 140 - flare, x - 29, 172);
    art.fillTriangle(x + 17, 158, x + 34 + flare, 140 - flare, x + 29, 172);
    art.fillStyle(bright).fillTriangle(x - 18, 156, x - 28, 146, x - 23, 165);
    art.fillTriangle(x + 18, 156, x + 28, 146, x + 23, 165);
  } else {
    art.fillStyle(shellColor).fillRect(x - 29, 154, 10, 15).fillRect(x + 19, 154, 10, 15);
    art.fillStyle(bright).fillRect(x - 25, 147, 4, 11).fillRect(x + 21, 147, 4, 11);
    if (flare) art.fillStyle(0xffe091).fillRect(x - 25, 147 - flare, 2, flare).fillRect(x + 23, 147 - flare, 2, flare);
  }
  art.fillStyle(0x221e35).fillRect(x - 15, 175, 30, 3);
  art.fillStyle(bright).fillRect(x - 19, 154, 2, 10).fillRect(x + 17, 154, 2, 10);
  art.fillStyle(open ? 0xffda82 : bright).fillRect(x - 6, 162, 12, 4);
  if (open) art.lineStyle(1, 0xffda82).strokeRect(x - 9, 159, 18, 10);
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
  delete boss.rangedCycle;
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
    scene.ui.playSound('bossStrike');
    if (pattern === 'wave' || pattern === 'venom' || boss.profile.shot) {
      const side = scene.player.x < boss.x ? -1 : 1;
      const [low,high,color] = boss.profile.shot ?? [115,153];
      const tint = color ? Number.parseInt(color.slice(1),16) : pattern === 'venom' ? 0xb4df73 : boss.kind === 'crown' ? 0xe0a8e6 : 0x85d9ff;
      const style=boss.presentation?{titanWave:true}:undefined;
      fire(scene, boss.x + side * 21, 177, side * low, 0, 5, tint,0,style);
      fire(scene, boss.x + side * 22, 173, side * high, 0, 4, tint,0,style);
    } else if(boss.presentation && pattern==='impact' && !scene.ui.reduceMotion) {
      scene.cameras.main.shake(145,.0055);
      scene.burst(boss.target,181,0xc6ceff,12);
    }
  } else if (boss.phase === 'attack' && age >= attack) {
    boss.phase = 'open';
    boss.hits = 0;
    boss.since = now;
    scene.ui.playSound('bossOpen');
  } else if (boss.phase === 'open' && age >= open) {
    boss.cycle++;
    beginWarning(scene, boss);
  }
  shell(boss, scene.ui.reduceMotion, now);
  boss.indicator.clear();
  if (boss.phase === 'warn' && boss.traps.length === 0) {
    const side = Math.sign(boss.target - boss.x) || -1;
    const length = Math.min(61,22 + Math.floor(age / 22));
    const start = Math.min(boss.x-3,boss.x+side*length);
    boss.indicator.fillStyle(0x74dce4,.9).fillRect(start,177,length,2)
      .fillStyle(0xffd787).fillRect(boss.x - 24,181,48,2);
    for (let i=10;i<length;i+=12) {
      const x=boss.x+side*i;
      boss.indicator.fillTriangle(x,173,x+side*5,177,x,181);
    }
  }
  boss.trapArt.forEach(({ art, frame }, index) => {
    const field = boss.traps[index];
    if (!field || boss.phase === 'open' || boss.phase === 'waiting') {
      art.clear();
      return;
    }
    hazardFrame(field, now - boss.since, frame);
    if (boss.phase === 'warn') frame.phase = 'warning';
    paintDanger(art, field, frame, now, scene.ui.reduceMotion, scene.ui.dangerGuides);
    if(boss.presentation) paintTitanField(art,field,frame,now,scene.ui.reduceMotion);
    if (dangerHits(scene.player.body, field, frame)) scene.damage();
  });
  if (boss.phase === 'waiting') return;
  const label = `Phase ${boss.tier + 1}/3`;
  const text = boss.phase === 'warn' ? names[boss.profile.pattern] ?? LEGEND_TELEGRAPHS[boss.profile.pattern] : boss.phase === 'attack' ? 'Dodge!'
    : boss.hits < 2 ? 'Attack now!' : 'Guard up · Get ready';
  scene.ui.onBoss(boss, `${label} · ${text}`);
}
