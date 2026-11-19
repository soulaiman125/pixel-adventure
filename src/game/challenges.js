import { trap } from './level-scripts.js';

export const RUSH_LEVELS = [19, 24, 29];
export const challenges = {
  hardcore: { name: 'Hardcore', rules: 'Faster traps and fewer checkpoints on unlocked stages.' },
  nightmare: { name: 'Nightmare', rules: 'Added hazards, shorter boss openings, and the final checkpoint only.' },
  rush: { name: 'Classic Boss Rush', rules: 'Fight the Hollow Crown, Poison Queen and Thunder Titan. Time and deaths carry across arenas.' },
  trial: { name: 'Time Trial', rules: 'Replay a cleared stage for a separate personal best.' },
  flawless: { name: 'No-Death', rules: 'One life. Reach the flag for a Flawless badge.' },
};

export function canChallenge(mode, index, progress) {
  if (mode === 'rush') return RUSH_LEVELS.every(stage => progress.record(stage));
  if (mode === 'nightmare') return Boolean(progress.record(19)) && progress.canPlay(index);
  if (mode === 'hardcore') return progress.canPlay(index);
  return (mode === 'trial' || mode === 'flawless') && Boolean(progress.record(index));
}

function timedHazard(config, pace) {
  if (Array.isArray(config) || ['saw', 'poisonPool'].includes(config.kind)) return config;
  const warning = Math.max(690, (config.warning ?? 780) * pace);
  const active = (config.active ?? 740) * .94;
  return { ...config, warning, active, period: Math.max(warning + active + 900, (config.period ?? 3100) * pace) };
}

export function challengeLevel(level, mode) {
  if (mode === 'rush') {
    return {
      ...level, width: 430, spawnX: 64, flagX: 378, ground: [[0, 430]], platforms: [],
      coins: [], enemies: [], hazards: [], trees: [[30, .65], [399, .67]],
      boss: { ...level.boss, x: 263, start: 120 },
    };
  }
  if (mode !== 'hardcore' && mode !== 'nightmare') return level;
  const night = mode === 'nightmare';
  const firstEnd = level.ground[0][1];
  const x = Math.max(level.spawnX + 85, Math.floor(firstEnd * .45));
  const hazards = (level.hazards ?? []).map(config => timedHazard(config, night ? .79 : .89));
  hazards.push(night
    ? trap('laserGrid', x, 165, 31, 38, { spacing: 11, warning: 950, active: 640, offset: 1370 })
    : trap('electricFloor', x, 180, 24, 8, { warning: 900, active: 590, offset: 1900 }));
  const last = level.ground.at(-1);
  const windX = last[0] + 63;
  const air = night && last[1] - windX > 125 ? [[windX, windX + 54, 72]] : [];
  return { ...level, hazards, script: { enemyPace: night ? .84 : .92, bossPace: night ? .83 : .93, sparse: night ? 'final' : 'alternate', air: [...(level.script?.air ?? []), ...air] } };
}

export function isCheckpoint(level, index) {
  const sparse = level.script?.sparse;
  return index > 0 && (index === level.ground.length - 1 || (!sparse || (sparse === 'alternate' && index % 2 === 0)));
}

const storageKey = 'pixel-adventure.challenges';
const valid = value => Number.isFinite(value) && value >= 0;

export function createChallengeRecords(storage) {
  let saved;
  try {
    storage ??= globalThis.localStorage;
    saved = JSON.parse(storage?.getItem(storageKey));
  } catch {
    // Challenge data has no effect on the campaign save.
  }
  const records = {};
  for (const mode of Object.keys(challenges)) {
    records[mode] = {};
    if (saved?.version !== 1) continue;
    for (const [stage, item] of Object.entries(saved.records?.[mode] ?? {})) {
      if (!/^([0-9]|[1-5][0-9])$/.test(stage) || !valid(item?.time) || !valid(item?.deaths)) continue;
      records[mode][stage] = { time: item.time, deaths: item.deaths, clean: item.clean === true };
    }
  }
  return {
    get(mode, index) { return records[mode]?.[index]; },
    count(mode) { return Object.keys(records[mode] ?? {}).length; },
    record(mode, index, time, deaths) {
      if (!Object.hasOwn(challenges, mode) || !Number.isInteger(index) || index < 0 || index >= 60
        || !valid(time) || !Number.isInteger(deaths) || deaths < 0 || (mode === 'flawless' && deaths)) return null;
      const old = records[mode][index];
      const better = !old || time < old.time || (time === old.time && deaths < old.deaths);
      const result = better ? { time, deaths } : { time: old.time, deaths: old.deaths };
      result.clean = deaths === 0 || old?.clean === true;
      records[mode][index] = result;
      try {
        storage?.setItem(storageKey, JSON.stringify({ version: 1, records }));
      } catch {
        // Records remain available for this session.
      }
      return { ...result, better };
    },
  };
}
