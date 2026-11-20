import { shape } from '../swamp/scenery.js';

export function createCacheArt(scene,{id,x,y}) {
  const palette=id==='grove' ? ['#902e60','#f392a9','#ffdcb8'] : ['#5d3a7f','#bd90f2','#f4ddff'];
  const [shadow,edge,highlight]=palette;
  const key='secret-gem-'+(id==='grove'?'rose':'quartz');
  if(!scene.textures.exists(key)){
    const texture=scene.textures.createCanvas(key,19,19),ctx=texture.context;
    const glow=ctx.createRadialGradient(9.5,9.5,1,9.5,9.5,9);
    glow.addColorStop(0,edge+'aa');
    glow.addColorStop(1,edge+'00');
    ctx.fillStyle=glow;
    ctx.fillRect(0,0,19,19);
    shape(ctx,'#281e38',[[9.5,1],[15.5,5.5],[15.5,12],[9.5,18],[3.5,12],[3.5,5.5]]);
    shape(ctx,shadow,[[9.5,2.5],[14.3,6],[14.3,11.5],[9.5,16.5],[4.6,11.5],[4.6,6]]);
    shape(ctx,edge,[[9.5,2.5],[14.3,6],[10.5,8],[8,14],[4.6,10],[4.6,6]]);
    shape(ctx,highlight,[[9.5,4],[12.8,6.3],[10,7.1],[8,10.9],[6,6.6]]);
    ctx.fillStyle=highlight;
    ctx.fillRect(12,10,1,1);
    texture.refresh();
  }
  const art=scene.add.image(x,y,key).setDepth(2);
  const clue=scene.add.graphics().setDepth(2);
  for(const [cx,cy] of [[31,153],[26,160],[21,167]]){
    clue.fillStyle(Number.parseInt(edge.slice(1),16),.67).fillTriangle(cx-1.4,cy,cx,cy-2.1,cx+1.4,cy)
      .fillTriangle(cx-1.4,cy,cx+1.4,cy,cx,cy+2.1);
  }
  return art;
}
