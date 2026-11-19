import { createArt, createThemeArt } from './art.js';
import { REALMS } from './legends-worlds.js';
import { VIEW_HEIGHT } from './level-one.js';

export function legendTexture(textures, realm) {
  const key = 'legends-vista-' + realm.id;
  if (!textures.exists(key)) {
    const canvas = textures.createCanvas(key, 512, VIEW_HEIGHT), ctx = canvas.context;
    const [dark,mid,bright,light]=realm.colors;
    const gradient=ctx.createLinearGradient(0,0,0,VIEW_HEIGHT);
    gradient.addColorStop(0,dark);gradient.addColorStop(.64,mid);gradient.addColorStop(1,dark);
    ctx.fillStyle=gradient;ctx.fillRect(0,0,512,VIEW_HEIGHT);
    const box=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
    for(let i=0;i<42;i++)box(i%8?bright:light,(i*61)%512,12+(i*47)%133,1+i%3,1+i%3);
    if(realm.id==='bamboo'){
      for(let i=0;i<22;i++){
        const x=i*25,y=11+i*31%68,w=3+i%5;
        box(dark,x,y,w,VIEW_HEIGHT-y);
        for(let j=y+12;j<VIEW_HEIGHT;j+=32){
          box(bright,x-2,j,w+4,2);box(mid,x+w,j+7,15+i%6,2);
          if(i%5===0){box(mid,x+8,j+11,8,12);box(light,x+10,j+13,4,7);}
        }
      }
    }else if(realm.id==='sunken'){
      for(let i=0;i<8;i++){
        const x=18+i*64,y=84+i*27%45;
        box(dark,x,y+8,18,120);box(bright,x+2,y+11,3,110);box(dark,x-6,y,31,9);
        for(let j=0;j<5;j++) box(mid,x-12+j*3,180+j*3,38-j*4,9);
      }
      for(let i=0;i<33;i++)box(light,(i*105)%512,98+i*15%86,2,1);
    }else if(realm.id==='sky'){
      for(let i=0;i<9;i++){
        const x=i*61,y=71+i*27%72;
        box(light,x,y,43,5);box(bright,x+8,y+5,31,5);box(mid,x+11,y+10,24,14);
        box(dark,x+15,y+23,16,11);box(dark,x+19,y+33,7,12);
      }
      for(let i=0;i<12;i++)box(light,(i*59)%512,30+i*13%53,27,1);
    }else if(realm.id==='neon'){
      for(let i=0;i<13;i++){
        const x=i*42,y=61+i*23%83;
        box(dark,x,y,32,160);box(bright,x,y+7,2,170);
        for(let j=y+14;j<210;j+=13)for(let k=3;k<25;k+=8)box((i+j)%3?mid:light,x+k,j,4,3);
      }
    }else{
      for(let row=-23;row<=23;row++){
        const half=Math.floor(Math.sqrt(23**2-row**2));
        box(light,256-half,66+row,half*2+1,1);
        if(Math.abs(row)<19)box(dark,257-half,66+row,half*2-3,1);
      }
      for(let i=0;i<14;i++)for(let j=0;j<6;j++)box(j%3?dark:bright,i*39+j*4,133+i*29%44-j*4,24,5);
    }
    canvas.refresh();
  }
  return textures.get(key);
}

export function createLegendVista(scene) {
  const realm = REALMS.find(item => item.id === scene.level.realm);
  if (!realm) return null;
  if (!scene.textures.exists('hero-idle')) createArt(scene);
  createThemeArt(scene, realm.theme);
  const { key } = legendTexture(scene.textures, realm);
  const view=scene.add.tileSprite(0,0,scene.scale.width,VIEW_HEIGHT,key).setOrigin(0).setScrollFactor(0).setDepth(-12);
  return {resize(){view.setSize(scene.scale.width,VIEW_HEIGHT);},scroll(position){
    const x=Math.floor(position*.28);
    if(view.tilePositionX!==x)view.tilePositionX=x;
  }};
}
