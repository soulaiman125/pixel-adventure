import rects from './painted-parts.json' with { type: 'json' };
import { actorBiome, biomeLight } from './actor-art.js';

const parts = {
  ninja:['hood','lamellar','sleeve','boot','scarf','katana','flameHelm','frostHood','thunderHelm','rangerHood','bow','dagger'],
  classic:['slime','golemHead','knight','batHead','batWing','demon','mossHead','robot','leather','stone','shield','crossbow'],
  bosses:['emperor','queen','crown','titan','phantom','abyss','dragon','cyber','imperial','chitin','titanPlate','wyrmWing'],
  legends:['specter','lantern','coral','fish','harpy','featherWing','drone','cyberNinja','shadowKnight','void','robes','alloy'],
  variants:['bramble','iceSlime','fireSlime','assassin','boar','wisp','skyHelm','tide','spear','greatsword','chakram','staff'],
  ui:['health','throw','dash','charged','parry','cyclone','execution','coin','impactWarm','impactCool','death','halo'],
};

const address = new Map(Object.entries(parts).flatMap(([pack,list]) =>
  list.map((name,i)=>[name,[pack,rects[pack][i]]])));
const cached = new WeakMap();
const actKeys = Object.keys(parts);
const DESKTOP = { directory: '', scale: 1, density: 4, canvasBudget: 36 * 1024 * 1024 };
const MOBILE = { directory: 'mobile/', scale: .75, density: 3, canvasBudget: 20 * 1024 * 1024 };
const tiers = new WeakMap();

export function paintedSpriteTier(textures) {
  if (!tiers.has(textures)) {
    const handheld = location.protocol !== 'pixel:' && matchMedia('(pointer: coarse)').matches;
    tiers.set(textures, handheld ? MOBILE : DESKTOP);
  }
  return tiers.get(textures);
}

export function preloadPaintedSprites(scene) {
  const { directory } = paintedSpriteTier(scene.textures);
  for(const name of actKeys){
    const key='painted-parts-'+name;
    if(!scene.textures.exists(key))
      scene.load.image(key,import.meta.env.BASE_URL+'sprites/painted/'+directory+name+'.webp');
  }
}

function tintedPart(textures,name,fill,light) {
  let cache=cached.get(textures);
  if(!cache){cache=new Map();cached.set(textures,cache);}
  const key=name+'|'+(fill??'')+'|'+light.join(',');
  if(cache.has(key))return cache.get(key);
  const [pack,[x,y,w,h]]=address.get(name);
  const source=textures.get('painted-parts-'+pack).getSourceImage();
  const { scale } = paintedSpriteTier(textures);
  const left = Math.round(x*scale), top = Math.round(y*scale);
  const image=document.createElement('canvas');
  image.width=Math.round((x+w)*scale)-left;
  image.height=Math.round((y+h)*scale)-top;
  const ctx=image.getContext('2d');
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(source,left,top,image.width,image.height,0,0,image.width,image.height);
  if(fill){
    ctx.globalCompositeOperation='source-atop';
    ctx.globalAlpha=.25;
    ctx.fillStyle=fill;
    ctx.fillRect(0,0,image.width,image.height);
  }
  if(light!==biomeLight.verdant){
    ctx.globalCompositeOperation='source-atop';
    ctx.globalAlpha=.065;
    ctx.fillStyle='rgb('+light.join(',')+')';
    ctx.fillRect(0,0,image.width,image.height);
  }
  while(cache.size>=192)cache.delete(cache.keys().next().value);
  cache.set(key,image);
  return image;
}

export function paintedPart(textures,name) {
  return tintedPart(textures,name,null,biomeLight.verdant);
}

export function paintedEffect(scene,part,depth) {
  const key='painted-fx-'+part;
  if(!scene.textures.exists(key))scene.textures.addImage(key,paintedPart(scene.textures,part));
  return scene.add.image(0,0,key).setDepth(depth).setVisible(false);
}

export function paintRig(scene,ctx,ox,oy) {
  const light=biomeLight[actorBiome(scene)]??biomeLight.verdant;
  function layer(part,x,y,w,h,{angle=0,flip=false,tint,alpha=1,crop=null}={}){
    const image=tintedPart(scene.textures,part,tint,light);
    const [top,bottom]=crop??[0,1];
    const sy=Math.floor(image.height*top), sh=Math.max(1,Math.floor(image.height*bottom)-sy);
    ctx.save();
    ctx.translate(ox+x,oy+y);
    if(angle)ctx.rotate(angle);
    if(flip)ctx.scale(-1,1);
    if(alpha!==1)ctx.globalAlpha*=alpha;
    ctx.drawImage(image,0,sy,image.width,sh,-w/2,-h/2,w,h);
    ctx.restore();
  }
  function bone(part,a,b,w,options={}){
    const dx=b[0]-a[0],dy=b[1]-a[1];
    layer(part,(a[0]+b[0])/2,(a[1]+b[1])/2,w,Math.hypot(dx,dy)+2,
      {...options,angle:Math.atan2(dy,dx)-Math.PI/2});
  }
  function weapon(part,a,b,h,options={}){
    const dx=b[0]-a[0],dy=b[1]-a[1],span=Math.max(5,Math.hypot(dx,dy));
    const angle=Math.atan2(dy,dx), anchor=options.anchor??.13;
    layer(part,a[0]+dx*(.5-anchor),a[1]+dy*(.5-anchor),span,h,{...options,angle});
  }
  return {layer,bone,weapon};
}
