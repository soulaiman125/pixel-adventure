import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const only =
  process.env.PIXEL_LEVELS?.split(",").map(Number) ??
  Array.from({ length: 60 }, (_, i) => i + 1);
const browser = await chromium.launch({
  channel: "msedge",
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
  ],
});
const results = [];
const sequential = process.env.PIXEL_SEQUENCE !== "0";
const mode = process.env.PIXEL_MODE;
const runId = process.env.PIXEL_RUN_ID ?? (sequential ? "sequential" : only[0]);
const reportPath = resolve(process.env.PIXEL_REPORT || `artifacts/campaign-${runId}.json`);
await mkdir(dirname(reportPath), {recursive:true});
async function startRecording(page) {
  await page.evaluate(() => {
    window.qaRecording = new Promise((resolve) => {
      const stream = document.querySelector("canvas").captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8",
        videoBitsPerSecond: 1400000,
      });
      const chunks = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = () => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(new Blob(chunks, { type: "video/webm" }));
        stream.getTracks().forEach((track) => track.stop());
      };
      window.qaStopRecording = () => recorder.stop();
      recorder.start();
    });
  });
}
const bridgeRoutes = {
  4: [[329], [710], []],
  5: [[319], [758], [1184], [1569]],
  6: [[344], [697], [1070]],
  7: [[369], [806], [1224]],
  8: [[414], [792], [1183], [1591]],
  9: [[322], [706]],
  10: [[383], [823], [1233]],
  11: [
    [295, 361],
    [721, 793],
    [1178, 1249],
    [1587, 1656],
    [1973, 2041],
  ],
  12: [[387, 444], [842, 925], [1339, 1410], [1770]],
  13: [[323], [689]],
  14: [[389], [806], [1215]],
  15: [
    [410, 474],
    [871, 931],
    [1323, 1380],
  ],
  16: [[392, 482], [859, 920], [1286, 1355], [1746]],
  17: [[350], [776], [1182]],
  18: [[387, 445], [835, 906], [1317]],
  19: [[390, 452], [829, 893], [1290, 1375], [1760]],
  20: [[360, 424], [801, 869], [1248]],
  21: [[358], [775]],
  22: [[345, 406], [784, 850], [1190]],
  23: [[363, 436], [812, 881], [1272]],
  24: [[373, 435], [836, 904], [1304, 1374], [1778]],
  25: [[340], [754]],
  26: [[381, 450], [801, 850], [1252]],
  27: [
    [376, 440],
    [831, 901],
    [1297, 1361],
  ],
  28: [[382, 443], [824, 895], [1263, 1331], [1720]],
  29: [
    [392, 463],
    [865, 936],
    [1357, 1432],
    [1825, 1893],
  ],
  30: [[359, 427], [814, 880], [1292]],
};
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 850 },
  });
  const failures = [];
  page.on("pageerror", (e) => failures.push(e.message));
  await page.route(
    (url) => url.pathname === "/src/main.js",
    async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        status: response.status(),
        contentType: "application/javascript",
        body: (await response.text()) + "\nwindow.qaScene=scene;",
      });
    },
  );
  await page.route(
    (url) => /\/assets\/index-[\w-]+\.js$/.test(url.pathname),
    async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      const scene = body.match(
        /scene:\[new [\w$]+\([^)]*\),([\w$]+)\]\}\)/,
      )?.[1];
      assert(scene, "Locate the scene instance in the production bundle");
      await route.fulfill({
        response,
        body: body + "\nwindow.qaScene=" + scene + ";",
      });
    },
  );
  // Read-only scene inspection and pure hazard prediction. Player input is the
  // only way this runner changes gameplay state.
  await page.route(
    (url) => /^\/src\/game\/(danger|monster-ai)\.js$/.test(url.pathname),
    async (route) => {
      await route.fulfill({
        contentType: "application/javascript",
        body: await readFile(
          new URL(
            "../" + new URL(route.request().url()).pathname.slice(1),
            import.meta.url,
          ),
          "utf8",
        ),
      });
    },
  );
  // Select a stage for an independent attempt. The save changes access only.
  await page.addInitScript(() => {
    localStorage.setItem("pixel-adventure.preferences", '{"sound":false}');
  });
  if (!sequential)
    await page.addInitScript(() => {
      const records = Array.from({ length: 60 }, () => ({
        coins: 0,
        elapsed: 70000,
      }));
      localStorage.setItem(
        "pixel-adventure.progress",
        JSON.stringify({ version: 2, unlocked: 60, records }),
      );
    });
  await page.goto(process.env.PIXEL_TEST_URL || "http://127.0.0.1:5173/");
  await page.locator("canvas").waitFor();
  if(process.env.PIXEL_HERO && process.env.PIXEL_HERO!=='shadow'){
    await page.locator('#legends-button').click();
    await page.getByRole('button',{name:'Choose Hero',exact:true}).click();
    await page.locator('[data-legend-hero="'+process.env.PIXEL_HERO+'"]').click();
    await page.locator('#legend-select').click();
    await page.getByRole('button',{name:'Close Legends'}).click();
  }
  if (sequential) {
    await page.locator("#play-game").click();
    await page.locator("#tutorial-done").click();
  }
  for (const level of only) {
    if (!sequential && (mode !== "rush" || level === only[0])) {
      if (mode) {
        await page.locator("#challenge-button").click();
        await page.locator("#challenge-mode").selectOption(mode);
        if (mode !== "rush")
          await page
            .locator("#challenge-stage")
            .selectOption(String(level - 1));
        await page.locator("#challenge-start").click();
      } else {
        await page.locator("#level-select").click();
        await page.locator(`[data-level="${level - 1}"]`).click();
      }
      if (await page.locator("#help-dialog").isVisible())
        await page.locator("#tutorial-done").click();
    }
    let outcome;
    const attempts = sequential ? 3 : 1;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      await page.waitForFunction(
        (level) =>
          window.qaScene?.sys.isActive() &&
          !qaScene.complete &&
          Number(document.querySelector("#hud-level-number").textContent) ===
            level,
        level,
      );
      if (process.env.PIXEL_RECORD_DIR) await startRecording(page);
      outcome = await page.evaluate(
        (await import("./player-controller.mjs")).default,
        {
          level,
          bridges: level===10&&process.env.PIXEL_HERO==='ranger'
            ? [bridgeRoutes[level][0],bridgeRoutes[level][1],[]] : bridgeRoutes[level] ?? await page.evaluate(()=>qaScene.level.routes ?? []),
          timeout: Number(process.env.PIXEL_LIMIT || 60000),
          dash: process.env.PIXEL_USE_DASH === "1",
        },
      );
      if (process.env.PIXEL_RECORD_DIR) {
        const base64 = await page.evaluate(() => {
          qaStopRecording();
          return qaRecording;
        });
        await writeFile(
          resolve(
            process.env.PIXEL_RECORD_DIR,
            `level-${level}-attempt-${attempt}.webm`,
          ),
          Buffer.from(base64, "base64"),
        );
        await page.screenshot({
          path: resolve(
            process.env.PIXEL_RECORD_DIR,
            `level-${level}-complete.png`,
          ),
        });
      }
      if (outcome.status === "Completed" && [20,25,30,36,42,48,54,60].includes(level)) {
        assert.deepEqual(
          await page.evaluate(() => [qaScene.boss.hp, qaScene.boss.phase]),
          [0, "defeated"],
        );
        const expected = {
          20: ["wave", "sigils", "crownfall"],
          25: ["spores", "venom", "bloom"],
          30: ["wave", "bolts", "impact"],
          36: ["phantomFeint","ghostEdge","lanternSeal"],
          42: ["tidalCrush","undertow","pressureSeal"],
          48: ["dragonBolt","stormBreath","eyeStrike"],
          54: ["gridLock","bladeRelay","shieldOverload"],
          60: ["swordMastery","shadowDominion","eclipseAscension"],
        };
        assert.deepEqual(
          [...outcome.bossPatterns].sort(),
          expected[level].sort(),
        );
      }
      results.push({ ...outcome, attempt });
      console.log(
        JSON.stringify({
          ...outcome,
          attempt,
          events:
            outcome.status === "Completed"
              ? undefined
              : outcome.events.slice(-32),
        }),
      );
      await writeFile(
        reportPath,
        JSON.stringify(results, null, 2),
      );
      if (outcome.status === "Completed") {
        if (process.env.PIXEL_REPORT) {
          await page.context().storageState({
            path: resolve(process.env.PIXEL_REPORT + ".storage.json"),
          });
        }
        const deaths =
          mode === "rush"
            ? results.reduce((sum, row) => sum + row.deaths, 0)
            : outcome.deaths;
        assert.equal(
          Number(await page.locator("#result-deaths").textContent()),
          deaths,
        );
        assert.equal(
          await page.locator("#result-coins").textContent(),
          `${outcome.coins} / ${outcome.total}`,
        );
        break;
      }
      if (attempt < attempts) {
        await page.keyboard.press("Escape");
        await page.locator("#restart-level").click();
        await page.waitForFunction(() => qaScene.elapsed < 600);
      }
    }
    if (outcome.status === "Completed") {
      if (sequential) {
        if (level === 60) {
          await page.locator("#view-victory").click();
          assert(await page.locator("#victory-dialog").isVisible());
          assert.deepEqual(
            results
              .filter((row) => row.status === "Completed")
              .map((row) => row.level),
            only,
          );
          const cleared = results.filter((row) => row.status === "Completed");
          const expected = cleared.reduce(
            (sum, row) => ({
              coins: sum.coins + row.coins,
              total: sum.total + row.total,
              deaths: sum.deaths + row.deaths,
              time: sum.time + row.time,
            }),
            { coins: 0, total: 0, deaths: 0, time: 0 },
          );
          assert.equal(
            await page.locator("#victory-coins").textContent(),
            `${expected.coins} / ${expected.total}`,
          );
          assert.equal(
            Number(await page.locator("#victory-deaths").textContent()),
            expected.deaths,
          );
          console.log(
            "Fresh-save campaign reached Victory",
            JSON.stringify(expected),
          );
        } else await page.locator("#next-level").click();
      } else if (mode === "rush" && level !== only.at(-1))
        await page.locator("#next-level").click();
      else await page.locator("#clear-main").click();
    } else {
      if (sequential) break;
      await page.keyboard.press("Escape");
      await page.locator("#pause-main").click();
    }
  }
  assert.deepEqual(failures, []);
  assert.deepEqual(
    [
      ...new Set(
        results
          .filter((row) => row.status === "Completed")
          .map((row) => row.level),
      ),
    ],
    only,
    "Every requested stage must complete through the input controller",
  );
} finally {
  await browser.close();
}
