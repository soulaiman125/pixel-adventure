const storageKey = 'pixel-adventure.progress';
const legacyNames = ['Verdant Hills', 'Sunset Canyon', 'Crystal Peaks'];

export function ratingFor(coins, total) {
  return coins === total ? 3 : coins >= Math.ceil(total / 2) ? 2 : 1;
}

function readResult(level, result) {
  if (Number.isInteger(result?.coins) && result.coins >= 0
    && result.coins <= level.coins.length && Number.isFinite(result.elapsed) && result.elapsed >= 0) {
    return { coins: result.coins, elapsed: result.elapsed };
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
    const result = legacy ? readResult(level, saved?.results?.[legacyNames.indexOf(level.name)])
      : readResult(level, saved?.records?.[index]);
    return result && { ...result, stars: ratingFor(result.coins, level.coins.length) };
  });

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
    finish(index, coins, elapsed) {
      if (!canPlay(index)) return false;
      const wasUnlocked = canPlay(index + 1);
      results[index] = { coins, elapsed };
      const old = records[index];
      const bestCoins = Math.max(coins, old?.coins ?? 0);
      records[index] = { coins: bestCoins, elapsed: Math.min(elapsed, old?.elapsed ?? Infinity),
        stars: ratingFor(bestCoins, levels[index].coins.length) };
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
      }), { coins: 0, elapsed: 0 });
    },
  };
}
