const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright-core');

const url = process.env.PIXEL_TEST_URL || 'http://127.0.0.1:5173/';
const button = (page, action) => page.locator(`[data-action="${action}"]`);
const wait = (page, check, value) => page.waitForFunction(check, value, { timeout: 5000 });

async function testTouch(browser) {
  const context = await browser.newContext(devices['iPhone 13']);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route((url) => url.pathname === '/src/main.js', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ status: response.status(), contentType: 'application/javascript',
      body: (await response.text()) + '\nwindow.touchQA = { scene, controls };' });
  });
  await page.goto(url);
  await page.locator('#play-game').tap();
  await page.locator('#tutorial-done').tap();
  await wait(page, () => window.touchQA?.scene.player?.body.blocked.down);
  assert.equal(await page.locator('#touch-controls').getAttribute('data-size'), 'medium');

  const session = await context.newCDPSession(page);
  const dispatch = (type, touchPoints = []) => session.send('Input.dispatchTouchEvent', { type, touchPoints });
  async function point(action, id, offset = 0) {
    const { x, y, width, height } = await button(page, action).boundingBox();
    return { x: x + width / 2 + offset, y: y + height / 2, id };
  }
  async function down(action, id) {
    const contact = await point(action, id);
    await dispatch('touchStart', [contact]);
    return contact;
  }
  const settled = () => wait(page, () => {
    const body = touchQA.scene.player.body;
    return body.blocked.down && body.velocity.y === 0;
  });
  const released = () => wait(page, () => !document.querySelector('[data-pressed]'));
  async function restart() {
    await page.locator('#pause-button').tap();
    await page.locator('#restart-level').tap();
    await wait(page, () => touchQA.scene.player.x === touchQA.scene.level.spawnX
      && touchQA.scene.player.body.blocked.down);
  }

  // A captured pointer may slide from Right to Left and back, or leave both.
  const right = await down('right', 1);
  await wait(page, () => touchQA.scene.player.body.velocity.x > 30);
  const left = await point('left', 1);
  await dispatch('touchMove', [left]);
  await wait(page, () => touchQA.scene.player.body.velocity.x < -20);
  await dispatch('touchMove', [{ ...left, y: left.y - 85 }]);
  await wait(page, () => !touchQA.controls.isDown('left') && touchQA.scene.player.body.acceleration.x === 0);
  await dispatch('touchMove', [right]);
  await wait(page, () => touchQA.controls.isDown('right'));
  await dispatch('touchEnd');
  await released();
  assert.equal(await page.evaluate(() => touchQA.controls.isDown('right')), false);

  await restart();
  const move = await down('right', 1);
  await wait(page, () => touchQA.scene.player.x > 96);
  const jump = await point('jump', 2);
  await dispatch('touchStart', [move, jump]);
  await wait(page, () => touchQA.scene.player.x > 136 && touchQA.scene.player.y < 157);
  await dispatch('touchEnd');
  await wait(page, () => touchQA.scene.collected === 1);
  assert.equal(await page.locator('#score').textContent(), '0100');
  await settled();
  await down('right', 1);
  await wait(page, () => touchQA.scene.invulnerableUntil > 0);
  await dispatch('touchEnd');
  assert.equal(await page.locator('#coins').textContent(), '01');
  await settled();
  await down('jump', 1);
  await wait(page, () => touchQA.scene.player.body.velocity.y < 0);
  await dispatch('touchEnd');

  await restart();
  await down('jump', 2);
  await dispatch('touchEnd');
  await wait(page, () => touchQA.scene.player.y < 181);
  await settled();
  const firstJump = await down('jump', 1);
  const secondJump = await point('jump', 2, -12);
  await wait(page, () => touchQA.scene.player.y < 145);
  await wait(page, () => touchQA.scene.player.y >= 167 && touchQA.scene.player.body.velocity.y > 0);
  // A second finger presses Jump before the first finger lifts. The next
  // landing should consume the new buffered jump.
  await dispatch('touchStart', [firstJump, secondJump]);
  await wait(page, () => touchQA.scene.player.body.velocity.y < -160);
  await dispatch('touchEnd');
  await released();

  await restart();
  const attackRun = await down('right', 1);
  await wait(page, () => touchQA.scene.player.body.velocity.x > 45);
  await dispatch('touchStart', [attackRun, await point('attack', 2)]);
  await wait(page, () => touchQA.scene.ninja.attack
    && touchQA.controls.isDown('right') && touchQA.scene.player.body.velocity.x > 45);
  await dispatch('touchCancel');
  await released();

  await restart();
  const comboRun = await down('right', 1);
  await wait(page, () => touchQA.scene.player.body.velocity.x > 45);
  const comboJump = await point('jump', 2);
  await dispatch('touchStart', [comboRun, comboJump]);
  await wait(page, () => touchQA.scene.player.body.velocity.y < -160);
  const comboAttack = await point('attack', 3);
  await dispatch('touchStart', [comboRun, comboJump, comboAttack]);
  await wait(page, () => touchQA.scene.ninja.attack && touchQA.controls.isDown('right')
    && touchQA.scene.player.body.velocity.y < 0);
  await dispatch('touchCancel');
  await released();

  await down('right', 1);
  await wait(page, () => touchQA.controls.isDown('right'));
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await released();
  assert.equal(await page.evaluate(() => touchQA.controls.isDown('right')), false);
  await dispatch('touchEnd');
  await down('left', 1);
  await wait(page, () => touchQA.controls.isDown('left'));
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    delete document.hidden;
  });
  await released();
  await dispatch('touchEnd');

  await down('right', 1);
  await wait(page, () => touchQA.controls.isDown('right'));
  await page.setViewportSize({ width: 844, height: 390 });
  await released();
  await dispatch('touchEnd');
  await down('right', 1);
  await wait(page, () => touchQA.controls.isDown('right'));
  // Open the regular pause dialog while a movement finger is still held.
  await page.keyboard.press('Escape');
  await released();
  await dispatch('touchEnd');
  await page.locator('#pause-settings').tap();
  await page.locator('#touch-size').selectOption('small');
  assert.equal(await page.locator('#touch-controls').getAttribute('data-size'), 'small');
  await page.locator('#touch-size').selectOption('large');
  await page.locator('#touch-opacity').fill('70');
  await page.locator('#touch-left-handed').check();
  if (await page.locator('#fullscreen').isVisible()) {
    await page.locator('#fullscreen').tap();
    await wait(page, () => document.fullscreenElement || !document.querySelector('#fullscreen-status').hidden);
    if (await page.evaluate(() => Boolean(document.fullscreenElement))) await page.locator('#fullscreen').tap();
  }
  await page.locator('#settings-dialog').getByRole('button', { name: 'Done' }).tap();
  await page.locator('#pause-controls').tap();
  await page.locator('#tutorial-done').tap();
  await page.locator('#resume').tap();
  assert((await button(page, 'left').boundingBox()).x > (await button(page, 'jump').boundingBox()).x);
  assert.equal(await button(page, 'left').evaluate((el) => getComputedStyle(el).opacity), '0.7');
  await down('left', 1);
  await wait(page, () => touchQA.scene.player.body.acceleration.x < 0);
  await dispatch('touchEnd');

  for (const [width, height] of [[320, 568], [360, 640], [390, 844], [412, 915], [568, 320], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await wait(page, () => {
      const canvas = document.querySelector('canvas');
      return Math.abs(canvas.width / canvas.height - canvas.clientWidth / canvas.clientHeight) < 0.015;
    });
    const result = await page.evaluate(() => {
      const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
      const stage = rect('#stage');
      const pause = rect('#pause-button');
      const controls = [...document.querySelectorAll('.touch-button')].map((el) => el.getBoundingClientRect());
      return {
        hasRoom: stage.height > 120 && pause.bottom < stage.top
          && controls.every((b) => b.left >= 0 && b.right <= innerWidth && b.top >= stage.bottom
            && b.bottom <= innerHeight && b.width >= 44 && b.height >= 44),
        locked: getComputedStyle(document.querySelector('#stage')).touchAction === 'none'
          && document.scrollingElement.scrollHeight <= innerHeight,
      };
    });
    assert.deepEqual(result, { hasRoom: true, locked: true }, `${width}×${height}`);
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.reload();
  await page.locator('#settings-button').tap();
  assert(await page.locator('#settings-dialog').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth));
  assert.equal(await page.locator('#touch-size').inputValue(), 'large');
  assert.equal(await page.locator('#touch-opacity').inputValue(), '70');
  assert(await page.locator('#touch-left-handed').isChecked());
  assert.deepEqual(errors, []);
  await context.close();
  console.log('Mobile touch passed including slide transfer/release, cancellation, fast taps, buffered second-finger jump, moving attack, focus, visibility, rotation, pause, death, saved settings and six layouts.');
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    await testTouch(browser);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
