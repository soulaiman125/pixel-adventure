import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSound } from '../src/game/sound.js';

test('audio waits for a gesture, mixes each channel independently, and caps effect voices', (context) => {
  const mixes = [];
  const started = [];
  let created = false;
  const noOp = () => {};
  const param = { setValueAtTime: noOp, exponentialRampToValueAtTime: noOp };
  class Audio {
    constructor() { created = true; }
    state = 'running';
    currentTime = 5;
    createGain() {
      return { gain: { ...param, setTargetAtTime: value => mixes.push(value) }, connect: noOp, disconnect: noOp };
    }
    createDynamicsCompressor() {
      return { threshold: {}, ratio: {}, connect: noOp };
    }
    createOscillator() {
      return { frequency: param, connect: noOp, disconnect: noOp, stop: noOp, start: time => started.push(time) };
    }
  }
  const sound = createSound(Audio);
  context.after(() => sound.music());
  sound.configure(true, .8, .35);
  sound.music('thunder');
  sound.play('jump');
  assert.equal(created, false);
  sound.unlock();
  assert.equal(created, true);
  assert.deepEqual(mixes, [.8, .35]);
  assert.equal(started.length, 2);
  sound.configure(true, 0, .35);
  sound.play('coin');
  assert.equal(started.length, 2);
  sound.configure(true, .8, 0);
  for (const cue of ['jump', 'coin', 'attack', 'electric', 'laserCharge', 'bossDefeat', 'bossPhase', 'victory']) {
    sound.play(cue);
  }
  assert.equal(started.length, 18);
  sound.configure(false, .8, .35);
  assert.deepEqual(mixes.slice(-2), [0, 0]);
});
