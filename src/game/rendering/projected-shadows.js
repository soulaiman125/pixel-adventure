import { makeCanvas, surfaceLight } from './lighting.js';
import { VIEW_HEIGHT } from '../level-one.js';

// Draw extra presentation into the camera's existing Canvas pass, in display-list order.
export function canvasLayer(scene, depth, draw, world = true) {
  const layer = scene.add.image(0,0,'__WHITE').setDepth(depth);
  layer.renderCanvas = (renderer,_source,camera) => {
    const ctx=renderer.currentContext;
    ctx.save();
    if(world){
      camera.matrix.setToContext(ctx);
      ctx.translate(-camera.scrollX,-camera.scrollY);
    }
    draw(ctx,camera);
    ctx.restore();
  };
  return layer;
}

export function createProjectedShadows(scene,rig) {
  const fixed=[], moving=[], masks=new WeakMap();
  let baked;

  function silhouette(frame) {
    if(masks.has(frame))return masks.get(frame);
    const mask=makeCanvas(frame.realWidth,frame.realHeight);
    const ctx=mask.getContext('2d');
    ctx.drawImage(frame.source.image,frame.canvasData.x,frame.canvasData.y,frame.cutWidth,frame.cutHeight,0,0,mask.width,mask.height);
    ctx.globalCompositeOperation='source-in';
    ctx.fillStyle='#080d0b';
    ctx.fillRect(0,0,mask.width,mask.height);
    masks.set(frame,mask);
    return mask;
  }

  function project(ctx,casters,receivers,left,right) {
    for(const {sprite,platform} of casters){
      if(!sprite.visible||!sprite.alpha||!sprite.frame)continue;
      const parent=sprite.parentContainer;
      if(parent&&!parent.visible)continue;
      const x=sprite.x+(parent?.x??0)+(platform?sprite.displayWidth/2:0);
      const y=sprite.y+(parent?.y??0);
      if(x<left||x>right)continue;
      const feet=platform?y+3:y-2;
      const {direction}=surfaceLight(rig,x,y-sprite.displayHeight*.38);
      const offset=-direction*22;
      let floor;
      for(const {body} of receivers){
        if(body?.enable&&body.top>=feet&&x+offset+16>body.left&&x+offset-16<body.right&&(!floor||body.top<floor.top))
          floor=body;
      }
      if(!floor)continue;
      const height=Math.min(110,Math.max(0,floor.top-y));
      const width=sprite.displayWidth*(platform?.95:.92);
      ctx.save();
      ctx.beginPath();
      ctx.rect(floor.left,floor.top,floor.width,Math.min(13,floor.height));
      ctx.clip();
      ctx.translate(x+offset*height/80,floor.top+1);
      ctx.transform(sprite.flipX?-1:1,0,direction*.64,-.23,0,0);
      ctx.imageSmoothingEnabled=true;
      ctx.globalAlpha=(platform?.25:.44)*sprite.alpha*(1-height/155);
      ctx.drawImage(silhouette(sprite.frame),-width/2,-sprite.displayHeight,width,sprite.displayHeight);
      ctx.restore();
    }
  }

  canvasLayer(scene,.62,(ctx,camera)=>{
    const left=camera.scrollX-100,right=camera.scrollX+camera.width+100;
    const receivers=[...scene.platforms.getChildren(),...scene.ground.getChildren()];
    if(!baked&&fixed.length){
      const shifting=new Set(scene.specialPlatforms.map(({surface})=>surface));
      baked=makeCanvas(scene.level.width,VIEW_HEIGHT);
      project(baked.getContext('2d'),fixed,receivers.filter(surface=>!shifting.has(surface)),0,scene.level.width);
    }
    if(baked){
      const x=Math.max(0,Math.floor(left)),width=Math.min(baked.width,Math.ceil(right))-x;
      if(width>0)ctx.drawImage(baked,x,0,width,baked.height,x,0,width,baked.height);
    }
    project(ctx,moving,receivers,left,right);
  });
  return (sprite,platform=false,stationary=false)=>
    (stationary?fixed:moving).push({sprite,platform});
}
