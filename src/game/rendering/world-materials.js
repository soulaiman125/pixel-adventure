import { GROUND_Y } from '../level-one.js';
import { actorBiome } from './actor-art.js';
import { rememberVisualTexture } from './texture-budget.js';
import { lightProp } from './light-rig.js';
import { randomFrom, shape, treeTexture } from '../swamp/scenery.js';

const materials = {
  verdant:['moss','#263133','#3e4843','#64604b','#a4af6b','#d2d995','#437254'],
  canyon:['sand','#392b39','#72504e','#a37051','#d69b70','#ffe1a0','#a27851'],
  crystal:['ice','#26364e','#415c75','#688694','#a3d7d9','#e3faf4','#599cac'],
  fire:['slag','#281e2b','#5c353e','#8c514a','#cb7554','#ffbc85','#a45a45'],
  castle:['stone','#272234','#514560','#716078','#a49aa8','#d4b8b7','#655878'],
  jungle:['moss','#1b3031','#324739','#526a4c','#9da868','#d2cf8a','#4d784c'],
  thunder:['metal','#202737','#3a4860','#65778c','#97b4c8','#d9e3d7','#6686ad'],
  bamboo:['moss','#202c38','#3a4d53','#586e5b','#a8bf8c','#d8eecb','#508b6d'],
  sunken:['stone','#122b3d','#275163','#44828a','#79b8a8','#c0ecce','#388b87'],
  sky:['sand','#353b55','#6f6790','#987d85','#d6a98e','#ffe2ad','#837f9a'],
  neon:['metal','#231e3e','#41375f','#6c5989','#98a8bb','#c7f9e9','#aa6caf'],
  eclipse:['slag','#2d1a32','#692f4d','#9b4e69','#cb8497','#ffd6a7','#bc536f'],
};

function vertical(ctx,y,height,stops) {
  const fill=ctx.createLinearGradient(0,y,0,y+height);
  for (const [offset,color] of stops) fill.addColorStop(offset,color);
  return fill;
}

export function paintedSurface(scene,x,y,width,height) {
  const biome=actorBiome(scene);
  const key='material-'+biome+'-'+width+'-'+height+'-'+((x+y)%5);
  if (!scene.textures.exists(key)) {
    const texture=scene.textures.createCanvas(key,width,height), ctx=texture.context;
    const [family,deep,base,face,lip,shine,accent]=materials[biome] ?? materials.verdant;
    const seed=randomFrom((width+height)*127+(x+y)%5*2389);
    ctx.fillStyle=vertical(ctx,0,height,[[0,face],[.28,base],[1,deep]]);
    ctx.fillRect(0,0,width,height);
    const rows=family==='metal'?8:family==='sand'?6:12;
    for (let row=3;row<height;row+=rows) {
      let x=-seed()*14;
      while(x<width){
        const span=(family==='metal'?28:15)+seed()*19;
        const top=row+seed()*1.8;
        const edge=span*(.06+seed()*.12);
        const first=x+edge, last=x+span-edge;
        const paint=vertical(ctx,top,rows,[[0,seed()>.4?face:base],[.58,base],[1,deep]]);
        shape(ctx,paint,[[x,top+2],[first,top],[last,top+.4],[x+span,top+3],[x+span-1,top+rows-2],[first,top+rows-1],[x,top+rows-3]]);
        ctx.strokeStyle=lip;
        ctx.globalAlpha=.38;
        ctx.lineWidth=.55;
        ctx.beginPath();
        ctx.moveTo(x+.5,top+2.3);
        ctx.lineTo(first+1,top+.35);
        ctx.lineTo(last-1,top+.9);
        ctx.stroke();
        ctx.globalAlpha=1;
        if (family==='metal') {
          ctx.fillStyle=deep;
          ctx.fillRect(x+3,top+3,span-8,1.2);
          ctx.fillStyle=shine;
          ctx.fillRect(last-1,top+2,1.1,1);
        } else {
          ctx.strokeStyle=family==='ice' ? lip : deep;
          ctx.globalAlpha=family==='slag'?.72:.42;
          ctx.beginPath();
          ctx.moveTo(last-3,top+1.3);
          ctx.lineTo(last-6,top+4);
          ctx.lineTo(last-4,top+5.7);
          ctx.lineTo(last-8,top+rows);
          ctx.stroke();
          ctx.globalAlpha=1;
        }
        x+=span+.8;
      }
    }
    for(let i=0;i<width*height/32;i++){
      const xx=seed()*width,yy=3+seed()*height;
      ctx.fillStyle=i%4?accent:shine;
      ctx.globalAlpha=.10+seed()*.23;
      ctx.fillRect(xx,yy,.65+seed()*2.6,.6+seed());
    }
    ctx.globalAlpha=1;
    ctx.fillStyle=lip;
    ctx.fillRect(0,0,width,1.6);
    ctx.fillStyle=accent;
    for(let x=1;x<width-1;x+=5+seed()*8){
      const hang=family==='moss'?2.5+seed()*5.5:1.3+seed()*1.4;
      shape(ctx,accent,[[x,1],[x+6,1],[x+5,hang],[x+3,hang-1.5],[x+1,3]]);
    }
    ctx.fillStyle=shine;
    ctx.globalAlpha=.76;
    for(let x=2;x<width-1;x+=6+seed()*16)ctx.fillRect(x,.25,3+seed()*6,.62);
    ctx.globalAlpha=1;
    ctx.fillStyle=deep;
    ctx.fillRect(0,Math.max(0,height-1),width,1);
    texture.refresh();
  }
  rememberVisualTexture(scene,key);
  return scene.add.image(x,y,key).setOrigin(0);
}

function propTexture(scene,biome,variant) {
  const key='biome-prop-'+biome+'-'+variant;
  if (scene.textures.exists(key)) return key;
  const canvas=scene.textures.createCanvas(key,86,92),ctx=canvas.context;
  const [family,deep,base,face,lip,shine,accent]=materials[biome] ?? materials.verdant;
  const next=randomFrom((variant+1)*716);
  if (family==='moss') {
    if(biome==='bamboo'){
      for(let i=0;i<9;i++){
        const x=5+i*8,h=24+next()*63,lean=(next()-.5)*18;
        shape(ctx,vertical(ctx,92-h,h,[[0,lip],[.65,face],[1,deep]]),
          [[x,92],[x+lean,92-h],[x+lean+2,92-h],[x+3,92]]);
        for(let y=96-h;y<90;y+=13)shape(ctx,accent,[[x+lean*.7,y],[x+lean*.7-11,y-8],[x+lean*.7-5,y],[x+lean*.7+8,y+2],[x+lean*.7+13,y-4]]);
      }
    } else treeTexture(ctx,43,92,76,513+variant,[deep,base,accent,lip]);
  } else if (family==='ice'||family==='sand'&&biome!=='sky'){
    for(let i=0;i<5;i++){
      const x=9+14*i,y=65-next()*31,w=4+next()*12;
      shape(ctx,vertical(ctx,y,92-y,[[0,lip],[.35,face],[1,deep]]),[[x-w,92],[x-w+4,y+9],[x+1,y],[x+w,y+13],[x+w,92]]);
      shape(ctx,accent,[[x+1,y],[x+w,y+13],[x+w,92],[x+3,92]]);
      shape(ctx,shine,[[x+1,y],[x-w+4,y+9],[x-w+2,y+15],[x+1,y+4]]);
    }
  } else {
    for (const [x,w,h] of [[16,19,42+variant*8],[34,24,60],[56,14,35+variant*6]]) {
      const y=92-h;
      shape(ctx,vertical(ctx,y,h,[[0,face],[.53,base],[1,deep]]),[[x-3,92],[x,y+3],[x+3,y],[x+w-2,y+2],[x+w,92]]);
      ctx.fillStyle=accent;
      ctx.fillRect(x+4,y+3,w-7,1.3);
      for(let j=y+12;j<91;j+=9){
        ctx.fillStyle=deep;ctx.fillRect(x+2,j,w-3,1.1);
        if(family==='metal'){ctx.fillStyle=lip;ctx.fillRect(x+5,j-4,3,1.3);}
      }
    }
  }
  canvas.refresh();
  return key;
}

export function addBiomeProps(scene) {
  const biome=actorBiome(scene);
  for(const [index,[x,scale]] of scene.level.trees.entries()){
    const prop=scene.add.image(x,GROUND_Y+1,propTexture(scene,biome,index%4)).setOrigin(.5,1)
      .setScale(scale*.86).setDepth(-3.5);
    lightProp(scene,prop,'fixed');
  }
}

export function paintCoin(ctx,x,y,size,half) {
  const radius=size*.42, center=size/2;
  ctx.save();
  ctx.translate(x+center,y+center);
  const gold=vertical(ctx,-radius,radius*2,[[0,'#fff5c3'],[.24,'#f9d77a'],[.61,'#eaa849'],[1,'#b77238']]);
  ctx.beginPath();
  ctx.ellipse(0,0,half+.85,radius+.7,0,0,Math.PI*2);
  ctx.fillStyle='#604052';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0,0,half,radius,0,0,Math.PI*2);
  ctx.fillStyle=gold;
  ctx.fill();
  ctx.strokeStyle='#fff1ad';
  ctx.lineWidth=.55;
  ctx.beginPath();
  ctx.ellipse(0,-.23,Math.max(.3,half-.6),radius-1,0,Math.PI*1.03,Math.PI*1.85);
  ctx.stroke();
  if (half>2.3) {
    shape(ctx,'#a36542',[[0,-radius*.62],[half*.54,0],[0,radius*.64],[-half*.54,0]]);
    shape(ctx,'#fff1b7',[[0,-radius*.45],[half*.34,0],[0,radius*.44],[-half*.24,-.3]]);
  }
  ctx.restore();
}
