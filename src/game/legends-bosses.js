import { clipFrame } from './prototype-sprites.js';
import { lightProp } from './rendering/light-rig.js';
import { expandedClips, paintedAtlas } from './rendering/painted-atlas.js';
import { paintBoss } from './rendering/painted-boss.js';

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

const clips=expandedClips({waiting:3,warn:4,attack:4,open:3,hurt:3,defeated:4},new Set(['waiting']));

export function addLegendBoss(scene,boss) {
  const key='legends-boss-'+boss.kind;
  paintedAtlas(scene,key,96,73,clips,(ctx,x,y,clip,frame,count)=>
    paintBoss(scene,ctx,x,y,96,73,boss.kind,clip,frame,count));
  const sprite=scene.add.image(boss.x,185,key,'waiting0').setOrigin(.5,1).setDepth(3);
  lightProp(scene,sprite);
  return { update(){
    const elapsed=scene.elapsed;
    const hurt=boss.phase!=='defeated' && boss.flashUntil>elapsed;
    const clip=hurt?'hurt':boss.phase;
    const age=clip==='waiting'?elapsed%750:clip==='defeated'&&boss.finishAge!==undefined?boss.finishAge:
      hurt?145-(boss.flashUntil-elapsed):Math.max(0,elapsed-(boss.since??elapsed));
    const duration=hurt?145:clip==='warn'?boss.profile.warning:clip==='attack'?680:clip==='defeated'?410:750;
    sprite.setFrame(clipFrame(clips,clip,age,duration))
      .setAlpha(clip==='defeated'?.5:1).setFlipX(scene.player.x < boss.x);
    if (boss.flashUntil>elapsed && !scene.ui.reduceMotion) sprite.setAlpha(.60);
  }};
}
