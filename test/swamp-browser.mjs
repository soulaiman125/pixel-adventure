import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.PIXEL_TEST_URL || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ channel: 'msedge' });
const title = 'Stage Failed — Restarting';

async function open(query, viewport = { width:1366, height:768 }, mobile = false) {
  const page = await browser.newPage({ viewport, isMobile:mobile, hasTouch:mobile });
  page.setDefaultTimeout(9000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(url => url.pathname === '/src/main.js', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body:(await response.text()) + '\nwindow.qa=scene;' });
  });
  await page.addInitScript(() => {
    if (!localStorage.getItem('pixel-adventure.progress'))
      localStorage.setItem('pixel-adventure.progress','{"version":2,"unlocked":60}');
    if (!localStorage.getItem('pixel-adventure.preferences'))
      localStorage.setItem('pixel-adventure.preferences','{"tutorialSeen":true,"sound":false}');
  });
  function close() {
    assert.deepEqual(errors, []);
    return page.close();
  }
  return { page, close, async hub() {
    await page.goto(new URL(query === null ? './' : '?swamp=' + query, base).href);
    await page.locator('#enter-adventure').click();
  }};
}

async function enterStage(page, level) {
  await page.locator('#level-select').click();
  await page.locator('[data-level="' + (level - 1) + '"]').click();
  await page.waitForFunction(() => qa?.player?.body?.blocked.down && document.activeElement.id === 'stage');
}

async function retry(customLimit) {
  const { page, hub, close } = await open(null);
  await hub();
  if (customLimit) {
    await page.locator('#settings-button').click();
    await page.locator('.swamp-settings summary').click();
    await page.locator('#swamp-deaths').fill(String(customLimit));
    await page.locator('#swamp-deaths').press('Tab');
    await hub();
    await page.locator('#settings-button').click();
    await page.locator('.swamp-settings summary').click();
    assert.equal(await page.locator('#swamp-deaths').inputValue(),String(customLimit));
    await page.keyboard.press('Escape');
  }
  await enterStage(page,23);
  await page.evaluate(() => {
    qa.player.body.reset(513,182);
    qa.enemies.getChildren()[0].disableBody(true,true);
    qa.collect(qa.coins.getChildren()[0]);
  });
  await page.waitForFunction(() => qa.checkpoint !== qa.level.spawnX);
  const checkpoint = await page.evaluate(() => qa.checkpoint);
  const score = await page.locator('#score').textContent();
  assert(Number(score)>0);
  for (let death=1; death<(customLimit||3); death++) {
    await page.keyboard.press('KeyR');
    await page.waitForFunction(death => qa.deaths === death, death);
    assert.equal(await page.evaluate(() => qa.checkpoint), checkpoint);
    assert.equal(await page.locator('#score').textContent(), score);
  }
  await page.keyboard.press('KeyR');
  const notice = page.locator('#loading-label').filter({hasText:title});
  await notice.waitFor();
  assert(await page.evaluate(() => qa.failed && qa.physics.world.isPaused));
  await notice.waitFor({state:'hidden'});
  await page.waitForFunction(() => !qa.failed && !qa.physics.world.isPaused);
  assert.deepEqual(await page.evaluate(() => [qa.deaths,qa.collected,qa.checkpoint===qa.level.spawnX,
    qa.enemies.countActive(),qa.coins.countActive()]),[0,0,true,4,20]);
  assert.equal(await page.locator('#score').textContent(), '0000');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => qa.collected === 1);
  await page.keyboard.up('ArrowRight');
  await close();
}

async function isolatedLayers() {
  const checks = {
    normals: () => typeof qa.swamp.light === 'function',
    shadows: () => typeof qa.swamp.cast === 'function',
    depth: () => qa.backdrop.layers.map(layer => layer.speed).join() === '0.12,0.28,0.48,0.7',
    post: () => qa.backdrop.layers[0].image.texture.key.endsWith('-swamp-soft'),
    materials: () => qa.textures.getTextureKeys().some(key => key.startsWith('swamp-stone-')),
    motion: () => typeof qa.swamp.sway === 'function' && qa.textures.getTextureKeys().some(key => key.startsWith('swamp-hero-')),
  };
  for (const [option, verify] of Object.entries(checks)) {
    const { page, hub, close } = await open(option);
    await hub();
    await enterStage(page,23);
    assert.deepEqual(await page.evaluate(() => Object.keys(qa.swamp.options)
      .filter(key => qa.swamp.options[key] === true)),[option]);
    assert(await page.evaluate(verify),option);
    await close();
  }
}

async function finisher(reducedMotion = 'no-preference') {
  const { page, hub, close } = await open('finisher');
  await page.emulateMedia({ reducedMotion });
  await hub();
  await enterStage(page,25);
  await page.evaluate(() => {
    qa.player.body.reset(qa.boss.x-24,184);
    qa.invulnerableUntil=Infinity;
  });
  await page.waitForFunction(() => qa.boss.phase==='open');
  await page.evaluate(() => {
    qa.boss.tier=2; qa.boss.hp=1; qa.boss.hits=0; qa.boss.since=qa.elapsed;
  });
  await page.keyboard.press('KeyX');
  await page.waitForFunction(() => qa.boss.hp === 0);
  if (reducedMotion === 'reduce') {
    assert(await page.evaluate(() => !qa.bossFinisher && !qa.physics.world.isPaused));
    await close();
    return;
  }
  await page.waitForFunction(() => !!qa.bossFinisher);
  const elapsed = await page.evaluate(() => qa.elapsed);
  assert(await page.evaluate(() => qa.physics.world.isPaused));
  await page.waitForFunction(() => qa.boss.finishAge>50 && qa.boss.finishAge<360);
  assert.equal(await page.evaluate(() => qa.elapsed),elapsed);
  assert(await page.evaluate(() => qa.cameras.main.zoom > 1));
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => !qa.bossFinisher && !qa.physics.world.isPaused);
  assert.deepEqual(await page.evaluate(() => [qa.boss.hp,qa.cameras.main.zoom,qa.controls.isDown('right')]),[0,1,true]);
  await page.keyboard.up('ArrowRight');
  await close();
}

async function multitouch() {
  const { page, hub, close } = await open(null, { width:844, height:390 }, true);
  await hub();
  await enterStage(page,23);
  const cdp = await page.context().newCDPSession(page);
  async function finger(action,id) {
    const { x,y,width,height } = await page.locator(`[data-action="${action}"]`).boundingBox();
    return { x:x+width/2, y:y+height/2, id };
  }
  const move = await finger('right',1), jump = await finger('jump',2), attack = await finger('attack',3);
  const press = touchPoints => cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints });
  await press([move]);
  await page.waitForFunction(() => qa.player.body.velocity.x > 45);
  await press([move,jump]);
  await page.waitForFunction(() => qa.player.body.velocity.y < -120);
  await press([move,jump,attack]);
  await page.waitForFunction(() => qa.ninja.attack?.air && qa.controls.isDown('right') && !qa.player.body.blocked.down);
  await cdp.send('Input.dispatchTouchEvent', { type:'touchCancel', touchPoints:[] });
  await page.waitForFunction(() => !qa.controls.isDown('right'));
  await close();
}

async function benchmark(query, viewport, mobile) {
  const { page, hub, close } = await open(query, viewport, mobile);
  await hub();
  await enterStage(page,23);
  const frames = page.evaluate(() => new Promise(resolve => {
    const intervals = [];
    let first, last;
    function tick(now) {
      first ??= now;
      if (last !== undefined) intervals.push(now - last);
      last = now;
      if (now - first < 5300) { requestAnimationFrame(tick); return; }
      intervals.sort((a,b) => a-b);
      resolve({
        fps: +(intervals.length * 1000 / (now-first)).toFixed(1),
        p95: +intervals[Math.floor(intervals.length*.95)].toFixed(1),
        long: intervals.filter(ms=>ms>=50).length,
      });
    }
    requestAnimationFrame(tick);
  }));
  await page.keyboard.down('ArrowRight');
  for (const [key, ms] of [['KeyC',750],['KeyX',450],['Space',360],['KeyZ',700],['KeyV',460],['Space',430]]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(ms);
  }
  await page.keyboard.up('ArrowRight');
  const metrics = await frames;
  await close();
  return { ...viewport, mobile, variant: query ?? 'enhanced', ...metrics };
}

try {
  await retry();
  await retry(2);
  await finisher();
  await finisher('reduce');
  await isolatedLayers();
  await multitouch();
  console.log('Independent toggles, retry and settings persistence, both finisher modes, and Forgotten Swamp multitouch passed.');
  for (const [viewport,mobile] of [[{width:1366,height:768},false],[{width:844,height:390},true]]) {
    for (const query of ['none',null]) console.log(JSON.stringify(await benchmark(query,viewport,mobile)));
  }
} finally { await browser.close(); }
