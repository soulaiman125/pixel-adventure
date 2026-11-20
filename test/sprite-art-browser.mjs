import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserScene, openStage } from './sprite-art-fixture.mjs';
import { chromium } from 'playwright-core';
import { resolve, join } from 'node:path';

const folder=resolve(process.env.PIXEL_SPRITE_REVIEW||'artifacts/sprite-redraw');
const before=process.env.PIXEL_BEFORE_URL||'http://127.0.0.1:4195/';
const after=process.env.PIXEL_TEST_URL||'http://127.0.0.1:4193/';
const examples=[
  {id:'shadow-ninja',name:'Shadow Ninja',stage:1,key:'shadow-ninja',frame:'idle0'},
  {id:'brambleback',name:'Brambleback',stage:1,key:'brambleback',frame:'idle0'},
  {id:'eclipse-emperor',name:'Eclipse Emperor',stage:60,key:'legends-boss-emperor',frame:'waiting0'},
];

await mkdir(folder,{recursive:true});
const browser=await chromium.launch({channel:'msedge'});
try {
  async function extract(base,example){
    const page=await browserScene(browser,base);
    await openStage(page,example.stage);
    const sample=await page.evaluate(({key,frame})=>{
      const source=artScene.textures.getFrame(key,frame);
      const canvas=document.createElement('canvas');
      canvas.width=source.cutWidth;
      canvas.height=source.cutHeight;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(source.source.image,source.cutX,source.cutY,source.cutWidth,source.cutHeight,0,0,canvas.width,canvas.height);
      const bytes=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let count=0;
      for(let i=3;i<bytes.length;i+=4)if(bytes[i]>128)count++;
      return {width:canvas.width,height:canvas.height,logical:source.realWidth,count,
        pixels:canvas.toDataURL('image/png').split(',')[1]};
    },example);
    assert.deepEqual(page.artErrors,[]);
    await page.close();
    assert(sample.count>50);
    return sample;
  }
  const baseline=[];
  for(const example of examples){
    const old=await extract(before,example);
    await writeFile(join(folder,example.id+'-old.png'),Buffer.from(old.pixels,'base64'));
    baseline.push({example,old});
  }
  if(process.argv.includes('--baseline-only')){
    console.log(JSON.stringify(baseline.map(({example,old})=>[example.id,old.width,old.height])));
  } else {
    const report=[];
    for(const {example,old} of baseline){
      const next=await extract(after,example);
      assert(next.width>old.width && next.height>old.height,example.id+' must have a larger authored frame');
      assert.equal(old.logical,next.logical);
      assert.notEqual(old.pixels,next.pixels);
      const page=await browser.newPage();
      const comparison=await page.evaluate(async({example,old,next})=>{
        const canvas=document.createElement('canvas');
        canvas.width=902;canvas.height=510;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#111d2b';ctx.fillRect(0,0,902,510);
        ctx.fillStyle='#e9f1fa';ctx.font='700 27px Segoe UI';ctx.fillText(example.name,26,42);
        ctx.fillStyle='#aebdd0';ctx.font='14px Segoe UI';ctx.fillText('Matching idle pose  •  Unlit raster source frames  •  Shared in-game scale',26,68);
        for(const [index,frame] of [old,next].entries()){
          const left=26+index*434;
          ctx.fillStyle='#253548';ctx.fillRect(left,90,416,380);
          ctx.strokeStyle='#405569';ctx.strokeRect(left+.5,90.5,415,379);
          ctx.fillStyle='#dbe8f5';ctx.font='600 17px Segoe UI';
          ctx.fillText((index?'Redrawn':'Previous')+'   '+frame.width+' × '+frame.height+' px',left+15,122);
          ctx.strokeStyle='#607083';ctx.beginPath();ctx.moveTo(left+35,410.5);ctx.lineTo(left+381,410.5);ctx.stroke();
          const img=new Image();
          img.src='data:image/png;base64,'+frame.pixels;
          await img.decode();
          const width=frame.logical*3.4,height=width*frame.height/frame.width;
          ctx.imageSmoothingEnabled=false;
          ctx.drawImage(img,left+208-width/2,410-height,width,height);
        }
        return canvas.toDataURL('image/png').split(',')[1];
      },{example,old,next});
      await page.close();
      await writeFile(join(folder,example.id+'-new.png'),Buffer.from(next.pixels,'base64'));
      await writeFile(join(folder,example.id+'-comparison.png'),Buffer.from(comparison,'base64'));
      report.push({id:example.id,pose:example.frame,old:[old.width,old.height],new:[next.width,next.height]});
    }
    await writeFile(join(folder,'sprite-comparison.json'),JSON.stringify(report,null,2)+'\n');
    console.log(report);
  }
} finally { await browser.close(); }
