import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEVELS } from '../src/game/levels.js';
import { createProgress } from '../src/game/progress.js';
import { attackReaches } from '../src/game/combat.js';
import { dangerHits, hazardFrame, hazardPhase } from '../src/game/danger.js';
import { bossTier, resetExpansionBoss, updateExpansionBoss } from '../src/game/expansion-bosses.js';
import { guardBlocks, updateExpansionEnemy } from '../src/game/expansion-enemies.js';
import { addObstacles } from '../src/game/obstacles.js';

test('the campaign has 30 uniquely named stages, with bosses on levels 20, 25, and 30', () => {
  assert.equal(LEVELS.length, 30);
  assert.equal(new Set(LEVELS.map(({ name }) => name)).size, 30);
  assert.deepEqual(LEVELS.flatMap((level, index) => level.boss ? [index + 1] : []), [20, 25, 30]);
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

test('the original final clear unlocks Toxic Entrance and old records retain unknown death counts', () => {
  const records = Array(19).fill(null).concat({ coins: 7, elapsed: 63000 });
  const progress = createProgress(LEVELS, storage({ version: 2, unlocked: 20, records }));
  assert(progress.canPlay(20));
  assert(!progress.canPlay(21));
  assert(!createProgress(LEVELS, storage({ version: 2, unlocked: 20 })).canPlay(20));
  assert.equal(progress.record(19).bestDeaths, undefined);
});

test('best time, coin count, and no-death record survive independently', () => {
  const disk = storage();
  const progress = createProgress(LEVELS, disk);
  progress.finish(0, 9, 3000, 0);
  progress.finish(0, 4, 1900, 3);
  progress.newAdventure();
  assert.deepEqual(createProgress(LEVELS, disk).record(0), {
    coins: 9, elapsed: 1900, stars: 2, bestDeaths: 0,
  });
});

test('every checkpoint and finish is on solid ground and every crossing has a jump route', () => {
  for (const level of LEVELS) {
    assert(level.ground[0][1] > level.spawnX);
    assert(level.flagX > level.ground.at(-1)[0] && level.flagX < level.width);
    for (let i = 1; i < level.ground.length; i++) {
      const left = level.ground[i - 1][1];
      const right = level.ground[i][0];
      assert(right + 19 < level.ground[i][1]);
      for (const hazard of level.hazards ?? []) {
        if (!Array.isArray(hazard)) continue;
        const [type, x, y, width] = hazard;
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

test('every timed trap has harmless warning and idle frames with repeatable timing', () => {
  const hazards = LEVELS.slice(20).flatMap(({ hazards }) => hazards)
    .filter(hazard => hazard.kind !== 'saw' && hazard.kind !== 'poisonPool');
  hazards.push({ kind: 'lightning', x: 120, y: 135, width: 12, height: 90 });
  const center = (x, y) => ({ left: x - 1, right: x + 1, top: y - 1, bottom: y + 1 });
  for (const hazard of hazards) {
    const config = { ...hazard, period: 3000, warning: 800, active: 750, offset: 0 };
    for (const [at, expected] of [[250, 'warning'], [1050, 'active'], [1900, 'idle']]) {
      const frame = hazardFrame(config, at);
      assert.equal(frame.phase, expected, hazard.kind);
      assert.equal(hazardPhase(config, at + config.period), expected);
      assert.equal(dangerHits(center(frame.x, frame.y), config, frame), expected === 'active', hazard.kind);
      assert.equal(dangerHits(center(frame.x, frame.y - 80), config, frame), false, hazard.kind);
    }
  }
});

test('saw corners are safe, crushers and walls retract, and rising lava stays below land', () => {
  const saw = { kind: 'saw', x: 0, y: 0, width: 22, height: 22 };
  assert(dangerHits({ left: -1, right: 1, top: -1, bottom: 1 }, saw, hazardFrame(saw, 0)));
  assert(!dangerHits({ left: 8, right: 10, top: 8, bottom: 10 }, saw, hazardFrame(saw, 0)));
  const hazard = (kind, options) => ({ kind, x: 100, y: 119, width: 26, height: 26, offset: 0, ...options });
  const crusher = hazard('crusher', { dy: 48 });
  const walls = hazard('walls', { spread: 35 });
  const lava = hazard('risingLava', { dy: 20, y: 212, height: 30 });
  assert.equal(hazardFrame(crusher, 1150).y, 167);
  assert.equal(hazardFrame(crusher, 1700).y, crusher.y);
  const closed = hazardFrame(walls, 1150);
  assert(closed.otherX - closed.x < 20);
  assert(hazardFrame(walls, 1700).otherX - hazardFrame(walls, 1700).x > 60);
  const high = hazardFrame(lava, 1150);
  assert(high.y - high.height / 2 > 184);
});

test('classic traps damage at the visible hazard and leave a distant player safe', () => {
  const art = new Proxy({}, { get: () => () => art });
  const x = 100;
  const floorY = 184;
  const droppedY = 25 + (floorY - 17) * ((1100 - 620) / 660) ** 2;
  const cases = [
    ['spikes', floorY, 180, 0], ['sweep', 173, 173, 0, 30],
    ['rock', floorY, droppedY, 0], ['icicle', floorY, droppedY, 0],
    ['lava', 205, 219, 0], ['jet', floorY, floorY - 20, 300],
    ['fireball', floorY, floorY - 6 - 106 * (250 / 950) * (1 - 250 / 950), 300],
  ];
  for (const [kind, y, contactY, time, range] of cases) {
    let hits = 0;
    const scene = {
      add: { graphics: () => art },
      ui: { reduceMotion: true, playSound() {} },
      player: { x, body: { left: x - 1, right: x + 1, top: contactY - 1, bottom: contactY + 1 } },
      damage() { hits++; },
    };
    const [step] = addObstacles(scene, [[kind, x, y, 20, range]]);
    step(time);
    assert.equal(hits, 1, kind);
    scene.player.body.left += 80;
    scene.player.body.right += 80;
    step(time);
    assert.equal(hits, 1, kind);
  }
});

test('guards block only from the front and leave an opening after a block', () => {
  const values = { type: 'guard', exposedUntil: 800 };
  const enemy = { x: 100, y: 184, body: { velocity: { x: 30 } }, getData: key => values[key] };
  assert(!guardBlocks(enemy, { x: 125, y: 184 }, 700));
  assert(guardBlocks(enemy, { x: 125, y: 184 }, 800));
  assert(!guardBlocks(enemy, { x: 80, y: 184 }, 800));
  assert(!guardBlocks(enemy, { x: 125, y: 150 }, 800));
});

test('ranged enemies warn before firing, and poison lobs while a robot fires horizontally', () => {
  for (const type of ['poison', 'robot']) {
    const warning = { visible: false, setPosition() { return this; }, setVisible(visible) { this.visible = visible; } };
    const values = { left: 80, right: 130, type, speed: 40, warning };
    const enemy = {
      x: 100, y: 184, body: { velocity: { x: 40 } }, data: { values },
      getData: key => values[key], setData: data => Object.assign(values, data),
      setVelocityX(vx) { this.body.velocity.x = vx; }, setFlipX() {},
    };
    const scene = { elapsed: 200, player: { x: 180 }, ui: { playSound() {} } };
    const shots = [];
    const fire = (...args) => shots.push(args);
    updateExpansionEnemy(scene, enemy, fire);
    assert(warning.visible);
    assert.equal(shots.length, 0);
    scene.elapsed = 895;
    updateExpansionEnemy(scene, enemy, fire);
    assert(!warning.visible);
    assert.equal(shots.length, 1);
    assert(shots[0][3] > 0);
    assert.equal(shots[0][4] < 0, type === 'poison');
    assert.equal(shots[0][7] > 0, type === 'poison');
  }
});

test('both new bosses warn, attack, open and reset across three health tiers', () => {
  const art = new Proxy({}, { get: () => () => art });
  const shots = [];
  const scene = {
    elapsed: 0, player: { x: 100, body: { left: 0, right: 0, top: 0, bottom: 0 } },
    add: { graphics: () => art }, ui: { onBoss() {}, playSound() {}, reduceMotion: true },
    damage() { assert.fail('a distant player was hit'); },
  };
  for (const [kind, maxHp, patterns] of [
    ['queen', 6, ['spores', 'venom', 'bloom']],
    ['titan', 9, ['wave', 'bolts', 'impact']],
  ]) {
    const boss = { kind, maxHp, x: 150, start: 90, art, indicator: art, trapArt: [] };
    resetExpansionBoss(scene, boss);
    for (let tier = 0; tier < 3; tier++) {
      boss.hp = maxHp - tier * (maxHp / 3);
      assert.equal(bossTier(boss), tier);
      const fire = (...args) => shots.push(args);
      updateExpansionBoss(scene, boss, fire);
      assert.equal(boss.phase, 'warn');
      assert.equal(boss.profile.pattern, patterns[tier]);
      scene.elapsed += boss.profile.warning;
      updateExpansionBoss(scene, boss, fire);
      assert.equal(boss.phase, 'attack');
      scene.elapsed += boss.profile.attack;
      updateExpansionBoss(scene, boss, fire);
      assert.equal(boss.phase, 'open');
      assert.equal(boss.hits, 0);
      scene.elapsed += boss.profile.open;
    }
    resetExpansionBoss(scene, boss);
    assert.equal(boss.hp, maxHp);
    assert.equal(boss.phase, 'waiting');
  }
  assert.equal(shots.length, 4);
});
