import { paintRig } from './painted-parts.js';

export const paintedBosses={
  crown:['crown','imperial','katana','#887cad'],
  queen:['queen','chitin','dagger','#62914b'],
  titan:['titan','titanPlate','staff','#437c9b'],
  phantom:['phantom','robes','katana','#75a69d'],
  abyss:['abyss','titanPlate','shield','#5b9886'],
  dragon:['dragon','chitin','wyrmWing','#a68bc8'],
  cyber:['cyber','alloy','spear','#9565bc'],
  emperor:['emperor','imperial','greatsword','#9c4258'],
};
const cycles=new Set(['idle','waiting','open']);
const windClips=new Set(['wind','warn']);
const attackClips=new Set(['strike','attack','wave','bolts','impact']);

export function paintBoss(scene,ctx,ox,oy,w,h,id,clip,frame,count) {
  const [head,body,gear,tint]=paintedBosses[id];
  const {layer,bone,weapon}=paintRig(scene,ctx,ox,oy);
  const t=frame/Math.max(1,count-1),cycle=cycles.has(clip);
  const hit=clip==='hurt',death=clip==='death'||clip==='defeat'||clip==='defeated';
  const warning=windClips.has(clip),attack=attackClips.has(clip),heavy=id==='titan'||id==='abyss';
  const swing=attack?Math.sin(Math.PI*t):0, throwback=warning?Math.sin(Math.PI*t)*.10:0;
  const stagger=hit?Math.sin(Math.PI*t)*.11:0;
  const settle=clip==='open'?.06:0;
  const pulse=cycle?Math.sin(Math.PI*2*t)*.025:0;
  const x=w*(.47+swing*.065-throwback-stagger+Number(death)*t*.18);
  const y=h*(.42+pulse+settle+Number(death)*t*.45);
  const turn=death?t*.96:swing*.22-stagger*1.45-throwback*.90;

  if(id==='dragon'){
    layer('wyrmWing',x-w*.03,y-h*.04,w*.51,h*.68,{angle:-.4+turn+swing*.36,flip:true,tint,alpha:.78});
    layer('chitin',x-w*.13,y+h*.17,w*.54,h*.36,{angle:1.47+turn,tint});
    layer('wyrmWing',x-w*.19,y-h*.02,w*.51,h*.70,{angle:-.14-turn-swing*.45,tint});
    layer(head,x+w*.22,y-h*.02,w*.51,h*.64,{angle:turn});
    return;
  }

  const hip=[x-w*.065,y+h*.24],leftFoot=[x-w*.16,h*.942],rightFoot=[x+w*.15+swing*w*.07,h*.943];
  const shoulder=[x+w*.06,y-h*.01];
  if(id==='phantom'||id==='emperor')
    layer(id==='emperor'?'scarf':'robes',x-w*.17,y+h*.18,w*.43,h*.62,{angle:.28+turn,tint,alpha:.83});
  if(id==='queen'){
    layer('wyrmWing',x-w*.15,y+h*.10,w*.50,h*.63,{angle:-.34-turn-swing*.25,tint,alpha:.86});
    layer('wyrmWing',x+w*.13,y+h*.14,w*.42,h*.62,{angle:.11+turn,flip:true,tint,alpha:.64});
  } else {
    bone('boot',[hip[0]-w*.07,hip[1]],leftFoot,w*(heavy?.22:.16),{tint,alpha:.87});
    bone('boot',[hip[0]+w*.07,hip[1]],rightFoot,w*(heavy?.21:.17),{tint});
  }
  const bodyW=w*(heavy?.59:id==='queen'?.47:.54);
  const bodyH=h*(id==='queen'?.57:heavy?.54:.48);
  layer(body, (hip[0]+shoulder[0])*.5,y+h*.23,bodyW,bodyH,{angle:turn*.72,tint});
  const skullW=w*(id==='queen'?.40:heavy?.35:.36),skullH=h*(heavy?.40:.46);
  layer(head,x+w*.064,y-h*.14,skullW,skullH,{angle:turn});
  const guard=[x+w*(.22+swing*.09),y+h*(.21+throwback-swing*.12)];
  bone('sleeve',[shoulder[0]+w*.14,shoulder[1]+h*.12],guard,w*(heavy?.17:.14),{tint});
  if(gear==='shield')layer(gear,guard[0]+w*.013,guard[1]+h*.025,w*.32,h*.49,{angle:.11+turn,tint});
  else {
    const length=w*(id==='emperor'?.42:id==='cyber'?.35:.29);
    const point=[guard[0]+length*(swing>.5?.68:-.61),guard[1]-h*(.20+swing*.28)];
    weapon(gear,guard,point,h*(id==='emperor'?.19:.135),{anchor:.17});
  }
}
