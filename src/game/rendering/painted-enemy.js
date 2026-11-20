import { paintRig } from './painted-parts.js';

// Head, body, gear, motion family, base garment tint.
export const paintedEnemies = {
  slime:['slime',null,null,'gel'],
  brambleback:['bramble',null,null,'beetle','#5e7b45'],
  ice:['iceSlime',null,null,'gel'],
  fire:['fireSlime',null,null,'gel'],
  flying:['batHead','leather','batWing','wing','#5d526b'],
  bat:['batHead','leather','batWing','wing','#447351'],
  demon:['demon','stone','batWing','wing','#a64a43'],
  golem:['golemHead','stone','shield','heavy','#aa8c62'],
  shooter:['assassin','leather','crossbow','ground','#7e5742'],
  assassin:['assassin','lamellar','dagger','ground','#594a78'],
  knight:['knight','leather','shield','heavy','#687e95'],
  stalker:['mossHead','robes','dagger','ground','#477553'],
  charger:['boar','leather','katana','heavy','#a77e5a'],
  poison:['mossHead','chitin','crossbow','ground','#557f3c'],
  guard:['knight','lamellar','shield','heavy','#6c8765'],
  sentinel:['robot','titanPlate','spear','heavy','#5d7192'],
  robot:['robot','alloy','crossbow','heavy','#626b7f'],
  shadowRival:['assassin','lamellar','katana','ground','#594064'],
  ironGuardian:['knight','stone','shield','heavy','#be9b67'],
  nightHunter:['batHead','robes','batWing','wing','#61537e'],
  spectral:['specter','robes','katana','ground','#4d9389'],
  lantern:['lantern',null,null,'float','#ab763e'],
  phantomArcher:['specter','leather','bow','ground','#3f6c80'],
  coral:['coral','stone','shield','heavy','#51938f'],
  abyssStalker:['fish','chitin','dagger','ground','#5166a4'],
  tideCaster:['tide','robes','staff','ground','#358499'],
  harpy:['harpy','leather','featherWing','wing','#a58764'],
  skySentinel:['skyHelm','titanPlate','shield','heavy','#7994be'],
  stormWisp:['wisp',null,null,'float','#7caad6'],
  securityDrone:['drone',null,null,'float','#73408a'],
  cyberNinja:['cyberNinja','alloy','katana','ground','#964eaa'],
  shieldRobot:['robot','alloy','shield','heavy','#6654a8'],
  shadowKnight:['shadowKnight','imperial','shield','heavy','#7c467c'],
  voidHunter:['void','robes','dagger','ground','#ac4f84'],
  eclipseWraith:['specter','robes','featherWing','wing','#9d5575'],
};
const TAU=Math.PI*2;
const deadClips=new Set(['death','fall','defeat']);
const attackClips=new Set(['strike','lunge']);
const prepareClips=new Set(['prepare','windup','wind']);

export function paintEnemy(scene,ctx,ox,oy,w,h,id,clip,frame,count) {
  const [head,body,gear,family,tint]=paintedEnemies[id];
  const {layer,bone,weapon}=paintRig(scene,ctx,ox,oy);
  const t=frame/Math.max(1,count-1), beat=t*TAU;
  const death=deadClips.has(clip), strike=attackClips.has(clip), prepare=prepareClips.has(clip);
  const hit=clip==='hurt'||clip==='hit'||clip==='evade';
  const busy=clip==='patrol'||clip==='run', airborne=clip==='air';
  const attack=strike?Math.sin(Math.PI*t):0;
  const lift=airborne?Math.sin(Math.PI*t)*h*.14:0;
  const recoil=hit?-Math.sin(Math.PI*t)*w*.12:0;
  const shrink=death?Math.max(.25,1-t*.76):1;
  const x=w*.5+attack*w*.09+recoil, floor=h-2-lift;
  const sit=prepare?h*.055*t:0;
  const bob=busy?Math.abs(Math.sin(beat))*h*.046:Math.sin(beat)*h*.024;
  const roll=death?t*.84:recoil*.08;

  if(family==='beetle'){
    const crawl=busy?Math.sin(beat):0;
    const back=floor-h*.27*shrink+bob+sit;
    for(let i=0;i<3;i++){
      const stride=busy?Math.sin(beat+i*2.1):0;
      const sx=x+(i-1)*w*.19;
      bone('boot',[sx,back],[sx+stride*w*.09,floor-Math.max(0,stride)*h*.08],w*.13,
        {tint,crop:[.52,1],alpha:i===0?.77:.95});
    }
    layer(head,x,floor-h*.38*shrink+bob+sit,w*(.83+attack*.13),h*.72*shrink,
      {angle:roll+crawl*.033,tint,crop:[0,.91]});
    return;
  }
  if(family==='gel'||family==='float'){
    const floating=family==='float';
    const stretch=floating?0:Math.sin(beat)*.065+(airborne?lift/h:0);
    const breadth=w*(floating?.66:.84)*(1+attack*.16-stretch);
    const span=h*(floating?.73:.62)*shrink*(1+attack*.12+stretch);
    const cy=floor-span*.5+(floating?-h*.06:0)+bob+sit;
    layer(head,x,cy,breadth,span,{angle:roll+attack*.12,tint});
    return;
  }
  if(family==='wing'){
    const sweep=Math.sin(beat)*.58+(strike?attack*.42:0);
    const y=floor-h*.38+sit+(death?h*.18*t:0)-bob;
    layer(gear,x+w*.13,y+h*.015,w*.56,h*.74*shrink,{angle:.24+sweep,flip:true,tint,alpha:.73});
    layer(body,x-w*.02,y+h*.13,w*.32,h*.53*shrink,{angle:roll,tint});
    layer(gear,x-w*.23,y+h*.03,w*.53,h*.81*shrink,{angle:-.22-sweep,tint});
    layer(head,x+w*.11,y-h*.07,w*.40,h*.48*shrink,{angle:roll*.85+attack*.17,tint});
    return;
  }
  const heavy=family==='heavy';
  const hip=[x-w*.03,floor-h*.29*shrink+sit*.6];
  const shoulder=[x+w*.032+attack*w*.065,floor-h*.62*shrink+sit+bob];
  const foot=busy?Math.sin(beat)*w*.12:attack*w*.12;
  for(const side of [-1,1]){
    const toe=[x+side*(w*.12+foot),floor-(busy?Math.max(0,side*Math.sin(beat))*h*.12:0)];
    bone('boot',[hip[0]+w*.1*side,hip[1]-1],toe,w*(heavy?.27:.22),
      {alpha:side<0?.75:1,tint});
  }
  bone(body,shoulder,hip,w*(heavy?.61:.49),{tint});
  const elbow=[x+w*.23+attack*w*.1,shoulder[1]+h*.16];
  bone('sleeve',[shoulder[0]+w*.13,shoulder[1]+h*.03],elbow,w*(heavy?.24:.18),{tint});
  layer(head,shoulder[0]+w*.036,shoulder[1]-h*.12*shrink,w*(heavy?.44:.40),h*.41*shrink,{angle:roll+attack*.19,tint});
  if(gear==='shield'||gear==='bow'||gear==='crossbow'){
    const shield=gear==='shield';
    const y=elbow[1]+h*(shield?.02:-.03);
    layer(gear,elbow[0]+w*(shield?.04:.05),y,w*(shield?.38:gear==='bow'?.28:.48),
      h*(shield?.5:gear==='bow'?.61:.36)*shrink,{angle:shield?-.15+attack*.2:-attack*.24,tint:shield?tint:null});
  } else if(gear)weapon(gear,elbow,[elbow[0]+w*(.28+attack*.09),elbow[1]-h*(.35-attack*.38)],h*.16);
}
