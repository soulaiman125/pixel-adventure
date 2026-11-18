const SAVE_KEY = 'pixel-adventure.ultimate';
const RANKS = ['C','B','A','S'];

export function clearRank({ elapsed, par, deaths, damage, hits, coins, total }) {
  const timing = Math.max(0, Math.min(35, 35 * (1.65 - elapsed / par) / .65));
  const defense = Math.max(0, 30 - 8 * deaths - 5 * damage);
  const combat = Math.min(20, hits * 3);
  const collection = Math.min(15, 20 * coins / Math.max(1, total));
  const score = Math.round(timing + defense + combat + collection);
  return { score, rank: score >= 86 ? 'S' : score >= 71 ? 'A' : score >= 50 ? 'B' : 'C' };
}

export const FEATS = {
  clean: ['Untouched', 'Defeat three enemies and clear a stage without damage.'],
  combo: ['Twenty Cuts', 'Chain 20 damaging contacts within four seconds of each other.'],
  sword: ['Only Steel', 'Finish a boss stage without throwing a Shuriken.'],
  fast: ['Quick Blade', 'Clear a stage at or under its par time.'],
  parry: ['Return to Sender', 'Successfully parry and land a countercut in the same clear.'],
  arena: ['Night Watch', 'Clear six Survival waves.'],
  grove: ['Hidden Grove', 'Find the red-leaf cache in Verdant Hills.'],
  shrine: ['High Shrine', 'Find the violet cache in Obsidian Keep.'],
};

export function createTally() {
  return {
    hits:0, chain:0, highChain:0, defeats:0, damage:0, lastHit:-Infinity, counters:0,
    hit(now, counter = false) {
      this.hits++;
      if (counter) this.counters++;
      this.chain = now - this.lastHit <= 4000 ? this.chain + 1 : 1;
      this.lastHit = now;
      this.highChain = Math.max(this.highChain,this.chain);
    },
    hurt() { this.damage++; this.chain = 0; },
  };
}

export function createUltimateProgress(storage) {
  const data = { version:1, ranks:{}, feats:[], arena:{ wave:0, score:0 } };
  try {
    const saved = JSON.parse(storage.getItem(SAVE_KEY));
    if (saved?.version === 1) {
      for (const [stage, record] of Object.entries(saved.ranks ?? {})) {
        if (/^(?:[0-9]|[12][0-9])$/.test(stage) && RANKS.includes(record?.rank)
          && Number.isInteger(record.score) && record.score >= 0 && record.score <= 100) data.ranks[stage] = record;
      }
      data.feats = Object.keys(FEATS).filter(key => Array.isArray(saved.feats) && saved.feats.includes(key));
      if ([saved.arena?.wave,saved.arena?.score].every(n => Number.isInteger(n) && n >= 0)) data.arena = saved.arena;
    }
  } catch { /* Existing campaign and skill saves are independent. */ }
  const save = () => { try { storage.setItem(SAVE_KEY,JSON.stringify(data)); } catch { /* Keep session records. */ } };
  function award(key) {
    if (!Object.hasOwn(FEATS,key) || data.feats.includes(key)) return false;
    data.feats.push(key);
    save();
    return true;
  }
  return {
    rank:index => data.ranks[index],
    has:key => data.feats.includes(key),
    award,
    bestArena:() => ({ ...data.arena }),
    arena(wave,score) {
      data.arena.wave = Math.max(data.arena.wave,wave);
      data.arena.score = Math.max(data.arena.score,score);
      if (wave >= 6) award('arena');
      save();
    },
    finish(index, level, run, uses = {}) {
      // World distance supplies a stable, visible par; later terrain and bosses add time.
      const par = Math.round((level.width * 11 + (level.boss ? 20000 : 3500)) / 1000) * 1000;
      const result = { ...clearRank({ ...run, par }), par };
      if (result.score > (data.ranks[index]?.score ?? -1)) data.ranks[index] = result;
      if (run.defeats >= 3 && run.damage === 0 && run.deaths === 0) award('clean');
      if (run.highChain >= 20) award('combo');
      if (level.boss && !uses.shuriken) award('sword');
      if (run.elapsed <= par) award('fast');
      if (uses.parrySuccess && run.counters) award('parry');
      save();
      return result;
    },
  };
}
