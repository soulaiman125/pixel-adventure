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
    await page.addInitScript(() => {
      if (!localStorage.getItem('pixel-adventure.preferences')) {
        localStorage.setItem('pixel-adventure.preferences', '{"tutorialSeen":true,"sound":false}');
      }
    });
    await page.goto(address);
    await page.locator('canvas').waitFor();
    await page.locator('#settings-button').click();
    await page.locator('#music-volume').press('End');
    await page.locator('#music-volume').press('ArrowLeft');
    await page.locator('#sound-volume').press('Home');
    await page.locator('#danger-setting').check();
    await page.reload();
    await page.locator('canvas').waitFor();
    await page.locator('#settings-button').click();
    assert.equal(await page.locator('#music-volume').inputValue(), '95');
    assert.equal(await page.locator('#sound-volume').inputValue(), '0');
    assert(await page.locator('#danger-setting').isChecked());
    await page.locator('#settings-dialog [data-close]').first().click();
    await page.locator('#level-select').click();
    await page.getByRole('button', { name: 'Thunder Fortress, 0 of 5 stages cleared' }).click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'world-26');
    assert(await page.locator('[data-level="25"]').isDisabled());
    await page.locator('#levels-dialog [data-close]').click();
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
      if (index === 20) {
        await page.evaluate(() => {
          qa.player.body.reset(qa.level.ground[1][0] + 19, 184);
        });
        await page.waitForFunction(() => qa.checkpoint !== qa.level.spawnX);
        const coinsBefore = await page.evaluate(() => qa.collected);
        await page.evaluate(() => {
          const [x, y] = qa.level.coins[0];
          qa.player.body.reset(x, y);
        });
        await page.waitForFunction(expected => qa.collected === expected, coinsBefore + 1);
        await page.evaluate(() => qa.player.body.reset(380, 203));
        await page.waitForFunction(() => qa.deaths === 1 && qa.player.x === qa.checkpoint);
        assert.equal(Number(await page.locator('#coins').textContent()), coinsBefore + 1);
        assert.equal(await page.locator('#deaths').textContent(), '1');
        await page.keyboard.press('KeyR');
        await page.waitForFunction(() => qa.deaths === 2 && qa.player.x === qa.checkpoint);
        assert.equal(Number(await page.locator('#coins').textContent()), coinsBefore + 1);
        await page.keyboard.press('Escape');
        await page.locator('#retry-checkpoint').click();
        await page.waitForFunction(() => qa.deaths === 3 && qa.player.x === qa.checkpoint);
        await page.keyboard.press('Escape');
        const paused = await page.evaluate(() => qa.elapsed);
        await page.waitForTimeout(220);
        assert.equal(await page.evaluate(() => qa.elapsed), paused);
        await page.locator('#restart-level').click();
        await page.waitForFunction(() => qa.elapsed < 500 && qa.deaths === 0
          && qa.checkpoint === qa.level.spawnX && qa.coins.getChildren()[0].active);
      }
      if (index === 24 || index === 29) {
        // Controlled positioning isolates the boss and UI from the route to the arena.
        await page.evaluate(() => {
          qa.player.body.reset(qa.level.flagX, 174);
          qa.invulnerableUntil = Infinity;
        });
        await page.waitForFunction(() => qa.boss.phase === 'warn');
        assert(!(await page.locator('#clear-dialog').isVisible()));
        await page.evaluate(() => {
          qa.player.body.reset(qa.boss.x - 26, 184);
          qa.player.setFlipX(false);
        });
        const name = await page.evaluate(() => qa.boss.name);
        assert.equal(await page.locator('#boss-name').textContent(), name);
        await page.keyboard.press('KeyX');
        const hp = await page.evaluate(() => qa.boss.maxHp);
        assert.equal(await page.evaluate(() => qa.boss.hp), hp);
        const seen = new Set();
        for (let remaining = hp - 1; remaining >= 0; remaining--) {
          await page.waitForFunction(() => qa.boss.phase === 'open' && qa.boss.hits < 2);
          seen.add(await page.evaluate(() => qa.boss.profile.pattern));
          await page.keyboard.press('KeyX');
          await page.waitForFunction(expected => qa.boss.hp === expected, remaining, { timeout: 1500 });
          await page.waitForTimeout(365);
        }
        assert.deepEqual([...seen], index === 24 ? ['spores', 'venom', 'bloom'] : ['wave', 'bolts', 'impact']);
        assert.equal(await page.locator('#boss-health').getAttribute('value'), '0');
      }
      await page.evaluate(() => qa.player.body.reset(qa.level.flagX, 174));
      await page.locator('#clear-dialog[open]').waitFor();
      if (index < total - 1) await page.locator('#next-level').click();
      console.log('Loaded, spawned and triggered finish for level', index + 1);
    }
    if (total === 30) {
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
