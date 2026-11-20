import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEVELS } from '../src/game/levels.js';
import { paintedEnemies } from '../src/game/rendering/painted-enemy.js';
import { paintedBosses } from '../src/game/rendering/painted-boss.js';
import { shadowClips, detailedShadowClips, paintedShadowClips, paintedShadowPose, shadowFrames } from '../src/game/shadow-art.js';
import palette from '../src/game/rendering/painted-parts.json' with {type:'json'};
import { readFile } from 'node:fs/promises';

test('painted recipes cover all campaign enemy and boss types with distinct equipment and materials',()=>{
  const enemies=new Set(LEVELS.flatMap(level=>level.enemies.map(enemy=>enemy[3]??'slime')));
  const bosses=new Set(LEVELS.flatMap(level=>level.boss?[level.boss.kind]:[]));
  assert.equal(enemies.size,31);
  assert.equal(bosses.size,8);
  const recipes=[...enemies].map(key=>paintedEnemies[key]);
  assert(recipes.every(Boolean));
  assert.equal(new Set(recipes.map(recipe=>JSON.stringify(recipe))).size,enemies.size);
  assert.deepEqual([...bosses].sort(),Object.keys(paintedBosses).sort());
});

test('portrait and play animations add drawn poses while existing motion landmarks stay intact',()=>{
  for(const clip of ['idle','run','jumpStart','rise','fall','slash1','slash3','knockback','death']){
    assert(paintedShadowClips[clip]>detailedShadowClips[clip]);
    assert.deepEqual(paintedShadowPose(clip,0),shadowFrames[clip][0]);
    assert.deepEqual(paintedShadowPose(clip,3),shadowFrames[clip][1]);
    assert.notDeepEqual(paintedShadowPose(clip,1),shadowFrames[clip][0]);
  }
  for(const [id,count] of Object.entries(shadowClips))assert(paintedShadowClips[id]>=count);
});

test('every packed painted part has its own in-bounds crop and a locally shipped WebP',async()=>{
  for(const [sheet,parts] of Object.entries(palette)){
    assert.equal(parts.length,12);
    assert(parts.every(([x,y,w,h])=>x>=0&&y>=0&&x+w<=1024&&y+h<=768&&w>0&&h>0));
    const file=new URL('../public/sprites/painted/'+sheet+'.webp',import.meta.url);
    const header=(await readFile(file)).subarray(0,12).toString('ascii');
    assert(header.startsWith('RIFF')&&header.endsWith('WEBP'));
  }
});
