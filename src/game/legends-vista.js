import { createArt, createThemeArt } from './art.js';
import { REALMS } from './legends-worlds.js';
import { VIEW_HEIGHT } from './level-one.js';
import { paintRealmLandmarks } from './rendering/realm-landmarks.js';

export function legendTexture(textures, realm) {
  const key='legends-vista-'+realm.id;
  if(!textures.exists(key)){
    const canvas=textures.createCanvas(key,512,VIEW_HEIGHT),ctx=canvas.context;
    const [dark,mid]=realm.colors;
    const gradient=ctx.createLinearGradient(0,0,0,VIEW_HEIGHT);
    gradient.addColorStop(0,dark);
    gradient.addColorStop(.64,mid);
    gradient.addColorStop(1,dark);
    const plate='campaign-world-'+realm.theme;
    if(textures.exists(plate)){
      const source=textures.get(plate).getSourceImage();
      const inset=realm.id==='eclipse'?source.width*.19:0;
      ctx.drawImage(source,inset,0,source.width-inset,source.height,0,0,512,VIEW_HEIGHT);
      ctx.globalAlpha=.49;
    }
    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,512,VIEW_HEIGHT);
    ctx.globalAlpha=1;
    paintRealmLandmarks(ctx,realm);
    canvas.refresh();
  }
  return textures.get(key);
}

export function createLegendVista(scene) {
  const realm=REALMS.find(item=>item.id===scene.level.realm);
  if(!realm)return null;
  if(!scene.textures.exists('hero-idle'))createArt(scene);
  createThemeArt(scene,realm.theme);
  const {key}=legendTexture(scene.textures,realm);
  const view=scene.add.tileSprite(0,0,scene.scale.width,VIEW_HEIGHT,key).setOrigin(0).setScrollFactor(0).setDepth(-12);
  return {
    resize(){view.setSize(scene.scale.width,VIEW_HEIGHT);},
    scroll(position){
      const x=Math.floor(position*.28);
      if(view.tilePositionX!==x)view.tilePositionX=x;
    },
  };
}
