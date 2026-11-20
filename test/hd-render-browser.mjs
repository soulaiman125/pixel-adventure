import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { browserScene, openStage } from './sprite-art-fixture.mjs';
import { HEROES } from '../src/game/legends-heroes.js';

const base = process.env.PIXEL_TEST_URL || 'http://127.0.0.1:4197/';
const output = resolve(process.env.PIXEL_HD_REPORT || 'artifacts/hd-review');
const browser = await chromium.launch({ channel: 'msedge' });
const results = [];
const worlds = [
  [1, 'verdant'], [5, 'canyon'], [11, 'crystal'], [13, 'fire'], [20, 'castle'],
  [23, 'jungle'], [30, 'thunder'], [36, 'bamboo'], [42, 'sunken'],
  [48, 'sky'], [54, 'neon'], [60, 'eclipse'],
];

async function inspect(page) {
  // Observe Phaser's actual draw calls, including the replacement frame returned
  // by the lighting pass, over a few animation frames.
  const result = await page.evaluate(() => new Promise(resolve => {
    const scene = window.artScene;
    const { canvas, renderer, scale } = scene.game;
    const draw = renderer.batchSprite;
    const litActors = new Map();
    renderer.batchSprite = function(sprite, frame, ...args) {
      if (sprite.texture?.paintedClips && frame !== sprite.frame) {
        litActors.set(sprite.texture.key, {
          key: sprite.texture.key,
          width: frame.cutWidth,
          height: frame.cutHeight,
          density: frame.source.resolution,
          original: [sprite.frame.realWidth, sprite.frame.realHeight],
        });
      }
      return draw.call(this, sprite, frame, ...args);
    };
    setTimeout(() => {
      renderer.batchSprite = draw;
      const css = canvas.getBoundingClientRect();
      resolve({ stage: scene.level.name, biome: scene.level.realm ?? scene.level.theme,
        canvas: [canvas.width, canvas.height], css: [css.width, css.height],
        logical: [scale.width, scale.height], dpr: devicePixelRatio,
        hero: scene.children.list.find(item => item.depth === 4.35 && item.texture?.paintedClips).texture.key,
        litActors: [...litActors.values()] });
    }, 420);
  }));
  assert.equal(result.logical[1], 220);
  assert(result.canvas[1] >= result.logical[1] * 1.45, JSON.stringify(result));
  assert(result.canvas[1] >= result.css[1], JSON.stringify(result));
  assert(result.litActors.some(item => item.key === result.hero), 'Hero must use normal lighting');
  for (const actor of result.litActors) {
    assert.equal(actor.density, 4, JSON.stringify(actor));
    assert.deepEqual([actor.width, actor.height], actor.original.map(size => size * 4));
  }
  return result;
}

async function leave(page) {
  await page.locator('#pause-button').click();
  await page.locator('#pause-main').click();
}

try {
  await mkdir(output, { recursive:true });
  const desktop = await browserScene(browser, base, { viewport: { width:1440, height:900 } });
  for (const [index, [stage, biome]] of worlds.entries()) {
    await openStage(desktop, stage);
    if (stage !== 1) {
      // Camera placement for review screenshots. No campaign clear is recorded.
      await desktop.evaluate(() => {
        const scene = window.artScene;
        if (scene.boss) scene.player.body.reset(scene.boss.x - 110, 183);
        scene.moveCamera(1);
      });
    }
    const data = await inspect(desktop);
    assert.equal(data.biome, biome);
    if (stage >= 36) assert(data.litActors.some(item => item.key.startsWith('legends-boss-')), JSON.stringify(data));
    assert.deepEqual(desktop.artErrors, []);
    const file = String(index + 1).padStart(2, '0') + '-' + biome + '.png';
    await desktop.screenshot({ path: resolve(output, file), fullPage:true });
    results.push({ file, ...data });
    console.log(file + ' ' + data.canvas.join('×') + ' ' + data.litActors.length + ' lit actor atlases');
    await leave(desktop);
  }
  await desktop.close();

  for (const view of [
    { name: 'phone-portrait', width:390, height:844, touch:true, scale:3, zoom:1 },
    { name: 'phone-landscape', width:844, height:390, touch:true, scale:2, zoom:1.15 },
    { name: 'compact-desktop', width:1024, height:768, touch:false, scale:1, zoom:1.25 },
  ]) {
    const page = await browserScene(browser, base, { viewport:{width:view.width,height:view.height},
      hasTouch:view.touch, isMobile:view.touch, deviceScaleFactor:view.scale });
    await openStage(page, 23);
    if (view.zoom !== 1) await page.evaluate(value => artScene.cameras.main.setOrigin(.5,.82).setZoom(value), view.zoom);
    const data = await inspect(page);
    assert.deepEqual(page.artErrors, []);
    const file = view.name + '.png';
    await page.screenshot({path:resolve(output,file),fullPage:true,scale:'css'});
    results.push({file, ...view, ...data});
    await page.close();
    console.log(file + ' ' + data.canvas.join('×'));
  }

  // Load each weapon and outfit pairing through the same save data used in game.
  const variants = await browserScene(browser, base);
  await variants.evaluate(() => {
    const record = {0:{time:20000,deaths:0}};
    const records = {hardcore:record,flawless:record,nightmare:record};
    localStorage.setItem('pixel-adventure.challenges', JSON.stringify({ version:1, records }));
    localStorage.setItem('pixel-adventure.ultimate', '{"version":1,"feats":["grove","shrine","arena","parry"]}');
  });
  const heroOutfits = id => id === 'shadow'
    ? ['scout','ember','frost','storm','jade','plum','dawn','silver'] : ['scout','silver'];
  let verified = 0;
  for (const id of Object.keys(HEROES)) for (const weapon of ['standard', 'alternate']) for (const cosmetic of heroOutfits(id)) {
    await variants.evaluate(({ id, weapon, cosmetic }) => {
      const hero = { xp:400, ownsAlternate:true, weapon, cosmetic };
      localStorage.setItem('pixel-adventure.preferences', JSON.stringify({ tutorialSeen:true, sound:false, outfit:cosmetic }));
      localStorage.setItem('pixel-adventure.legends', JSON.stringify({ version:4, selected:id, heroes:{ [id]:hero } }));
    }, {id, weapon, cosmetic});
    await variants.reload();
    await variants.locator('#enter-adventure').click();
    await openStage(variants, 23);
    const data = await inspect(variants);
    assert.equal(await variants.evaluate(() => artScene.hero.id), id);
    assert.equal(await variants.evaluate(() => artScene.hero.alternate), weapon === 'alternate');
    assert(data.hero.includes(cosmetic) || id === 'shadow' && cosmetic === 'scout', data.hero);
    assert.deepEqual(variants.artErrors, []);
    verified += 1;
  }
  await variants.close();
  await writeFile(resolve(output, 'render-checks.json'), JSON.stringify({ worlds:results, heroVariants:verified }, null, 2) + '\n');
  console.log(verified + ' hero, weapon and outfit combinations');
} finally {
  await browser.close();
}
