const assert = require('node:assert/strict');
const { mkdtemp, rm, writeFile } = require('node:fs/promises');
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
      assert([20,30,60].includes(await original.locator('[data-level]').count()));
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
    await page.waitForFunction(() => document.documentElement.dataset.startup === 'ready');
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
    await page.locator('#enter-adventure').click();
    await page.locator('#settings-button').click();
    const fullscreen = page.locator('#fullscreen');
    await fullscreen.click();
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    await fullscreen.click();
    await page.waitForFunction(() => !document.fullscreenElement);
    await page.locator('#settings-dialog .dialog-close').click();
    console.log('Entered and exited native fullscreen from the offline Settings screen.');
    if (legacyBundle) {
      await page.locator('#level-select').click();
      assert(await page.locator('[data-level="20"]').isEnabled());
      assert(await page.locator('[data-level="21"]').isDisabled());
      assert.match(await page.locator('[data-level="19"] .level-record').textContent(), /Best 00:48/);
      await page.locator('#levels-dialog [data-close]').click();
      assert.equal(await page.locator('#sound-volume').inputValue(), '55');
      await page.locator('#skill-tree').click();
      assert.equal(await page.locator('#skill-points').textContent(), '2');
      await page.locator('[data-skill=dash]').click();
      await page.locator('#confirm-action').click();
      assert.equal(await page.locator('#skill-points').textContent(), '1');
      await page.locator('#skills-dialog [data-close]').click();
      console.log('Read the legacy 20-stage save shape and effects setting from the same isolated Windows profile.');
    }
    if (legacyBundle) {
      await page.locator('#new-adventure').click();
      await page.locator('#confirm-action').click();
    } else await page.locator('#play-game').click();
    await page.locator('#tutorial-done').click();
    await page.locator('#pause-button').waitFor();
    await page.waitForFunction(() => window.qaAudioSignal?.());
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(315);
    await page.keyboard.down('Space');
    await page.waitForFunction(() => document.querySelector('#coins').textContent === '01');
    await page.keyboard.up('Space');
    await page.keyboard.up('KeyD');
    if (process.env.PIXEL_OFFLINE_BENCH) {
      const frames = page.evaluate(() => new Promise(resolve => {
        const intervals = [];
        let start, last;
        function frame(now) {
          start ??= now;
          if (last !== undefined) intervals.push(now - last);
          last = now;
          if (now - start < 4500) return requestAnimationFrame(frame);
          intervals.sort((a, b) => a - b);
          const percentile = ratio => intervals[Math.floor((intervals.length - 1) * ratio)];
          resolve({
            averageFps: +(intervals.length * 1000 / (now - start)).toFixed(1),
            medianFps: +(1000 / percentile(.5)).toFixed(1),
            lowFps: +(1000 / percentile(.99)).toFixed(1),
            p95: +percentile(.95).toFixed(1),
            p99: +percentile(.99).toFixed(1),
            long: intervals.filter(delta => delta >= 50).length,
          });
        }
        requestAnimationFrame(frame);
      }));
      for (const move of ['KeyV', 'KeyC', 'KeyZ', 'KeyX']) {
        await page.keyboard.press(move);
        await page.waitForTimeout(525);
      }
      const sample = { runtime:'Electron offline', stage:1, ...await frames };
      await writeFile(process.env.PIXEL_OFFLINE_BENCH, JSON.stringify(sample, null, 2));
      console.log(JSON.stringify(sample));
    }
    await page.locator('#sound-button').click();
    assert.equal(await page.locator('#sound-button').getAttribute('aria-pressed'), 'false');
    console.log('Measured Web Audio output during offline gameplay and verified mute.');
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await page.evaluate(() => {
      // Unlock selection for the independent content-availability check.
      const progress = JSON.parse(localStorage.getItem('pixel-adventure.progress')) ?? { version: 2 };
      progress.unlocked = 60;
      localStorage.setItem('pixel-adventure.progress', JSON.stringify(progress));
    });
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => { if (/^https?:/.test(request.url())) external.push(request.url()); });
    page.on('requestfailed', (request) => failures.push(request.url()));
    await page.context().setOffline(true);
    await page.locator('#enter-adventure').click();
    assert.deepEqual(await page.evaluate(() => {
      const { sound, tutorialSeen } = JSON.parse(localStorage.getItem('pixel-adventure.preferences'));
      const { version, unlocked } = JSON.parse(localStorage.getItem('pixel-adventure.progress'));
      return { sound, tutorialSeen, version, unlocked };
    }), { sound: false, tutorialSeen: true, version: 2, unlocked: 60 });
    if (legacyBundle) {
      await page.locator('#skill-tree').click();
      assert.equal(await page.locator('#skill-points').textContent(), '1');
      assert.match(await page.locator('[data-skill=dash]').locator('..').textContent(), /Tier 1 \/ 3/);
      await page.locator('#skills-dialog [data-close]').click();
      console.log('Migrated campaign milestones and a purchased Shadow upgrade persisted after offline relaunch.');
    }
    for (let index = 0; index < 60; index++) {
      await page.locator('#level-select').click();
      await page.locator(`[data-level="${index}"]`).click();
      await page.waitForFunction((number) => document.querySelector('#hud-level-number').textContent === number
        && document.activeElement.id === 'stage', String(index + 1).padStart(2, '0'));
      assert(await page.locator('#pause-button').isVisible());
      assert(!(await page.locator('#help-dialog').isVisible()));
      await page.waitForFunction(() => document.querySelector('#game-mount canvas')
        ?.getContext('2d').getImageData(12, 12, 1, 1).data[3] === 255);
      await page.locator('#pause-button').click();
      await page.locator('#pause-main').click();
    }
    await page.locator('#legends-button').click();
    await page.locator('#legends-dialog').getByRole('button',{name:'Choose Hero',exact:true}).click();
    await page.locator('[data-legend-hero="thunder"]').click();
    await page.locator('#legend-select').click();
    await page.getByRole('button',{name:'Close Legends'}).click();
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await page.context().setOffline(true);
    await page.locator('#enter-adventure').click();
    await page.locator('#legends-button').click();
    await page.locator('#legends-dialog').getByRole('button',{name:'Choose Hero',exact:true}).click();
    assert.equal(await page.locator('[data-legend-hero="thunder"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pixel-adventure.legends')).version),4);
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
    console.log('Passed offline launch, keyboard gameplay, all 60 offline stage loads, and campaign and v4 hero persistence after relaunch. No external requests during play.');
  } finally {
    if (app) await app.close();
    await rm(profile, { recursive: true, force: true, maxRetries: 3 });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
