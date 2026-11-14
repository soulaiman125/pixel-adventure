const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright-core');

async function main() {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'pixel-adventure-qa-'));
  const bundle = process.argv[2];
  const launch = () => electron.launch({
    ...(bundle ? { executablePath: path.resolve(bundle) } : {}),
    args: [...(bundle ? [] : ['.']), '--user-data-dir=' + profile,
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost'],
  });
  let app;
  try {
    app = await launch();
    let page = await app.firstWindow();
    const errors = [];
    const external = [];
    const failures = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => { if (/^https?:/.test(request.url())) external.push(request.url()); });
    await page.locator('canvas').waitFor();
    assert.equal(page.url(), 'pixel://game/index.html');
    const context = await page.evaluate(() => ({
      node: typeof window.require, process: typeof window.process, storage: typeof localStorage,
    }));
    assert.deepEqual(context, { node: 'undefined', process: 'undefined', storage: 'object' });
    assert(await page.evaluate(async () => {
      try {
        await fetch('https://example.invalid/');
        return false;
      } catch {
        return true;
      }
    }));
    external.length = 0; // Exclude the deliberate fetch rejection probe above.
    await page.context().setOffline(true);
    await page.locator('#sound-button').click();
    await page.locator('#play-game').click();
    await page.locator('#tutorial-done').click();
    await page.locator('#pause-button').waitFor();
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(315);
    await page.keyboard.down('Space');
    await page.waitForFunction(() => document.querySelector('#coins').textContent === '01');
    await page.keyboard.up('Space');
    await page.keyboard.up('KeyD');
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await page.evaluate(() => {
      // Unlock selection for the independent content-availability check.
      const progress = JSON.parse(localStorage.getItem('pixel-adventure.progress'));
      progress.unlocked = 20;
      localStorage.setItem('pixel-adventure.progress', JSON.stringify(progress));
    });
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => { if (/^https?:/.test(request.url())) external.push(request.url()); });
    page.on('requestfailed', (request) => failures.push(request.url()));
    await page.context().setOffline(true);
    await page.locator('canvas').waitFor();
    assert.deepEqual(await page.evaluate(() => {
      const { sound, tutorialSeen } = JSON.parse(localStorage.getItem('pixel-adventure.preferences'));
      const { version, unlocked } = JSON.parse(localStorage.getItem('pixel-adventure.progress'));
      return { sound, tutorialSeen, version, unlocked };
    }), { sound: false, tutorialSeen: true, version: 2, unlocked: 20 });
    for (let index = 0; index < 20; index++) {
      await page.locator('#level-select').click();
      await page.locator(`[data-level="${index}"]`).click();
      await page.waitForFunction((number) => document.querySelector('#hud-level-number').textContent === number
        && document.activeElement.id === 'stage', String(index + 1).padStart(2, '0'));
      assert(await page.locator('#pause-button').isVisible());
      assert(!(await page.locator('#help-dialog').isVisible()));
      assert(await page.locator('canvas').evaluate((canvas) => canvas.getContext('2d').getImageData(12, 12, 1, 1).data[3] === 255));
      await page.locator('#pause-button').click();
      await page.locator('#pause-main').click();
    }
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
    console.log('Passed offline launch, keyboard gameplay, all 20 offline stage loads, and local save persistence after relaunch. No external requests during play.');
  } finally {
    if (app) await app.close();
    await rm(profile, { recursive: true, force: true, maxRetries: 3 });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
