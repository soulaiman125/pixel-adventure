import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEVELS } from '../src/game/levels.js';
import { canChallenge, challengeLevel, createChallengeRecords, isCheckpoint } from '../src/game/challenges.js';
import { createProgress } from '../src/game/progress.js';
import { heroPose, heroTexture } from '../src/game/hero-art.js';

test('challenge records are independent of existing campaign saves and unlocks', () => {
  const files = new Map();
  const storage = { getItem: key => files.get(key) ?? null, setItem: (key, data) => files.set(key, data) };
  const campaign = createProgress(LEVELS, storage);
  assert(canChallenge('hardcore', 0, campaign));
  assert(!canChallenge('nightmare', 0, campaign));
  assert(!canChallenge('trial', 0, campaign));
  for (let index = 0; index < 20; index++) campaign.finish(index, 1, 4300, 2);
  const before = files.get('pixel-adventure.progress');
  assert(canChallenge('trial', 0, campaign));
  assert(canChallenge('nightmare', 20, campaign));
  assert(!canChallenge('rush', 19, campaign));
  const records = createChallengeRecords(storage);
  assert(records.record('hardcore', 0, 9000, 1).better);
  assert(!records.record('hardcore', 0, 9200, 0).better);
  assert.equal(records.record('flawless', 0, 8800, 1), null);
  assert(records.record('flawless', 0, 8800, 0).better);
  assert.equal(files.get('pixel-adventure.progress'), before);
  assert.deepEqual(createChallengeRecords(storage).get('hardcore', 0), { time: 9000, deaths: 1, clean: true });
});

test('difficulty variants preserve routes and delegate only selected checkpoints', () => {
  const level = LEVELS[28];
  const hard = challengeLevel(level, 'hardcore');
  const nightmare = challengeLevel(level, 'nightmare');
  assert.equal(challengeLevel(level, 'trial'), level);
  assert.equal(hard.ground, level.ground);
  assert.equal(nightmare.platforms, level.platforms);
  assert(!isCheckpoint(hard, 1));
  assert(isCheckpoint(hard, 2));
  assert(!isCheckpoint(nightmare, 2));
  assert(isCheckpoint(nightmare, level.ground.length - 1));
  const rush = challengeLevel(LEVELS[19], 'rush');
  assert.equal(rush.boss.kind, 'crown');
  assert.equal(rush.enemies.length, 0);
  assert(rush.spawnX < rush.boss.start && rush.boss.x < rush.flagX);
});

test('animation timing selects distinct feedback without modifying movement state', () => {
  const state = { time: 500, grounded: true, vx: 25, vy: 0, direction: 1, landing: 0, launch: 0, swing: 0, grace: 0 };
  assert.equal(heroPose(state), 'accelerate');
  assert.equal(heroPose({ ...state, direction: 0 }), 'brake');
  assert.equal(heroPose({ ...state, grounded: false, vy: -200, launch: 550 }), 'launch');
  assert.equal(heroPose({ ...state, swing: 550 }), 'attack');
  assert.equal(heroPose({ ...state, grace: 1300 }), 'hurt');
  assert.equal(heroPose({ ...state, complete: true }), 'victory');
  assert.equal(heroTexture('victory', 'storm'), 'hero-storm-victory');
});
