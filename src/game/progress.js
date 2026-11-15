const storageKey = 'pixel-adventure.progress';
const legacyNames = ['Verdant Hills', 'Sunset Canyon', 'Crystal Peaks'];

export function ratingFor(coins, total) {
  return coins === total ? 3 : coins >= Math.ceil(total / 2) ? 2 : 1;
}

function readResult(level, result) {
  if (Number.isInteger(result?.coins) && result.coins >= 0
    && result.coins <= level.coins.length && Number.isFinite(result.elapsed) && result.elapsed >= 0) {
    const parsed = { coins: result.coins, elapsed: result.elapsed };
    if (Number.isSafeInteger(result.deaths) && result.deaths >= 0) parsed.deaths = result.deaths;
    return parsed;
  }
  return null;
}

export function createProgress(levels, storage) {
  let saved;
  try {
    storage ??= globalThis.localStorage;
    saved = JSON.parse(storage?.getItem(storageKey));
  } catch {
    // An unreadable save starts at Level 1.
  }
  const legacy = saved && saved.version !== 2;
  const savedUnlocks = Number.isInteger(saved?.unlocked) ? Math.max(1, saved.unlocked) : 1;
  let frontier = legacy ? 1 : Math.min(levels.length, savedUnlocks);
  const granted = new Set(legacy ? legacyNames.slice(0, savedUnlocks)
    : Array.isArray(saved?.granted) ? saved.granted : []);
  let results = levels.map((level, index) => readResult(level,
    saved?.results?.[legacy ? legacyNames.indexOf(level.name) : index]));
  const records = levels.map((level, index) => {
    const source = legacy ? saved?.results?.[legacyNames.indexOf(level.name)] : saved?.records?.[index];
    const result = readResult(level, source);
    if (!result) return null;
    const record = { coins: result.coins, elapsed: result.elapsed, stars: ratingFor(result.coins, level.coins.length) };
    if (Number.isSafeInteger(source.bestDeaths) && source.bestDeaths >= 0) record.bestDeaths = source.bestDeaths;
    return record;
  });
  // The old campaign saved its final clear without a next stage to unlock.
  if (frontier === 20 && levels[20]?.name === 'Toxic Entrance' && (records[19] || results[19])) frontier = 21;

  function save() {
    try {
      storage?.setItem(storageKey, JSON.stringify({
        version: 2, unlocked: frontier, granted: [...granted], results, records,
      }));
    } catch {
      // Progress remains available for the current visit.
    }
  }

  function canPlay(index) {
    return index >= 0 && index < levels.length && (index < frontier || granted.has(levels[index].name));
  }

  return {
    get unlocked() { return levels.filter((_, index) => canPlay(index)).length; },
    canPlay,
    record(index) { return records[index]; },
    newAdventure() {
      results = levels.map(() => null);
      save();
    },
    finish(index, coins, elapsed, deaths) {
      if (!canPlay(index)) return false;
      const result = readResult(levels[index], { coins, elapsed, deaths });
      if (!result) return false;
      const wasUnlocked = canPlay(index + 1);
      results[index] = result;
      const old = records[index];
      const bestCoins = Math.max(coins, old?.coins ?? 0);
      records[index] = { coins: bestCoins, elapsed: Math.min(elapsed, old?.elapsed ?? Infinity),
        stars: ratingFor(bestCoins, levels[index].coins.length) };
      if (result.deaths !== undefined) records[index].bestDeaths = Math.min(deaths, old?.bestDeaths ?? Infinity);
      else if (old?.bestDeaths !== undefined) records[index].bestDeaths = old.bestDeaths;
      if (index < frontier) frontier = Math.max(frontier, Math.min(levels.length, index + 2));
      else if (index + 1 < levels.length) granted.add(levels[index + 1].name);
      save();
      return !wasUnlocked && index + 1 < levels.length;
    },
    totals() {
      if (results.some((result) => result === null)) return null;
      return results.reduce((sum, result) => ({
        coins: sum.coins + result.coins,
        elapsed: sum.elapsed + result.elapsed,
        deaths: result.deaths === undefined || sum.deaths === null ? null : sum.deaths + result.deaths,
      }), { coins: 0, elapsed: 0, deaths: 0 });
    },
  };
}
