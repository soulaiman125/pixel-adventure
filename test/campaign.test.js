import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEVELS } from '../src/game/levels.js';
import { createProgress } from '../src/game/progress.js';
import { attackReaches } from '../src/game/combat.js';

test('the campaign has 20 uniquely named stages and a boss only in the last one', () => {
  assert.equal(LEVELS.length, 20);
  assert.equal(new Set(LEVELS.map(({ name }) => name)).size, 20);
  assert.deepEqual(LEVELS.flatMap((level, index) => level.boss ? [index + 1] : []), [20]);
});

test('an attack hits only at close range and in the direction of travel', () => {
  const player = { x: 100, y: 184, flipX: false };
  assert(attackReaches(player, 124, 174));
  assert(!attackReaches(player, 65, 174));
  assert(!attackReaches(player, 145, 174));
  assert(!attackReaches(player, 113, 145));
  player.flipX = true;
  assert(attackReaches(player, 78, 174));
  assert(!attackReaches(player, 124, 174));
});

function storage(save) {
  let value = save ? JSON.stringify(save) : null;
  return { getItem: () => value, setItem: (_, next) => { value = next; } };
}

test('the campaign unlocks in order and keeps records on replay and reload', () => {
  const disk = storage();
  const progress = createProgress(LEVELS, disk);
  assert.equal(progress.unlocked, 1);
  assert.equal(progress.finish(1, 1, 100), false);
  for (const [index, level] of LEVELS.entries()) {
    assert(progress.canPlay(index));
    assert.equal(progress.canPlay(index + 1), false);
    assert.equal(progress.finish(index, level.coins.length, 2000), index < LEVELS.length - 1);
  }
  const reload = createProgress(LEVELS, disk);
  assert.equal(reload.unlocked, LEVELS.length);
  assert.equal(reload.totals().elapsed, 2000 * LEVELS.length);
  reload.newAdventure();
  assert.equal(reload.totals(), null);
  reload.finish(0, 1, 1000);
  assert.deepEqual(reload.record(0), { coins: LEVELS[0].coins.length, elapsed: 1000, stars: 3 });
});

test('legacy results are indexed by original level identity', () => {
  const disk = storage({ unlocked: 3, results: [{ coins: 8, elapsed: 1200 }, { coins: 11, elapsed: 2200 }] });
  const progress = createProgress(LEVELS, disk);
  assert.equal(progress.record(0).elapsed, 1200);
  assert.equal(progress.record(4).coins, 11);
  assert.equal(progress.canPlay(4), true);
  assert.equal(progress.canPlay(1), false);
});

test('every checkpoint and finish is on solid ground and every crossing has a jump route', () => {
  for (const level of LEVELS) {
    assert(level.ground[0][1] > level.spawnX);
    assert(level.flagX > level.ground.at(-1)[0] && level.flagX < level.width);
    for (let i = 1; i < level.ground.length; i++) {
      const left = level.ground[i - 1][1];
      const right = level.ground[i][0];
      assert(right + 19 < level.ground[i][1]);
      for (const [type, x, y, width] of level.hazards ?? []) {
        if (type !== 'spikes' || y !== 184 || x >= left || left - x > 65) continue;
        const safeRunway = left - (x + width / 2 + 6);
        assert(safeRunway >= 16, level.name + ' needs landing space after spikes at ' + x);
      }
      const bridge = level.platforms.filter(([x, , w, kind, a = 0]) =>
        x + w + (kind === 'moving' ? a : 0) > left && x - (kind === 'moving' ? a : 0) < right);
      const ranges = [[left, 184, left], ...bridge.map(([x, y, w, kind, a = 0]) =>
        [x - (kind === 'moving' ? a : 0), y, x + w + (kind === 'moving' ? a : 0)]), [right, 184, right]];
      const reachable = new Set([0]);
      for (let j = 1; j < ranges.length; j++) {
        const [start, toY] = ranges[j];
        for (const k of reachable) {
          const [, fromY, end] = ranges[k];
          const discriminant = 263 ** 2 + 1400 * (toY - fromY);
          if (discriminant < 0) continue;
          const distance = (263 + Math.sqrt(discriminant)) / 700 * 132;
          if (start - end < distance) { reachable.add(j); break; }
        }
      }
      assert(reachable.has(ranges.length - 1), level.name + ' gap ending at ' + right);
    }
  }
});
