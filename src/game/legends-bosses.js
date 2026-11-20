import { atlas, clipFrame, pixelPen } from './prototype-sprites.js';

const phase = (pattern, warning, attack, open, plan, shot) => ({ pattern,warning,attack,open,plan,shot });
const field = (kind, x, y, width, height, extra={}) =>
  ({kind,x,y,width,height,warning:0,active:660,period:4000,offset:0,...extra});
const fall = (x,width=26,delay=0) => field('crusher',x,109,width,24,{dy:67,warning:delay});
const rings = (x,width,y=175) => field('electricPulse',x,y,width,13);
const ray = (x,kind='laser') => field(kind,x,150,kind==='laserGrid'?28:9,65,{spacing:9});

export const LEGEND_BOSSES = {
  phantom:{
    colors:['#25273e','#697b93','#94d5c5','#e0fff4'],
    phases:[phase('phantomFeint',1000,1180,2280,x=>[fall(x-14,20),fall(x+14,20,275)]),
      phase('ghostEdge',1010,1250,2110,()=>[],[119,165,'#9dfae0']),
      phase('lanternSeal',1100,1390,1890,x=>[rings(x-26,23),rings(x+26,23),fall(x,25,380)])],
  },
  abyss:{
    colors:['#192d47','#36738c','#69c2ba','#c1ffe6'],
    phases:[phase('tidalCrush',1060,1290,2340,x=>[rings(x,47),fall(x,23,320)]),
      phase('undertow',1020,1350,2070,()=>[],[105,145,'#82e5ef']),
      phase('pressureSeal',1050,1390,1850,x=>[-26,0,26].map((n,i)=>field('poisonCloud',x+n,167,18,30,{warning:i*180})))],
  },
  dragon:{
    colors:['#434268','#817ab2','#ffbc80','#fff1b4'],
    phases:[phase('dragonBolt',1030,1260,2310,x=>[field('lightning',x-17,142,10,75),field('lightning',x+17,142,10,75,{warning:250})]),
      phase('stormBreath',1010,1340,2140,()=>[],[130,168,'#ffd89b']),
      phase('eyeStrike',1120,1400,1900,x=>[fall(x,43),rings(x+12,62,177)])],
  },
  cyber:{
    colors:['#282341','#734899','#e16fcb','#76fff0'],
    phases:[phase('gridLock',1070,1250,2280,x=>[ray(x,'laserGrid'),ray(x+33)]),
      phase('bladeRelay',970,1320,2050,()=>[],[133,166,'#fa83ec']),
      phase('shieldOverload',1060,1400,1840,x=>[rings(x,64),ray(x-18),fall(x+22,15,310)])],
  },
  emperor:{
    colors:['#32192d','#8d2f4a','#f07973','#ffe6bb'],
    phases:[phase('swordMastery',1050,1370,2340,()=>[],[124,161,'#ffa99b']),
      phase('shadowDominion',1080,1420,2090,x=>[fall(x-19,20),ray(x+20),field('poisonCloud',x,171,26,22,{warning:350})]),
      phase('eclipseAscension',1120,1450,1850,x=>[fall(x,44),rings(x,83),field('lightning',x+23,144,11,71,{warning:470})])],
  },
};

export const LEGEND_TELEGRAPHS = {
  phantomFeint:'Feint · Leave the lantern marks',ghostEdge:'Ghost edge · Jump or parry',lanternSeal:'Lantern seal · Move clear',
  tidalCrush:'Tidal crush · Leave the marked floor',undertow:'Undertow · Jump or parry',pressureSeal:'Pressure seal · Leave the rising plume',
  dragonBolt:'Lightning dive · Leave the markers',stormBreath:'Storm breath · Jump or parry',eyeStrike:'Eye strike · Leave both marks',
  gridLock:'Grid lock · Leave the marked lanes',bladeRelay:'Blade relay · Jump or parry',shieldOverload:'Shield overload · Leave the field',
  swordMastery:'Sword Mastery · Jump or parry',shadowDominion:'Shadow Dominion · Clear the marked ground',
  eclipseAscension:'Eclipse Ascension · Run outside the seal',
};

const poses = {
  waiting:[[0,0,0],[0,1,1],[0,2,2]],
  warn:[[0,0,1],[-3,4,2],[-5,7,3],[-2,3,5]],
  attack:[[1,6,5],[6,1,8],[9,-3,10],[4,0,5]],
  open:[[5,5,3],[2,6,2],[1,7,1]],
  defeated:[[6,5,4],[8,10,3],[12,16,2],[18,22,1]],
};

export function addLegendBoss(scene,boss) {
  const key = 'legends-boss-'+boss.kind;
  const colors=LEGEND_BOSSES[boss.kind].colors;
  const clips=Object.fromEntries(Object.entries(poses).map(([name,frames])=>[name,frames.length]));
  atlas(scene,key,96,73,clips,(ctx,ox,oy,clip,frame)=>{
    const r=pixelPen(ctx,ox,oy);
    const [ink,shade,metal,light]=colors,[tilt,sink,reach]=poses[clip][frame];
    const x=45+tilt,y=25+sink;
    if (boss.kind==='dragon') {
      r.shape(ink,[x-10,y+16],[5,y-11+reach],[11,y+15],[1,y+23],[x-8,y+29],[x+23,y+27],[90,y+13],[81,y+8],[87,y-8],[x+18,y+8]);
      r.shape(shade,[x-12,y+17],[9,y-7+reach],[14,y+17],[6,y+22],[x+7,y+25],[80,y+14],[84,y-4],[x+16,y+12]);
    } else {
      r.shape(ink,[x-20,y+10],[x+18,y+6],[x+25,y+45],[x-24,y+45]);
      r.shape(shade,[x-17,y+13],[x+15,y+11],[x+18,y+42],[x-20,y+42]);
      r.rect(metal,x-17,y+21,32,3);
    }
    r.shape(ink,[x-17,y+9],[x-14,y-10],[x+10,y-13],[x+20,y-4],[x+16,y+16],[x-10,y+20]);
    r.shape(shade,[x-12,y+9],[x-10,y-8],[x+9,y-10],[x+16,y-3],[x+11,y+13],[x-8,y+15]);
    r.rect(metal,x-11,y-2,25,7);
    r.rect(light,x+1,y,10,2);
    if (boss.kind==='abyss') {
      r.shape(ink,[x-32,y+5],[x-14,y+2],[x-11,y+28],[x-31,y+35],[x-37,y+24]);
      r.shape(metal,[x-30,y+9],[x-16,y+6],[x-15,y+24],[x-30,y+30],[x-34,y+22]);
    } else {
      for (const offset of [-11,11]) r.shape(metal,[x+offset-4,y-7],[x+offset-2,y-17],[x+offset+3,y-7]);
      r.shape(light,[x+10,y+17],[x+21,y+12],[Math.min(95,x+35+reach),y+9-reach],[x+30,y+19],[x+15,y+22]);
    }
    if (boss.kind==='cyber') for (let i=0;i<3;i++) r.rect(light,x-15+i*6,y+26,3,2);
    if (boss.kind==='emperor') r.shape(light,[x-12,y-12],[x-4,y-18],[x,y-14],[x+7,y-20],[x+13,y-12],[x+6,y-9]);
  });
  const sprite=scene.add.image(boss.x,185,key,'waiting0').setOrigin(.5,1).setDepth(3);
  return { update(){
    const elapsed=scene.elapsed;
    const clip=boss.phase;
    const age=clip==='waiting'?elapsed%750:clip==='defeated'&&boss.finishAge!==undefined?boss.finishAge:
      Math.max(0,elapsed-(boss.since ?? elapsed));
    const duration=clip==='warn'?boss.profile.warning:clip==='attack'?680:clip==='defeated'?410:750;
    sprite.setFrame(clipFrame(clips,clip,age,duration))
      .setAlpha(clip==='defeated'?.5:1).setFlipX(scene.player.x < boss.x);
    if (boss.flashUntil>elapsed && !scene.ui.reduceMotion) sprite.setAlpha(.60);
  }};
}
