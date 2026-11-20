import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.PIXEL_TEST_URL || 'http://127.0.0.1:5173/';
const output = resolve(process.env.PIXEL_VISUAL_REPORT || 'artifacts/visual-profile');
const label = process.env.PIXEL_VISUAL_PASS || 'candidate';
const cases = [
  { name:'verdant', stage:1, viewport:{ width:1366, height:768 } },
  { name:'swamp-mobile', stage:23, viewport:{ width:844, height:390 }, mobile:true, throttle:4 },
  { name:'survival', viewport:{ width:1366, height:768 } },
  { name:'final-boss', stage:60, viewport:{ width:1366, height:768 } },
  { name:'swamp-touch-native', stage:23, viewport:{width:844,height:390}, mobile:true, extra:true },
  { name:'survival-six', viewport:{width:1366,height:768}, crowded:true, extra:true },
  ...[[31,'bamboo'],[37,'sunken'],[43,'sky'],[49,'neon']].map(([stage,name])=>
    ({ name,stage,viewport:{ width:1366,height:768 },extra:true })),
];
const selected = (process.env.PIXEL_VISUAL_CASES || '').split(',').filter(Boolean);
await mkdir(output,{recursive:true});
const browser = await chromium.launch({ channel:'msedge' });

async function profile(scenario) {
  const { name,stage,viewport,mobile=false,throttle=1,crowded=false }=scenario;
  const page = await browser.newPage({ viewport, isMobile:mobile, hasTouch:mobile });
  page.setDefaultTimeout(16000);
  const errors = [];
  page.on('pageerror',error=>{ errors.push(error.message); console.error(error); });
  page.on('console',message=>{ if(message.type()==='error') errors.push(message.text()); });
  const cdp = await page.context().newCDPSession(page);
  if (throttle>1) await cdp.send('Emulation.setCPUThrottlingRate',{rate:throttle});
  await page.route(url => url.pathname === '/src/main.js' || /\/assets\/main-[\w-]+\.js$/.test(url.pathname), async route => {
    const response = await route.fetch(), script = await response.text();
    const scene = new URL(route.request().url()).pathname === '/src/main.js' ? 'scene' :
      script.match(/scene:\[new [\w$]+\([^)]*\),([\w$]+)\]\}\)/)?.[1];
    assert(scene,'Could not find the scene in the browser bundle');
    await route.fulfill({response,body:script+'\nwindow.visualScene='+scene+';'});
  });
  await page.addInitScript(() => {
    localStorage.setItem('pixel-adventure.progress','{"version":2,"unlocked":60}');
    localStorage.setItem('pixel-adventure.preferences','{"tutorialSeen":true,"sound":false}');
  });
  const bootStart = performance.now();
  await page.goto(base);
  await page.locator('#enter-adventure').click();
  await page.locator('#level-select').waitFor();
  const bootMs = Math.round(performance.now()-bootStart);
  if (stage) await page.locator('#level-select').click();
  const enterStart = performance.now();
  await page.locator(stage ? '[data-level="'+(stage-1)+'"]' : '#survival-button').click();
  await page.waitForFunction(()=>visualScene?.player?.body?.blocked.down && document.activeElement.id==='stage');
  const stageMs = Math.round(performance.now()-enterStart);
  if (name==='final-boss') {
    // This is a rendering stress fixture. The campaign QA runner plays through with inputs only.
    await page.evaluate(()=>{
      const scene=visualScene;
      scene.player.body.reset(scene.boss.x-68,184);
      scene.moveCamera(1);
      scene.boss.hp=3;
    });
    await page.waitForFunction(()=>visualScene.boss.phase==='warn'||visualScene.boss.phase==='attack');
    await page.screenshot({path:join(output,label+'-boss-telegraph.png')});
  }
  if(crowded){
    await page.evaluate(()=>{ const {run}=visualScene.survival; run.wave=7;run.until=0; });
    await page.waitForFunction(()=>visualScene.enemies.countActive()===6);
  }
  const startX = await page.evaluate(()=>visualScene.player.x);
  const sample = page.evaluate(() => new Promise(resolve => {
    const intervals = [];
    let first, last, foes=0;
    function tick(time) {
      first ??= time;
      if (last!==undefined) intervals.push(time-last);
      last=time;
      const scene=visualScene, camera=scene.cameras.main;
      foes=Math.max(foes,scene.enemies.getChildren().filter(enemy=>enemy.active &&
        enemy.x>camera.scrollX && enemy.x<camera.scrollX+camera.width).length);
      if (time-first<4100) { requestAnimationFrame(tick); return; }
      intervals.sort((a,b)=>a-b);
      const pick=p=>+intervals[Math.floor((intervals.length-1)*p)].toFixed(1);
      resolve({ fps:+(intervals.length*1000/(time-first)).toFixed(1),p95:pick(.95),p99:pick(.99),
        long:intervals.filter(ms=>ms>=50).length, foes });
    }
    requestAnimationFrame(tick);
  }));
  await page.keyboard.down('KeyD');
  await page.waitForFunction(x=>Math.abs(visualScene.player.x-x)>3,startX);
  await page.keyboard.press('Space',{delay:170});
  await page.keyboard.press('KeyX');
  await page.waitForFunction(()=>visualScene.ninja.attack || visualScene.ninja.lastHit);
  await page.keyboard.up('KeyD');
  await page.waitForFunction(()=>!visualScene.ninja.attack);
  await page.keyboard.press('KeyC');
  await page.waitForFunction(()=>visualScene.ninja.projectiles.length>0);
  await page.waitForTimeout(230);
  await page.keyboard.press('KeyZ');
  if (name!=='final-boss') {
    await page.keyboard.down('KeyD');
    await page.keyboard.press('Space',{delay:210});
    await page.keyboard.press('KeyX');
    await page.waitForTimeout(370);
    await page.keyboard.up('KeyD');
  }
  const metrics=await sample;
  await page.screenshot({path:join(output,label+'-'+name+'.png')});
  assert.deepEqual(errors,[]);
  await page.close();
  return { name, throttle, bootMs, stageMs, ...metrics };
}

try {
  const summary=[];
  for (const scenario of cases) {
    if (selected.length ? !selected.includes(scenario.name) : scenario.extra) continue;
    const result=await profile(scenario);
    summary.push(result);
    console.log(JSON.stringify(result));
  }
  await writeFile(join(output,label+'.json'),JSON.stringify(summary,null,2)+'\n');
} finally {
  await browser.close();
}
