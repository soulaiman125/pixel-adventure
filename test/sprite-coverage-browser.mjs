import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { browserScene,openStage } from './sprite-art-fixture.mjs';
import { LEVELS } from '../src/game/levels.js';

const base=process.env.PIXEL_TEST_URL||'http://127.0.0.1:4193/';
const browser=await chromium.launch({channel:'msedge'});
try {
  const page=await browserScene(browser,base);
  const enemies=new Set(),bosses=new Set(),biomes=new Set();
  const sampled=new Set();
  for(let stage=1;stage<=60;stage++){
    await openStage(page,stage);
    const result=await page.evaluate(()=>{
      const s=artScene, theme=s.level.realm??s.level.theme;
      function check(key){
        const texture=s.textures.get(key);
        const counts=texture.paintedClips;
        const first=counts&&texture.get(Object.keys(counts)[0]+'0');
        if(!first||first.cutWidth<=first.realWidth)throw new Error('Missing dense raster frame '+key);
        return {key,source:[first.cutWidth,first.cutHeight],counts};
      }
      const team=s.enemies.getChildren().map(enemy=>{
        const type=enemy.getData('type')??'slime';
        const key=s.valleyPrototype?'brambleback':enemy.getData('ultimateState')?enemy.texture.key:
          'campaign-'+s.level.theme+'-'+type;
        return {type,...check(key)};
      });
      const boss=s.boss&&{
        type:s.boss.kind,...check(s.boss.kind==='titan'?'forge-titan':
          (['queen','crown'].includes(s.boss.kind)?'campaign-boss-':'legends-boss-')+s.boss.kind)
      };
      const main=s.children.list.find(item=>item.depth===4.35&&item.texture?.paintedClips);
      return {theme,team,boss,hero:check(main.texture.key)};
    });
    for(const item of result.team){enemies.add(item.type);sampled.add(item.key);}
    if(result.boss)bosses.add(result.boss.type);
    biomes.add(result.theme);
    assert.equal(result.hero.counts.run,24);
    assert.deepEqual(page.artErrors,[]);
    if(stage%5===0)console.log('Checked through stage '+stage);
    await page.locator('#pause-button').click();
    await page.locator('#pause-main').click();
  }
  const canonical=new Set(LEVELS.flatMap(level=>level.enemies.map(enemy=>enemy[3]??'slime')));
  assert([...canonical].every(type=>enemies.has(type)));
  assert.equal(bosses.size,8);
  assert.equal(biomes.size,12);
  console.log(JSON.stringify({stages:60,enemyTypes:canonical.size,encounterTypes:enemies.size,bosses:bosses.size,biomes:biomes.size,enemyAtlases:sampled.size}));
} finally { await browser.close(); }
