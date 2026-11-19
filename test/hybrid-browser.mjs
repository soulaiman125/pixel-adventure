
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.PIXEL_TEST_URL || 'http://127.0.0.1:4240/';
const browser = await chromium.launch({ channel: 'msedge' });
const sizes = [[1920,1080], [1600,900], [1366,768], [1280,720], [1024,768], [1180,820],
  [390,844,true], [844,390,true], [932,430,true], [667,375,true], [568,320,true]];

async function focus(page, id) {
  await page.waitForFunction(id => document.activeElement.id === id, id);
}

async function layout(width, height, touch) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: !!touch, isMobile: !!touch });
  await page.goto(base);
  await page.locator('#enter-adventure').click();
  await page.evaluate(() => document.fonts.ready);
  for (const control of await page.locator('#hub :is(button,a):visible').all()) {
    const result = await control.evaluate(element => {
      element.scrollIntoView({ block: 'center', inline: 'nearest' });
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return { name: element.id || element.innerText, hit: element.contains(hit), height: box.height,
        overflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    assert(result.hit && !result.overflow && result.height >= 43.95, JSON.stringify({width,height,...result}));
  }
  await page.locator('#settings-button').click();
  await focus(page, 'settings-title');
  assert.equal(await page.locator('#settings-dialog').evaluate(el => el.scrollTop), 0);
  assert(await page.locator('#settings-dialog .dialog-close').isVisible());
  await page.keyboard.press('Escape');
  await focus(page, 'settings-button');
  await page.locator('#level-select').click();
  await page.locator('#levels-dialog [data-legends-heroes]').click();
  await page.locator('[data-legend-hero=frost]').click();
  for (const icon of await page.locator('.legend-portraits canvas').all()) {
    assert(await icon.evaluate(el => el.getContext('2d').getImageData(0,0,el.width,el.height)
      .data.some((byte,index) => index % 4 === 3 && byte > 0)));
  }
  await page.locator('#legends-dialog [data-back-action]').click();
  assert.equal(await page.locator('#legends-dialog[open]').count(), 0);
  assert(await page.evaluate(() => document.activeElement.matches('#levels-dialog [data-legends-heroes]')));
  await page.close();
  console.log(width + '×' + height, 'Hub hit targets, modal focus, five portraits and nested Back passed');
}

async function startup() {
  const page = await browser.newPage();
  let fail = true;
  await page.route(url => /\/assets\/main-[\w-]+\.js$/.test(url.pathname), async route => {
    if (!fail) return route.continue();
    await new Promise(resolve => setTimeout(resolve, 1500));
    await route.abort('failed');
  });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('#startup-state').waitFor();
  assert(await page.locator('#enter-adventure').isDisabled());
  await page.locator('#startup-retry').waitFor();
  fail = false;
  await page.locator('#startup-retry').click();
  await page.locator('#enter-adventure').click();
  assert(await page.locator('#hub').isVisible());
  await page.close();
  console.log('Delayed startup and production bundle Retry passed');
}

async function gamepad() {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.testPad = { enabled: true, id: 'Simulated Standard controller', mapping: 'standard', connected: true,
      axes: [0,0,0,0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator,'getGamepads',{value: () => testPad.enabled ? [testPad] : []});
    localStorage.setItem('pixel-adventure.preferences','{"tutorialSeen":true,"sound":false}');
  });
  await page.goto(base);
  await focus(page, 'enter-adventure');

  async function press(button) {
    for (const pressed of [true, false]) {
      await page.evaluate(({button,pressed}) => {
        Object.assign(testPad.buttons[button],{pressed,value:Number(pressed)});
      },{button,pressed});
      await page.waitForTimeout(85);
    }
  }

  await press(0);
  await focus(page, 'play-game');
  await press(0);
  await focus(page, 'stage');
  await press(9);
  await focus(page, 'resume');
  const ids = await page.locator('#pause-dialog button:visible').evaluateAll(buttons => buttons.map(el => el.id));
  const distance = ids.indexOf('pause-settings') - ids.indexOf('resume');
  assert(distance > 0);
  for (let i = 0; i < distance; i++) await press(13);
  await focus(page, 'pause-settings');
  await press(0);
  await focus(page, 'settings-title');
  await press(1);
  await focus(page, 'pause-settings');
  await page.evaluate(() => { testPad.enabled = false; });
  await page.waitForTimeout(120);
  await page.evaluate(() => { testPad.enabled = true; });
  await press(9);
  await focus(page, 'stage');
  await press(9);
  await focus(page, 'resume');
  await press(0);
  await focus(page, 'stage');
  await page.close();
  console.log('Controller-only entry, start, pause, Settings, Back, reconnect and both resume actions passed');
}

async function landscapeCutout() {
  const page = await browser.newPage({ viewport: { width: 568, height: 320 }, isMobile: true, hasTouch: true });
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Emulation.setSafeAreaInsetsOverride', { insets: { left:44, right:44, bottom:18, top:0 } });
  } catch (error) {
    if (!error.message.includes("wasn't found")) throw error;
    await page.close();
    console.log('Safe-area simulation requires a newer Edge DevTools protocol');
    return;
  }
  await page.goto(base);
  await page.locator('#enter-adventure').tap();
  await page.locator('#play-game').tap();
  await page.locator('#tutorial-done').tap();
  const targets = await page.locator('[data-action]:visible').evaluateAll(elements => elements.map(element => {
    const r = element.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return r.left >= 43.95 && r.right <= innerWidth-43.95 && r.width >= 43.95 &&
      r.height >= 43.95 && element.contains(hit);
  }));
  assert.deepEqual(targets, Array(11).fill(true));
  await page.close();
  console.log('All 11 targets fit with simulated 44 px landscape cutouts at 568×320');
}

try {
  for (const size of sizes) await layout(...size);
  await landscapeCutout();
  await startup();
  await gamepad();
} finally {
  await browser.close();
}
