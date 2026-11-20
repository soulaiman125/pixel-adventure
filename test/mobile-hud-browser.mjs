import assert from 'node:assert/strict';
import { chromium, devices, webkit } from 'playwright-core';

const url = process.env.PIXEL_TEST_URL ?? 'http://127.0.0.1:4197/';
const cases = [[375,667], [390,844], [412,915], [667,375], [844,390], [915,412]];

async function enter(page) {
  await page.goto(url);
  await page.locator('#enter-adventure').tap();
  await page.locator('#play-game').tap();
  await page.locator('#tutorial-done').tap();
  await page.locator('#combat-hud').waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function verify(page, label, insets = { top:0, right:0, bottom:0, left:0 }) {
  const result = await page.evaluate(insets => {
    const { width, height } = visualViewport;
    const controls = [...document.querySelectorAll('#touch-controls button')].filter(node => node.checkVisibility());
    const rects = controls.map(button => button.getBoundingClientRect());
    const hud = document.querySelector('#hud').getBoundingClientRect();
    const health = document.querySelector('#player-health').getBoundingClientRect();
    const utilities = ['#sound-button','#pause-button'].map(id => document.querySelector(id));
    const within = rect => rect.left >= insets.left - .75 && rect.right <= width - insets.right + .75
      && rect.top >= insets.top - .75 && rect.bottom <= height - insets.bottom + .75;
    const reachable = node => {
      const { left, top, width, height } = node.getBoundingClientRect();
      return node.contains(document.elementFromPoint(left + width / 2, top + height / 2));
    };
    const stats = [...document.querySelectorAll('#hud dt, #hud dd')].map(node => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const own = node.getBoundingClientRect(), text = range.getBoundingClientRect();
      return text.left >= own.left - 1 && text.right <= own.right + 1 && within(own) &&
        Number.parseFloat(getComputedStyle(node).fontSize) >= 10;
    });
    const disjoint = (a, b) => a.right <= b.left + .5 || b.right <= a.left + .5 || a.top >= b.bottom - .5 || b.top >= a.bottom - .5;
    return {
      stats: stats.length === 8 && stats.every(Boolean),
      health: within(health) && health.width > 0 && health.height > 0,
      hud: within(hud) && utilities.every(reachable)
        && disjoint(...utilities.map(button => button.getBoundingClientRect())),
      targets: controls.length === 11 && controls.every((button, i) => {
        const rect = rects[i];
        return rect.width >= 44 && rect.height >= 44 && within(rect) && reachable(button)
          && rects.slice(i + 1).every(other => disjoint(rect, other));
      }),
      charge: document.querySelector('[data-action="attack"]').getAttribute('aria-label').includes('Hold to charge')
        && document.querySelector('[data-action="attack"]').innerText.includes('Hold: Charge'),
    };
  }, insets);
  assert.deepEqual(result, {stats:true, health:true, hud:true, targets:true, charge:true}, label);
  console.log(label + ' passed');
}

for (const [engine, kind, profile] of [
  ['Chrome', chromium, devices['Pixel 7']], ['WebKit', webkit, devices['iPhone 13']],
]) {
  const browser = await kind.launch(engine === 'Chrome' ? {channel:'chrome'} : {});
  try {
    for (const [width,height] of cases) {
      const page = await browser.newPage({...profile, viewport:{width,height}});
      const errors = [], tier = new Set();
      page.on('pageerror',error => errors.push(error.message));
      page.on('request',request => {
        if (/\/sprites\/painted\/mobile\/.*\.webp$/.test(request.url())) tier.add(request.url());
      });
      await enter(page);
      await verify(page, engine + ' ' + width + '×' + height);
      assert.equal(tier.size, 6, engine + ' must select six mobile art packs');
      if (width === 390) {
        await page.locator('[data-action="throw"]').tap();
        await page.locator('[data-clock="throw"].cooling').waitFor();
        await page.locator('#pause-button').tap();
        await page.locator('#resume').tap();
        await page.setViewportSize({width,height:height - 100});
        await verify(page, engine + ' with 100px less browser viewport');
      }
      if (engine === 'Chrome' && width === 844) {
        const session = await page.context().newCDPSession(page);
        const insets = { top:12, right:44, bottom:21, left:44 };
        await session.send('Emulation.setSafeAreaInsetsOverride', {insets});
        await page.waitForFunction(() => getComputedStyle(document.body).paddingRight === '44px');
        await verify(page, 'Chrome with simulated notch and home indicator', insets);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
