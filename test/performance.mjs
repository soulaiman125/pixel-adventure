import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  channel: "msedge",
  args: ["--disable-background-timer-throttling"],
});
const results = [];
const versions = {
  prototype: process.env.PIXEL_BASELINE_URL || "http://127.0.0.1:4219/",
  candidate: process.env.PIXEL_TEST_URL || "http://127.0.0.1:4220/",
};
const outputDirectory = resolve(process.env.PIXEL_REVIEW_DIR || "artifacts/ninja-review");
await mkdir(outputDirectory, {recursive:true});
const report = resolve(outputDirectory, "performance.json");
async function exposeScene(page) {
  await page.route(
    (url) => /\/assets\/index-[\w-]+\.js$/.test(url.pathname),
    async (route) => {
      const response = await route.fetch(),
        main = await response.text();
      const scene = main.match(
        /scene:\[new [\w$]+\([^)]*\),([\w$]+)\]\}\)/,
      )?.[1];
      assert(scene);
      await route.fulfill({
        response,
        body: main + "\nwindow.qaScene=" + scene + ";",
      });
    },
  );
}
async function benchmark(label, options, rate, version, stage) {
  const page = await browser.newPage(options);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
  const cdp = await page.context().newCDPSession(page);
  if (rate > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await exposeScene(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      "pixel-adventure.preferences",
      '{"tutorialSeen":true,"sound":false}',
    );
    localStorage.setItem(
      "pixel-adventure.progress",
      '{"version":2,"unlocked":60}',
    );
  });
  const dashKey = "KeyZ";
  const throwKey = "KeyC";
  await page.goto(versions[version]);
  await page.locator("canvas").waitFor();
  await page.locator("#level-select").click();
  const stageLoadStarted=performance.now();
  await page.locator('[data-level="' + stage + '"]').click();
  await page.waitForFunction(() => qaScene?.player?.body?.blocked.down);
  const loadMs=Math.round(performance.now()-stageLoadStarted);
  if (stage === 29 || stage === 59)
    await page.evaluate(() => {
      // A staged phase-three workload keeps the boss effects comparable.
      // This setup is independent of the legitimate campaign runner.
      qaScene.player.body.reset(qaScene.boss.x-120, 184);
      qaScene.boss.hp = 3;
      qaScene.moveCamera(1);
    });
  await page.evaluate(() => {
    const s = qaScene;
    const acc = (window.qaCosts = {
      frames: 0,
      feedback: 0,
      presentation: 0,
      bursts: 0,
      particleDraws: 0,
      particleMs: 0,
    });
    const feedback = s.feedback.update.bind(s.feedback);
    const emit = s.feedback.emit.bind(s.feedback);
    s.feedback.update = () => {
      const start = performance.now();
      feedback();
      acc.feedback += performance.now() - start;
      acc.frames++;
    };
    s.feedback.emit = (...args) => {
      acc.bursts++;
      return emit(...args);
    };
    for (const item of s.children.list.filter(
      (item) => item.type === "Rectangle" && item.depth === 6,
    )) {
      const render = item.renderCanvas.bind(item);
      item.renderCanvas = (...args) => {
        const start = performance.now();
        const result = render(...args);
        acc.particleMs += performance.now() - start;
        acc.particleDraws++;
        return result;
      };
    }
    if (s.shadowPresentation) {
      const original = s.shadowPresentation.update.bind(s.shadowPresentation);
      s.shadowPresentation.update = (time) => {
        const start = performance.now();
        original(time);
        acc.presentation += performance.now() - start;
      };
    }
    window.addEventListener("keydown", (event) => {
      if (!["KeyD","KeyA"].includes(event.code) || window.latencyStarted) return;
      window.latencyStarted = true;
      const x = s.player.x,
        start = performance.now();
      function measure() {
        if (Math.abs(s.player.x - x) > 0.1) window.inputMs = performance.now() - start;
        else if (performance.now() - start < 1000)
          requestAnimationFrame(measure);
      }
      requestAnimationFrame(measure);
    });
  });
  const frames = page.evaluate(
    () =>
      new Promise((resolve) => {
        const intervals = [];
        let start, previous;
        function frame(time) {
          start ??= time;
          if (previous !== undefined) intervals.push(time - previous);
          previous = time;
          if (time - start < 4800) requestAnimationFrame(frame);
          else {
            intervals.sort((a, b) => a - b);
            const percentile = fraction => intervals[Math.floor((intervals.length - 1) * fraction)];
            resolve({
              fps: +((intervals.length * 1000) / (time - start)).toFixed(1),
              medianFps: +(1000 / percentile(0.5)).toFixed(1),
              p95: +percentile(0.95).toFixed(1),
              p99: +percentile(0.99).toFixed(1),
              lowFps: +(1000 / percentile(0.99)).toFixed(1),
              long: intervals.filter((x) => x >= 50).length,
            });
          }
        }
        requestAnimationFrame(frame);
      }),
  );
  if(stage===29||stage===59){
    await page.keyboard.down("KeyA");
    await page.waitForTimeout(475);
    await page.keyboard.up("KeyA");
  }else{
  await page.keyboard.down("KeyD");
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Space", { delay: 255 });
    await page.keyboard.press(i % 2 ? throwKey : dashKey);
    await page.waitForTimeout(140);
    await page.keyboard.press("KeyX");
    await page.waitForTimeout(140);
  }
  await page.keyboard.up("KeyD");
  }
  const measured = await frames;
  const runtime = await page.evaluate(() => {
    const acc = window.qaCosts;
    const texture =
      qaScene.textures.exists("shadow-ninja") &&
      qaScene.textures.get("shadow-ninja").getSourceImage();
    return {
      inputMs: Math.round(window.inputMs),
      jsFeedbackMs: +(acc.feedback / acc.frames).toFixed(3),
      jsPresentationMs: +(acc.presentation / acc.frames).toFixed(3),
      bursts: acc.bursts,
      particleCanvasMs: +(acc.particleMs / acc.frames).toFixed(3),
      particleDraws: acc.particleDraws,
      atlasMiB: texture
        ? +((texture.width * texture.height * 4) / 1048576).toFixed(2)
        : 0,
    };
  });
  assert(Number.isFinite(runtime.inputMs));
  if (label === "desktop" && stage === 0) {
    await page.evaluate(
      () => (window.originalAtlas = qaScene.textures.get("shadow-ninja")),
    );
    const counts = [];
    for (let i = 0; i < 3; i++) {
      await page.locator("#pause-button").click();
      await page.locator("#pause-main").click();
      await page.locator("#play-game").click();
      await page.waitForFunction(
        () => qaScene.sys.isActive() && qaScene.player.body.blocked.down,
      );
      const fresh = await page.evaluate(() => ({
        objects: qaScene.children.length,
        shots: qaScene.ninja.projectiles.length,
        sameAtlas:
          qaScene.textures.get("shadow-ninja") === window.originalAtlas,
      }));
      assert.equal(fresh.shots, 0);
      assert(fresh.sameAtlas);
      counts.push(fresh.objects);
      await page.keyboard.press(throwKey);
      await page.waitForFunction(() =>
        qaScene.ninja.projectiles.some((shot) => shot.active),
      );
    }
    assert.equal(new Set(counts).size, 1);
    runtime.cleanup = counts;
  }
  assert.deepEqual(errors, []);
  await page.close();
  results.push({
    label,
    rate,
    version,
    stage: stage + 1,
    loadMs,
    ...measured,
    ...runtime,
  });
  console.log(JSON.stringify(results.at(-1)));
  await writeFile(report, JSON.stringify(results, null, 2));
}

async function benchmarkExecution() {
  const page = await browser.newPage({ viewport:{ width:839, height:393 }, isMobile:true, hasTouch:true });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate:4 });
  await exposeScene(page);
  await page.addInitScript(() => localStorage.setItem(
    "pixel-adventure.preferences", '{"tutorialSeen":true,"sound":false}',
  ));
  await page.goto(versions.candidate);
  const intervals = [];
  for (let run = 0; run < 5; run++) {
    await page.locator("#play-game").click();
    await page.waitForFunction(() => qaScene?.player?.body?.blocked.down);
    // Controlled starts isolate the finisher workload from the combat-input campaign.
    await page.evaluate(() => {
      qaScene.player.body.reset(qaScene.enemies.getChildren()[0].x - 36, 184);
      qaScene.moveCamera(1);
    });
    const capture = page.evaluate(() => new Promise(resolve => {
      const values = [];
      let previous;
      function sample(now) {
        if (qaScene.ninja.special?.kind === "execution") {
          if (previous !== undefined) values.push(now - previous);
          previous = now;
        } else if (previous !== undefined) {
          resolve(values);
          return;
        }
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
      setTimeout(() => resolve(values), 2000);
    }));
    await page.keyboard.press("KeyF");
    const runFrames = await capture;
    assert(runFrames.length > 12, "The test did not record a complete Execution");
    intervals.push(...runFrames);
    await page.locator("#pause-button").click();
    await page.locator("#pause-main").click();
  }
  intervals.sort((a, b) => a - b);
  const percentile = fraction => intervals[Math.floor((intervals.length - 1) * fraction)];
  const result = {
    label:"Execution, phone emulation at 4× CPU slowdown",
    repetitions:5,
    frames:intervals.length,
    medianFps:+(1000 / percentile(.5)).toFixed(1),
    p95:+percentile(.95).toFixed(1),
    p99:+percentile(.99).toFixed(1),
    lowFps:+(1000 / percentile(.99)).toFixed(1),
    long:intervals.filter(interval => interval >= 50).length,
  };
  await writeFile(resolve(outputDirectory, "execution-performance.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  await page.close();
}

async function benchmarkSurvival() {
  const results = [];
  for (const rate of [1,4]) {
    const page = await browser.newPage({ viewport:{width:839,height:393}, isMobile:true, hasTouch:true });
    const cdp = await page.context().newCDPSession(page);
    if (rate > 1) await cdp.send("Emulation.setCPUThrottlingRate",{rate});
    await exposeScene(page);
    await page.goto(versions.candidate);
    await page.locator("#survival-button").click();
    await page.waitForFunction(() => qaScene.survival && qaScene.player.body.blocked.down);
    // Controlled six-enemy workload. The separate Survival playthrough advances by defeating waves.
    await page.evaluate(() => { const {run}=qaScene.survival; run.wave=10; run.until=0; });
    await page.waitForFunction(() => qaScene.enemies.getChildren().filter(enemy=>enemy.active).length === 6);
    const capture = page.evaluate(() => new Promise(resolve => {
      const intervals = [];
      let from,previous;
      let peakEnemyProjectiles = 0, peakPlayerProjectiles = 0;
      function frame(now) {
        from ??= now;
        if (previous !== undefined) intervals.push(now-previous);
        previous = now;
        peakEnemyProjectiles = Math.max(peakEnemyProjectiles,qaScene.projectilePool.length);
        peakPlayerProjectiles = Math.max(peakPlayerProjectiles,qaScene.ninja.projectiles.length);
        if (now-from<4900) return requestAnimationFrame(frame);
        intervals.sort((a,b)=>a-b);
        const pct = fraction => intervals[Math.floor((intervals.length-1)*fraction)];
        resolve({ fps:+(1000*intervals.length/(now-from)).toFixed(1), medianFps:+(1000/pct(.5)).toFixed(1),
          p95:+pct(.95).toFixed(1), p99:+pct(.99).toFixed(1), long:intervals.filter(x=>x>=50).length,
          pooledEnemies:qaScene.enemies.getChildren().length, peakEnemyProjectiles,peakPlayerProjectiles });
      }
      requestAnimationFrame(frame);
    }));
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(615);
    await page.keyboard.up("KeyD");
    await page.keyboard.press("KeyV");
    await page.waitForTimeout(550);
    await page.keyboard.press("KeyF");
    await page.waitForTimeout(700);
    await page.keyboard.press("KeyC");
    const sample = { rate, ...await capture };
    assert.equal(sample.pooledEnemies,9);
    assert(sample.peakEnemyProjectiles<=24);
    results.push(sample);
    console.log(JSON.stringify(sample));
    await page.close();
  }
  await writeFile(resolve(outputDirectory,"survival-performance.json"),JSON.stringify(results,null,2));
}

try {
  const phone = {
    viewport: { width: 839, height: 393 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  };
  if (process.env.PIXEL_SURVIVAL_BENCH) await benchmarkSurvival();
  else if (process.env.PIXEL_EXECUTION_BENCH) await benchmarkExecution();
  else for (const [label, options, rate] of [
    ["desktop", { viewport: { width: 1200, height: 850 } }, 1],
    ["phone emulation", phone, 1],
    ["phone emulation throttled", phone, 4],
  ])
    for (const version of ["prototype", "candidate"])
      for (const stage of version==='candidate'?[0,29,59]:[0,29])
        await benchmark(label, options, rate, version, stage);
} finally {
  await browser.close();
}
