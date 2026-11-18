import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeWindows, adjustEnergy, energyCost, inRadius, SPECIALS } from '../src/game/combat-techniques.js';
import { createShadowSkills, SKILLS } from '../src/game/shadow-skills.js';

test('a legacy campaign has no skill spending and each milestone can be redeemed only once', () => {
  const data = new Map([['pixel-adventure.progress', '{"version":2,"unlocked":20}']]);
  const storage = { getItem: key => data.get(key), setItem: (key,value) => data.set(key,value) };
  const skills = createShadowSkills(storage);
  assert.equal(skills.points(), 0);
  assert.equal(skills.buy('dash'), false);
  for (let stage = 1; stage <= 36; stage++) {
    skills.award('stage-' + stage);
    skills.award('stage-' + stage);
  }
  assert.equal(skills.points(), 36);
  for (const skill of Object.keys(SKILLS)) {
    assert.equal(skills.tier(skill), 0);
    for (const tier of [1, 2, 3]) {
      assert.equal(skills.cost(skill), tier);
      assert.equal(skills.buy(skill), true);
      assert.equal(skills.tier(skill), tier);
    }
    assert.equal(skills.buy(skill), false);
  }
  const reopened = createShadowSkills(storage);
  assert.equal(reopened.points(), 0);
  assert(Object.keys(SKILLS).every(id => reopened.tier(id) === 3));
  reopened.reset();
  assert.equal(createShadowSkills(storage).points(), 36);
  assert.equal(data.get('pixel-adventure.progress'), '{"version":2,"unlocked":20}');
});

test('malformed or unknown Shadow save data defaults to unspent abilities', () => {
  for (const value of ['{', '{"version":42,"tiers":{"dash":3}}']) {
    const skills = createShadowSkills({ getItem: () => value });
    assert.equal(skills.tier('dash'), 0);
    assert.equal(skills.points(), 0);
  }
});

test('special attack windows close on time, radial contact uses body edges and Energy stays bounded', () => {
  for (const [kind, { windows, duration }] of Object.entries(SPECIALS)) {
    const action = { kind, since: 500 };
    for (const [index, [open, close]] of windows.entries()) {
      assert.deepEqual(activeWindows(action, 500 + open - 1), []);
      assert.deepEqual(activeWindows(action, 500 + open), [index]);
      assert.deepEqual(activeWindows(action, 500 + close), []);
    }
    assert.deepEqual(activeWindows(action, 500 + duration), []);
  }
  const box = { left: 4, right: 7, top: 3, bottom: 8 };
  assert(inRadius(box, 0, 0, 5));
  assert(!inRadius(box, 0, 0, 4.99));
  assert.equal(energyCost('cyclone', 2), 24);
  assert.equal(energyCost('execution', 3), 60);
  const state = { energy: 70 };
  adjustEnergy(state, 40);
  assert.equal(state.energy, 100);
  adjustEnergy(state, -101);
  assert.equal(state.energy, 0);
});
