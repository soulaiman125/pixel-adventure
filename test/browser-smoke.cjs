const { chromium, devices } = require('playwright-core');
const assert = require('node:assert/strict');
const address = process.env.PIXEL_TEST_URL || 'http://127.0.0.1:5173/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(url => url.pathname === '/src/main.js', async route => {
      const res = await route.fetch();
      await route.fulfill({ contentType: 'application/javascript', body: (await res.text()) + '\nwindow.qa = scene;' });
    });
    await page.addInitScript(() => localStorage.setItem('pixel-adventure.preferences', '{"tutorialSeen":true,"sound":false}'));
    await page.goto(address);
    await page.locator('canvas').waitFor();
    await page.locator('#play-game').click();
    const total = await page.locator('[data-level]').count();
    for (let index = 0; index < total; index++) {
      await page.waitForFunction(n => window.qa?.sys.isActive() && !qa.complete && document.querySelector('#hud-level-number').textContent.trim() == n, index + 1);
      assert(await page.evaluate(() => qa.coins.countActive() > 0 && qa.physics.world.bodies.size > 0));
      if (index === 0) {
        await page.keyboard.down('ArrowRight');
        await page.waitForFunction(() => qa.player.x >= 100);
        await page.keyboard.down('Space');
        await page.waitForFunction(() => qa.collected > 0);
        await page.keyboard.up('ArrowRight');
        await page.keyboard.up('Space');
        await page.keyboard.press('Escape');
        await page.locator('#resume').click();
      }
      if (index === 2) {
        await page.evaluate(() => qa.player.body.reset(190, 184));
        try { await page.waitForFunction(() => qa.invulnerableUntil > 0 && qa.player.x === qa.level.spawnX, null, { timeout: 1500 }); }
        catch (error) { console.log(await page.evaluate(() => [qa.player.x, qa.player.y, qa.player.body.bottom, qa.invulnerableUntil, qa.level.name, qa.elapsed, qa.obstacleUpdates.length, qa.damage.toString(), qa.obstacleUpdates[0]?.toString()])); throw error; }
      }
      if (index === 5) {
        await page.waitForFunction(() => qa.specialPlatforms.some(p => p.kind === 'moving' && Math.abs(p.visual.x - p.x) > 15));
        await page.evaluate(() => {
          const ledge = qa.specialPlatforms[0];
          qa.player.body.reset(ledge.surface.x, ledge.y - 8);
        });
        await page.waitForFunction(() => qa.player.y === qa.specialPlatforms[0].y);
        const offset = await page.evaluate(() => qa.player.x - qa.specialPlatforms[0].surface.x);
        await page.waitForTimeout(180);
        assert(Math.abs(await page.evaluate(() => qa.player.x - qa.specialPlatforms[0].surface.x) - offset) < 3);
      }
      if (index === 8) {
        await page.evaluate(() => qa.player.body.reset(135, 184));
        await page.keyboard.down('KeyD');
        await page.waitForFunction(() => qa.player.body.drag.x === 300 && qa.player.body.velocity.x > 50);
        await page.keyboard.up('KeyD');
      }
      if (index === 9) {
        await page.waitForFunction(() => qa.specialPlatforms.some(p => p.kind === 'vanish' && !p.surface.body.enable));
        await page.waitForFunction(() => qa.specialPlatforms.every(p => p.surface.body.enable || p.visual.alpha < 0.2));
      }
      if (index === 12) {
        await page.evaluate(() => qa.player.body.reset(339, 219));
        await page.waitForFunction(() => qa.invulnerableUntil > 0 && qa.player.x === qa.level.spawnX);
      }
      if (index === 13) {
        await page.evaluate(() => {
          const ledge = qa.specialPlatforms.find(p => p.kind === 'crumble');
          qa.player.body.reset(ledge.surface.x, ledge.y - 6);
        });
        await page.waitForFunction(() => qa.specialPlatforms.find(p => p.kind === 'crumble').triggered !== undefined);
        await page.waitForFunction(() => !qa.specialPlatforms.find(p => p.kind === 'crumble').surface.body.enable);
      }
      if (index === 16) {
        await page.evaluate(() => {
          const enemy = qa.enemies.getChildren()[0];
          qa.player.body.reset(enemy.x - 21, 184);
          qa.player.setFlipX(false);
        });
        await page.keyboard.press('KeyX');
        await page.waitForFunction(() => !qa.enemies.getChildren()[0].active);
      }
      if (index === 19) {
        await page.evaluate(() => qa.player.body.reset(qa.level.flagX, 174));
        await page.waitForTimeout(150);
        assert(!(await page.locator('#clear-dialog').isVisible()));
        await page.evaluate(() => {
          qa.player.body.reset(qa.boss.x - 31, 184);
          qa.player.setFlipX(false);
          qa.invulnerableUntil = Infinity;
        });
        await page.waitForFunction(() => qa.boss.phase === 'warn');
        await page.evaluate(() => {
          const b = qa.boss;
          qa.player.body.reset(b.x - 28, 184);
        });
        await page.keyboard.press('KeyX');
        assert.equal(await page.evaluate(() => qa.boss.hp), 5);
        await page.waitForFunction(() => qa.boss.phase === 'attack' && qa.projectiles.length >= 2);
        await page.waitForFunction(() => qa.boss.phase === 'open');
        for (let hp = 4; hp >= 0; hp--) {
          await page.waitForFunction(() => qa.boss.phase === 'open' && qa.boss.hits < 2);
          await page.keyboard.press('KeyX');
          await page.waitForFunction(hp => qa.boss.hp === hp, hp, { timeout: 1500 });
          if (hp === 3) {
            await page.waitForFunction(() => qa.boss.cycle === 1 && qa.boss.phase === 'warn');
            await page.waitForFunction(() => qa.boss.phase === 'attack' && qa.projectiles.some(shot => shot.vy > 0));
          }
          await page.waitForTimeout(370);
        }
        assert.equal(await page.locator('#boss-health').getAttribute('value'), '0');
      }
      await page.evaluate(() => qa.player.body.reset(qa.level.flagX, 174));
      await page.locator('#clear-dialog[open]').waitFor();
      if (index < total - 1) await page.locator('#next-level').click();
      console.log('Loaded, spawned and triggered finish for level', index + 1);
    }
    if (total === 20) {
      await page.locator('#view-victory').click();
      assert(await page.locator('#victory-dialog').isVisible());
      await page.locator('#victory-replay').click();
      await page.waitForFunction(() => qa.level.name === 'Verdant Hills' && !qa.complete);
    }
    const mobile = await browser.newPage(devices['iPhone 13']);
    await mobile.goto(address);
    await mobile.locator('canvas').waitFor();
    await mobile.locator('#play-game').tap();
    await mobile.locator('#tutorial-done').tap();
    const session = await mobile.context().newCDPSession(mobile);
    async function point(action, id) {
      const target = await mobile.locator(`[data-action="${action}"]`).boundingBox();
      assert(target && target.x >= 0 && target.x + target.width <= 390);
      return { id, x: target.x + target.width / 2, y: target.y + target.height / 2 };
    }
    const right = await point('right', 1);
    const jump = await point('jump', 2);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right] });
    await mobile.waitForTimeout(320);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right, jump] });
    await mobile.waitForFunction(() => document.querySelector('#coins').textContent === '01');
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mobile.locator('[data-action="attack"]').tap();
    await mobile.locator('#pause-button').tap();
    await mobile.locator('#restart-level').tap();
    assert.equal(await mobile.locator('#coins').textContent(), '00');
    console.log('Two-finger move and jump, touch attack activation, pause, and restart passed in phone emulation.');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
