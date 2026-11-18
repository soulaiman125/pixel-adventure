const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright-core');

async function main() {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'pixel-adventure-qa-'));
  const bundle = process.argv[2];
  const legacyBundle = process.argv[3] || process.env.PIXEL_LEGACY_APP;
  const launch = (executable = bundle) => electron.launch({
    ...(executable ? { executablePath: path.resolve(executable) } : {}),
    args: [...(executable ? [] : ['.']), '--user-data-dir=' + profile,
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost'],
  });
  let app;
  try {
    if (legacyBundle) {
      app = await launch(legacyBundle);
      const original = await app.firstWindow();
      await original.locator('canvas').waitFor();
      assert([20,30].includes(await original.locator('[data-level]').count()));
      await original.evaluate(() => {
        const records = Array(20).fill(null);
        records[19] = { coins: 6, elapsed: 48000 };
        localStorage.setItem('pixel-adventure.preferences', '{"volume":55}');
        localStorage.setItem('pixel-adventure.progress', JSON.stringify({ version: 2, unlocked: 20, records }));
      });
      await app.close();
      app = undefined;
    }
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
    await page.evaluate(() => {
      const compressor = AudioContext.prototype.createDynamicsCompressor;
      AudioContext.prototype.createDynamicsCompressor = function () {
        const mix = compressor.call(this);
        const analyser = this.createAnalyser();
        mix.connect(analyser);
        const buffer = new Float32Array(analyser.fftSize);
        window.qaAudioSignal = () => {
          analyser.getFloatTimeDomainData(buffer);
          return this.state === 'running' && buffer.some(value => Math.abs(value) > .001);
        };
        return mix;
      };
    });
    if (legacyBundle) {
      await page.locator('#level-select').click();
      assert(await page.locator('[data-level="20"]').isEnabled());
      assert(await page.locator('[data-level="21"]').isDisabled());
      assert.match(await page.locator('[data-level="19"] .level-record').textContent(), /Best 00:48/);
      await page.locator('#levels-dialog [data-close]').click();
      assert.equal(await page.locator('#sound-volume').inputValue(), '55');
      console.log('Read the legacy 20-stage save shape and effects setting from the same isolated Windows profile.');
    }
    await page.locator('#play-game').click();
    await page.locator('#tutorial-done').click();
    await page.locator('#pause-button').waitFor();
    await page.waitForFunction(() => window.qaAudioSignal?.());
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(315);
    await page.keyboard.down('Space');
    await page.waitForFunction(() => document.querySelector('#coins').textContent === '01');
    await page.keyboard.up('Space');
    await page.keyboard.up('KeyD');
    await page.locator('#sound-button').click();
    assert.equal(await page.locator('#sound-button').getAttribute('aria-pressed'), 'false');
    console.log('Measured Web Audio output during offline gameplay and verified mute.');
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await page.evaluate(() => {
      // Unlock selection for the independent content-availability check.
      const progress = JSON.parse(localStorage.getItem('pixel-adventure.progress'));
      progress.unlocked = 30;
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
    }), { sound: false, tutorialSeen: true, version: 2, unlocked: 30 });
    for (let index = 0; index < 30; index++) {
      await page.locator('#level-select').click();
      await page.locator(`[data-level="${index}"]`).click();
      await page.waitForFunction((number) => document.querySelector('#hud-level-number').textContent === number
        && document.activeElement.id === 'stage', String(index + 1).padStart(2, '0'));
      assert(await page.locator('#pause-button').isVisible());
      assert(!(await page.locator('#help-dialog').isVisible()));
      await page.waitForFunction(() => document.querySelector('canvas')
        ?.getContext('2d').getImageData(12, 12, 1, 1).data[3] === 255);
      await page.locator('#pause-button').click();
      await page.locator('#pause-main').click();
    }
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
    console.log('Passed offline launch, keyboard gameplay, all 30 offline stage loads, and local save persistence after relaunch. No external requests during play.');
  } finally {
    if (app) await app.close();
    await rm(profile, { recursive: true, force: true, maxRetries: 3 });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
