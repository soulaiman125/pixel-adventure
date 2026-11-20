import { configureDenseTexture } from './actor-art.js';
import { rememberVisualTexture } from './texture-budget.js';

export function expandedClips(counts,loops,subframes=3){
  return Object.fromEntries(Object.entries(counts).map(([clip,count])=>
    [clip,count===1?1:count*subframes-(loops.has(clip)?0:subframes-1)]));
}

export function paintedAtlas(scene,key,width,height,clips,paint,density=3){
  let texture;
  if(scene.textures.exists(key)){
    texture=scene.textures.get(key);
  } else {
    const frames=Object.entries(clips).flatMap(([clip,count])=>Array.from({length:count},(_,n)=>[clip,n,count]));
    const columns=Math.min(10,frames.length);
    const canvas=document.createElement('canvas');
    canvas.width=columns*width*density;
    canvas.height=Math.ceil(frames.length/columns)*height*density;
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingQuality='medium';
    frames.forEach(([clip,n,count],i)=>{
      const x=i%columns*width,y=Math.floor(i/columns)*height;
      ctx.save();
      ctx.setTransform(density,0,0,density,x*density,y*density);
      ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
      paint(ctx,0,0,clip,n,count);
      ctx.restore();
    });
    texture=scene.textures.addImage(key,canvas);
    configureDenseTexture(texture,density);
    for(const [i,[clip,n]] of frames.entries()){
      const x=i%columns*width*density,y=Math.floor(i/columns)*height*density;
      texture.add(clip+n,0,x,y,width*density,height*density).setTrim(width,height,0,0,width,height);
    }
    texture.paintedClips=clips;
  }
  rememberVisualTexture(scene,key);
  return texture;
}
