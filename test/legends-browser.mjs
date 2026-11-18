import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import controller from './player-controller.mjs';
import { dailyFor } from '../src/game/legends-progress.js';

const directory=resolve(process.env.PIXEL_REVIEW_DIR??'artifacts/legends-review');
await mkdir(directory,{recursive:true});
const output=file=>resolve(directory,file);
const address=process.env.PIXEL_DEV_URL??'http://127.0.0.1:5173/';
const browser=await chromium.launch({channel:'msedge',args:['--disable-background-timer-throttling']});
const results=[];
const wait=(page,fn,arg)=>page.waitForFunction(fn,arg,{timeout:10000});
const screenshots=process.env.PIXEL_CAPTURE!=='0';

async function open(query='',options={},seed,fixtureDay){
  const page=await browser.newPage({viewport:{width:1200,height:850},...options});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(url=>url.pathname==='/src/main.js',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text())+'\nwindow.qaScene=scene;window.qaGame=game;'});
  });
  await page.addInitScript(({fixture,day})=>{
    if(!localStorage.getItem('pixel-adventure.preferences'))localStorage.setItem('pixel-adventure.preferences','{"tutorialSeen":true,"sound":false}');
    if(fixture&&!localStorage.getItem('pixel-adventure.progress'))
      localStorage.setItem('pixel-adventure.progress',JSON.stringify(fixture));
    if(day){
      const ActualDate=Date;
      window.Date=class extends ActualDate{constructor(...args){super(...(args.length?args:[...day,12]));}};
    }
  },{fixture:seed,day:fixtureDay});
  await page.goto(address+query);
  await page.locator('#legends-button').waitFor();
  await wait(page,()=>qaGame?.isBooted);
  return {page,errors};
}
const byText=(page,name)=>page.getByRole('button',{name,exact:true});
const shot=(page,file)=>screenshots?page.screenshot({path:output(file)}):Promise.resolve();

async function choose(page,id){
  await page.locator('#legends-button').click();
  await byText(page,'Choose Hero').click();
  await page.locator('[data-legend-hero="'+id+'"]').click();
  await page.locator('#legend-select').click();
  if(id==='flame')await shot(page,'character-selection.png');
  if(id!=='shadow'){
    await byText(page,'Skill Tree').click();
    assert.equal(await page.locator('[data-hero-node]').count(),18);
    await shot(page,id+'-skill-tree.png');
  }
  await byText(page,'Close Legends').click();
}

async function archiveHero(page,id){
  if(!screenshots)return;
  const art=await page.evaluate(()=>{
    const scene=qaScene,id=scene.hero.id;
    const key=id==='shadow'?'shadow-ninja':scene.textures.getTextureKeys().find(name=>name.startsWith('legends-art-'+id+'-'));
    const texture=scene.textures.get(key),source=texture.getSourceImage();
    const clips={};
    for(const name of texture.getFrameNames()){
      const match=name.match(/^(.*)(\d)$/);
      if(!match)continue;
      const frame=texture.get(name);
      (clips[match[1]]??=[]).push([frame.cutX,frame.cutY]);
    }
    const data=(width,height,draw)=>{
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;draw(ctx);
      return canvas.toDataURL().split(',')[1];
    };
    const sheet=data(920,62+Object.keys(clips).length*84,ctx=>{
      ctx.fillStyle='#142137';ctx.fillRect(0,0,920,4000);
      ctx.font='bold 21px monospace';ctx.fillStyle='#ffe7ee';ctx.fillText(scene.hero.name,22,35);
      ctx.font='14px monospace';
      for(const [i,[name,frames]] of Object.entries(clips).entries()){
        const top=55+i*84;
        ctx.fillStyle=i%2?'#243450':'#2b3c55';ctx.fillRect(14,top,892,83);
        ctx.fillStyle='#ecdff4';ctx.fillText(name,27,top+29);
        for(const [index,[x,y]] of frames.entries())ctx.drawImage(source,x,y,112,80,135+index*94,top,94,80);
      }
    });
    const [x,y]=clips.idle[0];
    return {clips,atlas:data(source.width,source.height,ctx=>ctx.drawImage(source,0,0)),sheet,
      width:source.width,height:source.height,portrait:data(112,80,ctx=>ctx.drawImage(source,x,y,112,80,0,0,112,80))};
  });
  assert.equal(Object.keys(art.clips).length,43);
  for(const part of ['atlas','sheet','portrait'])await writeFile(output(id+'-'+part+'.png'),Buffer.from(art[part],'base64'));
  await writeFile(output(id+'-frames.json'),JSON.stringify({width:art.width,height:art.height,clips:art.clips}));
}

const recordings=new WeakMap();
async function record(page){
  if(!screenshots)return;
  const session=await page.context().newCDPSession(page),frames=[];
  recordings.set(page,{session,frames});
  session.on('Page.screencastFrame',({data,metadata,sessionId})=>{
    if(Number.isFinite(metadata.timestamp))frames.push({bytes:Buffer.from(data,'base64'),at:metadata.timestamp});
    session.send('Page.screencastFrameAck',{sessionId}).catch(()=>{});
  });
  await session.send('Page.startScreencast',{format:'jpeg',quality:78,maxWidth:1024,maxHeight:740,everyNthFrame:2});
  await page.waitForTimeout(230);
}

async function stop(page,file){
  if(!screenshots)return;
  const {session,frames}=recordings.get(page);
  await page.waitForTimeout(430);
  await session.send('Page.stopScreencast');await session.detach();
  assert(frames.length>=3,file+' must contain runtime frames');
  const start=frames[0].at,fps=24,count=Math.max(14,Math.round((frames.at(-1).at-start)*fps));
  let j=0;
  const images=Array.from({length:count+1},(_,i)=>{
    while(j+1<frames.length&&frames[j+1].at-start<=i/fps)j++;
    return frames[j].bytes;
  });
  const encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','mjpeg','-framerate',String(fps),'-i','pipe:0','-an',
    '-c:v','libvpx','-pix_fmt','yuv420p','-b:v','1200k',output(file)],{windowsHide:true,stdio:['pipe','ignore','inherit']});
  await new Promise((resolve,reject)=>{
    encoder.once('error',reject);
    encoder.once('exit',code=>code===0?resolve():reject(new Error('ffmpeg exited '+code)));
    encoder.stdin.on('error',reject);encoder.stdin.end(Buffer.concat(images));
  });
  recordings.delete(page);
}

async function heroTrial(id){
  const {page,errors}=await open('?shadow=arena');
  await choose(page,id);
  await page.reload();
  await wait(page,()=>qaGame?.isBooted);
  await page.locator('#shadow-play').click();
  await wait(page,hero=>qaScene?.hero?.id===hero&&qaScene.player?.body.blocked.down,id);
  await archiveHero(page,id);
  await record(page);
  await page.keyboard.down('KeyD');
  await page.keyboard.down('Space');
  await wait(page,()=>qaScene.player.body.velocity.y< -120&&qaScene.player.x>69);
  await page.keyboard.up('KeyD');await page.keyboard.up('Space');
  await wait(page,()=>qaScene.player.body.blocked.down);
  await page.evaluate(()=>{qaScene.player.body.reset(191,184);qaScene.moveCamera(1);});
  await page.keyboard.press('KeyX');
  await wait(page,()=>qaScene.ninja.uses.katana===1&&!qaScene.ninja.attack);
  await page.keyboard.press('KeyC');
  await wait(page,()=>qaScene.ninja.uses.shuriken===1&&!qaScene.ninja.throw);
  await page.keyboard.press('KeyV');
  await wait(page,()=>qaScene.ninja.uses.cyclone===1&&!qaScene.ninja.special);
  await page.keyboard.press('KeyF');
  await wait(page,()=>qaScene.ninja.special?.kind==='execution');
  await shot(page,id+'-ultimate.png');
  await wait(page,()=>qaScene.ninja.uses.execution===1&&!qaScene.ninja.special);
  await page.waitForTimeout(500);
  await stop(page,id+'-combat.webm');
  assert.equal(await page.locator('#legends-dialog[open]').count(),0);
  assert.deepEqual(errors,[]);
  results.push({hero:id,kind:'controlled arena inputs',uses:await page.evaluate(()=>qaScene.ninja.uses)});
  await page.close();
}

async function extras(){
  const seed=JSON.parse(await readFile(output('campaign.json.storage.json'),'utf8'));
  const {page,errors}=await open('');
  await page.evaluate(({origins})=>{for(const {name,value} of origins[0].localStorage)localStorage.setItem(name,value);},seed);
  await page.reload();await wait(page,()=>qaGame?.isBooted);
  await page.locator('#legends-button').click();await byText(page,'Choose Hero').click();await byText(page,'Cosmetics').click();
  await byText(page,'Silver Trim · Mastery 3').click();await shot(page,'mastery.png');
  await byText(page,'Close Legends').click();
  await page.locator('#skill-tree').click();await shot(page,'shadow-skill-tree.png');
  await page.locator('#skills-dialog [data-close]').click();
  await page.locator('#level-select').click();await page.locator('[data-level="0"]').click();
  await wait(page,()=>qaScene.level.name==='Verdant Hills'&&qaScene.player.body.blocked.down);
  await page.keyboard.down('KeyD');await wait(page,()=>qaScene.player.x>130);await page.keyboard.up('KeyD');
  await shot(page,'legends-verdant.png');
  await page.locator('#pause-button').click();await page.locator('#pause-main').click();
  await page.locator('#level-select').click();await page.locator('[data-level="32"]').click();
  await wait(page,()=>qaScene.level.secret?.id==='bamboo-2'&&qaScene.player.body.blocked.down);
  await record(page);
  for(const y of [148,109]){
    await page.keyboard.down('KeyA');await page.keyboard.down('Space');
    await wait(page,target=>qaScene.player.body.blocked.down&&Math.abs(qaScene.player.y-target)<2,y);
    await page.keyboard.up('Space');await page.keyboard.up('KeyA');
  }
  await wait(page,()=>!qaScene.secret.body.enable);
  await shot(page,'legend-secret.png');await stop(page,'legend-secret.webm');
  assert.deepEqual(errors,[]);
  results.push({kind:'Persisted Mastery cosmetic, Shadow tree, secret traversal',cache:'bamboo-2'});
  await page.close();
}

async function villageAndReplay(){
  const fixture={version:2,unlocked:60,records:Array.from({length:60},()=>({coins:7,elapsed:44000}))};
  const day=Array.from({length:20},(_,i)=>[2026,5,i+1]).find(parts=>dailyFor(new Date(...parts)).kind==='time');
  const {page,errors}=await open('',{},fixture,day);
  await choose(page,'flame');
  await page.locator('#legends-button').click();
  await byText(page,'Enter Ninja Village').click();
  await wait(page,()=>qaScene.level.village&&qaScene.player.body.blocked.down);
  await record(page);
  await page.keyboard.down('KeyD');
  await wait(page,()=>qaScene.villageStation?.id==='blacksmith');
  await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyE');
  await byText(page,'Unlock for 25 · Heavy Greatsword').click();
  await byText(page,'Hone Weapon · 18 Coins').click();
  await shot(page,'blacksmith.png');
  await stop(page,'village.webm');
  await byText(page,'Close Legends').click();
  await page.locator('#pause-button').click();
  await page.locator('#pause-main').click();
  await page.locator('#legends-button').click();
  await byText(page,'Hall of Legends').click();
  await byText(page,'New Game+ · Cycle 1').click();
  await wait(page,()=>document.querySelector('#shell').dataset.mode==='ng'&&qaScene?.level.name==='Verdant Hills');
  assert.equal(await page.evaluate(()=>qaScene.hero.playWeapon),'Heavy Greatsword');
  await shot(page,'new-game-plus.png');
  await record(page);
  const cycle=await page.evaluate(controller,{level:1,bridges:[],timeout:85000,dash:true});
  await stop(page,'new-game-plus.webm');
  assert.equal(cycle.status,'Completed',JSON.stringify(cycle));
  assert.equal(await page.locator('#clear-title').textContent(),'New Game+ Clear');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pixel-adventure.legends')).ng.frontier),2);
  await page.locator('#clear-main').click();
  await page.locator('#legends-button').click();
  await byText(page,'Daily Challenge').click();
  await shot(page,'daily-challenge.png');
  assert(await byText(page,'Start Challenge').isEnabled());
  await byText(page,'Start Challenge').click();
  await wait(page,()=>document.querySelector('#shell').dataset.mode==='daily'&&qaScene.player.body.blocked.down);
  await record(page);
  const dayClear=await page.evaluate(controller,{level:dailyFor(new Date(...day)).level+1,bridges:[],timeout:85000,dash:true});
  await stop(page,'daily-challenge.webm');
  assert.equal(dayClear.status,'Completed',JSON.stringify(dayClear));
  assert.equal(await page.locator('#clear-title').textContent(),'Daily Challenge Complete');
  await page.locator('#clear-main').click();
  await page.locator('#legends-button').click();
  await byText(page,'Hall of Legends').click();
  await page.getByLabel('Defeated boss').selectOption('59');
  await page.getByLabel('Rematch difficulty').selectOption('master');
  await byText(page,'Start Boss Rematch').click();
  await wait(page,()=>qaScene.boss?.kind==='emperor'&&qaScene.player.body.blocked.down);
  await record(page);
  await shot(page,'boss-rematch.png');
  const rematch=await page.evaluate(controller,{level:60,bridges:[],timeout:90000,dash:true});
  await stop(page,'boss-rematch.webm');
  assert.equal(rematch.status,'Completed',JSON.stringify(rematch));
  assert.equal(await page.locator('#clear-title').textContent(),'Guardian Defeated');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('pixel-adventure.progress')).records),fixture.records);
  assert.deepEqual(errors,[]);
  results.push({kind:'Village, Blacksmith, NG+, Daily, Master rematch',cycle,dayClear,rematch});
  await page.close();
}

async function mobile(){
  const {page,errors}=await open('?shadow=arena',{viewport:{width:839,height:393},isMobile:true,hasTouch:true});
  await choose(page,'ranger');
  await page.locator('#shadow-play').tap();
  await wait(page,()=>qaScene.hero.id==='ranger'&&qaScene.player.body.blocked.down);
  const cdp=await page.context().newCDPSession(page);
  const points={};
  for(const [i,action] of ['right','jump','attack','sprint'].entries()){
    const box=await page.locator('[data-action="'+action+'"]').boundingBox();
    assert(box.width>=44&&box.height>=44);
    points[action]={id:i+1,x:box.x+box.width/2,y:box.y+box.height/2};
  }
  const touch=(type,keys)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:keys.map(key=>points[key])});
  await record(page);
  await touch('touchStart',['right','sprint']);
  await wait(page,()=>qaScene.ninja.sprint);
  await touch('touchStart',['right','sprint','jump']);
  await wait(page,()=>!qaScene.player.body.blocked.down);
  await touch('touchStart',['right','sprint','jump','attack']);
  await wait(page,()=>qaScene.ninja.attack?.air);
  await shot(page,'mobile-ranger.png');
  await touch('touchEnd',[]);
  await page.waitForTimeout(700);
  await stop(page,'mobile-ranger.webm');
  assert.deepEqual(errors,[]);
  results.push({kind:'Phone emulation',hero:'ranger',touches:4});
  await page.close();
}

try{
  const selected=process.env.PIXEL_LEGEND_TEST?.split(',')??['shadow','flame','frost','thunder','ranger','village','mobile'];
  for(const id of selected){
    if(id==='village')await villageAndReplay();
    else if(id==='mobile')await mobile();
    else if(id==='extras')await extras();
    else await heroTrial(id);
    console.log(id+' passed');
  }
}finally{
  await writeFile(output('legends-'+(process.env.PIXEL_LEGEND_TEST?.replaceAll(',','-')??'browser')+'.json'),JSON.stringify(results,null,2));
  await browser.close();
}
