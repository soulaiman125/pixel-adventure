import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import controller from "./player-controller.mjs";
import { resolve } from "node:path";
const outputDirectory = resolve(process.env.PIXEL_REVIEW_DIR || "artifacts/ninja-review");
await mkdir(outputDirectory, {recursive:true});
const out = (name) => resolve(outputDirectory, name);
const browser = await chromium.launch({
  channel: "msedge",
  args: ["--disable-background-timer-throttling"],
});
const report = { tests: [], compat: [], performance: [] };
const sleep = (page, time) => page.waitForTimeout(time);
async function open(choice, options = {}) {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 850 },
    ...options,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => {
    if (!request.failure()?.errorText?.includes("ERR_ABORTED"))
      errors.push(request.url());
  });
  await page.route(
    (url) => url.pathname === "/src/main.js",
    async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body: (await response.text()) + "\nwindow.qaScene = scene;",
      });
    },
  );
  await page.addInitScript(() => {
    localStorage.setItem(
      "pixel-adventure.preferences",
      '{"tutorialSeen":true,"sound":false}',
    );
    localStorage.setItem(
      "pixel-adventure.progress",
      '{"version":2,"unlocked":1,"records":[]}',
    );
  });
  await page.goto(
    "http://127.0.0.1:5173/" + (choice ? "?shadow=" + choice : "?hero=legacy"),
  );
  await page.locator("canvas").waitFor();
  await page.locator(choice ? "#shadow-play" : "#play-game").click();
  await page.waitForFunction(
    () => qaScene?.sys.isActive() && qaScene.player?.body.blocked.down,
    null,
    { timeout: 10000 },
  );
  return { page, errors };
}
const state = (page) =>
  page.evaluate(() => {
    const s = qaScene;
    const n = s.ninja;
    return {
      x: s.player.x,
      y: s.player.y,
      vx: s.player.body.velocity.x,
      vy: s.player.body.velocity.y,
      grounded: s.player.body.blocked.down,
      right: s.player.body.blocked.right,
      elapsed: s.elapsed,
      deaths: s.deaths,
      airUsed: n?.airUsed,
      dash: n?.dash?.air === true ? "air" : n?.dash ? "ground" : null,
      charges: n?.charges,
      projectiles: n?.projectiles.filter((p) => p.active).length,
      dummy: document.querySelector("#shadow-debug")?.dataset.dummy,
    };
  });
const wait = (page, callback, arg) =>
  page.waitForFunction(callback, arg, { timeout: 5000 });
async function key(page, code) {
  await page.keyboard.press(code);
}
async function place(page, x, y = 184) {
  await page.evaluate(
    ([x, y]) => {
      qaScene.player.body.reset(x, y);
      qaScene.moveCamera(1);
    },
    [x, y],
  );
}
async function shot(page, name) {
  await page.screenshot({ path: out(name) });
}
const recordings = new WeakMap();
async function record(page) {
  const session = await page.context().newCDPSession(page);
  const frames = [];
  recordings.set(page, { session, frames });
  session.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    if (Number.isFinite(metadata.timestamp)) {
      frames.push({ data: Buffer.from(data, "base64"), time: metadata.timestamp });
    }
    session.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await session.send("Page.startScreencast", { format:"jpeg", quality:85 });
  await sleep(page, 160);
}
async function stop(page, file) {
  const { session, frames } = recordings.get(page);
  await sleep(page, 300);
  await session.send("Page.stopScreencast");
  await session.detach();
  assert(frames.length > 4, "Screen capture did not produce enough frames");
  const origin = frames[0].time;
  const fps = 24;
  const count = Math.round((frames.at(-1).time - origin) * fps);
  const sequence = [];
  let index = 0;
  for (let frame = 0; frame <= count; frame++) {
    while (index + 1 < frames.length && frames[index + 1].time - origin <= frame / fps) index++;
    sequence.push(frames[index].data);
  }
  const encoder = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-f", "mjpeg",
    "-framerate", String(fps), "-i", "pipe:0", "-an", "-c:v", "libvpx",
    "-pix_fmt", "yuv420p", "-b:v", "1250k", out(file),
  ], { windowsHide:true, stdio:["pipe", "ignore", "inherit"] });
  await new Promise((resolve, reject) => {
    encoder.once("error", reject);
    encoder.once("exit", code => code === 0 ? resolve() : reject(new Error("ffmpeg exited " + code)));
    encoder.stdin.on("error", reject);
    encoder.stdin.end(Buffer.concat(sequence));
  });
  recordings.delete(page);
}
async function finish({ page, errors }) {
  assert.deepEqual(errors, []);
  await page.close();
}
async function exportArt(page) {
  const data = await page.evaluate(() => {
    const s = qaScene,
      tex = s.textures.get("shadow-ninja"),
      names = tex.getFrameNames();
    const source = tex.getSourceImage();
    const collect = new Map();
    for (const name of names) {
      const match = name.match(/^(.*)(\d)$/);
      const label = match[1];
      if (!collect.has(label)) collect.set(label, []);
      const frame = tex.get(name);
      collect.get(label).push([frame.cutX, frame.cutY]);
    }
    const canvas = document.createElement("canvas");
    canvas.width = 160 + 8 * 112;
    canvas.height = 72 + collect.size * 85;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#141d2c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 22px monospace";
    ctx.fillStyle = "#f6eaf0";
    ctx.fillText("SHADOW NINJA / FRAME SHEETS", 16, 37);
    let row = 0;
    for (const [clip, frames] of collect) {
      const y = 60 + row * 85;
      ctx.fillStyle = row % 2 ? "#202638" : "#263149";
      ctx.fillRect(12, y, canvas.width - 24, 83);
      ctx.fillStyle = "#fcdee3";
      ctx.font = "15px monospace";
      ctx.fillText(clip, 22, y + 43);
      frames.forEach(([x, top], i) =>
        ctx.drawImage(source, x, top, 112, 80, 155 + i * 112, y, 112, 80),
      );
      row++;
    }
    const stand = document.createElement("canvas");
    stand.width = 112;
    stand.height = 80;
    const idle = tex.get("idle0");
    stand
      .getContext("2d")
      .drawImage(source, idle.cutX, idle.cutY, 112, 80, 0, 0, 112, 80);
    return {
      atlas: source.toDataURL().split(",")[1],
      sheet: canvas.toDataURL().split(",")[1],
      portrait: stand.toDataURL().split(",")[1],
      width: source.width,
      height: source.height,
      clips: Object.fromEntries(collect),
    };
  });
  await writeFile(out("ninja-atlas.png"), Buffer.from(data.atlas, "base64"));
  await writeFile(
    out("ninja-portrait.png"),
    Buffer.from(data.portrait, "base64"),
  );
  await writeFile(
    out("ninja-sprite-sheet.png"),
    Buffer.from(data.sheet, "base64"),
  );
  const { atlas, portrait, sheet, ...meta } = data;
  await writeFile(out("atlas.json"), JSON.stringify(meta, null, 2));
  report.atlas = {
    width: data.width,
    height: data.height,
    mib: (data.width * data.height * 4) / 1048576,
    frames: Object.values(data.clips).flat().length,
  };
}

async function arena() {
  const run = await open("arena");
  const { page } = run;
  await exportArt(page);
  const begin = await state(page);
  await key(page, "KeyZ");
  await wait(page, () => qaScene.ninja.dash && !qaScene.ninja.dash.air);
  await wait(page, () => !qaScene.ninja.dash);
  const end = await state(page);
  assert(
    end.x - begin.x >= 32 && end.x - begin.x <= 47,
    JSON.stringify({ begin, end }),
  );
  await key(page, "KeyZ");
  await sleep(page, 40);
  assert.equal((await state(page)).dash, null);
  report.tests.push(
    "Ground dash travel " +
      (end.x - begin.x).toFixed(1) +
      " world px and cooldown",
  );

  await page.keyboard.down("Space");
  await wait(page, () => qaScene.player.body.velocity.y < -200);
  await page.keyboard.up("Space");
  await sleep(page, 85);
  const rising = await state(page);
  await key(page, "Space");
  const repeated = await state(page);
  assert(repeated.vy >= rising.vy - 5, "Double jump relaunched the player");
  await key(page, "KeyZ");
  await wait(page, () => qaScene.ninja.dash?.air);
  await wait(
    page,
    () => !qaScene.ninja.dash && !qaScene.player.body.blocked.down,
  );
  await key(page, "KeyZ");
  await sleep(page, 40);
  assert.equal((await state(page)).dash, null);
  assert.equal((await state(page)).airUsed, true);
  await wait(
    page,
    () => !qaScene.ninja.airUsed && qaScene.player.body.blocked.down,
  );
  await page.keyboard.down("Space");
  await wait(page, () => qaScene.player.body.velocity.y < -195);
  await key(page, "KeyZ");
  await wait(page, () => qaScene.ninja.dash?.air);
  await page.keyboard.up("Space");
  await wait(page, () => qaScene.player.body.blocked.down);
  report.tests.push(
    "Normal jump, no double jump, one air dash, valid landing reset",
  );

  await place(page, 193);
  await sleep(page, 80);
  await record(page);
  await key(page, "KeyX");
  await wait(page, () => qaScene.ninja.attack?.index === 0);
  await wait(
    page,
    () =>
      qaScene.ninja.attack &&
      qaScene.elapsed - qaScene.ninja.attack.since >= 103,
  );
  await key(page, "KeyX");
  await wait(page, () => qaScene.ninja.attack?.index === 1);
  await wait(
    page,
    () =>
      qaScene.ninja.attack &&
      qaScene.elapsed - qaScene.ninja.attack.since >= 129,
  );
  await key(page, "KeyX");
  await wait(page, () => qaScene.ninja.attack?.index === 2);
  await wait(
    page,
    () => document.querySelector("#shadow-debug").dataset.dummy === "0/40",
  );
  await wait(page, () => !qaScene.ninja.attack);
  report.tests.push(
    "All three katana strikes buffered and hit one time each with 10/12/20 damage",
  );
  await place(page, 135);
  await sleep(page, 160);
  for (let i = 0; i < 3; i++) {
    await key(page, "KeyC");
    await wait(page, (i) => qaScene.ninja.charges === 2 - i, i);
    await wait(page, () => qaScene.ninja.projectiles.some((p) => p.active));
    await wait(page, () => !qaScene.ninja.throw);
  }
  await key(page, "KeyC");
  await sleep(page, 85);
  assert.equal((await state(page)).charges, 0);
  assert.equal(await page.evaluate(() => !!qaScene.ninja.throw), false);
  await wait(page, () => qaScene.ninja.charges === 1);
  assert.equal((await state(page)).dummy, "16/40");
  report.tests.push(
    "Three shuriken charges, fourth rejected, sequential refill, dummy damaged once per throw",
  );

  await place(page, 700);
  await key(page, "KeyZ");
  await wait(page, () => qaScene.ninja.dash);
  await wait(page, () => !qaScene.ninja.dash);
  assert((await state(page)).x < 740, "Dash crossed the solid wall");
  await place(page, 695);
  await key(page, "KeyC");
  await wait(page, () => qaScene.ninja.projectiles.some((p) => p.active));
  await wait(page, () => qaScene.ninja.projectiles.every((p) => !p.active));
  const wallImpact = await page.evaluate(() => qaScene.ninja.lastHit?.x);
  assert(wallImpact >= 735 && wallImpact <= 740, wallImpact);
  report.tests.push("Wall blocks dash and swept shuriken");
  await wait(page, () => !qaScene.ninja.throw);
  await place(page, 70);
  await page.keyboard.down("Space");
  await wait(page, () => qaScene.player.body.velocity.y < -170);
  await key(page, "KeyZ");
  await wait(page, () => qaScene.ninja.dash?.air);
  await page.keyboard.up("Space");
  await wait(page, () => !qaScene.ninja.dash);
  await sleep(page, 250);
  await stop(page, "ninja-desktop.webm");

  await key(page, "Escape");
  assert(await page.locator("#pause-dialog").isVisible());
  const paused = await state(page);
  await sleep(page, 100);
  assert.equal((await state(page)).elapsed, paused.elapsed);
  await key(page, "Escape");
  await wait(page, () => !document.querySelector("#pause-dialog").open);
  await wait(page, () => {
    const time = qaScene.elapsed % 3200;
    return time >= 970 && time < 1300 && qaScene.elapsed > qaScene.invulnerableUntil;
  });
  await place(page, 934);
  const deaths = (await state(page)).deaths;
  await page.keyboard.down("KeyD");
  await key(page, "KeyZ");
  await page.keyboard.up("KeyD");
  await wait(page, (deaths) => qaScene.deaths > deaths, deaths);
  const respawn = await state(page);
  assert.equal(respawn.dash, null);
  assert(respawn.x < 100);
  await wait(
    page,
    () => !qaScene.ninja.airUsed && qaScene.player.body.blocked.down,
  );
  report.tests.push(
    "Pause freezes simulation; active laser ends dash and respawns at checkpoint",
  );
  await key(page, "KeyC");
  await wait(page, () => qaScene.ninja.projectiles.some((p) => p.active));
  await key(page, "Escape");
  await page.locator("#pause-main").click();
  await page.locator("#shadow-play").click();
  await wait(page, () => qaScene.ninja && qaScene.elapsed < 800);
  assert.equal((await state(page)).projectiles, 0);
  assert.equal((await state(page)).charges, 3);
  report.tests.push(
    "Arena scene transition clears projectiles and restores starting loadout",
  );
  await finish(run);
}

async function comparisons() {
  for (const [name, opts] of [
    ["desktop", {}],
    [
      "mobile",
      {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1,
      },
    ],
  ]) {
    for (const look of ["before", "after"]) {
      const run = await open(look === "after" ? "verdant" : null, opts);
      const { page } = run;
      await page.evaluate(() => {
        const scene = qaScene;
        scene.physics.pause();
        scene.elapsed = 500;
        scene.landUntil = -1;
        scene.visualPose = "idle";
        scene.player.body.reset(248, 184);
        scene.cameras.main.setScroll(205, 0);
        scene.backdrop.scroll(205, 180, 0);
        scene.moveCamera = () => {};
        scene.update = () => {};
      });
      await sleep(page, 300);
      await shot(page, name + "-" + look + ".png");
      await finish(run);
    }
  }
  report.tests.push(
    "Matched desktop and mobile captures at player x248, camera x205",
  );
}

async function campaign() {
  const run = await open("verdant");
  const { page } = run;
  const save = await page.evaluate(() =>
    localStorage.getItem("pixel-adventure.progress"),
  );
  const result = await page.evaluate(controller, {
    level: 1,
    bridges: [],
    timeout: 50000,
  });
  assert.equal(result.status, "Completed", JSON.stringify(result));
  assert.equal(
    await page.locator("#clear-title").textContent(),
    "Prototype Complete",
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("pixel-adventure.progress")),
    save,
  );
  const { events, ...summary } = result;
  report.verdant = summary;
  await finish(run);
}

async function mobile() {
  const run = await open("arena", {
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const { page } = run;
  const cdp = await page.context().newCDPSession(page);
  const positions = {};
  for (const [i, action] of [
    "left",
    "right",
    "jump",
    "dash",
    "throw",
    "attack",
    "sprint",
  ].entries()) {
    const rect = await page
      .locator("[data-action=" + action + "]")
      .boundingBox();
    assert(rect.width >= 44 && rect.height >= 44);
    positions[action] = {
      x: Math.floor(rect.x + rect.width / 2),
      y: Math.floor(rect.y + rect.height / 2),
      id: i + 1,
    };
  }
  const touch = (type, names) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: names.map((name) => positions[name]),
    });
  await record(page);
  await touch("touchStart", ["right"]);
  await wait(page, () => qaScene.player.body.velocity.x > 25);
  await touch("touchStart", ["right", "jump"]);
  await wait(page, () => qaScene.player.body.velocity.y < -120);
  await touch("touchStart", ["right", "jump", "dash"]);
  await wait(page, () => qaScene.ninja.dash?.air);
  await touch("touchStart", ["right", "jump", "dash", "sprint"]);
  const sprintButton = page.locator("[data-action=sprint]");
  await wait(page, () => document.querySelector("[data-action=sprint]").hasAttribute("data-pressed"));
  await shot(page, "mobile-touch.png");
  await touch("touchEnd", []);
  assert.equal(await sprintButton.getAttribute("data-pressed"), null);
  await wait(
    page,
    () => !qaScene.ninja.dash && qaScene.player.body.blocked.down,
  );
  await wait(page, () => Math.abs(qaScene.player.body.velocity.x) < 1);
  await page.locator("[data-action=throw]").tap();
  await wait(page, () => qaScene.ninja.charges === 2);
  await wait(page, () => !qaScene.ninja.throw);
  await page.locator("[data-action=attack]").tap();
  await wait(page, () => qaScene.ninja.attack);
  assert(
    await page
      .locator("html")
      .evaluate((node) => node.classList.contains("reduce-motion")),
  );
  await sleep(page, 250);
  await stop(page, "ninja-mobile.webm");
  await wait(page, () => !qaScene.ninja.attack && qaScene.player.body.blocked.down);
  await touch("touchStart", ["right", "jump"]);
  await wait(page, () => !qaScene.player.body.blocked.down && qaScene.player.body.velocity.y < -120);
  await touch("touchStart", ["right", "jump", "attack"]);
  await wait(page, () => qaScene.ninja.attack?.air && qaScene.player.body.velocity.x > 0);
  await touch("touchEnd", []);
  await wait(page, () => qaScene.player.body.blocked.down);
  await page.locator("#pause-button").tap();
  await page.locator("#pause-settings").tap();
  await page.locator("#sprint-toggle").check();
  await page.locator("#touch-left-handed").check();
  await page.locator("#touch-size").selectOption("large");
  await page
    .locator("#settings-dialog")
    .getByRole("button", { name: "Done" })
    .tap();
  await page.locator("#resume").tap();
  await sprintButton.tap();
  await wait(page, () => document.querySelector("[data-action=sprint]").getAttribute("aria-pressed") === "true");
  await sprintButton.tap();
  await wait(page, () => document.querySelector("[data-action=sprint]").getAttribute("aria-pressed") === "false");
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [568, 320],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await sleep(page, 150);
    const checked = await page.evaluate(() => {
      const [movement, actions] = [
        ...document.querySelectorAll(".touch-direction,.touch-actions"),
      ].map((n) => n.getBoundingClientRect());
      const buttons = [...document.querySelectorAll(".touch-button")].map(
        (node) => node.getBoundingClientRect(),
      );
      return {
        handed: actions.right <= movement.left,
        targets: buttons.every(
          (b) =>
            b.width >= 44 &&
            b.height >= 44 &&
            b.left >= 0 &&
            b.right <= innerWidth &&
            b.bottom <= innerHeight,
        ),
      };
    });
    assert.deepEqual(
      checked,
      { handed: true, targets: true },
      width + "x" + height,
    );
  }
  report.tests.push(
    "Left-handed layout and large touch targets stay inside four emulated viewports",
  );
  report.tests.push(
    "Emulated landscape four-finger move/jump/dash/sprint, airborne move/jump/Katana, separate throw/attack, sprint toggle, control release, reduced motion and 44px targets",
  );
  await place(page, 199);
  await page.locator("[data-action=cyclone]").tap();
  await wait(page, () => qaScene.ninja.special?.kind === "cyclone" && qaScene.ninja.energy === 30);
  await wait(page, () => !qaScene.ninja.special);
  await page.locator("#pause-button").tap();
  await page.locator("#restart-level").tap();
  await wait(page, () => qaScene.ninja.energy === 60 && qaScene.player.body.blocked.down);
  await place(page, 183);
  await page.locator("[data-action=execution]").tap();
  await wait(page, () => qaScene.ninja.special?.hit[2].size === 1 && qaScene.ninja.energy === 0);
  report.tests.push("Cyclone and Execution touch buttons invoke their actives and spend Energy");
  await finish(run);
}

async function techniques() {
  let run=await open('arena');
  let {page}=run;
  await exportArt(page);
  await record(page);
  await page.keyboard.down('KeyD');
  await page.keyboard.down('ShiftLeft');
  await wait(page,()=>qaScene.ninja.sprint && qaScene.player.body.velocity.x>165);
  await page.keyboard.up('ShiftLeft');
  await wait(page,()=>qaScene.player.body.velocity.x<=132);
  await page.keyboard.up('KeyD');
  await key(page,'KeyF');
  assert.equal(await page.evaluate(()=>qaScene.ninja.energy),60,'A missed Execution cannot spend Energy');
  await place(page,183);
  await page.keyboard.down('KeyX');
  await wait(page,()=>qaScene.ninja.charging);
  await page.keyboard.up('KeyX');
  await wait(page,()=>qaScene.ninja.projectiles.some(shot=>shot.active&&shot.kind==='charged'));
  await wait(page,()=>!qaScene.ninja.special);
  await place(page,183);
  await key(page,'KeyF');
  await wait(page,()=>qaScene.ninja.special?.kind==='execution');
  const origin=await page.evaluate(()=>qaScene.player.x);
  await wait(page,()=>qaScene.ninja.special?.hit[2].size===1);
  assert(await page.evaluate(origin=>qaScene.player.x>origin && qaScene.player.x<225,origin));
  assert.equal(await page.evaluate(()=>qaScene.ninja.energy),0);
  await wait(page,()=>!qaScene.ninja.special);
  await stop(page,'sprint-charge-execution.webm');
  await page.keyboard.down('KeyX');
  await wait(page,()=>qaScene.ninja.charging);
  await key(page,'Escape');
  assert.equal(await page.evaluate(()=>qaScene.ninja.charging),null);
  await page.keyboard.up('KeyX');
  await finish(run);

  run=await open('arena');
  page=run.page;
  await place(page,199);
  await record(page);
  await key(page,'KeyV');
  await wait(page,()=>qaScene.ninja.special?.kind==='cyclone');
  assert.equal(await page.evaluate(()=>qaScene.ninja.energy),30);
  await wait(page,()=>qaScene.ninja.special?.hit[1].size===1);
  assert.deepEqual(await page.evaluate(()=>qaScene.ninja.special.hit.map(window=>window.size)),[1,1]);
  await wait(page,()=>!qaScene.ninja.special);
  await stop(page,'cyclone.webm');
  await place(page,718);
  await page.evaluate(()=>{
    const target=qaScene.enemies.getChildren().find(enemy=>enemy.getData('type')==='guard');
    target.body.reset(766,184);
    qaScene.ninja.energy=60;
    target.setData('exposedUntil',qaScene.elapsed+3000);
  });
  await key(page,'KeyF');
  assert.equal(await page.evaluate(()=>qaScene.ninja.energy),60,'Execution cannot acquire a target through the wall');
  await finish(run);
  report.tests.push('Sprint speed and brake, charge hold and release, pause cancellation, three execution contacts, radial hit limits and invalid-target refunds');
}

async function skillsAndBindings() {
  const run=await open('arena');
  const {page}=run;
  await key(page,'Escape');
  await page.locator('#pause-main').click();
  await page.locator('#skill-tree').click();
  assert.equal(await page.locator('.skill-card li').count(),18);
  await page.locator('#training-controls button').click();
  assert.equal(await page.locator('#skill-points').textContent(),'36');
  await shot(page,'skill-tree.png');
  for(const id of ['katana','shuriken','dash','sprint','cyclone','execution']){
    for(let n=0;n<3;n++)await page.locator('[data-skill="'+id+'"]').click();
  }
  assert.equal(await page.locator('#skill-points').textContent(),'0');
  await page.locator('#skills-dialog [data-close]').click();
  await page.locator('#shadow-play').click();
  await wait(page, () => qaScene.ninja && qaScene.player.body.blocked.down);
  await key(page, 'KeyC');
  await wait(page, () => qaScene.ninja.projectiles.filter(shot => shot.active).length === 3);
  assert.equal(await page.evaluate(() => qaScene.ninja.charges), 0);
  await wait(page, () => !qaScene.ninja.throw);
  await key(page, 'KeyV');
  await wait(page, () => qaScene.ninja.special?.kind === 'cyclone');
  assert.equal(await page.evaluate(() => qaScene.ninja.energy), 36);
  await wait(page, () => !qaScene.ninja.special);
  await key(page, 'KeyZ');
  await wait(page, () => qaScene.ninja.dash && qaScene.elapsed - qaScene.ninja.dash.since >= 43);
  await page.keyboard.down('KeyA');
  await wait(page, () => qaScene.ninja.dash?.reversed && qaScene.player.body.velocity.x < 0);
  await page.keyboard.up('KeyA');
  await key(page, 'Escape');
  await page.locator('#pause-main').click();
  await page.locator('#skill-tree').click();
  await page.locator('#reset-skills').click();
  await page.locator('#confirm-skills').click();
  assert.equal(await page.locator('#skill-points').textContent(),'36');
  await page.locator('#skills-dialog [data-close]').click();
  await page.locator('#settings-button').click();
  await page.locator('.binding-settings summary').click();
  await page.locator('[data-bind="dash"]').click();
  await key(page,'KeyB');
  assert.match(await page.locator('#binding-status').textContent(),/uses B/);
  await page.locator('#settings-dialog').getByRole('button',{name:'Done'}).click();
  await page.locator('#shadow-play').click();
  await wait(page,()=>qaScene.ninja && qaScene.player.body.blocked.down);
  await key(page,'KeyZ');
  assert.equal(await page.evaluate(()=>qaScene.ninja.dash),null);
  await key(page,'KeyB');
  await wait(page,()=>qaScene.ninja.dash);
  await finish(run);
  report.tests.push('All 18 purchases, cost accounting, refund, remapped Dash, live triple Shuriken, discounted Cyclone and Dash reversal');
}

async function campaignTechniques() {
  for (const [name, keyCode, distance] of [
    ['shuriken', 'KeyC', 110], ['charged', 'KeyX', 58],
    ['cyclone', 'KeyV', 33], ['execution', 'KeyF', 48],
  ]) {
    const run = await open('verdant');
    const { page } = run;
    await page.keyboard.down('KeyD');
    await page.keyboard.down('ShiftLeft');
    await wait(page, () => qaScene.ninja.sprint && qaScene.player.body.velocity.x > 165);
    if (name === 'shuriken') {
      await page.keyboard.down('Space');
      await wait(page, () => qaScene.player.body.velocity.y < -180 && qaScene.player.body.velocity.x <= 132);
      await page.keyboard.up('Space');
    }
    await page.keyboard.up('ShiftLeft');
    await wait(page, (limit) => {
      const target = qaScene.enemies.getChildren()[0];
      return qaScene.player.body.blocked.down && target.x - qaScene.player.x <= limit;
    }, distance);
    await page.keyboard.up('KeyD');
    if (name === 'charged') {
      await page.keyboard.down(keyCode);
      await wait(page, () => qaScene.ninja.charging);
      await page.keyboard.up(keyCode);
    } else {
      await key(page, keyCode);
    }
    try {
      await wait(page, () => qaScene.ninja.lastHit?.x > 290);
    } catch (error) {
      const observed = await page.evaluate(() => {
        const { player, deaths, ninja, enemies } = qaScene;
        const target = enemies.getChildren()[0];
        return { player:[player.x, player.y], target:[target.x, target.body.top, target.body.bottom],
          hit:ninja.lastHit, uses:ninja.uses, deaths,
          projectiles:ninja.projectiles.map(({x,y,kind}) => ({x,y,kind})) };
      });
      throw new Error(name + " failed to hit the campaign enemy. " + JSON.stringify(observed), { cause:error });
    }
    assert.equal(await page.evaluate(move => qaScene.ninja.uses[move], name), 1);
    assert.equal(await page.evaluate(() => qaScene.deaths), 0);
    await finish(run);
    report.tests.push(name + ' hit a live Verdant Hills enemy after normal movement from spawn');
  }
}

try {
  for (const fn of [arena, comparisons, campaign, mobile, techniques, skillsAndBindings, campaignTechniques]) {
    if (
      process.env.SHADOW_ONLY &&
      !process.env.SHADOW_ONLY.split(",").includes(fn.name)
    )
      continue;
    await fn();
    console.log(fn.name + " passed");
    await writeFile(
      out("qa-" + fn.name + ".json"),
      JSON.stringify(report, null, 2),
    );
  }
} finally {
  await browser.close();
}
