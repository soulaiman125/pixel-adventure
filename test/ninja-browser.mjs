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
    "http://127.0.0.1:5173/" + (['normal','survival'].includes(choice) ? '' : choice ? "?shadow=" + choice : "?hero=legacy"),
  );
  await page.locator("#enter-adventure").click();
  await page.locator(choice === 'survival' ? '#survival-button' : choice && choice !== 'normal' ? "#shadow-play" : "#play-game").click();
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
      throwReadyAt: n?.readyAt?.throw,
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
    const source = document.createElement("canvas");
    const tileWidth=224,tileHeight=160,atlasColumns=10;
    source.width=tileWidth*atlasColumns;
    source.height=tileHeight*Math.ceil(names.length/atlasColumns);
    const atlasContext=source.getContext("2d");
    let offset=0;
    const collect=new Map(Object.entries(tex.paintedClips??{}).map(([clip,count])=>[
      clip,Array.from({length:count},(_,index)=>{
        const frame=tex.get(clip+index);
        const x=offset%atlasColumns*tileWidth,y=Math.floor(offset/atlasColumns)*tileHeight;
        offset++;
        atlasContext.drawImage(frame.source.image,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,x,y,tileWidth,tileHeight);
        return [x,y,tileWidth,tileHeight];
      }),
    ]));
    if([...collect.values()].flat().length!==names.length)throw Error('Atlas frame coverage');
    const canvas = document.createElement("canvas");
    const columns=Math.max(...Array.from(collect.values(),frames=>frames.length));
    canvas.width = 160 + columns * 112;
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
      frames.forEach(([x,top,width,height],i)=>
        ctx.drawImage(source,x,top,width,height,155+i*112,y,112,80),
      );
      row++;
    }
    const stand = document.createElement("canvas");
    const idle = tex.get('idle0');
    stand.width=idle.cutWidth;
    stand.height=idle.cutHeight;
    stand
      .getContext("2d")
      .drawImage(idle.source.image,idle.cutX,idle.cutY,idle.cutWidth,idle.cutHeight,0,0,stand.width,stand.height);
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
  await key(page, "KeyZ");
  await wait(page, () => qaScene.ninja.dash && !qaScene.ninja.dash.air);
  await wait(page, () => !qaScene.ninja.dash);
  const distance = await page.evaluate(()=>qaScene.ninja.lastDashDistance);
  assert(distance >= 30 && distance <= 48, String(distance));
  await key(page, "KeyZ");
  await sleep(page, 40);
  assert.equal((await state(page)).dash, null);
  report.tests.push(
    "Ground dash travel " +
      distance.toFixed(1) +
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
  const readyToThrow=()=>{
    const {ninja,elapsed,player}=qaScene;
    return player.body.blocked.down && !ninja.attack && !ninja.throw && !ninja.charging && !ninja.dash
      && !ninja.special && !ninja.parry && elapsed>=(ninja.readyAt.throw??0);
  };
  for (let i = 0; i < 4; i++) {
    await wait(page,readyToThrow);
    await key(page, "KeyC");
    await wait(page, (i) => qaScene.ninja.uses.shuriken === i + 1, i);
    await wait(page, () => qaScene.ninja.projectiles.some((p) => p.active));
    await wait(page, () => !qaScene.ninja.throw);
    if (i === 0) {
      await key(page,"KeyC");
      assert.equal(await page.evaluate(()=>qaScene.ninja.uses.shuriken), 1);
    }
    await wait(page, () => qaScene.elapsed >= qaScene.ninja.readyAt.throw);
  }
  await wait(page, () => !qaScene.ninja.projectiles.some(p=>p.active));
  assert.equal((await state(page)).dummy, "8/40");
  report.tests.push(
    "Four Shuriken throws without stock depletion, cooldown rejection, one dummy hit per throw",
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
  assert.equal((await state(page)).throwReadyAt, undefined);
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
  await wait(page, () => qaScene.ninja.uses.shuriken === 1);
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
  await page.locator('#touch-layout').selectOption('defense');
  await page.getByText('Swap touch button positions',{exact:true}).click();
  const before = await page.locator('[data-action=attack]').evaluate(button=>button.style.order);
  await page.locator('#touch-swap-from').selectOption('attack');
  await page.locator('#touch-swap-to').selectOption('dash');
  await page.locator('#touch-swap').click();
  assert.equal(await page.locator('[data-action=dash]').evaluate(button=>button.style.order),before);
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
  await wait(page, () => qaScene.ninja.special?.kind === "cyclone" && qaScene.ninja.readyAt.cyclone > qaScene.elapsed);
  await wait(page, () => !qaScene.ninja.special);
  await page.locator("#pause-button").tap();
  await page.locator("#restart-level").tap();
  await wait(page, () => qaScene.elapsed < 800 && qaScene.player.body.blocked.down);
  await place(page, 183);
  await page.locator("[data-action=execution]").tap();
  await wait(page, () => qaScene.ninja.special?.hit[2].size === 1 && qaScene.ninja.readyAt.execution > qaScene.elapsed);
  report.tests.push("Cyclone and Execution touch buttons invoke their actives and start cooldowns");
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
  await place(page,68);
  const beforeMiss=await page.evaluate(()=>qaScene.elapsed);
  await key(page,'KeyF');
  // Let the gameplay loop consume the missed input before positioning the next probe.
  await wait(page,elapsed=>qaScene.elapsed>=elapsed+70,beforeMiss);
  assert.equal(await page.evaluate(()=>qaScene.ninja.readyAt.execution),undefined,'A missed Execution cannot start cooldown');
  await place(page,183);
  await page.keyboard.down('KeyX');
  await wait(page,()=>qaScene.ninja.charging);
  await page.keyboard.up('KeyX');
  await wait(page,()=>qaScene.ninja.projectiles.some(shot=>shot.active&&shot.kind==='charged'));
  await wait(page,()=>!qaScene.ninja.special);
  // Restart to validate the full Execution sequence on a healthy target.
  await page.locator('#pause-button').click();
  await page.locator('#restart-level').click();
  await wait(page,()=>qaScene.elapsed<800&&qaScene.player.body.blocked.down);
  await place(page,183);
  await key(page,'KeyF');
  await wait(page,()=>qaScene.ninja.special?.kind==='execution');
  const origin=await page.evaluate(()=>qaScene.player.x);
  await wait(page,()=>qaScene.ninja.special?.hit[2].size===1);
  assert(await page.evaluate(origin=>qaScene.player.x>origin && qaScene.player.x<225,origin));
  assert.equal(await page.evaluate(()=>qaScene.ninja.readyAt.execution-qaScene.ninja.special.since),6000);
  await wait(page,()=>!qaScene.ninja.special);
  await stop(page,'sprint-charge-execution.webm');
  await wait(page,()=>qaScene.elapsed>=(qaScene.ninja.readyAt.charged??0));
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
  assert.equal(await page.evaluate(()=>qaScene.ninja.readyAt.cyclone-qaScene.ninja.special.since),3000);
  await wait(page,()=>qaScene.ninja.special?.hit[1].size===1);
  assert.deepEqual(await page.evaluate(()=>qaScene.ninja.special.hit.map(window=>window.size)),[1,1]);
  await wait(page,()=>!qaScene.ninja.special);
  await stop(page,'cyclone.webm');
  await place(page,718);
  await page.evaluate(()=>{
    const target=qaScene.enemies.getChildren().find(enemy=>enemy.getData('type')==='guard');
    target.body.reset(766,184);
    target.setData('exposedUntil',qaScene.elapsed+3000);
  });
  await key(page,'KeyF');
  assert.equal(await page.evaluate(()=>qaScene.ninja.readyAt.execution),undefined,'Execution cannot acquire a target through the wall');
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
    for(let n=0;n<3;n++) {
      await page.locator('[data-skill="'+id+'"]').click();
      await page.locator('#confirm-action').click();
    }
  }
  assert.equal(await page.locator('#skill-points').textContent(),'0');
  await page.locator('#skills-dialog [data-close]').click();
  await page.locator('#shadow-play').click();
  await wait(page, () => qaScene.ninja && qaScene.player.body.blocked.down);
  await key(page, 'KeyC');
  await wait(page, () => qaScene.ninja.projectiles.filter(shot => shot.active).length === 3);
  assert(await page.evaluate(() => qaScene.ninja.readyAt.throw > qaScene.elapsed));
  await wait(page, () => !qaScene.ninja.throw);
  await key(page, 'KeyV');
  await wait(page, () => qaScene.ninja.special?.kind === 'cyclone');
  assert.equal(await page.evaluate(() => qaScene.ninja.readyAt.cyclone - qaScene.ninja.special.since),2500);
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
  await page.getByText('Keyboard controls',{exact:true}).click();
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

async function wallAndAir() {
  const run = await open('arena');
  const { page } = run;
  await record(page);
  await place(page,700,145);
  await page.keyboard.down('KeyD');
  await key(page,'KeyZ');
  await wait(page, () => qaScene.ninja.dash?.air);
  await wait(page, () => qaScene.ninja.wallSlide === 1 && qaScene.player.body.velocity.y <= 70);
  const dashCount = await page.evaluate(()=>qaScene.ninja.uses.dash);
  await page.keyboard.down('Space');
  await wait(page, () => qaScene.ninja.wallJumpUsed && qaScene.player.body.velocity.y < -150 && qaScene.player.body.velocity.x < -40);
  await page.keyboard.up('KeyD');
  await key(page,'KeyZ');
  assert.equal(await page.evaluate(()=>qaScene.ninja.uses.dash),dashCount);
  await page.keyboard.up('Space');
  await page.keyboard.down('KeyS');
  await key(page,'KeyX');
  await wait(page, () => qaScene.ninja.attack?.dive && qaScene.player.body.velocity.y > 175);
  await page.keyboard.up('KeyS');
  await wait(page,()=>qaScene.ninja.diveLandUntil > qaScene.elapsed);
  await stop(page,'wall-and-air.webm');
  await finish(run);
  report.tests.push('Real collision wall slide, kick, spent Air Dash remains spent, downward slash and landing recovery');
}

async function parryAndEnemy() {
  const run = await open('17');
  const { page } = run;
  const target = await page.evaluate(()=>qaScene.enemies.getChildren().find(enemy=>enemy.getData('type')==='shadowRival').x);
  await place(page,target-25);
  await record(page);
  await key(page,'KeyQ');
  await wait(page,()=>qaScene.ninja.parry && Math.abs(qaScene.ninja.readyAt.parry - qaScene.ninja.parry.since - 800) < .1);
  await wait(page,()=>!qaScene.ninja.parry);
  await page.keyboard.down('KeyA');
  await wait(page,()=>qaScene.player.x < qaScene.enemies.getChildren()[0].x - 66);
  await page.keyboard.up('KeyA');
  await wait(page,()=>qaScene.elapsed > qaScene.ninja.readyAt.parry);
  await place(page, await page.evaluate(()=>qaScene.enemies.getChildren()[0].x - 28));
  await page.keyboard.down('KeyD');
  await sleep(page,25);
  await page.keyboard.up('KeyD');
  await page.evaluate(() => new Promise((resolve,reject) => {
    const timeout = performance.now() + 5500;
    function tick() {
      const phase=qaScene.enemies.getChildren()[0].getData('ultimateState');
      const remaining = phase.until-qaScene.elapsed;
      if (phase.phase==='windup' && remaining <= 75 && remaining >= 50) {
        for (const type of ['keydown','keyup']) window.dispatchEvent(new KeyboardEvent(type,{code:'KeyQ',bubbles:true}));
        resolve();
      } else if (performance.now() > timeout) reject(new Error('Expected a telegraphed Rival strike'));
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }));
  await wait(page,()=>qaScene.ninja.uses.parrySuccess === 1);
  await wait(page,()=>qaScene.elapsed-qaScene.ninja.parry?.succeededAt >= 78);
  await key(page,'KeyX');
  await wait(page,()=>qaScene.ninja.attack?.counter);
  await wait(page,()=>qaScene.runTally.counters === 1);
  await stop(page,'parry.webm');
  await finish(run);
  report.tests.push('Missed Parry cooldown, real Shadow Rival windup, successful frontal Parry and confirmed countercut');
}

async function secretDiscovery() {
  const run = await open('normal');
  const { page } = run;
  await record(page);
  await page.keyboard.down('KeyA');
  await wait(page,()=>qaScene.player.x < 37);
  await page.keyboard.up('KeyA');
  await page.keyboard.down('Space');
  await wait(page,()=>qaScene.player.y < 169);
  await wait(page,()=>qaScene.player.body.blocked.down && qaScene.player.y < 153);
  await page.keyboard.up('Space');
  await page.keyboard.down('Space');
  await wait(page,()=>!qaScene.secret.body.enable);
  await page.keyboard.up('Space');
  await shot(page,'hidden-grove.png');
  await stop(page,'hidden-grove.webm');
  const hasGrove = () => page.evaluate(()=>JSON.parse(localStorage.getItem('pixel-adventure.ultimate')).feats.includes('grove'));
  assert(await hasGrove());
  await page.reload();
  await page.locator('#enter-adventure').click();
  await page.locator('#settings-button').click();
  assert(await page.locator('#hero-outfit option[value=jade]').isEnabled());
  await page.locator('#hero-outfit').selectOption('jade');
  assert(await hasGrove());
  await shot(page,'cosmetics.png');
  await page.locator('#settings-dialog [data-close]').first().click();
  await page.locator('#play-game').click();
  await wait(page,()=>qaScene?.sys.isActive() && qaScene.player.body.blocked.down);
  await shot(page,'jade-gameplay.png');
  await finish(run);
  const shrine = await open('19');
  await shrine.page.keyboard.down('KeyA');
  await wait(shrine.page,()=>qaScene.player.x < 30);
  await shrine.page.keyboard.up('KeyA');
  await shrine.page.keyboard.down('Space');
  await wait(shrine.page,()=>qaScene.player.y < 169);
  await wait(shrine.page,()=>qaScene.player.body.blocked.down && qaScene.player.y < 149);
  await shrine.page.keyboard.up('Space');
  await shrine.page.keyboard.down('Space');
  await wait(shrine.page,()=>!qaScene.secret.body.enable);
  await shrine.page.keyboard.up('Space');
  await shot(shrine.page,'high-shrine.png');
  await finish(shrine);
  report.tests.push('Jumped to both secret caches from spawn. Hidden Grove persisted its feat and enabled Jade outfit');
}

async function sprintComparison() {
  const speeds = {};
  for (const sprint of [false,true]) {
    const run = await open('arena');
    const { page } = run;
    const clip = sprint ? 'sprint-speed' : 'normal-speed';
    await record(page);
    if (sprint) await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyD');
    await wait(page, speed => qaScene.player.body.velocity.x >= speed, sprint?175:131);
    const start = await page.evaluate(()=>[qaScene.player.x,qaScene.elapsed]);
    await wait(page,t=>qaScene.elapsed-t>=610,start[1]);
    const sample = await page.evaluate(()=>[qaScene.player.x,qaScene.elapsed,qaScene.player.body.velocity.x]);
    const average = Math.round((sample[0]-start[0])*1000/(sample[1]-start[1]));
    assert(Math.abs(average-(sprint?176:132)) <= 7);
    speeds[clip] = {average, instantaneous:sample[2], duration:sample[1]-start[1]};
    await page.keyboard.up('KeyD');
    if (sprint) await page.keyboard.up('ShiftLeft');
    await stop(page,clip+'.webm');
    await finish(run);
  }
  await writeFile(out('sprint.json'),JSON.stringify(speeds,null,2));
  report.speeds = speeds;
}

async function enemyPreviews() {
  for (const [stage,type] of [[17,'shadowRival'],[22,'nightHunter'],[28,'ironGuardian']]) {
    const run = await open(String(stage));
    await place(run.page,await run.page.evaluate(type=>qaScene.enemies.getChildren().find(enemy=>enemy.getData('type')===type).x-62,type));
    await shot(run.page,type+'.png');
    await finish(run);
  }
  const run = await open('survival');
  const image = await run.page.evaluate(()=>{
    const labels = [['shadowRival','Shadow Rival'],['ironGuardian','Iron Guardian'],['nightHunter','Night Hunter']];
    const canvas = document.createElement('canvas');
    canvas.width=948; canvas.height=1650;
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#151e31';ctx.fillRect(0,0,canvas.width,canvas.height);
    let top=22;
    for (const [id,label] of labels) {
      const atlas=qaScene.enemies.getChildren().find(enemy=>enemy.getData('type')===id).texture;
      ctx.fillStyle='#f5ecff';ctx.font='bold 21px monospace';ctx.fillText(label,22,top);
      top+=14;
      const names=Object.keys(atlas.paintedClips);
      for (const name of names) {
        ctx.fillStyle='#24334d';ctx.fillRect(12,top,924,51);
        ctx.font='bold 14px monospace';ctx.fillStyle='#d9cbe9';ctx.fillText(name,23,top+26);
        let i=0;
        while (atlas.has(name+i)) {
          const f=atlas.get(name+i);
          ctx.drawImage(f.source.image,f.cutX,f.cutY,f.cutWidth,f.cutHeight,120+i*66,top+1,55,49);
          i++;
        }
        top+=54;
      }
      top+=34;
    }
    return canvas.toDataURL().split(',')[1];
  });
  await writeFile(out('enemy-atlas.png'),Buffer.from(image,'base64'));
  await finish(run);
}

async function gamepadProbe() {
  const run = await open('arena');
  const { page } = run;
  await page.evaluate(()=>{
    const buttons=Array.from({length:16},()=>({pressed:false}));
    const pad={buttons,axes:[0,0]};
    window.virtualPad=pad;
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
  });
  await sleep(page,100);
  await page.evaluate(()=>{virtualPad.axes[0]=.8;virtualPad.buttons[0].pressed=true;});
  await wait(page,()=>qaScene.player.body.velocity.y< -120);
  await page.evaluate(()=>{virtualPad.buttons[0].pressed=false;virtualPad.buttons[2].pressed=true;});
  await wait(page,()=>qaScene.ninja.attack?.air && qaScene.player.body.velocity.x>0);
  await page.evaluate(()=>{virtualPad.axes[0]=0;virtualPad.buttons[2].pressed=false;});
  await wait(page,()=>qaScene.player.body.blocked.down && !qaScene.ninja.attack);
  await page.evaluate(()=>{virtualPad.buttons[1].pressed=true;});
  await wait(page,()=>qaScene.ninja.parry);
  await page.evaluate(()=>{virtualPad.buttons[1].pressed=false;virtualPad.buttons[9].pressed=true;});
  await page.locator('#pause-dialog[open]').waitFor();
  await finish(run);
  report.tests.push('Synthetic standard Gamepad API inputs activated movement, jump, air Katana, Parry and pause');
}

async function aerialChain() {
  const run = await open('arena');
  const {page}=run;
  await record(page);
  await page.keyboard.down('Space');
  await wait(page,()=>!qaScene.player.body.blocked.down && qaScene.player.body.velocity.y < -100);
  await key(page,'KeyX');
  await wait(page,()=>qaScene.ninja.attack?.air && qaScene.elapsed-qaScene.ninja.attack.since >= 98);
  await key(page,'KeyX');
  await wait(page,()=>qaScene.ninja.attack?.air && qaScene.ninja.attack.index === 1);
  await wait(page,()=>qaScene.elapsed-qaScene.ninja.attack.since >= 122);
  await key(page,'KeyX');
  await wait(page,()=>qaScene.ninja.attack?.index === 2);
  await page.keyboard.up('Space');
  await wait(page,()=>qaScene.player.body.blocked.down && !qaScene.ninja.attack);
  assert.equal(await page.evaluate(()=>qaScene.ninja.uses.katana),3);
  await stop(page,'air-combo.webm');
  await finish(run);
  report.tests.push('Katana air slash plus two buffered aerial poses followed by a normal landing');
}

async function survivalRun() {
  const run = await open('survival');
  const { page } = run;
  await record(page);
  const outcome = await page.evaluate(() => new Promise(resolve => {
    const scene = qaScene;
    const pressed = new Set();
    const since = performance.now();
    const input = (code, down) => {
      if (pressed.has(code) === down) return;
      if (down) pressed.add(code); else pressed.delete(code);
      window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup',{code,bubbles:true,cancelable:true}));
    };
    const tap = code => { input(code,true); input(code,false); };
    let jumpAt = -Infinity;
    let cooldown = 0;
    let aim = 1;
    const samples = [];
    let previous = 0;
    const start = performance.now();
    function tick() {
      const {player,ninja,survival,elapsed} = scene;
      const cleared = survival.cleared();
      if (cleared !== previous) {
        previous = cleared;
        samples.push({wave:cleared,time:Math.round(elapsed),health:survival.run.health,score:survival.run.score});
      }
      if (scene.complete || document.querySelector('#clear-dialog').open || cleared >= 6 || performance.now()-since > 115000) {
        for (const code of [...pressed]) input(code,false);
        resolve({ cleared, elapsed:Math.round(elapsed), score:survival.run.score, health:survival.run.health,
          uses:ninja.uses, samples, wallMs:Math.round(performance.now()-start), enemies:scene.enemies.getChildren().length });
        return;
      }
      const foes = scene.enemies.getChildren().filter(enemy=>enemy.active)
        .sort((a,b)=>Math.abs(player.x-a.x)-Math.abs(player.x-b.x));
      const threat = foes[0];
      if (!threat) {
        input('ArrowLeft',player.x>260); input('ArrowRight',player.x<192);
        requestAnimationFrame(tick);
        return;
      }
      const diff = threat.x-player.x;
      const side = Math.sign(diff) || aim;
      let move = side;
      const flying = threat.getData('type') === 'nightHunter';
      const state = threat.getData('ultimateState');
      const close = Math.abs(diff);
      const floor = player.body.blocked.down;
      const ready = key => elapsed >= (ninja.readyAt[key] ?? 0);
      const idle = !ninja.attack && !ninja.special && !ninja.throw && !ninja.dash && !ninja.parry;
      if (side !== aim) aim=side;
      else if (close <= (flying ? 74 : 22)) move=0;
      if (floor && flying && close < 111 && elapsed-jumpAt > 650 && !ninja.throw) {
        jumpAt=elapsed; input('Space',true);
      }
      if (elapsed-jumpAt > 285) input('Space',false);
      input('ArrowLeft',move<0);
      input('ArrowRight',move>0);
      if (ninja.parry?.success && elapsed-ninja.parry.succeededAt >= 78 && elapsed>=cooldown) {
        tap('KeyX'); cooldown=elapsed+155;
      } else if (idle && state.phase==='windup' && state.until-elapsed>35 && state.until-elapsed<=78
        && close < 40 && !flying && ready('parry')) {
        tap('KeyQ'); cooldown=elapsed+75;
      } else if (elapsed>=cooldown) {
        const strike = ninja.attack;
        if (strike && strike.index<2 && !strike.queued && elapsed-strike.since>=[98,123][strike.index]) {
          tap('KeyX'); cooldown=elapsed+65;
        } else if (idle && flying && close < 155 && player.y-12 >= threat.body.top-2
          && player.y-12 <= threat.body.bottom+2 && ready('throw')) {
          tap('KeyC'); cooldown=elapsed+175;
        } else if (idle && close < 47 && (state.phase==='recover' || flying && Math.abs(player.y-threat.y) < 21) && ready('execution')) {
          tap('KeyF'); cooldown=elapsed+150;
        } else if (idle && close < 29 && Math.abs(player.y-threat.y) < 21
          && ready('cyclone') && state.phase!=='windup') {
          tap('KeyV'); cooldown=elapsed+150;
        } else if (idle && close < 33 && Math.abs(player.y-threat.y) < 25) {
          tap('KeyX'); cooldown=elapsed+145;
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }));
  await shot(page,'survival.png');
  await stop(page,'survival.webm');
  report.survival = outcome;
  await writeFile(out('survival.json'),JSON.stringify(outcome,null,2));
  assert.equal(outcome.cleared,6,JSON.stringify(outcome));
  const saved = await page.evaluate(()=>JSON.parse(localStorage.getItem('pixel-adventure.ultimate')));
  assert(saved.feats.includes('arena') && saved.arena.wave === 6 && saved.arena.score >= outcome.score);
  await key(page,'KeyR');
  assert.deepEqual(run.errors, []);
  await page.locator('#clear-dialog[open]').waitFor();
  assert.equal(await page.locator('#clear-title').textContent(),'Survival Complete');
  await page.locator('#play-again').click();
  await wait(page,()=>qaScene.survival.run.wave === 0 && qaScene.survival.run.health === 3);
  await finish(run);
}

try {
  for (const fn of [arena, comparisons, campaign, mobile, techniques, skillsAndBindings, campaignTechniques,
    wallAndAir, parryAndEnemy, secretDiscovery, sprintComparison, enemyPreviews, gamepadProbe, aerialChain, survivalRun]) {
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
