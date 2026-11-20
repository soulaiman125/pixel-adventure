import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reliefNormals } from '../src/game/swamp/lighting.js';
import { swampOptions, visualOptions } from '../src/game/swamp/options.js';
import { shadowClips, shadowFrames, shadowPoseAt, swampShadowClips } from '../src/game/shadow-art.js';

test('swamp features default on, can be isolated, and normalize invalid death limits', () => {
  assert.equal(swampOptions().deaths, 3);
  for (const [id] of visualOptions) {
    assert.equal(swampOptions()[id], true);
    const isolated = swampOptions({}, id);
    for (const [option] of visualOptions) assert.equal(isolated[option], option === id);
  }
  assert.equal(swampOptions({deaths: '5', retryLimit: false}).deaths, 5);
  assert.equal(swampOptions({retryLimit: false}).retryLimit, false);
  for (const deaths of [0, -2, Infinity, 1.5, '0x1000']) assert.equal(swampOptions({deaths}).deaths, 3);
});

test('alpha-aware normal maps curve in opposite directions around a sprite rim', () => {
  const extent = 14;
  const pixels = new Uint8ClampedArray(extent * extent * 4);
  for (let y = 1; y < extent - 1; y++)
    for (let x = 1; x < extent - 1; x++)
      pixels.set([90,120,80,255], (y * extent + x) * 4);
  const map = reliefNormals(pixels, extent, extent);
  const sample = (x,y) => [...map.slice((y*extent+x)*4,(y*extent+x)*4+4)];
  assert.deepEqual(sample(0,0), [0,0,0,0]);
  assert(sample(1,7)[0] < 128);
  assert(sample(12,7)[0] > 128);
  assert(sample(7,1)[1] < 128);
  assert(sample(7,12)[1] > 128);
  assert.deepEqual(sample(7,7), [128,128,255,255]);
});

test('detailed run, jump and slash clips preserve authored endpoints and add intermediate poses', () => {
  for (const name of ['run','jumpStart','rise','fall','slash1','slash2','slash3','airSlash']) {
    assert(swampShadowClips[name] > shadowClips[name]);
    const frames = shadowFrames[name];
    assert.deepEqual(shadowPoseAt(name,0,true), frames[0]);
    assert.deepEqual(shadowPoseAt(name,(frames.length-1)*2,true), frames.at(-1));
    assert.notDeepEqual(shadowPoseAt(name,1,true), frames[0]);
  }
});
