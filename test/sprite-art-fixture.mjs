import assert from 'node:assert/strict';

export async function browserScene(browser,base,options={}){
  const page=await browser.newPage({viewport:{width:1366,height:768},...options});
  const errors=[];
  page.on('pageerror',error=>{errors.push(error.message);console.error(error);});
  page.artErrors=errors;
  await page.route(url=>url.pathname==='/src/main.js'||/\/assets\/main-[\w-]+\.js$/.test(url.pathname),async route=>{
    const response=await route.fetch(),script=await response.text();
    const scene=new URL(route.request().url()).pathname==='/src/main.js'?'scene':
      script.match(/scene:\[new [\w$]+\([^)]*\),([\w$]+)\]\}\)/)?.[1];
    assert(scene);
    await route.fulfill({response,body:script+'\nwindow.artScene='+scene+';'});
  });
  await page.addInitScript(()=>{
    localStorage.setItem('pixel-adventure.progress','{"version":2,"unlocked":60}');
    if (!localStorage.getItem('pixel-adventure.preferences'))
      localStorage.setItem('pixel-adventure.preferences','{"tutorialSeen":true,"sound":false}');
  });
  await page.goto(base);
  await page.locator('#enter-adventure').click();
  return page;
}

export async function openStage(page,stage){
  await page.locator('#level-select').click();
  await page.locator('[data-level="'+(stage-1)+'"]').click();
  await page.waitForFunction(()=>document.activeElement.id==='stage' && artScene?.player?.body?.blocked.down);
}
