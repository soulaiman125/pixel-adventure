import { paintRig } from './painted-parts.js';

const equipment={
  shadow:['hood','katana','katana'], flame:['flameHelm','katana','greatsword'],
  frost:['frostHood','dagger','chakram'], thunder:['thunderHelm','spear','staff'],
  ranger:['rangerHood','bow','crossbow'],
};
const outfitTones={
  ember:'#914943', frost:'#4f78a0', storm:'#654686', jade:'#347257', plum:'#8b4c83',
  dawn:'#a46b40', silver:'#b4bace', scout:null,
};
const coatTones={shadow:null,flame:'#b3502b',frost:'#6d9eb7',thunder:'#51429b',ranger:'#30624c'};

export function drawPaintedHero(scene,ctx,ox,oy,pose,clip,frame,hero,costume) {
  const {layer,bone,weapon}=paintRig(scene,ctx,ox+24,oy+5);
  const {head:[x,y],chest:[cx,cy],hips:[hx,hy],rear,hand,backLeg,leadLeg,blade}=pose;
  const id=hero?.id??'shadow';
  const [hood,standard,alternate]=equipment[id];
  const armament=hero?.alternate?alternate:standard;
  const coat=outfitTones[costume]??coatTones[id];
  const scarf=(costume==='scout'?coatTones[id]:outfitTones[costume])??undefined;
  const fall=clip==='death'||clip==='knockback';
  const lean=(cx-hx)*.028;
  const gust=clip==='run'||clip==='sprintLoop'||clip.startsWith('dash')?45:31;
  const flutter=Math.sin(frame*.63)*3+Math.sin(frame*.22)*2;
  const scarfX=cx-gust*.46, scarfY=cy+1+flutter+(fall?7:0);
  layer('scarf',scarfX,scarfY,gust,12+Math.abs(flutter)*.35,{angle:-flutter/21,tint:scarf});
  if(!blade?.length && !fall && id!=='ranger')weapon(armament,[cx-7,cy+4],[hx-13,hy+13],8,{alpha:.68});

  function leg(track,far) {
    const [kx,ky,ax,ay]=track;
    const hip=[hx+(far?-4:4),hy-2];
    const knee=[kx,ky],ankle=[ax+1,ay+3.5];
    const light=far?.76:1;
    bone('boot',hip,knee,far?10:11.5,{crop:[0,.54],alpha:light,tint:coat});
    bone('boot',[kx,ky-.9],ankle,far?10:11.5,{crop:[.46,1],alpha:light,tint:coat});
  }
  function arm(palm,far) {
    const shoulder=[cx+(far?-7:7),cy+2];
    const elbow=[(shoulder[0]+palm[0])*.5-(far?3:1.4),(shoulder[1]+palm[1])*.5+2];
    const light=far?.74:1;
    bone('sleeve',shoulder,elbow,far?9:11,{crop:[0,.55],tint:coat,alpha:light});
    bone('sleeve',[elbow[0],elbow[1]-1.2],palm,far?7.5:8.5,{crop:[.43,1],tint:coat,alpha:light});
  }

  arm(rear,true);
  leg(backLeg,true);
  leg(leadLeg,false);
  layer('lamellar',(cx+hx)*.5,(cy+hy)*.5+1,id==='flame'?32:id==='ranger'?25:29,Math.hypot(cx-hx,cy-hy)+9,
    {angle:lean,tint:coat});
  layer('sleeve',cx-8,cy+6,11,11,{angle:lean-.21,crop:[0,.32],tint:coat});
  layer(hood,x-1,y-1,id==='flame'?30:25,id==='ranger'?25:26,
    {angle:fall?lean*.45:lean*.24,tint:scarf});
  arm(hand,false);
  if(blade?.length){
    if(armament==='bow'||armament==='chakram'){
      layer(armament,hand[0]+4,hand[1]-1,armament==='bow'?13:21,armament==='bow'?32:21,
        {angle:Math.atan2(blade[1]-hand[1],blade[0]-hand[0])*.42});
      if(armament==='chakram')layer(armament,rear[0]-4,rear[1]-1,16,16,{angle:frame*.19,alpha:.87});
    } else {
      const scale=id==='frost'?.70:1;
      const end=[hand[0]+(blade[0]-hand[0])*scale,hand[1]+(blade[1]-hand[1])*scale];
      weapon(armament,hand,end,id==='flame'?11:id==='thunder'?8:7.5);
      if(armament==='crossbow')layer(armament,rear[0]-4,rear[1]-1,20,11,{angle:-.22,alpha:.87});
      if((id==='shadow'&&hero?.alternate)||(id==='frost'&&!hero?.alternate))
        weapon(armament,rear,[rear[0]-16-frame%5,rear[1]-8+Math.sin(frame*.6)*5],6);
    }
  } else if(id==='ranger' && (clip==='idle'||clip==='throw')){
    layer(armament,hand[0]+6,hand[1]-2,armament==='bow'?13:24,armament==='bow'?30:13,
      {angle:clip==='throw'?-.18:.22});
  }
}
